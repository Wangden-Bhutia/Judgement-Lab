import { describe, expect, it } from 'vitest';
import { validateContent, type Curriculum, type Item, type ReasonChoiceItem } from '@judgment-lab/content-schema';
import curriculum from '../../content/curriculum.json' with { type: 'json' };
import items from '../../content/items/module1.json' with { type: 'json' };

const typedCurriculum = curriculum as Curriculum;
const typedItems: Item[] = items as Item[];
const itemById = new Map(typedItems.map((i) => [i.id, i]));

describe('converted Behavioural Observation content (Module 1)', () => {
  it('validates against the shared content schema', () => {
    const result = validateContent(typedCurriculum, typedItems);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('has 1 module and 3 lessons, in order, under one track', () => {
    expect(typedCurriculum.tracks.map((t) => t.id)).toEqual(['behavioural']);
    expect(typedCurriculum.modules.map((m) => m.id)).toEqual(['behavioural-mod-1']);
    expect(typedCurriculum.lessons.map((l) => l.id)).toEqual([
      'behavioural-les-1',
      'behavioural-les-2',
      'behavioural-les-3',
    ]);
  });

  it('gates lessons on completion of the previous lesson, a straight linear chain', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('behavioural-les-1')!.prerequisites).toEqual([]);
    expect(byId.get('behavioural-les-2')!.prerequisites).toEqual(['behavioural-les-1']);
    expect(byId.get('behavioural-les-3')!.prerequisites).toEqual(['behavioural-les-2']);
  });

  it('every lesson has 3 scenario items then the explain-back item, in that order, then 2 mastery items', () => {
    // interactiveItemIds deliberately lists the explain item LAST (not left
    // to LessonPlayer's own fallback, which would append it after the
    // mastery items too) -- this is what makes the played order match the
    // original app's actual stage order: interactive_learning ->
    // explanation_back -> mastery_assessment, not explanation_back last.
    for (const lesson of typedCurriculum.lessons) {
      expect(lesson.interactiveItemIds).toHaveLength(4);
      expect(lesson.interactiveItemIds.at(-1)).toBe(lesson.explanationBackItemId);
      expect(itemById.get(lesson.interactiveItemIds.at(-1)!)!.type).toBe('own_words');
      expect(lesson.masteryItemIds).toHaveLength(2);
      expect(lesson.teach?.length).toBeGreaterThan(0);
      expect(lesson.example).toBeTruthy();
      expect(lesson.explanationBackItemId).toBeDefined();
    }
  });

  it('i.beh.obs-001: the correct option is the one that sticks to what was actually observed', () => {
    const item = itemById.get('i.beh.obs-001') as ReasonChoiceItem;
    expect(item.acceptableAnswers).toEqual(['C']);
    const correct = item.options.find((o) => o.id === 'C');
    expect(correct?.text).toMatch(/behaviour changed.*but what caused it isn't established/);
    expect(correct?.conceptTag).toBe('evidence_based_inference');
    // The other 3 options all name a specific motive -- each should carry a misconception tag.
    const wrongOptions = item.options.filter((o) => o.id !== 'C');
    expect(wrongOptions.every((o) => o.misconception !== undefined)).toBe(true);
  });

  it('every reason_choice item has at least one acceptable answer, correctly tagged and misconception-free', () => {
    for (const item of typedItems) {
      if (item.type !== 'reason_choice') continue;
      expect(item.acceptableAnswers.length).toBeGreaterThan(0);
      for (const answerId of item.acceptableAnswers) {
        const option = item.options.find((o) => o.id === answerId);
        expect(option?.misconception).toBeUndefined();
      }
    }
  });

  it('every own_words explanation-back item has a model answer built from real criteria, not a restatement of its own prompt', () => {
    for (const item of typedItems) {
      if (item.type !== 'own_words') continue;
      expect(item.modelAnswer).not.toBe(item.prompt);
      expect(item.modelAnswer.length).toBeGreaterThan(20);
      expect(item.rubric.length).toBeGreaterThanOrEqual(3);
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

  it('no concept has a checkpoint item covering a different concept -- unlike Strategic Reasoning, every lesson\'s mastery items share the lesson\'s own concepts', () => {
    for (const lesson of typedCurriculum.lessons) {
      for (const id of lesson.masteryItemIds) {
        expect(lesson.concepts).toContain(itemById.get(id)!.concept);
      }
    }
  });

  it('unlike Strategic Reasoning and Emotional Skills, every concept here has >=2 checkpoint items, so mastery is reachable in a single sitting with no review flow needed', () => {
    // Each lesson has exactly 2 masteryScenarioIds and exactly 2 concepts,
    // 1:1 -- a content shape that happens to give every concept its
    // SKILL_MASTERY_MIN_ITEMS (2) worth of delayed-evidence items right
    // inside the lesson that teaches it. Worth keeping visible as a test,
    // not just a one-off observation, since it's the one track where the
    // still-open "review flow only closes the gap for concepts that get a
    // checkpoint attempt" limitation (see docs/DECISIONS.md) doesn't bite
    // at all.
    const conceptsWithCheckpointItem = new Set(
      typedCurriculum.lessons.flatMap((lesson) => lesson.masteryItemIds.map((id) => itemById.get(id)!.concept))
    );
    const allConceptIds = typedCurriculum.concepts.map((c) => c.id);
    expect(new Set(conceptsWithCheckpointItem)).toEqual(new Set(allConceptIds));
  });
});
