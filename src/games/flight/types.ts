import * as THREE from 'three';

export type CameraViewMode = 'chase' | 'cockpit' | 'wing' | 'flyby';

export type WeatherMode = 'clear' | 'sunset' | 'rain' | 'storm' | 'snow' | 'fog';

export type EmergencyMode = 'none' | 'engine_fire' | 'gear_fail' | 'fuel_empty' | 'turbulence' | 'wing_damage';

export interface AircraftConfig {
    id: string;
    name: string;
    category: 'Trainer' | 'Commercial' | 'Fighter' | 'Supersonic' | 'Seaplane' | 'Vintage' | 'Experimental';
    description: string;
    icon: string;
    
    // Performance parameters
    maxSpeedKnots: number;
    cruiseSpeedKnots: number;
    stallSpeedKnots: number;
    climbRateFtMin: number;
    rollRateDegSec: number;
    pitchRateDegSec: number;
    yawRateDegSec: number;
    
    weightKg: number;
    wingSpanMeters: number;
    engineType: 'propeller' | 'jet' | 'rocket';
    engineCount: number;
    hasAfterburner?: boolean;
    hasFloats?: boolean;
    
    primaryColor: number;
    secondaryColor: number;
    price: number;
}

export interface FlightStateData {
    throttle: number; // 0 to 1
    airspeed: number; // knots
    groundSpeed: number; // knots
    altitude: number; // feet
    verticalSpeed: number; // ft/min
    heading: number; // degrees 0-360
    pitch: number; // degrees -90 to +90
    roll: number; // degrees -180 to +180
    gearDown: boolean;
    gearTransition: number; // 0 (up) to 1 (down)
    flaps: number; // 0 (clean), 1 (15 deg), 2 (30 deg)
    brakes: boolean;
    airbrakes: boolean;
    afterburner: boolean;
    autopilot: boolean;
    targetAltitude: number;
    targetHeading: number;
    stalled: boolean;
    gForce: number;
    fuelPercent: number;
    antiIce: boolean;
    emergency: EmergencyMode;
    isCrashed: boolean;
    isOnGround: boolean;
}

export interface AircraftMeshBundle {
    group: THREE.Group;
    bodyMesh: THREE.Object3D;
    propellers: THREE.Object3D[];
    landingGears: THREE.Object3D[];
    ailerons: { left?: THREE.Object3D; right?: THREE.Object3D };
    elevators: THREE.Object3D[];
    rudder?: THREE.Object3D;
    navLights: THREE.Light[];
    cockpitAnchor?: THREE.Object3D;
    wingtipAnchors: { left: THREE.Vector3; right: THREE.Vector3 };
    exhaustAnchors: THREE.Vector3[];
    gearDownY: number;
    gearUpY: number;
}

export interface AirportConfig {
    id: string;
    name: string;
    code: string;
    runwayHeadingDeg: number;
    runwayStart: THREE.Vector3;
    runwayEnd: THREE.Vector3;
    runwayWidth: number;
    runwayLength: number;
}

export interface StuntRing {
    id: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    radius: number;
    mesh: THREE.Group;
    collected: boolean;
    reward: number;
}
