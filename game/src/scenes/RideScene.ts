import Phaser from 'phaser';
import { COLORS, FONT, GAME_H, GAME_W } from '../config';
import { OBSTACLES, RIDE, type ObstacleKind } from '../minigames/ride/rideConfig';
import { ambient, music, sfx } from '../systems/Audio';
import { finishMinigame } from '../systems/Flow';
import { drawPanel } from '../ui/Panel';
import { countdown, hudLabel } from '../ui/MinigameKit';
import { ui } from './UIScene';

interface Obstacle {
  kind: ObstacleKind;
  img: Phaser.GameObjects.Image;
  /** own world-space velocity; the road scroll is added on top */
  vx: number;
  vy: number;
  baseX: number;
  t: number;
  done: boolean;
  warned: boolean;
}

const VIEW_W = GAME_W / RIDE.zoom;
const VIEW_H = GAME_H / RIDE.zoom;

/**
 * Bicycle ride to Bà 8's shop. The rider faces the camera, so the road scrolls
 * upward and everything ahead enters from the bottom of the screen.
 * World objects live in a container scaled by RIDE.zoom; HUD is in screen space.
 */
export class RideScene extends Phaser.Scene {
  private world!: Phaser.GameObjects.Container;
  private road!: Phaser.GameObjects.TileSprite;
  private bike!: Phaser.GameObjects.Sprite;
  private bikeShadow!: Phaser.GameObjects.Ellipse;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private splash!: Phaser.GameObjects.Particles.ParticleEmitter;
  private feathers!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lines!: Phaser.GameObjects.Particles.ParticleEmitter;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private obstacles: Obstacle[] = [];
  private hearts: Phaser.GameObjects.Image[] = [];
  private progressFill!: Phaser.GameObjects.Graphics;
  private progressBike!: Phaser.GameObjects.Image;
  private warnings!: Phaser.GameObjects.Container;

  private playing = false;
  private ended = false;
  private dist = 0;
  private speed: number = RIDE.speed.base;
  private vx = 0;
  private hits = 0;
  private invulnUntil = 0;
  private slowUntil = 0;
  private nextSpawn = 140;
  private flycarDone = false;
  private bumpT = 0;

  constructor() {
    super('Ride');
  }

  init() {
    this.obstacles = [];
    this.hearts = [];
    this.playing = false;
    this.ended = false;
    this.dist = 0;
    this.speed = RIDE.speed.base;
    this.vx = 0;
    this.hits = 0;
    this.invulnUntil = 0;
    this.slowUntil = 0;
    this.nextSpawn = 140;
    this.flycarDone = false;
  }

  async create() {
    const u = ui(this);
    u.hudVisible(false);
    u.quest(null);
    this.makeTextures();
    this.cameras.main.setBackgroundColor('#3f6b2a');

    const src = this.textures.get('s_road').getSourceImage() as HTMLImageElement;
    this.world = this.add.container((GAME_W - src.width * RIDE.zoom) / 2, 0).setScale(RIDE.zoom);
    this.road = this.add.tileSprite(0, 0, src.width, VIEW_H + 4, 'road_loop').setOrigin(0);
    this.world.add(this.road);

    this.dust = this.add.particles(0, 0, 'rd_dust', {
      lifespan: 520,
      speedY: { min: -70, max: -30 },
      speedX: { min: -12, max: 12 },
      scale: { start: 1.2, end: 0.3 },
      alpha: { start: 0.75, end: 0 },
      frequency: 60,
      emitting: false,
    });
    this.splash = this.add.particles(0, 0, 'rd_water', {
      lifespan: 520,
      speed: { min: 30, max: 75 },
      angle: { min: 200, max: 340 },
      gravityY: 220,
      scale: { start: 1.2, end: 0.4 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.feathers = this.add.particles(0, 0, 'rd_feather', {
      lifespan: 900,
      speed: { min: 20, max: 60 },
      angle: { min: 0, max: 360 },
      gravityY: 30,
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.bikeShadow = this.add.ellipse(0, 0, 14, 5, 0x000000, 0.3);
    this.bike = this.add.sprite(VIEW_W / 2 + 4, RIDE.playerY, 'ch_bike', 1);
    this.bike.play('bike:ride');
    this.world.add([this.dust, this.splash, this.feathers, this.bikeShadow, this.bike]);

    // foreground: speed streaks + drifting leaves (parallax, faster than the road)
    this.lines = this.add.particles(0, 0, 'rd_line', {
      x: { min: 0, max: GAME_W },
      y: GAME_H + 20,
      speedY: { min: -1500, max: -1100 },
      lifespan: 700,
      alpha: { start: 0.45, end: 0 },
      scaleY: { min: 2, max: 5 },
      frequency: 45,
      emitting: false,
    });
    this.add.particles(0, 0, 'rd_leaf', {
      x: { min: 0, max: GAME_W },
      y: GAME_H + 20,
      speedY: { min: -420, max: -260 },
      speedX: { min: -40, max: 40 },
      rotate: { min: 0, max: 360 },
      scale: { min: 3, max: 5 },
      lifespan: 3000,
      alpha: 0.9,
      frequency: 650,
    });
    this.warnings = this.add.container(0, 0).setDepth(50);
    this.buildHud();

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    music('bike_ride');
    ambient('amb_summer', 0.3);

    await u.fadeIn(500);
    sfx('bike_bell');
    await u.say([
      { who: 'me', face: 'smug', text: 'Lên đường thôi, chiến mã đời Tống!' },
      'A/D hoặc ←/→ để lái, W/S để đạp nhanh/chậm. Né ổ gà, xe máy, gà và trâu. Va 3 lần là “té chỏng gọng”!',
    ]);
    await countdown(this, 'Đạp!');
    this.playing = true;
    this.dust.start();
  }

  private makeTextures() {
    if (!this.textures.exists('road_loop')) {
      const src = this.textures.get('s_road').getSourceImage() as HTMLImageElement;
      const h = src.height - RIDE.loopFromY;
      const c = this.textures.createCanvas('road_loop', src.width, h)!;
      c.context.drawImage(src, 0, RIDE.loopFromY, src.width, h, 0, 0, src.width, h);
      c.refresh();
    }
    const dot = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({}, false);
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    dot('rd_dust', 2, 2, (g) => g.fillStyle(0xc89a62).fillRect(0, 0, 2, 2));
    dot('rd_water', 2, 2, (g) => g.fillStyle(0x9fd3e6).fillRect(0, 0, 2, 2).fillStyle(0xffffff).fillRect(0, 0, 1, 1));
    dot('rd_feather', 3, 2, (g) => g.fillStyle(0xd9852e).fillRect(0, 0, 3, 1).fillStyle(0xf6e0b0).fillRect(0, 1, 2, 1));
    dot('rd_line', 2, 14, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 2, 14));
    dot('rd_leaf', 3, 2, (g) => g.fillStyle(0x8fb34a).fillRect(0, 0, 3, 2).fillStyle(0x5d7f2c).fillRect(0, 1, 2, 1));
  }

  private buildHud() {
    hudLabel(this, 24, 20, 190);
    for (let i = 0; i < RIDE.maxHits; i++) {
      this.hearts.push(this.add.image(70 + i * 48, 45, 'ic_heart').setScale(2.6).setDepth(9002));
    }

    const w = 560;
    const x = (GAME_W - w) / 2;
    drawPanel(this.add.graphics().setDepth(9000), x, 20, w, 50, 12);
    this.add.text(x + 22, 45, 'Nhà', { fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: COLORS.ink }).setOrigin(0, 0.5).setDepth(9001);
    this.add.text(x + w - 22, 45, 'Bà 8 🥩', { fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: COLORS.accentDark }).setOrigin(1, 0.5).setDepth(9001);
    const g = this.add.graphics().setDepth(9001);
    g.fillStyle(0x2b1d14).fillRoundedRect(x + 70, 38, w - 170, 14, 7);
    this.progressFill = this.add.graphics().setDepth(9001);
    this.progressFill.setData('box', [x + 72, 40, w - 174, 10]);
    this.progressBike = this.add.image(x + 72, 34, 'ch_bike', 1).setScale(0.9).setDepth(9002);
  }

  private updateHud() {
    const [bx, by, bw, bh] = this.progressFill.getData('box') as number[];
    const p = Phaser.Math.Clamp(this.dist / RIDE.length, 0, 1);
    this.progressFill.clear().fillStyle(0xf2b84b).fillRoundedRect(bx, by, Math.max(bh, bw * p), bh, 5);
    this.progressBike.setX(bx + bw * p);
  }

  update(time: number, dtMs: number) {
    if (!this.world) return;
    const dt = Math.min(dtMs, 50) / 1000;
    const k = this.keys;

    // throttle
    let target: number = RIDE.speed.base;
    if (this.playing) {
      if (k.W.isDown || k.UP.isDown) target = RIDE.speed.fast;
      else if (k.S.isDown || k.DOWN.isDown) target = RIDE.speed.slow;
    } else if (!this.ended) target = 0;
    else target = this.speed * 0.9;
    const onGrass = this.bike.x < RIDE.roadMinX || this.bike.x > RIDE.roadMaxX;
    if (onGrass) target *= RIDE.speed.grass;
    if (time < this.slowUntil) target *= RIDE.speed.puddle;
    this.speed = Phaser.Math.Linear(this.speed, target, 1 - Math.exp(-dt * 3));

    // steering with a little inertia, and the bike leans into the turn
    let steer = 0;
    if (this.playing) {
      if (k.A.isDown || k.LEFT.isDown) steer -= 1;
      if (k.D.isDown || k.RIGHT.isDown) steer += 1;
    }
    if (steer) this.vx = Phaser.Math.Clamp(this.vx + steer * RIDE.steerAccel * dt, -RIDE.steerMax, RIDE.steerMax);
    else this.vx = Math.sign(this.vx) * Math.max(0, Math.abs(this.vx) - RIDE.steerDrag * dt);
    this.bike.x = Phaser.Math.Clamp(this.bike.x + this.vx * dt, RIDE.minX, RIDE.maxX);
    if (this.bike.x === RIDE.minX || this.bike.x === RIDE.maxX) this.vx = 0;
    if (!this.ended) this.bike.angle = Phaser.Math.Linear(this.bike.angle, -this.vx * 0.11, 0.25);

    // grass rumble
    this.bumpT += dt * this.speed;
    const bump = onGrass && this.playing ? Math.round(Math.sin(this.bumpT * 0.5)) : 0;
    this.bike.y = RIDE.playerY + bump;
    this.bikeShadow.setPosition(this.bike.x, this.bike.y + 19);
    this.dust.setPosition(this.bike.x, this.bike.y + 18);
    this.dust.frequency = onGrass ? 25 : this.speed > 115 ? 40 : 90;
    this.bike.anims.timeScale = Math.max(0.05, this.speed / RIDE.speed.base);

    // scroll the world
    const dy = this.speed * dt;
    this.road.tilePositionY += dy;
    if (this.playing) this.dist += dy;
    if (this.speed > 118 && this.playing) this.lines.start();
    else this.lines.stop();

    if (this.playing) {
      if (this.dist >= this.nextSpawn && this.dist < RIDE.length * 0.93) this.spawn();
      if (!this.flycarDone && this.dist > RIDE.length * RIDE.flycarAt && this.dist < RIDE.length * 0.9) this.flycar();
      if (this.dist >= RIDE.length) void this.win();
    }
    this.updateObstacles(time, dt, dy);
    this.world.sort('depth');
    this.updateHud();
  }

  // ───────────────────────────── obstacles ─────────────────────────────
  private spawn() {
    const p = this.dist / RIDE.length;
    const kinds = Object.keys(OBSTACLES) as ObstacleKind[];
    const weights = kinds.map((k) => OBSTACLES[k].weight(p));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let kind = kinds[0];
    for (let i = 0; i < kinds.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        kind = kinds[i];
        break;
      }
    }
    // gaps shrink as the ride goes on
    this.nextSpawn = this.dist + Phaser.Math.Linear(150, 78, p) + Math.random() * 60;
    // sometimes a pothole pair, leaving one lane open
    if (kind === 'pothole' && p > 0.3 && Math.random() < 0.45) {
      const open = Phaser.Math.Between(0, 2);
      [0, 1, 2].filter((l) => l !== open).forEach((l) => this.addObstacle('pothole', RIDE.roadMinX + 14 + l * 30));
      return;
    }
    this.addObstacle(kind);
  }

  private addObstacle(kind: ObstacleKind, atX?: number) {
    const spec = OBSTACLES[kind];
    const y = VIEW_H + 40;
    let x = atX ?? Phaser.Math.Between(RIDE.roadMinX + 10, RIDE.roadMaxX - 10);
    let vx = 0;
    let vy = 0;
    if (kind === 'chicken') {
      const fromLeft = Math.random() < 0.5;
      x = fromLeft ? RIDE.minX - 10 : RIDE.maxX + 10;
      vx = (fromLeft ? 1 : -1) * Phaser.Math.Between(38, 55);
    } else if (kind === 'moto') {
      vy = Phaser.Math.Between(32, 48); // same direction, slower: we catch up to them
    } else if (kind === 'buffalo') {
      x = Phaser.Math.Between(RIDE.roadMinX + 16, RIDE.roadMaxX - 16);
      vy = 12;
      vx = Phaser.Math.Between(-8, 8);
    }
    const img = this.add.image(x, y, spec.tex).setOrigin(0.5);
    if (kind === 'chicken') img.setFlipX(vx < 0);
    img.setDepth(kind === 'pothole' || kind === 'puddle' ? 1 : y);
    this.world.add(img);
    if (kind === 'moto' || kind === 'buffalo') {
      const sh = this.add.ellipse(x, y, img.width * 0.8, 5, 0x000000, 0.28).setDepth(1);
      this.world.add(sh);
      img.setData('shadow', sh);
    }
    this.obstacles.push({ kind, img, vx, vy, baseX: x, t: Math.random() * 10, done: false, warned: false });
  }

  private updateObstacles(time: number, dt: number, scroll: number) {
    const bx = this.bike.x;
    const by = this.bike.y + 6; // the front wheel / body carries the hitbox
    for (const o of this.obstacles) {
      o.t += dt;
      o.img.y += -scroll + o.vy * dt;
      if (o.kind === 'moto') {
        // "ninja lead": weaves across the lane
        o.img.x = Phaser.Math.Clamp(o.baseX + Math.sin(o.t * 2.2) * 16, RIDE.roadMinX + 6, RIDE.roadMaxX - 6);
        o.img.angle = Math.cos(o.t * 2.2) * 8;
        if (!o.warned && o.img.y < VIEW_H + 10) {
          o.warned = true;
          sfx('bike_bell', { volume: 0.6, rate: 1.2 });
          this.warn(o.img.x);
        }
      } else if (o.kind === 'chicken') {
        o.img.x += o.vx * dt;
        o.img.y += Math.abs(Math.sin(o.t * 14)) * -0.6;
        if (!o.warned && o.img.y < VIEW_H) {
          o.warned = true;
          sfx('goose_honk', { volume: 0.35, rate: 1.9 });
        }
      } else if (o.kind === 'buffalo') {
        o.img.x = Phaser.Math.Clamp(o.img.x + o.vx * dt, RIDE.roadMinX + 8, RIDE.roadMaxX - 8);
        o.img.angle = Math.sin(o.t * 3) * 2;
        if (!o.warned && o.img.y < VIEW_H + 20) {
          o.warned = true;
          this.warn(o.img.x);
        }
      }
      if (o.kind !== 'pothole' && o.kind !== 'puddle') o.img.setDepth(o.img.y);
      const sh = o.img.getData('shadow') as Phaser.GameObjects.Ellipse | undefined;
      sh?.setPosition(o.img.x, o.img.y + o.img.height / 2 - 2);

      if (!o.done && this.playing) {
        const spec = OBSTACLES[o.kind];
        const hitX = Math.abs(o.img.x - bx) < (spec.hw + 8) / 2;
        const hitY = Math.abs(o.img.y - by) < (spec.hh + 22) / 2;
        if (hitX && hitY) {
          if (o.kind === 'puddle') {
            o.done = true;
            this.slowUntil = time + 1300;
            sfx('splash_puddle');
            this.splash.explode(18, bx, this.bike.y + 14);
            this.bike.setTint(0xb8d8ee);
            this.time.delayedCall(700, () => this.bike.clearTint());
          } else if (time >= this.invulnUntil) {
            o.done = true;
            this.crash(time, o);
          }
        }
      }
    }
    this.obstacles = this.obstacles.filter((o) => {
      const gone = o.img.y < -60 || o.img.x < RIDE.minX - 40 || o.img.x > RIDE.maxX + 40;
      if (gone) {
        (o.img.getData('shadow') as Phaser.GameObjects.Ellipse | undefined)?.destroy();
        o.img.destroy();
      }
      return !gone;
    });
  }

  /** Blinking "!" at the bottom edge where something big is about to appear. */
  private warn(worldX: number) {
    const sx = this.world.x + worldX * RIDE.zoom;
    const t = this.add
      .text(sx, GAME_H - 46, '!', { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: '#fff', backgroundColor: COLORS.danger, padding: { x: 14, y: 0 } })
      .setOrigin(0.5);
    this.warnings.add(t);
    this.tweens.add({ targets: t, alpha: 0.2, yoyo: true, repeat: 3, duration: 130, onComplete: () => t.destroy() });
  }

  private crash(time: number, o: Obstacle) {
    this.hits++;
    const u = ui(this);
    sfx('crash_thud');
    if (o.kind === 'chicken') {
      this.feathers.explode(14, o.img.x, o.img.y);
      sfx('goose_honk', { rate: 2.1, volume: 0.6 });
      o.vx *= 2.5;
    }
    if (o.kind === 'pothole') this.dust.explode(14, this.bike.x, this.bike.y + 16);
    u.flash(0xff5a3c, 220);
    this.cameras.main.shake(260, 0.012);
    this.speed *= 0.35;
    this.vx = Phaser.Math.Between(-60, 60);

    const heart = this.hearts[RIDE.maxHits - this.hits];
    if (heart) {
      this.tweens.add({ targets: heart, scale: 4, duration: 120, yoyo: true, onComplete: () => heart.setTint(0x3a2a20).setAlpha(0.6) });
    }

    if (this.hits >= RIDE.maxHits) return void this.lose();

    this.invulnUntil = time + RIDE.invulnMs;
    this.tweens.add({ targets: this.bike, angle: { from: -22, to: 0 }, duration: 520, ease: 'Elastic.out' });
    this.tweens.add({ targets: this.bike, alpha: 0.25, yoyo: true, repeat: 6, duration: 100, onComplete: () => this.bike.setAlpha(1) });
    const quips = ['Ui da!', 'Á á!', 'Chiến mã ơi!'];
    this.popText(quips[this.hits - 1] ?? 'Ui!', COLORS.danger);
  }

  private popText(text: string, color: string, holdMs = 650) {
    const sx = this.world.x + this.bike.x * RIDE.zoom;
    // below the rider: above them the text would slide under the progress HUD
    const t = this.add
      .text(sx, RIDE.playerY * RIDE.zoom + 110, text, { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color, stroke: COLORS.ink, strokeThickness: 6 })
      .setOrigin(0.5)
      .setScale(0.5);
    this.tweens.add({ targets: t, scale: 1, y: t.y - 30, duration: 300, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: holdMs, duration: 300, onComplete: () => t.destroy() });
  }

  /** The gag: a red flying sports car swoops over the road. Harmless. */
  private flycar() {
    this.flycarDone = true;
    const car = this.add.image(-30, VIEW_H + 60, 'pr_flycar').setDepth(9999).setScale(1.6).setAngle(40);
    const sh = this.add.ellipse(-30, VIEW_H + 60, 26, 8, 0x000000, 0.25).setDepth(1);
    this.world.add([sh, car]);
    sfx('car_whoosh');
    this.tweens.add({
      targets: car,
      x: VIEW_W * 1.15,
      y: -70,
      scale: 1,
      angle: 25,
      duration: 2300,
      ease: 'Sine.inOut',
      onUpdate: () => sh.setPosition(car.x - 18, car.y + 40),
      onComplete: () => {
        car.destroy();
        sh.destroy();
      },
    });
    const cap = this.add
      .text(GAME_W / 2, 130, 'Xe bay Tesla Roadster?! Ở làng mình á?', {
        fontFamily: FONT,
        fontSize: '30px',
        fontStyle: '800',
        color: COLORS.gold,
        stroke: COLORS.ink,
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: cap, alpha: 1, y: 120, duration: 300, hold: 1800, yoyo: true, onComplete: () => cap.destroy() });
  }

  // ───────────────────────────── endings ─────────────────────────────
  private async win() {
    if (this.ended) return;
    this.ended = true;
    this.playing = false;
    this.lines.stop();
    sfx('success_jingle');
    const cap = this.add
      .text(GAME_W / 2, GAME_H / 2 - 40, 'Tới nhà bà 8 rồi!', { fontFamily: FONT, fontSize: '58px', fontStyle: '800', color: COLORS.paper, stroke: COLORS.ink, strokeThickness: 10 })
      .setOrigin(0.5)
      .setScale(0.4)
      .setAlpha(0);
    const sub = this.add
      .text(GAME_W / 2, GAME_H / 2 + 26, this.hits === 0 ? 'Không trầy một miếng sơn!' : `Va chạm: ${this.hits}/${RIDE.maxHits}`, {
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: '700',
        color: COLORS.gold,
        stroke: COLORS.ink,
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: cap, scale: 1, alpha: 1, duration: 450, ease: 'Back.out' });
    this.tweens.add({ targets: sub, alpha: 1, delay: 300, duration: 400 });
    await this.wait(2200);
    await ui(this).fadeOut(600);
    finishMinigame(this, 'ride', { won: true, hits: this.hits, leg: 'to_ba8' });
  }

  private async lose() {
    if (this.ended) return;
    this.ended = true;
    this.playing = false;
    this.dust.stop();
    this.lines.stop();
    music(null, { fadeMs: 400 });
    this.bike.anims.stop();
    // the rider goes over the handlebars
    this.tweens.add({ targets: this.bike, angle: 200, y: this.bike.y + 26, x: this.bike.x + 14, duration: 650, ease: 'Quad.in' });
    this.dust.explode(26, this.bike.x, this.bike.y + 20);
    this.popText('Té chỏng gọng!', COLORS.danger, 1400);
    this.tweens.add({ targets: this, speed: 0, duration: 800 });
    await this.wait(1600);
    await ui(this).fadeOut(700);
    finishMinigame(this, 'ride', { won: false, hits: this.hits, leg: 'to_ba8' });
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }
}
