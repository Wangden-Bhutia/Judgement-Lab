import { describe, expect, it } from 'vitest';
import { evaluateAnswer } from '../src/assessment';
import { Item } from '@judgment-lab/content-schema';

describe('evaluateAnswer', () => {
  it('scores a reason_choice item and tags misconceptions on a wrong pick', () => {
    const item: Item = {
      id: 'rc1',
      concept: 'c1',
      type: 'reason_choice',
      prompt: 'p',
      options: [
        { id: 'A', text: 'wrong', misconception: 'm1' },
        { id: 'B', text: 'right', conceptTag: 'c1' },
      ],
      acceptableAnswers: ['B'],
      explanation: 'exp',
    };
    const right = evaluateAnswer(item, { itemId: 'rc1', value: { itemType: 'reason_choice', selectedOptionIds: ['B'] } });
    expect(right.correct).toBe(true);
    expect(right.demonstratedConcepts).toEqual(['c1']);

    const wrong = evaluateAnswer(item, { itemId: 'rc1', value: { itemType: 'reason_choice', selectedOptionIds: ['A'] } });
    expect(wrong.correct).toBe(false);
    expect(wrong.misconceptions).toEqual(['m1']);
  });

  it('scores a single-blank fill_in item case-insensitively and trimmed', () => {
    const item: Item = {
      id: 'fi1',
      concept: 'c1',
      type: 'fill_in',
      prompt: 'p',
      slots: [{ id: 's1', acceptedValues: ['Commitment Device'] }],
      explanation: 'exp',
    };
    const result = evaluateAnswer(item, {
      itemId: 'fi1',
      value: { itemType: 'fill_in', values: { s1: '  commitment device  ' } },
    });
    expect(result.correct).toBe(true);
  });

  it('a multi-blank fill_in item requires every blank correct', () => {
    const item: Item = {
      id: 'fi2',
      concept: 'c1',
      type: 'fill_in',
      prompt: 'p',
      slots: [
        { id: 's1', acceptedValues: ['3'] },
        { id: 's2', acceptedValues: ['2'] },
      ],
      explanation: 'exp',
    };
    const allCorrect = evaluateAnswer(item, {
      itemId: 'fi2',
      value: { itemType: 'fill_in', values: { s1: '3', s2: '2' } },
    });
    expect(allCorrect.correct).toBe(true);

    const oneWrong = evaluateAnswer(item, {
      itemId: 'fi2',
      value: { itemType: 'fill_in', values: { s1: '3', s2: '9' } },
    });
    expect(oneWrong.correct).toBe(false);

    const missing = evaluateAnswer(item, {
      itemId: 'fi2',
      value: { itemType: 'fill_in', values: { s1: '3' } },
    });
    expect(missing.correct).toBe(false);
  });

  it('scores an own_words item from self-assessed criteria, never auto-grading prose', () => {
    const item: Item = {
      id: 'ow1',
      concept: 'c1',
      type: 'own_words',
      prompt: 'p',
      modelAnswer: 'model',
      rubric: ['a', 'b'],
    };
    const allMet = evaluateAnswer(item, {
      itemId: 'ow1',
      value: { itemType: 'own_words', draft: 'anything', selfAssessedCriteriaMet: [true, true] },
    });
    expect(allMet.correct).toBe(true);

    const partialMet = evaluateAnswer(item, {
      itemId: 'ow1',
      value: { itemType: 'own_words', draft: 'anything', selfAssessedCriteriaMet: [true, false] },
    });
    expect(partialMet.correct).toBe(false);
  });

  it('scores a classify item requiring every entry correctly placed', () => {
    const item: Item = {
      id: 'cl1',
      concept: 'c1',
      type: 'classify',
      prompt: 'p',
      categories: [
        { id: 'cat-a', label: 'A' },
        { id: 'cat-b', label: 'B' },
      ],
      entries: [
        { id: 'e1', label: 'E1', categoryId: 'cat-a' },
        { id: 'e2', label: 'E2', categoryId: 'cat-b' },
      ],
      explanation: 'exp',
    };
    const allCorrect = evaluateAnswer(item, {
      itemId: 'cl1',
      value: { itemType: 'classify', placements: { e1: 'cat-a', e2: 'cat-b' } },
    });
    expect(allCorrect.correct).toBe(true);

    const oneWrong = evaluateAnswer(item, {
      itemId: 'cl1',
      value: { itemType: 'classify', placements: { e1: 'cat-a', e2: 'cat-a' } },
    });
    expect(oneWrong.correct).toBe(false);
  });

  it('scores a sequence item requiring exact order', () => {
    const item: Item = {
      id: 'sq1',
      concept: 'c1',
      type: 'sequence',
      prompt: 'p',
      steps: [
        { id: 's1', label: 'First' },
        { id: 's2', label: 'Second' },
      ],
      correctOrder: ['s1', 's2'],
      explanation: 'exp',
    };
    expect(evaluateAnswer(item, { itemId: 'sq1', value: { itemType: 'sequence', order: ['s1', 's2'] } }).correct).toBe(true);
    expect(evaluateAnswer(item, { itemId: 'sq1', value: { itemType: 'sequence', order: ['s2', 's1'] } }).correct).toBe(false);
  });

  it('scores a match item regardless of pair submission order', () => {
    const item: Item = {
      id: 'mt1',
      concept: 'c1',
      type: 'match',
      prompt: 'p',
      left: [
        { id: 'l1', label: 'L1' },
        { id: 'l2', label: 'L2' },
      ],
      right: [
        { id: 'r1', label: 'R1' },
        { id: 'r2', label: 'R2' },
      ],
      correctPairs: [
        { leftId: 'l1', rightId: 'r1' },
        { leftId: 'l2', rightId: 'r2' },
      ],
      explanation: 'exp',
    };
    const result = evaluateAnswer(item, {
      itemId: 'mt1',
      value: {
        itemType: 'match',
        pairs: [
          { leftId: 'l2', rightId: 'r2' },
          { leftId: 'l1', rightId: 'r1' },
        ],
      },
    });
    expect(result.correct).toBe(true);
  });

  it('scores a compare item against its acceptable answers', () => {
    const item: Item = {
      id: 'cmp1',
      concept: 'c1',
      type: 'compare',
      prompt: 'p',
      optionA: 'A',
      optionB: 'B',
      question: 'q',
      acceptableAnswers: ['B'],
      explanation: 'exp',
    };
    expect(evaluateAnswer(item, { itemId: 'cmp1', value: { itemType: 'compare', answer: 'B' } }).correct).toBe(true);
    expect(evaluateAnswer(item, { itemId: 'cmp1', value: { itemType: 'compare', answer: 'A' } }).correct).toBe(false);
  });

  it('scores a predict item against the actual outcome and tags misconceptions from the chosen option', () => {
    const item: Item = {
      id: 'pr1',
      concept: 'c1',
      type: 'predict',
      prompt: 'p',
      situation: 's',
      options: [
        { id: 'A', text: 'cooperate', misconception: 'm1' },
        { id: 'B', text: 'defect' },
      ],
      actualOutcomeOptionId: 'B',
      explanation: 'exp',
    };
    const wrong = evaluateAnswer(item, { itemId: 'pr1', value: { itemType: 'predict', selectedOptionId: 'A' } });
    expect(wrong.correct).toBe(false);
    expect(wrong.misconceptions).toEqual(['m1']);

    const right = evaluateAnswer(item, { itemId: 'pr1', value: { itemType: 'predict', selectedOptionId: 'B' } });
    expect(right.correct).toBe(true);
  });

  it('throws if the submission itemId does not match', () => {
    const item: Item = {
      id: 'fi1',
      concept: 'c1',
      type: 'fill_in',
      prompt: 'p',
      slots: [{ id: 's1', acceptedValues: ['x'] }],
      explanation: 'exp',
    };
    expect(() =>
      evaluateAnswer(item, { itemId: 'wrong-id', value: { itemType: 'fill_in', values: { s1: 'x' } } })
    ).toThrow();
  });

  it('throws if the submission type does not match the item type', () => {
    const item: Item = {
      id: 'fi1',
      concept: 'c1',
      type: 'fill_in',
      prompt: 'p',
      slots: [{ id: 's1', acceptedValues: ['x'] }],
      explanation: 'exp',
    };
    expect(() =>
      evaluateAnswer(item, { itemId: 'fi1', value: { itemType: 'compare', answer: 'A' } })
    ).toThrow();
  });
});
