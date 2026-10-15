import { useEffect, useMemo, useState } from 'react';
import type { Item, Lesson } from '@judgment-lab/content-schema';
import { buildRetentionQueue, type ConceptReviewState, type ItemAttemptRecord, type LessonProgressState } from '@judgment-lab/core-engine';
import { storage } from './storage';
import { loadAttempts, loadLessonProgress, loadReviewState } from './progress';
import { TodayScreen } from './TodayScreen';
import { LessonPlayer } from './LessonPlayer';
import { ReviewSession } from './ReviewSession';
import { TrackSwitcher } from './TrackSwitcher';
import { TRACKS } from './tracks';
import './App.css';

export default function App() {
  const [trackId, setTrackId] = useState(TRACKS[0]!.id);
  const [progress, setProgress] = useState<Map<string, LessonProgressState>>(new Map());
  const [attempts, setAttempts] = useState<ItemAttemptRecord[]>([]);
  const [reviewState, setReviewState] = useState<Map<string, ConceptReviewState>>(new Map());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeReview, setActiveReview] = useState<string[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([loadLessonProgress(storage), loadAttempts(storage), loadReviewState(storage)]).then(
      ([p, a, r]) => {
        setProgress(p);
        setAttempts(a);
        setReviewState(r);
        setLoaded(true);
      }
    );
  }, []);

  const activeTrack = TRACKS.find((t) => t.id === trackId)!;
  // Lesson/item/concept ids are namespaced per track (e.g. "strategic-..."
  // vs "emotional-..."), so a single shared progress/attempts/review store
  // is safe to reuse across tracks without any key collisions.
  const itemById = useMemo(
    () => new Map<string, Item>(activeTrack.items.map((item) => [item.id, item])),
    [activeTrack]
  );
  const itemsByConcept = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of activeTrack.items) {
      const list = map.get(item.concept) ?? [];
      list.push(item);
      map.set(item.concept, list);
    }
    return map;
  }, [activeTrack]);
  const lessonById = useMemo(
    () => new Map(activeTrack.curriculum.lessons.map((lesson) => [lesson.id, lesson])),
    [activeTrack]
  );
  const modules = useMemo(
    () => activeTrack.curriculum.modules.slice().sort((a, b) => a.sequence - b.sequence),
    [activeTrack]
  );
  const dueReviews = useMemo(() => {
    const trackConceptIds = new Set(activeTrack.curriculum.concepts.map((c) => c.id));
    const scheduled = [...reviewState.values()]
      .filter((s) => trackConceptIds.has(s.conceptId))
      .map((s) => ({ conceptId: s.conceptId, nextReviewAt: s.nextReviewAt }));
    return buildRetentionQueue(scheduled, new Date());
  }, [activeTrack, reviewState]);

  function reloadAfterSession() {
    void Promise.all([loadAttempts(storage), loadReviewState(storage)]).then(([a, r]) => {
      setAttempts(a);
      setReviewState(r);
    });
  }

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
          reloadAfterSession();
        }}
      />
    );
  }

  if (activeReview) {
    return (
      <ReviewSession
        dueConceptIds={activeReview}
        itemsByConcept={itemsByConcept}
        onExit={() => {
          setActiveReview(null);
          reloadAfterSession();
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
        dueReviewCount={dueReviews.length}
        onSelectLesson={setActiveLesson}
        onStartReview={() => setActiveReview(dueReviews.map((q) => q.conceptId))}
      />
    </>
  );
}
