import { describe, expect, it } from 'vitest';
import type { Item } from '@judgment-lab/content-schema';
import type { ItemAttemptRecord } from '@judgment-lab/core-engine';
import { pickReviewItem } from './reviewSelection';

function reasonChoiceItem(id: string, concept = 'c'): Item {
  return {
    id,
    concept,
    type: 'reason_choice',
    prompt: `prompt for ${id}`,
    options: [{ id: 'A', text: 'A' }],
    acceptableAnswers: ['A'],
    explanation: `explanation for ${id}`,
  };
}

function ownWordsItem(id: string, concept = 'c'): Item {
  return {
    id,
    concept,
    type: 'own_words',
    prompt: `prompt for ${id}`,
    modelAnswer: 'model',
    rubric: ['criterion'],
  };
}

function attempt(itemId: string, attemptedAt: string): ItemAttemptRecord {
  return { itemId, conceptId: 'c', correct: true, source: 'review', attemptedAt };
}

describe('pickReviewItem', () => {
  it('returns undefined when there are no items for the concept', () => {
    expect(pickReviewItem(undefined, [])).toBeUndefined();
    expect(pickReviewItem([], [])).toBeUndefined();
  });

  it('with a single candidate and no attempt history, returns it', () => {
    const item = reasonChoiceItem('i1');
    expect(pickReviewItem([item], [])).toBe(item);
  });

  it('prefers an item that has never been attempted over one that has', () => {
    const seen = reasonChoiceItem('i1');
    const unseen = reasonChoiceItem('i2');
    const picked = pickReviewItem([seen, unseen], [attempt('i1', '2026-01-01T00:00:00.000Z')]);
    expect(picked).toBe(unseen);
  });

  it('among attempted items, picks the one attempted longest ago -- rotating through the pool rather than repeating the same item', () => {
    const older = reasonChoiceItem('i1');
    const newer = reasonChoiceItem('i2');
    const attempts = [attempt('i1', '2026-01-01T00:00:00.000Z'), attempt('i2', '2026-01-10T00:00:00.000Z')];
    expect(pickReviewItem([older, newer], attempts)).toBe(older);
  });

  it('never picks own_words when an auto-graded alternative exists, even if own_words was attempted longer ago', () => {
    const words = ownWordsItem('i1');
    const choice = reasonChoiceItem('i2');
    const attempts = [attempt('i2', '2026-01-10T00:00:00.000Z')]; // i1 (own_words) never attempted -- "longest ago"
    expect(pickReviewItem([words, choice], attempts)).toBe(choice);
  });

  it('falls back to own_words only when it is the sole item for the concept', () => {
    const words = ownWordsItem('i1');
    expect(pickReviewItem([words], [])).toBe(words);
  });
});
