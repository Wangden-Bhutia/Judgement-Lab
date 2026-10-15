import { describe, expect, it } from 'vitest';
import { validateContent, type Curriculum, type Item, type ReasonChoiceItem, type FillInItem } from '@judgment-lab/content-schema';
import curriculum from '../../content/curriculum.json' with { type: 'json' };
import items from '../../content/items/module1.json' with { type: 'json' };

const typedCurriculum = curriculum as Curriculum;
const typedItems = items as Item[];
const itemById = new Map(typedItems.map((i) => [i.id, i]));

describe('converted Module 1 content (Strategic Reasoning)', () => {
  it('validates against the shared content schema', () => {
    const result = validateContent(typedCurriculum, typedItems);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('has all four lessons, in order, under one module and track', () => {
    expect(typedCurriculum.tracks.map((t) => t.id)).toEqual(['strategic']);
    expect(typedCurriculum.modules.map((m) => m.id)).toEqual(['strategic-m1']);
    expect(typedCurriculum.lessons.map((l) => l.id)).toEqual([
      'strategic-m1.l1',
      'strategic-m1.l2',
      'strategic-m1.l3',
      'strategic-m1.l4',
    ]);
  });

  it('gates lessons on completion of the lesson that introduced each required concept', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m1.l1')!.prerequisites).toEqual([]);
    expect(byId.get('strategic-m1.l2')!.prerequisites).toEqual(['strategic-m1.l1']);
    expect(byId.get('strategic-m1.l3')!.prerequisites).toEqual(['strategic-m1.l1']);
    expect(new Set(byId.get('strategic-m1.l4')!.prerequisites)).toEqual(
      new Set(['strategic-m1.l1', 'strategic-m1.l2'])
    );
  });

  it('concentrates mastery-tier items in the module-closing lesson, not every lesson', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m1.l1')!.masteryItemIds).toEqual([]);
    expect(byId.get('strategic-m1.l2')!.masteryItemIds).toEqual([]);
    expect(byId.get('strategic-m1.l3')!.masteryItemIds).toEqual([]);
    expect(byId.get('strategic-m1.l4')!.masteryItemIds.length).toBeGreaterThan(0);
  });

  it('the closing lesson\'s mastery items cover a concept from every earlier lesson in the module', () => {
    const l4 = typedCurriculum.lessons.find((l) => l.id === 'strategic-m1.l4')!;
    const masteryConcepts = new Set(
      l4.masteryItemIds.map((id) => {
        const item = itemById.get(id);
        if (!item) throw new Error(`missing item ${id}`);
        return item.concept;
      })
    );
    // players (l1), timing (l3), information (l3), strategic_dependence (l4 itself)
    expect(masteryConcepts.has('players')).toBe(true);
    expect(masteryConcepts.has('timing')).toBe(true);
    expect(masteryConcepts.has('information')).toBe(true);
    expect(masteryConcepts.has('strategic_dependence')).toBe(true);
  });

  it('i.m1.players: the correct option is the one naming exactly you and the other player', () => {
    const item = itemById.get('i.m1.players') as ReasonChoiceItem;
    expect(item.acceptableAnswers).toHaveLength(1);
    const correctOption = item.options.find((o) => o.id === item.acceptableAnswers[0]);
    expect(correctOption?.text).toMatch(/each of your choices changes the result/i);
    // the other two options should each carry a misconception tag, not a concept tag
    const wrongOptions = item.options.filter((o) => o.id !== item.acceptableAnswers[0]);
    expect(wrongOptions.every((o) => o.misconception !== undefined)).toBe(true);
  });

  it('i.m1.payoff: slot values are rendered from the structure\'s actual payoff table, not placeholders', () => {
    const item = itemById.get('i.m1.payoff') as FillInItem;
    expect(item.slots).toHaveLength(2);
    // m1.s.meet's a1|b1 cell is ["3","2"]: the learner's payoff is 3, the other player's is 2.
    expect(item.slots[0]!.acceptedValues).toEqual(['3']);
    expect(item.slots[1]!.acceptedValues).toEqual(['2']);
  });

  it('i.m1.words: the model answer is a real exemplar, not a restatement of the prompt', () => {
    const item = itemById.get('i.m1.words');
    expect(item?.type).toBe('own_words');
    if (item?.type === 'own_words') {
      expect(item.modelAnswer).not.toBe(item.prompt);
      expect(item.modelAnswer.length).toBeGreaterThan(20);
      expect(item.rubric.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('every reason_choice item has at least one acceptable answer that the engine actually confirmed', () => {
    for (const item of typedItems) {
      if (item.type !== 'reason_choice') continue;
      expect(item.acceptableAnswers.length).toBeGreaterThan(0);
      for (const answerId of item.acceptableAnswers) {
        const option = item.options.find((o) => o.id === answerId);
        expect(option?.conceptTag).toBeDefined();
        expect(option?.misconception).toBeUndefined();
      }
    }
  });

  it('every item carries the scenario its prompt presupposes, not just the bare question', () => {
    for (const item of typedItems) {
      expect(item.scenario, `${item.id} has no scenario`).toBeTruthy();
      expect(item.scenario!.length).toBeGreaterThan(20);
    }
  });

  it('every misconception referenced by an item option is registered with a real definition, not a placeholder', () => {
    for (const misconception of typedCurriculum.misconceptions) {
      expect(misconception.description).not.toMatch(/see Strategos's error-codes\.json/);
      expect(misconception.description.length).toBeGreaterThan(10);
    }
  });
});
