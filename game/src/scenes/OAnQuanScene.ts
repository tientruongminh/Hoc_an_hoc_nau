import Phaser from 'phaser';
import { COLORS, FONT, GAME_H, GAME_W } from '../config';
import { applyMove, chooseAIMove, createGame, legalMoves, score, type Dir, type GameState, type Move } from '../logic/oanquan';
import { BoardView, CH, CW, cellCenter } from '../minigames/oanquan/BoardView';
import { G } from '../state/GameState';
import { music, sfx } from '../systems/Audio';
import { finishMinigame } from '../systems/Flow';
import { resultCard } from '../ui/MinigameKit';
import { fmtMoney, ui, type UIScene } from './UIScene';

const BETS = [10_000, 20_000, 50_000];
const MAX_TURNS = 120;

type TnFace = 'smirk' | 'laugh' | 'shock' | 'annoyed';

/**
 * Ô ăn quan betting duel against the park show-off. Rules live in
 * logic/oanquan.ts; this scene only handles bets, input and presentation.
 */
export class OAnQuanScene extends Phaser.Scene {
  private u!: UIScene;
  private board!: BoardView;
  private state!: GameState;
  private bet = 0;
  private rounds = 0;
  private tnPortrait!: Phaser.GameObjects.Image;
  private mePortrait!: Phaser.GameObjects.Image;
  private bubble!: Phaser.GameObjects.Container;
  private bubbleText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private betText!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;
  private picker!: Phaser.GameObjects.Graphics;
  private arrows: Phaser.GameObjects.Container[] = [];
  private zones: Phaser.GameObjects.Zone[] = [];

  constructor() {
    super('OAnQuan');
  }

  create() {
    this.u = ui(this);
    this.rounds = 0;
    this.arrows = [];
    this.zones = [];
    this.buildBackdrop();
    this.board = new BoardView(this);
    this.buildPeople();
    this.picker = this.add.graphics().setDepth(5);
    this.banner = this.add
      .text(GAME_W / 2, 40, '', { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color: COLORS.paper, stroke: COLORS.ink, strokeThickness: 7 })
      .setOrigin(0.5)
      .setDepth(100);
    this.betText = this.add
      .text(GAME_W / 2, 78, '', { fontFamily: FONT, fontSize: '19px', fontStyle: '700', color: COLORS.gold, stroke: COLORS.ink, strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(100);
    this.help = this.add
      .text(GAME_W / 2, GAME_H - 22, '', { fontFamily: FONT, fontSize: '17px', color: '#e8d2a6', stroke: COLORS.ink, strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(100);

    this.state = createGame({ maxTurns: MAX_TURNS });
    this.board.sync(this.state, false);
    music('oanquan');
    this.u.quest(null);
    this.u.hudVisible(true);
    void this.run();
  }

  // ───────────────────────────── presentation ─────────────────────────────
  private buildBackdrop() {
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'cg_oanquan').setDisplaySize(GAME_W + 40, GAME_H + 24);
    if (this.game.renderer.type === Phaser.WEBGL) bg.postFX?.addBlur(1, 2, 2, 1.2);
    this.tweens.add({ targets: bg, x: GAME_W / 2 - 14, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x140b06, 0.62).setOrigin(0);
    // vignette
    const v = this.add.graphics();
    for (let i = 0; i < 24; i++) {
      v.lineStyle(26, 0x000000, 0.035 * (24 - i) * 0.25);
      v.strokeRect(i * 13, i * 9, GAME_W - i * 26, GAME_H - i * 18);
    }
    // lantern bokeh drifting upward
    if (!this.textures.exists('px_bokeh')) {
      const g = this.make.graphics({}, false);
      for (let r = 12; r > 0; r--) g.fillStyle(0xffc46b, 0.08).fillCircle(12, 12, r);
      g.generateTexture('px_bokeh', 24, 24);
      g.destroy();
    }
    this.add
      .particles(0, 0, 'px_bokeh', {
        x: { min: 0, max: GAME_W },
        y: { min: 0, max: GAME_H },
        lifespan: 7000,
        speedY: { min: -14, max: -4 },
        speedX: { min: -6, max: 6 },
        scale: { min: 0.6, max: 2.2 },
        alpha: { start: 0, end: 0, ease: (t: number) => Math.sin(t * Math.PI) * 0.9 } as never,
        tint: [0xffc46b, 0xff8a5c, 0xfff0b0],
        frequency: 260,
        blendMode: 'ADD',
      })
      .setDepth(3);
  }

  private buildPeople() {
    this.tnPortrait = this.add.image(1172, 248, 'pt_thanhnien_smirk').setOrigin(0.5, 1).setScale(2).setDepth(80);
    this.add
      .text(1172, 262, 'THANH NIÊN', { fontFamily: FONT, fontSize: '18px', fontStyle: '800', color: '#fff', backgroundColor: '#b0353b', padding: { x: 10, y: 4 } })
      .setOrigin(0.5, 0)
      .setDepth(80);
    this.tweens.add({ targets: this.tnPortrait, y: 244, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.mePortrait = this.add.image(108, GAME_H - 34, 'pt_player_neutral').setOrigin(0.5, 1).setScale(2).setDepth(80);
    this.add
      .text(108, GAME_H - 30, 'BẠN', { fontFamily: FONT, fontSize: '18px', fontStyle: '800', color: '#fff', backgroundColor: '#3d6fb0', padding: { x: 10, y: 4 } })
      .setOrigin(0.5, 0)
      .setDepth(80);

    const g = this.add.graphics();
    g.fillStyle(0x2b1d14).fillRoundedRect(-3, -3, 286, 66, 14);
    g.fillStyle(0xf6e7c8).fillRoundedRect(0, 0, 280, 60, 12);
    g.fillStyle(0x2b1d14).fillTriangle(280, 20, 280, 40, 298, 30);
    g.fillStyle(0xf6e7c8).fillTriangle(278, 23, 278, 37, 293, 30);
    this.bubbleText = this.add
      .text(140, 30, '', { fontFamily: FONT, fontSize: '18px', fontStyle: '600', color: COLORS.ink, align: 'center', wordWrap: { width: 260 } })
      .setOrigin(0.5);
    this.bubble = this.add.container(860, 120, [g, this.bubbleText]).setDepth(90).setAlpha(0);
  }

  private tnFace(face: TnFace) {
    this.tnPortrait.setTexture(`pt_thanhnien_${face}`);
    this.tweens.add({ targets: this.tnPortrait, scale: { from: 2.12, to: 2 }, duration: 200, ease: 'Back.out' });
  }

  private meFace(face: 'neutral' | 'shock' | 'smug' | 'sad') {
    this.mePortrait.setTexture(`pt_player_${face}`);
    this.tweens.add({ targets: this.mePortrait, scale: { from: 2.12, to: 2 }, duration: 200, ease: 'Back.out' });
  }

  /** Non-blocking quip from the opponent. */
  private quip(text: string, face?: TnFace) {
    if (face) this.tnFace(face);
    this.bubbleText.setText(text);
    this.tweens.killTweensOf(this.bubble);
    this.bubble.setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: this.bubble, alpha: 1, scale: 1, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: this.bubble, alpha: 0, delay: 2200, duration: 300 });
    sfx('blip_c', { volume: 0.4, detune: 100 });
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }

  // ───────────────────────────── flow ─────────────────────────────
  private async run() {
    await this.u.fadeIn(500);
    await this.u.say([
      { who: 'tn', face: 'smirk', text: 'Luật đơn giản: 1 quân dân = 1 điểm, 1 quân quan = 5 điểm.' },
      { who: 'tn', face: 'smirk', text: 'Chọn 1 ô bên mình, rải theo chiều nào tùy. Hết quan hai bên là tính điểm. Ai nhiều điểm hơn ăn tiền.' },
      { who: 'tn', face: 'laugh', text: 'Hết dân thì tự bỏ quân ra rải, thiếu thì mượn tôi — cuối ván trả lại nha ông anh.' },
      { who: 'me', face: 'smug', text: 'Nói nhiều quá. Vô đi!' },
    ]);

    let keepPlaying = true;
    while (keepPlaying) {
      await this.chooseBet();
      const result = await this.playRound();
      this.rounds++;
      keepPlaying = await this.settle(result);
    }
    await this.u.fadeOut(500);
    this.u.hudVisible(false);
    finishMinigame(this, 'oanquan', { money: G.d.money, rounds: this.rounds });
  }

  private async chooseBet() {
    const allowed = BETS.filter((b) => b <= G.d.money);
    const options = allowed.length ? allowed : [G.d.money];
    this.banner.setText(`Ván ${this.rounds + 1}`);
    this.betText.setText('');
    const pick = await this.u.choose(`Đặt cược ván ${this.rounds + 1}? (Đang có ${fmtMoney(G.d.money)})`, options.map((b) => `Cược ${fmtMoney(b)}`));
    this.bet = options[pick];
    this.betText.setText(`Tiền cược: ${fmtMoney(this.bet)}`);
    const taunts =
      this.bet >= 50_000
        ? ['Chơi lớn dữ ha! Tiền này tôi xin trước nha.', 'shock']
        : this.bet >= 20_000
          ? ['20 cành hả? Được, vừa đủ tôi đi trà sữa.', 'laugh']
          : ['10k? Ông anh chơi kiểu học sinh tiểu học hả?', 'smirk'];
    sfx('coin');
    this.quip(taunts[0], taunts[1] as TnFace);
    await this.wait(900);
  }

  private async playRound(): Promise<{ a: number; b: number }> {
    // the show-off lets the challenger start the first round, then alternates
    this.state = createGame({ maxTurns: MAX_TURNS, firstTurn: this.rounds % 2 === 0 ? 'A' : 'B' });
    this.board.resetScores();
    this.board.sync(this.state);
    this.meFace('neutral');
    await this.wait(400);

    while (!this.state.over) {
      const moves = legalMoves(this.state);
      if (moves.length === 0) break; // defensive: the engine refills rows, so this should not happen
      const mover = this.state.turn;
      let move: Move;
      if (mover === 'A') {
        this.banner.setText('Lượt của bạn');
        move = await this.pickMove(moves);
      } else {
        this.banner.setText('Thanh niên đang tính…');
        this.help.setText('');
        this.tnFace('smirk');
        await this.wait(650 + Math.random() * 500);
        move = chooseAIMove(this.state, 'normal');
        this.highlightAI(move);
        await this.wait(450);
        this.picker.clear();
      }
      const before = score(this.state, mover);
      const { state, events } = applyMove(this.state, move);
      await this.board.play(events, mover);
      this.state = state;
      this.board.sync(state);
      this.react(mover, score(state, mover) - before);
      await this.wait(250);
    }
    this.banner.setText('Hết ván!');
    return { a: score(this.state, 'A'), b: score(this.state, 'B') };
  }

  private react(mover: 'A' | 'B', gained: number) {
    if (gained <= 0) return;
    if (mover === 'A') {
      this.meFace('smug');
      if (gained >= 5) this.quip(Phaser.Utils.Array.GetRandom(['Ơ… ăn quan tôi luôn hả?!', 'Khoan, khoan đã!', 'Hên thôi, hên thôi!']), 'shock');
      else this.quip(Phaser.Utils.Array.GetRandom(['Ăn có mấy hạt, ăn thua gì.', 'Được đó, nhưng chưa đủ đâu.', 'Hừm…']), 'annoyed');
    } else {
      this.meFace(gained >= 5 ? 'shock' : 'neutral');
      this.quip(
        Phaser.Utils.Array.GetRandom(gained >= 5 ? ['Quan về tay bố rồi nhé! HAHA', 'Thấy chưa, bố trò này đây!'] : ['Từ từ mà nhặt, ông anh.', 'Ngon, xin thêm mấy hạt.']),
        'laugh',
      );
    }
  }

  private async settle({ a, b }: { a: number; b: number }): Promise<boolean> {
    let title: string;
    if (a > b) {
      G.addMoney(this.bet);
      sfx('cash_register');
      this.meFace('smug');
      this.tnFace('shock');
      title = 'Thắng ván!';
      this.coinsFly(true);
      await this.u.say([{ who: 'tn', face: 'shock', text: Phaser.Utils.Array.GetRandom(['Gì vậy trời?! Ăn may thôi nha!', 'Không thể nào… làm ván nữa!', 'Ông anh có học qua lớp nào không vậy?']) }]);
    } else if (a < b) {
      G.addMoney(-this.bet);
      sfx('coin', { rate: 0.8 });
      this.meFace('sad');
      this.tnFace('laugh');
      title = 'Thua ván…';
      this.coinsFly(false);
      await this.u.say([{ who: 'tn', face: 'laugh', text: Phaser.Utils.Array.GetRandom(['Cảm ơn ông anh đã lì xì nha!', 'Gỡ đi chứ, gỡ đi ông anh!', 'Trò này tôi là bố mà, nói rồi.']) }]);
    } else {
      sfx('ui_back');
      title = 'Hòa!';
      await this.u.say([{ who: 'tn', face: 'annoyed', text: 'Hòa à? Chán thật. Làm ván nữa phân thắng thua đi.' }]);
    }

    const broke = G.d.money <= 0;
    const lines = [`Bạn ${a} điểm — Thanh niên ${b} điểm`, `Tiền trong túi: ${fmtMoney(G.d.money)}`];
    if (broke) lines.push('Hết sạch tiền rồi…');
    const buttons = broke ? ['Đành chịu…'] : ['Chơi tiếp', 'Nghỉ'];
    const pick = await resultCard(this, title, lines, buttons);
    return !broke && pick === 0;
  }

  private coinsFly(toPlayer: boolean) {
    const from = toPlayer ? [1172, 170] : [120, 60];
    const to = toPlayer ? [120, 44] : [1172, 170];
    for (let i = 0; i < 8; i++) {
      const c = this.add.image(from[0], from[1], 'ic_coin').setScale(3).setDepth(700);
      this.tweens.add({
        targets: c,
        x: to[0] + Phaser.Math.Between(-12, 12),
        y: to[1] + Phaser.Math.Between(-8, 8),
        delay: i * 70,
        duration: 600,
        ease: 'Cubic.inOut',
        onComplete: () => {
          sfx('coin', { volume: 0.3, detune: i * 60 });
          c.destroy();
        },
      });
    }
  }

  // ───────────────────────────── input ─────────────────────────────
  private highlightAI(m: Move) {
    const [x, y] = cellCenter(m.cell);
    this.drawPick(x, y, 0xf08a6a);
    const visualDir = m.dir === 1 ? -1 : 1; // top row runs right→left
    const a = this.add
      .text(x + visualDir * 40, y, visualDir > 0 ? '▶' : '◀', { fontFamily: FONT, fontSize: '34px', color: '#f08a6a', stroke: COLORS.ink, strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(300);
    this.tweens.add({ targets: a, x: a.x + visualDir * 10, alpha: 0, delay: 300, duration: 400, onComplete: () => a.destroy() });
  }

  private drawPick(x: number, y: number, color: number) {
    const g = this.picker.clear();
    g.fillStyle(color, 0.22).fillRoundedRect(x - CW / 2 + 4, y - CH / 2 + 4, CW - 8, CH - 8, 12);
    g.lineStyle(4, color, 1).strokeRoundedRect(x - CW / 2 + 4, y - CH / 2 + 4, CW - 8, CH - 8, 12);
  }

  /** Two-step pick: cell (←/→ + Enter, or click), then direction (←/→ + Enter, or click an arrow). */
  private pickMove(moves: Move[]): Promise<Move> {
    const cells = [...new Set(moves.map((m) => m.cell))].sort((p, q) => p - q);
    const kb = this.input.keyboard!;
    let sel = 0;
    let dirMode = false;
    let dir: Dir = 1;

    return new Promise((resolve) => {
      const render = () => {
        const cell = cells[sel];
        const [x, y] = cellCenter(cell);
        this.drawPick(x, y, dirMode ? 0x6f9a3a : 0xf2b84b);
        this.arrows.forEach((a) => a.destroy());
        this.arrows = [];
        for (const d of [-1, 1] as Dir[]) {
          const ax = x + d * (CW / 2 + 2);
          const active = dirMode && d === dir;
          const g = this.add.graphics();
          g.fillStyle(0x2b1d14).fillCircle(0, 0, 21);
          g.fillStyle(active ? 0x6f9a3a : 0xd9572b).fillCircle(0, 0, 18);
          g.fillStyle(0xffffff).fillTriangle(d * 9, 0, -d * 6, -9, -d * 6, 9);
          const c = this.add.container(ax, y, [g]).setDepth(310).setSize(42, 42).setInteractive({ useHandCursor: true });
          c.setAlpha(dirMode ? (active ? 1 : 0.7) : 0.85);
          c.on('pointerdown', () => commit(d));
          c.on('pointerover', () => {
            if (dirMode && dir !== d) {
              dir = d;
              render();
            }
          });
          if (active) this.tweens.add({ targets: c, x: ax + d * 5, yoyo: true, repeat: -1, duration: 300 });
          this.arrows.push(c);
        }
        this.help.setText(
          dirMode ? '←/→: chọn hướng rải · Enter/E: rải · Esc: chọn ô khác' : '←/→: chọn ô · Enter/E: chọn · Hoặc bấm mũi tên trên ô để rải ngay',
        );
      };

      const commit = (d: Dir) => {
        cleanup();
        sfx('ui_confirm', { volume: 0.6 });
        resolve({ cell: cells[sel], dir: d });
      };
      const onLeft = () => {
        if (this.u.busy) return;
        if (dirMode) dir = -1;
        else sel = (sel + cells.length - 1) % cells.length;
        sfx('ui_hover', { volume: 0.4 });
        render();
      };
      const onRight = () => {
        if (this.u.busy) return;
        if (dirMode) dir = 1;
        else sel = (sel + 1) % cells.length;
        sfx('ui_hover', { volume: 0.4 });
        render();
      };
      const onEnter = () => {
        if (this.u.busy) return;
        if (!dirMode) {
          dirMode = true;
          sfx('ui_click', { volume: 0.5 });
          render();
        } else commit(dir);
      };
      const onEsc = () => {
        if (!dirMode) return;
        dirMode = false;
        sfx('ui_back', { volume: 0.5 });
        render();
      };
      const keys: [string, () => void][] = [
        ['keydown-LEFT', onLeft],
        ['keydown-A', onLeft],
        ['keydown-RIGHT', onRight],
        ['keydown-D', onRight],
        ['keydown-ENTER', onEnter],
        ['keydown-E', onEnter],
        ['keydown-SPACE', onEnter],
        ['keydown-ESC', onEsc],
        ['keydown-BACKSPACE', onEsc],
      ];
      keys.forEach(([k, f]) => kb.on(k, f));

      this.zones = cells.map((cell, i) => {
        const [x, y] = cellCenter(cell);
        const z = this.add.zone(x, y, CW - 10, CH - 10).setInteractive({ useHandCursor: true }).setDepth(4);
        z.on('pointerover', () => {
          if (sel !== i) {
            sel = i;
            dirMode = false;
            sfx('ui_hover', { volume: 0.3 });
            render();
          }
        });
        z.on('pointerdown', () => {
          sel = i;
          dirMode = true;
          render();
        });
        return z;
      });

      const cleanup = () => {
        keys.forEach(([k, f]) => kb.off(k, f));
        this.zones.forEach((z) => z.destroy());
        this.zones = [];
        this.arrows.forEach((a) => a.destroy());
        this.arrows = [];
        this.picker.clear();
        this.help.setText('');
      };
      render();
    });
  }
}
