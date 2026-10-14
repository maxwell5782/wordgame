import { BootScene } from './scenes/BootScene.js';
import { ArenaScene, GAME_W, GAME_H } from './scenes/ArenaScene.js';
import { newRun, MAX_WAVES } from './state.js';
import { hud } from './ui/hud.js';
import { openShop } from './ui/shop.js';
import { showMenu, showLevelUp, showPause, showResults, isPauseOpen } from './ui/screens.js';
import { clearUi } from './ui/dom.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0e1124',
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [BootScene, ArenaScene],
});

let run = null;
const arena = () => game.scene.getScene('arena');

const hooks = {
  onHud(timeLeft) {
    hud.update(run, timeLeft);
  },
  async onWaveEnd() {
    if (run.wave >= MAX_WAVES) {
      finish(true);
      return;
    }
    hud.hide();
    while (run.pendingLevels > 0) {
      await showLevelUp(run);
      run.pendingLevels -= 1;
    }
    openShop(run, () => {
      clearUi();
      hud.show();
      arena().nextWave();
    });
  },
  onDeath() {
    finish(false);
  },
};

function startRun(topic) {
  clearUi();
  run = newRun(topic);
  hud.show();
  game.scene.start('arena', { run, hooks });
}

function finish(won) {
  hud.hide();
  showResults(run, won, {
    onAgain: () => startRun(run.topic),
    onMenu: goMenu,
  });
}

function goMenu() {
  game.scene.stop('arena');
  hud.hide();
  clearUi();
  showMenu({ onStart: startRun });
}

function pause() {
  const a = arena();
  if (!a || !a.scene.isActive() || !a.running || a.paused || isPauseOpen()) return;
  a.setPaused(true);
  showPause({ onResume: () => a.setPaused(false), onQuit: goMenu });
}

document.getElementById('pause-btn').addEventListener('click', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'p') pause(); });

game.events.once('boot-ready', goMenu);

// 方便在瀏覽器主控台除錯
window.wordgame = { game, get run() { return run; } };

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
