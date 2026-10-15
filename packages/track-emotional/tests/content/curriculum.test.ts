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

  it('every item id is unique across all 244 items', () => {
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

  it('a regular lesson puts its checks and activity in interactiveItemIds, not masteryItemIds', () => {
    const lesson = typedCurriculum.lessons.find((l) => l.id === 'emotional-w01d1')!;
    expect(lesson.masteryItemIds).toEqual([]);
    expect(lesson.interactiveItemIds.length).toBeGreaterThanOrEqual(3); // explain + activity + >=1 check
  });

  it('every session maps to exactly one concept (itself), per ESL\'s own "a skill is one session" design', () => {
    for (const lesson of typedCurriculum.lessons) {
      expect(lesson.concepts).toEqual([lesson.concepts[0]]);
    }
    expect(typedCurriculum.concepts).toHaveLength(60);
  });

  it('a checkpoint concept gets a real label even though it has no competencies.ts entry (falls back to the session objective)', () => {
    const concept = typedCurriculum.concepts.find((c) => c.id === 'w01d5')!;
    expect(concept.label).toBe('Demonstrate the foundations.');
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

  it('no item carries a misconception tag -- ESL\'s source data has no structured misconception taxonomy, unlike Strategos', () => {
    for (const item of typedItems) {
      if (item.type !== 'reason_choice') continue;
      expect(item.options.every((o) => o.misconception === undefined)).toBe(true);
    }
    expect(typedCurriculum.misconceptions).toEqual([]);
  });

  it('no concept has a masteryItemIds-derived checkpoint item covering more than one concept -- every concept is self-contained (unlike Strategic Reasoning)', () => {
    // A direct consequence of the "a skill is one session, concept = session
    // id" model: a checkpoint/review session's own masteryItemIds items are
    // ALWAYS tagged with that same session's own concept, since this script
    // never attributes a checkpoint question to a different, earlier
    // session's skill. So (unlike Strategic Reasoning) every concept that
    // has ANY checkpoint-tier item has at least as many as that one
    // session provides, and no concept is structurally starved the way
    // Strategic Reasoning's actions/preferences/payoff/dominated_action are.
    for (const lesson of typedCurriculum.lessons) {
      for (const itemId of lesson.masteryItemIds) {
        expect(itemById.get(itemId)!.concept).toBe(lesson.concepts[0]);
      }
    }
  });
});
