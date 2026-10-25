import Phaser from 'phaser';

import {
  GAME_WIDTH,
  GAME_HEIGHT,

  CRT_CASE_COLOR,
  CRT_BEZEL_COLOR,
  CRT_SCREEN_COLOR,
  CRT_GREEN_DIM,
  CRT_WHITE,

  CRT_CASE_X,
  CRT_CASE_Y,
  CRT_CASE_WIDTH,
  CRT_CASE_HEIGHT,

  CRT_SCREEN_X,
  CRT_SCREEN_Y,
  CRT_SCREEN_WIDTH,
  CRT_SCREEN_HEIGHT,

  CRT_CASE_RADIUS,
  CRT_SCREEN_RADIUS,

  CRT_SCANLINE_HEIGHT,
  CRT_SCANLINE_SPACING,
  CRT_SCANLINE_ALPHA,

  CRT_DECORATION_COUNT,
  CRT_PIXEL_SIZE,
  CRT_PIXEL_PULSE_MS,

  CRT_TITLE_Y,
  CRT_TITLE_FONT_SIZE,
  CRT_SUBTITLE_Y,

  CRT_FORM_OFFSET_Y,
  CRT_FORM_WIDTH,

  CRT_INPUT_BACKGROUND,
  CRT_CSS_GREEN,
  CRT_CSS_GLOW,
  CRT_BUTTON_BACKGROUND,
  CRT_BUTTON_HOVER,
  CRT_BUTTON_ANIMATION_MS,
  CRT_FORM_FONT_SIZE,
  CRT_CURSOR_BLINK_MS,

  MENU_FADE_OUT_MS,
  MENU_WELCOME_DURATION_MS,
  MENU_TRANSITION_COLOR,
  MENU_WELCOME_FONT_SIZE_PX,
  MENU_WELCOME_TEXT_COLOR,
  MENU_WELCOME_INITIAL_ALPHA,
  MENU_WELCOME_FADE_MS,

} from '../config/constants';

import { ensurePlayerSession } from '../api/progressService';
import { GameState } from '../state/GameState';

/**
 * Длина никнейма ограничена размером поля nickname в PocketBase.
 */
const NICKNAME_MAX_LENGTH = 16;

/**
 * CSS терминального интерфейса.
 *
 * HTML используется только для ввода текста,
 * поскольку Phaser не поддерживает нативные input.
 */
function buildTerminalCss(): string {
  return `
.onway-form {
  position: fixed;

  left: 50%;
  top: calc(50% + ${CRT_FORM_OFFSET_Y}px);

  transform: translate(-50%, -50%);

  width: ${CRT_FORM_WIDTH}px;

  display: flex;
  flex-direction: column;
  align-items: center;

  gap: 16px;

  z-index: 10;

  font-family: 'comic-sans-ms-pixel', monospace;

  color: ${CRT_CSS_GREEN};
}

.onway-label {
  font-size: ${CRT_FORM_FONT_SIZE}px;
  text-shadow: 0 0 8px ${CRT_CSS_GLOW};
}

.onway-input {
  width: 100%;
  padding: 14px 16px;

  background: ${CRT_INPUT_BACKGROUND};

  border: 2px solid #123d22;
  border-radius: 0;

  color: #e4f5e6;

  font-family: 'comic-sans-ms-pixel', monospace;
  font-size: ${CRT_FORM_FONT_SIZE}px;

  outline: none;
  box-sizing: border-box;

  box-shadow: none;

  caret-color: #e4f5e6;
}

.onway-input::placeholder {
  color: #588366;
}

.onway-input:focus {
  border-color: #e4f5e6;
  outline: 2px solid #e4f5e6;
  outline-offset: 2px;
}

.onway-button {
  width: 100%;
  padding: 14px;

  background: ${CRT_BUTTON_BACKGROUND};
  color: #d8f4df;

  border: 2px solid transparent;
  border-radius: 0;

  font-family: 'comic-sans-ms-pixel', monospace;
  font-size: ${CRT_FORM_FONT_SIZE}px;

  cursor: pointer;

  box-shadow: none;

  transition:
    background ${CRT_BUTTON_ANIMATION_MS}ms linear,
    border-color ${CRT_BUTTON_ANIMATION_MS}ms linear;
}

.onway-button:hover:not(:disabled),
.onway-button:focus-visible {
  background: ${CRT_BUTTON_HOVER};
  border-color: #e4f5e6;

  outline: 2px solid #e4f5e6;
  outline-offset: 3px;
}

.onway-button:active:not(:disabled) {
  background: #1e5732;
  transform: translateY(2px);
}

.onway-button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.onway-hint {
  font-size: 12px;
  color: #176b38;
}

/* Мигающий курсор терминала. */
.onway-cursor {
  display: inline-block;
  animation: onway-blink ${CRT_CURSOR_BLINK_MS}ms steps(1) infinite;
}

@keyframes onway-blink {
  50% {
    opacity: 0;
  }
}
`;
}

/**
 * Главное меню ONWAY в стиле старого компьютера.
 *
 * Phaser рисует монитор, пиксели и эффекты.
 * HTML отвечает за ввод никнейма.
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

    public create(): void {
      this.buildMonitor();
      this.buildDecorations();

      // Сначала загружаем шрифт, чтобы Phaser
      // не создал текст запасным monospace.
      void document.fonts.load('18px "comic-sans-ms-pixel"').then(() => {
        if (!this.sys.isActive()) {
          return;
        }

        this.buildTitle();
        this.buildScanlines();
      });

      this.createDomForm();

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
   * Рисуем корпус старого компьютера.
   */
  private buildMonitor(): void {

    // Бежевый фон корпуса.
    this.add.rectangle(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT,
      CRT_CASE_COLOR,
    ).setOrigin(0, 0);

    const graphics = this.add.graphics();

    // Корпус монитора.
    graphics.fillStyle(CRT_CASE_COLOR);

    graphics.fillRoundedRect(
      CRT_CASE_X,
      CRT_CASE_Y,
      CRT_CASE_WIDTH,
      CRT_CASE_HEIGHT,
      CRT_CASE_RADIUS,
    );

    // Тёмная рамка.
    graphics.fillStyle(CRT_BEZEL_COLOR);

    graphics.fillRoundedRect(
      CRT_SCREEN_X - 5,
      CRT_SCREEN_Y - 5,
      CRT_SCREEN_WIDTH + 10,
      CRT_SCREEN_HEIGHT + 10,
      CRT_SCREEN_RADIUS,
    );

    // Внутренний экран.
    graphics.fillStyle(CRT_SCREEN_COLOR);

    graphics.fillRoundedRect(
      CRT_SCREEN_X,
      CRT_SCREEN_Y,
      CRT_SCREEN_WIDTH,
      CRT_SCREEN_HEIGHT,
      CRT_SCREEN_RADIUS,
    );

    // Верхняя подпись корпуса.
    this.add.text(
      GAME_WIDTH - 180,
      22,
      'ONWAY // 01',
      {
        fontFamily: 'comic-sans-ms-pixel, monospace',
        fontSize: '14px',
        color: '#4b493f',
      },
    );
  }

  /**
   * Создаём декоративные зелёные пиксели.
   * Они расположены внутри экрана и медленно мерцают.
   */
  private buildDecorations(): void {

    for (let index = 0; index < CRT_DECORATION_COUNT; index++) {

      const x = Phaser.Math.Between(
        CRT_SCREEN_X + CRT_PIXEL_SIZE,
        CRT_SCREEN_X + CRT_SCREEN_WIDTH - CRT_PIXEL_SIZE,
      );

      const y = Phaser.Math.Between(
        CRT_SCREEN_Y + CRT_PIXEL_SIZE,
        CRT_SCREEN_Y + CRT_SCREEN_HEIGHT - CRT_PIXEL_SIZE,
      );

      const pixel = this.add.rectangle(
        x,
        y,
        CRT_PIXEL_SIZE,
        CRT_PIXEL_SIZE,
        CRT_GREEN_DIM,
      );

      pixel.setAlpha(Phaser.Math.FloatBetween(0.08, 0.22));

      this.tweens.add({
        targets: pixel,
        alpha: Phaser.Math.FloatBetween(0.04, 0.25),

        duration: CRT_PIXEL_PULSE_MS,

        yoyo: true,
        repeat: -1,

        delay: Phaser.Math.Between(0, CRT_PIXEL_PULSE_MS),
      });
    }
  }

  /**
   * Создаём логотип и подписи.
   */
  private buildTitle(): void {

    const title = this.add.text(
      GAME_WIDTH / 2,
      CRT_TITLE_Y,
      'ONWAY',
      {
        fontFamily: 'comic-sans-ms-pixel, monospace',
        fontSize: `${CRT_TITLE_FONT_SIZE}px`,
        fontStyle: 'bold',
        color: CRT_WHITE,
      },
    );

    title.setOrigin(0.5);

    // Мягкое свечение люминофора старого CRT-монитора.
    // Небольшой радиус сохраняет чёткость пиксельного текста.
    title.setShadow(
      0,          // Смещение по X
      0,          // Смещение по Y
      '#78dba0',  // Приглушённый зелёный
      5,          // Радиус размытия
      true,       // Свечение применяется к заливке текста
      true,       // Свечение применяется к обводке
    );
    // Очень слабая пульсация логотипа.
    this.tweens.add({
      targets: title,

      alpha: 0.88,

      duration: CRT_PIXEL_PULSE_MS,

      yoyo: true,
      repeat: -1,
    });

    this.add.text(
      GAME_WIDTH / 2,
      CRT_SUBTITLE_Y,
      'ТВОЙ ПУТЬ НАЧИНАЕТСЯ ЗДЕСЬ',
      {
        fontFamily: 'comic-sans-ms-pixel, monospace',
        fontSize: '18px',
        color: '#39ff88',
      },
    ).setOrigin(0.5);

    this.statusText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 65,
      '',
      {
        fontFamily: 'comic-sans-ms-pixel, monospace',
        fontSize: '14px',
        color: '#ff7777',
      },
    ).setOrigin(0.5);
  }

  /**
   * Горизонтальные полосы старого монитора.
   *
   * Полосы рисуются поверх остальных элементов Phaser,
   * но не перехватывают ввод мыши.
   */
  private buildScanlines(): void {

    const graphics = this.add.graphics();

    graphics.fillStyle(
      CRT_SCREEN_COLOR,
      CRT_SCANLINE_ALPHA,
    );

    for (
      let y = CRT_SCREEN_Y;
      y < CRT_SCREEN_Y + CRT_SCREEN_HEIGHT;
      y += CRT_SCANLINE_SPACING
    ) {
      graphics.fillRect(
        CRT_SCREEN_X,
        y,
        CRT_SCREEN_WIDTH,
        CRT_SCANLINE_HEIGHT,
      );
    }
  }

  /**
   * HTML-форма ввода никнейма.
   */
  private createDomForm(): void {

    const style = document.createElement('style');

    style.textContent = buildTerminalCss();
    document.head.appendChild(style);

    const form = document.createElement('div');
    form.className = 'onway-form';

    const label = document.createElement('div');
    label.className = 'onway-label';
    label.textContent = '> ВВЕДИ СВОЁ ИМЯ:';

    const input = document.createElement('input');

    input.type = 'text';
    input.className = 'onway-input';
    input.placeholder = 'PLAYER_';
    input.maxLength = NICKNAME_MAX_LENGTH;
    input.autocomplete = 'off';

    const button = document.createElement('button');

    button.className = 'onway-button';
    button.textContent = '▶ НАЧАТЬ ПУТЬ';

    const hint = document.createElement('div');
    hint.className = 'onway-hint';
    hint.textContent = 'ENTER — ПОДТВЕРДИТЬ';

    const handleSubmit = (): void => {
      void this.handleStart();
    };

    button.addEventListener('click', handleSubmit);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleSubmit();
      }
    });

    form.append(label, input, button, hint);

    document.body.appendChild(form);

    input.focus();

    this.styleElement = style;
    this.domContainer = form;
    this.nicknameInput = input;
    this.submitButton = button;
  }

  /**
   * Запуск игры.
   *
   * Подключение к PocketBase оставлено без изменений.
   */
  private async handleStart(): Promise<void> {

    const nickname = (this.nicknameInput?.value ?? '').trim();

    if (nickname.length === 0) {
      this.statusText?.setText(
        'ВВЕДИ ИМЯ, ЧТОБЫ ПРОДОЛЖИТЬ',
      );
      return;
    }

    if (this.submitButton !== null) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'INITIALIZING...';
    }

    if (this.nicknameInput !== null) {
      this.nicknameInput.disabled = true;
    }

    try {
      const progress = await ensurePlayerSession(nickname);

      GameState.getInstance().setProgress(progress);

      this.startGameTransition();

    } catch (error) {

      console.error(
        '[NicknameScene] Ошибка инициализации:',
        error,
      );

      this.statusText?.setText(
        'ОШИБКА ПОДКЛЮЧЕНИЯ',
      );

      if (this.submitButton !== null) {
        this.submitButton.disabled = false;
        this.submitButton.textContent = '▶ НАЧАТЬ ПУТЬ';
      }

      if (this.nicknameInput !== null) {
        this.nicknameInput.disabled = false;
      }
    }
  }

  /**
   * Переход из меню в игровой хаб.
   */
  private startGameTransition(): void {

    this.destroyDomForm();

    this.cameras.main.fadeOut(
      MENU_FADE_OUT_MS,
      0,
      0,
      0,
    );

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {

        this.add.rectangle(
          0,
          0,
          GAME_WIDTH,
          GAME_HEIGHT,
          MENU_TRANSITION_COLOR,
        )
        .setOrigin(0, 0)
        .setDepth(1000);

        const welcomeText = this.add.text(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2,
          'ТВОЙ ПУТЬ НАЧИНАЕТСЯ...',
          {
            fontFamily: 'comic-sans-ms-pixel, monospace',
            fontSize: `${MENU_WELCOME_FONT_SIZE_PX}px`,
            color: MENU_WELCOME_TEXT_COLOR,
          },
        )
        .setOrigin(0.5)
        .setAlpha(MENU_WELCOME_INITIAL_ALPHA)
        .setDepth(1001);

        this.cameras.main.resetFX();

        this.tweens.add({
          targets: welcomeText,
          alpha: 1,
          duration: MENU_WELCOME_FADE_MS,

          onComplete: () => {
            this.time.delayedCall(
              MENU_WELCOME_DURATION_MS,
              () => {
                this.scene.start('HubScene');
              },
            );
          },
        });
      },
    );
  }

  /**
   * Удаляем HTML-форму после выхода из меню.
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