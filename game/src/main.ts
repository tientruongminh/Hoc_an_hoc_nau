import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/400-italic.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene, PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';
import { EndingScene } from './scenes/EndingScene';
import { GooseScene } from './scenes/GooseScene';
import { RideScene } from './scenes/RideScene';
import { OAnQuanScene } from './scenes/OAnQuanScene';
import { WashScene } from './scenes/WashScene';
import { CookingScene } from './scenes/CookingScene';
import { initAudio } from './systems/Audio';
import { Cloud } from './systems/Cloud';
import { G, setPersistHook } from './state/GameState';

// Cloud save: mirror local writes; reload in-memory state when the server copy wins.
setPersistHook(() => Cloud.touched());
Cloud.onPulled = () => G.reloadFromStorage();
void Cloud.init();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#120d0a',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { gamepad: false },
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, EndingScene, GooseScene, RideScene, OAnQuanScene, WashScene, CookingScene, UIScene],
});
initAudio(game);

declare global {
  interface Window {
    __game?: Phaser.Game;
  }
}
// Exposed for automated playtests (screenshots / smoke tests).
window.__game = game;
