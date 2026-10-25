import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BOSS_TYPEWRITER_MS, STRESS_BAR_MAX } from '../../config/constants';

// Порог стресса, по которому выбирается "лёгкая" или "тяжёлая" реплика-реакция.
// Расшифровка: STRESS_BAR_MAX — максимальное значение шкалы стресса в бою,
// берём половину как границу между "далось легко" и "было тяжело".
const OUTRO_STRESS_THRESHOLD = STRESS_BAR_MAX / 2;

const RETURN_BUTTON_LABEL = 'Вернуться в класс';

/** Данные, которые сцена боя передаёт в аутро через scene.launch(key, data). */
interface MasyaOutroData {
  score: number;
  attempts: number;
  stressLevel: number;
}

/**
 * Сцена-концовка после боя с Масей. Симметрична MasyaIntroScene:
 * тот же паттерн нижней панели с печатающимся текстом, но реплика
 * выбирается в зависимости от того, насколько тяжело дался бой игроку.
 * Закрывает нарративную дугу: интро познакомило с профессией,
 * аутро — подводит итог, почему это было интересно именно как игра.
 */
export class MasyaOutroScene extends Phaser.Scene {
  private dialogueText!: Phaser.GameObjects.Text;
  private continueIndicator!: Phaser.GameObjects.Text;
  private typeTimer?: Phaser.Time.TimerEvent;
  private isTyping = false;
  private fullText = '';
  private lineIndex = 0;
  private lines: string[] = [];
  private isShowingButton = false;

  private readonly BOX_HEIGHT = 140;
  private readonly BOX_PADDING = 24;

  // Реплика для случая, когда стресс был НИЖЕ порога — бой дался легко.
  private readonly LINES_LOW_STRESS = [
    'О, ты почти не напряглась! Быстро въехала в логику.',
    'Вот так и живём: условие сработало — проблема решена. Красота, если без нервов.',
  ];

  // Реплика для случая, когда стресс был ВЫШЕ порога — бой дался тяжело.
  private readonly LINES_HIGH_STRESS = [
    'Ого, попотела знатно! Вот ровно так я чувствую себя, когда прод падает в пятницу вечером.',
    'Но ты справилась — а это и есть программирование: не с первого раза, но через if, for и упрямство.',
  ];

  public constructor() {
    super('MasyaOutroScene');
  }

  public create(data: MasyaOutroData): void {
    this.lineIndex = 0;
    this.isTyping = false;
    this.isShowingButton = false;
    this.lines = data.stressLevel >= OUTRO_STRESS_THRESHOLD ? this.LINES_HIGH_STRESS : this.LINES_LOW_STRESS;

    this.buildDimOverlay();
    this.buildBox();
    this.registerInput();
    this.playCurrentLine();
    this.events.once('shutdown', () => this.cleanup());
  }

  private buildDimOverlay(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setAlpha(0)
      .setDepth(-10);
    // Фон уже затемнён предыдущей сценой (UiMinigameScene), поэтому здесь
    // не нужен отдельный fade-in — иначе экран мигнёт при переходе.
  }

  private buildBox(): void {
    const boxY = GAME_HEIGHT - this.BOX_HEIGHT / 2 - 12;

    this.add
      .rectangle(GAME_WIDTH / 2, boxY, GAME_WIDTH - 32, this.BOX_HEIGHT, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0x334155)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleAdvance());

    this.add.text(this.BOX_PADDING + 16, boxY - this.BOX_HEIGHT / 2 + 14, 'МАСЯ', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#4fd1c5',
      fontStyle: 'bold',
    });

    this.dialogueText = this.add
      .text(this.BOX_PADDING + 16, boxY - this.BOX_HEIGHT / 2 + 40, '', {
        fontSize: '15px',
        color: '#e2e8f0',
        wordWrap: { width: GAME_WIDTH - 32 - this.BOX_PADDING * 2 - 16 },
      })
      .setOrigin(0, 0);

    this.continueIndicator = this.add
      .text(GAME_WIDTH - 32 - 16, boxY + this.BOX_HEIGHT / 2 - 20, '▼', { fontSize: '14px', color: '#94a3b8' })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private registerInput(): void {
    this.input.keyboard!.on('keydown-SPACE', this.handleSpaceKey, this);
  }

  private handleSpaceKey = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    this.handleAdvance();
  };

  private cleanup(): void {
    this.input.keyboard?.off('keydown-SPACE', this.handleSpaceKey, this);
    this.typeTimer?.remove();
  }

  private playCurrentLine(): void {
    this.runTyping(this.lines[this.lineIndex]);
  }

  private runTyping(text: string): void {
    this.typeTimer?.remove();
    this.dialogueText.setText('');
    this.fullText = text;
    this.isTyping = true;
    this.continueIndicator.setVisible(false);
    let charIndex = 0;
    this.typeTimer = this.time.addEvent({
      delay: BOSS_TYPEWRITER_MS,
      loop: true,
      callback: () => {
        charIndex += 1;
        this.dialogueText.setText(text.slice(0, charIndex));
        if (charIndex >= text.length) {
          this.typeTimer?.remove();
          this.isTyping = false;
          this.continueIndicator.setVisible(true);
        }
      },
    });
  }

  private handleAdvance(): void {
    // Пока показана кнопка возврата — клики/пробел по тексту больше не нужны,
    // чтобы случайный повторный клик не плодил вторую кнопку
    // (именно такой баг уже чинили в MasyaIntroScene — держим защиту и здесь).
    if (this.isShowingButton) return;

    if (this.isTyping) {
      this.typeTimer?.remove();
      this.dialogueText.setText(this.fullText);
      this.isTyping = false;
      this.continueIndicator.setVisible(true);
      return;
    }

    this.lineIndex += 1;
    if (this.lineIndex < this.lines.length) {
      this.playCurrentLine();
      return;
    }

    this.showReturnButton();
  }

  private showReturnButton(): void {
    this.isShowingButton = true;
    this.continueIndicator.setVisible(false);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - this.BOX_HEIGHT - 34, RETURN_BUTTON_LABEL, {
        fontSize: '14px',
        color: '#0f172a',
        backgroundColor: '#4ade80',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.finishOutro());
  }

  /**
   * Только здесь, в самом конце аутро, отправляется событие с результатом боя —
   * раньше это делалось сразу на экране статистики в UiMinigameScene,
   * теперь результат уходит после того, как игрок дочитал реакцию Маси.
   */
  private finishOutro(): void {
    this.game.events.emit('minigame-exit');
    this.scene.stop();
  }
}