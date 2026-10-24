import Phaser from 'phaser';
import { DialogueManager } from '../dialogue/DialogueManager';
import {
  COLOR_TEXT_PRIMARY,
  DIALOGUE_BODY_OFFSET_Y,
  DIALOGUE_BOX_HEIGHT,
  DIALOGUE_BOX_PADDING,
  DIALOGUE_CHOICE_LINE_HEIGHT,
  DIALOGUE_CHOICES_GAP_Y,
  DIALOGUE_NAME_OFFSET_Y,
  DIALOGUE_PROMPT_MARGIN_Y,
  DIALOGUE_TYPING_SPEED_MS,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../config/constants';
import type { DialogueState } from '../types/DialogueTypes';
import type { MinigameType } from '../types/PlayerProgress';

import maxStory from '../dialogue/stories/max.ink.json';
import nastyaStory from '../dialogue/stories/nastya.ink.json';
import lenaStory from '../dialogue/stories/lena.ink.json';

/**
 * Реестр скомпилированных ink-историй. Статический импорт нужен, чтобы Vite
 * включил JSON-файлы в сборку (runtime fetch для этого не подходит).
 * Ключ соответствует `dialogueStoryPath`, который хранится в NPC.
 */
const STORY_REGISTRY: Record<string, object> = {
  max: maxStory,
  nastya: nastyaStory,
  lena: lenaStory,
};

/** Данные, передаваемые в сцену при scene.launch(). */
interface DialogueSceneData {
  npcId: string;
  dialogueStoryPath: string;
}


/**
 * UI-сцена диалога. Запускается поверх HubScene через scene.launch() и
 * отрисовывает текстовое окно с посимвольной печаткой текста и кнопками
 * вариантов ответа. По завершении истории эмитит 'dialogue-complete' и
 * останавливает саму себя — решение о том, что делать дальше
 * (возобновить хаб или запустить мини-игру), принимает HubScene.
 */
export class DialogueScene extends Phaser.Scene {
  private dialogueManager: DialogueManager | null = null;
  private npcId = '';

  private boxGraphics: Phaser.GameObjects.Graphics | null = null;
  private bodyText: Phaser.GameObjects.Text | null = null;
  private continuePrompt: Phaser.GameObjects.Text | null = null;
  private choiceTexts: Phaser.GameObjects.Text[] = [];

  private typingTimer: Phaser.Time.TimerEvent | null = null;
  private fullLineText = '';
  private isTyping = false;
  private pendingState: DialogueState | null = null;

  public constructor() {
    super('DialogueScene');
  }

  /**
   * Жизненный цикл Phaser: инициализация диалога по переданным данным.
   * @param data npcId и путь к ink-истории, которую нужно воспроизвести
   */
  public create(data: DialogueSceneData): void {
    this.npcId = data.npcId;
    const storyJson = STORY_REGISTRY[data.dialogueStoryPath];
    if (storyJson === undefined) {
      console.error(`[DialogueScene] История "${data.dialogueStoryPath}" не найдена в реестре.`);
      this.scene.stop();
      return;
    }

    this.dialogueManager = new DialogueManager(storyJson);
    this.buildUi();
    this.advanceStory();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupTypingTimer());
  }

  /** Создаёт статичные UI-элементы диалогового окна (фон, рамка, тексты). */
  private buildUi(): void {
    const boxY = GAME_HEIGHT - DIALOGUE_BOX_HEIGHT;

    this.boxGraphics = this.add.graphics();
    this.boxGraphics.fillStyle(0x0f172a, 0.95);
    this.boxGraphics.fillRect(0, boxY, GAME_WIDTH, DIALOGUE_BOX_HEIGHT);
    this.boxGraphics.lineStyle(2, 0x4fd1c5, 1);
    this.boxGraphics.strokeRect(0, boxY, GAME_WIDTH, DIALOGUE_BOX_HEIGHT);

    this.add.text(DIALOGUE_BOX_PADDING, boxY + DIALOGUE_NAME_OFFSET_Y, this.npcId.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#4fd1c5',
      fontStyle: 'bold',
    });

    this.bodyText = this.add.text(DIALOGUE_BOX_PADDING, boxY + DIALOGUE_BODY_OFFSET_Y, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      wordWrap: { width: GAME_WIDTH - DIALOGUE_BOX_PADDING * 2 },
    });

    this.continuePrompt = this.add.text(
      GAME_WIDTH - DIALOGUE_BOX_PADDING,
      GAME_HEIGHT - DIALOGUE_PROMPT_MARGIN_Y,
      'ПРОБЕЛ ▸',
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#94a3b8',
      },
    );
    this.continuePrompt.setOrigin(1, 1);
    this.continuePrompt.setVisible(false);

    this.input.keyboard?.on('keydown-SPACE', () => this.handleContinuePressed());
  }

  /**
   * Запрашивает у DialogueManager следующий фрагмент истории и запускает
   * посимвольную печать текста.
   */
  private advanceStory(): void {
    if (this.dialogueManager === null) {
      return;
    }
    const state = this.dialogueManager.continueStory();
    this.pendingState = state;
    this.startTyping(state.currentText.length > 0 ? state.currentText : '...');
  }

  /**
   * Запускает посимвольную печать строки текста с задержкой
   * DIALOGUE_TYPING_SPEED_MS между символами.
   * @param text полный текст реплики, который нужно "напечатать"
   */
  private startTyping(text: string): void {
    this.cleanupTypingTimer();
    this.clearChoiceButtons();
    this.continuePrompt?.setVisible(false);

    this.fullLineText = text;
    this.isTyping = true;
    this.bodyText?.setText('');

    let charIndex = 0;
    this.typingTimer = this.time.addEvent({
      delay: DIALOGUE_TYPING_SPEED_MS,
      loop: true,
      callback: () => {
        charIndex += 1;
        this.bodyText?.setText(this.fullLineText.slice(0, charIndex));
        if (charIndex >= this.fullLineText.length) {
          this.cleanupTypingTimer();
          this.onTypingFinished();
        }
      },
    });
  }

  /** Мгновенно завершает печать (используется при нажатии пробела во время анимации). */
  private skipTyping(): void {
    this.cleanupTypingTimer();
    this.bodyText?.setText(this.fullLineText);
    this.onTypingFinished();
  }

  /** Вызывается после завершения печати текста: показывает выбор или подсказку продолжения. */
  private onTypingFinished(): void {
    this.isTyping = false;
    const state = this.pendingState;
    if (state === null) {
      return;
    }

    if (state.choices.length > 0) {
      this.renderChoices(state.choices);
    } else if (state.isEnded) {
      this.finishDialogue(state.minigameToLaunch);
    } else {
      this.continuePrompt?.setVisible(true);
    }
  }

  /**
 * Отрисовывает кнопки вариантов ответа под ФАКТИЧЕСКИМ текстом реплики.
 * Раньше кнопки стояли по фиксированной координате и наезжали на реплики
 * из 3–4 строк. Теперь первая кнопка идёт от нижнего края bodyText,
 * поэтому кнопки всегда оказываются под текстом, какой бы длины он ни был.
 * Вызывается только после окончания печати, когда bodyText уже содержит
 * полный текст и его height актуален.
 * @param choices список вариантов, полученных от DialogueManager
 */
private renderChoices(choices: DialogueState['choices']): void {
  this.clearChoiceButtons();

  const textBottomY = this.bodyText ? this.bodyText.y + this.bodyText.height : 0;
  const choicesTopY = textBottomY + DIALOGUE_CHOICES_GAP_Y;

  // Предупреждаем, если кнопки не влезают в окно: так проблему заметят
  // при добавлении нового ink-контента, а не при демо.
  const choicesBottomY = choicesTopY + choices.length * DIALOGUE_CHOICE_LINE_HEIGHT;
  if (choicesBottomY > GAME_HEIGHT) {
    console.warn(
      `[DialogueScene] Варианты выбора не помещаются в окно: нижний край ${choicesBottomY}px ` +
        `при высоте экрана ${GAME_HEIGHT}px. Увеличь DIALOGUE_BOX_HEIGHT или сократи реплику.`,
    );
  }

  choices.forEach((choice, position) => {
    const text = this.add.text(
      GAME_WIDTH / 2,
      choicesTopY + position * DIALOGUE_CHOICE_LINE_HEIGHT,
      `▸ ${choice.text}`,
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fde68a',
      },
    );
    // Origin по верхнему краю (0.5, 0): Y указывает на верх строки,
    // поэтому шаг DIALOGUE_CHOICE_LINE_HEIGHT соответствует реальной высоте строки.
    text.setOrigin(0.5, 0);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setColor('#fff7cc'));
    text.on('pointerout', () => text.setColor('#fde68a'));
    text.on('pointerdown', () => this.handleChoiceSelected(choice.index));
    this.choiceTexts.push(text);
  });
}

  /** Удаляет все текущие кнопки выбора со сцены. */
  private clearChoiceButtons(): void {
    for (const text of this.choiceTexts) {
      text.destroy();
    }
    this.choiceTexts = [];
  }

  /**
   * Обрабатывает выбор игрока: передаёт индекс в DialogueManager и
   * запрашивает следующий фрагмент истории.
   * @param index индекс выбранного варианта
   */
  private handleChoiceSelected(index: number): void {
    if (this.dialogueManager === null) {
      return;
    }
    this.clearChoiceButtons();
    this.dialogueManager.choose(index);
    this.advanceStory();
  }

  /** Обрабатывает нажатие пробела: либо ускоряет печать, либо продолжает диалог. */
  private handleContinuePressed(): void {
    if (this.isTyping) {
      this.skipTyping();
      return;
    }
    const state = this.pendingState;
    if (state !== null && state.choices.length === 0 && !state.isEnded) {
      this.advanceStory();
    }
  }

  /**
   * Завершает диалог: эмитит глобальное событие 'dialogue-complete' и
   * останавливает сцену. HubScene сама решает, запускать ли мини-игру.
   * @param minigameToLaunch тип мини-игры, если ink-сценарий её запросил
   */
  private finishDialogue(minigameToLaunch: MinigameType | null): void {
    this.game.events.emit('dialogue-complete', {
      npcId: this.npcId,
      minigameToLaunch,
    });
    this.scene.stop();
  }

  /** Останавливает и очищает таймер посимвольной печати, если он активен. */
  private cleanupTypingTimer(): void {
    if (this.typingTimer !== null) {
      this.typingTimer.remove();
      this.typingTimer = null;
    }
  }
}
