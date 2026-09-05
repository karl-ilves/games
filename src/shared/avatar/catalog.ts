import { AvatarItem, AvatarConfig } from './types';

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
    bodyId: 'body_standard',
    skinColor: '#f5d0b5',
    faceId: 'face_smile',
    hairId: 'hair_classic',
    hairColor: '#221812',
    topId: 'top_hoodie_cyan',
    pantsId: 'pants_jeans_dark',
    shoesId: 'shoes_sneakers_white',
    hatId: null,
    accessoryId: null,
    backId: null,
    activeEmote: 'idle'
};

export const AVATAR_CATALOG: AvatarItem[] = [
    // ==========================================
    // --- 1. SKINS (Color palettes & effects) ---
    // ==========================================
    {
        id: 'skin_light',
        name: 'Light Tone',
        category: 'skin',
        rarity: 'Common',
        price: 0,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#f5d0b5',
        description: 'Standard natural light skin tone.',
        isDefault: true
    },
    {
        id: 'skin_warm',
        name: 'Warm Sun Tone',
        category: 'skin',
        rarity: 'Common',
        price: 100, // 2x from 50
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#dfb190',
        description: 'Warm sun-kissed skin tone.'
    },
    {
        id: 'skin_deep',
        name: 'Deep Espresso Tone',
        category: 'skin',
        rarity: 'Common',
        price: 100, // 2x from 50
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#8d5524',
        description: 'Rich dark espresso skin tone.'
    },
    {
        id: 'skin_golden_tan',
        name: 'Golden Bronze',
        category: 'skin',
        rarity: 'Uncommon',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#d49a6a',
        description: 'Luminous bronze sun complexion.'
    },
    {
        id: 'skin_porcelain_white',
        name: 'Porcelain Fair',
        category: 'skin',
        rarity: 'Uncommon',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#ffebd2',
        description: 'Delicate porcelain alabaster skin tone.'
    },
    {
        id: 'skin_alien_neon',
        name: 'Alien Neon Blue',
        category: 'skin',
        rarity: 'Epic',
        price: 1000, // 2x from 500
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#00f2fe',
        description: 'Bioluminescent sci-fi extraterrestrial skin tone!'
    },
    {
        id: 'skin_shadow_phantom',
        name: 'Void Shadow Black',
        category: 'skin',
        rarity: 'Epic',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#12131a',
        description: 'Pure obsidian darkness from the underworld.'
    },
    {
        id: 'skin_golden_monarch',
        name: '24K Liquid Gold Skin',
        category: 'skin',
        rarity: 'Legendary',
        price: 3000,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#ffd700',
        description: 'Pure liquid 24K gold skin that shines under any light.'
    },
    {
        id: 'skin_magma_lava',
        name: 'Inferno Magma Red',
        category: 'skin',
        rarity: 'Legendary',
        price: 3200,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#ff3838',
        description: 'Volcanic magma skin pulsating with subterranean heat.'
    },
    {
        id: 'skin_emerald_matrix',
        name: 'Emerald Cyber Skin',
        category: 'skin',
        rarity: 'Epic',
        price: 1400,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#00d2d3',
        description: 'Cybernetic emerald skin infused with digital energy.'
    },
    {
        id: 'skin_amethyst_violet',
        name: 'Cosmic Amethyst',
        category: 'skin',
        rarity: 'Mythic',
        price: 8000,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#8854d0',
        description: 'Nebula-drenched stellar skin reflecting cosmic starlight.'
    },

    // ==========================================
    // --- 2. HAIR (Styles & cuts) ---
    // ==========================================
    {
        id: 'hair_classic',
        name: 'Classic Sweep',
        category: 'hair',
        rarity: 'Common',
        price: 0,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#221812',
        description: 'Modern, well-groomed classic swept hairstyle.',
        isDefault: true
    },
    {
        id: 'hair_spiky_punk',
        name: 'Cyber Punk Spikes',
        category: 'hair',
        rarity: 'Rare',
        price: 500, // 2x from 250
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#0be881',
        description: 'Sharp rebellious punk spikes.'
    },
    {
        id: 'hair_curly_afro',
        name: 'Stylized Curls',
        category: 'hair',
        rarity: 'Uncommon',
        price: 300, // 2x from 150
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#1a1a1a',
        description: 'Full-volume textured curls.'
    },
    {
        id: 'hair_golden_super',
        name: 'Golden Anime Saiyan',
        category: 'hair',
        rarity: 'Legendary',
        price: 2400, // 2x from 1200
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#ffd700',
        description: 'Blazing legendary golden anime spike power.'
    },
    {
        id: 'hair_mohawk_flame',
        name: 'Flaming Mohawk',
        category: 'hair',
        rarity: 'Epic',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#ff4757',
        description: 'Towering aerodynamic crimson punk mohawk.'
    },
    {
        id: 'hair_long_samurai',
        name: 'Samurai Topknot & Ponytail',
        category: 'hair',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#1e272e',
        description: 'Disciplined warrior topknot with tied back strands.'
    },
    {
        id: 'hair_dreadlocks_tech',
        name: 'Neon Cyber Dreads',
        category: 'hair',
        rarity: 'Epic',
        price: 1600,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#00f2fe',
        description: 'Braided tactical dreadlocks with luminous cyan accents.'
    },
    {
        id: 'hair_buzz_cut',
        name: 'Military Buzz Cut',
        category: 'hair',
        rarity: 'Common',
        price: 150,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#3d2b1f',
        description: 'Tight, battle-ready military cropped hair.'
    },
    {
        id: 'hair_wavy_bob',
        name: 'Wavy Modern Bob',
        category: 'hair',
        rarity: 'Uncommon',
        price: 350,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#833471',
        description: 'Flowing wavy locks with stylish side part.'
    },
    {
        id: 'hair_ice_frost',
        name: 'Glacier Spikes',
        category: 'hair',
        rarity: 'Legendary',
        price: 2600,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#a55eea',
        description: 'Sub-zero frozen spikes made of pure glacial ice.'
    },
    {
        id: 'hair_slick_gentleman',
        name: 'Slicked Executive Part',
        category: 'hair',
        rarity: 'Rare',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#2c3e50',
        description: 'High-class glossy parted pompadour.'
    },

    // ==========================================
    // --- 3. FACES & EXPRESSIONS ---
    // ==========================================
    {
        id: 'face_smile',
        name: 'Playard Confident Smile',
        category: 'face',
        rarity: 'Common',
        price: 0,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Friendly confident Playard smile.',
        isDefault: true
    },
    {
        id: 'face_cool_shades',
        name: 'Viper Aviator Sunglasses',
        category: 'face',
        rarity: 'Rare',
        price: 400, // 2x from 200
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Ultra-realistic gold aviator shades with glossy polarized teardrop lenses.'
    },
    {
        id: 'face_sunglasses_luxury',
        name: 'Monaco Luxury Black Shades',
        category: 'face',
        rarity: 'Epic',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Ultra-realistic designer acetate sunglasses with reflective smoke lenses.'
    },
    {
        id: 'face_retro_round',
        name: 'Vintage Gold Round Spectacles',
        category: 'face',
        rarity: 'Rare',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Ultra-realistic circular 24K gold wireframe glasses with anti-reflective crystal glass.'
    },
    {
        id: 'face_cyber_matrix_shades',
        name: 'Matrix Cyber Edge Shades',
        category: 'face',
        rarity: 'Legendary',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Ultra-realistic rimless obsidian micro-shades with high-gloss mirror reflections.'
    },
    {
        id: 'face_cyborg_visor',
        name: 'Cyborg Laser Visor',
        category: 'face',
        rarity: 'Epic',
        price: 1200, // 2x from 600
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Glowing holographic tactical visor.'
    },
    {
        id: 'face_ninja_mask',
        name: 'Shadow Ninja Half-Mask',
        category: 'face',
        rarity: 'Rare',
        price: 700,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Tactical black cloth mask concealing the lower face.'
    },
    {
        id: 'face_gold_monocle',
        name: '24K Golden Monocle',
        category: 'face',
        rarity: 'Epic',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Aristocratic golden eyepiece on a delicate chain.'
    },
    {
        id: 'face_anime_sparkle',
        name: 'Anime Starlight Eyes',
        category: 'face',
        rarity: 'Rare',
        price: 650,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Expressive large anime eyes with sparkling highlights.'
    },
    {
        id: 'face_demon_horns_face',
        name: 'Crimson Oni War Paint',
        category: 'face',
        rarity: 'Epic',
        price: 1300,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Intimidating warrior red markings and fanged smirk.'
    },
    {
        id: 'face_steampunk_goggles',
        name: 'Brass Steampunk Goggles',
        category: 'face',
        rarity: 'Rare',
        price: 850,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Twin brass lenses with adjustable leather strap.'
    },
    {
        id: 'face_vr_headset',
        name: 'Metaverse Cyber HMD',
        category: 'face',
        rarity: 'Legendary',
        price: 2500,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Futuristic curved VR visor with pulsing LED status bar.'
    },
    {
        id: 'face_battle_scar',
        name: 'Veteran Battle Scars',
        category: 'face',
        rarity: 'Uncommon',
        price: 450,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Fierce warrior slash across the brow and cheek.'
    },
    {
        id: 'face_smirk_wink',
        name: 'Playful Winking Smirk',
        category: 'face',
        rarity: 'Uncommon',
        price: 350,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Cheeky winking expression ready for games.'
    },

    // ==========================================
    // --- 4. TOPS / SHIRTS / ARMOR ---
    // ==========================================
    {
        id: 'top_hoodie_cyan',
        name: 'Playard Cyan Tech Hoodie',
        category: 'tops',
        rarity: 'Common',
        price: 0,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#00f2fe',
        description: 'Signature Playard comfy techwear hoodie.',
        isDefault: true
    },
    {
        id: 'top_leather_jacket',
        name: 'Biker Leather Jacket',
        category: 'tops',
        rarity: 'Rare',
        price: 700, // 2x from 350
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#181b20',
        description: 'Heavy rugged biker leather jacket.'
    },
    {
        id: 'top_tuxedo_gold',
        name: 'Royal Tuxedo & Gold Tie',
        category: 'tops',
        rarity: 'Epic',
        price: 1500, // 2x from 750
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#0d131a',
        description: 'Tailored luxury tuxedo with golden tie & lapels.'
    },
    {
        id: 'top_cyber_armor',
        name: 'Mecha Cyber Exosuit',
        category: 'tops',
        rarity: 'Legendary',
        price: 3000, // 2x from 1500
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ff4757',
        description: 'Reinforced titanium plated combat chestplate with glowing core.'
    },
    {
        id: 'top_swat_vest',
        name: 'Tactical SWAT Kevlar Vest',
        category: 'tops',
        rarity: 'Rare',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#2f3542',
        description: 'Heavy bulletproof tactical vest with ammo pouches.'
    },
    {
        id: 'top_knight_plate',
        name: 'Crusader Steel Breastplate',
        category: 'tops',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#dfe4ea',
        description: 'Mirror-polished steel armor with etched royal insignia.'
    },
    {
        id: 'top_street_camo',
        name: 'Urban Camo Pullover',
        category: 'tops',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#57606f',
        description: 'Stealthy greyscale street camo sports pullover.'
    },
    {
        id: 'top_golden_dragon_robe',
        name: 'Emperor Silk Dragon Robe',
        category: 'tops',
        rarity: 'Mythic',
        price: 9000,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ffa801',
        description: 'Ancient imperial gold-stitched silk with dragon embroidery.'
    },
    {
        id: 'top_neon_runner',
        name: 'Synthwave Track Jacket',
        category: 'tops',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ff3f34',
        description: '80s retro running windbreaker with neon magenta stripes.'
    },
    {
        id: 'top_flannel_casual',
        name: 'Lumberjack Red Flannel',
        category: 'tops',
        rarity: 'Common',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#eb2f06',
        description: 'Warm, cozy checkered lumberjack outdoor shirt.'
    },
    {
        id: 'top_ninja_gi',
        name: 'Shinobi Shadow Gi',
        category: 'tops',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#1e272e',
        description: 'Fitted martial arts combat tunic for stealth assassinations.'
    },

    // ==========================================
    // --- 5. PANTS / GREAVES / BOTTOMS ---
    // ==========================================
    {
        id: 'pants_jeans_dark',
        name: 'Slim Dark Jeans',
        category: 'pants',
        rarity: 'Common',
        price: 0,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#1e272e',
        description: 'Classic durable dark denim jeans.',
        isDefault: true
    },
    {
        id: 'pants_cargo_tactical',
        name: 'Tactical Cargo Pants',
        category: 'pants',
        rarity: 'Uncommon',
        price: 360, // 2x from 180
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#485460',
        description: 'Military style combat cargos with utility straps.'
    },
    {
        id: 'pants_mecha_plates',
        name: 'Exosuit Greaves',
        category: 'pants',
        rarity: 'Epic',
        price: 1600, // 2x from 800
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#2f3542',
        description: 'Armored leg plating with servo joints.'
    },
    {
        id: 'pants_track_neon',
        name: 'Cyber Trackpants',
        category: 'pants',
        rarity: 'Rare',
        price: 650,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#0be881',
        description: 'Loose streetwear joggers with glowing neon side piping.'
    },
    {
        id: 'pants_camo_woodland',
        name: 'Woodland Camo Trousers',
        category: 'pants',
        rarity: 'Uncommon',
        price: 450,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#303952',
        description: 'Reinforced field trousers for forest stealth maneuvers.'
    },
    {
        id: 'pants_tuxedo_slacks',
        name: 'Tailored Tuxedo Slacks',
        category: 'pants',
        rarity: 'Epic',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#1e272e',
        description: 'Crisp pressed formal evening slacks with satin stripe.'
    },
    {
        id: 'pants_knight_greaves',
        name: 'Crusader Steel Greaves',
        category: 'pants',
        rarity: 'Epic',
        price: 1700,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#ced6e0',
        description: 'Heavy plate armor guarding the calves and thighs.'
    },
    {
        id: 'pants_golden_emperor',
        name: 'Golden Dragon Leggings',
        category: 'pants',
        rarity: 'Legendary',
        price: 3400,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#ffa801',
        description: 'Golden silk breeches woven with impenetrable enchanted thread.'
    },
    {
        id: 'pants_shinobi_wraps',
        name: 'Ninja Leg Wraps',
        category: 'pants',
        rarity: 'Rare',
        price: 750,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#171b21',
        description: 'Tight black combat pants with ankle bindings.'
    },
    {
        id: 'pants_shorts_athletic',
        name: 'Pro Runner Shorts',
        category: 'pants',
        rarity: 'Common',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#3c40c6',
        description: 'Breathable lightweight athletic training shorts.'
    },

    // ==========================================
    // --- 6. SHOES / BOOTS ---
    // ==========================================
    {
        id: 'shoes_sneakers_white',
        name: 'Clean White Kicks',
        category: 'shoes',
        rarity: 'Common',
        price: 0,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#f1f2f6',
        description: 'Crisp urban white sneakers with shock-absorbing soles.',
        isDefault: true
    },
    {
        id: 'shoes_combat_boots',
        name: 'Heavy Combat Boots',
        category: 'shoes',
        rarity: 'Uncommon',
        price: 300, // 2x from 150
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#1e272e',
        description: 'Steel-toed treaded combat boots.'
    },
    {
        id: 'shoes_hover_jets',
        name: 'Antigravity Hover Boots',
        category: 'shoes',
        rarity: 'Legendary',
        price: 3200, // 2x from 1600
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#00f2fe',
        description: 'Floating boots with neon blue thruster particles!'
    },
    {
        id: 'shoes_gold_sneakers',
        name: '24K Golden High-Tops',
        category: 'shoes',
        rarity: 'Legendary',
        price: 2800,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#ffd700',
        description: 'Pure gold plated designer high-top kicks.'
    },
    {
        id: 'shoes_magma_treads',
        name: 'Inferno Lava Boots',
        category: 'shoes',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#ff3838',
        description: 'Molten volcanic boots leaving glowing ember footprints.'
    },
    {
        id: 'shoes_oxford_luxury',
        name: 'Italian Leather Oxfords',
        category: 'shoes',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#3d2b1f',
        description: 'Handcrafted mirror-polished dark brown leather dress shoes.'
    },
    {
        id: 'shoes_ninja_tabi',
        name: 'Silent Shinobi Tabi',
        category: 'shoes',
        rarity: 'Rare',
        price: 700,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#111215',
        description: 'Split-toe stealth boots for zero-noise footsteps.'
    },
    {
        id: 'shoes_cyber_runners',
        name: 'Neon Velocity Runners',
        category: 'shoes',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#05c46b',
        description: 'Lightweight spring-loaded cybernetic parkour shoes.'
    },
    {
        id: 'shoes_cyber_frost',
        name: 'Cryo Frost Striders',
        category: 'shoes',
        rarity: 'Epic',
        price: 1900,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#575fcf',
        description: 'Deep freeze boots chilled with liquid nitrogen.'
    },
    {
        id: 'shoes_tactical_sandals',
        name: 'Samurai War Sandals',
        category: 'shoes',
        rarity: 'Common',
        price: 250,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#778ca3',
        description: 'Traditional woven straw war sandals with leather cords.'
    },

    // ==========================================
    // --- 7. HATS / HELMETS / HEADWEAR ---
    // ==========================================
    {
        id: 'hat_cap_snapback',
        name: 'Playard Snapback Cap',
        category: 'hats',
        rarity: 'Uncommon',
        price: 240, // 2x from 120
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#2ed573',
        description: 'Sporty baseball cap with curved brim.'
    },
    {
        id: 'hat_viking_helm',
        name: 'Viking Horned Helmet',
        category: 'hats',
        rarity: 'Rare',
        price: 900, // 2x from 450
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#747d8c',
        description: 'Forged iron helmet with curved horns.'
    },
    {
        id: 'hat_royal_crown',
        name: '👑 24K Royal Crown',
        category: 'hats',
        rarity: 'Legendary',
        price: 4000, // 2x from 2000
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#ffd700',
        description: 'Prestigious monarch crown with rubies and sapphires.'
    },
    {
        id: 'hat_cowboy_leather',
        name: 'Outlaw Cowboy Stetson',
        category: 'hats',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#533c2a',
        description: 'Classic wide-brimmed weathered leather cowboy hat.'
    },
    {
        id: 'hat_top_hat_gentleman',
        name: 'Victorian Silk Top Hat',
        category: 'hats',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#1e272e',
        description: 'Tall, majestic black silk top hat with red band.'
    },
    {
        id: 'hat_tactical_beret',
        name: 'Special Forces Red Beret',
        category: 'hats',
        rarity: 'Uncommon',
        price: 480,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#eb2f06',
        description: 'Elite commando beret with silver badge.'
    },
    {
        id: 'hat_ninja_cowl',
        name: 'Shadow Assassin Hood',
        category: 'hats',
        rarity: 'Rare',
        price: 850,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#171b21',
        description: 'Deep draped hood casting dramatic shadows over eyes.'
    },
    {
        id: 'hat_cyber_pilot_helm',
        name: 'Valkyrie Jet Pilot Helmet',
        category: 'hats',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#00f2fe',
        description: 'Aviation helmet with oxygen mask and HUD targeting visor.'
    },
    {
        id: 'hat_samurai_kabuto',
        name: 'Dragon Samurai Kabuto',
        category: 'hats',
        rarity: 'Legendary',
        price: 3600,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#c0392b',
        description: 'Lacquered iron war helmet with ornate golden crest.'
    },
    {
        id: 'hat_beanie_cozy',
        name: 'Slouchy Knit Beanie',
        category: 'hats',
        rarity: 'Common',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#ffa801',
        description: 'Warm and casual winter knit beanie.'
    },
    {
        id: 'hat_pirate_tricorne',
        name: 'Captain Jolly Tricorne',
        category: 'hats',
        rarity: 'Epic',
        price: 1900,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#1e272e',
        description: 'Gold-trimmed tricorn hat featuring crossed bones.'
    },
    {
        id: 'hat_halo_angel',
        name: 'Celestial Glowing Halo',
        category: 'hats',
        rarity: 'Mythic',
        price: 10000,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#ffd700',
        description: 'Pure radiant ring of divine light hovering overhead.'
    },

    // ==========================================
    // --- 8. ACCESSORIES (Shoulders, Belts) ---
    // ==========================================
    {
        id: 'acc_gold_chain',
        name: 'Diamond Cuban Link Chain',
        category: 'accessories',
        rarity: 'Epic',
        price: 2000,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ffd700',
        description: 'Heavy 18K gold curb chain with iced-out pendant.'
    },
    {
        id: 'acc_police_badge',
        name: 'Sheriff Gold Star Badge',
        category: 'accessories',
        rarity: 'Uncommon',
        price: 450,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#f1c40f',
        description: 'Authoritative polished law enforcement badge.'
    },
    {
        id: 'acc_bandolier_ammo',
        name: 'Crossed Bullet Bandolier',
        category: 'accessories',
        rarity: 'Rare',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#cd6133',
        description: 'Heavy duty leather sash packed with heavy caliber rounds.'
    },
    {
        id: 'acc_shoulder_parrots',
        name: 'Pirate Captain Scarlet Macaw',
        category: 'accessories',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#e74c3c',
        description: 'Loyal tropical companion perched alertly on shoulder.'
    },
    {
        id: 'acc_scarf_crimson',
        name: 'Breeze Flowing Crimson Scarf',
        category: 'accessories',
        rarity: 'Rare',
        price: 850,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#b71540',
        description: 'Long silk neck scarf fluttering in the wind.'
    },
    {
        id: 'acc_utility_belt',
        name: 'Tactical Agent Utility Belt',
        category: 'accessories',
        rarity: 'Uncommon',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#2c3e50',
        description: 'Modular belt with medkit, grappling hook, and radio.'
    },
    {
        id: 'acc_shoulder_plasma_cannon',
        name: 'Predator Shoulder Plasma Cannon',
        category: 'accessories',
        rarity: 'Legendary',
        price: 3500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#00f2fe',
        description: 'Auto-targeting robotic micro plasma cannon mounted on shoulder.'
    },
    {
        id: 'acc_pet_dragon_shoulder',
        name: 'Baby Fire Drake Companion',
        category: 'accessories',
        rarity: 'Mythic',
        price: 9500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#e55039',
        description: 'Cute miniature dragon that breathes friendly smoke rings.'
    },
    {
        id: 'acc_holster_twin_pistols',
        name: 'Dual Hip Leather Holsters',
        category: 'accessories',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#4b382a',
        description: 'Twin quick-draw western pistol holsters.'
    },
    {
        id: 'acc_neon_armband',
        name: 'Cyberpunk LED Armband',
        category: 'accessories',
        rarity: 'Common',
        price: 250,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#3ae374',
        description: 'Pulsing LED display band tracking player vital signs.'
    },

    // ==========================================
    // --- 9. BACK ACCESSORIES (Wings, Swords) ---
    // ==========================================
    {
        id: 'back_ninja_katana',
        name: 'Dual Ninja Katanas',
        category: 'back',
        rarity: 'Epic',
        price: 1800, // 2x from 900
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#2f3542',
        description: 'Crossed blades strapped to the back.'
    },
    {
        id: 'back_cyber_wings',
        name: 'Plasma Angel Wings',
        category: 'back',
        rarity: 'Mythic',
        price: 10000, // 2x from 5000
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#ff4757',
        description: 'Majestic glowing energy wings forged from plasma.'
    },
    {
        id: 'back_cyber_jetpack',
        name: 'Twin Ion Rocket Jetpack',
        category: 'back',
        rarity: 'Legendary',
        price: 3600,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#00f2fe',
        description: 'High-thrust dual thruster pack with neon cyan exhaust.'
    },
    {
        id: 'back_demon_wings',
        name: 'Obsidian Nether Bat Wings',
        category: 'back',
        rarity: 'Mythic',
        price: 9500,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#2c2c54',
        description: 'Massive jagged draconic wings radiating dark aura.'
    },
    {
        id: 'back_golden_shield',
        name: 'Aegis Royal Tower Shield',
        category: 'back',
        rarity: 'Legendary',
        price: 3200,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#ffd700',
        description: 'Heavy gold-crested knight shield strapped to the spine.'
    },
    {
        id: 'back_quiver_arrows',
        name: 'Elven Quiver & Hunting Bow',
        category: 'back',
        rarity: 'Rare',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#218c74',
        description: 'Carved longbow and feather-fletched arrows.'
    },
    {
        id: 'back_guitar_electric',
        name: 'Rockstar Flame Electric Guitar',
        category: 'back',
        rarity: 'Epic',
        price: 2100,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#ff5252',
        description: 'Custom red electric axe ready to shred heavy riffs.'
    },
    {
        id: 'back_cyber_blade_greatsword',
        name: 'Colossal Cyber Buster Sword',
        category: 'back',
        rarity: 'Legendary',
        price: 3800,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#33d9b2',
        description: 'Gigantic heavy broadsword engraved with neon runic circuits.'
    },
    {
        id: 'back_backpack_military',
        name: 'Field Commando Rucksack',
        category: 'back',
        rarity: 'Uncommon',
        price: 550,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#40407a',
        description: 'Heavy tactical backpack loaded with survival gear and canteen.'
    },
    {
        id: 'back_golden_wings',
        name: '24K Seraphim Golden Wings',
        category: 'back',
        rarity: 'Mythic',
        price: 12000,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#ffd700',
        description: 'Six grand angelic wings made of solid enchanted gold.'
    },
    {
        id: 'back_frost_wings',
        name: 'Cryo Ice Shard Wings',
        category: 'back',
        rarity: 'Legendary',
        price: 4200,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#706fd3',
        description: 'Razor-sharp floating wings formed from sub-zero ice crystals.'
    },

    // ==========================================
    // --- 10. EMOTES & ANIMATIONS ---
    // ==========================================
    {
        id: 'emote_wave',
        name: 'Friendly Wave',
        category: 'emotes',
        rarity: 'Common',
        price: 0,
        currency: 'Yard',
        attachmentSocket: 'hand_r',
        description: 'Wave warmly to other players.',
        isDefault: true
    },
    {
        id: 'emote_dance_spin',
        name: 'Victory Spin Dance',
        category: 'emotes',
        rarity: 'Rare',
        price: 600, // 2x from 300
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Celebratory 360 spin and groove.'
    },
    {
        id: 'emote_salute_military',
        name: 'Honorary Military Salute',
        category: 'emotes',
        rarity: 'Uncommon',
        price: 400,
        currency: 'Yard',
        attachmentSocket: 'hand_r',
        description: 'Stand at crisp attention and salute commanders.'
    },
    {
        id: 'emote_backflip',
        name: 'Acrobatic Ninja Backflip',
        category: 'emotes',
        rarity: 'Epic',
        price: 1400,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Flawless acrobatic 360-degree aerial backflip.'
    },
    {
        id: 'emote_breakdance',
        name: 'Windmill Breakdance',
        category: 'emotes',
        rarity: 'Legendary',
        price: 2600,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Drop to the floor and spin like a pro B-boy.'
    },
    {
        id: 'emote_laugh_triumph',
        name: 'Triumphant Laugh',
        category: 'emotes',
        rarity: 'Uncommon',
        price: 350,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Boisterous hearty laughter celebrating win.'
    },
    {
        id: 'emote_flex_muscles',
        name: 'Bodybuilder Muscle Flex',
        category: 'emotes',
        rarity: 'Rare',
        price: 700,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Show off strength with double-bicep hero flex.'
    },
    {
        id: 'emote_levitate_zen',
        name: 'Mystic Zen Levitation',
        category: 'emotes',
        rarity: 'Mythic',
        price: 7500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Sit in lotus posture and hover magically off the ground.'
    },
    {
        id: 'emote_zombie_groan',
        name: 'Spooky Zombie Walk',
        category: 'emotes',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Lurch forward with outstretched undead arms.'
    },
    {
        id: 'emote_guitar_solo',
        name: 'Air Guitar Shred Solo',
        category: 'emotes',
        rarity: 'Epic',
        price: 1600,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Jump on knees and shred an imaginary heavy metal solo.'
    }
];

export function getItemById(id: string): AvatarItem | undefined {
    return AVATAR_CATALOG.find(i => i.id === id);
}

export function getItemsByCategory(cat: string): AvatarItem[] {
    return AVATAR_CATALOG.filter(i => i.category === cat);
}
