import type { ReactNode } from 'react';
import type { Lesson, Module } from '@judgment-lab/content-schema';
import { deriveLessonStatus, type LessonProgressState, type LessonStatus } from '@judgment-lab/core-engine';

export interface TrackSection {
  id: string;
  title: string;
  icon: ReactNode;
  modules: Module[];
}

interface TodayScreenProps {
  tracks: TrackSection[];
  lessonById: ReadonlyMap<string, Lesson>;
  progress: ReadonlyMap<string, LessonProgressState>;
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

/**
 * Deliberately lean: just what's due for review and one card per track
 * that still has something to practise -- not the full syllabus (that's
 * Library's job now). Showing both here was the original bug: the bottom
 * nav's track links did nothing but scroll to content already on screen.
 */
export function TodayScreen({ tracks, lessonById, progress, dueReviewCount, onSelectLesson, onStartReview }: TodayScreenProps) {
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
        const next = findNextLesson(track.modules, lessonById, progress);

        if (!next) {
          return (
            <div key={track.id} className="track-complete-chip">
              <span className="track-complete-icon">{track.icon}</span>
              <span>{track.title} — every lesson complete. Revisit it from Library.</span>
            </div>
          );
        }

        return (
          <section key={track.id} className="today-card">
            <div className="today-card-track">
              <span className="today-card-track-icon">{track.icon}</span>
              <span>{track.title}</span>
            </div>
            <p className="today-card-module">{next.module.title}</p>
            <h2>{next.lesson.title}</h2>
            <p>{next.lesson.objectives[0]}</p>
            <button onClick={() => onSelectLesson(next.lesson)}>{STATUS_LABEL[next.status]}</button>
          </section>
        );
      })}
    </div>
  );
}
