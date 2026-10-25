import Phaser from 'phaser';

/**
 * CatalogScene оставлен как технический "роутер": раньше показывал меню из
 * 3 мини-игр, сейчас у Маси только один сценарий — боссфайт "Чит Маси".
 * Файл не удалён и ключ сцены не менялся намеренно, чтобы не трогать код,
 * который её запускает (зона Разработчика 2 — диалоги/Hub).
 */
export class CatalogScene extends Phaser.Scene {
  public constructor() {
    super('CatalogScene');
  }

  public create(): void {
    this.scene.stop();
    this.scene.launch('UiMinigameScene');
  }
}