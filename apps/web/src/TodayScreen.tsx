import type { ReactNode } from 'react';
import type { Concept, Lesson, Module } from '@judgment-lab/content-schema';
import {
  computeSkillMastery,
  deriveLessonStatus,
  type ItemAttemptRecord,
  type LessonProgressState,
  type LessonStatus,
} from '@judgment-lab/core-engine';

export interface TrackSection {
  id: string;
  title: string;
  icon: ReactNode;
  modules: Module[];
  concepts: Concept[];
}

interface TodayScreenProps {
  tracks: TrackSection[];
  lessonById: ReadonlyMap<string, Lesson>;
  progress: ReadonlyMap<string, LessonProgressState>;
  attempts: ItemAttemptRecord[];
  dueReviewCount: number;
  onSelectLesson: (lesson: Lesson) => void;
  onStartReview: () => void;
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
  tracks,
  lessonById,
  progress,
  attempts,
  dueReviewCount,
  onSelectLesson,
  onStartReview,
}: TodayScreenProps) {
  return (
    <div className="today-screen">
      <h1>Today</h1>

      {dueReviewCount > 0 && (
        <section className="today-card review-card">
          <p className="today-card-module">Spaced review</p>
          <h2>
            {dueReviewCount} {dueReviewCount === 1 ? 'concept is' : 'concepts are'} due for review
          </h2>
          <p>Quick retrieval checks across everything you've learned so far, to keep it from fading.</p>
          <button onClick={onStartReview}>Start review</button>
        </section>
      )}

      {tracks.map((track) => {
        const masteredConcepts = track.concepts.filter((c) => computeSkillMastery(c.id, attempts).mastered);
        const totalLessons = track.modules.reduce((sum, m) => sum + m.lessonIds.length, 0);
        const completedLessons = track.modules
          .flatMap((m) => m.lessonIds)
          .filter((id) => progress.get(id)?.completedAt != null).length;
        const next = findNextLesson(track.modules, lessonById, progress);

        return (
          <section key={track.id} id={`track-${track.id}`} className="track-section">
            <div className="track-section-header">
              <span className="track-section-icon">{track.icon}</span>
              <div>
                <h2>{track.title}</h2>
                <p className="subtitle">
                  {completedLessons} of {totalLessons} lessons completed · {masteredConcepts.length} of{' '}
                  {track.concepts.length} concepts mastered
                </p>
              </div>
            </div>

            {next ? (
              <section className="today-card">
                <p className="today-card-module">{next.module.title}</p>
                <h2>{next.lesson.title}</h2>
                <p>{next.lesson.objectives[0]}</p>
                <button onClick={() => onSelectLesson(next.lesson)}>{STATUS_LABEL[next.status]}</button>
              </section>
            ) : (
              <section className="today-card today-card-done">
                <h2>You've completed every lesson in {track.title}.</h2>
                <p>Browse the full syllabus below to revisit anything.</p>
              </section>
            )}

            <details className="syllabus">
              <summary>Browse all {totalLessons} lessons</summary>
              {track.modules.map((module) => (
                <section key={module.id} className="module-section">
                  <h3 className="module-title">{module.title}</h3>
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
          </section>
        );
      })}
    </div>
  );
}
