import { useMemo, useState } from 'react';
import type { AnswerValue, Item, Misconception } from '@judgment-lab/content-schema';
import { evaluateAnswer, type AnswerEvaluation, type ItemAttemptRecord } from '@judgment-lab/core-engine';
import { storage } from './storage';
import { recordAttempt } from './progress';
import { ItemRenderer } from './ItemRenderer';
import { FeedbackBody } from './FeedbackBody';
import { pickReviewItem } from './reviewSelection';

interface DueConcept {
  trackId: string;
  conceptId: string;
}

interface ReviewSessionProps {
  dueConcepts: DueConcept[];
  /** trackId -> conceptId -> that track's items of that concept. Keyed by
   * trackId as well as conceptId (not just conceptId) because concept ids
   * aren't namespaced per track the way lesson/item ids are -- nothing
   * currently collides across tracks, but nothing enforces that either,
   * so a blended cross-track review shouldn't rely on it. */
  itemsByConcept: ReadonlyMap<string, ReadonlyMap<string, Item[]>>;
  attempts: ItemAttemptRecord[];
  misconceptionById: ReadonlyMap<string, Misconception>;
  onExit: () => void;
}

export function ReviewSession({ dueConcepts, itemsByConcept, attempts, misconceptionById, onExit }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);

  const due = dueConcepts[index];
  const currentItem = useMemo(
    () => pickReviewItem(due ? itemsByConcept.get(due.trackId)?.get(due.conceptId) : undefined, attempts),
    [due, itemsByConcept, attempts]
  );
  const isLast = index === dueConcepts.length - 1;

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
          {index + 1} / {dueConcepts.length}
        </span>
      </div>
      {!evaluation ? (
        <ItemRenderer item={currentItem} onSubmit={handleSubmit} />
      ) : (
        <div className={`feedback ${evaluation.correct ? 'correct' : 'incorrect'}`}>
          <FeedbackBody evaluation={evaluation} misconceptionById={misconceptionById} />
          <button onClick={handleNext}>{isLast ? 'Done' : 'Next'}</button>
        </div>
      )}
      <button className="exit-link" onClick={onExit}>
        Exit review
      </button>
    </div>
  );
}
