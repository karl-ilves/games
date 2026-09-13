import * as THREE from 'three';
import { StageInfo, ShopItem } from './types';

export const STAGES: StageInfo[] = [
    { id: 1, nameEt: 'Algaja Hüpped', nameEn: 'Beginner Steps', color: 0x00f2fe, spawnPos: new THREE.Vector3(0, 2, 0) },
    { id: 2, nameEt: 'Kaduvad Klotsid', nameEn: 'Disappearing Tiles', color: 0xffa502, spawnPos: new THREE.Vector3(0, 2, -45) },
    { id: 3, nameEt: 'Liikuvad Platvormid', nameEn: 'Moving Platforms', color: 0x2ed573, spawnPos: new THREE.Vector3(0, 2, -90) },
    { id: 4, nameEt: 'Punane Laavarada', nameEn: 'Lava Leap', color: 0xff4757, spawnPos: new THREE.Vector3(0, 2, -135) },
    { id: 5, nameEt: 'Super Batuudid', nameEn: 'Super Bounce Pads', color: 0x1e90ff, spawnPos: new THREE.Vector3(0, 2, -180) },
    { id: 6, nameEt: 'Spiraalhüpped', nameEn: 'Neon Spiral Hop', color: 0x9b59b6, spawnPos: new THREE.Vector3(0, 2, -230) },
    { id: 7, nameEt: 'Kitsas Tasakaalutala', nameEn: 'Sky Balance Beams', color: 0x1abc9c, spawnPos: new THREE.Vector3(0, 2, -280) },
    { id: 8, nameEt: 'Libe Jääpalee', nameEn: 'Slippery Ice Palace', color: 0x70a1ff, spawnPos: new THREE.Vector3(0, 2, -330) },
    { id: 9, nameEt: 'Veerevad Hiidvasarad', nameEn: 'Swinging Hammers', color: 0xe67e22, spawnPos: new THREE.Vector3(0, 2, -380) },
    { id: 10, nameEt: 'Taevane Tsitadell', nameEn: 'Celestial Citadel', color: 0xffd32a, spawnPos: new THREE.Vector3(0, 2, -430) }
];

export function getHats(isOwner: boolean): ShopItem[] {
    return [
        { id: 'hat_crown', name: isOwner ? '👑 Kuldne Kroon' : '👑 Golden Crown', price: 50 },
        { id: 'hat_viking', name: isOwner ? '🪖 Viikingikiiver' : '🪖 Viking Helmet', price: 80 },
        { id: 'hat_halo', name: isOwner ? '😇 Helendav Aupaiste' : '😇 Glowing Halo', price: 120 },
        { id: 'hat_tophat', name: isOwner ? '🎩 Härrasmehe Silinder' : '🎩 Top Hat', price: 60 }
    ];
}

export function getTrails(isOwner: boolean): ShopItem[] {
    return [
        { id: 'trail_rainbow', name: isOwner ? '🌈 Vikerkaare Rada' : '🌈 Rainbow Trail', price: 100 },
        { id: 'trail_fire', name: isOwner ? '🔥 Leegirada' : '🔥 Flame Trail', price: 150 },
        { id: 'trail_sparks', name: isOwner ? '⚡ Sädemete Rada' : '⚡ Lightning Sparks', price: 200 }
    ];
}

export function getBoots(isOwner: boolean): ShopItem[] {
    return [
        { id: 'boots_speed', name: isOwner ? '👟 Kiirustossud (+25% Speed)' : '👟 Speed Runners (+25%)', price: 100 },
        { id: 'boots_moon', name: isOwner ? '🦘 Kuusaapad (+40% Jump)' : '🦘 Moon Boots (+40%)', price: 150 }
    ];
}

export const SKINS: ShopItem[] = [
    { id: 'skin_cyan', name: 'Neon Cyan', price: 0 },
    { id: 'skin_ruby', name: 'Ruby Red', price: 60 },
    { id: 'skin_emerald', name: 'Emerald Green', price: 60 },
    { id: 'skin_gold', name: 'Golden Sun', price: 120 },
    { id: 'skin_purple', name: 'Cyber Purple', price: 80 }
];
