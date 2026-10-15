import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '@judgment-lab/storage';
import {
  computeSkillMastery,
  SKILL_MASTERY_MIN_ITEMS,
  SKILL_MASTERY_THRESHOLD,
} from '@judgment-lab/core-engine';
import { strategicCurriculum, strategicItems } from '@judgment-lab/track-strategic/content';
import { loadAttempts, recordAttempt } from './progress';

/**
 * Integration tests for the mastery gate as the app actually exercises it:
 * progress.ts's recordAttempt feeding core-engine's computeSkillMastery,
 * using the real Module 1 content (not synthetic fixtures), the same path
 * LessonPlayer and TodayScreen use. Unlike core-engine's own unit tests,
 * these catch content/wiring mismatches that pure-function tests can't see.
 */
describe('mastery gate (integration: progress.ts + core-engine + real content)', () => {
  it('first-pass lesson attempts never count toward skill mastery, however many there are', async () => {
    const storage = new MemoryStorage();
    await recordAttempt(storage, { itemId: 'i.m1.players', conceptId: 'players', correct: true, source: 'lesson' });
    await recordAttempt(storage, { itemId: 'i.m1.players.three', conceptId: 'players', correct: true, source: 'lesson' });

    const attempts = await loadAttempts(storage);
    const result = computeSkillMastery('players', attempts);

    expect(result.itemsSeen).toBe(0);
    expect(result.mastered).toBe(false);
  });

  it('a single checkpoint attempt is evidence, but not enough on its own to reach mastery', async () => {
    const storage = new MemoryStorage();
    await recordAttempt(storage, { itemId: 'i.m1.t.players', conceptId: 'players', correct: true, source: 'checkpoint' });

    const attempts = await loadAttempts(storage);
    const result = computeSkillMastery('players', attempts);

    expect(result.itemsSeen).toBe(1);
    expect(result.itemsSeen).toBeLessThan(SKILL_MASTERY_MIN_ITEMS);
    expect(result.mastered).toBe(false);
  });

  it('a second delayed-evidence attempt (from a review, re-presenting an earlier item) completes mastery', async () => {
    const storage = new MemoryStorage();
    await recordAttempt(storage, { itemId: 'i.m1.t.players', conceptId: 'players', correct: true, source: 'checkpoint' });
    // A spaced review re-presents an item the learner already saw at lesson
    // time -- it's the SOURCE that makes an attempt count, not whether the
    // item is tagged as a lesson's masteryItemIds.
    await recordAttempt(storage, { itemId: 'i.m1.players', conceptId: 'players', correct: true, source: 'review' });

    const attempts = await loadAttempts(storage);
    const result = computeSkillMastery('players', attempts);

    expect(result.itemsSeen).toBe(2);
    expect(result.accuracy).toBeGreaterThanOrEqual(SKILL_MASTERY_THRESHOLD);
    expect(result.mastered).toBe(true);
  });

  it('a later correct review attempt supersedes an earlier wrong one on the same item (latest attempt only)', async () => {
    const storage = new MemoryStorage();
    await recordAttempt(storage, { itemId: 'i.m1.t.players', conceptId: 'players', correct: false, source: 'checkpoint' });
    await recordAttempt(storage, { itemId: 'i.m1.t.players', conceptId: 'players', correct: true, source: 'review' });
    await recordAttempt(storage, { itemId: 'i.m1.players', conceptId: 'players', correct: true, source: 'review' });

    const attempts = await loadAttempts(storage);
    const result = computeSkillMastery('players', attempts);

    expect(result.itemsSeen).toBe(2);
    expect(result.accuracy).toBe(1);
    expect(result.mastered).toBe(true);
  });

  it('some concepts have no checkpoint item anywhere, so mastery for them is still out of reach even with the review flow built', () => {
    // Strategos's own source data doesn't write a transfer/recognition item
    // for every concept -- a real content gap, not a conversion bug. The
    // review flow (reviewFlow.test.ts, ReviewSession.tsx) now closes the
    // gap for concepts that get at least one checkpoint attempt: that
    // attempt enters them into core-engine's spaced schedule, and a later
    // review attempt (source 'review') supplies the second delayed-
    // evidence item mastery needs. But entry into that schedule currently
    // only happens via a checkpoint/review-source attempt (see
    // progress.ts's recordAttempt) -- a concept with NO checkpoint item at
    // all never gets a first one, so it can never enter the schedule in
    // the first place. Closing that remaining gap (e.g. seeding review
    // state from lesson completion instead) is a deliberate follow-up, not
    // done here. The exact, currently-affected concept list is asserted
    // precisely in track-strategic's own content tests
    // (tests/content/curriculum.test.ts); this test only checks the
    // general property holds for the content apps/web ships.
    const itemById = new Map(strategicItems.map((item) => [item.id, item]));
    const conceptsWithCheckpointItem = new Set(
      strategicCurriculum.lessons.flatMap((lesson) =>
        lesson.masteryItemIds.map((itemId) => itemById.get(itemId)!.concept)
      )
    );
    const allConceptIds = strategicCurriculum.concepts.map((c) => c.id);
    const conceptsWithoutCheckpointItem = allConceptIds.filter((c) => !conceptsWithCheckpointItem.has(c));

    expect(conceptsWithoutCheckpointItem.length).toBeGreaterThan(0);
  });
});
