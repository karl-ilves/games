import { Brick } from '../types';
import { BREAKOUT_CONFIG } from '../catalog';

export type LayoutPattern =
    | 'checkerboard'
    | 'pyramid'
    | 'fortress'
    | 'clusters'
    | 'diamond'
    | 'invaders'
    | 'stripes'
    | 'labyrinth'
    | 'castle_towers'
    | 'hourglass'
    | 'dna_helix'
    | 'ring_vault'
    | 'stairway'
    | 'honeycomb'
    | 'bunker_gate'
    | 'stone_vault'
    | 'funnel_chamber';

export const ALL_PATTERNS: LayoutPattern[] = [
    'checkerboard',
    'pyramid',
    'fortress',
    'clusters',
    'diamond',
    'invaders',
    'stripes',
    'labyrinth',
    'castle_towers',
    'hourglass',
    'dna_helix',
    'ring_vault',
    'stairway',
    'honeycomb',
    'bunker_gate',
    'stone_vault',
    'funnel_chamber',
];

export interface LevelGenOptions {
    level: number;
    canvasWidth: number;
    canvasHeight: number;
    forcePattern?: LayoutPattern;
}

// History and Non-Repeating Shuffle Bag System
const MAX_HISTORY = 100;
const layoutHistory: Set<string> = new Set();
let lastChosenPattern: LayoutPattern | null = null;
let patternDeck: LayoutPattern[] = [];

function loadHistoryFromStorage(): void {
    try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            const raw = window.sessionStorage.getItem('breakout_played_map_signatures');
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    for (const sig of list) {
                        layoutHistory.add(sig);
                    }
                }
            }
        }
    } catch {}
}

function saveHistoryToStorage(signature: string): void {
    layoutHistory.add(signature);
    if (layoutHistory.size > MAX_HISTORY) {
        const oldest = layoutHistory.values().next().value;
        if (oldest) layoutHistory.delete(oldest);
    }
    try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem(
                'breakout_played_map_signatures',
                JSON.stringify(Array.from(layoutHistory))
            );
        }
    } catch {}
}

export function clearMapHistory(): void {
    layoutHistory.clear();
    lastChosenPattern = null;
    patternDeck = [];
    try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.removeItem('breakout_played_map_signatures');
        }
    } catch {}
}

export function getPlayedSignaturesCount(): number {
    return layoutHistory.size;
}

function getNextShufflePattern(): LayoutPattern {
    if (patternDeck.length === 0) {
        // Refill and shuffle using Fisher-Yates
        patternDeck = [...ALL_PATTERNS].sort(() => Math.random() - 0.5);
        // Ensure the very first card of the new deck is never the same as the last card played
        if (lastChosenPattern && patternDeck[0] === lastChosenPattern && patternDeck.length > 1) {
            const swapIdx = 1 + Math.floor(Math.random() * (patternDeck.length - 1));
            [patternDeck[0], patternDeck[swapIdx]] = [patternDeck[swapIdx], patternDeck[0]];
        }
    }
    const chosen = patternDeck.pop()!;
    lastChosenPattern = chosen;
    return chosen;
}

function generatePatternCells(
    pattern: LayoutPattern,
    rows: number,
    cols: number,
    variant: number
): ('green' | 'gold' | 'grey' | 'empty')[] {
    const totalPlayableCells = rows * cols;
    const cellTypes: ('green' | 'gold' | 'grey' | 'empty')[] = new Array(totalPlayableCells).fill('green');

    const centerR = Math.floor(rows / 2);
    const centerC = Math.floor(cols / 2);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;

            switch (pattern) {
                case 'checkerboard': {
                    const step = variant % 2 === 0 ? 2 : 3;
                    if ((r + c + variant) % step === 0) {
                        cellTypes[idx] = (r * 2 + c) % 5 === 0 ? 'grey' : 'gold';
                    }
                    break;
                }
                case 'pyramid': {
                    const distFromCenter = Math.abs(c - (cols / 2 - 0.5));
                    if (r === Math.floor(distFromCenter) && r < 4) {
                        cellTypes[idx] = 'gold';
                    } else if (r === 2 && (c === 2 || c === cols - 3)) {
                        cellTypes[idx] = 'grey';
                    } else if (r === 0 && Math.abs(c - centerC) <= 1) {
                        cellTypes[idx] = 'gold';
                    }
                    break;
                }
                case 'fortress': {
                    const isOuterWall = (r === 1 || r === rows - 2) && (c === 2 || c === cols - 3);
                    const isGate = r === 1 && (c === centerC || c === centerC - 1);
                    if (isOuterWall && !isGate) {
                        cellTypes[idx] = 'grey';
                    } else if (r === 2 && Math.abs(c - centerC) <= 1) {
                        cellTypes[idx] = 'gold';
                    } else if (r === rows - 3 && Math.abs(c - centerC) <= 1) {
                        cellTypes[idx] = 'gold';
                    }
                    break;
                }
                case 'clusters': {
                    const clusterR = Math.floor(r / 2);
                    const clusterC = Math.floor(c / 3);
                    if ((clusterR + clusterC + variant) % 2 === 1) {
                        if (r % 2 === 0 && c % 3 === 1) {
                            cellTypes[idx] = 'gold';
                        } else if (r % 2 === 1 && c % 3 === 2) {
                            cellTypes[idx] = 'grey';
                        }
                    }
                    break;
                }
                case 'diamond': {
                    const manhattan = Math.abs(r - centerR) + Math.abs(c - centerC);
                    if (manhattan === 2) {
                        cellTypes[idx] = 'gold';
                    } else if (manhattan === 4) {
                        cellTypes[idx] = 'grey';
                    } else if (manhattan === 0) {
                        cellTypes[idx] = 'gold';
                    }
                    break;
                }
                case 'invaders': {
                    const dx = Math.abs(c - centerC);
                    if (r === 0 && (dx === 2 || dx === 4)) {
                        cellTypes[idx] = 'grey';
                    } else if (r === 2 && dx === 2) {
                        cellTypes[idx] = 'gold';
                    } else if (r === 3 && dx === 0) {
                        cellTypes[idx] = 'gold';
                    } else if (r === rows - 2 && (dx === 1 || dx === 3)) {
                        cellTypes[idx] = 'grey';
                    }
                    break;
                }
                case 'stripes': {
                    const stripeType = (c + variant) % 4;
                    if (stripeType === 1) {
                        cellTypes[idx] = r % 3 === 0 ? 'gold' : 'grey';
                    } else if (stripeType === 3) {
                        cellTypes[idx] = r % 2 === 0 ? 'gold' : 'green';
                    }
                    break;
                }
                case 'labyrinth': {
                    if (r % 2 === 1) {
                        const openingOnRight = ((r / 2) | 0) % 2 === 0;
                        const isOpening = openingOnRight ? c >= cols - 3 : c <= 2;
                        if (!isOpening) {
                            cellTypes[idx] = (c % 5 === 0) ? 'gold' : 'grey';
                        }
                    }
                    break;
                }
                case 'castle_towers': {
                    const isLeftTower = c <= 2;
                    const isRightTower = c >= cols - 3;
                    const isBridge = r === centerR && (c >= 3 && c <= cols - 4);
                    if (isBridge) {
                        cellTypes[idx] = (c === centerC) ? 'gold' : 'grey';
                    } else if ((isLeftTower || isRightTower) && r === 1) {
                        cellTypes[idx] = 'gold';
                    } else if ((isLeftTower || isRightTower) && r === rows - 2) {
                        cellTypes[idx] = 'grey';
                    }
                    break;
                }
                case 'hourglass': {
                    const topTri = r <= centerR && Math.abs(c - centerC) <= (centerR - r + 1);
                    const botTri = r > centerR && Math.abs(c - centerC) <= (r - centerR + 1);
                    if (topTri || botTri) {
                        if (r === centerR && Math.abs(c - centerC) <= 1) {
                            cellTypes[idx] = 'gold';
                        } else if ((r === 0 || r === rows - 1) && (c === 1 || c === cols - 2)) {
                            cellTypes[idx] = 'grey';
                        }
                    }
                    break;
                }
                case 'dna_helix': {
                    const phase = ((r + variant) * 0.9);
                    const wave1 = Math.round(centerC + Math.sin(phase) * (centerC - 2));
                    const wave2 = Math.round(centerC - Math.sin(phase) * (centerC - 2));
                    if (c === wave1) {
                        cellTypes[idx] = 'gold';
                    } else if (c === wave2) {
                        cellTypes[idx] = 'green';
                    } else if (r % 2 === 0 && ((c > Math.min(wave1, wave2)) && (c < Math.max(wave1, wave2)))) {
                        cellTypes[idx] = 'grey';
                    }
                    break;
                }
                case 'ring_vault': {
                    const nx = (c - centerC) / Math.max(1, centerC);
                    const ny = (r - centerR) / Math.max(1, centerR);
                    const dist = Math.sqrt(nx * nx + ny * ny);
                    if (dist < 0.35) {
                        cellTypes[idx] = 'gold';
                    } else if (dist >= 0.7 && dist <= 0.95) {
                        cellTypes[idx] = (c % 2 === 0) ? 'grey' : 'green';
                    }
                    break;
                }
                case 'stairway': {
                    const stepDiag = (c - r * 2 + variant * 3 + cols * 4) % cols;
                    if (stepDiag === 0) {
                        cellTypes[idx] = 'gold';
                    } else if (stepDiag === 1) {
                        cellTypes[idx] = 'grey';
                    }
                    break;
                }
                case 'honeycomb': {
                    const rowShift = (r % 2) * 1;
                    const hexCol = (c + rowShift + variant) % 3;
                    if (hexCol === 0 && r % 2 === 0) {
                        cellTypes[idx] = 'grey';
                    } else if (hexCol === 1 && r % 3 === 0) {
                        cellTypes[idx] = 'gold';
                    }
                    break;
                }
                case 'bunker_gate': {
                    // "kivid ees ja on ainult 1 auk kust pall sisse läheb"
                    // Solid frontal stone wall with strictly 1 hole where the ball goes inside!
                    const frontRow = rows - 1;
                    const singleHoleCol = 2 + (Math.abs(variant) % Math.max(1, cols - 4));
                    if (r === frontRow) {
                        cellTypes[idx] = (c === singleHoleCol) ? 'empty' : 'grey';
                    } else if (r === frontRow - 1 && c === singleHoleCol) {
                        cellTypes[idx] = 'empty'; // Clear entry corridor into chamber
                    } else if (r === 0 && Math.abs(c - centerC) <= 1) {
                        cellTypes[idx] = 'gold';
                    } else if (r === 2 && (c === 2 || c === cols - 3)) {
                        cellTypes[idx] = 'gold';
                    }
                    break;
                }
                case 'stone_vault': {
                    // "kivid ees ja on ainult 1 auk kust pall sisse läheb"
                    // Enclosed stone vault with front stone wall having strictly 1 hole!
                    const frontRow = rows - 2;
                    const singleHoleCol = Math.floor(cols / 2) + ((variant % 2 === 0) ? -1 : 1);
                    if (r === frontRow) {
                        cellTypes[idx] = (c === singleHoleCol) ? 'empty' : 'grey';
                    } else if (r === frontRow - 1 && c === singleHoleCol) {
                        cellTypes[idx] = 'empty'; // Clear entry into chamber
                    } else if (r === rows - 1) {
                        cellTypes[idx] = 'empty'; // Open courtyard in front of stone wall
                    } else if ((c === 0 || c === cols - 1) && r >= 1) {
                        cellTypes[idx] = 'grey'; // Stone bunker side walls
                    } else if (r <= 2 && Math.abs(c - centerC) <= 1) {
                        cellTypes[idx] = 'gold';
                    }
                    break;
                }
                case 'funnel_chamber': {
                    // "kivid ees ja on ainult 1 auk kust pall sisse läheb"
                    // Front barrier with central 1-brick hole and inner funnel baffles
                    const frontRow = rows - 1;
                    const singleHoleCol = centerC;
                    if (r === frontRow) {
                        cellTypes[idx] = (c === singleHoleCol) ? 'empty' : 'grey';
                    } else if (r === frontRow - 1 && c === singleHoleCol) {
                        cellTypes[idx] = 'empty'; // Clear entry into chamber
                    } else if (rows >= 6 && r === rows - 3 && (Math.abs(c - centerC) >= 3 && Math.abs(c - centerC) <= 4)) {
                        cellTypes[idx] = 'grey';
                    } else if (r === 0 && Math.abs(c - centerC) <= 1) {
                        cellTypes[idx] = 'gold';
                    }
                    break;
                }
            }
        }
    }

    return cellTypes;
}

export function createBreakoutLevel(options: LevelGenOptions): Brick[] {
    loadHistoryFromStorage();

    const { level, canvasWidth, forcePattern } = options;
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
    // 2. Procedural & Non-Repeating Arena Bricks ("iga mäng uus mapp aga ei tohi korduda")
    // -------------------------------------------------------------
    const totalPadding = (cols - 1) * padding + sidePadding * 2;
    const brickWidth = Math.max(20, (canvasWidth - totalPadding) / cols);

    const targetGoldCount = isLevel2 ? 8 : 6;
    const targetGreyObstacles = isLevel2 ? 10 : 6;
    const totalPlayableCells = rows * cols;

    let chosenPattern = forcePattern || getNextShufflePattern();
    let cellTypes: ('green' | 'gold' | 'grey' | 'empty')[] = [];
    let mapSignature = '';
    let attempts = 0;

    // Generate unique layout that has NOT been played recently
    while (attempts < 50) {
        attempts++;
        const variantSeed = Math.floor(Math.random() * 10000);
        cellTypes = generatePatternCells(chosenPattern, rows, cols, variantSeed);

        // Scatter target gold and grey bricks
        let currentGold = cellTypes.filter(t => t === 'gold').length;
        let currentGrey = cellTypes.filter(t => t === 'grey').length;
        const isOneHolePattern = chosenPattern === 'bunker_gate' || chosenPattern === 'stone_vault' || chosenPattern === 'funnel_chamber';

        let goldAttempts = 0;
        while (currentGold < targetGoldCount && goldAttempts < 100) {
            goldAttempts++;
            const randIdx = Math.floor(Math.random() * totalPlayableCells);
            if (cellTypes[randIdx] === 'green') {
                const randR = Math.floor(randIdx / cols);
                if (isOneHolePattern && randR >= rows - 2) {
                    continue;
                }
                cellTypes[randIdx] = 'gold';
                currentGold++;
            }
        }

        let greyAttempts = 0;
        while (currentGrey < targetGreyObstacles && greyAttempts < 100) {
            greyAttempts++;
            const randIdx = Math.floor(Math.random() * totalPlayableCells);
            if (cellTypes[randIdx] === 'green') {
                const randR = Math.floor(randIdx / cols);
                // In 1-hole patterns, protect the front entrance and corridor from accidental grey blocks
                if (isOneHolePattern && (randR === rows - 1 || randR === rows - 2)) {
                    continue;
                }
                cellTypes[randIdx] = 'grey';
                currentGrey++;
            }
        }

        mapSignature = `${level}:${chosenPattern}:${cellTypes.join('')}`;

        if (!layoutHistory.has(mapSignature)) {
            break; // Guaranteed completely unique map!
        }

        // If collision happened (already played this exact map), pick another pattern variant
        if (!forcePattern) {
            chosenPattern = getNextShufflePattern();
        }
    }

    saveHistoryToStorage(mapSignature);

    // Instantiate arena bricks
    for (let r = 0; r < rows; r++) {
        const colorScheme = greenColors[r % greenColors.length];
        const y = topOffset + r * (brickHeight + padding);

        for (let c = 0; c < cols; c++) {
            const x = sidePadding + c * (brickWidth + padding);
            const idx = r * cols + c;
            const type = cellTypes[idx];

            if (type === 'empty') {
                // "ainult 1 auk kust pall sisse läheb" -> open hole/gap, no brick spawned!
                continue;
            } else if (type === 'grey') {
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

    // Attach metadata for verification and UI
    (bricks as any).__signature = mapSignature;
    (bricks as any).__pattern = chosenPattern;

    return bricks;
}
