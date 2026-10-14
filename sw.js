// 離線快取：第一次開啟後，沒有網路也能玩。
// 修改任何檔案後，請把 VERSION 加 1，玩家下次開啟就會拿到新版。
const VERSION = 13;
const CACHE = `wordgame-v${VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'lib/phaser-arcade-physics.min.js',
  'src/data/enemies.js',
  'src/data/items.js',
  'src/data/weapons.js',
  'src/data/words.js',
  'src/input/joystick.js',
  'src/main.js',
  'src/progress.js',
  'src/scenes/ArenaScene.js',
  'src/scenes/BootScene.js',
  'src/speech.js',
  'src/state.js',
  'src/ui/dom.js',
  'src/ui/hud.js',
  'src/ui/quiz.js',
  'src/ui/screens.js',
  'src/ui/shop.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 先用快取（快），同時在背景抓新版存起來
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
