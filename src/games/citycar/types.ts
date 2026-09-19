import * as THREE from 'three';

export interface CarInputState {
    throttle: number; // 0 to 1
    brake: number;    // 0 to 1
    steer: number;    // -1 (left) to 1 (right)
    handbrake: boolean;
    horn: boolean;
    reset: boolean;
}

export type Gear = 'P' | 'D' | 'R';

export interface CarPhysicsState {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    velocity: THREE.Vector3;
    speed: number;          // in km/h
    steeringAngle: number;  // current front wheel angle in radians
    wheelRotation: number;  // wheel spin angle
    gear: Gear;
    isDrifting: boolean;
    isGrounded: boolean;
    currentZone: WorldZone;
}

export type WorldZone = 'city' | 'bridge' | 'river' | 'border' | 'forest';

export type CameraMode = 'chase' | 'close' | 'hood' | 'topdown';

export interface CarVisualConfig {
    bodyColor: string;
    secondaryColor: string;
    driverName: string;
    isOpponent?: boolean;
}

export interface CarNetworkPacket {
    id: string;
    name: string;
    color: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    speed: number;
    wheelRot: number;
    steerAngle: number;
    zone: WorldZone;
    time: number;
}

export interface DriverInfo {
    id: string;
    name: string;
    color: string;
    isLocal: boolean;
    lastSeen: number;
    speed: number;
    zone: WorldZone;
}
