import { ENEMIES, pickEnemyType, enemyScale } from '../data/enemies.js';
import { weaponStats } from '../data/weapons.js';
import { RARITY, waveDuration, addMaterials, playerSpeed, armorReduction, INVULN_TIME, BASE_PICKUP, REGEN_PER_POINT, REVIVE_INVULN, REVIVE_CLEAR_RADIUS } from '../state.js';
import { Joystick } from '../input/joystick.js';
import { KeyboardMove } from '../input/keyboard.js';
import { makeArenaTexture } from '../art/pixel.js';

export const GAME_W = 1280;
export const GAME_H = 720;
const ARENA = new Phaser.Geom.Rectangle(40, 40, 1200, 640);
const WARN_TIME = 0.8;

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('arena');
  }

  init(data) {
    this.run = data.run;
    this.hooks = data.hooks;
  }

  create() {
    this.drawArena();
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H / 2, 'player', 0).setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(15, this.player.width / 2 - 15, this.player.height / 2 - 13);

    // 物件池：敵人、子彈、材料、警示都重複使用，不一直建立和銷毀
    this.enemies = this.physics.add.group({ maxSize: 220, classType: Phaser.Physics.Arcade.Sprite });
    this.bullets = this.physics.add.group({ maxSize: 400 });
    this.mats = this.add.group({ maxSize: 500 });
    this.warns = this.add.group({ maxSize: 120 });
    this.floats = [];
    for (let i = 0; i < 40; i++) {
      this.floats.push(this.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#1b1f3a', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(50).setActive(false).setVisible(false));
    }
    this.weaponSlots = [];

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerTouch, null, this);
    // 敵人之間互相推開，不會全部疊成一團
    this.physics.add.collider(this.enemies, this.enemies);

    this.keys = new KeyboardMove();
    this.joy = new Joystick(this);
    this.hint = this.add.text(GAME_W / 2, GAME_H - 80, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(60);

    this.events.once('shutdown', () => { this.joy.destroy(); this.keys.destroy(); });
    this.startWave();
  }

  drawArena() {
    // 只畫一次成貼圖：像素草地和石牆
    if (!this.textures.exists('arena')) makeArenaTexture(this, 'arena', GAME_W, GAME_H, ARENA);
    this.add.image(0, 0, 'arena').setOrigin(0);
  }

  // ---------- 波次流程 ----------

  startWave() {
    const run = this.run;
    run.hp = run.stats.maxHp;
    this.waveTime = waveDuration(run.wave);
    this.elapsed = 0;
    this.spawnAcc = 0.5;
    this.regenAcc = 0;
    this.invuln = 0;
    this.running = true;
    this.paused = false;
    this.player.setPosition(GAME_W / 2, GAME_H / 2).clearTint().setAlpha(1);
    this.player.body.reset(GAME_W / 2, GAME_H / 2);
    this.joy.reset();
    this.refreshWeapons();
    this.physics.resume();
    const buff = run.waveDamage ? `\n聽力題答對：這一波傷害 +${run.waveDamage}%` : '';
    this.hint.setText((run.wave === 1 ? '按住畫面拖曳，或用 WASD / 方向鍵移動\n武器會自動攻擊！' : `第 ${run.wave} 波`) + buff);
    this.hintTime = run.wave === 1 ? 4 : 1.5;
    this.hint.setVisible(true).setAlpha(1);
    this.pushHud();
  }

  nextWave() {
    this.run.wave += 1;
    this.startWave();
  }

  endWave() {
    this.running = false;
    this.run.waveDamage = 0;
    this.physics.pause();
    this.joy.reset();
    this.clearField();
    this.pushHud();
    this.hooks.onWaveEnd();
  }

  clearField() {
    let leftover = 0;
    this.mats.children.iterate(m => {
      if (m.active) {
        leftover += 1;
        m.setActive(false).setVisible(false);
      }
    });
    if (leftover) addMaterials(this.run, leftover);
    this.enemies.children.iterate(e => { if (e.active) e.disableBody(true, true); });
    this.bullets.children.iterate(b => { if (b.active) b.disableBody(true, true); });
    this.warns.children.iterate(w => { if (w.active) w.setActive(false).setVisible(false); });
    for (const f of this.floats) f.setActive(false).setVisible(false);
  }

  setPaused(p) {
    if (!this.running) return;
    this.paused = p;
    this.joy.reset();
    if (p) this.physics.pause();
    else this.physics.resume();
  }

  die() {
    this.running = false;
    this.physics.pause();
    this.joy.reset();
    this.player.stop().setFrame(0).setTint(0x555555);
    this.pushHud();
    this.time.delayedCall(900, () => this.hooks.onDeath());
  }

  // 答題接關：回血、清掉身邊的怪、短暫無敵，從倒下的地方繼續這一波
  revive(pct) {
    const run = this.run;
    run.hp = Math.max(1, Math.round(run.stats.maxHp * pct));
    const px = this.player.x;
    const py = this.player.y;
    const r2 = REVIVE_CLEAR_RADIUS * REVIVE_CLEAR_RADIUS;
    this.enemies.children.iterate(e => {
      if (e.active && (e.x - px) ** 2 + (e.y - py) ** 2 <= r2) e.disableBody(true, true);
    });
    this.invuln = REVIVE_INVULN;
    this.player.clearTint().setAlpha(1);
    this.joy.reset();
    this.running = true;
    this.paused = false;
    this.physics.resume();
    this.cameras.main.flash(250, 255, 255, 255);
    this.showFloat(px, py - 40, '接關！', '#7dff9a');
    this.pushHud();
  }

  refreshWeapons() {
    for (const s of this.weaponSlots) s.spr.destroy();
    this.weaponSlots = this.run.weapons.map(w => {
      // 每波開始聽力題答對的額外傷害，只算這一波
      const stats = { ...this.run.stats, damage: this.run.stats.damage + this.run.waveDamage };
      const st = weaponStats(w, stats);
      return {
        st,
        cd: Math.random() * st.cooldown,
        spr: this.add.image(0, 0, st.tex).setTint(RARITY[w.tier].color).setDepth(11),
      };
    });
  }

  // ---------- 每幀更新 ----------

  update(time, deltaMs) {
    if (!this.running || this.paused) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    const run = this.run;

    this.elapsed += dt;
    this.updatePlayer(dt);
    this.updateSpawns(dt);
    this.updateEnemies(dt);
    this.updateWeapons(dt);
    this.updateBullets(dt);
    this.updateMats(dt);
    this.updateFloats(dt);

    if (this.hintTime > 0) {
      this.hintTime -= dt;
      if (this.hintTime < 0.5) this.hint.setAlpha(Math.max(0, this.hintTime / 0.5));
      if (this.hintTime <= 0) this.hint.setVisible(false);
    }

    if (run.hp <= 0) {
      this.die();
      return;
    }
    this.pushHud();
    if (this.elapsed >= this.waveTime) this.endWave();
  }

  updatePlayer(dt) {
    const k = this.keys.read();
    let mx = k.x;
    let my = k.y;
    if (!mx && !my) {
      mx = this.joy.vec.x;
      my = this.joy.vec.y;
    }
    const sp = playerSpeed(this.run.stats);
    this.player.setVelocity(mx * sp, my * sp);
    if (mx) this.player.setFlipX(mx < 0);
    if (mx || my) this.player.play('a_player', true);
    else this.player.stop().setFrame(0);

    const run = this.run;
    if (run.stats.regen > 0 && run.hp < run.stats.maxHp) {
      run.hp = Math.min(run.stats.maxHp, run.hp + run.stats.regen * REGEN_PER_POINT * dt);
    }
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.player.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 20) % 2 ? 0.4 : 1);
    }
  }

  updateSpawns(dt) {
    const wave = this.run.wave;
    // 最後 1 秒不再出怪
    if (this.elapsed < this.waveTime - 1) {
      this.spawnAcc += dt;
      const interval = Math.max(0.4, 1.6 - wave * 0.12);
      if (this.spawnAcc >= interval) {
        this.spawnAcc -= interval;
        this.queueSpawnGroup();
      }
    }
    this.warns.children.iterate(w => {
      if (!w.active) return;
      w.t -= dt;
      w.setAlpha(Math.floor(w.t * 10) % 2 ? 1 : 0.4);
      if (w.t <= 0) {
        w.setActive(false).setVisible(false);
        this.spawnEnemy(w.etype, w.x, w.y);
      }
    });
  }

  queueSpawnGroup() {
    const wave = this.run.wave;
    const cap = Math.min(200, 40 + wave * 16);
    const pending = this.warns.countActive(true);
    if (this.enemies.countActive(true) + pending >= cap) return;

    // 找一個離玩家夠遠的點
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < 12; i++) {
      cx = Phaser.Math.Between(ARENA.x + 60, ARENA.right - 60);
      cy = Phaser.Math.Between(ARENA.y + 60, ARENA.bottom - 60);
      if (Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) > 320) break;
    }
    const n = 1 + Math.floor(wave / 3) + Math.floor(this.elapsed / 20) + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const w = this.warns.get(cx + Phaser.Math.Between(-50, 50), cy + Phaser.Math.Between(-50, 50), 'warn');
      if (!w) return;
      w.setActive(true).setVisible(true).setDepth(2);
      w.t = WARN_TIME;
      w.etype = pickEnemyType(wave);
    }
  }

  spawnEnemy(type, x, y) {
    const def = ENEMIES[type];
    const e = this.enemies.get(x, y, 'e_' + type);
    if (!e) return;
    const sc = enemyScale(this.run.wave);
    e.enableBody(true, x, y, true, true);
    e.setTexture('e_' + type, 0).setDepth(5).clearTint();
    e.play('a_' + type);
    e.anims.setProgress(Math.random());
    e.body.setCircle(def.r, e.width / 2 - def.r, e.height / 2 - def.r);
    e.setCollideWorldBounds(true);
    e.hp = Math.round(def.hp * sc.hp);
    e.dmg = def.dmg + sc.dmg;
    e.speed = def.speed * sc.speed;
    e.drop = def.drop;
    e.flash = 0;
  }

  updateEnemies(dt) {
    const p = this.player;
    this.enemies.children.iterate(e => {
      if (!e.active) return;
      this.physics.moveToObject(e, p, e.speed);
      e.setFlipX(e.x > p.x);
      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash <= 0) e.clearTint();
      }
    });
  }

  updateWeapons(dt) {
    const n = this.weaponSlots.length;
    const px = this.player.x;
    const py = this.player.y;
    this.weaponSlots.forEach((slot, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      // 武器越多圈越大；貼牆時把武器夾回場內，不然子彈一射出就在場外被清掉
      const r = n === 1 ? 26 : 30 + 4 * n;
      slot.spr.setPosition(
        Phaser.Math.Clamp(px + Math.cos(a) * r, ARENA.x + 4, ARENA.right - 4),
        Phaser.Math.Clamp(py + Math.sin(a) * r, ARENA.y + 4, ARENA.bottom - 4),
      );
      slot.cd -= dt;
      if (slot.cd > 0) return;
      const target = this.nearestEnemy(slot.spr.x, slot.spr.y, slot.st.range);
      if (!target) return;
      slot.cd = slot.st.cooldown;
      this.fire(slot, target);
    });
  }

  nearestEnemy(x, y, range) {
    let best = null;
    let bestD = range * range;
    this.enemies.children.iterate(e => {
      if (!e.active) return;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    });
    return best;
  }

  fire(slot, target) {
    const st = slot.st;
    const sx = slot.spr.x;
    const sy = slot.spr.y;
    const ang = Phaser.Math.Angle.Between(sx, sy, target.x, target.y);
    slot.spr.setRotation(ang).setFlipY(Math.abs(ang) > Math.PI / 2);
    for (let i = 0; i < st.pellets; i++) {
      const spread = st.pellets > 1 ? (i / (st.pellets - 1) - 0.5) * st.spread : 0;
      const a = ang + spread + Phaser.Math.FloatBetween(-0.04, 0.04);
      const b = this.bullets.get(sx, sy, st.bulletTex);
      if (!b) return;
      b.enableBody(true, sx, sy, true, true);
      b.setTexture(st.bulletTex).setRotation(a).setTint(st.color).setDepth(8);
      b.body.setCircle(5, b.width / 2 - 5, b.height / 2 - 5);
      this.physics.velocityFromRotation(a, st.bulletSpeed, b.body.velocity);
      b.dmg = st.damage;
      b.pierce = st.pierce;
      b.knockback = st.knockback;
      b.blast = st.blast;
      b.color = st.color;
      b.life = st.range / st.bulletSpeed * 1.15;
      if (!b.hits) b.hits = new Set();
      b.hits.clear();
    }
  }

  updateBullets(dt) {
    this.bullets.children.iterate(b => {
      if (!b.active) return;
      b.life -= dt;
      if (b.life <= 0 || !ARENA.contains(b.x, b.y)) b.disableBody(true, true);
    });
  }

  onBulletHit(b, e) {
    if (!b.active || !e.active || b.hits.has(e)) return;
    if (b.blast > 0) {
      this.explode(b.x, b.y, b.blast, b.dmg, b.knockback, b.color);
      b.disableBody(true, true);
      return;
    }
    b.hits.add(e);
    e.hp -= b.dmg;
    e.setTintFill(0xffffff);
    e.flash = 0.06;
    const kb = b.knockback;
    const a = Math.atan2(b.body.velocity.y, b.body.velocity.x);
    e.x += Math.cos(a) * kb;
    e.y += Math.sin(a) * kb;
    this.showFloat(e.x, e.y - 18, String(b.dmg), '#ffffff');
    if (e.hp <= 0) this.killEnemy(e);
    b.pierce -= 1;
    if (b.pierce < 0) b.disableBody(true, true);
  }

  // 火箭爆炸：半徑內每隻敵人都吃滿傷害，並從爆炸中心往外推
  explode(x, y, radius, dmg, kb, color) {
    const fx = this.add.image(x, y, 'boom').setTint(color).setDepth(9)
      .setScale(radius / 64 * 0.4).setAlpha(0.9);
    this.tweens.add({ targets: fx, scale: radius / 64, alpha: 0, duration: 260, onComplete: () => fx.destroy() });
    this.cameras.main.shake(80, 0.003);
    const hit = [];
    this.enemies.children.iterate(e => {
      if (!e.active) return;
      const dx = e.x - x;
      const dy = e.y - y;
      // 敵人身體碰到爆炸圈就算
      const reach = radius + e.body.halfWidth;
      if (dx * dx + dy * dy <= reach * reach) hit.push(e);
    });
    for (const e of hit) {
      e.hp -= dmg;
      e.setTintFill(0xffffff);
      e.flash = 0.06;
      const a = Math.atan2(e.y - y, e.x - x);
      e.x += Math.cos(a) * kb;
      e.y += Math.sin(a) * kb;
      this.showFloat(e.x, e.y - 18, String(dmg), '#ffb84d');
      if (e.hp <= 0) this.killEnemy(e);
    }
  }

  killEnemy(e) {
    const { x, y, drop } = e;
    e.disableBody(true, true);
    for (let i = 0; i < drop; i++) {
      const m = this.mats.get(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12), 'mat');
      if (!m) break;
      m.setActive(true).setVisible(true).setDepth(3);
      m.homing = false;
    }
  }

  onPlayerTouch(p, e) {
    if (this.invuln > 0 || !e.active || !this.running) return;
    const dmg = e.dmg * (1 - armorReduction(this.run.stats.armor));
    this.run.hp -= dmg;
    this.invuln = INVULN_TIME;
    this.cameras.main.shake(120, 0.006);
    this.showFloat(p.x, p.y - 30, `-${Math.round(dmg * 10) / 10}`, '#ff6b6b');
  }

  updateMats(dt) {
    const range = BASE_PICKUP + this.run.stats.pickup;
    const r2 = range * range;
    const px = this.player.x;
    const py = this.player.y;
    let got = 0;
    this.mats.children.iterate(m => {
      if (!m.active) return;
      const dx = px - m.x;
      const dy = py - m.y;
      const d2 = dx * dx + dy * dy;
      if (!m.homing && d2 > r2) return;
      m.homing = true;
      const d = Math.sqrt(d2) || 1;
      if (d < 22) {
        m.setActive(false).setVisible(false);
        got += 1;
        return;
      }
      // 被吸過來的材料要比玩家跑得快，才追得上
      const s = Math.min(d, 900 * dt);
      m.x += dx / d * s;
      m.y += dy / d * s;
    });
    if (got && addMaterials(this.run, got) > 0) {
      this.showFloat(px, py - 44, 'LEVEL UP!', '#ffd84d', 1.2);
    }
  }

  showFloat(x, y, text, color, life = 0.5) {
    const f = this.floats.find(t => !t.active);
    if (!f) return;
    f.setText(text).setColor(color).setPosition(x, y).setAlpha(1).setActive(true).setVisible(true);
    f.life = life;
    f.maxLife = life;
  }

  updateFloats(dt) {
    for (const f of this.floats) {
      if (!f.active) continue;
      f.life -= dt;
      f.y -= 50 * dt;
      f.setAlpha(Math.max(0, f.life / f.maxLife));
      if (f.life <= 0) f.setActive(false).setVisible(false);
    }
  }

  pushHud() {
    this.hooks.onHud(Math.max(0, Math.ceil(this.waveTime - this.elapsed)));
  }
}
