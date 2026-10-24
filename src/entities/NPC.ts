import Phaser from 'phaser';
import {
  COLOR_TEXT_PRIMARY,
  INTERACTION_RADIUS,
  NPC_DISABLED_ALPHA,
  CHARACTER_DISPLAY_SCALE,
  CHARACTER_SPRITE_HEIGHT,
  CHARACTER_NAME_GAP_PX,
  CHARACTER_NAME_FONT_SIZE_PX,
  CHARACTER_NAME_BACKGROUND,
  CHARACTER_NAME_PADDING_X,
  CHARACTER_NAME_PADDING_Y,
} from '../config/constants';
import { ASSET_MANIFEST, type AssetManifestKey } from '../config/assetManifest';
import type { Player } from './Player';

/**
 * Неигровой персонаж (NPC), с которым можно взаимодействовать в хабе.
 *
 * Как и Player, визуально представлен прямоугольником-плейсхолдером из
 * assetManifest.ts — замена на спрайт-анимацию в будущем потребует правки
 * только этого файла (конструктора), а не сцен, которые NPC используют.
 *
 * NPC может быть временно "отключён" от сюжета (параметр isInteractive):
 * такой NPC визуально притушен (alpha = NPC_DISABLED_ALPHA), никогда не
 * показывает подсказку "Нажать E" и не должен запускать диалог — проверку
 * на это (npc.isInteractive) обязана выполнять вызывающая сцена (HubScene).
 */
export class NPC extends Phaser.GameObjects.Container {
  /** Уникальный технический идентификатор NPC (используется DialogueScene и HubScene). */
  public readonly npcId: string;

  /** Путь/ключ диалогового сценария, который нужно загрузить для этого NPC. */
  public readonly dialogueStoryPath: string;

  /** Человекочитаемое отображаемое имя NPC (берётся из assetManifest.ts). */
  public readonly displayName: string;

  /** Доступен ли сейчас диалог с этим NPC (false — сюжетная ветка временно отключена). */
  public readonly isInteractive: boolean;

  /** Текст-подсказка "Нажать E", отображаемый, когда игрок рядом. */
  private readonly promptText: Phaser.GameObjects.Text;

  /**
   * @param scene сцена, в которой размещается NPC
   * @param x координата X
   * @param y координата Y
   * @param npcId уникальный технический идентификатор NPC (например, "max")
   * @param assetKey ключ визуального плейсхолдера в assetManifest.ts
   * @param dialogueStoryPath идентификатор диалогового сценария (ключ в реестре историй)
   * @param isInteractive можно ли сейчас начать диалог с этим NPC (по умолчанию true)
   */
  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    npcId: string,
    assetKey: AssetManifestKey,
    dialogueStoryPath: string,
    isInteractive = true,
  ) {
    super(scene, x, y);

    this.npcId = npcId;
    this.dialogueStoryPath = dialogueStoryPath;
    this.isInteractive = isInteractive;

    const descriptor = ASSET_MANIFEST[assetKey];
    this.displayName = descriptor.label;

    const hasRealSprite = descriptor.spriteSheetPath !== null
      && scene.textures.exists(descriptor.spriteSheetPath);

    // Ровно один визуальный объект тела NPC: либо реальный PNG-спрайт
    // (если текстура уже загружена), либо прямоугольник-плейсхолдер —
    // та же логика, что и в Player.ts (см. комментарии там).
    let bodyVisual: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;

    if (hasRealSprite) {
      const sprite = scene.add.sprite(
        0,
        descriptor.height / 2,
        descriptor.spriteSheetPath as string,
      );
      sprite.setOrigin(0.5, 1);
      sprite.setScale(CHARACTER_DISPLAY_SCALE);
      bodyVisual = sprite;
    } else {
      const rect = scene.add.rectangle(0, 0, descriptor.width, descriptor.height, descriptor.color);
      rect.setStrokeStyle(2, 0xffffff, 0.5);
      bodyVisual = rect;
    }
// Реальная верхняя граница PNG с учётом масштаба.
// Контейнер остаётся привязанным к существующему физическому телу.
const spriteTopY = hasRealSprite
  ? descriptor.height / 2 -
    CHARACTER_SPRITE_HEIGHT * CHARACTER_DISPLAY_SCALE
  : -descriptor.height / 2;

// Имя располагается над головой, а не поверх лица.
const nameLabel = scene.add.text(
  0,
  spriteTopY - CHARACTER_NAME_GAP_PX,
  descriptor.label,
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

  nameLabel.setOrigin(0.5, 1);

  // Подсказку взаимодействия ставим выше имени,
  // используя фактическую высоту текста.
  this.promptText = scene.add.text(
    0,
    nameLabel.y - nameLabel.height - CHARACTER_NAME_GAP_PX,
    'Нажать E',
    {
      fontFamily: 'monospace',
      fontSize: `${CHARACTER_NAME_FONT_SIZE_PX}px`,
      color: '#fde68a',
      backgroundColor: CHARACTER_NAME_BACKGROUND,
      padding: {
        x: CHARACTER_NAME_PADDING_X,
        y: CHARACTER_NAME_PADDING_Y,
      },
    },
  );

  this.promptText.setOrigin(0.5, 1);
  this.promptText.setVisible(false);

    this.add([bodyVisual, nameLabel, this.promptText]);
    this.setSize(descriptor.width, descriptor.height);

    if (!this.isInteractive) {
      // Притушиваем весь контейнер целиком (тело + подпись), чтобы игрок
      // визуально считывал: с этим персонажем сейчас нельзя поговорить.
      this.setAlpha(NPC_DISABLED_ALPHA);
    }

    scene.add.existing(this);
    // Статичное физическое тело: NPC не двигается, но блокирует проход игроку.
    scene.physics.add.existing(this, true);
  }

  /**
   * Проверяет, находится ли игрок в радиусе взаимодействия (INTERACTION_RADIUS).
   * @param player управляемый игроком персонаж
   */
  public isPlayerInRange(player: Player): boolean {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    return distance <= INTERACTION_RADIUS;
  }

  /**
   * Показывает или скрывает подсказку "Нажать E" над головой NPC.
   * Для неинтерактивных NPC подсказка не показывается никогда, независимо
   * от переданного значения visible — это защита от забытых проверок флага
   * isInteractive в вызывающем коде (HubScene).
   * @param visible показать ли подсказку
   */
  public setPromptVisible(visible: boolean): void {
    this.promptText.setVisible(visible && this.isInteractive);
  }
}