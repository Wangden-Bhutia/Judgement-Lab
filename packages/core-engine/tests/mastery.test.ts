import { describe, expect, it } from 'vitest';
import {
  computeSkillMastery,
  deriveLessonMastered,
  deriveModuleMastered,
  ItemAttemptRecord,
} from '../src/mastery';

function attempt(overrides: Partial<ItemAttemptRecord>): ItemAttemptRecord {
  return {
    itemId: 'item-1',
    conceptId: 'concept-1',
    correct: true,
    source: 'review',
    attemptedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeSkillMastery', () => {
  it('ignores lesson-time (first-pass) attempts entirely', () => {
    const attempts = [
      attempt({ itemId: 'i1', source: 'lesson', correct: true }),
      attempt({ itemId: 'i2', source: 'lesson', correct: true }),
    ];
    const result = computeSkillMastery('concept-1', attempts);
    expect(result.itemsSeen).toBe(0);
    expect(result.mastered).toBe(false);
  });

  it('requires at least 2 distinct items from delayed evidence', () => {
    const attempts = [attempt({ itemId: 'i1', source: 'review', correct: true })];
    const result = computeSkillMastery('concept-1', attempts);
    expect(result.mastered).toBe(false);
  });

  it('masters a concept once >=2 items hit >=80% on review/checkpoint evidence', () => {
    const attempts = [
      attempt({ itemId: 'i1', source: 'review', correct: true }),
      attempt({ itemId: 'i2', source: 'checkpoint', correct: true }),
    ];
    const result = computeSkillMastery('concept-1', attempts);
    expect(result.accuracy).toBe(1);
    expect(result.mastered).toBe(true);
  });

  it('does not master when accuracy falls below 80%', () => {
    const attempts = [
      attempt({ itemId: 'i1', source: 'review', correct: true }),
      attempt({ itemId: 'i2', source: 'review', correct: false }),
      attempt({ itemId: 'i3', source: 'review', correct: false }),
    ];
    const result = computeSkillMastery('concept-1', attempts);
    expect(result.accuracy).toBeCloseTo(1 / 3);
    expect(result.mastered).toBe(false);
  });

  it('uses only the LATEST attempt per item, so a later correct retry overrides an earlier miss', () => {
    const attempts = [
      attempt({ itemId: 'i1', source: 'review', correct: false, attemptedAt: '2026-01-01T00:00:00.000Z' }),
      attempt({ itemId: 'i1', source: 'review', correct: true, attemptedAt: '2026-01-10T00:00:00.000Z' }),
      attempt({ itemId: 'i2', source: 'checkpoint', correct: true, attemptedAt: '2026-01-05T00:00:00.000Z' }),
    ];
    const result = computeSkillMastery('concept-1', attempts);
    expect(result.itemsSeen).toBe(2);
    expect(result.accuracy).toBe(1);
    expect(result.mastered).toBe(true);
  });

  it('only considers attempts for the requested concept', () => {
    const attempts = [
      attempt({ itemId: 'i1', conceptId: 'concept-1', source: 'review', correct: true }),
      attempt({ itemId: 'i2', conceptId: 'concept-2', source: 'review', correct: true }),
    ];
    const result = computeSkillMastery('concept-1', attempts);
    expect(result.itemsSeen).toBe(1);
  });
});

describe('deriveLessonMastered', () => {
  it('is false if any of the lesson\'s concepts is not yet mastered', () => {
    const skillMasteryByConcept = new Map([
      ['c1', { conceptId: 'c1', itemsSeen: 2, accuracy: 1, mastered: true }],
      ['c2', { conceptId: 'c2', itemsSeen: 0, accuracy: 0, mastered: false }],
    ]);
    expect(deriveLessonMastered(['c1', 'c2'], skillMasteryByConcept)).toBe(false);
  });

  it('is true once every concept is independently mastered', () => {
    const skillMasteryByConcept = new Map([
      ['c1', { conceptId: 'c1', itemsSeen: 2, accuracy: 1, mastered: true }],
      ['c2', { conceptId: 'c2', itemsSeen: 2, accuracy: 0.9, mastered: true }],
    ]);
    expect(deriveLessonMastered(['c1', 'c2'], skillMasteryByConcept)).toBe(true);
  });

  it('a lesson can never be mastered purely from completion: with no skill-mastery entries at all, it is false', () => {
    expect(deriveLessonMastered(['c1'], new Map())).toBe(false);
  });
});

describe('deriveModuleMastered', () => {
  it('is true only once every lesson in the module is mastered', () => {
    const lessonMasteredById = new Map([
      ['l1', true],
      ['l2', false],
    ]);
    expect(deriveModuleMastered(['l1', 'l2'], lessonMasteredById)).toBe(false);
    lessonMasteredById.set('l2', true);
    expect(deriveModuleMastered(['l1', 'l2'], lessonMasteredById)).toBe(true);
  });
});
