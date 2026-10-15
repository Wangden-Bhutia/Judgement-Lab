import type { MisconceptionId } from '@judgment-lab/content-schema';
import type { AnswerEvaluation } from './assessment';

/** A misconception counts as "recurring" once it has shown up this many times. */
export const RECURRING_MISCONCEPTION_THRESHOLD = 2;

/**
 * Tallies how often each misconception has appeared across a learner's
 * evaluation history. This describes patterns in the learner's reasoning
 * on specific items, not a trait of the learner.
 */
export function tallyMisconceptions(evaluations: AnswerEvaluation[]): Map<MisconceptionId, number> {
  const counts = new Map<MisconceptionId, number>();
  for (const evaluation of evaluations) {
    for (const misconception of evaluation.misconceptions) {
      counts.set(misconception, (counts.get(misconception) ?? 0) + 1);
    }
  }
  return counts;
}

export function recurringMisconceptions(evaluations: AnswerEvaluation[]): MisconceptionId[] {
  const counts = tallyMisconceptions(evaluations);
  return [...counts.entries()]
    .filter(([, count]) => count >= RECURRING_MISCONCEPTION_THRESHOLD)
    .map(([id]) => id);
}
