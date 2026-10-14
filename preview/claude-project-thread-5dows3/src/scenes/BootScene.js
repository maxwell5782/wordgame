import { ENEMIES } from '../data/enemies.js';
import { SPRITES, makePixelTexture } from '../art/pixel.js';

// 用程式畫出所有圖形，不需要任何圖片檔。
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // 角色、敵人、子彈、材料、武器：原創像素圖（src/art/pixel.js）
    for (const [key, def] of Object.entries(SPRITES)) makePixelTexture(this, key, def);
    this.anims.create({ key: 'a_player', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    for (const key of Object.keys(ENEMIES)) {
      this.anims.create({
        key: 'a_' + key,
        frames: this.anims.generateFrameNumbers('e_' + key, { start: 0, end: 1 }),
        frameRate: key === 'tank' ? 3 : key === 'runner' ? 8 : 4,
        repeat: -1,
      });
    }

    // 爆炸（白色，遊戲中縮放到爆炸半徑並上色）
    g.fillStyle(0xffffff, 0.35).fillCircle(64, 64, 64);
    g.lineStyle(6, 0xffffff, 0.9).strokeCircle(64, 64, 61);
    g.generateTexture('boom', 128, 128);
    g.clear();

    // 出怪警示
    g.lineStyle(5, 0xff4d5e).lineBetween(4, 4, 24, 24).lineBetween(24, 4, 4, 24);
    g.generateTexture('warn', 28, 28);
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
