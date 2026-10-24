import type { MinigameType } from './PlayerProgress';

/**
 * Результат прохождения одной попытки мини-игры. Используется и для
 * записи в коллекцию PocketBase "minigame_results", и для обновления
 * сквозного профиля стресса игрока.
 */
export interface MinigameResult {
  /** Тип пройденной мини-игры. */
  minigameType: MinigameType;
  /** Итоговый счёт (чем больше, тем лучше). */
  score: number;
  /** Количество попыток, потребовавшихся для завершения. */
  attempts: number;
  /** Итоговое значение полоски стресса (0..STRESS_BAR_MAX) на момент завершения. */
  stressLevel: number;
  /** Сложность, с которой проходилась мини-игра. */
  difficulty: 'easy' | 'hard';
}
