import { describe, expect, it } from 'vitest';
import {
  buildRetentionQueue,
  nextRetentionIntervalDays,
  scheduleNextReview,
  updateReviewState,
} from '../src/revision';

describe('nextRetentionIntervalDays', () => {
  it('follows the 2/7/21-day schedule', () => {
    expect(nextRetentionIntervalDays(0)).toBe(2);
    expect(nextRetentionIntervalDays(1)).toBe(7);
    expect(nextRetentionIntervalDays(2)).toBe(21);
  });

  it('caps at the longest interval', () => {
    expect(nextRetentionIntervalDays(99)).toBe(21);
  });
});

describe('scheduleNextReview', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('schedules 2 days out for a fresh streak', () => {
    const next = scheduleNextReview(0, false, now);
    expect(next.getTime() - now.getTime()).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it('schedules a longer interval for a longer success streak', () => {
    const next = scheduleNextReview(2, false, now);
    expect(next.getTime() - now.getTime()).toBe(21 * 24 * 60 * 60 * 1000);
  });

  it('a miss resets to the 2-day interval regardless of prior streak', () => {
    const next = scheduleNextReview(2, true, now);
    expect(next.getTime() - now.getTime()).toBe(2 * 24 * 60 * 60 * 1000);
  });
});

describe('buildRetentionQueue', () => {
  it('includes only due concepts, earliest due first', () => {
    const now = new Date('2026-01-10T00:00:00.000Z');
    const items = [
      { conceptId: 'c-not-due', nextReviewAt: '2026-02-01T00:00:00.000Z' },
      { conceptId: 'c-due-later', nextReviewAt: '2026-01-08T00:00:00.000Z' },
      { conceptId: 'c-due-earlier', nextReviewAt: '2026-01-05T00:00:00.000Z' },
      { conceptId: 'c-never-scheduled', nextReviewAt: null },
    ];
    const queue = buildRetentionQueue(items, now);
    expect(queue.map((q) => q.conceptId)).toEqual(['c-due-earlier', 'c-due-later']);
  });
});

describe('updateReviewState', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('a fresh concept entering the schedule for the first time (first checkpoint attempt) lands on the 2-day interval, even on success', () => {
    const state = updateReviewState(undefined, 'c1', true, now);
    expect(state.consecutiveSuccesses).toBe(1);
    expect(new Date(state.nextReviewAt).getTime() - now.getTime()).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it('a second consecutive success lengthens the interval to 7 days', () => {
    const first = updateReviewState(undefined, 'c1', true, now);
    const second = updateReviewState(first, 'c1', true, now);
    expect(second.consecutiveSuccesses).toBe(2);
    expect(new Date(second.nextReviewAt).getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('a third consecutive success lengthens the interval to 21 days', () => {
    let state = updateReviewState(undefined, 'c1', true, now);
    state = updateReviewState(state, 'c1', true, now);
    state = updateReviewState(state, 'c1', true, now);
    expect(state.consecutiveSuccesses).toBe(3);
    expect(new Date(state.nextReviewAt).getTime() - now.getTime()).toBe(21 * 24 * 60 * 60 * 1000);
  });

  it('a miss resets the streak and the interval to 2 days, however long the prior streak was', () => {
    let state = updateReviewState(undefined, 'c1', true, now);
    state = updateReviewState(state, 'c1', true, now);
    state = updateReviewState(state, 'c1', false, now);
    expect(state.consecutiveSuccesses).toBe(0);
    expect(new Date(state.nextReviewAt).getTime() - now.getTime()).toBe(2 * 24 * 60 * 60 * 1000);
  });
});
