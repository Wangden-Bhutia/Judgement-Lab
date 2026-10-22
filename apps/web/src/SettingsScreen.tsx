import { useState } from 'react';
import { storage } from './storage';

interface SettingsScreenProps {
  trackTitles: string[];
  onShowAbout: () => void;
  onShowHelp: () => void;
  canInstall: boolean;
  onInstall: () => void;
}

export function SettingsScreen({ trackTitles, onShowAbout, onShowHelp, canInstall, onInstall }: SettingsScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    await storage.clear();
    window.location.reload();
  }

  return (
    <div className="today-screen">
      <h1>Settings</h1>

      {canInstall && (
        <section className="settings-block">
          <h2>Install</h2>
          <p>Add Judgment Lab to your home screen or apps list, so it opens like a regular app, offline and full-screen.</p>
          <button onClick={onInstall}>Install app</button>
        </section>
      )}

      <section className="settings-block">
        <h2>About</h2>
        <p>
          {trackTitles.join(', ')} — three daily-practice tracks of different lengths sharing one engine and one
          storage layer, and what practising each one actually builds.
        </p>
        <button onClick={onShowAbout}>About Judgment Lab</button>
      </section>

      <section className="settings-block">
        <h2>How it works</h2>
        <p>What completion, mastery, and spaced review mean, and why they're kept separate.</p>
        <button onClick={onShowHelp}>How Judgment Lab works</button>
      </section>

      <section className="settings-block">
        <h2>Reset progress</h2>
        <p>
          Clears every lesson's completion status, every answered item, and the spaced-review schedule, for all
          three tracks. This can't be undone.
        </p>
        {!confirming ? (
          <button onClick={() => setConfirming(true)}>Reset all progress</button>
        ) : (
          <div className="settings-confirm">
            <p>Are you sure? This deletes everything.</p>
            <div className="settings-confirm-actions">
              <button onClick={handleReset} disabled={resetting}>
                {resetting ? 'Resetting…' : 'Yes, reset everything'}
              </button>
              <button className="exit-link" onClick={() => setConfirming(false)} disabled={resetting}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
