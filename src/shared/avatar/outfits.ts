import { AvatarConfig, ItemRarity, AvatarItem } from "./types";
import { getItemById } from "./catalog";

export interface AvatarOutfitBundle {
    id: string;
    name: string;
    tag: string;
    rarity: ItemRarity;
    description: string;
    badgeEmoji: string;
    config: Partial<AvatarConfig>;
}

export const PRESET_OUTFITS: AvatarOutfitBundle[] = [
    {
        id: "outfit_golden_emperor",
        name: "👑 24K Golden Monarch",
        tag: "Legendary Outfit",
        rarity: "Legendary",
        badgeEmoji: "👑",
        description: "Pure liquid 24K gold skin, royal crown, emperor robes, golden wings, diamond grill, and monarch strut.",
        config: {
            skinColor: "#ffd700",
            hairId: "hair_golden_super",
            hairColor: "#ffd700",
            faceId: "face_golden_snarl_grill",
            topId: "top_golden_dragon_kimono",
            pantsId: "pants_golden_monarch_trousers",
            shoesId: "shoes_golden_emperor_boots",
            hatId: "hat_royal_crown",
            backId: "back_golden_archangel_wings",
            movementStyle: "anim_style_monarch"
        }
    },
    {
        id: "outfit_cyber_ninja",
        name: "🥷 Shadow Cyber Shinobi",
        tag: "Epic Outfit",
        rarity: "Epic",
        badgeEmoji: "🥷",
        description: "Obsidian carbon skin, shadow spikes hair, ninja mask, dual katanas, and acrobatic ninja freerunner.",
        config: {
            skinColor: "#1e272e",
            hairId: "hair_shadow_spikes",
            hairColor: "#111111",
            faceId: "face_ninja_mask",
            topId: "top_cyber_ninja_tunic",
            pantsId: "pants_samurai_hakama",
            shoesId: "shoes_shadow_ninja_tabi",
            hatId: "hat_ninja_headband_leaf",
            backId: "back_dual_plasma_katanas",
            movementStyle: "anim_style_ninja"
        }
    },
    {
        id: "outfit_space_explorer",
        name: "🚀 Orbital Cosmonaut",
        tag: "Epic Outfit",
        rarity: "Epic",
        badgeEmoji: "🚀",
        description: "Pressurized astronaut suit, gold visor bubble helmet, rocket booster thrusters, and zero-G glider walk.",
        config: {
            skinColor: "#ffebd2",
            hairId: "hair_classic",
            hairColor: "#2f3542",
            faceId: "face_holographic_ar_glasses",
            topId: "top_galactic_space_suit",
            pantsId: "pants_ice_white_cargo",
            shoesId: "shoes_cyber_mag_boots",
            hatId: "hat_astronaut_bubble_helmet",
            backId: "back_cyber_rocket_thruster",
            movementStyle: "anim_style_glider"
        }
    },
    {
        id: "outfit_infernal_demon",
        name: "🔥 Hellfire Demon Warlord",
        tag: "Mythic Outfit",
        rarity: "Mythic",
        badgeEmoji: "🔥",
        description: "Inferno magma red skin, blazing mohawk, flame horns, phoenix wings, and feral beast prowl.",
        config: {
            skinColor: "#ff3838",
            hairId: "hair_fire_mohawk",
            hairColor: "#ff4757",
            faceId: "face_demon_horns_face",
            topId: "top_flame_bomber_jacket",
            pantsId: "pants_lava_molten_trousers",
            shoesId: "shoes_demon_flame_kicks",
            hatId: "hat_demon_flame_horns",
            backId: "back_phoenix_fire_wings",
            movementStyle: "anim_style_beast_prowl"
        }
    },
    {
        id: "outfit_retro_synthwave",
        name: "⚡ 80s Synthwave Hacker",
        tag: "Rare Outfit",
        rarity: "Rare",
        badgeEmoji: "⚡",
        description: "Synthwave magenta glow, pixel thug shades, neon track pants, rock guitar, and funky groove walker.",
        config: {
            skinColor: "#e056fd",
            hairId: "hair_electric_yellow_quiff",
            hairColor: "#fffa65",
            faceId: "face_pixel_thug_shades",
            topId: "top_pixel_retro_arcade_tee",
            pantsId: "pants_neon_track_stripes",
            shoesId: "shoes_neon_retro_sneakers",
            hatId: "hat_cap_snapback",
            backId: "back_electric_lightning_guitar",
            movementStyle: "anim_style_groove_walker"
        }
    },
    {
        id: "outfit_star_sorcerer",
        name: "🔮 Celestial Archmage",
        tag: "Legendary Outfit",
        rarity: "Legendary",
        badgeEmoji: "🔮",
        description: "Cosmic amethyst skin, mystic star sorcerer hat, nebula cape, and celestial levitation hover.",
        config: {
            skinColor: "#8854d0",
            hairId: "hair_galaxy_long_flow",
            hairColor: "#6c5ce7",
            faceId: "face_gothic_masquerade",
            topId: "top_royal_monarch_robe",
            pantsId: "pants_cosmic_starlight_chinos",
            shoesId: "shoes_galaxy_star_slipons",
            hatId: "hat_wizard_archmage_hat",
            backId: "back_cosmic_nebula_cape",
            movementStyle: "anim_style_celestial"
        }
    },
    {
        id: "outfit_tactical_swat",
        name: "🪖 Special Forces Operator",
        tag: "Rare Outfit",
        rarity: "Rare",
        badgeEmoji: "🪖",
        description: "Kevlar tactical vest, gasmask respirator, woodland camo, sniper rifle, and stealth assassin crouch.",
        config: {
            skinColor: "#dfb190",
            hairId: "hair_curly_afro_fade",
            hairColor: "#1e272e",
            faceId: "face_gasmask_tactical",
            topId: "top_tactical_swat_vest",
            pantsId: "pants_tactical_woodland_camo",
            shoesId: "shoes_tactical_swat_boots",
            hatId: "hat_tactical_beret",
            backId: "back_tactical_sniper_rifle",
            movementStyle: "anim_style_assassin_stealth"
        }
    },
    {
        id: "outfit_chibi_anime",
        name: "🌸 Anime Popstar",
        tag: "Epic Outfit",
        rarity: "Epic",
        badgeEmoji: "🌸",
        description: "Porcelain skin, bubblegum pink twin pigtails, chibi star eyes, RGB cat-ear headset, and pixie wings.",
        config: {
            skinColor: "#ffebd2",
            hairId: "hair_twin_pigtails_pink",
            hairColor: "#ff9ff3",
            faceId: "face_anime_star_eyes",
            topId: "top_street_graffiti_hoodie",
            pantsId: "pants_distressed_punk_jeans",
            shoesId: "shoes_air_hyper_pulse",
            hatId: "hat_cat_ear_gaming_headset",
            backId: "back_butterfly_pixie_wings",
            movementStyle: "anim_style_stylish"
        }
    },
    {
        id: "outfit_viking_warlord",
        name: "⚔️ Nordic Viking Berserker",
        tag: "Epic Outfit",
        rarity: "Epic",
        badgeEmoji: "⚔️",
        description: "Sun-kissed skin, crimson war braids, battle scar, horned viking helm, and heavy titan march.",
        config: {
            skinColor: "#dfb190",
            hairId: "hair_crimson_braids",
            hairColor: "#eb4d4b",
            faceId: "face_battle_scar",
            topId: "top_frost_nordic_sweater",
            pantsId: "pants_biker_leather_chaps",
            shoesId: "shoes_timber_combat_boots",
            hatId: "hat_viking_helm",
            backId: "back_golden_shield",
            movementStyle: "anim_style_heavy_titan"
        }
    },
    {
        id: "outfit_pirate_captain",
        name: "🏴‍☠️ Blackbeard Pirate Captain",
        tag: "Rare Outfit",
        rarity: "Rare",
        badgeEmoji: "🏴‍☠️",
        description: "Sun-bronzed skin, skull eyepatch, pirate bicorn hat, gentleman tailcoat, and swagger stride.",
        config: {
            skinColor: "#d49a6a",
            hairId: "hair_curly_afro",
            hairColor: "#1e272e",
            faceId: "face_pirate_eyepatch",
            topId: "top_steampunk_corset_jacket",
            pantsId: "pants_distressed_punk_jeans",
            shoesId: "shoes_steampunk_buckle_boots",
            hatId: "hat_pirate_captain_bicorn",
            backId: "back_ninja_katana",
            movementStyle: "anim_style_stylish"
        }
    }
];

export function getPresetOutfits(): AvatarOutfitBundle[] {
    return PRESET_OUTFITS;
}

export function getOutfitById(id: string): AvatarOutfitBundle | undefined {
    return PRESET_OUTFITS.find(o => o.id === id);
}

export function getOutfitItems(outfit: AvatarOutfitBundle): AvatarItem[] {
    const items: AvatarItem[] = [];
    const cfg = outfit.config;
    const ids = [
        cfg.hatId,
        cfg.hairId,
        cfg.faceId,
        cfg.topId,
        cfg.pantsId,
        cfg.shoesId,
        cfg.backId,
        cfg.movementStyle
    ].filter((id): id is string => !!id);

    ids.forEach(id => {
        const item = getItemById(id);
        if (item) items.push(item);
    });
    return items;
}

export function getOutfitTotalPrice(outfit: AvatarOutfitBundle): number {
    const items = getOutfitItems(outfit);
    return items.reduce((sum, it) => sum + (it.price || 0), 0);
}
