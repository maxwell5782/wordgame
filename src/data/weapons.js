// 武器資料。tier 0~3 = 白、藍、紫、金，兩把同名同階武器可以合成下一階。
// 子彈速度要明顯比最快的敵人快，不然追不上。
export const WEAPONS = {
  pistol: {
    name: '手槍', icon: '🔫', desc: '穩定的單發射擊，什麼距離都好用。', tex: 'w_pistol', bulletTex: 'bullet', color: 0xffe066,
    baseCost: 12, damage: 10, cooldown: 0.9, range: 420, bulletSpeed: 950,
    pellets: 1, spread: 0, pierce: 0, knockback: 10,
  },
  shotgun: {
    name: '散彈槍', icon: '💥', desc: '近距離一次射出好幾發，每升一階多 1 發。', tex: 'w_shotgun', bulletTex: 'bullet', color: 0xff9f43,
    baseCost: 20, damage: 4, cooldown: 1.45, range: 300, bulletSpeed: 850,
    pellets: 3, spread: 0.55, pierce: 0, knockback: 10,
  },
  knife: {
    name: '飛刀', icon: '🗡️', desc: '出手很快又能穿透敵人，每升一階多穿透 1 隻。', tex: 'w_knife', bulletTex: 'blade', color: 0xc8f7ff,
    baseCost: 16, damage: 8, cooldown: 0.55, range: 260, bulletSpeed: 1150,
    pellets: 1, spread: 0, pierce: 1, knockback: 10,
  },
  bazooka: {
    name: '火箭炮', icon: '🧨', desc: '要等很久才射一發，碰到敵人就爆炸，範圍內的敵人全部受傷。每升一階爆炸範圍變大。', tex: 'w_bazooka', bulletTex: 'rocket', color: 0xff5e3a,
    baseCost: 24, damage: 20, cooldown: 3.2, range: 450, bulletSpeed: 520,
    pellets: 1, spread: 0, pierce: 0, knockback: 25, blast: 80,
  },
};

export const WEAPON_IDS = Object.keys(WEAPONS);
// 身上最多同時帶 6 把武器，每把各自瞄準、各自冷卻
export const MAX_WEAPONS = 6;

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
    // 每次命中把敵人往子彈方向推開的距離（像素）
    knockback: d.knockback,
    pierce: d.pierce + (w.id === 'knife' ? w.tier : 0),
    // 爆炸半徑（像素），火箭炮每升一階大 12；0 代表不會爆炸
    blast: d.blast ? d.blast + 12 * w.tier : 0,
    tex: d.tex,
    bulletTex: d.bulletTex,
    color: d.color,
  };
}

// 武器卡上顯示的所有數值；傷害、間隔、發數、穿透、爆炸範圍會隨階級改變，其餘固定
export function weaponTraits(st) {
  const parts = [`射程 ${rangeLabel(st.range)}`, `擊退 ${st.knockback}`, `子彈速度 ${st.bulletSpeed}`];
  if (st.pellets > 1) parts.push(`散射 ${Math.round(st.spread * 180 / Math.PI)}°`);
  return parts;
}

// 射程顯示成小孩看得懂的遠近，括號裡是實際像素
export function rangeLabel(range) {
  const word = range >= 400 ? '遠' : range >= 290 ? '中' : '近';
  return `${word}（${range}）`;
}

export function weaponBaseCost(id, tier) {
  return WEAPONS[id].baseCost * TIER_COST[tier];
}

// 會隨階級改變的特性（發數、穿透、爆炸範圍），商店和圖鑑共用
export function weaponTierExtras(st) {
  const extra = [];
  if (st.pellets > 1) extra.push(`${st.pellets} 發`);
  if (st.pierce > 0) extra.push(`穿透 ${st.pierce}`);
  if (st.blast > 0) extra.push(`爆炸範圍 ${st.blast}`);
  return extra;
}
