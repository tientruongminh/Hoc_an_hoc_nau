import Phaser from 'phaser';
import { COLORS, FONT, GAME_H, GAME_W, hex } from '../config';
import { SPEAKERS, type Line } from '../data/speakers';
import { G } from '../state/GameState';
import { sfx } from '../systems/Audio';
import { drawPanel } from '../ui/Panel';

const BOX = { x: 150, y: 520, w: 980, h: 172 };

/**
 * Always-on overlay: HUD, quest tracker, toasts, dialogue + choices, fades.
 * Other scenes reach it through `ui(scene)` and await its promise APIs.
 */
export class UIScene extends Phaser.Scene {
  busy = false;
  private dlg!: Phaser.GameObjects.Container;
  private dlgPanel!: Phaser.GameObjects.Graphics;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgName!: Phaser.GameObjects.Text;
  private dlgNameBg!: Phaser.GameObjects.Graphics;
  private dlgPortrait!: Phaser.GameObjects.Image;
  private dlgArrow!: Phaser.GameObjects.Text;
  private advance: (() => void) | null = null;

  private hud!: Phaser.GameObjects.Container;
  private moneyText!: Phaser.GameObjects.Text;
  private questBox!: Phaser.GameObjects.Container;
  private questBg!: Phaser.GameObjects.Graphics;
  private questText!: Phaser.GameObjects.Text;
  private toastY = 96;
  private shownMoney = G.d.money;
  private fader!: Phaser.GameObjects.Rectangle;
  private bars: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({ key: 'UI', active: false });
  }

  create() {
    this.buildHud();
    this.buildDialogue();
    this.fader = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0705, 1).setOrigin(0).setAlpha(0).setDepth(1000);
    const bh = 70;
    this.bars = [
      this.add.rectangle(0, -bh, GAME_W, bh, 0x000000).setOrigin(0).setDepth(900),
      this.add.rectangle(0, GAME_H, GAME_W, bh, 0x000000).setOrigin(0).setDepth(900),
    ];

    const adv = () => this.advance?.();
    this.input.keyboard!.on('keydown-E', adv);
    this.input.keyboard!.on('keydown-SPACE', adv);
    this.input.keyboard!.on('keydown-ENTER', adv);
    this.input.on('pointerdown', adv);

    G.onChange(() => this.refreshHud());
    this.refreshHud();
  }

  // ───────────────────────── HUD ─────────────────────────
  private buildHud() {
    const g = this.add.graphics();
    drawPanel(g, 20, 18, 190, 50, 12);
    const coin = this.add.image(46, 43, 'ic_coin').setScale(2.4);
    this.moneyText = this.add.text(70, 43, '', { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: COLORS.ink }).setOrigin(0, 0.5);
    this.hud = this.add.container(0, 0, [g, coin, this.moneyText]).setDepth(100);

    this.questBg = this.add.graphics();
    const title = this.add.text(20, 12, 'NHIỆM VỤ', { fontFamily: FONT, fontSize: '15px', fontStyle: '800', color: COLORS.accentDark });
    this.questText = this.add.text(20, 36, '', {
      fontFamily: FONT,
      fontSize: '19px',
      color: COLORS.ink,
      wordWrap: { width: 330 },
      lineSpacing: 4,
    });
    this.questBox = this.add.container(GAME_W - 390, 18, [this.questBg, title, this.questText]).setDepth(100).setAlpha(0);
  }

  hudVisible(v: boolean) {
    this.tweens.add({ targets: [this.hud, ...(this.questText.text ? [this.questBox] : [])], alpha: v ? 1 : 0, duration: 250 });
  }

  private refreshHud() {
    if (!this.moneyText) return;
    const target = G.d.money;
    if (target !== this.shownMoney) {
      const from = this.shownMoney;
      this.shownMoney = target;
      this.tweens.addCounter({
        from,
        to: target,
        duration: 600,
        onUpdate: (t) => this.moneyText.setText(fmtMoney(Math.round(t.getValue() ?? target))),
      });
      this.tweens.add({ targets: this.moneyText, scale: { from: 1.25, to: 1 }, duration: 300 });
    } else this.moneyText.setText(fmtMoney(target));
  }

  /** Set the objective list; pass null to hide. */
  quest(text: string | null, announce = true) {
    if (!text) {
      this.tweens.add({ targets: this.questBox, alpha: 0, duration: 250 });
      this.questText.setText('');
      return;
    }
    if (text === this.questText.text) return;
    const isNew = announce && !!text;
    this.questText.setText(text);
    const h = this.questText.height + 52;
    drawPanel(this.questBg, 0, 0, 370, h, 12);
    this.questBox.setAlpha(1);
    if (isNew) {
      sfx('quest_new', { volume: 0.7 });
      this.questBox.x = GAME_W + 10;
      this.tweens.add({ targets: this.questBox, x: GAME_W - 390, duration: 450, ease: 'Back.out' });
    }
  }

  questDone() {
    sfx('quest_done');
    this.tweens.add({ targets: this.questText, alpha: 0.3, yoyo: true, duration: 180, repeat: 1 });
  }

  /** Small notification at the top centre, optional icon texture. */
  toast(text: string, icon?: string) {
    const y = this.toastY;
    this.toastY += 58;
    const t = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: '21px', fontStyle: '600', color: COLORS.ink }).setOrigin(0, 0.5);
    const iconImg = icon ? this.add.image(0, 0, icon).setScale(Math.min(3, 34 / this.textures.get(icon).getSourceImage().height)) : null;
    const pad = 18;
    const iw = iconImg ? iconImg.displayWidth + 12 : 0;
    const w = t.width + iw + pad * 2;
    const g = drawPanel(this.add.graphics(), -w / 2, -24, w, 48, 12);
    t.x = -w / 2 + pad + iw;
    if (iconImg) iconImg.setPosition(-w / 2 + pad + iconImg.displayWidth / 2, 0);
    const c = this.add.container(GAME_W / 2, y - 30, [g, t, ...(iconImg ? [iconImg] : [])]).setDepth(200).setAlpha(0);
    this.tweens.add({ targets: c, y, alpha: 1, duration: 300, ease: 'Back.out' });
    this.tweens.add({
      targets: c,
      alpha: 0,
      y: y - 20,
      delay: 2400,
      duration: 350,
      onComplete: () => {
        c.destroy();
        this.toastY = Math.max(96, this.toastY - 58);
      },
    });
  }

  /** Giant centred caption (chapter cards, "Một lúc sau…"). */
  caption(text: string, sub = '', hold = 1600): Promise<void> {
    return new Promise((res) => {
      const t = this.add
        .text(GAME_W / 2, GAME_H / 2 - (sub ? 18 : 0), text, { fontFamily: FONT, fontSize: '44px', fontStyle: '800', color: COLORS.paper, align: 'center' })
        .setOrigin(0.5)
        .setDepth(1100)
        .setAlpha(0)
        .setShadow(0, 4, '#000', 8, true, true);
      const s = this.add
        .text(GAME_W / 2, GAME_H / 2 + 34, sub, { fontFamily: FONT, fontSize: '22px', color: COLORS.gold, align: 'center' })
        .setOrigin(0.5)
        .setDepth(1100)
        .setAlpha(0);
      this.tweens.add({
        targets: [t, s],
        alpha: 1,
        duration: 500,
        hold,
        yoyo: true,
        onComplete: () => {
          t.destroy();
          s.destroy();
          res();
        },
      });
    });
  }

  fadeOut(ms = 400, color = 0x0b0705): Promise<void> {
    this.fader.fillColor = color;
    return new Promise((res) => this.tweens.add({ targets: this.fader, alpha: 1, duration: ms, onComplete: () => res() }));
  }
  fadeIn(ms = 400): Promise<void> {
    return new Promise((res) => this.tweens.add({ targets: this.fader, alpha: 0, duration: ms, onComplete: () => res() }));
  }
  isFaded() {
    return this.fader.alpha > 0.5;
  }

  private cgImg: Phaser.GameObjects.Image | null = null;

  /** Full-screen CG behind the dialogue box. */
  showCG(key: string, ms = 500): Promise<void> {
    this.cgImg?.destroy();
    const img = this.add.image(GAME_W / 2, GAME_H / 2, key).setScale(2.08).setDepth(400).setAlpha(0);
    this.cgImg = img;
    this.tweens.add({ targets: img, scale: 2.18, duration: 9000, ease: 'Sine.out' });
    return new Promise((res) => this.tweens.add({ targets: img, alpha: 1, duration: ms, onComplete: () => res() }));
  }
  hideCG(ms = 400): Promise<void> {
    const img = this.cgImg;
    this.cgImg = null;
    if (!img) return Promise.resolve();
    return new Promise((res) =>
      this.tweens.add({
        targets: img,
        alpha: 0,
        duration: ms,
        onComplete: () => {
          img.destroy();
          res();
        },
      }),
    );
  }

  letterbox(on: boolean) {
    const bh = 70;
    this.tweens.add({ targets: this.bars[0], y: on ? 0 : -bh, duration: 400, ease: 'Cubic.out' });
    this.tweens.add({ targets: this.bars[1], y: on ? GAME_H - bh : GAME_H, duration: 400, ease: 'Cubic.out' });
    // the quest box sits under the top bar; slide it down while the bars are in
    this.tweens.add({ targets: this.questBox, y: on ? bh + 10 : 18, duration: 400, ease: 'Cubic.out' });
  }

  flash(color = 0xffffff, ms = 160) {
    const r = this.add.rectangle(0, 0, GAME_W, GAME_H, color).setOrigin(0).setDepth(950);
    this.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
  }

  // ─────────────────────── Dialogue ───────────────────────
  private buildDialogue() {
    this.dlgPanel = this.add.graphics();
    drawPanel(this.dlgPanel, BOX.x, BOX.y, BOX.w, BOX.h, 16);
    this.dlgPortrait = this.add.image(BOX.x + 96, BOX.y + BOX.h - 12, 'pt_player_neutral').setOrigin(0.5, 1).setScale(2);
    this.dlgNameBg = this.add.graphics();
    this.dlgName = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '22px', fontStyle: '800', color: '#fff' }).setOrigin(0, 0.5);
    this.dlgText = this.add.text(0, BOX.y + 30, '', {
      fontFamily: FONT,
      fontSize: '25px',
      color: COLORS.ink,
      lineSpacing: 8,
      wordWrap: { width: BOX.w - 260, useAdvancedWrap: true },
    });
    this.dlgArrow = this.add.text(BOX.x + BOX.w - 34, BOX.y + BOX.h - 30, '▼', { fontFamily: FONT, fontSize: '20px', color: COLORS.accent }).setOrigin(0.5);
    this.tweens.add({ targets: this.dlgArrow, y: '+=6', yoyo: true, repeat: -1, duration: 380, ease: 'Sine.inOut' });
    this.dlg = this.add
      .container(0, 0, [this.dlgPanel, this.dlgPortrait, this.dlgNameBg, this.dlgName, this.dlgText, this.dlgArrow])
      .setDepth(500)
      .setVisible(false);
  }

  private showBox(on: boolean): Promise<void> {
    return new Promise((res) => {
      if (on) {
        this.dlg.setVisible(true).setAlpha(0).setY(30);
        this.tweens.add({ targets: this.dlg, alpha: 1, y: 0, duration: 220, ease: 'Cubic.out', onComplete: () => res() });
      } else {
        this.tweens.add({
          targets: this.dlg,
          alpha: 0,
          y: 30,
          duration: 180,
          onComplete: () => {
            this.dlg.setVisible(false);
            res();
          },
        });
      }
    });
  }

  private setSpeaker(line: Line) {
    const narr = typeof line === 'string';
    const sp = narr ? null : SPEAKERS[line.who];
    const tex = sp?.portrait ? `${sp.portrait}_${(!narr && line.face) || sp.face}` : null;
    const hasPortrait = !!tex && this.textures.exists(tex);
    if (hasPortrait) {
      if (this.dlgPortrait.texture.key !== tex || !this.dlgPortrait.visible) {
        this.dlgPortrait.setTexture(tex!).setVisible(true);
        this.dlgPortrait.setScale(2.1);
        this.tweens.add({ targets: this.dlgPortrait, scale: 2, duration: 160, ease: 'Back.out' });
      }
    } else this.dlgPortrait.setVisible(false);
    const tx = hasPortrait ? BOX.x + 200 : BOX.x + 44;
    this.dlgText.setX(tx).setWordWrapWidth(BOX.x + BOX.w - 50 - tx);
    this.dlgText.setStyle({ fontStyle: narr ? 'italic' : 'normal', color: narr ? '#5a4636' : COLORS.ink });
    this.dlgNameBg.clear();
    this.dlgName.setText(sp?.name ?? '');
    if (sp) {
      const w = this.dlgName.width + 32;
      const x = BOX.x + (hasPortrait ? 180 : 30);
      this.dlgNameBg.fillStyle(hex(COLORS.ink)).fillRoundedRect(x - 3, BOX.y - 23, w + 6, 42, 10);
      this.dlgNameBg.fillStyle(hex(sp.color)).fillRoundedRect(x, BOX.y - 20, w, 36, 8);
      this.dlgName.setPosition(x + 16, BOX.y - 2);
    }
  }

  /** Show lines one by one; resolves when the last is dismissed. */
  async say(lines: Line[] | Line): Promise<void> {
    const list = Array.isArray(lines) ? lines : [lines];
    this.busy = true;
    await this.showBox(true);
    for (const line of list) await this.typeLine(line);
    await this.showBox(false);
    this.busy = false;
  }

  private typeLine(line: Line): Promise<void> {
    this.setSpeaker(line);
    const text = typeof line === 'string' ? line : line.text;
    const sp = typeof line === 'string' ? null : SPEAKERS[line.who];
    if (typeof line !== 'string' && line.shake) {
      this.cameras.main.shake(260, 0.006);
      this.scene.manager.getScenes(true).forEach((s) => s !== this && s.cameras.main.shake(260, 0.004));
    }
    this.dlgText.setText('');
    this.dlgArrow.setVisible(false);
    return new Promise((res) => {
      let i = 0;
      let done = false;
      const cps = G.settings.textSpeed;
      const timer = this.time.addEvent({
        delay: 1000 / cps,
        loop: true,
        callback: () => {
          i++;
          this.dlgText.setText(text.slice(0, i));
          const ch = text[i - 1];
          if (sp && i % 2 === 0 && ch && /\S/.test(ch)) sfx(sp.blip, { volume: 0.35, detune: sp.pitch + Phaser.Math.Between(-60, 60) });
          if (i >= text.length) finish();
        },
      });
      const finish = () => {
        timer.remove();
        this.dlgText.setText(text);
        done = true;
        this.dlgArrow.setVisible(true);
      };
      // ignore the keypress that opened the box
      this.time.delayedCall(120, () => {
        this.advance = () => {
          if (!done) return finish();
          sfx('ui_click', { volume: 0.5 });
          this.advance = null;
          res();
        };
      });
    });
  }

  /** Vertical choice menu; resolves with the chosen index. */
  choose(prompt: string, options: string[]): Promise<number> {
    this.busy = true;
    return new Promise((res) => {
      const items: Phaser.GameObjects.Container[] = [];
      // size the buttons to the longest option (measured at the selected, "▶ "-prefixed state)
      const probe = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '23px', fontStyle: '600' });
      const w = Phaser.Math.Clamp(Math.max(...options.map((o) => probe.setText('▶  ' + o).width)) * 1.05 + 70, 620, GAME_W - 80);
      probe.destroy();
      const top = GAME_H / 2 - (options.length * 66) / 2 + 10;
      const title = this.add
        .text(GAME_W / 2, top - 50, prompt, { fontFamily: FONT, fontSize: '26px', fontStyle: '700', color: COLORS.paper, align: 'center', wordWrap: { width: 900 } })
        .setOrigin(0.5)
        .setShadow(0, 3, '#000', 6, true, true)
        .setDepth(601);
      const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.45).setOrigin(0).setDepth(599);
      let sel = 0;
      options.forEach((o, i) => {
        const g = drawPanel(this.add.graphics(), -w / 2, -26, w, 52, 12);
        const t = this.add.text(0, 0, o, { fontFamily: FONT, fontSize: '23px', fontStyle: '600', color: COLORS.ink }).setOrigin(0.5);
        const c = this.add.container(GAME_W / 2, top + i * 66, [g, t]).setDepth(600).setSize(w, 52).setInteractive({ useHandCursor: true });
        c.on('pointerover', () => select(i));
        c.on('pointerdown', () => pick());
        c.setAlpha(0).setX(GAME_W / 2 + 40);
        this.tweens.add({ targets: c, alpha: 1, x: GAME_W / 2, delay: i * 60, duration: 220, ease: 'Cubic.out' });
        items.push(c);
      });
      const select = (i: number) => {
        if (i !== sel) sfx('ui_hover', { volume: 0.4 });
        sel = (i + options.length) % options.length;
        items.forEach((c, j) => {
          c.setScale(j === sel ? 1.05 : 1);
          (c.list[1] as Phaser.GameObjects.Text).setColor(j === sel ? COLORS.accentDark : COLORS.ink).setText((j === sel ? '▶  ' : '') + options[j]);
        });
      };
      const kb = this.input.keyboard!;
      const up = () => select(sel - 1);
      const down = () => select(sel + 1);
      const pick = () => {
        sfx('ui_confirm');
        kb.off('keydown-UP', up).off('keydown-W', up).off('keydown-DOWN', down).off('keydown-S', down);
        this.advance = null;
        [...items, title, dim].forEach((o) => o.destroy());
        this.busy = false;
        res(sel);
      };
      kb.on('keydown-UP', up).on('keydown-W', up).on('keydown-DOWN', down).on('keydown-S', down);
      select(0);
      this.time.delayedCall(500, () => (this.advance = pick));
    });
  }
}

export function fmtMoney(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export function ui(scene: Phaser.Scene): UIScene {
  return scene.scene.get('UI') as UIScene;
}
