import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI_SLOT_WIDTH, UI_SLOT_HEIGHT, UI_SLOT_GAP, UI_LEVEL_TIMES, UI_STRESS_TICKS, STRESS_BAR_WIDTH, STRESS_BAR_HEIGHT, STRESS_BAR_MAX } from '../../config/constants';

interface UiBlock { id: string; container: Phaser.GameObjects.Container; homeX: number; homeY: number; slotIndex: number | null; }
interface UiSlot { x: number; y: number; occupiedBy: string | null; }

export class UiMinigameScene extends Phaser.Scene {
  private currentLevel = 0;
  private stressLevel = 0;
  private attempts = 1;
  private remainingSeconds = 0;
  
  private blocks: UiBlock[] = [];
  private slots: UiSlot[] = [];
  private correctOrder: string[] = [];
  
  private stressBarFill!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private isGameOver = false;

  public constructor() { super('UiMinigameScene'); }

   public create(data?: { attempts?: number }): void {
    this.currentLevel = 0; this.stressLevel = 0; this.isGameOver = false;
    this.attempts = data?.attempts || 1;
    this.buildBackground(); this.buildHud();
    this.startLevel(this.currentLevel);
	}
  private startLevel(level: number): void {
    this.remainingSeconds = UI_LEVEL_TIMES[level];
    this.blocks.forEach(b => b.container.destroy());
    this.blocks = []; this.slots = [];
    
    if (level > 0) this.stressLevel = Math.max(0, this.stressLevel - 20);
    this.updateStressBar();

    const levelData = this.getLevelData(level);
    this.correctOrder = levelData.order;
    this.statusText.setText(`Уровень ${level + 1}: ${levelData.title}`);

    this.buildSmartphone(levelData.order.length);
    this.buildUiElements(levelData.elements);
    this.setupDragHandlers();

    if (this.countdownTimer) this.countdownTimer.remove();
    this.startCountdown();
  }

  private getLevelData(level: number) {
    if (level === 0) return {
      title: 'Экран Авторизации',
      order: ['logo', 'login', 'pass', 'btn'],
      elements: [
        { id: 'pass', text: '🔒 Пароль', color: 0x334155 },
        { id: 'btn', text: 'Войти', color: 0x2563eb },
        { id: 'logo', text: '⭐ ЛОГОТИП', color: 0x9333ea },
        { id: 'login', text: '👤 Логин', color: 0x334155 }
      ]
    };
    if (level === 1) return {
      title: 'Экран Подписки',
      order: ['title', 'desc', 'check', 'btn'],
      elements: [
        { id: 'btn', text: 'Оплатить', color: 0x16a34a },
        { id: 'title', text: 'ПОДПИСКА PRO', color: 0x2563eb },
        { id: 'check', text: '☐ Я согласен с правилами', color: 0x334155 },
        { id: 'desc', text: 'Доступ ко всем фичам за 99$', color: 0x475569 }
      ]
    };
    return {
      title: 'Удаление аккаунта',
      order: ['warn', 'input', 'cancel', 'delete'],
      elements: [
        { id: 'delete', text: 'Удалить навсегда', color: 0xdc2626 },
        { id: 'warn', text: 'ВНИМАНИЕ! Действие необратимо', color: 0xb91c1c },
        { id: 'cancel', text: 'Отмена (Вернуться)', color: 0x334155 },
        { id: 'input', text: 'Введите ПАРОЛЬ для подтв.', color: 0x475569 }
      ]
    };
  }

  private buildSmartphone(slotsCount: number): void {
    const phoneX = GAME_WIDTH / 2 - 150; const phoneY = GAME_HEIGHT / 2 + 20;
    this.add.rectangle(phoneX, phoneY, 320, 420, 0x1e293b).setStrokeStyle(4, 0x475569, 1);
    this.add.rectangle(phoneX, phoneY - 190, 80, 10, 0x0f172a);
    
    const totalH = slotsCount * (UI_SLOT_HEIGHT + UI_SLOT_GAP) - UI_SLOT_GAP;
    const startY = phoneY - totalH / 2 + 10;
    for (let i = 0; i < slotsCount; i++) {
      const y = startY + i * (UI_SLOT_HEIGHT + UI_SLOT_GAP);
      this.add.rectangle(phoneX, y, UI_SLOT_WIDTH, UI_SLOT_HEIGHT, 0x0f172a).setStrokeStyle(2, 0x334155);
      this.slots.push({ x: phoneX, y, occupiedBy: null });
    }
  }

  private buildUiElements(elements: any[]): void {
    Phaser.Utils.Array.Shuffle(elements);
    const startX = GAME_WIDTH / 2 + 200;
    const totalH = elements.length * (UI_SLOT_HEIGHT + 16) - 16;
    const startY = GAME_HEIGHT / 2 + 20 - totalH / 2;

    elements.forEach((data, i) => {
      const y = startY + i * (UI_SLOT_HEIGHT + 16);
      const rect = this.add.rectangle(0, 0, UI_SLOT_WIDTH, UI_SLOT_HEIGHT, data.color).setStrokeStyle(1, 0xffffff, 0.3);
      const text = this.add.text(0, 0, data.text, { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5, 0.5);
      const container = this.add.container(startX, y, [rect, text]);
      container.setSize(UI_SLOT_WIDTH, UI_SLOT_HEIGHT);
      container.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(container);
      this.blocks.push({ id: data.id, container, homeX: startX, homeY: y, slotIndex: null });
    });
  }

  private setupDragHandlers(): void {
    this.input.off('drag'); this.input.off('dragend');
    this.input.on('dragend', (_p: any, obj: Phaser.GameObjects.Container) => {
      if (this.isGameOver) return;
      const block = this.blocks.find(b => b.container === obj);
      if (!block) return;
      if (block.slotIndex !== null) { this.slots[block.slotIndex].occupiedBy = null; block.slotIndex = null; }

      let nearestIndex = -1;
      let minDist = 40;

      this.slots.forEach((s, i) => {
        if (s.occupiedBy !== null) return;
        const dist = Phaser.Math.Distance.Between(obj.x, obj.y, s.x, s.y);
        if (dist < minDist) { minDist = dist; nearestIndex = i; }
      });

      if (nearestIndex !== -1) {
        const slot = this.slots[nearestIndex];
        obj.setPosition(slot.x, slot.y);
        slot.occupiedBy = block.id;
        block.slotIndex = nearestIndex;
        this.checkWinCondition();
      } else {
        this.tweens.add({ targets: obj, x: block.homeX, y: block.homeY, duration: 150 });
      }
    });
  }

  private checkWinCondition(): void {
    if (this.slots.some(s => s.occupiedBy === null)) return;
    const currentOrder = this.slots.map(s => s.occupiedBy);
    const isCorrect = currentOrder.every((id, idx) => id === this.correctOrder[idx]);

    if (isCorrect) {
      this.cameras.main.flash(300, 34, 197, 94);
      if (this.currentLevel >= 2) this.showFinalResults();
      else { this.currentLevel++; this.startLevel(this.currentLevel); }
    } else {
      this.cameras.main.shake(200, 0.005);
      this.statusText.setText('ОШИБКА: Пользователю неудобно!').setColor('#ef4444');
      this.stressLevel = Math.min(STRESS_BAR_MAX, this.stressLevel + 15);
      this.updateStressBar();
      if (this.stressLevel >= STRESS_BAR_MAX) this.handleGameFail();
      else this.time.delayedCall(1500, () => this.statusText.setText(`Уровень ${this.currentLevel + 1}`).setColor('#fbbf24'));
    }
  }

  private startCountdown(): void {
    const tickRate = UI_STRESS_TICKS[this.currentLevel];
    this.countdownTimer = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.isGameOver) return;
        this.remainingSeconds--;
        this.stressLevel = Math.min(STRESS_BAR_MAX, this.stressLevel + tickRate);
        this.updateTimerText(); this.updateStressBar();
        if (this.remainingSeconds <= 0 || this.stressLevel >= STRESS_BAR_MAX) this.handleGameFail();
      },
    });
  }

  private handleGameFail(): void {
    this.isGameOver = true; this.countdownTimer?.remove();
    this.statusText.setText('ВЫГОРЕЛ! UX получился ужасным.');
    this.cameras.main.shake(500, 0.01);
    this.time.delayedCall(1500, () => this.showGameOverScreen());
  }

  private showGameOverScreen(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x00, 0.85).setOrigin(0, 0).setDepth(200);
    this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 40, 'ДИЗАЙН ПРОВАЛЕН', { fontFamily: 'monospace', fontSize: '32px', color: '#ef4444' }).setOrigin(0.5).setDepth(201);
    const retry = this.add.rectangle(GAME_WIDTH/2 - 120, GAME_HEIGHT/2 + 40, 200, 40, 0x2563eb).setDepth(201).setInteractive();
    this.add.text(GAME_WIDTH/2 - 120, GAME_HEIGHT/2 + 40, 'Пройти заново', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5).setDepth(202);
        retry.on('pointerdown', () => { 
      this.scene.restart({ attempts: this.attempts + 1 }); 
    });
    const exit = this.add.rectangle(GAME_WIDTH/2 + 120, GAME_HEIGHT/2 + 40, 200, 40, 0x374151).setDepth(201).setInteractive();
    this.add.text(GAME_WIDTH/2 + 120, GAME_HEIGHT/2 + 40, 'В меню', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5).setDepth(202);
    exit.on('pointerdown', () => { this.scene.start('CatalogScene'); });
  }

  private showFinalResults(): void {
    this.isGameOver = true; this.countdownTimer?.remove();
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x00, 0.85).setOrigin(0, 0).setDepth(200);
    const score = Math.max(0, 1000 - this.stressLevel * 5 - (this.attempts - 1) * 200);
    this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 60, 'ИДЕАЛЬНЫЙ UX!', { fontFamily: 'monospace', fontSize: '32px', color: '#4ade80' }).setOrigin(0.5).setDepth(201);
    this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 10, `Счёт: ${score} | Попыток: ${this.attempts}`, { fontFamily: 'monospace', fontSize: '18px', color: '#fff' }).setOrigin(0.5).setDepth(201);
    
    const btn = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2 + 60, 200, 44, 0x2563eb).setDepth(201).setInteractive();
    this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 60, 'Завершить', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5).setDepth(202);
    btn.on('pointerdown', () => {
      // ИСПОЛЬЗУЕМ 'builder' чтобы не сломать бэкенд!
      this.game.events.emit('minigame-complete', { minigameType: 'builder', score, attempts: this.attempts, stressLevel: this.stressLevel, difficulty: 'hard' });
      this.scene.stop();
    });
  }

  private buildBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f172a).setOrigin(0, 0);
    this.add.text(GAME_WIDTH/2, 28, 'UX/UI ДИЗАЙН', { fontFamily: 'monospace', fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    const exitBtn = this.add.text(40, 28, '← Сдаться', { fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8' }).setInteractive();
    exitBtn.on('pointerdown', () => this.scene.start('CatalogScene'));
  }
  
  private buildHud(): void {
    const barX = GAME_WIDTH - STRESS_BAR_WIDTH - 24; const barY = 20;
    this.add.text(barX, barY - 18, 'Уровень выгорания', { fontFamily: 'monospace', fontSize: '12px', color: '#f87171' });
    this.add.rectangle(barX, barY, STRESS_BAR_WIDTH, STRESS_BAR_HEIGHT, 0x374151).setOrigin(0, 0);
    this.stressBarFill = this.add.rectangle(barX, barY, 0, STRESS_BAR_HEIGHT, 0xf87171).setOrigin(0, 0);
    this.timerText = this.add.text(24, 50, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' });
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fbbf24' }).setOrigin(0.5, 0.5);
  }

  private updateTimerText(): void { this.timerText.setText(`Дедлайн: ${Math.max(0, this.remainingSeconds)} с`); }
  private updateStressBar(): void { this.stressBarFill.width = STRESS_BAR_WIDTH * (this.stressLevel / STRESS_BAR_MAX); }
}