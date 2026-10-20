import type { Misconception } from '@judgment-lab/content-schema';
import type { AnswerEvaluation } from '@judgment-lab/core-engine';

interface FeedbackBodyProps {
  evaluation: AnswerEvaluation;
  misconceptionById: ReadonlyMap<string, Misconception>;
}

/**
 * The verdict and explanation shown after an item is submitted. Shared by
 * LessonPlayer and ReviewSession, each of which wraps it in its own
 * feedback div and "Next"/"Finish" button (different enough per caller not
 * to share).
 *
 * When the wrong answer was tagged with a specific misconception, names
 * that reasoning error directly -- every distractor across all three
 * tracks is authored with one, but until now nothing in the UI ever read
 * it, so a wrong answer always got the same static item.explanation
 * regardless of which specific mistake it revealed.
 */
export function FeedbackBody({ evaluation, misconceptionById }: FeedbackBodyProps) {
  const misconceptions = evaluation.misconceptions
    .map((id) => misconceptionById.get(id))
    .filter((m): m is Misconception => m !== undefined);

  return (
    <>
      <p>{evaluation.correct ? 'Correct.' : 'Not quite.'}</p>
      {misconceptions.map((m) => (
        <p key={m.id} className="feedback-misconception">
          {m.description}
        </p>
      ))}
      <p>{evaluation.explanation}</p>
    </>
  );
}
