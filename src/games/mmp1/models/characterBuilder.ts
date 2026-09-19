import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { avatarService } from '../../../shared/avatar/AvatarService';
import { DEFAULT_AVATAR_CONFIG } from '../../../shared/avatar/catalog';
import { AvatarConfig } from '../../../shared/avatar/types';
import { createUltraRealisticKnife, createUltraRealisticRevolver } from './weaponBuilder';
import { formatOwnerNametag, isOwnerUser } from '../../../auth';

export function renderNameTagCanvas(canvas: HTMLCanvasElement, name: string, isPlayer: boolean): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isOwner = isOwnerUser(name);
    const finalName = isOwner ? formatOwnerNametag(name, true) : name;

    // Stylish rounded dark badge with colored borders
    ctx.fillStyle = isPlayer ? 'rgba(30, 20, 10, 0.92)' : 'rgba(15, 10, 25, 0.88)';
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 14);
    ctx.fill();
    ctx.strokeStyle = isPlayer ? '#ffd32a' : '#00f2fe';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = isPlayer ? '#ffd32a' : '#ffffff';
    let fontSize = 24;
    ctx.font = `bold ${fontSize}px sans-serif`;
    while (ctx.measureText(finalName).width > canvas.width - 36 && fontSize > 13) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(finalName, canvas.width / 2, canvas.height / 2);
}

export function updateCharacterNameTag(character: { mesh: THREE.Group; isPlayer?: boolean }, displayName: string): void {
    const canvas = character.mesh.userData.nameTagCanvas as HTMLCanvasElement | undefined;
    const tex = character.mesh.userData.nameTagTexture as THREE.CanvasTexture | undefined;
    if (canvas && tex) {
        renderNameTagCanvas(canvas, displayName, !!character.isPlayer);
        tex.needsUpdate = true;
    }
}

export function createCharacterMesh(
    name: string,
    colorHex: number,
    isPlayer: boolean = false,
    crateManager?: { getInventory: () => { equippedKnife?: string; equippedGun?: string } | null },
    avatarConfig?: AvatarConfig
): {
    group: THREE.Group;
    knife: THREE.Group;
    gun: THREE.Group;
    body: THREE.Mesh;
    head: THREE.Mesh;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    avatarRig: AvatarRig;
} {
    const configToUse: AvatarConfig = isPlayer 
        ? avatarService.getConfig() 
        : (avatarConfig || { ...DEFAULT_AVATAR_CONFIG });

    const avatarRig = new AvatarRig(configToUse);
    avatarRig.rootGroup.name = isPlayer ? 'MMP1_Player_AvatarRig' : `MMP1_AvatarRig_${name.replace(/[^a-zA-Z0-9_]/g, '')}`;

    // Attach ultra-realistic knife and gun to right arm bone / hand (positioned firmly in palm, pointing forward)
    const knifeGroup = createUltraRealisticKnife(undefined, crateManager?.getInventory()?.equippedKnife);
    knifeGroup.position.set(0.04, -0.92, 0.08);
    knifeGroup.rotation.set(-Math.PI * 0.45, 0, -Math.PI / 16);
    knifeGroup.visible = false;
    avatarRig.bones.rightArm.add(knifeGroup);

    const gunGroup = createUltraRealisticRevolver(false, undefined, crateManager?.getInventory()?.equippedGun);
    gunGroup.position.set(0.02, -0.82, 0.12);
    gunGroup.rotation.set(0, 0, 0);
    gunGroup.visible = false;
    avatarRig.bones.rightArm.add(gunGroup);

    // Add name tag billboard above head
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 75;
    renderNameTagCanvas(canvas, name, isPlayer);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ 
        map: tex, 
        depthTest: false, 
        depthWrite: false, 
        transparent: true 
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.renderOrder = 999;
    sprite.position.y = 4.4;
    sprite.scale.set(3.8, 0.95, 1);
    avatarRig.rootGroup.add(sprite);

    avatarRig.rootGroup.userData.nameTagSprite = sprite;
    avatarRig.rootGroup.userData.nameTagCanvas = canvas;
    avatarRig.rootGroup.userData.nameTagTexture = tex;
    avatarRig.rootGroup.userData.isPlayer = isPlayer;

    if (isPlayer) {
        avatarService.subscribe(cfg => {
            avatarRig.applyConfig(cfg);
        });
    }

    let bodyMesh: THREE.Mesh = new THREE.Mesh();
    let headMesh: THREE.Mesh = new THREE.Mesh();
    avatarRig.bones.torso.traverse(c => {
        if (!bodyMesh.geometry && (c as THREE.Mesh).isMesh) bodyMesh = c as THREE.Mesh;
    });
    avatarRig.bones.head.traverse(c => {
        if (!headMesh.geometry && (c as THREE.Mesh).isMesh) headMesh = c as THREE.Mesh;
    });

    return {
        group: avatarRig.rootGroup,
        knife: knifeGroup,
        gun: gunGroup,
        body: bodyMesh,
        head: headMesh,
        leftLeg: avatarRig.bones.leftLeg,
        rightLeg: avatarRig.bones.rightLeg,
        leftArm: avatarRig.bones.leftArm,
        rightArm: avatarRig.bones.rightArm,
        avatarRig
    };
}
