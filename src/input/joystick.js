// 浮動虛擬搖桿：手指（或滑鼠）在畫面任何地方按下，搖桿就出現在那裡，拖曳控制方向。
const MAX_DIST = 70;
const DEAD_ZONE = 0.15;
const FULL_SPEED_AT = 0.65;

export class Joystick {
  constructor(scene) {
    this.scene = scene;
    this.pointerId = null;
    this.ox = 0;
    this.oy = 0;
    this.vec = new Phaser.Math.Vector2();
    this.base = scene.add.image(0, 0, 'joy_base').setDepth(1000).setVisible(false).setAlpha(0.6);
    this.knob = scene.add.image(0, 0, 'joy_knob').setDepth(1001).setVisible(false).setAlpha(0.8);

    this.onDown = p => {
      if (this.pointerId !== null) return;
      this.pointerId = p.id;
      this.ox = p.x;
      this.oy = p.y;
      this.base.setPosition(p.x, p.y).setVisible(true);
      this.knob.setPosition(p.x, p.y).setVisible(true);
      this.vec.set(0, 0);
    };
    this.onMove = p => {
      if (p.id !== this.pointerId) return;
      let dx = p.x - this.ox;
      let dy = p.y - this.oy;
      const len = Math.hypot(dx, dy);
      if (len > MAX_DIST) {
        dx = dx / len * MAX_DIST;
        dy = dy / len * MAX_DIST;
      }
      this.knob.setPosition(this.ox + dx, this.oy + dy);
      const n = Math.min(len, MAX_DIST) / MAX_DIST;
      if (n < DEAD_ZONE || len === 0) {
        this.vec.set(0, 0);
        return;
      }
      const mag = Math.min(1, (n - DEAD_ZONE) / (FULL_SPEED_AT - DEAD_ZONE));
      this.vec.set(dx / len * mag, dy / len * mag);
    };
    this.onUp = p => {
      if (p.id === this.pointerId) this.reset();
    };

    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);
  }

  reset() {
    this.pointerId = null;
    this.vec.set(0, 0);
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  destroy() {
    const input = this.scene.input;
    input.off('pointerdown', this.onDown);
    input.off('pointermove', this.onMove);
    input.off('pointerup', this.onUp);
    input.off('pointerupoutside', this.onUp);
  }
}
