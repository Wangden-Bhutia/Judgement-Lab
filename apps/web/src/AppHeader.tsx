import { APP_ICON } from './trackIcons';

/** A slim, persistent strip above Today/Library/Settings naming the app --
 * those three screens otherwise only ever show their own heading ("Today",
 * "Library", "Settings"), with no app identity anywhere on screen once
 * installed as a standalone PWA (no browser chrome/tab title to fall back
 * on there). Deliberately not shown on Lesson/Review/About/Onboarding --
 * those are focused, full-screen flows that already make clear what app
 * they're in via their own heading or by continuity from the screen that
 * opened them. */
export function AppHeader() {
  return (
    <header className="app-header">
      <span className="app-header-icon">{APP_ICON}</span>
      <span className="app-header-name">Second Nature</span>
    </header>
  );
}
