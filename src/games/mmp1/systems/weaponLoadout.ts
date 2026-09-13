import * as THREE from 'three';
import { Character } from '../types';
import { WEAPON_SKIN_CATALOG } from '../catalog';
import { MmpCrateManager } from '../state/crateManager';
import { createUltraRealisticKnife, createUltraRealisticRevolver } from '../models/weaponBuilder';
import { CrateShopUI } from '../ui/crateShopModal';

export function handleEquipSkin(
    skinId: string,
    playerChar: Character,
    crateManager: MmpCrateManager,
    crateShopUI: CrateShopUI,
    updateRoleHud: () => void
) {
    const skin = WEAPON_SKIN_CATALOG[skinId];
    if (!skin) return;

    crateManager.equipSkin(skinId);

    if (playerChar && playerChar.avatarRig && playerChar.avatarRig.bones.rightArm) {
        if (skin.type === "knife") {
            const wasVis = playerChar.knifeMesh ? playerChar.knifeMesh.visible : false;
            if (playerChar.knifeMesh) {
                playerChar.avatarRig.bones.rightArm.remove(playerChar.knifeMesh);
            }
            const newKnife = createUltraRealisticKnife(skinId, crateManager.getInventory()?.equippedKnife);
            newKnife.position.set(0.04, -0.92, 0.08);
            newKnife.rotation.set(-Math.PI * 0.45, 0, -Math.PI / 16);
            newKnife.visible = wasVis;
            playerChar.knifeMesh = newKnife;
            playerChar.avatarRig.bones.rightArm.add(newKnife);
        } else {
            const wasVis = playerChar.gunMesh ? playerChar.gunMesh.visible : false;
            if (playerChar.gunMesh) {
                playerChar.avatarRig.bones.rightArm.remove(playerChar.gunMesh);
            }
            const newGun = createUltraRealisticRevolver(false, skinId, crateManager.getInventory()?.equippedGun);
            newGun.position.set(0.02, -0.82, 0.12);
            newGun.rotation.set(0, 0, 0);
            newGun.visible = wasVis;
            playerChar.gunMesh = newGun;
            playerChar.avatarRig.bones.rightArm.add(newGun);
        }
    }

    updateRoleHud();
    crateShopUI.renderInventory();
}
