/**
 * Spaced-retention intervals in days, adopted from Emotional Skills Lab's
 * documented design choice (docs/curriculum-and-assessment.md: "after
 * phase mastery, items return at 2, 7 and 21 days; a miss resets to 2
 * days"). Better-grounded than a guessed schedule, so used as-is rather
 * than re-derived.
 */
const RETENTION_INTERVALS_DAYS = [2, 7, 21];

export function nextRetentionIntervalDays(consecutiveSuccesses: number): number {
  const index = Math.min(Math.max(0, consecutiveSuccesses), RETENTION_INTERVALS_DAYS.length - 1);
  return RETENTION_INTERVALS_DAYS[index]!;
}

/**
 * Schedules the next review date for a concept. A miss resets the streak
 * to zero (shortest interval); otherwise the interval lengthens with each
 * consecutive successful review.
 */
export function scheduleNextReview(
  consecutiveSuccesses: number,
  missedLastReview: boolean,
  now: Date
): Date {
  const effectiveStreak = missedLastReview ? 0 : consecutiveSuccesses;
  const days = nextRetentionIntervalDays(effectiveStreak);
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  return next;
}

export interface RetentionQueueItem {
  conceptId: string;
  dueAt: string;
}

export function buildRetentionQueue(
  items: { conceptId: string; nextReviewAt: string | null }[],
  now: Date
): RetentionQueueItem[] {
  return items
    .filter((item) => item.nextReviewAt !== null && new Date(item.nextReviewAt) <= now)
    .map((item) => ({ conceptId: item.conceptId, dueAt: item.nextReviewAt as string }))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}
