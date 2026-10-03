import * as THREE from 'three';
import { buildSceneObjectMesh } from '../../../shared/sceneObjectBuilder';
import { PlayState } from '../state/playState';

export function buildSceneFromData(sceneData: any, state: PlayState, scene: THREE.Scene) {
    if (!sceneData || !Array.isArray(sceneData.objects)) return;

    if (typeof sceneData.playerMaxHealth === 'number') {
        state.playerMaxHealth = sceneData.playerMaxHealth;
        state.playerHealth = state.playerMaxHealth;
    }

    sceneData.objects.forEach((obj: any) => {
        const group = buildSceneObjectMesh(obj);
        group.userData = { ...group.userData, ...obj };

        // Position at spawn point
        if (obj.isSpawnPoint || obj.category === 'spawn' || (obj.catalogId && obj.catalogId.startsWith('spawn_'))) {
            state.spawnPointPosition.set(obj.position?.x || 0, (obj.position?.y || 0) + 0.1, obj.position?.z || 0);
            if (state.humanCharacter) {
                state.humanCharacter.position.copy(state.spawnPointPosition);
            }
            if (obj.rotation?.y) {
                state.characterYaw = obj.rotation.y;
                if (state.humanCharacter) {
                    state.humanCharacter.rotation.y = obj.rotation.y;
                }
            }
        }

        // Equip starter holdable item in hand
        if ((obj.isHoldable || obj.customModelData?.isHoldable) && (obj.inHandAtStart || obj.customModelData?.inHandAtStart)) {
            state.equipPlayItemInHand(obj);
            group.visible = false;
            group.userData.isCollected = true;
        }

        // Passable objects allow player to walk right through
        const name = (obj.name || '').toLowerCase();
        const isCollectible = obj.gameItemType === 'coin' || obj.gameItemType === 'key' || obj.gameItemType === 'potion' || /(coin|münt|potion|key|võti)/i.test(name) || obj.isHoldable;
        group.userData.isPassable = (obj.isPassable === true) || isCollectible || obj.isSpawnPoint;
        state.sceneObjects.push(group);

        scene.add(group);
    });

    state.updatePlayHUD();
}
