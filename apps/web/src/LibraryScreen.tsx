import type { ReactNode } from 'react';
import type { Concept, Lesson, Module } from '@judgment-lab/content-schema';
import {
  computeSkillMastery,
  deriveLessonStatus,
  type ItemAttemptRecord,
  type LessonProgressState,
  type LessonStatus,
} from '@judgment-lab/core-engine';

export interface LibraryTrack {
  id: string;
  title: string;
  icon: ReactNode;
  modules: Module[];
  concepts: Concept[];
}

interface LibraryScreenProps {
  tracks: LibraryTrack[];
  lessonById: ReadonlyMap<string, Lesson>;
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

/** Every track's full content, collapsed by default -- the stable place to
 * browse or revisit anything, regardless of whether it's still showing up
 * on Today (a completed track has nothing left to show there at all).
 * Nothing is pre-opened; the user decides which track to look at. */
export function LibraryScreen({ tracks, lessonById, progress, attempts, onSelectLesson }: LibraryScreenProps) {
  return (
    <div className="today-screen">
      <h1>Library</h1>

      {tracks.map((track) => {
        const masteredConcepts = track.concepts.filter((c) => computeSkillMastery(c.id, attempts).mastered);
        const totalLessons = track.modules.reduce((sum, m) => sum + m.lessonIds.length, 0);
        const completedLessons = track.modules
          .flatMap((m) => m.lessonIds)
          .filter((id) => progress.get(id)?.completedAt != null).length;

        return (
          <details key={track.id} className="track-section">
            <summary className="track-section-header">
              <span className="track-section-icon">{track.icon}</span>
              <div>
                <h2>{track.title}</h2>
                <p className="subtitle">
                  {completedLessons} of {totalLessons} lessons completed · {masteredConcepts.length} of{' '}
                  {track.concepts.length} concepts mastered
                </p>
              </div>
              <span className="track-section-chevron" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9 L12 15 L18 9" />
                </svg>
              </span>
            </summary>

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
        );
      })}
    </div>
  );
}
