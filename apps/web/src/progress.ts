import type { ConceptId, ItemId, LessonId } from '@judgment-lab/content-schema';
import type { AttemptSource, ConceptReviewState, ItemAttemptRecord } from '@judgment-lab/core-engine';
import type { LessonProgressState } from '@judgment-lab/core-engine';
import { updateReviewState } from '@judgment-lab/core-engine';
import { loadVersioned, saveVersioned, type KVStorage, type VersionedSchema } from '@judgment-lab/storage';

const LESSONS_KEY = 'progress:lessons';
const ATTEMPTS_KEY = 'progress:attempts';
const REVIEW_STATE_KEY = 'progress:reviewState';

function isLessonProgressState(value: unknown): value is LessonProgressState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<LessonProgressState>;
  return (
    typeof v.lessonId === 'string' &&
    typeof v.attemptsCount === 'number' &&
    (typeof v.lastAttemptAt === 'string' || v.lastAttemptAt === null) &&
    (typeof v.completedAt === 'string' || v.completedAt === null)
  );
}

// currentVersion: 1 for every record here, not 0 -- these keys were written
// unversioned (the bare value, no envelope) before this schema existed.
// Migration 0 is an identity pass: the legacy shape already matches what
// validate() expects, so upgrading to version 1 is just wrapping it in an
// envelope on the next save. Every user's existing browser data exercises
// this path on their first load after this change ships.
const LESSON_PROGRESS_SCHEMA: VersionedSchema<Record<LessonId, LessonProgressState>> = {
  currentVersion: 1,
  migrations: { 0: (v) => v },
  empty: () => ({}),
  validate: (value): value is Record<LessonId, LessonProgressState> =>
    typeof value === 'object' && value !== null && Object.values(value).every(isLessonProgressState),
};

export async function loadLessonProgress(storage: KVStorage): Promise<Map<LessonId, LessonProgressState>> {
  const { data, issue } = await loadVersioned(storage, LESSONS_KEY, LESSON_PROGRESS_SCHEMA);
  if (issue) console.warn(`[progress] ${LESSONS_KEY}:`, issue);
  return new Map(Object.entries(data));
}

export async function saveLessonProgress(
  storage: KVStorage,
  progress: ReadonlyMap<LessonId, LessonProgressState>
): Promise<void> {
  await saveVersioned(storage, LESSONS_KEY, LESSON_PROGRESS_SCHEMA, Object.fromEntries(progress));
}

function isItemAttemptRecord(value: unknown): value is ItemAttemptRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ItemAttemptRecord>;
  return (
    typeof v.itemId === 'string' &&
    typeof v.conceptId === 'string' &&
    typeof v.correct === 'boolean' &&
    (v.source === 'lesson' || v.source === 'review' || v.source === 'checkpoint') &&
    typeof v.attemptedAt === 'string'
  );
}

const ATTEMPTS_SCHEMA: VersionedSchema<ItemAttemptRecord[]> = {
  currentVersion: 1,
  migrations: { 0: (v) => v },
  empty: () => [],
  validate: (value): value is ItemAttemptRecord[] => Array.isArray(value) && value.every(isItemAttemptRecord),
};

export async function loadAttempts(storage: KVStorage): Promise<ItemAttemptRecord[]> {
  const { data, issue } = await loadVersioned(storage, ATTEMPTS_KEY, ATTEMPTS_SCHEMA);
  if (issue) console.warn(`[progress] ${ATTEMPTS_KEY}:`, issue);
  return data;
}

export async function recordAttempt(
  storage: KVStorage,
  attempt: { itemId: ItemId; conceptId: ConceptId; correct: boolean; source: AttemptSource }
): Promise<void> {
  const attempts = await loadAttempts(storage);
  attempts.push({ ...attempt, attemptedAt: new Date().toISOString() });
  await saveVersioned(storage, ATTEMPTS_KEY, ATTEMPTS_SCHEMA, attempts);

  // Only a delayed-evidence attempt (checkpoint or review) enters or
  // advances a concept's spaced-retention schedule -- the same
  // source !== 'lesson' rule core-engine's mastery model uses, so the
  // review queue and mastery stay in sync with each other.
  if (attempt.source !== 'lesson') {
    const reviewState = await loadReviewState(storage);
    const existing = reviewState.get(attempt.conceptId);
    reviewState.set(attempt.conceptId, updateReviewState(existing, attempt.conceptId, attempt.correct, new Date()));
    await saveReviewState(storage, reviewState);
  }
}

function isConceptReviewState(value: unknown): value is ConceptReviewState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ConceptReviewState>;
  return (
    typeof v.conceptId === 'string' && typeof v.nextReviewAt === 'string' && typeof v.consecutiveSuccesses === 'number'
  );
}

const REVIEW_STATE_SCHEMA: VersionedSchema<Record<ConceptId, ConceptReviewState>> = {
  currentVersion: 1,
  migrations: { 0: (v) => v },
  empty: () => ({}),
  validate: (value): value is Record<ConceptId, ConceptReviewState> =>
    typeof value === 'object' && value !== null && Object.values(value).every(isConceptReviewState),
};

export async function loadReviewState(storage: KVStorage): Promise<Map<ConceptId, ConceptReviewState>> {
  const { data, issue } = await loadVersioned(storage, REVIEW_STATE_KEY, REVIEW_STATE_SCHEMA);
  if (issue) console.warn(`[progress] ${REVIEW_STATE_KEY}:`, issue);
  return new Map(Object.entries(data));
}

export async function saveReviewState(
  storage: KVStorage,
  state: ReadonlyMap<ConceptId, ConceptReviewState>
): Promise<void> {
  await saveVersioned(storage, REVIEW_STATE_KEY, REVIEW_STATE_SCHEMA, Object.fromEntries(state));
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
