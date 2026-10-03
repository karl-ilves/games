import { grassPlane, grassBlades } from '../state/creatorState';
import { saveUndoSnapshot } from '../systems/undoRedo';
import { autoSaveDraft } from '../ui/creatorUI';
import { createSpeedboat3DMesh } from '../models/objectModels';
import { csState } from "../state/creatorState";
import * as THREE from 'three';
import { SeaConfig, PlacedObject, CatalogItem } from '../types';
import {
    scene,
    placedObjects,
    dirLight,
    hemiLight,
    currentEnvMode,
    setCurrentEnvMode,
    activeSeaConfig,
    setActiveSeaConfig,
    oceanWaterMesh,
    setOceanWaterMesh,
    oceanSeabedMesh,
    setOceanSeabedMesh,
    beachSandMesh,
    setBeachSandMesh
} from '../state/creatorState';
import { spawnObjectIntoScene } from '../ui/creatorUI';

export function removeSea() {
    if (oceanWaterMesh) {
        scene.remove(oceanWaterMesh);
        oceanWaterMesh.geometry.dispose();
        if (Array.isArray(oceanWaterMesh.material)) {
            oceanWaterMesh.material.forEach(m => m.dispose());
        } else {
            oceanWaterMesh.material.dispose();
        }
        csState.oceanWaterMesh = null;
    }
    if (oceanSeabedMesh) {
        scene.remove(oceanSeabedMesh);
        oceanSeabedMesh.geometry.dispose();
        if (Array.isArray(oceanSeabedMesh.material)) {
            oceanSeabedMesh.material.forEach(m => m.dispose());
        } else {
            oceanSeabedMesh.material.dispose();
        }
        csState.oceanSeabedMesh = null;
    }
    if (beachSandMesh) {
        scene.remove(beachSandMesh);
        beachSandMesh.geometry.dispose();
        if (Array.isArray(beachSandMesh.material)) {
            beachSandMesh.material.forEach(m => m.dispose());
        } else {
            beachSandMesh.material.dispose();
        }
        csState.beachSandMesh = null;
    }
    csState.activeSeaConfig = null;
    if (grassPlane) grassPlane.visible = true;
    if (grassBlades) grassBlades.visible = true;
    if (currentEnvMode === 'day') {
        scene.background = new THREE.Color(0x87ceeb);
    }
    updateMapEnvironmentUI();
}

export function setMapEnvironment(type: 'land' | 'sea') {
    if (type === 'sea') {
        createWholeMapOcean(false);
    } else {
        removeSea();
    }
    updateMapEnvironmentUI();
    saveUndoSnapshot();
    autoSaveDraft();
}

export function getMapEnvironment(): 'land' | 'sea' {
    return activeSeaConfig ? 'sea' : 'land';
}

export function updateMapEnvironmentUI() {
    const isSea = !!activeSeaConfig;
    const btnLand = document.getElementById('btn-env-land');
    const btnSea = document.getElementById('btn-env-sea');
    if (btnLand && btnSea) {
        if (isSea) {
            btnSea.className = 'btn-studio active-map-env-sea';
            btnSea.style.background = 'linear-gradient(135deg, #0984e3, #00cec9)';
            btnSea.style.color = '#fff';
            btnSea.style.borderColor = '#00f2fe';
            btnSea.style.boxShadow = '0 0 12px rgba(0, 242, 254, 0.5)';

            btnLand.className = 'btn-studio';
            btnLand.style.background = 'rgba(255, 255, 255, 0.08)';
            btnLand.style.color = '#94a3b8';
            btnLand.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            btnLand.style.boxShadow = 'none';
        } else {
            btnLand.className = 'btn-studio active-map-env';
            btnLand.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
            btnLand.style.color = '#fff';
            btnLand.style.borderColor = '#2ecc71';
            btnLand.style.boxShadow = '0 0 10px rgba(46, 204, 113, 0.4)';

            btnSea.className = 'btn-studio';
            btnSea.style.background = 'rgba(255, 255, 255, 0.08)';
            btnSea.style.color = '#74b9ff';
            btnSea.style.borderColor = 'rgba(0, 242, 254, 0.25)';
            btnSea.style.boxShadow = 'none';
        }
    }
}

export function isPositionInWater(x: number, z: number): boolean {
    if (!activeSeaConfig) return false;
    if (activeSeaConfig.type === 'whole') {
        return true;
    }
    if (activeSeaConfig.type === 'part') {
        const b = activeSeaConfig.boundary;
        if (!b) return z < 0;
        const val = b.axis === 'x' ? x : z;
        return b.side === 'negative' ? (val < b.threshold) : (val > b.threshold);
    }
    if (activeSeaConfig.type === 'island') {
        const dist = Math.sqrt(x * x + z * z);
        return dist > 34;
    }
    return false;
}

export function createWholeMapOcean(spawnEntities = false) {
    removeSea();
    csState.activeSeaConfig = {
        type: 'whole',
        waterLevel: 0,
        waterColor: 0x0984e3,
        waveSpeed: 2.2,
        waveHeight: 0.25
    };

    if (currentEnvMode === 'day') {
        scene.background = new THREE.Color(0x74b9ff);
    }

    // 1. Animated Sparkling Ocean Water Plane
    const geo = new THREE.PlaneGeometry(380, 380, 72, 72);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x0984e3,
        roughness: 0.1,
        metalness: 0.25,
        transparent: true,
        opacity: 0.88,
        flatShading: true
    });
    csState.oceanWaterMesh = new THREE.Mesh(geo, mat);
    oceanWaterMesh.rotation.x = -Math.PI / 2;
    oceanWaterMesh.position.set(0, 0, 0);
    oceanWaterMesh.userData.basePos = new Float32Array(geo.attributes.position.array);
    oceanWaterMesh.receiveShadow = true;
    scene.add(oceanWaterMesh);

    // 2. Sandy Ocean Seabed Floor
    const floorGeo = new THREE.PlaneGeometry(420, 420, 16, 16);
    csState.oceanSeabedMesh = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x1b2838, roughness: 0.95 }));
    oceanSeabedMesh.rotation.x = -Math.PI / 2;
    oceanSeabedMesh.position.set(0, -11.5, 0);
    scene.add(oceanSeabedMesh);

    // Hide grass so it doesn't protrude into deep ocean
    if (grassPlane) grassPlane.visible = false;
    if (grassBlades) grassBlades.visible = false;

    updateMapEnvironmentUI();
}

export function createPartMapOcean(axis: 'x' | 'z' = 'z', side: 'negative' | 'positive' = 'negative', spawnEntities = true) {
    removeSea();
    csState.activeSeaConfig = {
        type: 'part',
        boundary: { axis, side, threshold: 0 },
        waterLevel: 0,
        waterColor: 0x0099dd,
        waveSpeed: 2.0,
        waveHeight: 0.22
    };

    // 1. Ocean Water Plane covering the sea half (e.g. z < 0)
    const isZNegative = (axis === 'z' && side === 'negative');
    const width = 380;
    const depth = 190;
    const geo = new THREE.PlaneGeometry(width, depth, 72, 36);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x0099dd,
        roughness: 0.12,
        metalness: 0.2,
        transparent: true,
        opacity: 0.88,
        flatShading: true
    });
    csState.oceanWaterMesh = new THREE.Mesh(geo, mat);
    oceanWaterMesh.rotation.x = -Math.PI / 2;
    oceanWaterMesh.position.set(0, 0, isZNegative ? -95 : 95);
    oceanWaterMesh.userData.basePos = new Float32Array(geo.attributes.position.array);
    oceanWaterMesh.receiveShadow = true;
    scene.add(oceanWaterMesh);

    // 2. Underwater Seabed Floor
    const floorGeo = new THREE.PlaneGeometry(width, depth, 16, 16);
    csState.oceanSeabedMesh = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x22313f, roughness: 0.95 }));
    oceanSeabedMesh.rotation.x = -Math.PI / 2;
    oceanSeabedMesh.position.set(0, -11.5, isZNegative ? -95 : 95);
    scene.add(oceanSeabedMesh);

    // 3. Golden Sandy Beach Coastline Strip along the boundary
    const sandGeo = new THREE.PlaneGeometry(380, 22);
    csState.beachSandMesh = new THREE.Mesh(sandGeo, new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.95 }));
    beachSandMesh.rotation.x = -Math.PI / 2;
    beachSandMesh.position.set(0, 0.03, isZNegative ? 8 : -8);
    beachSandMesh.receiveShadow = true;
    scene.add(beachSandMesh);

    if (grassPlane) grassPlane.visible = true;

    if (spawnEntities) {
        // Wooden Pier extending from Beach into the Sea
        const pierGroup = new THREE.Group();
        const pierPlank = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 24), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 }));
        pierPlank.position.set(0, 0.2, -8);
        pierGroup.add(pierPlank);

        // Support Pilings
        [-1.6, 1.6].forEach(px => {
            [-18, -12, -6, 0].forEach(pz => {
                const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.5, 8), new THREE.MeshStandardMaterial({ color: 0x535c68, roughness: 0.9 }));
                pile.position.set(px, -1.2, pz);
                pierGroup.add(pile);
            });
        });

        // Mooring Post
        const cleat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xff4757 }));
        cleat.position.set(1.6, 0.6, -18);
        pierGroup.add(cleat);

        pierGroup.position.set(0, 0, 0);
        scene.add(pierGroup);

        placedObjects.push({
            id: 'placed_beach_pier_' + Date.now(),
            mesh: pierGroup,
            catalogId: 'pier_wood',
            name: '⚓ Puidust Paadisild / Wooden Dock',
            category: 'city',
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#8b5a2b'
        });

        // Drivable Speedboat docked at the end of the pier
        const boatMesh = createSpeedboat3DMesh('#0984e3');
        boatMesh.position.set(3.8, 0.05, -14);
        scene.add(boatMesh);

        placedObjects.push({
            id: 'placed_coastal_boat_' + Date.now(),
            mesh: boatMesh,
            catalogId: 'boat_speedboat',
            name: '🛥️ Kiirpaat / Speedboat',
            category: 'vehicles',
            isBoat: true,
            position: { x: 3.8, y: 0.05, z: -14 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#0984e3'
        });

        // Tropical Palm Trees along the Sandy Beach
        const palmPositions = [
            { x: -18, z: 8 },
            { x: 22, z: 9 },
            { x: -45, z: 7 },
            { x: 50, z: 8 }
        ];

        palmPositions.forEach((pos, idx) => {
            const palmGroup = new THREE.Group();
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.9 });
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6 });

            // Curved trunk
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 5.5, 8), trunkMat);
            trunk.position.y = 2.6;
            trunk.rotation.z = (idx % 2 === 0 ? 0.12 : -0.12);
            palmGroup.add(trunk);

            // Palm fronds canopy
            for (let f = 0; f < 6; f++) {
                const frond = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.0, 4), leafMat);
                frond.position.set(0, 5.3, 0);
                frond.rotation.z = Math.PI / 3;
                frond.rotation.y = (f * Math.PI) / 3;
                palmGroup.add(frond);
            }

            palmGroup.position.set(pos.x, 0, pos.z);
            scene.add(palmGroup);

            placedObjects.push({
                id: 'placed_palm_' + idx + '_' + Date.now(),
                mesh: palmGroup,
                catalogId: 'tree_palm',
                name: `🌴 Troopiline Palm #${idx + 1}`,
                category: 'nature',
                position: { x: pos.x, y: 0, z: pos.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#27ae60'
            });
        });

        // Beach Umbrella & Loungers on the sand
        const loungeGroup = new THREE.Group();
        const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xdcdde1 }));
        umbrellaPole.position.y = 1.6;
        loungeGroup.add(umbrellaPole);

        const umbrellaTop = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.5 }));
        umbrellaTop.position.y = 3.0;
        loungeGroup.add(umbrellaTop);

        const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 2.2), new THREE.MeshStandardMaterial({ color: 0x00d2d3 }));
        lounger.position.set(1.4, 0.15, 0.5);
        loungeGroup.add(lounger);

        loungeGroup.position.set(-8, 0, 7);
        scene.add(loungeGroup);

        placedObjects.push({
            id: 'placed_beach_umbrella_' + Date.now(),
            mesh: loungeGroup,
            catalogId: 'beach_set',
            name: '⛱️ Rannavari & Lamamistool',
            category: 'nature',
            position: { x: -8, y: 0, z: 7 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#ff4757'
        });
    }
    updateMapEnvironmentUI();
}

export function createIslandOcean(spawnEntities = true) {
    removeSea();
    csState.activeSeaConfig = {
        type: 'island',
        waterLevel: 0,
        waterColor: 0x0099dd,
        waveSpeed: 2.0,
        waveHeight: 0.22
    };

    // 1. Endless Sea
    const geo = new THREE.PlaneGeometry(380, 380, 72, 72);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x0984e3,
        roughness: 0.1,
        metalness: 0.25,
        transparent: true,
        opacity: 0.88,
        flatShading: true
    });
    csState.oceanWaterMesh = new THREE.Mesh(geo, mat);
    oceanWaterMesh.rotation.x = -Math.PI / 2;
    oceanWaterMesh.position.set(0, 0, 0);
    oceanWaterMesh.userData.basePos = new Float32Array(geo.attributes.position.array);
    oceanWaterMesh.receiveShadow = true;
    scene.add(oceanWaterMesh);

    // 2. Seabed Floor
    const floorGeo = new THREE.PlaneGeometry(420, 420, 16, 16);
    csState.oceanSeabedMesh = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x1b2838, roughness: 0.95 }));
    oceanSeabedMesh.rotation.x = -Math.PI / 2;
    oceanSeabedMesh.position.set(0, -11.5, 0);
    scene.add(oceanSeabedMesh);

    // 3. Central Circular Island (Radius 36m)
    const islandGeo = new THREE.CylinderGeometry(32, 38, 1.2, 32);
    csState.beachSandMesh = new THREE.Mesh(islandGeo, new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.9 }));
    beachSandMesh.position.set(0, 0.4, 0);
    beachSandMesh.receiveShadow = true;
    scene.add(beachSandMesh);

    if (grassPlane) grassPlane.visible = false;
    if (grassBlades) grassBlades.visible = false;

    if (spawnEntities) {
        // Island Wooden Pier at East perimeter
        const pierGroup = new THREE.Group();
        const pierPlank = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 3.6), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 }));
        pierPlank.position.set(38, 0.3, 0);
        pierGroup.add(pierPlank);
        pierGroup.position.set(0, 0, 0);
        scene.add(pierGroup);

        placedObjects.push({
            id: 'placed_island_pier_' + Date.now(),
            mesh: pierGroup,
            catalogId: 'pier_island',
            name: '⚓ Saare Paadisild / Island Pier',
            category: 'city',
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#8b5a2b'
        });

        // Speedboat
        const boatMesh = createSpeedboat3DMesh('#f39c12');
        boatMesh.position.set(48, 0.05, 3.5);
        scene.add(boatMesh);

        placedObjects.push({
            id: 'placed_island_boat_' + Date.now(),
            mesh: boatMesh,
            catalogId: 'boat_speedboat',
            name: '🛥️ Kiirpaat / Speedboat',
            category: 'vehicles',
            isBoat: true,
            position: { x: 48, y: 0.05, z: 3.5 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#f39c12'
        });

        // Palms around the island
        [
            { x: -12, z: -14 },
            { x: 14, z: 12 },
            { x: -15, z: 15 },
            { x: 10, z: -16 }
        ].forEach((pos, idx) => {
            const palmGroup = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 6, 8), new THREE.MeshStandardMaterial({ color: 0x795548 }));
            trunk.position.y = 3.0;
            palmGroup.add(trunk);
            for (let f = 0; f < 6; f++) {
                const frond = new THREE.Mesh(new THREE.ConeGeometry(1.3, 4.2, 4), new THREE.MeshStandardMaterial({ color: 0x27ae60 }));
                frond.position.set(0, 5.8, 0);
                frond.rotation.z = Math.PI / 3;
                frond.rotation.y = (f * Math.PI) / 3;
                palmGroup.add(frond);
            }
            palmGroup.position.set(pos.x, 0.8, pos.z);
            scene.add(palmGroup);

            placedObjects.push({
                id: 'placed_island_palm_' + idx,
                mesh: palmGroup,
                catalogId: 'tree_palm',
                name: `🌴 Saare Palm #${idx + 1}`,
                category: 'nature',
                position: { x: pos.x, y: 0.8, z: pos.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#27ae60'
            });
        });
    }
    updateMapEnvironmentUI();
}

export function setDayNightMode(mode: 'day' | 'night' | 'sunset' | 'horror_fog') {
    csState.currentEnvMode = mode;
    if (!scene) return;
    if (mode === 'night') {
        scene.background = new THREE.Color(0x0a0e17);
        scene.fog = new THREE.FogExp2(0x0a0e17, 0.015);
        if (hemiLight) hemiLight.color.setHex(0x1a2536);
        if (dirLight) {
            dirLight.color.setHex(0x34495e);
            dirLight.intensity = 0.4;
        }
    } else if (mode === 'horror_fog') {
        scene.background = new THREE.Color(0x05070a);
        scene.fog = new THREE.FogExp2(0x05070a, 0.04);
        if (hemiLight) hemiLight.color.setHex(0x0d131a);
        if (dirLight) {
            dirLight.color.setHex(0x1e272e);
            dirLight.intensity = 0.25;
        }
    } else if (mode === 'sunset') {
        scene.background = new THREE.Color(0x2c1b18);
        scene.fog = new THREE.FogExp2(0x2c1b18, 0.012);
        if (hemiLight) hemiLight.color.setHex(0xe67e22);
        if (dirLight) {
            dirLight.color.setHex(0xf39c12);
            dirLight.intensity = 1.0;
        }
    } else {
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);
        if (hemiLight) hemiLight.color.setHex(0xffffff);
        if (dirLight) {
            dirLight.color.setHex(0xfffaed);
            dirLight.intensity = 1.2;
        }
    }
}
export { activeSeaConfig, oceanWaterMesh, oceanSeabedMesh, beachSandMesh } from '../state/creatorState';
