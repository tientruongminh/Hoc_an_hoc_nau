import Phaser from 'phaser';
import { COLORS, FONT, GAME_W, hex } from '../../config';
import { sfx } from '../../systems/Audio';
import { drawPanel } from '../../ui/Panel';

/** Shared helpers for the kitchen minigames (Wash, Cooking). */

export const clamp01 = (v: number) => Phaser.Math.Clamp(v, 0, 1);

export function sleep(scene: Phaser.Scene, ms: number) {
  return new Promise<void>((r) => scene.time.delayedCall(ms, r));
}

/** Tiny procedural textures; drawn small so the pixel-art filter keeps them crunchy when scaled. */
export function genTextures(scene: Phaser.Scene) {
  const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  make('k_plate', 48, 48, (g) => {
    g.fillStyle(0x8fa6b2).fillCircle(24, 25, 23);
    g.fillStyle(0xf4f7f8).fillCircle(24, 24, 22);
    g.fillStyle(0x9fc4d8).fillCircle(24, 24, 18);
    g.fillStyle(0xe9eef0).fillCircle(24, 24, 16);
    g.fillStyle(0xffffff).fillCircle(20, 19, 5);
  });
  const blob = (g: Phaser.GameObjects.Graphics, pts: number[][], c: number, c2: number) => {
    pts.forEach(([x, y, r]) => g.fillStyle(c).fillCircle(x, y, r));
    pts.slice(0, 2).forEach(([x, y]) => g.fillStyle(c2).fillRect(x - 1, y - 1, 2, 2));
  };
  make('k_grime0', 12, 12, (g) => blob(g, [[6, 6, 4], [3, 4, 2], [9, 8, 2], [4, 9, 2]], 0x7a5230, 0x5a3a20));
  make('k_grime1', 12, 12, (g) => blob(g, [[5, 5, 3], [8, 7, 3], [4, 9, 1], [10, 3, 1]], 0xc89a3a, 0x9c7220));
  make('k_grime2', 12, 12, (g) => blob(g, [[6, 6, 3], [3, 7, 2], [9, 5, 2]], 0xb8432e, 0x8a2a1a));
  make('k_foam', 6, 6, (g) => g.fillStyle(0xffffff).fillCircle(3, 3, 3));
  make('k_bubble', 8, 8, (g) => {
    g.lineStyle(1, 0xe6f6ff).strokeCircle(4, 4, 3);
    g.fillStyle(0xffffff).fillRect(3, 2, 1, 1);
  });
  make('k_drop', 2, 3, (g) => g.fillStyle(0x9fd8f2).fillRect(0, 0, 2, 3));
  make('k_sponge', 16, 11, (g) => {
    g.fillStyle(0xe0a92e).fillRect(0, 3, 16, 8);
    g.fillStyle(0xf2c94c).fillRect(1, 4, 14, 6);
    g.fillStyle(0x3f7a32).fillRect(0, 0, 16, 4);
    g.fillStyle(0x5c9e45).fillRect(1, 1, 14, 2);
  });
  make('k_spark', 5, 5, (g) => {
    g.fillStyle(0xffffff).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1);
    g.fillStyle(0xfff3b0).fillRect(2, 2, 1, 1);
  });
  make('k_flame', 4, 6, (g) => {
    g.fillStyle(0xf26b1d).fillRect(0, 2, 4, 4);
    g.fillStyle(0xffc23a).fillRect(1, 0, 2, 5);
  });
  make('k_blueflame', 4, 6, (g) => {
    g.fillStyle(0x3b6fe0).fillRect(0, 2, 4, 4);
    g.fillStyle(0x9fd0ff).fillRect(1, 1, 2, 4);
  });
  make('k_steam', 8, 8, (g) => g.fillStyle(0xffffff).fillCircle(4, 4, 4));
  make('k_grain', 2, 2, (g) => g.fillStyle(0xf6e3a8).fillRect(0, 0, 2, 2));
  make('k_yolk', 2, 2, (g) => g.fillStyle(0xf2c230).fillRect(0, 0, 2, 2));
  make('k_green', 2, 2, (g) => g.fillStyle(0x5aa83a).fillRect(0, 0, 2, 2));
  make('k_speck', 1, 1, (g) => g.fillStyle(0x2b2420).fillRect(0, 0, 1, 1));
  make('k_knife', 24, 7, (g) => {
    g.fillStyle(0x6b3f22).fillRect(0, 2, 9, 4);
    g.fillStyle(0x3d2412).fillRect(3, 3, 1, 1).fillRect(6, 3, 1, 1);
    g.fillStyle(0xaeb8c0).fillRect(9, 1, 15, 5);
    g.fillStyle(0xe6edf2).fillRect(9, 1, 14, 2);
  });
  make('k_whisk', 8, 22, (g) => {
    g.fillStyle(0x6b3f22).fillRect(3, 0, 2, 9);
    g.lineStyle(1, 0xcfd6dc).strokeEllipse(4, 15, 7, 13);
    g.lineStyle(1, 0xaeb8c0).strokeEllipse(4, 15, 3, 13);
  });
}

/** Instruction banner pinned to the top of the screen. */
export class Banner {
  private c: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private t: Phaser.GameObjects.Text;
  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    this.t = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: COLORS.ink, align: 'center' }).setOrigin(0.5);
    this.c = scene.add.container(GAME_W / 2, 44, [this.g, this.t]).setDepth(8000).setAlpha(0);
  }
  show(text: string) {
    this.t.setText(text);
    const w = Math.max(360, this.t.width + 60);
    drawPanel(this.g, -w / 2, -28, w, 56, 14);
    this.c.setY(30);
    this.scene.tweens.add({ targets: this.c, alpha: 1, y: 44, duration: 250, ease: 'Cubic.out' });
  }
  hide() {
    this.scene.tweens.add({ targets: this.c, alpha: 0, duration: 200 });
  }
}

/** Big pop text ("Hoàn hảo!"). */
export function popText(scene: Phaser.Scene, x: number, y: number, text: string, color: string = COLORS.gold, size = 54) {
  const t = scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '800', color, stroke: COLORS.ink, strokeThickness: 8 })
    .setOrigin(0.5)
    .setDepth(9500)
    .setScale(0.4)
    .setAngle(Phaser.Math.Between(-6, 6));
  scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.out' });
  scene.tweens.add({ targets: t, y: y - 40, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
  return t;
}

export function grade(score: number, early?: boolean | null): { text: string; color: string } {
  if (score >= 90) return { text: 'Hoàn hảo!', color: COLORS.gold };
  if (score >= 70) return { text: 'Ngon lành!', color: '#9ed36a' };
  if (score >= 45) return { text: early == null ? 'Tạm được' : early ? 'Hơi sớm' : 'Hơi muộn', color: COLORS.paper };
  if (early === true) return { text: 'Sớm quá!', color: '#e58a6a' };
  if (early === false) return { text: 'Cháy rồi!', color: '#e5533a' };
  return { text: 'Hỏng bét…', color: '#e5533a' };
}

export interface Zone {
  from: number;
  to: number;
  color: number;
  label?: string;
}

/** Horizontal meter with coloured zones and a moving marker. */
export class Gauge {
  readonly c: Phaser.GameObjects.Container;
  private marker: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private fill?: Phaser.GameObjects.Rectangle;
  value = 0;
  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w: number,
    zones: Zone[],
    title = '',
    fillColor?: number,
  ) {
    const h = 30;
    const g = scene.add.graphics();
    drawPanel(g, -w / 2 - 18, -54, w + 36, h + 76, 14);
    g.fillStyle(hex(COLORS.ink)).fillRect(-w / 2 - 3, -3, w + 6, h + 6);
    g.fillStyle(0x4a3a2c).fillRect(-w / 2, 0, w, h);
    const parts: Phaser.GameObjects.GameObject[] = [g];
    if (fillColor !== undefined) {
      this.fill = scene.add.rectangle(-w / 2, 0, 0, h, fillColor, 0.85).setOrigin(0);
      parts.push(this.fill);
    }
    const zg = scene.add.graphics();
    for (const z of zones) {
      zg.fillStyle(z.color, fillColor !== undefined ? 0.45 : 0.95).fillRect(-w / 2 + z.from * w, 0, (z.to - z.from) * w, h);
      if (z.label) parts.push(scene.add.text(-w / 2 + ((z.from + z.to) / 2) * w, h + 4, z.label, { fontFamily: FONT, fontSize: '15px', fontStyle: '700', color: COLORS.ink }).setOrigin(0.5, 0));
    }
    parts.splice(1, 0, zg);
    this.title = scene.add.text(0, -30, title, { fontFamily: FONT, fontSize: '20px', fontStyle: '800', color: COLORS.accentDark }).setOrigin(0.5);
    this.marker = scene.add.graphics();
    this.marker.fillStyle(0xffffff).fillRect(-2, -6, 4, h + 12);
    this.marker.fillStyle(hex(COLORS.ink)).fillTriangle(-8, -14, 8, -14, 0, -4);
    parts.push(this.title, this.marker);
    this.c = scene.add.container(x, y, parts).setDepth(8500).setAlpha(0).setScale(0.9);
    scene.tweens.add({ targets: this.c, alpha: 1, scale: 1, duration: 220, ease: 'Back.out' });
    this.set(0);
  }
  set(v: number) {
    this.value = v;
    const p = clamp01(v);
    this.marker.x = -this.w / 2 + p * this.w;
    if (this.fill) this.fill.width = p * this.w;
  }
  setTitle(t: string) {
    this.title.setText(t);
  }
  flash(color = 0xffffff) {
    const r = this.scene.add.rectangle(this.x, this.y + 15, this.w, 30, color, 0.8).setDepth(8600);
    this.scene.tweens.add({ targets: r, alpha: 0, duration: 300, onComplete: () => r.destroy() });
  }
  destroy() {
    const c = this.c;
    this.scene.tweens.add({ targets: c, alpha: 0, y: c.y - 10, duration: 200, onComplete: () => c.destroy() });
  }
}

type Btn = 'E' | 'SPACE';

/** Resolve on the next E/Space/click; ignores input for `arm` ms to avoid carry-over presses. */
export function waitPress(scene: Phaser.Scene, arm = 120): Promise<void> {
  return new Promise((res) => {
    const born = scene.time.now;
    const kb = scene.input.keyboard!;
    const fn = () => {
      if (scene.time.now - born < arm) return;
      kb.off('keydown-E', fn).off('keydown-SPACE', fn);
      scene.input.off('pointerdown', fn);
      res();
    };
    kb.on('keydown-E', fn).on('keydown-SPACE', fn);
    scene.input.on('pointerdown', fn);
  });
}

/** Subscribe to presses (E/Space/click) until the returned function is called. */
export function onPress(scene: Phaser.Scene, cb: (key: Btn | 'CLICK') => void): () => void {
  const kb = scene.input.keyboard!;
  const e = () => cb('E');
  const s = () => cb('SPACE');
  const p = () => cb('CLICK');
  kb.on('keydown-E', e).on('keydown-SPACE', s);
  scene.input.on('pointerdown', p);
  return () => {
    kb.off('keydown-E', e).off('keydown-SPACE', s);
    scene.input.off('pointerdown', p);
  };
}

/** True while E/Space or the mouse button is held. */
export function holdState(scene: Phaser.Scene) {
  const kb = scene.input.keyboard!;
  const e = kb.addKey('E');
  const s = kb.addKey('SPACE');
  return () => e.isDown || s.isDown || scene.input.activePointer.isDown;
}

/**
 * Approach-ring rhythm: a ring shrinks onto a target circle; press on contact.
 * Returns per-beat accuracy 0..1 (0 = miss).
 */
export function ringRhythm(
  scene: Phaser.Scene,
  x: number,
  y: number,
  beats: number,
  interval: number,
  onBeat: (i: number, acc: number) => void,
): Promise<number[]> {
  return new Promise((res) => {
    const WIN = 230;
    const lead = interval * 1.7;
    const start = scene.time.now + 500;
    const acc: (number | null)[] = Array(beats).fill(null);
    const target = scene.add.graphics().setDepth(8800);
    const pulse = { r: 30 };
    const drawTarget = () => {
      target.clear();
      target.fillStyle(0x2b1d14, 0.45).fillCircle(x, y, pulse.r);
      target.lineStyle(6, 0x2b1d14).strokeCircle(x, y, pulse.r);
      target.lineStyle(3, 0xf6e7c8).strokeCircle(x, y, pulse.r);
    };
    drawTarget();
    const rings: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < beats; i++) {
      const g = scene.add.graphics().setDepth(8900);
      rings.push(g);
      const tHit = start + lead + i * interval;
      scene.time.delayedCall(Math.max(0, tHit - lead - scene.time.now), () => {
        scene.tweens.addCounter({
          from: 110,
          to: 30,
          duration: lead,
          onUpdate: (tw) => {
            if (acc[i] !== null) return;
            const r = tw.getValue() ?? 30;
            g.clear();
            g.lineStyle(5, r < 44 ? 0x9ed36a : 0xf2b84b, Math.min(1, (110 - r) / 30)).strokeCircle(x, y, r);
          },
        });
      });
    }
    const judge = (i: number, a: number) => {
      acc[i] = a;
      rings[i].clear();
      onBeat(i, a);
      const label = a >= 0.8 ? 'Chuẩn!' : a >= 0.45 ? 'Được' : a > 0 ? 'Lệch' : 'Trượt';
      const t = scene.add
        .text(x, y - 70, label, { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: a >= 0.8 ? COLORS.gold : a > 0 ? COLORS.paper : '#e5533a', stroke: COLORS.ink, strokeThickness: 6 })
        .setOrigin(0.5)
        .setDepth(9000);
      scene.tweens.add({ targets: t, y: y - 100, alpha: 0, duration: 600, onComplete: () => t.destroy() });
      if (a > 0) {
        pulse.r = 38;
        scene.tweens.add({ targets: pulse, r: 30, duration: 160, onUpdate: drawTarget });
      }
      if (acc.every((v) => v !== null)) finish();
    };
    const off = onPress(scene, () => {
      const now = scene.time.now;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < beats; i++) {
        if (acc[i] !== null) continue;
        const d = Math.abs(now - (start + lead + i * interval));
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0 && bestD <= WIN) judge(best, Phaser.Math.Clamp(1 - Math.max(0, bestD - 50) / (WIN - 50), 0.1, 1));
    });
    const watcher = scene.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        const now = scene.time.now;
        for (let i = 0; i < beats; i++) if (acc[i] === null && now > start + lead + i * interval + WIN) judge(i, 0);
      },
    });
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      off();
      watcher.remove();
      scene.time.delayedCall(300, () => {
        target.destroy();
        rings.forEach((r) => r.destroy());
        res(acc.map((a) => a ?? 0));
      });
    }
  });
}

/** Count presses for `ms`; `alternate` requires A/D (or ←/→) alternation. Calls tick with progress. */
export function mash(
  scene: Phaser.Scene,
  ms: number,
  opts: { alternate?: boolean; onHit?: (n: number) => void; onTick?: (t: number) => void } = {},
): Promise<number> {
  return new Promise((res) => {
    let n = 0;
    let last = '';
    const kb = scene.input.keyboard!;
    const hit = (k: string) => {
      if (opts.alternate) {
        if (k === last) return;
        last = k;
      }
      n++;
      opts.onHit?.(n);
    };
    const handlers: [string, () => void][] = opts.alternate
      ? [
          ['keydown-A', () => hit('L')],
          ['keydown-LEFT', () => hit('L')],
          ['keydown-D', () => hit('R')],
          ['keydown-RIGHT', () => hit('R')],
        ]
      : [
          ['keydown-E', () => hit('E')],
          ['keydown-SPACE', () => hit('E')],
        ];
    handlers.forEach(([ev, f]) => kb.on(ev, f));
    const click = () => hit(opts.alternate ? (last === 'L' ? 'R' : 'L') : 'E');
    scene.input.on('pointerdown', click);
    const t0 = scene.time.now;
    const ev = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = (scene.time.now - t0) / ms;
        opts.onTick?.(Math.min(1, t));
        if (t >= 1) {
          ev.remove();
          handlers.forEach(([e, f]) => kb.off(e, f));
          scene.input.off('pointerdown', click);
          res(n);
        }
      },
    });
  });
}

/** Mom's quick reaction bubble in the corner — no input needed. */
export function bark(scene: Phaser.Scene, face: string, text: string, ms = 2000) {
  const old = scene.children.getByName('bark');
  old?.destroy();
  const img = scene.add.image(0, 0, `pt_mom_${face}`).setOrigin(0.5, 1).setScale(1.6);
  const t = scene.add.text(78, -88, text, { fontFamily: FONT, fontSize: '21px', fontStyle: '600', color: COLORS.ink, wordWrap: { width: 380 } }).setOrigin(0, 0.5);
  const g = scene.add.graphics();
  drawPanel(g, 66, -88 - t.height / 2 - 14, t.width + 26, t.height + 28, 12);
  g.fillStyle(hex(COLORS.paper)).fillTriangle(66, -80, 66, -64, 52, -66);
  const c = scene.add.container(80, 712, [g, img, t]).setDepth(9200).setName('bark').setAlpha(0);
  c.x = -40;
  scene.tweens.add({ targets: c, x: 80, alpha: 1, duration: 260, ease: 'Back.out' });
  scene.tweens.add({ targets: c, alpha: 0, delay: ms, duration: 300, onComplete: () => c.destroy() });
  sfx('blip_a', { volume: 0.4, detune: 200 });
}
