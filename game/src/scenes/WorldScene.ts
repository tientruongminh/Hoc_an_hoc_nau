import Phaser from 'phaser';
import { FONT, SPEED, WORLD_ZOOM } from '../config';
import { MAPS, type ExitDef, type MapDef } from '../data/maps';
import { Actor, type Facing } from '../entities/Actor';
import { ambient, music, sfx } from '../systems/Audio';
import * as story from '../story/chapter1';
import { ui, type UIScene } from './UIScene';

export interface Interactable {
  id: string;
  x: number;
  y: number;
  r?: number;
  label: string;
  /** hold E for this many ms instead of tapping */
  hold?: number;
  when?: () => boolean;
  use: () => void | Promise<void>;
}

export interface WorldData {
  map: string;
  spawn: string;
  facing?: Facing;
  event?: string;
  payload?: unknown;
}

/** Explorable top-down map. Story logic lives in story/chapter1.ts. */
export class WorldScene extends Phaser.Scene {
  mapId = 'bedroom';
  map!: MapDef;
  data0!: WorldData;
  player!: Actor;
  npcs = new Map<string, Actor>();
  props = new Map<string, Phaser.GameObjects.Image>();
  interacts: Interactable[] = [];
  triggers: { r: [number, number, number, number]; fn: () => void }[] = [];
  locked = false;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private prompt!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private promptBg!: Phaser.GameObjects.Graphics;
  private holdRing!: Phaser.GameObjects.Graphics;
  private target: Interactable | null = null;
  private holdMs = 0;
  private promptW = 120;
  private stepTimer = 0;
  private exitArrows = new Map<string, Phaser.GameObjects.Triangle>();
  private leaving = false;
  private usingInteract = false;
  ui!: UIScene;

  constructor() {
    super('World');
  }

  init(data: WorldData) {
    this.data0 = data;
    this.mapId = data.map;
    this.map = MAPS[data.map];
    this.npcs = new Map();
    this.props = new Map();
    this.interacts = [];
    this.triggers = [];
    this.exitArrows = new Map();
    this.locked = false;
    this.leaving = false;
    this.usingInteract = false;
    this.target = null;
    this.holdMs = 0;
  }

  create() {
    this.ui = ui(this);
    const bg = this.add.image(0, 0, this.map.tex).setOrigin(0).setDepth(0);
    const W = bg.width;
    const H = bg.height;
    this.physics.world.setBounds(0, 0, W, H);

    this.walls = this.physics.add.staticGroup();
    for (const [x, y, w, h] of this.map.walls) {
      const z = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.walls.add(z);
    }

    const [sx, sy] = this.map.spawns[this.data0.spawn] ?? Object.values(this.map.spawns)[0];
    this.player = new Actor(this, sx, sy, 'ch_player', true);
    this.player.face(this.data0.facing ?? (this.data0.spawn.startsWith('from') ? defaultFacing(this.map, this.data0.spawn) : 'down'));
    this.physics.add.collider(this.player, this.walls);

    const cam = this.cameras.main;
    cam.setZoom(WORLD_ZOOM).setBounds(0, 0, W, H).setRoundPixels(true);
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.setBackgroundColor('#120d0a');

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', () => this.tryInteract());
    kb.on('keydown-SPACE', () => this.tryInteract());

    this.buildPrompt();
    this.buildExits();
    this.addMotes(W, H);

    music(this.map.music);
    ambient(this.map.ambience ?? null);
    this.ui.hudVisible(true);

    this.showMapName();
    void this.ui.fadeIn(450);
    story.setupMap(this);
  }

  private showMapName() {
    const t = this.ui.add
      .text(40, 690, this.map.name, { fontFamily: FONT, fontSize: '22px', fontStyle: '700', color: '#f6e7c8' })
      .setOrigin(0, 1)
      .setShadow(0, 2, '#000', 6, true, true)
      .setAlpha(0);
    this.ui.tweens.add({ targets: t, alpha: 1, x: 50, duration: 500, hold: 1800, yoyo: true, onComplete: () => t.destroy() });
  }

  // ─────────────────────── building blocks for story ───────────────────────
  addNpc(id: string, sheet: string, x: number, y: number, facing: Facing = 'down', solid = true) {
    const a = new Actor(this, x, y, sheet, solid);
    if (solid) {
      (a.body as Phaser.Physics.Arcade.Body).setImmovable(true).setSize(14, 8).setOffset((a.width - 14) / 2, a.height - 8);
      this.physics.add.collider(this.player, a);
    }
    a.face(facing);
    this.npcs.set(id, a);
    return a;
  }

  removeNpc(id: string) {
    this.npcs.get(id)?.destroy();
    this.npcs.delete(id);
  }

  /** Static prop with feet-origin y-sort; `solid` adds a small collider at its base. */
  addProp(id: string, tex: string, x: number, y: number, opts: { solid?: boolean; flat?: boolean; scale?: number } = {}) {
    const img = this.add.image(x, y, tex).setOrigin(0.5, opts.flat ? 0.5 : 1).setScale(opts.scale ?? 1);
    img.setDepth(opts.flat ? 2 : 10 + y);
    if (opts.solid) {
      const z = this.add.zone(x, y - 3, img.displayWidth * 0.8, 6);
      this.walls.add(z);
      img.setData('zone', z);
    }
    this.props.get(id)?.destroy();
    this.props.set(id, img);
    return img;
  }

  removeProp(id: string, animate = true) {
    const p = this.props.get(id);
    if (!p) return;
    this.props.delete(id);
    const z = p.getData('zone') as Phaser.GameObjects.Zone | undefined;
    if (z) {
      this.walls.remove(z, true, true);
    }
    if (!animate) return p.destroy();
    this.tweens.add({ targets: p, y: p.y - 8, alpha: 0, scale: p.scale * 1.2, duration: 260, onComplete: () => p.destroy() });
  }

  addInteract(i: Interactable) {
    this.removeInteract(i.id);
    this.interacts.push(i);
  }
  /** One-shot area trigger (fires when the player's feet enter the rect). */
  addTrigger(r: [number, number, number, number], fn: () => void) {
    this.triggers.push({ r, fn });
  }

  removeInteract(id: string) {
    this.interacts = this.interacts.filter((i) => i.id !== id);
  }

  /** Lock input + letterbox for the duration of a scripted sequence. */
  async cutscene(fn: () => Promise<void>, bars = true) {
    this.locked = true;
    this.player.setVelocity(0, 0);
    this.player.idle();
    if (bars) this.ui.letterbox(true);
    try {
      await fn();
    } finally {
      if (bars) this.ui.letterbox(false);
      this.locked = false;
    }
  }

  wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }

  pan(x: number, y: number, ms = 800): Promise<void> {
    return new Promise((res) => {
      this.cameras.main.stopFollow();
      this.cameras.main.pan(x, y, ms, 'Sine.easeInOut', false, (_c, p) => p === 1 && res());
    });
  }
  follow() {
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
  }

  async goto(map: string, spawn: string, extra: Partial<WorldData> = {}) {
    if (this.leaving) return;
    this.leaving = true;
    this.locked = true;
    this.player.setVelocity(0, 0);
    await this.ui.fadeOut(350);
    this.scene.restart({ map, spawn, ...extra });
  }

  /** Leave the world for a minigame / CG scene. */
  async startScene(key: string, data: Record<string, unknown> = {}) {
    this.locked = true;
    this.player.setVelocity(0, 0);
    await this.ui.fadeOut(400);
    this.ui.quest(null);
    this.ui.hudVisible(false);
    this.scene.start(key, data);
  }

  setExitVisible(id: string, v: boolean) {
    this.exitArrows.get(id)?.setVisible(v);
  }

  // ───────────────────────────── internals ─────────────────────────────
  private buildPrompt() {
    this.promptBg = this.add.graphics();
    this.promptText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '30px', fontStyle: '700', color: '#2b1d14' }).setOrigin(0, 0.5);
    this.holdRing = this.add.graphics();
    this.prompt = this.add.container(0, 0, [this.promptBg, this.promptText, this.holdRing]).setScale(1 / WORLD_ZOOM).setDepth(8000).setVisible(false);
  }

  private setPrompt(i: Interactable | null) {
    if (i === this.target && this.prompt.visible === !!i) return;
    this.target = i;
    this.holdMs = 0;
    if (!i) {
      this.prompt.setVisible(false);
      return;
    }
    this.promptText.setText(i.label);
    const key = 44;
    const w = this.promptText.width + key + 30;
    this.promptW = w;
    const g = this.promptBg.clear();
    g.fillStyle(0x2b1d14, 1).fillRoundedRect(-w / 2 - 3, -27, w + 6, 54, 14);
    g.fillStyle(0xf6e7c8, 1).fillRoundedRect(-w / 2, -24, w, 48, 12);
    g.fillStyle(0xd9572b, 1).fillRoundedRect(-w / 2 + 7, -17, key - 6, 34, 8);
    g.fillTriangle(-8, 24, 8, 24, 0, 34);
    g.fillStyle(0x2b1d14, 1).fillTriangle(-8, 27, 8, 27, 0, 37);
    g.fillStyle(0xf6e7c8, 1).fillTriangle(-6, 23, 6, 23, 0, 31);
    this.promptText.setX(-w / 2 + key + 12);
    const keyLabel = (this.prompt.getData('k') as Phaser.GameObjects.Text) ?? this.add.text(0, 0, 'E', { fontFamily: FONT, fontSize: '26px', fontStyle: '800', color: '#fff' }).setOrigin(0.5);
    this.prompt.setData('k', keyLabel);
    if (!this.prompt.exists(keyLabel)) this.prompt.add(keyLabel);
    keyLabel.setPosition(-w / 2 + 7 + (key - 6) / 2, 0).setText(i.hold ? 'E…' : 'E').setFontSize(i.hold ? 20 : 26);
    this.prompt.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.prompt, alpha: 1, duration: 150 });
  }

  private async tryInteract() {
    if (this.locked || this.ui.busy || !this.target || this.target.hold || this.usingInteract) return;
    const t = this.target;
    this.usingInteract = true;
    this.player.setVelocity(0, 0);
    this.player.idle();
    this.setPrompt(null);
    try {
      await t.use();
    } finally {
      this.usingInteract = false;
    }
  }

  private buildExits() {
    for (const e of this.map.exits) {
      const [x, y, w, h] = e.r;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const s = 4;
      const pts: Record<ExitDef['dir'], number[]> = {
        down: [-s, -s / 2, s, -s / 2, 0, s / 2],
        up: [-s, s / 2, s, s / 2, 0, -s / 2],
        left: [s / 2, -s, s / 2, s, -s / 2, 0],
        right: [-s / 2, -s, -s / 2, s, s / 2, 0],
      };
      const p = pts[e.dir];
      const tri = this.add.triangle(cx, cy, p[0], p[1], p[2], p[3], p[4], p[5], 0xf2b84b, 0.85).setDepth(7000);
      tri.setStrokeStyle(1, 0x2b1d14, 0.9);
      const dx = e.dir === 'left' ? -3 : e.dir === 'right' ? 3 : 0;
      const dy = e.dir === 'up' ? -3 : e.dir === 'down' ? 3 : 0;
      this.tweens.add({ targets: tri, x: cx + dx, y: cy + dy, alpha: 0.4, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
      this.exitArrows.set(e.id, tri);
    }
  }

  private addMotes(W: number, H: number) {
    if (!this.map.motes) return;
    const tex = `px_${this.map.motes}`;
    if (!this.textures.exists(tex)) {
      const g = this.make.graphics({}, false);
      if (this.map.motes === 'dust') g.fillStyle(0xfff1c8, 1).fillRect(0, 0, 1, 1);
      else if (this.map.motes === 'leaves') g.fillStyle(0x8fb34a, 1).fillRect(0, 0, 3, 2).fillStyle(0x5d7f2c).fillRect(0, 1, 2, 1);
      else g.fillStyle(0xe56a8e, 1).fillRect(0, 0, 2, 2).fillStyle(0xf7a8c0).fillRect(0, 0, 1, 1);
      g.generateTexture(tex, 3, 2);
      g.destroy();
    }
    const dust = this.map.motes === 'dust';
    this.add
      .particles(0, 0, tex, {
        x: { min: 0, max: W },
        y: { min: dust ? 0 : -10, max: dust ? H : 0 },
        lifespan: dust ? 6000 : 9000,
        speedX: dust ? { min: -3, max: 3 } : { min: 4, max: 14 },
        speedY: dust ? { min: -4, max: 2 } : { min: 8, max: 18 },
        alpha: { start: 0, end: 0, ease: (v: number) => Math.sin(v * Math.PI) * (dust ? 0.7 : 0.9) } as never,
        rotate: dust ? 0 : { min: 0, max: 360 },
        frequency: dust ? 160 : 700,
        quantity: 1,
      })
      .setDepth(6000);
  }

  update(_t: number, dt: number) {
    if (!this.player?.body) return;
    const busy = this.locked || this.ui.busy || this.usingInteract;
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (!busy) {
      if (k.A.isDown || k.LEFT.isDown) vx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) vx += 1;
      if (k.W.isDown || k.UP.isDown) vy -= 1;
      if (k.S.isDown || k.DOWN.isDown) vy += 1;
    }
    const running = k.SHIFT.isDown;
    const speed = running ? SPEED.run : SPEED.walk;
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
      const dir: Facing = Math.abs(vx) > Math.abs(vy) * 0.99 && vx !== 0 ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      this.player.walk(dir, running ? 1.6 : 1);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        sfx(this.map.step, { volume: 0.25, detune: Phaser.Math.Between(-150, 150) });
        this.stepTimer = running ? 210 : 320;
      }
    } else if (!this.locked) {
      this.player.setVelocity(0, 0);
      if (this.player.anims.currentAnim?.key.includes('walk') && !this.tweens.isTweening(this.player)) this.player.idle();
    }

    // nearest interactable
    if (!busy) {
      let best: Interactable | null = null;
      let bestD = Infinity;
      for (const i of this.interacts) {
        if (i.when && !i.when()) continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y - 8, i.x, i.y);
        if (d < (i.r ?? 24) && d < bestD) {
          best = i;
          bestD = d;
        }
      }
      this.setPrompt(best);
      if (best) this.prompt.setPosition(best.x, best.y - 22);
      if (best?.hold) this.updateHold(best, dt);
    } else if (this.prompt.visible) this.setPrompt(null);

    // exits + triggers
    if (!busy && !this.leaving) {
      const b = this.player.body as Phaser.Physics.Arcade.Body;
      const hit = this.triggers.find(({ r: [x, y, w, h] }) => b.center.x > x && b.center.x < x + w && b.center.y > y && b.center.y < y + h);
      if (hit) {
        this.triggers = this.triggers.filter((t) => t !== hit);
        hit.fn();
        return;
      }
      for (const e of this.map.exits) {
        const [x, y, w, h] = e.r;
        if (b.center.x > x && b.center.x < x + w && b.center.y > y && b.center.y < y + h && this.exitArrows.get(e.id)?.visible !== false) {
          void this.useExit(e);
          break;
        }
      }
    }
  }

  private updateHold(i: Interactable, dt: number) {
    const g = this.holdRing.clear();
    if (!this.keys.E.isDown && !this.keys.SPACE.isDown) {
      this.holdMs = Math.max(0, this.holdMs - dt * 2);
    } else {
      this.holdMs += dt;
      this.player.setVelocity(0, 0);
    }
    if (this.holdMs > 0) {
      const w = this.promptW;
      const p = Math.min(1, this.holdMs / i.hold!);
      g.fillStyle(0x2b1d14, 1).fillRoundedRect(-w / 2, 32, w, 10, 5);
      g.fillStyle(0x6f9a3a, 1).fillRoundedRect(-w / 2 + 2, 34, (w - 4) * p, 6, 3);
    }
    if (this.holdMs >= i.hold!) {
      this.holdMs = 0;
      g.clear();
      this.setPrompt(null);
      void i.use();
    }
  }

  private async useExit(e: ExitDef) {
    this.locked = true;
    this.player.setVelocity(0, 0);
    const ok = await story.onExit(this, e);
    if (ok === false) {
      this.locked = false;
      // nudge the player back out of the trigger
      const back = { up: [0, 8], down: [0, -8], left: [8, 0], right: [-8, 0] }[e.dir];
      this.player.setPosition(this.player.x + back[0], this.player.y + back[1]);
      return;
    }
    sfx('door_open', { volume: 0.5 });
    await this.goto(e.to, e.spawn);
  }
}

function defaultFacing(map: MapDef, spawn: string): Facing {
  const e = map.exits.find((x) => x.spawn === spawn || `from${cap(x.to)}` === spawn);
  if (!e) return 'down';
  return ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[e.dir];
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
