import type { ReactNode } from 'react';
import type { TrackDefinition } from './tracks';

interface TrackSwitcherProps {
  tracks: TrackDefinition[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const ICONS: Record<string, ReactNode> = {
  // Strategic Reasoning: two intersecting paths, standing for weighing one
  // choice against another.
  strategic: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M4 18 L10 8 L14 16 L20 6" />
      <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="20" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Emotional Skills: a simple open heart outline.
  emotional: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20 C6 15.5 3 12 3 8.5 C3 6 5 4 7.5 4 C9.4 4 11 5.1 12 6.6 C13 5.1 14.6 4 16.5 4 C19 4 21 6 21 8.5 C21 12 18 15.5 12 20 Z" />
    </svg>
  ),
  // Behavioural Observation: an eye, for careful observation.
  behavioural: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12 C5 7 8.5 5 12 5 C15.5 5 19 7 22 12 C19 17 15.5 19 12 19 C8.5 19 5 17 2 12 Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  ),
};

export function TrackSwitcher({ tracks, selectedId, onSelect }: TrackSwitcherProps) {
  return (
    <nav className="bottom-nav">
      {tracks.map((track) => (
        <button
          key={track.id}
          className={`bottom-nav-item ${track.id === selectedId ? 'active' : ''}`}
          onClick={() => onSelect(track.id)}
        >
          <span className="bottom-nav-icon">{ICONS[track.id]}</span>
          <span className="bottom-nav-label">{track.shortTitle}</span>
        </button>
      ))}
    </nav>
  );
}
