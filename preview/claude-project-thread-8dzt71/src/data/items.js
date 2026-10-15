import { formatStat } from '../state.js';

// 道具：買了就永久加能力，可以重複購買疊加。tier 0~3 = 白、藍、紫、金。
export const ITEMS = [
  { id: 'snack', name: '小點心', icon: '🍪', tier: 0, effects: { maxHp: 3 } },
  { id: 'sneaker', name: '運動鞋', icon: '👟', tier: 0, effects: { speed: 5 } },
  { id: 'whetstone', name: '磨刀石', icon: '🪨', tier: 0, effects: { damage: 5 } },
  { id: 'cocoa', name: '可可牛奶', icon: '🥛', tier: 0, effects: { atkSpeed: 6 } },
  { id: 'magnet', name: '小磁鐵', icon: '🧲', tier: 0, effects: { pickup: 30 } },
  { id: 'bandage', name: 'OK 繃', icon: '🩹', tier: 0, effects: { regen: 1 } },
  { id: 'helmet', name: '安全帽', icon: '⛑️', tier: 1, effects: { armor: 2, speed: -2 } },
  { id: 'goldapple', name: '金蘋果', icon: '🍏', tier: 1, effects: { maxHp: 6, regen: 1 } },
  { id: 'gloves', name: '拳擊手套', icon: '🥊', tier: 1, effects: { damage: 10, atkSpeed: 3 } },
  { id: 'rocket', name: '火箭鞋', icon: '🚀', tier: 1, effects: { speed: 10, atkSpeed: 5 } },
  { id: 'shield', name: '騎士盾', icon: '🛡️', tier: 2, effects: { armor: 4, maxHp: 8 } },
  { id: 'crown', name: '小皇冠', icon: '👑', tier: 2, effects: { damage: 15, atkSpeed: 10 } },
  { id: 'dragon', name: '龍之心', icon: '🐉', tier: 2, effects: { maxHp: 12, regen: 3, damage: 5 } },
  { id: 'luckystar', name: '幸運星', icon: '🌟', tier: 3, effects: { damage: 20, atkSpeed: 15, speed: 8 } },
  { id: 'unicorn', name: '獨角獸', icon: '🦄', tier: 3, effects: { maxHp: 20, armor: 5, regen: 4 } },
];

export const ITEM_COST = [14, 30, 60, 110];

export function findItem(id) {
  return ITEMS.find(i => i.id === id);
}

export function itemDesc(item) {
  return Object.entries(item.effects).map(([k, v]) => formatStat(k, v)).join('、');
}
