import * as THREE from 'three';

export function createUltraGrass(scene: THREE.Scene) {
    const groundGeo = new THREE.PlaneGeometry(300, 300, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1b4d24,
        roughness: 0.85,
        metalness: 0.1
    });
    const grassPlane = new THREE.Mesh(groundGeo, groundMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.receiveShadow = true;
    scene.add(grassPlane);

    // Blades
    const bladeCount = 12000;
    const bladeGeo = new THREE.ConeGeometry(0.12, 1.2, 4);
    bladeGeo.translate(0, 0.6, 0);

    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x38ef7d,
        roughness: 0.6
    });

    const grassBlades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < bladeCount; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;
        const scaleY = 0.6 + Math.random() * 0.8;
        const rotY = Math.random() * Math.PI * 2;
        const rotX = (Math.random() - 0.5) * 0.3;

        dummy.position.set(x, 0, z);
        dummy.scale.set(0.8, scaleY, 0.8);
        dummy.rotation.set(rotX, rotY, 0);
        dummy.updateMatrix();

        grassBlades.setMatrixAt(i, dummy.matrix);
    }

    grassBlades.instanceMatrix.needsUpdate = true;
    grassBlades.receiveShadow = true;
    scene.add(grassBlades);
}

export function createUltraOcean(scene: THREE.Scene, seaConfig: any): { oceanWaterMesh: THREE.Mesh; activeSeaConfig: any } {
    scene.background = new THREE.Color(0x74b9ff);
    scene.fog = new THREE.FogExp2(0x74b9ff, 0.005);

    // 1. Animated Sparkling Ocean Water Plane
    const geo = new THREE.PlaneGeometry(380, 380, 72, 72);
    const mat = new THREE.MeshStandardMaterial({
        color: seaConfig.waterColor || 0x0984e3,
        roughness: 0.1,
        metalness: 0.25,
        transparent: true,
        opacity: 0.88,
        flatShading: true
    });
    const oceanWaterMesh = new THREE.Mesh(geo, mat);
    oceanWaterMesh.rotation.x = -Math.PI / 2;
    oceanWaterMesh.position.set(0, seaConfig.waterLevel || 0, 0);
    oceanWaterMesh.userData.basePos = new Float32Array(geo.attributes.position.array);
    oceanWaterMesh.receiveShadow = true;
    scene.add(oceanWaterMesh);

    // 2. Sandy Ocean Seabed Floor
    const floorGeo = new THREE.PlaneGeometry(420, 420, 16, 16);
    const oceanSeabedMesh = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x1b2838, roughness: 0.95 }));
    oceanSeabedMesh.rotation.x = -Math.PI / 2;
    oceanSeabedMesh.position.set(0, -11.5, 0);
    scene.add(oceanSeabedMesh);

    return { oceanWaterMesh, activeSeaConfig: seaConfig };
}

export function updateOceanAnimation(oceanWaterMesh: THREE.Mesh | null, activeSeaConfig: any, time: number) {
    if (!oceanWaterMesh || !activeSeaConfig) return;
    const pArr = oceanWaterMesh.geometry.attributes.position.array as Float32Array;
    const bArr = oceanWaterMesh.userData.basePos as Float32Array;
    const wSpeed = activeSeaConfig.waveSpeed || 2.0;
    const wHeight = activeSeaConfig.waveHeight || 0.22;

    for (let i = 0; i < pArr.length; i += 3) {
        const bx = bArr[i];
        const by = bArr[i + 1];
        pArr[i + 2] = Math.sin(bx * 0.5 + time * wSpeed) * wHeight + Math.cos(by * 0.4 + time * wSpeed * 0.8) * wHeight;
    }
    oceanWaterMesh.geometry.attributes.position.needsUpdate = true;
}
