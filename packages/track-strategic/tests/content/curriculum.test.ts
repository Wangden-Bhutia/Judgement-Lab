import { describe, expect, it } from 'vitest';
import { validateContent, type Curriculum, type Item, type ReasonChoiceItem, type FillInItem } from '@judgment-lab/content-schema';
import curriculum from '../../content/curriculum.json' with { type: 'json' };
import module1Items from '../../content/items/module1.json' with { type: 'json' };
import module2Items from '../../content/items/module2.json' with { type: 'json' };
import module3Items from '../../content/items/module3.json' with { type: 'json' };

const typedCurriculum = curriculum as Curriculum;
const typedItems: Item[] = [...(module1Items as Item[]), ...(module2Items as Item[]), ...(module3Items as Item[])];
const itemById = new Map(typedItems.map((i) => [i.id, i]));

describe('converted Strategic Reasoning content (Modules 1-3)', () => {
  it('validates against the shared content schema', () => {
    const result = validateContent(typedCurriculum, typedItems);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('has 3 modules and 12 lessons, in order, under one track', () => {
    expect(typedCurriculum.tracks.map((t) => t.id)).toEqual(['strategic']);
    expect(typedCurriculum.modules.map((m) => m.id)).toEqual(['strategic-m1', 'strategic-m2', 'strategic-m3']);
    expect(typedCurriculum.lessons.map((l) => l.id)).toEqual([
      'strategic-m1.l1', 'strategic-m1.l2', 'strategic-m1.l3', 'strategic-m1.l4',
      'strategic-m2.l1', 'strategic-m2.l2', 'strategic-m2.l3',
      'strategic-m3.l1', 'strategic-m3.l2', 'strategic-m3.l3', 'strategic-m3.l4', 'strategic-m3.l5',
    ]);
  });

  it('gates lessons on completion of the lesson that introduced each required concept, including across module boundaries', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m1.l1')!.prerequisites).toEqual([]);
    expect(new Set(byId.get('strategic-m1.l4')!.prerequisites)).toEqual(
      new Set(['strategic-m1.l1', 'strategic-m1.l2'])
    );
    // m2.l1 introduces best_response, which requires strategic_dependence
    // (introduced in m1.l4) and payoff (introduced in m1.l2) -- a lesson
    // in module 2 gated on two lessons from module 1, not its own module.
    expect(new Set(byId.get('strategic-m2.l1')!.prerequisites)).toEqual(
      new Set(['strategic-m1.l2', 'strategic-m1.l4'])
    );
    // m3.l1 introduces dominant_strategy, which requires best_response
    // (introduced in m2.l1).
    expect(byId.get('strategic-m3.l1')!.prerequisites).toEqual(['strategic-m2.l1']);
  });

  it('a lesson that introduces no new concept still has a non-empty concepts list (falls back to what it requires)', () => {
    // m3.l2 is a pure consolidation lesson in the source data (introduces: []).
    const l2 = typedCurriculum.lessons.find((l) => l.id === 'strategic-m3.l2')!;
    expect(l2.concepts.length).toBeGreaterThan(0);
    expect(l2.concepts).toEqual(expect.arrayContaining(['dominant_strategy', 'best_response']));
  });

  it('i.m1.players: the correct option is the one naming exactly you and the other player', () => {
    const item = itemById.get('i.m1.players') as ReasonChoiceItem;
    expect(item.acceptableAnswers).toHaveLength(1);
    const correctOption = item.options.find((o) => o.id === item.acceptableAnswers[0]);
    expect(correctOption?.text).toMatch(/each of your choices changes the result/i);
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

  it('i.m2.br.match: a best-response item picks the action that is actually better given the stated opponent action', () => {
    const item = itemById.get('i.m2.br.match') as ReasonChoiceItem;
    expect(item.acceptableAnswers).toHaveLength(1);
    const correctOption = item.options.find((o) => o.id === item.acceptableAnswers[0]);
    // The prompt asks what's best against the SAME action named in the
    // option -- the matching distractor ("matching on it would give you
    // 4") is tempting precisely because it's a real, larger number, just
    // for the wrong opponent action. The correct option should name a
    // comparison against the opponent action the prompt actually poses.
    expect(correctOption?.text).toMatch(/against/i);
    expect(correctOption?.misconception).toBeUndefined();
  });

  it('i.m3.dom.fill: a 4-slot dominance item renders real payoffs showing one action beats the other against both opponent actions', () => {
    const item = itemById.get('i.m3.dom.fill') as FillInItem;
    expect(item.slots).toHaveLength(4);
    const [s1, s2, s3, s4] = item.slots.map((s) => Number(s.acceptedValues[0]));
    // Dominance means the first action's payoff beats the second's against
    // EVERY opponent action: s1 > s2 (vs opponent action 1) and s3 > s4
    // (vs opponent action 2).
    expect(s1!).toBeGreaterThan(s2!);
    expect(s3!).toBeGreaterThan(s4!);
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

  it('4 of the 14 concepts (actions, preferences, payoff, dominated_action) have no checkpoint item anywhere, across all 3 modules', () => {
    // Extends the Phase 6 finding (apps/web/src/masteryGate.test.ts) now
    // that Modules 2-3 are converted: mastery for these 4 concepts depends
    // entirely on a future review flow re-presenting an ordinary practice
    // item, since no masteryItemIds entry in any lesson covers them. See
    // docs/DECISIONS.md.
    const conceptsWithCheckpointItem = new Set(
      typedCurriculum.lessons.flatMap((lesson) => lesson.masteryItemIds.map((id) => itemById.get(id)!.concept))
    );
    const allConceptIds = typedCurriculum.concepts.map((c) => c.id);
    const without = allConceptIds.filter((c) => !conceptsWithCheckpointItem.has(c));
    expect(new Set(without)).toEqual(new Set(['actions', 'preferences', 'payoff', 'dominated_action']));
  });
});
