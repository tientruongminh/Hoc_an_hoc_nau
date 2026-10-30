import Phaser from 'phaser';
import { COLORS, FONT, GAME_H, GAME_W } from '../config';
import type { Line } from '../data/speakers';
import {
  Banner,
  Gauge,
  bark,
  clamp01,
  genTextures,
  grade,
  holdState,
  mash,
  onPress,
  popText,
  ringRhythm,
  sleep,
  waitPress,
} from '../minigames/kitchen/kit';
import { ambient, music, sfx, sfxLoop } from '../systems/Audio';
import { finishMinigame } from '../systems/Flow';
import { drawPanel } from '../ui/Panel';
import { ui } from './UIScene';

const S = GAME_W / 435; // backdrop scale (435x245 → 1280x720)
const nx = (x: number) => GAME_W / 2 + (x - 217.5) * S;
const ny = (y: number) => GAME_H / 2 + (y - 122.5) * S;
/** where a focused object lands on screen */
const FOCUS = { x: GAME_W / 2, y: 410 };

const SPOTS = {
  wok: { x: nx(218), y: ny(136) },
  board: { x: nx(141), y: ny(152) },
  bowl1: { x: nx(268), y: ny(147) },
  bowl2: { x: nx(297), y: ny(147) },
  bowl3: { x: nx(323), y: ny(147) },
};

const ZONE = { blue: 0x4f86c6, green: 0x6f9a3a, red: 0xc8322b, amber: 0xd99a2b, grey: 0x8a7a6a };

interface StepResult {
  name: string;
  weight: number;
  score: number;
}

const WOK = { oil: 0, garlic: 1, egg: 2, rice: 3, perfect: 4, burnt: 5 } as const;

/**
 * Cơm chiên trứng — mom coaches the player through prep, heat control,
 * timing windows and the toss. Each step scores 0..100, weighted to a total.
 */
export class CookingScene extends Phaser.Scene {
  private world!: Phaser.GameObjects.Container;
  private wok!: Phaser.GameObjects.Sprite;
  private flames!: Phaser.GameObjects.Particles.ParticleEmitter;
  private steam!: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  private grains!: Phaser.GameObjects.Particles.ParticleEmitter;
  private banner!: Banner;
  private results: StepResult[] = [];
  private notes: string[] = [];
  private heat = 0.5;
  private burns = 0;
  private stopSizzle: (() => void) | null = null;
  private items = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super('Cooking');
  }

  async create(data: { step?: string; burnt?: string } = {}) {
    this.results = [];
    this.notes = [];
    this.heat = 0.5;
    this.burns = 0;
    this.items = new Map();
    this.stopSizzle = null;
    genTextures(this);
    const u = ui(this);
    u.hudVisible(false);
    u.quest(null);
    ambient(null);
    music('cooking');
    this.events.once('shutdown', () => this.stopSizzle?.());

    this.world = this.add.container(0, 0);
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 's_cooking').setScale(S);
    this.flames = this.add.particles(SPOTS.wok.x, SPOTS.wok.y + 40, 'k_blueflame', {
      x: { min: -50, max: 50 },
      speedY: { min: -70, max: -30 },
      scale: { start: 3, end: 0.5 },
      lifespan: 360,
      alpha: { start: 1, end: 0 },
      frequency: 40,
      emitting: false,
    });
    this.wok = this.add.sprite(SPOTS.wok.x + 2, SPOTS.wok.y, 'wok_states', WOK.oil).setScale(1.62).setAlpha(0);
    this.steam = this.add.particles(SPOTS.wok.x, SPOTS.wok.y - 20, 'k_steam', {
      x: { min: -50, max: 50 },
      speedY: { min: -60, max: -25 },
      speedX: { min: -12, max: 12 },
      scale: { start: 1.5, end: 5 },
      alpha: { start: 0.35, end: 0 },
      lifespan: 1500,
      frequency: 500,
      emitting: false,
    });
    this.smoke = this.add.particles(SPOTS.wok.x, SPOTS.wok.y - 20, 'k_steam', {
      x: { min: -40, max: 40 },
      speedY: { min: -70, max: -35 },
      scale: { start: 2, end: 7 },
      alpha: { start: 0.55, end: 0 },
      tint: 0x3a332e,
      lifespan: 1700,
      emitting: false,
    });
    this.grains = this.add.particles(0, 0, 'k_grain', {
      speed: { min: 120, max: 260 },
      angle: { min: 235, max: 305 },
      gravityY: 700,
      scale: 3,
      lifespan: 700,
      emitting: false,
    });
    this.world.add([bg, this.flames, this.wok, this.steam, this.smoke, this.grains]);
    this.banner = new Banner(this);

    await u.fadeIn(700);
    if (import.meta.env.DEV && data.step === 'plate') return this.devPlate(!!data.burnt);
    await this.say([
      { who: 'mom', face: 'neutral', text: 'Nghe cho kỹ, mẹ chỉ nói một lần thôi. Hôm nay con làm cơm chiên trứng.' },
      { who: 'me', face: 'shock', text: 'Dạ… con sẽ cố hết sức. (Chắc vậy.)' },
    ]);

    await this.step('Chuẩn bị nguyên liệu', 8, () => this.gather());
    await this.step('Đánh trứng', 12, () => this.beatEggs());
    await this.step('Băm tỏi, hành', 10, () => this.chop());
    await this.step('Lửa vừa', 12, () => this.heatDial());
    await this.step('Phi tỏi', 14, () => this.garlic());
    await this.step('Trứng & cơm', 16, () => this.eggAndRice());
    await this.step('Đảo cơm', 14, () => this.toss());
    await this.step('Nêm nếm', 14, () => this.season());
    await this.plate();
  }

  /** dev shortcut: ?scene=Cooking&step=plate[&burnt=1] jumps to the reveal */
  private devPlate(burnt: boolean) {
    const scores = burnt ? [80, 40, 30, 20, 10, 30, 20, 50] : [100, 85, 72, 100, 90, 78, 88, 95];
    const names = ['Chuẩn bị nguyên liệu', 'Đánh trứng', 'Băm tỏi, hành', 'Lửa vừa', 'Phi tỏi', 'Trứng & cơm', 'Đảo cơm', 'Nêm nếm'];
    const weights = [8, 12, 10, 12, 14, 16, 14, 14];
    this.results = names.map((name, i) => ({ name, weight: weights[i], score: scores[i] }));
    this.burns = burnt ? 2 : 0;
    this.wok.setAlpha(1).setFrame(burnt ? WOK.burnt : WOK.perfect);
    return this.plate();
  }

  // ───────────────────────────── helpers ─────────────────────────────
  private say(lines: Line[]) {
    // the dialogue box sits where mom's barks pop up
    this.children.getByName('bark')?.destroy();
    return ui(this).say(lines);
  }

  private async step(name: string, weight: number, fn: () => Promise<number>) {
    const score = Math.round(Phaser.Math.Clamp(await fn(), 0, 100));
    this.results.push({ name, weight, score });
    await sleep(this, 500);
  }

  /** Report a sub-result: pop text, sfx, optional mom bark. */
  private judge(score: number, early: boolean | null = null, comment?: { good?: string; bad?: string }) {
    const g = grade(score, early);
    popText(this, GAME_W / 2, 250, g.text, g.color);
    if (score >= 70) sfx('quest_done', { volume: 0.6 });
    else if (score < 45) sfx('fail_sting', { volume: 0.4 });
    if (score >= 90 && comment?.good) bark(this, 'smile', comment.good);
    else if (score < 45 && comment?.bad) {
      bark(this, 'angry', comment.bad);
      this.notes.push(comment.bad);
    }
  }

  private focus(x: number, y: number, z: number, ms = 700): Promise<void> {
    const tx = Phaser.Math.Clamp(FOCUS.x - x * z, GAME_W - GAME_W * z, 0);
    const ty = Phaser.Math.Clamp(FOCUS.y - y * z, GAME_H - GAME_H * z, 0);
    return new Promise((r) => this.tweens.add({ targets: this.world, x: tx, y: ty, scale: z, duration: ms, ease: 'Cubic.inOut', onComplete: () => r() }));
  }

  /** world-local point → screen */
  private toScreen(x: number, y: number) {
    return { x: this.world.x + x * this.world.scale, y: this.world.y + y * this.world.scale };
  }

  private placeItem(key: string, tex: string, x: number, y: number, scale = 2) {
    this.items.get(key)?.destroy();
    const img = this.add.image(x, y, tex).setScale(scale).setOrigin(0.5, 0.85);
    this.world.add(img);
    this.items.set(key, img);
    return img;
  }

  private wokFrame(f: number) {
    if (this.burns >= 2 && f !== WOK.burnt) f = WOK.burnt;
    this.wok.setFrame(f);
    this.tweens.add({ targets: this.wok, scaleY: { from: 1.5, to: 1.62 }, duration: 220, ease: 'Back.out' });
  }

  private burn(why: string) {
    this.burns++;
    this.notes.push(why);
    this.smoke.explode(14);
    sfx('fail_sting', { volume: 0.4 });
    this.wok.setTint(this.burns >= 2 ? 0xffffff : 0xb8a898);
    if (this.burns >= 2) this.wokFrame(WOK.burnt);
    this.cameras.main.shake(200, 0.004);
  }

  private sizzle(on: boolean) {
    if (on && !this.stopSizzle) this.stopSizzle = sfxLoop('sizzle_loop', 0.55);
    if (!on && this.stopSizzle) {
      this.stopSizzle();
      this.stopSizzle = null;
    }
  }

  private drop(tex: string, scale: number, from: { x: number; y: number }, to: { x: number; y: number }, ms = 380): Promise<void> {
    const img = this.add.image(from.x, from.y, tex).setScale(scale);
    this.world.add(img);
    return new Promise((r) =>
      this.tweens.add({
        targets: img,
        x: to.x,
        y: to.y,
        angle: Phaser.Math.Between(-40, 40),
        scale: scale * 0.7,
        duration: ms,
        ease: 'Quad.in',
        onComplete: () => {
          img.destroy();
          r();
        },
      }),
    );
  }

  // ───────────────────────────── 1. gather ─────────────────────────────
  private async gather(): Promise<number> {
    await this.say([{ who: 'mom', face: 'neutral', text: 'Đầu tiên đi chuẩn bị cho mẹ hai bát cơm, hai quả trứng, tỏi với hành.' }]);
    const want = new Map<string, number>([
      ['it_rice', 2],
      ['it_egg2', 1],
      ['it_garlic', 1],
      ['it_scallion', 1],
    ]);
    const shelf: [string, string][] = [
      ['it_rice', 'Cơm nguội'],
      ['it_water', 'Nước'],
      ['it_egg2', 'Trứng gà'],
      ['it_money', 'Tiền'],
      ['it_garlic', 'Tỏi'],
      ['it_pepper', 'Tiêu'],
      ['it_key', 'Chìa khóa'],
      ['it_scallion', 'Hành lá'],
    ];
    let wrong = 0;
    const W = 820;
    const H = 420;
    const c = this.add.container(GAME_W / 2, GAME_H / 2 - 20).setDepth(8000);
    const g = drawPanel(this.add.graphics(), -W / 2, -H / 2, W, H, 18);
    const title = this.add.text(0, -H / 2 + 34, 'Chạn bếp — chọn nguyên liệu', { fontFamily: FONT, fontSize: '26px', fontStyle: '800', color: COLORS.accentDark }).setOrigin(0.5);
    c.add([g, title]);
    const checklist = this.add.text(0, H / 2 - 40, '', { fontFamily: FONT, fontSize: '19px', fontStyle: '600', color: COLORS.ink }).setOrigin(0.5);
    c.add(checklist);
    const left = new Map(want);
    const names: Record<string, string> = { it_rice: 'Cơm', it_egg2: 'Trứng', it_garlic: 'Tỏi', it_scallion: 'Hành' };
    const paintList = () =>
      checklist.setText(
        [...want.keys()].map((k) => `${left.get(k)! <= 0 ? '☑' : '☐'} ${names[k]}${want.get(k)! > 1 ? ` (${want.get(k)! - left.get(k)!}/${want.get(k)})` : ''}`).join('     '),
      );
    paintList();
    const cards: Phaser.GameObjects.Container[] = [];
    let sel = 0;
    let finished!: () => void;
    const allDone = new Promise<void>((r) => (finished = r));
    const pick = (i: number) => {
      const [tex, label] = shelf[i];
      const card = cards[i];
      if (card.getData('used')) return;
      const need = left.get(tex) ?? 0;
      if (need <= 0) {
        wrong++;
        sfx('ui_back');
        this.tweens.add({ targets: card, x: card.x + 8, duration: 50, yoyo: true, repeat: 3 });
        bark(this, 'angry', Phaser.Utils.Array.GetRandom([`Lấy ${label.toLowerCase()} làm gì hả con?`, 'Nghe mẹ nói không vậy?', 'Trời đất, cái đó đâu có nấu được!']), 1600);
        return;
      }
      left.set(tex, need - 1);
      sfx('pickup', { detune: (4 - [...left.values()].reduce((a, b) => a + b, 0)) * 120 });
      paintList();
      // fly the item out to its spot on the counter
      const from = { x: c.x + card.x, y: c.y + card.y };
      const dest =
        tex === 'it_rice'
          ? need === 2
            ? SPOTS.bowl1
            : SPOTS.bowl2
          : tex === 'it_egg2'
            ? SPOTS.bowl3
            : tex === 'it_garlic'
              ? { x: SPOTS.board.x - 22, y: SPOTS.board.y }
              : { x: SPOTS.board.x + 26, y: SPOTS.board.y + 4 };
      const fly = this.add.image(from.x, from.y, tex).setScale(3).setDepth(9000);
      this.tweens.add({
        targets: fly,
        x: dest.x,
        y: dest.y - 10,
        scale: 2,
        duration: 450,
        ease: 'Cubic.inOut',
        onComplete: () => {
          fly.destroy();
          const key = tex === 'it_rice' ? `rice${need}` : tex;
          this.placeItem(key, tex, dest.x, dest.y, tex === 'it_rice' ? 1.6 : 2);
          sfx('pan_place', { volume: 0.35, rate: 1.5 });
        },
      });
      if ((left.get(tex) ?? 0) <= 0) {
        card.setData('used', true);
        this.tweens.add({ targets: card, alpha: 0.3, duration: 200 });
      }
      if ([...left.values()].every((v) => v <= 0)) finished();
    };
    shelf.forEach(([tex, label], i) => {
      const x = -W / 2 + 110 + (i % 4) * 200;
      const y = -60 + Math.floor(i / 4) * 150;
      const bgc = this.add.graphics();
      const img = this.add.image(0, -10, tex).setScale(Math.min(3, 60 / this.textures.get(tex).getSourceImage().height));
      const t = this.add.text(0, 44, label, { fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: COLORS.ink }).setOrigin(0.5);
      const card = this.add.container(x, y, [bgc, img, t]).setSize(170, 130).setInteractive({ useHandCursor: true });
      card.setData('bg', bgc);
      card.on('pointerover', () => paint(i));
      card.on('pointerdown', () => pick(i));
      cards.push(card);
      c.add(card);
    });
    const paint = (i: number) => {
      sel = i;
      cards.forEach((card, j) => {
        const bgc = card.getData('bg') as Phaser.GameObjects.Graphics;
        bgc.clear();
        bgc.fillStyle(j === i ? 0xf2b84b : 0xe8d2a6, 1).fillRoundedRect(-80, -62, 160, 124, 12);
        bgc.lineStyle(3, j === i ? 0xa63a17 : 0xc7ab7c).strokeRoundedRect(-80, -62, 160, 124, 12);
        card.setScale(j === i ? 1.06 : 1);
      });
    };
    paint(0);
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.out' });
    const kb = this.input.keyboard!;
    const mv = (d: number) => () => paint((sel + d + shelf.length) % shelf.length);
    const handlers: [string, () => void][] = [
      ['keydown-LEFT', mv(-1)],
      ['keydown-A', mv(-1)],
      ['keydown-RIGHT', mv(1)],
      ['keydown-D', mv(1)],
      ['keydown-UP', mv(-4)],
      ['keydown-W', mv(-4)],
      ['keydown-DOWN', mv(4)],
      ['keydown-S', mv(4)],
      ['keydown-E', () => pick(sel)],
      ['keydown-SPACE', () => pick(sel)],
      ['keydown-ENTER', () => pick(sel)],
    ];
    handlers.forEach(([e, f]) => kb.on(e, f));
    this.banner.show('Chọn đúng nguyên liệu mẹ dặn (chuột hoặc phím mũi tên + E)');
    await allDone;
    handlers.forEach(([e, f]) => kb.off(e, f));
    this.banner.hide();
    await sleep(this, 500);
    this.tweens.add({ targets: c, alpha: 0, scale: 0.9, duration: 250, onComplete: () => c.destroy() });
    const score = 100 - wrong * 20;
    this.judge(score, null, { good: 'Được, nhanh nhẹn đó.', bad: 'Lấy có mấy món mà cũng lộn!' });
    return score;
  }

  // ───────────────────────────── 2. eggs ─────────────────────────────
  private async beatEggs(): Promise<number> {
    await this.focus(SPOTS.bowl3.x - 30, SPOTS.bowl3.y, 2.2);
    await this.say([
      { who: 'mom', face: 'neutral', text: 'Lấy hai quả trứng đánh đều lòng đỏ với lòng trắng. Đập trứng ngay thành chén nha.' },
    ]);
    const egg = this.items.get('it_egg2');
    // crack x2: marker swings, hit the rim zone
    let crack = 0;
    for (let k = 0; k < 2; k++) {
      const centre = Phaser.Math.FloatBetween(0.42, 0.62);
      const gauge = new Gauge(this, GAME_W / 2, 130, 560, [
        { from: centre - 0.16, to: centre + 0.16, color: ZONE.amber },
        { from: centre - 0.06, to: centre + 0.06, color: ZONE.green, label: 'Thành chén' },
      ], `Đập trứng ${k + 1}/2 — nhấn E khi kim vào vùng xanh`);
      const t0 = this.time.now;
      const speed = 1.5 + k * 0.4;
      const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => gauge.set(0.5 + 0.5 * Math.sin(((this.time.now - t0) / 1000) * speed * Math.PI)) });
      await waitPress(this);
      ev.remove();
      const d = Math.abs(gauge.value - centre);
      const acc = clamp01(1 - Math.max(0, d - 0.05) / 0.15);
      crack += acc / 2;
      gauge.flash(acc > 0.6 ? 0x9ed36a : 0xe5533a);
      sfx('egg_collect', { rate: 0.7 });
      sfx('crash_thud', { volume: 0.25, rate: 2 });
      const p = this.toScreen(SPOTS.bowl3.x, SPOTS.bowl3.y - 10);
      const yolk = this.add.particles(p.x, p.y, 'k_yolk', { emitting: false, speed: { min: 60, max: 180 }, angle: { min: 200, max: 340 }, gravityY: 600, scale: 4, lifespan: 500 }).setDepth(9000);
      yolk.explode(acc > 0.6 ? 6 : 22);
      this.time.delayedCall(800, () => yolk.destroy());
      popText(this, GAME_W / 2, 250, acc > 0.8 ? 'Cốp! Gọn!' : acc > 0.4 ? 'Cũng được' : 'Vỏ rơi vào chén…', acc > 0.6 ? COLORS.gold : '#e58a6a', 40);
      if (egg) this.tweens.add({ targets: egg, angle: { from: -20, to: 0 }, duration: 200 });
      gauge.destroy();
      await sleep(this, 500);
    }
    this.placeItem('it_egg2', 'it_beaten', SPOTS.bowl3.x, SPOTS.bowl3.y, 2);
    // whisk
    this.banner.show('Nhấn E liên tục để đánh trứng!');
    const whisk = this.add.image(SPOTS.bowl3.x + 6, SPOTS.bowl3.y - 22, 'k_whisk').setScale(1.4).setAngle(20);
    this.world.add(whisk);
    const meter = new Gauge(this, GAME_W / 2, 130, 560, [{ from: 0.8, to: 1, color: ZONE.green, label: 'Bông mịn' }], 'Độ đều của trứng', 0xf2c230);
    const TARGET = 24;
    let lastSfx = 0;
    const n = await mash(this, 5000, {
      onHit: (i) => {
        meter.set(i / TARGET);
        whisk.setAngle(i % 2 ? -25 : 25);
        whisk.x = SPOTS.bowl3.x + (i % 2 ? -6 : 6);
        if (this.time.now - lastSfx > 90) {
          lastSfx = this.time.now;
          sfx('whisk', { volume: 0.5, detune: Phaser.Math.Between(-100, 100) });
        }
        const bowl = this.items.get('it_egg2');
        if (bowl) this.tweens.add({ targets: bowl, scaleX: 2.1, duration: 40, yoyo: true });
      },
      onTick: (t) => meter.setTitle(`Độ đều của trứng — còn ${Math.ceil(5 - t * 5)}s`),
    });
    meter.destroy();
    this.banner.hide();
    whisk.destroy();
    const whiskScore = clamp01(n / TARGET);
    const score = crack * 50 + whiskScore * 50;
    this.judge(score, null, { good: 'Trứng đánh mịn ghê.', bad: 'Trứng còn nguyên cục lòng trắng kìa!' });
    return score;
  }

  // ───────────────────────────── 3. chop ─────────────────────────────
  private async chop(): Promise<number> {
    await this.focus(SPOTS.board.x, SPOTS.board.y, 2.2);
    await this.say([{ who: 'mom', face: 'neutral', text: 'Rồi băm nhỏ tỏi với hành, để riêng ra. Băm cho đều tay vào.' }]);
    this.banner.show('Nhấn E đúng lúc vòng tròn khớp nhau');
    const knife = this.add.image(SPOTS.board.x + 10, SPOTS.board.y - 30, 'k_knife').setScale(1.6).setAngle(-20).setOrigin(0.3, 0.5);
    this.world.add(knife);
    const bits = this.add.particles(0, 0, 'k_green', { emitting: false, speed: { min: 40, max: 120 }, angle: { min: 200, max: 340 }, gravityY: 500, scale: 3, lifespan: 400 }).setDepth(9000);
    const BEATS = 8;
    const accs = await ringRhythm(this, GAME_W / 2, 210, BEATS, 520, (i, a) => {
      const target = i < BEATS / 2 ? 'it_garlic' : 'it_scallion';
      const item = this.items.get(target);
      if (item) knife.setPosition(item.x, item.y - 26);
      this.tweens.add({ targets: knife, angle: { from: -40, to: 5 }, y: knife.y + 10, duration: 70, yoyo: true });
      if (a > 0) {
        sfx('chop', { detune: Phaser.Math.Between(-80, 80) });
        const p = this.toScreen(knife.x, knife.y + 20);
        bits.setTexture(target === 'it_garlic' ? 'k_grain' : 'k_green');
        bits.explode(6, p.x, p.y);
        this.cameras.main.shake(50, 0.0015);
      } else sfx('ui_back', { volume: 0.4 });
      if (i === BEATS / 2 - 1) this.placeItem('it_garlic', 'it_chopped', SPOTS.board.x - 22, SPOTS.board.y, 1.6);
      if (i === BEATS - 1) this.placeItem('it_scallion', 'it_chopped', SPOTS.board.x + 26, SPOTS.board.y + 4, 1.6).setTint(0xa8e07a);
    });
    this.placeItem('it_garlic', 'it_chopped', SPOTS.board.x - 22, SPOTS.board.y, 1.6);
    this.placeItem('it_scallion', 'it_chopped', SPOTS.board.x + 26, SPOTS.board.y + 4, 1.6).setTint(0xa8e07a);
    knife.destroy();
    bits.destroy();
    this.banner.hide();
    const score = (accs.reduce((a, b) => a + b, 0) / accs.length) * 100;
    this.judge(score, null, { good: 'Đều tay đó, giống mẹ hồi trẻ.', bad: 'Cẩn thận cái tay! Băm kiểu gì vậy?' });
    return score;
  }

  // ───────────────────────────── 4. heat ─────────────────────────────
  private async heatDial(): Promise<number> {
    await this.focus(SPOTS.wok.x, SPOTS.wok.y, 1.8);
    await this.say([{ who: 'mom', face: 'neutral', text: 'Bắt chảo lên bếp, bật lửa vừa thôi. Lửa to là khét hết cả chảo.' }]);
    sfx('stove_click');
    this.flames.start();
    const gauge = new Gauge(this, GAME_W / 2, 130, 600, [
      { from: 0, to: 0.38, color: ZONE.blue, label: 'Nhỏ' },
      { from: 0.38, to: 0.66, color: ZONE.green, label: 'Vừa' },
      { from: 0.66, to: 1, color: ZONE.red, label: 'Lớn' },
    ], 'Vặn núm bếp — nhấn E để chốt');
    const t0 = this.time.now;
    const ev = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const v = 0.5 - 0.5 * Math.cos(((this.time.now - t0) / 1000) * 1.7 * Math.PI);
        gauge.set(v);
        this.flames.frequency = 70 - v * 60;
        this.flames.setParticleScale(1.5 + v * 3, 0.4);
      },
    });
    await waitPress(this);
    ev.remove();
    sfx('stove_click', { rate: 1.2 });
    this.heat = gauge.value;
    gauge.flash();
    await sleep(this, 250);
    gauge.destroy();
    this.flames.frequency = 70 - this.heat * 60;
    if (this.heat > 0.66) this.flames.setTexture('k_flame');
    const d = Math.abs(this.heat - 0.52);
    const score = 100 - Math.max(0, d - 0.04) * 520;
    const early = this.heat < 0.52 ? true : false;
    if (this.heat > 0.66) {
      this.judge(score, false, { bad: 'Lửa to vậy cháy nhà luôn con ơi!' });
      this.notes.push('Lửa quá to');
    } else if (this.heat < 0.38) {
      popText(this, GAME_W / 2, 250, 'Lửa yếu quá…', COLORS.paper);
      bark(this, 'neutral', 'Lửa nhỏ vậy tới tối mới chín.');
    } else this.judge(score, early, { good: 'Đúng rồi, lửa vừa.' });
    return score;
  }

  /** time multiplier from the chosen heat: medium ≈ 1, high is faster (harder) */
  private get pace() {
    return 0.55 + this.heat * 1.0;
  }

  // ───────────────────────────── 5. oil + garlic ─────────────────────────────
  private async garlic(): Promise<number> {
    await this.say([{ who: 'mom', face: 'neutral', text: 'Cho một thìa dầu ăn vào, chờ dầu nóng rồi phi tỏi cho thơm.' }]);
    this.banner.show('Nhấn E để rót dầu');
    const bottle = this.add.image(SPOTS.wok.x + 60, SPOTS.wok.y - 60, 'it_oil').setScale(2.4);
    this.world.add(bottle);
    await waitPress(this);
    this.banner.hide();
    sfx('pour');
    await new Promise<void>((r) => this.tweens.add({ targets: bottle, angle: -110, x: SPOTS.wok.x + 30, duration: 300, onComplete: () => r() }));
    this.tweens.add({ targets: this.wok, alpha: 1, duration: 500 });
    await sleep(this, 500);
    this.tweens.add({ targets: bottle, alpha: 0, angle: 0, duration: 250, onComplete: () => bottle.destroy() });

    this.banner.show('Chờ dầu nóng… nhấn E để cho tỏi vào');
    const gauge = new Gauge(this, GAME_W / 2, 130, 600, [
      { from: 0.68, to: 0.9, color: ZONE.green, label: 'Dầu nóng' },
      { from: 0.9, to: 1, color: ZONE.red, label: 'Bốc khói' },
    ], 'Nhiệt độ dầu', 0xd99a2b);
    const shimmer = this.add.particles(SPOTS.wok.x, SPOTS.wok.y + 5, 'k_bubble', {
      x: { min: -32, max: 32 },
      y: { min: -10, max: 10 },
      scale: { start: 0.5, end: 1.4 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 500,
      frequency: 300,
    });
    this.world.add(shimmer);
    let v = 0;
    let pressed = false;
    const off = onPress(this, () => (pressed = true));
    await new Promise<void>((res) => {
      const ev = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          v += (0.016 * 0.2 * this.pace) / 1;
          gauge.set(v);
          shimmer.frequency = Math.max(30, 300 - v * 280);
          if (v > 0.9) this.smoke.emitParticle(1);
          if (pressed || v >= 1.06) {
            ev.remove();
            res();
          }
        },
      });
    });
    off();
    shimmer.destroy();
    gauge.destroy();
    this.banner.hide();
    const garlic = this.items.get('it_garlic');
    garlic?.setVisible(false);
    await this.drop('it_chopped', 1.6, { x: SPOTS.wok.x - 10, y: SPOTS.wok.y - 70 }, { x: SPOTS.wok.x, y: SPOTS.wok.y });
    this.wokFrame(WOK.garlic);
    this.sizzle(true);
    sfx('sizzle_loop', { volume: 0.3 });
    this.steam.start();
    this.cameras.main.shake(120, 0.002);
    let score: number;
    if (v >= 1.06) {
      score = 10;
      this.burn('Tỏi cháy đen');
      this.judge(score, false, { bad: 'Khét lẹt rồi! Dầu bốc khói mà không thấy hả?' });
    } else {
      score = 100 - Math.max(0, Math.abs(v - 0.79) - 0.05) * 330;
      if (v > 0.95) this.burns += 0.5;
      this.judge(score, v < 0.79, { good: 'Thơm lừng, chuẩn luôn!', bad: v < 0.79 ? 'Dầu còn nguội mà bỏ tỏi vô rồi…' : 'Dầu nóng quá rồi!' });
    }
    return score;
  }

  // ───────────────────────────── 6. egg + rice ─────────────────────────────
  private async eggAndRice(): Promise<number> {
    await this.say([
      { who: 'mom', face: 'neutral', text: 'Cho trứng vào, đợi trứng se lại một chút rồi đảo đều. Trứng chín khoảng tám phần thì cho cơm vào.' },
    ]);
    this.banner.show('Nhấn E để đổ trứng vào chảo');
    await waitPress(this);
    this.items.get('it_egg2')?.setVisible(false);
    sfx('pour', { rate: 0.9 });
    await this.drop('it_beaten', 2, { x: SPOTS.wok.x + 40, y: SPOTS.wok.y - 70 }, { x: SPOTS.wok.x, y: SPOTS.wok.y });
    this.wokFrame(WOK.egg);
    sfx('sizzle_loop', { volume: 0.5 });
    this.steam.frequency = 200;

    this.banner.show('A / D luân phiên để đảo — nhấn E cho cơm khi trứng chín ~80%');
    const gauge = new Gauge(this, GAME_W / 2, 130, 600, [
      { from: 0.72, to: 0.88, color: ZONE.green, label: '80%' },
      { from: 0.95, to: 1, color: ZONE.red, label: 'Khét' },
    ], 'Độ chín của trứng', 0xf2c230);
    let v = 0;
    let stirs = 0;
    let lastKey = '';
    let riceIn = false;
    const kb = this.input.keyboard!;
    const stir = (k: string) => () => {
      if (k === lastKey) return;
      lastKey = k;
      if (v > 0.25) stirs++;
      this.tweens.add({ targets: this.wok, angle: k === 'L' ? -4 : 4, duration: 80, yoyo: true });
      if (this.time.now % 3 < 1) sfx('pan_place', { volume: 0.2, rate: 1.8 });
    };
    const handlers: [string, () => void][] = [
      ['keydown-A', stir('L')],
      ['keydown-LEFT', stir('L')],
      ['keydown-D', stir('R')],
      ['keydown-RIGHT', stir('R')],
    ];
    handlers.forEach(([e, f]) => kb.on(e, f));
    const offPress = onPress(this, (k) => {
      if (k !== 'CLICK' || v > 0.1) riceIn = true;
    });
    await new Promise<void>((res) => {
      const ev = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          v += 0.016 * 0.14 * this.pace;
          gauge.set(v);
          gauge.setTitle(`Độ chín của trứng — ${Math.min(100, Math.round(v * 100))}%   ·   Đã đảo: ${stirs}`);
          if (v > 0.95) this.smoke.emitParticle(1);
          if (riceIn || v >= 1.12) {
            ev.remove();
            res();
          }
        },
      });
    });
    handlers.forEach(([e, f]) => kb.off(e, f));
    offPress();
    gauge.destroy();
    this.banner.hide();
    this.items.get('rice2')?.setVisible(false);
    this.items.get('rice1')?.setVisible(false);
    await this.drop('it_rice', 2, { x: SPOTS.wok.x - 50, y: SPOTS.wok.y - 80 }, { x: SPOTS.wok.x, y: SPOTS.wok.y }, 300);
    this.wokFrame(WOK.rice);
    sfx('pan_place', { volume: 0.5 });
    this.grains.explode(12, SPOTS.wok.x, SPOTS.wok.y - 10);
    const stirScore = clamp01(stirs / 10);
    let timing: number;
    if (v >= 1.12) {
      timing = 5;
      this.burn('Trứng khét');
    } else timing = clamp01(1 - Math.max(0, Math.abs(v - 0.8) - 0.05) / 0.3);
    if (v > 0.95 && v < 1.12) this.burns += 0.5;
    const score = timing * 70 + stirScore * 30;
    if (stirs < 4) this.notes.push('Quên đảo trứng');
    this.judge(score, v < 0.8, {
      good: 'Trứng vàng ươm, đẹp!',
      bad: v < 0.8 ? 'Trứng còn sống nhăn kìa!' : 'Trứng cháy khét rồi con ơi!',
    });
    return score;
  }

  // ───────────────────────────── 7. toss ─────────────────────────────
  private async toss(): Promise<number> {
    await this.say([{ who: 'mom', face: 'neutral', text: 'Đảo đều tay cho cơm tơi, hạt nào hạt nấy săn lại.' }]);
    this.banner.show('Nhấn E đúng nhịp để xóc chảo!');
    this.steam.frequency = 120;
    const y0 = this.wok.y;
    const accs = await ringRhythm(this, GAME_W / 2, 170, 8, 560, (_i, a) => {
      if (a > 0) {
        this.tweens.add({ targets: this.wok, y: y0 - 10 - a * 8, angle: Phaser.Math.Between(-6, 6), duration: 110, yoyo: true, ease: 'Quad.out' });
        this.grains.explode(Math.round(6 + a * 14), SPOTS.wok.x, SPOTS.wok.y - 10);
        sfx('sizzle_loop', { volume: 0.25 + a * 0.3, rate: 1.1 });
        sfx('pan_place', { volume: 0.3, rate: 0.9 + a * 0.4 });
        if (a > 0.8) this.flames.explode(12);
      } else {
        this.smoke.explode(4);
      }
    });
    this.wok.setY(y0).setAngle(0);
    this.banner.hide();
    const hit = accs.reduce((a, b) => a + b, 0) / accs.length;
    const misses = accs.filter((a) => a === 0).length;
    if (misses >= 5) this.burn('Cơm dính chảo, khét đáy');
    const score = hit * 100;
    this.judge(score, null, { good: 'Tay xóc chảo nghề ghê!', bad: 'Cơm dính chảo hết rồi!' });
    return score;
  }

  // ───────────────────────────── 8. season ─────────────────────────────
  private async season(): Promise<number> {
    await this.say([
      { who: 'mom', face: 'neutral', text: 'Nêm gia vị: một thìa nước mắm, ít tiêu thôi. Cho hành lá vào nữa là xong.' },
    ]);
    // fish sauce — hold to pour, release at one spoon
    const bottle = this.add.image(SPOTS.wok.x + 55, SPOTS.wok.y - 70, 'it_fishsauce').setScale(2.6);
    this.world.add(bottle);
    this.banner.show('Giữ E để rót nước mắm, thả ra đúng 1 thìa');
    const g1 = new Gauge(this, GAME_W / 2, 130, 600, [
      { from: 0.38, to: 0.56, color: ZONE.green, label: '1 thìa' },
      { from: 0.8, to: 1, color: ZONE.red, label: 'Mặn chát' },
    ], 'Nước mắm', 0x9a5a2a);
    const held = holdState(this);
    await new Promise<void>((res) => {
      let started = false;
      let lastPour = 0;
      const ev = this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const h = held();
          if (h) {
            if (!started) {
              started = true;
              this.tweens.add({ targets: bottle, angle: -100, duration: 150 });
            }
            g1.set(g1.value + 0.016 * 0.45);
            if (this.time.now - lastPour > 400) {
              lastPour = this.time.now;
              sfx('pour', { volume: 0.4, rate: 1.3 });
            }
          }
          if ((started && !h) || g1.value >= 1) {
            ev.remove();
            res();
          }
        },
      });
    });
    const fish = g1.value;
    g1.destroy();
    this.tweens.add({ targets: bottle, angle: 0, alpha: 0, duration: 250, onComplete: () => bottle.destroy() });
    const fishScore = clamp01(1 - Math.max(0, Math.abs(fish - 0.47) - 0.06) / 0.3) * 100;
    popText(this, GAME_W / 2, 250, fish < 0.38 ? 'Nhạt quá' : fish > 0.62 ? 'Mặn rồi!' : 'Vừa miệng!', fishScore > 70 ? COLORS.gold : '#e58a6a', 44);
    if (fish > 0.62) this.notes.push('Quá tay nước mắm');
    await sleep(this, 700);

    // pepper — tap a few shakes within the window
    const pepper = this.add.image(SPOTS.wok.x + 40, SPOTS.wok.y - 75, 'it_pepper').setScale(2.6).setAngle(160);
    this.world.add(pepper);
    this.banner.show('Nhấn E để rắc tiêu — chỉ ít thôi!');
    const specks = this.add.particles(0, 0, 'k_speck', { emitting: false, speedY: { min: 80, max: 160 }, speedX: { min: -30, max: 30 }, scale: 3, lifespan: 500 }).setDepth(9000);
    const g2 = new Gauge(this, GAME_W / 2, 130, 600, [], 'Thời gian rắc tiêu', 0x8a7a6a);
    let shakes = 0;
    const offP = onPress(this, () => {
      shakes++;
      this.tweens.add({ targets: pepper, y: pepper.y + 8, duration: 60, yoyo: true });
      const p = this.toScreen(pepper.x, pepper.y + 10);
      specks.explode(8, p.x, p.y);
      sfx('seed_drop', { volume: 0.5, detune: shakes * 60 });
    });
    await mash(this, 3200, { onTick: (t) => g2.set(1 - t) });
    offP();
    g2.destroy();
    specks.destroy();
    this.tweens.add({ targets: pepper, alpha: 0, duration: 250, onComplete: () => pepper.destroy() });
    const pepperScore = shakes >= 2 && shakes <= 3 ? 100 : shakes === 1 || shakes === 4 ? 70 : shakes === 0 ? 30 : shakes <= 6 ? 40 : 10;
    popText(this, GAME_W / 2, 250, shakes === 0 ? 'Quên tiêu!' : shakes > 4 ? 'Cay xè!' : 'Thơm tiêu!', pepperScore >= 70 ? COLORS.gold : '#e58a6a', 44);
    if (shakes > 6) this.notes.push('Hắt hơi vì tiêu');
    await sleep(this, 700);

    // scallion
    this.banner.show('Nhấn E để cho hành lá vào');
    await waitPress(this);
    this.items.get('it_scallion')?.setVisible(false);
    await this.drop('it_chopped', 1.6, { x: SPOTS.wok.x - 40, y: SPOTS.wok.y - 70 }, { x: SPOTS.wok.x, y: SPOTS.wok.y });
    this.banner.hide();
    this.wokFrame(this.burns >= 2 ? WOK.burnt : WOK.perfect);
    this.wok.clearTint();
    if (this.burns >= 2) this.wok.setFrame(WOK.burnt);
    const greens = this.add.particles(0, 0, 'k_green', { emitting: false, speed: { min: 60, max: 160 }, angle: { min: 240, max: 300 }, gravityY: 500, scale: 3, lifespan: 600 }).setDepth(9000);
    const p = this.toScreen(SPOTS.wok.x, SPOTS.wok.y - 10);
    greens.explode(18, p.x, p.y);
    this.time.delayedCall(800, () => greens.destroy());
    sfx('sizzle_loop', { volume: 0.4 });
    const score = fishScore * 0.5 + pepperScore * 0.4 + 10;
    this.judge(score, null, { good: 'Nêm vừa khéo!', bad: 'Nêm kiểu này ai mà ăn nổi!' });
    return score;
  }

  // ───────────────────────────── 9. plate + reveal ─────────────────────────────
  private async plate() {
    const total = Math.round(this.results.reduce((a, r) => a + (r.score * r.weight) / 100, 0));
    const burnt = this.burns >= 2 || total < 45;
    await this.say([{ who: 'mom', face: total >= 60 ? 'smile' : 'pain', text: 'Tắt bếp, xúc ra đĩa đi con.' }]);
    sfx('stove_click');
    this.flames.stop();
    this.sizzle(false);
    await this.focus(GAME_W / 2, GAME_H / 2, 1, 600);

    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0705, 0).setOrigin(0).setDepth(9300);
    this.tweens.add({ targets: dim, fillAlpha: 0.72, duration: 500 });
    // light rays behind the dish
    const rays = this.add.graphics().setDepth(9301).setPosition(330, 360).setAlpha(0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillStyle(burnt ? 0x6a5a50 : 0xf2b84b, 0.18).fillTriangle(0, 0, Math.cos(a - 0.12) * 420, Math.sin(a - 0.12) * 420, Math.cos(a + 0.12) * 420, Math.sin(a + 0.12) * 420);
    }
    this.tweens.add({ targets: rays, alpha: 1, duration: 600 });
    this.tweens.add({ targets: rays, angle: 360, duration: 30000, repeat: -1 });
    const dish = this.add.image(330, 380, burnt ? 'it_burnt' : 'it_friedrice').setScale(0).setDepth(9302);
    this.tweens.add({ targets: dish, scale: 5, duration: 600, ease: 'Back.out' });
    this.tweens.add({ targets: dish, y: 370, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 600 });
    const st = this.add.particles(330, 300, burnt ? 'k_steam' : 'k_steam', {
      x: { min: -90, max: 90 },
      speedY: { min: -50, max: -20 },
      scale: { start: 2, end: 6 },
      alpha: { start: burnt ? 0.5 : 0.3, end: 0 },
      tint: burnt ? 0x3a332e : 0xffffff,
      lifespan: 1800,
      frequency: 220,
    }).setDepth(9303);
    void st;
    sfx('pan_place');
    const name = this.add
      .text(330, 560, burnt ? 'Cơm chiên… than' : total >= 80 ? 'Cơm chiên trứng thượng hạng' : 'Cơm chiên trứng', {
        fontFamily: FONT,
        fontSize: '32px',
        fontStyle: '800',
        color: COLORS.paper,
        stroke: COLORS.ink,
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(9304)
      .setAlpha(0);
    this.tweens.add({ targets: name, alpha: 1, delay: 500, duration: 400 });

    // scorecard
    const W = 540;
    const H = 110 + this.results.length * 40 + 90;
    const card = this.add.container(900, GAME_H / 2).setDepth(9310);
    card.add(drawPanel(this.add.graphics(), -W / 2, -H / 2, W, H, 18));
    card.add(this.add.text(0, -H / 2 + 40, 'Mẹ chấm điểm', { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color: COLORS.accentDark }).setOrigin(0.5));
    card.setX(GAME_W + 300);
    this.tweens.add({ targets: card, x: 900, duration: 500, ease: 'Cubic.out', delay: 300 });
    await sleep(this, 900);
    for (let i = 0; i < this.results.length; i++) {
      const r = this.results[i];
      const y = -H / 2 + 92 + i * 40;
      const label = this.add.text(-W / 2 + 36, y, r.name, { fontFamily: FONT, fontSize: '21px', fontStyle: '600', color: COLORS.ink }).setOrigin(0, 0.5);
      const barBg = this.add.rectangle(40, y, 150, 14, 0x4a3a2c).setOrigin(0, 0.5);
      const bar = this.add.rectangle(40, y, 0, 14, r.score >= 70 ? 0x6f9a3a : r.score >= 45 ? 0xd99a2b : 0xc8322b).setOrigin(0, 0.5);
      const num = this.add.text(W / 2 - 34, y, '0', { fontFamily: FONT, fontSize: '21px', fontStyle: '800', color: COLORS.ink }).setOrigin(1, 0.5);
      card.add([label, barBg, bar, num]);
      this.tweens.add({ targets: bar, width: 1.5 * r.score, duration: 380, ease: 'Cubic.out' });
      this.tweens.addCounter({ from: 0, to: r.score, duration: 380, onUpdate: (t) => num.setText(String(Math.round(t.getValue() ?? 0))) });
      sfx('blip_b', { volume: 0.5, detune: r.score * 6 - 300 });
      await sleep(this, 280);
    }
    const ty = H / 2 - 56;
    const line = this.add.rectangle(0, ty - 30, W - 60, 3, 0x2b1d14);
    const tl = this.add.text(-W / 2 + 36, ty, 'TỔNG', { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: COLORS.ink }).setOrigin(0, 0.5);
    const tn = this.add.text(W / 2 - 34, ty, '0', { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: total >= 60 ? '#4f7a33' : COLORS.danger }).setOrigin(1, 0.5);
    card.add([line, tl, tn]);
    await new Promise<void>((r) =>
      this.tweens.addCounter({
        from: 0,
        to: total,
        duration: 1300,
        ease: 'Cubic.out',
        onUpdate: (t) => {
          const v = Math.round(t.getValue() ?? 0);
          if (tn.text !== String(v) && v % 3 === 0) sfx('blip_a', { volume: 0.3, detune: v * 8 });
          tn.setText(String(v));
        },
        onComplete: () => r(),
      }),
    );
    this.tweens.add({ targets: tn, scale: { from: 1.6, to: 1 }, duration: 400, ease: 'Back.out' });
    sfx(total >= 60 ? 'success_jingle' : 'fail_sting');
    this.cameras.main.flash(200, 255, 230, 180);
    const verdict = total >= 90 ? 'Siêu đầu bếp!' : total >= 60 ? 'Ăn được… mà ngon nữa!' : total >= 40 ? 'Hơi… khó nuốt' : 'Thảm họa ẩm thực';
    popText(this, 900, GAME_H / 2 + H / 2 + 34, verdict, total >= 60 ? COLORS.gold : '#e5533a', 40).setDepth(9400);
    await sleep(this, 1200);
    const hint = this.add
      .text(GAME_W / 2, GAME_H - 30, 'Nhấn E để mang ra cho ba mẹ nếm thử', { fontFamily: FONT, fontSize: '20px', color: COLORS.paper })
      .setOrigin(0.5)
      .setDepth(9400);
    this.tweens.add({ targets: hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
    await waitPress(this);
    sfx('ui_confirm');
    await ui(this).fadeOut(600);
    finishMinigame(this, 'cooking', { score: total, notes: this.notes });
  }
}
