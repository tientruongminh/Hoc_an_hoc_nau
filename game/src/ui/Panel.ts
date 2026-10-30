import Phaser from 'phaser';
import { COLORS, hex } from '../config';

/** Paper-and-ink panel used by every UI box. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r = 14) {
  g.clear();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 4, y + 6, w, h, r);
  g.fillStyle(hex(COLORS.ink), 1).fillRoundedRect(x - 4, y - 4, w + 8, h + 8, r + 3);
  g.fillStyle(hex(COLORS.paper), 1).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(hex(COLORS.paperDark), 1).fillRoundedRect(x, y + h - 10, w, 10, { tl: 0, tr: 0, bl: r, br: r });
  g.lineStyle(2, hex(COLORS.accent), 0.7).strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, Math.max(2, r - 6));
  return g;
}
