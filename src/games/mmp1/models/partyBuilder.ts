import * as THREE from 'three';
import { Character } from '../types';
import { createCharacterMesh } from './characterBuilder';
import { MmpCrateManager } from '../state/crateManager';
import { AvatarConfig } from '../../../shared/avatar/types';
import { getCurrentUserProfile, isPlayardOwner } from '../../../auth';

export function getPlayerDisplayName(): { username: string; displayName: string } {
    const prof = getCurrentUserProfile();
    const username = prof?.username || "Player";
    const isOwner = isPlayardOwner(prof?.email);
    const displayName = `${username} (Sina)${isOwner ? ' 👑' : ''}`;
    return { username, displayName };
}

export interface MmpBotPreset {
    name: string;
    color: number;
    avatarConfig: AvatarConfig;
}

export const MMP_BOT_PRESETS: MmpBotPreset[] = [
    {
        name: "Alex",
        color: 0x3498db,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#f5d0b5',
            faceId: 'face_smile',
            hairId: 'hair_slick_gentleman',
            hairColor: '#3d2b1f',
            topId: 'top_flannel_casual',
            pantsId: 'pants_jeans_dark',
            shoesId: 'shoes_oxford_luxury',
            hatId: 'hat_detective_fedora',
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    },
    {
        name: "Sam",
        color: 0xe67e22,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#dfb190',
            faceId: 'face_smirk_wink',
            hairId: 'hair_spiky_punk',
            hairColor: '#d35400',
            topId: 'top_hoodie_cyan',
            pantsId: 'pants_track_neon',
            shoesId: 'shoes_sneakers_white',
            hatId: 'hat_cap_snapback',
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    },
    {
        name: "Jordan",
        color: 0x9b59b6,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#ecd0b9',
            faceId: 'face_smile',
            hairId: 'hair_wavy_bob',
            hairColor: '#4a235a',
            topId: 'top_leather_jacket',
            pantsId: 'pants_biker_leather_chaps',
            shoesId: 'shoes_combat_boots',
            hatId: 'hat_beanie_cozy',
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    },
    {
        name: "Charlie",
        color: 0x1abc9c,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#c68652',
            faceId: 'face_battle_scar',
            hairId: 'hair_curly_afro_fade',
            hairColor: '#1c1c1c',
            topId: 'top_tactical_swat_vest',
            pantsId: 'pants_camo_woodland',
            shoesId: 'shoes_tactical_swat_boots',
            hatId: 'hat_tactical_beret',
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    },
    {
        name: "Taylor",
        color: 0xf1c40f,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#f5d0b5',
            faceId: 'face_cool_shades',
            hairId: 'hair_golden_super',
            hairColor: '#f1c40f',
            topId: 'top_racing_grand_prix_jacket',
            pantsId: 'pants_jeans_dark',
            shoesId: 'shoes_sneakers_white',
            hatId: null,
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    },
    {
        name: "Morgan",
        color: 0xe74c3c,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#8d5524',
            faceId: 'face_smile',
            hairId: 'hair_crimson_braids',
            hairColor: '#c0392b',
            topId: 'top_flame_bomber_jacket',
            pantsId: 'pants_jeans_dark',
            shoesId: 'shoes_combat_boots',
            hatId: null,
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    },
    {
        name: "Riley",
        color: 0x34495e,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#b87333',
            faceId: 'face_ninja_mask',
            hairId: 'hair_buzz_cut',
            hairColor: '#1a1a1a',
            topId: 'top_shadow_assassin_cowl',
            pantsId: 'pants_cargo_tactical',
            shoesId: 'shoes_shadow_ninja_tabi',
            hatId: 'hat_ninja_headband_leaf',
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    },
    {
        name: "Casey",
        color: 0x8e44ad,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#f0c8a6',
            faceId: 'face_smile',
            hairId: 'hair_royal_side_part',
            hairColor: '#34495e',
            topId: 'top_royal_monarch_robe',
            pantsId: 'pants_royal_velvet_slacks',
            shoesId: 'shoes_royal_velvet_loafers',
            hatId: 'hat_royal_crown',
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    },
    {
        name: "Dakota",
        color: 0x16a085,
        avatarConfig: {
            bodyId: 'body_standard',
            skinColor: '#dfb190',
            faceId: 'face_smile',
            hairId: 'hair_long_samurai',
            hairColor: '#422812',
            topId: 'top_street_graffiti_hoodie',
            pantsId: 'pants_cargo_tactical',
            shoesId: 'shoes_timber_combat_boots',
            hatId: 'hat_cowboy_leather',
            accessoryId: null,
            backId: null,
            activeEmote: 'idle',
            movementStyle: 'anim_style_default'
        }
    }
];

export function createBotCharacter(
    index: number,
    scene: THREE.Scene,
    crateManager: MmpCrateManager,
    totalBots: number = 4
): Character {
    const preset = MMP_BOT_PRESETS[index % MMP_BOT_PRESETS.length];
    const botModel = createCharacterMesh(preset.name + " 👤", preset.color, false, crateManager, preset.avatarConfig);
    
    // Position in a semi-circle in the lobby
    const count = Math.max(1, totalBots);
    const angle = -Math.PI * 0.7 + (index / Math.max(1, count - 1)) * (Math.PI * 1.4);
    const radius = 7.0 + (index % 2) * 1.2;
    const spawnPos = new THREE.Vector3(Math.sin(angle) * radius, 0, 150 - Math.cos(angle) * radius);

    const bot: Character = {
        id: "bot_" + preset.name.toLowerCase(),
        name: preset.name,
        isPlayer: false,
        isRemotePlayer: false,
        role: "innocent",
        isAlive: true,
        hasWeaponEquipped: false,
        mesh: botModel.group,
        position: spawnPos,
        velocity: new THREE.Vector3(),
        rotation: Math.atan2(-spawnPos.x, 150 - spawnPos.z),
        knifeMesh: botModel.knife,
        gunMesh: botModel.gun,
        bodyMesh: botModel.body,
        headMesh: botModel.head,
        leftLeg: botModel.leftLeg,
        rightLeg: botModel.rightLeg,
        leftArm: botModel.leftArm,
        rightArm: botModel.rightArm,
        avatarRig: botModel.avatarRig,
        aiTimer: 0,
        coins: 0
    };

    bot.mesh.userData.character = bot;
    bot.mesh.traverse(c => { 
        c.userData.character = bot;
        (c as any).frustumCulled = false;
    });
    bot.mesh.position.copy(bot.position);
    bot.mesh.rotation.y = bot.rotation;
    scene.add(bot.mesh);
    return bot;
}

export function createPartyCharacters(
    scene: THREE.Scene,
    crateManager: MmpCrateManager,
    botCount: number = 4
): { playerChar: Character; characters: Character[] } {
    const characters: Character[] = [];

    const { username, displayName } = getPlayerDisplayName();
    const pModel = createCharacterMesh(displayName, 0x2ecc71, true, crateManager);
    const playerChar: Character = {
        id: "player",
        name: username,
        isPlayer: true,
        isRemotePlayer: false,
        role: "innocent",
        isAlive: true,
        hasWeaponEquipped: false,
        mesh: pModel.group,
        position: new THREE.Vector3(0, 0, 150),
        velocity: new THREE.Vector3(),
        rotation: Math.PI,
        knifeMesh: pModel.knife,
        gunMesh: pModel.gun,
        bodyMesh: pModel.body,
        headMesh: pModel.head,
        leftLeg: pModel.leftLeg,
        rightLeg: pModel.rightLeg,
        leftArm: pModel.leftArm,
        rightArm: pModel.rightArm,
        avatarRig: pModel.avatarRig,
        aiTimer: 0,
        coins: 0
    };
    playerChar.mesh.userData.character = playerChar;
    playerChar.mesh.traverse(c => { 
        c.userData.character = playerChar;
        (c as any).frustumCulled = false;
    });
    playerChar.mesh.position.copy(playerChar.position);
    playerChar.mesh.rotation.y = playerChar.rotation;
    scene.add(playerChar.mesh);
    characters.push(playerChar);

    const actualBotCount = Math.min(botCount, MMP_BOT_PRESETS.length);
    for (let i = 0; i < actualBotCount; i++) {
        const bot = createBotCharacter(i, scene, crateManager, actualBotCount);
        characters.push(bot);
    }

    return { playerChar, characters };
}
