import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  STRESS_BAR_WIDTH,
  STRESS_BAR_HEIGHT,
  STRESS_BAR_MAX,
  BOSS_BOX_WIDTH,
  BOSS_BOX_HEIGHT,
  BOSS_SOUL_SPEED,
  BOSS_SOUL_RADIUS,
  BOSS_BULLET_RADIUS,
  BOSS_HIT_STRESS,
  BOSS_INVULNERABILITY_MS,
  BOSS_WAVE_BREATHER_RELIEF,
  BOSS_BONE_THICKNESS,
  BOSS_BONE_SPEED,
  BOSS_BONE_GAP_SIZE,
  BOSS_BLASTER_TELEGRAPH_MS,
  BOSS_BLASTER_BEAM_MS,
  BOSS_BLASTER_THICKNESS,
  BOSS_CAPTION_FADE_MS,
  BOSS_TOP_PANEL_WIDTH,
  BOSS_TOP_PANEL_HEIGHT,
  BOSS_TYPEWRITER_MS,
  BOSS_CODE_TYPEWRITER_MS,
  BOSS_BONE_COLOR_NORMAL,
  BOSS_BONE_COLOR_BLUE,
  BOSS_BONE_COLOR_ORANGE,
  BOSS_WORD_CHALLENGE_RELIEF,
  BOSS_AUTOPILOT_MS,
  BOSS_ARENA_TOP_ROW_HEIGHT,
  BOSS_ARENA_FOOTER_HEIGHT,
  BOSS_INVISIBLE_DURATION_MS,
  BOSS_LOOP_PATTERN_DURATION_MS,
  BOSS_SHIELD_DURATION_MS,
  BOSS_SHIELD_RING_COLOR,
  BOSS_CHEAT_DECLARE_FREEZE_MS,
  BOSS_DIALOGUE_AUTO_ADVANCE_MS,
  BOSS_DIM_OVERLAY_ALPHA,
  BOSS_DIM_FADE_MS,
  BOSS_BEAT_BREATHER_MS,
  BOSS_DODGE_PUSH_DISTANCE,
  BOSS_BULLET_MAX_AGE_MS,
  BOSS_BEAT_SAFETY_TIMEOUT_MS,
  CHEAT_DEMO_THREAT_DISTANCE,
} from '../../config/constants';

/* ──────────────────────────────────────────────────────────────────────
 * Типы опасностей ("Hazard")
 * ────────────────────────────────────────────────────────────────────── */

type BulletMovement = 'straight' | 'sine' | 'homing';
type BoneColorMode = 'normal' | 'blue' | 'orange';

interface BulletHazard {
  kind: 'bullet';
  obj: Phaser.GameObjects.Arc;
  movement: BulletMovement;
  age: number;
  baseVx: number;
  baseVy: number;
  vx: number;
  vy: number;
  sineAmplitude: number;
  sineFrequency: number;
}

interface BoneWallHHazard {
  kind: 'bone-wall-h';
  rects: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  y: number;
  gapCenterX: number;
  gapSize: number;
  speed: number;
  colorMode: BoneColorMode;
}

interface BoneWallVHazard {
  kind: 'bone-wall-v';
  rects: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  x: number;
  gapCenterY: number;
  gapSize: number;
  speed: number;
  colorMode: BoneColorMode;
}

interface BlasterHazard {
  kind: 'blaster';
  orientation: 'horizontal' | 'vertical';
  telegraphObj: Phaser.GameObjects.Rectangle;
  beamObj?: Phaser.GameObjects.Rectangle;
  position: number;
  state: 'telegraph' | 'firing';
  stateElapsed: number;
  telegraphMs: number;
  beamMs: number;
  thickness: number;
}

type Hazard = BulletHazard | BoneWallHHazard | BoneWallVHazard | BlasterHazard;

/* ──────────────────────────────────────────────────────────────────────
 * Читы: слово → реплики-объяснение → эффект на экране
 * ────────────────────────────────────────────────────────────────────── */

type CheatEffectType = 'dodge-if' | 'invisible-else' | 'loop-for' | 'shield-let';

interface CheatDefinition {
  keyword: string;
  effect: CheatEffectType;
  introLines: string[];
  rewardCodeLines: string[];
}

const CHEAT_IF: CheatDefinition = {
  keyword: 'if',
  effect: 'dodge-if',
  introLines: [
    'Смотри: если написать условие...',
    '...точка сама поймёт, что опасно, и увернётся!',
    'Напечатай "if" — и код сработает сам.',
  ],
  rewardCodeLines: ['if (danger) {', '  dodge();', '}'],
};

const CHEAT_FOR: CheatDefinition = {
  keyword: 'for',
  effect: 'loop-for',
  introLines: [
    'Теперь цикл: он повторяет действие снова и снова.',
    'Точка сама пробежит от опасности несколько раз подряд.',
    'Напечатай "for" — и смотри на повтор.',
  ],
  rewardCodeLines: ['for (let i = 0; i < 3; i++) {', '  dodgeNearestDanger();', '}'],
};

const CHEAT_LET: CheatDefinition = {
  keyword: 'let',
  effect: 'shield-let',
  introLines: [
    'А здесь мы объявляем переменную.',
    'Она хранит значение — и защищает тебя, пока существует!',
    'Напечатай "let" — получишь щит на один удар.',
  ],
  rewardCodeLines: ['let shield = true;'],
};

const CHEAT_ELSE: CheatDefinition = {
  keyword: 'else',
  effect: 'invisible-else',
  introLines: [
    'А если добавить "иначе"...',
    '...точка на миг станет неосязаемой!',
    'Печатай "else" — и снаряды пройдут мимо.',
  ],
  rewardCodeLines: ['} else {', '  becomeIntangible();', '}'],
};

/* ──────────────────────────────────────────────────────────────────────
 * Волны: последовательность "бит" вместо фиксированных таймингов.
 * Следующий бит стартует только когда зачищены опасности текущего
 * (или завершён чит-эффект) — триггер это ДЕЙСТВИЕ игрока, а не секундомер.
 * ────────────────────────────────────────────────────────────────────── */

type WaveBeat = { kind: 'hazard'; spawn: () => void } | { kind: 'cheat'; def: CheatDefinition };

interface WaveDefinition {
  title: string;
  introLines: string[];
  beats: WaveBeat[];
}

export class UiMinigameScene extends Phaser.Scene {
  // ── Геометрия арены ──
  private arenaBounds = { x: 0, y: 0, width: 0, height: 0 };
  private topPanelHalfHeight = 0;

  // ── Игрок ──
  private soul!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private isSoulMovingThisFrame = false;

  // ── Состояния боя ──
  private hazards: Hazard[] = [];
  private scheduledEvents: Phaser.Time.TimerEvent[] = [];
  private activeTypewriterTimers: Phaser.Time.TimerEvent[] = [];
  private stressLevel = 0;
  private attempts = 0;
  private currentWaveIndex = 0;
  private activeBeats: WaveBeat[] = [];
  private waitingForHazardClear = false;
  private activeSafetyTimer?: Phaser.Time.TimerEvent;
  private cheatDemoHazard?: BulletHazard;
  private isInvulnerable = false;
  private isCodeChallengeActive = false;
  private isInvisible = false;
  private hasShield = false;
  private isExiting = false;
  private shieldRing?: Phaser.GameObjects.Arc;
  private activeWordKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  // ── UI ──
  private dimOverlay!: Phaser.GameObjects.Rectangle;
  private dialogueText!: Phaser.GameObjects.Text;
  private continueIndicator!: Phaser.GameObjects.Text;
  private captionText!: Phaser.GameObjects.Text;
  private stressBarFill!: Phaser.GameObjects.Rectangle;
  private captionTween?: Phaser.Tweens.Tween;

  private typewriterState: {
    fullText: string;
    timer?: Phaser.Time.TimerEvent;
    autoAdvanceTimer?: Phaser.Time.TimerEvent;
    isRunning: boolean;
    onComplete?: () => void;
  } = { fullText: '', isRunning: false };

  private readonly WAVES: WaveDefinition[] = [
    {
      title: 'Урок 1: Условие if/else',
      introLines: [
        'Это Мася! Сегодня научу тебя читерить через код.',
        'Смотри на пули и уворачивайся — руками, руками!',
      ],
      beats: [
        { kind: 'hazard', spawn: () => this.spawnBullet('straight') },
        { kind: 'hazard', spawn: () => this.spawnBullet('sine') },
        { kind: 'hazard', spawn: () => this.spawnBullet('homing') },
        { kind: 'cheat', def: CHEAT_IF },
        { kind: 'hazard', spawn: () => this.spawnBullet('sine') },
        { kind: 'hazard', spawn: () => this.spawnBullet('straight') },
      ],
    },
    {
      title: 'Урок 2: Цикл for и синие кости',
      introLines: [
        'Теперь кости! Обычные — просто находи дыру.',
        'А вот синие кости бьют, только если ты ДВИГАЕШЬСЯ. Замри!',
      ],
      beats: [
        { kind: 'hazard', spawn: () => this.spawnBoneWallH('normal') },
        { kind: 'hazard', spawn: () => this.spawnBoneWallV('normal') },
        { kind: 'hazard', spawn: () => this.spawnBoneWallH('blue') },
        { kind: 'cheat', def: CHEAT_FOR },
        { kind: 'hazard', spawn: () => this.spawnBoneWallH('blue') },
        { kind: 'hazard', spawn: () => this.spawnBoneWallV('normal') },
      ],
    },
    {
      title: 'Урок 3: Переменная и оранжевые кости',
      introLines: [
        'Оранжевые кости — наоборот: бьют, если ты СТОИШЬ.',
        'Переменная let хранит значение — скоро покажу, как она защищает.',
      ],
      beats: [
        { kind: 'hazard', spawn: () => this.spawnBoneWallH('orange') },
        { kind: 'hazard', spawn: () => this.spawnBoneWallV('orange') },
        { kind: 'cheat', def: CHEAT_LET },
        { kind: 'hazard', spawn: () => this.spawnBoneWallH('orange') },
        { kind: 'hazard', spawn: () => this.spawnBullet('homing') },
        { kind: 'hazard', spawn: () => this.spawnBoneWallV('blue') },
      ],
    },
    {
      title: 'Финал: весь код вместе',
      introLines: [
        'А теперь — всё сразу! Как в настоящей программе.',
        'Если запутаешься — вспоминай каждый читкод.',
      ],
      beats: [
        { kind: 'hazard', spawn: () => this.spawnBullet('sine') },
        { kind: 'hazard', spawn: () => this.spawnBoneWallH('blue') },
        { kind: 'hazard', spawn: () => this.spawnBlaster('horizontal', this.arenaBounds.y + 40) },
        { kind: 'cheat', def: CHEAT_IF },
        { kind: 'hazard', spawn: () => this.spawnBoneWallV('orange') },
        { kind: 'hazard', spawn: () => this.spawnBullet('homing') },
        { kind: 'cheat', def: CHEAT_FOR },
        { kind: 'hazard', spawn: () => this.spawnBlaster('vertical', this.arenaBounds.x + 40) },
        { kind: 'cheat', def: CHEAT_LET },
        { kind: 'cheat', def: CHEAT_ELSE },
      ],
    },
  ];

  public constructor() {
    super('UiMinigameScene');
  }

  /* ──────────────────────────────────────────────────────────────────
   * Жизненный цикл сцены
   * ────────────────────────────────────────────────────────────────── */

  public create(): void {
    this.resetState();
    this.buildDimOverlay();
    this.computeLayoutAndBuildArena();
    this.buildTopPanel();
    this.buildFooter();
    this.buildSoul();
    this.buildExitButton();
    this.setupInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.startWave(0);
  }

  public update(_time: number, delta: number): void {
    this.updateSoulMovement(delta);
    this.updateHazards(delta);

    if (this.shieldRing) {
      this.shieldRing.setPosition(this.soul.x, this.soul.y);
    }

    if (this.waitingForHazardClear && this.hazards.length === 0 && !this.isCodeChallengeActive) {
      this.waitingForHazardClear = false;
      const event = this.time.delayedCall(BOSS_BEAT_BREATHER_MS, () => this.advanceBeatQueue());
      this.scheduledEvents.push(event);
    }
  }

  private resetState(): void {
    this.hazards = [];
    this.scheduledEvents = [];
    this.activeTypewriterTimers = [];
    this.stressLevel = 0;
    this.attempts = 0;
    this.currentWaveIndex = 0;
    this.activeBeats = [];
    this.waitingForHazardClear = false;
    this.isInvulnerable = false;
    this.isCodeChallengeActive = false;
    this.isInvisible = false;
    this.hasShield = false;
    this.isExiting = false;
    this.isSoulMovingThisFrame = false;
  }

  /* ──────────────────────────────────────────────────────────────────
   * Затемнение фона (плавно при входе, держится весь бой, плавно гаснет при выходе)
   * ────────────────────────────────────────────────────────────────── */

  private buildDimOverlay(): void {
    this.dimOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, BOSS_DIM_OVERLAY_ALPHA)
      .setDepth(-10)
      .setAlpha(0);

    this.tweens.add({ targets: this.dimOverlay, alpha: 1, duration: BOSS_DIM_FADE_MS });
  }

  private fadeOutAndStop(onComplete: () => void): void {
    if (this.isExiting) return;
    this.isExiting = true;
    this.tweens.add({ targets: this.dimOverlay, alpha: 0, duration: BOSS_DIM_FADE_MS, onComplete });
  }

  private exitToHub(): void {
    this.fadeOutAndStop(() => {
      this.game.events.emit('minigame-exit');
      this.scene.stop();
    });
  }

  /* ──────────────────────────────────────────────────────────────────
   * Построение сцены
   * ────────────────────────────────────────────────────────────────── */

  private computeLayoutAndBuildArena(): void {
    const panelTopMargin = 20;
    this.topPanelHalfHeight = BOSS_TOP_PANEL_HEIGHT / 2;

    const arenaX = (GAME_WIDTH - BOSS_BOX_WIDTH) / 2;
    const arenaY = panelTopMargin + BOSS_TOP_PANEL_HEIGHT + BOSS_ARENA_TOP_ROW_HEIGHT;

    this.arenaBounds = { x: arenaX, y: arenaY, width: BOSS_BOX_WIDTH, height: BOSS_BOX_HEIGHT };

    this.add
      .rectangle(
        arenaX + BOSS_BOX_WIDTH / 2,
        arenaY + BOSS_BOX_HEIGHT / 2,
        BOSS_BOX_WIDTH,
        BOSS_BOX_HEIGHT,
        0x020617,
        0.9,
      )
      .setStrokeStyle(2, 0xf8fafc);
  }

  /** Во время боя — только окно с фразами, без портрета (портрет остался в MasyaIntroScene). */
  private buildTopPanel(): void {
    const panelX = GAME_WIDTH / 2;
    const panelY = 20 + this.topPanelHalfHeight;

    const panelBg = this.add
      .rectangle(panelX, panelY, BOSS_TOP_PANEL_WIDTH, BOSS_TOP_PANEL_HEIGHT, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0x334155);

    const textX = panelX - BOSS_TOP_PANEL_WIDTH / 2 + 24;
    const textWidth = BOSS_TOP_PANEL_WIDTH - 48;

    this.dialogueText = this.add
      .text(textX, panelY - 16, '', {
        fontSize: '16px',
        color: '#e2e8f0',
        wordWrap: { width: textWidth },
      })
      .setOrigin(0, 0.5);

    this.continueIndicator = this.add
      .text(panelX + BOSS_TOP_PANEL_WIDTH / 2 - 24, panelY + BOSS_TOP_PANEL_HEIGHT / 2 - 18, '▼', {
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setVisible(false);

    panelBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.handleDialogueAdvance());
    // buildTopPanel():
    this.input.keyboard!.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (event.repeat) return;
      this.handleDialogueAdvance();
    });
  }

  private buildFooter(): void {
    const bounds = this.arenaBounds;
    const barY = bounds.y + bounds.height + BOSS_ARENA_FOOTER_HEIGHT / 2;

    this.add.text(bounds.x, barY - 22, 'Стресс:', { fontSize: '13px', color: '#94a3b8' });

    this.add
      .rectangle(bounds.x + STRESS_BAR_WIDTH / 2, barY, STRESS_BAR_WIDTH, STRESS_BAR_HEIGHT, 0x1f2937)
      .setStrokeStyle(1, 0x334155)
      .setOrigin(0.5);

    this.stressBarFill = this.add
      .rectangle(bounds.x, barY, 0, STRESS_BAR_HEIGHT, 0xef4444)
      .setOrigin(0, 0.5);

    this.captionText = this.add
      .text(bounds.x + bounds.width, barY, '', {
        fontSize: '13px',
        color: '#4ade80',
        align: 'right',
        wordWrap: { width: 260 },
      })
      .setOrigin(1, 0.5)
      .setAlpha(0);
  }

  private buildSoul(): void {
    const bounds = this.arenaBounds;
    this.soul = this.add
      .circle(bounds.x + bounds.width / 2, bounds.y + bounds.height - 30, BOSS_SOUL_RADIUS, 0xef4444)
      .setDepth(100);
  }

  /** Кнопка выхода доступна в любой момент боя, независимо от состояния. */
  private buildExitButton(): void {
    const button = this.add
      .text(GAME_WIDTH - 20, 20, '✖ Выйти (Esc)', {
        fontSize: '13px',
        color: '#f8fafc',
        backgroundColor: '#1f293799',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setDepth(500)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => this.exitToHub());
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys('W,S,A,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.on('keydown-ESC', (event: KeyboardEvent) => {
      if (event.repeat) return;
      this.exitToHub();
    });
  }

  /* ──────────────────────────────────────────────────────────────────
   * Диалоговая печать: скип анимации по первому пробелу, переход по второму,
   * авто-переход через BOSS_DIALOGUE_AUTO_ADVANCE_MS, если игрок не нажимал сам.
   * ────────────────────────────────────────────────────────────────── */

  private runTypewriter(text: string, onComplete: () => void): void {
    this.dialogueText.setText('');
    this.typewriterState.fullText = text;
    this.typewriterState.isRunning = true;
    this.typewriterState.onComplete = onComplete;
    this.typewriterState.autoAdvanceTimer?.remove();
    this.continueIndicator.setVisible(false);

    let charIndex = 0;
    const timer = this.time.addEvent({
      delay: BOSS_TYPEWRITER_MS,
      loop: true,
      callback: () => {
        charIndex += 1;
        this.dialogueText.setText(text.slice(0, charIndex));
        if (charIndex >= text.length) {
          timer.remove();
          this.typewriterState.isRunning = false;
          this.continueIndicator.setVisible(true);
          this.scheduleAutoAdvance();
        }
      },
    });

    this.typewriterState.timer = timer;
    this.activeTypewriterTimers.push(timer);
  }

  private scheduleAutoAdvance(): void {
    this.typewriterState.autoAdvanceTimer?.remove();
    const timer = this.time.delayedCall(BOSS_DIALOGUE_AUTO_ADVANCE_MS, () => this.advanceDialogue());
    this.typewriterState.autoAdvanceTimer = timer;
    this.activeTypewriterTimers.push(timer);
  }

  private handleDialogueAdvance(): void {
    if (this.typewriterState.isRunning) {
      this.typewriterState.timer?.remove();
      this.dialogueText.setText(this.typewriterState.fullText);
      this.typewriterState.isRunning = false;
      this.continueIndicator.setVisible(true);
      this.scheduleAutoAdvance();
      return;
    }
    this.advanceDialogue();
  }

  private advanceDialogue(): void {
    this.typewriterState.autoAdvanceTimer?.remove();
    const callback = this.typewriterState.onComplete;
    this.typewriterState.onComplete = undefined;
    this.continueIndicator.setVisible(false);
    callback?.();
  }

  private runDialogueSequence(lines: string[], onDone: () => void): void {
    let index = 0;
    const showNext = (): void => {
      if (index >= lines.length) {
        onDone();
        return;
      }
      const line = lines[index];
      index += 1;
      this.runTypewriter(line, showNext);
    };
    showNext();
  }

  /* ──────────────────────────────────────────────────────────────────
   * Волны и очередь "бит" — прогресс идёт по действиям игрока
   * ────────────────────────────────────────────────────────────────── */

  private startWave(index: number): void {
    if (index >= this.WAVES.length) {
      this.handleVictory();
      return;
    }

    this.currentWaveIndex = index;
    const wave = this.WAVES[index];
    this.clearHazards();
    this.applyStressChange(-BOSS_WAVE_BREATHER_RELIEF);
    this.activeBeats = [...wave.beats];

    this.runDialogueSequence([wave.title, ...wave.introLines], () => this.advanceBeatQueue());
  }

    private advanceBeatQueue(): void {
  // Обязательно отменяем предыдущий страховочный таймер первым делом —
  // иначе он может "выстрелить" позже по уже неактуальному, новому биту
  // и ошибочно прервать его раньше времени (это и вызывало повтор заданий).
      this.activeSafetyTimer?.remove(false);
      this.activeSafetyTimer = undefined;

      if (this.activeBeats.length === 0) {
        this.startWave(this.currentWaveIndex + 1);
        return;
      }

      const beat = this.activeBeats.shift()!;
      if (beat.kind === 'hazard') {
        beat.spawn();
        this.waitingForHazardClear = true;

        this.activeSafetyTimer = this.time.delayedCall(BOSS_BEAT_SAFETY_TIMEOUT_MS, () => {
          if (this.waitingForHazardClear) {
            this.clearHazards();
            this.waitingForHazardClear = false;
            this.advanceBeatQueue();
          }
        });
      } else {
        this.showWordChallenge(beat.def);
      }
    }

  /** Вызывается самим эффектом чита, когда он закончился (см. ниже). */
  private finishBeatAndContinue(): void {
    this.clearCheatDemoThreat();
    const event = this.time.delayedCall(BOSS_BEAT_BREATHER_MS, () => this.advanceBeatQueue());
    this.scheduledEvents.push(event);
  }

  private clearHazards(): void {
    this.scheduledEvents.forEach((event) => event.remove(false));
    this.scheduledEvents = [];
    this.waitingForHazardClear = false;
    this.hazards.forEach((hazard) => this.destroyHazardObjects(hazard));
    this.hazards = [];
  }

  private destroyHazardObjects(hazard: Hazard): void {
    if (hazard.kind === 'bullet') {
      hazard.obj.destroy();
    } else if (hazard.kind === 'bone-wall-h' || hazard.kind === 'bone-wall-v') {
      hazard.rects.forEach((rect) => rect.destroy());
    } else if (hazard.kind === 'blaster') {
      hazard.telegraphObj.destroy();
      hazard.beamObj?.destroy();
    }
  }

  /* ──────────────────────────────────────────────────────────────────
   * Механика "Напечатай слово" — без таймера, ждёт корректного ввода
   * ────────────────────────────────────────────────────────────────── */

  private showWordChallenge(def: CheatDefinition): void {
    this.isCodeChallengeActive = true;
    this.runDialogueSequence(def.introLines, () => this.openWordChallengeWindow(def));
  }

  private openWordChallengeWindow(def: CheatDefinition): void {
    const word = def.keyword;
    let typedCount = 0;

    const windowWidth = 240;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const container = this.add.container(centerX, centerY).setDepth(200);
    const bg = this.add.rectangle(0, 0, windowWidth, 90, 0x111827, 0.92).setStrokeStyle(2, 0x60a5fa);
    const prompt = this.add
      .text(0, -22, 'Напечатай:', { fontSize: '14px', color: '#94a3b8' })
      .setOrigin(0.5);

    const letterTexts: Phaser.GameObjects.Text[] = [];
    const letterSpacing = 22;
    const startX = -((word.length - 1) * letterSpacing) / 2;
    for (let i = 0; i < word.length; i += 1) {
      const letterText = this.add
        .text(startX + i * letterSpacing, 8, word[i], {
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#64748b',
        })
        .setOrigin(0.5);
      letterTexts.push(letterText);
    }

    container.add([bg, prompt, ...letterTexts]);
    container.setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });

    const cleanupChallenge = (): void => {
      if (this.activeWordKeyHandler) {
        window.removeEventListener('keydown', this.activeWordKeyHandler);
        this.activeWordKeyHandler = null;
      }
      container.destroy();
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      const expected = word[typedCount];
      if (event.key.toLowerCase() === expected) {
        letterTexts[typedCount].setColor('#4ade80');
        typedCount += 1;
        if (typedCount === word.length) {
          cleanupChallenge();
          this.runCheatEffect(def);
        }
      }
    };

    this.activeWordKeyHandler = onKeyDown;
    window.addEventListener('keydown', onKeyDown);
  }

  /* ──────────────────────────────────────────────────────────────────
   * Диспетчер эффектов чита
   * ────────────────────────────────────────────────────────────────── */

  private printRewardCode(lines: string[]): void {
    const fullText = lines.join('\n');
    this.captionTween?.stop();
    this.captionText.setAlpha(1).setText('');

    let charIndex = 0;
    const timer = this.time.addEvent({
      delay: BOSS_CODE_TYPEWRITER_MS,
      loop: true,
      callback: () => {
        charIndex += 1;
        this.captionText.setText(fullText.slice(0, charIndex));
        if (charIndex >= fullText.length) {
          timer.remove();
          this.captionTween = this.tweens.add({
            targets: this.captionText,
            alpha: 0,
            delay: 1800,
            duration: BOSS_CAPTION_FADE_MS,
          });
        }
      },
    });
    this.activeTypewriterTimers.push(timer);
  }

  /**
 * Создаёт статичный визуальный "снаряд" рядом с точкой перед тем, как
 * сработает if/for. Он не двигается и не наносит урон (updateHazards()
 * не выполняется, пока isCodeChallengeActive === true), нужен только
 * чтобы computeDodgeTarget() имел реальную цель для уворота, а не
 * fallback в центр арены при пустом this.hazards.
 */
  private spawnCheatDemoThreat(): void {
    const bounds = this.arenaBounds;
    // Случайное направление по каждой оси (влево/вправо, вверх/вниз),
    // чтобы демо-угроза не появлялась каждый раз в одном и том же месте.
    const dirX = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    const dirY = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;

    const x = Phaser.Math.Clamp(
      this.soul.x + dirX * CHEAT_DEMO_THREAT_DISTANCE,
      bounds.x + 20,
      bounds.x + bounds.width - 20,
    );
    const y = Phaser.Math.Clamp(
      this.soul.y + dirY * CHEAT_DEMO_THREAT_DISTANCE,
      bounds.y + 20,
      bounds.y + bounds.height - 20,
    );

    const obj = this.add.circle(x, y, BOSS_BULLET_RADIUS, 0xfbbf24, 0.85);

  // Используем тип BulletHazard с нулевой скоростью — это просто
  // статичная точка-ориентир, а не настоящий летящий снаряд.
    const demo: BulletHazard = {
      kind: 'bullet',
      obj,
      movement: 'straight',
      age: 0,
      baseVx: 0,
      baseVy: 0,
      vx: 0,
      vy: 0,
      sineAmplitude: 0,
      sineFrequency: 0,
    };

    this.cheatDemoHazard = demo;
    this.hazards.push(demo);
  }

/**
 * Убирает демо-угрозу после того, как чит-эффект отыгран. Обязательно
 * вызывать перед переходом к следующему биту — иначе демо-объект
 * останется висеть в this.hazards и сломает проверку
 * "waitingForHazardClear && hazards.length === 0" для следующего
 * боевого бита (она никогда не станет true).
 */
  private clearCheatDemoThreat(): void {
    if (!this.cheatDemoHazard) return;
    this.cheatDemoHazard.obj.destroy();
    this.hazards = this.hazards.filter((hazard) => hazard !== this.cheatDemoHazard);
    this.cheatDemoHazard = undefined;
  }

  private runCheatEffect(def: CheatDefinition): void {
    this.applyStressChange(-BOSS_WORD_CHALLENGE_RELIEF);
    this.printRewardCode(def.rewardCodeLines);

  // Демо-угроза нужна только эффектам, которые реально двигают точку
  // (if и for — уворот). Щиту (let) и неосязаемости (else) двигаться
  // не от чего, им демо-объект не нужен.
    const needsDemoThreat = def.effect === 'dodge-if' || def.effect === 'loop-for';
    if (needsDemoThreat) this.spawnCheatDemoThreat();

    switch (def.effect) {
      case 'dodge-if':
        this.playDodgeIfEffect();
        break;
      case 'invisible-else':
        this.playInvisibleElseEffect();
        break;
      case 'loop-for':
        this.playLoopForEffect();
        break;
      case 'shield-let':
        this.playShieldLetEffect();
        break;
    }
  }

  /** if — точка сама считает, от какой угрозы ближе всего, и уходит от неё. */
  private playDodgeIfEffect(): void {
    const target = this.computeDodgeTarget();
    this.tweens.add({
      targets: this.soul,
      x: target.x,
      y: target.y,
      duration: BOSS_AUTOPILOT_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.isCodeChallengeActive = false;
        this.finishBeatAndContinue();
      },
    });
  }

  /** else — временная неосязаемость, управление возвращается сразу, бой не заморожен. */
  private playInvisibleElseEffect(): void {
    this.isInvisible = true;
    this.isCodeChallengeActive = false;
    this.soul.setFillStyle(0x93c5fd, 1);

    const flicker = this.tweens.add({
      targets: this.soul,
      alpha: 0.35,
      duration: 160,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(BOSS_INVISIBLE_DURATION_MS, () => {
      flicker.stop();
      this.soul.setAlpha(1).setFillStyle(0xef4444, 1);
      this.isInvisible = false;
    });

    this.finishBeatAndContinue();
  }

  /** for — несколько последовательных уворотов, каждый пересчитывает ближайшую угрозу заново. */
  private playLoopForEffect(): void {
    const totalSteps = 3;
    const stepDuration = BOSS_LOOP_PATTERN_DURATION_MS / totalSteps;
    let step = 0;

    const runStep = (): void => {
      if (step >= totalSteps) {
        this.isCodeChallengeActive = false;
        this.finishBeatAndContinue();
        return;
      }
      step += 1;
      const target = this.computeDodgeTarget();
      this.tweens.add({
        targets: this.soul,
        x: target.x,
        y: target.y,
        duration: stepDuration,
        ease: 'Sine.easeInOut',
        onComplete: runStep,
      });
    };

    runStep();
  }

  /** let — щит на один удар, управление возвращается почти сразу, бой не заморожен. */
  private playShieldLetEffect(): void {
    this.hasShield = true;

    const ring = this.add
      .circle(this.soul.x, this.soul.y, BOSS_SOUL_RADIUS + 6, BOSS_SHIELD_RING_COLOR, 0)
      .setStrokeStyle(3, BOSS_SHIELD_RING_COLOR, 1)
      .setScale(0.3)
      .setAlpha(0)
      .setDepth(150);

    this.tweens.add({ targets: ring, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut' });
    this.shieldRing = ring;

    this.time.delayedCall(BOSS_CHEAT_DECLARE_FREEZE_MS, () => {
      this.isCodeChallengeActive = false;
      this.finishBeatAndContinue();
    });

    this.time.delayedCall(BOSS_SHIELD_DURATION_MS, () => {
      if (this.hasShield) this.consumeShield(false);
    });
  }

  private consumeShield(wasHit: boolean): void {
    this.hasShield = false;
    const ring = this.shieldRing;
    this.shieldRing = undefined;
    if (!ring) return;

    this.tweens.add({
      targets: ring,
      scale: wasHit ? 1.6 : 0.2,
      alpha: 0,
      duration: 200,
      onComplete: () => ring.destroy(),
    });
  }

  /* ──────────────────────────────────────────────────────────────────
   * "Осознанность" точки: находим ближайшую угрозу и вектор ухода от неё
   * ────────────────────────────────────────────────────────────────── */

  private getHazardClosestPoint(hazard: Hazard): { x: number; y: number } {
    const bounds = this.arenaBounds;
    if (hazard.kind === 'bullet') {
      return { x: hazard.obj.x, y: hazard.obj.y };
    }
    if (hazard.kind === 'bone-wall-h') {
      return { x: Phaser.Math.Clamp(this.soul.x, bounds.x, bounds.x + bounds.width), y: hazard.y };
    }
    if (hazard.kind === 'bone-wall-v') {
      return { x: hazard.x, y: Phaser.Math.Clamp(this.soul.y, bounds.y, bounds.y + bounds.height) };
    }
    return hazard.orientation === 'horizontal'
      ? { x: this.soul.x, y: hazard.position }
      : { x: hazard.position, y: this.soul.y };
  }

  private findNearestThreatPoint(): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let nearestDistance = Infinity;

    for (const hazard of this.hazards) {
      const point = this.getHazardClosestPoint(hazard);
      const distance = Phaser.Math.Distance.Between(this.soul.x, this.soul.y, point.x, point.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = point;
      }
    }

    return nearest;
  }

  /** Главный метод "осознанности": точка знает, от чего именно уворачивается. */
  private computeDodgeTarget(): { x: number; y: number } {
    const bounds = this.arenaBounds;
    const threat = this.findNearestThreatPoint();

    if (!threat) {
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    }

    const dx = this.soul.x - threat.x;
    const dy = this.soul.y - threat.y;
    const len = Math.hypot(dx, dy) || 1;

    const candidate = {
      x: Phaser.Math.Clamp(
        this.soul.x + (dx / len) * BOSS_DODGE_PUSH_DISTANCE,
        bounds.x + BOSS_SOUL_RADIUS,
        bounds.x + bounds.width - BOSS_SOUL_RADIUS,
      ),
      y: Phaser.Math.Clamp(
        this.soul.y + (dy / len) * BOSS_DODGE_PUSH_DISTANCE,
        bounds.y + BOSS_SOUL_RADIUS,
        bounds.y + bounds.height - BOSS_SOUL_RADIUS,
      ),
    };

    return this.isPointSafe(candidate.x, candidate.y) ? candidate : this.findRandomSafeTarget();
  }

  /** Резервный поиск — только если "уход от угрозы" всё равно оказался небезопасен. */
  private findRandomSafeTarget(): { x: number; y: number } {
    const inset = BOSS_SOUL_RADIUS + 10;
    const bounds = this.arenaBounds;
    let fallback = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = {
        x: Phaser.Math.Between(bounds.x + inset, bounds.x + bounds.width - inset),
        y: Phaser.Math.Between(bounds.y + inset, bounds.y + bounds.height - inset),
      };
      if (this.isPointSafe(candidate.x, candidate.y)) return candidate;
      fallback = candidate;
    }
    return fallback;
  }

  private isPointSafe(x: number, y: number): boolean {
    for (const hazard of this.hazards) {
      if (hazard.kind === 'bullet') {
        const dist = Phaser.Math.Distance.Between(x, y, hazard.obj.x, hazard.obj.y);
        if (dist < BOSS_BULLET_RADIUS + BOSS_SOUL_RADIUS + 24) return false;
      } else if (hazard.kind === 'bone-wall-v') {
        if (Math.abs(x - hazard.x) < BOSS_BONE_THICKNESS + BOSS_SOUL_RADIUS + 16) {
          if (Math.abs(y - hazard.gapCenterY) > hazard.gapSize / 2 - BOSS_SOUL_RADIUS) return false;
        }
      } else if (hazard.kind === 'bone-wall-h') {
        if (Math.abs(y - hazard.y) < BOSS_BONE_THICKNESS + BOSS_SOUL_RADIUS + 16) {
          if (Math.abs(x - hazard.gapCenterX) > hazard.gapSize / 2 - BOSS_SOUL_RADIUS) return false;
        }
      } else if (hazard.kind === 'blaster' && hazard.state === 'firing') {
        if (hazard.orientation === 'horizontal' && Math.abs(y - hazard.position) < hazard.thickness) return false;
        if (hazard.orientation === 'vertical' && Math.abs(x - hazard.position) < hazard.thickness) return false;
      }
    }
    return true;
  }

  /* ──────────────────────────────────────────────────────────────────
   * Урон, неуязвимость, стресс
   * ────────────────────────────────────────────────────────────────── */

  private tryDamageSoul(amount: number, shakeIntensity: number, shakeDuration: number): void {
    if (this.isInvulnerable || this.isCodeChallengeActive || this.isInvisible) return;
    if (this.hasShield) {
      this.consumeShield(true);
      return;
    }
    this.applyHitDamage(amount, shakeIntensity, shakeDuration);
  }

  private applyHitDamage(amount: number, shakeIntensity: number, shakeDuration: number): void {
    this.isInvulnerable = true;
    this.attempts += 1;
    this.cameras.main.shake(shakeDuration, shakeIntensity);
    this.applyStressChange(amount);

    const halfCycles = 8;
    const halfCycleDuration = BOSS_INVULNERABILITY_MS / halfCycles;
    for (let i = 0; i < halfCycles; i += 1) {
      this.time.delayedCall(i * halfCycleDuration, () => {
        this.soul.setAlpha(i % 2 === 0 ? 0.25 : 1);
      });
    }
    this.time.delayedCall(BOSS_INVULNERABILITY_MS, () => {
      this.soul.setAlpha(1);
      this.isInvulnerable = false;
    });

    if (this.stressLevel >= STRESS_BAR_MAX) {
      this.handleDefeat();
    }
  }

  private applyStressChange(delta: number): void {
    this.stressLevel = Phaser.Math.Clamp(this.stressLevel + delta, 0, STRESS_BAR_MAX);
    this.updateStressBar();
  }

  private updateStressBar(): void {
    const ratio = this.stressLevel / STRESS_BAR_MAX;
    const targetWidth = STRESS_BAR_WIDTH * ratio;
    this.tweens.add({
      targets: this.stressBarFill,
      width: targetWidth,
      duration: 250,
      ease: 'Cubic.easeOut',
    });
  }

  /* ──────────────────────────────────────────────────────────────────
   * Движение сердца
   * ────────────────────────────────────────────────────────────────── */

  private updateSoulMovement(delta: number): void {
    if (this.isCodeChallengeActive) {
      this.isSoulMovingThisFrame = false;
      return;
    }

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) dy += 1;

    this.isSoulMovingThisFrame = dx !== 0 || dy !== 0;

    if (this.isSoulMovingThisFrame) {
      const length = Math.hypot(dx, dy) || 1;
      const speed = BOSS_SOUL_SPEED * (delta / 1000);
      const bounds = this.arenaBounds;
      const inset = BOSS_SOUL_RADIUS;

      this.soul.x = Phaser.Math.Clamp(
        this.soul.x + (dx / length) * speed,
        bounds.x + inset,
        bounds.x + bounds.width - inset,
      );
      this.soul.y = Phaser.Math.Clamp(
        this.soul.y + (dy / length) * speed,
        bounds.y + inset,
        bounds.y + bounds.height - inset,
      );
    }
  }

  /* ──────────────────────────────────────────────────────────────────
   * Обновление опасностей
   * ────────────────────────────────────────────────────────────────── */

  private updateHazards(delta: number): void {
    if (this.isCodeChallengeActive) return;

    const dt = delta / 1000;
    const remaining: Hazard[] = [];

    for (const hazard of this.hazards) {
      let keep = true;
      if (hazard.kind === 'bullet') {
        keep = this.updateBullet(hazard, dt);
      } else if (hazard.kind === 'bone-wall-h') {
        keep = this.updateBoneWallH(hazard, dt);
      } else if (hazard.kind === 'bone-wall-v') {
        keep = this.updateBoneWallV(hazard, dt);
      } else if (hazard.kind === 'blaster') {
        keep = this.updateBlaster(hazard, dt);
      }
      if (keep) remaining.push(hazard);
    }

    this.hazards = remaining;
  }

  private updateBullet(hazard: BulletHazard, dt: number): boolean {
    hazard.age += dt;

    if (hazard.age >= BOSS_BULLET_MAX_AGE_MS / 1000) {
      hazard.obj.destroy();
      return false;
    }
    if (hazard.movement === 'sine') {
      const perpX = -hazard.baseVy;
      const perpY = hazard.baseVx;
      const offset = Math.sin(hazard.age * hazard.sineFrequency) * hazard.sineAmplitude;
      hazard.obj.x += hazard.baseVx * dt + perpX * offset * dt;
      hazard.obj.y += hazard.baseVy * dt + perpY * offset * dt;
    } else if (hazard.movement === 'homing') {
      const dx = this.soul.x - hazard.obj.x;
      const dy = this.soul.y - hazard.obj.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(hazard.baseVx, hazard.baseVy);
      hazard.vx = Phaser.Math.Linear(hazard.vx, (dx / len) * speed, 40 * dt);
      hazard.vy = Phaser.Math.Linear(hazard.vy, (dy / len) * speed, 40 * dt);
      hazard.obj.x += hazard.vx * dt;
      hazard.obj.y += hazard.vy * dt;
    } else {
      hazard.obj.x += hazard.baseVx * dt;
      hazard.obj.y += hazard.baseVy * dt;
    }

    const bounds = this.arenaBounds;
    const margin = 40;
    const outOfBounds =
      hazard.obj.x < bounds.x - margin ||
      hazard.obj.x > bounds.x + bounds.width + margin ||
      hazard.obj.y < bounds.y - margin ||
      hazard.obj.y > bounds.y + bounds.height + margin;

    if (outOfBounds) {
      hazard.obj.destroy();
      return false;
    }

    const dist = Phaser.Math.Distance.Between(hazard.obj.x, hazard.obj.y, this.soul.x, this.soul.y);
    if (dist < BOSS_BULLET_RADIUS + BOSS_SOUL_RADIUS) {
      this.tryDamageSoul(BOSS_HIT_STRESS, 0.006, 100);
    }

    return true;
  }

  private updateBoneWallH(hazard: BoneWallHHazard, dt: number): boolean {
    hazard.y += hazard.speed * dt;
    this.redrawBoneWallH(hazard);

    const bounds = this.arenaBounds;
    if (hazard.y > bounds.y + bounds.height + BOSS_BONE_THICKNESS) {
      hazard.rects.forEach((rect) => rect.destroy());
      return false;
    }

    const overlapsBand = Math.abs(this.soul.y - hazard.y) < BOSS_BONE_THICKNESS / 2 + BOSS_SOUL_RADIUS;
    if (overlapsBand) {
      if (hazard.colorMode === 'normal') {
        const inGap = Math.abs(this.soul.x - hazard.gapCenterX) < hazard.gapSize / 2 - BOSS_SOUL_RADIUS;
        if (!inGap) this.tryDamageSoul(BOSS_HIT_STRESS, 0.01, 150);
      } else {
        const safe = hazard.colorMode === 'blue' ? !this.isSoulMovingThisFrame : this.isSoulMovingThisFrame;
        if (!safe) this.tryDamageSoul(BOSS_HIT_STRESS, 0.01, 150);
      }
    }

    return true;
  }

  private updateBoneWallV(hazard: BoneWallVHazard, dt: number): boolean {
    hazard.x += hazard.speed * dt;
    this.redrawBoneWallV(hazard);

    const bounds = this.arenaBounds;
    if (hazard.x > bounds.x + bounds.width + BOSS_BONE_THICKNESS) {
      hazard.rects.forEach((rect) => rect.destroy());
      return false;
    }

    const overlapsBand = Math.abs(this.soul.x - hazard.x) < BOSS_BONE_THICKNESS / 2 + BOSS_SOUL_RADIUS;
    if (overlapsBand) {
      if (hazard.colorMode === 'normal') {
        const inGap = Math.abs(this.soul.y - hazard.gapCenterY) < hazard.gapSize / 2 - BOSS_SOUL_RADIUS;
        if (!inGap) this.tryDamageSoul(BOSS_HIT_STRESS, 0.01, 150);
      } else {
        const safe = hazard.colorMode === 'blue' ? !this.isSoulMovingThisFrame : this.isSoulMovingThisFrame;
        if (!safe) this.tryDamageSoul(BOSS_HIT_STRESS, 0.01, 150);
      }
    }

    return true;
  }

  private updateBlaster(hazard: BlasterHazard, dt: number): boolean {
    hazard.stateElapsed += dt * 1000;

    if (hazard.state === 'telegraph') {
      if (hazard.stateElapsed >= hazard.telegraphMs) {
        hazard.telegraphObj.destroy();
        const bounds = this.arenaBounds;
        hazard.beamObj =
          hazard.orientation === 'horizontal'
            ? this.add.rectangle(
                bounds.x + bounds.width / 2,
                hazard.position,
                bounds.width,
                hazard.thickness,
                0xef4444,
                0.9,
              )
            : this.add.rectangle(
                hazard.position,
                bounds.y + bounds.height / 2,
                hazard.thickness,
                bounds.height,
                0xef4444,
                0.9,
              );
        hazard.state = 'firing';
        hazard.stateElapsed = 0;
      }
      return true;
    }

    const hit =
      hazard.orientation === 'horizontal'
        ? Math.abs(this.soul.y - hazard.position) < hazard.thickness / 2 + BOSS_SOUL_RADIUS
        : Math.abs(this.soul.x - hazard.position) < hazard.thickness / 2 + BOSS_SOUL_RADIUS;

    if (hit) {
      this.tryDamageSoul(BOSS_HIT_STRESS, 0.02, 300);
    }

    if (hazard.stateElapsed >= hazard.beamMs) {
      hazard.beamObj?.destroy();
      return false;
    }
    return true;
  }

  /* ──────────────────────────────────────────────────────────────────
   * Спавн опасностей
   * ────────────────────────────────────────────────────────────────── */

  private spawnBullet(movement: BulletMovement): void {
    const bounds = this.arenaBounds;
    const edge = Phaser.Math.Between(0, 3);
    let x = bounds.x + bounds.width / 2;
    let y = bounds.y + bounds.height / 2;

    if (edge === 0) {
      x = bounds.x - 10;
      y = Phaser.Math.Between(bounds.y, bounds.y + bounds.height);
    } else if (edge === 1) {
      x = bounds.x + bounds.width + 10;
      y = Phaser.Math.Between(bounds.y, bounds.y + bounds.height);
    } else if (edge === 2) {
      y = bounds.y - 10;
      x = Phaser.Math.Between(bounds.x, bounds.x + bounds.width);
    } else {
      y = bounds.y + bounds.height + 10;
      x = Phaser.Math.Between(bounds.x, bounds.x + bounds.width);
    }

    const targetX = bounds.x + bounds.width / 2;
    const targetY = bounds.y + bounds.height / 2;
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const speed = 130;
    const baseVx = Math.cos(angle) * speed;
    const baseVy = Math.sin(angle) * speed;

    const obj = this.add.circle(x, y, BOSS_BULLET_RADIUS, 0xfbbf24);

    this.hazards.push({
      kind: 'bullet',
      obj,
      movement,
      age: 0,
      baseVx,
      baseVy,
      vx: baseVx,
      vy: baseVy,
      sineAmplitude: 1.4,
      sineFrequency: 4,
    });
  }

  private boneColorFor(colorMode: BoneColorMode): number {
    if (colorMode === 'blue') return BOSS_BONE_COLOR_BLUE;
    if (colorMode === 'orange') return BOSS_BONE_COLOR_ORANGE;
    return BOSS_BONE_COLOR_NORMAL;
  }

  private spawnBoneWallH(colorMode: BoneColorMode): void {
    const bounds = this.arenaBounds;
    const gapSize = BOSS_BONE_GAP_SIZE;
    const gapCenterX = Phaser.Math.Between(bounds.x + gapSize, bounds.x + bounds.width - gapSize);
    const color = this.boneColorFor(colorMode);

    const hazard: BoneWallHHazard = {
      kind: 'bone-wall-h',
      rects: [
        this.add.rectangle(0, 0, 0, BOSS_BONE_THICKNESS, color),
        this.add.rectangle(0, 0, 0, BOSS_BONE_THICKNESS, color),
      ],
      y: bounds.y - 50,
      gapCenterX,
      gapSize,
      speed: BOSS_BONE_SPEED,
      colorMode,
    };

    this.redrawBoneWallH(hazard);
    this.hazards.push(hazard);
  }

  private spawnBoneWallV(colorMode: BoneColorMode): void {
    const bounds = this.arenaBounds;
    const gapSize = BOSS_BONE_GAP_SIZE;
    const gapCenterY = Phaser.Math.Between(bounds.y + gapSize, bounds.y + bounds.height - gapSize);
    const color = this.boneColorFor(colorMode);

    const hazard: BoneWallVHazard = {
      kind: 'bone-wall-v',
      rects: [
        this.add.rectangle(0, 0, BOSS_BONE_THICKNESS, 0, color),
        this.add.rectangle(0, 0, BOSS_BONE_THICKNESS, 0, color),
      ],
      x: bounds.x - 50,
      gapCenterY,
      gapSize,
      speed: BOSS_BONE_SPEED,
      colorMode,
    };

    this.redrawBoneWallV(hazard);
    this.hazards.push(hazard);
  }

  private redrawBoneWallH(hazard: BoneWallHHazard): void {
    const bounds = this.arenaBounds;
    const gapLeft = hazard.gapCenterX - hazard.gapSize / 2;
    const gapRight = hazard.gapCenterX + hazard.gapSize / 2;

    const leftWidth = Math.max(0, gapLeft - bounds.x);
    const rightWidth = Math.max(0, bounds.x + bounds.width - gapRight);

    const [leftRect, rightRect] = hazard.rects;
    leftRect.setPosition(bounds.x + leftWidth / 2, hazard.y);
    leftRect.setSize(leftWidth, BOSS_BONE_THICKNESS);

    rightRect.setPosition(gapRight + rightWidth / 2, hazard.y);
    rightRect.setSize(rightWidth, BOSS_BONE_THICKNESS);
  }

  private redrawBoneWallV(hazard: BoneWallVHazard): void {
    const bounds = this.arenaBounds;
    const gapTop = hazard.gapCenterY - hazard.gapSize / 2;
    const gapBottom = hazard.gapCenterY + hazard.gapSize / 2;

    const topHeight = Math.max(0, gapTop - bounds.y);
    const bottomHeight = Math.max(0, bounds.y + bounds.height - gapBottom);

    const [topRect, bottomRect] = hazard.rects;
    topRect.setPosition(hazard.x, bounds.y + topHeight / 2);
    topRect.setSize(BOSS_BONE_THICKNESS, topHeight);

    bottomRect.setPosition(hazard.x, gapBottom + bottomHeight / 2);
    bottomRect.setSize(BOSS_BONE_THICKNESS, bottomHeight);
  }

  private spawnBlaster(orientation: 'horizontal' | 'vertical', position: number): void {
    const bounds = this.arenaBounds;
    const thickness = BOSS_BLASTER_THICKNESS;

    const telegraphObj =
      orientation === 'horizontal'
        ? this.add.rectangle(bounds.x + bounds.width / 2, position, bounds.width, thickness, 0xf87171, 0.35)
        : this.add.rectangle(position, bounds.y + bounds.height / 2, thickness, bounds.height, 0xf87171, 0.35);

    this.hazards.push({
      kind: 'blaster',
      orientation,
      telegraphObj,
      position,
      state: 'telegraph',
      stateElapsed: 0,
      telegraphMs: BOSS_BLASTER_TELEGRAPH_MS,
      beamMs: BOSS_BLASTER_BEAM_MS,
      thickness,
    });
  }

  /* ──────────────────────────────────────────────────────────────────
   * Победа / поражение
   * ────────────────────────────────────────────────────────────────── */

  private handleVictory(): void {
    this.clearHazards();
    this.isCodeChallengeActive = true;

    const score = Math.max(0, 1000 - this.stressLevel * 5 - (this.attempts - 1) * 200);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setDepth(300);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'Ты прошла боссфайт!', {
        fontSize: '28px',
        color: '#4ade80',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(301);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 10,
        `Очки: ${score}\nПопытки: ${this.attempts}\nСтресс: ${this.stressLevel}`,
        { fontSize: '16px', color: '#e2e8f0', align: 'center' },
      )
      .setOrigin(0.5)
      .setDepth(301);

    const finishButton = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, 'Завершить', {
        fontSize: '18px',
        color: '#0f172a',
        backgroundColor: '#4ade80',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(301)
      .setInteractive({ useHandCursor: true });

    finishButton.on('pointerdown', () => {
      this.fadeOutAndStop(() => {
        this.game.events.emit('minigame-complete', {
          minigameType: 'builder',
          score,
          attempts: this.attempts,
          stressLevel: this.stressLevel,
          difficulty: 'hard',
        });
        this.scene.stop();
      });
    });
  }

  private handleDefeat(): void {
    this.clearHazards();
    this.isCodeChallengeActive = true;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setDepth(300);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'Стресс зашкалил...', {
        fontSize: '26px',
        color: '#f87171',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(301);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, '← Сдаться', {
        fontSize: '16px',
        color: '#0f172a',
        backgroundColor: '#f87171',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(301)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.exitToHub());

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, 'В меню', {
        fontSize: '16px',
        color: '#e2e8f0',
        backgroundColor: '#334155',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(301)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.exitToHub());
  }

  /* ──────────────────────────────────────────────────────────────────
   * Очистка при выходе со сцены
   * ────────────────────────────────────────────────────────────────── */

  private cleanup(): void {
    if (this.activeWordKeyHandler) {
      window.removeEventListener('keydown', this.activeWordKeyHandler);
      this.activeWordKeyHandler = null;
    }
    this.scheduledEvents.forEach((event) => event.remove(false));
    this.scheduledEvents = [];
    this.activeTypewriterTimers.forEach((timer) => timer.remove(false));
    this.activeTypewriterTimers = [];
    this.hazards.forEach((hazard) => this.destroyHazardObjects(hazard));
    this.hazards = [];
    this.captionTween?.stop();
    this.shieldRing?.destroy();
    this.shieldRing = undefined;
    this.isInvisible = false;
    this.hasShield = false;
    this.input.keyboard?.removeAllListeners('keydown-SPACE');
    this.input.keyboard?.removeAllListeners('keydown-ESC');
  }
}