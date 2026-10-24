import { createDefaultProgress, type PlayerProgress } from '../types/PlayerProgress';

/**
 * Глобальный синглтон состояния игровой сессии.
 * Хранит никнейм игрока и его текущий прогресс, чтобы любая сцена Phaser
 * могла получить доступ к этим данным без передачи через конструкторы
 * сцен (Phaser пересоздаёт сцены при перезапуске, поэтому данные нужно
 * хранить вне жизненного цикла конкретной сцены).
 */
export class GameState {
  private static instance: GameState | null = null;

  /** Никнейм, введённый игроком на экране NicknameScene. */
  public nickname = '';

  /** Текущий прогресс игрока. До вызова setProgress() содержит заглушку. */
  public currentProgress: PlayerProgress = createDefaultProgress('unknown', '');

  /** Приватный конструктор — используйте GameState.getInstance(). */
  private constructor() {}

  /**
   * Возвращает единственный экземпляр GameState, создавая его при первом вызове.
   */
  public static getInstance(): GameState {
    if (GameState.instance === null) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  /**
   * Обновляет текущий прогресс игрока и, попутно, синхронизирует никнейм.
   * @param progress новое состояние прогресса
   */
  public setProgress(progress: PlayerProgress): void {
    this.currentProgress = progress;
    this.nickname = progress.nickname;
  }

  /**
   * Возвращает текущий прогресс игрока.
   */
  public getProgress(): PlayerProgress {
    return this.currentProgress;
  }
}
