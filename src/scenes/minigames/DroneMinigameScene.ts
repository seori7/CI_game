import { Scene, GameObjects } from 'phaser';
import { DRONE_LEVEL_MAPS } from '../../config/constants';

export class DroneMinigameScene extends Scene {
    private currentLevel: number = 0;
    private attempts: number = 0;
    private levelConfig: any;
    private timeLeft: number = 0;
    
    private commands: string[] = [];
    private isRunning: boolean = false;
    
    private grid: number[][] = [];
    private drone!: GameObjects.Rectangle;
    private dronePos = { x: 0, y: 0 };
    
    private queueGroup!: GameObjects.Group;
    private commandLimitText!: GameObjects.Text;
    private statusText!: GameObjects.Text;
    
    private readonly CELL_SIZE = 60;
    private readonly GRID_X = 100;
    private readonly GRID_Y = 200;
    
    constructor() {
        super('DroneMinigameScene');
    }

    public create(data?: { attempts?: number }): void {
        this.attempts = data?.attempts || 0;
        this.levelConfig = DRONE_LEVEL_MAPS[this.currentLevel];
        this.timeLeft = this.levelConfig.timeLimit; // Глубокое копирование времени для рестартов
        
        this.commands = [];
        this.isRunning = false;
        
        this.buildBackground();
        this.buildGrid();
        this.buildPalette();
        this.buildQueueArea();
        this.buildHud();
    }
    
    private buildBackground(): void {
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a1a2e).setOrigin(0);
        this.add.text(this.cameras.main.width / 2, 30, 'АЛГОРИТМИКА: Робот-курьер', {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    private buildGrid(): void {
        this.grid = this.levelConfig.grid;
        
        for (let row = 0; row < this.grid.length; row++) {
            for (let col = 0; col < this.grid[row].length; col++) {
                const cellVal = this.grid[row][col];
                const x = this.GRID_X + col * this.CELL_SIZE;
                const y = this.GRID_Y + row * this.CELL_SIZE;
                
                let color = 0x2c3e50; // Пустая клетка
                if (cellVal === 2) color = 0xe53935; // Препятствие
                if (cellVal === 3) color = 0x43a047; // Цель
                
                this.add.rectangle(x, y, this.CELL_SIZE - 2, this.CELL_SIZE - 2, color).setOrigin(0);
                
                if (cellVal === 1) {
                    this.dronePos = { x: col, y: row };
                }
                
                // Иконки для препятствий и цели
                if (cellVal === 2) {
                    this.add.text(x + this.CELL_SIZE/2, y + this.CELL_SIZE/2, '✖', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
                }
                if (cellVal === 3) {
                    this.add.text(x + this.CELL_SIZE/2, y + this.CELL_SIZE/2, '★', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
                }
            }
        }
        
        // Создаем сам дрон поверх сетки
        const dX = this.GRID_X + this.dronePos.x * this.CELL_SIZE;
        const dY = this.GRID_Y + this.dronePos.y * this.CELL_SIZE;
        this.drone = this.add.rectangle(dX, dY, this.CELL_SIZE - 4, this.CELL_SIZE - 4, 0x1e88e5).setOrigin(0);
    }

    private buildPalette(): void {
        const startX = this.cameras.main.width / 2 + 50;
        const startY = 150;
        
        this.add.text(startX, startY - 40, 'ДОСТУПНЫЕ БЛОКИ:', { fontSize: '18px', color: '#ffcc00' });

        const commands = ['RIGHT', 'DOWN', 'LEFT', 'UP'];
        
        // Рендерим 4 бесконечные кнопки-источника команд
        commands.forEach((cmd, i) => {
            const x = startX + i * 65 + 25;
            const rect = this.add.rectangle(x, startY, 50, 50, this.getColorForCommand(cmd))
                .setInteractive({ useHandCursor: true });
            
            this.add.text(x, startY, this.getArrowForCommand(cmd), { fontSize: '24px', color: '#fff' })
                .setOrigin(0.5);
                
            rect.on('pointerdown', () => {
                if (this.isRunning) return;
                
                // Если превышен лимит — мигаем текстом красным
                if (this.commands.length >= this.levelConfig.maxCommands) {
                    this.commandLimitText.setColor('#ff0000');
                    this.time.delayedCall(300, () => this.commandLimitText.setColor('#ffffff'));
                    return;
                }
                
                this.commands.push(cmd);
                this.renderQueue();
            });
        });
    }

    private buildQueueArea(): void {
        this.queueGroup = this.add.group();
        const startX = this.cameras.main.width / 2 + 50;
        const startY = 250;
        
        this.commandLimitText = this.add.text(startX, startY - 30, '', { fontSize: '18px', color: '#ffffff' });
        this.updateCommandLimitText();
        
        const runBtn = this.add.rectangle(startX + 120, startY + 200, 240, 45, 0x27ae60)
            .setInteractive({ useHandCursor: true });
        this.add.text(startX + 120, startY + 200, '▶ ЗАПУСТИТЬ АЛГОРИТМ', { fontSize: '18px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        
        runBtn.on('pointerdown', () => {
            if (this.isRunning || this.commands.length === 0) return;
            this.executeCommands();
        });
    }

    private renderQueue(): void {
        this.queueGroup.clear(true, true);
        this.updateCommandLimitText();
        
        const startX = this.cameras.main.width / 2 + 50;
        const startY = 250;
        
        this.commands.forEach((cmd, i) => {
            const row = Math.floor(i / 6); // 6 блоков в ряд
            const col = i % 6;
            
            const x = startX + col * 55 + 25;
            const y = startY + row * 55 + 25;
            
            const rect = this.add.rectangle(x, y, 50, 50, this.getColorForCommand(cmd))
                .setInteractive({ useHandCursor: true });
            const arrow = this.add.text(x, y, this.getArrowForCommand(cmd), { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
            
            // Удаление команды кликом
            rect.on('pointerdown', () => {
                if (this.isRunning) return;
                this.commands.splice(i, 1);
                this.renderQueue();
            });
            
            this.queueGroup.add(rect);
            this.queueGroup.add(arrow);
        });
    }

    private updateCommandLimitText(): void {
        if (this.commandLimitText) {
            this.commandLimitText.setText(`КОД (MAIN): ${this.commands.length} / ${this.levelConfig.maxCommands}`);
        }
    }

    private buildHud(): void {
        this.add.text(20, 20, '← Сдаться', { fontSize: '18px', color: '#aaaaaa' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.saveResult('lose');
                this.game.events.emit('minigame-exit');
                this.scene.stop();
            });
            
        this.statusText = this.add.text(20, 60, `Батарея: ${this.timeLeft}с`, { fontSize: '20px', color: '#ffffff' });
        
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.isRunning) return;
                this.timeLeft--;
                if (this.statusText && this.statusText.active) {
                    this.statusText.setText(`Батарея: ${this.timeLeft}с`);
                }
                
                if (this.timeLeft <= 0) {
                    this.failLevel('Батарея разряжена!');
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    private async executeCommands(): Promise<void> {
        this.isRunning = true;
        let cX = this.dronePos.x;
        let cY = this.dronePos.y;
        
        for (let i = 0; i < this.commands.length; i++) {
            const cmd = this.commands[i];
            
            if (cmd === 'RIGHT') cX++;
            else if (cmd === 'LEFT') cX--;
            else if (cmd === 'DOWN') cY++;
            else if (cmd === 'UP') cY--;
            
            // Проверка выхода за границы
            if (cY < 0 || cY >= this.grid.length || cX < 0 || cX >= this.grid[0].length) {
                this.failLevel('Выход за пределы карты!');
                return;
            }
            
            // Визуальное перемещение
            await this.moveDroneTo(cX, cY);
            
            // Проверка препятствия
            if (this.grid[cY][cX] === 2) {
                this.failLevel('Дрон врезался в препятствие!');
                return;
            }
            
            // Проверка успешного прибытия
            if (this.grid[cY][cX] === 3) {
                this.completeLevel();
                return;
            }
        }
        
        this.failLevel('Цель не достигнута. Измените алгоритм!');
    }
    
    private moveDroneTo(cX: number, cY: number): Promise<void> {
        return new Promise((resolve) => {
            const targetX = this.GRID_X + cX * this.CELL_SIZE;
            const targetY = this.GRID_Y + cY * this.CELL_SIZE;
            
            this.tweens.add({
                targets: this.drone,
                x: targetX,
                y: targetY,
                duration: 400,
                ease: 'Linear',
                onComplete: () => resolve()
            });
        });
    }

    private failLevel(reason: string): void {
        this.isRunning = false;
        this.showGameOver(false, reason);
    }
    
    private completeLevel(): void {
        this.isRunning = false;
        if (this.currentLevel < DRONE_LEVEL_MAPS.length - 1) {
            this.showGameOver(true, 'Отлично! Маршрут проложен.');
        } else {
            this.saveResult('win');
            this.showGameOver(true, 'Все маршруты завершены!\nВы отличный алгоритмист.');
        }
    }

    private showGameOver(success: boolean, message: string): void {
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.85).setOrigin(0);
        
        const titleColor = success ? '#2ecc71' : '#e74c3c';
        const titleText = success ? 'УСПЕХ!' : 'ОШИБКА';
        
        this.add.text(this.cameras.main.width / 2, 200, titleText, { fontSize: '48px', color: titleColor, fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(this.cameras.main.width / 2, 280, message, { fontSize: '24px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
        
        if (success) {
            if (this.currentLevel < DRONE_LEVEL_MAPS.length - 1) {
                const nextBtn = this.add.rectangle(this.cameras.main.width / 2, 380, 200, 50, 0x27ae60).setInteractive({ useHandCursor: true });
                this.add.text(this.cameras.main.width / 2, 380, 'След. уровень', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
                nextBtn.on('pointerdown', () => {
                    this.currentLevel++;
                    this.scene.restart({ attempts: 0 });
                });
            } else {
                const exitBtn = this.add.rectangle(this.cameras.main.width / 2, 380, 200, 50, 0x27ae60).setInteractive({ useHandCursor: true });
                this.add.text(this.cameras.main.width / 2, 380, 'Завершить', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
                exitBtn.on('pointerdown', () => {
                    this.game.events.emit('minigame-exit');
                    this.scene.stop();
                });
            }
        } else {
            const restartBtn = this.add.rectangle(this.cameras.main.width / 2, 380, 200, 50, 0x3498db).setInteractive({ useHandCursor: true });
            this.add.text(this.cameras.main.width / 2, 380, 'Повторить', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
            restartBtn.on('pointerdown', () => {
                this.scene.restart({ attempts: this.attempts + 1 });
            });
            
            const exitBtn = this.add.rectangle(this.cameras.main.width / 2, 450, 200, 50, 0xe74c3c).setInteractive({ useHandCursor: true });
            this.add.text(this.cameras.main.width / 2, 450, 'Выйти', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
            exitBtn.on('pointerdown', () => {
                this.saveResult('lose');
                this.game.events.emit('minigame-exit');
                this.scene.stop();
            });
        }
    }

    private saveResult(status: 'win' | 'lose'): void {
        const score = status === 'win' ? 10 * (this.currentLevel + 1) : 0;
        this.game.events.emit('minigame-complete', {
            minigameType: 'medic', // Дрон мапится на medic, как было сказано ранее
            score: score,
            status: status
        });
    }

    private getColorForCommand(cmd: string): number {
        switch (cmd) {
            case 'RIGHT': return 0x1e88e5; // Синий
            case 'DOWN': return 0x43a047;  // Зеленый
            case 'LEFT': return 0x8e24aa;  // Фиолетовый
            case 'UP': return 0xf4511e;    // Оранжевый
            default: return 0x888888;
        }
    }

    private getArrowForCommand(cmd: string): string {
        switch (cmd) {
            case 'RIGHT': return '→';
            case 'DOWN': return '↓';
            case 'LEFT': return '←';
            case 'UP': return '↑';
            default: return '';
        }
    }
}