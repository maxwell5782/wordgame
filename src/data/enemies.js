// 敵人資料。r 是碰撞半徑，drop 是死亡掉落的材料數。
export const ENEMIES = {
  slime: { name: '史萊姆', r: 15, color: 0x5ee08a, hp: 8, speed: 70, dmg: 1, drop: 1 },
  runner: { name: '衝衝鬼', r: 12, color: 0xff8a4c, hp: 5, speed: 135, dmg: 1, drop: 1 },
  tank: { name: '大胖怪', r: 24, color: 0xb070ff, hp: 32, speed: 45, dmg: 2, drop: 3 },
};

export function pickEnemyType(wave) {
  const weights = [
    ['slime', 1],
    ['runner', wave >= 2 ? 0.25 + 0.04 * wave : 0],
    ['tank', wave >= 4 ? 0.1 + 0.04 * (wave - 4) : 0],
  ];
  let r = Math.random() * weights.reduce((s, [, w]) => s + w, 0);
  for (const [type, w] of weights) {
    if ((r -= w) <= 0) return type;
  }
  return 'slime';
}

export function enemyScale(wave) {
  return {
    hp: 1 + 0.3 * (wave - 1),
    dmg: Math.floor((wave - 1) / 3),
    speed: 1 + 0.02 * (wave - 1),
  };
}
