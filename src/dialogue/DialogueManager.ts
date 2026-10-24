import { Story } from 'inkjs';
import type { DialogueChoice, DialogueState } from '../types/DialogueTypes';
import type { MinigameType } from '../types/PlayerProgress';

/** Имя переменной в ink-истории, через которую сценарий запрашивает мини-игру. */
const LAUNCH_MINIGAME_VARIABLE = 'launch_minigame';

/** Множество валидных значений переменной launch_minigame для безопасного приведения типов. */
const VALID_MINIGAME_TYPES: ReadonlySet<string> = new Set<MinigameType>([
  'programmer',
  'builder',
  'medic',
]);

/**
 * Обёртка над inkjs.Story, упрощающая работу со сценами Phaser:
 * прячет детали API inkjs (Continue/ChooseChoiceIndex/variablesState) за
 * простым методом continueStory(), возвращающим готовый DialogueState.
 */
export class DialogueManager {
  private readonly story: Story;

  /**
   * @param storyJson скомпилированный JSON ink-истории (формат Ink Runtime JSON v21)
   */
  public constructor(storyJson: object) {
    this.story = new Story(storyJson);
  }

  /**
   * Продвигает историю вперёд: вызывает story.Continue() пока это возможно,
   * накапливая текст, затем считывает доступные варианты выбора и проверяет
   * ink-переменную launch_minigame на предмет запроса мини-игры.
   */
  public continueStory(): DialogueState {
    let currentText = '';

    while (this.story.canContinue) {
      const line = this.story.Continue();
      if (line !== null && line !== undefined) {
        currentText += line;
      }
    }

    const choices: DialogueChoice[] = this.story.currentChoices.map((choice) => ({
      text: choice.text,
      index: choice.index,
    }));

    const minigameToLaunch = this.consumeMinigameVariable();
    const isEnded = !this.story.canContinue && choices.length === 0;

    return {
      currentText: currentText.trim(),
      choices,
      canContinue: this.story.canContinue,
      isEnded,
      minigameToLaunch,
    };
  }

  /**
   * Делает выбор игрока по индексу варианта ответа.
   * @param index индекс выбранного варианта из DialogueState.choices
   */
  public choose(index: number): void {
    this.story.ChooseChoiceIndex(index);
  }

  /**
   * Читает ink-переменную launch_minigame; если она установлена в одно из
   * валидных значений — возвращает его и сбрасывает переменную в null,
   * чтобы одно и то же срабатывание не запускало мини-игру повторно.
   */
  private consumeMinigameVariable(): MinigameType | null {
    const rawValue = this.story.variablesState[LAUNCH_MINIGAME_VARIABLE];
    if (typeof rawValue === 'string' && VALID_MINIGAME_TYPES.has(rawValue)) {
      this.story.variablesState[LAUNCH_MINIGAME_VARIABLE] = null;
      return rawValue as MinigameType;
    }
    return null;
  }
}
