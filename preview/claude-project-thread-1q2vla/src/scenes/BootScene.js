import { ENEMIES } from '../data/enemies.js';
import { SPRITES, makePixelTexture, makePixelDisc } from '../art/pixel.js';

// 用程式畫出所有圖形（像素風，見 src/art/pixel.js），不需要任何圖片檔。
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
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
    makePixelDisc(this, 'boom', 128, ['#ffffff', 0.35], ['#ffffff', 0.9], 2);

    // 搖桿
    makePixelDisc(this, 'joy_base', 144, ['#ffffff', 0.15], ['#ffffff', 0.55], 2);
    makePixelDisc(this, 'joy_knob', 64, ['#ffffff', 0.85], ['#1b1f3a', 0.5], 1);

    this.game.events.emit('boot-ready');
  }
}
