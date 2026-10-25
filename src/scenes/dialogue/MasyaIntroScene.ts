import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BOSS_TOP_PANEL_WIDTH,
  BOSS_TOP_PANEL_HEIGHT,
  BOSS_PORTRAIT_SIZE,
  BOSS_TYPEWRITER_MS,
  BOSS_INTRO_COUNTDOWN_MS,
} from '../../config/constants';

export class MasyaIntroScene extends Phaser.Scene {
  private dialogueText!: Phaser.GameObjects.Text;
  private continueIndicator!: Phaser.GameObjects.Text;
  private typewriterState: {
    fullText: string;
    timer?: Phaser.Time.TimerEvent;
    isRunning: boolean;
    onComplete?: () => void;
  } = { fullText: '', isRunning: false };

  private readonly STORY_LINES = [
    'Начинала я случайно — просто захотела собрать игру для друзей.',
    'Потом втянулась: оказалось, что код — это просто чёткие правила, как читы.',
    'Теперь пишу свой проект и обучаю таких, как ты!',
  ];

  public constructor() {
    super('MasyaIntroScene');
  }

  public create(): void {
    const dimOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setAlpha(0);
    this.tweens.add({ targets: dimOverlay, alpha: 1, duration: 450 });

    this.buildPanel();
    this.runTypewriter(
      'Мася стоит у окна и что-то обдумывает... Кажется, пишет свой личный проект.',
      () => this.showMenu(),
    );

    this.input.keyboard!.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (event.repeat) return;
      this.handleAdvance();
    });
  }

  private buildPanel(): void {
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2 - 40;

    this.add
      .rectangle(panelX, panelY, BOSS_TOP_PANEL_WIDTH, BOSS_TOP_PANEL_HEIGHT, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0x334155)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleAdvance());

    const portraitX = panelX - BOSS_TOP_PANEL_WIDTH / 2 + BOSS_PORTRAIT_SIZE / 2 + 16;

    if (this.textures.exists('npc_max')) {
      this.add.image(portraitX, panelY, 'npc_max').setDisplaySize(BOSS_PORTRAIT_SIZE, BOSS_PORTRAIT_SIZE);
    } else {
      this.add.rectangle(portraitX, panelY, BOSS_PORTRAIT_SIZE, BOSS_PORTRAIT_SIZE, 0x7c3aed);
      this.add.text(portraitX, panelY, 'М', { fontSize: '36px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    }

    const textX = portraitX + BOSS_PORTRAIT_SIZE / 2 + 20;
    this.dialogueText = this.add
      .text(textX, panelY - 16, '', {
        fontSize: '16px',
        color: '#e2e8f0',
        wordWrap: { width: panelX + BOSS_TOP_PANEL_WIDTH / 2 - textX - 24 },
      })
      .setOrigin(0, 0.5);

    this.continueIndicator = this.add
      .text(panelX + BOSS_TOP_PANEL_WIDTH / 2 - 24, panelY + BOSS_TOP_PANEL_HEIGHT / 2 - 18, '▼', {
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private runTypewriter(text: string, onComplete: () => void): void {
    this.dialogueText.setText('');
    this.typewriterState.fullText = text;
    this.typewriterState.isRunning = true;
    this.typewriterState.onComplete = onComplete;
    this.continueIndicator.setVisible(false);

    let charIndex = 0;
    const timer = this.time.addEvent({
      delay: BOSS_TYPEWRITER_MS,
      loop: true,
      callback: () => {
        charIndex += 1;
        this.dialogueText.setText(text.slice(0, charIndex));
        if (charIndex >= text.length) {
          timer.remove();
          this.typewriterState.isRunning = false;
          this.continueIndicator.setVisible(true);
        }
      },
    });
    this.typewriterState.timer = timer;
  }

  private handleAdvance(): void {
    if (this.typewriterState.isRunning) {
      this.typewriterState.timer?.remove();
      this.dialogueText.setText(this.typewriterState.fullText);
      this.typewriterState.isRunning = false;
      this.continueIndicator.setVisible(true);
      return;
    }
    const callback = this.typewriterState.onComplete;
    this.typewriterState.onComplete = undefined;
    this.continueIndicator.setVisible(false);
    callback?.();
  }

  private showMenu(): void {
    const askButton = this.add
      .text(GAME_WIDTH / 2 - 90, GAME_HEIGHT / 2 + 80, 'Как ты стала программистом?', {
        fontSize: '14px',
        color: '#0f172a',
        backgroundColor: '#93c5fd',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const startButton = this.add
      .text(GAME_WIDTH / 2 + 110, GAME_HEIGHT / 2 + 80, 'Начать бой', {
        fontSize: '14px',
        color: '#0f172a',
        backgroundColor: '#4ade80',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    askButton.on('pointerdown', () => {
      askButton.destroy();
      startButton.destroy();
      this.runStorySequence(0);
    });

    startButton.on('pointerdown', () => {
      askButton.destroy();
      startButton.destroy();
      this.runCountdown();
    });
  }

  private runStorySequence(index: number): void {
    if (index >= this.STORY_LINES.length) {
      this.runCountdown();
      return;
    }

    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40).setScale(0.3).setAlpha(0);
    const bg = this.add.rectangle(0, 0, 420, 90, 0x111827, 0.95).setStrokeStyle(2, 0x60a5fa);
    const text = this.add
      .text(0, 0, '', { fontSize: '15px', color: '#e2e8f0', align: 'center', wordWrap: { width: 380 } })
      .setOrigin(0.5);
    const hint = this.add.text(190, 34, '▼', { fontSize: '13px', color: '#94a3b8' }).setOrigin(0.5).setVisible(false);

    container.add([bg, text, hint]);
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });

    const line = this.STORY_LINES[index];
    let charIndex = 0;
    let isRunning = true;

    const timer = this.time.addEvent({
      delay: BOSS_TYPEWRITER_MS,
      loop: true,
      callback: () => {
        charIndex += 1;
        text.setText(line.slice(0, charIndex));
        if (charIndex >= line.length) {
          timer.remove();
          isRunning = false;
          hint.setVisible(true);
        }
      },
    });

    const advance = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      if (isRunning) {
        timer.remove();
        text.setText(line);
        isRunning = false;
        hint.setVisible(true);
        return;
      }
      this.input.keyboard!.off('keydown-SPACE', advance);
      container.destroy();
      this.runStorySequence(index + 1);
    };

    this.input.keyboard!.on('keydown-SPACE', advance);
  }

  private runCountdown(): void {
    const label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'Погнали? Бой начнётся через 3 секунды...\n[Пробел] — начать сразу', {
        fontSize: '14px',
        color: '#94a3b8',
        align: 'center',
      })
      .setOrigin(0.5);

    const countdownEvent = this.time.delayedCall(BOSS_INTRO_COUNTDOWN_MS, () => startFight());

    const startFight = (): void => {
      countdownEvent.remove(false);
      this.input.keyboard!.off('keydown-SPACE', skipHandler);
      label.destroy();
      this.scene.stop();
      this.scene.launch('UiMinigameScene');
    };

    const skipHandler = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      startFight();
    };
    this.input.keyboard!.on('keydown-SPACE', skipHandler);
  }
}