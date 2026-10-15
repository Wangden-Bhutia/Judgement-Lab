import { useMemo, useState } from 'react';
import type { AnswerValue, Item, Lesson } from '@judgment-lab/content-schema';
import { evaluateAnswer, type AnswerEvaluation, type LessonProgressState } from '@judgment-lab/core-engine';
import { storage } from './storage';
import { completeLessonProgress, recordAttempt, saveLessonProgress, touchLessonProgress } from './progress';
import { ItemRenderer } from './ItemRenderer';

interface LessonPlayerProps {
  lesson: Lesson;
  itemById: Map<string, Item>;
  onExit: (updatedProgress: Map<string, LessonProgressState>) => void;
  progress: ReadonlyMap<string, LessonProgressState>;
}

export function LessonPlayer({ lesson, itemById, onExit, progress }: LessonPlayerProps) {
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

  const [index, setIndex] = useState(0);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [startedProgress] = useState(() => touchLessonProgress(progress, lesson.id));
  const [finishing, setFinishing] = useState(false);

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
    setFinishing(true);
    const completed = completeLessonProgress(startedProgress, lesson.id);
    await saveLessonProgress(storage, completed);
    onExit(completed);
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
          <p>{evaluation.correct ? 'Correct.' : 'Not quite.'}</p>
          <p>{evaluation.explanation}</p>
          <button onClick={handleNext} disabled={finishing}>
            {isLast ? 'Finish lesson' : 'Next'}
          </button>
        </div>
      )}
      <button className="exit-link" onClick={() => onExit(startedProgress)}>
        Exit lesson
      </button>
    </div>
  );
}
