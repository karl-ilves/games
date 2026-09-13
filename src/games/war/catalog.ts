import * as THREE from 'three';
import { UnitClass, Team } from './types';

export interface RosterEntry {
    name: string;
    class: UnitClass;
    x: number;
    z: number;
}

export const BLUE_ROSTER: RosterEntry[] = [
    { name: 'Kpt. Miller', class: 'tank', x: -70, z: -260 },
    { name: 'Tank Titan', class: 'tank', x: 0, z: -275 },
    { name: 'Tank Ironclad', class: 'tank', x: 70, z: -260 },
    { name: 'Srs. Kask', class: 'soldier', x: -90, z: -250 },
    { name: 'Kpr. Hunt', class: 'soldier', x: -40, z: -250 },
    { name: 'Ream. Tamm', class: 'soldier', x: -20, z: -245 },
    { name: 'Kpr. Ilves', class: 'soldier', x: 20, z: -245 },
    { name: 'Sõdur Karu', class: 'soldier', x: 40, z: -250 },
    { name: 'Srs. Sepp', class: 'soldier', x: 90, z: -250 },
    { name: 'Ream. Kuusk', class: 'soldier', x: 0, z: -240 }
];

export const RED_ROSTER: RosterEntry[] = [
    { name: 'Tank Viper', class: 'tank', x: -70, z: 260 },
    { name: 'Tank Goliath', class: 'tank', x: 0, z: 275 },
    { name: 'Tank Panzer', class: 'tank', x: 70, z: 260 },
    { name: 'Sõdur Fox', class: 'soldier', x: -90, z: 250 },
    { name: 'Snaiper Hawk', class: 'soldier', x: -40, z: 250 },
    { name: 'Kpt. Wolf', class: 'soldier', x: -20, z: 245 },
    { name: 'Srs. Shadow', class: 'soldier', x: 20, z: 245 },
    { name: 'Kpr. Blaze', class: 'soldier', x: 40, z: 250 },
    { name: 'Ream. Storm', class: 'soldier', x: 90, z: 250 },
    { name: 'Sõdur Ghost', class: 'soldier', x: 0, z: 240 }
];
