import type { MinigameType } from './PlayerProgress';

/**
 * Один вариант выбора игрока в диалоге.
 */
export interface DialogueChoice {
  /** Текст, отображаемый на кнопке выбора. */
  text: string;
  /** Индекс варианта в массиве currentChoices инстанса ink-истории. */
  index: number;
}

/**
 * Снимок состояния диалога после очередного вызова continueStory().
 * DialogueScene использует это состояние, чтобы отрисовать текст и кнопки.
 */
export interface DialogueState {
  /** Накопленный текст реплики(й) до следующей точки выбора. */
  currentText: string;
  /** Доступные варианты ответа (пустой массив, если выбора нет). */
  choices: DialogueChoice[];
  /** Есть ли ещё текст, который можно "продолжить" без выбора. */
  canContinue: boolean;
  /** Закончилась ли история (нет ни продолжения, ни выборов). */
  isEnded: boolean;
  /** Мини-игра, которую нужно запустить (читается из ink-переменной launch_minigame). */
  minigameToLaunch: MinigameType | null;
}
