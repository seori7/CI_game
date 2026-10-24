import {
  COLOR_NPC_LENA,
  COLOR_NPC_MAX,
  COLOR_NPC_NASTYA,
  COLOR_PLAYER,
} from './constants';

/**
 * Описание визуального представления игрового объекта-плейсхолдера.
 * Пока у нас нет финальных спрайтов, каждый объект рисуется как цветной
 * прямоугольник с подписью. Когда появятся спрайт-листы, достаточно
 * добавить в запись поле `spriteKey`/`spriteSheetPath` и переключить
 * фабрики в entities/* на использование `this.scene.add.sprite(...)`
 * вместо `Graphics`/`Rectangle` — сами сцены трогать не придётся.
 */
export interface PlaceholderVisualDescriptor {
  /** Логический идентификатор объекта, уникальный в пределах манифеста. */
  id: string;
  /** Цвет заливки прямоугольника-плейсхолдера (hex-число). */
  color: number;
  /** Ширина прямоугольника в пикселях. */
  width: number;
  /** Высота прямоугольника в пикселях. */
  height: number;
  /** Текстовая подпись, отображаемая поверх прямоугольника. */
  label: string;
  /**
   * Путь к будущему спрайт-листу. Пока всегда `null` — зарезервировано для
   * перехода на реальную графику без изменения кода сцен.
   */
  spriteSheetPath: string | null;
  frameWidth?: number;
  /** Высота одного кадра анимации в спрайт-листе (px). Обязательно, если spriteSheetPath задан. */
  frameHeight?: number;
}

/**
 * Реестр всех визуальных плейсхолдеров игры, сопоставленных по логическому
 * имени объекта. Сцены и сущности должны брать описание отсюда, а не
 * хардкодить цвета/размеры у себя.
 */
export const ASSET_MANIFEST: Record<string, PlaceholderVisualDescriptor> = {
  player: {
    id: 'player',
    color: COLOR_PLAYER,
    width: 28,
    height: 36,
    label: 'ТЫ',
    spriteSheetPath: 'assets/characters/player.png',
    frameWidth: 32,
    frameHeight: 48,
  },
  npc_max: {
    id: 'npc_max',
    color: COLOR_NPC_MAX,
    width: 30,
    height: 38,
    label: 'Мася',
    spriteSheetPath: 'assets/characters/npc_programmer.png',
  },
  npc_nastya: {
    id: 'npc_nastya',
    color: COLOR_NPC_NASTYA,
    width: 30,
    height: 38,
    label: 'Рома',
    spriteSheetPath: 'assets/characters/npc_builder.png',
  },
  npc_lena: {
    id: 'npc_lena',
    color: COLOR_NPC_LENA,
    width: 30,
    height: 38,
    label: 'Юни',
    spriteSheetPath: 'assets/characters/npc_medic.png',
  },
};

/** Путь к фоновому изображению хаба. null = рисуем Graphics-заглушку. */
export const HUB_BACKGROUND_PATH: string | null = 'assets/backgrounds/hub_room.png';

/**
 * Слой мебели хаба (только парты, фон прозрачный, 960×540). Рисуется поверх
 * пола, чтобы персонаж мог заходить за парты. null = парты не рисуются
 * отдельно, работают только коллайдеры.
 */
export const HUB_FURNITURE_LAYER_PATH: string | null = 'assets/backgrounds/hub_furniture.png';

/** Фон экрана ввода ника (960×540). null = цветная заглушка. */
export const MENU_BACKGROUND_PATH: string | null = 'assets/ui/menu_background.png';
/** Тип ключа манифеста ассетов — используется для строгой типизации обращений. */
export type AssetManifestKey = keyof typeof ASSET_MANIFEST;
