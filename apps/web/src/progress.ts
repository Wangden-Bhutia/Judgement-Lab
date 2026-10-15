import type { ConceptId, ItemId, LessonId } from '@judgment-lab/content-schema';
import type { AttemptSource, ItemAttemptRecord } from '@judgment-lab/core-engine';
import type { LessonProgressState } from '@judgment-lab/core-engine';
import type { KVStorage } from '@judgment-lab/storage';

const LESSONS_KEY = 'progress:lessons';
const ATTEMPTS_KEY = 'progress:attempts';

export async function loadLessonProgress(storage: KVStorage): Promise<Map<LessonId, LessonProgressState>> {
  const stored = await storage.get<Record<LessonId, LessonProgressState>>(LESSONS_KEY);
  return new Map(Object.entries(stored ?? {}));
}

export async function saveLessonProgress(
  storage: KVStorage,
  progress: ReadonlyMap<LessonId, LessonProgressState>
): Promise<void> {
  await storage.set(LESSONS_KEY, Object.fromEntries(progress));
}

export async function loadAttempts(storage: KVStorage): Promise<ItemAttemptRecord[]> {
  return (await storage.get<ItemAttemptRecord[]>(ATTEMPTS_KEY)) ?? [];
}

export async function recordAttempt(
  storage: KVStorage,
  attempt: { itemId: ItemId; conceptId: ConceptId; correct: boolean; source: AttemptSource }
): Promise<void> {
  const attempts = await loadAttempts(storage);
  attempts.push({ ...attempt, attemptedAt: new Date().toISOString() });
  await storage.set(ATTEMPTS_KEY, attempts);
}

export function touchLessonProgress(
  progress: ReadonlyMap<LessonId, LessonProgressState>,
  lessonId: LessonId
): Map<LessonId, LessonProgressState> {
  const next = new Map(progress);
  const existing = next.get(lessonId);
  next.set(lessonId, {
    lessonId,
    attemptsCount: (existing?.attemptsCount ?? 0) + 1,
    lastAttemptAt: new Date().toISOString(),
    completedAt: existing?.completedAt ?? null,
  });
  return next;
}

export function completeLessonProgress(
  progress: ReadonlyMap<LessonId, LessonProgressState>,
  lessonId: LessonId
): Map<LessonId, LessonProgressState> {
  const next = new Map(progress);
  const existing = next.get(lessonId);
  next.set(lessonId, {
    lessonId,
    attemptsCount: existing?.attemptsCount ?? 1,
    lastAttemptAt: existing?.lastAttemptAt ?? new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });
  return next;
}
