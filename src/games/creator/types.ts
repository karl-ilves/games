import * as THREE from "three";
export type { CustomShapeType } from "../../shared/yardService";

export interface ObjectScriptAction {
    type: "dialog" | "speed_boost" | "jump_boost" | "give_coins" | "give_yards" | "damage" | "heal" | "teleport" | "change_color" | "animate_motion" | "play_sound" | "custom_js";
    message?: string;
    speedMultiplier?: number;
    duration?: number; // seconds
    jumpForce?: number;
    amount?: number;
    teleportTarget?: { x: number; y: number; z: number };
    colorHex?: string;
    motionType?: "patrol" | "elevator" | "rotate" | "bounce";
    soundName?: "coin" | "jump" | "powerup" | "hit" | "victory" | "teleport" | "laser";
    customCode?: string;
}

export interface ObjectScript {
    trigger: "onPlayerTouch" | "onInteract" | "onTimer" | "onStart";
    timerInterval?: number; // seconds
    cooldown?: number; // seconds
    lastTriggered?: number;
    preset?: string;
    actions: ObjectScriptAction[];
    customJsCode?: string;
    enabled?: boolean;
}

export interface PlacedObject {
    id: string;
    mesh: THREE.Group | THREE.Mesh;
    catalogId: string;
    name: string;
    category: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    color: string;
    isPassable?: boolean;
    parentId?: string | null;
    isAirplane?: boolean;
    isBoat?: boolean;
    isSpawnPoint?: boolean;
    isInvisibleSpawn?: boolean;
    portalTargetId?: string;
    portalTargetTitle?: string;
    gameItemType?: "coin" | "key" | "door" | "weapon" | "potion" | "goal" | "checkpoint" | "hazard" | "shop" | "enemy" | "boss" | "npc";
    keyName?: string;
    requiredKeyName?: string;
    isUnlocked?: boolean;
    isCollected?: boolean;
    enemyData?: {
        health: number;
        maxHealth: number;
        damage: number;
        speed: number;
        lastAttackTime?: number;
        isBoss?: boolean;
        name: string;
    };
    trigger?: {
        type: "touch" | "proximity" | "portal" | "key_door" | "goal_win" | "hazard_lava" | "checkpoint" | "shop";
        behavior?: string;
        message?: string;
        title?: string;
        radius?: number;
        targetWorldId?: string;
        targetWorldTitle?: string;
    };
    script?: ObjectScript;
    movement?: {
        type: "patrol" | "elevator" | "rotate" | "bounce" | "circle";
        axis?: "x" | "y" | "z";
        speed: number;
        distance: number;
        origin: { x: number; y: number; z: number };
        rotationSpeed?: number;
    };
    isHoldable?: boolean;
    inHandAtStart?: boolean;
    costsPbx?: boolean;
    pbxPrice?: number;
    dealsDamage?: boolean;
    damageAmount?: number;
    isHeld?: boolean;
    customModelData?: {
        shapeType: "box" | "wedge" | "cylinder" | "pyramid" | "dome";
        width: number;
        height: number;
        depth: number;
        topElevation?: number;
        faceOffsets?: { [key: string]: number };
        isHazard?: boolean;
        isHeal?: boolean;
        isBoost?: boolean;
        isHoldable?: boolean;
        inHandAtStart?: boolean;
        costsPbx?: boolean;
        pbxPrice?: number;
    };
}

export interface SeaConfig {
    type: "whole" | "part" | "island";
    boundary?: {
        axis: "x" | "z";
        side: "positive" | "negative";
        threshold: number;
    };
    waterLevel: number;
    waterColor?: number;
    waveSpeed?: number;
    waveHeight?: number;
}

export interface SceneSnapshot {
    title: string;
    desc: string;
    category: string;
    envMode: "day" | "night" | "sunset" | "horror_fog";
    mapType?: "land" | "sea";
    seaConfig?: SeaConfig | null;
    objects: Array<{
        id?: string;
        parentId?: string | null;
        catalogId: string;
        name: string;
        category: string;
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
        color: string;
        isPassable?: boolean;
        isAirplane?: boolean;
        isBoat?: boolean;
        isSpawnPoint?: boolean;
        isInvisibleSpawn?: boolean;
        gameItemType?: string;
        trigger?: any;
        script?: ObjectScript;
        customModelData?: any;
    }>;
}

export interface PlayTestSnapshot {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
}

export interface CatalogItem {
    id: string;
    name: string;
    category: string;
    icon: string;
    color: string;
    geometryType: string;
    baseScale: number;
    isPassable?: boolean;
    isAirplane?: boolean;
    isBoat?: boolean;
    isSpawnPoint?: boolean;
    isInvisibleSpawn?: boolean;
    gameItemType?: "coin" | "key" | "door" | "weapon" | "potion" | "goal" | "checkpoint" | "hazard" | "shop" | "enemy" | "boss" | "npc";
    keyName?: string;
    requiredKeyName?: string;
    enemyData?: {
        health: number;
        maxHealth: number;
        damage: number;
        speed: number;
        isBoss?: boolean;
        name: string;
    };
    trigger?: {
        type: "touch" | "proximity" | "portal" | "key_door" | "goal_win" | "hazard_lava" | "checkpoint" | "shop";
        behavior?: string;
        message?: string;
        title?: string;
        radius?: number;
    };
    movement?: {
        type: "patrol" | "elevator" | "rotate" | "bounce" | "circle";
        axis?: "x" | "y" | "z";
        speed: number;
        distance: number;
        origin: { x: number; y: number; z: number };
        rotationSpeed?: number;
    };
    script?: ObjectScript;
    isHoldable?: boolean;
    inHandAtStart?: boolean;
    costsPbx?: boolean;
    pbxPrice?: number;
    dealsDamage?: boolean;
    damageAmount?: number;
    subCategory?: string;
}

export type StudioToolMode = "mouse" | "mover" | "puller";
export type PullEdgeAxis = "all" | "x" | "y" | "z";

export interface WorkbenchPart {
    id: string;
    shapeType: CustomShapeType;
    width: number;
    height: number;
    depth: number;
    topElevation?: number;
    faceOffsets?: { [key: string]: number };
    color: string;
    offsetX: number;
    offsetY: number;
    offsetZ: number;
    rotY: number;
}

export interface WorkbenchState {
    name: string;
    category: "custom";
    shapeType: CustomShapeType;
    width: number;
    height: number;
    depth: number;
    topElevation?: number;
    faceOffsets?: { [key: string]: number };
    color: string;
    isHazard: boolean;
    isHeal: boolean;
    isBoost: boolean;
    itemType: "item" | "static";
    isHoldable: boolean;
    inHandAtStart: boolean;
    costsPbx: boolean;
    pbxPrice: number;
    parts: WorkbenchPart[];
    selectedPartIndex: number;
}

export type DragPlaneType = "top" | "front" | "back" | "left" | "right" | "bottom" | "slope";

export interface AiSchoolRule {
    triggerPhrase: string;
    actionType: string;
    detail: string;
    createdAt: number;
}

export interface PlayardAiContextMemory {
    lastBuildingType?: string;
    lastBuildingPos?: { x: number; y: number; z: number };
    lastShopPos?: { x: number; y: number; z: number };
    lastPlacedObjects?: PlacedObject[];
    lastGameType?: "horror" | "rpg" | "city" | "flight" | "tornado_escape" | "parkour" | "standard";
    lastSpawnPos?: { x: number; y: number; z: number };
    lastAirportPos?: { x: number; y: number; z: number };
    lastAirportRotation?: number;
    tornadoMesh?: THREE.Group | THREE.Mesh;
    tornadoSpeed?: number;
    tornadoDirection?: THREE.Vector3;
    crystalCooldownSec?: number;
    lastConversationTopic?: string;
    learnedRules?: AiSchoolRule[];
}
