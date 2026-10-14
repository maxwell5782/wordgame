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

export function playerSpeed(stats) {
  return Math.max(80, 220 * (1 + stats.speed / 100));
}

// 護甲的減傷比例，護甲越高收益越低
export function armorReduction(armor) {
  return armor >= 0 ? armor / (armor + 10) : armor / 10;
}

export function priceForWave(base, wave) {
  return Math.round(base * (1 + 0.1 * (wave - 1)));
}
