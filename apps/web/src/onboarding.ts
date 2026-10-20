import { loadVersioned, saveVersioned, type KVStorage, type VersionedSchema } from '@judgment-lab/storage';

const ONBOARDED_KEY = 'app:onboarded';

const ONBOARDED_SCHEMA: VersionedSchema<boolean> = {
  currentVersion: 1,
  migrations: { 0: (v) => v },
  empty: () => false,
  validate: (value): value is boolean => typeof value === 'boolean',
};

export async function loadOnboarded(storage: KVStorage): Promise<boolean> {
  const { data, issue } = await loadVersioned(storage, ONBOARDED_KEY, ONBOARDED_SCHEMA);
  if (issue) console.warn(`[onboarding] ${ONBOARDED_KEY}:`, issue);
  return data;
}

export async function markOnboarded(storage: KVStorage): Promise<void> {
  await saveVersioned(storage, ONBOARDED_KEY, ONBOARDED_SCHEMA, true);
}
