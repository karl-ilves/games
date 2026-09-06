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
    activeEmote: 'idle',
    movementStyle: 'anim_style_default'
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
{
        id: 'skin_emerald_glow',
        name: 'Bioluminescent Emerald',
        category: 'skin',
        rarity: 'Uncommon',
        price: 350,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#05c46b',
        description: 'Vivid emerald luminescence radiating an otherworldly inner glow.'
    },
    {
        id: 'skin_frozen_ice',
        name: 'Glacial Cryo Frost',
        category: 'skin',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#a5d8ff',
        description: 'Sub-zero frozen ice skin with glacial crystal sheen.'
    },
    {
        id: 'skin_inferno_ember',
        name: 'Infernal Ember Ash',
        category: 'skin',
        rarity: 'Epic',
        price: 1600,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#e74c3c',
        description: 'Charred obsidian skin pulsing with crimson embers.'
    },
    {
        id: 'skin_cosmic_nebula',
        name: 'Deep Cosmic Nebula',
        category: 'skin',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#6c5ce7',
        description: 'Starlight interstellar dust shimmering in twilight purple.'
    },
    {
        id: 'skin_chrome_metallic',
        name: 'Liquid Chrome Titanium',
        category: 'skin',
        rarity: 'Legendary',
        price: 3400,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#d2dae2',
        description: 'Mirror polished liquid chrome that reflects every horizon.'
    },
    {
        id: 'skin_toxic_hazard',
        name: 'Radioactive Neon Lime',
        category: 'skin',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#a3cb38',
        description: 'High-voltage radioactive biohazard lime complexion.'
    },
    {
        id: 'skin_obsidian_matrix',
        name: 'Obsidian Carbon Shadow',
        category: 'skin',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#1e272e',
        description: 'Matte carbon nanofiber skin forged in shadowy laboratories.'
    },
    {
        id: 'skin_sunburst_orange',
        name: 'Solar Flare Sunburst',
        category: 'skin',
        rarity: 'Uncommon',
        price: 450,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#ff9f43',
        description: 'Solar corona orange charged with solar flare energy.'
    },
    {
        id: 'skin_vampire_pale',
        name: 'Gothic Alabaster Vampire',
        category: 'skin',
        rarity: 'Uncommon',
        price: 400,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#f8efba',
        description: 'Eerie porcelain gothic complexion untouched by sunlight.'
    },
    {
        id: 'skin_rose_quartz',
        name: 'Pastel Rose Quartz',
        category: 'skin',
        rarity: 'Common',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#fd79a8',
        description: 'Soft pastel pink skin reminiscent of polished rose quartz.'
    },
    {
        id: 'skin_sapphire_frost',
        name: 'Deep Ocean Sapphire',
        category: 'skin',
        rarity: 'Rare',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#1e3799',
        description: 'Abyssal deep ocean blue with midnight sapphire highlights.'
    },
    {
        id: 'skin_celestial_starlight',
        name: 'Celestial Starlight Pearl',
        category: 'skin',
        rarity: 'Legendary',
        price: 3600,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#f1f2f6',
        description: 'Iridescent celestial white that glistens with supernova stardust.'
    },
    {
        id: 'skin_demon_crimson',
        name: 'Underworld Demon Crimson',
        category: 'skin',
        rarity: 'Epic',
        price: 2000,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#c0392b',
        description: 'Intense blood-red skin belonging to ancient underworld warlords.'
    },
    {
        id: 'skin_golden_pharaoh',
        name: 'Pharaoh Sun Bronze',
        category: 'skin',
        rarity: 'Rare',
        price: 1250,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#e58e26',
        description: 'Radiant desert bronze kissed by Egyptian sun gods.'
    },
    {
        id: 'skin_mint_pastel',
        name: 'Pastel Mint Chill',
        category: 'skin',
        rarity: 'Common',
        price: 150,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#55efc4',
        description: 'Cool and refreshing pastel spearmint skin.'
    },
    {
        id: 'skin_cyber_synthwave',
        name: 'Synthwave Sunset Magenta',
        category: 'skin',
        rarity: 'Legendary',
        price: 3800,
        currency: 'Yard',
        attachmentSocket: 'head',
        defaultColor: '#e056fd',
        description: 'Vibrant 80s neon magenta radiating retro synthwave waves.'
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
{
        id: 'hair_fire_mohawk',
        name: 'Inferno Mohawk',
        category: 'hair',
        rarity: 'Rare',
        price: 750,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#ff4757',
        description: 'Blazing tall mohawk spiked with fiery red intensity.'
    },
    {
        id: 'hair_anime_spiky_blue',
        name: 'Spiky Neo Blue',
        category: 'hair',
        rarity: 'Epic',
        price: 1400,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#00d2d3',
        description: 'High-octane anime protagonist spikes with electric tips.'
    },
    {
        id: 'hair_silver_dreadlocks',
        name: 'Cyber Silver Dreads',
        category: 'hair',
        rarity: 'Rare',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#dfe4ea',
        description: 'Futuristic braided silver dreadlocks with metallic sheen.'
    },
    {
        id: 'hair_curly_afro_fade',
        name: 'Urban Taper Afro Fade',
        category: 'hair',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#1e272e',
        description: 'Crisp tapered temple fade with tight textured curls.'
    },
    {
        id: 'hair_twin_pigtails_pink',
        name: 'Anime Bubblegum Twin Pigtails',
        category: 'hair',
        rarity: 'Rare',
        price: 850,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#ff9ff3',
        description: 'Playful twin high pigtails in bouncy bubblegum pink.'
    },
    {
        id: 'hair_samurai_topknot',
        name: 'Ronin Samurai Topknot',
        category: 'hair',
        rarity: 'Uncommon',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#2f3542',
        description: 'Traditional tied topknot worn by disciplined wandering warriors.'
    },
    {
        id: 'hair_galaxy_long_flow',
        name: 'Cosmic Long Wave Hair',
        category: 'hair',
        rarity: 'Epic',
        price: 1600,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#6c5ce7',
        description: 'Long tumbling waves tinted with celestial galaxy violet.'
    },
    {
        id: 'hair_emerald_undercut',
        name: 'Neon Emerald Undercut',
        category: 'hair',
        rarity: 'Uncommon',
        price: 550,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#10ac84',
        description: 'Edgy swept undercut shaved clean at the sides with emerald flourish.'
    },
    {
        id: 'hair_golden_curly_bob',
        name: 'Golden Glamour Curls',
        category: 'hair',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#fed330',
        description: 'Voluminous golden curls that catch the spotlight effortlessly.'
    },
    {
        id: 'hair_shadow_spikes',
        name: 'Void Shadow Spikes',
        category: 'hair',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#1e272e',
        description: 'Razor-sharp jet black spikes infused with dark energy.'
    },
    {
        id: 'hair_royal_side_part',
        name: 'Aristocrat Pompadour',
        category: 'hair',
        rarity: 'Uncommon',
        price: 650,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#4b4b4b',
        description: 'Impeccably styled pomp with a razor-sharp side part.'
    },
    {
        id: 'hair_electric_yellow_quiff',
        name: 'Electric Volt Quiff',
        category: 'hair',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#fffa65',
        description: 'High-voltage electric yellow quiff bursting with kinetic style.'
    },
    {
        id: 'hair_crimson_braids',
        name: 'Valkyrie Crimson Braids',
        category: 'hair',
        rarity: 'Epic',
        price: 1700,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#eb4d4b',
        description: 'Intricate Nordic war braids dyed in fierce crimson red.'
    },
    {
        id: 'hair_ice_white_wolfcut',
        name: 'Arctic Wolf Cut',
        category: 'hair',
        rarity: 'Rare',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#f5f6fa',
        description: 'Trendy layered wolf cut in pure snow-white blizzard tones.'
    },
    {
        id: 'hair_cyber_dread_bun',
        name: 'Mecha High Bun',
        category: 'hair',
        rarity: 'Uncommon',
        price: 700,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#57606f',
        description: 'High-tension topknot bun tied with cybernetic carbon cord.'
    },
    {
        id: 'hair_sunset_ombre_waves',
        name: 'Sunset Gradient Waves',
        category: 'hair',
        rarity: 'Legendary',
        price: 2800,
        currency: 'Yard',
        attachmentSocket: 'hair',
        colorable: true,
        defaultColor: '#f368e0',
        description: 'Flowing ombre waves transitioning from warm solar orange to deep twilight magenta.'
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
{
        id: 'face_laser_scouter',
        name: 'Cyber Combat Scouter Visor',
        category: 'face',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Tactical power level radar scouter over the left eye.'
    },
    {
        id: 'face_diamond_shades',
        name: 'Iced-Out Diamond Framed Shades',
        category: 'face',
        rarity: 'Legendary',
        price: 3200,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Pure platinum frames paved with glistening VS1 diamonds.'
    },
    {
        id: 'face_pirate_eyepatch',
        name: 'Blackbeard Skull Eyepatch',
        category: 'face',
        rarity: 'Common',
        price: 250,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Weathered leather eyepatch stamped with a silver jolly roger.'
    },
    {
        id: 'face_oni_demon_mask',
        name: 'Kabuki Oni Half-Mask',
        category: 'face',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Fierce porcelain oni demon mask baring sharp golden fangs.'
    },
    {
        id: 'face_steampunk_monocle',
        name: 'Brass Gear Steampunk Monocle',
        category: 'face',
        rarity: 'Uncommon',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Intricate brass monocle with tiny rotating clockwork dials.'
    },
    {
        id: 'face_pixel_thug_shades',
        name: '8-Bit Deal With It Sunglasses',
        category: 'face',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Legendary pixelated black sunglasses for ultimate swag.'
    },
    {
        id: 'face_holographic_ar_glasses',
        name: 'AR Holo Lens Glasses',
        category: 'face',
        rarity: 'Rare',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Augmented reality HUD eyewear projecting real-time telemetry.'
    },
    {
        id: 'face_gasmask_tactical',
        name: 'Hazmat Tactical Respirator',
        category: 'face',
        rarity: 'Epic',
        price: 1600,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Heavy duty sealed filtration mask for hazard zones.'
    },
    {
        id: 'face_anime_star_eyes',
        name: 'Chibi Sparkle Star Eyes',
        category: 'face',
        rarity: 'Uncommon',
        price: 450,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Enthusiastic starry-eyed expression with blushing pink cheeks.'
    },
    {
        id: 'face_gothic_masquerade',
        name: 'Venetian Gold Masquerade Mask',
        category: 'face',
        rarity: 'Epic',
        price: 1900,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Elegant gilded filigree eye mask for high-society balls.'
    },
    {
        id: 'face_flame_tinted_sunglasses',
        name: 'Inferno Flame Lens Sunglasses',
        category: 'face',
        rarity: 'Rare',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Rimless sunglasses shaped like blazing stylized fire plumes.'
    },
    {
        id: 'face_heart_shaped_glasses',
        name: 'Retro Y2K Heart Sunglasses',
        category: 'face',
        rarity: 'Common',
        price: 300,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Cute candy-pink heart shaped retro frames.'
    },
    {
        id: 'face_cyber_matrix_blindfold',
        name: 'Blindfold of the Cyber Seer',
        category: 'face',
        rarity: 'Legendary',
        price: 2600,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Dark tactical fabric visor with running green matrix glyphs.'
    },
    {
        id: 'face_ninja_mouth_cloth',
        name: 'Shadow Clan Stealth Half-Cover',
        category: 'face',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Breathable shinobi cloth face wrap for stealth missions.'
    },
    {
        id: 'face_golden_snarl_grill',
        name: 'Diamond & Gold Teeth Grill',
        category: 'face',
        rarity: 'Epic',
        price: 2100,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Smirking smile lined with custom gold and iced diamond teeth.'
    },
    {
        id: 'face_cyborg_eye_implant',
        name: 'Red Laser Optical Eye Sensor',
        category: 'face',
        rarity: 'Rare',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'face',
        description: 'Bionic red laser ocular sensor glowing with targeting data.'
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
{
        id: 'top_cyber_ninja_tunic',
        name: 'Cyber Ninja Shinobi Gi',
        category: 'tops',
        rarity: 'Rare',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#1e272e',
        description: 'Reinforced kevlar shinobi tunic with concealed weapon pockets.'
    },
    {
        id: 'top_galactic_space_suit',
        name: 'Orbital Cosmonaut Jacket',
        category: 'tops',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ffffff',
        description: 'Pressurized astronaut thermal flight suit with NASA-inspired mission patches.'
    },
    {
        id: 'top_crimson_vampire_vest',
        name: 'Gothic Crimson Velvet Vest',
        category: 'tops',
        rarity: 'Rare',
        price: 850,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#8b0000',
        description: 'Deep blood-red velvet vest with ornate silver buttons and frilled cravat.'
    },
    {
        id: 'top_flame_bomber_jacket',
        name: 'Inferno Dragon Bomber Jacket',
        category: 'tops',
        rarity: 'Rare',
        price: 1000,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#e74c3c',
        description: 'Satin street bomber jacket with an embroidered golden dragon and flame sleeves.'
    },
    {
        id: 'top_street_graffiti_hoodie',
        name: 'Neon Street Graffiti Hoodie',
        category: 'tops',
        rarity: 'Uncommon',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#6c5ce7',
        description: 'Oversized urban skate hoodie splashed with luminescent graffiti tags.'
    },
    {
        id: 'top_tactical_swat_vest',
        name: 'Kevlar Commando Tactical Vest',
        category: 'tops',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#2f3542',
        description: 'Heavy duty tactical load-bearing vest equipped with magazine pouches.'
    },
    {
        id: 'top_royal_monarch_robe',
        name: 'Imperial Purple Monarch Robe',
        category: 'tops',
        rarity: 'Legendary',
        price: 2800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#5f27cd',
        description: 'Royal purple velvet mantle trimmed with gold filigree and ermine fur.'
    },
    {
        id: 'top_golden_dragon_kimono',
        name: 'Emperor Gold Embroidered Kimono',
        category: 'tops',
        rarity: 'Legendary',
        price: 3200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ffd700',
        description: 'Silk ceremonial kimono woven with shimmering golden dragon threads.'
    },
    {
        id: 'top_pixel_retro_arcade_tee',
        name: '80s Vaporwave Sunset Tee',
        category: 'tops',
        rarity: 'Common',
        price: 250,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ff7675',
        description: 'Vintage faded tee featuring neon palms and a wireframe grid sunset.'
    },
    {
        id: 'top_mecha_exo_armor',
        name: 'Titan Exoskeleton Armor Plate',
        category: 'tops',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#576574',
        description: 'Titanium chest plating with glowing power core micro-reactors.'
    },
    {
        id: 'top_hawaiian_tropical_shirt',
        name: 'Paradise Palms Island Floral Shirt',
        category: 'tops',
        rarity: 'Common',
        price: 300,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#1dd1a1',
        description: 'Breezy short-sleeve resort shirt with vibrant tropical floral print.'
    },
    {
        id: 'top_racing_grand_prix_jacket',
        name: 'Formula Speed Champion Tracksuit',
        category: 'tops',
        rarity: 'Rare',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#ee5253',
        description: 'Aerodynamic racing jacket with high-speed checkered rally stripes.'
    },
    {
        id: 'top_steampunk_corset_jacket',
        name: 'Victorian Brass Tailcoat',
        category: 'tops',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#833471',
        description: 'Rich plum Victorian tailcoat fitted with brass gear cufflinks.'
    },
    {
        id: 'top_frost_nordic_sweater',
        name: 'Alpine Snowflake Knitted Sweater',
        category: 'tops',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#48dbfb',
        description: 'Cozy wool pullover knit with traditional Nordic snowflake patterns.'
    },
    {
        id: 'top_shadow_assassin_cowl',
        name: 'Silent Shadow Leather Cowl',
        category: 'tops',
        rarity: 'Rare',
        price: 1050,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#222f3e',
        description: 'Dark studded leather cuirass designed for silent nocturnal movement.'
    },
    {
        id: 'top_golden_biker_jacket',
        name: '24K Gilded Motorcycle Jacket',
        category: 'tops',
        rarity: 'Epic',
        price: 2400,
        currency: 'Yard',
        attachmentSocket: 'torso',
        defaultColor: '#f1c40f',
        description: 'Heavy motorcycle jacket with gleaming 24K gold zippers and studs.'
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
{
        id: 'pants_cyber_runner_joggers',
        name: 'Holo Runner Techwear Joggers',
        category: 'pants',
        rarity: 'Rare',
        price: 850,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#2d3436',
        description: 'Weatherproof techwear joggers with straps and reflective ankle cuffs.'
    },
    {
        id: 'pants_golden_monarch_trousers',
        name: 'Royal Gold-Trimmed Trousers',
        category: 'pants',
        rarity: 'Legendary',
        price: 2600,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#d4af37',
        description: 'Tailored imperial trousers with intricate golden embroidery along the seams.'
    },
    {
        id: 'pants_tactical_woodland_camo',
        name: 'Special Forces Woodland Camo',
        category: 'pants',
        rarity: 'Uncommon',
        price: 550,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#57606f',
        description: 'Military rip-stop cargo trousers in authentic woodland camouflage.'
    },
    {
        id: 'pants_distressed_punk_jeans',
        name: 'Ripped Dark Indigo Punk Jeans',
        category: 'pants',
        rarity: 'Common',
        price: 350,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#1e272e',
        description: 'Distressed raw denim jeans with frayed knee tears and safety pins.'
    },
    {
        id: 'pants_neon_track_stripes',
        name: 'Athletic Dual Neon Trackpants',
        category: 'pants',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#00d2d3',
        description: 'High-visibility athletic pants with vivid double neon cyber stripes.'
    },
    {
        id: 'pants_samurai_hakama',
        name: 'Shadow Clan Samurai Hakama',
        category: 'pants',
        rarity: 'Rare',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#111418',
        description: 'Pleated black martial arts hakama trousers tailored for sword maneuvers.'
    },
    {
        id: 'pants_cosmic_starlight_chinos',
        name: 'Deep Cosmic Violet Chinos',
        category: 'pants',
        rarity: 'Rare',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#4834d4',
        description: 'Deep celestial violet slim-fit chinos with starlight sheen.'
    },
    {
        id: 'pants_lava_molten_trousers',
        name: 'Molten Core Armored Leggings',
        category: 'pants',
        rarity: 'Epic',
        price: 1700,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#eb4d4b',
        description: 'Heat-resistant armor plating glowing with pulsating lava veins.'
    },
    {
        id: 'pants_ice_white_cargo',
        name: 'Arctic Snow Flake Cargo Pants',
        category: 'pants',
        rarity: 'Uncommon',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#dfe4ea',
        description: 'Crisp white snow camouflage cargos with multiple utility pockets.'
    },
    {
        id: 'pants_biker_leather_chaps',
        name: 'Reinforced Black Biker Pants',
        category: 'pants',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#130f40',
        description: 'Heavy duty motorcycle riding leathers with reinforced padded knees.'
    },
    {
        id: 'pants_retro_bell_bottoms',
        name: '70s Groovy Flare Bell Bottoms',
        category: 'pants',
        rarity: 'Common',
        price: 300,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#f0932b',
        description: 'Retro wide-flare trousers bringing groovy disco energy.'
    },
    {
        id: 'pants_mecha_heavy_greaves',
        name: 'Titan Reinforced Plate Greaves',
        category: 'pants',
        rarity: 'Epic',
        price: 2000,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#30336b',
        description: 'Hydraulic powered exoskeleton leg supports with impact dampers.'
    },
    {
        id: 'pants_royal_velvet_slacks',
        name: 'Imperial Burgundy Velvet Slacks',
        category: 'pants',
        rarity: 'Epic',
        price: 1900,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#680838',
        description: 'Plush burgundy velvet trousers worn in imperial throne rooms.'
    },
    {
        id: 'pants_beach_board_shorts',
        name: 'Tropical Wave Surfer Boardshorts',
        category: 'pants',
        rarity: 'Common',
        price: 250,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#22a6b3',
        description: 'Quick-dry ocean surf shorts with bold turquoise wave gradients.'
    },
    {
        id: 'pants_glitch_matrix_pants',
        name: 'Binary Code Hacker Trousers',
        category: 'pants',
        rarity: 'Rare',
        price: 1000,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#10ac84',
        description: 'Stealth cargo trousers with cascading matrix code cascades.'
    },
    {
        id: 'pants_golden_armor_plates',
        name: 'Gilded Knight Leg Guards',
        category: 'pants',
        rarity: 'Legendary',
        price: 2800,
        currency: 'Yard',
        attachmentSocket: 'pants',
        defaultColor: '#e1b12c',
        description: 'Articulated 24K gold greaves forged for tournament champion champions.'
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
{
        id: 'shoes_air_hyper_pulse',
        name: 'Air Pulse Futuristic High-Tops',
        category: 'shoes',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#00f2fe',
        description: 'Cyberpunk sneakers featuring glowing pneumatic LED air pods.'
    },
    {
        id: 'shoes_golden_emperor_boots',
        name: 'Imperial 24K Gold Plated Boots',
        category: 'shoes',
        rarity: 'Legendary',
        price: 2900,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#ffd700',
        description: 'Pure polished gold armor boots fit for platform royalty.'
    },
    {
        id: 'shoes_cyber_mag_boots',
        name: 'Zero-G Magnetic Space Boots',
        category: 'shoes',
        rarity: 'Rare',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#576574',
        description: 'Heavy magnetic locking boots built for zero gravity hull walks.'
    },
    {
        id: 'shoes_demon_flame_kicks',
        name: 'Hellfire Flame Runner Kicks',
        category: 'shoes',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#ff4757',
        description: 'Running shoes that ignite in fiery sparks with every footfall.'
    },
    {
        id: 'shoes_shadow_ninja_tabi',
        name: 'Silent Shadow Tabi Boots',
        category: 'shoes',
        rarity: 'Uncommon',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#1e272e',
        description: 'Split-toe shinobi boots crafted for completely silent infiltration.'
    },
    {
        id: 'shoes_neon_retro_sneakers',
        name: 'Miami Vice Pastel Glow Sneakers',
        category: 'shoes',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#fd79a8',
        description: 'Pastel pink and cyan retro skate shoes straight out of the 1980s.'
    },
    {
        id: 'shoes_timber_combat_boots',
        name: 'Heavy Duty Tan Combat Boots',
        category: 'shoes',
        rarity: 'Common',
        price: 350,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#d35400',
        description: 'Rugged nubuck leather boots with deep all-terrain tread soles.'
    },
    {
        id: 'shoes_glacial_ice_skates',
        name: 'Cryo Blade Speed Skates',
        category: 'shoes',
        rarity: 'Rare',
        price: 1000,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#74b9ff',
        description: 'Reinforced boots mounted on diamond-honed razor ice blades.'
    },
    {
        id: 'shoes_steampunk_buckle_boots',
        name: 'Brass Buckle Steampunk Boots',
        category: 'shoes',
        rarity: 'Rare',
        price: 850,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#533c2a',
        description: 'Knee-high oiled leather boots strapped with polished brass buckles.'
    },
    {
        id: 'shoes_cyberpunk_roller_jets',
        name: 'Motorized Inline Wheel Runners',
        category: 'shoes',
        rarity: 'Epic',
        price: 2100,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#6c5ce7',
        description: 'Urban mobility high-tops with retractable motorized micro-wheels.'
    },
    {
        id: 'shoes_royal_velvet_loafers',
        name: 'Gilded Velvet Aristocrat Loafers',
        category: 'shoes',
        rarity: 'Epic',
        price: 1600,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#8b0000',
        description: 'Burgundy velvet slippers embroidered with the Playard royal crest.'
    },
    {
        id: 'shoes_toxic_green_stompers',
        name: 'Biohazard Glow High Platform Boots',
        category: 'shoes',
        rarity: 'Rare',
        price: 900,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#2ed573',
        description: 'Chunky triple-platform rave boots glowing with neon green toxicity.'
    },
    {
        id: 'shoes_galaxy_star_slipons',
        name: 'Cosmic Stardust Canvas Slip-Ons',
        category: 'shoes',
        rarity: 'Common',
        price: 300,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#3867d6',
        description: 'Casual slip-on canvas shoes printed with star constellations.'
    },
    {
        id: 'shoes_tactical_swat_boots',
        name: 'Urban Enforcement Assault Boots',
        category: 'shoes',
        rarity: 'Uncommon',
        price: 650,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#2f3640',
        description: 'Side-zip tactical footwear designed for fast SWAT urban operations.'
    },
    {
        id: 'shoes_golden_gladiator_sandals',
        name: 'Spartan Gilded Greaves Sandals',
        category: 'shoes',
        rarity: 'Rare',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#f5cd79',
        description: 'Ancient gladiator leather strapping tied around gilded bronze shin guards.'
    },
    {
        id: 'shoes_lightning_speed_cleats',
        name: 'Thunderbolt High Velocity Cleats',
        category: 'shoes',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'shoes',
        defaultColor: '#fffa65',
        description: 'Aerodynamic sprint spikes generating yellow electrical sparks.'
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
{
        id: 'hat_pirate_captain_bicorn',
        name: 'Black Pearl Pirate Captain Hat',
        category: 'hats',
        rarity: 'Rare',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Grand cocked captain bicorn hat trimmed in golden pirate lace.'
    },
    {
        id: 'hat_demon_flame_horns',
        name: 'Underworld Obsidian & Flame Horns',
        category: 'hats',
        rarity: 'Epic',
        price: 2400,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Curved demonic horns that smolder with supernatural nether fire.'
    },
    {
        id: 'hat_shogun_dragon_kabuto',
        name: 'Shogun Dragon Crest Kabuto',
        category: 'hats',
        rarity: 'Epic',
        price: 2600,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Ceremonial warlord helmet with a giant gold dragon front crest.'
    },
    {
        id: 'hat_wizard_archmage_hat',
        name: 'Archmage Mystic Star Sorcerer Hat',
        category: 'hats',
        rarity: 'Rare',
        price: 1300,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Crooked wizard cone hat embroidered with glowing silver constellation charts.'
    },
    {
        id: 'hat_cat_ear_gaming_headset',
        name: 'RGB Neon Cat-Ear Pro Headset',
        category: 'hats',
        rarity: 'Rare',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Gamer headset with illuminating RGB cat ears and a microphone.'
    },
    {
        id: 'hat_astronaut_bubble_helmet',
        name: 'Lunar Explorer Gold Visor Helmet',
        category: 'hats',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Hermetically sealed space bubble helmet with reflective gold face shield.'
    },
    {
        id: 'hat_golden_emperor_tiara',
        name: 'Diamond Studded Monarch Tiara',
        category: 'hats',
        rarity: 'Legendary',
        price: 3800,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Glistening 24K gold tiara encrusted with sapphires and radiant diamonds.'
    },
    {
        id: 'hat_detective_fedora',
        name: 'Noir Cyber Detective Fedora',
        category: 'hats',
        rarity: 'Uncommon',
        price: 700,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Classic hardboiled detective wide-brim felt fedora with silk band.'
    },
    {
        id: 'hat_ninja_headband_leaf',
        name: 'Stealth Shinobi Metal Headband',
        category: 'hats',
        rarity: 'Common',
        price: 400,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Cloth forehead protector stamped with an engraved metallic village sigil.'
    },
    {
        id: 'hat_cyber_samurai_crest',
        name: 'Neon Hologram Oni Horns',
        category: 'hats',
        rarity: 'Epic',
        price: 2100,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Cybernetic headset projecting floating holographic cyan horns.'
    },
    {
        id: 'hat_safari_explorer_pith',
        name: 'Jungle Explorer Pith Helmet',
        category: 'hats',
        rarity: 'Common',
        price: 350,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Rugged khaki pith helmet suited for deep jungle archeology.'
    },
    {
        id: 'hat_party_confetti_cone',
        name: 'Rainbow Birthday Celebration Cone',
        category: 'hats',
        rarity: 'Common',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Festive party hat with a colorful pom-pom that bursts with fun.'
    },
    {
        id: 'hat_miner_light_hard_hat',
        name: 'Deep Cave Miner Helmet with Torch',
        category: 'hats',
        rarity: 'Uncommon',
        price: 550,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Industrial safety hardhat with an ultra-bright halogen headlamp.'
    },
    {
        id: 'hat_steampunk_tophat_goggles',
        name: 'Brass Goggles Clockwork Top Hat',
        category: 'hats',
        rarity: 'Rare',
        price: 1400,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Tall Victorian silk top hat wrapped with heavy brass aviator goggles.'
    },
    {
        id: 'hat_valkyrie_winged_helm',
        name: 'Norse Valkyrie Golden Winged Helm',
        category: 'hats',
        rarity: 'Legendary',
        price: 3400,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Legendary Asgardian golden helmet boasting glorious feathered wings.'
    },
    {
        id: 'hat_chef_royal_toque',
        name: 'Master Chef Grand White Toque',
        category: 'hats',
        rarity: 'Common',
        price: 300,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Pristine tall pleated white toque worn by Michelin-starred masters.'
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
{
        id: 'acc_golden_hiphop_chains',
        name: 'Thick 24K Diamond Cuban Link Chain',
        category: 'accessories',
        rarity: 'Epic',
        price: 2400,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Heavy interlocking solid 24K gold chain iced out with sparkling diamonds.'
    },
    {
        id: 'acc_floating_cyber_drone',
        name: 'Companion Cyber Sentinel Drone',
        category: 'accessories',
        rarity: 'Legendary',
        price: 3800,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Autonomous floating sphere drone with neon scanner eye tracking your moves.'
    },
    {
        id: 'acc_steampunk_shoulder_pauldron',
        name: 'Brass Clockwork Shoulder Armor',
        category: 'accessories',
        rarity: 'Rare',
        price: 1100,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Single-shoulder plate featuring turning gears and an exhaust steam valve.'
    },
    {
        id: 'acc_demon_skull_necklace',
        name: 'Necromancer Skull Amulet',
        category: 'accessories',
        rarity: 'Rare',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Chiseled obsidian skull necklace cursed with dark violet energy.'
    },
    {
        id: 'acc_shuriken_thigh_holster',
        name: 'Ninja Concealed Shuriken Pouch',
        category: 'accessories',
        rarity: 'Uncommon',
        price: 600,
        currency: 'Yard',
        attachmentSocket: 'pants',
        description: 'Leather leg holster carrying four polished steel throwing stars.'
    },
    {
        id: 'acc_holographic_arm_band',
        name: 'Holo-Display Wrist Gauntlet',
        category: 'accessories',
        rarity: 'Rare',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Forearm computer projecting a neon interface and biometric data.'
    },
    {
        id: 'acc_dragon_heart_pendant',
        name: 'Ruby Dragon Fire Pendant',
        category: 'accessories',
        rarity: 'Epic',
        price: 1900,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Large cut crimson ruby crystal containing the pulsing heat of dragons.'
    },
    {
        id: 'acc_cyber_tactical_walkie',
        name: 'Enforcement Tactical Radio Mic',
        category: 'accessories',
        rarity: 'Common',
        price: 350,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Shoulder-clipped tactical comms speaker with coiled wire.'
    },
    {
        id: 'acc_glowing_fairy_companion',
        name: 'Radiant Forest Wisp Companion',
        category: 'accessories',
        rarity: 'Legendary',
        price: 3500,
        currency: 'Yard',
        attachmentSocket: 'head',
        description: 'Magical levitating fairy orb leaving glowing stardust trails.'
    },
    {
        id: 'acc_golden_royal_scepter',
        name: 'King Golden Gem Royal Scepter',
        category: 'accessories',
        rarity: 'Legendary',
        price: 4200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Imperial gold scepter topped with an oversized diamond orb.'
    },
    {
        id: 'acc_bandolier_ammo_belt',
        name: 'Commando Heavy Cartridge Bandolier',
        category: 'accessories',
        rarity: 'Uncommon',
        price: 700,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Chest-crossing leather ammo belt lined with heavy brass shells.'
    },
    {
        id: 'acc_diamond_tennis_choker',
        name: 'Ice-Frosted Diamond Tennis Necklace',
        category: 'accessories',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Double-row brilliant cut diamond choker reflecting vibrant prism colors.'
    },
    {
        id: 'acc_matrix_holo_matrix_badge',
        name: 'Code Stream Cyber Security Badge',
        category: 'accessories',
        rarity: 'Rare',
        price: 850,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Chest insignia displaying scrolling lime matrix mainframe credentials.'
    },
    {
        id: 'acc_flaming_fire_aura',
        name: 'Infernal Flame Sparkles Aura',
        category: 'accessories',
        rarity: 'Mythic',
        price: 6500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Swirling orbital vortex of hellfire embers and glowing ash.'
    },
    {
        id: 'acc_angelic_holy_rosary',
        name: 'Sacred Ivory Star Rosary',
        category: 'accessories',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Polished white ivory beads holding a radiant silver cross.'
    },
    {
        id: 'acc_cybernetic_mechanical_arm',
        name: 'Titanium Bionic Cyber Arm',
        category: 'accessories',
        rarity: 'Epic',
        price: 2800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Exposed bionic cybernetic arm with carbon cables and servo hydraulics.'
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
{
        id: 'back_phoenix_fire_wings',
        name: 'Legendary Phoenix Flame Wings',
        category: 'back',
        rarity: 'Mythic',
        price: 7500,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Immense blazing wings of eternal reborn phoenix fire.'
    },
    {
        id: 'back_void_shadow_scythe',
        name: 'Death Grim Reaper Void Scythe',
        category: 'back',
        rarity: 'Legendary',
        price: 3900,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Curved void titanium scythe radiating shadowy underworld mist.'
    },
    {
        id: 'back_frost_dragon_wings',
        name: 'Arctic Glacial Dragon Wings',
        category: 'back',
        rarity: 'Legendary',
        price: 4200,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Sharp crystalline ice wings leaving frosty cold plumes.'
    },
    {
        id: 'back_golden_archangel_wings',
        name: 'Seraphim 6-Feather Golden Wings',
        category: 'back',
        rarity: 'Mythic',
        price: 8500,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Six grand majestic golden wings bathed in celestial light.'
    },
    {
        id: 'back_dual_plasma_katanas',
        name: 'Crossed Dual Plasma Laser Katanas',
        category: 'back',
        rarity: 'Epic',
        price: 2500,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Twin high-frequency energy blades mounted in an X-scabbard.'
    },
    {
        id: 'back_cyber_rocket_thruster',
        name: 'Titan Heavy Booster Thruster Pack',
        category: 'back',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Twin aerospace rocket engines venting neon blue hyper-thrust.'
    },
    {
        id: 'back_cosmic_nebula_cape',
        name: 'Flowing Starlight Nebula Velvet Cape',
        category: 'back',
        rarity: 'Legendary',
        price: 3400,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Flowing floor-length cape displaying living moving cosmic constellations.'
    },
    {
        id: 'back_demon_bat_wings',
        name: 'Gothic Shadow Fiend Bat Wings',
        category: 'back',
        rarity: 'Rare',
        price: 1400,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Leathery spiked bat wings unfurling behind the avatar.'
    },
    {
        id: 'back_electric_lightning_guitar',
        name: 'Heavy Metal Dual-Neck Rock Guitar',
        category: 'back',
        rarity: 'Epic',
        price: 2000,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Double-neck electric guitar crackling with high-voltage rock chords.'
    },
    {
        id: 'back_cyber_spider_legs',
        name: 'Mechanical Quad Arachnid Nano Arms',
        category: 'back',
        rarity: 'Legendary',
        price: 4600,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Four articulated carbon mechanical spider legs poised over your back.'
    },
    {
        id: 'back_royal_fur_cape',
        name: 'Imperial Ermine Lined King Cape',
        category: 'back',
        rarity: 'Epic',
        price: 2700,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Velvet crimson mantle crowned with spotted white ermine royal fur.'
    },
    {
        id: 'back_tactical_sniper_rifle',
        name: 'Holstered Ghost Spec-Ops Sniper Rifle',
        category: 'back',
        rarity: 'Rare',
        price: 1300,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Long-range silenced anti-material rifle slung securely on back.'
    },
    {
        id: 'back_golden_sun_mandala',
        name: 'Sol Invictus Radiant Golden Wheel',
        category: 'back',
        rarity: 'Mythic',
        price: 6800,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Sacred rotating golden solar halo disc radiating divine rays.'
    },
    {
        id: 'back_steampunk_clockwork_wings',
        name: 'Brass Gear Gliding Wings',
        category: 'back',
        rarity: 'Epic',
        price: 2400,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Articulated canvas gliding wings driven by intricate brass clockwork gears.'
    },
    {
        id: 'back_plasma_energy_cannon',
        name: 'Heavy Shoulder-Mounted Plasma Cannon',
        category: 'back',
        rarity: 'Legendary',
        price: 3600,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Heavy futuristic battery cannon with animated glowing charge cells.'
    },
    {
        id: 'back_butterfly_pixie_wings',
        name: 'Enchanted Luminescent Pixie Wings',
        category: 'back',
        rarity: 'Rare',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'back',
        description: 'Translucent glittering fairy wings that flutter with magical charm.'
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
    },
{
        id: 'emote_dab_swag',
        name: 'Dab Swag',
        category: 'emotes',
        rarity: 'Uncommon',
        price: 500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Crisp angled arm dab expressing uncontested confidence.'
    },
    {
        id: 'emote_moonwalk_slide',
        name: 'Smooth Moonwalk',
        category: 'emotes',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Effortless backward gliding moonwalk step with Fedora tip.'
    },
    {
        id: 'emote_tpose_dominance',
        name: 'T-Pose Ascend',
        category: 'emotes',
        rarity: 'Rare',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Pure authoritative T-pose exerting total physics superiority.'
    },
    {
        id: 'emote_robot_popper',
        name: 'Electric Boogaloo Robot',
        category: 'emotes',
        rarity: 'Rare',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Sharp locking, popping and fluid wave robot dance routine.'
    },
    {
        id: 'emote_kungfu_strike',
        name: 'Shaolin Kung Fu Stance',
        category: 'emotes',
        rarity: 'Epic',
        price: 1600,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Disciplined martial arts crane stance and lightning palm strikes.'
    },
    {
        id: 'emote_headspin_air',
        name: 'Gravity Headspin',
        category: 'emotes',
        rarity: 'Legendary',
        price: 2800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'High-speed continuous breakdance headspin defying earth gravity.'
    },
    {
        id: 'emote_cheer_hype',
        name: 'Stadium Victory Cheer',
        category: 'emotes',
        rarity: 'Common',
        price: 300,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Both arms raised triumphantly in the air cheering with delight.'
    },
    {
        id: 'emote_formal_bow',
        name: 'Gentleman Aristocrat Bow',
        category: 'emotes',
        rarity: 'Common',
        price: 250,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Elegant formal courtier bow with hand over the heart.'
    },
    {
        id: 'emote_matrix_dodge',
        name: 'Bullet-Time Matrix Dodge',
        category: 'emotes',
        rarity: 'Legendary',
        price: 3200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Slow-motion backward limbo dodge dodging imaginary laser beams.'
    },
    {
        id: 'emote_hype_clap',
        name: 'Crowd Hype Clapping',
        category: 'emotes',
        rarity: 'Common',
        price: 200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Rapid, enthusiastic overhead applause cheering teammates.'
    },
    {
        id: 'emote_slow_clap',
        name: 'Sarcastic Slow Clap',
        category: 'emotes',
        rarity: 'Uncommon',
        price: 400,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Measured, deliberate theatrical slow clap for funny moments.'
    },
    {
        id: 'emote_superhero_landing',
        name: 'Superhero Ground Slam',
        category: 'emotes',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'High vertical leap culminating in a 3-point superhero fist ground impact.'
    },

    // ==========================================
    // --- 11. MOVEMENT STYLES (ANIMATIONS) ---
    // ==========================================
    {
        id: 'anim_style_default',
        name: 'Classic Movement',
        category: 'animations',
        rarity: 'Common',
        price: 0,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Standard, balanced humanoid idle, walking, running, and jumping.',
        isDefault: true
    },
    {
        id: 'anim_style_ninja',
        name: 'Ninja Acrobat',
        category: 'animations',
        rarity: 'Rare',
        price: 1400,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Stealthy low-stance idle, swept-back arms sprint, and aerial ninja tuck jump.'
    },
    {
        id: 'anim_style_zombie',
        name: 'Spooky Zombie',
        category: 'animations',
        rarity: 'Rare',
        price: 1200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Head-tilted lurching stance, outstretched stiff-arm shuffle, and lumbering jump.'
    },
    {
        id: 'anim_style_superhero',
        name: 'Superhero Stride',
        category: 'animations',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Fists-on-hips hero stance, soaring chest-forward flight sprint, and skyward punch leap.'
    },
    {
        id: 'anim_style_mage',
        name: 'Mystic Mage',
        category: 'animations',
        rarity: 'Epic',
        price: 2600,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Floating hover idle, ethereal gliding walk, and arcane spiral jump.'
    },
    {
        id: 'anim_style_robot',
        name: 'Cyborg Robot',
        category: 'animations',
        rarity: 'Rare',
        price: 1300,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Rigid mechanical snaps, 90-degree angular piston strides, and hydraulic jump.'
    },
    {
        id: 'anim_style_oldschool',
        name: 'Oldschool Retro',
        category: 'animations',
        rarity: 'Uncommon',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Funky bouncy hip sway, carefree wide-swinging strides, and hands-in-air victory leap.'
    },
    {
        id: 'anim_style_toy',
        name: 'Toy Soldier',
        category: 'animations',
        rarity: 'Uncommon',
        price: 950,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Rigid plastic peg-leg posture, stiff marching strides, and action figure spring leap.'
    },
    {
        id: 'anim_style_knight',
        name: 'Armored Knight',
        category: 'animations',
        rarity: 'Epic',
        price: 1800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Steadfast heavy plate posture, disciplined martial stride, and armored charge leap.'
    },
    {
        id: 'anim_style_stylish',
        name: 'Stylish Swagger',
        category: 'animations',
        rarity: 'Legendary',
        price: 2800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Asymmetric hip-tilted swagger idle, runway fluid walk, and graceful airborne leap.'
    },
{
        id: 'anim_style_parkour',
        name: 'Parkour Freerunner',
        category: 'animations',
        rarity: 'Legendary',
        price: 3200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Agile athletic stance, deep sprint crouch with forward momentum, and soaring tuck vault leap.'
    },
    {
        id: 'anim_style_speedster',
        name: 'Hyper Speedster Bolt',
        category: 'animations',
        rarity: 'Legendary',
        price: 3500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Aggressive low-angle forward charge, aerodynamic arms pump, and kinetic blur takeoff.'
    },
    {
        id: 'anim_style_celestial',
        name: 'Celestial Float & Hover',
        category: 'animations',
        rarity: 'Mythic',
        price: 6000,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Transcendent levitation hovering above the floor, serene drifting glide, and starlight ascend.'
    },
    {
        id: 'anim_style_monarch',
        name: 'Monarch Regal Strut',
        category: 'animations',
        rarity: 'Epic',
        price: 2500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Dignified imperial posture, slow commanding swagger strides, and graceful airborne leap.'
    },
    {
        id: 'anim_style_glider',
        name: 'Cyber Glider',
        category: 'animations',
        rarity: 'Epic',
        price: 2200,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Streamlined aerodynamic wingspan stance, hover gliding locomotion, and soaring dive jump.'
    },
    {
        id: 'anim_style_heavy_titan',
        name: 'Armored Heavy Titan',
        category: 'animations',
        rarity: 'Epic',
        price: 2000,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Immovable broad powerhouse stance, ground-shaking heavy footsteps, and thunderous impact leap.'
    },
    {
        id: 'anim_style_ghost_float',
        name: 'Ethereal Phantom Float',
        category: 'animations',
        rarity: 'Legendary',
        price: 3000,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Undulating ethereal phantom hover, weightless spectral glide, and ghostly vertical rise.'
    },
    {
        id: 'anim_style_beast_prowl',
        name: 'Feral Beast Prowl',
        category: 'animations',
        rarity: 'Rare',
        price: 1400,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Low-slung predatory stalk, rapid agile bounding sprint, and dynamic pounce jump.'
    },
    {
        id: 'anim_style_groove_walker',
        name: 'Disco Funk Groove Walk',
        category: 'animations',
        rarity: 'Uncommon',
        price: 800,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Rhythmic funk strut with shoulder rolls, finger snaps, and mid-air dance pop leap.'
    },
    {
        id: 'anim_style_assassin_stealth',
        name: 'Shadow Assassin Crouch',
        category: 'animations',
        rarity: 'Rare',
        price: 1500,
        currency: 'Yard',
        attachmentSocket: 'torso',
        description: 'Silently prowling crouch stance, poised ninja step locomotion, and shadow vault jump.'
    },

];

export function getItemById(id: string): AvatarItem | undefined {
    return AVATAR_CATALOG.find(i => i.id === id);
}

export function getItemsByCategory(cat: string): AvatarItem[] {
    return AVATAR_CATALOG.filter(i => i.category === cat);
}
