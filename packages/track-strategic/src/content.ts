/** Converted content for the Strategic Reasoning track (see scripts/convertModule1.ts). */
import type { Curriculum, Item } from '@judgment-lab/content-schema';
import curriculumJson from '../content/curriculum.json' with { type: 'json' };
import module1ItemsJson from '../content/items/module1.json' with { type: 'json' };

export const strategicCurriculum = curriculumJson as Curriculum;
export const strategicItems: Item[] = module1ItemsJson as Item[];
