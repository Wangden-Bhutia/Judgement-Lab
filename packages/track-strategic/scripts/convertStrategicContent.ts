/**
 * One-off conversion script (not shipped runtime code): converts Strategos's
 * Modules 1-3 (./strategos-source/*.json) into @judgment-lab/content-
 * schema's format, using the ported contentPort rendering/claims pipeline
 * to resolve template text and determine correctness from engine-computed
 * facts, exactly as Strategos's own app does. Writes to ../content/.
 * Supersedes convertModule1.ts (Phase 4c), generalized to every module
 * Strategos has actually shipped content for (Phase 7) -- module 1's
 * output is unchanged byte-for-byte by this generalization.
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
 * Run with: pnpm convert:content (tsx scripts/convertStrategicContent.ts)
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
const TRACK_ID = 'strategic';

interface SourceCurriculum {
  contentVersion: string;
  modules: {
    id: string; // "m1", "m2", "m3"
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
  /** Which module first introduces this concept (1, 2, 3, ...). */
  module: number;
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

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(SOURCE_DIR, name), 'utf8')) as T;
}

const curriculumSrc = readJson<SourceCurriculum>('curriculum.json');
const conceptsSrc = readJson<SourceConcept[]>('concepts.json');
const structuresSrc = readJson<Structure[]>('structures.json');
const errorCodesSrc = readJson<{ code: string; definition: string }[]>('error-codes.json');

// Every module Strategos has shipped actual content for -- m4/m5 concepts
// exist in concepts.json as forward-looking placeholders (introducedIn:
// null) but have no curriculum entry or module data file, so they're
// naturally excluded by driving this loop off curriculumSrc.modules.
const moduleFiles = new Map(
  curriculumSrc.modules.map((m) => [m.id, readJson<SourceModuleFile>(`${m.id}.json`)])
);

const conceptById = new Map(conceptsSrc.map((c) => [c.id, c]));
const errorCodeDefinitionByCode = new Map(errorCodesSrc.map((e) => [e.code, e.definition]));
const rubricById = new Map(
  [...moduleFiles.values()].flatMap((m) => m.rubrics).map((r) => [r.id, r])
);
// One combined lookup: skin/variation ids are namespaced per module
// (m1.s.*, m2.s.*, ...) so there's no collision risk combining them, and
// items can (and in m3 do) reference concepts/structures introduced in an
// earlier module.
const lookup = makeLookup({
  structures: structuresSrc,
  skins: [...moduleFiles.values()].flatMap((m) => m.skins),
  variations: [...moduleFiles.values()].flatMap((m) => m.variations),
});

// Which lesson first introduces each concept, so a lesson's `requires`
// (concept ids) can become lesson.prerequisites (lesson ids) -- built
// across ALL modules up front, since m2/m3 lessons require concepts
// introduced back in m1.
const introducingLesson = new Map<string, string>();
for (const srcModule of curriculumSrc.modules) {
  for (const lesson of srcModule.lessons) {
    for (const conceptId of lesson.introduces) {
      introducingLesson.set(conceptId, `${TRACK_ID}-${lesson.id}`);
    }
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
  // The skin's situation is the scene-setting text the prompt presupposes
  // ("this situation", "what each wants", named people) -- without it the
  // prompt is unanswerable out of context. Run it through render() too
  // (harmless no-op here since skin text has no {slot} tokens) rather than
  // using it raw, so it stays consistent if a future skin's situation ever
  // does reference an engine-derived value.
  const scenario = render(instance.skin.situation, instance, { facts });
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
      scenario,
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
      scenario,
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
  // a coherent model answer instead of wrongly reusing the rubric's
  // prompt, which just restates the question. Note: the exemplars are
  // written against one specific skin (here, the same one skins[0]
  // already resolves to for this item), not skin-agnostic -- a V1
  // simplification if skins[0] ever diverges.
  const rubric = srcItem.rubric ? rubricById.get(srcItem.rubric) : undefined;
  if (!rubric) throw new Error(`${srcItem.id}: no rubric`);
  const item: OwnWordsItem = {
    id: srcItem.id,
    concept: srcItem.concept,
    scenario,
    type: 'own_words',
    prompt,
    modelAnswer: rubric.criteria.map((c) => c.meets.replace(/[“”]/g, '"')).join(' '),
    rubric: rubric.criteria.map((c) => c.text),
  };
  return item;
}

const convertedModules: Module[] = [];
const convertedLessons: Lesson[] = [];
const convertedConcepts: Concept[] = [];
const itemsByModuleId = new Map<string, Item[]>();
const seenConcepts = new Set<string>();

for (const srcModule of curriculumSrc.modules) {
  const moduleFile = moduleFiles.get(srcModule.id)!;
  const itemByIdForModule = new Map(moduleFile.items.map((i) => [i.id, i]));
  const MODULE_ID = `${TRACK_ID}-${srcModule.id}`;
  const moduleItems: Item[] = [];

  for (const srcLesson of srcModule.lessons) {
    const lessonId = `${TRACK_ID}-${srcLesson.id}`;
    const srcItemsForLesson = srcLesson.items.map((id) => {
      const found = itemByIdForModule.get(id);
      if (!found) throw new Error(`lesson ${srcLesson.id}: unknown item id "${id}"`);
      return found;
    });

    const interactiveItemIds: string[] = [];
    const masteryItemIds: string[] = [];
    let explanationBackItemId: string | undefined;

    for (const srcItem of srcItemsForLesson) {
      const converted = convertItem(srcItem);
      moduleItems.push(converted);
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
      sequence: srcModule.lessons.indexOf(srcLesson) + 1,
      title: srcLesson.workingTitle,
      objectives: [srcLesson.objective],
      // A lesson that introduces no new concept (e.g. m3.l2, a pure
      // consolidation lesson) is still about the concepts it requires and
      // practises -- content-schema requires at least one.
      concepts: srcLesson.introduces.length > 0 ? srcLesson.introduces : srcLesson.requires,
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
        moduleId: `${TRACK_ID}-m${def.module}`,
        label: def.definition.split('.')[0] ?? conceptId,
      });
    }
  }

  itemsByModuleId.set(MODULE_ID, moduleItems);
  convertedModules.push({
    id: MODULE_ID,
    trackId: TRACK_ID,
    sequence: srcModule.number,
    title: srcModule.workingTitle,
    lessonIds: convertedLessons.filter((l) => l.moduleId === MODULE_ID).map((l) => l.id),
  });
}

const convertedTrack: Track = {
  id: TRACK_ID,
  title: 'Strategic Reasoning',
  description: 'Short exercises in reading a situation before reacting to it: who is actually deciding, what their real options are, and what each side knows.',
  moduleIds: convertedModules.map((m) => m.id),
};

const curriculum: Curriculum = {
  contentVersion: 1,
  tracks: [convertedTrack],
  modules: convertedModules,
  lessons: convertedLessons,
  concepts: convertedConcepts,
  misconceptions: [...misconceptionsById.values()],
};

const allItems: Item[] = [...itemsByModuleId.values()].flat();

const result = validateContent(curriculum, allItems);
if (!result.valid) {
  console.error('Validation failed:');
  for (const e of result.errors) console.error(' -', e.message);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(join(OUT_DIR, 'items'), { recursive: true });
writeFileSync(join(OUT_DIR, 'curriculum.json'), JSON.stringify(curriculum, null, 2) + '\n');
for (const [moduleId, items] of itemsByModuleId) {
  const fileName = moduleId.replace(`${TRACK_ID}-m`, 'module') + '.json';
  writeFileSync(join(OUT_DIR, 'items', fileName), JSON.stringify(items, null, 2) + '\n');
}

console.log(`Converted ${convertedModules.length} modules, ${convertedLessons.length} lessons, ${allItems.length} items.`);
console.log(`Concepts: ${convertedConcepts.map((c) => c.id).join(', ')}`);
console.log(`Misconceptions: ${[...misconceptionsById.keys()].join(', ')}`);
