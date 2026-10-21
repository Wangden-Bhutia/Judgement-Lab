import { describe, expect, it } from 'vitest';
import { validateContent, type Curriculum, type Item, type ReasonChoiceItem } from '@judgment-lab/content-schema';
import curriculum from '../../content/curriculum.json' with { type: 'json' };
import module1Items from '../../content/items/module1.json' with { type: 'json' };
import module2Items from '../../content/items/module2.json' with { type: 'json' };
import bankDeepeningItems from '../../content/items/bank-deepening.json' with { type: 'json' };
import weeklyCheckpointItems from '../../content/items/weekly-checkpoints.json' with { type: 'json' };

const typedCurriculum = curriculum as Curriculum;
const typedItems: Item[] = [
  ...(module1Items as Item[]),
  ...(module2Items as Item[]),
  ...(bankDeepeningItems as Item[]),
  ...(weeklyCheckpointItems as Item[]),
];
const itemById = new Map(typedItems.map((i) => [i.id, i]));

const CHECKPOINT_LESSON_IDS = new Set(['behavioural-les-8', 'behavioural-les-9']);

describe('converted Behavioural Observation content (Modules 1-2)', () => {
  it('validates against the shared content schema', () => {
    const result = validateContent(typedCurriculum, typedItems);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('has 2 modules and 9 lessons, in order, under one track', () => {
    // Pass 1 of the week-based restructuring: each module gained one
    // integrative checkpoint lesson (les-8, les-9) that combines that
    // module's concepts rather than introducing a new one.
    expect(typedCurriculum.tracks.map((t) => t.id)).toEqual(['behavioural']);
    expect(typedCurriculum.modules.map((m) => m.id)).toEqual(['behavioural-mod-1', 'behavioural-mod-2']);
    expect(typedCurriculum.lessons.map((l) => l.id)).toEqual([
      'behavioural-les-1',
      'behavioural-les-2',
      'behavioural-les-3',
      'behavioural-les-8',
      'behavioural-les-4',
      'behavioural-les-5',
      'behavioural-les-6',
      'behavioural-les-7',
      'behavioural-les-9',
    ]);
  });

  it('gates lessons within module 1 linearly, module 1\'s checkpoint on all three, and module 2 on that checkpoint', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('behavioural-les-1')!.prerequisites).toEqual([]);
    expect(byId.get('behavioural-les-2')!.prerequisites).toEqual(['behavioural-les-1']);
    expect(byId.get('behavioural-les-3')!.prerequisites).toEqual(['behavioural-les-2']);
    expect(new Set(byId.get('behavioural-les-8')!.prerequisites)).toEqual(
      new Set(['behavioural-les-1', 'behavioural-les-2', 'behavioural-les-3'])
    );
    expect(byId.get('behavioural-les-4')!.prerequisites).toEqual(['behavioural-les-8']);
    expect(byId.get('behavioural-les-5')!.prerequisites).toEqual(['behavioural-les-4']);
    expect(byId.get('behavioural-les-6')!.prerequisites).toEqual(['behavioural-les-5']);
    expect(byId.get('behavioural-les-7')!.prerequisites).toEqual(['behavioural-les-6']);
    expect(new Set(byId.get('behavioural-les-9')!.prerequisites)).toEqual(
      new Set(['behavioural-les-4', 'behavioural-les-5', 'behavioural-les-6', 'behavioural-les-7'])
    );
  });

  it('every teaching lesson has its original 3 scenario items plus one deepening item, then the explain-back item, then 2 mastery items', () => {
    // interactiveItemIds deliberately lists the explain item LAST (not left
    // to LessonPlayer's own fallback, which would append it after the
    // mastery items too) -- this is what makes the played order match the
    // original app's actual stage order: interactive_learning ->
    // explanation_back -> mastery_assessment, not explanation_back last.
    for (const lesson of typedCurriculum.lessons) {
      if (CHECKPOINT_LESSON_IDS.has(lesson.id)) continue;
      // >=4: the original 3 scenario items plus explain, plus one deepening
      // item per concept the lesson teaches (les-1 teaches two concepts --
      // observation_vs_interpretation and evidence_based_inference -- so it
      // picked up two deepening items, not just one).
      expect(lesson.interactiveItemIds.length).toBeGreaterThanOrEqual(4);
      expect(lesson.interactiveItemIds.at(-1)).toBe(lesson.explanationBackItemId);
      expect(itemById.get(lesson.interactiveItemIds.at(-1)!)!.type).toBe('own_words');
      expect(lesson.masteryItemIds).toHaveLength(2);
      expect(lesson.teach?.length).toBeGreaterThan(0);
      expect(lesson.example).toBeTruthy();
      expect(lesson.explanationBackItemId).toBeDefined();
      expect(lesson.practicePrompts?.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(lesson.apply).toBeTruthy();
      expect(lesson.reflect).toBeTruthy();
    }
  });

  it('each module\'s checkpoint lesson has 4 integrative items, no explain-back item of its own, and covers all 4 of that module\'s concepts', () => {
    for (const lessonId of CHECKPOINT_LESSON_IDS) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      expect(lesson.interactiveItemIds).toHaveLength(4);
      expect(lesson.explanationBackItemId).toBeUndefined();
      expect(lesson.masteryItemIds).toHaveLength(4);
      expect(lesson.concepts).toHaveLength(4);
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
      expect(lesson.teach?.length).toBeGreaterThan(0);
      expect(lesson.example).toBeTruthy();
      expect(lesson.apply).toBeTruthy();
      expect(lesson.reflect).toBeTruthy();
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

  it('every concept here has a checkpoint item, so mastery is reachable for all of them', () => {
    // Was true from the original design (every original lesson gives its
    // own concepts 2 checkpoint items each), and the two new checkpoint
    // lessons from Pass 1 add further, more integrative checkpoint
    // evidence for every concept on top of that -- re-checked explicitly
    // after Pass 1 rather than just assumed to still hold.
    const conceptsWithCheckpointItem = new Set(
      typedCurriculum.lessons.flatMap((lesson) => lesson.masteryItemIds.map((id) => itemById.get(id)!.concept))
    );
    const allConceptIds = typedCurriculum.concepts.map((c) => c.id);
    expect(new Set(conceptsWithCheckpointItem)).toEqual(new Set(allConceptIds));
  });
});
