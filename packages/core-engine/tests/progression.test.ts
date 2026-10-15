import { describe, expect, it } from 'vitest';
import { deriveLessonStatus, isLessonUnlocked, LessonProgressState } from '../src/progression';
import { Lesson } from '@judgment-lab/content-schema';

function lesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'l2',
    trackId: 't1',
    moduleId: 'm1',
    sequence: 2,
    title: 'Lesson 2',
    objectives: ['obj'],
    concepts: ['c1'],
    prerequisites: ['l1'],
    interactiveItemIds: [],
    masteryItemIds: ['item1'],
    contentVersion: 1,
    ...overrides,
  };
}

describe('isLessonUnlocked / deriveLessonStatus', () => {
  it('a lesson with no prerequisites is always unlocked', () => {
    const noPrereqLesson = lesson({ prerequisites: [] });
    expect(isLessonUnlocked(noPrereqLesson, new Map())).toBe(true);
  });

  it('is locked while the prerequisite lesson is only in_progress (attempted, not completed)', () => {
    const progress = new Map<string, LessonProgressState>([
      ['l1', { lessonId: 'l1', attemptsCount: 1, lastAttemptAt: '2026-01-01', completedAt: null }],
    ]);
    expect(isLessonUnlocked(lesson(), progress)).toBe(false);
    expect(deriveLessonStatus(lesson(), progress)).toBe('locked');
  });

  it('unlocks once the prerequisite lesson is COMPLETED, without requiring it to be mastered', () => {
    const progress = new Map<string, LessonProgressState>([
      ['l1', { lessonId: 'l1', attemptsCount: 1, lastAttemptAt: '2026-01-01', completedAt: '2026-01-01' }],
    ]);
    expect(isLessonUnlocked(lesson(), progress)).toBe(true);
    expect(deriveLessonStatus(lesson(), progress)).toBe('available');
  });

  it('is in_progress once attempted but not yet completed itself', () => {
    const progress = new Map<string, LessonProgressState>([
      ['l1', { lessonId: 'l1', attemptsCount: 1, lastAttemptAt: '2026-01-01', completedAt: '2026-01-01' }],
      ['l2', { lessonId: 'l2', attemptsCount: 1, lastAttemptAt: '2026-01-02', completedAt: null }],
    ]);
    expect(deriveLessonStatus(lesson(), progress)).toBe('in_progress');
  });

  it('is completed once its own completedAt is set', () => {
    const progress = new Map<string, LessonProgressState>([
      ['l1', { lessonId: 'l1', attemptsCount: 1, lastAttemptAt: '2026-01-01', completedAt: '2026-01-01' }],
      ['l2', { lessonId: 'l2', attemptsCount: 3, lastAttemptAt: '2026-01-03', completedAt: '2026-01-03' }],
    ]);
    expect(deriveLessonStatus(lesson(), progress)).toBe('completed');
  });
});
