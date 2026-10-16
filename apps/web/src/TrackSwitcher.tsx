import { useState } from 'react';
import type { TrackDefinition } from './tracks';
import { TRACK_ICONS } from './trackIcons';

interface TrackSwitcherProps {
  tracks: TrackDefinition[];
}

/**
 * With Today now a single blended feed showing every track at once, there
 * is no "selected track" to switch between -- this is a jump-to-section
 * nav, not a mode switch. `active` here just means "most recently jumped
 * to", for a bit of visual feedback, not a real scroll-spy.
 */
export function TrackSwitcher({ tracks }: TrackSwitcherProps) {
  const [lastJumpedTo, setLastJumpedTo] = useState<string | null>(null);

  function jumpTo(id: string) {
    setLastJumpedTo(id);
    document.getElementById(`track-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="bottom-nav">
      {tracks.map((track) => (
        <button
          key={track.id}
          className={`bottom-nav-item ${track.id === lastJumpedTo ? 'active' : ''}`}
          onClick={() => jumpTo(track.id)}
        >
          <span className="bottom-nav-icon">{TRACK_ICONS[track.id]}</span>
          <span className="bottom-nav-label">{track.shortTitle}</span>
        </button>
      ))}
    </nav>
  );
}
