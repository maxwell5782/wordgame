// 武器資料。tier 0~3 = 白、藍、紫、金，兩把同名同階武器可以合成下一階。
// 子彈速度要明顯比最快的敵人快，不然追不上。
export const WEAPONS = {
  pistol: {
    name: '手槍', icon: '🔫', desc: '穩定的單發射擊，什麼距離都好用。', tex: 'w_pistol', bulletTex: 'bullet', color: 0xffe066,
    baseCost: 12, damage: 10, cooldown: 0.9, range: 420, bulletSpeed: 950,
    pellets: 1, spread: 0, pierce: 0,
  },
  shotgun: {
    name: '散彈槍', icon: '💥', desc: '近距離一次射出好幾發，每升一階多 1 發。', tex: 'w_shotgun', bulletTex: 'bullet', color: 0xff9f43,
    baseCost: 20, damage: 5, cooldown: 1.3, range: 300, bulletSpeed: 850,
    pellets: 4, spread: 0.55, pierce: 0,
  },
  knife: {
    name: '飛刀', icon: '🗡️', desc: '出手很快又能穿透敵人，每升一階多穿透 1 隻。', tex: 'w_knife', bulletTex: 'blade', color: 0xc8f7ff,
    baseCost: 16, damage: 8, cooldown: 0.55, range: 260, bulletSpeed: 1150,
    pellets: 1, spread: 0, pierce: 1,
  },
};

export const WEAPON_IDS = Object.keys(WEAPONS);
// 身上最多同時帶 2 把武器，每把各自瞄準、各自冷卻
export const MAX_WEAPONS = 2;

const TIER_DMG = [1, 1.6, 2.4, 3.6];
const TIER_CD = [1, 0.9, 0.8, 0.7];
const TIER_COST = [1, 2, 4, 8];

export function weaponStats(w, stats) {
  const d = WEAPONS[w.id];
  return {
    damage: Math.max(1, Math.round(d.damage * TIER_DMG[w.tier] * (1 + stats.damage / 100))),
    cooldown: d.cooldown * TIER_CD[w.tier] / Math.max(0.2, 1 + stats.atkSpeed / 100),
    range: d.range,
    bulletSpeed: d.bulletSpeed,
    // 散彈槍每升一階多一發，飛刀每升一階多穿透一隻
    pellets: d.pellets + (w.id === 'shotgun' ? w.tier : 0),
    spread: d.spread,
    pierce: d.pierce + (w.id === 'knife' ? w.tier : 0),
    tex: d.tex,
    bulletTex: d.bulletTex,
    color: d.color,
  };
}

export function weaponBaseCost(id, tier) {
  return WEAPONS[id].baseCost * TIER_COST[tier];
}
