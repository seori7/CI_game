import Phaser from 'phaser';

import {
  PLAYER_SPEED,
  COLOR_TEXT_PRIMARY,
  CHARACTER_DISPLAY_SCALE,
  CHARACTER_SPRITE_HEIGHT,
  CHARACTER_NAME_GAP_PX,
  CHARACTER_NAME_FONT_SIZE_PX,
  CHARACTER_NAME_BACKGROUND,
  CHARACTER_NAME_PADDING_X,
  CHARACTER_NAME_PADDING_Y,
  PLAYER_WALK_FRAMES,
  PLAYER_WALK_FRAME_RATE,
  PLAYER_ANIMATION_FRAMES,
  PLAYER_ANIMATION_KEYS,
} from '../config/constants';

import { ASSET_MANIFEST } from '../config/assetManifest';
import { GameState } from '../state/GameState';

/** Направления движения персонажа. */
type PlayerDirection = 'down' | 'left' | 'right' | 'up';

/**
 * Управляемый персонаж.
 *
 * Поддерживает:
 * - перемещение WASD и стрелками;
 * - диагональное движение;
 * - четыре анимации ходьбы;
 * - остановку анимации при прекращении движения;
 * - отображение никнейма над головой.
 *
 * Физическое тело остаётся прежним,
 * чтобы не нарушить существующие коллизии хаба.
 */
export class Player extends Phaser.GameObjects.Container {
  private readonly wasdKeys: Record<
    'W' | 'A' | 'S' | 'D',
    Phaser.Input.Keyboard.Key
  >;

  /** Спрайт персонажа, если текстура успешно загрузилась. */
  private spriteRef: Phaser.GameObjects.Sprite | null = null;

  /** Последнее направление взгляда персонажа. */
  private facingDirection: PlayerDirection = 'down';

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const descriptor = ASSET_MANIFEST.player;

    const textureKey = descriptor.spriteSheetPath;

    const hasRealSprite =
      textureKey !== null &&
      scene.textures.exists(textureKey);

    let bodyVisual:
      | Phaser.GameObjects.Rectangle
      | Phaser.GameObjects.Sprite;

    if (hasRealSprite && textureKey !== null) {
      const sprite = scene.add.sprite(
        0,
        descriptor.height / 2,
        textureKey,
      );

      // Нижний край спрайта соответствует ногам персонажа.
      sprite.setOrigin(0.5, 1);


      // Увеличиваем пиксельный арт без сглаживания.
      sprite.setScale(CHARACTER_DISPLAY_SCALE);


      this.spriteRef = sprite;

      // Регистрируем анимации до первого воспроизведения.
      this.ensureWalkAnimations(scene, textureKey);

      // Персонаж изначально смотрит вниз.
      sprite.setFrame(PLAYER_ANIMATION_FRAMES.down);

      bodyVisual = sprite;
    } else {
      // Если PNG отсутствует, игра продолжает работать.
      const rect = scene.add.rectangle(
        0,
        0,
        descriptor.width,
        descriptor.height,
        descriptor.color,
      );

      rect.setStrokeStyle(2, 0xffffff, 0.6);

      bodyVisual = rect;
    }

    // Никнейм берётся из текущей игровой сессии.
    const nickname =
      GameState.getInstance().nickname || descriptor.label;

    // Вычисляем верхнюю границу увеличенного спрайта.
    const spriteTopY =
      descriptor.height / 2 -
      CHARACTER_SPRITE_HEIGHT * CHARACTER_DISPLAY_SCALE;

    const label = scene.add.text(
      0,
      spriteTopY - CHARACTER_NAME_GAP_PX,
      nickname,
      {
        fontFamily: 'monospace',
        fontSize: `${CHARACTER_NAME_FONT_SIZE_PX}px`,
        color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
        backgroundColor: CHARACTER_NAME_BACKGROUND,
        padding: {
          x: CHARACTER_NAME_PADDING_X,
          y: CHARACTER_NAME_PADDING_Y,
        },
      },
    );

    // Нижняя граница подписи находится над головой.
    label.setOrigin(0.5, 1);

    this.add([bodyVisual, label]);

    this.setSize(descriptor.width, descriptor.height);

    scene.add.existing(this);

    // Сохраняем существующую физику персонажа.
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;

    body.setSize(descriptor.width, descriptor.height);
    body.setCollideWorldBounds(true);

    this.wasdKeys = scene.input.keyboard!.addKeys(
      'W,S,A,D',
    ) as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
  }

  /**
   * Создаёт четыре анимации ходьбы.
   *
   * Phaser хранит анимации глобально, поэтому перед созданием
   * проверяем наличие ключа. Это предотвращает повторную
   * регистрацию при возвращении в HubScene.
   */
  private ensureWalkAnimations(
    scene: Phaser.Scene,
    textureKey: string,
  ): void {
    const directions: PlayerDirection[] = [
      'down',
      'left',
      'right',
      'up',
    ];

    for (const direction of directions) {
      const animationKey = PLAYER_ANIMATION_KEYS[direction];

      if (scene.anims.exists(animationKey)) {
        continue;
      }

      const startFrame =
        PLAYER_ANIMATION_FRAMES[direction];

      scene.anims.create({
        key: animationKey,

        frames: scene.anims.generateFrameNumbers(
          textureKey,
          {
            start: startFrame,
            end: startFrame + PLAYER_WALK_FRAMES - 1,
          },
        ),

        frameRate: PLAYER_WALK_FRAME_RATE,

        // Повторяем анимацию, пока персонаж движется.
        repeat: -1,
      });
    }
  }

  /**
   * Переключает направление взгляда и воспроизводит
   * соответствующую анимацию ходьбы.
   */
  private playWalkAnimation(
    direction: PlayerDirection,
  ): void {
    if (this.spriteRef === null) {
      return;
    }

    this.facingDirection = direction;

    const animationKey =
      PLAYER_ANIMATION_KEYS[direction];

    // ignoreIfPlaying предотвращает перезапуск
    // одной и той же анимации каждый кадр.
    this.spriteRef.anims.play(animationKey, true);
  }

  /**
   * Останавливает анимацию и показывает первый кадр
   * последнего направления взгляда.
   */
  private stopWalkAnimation(): void {
    if (this.spriteRef === null) {
      return;
    }

    this.spriteRef.anims.stop();

    this.spriteRef.setFrame(
      PLAYER_ANIMATION_FRAMES[this.facingDirection],
    );
  }

  /**
   * Обрабатывает управление и анимацию.
   *
   * При диагональном движении приоритет отдаётся
   * горизонтальному направлению, чтобы одновременно
   * не переключать две анимации.
   */
  public update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    const moveLeft =
      cursors.left.isDown || this.wasdKeys.A.isDown;

    const moveRight =
      cursors.right.isDown || this.wasdKeys.D.isDown;

    const moveUp =
      cursors.up.isDown || this.wasdKeys.W.isDown;

    const moveDown =
      cursors.down.isDown || this.wasdKeys.S.isDown;

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

    const isMoving =
      velocityX !== 0 || velocityY !== 0;

    if (!isMoving) {
      this.stopWalkAnimation();
      return;
    }

    // Нормализуем диагональное движение.
    body.velocity.normalize().scale(PLAYER_SPEED);

    // Выбираем анимацию согласно направлению.
    if (velocityX < 0) {
      this.playWalkAnimation('left');
    } else if (velocityX > 0) {
      this.playWalkAnimation('right');
    } else if (velocityY < 0) {
      this.playWalkAnimation('up');
    } else if (velocityY > 0) {
      this.playWalkAnimation('down');
    }
  }

  /**
   * Принудительная остановка.
   *
   * Используется HubScene при отключении controlsEnabled.
   * Останавливаем не только физическое движение,
   * но и визуальную анимацию.
   */
  public stopMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    body.setVelocity(0, 0);

    this.stopWalkAnimation();
  }
}