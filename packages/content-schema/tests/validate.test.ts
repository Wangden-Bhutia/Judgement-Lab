import { describe, expect, it } from 'vitest';
import { validateContent } from '../src/validate';
import { sampleCurriculum, sampleItems } from './fixtures';

describe('validateContent', () => {
  it('accepts a well-formed curriculum and item set', () => {
    const result = validateContent(sampleCurriculum(), sampleItems());
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects a reason_choice item whose acceptableAnswers references a nonexistent option', () => {
    const items = sampleItems();
    const broken = JSON.parse(JSON.stringify(items[0]));
    broken.acceptableAnswers = ['Z'];
    const result = validateContent(sampleCurriculum(), [broken, items[1], items[2]]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('unknown option'))).toBe(true);
  });

  it('rejects duplicate item ids', () => {
    const items = sampleItems();
    const result = validateContent(sampleCurriculum(), [items[0], items[0]]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('duplicate item id'))).toBe(true);
  });

  it('rejects a lesson that references a nonexistent prerequisite', () => {
    const curriculum = sampleCurriculum();
    curriculum.lessons[0]!.prerequisites = ['nonexistent-lesson'];
    const result = validateContent(curriculum, sampleItems());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('unknown prerequisite'))).toBe(true);
  });

  it('rejects a lesson that lists itself as a prerequisite', () => {
    const curriculum = sampleCurriculum();
    curriculum.lessons[0]!.prerequisites = [curriculum.lessons[0]!.id];
    const result = validateContent(curriculum, sampleItems());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('lists itself as a prerequisite'))).toBe(true);
  });

  it('rejects a lesson whose module belongs to a different track', () => {
    const curriculum = sampleCurriculum();
    curriculum.tracks.push({ id: 'other-track', title: 'Other', description: 'x', moduleIds: [] });
    curriculum.modules[0]!.trackId = 'other-track';
    const result = validateContent(curriculum, sampleItems());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('belongs to track'))).toBe(true);
  });

  it('rejects an option referencing an unknown misconception id', () => {
    const items = sampleItems();
    const broken = JSON.parse(JSON.stringify(items[0]));
    broken.options[0].misconception = 'nonexistent-misconception';
    const result = validateContent(sampleCurriculum(), [broken, items[1], items[2]]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('unknown misconception'))).toBe(true);
  });

  it('rejects an item referencing an unknown concept', () => {
    const items = sampleItems();
    const broken = JSON.parse(JSON.stringify(items[0]));
    broken.concept = 'nonexistent-concept';
    const result = validateContent(sampleCurriculum(), [broken, items[1], items[2]]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('references unknown concept'))).toBe(true);
  });

  it('rejects a lesson referencing an unknown item id', () => {
    const curriculum = sampleCurriculum();
    curriculum.lessons[0]!.masteryItemIds = ['nonexistent-item'];
    const result = validateContent(curriculum, sampleItems());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('references unknown item'))).toBe(true);
  });

  it('rejects malformed item shapes (e.g. fewer than two options)', () => {
    const items = sampleItems();
    const broken = JSON.parse(JSON.stringify(items[0]));
    broken.options = [broken.options[0]];
    broken.acceptableAnswers = [broken.options[0].id];
    const result = validateContent(sampleCurriculum(), [broken, items[1], items[2]]);
    expect(result.valid).toBe(false);
  });
});
