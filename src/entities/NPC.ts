import Phaser from 'phaser';
import { COLOR_TEXT_PRIMARY, INTERACTION_RADIUS } from '../config/constants';
import { ASSET_MANIFEST, type AssetManifestKey } from '../config/assetManifest';
import type { Player } from './Player';

/**
 * Неигровой персонаж (NPC), с которым можно взаимодействовать в хабе.
 *
 * Как и Player, визуально представлен прямоугольником-плейсхолдером из
 * assetManifest.ts — замена на спрайт-анимацию в будущем потребует правки
 * только этого файла (конструктора), а не сцен, которые NPC используют.
 */
export class NPC extends Phaser.GameObjects.Container {
  /** Уникальный идентификатор NPC (используется DialogueScene и HubScene). */
  public readonly npcId: string;

  /** Путь/ключ диалогового сценария, который нужно загрузить для этого NPC. */
  public readonly dialogueStoryPath: string;

  /** Текст-подсказка "Нажать E", отображаемый, когда игрок рядом. */
  private readonly promptText: Phaser.GameObjects.Text;

  /**
   * @param scene сцена, в которой размещается NPC
   * @param x координата X
   * @param y координата Y
   * @param npcId уникальный идентификатор NPC (например, "max")
   * @param assetKey ключ визуального плейсхолдера в assetManifest.ts
   * @param dialogueStoryPath идентификатор диалогового сценария (ключ в реестре историй)
   */
  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    npcId: string,
    assetKey: AssetManifestKey,
    dialogueStoryPath: string,
  ) {
    super(scene, x, y);

    this.npcId = npcId;
    this.dialogueStoryPath = dialogueStoryPath;

    const descriptor = ASSET_MANIFEST[assetKey];

    const bodyRect = scene.add.rectangle(0, 0, descriptor.width, descriptor.height, descriptor.color);
    bodyRect.setStrokeStyle(2, 0xffffff, 0.5);

    const nameLabel = scene.add.text(0, 0, descriptor.label, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
    });
    nameLabel.setOrigin(0.5, 0.5);
    nameLabel.setY(-descriptor.height / 2 - 10);

    this.promptText = scene.add.text(0, 0, 'Нажать E', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#fde68a',
      backgroundColor: '#00000099',
      padding: { x: 4, y: 2 },
    });
    this.promptText.setOrigin(0.5, 0.5);
    this.promptText.setY(-descriptor.height / 2 - 28);
    this.promptText.setVisible(false);

    this.add([bodyRect, nameLabel, this.promptText]);
    this.setSize(descriptor.width, descriptor.height);

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
   * @param visible показать ли подсказку
   */
  public setPromptVisible(visible: boolean): void {
    this.promptText.setVisible(visible);
  }
}
