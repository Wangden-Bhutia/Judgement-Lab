// Prose content for each lesson's concept-introduction and worked-example
// stages (blueprint Stages 2–3). Kept separate from curriculum.json since
// it's long-form prose rather than data suited to schema validation; this
// can be generalized into the validated content schema in Phase 7 once
// more lessons exist and a real authoring workflow is worth building.

export interface ConceptCopy {
  conceptId: string;
  label: string;
  definition: string;
  background: string;
  significance: string;
  example: string;
  commonMisunderstanding: string;
  limitation: string;
}

export interface WorkedExampleCopy {
  scenario: string;
  observable: string;
  reasonableInferences: string;
  uncertain: string;
  alternatives: string[];
  furtherEvidence: string;
}

export interface LessonCopy {
  concepts: ConceptCopy[];
  workedExample: WorkedExampleCopy;
  explanationPrompt: string;
  explanationCriteria: string[];
}

export const LESSON_COPY: Record<string, LessonCopy> = {
  'LES-1': {
    concepts: [
      {
        conceptId: 'observation_vs_interpretation',
        label: 'Observation vs. Interpretation',
        definition:
          'An observation is something you directly perceived: a word said, an action taken, a change over time. An interpretation is a guess about what that observation means — a motive, an emotion, or a trait.',
        background:
          "People routinely skip straight from an observation to an interpretation without noticing the jump, especially when the interpretation feels obvious in the moment.",
        significance:
          "Confusing the two makes you confident in conclusions you haven't actually earned, and makes it harder to notice when you're wrong.",
        example:
          'Observation: "She didn\'t reply to my message for six hours." Interpretation: "She\'s annoyed with me."',
        commonMisunderstanding:
          'Thinking that if an interpretation feels obvious, it must be an observation. Obviousness is not evidence.',
        limitation:
          "Separating the two doesn't tell you which interpretation is correct — it only stops you from mistaking a guess for a fact.",
      },
      {
        conceptId: 'evidence_based_inference',
        label: 'Evidence-Based Inference',
        definition:
          'An evidence-based inference is a conclusion that stays as close as the evidence allows, naming what remains uncertain and what else could explain the same facts.',
        background:
          "Good inference doesn't mean refusing to draw any conclusion — it means matching your confidence to how much the evidence actually narrows things down.",
        significance:
          "It keeps you open to being wrong, which is what lets you actually update when new information arrives.",
        example:
          'Rather than "He\'s lying," a better inference is: "His account conflicts with hers on one detail; both tellings could still be sincere, and more information would help."',
        commonMisunderstanding:
          'Treating "I can\'t be sure yet" as an unsatisfying non-answer rather than the most accurate one available.',
        limitation:
          'Holding multiple explanations open takes more effort than picking one, and some situations genuinely call for a decision before all the evidence is in.',
      },
    ],
    workedExample: {
      scenario:
        'A normally talkative colleague becomes quiet after another colleague is praised in a meeting, and looks at their phone for the rest of it.',
      observable: 'The colleague spoke less and looked at their phone more, starting right after the praise.',
      reasonableInferences: "Something changed in the colleague's behaviour around the time of the praise.",
      uncertain: 'Why the behaviour changed — the praise is one plausible trigger, but not the only one.',
      alternatives: [
        'The colleague felt overlooked by the praise.',
        'The colleague received unrelated difficult news just before the meeting.',
        'The colleague was simply distracted by something on their phone, unrelated to the meeting.',
      ],
      furtherEvidence:
        'Whether the pattern repeats around similar praise in the future, or a direct, low-pressure conversation with the colleague.',
    },
    explanationPrompt:
      "In your own words, explain the difference between an observation and an interpretation, and why the difference matters when you're trying to understand someone's behaviour.",
    explanationCriteria: [
      'I named a specific observation (something that could be seen or heard), separate from an interpretation of it.',
      'I explained why treating an interpretation as if it were an observation is a problem.',
      'I gave at least one example where two different interpretations could fit the same observation.',
    ],
  },
  'LES-2': {
    concepts: [
      {
        conceptId: 'attribution',
        label: 'Attribution: Disposition vs. Situation',
        definition:
          "Attribution is the explanation you give for why someone behaved as they did. Explanations tend to fall somewhere between two poles: dispositional (something about who they are — their character, personality, ability) and situational (something about their circumstances — pressure, context, bad luck).",
        background:
          "People are routinely quicker to reach for a dispositional explanation of someone else's behaviour than a situational one, especially for behaviour that irritates or confuses them — even when a situational cause is just as plausible, or sitting in plain view.",
        significance:
          "Over-crediting disposition makes you too quick to form a fixed judgment of someone from a single instance, and under-credits circumstances that almost anyone might respond to the same way.",
        example:
          'A driver cuts you off in traffic. Dispositional: "That driver is reckless and inconsiderate." Situational: "That driver might be rushing to an emergency, or didn\'t see me in a blind spot."',
        commonMisunderstanding:
          "Assuming the dispositional explanation must be right because it fits how the person generally seems. Fitting a prior impression isn't the same as being supported by the evidence in front of you right now.",
        limitation:
          "Weighing disposition against situation doesn't tell you which one is correct here — it only stops you from defaulting to disposition without considering the alternative.",
      },
    ],
    workedExample: {
      scenario: 'A new team member misses an important deadline on their very first project.',
      observable: 'The team member did not submit the deliverable by the deadline.',
      reasonableInferences: 'Something prevented the deliverable from being completed on time.',
      uncertain:
        'Whether the cause was something about the person (poor planning, disorganisation) or something about the situation (unclear instructions, competing urgent requests, a personal emergency).',
      alternatives: [
        'The team member underestimated the scope of the work.',
        'The team member received conflicting priorities from two different people.',
        'The deadline itself was unrealistic given the information they were given.',
      ],
      furtherEvidence:
        'Whether the pattern repeats on a second deadline where instructions are clear and competing demands are lower.',
    },
    explanationPrompt:
      "In your own words, explain the difference between a dispositional and a situational explanation for someone's behaviour, and why people tend to reach for the dispositional one too quickly.",
    explanationCriteria: [
      'I distinguished a dispositional explanation from a situational one, using my own example.',
      "I explained why the dispositional explanation can feel more obvious even when it isn't better supported.",
      'I named at least one situational factor that could explain the scenario I considered.',
    ],
  },
  'LES-3': {
    concepts: [
      {
        conceptId: 'generating_alternative_explanations',
        label: 'Generating Alternative Explanations',
        definition:
          "Once an explanation for someone's behaviour comes to mind, it's easy to start looking only for evidence that supports it. Generating alternative explanations means deliberately coming up with at least one other account that fits the same facts before settling on one.",
        background:
          "People form an initial hypothesis quickly, often from limited information, and then unconsciously favour evidence that confirms it while discounting evidence that doesn't — a pattern known as confirmation bias.",
        significance:
          "Without deliberately generating alternatives, you're unlikely to notice evidence against your first guess, because you were never looking for it.",
        example:
          'You suspect a friend is avoiding you. Confirmation-biased approach: every unanswered text feels like proof, while the times they did reply get explained away. Alternative-generating approach: you also consider that they might be busy, dealing with something unrelated, or just bad at replying in general.',
        commonMisunderstanding:
          "Believing that a strong hunch is more likely to be correct because it came quickly. A hunch that formed before much evidence was in isn't more reliable for having arrived first.",
        limitation:
          "Generating alternatives doesn't tell you which explanation is actually correct — it protects you from narrowing in on one explanation prematurely, which is a different, earlier problem.",
      },
    ],
    workedExample: {
      scenario:
        'After you give a friend honest feedback on a plan of theirs, they stop initiating conversations with you for a week.',
      observable: "The friend hasn't initiated conversation for a week, starting after the feedback.",
      reasonableInferences: 'Something changed around the time of the feedback.',
      uncertain: 'Whether the feedback is the cause, and if so, whether it was the content, the delivery, or the timing.',
      alternatives: [
        'The friend is upset about the feedback specifically.',
        'The friend is busy with something unrelated this week.',
        'The friend tends to go quiet for a while after any feedback, regardless of its content.',
      ],
      furtherEvidence:
        'Whether the pattern continues past this week, or whether asking directly, without sounding accusatory, gets a clear answer.',
    },
    explanationPrompt:
      'In your own words, explain what confirmation bias is, and why deliberately generating alternative explanations helps guard against it.',
    explanationCriteria: [
      'I explained what confirmation bias is in my own words.',
      'I explained why having an early hunch makes confirmation bias more likely, not less.',
      'I gave an example of generating at least one alternative explanation for an ambiguous situation.',
    ],
  },
};
