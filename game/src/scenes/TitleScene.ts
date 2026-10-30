import Phaser from 'phaser';
import { COLORS, FONT, GAME_H, GAME_W } from '../config';
import { ENDINGS, ENDING_ORDER } from '../data/endings';
import { G } from '../state/GameState';
import { ambient, music, sfx } from '../systems/Audio';
import { Cloud } from '../systems/Cloud';
import { openAuthPanel } from '../ui/AuthPanel';
import { drawPanel } from '../ui/Panel';
import { ui } from './UIScene';

/** Title: slow Ken Burns over the key art, animated logo, menu. */
export class TitleScene extends Phaser.Scene {
  private items: { label: string; run: () => void; enabled: boolean }[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private sel = 0;
  private overlay: Phaser.GameObjects.Container | null = null;
  private started = false;
  private modal = false;
  private account?: Phaser.GameObjects.Text;

  constructor() {
    super('Title');
  }

  create() {
    this.started = false;
    this.modal = false;
    this.overlay = null;
    this.account = undefined;
    this.texts = [];
    const u = ui(this);
    u.hudVisible(false);
    u.quest(null);
    void u.fadeIn(600);

    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'cg_title').setScale(2.15);
    this.tweens.add({ targets: bg, scale: 2.3, x: GAME_W / 2 - 30, y: GAME_H / 2 + 10, duration: 22000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // warm gradient at the bottom so the menu reads well
    const grad = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      grad.fillStyle(0x120d0a, (i / 40) * 0.85).fillRect(0, GAME_H - 360 + i * 9, GAME_W, 9);
    }
    // floating embers / steam
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffd27a).fillRect(0, 0, 2, 2);
    g.generateTexture('px_ember', 2, 2);
    g.destroy();
    this.add.particles(0, 0, 'px_ember', {
      x: { min: 0, max: GAME_W },
      y: GAME_H + 10,
      speedY: { min: -60, max: -25 },
      speedX: { min: -10, max: 10 },
      lifespan: 9000,
      scale: { min: 1, max: 3 },
      alpha: { start: 0.9, end: 0 },
      frequency: 180,
    });

    // logo
    const logo = this.add.container(GAME_W / 2, 150);
    const words = ['Học', 'Ăn', 'Học', 'Nấu'];
    let x = 0;
    const parts = words.map((w, i) => {
      const t = this.add
        .text(0, 0, w, { fontFamily: FONT, fontSize: '104px', fontStyle: '800', color: i % 2 ? COLORS.gold : COLORS.paper, stroke: COLORS.ink, strokeThickness: 14 })
        .setOrigin(0, 0.5)
        .setShadow(0, 8, '#2b1d14', 0, true, true);
      t.x = x;
      x += t.width + 18;
      return t;
    });
    parts.forEach((p) => (p.x -= (x - 18) / 2));
    logo.add(parts);
    parts.forEach((p, i) => {
      const y0 = p.y;
      p.setY(y0 - 260).setAngle(Phaser.Math.Between(-15, 15));
      this.tweens.add({ targets: p, y: y0, angle: 0, delay: 250 + i * 140, duration: 700, ease: 'Bounce.out' });
      this.tweens.add({ targets: p, y: y0 - 6, delay: 1400 + i * 180, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    const sub = this.add
      .text(GAME_W / 2, 238, 'CHƯƠNG 1 · MẸ ƠI, CON NẤU!', { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: COLORS.paper, stroke: COLORS.ink, strokeThickness: 6 })
      .setOrigin(0.5)
      .setAlpha(0)
      .setLetterSpacing?.(4);
    this.tweens.add({ targets: sub, alpha: 1, delay: 1100, duration: 600 });

    this.items = [
      { label: 'Chơi mới', run: () => this.newGame(), enabled: true },
      { label: 'Tiếp tục', run: () => this.continueGame(), enabled: G.hasSave() },
      { label: '', run: () => void this.showAccount(), enabled: true },
      { label: 'Bộ sưu tập kết cục', run: () => this.showEndings(), enabled: true },
      { label: 'Cài đặt', run: () => this.showSettings(), enabled: true },
    ];
    this.texts = this.items.map((it, i) => {
      const t = this.add
        .text(GAME_W / 2, 400 + i * 58, it.label, { fontFamily: FONT, fontSize: '32px', fontStyle: '700', color: it.enabled ? COLORS.paper : '#7d6a58', stroke: COLORS.ink, strokeThickness: 6 })
        .setOrigin(0.5)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.select(i));
      t.on('pointerdown', () => this.activate());
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 10, delay: 1300 + i * 90, duration: 400 });
      return t;
    });
    this.sel = 0;
    this.refreshMenu();

    // who is playing + whether progress is safe on the server
    this.account = this.add
      .text(GAME_W - 24, 22, '', { fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: COLORS.paper, stroke: COLORS.ink, strokeThickness: 5 })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => void this.showAccount());
    const offCloud = Cloud.onChange(() => this.refreshMenu());
    this.events.once('shutdown', offCloud);
    // The boot-time session check may finish after the menu is up (and may pull a save).
    void Cloud.ready.then(() => this.scene.isActive() && this.refreshMenu());

    this.add
      .text(GAME_W / 2, GAME_H - 26, 'WASD/Mũi tên: di chuyển · Shift: chạy · E/Space: tương tác · © 2026 Học Ăn Học Nấu team', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#b9a58a',
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-W', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-S', () => this.move(1));
    kb.on('keydown-ENTER', () => this.activate());
    kb.on('keydown-SPACE', () => this.activate());
    kb.on('keydown-E', () => this.activate());
    kb.on('keydown-ESC', () => this.closeOverlay());

    music('title');
    ambient(null);
  }

  private refreshMenu() {
    if (!this.texts.length) return;
    this.items[1].enabled = G.hasSave();
    this.items[2].label = Cloud.user ? `Tài khoản · ${Cloud.user.displayName}` : 'Đăng nhập để lưu tiến độ';
    if (!this.items[this.sel].enabled) this.sel = 0;
    this.select(this.sel, true);
    if (!this.account) return;
    const st = { guest: 'Khách · tiến độ chỉ lưu trên máy này', syncing: 'Đang lưu…', synced: 'Đã lưu lên máy chủ', offline: 'Mất kết nối · đang lưu trên máy' }[Cloud.status];
    this.account.setText(Cloud.user ? `☁ ${Cloud.user.displayName} · ${st}` : st);
  }

  private async showAccount() {
    if (this.modal || this.overlay) return;
    this.modal = true;
    await openAuthPanel(this.input);
    this.modal = false;
    this.refreshMenu();
  }

  private move(d: number) {
    if (this.overlay || this.modal) return;
    let i = this.sel;
    do i = (i + d + this.items.length) % this.items.length;
    while (!this.items[i].enabled);
    this.select(i);
  }

  private select(i: number, silent = false) {
    if (!this.items[i].enabled) return;
    if (i !== this.sel && !silent) sfx('ui_hover', { volume: 0.5 });
    this.sel = i;
    this.texts.forEach((t, j) => {
      const on = j === i;
      t.setText(on ? `✦  ${this.items[j].label}  ✦` : this.items[j].label);
      t.setColor(on ? COLORS.gold : this.items[j].enabled ? COLORS.paper : '#7d6a58');
      this.tweens.add({ targets: t, scale: on ? 1.12 : 1, duration: 140 });
    });
  }

  private activate() {
    if (this.started || this.modal) return;
    if (this.overlay) return this.closeOverlay();
    sfx('ui_confirm');
    this.items[this.sel].run();
  }

  private async newGame() {
    this.started = true;
    G.newGame();
    music(null, { fadeMs: 800 });
    await ui(this).fadeOut(700);
    this.scene.start('World', { map: 'bedroom', spawn: 'bed', event: 'intro' });
  }

  private async continueGame() {
    this.started = true;
    const r = G.load();
    music(null, { fadeMs: 800 });
    await ui(this).fadeOut(700);
    this.scene.start(r.scene, r.data);
  }

  private openOverlay(title: string, build: (c: Phaser.GameObjects.Container, w: number, h: number) => void) {
    const w = 760;
    const h = 480;
    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(100);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0, 0.6).setInteractive();
    const g = drawPanel(this.add.graphics(), -w / 2, -h / 2, w, h, 18);
    const t = this.add.text(0, -h / 2 + 40, title, { fontFamily: FONT, fontSize: '32px', fontStyle: '800', color: COLORS.accentDark }).setOrigin(0.5);
    const hint = this.add.text(0, h / 2 - 30, 'Esc / Enter: đóng', { fontFamily: FONT, fontSize: '16px', color: '#7d6a58' }).setOrigin(0.5);
    c.add([dim, g, t, hint]);
    build(c, w, h);
    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    this.overlay = c;
  }

  private closeOverlay() {
    if (!this.overlay) return;
    sfx('ui_back');
    const c = this.overlay;
    this.overlay = null;
    this.input.keyboard!.removeAllListeners('keydown-LEFT');
    this.input.keyboard!.removeAllListeners('keydown-RIGHT');
    this.tweens.add({ targets: c, alpha: 0, scale: 0.9, duration: 150, onComplete: () => c.destroy() });
  }

  private showEndings() {
    const got = G.endings();
    this.openOverlay(`Kết cục đã mở · ${got.length}/${ENDING_ORDER.length}`, (c) => {
      ENDING_ORDER.forEach((id, i) => {
        const e = ENDINGS[id];
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = -240 + col * 240;
        const y = -90 + row * 170;
        const unlocked = got.includes(id);
        const img = this.add.image(x, y, e.cg).setDisplaySize(208, 117);
        if (!unlocked) img.setTint(0x222222);
        const frame = this.add.rectangle(x, y, 212, 121).setStrokeStyle(3, unlocked ? 0xd9572b : 0x5a4636);
        const label = this.add
          .text(x, y + 74, unlocked ? e.title : '???', { fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: COLORS.ink, align: 'center', wordWrap: { width: 220 } })
          .setOrigin(0.5, 0);
        c.add([img, frame, label]);
      });
    });
  }

  private showSettings() {
    this.openOverlay('Cài đặt', (c) => {
      const rows: { label: string; get: () => number; set: (v: number) => void; fmt: (v: number) => string }[] = [
        { label: 'Nhạc', get: () => G.settings.music, set: (v) => (G.settings.music = v), fmt: (v) => `${Math.round(v * 100)}%` },
        { label: 'Hiệu ứng', get: () => G.settings.sfx, set: (v) => (G.settings.sfx = v), fmt: (v) => `${Math.round(v * 100)}%` },
        {
          label: 'Tốc độ chữ',
          get: () => (G.settings.textSpeed - 15) / 75,
          set: (v) => (G.settings.textSpeed = 15 + v * 75),
          fmt: (v) => (v < 0.3 ? 'Chậm' : v < 0.7 ? 'Vừa' : 'Nhanh'),
        },
      ];
      let sel = 0;
      const vals: Phaser.GameObjects.Text[] = [];
      const labels: Phaser.GameObjects.Text[] = [];
      rows.forEach((r, i) => {
        labels.push(this.add.text(-260, -80 + i * 80, r.label, { fontFamily: FONT, fontSize: '28px', fontStyle: '700', color: COLORS.ink }).setOrigin(0, 0.5));
        vals.push(this.add.text(220, -80 + i * 80, '', { fontFamily: FONT, fontSize: '28px', color: COLORS.accentDark }).setOrigin(0.5));
      });
      c.add([...labels, ...vals]);
      const paint = () =>
        rows.forEach((r, i) => {
          vals[i].setText(`◀  ${r.fmt(r.get())}  ▶`);
          labels[i].setColor(i === sel ? COLORS.accent : COLORS.ink);
        });
      paint();
      const kb = this.input.keyboard!;
      const nudge = (d: number) => {
        const r = rows[sel];
        r.set(Phaser.Math.Clamp(Math.round((r.get() + d) * 10) / 10, 0, 1));
        G.saveSettings();
        sfx('ui_click');
        paint();
      };
      kb.on('keydown-LEFT', () => nudge(-0.1));
      kb.on('keydown-RIGHT', () => nudge(0.1));
      const up = () => {
        if (this.overlay !== c) return;
        sel = (sel + rows.length - 1) % rows.length;
        paint();
      };
      const down = () => {
        if (this.overlay !== c) return;
        sel = (sel + 1) % rows.length;
        paint();
      };
      kb.on('keydown-UP', up);
      kb.on('keydown-DOWN', down);
      c.once('destroy', () => {
        kb.off('keydown-UP', up);
        kb.off('keydown-DOWN', down);
      });
    });
  }
}
