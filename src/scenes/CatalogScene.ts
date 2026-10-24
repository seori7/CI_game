import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, COLOR_TEXT_PRIMARY } from '../config/constants';

export class CatalogScene extends Phaser.Scene {
  public constructor() {
    super('CatalogScene');
  }

  public create(): void {
    // Фон
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f172a).setOrigin(0, 0);
    
    // Кнопка закрытия (вернуться в хаб к Масе)
    const closeBtn = this.add.text(GAME_WIDTH - 40, 30, '✖ Закрыть', {
      fontFamily: 'monospace', fontSize: '16px', color: '#f87171'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerdown', () => {
      this.game.events.emit('minigame-exit'); // Говорим хабу, что мы вышли
      this.scene.stop(); // Закрываем меню
    });

    closeBtn.on('pointerover', () => closeBtn.setColor('#fca5a5'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#f87171'));

    this.add.text(GAME_WIDTH / 2, 60, 'ПОРТАЛ СТАЖИРОВОК "ПРОФПУТЬ"', { 
      fontFamily: 'monospace', fontSize: '28px', color: `#${COLOR_TEXT_PRIMARY.toString(16)}`, fontStyle: 'bold' 
    }).setOrigin(0.5, 0.5);

    this.add.text(GAME_WIDTH / 2, 100, 'Выбери профессию для тестирования:', { 
      fontFamily: 'monospace', fontSize: '16px', color: '#94a3b8' 
    }).setOrigin(0.5, 0.5);

    // Карточки профессий
    this.createCard(GAME_WIDTH / 2 - 300, 220, '💻 Code Review', 'Senior Backend', 'Найди уязвимости в коде', 'ProgrammerMinigameScene', 0x2563eb);
    this.createCard(GAME_WIDTH / 2, 220, '🎨 UX/UI Дизайн', 'Product Designer', 'Собери удобный интерфейс', 'UiMinigameScene', 0x9333ea);
    this.createCard(GAME_WIDTH / 2 + 300, 220, '🤖 Алгоритмика', 'Robotics Engineer', 'Запрограммируй дрон-курьер', 'DroneMinigameScene', 0x059669);
  }

  private createCard(x: number, y: number, title: string, role: string, desc: string, sceneKey: string, color: number): void {
    const card = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 260, 180, 0x1e293b).setStrokeStyle(2, 0x334155).setInteractive({ useHandCursor: true });
    const headerBg = this.add.rectangle(0, -65, 260, 50, color);
    
    const titleText = this.add.text(0, -65, title, { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
    const roleText = this.add.text(0, -10, role, { fontFamily: 'monospace', fontSize: '14px', color: '#fbbf24' }).setOrigin(0.5, 0.5);
    const descText = this.add.text(0, 30, desc, { fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8', align: 'center', wordWrap: { width: 240 } }).setOrigin(0.5, 0.5);
    
    const btnBg = this.add.rectangle(0, 70, 200, 30, 0x334155).setStrokeStyle(1, 0x475569);
    const btnText = this.add.text(0, 70, 'Начать тест', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5, 0.5);

    card.add([bg, headerBg, titleText, roleText, descText, btnBg, btnText]);

    bg.on('pointerover', () => {
      this.tweens.add({ targets: card, y: y - 10, duration: 150 });
      bg.setStrokeStyle(2, color);
    });
    
    bg.on('pointerout', () => {
      this.tweens.add({ targets: card, y: y, duration: 150 });
      bg.setStrokeStyle(2, 0x334155);
    });

    bg.on('pointerdown', () => {
      this.scene.stop(); // Останавливаем меню
      this.scene.launch(sceneKey); // Запускаем выбранную игру поверх хаба
    });
  }
}