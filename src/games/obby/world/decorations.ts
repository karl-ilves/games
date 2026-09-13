import * as THREE from 'three';

export function createSkyDecorations(scene: THREE.Scene) {
    const cloudGeo = new THREE.DodecahedronGeometry(8, 1);
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0x223046, transparent: true, opacity: 0.45 });
    for (let i = 0; i < 35; i++) {
        const cloud = new THREE.Mesh(cloudGeo, cloudMat);
        cloud.position.set(
            (Math.random() - 0.5) * 350,
            -30 + Math.random() * 40,
            -Math.random() * 500
        );
        cloud.scale.set(1.5 + Math.random() * 2, 0.8 + Math.random() * 0.8, 1.5 + Math.random() * 2);
        scene.add(cloud);
    }
}
