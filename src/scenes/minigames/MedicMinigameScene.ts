import Phaser from 'phaser';
import {
  COLOR_TEXT_PRIMARY,
  GAME_HEIGHT,
  GAME_WIDTH,
  MEDIC_ANSWER_HIGHLIGHT_MS,
  MEDIC_STRESS_INCREASE_PER_MISTAKE,
  STRESS_BAR_HEIGHT,
  STRESS_BAR_MAX,
  STRESS_BAR_WIDTH,
} from '../../config/constants';
import type { MinigameResult } from '../../types/MinigameResult';
import { GameState } from '../../state/GameState';

/** Один вопрос квиза: симптомы и варианты диагнозов, один из которых верный. */
interface MedicQuestion {
  symptoms: string;
  options: string[];
  correctIndex: number;
}

/**
 * Набор реалистичных пар "симптомы -> диагноз" для квиза медика.
 * Это захардкоженный контент мини-игры (не генерируется процедурно).
 */
const MEDIC_QUESTIONS: MedicQuestion[] = [
  {
    symptoms: 'Высокая температура, боль в горле, белый налёт на миндалинах, увеличенные лимфоузлы.',
    options: ['Ангина (тонзиллит)', 'Мигрень', 'Перелом руки', 'Гастрит'],
    correctIndex: 0,
  },
  {
    symptoms: 'Резкая боль в правом нижнем углу живота, тошнота, повышение температуры.',
    options: ['Простуда', 'Аппендицит', 'Артрит', 'Конъюнктивит'],
    correctIndex: 1,
  },
  {
    symptoms: 'Сильная жажда, частое мочеиспускание, резкая потеря веса, постоянная усталость.',
    options: ['Сахарный диабет', 'Растяжение связок', 'Бронхит', 'Дерматит'],
    correctIndex: 0,
  },
  {
    symptoms: 'Кашель более трёх недель, одышка, свистящее дыхание, особенно по ночам.',
    options: ['Перелом ребра', 'Бронхиальная астма', 'Отит', 'Гайморит'],
    correctIndex: 1,
  },
  {
    symptoms: 'Боль и покраснение одного сустава, отёк, местное повышение температуры после травмы.',
    options: ['Воспаление сустава (артрит)', 'Пищевое отравление', 'Мигрень', 'Ларингит'],
    correctIndex: 0,
  },
];

/** Цвета подсветки кнопки-варианта в зависимости от правильности ответа. */
const COLOR_CORRECT = 0x16a34a;
const COLOR_WRONG = 0xdc2626;
const COLOR_DEFAULT = 0x1f2937;

/**
 * Мини-игра "Медик": квиз, в котором по описанию симптомов нужно выбрать
 * верный диагноз из четырёх вариантов. За каждую ошибку растёт стресс.
 */
export class MedicMinigameScene extends Phaser.Scene {
  private currentQuestionIndex = 0;
  private correctAnswers = 0;
  private attempts = 0;
  private stressLevel = 0;
  private isAnswerLocked = false;

  private symptomsText!: Phaser.GameObjects.Text;
  private optionButtons: { rect: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }[] = [];
  private stressBarFill!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;

  public constructor() {
    super('MedicMinigameScene');
  }

  /** Жизненный цикл Phaser: сброс состояния и построение первого вопроса. */
  public create(): void {
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.attempts = 0;
    this.stressLevel = 0;
    this.isAnswerLocked = false;

    this.buildBackground();
    this.buildHud();
    this.renderCurrentQuestion();
  }

  /** Рисует фон и заголовок мини-игры. */
  private buildBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1220).setOrigin(0, 0);
    this.add
      .text(GAME_WIDTH / 2, 28, 'Поставь диагноз по симптомам', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      })
      .setOrigin(0.5, 0.5);

    this.symptomsText = this.add.text(GAME_WIDTH / 2, 110, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      wordWrap: { width: GAME_WIDTH - 160 },
      align: 'center',
    });
    this.symptomsText.setOrigin(0.5, 0.5);
  }

  /** Создаёт HUD: полоску стресса и счётчик прогресса по вопросам. */
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

    this.progressText = this.add.text(24, 20, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
    });
  }

  /** Отрисовывает текущий вопрос и четыре кнопки-варианта ответа. */
  private renderCurrentQuestion(): void {
    this.clearOptionButtons();
    this.isAnswerLocked = false;

    const question = MEDIC_QUESTIONS[this.currentQuestionIndex];
    this.symptomsText.setText(question.symptoms);
    this.progressText.setText(`Вопрос ${this.currentQuestionIndex + 1} / ${MEDIC_QUESTIONS.length}`);

    const buttonWidth = 380;
    const buttonHeight = 56;
    const gapY = 16;
    const startY = GAME_HEIGHT / 2 + 20;

    question.options.forEach((optionText, index) => {
      const y = startY + index * (buttonHeight + gapY);
      const rect = this.add
        .rectangle(GAME_WIDTH / 2, y, buttonWidth, buttonHeight, COLOR_DEFAULT)
        .setStrokeStyle(2, 0x4b5563);
      const text = this.add
        .text(GAME_WIDTH / 2, y, optionText, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#f9fafb',
        })
        .setOrigin(0.5, 0.5);

      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerover', () => {
        if (!this.isAnswerLocked) {
          rect.setFillStyle(0x374151);
        }
      });
      rect.on('pointerout', () => {
        if (!this.isAnswerLocked) {
          rect.setFillStyle(COLOR_DEFAULT);
        }
      });
      rect.on('pointerdown', () => this.handleAnswerSelected(index));

      this.optionButtons.push({ rect, text });
    });
  }

  /** Удаляет кнопки предыдущего вопроса со сцены. */
  private clearOptionButtons(): void {
    for (const button of this.optionButtons) {
      button.rect.destroy();
      button.text.destroy();
    }
    this.optionButtons = [];
  }

  /**
   * Обрабатывает выбор варианта ответа: подсвечивает правильный/неправильный
   * вариант, при ошибке увеличивает стресс, затем через паузу переходит
   * к следующему вопросу (или завершает мини-игру).
   * @param selectedIndex индекс выбранного варианта ответа
   */
  private handleAnswerSelected(selectedIndex: number): void {
    if (this.isAnswerLocked) {
      return;
    }
    this.isAnswerLocked = true;
    this.attempts += 1;

    const question = MEDIC_QUESTIONS[this.currentQuestionIndex];
    const isCorrect = selectedIndex === question.correctIndex;

    this.optionButtons[question.correctIndex].rect.setFillStyle(COLOR_CORRECT);
    if (!isCorrect) {
      this.optionButtons[selectedIndex].rect.setFillStyle(COLOR_WRONG);
      this.stressLevel = Math.min(STRESS_BAR_MAX, this.stressLevel + MEDIC_STRESS_INCREASE_PER_MISTAKE);
      this.updateStressBar();
    } else {
      this.correctAnswers += 1;
    }

    this.time.delayedCall(MEDIC_ANSWER_HIGHLIGHT_MS, () => this.goToNextQuestion());
  }

  /** Обновляет визуальную ширину полоски стресса согласно текущему значению. */
  private updateStressBar(): void {
    const ratio = this.stressLevel / STRESS_BAR_MAX;
    this.stressBarFill.width = STRESS_BAR_WIDTH * ratio;
  }

  /** Переходит к следующему вопросу квиза либо завершает мини-игру, если вопросы закончились. */
  private goToNextQuestion(): void {
    this.currentQuestionIndex += 1;
    if (this.currentQuestionIndex >= MEDIC_QUESTIONS.length) {
      this.finishMinigame();
    } else {
      this.renderCurrentQuestion();
    }
  }

  /** Завершает мини-игру: считает счёт на основе числа верных ответов и уровня стресса. */
  private finishMinigame(): void {
    this.clearOptionButtons();

    const score = Math.round((this.correctAnswers / MEDIC_QUESTIONS.length) * 1000);
    const result: MinigameResult = {
      minigameType: 'medic',
      score,
      attempts: this.attempts,
      stressLevel: Math.round(this.stressLevel),
      difficulty: GameState.getInstance().getProgress().currentChapter > 2 ? 'hard' : 'easy',
    };

    this.symptomsText.setText(
      `Диагностика завершена: ${this.correctAnswers} из ${MEDIC_QUESTIONS.length} верно.\nВозвращаемся в хаб...`,
    );

    this.time.delayedCall(1200, () => {
      this.game.events.emit('minigame-complete', result);
      this.scene.stop();
    });
  }
}
