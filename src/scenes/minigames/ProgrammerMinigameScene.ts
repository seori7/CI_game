import Phaser from 'phaser';
import {
  COLOR_TEXT_PRIMARY,
  GAME_HEIGHT,
  GAME_WIDTH,
  PROGRAMMER_BLOCK_COUNT,
  PROGRAMMER_SLOT_SNAP_TOLERANCE,
  PROGRAMMER_STRESS_PER_SECOND,
  PROGRAMMER_TIME_LIMIT_SECONDS,
  STRESS_BAR_HEIGHT,
  STRESS_BAR_MAX,
  STRESS_BAR_WIDTH,
} from '../../config/constants';
import type { MinigameResult } from '../../types/MinigameResult';
import { GameState } from '../../state/GameState';

/** Один перетаскиваемый блок-посылка с заданным весом. */
interface ParcelBlock {
  weight: number;
  container: Phaser.GameObjects.Container;
  homeX: number;
  homeY: number;
  slotIndex: number | null;
}

/** Один слот-контейнер для посылки, отсортированный по позиции слева направо. */
interface ParcelSlot {
  x: number;
  y: number;
  occupiedByWeight: number | null;
}

/** Диапазон случайных весов посылок (в условных килограммах). */
const MIN_PARCEL_WEIGHT = 1;
const MAX_PARCEL_WEIGHT = 99;

/** Геометрия кнопки досрочного выхода из мини-игры. */
const EXIT_BUTTON_WIDTH = 160;
const EXIT_BUTTON_HEIGHT = 32;
const EXIT_BUTTON_X = 24 + EXIT_BUTTON_WIDTH / 2;
const EXIT_BUTTON_Y = 54;

/**
 * Мини-игра "Программист": нужно отсортировать 5 посылок по возрастанию
 * веса, перетаскивая блоки в слоты мышью. Таймер обратного отсчёта
 * постоянно поднимает уровень стресса, создавая игровое давление.
 *
 * Игрок может в любой момент выйти из мини-игры досрочно (клавиша Esc
 * или кнопка в углу экрана) — это эмитит 'minigame-exit' вместо
 * 'minigame-complete': результат не сохраняется, стресс не засчитывается,
 * это осознанный отказ от попытки, а не провал.
 */
export class ProgrammerMinigameScene extends Phaser.Scene {
  private blocks: ParcelBlock[] = [];
  private slots: ParcelSlot[] = [];

  private stressLevel = 0;
  private attempts = 0;
  private remainingSeconds = PROGRAMMER_TIME_LIMIT_SECONDS;

  private stressBarFill!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;

  /** Клавиша Esc для досрочного выхода из мини-игры. */
  private exitKey!: Phaser.Input.Keyboard.Key;

  public constructor() {
    super('ProgrammerMinigameScene');
  }

  /** Жизненный цикл Phaser: сброс состояния и построение сцены мини-игры. */
  public create(): void {
    this.stressLevel = 0;
    this.attempts = 0;
    this.remainingSeconds = PROGRAMMER_TIME_LIMIT_SECONDS;
    this.blocks = [];
    this.slots = [];

    this.buildBackground();
    this.buildHud();
    this.buildExitControl();
    this.buildSlots();
    this.buildBlocks();
    this.setupDragHandlers();
    this.startCountdown();
  }

  /** Жизненный цикл Phaser: проверка нажатия Esc каждый кадр. */
  public override update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.exitToHub();
    }
  }

  /** Рисует фон и заголовок мини-игры. */
  private buildBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111827).setOrigin(0, 0);
    this.add
      .text(GAME_WIDTH / 2, 28, 'Отсортируй посылки по весу (от лёгкой к тяжёлой)', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      })
      .setOrigin(0.5, 0.5);
  }

  /** Создаёт HUD: полоску стресса и таймер. */
  private buildHud(): void {
    const barX = GAME_WIDTH - STRESS_BAR_WIDTH - 24;
    const barY = 20;

    this.add.text(barX, barY - 18, 'Стресс', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f87171',
    });
    this.add
      .rectangle(barX, barY, STRESS_BAR_WIDTH, STRESS_BAR_HEIGHT, 0x374151)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6b7280);
    this.stressBarFill = this.add
      .rectangle(barX, barY, 0, STRESS_BAR_HEIGHT, 0xf87171)
      .setOrigin(0, 0);

    this.timerText = this.add.text(24, 20, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
    });

    this.statusText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#fbbf24',
      })
      .setOrigin(0.5, 0.5);

    this.updateTimerText();
  }

  /**
   * Создаёт клавишу Esc и видимую кнопку "Выйти" в углу экрана — игрок
   * может прервать мини-игру в любой момент без штрафа.
   */
  private buildExitControl(): void {
    this.exitKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    const rect = this.add
      .rectangle(EXIT_BUTTON_X, EXIT_BUTTON_Y, EXIT_BUTTON_WIDTH, EXIT_BUTTON_HEIGHT, 0x374151)
      .setStrokeStyle(1, 0x9ca3af);
    const text = this.add
      .text(EXIT_BUTTON_X, EXIT_BUTTON_Y, 'Esc — выйти в хаб', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e5e7eb',
      })
      .setOrigin(0.5, 0.5);

    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerover', () => rect.setFillStyle(0x4b5563));
    rect.on('pointerout', () => rect.setFillStyle(0x374151));
    rect.on('pointerdown', () => this.exitToHub());
    // Текст кнопки статичен и не требует обновления — хранить ссылку не нужно.
    void text;
  }

  /**
   * Прерывает мини-игру по желанию игрока: без результата и без штрафа
   * стресса (это отказ от попытки, а не провал).
   */
  private exitToHub(): void {
    this.countdownTimer?.remove();
    this.game.events.emit('minigame-exit');
    this.scene.stop();
  }

  /** Создаёт 5 пустых слотов-контейнеров, в которые нужно разложить блоки по порядку. */
  private buildSlots(): void {
    const slotWidth = 110;
    const totalWidth = slotWidth * PROGRAMMER_BLOCK_COUNT;
    const startX = (GAME_WIDTH - totalWidth) / 2 + slotWidth / 2;
    const slotY = GAME_HEIGHT - 120;

    for (let i = 0; i < PROGRAMMER_BLOCK_COUNT; i += 1) {
      const x = startX + i * slotWidth;
      this.add
        .rectangle(x, slotY, slotWidth - 12, 70, 0x1f2937)
        .setStrokeStyle(2, 0x4b5563, 1);
      this.add
        .text(x, slotY + 46, `#${i + 1}`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#6b7280',
        })
        .setOrigin(0.5, 0.5);
      this.slots.push({ x, y: slotY, occupiedByWeight: null });
    }
  }

  /** Генерирует 5 блоков со случайными уникальными весами и расставляет их сверху вразнобой. */
  private buildBlocks(): void {
    const weights = this.generateUniqueWeights(PROGRAMMER_BLOCK_COUNT);
    const shuffledPositions = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4]);
    const blockWidth = 110;
    const totalWidth = blockWidth * PROGRAMMER_BLOCK_COUNT;
    const startX = (GAME_WIDTH - totalWidth) / 2 + blockWidth / 2;
    const blockY = GAME_HEIGHT / 2 - 40;

    weights.forEach((weight, index) => {
      const slot = shuffledPositions[index];
      const x = startX + slot * blockWidth;

      const rect = this.add.rectangle(0, 0, blockWidth - 16, 70, 0x2563eb).setStrokeStyle(2, 0xbfdbfe);
      const label = this.add
        .text(0, 0, `${weight} кг`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#ffffff',
        })
        .setOrigin(0.5, 0.5);

      const container = this.add.container(x, blockY, [rect, label]);
      container.setSize(blockWidth - 16, 70);
      container.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(container);

      this.blocks.push({ weight, container, homeX: x, homeY: blockY, slotIndex: null });
    });
  }

  /** Генерирует массив из `count` уникальных случайных весов. */
  private generateUniqueWeights(count: number): number[] {
    const weights = new Set<number>();
    while (weights.size < count) {
      weights.add(Phaser.Math.Between(MIN_PARCEL_WEIGHT, MAX_PARCEL_WEIGHT));
    }
    return Array.from(weights);
  }

  /** Подключает обработку drag/dragend для всех блоков. */
  private setupDragHandlers(): void {
    this.input.on(
      'drag',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container, dragX: number, dragY: number) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
      },
    );

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container) => {
      this.handleBlockDropped(gameObject);
    });
  }

  /**
   * Обрабатывает окончание перетаскивания блока: ищет ближайший свободный
   * слот в пределах допуска PROGRAMMER_SLOT_SNAP_TOLERANCE; если найден —
   * "прилипает" к нему, иначе возвращает блок на исходную позицию.
   * @param container контейнер перетаскиваемого блока
   */
  private handleBlockDropped(container: Phaser.GameObjects.Container): void {
    const block = this.blocks.find((b) => b.container === container);
    if (block === undefined) {
      return;
    }

    if (block.slotIndex !== null) {
      this.slots[block.slotIndex].occupiedByWeight = null;
      block.slotIndex = null;
    }

    const targetSlot = this.findNearestFreeSlot(container.x, container.y);
    if (targetSlot !== null) {
      container.setPosition(targetSlot.x, targetSlot.y);
      targetSlot.occupiedByWeight = block.weight;
      block.slotIndex = this.slots.indexOf(targetSlot);
    } else {
      container.setPosition(block.homeX, block.homeY);
    }

    this.checkCompletion();
  }

  /**
   * Находит ближайший свободный слот в пределах допуска по расстоянию.
   * @param x координата X точки сброса
   * @param y координата Y точки сброса
   */
  private findNearestFreeSlot(x: number, y: number): ParcelSlot | null {
    let closest: ParcelSlot | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const slot of this.slots) {
      if (slot.occupiedByWeight !== null) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(x, y, slot.x, slot.y);
      if (distance <= PROGRAMMER_SLOT_SNAP_TOLERANCE && distance < closestDistance) {
        closest = slot;
        closestDistance = distance;
      }
    }

    return closest;
  }

  /** Проверяет, заполнены ли все слоты и расставлены ли посылки по возрастанию веса. */
  private checkCompletion(): void {
    const allFilled = this.slots.every((slot) => slot.occupiedByWeight !== null);
    if (!allFilled) {
      return;
    }

    this.attempts += 1;
    const weightsInOrder = this.slots.map((slot) => slot.occupiedByWeight as number);
    const isSorted = weightsInOrder.every(
      (weight, index) => index === 0 || weightsInOrder[index - 1] <= weight,
    );

    if (isSorted) {
      this.finishMinigame();
    } else {
      this.statusText.setText('Порядок неверный — попробуй ещё раз!');
      this.time.delayedCall(1000, () => this.statusText.setText(''));
    }
  }

  /** Запускает таймер обратного отсчёта, повышающий уровень стресса каждую секунду. */
  private startCountdown(): void {
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.remainingSeconds -= 1;
        this.stressLevel = Math.min(
          STRESS_BAR_MAX,
          this.stressLevel + PROGRAMMER_STRESS_PER_SECOND,
        );
        this.updateTimerText();
        this.updateStressBar();

        if (this.remainingSeconds <= 0) {
          this.handleTimeOut();
        }
      },
    });
  }

  /** Обновляет текст таймера на экране. */
  private updateTimerText(): void {
    this.timerText.setText(`Время: ${Math.max(0, this.remainingSeconds)} с`);
  }

  /** Обновляет визуальную ширину полоски стресса согласно текущему значению. */
  private updateStressBar(): void {
    const ratio = this.stressLevel / STRESS_BAR_MAX;
    this.stressBarFill.width = STRESS_BAR_WIDTH * ratio;
  }

  /** Обрабатывает истечение времени: сбрасывает раскладку блоков и перезапускает таймер. */
  private handleTimeOut(): void {
    this.attempts += 1;
    this.statusText.setText('Время вышло! Начинаем раскладку заново.');
    this.time.delayedCall(1000, () => this.statusText.setText(''));

    for (const block of this.blocks) {
      block.slotIndex = null;
      block.container.setPosition(block.homeX, block.homeY);
    }
    for (const slot of this.slots) {
      slot.occupiedByWeight = null;
    }
    this.remainingSeconds = PROGRAMMER_TIME_LIMIT_SECONDS;
  }

  /** Завершает мини-игру: считает счёт, формирует результат и возвращает игрока в хаб. */
  private finishMinigame(): void {
    this.countdownTimer?.remove();

    const score = Math.round(
      (this.remainingSeconds / PROGRAMMER_TIME_LIMIT_SECONDS) * 1000 - this.attempts * 20,
    );

    const result: MinigameResult = {
      minigameType: 'programmer',
      score: Math.max(0, score),
      attempts: this.attempts,
      stressLevel: Math.round(this.stressLevel),
      difficulty: GameState.getInstance().getProgress().currentChapter > 2 ? 'hard' : 'easy',
    };

    this.statusText.setText('Готово! Возвращаемся в хаб...');
    this.time.delayedCall(1000, () => {
      this.game.events.emit('minigame-complete', result);
      this.scene.stop();
    });
  }
}