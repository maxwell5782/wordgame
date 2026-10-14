// 原創像素圖：每張圖用文字格子畫，一個字元 = 一個像素，畫的時候放大 PX 倍。
// 不用任何外部圖片檔，所以沒有授權問題，也不會增加下載量。
export const PX = 3;

const OUTLINE = '#1b1f3a';

// 每張圖：pal 是字元對應的顏色（'.' 是透明），frames 是一張或多張格子（動畫影格）。
export const SPRITES = {
  player: {
    pal: { k: OUTLINE, b: '#3d8bff', B: '#9cc8ff', s: '#ffd2a8', w: '#ffffff', p: '#ff8fa3', r: '#ff4d5e', R: '#c22c45', n: '#2b3a7a' },
    frames: [[
      '....kkkkkk....',
      '...kbbbbbbk...',
      '..kbBBbbbbbk..',
      '..kbbbbbbbbbbk',
      '..kkkkkkkkkkk.',
      '..kssssssssk..',
      '..kswksswksk..',
      '..kspssssspk..',
      '..kkssssssk...',
      '...krrrrrrk...',
      '..ksrrRRrrsk..',
      '..ksrRRRRrsk..',
      '...krrrrrrk...',
      '...knnnnnnk...',
      '...knk..knk...',
      '..kkkk..kkkk..',
    ], [
      '..............',
      '....kkkkkk....',
      '...kbbbbbbk...',
      '..kbBBbbbbbk..',
      '..kbbbbbbbbbbk',
      '..kkkkkkkkkkk.',
      '..kssssssssk..',
      '..kswksswksk..',
      '..kspssssspk..',
      '..kkssssssk...',
      '...krrrrrrk...',
      '..ksrrRRrrsk..',
      '..ksrRRRRrsk..',
      '...knnnnnnk...',
      '....knkknk....',
      '....kkkkkk....',
    ]],
  },

  e_slime: {
    pal: { k: OUTLINE, g: '#5ee08a', G: '#2fa35c', l: '#c8ffd8', w: '#ffffff' },
    frames: [[
      '....kkkk....',
      '..kkglggkk..',
      '.kglgggggGk.',
      '.kggggggggk.',
      'kggwkggwkggk',
      'kggwkggwkggk',
      'kgggggggggGk',
      'kGggggggggGk',
      'kGGggggggGGk',
      '.kGGGGGGGGk.',
      '..kkkkkkkk..',
    ], [
      '............',
      '...kkkkkk...',
      '.kkglggggkk.',
      'kgglggggggGk',
      'kggwkggwkggk',
      'kggwkggwkggk',
      'kgggggggggGk',
      'kGggggggggGk',
      'kGGggggggGGk',
      'kGGGGGGGGGGk',
      '.kkkkkkkkkk.',
    ]],
  },

  e_runner: {
    pal: { k: OUTLINE, o: '#ff8a4c', O: '#d4552a', y: '#ffd29a', w: '#ffffff' },
    frames: [[
      '...kkkk...',
      '..kyoook..',
      '.kyoooooOk',
      'kyooooooOk',
      'kowkoowkOk',
      'kowkoowkOk',
      'kooookkoOk',
      'koooooooOk',
      'kOooooooOk',
      'kOOOOOOOOk',
      'kk..kk..kk',
    ], [
      '...kkkk...',
      '..kyoook..',
      '.kyoooooOk',
      'kyooooooOk',
      'kowkoowkOk',
      'kowkoowkOk',
      'kooookkoOk',
      'koooooooOk',
      'kOooooooOk',
      'kOOOOOOOOk',
      '..kk..kk..',
    ]],
  },

  e_tank: {
    pal: { k: OUTLINE, p: '#b070ff', P: '#7a3fd0', q: '#dcbcff', w: '#ffffff' },
    frames: [[
      '..kk..........kk..',
      '..kwk........kwk..',
      '..kwwkkkkkkkkwwk..',
      '.kqqppppppppppppk.',
      'kqppppppppppppppPk',
      'kqpppwwkppppwwkpPk',
      'kqpppwwkppppwwkpPk',
      'kppppppppppppppppk',
      'kppkkkkkkkkkkkkpPk',
      'kppkwkwkwkwkwkkpPk',
      'kppkkkkkkkkkkkkpPk',
      'kpppppppppppppppPk',
      'kPppppppppppppppPk',
      'kPPppppppppppppPPk',
      '.kPPPPPPPPPPPPPPk.',
      '..kPPk......kPPk..',
      '..kkkk......kkkk..',
    ], [
      '..kk..........kk..',
      '..kwk........kwk..',
      '..kwwkkkkkkkkwwk..',
      '.kqqppppppppppppk.',
      'kqppppppppppppppPk',
      'kqpppwwkppppwwkpPk',
      'kqpppwwkppppwwkpPk',
      'kppppppppppppppppk',
      'kppkkkkkkkkkkkkpPk',
      'kppkwkwkwkwkwkkpPk',
      'kppkkkkkkkkkkkkpPk',
      'kpppppppppppppppPk',
      'kPppppppppppppppPk',
      'kPPppppppppppppPPk',
      '.kPPPPPPPPPPPPPPk.',
      '...kPPk....kPPk...',
      '...kkkk....kkkk...',
    ]],
  },

  // 材料（藍色寶石，在草地上比較明顯）
  mat: {
    pal: { k: OUTLINE, c: '#5ee7ff', C: '#2a8fd0', w: '#ffffff' },
    frames: [[
      '..kkk..',
      '.kwcck.',
      'kwccCCk',
      'kcccCCk',
      '.kcCCk.',
      '..kCk..',
      '...k...',
    ]],
  },

  // 武器和子彈畫成白／灰色，遊戲中再依稀有度上色
  w_pistol: {
    pal: { k: OUTLINE, w: '#ffffff', g: '#d0d0d0', d: '#8c8c8c' },
    frames: [[
      '.kkkkkkkk.',
      'kwwwwwwwwk',
      'kggggggggk',
      'kgdkkkkkk.',
      'kgdk......',
      'kkkk......',
    ]],
  },
  w_shotgun: {
    pal: { k: OUTLINE, w: '#ffffff', g: '#d0d0d0', d: '#8c8c8c' },
    frames: [[
      '..kkkkkkkkkkk',
      'kkwwwwwwwwwwk',
      'kddgggggggggk',
      'kddkkkkkkkkk.',
      'kkk..........',
    ]],
  },
  w_knife: {
    pal: { k: OUTLINE, w: '#ffffff', g: '#d0d0d0', d: '#8c8c8c' },
    frames: [[
      '....kkkkkk.',
      'kkkkwwwwwwk',
      'kddkgggggk.',
      'kkkkkkkkk..',
    ]],
  },
  w_bazooka: {
    pal: { k: OUTLINE, w: '#ffffff', g: '#d0d0d0', d: '#8c8c8c' },
    frames: [[
      'kkkkkkkkkkkkkk',
      'kwwwwwwwwwwwwk',
      'kggggggggggggk',
      'kkkkkddkkkkkkk',
      '....kddk......',
      '....kkkk......',
    ]],
  },
  bullet: {
    pal: { w: '#ffffff' },
    frames: [[
      '.ww.',
      'wwww',
      'wwww',
      '.ww.',
    ]],
  },
  blade: {
    pal: { w: '#ffffff' },
    frames: [[
      'wwwwww..',
      'wwwwwwww',
      'wwwwww..',
    ]],
  },
  // 出怪警示
  warn: {
    pal: { k: '#5a0d1c', r: '#ff4d5e', w: '#ffb3bd' },
    frames: [[
      'kk.....kk',
      'kwk...kwk',
      '.krk.krk.',
      '..krkrk..',
      '...krk...',
      '..krkrk..',
      '.krk.krk.',
      'krk...krk',
      'kk.....kk',
    ]],
  },
  rocket: {
    pal: { w: '#ffffff', y: '#fff0a0' },
    frames: [[
      'y.wwwww..',
      'yywwwwwww',
      'yywwwwwww',
      'y.wwwww..',
    ]],
  },
  // 魔王（每 5 波出一隻）：用比較粗的像素（px 6）畫，看起來特別巨大
  b_slime_king: {
    px: 6,
    pal: { k: OUTLINE, g: '#5ee08a', G: '#2fa35c', l: '#c8ffd8', w: '#ffffff', y: '#ffd84d', Y: '#c48a00', r: '#ff4d5e', m: '#7a1f35' },
    frames: [[
      '.......k....kk....k.....',
      '......kyk..kyyk..kyk....',
      '......kyykkyrryk.kyyk...',
      '......kyyyyyyyyyykyyk...',
      '......kyyyyyyyyyyyyyk...',
      '......kYYYYYYYYYYYYYk...',
      '....kkkkkkkkkkkkkkkkkk..',
      '...kgllllggggggggggggGk.',
      '..kgllggggggggggggggggGk',
      '.kglgggggggggggggggggGGk',
      '.kgggggkkkkggggkkkkggGGk',
      'kggggkwwwwkggkwwwwkgGGGk',
      'kggggkwwkkkggkwwkkkgGGGk',
      'kgggggkkkkggggkkkkggGGGk',
      'kggggggggggggggggggggGGk',
      'kggggggkkkkkkkkkggggggGk',
      'kGgggggkmmrrrmmkgggggGGk',
      'kGggggggkkkkkkkggggggGGk',
      'kGGgggggggggggggggggGGGk',
      'kGGGgggggggggggggggGGGGk',
      '.kGGGGGGGGGGGGGGGGGGGGk.',
      '..kkkkkkkkkkkkkkkkkkkk..',
    ], [
      '........................',
      '.......k....kk....k.....',
      '......kyk..kyyk..kyk....',
      '......kyykkyrryk.kyyk...',
      '......kyyyyyyyyyykyyk...',
      '......kyyyyyyyyyyyyyk...',
      '......kYYYYYYYYYYYYYk...',
      '....kkkkkkkkkkkkkkkkkk..',
      '...kgllllggggggggggggGk.',
      '.kglgggggggggggggggggGGk',
      '.kgggggkkkkggggkkkkggGGk',
      'kggggkwwwwkggkwwwwkgGGGk',
      'kggggkwwkkkggkwwkkkgGGGk',
      'kgggggkkkkggggkkkkggGGGk',
      'kggggggggggggggggggggGGk',
      'kggggggkkkkkkkkkggggggGk',
      'kGgggggkmmrrrmmkgggggGGk',
      'kGggggggkkkkkkkggggggGGk',
      'kGGgggggggggggggggggGGGk',
      'kGGGgggggggggggggggGGGGk',
      '.kGGGGGGGGGGGGGGGGGGGGk.',
      '..kkkkkkkkkkkkkkkkkkkk..',
    ]],
  },
  b_fire_dragon: {
    px: 6,
    pal: { k: OUTLINE, r: '#e8452c', R: '#a82a1e', H: '#f0e0c0', d: '#7a1f35', y: '#ffd84d', o: '#ff9f43', w: '#ffffff' },
    frames: [[
      '..kk..................kk..',
      '.kHHk................kHHk.',
      '.kHHHk..............kHHHk.',
      '..kHHHkkkkkkkkkkkkkkHHHk..',
      '...kHrrrrrrrrrrrrrrrrHk...',
      'kk..krrrrrrrrrrrrrrrrk..kk',
      'kdk.krryyyyrrrryyyyrrk.kdk',
      'kddkkrykkkyrrrrykkkyrkkddk',
      'kdddkrrykyyrrrryykyrrkdddk',
      'kddddkrryyrrrrrryyrrkddddk',
      'kdddkrrrrrrrrrrrrrrrrkdddk',
      'kddkrrrrrRRRRRRRRrrrrrkddk',
      'kdk.krrRRRRRRRRRRRRrrk.kdk',
      'kk..krRRkkRRRRRRkkRRrk..kk',
      '....krRRRRRRRRRRRRRRrk....',
      '....kRkwkwkwkwkwkwkwRk....',
      '....kRkooooooooooookRk....',
      '....kRkwkwkwkwkwkwkwRk....',
      '.....kRRRRRRRRRRRRRRk.....',
      '......kRRkkkkkkkkRRk......',
      '......kkk........kkk......',
    ], [
      '..........................',
      '..kk..................kk..',
      '.kHHk................kHHk.',
      '.kHHHk..............kHHHk.',
      '..kHHHkkkkkkkkkkkkkkHHHk..',
      '...kHrrrrrrrrrrrrrrrrHk...',
      'kdk.krryyyyrrrryyyyrrk.kdk',
      'kddkkrykkkyrrrrykkkyrkkddk',
      'kdddkrrykyyrrrryykyrrkdddk',
      'kddddkrryyrrrrrryyrrkddddk',
      'kdddkrrrrrrrrrrrrrrrrkdddk',
      'kddkrrrrrRRRRRRRRrrrrrkddk',
      'kdk.krrRRRRRRRRRRRRrrk.kdk',
      'kk..krRRkkRRRRRRkkRRrk..kk',
      '....krRRRRRRRRRRRRRRrk....',
      '....kRkwkwkwkwkwkwkwRk....',
      '....kRkooooooooooookRk....',
      '....kRkwkwkwkwkwkwkwRk....',
      '.....kRRRRRRRRRRRRRRk.....',
      '......kRRkkkkkkkkRRk......',
      '......kkk........kkk......',
    ]],
  },
  // 魔王的子彈（白色，遊戲中依招式上色）
  orb: {
    pal: { k: OUTLINE, w: '#ffffff', g: '#d0d0d0' },
    frames: [[
      '..kkkk..',
      '.kwwwwk.',
      'kwwwwwgk',
      'kwwwwwgk',
      'kwwwwggk',
      'kwwwgggk',
      '.kgggkk.',
      '..kkkk..',
    ]],
  },
};

// 把一張圖畫成 Phaser 貼圖（def.px 可以指定比較粗的像素）；多個影格橫向排列，影格名稱是 0、1、2…
export function makePixelTexture(scene, key, def) {
  const px = def.px ?? PX;
  const rows = def.frames[0];
  const fw = rows[0].length;
  const fh = rows.length;
  const n = def.frames.length;
  const tex = scene.textures.createCanvas(key, fw * px * n, fh * px);
  const ctx = tex.getContext();
  def.frames.forEach((frame, i) => {
    frame.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = def.pal[row[x]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect((i * fw + x) * px, y * px, px, px);
      }
    });
    tex.add(i, 0, i * fw * px, 0, fw * px, fh * px);
  });
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// 像素圓（爆炸、搖桿）：size 是貼圖邊長，fill／ring 是 [顏色, 透明度]，ring 寬 ringW 格
export function makePixelDisc(scene, key, size, fill, ring, ringW = 1) {
  const n = Math.ceil(size / PX);
  const small = document.createElement('canvas');
  small.width = n;
  small.height = n;
  const sctx = small.getContext('2d');
  const c = (n - 1) / 2;
  const r = n / 2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > r - 0.5) continue;
      const style = d > r - 0.5 - ringW ? ring : fill;
      if (!style) continue;
      sctx.globalAlpha = style[1];
      sctx.fillStyle = style[0];
      sctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, n * PX, n * PX);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// 簡單的雜湊亂數，讓地圖每次長得一樣
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// 平滑的雜訊，草地才會有一塊一塊的深淺
function noise(x, y, cell) {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(gx, gy) + (hash(gx + 1, gy) - hash(gx, gy)) * sx;
  const b = hash(gx, gy + 1) + (hash(gx + 1, gy + 1) - hash(gx, gy + 1)) * sx;
  return a + (b - a) * sy;
}

const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const GRASS = ['#3f7a35', '#47863b', '#4f9142'].map(rgb);
const GRASS_DARK = rgb('#356a2d');
const FLOWERS = ['#ffffff', '#ffe066', '#ff9ec7'].map(rgb);
const STONE = ['#3a4062', '#434a70'].map(rgb);
const MORTAR = rgb('#232842');
const STONE_TOP = rgb('#5a628c');

// 畫場地：中間草地、四周石牆。先在小畫布上一格一格畫，再放大 PX 倍。
export function makeArenaTexture(scene, key, w, h, arena) {
  const lw = Math.ceil(w / PX);
  const lh = Math.ceil(h / PX);
  const small = document.createElement('canvas');
  small.width = lw;
  small.height = lh;
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(lw, lh);
  const ax0 = Math.round(arena.x / PX);
  const ay0 = Math.round(arena.y / PX);
  const ax1 = Math.round(arena.right / PX);
  const ay1 = Math.round(arena.bottom / PX);

  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      let c;
      const inside = x >= ax0 && x < ax1 && y >= ay0 && y < ay1;
      if (inside) {
        const v = noise(x, y, 14) * 0.7 + hash(x, y) * 0.3;
        c = GRASS[v < 0.4 ? 0 : v < 0.62 ? 1 : 2];
        const r = hash(x + 911, y + 37);
        // 小草叢和小花
        if (r < 0.012) c = GRASS_DARK;
        else if (r < 0.0124) c = FLOWERS[Math.floor(hash(x, y + 5) * FLOWERS.length)];
        // 靠牆一圈陰影
        if (y === ay0 || x === ax0) c = GRASS_DARK;
      } else {
        // 石牆：每塊石頭 8×4，隔一排錯開
        const row = Math.floor(y / 4);
        const bx = (x + (row % 2) * 4) % 8;
        const by = y % 4;
        if (bx === 0 || by === 0) c = MORTAR;
        else c = STONE[Math.floor(hash(Math.floor((x + (row % 2) * 4) / 8), row) * 2)];
        if (by === 1 && bx !== 0) c = STONE_TOP.map((v, i) => (v + c[i]) >> 1);
      }
      const o = (y * lw + x) * 4;
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, lw * PX, lh * PX);
  tex.refresh();
}

// 把一張圖的第一個影格畫成圖片網址，給圖鑑等 HTML 畫面用
export function spriteDataUrl(def, px = 3) {
  const rows = def.frames[0];
  const c = document.createElement('canvas');
  c.width = rows[0].length * px;
  c.height = rows.length * px;
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = def.pal[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * px, y * px, px, px);
    }
  });
  return c.toDataURL();
}
