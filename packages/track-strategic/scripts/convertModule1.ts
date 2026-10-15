/**
 * One-off conversion script (not shipped runtime code): converts Strategos's
 * Module 1 content (./strategos-source/*.json) into @judgment-lab/content-
 * schema's format, using the ported contentPort rendering/claims pipeline
 * to resolve template text and determine correctness from engine-computed
 * facts, exactly as Strategos's own app does. Writes to ../content/.
 *
 * V1 simplifications (see docs/DECISIONS.md and commit messages for why):
 * - Only the first skin and first variation listed for each item is used
 *   (Strategos's skin/variation variety for retakes is not ported yet).
 * - Only the first optionSet of a reason_choice item is used (the second,
 *   alternate-wording optionSet exists in the source for retake variety).
 * - fill_in distractor ("knownWrong") feedback is not ported; only the
 *   correct value per slot.
 * - Per-option feedback phrasings (Strategos's feedback.json templates)
 *   are not ported; items get one generic explanation from the concept
 *   definition instead.
 *
 * Run with: node --experimental-strip-types scripts/convertModule1.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateContent,
  type ChoiceOption,
  type Concept,
  type Curriculum,
  type FillInItem,
  type Item,
  type Lesson,
  type Misconception,
  type Module,
  type OwnWordsItem,
  type ReasonChoiceItem,
  type Track,
} from '@judgment-lab/content-schema';
import { buildInstance, evaluateClaim, makeLookup, render, slotValue } from '../src/contentPort/index.ts';
import type { Skin, Structure, Variation } from '../src/contentPort/index.ts';

const SOURCE_DIR = join(import.meta.dirname, 'strategos-source');
const OUT_DIR = join(import.meta.dirname, '..', 'content');

interface SourceCurriculum {
  contentVersion: string;
  modules: {
    id: string;
    number: number;
    workingTitle: string;
    lessons: {
      id: string;
      workingTitle: string;
      objective: string;
      introduces: string[];
      requires: string[];
      items: string[];
      reveal?: { concept: string; body: string[] };
    }[];
  }[];
}

interface SourceConcept {
  id: string;
  definition: string;
}

interface SourceItem {
  id: string;
  lesson: string;
  role: 'discovery' | 'practice' | 'recognition' | 'transfer' | 'held_out';
  concept: string;
  type: 'reason_choice' | 'fill_in' | 'own_words';
  structure: string;
  skins: string[];
  variations: string[];
  prompt: string;
  facts: Record<string, unknown>;
  optionSets?: { text: string; claim: unknown; code: string }[][];
  slots?: { id: string; answer: unknown; knownWrong: { value: unknown; code: string }[] }[];
  rubric?: string;
}

interface SourceRubric {
  id: string;
  prompt: string;
  criteria: { id: string; text: string; meets: string }[];
}

interface SourceModuleFile {
  module: string;
  skins: Skin[];
  variations: Variation[];
  items: SourceItem[];
  rubrics: SourceRubric[];
}

const curriculumSrc: SourceCurriculum = JSON.parse(readFileSync(join(SOURCE_DIR, 'curriculum.json'), 'utf8'));
const conceptsSrc: SourceConcept[] = JSON.parse(readFileSync(join(SOURCE_DIR, 'concepts.json'), 'utf8'));
const structuresSrc: Structure[] = JSON.parse(readFileSync(join(SOURCE_DIR, 'structures.json'), 'utf8'));
const m1: SourceModuleFile = JSON.parse(readFileSync(join(SOURCE_DIR, 'm1.json'), 'utf8'));
const errorCodesSrc: { code: string; definition: string }[] = JSON.parse(
  readFileSync(join(SOURCE_DIR, 'error-codes.json'), 'utf8')
);

const conceptById = new Map(conceptsSrc.map((c) => [c.id, c]));
const errorCodeDefinitionByCode = new Map(errorCodesSrc.map((e) => [e.code, e.definition]));
const itemById = new Map(m1.items.map((i) => [i.id, i]));
const rubricById = new Map(m1.rubrics.map((r) => [r.id, r]));
const lookup = makeLookup({ structures: structuresSrc, skins: m1.skins, variations: m1.variations });

const TRACK_ID = 'strategic';
const sourceModule = curriculumSrc.modules.find((m) => m.id === 'm1')!;
const MODULE_ID = `${TRACK_ID}-${sourceModule.id}`;

// Which lesson first introduces each concept, so lesson.requires (concept
// ids) can become lesson.prerequisites (lesson ids).
const introducingLesson = new Map<string, string>();
for (const lesson of sourceModule.lessons) {
  for (const conceptId of lesson.introduces) {
    introducingLesson.set(conceptId, `${TRACK_ID}-${lesson.id}`);
  }
}

const misconceptionsById = new Map<string, Misconception>();
function registerMisconception(code: string): string {
  const id = `strategic-${code.toLowerCase()}`;
  if (!misconceptionsById.has(id)) {
    const definition = errorCodeDefinitionByCode.get(code);
    if (!definition) throw new Error(`error code "${code}" has no definition in error-codes.json`);
    misconceptionsById.set(id, {
      id,
      trackId: TRACK_ID,
      label: code,
      description: definition,
    });
  }
  return id;
}

function letterIds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

function convertItem(srcItem: SourceItem): Item {
  const skinId = srcItem.skins[0];
  const variationId = srcItem.variations[0];
  if (!skinId || !variationId) {
    throw new Error(`${srcItem.id}: no skin/variation to render with`);
  }
  const instance = buildInstance(srcItem as never, skinId, variationId, lookup);
  const facts = srcItem.facts as Record<string, never>;
  const prompt = render(srcItem.prompt, instance, { facts });
  const conceptDef = conceptById.get(srcItem.concept)?.definition ?? '';

  if (srcItem.type === 'reason_choice') {
    const optionSet = srcItem.optionSets?.[0];
    if (!optionSet) throw new Error(`${srcItem.id}: no optionSets`);
    const ids = letterIds(optionSet.length);
    const options: ChoiceOption[] = optionSet.map((opt, i) => {
      const correct = evaluateClaim(opt.claim as never, instance);
      const text = render(opt.text, instance, { facts });
      return correct
        ? { id: ids[i]!, text, conceptTag: srcItem.concept }
        : { id: ids[i]!, text, misconception: registerMisconception(opt.code) };
    });
    const acceptableAnswers = options
      .map((o, i) => (evaluateClaim(optionSet[i]!.claim as never, instance) ? o.id : null))
      .filter((id): id is string => id !== null);
    if (acceptableAnswers.length === 0) {
      throw new Error(`${srcItem.id}: no option evaluated as correct`);
    }
    const item: ReasonChoiceItem = {
      id: srcItem.id,
      concept: srcItem.concept,
      type: 'reason_choice',
      prompt,
      options,
      acceptableAnswers,
      explanation: conceptDef,
    };
    return item;
  }

  if (srcItem.type === 'fill_in') {
    if (!srcItem.slots) throw new Error(`${srcItem.id}: no slots`);
    const item: FillInItem = {
      id: srcItem.id,
      concept: srcItem.concept,
      type: 'fill_in',
      prompt,
      slots: srcItem.slots.map((slot) => ({
        id: slot.id,
        acceptedValues: [slotValue(slot.answer as never, instance)],
      })),
      explanation: conceptDef,
    };
    return item;
  }

  // own_words. Strategos's own Rubric type has no authored model-answer
  // string, only per-criterion "meets" exemplar phrases -- join those into
  // a coherent model answer instead of (as an earlier version of this
  // script did) wrongly reusing the rubric's prompt, which just restates
  // the question. Note: the exemplars are written against one specific
  // skin (here, the same one skins[0] already resolves to for this item),
  // not skin-agnostic -- a V1 simplification if skins[0] ever diverges.
  const rubric = srcItem.rubric ? rubricById.get(srcItem.rubric) : undefined;
  if (!rubric) throw new Error(`${srcItem.id}: no rubric`);
  const item: OwnWordsItem = {
    id: srcItem.id,
    concept: srcItem.concept,
    type: 'own_words',
    prompt,
    modelAnswer: rubric.criteria.map((c) => c.meets.replace(/[“”]/g, '"')).join(' '),
    rubric: rubric.criteria.map((c) => c.text),
  };
  return item;
}

const convertedItems: Item[] = [];
const convertedLessons: Lesson[] = [];
const convertedConcepts: Concept[] = [];
const seenConcepts = new Set<string>();

for (const srcLesson of sourceModule.lessons) {
  const lessonId = `${TRACK_ID}-${srcLesson.id}`;
  const srcItemsForLesson = srcLesson.items.map((id) => {
    const found = itemById.get(id);
    if (!found) throw new Error(`lesson ${srcLesson.id}: unknown item id "${id}"`);
    return found;
  });

  const interactiveItemIds: string[] = [];
  const masteryItemIds: string[] = [];
  let explanationBackItemId: string | undefined;

  for (const srcItem of srcItemsForLesson) {
    const converted = convertItem(srcItem);
    convertedItems.push(converted);
    if (srcItem.role === 'discovery' || srcItem.role === 'practice') interactiveItemIds.push(srcItem.id);
    if (srcItem.role === 'transfer' || srcItem.role === 'recognition') masteryItemIds.push(srcItem.id);
    if (srcItem.type === 'own_words') explanationBackItemId = srcItem.id;
  }

  const prerequisiteLessonIds = new Set<string>();
  for (const conceptId of srcLesson.requires) {
    const introducer = introducingLesson.get(conceptId);
    if (introducer && introducer !== lessonId) prerequisiteLessonIds.add(introducer);
  }

  convertedLessons.push({
    id: lessonId,
    trackId: TRACK_ID,
    moduleId: MODULE_ID,
    sequence: sourceModule.lessons.indexOf(srcLesson) + 1,
    title: srcLesson.workingTitle,
    objectives: [srcLesson.objective],
    concepts: srcLesson.introduces,
    prerequisites: [...prerequisiteLessonIds],
    interactiveItemIds,
    masteryItemIds,
    explanationBackItemId,
    contentVersion: 1,
  });

  for (const conceptId of srcLesson.introduces) {
    if (seenConcepts.has(conceptId)) continue;
    seenConcepts.add(conceptId);
    const def = conceptById.get(conceptId);
    if (!def) throw new Error(`unknown concept "${conceptId}"`);
    convertedConcepts.push({
      id: conceptId,
      trackId: TRACK_ID,
      moduleId: MODULE_ID,
      label: def.definition.split('.')[0] ?? conceptId,
    });
  }
}

const convertedModule: Module = {
  id: MODULE_ID,
  trackId: TRACK_ID,
  sequence: sourceModule.number,
  title: sourceModule.workingTitle,
  lessonIds: convertedLessons.map((l) => l.id),
};

const convertedTrack: Track = {
  id: TRACK_ID,
  title: 'Strategic Reasoning',
  description: 'Short exercises in reading a situation before reacting to it: who is actually deciding, what their real options are, and what each side knows.',
  moduleIds: [MODULE_ID],
};

const curriculum: Curriculum = {
  contentVersion: 1,
  tracks: [convertedTrack],
  modules: [convertedModule],
  lessons: convertedLessons,
  concepts: convertedConcepts,
  misconceptions: [...misconceptionsById.values()],
};

const result = validateContent(curriculum, convertedItems);
if (!result.valid) {
  console.error('Validation failed:');
  for (const e of result.errors) console.error(' -', e.message);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(join(OUT_DIR, 'items'), { recursive: true });
writeFileSync(join(OUT_DIR, 'curriculum.json'), JSON.stringify(curriculum, null, 2) + '\n');
writeFileSync(join(OUT_DIR, 'items', 'module1.json'), JSON.stringify(convertedItems, null, 2) + '\n');

console.log(`Converted ${convertedLessons.length} lessons, ${convertedItems.length} items.`);
console.log(`Concepts: ${convertedConcepts.map((c) => c.id).join(', ')}`);
console.log(`Misconceptions: ${[...misconceptionsById.keys()].join(', ')}`);
