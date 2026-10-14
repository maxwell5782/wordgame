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
  // boss：魔王波時 ArenaScene 傳來的魔王資訊（名字、血量、狂暴倒數），不是魔王波就是 null
  update(run, timeLeft, boss) {
    const hp = Math.max(0, Math.ceil(run.hp));
    set('hp-fill', 'width', `${Math.max(0, run.hp / run.stats.maxHp) * 100}%`);
    set('hp-text', 'text', `❤️ ${hp} / ${run.stats.maxHp}`);
    set('xp-fill', 'width', `${run.xp / xpToNext(run.level) * 100}%`);
    set('lv-text', 'text', `Lv ${run.level}`);
    set('mat-text', 'text', String(run.materials));
    set('wave-text', 'text', `第 ${run.wave} / ${MAX_WAVES} 波${run.waveDamage ? ` · ⚔️+${run.waveDamage}%` : ''}`);
    set('boss-bar', 'display', boss ? '' : 'none');
    if (boss) {
      // 魔王波沒有時間限制，倒數的是魔王還有幾秒狂暴
      set('wave-text', 'text', `第 ${run.wave} / ${MAX_WAVES} 波 · 魔王戰${run.waveDamage ? ` · ⚔️+${run.waveDamage}%` : ''}`);
      const angry = boss.enraged && !boss.defeated;
      set('timer-text', 'text', boss.defeated ? '🎉' : boss.enraged ? '🔥' : String(boss.enrageIn));
      set('timer-text', 'color', angry || (!boss.defeated && boss.enrageIn <= 5) ? '#ff6b6b' : '');
      set('boss-name', 'text', `${boss.icon} ${boss.name} · ${boss.defeated ? '被打倒了！' : boss.enraged ? '狂暴中！' : '倒數完會狂暴'}`);
      set('boss-name', 'color', angry ? '#ff6b6b' : '');
      set('boss-fill', 'width', `${boss.hp / boss.maxHp * 100}%`);
      set('boss-text', 'text', `${boss.hp} / ${boss.maxHp}`);
      return;
    }
    set('timer-text', 'text', String(timeLeft));
    set('timer-text', 'color', timeLeft <= 5 ? '#ff6b6b' : '');
  },
};
