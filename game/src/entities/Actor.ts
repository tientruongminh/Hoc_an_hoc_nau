import Phaser from 'phaser';

export type Facing = 'down' | 'up' | 'left' | 'right';

/**
 * A character sprite built from a 3x3 sheet (front / side / back rows).
 * Origin sits at the feet so y doubles as the y-sort key.
 */
export class Actor extends Phaser.Physics.Arcade.Sprite {
  facing: Facing = 'down';
  sheet: string;
  private shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, sheet: string, physics = false) {
    super(scene, x, y, sheet, 1);
    this.sheet = sheet;
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.shadow = scene.add.ellipse(x, y - 1, this.width * 0.7, 5, 0x000000, 0.28);
    if (physics) {
      scene.physics.add.existing(this);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(12, 6).setOffset((this.width - 12) / 2, this.height - 7);
      body.setCollideWorldBounds(true);
    }
    this.idle();
  }

  preUpdate(t: number, dt: number) {
    super.preUpdate(t, dt);
    this.shadow.setPosition(this.x, this.y - 1).setVisible(this.visible).setAlpha(this.alpha);
    this.setDepth(10 + this.y);
    this.shadow.setDepth(9 + this.y);
  }

  face(dir: Facing) {
    this.facing = dir;
    this.idle();
    return this;
  }

  private animKey(kind: 'walk' | 'idle') {
    const row = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    this.setFlipX(this.facing === 'left');
    return `${this.sheet}:${kind}-${row}`;
  }

  walk(dir?: Facing, rate = 1) {
    if (dir) this.facing = dir;
    const key = this.animKey('walk');
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
    this.anims.timeScale = rate;
  }

  idle() {
    this.play(this.animKey('idle'), true);
  }

  /** Tween to a point (cutscenes). Picks the facing from the dominant axis. */
  walkTo(x: number, y: number, speed = 55): Promise<void> {
    return new Promise((res) => {
      const dx = x - this.x;
      const dy = y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) return res();
      this.walk(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      this.scene.tweens.add({
        targets: this,
        x,
        y,
        duration: (dist / speed) * 1000,
        onComplete: () => {
          this.idle();
          res();
        },
      });
    });
  }

  /** Walk a polyline. */
  async path(points: [number, number][], speed = 55) {
    for (const [x, y] of points) await this.walkTo(x, y, speed);
  }

  /** Little hop used for surprise / joy. */
  hop(h = 6) {
    this.scene.tweens.add({ targets: this, y: this.y - h, yoyo: true, duration: 120, ease: 'Quad.out' });
  }

  /** Speech-bubble emote (!, ?, ♥, …) above the head. */
  emote(sym: string, ms = 1100) {
    const t = this.scene.add
      .text(this.x, this.y - this.height - 4, sym, {
        fontFamily: '"Be Vietnam Pro"',
        fontSize: '36px',
        fontStyle: '800',
        color: '#2b1d14',
        backgroundColor: '#f6e7c8',
        padding: { x: 10, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setScale(0)
      .setDepth(9000);
    this.scene.tweens.add({ targets: t, scale: 1 / 3, duration: 220, ease: 'Back.out' });
    this.scene.tweens.add({ targets: t, alpha: 0, y: t.y - 6, delay: ms, duration: 250, onComplete: () => t.destroy() });
  }

  destroy(fromScene?: boolean) {
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
