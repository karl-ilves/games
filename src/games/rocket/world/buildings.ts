import * as THREE from 'three';
import { BuildingConfig, DestructibleBuilding } from '../types';

export function setupDestructibleBuildings(scene: THREE.Scene, configs: BuildingConfig[]): DestructibleBuilding[] {
    const targets: DestructibleBuilding[] = [];

    configs.forEach(cfg => {
        const group = new THREE.Group();
        group.position.set(cfg.pos.x, 0, cfg.pos.z);

        const bodyGeo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            roughness: 0.65,
            metalness: 0.35
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = cfg.h / 2;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        // Glowing Windows
        const windowCols = Math.floor(cfg.w / 4);
        const windowRows = Math.floor(cfg.h / 4);
        const winMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });

        for (let r = 1; r < windowRows; r++) {
            for (let c = 0; c < windowCols; c++) {
                const winMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), winMat);
                const wx = -cfg.w / 2 + 2.5 + c * 4;
                const wy = r * 4;
                winMesh.position.set(wx, wy, cfg.d / 2 + 0.05);
                group.add(winMesh);

                const winBack = winMesh.clone();
                winBack.position.set(wx, wy, -cfg.d / 2 - 0.05);
                winBack.rotation.y = Math.PI;
                group.add(winBack);
            }
        }

        // Glowing Rooftop Trim
        const roofGeo = new THREE.BoxGeometry(cfg.w + 0.6, 0.8, cfg.d + 0.6);
        const roofMat = new THREE.MeshBasicMaterial({ color: cfg.roofColor });
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.y = cfg.h + 0.4;
        group.add(roofMesh);

        scene.add(group);

        targets.push({
            id: cfg.id,
            name: cfg.name,
            group,
            mesh: bodyMesh,
            type: 'building',
            basePoints: cfg.pts,
            position: cfg.pos.clone().setY(cfg.h / 2),
            size: { w: cfg.w, h: cfg.h, d: cfg.d },
            color: cfg.color,
            active: true,
            respawnTimer: 0,
            hp: cfg.hp,
            maxHp: cfg.hp,
            isBurning: false
        });
    });

    return targets;
}

export function igniteBuilding(building: DestructibleBuilding) {
    if (building.isBurning) return;
    building.isBurning = true;

    // Scorch building exterior
    (building.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x1a1512);

    // Dynamic flickering fire light
    const fLight = new THREE.PointLight(0xff5500, 6.0, building.size.w * 2.5);
    fLight.position.set(0, building.size.h * 0.6, 0);
    building.group.add(fLight);
    building.fireLight = fLight;

    // Fire group for flame tongues
    const fGroup = new THREE.Group();
    const flameCount = 18;
    const flameGeo = new THREE.ConeGeometry(1.2, 4.5, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3b00, transparent: true, opacity: 0.9 });

    for (let i = 0; i < flameCount; i++) {
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(
            (Math.random() - 0.5) * (building.size.w * 0.8),
            building.size.h + Math.random() * 1.5,
            (Math.random() - 0.5) * (building.size.d * 0.8)
        );
        flame.rotation.z = (Math.random() - 0.5) * 0.3;
        fGroup.add(flame);
    }
    building.group.add(fGroup);
    building.fireParticles = fGroup;
}

export function spawnBuildingRubble(
    scene: THREE.Scene,
    building: DestructibleBuilding,
    createSmokePuff: (pos: THREE.Vector3, color: number) => void
) {
    const rubbleGeo = new THREE.BoxGeometry(building.size.w * 0.95, 1.4, building.size.d * 0.95);
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.95 });
    const rubble = new THREE.Mesh(rubbleGeo, rubbleMat);
    rubble.position.set(building.position.x, 0.7, building.position.z);
    scene.add(rubble);
    building.rubbleMesh = rubble;

    // Burning embers on the rubble foundation
    const emberLight = new THREE.PointLight(0xff4400, 4.0, building.size.w * 1.5);
    emberLight.position.set(building.position.x, 2.0, building.position.z);
    scene.add(emberLight);

    // Continuous black smoke rising from ruins
    for (let p = 0; p < 8; p++) {
        setTimeout(() => {
            if (!building.active) {
                const smokePos = building.position.clone().setY(2.2);
                smokePos.x += (Math.random() - 0.5) * (building.size.w * 0.7);
                smokePos.z += (Math.random() - 0.5) * (building.size.d * 0.7);
                createSmokePuff(smokePos, 0x181820);
            }
        }, p * 350);
    }

    setTimeout(() => {
        scene.remove(emberLight);
        emberLight.dispose();
    }, 8000);
}

export function resetBuildings(targets: DestructibleBuilding[], scene: THREE.Scene) {
    targets.forEach(b => {
        b.active = true;
        b.hp = b.maxHp;
        b.isBurning = false;
        b.group.visible = true;
        b.respawnTimer = 0;
        (b.mesh.material as THREE.MeshStandardMaterial).color.setHex(b.color);

        if (b.fireLight) {
            b.group.remove(b.fireLight);
            b.fireLight.dispose();
            b.fireLight = undefined;
        }
        if (b.fireParticles) {
            b.group.remove(b.fireParticles);
            b.fireParticles = undefined;
        }
        if (b.rubbleMesh) {
            scene.remove(b.rubbleMesh);
            b.rubbleMesh.geometry.dispose();
            (b.rubbleMesh.material as THREE.Material).dispose();
            b.rubbleMesh = undefined;
        }
    });
}

export function updateBuildings(
    dt: number,
    time: number,
    targets: DestructibleBuilding[],
    scene: THREE.Scene,
    createSmokePuff: (pos: THREE.Vector3, color: number) => void
) {
    for (const building of targets) {
        // Animate building flames if burning
        if (building.isBurning && building.active && building.fireParticles) {
            building.fireParticles.children.forEach((flame, idx) => {
                const scaleY = 1.0 + Math.sin(time * 12 + idx) * 0.35;
                flame.scale.set(1.0, scaleY, 1.0);
            });
            if (building.fireLight) {
                building.fireLight.intensity = 5.0 + Math.sin(time * 15) * 1.5;
            }
            // Periodic smoke rising from burning roof
            if (Math.random() < 0.25) {
                const sPos = building.position.clone();
                sPos.y = building.size.h + 2.0;
                sPos.x += (Math.random() - 0.5) * (building.size.w * 0.7);
                sPos.z += (Math.random() - 0.5) * (building.size.d * 0.7);
                createSmokePuff(sPos, 0x14161c);
            }
        }

        if (!building.active) {
            building.respawnTimer -= dt;
            if (building.respawnTimer <= 0) {
                building.active = true;
                building.hp = building.maxHp;
                building.isBurning = false;
                building.group.visible = true;
                (building.mesh.material as THREE.MeshStandardMaterial).color.setHex(building.color);

                if (building.fireLight) {
                    building.group.remove(building.fireLight);
                    building.fireLight.dispose();
                    building.fireLight = undefined;
                }
                if (building.fireParticles) {
                    building.group.remove(building.fireParticles);
                    building.fireParticles = undefined;
                }
                if (building.rubbleMesh) {
                    scene.remove(building.rubbleMesh);
                    building.rubbleMesh.geometry.dispose();
                    (building.rubbleMesh.material as THREE.Material).dispose();
                    building.rubbleMesh = undefined;
                }
            }
        }
    }
}
