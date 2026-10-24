import Phaser from 'phaser';
import {
  HUB_DESK_ALPHA_THRESHOLD,
  HUB_DESK_FOOTPRINT_HEIGHT_PX,
  HUB_DESK_MERGE_GAP_PX,
  HUB_DESK_MIN_AREA_PX,
} from '../../config/constants';
import type { HubDeskLayout } from '../../types/HubLayout';

/** Bounding box связной области непрозрачных пикселей. */
interface BlobBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
}

/** Проверяет, находятся ли два bounding box ближе, чем gap пикселей друг к другу. */
function areClose(a: BlobBounds, b: BlobBounds, gap: number): boolean {
  const overlapX = a.minX - gap <= b.maxX && b.minX - gap <= a.maxX;
  const overlapY = a.minY - gap <= b.maxY && b.minY - gap <= a.maxY;
  return overlapX && overlapY;
}

/** Объединяет два bounding box в один, суммируя площадь. */
function unite(a: BlobBounds, b: BlobBounds): BlobBounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
    area: a.area + b.area,
  };
}

/**
 * Делает одно слияние пары близких боксов. Возвращает false, если слияний нет.
 * Вызывается в цикле, пока есть что склеивать: после каждого слияния
 * bounding box вырос и мог зацепить соседей, которых раньше не касался.
 */
function mergeOnce(blobs: BlobBounds[], gap: number): boolean {
  for (let i = 0; i < blobs.length; i += 1) {
    for (let j = i + 1; j < blobs.length; j += 1) {
      if (areClose(blobs[i], blobs[j], gap)) {
        blobs[i] = unite(blobs[i], blobs[j]);
        blobs.splice(j, 1);
        return true;
      }
    }
  }
  return false;
}

/**
 * Находит парты на слое мебели. Каждая связная область непрозрачных пикселей
 * (4-связность, поиск в глубину) становится фрагментом. Близкие фрагменты
 * склеиваются, а итоговые прямоугольники меньше HUB_DESK_MIN_AREA_PX отбрасываются.
 *
 * Фрагменты склеиваются до фильтрации по площади: ножка парты сама по себе может
 * быть меньше порога, и без склейки её пришлось бы отбросить.
 *
 * @param scene сцена, в кэше которой лежит текстура слоя
 * @param layerKey ключ текстуры слоя мебели
 */
export function detectDeskLayouts(scene: Phaser.Scene, layerKey: string): HubDeskLayout[] {
  if (!scene.textures.exists(layerKey)) {
    return [];
  }

  const source = scene.textures.get(layerKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const width = source.width;
  const height = source.height;

  // Читаем пиксели через offscreen-canvas: ассеты лежат в public/, поэтому
  // браузер не блокирует getImageData (tainted canvas не возникает).
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) {
    console.warn('[detectDeskLayouts] Не удалось получить 2D-контекст, парты не определены.');
    return [];
  }
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;

  const pixelCount = width * height;
  // visited: помеченные пиксели, чтобы одна область не обходилась дважды.
  const visited = new Uint8Array(pixelCount);
  // stack: индексы для поиска в глубину. Каждый пиксель попадает в стек не больше
  // одного раза (благодаря visited), поэтому размера pixelCount хватает.
  const stack = new Int32Array(pixelCount);

  const isSolid = (index: number): boolean => pixels[index * 4 + 3] >= HUB_DESK_ALPHA_THRESHOLD;

  const blobs: BlobBounds[] = [];

  for (let seed = 0; seed < pixelCount; seed += 1) {
    if (visited[seed] === 1 || !isSolid(seed)) {
      continue;
    }

    let stackSize = 0;
    stack[stackSize] = seed;
    stackSize += 1;
    visited[seed] = 1;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let area = 0;

    while (stackSize > 0) {
      stackSize -= 1;
      const index = stack[stackSize];
      const x = index % width;
      const y = (index - x) / width;

      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      // Соседи по 4 направлениям; -1 означает выход за границу картинки.
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour >= 0 && visited[neighbour] === 0 && isSolid(neighbour)) {
          visited[neighbour] = 1;
          stack[stackSize] = neighbour;
          stackSize += 1;
        }
      }
    }

    blobs.push({ minX, minY, maxX, maxY, area });
  }

  let changed = true;
  while (changed) {
    changed = mergeOnce(blobs, HUB_DESK_MERGE_GAP_PX);
  }

    // ВРЕМЕННАЯ ОТЛАДКА. Удалить после диагностики.
  let solidCount = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    if (isSolid(index)) solidCount += 1;
  }
  console.info(
    `[debug] solid px: ${solidCount} of ${pixelCount}, blobs before merge: ${blobs.length}`,
    blobs.map((b) => `${b.minX},${b.minY} ${b.maxX - b.minX + 1}x${b.maxY - b.minY + 1} area=${b.area}`),
  );
  const layouts: HubDeskLayout[] = blobs
    .filter((blob) => blob.area >= HUB_DESK_MIN_AREA_PX)
    .map((blob) => ({
      x: blob.minX,
      y: blob.minY,
      width: blob.maxX - blob.minX + 1,
      height: blob.maxY - blob.minY + 1,
      footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX,
    }));

  console.info(
    `[detectDeskLayouts] Найдено парт: ${layouts.length}`,
    layouts.map((desk) => `${desk.x},${desk.y} ${desk.width}x${desk.height}`),
  );
  return layouts;
}