// 音樂與音效：全部用 Web Audio 即時合成（8-bit 晶片音樂風格），不需要任何音檔。
// 唸英文單字時，音樂和音效會自動變小聲，不會蓋過發音。
const SETTINGS_KEY = 'wordgame.audio';
const DEFAULTS = { music: 0.6, sfx: 0.8, muted: false };

let settings = loadSettings();
let ctx = null;
let master, musicBus, musicDuck, sfxBus, sfxDuck, noiseBuf, pulseWave;

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return { ...DEFAULTS, ...(s && typeof s === 'object' ? s : {}) };
  } catch { return { ...DEFAULTS }; }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* 無痕模式存不了就算了 */ }
}

// 音量曲線：滑桿 0~1 換成比較符合耳朵感覺的大小
const curve = v => v * v;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  musicDuck = ctx.createGain();
  musicDuck.connect(master);
  musicBus = ctx.createGain();
  musicBus.connect(musicDuck);
  sfxDuck = ctx.createGain();
  sfxDuck.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.connect(sfxDuck);
  applyVolumes();
  // 白噪音（鼓、爆炸用）
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // 25% 脈衝波：紅白機那種「嗶嗶」的聲音
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
  pulseWave = ctx.createPeriodicWave(real, imag);
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.02);
  musicBus.gain.setTargetAtTime(curve(settings.music) * 0.5, t, 0.02);
  sfxBus.gain.setTargetAtTime(curve(settings.sfx), t, 0.02);
}

// 瀏覽器規定要使用者先點一下才能出聲音
function unlock() {
  if (!ensureCtx()) return;
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
  if (wantTrack && !timer) startScheduler();
}
for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { capture: true });
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
});

const ready = () => ctx && ctx.state === 'running' && !settings.muted;

// ---------- 設定 ----------

export function getAudioSettings() { return { ...settings }; }
export function setAudioSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings();
  applyVolumes();
}

// ---------- 躲開發音（ducking） ----------
// 好幾個原因可以同時讓音樂變小聲，取最小的那個
const musicDucks = new Map();
const sfxDucks = new Map();

function updateDucks() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const m = Math.min(1, ...musicDucks.values());
  const s = Math.min(1, ...sfxDucks.values());
  musicDuck.gain.setTargetAtTime(m, t, m < 1 ? 0.05 : 0.25);
  sfxDuck.gain.setTargetAtTime(s, t, s < 1 ? 0.03 : 0.2);
}

export function duck(reason, musicLevel, sfxLevel = 1) {
  musicDucks.set(reason, musicLevel);
  sfxDucks.set(reason, sfxLevel);
  updateDucks();
}

export function unduck(reason) {
  musicDucks.delete(reason);
  sfxDucks.delete(reason);
  updateDucks();
}

// speech.js 唸單字時呼叫：唸完（或最多 4 秒後）恢復音量
let speechId = 0;
let speechTimer = null;
export function speechStarted() {
  const id = ++speechId;
  duck('speech', 0.12, 0.3);
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => speechEnded(id), 4000);
  return id;
}
export function speechEnded(id) {
  if (id !== speechId) return; // 已經在唸下一個字了
  clearTimeout(speechTimer);
  unduck('speech');
}

// ---------- 小工具 ----------

const midiHz = m => 440 * 2 ** ((m - 69) / 12);
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  return NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
}

function osc(type, freq, t, dur, vol, out, { to, attack = 0.005, release = 0.03 } = {}) {
  const o = ctx.createOscillator();
  if (type === 'pulse') o.setPeriodicWave(pulseWave);
  else o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(t, dur, vol, out, { type = 'lowpass', freq = 2000, to, q = 1 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

// ---------- 音效 ----------

// list 裡的空字串是休止符
const notes = (list, type, step, vol, out, t) =>
  list.forEach((n, i) => { if (n) osc(type, midiHz(noteMidi(n)), t + i * step, step * 1.1, vol, out); });

const SFX = {
  pistol: (t, o) => osc('pulse', 1100, t, 0.07, 0.10, o, { to: 380 }),
  shotgun: (t, o) => { noise(t, 0.16, 0.30, o, { freq: 2500, to: 400 }); osc('square', 200, t, 0.08, 0.06, o, { to: 70 }); },
  knife: (t, o) => noise(t, 0.07, 0.14, o, { type: 'bandpass', freq: 3500, to: 7000, q: 3 }),
  bazooka: (t, o) => { noise(t, 0.30, 0.18, o, { type: 'bandpass', freq: 900, to: 200, q: 2 }); osc('sawtooth', 150, t, 0.18, 0.08, o, { to: 55 }); },
  hit: (t, o) => osc('square', 320, t, 0.04, 0.05, o, { to: 160 }),
  kill: (t, o) => osc('pulse', 500, t, 0.08, 0.08, o, { to: 1000 }),
  explode: (t, o) => { noise(t, 0.5, 0.45, o, { freq: 1500, to: 80 }); osc('triangle', 110, t, 0.3, 0.25, o, { to: 35 }); },
  pickup: (t, o) => { osc('pulse', 1320, t, 0.035, 0.05, o); osc('pulse', 1760, t + 0.035, 0.05, 0.05, o); },
  hurt: (t, o) => { osc('sawtooth', 260, t, 0.2, 0.16, o, { to: 70 }); noise(t, 0.1, 0.12, o, { freq: 1200 }); },
  levelup: (t, o) => notes(['C5', 'E5', 'G5', 'C6', 'E6'], 'pulse', 0.06, 0.10, o, t),
  wave: (t, o) => notes(['G4', 'C5'], 'pulse', 0.1, 0.10, o, t),
  waveClear: (t, o) => notes(['C5', 'E5', 'G5', 'E5', 'G5', 'C6'], 'pulse', 0.075, 0.10, o, t),
  bossWarn: (t, o) => { for (let i = 0; i < 3; i++) osc('sawtooth', 220, t + i * 0.42, 0.38, 0.12, o, { to: 440 }); },
  bossKill: (t, o) => {
    noise(t, 0.9, 0.5, o, { freq: 2000, to: 60 });
    notes(['C5', 'C5', 'C5', 'G5', '', 'E5', 'G5', 'C6'], 'pulse', 0.11, 0.11, o, t + 0.4);
  },
  death: (t, o) => notes(['G4', 'F#4', 'F4', 'E4', 'Eb4', 'D4'], 'square', 0.12, 0.10, o, t),
  revive: (t, o) => notes(['C4', 'G4', 'C5', 'E5', 'G5', 'C6'], 'triangle', 0.05, 0.22, o, t),
  correct: (t, o) => { osc('pulse', midiHz(76), t, 0.09, 0.10, o); osc('pulse', midiHz(84), t + 0.09, 0.25, 0.10, o); },
  wrong: (t, o) => { osc('square', 196, t, 0.14, 0.08, o); osc('square', 147, t + 0.15, 0.28, 0.08, o); },
  buy: (t, o) => { osc('pulse', midiHz(83), t, 0.06, 0.09, o); osc('pulse', midiHz(88), t + 0.06, 0.18, 0.09, o); },
  error: (t, o) => osc('square', 110, t, 0.15, 0.08, o),
  click: (t, o) => osc('pulse', 1800, t, 0.025, 0.04, o),
  win: (t, o) => notes(['C5', 'E5', 'G5', 'C6', '', 'A5', 'B5', 'C6', 'C6'], 'pulse', 0.13, 0.11, o, t),
  lose: (t, o) => notes(['E4', 'D4', 'C4', '', 'C3'], 'triangle', 0.22, 0.25, o, t),
};

// 同一種聲音太密集時（6 把槍一起射）跳過一些，免得糊成一團
const MIN_GAP = { pistol: 0.05, shotgun: 0.06, knife: 0.05, bazooka: 0.08, hit: 0.035, kill: 0.04, pickup: 0.045, click: 0.03, explode: 0.06 };
const lastPlayed = {};

export function sfx(name) {
  if (!ready() || settings.sfx <= 0) return;
  const fn = SFX[name];
  if (!fn) return;
  const t = ctx.currentTime;
  if (t - (lastPlayed[name] ?? -1) < (MIN_GAP[name] ?? 0)) return;
  lastPlayed[name] = t;
  try { fn(t + 0.005, sfxBus); } catch { /* 合成失敗就安靜略過 */ }
}

// ---------- 背景音樂 ----------
// 每首歌：和弦（每小節一個）、主旋律（每小節 16 格，'-' 延長、'.' 休息）、鼓（k 大鼓 s 小鼓 h 鈸）
const TRACKS = {
  menu: {
    bpm: 96, lead: 'triangle', leadVol: 0.22, bass: 'half', drums: ['k.......k.......', '....s.......s...', '..h...h...h...h.'],
    chords: ['C3', 'A2m', 'F2', 'G2'],
    melody: [
      'E5 - - - G5 - - - C6 - - - G5 - - -',
      'A5 - - - E5 - - - C5 - - - E5 - - -',
      'F5 - - - A5 - - - C6 - - - A5 - G5 -',
      'D5 - - - G5 - - - B5 - - - . . . .',
    ],
  },
  battle: {
    bpm: 150, lead: 'pulse', leadVol: 0.13, bass: 'drive', drums: ['k.....k.k.......', '....s.......s...', 'h.h.h.h.h.h.h.h.'],
    chords: ['A2m', 'F2', 'C3', 'G2', 'A2m', 'F2', 'D3m', 'E2'],
    melody: [
      'A4 - C5 - E5 - A5 - G5 - E5 - C5 - D5 -',
      'C5 - - - A4 - C5 - F5 - E5 - C5 - A4 -',
      'G4 - C5 - E5 - G5 - E5 - D5 - C5 - E5 -',
      'D5 - - - B4 - D5 - G5 - - - . . . .',
      'E5 - E5 - A5 - E5 - C6 - B5 - A5 - G5 -',
      'F5 - - - C5 - F5 - A5 - G5 - F5 - E5 -',
      'D5 - F5 - A5 - D6 - C6 - A5 - F5 - D5 -',
      'E5 - - - G#5 - - - B5 - - - . . . .',
    ],
  },
  boss: {
    bpm: 168, lead: 'sawtooth', leadVol: 0.07, bass: 'drive', drums: ['k.k...k.k.k...k.', '....s.......s.ss', 'hhhhhhhhhhhhhhhh'],
    chords: ['D2m', 'D2m', 'Bb1', 'A1', 'D2m', 'D2m', 'G1m', 'A1'],
    melody: [
      'D5 - D5 F5 A5 - G5 F5 E5 - F5 - D5 - . .',
      'D5 - D5 F5 A5 - Bb5 A5 G5 - F5 - E5 - . .',
      'F5 - - - D5 - - - Bb4 - D5 - F5 - Bb5 -',
      'A5 - - - G5 - F5 - E5 - C#5 - E5 - A4 -',
      'D6 - C6 - A5 - - - F5 - G5 - A5 - - -',
      'D6 - C6 - A5 - - - Bb5 - A5 - G5 - F5 -',
      'G5 - - - Bb5 - - - D6 - Bb5 - G5 - D5 -',
      'E5 - - - C#5 - E5 - A5 - - - . . . .',
    ],
  },
  shop: {
    bpm: 116, lead: 'pulse', leadVol: 0.10, bass: 'bounce', drums: ['k.......k.......', '....s.......s...', '..h...h...h...h.'],
    chords: ['F2', 'D2m', 'Bb1', 'C2'],
    melody: [
      'A4 - C5 - F5 - - - E5 - F5 - A5 - - -',
      'D5 - - - F5 - A5 - G5 - F5 - D5 - . .',
      'Bb4 - D5 - F5 - - - D5 - F5 - Bb5 - A5 -',
      'G5 - - - E5 - - - C5 - D5 - E5 - . .',
    ],
  },
};

// 把旋律字串展開成 [{ step, midi, len }]
function parseTrack(tr) {
  const tokens = tr.melody.join(' ').split(/\s+/);
  const lead = [];
  tokens.forEach((tok, i) => {
    const m = noteMidi(tok);
    if (m !== null) lead.push({ step: i, midi: m, len: 1 });
    else if (tok === '-' && lead.length && lead[lead.length - 1].step + lead[lead.length - 1].len === i) lead[lead.length - 1].len += 1;
  });
  const leadAt = new Map(lead.map(n => [n.step, n]));
  const chords = tr.chords.map(c => ({ root: noteMidi(c.replace('m', '')), minor: c.endsWith('m') }));
  return { ...tr, leadAt, chords, steps: tokens.length };
}
const PARSED = Object.fromEntries(Object.entries(TRACKS).map(([k, v]) => [k, parseTrack(v)]));

let wantTrack = null;
let playing = null;
let step = 0;
let nextTime = 0;
let timer = null;

export function playMusic(name) {
  if (wantTrack === name) return;
  wantTrack = name;
  playing = null;
  if (ctx && ctx.state !== 'closed') startScheduler();
}

export function stopMusic() {
  wantTrack = null;
  playing = null;
  clearInterval(timer);
  timer = null;
}

function startScheduler() {
  if (!timer) timer = setInterval(schedule, 25);
}

function schedule() {
  if (!ctx || ctx.state !== 'running' || !wantTrack) return;
  if (playing !== wantTrack) {
    playing = wantTrack;
    step = 0;
    nextTime = ctx.currentTime + 0.06;
  }
  // 掉幀太久（例如切到背景）就跳過，不要一次補一大堆音
  if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.02;
  const tr = PARSED[playing];
  const stepDur = 60 / tr.bpm / 4;
  while (nextTime < ctx.currentTime + 0.12) {
    if (settings.music > 0 && !settings.muted) playStep(tr, step, nextTime, stepDur);
    step = (step + 1) % tr.steps;
    nextTime += stepDur;
  }
}

function playStep(tr, s, t, sd) {
  const bar = Math.floor(s / 16);
  const pos = s % 16;
  const ch = tr.chords[bar % tr.chords.length];
  const third = ch.minor ? 3 : 4;
  const out = musicBus;

  const n = tr.leadAt.get(s);
  if (n) osc(tr.lead, midiHz(n.midi), t, n.len * sd * 0.92, tr.leadVol, out, { attack: 0.01, release: 0.05 });

  // 低音
  const root = ch.root;
  if (tr.bass === 'drive' && pos % 2 === 0) osc('triangle', midiHz(root + (pos % 4 === 2 ? 12 : 0)), t, sd * 1.6, 0.30, out);
  if (tr.bass === 'half' && pos % 8 === 0) osc('triangle', midiHz(root + (pos === 8 ? 7 : 0)), t, sd * 7, 0.28, out, { release: 0.2 });
  if (tr.bass === 'bounce' && pos % 4 === 0) osc('triangle', midiHz(root + [0, 7, 12, 7][pos / 4]), t, sd * 2, 0.30, out);

  // 和弦琶音（小聲墊底）
  if (pos % 2 === 1 || tr.bass === 'half') {
    const arp = [0, third, 7, 12];
    const m = root + 24 + arp[Math.floor(pos / (tr.bass === 'half' ? 1 : 2)) % 4];
    if (tr.bass !== 'half' || pos % 2 === 0) osc('pulse', midiHz(m), t, sd * 0.8, 0.035, out);
  }

  // 鼓
  const [k, sn, h] = tr.drums;
  if (k[pos] === 'k') osc('sine', 150, t, 0.12, 0.5, out, { to: 40 });
  if (sn[pos] === 's') noise(t, 0.12, 0.22, out, { type: 'bandpass', freq: 1800, q: 0.8 });
  if (h[pos] === 'h') noise(t, 0.035, 0.08, out, { type: 'highpass', freq: 7000 });
}
