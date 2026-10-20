import type { KVStorage } from '@judgment-lab/storage';

const ONBOARDED_KEY = 'app:onboarded';

export async function loadOnboarded(storage: KVStorage): Promise<boolean> {
  return (await storage.get<boolean>(ONBOARDED_KEY)) ?? false;
}

export async function markOnboarded(storage: KVStorage): Promise<void> {
  await storage.set(ONBOARDED_KEY, true);
}
