import Phaser from 'phaser';
import { COLOR_TEXT_PRIMARY, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

/** Длительность показа экрана загрузки (мс), чтобы дать визуальную обратную связь. */
const BOOT_SPLASH_DURATION_MS = 300;

/**
 * Стартовая сцена игры. В прототипе не грузит внешние файлы (их пока нет —
 * все визуальные объекты рисуются программно), поэтому сразу показывает
 * короткую заставку и переключается на экран ввода никнейма.
 */
export class BootScene extends Phaser.Scene {
  public constructor() {
    super('BootScene');
  }

 public preload(): void {
    // Пока файла нет — просто не вызывайте load для конкретного ключа,
    // и Player/NPC продолжат рисовать Rectangle-плейсхолдер (см. шаг 3)
    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth: 32,
      frameHeight: 48,
    });
  }
  
  public create(): void {
    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Загрузка...', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
    });
    loadingText.setOrigin(0.5, 0.5);

    this.time.delayedCall(BOOT_SPLASH_DURATION_MS, () => {
      this.scene.start('NicknameScene');
    });
  }
}
