import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import {
  COLOR_FLOOR,
  COLOR_TEXT_PRIMARY,
  COLOR_WALL,
  GAME_HEIGHT,
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
 * попасть в соответствующую мини-игру).
 *
 * ВАЖНО: HubScene сама никогда не ставится на паузу через scene.pause().
 * Раньше так и было сделано, но связка "пауза -> наложенная сцена диалога
 * -> наложенная сцена мини-игры -> асинхронный resume()" в Phaser 4
 * иногда приводила к тому, что после возврата в хаб update() не оживал
 * как надо, и игрок не мог двигаться. Вместо этого используется свой
 * явный флаг controlsEnabled: HubScene продолжает тикать всегда, но пока
 * флаг выключен, игрок принудительно останавливается и не реагирует на
 * клавиши, а проверка близости NPC не выполняется. Это полностью
 * предсказуемо и не зависит от внутренней механики Scene Manager.
 *
 * Комната (640x384 px) меньше игрового канваса (960x540 px), поэтому вся
 * геометрия рисуется со смещением roomOffsetX/roomOffsetY, чтобы оказаться
 * по центру экрана. Камера при этом не скроллится — комната целиком
 * помещается в кадр.
 */
export class HubScene extends Phaser.Scene {
  private player!: Player;
  private npcList: NPC[] = [];
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private nearbyNpc: NPC | null = null;
  private hintText!: Phaser.GameObjects.Text;

  /** Смещение комнаты по X относительно канваса (для центрирования). */
  private roomOffsetX = 0;
  /** Смещение комнаты по Y относительно канваса (для центрирования). */
  private roomOffsetY = 0;

  /**
   * Включено ли сейчас управление игроком. Выключается на время диалога
   * и мини-игры, включается обратно при возврате в хаб. Это единственный
   * источник истины для "можно ли сейчас ходить" — НЕ полагаемся на
   * Phaser scene.isPaused()/isActive() для этой цели.
   */
  private controlsEnabled = true;

  /** Обработчик события 'dialogue-complete', сохранённый для корректной отписки. */
  private readonly onDialogueComplete = (payload: DialogueCompletePayload): void => {
    this.handleDialogueComplete(payload);
  };

  /** Обработчик события 'minigame-complete', сохранённый для корректной отписки. */
  private readonly onMinigameComplete = (result: MinigameResult): void => {
    void this.handleMinigameComplete(result);
  };

  /** Обработчик события 'minigame-exit' (досрочный выход игрока без результата). */
  private readonly onMinigameExit = (): void => {
    this.handleMinigameExit();
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
    this.game.events.on('minigame-exit', this.onMinigameExit);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.detachGlobalListeners());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.detachGlobalListeners());
  }

  /** Отписывается от глобальных событий, чтобы избежать утечек и двойных обработчиков. */
  private detachGlobalListeners(): void {
    this.game.events.off('dialogue-complete', this.onDialogueComplete);
    this.game.events.off('minigame-complete', this.onMinigameComplete);
    this.game.events.off('minigame-exit', this.onMinigameExit);
  }

  /**
   * Рисует пол и стены комнаты через Graphics и расставляет статичные
   * коллайдеры стен. Вся геометрия смещена на roomOffsetX/roomOffsetY,
   * чтобы комната оказалась по центру канваса GAME_WIDTH x GAME_HEIGHT.
   */
  private buildRoom(): void {
    const roomWidth = HUB_ROOM_WIDTH_TILES * TILE_SIZE;
    const roomHeight = HUB_ROOM_HEIGHT_TILES * TILE_SIZE;

    this.roomOffsetX = (GAME_WIDTH - roomWidth) / 2;
    this.roomOffsetY = (GAME_HEIGHT - roomHeight) / 2;

    const graphics = this.add.graphics();
    graphics.fillStyle(COLOR_FLOOR, 1);
    graphics.fillRect(this.roomOffsetX, this.roomOffsetY, roomWidth, roomHeight);

    graphics.fillStyle(COLOR_WALL, 1);
    graphics.fillRect(this.roomOffsetX, this.roomOffsetY, roomWidth, WALL_THICKNESS); // верхняя стена
    graphics.fillRect(
      this.roomOffsetX,
      this.roomOffsetY + roomHeight - WALL_THICKNESS,
      roomWidth,
      WALL_THICKNESS,
    ); // нижняя стена
    graphics.fillRect(this.roomOffsetX, this.roomOffsetY, WALL_THICKNESS, roomHeight); // левая стена
    graphics.fillRect(
      this.roomOffsetX + roomWidth - WALL_THICKNESS,
      this.roomOffsetY,
      WALL_THICKNESS,
      roomHeight,
    ); // правая стена

    const walls = this.physics.add.staticGroup();
    walls.add(
      this.add
        .rectangle(
          this.roomOffsetX + roomWidth / 2,
          this.roomOffsetY + WALL_THICKNESS / 2,
          roomWidth,
          WALL_THICKNESS,
        )
        .setVisible(false),
    );
    walls.add(
      this.add
        .rectangle(
          this.roomOffsetX + roomWidth / 2,
          this.roomOffsetY + roomHeight - WALL_THICKNESS / 2,
          roomWidth,
          WALL_THICKNESS,
        )
        .setVisible(false),
    );
    walls.add(
      this.add
        .rectangle(
          this.roomOffsetX + WALL_THICKNESS / 2,
          this.roomOffsetY + roomHeight / 2,
          WALL_THICKNESS,
          roomHeight,
        )
        .setVisible(false),
    );
    walls.add(
      this.add
        .rectangle(
          this.roomOffsetX + roomWidth - WALL_THICKNESS / 2,
          this.roomOffsetY + roomHeight / 2,
          WALL_THICKNESS,
          roomHeight,
        )
        .setVisible(false),
    );

    this.physics.world.setBounds(
      this.roomOffsetX + WALL_THICKNESS,
      this.roomOffsetY + WALL_THICKNESS,
      roomWidth - WALL_THICKNESS * 2,
      roomHeight - WALL_THICKNESS * 2,
    );

    // Камера намеренно не скроллится: комната целиком помещается в кадр
    // GAME_WIDTH x GAME_HEIGHT, поэтому отдельных границ камеры и слежения
    // за игроком (startFollow) не требуется.
  }

  /**
   * Создаёт игрока в нижней части комнаты и трёх NPC по фиксированным
   * координатам в углах. Рома (строитель) и Юни (медик) создаются
   * неинтерактивными (isInteractive = false) — фокус текущей версии игры
   * на Масе (программист).
   */
  private spawnPlayerAndNpcs(): void {
    const roomWidth = HUB_ROOM_WIDTH_TILES * TILE_SIZE;
    const roomHeight = HUB_ROOM_HEIGHT_TILES * TILE_SIZE;

    this.player = new Player(
      this,
      this.roomOffsetX + roomWidth / 2,
      this.roomOffsetY + roomHeight - TILE_SIZE * 2,
    );

    this.npcList = [
      new NPC(
        this,
        this.roomOffsetX + TILE_SIZE * 2.5,
        this.roomOffsetY + TILE_SIZE * 2.5,
        'max',
        'npc_max',
        'max',
        true,
      ),
      new NPC(
        this,
        this.roomOffsetX + roomWidth - TILE_SIZE * 2.5,
        this.roomOffsetY + TILE_SIZE * 2.5,
        'nastya',
        'npc_nastya',
        'nastya',
        false,
      ),
      new NPC(
        this,
        this.roomOffsetX + roomWidth - TILE_SIZE * 2.5,
        this.roomOffsetY + roomHeight - TILE_SIZE * 2.5,
        'lena',
        'npc_lena',
        'lena',
        false,
      ),
    ];

    for (const npc of this.npcList) {
      this.physics.add.collider(this.player, npc);
    }
  }

  /**
   * Жизненный цикл Phaser: HubScene тикает всегда (не ставится на паузу).
   * Пока controlsEnabled === false (идёт диалог или мини-игра), игрок
   * принудительно останавливается и не реагирует на клавиши, проверка
   * близости NPC не выполняется.
   */
  public override update(): void {
    if (!this.controlsEnabled) {
      this.player.stopMovement();
      return;
    }

    this.player.update(this.cursorKeys);
    this.updateNearbyNpc();

    if (this.nearbyNpc !== null && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.startDialogue(this.nearbyNpc);
    }
  }

  /**
   * Определяет, находится ли игрок рядом с каким-либо NPC, и обновляет
   * подсказки. Неинтерактивные NPC (Рома, Юни) никогда не становятся
   * nearbyNpc — рядом с ними не показывается подсказка и не срабатывает E,
   * даже если игрок физически стоит в радиусе.
   */
  private updateNearbyNpc(): void {
    let foundNpc: NPC | null = null;

    for (const npc of this.npcList) {
      const inRange = npc.isPlayerInRange(this.player);
      npc.setPromptVisible(inRange);
      if (inRange && npc.isInteractive) {
        foundNpc = npc;
      }
    }

    this.nearbyNpc = foundNpc;
    this.updateHintText();
  }

  /** Обновляет текст подсказки в верхней части экрана, используя человекочитаемое имя NPC. */
  private updateHintText(): void {
    if (this.nearbyNpc !== null) {
      this.hintText.setText(`Нажми E, чтобы поговорить с ${this.nearbyNpc.displayName}`);
    } else {
      this.hintText.setText('Подойди к персонажу и нажми E, чтобы начать диалог');
    }
  }

  /**
   * Запускает диалог с указанным NPC: отключает управление игроком и
   * запускает DialogueScene поверх хаба (сам хаб продолжает тикать, но
   * игрок "заморожен" флагом controlsEnabled — см. update()).
   * @param npc NPC, с которым начинается диалог
   */
  private startDialogue(npc: NPC): void {
    this.controlsEnabled = false;
    this.hintText.setText('');
    this.scene.launch('DialogueScene', {
      npcId: npc.npcId,
      dialogueStoryPath: npc.dialogueStoryPath,
    });
  }

  /**
   * Обрабатывает завершение диалога: если ink-сценарий запросил мини-игру —
   * запускает соответствующую сцену (управление остаётся выключенным),
   * иначе возвращает управление игроку.
   * @param payload данные события 'dialogue-complete'
   */
  private handleDialogueComplete(payload: DialogueCompletePayload): void {
    if (payload.minigameToLaunch !== null) {
      const sceneKey = MINIGAME_SCENE_BY_TYPE[payload.minigameToLaunch];
      this.scene.launch(sceneKey);
    } else {
      this.controlsEnabled = true;
    }
  }

  /**
   * Обрабатывает завершение мини-игры: отправляет результат в бэкенд,
   * обновляет и сохраняет прогресс игрока, затем возвращает управление.
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

    this.controlsEnabled = true;
  }

  /**
   * Обрабатывает досрочный выход игрока из мини-игры (клавиша Esc/кнопка
   * "Выйти"): никакой результат не сохраняется и не отправляется на
   * бэкенд — это осознанный отказ от попытки, а не провал. Просто
   * возвращаем управление игроку.
   */
  private handleMinigameExit(): void {
    this.controlsEnabled = true;
  }
}