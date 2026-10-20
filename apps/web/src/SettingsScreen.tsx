import { useState } from 'react';
import { storage } from './storage';

interface SettingsScreenProps {
  trackTitles: string[];
  onShowHelp: () => void;
}

export function SettingsScreen({ trackTitles, onShowHelp }: SettingsScreenProps) {
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

      <section className="settings-block">
        <h2>About</h2>
        <p>
          Judgment Lab is three short, independent daily-practice tracks — {trackTitles.join(', ')} — sharing one
          engine and one storage layer. There is no account and no backend: everything you see here lives only in
          this browser.
        </p>
        <p>
          Each track trains a specific, transferable skill, not trivia to recall in a quiz. Strategic Reasoning is
          reading a situation before reacting to it — who actually has a say, what their real options are, what
          each side knows — the kind of judgment a negotiation or a conflicted project call calls for. Emotional
          Skills is noticing, naming, and regulating emotion under real pressure — criticism, conflict, a looming
          deadline — instead of just reacting to it. Behavioural Observation is telling what someone did apart from
          the story you've added about why, and holding more than one explanation before settling on one, which is
          most of what reading people fairly and giving less-biased feedback comes down to.
        </p>
        <p>
          Any of that can be answered correctly in a quiet lesson and still not hold up under pressure. That gap is
          exactly what mastery and spaced review are built to close: done occasionally, this is trivia; done
          dedicatedly, it's the difference between knowing the right answer and reaching for it automatically when
          it actually matters.
        </p>
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
