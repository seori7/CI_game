import Phaser from 'phaser';
import { PLAYER_SPEED, COLOR_TEXT_PRIMARY } from '../config/constants';
import { ASSET_MANIFEST } from '../config/assetManifest';

/**
 * Управляемый игроком персонаж.
 *
 * Визуально представлен прямоугольником-плейсхолдером (см. assetManifest.ts).
 * Когда появятся настоящие спрайт-анимации, здесь достаточно заменить
 * создание Rectangle на this.scene.add.sprite(...) с ключом из
 * ASSET_MANIFEST['player'].spriteSheetPath — остальная логика движения
 * и физики не изменится.
 */
export class Player extends Phaser.GameObjects.Container {
  /** Клавиши WASD, дублирующие стрелки для управления движением. */
  private readonly wasdKeys: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  /**
   * @param scene сцена, которой принадлежит игрок
   * @param x начальная координата X
   * @param y начальная координата Y
   */
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const descriptor = ASSET_MANIFEST.player;

    const hasRealSprite = descriptor.spriteSheetPath !== null
      && scene.textures.exists(descriptor.spriteSheetPath);

    let bodyVisual: Phaser.GameObjects.GameObject;

    if (hasRealSprite) {
      const sprite = scene.add.sprite(0, 0, descriptor.spriteSheetPath as string, 0);
      this.ensureWalkAnimations(scene, descriptor.spriteSheetPath as string);
      bodyVisual = sprite;
      this.spriteRef = sprite; // сохраняем ссылку, чтобы переключать анимацию в update()
    } else {
      const rect = scene.add.rectangle(0, 0, descriptor.width, descriptor.height, descriptor.color);
      rect.setStrokeStyle(2, 0xffffff, 0.6);
      bodyVisual = rect;
    }

    const bodyRect = scene.add.rectangle(0, 0, descriptor.width, descriptor.height, descriptor.color);
    bodyRect.setStrokeStyle(2, 0xffffff, 0.6);

    const label = scene.add.text(0, 0, descriptor.label, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
    });
    label.setOrigin(0.5, 0.5);
    label.setY(-descriptor.height / 2 - 10);

    this.add([bodyRect, label]);
    this.setSize(descriptor.width, descriptor.height);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(descriptor.width, descriptor.height);
    body.setCollideWorldBounds(true);

    this.wasdKeys = scene.input.keyboard!.addKeys('W,S,A,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
  }

  /**
   * Обрабатывает ввод с клавиатуры (стрелки и WASD) и двигает игрока.
   * Диагональное движение нормализуется, чтобы скорость по диагонали
   * не превышала PLAYER_SPEED.
   * @param cursors курсорные клавиши, созданные сценой через this.input.keyboard.createCursorKeys()
   */
  public update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    const moveLeft = cursors.left.isDown || this.wasdKeys.A.isDown;
    const moveRight = cursors.right.isDown || this.wasdKeys.D.isDown;
    const moveUp = cursors.up.isDown || this.wasdKeys.W.isDown;
    const moveDown = cursors.down.isDown || this.wasdKeys.S.isDown;

    let velocityX = 0;
    let velocityY = 0;

    if (moveLeft) {
      velocityX -= 1;
    }
    if (moveRight) {
      velocityX += 1;
    }
    if (moveUp) {
      velocityY -= 1;
    }
    if (moveDown) {
      velocityY += 1;
    }

    body.setVelocity(velocityX, velocityY);
    if (velocityX !== 0 || velocityY !== 0) {
      body.velocity.normalize().scale(PLAYER_SPEED);
    }
  }
}
