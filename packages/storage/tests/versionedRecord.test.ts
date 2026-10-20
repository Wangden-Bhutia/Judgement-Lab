import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../src/kvStorage';
import { loadVersioned, saveVersioned, type VersionedSchema } from '../src/versionedRecord';

interface Doc {
  count: number;
}

function isDoc(value: unknown): value is Doc {
  return typeof value === 'object' && value !== null && typeof (value as Doc).count === 'number';
}

function schema(overrides: Partial<VersionedSchema<Doc>> = {}): VersionedSchema<Doc> {
  return {
    currentVersion: 1,
    migrations: { 0: (v) => v },
    empty: () => ({ count: 0 }),
    validate: isDoc,
    ...overrides,
  };
}

describe('loadVersioned', () => {
  it('returns the default with no issue when the key was never set', async () => {
    const storage = new MemoryStorage();
    const result = await loadVersioned(storage, 'doc', schema());
    expect(result).toEqual({ data: { count: 0 }, issue: null });
  });

  it('round-trips a value written by saveVersioned', async () => {
    const storage = new MemoryStorage();
    await saveVersioned(storage, 'doc', schema(), { count: 7 });
    const result = await loadVersioned(storage, 'doc', schema());
    expect(result).toEqual({ data: { count: 7 }, issue: null });
  });

  it('treats a bare, un-enveloped value (written before this record was versioned) as version 0 and migrates it up', async () => {
    const storage = new MemoryStorage();
    await storage.set('doc', { count: 3 }); // no envelope -- the pre-versioning shape
    const result = await loadVersioned(storage, 'doc', schema());
    expect(result).toEqual({ data: { count: 3 }, issue: null });

    // The migrated shape is persisted back as a proper envelope, so a
    // second load doesn't redo the migration.
    const raw = await storage.get<{ schemaVersion: number }>('doc');
    expect(raw?.schemaVersion).toBe(1);
  });

  it('runs a multi-step migration chain in order', async () => {
    const storage = new MemoryStorage();
    await storage.set('doc', { legacyCount: 5 }); // version 0 shape
    const twoStep = schema({
      currentVersion: 2,
      migrations: {
        0: (v) => ({ count: (v as { legacyCount: number }).legacyCount }),
        1: (v) => ({ count: (v as Doc).count * 10 }),
      },
    });
    const result = await loadVersioned(storage, 'doc', twoStep);
    expect(result).toEqual({ data: { count: 50 }, issue: null });
  });

  it('quarantines and starts fresh when no migration is registered for a gap in the chain', async () => {
    const storage = new MemoryStorage();
    await storage.set('doc', { schemaVersion: 0, data: { count: 1 } });
    const noMigration = schema({ currentVersion: 1, migrations: {} });

    const result = await loadVersioned(storage, 'doc', noMigration);

    expect(result.data).toEqual({ count: 0 });
    expect(result.issue?.kind).toBe('unreadable');
    // The raw, unreadable value is preserved under a recovery key, never dropped.
    if (result.issue?.kind === 'unreadable') {
      expect(await storage.get(result.issue.recoveryKey)).toEqual({ schemaVersion: 0, data: { count: 1 } });
    }
    // The original key is left alone, not overwritten with the empty default.
    expect(await storage.get('doc')).toEqual({ schemaVersion: 0, data: { count: 1 } });
  });

  it('quarantines when a migration throws', async () => {
    const storage = new MemoryStorage();
    await storage.set('doc', { count: 1 });
    const throwing = schema({
      migrations: {
        0: () => {
          throw new Error('boom');
        },
      },
    });

    const result = await loadVersioned(storage, 'doc', throwing);
    expect(result.data).toEqual({ count: 0 });
    expect(result.issue?.kind).toBe('unreadable');
  });

  it('quarantines when the migrated value fails validation', async () => {
    const storage = new MemoryStorage();
    await storage.set('doc', { nope: true });
    const result = await loadVersioned(storage, 'doc', schema({ migrations: { 0: (v) => v } }));

    expect(result.data).toEqual({ count: 0 });
    expect(result.issue?.kind).toBe('unreadable');
  });

  it('leaves data from a newer schema version untouched and reports it, rather than guessing at unknown fields', async () => {
    const storage = new MemoryStorage();
    await saveVersioned(storage, 'doc', schema({ currentVersion: 5 }), { count: 9 });

    const result = await loadVersioned(storage, 'doc', schema({ currentVersion: 1 }));

    expect(result.data).toEqual({ count: 0 });
    expect(result.issue).toEqual({ kind: 'newer', storedVersion: 5 });
    // Nothing was overwritten or quarantined -- the newer data is just left alone.
    expect(await storage.get('doc')).toEqual({ schemaVersion: 5, data: { count: 9 } });
  });
});
