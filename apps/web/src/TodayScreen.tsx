import type { Concept, Lesson } from '@judgment-lab/content-schema';
import {
  computeSkillMastery,
  deriveLessonStatus,
  type ItemAttemptRecord,
  type LessonProgressState,
  type LessonStatus,
} from '@judgment-lab/core-engine';

interface TodayScreenProps {
  trackTitle: string;
  lessons: Lesson[];
  concepts: Concept[];
  progress: ReadonlyMap<string, LessonProgressState>;
  attempts: ItemAttemptRecord[];
  onSelectLesson: (lesson: Lesson) => void;
}

const STATUS_LABEL: Record<LessonStatus, string> = {
  locked: 'Locked',
  available: 'Start',
  in_progress: 'Continue',
  completed: 'Completed',
};

export function TodayScreen({ trackTitle, lessons, concepts, progress, attempts, onSelectLesson }: TodayScreenProps) {
  const masteredConcepts = concepts.filter((c) => computeSkillMastery(c.id, attempts).mastered);

  return (
    <div className="today-screen">
      <h1>{trackTitle}</h1>
      <p className="subtitle">
        {masteredConcepts.length} of {concepts.length} concepts mastered
      </p>
      <ul className="lesson-list">
        {lessons.map((lesson) => {
          const status = deriveLessonStatus(lesson, progress);
          const locked = status === 'locked';
          return (
            <li key={lesson.id} className={`lesson-card status-${status}`}>
              <div className="lesson-card-main">
                <h3>{lesson.title}</h3>
                <p>{lesson.objectives[0]}</p>
              </div>
              <button disabled={locked} onClick={() => onSelectLesson(lesson)}>
                {STATUS_LABEL[status]}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
