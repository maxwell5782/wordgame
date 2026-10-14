// 主選單、升級、暫停、結算、圖鑑（單字／武器／道具）等畫面
import { WORDS, TOPICS, ALL_TOPICS, LEVELS, ALL_LEVELS, wordsForTopic, findWord } from '../data/words.js';
import { WEAPONS, WEAPON_IDS, weaponStats, weaponTraits, weaponTierExtras } from '../data/weapons.js';
import { ITEMS, itemDesc } from '../data/items.js';
import { RARITY, STATS, MAX_WAVES, MAX_REVIVES, REVIVE_HP, REVIVE_INVULN, applyEffects, formatStat } from '../state.js';
import { getCollection, getReviewWords, reviewRemaining, getSavedTopic, saveTopic, getSavedLevel, saveLevel, hasSeenGear } from '../progress.js';
import { speak, canSpeak, getEnglishVoices, getVoice, isAutoVoice, setVoice, onVoicesChanged } from '../speech.js';
import { el, mount, unmount, shuffle } from './dom.js';
import { DIFFICULTY, openQuiz } from './quiz.js';

export function showMenu({ onStart }) {
  let topic = getSavedTopic();
  if (topic !== ALL_TOPICS && !TOPICS.includes(topic)) topic = ALL_TOPICS;
  let level = getSavedLevel();
  if (level !== ALL_LEVELS && !LEVELS[level]) level = ALL_LEVELS;
  const screen = el('div', { class: 'screen menu' });
  // 字太少（少於 MIN_POOL 個）的主題＋程度組合不能選，免得一直出同一個字
  const MIN_POOL = 4;
  const levelOk = (t, l) => l === ALL_LEVELS || wordsForTopic(t, l).length >= MIN_POOL;

  const render = () => {
    if (!levelOk(topic, level)) level = ALL_LEVELS;
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
      el('div', { class: 'section-title' }, '選擇程度'),
      el('div', { class: 'topics' }, [ALL_LEVELS, 1, 2, 3].map(l =>
        el('button', {
          class: `btn chip-btn ${l === level ? 'on' : ''}`, type: 'button', disabled: !levelOk(topic, l),
          onclick: () => { level = l; saveLevel(l); render(); },
        }, `${l === ALL_LEVELS ? '全部' : LEVELS[l]} (${wordsForTopic(topic, l).length})`))),
      el('button', { class: 'btn primary huge', type: 'button', onclick: () => onStart(topic, level) }, '▶ 開始遊戲'),
      el('div', { class: 'row' },
        el('button', { class: 'btn', type: 'button', onclick: () => showCodex('words') }, `📖 單字圖鑑 ${coll.size}/${WORDS.length}`),
        el('button', { class: 'btn', type: 'button', onclick: () => showCodex('weapons') }, `⚔️ 武器道具圖鑑 ${gearSeenCount()}/${GEAR_TOTAL}`),
        el('button', { class: `btn ${review ? 'review-btn' : ''}`, type: 'button', onclick: () => showReview({ onClose: render }) }, `📝 複習單字 ${review}`),
        canSpeak() ? el('button', { class: 'btn', type: 'button', onclick: showVoices }, '🔊 發音') : null,
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
        }, el('span', { class: 'emoji' }, w.emoji), el('b', {}, has ? w.en : '？？？'), el('small', {}, `${w.zh}・${LEVELS[w.level]}`));
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
              const extra = weaponTierExtras(st);
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

// 複習：列出答錯過的單字，可以一個一個練習。答對的次數照一般規則扣，扣到 0 就移出清單。
function reviewList() {
  return getReviewWords().map(findWord).filter(Boolean);
}

// 每題輪流換題型；困難題（拼字）只考 7 個字母以內的字，沒有語音就不出聽力題
const PRACTICE_TYPES = ['easy', 'medium', 'listen', 'hard'];

function practiceType(word, i) {
  const types = PRACTICE_TYPES.filter(t => t !== 'listen' || canSpeak());
  const t = types[i % types.length];
  return t === 'hard' && word.en.length > 7 ? 'medium' : t;
}

async function practiceRound(words) {
  // 練習不算在任何一局裡，用一個只記答題數的假 run
  const run = { quiz: { asked: 0, correct: 0, learned: new Set(), missed: new Set() } };
  let cleared = 0;
  for (const [i, word] of shuffle(words).entries()) {
    const correct = await openQuiz(practiceType(word, i), run, {
      word,
      quitLabel: '✕ 結束練習',
      reward: '離移出複習清單更近一步',
      resultNote: ok => {
        const left = reviewRemaining(word.en);
        if (ok && !left) { cleared += 1; return '這個字已經移出複習清單！🎉'; }
        return ok ? `再答對 ${left} 次就能移出複習清單。` : `沒關係，再答對 ${left} 次就能移出複習清單。`;
      },
    });
    if (correct === null) break;
  }
  return { ...run.quiz, cleared };
}

export function showReview({ onClose } = {}) {
  const card = el('div', { class: 'card codex review' });
  let last = null; // 上一輪練習的結果
  const close = () => { unmount('review'); onClose?.(); };
  const start = async () => {
    last = await practiceRound(reviewList());
    render();
  };
  const render = () => {
    const words = reviewList();
    card.replaceChildren(
      el('div', { class: 'shop-head' },
        el('div', { class: 'title' }, `📝 待複習單字 (${words.length})`),
        el('button', { class: 'btn', type: 'button', onclick: close }, '關閉'),
      ),
      el('div', { class: 'codex-body' }, last?.asked ? el('p', { class: `review-last ${last.correct === last.asked ? 'good' : ''}` },
        `剛剛練習：答對 ${last.correct}/${last.asked} 題`, last.cleared ? `，${last.cleared} 個字移出清單 🎉` : '') : null,
      words.length ? [
        el('p', { class: 'help' }, '遊戲裡答錯的單字會放進這裡，每個字要再答對 2 次才會移出清單（練習時答錯會重新算）。點單字可以聽發音。'),
        el('button', { class: 'btn primary huge', type: 'button', onclick: start }, `▶ 開始練習（${words.length} 題）`),
        el('div', { class: 'codex-grid' }, words.map(w => {
          const left = reviewRemaining(w.en);
          return el('button', { class: 'codex-word has review-word', type: 'button', onclick: () => speak(w.en) },
            el('span', { class: 'emoji' }, w.emoji), el('b', {}, w.en), el('small', {}, w.zh),
            el('small', { class: 'left' }, `還要答對 ${left} 次`));
        })),
      ] : el('p', { class: 'help review-empty' }, last?.asked
        ? '全部複習完了，清單清空！🎉'
        : '目前沒有待複習的單字。遊戲裡答錯的字會自動放進這裡。')),
    );
    card.scrollTop = 0;
  };
  render();
  mount(el('div', { class: 'screen modal' }, card), 'review');
}

// 選擇唸單字的聲音：每台裝置內建的聲音不同，有些唸起來很怪，可以在這裡換
const VOICE_SAMPLES = ['camera', 'banana', 'elephant', 'computer'];

export function showVoices() {
  const card = el('div', { class: 'card codex voices' });
  let sample = 0;
  const off = onVoicesChanged(() => render());
  const close = () => { off(); unmount('voices'); };
  const test = () => { speak(VOICE_SAMPLES[sample]); sample = (sample + 1) % VOICE_SAMPLES.length; };
  const render = () => {
    const voices = getEnglishVoices();
    const cur = getVoice();
    const auto = isAutoVoice();
    card.replaceChildren(
      el('div', { class: 'shop-head' },
        el('div', { class: 'title' }, '🔊 選擇發音'),
        el('button', { class: 'btn', type: 'button', onclick: close }, '關閉'),
      ),
      el('div', { class: 'codex-body' },
        el('p', { class: 'help' }, '發音是用這台裝置內建的英文聲音。如果聽起來怪怪的，換一個聲音試試看，點一下就會唸「camera」等單字。'),
        el('button', { class: 'btn primary', type: 'button', onclick: test }, `▶ 試聽（目前：${cur ? cur.name : '系統預設'}）`),
        el('div', { class: 'voice-list' },
          el('button', {
            class: `btn chip-btn ${auto ? 'on' : ''}`, type: 'button',
            onclick: () => { setVoice(null); test(); },
          }, `⭐ 自動挑選${auto && cur ? `（${cur.name}）` : ''}`),
          voices.map(v => el('button', {
            class: `btn chip-btn ${!auto && v === cur ? 'on' : ''}`, type: 'button',
            onclick: () => { setVoice(v.voiceURI); test(); },
          }, `${v.name} · ${v.lang}`)),
        ),
        voices.length ? null : el('p', { class: 'help' }, '這台裝置沒有找到英文聲音，會用系統預設的聲音唸。'),
      ),
    );
  };
  render();
  mount(el('div', { class: 'screen modal' }, card), 'voices');
}

function rollLevelTier(level) {
  const r = Math.random();
  if (level >= 8 && r < 0.05) return 3;
  if (level >= 4 && r < 0.18) return 2;
  if (r < 0.45) return 1;
  return 0;
}

// 升級：四選一能力。選之前可以答一題中等題，答對四個選項都升一階。回傳 Promise，選完 resolve。
export const LEVELUP_QUIZ = 'medium';

export function showLevelUp(run) {
  return new Promise(resolve => {
    const keys = Object.keys(STATS).sort(() => Math.random() - 0.5).slice(0, 4);
    const options = keys.map(k => ({ key: k, tier: rollLevelTier(run.level) }));
    let quizState = 'ready'; // ready → busy → good / bad
    const card = el('div', { class: 'card levelup' });

    const askQuiz = async () => {
      quizState = 'busy';
      render();
      const correct = await openQuiz(LEVELUP_QUIZ, run, {
        reward: '四個能力選項都升一階（答錯選項不變）',
        resultNote: ok => ok ? '四個能力選項都升一階！' : '這次選項不變，這個字會放進複習清單。',
      });
      if (correct) for (const o of options) o.tier = Math.min(3, o.tier + 1);
      quizState = correct ? 'good' : 'bad';
      render();
    };

    const render = () => {
      card.replaceChildren(
        el('div', { class: 'title' }, `⬆️ 升級了！（Lv ${run.level - run.pendingLevels + 1}）`),
        el('p', { class: 'help' }, '選一個能力'),
        el('div', { class: 'offers' }, options.map(o => {
          const value = STATS[o.key].levelUp[o.tier];
          return el('button', {
            class: `offer pickable ${RARITY[o.tier].css}`, type: 'button', disabled: quizState === 'busy',
            onclick: () => { applyEffects(run, { [o.key]: value }); unmount('levelup'); resolve(); },
          },
          el('div', { class: 'icon' }, STATS[o.key].icon),
          el('div', { class: 'name' }, STATS[o.key].name),
          el('div', { class: 'rarity' }, RARITY[o.tier].name),
          el('div', { class: 'desc' }, formatStat(o.key, value)));
        })),
        quizState === 'good' ? el('div', { class: 'chip good' }, '答對了！選項都升一階了 🎉')
          : quizState === 'bad' ? el('div', { class: 'chip bad' }, '答錯了，選項不變')
          : el('button', { class: `btn diff d-${LEVELUP_QUIZ} levelup-quiz`, type: 'button', disabled: quizState === 'busy', onclick: askQuiz },
            el('b', {}, `📝 答${DIFFICULTY[LEVELUP_QUIZ].name}題：四個選項都升一階`),
            el('small', {}, `${DIFFICULTY[LEVELUP_QUIZ].desc}，答錯選項不變（每次升級一題）`)),
      );
    };
    render();
    mount(el('div', { class: 'screen modal' }, card), 'levelup');
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

export function canRevive(run) {
  return run.revives < MAX_REVIVES;
}

// 倒下時：選難度答一題，答對就接關（難度越高回越多血）。回傳 Promise，答對時給回復比例，否則 0。
export function showRevive(run) {
  return new Promise(resolve => {
    const left = MAX_REVIVES - run.revives;
    const pick = async key => {
      unmount('revive');
      run.revives += 1;
      const pct = REVIVE_HP[key];
      const correct = await openQuiz(key, run, {
        reward: `接關，回復 ${Math.round(pct * 100)}% 生命、無敵 ${REVIVE_INVULN} 秒（答錯就結算）`,
        resultNote: ok => ok ? `接關成功！回復 ${Math.round(pct * 100)}% 生命，無敵 ${REVIVE_INVULN} 秒` : '這次沒有接關，這個字會放進複習清單。',
      });
      resolve(correct ? pct : 0);
    };
    const screen = el('div', { class: 'screen modal' },
      el('div', { class: 'card revive' },
        el('div', { class: 'title' }, '💥 你倒下了！'),
        el('p', { class: 'help' }, `答對一題英文就能接關（這局還剩 ${left} 次）。題目越難，回越多血。`),
        el('div', { class: 'reroll-btns' }, Object.entries(DIFFICULTY).map(([key, d]) =>
          el('button', { class: `btn diff d-${key}`, type: 'button', onclick: () => pick(key) },
            el('b', {}, d.name),
            el('small', {}, d.desc),
            el('small', {}, `回復 ${Math.round(REVIVE_HP[key] * 100)}% 生命`)))),
        el('button', { class: 'btn', type: 'button', onclick: () => { unmount('revive'); resolve(0); } }, '放棄，看結算'),
      ));
    mount(screen, 'revive');
  });
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
