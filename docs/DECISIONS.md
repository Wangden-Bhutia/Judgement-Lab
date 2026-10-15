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
- **3 of Module 1's 7 concepts (`actions`, `preferences`, `payoff`) have no checkpoint item at all.**
  Strategos's own source data never wrote a transfer/recognition-role item for them in this module —
  a genuine content gap, not a conversion-script bug. It doesn't block mastery permanently (any item
  of the concept answered with a non-lesson source counts, not just `masteryItemIds` ones), but it
  does mean these 3 concepts depend entirely on a future review flow re-presenting an ordinary
  practice item, with no fallback. Documented as an executable test so it can't silently regress or
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

## Open, non-blocking

- Final app name.
- Whether to post a "superseded by" note on the three source repos, or leave them as silent archives.
