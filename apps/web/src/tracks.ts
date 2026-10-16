import type { Curriculum, Item } from '@judgment-lab/content-schema';
import { strategicCurriculum, strategicItems } from '@judgment-lab/track-strategic/content';
import { emotionalCurriculum, emotionalItems } from '@judgment-lab/track-emotional/content';
import { behaviouralCurriculum, behaviouralItems } from '@judgment-lab/track-behavioural/content';

export interface TrackDefinition {
  id: string;
  title: string;
  curriculum: Curriculum;
  items: Item[];
}

export const TRACKS: TrackDefinition[] = [
  { id: 'strategic', title: strategicCurriculum.tracks[0]!.title, curriculum: strategicCurriculum, items: strategicItems },
  { id: 'emotional', title: emotionalCurriculum.tracks[0]!.title, curriculum: emotionalCurriculum, items: emotionalItems },
  { id: 'behavioural', title: behaviouralCurriculum.tracks[0]!.title, curriculum: behaviouralCurriculum, items: behaviouralItems },
];
