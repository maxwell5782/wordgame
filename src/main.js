import { BootScene } from './scenes/BootScene.js';
import { ArenaScene, GAME_W, GAME_H } from './scenes/ArenaScene.js';
import { newRun, MAX_WAVES, LISTEN_WAVE_DAMAGE } from './state.js';
import { hud } from './ui/hud.js';
import { openShop } from './ui/shop.js';
import { showMenu, showLevelUp, showPause, showResults, showRevive, canRevive, isPauseOpen } from './ui/screens.js';
import { markGearSeen } from './progress.js';
import { openQuiz } from './ui/quiz.js';
import { canSpeak } from './speech.js';
import { playMusic, stopMusic, sfx, duck, unduck } from './audio.js';
import { clearUi, unmount } from './ui/dom.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0e1124',
  physics: { default: 'arcade', arcade: { debug: false } },
  // 音樂音效自己用 Web Audio 合成（src/audio.js），不用 Phaser 的
  audio: { noAudio: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [BootScene, ArenaScene],
});

let run = null;
const arena = () => game.scene.getScene('arena');

const hooks = {
  onHud(timeLeft, boss) {
    hud.update(run, timeLeft, boss);
  },
  async onWaveEnd() {
    if (run.wave >= MAX_WAVES) {
      finish(true);
      return;
    }
    hud.hide();
    sfx('waveClear');
    playMusic('shop');
    while (run.pendingLevels > 0) {
      await showLevelUp(run);
      run.pendingLevels -= 1;
    }
    openShop(run, async () => {
      clearUi();
      await waveQuiz();
      hud.show();
      arena().nextWave();
    }, goMenu);
  },
  async onDeath() {
    if (canRevive(run)) {
      hud.hide();
      const pct = await showRevive(run);
      if (pct > 0) {
        hud.show();
        arena().revive(pct);
        return;
      }
    }
    finish(false);
  },
};

// 每波開始前的聽力題：答對這一波傷害加成。裝置不能發音時改用看圖題。
async function waveQuiz() {
  const kind = canSpeak() ? 'listen' : 'easy';
  const correct = await openQuiz(kind, run, {
    reward: `這一波傷害 +${LISTEN_WAVE_DAMAGE}%（答錯沒有加成）`,
    resultNote: ok => ok ? `這一波傷害 +${LISTEN_WAVE_DAMAGE}%！` : '這一波沒有加成，這個字會放進複習清單。',
  });
  run.waveDamage = correct ? LISTEN_WAVE_DAMAGE : 0;
}

async function startRun(topic, wordLevel) {
  clearUi();
  game.scene.stop('arena');
  run = newRun(topic, wordLevel);
  resetDucks();
  playMusic('shop');
  for (const w of run.weapons) markGearSeen('weapon', w.id);
  await waveQuiz();
  hud.show();
  game.scene.start('arena', { run, hooks });
}

function finish(won) {
  hud.hide();
  stopMusic();
  sfx(won ? 'win' : 'lose');
  showResults(run, won, {
    onAgain: () => startRun(run.topic, run.wordLevel),
    onMenu: goMenu,
  });
}

let resume = null;

// 畫面被整個清掉時，答題／暫停造成的「音樂變小聲」也要一起恢復
function resetDucks() {
  unduck('quiz');
  unduck('pause');
}

function goMenu() {
  resume = null;
  game.scene.stop('arena');
  hud.hide();
  clearUi();
  resetDucks();
  playMusic('menu');
  showMenu({ onStart: startRun });
}

function pause() {
  const a = arena();
  if (!a || !a.scene.isActive() || !a.running || a.paused || isPauseOpen()) return;
  a.setPaused(true);
  duck('pause', 0.3, 0.3);
  resume = () => { resume = null; unduck('pause'); a.setPaused(false); };
  showPause({ onResume: () => resume?.(), onQuit: goMenu });
}

document.getElementById('pause-btn').addEventListener('click', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape' && e.key !== 'p') return;
  // Esc：先關音量設定或圖鑑，再從暫停回到遊戲，遊戲中則打開暫停選單
  if (document.querySelector('#ui [data-layer="sound"]')) unmount('sound');
  else if (document.querySelector('#ui [data-layer="codex"]')) unmount('codex');
  else if (isPauseOpen()) { unmount('pause'); resume?.(); }
  else pause();
});

game.events.once('boot-ready', goMenu);

// 按按鈕的小音效
document.addEventListener('click', e => {
  if (e.target.closest?.('button')) sfx('click');
});

// 方便在瀏覽器主控台除錯
window.wordgame = { game, get run() { return run; } };

// 分支預覽網址（.../preview/分支名/）不裝離線快取，免得和正式版的快取互相影響
const isPreview = location.pathname.includes('/preview/');
if (!isPreview && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
