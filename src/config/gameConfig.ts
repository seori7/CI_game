import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { BootScene } from '../scenes/BootScene';
import { NicknameScene } from '../scenes/NicknameScene';
import { HubScene } from '../scenes/HubScene';
import { DialogueScene } from '../scenes/DialogueScene';
import { ProgrammerMinigameScene } from '../scenes/minigames/ProgrammerMinigameScene';
import { MedicMinigameScene } from '../scenes/minigames/MedicMinigameScene';
import { BuilderMinigameScene } from '../scenes/minigames/BuilderMinigameScene';

/**
 * Базовая конфигурация игры Phaser. Список сцен задаёт порядок их
 * регистрации (не порядок запуска — запуск определяется явными вызовами
 * scene.start()/scene.launch() внутри самих сцен, начиная с BootScene).
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0f172a',
  parent: undefined,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    NicknameScene,
    HubScene,
    DialogueScene,
    ProgrammerMinigameScene,
    MedicMinigameScene,
    BuilderMinigameScene,
  ],
};
