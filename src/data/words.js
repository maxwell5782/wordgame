// 單字庫：en 英文、zh 中文、emoji 圖示、topic 主題
// 想新增單字，照同樣格式加一行即可（en 請用小寫、不要有空格）。
const RAW = {
  動物: [
    ['cat', '貓', '🐱'], ['dog', '狗', '🐶'], ['bird', '鳥', '🐦'], ['fish', '魚', '🐟'],
    ['pig', '豬', '🐷'], ['cow', '牛', '🐮'], ['duck', '鴨子', '🦆'], ['horse', '馬', '🐴'],
    ['rabbit', '兔子', '🐰'], ['tiger', '老虎', '🐯'], ['lion', '獅子', '🦁'], ['monkey', '猴子', '🐵'],
    ['bear', '熊', '🐻'], ['frog', '青蛙', '🐸'], ['snake', '蛇', '🐍'], ['sheep', '羊', '🐑'],
    ['panda', '熊貓', '🐼'], ['mouse', '老鼠', '🐭'], ['elephant', '大象', '🐘'], ['zebra', '斑馬', '🦓'],
  ],
  食物: [
    ['apple', '蘋果', '🍎'], ['banana', '香蕉', '🍌'], ['orange', '柳橙', '🍊'], ['grape', '葡萄', '🍇'],
    ['lemon', '檸檬', '🍋'], ['cake', '蛋糕', '🍰'], ['bread', '麵包', '🍞'], ['egg', '蛋', '🥚'],
    ['milk', '牛奶', '🥛'], ['rice', '飯', '🍚'], ['pizza', '披薩', '🍕'], ['candy', '糖果', '🍬'],
    ['cookie', '餅乾', '🍪'], ['water', '水', '💧'], ['juice', '果汁', '🧃'], ['carrot', '紅蘿蔔', '🥕'],
    ['corn', '玉米', '🌽'], ['tomato', '番茄', '🍅'],
  ],
  顏色: [
    ['red', '紅色', '🔴'], ['blue', '藍色', '🔵'], ['green', '綠色', '🟢'], ['yellow', '黃色', '🟡'],
    ['black', '黑色', '⚫'], ['white', '白色', '⚪'], ['purple', '紫色', '🟣'], ['brown', '棕色', '🟤'],
  ],
  身體: [
    ['eye', '眼睛', '👁️'], ['ear', '耳朵', '👂'], ['nose', '鼻子', '👃'], ['mouth', '嘴巴', '👄'],
    ['hand', '手', '✋'], ['foot', '腳', '🦶'], ['leg', '腿', '🦵'], ['tooth', '牙齒', '🦷'],
    ['arm', '手臂', '💪'],
  ],
  交通: [
    ['car', '汽車', '🚗'], ['bus', '公車', '🚌'], ['bike', '腳踏車', '🚲'], ['boat', '船', '⛵'],
    ['train', '火車', '🚆'], ['plane', '飛機', '✈️'], ['truck', '卡車', '🚚'], ['taxi', '計程車', '🚕'],
  ],
  物品: [
    ['book', '書', '📖'], ['ball', '球', '⚽'], ['cup', '杯子', '☕'], ['bag', '包包', '👜'],
    ['hat', '帽子', '🎩'], ['key', '鑰匙', '🔑'], ['bed', '床', '🛏️'], ['chair', '椅子', '🪑'],
    ['clock', '時鐘', '⏰'], ['phone', '電話', '📱'], ['door', '門', '🚪'], ['box', '盒子', '📦'],
    ['pencil', '鉛筆', '✏️'], ['shoe', '鞋子', '👟'], ['umbrella', '雨傘', '☂️'], ['gift', '禮物', '🎁'],
  ],
  自然: [
    ['sun', '太陽', '☀️'], ['moon', '月亮', '🌙'], ['star', '星星', '⭐'], ['tree', '樹', '🌳'],
    ['flower', '花', '🌸'], ['rain', '雨', '🌧️'], ['snow', '雪', '❄️'], ['fire', '火', '🔥'],
    ['cloud', '雲', '☁️'], ['sea', '海', '🌊'], ['mountain', '山', '⛰️'], ['leaf', '葉子', '🍃'],
  ],
};

export const WORDS = Object.entries(RAW).flatMap(([topic, list]) =>
  list.map(([en, zh, emoji]) => ({ en, zh, emoji, topic })));

export const TOPICS = Object.keys(RAW);
export const ALL_TOPICS = '全部';

export function wordsForTopic(topic) {
  return topic && topic !== ALL_TOPICS ? WORDS.filter(w => w.topic === topic) : WORDS;
}

export function findWord(en) {
  return WORDS.find(w => w.en === en);
}
