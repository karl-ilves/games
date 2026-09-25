import { Brick } from '../types';
import { BREAKOUT_CONFIG } from '../catalog';

export type LayoutPattern = 'checkerboard' | 'pyramid' | 'fortress' | 'clusters' | 'diamond';

export interface LevelGenOptions {
    level: number;
    canvasWidth: number;
    canvasHeight: number;
    seed?: number;
}

export function createBreakoutLevel(options: LevelGenOptions): Brick[] {
    const { level, canvasWidth } = options;
    const bricks: Brick[] = [];
    const isLevel2 = level >= 2;

    const gridConfig = isLevel2 ? BREAKOUT_CONFIG.GRID_LEVEL_2 : BREAKOUT_CONFIG.GRID_LEVEL_1;
    const { rows, cols, padding, topOffset, sidePadding, brickHeight } = gridConfig;
    const { greenColors, goldBrick, greyBrick } = BREAKOUT_CONFIG.GRID;

    let id = 0;

    // -------------------------------------------------------------
    // 1. "hallid plokid ka tähistavad piire" - Unbreakable Border Blocks
    // -------------------------------------------------------------
    const borderHeight = BREAKOUT_CONFIG.BORDER.height;
    const borderCols = Math.max(12, Math.floor(canvasWidth / 55));
    const borderBlockWidth = canvasWidth / borderCols;

    // Top horizontal border row
    for (let c = 0; c < borderCols; c++) {
        bricks.push({
            id: id++,
            x: c * borderBlockWidth,
            y: 0,
            width: borderBlockWidth,
            height: borderHeight,
            color: greyBrick.color,
            glowColor: greyBrick.glowColor,
            points: 0,
            intact: true,
            type: 'grey',
            isBorder: true,
        });
    }

    // Left and Right vertical borders framing the brick arena
    const verticalBorderCount = Math.floor((topOffset + rows * (brickHeight + padding) + 20) / (borderHeight + 4));
    for (let v = 1; v <= verticalBorderCount; v++) {
        const y = v * (borderHeight + 4);
        // Left border
        bricks.push({
            id: id++,
            x: 0,
            y,
            width: 14,
            height: borderHeight,
            color: greyBrick.color,
            glowColor: greyBrick.glowColor,
            points: 0,
            intact: true,
            type: 'grey',
            isBorder: true,
        });
        // Right border
        bricks.push({
            id: id++,
            x: canvasWidth - 14,
            y,
            width: 14,
            height: borderHeight,
            color: greyBrick.color,
            glowColor: greyBrick.glowColor,
            points: 0,
            intact: true,
            type: 'grey',
            isBorder: true,
        });
    }

    // -------------------------------------------------------------
    // 2. Procedural & Randomized Arena Bricks (Much larger map & unique on every Play Again)
    // -------------------------------------------------------------
    const totalPadding = (cols - 1) * padding + sidePadding * 2;
    const brickWidth = Math.max(20, (canvasWidth - totalPadding) / cols);

    const patterns: LayoutPattern[] = ['checkerboard', 'pyramid', 'fortress', 'clusters', 'diamond'];
    const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];

    // Target count of gold bricks and internal grey obstacle blocks
    const targetGoldCount = isLevel2 ? 8 : 6;
    const targetGreyObstacles = isLevel2 ? 10 : 6;

    // Determine cell types procedurally
    const cellTypes: ('green' | 'gold' | 'grey')[] = [];
    const totalPlayableCells = rows * cols;

    // Setup base cells
    for (let i = 0; i < totalPlayableCells; i++) {
        cellTypes.push('green');
    }

    // Apply patterned distribution
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;

            if (chosenPattern === 'checkerboard') {
                if ((r + c) % 5 === 0) cellTypes[idx] = 'grey';
                else if ((r * 2 + c) % 7 === 0) cellTypes[idx] = 'gold';
            } else if (chosenPattern === 'pyramid') {
                const distFromCenter = Math.abs(c - (cols / 2 - 0.5));
                if (r === distFromCenter && r < 4) cellTypes[idx] = 'gold';
                else if (r === 2 && (c === 2 || c === cols - 3)) cellTypes[idx] = 'grey';
            } else if (chosenPattern === 'fortress') {
                if ((r === 1 || r === rows - 2) && (c === 2 || c === cols - 3)) cellTypes[idx] = 'grey';
                else if (r === 2 && c >= 4 && c <= cols - 5) cellTypes[idx] = 'gold';
            } else if (chosenPattern === 'diamond') {
                const centerR = Math.floor(rows / 2);
                const centerC = Math.floor(cols / 2);
                const manhattan = Math.abs(r - centerR) + Math.abs(c - centerC);
                if (manhattan === 2) cellTypes[idx] = 'gold';
                else if (manhattan === 4) cellTypes[idx] = 'grey';
            } else {
                // Clusters pattern
                if ((r === 1 || r === 4) && (c % 4 === 1)) cellTypes[idx] = 'gold';
                else if (r === 3 && (c % 4 === 2)) cellTypes[idx] = 'grey';
            }
        }
    }

    // Ensure minimum gold and grey bricks by scattering random remaining ones
    let currentGold = cellTypes.filter(t => t === 'gold').length;
    let currentGrey = cellTypes.filter(t => t === 'grey').length;

    while (currentGold < targetGoldCount) {
        const randIdx = Math.floor(Math.random() * totalPlayableCells);
        if (cellTypes[randIdx] === 'green') {
            cellTypes[randIdx] = 'gold';
            currentGold++;
        }
    }

    while (currentGrey < targetGreyObstacles) {
        const randIdx = Math.floor(Math.random() * totalPlayableCells);
        if (cellTypes[randIdx] === 'green') {
            cellTypes[randIdx] = 'grey';
            currentGrey++;
        }
    }

    // Instantiate arena bricks
    for (let r = 0; r < rows; r++) {
        const colorScheme = greenColors[r % greenColors.length];
        const y = topOffset + r * (brickHeight + padding);

        for (let c = 0; c < cols; c++) {
            const x = sidePadding + c * (brickWidth + padding);
            const idx = r * cols + c;
            const type = cellTypes[idx];

            if (type === 'grey') {
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
            } else if (type === 'gold') {
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
