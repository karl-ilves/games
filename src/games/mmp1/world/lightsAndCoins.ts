import * as THREE from 'three';
import { MAP_CATALOG } from '../catalog';
import { MapId, CoinItem } from '../types';

export function setupLights(scene: THREE.Scene): { muzzleFlashLight: THREE.PointLight } {
    scene.add(new THREE.AmbientLight(0xfff5ea, 0.55));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.position.set(25, 45, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    scene.add(new THREE.DirectionalLight(0x7090b0, 0.35));
    const muzzleFlashLight = new THREE.PointLight(0xffaa22, 0, 25);
    scene.add(muzzleFlashLight);
    return { muzzleFlashLight };
}

export function spawnMapCoins(scene: THREE.Scene, mapId: MapId, coins: CoinItem[]) {
    coins.forEach(c => scene.remove(c.mesh));
    coins.length = 0;
    const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2, emissive: 0x443300 });
    const positions = (MAP_CATALOG[mapId] || MAP_CATALOG["hotel2"]).coinSpawns;
    positions.forEach(([x, y, z]) => {
        const mesh = new THREE.Mesh(coinGeo, coinMat);
        mesh.rotation.x = Math.PI / 2;
        const group = new THREE.Group();
        group.add(mesh);
        group.position.set(x, y, z);
        scene.add(group);
        coins.push({ mesh: group, position: new THREE.Vector3(x, y, z), collected: false });
    });
}
