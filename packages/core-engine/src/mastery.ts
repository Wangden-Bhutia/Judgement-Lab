import type { ConceptId, ItemId, LessonId } from '@judgment-lab/content-schema';

export type AttemptSource = 'lesson' | 'review' | 'checkpoint';

export interface ItemAttemptRecord {
  itemId: ItemId;
  conceptId: ConceptId;
  correct: boolean;
  source: AttemptSource;
  attemptedAt: string;
}

/** Per Emotional Skills Lab's design (docs/curriculum-and-assessment.md):
 * skill mastery needs at least 2 of a concept's items answered correctly,
 * at >= 80%, on their LATEST delayed-evidence attempt. */
export const SKILL_MASTERY_MIN_ITEMS = 2;
export const SKILL_MASTERY_THRESHOLD = 0.8;

export interface SkillMasteryResult {
  conceptId: ConceptId;
  itemsSeen: number;
  accuracy: number;
  mastered: boolean;
}

/**
 * Computes skill mastery for one concept from delayed evidence only —
 * attempts recorded with source 'lesson' (the first pass, inside the
 * lesson that introduced the concept) never count. Only 'review' and
 * 'checkpoint' attempts do, each item's LATEST such attempt, so revising
 * a wrong answer later can still earn mastery without old mistakes
 * dragging the score down forever.
 */
export function computeSkillMastery(conceptId: ConceptId, attempts: ItemAttemptRecord[]): SkillMasteryResult {
  const delayedAttempts = attempts.filter((a) => a.conceptId === conceptId && a.source !== 'lesson');

  const latestByItem = new Map<ItemId, ItemAttemptRecord>();
  for (const attempt of delayedAttempts) {
    const existing = latestByItem.get(attempt.itemId);
    if (!existing || attempt.attemptedAt > existing.attemptedAt) {
      latestByItem.set(attempt.itemId, attempt);
    }
  }

  const latestAttempts = [...latestByItem.values()];
  const itemsSeen = latestAttempts.length;
  const correctCount = latestAttempts.filter((a) => a.correct).length;
  const accuracy = itemsSeen > 0 ? correctCount / itemsSeen : 0;
  const mastered = itemsSeen >= SKILL_MASTERY_MIN_ITEMS && accuracy >= SKILL_MASTERY_THRESHOLD;

  return { conceptId, itemsSeen, accuracy, mastered };
}

/**
 * A lesson is mastered only once every concept it teaches has independently
 * reached skill mastery. Since skill mastery requires delayed evidence, a
 * lesson can never show as mastered from its own first pass — this is
 * deliberate (completion and mastery are different claims; see
 * progression.ts for why lesson *unlocking* uses completion, not this).
 */
export function deriveLessonMastered(
  concepts: ConceptId[],
  skillMasteryByConcept: ReadonlyMap<ConceptId, SkillMasteryResult>
): boolean {
  if (concepts.length === 0) return false;
  return concepts.every((conceptId) => skillMasteryByConcept.get(conceptId)?.mastered === true);
}

/**
 * V1 simplification: a module is mastered once every one of its lessons is
 * mastered. Emotional Skills Lab's full design draws a weighted checkpoint
 * from a pooled, least-exposed-first item set instead — deliberately not
 * built here yet; revisit once more than one track's worth of content
 * exists and there's a real checkpoint UI to build it for.
 */
export function deriveModuleMastered(
  lessonIds: LessonId[],
  lessonMasteredById: ReadonlyMap<LessonId, boolean>
): boolean {
  if (lessonIds.length === 0) return false;
  return lessonIds.every((lessonId) => lessonMasteredById.get(lessonId) === true);
}
