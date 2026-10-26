export type BuildCategory = 'pools' | 'tubes';

export type SubCategory = 'main' | 'kids_tubes';

export interface ParkAttractionDef {
    id: string;
    name: string;
    category: BuildCategory;
    subCategory?: SubCategory;
    cost: number;
    description: string;
    icon: string;
    color: number;
    dimensions: { x: number; y: number; z: number };
    // Rules
    isTower?: boolean;
    isSlideStart?: boolean;
    isSlideSegment?: boolean;
    isKidsSlide?: boolean;
}

export interface PlacedStructure {
    instanceId: string;
    attractionId: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    builtAt: number;
    stackLevel?: number; // for tower segments (0 to 5, max 6 stacked)
    attachedToId?: string; // id of structure/pipe it attaches to
    exitPos?: { x: number; y: number; z: number };
    exitRotY?: number;
}
