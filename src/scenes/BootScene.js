import { ENEMIES } from '../data/enemies.js';

// 用程式畫出所有圖形，不需要任何圖片檔。
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // 玩家
    g.fillStyle(0x5ab0ff).fillCircle(20, 20, 17);
    g.lineStyle(3, 0xffffff).strokeCircle(20, 20, 17);
    g.fillStyle(0xffffff).fillCircle(14, 17, 5).fillCircle(26, 17, 5);
    g.fillStyle(0x1b1f3a).fillCircle(15, 18, 2.5).fillCircle(27, 18, 2.5);
    g.generateTexture('player', 40, 40);
    g.clear();

    // 敵人
    for (const [key, d] of Object.entries(ENEMIES)) {
      const s = (d.r + 3) * 2;
      const c = s / 2;
      g.fillStyle(d.color).fillCircle(c, c, d.r);
      g.lineStyle(2, 0x1b1f3a, 0.6).strokeCircle(c, c, d.r);
      const ex = d.r * 0.38;
      const er = Math.max(2.5, d.r * 0.22);
      g.fillStyle(0xffffff).fillCircle(c - ex, c - d.r * 0.15, er).fillCircle(c + ex, c - d.r * 0.15, er);
      g.fillStyle(0x1b1f3a).fillCircle(c - ex, c - d.r * 0.1, er * 0.5).fillCircle(c + ex, c - d.r * 0.1, er * 0.5);
      g.generateTexture('e_' + key, s, s);
      g.clear();
    }

    // 子彈
    g.fillStyle(0xffffff).fillCircle(6, 6, 5);
    g.generateTexture('bullet', 12, 12);
    g.clear();
    g.fillStyle(0xffffff).fillTriangle(0, 0, 22, 4, 0, 8);
    g.generateTexture('blade', 22, 8);
    g.clear();

    // 材料
    g.fillStyle(0x4ef0a0).fillPoints([{ x: 7, y: 0 }, { x: 14, y: 7 }, { x: 7, y: 14 }, { x: 0, y: 7 }], true);
    g.lineStyle(2, 0xffffff, 0.8).strokePoints([{ x: 7, y: 1 }, { x: 13, y: 7 }, { x: 7, y: 13 }, { x: 1, y: 7 }], true);
    g.generateTexture('mat', 14, 14);
    g.clear();

    // 出怪警示
    g.lineStyle(5, 0xff4d5e).lineBetween(4, 4, 24, 24).lineBetween(24, 4, 4, 24);
    g.generateTexture('warn', 28, 28);
    g.clear();

    // 武器（白色，遊戲中依稀有度上色）
    g.fillStyle(0xffffff).fillRect(0, 2, 22, 7).fillRect(2, 7, 6, 6);
    g.generateTexture('w_pistol', 22, 13);
    g.clear();
    g.fillStyle(0xffffff).fillRect(0, 2, 28, 8).fillRect(0, 8, 8, 6);
    g.generateTexture('w_shotgun', 28, 14);
    g.clear();
    g.fillStyle(0xffffff).fillTriangle(6, 0, 24, 5, 6, 10).fillRect(0, 3, 7, 4);
    g.generateTexture('w_knife', 24, 10);
    g.clear();

    // 搖桿
    g.fillStyle(0xffffff, 0.15).fillCircle(72, 72, 70);
    g.lineStyle(4, 0xffffff, 0.5).strokeCircle(72, 72, 68);
    g.generateTexture('joy_base', 144, 144);
    g.clear();
    g.fillStyle(0xffffff, 0.85).fillCircle(32, 32, 30);
    g.generateTexture('joy_knob', 64, 64);
    g.destroy();

    this.game.events.emit('boot-ready');
  }
}
