// 用瀏覽器內建語音唸英文單字（免費，不需要錄音檔）
let voice = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v => /en[-_]US/i.test(v.lang) && /Google|Samantha|Microsoft|Siri/i.test(v.name))
    || voices.find(v => /en[-_]US/i.test(v.lang))
    || voices.find(v => /^en/i.test(v.lang))
    || null;
}

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function canSpeak() {
  return 'speechSynthesis' in window;
}

export function speak(text) {
  if (!canSpeak()) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.8;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  } catch {
    // 有些瀏覽器不支援，就安靜略過
  }
}
