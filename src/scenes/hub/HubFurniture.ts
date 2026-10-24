import Phaser from 'phaser';
import {
  HUB_DEBUG_COLLISIONS,
  HUB_ENTITY_DEPTH_OFFSET,
  HUB_FURNITURE_BASE_DEPTH,
  HUB_UI_DEPTH,
} from '../../config/constants';
import { HUB_FURNITURE_LAYER_PATH } from '../../config/assetManifest';
import type { HubDeskLayout } from '../../types/HubLayout';
import { detectDeskLayouts } from './detectDeskLayouts';

/** Y нижнего (фронтального) края парты: линия, где она стоит на полу. */
function getFrontEdgeY(desk: HubDeskLayout): number {
  return desk.y + desk.height;
}

/**
 * Мебель хаба (парты). Делает две вещи:
 * 1. Коллизия: невидимый статичный прямоугольник по footprint каждой парты.
 * 2. Порядок отрисовки: персонаж выше фронтального края парты стоит за ней,
 *    ниже — перед ней (см. getDepthForFeetY).
 *
 * Список парт берётся из HUB_DESKS. Если он пуст, парты определяются
 * автоматически по слою hub_furniture.png (detectDeskLayouts). Визуал каждой
 * парты — это обрезка (crop) того же слоя по её bounding box, поэтому
 * коллизии и картинка всегда совпадают.
 */
export class HubFurniture {
  private readonly scene: Phaser.Scene;
  private readonly collisionGroup: Phaser.Physics.Arcade.StaticGroup;
  /** Фронтальные края парт по возрастанию. Индекс совпадает с depth-слотом парты. */
  private readonly sortedFrontEdges: number[];

  /**
   * @param scene сцена хаба
   * @param manualDesks ручные координаты парт; пустой массив = автоопределение
   */
  public constructor(scene: Phaser.Scene, manualDesks: HubDeskLayout[]) {
    this.scene = scene;
    this.collisionGroup = scene.physics.add.staticGroup();

    const layerKey =
      HUB_FURNITURE_LAYER_PATH !== null && scene.textures.exists(HUB_FURNITURE_LAYER_PATH)
        ? HUB_FURNITURE_LAYER_PATH
        : null;

    if (layerKey === null && HUB_FURNITURE_LAYER_PATH !== null) {
      console.warn(
        `[HubFurniture] Слой мебели "${HUB_FURNITURE_LAYER_PATH}" не загружен. ` +
          'Парты не будут видны и не будут коллидировать.',
      );
    }


    let desks: HubDeskLayout[] = manualDesks;
    if (desks.length === 0 && layerKey !== null) {
      desks = detectDeskLayouts(scene, layerKey);
    }

    const sortedDesks = [...desks].sort((a, b) => getFrontEdgeY(a) - getFrontEdgeY(b));
    this.sortedFrontEdges = sortedDesks.map(getFrontEdgeY);

    sortedDesks.forEach((desk, index) => {
      if (layerKey !== null) {
        this.addDeskVisual(layerKey, desk, index);
      }
      this.addDeskCollider(desk);
    });

    if (HUB_DEBUG_COLLISIONS) {
      scene.physics.world.drawDebug = true;
      scene.physics.world.createDebugGraphic().setDepth(HUB_UI_DEPTH);
    }
  }

  /**
   * Подключает коллизию парт к физическому объекту (обычно к игроку).
   * @param target объект с физическим телом
   */
  public collideWith(target: Phaser.Types.Physics.Arcade.ArcadeColliderType): void {
    this.scene.physics.add.collider(target, this.collisionGroup);
  }

  /**
   * Возвращает depth для персонажа по Y его ног (нижний край физического тела).
   * Парты, у которых фронтальный край выше ног, стоят за персонажем. Массив
   * отсортирован, поэтому такие парты образуют его префикс.
   * @param feetY Y нижнего края физического тела персонажа
   */
  public getDepthForFeetY(feetY: number): number {
    let desksBehindCharacter = 0;
    for (const frontEdge of this.sortedFrontEdges) {
      if (frontEdge >= feetY) {
        break;
      }
      desksBehindCharacter += 1;
    }
    return HUB_FURNITURE_BASE_DEPTH + desksBehindCharacter + HUB_ENTITY_DEPTH_OFFSET;
  }

  /**
   * Выводит визуал одной парты: обрезка общего слоя по её bounding box.
   * Обрезка нужна, потому что слой общий для всех парт, и без неё парта
   * с большим depth закрывала бы соседние.
   * @param layerKey ключ текстуры слоя мебели
   * @param desk описание парты
   * @param index индекс парты в отсортированном порядке (задаёт depth)
   */
  private addDeskVisual(layerKey: string, desk: HubDeskLayout, index: number): void {
    this.scene.add
      .image(0, 0, layerKey)
      .setOrigin(0, 0)
      .setCrop(desk.x, desk.y, desk.width, desk.height)
      .setDepth(HUB_FURNITURE_BASE_DEPTH + index);
  }

  /**
   * Создаёт невидимый статичный коллайдер по нижней полосе парты.
   * @param desk описание парты
   */
  private addDeskCollider(desk: HubDeskLayout): void {
    const footprintCenterY = desk.y + desk.height - desk.footprintHeight / 2;
    const footprint = this.scene.add
      .rectangle(desk.x + desk.width / 2, footprintCenterY, desk.width, desk.footprintHeight)
      .setVisible(false);
    this.collisionGroup.add(footprint);
  }
}