import { ENEMIES, pickEnemyType, enemyScale } from '../data/enemies.js';
import { weaponStats } from '../data/weapons.js';
import { RARITY, waveDuration, addMaterials, playerSpeed, armorReduction, INVULN_TIME, BASE_PICKUP, REGEN_PER_POINT, REVIVE_INVULN, REVIVE_CLEAR_RADIUS } from '../state.js';
import { Joystick } from '../input/joystick.js';
import { KeyboardMove } from '../input/keyboard.js';
import { makeArenaTexture } from '../art/pixel.js';
import { BOSSES, bossForWave, BOSS_ENRAGE_TIME, BOSS_ENRAGE_SPEED, BOSS_ENRAGE_CD, BOSS_WAVE_SPAWN_SLOW, BOSS_WAVE_ENEMY_CAP } from '../data/bosses.js';
import { markGearSeen } from '../progress.js';
import { sfx, playMusic, stopMusic } from '../audio.js';

export const GAME_W = 1280;
export const GAME_H = 720;
const ARENA = new Phaser.Geom.Rectangle(40, 40, 1200, 640);
const WARN_TIME = 0.8;
// 魔王波開始後幾秒魔王登場；打倒魔王後幾秒結束這一波
const BOSS_ENTER_TIME = 1.5;
const BOSS_OUTRO_TIME = 2;

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
    // 魔王的子彈與招式警示（紅圈、紅線）
    this.ebullets = this.physics.add.group({ maxSize: 300 });
    this.hazards = [];
    this.hazardGfx = this.add.graphics().setDepth(2);
    this.boss = null;

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerTouch, null, this);
    this.physics.add.overlap(this.player, this.ebullets, this.onOrbHit, null, this);
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
    // 魔王波沒有時間限制，打倒魔王才結束
    this.bossId = bossForWave(run.wave);
    this.boss = null;
    this.bossEnterIn = this.bossId ? BOSS_ENTER_TIME : 0;
    this.bossOutro = 0;
    this.waveTime = this.bossId ? Infinity : waveDuration(run.wave);
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
    const title = this.bossId ? `⚠️ 魔王來了：${BOSSES[this.bossId].name}！\n打倒牠這一波才會結束`
      : run.wave === 1 ? '按住畫面拖曳，或用 WASD / 方向鍵移動\n武器會自動攻擊！' : `第 ${run.wave} 波`;
    this.hint.setText(title + buff);
    this.hintTime = run.wave === 1 || this.bossId ? 3 : 1.5;
    this.hint.setVisible(true).setAlpha(1);
    this.pushHud();
    playMusic(this.bossId ? 'boss' : 'battle');
    sfx(this.bossId ? 'bossWarn' : 'wave');
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
    this.clearBossAttacks();
  }

  clearBossAttacks() {
    this.ebullets.children.iterate(o => { if (o.active) o.disableBody(true, true); });
    this.hazards.length = 0;
    this.hazardGfx.clear();
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
    stopMusic();
    sfx('death');
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
      if (e.active && !e.boss && (e.x - px) ** 2 + (e.y - py) ** 2 <= r2) e.disableBody(true, true);
    });
    this.clearBossAttacks();
    this.invuln = REVIVE_INVULN;
    this.player.clearTint().setAlpha(1);
    this.joy.reset();
    this.running = true;
    this.paused = false;
    this.physics.resume();
    this.cameras.main.flash(250, 255, 255, 255);
    sfx('revive');
    playMusic(this.bossId ? 'boss' : 'battle');
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
        id: w.id,
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
    this.updateBoss(dt);
    this.updateHazards(dt);
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
    if (this.bossOutro > 0) {
      this.bossOutro -= dt;
      if (this.bossOutro <= 0) this.endWave();
    }
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
    // 最後 1 秒、打倒魔王之後不再出怪
    if (this.elapsed < this.waveTime - 1 && this.bossOutro <= 0) {
      this.spawnAcc += dt;
      const interval = Math.max(0.4, 1.6 - wave * 0.12) * (this.bossId ? BOSS_WAVE_SPAWN_SLOW : 1);
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
    const cap = Math.min(200, 40 + wave * 16) * (this.bossId ? BOSS_WAVE_ENEMY_CAP : 1);
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
    // 物件池裡的這隻可能之前當過魔王
    e.boss = false;
    e.body.setImmovable(false);
  }

  updateEnemies(dt) {
    const p = this.player;
    this.enemies.children.iterate(e => {
      if (!e.active) return;
      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash <= 0) e.clearTint();
      }
      if (e.boss) return;
      this.physics.moveToObject(e, p, e.speed);
      e.setFlipX(e.x > p.x);
    });
  }

  // ---------- 魔王 ----------

  spawnBoss() {
    const def = BOSSES[this.bossId];
    // 從離玩家比較遠的那一側登場
    const x = GAME_W / 2;
    const y = this.player.y > GAME_H / 2 ? ARENA.y + def.r + 20 : ARENA.bottom - def.r - 20;
    const b = this.enemies.get(x, y, def.tex);
    if (!b) return;
    b.enableBody(true, x, y, true, true);
    b.setTexture(def.tex, 0).setDepth(6).clearTint();
    b.play('a_' + this.bossId);
    b.body.setCircle(def.r, b.width / 2 - def.r, b.height / 2 - def.r);
    b.body.setImmovable(true);
    b.setCollideWorldBounds(true);
    Object.assign(b, {
      boss: true, def, hp: def.hp, dmg: def.dmg, speed: def.speed, drop: def.drop, flash: 0,
      age: 0, cd: def.cooldown, next: 0, act: null, enraged: false,
    });
    this.boss = b;
    markGearSeen('boss', this.bossId);
    this.cameras.main.shake(400, 0.01);
    this.showFloat(x, y - def.r - 20, `${def.icon} ${def.name}`, '#ffd84d', 1.5);
  }

  updateBoss(dt) {
    if (this.bossEnterIn > 0) {
      this.bossEnterIn -= dt;
      if (this.bossEnterIn <= 0) this.spawnBoss();
      return;
    }
    const b = this.boss;
    if (!b || !b.active) return;
    b.age += dt;
    if (!b.enraged && b.age >= BOSS_ENRAGE_TIME) {
      b.enraged = true;
      this.cameras.main.shake(300, 0.008);
      this.showFloat(b.x, b.y - b.def.r - 20, '🔥 狂暴！', '#ff6b6b', 1.5);
    }
    if (b.enraged && b.flash <= 0) b.setTint(0xff8a8a);
    if (b.act) {
      this.runBossAction(b, dt);
      return;
    }
    this.physics.moveToObject(b, this.player, b.speed * (b.enraged ? BOSS_ENRAGE_SPEED : 1));
    b.setFlipX(b.x > this.player.x);
    b.cd -= dt;
    if (b.cd <= 0) {
      const atks = b.def.attacks;
      this.startBossAttack(b, atks[b.next % atks.length]);
      b.next += 1;
    }
  }

  endBossAction(b, rest = 0) {
    b.act = null;
    b.cd = b.def.cooldown * (b.enraged ? BOSS_ENRAGE_CD : 1) + rest;
  }

  startBossAttack(b, a) {
    b.setVelocity(0, 0);
    this.showFloat(b.x, b.y - b.def.r - 20, a.name + '！', '#ffd84d', 0.9);
    const p = this.player;
    const act = { a, t: 0, n: 0 };
    b.act = act;
    switch (a.type) {
      case 'slam': {
        // 鎖定玩家現在的位置，先蹲一下再跳過去
        act.sx = b.x;
        act.sy = b.y;
        act.tx = Phaser.Math.Clamp(p.x, ARENA.x + b.def.r, ARENA.right - b.def.r);
        act.ty = Phaser.Math.Clamp(p.y, ARENA.y + b.def.r, ARENA.bottom - b.def.r);
        this.addHazard({ type: 'circle', x: act.tx, y: act.ty, r: a.radius, t: a.warn, dmg: a.dmg });
        break;
      }
      case 'dash': {
        act.ang = Phaser.Math.Angle.Between(b.x, b.y, p.x, p.y);
        this.addHazard({ type: 'line', x: b.x, y: b.y, ang: act.ang, len: a.dist, w: b.def.r * 2, t: a.warn });
        break;
      }
      case 'meteor': {
        for (let i = 0; i < a.count; i++) {
          // 第一顆對準玩家，其他散在附近
          const ox = i === 0 ? 0 : Phaser.Math.Between(-200, 200);
          const oy = i === 0 ? 0 : Phaser.Math.Between(-200, 200);
          this.addHazard({
            type: 'circle', r: a.radius, t: a.warn + i * 0.15, dmg: a.dmg, boom: 0xff7a3a,
            x: Phaser.Math.Clamp(p.x + ox, ARENA.x + 20, ARENA.right - 20),
            y: Phaser.Math.Clamp(p.y + oy, ARENA.y + 20, ARENA.bottom - 20),
          });
        }
        break;
      }
      default:
        break;
    }
  }

  runBossAction(b, dt) {
    const act = b.act;
    const a = act.a;
    act.t += dt;
    switch (a.type) {
      case 'slam': {
        const jumpAt = a.warn * 0.5;
        if (act.t < jumpAt) return;
        if (act.t < a.warn) {
          // 跳在半空中：打不到、也撞不到
          if (b.body.enable) {
            b.body.enable = false;
            b.setDepth(12);
          }
          const k = (act.t - jumpAt) / (a.warn - jumpAt);
          b.x = act.sx + (act.tx - act.sx) * k;
          b.y = act.sy + (act.ty - act.sy) * k - Math.sin(k * Math.PI) * 140;
          return;
        }
        if (!b.body.enable) {
          b.body.enable = true;
          b.body.reset(act.tx, act.ty);
          b.setDepth(6);
          this.cameras.main.shake(200, 0.012);
          for (let i = 0; i < a.summon; i++) {
            const ang = (i / a.summon) * Math.PI * 2;
            this.spawnEnemy('slime',
              Phaser.Math.Clamp(act.tx + Math.cos(ang) * (b.def.r + 30), ARENA.x + 20, ARENA.right - 20),
              Phaser.Math.Clamp(act.ty + Math.sin(ang) * (b.def.r + 30), ARENA.y + 20, ARENA.bottom - 20));
          }
        }
        if (act.t >= a.warn + 0.4) this.endBossAction(b);
        return;
      }
      case 'ring': {
        const gap = 0.35;
        while (act.n < a.rounds && act.t >= act.n * gap) {
          const off = act.n * Math.PI / a.count;
          for (let i = 0; i < a.count; i++) {
            this.fireOrb(b.x, b.y, off + (i / a.count) * Math.PI * 2, a.speed, a.dmg, a.color);
          }
          act.n += 1;
        }
        if (act.t >= a.rounds * gap + 0.2) this.endBossAction(b);
        return;
      }
      case 'fan': {
        const gap = 0.25;
        while (act.n < a.bursts && act.t >= act.n * gap) {
          const base = Phaser.Math.Angle.Between(b.x, b.y, this.player.x, this.player.y);
          const spread = Phaser.Math.DegToRad(a.spread);
          for (let i = 0; i < a.count; i++) {
            const k = a.count > 1 ? i / (a.count - 1) - 0.5 : 0;
            this.fireOrb(b.x, b.y, base + k * spread, a.speed, a.dmg, a.color);
          }
          act.n += 1;
        }
        if (act.t >= a.bursts * gap + 0.2) this.endBossAction(b);
        return;
      }
      case 'dash': {
        const dashTime = a.dist / a.speed;
        if (act.t < a.warn) return;
        if (act.t < a.warn + dashTime) {
          if (!act.going) {
            act.going = true;
            b.dmg = a.dmg;
            this.physics.velocityFromRotation(act.ang, a.speed, b.body.velocity);
          }
          return;
        }
        b.setVelocity(0, 0);
        b.dmg = b.def.dmg;
        this.endBossAction(b, 0.3);
        return;
      }
      case 'meteor': {
        // 魔王站著施法，等隕石落完
        if (act.t >= a.warn + a.count * 0.15) this.endBossAction(b);
        return;
      }
      default:
        this.endBossAction(b);
    }
  }

  fireOrb(x, y, ang, speed, dmg, color) {
    const o = this.ebullets.get(x, y, 'orb');
    if (!o) return;
    o.enableBody(true, x, y, true, true);
    o.setTexture('orb').setTint(color).setDepth(9);
    o.body.setCircle(8, o.width / 2 - 8, o.height / 2 - 8);
    this.physics.velocityFromRotation(ang, speed, o.body.velocity);
    o.dmg = dmg;
  }

  // 招式警示：紅圈（時間到時圈內受傷）或紅線（衝撞路線），越接近發動顏色越深
  addHazard(h) {
    h.max = h.t;
    this.hazards.push(h);
  }

  updateHazards(dt) {
    this.ebullets.children.iterate(o => {
      if (o.active && !ARENA.contains(o.x, o.y)) o.disableBody(true, true);
    });
    const g = this.hazardGfx;
    g.clear();
    if (!this.hazards.length) return;
    const p = this.player;
    this.hazards = this.hazards.filter(h => {
      h.t -= dt;
      if (h.t <= 0) {
        if (h.type === 'circle') {
          this.boomFx(h.x, h.y, h.r, h.boom ?? 0xffffff);
          if (h.dmg && (p.x - h.x) ** 2 + (p.y - h.y) ** 2 <= h.r * h.r) this.hurtPlayer(h.dmg);
        }
        return false;
      }
      const k = 1 - h.t / h.max;
      const blink = Math.floor(h.t * 12) % 2 ? 1 : 0.5;
      g.fillStyle(0xff3040, 0.12 + 0.28 * k);
      g.lineStyle(3, 0xff3040, blink);
      if (h.type === 'circle') {
        g.fillCircle(h.x, h.y, h.r);
        g.strokeCircle(h.x, h.y, h.r);
        // 內圈慢慢變大，到外圈時就發動
        g.fillStyle(0xff3040, 0.25);
        g.fillCircle(h.x, h.y, h.r * k);
      } else {
        const c = Math.cos(h.ang);
        const s = Math.sin(h.ang);
        const hw = h.w / 2;
        const pts = [
          { x: h.x - s * hw, y: h.y + c * hw },
          { x: h.x + c * h.len - s * hw, y: h.y + s * h.len + c * hw },
          { x: h.x + c * h.len + s * hw, y: h.y + s * h.len - c * hw },
          { x: h.x + s * hw, y: h.y - c * hw },
        ];
        g.fillPoints(pts, true);
        g.strokePoints(pts, true);
      }
      return true;
    });
  }

  // 打倒魔王：場上小怪全倒、魔王招式消失，過一下子這一波結束
  onBossKilled(x, y) {
    this.boss = null;
    this.bossOutro = BOSS_OUTRO_TIME;
    this.clearBossAttacks();
    this.warns.children.iterate(w => { if (w.active) w.setActive(false).setVisible(false); });
    this.enemies.children.iterate(e => { if (e.active) this.killEnemy(e); });
    this.cameras.main.flash(400, 255, 240, 180);
    sfx('bossKill');
    this.cameras.main.shake(500, 0.012);
    this.boomFx(x, y, 160, 0xffd84d);
    this.hint.setText('🎉 打倒魔王了！').setVisible(true).setAlpha(1);
    this.hintTime = BOSS_OUTRO_TIME;
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
      // 跳在半空中的魔王打不到
      if (!e.active || !e.body.enable) return;
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
    sfx(slot.id);
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
      if (b.life <= 0 || !ARENA.contains(b.x, b.y)) {
        // 火箭飛到最遠或撞到牆也會爆炸
        if (b.blast > 0) {
          const x = Phaser.Math.Clamp(b.x, ARENA.x, ARENA.right);
          const y = Phaser.Math.Clamp(b.y, ARENA.y, ARENA.bottom);
          this.explode(x, y, b.blast, b.dmg, b.knockback, b.color);
        }
        b.disableBody(true, true);
      }
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
    // 魔王太重，推不動
    const kb = e.boss ? 0 : b.knockback;
    const a = Math.atan2(b.body.velocity.y, b.body.velocity.x);
    e.x += Math.cos(a) * kb;
    e.y += Math.sin(a) * kb;
    this.showFloat(e.x, e.y - 18, String(b.dmg), '#ffffff');
    if (e.hp <= 0) this.killEnemy(e);
    else sfx('hit');
    b.pierce -= 1;
    if (b.pierce < 0) b.disableBody(true, true);
  }

  // 火箭爆炸：半徑內每隻敵人都吃滿傷害，並從爆炸中心往外推
  explode(x, y, radius, dmg, kb, color) {
    this.boomFx(x, y, radius, color);
    this.cameras.main.shake(80, 0.003);
    sfx('explode');
    const hit = [];
    this.enemies.children.iterate(e => {
      if (!e.active || !e.body.enable) return;
      const dx = e.x - x;
      const dy = e.y - y;
      // 敵人身體碰到爆炸圈就算
      const reach = radius + e.body.halfWidth;
      if (dx * dx + dy * dy <= reach * reach) hit.push(e);
    });
    for (const e of hit) {
      // 打倒魔王時其他小怪會一起倒下，已經倒下的就跳過
      if (!e.active) continue;
      e.hp -= dmg;
      e.setTintFill(0xffffff);
      e.flash = 0.06;
      const a = Math.atan2(e.y - y, e.x - x);
      const push = e.boss ? 0 : kb;
      e.x += Math.cos(a) * push;
      e.y += Math.sin(a) * push;
      this.showFloat(e.x, e.y - 18, String(dmg), '#ffb84d');
      if (e.hp <= 0) this.killEnemy(e);
    }
  }

  boomFx(x, y, radius, color) {
    const fx = this.add.image(x, y, 'boom').setTint(color).setDepth(9)
      .setScale(radius / 64 * 0.4).setAlpha(0.9);
    this.tweens.add({ targets: fx, scale: radius / 64, alpha: 0, duration: 260, onComplete: () => fx.destroy() });
  }

  killEnemy(e) {
    const { x, y, drop } = e;
    const wasBoss = e.boss;
    e.disableBody(true, true);
    if (!wasBoss) sfx('kill');
    // 魔王掉的材料撒得比較開
    const spread = wasBoss ? 70 : 12;
    for (let i = 0; i < drop; i++) {
      const m = this.mats.get(x + Phaser.Math.Between(-spread, spread), y + Phaser.Math.Between(-spread, spread), 'mat');
      if (!m) break;
      m.setActive(true).setVisible(true).setDepth(3);
      m.homing = false;
    }
    if (wasBoss) this.onBossKilled(x, y);
  }

  onPlayerTouch(p, e) {
    if (!e.active || !e.body.enable) return;
    this.hurtPlayer(e.dmg);
  }

  // 玩家受傷（敵人碰撞、魔王子彈、魔王招式），護甲減傷，之後短暫無敵
  hurtPlayer(rawDmg) {
    if (this.invuln > 0 || !this.running) return false;
    const p = this.player;
    const dmg = rawDmg * (1 - armorReduction(this.run.stats.armor));
    this.run.hp -= dmg;
    this.invuln = INVULN_TIME;
    this.cameras.main.shake(120, 0.006);
    sfx('hurt');
    this.showFloat(p.x, p.y - 30, `-${Math.round(dmg * 10) / 10}`, '#ff6b6b');
    return true;
  }

  onOrbHit(p, o) {
    if (!o.active) return;
    if (this.hurtPlayer(o.dmg)) o.disableBody(true, true);
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
    if (got) sfx('pickup');
    if (got && addMaterials(this.run, got) > 0) {
      sfx('levelup');
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
    if (!this.bossId) {
      this.hooks.onHud(Math.max(0, Math.ceil(this.waveTime - this.elapsed)), null);
      return;
    }
    const def = BOSSES[this.bossId];
    const b = this.boss;
    const age = b ? b.age : 0;
    this.hooks.onHud(0, {
      icon: def.icon,
      name: def.name,
      hp: b ? Math.max(0, Math.ceil(b.hp)) : (this.bossOutro > 0 ? 0 : def.hp),
      maxHp: def.hp,
      enraged: !!b?.enraged,
      defeated: this.bossOutro > 0,
      enrageIn: Math.max(0, Math.ceil(BOSS_ENRAGE_TIME - age)),
    });
  }
}
