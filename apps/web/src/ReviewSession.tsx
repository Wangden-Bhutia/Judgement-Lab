import { useMemo, useState } from 'react';
import type { AnswerValue, Item } from '@judgment-lab/content-schema';
import { evaluateAnswer, type AnswerEvaluation } from '@judgment-lab/core-engine';
import { storage } from './storage';
import { recordAttempt } from './progress';
import { ItemRenderer } from './ItemRenderer';

interface ReviewSessionProps {
  dueConceptIds: string[];
  itemsByConcept: ReadonlyMap<string, Item[]>;
  onExit: () => void;
}

/** Prefers an auto-graded item over own_words for a quick review -- self-
 * assessed correctness is weaker evidence, so only fall back to it when
 * nothing else exists for the concept. */
function pickReviewItem(items: Item[] | undefined): Item | undefined {
  if (!items || items.length === 0) return undefined;
  return items.find((item) => item.type !== 'own_words') ?? items[0];
}

export function ReviewSession({ dueConceptIds, itemsByConcept, onExit }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);

  const conceptId = dueConceptIds[index];
  const currentItem = useMemo(
    () => pickReviewItem(conceptId ? itemsByConcept.get(conceptId) : undefined),
    [conceptId, itemsByConcept]
  );
  const isLast = index === dueConceptIds.length - 1;

  if (!currentItem) {
    return (
      <div className="lesson-player">
        <p>Nothing to review right now.</p>
        <button onClick={onExit}>Back to Today</button>
      </div>
    );
  }

  async function handleSubmit(value: AnswerValue) {
    const result = evaluateAnswer(currentItem!, { itemId: currentItem!.id, value });
    setEvaluation(result);
    await recordAttempt(storage, {
      itemId: currentItem!.id,
      conceptId: currentItem!.concept,
      correct: result.correct,
      source: 'review',
    });
  }

  function handleNext() {
    setEvaluation(null);
    if (isLast) {
      onExit();
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="lesson-player">
      <div className="lesson-player-header">
        <h2>Review</h2>
        <span className="step-counter">
          {index + 1} / {dueConceptIds.length}
        </span>
      </div>
      {!evaluation ? (
        <ItemRenderer item={currentItem} onSubmit={handleSubmit} />
      ) : (
        <div className={`feedback ${evaluation.correct ? 'correct' : 'incorrect'}`}>
          <p>{evaluation.correct ? 'Correct.' : 'Not quite.'}</p>
          <p>{evaluation.explanation}</p>
          <button onClick={handleNext}>{isLast ? 'Done' : 'Next'}</button>
        </div>
      )}
      <button className="exit-link" onClick={onExit}>
        Exit review
      </button>
    </div>
  );
}
