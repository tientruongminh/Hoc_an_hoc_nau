export const GAME_W = 1280;
export const GAME_H = 720;
/** World pixel-art is drawn at native size and magnified by the camera. */
export const WORLD_ZOOM = 3;

export const FONT = '"Be Vietnam Pro", system-ui, sans-serif';

export const COLORS = {
  ink: '#2b1d14',
  paper: '#f6e7c8',
  paperDark: '#e8d2a6',
  accent: '#d9572b',
  accentDark: '#a63a17',
  gold: '#f2b84b',
  leaf: '#6f9a3a',
  sky: '#7fb7c9',
  danger: '#c8322b',
  shadow: 'rgba(20,12,6,0.55)',
} as const;

export const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;

export const DEPTH = {
  floor: 0,
  world: 10, // y-sorted actors live at world + y
  overlay: 5000,
} as const;

export const SPEED = { walk: 62, run: 108 } as const;
