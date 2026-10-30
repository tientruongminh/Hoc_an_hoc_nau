/** Tunables for the bicycle ride (all distances in native road pixels). */
export const RIDE = {
  zoom: 3,
  /** source rows of s_road reused as the endless loop (skips the house at the top) */
  loopFromY: 72,
  roadMinX: 172,
  roadMaxX: 260,
  /** rider may drift onto the grass verge, but it is slow and bumpy */
  minX: 150,
  maxX: 282,
  playerY: 62,
  speed: { base: 92, fast: 132, slow: 58, grass: 0.68, puddle: 0.55 },
  steerAccel: 520,
  steerMax: 95,
  steerDrag: 640,
  /** ~70 s at base speed */
  length: 6400,
  maxHits: 3,
  invulnMs: 1500,
  flycarAt: 0.52,
} as const;

export type ObstacleKind = 'pothole' | 'puddle' | 'moto' | 'chicken' | 'buffalo';

export interface ObstacleSpec {
  tex: string;
  /** hitbox size, centred on the sprite (origin 0.5,0.5) */
  hw: number;
  hh: number;
  weight: (progress: number) => number;
}

export const OBSTACLES: Record<ObstacleKind, ObstacleSpec> = {
  pothole: { tex: 'pr_pothole', hw: 13, hh: 9, weight: () => 4 },
  puddle: { tex: 'pr_puddle', hw: 26, hh: 14, weight: () => 2 },
  moto: { tex: 'pr_motorbike', hw: 11, hh: 30, weight: (p) => (p < 0.15 ? 0 : 2.2) },
  chicken: { tex: 'pr_chicken', hw: 10, hh: 9, weight: (p) => (p < 0.1 ? 0 : 1.5) },
  buffalo: { tex: 'pr_buffalo', hw: 24, hh: 34, weight: (p) => (p < 0.35 ? 0 : 1) },
};
