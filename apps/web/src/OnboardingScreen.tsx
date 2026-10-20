interface OnboardingScreenProps {
  /** 'first-run' gates the whole app before Today is ever shown. 'reference'
   * is the same content reopened later from Settings, for a quick refresher
   * -- same copy, different exit (back to Settings, not "start practicing"). */
  mode: 'first-run' | 'reference';
  onDone: () => void;
}

export function OnboardingScreen({ mode, onDone }: OnboardingScreenProps) {
  return (
    <div className="today-screen onboarding-screen">
      <h1>How Judgment Lab works</h1>

      <section className="settings-block">
        <p>
          Three short, independent practice tracks — Strategic Reasoning, Emotional Skills, and Behavioural
          Observation — share one engine and one habit. Today recommends one lesson at a time; there's no
          need to juggle all three yourself.
        </p>
      </section>

      <section className="settings-block">
        <h2>Completing a lesson isn't mastering it</h2>
        <p>
          Finishing a lesson unlocks the next one — that's all completion means. Mastery is a separate,
          stricter claim: a concept only counts as mastered once you've answered it correctly{' '}
          <em>later</em>, away from the lesson that taught it. Getting something right while it's still
          fresh doesn't prove it stuck.
        </p>
      </section>

      <section className="settings-block">
        <h2>Spaced review</h2>
        <p>
          Once a concept has that kind of evidence behind it, Judgment Lab brings it back for a quick
          check — first after 2 days, then 7, then 21, as long as you keep getting it right. Miss one and
          it comes back sooner. These checks are what Today's "due for review" card is for: answering
          something correctly after a gap is what actually makes it stick.
        </p>
      </section>

      <section className="settings-block">
        <h2>Private by default</h2>
        <p>No account, no backend, nothing uploaded. Everything above lives only in this browser.</p>
      </section>

      <button onClick={onDone}>{mode === 'first-run' ? 'Start practicing' : 'Done'}</button>
    </div>
  );
}
