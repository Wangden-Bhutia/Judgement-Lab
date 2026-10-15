import { useEffect, useMemo, useState } from 'react';
import type { Item, Lesson } from '@judgment-lab/content-schema';
import type { ItemAttemptRecord, LessonProgressState } from '@judgment-lab/core-engine';
import { storage } from './storage';
import { loadAttempts, loadLessonProgress } from './progress';
import { TodayScreen } from './TodayScreen';
import { LessonPlayer } from './LessonPlayer';
import { TrackSwitcher } from './TrackSwitcher';
import { TRACKS } from './tracks';
import './App.css';

export default function App() {
  const [trackId, setTrackId] = useState(TRACKS[0]!.id);
  const [progress, setProgress] = useState<Map<string, LessonProgressState>>(new Map());
  const [attempts, setAttempts] = useState<ItemAttemptRecord[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([loadLessonProgress(storage), loadAttempts(storage)]).then(([p, a]) => {
      setProgress(p);
      setAttempts(a);
      setLoaded(true);
    });
  }, []);

  const activeTrack = TRACKS.find((t) => t.id === trackId)!;
  // Lesson/item/concept ids are namespaced per track (e.g. "strategic-..."
  // vs "emotional-..."), so a single shared progress/attempts store is
  // safe to reuse across tracks without any key collisions.
  const itemById = useMemo(
    () => new Map<string, Item>(activeTrack.items.map((item) => [item.id, item])),
    [activeTrack]
  );
  const lessonById = useMemo(
    () => new Map(activeTrack.curriculum.lessons.map((lesson) => [lesson.id, lesson])),
    [activeTrack]
  );
  const modules = useMemo(
    () => activeTrack.curriculum.modules.slice().sort((a, b) => a.sequence - b.sequence),
    [activeTrack]
  );

  if (!loaded) {
    return <div className="loading">Loading…</div>;
  }

  if (activeLesson) {
    return (
      <LessonPlayer
        lesson={activeLesson}
        itemById={itemById}
        progress={progress}
        onExit={(updated) => {
          setProgress(updated);
          setActiveLesson(null);
          void loadAttempts(storage).then(setAttempts);
        }}
      />
    );
  }

  return (
    <>
      <TrackSwitcher tracks={TRACKS} selectedId={trackId} onSelect={setTrackId} />
      <TodayScreen
        trackTitle={activeTrack.title}
        modules={modules}
        lessonById={lessonById}
        concepts={activeTrack.curriculum.concepts}
        progress={progress}
        attempts={attempts}
        onSelectLesson={setActiveLesson}
      />
    </>
  );
}
