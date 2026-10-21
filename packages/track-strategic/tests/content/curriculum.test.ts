import { describe, expect, it } from 'vitest';
import { validateContent, type Curriculum, type Item, type ReasonChoiceItem, type FillInItem } from '@judgment-lab/content-schema';
import curriculum from '../../content/curriculum.json' with { type: 'json' };
import module1Items from '../../content/items/module1.json' with { type: 'json' };
import module2Items from '../../content/items/module2.json' with { type: 'json' };
import module3Items from '../../content/items/module3.json' with { type: 'json' };
import module4Items from '../../content/items/module4.json' with { type: 'json' };
import bankDeepeningItems from '../../content/items/bank-deepening.json' with { type: 'json' };
import weeklyCheckpointItems from '../../content/items/weekly-checkpoints.json' with { type: 'json' };
import negotiationItems from '../../content/items/negotiation.json' with { type: 'json' };
import biasesItems from '../../content/items/biases.json' with { type: 'json' };
import communicationItems from '../../content/items/communication.json' with { type: 'json' };
import capstoneItems from '../../content/items/capstone.json' with { type: 'json' };

const typedCurriculum = curriculum as Curriculum;
const typedItems: Item[] = [
  ...(module1Items as Item[]),
  ...(module2Items as Item[]),
  ...(module3Items as Item[]),
  ...(module4Items as Item[]),
  ...(bankDeepeningItems as Item[]),
  ...(weeklyCheckpointItems as Item[]),
  ...(negotiationItems as Item[]),
  ...(biasesItems as Item[]),
  ...(communicationItems as Item[]),
  ...(capstoneItems as Item[]),
];
const itemById = new Map(typedItems.map((i) => [i.id, i]));

describe('converted Strategic Reasoning content (Modules 1-9)', () => {
  it('validates against the shared content schema', () => {
    const result = validateContent(typedCurriculum, typedItems);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('has 4 modules and 20 lessons, in order, under one track', () => {
    // Pass 1 of the week-based restructuring: each module gained one
    // integrative checkpoint-day lesson (m1.l5, m2.l4, m3.l6, m4.l5) that
    // combines that module's concepts rather than introducing a new one.
    expect(typedCurriculum.tracks.map((t) => t.id)).toEqual(['strategic']);
    expect(typedCurriculum.modules.map((m) => m.id).slice(0, 4)).toEqual([
      'strategic-m1', 'strategic-m2', 'strategic-m3', 'strategic-m4',
    ]);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(0, 20)).toEqual([
      'strategic-m1.l1', 'strategic-m1.l2', 'strategic-m1.l3', 'strategic-m1.l4', 'strategic-m1.l5',
      'strategic-m2.l1', 'strategic-m2.l2', 'strategic-m2.l3', 'strategic-m2.l4',
      'strategic-m3.l1', 'strategic-m3.l2', 'strategic-m3.l3', 'strategic-m3.l4', 'strategic-m3.l5', 'strategic-m3.l6',
      'strategic-m4.l1', 'strategic-m4.l2', 'strategic-m4.l3', 'strategic-m4.l4', 'strategic-m4.l5',
    ]);
  });

  it('module 4 chains linearly off the end of module 3\'s checkpoint lesson', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m4.l1')!.prerequisites).toEqual(['strategic-m3.l6']);
    expect(byId.get('strategic-m4.l2')!.prerequisites).toEqual(['strategic-m4.l1']);
    expect(byId.get('strategic-m4.l3')!.prerequisites).toEqual(['strategic-m4.l2']);
    expect(byId.get('strategic-m4.l4')!.prerequisites).toEqual(['strategic-m4.l3']);
    expect(byId.get('strategic-m4.l5')!.prerequisites).toEqual(['strategic-m4.l4']);
  });

  it('each module\'s new checkpoint lesson requires every lesson in that module, not just the last one by number', () => {
    // Module internals branch rather than chain purely linearly (e.g. m3.l2,
    // l3 and l5 all branch directly off m3.l1), so a checkpoint lesson
    // gating "the whole week is done" has to require every lesson in the
    // module explicitly, not rely on the highest-numbered one transitively
    // covering the rest.
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(new Set(byId.get('strategic-m1.l5')!.prerequisites)).toEqual(
      new Set(['strategic-m1.l1', 'strategic-m1.l2', 'strategic-m1.l3', 'strategic-m1.l4'])
    );
    expect(new Set(byId.get('strategic-m3.l6')!.prerequisites)).toEqual(
      new Set(['strategic-m3.l1', 'strategic-m3.l2', 'strategic-m3.l3', 'strategic-m3.l4', 'strategic-m3.l5'])
    );
  });

  it('each new checkpoint lesson\'s items are each tagged with one concept but combine 2+ of that week\'s concepts in the scenario itself', () => {
    const checkpointLessonIds = ['strategic-m1.l5', 'strategic-m2.l4', 'strategic-m3.l6', 'strategic-m4.l5'];
    for (const lessonId of checkpointLessonIds) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      expect(lesson.masteryItemIds.length).toBeGreaterThanOrEqual(3);
      expect(lesson.concepts.length).toBeGreaterThanOrEqual(3);
      for (const itemId of lesson.masteryItemIds) {
        const item = itemById.get(itemId);
        expect(item?.scenario!.length).toBeGreaterThan(40);
      }
    }
  });

  it('has 3 negotiation modules (5-7) and 15 lessons, chaining off module 4\'s checkpoint', () => {
    expect(typedCurriculum.modules.map((m) => m.id).slice(4, 7)).toEqual([
      'strategic-m5', 'strategic-m6', 'strategic-m7',
    ]);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(20, 35)).toEqual([
      'strategic-m5.l1', 'strategic-m5.l2', 'strategic-m5.l3', 'strategic-m5.l4', 'strategic-m5.l5',
      'strategic-m6.l1', 'strategic-m6.l2', 'strategic-m6.l3', 'strategic-m6.l4', 'strategic-m6.l5',
      'strategic-m7.l1', 'strategic-m7.l2', 'strategic-m7.l3', 'strategic-m7.l4', 'strategic-m7.l5',
    ]);
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m5.l1')!.prerequisites).toEqual(['strategic-m4.l5']);
    expect(byId.get('strategic-m6.l1')!.prerequisites).toEqual(['strategic-m5.l5']);
    expect(byId.get('strategic-m7.l1')!.prerequisites).toEqual(['strategic-m6.l5']);
  });

  it('each negotiation week\'s checkpoint lesson requires every lesson in that week', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(new Set(byId.get('strategic-m5.l5')!.prerequisites)).toEqual(
      new Set(['strategic-m5.l1', 'strategic-m5.l2', 'strategic-m5.l3', 'strategic-m5.l4'])
    );
    expect(new Set(byId.get('strategic-m6.l5')!.prerequisites)).toEqual(
      new Set(['strategic-m6.l1', 'strategic-m6.l2', 'strategic-m6.l3', 'strategic-m6.l4'])
    );
    expect(new Set(byId.get('strategic-m7.l5')!.prerequisites)).toEqual(
      new Set(['strategic-m7.l1', 'strategic-m7.l2', 'strategic-m7.l3', 'strategic-m7.l4'])
    );
  });

  it('reservation_value is correctly derived from BATNA, not confused with a hoped-for target', () => {
    const item = itemById.get('i.neg.resv.a');
    expect(item?.type).toBe('reason_choice');
    if (item?.type === 'reason_choice') {
      const targetConfusion = item.options.find((o) => o.misconception === 'strategic-reservation_as_target');
      expect(targetConfusion).toBeDefined();
      const correct = item.options.find((o) => item.acceptableAnswers.includes(o.id));
      expect(correct?.conceptTag).toBe('reservation_value');
    }
  });

  it('has 2 bias modules (8-9) and 10 lessons, chaining off module 7\'s checkpoint', () => {
    expect(typedCurriculum.modules.map((m) => m.id).slice(7, 9)).toEqual(['strategic-m8', 'strategic-m9']);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(35, 45)).toEqual([
      'strategic-m8.l1', 'strategic-m8.l2', 'strategic-m8.l3', 'strategic-m8.l4', 'strategic-m8.l5',
      'strategic-m9.l1', 'strategic-m9.l2', 'strategic-m9.l3', 'strategic-m9.l4', 'strategic-m9.l5',
    ]);
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m8.l1')!.prerequisites).toEqual(['strategic-m7.l5']);
    expect(byId.get('strategic-m9.l1')!.prerequisites).toEqual(['strategic-m8.l5']);
  });

  it('each bias week\'s checkpoint lesson requires every lesson in that week, and each covers all 4 of that week\'s concepts (not just 3, unlike Pass 2\'s first draft)', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(new Set(byId.get('strategic-m8.l5')!.prerequisites)).toEqual(
      new Set(['strategic-m8.l1', 'strategic-m8.l2', 'strategic-m8.l3', 'strategic-m8.l4'])
    );
    expect(new Set(byId.get('strategic-m9.l5')!.prerequisites)).toEqual(
      new Set(['strategic-m9.l1', 'strategic-m9.l2', 'strategic-m9.l3', 'strategic-m9.l4'])
    );
    for (const lessonId of ['strategic-m8.l5', 'strategic-m9.l5']) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts.size).toBe(4);
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
    }
  });

  it('has 2 communication modules (10-11) and 10 lessons, chaining off module 9\'s checkpoint', () => {
    expect(typedCurriculum.modules.map((m) => m.id).slice(9, 11)).toEqual(['strategic-m10', 'strategic-m11']);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(45, 55)).toEqual([
      'strategic-m10.l1', 'strategic-m10.l2', 'strategic-m10.l3', 'strategic-m10.l4', 'strategic-m10.l5',
      'strategic-m11.l1', 'strategic-m11.l2', 'strategic-m11.l3', 'strategic-m11.l4', 'strategic-m11.l5',
    ]);
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m10.l1')!.prerequisites).toEqual(['strategic-m9.l5']);
    expect(byId.get('strategic-m11.l1')!.prerequisites).toEqual(['strategic-m10.l5']);
  });

  it('each communication week\'s checkpoint lesson requires every lesson in that week and covers all 4 of that week\'s concepts', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(new Set(byId.get('strategic-m10.l5')!.prerequisites)).toEqual(
      new Set(['strategic-m10.l1', 'strategic-m10.l2', 'strategic-m10.l3', 'strategic-m10.l4'])
    );
    expect(new Set(byId.get('strategic-m11.l5')!.prerequisites)).toEqual(
      new Set(['strategic-m11.l1', 'strategic-m11.l2', 'strategic-m11.l3', 'strategic-m11.l4'])
    );
    for (const lessonId of ['strategic-m10.l5', 'strategic-m11.l5']) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts.size).toBe(4);
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
    }
  });

  it('honest persuasion is distinguished from manipulation by truthfulness, not by whether an influence principle is used at all', () => {
    const item = itemById.get('i.comm.pers.a');
    expect(item?.type).toBe('reason_choice');
    if (item?.type === 'reason_choice') {
      const manipulationConfusion = item.options.find((o) => o.misconception === 'strategic-persuasion_as_manipulation');
      expect(manipulationConfusion).toBeDefined();
      const correct = item.options.find((o) => item.acceptableAnswers.includes(o.id));
      expect(correct?.conceptTag).toBe('persuasion_principles');
    }
  });

  it('has 1 capstone module (12) with 4 lessons, chaining linearly off module 11\'s checkpoint, introducing no new concepts', () => {
    expect(typedCurriculum.modules.map((m) => m.id).slice(11)).toEqual(['strategic-m12']);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(55)).toEqual([
      'strategic-m12.l1', 'strategic-m12.l2', 'strategic-m12.l3', 'strategic-m12.l4',
    ]);
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m12.l1')!.prerequisites).toEqual(['strategic-m11.l5']);
    expect(byId.get('strategic-m12.l2')!.prerequisites).toEqual(['strategic-m12.l1']);
    expect(byId.get('strategic-m12.l3')!.prerequisites).toEqual(['strategic-m12.l2']);
    expect(byId.get('strategic-m12.l4')!.prerequisites).toEqual(['strategic-m12.l3']);

    // The capstone draws on concepts from across the whole course rather
    // than introducing its own -- every concept its items reference must
    // already exist in the curriculum's concept list from earlier modules.
    const capstoneLessonIds = new Set(['strategic-m12.l1', 'strategic-m12.l2', 'strategic-m12.l3', 'strategic-m12.l4']);
    const allConceptIds = new Set(typedCurriculum.concepts.map((c) => c.id));
    const capstoneLessons = typedCurriculum.lessons.filter((l) => capstoneLessonIds.has(l.id));
    for (const lesson of capstoneLessons) {
      for (const conceptId of lesson.concepts) {
        expect(allConceptIds.has(conceptId), `${lesson.id} references unknown concept ${conceptId}`).toBe(true);
      }
    }
    expect(typedCurriculum.concepts).toHaveLength(46);
  });

  it('each capstone lesson\'s items draw on concepts from more than one earlier module, not just one', () => {
    const capstoneLessonIds = ['strategic-m12.l1', 'strategic-m12.l2', 'strategic-m12.l3', 'strategic-m12.l4'];
    const moduleOfConcept = new Map(typedCurriculum.concepts.map((c) => [c.id, c.moduleId]));
    for (const lessonId of capstoneLessonIds) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const itemConceptModules = new Set(
        lesson.interactiveItemIds.map((id) => moduleOfConcept.get(itemById.get(id)!.concept))
      );
      expect(itemConceptModules.size, `${lessonId}'s items should span more than one module`).toBeGreaterThan(1);
    }
  });

  it("equilibrium builds on best_response: an equilibrium item's distractor is tagged as an incomplete best-response comparison, not a fresh misconception", () => {
    const item = itemById.get('i.m4.eq.check');
    expect(item?.type).toBe('reason_choice');
    if (item?.type === 'reason_choice') {
      const incomplete = item.options.find((o) => o.misconception === 'strategic-incomplete_comparison');
      expect(incomplete).toBeDefined();
    }
  });

  it('gates lessons within a module on completion of the lesson that introduced each required concept', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m1.l1')!.prerequisites).toEqual([]);
    expect(new Set(byId.get('strategic-m1.l4')!.prerequisites)).toEqual(
      new Set(['strategic-m1.l1', 'strategic-m1.l2'])
    );
  });

  it("gates each week's first lesson on completion of the PREVIOUS week's checkpoint lesson, not individual concept lessons", () => {
    // Pass 1 superseded the old per-concept cross-module gating (m2.l1 used
    // to require m1.l2 and m1.l4 directly) with a single checkpoint-lesson
    // gate -- m1.l5 itself already requires every one of module 1's
    // lessons, so gating m2.l1 on m1.l5 alone is equivalent and makes the
    // "finish the week before starting the next one" structure explicit.
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('strategic-m2.l1')!.prerequisites).toEqual(['strategic-m1.l5']);
    expect(byId.get('strategic-m3.l1')!.prerequisites).toEqual(['strategic-m2.l4']);
    expect(byId.get('strategic-m4.l1')!.prerequisites).toEqual(['strategic-m3.l6']);
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

  it('every concept has a checkpoint item somewhere, across every module', () => {
    // Was 4 of 14 (actions, preferences, payoff, dominated_action) with no
    // checkpoint item anywhere, meaning mastery was permanently
    // unreachable for them -- core-engine's mastery model needs >=2
    // delayed-evidence attempts, and a concept with zero checkpoint items
    // can never get its first. Fixed originally for modules 1-3, and this
    // same gap resurfaced in Pass 2 (3 of the 12 new negotiation concepts
    // -- reservation_value, anchoring_negotiation, fairness_framing --
    // shipped with no checkpoint item at all until this test caught it).
    // This generic check, run against the full curriculum on every pass,
    // is what's meant to catch that class of bug going forward without
    // relying on remembering to check by hand each time.
    const conceptsWithCheckpointItem = new Set(
      typedCurriculum.lessons.flatMap((lesson) => lesson.masteryItemIds.map((id) => itemById.get(id)!.concept))
    );
    const allConceptIds = typedCurriculum.concepts.map((c) => c.id);
    const without = allConceptIds.filter((c) => !conceptsWithCheckpointItem.has(c));
    expect(without).toEqual([]);
  });

  it('every lesson now has teach, example, apply and reflect content, not just items and a post-answer explanation', () => {
    // Originally shipped discovery-first (items + explanation only, no
    // separate teaching text) -- every lesson opened cold on a graded
    // item with no explanation of the concept first, unlike Emotional
    // Skills' teach-then-practice lessons. Closed by giving all 12
    // lessons matching content.
    for (const lesson of typedCurriculum.lessons) {
      expect(lesson.teach?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(lesson.example).toBeTruthy();
      expect(lesson.practicePrompts?.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(lesson.apply).toBeTruthy();
      expect(lesson.reflect).toBeTruthy();
    }
  });
});
