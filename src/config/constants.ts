import type { HubDeskLayout } from '../types/HubLayout';
/**
 * Центральный файл числовых и прочих "магических" констант игры.
 * Все значения, влияющие на баланс, геометрию сцены и тайминги,
 * должны объявляться здесь и импортироваться туда, где они нужны —
 * это упрощает балансировку игры без поиска чисел по всему коду.
 */

/** Скорость перемещения игрока в пикселях в секунду. */
export const PLAYER_SPEED = 160;

/** Радиус зоны обнаружения NPC для срабатывания диалога (в пикселях). */
export const INTERACTION_RADIUS = 48;

/** Задержка между появлением символов при "печати" текста диалога (мс). */
export const DIALOGUE_TYPING_SPEED_MS = 30;

// ---------------------------------------------------------------------------
// Геометрия окна диалога (DialogueScene).
// ---------------------------------------------------------------------------

/**
 * Высота окна диалога у нижнего края экрана (px). Рассчитана на 5 строк
 * реплики и 2 варианта выбора (максимум в текущих ink-историях).
 * Если добавляешь больше вариантов или длинные реплики — увеличь её,
 * иначе кнопки уйдут за нижний край (предупреждение выводится в консоль).
 */
export const DIALOGUE_BOX_HEIGHT = 230;

/** Внутренний горизонтальный отступ текста от краёв окна диалога (px). */
export const DIALOGUE_BOX_PADDING = 24;

/** Смещение строки с именем NPC от верхней границы окна (px). */
export const DIALOGUE_NAME_OFFSET_Y = 12;

/** Смещение текста реплики от верхней границы окна (px). Ниже имени с запасом. */
export const DIALOGUE_BODY_OFFSET_Y = 38;

/** Вертикальный шаг между вариантами выбора (px). */
export const DIALOGUE_CHOICE_LINE_HEIGHT = 30;

/**
 * Зазор между нижним краем реплики и первым вариантом выбора (px).
 * Кнопки привязаны к реальной высоте текста, а не к фиксированной координате,
 * иначе длинная реплика снова наедет на них.
 */
export const DIALOGUE_CHOICES_GAP_Y = 16;

/** Отступ подсказки "ПРОБЕЛ ▸" от нижнего края экрана (px). */
export const DIALOGUE_PROMPT_MARGIN_Y = 16;

/** Базовая ширина игрового канваса в пикселях. */
export const GAME_WIDTH = 960;

/** Базовая высота игрового канваса в пикселях. */
export const GAME_HEIGHT = 540;

/** Размер одного тайла сетки мира в пикселях. */
export const TILE_SIZE = 32;

/** Ширина комнаты-хаба в тайлах. */
export const HUB_ROOM_WIDTH_TILES = 20;

/** Высота комнаты-хаба в тайлах. */
export const HUB_ROOM_HEIGHT_TILES = 12;

/** Максимальное значение полоски стресса (условные единицы). */
export const STRESS_BAR_MAX = 100;

/** Ширина полоски стресса на экране (пиксели). */
export const STRESS_BAR_WIDTH = 220;

/** Высота полоски стресса на экране (пиксели). */
export const STRESS_BAR_HEIGHT = 18;

// ---------------------------------------------------------------------------
// Цвета плейсхолдеров (используются как в assetManifest, так и при отрисовке
// служебных UI-элементов вроде стен/пола комнаты).
// ---------------------------------------------------------------------------

/** Цвет прямоугольника-плейсхолдера игрока. */
export const COLOR_PLAYER = 0x4fd1c5;

/** Цвет прямоугольника-плейсхолдера NPC "Макс" (программист). */
export const COLOR_NPC_MAX = 0x63b3ed;

/** Цвет прямоугольника-плейсхолдера NPC "Настя" (строитель). */
export const COLOR_NPC_NASTYA = 0xf6ad55;

/** Цвет прямоугольника-плейсхолдера NPC "Лена" (медик). */
export const COLOR_NPC_LENA = 0xfc8181;

/** Прозрачность NPC, временно отключённых от сюжета (их ветка ещё не готова/не в фокусе). */
export const NPC_DISABLED_ALPHA = 0.35;
/**
 * Размер одного PNG-файла персонажа (игрок и NPC-одноклассники) "как есть" —
 * то есть реальная ширина/высота файла на диске, без увеличения.
 * Используется, чтобы правильно позиционировать точку опоры персонажа
 * (низ спрайта = "ноги", должны стоять на полу).
 */
export const CHARACTER_SPRITE_WIDTH = 32;
export const CHARACTER_SPRITE_HEIGHT = 48;

/**
 * Во сколько раз персонаж отображается крупнее исходного PNG на экране.
 * 2 = исходные 32×48 px рисуются на канвасе как 64×96 px.
 * Масштабирование делается через setScale (а не через растягивание
 * текстуры), поэтому пиксель-арт остаётся чётким — Phaser настроен
 * в режиме pixelArt: true (без сглаживания при масштабировании).
 */
export const CHARACTER_DISPLAY_SCALE = 2;
// ---------------------------------------------------------------------------
// Анимация персонажа.
// ---------------------------------------------------------------------------

/**
 * Количество кадров ходьбы в каждом направлении.
 * Художник подготовил четыре последовательных кадра.
 */
export const PLAYER_WALK_FRAMES = 4;

/**
 * Частота воспроизведения анимации ходьбы.
 * 8 кадров в секунду дают плавную, но сохраняющую пиксельный стиль походку.
 */
export const PLAYER_WALK_FRAME_RATE = 8;

/**
 * Индексы первых кадров каждого направления в спрайтлисте.
 * Спрайтлист содержит четыре строки по четыре кадра.
 */
export const PLAYER_ANIMATION_FRAMES = {
  down: 0,
  left: 4,
  right: 8,
  up: 12,
} as const;

/**
 * Названия анимаций Phaser.
 * Отдельные ключи исключают конфликты с анимациями NPC.
 */
export const PLAYER_ANIMATION_KEYS = {
  down: 'player-walk-down',
  left: 'player-walk-left',
  right: 'player-walk-right',
  up: 'player-walk-up',
} as const;

/**
 * Расстояние между верхним краем изображения персонажа
 * и нижним краем подписи с его именем.
 */
export const CHARACTER_NAME_GAP_PX = 8;

/** Размер текста имени персонажа. */
export const CHARACTER_NAME_FONT_SIZE_PX = 14;

/**
 * Цвет подложки имени.
 * Полупрозрачный фон помогает читать надпись на пёстром фоне хаба.
 */
export const CHARACTER_NAME_BACKGROUND = '#00000099';

/** Горизонтальный отступ текста внутри подложки. */
export const CHARACTER_NAME_PADDING_X = 5;

/** Вертикальный отступ текста внутри подложки. */
export const CHARACTER_NAME_PADDING_Y = 2;

/** Цвет пола комнаты-хаба. */
export const COLOR_FLOOR = 0x2d3748;

/** Цвет стен комнаты-хаба. */
export const COLOR_WALL = 0x1a202c;

/** Цвет текста подсказок и основного UI. */
export const COLOR_TEXT_PRIMARY = 0xf7fafc;

// ---------------------------------------------------------------------------
// Константы мини-игры "Программист" (Code Review Sim).
// ---------------------------------------------------------------------------

/** Время на прохождение каждого из 3 уровней (в секундах). */
export const PROGRAMMER_LEVEL_TIMES = [30, 40, 45];

/** Прирост стресса в секунду для каждого уровня (чем дальше, тем быстрее растёт). */
export const PROGRAMMER_STRESS_TICKS = [1.2, 1.5, 2.0];

/** Штраф стресса за клик мимо уязвимости (ошибка ревьюера). */
export const PROGRAMMER_PENALTY_STRESS = 15;

/** Геометрия макета браузера */
export const BROWSER_WIDTH = 520;
export const BROWSER_HEIGHT = 380;
export const CHECKLIST_WIDTH = 280;

// Цветовая палитра для макета браузера (стиль wireframe/dark-mode)
export const COLOR_BROWSER_BG = 0x1e293b;
export const COLOR_BROWSER_UI = 0x334155;
export const COLOR_BUG_FOUND = 0x22c55e; // Зелёный при нахождении
export const COLOR_BUG_HOVER = 0x475569;
export const COLOR_TEXT_MUTED = '#94a3b8';
export const COLOR_TEXT_DANGER = '#fca5a5';

// ---------------------------------------------------------------------------
// Константы для Меню (COLOR_UI_* используются в CatalogScene — не трогать)
// ---------------------------------------------------------------------------
export const COLOR_UI_PRIMARY = 0x2563eb;
export const COLOR_UI_SUCCESS = 0x16a34a;
export const COLOR_UI_ERROR = 0xdc2626;

// ---------------------------------------------------------------------------
// Константы мини-игры "Боссфайт: Чит Маси" (замена UX/UI-конструктора).
// ---------------------------------------------------------------------------
export const BOSS_BOX_WIDTH = 360;
export const BOSS_BOX_HEIGHT = 300;
export const BOSS_SOUL_SPEED = 220;          // пикселей в секунду
export const BOSS_SOUL_RADIUS = 10;
export const BOSS_BULLET_RADIUS = 9;
export const BOSS_HIT_STRESS = 20;           // урон при попадании снаряда
export const BOSS_CHEAT_SUCCESS_RELIEF = 10; // облегчение за верный чит-ввод
export const BOSS_CHEAT_FAIL_STRESS = 15;    // штраф за неверный/просроченный чит-ввод
export const BOSS_INVULNERABILITY_MS = 800;  // i-frames после попадания
export const BOSS_WAVE_BREATHER_RELIEF = 15; // снижение стресса между волнами
// --- Новые опасности: стены костей и гастер-бластеры ---
export const BOSS_BONE_THICKNESS = 22;       // толщина сегмента стены костей
export const BOSS_BONE_SPEED = 170;          // скорость движения стены, px/сек
export const BOSS_BONE_GAP_SIZE = 90;        // размер прохода в стене, px
export const BOSS_BLASTER_TELEGRAPH_MS = 850; // время предупреждения перед лучом
export const BOSS_BLASTER_BEAM_MS = 300;      // время существования самого луча
export const BOSS_BLASTER_THICKNESS = 55;     // толщина луча, px
export const BOSS_CAPTION_FADE_MS = 2200;     // через сколько гаснет сноска с кодом
export const BOSS_INVISIBLE_DURATION_MS = 1600;
export const BOSS_LOOP_PATTERN_DURATION_MS = 1800;
export const BOSS_SHIELD_DURATION_MS = 6000;
export const BOSS_SHIELD_RING_COLOR = 0x34d399;
// ---------------------------------------------------------------------------
// Константы мини-игры "Алгоритмика" (Робот-курьер)
// ---------------------------------------------------------------------------
export const DRONE_CELL_SIZE = 50;
export const DRONE_SLOT_SIZE = 45;
export const DRONE_LEVEL_TIMES = [30, 45, 50];
export const DRONE_STRESS_TICKS = [1.2, 1.5, 2.0];
// --- Верхняя диалоговая панель (портрет + печатающийся текст) --------------
export const BOSS_TOP_PANEL_WIDTH = 560;
export const BOSS_TOP_PANEL_HEIGHT = 120;
export const BOSS_PORTRAIT_SIZE = 90;
export const BOSS_TYPEWRITER_MS = 28;        // мс на один символ диалога
export const BOSS_CODE_TYPEWRITER_MS = 14;   // мс на символ в окне автопилота (быстрее)

// --- Цветные кости (аналог Sans blue/orange attacks) ------------------------
export const BOSS_BONE_COLOR_NORMAL = 0xe2e8f0;
export const BOSS_BONE_COLOR_BLUE = 0x60a5fa;
export const BOSS_BONE_COLOR_ORANGE = 0xf97316;

// --- Мини-игра "Печать слова" + автопилот-награда ---------------------------
export const BOSS_WORD_CHALLENGE_RELIEF = 18;
export const BOSS_AUTOPILOT_MS = 900;
export const BOSS_ARENA_TOP_ROW_HEIGHT = 50; // резерв под заголовок/кнопку "Сдаться"
export const BOSS_ARENA_FOOTER_HEIGHT = 50;  // резерв под статус-текст снизу

export const BOSS_DIALOGUE_AUTO_ADVANCE_MS = 2500;
export const BOSS_DIM_OVERLAY_ALPHA = 0.6;
export const BOSS_DIM_FADE_MS = 450;
export const BOSS_BEAT_BREATHER_MS = 450;
export const BOSS_DODGE_PUSH_DISTANCE = 70;
export const CHEAT_DEMO_THREAT_DISTANCE = 90;
export const BOSS_INTRO_COUNTDOWN_MS = 3000;
export const BOSS_BULLET_MAX_AGE_MS = 6000;
export const BOSS_BEAT_SAFETY_TIMEOUT_MS = 9000;

// Длина самого длинного чит-слова ("else") — размер скользящего буфера
// последних введённых символов. Буфера такой длины достаточно, чтобы
// проверить совпадение с окончанием любого из 4 слов (if/for/let/else).
export const MAX_CHEAT_WORD_LENGTH = 4;

// Пауза (мс) после срабатывания чита, в течение которой повторный ввод
// игнорируется — защита от случайного двойного срабатывания из-за
// "налезающих" друг на друга последних символов буфера.
export const CHEAT_RETRIGGER_COOLDOWN_MS = 350;

// Размер шрифта текста-награды (строка кода после успешного чита).
// Раньше было 13px мелким текстом у полоски стресса — теперь крупно, сбоку.
export const BOSS_REWARD_CAPTION_FONT_SIZE = '22px';

// Сколько миллисекунд текст-награда держится на экране на полной
// непрозрачности перед угасанием (раньше — захардкоженное число 1800).
export const BOSS_REWARD_CAPTION_HOLD_MS = 3200;

/** Карты города (3 уровня). 0=пусто, 1=пробка, 2=Старт, 3=Финиш */
export const DRONE_LEVEL_MAPS = [
    {
        grid: [
            [1, 0, 0],
            [2, 2, 0],
            [0, 0, 3]
        ],
        maxCommands: 8, // Было слишком мало, увеличено для запаса (минимум 4)
        timeLimit: 30
    },
    {
        grid: [
            [1, 0, 2, 0],
            [2, 0, 0, 0],
            [2, 2, 2, 0],
            [0, 0, 0, 3]
        ],
        maxCommands: 12, // Минимум нужно 6 шагов
        timeLimit: 45
    },
    {
        grid: [
            [1, 0, 0, 2, 0],
            [2, 2, 0, 2, 0],
            [0, 0, 0, 0, 0],
            [0, 2, 2, 2, 0],
            [0, 0, 0, 0, 3]
        ],
        maxCommands: 16, // Сложный уровень, даем большой запас
        timeLimit: 60
    }
];
// ---------------------------------------------------------------------------
// Константы мини-игры "Медик" (диагностика по симптомам).
// ---------------------------------------------------------------------------

/** На сколько единиц растёт стресс за одну ошибку в квизе медика. */
export const MEDIC_STRESS_INCREASE_PER_MISTAKE = 18;

/** Время подсветки правильного/неправильного ответа (мс). */
export const MEDIC_ANSWER_HIGHLIGHT_MS = 800;

// ---------------------------------------------------------------------------
// Константы мини-игры "Строитель" (мост с бюджетом).
// ---------------------------------------------------------------------------

/** Количество колонок сетки моста. */
export const BUILDER_GRID_COLUMNS = 10;

/** Количество строк сетки моста. */
export const BUILDER_GRID_ROWS = 3;

/** Максимальное количество опор, доступных игроку. */
export const BUILDER_MAX_BUDGET = 6;

/** Максимальный безопасный пролёт между соседними опорами (в клетках). */
export const BUILDER_MAX_SAFE_SPAN = 3;

/** Прирост стресса при каждом обрушении моста. */
export const BUILDER_STRESS_PER_COLLAPSE = 20;

/** Размер одной клетки сетки моста в пикселях. */
export const BUILDER_CELL_SIZE = 64;

// ---------------------------------------------------------------------------
// Ключи хранения данных в localStorage.
// ---------------------------------------------------------------------------

/** Ключ localStorage для хранения auth-токена PocketBase. */
export const STORAGE_KEY_AUTH_TOKEN = 'profpath_pb_auth';

/** Ключ localStorage для хранения прогресса игрока как резервной копии. */
export const STORAGE_KEY_PROGRESS = 'profpath_progress_fallback';

/** Ключ localStorage для очереди несинхронизированных результатов мини-игр. */
export const STORAGE_KEY_PENDING_RESULTS = 'profpath_pending_minigame_results';

// ---------------------------------------------------------------------------
// Хаб: мебель (парты) и порядок отрисовки.
// ---------------------------------------------------------------------------

/**
 * Базовый depth слоя мебели хаба. Фон и стены имеют depth 0, поэтому парты
 * и персонаж (с depth выше этого значения) рисуются поверх фона.
 */
export const HUB_FURNITURE_BASE_DEPTH = 10;

/**
 * Дробная добавка к depth персонажа. Нужна, чтобы персонаж стоял СТРОГО между
 * партами: целое значение совпало бы с depth парты и порядок зависел бы от
 * порядка создания объектов.
 */
export const HUB_ENTITY_DEPTH_OFFSET = 0.5;

/** Depth подсказок и отладочной графики: поверх всего хаба. */
export const HUB_UI_DEPTH = 1000;

/**
 * Отладочная отрисовка физических тел (коллайдеры парт и хитбокс игрока).
 * Нужна для подгонки HUB_DESKS. В сборке для демо должно быть false.
 */
export const HUB_DEBUG_COLLISIONS = false;

/**
 * Парты хаба. Координаты в пикселях ВСЕГО канваса 960×540 (как в hub_room.png),
 * а не относительно комнаты.
 * ЗНАЧЕНИЯ УСЛОВНЫЕ: замени их на реальные координаты с PNG и сверь через HUB_DEBUG_COLLISIONS.
 *   x, y, width, height: прямоугольник всей парты (то, что рисует слой мебели);
 *   footprintHeight: высота нижней полосы парты, которой она стоит на полу.
 *                    Только эта полоса непроходима для персонажа.
 */
/**
 * Ручные координаты парт. Пустой массив = парты определяются автоматически
 * по прозрачности слоя hub_furniture.png (см. detectDeskLayouts.ts).
 * Заполняй вручную только если автоопределение склеивает две соседние парты
 * в одну; тогда формат тот же: x, y, width, height, footprintHeight в px канваса 960×540.
 */

/**
 * Порог непрозрачности пикселя слоя мебели (0–255), начиная с которого пиксель
 * считается частью парты. Полупрозрачные тени ниже порога и не склеивают парты.
 */
export const HUB_DESK_ALPHA_THRESHOLD = 128;

/**
 * Минимальная площадь связной области (px²), чтобы считать её партой.
 * Отсекает мелкий шум и артефакты экспорта. Парта 96×64 даёт около 6000 px².
 */
export const HUB_DESK_MIN_AREA_PX = 1500;

/**
 * Зазор (px), при котором два фрагмента одной парты склеиваются в один прямоугольник.
 * Нужен потому, что столешница и ножки парты на слое разделены прозрачной полосой.
 */
export const HUB_DESK_MERGE_GAP_PX = 8;
/**
 * Высота нижней полосы парты (px), которой она стоит на полу.
 * Эта полоса непроходима для персонажа. Подбирается по картинке: обычно 12–20 px.
 */
export const HUB_DESK_FOOTPRINT_HEIGHT_PX = 16;

/**
 * Координаты парт хаба в пикселях канваса 960×540 (как в hub_furniture.png).
 * Сетка 4 колонки × 3 ряда плюс учительский стол. Заданы вручную: автоопределение
 * нашло колонки верно, но ряды 1 и 2 склеились из-за теней, поэтому ряды
 * восстановлены по шагу 62 px.
 */
export const HUB_DESKS: HubDeskLayout[] = [
  // Учительский стол у доски.
  { x: 349, y: 159, width: 184, height: 80, footprintHeight:30 },

  // Ряд 1 (y = 260).
  { x: 223, y: 260, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 361, y: 260, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 493, y: 260, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 642, y: 260, width: 76, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },

  // Ряд 2 (y = 322).
  { x: 223, y: 322, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 361, y: 322, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 493, y: 322, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 642, y: 322, width: 76, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },

  // Ряд 3 (y = 385).
  { x: 223, y: 385, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 361, y: 385, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 493, y: 385, width: 75, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
  { x: 642, y: 385, width: 76, height: 56, footprintHeight: HUB_DESK_FOOTPRINT_HEIGHT_PX },
];

// ---------------------------------------------------------------------------
// Экран ввода ника (NicknameScene).
// ---------------------------------------------------------------------------

/** Размер заголовка «ПрофПуть» (px). */
export const MENU_TITLE_FONT_SIZE_PX = 48;
/** Размер подзаголовка (px). */
export const MENU_SUBTITLE_FONT_SIZE_PX = 18;
/** Размер строки статуса и ошибок (px). */
export const MENU_STATUS_FONT_SIZE_PX = 14;
/** Размер подсказки под формой (px). */
export const MENU_HINT_FONT_SIZE_PX = 12;

/** Вертикальные смещения текстов от центра экрана (px, отрицательные — вверх). */
export const MENU_TITLE_OFFSET_Y = -150;
export const MENU_SUBTITLE_OFFSET_Y = -96;
/** Статус выводится под HTML-панелью с запасом (панель ~110px по высоте). */
export const MENU_STATUS_OFFSET_Y = 110;

/** Обводка и смещение тени заголовка: даёт «пиксельный» объём. */
export const MENU_TITLE_STROKE_THICKNESS = 6;
export const MENU_TITLE_SHADOW_OFFSET = 4;
export const MENU_TITLE_STROKE_COLOR = '#1a202c';
export const MENU_STATUS_COLOR = '#fca5a5';

/** Цвет фона-заглушки, если PNG меню не загрузился (hex для Phaser). */
export const MENU_FALLBACK_BG_COLOR = 0x0f172a;

// Цвета HTML-панели (CSS-строки). Phaser-цвета выше — в hex-числах.
export const MENU_CSS_PANEL_BG = 'rgba(15, 23, 42, 0.92)';
export const MENU_CSS_ACCENT = '#4fd1c5';
export const MENU_CSS_ACCENT_HOVER = '#81e6d9';
export const MENU_CSS_INPUT_BG = '#1a202c';
export const MENU_CSS_TEXT = '#f7fafc';
export const MENU_CSS_TEXT_ON_ACCENT = '#1a202c';
export const MENU_CSS_MUTED = '#94a3b8';
export const MENU_CSS_SHADOW = '#000000';

/** Геометрия HTML-панели формы (px). */
export const MENU_FORM_PADDING_PX = 20;
export const MENU_FORM_GAP_PX = 12;
export const MENU_FORM_BORDER_PX = 3;
/** Смещение жёсткой (без размытия) тени панели. */
export const MENU_FORM_SHADOW_PX = 6;
export const MENU_INPUT_WIDTH_PX = 200;
export const MENU_CONTROL_PADDING_Y_PX = 8;
export const MENU_CONTROL_PADDING_X_PX = 12;
/** 16px: меньше этого iOS Safari увеличивает страницу при фокусе на input. */
export const MENU_CONTROL_FONT_SIZE_PX = 16;
/** Прозрачность заблокированных элементов формы во время загрузки. */
export const MENU_DISABLED_OPACITY = 0.6;


// ---------------------------------------------------------------------------
// Хаб: прямоугольник пола, по которому может ходить персонаж.
// ---------------------------------------------------------------------------

export const HUB_WALKABLE_RECT = {
  left: 160,
  top: 165,
  right: 800,
  bottom: 460,
};

// ---------------------------------------------------------------------------
// Надписи над персонажами хаба (имя и подсказка "Нажать E").
// ---------------------------------------------------------------------------

/** Зазор (px) между верхом спрайта персонажа и нижним краем надписи с именем. */
export const CHARACTER_LABEL_GAP_PX = 6;

/** Зазор (px) между надписью с именем и подсказкой "Нажать E" над ней. */
export const CHARACTER_PROMPT_GAP_PX = 18;

/**
 * Ручная подстройка высоты надписи конкретного персонажа (px).
 * Положительное значение опускает надпись, отрицательное поднимает.
 * Ключ — id из ASSET_MANIFEST (player, npc_max, npc_nastya, npc_lena).
 */
export const CHARACTER_LABEL_EXTRA_OFFSET_Y: Partial<Record<string, number>> = {
  player: 8,
  npc_max: 8,
  npc_nastya: 0,
  npc_lena: 8,
};
// ---------------------------------------------------------------------------
// Анимации главного меню ONWAY.
// ---------------------------------------------------------------------------

/** Длительность затемнения при входе в игру. */
export const MENU_FADE_OUT_MS = 850;

/** Длительность появления хаба после загрузки. */
export const MENU_FADE_IN_MS = 700;

/** Время показа приветственной надписи. */
export const MENU_WELCOME_DURATION_MS = 650;

/** Продолжительность одного цикла пульсации заголовка. */
export const MENU_TITLE_PULSE_MS = 1800;

/** Насколько увеличивается заголовок во время пульсации. */
export const MENU_TITLE_PULSE_SCALE = 1.035;

/** Продолжительность анимации кнопки при наведении. */
export const MENU_BUTTON_HOVER_MS = 140;

/** Смещение кнопки вверх при наведении. */
export const MENU_BUTTON_HOVER_OFFSET_PX = 4;

/** Продолжительность нажатия кнопки. */
export const MENU_BUTTON_PRESS_MS = 100;

/** Цвет затемнения между сценами. */
export const MENU_TRANSITION_COLOR = 0x000000;

/** Размер приветственного текста. */
export const MENU_WELCOME_FONT_SIZE_PX = 26;

/** Цвет приветственного текста. */
export const MENU_WELCOME_TEXT_COLOR = '#ffffff';

/** Прозрачность приветственного текста в начале перехода. */
export const MENU_WELCOME_INITIAL_ALPHA = 0;

/** Длительность появления приветственной надписи. */
export const MENU_WELCOME_FADE_MS = 350;
// ---------------------------------------------------------------------------
// ONWAY: ретро-меню в стиле CRT-монитора.
// ---------------------------------------------------------------------------

/** Бежевый корпус старого компьютера. */
export const CRT_CASE_COLOR = 0xc9c3ad;

/** Почти чёрная рамка экрана. */
export const CRT_BEZEL_COLOR = 0x10140f;

/** Цвет старого монохромного дисплея. */
export const CRT_SCREEN_COLOR =0x010803;
/**0x010803 */
/** Приглушённый зелёный интерфейса. */
export const CRT_GREEN = 0x38b86c;

/** Тёмный зелёный для декоративных элементов. */
export const CRT_GREEN_DIM = 0x06391c;

/** Белый текст с лёгким зеленоватым оттенком. */
export const CRT_WHITE = '#e4f5e6';

/** Цвет терминального поля. */
export const CRT_INPUT_BACKGROUND = '#051d0a';

/** Основной цвет рамок. */
export const CRT_CSS_GREEN = '#38b86c';

/** Свечение полностью убираем. */
export const CRT_CSS_GLOW = 'transparent';

/** Тёмно-зелёные кнопки. */
export const CRT_BUTTON_BACKGROUND = '#092b16';

/** Цвет кнопки при наведении. */
export const CRT_BUTTON_HOVER = '#123d22';

/** Анимация кнопки должна быть короткой. */
export const CRT_BUTTON_ANIMATION_MS = 100;
// ---------------------------------------------------------------------------
// Геометрия CRT-монитора.
// ---------------------------------------------------------------------------

/** Левая граница корпуса монитора. */
export const CRT_CASE_X = 12;

/** Верхняя граница корпуса монитора. */
export const CRT_CASE_Y = 12;

/** Ширина корпуса монитора. */
export const CRT_CASE_WIDTH = 936;

/** Высота корпуса монитора. */
export const CRT_CASE_HEIGHT = 516;

/** Левая граница экрана. */
export const CRT_SCREEN_X = 36;

/** Верхняя граница экрана. */
export const CRT_SCREEN_Y = 48;

/** Ширина экрана. */
export const CRT_SCREEN_WIDTH = 888;

/** Высота экрана. */
export const CRT_SCREEN_HEIGHT = 450;

/** Радиус закругления корпуса. */
export const CRT_CASE_RADIUS = 18;

/** Радиус закругления экрана. */
export const CRT_SCREEN_RADIUS = 30;

// ---------------------------------------------------------------------------
// Эффект старого дисплея.
// ---------------------------------------------------------------------------

/** Высота одной горизонтальной полосы. */
export const CRT_SCANLINE_HEIGHT = 2;

/** Расстояние между полосами. */
export const CRT_SCANLINE_SPACING = 5;

/** Прозрачность полос. */
export const CRT_SCANLINE_ALPHA = 0.12;

// ---------------------------------------------------------------------------
// Декоративные пиксели.
// ---------------------------------------------------------------------------

/** Количество фоновых пикселей. */
export const CRT_DECORATION_COUNT = 42;

/** Размер одного пикселя. */
export const CRT_PIXEL_SIZE = 7;

/** Длительность мерцания пикселей в миллисекундах. */
export const CRT_PIXEL_PULSE_MS = 1600;

// ---------------------------------------------------------------------------
// Расположение элементов меню.
// ---------------------------------------------------------------------------

/** Вертикальная координата логотипа ONWAY. */
export const CRT_TITLE_Y = 150;

/** Размер шрифта логотипа. */
export const CRT_TITLE_FONT_SIZE = 68;

/** Вертикальная координата подзаголовка. */
export const CRT_SUBTITLE_Y = 210;

/** Смещение HTML-формы относительно центра окна. */
export const CRT_FORM_OFFSET_Y = 55;

/** Ширина формы ввода никнейма. */
export const CRT_FORM_WIDTH = 410;

/** Размер шрифта элементов формы. */
export const CRT_FORM_FONT_SIZE = 18;

/** Время мигания курсора терминала. */
export const CRT_CURSOR_BLINK_MS = 800;