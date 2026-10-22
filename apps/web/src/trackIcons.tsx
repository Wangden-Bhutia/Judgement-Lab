import type { ReactNode } from 'react';

/** The app's own mark: a leaf, matching favicon.svg's shape (stroke-only
 * here, to fit the rest of this file's icon vocabulary, used in AppHeader). */
export const APP_ICON: ReactNode = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20 C4.5 16.5 3.5 8 12 3.5 C20.5 8 19.5 16.5 12 20 Z" />
    <path d="M12 18.5 V6 M12 12 L7 9 M12 14 L17 11.5" />
  </svg>
);

/** Today: a simple sun -- what to practise right now. */
export const TODAY_ICON: ReactNode = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5 V5 M12 19 V21.5 M4.2 4.2 L6 6 M18 18 L19.8 19.8 M2.5 12 H5 M19 12 H21.5 M4.2 19.8 L6 18 M18 6 L19.8 4.2" />
  </svg>
);

/** Library: an open book -- every track's full content, always browsable. */
export const LIBRARY_ICON: ReactNode = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6 C10 4.5 7 4 4 4.5 V18 C7 17.5 10 18 12 19.5 C14 18 17 17.5 20 18 V4.5 C17 4 14 4.5 12 6 Z" />
    <path d="M12 6 V19.5" />
  </svg>
);

/** Settings: sliders, not a gear -- simpler to draw cleanly at this size. */
export const SETTINGS_ICON: ReactNode = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <path d="M4 7 H20 M4 14 H20 M4 21 H20" />
    <circle cx="14" cy="7" r="2.1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="14" r="2.1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="21" r="2.1" fill="currentColor" stroke="none" />
  </svg>
);

export const TRACK_ICONS: Record<string, ReactNode> = {
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
