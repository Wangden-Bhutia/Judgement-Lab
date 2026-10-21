import { describe, expect, it } from 'vitest';
import {
  validateContent,
  type Curriculum,
  type Item,
  type ReasonChoiceItem,
  type SequenceItem,
  type MatchItem,
  type ClassifyItem,
} from '@judgment-lab/content-schema';
import curriculum from '../../content/curriculum.json' with { type: 'json' };
import items from '../../content/items/sessions.json' with { type: 'json' };

const typedCurriculum = curriculum as Curriculum;
const typedItems: Item[] = items as Item[];
const itemById = new Map(typedItems.map((i) => [i.id, i]));

const CHECKPOINT_LESSON_IDS = new Set(
  Array.from({ length: 12 }, (_, i) => `emotional-w${String(i + 1).padStart(2, '0')}d5`)
);

describe('converted Emotional Skills content (60-session curriculum)', () => {
  it('validates against the shared content schema', () => {
    const result = validateContent(typedCurriculum, typedItems);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('has 9 phases (modules) totalling 60 sessions (lessons)', () => {
    expect(typedCurriculum.tracks.map((t) => t.id)).toEqual(['emotional']);
    expect(typedCurriculum.modules).toHaveLength(9);
    expect(typedCurriculum.lessons).toHaveLength(60);
    // Phases 4, 7 and 8 span 2 weeks (10 sessions each); the rest span 1 (5 each).
    const lessonCountByModule = new Map(
      typedCurriculum.modules.map((m) => [m.id, typedCurriculum.lessons.filter((l) => l.moduleId === m.id).length])
    );
    expect(lessonCountByModule.get('emotional-p4')).toBe(10);
    expect(lessonCountByModule.get('emotional-p7')).toBe(10);
    expect(lessonCountByModule.get('emotional-p8')).toBe(10);
    expect(lessonCountByModule.get('emotional-p1')).toBe(5);
  });

  it('every item id is unique across all 259 items', () => {
    // 244 original items, minus the 33 old per-concept checkpoint questions
    // removed by the checkpoint rework, plus the 48 new integrative ones
    // (4 per week x 12 weeks) that replaced them.
    expect(typedItems).toHaveLength(259);
    const ids = typedItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chains sessions linearly, including across a phase boundary', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('emotional-w01d1')!.prerequisites).toEqual([]);
    expect(byId.get('emotional-w01d2')!.prerequisites).toEqual(['emotional-w01d1']);
    // w02d1 (phase 2) follows w01d5 (phase 1) -- the very first cross-module link.
    expect(byId.get('emotional-w02d1')!.prerequisites).toEqual(['emotional-w01d5']);
  });

  it('a checkpoint/review session has no interactive activity, puts all its checks in masteryItemIds, and still has an explanation-back item', () => {
    const checkpoint = typedCurriculum.lessons.find((l) => l.id === 'emotional-w01d5')!;
    expect(checkpoint.masteryItemIds.length).toBeGreaterThan(0);
    const hasActivity = checkpoint.interactiveItemIds.some((id) => itemById.get(id)?.id.endsWith('.activity'));
    expect(hasActivity).toBe(false);
    expect(checkpoint.explanationBackItemId).toBeDefined();

    const review = typedCurriculum.lessons.find((l) => l.id === 'emotional-w04d5')!;
    expect(review.masteryItemIds.length).toBeGreaterThan(0);
  });

  it('a regular lesson gives its own concept every one of its own checks as a checkpoint item, not just one', () => {
    // Originally a regular (non-d5) lesson left masteryItemIds empty
    // entirely, on the theory that the weekly checkpoint/review session
    // (d5) was where delayed evidence came from. But d5's own items are
    // tagged with d5's own concept, never with the week's d1-d4 concepts
    // -- so d1-d4 concepts had no path to a checkpoint attempt at all,
    // and so could never enter the spaced-review schedule or reach
    // mastery, ever (core-engine/mastery.ts needs >=2 delayed-evidence
    // attempts). First fixed by pointing each regular lesson's
    // masteryItemIds at just one of its own already-authored checks.
    // That satisfied the >=2-items floor only by replaying the SAME single
    // question on both the in-lesson pass and spaced review -- weak
    // evidence, since getting one specific Q&A right twice isn't the same
    // as being able to apply the concept generally. Every regular lesson
    // already had a second, different check authored (some have a third);
    // using all of them as checkpoint-tier, instead of just the first, is
    // the same "point at already-authored content" fix taken the rest of
    // the way, matching Strategic/Behavioural Observation's 2-per-lesson
    // convention.
    const lesson = typedCurriculum.lessons.find((l) => l.id === 'emotional-w01d1')!;
    expect(lesson.masteryItemIds.length).toBeGreaterThanOrEqual(2);
    for (const itemId of lesson.masteryItemIds) {
      expect(lesson.interactiveItemIds).toContain(itemId);
      expect(itemById.get(itemId)?.concept).toBe(lesson.concepts[0]);
    }
    expect(lesson.interactiveItemIds.length).toBeGreaterThanOrEqual(4); // activity + >=2 checks + explain
  });

  it('every regular lesson\'s masteryItemIds are exactly its own non-activity, non-explain checks -- none skipped, none foreign', () => {
    for (const lesson of typedCurriculum.lessons) {
      if (CHECKPOINT_LESSON_IDS.has(lesson.id)) continue;
      const ownChecks = lesson.interactiveItemIds.filter(
        (id) => id !== lesson.explanationBackItemId && !id.endsWith('.activity')
      );
      expect(lesson.masteryItemIds).toEqual(ownChecks);
      expect(lesson.masteryItemIds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every lesson gives its own concept at least one checkpoint item -- no concept is permanently unmasterable', () => {
    for (const lesson of typedCurriculum.lessons) {
      expect(lesson.masteryItemIds.length).toBeGreaterThan(0);
    }
  });

  it('the explain-back item is LAST in interactiveItemIds, matching ESL\'s own layer order (activity/checks, then explanation-back)', () => {
    // Regression test: an earlier version of this script listed it FIRST,
    // which made LessonPlayer present it before the learner had done any
    // of the lesson's own activity or checks -- inverting ESL's own
    // types.ts comment ("Layer 1 activity... Layer 2 explanation-back").
    for (const lesson of typedCurriculum.lessons) {
      expect(lesson.interactiveItemIds.at(-1)).toBe(lesson.explanationBackItemId);
    }
  });

  it('every regular session maps to exactly one concept (itself); a checkpoint maps to its own week\'s 4 real concepts', () => {
    // Originally every checkpoint/review session (d5) was tagged with its
    // own synthetic placeholder concept (e.g. "w01d5"), never with the
    // week's own d1-d4 concepts -- so even perfect per-lesson mastery never
    // produced a single piece of evidence that the week's 4 skills could
    // be combined, which is the whole point of a checkpoint. Reworked to
    // match Strategic/Behavioural Observation's checkpoint convention:
    // the 12 placeholder concepts are gone (60 -> 48), and each checkpoint
    // now carries its own week's 4 real concept ids instead.
    for (const lesson of typedCurriculum.lessons) {
      if (CHECKPOINT_LESSON_IDS.has(lesson.id)) continue;
      expect(lesson.concepts).toEqual([lesson.concepts[0]]);
    }
    for (const lessonId of CHECKPOINT_LESSON_IDS) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const week = lessonId.replace('emotional-', '').replace('d5', '');
      expect(lesson.concepts).toEqual([`${week}d1`, `${week}d2`, `${week}d3`, `${week}d4`]);
    }
    expect(typedCurriculum.concepts).toHaveLength(48);
  });

  it('i.emo.w01d1.activity: a match activity pairs emotions with the right information they carry, with real per-pair feedback folded into one explanation', () => {
    const item = itemById.get('i.emo.w01d1.activity') as MatchItem;
    expect(item.correctPairs).toHaveLength(4);
    const angerId = item.left.find((l) => l.label === 'Anger')!.id;
    const correctRightId = item.correctPairs.find((p) => p.leftId === angerId)!.rightId;
    expect(item.right.find((r) => r.id === correctRightId)!.label).toMatch(/obstacle|unfair/i);
  });

  it('i.emo.w01d2.activity: a sequence activity lists the emotion-chain steps in their genuinely correct order', () => {
    const item = itemById.get('i.emo.w01d2.activity') as SequenceItem;
    expect(item.steps.map((s) => s.label)[0]).toMatch(/^Situation/);
    expect(item.steps.map((s) => s.label).at(-1)).toMatch(/^Outcome/);
    expect(item.correctOrder).toEqual(item.steps.map((s) => s.id));
  });

  it('i.emo.w01d3.activity: a classify activity sorts real examples into habitual-suppression vs flexible-regulation correctly', () => {
    const item = itemById.get('i.emo.w01d3.activity') as ClassifyItem;
    const neverTelling = item.entries.find((e) => e.label.includes('Never telling'))!;
    const suppressionCategoryId = item.categories.find((c) => c.label === 'Habitual suppression')!.id;
    expect(neverTelling.categoryId).toBe(suppressionCategoryId);
  });

  it('i.emo.w01d4.activity: a predict/compare activity converts to reason_choice (not PredictItem/CompareItem), with the genuinely good option marked correct', () => {
    const item = itemById.get('i.emo.w01d4.activity') as ReasonChoiceItem;
    expect(item.type).toBe('reason_choice');
    expect(item.acceptableAnswers).toHaveLength(1);
    const correct = item.options.find((o) => o.id === item.acceptableAnswers[0]);
    expect(correct?.text).toMatch(/retrieval and spacing|quiz himself/i);
  });

  it('every own_words explanation-back item has a model answer built from real key points, not a restatement of its own prompt', () => {
    for (const item of typedItems) {
      if (item.type !== 'own_words') continue;
      expect(item.modelAnswer).not.toBe(item.prompt);
      expect(item.modelAnswer.length).toBeGreaterThan(20);
      expect(item.rubric.length).toBeGreaterThan(0);
    }
  });

  it('every wrong reason_choice option carries a misconception tag, one per concept, matching Strategic/BO\'s density', () => {
    // ESL's source data originally had no structured misconception
    // taxonomy, unlike Strategos -- so a wrong answer only ever showed the
    // item's static explanation, never a named reasoning error, unlike the
    // other two tracks (FeedbackBody.tsx reads evaluation.misconceptions
    // to show that extra line, but ESL never populated it). Closed the gap
    // with one misconception per real concept (48 total, reusing the same
    // id across every item that teaches that concept), designed from the
    // actual wrong-option text already written for each concept, not
    // generically guessed.
    expect(typedCurriculum.misconceptions).toHaveLength(48);
    for (const item of typedItems) {
      if (item.type !== 'reason_choice') continue;
      for (const option of item.options) {
        const isCorrect = item.acceptableAnswers.includes(option.id);
        if (isCorrect) {
          expect(option.misconception).toBeUndefined();
        } else {
          expect(option.misconception).toBe(`emotional-mc-${item.concept}`);
        }
      }
    }
  });

  it('every misconception referenced by an item option is registered with a real (non-empty) description', () => {
    const referencedIds = new Set(
      typedItems.flatMap((i) => (i.type === 'reason_choice' ? i.options.map((o) => o.misconception) : []))
    );
    for (const id of referencedIds) {
      if (!id) continue;
      const misconception = typedCurriculum.misconceptions.find((m) => m.id === id);
      expect(misconception, `misconception "${id}" is referenced but not registered`).toBeDefined();
      expect(misconception!.description.length).toBeGreaterThan(10);
    }
  });

  it('every session carries its teaching prose, apply task and reflect prompt -- not just its items', () => {
    // Regression test for a real gap: an earlier version of this script
    // ported only the assessment layer (checks/activity/explain), silently
    // dropping session.teach/apply/reflect. ESL's own distractors.ts says
    // its wrong-answer choices are written "so that an item can only be
    // answered reliably by someone who understood the lesson" -- which
    // only holds if the lesson's teaching prose actually reaches the
    // learner. Every one of ESL's 60 sessions has these fields (checked
    // directly against esl-source/sessions.ts and enrich.ts), so every
    // converted lesson must too.
    for (const lesson of typedCurriculum.lessons) {
      expect(lesson.teach?.length, `${lesson.id} has no teach`).toBeGreaterThan(0);
      expect(lesson.practicePrompts?.length, `${lesson.id} has no practicePrompts`).toBeGreaterThan(0);
      expect(lesson.apply, `${lesson.id} has no apply`).toBeTruthy();
      expect(lesson.reflect, `${lesson.id} has no reflect`).toBeTruthy();
    }
  });

  it('i.emo.w01d1\'s lesson teaches the exact idea its own activity and checks assume the learner already knows', () => {
    const lesson = typedCurriculum.lessons.find((l) => l.id === 'emotional-w01d1')!;
    expect(lesson.teach!.join(' ')).toMatch(/signal/i);
    expect(lesson.example).toBeTruthy();
    expect(lesson.apply).toMatch(/notice|ask/i);
  });

  it('a regular lesson\'s mastery item is tagged to its own single concept; a checkpoint\'s 4 mastery items cover its own week\'s 4 real concepts', () => {
    for (const lesson of typedCurriculum.lessons) {
      if (CHECKPOINT_LESSON_IDS.has(lesson.id)) continue;
      for (const itemId of lesson.masteryItemIds) {
        expect(itemById.get(itemId)!.concept).toBe(lesson.concepts[0]);
      }
    }
    for (const lessonId of CHECKPOINT_LESSON_IDS) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      expect(lesson.masteryItemIds).toHaveLength(4);
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts.size).toBe(4);
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
    }
  });

  it('every concept still has at least one checkpoint-tier item, so mastery is reachable for all 48', () => {
    // Re-checked explicitly after the checkpoint rework, rather than
    // assumed to still hold: each of the 48 real concepts now actually
    // gets 2 checkpoint-tier items -- one from its own lesson (unchanged)
    // and one from its week's reworked checkpoint -- rather than 1.
    const conceptsWithCheckpointItem = new Set(
      typedCurriculum.lessons.flatMap((lesson) => lesson.masteryItemIds.map((id) => itemById.get(id)!.concept))
    );
    expect(conceptsWithCheckpointItem).toEqual(new Set(typedCurriculum.concepts.map((c) => c.id)));
  });

  it('a checkpoint lesson still has no interactive activity and its explain item is retagged off the removed placeholder concept', () => {
    for (const lessonId of CHECKPOINT_LESSON_IDS) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const hasActivity = lesson.interactiveItemIds.some((id) => itemById.get(id)?.id.endsWith('.activity'));
      expect(hasActivity).toBe(false);
      expect(lesson.interactiveItemIds.at(-1)).toBe(lesson.explanationBackItemId);
      const explainConcept = itemById.get(lesson.explanationBackItemId!)!.concept;
      expect(lesson.concepts).toContain(explainConcept);
    }
  });
});
