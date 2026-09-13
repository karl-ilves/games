import * as THREE from 'three';
import { Character } from '../types';
import { createCharacterMesh } from './characterBuilder';
import { MmpCrateManager } from '../state/crateManager';

export function createPartyCharacters(
    scene: THREE.Scene,
    crateManager: MmpCrateManager
): { playerChar: Character; characters: Character[] } {
    const characters: Character[] = [];
    const botNames = ["Alex", "Sam", "Jordan", "Charlie", "Taylor", "Morgan", "Riley"];
    const colors = [0x3498db, 0xe67e22, 0x9b59b6, 0x1abc9c, 0xf39c12, 0xe74c3c, 0x00cec9];

    const pModel = createCharacterMesh("Karl (Sina) 👑", 0x2ecc71, true, crateManager);
    const playerChar: Character = {
        id: "player",
        name: "Karl",
        isPlayer: true,
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
    playerChar.mesh.traverse(c => { c.userData.character = playerChar; });
    playerChar.mesh.position.copy(playerChar.position);
    playerChar.mesh.rotation.y = playerChar.rotation;
    scene.add(playerChar.mesh);
    characters.push(playerChar);

    botNames.forEach((name, i) => {
        const botModel = createCharacterMesh(name + " 👤", colors[i % colors.length], false, crateManager);
        const angle = -Math.PI * 0.7 + (i / (botNames.length - 1)) * (Math.PI * 1.4);
        const radius = 7.0 + (i % 2) * 1.2;
        const spawnPos = new THREE.Vector3(Math.sin(angle) * radius, 0, 150 - Math.cos(angle) * radius);
        const bot: Character = {
            id: "bot_" + i,
            name: name,
            isPlayer: false,
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
        bot.mesh.traverse(c => { c.userData.character = bot; });
        bot.mesh.position.copy(bot.position);
        bot.mesh.rotation.y = bot.rotation;
        scene.add(bot.mesh);
        characters.push(bot);
    });

    return { playerChar, characters };
}
