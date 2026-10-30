import Phaser from 'phaser';
import { COLORS, FONT, GAME_W, SPEED } from '../config';
import { MAPS } from '../data/maps';
import { Actor, type Facing } from '../entities/Actor';
import { G } from '../state/GameState';
import { music, sfx } from '../systems/Audio';
import { finishMinigame } from '../systems/Flow';
import { countdown, hudLabel, resultCard } from '../ui/MinigameKit';
import { ui } from './UIScene';

/**
 * "Cá sấu lên bờ" egg run: sneak eggs out of the nests, carry up to three back
 * to the basket by the kitchen door, and don't get bitten five times.
 *
 * Zoom 2 (not the world's 3): the 640x360 view shows almost the whole garden,
 * so the player can read where both geese are before committing to a run.
 */
const ZOOM = 2;
const TIME_LIMIT = 120;
const WIN_EGGS = 10;
const EARLY_WIN = 15;
const MAX_LIVES = 5;
const CARRY_MAX = 3;
const NEST_MAX = 3;
const RESPAWN_MS = 9000;
const BASKET = { x: 261, y: 172 };
const SAFE_R = 46;
const GRAIN_THROWS = 3;

const NESTS: [number, number][] = [
  [520, 190],
  [565, 190],
  [610, 268],
  [565, 302],
  [695, 268],
  [130, 260],
  [440, 252],
  [320, 335],
];

interface Nest {
  x: number;
  y: number;
  eggs: number;
  img: Phaser.GameObjects.Image;
  eggImgs: Phaser.GameObjects.Image[];
  timer: number;
}

type GooseState = 'home' | 'alert' | 'chase' | 'dash' | 'return' | 'eat' | 'bite';

interface Goose {
  spr: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  home: { x: number; y: number };
  /** nests this goose guards (indices into NESTS) */
  turf: number[];
  state: GooseState;
  t: number;
  wander: { x: number; y: number } | null;
  dashCd: number;
  target: { x: number; y: number } | null;
}

export class GooseScene extends Phaser.Scene {
  private player!: Actor;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private nests: Nest[] = [];
  private geese: Goose[] = [];
  private carried: Phaser.GameObjects.Image[] = [];
  private score = 0;
  private bites = 0;
  private timeLeft = TIME_LIMIT;
  private grainLeft = 0;
  private grainPiles: { x: number; y: number; img: Phaser.GameObjects.Image; t: number }[] = [];
  private playing = false;
  private stunned = 0;
  private stepTimer = 0;
  private invuln = 0;
  private hint!: Phaser.GameObjects.Text;
  private hintTarget: Nest | 'basket' | null = null;
  private timerLbl!: Phaser.GameObjects.Text;
  private eggLbl!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private grainLbl: Phaser.GameObjects.Text | null = null;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private safeRing!: Phaser.GameObjects.Graphics;
  private retry = false;

  constructor() {
    super('Goose');
  }

  init(data: { retry?: boolean }) {
    this.retry = !!data?.retry;
    this.nests = [];
    this.geese = [];
    this.carried = [];
    this.grainPiles = [];
    this.hearts = [];
    this.grainLbl = null;
    this.score = 0;
    this.bites = 0;
    this.timeLeft = TIME_LIMIT;
    this.grainLeft = G.d.grain ? GRAIN_THROWS : 0;
    this.playing = false;
    this.stunned = 0;
    this.invuln = 0;
    this.hintTarget = null;
  }

  create() {
    const u = ui(this);
    u.hudVisible(false);
    u.quest(null);
    this.makeTextures();

    const bg = this.add.image(0, 0, 's_garden').setOrigin(0).setDepth(0);
    this.physics.world.setBounds(0, 0, bg.width, bg.height);
    this.walls = this.physics.add.staticGroup();
    for (const [x, y, w, h] of MAPS.garden.walls) this.walls.add(this.add.zone(x + w / 2, y + h / 2, w, h));
    // the kitchen door is closed during the game
    this.walls.add(this.add.zone(261, 104, 78, 12));

    // safe zone + basket
    this.safeRing = this.add.graphics().setDepth(1);
    this.drawSafeRing(0);
    this.tweens.addCounter({ from: 0, to: 1, duration: 1400, yoyo: true, repeat: -1, onUpdate: (t) => this.drawSafeRing(t.getValue() ?? 0) });
    this.add.image(BASKET.x, BASKET.y, 'gz_basket').setOrigin(0.5, 1).setDepth(10 + BASKET.y);

    for (const [x, y] of NESTS) {
      const img = this.add.image(x, y, 'pr_nest_empty').setDepth(2);
      const n: Nest = { x, y, eggs: NEST_MAX, img, eggImgs: [], timer: RESPAWN_MS };
      this.nests.push(n);
      this.renderNest(n);
    }

    this.player = new Actor(this, 261, 196, 'ch_player', true);
    this.player.face('down');
    this.physics.add.collider(this.player, this.walls);

    this.geese.push(this.makeGoose(600, 230, [0, 1, 2, 3, 4]));
    this.geese.push(this.makeGoose(340, 290, [5, 6, 7]));

    this.dust = this.add
      .particles(0, 0, 'gz_dust', {
        lifespan: 450,
        speed: { min: 6, max: 18 },
        angle: { min: 200, max: 340 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.7, end: 0 },
        emitting: false,
      })
      .setDepth(5);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setBounds(0, 0, bg.width, bg.height).setRoundPixels(true).setBackgroundColor('#120d0a');

    this.hint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '22px', fontStyle: '700', color: COLORS.ink, backgroundColor: COLORS.paper, padding: { x: 8, y: 3 } })
      .setOrigin(0.5, 1)
      .setScale(1 / ZOOM)
      .setDepth(9000)
      .setVisible(false);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE,Q') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', () => this.interact());
    kb.on('keydown-SPACE', () => this.interact());
    kb.on('keydown-Q', () => this.throwGrain());

    // The world camera is zoomed, so screen-space UI (HUD, countdown, result card) gets
    // its own unzoomed camera; objects are routed by scroll factor every frame.
    const main = this.cameras.main;
    const hudCam = this.cameras.add(0, 0, main.width, main.height);
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, () => {
      for (const go of this.children.list) go.cameraFilter = (go as unknown as { scrollFactorX: number }).scrollFactorX === 0 ? main.id : hudCam.id;
    });

    this.buildHud();
    music('goose_chase');
    void this.intro();
  }

  // ───────────────────────────── setup ─────────────────────────────
  private makeTextures() {
    if (this.textures.exists('gz_basket')) return;
    const g = this.make.graphics({}, false);
    // woven bamboo basket (rổ)
    g.fillStyle(0x2b1d14).fillEllipse(12, 12, 24, 10);
    g.fillStyle(0x6b4a26).fillRect(2, 5, 20, 8);
    g.fillStyle(0xb8873f).fillRect(3, 5, 18, 7);
    g.fillStyle(0x8a6230);
    for (let x = 4; x < 21; x += 3) g.fillRect(x, 6, 1, 6);
    g.fillRect(3, 8, 18, 1);
    g.fillStyle(0xd9a85a).fillEllipse(12, 5, 22, 6);
    g.fillStyle(0x5a3c1c).fillEllipse(12, 5, 17, 3);
    g.generateTexture('gz_basket', 24, 16);
    g.clear();
    g.fillStyle(0xc9a46a).fillRect(0, 0, 2, 2);
    g.generateTexture('gz_dust', 2, 2);
    g.clear();
    g.fillStyle(0xe8c45a).fillRect(0, 0, 1, 1);
    g.generateTexture('gz_seed', 1, 1);
    g.clear();
    g.fillStyle(0xfff6e0).fillRect(0, 0, 2, 2);
    g.fillStyle(0xf2b84b).fillRect(1, 1, 1, 1);
    g.generateTexture('gz_yolk', 2, 2);
    g.clear();
    // small cream egg (the painted pr_egg reads as a heart at this size)
    g.fillStyle(0x5a3c1c).fillRect(1, 0, 3, 1).fillRect(0, 1, 5, 5).fillRect(1, 6, 3, 1);
    g.fillStyle(0xfdf3dc).fillRect(1, 1, 3, 5);
    g.fillStyle(0xe9d3a8).fillRect(3, 3, 1, 3).fillRect(2, 5, 1, 1);
    g.fillStyle(0xffffff).fillRect(1, 1, 1, 2);
    g.generateTexture('gz_egg', 5, 7);
    g.destroy();
  }

  private drawSafeRing(p: number) {
    const g = this.safeRing.clear();
    g.fillStyle(0xf2b84b, 0.08 + p * 0.06).fillCircle(BASKET.x, BASKET.y + 6, SAFE_R);
    g.lineStyle(1, 0xf6e7c8, 0.35 + p * 0.3);
    const segs = 24;
    for (let i = 0; i < segs; i += 2) {
      const a0 = (i / segs) * Math.PI * 2 + p * 0.3;
      const a1 = ((i + 1) / segs) * Math.PI * 2 + p * 0.3;
      g.beginPath();
      g.arc(BASKET.x, BASKET.y + 6, SAFE_R, a0, a1);
      g.strokePath();
    }
  }

  private makeGoose(x: number, y: number, turf: number[]): Goose {
    const spr = this.physics.add.sprite(x, y, 'ch_goose', 0).setOrigin(0.5, 1);
    spr.play('goose:walk');
    const body = spr.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 6).setOffset((spr.width - 14) / 2, spr.height - 7).setCollideWorldBounds(true);
    this.physics.add.collider(spr, this.walls);
    const shadow = this.add.ellipse(x, y - 1, 20, 5, 0x000000, 0.28);
    return { spr, shadow, home: { x, y }, turf, state: 'home', t: 0, wander: null, dashCd: 0, target: null };
  }

  private renderNest(n: Nest) {
    n.eggImgs.forEach((e) => e.destroy());
    const spots: [number, number][] = [
      [-4, -1],
      [3, -2],
      [0, 1],
    ];
    n.eggImgs = spots.slice(0, n.eggs).map(([dx, dy]) => this.add.image(n.x + dx, n.y + dy, 'gz_egg').setDepth(3));
  }

  private buildHud() {
    const t = hudLabel(this, GAME_W / 2, 18, 170, 0.5);
    this.timerLbl = t.t;
    const e = hudLabel(this, 20, 18, 230);
    this.eggLbl = e.t;
    this.add.image(46, 43, 'it_egg2').setScrollFactor(0).setDepth(9002).setScale(1.4);
    this.eggLbl.setX(this.eggLbl.x + 16);
    for (let i = 0; i < MAX_LIVES; i++) {
      this.hearts.push(this.add.image(GAME_W - 40 - i * 40, 43, 'ic_heart').setScrollFactor(0).setDepth(9002).setScale(2.4));
    }
    if (this.grainLeft > 0) {
      const gl = hudLabel(this, 20, 80, 230);
      this.grainLbl = gl.t;
    }
    this.refreshHud();
  }

  private refreshHud() {
    const s = Math.max(0, Math.ceil(this.timeLeft));
    this.timerLbl.setText(`⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    this.timerLbl.setColor(s <= 15 ? COLORS.danger : COLORS.ink);
    this.eggLbl.setText(`${this.score} / ${WIN_EGGS}   ✋${this.carried.length}`);
    this.hearts.forEach((h, i) => h.setTint(i < MAX_LIVES - this.bites ? 0xffffff : 0x3a2a20).setAlpha(i < MAX_LIVES - this.bites ? 1 : 0.6));
    this.grainLbl?.setText(`Q: ném thóc ×${this.grainLeft}`);
  }

  // ───────────────────────────── intro ─────────────────────────────
  private async intro() {
    const u = ui(this);
    const cam = this.cameras.main;
    if (this.retry) {
      cam.startFollow(this.player, true, 0.12, 0.12);
      await u.fadeIn(400);
      await countdown(this);
      this.playing = true;
      return;
    }
    cam.centerOn(this.player.x, this.player.y);
    await u.fadeIn(500);
    u.letterbox(true);
    this.player.emote('!');
    await this.wait(500);
    // JoJo stand-off: pan to the geese, zoom in, menacing ゴゴゴ
    cam.pan(480, 260, 1100, 'Sine.easeInOut');
    cam.zoomTo(3, 1100, 'Sine.easeInOut');
    await this.wait(1100);
    this.geese.forEach((g, i) => {
      g.spr.setFlipX(true);
      this.time.delayedCall(i * 260, () => {
        sfx('goose_honk', { detune: i * -200 });
        g.spr.play('goose:run');
        this.tweens.add({ targets: g.spr, scaleY: 1.2, scaleX: 0.9, yoyo: true, duration: 140, repeat: 2 });
      });
    });
    const menace = this.menace(480, 250);
    this.cameras.main.shake(900, 0.003);
    await u.caption('ゴ ゴ ゴ ゴ', 'Hai con ngỗng già đang tỏa sát khí…', 1300);
    menace();
    this.geese.forEach((g) => g.spr.active && g.spr.play('goose:walk'));
    cam.pan(this.player.x, this.player.y, 900, 'Sine.easeInOut');
    cam.zoomTo(ZOOM, 900, 'Sine.easeInOut');
    await this.wait(950);
    u.letterbox(false);
    await u.say([
      { who: 'me', face: 'shock', text: 'Tụi bây nhìn tao kiểu gì vậy… Tao chỉ lấy vài quả trứng thôi mà.' },
      'Nhặt trứng ở các ổ (E), mỗi lần ôm tối đa 3 quả, rồi chạy về RỔ cạnh cửa bếp để cất.',
      'Mỗi ổ phải chừa lại ít nhất 1 quả cho gà mái. Vòng sáng quanh rổ là vùng an toàn — ngỗng sẽ không đuổi vào đó.',
      ...(this.grainLeft > 0 ? ['Bạn có mang theo thóc: nhấn Q để ném thóc dụ ngỗng ra chỗ khác (3 lần).'] : []),
      `Gom đủ ${WIN_EGGS} quả trong 2 phút. Bị cạp ${MAX_LIVES} lần là… thua. Shift để chạy!`,
    ]);
    cam.startFollow(this.player, true, 0.12, 0.12);
    await countdown(this);
    this.playing = true;
  }

  /** Floating purple ゴ glyphs around a point; returns a stop function. */
  private menace(x: number, y: number) {
    const ev = this.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        const t = this.add
          .text(x + Phaser.Math.Between(-110, 110), y + Phaser.Math.Between(-40, 50), 'ゴ', {
            fontFamily: FONT,
            fontSize: '42px',
            fontStyle: '800',
            color: '#8a3fb5',
            stroke: '#2b0f3a',
            strokeThickness: 6,
          })
          .setScale(1 / 3)
          .setDepth(9500)
          .setAngle(Phaser.Math.Between(-20, 20))
          .setAlpha(0);
        this.tweens.add({ targets: t, alpha: 0.95, y: t.y - 14, duration: 350, yoyo: true, hold: 300, onComplete: () => t.destroy() });
      },
    });
    return () => ev.remove();
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }

  // ───────────────────────────── actions ─────────────────────────────
  private nearestNest(): Nest | null {
    let best: Nest | null = null;
    let bd = 22;
    for (const n of this.nests) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y + 4);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  private nearBasket() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, BASKET.x, BASKET.y + 8) < 26;
  }

  private interact() {
    if (!this.playing || this.stunned > 0 || ui(this).busy) return;
    if (this.nearBasket() && this.carried.length) return this.deposit();
    const n = this.nearestNest();
    if (!n) return;
    if (this.carried.length >= CARRY_MAX) return this.floatText(this.player.x, this.player.y - 46, 'Ôm hết nổi rồi!', COLORS.danger);
    if (n.eggs <= 1) {
      sfx('ui_back', { volume: 0.5 });
      return this.floatText(n.x, n.y - 10, 'Chừa 1 quả cho gà mái ấp!', COLORS.accentDark);
    }
    n.eggs--;
    this.renderNest(n);
    sfx('egg_collect', { detune: this.carried.length * 120 });
    const egg = this.add.image(n.x, n.y, 'gz_egg').setDepth(9000);
    this.carried.push(egg);
    this.tweens.add({ targets: this.player, scaleY: 0.85, scaleX: 1.12, yoyo: true, duration: 90 });
    this.refreshHud();
    // grabbing an egg always gets the guarding goose's attention
    for (const g of this.geese) if (g.turf.includes(this.nests.indexOf(n)) && g.state !== 'eat') this.aggro(g);
  }

  private deposit() {
    const n = this.carried.length;
    this.carried.forEach((egg, i) => {
      // little arc into the basket
      this.tweens.add({ targets: egg, x: BASKET.x + Phaser.Math.Between(-4, 4), duration: 320, delay: i * 110 });
      this.tweens.add({ targets: egg, y: BASKET.y - 30, duration: 150, delay: i * 110, ease: 'Quad.out' });
      this.tweens.add({ targets: egg, y: BASKET.y - 8, duration: 170, delay: i * 110 + 150, ease: 'Quad.in', onComplete: () => egg.destroy() });
      this.time.delayedCall(i * 110 + 300, () => {
        sfx('pickup', { detune: i * 200 });
        this.score++;
        this.refreshHud();
        this.tweens.add({ targets: this.eggLbl, scale: { from: 1.3, to: 1 }, duration: 220, ease: 'Back.out' });
        this.floatText(BASKET.x, BASKET.y - 22, '+1', COLORS.leaf);
        if (this.score >= EARLY_WIN && this.playing) void this.win();
      });
    });
    this.carried = [];
    if (n >= 3) this.time.delayedCall(450, () => sfx('coin'));
  }

  private throwGrain() {
    if (!this.playing || this.grainLeft <= 0 || this.stunned > 0) return;
    this.grainLeft--;
    this.refreshHud();
    const dir = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.player.facing];
    const tx = Phaser.Math.Clamp(this.player.x + dir[0] * 70, 80, 710);
    const ty = Phaser.Math.Clamp(this.player.y + dir[1] * 70, 175, 385);
    sfx('grain_scatter');
    this.add
      .particles(this.player.x, this.player.y - 16, 'gz_seed', {
        lifespan: 420,
        speed: { min: 30, max: 60 },
        moveToX: { min: tx - 10, max: tx + 10 },
        moveToY: { min: ty - 6, max: ty + 6 },
        quantity: 28,
        emitting: false,
      })
      .setDepth(9000)
      .explode(28);
    const img = this.add.image(tx, ty, 'pr_grain').setScale(0).setDepth(3);
    this.tweens.add({ targets: img, scale: 0.7, duration: 300, delay: 300, ease: 'Back.out' });
    const pile = { x: tx, y: ty, img, t: 5000 };
    this.grainPiles.push(pile);
    for (const g of this.geese) {
      if (Phaser.Math.Distance.Between(g.spr.x, g.spr.y, tx, ty) < 320) {
        g.state = 'eat';
        g.t = 5000;
        g.target = { x: tx + Phaser.Math.Between(-8, 8), y: ty + Phaser.Math.Between(-4, 4) };
        this.time.delayedCall(Phaser.Math.Between(0, 250), () => sfx('goose_honk', { volume: 0.5, detune: 300 }));
      }
    }
  }

  private floatText(x: number, y: number, s: string, color: string) {
    const t = this.add
      .text(x, y, s, { fontFamily: FONT, fontSize: '22px', fontStyle: '800', color, stroke: COLORS.paper, strokeThickness: 5 })
      .setOrigin(0.5)
      .setScale(1 / ZOOM)
      .setDepth(9500);
    this.tweens.add({ targets: t, y: y - 16, alpha: { from: 1, to: 0 }, duration: 1000, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  // ───────────────────────────── geese ─────────────────────────────
  private aggro(g: Goose) {
    if (g.state === 'chase' || g.state === 'dash' || g.state === 'bite') return;
    g.state = 'alert';
    g.t = 380;
    g.spr.setVelocity(0, 0);
    sfx('goose_honk', { detune: Phaser.Math.Between(-150, 150) });
    const t = this.add
      .text(g.spr.x, g.spr.y - 28, '!', { fontFamily: FONT, fontSize: '40px', fontStyle: '800', color: COLORS.danger, stroke: COLORS.paper, strokeThickness: 6 })
      .setOrigin(0.5, 1)
      .setScale(0)
      .setDepth(9500);
    this.tweens.add({ targets: t, scale: 1 / ZOOM, duration: 160, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 200, onComplete: () => t.destroy() });
    this.tweens.add({ targets: g.spr, scaleY: 1.25, scaleX: 0.85, yoyo: true, duration: 120 });
  }

  private playerSafe() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, BASKET.x, BASKET.y + 6) < SAFE_R;
  }

  private moveGoose(g: Goose, tx: number, ty: number, speed: number) {
    const dx = tx - g.spr.x;
    const dy = ty - g.spr.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) {
      g.spr.setVelocity(0, 0);
      return true;
    }
    g.spr.setVelocity((dx / d) * speed, (dy / d) * speed);
    if (Math.abs(dx) > 1) g.spr.setFlipX(dx < 0);
    return false;
  }

  private updateGoose(g: Goose, dt: number) {
    const p = this.player;
    const dp = Phaser.Math.Distance.Between(g.spr.x, g.spr.y, p.x, p.y);
    g.t -= dt;
    g.dashCd -= dt;
    const anim = (k: string) => g.spr.anims.currentAnim?.key !== k && g.spr.play(k, true);

    switch (g.state) {
      case 'home': {
        anim('goose:walk');
        if (!g.wander || this.moveGoose(g, g.wander.x, g.wander.y, 22) || g.t <= 0) {
          g.wander = { x: g.home.x + Phaser.Math.Between(-45, 45), y: g.home.y + Phaser.Math.Between(-30, 30) };
          g.t = Phaser.Math.Between(1500, 3000);
          if (Math.random() < 0.35) {
            g.spr.setVelocity(0, 0);
            g.wander = null;
          }
        }
        if (!g.wander) g.spr.anims.pause();
        else g.spr.anims.resume();
        // player creeping near the turf nests or the goose itself
        const nearTurf = g.turf.some((i) => Phaser.Math.Distance.Between(p.x, p.y, NESTS[i][0], NESTS[i][1]) < 50);
        if (this.playing && !this.playerSafe() && (nearTurf || dp < 42)) this.aggro(g);
        break;
      }
      case 'alert':
        g.spr.setVelocity(0, 0);
        g.spr.setFlipX(p.x < g.spr.x);
        anim('goose:run');
        if (g.t <= 0) {
          g.state = 'chase';
          g.t = 7000;
        }
        break;
      case 'chase':
        g.spr.anims.resume();
        anim('goose:run');
        this.moveGoose(g, p.x, p.y, 74);
        if (dp < 46 && g.dashCd <= 0) {
          g.state = 'dash';
          g.t = 380;
          g.target = { x: p.x, y: p.y };
          g.dashCd = 1500;
          sfx('goose_honk', { volume: 0.6, rate: 1.2 });
        }
        if (this.playerSafe() || g.t <= 0) this.giveUp(g);
        break;
      case 'dash': {
        // committed lunge toward where the player was
        const t = g.target!;
        const dx = t.x - g.spr.x;
        const dy = t.y - g.spr.y;
        const d = Math.hypot(dx, dy) || 1;
        g.spr.setVelocity((dx / d) * 135, (dy / d) * 135);
        if (Math.abs(dx) > 1) g.spr.setFlipX(dx < 0);
        if (g.t <= 0 || d < 4) {
          g.state = this.playerSafe() ? 'return' : 'chase';
          if (g.state === 'return') g.t = 0;
        }
        break;
      }
      case 'bite':
        g.spr.setVelocity(0, 0);
        if (g.t <= 0) {
          g.state = 'return';
        }
        break;
      case 'return':
        anim('goose:walk');
        g.spr.anims.resume();
        if (this.moveGoose(g, g.home.x, g.home.y, 40) || Phaser.Math.Distance.Between(g.spr.x, g.spr.y, g.home.x, g.home.y) < 6) {
          g.state = 'home';
          g.t = 0;
        }
        // a goose walking home still notices thieves at its nests
        if (this.playing && !this.playerSafe() && g.turf.some((i) => Phaser.Math.Distance.Between(p.x, p.y, NESTS[i][0], NESTS[i][1]) < 34)) this.aggro(g);
        break;
      case 'eat': {
        const t = g.target!;
        if (this.moveGoose(g, t.x, t.y, 70) || Phaser.Math.Distance.Between(g.spr.x, g.spr.y, t.x, t.y) < 5) {
          g.spr.setVelocity(0, 0);
          anim('goose:bite');
          if (!g.spr.anims.isPlaying) g.spr.play('goose:bite');
        } else anim('goose:walk');
        if (g.t <= 0) {
          g.state = 'return';
        }
        break;
      }
    }

    // bite check
    if ((g.state === 'chase' || g.state === 'dash') && this.invuln <= 0 && this.playing) {
      const hit = Math.abs(g.spr.x - p.x) < 11 && Math.abs(g.spr.y - p.y) < 8;
      if (hit) this.bite(g);
    }

    g.spr.setDepth(10 + g.spr.y);
    g.shadow.setPosition(g.spr.x, g.spr.y - 1).setDepth(9 + g.spr.y);
  }

  private giveUp(g: Goose) {
    g.state = 'return';
    g.spr.setVelocity(0, 0);
    sfx('goose_honk', { volume: 0.35, rate: 0.8 });
  }

  private bite(g: Goose) {
    this.bites++;
    this.invuln = 1300;
    this.stunned = 380;
    g.state = 'bite';
    g.t = 900;
    g.spr.play('goose:bite');
    g.spr.setFlipX(this.player.x < g.spr.x);
    sfx('goose_bite');
    this.time.delayedCall(90, () => sfx('hurt'));
    ui(this).flash(0xc8322b, 220);
    this.cameras.main.shake(220, 0.008);
    // knockback away from the goose
    const dx = this.player.x - g.spr.x;
    const dy = this.player.y - g.spr.y;
    const d = Math.hypot(dx, dy) || 1;
    this.player.setVelocity((dx / d) * 220, (dy / d) * 220);
    this.player.setTint(0xff8a7a);
    this.tweens.add({ targets: this.player, alpha: 0.4, yoyo: true, repeat: 5, duration: 100, onComplete: () => this.player.setAlpha(1).clearTint() });
    this.dropEggs();
    this.refreshHud();
    const lost = this.hearts[MAX_LIVES - this.bites];
    if (lost) this.tweens.add({ targets: lost, scale: { from: 3.4, to: 2.4 }, duration: 300 });
    if (this.bites >= MAX_LIVES) void this.lose();
  }

  private dropEggs() {
    if (!this.carried.length) return;
    for (const egg of this.carried) {
      const tx = egg.x + Phaser.Math.Between(-18, 18);
      const ty = this.player.y + Phaser.Math.Between(-4, 8);
      this.tweens.add({
        targets: egg,
        x: tx,
        y: ty,
        angle: 180,
        duration: 320,
        ease: 'Quad.in',
        onComplete: () => {
          this.add
            .particles(tx, ty, 'gz_yolk', { lifespan: 380, speed: { min: 10, max: 30 }, quantity: 8, emitting: false, alpha: { start: 1, end: 0 } })
            .setDepth(9000)
            .explode(8);
          egg.destroy();
        },
      });
    }
    sfx('dish_crash', { volume: 0.35, rate: 1.8 });
    this.floatText(this.player.x, this.player.y - 46, 'Bể trứng rồi!', COLORS.danger);
    this.carried = [];
  }

  // ───────────────────────────── loop ─────────────────────────────
  update(_t: number, dt: number) {
    if (!this.player?.body) return;
    for (const g of this.geese) this.updateGoose(g, this.playing ? dt : 0);
    this.updatePlayer(dt);
    this.updateCarried();
    this.updateHint();
    if (!this.playing) return;

    this.invuln -= dt;
    for (const n of this.nests) {
      if (n.eggs >= NEST_MAX) continue;
      n.timer -= dt;
      if (n.timer <= 0) {
        n.timer = RESPAWN_MS;
        n.eggs++;
        this.renderNest(n);
        n.eggImgs.at(-1)?.setScale(0);
        this.tweens.add({ targets: n.eggImgs.at(-1), scale: 1, duration: 260, ease: 'Back.out' });
      }
    }
    for (const pile of this.grainPiles) {
      pile.t -= dt;
      if (pile.t <= 0 && pile.img.active) this.tweens.add({ targets: pile.img, alpha: 0, scale: 0.3, duration: 400, onComplete: () => pile.img.destroy() });
    }
    this.grainPiles = this.grainPiles.filter((p) => p.t > 0);

    const prev = Math.ceil(this.timeLeft);
    this.timeLeft -= dt / 1000;
    const now = Math.ceil(this.timeLeft);
    if (now !== prev) {
      this.refreshHud();
      if (now <= 10 && now > 0) {
        sfx('ui_click', { rate: 1.4 });
        this.tweens.add({ targets: this.timerLbl, scale: { from: 1.3, to: 1 }, duration: 250 });
      }
    }
    if (this.timeLeft <= 0) void this.timeUp();
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const k = this.keys;
    if (this.stunned > 0) {
      this.stunned -= dt;
      p.setVelocity((p.body!.velocity.x as number) * 0.86, (p.body!.velocity.y as number) * 0.86);
      return;
    }
    let vx = 0;
    let vy = 0;
    if (this.playing && !ui(this).busy) {
      if (k.A.isDown || k.LEFT.isDown) vx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) vx += 1;
      if (k.W.isDown || k.UP.isDown) vy -= 1;
      if (k.S.isDown || k.DOWN.isDown) vy += 1;
    }
    if (vx || vy) {
      const running = k.SHIFT.isDown;
      // each egg in your arms slows you a little
      const speed = (running ? SPEED.run : SPEED.walk) * (1 - this.carried.length * 0.07);
      const len = Math.hypot(vx, vy);
      p.setVelocity((vx / len) * speed, (vy / len) * speed);
      const dir: Facing = vx !== 0 && Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      p.walk(dir, running ? 1.6 : 1);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        sfx('step_dirt', { volume: 0.25, detune: Phaser.Math.Between(-150, 150) });
        this.stepTimer = running ? 200 : 320;
        if (running) this.dust.emitParticleAt(p.x, p.y, 3);
      }
    } else {
      p.setVelocity(0, 0);
      if (p.anims.currentAnim?.key.includes('walk')) p.idle();
    }
  }

  private updateCarried() {
    const t = this.time.now / 1000;
    this.carried.forEach((egg, i) => {
      if (this.tweens.isTweening(egg)) return;
      egg.setPosition(this.player.x - 5 + i * 5, this.player.y - 44 - Math.abs(Math.sin(t * 8 + i)) * 2);
    });
  }

  private updateHint() {
    let target: Nest | 'basket' | null = null;
    let text = '';
    if (this.playing && this.stunned <= 0) {
      if (this.nearBasket() && this.carried.length) {
        target = 'basket';
        text = `E  Cất ${this.carried.length} trứng`;
      } else {
        const n = this.nearestNest();
        if (n) {
          target = n;
          text = n.eggs <= 1 ? 'Chừa lại 1 quả' : this.carried.length >= CARRY_MAX ? 'Đầy tay rồi' : 'E  Lấy trứng';
        }
      }
    }
    if (target !== this.hintTarget) {
      this.hintTarget = target;
      this.hint.setVisible(!!target);
      if (target) {
        this.hint.setText(text);
        const [x, y] = target === 'basket' ? [BASKET.x, BASKET.y - 18] : [target.x, target.y - 10];
        this.hint.setPosition(x, y).setAlpha(0);
        this.tweens.add({ targets: this.hint, alpha: 1, y: y - 3, duration: 150 });
      }
    } else if (target && this.hint.text !== text) this.hint.setText(text);
  }

  // ───────────────────────────── endings ─────────────────────────────
  private stopPlay() {
    this.playing = false;
    this.player.setVelocity(0, 0);
    this.player.idle();
    this.geese.forEach((g) => g.spr.setVelocity(0, 0));
    this.hint.setVisible(false);
  }

  private async win() {
    if (!this.playing) return;
    this.stopPlay();
    this.dropEggsQuietly();
    music(null, { fadeMs: 600 });
    sfx('success_jingle');
    this.player.face('down').hop(8);
    const pick = await resultCard(this, 'Thu hoạch xong!', [`Đã cất ${this.score} quả trứng vào rổ`, `Bị ngỗng cạp: ${this.bites} lần`], ['Mang trứng vào bếp']);
    void pick;
    G.d.eggs = this.score;
    await ui(this).fadeOut(500);
    finishMinigame(this, 'goose', { won: true, eggs: this.score, bites: this.bites });
  }

  /** Eggs still in hand at the whistle don't count but shouldn't explode either. */
  private dropEggsQuietly() {
    this.carried.forEach((e) => this.tweens.add({ targets: e, alpha: 0, duration: 300, onComplete: () => e.destroy() }));
    this.carried = [];
  }

  private async timeUp() {
    if (!this.playing) return;
    if (this.score >= WIN_EGGS) return this.win();
    this.stopPlay();
    this.dropEggsQuietly();
    sfx('fail_sting');
    const pick = await resultCard(this, 'Hết giờ!', [`Mới được ${this.score} quả — cần ít nhất ${WIN_EGGS}.`, 'Mẹ mà biết thì…'], ['Thử lại']);
    void pick;
    await ui(this).fadeOut(400);
    this.scene.restart({ retry: true });
  }

  private async lose() {
    this.stopPlay();
    music(null, { fadeMs: 400 });
    sfx('fail_sting');
    const p = this.player;
    this.geese.forEach((g) => {
      g.spr.play('goose:run');
      g.spr.setFlipX(p.x < g.spr.x);
      this.tweens.add({ targets: g.spr, y: g.spr.y - 6, yoyo: true, repeat: 3, duration: 140 });
    });
    sfx('goose_honk');
    this.time.delayedCall(250, () => sfx('goose_honk', { detune: -300 }));
    this.tweens.add({ targets: p, angle: 90, y: p.y - 4, duration: 400, ease: 'Bounce.out' });
    this.cameras.main.zoomTo(3, 900, 'Sine.easeInOut');
    await this.wait(1600);
    await ui(this).fadeOut(600);
    finishMinigame(this, 'goose', { won: false, eggs: this.score, bites: this.bites });
  }
}
