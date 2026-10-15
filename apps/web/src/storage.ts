import { IDBStorage, type KVStorage } from '@judgment-lab/storage';

export const storage: KVStorage = new IDBStorage();
