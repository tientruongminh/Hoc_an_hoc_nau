import type { SfxKey } from './audioManifest';

export interface Speaker {
  name: string;
  /** portrait texture prefix; expressions are `${portrait}_${face}` */
  portrait?: string;
  face?: string;
  blip: SfxKey;
  pitch: number;
  color: string;
}

export const SPEAKERS: Record<string, Speaker> = {
  me: { name: 'Tôi', portrait: 'pt_player', face: 'neutral', blip: 'blip_b', pitch: 0, color: '#3d6fb0' },
  mom: { name: 'Mẹ', portrait: 'pt_mom', face: 'neutral', blip: 'blip_a', pitch: 200, color: '#c0462b' },
  dad: { name: 'Ba', portrait: 'pt_dad', face: 'neutral', blip: 'blip_c', pitch: -300, color: '#4f7a33' },
  ba8: { name: 'Bà 8', portrait: 'pt_ba8', face: 'smile', blip: 'blip_a', pitch: -100, color: '#8a4fa0' },
  nam: { name: 'Nam', portrait: 'pt_nam', face: 'neutral', blip: 'blip_b', pitch: 250, color: '#d08a1e' },
  tn: { name: 'Thanh niên', portrait: 'pt_thanhnien', face: 'smirk', blip: 'blip_c', pitch: 100, color: '#b0353b' },
  qc1: { name: 'Cô bán nước', portrait: 'pt_crowd', face: 'woman', blip: 'blip_a', pitch: 300, color: '#5f7f8f' },
  qc2: { name: 'Ông cụ', portrait: 'pt_crowd', face: 'oldman', blip: 'blip_c', pitch: -400, color: '#5f7f8f' },
  bac: { name: 'Bác Tư', portrait: 'pt_crowd', face: 'oldman_smile', blip: 'blip_c', pitch: -400, color: '#5f7f8f' },
  phone: { name: '📞 Điện thoại', blip: 'blip_a', pitch: 0, color: '#555' },
};

/** A dialogue line: plain string = narration, otherwise who/face/text. */
export type Line = string | { who: keyof typeof SPEAKERS; face?: string; text: string; shake?: boolean };
