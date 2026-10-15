// Domain model shared by every track. Framework-independent: no React, no
// storage, no engine logic here — just the shape of content and the shape
// of a learner's answer to it.

export type TrackId = string;
export type ModuleId = string;
export type LessonId = string;
export type ItemId = string;
export type ConceptId = string;
export type MisconceptionId = string;

export type ItemType =
  | 'reason_choice'
  | 'fill_in'
  | 'own_words'
  | 'classify'
  | 'sequence'
  | 'match'
  | 'compare'
  | 'predict';

export interface ChoiceOption {
  id: string;
  text: string;
  /** Present when choosing this option reflects a specific reasoning error. */
  misconception?: MisconceptionId;
  /** Present when choosing this option demonstrates a specific concept. */
  conceptTag?: ConceptId;
}

interface ItemBase {
  id: ItemId;
  concept: ConceptId;
  prompt: string;
}

/** A multiple-choice question that asks for the best-supported reasoning, not just a fact. */
export interface ReasonChoiceItem extends ItemBase {
  type: 'reason_choice';
  options: ChoiceOption[];
  acceptableAnswers: string[];
  explanation: string;
}

/** A short structured answer matched (case-insensitively) against a set of accepted values. */
export interface FillInSlot {
  id: string;
  /** Accepted values for this blank, matched case-insensitively. */
  acceptedValues: string[];
}

/**
 * One or more blanks in a single prompt. A prompt with more than one blank
 * references each by id (e.g. "...your payoff is {slot:s1} and theirs is
 * {slot:s2}"); the reference convention is presentational and up to
 * whatever renders the prompt, not enforced here.
 */
export interface FillInItem extends ItemBase {
  type: 'fill_in';
  slots: FillInSlot[];
  explanation: string;
}

/** Free text, never auto-graded. The learner self-assesses against a model answer and rubric. */
export interface OwnWordsItem extends ItemBase {
  type: 'own_words';
  modelAnswer: string;
  rubric: string[];
}

/** Sort several labelled things into named categories. */
export interface ClassifyItem extends ItemBase {
  type: 'classify';
  categories: { id: string; label: string }[];
  entries: { id: string; label: string; categoryId: string }[];
  explanation: string;
}

/** Put steps or events into the correct order. */
export interface SequenceItem extends ItemBase {
  type: 'sequence';
  steps: { id: string; label: string }[];
  correctOrder: string[];
  explanation: string;
}

/** Pair items from two columns. */
export interface MatchItem extends ItemBase {
  type: 'match';
  left: { id: string; label: string }[];
  right: { id: string; label: string }[];
  correctPairs: { leftId: string; rightId: string }[];
  explanation: string;
}

/** Compare two named options against each other on a specific dimension. */
export interface CompareItem extends ItemBase {
  type: 'compare';
  optionA: string;
  optionB: string;
  question: string;
  acceptableAnswers: ('A' | 'B' | 'both' | 'neither')[];
  explanation: string;
}

/** Predict an outcome before it's revealed, then compare against what happened. */
export interface PredictItem extends ItemBase {
  type: 'predict';
  situation: string;
  options: ChoiceOption[];
  actualOutcomeOptionId: string;
  explanation: string;
}

export type Item =
  | ReasonChoiceItem
  | FillInItem
  | OwnWordsItem
  | ClassifyItem
  | SequenceItem
  | MatchItem
  | CompareItem
  | PredictItem;

export type LessonStage =
  | 'objectives'
  | 'concept_introduction'
  | 'worked_example'
  | 'interactive_learning'
  | 'explanation_back'
  | 'mastery_assessment';

export interface Lesson {
  id: LessonId;
  trackId: TrackId;
  moduleId: ModuleId;
  sequence: number;
  title: string;
  objectives: string[];
  concepts: ConceptId[];
  prerequisites: LessonId[];
  /** Item ids used for layer 1 (interactive practice, not scored toward mastery). */
  interactiveItemIds: ItemId[];
  /** Item ids used for layer 3 (mastery assessment; scored with delayed evidence — see core-engine). */
  masteryItemIds: ItemId[];
  /** Item id used for layer 2 (explanation-back), if this lesson has one. */
  explanationBackItemId?: ItemId;
  contentVersion: number;
}

export interface Module {
  id: ModuleId;
  trackId: TrackId;
  sequence: number;
  title: string;
  lessonIds: LessonId[];
}

export interface Track {
  id: TrackId;
  title: string;
  description: string;
  moduleIds: ModuleId[];
}

export interface Concept {
  id: ConceptId;
  trackId: TrackId;
  moduleId: ModuleId;
  label: string;
}

export interface Misconception {
  id: MisconceptionId;
  trackId: TrackId;
  label: string;
  /** Describes the reasoning error, not a trait of the learner. */
  description: string;
}

export interface Curriculum {
  contentVersion: number;
  tracks: Track[];
  modules: Module[];
  lessons: Lesson[];
  concepts: Concept[];
  misconceptions: Misconception[];
}

// --- Answer submissions ---------------------------------------------------

export type AnswerValue =
  | { itemType: 'reason_choice'; selectedOptionIds: string[] }
  | { itemType: 'fill_in'; values: Record<string, string> }
  | { itemType: 'own_words'; draft: string; selfAssessedCriteriaMet: boolean[] }
  | { itemType: 'classify'; placements: Record<string, string> }
  | { itemType: 'sequence'; order: string[] }
  | { itemType: 'match'; pairs: { leftId: string; rightId: string }[] }
  | { itemType: 'compare'; answer: 'A' | 'B' | 'both' | 'neither' }
  | { itemType: 'predict'; selectedOptionId: string };

export interface AnswerSubmission {
  itemId: ItemId;
  value: AnswerValue;
}
