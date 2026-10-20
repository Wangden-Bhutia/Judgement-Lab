import { useEffect, useMemo, useState } from 'react';
import type { Item, Lesson, Misconception } from '@judgment-lab/content-schema';
import { buildRetentionQueue, type ConceptReviewState, type ItemAttemptRecord, type LessonProgressState } from '@judgment-lab/core-engine';
import { storage } from './storage';
import { loadAttempts, loadLessonProgress, loadReviewState } from './progress';
import { loadOnboarded, markOnboarded } from './onboarding';
import { OnboardingScreen } from './OnboardingScreen';
import { AboutScreen } from './AboutScreen';
import { TodayScreen } from './TodayScreen';
import { LibraryScreen } from './LibraryScreen';
import { SettingsScreen } from './SettingsScreen';
import { LessonPlayer } from './LessonPlayer';
import { ReviewSession } from './ReviewSession';
import { BottomNav, type View } from './BottomNav';
import { TRACKS } from './tracks';
import { TRACK_ICONS } from './trackIcons';
import './App.css';

interface DueConcept {
  trackId: string;
  conceptId: string;
  dueAt: string;
}

export default function App() {
  const [view, setView] = useState<View>('today');
  const [progress, setProgress] = useState<Map<string, LessonProgressState>>(new Map());
  const [attempts, setAttempts] = useState<ItemAttemptRecord[]>([]);
  const [reviewState, setReviewState] = useState<Map<string, ConceptReviewState>>(new Map());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeReview, setActiveReview] = useState<DueConcept[] | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([
      loadLessonProgress(storage),
      loadAttempts(storage),
      loadReviewState(storage),
      loadOnboarded(storage),
    ]).then(([p, a, r, didOnboard]) => {
      setProgress(p);
      setAttempts(a);
      setReviewState(r);
      setOnboarded(didOnboard);
      setLoaded(true);
    });
  }, []);

  // Built GLOBALLY (across all 3 tracks), not scoped to one "active" track
  // -- Today and Library both need every track's data at once now.
  //
  // Lesson/item ids are namespaced per track (e.g. "strategic-..." vs
  // "emotional-..."), so merging them into single global maps is safe.
  // Concept ids are NOT namespaced the same way -- nothing currently
  // collides across tracks (verified), but nothing enforces it either, so
  // anything that pools data across tracks by concept (review scheduling,
  // the cross-track review session) keeps trackId alongside conceptId
  // rather than assuming global uniqueness.
  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const track of TRACKS) for (const item of track.items) map.set(item.id, item);
    return map;
  }, []);
  const lessonById = useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const track of TRACKS) for (const lesson of track.curriculum.lessons) map.set(lesson.id, lesson);
    return map;
  }, []);
  const misconceptionById = useMemo(() => {
    const map = new Map<string, Misconception>();
    for (const track of TRACKS) for (const m of track.curriculum.misconceptions) map.set(m.id, m);
    return map;
  }, []);
  const itemsByConceptPerTrack = useMemo(() => {
    const outer = new Map<string, Map<string, Item[]>>();
    for (const track of TRACKS) {
      const inner = new Map<string, Item[]>();
      for (const item of track.items) {
        const list = inner.get(item.concept) ?? [];
        list.push(item);
        inner.set(item.concept, list);
      }
      outer.set(track.id, inner);
    }
    return outer;
  }, []);
  const trackData = useMemo(
    () =>
      TRACKS.map((track) => ({
        id: track.id,
        title: track.title,
        icon: TRACK_ICONS[track.id],
        modules: track.curriculum.modules.slice().sort((a, b) => a.sequence - b.sequence),
        concepts: track.curriculum.concepts,
      })),
    []
  );
  const dueConcepts = useMemo(() => {
    const all: DueConcept[] = [];
    for (const track of TRACKS) {
      const scheduled = track.curriculum.concepts
        .map((c) => reviewState.get(c.id))
        .filter((s): s is ConceptReviewState => s != null)
        .map((s) => ({ conceptId: s.conceptId, nextReviewAt: s.nextReviewAt }));
      for (const due of buildRetentionQueue(scheduled, new Date())) {
        all.push({ trackId: track.id, conceptId: due.conceptId, dueAt: due.dueAt });
      }
    }
    return all.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [reviewState]);

  function reloadAfterSession() {
    void Promise.all([loadAttempts(storage), loadReviewState(storage)]).then(([a, r]) => {
      setAttempts(a);
      setReviewState(r);
    });
  }

  if (!loaded) {
    return <div className="loading">Loading…</div>;
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        mode="first-run"
        onDone={() => {
          void markOnboarded(storage);
          setOnboarded(true);
        }}
      />
    );
  }

  if (showAbout) {
    return <AboutScreen trackTitles={trackData.map((t) => t.title)} onDone={() => setShowAbout(false)} />;
  }

  if (showHelp) {
    return <OnboardingScreen mode="reference" onDone={() => setShowHelp(false)} />;
  }

  if (activeLesson) {
    return (
      <LessonPlayer
        lesson={activeLesson}
        itemById={itemById}
        progress={progress}
        misconceptionById={misconceptionById}
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
        dueConcepts={activeReview}
        itemsByConcept={itemsByConceptPerTrack}
        attempts={attempts}
        misconceptionById={misconceptionById}
        onExit={() => {
          setActiveReview(null);
          reloadAfterSession();
        }}
      />
    );
  }

  return (
    <>
      {view === 'today' && (
        <TodayScreen
          tracks={trackData}
          lessonById={lessonById}
          progress={progress}
          dueReviewCount={dueConcepts.length}
          onSelectLesson={setActiveLesson}
          onStartReview={() => setActiveReview(dueConcepts)}
        />
      )}
      {view === 'library' && (
        <LibraryScreen
          tracks={trackData}
          lessonById={lessonById}
          progress={progress}
          attempts={attempts}
          onSelectLesson={setActiveLesson}
        />
      )}
      {view === 'settings' && (
        <SettingsScreen
          trackTitles={trackData.map((t) => t.title)}
          onShowAbout={() => setShowAbout(true)}
          onShowHelp={() => setShowHelp(true)}
        />
      )}
      <BottomNav view={view} onChange={setView} />
    </>
  );
}
