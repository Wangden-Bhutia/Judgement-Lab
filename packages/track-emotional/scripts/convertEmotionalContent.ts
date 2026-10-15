/**
 * One-off conversion script (not shipped runtime code): converts Emotional
 * Skills Lab's actual session curriculum (./esl-source/*.ts, copied from
 * that repo's src/content/) into @judgment-lab/content-schema's format.
 *
 * Runs ESL's own session-building code (sessions.ts -> enrich() -> deep1-4,
 * distractors, topics, extra/extra2) via tsx, exactly as that app does at
 * module load time, rather than hand-parsing the raw mk(...) literals --
 * the final SESSIONS export already has TOPICS-merged checks, distractor-
 * replaced wrong options, and enrich()-derived activity/explain/
 * prerequisites baked in, and re-deriving that by hand would risk silently
 * missing one of those merge steps. Mirrors convertStrategicContent.ts's
 * "run the real source, don't transcribe it" discipline.
 *
 * SCOPE: only the 60-session day-by-day curriculum (checks, activity,
 * explain, apply). ESL's second content form -- the branching, quality-
 * graded (0/1/2) scenario-practice gym (scenarios.ts, skillScenarios.ts,
 * safetyScenarios.ts, branches2.ts) -- is NOT ported here. Its response
 * model (graded quality + tradeoffs + branching follow-ups) doesn't fit
 * any existing content-schema item type, and forcing it into one would
 * misrepresent it. Deferred as a separate, explicit piece of work (see
 * docs/DECISIONS.md) rather than silently dropped or badly approximated.
 *
 * CONCEPT MODEL: ESL's own competencies.ts states "a skill is one lesson
 * or practice session" -- so every session maps to exactly one concept,
 * itself (id = session.id). This includes checkpoint/review sessions,
 * whose "concept" is the checkpoint itself (e.g. "pass Week 1's
 * checkpoint"), not a retroactive attribution to the individual skills it
 * draws questions from -- the source data has no per-question skill tag
 * that would make that attribution accurate, and no evidence any such
 * tag is derivable, so this script does not fabricate one.
 *
 * ITEM MAPPING:
 * - CheckItem (q/options/answer/why) -> reason_choice.
 * - Activity 'classify'/'sequence'/'match' -> the content-schema item type
 *   of the same name (a genuine 1:1 structural match).
 * - Activity 'predict'/'compare' -> reason_choice, NOT content-schema's
 *   PredictItem/CompareItem. Those types were defined speculatively ahead
 *   of this port (see docs/DECISIONS.md) for a "predict then reveal the
 *   actual outcome" / "A vs B" semantics that ESL's actual data doesn't
 *   use -- its predict/compare activities are structurally a multiple-
 *   choice question (several options, each flagged good/bad), i.e.
 *   reason_choice. Using the correctly-shaped type is more honest than
 *   using the similarly-named one.
 * - ExplainBack (prompt + keyPoints) -> own_words, modelAnswer built by
 *   joining keyPoints (ESL's own Rubric-equivalent; no separate authored
 *   model answer exists, same situation as Strategos's Rubric).
 * - altChecks (retake variants) are not ported -- same "only the first
 *   variant" V1 simplification already applied to Strategos content.
 *
 * Run with: pnpm convert:content (tsx scripts/convertEmotionalContent.ts)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateContent,
  type ChoiceOption,
  type ClassifyItem,
  type Concept,
  type Curriculum,
  type Item,
  type Lesson,
  type MatchItem,
  type Module,
  type OwnWordsItem,
  type ReasonChoiceItem,
  type SequenceItem,
  type Track,
} from '@judgment-lab/content-schema';
import { SESSIONS } from './esl-source/sessions.ts';
import { PHASES } from './esl-source/phases.ts';
import { COMPETENCIES } from './esl-source/competencies.ts';
import type { Activity, CheckItem, Session } from './esl-source/types.ts';

const OUT_DIR = join(import.meta.dirname, '..', 'content');
const TRACK_ID = 'emotional';

function letterIds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

function uniqueJoin(parts: string[]): string {
  return [...new Set(parts.map((p) => p.trim()).filter(Boolean))].join(' ');
}

function convertCheckItem(session: Session, check: CheckItem): ReasonChoiceItem {
  const ids = letterIds(check.options.length);
  const options: ChoiceOption[] = check.options.map((text, i) => ({
    id: ids[i]!,
    text,
    ...(i === check.answer ? { conceptTag: session.id } : {}),
  }));
  return {
    id: `i.emo.${check.id}`,
    concept: session.id,
    type: 'reason_choice',
    prompt: check.q,
    options,
    acceptableAnswers: [ids[check.answer]!],
    explanation: check.why,
  };
}

function convertActivity(session: Session, activity: Activity): Item {
  const id = `i.emo.${session.id}.activity`;

  if (activity.type === 'classify') {
    const categories = activity.buckets.map((label, i) => ({ id: `c${i}`, label }));
    const entries = activity.items.map((it, i) => ({ id: `e${i}`, label: it.text, categoryId: `c${it.bucket}` }));
    const item: ClassifyItem = {
      id,
      concept: session.id,
      type: 'classify',
      prompt: activity.prompt,
      categories,
      entries,
      explanation: uniqueJoin(activity.items.map((it) => it.fb)),
    };
    return item;
  }

  if (activity.type === 'sequence') {
    const steps = activity.steps.map((s, i) => ({ id: `s${i}`, label: s.text }));
    const item: SequenceItem = {
      id,
      concept: session.id,
      type: 'sequence',
      prompt: activity.prompt,
      steps,
      // The source lists steps in their correct order already (the UI
      // shuffles for display; content only records what's correct).
      correctOrder: steps.map((s) => s.id),
      explanation: uniqueJoin(activity.steps.map((s) => s.fb)),
    };
    return item;
  }

  if (activity.type === 'match') {
    const left = activity.pairs.map((p, i) => ({ id: `l${i}`, label: p.left }));
    const right = activity.pairs.map((p, i) => ({ id: `r${i}`, label: p.right }));
    const item: MatchItem = {
      id,
      concept: session.id,
      type: 'match',
      prompt: activity.prompt,
      left,
      right,
      correctPairs: activity.pairs.map((_, i) => ({ leftId: `l${i}`, rightId: `r${i}` })),
      explanation: uniqueJoin(activity.pairs.map((p) => p.fb)),
    };
    return item;
  }

  // 'predict' | 'compare': structurally a multiple-choice question (several
  // options, each flagged good/bad) -- reason_choice, not content-schema's
  // PredictItem/CompareItem (see file header comment for why).
  const ids = letterIds(activity.options.length);
  const options: ChoiceOption[] = activity.options.map((o, i) => ({
    id: ids[i]!,
    text: o.text,
    ...(o.good ? { conceptTag: session.id } : {}),
  }));
  const acceptableAnswers = activity.options.map((o, i) => (o.good ? ids[i]! : null)).filter((x): x is string => x !== null);
  if (acceptableAnswers.length === 0) throw new Error(`${session.id}: activity has no option marked good`);
  const item: ReasonChoiceItem = {
    id,
    concept: session.id,
    type: 'reason_choice',
    prompt: activity.prompt,
    options,
    acceptableAnswers,
    explanation: uniqueJoin(activity.options.map((o) => o.fb)),
  };
  return item;
}

function convertExplain(session: Session): OwnWordsItem {
  return {
    id: `i.emo.${session.id}.explain`,
    concept: session.id,
    type: 'own_words',
    prompt: session.explain.prompt,
    modelAnswer: session.explain.keyPoints.join(' '),
    rubric: session.explain.keyPoints,
  };
}

const allItems: Item[] = [];
const lessonsByModule = new Map<string, Lesson[]>();
const convertedConcepts: Concept[] = [];

// Phase sequence, then (week, day) order within a phase -- lesson.sequence
// is per-module, matching track-strategic's convention (see
// convertStrategicContent.ts for the bug this exact thing caused once in
// apps/web when it was sorted globally instead).
const sessionsByPhase = new Map<number, Session[]>();
for (const session of SESSIONS) {
  const list = sessionsByPhase.get(session.phase) ?? [];
  list.push(session);
  sessionsByPhase.set(session.phase, list);
}
for (const list of sessionsByPhase.values()) {
  list.sort((a, b) => a.week - b.week || a.day - b.day);
}

for (const session of SESSIONS) {
  const lessonId = `${TRACK_ID}-${session.id}`;
  const moduleId = `${TRACK_ID}-p${session.phase}`;

  const explainItem = convertExplain(session);
  allItems.push(explainItem);
  const interactiveItemIds: string[] = [explainItem.id];
  const masteryItemIds: string[] = [];

  if (session.activity) {
    const activityItem = convertActivity(session, session.activity);
    allItems.push(activityItem);
    interactiveItemIds.push(activityItem.id);
  }

  const checkItems = session.checks.map((c) => convertCheckItem(session, c));
  allItems.push(...checkItems);
  const isDelayedEvidenceSession = session.kind === 'checkpoint' || session.kind === 'review';
  if (isDelayedEvidenceSession) {
    masteryItemIds.push(...checkItems.map((c) => c.id));
  } else {
    interactiveItemIds.push(...checkItems.map((c) => c.id));
  }

  const lesson: Lesson = {
    id: lessonId,
    trackId: TRACK_ID,
    moduleId,
    sequence: sessionsByPhase.get(session.phase)!.indexOf(session) + 1,
    title: session.title,
    objectives: [session.objective],
    concepts: [session.id],
    prerequisites: session.prerequisites.map((id) => `${TRACK_ID}-${id}`),
    interactiveItemIds,
    masteryItemIds,
    explanationBackItemId: explainItem.id,
    contentVersion: 1,
  };

  const moduleLessons = lessonsByModule.get(moduleId) ?? [];
  moduleLessons.push(lesson);
  lessonsByModule.set(moduleId, moduleLessons);

  convertedConcepts.push({
    id: session.id,
    trackId: TRACK_ID,
    moduleId,
    label: COMPETENCIES[session.id] ?? session.objective,
  });
}

const convertedModules: Module[] = PHASES.map((phase) => ({
  id: `${TRACK_ID}-p${phase.id}`,
  trackId: TRACK_ID,
  sequence: phase.id,
  title: phase.title,
  lessonIds: (lessonsByModule.get(`${TRACK_ID}-p${phase.id}`) ?? []).map((l) => l.id),
}));

const convertedTrack: Track = {
  id: TRACK_ID,
  title: 'Emotional Skills',
  description: 'Twelve weeks of research-informed practice in noticing, naming and regulating emotion, and applying that under criticism, conflict and professional pressure.',
  moduleIds: convertedModules.map((m) => m.id),
};

const curriculum: Curriculum = {
  contentVersion: 1,
  tracks: [convertedTrack],
  modules: convertedModules,
  lessons: [...lessonsByModule.values()].flat(),
  concepts: convertedConcepts,
  misconceptions: [],
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
writeFileSync(join(OUT_DIR, 'items', 'sessions.json'), JSON.stringify(allItems, null, 2) + '\n');

console.log(`Converted ${convertedModules.length} phases, ${curriculum.lessons.length} sessions, ${allItems.length} items.`);
const byType = new Map<string, number>();
for (const item of allItems) byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
console.log('Item types:', Object.fromEntries(byType));
