/**
 * PYGA (PlaYard Game AI) – 3D object & world construction types.
 * Pure data types: no Three.js / DOM dependencies so everything is unit-testable.
 */

export type Vec3 = [number, number, number];

export type PygaShape = 'box' | 'cylinder' | 'sphere' | 'cone';

export type PygaMaterial = 'standard' | 'metal' | 'glass' | 'wood' | 'stone' | 'neon' | 'fabric' | 'rubber' | 'water' | 'foliage';

export type PygaAnimKind =
    | 'spin'     // continuous rotation around axis (fans, propellers, rotors, wheels)
    | 'swing'    // hinged rotation around a pivot (doors, barriers, gates)
    | 'slide'    // back-and-forth translation (elevators, sliding doors)
    | 'blink'    // light turning on/off (lamps, beacons, traffic lights)
    | 'bob'      // gentle floating (boats, balloons)
    | 'drive'    // moving forward along local axis and looping (vehicles)
    | 'retract'; // retracting/extending (landing gear)

export interface PygaAnimation {
    kind: PygaAnimKind;
    axis?: 'x' | 'y' | 'z';
    /** rad/s for spin, cycles/s for swing/slide/blink/bob, m/s for drive */
    speed?: number;
    /** swing angle in radians, slide/drive/retract distance in meters */
    amplitude?: number;
    /** Hinge point relative to the part center (local, before assembly transform). */
    pivot?: Vec3;
    /** auto = always animates, click = toggles when clicked in preview */
    trigger?: 'auto' | 'click';
    /** Alternate color for blink */
    color2?: string;
    phase?: number;
}

export interface PygaPart {
    /** Unique within the assembly, e.g. 'wing_l' */
    id: string;
    /** Human readable Estonian name, e.g. 'Vasak tiib' */
    name: string;
    /** Semantic group used for modifications: 'fuselage', 'wing', 'engine', 'door', 'wall', ... */
    role: string;
    shape: PygaShape;
    /**
     * box: [width, height, depth]
     * cylinder: [topDiameter, height, bottomDiameter] (axis = local Y)
     * cone: [baseDiameter, height, baseDiameter]
     * sphere: [dx, dy, dz] ellipsoid diameters
     */
    size: Vec3;
    /** Center position in assembly-local meters (Y up, +Z = forward / front). */
    pos: Vec3;
    /** Euler rotation (XYZ) in radians */
    rot?: Vec3;
    color: string;
    material?: PygaMaterial;
    opacity?: number;
    anim?: PygaAnimation;
    /**
     * Part id this part is mounted on / contained in. Overlap between a part and its
     * parent (or anything up the chain) is intentional and ignored by the quality checker.
     */
    attachedTo?: string;
    /** Interaction description, e.g. 'door', 'button', 'elevator', 'light', 'vehicle' */
    interactive?: string;
}

export interface PygaColors {
    primary?: string;
    secondary?: string;
    accent?: string;
    /** Multi-color livery, e.g. Estonian flag ['#0072ce', '#111111', '#ffffff'] */
    livery?: string[];
}

export interface PygaBuildOptions {
    /** Overall uniform size multiplier (1 = realistic size) */
    scale: number;
    colors: PygaColors;
    /** Generic count requested by the user (runways, engines, trees, rows, ...) */
    count?: number;
    floors?: number;
    engines?: number;
    variant?: string;
    /** Feature flags, e.g. 'garage', 'engines_running', 'gear_animated', 'cutaway', 'lights', 'details' */
    features: string[];
    style: 'realistic' | 'stylized';
    /** Inner free space a container (hangar, garage) must fit: [w, h, d] meters */
    fit?: Vec3;
    /** Deterministic seed for nature randomness */
    seed?: number;
}

export type PygaCategory =
    | 'aircraft'
    | 'vehicle'
    | 'building'
    | 'furniture'
    | 'nature'
    | 'infrastructure'
    | 'interactive'
    | 'character'
    | 'world';

export interface PygaBlueprint {
    id: string;
    /** Estonian display name, e.g. 'Reisilennuk' */
    name: string;
    category: PygaCategory;
    /** Lower-case Estonian & English stems used by the prompt parser (longest match wins). */
    keywords: string[];
    build(opts: PygaBuildOptions): PygaPart[];
    /** Approximate real-world bounding size [width(x), height(y), depth(z)] at scale 1. */
    realSize?: Vec3;
    /** Optional feature flags this blueprint honors (used for honest capability reporting). */
    supportedFeatures?: string[];
    /** Container blueprints (hangar, garage) can hold another assembly inside. */
    isContainer?: boolean;
    /** Emoji icon for chat */
    icon?: string;
}

/** A placement of an assembly inside a world. */
export interface PygaPlacement {
    blueprintId: string;
    name?: string;
    position: Vec3;
    rotationY?: number;
    options?: Partial<PygaBuildOptions>;
}

export interface PygaWorldBlueprint {
    id: string;
    name: string;
    keywords: string[];
    icon?: string;
    /** Returns the assemblies that make up the world (pure layout, no overlaps). */
    layout(opts: PygaBuildOptions): PygaPlacement[];
    /** Ground size [width, depth] */
    groundSize: [number, number];
    groundColor: string;
}

export interface PygaPartOverride {
    move?: Vec3;
    rotate?: Vec3;
    shape?: PygaShape;
    scale?: Vec3;
}

/** Persistent, re-buildable description of an object placed in the scene. */
export interface PygaAssemblyRecord {
    id: string;
    blueprintId: string;
    name: string;
    options: PygaBuildOptions;
    position: Vec3;
    rotationY: number;
    /** Per-axis stretch multiplier (pikemaks / laiemaks / kõrgemaks) */
    stretch: Vec3;
    /** role -> color */
    colorOverrides: Record<string, string>;
    removedRoles: string[];
    addedParts: PygaPart[];
    /** role -> override */
    partOverrides: Record<string, PygaPartOverride>;
    /** Id of the world this assembly belongs to (if built as part of a world) */
    worldId?: string;
    createdAt: number;
}

export interface PygaQualityReport {
    partCount: number;
    unintendedOverlaps: Array<{ a: string; b: string; ratio: number }>;
    proportionOk: boolean;
    measuredSize: Vec3;
    expectedSize?: Vec3;
    issues: string[];
}
