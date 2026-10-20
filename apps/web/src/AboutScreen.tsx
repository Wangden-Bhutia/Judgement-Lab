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
          Judgment Lab is three short, independent daily-practice tracks — {trackTitles.join(', ')} — sharing one
          engine and one storage layer. There is no account and no backend: everything you see here lives only in
          this browser.
        </p>
      </section>

      <section className="settings-block">
        <h2>Strategic Reasoning</h2>
        <p>
          Reading a situation before reacting to it — who actually has a say, what their real options are, what
          each side knows. The kind of judgment a negotiation or a conflicted project call calls for.
        </p>
      </section>

      <section className="settings-block">
        <h2>Emotional Skills</h2>
        <p>
          Noticing, naming, and regulating emotion under real pressure — criticism, conflict, a looming deadline —
          instead of just reacting to it.
        </p>
      </section>

      <section className="settings-block">
        <h2>Behavioural Observation</h2>
        <p>
          Telling what someone did apart from the story you've added about why, and holding more than one
          explanation before settling on one. Most of what reading people fairly and giving less-biased feedback
          comes down to.
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
