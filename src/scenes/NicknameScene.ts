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
} from '../config/constants';
import { MENU_BACKGROUND_PATH } from '../config/assetManifest';
import { ensurePlayerSession } from '../api/progressService';
import { GameState } from '../state/GameState';

/** Максимальная длина никнейма, который может ввести игрок. */
const NICKNAME_MAX_LENGTH = 16;

/**
 * CSS формы ввода. Стили лежат в отдельном <style>, а не в inline-атрибутах,
 * потому что псевдоклассы :hover, :focus и :disabled inline не поддерживаются.
 * Панель оформлена в пиксельном стиле: без скруглений и с жёсткой тенью.
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
  box-shadow: ${MENU_FORM_SHADOW_PX}px ${MENU_FORM_SHADOW_PX}px 0 ${MENU_CSS_SHADOW};
  font-family: monospace;
}
.pp-nickname-row {
  display: flex;
  gap: ${MENU_FORM_GAP_PX}px;
}
.pp-nickname-input {
  width: ${MENU_INPUT_WIDTH_PX}px;
  padding: ${MENU_CONTROL_PADDING_Y_PX}px ${MENU_CONTROL_PADDING_X_PX}px;
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
.pp-nickname-button {
  padding: ${MENU_CONTROL_PADDING_Y_PX}px ${MENU_CONTROL_PADDING_X_PX}px;
  font-family: monospace;
  font-size: ${MENU_CONTROL_FONT_SIZE_PX}px;
  font-weight: bold;
  color: ${MENU_CSS_TEXT_ON_ACCENT};
  background: ${MENU_CSS_ACCENT};
  border: none;
  border-radius: 0;
  cursor: pointer;
}
.pp-nickname-button:hover:not(:disabled) {
  background: ${MENU_CSS_ACCENT_HOVER};
}
.pp-nickname-button:disabled {
  opacity: ${MENU_DISABLED_OPACITY};
  cursor: wait;
}
.pp-nickname-hint {
  font-size: ${MENU_HINT_FONT_SIZE_PX}px;
  color: ${MENU_CSS_MUTED};
}
`;
}

/**
 * Сцена ввода никнейма. Phaser не имеет нативных текстовых полей, поэтому
 * поверх canvas создаётся HTML-форма с абсолютным позиционированием.
 * После подтверждения ника DOM-элементы и <style> удаляются, чтобы не
 * остаться поверх других сцен.
 */
export class NicknameScene extends Phaser.Scene {
  /** HTML-инпут для ввода ника, создаётся поверх canvas. */
  private nicknameInput: HTMLInputElement | null = null;
  /** Кнопка подтверждения ввода. */
  private submitButton: HTMLButtonElement | null = null;
  /** Корневой элемент HTML-формы (для удаления одним вызовом). */
  private domContainer: HTMLDivElement | null = null;
  /** <style> с CSS формы, удаляется вместе с формой. */
  private styleElement: HTMLStyleElement | null = null;
  /** Текст статуса/ошибки под формой. */
  private statusText: Phaser.GameObjects.Text | null = null;

  public constructor() {
    super('NicknameScene');
  }

  /** Жизненный цикл Phaser: построение UI сцены. Фон добавляется первым, чтобы оказаться под текстом. */
  public create(): void {
    this.buildBackground();
    this.buildTitle();

    this.statusText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + MENU_STATUS_OFFSET_Y, '', {
        fontFamily: 'monospace',
        fontSize: `${MENU_STATUS_FONT_SIZE_PX}px`,
        color: MENU_STATUS_COLOR,
      })
      .setOrigin(0.5, 0.5);

    this.createDomForm();

    // Удаляем HTML-форму при остановке или уничтожении сцены, чтобы она
    // гарантированно не оставалась поверх других сцен.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyDomForm());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyDomForm());
  }

  /**
   * Рисует фон экрана. Если PNG меню загружен, он растягивается на весь
   * канвас (960×540). Иначе используется сплошная заглушка.
   */
  private buildBackground(): void {
    if (MENU_BACKGROUND_PATH !== null && this.textures.exists(MENU_BACKGROUND_PATH)) {
      this.add.image(0, 0, MENU_BACKGROUND_PATH).setOrigin(0, 0);
      return;
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, MENU_FALLBACK_BG_COLOR).setOrigin(0, 0);
  }

  /** Заголовок игры и подзаголовок. Тень и обводка делают текст читаемым на любом фоне. */
  private buildTitle(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .text(centerX, centerY + MENU_TITLE_OFFSET_Y, 'ПрофПуть', {
        fontFamily: 'monospace',
        fontSize: `${MENU_TITLE_FONT_SIZE_PX}px`,
        color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
        fontStyle: 'bold',
        stroke: MENU_TITLE_STROKE_COLOR,
        strokeThickness: MENU_TITLE_STROKE_THICKNESS,
      })
      .setOrigin(0.5, 0.5)
      .setShadow(
        MENU_TITLE_SHADOW_OFFSET,
        MENU_TITLE_SHADOW_OFFSET,
        MENU_TITLE_STROKE_COLOR,
        0,
        false,
        true,
      );

    this.add
      .text(centerX, centerY + MENU_SUBTITLE_OFFSET_Y, 'Как к тебе обращаться?', {
        fontFamily: 'monospace',
        fontSize: `${MENU_SUBTITLE_FONT_SIZE_PX}px`,
        color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      })
      .setOrigin(0.5, 0.5);
  }

  /** Создаёт HTML-форму (панель, инпут, кнопка, подсказка) поверх canvas. */
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
    button.textContent = 'Начать';
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
   * Обрабатывает нажатие кнопки "Начать": валидирует ник, инициализирует
   * сессию PocketBase (или локальный fallback), сохраняет прогресс в
   * GameState и переключается в хаб.
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

  /** Удаляет HTML-форму и её стили из DOM, если они ещё существуют. */
  private destroyDomForm(): void {
    this.domContainer?.remove();
    this.styleElement?.remove();
    this.domContainer = null;
    this.styleElement = null;
    this.nicknameInput = null;
    this.submitButton = null;
  }
}