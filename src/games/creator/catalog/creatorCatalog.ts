import * as THREE from 'three';
import { CatalogItem } from '../types';
import { get1000HoldableCatalogItems } from './holdableItems';
import { studioTestPlaybux, setStudioTestPlaybux } from '../state/creatorState';
import { yardService } from '../../../shared/yardService';
import { t } from '../../../shared/i18n_dict';

export const CATALOG_DATABASE: CatalogItem[] = [];

let studioTestPlaybux = 6000000;

export function getStudioTestPlaybux(): number {
    return studioTestPlaybux;
}

export function updateStudioTestPlaybuxDisplay() {
    const el = document.getElementById('studio-test-pbx');
    if (el) {
        el.innerText = studioTestPlaybux.toLocaleString();
    }
}

export function generate10000ObjectCatalog() {
    // 1. Featured Primary Spawn Points (Both Visible and Invisible)
    const primarySpawnItems: CatalogItem[] = [
        {
            id: 'spawn_invisible',
            name: '👻 Nähtamatu Alguspunkt',
            category: 'spawn',
            icon: '👻',
            color: '#00f2fe',
            geometryType: 'spawn_invisible',
            baseScale: 1.0
        },
        {
            id: 'spawn_pad_visible',
            name: '📍 Helendav Platvorm (Nähtav)',
            category: 'spawn',
            icon: '📍',
            color: '#00cec9',
            geometryType: 'spawn_pad_visible',
            baseScale: 1.0
        },
        {
            id: 'spawn_flag',
            name: '🚩 Kontrollpunkti Lipp (Nähtav)',
            category: 'spawn',
            icon: '🚩',
            color: '#ff4757',
            geometryType: 'spawn_flag',
            baseScale: 1.0
        },
        {
            id: 'spawn_portal',
            name: '🌀 Portaali Värav (Nähtav)',
            category: 'spawn',
            icon: '🌀',
            color: '#a855f7',
            geometryType: 'spawn_portal',
            baseScale: 1.0
        },
        {
            id: 'spawn_water_buoy',
            name: '🛟 Ujuv Veepinna Poi (Nähtav)',
            category: 'spawn',
            icon: '🛟',
            color: '#ff7675',
            geometryType: 'spawn_water_buoy',
            baseScale: 1.0
        },
        {
            id: 'spawn_deep_seabed',
            name: '⚓ Süvavee Baas (~10m all)',
            category: 'spawn',
            icon: '⚓',
            color: '#0984e3',
            geometryType: 'spawn_deep_seabed',
            baseScale: 1.0
        },
        {
            id: 'spawn_hologram_beacon',
            name: '📡 Hologramm Majakas (Nähtamatu)',
            category: 'spawn',
            icon: '📡',
            color: '#55efc4',
            geometryType: 'spawn_hologram_beacon',
            baseScale: 1.0
        },
        {
            id: 'spawn_torii',
            name: '⛩️ Müstiline Värav (Nähtav)',
            category: 'spawn',
            icon: '⛩️',
            color: '#d63031',
            geometryType: 'spawn_torii',
            baseScale: 1.0
        },
        {
            id: 'spawn_golden_altar',
            name: '🏆 Kuldne Trooni Alguspunkt (Nähtav)',
            category: 'spawn',
            icon: '🏆',
            color: '#fdcb6e',
            geometryType: 'spawn_golden_altar',
            baseScale: 1.0
        },
        {
            id: 'spawn_cyber_ring',
            name: '⚡ Küber-Rõngas (Nähtamatu)',
            category: 'spawn',
            icon: '⚡',
            color: '#fd79a8',
            geometryType: 'spawn_cyber_ring',
            baseScale: 1.0
        }
    ];

    primarySpawnItems.forEach(item => CATALOG_DATABASE.push(item));

    const categories: Array<{ id: CatalogItem['category']; name: string; icon: string; types: string[]; colors: string[] }> = [
        {
            id: 'spawn',
            name: 'Spawn Kohad',
            icon: '🚩',
            types: [
                'Invisible Spawn Marker',
                'Hologram Beacon Spawn',
                'Sci-Fi Spawn Pad',
                'Checkpoint Flag Post',
                'Dimension Spawn Gate',
                'Floating Ocean Buoy',
                'Deep Seabed Diving Station',
                'Mystic Torii Gate',
                'Golden Throne Shrine',
                'Cyber Ring Spawn'
            ],
            colors: ['#00f2fe', '#55efc4', '#00cec9', '#ff4757', '#a855f7', '#ff7675', '#0984e3', '#d63031', '#fdcb6e', '#fd79a8']
        },
        {
            id: 'nature',
            name: 'Nature',
            icon: '🌲',
            types: ['Pine Tree', 'Oak Tree', 'Palm Tree', 'Redwood', 'Alpine Rock', 'Granite Boulder', 'Flower Cluster', 'Bush', 'Lily Pad', 'Crystal Peak'],
            colors: ['#2ecc71', '#27ae60', '#16a085', '#7f8c8d', '#95a5a6', '#e67e22', '#1abc9c', '#34495e']
        },
        {
            id: 'city',
            name: 'City & Roads',
            icon: '🏙️',
            types: ['Asphalt Road', 'Highway Overpass', 'Crossroad', 'Curve Road', 'Skyscraper', 'Modern House', 'Apartment Tower', 'Street Light', 'Highway Sign', 'Guardrail'],
            colors: ['#34495e', '#2c3e50', '#7f8c8d', '#bdc3c7', '#3498db', '#f39c12', '#e74c3c', '#95a5a6']
        },
        {
            id: 'vehicles',
            name: 'Vehicles & Cars',
            icon: '🚗',
            types: ['Supercar', 'Muscle Car', 'Cyber Truck', 'Offroad Buggy', 'Police Cruiser', 'Sports Roadster', 'Fighter Jet', 'Prop Plane', 'Rescue Helicopter', 'Hoverboard'],
            colors: ['#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c', '#2c3e50', '#ecf0f1']
        },
        {
            id: 'gameplay',
            name: 'Gameplay & Portals',
            icon: '🎮',
            types: [
                'Lava Hazard Floor (-25 HP)',
                'Spike Block Trap (-20 HP)',
                'Medkit Health Pack (+35 HP)',
                'Health Heart Gem (+50 HP)',
                'Speed Booster Pad',
                'Super Jump Pad',
                'Yard Coin Ring',
                'Teleport Portal',
                'Checkpoint Arch',
                'Finish Line Gate'
            ],
            colors: ['#e74c3c', '#ff4757', '#2ecc71', '#00f2fe', '#ffd32a', '#9b59b6', '#ff9f1a', '#4facfe']
        },
        {
            id: 'scifi',
            name: 'Sci-Fi & Space',
            icon: '🚀',
            types: ['Cyber Power Tower', 'Quantum Core', 'Neon Pillar', 'Cargo Container', 'Fuel Plasma Tank', 'Alien Obelisk', 'Hologram Beacon', 'Solar Panel Array', 'Orbital Relic', 'Gravity Station'],
            colors: ['#00f2fe', '#9b59b6', '#ff007f', '#00ffcc', '#242f3d', '#34495e', '#f39c12', '#8e44ad']
        }
    ];

    let count = 0;
    categories.forEach(cat => {
        cat.types.forEach((type, typeIdx) => {
            for (let v = 1; v <= 200; v++) {
                count++;
                const color = cat.colors[(typeIdx + v) % cat.colors.length];
                CATALOG_DATABASE.push({
                    id: `obj_${cat.id}_${typeIdx + 1}_v${v}`,
                    name: `${type} #${v}`,
                    category: cat.id,
                    icon: cat.icon,
                    color: color,
                    geometryType: type.toLowerCase(),
                    baseScale: 1.0 + (v % 5) * 0.15
                });
            }
        });
    });

    // 3. Add 1000 Unique Holdable Items (with 50 Battle Damage Weapons)
    const holdableItems = get1000HoldableCatalogItems();
    holdableItems.forEach(item => {
        CATALOG_DATABASE.push(item as any);
    });

    console.log(`Generated ${CATALOG_DATABASE.length} unique objects in catalog.`);
}

export const IN_GAME_SHOP_CATALOG = [
    { id: 'potion_hp', name: 'Tervisejook (+50 HP)', icon: '🧪', price: 20, currency: 'coins' as const, type: 'heal' },
    { id: 'speed_boost', name: 'Super Kiirus (+100%)', icon: '⚡', price: 40, currency: 'coins' as const, type: 'speed' },
    { id: 'laser_sword', name: 'Laser Mõõk (Tugev)', icon: '⚔️', price: 75, currency: 'coins' as const, type: 'weapon' },
    { id: 'vip_gold_armor', name: 'VIP Kuldne Rüü', icon: '💎', price: 25, currency: 'yards' as const, type: 'armor' }
];