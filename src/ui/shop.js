// 每波結束後的商店：買武器和道具、鎖定商品、答題重骰。
import { WEAPONS, WEAPON_IDS, MAX_WEAPONS, weaponStats, weaponBaseCost } from '../data/weapons.js';
import { ITEMS, ITEM_COST, findItem } from '../data/items.js';
import { RARITY, STATS, applyEffects, formatStat, priceForWave } from '../state.js';
import { DIFFICULTY, openQuiz } from './quiz.js';
import { el, mount, toast } from './dom.js';

const SLOT_COUNT = 4;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollTier(wave) {
  const gold = wave >= 7 ? 0.02 + 0.02 * (wave - 7) : 0;
  const purple = wave >= 3 ? 0.04 + 0.03 * (wave - 3) : 0;
  const blue = 0.12 + 0.04 * wave;
  const r = Math.random();
  if (r < gold) return 3;
  if (r < gold + purple) return 2;
  if (r < gold + purple + blue) return 1;
  return 0;
}

function makeOffer(tier) {
  if (Math.random() < 0.45) return { kind: 'weapon', id: pick(WEAPON_IDS), tier };
  return { kind: 'item', id: pick(ITEMS.filter(i => i.tier === tier)).id, tier };
}

function offerPrice(o, wave) {
  const base = o.kind === 'weapon' ? weaponBaseCost(o.id, o.tier) : ITEM_COST[o.tier];
  return priceForWave(base, wave);
}

// 重骰沒鎖定的格子；guarantee = 新商品裡至少要有一個這個稀有度以上
function rollSlots(run, guarantee = 0) {
  const slots = run.shop.slots;
  const fresh = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (slots[i] && slots[i].locked && !slots[i].sold) continue;
    slots[i] = { offer: makeOffer(rollTier(run.wave)), locked: false, sold: false };
    fresh.push(i);
  }
  if (guarantee > 0 && fresh.length && !fresh.some(i => slots[i].offer.tier >= guarantee)) {
    slots[pick(fresh)].offer = makeOffer(guarantee);
  }
}

function rerollCost(run) {
  // 每波第一次重骰免費，之後越來越貴
  return run.shop.rerolls === 0 ? 0 : Math.ceil(run.wave / 2) + run.shop.rerolls;
}

function weaponDesc(w, run) {
  const s = weaponStats(w, run.stats);
  const parts = [`傷害 ${s.damage}`, `每 ${s.cooldown.toFixed(2)} 秒`];
  if (s.pellets > 1) parts.push(`${s.pellets} 發`);
  if (s.pierce > 0) parts.push(`穿透 ${s.pierce}`);
  return parts.join(' · ');
}

function itemDesc(item) {
  return Object.entries(item.effects).map(([k, v]) => formatStat(k, v)).join('、');
}

function tryAddWeapon(run, id, tier) {
  if (run.weapons.length < MAX_WEAPONS) {
    run.weapons.push({ id, tier });
    return 'added';
  }
  const dup = run.weapons.find(w => w.id === id && w.tier === tier && tier < 3);
  if (dup) {
    dup.tier += 1;
    return 'merged';
  }
  return null;
}

export function openShop(run, onNext) {
  run.shop.rerolls = 0;
  rollSlots(run);

  const screen = el('div', { class: 'screen shop' });
  let busy = false;

  const buy = i => {
    const slot = run.shop.slots[i];
    const o = slot.offer;
    const price = offerPrice(o, run.wave);
    if (slot.sold || run.materials < price) return;
    if (o.kind === 'weapon') {
      const res = tryAddWeapon(run, o.id, o.tier);
      if (!res) {
        toast('武器欄滿了！先賣掉或合成一把', 'bad');
        return;
      }
      if (res === 'merged') toast(`${WEAPONS[o.id].name} 合成升級了！`, 'good');
    } else {
      run.items[o.id] = (run.items[o.id] || 0) + 1;
      applyEffects(run, findItem(o.id).effects);
    }
    run.materials -= price;
    slot.sold = true;
    slot.locked = false;
    render();
  };

  const reroll = async difficulty => {
    if (busy) return;
    const cost = rerollCost(run);
    if (run.materials < cost) {
      toast('材料不夠重骰', 'bad');
      return;
    }
    if (run.shop.slots.every(s => s.locked && !s.sold)) {
      toast('全部都鎖定了，沒有東西可以重骰', 'bad');
      return;
    }
    busy = true;
    run.materials -= cost;
    run.shop.rerolls += 1;
    render();
    const correct = await openQuiz(difficulty, run);
    rollSlots(run, correct ? DIFFICULTY[difficulty].guarantee : 0);
    busy = false;
    render();
  };

  const combine = i => {
    const w = run.weapons[i];
    const j = run.weapons.findIndex((o, k) => k !== i && o.id === w.id && o.tier === w.tier);
    if (j < 0 || w.tier >= 3) return;
    run.weapons.splice(j, 1);
    w.tier += 1;
    toast(`${WEAPONS[w.id].name} 升級成${RARITY[w.tier].name}！`, 'good');
    render();
  };

  const sell = i => {
    if (run.weapons.length <= 1) return;
    const w = run.weapons[i];
    run.materials += Math.floor(priceForWave(weaponBaseCost(w.id, w.tier), run.wave) * 0.4);
    run.weapons.splice(i, 1);
    render();
  };

  function offerCard(slot, i) {
    const o = slot.offer;
    if (slot.sold) return el('div', { class: 'offer sold' }, el('div', { class: 'sold-text' }, '已購買 ✔'));
    const price = offerPrice(o, run.wave);
    const isWeapon = o.kind === 'weapon';
    const def = isWeapon ? WEAPONS[o.id] : findItem(o.id);
    return el('div', { class: `offer ${RARITY[o.tier].css}` },
      el('button', {
        class: `lock ${slot.locked ? 'on' : ''}`, type: 'button', 'aria-label': '鎖定',
        onclick: () => { slot.locked = !slot.locked; render(); },
      }, slot.locked ? '🔒' : '🔓'),
      el('div', { class: 'icon' }, def.icon),
      el('div', { class: 'name' }, def.name),
      el('div', { class: 'rarity' }, `${RARITY[o.tier].name}${isWeapon ? '武器' : '道具'}`),
      el('div', { class: 'desc' }, isWeapon ? weaponDesc(o, run) : itemDesc(def)),
      el('button', {
        class: 'btn buy', type: 'button', disabled: run.materials < price || busy, onclick: () => buy(i),
      }, `💎 ${price}`),
    );
  }

  function weaponCard(w, i) {
    const canCombine = w.tier < 3 && run.weapons.some((o, k) => k !== i && o.id === w.id && o.tier === w.tier);
    const def = WEAPONS[w.id];
    return el('div', { class: `inv-weapon ${RARITY[w.tier].css}` },
      el('div', { class: 'icon' }, def.icon),
      el('div', { class: 'name' }, def.name),
      el('div', { class: 'desc' }, weaponDesc(w, run)),
      el('div', { class: 'row' },
        canCombine ? el('button', { class: 'btn mini good', type: 'button', onclick: () => combine(i) }, '合成') : null,
        run.weapons.length > 1 ? el('button', { class: 'btn mini', type: 'button', onclick: () => sell(i) },
          `賣 💎${Math.floor(priceForWave(weaponBaseCost(w.id, w.tier), run.wave) * 0.4)}`) : null,
      ),
    );
  }

  function render() {
    const cost = rerollCost(run);
    const items = Object.entries(run.items);
    screen.replaceChildren(
      el('div', { class: 'shop-head' },
        el('div', { class: 'title' }, `第 ${run.wave} 波完成！`),
        el('div', { class: 'mats big' }, `💎 ${run.materials}`),
        el('button', { class: 'btn primary', type: 'button', disabled: busy, onclick: () => onNext() }, '下一波 ▶'),
      ),
      el('div', { class: 'offers' }, run.shop.slots.map(offerCard)),
      el('div', { class: 'reroll' },
        el('div', { class: 'reroll-label' }, '🎲 答題重骰', el('span', { class: 'cost' }, cost === 0 ? '本波第一次免費' : `💎 ${cost}`)),
        el('div', { class: 'reroll-btns' }, Object.entries(DIFFICULTY).map(([key, d]) =>
          el('button', {
            class: `btn diff d-${key}`, type: 'button', disabled: busy || run.materials < cost, onclick: () => reroll(key),
          },
          el('b', {}, d.name),
          el('small', {}, d.guarantee === 0 ? '一般重骰' : d.guarantee === 1 ? '保證 1 個藍裝' : '保證 1 個紫裝')))),
      ),
      el('div', { class: 'inventory' },
        el('div', { class: 'section-title' }, `武器 ${run.weapons.length}/${MAX_WEAPONS}`),
        el('div', { class: 'inv-weapons' }, run.weapons.map(weaponCard)),
        items.length ? el('div', { class: 'section-title' }, '道具') : null,
        items.length ? el('div', { class: 'inv-items' }, items.map(([id, n]) => {
          const it = findItem(id);
          return el('span', { class: `chip ${RARITY[it.tier].css}`, title: itemDesc(it) }, `${it.icon} ${it.name}${n > 1 ? ` ×${n}` : ''}`);
        })) : null,
        el('div', { class: 'section-title' }, '能力'),
        el('div', { class: 'stats' }, Object.entries(STATS).map(([k, s]) =>
          el('span', { class: 'chip' }, `${s.icon} ${s.name} ${run.stats[k]}${s.pct ? '%' : ''}`))),
      ),
    );
  }

  render();
  mount(screen);
}
