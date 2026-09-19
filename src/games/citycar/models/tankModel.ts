import * as THREE from 'three';

export interface TankMeshContainer {
    group: THREE.Group;
    turret: THREE.Group;
    barrel: THREE.Mesh;
    updateTurretAim: (targetAngleY: number) => void;
}

export function createTankMesh(id = 'tank_1'): TankMeshContainer {
    const root = new THREE.Group();
    root.name = 'Tank_' + id;

    const armorMat = new THREE.MeshStandardMaterial({ color: 0x3b4d3c, roughness: 0.7, metalness: 0.2 });
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9, metalness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.4, metalness: 0.8 });

    // 1. Lower Hull
    const hullGeo = new THREE.BoxGeometry(3.0, 0.8, 5.0);
    const hull = new THREE.Mesh(hullGeo, armorMat);
    hull.position.y = 0.8;
    hull.castShadow = true;
    root.add(hull);

    // Front glacis slope
    const glacisGeo = new THREE.BoxGeometry(2.8, 0.5, 1.2);
    const glacis = new THREE.Mesh(glacisGeo, armorMat);
    glacis.position.set(0, 0.9, 2.5);
    glacis.rotation.x = -0.45;
    root.add(glacis);

    // 2. Dual Tracks / Treads
    [-1.65, 1.65].forEach(xPos => {
        const treadGeo = new THREE.BoxGeometry(0.7, 0.8, 5.4);
        const tread = new THREE.Mesh(treadGeo, treadMat);
        tread.position.set(xPos, 0.5, 0);
        tread.castShadow = true;
        root.add(tread);

        // Road wheels along tread
        for (let z = -2.0; z <= 2.0; z += 1.0) {
            const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.72, 10);
            wheelGeo.rotateZ(Math.PI / 2);
            const wheel = new THREE.Mesh(wheelGeo, metalMat);
            wheel.position.set(xPos, 0.45, z);
            root.add(wheel);
        }
    });

    // 3. Rotating Turret
    const turret = new THREE.Group();
    turret.position.set(0, 1.3, -0.2);

    const turretGeo = new THREE.BoxGeometry(2.1, 0.7, 2.6);
    const turretMesh = new THREE.Mesh(turretGeo, armorMat);
    turretMesh.position.y = 0.35;
    turretMesh.castShadow = true;
    turret.add(turretMesh);

    // Commander Cupola
    const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 8), metalMat);
    cupola.position.set(-0.45, 0.8, 0.2);
    turret.add(cupola);

    // Main Gun Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.14, 0.16, 4.2, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, metalMat);
    barrel.position.set(0, 0.35, 2.8);
    barrel.castShadow = true;
    turret.add(barrel);

    // Muzzle Brake
    const muzzleGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, metalMat);
    muzzle.position.set(0, 0.35, 4.9);
    turret.add(muzzle);

    root.add(turret);

    return {
        group: root,
        turret,
        barrel,
        updateTurretAim: (targetAngleY: number) => {
            turret.rotation.y = THREE.MathUtils.damp(turret.rotation.y, targetAngleY, 4.0, 0.016);
        }
    };
}

export function createRocketMesh(): THREE.Group {
    const rocket = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.2 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa502 });

    // Rocket Body
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    rocket.add(body);

    // Nose Cone
    const coneGeo = new THREE.ConeGeometry(0.13, 0.45, 8);
    coneGeo.rotateX(Math.PI / 2);
    const cone = new THREE.Mesh(coneGeo, tipMat);
    cone.position.z = 0.85;
    rocket.add(cone);

    // Stabilizer Fins
    const finGeo = new THREE.BoxGeometry(0.5, 0.5, 0.04);
    const fin1 = new THREE.Mesh(finGeo, tipMat);
    fin1.position.z = -0.55;
    const fin2 = new THREE.Mesh(finGeo, tipMat);
    fin2.position.z = -0.55;
    fin2.rotation.z = Math.PI / 2;
    rocket.add(fin1, fin2);

    // Rocket Thrust Flame
    const flameGeo = new THREE.ConeGeometry(0.18, 0.6, 6);
    flameGeo.rotateX(-Math.PI / 2);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.z = -0.95;
    rocket.add(flame);

    return rocket;
}
