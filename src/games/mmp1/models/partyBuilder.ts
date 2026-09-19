import * as THREE from 'three';
import { Character } from '../types';
import { createCharacterMesh } from './characterBuilder';
import { MmpCrateManager } from '../state/crateManager';

export const MMP_BOT_PRESETS = [
    { name: "Alex", color: 0x3498db },
    { name: "Sam", color: 0xe67e22 },
    { name: "Jordan", color: 0x9b59b6 },
    { name: "Charlie", color: 0x1abc9c },
    { name: "Taylor", color: 0xf1c40f },
    { name: "Morgan", color: 0xe74c3c },
    { name: "Riley", color: 0x34495e },
    { name: "Casey", color: 0x8e44ad },
    { name: "Dakota", color: 0x16a085 }
];

export function createBotCharacter(
    index: number,
    scene: THREE.Scene,
    crateManager: MmpCrateManager,
    totalBots: number = 4
): Character {
    const preset = MMP_BOT_PRESETS[index % MMP_BOT_PRESETS.length];
    const botModel = createCharacterMesh(preset.name + " 👤", preset.color, false, crateManager);
    
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

    const pModel = createCharacterMesh("Karl (Sina) 👑", 0x2ecc71, true, crateManager);
    const playerChar: Character = {
        id: "player",
        name: "Karl",
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
