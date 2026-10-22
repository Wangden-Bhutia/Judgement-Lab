import { useMemo, useState } from 'react';
import type { AnswerValue, Item, Lesson, Misconception } from '@judgment-lab/content-schema';
import { evaluateAnswer, type AnswerEvaluation, type LessonProgressState } from '@judgment-lab/core-engine';
import { storage } from './storage';
import { completeLessonProgress, recordAttempt, saveLessonProgress, touchLessonProgress } from './progress';
import { ItemRenderer } from './ItemRenderer';
import { FeedbackBody } from './FeedbackBody';

interface LessonPlayerProps {
  lesson: Lesson;
  itemById: Map<string, Item>;
  onExit: (updatedProgress: Map<string, LessonProgressState>) => void;
  progress: ReadonlyMap<string, LessonProgressState>;
  misconceptionById: ReadonlyMap<string, Misconception>;
}

type Phase = 'teach' | 'items' | 'closing';

export function LessonPlayer({ lesson, itemById, onExit, progress, misconceptionById }: LessonPlayerProps) {
  const order = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of [...lesson.interactiveItemIds, ...lesson.masteryItemIds]) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    if (lesson.explanationBackItemId && !seen.has(lesson.explanationBackItemId)) {
      ids.push(lesson.explanationBackItemId);
    }
    return ids;
  }, [lesson]);

  const masterySet = useMemo(() => new Set(lesson.masteryItemIds), [lesson]);
  const hasClosing = Boolean(lesson.apply || lesson.reflect);

  const [phase, setPhase] = useState<Phase>(lesson.teach?.length ? 'teach' : 'items');
  const [index, setIndex] = useState(0);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [startedProgress] = useState(() => touchLessonProgress(progress, lesson.id));
  const [finishing, setFinishing] = useState(false);

  async function finish() {
    setFinishing(true);
    const completed = completeLessonProgress(startedProgress, lesson.id);
    await saveLessonProgress(storage, completed);
    onExit(completed);
  }

  if (phase === 'teach') {
    return (
      <div className="lesson-player">
        <div className="lesson-player-header">
          <h2>{lesson.title}</h2>
        </div>
        <div className="teach-screen">
          {lesson.teach!.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          {lesson.example && (
            <div className="teach-example">
              <strong>Example:</strong>
              <p>{lesson.example}</p>
            </div>
          )}
          {lesson.practicePrompts && lesson.practicePrompts.length > 0 && (
            <div className="teach-practice">
              <strong>Before you continue, try this from memory:</strong>
              <ol>
                {lesson.practicePrompts.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <div className="button-row">
          <button onClick={() => setPhase('items')}>
            {order.length > 0 ? 'Start practice' : 'Continue'}
          </button>
          <button className="exit-link" onClick={() => onExit(startedProgress)}>
            Exit lesson
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'closing') {
    return (
      <div className="lesson-player">
        <div className="lesson-player-header">
          <h2>{lesson.title}</h2>
        </div>
        <div className="teach-screen">
          {lesson.apply && (
            <div className="teach-example">
              <strong>Try this in real life:</strong>
              <p>{lesson.apply}</p>
            </div>
          )}
          {lesson.reflect && (
            <div className="teach-practice">
              <strong>Reflect:</strong>
              <p>{lesson.reflect}</p>
            </div>
          )}
        </div>
        <button onClick={finish} disabled={finishing}>
          Done
        </button>
      </div>
    );
  }

  const currentItemId = order[index];
  const currentItem = currentItemId ? itemById.get(currentItemId) : undefined;
  const isLast = index === order.length - 1;

  if (!currentItem) {
    return (
      <div className="lesson-player">
        <p>This lesson has no items yet.</p>
        <button onClick={() => onExit(startedProgress)}>Back to Today</button>
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
      source: masterySet.has(currentItem!.id) ? 'checkpoint' : 'lesson',
    });
  }

  async function handleNext() {
    setEvaluation(null);
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    if (hasClosing) {
      setPhase('closing');
      return;
    }
    await finish();
  }

  return (
    <div className="lesson-player">
      <div className="lesson-player-header">
        <h2>{lesson.title}</h2>
        <span className="step-counter">
          {index + 1} / {order.length}
        </span>
      </div>
      {!evaluation ? (
        <ItemRenderer item={currentItem} onSubmit={handleSubmit} />
      ) : (
        <div className={`feedback ${evaluation.correct ? 'correct' : 'incorrect'}`}>
          <FeedbackBody evaluation={evaluation} misconceptionById={misconceptionById} />
          <button onClick={handleNext} disabled={finishing}>
            {isLast ? (hasClosing ? 'Continue' : 'Finish lesson') : 'Next'}
          </button>
        </div>
      )}
      <button className="exit-link" onClick={() => onExit(startedProgress)}>
        Exit lesson
      </button>
    </div>
  );
}
