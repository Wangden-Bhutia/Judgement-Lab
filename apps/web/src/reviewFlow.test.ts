import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@judgment-lab/storage';
import { buildRetentionQueue, computeSkillMastery } from '@judgment-lab/core-engine';
import { recordAttempt, loadAttempts, loadReviewState } from './progress';

/**
 * Integration tests for the spaced-review flow as the app actually wires
 * it: progress.ts's recordAttempt advancing core-engine's review-state
 * schedule, and buildRetentionQueue reading it back -- the same path
 * App.tsx and ReviewSession use. Closes the gap masteryGate.test.ts
 * documents: before this, a concept could get at most 1 delayed-evidence
 * attempt ever (its one checkpoint item, answered once inside the lesson
 * that taught it), so mastery (which needs >=2) was permanently
 * unreachable for every concept. This proves a concept now actually
 * reaches the review queue after its checkpoint, and that reaches mastery.
 */
describe('review flow (integration: progress.ts + core-engine)', () => {
  it('a checkpoint attempt enters the concept into the review schedule, due 2 days later', async () => {
    const storage = new MemoryStorage();
    await recordAttempt(storage, { itemId: 'i.m1.t.players', conceptId: 'players', correct: true, source: 'checkpoint' });

    const reviewState = await loadReviewState(storage);
    const state = reviewState.get('players')!;
    expect(state.consecutiveSuccesses).toBe(1);

    const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    expect(buildRetentionQueue([state], tomorrow)).toEqual([]);
    expect(buildRetentionQueue([state], in3Days).map((q) => q.conceptId)).toEqual(['players']);
  });

  it('a first-pass lesson attempt never enters the review schedule at all', async () => {
    const storage = new MemoryStorage();
    await recordAttempt(storage, { itemId: 'i.m1.players', conceptId: 'players', correct: true, source: 'lesson' });

    const reviewState = await loadReviewState(storage);
    expect(reviewState.has('players')).toBe(false);
  });

  it('answering a review (once due) both advances the schedule and completes mastery', async () => {
    const storage = new MemoryStorage();
    const now = new Date();

    await recordAttempt(storage, { itemId: 'i.m1.t.players', conceptId: 'players', correct: true, source: 'checkpoint' });
    await recordAttempt(storage, { itemId: 'i.m1.players', conceptId: 'players', correct: true, source: 'review' });

    const reviewState = await loadReviewState(storage);
    const state = reviewState.get('players')!;
    expect(state.consecutiveSuccesses).toBe(2);
    // Second success -> 7-day interval, not 2.
    const daysOut = Math.round((new Date(state.nextReviewAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    expect(daysOut).toBe(7);

    const attempts = await loadAttempts(storage);
    const mastery = computeSkillMastery('players', attempts);
    expect(mastery.itemsSeen).toBe(2);
    expect(mastery.mastered).toBe(true);
  });

  it('a missed review resets the schedule to 2 days, and does not complete mastery on its own', async () => {
    const storage = new MemoryStorage();
    const now = new Date();
    await recordAttempt(storage, { itemId: 'i.m1.t.players', conceptId: 'players', correct: true, source: 'checkpoint' });
    await recordAttempt(storage, { itemId: 'i.m1.players', conceptId: 'players', correct: false, source: 'review' });

    const reviewState = await loadReviewState(storage);
    const state = reviewState.get('players')!;
    expect(state.consecutiveSuccesses).toBe(0);
    const daysOut = Math.round((new Date(state.nextReviewAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    expect(daysOut).toBe(2);

    const attempts = await loadAttempts(storage);
    const mastery = computeSkillMastery('players', attempts);
    // 2 items seen (both delayed-evidence), but only 1/2 correct -- below
    // the 80% threshold.
    expect(mastery.itemsSeen).toBe(2);
    expect(mastery.mastered).toBe(false);
  });
});
