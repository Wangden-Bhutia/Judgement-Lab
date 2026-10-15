/** Converted content for the Emotional Skills track (see scripts/convertEmotionalContent.ts). */
import type { Curriculum, Item } from '@judgment-lab/content-schema';
import curriculumJson from '../content/curriculum.json' with { type: 'json' };
import sessionsItemsJson from '../content/items/sessions.json' with { type: 'json' };

export const emotionalCurriculum = curriculumJson as Curriculum;
export const emotionalItems: Item[] = sessionsItemsJson as Item[];
