import { Direction, GridPoint, FoodItem } from '../types';

export class DemoAiSystem {
    private cols: number;
    private rows: number;

    constructor(cols: number = 24, rows: number = 24) {
        this.cols = cols;
        this.rows = rows;
    }

    public getNextDirection(
        head: GridPoint,
        currentDir: Direction,
        body: GridPoint[],
        foodItems: FoodItem[]
    ): Direction {
        if (!head || foodItems.length === 0) return currentDir;

        // Find nearest food (taking wrap-around into account)
        let nearestFood: FoodItem | null = null;
        let minDist = Infinity;

        for (const food of foodItems) {
            const dx = Math.min(
                Math.abs(head.x - food.x),
                this.cols - Math.abs(head.x - food.x)
            );
            const dy = Math.min(
                Math.abs(head.y - food.y),
                this.rows - Math.abs(head.y - food.y)
            );
            const dist = dx + dy;
            if (dist < minDist) {
                minDist = dist;
                nearestFood = food;
            }
        }

        if (!nearestFood) return currentDir;

        const possibleDirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const opposites: Record<Direction, Direction> = {
            UP: 'DOWN',
            DOWN: 'UP',
            LEFT: 'RIGHT',
            RIGHT: 'LEFT'
        };

        const validDirs = possibleDirs.filter(dir => dir !== opposites[currentDir]);

        // Evaluate candidate directions
        let bestDir: Direction = currentDir;
        let bestScore = -Infinity;

        for (const dir of validDirs) {
            let nextX = head.x;
            let nextY = head.y;

            if (dir === 'UP') nextY -= 1;
            if (dir === 'DOWN') nextY += 1;
            if (dir === 'LEFT') nextX -= 1;
            if (dir === 'RIGHT') nextX += 1;

            // Wrap around edges
            if (nextX < 0) nextX = this.cols - 1;
            else if (nextX >= this.cols) nextX = 0;
            if (nextY < 0) nextY = this.rows - 1;
            else if (nextY >= this.rows) nextY = 0;

            // Check self-collision
            const collidesWithBody = body.slice(0, -1).some(seg => seg.x === nextX && seg.y === nextY);
            if (collidesWithBody) continue;

            // Distance to food with wrap-around
            const dx = Math.min(
                Math.abs(nextX - nearestFood.x),
                this.cols - Math.abs(nextX - nearestFood.x)
            );
            const dy = Math.min(
                Math.abs(nextY - nearestFood.y),
                this.rows - Math.abs(nextY - nearestFood.y)
            );
            const distToFood = dx + dy;

            // Favor moving towards food, with slight preference to keep going forward
            let score = 1000 - distToFood * 10;
            if (dir === currentDir) score += 2;

            if (score > bestScore) {
                bestScore = score;
                bestDir = dir;
            }
        }

        return bestDir;
    }
}
