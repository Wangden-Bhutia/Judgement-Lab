import type { ReactNode } from 'react';
import { TODAY_ICON, LIBRARY_ICON, SETTINGS_ICON } from './trackIcons';

export type View = 'today' | 'library' | 'settings';

interface BottomNavProps {
  view: View;
  onChange: (view: View) => void;
}

const ITEMS: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'today', label: 'Today', icon: TODAY_ICON },
  { id: 'library', label: 'Library', icon: LIBRARY_ICON },
  { id: 'settings', label: 'Settings', icon: SETTINGS_ICON },
];

export function BottomNav({ view, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav-item ${item.id === view ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
