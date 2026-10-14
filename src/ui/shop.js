// 每波結束後的商店：買武器和道具、鎖定商品、答題重骰。
import { WEAPONS, WEAPON_IDS, MAX_WEAPONS, weaponStats, weaponBaseCost, weaponTraits, weaponTierExtras } from '../data/weapons.js';
import { ITEMS, ITEM_COST, findItem, itemDesc } from '../data/items.js';
import { RARITY, STATS, RULES, applyEffects, priceForWave, statDetail } from '../state.js';
import { DIFFICULTY, openQuiz } from './quiz.js';
import { quitButton } from './screens.js';
import { markGearSeen } from '../progress.js';
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
  for (const i of fresh) markGearSeen(slots[i].offer.kind, slots[i].offer.id);
}

function rerollCost(run) {
  // 每波第一次重骰免費，之後越來越貴
  return run.shop.rerolls === 0 ? 0 : Math.ceil(run.wave / 2) + run.shop.rerolls;
}

function weaponDesc(w, run) {
  const s = weaponStats(w, run.stats);
  const parts = [`傷害 ${s.damage}`, `每 ${s.cooldown.toFixed(2)} 秒`];
  return [...parts, ...weaponTierExtras(s), ...weaponTraits(s)].join(' · ');
}

// 買武器的方式：有空位就能放進去；有同名同階也能直接合成（不佔格子），兩者都行時讓玩家選；
// 都不行就要替換
function weaponBuyModes(run, id, tier) {
  const modes = [];
  if (run.weapons.length < MAX_WEAPONS) modes.push('add');
  if (tier < 3 && run.weapons.some(w => w.id === id && w.tier === tier)) modes.push('merge');
  return modes.length ? modes : ['replace'];
}

function sellPrice(w, run) {
  return Math.floor(priceForWave(weaponBaseCost(w.id, w.tier), run.wave) * 0.4);
}

export function openShop(run, onNext, onQuit) {
  run.shop.rerolls = 0;
  rollSlots(run);

  const screen = el('div', { class: 'screen shop' });
  let busy = false;
  // 武器欄滿時買新武器：記住是哪一格商品，等玩家選一把要換掉的武器
  let replacing = null;

  const pay = (slot, price) => {
    run.materials -= price;
    slot.sold = true;
    slot.locked = false;
  };

  const buy = (i, mode) => {
    const slot = run.shop.slots[i];
    const o = slot.offer;
    const price = offerPrice(o, run.wave);
    if (slot.sold || run.materials < price) return;
    replacing = null;
    if (o.kind === 'weapon') {
      if (mode === 'replace') {
        replacing = i;
        render();
        return;
      }
      if (mode === 'merge') {
        const dup = run.weapons.find(w => w.id === o.id && w.tier === o.tier);
        dup.tier += 1;
        toast(`${WEAPONS[o.id].name} 合成升級成${RARITY[dup.tier].name}！`, 'good');
      } else {
        run.weapons.push({ id: o.id, tier: o.tier });
      }
    } else {
      run.items[o.id] = (run.items[o.id] || 0) + 1;
      applyEffects(run, findItem(o.id).effects);
    }
    pay(slot, price);
    render();
  };

  // 用商品 replacing 換掉身上第 k 把武器，舊武器照賣價退錢
  const replaceWith = k => {
    const slot = run.shop.slots[replacing];
    replacing = null;
    if (!slot || slot.sold) return render();
    const o = slot.offer;
    const price = offerPrice(o, run.wave);
    const refund = sellPrice(run.weapons[k], run);
    if (run.materials + refund < price) return render();
    run.materials += refund;
    run.weapons[k] = { id: o.id, tier: o.tier };
    pay(slot, price);
    toast(`換上 ${WEAPONS[o.id].name}！`, 'good');
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
    replacing = null;
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
    replacing = null;
    run.weapons.splice(j, 1);
    w.tier += 1;
    toast(`${WEAPONS[w.id].name} 升級成${RARITY[w.tier].name}！`, 'good');
    render();
  };

  const sell = i => {
    if (run.weapons.length <= 1) return;
    replacing = null;
    run.materials += sellPrice(run.weapons[i], run);
    run.weapons.splice(i, 1);
    render();
  };

  function offerCard(slot, i) {
    const o = slot.offer;
    if (slot.sold) return el('div', { class: 'offer sold' }, el('div', { class: 'sold-text' }, '已購買 ✔'));
    const price = offerPrice(o, run.wave);
    const isWeapon = o.kind === 'weapon';
    const def = isWeapon ? WEAPONS[o.id] : findItem(o.id);
    const modes = isWeapon ? weaponBuyModes(run, o.id, o.tier) : ['item'];
    const label = { add: '買', merge: '合成', replace: '替換', item: '' };
    return el('div', { class: `offer ${RARITY[o.tier].css} ${replacing === i ? 'picking' : ''}` },
      el('button', {
        class: `lock ${slot.locked ? 'on' : ''}`, type: 'button', 'aria-label': '鎖定',
        onclick: () => { slot.locked = !slot.locked; render(); },
      }, slot.locked ? '🔒' : '🔓'),
      el('div', { class: 'icon' }, def.icon),
      el('div', { class: 'name' }, def.name),
      el('div', { class: 'rarity' }, `${RARITY[o.tier].name}${isWeapon ? '武器' : '道具'}`),
      el('div', { class: 'desc' }, isWeapon ? weaponDesc(o, run) : itemDesc(def)),
      el('div', { class: 'buy-row' }, modes.map(mode => el('button', {
        class: 'btn buy', type: 'button', disabled: run.materials < price || busy, onclick: () => buy(i, mode),
      }, `${label[mode] ? label[mode] + ' ' : ''}💎 ${price}`))),
    );
  }

  function weaponCard(w, i) {
    const canCombine = w.tier < 3 && run.weapons.some((o, k) => k !== i && o.id === w.id && o.tier === w.tier);
    const def = WEAPONS[w.id];
    let buttons;
    if (replacing !== null) {
      const price = offerPrice(run.shop.slots[replacing].offer, run.wave);
      const refund = sellPrice(w, run);
      buttons = [el('button', {
        class: 'btn mini good', type: 'button', disabled: run.materials + refund < price, onclick: () => replaceWith(i),
      }, `換掉這把（退 💎${refund}）`)];
    } else {
      buttons = [
        canCombine ? el('button', { class: 'btn mini good', type: 'button', onclick: () => combine(i) }, '合成') : null,
        run.weapons.length > 1 ? el('button', { class: 'btn mini', type: 'button', onclick: () => sell(i) },
          `賣 💎${sellPrice(w, run)}`) : null,
      ];
    }
    return el('div', { class: `inv-weapon ${RARITY[w.tier].css} ${replacing !== null ? 'picking' : ''}` },
      el('div', { class: 'icon' }, def.icon),
      el('div', { class: 'name' }, def.name),
      el('div', { class: 'desc' }, weaponDesc(w, run)),
      el('div', { class: 'row' }, ...buttons),
    );
  }

  function replaceBanner() {
    if (replacing === null) return null;
    const o = run.shop.slots[replacing].offer;
    return el('div', { class: 'replace-banner' },
      el('span', {}, `武器欄滿了（最多 ${MAX_WEAPONS} 把）：選一把換成 ${WEAPONS[o.id].icon} ${WEAPONS[o.id].name}`),
      el('button', { class: 'btn mini', type: 'button', onclick: () => { replacing = null; render(); } }, '取消'),
    );
  }

  function render() {
    const cost = rerollCost(run);
    const items = Object.entries(run.items);
    screen.replaceChildren(
      el('div', { class: 'shop-head' },
        el('div', { class: 'title' }, `第 ${run.wave} 波完成！`),
        el('div', { class: 'mats big' }, `💎 ${run.materials}`),
        el('div', { class: 'row tight' },
          quitButton(onQuit, busy),
          el('button', { class: 'btn primary', type: 'button', disabled: busy, onclick: () => onNext() }, '下一波 ▶'),
        ),
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
        replaceBanner(),
        el('div', { class: 'inv-weapons' }, run.weapons.map(weaponCard)),
        items.length ? el('div', { class: 'section-title' }, '道具') : null,
        items.length ? el('div', { class: 'inv-items' }, items.map(([id, n]) => {
          const it = findItem(id);
          return el('span', { class: `chip ${RARITY[it.tier].css}`, title: itemDesc(it) }, `${it.icon} ${it.name}${n > 1 ? ` ×${n}` : ''}`);
        })) : null,
        el('div', { class: 'section-title' }, '能力'),
        el('div', { class: 'stats' }, Object.entries(STATS).map(([k, s]) => {
          const detail = statDetail(k, run.stats);
          return el('span', { class: 'chip' }, `${s.icon} ${s.name} ${run.stats[k]}${s.pct ? '%' : ''}${detail ? `（${detail}）` : ''}`);
        })),
        el('div', { class: 'rules' }, RULES.join(' · ')),
      ),
    );
  }

  render();
  mount(screen);
}
