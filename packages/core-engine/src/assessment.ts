import {
  AnswerSubmission,
  ConceptId,
  Item,
  MisconceptionId,
} from '@judgment-lab/content-schema';

export interface AnswerEvaluation {
  itemId: string;
  correct: boolean;
  misconceptions: MisconceptionId[];
  demonstratedConcepts: ConceptId[];
  explanation: string;
}

/**
 * Scores one submission against its item. Every item type resolves to a
 * single correct/incorrect verdict, since that binary feeds the mastery
 * model (see mastery.ts) — own_words is the one exception: it is never
 * auto-graded, and "correct" there reflects the learner's own self-rating
 * against the rubric, not anything the engine judged.
 */
export function evaluateAnswer(item: Item, submission: AnswerSubmission): AnswerEvaluation {
  if (submission.itemId !== item.id) {
    throw new Error(`Submission itemId "${submission.itemId}" does not match item "${item.id}"`);
  }
  if (submission.value.itemType !== item.type) {
    throw new Error(`Submission type "${submission.value.itemType}" does not match item type "${item.type}"`);
  }

  switch (item.type) {
    case 'reason_choice': {
      const value = submission.value as Extract<AnswerSubmission['value'], { itemType: 'reason_choice' }>;
      const correct =
        value.selectedOptionIds.length > 0 &&
        value.selectedOptionIds.every((id) => item.acceptableAnswers.includes(id));
      const selectedOptions = item.options.filter((o) => value.selectedOptionIds.includes(o.id));
      const misconceptions = selectedOptions.map((o) => o.misconception).filter((m): m is string => Boolean(m));
      const demonstratedConcepts = correct ? [item.concept] : [];
      return { itemId: item.id, correct, misconceptions, demonstratedConcepts, explanation: item.explanation };
    }

    case 'fill_in': {
      const value = submission.value as Extract<AnswerSubmission['value'], { itemType: 'fill_in' }>;
      const normalise = (s: string) => s.trim().toLowerCase();
      const correct = item.slots.every((slot) => {
        const submitted = value.values[slot.id];
        return submitted !== undefined && slot.acceptedValues.some((accepted) => normalise(accepted) === normalise(submitted));
      });
      return {
        itemId: item.id,
        correct,
        misconceptions: [],
        demonstratedConcepts: correct ? [item.concept] : [],
        explanation: item.explanation,
      };
    }

    case 'own_words': {
      const value = submission.value as Extract<AnswerSubmission['value'], { itemType: 'own_words' }>;
      const correct = value.selfAssessedCriteriaMet.length > 0 && value.selfAssessedCriteriaMet.every(Boolean);
      return {
        itemId: item.id,
        correct,
        misconceptions: [],
        demonstratedConcepts: correct ? [item.concept] : [],
        explanation: item.modelAnswer,
      };
    }

    case 'classify': {
      const value = submission.value as Extract<AnswerSubmission['value'], { itemType: 'classify' }>;
      const correct = item.entries.every((entry) => value.placements[entry.id] === entry.categoryId);
      return {
        itemId: item.id,
        correct,
        misconceptions: [],
        demonstratedConcepts: correct ? [item.concept] : [],
        explanation: item.explanation,
      };
    }

    case 'sequence': {
      const value = submission.value as Extract<AnswerSubmission['value'], { itemType: 'sequence' }>;
      const correct =
        value.order.length === item.correctOrder.length &&
        value.order.every((id, index) => id === item.correctOrder[index]);
      return {
        itemId: item.id,
        correct,
        misconceptions: [],
        demonstratedConcepts: correct ? [item.concept] : [],
        explanation: item.explanation,
      };
    }

    case 'match': {
      const value = submission.value as Extract<AnswerSubmission['value'], { itemType: 'match' }>;
      const correctSet = new Set(item.correctPairs.map((p) => `${p.leftId}:${p.rightId}`));
      const submittedSet = new Set(value.pairs.map((p) => `${p.leftId}:${p.rightId}`));
      const correct =
        correctSet.size === submittedSet.size && [...correctSet].every((pair) => submittedSet.has(pair));
      return {
        itemId: item.id,
        correct,
        misconceptions: [],
        demonstratedConcepts: correct ? [item.concept] : [],
        explanation: item.explanation,
      };
    }

    case 'compare': {
      const value = submission.value as Extract<AnswerSubmission['value'], { itemType: 'compare' }>;
      const correct = item.acceptableAnswers.includes(value.answer);
      return {
        itemId: item.id,
        correct,
        misconceptions: [],
        demonstratedConcepts: correct ? [item.concept] : [],
        explanation: item.explanation,
      };
    }

    case 'predict': {
      const value = submission.value as Extract<AnswerSubmission['value'], { itemType: 'predict' }>;
      const correct = value.selectedOptionId === item.actualOutcomeOptionId;
      const selectedOption = item.options.find((o) => o.id === value.selectedOptionId);
      const misconceptions = selectedOption?.misconception ? [selectedOption.misconception] : [];
      return {
        itemId: item.id,
        correct,
        misconceptions,
        demonstratedConcepts: correct ? [item.concept] : [],
        explanation: item.explanation,
      };
    }
  }
}
