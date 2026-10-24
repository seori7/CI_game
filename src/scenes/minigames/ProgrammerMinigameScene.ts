import Phaser from 'phaser';
import {
  COLOR_TEXT_PRIMARY,
  GAME_HEIGHT,
  GAME_WIDTH,
  PROGRAMMER_LEVEL_TIMES,
  PROGRAMMER_STRESS_TICKS,
  PROGRAMMER_PENALTY_STRESS,
  BROWSER_WIDTH,
  BROWSER_HEIGHT,
  CHECKLIST_WIDTH,
  COLOR_BROWSER_BG,
  COLOR_BROWSER_UI,
  COLOR_BUG_FOUND,
  COLOR_BUG_HOVER,
  COLOR_TEXT_MUTED,
  COLOR_TEXT_DANGER,
  STRESS_BAR_HEIGHT,
  STRESS_BAR_MAX,
  STRESS_BAR_WIDTH,
} from '../../config/constants';
import type { MinigameResult } from '../../types/MinigameResult';

/** Описание одной уязвимости на макете. */
interface SecurityBug {
  id: string;
  name: string;
  desc: string;
  isFound: boolean;
  rect?: Phaser.GameObjects.Rectangle; 
  checkText?: Phaser.GameObjects.Text; 
}

const EXIT_BUTTON_WIDTH = 160;
const EXIT_BUTTON_HEIGHT = 32;
const EXIT_BUTTON_X = 24 + EXIT_BUTTON_WIDTH / 2;
const EXIT_BUTTON_Y = 54;

export class ProgrammerMinigameScene extends Phaser.Scene {
  private currentLevel = 0; // 0 = Junior, 1 = Middle, 2 = Senior
  private stressLevel = 0;
  private attempts = 1;
  private remainingSeconds = 0;
  private foundBugsCount = 0;
  private totalBugsInLevel = 0;
  
  private bugs: SecurityBug[] = [];
  
  private stressBarFill!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  
  // Контейнеры для удобной очистки при смене уровней
  private browserContainer!: Phaser.GameObjects.Container;
  private checklistContainer!: Phaser.GameObjects.Container;
  
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private exitKey!: Phaser.Input.Keyboard.Key;
  
  private isGameOver = false;
  private isLevelTransition = false;

  public constructor() {
    super('ProgrammerMinigameScene');
  }

  // ФИКС: Добавляем прием данных, чтобы сохранять количество попыток при рестарте
  public create(data?: { attempts?: number }): void {
    this.currentLevel = 0;
    this.stressLevel = 0;
    this.attempts = data?.attempts || 1; // Берем переданные попытки или 1
    this.isGameOver = false;

    this.buildBackground();
    this.buildHud();
    this.buildExitControl();
    
    this.browserContainer = this.add.container(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2);
    this.checklistContainer = this.add.container(GAME_WIDTH - 150, GAME_HEIGHT / 2);

    this.startLevel(this.currentLevel);
  }

  public override update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.exitToHub();
    }

    // Эффект "выгорания": если стресс > 70%, экран начинает слегка дрожать (эффект паники)
    if (this.stressLevel > 70 && !this.isGameOver && !this.isLevelTransition) {
      const shakeX = Phaser.Math.Between(-2, 2);
      const shakeY = Phaser.Math.Between(-2, 2);
      this.browserContainer.setPosition(GAME_WIDTH / 2 - 160 + shakeX, GAME_HEIGHT / 2 + shakeY);
    } else {
      this.browserContainer.setPosition(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2);
    }
  }

  /** Инициализация конкретного уровня. */
  private startLevel(levelIndex: number): void {
    this.isLevelTransition = false;
    this.foundBugsCount = 0;
    this.remainingSeconds = PROGRAMMER_LEVEL_TIMES[levelIndex];
    this.bugs = [];
    
    // Немного "лечим" стресс между уровнями как награду
    if (levelIndex > 0) {
      this.stressLevel = Math.max(0, this.stressLevel - 20);
      this.updateStressBar();
    }

    this.browserContainer.removeAll(true);
    this.checklistContainer.removeAll(true);

    this.buildBrowserWindow();

    switch (levelIndex) {
      case 0: this.buildLevel1(); break;
      case 1: this.buildLevel2(); break;
      case 2: this.buildLevel3(); break;
    }

    this.totalBugsInLevel = this.bugs.length;
    this.buildChecklist();
    
    const titles = ['Ур 1: Форма регистрации (Junior)', 'Ур 2: Настройки профиля (Middle)', 'Ур 3: Оплата (Senior)'];
    this.statusText.setText(titles[levelIndex]);

    if (this.countdownTimer) this.countdownTimer.remove();
    this.startCountdown();
  }

  // --- УРОВНИ ---

  private buildLevel1(): void {
    this.addMockupText(0, -140, '🌐 http://profpath.local/signup', { backgroundColor: '#334155' }, true, {
      id: 'http', name: 'Нет HTTPS', desc: 'Данные передаются в открытом виде.'
    });
    this.addMockupText(0, -90, 'Создание аккаунта', { fontSize: '20px', color: '#ffffff' });
    this.addMockupText(-50, -40, 'Имя: [ Иван ]', { color: COLOR_TEXT_MUTED });
    
    // Баг: Пароль в открытом виде
    this.addMockupText(-50, 10, 'Пароль: [ 123456 ]', { color: COLOR_TEXT_DANGER }, true, {
      id: 'pass', name: 'Слабый открытый пароль', desc: 'Пароль не скрыт и слишком прост.'
    });

    // Баг: Согласие по умолчанию
    this.addMockupText(0, 70, '☑ Подписаться на кредиты (обязательно)', { fontSize: '12px', color: COLOR_TEXT_DANGER }, true, {
      id: 'ux', name: 'Тёмный паттерн UX', desc: 'Скрытые платные услуги по умолчанию.'
    });

    this.addMockupText(0, 130, 'ОТПРАВИТЬ', { backgroundColor: '#2563eb', padding: {x: 30, y: 10}, color: '#fff' });
  }

  private buildLevel2(): void {
    this.addMockupText(0, -140, '🌐 https://profpath.local/settings', { backgroundColor: '#334155' });
    this.addMockupText(0, -90, 'Настройки приватности', { fontSize: '20px', color: '#ffffff' });

    // Баг: Публичная геопозиция
    this.addMockupText(0, -40, 'Показывать моё местоположение: [ВКЛ]', { color: COLOR_TEXT_DANGER }, true, {
      id: 'geo', name: 'Утечка геоданных', desc: 'Геопозиция доступна всем в интернете.'
    });

    this.addMockupText(0, 10, 'Двухфакторная авторизация: [ВЫКЛ]', { color: COLOR_TEXT_MUTED });

    // Баг: Токен в интерфейсе
    this.addMockupText(0, 60, 'Ваш API токен: eyJhbGciOiJIUzI1Ni...', { fontSize: '12px', color: COLOR_TEXT_DANGER }, true, {
      id: 'token', name: 'Скомпрометирован токен', desc: 'Токен доступа выведен на экран.'
    });

    // Баг: Скрытая кнопка удаления
    this.addMockupText(180, 150, 'удалить аккаунт', { fontSize: '8px', color: '#334155' }, true, { // Цвет сливается с фоном
      id: 'del', name: 'Невозможно удалить аккаунт', desc: 'Кнопка намеренно спрятана от юзера.'
    });
  }

  private buildLevel3(): void {
    this.addMockupText(0, -140, '🌐 http://profpath.local/checkout?debug=true', { backgroundColor: '#334155' }, true, {
      id: 'debug', name: 'Оставлен Debug Mode', desc: 'Режим отладки открыт на проде + HTTP.'
    });
    this.addMockupText(0, -90, 'Оплата заказа', { fontSize: '20px', color: '#ffffff' });

    // Баг: редактируемая цена
    this.addMockupText(-50, -30, 'К оплате: <input value="999.00"> $', { color: COLOR_TEXT_DANGER }, true, {
      id: 'price', name: 'Подмена цены (Client-side)', desc: 'Цена меняется на стороне клиента.'
    });

    this.addMockupText(-50, 20, 'Карта: 4276 1111 2222 3333', { color: COLOR_TEXT_DANGER }, true, {
      id: 'card', name: 'Данные карты не замаскированы', desc: 'Полный номер карты на экране.'
    });

    this.addMockupText(-50, 60, 'CVV: [ 123 ]  ☑ Сохранить CVV', { fontSize: '14px', color: COLOR_TEXT_DANGER }, true, {
      id: 'cvv', name: 'Сохранение CVV', desc: 'По стандартам PCI DSS хранить CVV запрещено!'
    });

    this.addMockupText(0, 130, 'ОПЛАТИТЬ', { backgroundColor: '#16a34a', padding: {x: 40, y: 10}, color: '#fff' });
  }

  // --- ЯДРО ИНТЕРФЕЙСА ---

  /** Базовая рамка окна браузера */
  private buildBrowserWindow(): void {
    const bg = this.add.rectangle(0, 0, BROWSER_WIDTH, BROWSER_HEIGHT, COLOR_BROWSER_BG).setStrokeStyle(2, COLOR_BROWSER_UI);
    bg.setInteractive();
    bg.on('pointerdown', () => this.handleMissClick()); // Клик по фону = ошибка
    this.browserContainer.add(bg);

    const header = this.add.rectangle(0, -BROWSER_HEIGHT/2 + 15, BROWSER_WIDTH, 30, COLOR_BROWSER_UI);
    const btn1 = this.add.circle(-BROWSER_WIDTH/2 + 20, -BROWSER_HEIGHT/2 + 15, 6, 0xef4444);
    const btn2 = this.add.circle(-BROWSER_WIDTH/2 + 40, -BROWSER_HEIGHT/2 + 15, 6, 0xeab308);
    const btn3 = this.add.circle(-BROWSER_WIDTH/2 + 60, -BROWSER_HEIGHT/2 + 15, 6, 0x22c55e);
    this.browserContainer.add([header, btn1, btn2, btn3]);
  }

  /** Универсальный метод создания текста (как уязвимости, так и обычного) */
  private addMockupText(x: number, y: number, textStr: string, style: any, isBug = false, bugData?: Partial<SecurityBug>): void {
    const text = this.add.text(x, y, textStr, { fontFamily: 'monospace', fontSize: '16px', ...style }).setOrigin(0.5, 0.5);
    this.browserContainer.add(text);

    if (isBug && bugData) {
      const bounds = text.getBounds();
      // Создаем прозрачный хитбокс чуть больше текста
      const hitRect = this.add.rectangle(x, y, bounds.width + 20, bounds.height + 10, COLOR_BUG_HOVER, 0)
        .setStrokeStyle(2, COLOR_BUG_FOUND, 0);
      
      const bug: SecurityBug = { ...bugData, isFound: false } as SecurityBug;
      bug.rect = hitRect;
      this.bugs.push(bug);

      hitRect.setInteractive({ useHandCursor: true });
      hitRect.on('pointerover', () => { if (!bug.isFound && !this.isGameOver) hitRect.setFillStyle(COLOR_BUG_HOVER, 0.4); });
      hitRect.on('pointerout', () => { if (!bug.isFound) hitRect.setFillStyle(COLOR_BUG_HOVER, 0); });
      hitRect.on('pointerdown', (_p: any, _lx: any, _ly: any, event: any) => {
        event.stopPropagation(); // Не пропускаем клик к фону браузера (чтобы не было штрафа)
        this.handleBugFound(bug);
      });
      
      this.browserContainer.add(hitRect);
    }
  }

  private buildChecklist(): void {
    const bg = this.add.rectangle(0, 0, CHECKLIST_WIDTH, BROWSER_HEIGHT, 0x1e293b).setStrokeStyle(1, 0x475569);
    const title = this.add.text(0, -BROWSER_HEIGHT/2 + 20, 'ЧЕК-ЛИСТ РЕВЬЮЕРА', { fontFamily: 'monospace', fontSize: '16px', color: '#fbbf24' }).setOrigin(0.5, 0.5);
    this.checklistContainer.add([bg, title]);

    this.bugs.forEach((bug, index) => {
      const text = this.add.text(-CHECKLIST_WIDTH/2 + 15, -BROWSER_HEIGHT/2 + 60 + index * 55, `[ ] ${bug.name}`, { 
        fontFamily: 'monospace', fontSize: '13px', color: COLOR_TEXT_MUTED, wordWrap: { width: CHECKLIST_WIDTH - 30 }
      });
      bug.checkText = text;
      this.checklistContainer.add(text);
    });
  }

  // --- ИГРОВАЯ ЛОГИКА ---

  private handleBugFound(bug: SecurityBug): void {
    if (bug.isFound || this.isGameOver || this.isLevelTransition) return;
    
    bug.isFound = true;
    this.foundBugsCount++;

    if (this.cache.audio.exists('snd_success')) this.sound.play('snd_success', { volume: 0.5 });

    bug.rect?.setFillStyle(COLOR_BUG_FOUND, 0.3).setStrokeStyle(2, COLOR_BUG_FOUND, 1);
    if (bug.rect) {
      this.tweens.add({ targets: bug.rect, scaleX: 1.05, scaleY: 1.1, yoyo: true, duration: 150 });
    }

    bug.checkText?.setText(`[X] ${bug.name}\n    ${bug.desc}`);
    bug.checkText?.setColor('#22c55e');

    // Координаты для всплывающего текста нужно считать глобально
    const globalX = GAME_WIDTH / 2 - 160 + bug.rect!.x;
    const globalY = GAME_HEIGHT / 2 + bug.rect!.y;
    this.showFloatingText(globalX, globalY, '+ Уязвимость!', '#22c55e');

    if (this.foundBugsCount >= this.totalBugsInLevel) {
      this.handleLevelComplete();
    }
  }

  private handleMissClick(): void {
    if (this.isGameOver || this.isLevelTransition) return;

    if (this.cache.audio.exists('snd_error')) this.sound.play('snd_error', { volume: 0.4 });
    
    this.stressLevel = Math.min(STRESS_BAR_MAX, this.stressLevel + PROGRAMMER_PENALTY_STRESS);
    this.updateStressBar();
    this.showFloatingText(this.input.activePointer.x, this.input.activePointer.y, '- Нервы (Ошибся)', '#ef4444');
    this.cameras.main.shake(150, 0.005);

    if (this.stressLevel >= STRESS_BAR_MAX) {
      this.handleGameFail();
    }
  }

  private showFloatingText(x: number, y: number, message: string, color: string): void {
    const floatText = this.add.text(x, y, message, { fontFamily: 'monospace', fontSize: '16px', color, fontStyle: 'bold' }).setOrigin(0.5, 0.5);
    this.tweens.add({ targets: floatText, y: y - 40, alpha: 0, duration: 800, onComplete: () => floatText.destroy() });
  }

  private handleLevelComplete(): void {
    this.isLevelTransition = true;
    this.countdownTimer?.remove();

    if (this.currentLevel >= 2) {
      this.showFinalResults();
    } else {
      this.statusText.setText('Отличная работа! Переходим к следующей задаче...');
      this.cameras.main.flash(500, 34, 197, 94); // Зеленая вспышка экрана
      this.time.delayedCall(2000, () => {
        this.currentLevel++;
        this.startLevel(this.currentLevel);
      });
    }
  }

  // --- ОБРАБОТКА ПРОИГРЫША ---

  private handleGameFail(): void {
    this.isGameOver = true;
    this.countdownTimer?.remove();
    this.statusText.setText('Выгорел! Баги попали в прод.');
    
    // Тряска при провале
    this.cameras.main.shake(500, 0.01);
    
    // Через 1 секунду показываем окно проигрыша
    this.time.delayedCall(1000, () => {
      this.showGameOverScreen();
    });
  }

  private showGameOverScreen(): void {
    // ФИКС: setInteractive() делает фон невосприимчивым к кликам "насквозь", блокируя интерфейс позади
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setOrigin(0, 0).setDepth(200).setInteractive();

    const panelY = GAME_HEIGHT / 2;

    this.add.text(GAME_WIDTH / 2, panelY - 60, 'СИСТЕМНЫЙ СБОЙ', { fontFamily: 'monospace', fontSize: '32px', color: '#ef4444', fontStyle: 'bold' }).setOrigin(0.5, 0.5).setDepth(201);
    this.add.text(GAME_WIDTH / 2, panelY - 20, 'Стресс достиг предела. Критические баги ушли в прод.', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5, 0.5).setDepth(201);

    // Кнопка "Заново"
    const retryBtn = this.add.rectangle(GAME_WIDTH / 2 - 120, panelY + 60, 200, 44, 0x2563eb).setDepth(201).setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2 - 120, panelY + 60, 'Пройти заново', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5).setDepth(202);

    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0x1d4ed8));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0x2563eb));
    retryBtn.once('pointerdown', () => {
      // ФИКС: Используем встроенный рестарт сцены с передачей попыток + микрозадержка
      this.time.delayedCall(50, () => {
        this.scene.restart({ attempts: this.attempts + 1 });
      });
    });

    // Кнопка "Выйти"
    const exitBtn = this.add.rectangle(GAME_WIDTH / 2 + 120, panelY + 60, 200, 44, 0x374151).setDepth(201).setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0x9ca3af);
    this.add.text(GAME_WIDTH / 2 + 120, panelY + 60, 'Выйти в хаб', { fontFamily: 'monospace', fontSize: '16px', color: '#e5e7eb' }).setOrigin(0.5, 0.5).setDepth(202);

    exitBtn.on('pointerover', () => exitBtn.setFillStyle(0x4b5563));
    exitBtn.on('pointerout', () => exitBtn.setFillStyle(0x374151));
    exitBtn.once('pointerdown', () => {
      // ФИКС: Микрозадержка
      this.time.delayedCall(50, () => {
        this.exitToHub();
      });
    });
  }

  // --- ИНТЕРФЕЙС И ТАЙМЕРЫ ---

  private buildBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f172a).setOrigin(0, 0);
    this.add.text(GAME_WIDTH / 2, 28, 'CODE REVIEW SIMULATOR', { fontFamily: 'monospace', fontSize: '20px', color: `#${COLOR_TEXT_PRIMARY.toString(16)}`, fontStyle: 'bold' }).setOrigin(0.5, 0.5);
  }

  private buildHud(): void {
    const barX = GAME_WIDTH - STRESS_BAR_WIDTH - 24;
    const barY = 20;

    this.add.text(barX, barY - 18, 'Уровень выгорания', { fontFamily: 'monospace', fontSize: '12px', color: '#f87171' });
    this.add.rectangle(barX, barY, STRESS_BAR_WIDTH, STRESS_BAR_HEIGHT, 0x374151).setOrigin(0, 0).setStrokeStyle(1, 0x6b7280);
    this.stressBarFill = this.add.rectangle(barX, barY, 0, STRESS_BAR_HEIGHT, 0xf87171).setOrigin(0, 0);

    this.timerText = this.add.text(24, 20, '', { fontFamily: 'monospace', fontSize: '16px', color: `#${COLOR_TEXT_PRIMARY.toString(16)}` });
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 25, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fbbf24' }).setOrigin(0.5, 0.5);
  }

  private buildExitControl(): void {
    this.exitKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const rect = this.add.rectangle(EXIT_BUTTON_X, EXIT_BUTTON_Y + 10, EXIT_BUTTON_WIDTH, EXIT_BUTTON_HEIGHT, 0x374151).setStrokeStyle(1, 0x9ca3af);
    this.add.text(EXIT_BUTTON_X, EXIT_BUTTON_Y + 10, 'Esc — сдаться', { fontFamily: 'monospace', fontSize: '12px', color: '#e5e7eb' }).setOrigin(0.5, 0.5);
    rect.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.exitToHub());
  }

  private exitToHub(): void {
    this.countdownTimer?.remove();
    this.game.events.emit('minigame-exit');
    this.scene.stop();
  }

  private startCountdown(): void {
    const tickRate = PROGRAMMER_STRESS_TICKS[this.currentLevel];
    this.countdownTimer = this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        if (this.isGameOver || this.isLevelTransition) return;

        this.remainingSeconds -= 1;
        this.stressLevel = Math.min(STRESS_BAR_MAX, this.stressLevel + tickRate);
        
        this.updateTimerText();
        this.updateStressBar();

        if (this.remainingSeconds <= 0 || this.stressLevel >= STRESS_BAR_MAX) {
          this.handleGameFail();
        }
      },
    });
  }

  private updateTimerText(): void {
    this.timerText.setText(`Дедлайн: ${Math.max(0, this.remainingSeconds)} с`);
  }

  private updateStressBar(): void {
    this.stressBarFill.width = STRESS_BAR_WIDTH * (this.stressLevel / STRESS_BAR_MAX);
    // Меняем цвет полоски при высоком стрессе
    if (this.stressLevel > 70) this.stressBarFill.setFillStyle(0xdc2626); // Ярко красный
    else this.stressBarFill.setFillStyle(0xf87171); // Обычный красный
  }

  // --- ФИНАЛ ---

  private showFinalResults(): void {
    this.isGameOver = true;
    
    // ФИКС: Делаем фон интерактивным
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setOrigin(0, 0).setDepth(200).setInteractive();

    const resultPanelY = GAME_HEIGHT / 2;
    const finalStress = Math.round(this.stressLevel);
    
    let feedback = '';
    if (finalStress < 40) feedback = '🛡️ Безопасник уровня Senior! Прибавка к ЗП!';
    else if (finalStress < 80) feedback = '😅 Код чист, но глаз дёргается. (Middle)';
    else feedback = '😱 Junior спас релиз ценой своих нервов!';

    // Счёт: база + бонус за низкий стресс - штраф за попытки
    const finalScore = Math.max(0, 1000 + (100 - finalStress) * 10 - (this.attempts - 1) * 200);

    this.add.text(GAME_WIDTH / 2, resultPanelY - 80, 'СИСТЕМА БЕЗОПАСНА!', { fontFamily: 'monospace', fontSize: '32px', color: '#4ade80' }).setOrigin(0.5, 0.5).setDepth(201);
    this.add.text(GAME_WIDTH / 2, resultPanelY - 20, feedback, { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5, 0.5).setDepth(201);
    this.add.text(GAME_WIDTH / 2, resultPanelY + 20, `Счёт: ${finalScore} | Попыток: ${this.attempts}`, { fontFamily: 'monospace', fontSize: '16px', color: '#9ca3af' }).setOrigin(0.5, 0.5).setDepth(201);

    const btnRect = this.add.rectangle(GAME_WIDTH / 2, resultPanelY + 90, 220, 44, 0x2563eb).setDepth(201).setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, resultPanelY + 90, 'Вернуться в хаб', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5).setDepth(202);

    btnRect.on('pointerover', () => btnRect.setFillStyle(0x1d4ed8));
    btnRect.on('pointerout', () => btnRect.setFillStyle(0x2563eb));
    btnRect.once('pointerdown', () => {
      // ФИКС: Микрозадержка для безопасной отработки клика
      this.time.delayedCall(50, () => {
        const result: MinigameResult = {
          minigameType: 'programmer', 
          score: finalScore,
          attempts: this.attempts,
          stressLevel: finalStress,
          difficulty: 'hard', 
        };
        this.game.events.emit('minigame-complete', result);
        this.scene.stop();
      });
    });
  }
}