// 主選單、升級、暫停、結算、圖鑑（單字／武器／道具）等畫面
import { WORDS, TOPICS, ALL_TOPICS, wordsForTopic, findWord } from '../data/words.js';
import { WEAPONS, WEAPON_IDS, weaponStats, weaponTraits } from '../data/weapons.js';
import { ITEMS, itemDesc } from '../data/items.js';
import { RARITY, STATS, MAX_WAVES, applyEffects, formatStat } from '../state.js';
import { getCollection, getReviewWords, getSavedTopic, saveTopic, hasSeenGear } from '../progress.js';
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
        el('button', { class: 'btn', type: 'button', onclick: () => showCodex('words') }, `📖 單字圖鑑 ${coll.size}/${WORDS.length}`),
        el('button', { class: 'btn', type: 'button', onclick: () => showCodex('weapons') }, `⚔️ 武器道具圖鑑 ${gearSeenCount()}/${GEAR_TOTAL}`),
        review ? el('span', { class: 'chip bad' }, `📝 待複習 ${review} 個字`) : null,
      ),
      el('p', { class: 'help' }, '移動：按住畫面任意處拖曳（電腦也可以用 WASD 或方向鍵）。武器會自動攻擊。'),
    ));
  };
  render();
  mount(screen);
}

const GEAR_TOTAL = WEAPON_IDS.length + ITEMS.length;

function gearSeenCount() {
  return WEAPON_IDS.filter(id => hasSeenGear('weapon', id)).length
    + ITEMS.filter(i => hasSeenGear('item', i.id)).length;
}

const NO_STATS = Object.fromEntries(Object.keys(STATS).map(k => [k, 0]));

function codexWords() {
  const coll = getCollection();
  return [
    el('p', { class: 'help' }, `已收集 ${coll.size}/${WORDS.length}。在題目中答對過的單字會被收集起來，點一下可以聽發音。`),
    TOPICS.map(t => [
      el('div', { class: 'section-title' }, t),
      el('div', { class: 'codex-grid' }, wordsForTopic(t).map(w => {
        const has = coll.has(w.en);
        return el('button', {
          class: `codex-word ${has ? 'has' : ''}`, type: 'button', onclick: () => has && speak(w.en),
        }, el('span', { class: 'emoji' }, w.emoji), el('b', {}, has ? w.en : '？？？'), el('small', {}, w.zh));
      })),
    ]),
  ];
}

function lockedGear(kind) {
  return el('div', { class: 'gear-card locked' },
    el('div', { class: 'icon' }, '❔'),
    el('div', { class: 'gear-body' },
      el('div', { class: 'name' }, '？？？'),
      el('div', { class: 'desc' }, `在商店看過這個${kind}就會解鎖`)));
}

function codexWeapons() {
  const seen = WEAPON_IDS.filter(id => hasSeenGear('weapon', id)).length;
  return [
    el('p', { class: 'help' }, `已發現 ${seen}/${WEAPON_IDS.length}。武器會自動攻擊，兩把同名同階的武器可以合成下一階。`),
    el('div', { class: 'gear-grid' }, WEAPON_IDS.map(id => {
      if (!hasSeenGear('weapon', id)) return lockedGear('武器');
      const d = WEAPONS[id];
      return el('div', { class: 'gear-card' },
        el('div', { class: 'icon' }, d.icon),
        el('div', { class: 'gear-body' },
          el('div', { class: 'name' }, d.name),
          el('div', { class: 'desc' }, d.desc),
          el('div', { class: 'desc' }, weaponTraits(weaponStats({ id, tier: 0 }, NO_STATS)).join(' · ')),
          el('table', { class: 'tier-table' },
            el('tr', {}, el('th', {}, '階級'), el('th', {}, '傷害'), el('th', {}, '間隔'), el('th', {}, '特性')),
            RARITY.map((r, tier) => {
              const st = weaponStats({ id, tier }, NO_STATS);
              const extra = [];
              if (st.pellets > 1) extra.push(`${st.pellets} 發`);
              if (st.pierce > 0) extra.push(`穿透 ${st.pierce}`);
              return el('tr', { class: r.css },
                el('td', { class: 'tier-name' }, r.name), el('td', {}, st.damage),
                el('td', {}, `${st.cooldown.toFixed(2)} 秒`), el('td', {}, extra.join('、') || '—'));
            }))));
    })),
  ];
}

function codexItems() {
  const seen = ITEMS.filter(i => hasSeenGear('item', i.id)).length;
  return [
    el('p', { class: 'help' }, `已發現 ${seen}/${ITEMS.length}。道具買了就永久加能力，可以重複購買疊加。`),
    RARITY.map((r, tier) => {
      const list = ITEMS.filter(i => i.tier === tier);
      if (!list.length) return null;
      return [
        el('div', { class: 'section-title' }, `${r.name}道具`),
        el('div', { class: 'gear-grid' }, list.map(it => {
          if (!hasSeenGear('item', it.id)) return lockedGear('道具');
          return el('div', { class: `gear-card ${r.css}` },
            el('div', { class: 'icon' }, it.icon),
            el('div', { class: 'gear-body' },
              el('div', { class: 'name' }, it.name),
              el('div', { class: 'desc' }, itemDesc(it))));
        })),
      ];
    }),
  ];
}

const CODEX_TABS = {
  words: { label: '📖 單字', render: codexWords },
  weapons: { label: '⚔️ 武器', render: codexWeapons },
  items: { label: '🎒 道具', render: codexItems },
};

export function showCodex(tab = 'words') {
  const card = el('div', { class: 'card codex' });
  const render = () => {
    card.replaceChildren(
      el('div', { class: 'shop-head' },
        el('div', { class: 'title' }, '圖鑑'),
        el('button', { class: 'btn', type: 'button', onclick: () => unmount('codex') }, '關閉'),
      ),
      el('div', { class: 'tabs' }, Object.entries(CODEX_TABS).map(([key, t]) =>
        el('button', {
          class: `btn chip-btn ${key === tab ? 'on' : ''}`, type: 'button',
          onclick: () => { tab = key; render(); card.scrollTop = 0; },
        }, t.label))),
      el('div', { class: 'codex-body' }, CODEX_TABS[tab].render()),
    );
  };
  render();
  mount(el('div', { class: 'screen modal' }, card), 'codex');
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

// 回主選單按鈕：按兩次才離開，避免小朋友誤觸
export function quitButton(onQuit, disabled = false) {
  return el('button', {
    class: 'btn', type: 'button', disabled,
    onclick: e => {
      const b = e.currentTarget;
      if (b.dataset.armed) { onQuit(); return; }
      b.dataset.armed = '1';
      b.classList.add('armed');
      b.textContent = '再按一次放棄這局';
    },
  }, '🏠 回主選單');
}

export function showPause({ onResume, onQuit }) {
  const screen = el('div', { class: 'screen modal' },
    el('div', { class: 'card pause' },
      el('div', { class: 'title' }, '⏸ 暫停中'),
      el('button', { class: 'btn primary huge', type: 'button', onclick: () => { unmount('pause'); onResume(); } }, '▶ 繼續'),
      el('button', { class: 'btn', type: 'button', onclick: () => showCodex('weapons') }, '📚 圖鑑'),
      quitButton(() => { unmount('pause'); onQuit(); }),
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
