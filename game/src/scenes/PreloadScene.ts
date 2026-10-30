import Phaser from 'phaser';
import { CGS, PORTRAITS, PROPS, SHEETS, TILES } from '../data/assetIndex';
import { MUSIC_KEYS, SFX_KEYS, audioPath } from '../data/audioManifest';
import { G, type Stage } from '../state/GameState';
import { COLORS, FONT, GAME_H, GAME_W, hex } from '../config';

/** Character sheets: 3x3 grid flattened — row 0 front, 1 side (faces right), 2 back. */
const NON_CHARACTER = new Set(['ch_goose', 'ch_bike', 'wok_states']);

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const barW = 420;
    const x = (GAME_W - barW) / 2;
    const y = GAME_H / 2 + 30;
    this.add
      .text(GAME_W / 2, GAME_H / 2 - 30, 'Đang nhóm bếp…', { fontFamily: FONT, fontSize: '28px', color: COLORS.paper })
      .setOrigin(0.5);
    this.add.rectangle(x - 4, y - 4, barW + 8, 22, hex(COLORS.paper)).setOrigin(0);
    this.add.rectangle(x, y, barW, 14, hex(COLORS.ink)).setOrigin(0);
    const bar = this.add.rectangle(x, y, 1, 14, hex(COLORS.accent)).setOrigin(0);
    this.load.on('progress', (p: number) => (bar.width = Math.max(1, barW * p)));

    this.load.setPath('assets/');
    for (const [k, [fw, fh]] of Object.entries(SHEETS)) {
      this.load.spritesheet(k, `sprites/${k}.png`, { frameWidth: fw, frameHeight: fh });
    }
    TILES.forEach((k) => this.load.image(k, `tiles/${k}.png`));
    PROPS.forEach((k) => this.load.image(k, `props/${k}.png`));
    PORTRAITS.forEach((k) => this.load.image(k, `portraits/${k}.png`));
    CGS.forEach((k) => this.load.image(k, `cg/${k}.png`));
    this.load.setPath('');
    [...SFX_KEYS, ...MUSIC_KEYS].forEach((k) => this.load.audio(k, audioPath(k)));
  }

  create() {
    for (const k of Object.keys(SHEETS)) {
      if (NON_CHARACTER.has(k)) continue;
      const dirs: [string, number][] = [
        ['down', 0],
        ['side', 3],
        ['up', 6],
      ];
      for (const [dir, base] of dirs) {
        this.anims.create({
          key: `${k}:walk-${dir}`,
          frames: this.anims.generateFrameNumbers(k, { frames: [base, base + 1, base + 2, base + 1] }),
          frameRate: 8,
          repeat: -1,
        });
        this.anims.create({ key: `${k}:idle-${dir}`, frames: [{ key: k, frame: base + 1 }] });
      }
    }
    // goose: row 0 waddle, row 1 bite, row 2 wing-flap charge
    this.anims.create({ key: 'goose:walk', frames: this.anims.generateFrameNumbers('ch_goose', { frames: [0, 1, 2, 1] }), frameRate: 7, repeat: -1 });
    this.anims.create({ key: 'goose:bite', frames: this.anims.generateFrameNumbers('ch_goose', { start: 3, end: 5 }), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'goose:run', frames: this.anims.generateFrameNumbers('ch_goose', { frames: [6, 7, 8, 7] }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'bike:ride', frames: this.anims.generateFrameNumbers('ch_bike', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });

    this.scene.launch('UI');
    // Dev shortcuts: ?scene=Goose  |  ?map=kitchen&spawn=center&stage=clean
    const q = new URLSearchParams(location.search);
    const sc = q.get('scene');
    const map = q.get('map');
    if (sc) this.scene.start(sc, Object.fromEntries(q));
    else if (map) {
      const st = q.get('stage');
      if (st) G.d.stage = st as Stage;
      this.scene.start('World', { map, spawn: q.get('spawn') ?? 'center' });
    } else this.scene.start('Title');
  }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create() {
    // Phaser text is drawn to canvas, so web fonts must be ready before first use.
    const want = ['400', '600', '700', '800'].map((w) => document.fonts.load(`${w} 20px "Be Vietnam Pro"`, 'Học Ăn Nấu ữ'));
    Promise.all(want)
      .catch(() => undefined)
      .then(() => this.scene.start('Preload'));
  }
}
