import type { Item } from '@judgment-lab/content-schema';
import type { ItemAttemptRecord } from '@judgment-lab/core-engine';

/**
 * Picks which of a concept's items to review, preferring an auto-graded
 * item over own_words (self-assessed correctness is weaker evidence, so
 * only fall back to it when nothing else exists), and among those,
 * rotating through the pool by least-recently-attempted rather than
 * always returning the same one. Without this, review always re-served
 * the exact item the learner last saw -- after the first cycle that's
 * recognising one specific question, not retrieving the concept.
 */
export function pickReviewItem(items: Item[] | undefined, attempts: ItemAttemptRecord[]): Item | undefined {
  if (!items || items.length === 0) return undefined;
  const autoGraded = items.filter((item) => item.type !== 'own_words');
  const pool = autoGraded.length > 0 ? autoGraded : items;

  function lastAttemptedAt(itemId: string): number {
    let latest = 0;
    for (const a of attempts) {
      if (a.itemId === itemId) latest = Math.max(latest, new Date(a.attemptedAt).getTime());
    }
    return latest;
  }

  return pool.reduce((least, item) => (lastAttemptedAt(item.id) < lastAttemptedAt(least.id) ? item : least));
}
