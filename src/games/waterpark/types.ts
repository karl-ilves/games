export type ParkTheme = 'tropical' | 'pirate' | 'neon' | 'arctic';

export type BuildCategory = 'pools' | 'slides' | 'attractions' | 'amenities' | 'scenery';

export interface ParkAttractionDef {
    id: string;
    name: string;
    category: BuildCategory;
    cost: number;
    ratingBonus: number;
    incomePerMin: number;
    description: string;
    icon: string;
    color: number;
    dimensions: { x: number; y: number; z: number };
    unlockedByDefault?: boolean;
}

export interface PlacedStructure {
    instanceId: string;
    attractionId: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    builtAt: number;
}

export interface VisitorGuest {
    id: string;
    name: string;
    meshId: number;
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    happiness: number; // 0 to 100
    currentAction: 'walking' | 'swimming' | 'sliding' | 'eating' | 'sunbathing';
    actionTimer: number;
    slideProgress?: number;
    preferredAttractionId?: string;
}

export interface ParkStats {
    cash: number;
    reputation: number; // 0 to 100
    cleanliness: number; // 0 to 100
    guestCapacity: number;
    currentVisitors: number;
    ticketPrice: number;
    wavePoolActive: boolean;
    parkName: string;
    dayTimeHours: number; // 8 to 22
}

export type CameraViewMode = 'orbit' | 'fpv' | 'slide_ride' | 'drone';
