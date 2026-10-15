import { Curriculum, Item } from '../src/types';

export function sampleCurriculum(): Curriculum {
  return {
    contentVersion: 1,
    tracks: [
      {
        id: 'strategic',
        title: 'Strategic Reasoning',
        description: 'Who is deciding, what are their options, what do they know.',
        moduleIds: ['strategic-m1'],
      },
    ],
    modules: [
      {
        id: 'strategic-m1',
        trackId: 'strategic',
        sequence: 1,
        title: 'Who decides what',
        lessonIds: ['strategic-m1-l1'],
      },
    ],
    lessons: [
      {
        id: 'strategic-m1-l1',
        trackId: 'strategic',
        moduleId: 'strategic-m1',
        sequence: 1,
        title: 'Who is deciding?',
        objectives: ['Identify who actually controls the outcome of a situation.'],
        concepts: ['decision-rights'],
        prerequisites: [],
        interactiveItemIds: ['item-reason-1'],
        masteryItemIds: ['item-reason-2'],
        explanationBackItemId: 'item-own-words-1',
        contentVersion: 1,
      },
    ],
    concepts: [{ id: 'decision-rights', trackId: 'strategic', moduleId: 'strategic-m1', label: 'Decision rights' }],
    misconceptions: [
      {
        id: 'assumes-shared-control',
        trackId: 'strategic',
        label: 'Assumes shared control',
        description: 'Treating a decision as jointly made when one party actually controls it alone.',
      },
    ],
  };
}

export function sampleItems(): Item[] {
  return [
    {
      id: 'item-reason-1',
      concept: 'decision-rights',
      prompt: 'Two coworkers disagree on a plan. Who decides which plan goes forward?',
      type: 'reason_choice',
      options: [
        { id: 'A', text: 'Whoever argues more persuasively.', misconception: 'assumes-shared-control' },
        { id: 'B', text: 'The person whose role has final sign-off on this kind of decision.', conceptTag: 'decision-rights' },
      ],
      acceptableAnswers: ['B'],
      explanation: 'Decision rights usually sit with a specific role, not with whoever argues best.',
    },
    {
      id: 'item-reason-2',
      concept: 'decision-rights',
      prompt: 'A manager asks the team for input, then makes the call themselves. Who decided?',
      type: 'reason_choice',
      options: [
        { id: 'A', text: 'The team, since they gave input.', misconception: 'assumes-shared-control' },
        { id: 'B', text: 'The manager; input does not transfer decision rights.', conceptTag: 'decision-rights' },
      ],
      acceptableAnswers: ['B'],
      explanation: 'Soliciting input does not change who holds the actual decision right.',
    },
    {
      id: 'item-own-words-1',
      concept: 'decision-rights',
      prompt: 'Explain, in your own words, how to identify who actually decides in a situation.',
      type: 'own_words',
      modelAnswer: 'Look for who holds formal authority or final sign-off, not who talks most or cares most.',
      rubric: ['I named a specific signal of decision rights (role, authority, sign-off).', 'I distinguished input from the decision itself.'],
    },
  ];
}
