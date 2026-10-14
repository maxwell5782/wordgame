// 用瀏覽器內建語音唸英文單字（免費，不需要錄音檔）
// 每台裝置內建的聲音不一樣：自動挑最自然的英文聲音，也可以在主選單「🔊 發音」自己選。
const VOICE_KEY = 'wordgame.voice';
let voice = null;
let englishVoices = [];
const listeners = new Set();

// 蘋果裝置內建的搞笑／特效聲音，唸起來很怪，不要自動選到
const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Hysterical|Deranged|Pipe Organ|Grandma|Grandpa|Rocko|Shelley|Sandy|Eddy|Flo|Reed|Fred|Junior|Ralph|Kathy|Princess/i;

function voiceScore(v) {
  let s = 0;
  if (/^en[-_]US/i.test(v.lang)) s += 30;
  else if (/^en[-_](GB|AU|CA|IE|NZ)/i.test(v.lang)) s += 20;
  else s += 10;
  if (/Natural|Neural|Online|Premium|Enhanced|Siri/i.test(v.name)) s += 25;
  if (/Google/i.test(v.name)) s += 20;
  if (/Samantha|Ava|Allison|Susan|Zoe|Aria|Jenny|Guy|Daniel|Karen|Moira/i.test(v.name)) s += 15;
  if (/Microsoft (David|Zira|Mark)/i.test(v.name) && !/Online|Natural/i.test(v.name)) s -= 10; // 舊版機器聲
  if (/eSpeak|compact/i.test(v.name + v.voiceURI)) s -= 30;
  if (NOVELTY.test(v.name)) s -= 100;
  if (v.localService) s += 2; // 不用網路，比較不會卡
  return s;
}

function loadVoices() {
  if (!canSpeak()) return;
  englishVoices = speechSynthesis.getVoices()
    .filter(v => /^en([-_]|$)/i.test(v.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
  const saved = savedVoiceURI();
  voice = (saved && englishVoices.find(v => v.voiceURI === saved)) || englishVoices[0] || null;
  listeners.forEach(fn => fn());
}

function savedVoiceURI() {
  try { return localStorage.getItem(VOICE_KEY); } catch { return null; }
}

if (canSpeak()) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// 給「🔊 發音」設定畫面用
export function getEnglishVoices() { return englishVoices; }
export function getVoice() { return voice; }
export function isAutoVoice() { return !savedVoiceURI(); }
export function onVoicesChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setVoice(uri) {
  try {
    if (uri) localStorage.setItem(VOICE_KEY, uri);
    else localStorage.removeItem(VOICE_KEY);
  } catch { /* 無痕模式存不了就算了 */ }
  loadVoices();
}

export function speak(text) {
  if (!canSpeak()) return;
  try {
    if (!englishVoices.length) loadVoices(); // 有些瀏覽器要第一次點擊後才有聲音清單
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang?.replace('_', '-') || 'en-US';
    if (voice) u.voice = voice;
    u.rate = 0.9; // 太慢會讓部分語音把字拉長變形
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    if (busy) speechSynthesis.cancel();
    // Chrome 剛 cancel 完馬上 speak，開頭的音常被吃掉（camera 變成 "mera"），稍等一下再唸
    if (busy) setTimeout(() => speechSynthesis.speak(u), 80);
    else speechSynthesis.speak(u);
  } catch {
    // 有些瀏覽器不支援，就安靜略過
  }
}
