export type StageTheme = 'neon' | 'glass' | 'lava' | 'sky' | 'royal';

export type HazardType = 'lava' | 'laser' | 'spinner' | 'fading';

export interface PlatformDef {
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    depth: number;
    color: string;
    shape?: 'box' | 'cylinder' | 'wedge' | 'sphere';
    isHazard?: boolean;
    hazardType?: HazardType;
    isMoving?: boolean;
    moveAxis?: 'x' | 'y' | 'z';
    moveDist?: number;
    moveSpeed?: number;
}

export interface StageDef {
    stageNumber: number;
    theme: StageTheme;
    title: string;
    spawnPos: { x: number; y: number; z: number };
    platforms: PlatformDef[];
    isFinalStage?: boolean;
}

export interface ChatMessage {
    id: string;
    author: string;
    isOwner: boolean;
    text: string;
    timestamp: number;
}

export interface PlayerProgress {
    id: string;
    name: string;
    isOwner: boolean;
    stage: number;
    percentage: number;
    isFinished: boolean;
}
