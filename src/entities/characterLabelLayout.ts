import type Phaser from 'phaser';
import {
  CHARACTER_DISPLAY_SCALE,
  CHARACTER_LABEL_EXTRA_OFFSET_Y,
  CHARACTER_LABEL_GAP_PX,
  CHARACTER_PROMPT_GAP_PX,
} from '../config/constants';
import type { PlaceholderVisualDescriptor } from '../config/assetManifest';

/** Локальные Y-координаты надписей относительно точки ног персонажа. */
export interface CharacterLabelLayout {
  /** Y надписи с именем. */
  nameY: number;
  /** Y подсказки "Нажать E" (выше имени). */
  promptY: number;
}

/**
 * Считает высоту надписей по реальному верхнему краю спрайта. Спрайт рисуется
 * с привязкой по низу в точке descriptor.height / 2, поэтому его верх равен
 * feetY - высота_текстуры * масштаб. Если текстуры нет, используется прямоугольник
 * плейсхолдера.
 * @param scene сцена, в кэше которой лежит текстура персонажа
 * @param descriptor описание персонажа из ASSET_MANIFEST
 */
export function getCharacterLabelLayout(
  scene: Phaser.Scene,
  descriptor: PlaceholderVisualDescriptor,
): CharacterLabelLayout {
  const feetY = descriptor.height / 2;
  const hasSprite =
    descriptor.spriteSheetPath !== null && scene.textures.exists(descriptor.spriteSheetPath);

  const spriteTopY = hasSprite
    ? feetY - scene.textures.get(descriptor.spriteSheetPath as string).get().height * CHARACTER_DISPLAY_SCALE
    : -descriptor.height / 2;

  const extraOffsetY = CHARACTER_LABEL_EXTRA_OFFSET_Y[descriptor.id] ?? 0;
  const nameY = spriteTopY - CHARACTER_LABEL_GAP_PX + extraOffsetY;

  return { nameY, promptY: nameY - CHARACTER_PROMPT_GAP_PX };
}