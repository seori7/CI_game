/**
 * Тип мини-игры, доступной в игре. Используется как ключ профиля стресса
 * и как идентификатор для запуска соответствующей сцены мини-игры.
 */
export type MinigameType = 'programmer' | 'builder' | 'medic';

/**
 * Полное состояние прогресса игрока, которое синхронизируется с PocketBase
 * и кэшируется локально в localStorage как резервная копия.
 */
export interface PlayerProgress {
  /** Уникальный идентификатор устройства/аккаунта (id пользователя PocketBase). */
  deviceId: string;
  /** Никнейм, введённый игроком в NicknameScene. */
  nickname: string;
  /** Номер текущей главы сюжета (0 — пролог/хаб без прогресса). */
  currentChapter: number;
  /** Список уже пройденных мини-игр (по типу). */
  completedMinigames: MinigameType[];
  /** Средний показатель стресса, накопленный по каждому типу мини-игры. */
  stressProfile: Record<MinigameType, number>;
}

/**
 * Создаёт объект прогресса "по умолчанию" для только что созданного игрока.
 * @param deviceId идентификатор пользователя PocketBase
 * @param nickname никнейм, введённый игроком
 */
export function createDefaultProgress(deviceId: string, nickname: string): PlayerProgress {
  return {
    deviceId,
    nickname,
    currentChapter: 0,
    completedMinigames: [],
    stressProfile: {
      programmer: 0,
      builder: 0,
      medic: 0,
    },
  };
}
