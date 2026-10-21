/** Converted content for the Strategic Reasoning track (see scripts/convertStrategicContent.ts). */
import type { Curriculum, Item } from '@judgment-lab/content-schema';
import curriculumJson from '../content/curriculum.json' with { type: 'json' };
import module1ItemsJson from '../content/items/module1.json' with { type: 'json' };
import module2ItemsJson from '../content/items/module2.json' with { type: 'json' };
import module3ItemsJson from '../content/items/module3.json' with { type: 'json' };
import module4ItemsJson from '../content/items/module4.json' with { type: 'json' };
import bankDeepeningItemsJson from '../content/items/bank-deepening.json' with { type: 'json' };
import weeklyCheckpointItemsJson from '../content/items/weekly-checkpoints.json' with { type: 'json' };
import negotiationItemsJson from '../content/items/negotiation.json' with { type: 'json' };
import biasesItemsJson from '../content/items/biases.json' with { type: 'json' };
import communicationItemsJson from '../content/items/communication.json' with { type: 'json' };

export const strategicCurriculum = curriculumJson as Curriculum;
export const strategicItems: Item[] = [
  ...(module1ItemsJson as Item[]),
  ...(module2ItemsJson as Item[]),
  ...(module3ItemsJson as Item[]),
  ...(module4ItemsJson as Item[]),
  ...(bankDeepeningItemsJson as Item[]),
  ...(weeklyCheckpointItemsJson as Item[]),
  ...(negotiationItemsJson as Item[]),
  ...(biasesItemsJson as Item[]),
  ...(communicationItemsJson as Item[]),
];
