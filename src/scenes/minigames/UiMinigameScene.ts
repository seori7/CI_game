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
  BOSS_PORTRAIT_SIZE,
  BOSS_TYPEWRITER_MS,
  BOSS_CODE_TYPEWRITER_MS,
  BOSS_BONE_COLOR_NORMAL,
  BOSS_BONE_COLOR_BLUE,
  BOSS_BONE_COLOR_ORANGE,
  BOSS_WORD_CHALLENGE_RELIEF,
  BOSS_WORD_CHALLENGE_FAIL_STRESS,
  BOSS_AUTOPILOT_MS,
  BOSS_ARENA_TOP_ROW_HEIGHT,
  BOSS_ARENA_FOOTER_HEIGHT,
} from '../../config/constants';

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------

type BulletPatternType = 'straight' | 'sine' | 'homing';
type SpawnSide = 'left' | 'right' | 'top' | 'bottom';
type BoneColorMode = 'normal' | 'blue' | 'orange';

interface WordChallenge {
  word: string;
  codeSnippet: string;
  timeLimitMs: number;
}

interface BulletSpawn {
  kind: 'bullet';
  delayMs: number;
  side: SpawnSide;
  speed: number;
  pattern: BulletPatternType;
}
interface BoneWallVSpawn {
  kind: 'boneWallV';
  delayMs: number;
  gapRatio: number;
  fromLeft: boolean;
  colorMode: BoneColorMode;
}
interface BoneWallHSpawn {
  kind: 'boneWallH';
  delayMs: number;
  gapRatio: number;
  fromTop: boolean;
  colorMode: BoneColorMode;
}
interface BlasterSpawn {
  kind: 'blaster';
  delayMs: number;
  orientation: 'horizontal' | 'vertical';
  positionRatio: number;
}
type HazardSpawn = BulletSpawn | BoneWallVSpawn | BoneWallHSpawn | BlasterSpawn;

interface CaptionSpawn {
  atMs: number;
  text: string;
  durationMs?: number;
}

interface WaveConfig {
  title: string;
  masyaTip: string;
  durationMs: number;
  spawns: HazardSpawn[];
  captions: CaptionSpawn[];
  wordChallenges?: WordChallenge[];
}

interface BulletHazard {
  kind: 'bullet';
  obj: Phaser.GameObjects.Shape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  pattern: BulletPatternType;
  sineOffset: number;
  baseX: number;
  baseY: number;
}
interface BoneWallVHazard {
  kind: 'boneWallV';
  segTop: Phaser.GameObjects.Rectangle;
  segBottom: Phaser.GameObjects.Rectangle;
  x: number;
  vx: number;
  gapTop: number;
  gapBottom: number;
  colorMode: BoneColorMode;
}
interface BoneWallHHazard {
  kind: 'boneWallH';
  segLeft: Phaser.GameObjects.Rectangle;
  segRight: Phaser.GameObjects.Rectangle;
  y: number;
  vy: number;
  gapLeft: number;
  gapRight: number;
  colorMode: BoneColorMode;
}
interface BlasterHazard {
  kind: 'blaster';
  orientation: 'horizontal' | 'vertical';
  position: number;
  telegraphObj: Phaser.GameObjects.Rectangle;
  beamObj: Phaser.GameObjects.Rectangle | null;
  state: 'telegraph' | 'firing';
  elapsedMs: number;
}
type Hazard = BulletHazard | BoneWallVHazard | BoneWallHHazard | BlasterHazard;

// ---------------------------------------------------------------------------
// Генератор серии обычных пуль
// ---------------------------------------------------------------------------

function genBullets(
  pattern: BulletPatternType,
  count: number,
  intervalMs: number,
  sides: SpawnSide[],
  speed: number,
  startDelayMs = 0
): BulletSpawn[] {
  const spawns: BulletSpawn[] = [];
  for (let i = 0; i < count; i++) {
    spawns.push({
      kind: 'bullet',
      delayMs: startDelayMs + i * intervalMs,
      side: sides[i % sides.length],
      speed,
      pattern,
    });
  }
  return spawns;
}

// ---------------------------------------------------------------------------
// Конфигурация волн
// ---------------------------------------------------------------------------

const WAVES: WaveConfig[] = [
  {
    title: 'Урок 1: Условие if / else',
    masyaTip: 'Опасность слева? Шагни направо! Условие "если-то" управляет миром.',
    durationMs: 13000,
    spawns: [...genBullets('straight', 7, 1500, ['left', 'right'], 150)],
    captions: [
      { atMs: 300, text: 'if (bullet.side === "left") move("right")' },
      { atMs: 7000, text: 'else move("left")' },
    ],
    wordChallenges: [{ word: 'if', codeSnippet: 'if (danger) autoDodge();', timeLimitMs: 6000 }],
  },
  {
    title: 'Урок 2: Цикл for и синие кости',
    masyaTip: 'Кости повторяются снова и снова — это цикл for! А синие кости бьют только того, кто ДВИЖЕТСЯ — замри вовремя!',
    durationMs: 15000,
    spawns: [
      ...genBullets('straight', 4, 1800, ['top', 'bottom'], 150),
      { kind: 'boneWallV', delayMs: 1500, gapRatio: 0.3, fromLeft: true, colorMode: 'normal' },
      { kind: 'boneWallV', delayMs: 5000, gapRatio: 0.7, fromLeft: false, colorMode: 'blue' },
      { kind: 'boneWallV', delayMs: 8500, gapRatio: 0.3, fromLeft: true, colorMode: 'normal' },
      { kind: 'boneWallV', delayMs: 12000, gapRatio: 0.7, fromLeft: false, colorMode: 'blue' },
    ],
    captions: [
      { atMs: 300, text: 'for (i = 0; i < 4; i++) { spawnBoneWall(gap) }' },
      { atMs: 5200, text: 'СИНИЕ кости бьют, если ты ДВИЖЕШЬСЯ — замри!' },
    ],
    wordChallenges: [{ word: 'for', codeSnippet: 'for (i=0;i<4;i++) autoDodge();', timeLimitMs: 5500 }],
  },
  {
    title: 'Урок 3: Переменная и оранжевые кости',
    masyaTip: 'Треугольник запоминает твою позицию в переменной target. Оранжевые кости бьют, если ты СТОИШЬ — не замирай!',
    durationMs: 17000,
    spawns: [
      ...genBullets('homing', 4, 3000, ['left', 'right'], 130),
      { kind: 'boneWallH', delayMs: 2000, gapRatio: 0.4, fromTop: true, colorMode: 'normal' },
      { kind: 'boneWallH', delayMs: 6500, gapRatio: 0.6, fromTop: false, colorMode: 'orange' },
      { kind: 'blaster', delayMs: 11000, orientation: 'horizontal', positionRatio: 0.5 },
      { kind: 'boneWallH', delayMs: 14000, gapRatio: 0.5, fromTop: true, colorMode: 'orange' },
    ],
    captions: [
      { atMs: 300, text: 'let target = soul.position' },
      { atMs: 6700, text: 'ОРАНЖЕВЫЕ кости бьют, если ты СТОИШЬ — двигайся!' },
      { atMs: 10700, text: 'setTimeout(() => beam.fire(), 850)' },
    ],
    wordChallenges: [
      { word: 'let', codeSnippet: 'let safeSpot = findGap(); autoDodge(safeSpot);', timeLimitMs: 5000 },
    ],
  },
  {
    title: 'Финал: весь код вместе',
    masyaTip: 'Это всё, чему я могла научить! if, for, let — собери это в голове и пиши чит быстрее, чем я атакую!',
    durationMs: 22000,
    spawns: [
      ...genBullets('sine', 6, 1500, ['left', 'right', 'top'], 160),
      { kind: 'boneWallV', delayMs: 1000, gapRatio: 0.25, fromLeft: true, colorMode: 'blue' },
      { kind: 'boneWallH', delayMs: 4200, gapRatio: 0.75, fromTop: false, colorMode: 'orange' },
      { kind: 'blaster', delayMs: 7400, orientation: 'vertical', positionRatio: 0.3 },
      { kind: 'blaster', delayMs: 11800, orientation: 'horizontal', positionRatio: 0.7 },
      { kind: 'boneWallV', delayMs: 15500, gapRatio: 0.5, fromLeft: false, colorMode: 'normal' },
      { kind: 'boneWallH', delayMs: 18500, gapRatio: 0.5, fromTop: true, colorMode: 'blue' },
    ],
    captions: [{ atMs: 300, text: 'combo: if + for + let — всё вместе!' }],
    wordChallenges: [
      { word: 'if', codeSnippet: 'if (danger) autoDodge();', timeLimitMs: 4200 },
      { word: 'else', codeSnippet: 'else stayStill();', timeLimitMs: 4000 },
      { word: 'for', codeSnippet: 'for (i=0;i<2;i++) autoDodge();', timeLimitMs: 3800 },
      { word: 'let', codeSnippet: 'let win = true;', timeLimitMs: 3600 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Сцена
// ---------------------------------------------------------------------------

export class UiMinigameScene extends Phaser.Scene {
  public constructor() {
    super('UiMinigameScene');
  }

  private currentWaveIndex = 0;
  private stressLevel = 0;
  private attempts = 1;
  private isGameOver = false;
  private isCodeChallengeActive = false;
  private isInvulnerable = false;
  private isSoulMovingThisFrame = false;

  private boxLeft = 0;
  private boxRight = 0;
  private boxTop = 0;
  private boxBottom = 0;
  private soulX = 0;
  private soulY = 0;
  private soulSprite!: Phaser.GameObjects.Arc;

  private hazards: Hazard[] = [];
  private scheduledEvents: Phaser.Time.TimerEvent[] = [];
  private activeWordKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private activeDialogueSkipHandler: ((event: KeyboardEvent) => void) | null = null;
  private activeTypewriterTimers: Phaser.Time.TimerEvent[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private stressBarFill!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;

  private captionBg!: Phaser.GameObjects.Rectangle;
  private captionText!: Phaser.GameObjects.Text;
  private captionTween: Phaser.Tweens.Tween | null = null;
  private captionCenterY = 0;

  private topPanelBg!: Phaser.GameObjects.Rectangle;
  private dialogueText!: Phaser.GameObjects.Text;
  private continueIndicator!: Phaser.GameObjects.Text;
  private waveLabel!: Phaser.GameObjects.Text;
  private topPanelCenterY = 0;
  private topPanelHalfHeight = 0;

  public create(data?: { attempts?: number }): void {
    this.currentWaveIndex = 0;
    this.stressLevel = 0;
    this.isGameOver = false;
    this.isCodeChallengeActive = false;
    this.isInvulnerable = false;
    this.attempts = data?.attempts || 1;
    this.hazards = [];
    this.scheduledEvents = [];
    this.activeWordKeyHandler = null;
    this.activeDialogueSkipHandler = null;
    this.activeTypewriterTimers = [];

    this.buildBackground();
    this.computeLayoutAndBuildArena();
    this.buildTopPanel();
    this.buildCaptionBox();
    this.buildHud();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.startWave(0);
  }

  public update(_time: number, delta: number): void {
    if (this.isGameOver || this.isCodeChallengeActive) return;
    const dt = delta / 1000;
    this.isSoulMovingThisFrame = this.moveSoul(dt);
    this.updateHazards(dt, delta);
  }

  // --- Построение сцены ------------------------------------------------------

  private buildBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f172a).setOrigin(0, 0);
    const exitBtn = this.add
      .text(24, 20, '← Сдаться', { fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8' })
      .setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => {
      this.game.events.emit('minigame-exit');
      this.scene.stop();
    });
  }

  private computeLayoutAndBuildArena(): void {
    const topReserved = BOSS_ARENA_TOP_ROW_HEIGHT;
    const footerReserved = BOSS_ARENA_FOOTER_HEIGHT;
    const available = GAME_HEIGHT - topReserved - footerReserved - BOSS_BOX_HEIGHT;
    const panelHeight = Math.max(90, Math.min(BOSS_TOP_PANEL_HEIGHT, available * 0.6));
    this.topPanelHalfHeight = panelHeight / 2;
    const captionHeight = 26;
    const gap = 10;

    const stackTop = topReserved;
    this.topPanelCenterY = stackTop + panelHeight / 2;
    this.captionCenterY = stackTop + panelHeight + gap + captionHeight / 2;
    this.boxTop = stackTop + panelHeight + gap + captionHeight + gap;
    this.boxBottom = this.boxTop + BOSS_BOX_HEIGHT;
    this.boxLeft = GAME_WIDTH / 2 - BOSS_BOX_WIDTH / 2;
    this.boxRight = GAME_WIDTH / 2 + BOSS_BOX_WIDTH / 2;

    this.add
      .rectangle(GAME_WIDTH / 2, (this.boxTop + this.boxBottom) / 2, BOSS_BOX_WIDTH, BOSS_BOX_HEIGHT, 0x000000)
      .setStrokeStyle(3, 0xffffff);

    this.soulX = GAME_WIDTH / 2;
    this.soulY = (this.boxTop + this.boxBottom) / 2;
    this.soulSprite = this.add.circle(this.soulX, this.soulY, BOSS_SOUL_RADIUS, 0xff0000).setDepth(50);
  }

  private buildTopPanel(): void {
    const cx = GAME_WIDTH / 2;
    const cy = this.topPanelCenterY;
    const panelW = Math.min(BOSS_TOP_PANEL_WIDTH, GAME_WIDTH - 60);

    this.topPanelBg = this.add
      .rectangle(cx, cy, panelW, this.topPanelHalfHeight * 2, 0x000000, 0.92)
      .setStrokeStyle(3, 0xffffff)
      .setDepth(100);

    const portraitX = cx - panelW / 2 + BOSS_PORTRAIT_SIZE / 2 + 14;

    if (this.textures.exists('npc_max')) {
      this.add
        .image(portraitX, cy, 'npc_max')
        .setDisplaySize(BOSS_PORTRAIT_SIZE, BOSS_PORTRAIT_SIZE)
        .setDepth(101);
    } else {
      this.add
        .rectangle(portraitX, cy, BOSS_PORTRAIT_SIZE, BOSS_PORTRAIT_SIZE, 0x9333ea)
        .setDepth(101);
      this.add
        .text(portraitX, cy, 'М', { fontFamily: 'monospace', fontSize: '36px', color: '#fff' })
        .setOrigin(0.5)
        .setDepth(102);
    }

    this.add
      .text(portraitX, cy + BOSS_PORTRAIT_SIZE / 2 + 14, 'МАСЯ', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fbbf24',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(101);

    const textX = portraitX + BOSS_PORTRAIT_SIZE / 2 + 20;
    const textAreaWidth = panelW / 2 + panelW / 2 - (textX - (cx - panelW / 2)) - 20;

    this.dialogueText = this.add
      .text(textX, cy, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e2e8f0',
        wordWrap: { width: textAreaWidth },
      })
      .setOrigin(0, 0.5)
      .setDepth(101);

    this.continueIndicator = this.add
      .text(cx + panelW / 2 - 24, cy + this.topPanelHalfHeight - 16, '▼', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#4ade80',
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setVisible(false);

    this.waveLabel = this.add
      .text(cx - panelW / 2 + 10, cy - this.topPanelHalfHeight + 10, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#64748b',
      })
      .setDepth(101);
  }

  private buildCaptionBox(): void {
    this.captionBg = this.add
      .rectangle(GAME_WIDTH / 2, this.captionCenterY, GAME_WIDTH - 120, 24, 0x0f172a, 0.85)
      .setStrokeStyle(1, 0x334155)
      .setDepth(90)
      .setAlpha(0);
    this.captionText = this.add
      .text(GAME_WIDTH / 2, this.captionCenterY, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#4ade80',
      })
      .setOrigin(0.5)
      .setDepth(91)
      .setAlpha(0);
  }

  private showCaption(text: string, durationMs = BOSS_CAPTION_FADE_MS): void {
    this.captionText.setText(text);
    this.captionBg.setAlpha(0.85);
    this.captionText.setAlpha(1);
    if (this.captionTween) this.captionTween.remove();
    this.captionTween = this.tweens.add({
      targets: [this.captionBg, this.captionText],
      alpha: 0,
      delay: durationMs,
      duration: 400,
    });
  }

  private buildHud(): void {
    const barX = GAME_WIDTH - STRESS_BAR_WIDTH - 24;
    const barY = 20;
    this.add.text(barX, barY - 18, 'Уровень опасности', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f87171',
    });
    this.add.rectangle(barX, barY, STRESS_BAR_WIDTH, STRESS_BAR_HEIGHT, 0x374151).setOrigin(0, 0);
    this.stressBarFill = this.add
      .rectangle(barX, barY, 0, STRESS_BAR_HEIGHT, 0xf87171)
      .setOrigin(0, 0);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - BOSS_ARENA_FOOTER_HEIGHT / 2, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#fbbf24',
      })
      .setOrigin(0.5, 0.5);
  }

  // --- Печатающийся текст (typewriter) ----------------------------------------

  private runTypewriter(
    target: Phaser.GameObjects.Text,
    fullText: string,
    speedMs: number,
    onComplete: () => void
  ): void {
    target.setText('');
    let idx = 0;
    const timer = this.time.addEvent({
      delay: speedMs,
      loop: true,
      callback: () => {
        idx++;
        target.setText(fullText.slice(0, idx));
        if (idx >= fullText.length) {
          timer.remove();
          this.activeTypewriterTimers = this.activeTypewriterTimers.filter((t) => t !== timer);
          onComplete();
        }
      },
    });
    this.activeTypewriterTimers.push(timer);
  }

  // --- Движение игрока --------------------------------------------------------

  private moveSoul(dt: number): boolean {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    const isMoving = dx !== 0 || dy !== 0;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.soulX = Phaser.Math.Clamp(
      this.soulX + dx * BOSS_SOUL_SPEED * dt,
      this.boxLeft + BOSS_SOUL_RADIUS,
      this.boxRight - BOSS_SOUL_RADIUS
    );
    this.soulY = Phaser.Math.Clamp(
      this.soulY + dy * BOSS_SOUL_SPEED * dt,
      this.boxTop + BOSS_SOUL_RADIUS,
      this.boxBottom - BOSS_SOUL_RADIUS
    );
    this.soulSprite.setPosition(this.soulX, this.soulY);

    return isMoving;
  }

  // --- Спавн опасностей --------------------------------------------------------

  private spawnBullet(side: SpawnSide, speed: number, pattern: BulletPatternType): void {
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;
    const margin = 20;

    switch (side) {
      case 'left':
        x = this.boxLeft - margin;
        y = Phaser.Math.Between(this.boxTop + 10, this.boxBottom - 10);
        vx = speed;
        break;
      case 'right':
        x = this.boxRight + margin;
        y = Phaser.Math.Between(this.boxTop + 10, this.boxBottom - 10);
        vx = -speed;
        break;
      case 'top':
        y = this.boxTop - margin;
        x = Phaser.Math.Between(this.boxLeft + 10, this.boxRight - 10);
        vy = speed;
        break;
      case 'bottom':
        y = this.boxBottom + margin;
        x = Phaser.Math.Between(this.boxLeft + 10, this.boxRight - 10);
        vy = -speed;
        break;
    }

    let shape: Phaser.GameObjects.Shape;
    if (pattern === 'homing') {
      const r = BOSS_BULLET_RADIUS;
      shape = this.add.triangle(x, y, 0, -r, -r, r, r, r, 0xef4444);
    } else if (pattern === 'sine') {
      shape = this.add
        .rectangle(x, y, BOSS_BULLET_RADIUS * 1.6, BOSS_BULLET_RADIUS * 1.6, 0xfbbf24)
        .setAngle(45);
    } else {
      shape = this.add.circle(x, y, BOSS_BULLET_RADIUS, 0xffffff);
    }

    this.hazards.push({
      kind: 'bullet',
      obj: shape,
      x,
      y,
      vx,
      vy,
      speed,
      pattern,
      sineOffset: Math.random() * Math.PI * 2,
      baseX: x,
      baseY: y,
    });
  }

  private boneColor(mode: BoneColorMode): number {
    if (mode === 'blue') return BOSS_BONE_COLOR_BLUE;
    if (mode === 'orange') return BOSS_BONE_COLOR_ORANGE;
    return BOSS_BONE_COLOR_NORMAL;
  }

  private spawnBoneWallV(gapRatio: number, fromLeft: boolean, colorMode: BoneColorMode): void {
    const gapSize = BOSS_BONE_GAP_SIZE;
    const gapCenter = this.boxTop + gapRatio * BOSS_BOX_HEIGHT;
    const gapTop = Phaser.Math.Clamp(gapCenter - gapSize / 2, this.boxTop, this.boxBottom - gapSize);
    const gapBottom = gapTop + gapSize;
    const startX = fromLeft ? this.boxLeft - 40 : this.boxRight + 40;
    const vx = fromLeft ? BOSS_BONE_SPEED : -BOSS_BONE_SPEED;
    const color = this.boneColor(colorMode);

    const topHeight = Math.max(gapTop - this.boxTop, 1);
    const bottomHeight = Math.max(this.boxBottom - gapBottom, 1);

    const segTop = this.add.rectangle(startX, this.boxTop + topHeight / 2, BOSS_BONE_THICKNESS, topHeight, color);
    const segBottom = this.add.rectangle(startX, gapBottom + bottomHeight / 2, BOSS_BONE_THICKNESS, bottomHeight, color);

    this.hazards.push({ kind: 'boneWallV', segTop, segBottom, x: startX, vx, gapTop, gapBottom, colorMode });
  }

  private spawnBoneWallH(gapRatio: number, fromTop: boolean, colorMode: BoneColorMode): void {
    const gapSize = BOSS_BONE_GAP_SIZE;
    const gapCenter = this.boxLeft + gapRatio * BOSS_BOX_WIDTH;
    const gapLeft = Phaser.Math.Clamp(gapCenter - gapSize / 2, this.boxLeft, this.boxRight - gapSize);
    const gapRight = gapLeft + gapSize;
    const startY = fromTop ? this.boxTop - 40 : this.boxBottom + 40;
    const vy = fromTop ? BOSS_BONE_SPEED : -BOSS_BONE_SPEED;
    const color = this.boneColor(colorMode);

    const leftWidth = Math.max(gapLeft - this.boxLeft, 1);
    const rightWidth = Math.max(this.boxRight - gapRight, 1);

    const segLeft = this.add.rectangle(this.boxLeft + leftWidth / 2, startY, leftWidth, BOSS_BONE_THICKNESS, color);
    const segRight = this.add.rectangle(gapRight + rightWidth / 2, startY, rightWidth, BOSS_BONE_THICKNESS, color);

    this.hazards.push({ kind: 'boneWallH', segLeft, segRight, y: startY, vy, gapLeft, gapRight, colorMode });
  }

  private spawnBlaster(orientation: 'horizontal' | 'vertical', positionRatio: number): void {
    let telegraphObj: Phaser.GameObjects.Rectangle;
    let position: number;

    if (orientation === 'horizontal') {
      position = this.boxTop + positionRatio * BOSS_BOX_HEIGHT;
      telegraphObj = this.add.rectangle((this.boxLeft + this.boxRight) / 2, position, BOSS_BOX_WIDTH, 4, 0xef4444, 0.6);
    } else {
      position = this.boxLeft + positionRatio * BOSS_BOX_WIDTH;
      telegraphObj = this.add.rectangle(position, (this.boxTop + this.boxBottom) / 2, 4, BOSS_BOX_HEIGHT, 0xef4444, 0.6);
    }

    this.hazards.push({
      kind: 'blaster',
      orientation,
      position,
      telegraphObj,
      beamObj: null,
      state: 'telegraph',
      elapsedMs: 0,
    });
  }

  // --- Обновление опасностей ----------------------------------------------------

  private isOutOfBox(x: number, y: number): boolean {
    return (
      x < this.boxLeft - 60 || x > this.boxRight + 60 || y < this.boxTop - 60 || y > this.boxBottom + 60
    );
  }

  private updateBulletPosition(h: BulletHazard, dt: number): void {
    switch (h.pattern) {
      case 'straight':
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        break;
      case 'sine': {
        h.sineOffset += dt * 5;
        const wobble = Math.sin(h.sineOffset) * 25;
        if (h.vx !== 0) {
          h.x += h.vx * dt;
          h.y = h.baseY + wobble;
        } else {
          h.y += h.vy * dt;
          h.x = h.baseX + wobble;
        }
        break;
      }
      case 'homing': {
        const angle = Phaser.Math.Angle.Between(h.x, h.y, this.soulX, this.soulY);
        h.vx = Math.cos(angle) * h.speed;
        h.vy = Math.sin(angle) * h.speed;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        break;
      }
    }
    h.obj.setPosition(h.x, h.y);
  }

  private updateHazards(dt: number, deltaMs: number): void {
    const isMoving = this.isSoulMovingThisFrame;

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];

      if (h.kind === 'bullet') {
        this.updateBulletPosition(h, dt);
        if (this.isOutOfBox(h.x, h.y)) {
          h.obj.destroy();
          this.hazards.splice(i, 1);
          continue;
        }
        if (!this.isInvulnerable) {
          const dist = Phaser.Math.Distance.Between(h.x, h.y, this.soulX, this.soulY);
          if (dist < BOSS_SOUL_RADIUS + BOSS_BULLET_RADIUS) {
            this.applyHitDamage(0.006, 100);
            h.obj.destroy();
            this.hazards.splice(i, 1);
          }
        }
        continue;
      }

      if (h.kind === 'boneWallV') {
        h.x += h.vx * dt;
        h.segTop.x = h.x;
        h.segBottom.x = h.x;
        if (h.x < this.boxLeft - 80 || h.x > this.boxRight + 80) {
          h.segTop.destroy();
          h.segBottom.destroy();
          this.hazards.splice(i, 1);
          continue;
        }
        if (!this.isInvulnerable) {
          const withinX = Math.abs(this.soulX - h.x) < BOSS_BONE_THICKNESS / 2 + BOSS_SOUL_RADIUS;
          const insideGap =
            this.soulY > h.gapTop + BOSS_SOUL_RADIUS && this.soulY < h.gapBottom - BOSS_SOUL_RADIUS;
          const colorSafe =
            (h.colorMode === 'blue' && !isMoving) || (h.colorMode === 'orange' && isMoving);
          if (withinX && !insideGap && !colorSafe) this.applyHitDamage(0.01, 150);
        }
        continue;
      }

      if (h.kind === 'boneWallH') {
        h.y += h.vy * dt;
        h.segLeft.y = h.y;
        h.segRight.y = h.y;
        if (h.y < this.boxTop - 80 || h.y > this.boxBottom + 80) {
          h.segLeft.destroy();
          h.segRight.destroy();
          this.hazards.splice(i, 1);
          continue;
        }
        if (!this.isInvulnerable) {
          const withinY = Math.abs(this.soulY - h.y) < BOSS_BONE_THICKNESS / 2 + BOSS_SOUL_RADIUS;
          const insideGap =
            this.soulX > h.gapLeft + BOSS_SOUL_RADIUS && this.soulX < h.gapRight - BOSS_SOUL_RADIUS;
          const colorSafe =
            (h.colorMode === 'blue' && !isMoving) || (h.colorMode === 'orange' && isMoving);
          if (withinY && !insideGap && !colorSafe) this.applyHitDamage(0.01, 150);
        }
        continue;
      }

      h.elapsedMs += deltaMs;
      if (h.state === 'telegraph' && h.elapsedMs >= BOSS_BLASTER_TELEGRAPH_MS) {
        h.telegraphObj.destroy();
        const thickness = BOSS_BLASTER_THICKNESS;
        if (h.orientation === 'horizontal') {
          h.beamObj = this.add.rectangle(
            (this.boxLeft + this.boxRight) / 2,
            h.position,
            BOSS_BOX_WIDTH,
            thickness,
            0xff4040,
            0.9
          );
        } else {
          h.beamObj = this.add.rectangle(
            h.position,
            (this.boxTop + this.boxBottom) / 2,
            thickness,
            BOSS_BOX_HEIGHT,
            0xff4040,
            0.9
          );
        }
        h.state = 'firing';
        h.elapsedMs = 0;

        if (!this.isInvulnerable) {
          const hit =
            h.orientation === 'horizontal'
              ? Math.abs(this.soulY - h.position) < thickness / 2 + BOSS_SOUL_RADIUS
              : Math.abs(this.soulX - h.position) < thickness / 2 + BOSS_SOUL_RADIUS;
          if (hit) this.applyHitDamage(0.02, 300);
        }
      } else if (h.state === 'firing' && h.elapsedMs >= BOSS_BLASTER_BEAM_MS) {
        h.beamObj?.destroy();
        this.hazards.splice(i, 1);
      }
    }
  }

  private applyHitDamage(shakeIntensity: number = 0.01, shakeDuration: number = 150): void {
    this.stressLevel = Math.min(STRESS_BAR_MAX, this.stressLevel + BOSS_HIT_STRESS);
    this.updateStressBar();
    this.cameras.main.shake(shakeDuration, shakeIntensity);

    this.isInvulnerable = true;

    const halfCycles = 8;
    const halfCycleDuration = BOSS_INVULNERABILITY_MS / halfCycles;

    this.soulSprite.setAlpha(1);
    this.tweens.add({
      targets: this.soulSprite,
      alpha: 0.2,
      duration: halfCycleDuration,
      yoyo: true,
      repeat: halfCycles / 2 - 1,
      onComplete: () => this.soulSprite.setAlpha(1),
    });

    this.time.delayedCall(BOSS_INVULNERABILITY_MS, () => {
      this.isInvulnerable = false;
      this.soulSprite.setAlpha(1);
    });

    if (this.stressLevel >= STRESS_BAR_MAX) this.handleGameFail();
  }

  private clearHazards(): void {
    this.hazards.forEach((h) => {
      if (h.kind === 'bullet') h.obj.destroy();
      else if (h.kind === 'boneWallV') {
        h.segTop.destroy();
        h.segBottom.destroy();
      } else if (h.kind === 'boneWallH') {
        h.segLeft.destroy();
        h.segRight.destroy();
      } else {
        h.telegraphObj.destroy();
        h.beamObj?.destroy();
      }
    });
    this.hazards = [];
  }

  private clearScheduledEvents(): void {
    this.scheduledEvents.forEach((e) => e.remove());
    this.scheduledEvents = [];
  }

  // --- Волны ---------------------------------------------------------------------

  private startWave(index: number): void {
    this.currentWaveIndex = index;
    this.clearHazards();
    this.clearScheduledEvents();
    const wave = WAVES[index];
    this.waveLabel.setText(`Волна ${index + 1}/${WAVES.length}`);

    this.showBossDialogue(wave.title, wave.masyaTip, () => {
      wave.spawns.forEach((spawn) => {
        const ev = this.time.delayedCall(spawn.delayMs, () => {
          if (this.isGameOver) return;
          if (spawn.kind === 'bullet') this.spawnBullet(spawn.side, spawn.speed, spawn.pattern);
          else if (spawn.kind === 'boneWallV') this.spawnBoneWallV(spawn.gapRatio, spawn.fromLeft, spawn.colorMode);
          else if (spawn.kind === 'boneWallH') this.spawnBoneWallH(spawn.gapRatio, spawn.fromTop, spawn.colorMode);
          else this.spawnBlaster(spawn.orientation, spawn.positionRatio);
        });
        this.scheduledEvents.push(ev);
      });

      wave.captions.forEach((cap) => {
        const ev = this.time.delayedCall(cap.atMs, () => this.showCaption(cap.text, cap.durationMs));
        this.scheduledEvents.push(ev);
      });

      if (wave.wordChallenges && wave.wordChallenges.length > 0) {
        const challenges = wave.wordChallenges;
        const step = wave.durationMs / (challenges.length + 1);
        challenges.forEach((challenge, i) => {
          const ev = this.time.delayedCall(step * (i + 1), () => this.showWordChallenge(challenge));
          this.scheduledEvents.push(ev);
        });
      }

      const endEv = this.time.delayedCall(wave.durationMs, () => this.onWaveComplete());
      this.scheduledEvents.push(endEv);
    });
  }

  private onWaveComplete(): void {
    if (this.isGameOver) return;
    this.clearHazards();
    this.stressLevel = Math.max(0, this.stressLevel - BOSS_WAVE_BREATHER_RELIEF);
    this.updateStressBar();

    if (this.currentWaveIndex >= WAVES.length - 1) {
      this.showFinalResults();
    } else {
      this.startWave(this.currentWaveIndex + 1);
    }
  }

  private showBossDialogue(title: string, tip: string, onDone: () => void): void {
    this.statusText.setText(title).setColor('#fbbf24');
    this.continueIndicator.setVisible(false);

    const fullText = tip;
    let typingComplete = false;

    const proceed = () => {
      if (this.activeDialogueSkipHandler) {
        this.input.keyboard?.off('keydown', this.activeDialogueSkipHandler);
        this.activeDialogueSkipHandler = null;
      }
      this.topPanelBg.off('pointerdown', onPanelClick);
      this.continueIndicator.setVisible(false);
      onDone();
    };

    const onPanelClick = () => {
      if (typingComplete) proceed();
    };

    const skipHandler = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code !== 'Space') return;
      if (!typingComplete) {
        typingComplete = true;
        this.dialogueText.setText(fullText);
        this.continueIndicator.setVisible(true);
      } else {
        proceed();
      }
    };

    this.activeDialogueSkipHandler = skipHandler;
    this.input.keyboard?.on('keydown', skipHandler);
    this.topPanelBg.setInteractive({ useHandCursor: true });
    this.topPanelBg.on('pointerdown', onPanelClick);

    this.runTypewriter(this.dialogueText, fullText, BOSS_TYPEWRITER_MS, () => {
      typingComplete = true;
      this.continueIndicator.setVisible(true);
    });
  }

  private showWordChallenge(challenge: WordChallenge): void {
    if (this.isGameOver) return;
    this.isCodeChallengeActive = true;

    const panelY = (this.boxTop + this.boxBottom) / 2;
    const panelX = GAME_WIDTH / 2;

    const panelBg = this.add
      .rectangle(panelX, panelY, 300, 110, 0x0f172a, 0.97)
      .setStrokeStyle(3, 0xfbbf24)
      .setDepth(170);
    const hintText = this.add
      .text(panelX, panelY - 34, 'Напечатай слово:', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setDepth(171);

    const letters = challenge.word.split('');
    const letterSpacing = 26;
    const startX = panelX - ((letters.length - 1) * letterSpacing) / 2;
    const letterObjs: Phaser.GameObjects.Text[] = letters.map((ch, i) =>
      this.add
        .text(startX + i * letterSpacing, panelY - 5, ch.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: '#64748b',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(171)
    );

    const timerBarWidth = 220;
    const timerBarBg = this.add
      .rectangle(panelX, panelY + 30, timerBarWidth, 8, 0x374151)
      .setDepth(170);
    const timerBarFill = this.add
      .rectangle(panelX - timerBarWidth / 2, panelY + 30, timerBarWidth, 8, 0xfbbf24)
      .setOrigin(0, 0.5)
      .setDepth(171);

    let typedIndex = 0;
    let resolved = false;

    const allPanelObjects = [panelBg, hintText, ...letterObjs, timerBarBg, timerBarFill];
    allPanelObjects.forEach((obj) => obj.setScale(0.3).setAlpha(0));
    this.tweens.add({
      targets: allPanelObjects,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });

    const timerTween = this.tweens.add({
      targets: timerBarFill,
      width: 0,
      duration: challenge.timeLimitMs,
      onComplete: () => finish(false),
    });

    const cleanupUI = () => {
      panelBg.destroy();
      hintText.destroy();
      letterObjs.forEach((o) => o.destroy());
      timerBarBg.destroy();
      timerBarFill.destroy();
      timerTween.remove();
      if (this.activeWordKeyHandler) {
        this.input.keyboard?.off('keydown', this.activeWordKeyHandler);
        this.activeWordKeyHandler = null;
      }
    };

    const finish = (success: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanupUI();

      if (success) {
        this.stressLevel = Math.max(0, this.stressLevel - BOSS_WORD_CHALLENGE_RELIEF);
        this.updateStressBar();
        this.cameras.main.flash(120, 74, 222, 128);
        this.runAutopilotReward(challenge.codeSnippet, () => {
          this.isCodeChallengeActive = false;
        });
      } else {
        this.stressLevel = Math.min(STRESS_BAR_MAX, this.stressLevel + BOSS_WORD_CHALLENGE_FAIL_STRESS);
        this.updateStressBar();
        this.cameras.main.shake(200, 0.008);
        this.isCodeChallengeActive = false;
        if (this.stressLevel >= STRESS_BAR_MAX) this.handleGameFail();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const expected = challenge.word[typedIndex]?.toLowerCase();
      if (!expected) return;
      const pressed = event.key.toLowerCase();
      if (pressed === expected) {
        letterObjs[typedIndex].setColor('#4ade80');
        typedIndex++;
        if (typedIndex >= challenge.word.length) finish(true);
      } else if (pressed.length === 1) {
        this.cameras.main.shake(70, 0.002);
      }
    };

    this.activeWordKeyHandler = onKeyDown;
    this.input.keyboard?.on('keydown', onKeyDown);
  }

  private runAutopilotReward(codeSnippet: string, onComplete: () => void): void {
    this.showCaption('', 999999);
    this.runTypewriter(this.captionText, `> ${codeSnippet}`, BOSS_CODE_TYPEWRITER_MS, () => {
      this.captionBg.setAlpha(0.85);

      const angle = Math.random() * Math.PI * 2;
      const dist = 90;
      const targetX = Phaser.Math.Clamp(
        this.soulX + Math.cos(angle) * dist,
        this.boxLeft + BOSS_SOUL_RADIUS + 10,
        this.boxRight - BOSS_SOUL_RADIUS - 10
      );
      const targetY = Phaser.Math.Clamp(
        this.soulY + Math.sin(angle) * dist,
        this.boxTop + BOSS_SOUL_RADIUS + 10,
        this.boxBottom - BOSS_SOUL_RADIUS - 10
      );

      const proxy = { x: this.soulX, y: this.soulY };
      this.tweens.add({
        targets: proxy,
        x: targetX,
        y: targetY,
        duration: BOSS_AUTOPILOT_MS,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.soulX = proxy.x;
          this.soulY = proxy.y;
          this.soulSprite.setPosition(this.soulX, this.soulY);
        },
        onComplete: () => {
          this.time.delayedCall(300, () => {
            if (this.captionTween) this.captionTween.remove();
            this.captionTween = this.tweens.add({
              targets: [this.captionBg, this.captionText],
              alpha: 0,
              duration: 300,
            });
            onComplete();
          });
        },
      });
    });
  }

  // --- Исходы боя ------------------------------------------------------------------

  private handleGameFail(): void {
    this.isGameOver = true;
    this.clearScheduledEvents();
    this.statusText.setText('ПОЙМАЛА УРОН! Чит не сработал.');
    this.cameras.main.shake(500, 0.01);
    this.time.delayedCall(1200, () => this.showGameOverScreen());
  }

  private showGameOverScreen(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setOrigin(0, 0).setDepth(200);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'БОЙ ПРОВАЛЕН', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ef4444',
      })
      .setOrigin(0.5)
      .setDepth(201);

    const retry = this.add
      .rectangle(GAME_WIDTH / 2 - 120, GAME_HEIGHT / 2 + 40, 200, 40, 0x2563eb)
      .setDepth(201)
      .setInteractive();
    this.add
      .text(GAME_WIDTH / 2 - 120, GAME_HEIGHT / 2 + 40, 'Пройти заново', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff',
      })
      .setOrigin(0.5)
      .setDepth(202);
    retry.on('pointerdown', () => {
      this.scene.restart({ attempts: this.attempts + 1 });
    });

    const exit = this.add
      .rectangle(GAME_WIDTH / 2 + 120, GAME_HEIGHT / 2 + 40, 200, 40, 0x374151)
      .setDepth(201)
      .setInteractive();
    this.add
      .text(GAME_WIDTH / 2 + 120, GAME_HEIGHT / 2 + 40, 'В меню', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff',
      })
      .setOrigin(0.5)
      .setDepth(202);
    exit.on('pointerdown', () => {
      this.game.events.emit('minigame-exit');
      this.scene.stop();
    });
  }

  private showFinalResults(): void {
    this.isGameOver = true;
    this.clearScheduledEvents();
    this.clearHazards();

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setOrigin(0, 0).setDepth(200);
    const score = Math.max(0, 1000 - this.stressLevel * 5 - (this.attempts - 1) * 200);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'ЧИТ НАПИСАН! БОСС ПОВЕРЖЕН!', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#4ade80',
      })
      .setOrigin(0.5)
      .setDepth(201);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, `Счёт: ${score} | Попыток: ${this.attempts}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#fff',
      })
      .setOrigin(0.5)
      .setDepth(201);

    const btn = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 200, 44, 0x2563eb)
      .setDepth(201)
      .setInteractive();
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'Завершить', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff',
      })
      .setOrigin(0.5)
      .setDepth(202);
    btn.on('pointerdown', () => {
      this.game.events.emit('minigame-complete', {
        minigameType: 'builder',
        score,
        attempts: this.attempts,
        stressLevel: this.stressLevel,
        difficulty: 'hard',
      });
      this.scene.stop();
    });
  }

  private updateStressBar(): void {
    const targetWidth = STRESS_BAR_WIDTH * (this.stressLevel / STRESS_BAR_MAX);
    this.tweens.add({
      targets: this.stressBarFill,
      width: targetWidth,
      duration: 250,
      ease: 'Cubic.easeOut',
    });
  }

  private cleanup(): void {
    this.clearScheduledEvents();
    this.clearHazards();
    if (this.activeWordKeyHandler) {
      this.input.keyboard?.off('keydown', this.activeWordKeyHandler);
      this.activeWordKeyHandler = null;
    }
    if (this.activeDialogueSkipHandler) {
      this.input.keyboard?.off('keydown', this.activeDialogueSkipHandler);
      this.activeDialogueSkipHandler = null;
    }
    this.activeTypewriterTimers.forEach((t) => t.remove());
    this.activeTypewriterTimers = [];
    if (this.captionTween) {
      this.captionTween.remove();
      this.captionTween = null;
    }
  }
}