import { describe, expect, it } from 'vitest';
import { validateContent, type Curriculum, type Item, type ReasonChoiceItem } from '@judgment-lab/content-schema';
import curriculum from '../../content/curriculum.json' with { type: 'json' };
import module1Items from '../../content/items/module1.json' with { type: 'json' };
import module2Items from '../../content/items/module2.json' with { type: 'json' };
import bankDeepeningItems from '../../content/items/bank-deepening.json' with { type: 'json' };
import weeklyCheckpointItems from '../../content/items/weekly-checkpoints.json' with { type: 'json' };
import signalsItems from '../../content/items/signals.json' with { type: 'json' };
import listeningItems from '../../content/items/listening.json' with { type: 'json' };
import feedbackItems from '../../content/items/feedback.json' with { type: 'json' };
import perspectiveItems from '../../content/items/perspective.json' with { type: 'json' };

const typedCurriculum = curriculum as Curriculum;
const typedItems: Item[] = [
  ...(module1Items as Item[]),
  ...(module2Items as Item[]),
  ...(bankDeepeningItems as Item[]),
  ...(weeklyCheckpointItems as Item[]),
  ...(signalsItems as Item[]),
  ...(listeningItems as Item[]),
  ...(feedbackItems as Item[]),
  ...(perspectiveItems as Item[]),
];
const itemById = new Map(typedItems.map((i) => [i.id, i]));

const CHECKPOINT_LESSON_IDS = new Set([
  'behavioural-les-8',
  'behavioural-les-9',
  'behavioural-les-14',
  'behavioural-les-19',
  'behavioural-les-24',
  'behavioural-les-29',
  'behavioural-les-34',
  'behavioural-les-39',
  'behavioural-les-44',
  'behavioural-les-49',
]);

describe('converted Behavioural Observation content (Modules 1-10)', () => {
  it('validates against the shared content schema', () => {
    const result = validateContent(typedCurriculum, typedItems);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('has 2 modules and 9 lessons in modules 1-2, in order, under one track', () => {
    // Pass 1 of the week-based restructuring: each module gained one
    // integrative checkpoint lesson (les-8, les-9) that combines that
    // module's concepts rather than introducing a new one.
    expect(typedCurriculum.tracks.map((t) => t.id)).toEqual(['behavioural']);
    expect(typedCurriculum.modules.map((m) => m.id).slice(0, 2)).toEqual(['behavioural-mod-1', 'behavioural-mod-2']);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(0, 9)).toEqual([
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

  it('has 2 more modules (3-4) and 10 more lessons for Reading Signals, chaining off module 2\'s checkpoint', () => {
    expect(typedCurriculum.modules.map((m) => m.id).slice(2, 4)).toEqual(['behavioural-mod-3', 'behavioural-mod-4']);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(9, 19)).toEqual([
      'behavioural-les-10', 'behavioural-les-11', 'behavioural-les-12', 'behavioural-les-13', 'behavioural-les-14',
      'behavioural-les-15', 'behavioural-les-16', 'behavioural-les-17', 'behavioural-les-18', 'behavioural-les-19',
    ]);
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('behavioural-les-10')!.prerequisites).toEqual(['behavioural-les-9']);
    expect(byId.get('behavioural-les-15')!.prerequisites).toEqual(['behavioural-les-14']);
  });

  it('each signals-module checkpoint lesson requires every lesson in that module and covers all 4 of its concepts', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(new Set(byId.get('behavioural-les-14')!.prerequisites)).toEqual(
      new Set(['behavioural-les-10', 'behavioural-les-11', 'behavioural-les-12', 'behavioural-les-13'])
    );
    expect(new Set(byId.get('behavioural-les-19')!.prerequisites)).toEqual(
      new Set(['behavioural-les-15', 'behavioural-les-16', 'behavioural-les-17', 'behavioural-les-18'])
    );
    for (const lessonId of ['behavioural-les-14', 'behavioural-les-19']) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts.size).toBe(4);
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
    }
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

  it('has 2 more modules (5-6) and 10 more lessons for Listening, chaining off module 4\'s checkpoint', () => {
    expect(typedCurriculum.modules.map((m) => m.id).slice(4, 6)).toEqual(['behavioural-mod-5', 'behavioural-mod-6']);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(19, 29)).toEqual([
      'behavioural-les-20', 'behavioural-les-21', 'behavioural-les-22', 'behavioural-les-23', 'behavioural-les-24',
      'behavioural-les-25', 'behavioural-les-26', 'behavioural-les-27', 'behavioural-les-28', 'behavioural-les-29',
    ]);
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('behavioural-les-20')!.prerequisites).toEqual(['behavioural-les-19']);
    expect(byId.get('behavioural-les-25')!.prerequisites).toEqual(['behavioural-les-24']);
  });

  it('each listening-module checkpoint lesson requires every lesson in that module and covers all 4 of its concepts', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(new Set(byId.get('behavioural-les-24')!.prerequisites)).toEqual(
      new Set(['behavioural-les-20', 'behavioural-les-21', 'behavioural-les-22', 'behavioural-les-23'])
    );
    expect(new Set(byId.get('behavioural-les-29')!.prerequisites)).toEqual(
      new Set(['behavioural-les-25', 'behavioural-les-26', 'behavioural-les-27', 'behavioural-les-28'])
    );
    for (const lessonId of ['behavioural-les-24', 'behavioural-les-29']) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts.size).toBe(4);
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
    }
  });

  it('has 2 more modules (7-8) and 10 more lessons for Feedback, chaining off module 6\'s checkpoint', () => {
    expect(typedCurriculum.modules.map((m) => m.id).slice(6, 8)).toEqual(['behavioural-mod-7', 'behavioural-mod-8']);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(29, 39)).toEqual([
      'behavioural-les-30', 'behavioural-les-31', 'behavioural-les-32', 'behavioural-les-33', 'behavioural-les-34',
      'behavioural-les-35', 'behavioural-les-36', 'behavioural-les-37', 'behavioural-les-38', 'behavioural-les-39',
    ]);
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('behavioural-les-30')!.prerequisites).toEqual(['behavioural-les-29']);
    expect(byId.get('behavioural-les-35')!.prerequisites).toEqual(['behavioural-les-34']);
  });

  it('each feedback-module checkpoint lesson requires every lesson in that module and covers all 4 of its concepts', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(new Set(byId.get('behavioural-les-34')!.prerequisites)).toEqual(
      new Set(['behavioural-les-30', 'behavioural-les-31', 'behavioural-les-32', 'behavioural-les-33'])
    );
    expect(new Set(byId.get('behavioural-les-39')!.prerequisites)).toEqual(
      new Set(['behavioural-les-35', 'behavioural-les-36', 'behavioural-les-37', 'behavioural-les-38'])
    );
    for (const lessonId of ['behavioural-les-34', 'behavioural-les-39']) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts.size).toBe(4);
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
    }
  });

  it('has 2 more modules (9-10) and 10 more lessons for Perspective-taking, chaining off module 8\'s checkpoint', () => {
    expect(typedCurriculum.modules.map((m) => m.id).slice(8, 10)).toEqual(['behavioural-mod-9', 'behavioural-mod-10']);
    expect(typedCurriculum.lessons.map((l) => l.id).slice(39, 49)).toEqual([
      'behavioural-les-40', 'behavioural-les-41', 'behavioural-les-42', 'behavioural-les-43', 'behavioural-les-44',
      'behavioural-les-45', 'behavioural-les-46', 'behavioural-les-47', 'behavioural-les-48', 'behavioural-les-49',
    ]);
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(byId.get('behavioural-les-40')!.prerequisites).toEqual(['behavioural-les-39']);
    expect(byId.get('behavioural-les-45')!.prerequisites).toEqual(['behavioural-les-44']);
  });

  it('each perspective-module checkpoint lesson requires every lesson in that module and covers all 4 of its concepts', () => {
    const byId = new Map(typedCurriculum.lessons.map((l) => [l.id, l]));
    expect(new Set(byId.get('behavioural-les-44')!.prerequisites)).toEqual(
      new Set(['behavioural-les-40', 'behavioural-les-41', 'behavioural-les-42', 'behavioural-les-43'])
    );
    expect(new Set(byId.get('behavioural-les-49')!.prerequisites)).toEqual(
      new Set(['behavioural-les-45', 'behavioural-les-46', 'behavioural-les-47', 'behavioural-les-48'])
    );
    for (const lessonId of ['behavioural-les-44', 'behavioural-les-49']) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts.size).toBe(4);
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
    }
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

  it('each module\'s checkpoint lesson has 4 integrative mastery items covering all 4 of that module\'s concepts', () => {
    // A checkpoint that CLOSES a multi-module thematic unit (here, les-19
    // closing the 2-module Reading Signals unit, the way Strategic's
    // m7.l5/m9.l5/m11.l5 closed their own multi-module units) also gets a
    // synthesis own_words explain item -- a mid-unit checkpoint (les-8,
    // les-9, les-14) doesn't. Both shapes are valid; what's checked here is
    // the property every checkpoint lesson shares regardless of that.
    for (const lessonId of CHECKPOINT_LESSON_IDS) {
      const lesson = typedCurriculum.lessons.find((l) => l.id === lessonId)!;
      expect(lesson.masteryItemIds).toHaveLength(4);
      expect(lesson.concepts).toHaveLength(4);
      const checkpointConcepts = new Set(lesson.masteryItemIds.map((id) => itemById.get(id)!.concept));
      expect(checkpointConcepts).toEqual(new Set(lesson.concepts));
      // interactiveItemIds is the 4 mastery items, plus one more (the
      // explain item) only for a unit-closing checkpoint.
      const expectedLength = lesson.explanationBackItemId ? 5 : 4;
      expect(lesson.interactiveItemIds).toHaveLength(expectedLength);
      if (lesson.explanationBackItemId) {
        expect(lesson.interactiveItemIds.at(-1)).toBe(lesson.explanationBackItemId);
        expect(itemById.get(lesson.explanationBackItemId)!.type).toBe('own_words');
      }
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
