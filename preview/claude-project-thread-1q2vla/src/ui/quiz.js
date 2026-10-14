// 重骰時的英文單字題目。三種難度：
//   easy   看圖、聽發音，從 4 個英文單字選一個
//   medium 看中文，從 4 個拼法中選出正確的
//   hard   看中文、聽發音，用字母方塊拼出單字
//   listen 只聽發音，從 4 個英文單字選一個（每波開始的聽力題，不放在重骰按鈕裡）
import { WORDS, wordsForTopic } from '../data/words.js';
import { pickWord, recordAnswer } from '../progress.js';
import { speak, canSpeak } from '../speech.js';
import { el, mount, unmount, sample, shuffle } from './dom.js';

export const DIFFICULTY = {
  easy: { name: '簡單', desc: '看圖選單字', guarantee: 0 },
  medium: { name: '中等', desc: '選出正確拼字', guarantee: 1 },
  hard: { name: '困難', desc: '自己拼出單字', guarantee: 2 },
};

// 不在重骰選單裡的題型
const OTHER_QUIZ = {
  listen: { name: '聽力', desc: '聽發音選單字', guarantee: 0 },
};

// 常見短英文字：產生錯誤拼字時避開它們，免得「錯誤選項」其實是別的真單字
const COMMON = new Set(`a an and any are art ask ate act add age ago air all ant ape arm ear eat end eye ice ill ink its
bad bag ban bar bat bed bee beg bet bid big bin bit bow box boy bud bug bun bus but buy bye cab can cap car cat cop cot
cow cry cub cud cup cut dad day den dew did die dig dim dip dog dot dry due dug dye fan far fat fed few fig fin fit fix
fly fog for fox fry fun fur gap gas get got gum gun guy had ham has hat hen her hid him hip his hit hog hop hot how hug
hum hut ink jam jar jet jog joy key kid kit lab lad lag lap law lay led leg let lid lie lip lit log lot low mad man map
mat may men met mix mob mom mop mud mug nap net new nod nor not now nut oak odd off oil old one our out owl own pad pal
pan pat paw pay pea peg pen pet pie pig pin pit pop pot put rag ram ran rat raw red rib rid rim rip rob rod rot row rub
rug run sad sat saw say sea see set sew she shy sin sip sit six ski sky sly sob son soy spy sum sun tab tag tan tap tar
tea ten the tie tin tip toe tom ton too top toy try tub tug two use van vet war was wax way web wed wet who why wig win
wit won wow yak yam yes yet you zip zoo
able bake ball band bank bark barn bead beam bean bear beat bell belt bend best bike bill bird bite blow boat body bold
bolt bone book boot bore born boss bowl bulb bull burn bush busy cake call calm came camp cane card care cart case cash
cast cave chin chip city clap clay clip club coal coat code coin cold come cone cook cool cope copy cord core corn cost
crab crew crop cube cure curl cute dame damp dare dark dart dash date dawn dead deaf deal dear deck deep deer desk dial
dice died diet dime dine dirt dish dive dock does doll dome done door dose dove down drag draw drew drip drop drum duck
dull dust duty each earn ease east easy edge else even ever face fact fade fail fair fall fame farm fast fate fear feed
feel feet fell felt file fill film find fine fire firm fish fist five flag flat fled flew flip flow foam fold folk fond
food fool foot fork form fort four free frog from fuel full fund gain game gate gave gear gift girl give glad glow glue
goal goat gold golf gone good gown grab gray grew grin grip grow gulf hair half hall hand hang hard harm hate have hawk
head heal heap hear heat held hell help herb here hero hide high hike hill hint hire hold hole holy home hood hook hope
horn hose host hour huge hung hunt hurt idea inch iron item jail joke jump june junk just keen keep kept kick kind king
kiss kite knee knew knit knot know lace lack lady laid lake lamb lamp land lane last late lawn lazy lead leaf leak lean
leap left lend lens less lick life lift like lime line link lion list live load loaf loan lock long look loop lord lose
loss lost loud love luck lung made mail main make male mall many mark mask mass mate meal mean meat meet melt menu mere
mess mild mile milk mind mine miss mist mode mole mood moon more most move much must nail name near neat neck need nest
news next nice nine node none noon nose note okay once only open oven over pace pack page paid pain pair pale palm park
part pass past path peak pear peel pick pile pill pine pink pipe plan play plot plug plus poem pole poll pond pool poor
pork port pose post pour pull pump pure push race rack rage rail rain rank rare rate read real rear rely rent rest rice
rich ride ring rise risk road roar rock role roll roof room root rope rose rude rule rush safe sail sake sale salt same
sand save seal seat seed seek seem seen self sell send shed ship shoe shop shot show shut sick side sigh sign silk sing
sink site size skin slip slow snap snow soap sock soft soil sold sole some song soon sort soul soup sour spin spot star
stay stem step stir stop such suit sure swim tail take tale talk tall tank tape task team tear tell tend tent term test
text than that them then they thin this tide tidy tile time tiny tire toad told toll tone took tool tour town tray tree
trip true tube tune turn twin type unit upon used vary vast very view vote wade wage wait wake walk wall want warm wash
wave weak wear week well went were west what when whip wide wife wild will wind wine wing wire wise wish with wolf wood
wool word wore work worm wrap yard yarn year yell your zero zone`.split(/\s+/).filter(Boolean));
for (const w of WORDS) COMMON.add(w.en);

const VOWELS = 'aeiou';
const LOOKALIKE = { b: 'd', d: 'b', p: 'q', q: 'p', m: 'n', n: 'm', c: 'k', k: 'c', s: 'z', z: 's', i: 'e', e: 'i', a: 'e', o: 'u', u: 'o' };

function misspell(word) {
  const i = Math.floor(Math.random() * word.length);
  const ch = word[i];
  switch (Math.floor(Math.random() * 5)) {
    case 0: // 相鄰字母對調
      if (i < word.length - 1 && word[i] !== word[i + 1]) return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
      return null;
    case 1: // 母音換掉
      if (VOWELS.includes(ch)) {
        const v = VOWELS.replace(ch, '')[Math.floor(Math.random() * 4)];
        return word.slice(0, i) + v + word.slice(i + 1);
      }
      return null;
    case 2: // 某個字母重複
      return word.slice(0, i + 1) + ch + word.slice(i + 1);
    case 3: // 少一個字母
      if (word.length > 3) return word.slice(0, i) + word.slice(i + 1);
      return null;
    default: // 長得像的字母
      if (LOOKALIKE[ch]) return word.slice(0, i) + LOOKALIKE[ch] + word.slice(i + 1);
      return null;
  }
}

function wrongSpellings(word, n) {
  const out = new Set();
  for (let tries = 0; out.size < n && tries < 300; tries++) {
    const w = misspell(word);
    if (w && w !== word && !COMMON.has(w)) out.add(w);
  }
  return [...out];
}

function distractorWords(word, n) {
  const same = wordsForTopic(word.topic).filter(w => w.en !== word.en);
  const picks = sample(same, n);
  if (picks.length < n) {
    const rest = WORDS.filter(w => w.en !== word.en && !picks.includes(w));
    picks.push(...sample(rest, n - picks.length));
  }
  return picks;
}

function speakButton(word) {
  if (!canSpeak()) return null;
  return el('button', { class: 'btn speak', type: 'button', 'aria-label': '聽發音', onclick: () => speak(word.en) }, '🔊');
}

// 回傳 Promise<boolean>：答對 true，答錯 false
// reward：題目畫面上寫的「答對可以得到什麼」（給 null 就不顯示）；resultNote(correct)：答題後的說明文字（兩個預設都是重骰用的）
// word 指定要考哪個字（複習練習用）；quitLabel 有給的話會多一個中途離開的按鈕，按了 resolve(null)
export function openQuiz(difficulty, run, { reward, resultNote, word: fixedWord, quitLabel } = {}) {
  return new Promise(resolve => {
    // 困難題避開太長的字
    const filter = difficulty === 'hard' ? w => w.en.length <= 7 : () => true;
    const word = fixedWord ?? pickWord(run.topic, run.wordLevel, filter);
    const diff = DIFFICULTY[difficulty] ?? OTHER_QUIZ[difficulty];

    const finish = correct => {
      recordAnswer(word, correct, run);
      speak(word.en);
      const box = el('div', { class: `quiz-result ${correct ? 'good' : 'bad'}` },
        el('div', { class: 'big' }, correct ? '答對了！🎉' : '再加油！💪'),
        el('div', { class: 'answer' }, el('span', { class: 'emoji' }, word.emoji), ' ', el('b', {}, word.en), ` ＝ ${word.zh}`),
        speakButton(word),
        el('div', { class: 'note' }, resultNote ? resultNote(correct) : correct
          ? (diff.guarantee ? `重骰保證出現${diff.guarantee === 1 ? '藍裝 🔵' : '紫裝 🟣'}！` : '重骰完成！')
          : '這次是一般重骰，這個字會放進複習清單。'),
        el('button', { class: 'btn primary', type: 'button', onclick: () => { unmount('quiz'); resolve(correct); } }, '繼續'),
      );
      card.replaceChildren(box);
    };

    let body;
    if (difficulty === 'listen') {
      const options = shuffle([word, ...distractorWords(word, 3)]);
      body = [
        el('div', { class: 'prompt' }, '聽聽看，是哪個單字？'),
        el('button', { class: 'btn speak listen-btn', type: 'button', 'aria-label': '再聽一次', onclick: () => speak(word.en) }, '🔊'),
        el('div', { class: 'options' }, options.map(o =>
          el('button', { class: 'btn option', type: 'button', onclick: () => finish(o.en === word.en) }, o.en))),
      ];
      setTimeout(() => speak(word.en), 250);
    } else if (difficulty === 'easy') {
      const options = shuffle([word, ...distractorWords(word, 3)]);
      body = [
        el('div', { class: 'prompt' }, '這是哪個英文單字？'),
        el('div', { class: 'picture' }, word.emoji),
        speakButton(word),
        el('div', { class: 'options' }, options.map(o =>
          el('button', { class: 'btn option', type: 'button', onclick: () => finish(o.en === word.en) }, o.en))),
      ];
      setTimeout(() => speak(word.en), 250);
    } else if (difficulty === 'medium') {
      const options = shuffle([word.en, ...wrongSpellings(word.en, 3)]);
      body = [
        el('div', { class: 'prompt' }, '哪個拼字是對的？'),
        el('div', { class: 'meaning' }, el('span', { class: 'emoji' }, word.emoji), ' ', word.zh),
        el('div', { class: 'options' }, options.map(o =>
          el('button', { class: 'btn option', type: 'button', onclick: () => finish(o === word.en) }, o))),
      ];
    } else {
      const extra = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !word.en.includes(c));
      const letters = shuffle([...word.en.split(''), ...sample(extra, 2)]).map((c, i) => ({ c, i, used: false }));
      const typed = [];
      const slots = el('div', { class: 'slots' });
      const tiles = el('div', { class: 'tiles' });
      const okBtn = el('button', { class: 'btn primary', type: 'button', onclick: () => finish(typed.map(t => t.c).join('') === word.en) }, '確定');
      const render = () => {
        slots.replaceChildren(...word.en.split('').map((_, i) => {
          const t = typed[i];
          return el('button', {
            class: `slot ${t ? 'filled' : ''}`, type: 'button',
            onclick: () => { if (t) { typed.splice(i, 1); t.used = false; render(); } },
          }, t ? t.c : '');
        }));
        tiles.replaceChildren(...letters.map(t => el('button', {
          class: 'btn tile', type: 'button', disabled: t.used || typed.length >= word.en.length,
          onclick: () => { t.used = true; typed.push(t); render(); },
        }, t.c)));
        okBtn.disabled = typed.length !== word.en.length;
      };
      render();
      body = [
        el('div', { class: 'prompt' }, '拼出這個單字'),
        el('div', { class: 'meaning' }, el('span', { class: 'emoji' }, word.emoji), ' ', word.zh, speakButton(word)),
        slots,
        tiles,
        el('div', { class: 'row' },
          el('button', { class: 'btn', type: 'button', onclick: () => { const t = typed.pop(); if (t) t.used = false; render(); } }, '⌫ 退回'),
          okBtn),
      ];
      setTimeout(() => speak(word.en), 250);
    }

    const card = el('div', { class: 'card quiz' },
      quitLabel ? el('button', { class: 'btn quiz-quit', type: 'button', onclick: () => { unmount('quiz'); resolve(null); } }, quitLabel) : null,
      el('div', { class: `quiz-tag d-${difficulty}` }, `${diff.name}題 · ${diff.desc}`),
      reward === null ? null : el('div', { class: 'quiz-reward' }, `🎁 答對：${reward ?? (diff.guarantee ? `重骰保證出現${diff.guarantee === 1 ? '藍裝 🔵' : '紫裝 🟣'}` : '重骰商店')}`),
      body);
    mount(el('div', { class: 'screen modal' }, card), 'quiz');
  });
}
