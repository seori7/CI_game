import Phaser from 'phaser';

import {
  COLOR_TEXT_PRIMARY,
  GAME_HEIGHT,
  GAME_WIDTH,
  MENU_CONTROL_FONT_SIZE_PX,
  MENU_CONTROL_PADDING_X_PX,
  MENU_CONTROL_PADDING_Y_PX,
  MENU_CSS_ACCENT,
  MENU_CSS_ACCENT_HOVER,
  MENU_CSS_INPUT_BG,
  MENU_CSS_MUTED,
  MENU_CSS_PANEL_BG,
  MENU_CSS_SHADOW,
  MENU_CSS_TEXT,
  MENU_CSS_TEXT_ON_ACCENT,
  MENU_DISABLED_OPACITY,
  MENU_FALLBACK_BG_COLOR,
  MENU_FORM_BORDER_PX,
  MENU_FORM_GAP_PX,
  MENU_FORM_PADDING_PX,
  MENU_FORM_SHADOW_PX,
  MENU_HINT_FONT_SIZE_PX,
  MENU_INPUT_WIDTH_PX,
  MENU_STATUS_COLOR,
  MENU_STATUS_FONT_SIZE_PX,
  MENU_STATUS_OFFSET_Y,
  MENU_SUBTITLE_FONT_SIZE_PX,
  MENU_SUBTITLE_OFFSET_Y,
  MENU_TITLE_FONT_SIZE_PX,
  MENU_TITLE_OFFSET_Y,
  MENU_TITLE_SHADOW_OFFSET,
  MENU_TITLE_STROKE_COLOR,
  MENU_TITLE_STROKE_THICKNESS,
  MENU_TITLE_PULSE_MS,
  MENU_TITLE_PULSE_SCALE,
  MENU_BUTTON_HOVER_MS,
  MENU_BUTTON_HOVER_OFFSET_PX,
  MENU_BUTTON_PRESS_MS,
  MENU_FADE_OUT_MS,
  MENU_WELCOME_DURATION_MS,
  MENU_TRANSITION_COLOR,
  MENU_WELCOME_FONT_SIZE_PX,
  MENU_WELCOME_TEXT_COLOR,
  MENU_WELCOME_INITIAL_ALPHA,
  MENU_WELCOME_FADE_MS,
} from '../config/constants';

import { MENU_BACKGROUND_PATH } from '../config/assetManifest';
import { ensurePlayerSession } from '../api/progressService';
import { GameState } from '../state/GameState';

/**
 * Максимальная длина ника.
 * Совпадает с ограничением поля nickname в PocketBase.
 */
const NICKNAME_MAX_LENGTH = 16;

/**
 * CSS формы ввода.
 * Используем отдельный style, поскольку псевдоклассы
 * :hover и :active нельзя оформить через inline-style.
 */
function buildNicknameFormCss(): string {
  return `
.pp-nickname-form {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;

  display: flex;
  flex-direction: column;
  align-items: center;

  gap: ${MENU_FORM_GAP_PX}px;
  padding: ${MENU_FORM_PADDING_PX}px;

  background: ${MENU_CSS_PANEL_BG};
  border: ${MENU_FORM_BORDER_PX}px solid ${MENU_CSS_ACCENT};

  box-shadow:
    ${MENU_FORM_SHADOW_PX}px
    ${MENU_FORM_SHADOW_PX}px
    0
    ${MENU_CSS_SHADOW};

  font-family: monospace;
}

.pp-nickname-row {
  display: flex;
  gap: ${MENU_FORM_GAP_PX}px;
}

.pp-nickname-input {
  width: ${MENU_INPUT_WIDTH_PX}px;

  padding:
    ${MENU_CONTROL_PADDING_Y_PX}px
    ${MENU_CONTROL_PADDING_X_PX}px;

  font-family: monospace;
  font-size: ${MENU_CONTROL_FONT_SIZE_PX}px;

  color: ${MENU_CSS_TEXT};
  background: ${MENU_CSS_INPUT_BG};

  border: ${MENU_FORM_BORDER_PX}px solid ${MENU_CSS_ACCENT};
  border-radius: 0;
  outline: none;

  box-sizing: border-box;
}

.pp-nickname-input::placeholder {
  color: ${MENU_CSS_MUTED};
}

.pp-nickname-input:focus {
  border-color: ${MENU_CSS_ACCENT_HOVER};
}

.pp-nickname-input:disabled {
  opacity: ${MENU_DISABLED_OPACITY};
}

/* Пиксельная кнопка с жёсткой тенью. */
.pp-nickname-button {
  padding:
    ${MENU_CONTROL_PADDING_Y_PX}px
    ${MENU_CONTROL_PADDING_X_PX}px;

  font-family: monospace;
  font-size: ${MENU_CONTROL_FONT_SIZE_PX}px;
  font-weight: bold;

  color: ${MENU_CSS_TEXT_ON_ACCENT};
  background: ${MENU_CSS_ACCENT};

  border: ${MENU_FORM_BORDER_PX}px solid ${MENU_CSS_TEXT_ON_ACCENT};
  border-radius: 0;

  cursor: pointer;

  box-shadow:
    0 ${MENU_FORM_SHADOW_PX}px 0 ${MENU_CSS_SHADOW};

  transition:
    transform ${MENU_BUTTON_HOVER_MS}ms ease,
    box-shadow ${MENU_BUTTON_HOVER_MS}ms ease,
    background ${MENU_BUTTON_HOVER_MS}ms ease;
}

/* При наведении кнопка немного поднимается. */
.pp-nickname-button:hover:not(:disabled) {
  background: ${MENU_CSS_ACCENT_HOVER};

  transform:
    translateY(-${MENU_BUTTON_HOVER_OFFSET_PX}px);

  box-shadow:
    0 ${MENU_FORM_SHADOW_PX + MENU_BUTTON_HOVER_OFFSET_PX}px
    0 ${MENU_CSS_SHADOW};
}

/* При нажатии кнопка визуально вдавливается. */
.pp-nickname-button:active:not(:disabled) {
  transform: translateY(${MENU_FORM_SHADOW_PX}px);
  box-shadow: 0 0 0 ${MENU_CSS_SHADOW};

  transition-duration: ${MENU_BUTTON_PRESS_MS}ms;
}

.pp-nickname-button:disabled {
  opacity: ${MENU_DISABLED_OPACITY};
  cursor: wait;
  transform: none;
}

.pp-nickname-hint {
  font-size: ${MENU_HINT_FONT_SIZE_PX}px;
  color: ${MENU_CSS_MUTED};
}
`;
}

/**
 * Главное меню ONWAY.
 *
 * Phaser отвечает за фон, заголовок и переход.
 * HTML используется только для ввода никнейма.
 */
export class NicknameScene extends Phaser.Scene {
  private nicknameInput: HTMLInputElement | null = null;
  private submitButton: HTMLButtonElement | null = null;

  private domContainer: HTMLDivElement | null = null;
  private styleElement: HTMLStyleElement | null = null;

  private statusText: Phaser.GameObjects.Text | null = null;

  public constructor() {
    super('NicknameScene');
  }

  /**
   * Создаём главное меню.
   */
  public create(): void {
    this.buildBackground();
    this.buildTitle();

    this.statusText = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + MENU_STATUS_OFFSET_Y,
        '',
        {
          fontFamily: 'monospace',
          fontSize: `${MENU_STATUS_FONT_SIZE_PX}px`,
          color: MENU_STATUS_COLOR,
        },
      )
      .setOrigin(0.5, 0.5);

    this.createDomForm();

    // HTML существует вне Phaser, поэтому удаляем его
    // при завершении сцены.
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => this.destroyDomForm(),
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      () => this.destroyDomForm(),
    );
  }

  /**
   * Фон меню.
   * Если PNG отсутствует, используем резервный цвет.
   */
  private buildBackground(): void {
    if (
      MENU_BACKGROUND_PATH !== null &&
      this.textures.exists(MENU_BACKGROUND_PATH)
    ) {
      this.add
        .image(0, 0, MENU_BACKGROUND_PATH)
        .setOrigin(0, 0);

      return;
    }

    this.add
      .rectangle(
        0,
        0,
        GAME_WIDTH,
        GAME_HEIGHT,
        MENU_FALLBACK_BG_COLOR,
      )
      .setOrigin(0, 0);
  }

  /**
   * Создаёт заголовок ONWAY с лёгкой пульсацией.
   */
  private buildTitle(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const title = this.add
      .text(
        centerX,
        centerY + MENU_TITLE_OFFSET_Y,
        'ONWAY',
        {
          fontFamily: 'monospace',
          fontSize: `${MENU_TITLE_FONT_SIZE_PX}px`,
          color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
          fontStyle: 'bold',
          stroke: MENU_TITLE_STROKE_COLOR,
          strokeThickness: MENU_TITLE_STROKE_THICKNESS,
        },
      )
      .setOrigin(0.5, 0.5)
      .setShadow(
        MENU_TITLE_SHADOW_OFFSET,
        MENU_TITLE_SHADOW_OFFSET,
        MENU_TITLE_STROKE_COLOR,
        0,
        false,
        true,
      );

    // Пульсация создаёт ощущение живого меню.
    this.tweens.add({
      targets: title,
      scaleX: MENU_TITLE_PULSE_SCALE,
      scaleY: MENU_TITLE_PULSE_SCALE,
      duration: MENU_TITLE_PULSE_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Подзаголовок располагается под названием игры.
    this.add
      .text(
        centerX,
        centerY + MENU_SUBTITLE_OFFSET_Y,
        'Как к тебе обращаться?',
        {
          fontFamily: 'monospace',
          fontSize: `${MENU_SUBTITLE_FONT_SIZE_PX}px`,
          color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
        },
      )
      .setOrigin(0.5, 0.5);
  }

  /**
   * Создаёт HTML-форму поверх Canvas.
   */
  private createDomForm(): void {
    const style = document.createElement('style');

    style.textContent = buildNicknameFormCss();
    document.head.appendChild(style);

    const form = document.createElement('div');
    form.className = 'pp-nickname-form';

    const row = document.createElement('div');
    row.className = 'pp-nickname-row';

    const input = document.createElement('input');

    input.type = 'text';
    input.placeholder = 'Введи ник...';
    input.maxLength = NICKNAME_MAX_LENGTH;
    input.autocomplete = 'off';
    input.className = 'pp-nickname-input';

    const button = document.createElement('button');

    button.textContent = 'НАЧАТЬ ▸';
    button.className = 'pp-nickname-button';

    const hint = document.createElement('div');

    hint.className = 'pp-nickname-hint';
    hint.textContent = 'Enter — начать';

    const handleSubmit = (): void => {
      void this.handleStart();
    };

    button.addEventListener('click', handleSubmit);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleSubmit();
      }
    });

    row.append(input, button);
    form.append(row, hint);

    document.body.appendChild(form);

    input.focus();

    this.styleElement = style;
    this.domContainer = form;
    this.nicknameInput = input;
    this.submitButton = button;
  }

  /**
   * Проверяет никнейм и запускает игровую сессию.
   *
   * Контракт с PocketBase не изменён.
   */
  private async handleStart(): Promise<void> {
    const nickname = (this.nicknameInput?.value ?? '').trim();

    if (nickname.length === 0) {
      this.statusText?.setText(
        'Введите никнейм, прежде чем начать.',
      );

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
      // Сохраняем исходную логику подключения.
      const progress = await ensurePlayerSession(nickname);

      GameState.getInstance().setProgress(progress);

      // После успешной инициализации запускаем переход.
      this.startGameTransition();
    } catch (error) {
      console.error(
        '[NicknameScene] Не удалось инициализировать сессию игрока:',
        error,
      );

      this.statusText?.setText(
        'Не получилось подключиться к серверу, но можно играть офлайн.',
      );

      if (this.submitButton !== null) {
        this.submitButton.disabled = false;
        this.submitButton.textContent = 'НАЧАТЬ ▸';
      }

      if (this.nicknameInput !== null) {
        this.nicknameInput.disabled = false;
      }
    }
  }

  /**
   * Плавный переход в хаб.
   *
   * Сначала затемняем меню, затем показываем
   * приветственную надпись на чёрном фоне.
   */
  private startGameTransition(): void {
    // DOM-форма не является частью Canvas,
    // поэтому удаляем её перед затемнением.
    this.destroyDomForm();

    // Затемняем камеру.
    this.cameras.main.fadeOut(
      MENU_FADE_OUT_MS,
      0,
      0,
      0,
    );

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        // Чёрная подложка скрывает старое меню.
        const overlay = this.add
          .rectangle(
            0,
            0,
            GAME_WIDTH,
            GAME_HEIGHT,
            MENU_TRANSITION_COLOR,
          )
          .setOrigin(0, 0)
          .setDepth(1000);

        // Надпись всегда находится поверх подложки.
        const welcomeText = this.add
          .text(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            'Твой путь начинается...',
            {
              fontFamily: 'monospace',
              fontSize: `${MENU_WELCOME_FONT_SIZE_PX}px`,
              color: MENU_WELCOME_TEXT_COLOR,
              fontStyle: 'bold',
            },
          )
          .setOrigin(0.5, 0.5)
          .setAlpha(MENU_WELCOME_INITIAL_ALPHA)
          .setDepth(1001);

        // Сбрасываем затемнение камеры, чтобы увидеть
        // чёрную подложку и приветственную надпись.
        this.cameras.main.resetFX();

    // Плавно показываем приветственную надпись.
    this.tweens.add({
      targets: welcomeText,
      alpha: 1,
      duration: MENU_WELCOME_FADE_MS,
      ease: 'Linear',

      onComplete: () => {
        // После появления надписи ждём немного времени.
        this.tweens.add({
          targets: welcomeText,
          alpha: 1,
          duration: MENU_WELCOME_DURATION_MS,

          onComplete: () => {
            console.log('[ONWAY] Переход в HubScene');

            this.scene.start('HubScene');
          },
        });
      },
    });

        // Подложка остаётся до переключения сцены.
        // Phaser автоматически удалит её вместе с NicknameScene.
        void overlay;
      },
    );
  }

  /**
   * Удаляет HTML-форму и связанные стили.
   */
  private destroyDomForm(): void {
    this.domContainer?.remove();
    this.styleElement?.remove();

    this.domContainer = null;
    this.styleElement = null;
    this.nicknameInput = null;
    this.submitButton = null;
  }
}