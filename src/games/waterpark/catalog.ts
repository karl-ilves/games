import { ParkAttractionDef } from './types';

export const PARK_ATTRACTIONS_CATALOG: ParkAttractionDef[] = [
    // --- POOLS ---
    {
        id: 'kiddie_pool',
        name: 'Laste Loduujula (Kiddie Splash Pool)',
        category: 'pools',
        cost: 250,
        ratingBonus: 5,
        incomePerMin: 15,
        description: 'Madal ja soe lastebassein rõõmsate minipritsmetega.',
        icon: '👶',
        color: 0x38bdf8,
        dimensions: { x: 8, y: 0.8, z: 8 },
        unlockedByDefault: true
    },
    {
        id: 'wave_pool',
        name: 'Mega Laine Bassen (Giant Wave Pool)',
        category: 'pools',
        cost: 1200,
        ratingBonus: 22,
        incomePerMin: 85,
        description: 'Võimsate tehislainetega ookeanisarnane elamusbassein!',
        icon: '🌊',
        color: 0x00f2fe,
        dimensions: { x: 18, y: 1.6, z: 24 }
    },
    {
        id: 'lazy_river',
        name: 'Laisk Jõgi (Lazy River Loop)',
        category: 'pools',
        cost: 1800,
        ratingBonus: 30,
        incomePerMin: 120,
        description: 'Voolav ringikujuline jõekanal, kus külastajad ujuvad kummirõngastel.',
        icon: '🛟',
        color: 0x0be881,
        dimensions: { x: 28, y: 1.2, z: 28 }
    },
    {
        id: 'jacuzzi_oasis',
        name: 'Mullivannide Oaas (Luxury Jacuzzi Spa)',
        category: 'pools',
        cost: 650,
        ratingBonus: 14,
        incomePerMin: 45,
        description: 'Soojendusega luksuslik mullibassein troopilise auruga.',
        icon: '🫧',
        color: 0x48dbfb,
        dimensions: { x: 7, y: 1.0, z: 7 }
    },

    // --- SLIDES ---
    {
        id: 'speed_slide',
        name: 'Välkkiire Toru (Kamikaze Speed Slide)',
        category: 'slides',
        cost: 800,
        ratingBonus: 18,
        incomePerMin: 55,
        description: 'Järsk ja adrenaliinirohke püstloodis liugur julgetele suplejatele!',
        icon: '⚡',
        color: 0xff4757,
        dimensions: { x: 6, y: 14, z: 20 },
        unlockedByDefault: true
    },
    {
        id: 'tornado_bowl',
        name: 'Tornado Keeris (Mega Vortex Bowl)',
        category: 'slides',
        cost: 2400,
        ratingBonus: 40,
        incomePerMin: 160,
        description: 'Hiiglaslik tsentrifugaallehter, kus keerled ringi enne vette kukkumist.',
        icon: '🌀',
        color: 0xffa502,
        dimensions: { x: 16, y: 16, z: 22 }
    },
    {
        id: 'twister_spiral',
        name: 'Spiraaltoru (Hydro Spiral Twister)',
        category: 'slides',
        cost: 1500,
        ratingBonus: 28,
        incomePerMin: 100,
        description: 'Kahekordne looklev liugur erksate kurvide ja veepihustitega.',
        icon: '🎢',
        color: 0x2ed573,
        dimensions: { x: 10, y: 12, z: 18 }
    },
    {
        id: 'raft_slide',
        name: 'Parve Rallitakso (Family Raft Slide)',
        category: 'slides',
        cost: 2100,
        ratingBonus: 35,
        incomePerMin: 140,
        description: 'Lai kummiparvede liurada kogu perele!',
        icon: '🛶',
        color: 0x1e90ff,
        dimensions: { x: 12, y: 10, z: 24 }
    },

    // --- ATTRACTIONS ---
    {
        id: 'tipping_bucket',
        name: 'Hiidämber (Splash Water Fortress)',
        category: 'attractions',
        cost: 950,
        ratingBonus: 20,
        incomePerMin: 65,
        description: 'Iga 30 sekundi järel kummutab 1000 liitrit vett allakoonduvatele külastajatele.',
        icon: '🪣',
        color: 0xff6b81,
        dimensions: { x: 10, y: 11, z: 10 }
    },
    {
        id: 'water_cannons',
        name: 'Veesuurtükkide Areena (Hydro Cannon Zone)',
        category: 'attractions',
        cost: 450,
        ratingBonus: 10,
        incomePerMin: 30,
        description: 'Interaktiivne pritsimise ja lahingu ala lastele ja noortele.',
        icon: '🔫',
        color: 0x70a1ff,
        dimensions: { x: 8, y: 3, z: 8 }
    },
    {
        id: 'diving_board',
        name: 'Olümpia Hüppetorn (10m Diving Tower)',
        category: 'attractions',
        cost: 700,
        ratingBonus: 15,
        incomePerMin: 45,
        description: '3m, 5m ja 10m hüppeplatvormid sügavasse vette saltode tegemiseks.',
        icon: '🏊‍♂️',
        color: 0x3742fa,
        dimensions: { x: 6, y: 12, z: 8 }
    },

    // --- AMENITIES ---
    {
        id: 'icecream_shack',
        name: 'Troopiline Jäätisekiosk (Gelato & Slushie)',
        category: 'amenities',
        cost: 350,
        ratingBonus: 8,
        incomePerMin: 35,
        description: 'Värskendav käsitööjäätis ja troopilised jääjoogid.',
        icon: '🍦',
        color: 0xffcccc,
        dimensions: { x: 4, y: 3.5, z: 4 },
        unlockedByDefault: true
    },
    {
        id: 'tiki_snack_bar',
        name: 'Tiki Rannabaar (Smoothies & Nachos)',
        category: 'amenities',
        cost: 600,
        ratingBonus: 12,
        incomePerMin: 55,
        description: 'Rannatoit, mahlad ja suupisted päikesevarjude all.',
        icon: '🍹',
        color: 0xeccc68,
        dimensions: { x: 6, y: 4, z: 5 }
    },
    {
        id: 'cabana_lounge',
        name: 'VIP Rannatoolide Salaaed (Luxury Cabanas)',
        category: 'amenities',
        cost: 500,
        ratingBonus: 11,
        incomePerMin: 40,
        description: 'Pehmed lamamistoolid ja varikatused lõõgastumiseks.',
        icon: '🏖️',
        color: 0xfffa65,
        dimensions: { x: 8, y: 3, z: 6 }
    },

    // --- SCENERY ---
    {
        id: 'palm_grove',
        name: 'Kookospalmide Salu (Tropical Palms)',
        category: 'scenery',
        cost: 150,
        ratingBonus: 4,
        incomePerMin: 5,
        description: 'Kõrged troopilised palmipuud, mis lisavad pargile sooja rannavaibi.',
        icon: '🌴',
        color: 0x2ed573,
        dimensions: { x: 4, y: 7, z: 4 },
        unlockedByDefault: true
    },
    {
        id: 'rocky_fountain',
        name: 'Kivine Geisri Purskkaev (Rock Fountain)',
        category: 'scenery',
        cost: 300,
        ratingBonus: 7,
        incomePerMin: 10,
        description: 'Looduskivist laotud pritsiv purskkaev LED-valgusega.',
        icon: '⛲',
        color: 0x747d8c,
        dimensions: { x: 5, y: 3.5, z: 5 }
    }
];

export const DEFAULT_TICKET_PRICE = 15;
export const MAX_GUESTS_PER_STRUCTURE = 12;
