import * as THREE from 'three';

export interface VehicleConfig {
    id: string;
    name: string;
    category: 'Muscle' | 'Supercar' | 'Truck' | 'Sedan' | 'Compact';
    description: string;
    icon: string;
    massKg: number;
    enginePower: number;
    topSpeedKmh: number;
    brakeForce: number;
    steerSpeed: number;
    stiffness: number; // 0.2 (very soft tin can) to 1.5 (heavy reinforced frame)
    primaryColor: number;
    secondaryColor: number;
    dimensions: { length: number; width: number; height: number };
    hasThrusters?: boolean;
}

export interface CrashObstacle {
    id: string;
    name: string;
    type: 'wall' | 'crusher' | 'ramp' | 'spikes' | 'pillars' | 'loop' | 'cliff';
    position: THREE.Vector3;
    rotation?: THREE.Euler;
    mesh: THREE.Object3D;
    boundingBox: THREE.Box3;
    damageFactor: number;
}

export interface DeformableVertex {
    original: THREE.Vector3;
    current: THREE.Vector3;
    displacement: THREE.Vector3;
    nodeIndex: number;
    zone: 'front' | 'rear' | 'left' | 'right' | 'roof' | 'chassis';
}

export interface CarCrashState {
    speedKmh: number;
    gear: string;
    damagePercent: number;
    gForce: number;
    deformedNodesCount: number;
    isSlowMo: boolean;
    slowMoScale: number;
    selectedVehicleId: string;
    cameraMode: 'chase' | 'hood' | 'cinematic' | 'orbit';
    totalCrashes: number;
    maxImpactG: number;
}
