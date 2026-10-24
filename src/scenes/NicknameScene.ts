import Phaser from 'phaser';
import { COLOR_TEXT_PRIMARY, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ensurePlayerSession } from '../api/progressService';
import { GameState } from '../state/GameState';

/** Максимальная длина никнейма, который может ввести игрок. */
const NICKNAME_MAX_LENGTH = 16;

/**
 * Сцена ввода никнейма. Поскольку Phaser не предоставляет нативных текстовых
 * полей, поверх canvas создаётся обычный HTML <input> с абсолютным
 * позиционированием. После подтверждения ника DOM-элементы удаляются,
 * чтобы не оставаться "висеть" при переключении сцен.
 */
export class NicknameScene extends Phaser.Scene {
  /** HTML-инпут для ввода ника, создаётся поверх canvas. */
  private nicknameInput: HTMLInputElement | null = null;
  /** Кнопка подтверждения ввода. */
  private submitButton: HTMLButtonElement | null = null;
  /** Контейнер, в котором размещены input и кнопка (для удобного удаления). */
  private domContainer: HTMLDivElement | null = null;
  /** Текст статуса/ошибки, отображаемый под формой. */
  private statusText: Phaser.GameObjects.Text | null = null;

  public constructor() {
    super('NicknameScene');
  }

  /** Жизненный цикл Phaser: построение UI сцены. */
  public create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 140, 'ПрофПуть', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'Как к тебе обращаться?', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      })
      .setOrigin(0.5, 0.5);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#fca5a5',
      })
      .setOrigin(0.5, 0.5);

    this.createDomForm();

    // Удаляем HTML-форму при остановке/уничтожении сцены, чтобы она
    // гарантированно не оставалась висеть поверх других сцен.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyDomForm());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyDomForm());
  }

  /**
   * Создаёт HTML-форму (input + кнопка) и позиционирует её поверх canvas.
   */
  private createDomForm(): void {
  
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.zIndex = '10'

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Введи ник...';
    input.maxLength = NICKNAME_MAX_LENGTH;
    input.style.width = '180px';
    input.style.padding = '8px 10px';
    input.style.fontSize = '16px';
    input.style.fontFamily = 'monospace';
    input.style.border = '2px solid #4fd1c5';
    input.style.borderRadius = '6px';
    input.style.outline = 'none';
    input.style.background = '#1a202c';
    input.style.color = '#f7fafc';

    const button = document.createElement('button');
    button.textContent = 'Начать';
    button.style.padding = '8px 16px';
    button.style.fontSize = '16px';
    button.style.fontFamily = 'monospace';
    button.style.border = 'none';
    button.style.borderRadius = '6px';
    button.style.background = '#4fd1c5';
    button.style.color = '#1a202c';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';

    const handleSubmit = (): void => {
      void this.handleStart();
    };

    button.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleSubmit();
      }
    });

    container.appendChild(input);
    container.appendChild(button);
    document.body.appendChild(container);
    input.focus();

    this.domContainer = container;
    this.nicknameInput = input;
    this.submitButton = button;
  }

  /**
   * Обрабатывает нажатие кнопки "Начать": валидирует ник, инициализирует
   * сессию PocketBase (или локальный fallback), сохраняет прогресс в
   * GameState и переключается в хаб.
   * @param rawNickname значение, введённое в поле ника
   */
  private async handleStart(): Promise<void> {
    const nickname = (this.nicknameInput?.value ?? '').trim();
    if (nickname.length === 0) {
      this.statusText?.setText('Введите никнейм, прежде чем начать.');
      return;
    }

    if (this.submitButton !== null) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'Загрузка...';
    }
    if (this.nicknameInput !== null) {
      this.nicknameInput.disabled = true;
    }

    try {
      const progress = await ensurePlayerSession(nickname);
      GameState.getInstance().setProgress(progress);
      this.destroyDomForm();
      this.scene.start('HubScene');
    } catch (error) {
      console.error('[NicknameScene] Не удалось инициализировать сессию игрока:', error);
      this.statusText?.setText('Не получилось подключиться к серверу, но можно играть офлайн.');
      if (this.submitButton !== null) {
        this.submitButton.disabled = false;
        this.submitButton.textContent = 'Начать';
      }
      if (this.nicknameInput !== null) {
        this.nicknameInput.disabled = false;
      }
    }
  }

  /** Удаляет HTML-форму из DOM, если она ещё существует. */
  private destroyDomForm(): void {
    if (this.domContainer !== null) {
      this.domContainer.remove();
      this.domContainer = null;
      this.nicknameInput = null;
      this.submitButton = null;
    }
  }
}
