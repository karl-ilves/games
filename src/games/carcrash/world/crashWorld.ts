import * as THREE from 'three';
import { CrashObstacle } from '../types';

export interface CrashWorldBundle {
    scene: THREE.Scene;
    obstacles: CrashObstacle[];
    updateObstacles: (deltaTime: number) => void;
}

export function buildCrashWorld(scene: THREE.Scene): CrashWorldBundle {
    // 1. Lighting (Realistic Sunlight & Shadows)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.75);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    dirLight.position.set(120, 200, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 600;
    dirLight.shadow.camera.left = -180;
    dirLight.shadow.camera.right = 180;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -180;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // 2. High-Friction Asphalt Proving Ground Arena
    const floorSize = 1000;
    const groundGeo = new THREE.PlaneGeometry(floorSize, floorSize, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1e2430,
        roughness: 0.88,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid markings / test tracks
    const gridHelper = new THREE.GridHelper(floorSize, 100, 0xff4757, 0x334155);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // Perimeter Safety Barriers
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.3 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.4 });
    const wallHeight = 4.0;
    const wallThick = 2.0;

    const obstacles: CrashObstacle[] = [];

    // Helper to register obstacle
    const addObstacle = (mesh: THREE.Object3D, id: string, name: string, type: CrashObstacle['type'], dmgFactor: number) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        const box = new THREE.Box3().setFromObject(mesh);
        obstacles.push({
            id,
            name,
            type,
            position: mesh.position,
            rotation: mesh.rotation,
            mesh,
            boundingBox: box,
            damageFactor: dmgFactor
        });
    };

    // 1. Reinforced Concrete Crash Barrier (Main Head-On Target at Z = 120)
    const wallGeo = new THREE.BoxGeometry(40, 8, 4);
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.95 });
    const crashWall = new THREE.Mesh(wallGeo, concreteMat);
    crashWall.position.set(0, 4, 120);

    // Yellow/Black caution chevron stripes
    const chevronGeo = new THREE.BoxGeometry(40.2, 2.5, 4.1);
    const chevronMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
    const chevron = new THREE.Mesh(chevronGeo, chevronMat);
    crashWall.add(chevron);
    addObstacle(crashWall, 'concrete_headon_wall', 'Betoonist Avariisein', 'wall', 1.6);

    // 2. Giant Launch Ramp (At Z = -80)
    const rampWidth = 24;
    const rampLength = 50;
    const rampHeight = 12;
    const rampShape = new THREE.Shape();
    rampShape.moveTo(0, 0);
    rampShape.lineTo(rampLength, 0);
    rampShape.lineTo(rampLength, rampHeight);
    rampShape.closePath();
    const rampGeo = new THREE.ExtrudeGeometry(rampShape, { depth: rampWidth, bevelEnabled: false });
    rampGeo.translate(-rampLength / 2, 0, -rampWidth / 2);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.5, metalness: 0.4 });
    const launchRamp = new THREE.Mesh(rampGeo, rampMat);
    launchRamp.position.set(0, 0, -140);
    launchRamp.rotation.y = Math.PI / 2;
    addObstacle(launchRamp, 'mega_launch_ramp', 'Hiiglaslik Hüppemägi', 'ramp', 0.8);

    // 3. Steel Crush Rollers / Hydraulic Hammer (At X = 70, Z = 0)
    const crusherGroup = new THREE.Group();
    crusherGroup.position.set(70, 0, 0);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8 });
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14, 16), pillarMat);
    pillarL.position.set(-8, 7, 0);
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14, 16), pillarMat);
    pillarR.position.set(8, 7, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(18, 2, 3), pillarMat);
    beam.position.set(0, 13, 0);

    // Moving heavy steel roller
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0xff3838, roughness: 0.3, metalness: 0.85 });
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 14, 24), rollerMat);
    roller.rotation.z = Math.PI / 2;
    roller.position.set(0, 3.5, 0);
    crusherGroup.add(pillarL, pillarR, beam, roller);
    addObstacle(crusherGroup, 'crush_roller', 'Terasest Purustusrull', 'crusher', 2.0);

    // 4. Slalom Concrete Bollards & Pillars (At X = -70, Z = 0)
    for (let row = -3; row <= 3; row++) {
        const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, 5, 16);
        const bollard = new THREE.Mesh(pillarGeo, concreteMat);
        bollard.position.set(-70 + (row % 2) * 6, 2.5, row * 14);
        addObstacle(bollard, `bollard_${row}`, 'Betoonpost', 'pillars', 1.3);
    }

    // 5. Metal Spike Strip & Speed Bumps
    const bumpMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.4 });
    for (let b = 1; b <= 5; b++) {
        const bump = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 30, 12), bumpMat);
        bump.rotation.z = Math.PI / 2;
        bump.position.set(0, 0.2, 30 + b * 10);
        addObstacle(bump, `speed_bump_${b}`, 'Lainelised Kiirustõkked', 'ramp', 0.4);
    }

    // Dynamic obstacle animations (crusher spin & movement)
    let crusherTime = 0;
    const updateObstacles = (dt: number) => {
        crusherTime += dt;
        roller.rotation.x += dt * 3.5;
        // Periodic vertical pulsing hammer motion
        roller.position.y = 3.5 + Math.abs(Math.sin(crusherTime * 2.0)) * 4.0;
        // Keep bounding boxes updated
        for (const obs of obstacles) {
            obs.boundingBox.setFromObject(obs.mesh);
        }
    };

    return {
        scene,
        obstacles,
        updateObstacles
    };
}
