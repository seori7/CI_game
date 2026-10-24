import Phaser from 'phaser';
import {
  BUILDER_CELL_SIZE,
  BUILDER_GRID_COLUMNS,
  BUILDER_GRID_ROWS,
  BUILDER_MAX_BUDGET,
  BUILDER_MAX_SAFE_SPAN,
  BUILDER_STRESS_PER_COLLAPSE,
  COLOR_TEXT_PRIMARY,
  GAME_HEIGHT,
  GAME_WIDTH,
  STRESS_BAR_HEIGHT,
  STRESS_BAR_MAX,
  STRESS_BAR_WIDTH,
} from '../../config/constants';
import type { MinigameResult } from '../../types/MinigameResult';
import { GameState } from '../../state/GameState';

/** Одна клетка сетки моста. */
interface BridgeCell {
  column: number;
  row: number;
  rect: Phaser.GameObjects.Rectangle;
  hasSupport: boolean;
}

/** Цвета клетки сетки в зависимости от наличия опоры. */
const COLOR_CELL_EMPTY = 0x1e293b;
const COLOR_CELL_SUPPORT = 0xf59e0b;
const COLOR_CELL_HOVER = 0x334155;

/**
 * Мини-игра "Строитель": нужно расставить опоры моста в сетке 10x3,
 * уложившись в ограниченный бюджет (BUILDER_MAX_BUDGET опор), так, чтобы
 * максимальный пролёт между соседними (по столбцам) опорами на одной
 * дорожной линии не превышал BUILDER_MAX_SAFE_SPAN клеток.
 */
export class BuilderMinigameScene extends Phaser.Scene {
  private cells: BridgeCell[] = [];
  private supportsUsed = 0;
  private attempts = 0;
  private stressLevel = 0;

  private budgetText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private stressBarFill!: Phaser.GameObjects.Rectangle;
  private gridOriginX = 0;
  private gridOriginY = 0;

  public constructor() {
    super('BuilderMinigameScene');
  }

  /** Жизненный цикл Phaser: сброс состояния и построение сетки моста. */
  public create(): void {
    this.cells = [];
    this.supportsUsed = 0;
    this.attempts = 0;
    this.stressLevel = 0;

    this.buildBackground();
    this.buildHud();
    this.buildGrid();
    this.buildCheckButton();
  }

  /** Рисует фон и заголовок мини-игры. */
  private buildBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f172a).setOrigin(0, 0);
    this.add
      .text(GAME_WIDTH / 2, 28, `Построй мост: бюджет ${BUILDER_MAX_BUDGET} опор, безопасный пролёт ≤ ${BUILDER_MAX_SAFE_SPAN}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      })
      .setOrigin(0.5, 0.5);
  }

  /** Создаёт HUD: полоску стресса и счётчик оставшегося бюджета. */
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

    this.budgetText = this.add.text(24, 20, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
    });
    this.updateBudgetText();

    this.statusText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 32, 'Кликай по клеткам, чтобы ставить/убирать опоры.', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0.5, 0.5);
  }

  /** Строит интерактивную сетку клеток моста. */
  private buildGrid(): void {
    const gridWidth = BUILDER_GRID_COLUMNS * BUILDER_CELL_SIZE;
    const gridHeight = BUILDER_GRID_ROWS * BUILDER_CELL_SIZE;
    this.gridOriginX = (GAME_WIDTH - gridWidth) / 2;
    this.gridOriginY = (GAME_HEIGHT - gridHeight) / 2 + 10;

    for (let row = 0; row < BUILDER_GRID_ROWS; row += 1) {
      for (let column = 0; column < BUILDER_GRID_COLUMNS; column += 1) {
        const x = this.gridOriginX + column * BUILDER_CELL_SIZE + BUILDER_CELL_SIZE / 2;
        const y = this.gridOriginY + row * BUILDER_CELL_SIZE + BUILDER_CELL_SIZE / 2;

        const rect = this.add
          .rectangle(x, y, BUILDER_CELL_SIZE - 6, BUILDER_CELL_SIZE - 6, COLOR_CELL_EMPTY)
          .setStrokeStyle(1, 0x475569);
        rect.setInteractive({ useHandCursor: true });

        const cell: BridgeCell = { column, row, rect, hasSupport: false };

        rect.on('pointerover', () => {
          if (!cell.hasSupport) {
            rect.setFillStyle(COLOR_CELL_HOVER);
          }
        });
        rect.on('pointerout', () => {
          if (!cell.hasSupport) {
            rect.setFillStyle(COLOR_CELL_EMPTY);
          }
        });
        rect.on('pointerdown', () => this.toggleSupport(cell));

        this.cells.push(cell);
      }
    }
  }

  /** Создаёт кнопку "Проверить" для оценки устойчивости построенного моста. */
  private buildCheckButton(): void {
    const buttonY = this.gridOriginY + BUILDER_GRID_ROWS * BUILDER_CELL_SIZE + 40;
    const rect = this.add
      .rectangle(GAME_WIDTH / 2, buttonY, 200, 48, 0x16a34a)
      .setStrokeStyle(2, 0x86efac);
    const text = this.add
      .text(GAME_WIDTH / 2, buttonY, 'Проверить мост', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerover', () => rect.setFillStyle(0x22c55e));
    rect.on('pointerout', () => rect.setFillStyle(0x16a34a));
    rect.on('pointerdown', () => this.checkBridgeStability());
    // Текст кнопки не нужно хранить отдельно — он статичен и не требует обновления.
    void text;
  }

  /**
   * Переключает наличие опоры в клетке: ставит опору, если бюджет позволяет,
   * либо убирает уже поставленную.
   * @param cell клетка сетки, по которой кликнул игрок
   */
  private toggleSupport(cell: BridgeCell): void {
    if (cell.hasSupport) {
      cell.hasSupport = false;
      cell.rect.setFillStyle(COLOR_CELL_EMPTY);
      this.supportsUsed -= 1;
      this.updateBudgetText();
      return;
    }

    if (this.supportsUsed >= BUILDER_MAX_BUDGET) {
      this.statusText.setText('Бюджет исчерпан! Убери опору, чтобы поставить другую.');
      return;
    }

    cell.hasSupport = true;
    cell.rect.setFillStyle(COLOR_CELL_SUPPORT);
    this.supportsUsed += 1;
    this.updateBudgetText();
  }

  /** Обновляет текст с оставшимся бюджетом опор. */
  private updateBudgetText(): void {
    this.budgetText.setText(`Опоры: ${this.supportsUsed} / ${BUILDER_MAX_BUDGET}`);
  }

  /**
   * Проверяет устойчивость моста: для каждой строки сетки вычисляет
   * максимальный пролёт (расстояние в клетках) между соседними опорами,
   * включая края моста. Если какой-либо пролёт превышает
   * BUILDER_MAX_SAFE_SPAN — мост обрушается.
   */
  private checkBridgeStability(): void {
    const maxSpanPerRow: number[] = [];

    for (let row = 0; row < BUILDER_GRID_ROWS; row += 1) {
      const supportColumns = this.cells
        .filter((cell) => cell.row === row && cell.hasSupport)
        .map((cell) => cell.column)
        .sort((a, b) => a - b);

      // Добавляем виртуальные "берега" на -1 и BUILDER_GRID_COLUMNS, чтобы
      // учесть пролёт от края моста до первой опоры и от последней до конца.
      const columnsWithBanks = [-1, ...supportColumns, BUILDER_GRID_COLUMNS];
      let maxSpan = 0;
      for (let i = 1; i < columnsWithBanks.length; i += 1) {
        const span = columnsWithBanks[i] - columnsWithBanks[i - 1];
        maxSpan = Math.max(maxSpan, span);
      }
      maxSpanPerRow.push(maxSpan);
    }

    const overallMaxSpan = Math.max(...maxSpanPerRow);
    this.attempts += 1;

    if (overallMaxSpan > BUILDER_MAX_SAFE_SPAN) {
      this.handleCollapse(overallMaxSpan);
    } else {
      this.finishMinigame();
    }
  }

  /**
   * Обрабатывает обрушение моста: трясёт камеру, увеличивает стресс и
   * сообщает игроку, что нужно перестроить мост.
   * @param worstSpan максимальный найденный пролёт (для отладочного сообщения)
   */
  private handleCollapse(worstSpan: number): void {
    this.cameras.main.shake(300, 0.01);
    this.stressLevel = Math.min(STRESS_BAR_MAX, this.stressLevel + BUILDER_STRESS_PER_COLLAPSE);
    this.updateStressBar();
    this.statusText.setText(
      `Мост обрушился! Пролёт в ${worstSpan} клеток слишком большой (максимум ${BUILDER_MAX_SAFE_SPAN}).`,
    );
  }

  /** Обновляет визуальную ширину полоски стресса согласно текущему значению. */
  private updateStressBar(): void {
    const ratio = this.stressLevel / STRESS_BAR_MAX;
    this.stressBarFill.width = STRESS_BAR_WIDTH * ratio;
  }

  /** Завершает мини-игру: считает счёт на основе точности и количества попыток. */
  private finishMinigame(): void {
    const unusedBudgetBonus = (BUILDER_MAX_BUDGET - this.supportsUsed) * 50;
    const score = Math.max(0, 1000 - (this.attempts - 1) * 100 + unusedBudgetBonus);

    const result: MinigameResult = {
      minigameType: 'builder',
      score,
      attempts: this.attempts,
      stressLevel: Math.round(this.stressLevel),
      difficulty: GameState.getInstance().getProgress().currentChapter > 2 ? 'hard' : 'easy',
    };

    this.statusText.setText('Мост выдержал нагрузку! Возвращаемся в хаб...');
    this.time.delayedCall(1200, () => {
      this.game.events.emit('minigame-complete', result);
      this.scene.stop();
    });
  }
}
