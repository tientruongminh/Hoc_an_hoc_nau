import Phaser from 'phaser';
import { COLORS, FONT, GAME_H, GAME_W } from '../config';
import { ENDINGS, ENDING_ORDER } from '../data/endings';
import { G, type EndingId } from '../state/GameState';
import { ambient, music, sfx } from '../systems/Audio';
import { resultCard } from '../ui/MinigameKit';
import { ui } from './UIScene';

/** Full-screen CG + ending title, then retry-from-checkpoint or title. */
export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  async create(data: { id: EndingId }) {
    const e = ENDINGS[data.id];
    const u = ui(this);
    u.hudVisible(false);
    u.quest(null);
    G.unlockEnding(data.id);
    ambient(null);
    music(e.music, { loop: false, fadeMs: 300, volume: 0.8 });

    const img = this.add.image(GAME_W / 2, GAME_H / 2, e.cg).setScale(2.1);
    this.tweens.add({ targets: img, scale: 2.25, duration: 12000, ease: 'Sine.out' });
    const shade = this.add.graphics();
    for (let i = 0; i < 30; i++) shade.fillStyle(0x0b0705, (i / 30) * 0.9).fillRect(0, GAME_H - 300 + i * 10, GAME_W, 10);
    await u.fadeIn(900);
    if (!e.good) this.cameras.main.shake(300, 0.004);

    const tag = this.add
      .text(GAME_W / 2, GAME_H - 190, e.good ? 'KẾT CỤC TỐT' : 'KẾT CỤC', { fontFamily: FONT, fontSize: '22px', fontStyle: '800', color: e.good ? COLORS.gold : '#e58a6a' })
      .setOrigin(0.5)
      .setAlpha(0);
    const title = this.add
      .text(GAME_W / 2, GAME_H - 142, e.title, { fontFamily: FONT, fontSize: '50px', fontStyle: '800', color: COLORS.paper, stroke: COLORS.ink, strokeThickness: 8 })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(1.3);
    const text = this.add
      .text(GAME_W / 2, GAME_H - 80, e.text, { fontFamily: FONT, fontSize: '22px', color: '#e8d2a6', align: 'center', wordWrap: { width: 980 } })
      .setOrigin(0.5)
      .setAlpha(0);
    sfx(e.good ? 'success_jingle' : 'fail_sting');
    this.tweens.add({ targets: tag, alpha: 1, duration: 400, delay: 200 });
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 500, delay: 400, ease: 'Back.out' });
    this.tweens.add({ targets: text, alpha: 1, duration: 600, delay: 900 });
    await new Promise((r) => this.time.delayedCall(2600, r));
    // let the player read the ending before the card covers it
    const hint = this.add
      .text(GAME_W - 24, GAME_H - 18, 'Nhấn phím bất kỳ ▸', { fontFamily: FONT, fontSize: '18px', color: '#e8d2a6' })
      .setOrigin(1, 1)
      .setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 0.85, duration: 500, yoyo: true, repeat: -1, hold: 400 });
    await new Promise<void>((r) => {
      this.input.keyboard?.once('keydown', () => r());
      this.input.once('pointerdown', () => r());
    });
    hint.destroy();
    this.tweens.add({ targets: [tag, title, text], alpha: 0, duration: 300 });

    const got = G.endings().length;
    const buttons = e.good || data.id === 'hospital' ? ['Màn hình chính'] : ['Thử lại', 'Màn hình chính'];
    const lines = [`Đã mở ${got}/${ENDING_ORDER.length} kết cục`];
    if (data.id === 'good' || data.id === 'hospital') lines.push('— Hết chương 1 —');
    const pick = await resultCard(this, e.good ? 'Chúc mừng!' : 'Ôi không…', lines, buttons);
    await u.fadeOut(600);
    music(null);
    if (buttons[pick] === 'Thử lại') {
      const r = G.load(data.id === 'robbed' ? '.doors' : '');
      this.scene.start(r.scene, r.data);
    } else this.scene.start('Title');
  }
}
