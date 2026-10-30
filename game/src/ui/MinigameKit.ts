import Phaser from 'phaser';
import { COLORS, FONT, GAME_H, GAME_W } from '../config';
import { sfx } from '../systems/Audio';
import { drawPanel } from './Panel';

/** "3, 2, 1, Bắt đầu!" — resolves when play should begin. */
export function countdown(scene: Phaser.Scene, go = 'Bắt đầu!'): Promise<void> {
  return new Promise((res) => {
    const seq = ['3', '2', '1', go];
    let i = 0;
    const step = () => {
      const last = i === seq.length - 1;
      const t = scene.add
        .text(GAME_W / 2, GAME_H / 2, seq[i], { fontFamily: FONT, fontSize: last ? '88px' : '120px', fontStyle: '800', color: last ? COLORS.gold : COLORS.paper })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10_000)
        .setShadow(0, 6, '#000', 10, true, true)
        .setScale(1.8)
        .setAlpha(0);
      sfx(last ? 'ui_confirm' : 'ui_click', { rate: last ? 1 : 0.9 + i * 0.08 });
      scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
      scene.tweens.add({ targets: t, alpha: 0, scale: 0.8, delay: 560, duration: 200, onComplete: () => t.destroy() });
      i++;
      if (i < seq.length) scene.time.delayedCall(700, step);
      else scene.time.delayedCall(450, () => res());
    };
    step();
  });
}

/** Centred result card with one or more buttons; resolves with the button index. */
export function resultCard(scene: Phaser.Scene, title: string, lines: string[], buttons: string[] = ['Tiếp tục']): Promise<number> {
  return new Promise((res) => {
    const w = 640;
    const h = 170 + lines.length * 38;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const dim = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0).setScrollFactor(0).setDepth(10_000);
    const g = drawPanel(scene.add.graphics().setScrollFactor(0), -w / 2, -h / 2, w, h, 18);
    const t = scene.add.text(0, -h / 2 + 46, title, { fontFamily: FONT, fontSize: '36px', fontStyle: '800', color: COLORS.accentDark }).setOrigin(0.5);
    objs.push(g, t);
    lines.forEach((l, i) =>
      objs.push(scene.add.text(0, -h / 2 + 100 + i * 38, l, { fontFamily: FONT, fontSize: '24px', color: COLORS.ink }).setOrigin(0.5)),
    );
    const bw = 220;
    let sel = 0;
    const btns = buttons.map((b, i) => {
      const x = (i - (buttons.length - 1) / 2) * (bw + 20);
      const bg = scene.add.graphics();
      const bt = scene.add.text(x, h / 2 - 46, b, { fontFamily: FONT, fontSize: '22px', fontStyle: '700', color: '#fff' }).setOrigin(0.5);
      const zone = scene.add.zone(x, h / 2 - 46, bw, 48).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => paint(i));
      zone.on('pointerdown', () => done(i));
      objs.push(bg, bt, zone);
      return { bg, x };
    });
    const paint = (s: number) => {
      sel = s;
      btns.forEach(({ bg, x }, i) => {
        bg.clear();
        bg.fillStyle(0x2b1d14).fillRoundedRect(x - bw / 2 - 3, h / 2 - 73, bw + 6, 54, 12);
        bg.fillStyle(i === s ? 0xd9572b : 0x8a6a4a).fillRoundedRect(x - bw / 2, h / 2 - 70, bw, 48, 10);
      });
    };
    paint(0);
    const c = scene.add.container(GAME_W / 2, GAME_H / 2, objs).setScrollFactor(0).setDepth(10_001).setScale(0.7).setAlpha(0);
    scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 320, ease: 'Back.out' });
    const kb = scene.input.keyboard!;
    const left = () => paint((sel + buttons.length - 1) % buttons.length);
    const right = () => paint((sel + 1) % buttons.length);
    const enter = () => done(sel);
    kb.on('keydown-LEFT', left).on('keydown-RIGHT', right).on('keydown-ENTER', enter).on('keydown-E', enter).on('keydown-SPACE', enter);
    let fired = false;
    function done(i: number) {
      if (fired) return;
      fired = true;
      sfx('ui_confirm');
      kb.off('keydown-LEFT', left).off('keydown-RIGHT', right).off('keydown-ENTER', enter).off('keydown-E', enter).off('keydown-SPACE', enter);
      scene.tweens.add({
        targets: [c, dim],
        alpha: 0,
        duration: 200,
        onComplete: () => {
          c.destroy();
          dim.destroy();
          res(i);
        },
      });
    }
  });
}

/** Score/timer label in the corner, styled like the HUD. */
export function hudLabel(scene: Phaser.Scene, x: number, y: number, w = 200, originX = 0) {
  const g = drawPanel(scene.add.graphics().setScrollFactor(0).setDepth(9000), x - w * originX, y, w, 50, 12);
  const t = scene.add
    .text(x - w * originX + w / 2, y + 25, '', { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: COLORS.ink })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(9001);
  return { g, t };
}
