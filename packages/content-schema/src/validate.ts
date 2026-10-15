import type { Curriculum, Item } from './types';
import { curriculumSchema, itemSchema } from './schemas';

export interface ValidationError {
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a curriculum (tracks/modules/lessons/concepts/misconceptions)
 * and its items together, checking shapes plus the cross-references between
 * them that zod alone can't express.
 */
export function validateContent(curriculumData: unknown, itemsData: unknown[]): ValidationResult {
  const errors: ValidationError[] = [];

  const curriculumParse = curriculumSchema.safeParse(curriculumData);
  if (!curriculumParse.success) {
    for (const issue of curriculumParse.error.issues) {
      errors.push({ message: `curriculum: ${issue.path.join('.')}: ${issue.message}` });
    }
    return { valid: false, errors };
  }
  const curriculum: Curriculum = curriculumParse.data;

  const parsedItems: Item[] = [];
  for (const raw of itemsData) {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({ message: `item: ${issue.path.join('.')}: ${issue.message}` });
      }
    } else {
      parsedItems.push(parsed.data as Item);
    }
  }

  const itemIds = new Set(parsedItems.map((i) => i.id));
  const duplicateItemIds = parsedItems.map((i) => i.id).filter((id, index, all) => all.indexOf(id) !== index);
  for (const id of new Set(duplicateItemIds)) {
    errors.push({ message: `duplicate item id "${id}"` });
  }

  const trackIds = new Set(curriculum.tracks.map((t) => t.id));
  const moduleIds = new Set(curriculum.modules.map((m) => m.id));
  const lessonIds = new Set(curriculum.lessons.map((l) => l.id));
  const conceptIds = new Set(curriculum.concepts.map((c) => c.id));
  const misconceptionIds = new Set(curriculum.misconceptions.map((m) => m.id));

  const moduleById = new Map(curriculum.modules.map((m) => [m.id, m]));

  for (const lesson of curriculum.lessons) {
    if (!trackIds.has(lesson.trackId)) {
      errors.push({ message: `lesson "${lesson.id}" references unknown track "${lesson.trackId}"` });
    }
    const module = moduleById.get(lesson.moduleId);
    if (!module) {
      errors.push({ message: `lesson "${lesson.id}" references unknown module "${lesson.moduleId}"` });
    } else if (module.trackId !== lesson.trackId) {
      errors.push({
        message: `lesson "${lesson.id}" belongs to track "${lesson.trackId}" but its module "${module.id}" belongs to track "${module.trackId}"`,
      });
    }
    for (const conceptId of lesson.concepts) {
      if (!conceptIds.has(conceptId)) {
        errors.push({ message: `lesson "${lesson.id}" references unknown concept "${conceptId}"` });
      }
    }
    for (const prereqId of lesson.prerequisites) {
      if (!lessonIds.has(prereqId)) {
        errors.push({ message: `lesson "${lesson.id}" references unknown prerequisite "${prereqId}"` });
      }
      if (prereqId === lesson.id) {
        errors.push({ message: `lesson "${lesson.id}" lists itself as a prerequisite` });
      }
    }
    const referencedItemIds = [
      ...lesson.interactiveItemIds,
      ...lesson.masteryItemIds,
      ...(lesson.explanationBackItemId ? [lesson.explanationBackItemId] : []),
    ];
    for (const itemId of referencedItemIds) {
      if (!itemIds.has(itemId)) {
        errors.push({ message: `lesson "${lesson.id}" references unknown item "${itemId}"` });
      }
    }
  }

  for (const module of curriculum.modules) {
    if (!trackIds.has(module.trackId)) {
      errors.push({ message: `module "${module.id}" references unknown track "${module.trackId}"` });
    }
    for (const lessonId of module.lessonIds) {
      if (!lessonIds.has(lessonId)) {
        errors.push({ message: `module "${module.id}" references unknown lesson "${lessonId}"` });
      }
    }
  }

  for (const track of curriculum.tracks) {
    for (const moduleId of track.moduleIds) {
      if (!moduleIds.has(moduleId)) {
        errors.push({ message: `track "${track.id}" references unknown module "${moduleId}"` });
      }
    }
  }

  for (const concept of curriculum.concepts) {
    if (!trackIds.has(concept.trackId)) {
      errors.push({ message: `concept "${concept.id}" references unknown track "${concept.trackId}"` });
    }
    if (!moduleIds.has(concept.moduleId)) {
      errors.push({ message: `concept "${concept.id}" references unknown module "${concept.moduleId}"` });
    }
  }

  for (const misconception of curriculum.misconceptions) {
    if (!trackIds.has(misconception.trackId)) {
      errors.push({ message: `misconception "${misconception.id}" references unknown track "${misconception.trackId}"` });
    }
  }

  for (const item of parsedItems) {
    if (!conceptIds.has(item.concept)) {
      errors.push({ message: `item "${item.id}" references unknown concept "${item.concept}"` });
    }
    const optionSets: { options: { id: string; misconception?: string; conceptTag?: string }[] }[] = [];
    if (item.type === 'reason_choice' || item.type === 'predict') {
      optionSets.push({ options: item.options });
    }
    for (const { options } of optionSets) {
      for (const option of options) {
        if (option.misconception && !misconceptionIds.has(option.misconception)) {
          errors.push({
            message: `item "${item.id}" option "${option.id}" references unknown misconception "${option.misconception}"`,
          });
        }
        if (option.conceptTag && !conceptIds.has(option.conceptTag)) {
          errors.push({
            message: `item "${item.id}" option "${option.id}" references unknown concept tag "${option.conceptTag}"`,
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
