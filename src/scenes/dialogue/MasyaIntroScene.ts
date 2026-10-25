import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BOSS_TYPEWRITER_MS, BOSS_INTRO_COUNTDOWN_MS } from '../../config/constants';

// 👇 ЕСЛИ ХОЧЕШЬ ПОМЕНЯТЬ ТЕКСТ КНОПКИ — ПРАВЬ ТОЛЬКО ЭТУ СТРОКУ, БОЛЬШЕ НИЧЕГО ТРОГАТЬ НЕ НУЖНО
const START_BUTTON_LABEL = 'Погнали, показывай!';

type Stage = 'typing-lines' | 'awaiting-start' | 'countdown';

export class MasyaIntroScene extends Phaser.Scene {
  private dialogueText!: Phaser.GameObjects.Text;
  private continueIndicator!: Phaser.GameObjects.Text;
  private dimOverlay!: Phaser.GameObjects.Rectangle;
  private startButton?: Phaser.GameObjects.Text;
  private countdownLabel?: Phaser.GameObjects.Text;
  private countdownEvent?: Phaser.Time.TimerEvent;
  private typeTimer?: Phaser.Time.TimerEvent;

  private stage: Stage = 'typing-lines';
  private isTyping = false;
  private fullText = '';
  private lineIndex = 0;

  // Это ПРЯМОЕ продолжение последней реплики ink-диалога
  // ("Ладно, давай покажу, с чем реально приходится возиться каждый день").
  // Никакой повторной биографии здесь нет — она уже рассказана в обычном диалоге.
  private readonly INTRO_LINES = [
    'Вот смотри: весь код держится на простых правилах — как читы в игре.',
    'Сейчас покажу прямо на деле. Готов словить парочку?',
  ];

  private readonly BOX_HEIGHT = 140;
  private readonly BOX_PADDING = 24;

  public constructor() {
    super('MasyaIntroScene');
  }

  public create(): void {
    this.stage = 'typing-lines';
    this.isTyping = false;
    this.lineIndex = 0;

    this.buildDimOverlay();
    this.buildBox();
    this.registerInput();

    this.playCurrentLine();

    this.events.once('shutdown', () => this.cleanup());
  }

  private buildDimOverlay(): void {
    this.dimOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setAlpha(0)
      .setDepth(-10);
    this.tweens.add({ targets: this.dimOverlay, alpha: 1, duration: 450 });
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
    if (this.stage === 'countdown') {
      this.startFight();
      return;
    }
    this.handleAdvance();
  };

  private cleanup(): void {
    this.input.keyboard?.off('keydown-SPACE', this.handleSpaceKey, this);
    this.typeTimer?.remove();
    this.countdownEvent?.remove(false);
  }

  private playCurrentLine(): void {
    const line = this.INTRO_LINES[this.lineIndex];
    this.runTyping(line);
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
    if (this.isTyping) {
      this.typeTimer?.remove();
      this.dialogueText.setText(this.fullText);
      this.isTyping = false;
      this.continueIndicator.setVisible(true);
      return;
    }

    this.lineIndex += 1;
    if (this.lineIndex < this.INTRO_LINES.length) {
      this.playCurrentLine();
      return;
    }

    this.showStartButton();
  }

  private showStartButton(): void {
    this.stage = 'awaiting-start';
    this.continueIndicator.setVisible(false);

    this.startButton = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - this.BOX_HEIGHT - 34, START_BUTTON_LABEL, {
        fontSize: '14px',
        color: '#0f172a',
        backgroundColor: '#4ade80',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startCountdown());
  }

  private startCountdown(): void {
    this.startButton?.destroy();
    this.startButton = undefined;
    this.stage = 'countdown';

    this.dialogueText.setText('Бой начнётся через 3 секунды...');

    this.countdownLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - this.BOX_HEIGHT - 34, '[Пробел] — начать сразу', {
        fontSize: '13px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.countdownEvent = this.time.delayedCall(BOSS_INTRO_COUNTDOWN_MS, () => this.startFight());
  }

  private startFight(): void {
    this.countdownEvent?.remove(false);
    this.countdownLabel?.destroy();

    if (this.scene.isActive('UiMinigameScene')) {
      this.scene.stop('UiMinigameScene');
    }

    this.scene.stop();
    this.scene.launch('UiMinigameScene');
  }
}