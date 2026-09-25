import { Brick } from '../types';
import { BREAKOUT_CONFIG } from '../catalog';

export function createBreakoutLevel(canvasWidth: number): Brick[] {
    const bricks: Brick[] = [];
    const { rows, cols, padding, topOffset, sidePadding, brickHeight, greenColors, goldBrick, greyBrick } = BREAKOUT_CONFIG.GRID;
    const totalPadding = (cols - 1) * padding + sidePadding * 2;
    const brickWidth = Math.max(20, (canvasWidth - totalPadding) / cols);

    // Fixed coordinates for Gold and Grey bricks for consistent level design
    const goldPositions = new Set(['1,2', '1,7', '2,4', '2,5', '3,1', '3,8']);
    const greyPositions = new Set(['2,2', '2,7', '3,4', '3,5']);

    let id = 0;
    for (let r = 0; r < rows; r++) {
        const colorScheme = greenColors[r % greenColors.length];
        const y = topOffset + r * (brickHeight + padding);

        for (let c = 0; c < cols; c++) {
            const x = sidePadding + c * (brickWidth + padding);
            const posKey = `${r},${c}`;

            if (greyPositions.has(posKey)) {
                // Unbreakable Grey block
                bricks.push({
                    id: id++,
                    x,
                    y,
                    width: brickWidth,
                    height: brickHeight,
                    color: greyBrick.color,
                    glowColor: greyBrick.glowColor,
                    points: greyBrick.points,
                    intact: true,
                    type: 'grey',
                });
            } else if (goldPositions.has(posKey)) {
                // Golden brick (drops circular 3-ball powerup)
                bricks.push({
                    id: id++,
                    x,
                    y,
                    width: brickWidth,
                    height: brickHeight,
                    color: goldBrick.color,
                    glowColor: goldBrick.glowColor,
                    points: goldBrick.points,
                    intact: true,
                    type: 'gold',
                });
            } else {
                // Standard Green brick
                bricks.push({
                    id: id++,
                    x,
                    y,
                    width: brickWidth,
                    height: brickHeight,
                    color: colorScheme.main,
                    glowColor: colorScheme.glow,
                    points: colorScheme.points,
                    intact: true,
                    type: 'green',
                });
            }
        }
    }

    return bricks;
}
