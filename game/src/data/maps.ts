import type { MusicKey, SfxKey } from './audioManifest';

/** Rect in native map pixels: [x, y, w, h]. */
export type Rect = [number, number, number, number];

export interface ExitDef {
  id: string;
  r: Rect;
  to: string;
  spawn: string;
  /** arrow hint direction drawn on the exit */
  dir: 'up' | 'down' | 'left' | 'right';
}

export interface MapDef {
  tex: string;
  name: string;
  music: MusicKey | null;
  ambience?: MusicKey;
  step: SfxKey;
  walls: Rect[];
  spawns: Record<string, [number, number]>;
  exits: ExitDef[];
  /** floating particle flavour */
  motes?: 'dust' | 'leaves' | 'petals';
}

// Collision boxes were measured on grid overlays of the processed scene art.
export const MAPS: Record<string, MapDef> = {
  bedroom: {
    tex: 's_bedroom',
    name: 'Phòng của tôi',
    music: 'home_day',
    ambience: 'amb_summer',
    step: 'step_wood',
    motes: 'dust',
    walls: [
      [0, 0, 386, 138],
      [0, 0, 20, 304],
      [362, 0, 24, 304],
      [18, 0, 92, 234],
      [308, 155, 52, 95],
      [0, 264, 158, 40],
      [232, 264, 154, 40],
    ],
    spawns: { bed: [138, 196], door: [195, 248] },
    exits: [{ id: 'bedroom_out', r: [158, 276, 74, 28], to: 'front', spawn: 'fromBedroom', dir: 'down' }],
  },
  front: {
    tex: 's_front',
    name: 'Gian quán',
    music: 'home_day',
    ambience: 'amb_summer',
    step: 'step_wood',
    motes: 'dust',
    walls: [
      [0, 0, 65, 95],
      [122, 0, 145, 95],
      [320, 0, 83, 95],
      [65, 0, 57, 66],
      [267, 0, 53, 66],
      [0, 0, 10, 348],
      [394, 0, 9, 348],
      [8, 60, 44, 128],
      [322, 55, 72, 96],
      [356, 160, 38, 44],
      [10, 178, 36, 40],
      [100, 150, 84, 46],
      [218, 150, 86, 46],
      [18, 214, 110, 52],
      [286, 214, 98, 52],
      [55, 268, 22, 20],
      [322, 268, 22, 20],
      [8, 284, 48, 50],
      [100, 296, 40, 40],
      [262, 296, 40, 40],
      [356, 296, 40, 40],
      [0, 332, 147, 16],
      [253, 332, 150, 16],
      [135, 262, 12, 72],
      [253, 262, 12, 72],
    ],
    spawns: {
      fromBedroom: [293, 104],
      fromMom: [293, 104],
      fromKitchen: [93, 104],
      fromStreet: [200, 290],
      center: [200, 230],
    },
    exits: [
      { id: 'front_kitchen', r: [65, 66, 57, 22], to: 'kitchen', spawn: 'fromFront', dir: 'up' },
      { id: 'front_mom', r: [267, 66, 53, 22], to: 'momroom', spawn: 'fromFront', dir: 'up' },
      { id: 'front_street', r: [147, 318, 106, 30], to: 'street', spawn: '', dir: 'down' },
    ],
  },
  kitchen: {
    tex: 's_kitchen',
    name: 'Bếp',
    music: 'home_day',
    ambience: 'amb_summer',
    step: 'step_wood',
    motes: 'dust',
    walls: [
      [0, 0, 318, 98],
      [0, 0, 22, 276],
      [12, 108, 46, 94],
      [145, 140, 70, 52],
      [118, 158, 24, 24],
      [220, 158, 24, 24],
      [158, 120, 52, 20],
      [158, 192, 52, 24],
      [300, 0, 18, 98],
      [300, 164, 18, 112],
      [0, 258, 128, 18],
      [176, 258, 142, 18],
    ],
    spawns: { fromFront: [152, 238], fromGarden: [282, 132], center: [95, 225] },
    exits: [
      { id: 'kitchen_front', r: [128, 262, 48, 14], to: 'front', spawn: 'fromKitchen', dir: 'down' },
      { id: 'kitchen_garden', r: [306, 98, 12, 66], to: 'garden', spawn: 'fromKitchen', dir: 'right' },
    ],
  },
  momroom: {
    tex: 's_momroom',
    name: 'Phòng mẹ',
    music: 'home_day',
    ambience: 'amb_summer',
    step: 'step_wood',
    motes: 'dust',
    walls: [
      [0, 0, 484, 104],
      [0, 0, 20, 304],
      [464, 0, 20, 304],
      [18, 0, 136, 222],
      [0, 286, 205, 18],
      [280, 286, 204, 18],
    ],
    spawns: { fromFront: [242, 262] },
    exits: [{ id: 'mom_front', r: [205, 290, 75, 14], to: 'front', spawn: 'fromMom', dir: 'down' }],
  },
  garden: {
    tex: 's_garden',
    name: 'Vườn sau nhà',
    music: 'home_day',
    ambience: 'amb_summer',
    step: 'step_dirt',
    motes: 'leaves',
    walls: [
      [0, 0, 222, 160],
      [300, 0, 494, 160],
      [222, 0, 78, 98],
      [0, 0, 66, 446],
      [722, 0, 72, 446],
      [590, 75, 135, 175],
      [0, 398, 355, 48],
      [430, 398, 364, 48],
      [40, 292, 108, 110],
      [632, 300, 92, 100],
      [120, 165, 36, 34],
      [376, 356, 40, 40],
    ],
    spawns: { fromKitchen: [261, 138], center: [330, 260] },
    exits: [{ id: 'garden_kitchen', r: [222, 98, 78, 22], to: 'kitchen', spawn: 'fromGarden', dir: 'up' }],
  },
  ba8: {
    tex: 's_ba8',
    name: 'Đầu ngõ — Nhà bà 8',
    music: 'home_day',
    ambience: 'amb_summer',
    step: 'step_dirt',
    motes: 'petals',
    walls: [
      [0, 0, 355, 252],
      [445, 0, 259, 252],
      [355, 0, 90, 226],
      [0, 362, 704, 34],
      [0, 0, 4, 396],
    ],
    spawns: { fromRide: [60, 300], shop: [400, 252] },
    exits: [{ id: 'ba8_home', r: [690, 252, 14, 110], to: 'park', spawn: 'fromRoad', dir: 'right' }],
  },
  park: {
    tex: 's_park',
    name: 'Công viên làng — Lễ hội',
    music: 'festival',
    ambience: 'amb_crowd',
    step: 'step_grass',
    motes: 'leaves',
    walls: [
      [280, 0, 565, 132],
      [0, 0, 236, 232],
      [665, 145, 122, 112],
      [365, 230, 113, 70],
      [305, 375, 60, 30],
      [395, 375, 58, 30],
      [500, 375, 56, 30],
      [650, 375, 56, 30],
      [725, 375, 56, 30],
      [795, 338, 50, 72],
      [80, 228, 56, 32],
      [158, 290, 38, 30],
      [226, 340, 56, 40],
      [0, 445, 845, 30],
      [838, 0, 7, 475],
    ],
    spawns: { fromRoad: [70, 410], board: [420, 318] },
    exits: [{ id: 'park_home', r: [0, 380, 22, 65], to: 'front', spawn: 'fromStreet', dir: 'left' }],
  },
};
