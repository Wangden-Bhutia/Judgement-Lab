import { useEffect, useState } from 'react';
import type { Item, Lesson } from '@judgment-lab/content-schema';
import type { ItemAttemptRecord, LessonProgressState } from '@judgment-lab/core-engine';
import { strategicCurriculum, strategicItems } from '@judgment-lab/track-strategic/content';
import { storage } from './storage';
import { loadAttempts, loadLessonProgress } from './progress';
import { TodayScreen } from './TodayScreen';
import { LessonPlayer } from './LessonPlayer';
import './App.css';

const itemById = new Map<string, Item>(strategicItems.map((item) => [item.id, item]));
const track = strategicCurriculum.tracks[0]!;
const lessonById = new Map(strategicCurriculum.lessons.map((lesson) => [lesson.id, lesson]));
// Module order (strategicCurriculum.modules is already sequence-ordered),
// each module's own lessonIds order -- NOT a global sort by lesson.sequence,
// which is only unique within a module (every module's first lesson has
// sequence 1).
const modules = strategicCurriculum.modules.slice().sort((a, b) => a.sequence - b.sequence);
const concepts = strategicCurriculum.concepts;

export default function App() {
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
    <TodayScreen
      trackTitle={track.title}
      modules={modules}
      lessonById={lessonById}
      concepts={concepts}
      progress={progress}
      attempts={attempts}
      onSelectLesson={setActiveLesson}
    />
  );
}
