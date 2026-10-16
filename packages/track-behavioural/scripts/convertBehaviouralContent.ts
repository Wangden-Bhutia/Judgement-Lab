/**
 * One-off conversion script (not shipped runtime code): converts Human
 * Behaviour Lab's actual Module 1 content (./hbl-source/*, copied from
 * that repo's src/content/ and src/domain/types.ts) into
 * @judgment-lab/content-schema's format.
 *
 * This is the simplest of the three ports: HBL's scenario data is plain
 * JSON with no computed/generated pipeline (unlike Strategos's engine-
 * derived facts or Emotional Skills' enrich()-merged sessions), and its
 * shape already closely mirrors content-schema's reason_choice item --
 * unsurprising, since content-schema's ItemBase/ChoiceOption/Lesson were
 * originally generalized FROM this app's src/domain/types.ts (see
 * docs/DECISIONS.md). lessonCopy.ts (teaching prose, worked example,
 * explain-it-back prompt+criteria) is imported directly via tsx, same as
 * the other two scripts -- it's plain data with no computation, but
 * importing the real file still beats retyping it by hand.
 *
 * CONTENT MAPPING:
 * - Scenario (scenario/options/acceptableAnswers/explanation) ->
 *   reason_choice. Scenario.scenario is already the full self-contained
 *   prompt (verified against the original app's lesson screen: it renders
 *   `{scenario.scenario}` directly with no separate instruction text), so
 *   it maps straight onto item.prompt with no separate `scenario` context
 *   field needed (unlike Strategic Reasoning, where that field fixed a
 *   real missing-context bug).
 * - LessonCopy.concepts[] (definition/background/significance/
 *   commonMisunderstanding/limitation per concept) -> lesson.teach, one
 *   paragraph pair per concept.
 * - LessonCopy.workedExample -> lesson.example, flattened into one
 *   paragraph (it's several structured fields in the source; content-
 *   schema's `example` is a single string).
 * - LessonCopy.explanationPrompt/explanationCriteria -> a synthetic
 *   own_words item (explanationBackItemId), modelAnswer built by joining
 *   the criteria -- same situation as Strategos's Rubric and ESL's
 *   ExplainBack: no separate authored model answer exists in the source.
 * - HBL has no retrieval-practice-prompt or apply/reflect fields (its
 *   blueprint stages go straight from worked example to interactive
 *   items) -- practicePrompts/apply/reflect are left undefined, same as
 *   Strategic Reasoning's discovery-first lessons.
 *
 * Run with: pnpm convert:content (tsx scripts/convertBehaviouralContent.ts)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateContent,
  type ChoiceOption,
  type Concept,
  type Curriculum,
  type Item,
  type Lesson,
  type Misconception,
  type Module,
  type OwnWordsItem,
  type ReasonChoiceItem,
  type Track,
} from '@judgment-lab/content-schema';
import { LESSON_COPY } from './hbl-source/lessonCopy.ts';

const SOURCE_DIR = join(import.meta.dirname, 'hbl-source');
const OUT_DIR = join(import.meta.dirname, '..', 'content');
const TRACK_ID = 'behavioural';

interface SourceModule {
  id: string;
  sequence: number;
  title: string;
  lessonIds: string[];
}

interface SourceLesson {
  id: string;
  module: string;
  sequence: number;
  title: string;
  objectives: string[];
  concepts: string[];
  prerequisites: string[];
  interactiveScenarioIds: string[];
  masteryScenarioIds: string[];
  contentVersion: number;
}

interface SourceConcept {
  id: string;
  label: string;
  module: string;
}

interface SourceMisconception {
  id: string;
  label: string;
  description: string;
}

interface SourceCurriculum {
  contentVersion: number;
  modules: SourceModule[];
  lessons: SourceLesson[];
  concepts: SourceConcept[];
  misconceptions: SourceMisconception[];
}

interface SourceOption {
  id: string;
  text: string;
  misconception?: string;
  conceptTag?: string;
}

interface SourceScenario {
  id: string;
  concept: string;
  module: string;
  lesson: string;
  difficulty: number;
  scenario: string;
  questionType: string;
  options: SourceOption[];
  acceptableAnswers: string[];
  explanation: string;
  skills: string[];
  followUpScenarioId?: string;
  contentVersion: number;
}

const curriculumSrc: SourceCurriculum = JSON.parse(readFileSync(join(SOURCE_DIR, 'curriculum.json'), 'utf8'));
const scenarioFiles = ['mod1-lesson1.json', 'mod1-lesson2.json', 'mod1-lesson3.json'];
const scenariosSrc: SourceScenario[] = scenarioFiles.flatMap((f) =>
  JSON.parse(readFileSync(join(SOURCE_DIR, 'scenarios', f), 'utf8'))
);
const scenarioById = new Map(scenariosSrc.map((s) => [s.id, s]));

const lessonId = (id: string) => `${TRACK_ID}-${id.toLowerCase()}`;
const moduleId = (id: string) => `${TRACK_ID}-${id.toLowerCase()}`;
const itemId = (id: string) => `i.beh.${id.toLowerCase()}`;
const misconceptionId = (id: string) => `${TRACK_ID}-${id}`;

function convertScenario(src: SourceScenario): ReasonChoiceItem {
  const options: ChoiceOption[] = src.options.map((o) => ({
    id: o.id,
    text: o.text,
    ...(o.misconception ? { misconception: misconceptionId(o.misconception) } : {}),
    ...(o.conceptTag ? { conceptTag: o.conceptTag } : {}),
  }));
  return {
    id: itemId(src.id),
    concept: src.concept,
    type: 'reason_choice',
    prompt: src.scenario,
    options,
    acceptableAnswers: src.acceptableAnswers,
    explanation: src.explanation,
  };
}

function buildTeach(srcLesson: SourceLesson): string[] {
  const copy = LESSON_COPY[srcLesson.id];
  if (!copy) throw new Error(`${srcLesson.id}: no lessonCopy entry`);
  return copy.concepts.flatMap((c) => [
    `${c.definition} ${c.background} ${c.significance}`,
    `${c.commonMisunderstanding} ${c.limitation}`,
  ]);
}

function buildExample(srcLesson: SourceLesson): string {
  const copy = LESSON_COPY[srcLesson.id];
  if (!copy) throw new Error(`${srcLesson.id}: no lessonCopy entry`);
  const w = copy.workedExample;
  return [
    w.scenario,
    `Observable: ${w.observable}`,
    `Reasonable inferences: ${w.reasonableInferences}`,
    `What's uncertain: ${w.uncertain}`,
    `Alternatives: ${w.alternatives.join(' ')}`,
    `Further evidence that would help: ${w.furtherEvidence}`,
  ].join(' ');
}

function convertExplain(srcLesson: SourceLesson): OwnWordsItem {
  const copy = LESSON_COPY[srcLesson.id];
  if (!copy) throw new Error(`${srcLesson.id}: no lessonCopy entry`);
  return {
    id: `${itemId(srcLesson.id)}.explain`,
    concept: srcLesson.concepts[0]!,
    type: 'own_words',
    prompt: copy.explanationPrompt,
    modelAnswer: copy.explanationCriteria.join(' '),
    rubric: copy.explanationCriteria,
  };
}

const allItems: Item[] = [];
const convertedLessons: Lesson[] = [];

for (const srcLesson of curriculumSrc.lessons) {
  const explainItem = convertExplain(srcLesson);
  allItems.push(explainItem);

  const interactiveItems = srcLesson.interactiveScenarioIds.map((id) => {
    const src = scenarioById.get(id);
    if (!src) throw new Error(`lesson ${srcLesson.id}: unknown scenario id "${id}"`);
    return convertScenario(src);
  });
  allItems.push(...interactiveItems);

  const masteryItems = srcLesson.masteryScenarioIds.map((id) => {
    const src = scenarioById.get(id);
    if (!src) throw new Error(`lesson ${srcLesson.id}: unknown scenario id "${id}"`);
    return convertScenario(src);
  });
  allItems.push(...masteryItems);

  convertedLessons.push({
    id: lessonId(srcLesson.id),
    trackId: TRACK_ID,
    moduleId: moduleId(srcLesson.module),
    sequence: srcLesson.sequence,
    title: srcLesson.title,
    objectives: srcLesson.objectives,
    concepts: srcLesson.concepts,
    prerequisites: srcLesson.prerequisites.map(lessonId),
    // The explain item goes LAST in interactiveItemIds, not left for
    // LessonPlayer's own fallback-append: that appends explanationBackItemId
    // after BOTH arrays, i.e. after the mastery items too, which inverts
    // the original app's real stage order (interactive_learning ->
    // explanation_back -> mastery_assessment, see src/domain/types.ts's
    // LessonStage enum in the source repo). Listing it explicitly here
    // places it between practice and mastery, matching that order.
    interactiveItemIds: [...interactiveItems.map((i) => i.id), explainItem.id],
    masteryItemIds: masteryItems.map((i) => i.id),
    explanationBackItemId: explainItem.id,
    teach: buildTeach(srcLesson),
    example: buildExample(srcLesson),
    contentVersion: 1,
  });
}

const convertedModules: Module[] = curriculumSrc.modules.map((m) => ({
  id: moduleId(m.id),
  trackId: TRACK_ID,
  sequence: m.sequence,
  title: m.title,
  lessonIds: m.lessonIds.map(lessonId),
}));

const convertedConcepts: Concept[] = curriculumSrc.concepts.map((c) => ({
  id: c.id,
  trackId: TRACK_ID,
  moduleId: moduleId(c.module),
  label: c.label,
}));

const convertedMisconceptions: Misconception[] = curriculumSrc.misconceptions.map((m) => ({
  id: misconceptionId(m.id),
  trackId: TRACK_ID,
  label: m.label,
  description: m.description,
}));

const convertedTrack: Track = {
  id: TRACK_ID,
  title: 'Behavioural Observation',
  description: 'Learning to read behaviour carefully: telling an observation apart from an interpretation, weighing disposition against situation, and generating alternative explanations before settling on one.',
  moduleIds: convertedModules.map((m) => m.id),
};

const curriculum: Curriculum = {
  contentVersion: 1,
  tracks: [convertedTrack],
  modules: convertedModules,
  lessons: convertedLessons,
  concepts: convertedConcepts,
  misconceptions: convertedMisconceptions,
};

const result = validateContent(curriculum, allItems);
if (!result.valid) {
  console.error('Validation failed:');
  for (const e of result.errors) console.error(' -', e.message);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(join(OUT_DIR, 'items'), { recursive: true });
writeFileSync(join(OUT_DIR, 'curriculum.json'), JSON.stringify(curriculum, null, 2) + '\n');
writeFileSync(join(OUT_DIR, 'items', 'module1.json'), JSON.stringify(allItems, null, 2) + '\n');

console.log(`Converted ${convertedModules.length} modules, ${convertedLessons.length} lessons, ${allItems.length} items.`);
console.log(`Concepts: ${convertedConcepts.map((c) => c.id).join(', ')}`);
console.log(`Misconceptions: ${convertedMisconceptions.map((m) => m.id).join(', ')}`);
