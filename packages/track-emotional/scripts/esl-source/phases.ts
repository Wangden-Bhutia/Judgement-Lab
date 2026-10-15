import type { Phase } from './types';
export const PHASES: Phase[] = [
  { id: 1, title: 'Foundations', weeks: [1], goal: 'Understand what emotions do and how this training works.' },
  { id: 2, title: 'Noticing and naming', weeks: [2], goal: 'Distinguish and label emotional states precisely.' },
  { id: 3, title: 'Body and impulse', weeks: [3], goal: 'Separate sensations, urges and actions.' },
  { id: 4, title: 'Interpretations', weeks: [4, 5], goal: 'Separate facts from interpretations and test them.' },
  { id: 5, title: 'Choosing a strategy', weeks: [6], goal: 'Match regulation strategies to context and intensity.' },
  { id: 6, title: 'Rumination and uncertainty', weeks: [7], goal: 'Shift from unhelpful repetitive thought to useful action.' },
  { id: 7, title: 'Criticism and conflict', weeks: [8, 9], goal: 'Respond to criticism, provocation and conflict constructively.' },
  { id: 8, title: 'Professional composure', weeks: [10, 11], goal: 'Stay effective under pressure, demands and uncertainty at work.' },
  { id: 9, title: 'Patterns and maintenance', weeks: [12], goal: 'Map recurring patterns and build a sustainable practice.' },
];
export const phaseForWeek = (w: number) => PHASES.find(p => p.weeks.includes(w))!;
