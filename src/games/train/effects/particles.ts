import * as THREE from 'three';
import { SmokeParticle, TrainDef } from '../types';

let smokeParticles: SmokeParticle[] = [];

export function emitSmokePuff(
    scene: THREE.Scene,
    locomotiveGroup: THREE.Group | null,
    activeTrain: TrainDef,
    isHornBurst: boolean = false
) {
    if (!locomotiveGroup || !scene) return;

    const isPlasma = activeTrain.style === 'hyperloop_plasma' || activeTrain.style === 'cyber_bullet';
    const smokeGeo = new THREE.DodecahedronGeometry(isHornBurst ? 0.9 : 0.5);
    const smokeMat = new THREE.MeshStandardMaterial({
        color: isPlasma ? 0xd946ef : 0xeeeeee,
        emissive: isPlasma ? 0xd946ef : 0x000000,
        emissiveIntensity: isPlasma ? 0.8 : 0.0,
        transparent: true,
        opacity: isHornBurst ? 0.85 : 0.6,
        roughness: 1.0,
        flatShading: true
    });

    const mesh = new THREE.Mesh(smokeGeo, smokeMat);
    const stackWorld = new THREE.Vector3(0, 4.8, 2.8);
    locomotiveGroup.localToWorld(stackWorld);
    mesh.position.copy(stackWorld);

    const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        2.5 + Math.random() * 2.0 + (isHornBurst ? 3.0 : 0),
        (Math.random() - 0.5) * 1.5
    );

    smokeParticles.push({
        mesh,
        life: 0,
        maxLife: isHornBurst ? 2.5 : 1.8,
        vel
    });
    scene.add(mesh);
}

export function updateParticles(scene: THREE.Scene, delta: number) {
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.life += delta;
        p.mesh.position.addScaledVector(p.vel, delta);
        const scale = 1.0 + (p.life / p.maxLife) * 3.5;
        p.mesh.scale.set(scale, scale, scale);
        (p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            smokeParticles.splice(i, 1);
        }
    }
}

export function clearParticles(scene: THREE.Scene) {
    smokeParticles.forEach(p => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
    });
    smokeParticles = [];
}
