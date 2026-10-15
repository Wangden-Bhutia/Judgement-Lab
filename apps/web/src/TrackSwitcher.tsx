import type { TrackDefinition } from './tracks';

interface TrackSwitcherProps {
  tracks: TrackDefinition[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function TrackSwitcher({ tracks, selectedId, onSelect }: TrackSwitcherProps) {
  return (
    <nav className="track-switcher">
      {tracks.map((track) => (
        <button
          key={track.id}
          className={`track-tab ${track.id === selectedId ? 'active' : ''}`}
          onClick={() => onSelect(track.id)}
        >
          {track.title}
        </button>
      ))}
    </nav>
  );
}
