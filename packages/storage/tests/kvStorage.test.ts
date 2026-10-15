import { describe, expect, it } from 'vitest';
import { IDBStorage, KVStorage, MemoryStorage } from '../src/kvStorage';

/** Runs the same contract tests against every KVStorage implementation,
 * so MemoryStorage (used in most tests) and IDBStorage (used in the
 * browser) are guaranteed to behave identically. */
function describeStorageContract(name: string, makeStorage: () => KVStorage) {
  describe(`KVStorage contract: ${name}`, () => {
    it('returns undefined for a key that was never set', async () => {
      const storage = makeStorage();
      expect(await storage.get('missing')).toBeUndefined();
    });

    it('round-trips a stored value', async () => {
      const storage = makeStorage();
      await storage.set('k', { a: 1, b: [1, 2, 3] });
      expect(await storage.get('k')).toEqual({ a: 1, b: [1, 2, 3] });
    });

    it('overwrites a value on a second set', async () => {
      const storage = makeStorage();
      await storage.set('k', 'first');
      await storage.set('k', 'second');
      expect(await storage.get('k')).toBe('second');
    });

    it('deletes a key', async () => {
      const storage = makeStorage();
      await storage.set('k', 'v');
      await storage.delete('k');
      expect(await storage.get('k')).toBeUndefined();
    });

    it('deleting a nonexistent key is a no-op, not an error', async () => {
      const storage = makeStorage();
      await expect(storage.delete('never-set')).resolves.not.toThrow();
    });

    it('clear() removes every key', async () => {
      const storage = makeStorage();
      await storage.set('a', 1);
      await storage.set('b', 2);
      await storage.clear();
      expect(await storage.keys()).toEqual([]);
    });

    it('keys() lists every stored key', async () => {
      const storage = makeStorage();
      await storage.set('a', 1);
      await storage.set('b', 2);
      expect((await storage.keys()).sort()).toEqual(['a', 'b']);
    });
  });
}

describeStorageContract('MemoryStorage', () => new MemoryStorage());
describeStorageContract('IDBStorage', () => new IDBStorage(`test-db-${Math.random()}`));

describe('MemoryStorage isolation', () => {
  it('get() returns a clone, so mutating the result does not corrupt stored state', async () => {
    const storage = new MemoryStorage();
    const original = { nested: { value: 1 } };
    await storage.set('k', original);
    const retrieved = await storage.get<typeof original>('k');
    retrieved!.nested.value = 999;
    const retrievedAgain = await storage.get<typeof original>('k');
    expect(retrievedAgain!.nested.value).toBe(1);
  });
});
