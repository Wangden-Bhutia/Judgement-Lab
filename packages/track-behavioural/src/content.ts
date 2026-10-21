/** Converted content for the Behavioural Observation track (see scripts/convertBehaviouralContent.ts). */
import type { Curriculum, Item } from '@judgment-lab/content-schema';
import curriculumJson from '../content/curriculum.json' with { type: 'json' };
import module1ItemsJson from '../content/items/module1.json' with { type: 'json' };
import module2ItemsJson from '../content/items/module2.json' with { type: 'json' };
import bankDeepeningItemsJson from '../content/items/bank-deepening.json' with { type: 'json' };
import weeklyCheckpointItemsJson from '../content/items/weekly-checkpoints.json' with { type: 'json' };
import signalsItemsJson from '../content/items/signals.json' with { type: 'json' };
import listeningItemsJson from '../content/items/listening.json' with { type: 'json' };
import feedbackItemsJson from '../content/items/feedback.json' with { type: 'json' };
import perspectiveItemsJson from '../content/items/perspective.json' with { type: 'json' };
import rapportItemsJson from '../content/items/rapport.json' with { type: 'json' };

export const behaviouralCurriculum = curriculumJson as Curriculum;
export const behaviouralItems: Item[] = [
  ...(module1ItemsJson as Item[]),
  ...(module2ItemsJson as Item[]),
  ...(bankDeepeningItemsJson as Item[]),
  ...(weeklyCheckpointItemsJson as Item[]),
  ...(signalsItemsJson as Item[]),
  ...(listeningItemsJson as Item[]),
  ...(feedbackItemsJson as Item[]),
  ...(perspectiveItemsJson as Item[]),
  ...(rapportItemsJson as Item[]),
];
