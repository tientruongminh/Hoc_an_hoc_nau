import Phaser from 'phaser';
import { COLORS, FONT } from '../../config';
import { ROW, score, type GameState, type Side, type SowEvent } from '../../logic/oanquan';
import { sfx } from '../../systems/Audio';

/** Board geometry (screen pixels, 1280x720 canvas). */
export const CW = 116;
export const CH = 104;
export const BX0 = 640 - CW * 2.5;
export const MID_Y = 360;
const QUAN_RX = 92;
const STONE_SCALE = 3;

type Kind = 'dan' | 'quan';
interface Stone {
  img: Phaser.GameObjects.Image;
  kind: Kind;
}

/** Cell index → centre point. Bottom row 1..5 left→right, top row 7..11 right→left. */
export function cellCenter(i: number): [number, number] {
  if (i === 0) return [BX0 - QUAN_RX / 2, MID_Y];
  if (i === 6) return [BX0 + CW * 5 + QUAN_RX / 2, MID_Y];
  if (i >= 1 && i <= 5) return [BX0 + CW * (i - 1) + CW / 2, MID_Y + CH / 2];
  return [BX0 + CW * (11 - i) + CW / 2, MID_Y - CH / 2];
}

const isQuanCell = (i: number) => i === 0 || i === 6;

/** Small deterministic hash → [0,1). Keeps stone placement stable between frames. */
function hash(a: number, b: number) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Loose heap layout: golden-angle spiral with jitter, squashed to the given box. */
function heapSpot(seed: number, k: number, hx: number, hy: number): [number, number] {
  const r = 7.5 * Math.sqrt(k + 0.6);
  const a = k * 2.39996 + hash(seed, 7) * 6.28;
  const jx = (hash(seed, k * 2 + 1) - 0.5) * 8;
  const jy = (hash(seed, k * 2 + 2) - 0.5) * 6;
  const x = Phaser.Math.Clamp(Math.cos(a) * r * 1.35 + jx, -hx, hx);
  const y = Phaser.Math.Clamp(Math.sin(a) * r * 0.95 + jy, -hy, hy);
  return [x, y];
}

/**
 * Renders the chalk board, stones, score piles and plays engine SowEvents as
 * animations. `sync()` reconciles sprites with an engine state afterwards so
 * the picture can never drift from the rules.
 */
export class BoardView {
  private cells: Stone[][] = [];
  private piles: Record<Side, Stone[]> = { A: [], B: [] };
  private hand: Phaser.GameObjects.Container;
  private handCount: Phaser.GameObjects.Text;
  private handN = 0;
  private scoreText: Record<Side, Phaser.GameObjects.Text>;
  private debtText: Record<Side, Phaser.GameObjects.Text>;
  private shown: Record<Side, number> = { A: 0, B: 0 };
  readonly pileCenter: Record<Side, [number, number]> = { A: [640, 548], B: [640, 168] };
  fast = false;

  constructor(private scene: Phaser.Scene) {
    this.drawBoard();
    for (let i = 0; i < 12; i++) this.cells.push([]);

    const hs = scene.add.image(0, 0, 'pr_stone_dan').setScale(STONE_SCALE + 1);
    const badge = scene.add.circle(22, -20, 16, 0xd9572b).setStrokeStyle(3, 0x2b1d14);
    this.handCount = scene.add.text(22, -20, '', { fontFamily: FONT, fontSize: '18px', fontStyle: '800', color: '#fff' }).setOrigin(0.5);
    this.hand = scene.add.container(0, 0, [hs, badge, this.handCount]).setDepth(400).setVisible(false);

    const label = (side: Side, txt: string) => {
      const [x, y] = this.pileCenter[side];
      scene.add
        .text(x - 200, y, txt, { fontFamily: FONT, fontSize: '20px', fontStyle: '800', color: side === 'A' ? COLORS.gold : '#f08a6a', stroke: COLORS.ink, strokeThickness: 5 })
        .setOrigin(1, 0.5)
        .setDepth(50);
    };
    label('A', 'BẠN');
    label('B', 'THANH NIÊN');
    const st = (side: Side) => {
      const [x, y] = this.pileCenter[side];
      return scene.add
        .text(x + 200, y, '0 điểm', { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: COLORS.paper, stroke: COLORS.ink, strokeThickness: 6 })
        .setOrigin(0, 0.5)
        .setDepth(50);
    };
    this.scoreText = { A: st('A'), B: st('B') };
    const dt = (side: Side) => {
      const [x, y] = this.pileCenter[side];
      return scene.add
        .text(x + 200, y + 26, '', { fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#f0b090' })
        .setOrigin(0, 0.5)
        .setDepth(50);
    };
    this.debtText = { A: dt('A'), B: dt('B') };
  }

  // ───────────────────────────── drawing ─────────────────────────────
  private drawBoard() {
    const s = this.scene;
    const L = BX0 - QUAN_RX - 34;
    const R = BX0 + CW * 5 + QUAN_RX + 34;
    const T = MID_Y - CH - 34;
    const B = MID_Y + CH + 34;
    // packed-dirt patch with soft shadow
    const g = s.add.graphics().setDepth(1);
    g.fillStyle(0x000000, 0.35).fillRoundedRect(L + 8, T + 12, R - L, B - T, 40);
    g.fillStyle(0x5a3b24, 1).fillRoundedRect(L - 6, T - 6, R - L + 12, B - T + 12, 44);
    g.fillStyle(0x7a5233, 1).fillRoundedRect(L, T, R - L, B - T, 40);
    g.fillStyle(0x86603d, 1).fillRoundedRect(L + 14, T + 10, R - L - 28, (B - T) * 0.45, 30);
    // grit speckles
    for (let k = 0; k < 420; k++) {
      const x = L + 20 + hash(k, 1) * (R - L - 40);
      const y = T + 16 + hash(k, 2) * (B - T - 32);
      const c = hash(k, 3) < 0.5 ? 0x5e3f27 : 0x9a7148;
      g.fillStyle(c, 0.8).fillRect(Math.round(x), Math.round(y), 3, 3);
    }

    // chalk lines, drawn twice with jitter for a hand-drawn feel
    const chalk = s.add.graphics().setDepth(2);
    const line = (x1: number, y1: number, x2: number, y2: number, seed: number) => {
      for (let pass = 0; pass < 2; pass++) {
        chalk.lineStyle(pass ? 2 : 5, 0xf3ead8, pass ? 0.55 : 0.8);
        chalk.beginPath();
        const n = 8;
        for (let t = 0; t <= n; t++) {
          const px = x1 + ((x2 - x1) * t) / n + (hash(seed + pass * 31, t) - 0.5) * 2.4;
          const py = y1 + ((y2 - y1) * t) / n + (hash(seed + pass * 17, t + 9) - 0.5) * 2.4;
          if (t === 0) chalk.moveTo(px, py);
          else chalk.lineTo(px, py);
        }
        chalk.strokePath();
      }
    };
    const top = MID_Y - CH;
    const bot = MID_Y + CH;
    const right = BX0 + CW * 5;
    line(BX0, top, right, top, 1);
    line(BX0, bot, right, bot, 2);
    line(BX0, MID_Y, right, MID_Y, 3);
    for (let c = 0; c <= 5; c++) line(BX0 + CW * c, top, BX0 + CW * c, bot, 10 + c);
    const arc = (cx: number, dir: 1 | -1, seed: number) => {
      for (let pass = 0; pass < 2; pass++) {
        chalk.lineStyle(pass ? 2 : 5, 0xf3ead8, pass ? 0.55 : 0.8);
        chalk.beginPath();
        const n = 24;
        for (let t = 0; t <= n; t++) {
          const a = -Math.PI / 2 + (Math.PI * t) / n;
          const px = cx + dir * Math.cos(a) * QUAN_RX + (hash(seed + pass, t) - 0.5) * 2.4;
          const py = MID_Y + Math.sin(a) * CH + (hash(seed + pass, t + 40) - 0.5) * 2.4;
          if (t === 0) chalk.moveTo(px, py);
          else chalk.lineTo(px, py);
        }
        chalk.strokePath();
      }
    };
    arc(BX0, -1, 50);
    arc(right, 1, 60);
  }

  // ───────────────────────────── placement ─────────────────────────────
  private cellSpot(cell: number, k: number, kind: Kind): [number, number] {
    const [cx, cy] = cellCenter(cell);
    if (isQuanCell(cell)) {
      if (kind === 'quan') return [cx, cy];
      // dân around the quan, pushed outward vertically
      const [x, y] = heapSpot(cell * 101 + 3, k + 3, 30, 72);
      return [cx + x, cy + y];
    }
    const [x, y] = heapSpot(cell * 101, k, CW / 2 - 18, CH / 2 - 16);
    return [cx + x, cy + y];
  }

  private pileSpot(side: Side, k: number, kind: Kind): [number, number] {
    const [cx, cy] = this.pileCenter[side];
    if (kind === 'quan') return [cx - 150 + (k % 4) * 34, cy - 4];
    const [x, y] = heapSpot(side === 'A' ? 777 : 999, k, 120, 34);
    return [cx + 20 + x, cy + y];
  }

  private makeStone(kind: Kind, x: number, y: number): Stone {
    const img = this.scene.add.image(x, y, kind === 'dan' ? 'pr_stone_dan' : 'pr_stone_quan').setScale(STONE_SCALE);
    img.setDepth(kind === 'quan' ? 20 : 30);
    return { img, kind };
  }

  private layoutCell(cell: number, animate: boolean) {
    let k = 0;
    for (const st of this.cells[cell]) {
      const [x, y] = this.cellSpot(cell, st.kind === 'quan' ? 0 : k++, st.kind);
      st.img.setDepth((st.kind === 'quan' ? 20 : 30) + y / 1000);
      if (animate) this.scene.tweens.add({ targets: st.img, x, y, duration: 200, ease: 'Quad.out' });
      else st.img.setPosition(x, y);
    }
  }

  private layoutPile(side: Side) {
    let kd = 0;
    let kq = 0;
    for (const st of this.piles[side]) {
      const [x, y] = this.pileSpot(side, st.kind === 'quan' ? kq++ : kd++, st.kind);
      this.scene.tweens.add({ targets: st.img, x, y, duration: 220, ease: 'Quad.out' });
      st.img.setDepth(40 + y / 1000);
    }
  }

  /** Reconcile every sprite group with the engine state (adds/removes as needed). */
  sync(s: GameState, animate = true) {
    for (let i = 0; i < 12; i++) {
      this.reconcile(this.cells[i], s.cells[i].dan, s.cells[i].quan, (kind) => {
        const [x, y] = cellCenter(i);
        return this.makeStone(kind, x, y);
      });
      this.layoutCell(i, animate);
    }
    for (const side of ['A', 'B'] as const) {
      this.reconcile(this.piles[side], s.captured[side].dan, s.captured[side].quan, (kind) => {
        const [x, y] = this.pileCenter[side];
        return this.makeStone(kind, x, y);
      });
      this.layoutPile(side);
      this.setScore(side, score(s, side));
      this.debtText[side].setText(s.debt[side] > 0 ? `(đang nợ ${s.debt[side]} dân)` : '');
    }
  }

  private reconcile(list: Stone[], dan: number, quan: number, make: (k: Kind) => Stone) {
    for (const kind of ['dan', 'quan'] as const) {
      const want = kind === 'dan' ? dan : quan;
      let have = list.filter((x) => x.kind === kind);
      while (have.length > want) {
        const st = have.pop()!;
        list.splice(list.indexOf(st), 1);
        this.scene.tweens.add({ targets: st.img, alpha: 0, scale: 1, duration: 200, onComplete: () => st.img.destroy() });
      }
      while (have.length < want) {
        const st = make(kind);
        st.img.setAlpha(0);
        this.scene.tweens.add({ targets: st.img, alpha: 1, duration: 200 });
        list.push(st);
        have = list.filter((x) => x.kind === kind);
      }
    }
  }

  private setScore(side: Side, v: number) {
    if (this.shown[side] === v) return;
    const from = this.shown[side];
    this.shown[side] = v;
    const t = this.scoreText[side];
    this.scene.tweens.addCounter({ from, to: v, duration: 350, onUpdate: (tw) => t.setText(`${Math.round(tw.getValue() ?? v)} điểm`) });
    this.scene.tweens.add({ targets: t, scale: { from: 1.3, to: 1 }, duration: 300, ease: 'Back.out' });
  }

  resetScores() {
    this.shown = { A: -1, B: -1 };
  }

  // ───────────────────────────── animation ─────────────────────────────
  private wait(ms: number) {
    return new Promise<void>((r) => this.scene.time.delayedCall(ms, r));
  }

  private moveHand(cell: number, ms: number) {
    const [x, y] = cellCenter(cell);
    this.scene.tweens.add({ targets: this.hand, x, y: y - 46, duration: ms, ease: 'Sine.inOut' });
  }

  private setHand(n: number) {
    this.handN = n;
    this.handCount.setText(String(n));
    this.hand.setVisible(n > 0);
  }

  /** Play one move's event list. `mover` is the side that made the move. */
  async play(events: SowEvent[], mover: Side) {
    const sows = events.filter((e) => e.type === 'sow').length;
    const step = this.fast ? 60 : sows > 30 ? 95 : 150;
    let chain = 0;
    const live: Record<Side, number> = { A: this.shown.A, B: this.shown.B };
    for (const e of events) {
      switch (e.type) {
        case 'pickup': {
          chain = 0;
          const [x, y] = cellCenter(e.cell);
          this.hand.setPosition(x, y - 46).setScale(0.6);
          this.scene.tweens.add({ targets: this.hand, scale: 1, duration: 180, ease: 'Back.out' });
          const dans = this.cells[e.cell].filter((st) => st.kind === 'dan');
          this.cells[e.cell] = this.cells[e.cell].filter((st) => st.kind !== 'dan');
          dans.forEach((st, i) =>
            this.scene.tweens.add({
              targets: st.img,
              x,
              y: y - 46,
              delay: i * 15,
              duration: 180,
              ease: 'Quad.in',
              onComplete: () => st.img.destroy(),
            }),
          );
          sfx('pickup', { volume: 0.4, rate: 1.1 });
          this.setHand(e.count);
          await this.wait(step + 120);
          break;
        }
        case 'sow': {
          this.moveHand(e.cell, step * 0.8);
          await this.wait(step * 0.5);
          const st = this.makeStone('dan', this.hand.x, this.hand.y);
          const list = this.cells[e.cell];
          list.push(st);
          const k = list.filter((x) => x.kind === 'dan').length - 1;
          const [tx, ty] = this.cellSpot(e.cell, k, 'dan');
          st.img.setScale(STONE_SCALE + 1);
          this.scene.tweens.add({ targets: st.img, x: tx, y: ty, scale: STONE_SCALE, duration: step * 0.7, ease: 'Quad.in' });
          sfx('seed_drop', { volume: 0.55, detune: Math.min(1200, chain * 70) });
          chain++;
          this.setHand(this.handN - 1);
          await this.wait(step * 0.6);
          break;
        }
        case 'capture': {
          const stones = this.cells[e.cell];
          this.cells[e.cell] = [];
          const [cx, cy] = cellCenter(e.cell);
          this.flashCell(cx, cy, isQuanCell(e.cell));
          sfx('capture', { volume: 0.8, rate: e.quan ? 0.85 : 1 });
          if (e.quan) this.scene.cameras.main.shake(200, 0.004);
          stones.forEach((st, i) => {
            this.piles[mover].push(st);
            const midX = (st.img.x + this.pileCenter[mover][0]) / 2;
            const midY = Math.min(st.img.y, this.pileCenter[mover][1]) - 80;
            const end = this.pileCenter[mover];
            const path = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(st.img.x, st.img.y), new Phaser.Math.Vector2(midX, midY), new Phaser.Math.Vector2(end[0], end[1]));
            const p = { t: 0 };
            this.scene.tweens.add({
              targets: p,
              t: 1,
              delay: i * 25,
              duration: 420,
              ease: 'Cubic.inOut',
              onUpdate: () => {
                const v = path.getPoint(p.t);
                st.img.setPosition(v.x, v.y);
              },
            });
          });
          live[mover] += e.dan + 5 * e.quan;
          this.floatText(cx, cy - 30, `+${e.dan + 5 * e.quan}`, mover === 'A' ? COLORS.gold : '#f08a6a');
          await this.wait(450 + stones.length * 25);
          this.layoutPile(mover);
          this.setScore(mover, live[mover]);
          await this.wait(150);
          break;
        }
        case 'refill': {
          this.setHand(0);
          await this.refill(e.side);
          break;
        }
        case 'turnEnd':
          this.setHand(0);
          break;
        case 'gameOver':
          await this.sweepRows();
          break;
      }
    }
    this.setHand(0);
  }

  private async refill(side: Side) {
    const opp: Side = side === 'A' ? 'B' : 'A';
    const take = (from: Side) => {
      const i = this.piles[from].findIndex((st) => st.kind === 'dan');
      if (i < 0) return null;
      return this.piles[from].splice(i, 1)[0];
    };
    let borrowed = 0;
    const cells = ROW[side];
    for (const cell of cells) {
      let st = take(side);
      if (!st) {
        st = take(opp);
        borrowed++;
      }
      if (!st) continue;
      this.cells[cell].push(st);
      const [tx, ty] = this.cellSpot(cell, 0, 'dan');
      this.scene.tweens.add({ targets: st.img, x: tx, y: ty, duration: 300, ease: 'Quad.out' });
      sfx('seed_drop', { volume: 0.5 });
      await this.wait(110);
    }
    const [x, y] = cellCenter(cells[2]);
    this.floatText(x, y + (side === 'A' ? 70 : -70), borrowed ? `Rải quân! (mượn ${borrowed} dân)` : 'Hết dân — rải quân!', COLORS.paper);
    this.layoutPile('A');
    this.layoutPile('B');
    await this.wait(500);
  }

  private async sweepRows() {
    for (const side of ['A', 'B'] as const) {
      for (const cell of ROW[side]) {
        const st = this.cells[cell];
        this.cells[cell] = [];
        st.forEach((x) => this.piles[side].push(x));
      }
      this.layoutPile(side);
    }
    sfx('grain_scatter', { volume: 0.5 });
    await this.wait(450);
  }

  private flashCell(x: number, y: number, quan: boolean) {
    const c = this.scene.add.circle(x, y, quan ? 70 : 52, 0xfff2c0, 0.6).setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: c, alpha: 0, scale: 1.4, duration: 380, onComplete: () => c.destroy() });
  }

  floatText(x: number, y: number, txt: string, color: string) {
    const t = this.scene.add
      .text(x, y, txt, { fontFamily: FONT, fontSize: '26px', fontStyle: '800', color, stroke: COLORS.ink, strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(500)
      .setScale(0.6);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.out' });
    this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, delay: 700, duration: 450, onComplete: () => t.destroy() });
  }
}
