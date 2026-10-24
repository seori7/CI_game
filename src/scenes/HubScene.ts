import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import {
  COLOR_FLOOR,
  COLOR_TEXT_PRIMARY,
  COLOR_WALL,
  GAME_WIDTH,
  HUB_ROOM_HEIGHT_TILES,
  HUB_ROOM_WIDTH_TILES,
  TILE_SIZE,
} from '../config/constants';
import { GameState } from '../state/GameState';
import { recordMinigameResult, saveProgress } from '../api/progressService';
import type { MinigameResult } from '../types/MinigameResult';
import type { MinigameType } from '../types/PlayerProgress';

/** Толщина стены комнаты в пикселях (используется и для рисования, и для коллайдеров). */
const WALL_THICKNESS = TILE_SIZE;

/** Данные о событии завершения диалога, приходящие из DialogueScene. */
interface DialogueCompletePayload {
  npcId: string;
  minigameToLaunch: MinigameType | null;
}

/** Сопоставление типа мини-игры с ключом соответствующей сцены Phaser. */
const MINIGAME_SCENE_BY_TYPE: Record<MinigameType, string> = {
  programmer: 'ProgrammerMinigameScene',
  builder: 'BuilderMinigameScene',
  medic: 'MedicMinigameScene',
};

/**
 * Главная сцена-хаб: комната, по которой игрок перемещается и может
 * подойти к одному из трёх NPC, чтобы начать диалог (а из диалога —
 * попасть в соответствующую мини-игру). Хаб никогда не останавливается
 * полностью — во время диалога/мини-игры он приостанавливается
 * (scene.pause) и затем возобновляется (scene.resume), сохраняя своё
 * состояние (позицию игрока и т.д.).
 */
export class HubScene extends Phaser.Scene {
  private player!: Player;
  private npcList: NPC[] = [];
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private nearbyNpc: NPC | null = null;
  private hintText!: Phaser.GameObjects.Text;

  /** Обработчик события 'dialogue-complete', сохранённый для корректной отписки. */
  private readonly onDialogueComplete = (payload: DialogueCompletePayload): void => {
    this.handleDialogueComplete(payload);
  };

  /** Обработчик события 'minigame-complete', сохранённый для корректной отписки. */
  private readonly onMinigameComplete = (result: MinigameResult): void => {
    void this.handleMinigameComplete(result);
  };

  public constructor() {
    super('HubScene');
  }

  /** Жизненный цикл Phaser: построение комнаты, игрока, NPC и обработчиков событий. */
  public create(): void {
    this.buildRoom();
    this.spawnPlayerAndNpcs();

    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.hintText = this.add.text(GAME_WIDTH / 2, 20, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: `#${COLOR_TEXT_PRIMARY.toString(16)}`,
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 },
    });
    this.hintText.setOrigin(0.5, 0);
    this.hintText.setScrollFactor(0);
    this.updateHintText();

    // Глобальные события (game.events), т.к. DialogueScene/мини-игры — это
    // отдельные сцены, не имеющие прямого доступа к this.events HubScene.
    this.game.events.on('dialogue-complete', this.onDialogueComplete);
    this.game.events.on('minigame-complete', this.onMinigameComplete);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.detachGlobalListeners());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.detachGlobalListeners());
  }

  /** Отписывается от глобальных событий, чтобы избежать утечек и двойных обработчиков. */
  private detachGlobalListeners(): void {
    this.game.events.off('dialogue-complete', this.onDialogueComplete);
    this.game.events.off('minigame-complete', this.onMinigameComplete);
  }

  /** Рисует пол и стены комнаты через Graphics и расставляет статичные коллайдеры стен. */
  private buildRoom(): void {
    const roomWidth = HUB_ROOM_WIDTH_TILES * TILE_SIZE;
    const roomHeight = HUB_ROOM_HEIGHT_TILES * TILE_SIZE;

    const graphics = this.add.graphics();
    graphics.fillStyle(COLOR_FLOOR, 1);
    graphics.fillRect(0, 0, roomWidth, roomHeight);

    graphics.fillStyle(COLOR_WALL, 1);
    graphics.fillRect(0, 0, roomWidth, WALL_THICKNESS); // верхняя стена
    graphics.fillRect(0, roomHeight - WALL_THICKNESS, roomWidth, WALL_THICKNESS); // нижняя стена
    graphics.fillRect(0, 0, WALL_THICKNESS, roomHeight); // левая стена
    graphics.fillRect(roomWidth - WALL_THICKNESS, 0, WALL_THICKNESS, roomHeight); // правая стена

    const walls = this.physics.add.staticGroup();
    walls.add(
      this.add.rectangle(roomWidth / 2, WALL_THICKNESS / 2, roomWidth, WALL_THICKNESS).setVisible(false),
    );
    walls.add(
      this.add
        .rectangle(roomWidth / 2, roomHeight - WALL_THICKNESS / 2, roomWidth, WALL_THICKNESS)
        .setVisible(false),
    );
    walls.add(
      this.add.rectangle(WALL_THICKNESS / 2, roomHeight / 2, WALL_THICKNESS, roomHeight).setVisible(false),
    );
    walls.add(
      this.add
        .rectangle(roomWidth - WALL_THICKNESS / 2, roomHeight / 2, WALL_THICKNESS, roomHeight)
        .setVisible(false),
    );

    this.physics.world.setBounds(
      WALL_THICKNESS,
      WALL_THICKNESS,
      roomWidth - WALL_THICKNESS * 2,
      roomHeight - WALL_THICKNESS * 2,
    );

    this.cameras.main.setBounds(0, 0, roomWidth, roomHeight);
  }

  /** Создаёт игрока в нижней части комнаты и трёх NPC по фиксированным координатам в углах. */
  private spawnPlayerAndNpcs(): void {
    const roomWidth = HUB_ROOM_WIDTH_TILES * TILE_SIZE;
    const roomHeight = HUB_ROOM_HEIGHT_TILES * TILE_SIZE;

    this.player = new Player(this, roomWidth / 2, roomHeight - TILE_SIZE * 2);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.npcList = [
      new NPC(this, TILE_SIZE * 2.5, TILE_SIZE * 2.5, 'max', 'npc_max', 'max'),
      new NPC(this, roomWidth - TILE_SIZE * 2.5, TILE_SIZE * 2.5, 'nastya', 'npc_nastya', 'nastya'),
      new NPC(this, roomWidth - TILE_SIZE * 2.5, roomHeight - TILE_SIZE * 2.5, 'lena', 'npc_lena', 'lena'),
    ];

    for (const npc of this.npcList) {
      this.physics.add.collider(this.player, npc);
    }
  }

  /** Жизненный цикл Phaser: обновление движения игрока и проверка близости к NPC. */
  public override update(): void {
    this.player.update(this.cursorKeys);
    this.updateNearbyNpc();

    if (this.nearbyNpc !== null && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.startDialogue(this.nearbyNpc);
    }
  }

  /** Определяет, находится ли игрок рядом с каким-либо NPC, и обновляет подсказки. */
  private updateNearbyNpc(): void {
    let foundNpc: NPC | null = null;

    for (const npc of this.npcList) {
      const inRange = npc.isPlayerInRange(this.player);
      npc.setPromptVisible(inRange);
      if (inRange) {
        foundNpc = npc;
      }
    }

    this.nearbyNpc = foundNpc;
    this.updateHintText();
  }

  /** Обновляет текст подсказки в верхней части экрана. */
  private updateHintText(): void {
    if (this.nearbyNpc !== null) {
      this.hintText.setText(`Нажми E, чтобы поговорить с ${this.nearbyNpc.npcId}`);
    } else {
      this.hintText.setText('Подойди к персонажу и нажми E, чтобы начать диалог');
    }
  }

  /**
   * Запускает диалог с указанным NPC: приостанавливает хаб (не останавливает,
   * чтобы сохранить состояние) и запускает DialogueScene поверх.
   * @param npc NPC, с которым начинается диалог
   */
  private startDialogue(npc: NPC): void {
    this.scene.pause();
    this.scene.launch('DialogueScene', {
      npcId: npc.npcId,
      dialogueStoryPath: npc.dialogueStoryPath,
    });
  }

  /**
   * Обрабатывает завершение диалога: если ink-сценарий запросил мини-игру —
   * запускает соответствующую сцену, иначе просто возобновляет хаб.
   * @param payload данные события 'dialogue-complete'
   */
  private handleDialogueComplete(payload: DialogueCompletePayload): void {
    if (payload.minigameToLaunch !== null) {
      const sceneKey = MINIGAME_SCENE_BY_TYPE[payload.minigameToLaunch];
      this.scene.launch(sceneKey);
    } else {
      this.scene.resume();
    }
  }

  /**
   * Обрабатывает завершение мини-игры: отправляет результат в бэкенд,
   * обновляет и сохраняет прогресс игрока, затем возобновляет хаб.
   * @param result результат прохождения мини-игры
   */
  private async handleMinigameComplete(result: MinigameResult): Promise<void> {
    await recordMinigameResult(result);

    const gameState = GameState.getInstance();
    const progress = gameState.getProgress();

    if (!progress.completedMinigames.includes(result.minigameType)) {
      progress.completedMinigames = [...progress.completedMinigames, result.minigameType];
    }

    const previousAverage = progress.stressProfile[result.minigameType] ?? 0;
    const timesPlayed = progress.completedMinigames.filter(
      (type) => type === result.minigameType,
    ).length;
    progress.stressProfile = {
      ...progress.stressProfile,
      [result.minigameType]:
        timesPlayed <= 1 ? result.stressLevel : (previousAverage + result.stressLevel) / 2,
    };
    progress.currentChapter += 1;

    gameState.setProgress(progress);
    await saveProgress(progress);

    this.scene.resume();
  }
}
