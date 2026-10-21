interface AboutScreenProps {
  trackTitles: string[];
  onDone: () => void;
}

export function AboutScreen({ trackTitles, onDone }: AboutScreenProps) {
  return (
    <div className="today-screen onboarding-screen">
      <h1>About Judgment Lab</h1>

      <section className="settings-block">
        <p>
          Judgment Lab is three daily-practice tracks — {trackTitles.join(', ')} — sharing one engine and one
          storage layer. All three are now full, roughly 12-week courses, built so any of them, done daily, gets
          you to the same kind of depth. Today recommends one lesson at a time, from whichever track has gone
          longest without practice, so once a track is finished it simply stops coming up there — Library is still
          there to revisit it any time. There is no account and no backend: everything you see here lives only in
          this browser.
        </p>
      </section>

      <section className="settings-block">
        <h2>Strategic Reasoning</h2>
        <p>
          Reading a situation before reacting to it — who actually has a say, what their real options are, what
          each side knows — and turning that into better negotiation, fewer bias-driven mistakes, and more honest,
          effective communication under pressure. 12 modules, 59 lessons: observation and leverage, repeated
          interactions, negotiation, cognitive biases, and direct communication, closing with an integrative
          capstone.
        </p>
      </section>

      <section className="settings-block">
        <h2>Emotional Skills</h2>
        <p>
          Noticing, naming, and regulating emotion under real pressure — criticism, conflict, a looming deadline —
          instead of just reacting to it. 9 phases, 60 sessions, spanning foundations, interpretation, strategy
          choice, criticism and conflict, and professional composure, with a weekly checkpoint built into every
          phase.
        </p>
      </section>

      <section className="settings-block">
        <h2>Behavioural Observation</h2>
        <p>
          Telling what someone did apart from the story you've added about why, and holding more than one
          explanation before settling on one. Most of what reading people fairly, listening well, giving and
          receiving feedback, and taking someone else's perspective actually comes down to. 12 modules, 58
          lessons, closing with an integrative capstone.
        </p>
      </section>

      <section className="settings-block">
        <h2>Why dedication matters</h2>
        <p>
          Any of that can be answered correctly in a quiet lesson and still not hold up under pressure. That gap is
          exactly what mastery and spaced review are built to close: done occasionally, this is trivia; done
          dedicatedly, it's the difference between knowing the right answer and reaching for it automatically when
          it actually matters.
        </p>
      </section>

      <button onClick={onDone}>Done</button>
    </div>
  );
}
