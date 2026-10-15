/**
 * Session duration model. Inputs are MEASURED from a scripted walk-through of every session in the built app
 * (tests/e2e/durations.spec.ts writes src/content/durations.ts): words shown on screen, activity choices,
 * question count and question words. Per-unit rates below are assumptions, documented in docs/durations.md:
 * - reading: 175 to 260 words per minute (Brysbaert 2019: most adults read English non-fiction at 175-300 wpm, mean 238;
 *   slower for second-language readers, so the slow end is used for the upper bound).
 * - each tap or choice (activity or question): 5 to 12 seconds to decide.
 * - explain-back: 0.5 min to read and skip, up to 5 min to type 60-150 words on a phone and self-rate.
 * - practice steps, summary and application task: 1 to 3 min.
 * These are not timings of real learners.
 */
export interface Measured { words: number; interactions: number; quizItems: number; quizWords: number; explain: boolean }
export const RATES = { wpmFast: 260, wpmSlow: 175, choiceFastS: 5, choiceSlowS: 12, explainLo: 0.5, explainHi: 5, otherLo: 1, otherHi: 3 } as const;
export function durationRange(m: Measured): [number, number] {
  const r = RATES, w = m.words + m.quizWords, taps = m.interactions + m.quizItems;
  const lo = w / r.wpmFast + taps * r.choiceFastS / 60 + (m.explain ? r.explainLo : 0) + r.otherLo;
  const hi = w / r.wpmSlow + taps * r.choiceSlowS / 60 + (m.explain ? r.explainHi : 0) + r.otherHi;
  return [Math.max(1, Math.floor(lo)), Math.ceil(hi)];
}
