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

/** Most recent lastAttemptAt across a track's lessons, as a timestamp --
 * 0 if the track has never been touched. Used to pick which track gets
 * today's one card: untouched tracks (0) sort first, then whichever
 * track has gone longest without activity once everything has some
 * history. No manual picker -- Library is where you go for something
 * specific; Today recommends exactly one thing. */
function lastActivity(modules: Module[], progress: ReadonlyMap<string, LessonProgressState>): number {
  let latest = 0;
  for (const module of modules) {
    for (const lessonId of module.lessonIds) {
      const at = progress.get(lessonId)?.lastAttemptAt;
      if (at) latest = Math.max(latest, new Date(at).getTime());
    }
  }
  return latest;
}

/** Deliberately lean: Today recommends exactly one thing -- the due
 * reviews if any exist (time-sensitive), otherwise one track's next
 * lesson (the track least recently practised). Not a menu of all three
 * tracks' cards, and not the full syllabus either (that's Library's job).
 */
export function TodayScreen({ tracks, lessonById, progress, dueReviewCount, onSelectLesson, onStartReview }: TodayScreenProps) {
  if (dueReviewCount > 0) {
    return (
      <div className="today-screen">
        <h1>Today</h1>
        <section className="today-card review-card">
          <p className="today-card-module">Spaced review</p>
          <h2>
            {dueReviewCount} {dueReviewCount === 1 ? 'concept is' : 'concepts are'} due for review
          </h2>
          <p>Quick retrieval checks across everything you've learned so far, to keep it from fading.</p>
          <button onClick={onStartReview}>Start review</button>
        </section>
      </div>
    );
  }

  const candidates = tracks
    .map((track) => ({ track, next: findNextLesson(track.modules, lessonById, progress) }))
    .filter((c): c is { track: TrackSection; next: NextLesson } => c.next !== null)
    .sort((a, b) => lastActivity(a.track.modules, progress) - lastActivity(b.track.modules, progress));

  const picked = candidates[0];

  if (!picked) {
    return (
      <div className="today-screen">
        <h1>Today</h1>
        <section className="today-card today-card-done">
          <h2>Every lesson, in every track, is complete.</h2>
          <p>Nothing left to start today -- visit Library to revisit anything, or Settings to reset and begin again.</p>
        </section>
      </div>
    );
  }

  const { track, next } = picked;
  return (
    <div className="today-screen">
      <h1>Today</h1>
      <section className="today-card">
        <div className="today-card-track">
          <span className="today-card-track-icon">{track.icon}</span>
          <h2>{track.title}</h2>
        </div>
        <p className="today-card-module">{next.module.title}</p>
        <h3>{next.lesson.title}</h3>
        <p>{next.lesson.objectives[0]}</p>
        <button onClick={() => onSelectLesson(next.lesson)}>{STATUS_LABEL[next.status]}</button>
      </section>
    </div>
  );
}
