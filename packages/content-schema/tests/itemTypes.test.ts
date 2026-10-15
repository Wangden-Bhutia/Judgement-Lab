import { describe, expect, it } from 'vitest';
import { itemSchema } from '../src/schemas';

describe('itemSchema: every item type', () => {
  it('accepts a well-formed fill_in item with a single blank', () => {
    const result = itemSchema.safeParse({
      id: 'fi-1',
      concept: 'c1',
      type: 'fill_in',
      prompt: 'What is the term for a decision that locks in future options? {slot:s1}',
      slots: [{ id: 's1', acceptedValues: ['commitment', 'commitment device'] }],
      explanation: 'A commitment device removes future flexibility on purpose.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a well-formed fill_in item with multiple blanks', () => {
    const result = itemSchema.safeParse({
      id: 'fi-2',
      concept: 'c1',
      type: 'fill_in',
      prompt: 'Your payoff is {slot:s1} and theirs is {slot:s2}.',
      slots: [
        { id: 's1', acceptedValues: ['3'] },
        { id: 's2', acceptedValues: ['2'] },
      ],
      explanation: 'x',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a fill_in item with duplicate slot ids', () => {
    const result = itemSchema.safeParse({
      id: 'fi-3',
      concept: 'c1',
      type: 'fill_in',
      prompt: '{slot:s1} and {slot:s1}.',
      slots: [
        { id: 's1', acceptedValues: ['3'] },
        { id: 's1', acceptedValues: ['2'] },
      ],
      explanation: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed own_words item', () => {
    const result = itemSchema.safeParse({
      id: 'ow-1',
      concept: 'c1',
      type: 'own_words',
      prompt: 'Explain the idea in your own words.',
      modelAnswer: 'A model answer.',
      rubric: ['Criterion one.'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a classify item whose entry references an unknown category', () => {
    const result = itemSchema.safeParse({
      id: 'cl-1',
      concept: 'c1',
      type: 'classify',
      prompt: 'Sort these.',
      categories: [
        { id: 'cat-a', label: 'A' },
        { id: 'cat-b', label: 'B' },
      ],
      entries: [{ id: 'e1', label: 'Entry 1', categoryId: 'cat-z' }],
      explanation: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a sequence item whose correctOrder length does not match its steps', () => {
    const result = itemSchema.safeParse({
      id: 'sq-1',
      concept: 'c1',
      type: 'sequence',
      prompt: 'Order these.',
      steps: [
        { id: 's1', label: 'First' },
        { id: 's2', label: 'Second' },
      ],
      correctOrder: ['s1'],
      explanation: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a match item whose correctPairs references an unknown right id', () => {
    const result = itemSchema.safeParse({
      id: 'mt-1',
      concept: 'c1',
      type: 'match',
      prompt: 'Match these.',
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
        { leftId: 'l2', rightId: 'r-nonexistent' },
      ],
      explanation: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed compare item', () => {
    const result = itemSchema.safeParse({
      id: 'cmp-1',
      concept: 'c1',
      type: 'compare',
      prompt: 'Compare these two options.',
      optionA: 'Negotiate now',
      optionB: 'Wait and gather information',
      question: 'Which better preserves optionality?',
      acceptableAnswers: ['B'],
      explanation: 'x',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a predict item whose actualOutcomeOptionId references an unknown option', () => {
    const result = itemSchema.safeParse({
      id: 'pr-1',
      concept: 'c1',
      type: 'predict',
      prompt: 'Predict the outcome.',
      situation: 'Two parties negotiate over a shared resource.',
      options: [
        { id: 'A', text: 'They cooperate.' },
        { id: 'B', text: 'They defect.' },
      ],
      actualOutcomeOptionId: 'C',
      explanation: 'x',
    });
    expect(result.success).toBe(false);
  });
});
