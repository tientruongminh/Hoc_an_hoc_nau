import Phaser from 'phaser';
import { COLORS, FONT, GAME_H, GAME_W } from '../config';
import { Banner, genTextures, popText, sleep } from '../minigames/kitchen/kit';
import { ambient, music, sfx } from '../systems/Audio';
import { finishMinigame } from '../systems/Flow';
import { countdown, hudLabel, resultCard } from '../ui/MinigameKit';
import { ui } from './UIScene';

const PLATES = 6;
const S = 2.51; // backdrop scale (510x292 → fills 1280x720)
/** native s_sink pixel → screen */
const sx = (nx: number) => GAME_W / 2 + (nx - 255) * S;
const sy = (ny: number) => GAME_H / 2 + (ny - 146) * S;

interface Grime {
  img: Phaser.GameObjects.Image;
  hp: number;
}

/** Rub the grime off each plate, dunk it, rack it. */
export class WashScene extends Phaser.Scene {
  private plate!: Phaser.GameObjects.Container;
  private grime: Grime[] = [];
  private sponge!: Phaser.GameObjects.Image;
  private foam!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bubbles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private splash!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
  private stackLabel!: Phaser.GameObjects.Text;
  private counter!: { t: Phaser.GameObjects.Text };
  private timer!: { t: Phaser.GameObjects.Text };
  private done = 0;
  private playing = false;
  private busy = false;
  private lastScrub = 0;
  private lastKey = '';
  private t0 = 0;
  private racked: Phaser.GameObjects.Image[] = [];
  private banner!: Banner;

  constructor() {
    super('Wash');
  }

  async create() {
    this.done = 0;
    this.playing = false;
    this.busy = false;
    this.grime = [];
    this.racked = [];
    genTextures(this);
    const u = ui(this);
    u.hudVisible(false);
    u.quest(null);
    music('home_day');
    ambient(null);

    this.add.image(GAME_W / 2, GAME_H / 2, 's_sink').setScale(S);
    // gentle water shimmer over the basin
    const water = this.add.rectangle(sx(255), sy(128), 140 * S, 50 * S, 0x9fd8f2, 0.12).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: water, alpha: 0.02, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });

    // dirty stack on the counter
    const stack = this.add.image(sx(140), sy(178), 'pr_dishes').setOrigin(0.5, 1).setScale(5);
    this.stackLabel = this.add
      .text(stack.x, stack.y + 10, '', { fontFamily: FONT, fontSize: '22px', fontStyle: '800', color: COLORS.paper, stroke: COLORS.ink, strokeThickness: 6 })
      .setOrigin(0.5, 0);
    this.updateStack();

    this.foam = this.add.particles(0, 0, 'k_foam', {
      emitting: false,
      speed: { min: 30, max: 110 },
      scale: { start: 2.4, end: 0 },
      lifespan: 520,
      alpha: { start: 0.95, end: 0 },
      gravityY: -40,
    }).setDepth(60);
    this.bubbles = this.add.particles(0, 0, 'k_bubble', {
      emitting: false,
      speedY: { min: -90, max: -30 },
      speedX: { min: -30, max: 30 },
      scale: { min: 2, max: 4 },
      lifespan: 1100,
      alpha: { start: 1, end: 0 },
    }).setDepth(61);
    this.splash = this.add.particles(0, 0, 'k_drop', {
      emitting: false,
      speed: { min: 140, max: 360 },
      angle: { min: 200, max: 340 },
      gravityY: 900,
      scale: 4,
      lifespan: 800,
    }).setDepth(62);
    this.sparkle = this.add.particles(0, 0, 'k_spark', {
      emitting: false,
      speed: { min: 40, max: 160 },
      scale: { start: 4, end: 0 },
      lifespan: 700,
    }).setDepth(63);

    this.sponge = this.add.image(GAME_W / 2, GAME_H / 2, 'k_sponge').setScale(5).setDepth(70).setVisible(false);

    this.counter = hudLabel(this, 24, 20, 200);
    this.timer = hudLabel(this, GAME_W - 24, 20, 170, 1);
    this.counter.t.setText(`Chén: 0/${PLATES}`);
    this.timer.t.setText('⏱ 0s');
    this.banner = new Banner(this);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointer(p));
    this.input.keyboard!.on('keydown-A', () => this.onKey('A'));
    this.input.keyboard!.on('keydown-LEFT', () => this.onKey('A'));
    this.input.keyboard!.on('keydown-D', () => this.onKey('D'));
    this.input.keyboard!.on('keydown-RIGHT', () => this.onKey('D'));

    await u.fadeIn(500);
    await u.say([
      { who: 'me', face: 'sad', text: 'Một núi chén dĩa… Mẹ mà thấy dơ là mẹ “xử” mình luôn.' },
      'Giữ chuột và chà qua lại lên vết bẩn — hoặc bấm A / D luân phiên thật nhanh.',
    ]);
    await this.nextPlate(true);
    await countdown(this, 'Chà thôi!');
    this.banner.show('Chà sạch vết bẩn! (giữ chuột & chà / A–D luân phiên)');
    this.t0 = this.time.now;
    this.playing = true;
  }

  update() {
    if (this.playing) this.timer.t.setText(`⏱ ${Math.floor((this.time.now - this.t0) / 1000)}s`);
  }

  private updateStack() {
    const left = PLATES - this.done - (this.plate?.active ? 1 : 0);
    this.stackLabel.setText(left > 0 ? `x${left}` : '');
  }

  private async nextPlate(first = false) {
    const c = this.add.container(sx(140), sy(160)).setDepth(50).setScale(0.3);
    const base = this.add.image(0, 0, 'k_plate').setScale(5.5);
    c.add(base);
    this.grime = [];
    const n = Phaser.Math.Between(7, 10);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 92;
      const img = this.add
        .image(Math.cos(a) * r, Math.sin(a) * r, `k_grime${Phaser.Math.Between(0, 2)}`)
        .setScale(Phaser.Math.FloatBetween(3.5, 5.5))
        .setAngle(Phaser.Math.Between(0, 3) * 90);
      c.add(img);
      this.grime.push({ img, hp: 1 });
    }
    this.plate = c;
    this.updateStack();
    if (!first) sfx('pan_place', { volume: 0.4, rate: 1.4 });
    await new Promise<void>((res) =>
      this.tweens.add({ targets: c, x: GAME_W / 2, y: sy(118), scale: 1, angle: 360, duration: first ? 10 : 480, ease: 'Back.out', onComplete: () => res() }),
    );
    c.setAngle(0);
    this.sponge.setVisible(true);
  }

  private onPointer(p: Phaser.Input.Pointer) {
    if (!this.plate) return;
    this.sponge.setPosition(p.x, p.y);
    if (!this.playing || this.busy || !p.isDown) return;
    const d = Phaser.Math.Distance.Between(p.prevPosition.x, p.prevPosition.y, p.x, p.y);
    if (d < 1) return;
    this.scrubAt(p.x, p.y, Math.min(d, 60) / 230, 48);
    this.sponge.setAngle(Phaser.Math.Clamp((p.x - p.prevPosition.x) * 0.6, -18, 18));
  }

  private onKey(k: string) {
    if (!this.playing || this.busy || k === this.lastKey) return;
    this.lastKey = k;
    const target = this.grime.find((g) => g.hp > 0);
    if (!target) return;
    const wx = this.plate.x + target.img.x + (k === 'A' ? -14 : 14);
    const wy = this.plate.y + target.img.y;
    this.tweens.killTweensOf(this.sponge);
    this.tweens.add({ targets: this.sponge, x: wx, y: wy, angle: k === 'A' ? -12 : 12, duration: 70 });
    this.scrubAt(wx, wy, 0.2, 36);
  }

  private scrubAt(x: number, y: number, amount: number, radius: number) {
    let touched = false;
    for (const g of this.grime) {
      if (g.hp <= 0) continue;
      const gx = this.plate.x + g.img.x;
      const gy = this.plate.y + g.img.y;
      if (Phaser.Math.Distance.Between(x, y, gx, gy) > radius) continue;
      touched = true;
      g.hp -= amount;
      g.img.setAlpha(Math.max(0, g.hp));
      if (g.hp <= 0) {
        g.img.setVisible(false);
        this.bubbles.explode(5, gx, gy);
        sfx('blip_c', { volume: 0.25, detune: 600 + Phaser.Math.Between(0, 300) });
      }
    }
    if (!touched) return;
    this.foam.explode(3, x, y);
    if (this.time.now - this.lastScrub > 140) {
      this.lastScrub = this.time.now;
      sfx('scrub', { volume: 0.45, detune: Phaser.Math.Between(-200, 200) });
      this.tweens.add({ targets: this.plate, angle: Phaser.Math.FloatBetween(-2, 2), duration: 60, yoyo: true });
    }
    if (this.grime.every((g) => g.hp <= 0)) void this.plateClean();
  }

  private async plateClean() {
    this.busy = true;
    this.sponge.setVisible(false);
    const c = this.plate;
    this.sparkle.explode(16, c.x, c.y);
    popText(this, c.x, c.y - 150, Phaser.Utils.Array.GetRandom(['Sạch bong!', 'Bóng loáng!', 'Kin kít!']), COLORS.gold, 46);
    sfx('pickup', { rate: 1.2 });
    await sleep(this, 250);
    // dunk into the basin
    await new Promise<void>((r) => this.tweens.add({ targets: c, y: sy(132), scaleX: 0.85, scaleY: 0.6, duration: 220, ease: 'Quad.in', onComplete: () => r() }));
    sfx('water_splash', { volume: 0.7 });
    this.splash.explode(26, c.x, c.y - 20);
    this.bubbles.explode(10, c.x, c.y);
    this.cameras.main.shake(120, 0.003);
    await new Promise<void>((r) => this.tweens.add({ targets: c, y: sy(112), scaleX: 1, scaleY: 1, duration: 260, ease: 'Quad.out', onComplete: () => r() }));
    // fly to the rack
    const slot = this.done;
    const tx = sx(352) + slot * 4.2 * S;
    const ty = sy(118);
    await new Promise<void>((r) =>
      this.tweens.add({ targets: c, x: tx, y: ty, scaleX: 0.16, scaleY: 0.42, duration: 420, ease: 'Cubic.inOut', onComplete: () => r() }),
    );
    sfx('glass_clink', { detune: slot * 80 });
    c.destroy();
    const rack = this.add.image(tx, ty, 'k_plate').setScale(0.9, 2.3).setDepth(40).setTint(0xeef6ff);
    this.racked.push(rack);
    this.sparkle.explode(6, tx, ty - 30);
    this.done++;
    this.counter.t.setText(`Chén: ${this.done}/${PLATES}`);
    this.tweens.add({ targets: this.counter.t, scale: { from: 1.3, to: 1 }, duration: 250 });
    if (this.done >= PLATES) return this.finish();
    await this.nextPlate();
    this.busy = false;
  }

  private async finish() {
    this.playing = false;
    this.banner.hide();
    const secs = Math.round((this.time.now - this.t0) / 1000);
    sfx('success_jingle');
    await sleep(this, 400);
    await resultCard(this, 'Sạch bong kin kít!', [`Rửa xong ${PLATES} chén dĩa trong ${secs} giây`, secs < 45 ? 'Tay nghề rửa chén: thượng thừa ✦' : 'Mẹ chắc sẽ hài lòng.']);
    await ui(this).fadeOut(400);
    finishMinigame(this, 'wash', { done: true });
  }
}
