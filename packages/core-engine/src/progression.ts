import type { Lesson, LessonId } from '@judgment-lab/content-schema';

export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface LessonProgressState {
  lessonId: LessonId;
  attemptsCount: number;
  lastAttemptAt: string | null;
  completedAt: string | null;
}

/**
 * A lesson unlocks once every prerequisite lesson has been COMPLETED, not
 * mastered. Mastery needs delayed evidence from a later review or
 * checkpoint (see mastery.ts) that can only arrive days afterward, so
 * gating progression on it would stall the whole curriculum waiting on
 * spaced-review evidence. This mirrors Emotional Skills Lab's design
 * ("sessions unlock in order; each lists its prerequisite", with mastery
 * tracked completely separately) rather than Human Behaviour Lab's
 * original same-session-mastery gate.
 */
export function isLessonUnlocked(
  lesson: Lesson,
  progressByLessonId: ReadonlyMap<LessonId, LessonProgressState>
): boolean {
  return lesson.prerequisites.every((prereqId) => progressByLessonId.get(prereqId)?.completedAt != null);
}

export function deriveLessonStatus(
  lesson: Lesson,
  progressByLessonId: ReadonlyMap<LessonId, LessonProgressState>
): LessonStatus {
  const existing = progressByLessonId.get(lesson.id);
  if (existing?.completedAt) {
    return 'completed';
  }
  if (!isLessonUnlocked(lesson, progressByLessonId)) {
    return 'locked';
  }
  if (existing && existing.attemptsCount > 0) {
    return 'in_progress';
  }
  return 'available';
}
