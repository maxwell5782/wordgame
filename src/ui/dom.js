// 簡單的 DOM 小工具
import { sfx } from '../audio.js';

export const uiRoot = () => document.getElementById('ui');

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'disabled') node.disabled = !!v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// 把一個畫面放進 #ui；layer 不同的畫面可以疊在一起（例如商店上面再開題目）
export function mount(screen, layer = 'base') {
  const root = uiRoot();
  root.querySelector(`[data-layer="${layer}"]`)?.remove();
  screen.dataset.layer = layer;
  root.append(screen);
  return screen;
}

export function unmount(layer = 'base') {
  uiRoot().querySelector(`[data-layer="${layer}"]`)?.remove();
}

export function clearUi() {
  uiRoot().replaceChildren();
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

export function toast(text, kind = '') {
  if (kind === 'good') sfx('buy');
  else if (kind === 'bad') sfx('error');
  const t = el('div', { class: `toast ${kind}` }, text);
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), 1400);
  setTimeout(() => t.remove(), 1900);
}
