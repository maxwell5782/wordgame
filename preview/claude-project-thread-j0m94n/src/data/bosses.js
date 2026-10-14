// 魔王資料：每 BOSS_EVERY 波出一隻，打倒魔王這一波才會結束。
// attacks 會依序輪流使用，每招之間隔 cooldown 秒（狂暴後變快）。
// 招式種類（ArenaScene.js 的 bossAttack 會處理）：
//   slam   跳到玩家腳下重壓：紅圈警示 warn 秒，落地時圈內受 dmg 傷害，再叫出 summon 隻小怪
//   ring   往四面八方射一圈子彈：每圈 count 發，連射 rounds 圈
//   fan    朝玩家扇形噴射：每次 count 發、張開 spread 度，連噴 bursts 次
//   dash   瞄準玩家後直線衝撞：警示 warn 秒，衝撞時撞到受 dmg 傷害
//   meteor 在玩家附近落下 count 顆隕石：警示 warn 秒，圈內受 dmg 傷害
export const BOSS_EVERY = 5;
// 魔王出場幾秒後狂暴：移動變快、出招間隔變短
export const BOSS_ENRAGE_TIME = 40;
export const BOSS_ENRAGE_SPEED = 1.4;
export const BOSS_ENRAGE_CD = 0.6;
// 魔王波一般小怪出得比較慢（出怪間隔乘上這個數），場上小怪上限也比較少（乘上這個比例）
export const BOSS_WAVE_SPAWN_SLOW = 1.6;
export const BOSS_WAVE_ENEMY_CAP = 0.35;

export const BOSSES = {
  slime_king: {
    name: '史萊姆國王', icon: '👑', wave: 5, tex: 'b_slime_king', color: 0x5ee08a,
    desc: '戴著皇冠的超大史萊姆，會跳起來壓扁你，還會一直生出小史萊姆。',
    hp: 900, r: 54, speed: 75, dmg: 4, drop: 40, cooldown: 2.6,
    attacks: [
      { type: 'slam', name: '跳躍重壓', warn: 1.0, radius: 120, dmg: 5, summon: 3 },
      { type: 'ring', name: '黏液噴泉', count: 14, rounds: 2, speed: 230, dmg: 3, color: 0x7dff9a },
      { type: 'slam', name: '跳躍重壓', warn: 1.0, radius: 120, dmg: 5, summon: 3 },
      { type: 'fan', name: '黏液連射', count: 5, spread: 50, bursts: 3, speed: 300, dmg: 3, color: 0x7dff9a },
    ],
  },
  fire_dragon: {
    name: '火焰魔龍', icon: '🐉', wave: 10, tex: 'b_fire_dragon', color: 0xff5e3a,
    desc: '最後的魔王。會噴火、從天上叫來隕石，還會突然直線衝過來。',
    hp: 3400, r: 60, speed: 85, dmg: 6, drop: 0, cooldown: 2.2,
    attacks: [
      { type: 'fan', name: '火焰吐息', count: 7, spread: 70, bursts: 4, speed: 340, dmg: 4, color: 0xff7a3a },
      { type: 'dash', name: '猛龍衝撞', warn: 0.8, speed: 750, dist: 520, dmg: 8 },
      { type: 'meteor', name: '隕石雨', count: 6, warn: 1.2, radius: 75, dmg: 6 },
      { type: 'ring', name: '烈焰爆發', count: 20, rounds: 3, speed: 260, dmg: 4, color: 0xffb43a },
    ],
  },
};

export const BOSS_IDS = Object.keys(BOSSES);

export function bossForWave(wave) {
  if (wave % BOSS_EVERY !== 0) return null;
  return BOSS_IDS.find(id => BOSSES[id].wave === wave) ?? null;
}

// 招式說明，圖鑑和出招時共用，數字直接從上面的資料算出來
export function attackDesc(a) {
  switch (a.type) {
    case 'slam': return `跳到你腳下重壓，紅圈半徑 ${a.radius}，傷害 ${a.dmg}，落地叫出 ${a.summon} 隻史萊姆`;
    case 'ring': return `往四周射 ${a.count} 發子彈 × ${a.rounds} 圈，每發傷害 ${a.dmg}`;
    case 'fan': return `朝你扇形射 ${a.count} 發（${a.spread}°）× ${a.bursts} 次，每發傷害 ${a.dmg}`;
    case 'dash': return `紅線警示 ${a.warn} 秒後直線衝撞 ${a.dist} 像素，撞到傷害 ${a.dmg}`;
    case 'meteor': return `在你附近落下 ${a.count} 顆隕石，紅圈半徑 ${a.radius}，傷害 ${a.dmg}`;
    default: return '';
  }
}
