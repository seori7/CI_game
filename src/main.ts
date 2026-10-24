import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

/** Единственный экземпляр Phaser.Game на всё приложение (защита от повторной инициализации). */
let gameInstance: Phaser.Game | null = null;

/**
 * Создаёт и запускает экземпляр игры Phaser внутри DOM-элемента с заданным id.
 * Если игра уже была создана ранее (например, из-за повторного вызова эффекта
 * в React StrictMode при разработке), возвращает существующий экземпляр,
 * не создавая игру повторно.
 * @param parentElementId id DOM-элемента-контейнера для canvas игры
 */
export function bootGame(parentElementId: string): Phaser.Game {
  if (gameInstance !== null) {
    return gameInstance;
  }
  gameInstance = new Phaser.Game({ ...gameConfig, parent: parentElementId });
  return gameInstance;
}
