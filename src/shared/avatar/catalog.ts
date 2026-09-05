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
    // --- SKINS (Color palettes) ---
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
        price: 50,
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
        price: 50,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#8d5524',
        description: 'Rich dark espresso skin tone.'
    },
    {
        id: 'skin_alien_neon',
        name: 'Alien Neon Blue',
        category: 'skin',
        rarity: 'Epic',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#00f2fe',
        description: 'Bioluminescent sci-fi extraterrestrial skin tone!'
    },

    // --- HAIR ---
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
        price: 250,
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
        price: 150,
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
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#ffd700',
        description: 'Blazing legendary golden anime spike power.'
    },

    // --- FACES ---
    {
        id: 'face_smile',
        name: 'Playard Smile',
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
        name: 'Viper Sunglasses',
        category: 'face',
        rarity: 'Rare',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Glossy dark aviator shades.'
    },
    {
        id: 'face_cyborg_visor',
        name: 'Cyborg Laser Visor',
        category: 'face',
        rarity: 'Epic',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Glowing holographic tactical visor.'
    },

    // --- TOPS / SHIRTS ---
    {
        id: 'top_hoodie_cyan',
        name: 'Playard Cyan Hoodie',
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
        price: 350,
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
        price: 750,
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
        price: 1500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ff4757',
        description: 'Reinforced titanium plated combat chestplate with glowing core.'
    },

    // --- PANTS ---
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
        price: 180,
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
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#2f3542',
        description: 'Armored leg plating with servo joints.'
    },

    // --- SHOES ---
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
        price: 150,
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
        price: 1600,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#00f2fe',
        description: 'Floating boots with neon blue thruster particles!'
    },

    // --- HATS ---
    {
        id: 'hat_cap_snapback',
        name: 'Playard Snapback Cap',
        category: 'hats',
        rarity: 'Uncommon',
        price: 120,
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
        price: 450,
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
        price: 2000,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#ffd700',
        description: 'Prestigious monarch crown with rubies and sapphires.'
    },

    // --- BACK ACCESSORIES ---
    {
        id: 'back_ninja_katana',
        name: 'Dual Ninja Katanas',
        category: 'back',
        rarity: 'Epic',
        price: 900,
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
        price: 5000,
        currency: 'Yard',
        attachmentSocket: 'back',
        defaultColor: '#ff4757',
        description: 'Majestic glowing energy wings forged from plasma.'
    },

    // --- EMOTES ---
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
        price: 300,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Celebratory 360 spin and groove.'
    }
];

export function getItemById(id: string): AvatarItem | undefined {
    return AVATAR_CATALOG.find(i => i.id === id);
}

export function getItemsByCategory(cat: string): AvatarItem[] {
    return AVATAR_CATALOG.filter(i => i.category === cat);
}
