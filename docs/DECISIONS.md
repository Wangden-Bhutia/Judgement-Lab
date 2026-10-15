# Judgment Lab — decisions record

Working name: **Judgment Lab**. Reversible; revisit once the app has a shape worth naming for real.

## Why this project exists

Three apps were being built independently on the same underlying philosophy: offline-first,
privacy-first (no accounts, no backend, no AI, no analytics), content separated from a deterministic
scoring engine, mastery gating, spaced repetition, scenario-based practice.

- **Strategos** (`Strategos-lab/strategos`) — strategic / game-theory reasoning.
- **Emotional Skills Lab** (`Wangden-Bhutia/emotional-skills-lab`) — emotional regulation skills.
- **Human Behaviour Lab** (`human-behaviour-lab`, local) — behavioural observation / social judgment.

Decided: these are facets of one underlying skill (reading a situation — your own reactions,
another party's likely choices, what their behaviour actually tells you) rather than three
unrelated apps, and a single daily-practice habit should beat three competing ones. Building one
merged app from scratch rather than continuing to develop three separately.

## Decisions made

1. **Archive, don't delete** the three source repos. They are read-only source material for porting
   content and reusable logic — nothing in this app depends on them at runtime.
2. **Platform: React + TypeScript + Vite + Capacitor.** Matches Strategos and ESL, not Human
   Behaviour Lab's Expo/React Native. This is ESL's already-documented, validated path to Android
   (`docs/android.md` in that repo): Capacitor wraps the built web app; storage sits behind a
   `KVStorage` interface, swappable for SQLite/Preferences later without touching engine or content.
3. **Port and adapt existing content, don't re-author from scratch.** Emotional Skills Lab's content
   in particular is research-cited and was verified against an 18-section spec-compliance checklist
   — re-authoring it would throw away real rigor.
4. **First track to validate the shared architecture end-to-end: Strategic Reasoning** (ported from
   Strategos). Chosen specifically because it's the most technically distinct piece (a real
   game-theory computation engine, not just content + generic scoring) — proving the architecture
   handles it early is more informative than starting with the easiest port.
5. **Package structure: pnpm workspace**, mirroring Strategos's own proven layout —
   `apps/web` (the PWA shell) plus `packages/{content-schema, core-engine, storage, track-strategic,
   track-emotional, track-behavioural}`. Each track's domain-specific logic (e.g. Strategos's
   dominance/equilibria engine) stays isolated from the shared, domain-agnostic learning-progression
   engine (sequencing, mastery, spaced retention) — these got conflated during research (both were
   loosely called "engine" in their source repos) but are genuinely different concerns.

## What's being reused from where, and why

- **`core-engine`'s prerequisite gating** comes from Human Behaviour Lab's
  `src/engine/progression.ts` (`deriveLessonStatus` / `isLessonUnlocked`). Strategos has not built
  this layer yet (lessons are visually marked but nothing is actually locked, per its own
  `docs/STRATEGOS_PHASE_STATUS.md`), and this logic is now correct and tested in HBL after two real
  bugs were found and fixed there.
- **`core-engine`'s mastery model** adopts Emotional Skills Lab's stricter design: completion, skill
  mastery, and phase mastery are kept strictly separate, and skill mastery requires *delayed*
  evidence (checkpoint/review answers, not lesson-time answers) — see that repo's
  `docs/curriculum-and-assessment.md`. This is stricter and better-evidenced than HBL's own
  same-session EMA approach, which is dropped in favour of it.
- **`core-engine`'s spaced-retention intervals** (2, 7, 21 days; reset to 2 on a miss) are adopted
  from ESL as a documented, if still informal, design choice — better-grounded than HBL's own guessed
  1/3/7/14/30-day schedule.
- **`storage`** ports ESL's `KVStorage` interface + IndexedDB implementation near-verbatim — it is
  already the exact shape needed for the Capacitor path this project is committing to.
- **`track-strategic`** ports Strategos's `@strategos/engine` (dominance, equilibria, best-response,
  Pareto — pure, framework-independent TS) close to unchanged, plus its Modules 1–3 content.
- **`content-schema`** generalizes Human Behaviour Lab's `src/domain/types.ts` /
  `src/domain/schemas.ts` / `src/content/validate.ts` pattern to support multiple item types (the
  union of ESL's 5 activity types and Strategos's 3 item types) and a track → module → lesson →
  items/scenarios hierarchy, instead of HBL's single-track, single-item-type shape.

## Build order

See the plan file this was built from for the full phase list. In short: schema → engine → storage →
port Strategic Reasoning content → one working lesson end-to-end → validate → expand Strategic
Reasoning → port Emotional Skills → port Behavioural Observation → design the unified cross-track
"Today" experience → Capacitor Android wrap + release audit.

## Phase 6 validation findings

- **Mastery is currently unreachable for every concept through the lesson flow alone.** Skill mastery
  needs >=2 delayed-evidence (non-`'lesson'`-source) attempts per concept. Right now the only way an
  attempt gets recorded with a different source is a lesson's `masteryItemIds` item, answered once,
  tagged `'checkpoint'` — at most 1 delayed-evidence attempt per concept, ever, until a spaced-review
  UI exists that re-presents items later and records those as `'review'`. That UI is not built yet
  (see Build order above — it's part of the "Today" experience work, not yet reached). This was
  verified with an integration test (`apps/web/src/masteryGate.test.ts`) exercising real Module 1
  content through `progress.ts` + `core-engine` together, not just engine unit tests in isolation.
- **4 of the 14 concepts across Modules 1-3 (`actions`, `preferences`, `payoff`, `dominated_action`)
  have no checkpoint item at all.** (Originally found as 3 of Module 1's 7 in Phase 6; Phase 7's
  Module 2-3 port added `dominated_action` to the list — Strategos's source data simply never wrote a
  transfer/recognition-role item for these concepts, in any module.) It doesn't block mastery
  permanently (any item of the concept answered with a non-lesson source counts, not just
  `masteryItemIds` ones), but it does mean these concepts depend entirely on a future review flow
  re-presenting an ordinary practice item, with no fallback. Documented as an executable test
  (`packages/track-strategic/tests/content/curriculum.test.ts`) so it can't silently regress or
  silently get "fixed" by someone fabricating a checkpoint item without engine-verified correctness.
- **Found and fixed a real bug in `computeSkillMastery`** while writing the above: it picked the
  "latest" attempt per item by strict string comparison (`attemptedAt >`), so two attempts on the same
  item sharing a millisecond timestamp (a fast double-submit, or any batch/replay scenario) kept
  whichever was encountered *first* in the array, not the actually-later one. Changed to `>=`, which
  is correct because `attempts` is append-order = chronological order.
- **Offline support was entirely missing** — `apps/web` had no service worker or manifest despite the
  whole platform choice (§Decisions #2) being built around an installable, offline-first PWA. Added
  `vite-plugin-pwa` (generateSW strategy, precaching all built assets + content JSON, `autoUpdate`
  registration). Build output confirms precaching works (8 entries, ~264 KiB). **Could not verify live
  service-worker registration inside this project's own preview tooling** — `navigator.serviceWorker
  .register()` fails there with "unknown error fetching script" even though the exact same file
  `curl`s with a 200 and the correct `content-type`; service-worker script fetches are a browser-level
  privileged fetch that bypasses normal page networking, and this environment's preview tunnel most
  likely doesn't proxy that path the same way it proxies ordinary requests. This looks like a
  limitation of the preview sandbox, not the app — worth re-verifying in a real, non-sandboxed browser
  before trusting it, rather than assuming either way.

## Phase 8: Emotional Skills content port

- **Scope: the 60-session day-by-day curriculum only.** ESL's second content form — a 40-scenario
  branching practice gym with quality-graded (0/1/2, not binary) responses, trade-offs and follow-up
  branches (`scenarios.ts`, `skillScenarios.ts`, `safetyScenarios.ts`, `branches2.ts`) — is **not**
  ported. Its response model doesn't fit any existing content-schema item type, and forcing it into
  one (e.g. collapsing quality 0/1/2 into binary correct/incorrect, or dropping the branching) would
  misrepresent real content, not just simplify it. Deferred as its own piece of work, needing either a
  content-schema extension or a deliberate decision to approximate — not silently dropped.
- **Concept model: "a skill is one lesson or practice session"** (ESL's own `competencies.ts`
  comment) — every session maps to exactly one concept, itself. Checkpoint/review sessions get this
  too (their "concept" is passing that checkpoint, not a retroactive split across the skills it draws
  questions from — the source data has no per-question skill tag that would make that split accurate).
- **`predict`/`compare` activities convert to `reason_choice`, not content-schema's `PredictItem`/
  `CompareItem`.** Those two types were defined speculatively (Phase 1) for "the union of ESL's 5
  activity types and Strategos's 3" — but ESL's actual `predict`/`compare` shape (several options, each
  flagged good/bad) is a multiple-choice question, not an outcome-prediction or an A-vs-B comparison.
  `PredictItem`/`CompareItem` remain genuinely unused after this port; they weren't wrong to define,
  just ahead of data that turned out not to need them.
- **The mastery-gate finding looks structurally better here than in Strategic Reasoning.** All 12
  checkpoint/review sessions have >=2 of their own checkpoint-tier items, so those 12 concepts can
  reach mastery in a single sitting (no review-flow UI needed). The other 48 ordinary lesson/practice
  sessions still can't — their only items are tagged `'lesson'`-source (not delayed evidence) — same
  gap as Strategic Reasoning, needing the same not-yet-built review flow. Verified with
  `packages/track-emotional/tests/content/curriculum.test.ts`.
- **Source files are checked into `scripts/esl-source/`** (ESL's own `src/content/*.ts`, copied
  verbatim — 18 files, ~240 KB, zero npm dependencies), and `convertEmotionalContent.ts` imports and
  runs them via `tsx` — literally executing ESL's own `SESSIONS` export (which merges `TOPICS`,
  distractor-rewritten options, and `enrich()`-derived `activity`/`explain`/`prerequisites`) rather
  than hand-transcribing the raw `mk(...)` literals, which would risk silently missing one of those
  merge steps. Same discipline as `convertStrategicContent.ts`.
- Output: 9 modules (phases), 60 lessons (sessions), 244 items (148 `reason_choice` — 136 from checks,
  12 from `predict`/`compare` activities —, 60 `own_words`, 18 `classify`, 9 `sequence`, 9 `match`).
  15 new tests, all passing on first run against the real converted content.

### Fixed after a full content/pedagogy audit: the teaching content itself was never ported

The first pass above ported only ESL's assessment layer (checks, activity, explain-back) and silently
dropped `session.teach` (the actual instructional paragraphs), `session.example` (worked example),
`session.practice` (retrieval-practice prompts), `session.apply` (real-world transfer task) and
`session.reflect` (closing reflection prompt) — because `content-schema`'s `Lesson` type had no field
for any of them, having been shaped around Strategos's discovery-first pedagogy (the items themselves,
with a post-answer explanation, ARE the instruction there). ESL is teach-then-practice, not
discovery-first: its own `distractors.ts` says its wrong-answer choices are written "so that an item
can only be answered reliably by someone who understood the lesson" — a design that only holds if the
lesson's teaching prose actually reaches the learner. As shipped, a learner would have been quizzed on
material they were never shown, on all 60 sessions.

Fixed by adding `teach?`, `example?`, `practicePrompts?`, `apply?`, `reflect?` to `Lesson` in
content-schema (all optional — Strategic Reasoning's lessons correctly leave them undefined) and
re-running `convertEmotionalContent.ts`, which now carries all five straight from `Session` into the
converted `Lesson`. Added a regression test asserting every one of the 60 converted lessons has
non-empty `teach`/`practicePrompts`/`apply`/`reflect`, so this can't silently regress again. 389 tests
pass across the workspace; typecheck clean.

Still outstanding, not part of this fix: `apps/web`'s `LessonPlayer` has no UI to show this content —
it only renders items. That's the next piece of work, not this one.

## Audit punch list: renderers, track wiring

Three follow-ups from a full content/pedagogy/UX audit, done one at a time:

1. **Renderers for `classify`/`sequence`/`match`** — `ItemRenderer` previously only handled the 3
   types Strategic Reasoning uses; these 3 (36 real Emotional Skills items) had never been rendered in
   a browser. `SequenceForm` uses shuffle + up/down move buttons, matching ESL's own source UI hint
   ("Use the move buttons; the order is checked when you press Check") rather than drag-and-drop.
2. **A real track selector** (`TrackSwitcher.tsx`, `tracks.ts`) — `apps/web` previously hardcoded
   Strategic Reasoning only; Emotional Skills' 60 sessions were unreachable in the running app despite
   being fully converted since Phase 8. Lesson/item/concept ids are namespaced per track
   (`strategic-...` / `emotional-...`), so a single shared progress store works across tracks with no
   key collisions or extra plumbing.
3. **Surfaced `teach`/`example`/`practicePrompts`/`apply`/`reflect` in `LessonPlayer`** — added as
   this fix explicitly without it; wiring the track in without this would have made the priority-1 fix
   invisible again, just one layer up. A lesson with `teach` now opens on a teaching screen (paragraphs
   + worked example + practice prompts) before any item; a lesson with `apply`/`reflect` closes on a
   screen with those before marking complete. Strategic Reasoning's lessons have neither field, so they
   render exactly as before — verified live, no regression.

Verified end-to-end in-browser: switched tracks, played Emotional Skills' `w01d1` through teach screen
→ own_words → match → 2 checks → closing screen → completion, confirmed `w01d2` unlocked, then
switched back to Strategic Reasoning and confirmed its lesson 1 still opens straight to items with no
teach screen. 389 tests pass; typecheck clean.

### 4. "Today" redesigned to actually be daily

`TodayScreen` rendered the entire syllabus as one flat scroll, grouped by module — tolerable at 12
lessons, a genuine problem at 60+. Redesigned around a single primary card: the earliest lesson, in
curriculum order, that isn't locked or already completed (`findNextLesson`) — i.e. what "today's
practice" actually is for a linear, prerequisite-gated curriculum. The full module-grouped list is
still there, just moved into a native `<details>`/`<summary>` disclosure (collapsed by default, no
extra state needed) so a user can still jump ahead or revisit a completed lesson. Added a lesson-
completion count (`X of N lessons completed`) alongside the existing concept-mastery count, and a
distinct "you've completed every lesson in this track" state when `findNextLesson` returns nothing.

Verified live for both tracks (12-lesson and 60-lesson) and the completed-track state (by marking all
12 Strategic Reasoning lessons done via IndexedDB directly, faster than replaying them). 389 tests
pass; typecheck clean.

This closes the full content/pedagogy/UX audit's punch list. Still open from Phases 6-8: the mastery-
gate / review-flow gap (most concepts in both tracks still can't reach mastery without a spaced-review
UI, which doesn't exist yet) — that's Phase 10 ("design the unified cross-track Today experience")
territory, not a quick follow-up.

## Spaced-review UI (closes the Phases 6-8 mastery-gate finding)

Added the missing piece: `core-engine`'s `scheduleNextReview`/`buildRetentionQueue` have existed since
Phase 2 but nothing ever called them with real state. Added:

- `ConceptReviewState` + `updateReviewState` to `core-engine/src/revision.ts` — persisted per-concept
  schedule state (storage/app concern, not content: nothing in content-schema or a track's own data
  knows about a learner's personal review schedule). Takes the PRE-update streak so a fresh first
  success correctly lands on the 2-day interval rather than skipping ahead — `scheduleNextReview`
  already encodes "a miss resets to 2 days"; this is what makes that apply to first successes too.
- `progress.ts`'s `recordAttempt` now also advances a concept's review schedule whenever the attempt's
  source isn't `'lesson'` — the same `source !== 'lesson'` rule `computeSkillMastery` already uses, so
  the review queue and mastery gate move in lockstep by construction, not by convention two files have
  to independently agree on.
- `ReviewSession.tsx` (new) — a review re-presents ONE item per due concept, preferring an auto-graded
  item over `own_words` (self-assessed correctness is weaker evidence). Answering records the attempt
  with `source: 'review'`.
- `TodayScreen` gets a `review-card` (dashed border, shown above the next-lesson card) whenever any
  concept is due, with a count and a "Start review" button.

**A known, deliberate limitation, not fixed here**: a concept only enters the review schedule via a
checkpoint/review-source attempt. A concept with NO checkpoint item anywhere (the `actions`/
`preferences`/`payoff`/`dominated_action`-type gap documented in Phases 6-8) still never gets a first
one, so it can never enter the schedule at all — this UI closes the gap for concepts that DO get a
checkpoint attempt, not every concept in the curriculum. Seeding review state from lesson completion
instead (using `lesson.concepts`, which exists for exactly this) would close the rest; deliberately not
done here, flagged in `apps/web/src/masteryGate.test.ts`'s updated comment instead of silently assumed.

Verified both with new integration tests (`core-engine/tests/revision.test.ts`'s `updateReviewState`
suite, `apps/web/src/reviewFlow.test.ts`) and live end-to-end in-browser: played Strategic Reasoning's
lesson 4 for real (generating a genuine `'checkpoint'` attempt), confirmed the `players` concept
entered the review schedule at the 2-day interval, backdated `nextReviewAt` via IndexedDB to simulate
the wait, confirmed the Today screen surfaced a review card with the correct count, played the review,
and confirmed both the schedule advanced to the 7-day interval AND the concept became the first one in
the entire project to show as mastered through the real UI. 397 tests pass; typecheck clean.

## Open, non-blocking

- Final app name.
- Whether to post a "superseded by" note on the three source repos, or leave them as silent archives.
