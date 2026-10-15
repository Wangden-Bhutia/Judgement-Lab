import { z } from 'zod';

const nonEmpty = () => z.string().min(1);

export const choiceOptionSchema = z.object({
  id: nonEmpty(),
  text: nonEmpty(),
  misconception: nonEmpty().optional(),
  conceptTag: nonEmpty().optional(),
});

const itemBase = {
  id: nonEmpty(),
  concept: nonEmpty(),
  scenario: nonEmpty().optional(),
  prompt: nonEmpty(),
};

export const reasonChoiceItemSchema = z
  .object({
    ...itemBase,
    type: z.literal('reason_choice'),
    options: z.array(choiceOptionSchema).min(2),
    acceptableAnswers: z.array(nonEmpty()).min(1),
    explanation: nonEmpty(),
  })
  .superRefine((item, ctx) => {
    const optionIds = new Set(item.options.map((o) => o.id));
    if (optionIds.size !== item.options.length) {
      ctx.addIssue({ code: 'custom', message: `Item ${item.id} has duplicate option ids` });
    }
    for (const answerId of item.acceptableAnswers) {
      if (!optionIds.has(answerId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Item ${item.id} acceptableAnswers references unknown option "${answerId}"`,
        });
      }
    }
  });

export const fillInSlotSchema = z.object({
  id: nonEmpty(),
  acceptedValues: z.array(nonEmpty()).min(1),
});

export const fillInItemSchema = z
  .object({
    ...itemBase,
    type: z.literal('fill_in'),
    slots: z.array(fillInSlotSchema).min(1),
    explanation: nonEmpty(),
  })
  .superRefine((item, ctx) => {
    const slotIds = new Set(item.slots.map((s) => s.id));
    if (slotIds.size !== item.slots.length) {
      ctx.addIssue({ code: 'custom', message: `Item ${item.id} has duplicate slot ids` });
    }
  });

export const ownWordsItemSchema = z.object({
  ...itemBase,
  type: z.literal('own_words'),
  modelAnswer: nonEmpty(),
  rubric: z.array(nonEmpty()).min(1),
});

export const classifyItemSchema = z
  .object({
    ...itemBase,
    type: z.literal('classify'),
    categories: z.array(z.object({ id: nonEmpty(), label: nonEmpty() })).min(2),
    entries: z.array(z.object({ id: nonEmpty(), label: nonEmpty(), categoryId: nonEmpty() })).min(1),
    explanation: nonEmpty(),
  })
  .superRefine((item, ctx) => {
    const categoryIds = new Set(item.categories.map((c) => c.id));
    for (const entry of item.entries) {
      if (!categoryIds.has(entry.categoryId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Item ${item.id} entry "${entry.id}" references unknown category "${entry.categoryId}"`,
        });
      }
    }
  });

export const sequenceItemSchema = z
  .object({
    ...itemBase,
    type: z.literal('sequence'),
    steps: z.array(z.object({ id: nonEmpty(), label: nonEmpty() })).min(2),
    correctOrder: z.array(nonEmpty()).min(2),
    explanation: nonEmpty(),
  })
  .superRefine((item, ctx) => {
    const stepIds = new Set(item.steps.map((s) => s.id));
    if (item.correctOrder.length !== item.steps.length) {
      ctx.addIssue({ code: 'custom', message: `Item ${item.id} correctOrder length must match steps length` });
    }
    for (const id of item.correctOrder) {
      if (!stepIds.has(id)) {
        ctx.addIssue({ code: 'custom', message: `Item ${item.id} correctOrder references unknown step "${id}"` });
      }
    }
  });

export const matchItemSchema = z
  .object({
    ...itemBase,
    type: z.literal('match'),
    left: z.array(z.object({ id: nonEmpty(), label: nonEmpty() })).min(2),
    right: z.array(z.object({ id: nonEmpty(), label: nonEmpty() })).min(2),
    correctPairs: z.array(z.object({ leftId: nonEmpty(), rightId: nonEmpty() })).min(2),
    explanation: nonEmpty(),
  })
  .superRefine((item, ctx) => {
    const leftIds = new Set(item.left.map((l) => l.id));
    const rightIds = new Set(item.right.map((r) => r.id));
    for (const pair of item.correctPairs) {
      if (!leftIds.has(pair.leftId)) {
        ctx.addIssue({ code: 'custom', message: `Item ${item.id} correctPairs references unknown left id "${pair.leftId}"` });
      }
      if (!rightIds.has(pair.rightId)) {
        ctx.addIssue({ code: 'custom', message: `Item ${item.id} correctPairs references unknown right id "${pair.rightId}"` });
      }
    }
  });

export const compareItemSchema = z.object({
  ...itemBase,
  type: z.literal('compare'),
  optionA: nonEmpty(),
  optionB: nonEmpty(),
  question: nonEmpty(),
  acceptableAnswers: z.array(z.enum(['A', 'B', 'both', 'neither'])).min(1),
  explanation: nonEmpty(),
});

export const predictItemSchema = z
  .object({
    ...itemBase,
    type: z.literal('predict'),
    situation: nonEmpty(),
    options: z.array(choiceOptionSchema).min(2),
    actualOutcomeOptionId: nonEmpty(),
    explanation: nonEmpty(),
  })
  .superRefine((item, ctx) => {
    const optionIds = new Set(item.options.map((o) => o.id));
    if (!optionIds.has(item.actualOutcomeOptionId)) {
      ctx.addIssue({
        code: 'custom',
        message: `Item ${item.id} actualOutcomeOptionId references unknown option "${item.actualOutcomeOptionId}"`,
      });
    }
  });

export const itemSchema = z.discriminatedUnion('type', [
  reasonChoiceItemSchema,
  fillInItemSchema,
  ownWordsItemSchema,
  classifyItemSchema,
  sequenceItemSchema,
  matchItemSchema,
  compareItemSchema,
  predictItemSchema,
]);

export const lessonSchema = z.object({
  id: nonEmpty(),
  trackId: nonEmpty(),
  moduleId: nonEmpty(),
  sequence: z.number().int().min(1),
  title: nonEmpty(),
  objectives: z.array(nonEmpty()).min(1),
  concepts: z.array(nonEmpty()).min(1),
  prerequisites: z.array(nonEmpty()),
  interactiveItemIds: z.array(nonEmpty()),
  // Not every lesson has its own mastery-tier items: a module may concentrate
  // transfer/checkpoint items in its closing lesson instead (testing every
  // concept introduced across the module), with earlier lessons' concepts
  // only reaching skill mastery once that happens. core-engine's mastery
  // model is per-concept and lesson-agnostic, so this is a legitimate
  // content shape, not a gap.
  masteryItemIds: z.array(nonEmpty()),
  explanationBackItemId: nonEmpty().optional(),
  contentVersion: z.number().int().min(1),
});

export const moduleSchema = z.object({
  id: nonEmpty(),
  trackId: nonEmpty(),
  sequence: z.number().int().min(1),
  title: nonEmpty(),
  lessonIds: z.array(nonEmpty()).min(1),
});

export const trackSchema = z.object({
  id: nonEmpty(),
  title: nonEmpty(),
  description: nonEmpty(),
  moduleIds: z.array(nonEmpty()),
});

export const conceptSchema = z.object({
  id: nonEmpty(),
  trackId: nonEmpty(),
  moduleId: nonEmpty(),
  label: nonEmpty(),
});

export const misconceptionSchema = z.object({
  id: nonEmpty(),
  trackId: nonEmpty(),
  label: nonEmpty(),
  description: nonEmpty(),
});

export const curriculumSchema = z.object({
  contentVersion: z.number().int().min(1),
  tracks: z.array(trackSchema),
  modules: z.array(moduleSchema),
  lessons: z.array(lessonSchema),
  concepts: z.array(conceptSchema),
  misconceptions: z.array(misconceptionSchema),
});

export type CurriculumShape = z.infer<typeof curriculumSchema>;
