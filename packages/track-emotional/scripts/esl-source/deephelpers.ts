import type { Activity } from './types';
export const cl = (prompt: string, buckets: string[], items: [string, number, string][]): Activity =>
  ({ type: 'classify', prompt, buckets, items: items.map(([text, bucket, fb]) => ({ text, bucket, fb })) });
export const sq = (prompt: string, steps: [string, string][]): Activity =>
  ({ type: 'sequence', prompt, steps: steps.map(([text, fb]) => ({ text, fb })) });
export const mt = (prompt: string, pairs: [string, string, string][]): Activity =>
  ({ type: 'match', prompt, pairs: pairs.map(([left, right, fb]) => ({ left, right, fb })) });
export const ch = (type: 'predict' | 'compare', prompt: string, options: [string, boolean, string][]): Activity =>
  ({ type, prompt, options: options.map(([text, good, fb]) => ({ text, good, fb })) });
