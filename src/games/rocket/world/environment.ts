import * as THREE from 'three';

export function setupLighting(scene: THREE.Scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    sunLight.position.set(65, 150, 75);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -150;
    sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150;
    sunLight.shadow.camera.bottom = -150;
    scene.add(sunLight);

    // City glow lights
    const point1 = new THREE.PointLight(0x00f2fe, 3.5, 140);
    point1.position.set(-50, 35, -35);
    scene.add(point1);

    const point2 = new THREE.PointLight(0xff4757, 3.5, 140);
    point2.position.set(50, 35, 35);
    scene.add(point2);
}

export function buildCityGround(scene: THREE.Scene): THREE.Mesh {
    const groundSize = 340;
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x131929,
        roughness: 0.85,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Street grid
    const gridHelper = new THREE.GridHelper(groundSize, 68, 0x00f2fe, 0x1c2438);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // Boundary walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x161d31, roughness: 0.5 });
    const wallHeight = 16;
    const half = groundSize / 2;

    const makeWall = (w: number, d: number, x: number, z: number) => {
        const geo = new THREE.BoxGeometry(w, wallHeight, d);
        const m = new THREE.Mesh(geo, wallMat);
        m.position.set(x, wallHeight / 2, z);
        m.receiveShadow = true;
        scene.add(m);
    };
    makeWall(groundSize, 4, 0, -half);
    makeWall(groundSize, 4, 0, half);
    makeWall(4, groundSize, -half, 0);
    makeWall(4, groundSize, half, 0);

    return ground;
}
