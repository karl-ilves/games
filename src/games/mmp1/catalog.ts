import { CrateDef, CrateTier, MapConfig, MapId, WeaponSkinDef } from './types';

export const MAP_CATALOG: Record<MapId, MapConfig> = {
    hotel2: {
        id: 'hotel2',
        name: 'HOTEL 2',
        icon: '🏨',
        description: 'Luksuslik kahekorruseline hotell fuajee, tubade, koridoride ja rõdudega.',
        spawnPoints: [
            [0, 0, 0], [-10, 0, -8], [10, 0, -8], [-12, 0, 10], [12, 0, 10],
            [-22, 0, -2], [22, 0, -2], [0, 0, -12]
        ],
        coinSpawns: [
            [0, 1, 0], [-8, 1, -12], [8, 1, -12], [-14, 1, 8], [14, 1, 8],
            [-24, 1, -18], [24, 1, -18], [-24, 1, 18], [24, 1, 18],
            [0, 1, 20], [-16, 1, 0], [16, 1, 0], [0, 1, -26]
        ]
    },
    milbase: {
        id: 'milbase',
        name: 'MIL BASE',
        icon: '🪖',
        description: 'Militaarbaas kasarmute, radaripunkri, varustuse angaari ja siseõuega.',
        spawnPoints: [
            [0, 0, 0], [-14, 0, -10], [14, 0, -10], [-14, 0, 12], [14, 0, 12],
            [-24, 0, 0], [24, 0, 0], [0, 0, -22]
        ],
        coinSpawns: [
            [0, 1, 0], [-12, 1, -14], [12, 1, -14], [-16, 1, 12], [16, 1, 12],
            [-26, 1, -20], [26, 1, -20], [-26, 1, 20], [26, 1, 20],
            [0, 1, 22], [-20, 1, 0], [20, 1, 0], [0, 1, -28]
        ]
    },
    office: {
        id: 'office',
        name: 'OFFICE',
        icon: '🏢',
        description: 'Suur büroohoone boksikontorite, koosolekuruumi, serveriruumi ja puhkealaga.',
        spawnPoints: [
            [0, 0, 0], [-14, 0, -12], [14, 0, -12], [-14, 0, 14], [14, 0, 14],
            [-22, 0, 0], [22, 0, 0], [0, 0, -18]
        ],
        coinSpawns: [
            [0, 1, 0], [-10, 1, -10], [10, 1, -10], [-14, 1, 14], [14, 1, 14],
            [-25, 1, -18], [25, 1, -18], [-25, 1, 18], [25, 1, 18],
            [0, 1, 22], [-18, 1, 0], [18, 1, 0], [0, 1, -24]
        ]
    },
    vacation: {
        id: 'vacation',
        name: 'VACATION',
        icon: '🌴',
        description: 'Rannakuurort kuldse liiva, palmide, bangalote, tiki-baari ja vaateplatvormiga.',
        spawnPoints: [
            [0, 0, 0], [-14, 0, -8], [14, 0, -8], [-12, 0, 14], [12, 0, 14],
            [-22, 0, 0], [22, 0, 0], [0, 0, -16]
        ],
        coinSpawns: [
            [0, 1, 0], [-12, 1, -12], [12, 1, -12], [-16, 1, 12], [16, 1, 12],
            [-24, 1, -18], [24, 1, -18], [-24, 1, 18], [24, 1, 18],
            [0, 1, 20], [-18, 1, 0], [18, 1, 0], [0, 1, -26]
        ]
    },
    yatchy: {
        id: 'yatchy',
        name: 'YATCHY',
        icon: '🛥️',
        description: 'Mitmetasandiline luksusjaht salongi, kajutite, kaptenisilla ja mullivanniga.',
        spawnPoints: [
            [0, 0, 8], [-8, 0, -12], [8, 0, -12], [-8, 0, 14], [8, 0, 14],
            [-14, 0, 0], [14, 0, 0], [0, 0, -22]
        ],
        coinSpawns: [
            [0, 1, 8], [-8, 1, -10], [8, 1, -10], [-8, 1, 12], [8, 1, 12],
            [-16, 1, -20], [16, 1, -20], [-16, 1, 20], [16, 1, 20],
            [0, 1, 22], [-12, 1, 0], [12, 1, 0], [0, 1, -28]
        ]
    }
};

export const CRATE_CATALOG: Record<CrateTier, CrateDef> = {
    common: {
        id: 'common',
        name: 'Common Crate',
        badge: '📦',
        price: 50,
        color: '#a4b0be',
        initialStock: 8,
        restockIntervalSec: 60,
        knifeSkinId: 'knife_common',
        gunSkinId: 'gun_common'
    },
    uncommon: {
        id: 'uncommon',
        name: 'Uncommon Crate',
        badge: '🟩',
        price: 100,
        color: '#2ed573',
        initialStock: 6,
        restockIntervalSec: 90,
        knifeSkinId: 'knife_uncommon',
        gunSkinId: 'gun_uncommon'
    },
    rare: {
        id: 'rare',
        name: 'Rare Crate',
        badge: '🔷',
        price: 200,
        color: '#1e90ff',
        initialStock: 4,
        restockIntervalSec: 120,
        knifeSkinId: 'knife_rare',
        gunSkinId: 'gun_rare'
    },
    epic: {
        id: 'epic',
        name: 'Epic Crate',
        badge: '🔮',
        price: 400,
        color: '#9b59b6',
        initialStock: 3,
        restockIntervalSec: 180,
        knifeSkinId: 'knife_epic',
        gunSkinId: 'gun_epic'
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary Crate',
        badge: '👑',
        price: 800,
        color: '#ffa502',
        initialStock: 2,
        restockIntervalSec: 240,
        knifeSkinId: 'knife_legendary',
        gunSkinId: 'gun_legendary'
    },
    cosmic: {
        id: 'cosmic',
        name: 'Cosmic Crate',
        badge: '🌌',
        price: 1500,
        color: '#ff4757',
        initialStock: 2,
        restockIntervalSec: 300,
        knifeSkinId: 'knife_cosmic',
        gunSkinId: 'gun_cosmic'
    },
    secret: {
        id: 'secret',
        name: 'Secret Crate',
        badge: '👁️',
        price: 3000,
        color: '#00d2d3',
        initialStock: 1,
        restockIntervalSec: 420,
        knifeSkinId: 'knife_secret',
        gunSkinId: 'gun_secret'
    },
    og: {
        id: 'og',
        name: 'OG Crate',
        badge: '🕹️',
        price: 5000,
        color: '#ffd32a',
        initialStock: 1,
        restockIntervalSec: 600,
        knifeSkinId: 'knife_og',
        gunSkinId: 'gun_og'
    },
    frostbite: {
        id: 'frostbite',
        name: 'Frostbite Crate',
        badge: '❄️',
        price: 600,
        color: '#70a1ff',
        initialStock: 3,
        restockIntervalSec: 150,
        knifeSkinId: 'knife_frostbite',
        gunSkinId: 'gun_frostbite'
    },
    inferno: {
        id: 'inferno',
        name: 'Inferno Crate',
        badge: '🔥',
        price: 1200,
        color: '#ff6348',
        initialStock: 2,
        restockIntervalSec: 220,
        knifeSkinId: 'knife_inferno',
        gunSkinId: 'gun_inferno'
    },
    cyberpunk: {
        id: 'cyberpunk',
        name: 'Cyberpunk Crate',
        badge: '⚡',
        price: 2200,
        color: '#ff007f',
        initialStock: 2,
        restockIntervalSec: 320,
        knifeSkinId: 'knife_cyberpunk',
        gunSkinId: 'gun_cyberpunk'
    },
    vampire: {
        id: 'vampire',
        name: 'Vampire Crate',
        badge: '🦇',
        price: 3800,
        color: '#c0392b',
        initialStock: 1,
        restockIntervalSec: 450,
        knifeSkinId: 'knife_vampire',
        gunSkinId: 'gun_vampire'
    },
    // --- KOMPLEKTI CRATED (SET CRATES) ---
    set_golden: {
        id: 'set_golden',
        name: 'Kuldne Kuninglik Komplekt',
        badge: '👑',
        price: 2500,
        color: '#ffd700',
        initialStock: 2,
        restockIntervalSec: 300,
        knifeSkinId: 'knife_set_golden',
        gunSkinId: 'gun_set_golden',
        isSetCrate: true,
        setKnifeSkinId: 'knife_set_golden',
        setGunSkinId: 'gun_set_golden'
    },
    set_hellfire: {
        id: 'set_hellfire',
        name: 'Põrgutule Deemonlik Komplekt',
        badge: '🌋',
        price: 3500,
        color: '#ff3838',
        initialStock: 1,
        restockIntervalSec: 400,
        knifeSkinId: 'knife_set_hellfire',
        gunSkinId: 'gun_set_hellfire',
        isSetCrate: true,
        setKnifeSkinId: 'knife_set_hellfire',
        setGunSkinId: 'gun_set_hellfire'
    },
    set_cyberghost: {
        id: 'set_cyberghost',
        name: 'Küber-Spiooni Komplekt',
        badge: '🕶️',
        price: 5500,
        color: '#00f2fe',
        initialStock: 1,
        restockIntervalSec: 500,
        knifeSkinId: 'knife_set_cyberghost',
        gunSkinId: 'gun_set_cyberghost',
        isSetCrate: true,
        setKnifeSkinId: 'knife_set_cyberghost',
        setGunSkinId: 'gun_set_cyberghost'
    },
    set_voidgalaxy: {
        id: 'set_voidgalaxy',
        name: 'Kosmilise Tühjuse Komplekt',
        badge: '🌌',
        price: 8000,
        color: '#9b59b6',
        initialStock: 1,
        restockIntervalSec: 650,
        knifeSkinId: 'knife_set_voidgalaxy',
        gunSkinId: 'gun_set_voidgalaxy',
        isSetCrate: true,
        setKnifeSkinId: 'knife_set_voidgalaxy',
        setGunSkinId: 'gun_set_voidgalaxy'
    }
};

export const WEAPON_SKIN_CATALOG: Record<string, WeaponSkinDef> = {
    knife_default: {
        id: 'knife_default',
        name: 'Standard Nuga',
        type: 'knife',
        tier: 'common',
        description: 'Vaikimisi taktikaline terasnuga.',
        color: 0x8395a7,
        bladeColor: 0xe8ecf2,
        handleColor: 0x181a1d
    },
    gun_default: {
        id: 'gun_default',
        name: 'Standard Peacemaker',
        type: 'gun',
        tier: 'common',
        description: 'Vaikimisi 6-lasuline revolver.',
        color: 0x574b40,
        bladeColor: 0x24282e,
        handleColor: 0x4a2c17
    },
    knife_common: {
        id: 'knife_common',
        name: 'Raudne Tera',
        type: 'knife',
        tier: 'common',
        description: 'Sepistatud raudtera tumeda käepidemega.',
        color: 0x8395a7,
        bladeColor: 0x8395a7,
        handleColor: 0x2f3542
    },
    gun_common: {
        id: 'gun_common',
        name: 'Roostes Revolver',
        type: 'gun',
        tier: 'common',
        description: 'Kogenud šerifi vana roostekarva relv.',
        color: 0x574b40,
        bladeColor: 0x574b40,
        handleColor: 0x3d3025
    },
    knife_uncommon: {
        id: 'knife_uncommon',
        name: 'Taktikaline Camo Nuga',
        type: 'knife',
        tier: 'uncommon',
        description: 'Militaarroheline kamuflaažtera.',
        color: 0x2ed573,
        bladeColor: 0x2ed573,
        handleColor: 0x1e3725
    },
    gun_uncommon: {
        id: 'gun_uncommon',
        name: 'Nikeldatud Python',
        type: 'gun',
        tier: 'uncommon',
        description: 'Hõbedase läikega täppisrevolver.',
        color: 0x2ed573,
        bladeColor: 0xdfe4ea,
        handleColor: 0x747d8c
    },
    knife_rare: {
        id: 'knife_rare',
        name: 'Karmiinpunane Ämblikunuga',
        type: 'knife',
        tier: 'rare',
        description: 'Kurviline Karambit ämblikuvõrgu mustriga.',
        color: 0x1e90ff,
        bladeColor: 0xd63031,
        handleColor: 0x1e272e,
        emissive: 0x440000
    },
    gun_rare: {
        id: 'gun_rare',
        name: 'Siniteras Peacemaker',
        type: 'gun',
        tier: 'rare',
        description: 'Karastatud sinisest terasest laseriga relv.',
        color: 0x1e90ff,
        bladeColor: 0x0984e3,
        handleColor: 0x2c3e50,
        emissive: 0x001133
    },
    knife_epic: {
        id: 'knife_epic',
        name: 'Küberneoon Tera',
        type: 'knife',
        tier: 'epic',
        description: 'Helendav lillakassinine neoontera.',
        color: 0x9b59b6,
        bladeColor: 0x00cec9,
        handleColor: 0x6c5ce7,
        emissive: 0x00f2fe
    },
    gun_epic: {
        id: 'gun_epic',
        name: 'Damaskuse Python',
        type: 'gun',
        tier: 'epic',
        description: 'Eksklusiivse mustriga Damaskuse teras.',
        color: 0x9b59b6,
        bladeColor: 0x8e44ad,
        handleColor: 0x2c2c54,
        emissive: 0x2b0938
    },
    knife_legendary: {
        id: 'knife_legendary',
        name: 'Draakoni Tulekatana',
        type: 'knife',
        tier: 'legendary',
        description: 'Leekiv katana draakoni vaimuga.',
        color: 0xffa502,
        bladeColor: 0xff4757,
        handleColor: 0xffa502,
        emissive: 0xff3838
    },
    gun_legendary: {
        id: 'gun_legendary',
        name: 'Kuldne Šerifi Revolver',
        type: 'gun',
        tier: 'legendary',
        description: 'Puhas kuld elevandiluust käepidemega.',
        color: 0xffa502,
        bladeColor: 0xffd700,
        handleColor: 0xffffff,
        emissive: 0x554400
    },
    knife_cosmic: {
        id: 'knife_cosmic',
        name: 'Galaktika Tühjuse Tera',
        type: 'knife',
        tier: 'cosmic',
        description: 'Kosmiline sirp tähistaeva osakestega.',
        color: 0xff4757,
        bladeColor: 0x371b58,
        handleColor: 0x4c3575,
        emissive: 0x9b59b6
    },
    gun_cosmic: {
        id: 'gun_cosmic',
        name: 'Kosmiline Pulsar',
        type: 'gun',
        tier: 'cosmic',
        description: 'Plasma kiirgav pulsarrelv.',
        color: 0xff4757,
        bladeColor: 0x1f0036,
        handleColor: 0xdfbbf7,
        emissive: 0x550055
    },
    knife_secret: {
        id: 'knife_secret',
        name: 'Spektraalne Vari',
        type: 'knife',
        tier: 'secret',
        description: 'Läbipaistev varjupistoda teistpoolsusest.',
        color: 0x00d2d3,
        bladeColor: 0x01a3a4,
        handleColor: 0x10ac84,
        emissive: 0x00f2fe
    },
    gun_secret: {
        id: 'gun_secret',
        name: 'Vaimu Fantoom',
        type: 'gun',
        tier: 'secret',
        description: 'Summutatud salajane fantoomrelv.',
        color: 0x00d2d3,
        bladeColor: 0x0abde3,
        handleColor: 0x222f3e,
        emissive: 0x005577
    },
    knife_og: {
        id: 'knife_og',
        name: '8-Bit Pixel Mõõk',
        type: 'knife',
        tier: 'og',
        description: 'Retro pikseldisainiga vanaaegne mõõk.',
        color: 0xffd32a,
        bladeColor: 0xfffa65,
        handleColor: 0xff9f1a,
        emissive: 0xffd32a
    },
    gun_og: {
        id: 'gun_og',
        name: 'Klassikaline Retro Blaster',
        type: 'gun',
        tier: 'og',
        description: 'Arcade automaatide ajastu blaster.',
        color: 0xffd32a,
        bladeColor: 0xff3838,
        handleColor: 0xff9f43,
        emissive: 0x664400
    },
    // --- UUED TAVAKASTIDE RELVAD ---
    knife_frostbite: {
        id: 'knife_frostbite',
        name: 'Jääkristalli Pistoda',
        type: 'knife',
        tier: 'frostbite',
        description: 'Külmutatud igijääst tera.',
        color: 0x70a1ff,
        bladeColor: 0xa4b0be,
        handleColor: 0x2f3542,
        emissive: 0x70a1ff
    },
    gun_frostbite: {
        id: 'gun_frostbite',
        name: 'Härmatise Revolver',
        type: 'gun',
        tier: 'frostbite',
        description: 'Jääkülmi kristalle tulistav relv.',
        color: 0x70a1ff,
        bladeColor: 0x487eb0,
        handleColor: 0xf5f6fa,
        emissive: 0x1e3799
    },
    knife_inferno: {
        id: 'knife_inferno',
        name: 'Laava Karambit',
        type: 'knife',
        tier: 'inferno',
        description: 'Kuum magma ja põlev obsidian.',
        color: 0xff6348,
        bladeColor: 0xff4757,
        handleColor: 0x2f3542,
        emissive: 0xff6348
    },
    gun_inferno: {
        id: 'gun_inferno',
        name: 'Magma Hand-Cannon',
        type: 'gun',
        tier: 'inferno',
        description: 'Purustava tulejõuga magmakahur.',
        color: 0xff6348,
        bladeColor: 0x2f3542,
        handleColor: 0xff4757,
        emissive: 0xb71540
    },
    knife_cyberpunk: {
        id: 'knife_cyberpunk',
        name: 'Neoontänavate Katana',
        type: 'knife',
        tier: 'cyberpunk',
        description: 'Tulevikulinna küberneetiline mõõk.',
        color: 0xff007f,
        bladeColor: 0xff007f,
        handleColor: 0x1e272e,
        emissive: 0x00f2fe
    },
    gun_cyberpunk: {
        id: 'gun_cyberpunk',
        name: 'Küber-Deagle',
        type: 'gun',
        tier: 'cyberpunk',
        description: 'Kõrgtehnoloogiline digitaalpüstol.',
        color: 0xff007f,
        bladeColor: 0x2d3436,
        handleColor: 0xff007f,
        emissive: 0x5f27cd
    },
    knife_vampire: {
        id: 'knife_vampire',
        name: 'Veresulase Sirp',
        type: 'knife',
        tier: 'vampire',
        description: 'Igavese öö verejanuline relv.',
        color: 0xc0392b,
        bladeColor: 0x8b0000,
        handleColor: 0x1e1e24,
        emissive: 0xe74c3c
    },
    gun_vampire: {
        id: 'gun_vampire',
        name: 'Krahvi Hõbekuul',
        type: 'gun',
        tier: 'vampire',
        description: 'Hõbedane relv vampiirihammaste kaunistusega.',
        color: 0xc0392b,
        bladeColor: 0xd2d7d9,
        handleColor: 0x4a0e17,
        emissive: 0x3b050d
    },
    // --- KOMPLEKTI CRATED (SET SKINS) ---
    knife_set_golden: {
        id: 'knife_set_golden',
        name: 'Kuninglik Kuldne Mõõk',
        type: 'knife',
        tier: 'set_golden',
        description: 'Täiskullast meisterdatud kuninglik terariist.',
        color: 0xffd700,
        bladeColor: 0xffd700,
        handleColor: 0x2c1810,
        emissive: 0xffea00
    },
    gun_set_golden: {
        id: 'gun_set_golden',
        name: 'Kuninglik Kuldne Deagle',
        type: 'gun',
        tier: 'set_golden',
        description: 'Kuldse Kuninga signatuurpüstol.',
        color: 0xffd700,
        bladeColor: 0xffd700,
        handleColor: 0x2c1810,
        emissive: 0x554400
    },
    knife_set_hellfire: {
        id: 'knife_set_hellfire',
        name: 'Põrguleegi Deemonitera',
        type: 'knife',
        tier: 'set_hellfire',
        description: 'Allmaailma sügavusest toodud leegitsev tera.',
        color: 0xff3838,
        bladeColor: 0xff3838,
        handleColor: 0x111111,
        emissive: 0xff5252
    },
    gun_set_hellfire: {
        id: 'gun_set_hellfire',
        name: 'Põrgutule Kahur',
        type: 'gun',
        tier: 'set_hellfire',
        description: 'Põrguleeki purskav hävitusrelv.',
        color: 0xff3838,
        bladeColor: 0x222222,
        handleColor: 0xff3838,
        emissive: 0x7f1d1d
    },
    knife_set_cyberghost: {
        id: 'knife_set_cyberghost',
        name: 'Varjude Nanotera',
        type: 'knife',
        tier: 'set_cyberghost',
        description: 'Nähtamatu nano-tera küberagendile.',
        color: 0x00f2fe,
        bladeColor: 0x00f2fe,
        handleColor: 0x0a192f,
        emissive: 0x00cec9
    },
    gun_set_cyberghost: {
        id: 'gun_set_cyberghost',
        name: 'Summutatud Küber-Vaim',
        type: 'gun',
        tier: 'set_cyberghost',
        description: 'Hääletu energialaenguga spioonirelv.',
        color: 0x00f2fe,
        bladeColor: 0x0a192f,
        handleColor: 0x00f2fe,
        emissive: 0x0652dd
    },
    knife_set_voidgalaxy: {
        id: 'knife_set_voidgalaxy',
        name: 'Tühjuse Musta Augu Tera',
        type: 'knife',
        tier: 'set_voidgalaxy',
        description: 'Gravitatsiooni neelav must auk pistoda kujul.',
        color: 0x9b59b6,
        bladeColor: 0x1e0c3b,
        handleColor: 0x341f97,
        emissive: 0x9b59b6
    },
    gun_set_voidgalaxy: {
        id: 'gun_set_voidgalaxy',
        name: 'Kosmiline Gravitatsiooni Kiirgur',
        type: 'gun',
        tier: 'set_voidgalaxy',
        description: 'Kosmilist tühjust laskev superrelv.',
        color: 0x9b59b6,
        bladeColor: 0x1e0c3b,
        handleColor: 0xdfbbf7,
        emissive: 0x5f27cd
    }
};

export { getCrateArtworkSvg, getWeaponArtworkSvg } from './ui/svgArtwork';
