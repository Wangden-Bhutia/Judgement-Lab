import type { Concept, Lesson, Module } from '@judgment-lab/content-schema';
import {
  computeSkillMastery,
  deriveLessonStatus,
  type ItemAttemptRecord,
  type LessonProgressState,
  type LessonStatus,
} from '@judgment-lab/core-engine';

interface TodayScreenProps {
  trackTitle: string;
  modules: Module[];
  lessonById: ReadonlyMap<string, Lesson>;
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

interface NextLesson {
  lesson: Lesson;
  module: Module;
  status: LessonStatus;
}

/** The earliest lesson, in curriculum order, that isn't locked or already
 * completed -- i.e. what "today's practice" actually is for a linear,
 * prerequisite-gated curriculum. */
function findNextLesson(
  modules: Module[],
  lessonById: ReadonlyMap<string, Lesson>,
  progress: ReadonlyMap<string, LessonProgressState>
): NextLesson | null {
  for (const module of modules) {
    for (const lessonId of module.lessonIds) {
      const lesson = lessonById.get(lessonId);
      if (!lesson) continue;
      const status = deriveLessonStatus(lesson, progress);
      if (status === 'available' || status === 'in_progress') {
        return { lesson, module, status };
      }
    }
  }
  return null;
}

export function TodayScreen({
  trackTitle,
  modules,
  lessonById,
  concepts,
  progress,
  attempts,
  onSelectLesson,
}: TodayScreenProps) {
  const masteredConcepts = concepts.filter((c) => computeSkillMastery(c.id, attempts).mastered);
  const totalLessons = modules.reduce((sum, m) => sum + m.lessonIds.length, 0);
  const completedLessons = [...progress.values()].filter((p) => p.completedAt != null).length;
  const next = findNextLesson(modules, lessonById, progress);

  return (
    <div className="today-screen">
      <h1>{trackTitle}</h1>
      <p className="subtitle">
        {completedLessons} of {totalLessons} lessons completed · {masteredConcepts.length} of {concepts.length}{' '}
        concepts mastered
      </p>

      {next ? (
        <section className="today-card">
          <p className="today-card-module">{next.module.title}</p>
          <h2>{next.lesson.title}</h2>
          <p>{next.lesson.objectives[0]}</p>
          <button onClick={() => onSelectLesson(next.lesson)}>{STATUS_LABEL[next.status]}</button>
        </section>
      ) : (
        <section className="today-card today-card-done">
          <h2>You've completed every lesson in {trackTitle}.</h2>
          <p>Browse the full syllabus below to revisit anything.</p>
        </section>
      )}

      <details className="syllabus">
        <summary>Browse all {totalLessons} lessons</summary>
        {modules.map((module) => (
          <section key={module.id} className="module-section">
            <h2 className="module-title">{module.title}</h2>
            <ul className="lesson-list">
              {module.lessonIds.map((lessonId) => {
                const lesson = lessonById.get(lessonId);
                if (!lesson) return null;
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
          </section>
        ))}
      </details>
    </div>
  );
}
