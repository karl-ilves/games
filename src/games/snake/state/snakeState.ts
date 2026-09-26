import { Direction, GridPoint, FoodItem, FoodType, GameStats } from '../types';
import { SNAKE_CONFIG } from '../catalog';

export class SnakeState {
    public body: GridPoint[] = [];
    public direction: Direction = SNAKE_CONFIG.SNAKE.initialDirection;
    public nextDirection: Direction = SNAKE_CONFIG.SNAKE.initialDirection;
    public foodItems: FoodItem[] = [];

    public cols: number = SNAKE_CONFIG.GRID.cols;
    public rows: number = SNAKE_CONFIG.GRID.rows;

    private score: number = 0;
    private highScore: number = 0;
    private applesEaten: number = 0;
    private baseSpeed: number = SNAKE_CONFIG.SPEED.initialStepRate;
    private isGameOver: boolean = false;
    private isPaused: boolean = false;

    private activePowerUp: FoodType | null = null;
    private powerUpTimer: number = 0;

    private growthPending: number = 0;
    private isNewHighScoreCelebrated: boolean = false;

    constructor() {
        this.loadHighScore();
        this.reset();
    }

    private loadHighScore() {
        try {
            const saved = localStorage.getItem('playard_snake_highscore');
            if (saved) {
                const val = parseInt(saved, 10);
                if (!isNaN(val)) this.highScore = val;
            }
        } catch {
            this.highScore = 0;
        }
    }

    private saveHighScore() {
        try {
            localStorage.setItem('playard_snake_highscore', String(this.highScore));
        } catch {}
    }

    public reset() {
        this.direction = SNAKE_CONFIG.SNAKE.initialDirection;
        this.nextDirection = SNAKE_CONFIG.SNAKE.initialDirection;
        this.score = 0;
        this.applesEaten = 0;
        this.baseSpeed = SNAKE_CONFIG.SPEED.initialStepRate;
        this.isGameOver = false;
        this.isPaused = false;
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.growthPending = 0;
        this.isNewHighScoreCelebrated = false;

        // Initialize snake segments (head at initialX, body extending left)
        const startX = SNAKE_CONFIG.SNAKE.initialX;
        const startY = SNAKE_CONFIG.SNAKE.initialY;
        this.body = [];
        for (let i = 0; i < SNAKE_CONFIG.SNAKE.initialLength; i++) {
            this.body.push({ x: startX - i, y: startY });
        }

        this.foodItems = [];
        this.spawnFood('apple');
    }

    public setDirection(newDir: Direction): boolean {
        if (this.isGameOver || this.isPaused) return false;

        // Prevent 180-degree immediate reversal into oneself
        const opposites: Record<Direction, Direction> = {
            UP: 'DOWN',
            DOWN: 'UP',
            LEFT: 'RIGHT',
            RIGHT: 'LEFT',
        };

        if (opposites[this.direction] === newDir) {
            return false;
        }

        this.nextDirection = newDir;
        return true;
    }

    public isOccupiedBySnake(x: number, y: number): boolean {
        return this.body.some(segment => segment.x === x && segment.y === y);
    }

    public isOccupiedByFood(x: number, y: number): boolean {
        return this.foodItems.some(f => f.x === x && f.y === y);
    }

    public getFreeGridPoint(): GridPoint | null {
        const freePoints: GridPoint[] = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (!this.isOccupiedBySnake(x, y) && !this.isOccupiedByFood(x, y)) {
                    freePoints.push({ x, y });
                }
            }
        }
        if (freePoints.length === 0) return null;
        return freePoints[Math.floor(Math.random() * freePoints.length)];
    }

    public spawnFood(forcedType?: FoodType): FoodItem | null {
        const pt = this.getFreeGridPoint();
        if (!pt) return null;

        let type: FoodType = forcedType || 'apple';
        if (!forcedType) {
            const rand = Math.random();
            if (rand < SNAKE_CONFIG.SPAWN_CHANCES.starChance) {
                type = 'star';
            } else if (rand < SNAKE_CONFIG.SPAWN_CHANCES.starChance + SNAKE_CONFIG.SPAWN_CHANCES.freezeChance) {
                type = 'freeze';
            } else if (rand < SNAKE_CONFIG.SPAWN_CHANCES.starChance + SNAKE_CONFIG.SPAWN_CHANCES.freezeChance + SNAKE_CONFIG.SPAWN_CHANCES.magnetChance) {
                type = 'magnet';
            } else {
                type = 'apple';
            }
        }

        const config = SNAKE_CONFIG.FOOD[type];
        const food: FoodItem = {
            id: Date.now() + Math.random(),
            x: pt.x,
            y: pt.y,
            type,
            points: config.points,
            growth: config.growth,
            duration: (config as any).duration,
            timer: (config as any).duration,
            pulsePhase: Math.random() * Math.PI * 2,
        };

        this.foodItems.push(food);
        return food;
    }

    public updatePowerUps(dt: number) {
        if (this.isPaused || this.isGameOver) return;

        // Update active power-up
        if (this.activePowerUp) {
            this.powerUpTimer -= dt;
            if (this.powerUpTimer <= 0) {
                this.activePowerUp = null;
                this.powerUpTimer = 0;
            }
        }

        // Magnet effect: pulls nearby food 1 cell closer towards head
        if (this.activePowerUp === 'magnet' && this.body.length > 0) {
            const head = this.body[0];
            for (const food of this.foodItems) {
                const dx = head.x - food.x;
                const dy = head.y - food.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 1 && dist < 7 && Math.random() < 0.15) {
                    const stepX = Math.sign(dx);
                    const stepY = Math.sign(dy);
                    const targetX = food.x + (Math.abs(dx) >= Math.abs(dy) ? stepX : 0);
                    const targetY = food.y + (Math.abs(dy) > Math.abs(dx) ? stepY : 0);
                    if (!this.isOccupiedBySnake(targetX, targetY)) {
                        food.x = targetX;
                        food.y = targetY;
                    }
                }
            }
        }

        // Update temporary food decay timers
        for (let i = this.foodItems.length - 1; i >= 0; i--) {
            const f = this.foodItems[i];
            if (f.timer !== undefined) {
                f.timer -= dt;
                if (f.timer <= 0) {
                    this.foodItems.splice(i, 1);
                }
            }
        }

        // Ensure at least one apple always exists
        const hasApple = this.foodItems.some(f => f.type === 'apple');
        if (!hasApple) {
            this.spawnFood('apple');
        }
    }

    public step(): {
        moved: boolean;
        ateFood: FoodItem | null;
        hitWall: boolean;
        hitSelf: boolean;
        isGameOver: boolean;
        isNewHighScore: boolean;
    } {
        if (this.isGameOver || this.isPaused || this.body.length === 0) {
            return {
                moved: false,
                ateFood: null,
                hitWall: false,
                hitSelf: false,
                isGameOver: this.isGameOver,
                isNewHighScore: false,
            };
        }

        this.direction = this.nextDirection;
        const head = this.body[0];
        let newX = head.x;
        let newY = head.y;

        switch (this.direction) {
            case 'UP': newY -= 1; break;
            case 'DOWN': newY += 1; break;
            case 'LEFT': newX -= 1; break;
            case 'RIGHT': newX += 1; break;
        }

        // Screen wrap-around: kui lähed seinast läbi, tuled teiselt poolt välja!
        let wrapped = false;
        if (newX < 0) {
            newX = this.cols - 1;
            wrapped = true;
        } else if (newX >= this.cols) {
            newX = 0;
            wrapped = true;
        }

        if (newY < 0) {
            newY = this.rows - 1;
            wrapped = true;
        } else if (newY >= this.rows) {
            newY = 0;
            wrapped = true;
        }

        // Self collision check (ignoring the last tail cell if not growing)
        const willGrow = this.growthPending > 0;
        const checkLength = willGrow ? this.body.length : this.body.length - 1;
        for (let i = 0; i < checkLength; i++) {
            if (this.body[i].x === newX && this.body[i].y === newY) {
                this.isGameOver = true;
                return {
                    moved: false,
                    ateFood: null,
                    hitWall: false,
                    hitSelf: true,
                    isGameOver: true,
                    isNewHighScore: false,
                };
            }
        }

        // Advance snake
        const newHead: GridPoint = { x: newX, y: newY };
        this.body.unshift(newHead);

        if (this.growthPending > 0) {
            this.growthPending--;
        } else {
            this.body.pop();
        }

        // Check food consumption
        let ateFood: FoodItem | null = null;
        const foodIndex = this.foodItems.findIndex(f => f.x === newX && f.y === newY);
        let isNewHighScore = false;

        if (foodIndex !== -1) {
            ateFood = this.foodItems[foodIndex];
            this.foodItems.splice(foodIndex, 1);

            this.score += ateFood.points;
            this.applesEaten++;
            this.growthPending += ateFood.growth;

            // Speed increment
            this.baseSpeed = Math.min(
                SNAKE_CONFIG.SPEED.maxStepRate,
                this.baseSpeed + SNAKE_CONFIG.SPEED.speedIncrementPerFood
            );

            // Handle Power-Up trigger
            if (ateFood.type === 'freeze') {
                this.activePowerUp = 'freeze';
                this.powerUpTimer = 6;
            } else if (ateFood.type === 'magnet') {
                this.activePowerUp = 'magnet';
                this.powerUpTimer = 8;
            }

            // High score check
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.saveHighScore();
                if (!this.isNewHighScoreCelebrated) {
                    this.isNewHighScoreCelebrated = true;
                    isNewHighScore = true;
                }
            }

            // Always spawn a replacement food item, plus occasional bonus
            if (!this.foodItems.some(f => f.type === 'apple')) {
                this.spawnFood('apple');
            }
            if (Math.random() < 0.28 && this.foodItems.length < 3) {
                this.spawnFood();
            }
        }

        return {
            moved: true,
            ateFood,
            hitWall: false,
            hitSelf: false,
            isGameOver: false,
            isNewHighScore,
            wrapped,
        };
    }

    public getEffectiveSpeed(): number {
        if (this.activePowerUp === 'freeze') {
            return this.baseSpeed * SNAKE_CONFIG.SPEED.freezeMultiplier;
        }
        return this.baseSpeed;
    }

    public togglePause(): boolean {
        if (this.isGameOver) return false;
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    public setPaused(paused: boolean) {
        if (!this.isGameOver) {
            this.isPaused = paused;
        }
    }

    public getStats(): GameStats {
        return {
            score: this.score,
            highScore: this.highScore,
            applesEaten: this.applesEaten,
            length: this.body.length,
            speed: Math.round(this.getEffectiveSpeed() * 10) / 10,
            level: Math.floor(this.applesEaten / 5) + 1,
            isGameOver: this.isGameOver,
            isPaused: this.isPaused,
            activePowerUp: this.activePowerUp,
            powerUpTimeRemaining: Math.max(0, Math.ceil(this.powerUpTimer)),
        };
    }
}
