import Phaser from 'phaser';
import { PLAYER_SPEED, COLOR_TEXT_PRIMARY, CHARACTER_DISPLAY_SCALE } from '../config/constants';
import { ASSET_MANIFEST } from '../config/assetManifest';

/**
 * Управляемый игроком персонаж.
 *
 * Визуально представлен прямоугольником-плейсхолдером (см. assetManifest.ts).
 * Когда появятся настоящие спрайт-анимации, здесь достаточно заполнить
 * ASSET_MANIFEST['player'].spriteSheetPath — остальная логика движения
 * и физики не изменится.
 */
export class Player extends Phaser.GameObjects.Container {
  /** Клавиши WASD, дублирующие стрелки для управления движением. */
  private readonly wasdKeys: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  /**
   * Ссылка на спрайт персонажа, если используется реальный спрайт-лист
   * (а не прямоугольник-плейсхолдер). Остаётся null, пока текстуры нет.
   */
  private spriteRef: Phaser.GameObjects.Sprite | null = null;

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

    // Ровно один визуальный объект тела персонажа: либо реальный спрайт
    // (если текстура уже загружена), либо прямоугольник-плейсхолдер.
    // (Раньше здесь ошибочно создавались оба объекта одновременно.)
    let bodyVisual: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;

    if (hasRealSprite) {
      // Точка опоры спрайта — центр по X, нижний край по Y (0.5, 1):
      // "ноги" персонажа должны стоять на полу, а не висеть по центру.
      // Локальная Y-координата = descriptor.height / 2 — это ровно нижняя
      // граница прямоугольника физического тела (тело центрировано
      // на (0,0) и имеет высоту descriptor.height), поэтому низ спрайта
      // точно совпадёт с нижней гранью хитбокса персонажа.
      const sprite = scene.add.sprite(
        0,
        descriptor.height / 2,
        descriptor.spriteSheetPath as string,
      );
      sprite.setOrigin(0.5, 1);
      // Исходный PNG 32×48 px отображается крупнее экранного разрешения
      // без потери чёткости пиксель-арта (в gameConfig.ts включён
      // pixelArt: true — сглаживание при масштабировании отключено).
      sprite.setScale(CHARACTER_DISPLAY_SCALE);

      this.ensureWalkAnimations(scene, descriptor.spriteSheetPath as string);
      this.spriteRef = sprite;
      bodyVisual = sprite;
    } else {
      const rect = scene.add.rectangle(0, 0, descriptor.width, descriptor.height, descriptor.color);
      rect.setStrokeStyle(2, 0xffffff, 0.6);
      bodyVisual = rect;
    }

    const label = scene.add.text(0, 0, descriptor.label, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
    });
    label.setOrigin(0.5, 0.5);
    label.setY(-descriptor.height / 2 - 10);

    this.add([bodyVisual, label]);
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
   * Точка расширения под анимации ходьбы по спрайт-листу. Пока реального
   * спрайта нет (hasRealSprite всегда false), тело метода не выполняется —
   * оставлен как заготовка на момент появления реальной графики персонажа.
   * @param scene сцена, которой принадлежит игрок
   * @param textureKey ключ текстуры спрайт-листа в кэше Phaser
   */
  private ensureWalkAnimations(scene: Phaser.Scene, textureKey: string): void {
    void scene;
    void textureKey;
    // TODO: реализовать вместе с добавлением реального спрайт-листа игрока
    // (см. таблицу масштабов: 128x192, 4 кадра x 32px, 4 направления x 48px).
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

    // Отражение спрайта по горизонтали — единственная доступная "анимация"
    // при статичном арте без отдельных кадров ходьбы. Предполагается, что
    // PNG-файл нарисован персонажем, смотрящим вправо (это направление
    // по умолчанию, flipX = false). При движении влево применяем зеркальное
    // отражение (flipX = true); при движении строго вверх/вниз без
    // горизонтальной составляющей — сохраняем последнее выбранное
    // направление взгляда (ничего не меняем), чтобы персонаж не "дёргался"
    // обратно вправо на каждом кадре движения по вертикали.
    if (this.spriteRef !== null) {
      if (velocityX < 0) {
        this.spriteRef.setFlipX(true);
      } else if (velocityX > 0) {
        this.spriteRef.setFlipX(false);
      }
    }
  }
    /**
   * Принудительно останавливает игрока (обнуляет скорость), не читая ввод
   * с клавиатуры. Используется HubScene, когда управление временно
   * отключено (идёт диалог или мини-игра), чтобы персонаж не продолжал
   * "ехать" с последней ненулевой скоростью, если контролы отключили
   * прямо в момент движения.
   */
  public stopMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }
}