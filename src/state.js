// 一局遊戲的狀態與規則。
export const MAX_WAVES = 10;

export const RARITY = [
  { name: '普通', css: 'r0', color: 0xe8e8e8 },
  { name: '稀有', css: 'r1', color: 0x4aa3ff },
  { name: '史詩', css: 'r2', color: 0xb46cff },
  { name: '傳說', css: 'r3', color: 0xffb43a },
];

export const STATS = {
  maxHp: { name: '最大生命', icon: '❤️', pct: false, levelUp: [3, 5, 8, 12] },
  regen: { name: '生命回復', icon: '💗', pct: false, levelUp: [1, 2, 3, 4] },
  damage: { name: '傷害', icon: '⚔️', pct: true, levelUp: [5, 8, 12, 16] },
  atkSpeed: { name: '攻擊速度', icon: '⚡', pct: true, levelUp: [5, 10, 15, 20] },
  speed: { name: '移動速度', icon: '👟', pct: true, levelUp: [3, 6, 9, 12] },
  armor: { name: '護甲', icon: '🛡️', pct: false, levelUp: [1, 2, 3, 4] },
  pickup: { name: '拾取範圍', icon: '🧲', pct: false, levelUp: [20, 35, 50, 70] },
};

export function formatStat(key, value) {
  const s = STATS[key];
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${s.pct ? '%' : ''} ${s.name}`;
}

export function newRun(topic) {
  return {
    topic,
    wave: 1,
    hp: 15,
    materials: 0,
    level: 1,
    xp: 0,
    pendingLevels: 0,
    stats: { maxHp: 15, regen: 0, damage: 0, atkSpeed: 0, speed: 0, armor: 0, pickup: 0 },
    weapons: [{ id: 'pistol', tier: 0 }],
    items: {},
    shop: { slots: [], rerolls: 0 },
    quiz: { asked: 0, correct: 0, learned: new Set(), missed: new Set() },
  };
}

export function waveDuration(wave) {
  return Math.min(60, 20 + 5 * (wave - 1));
}

export function xpToNext(level) {
  return (level + 3) ** 2;
}

// 材料同時是經驗值與金錢。回傳這次升了幾級。
export function addMaterials(run, n) {
  run.materials += n;
  run.xp += n;
  let gained = 0;
  while (run.xp >= xpToNext(run.level)) {
    run.xp -= xpToNext(run.level);
    run.level += 1;
    run.pendingLevels += 1;
    run.stats.maxHp += 1;
    gained += 1;
  }
  return gained;
}

export function applyEffects(run, effects) {
  for (const [k, v] of Object.entries(effects)) run.stats[k] += v;
}

// 被敵人撞到後的無敵時間（秒）
export const INVULN_TIME = 0.6;
// 基礎拾取範圍（像素），加上「拾取範圍」能力
export const BASE_PICKUP = 70;
// 每 1 點生命回復，每秒回多少血
export const REGEN_PER_POINT = 0.2;

// 能力的實際效果，顯示在商店的能力欄
export function statDetail(key, stats) {
  const v = stats[key];
  switch (key) {
    case 'regen': return `每秒回 ${Math.round(v * REGEN_PER_POINT * 10) / 10} 血`;
    case 'speed': return `${Math.round(playerSpeed(stats))} 像素/秒`;
    case 'armor': return `受傷 ${armorReduction(v) >= 0 ? '-' : '+'}${Math.abs(Math.round(armorReduction(v) * 100))}%`;
    case 'pickup': return `範圍 ${BASE_PICKUP + v} 像素`;
    default: return null;
  }
}

// 不會變的規則，也一起顯示給玩家看
export const RULES = [
  `被撞後無敵 ${INVULN_TIME} 秒`,
  '每波開始血量補滿',
  '升級時最大生命 +1',
  '波次結束時地上的材料自動收進來',
];

// 玩家基礎移動速度（像素/秒），只比第 10 波的衝衝鬼（200×1.18≈236）快一點；改這裡時記得一起看敵人速度
export const BASE_PLAYER_SPEED = 250;

export function playerSpeed(stats) {
  return Math.max(BASE_PLAYER_SPEED * 0.4, BASE_PLAYER_SPEED * (1 + stats.speed / 100));
}

// 護甲的減傷比例，護甲越高收益越低
export function armorReduction(armor) {
  return armor >= 0 ? armor / (armor + 10) : armor / 10;
}

export function priceForWave(base, wave) {
  return Math.round(base * (1 + 0.15 * (wave - 1)));
}
