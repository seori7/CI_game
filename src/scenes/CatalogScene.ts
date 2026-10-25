import Phaser from 'phaser';

export class CatalogScene extends Phaser.Scene {
  public constructor() {
    super('CatalogScene');
  }

  public create(): void {
  this.scene.stop();
  this.scene.launch('MasyaIntroScene');
}
}