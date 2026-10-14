// 學習紀錄（存在這台裝置的瀏覽器裡）：答錯的單字進複習清單，答對過的單字進圖鑑，
// 在商店看過的武器和道具進裝備圖鑑。
import { wordsForTopic } from './data/words.js';

const KEY_REVIEW = 'wordgame.review';
const KEY_COLLECTION = 'wordgame.collection';
const KEY_TOPIC = 'wordgame.topic';
const KEY_LEVEL = 'wordgame.level';
const KEY_SEEN_GEAR = 'wordgame.seenGear';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 私密瀏覽或儲存空間被封鎖時就不存
  }
}

// review: { en: 還需要答對幾次才移出清單 }
const review = load(KEY_REVIEW, {});
const collection = new Set(load(KEY_COLLECTION, []));
const recent = [];
// 看過的武器／道具，格式為 'weapon:pistol'、'item:snack'
const seenGear = new Set(load(KEY_SEEN_GEAR, []));


export function getCollection() {
  return collection;
}

export function hasSeenGear(kind, id) {
  return seenGear.has(`${kind}:${id}`);
}

export function markGearSeen(kind, id) {
  const key = `${kind}:${id}`;
  if (seenGear.has(key)) return;
  seenGear.add(key);
  save(KEY_SEEN_GEAR, [...seenGear]);
}

export function getReviewWords() {
  return Object.keys(review);
}

export function getSavedTopic() {
  return load(KEY_TOPIC, null);
}

export function saveTopic(topic) {
  save(KEY_TOPIC, topic);
}

export function getSavedLevel() {
  return load(KEY_LEVEL, 0);
}

export function saveLevel(level) {
  save(KEY_LEVEL, level);
}

// 出題：約 40% 機率從複習清單挑，其餘從主題和程度裡隨機挑，並避開最近出過的字
export function pickWord(topic, level, filter = () => true) {
  const all = wordsForTopic(topic, level);
  const filtered = all.filter(filter);
  // 篩完沒有字（例如進階題全都太長）就不篩
  const pool = filtered.length ? filtered : all;
  const reviewPool = pool.filter(w => review[w.en] && !recent.includes(w.en));
  let choices = reviewPool.length && Math.random() < 0.4 ? reviewPool : pool.filter(w => !recent.includes(w.en));
  if (!choices.length) choices = pool;
  const word = choices[Math.floor(Math.random() * choices.length)];
  recent.push(word.en);
  if (recent.length > Math.min(10, Math.floor(pool.length / 2))) recent.shift();
  return word;
}

export function recordAnswer(word, correct, run) {
  run.quiz.asked += 1;
  if (correct) {
    run.quiz.correct += 1;
    run.quiz.learned.add(word.en);
    collection.add(word.en);
    if (review[word.en]) {
      review[word.en] -= 1;
      if (review[word.en] <= 0) delete review[word.en];
    }
  } else {
    run.quiz.missed.add(word.en);
    // 答錯要再答對 2 次才會移出複習清單
    review[word.en] = 2;
  }
  save(KEY_REVIEW, review);
  save(KEY_COLLECTION, [...collection]);
}
