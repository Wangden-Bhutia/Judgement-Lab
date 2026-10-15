import { describe, expect, it } from 'vitest';
import { recurringMisconceptions, tallyMisconceptions } from '../src/misconceptions';
import { AnswerEvaluation } from '../src/assessment';

function evalWith(misconceptions: string[]): AnswerEvaluation {
  return { itemId: 'x', correct: misconceptions.length === 0, misconceptions, demonstratedConcepts: [], explanation: '' };
}

describe('misconceptions', () => {
  it('tallies occurrences per misconception id', () => {
    const counts = tallyMisconceptions([evalWith(['m1']), evalWith(['m1']), evalWith(['m2'])]);
    expect(counts.get('m1')).toBe(2);
    expect(counts.get('m2')).toBe(1);
  });

  it('a one-off misconception is not recurring', () => {
    expect(recurringMisconceptions([evalWith(['m1'])])).toEqual([]);
  });

  it('flags a misconception seen twice or more as recurring', () => {
    expect(recurringMisconceptions([evalWith(['m1']), evalWith(['m1'])])).toContain('m1');
  });
});
