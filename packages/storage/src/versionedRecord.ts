import type { KVStorage } from './kvStorage';

export type Migration = (value: unknown) => unknown;

export interface VersionedSchema<T> {
  /** The version this record is currently written at. Bump this, and add a
   * migration keyed by the OLD version, whenever the stored shape changes. */
  currentVersion: number;
  /** Migrations keyed by the version they upgrade FROM. Version 0 covers
   * data written before this record was versioned at all -- the bare value,
   * not wrapped in an envelope. */
  migrations: Record<number, Migration>;
  empty: () => T;
  validate: (value: unknown) => value is T;
}

export type LoadIssue =
  | { kind: 'unreadable'; recoveryKey: string; detail: string }
  /** Stored at a version newer than this build knows -- e.g. after a
   * rollback. The envelope is left exactly as it was; nothing is guessed
   * about fields this code doesn't know yet. */
  | { kind: 'newer'; storedVersion: number };

export interface LoadVersionedResult<T> {
  data: T;
  issue: LoadIssue | null;
}

interface Envelope {
  schemaVersion: number;
  data: unknown;
}

function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).schemaVersion === 'number' &&
    'data' in value
  );
}

/**
 * Loads a value stored under `key`, migrating it up to `schema.currentVersion`
 * if it was written at an older one, and quarantining it (raw copy kept under
 * a side key, original key left untouched, app continues on a fresh default)
 * if it can't be read as any recognised version.
 *
 * Mirrors Equanim's storage pattern (versioned envelope + migrate-on-load +
 * corruption salvage), sized down for a KVStorage backend that doesn't need
 * Equanim's cross-tab merge machinery: IndexedDB already serialises
 * concurrent writes within one browser, and there's no legacy pre-versioning
 * key from a prior app to reconcile against -- only the bare, un-enveloped
 * value this same app wrote before this helper existed (treated as version 0).
 */
export async function loadVersioned<T>(
  storage: KVStorage,
  key: string,
  schema: VersionedSchema<T>
): Promise<LoadVersionedResult<T>> {
  const stored = await storage.get<unknown>(key);
  if (stored === undefined) {
    return { data: schema.empty(), issue: null };
  }

  let version = isEnvelope(stored) ? stored.schemaVersion : 0;
  let value: unknown = isEnvelope(stored) ? stored.data : stored;

  if (version > schema.currentVersion) {
    return { data: schema.empty(), issue: { kind: 'newer', storedVersion: version } };
  }

  while (version < schema.currentVersion) {
    const migrate = schema.migrations[version];
    if (!migrate) {
      return quarantine(storage, key, stored, schema, `no migration registered from version ${version}`);
    }
    try {
      value = migrate(value);
    } catch (error) {
      return quarantine(storage, key, stored, schema, `migration from version ${version} threw: ${String(error)}`);
    }
    version += 1;
  }

  if (!schema.validate(value)) {
    return quarantine(storage, key, stored, schema, 'failed validation after migration');
  }

  // Persist the migrated/wrapped shape so future loads skip this work.
  if (!isEnvelope(stored) || stored.schemaVersion !== schema.currentVersion) {
    await saveVersioned(storage, key, schema, value);
  }

  return { data: value, issue: null };
}

export async function saveVersioned<T>(
  storage: KVStorage,
  key: string,
  schema: VersionedSchema<T>,
  data: T
): Promise<void> {
  const envelope: Envelope = { schemaVersion: schema.currentVersion, data };
  await storage.set(key, envelope);
}

async function quarantine<T>(
  storage: KVStorage,
  key: string,
  raw: unknown,
  schema: VersionedSchema<T>,
  detail: string
): Promise<LoadVersionedResult<T>> {
  const recoveryKey = `${key}:unreadable:${Date.now()}`;
  await storage.set(recoveryKey, raw);
  return { data: schema.empty(), issue: { kind: 'unreadable', recoveryKey, detail } };
}
