// 鍵盤移動：WASD 和方向鍵。
// 不用 Phaser 內建的鍵盤，因為它只看 keyCode，而且會略過已被 preventDefault 的事件：
// 中文（注音）輸入法開著時 keyCode 會變成 229、key 變成 "Process"，WASD 就完全沒反應。
// 這裡改看 event.code（實體按鍵位置），輸入法、鍵盤配置都不影響。
// 有些輸入法還是會把按鍵整個吃掉，所以電腦上玩的時候，讓一個看不見的密碼欄位保持焦點：
// 瀏覽器在密碼欄位裡一定會關掉中文輸入法，按鍵就能正常送到遊戲。
const DIRS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
// 少數環境沒有 event.code，就退回用 event.key（含注音鍵盤上 WASD 位置的符號）
const BY_KEY = {
  w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD',
  'ㄊ': 'KeyW', 'ㄇ': 'KeyA', 'ㄋ': 'KeyS', 'ㄎ': 'KeyD',
  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
};

function codeOf(e) {
  if (DIRS[e.code]) return e.code;
  return BY_KEY[e.key?.length === 1 ? e.key.toLowerCase() : e.key] || null;
}

// 只有用滑鼠的裝置才用密碼欄位，手機平板聚焦輸入框會跳出螢幕鍵盤
const useSink = matchMedia('(pointer: fine)').matches;
let sink = null;

function getSink() {
  if (!sink) {
    sink = document.createElement('input');
    Object.assign(sink, { type: 'password', id: 'key-sink', tabIndex: -1, autocomplete: 'off' });
    sink.setAttribute('aria-hidden', 'true');
    sink.setAttribute('data-lpignore', 'true');
    sink.setAttribute('data-1p-ignore', '');
    sink.addEventListener('input', () => { sink.value = ''; });
    document.body.append(sink);
  }
  return sink;
}

function isTyping(e) {
  const t = e.target;
  return t && t !== sink && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

export class KeyboardMove {
  constructor() {
    this.down = new Set();
    this.vec = { x: 0, y: 0 };
    this.onDown = e => {
      const c = codeOf(e);
      if (!c || isTyping(e)) return;
      this.down.add(c);
      if (c.startsWith('Arrow')) e.preventDefault(); // 方向鍵不要捲動網頁
    };
    this.onUp = e => {
      const c = codeOf(e);
      if (c) this.down.delete(c);
    };
    this.onBlur = () => this.down.clear();
    window.addEventListener('keydown', this.onDown, true);
    window.addEventListener('keyup', this.onUp, true);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onBlur);
  }

  // 回傳長度 0 或 1 的方向
  read() {
    // 焦點沒在按鈕或其他輸入框上時（例如點了畫面、關掉商店後），把焦點拉回密碼欄位
    if (useSink) {
      const a = document.activeElement;
      if (!a || a === document.body || a.tagName === 'CANVAS') getSink().focus({ preventScroll: true });
    }
    let x = 0;
    let y = 0;
    for (const c of this.down) {
      x += DIRS[c][0];
      y += DIRS[c][1];
    }
    x = Math.sign(x);
    y = Math.sign(y);
    const l = Math.hypot(x, y) || 1;
    this.vec.x = x / l;
    this.vec.y = y / l;
    return this.vec;
  }

  destroy() {
    if (sink && document.activeElement === sink) sink.blur();
    window.removeEventListener('keydown', this.onDown, true);
    window.removeEventListener('keyup', this.onUp, true);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onBlur);
  }
}
