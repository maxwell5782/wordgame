// 主選單、升級、暫停、結算、單字圖鑑等畫面
import { WORDS, TOPICS, ALL_TOPICS, wordsForTopic, findWord } from '../data/words.js';
import { RARITY, STATS, MAX_WAVES, applyEffects, formatStat } from '../state.js';
import { getCollection, getReviewWords, getSavedTopic, saveTopic } from '../progress.js';
import { speak } from '../speech.js';
import { el, mount, unmount } from './dom.js';

export function showMenu({ onStart }) {
  let topic = getSavedTopic();
  if (topic !== ALL_TOPICS && !TOPICS.includes(topic)) topic = ALL_TOPICS;
  const screen = el('div', { class: 'screen menu' });

  const render = () => {
    const coll = getCollection();
    const review = getReviewWords().length;
    screen.replaceChildren(el('div', { class: 'menu-inner' },
      el('h1', {}, '單字大作戰'),
      el('p', { class: 'sub' }, '撐過 10 波怪物，用英文單字換更強的裝備！'),
      el('div', { class: 'section-title' }, '選擇單字主題'),
      el('div', { class: 'topics' }, [ALL_TOPICS, ...TOPICS].map(t =>
        el('button', {
          class: `btn chip-btn ${t === topic ? 'on' : ''}`, type: 'button',
          onclick: () => { topic = t; saveTopic(t); render(); },
        }, `${t} (${wordsForTopic(t).length})`))),
      el('button', { class: 'btn primary huge', type: 'button', onclick: () => onStart(topic) }, '▶ 開始遊戲'),
      el('div', { class: 'row' },
        el('button', { class: 'btn', type: 'button', onclick: () => showCodex() }, `📖 單字圖鑑 ${coll.size}/${WORDS.length}`),
        review ? el('span', { class: 'chip bad' }, `📝 待複習 ${review} 個字`) : null,
      ),
      el('p', { class: 'help' }, '移動：按住畫面任意處拖曳（電腦也可以用 WASD 或方向鍵）。武器會自動攻擊。'),
    ));
  };
  render();
  mount(screen);
}

export function showCodex() {
  const coll = getCollection();
  const screen = el('div', { class: 'screen modal' },
    el('div', { class: 'card codex' },
      el('div', { class: 'shop-head' },
        el('div', { class: 'title' }, `📖 單字圖鑑 ${coll.size}/${WORDS.length}`),
        el('button', { class: 'btn', type: 'button', onclick: () => unmount('codex') }, '關閉'),
      ),
      el('p', { class: 'help' }, '在題目中答對過的單字會被收集起來，點一下可以聽發音。'),
      TOPICS.map(t => [
        el('div', { class: 'section-title' }, t),
        el('div', { class: 'codex-grid' }, wordsForTopic(t).map(w => {
          const has = coll.has(w.en);
          return el('button', {
            class: `codex-word ${has ? 'has' : ''}`, type: 'button', onclick: () => has && speak(w.en),
          }, el('span', { class: 'emoji' }, w.emoji), el('b', {}, has ? w.en : '？？？'), el('small', {}, w.zh));
        })),
      ]),
    ));
  mount(screen, 'codex');
}

function rollLevelTier(level) {
  const r = Math.random();
  if (level >= 8 && r < 0.05) return 3;
  if (level >= 4 && r < 0.18) return 2;
  if (r < 0.45) return 1;
  return 0;
}

// 升級：四選一能力。回傳 Promise，選完 resolve。
export function showLevelUp(run) {
  return new Promise(resolve => {
    const keys = Object.keys(STATS).sort(() => Math.random() - 0.5).slice(0, 4);
    const options = keys.map(k => {
      const tier = rollLevelTier(run.level);
      return { key: k, tier, value: STATS[k].levelUp[tier] };
    });
    const screen = el('div', { class: 'screen modal' },
      el('div', { class: 'card levelup' },
        el('div', { class: 'title' }, `⬆️ 升級了！（Lv ${run.level - run.pendingLevels + 1}）`),
        el('p', { class: 'help' }, '選一個能力'),
        el('div', { class: 'offers' }, options.map(o =>
          el('button', {
            class: `offer pickable ${RARITY[o.tier].css}`, type: 'button',
            onclick: () => { applyEffects(run, { [o.key]: o.value }); unmount('levelup'); resolve(); },
          },
          el('div', { class: 'icon' }, STATS[o.key].icon),
          el('div', { class: 'name' }, STATS[o.key].name),
          el('div', { class: 'rarity' }, RARITY[o.tier].name),
          el('div', { class: 'desc' }, formatStat(o.key, o.value))))),
      ));
    mount(screen, 'levelup');
  });
}

export function showPause({ onResume, onQuit }) {
  const screen = el('div', { class: 'screen modal' },
    el('div', { class: 'card pause' },
      el('div', { class: 'title' }, '⏸ 暫停中'),
      el('button', { class: 'btn primary huge', type: 'button', onclick: () => { unmount('pause'); onResume(); } }, '▶ 繼續'),
      el('button', {
        class: 'btn', type: 'button',
        // 按兩次才離開，避免小朋友誤觸
        onclick: e => {
          const b = e.currentTarget;
          if (b.dataset.armed) { unmount('pause'); onQuit(); return; }
          b.dataset.armed = '1';
          b.textContent = '再按一次放棄這局';
        },
      }, '回主選單'),
    ));
  mount(screen, 'pause');
}

export function isPauseOpen() {
  return !!document.querySelector('#ui [data-layer="pause"]');
}

function wordChips(list, kind) {
  return el('div', { class: 'word-chips' }, [...list].map(en => {
    const w = findWord(en);
    return el('button', { class: `chip ${kind}`, type: 'button', onclick: () => speak(en) }, `${w?.emoji ?? ''} ${en} ${w?.zh ?? ''}`);
  }));
}

export function showResults(run, won, { onAgain, onMenu }) {
  const q = run.quiz;
  const rate = q.asked ? Math.round(q.correct / q.asked * 100) : 0;
  const screen = el('div', { class: 'screen results' },
    el('div', { class: 'menu-inner' },
      el('h1', {}, won ? '🏆 勝利！' : '💥 被打倒了'),
      el('p', { class: 'sub' }, won ? `撐過了全部 ${MAX_WAVES} 波！` : `撐到第 ${run.wave} 波`),
      el('div', { class: 'stat-row' },
        el('div', { class: 'stat-box' }, el('b', {}, `${q.correct}/${q.asked}`), el('small', {}, '答對題數')),
        el('div', { class: 'stat-box' }, el('b', {}, `${rate}%`), el('small', {}, '答對率')),
        el('div', { class: 'stat-box' }, el('b', {}, `Lv ${run.level}`), el('small', {}, '等級')),
      ),
      q.learned.size ? [el('div', { class: 'section-title' }, '這局答對的單字（點一下聽發音）'), wordChips(q.learned, 'good')] : null,
      q.missed.size ? [el('div', { class: 'section-title' }, '要再複習的單字'), wordChips(q.missed, 'bad')] : null,
      !q.asked ? el('p', { class: 'help' }, '下次在商店用「答題重骰」挑戰英文題目，可以換到更好的裝備喔！') : null,
      el('div', { class: 'row center' },
        el('button', { class: 'btn primary huge', type: 'button', onclick: onAgain }, '再玩一次'),
        el('button', { class: 'btn', type: 'button', onclick: onMenu }, '主選單'),
      ),
    ));
  mount(screen);
}
