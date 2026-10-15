/**
 * Storage interface. The app only ever talks to this — IndexedDB is one
 * implementation, swappable later for Capacitor Preferences or SQLite on
 * Android without touching engine or content code. Ported near-verbatim
 * from Emotional Skills Lab's src/storage/storage.ts, which already
 * proved this exact shape for the Capacitor-Android path this project is
 * committing to (see docs/android.md in that repo).
 */
export interface KVStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

/** In-memory implementation, for tests and for any environment without IndexedDB. */
export class MemoryStorage implements KVStorage {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return structuredClone(this.store.get(key)) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, structuredClone(value));
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return [...this.store.keys()];
  }
}

export const IDB_SCHEMA_VERSION = 1;

/** Browser IndexedDB implementation, used by the deployed web app. */
export class IDBStorage implements KVStorage {
  private readonly dbPromise: Promise<IDBDatabase>;
  private readonly storeName: string;

  constructor(databaseName = 'judgment-lab', storeName = 'kv') {
    this.storeName = storeName;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, IDB_SCHEMA_VERSION);
      // Explicit IndexedDB schema versions. Version 1: one key-value
      // store. Application-level data schema (what's stored under which
      // key) is versioned separately, inside whatever's stored.
      request.onupgradeneeded = (event) => {
        if (event.oldVersion < 1) {
          request.result.createObjectStore(storeName);
        }
      };
      request.onblocked = () => reject(new Error('Storage is blocked by another open tab of this app.'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const request = run(tx.objectStore(this.storeName));
      tx.oncomplete = () => resolve(request.result as T);
      tx.onerror = () => reject(tx.error);
    });
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.transaction<T | undefined>('readonly', (store) => store.get(key));
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.transaction('readwrite', (store) => store.put(value, key));
  }

  async delete(key: string): Promise<void> {
    await this.transaction('readwrite', (store) => store.delete(key));
  }

  async clear(): Promise<void> {
    await this.transaction('readwrite', (store) => store.clear());
  }

  async keys(): Promise<string[]> {
    const rawKeys = await this.transaction<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
    return rawKeys.map(String);
  }
}
