// 遊戲中的抬頭資訊（血量、經驗、材料、波數與倒數）
import { MAX_WAVES, xpToNext } from '../state.js';

const $ = id => document.getElementById(id);
let last = {};

function set(id, prop, value) {
  const key = id + prop;
  if (last[key] === value) return;
  last[key] = value;
  if (prop === 'text') $(id).textContent = value;
  else $(id).style[prop] = value;
}

export const hud = {
  show() {
    last = {};
    $('hud').hidden = false;
  },
  hide() {
    $('hud').hidden = true;
  },
  update(run, timeLeft) {
    const hp = Math.max(0, Math.ceil(run.hp));
    set('hp-fill', 'width', `${Math.max(0, run.hp / run.stats.maxHp) * 100}%`);
    set('hp-text', 'text', `❤️ ${hp} / ${run.stats.maxHp}`);
    set('xp-fill', 'width', `${run.xp / xpToNext(run.level) * 100}%`);
    set('lv-text', 'text', `Lv ${run.level}`);
    set('mat-text', 'text', String(run.materials));
    set('wave-text', 'text', `第 ${run.wave} / ${MAX_WAVES} 波${run.waveDamage ? ` · ⚔️+${run.waveDamage}%` : ''}`);
    set('timer-text', 'text', String(timeLeft));
    set('timer-text', 'color', timeLeft <= 5 ? '#ff6b6b' : '');
  },
};
