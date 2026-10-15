export interface Claim { id: string; text: string; level: 'abstract-level summary' }
export interface Source {
  id: string; doi: string; authors: string; year: number; title: string; venue: string;
  verified: 'crossref-metadata'; claims: Claim[];
}
export interface CheckItem { id: string; q: string; options: string[]; answer: number; why: string }
export type PhaseId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface Phase { id: PhaseId; title: string; weeks: number[]; goal: string }
export interface Session {
  id: string; week: number; day: number; phase: PhaseId; title: string; objective: string;
  minutes: number; teach: string[]; practice: string[]; checks: CheckItem[];
  reflect: string; example?: string; claimIds: string[]; kind: 'lesson' | 'practice' | 'review' | 'checkpoint';
  /** Layer 1 activity (lessons and practice; checkpoints/reviews are themselves assessments). */
  activity?: Activity; activityExempt?: string;
  /** Layer 2 explanation-back (all sessions). */
  explain: ExplainBack;
  /** Real-world application task. */
  apply: string;
  /** Alternative items used when a lesson check is retaken. */
  altChecks: CheckItem[];
  prerequisites: string[];
  /** Duration range in minutes [quick, thorough], derived from measured content (see duration.ts). minutes = upper end. */
  range: [number, number];
  /** Inputs to the range: measured on-screen words, activity choices, questions; and whether they came from the walk-through. */
  estimate: { words: number; interactions: number; quizItems: number; quizWords: number; explain: boolean; measured: boolean };
}
export type ScenarioCategory = 'anger' | 'criticism' | 'anxiety' | 'frustration' | 'misunderstanding' | 'professional';
export interface TradeOff { protects: string; costs: string; fits: string }
export interface ResponseOption { text: string; quality: 0 | 1 | 2; feedback: string; tradeoff?: TradeOff }
export interface Scenario {
  id: string; category: ScenarioCategory; context: 'everyday' | 'professional'; title: string;
  situation: string; facts: string[]; interpretations: string[];
  emotionOptions: string[]; plausibleEmotions: number[];
  responses: ResponseOption[]; skill: string; claimIds: string[];
  difficulty: 1 | 2 | 3;
  /** Threat, coercion or harassment: safety-first feedback and notice (spec 12). */
  safety?: boolean;
  /** Where-to-get-help note shown in the safety panel (verified routes only; see support.ts). */
  support?: string;
  /** Optional branching follow-up: what happens next depends on the first choice; then a second decision. */
  followUp?: { next: string[]; prompt: string; options: ResponseOption[] };
}

/** Layer 1: interactive activities. Every option/item carries its own feedback. No drag-only interactions. */
export type Activity =
  | { type: 'classify'; prompt: string; buckets: string[]; items: { text: string; bucket: number; fb: string }[] }
  | { type: 'sequence'; prompt: string; steps: { text: string; fb: string }[] }
  | { type: 'match'; prompt: string; pairs: { left: string; right: string; fb: string }[] }
  | { type: 'predict' | 'compare'; prompt: string; options: { text: string; good: boolean; fb: string }[] };
/** Layer 2: explanation-back. The app never grades prose; the learner self-assesses against a visible rubric. */
export interface ExplainBack { prompt: string; keyPoints: string[] }
export interface Deep {
  extra?: string; activity: Activity; explain: ExplainBack; apply: string;
  alt: [string, string[], number, string]; prereq?: string[];
}
