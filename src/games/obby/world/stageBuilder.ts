import * as THREE from 'three';
import { STAGES } from '../catalog';
import {
    DisappearingPlatform,
    MovingPlatform,
    RotatingHazard,
    CheckpointPad,
    CoinPickup
} from '../types';

export interface CourseData {
    platforms: THREE.Box3[];
    platformMeshes: THREE.Mesh[];
    bouncePads: { box: THREE.Box3; pos: THREE.Vector3 }[];
    hazards: { box: THREE.Box3; type: 'lava' | 'laser' }[];
    disappearingPlatforms: DisappearingPlatform[];
    movingPlatforms: MovingPlatform[];
    rotatingHazards: RotatingHazard[];
    checkpoints: CheckpointPad[];
    coinsList: CoinPickup[];
}

export function buildCourse(scene: THREE.Scene): CourseData {
    const platforms: THREE.Box3[] = [];
    const platformMeshes: THREE.Mesh[] = [];
    const bouncePads: { box: THREE.Box3; pos: THREE.Vector3 }[] = [];
    const hazards: { box: THREE.Box3; type: 'lava' | 'laser' }[] = [];
    const disappearingPlatforms: DisappearingPlatform[] = [];
    const movingPlatforms: MovingPlatform[] = [];
    const rotatingHazards: RotatingHazard[] = [];
    const checkpoints: CheckpointPad[] = [];
    const coinsList: CoinPickup[] = [];

    const createPlatform = (pos: THREE.Vector3, size: THREE.Vector3, colorHex: number) => {
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mat = new THREE.MeshLambertMaterial({ color: colorHex });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        platforms.push(box);
        platformMeshes.push(mesh);
        return mesh;
    };

    const createDisappearingPlatform = (pos: THREE.Vector3, size: THREE.Vector3, colorHex: number) => {
        const mesh = createPlatform(pos, size, colorHex);
        disappearingPlatforms.push({
            mesh,
            initialY: pos.y,
            state: 'idle',
            timer: 0
        });
    };

    const createMovingPlatform = (startPos: THREE.Vector3, endPos: THREE.Vector3, size: THREE.Vector3, speed: number, colorHex: number) => {
        const mesh = createPlatform(startPos.clone(), size, colorHex);
        movingPlatforms.push({
            mesh,
            startPos,
            endPos,
            speed,
            phase: Math.random() * Math.PI,
            delta: new THREE.Vector3()
        });
    };

    const createBouncePad = (pos: THREE.Vector3, size: THREE.Vector3) => {
        const mesh = createPlatform(pos, size, 0x2ed573);
        const indicatorGeo = new THREE.BoxGeometry(size.x * 0.7, 0.05, size.z * 0.7);
        const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const ind = new THREE.Mesh(indicatorGeo, indicatorMat);
        ind.position.y = size.y / 2 + 0.03;
        mesh.add(ind);

        const box = new THREE.Box3().setFromObject(mesh);
        bouncePads.push({ box, pos: pos.clone() });
    };

    const createHazard = (pos: THREE.Vector3, size: THREE.Vector3, type: 'lava' | 'laser') => {
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mat = new THREE.MeshBasicMaterial({ color: type === 'lava' ? 0xff4757 : 0xff3838 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        hazards.push({ box, type });
    };

    const createRotatingHazard = (pos: THREE.Vector3, radius: number, speed: number) => {
        const group = new THREE.Group();
        group.position.copy(pos);

        const hubGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.6, 16);
        const hubMat = new THREE.MeshLambertMaterial({ color: 0xff4757 });
        const hub = new THREE.Mesh(hubGeo, hubMat);
        group.add(hub);

        const barGeo = new THREE.BoxGeometry(radius * 2, 0.35, 0.35);
        const barMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
        const bar = new THREE.Mesh(barGeo, barMat);
        group.add(bar);

        scene.add(group);
        rotatingHazards.push({
            mesh: group,
            speed,
            type: 'spinner',
            pos: pos.clone(),
            radius
        });
    };

    const createSwingingHammer = (pos: THREE.Vector3, speed: number) => {
        const group = new THREE.Group();
        group.position.copy(pos);

        const pivotGeo = new THREE.SphereGeometry(0.5, 12, 12);
        const pivotMat = new THREE.MeshLambertMaterial({ color: 0x747d8c });
        const pivot = new THREE.Mesh(pivotGeo, pivotMat);
        group.add(pivot);

        const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.5, 8);
        const armMat = new THREE.MeshLambertMaterial({ color: 0x2f3542 });
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.y = -2.75;
        group.add(arm);

        const headGeo = new THREE.BoxGeometry(2.2, 1.3, 1.3);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xff4757 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = -5.5;
        group.add(head);

        scene.add(group);
        rotatingHazards.push({
            mesh: group,
            speed,
            type: 'hammer',
            pos: pos.clone(),
            hammerHead: head
        });
    };

    const createCheckpointPad = (pos: THREE.Vector3, index: number) => {
        const baseGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.25, 24);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(pos.x, pos.y - 0.9, pos.z);
        scene.add(base);

        const ringGeo = new THREE.TorusGeometry(1.6, 0.08, 12, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: index === 0 ? 0x2ed573 : 0xff4757 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.15;
        base.add(ring);

        const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8);
        const poleMat = new THREE.MeshLambertMaterial({ color: 0xd2dae2 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(-1.4, 1.3, 0);
        base.add(pole);

        const flagGeo = new THREE.BoxGeometry(0.8, 0.5, 0.04);
        const flagMat = new THREE.MeshLambertMaterial({ color: index === 0 ? 0x2ed573 : 0xff4757 });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0.4, 0.8, 0);
        pole.add(flag);

        checkpoints.push({
            index,
            mesh: base,
            ringMesh: ring,
            flagMesh: flag,
            pos: pos.clone(),
            activated: index === 0
        });
    };

    const createCoin = (pos: THREE.Vector3, value: number) => {
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16);
        const mat = new THREE.MeshLambertMaterial({ color: 0xffd32a });
        const coin = new THREE.Mesh(geo, mat);
        coin.position.copy(pos);
        coin.rotation.x = Math.PI / 2;
        scene.add(coin);
        coinsList.push({ mesh: coin, pos: pos.clone(), collected: false, value });
    };

    const createGiantTrophy = (pos: THREE.Vector3) => {
        const group = new THREE.Group();
        group.position.copy(pos);

        const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.8, 16);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        const cupGeo = new THREE.CylinderGeometry(1.4, 0.6, 2.2, 16);
        const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd32a });
        const cup = new THREE.Mesh(cupGeo, goldMat);
        cup.position.y = 1.8;
        scene.add(group);
    };

    // Build Checkpoint Pads for all 10 stages
    STAGES.forEach((stage, idx) => {
        createCheckpointPad(stage.spawnPos, idx);
    });

    // Stage 1: Algaja Hüpped / Stepping Stones
    createPlatform(new THREE.Vector3(0, 0, 0), new THREE.Vector3(8, 1, 8), 0x00f2fe);
    createPlatform(new THREE.Vector3(0, 0, -10), new THREE.Vector3(3.5, 1, 3.5), 0x4facfe);
    createPlatform(new THREE.Vector3(3, 0.5, -18), new THREE.Vector3(3, 1, 3), 0x00f2fe);
    createPlatform(new THREE.Vector3(-3, 1.0, -26), new THREE.Vector3(3, 1, 3), 0x4facfe);
    createPlatform(new THREE.Vector3(0, 1.5, -34), new THREE.Vector3(4, 1, 4), 0x00f2fe);
    createCoin(new THREE.Vector3(3, 2.5, -18), 10);
    createCoin(new THREE.Vector3(-3, 3.0, -26), 10);

    // Stage 2: Kaduvad Klotsid / Disappearing Tiles
    createPlatform(new THREE.Vector3(0, 0, -45), new THREE.Vector3(7, 1, 7), 0xffa502);
    for (let i = 0; i < 6; i++) {
        const posX = (i % 2 === 0 ? -2.2 : 2.2);
        const posZ = -54 - i * 5.2;
        const posY = 0 + i * 0.2;
        createDisappearingPlatform(new THREE.Vector3(posX, posY, posZ), new THREE.Vector3(3.2, 0.6, 3.2), 0xff6348);
        if (i === 2 || i === 4) createCoin(new THREE.Vector3(posX, posY + 1.8, posZ), 10);
    }

    // Stage 3: Liikuvad Platvormid / Moving Platforms
    createPlatform(new THREE.Vector3(0, 0, -90), new THREE.Vector3(7, 1, 7), 0x2ed573);
    createMovingPlatform(new THREE.Vector3(-4, 0, -100), new THREE.Vector3(4, 0, -100), new THREE.Vector3(4, 0.8, 4), 2.2, 0x10ac84);
    createMovingPlatform(new THREE.Vector3(0, -0.5, -112), new THREE.Vector3(0, 3.5, -112), new THREE.Vector3(4, 0.8, 4), 1.8, 0x2ed573);
    createMovingPlatform(new THREE.Vector3(4, 1.0, -124), new THREE.Vector3(-4, 1.0, -124), new THREE.Vector3(4, 0.8, 4), 2.5, 0x10ac84);
    createCoin(new THREE.Vector3(0, 5.0, -112), 25);

    // Stage 4: Punane Laavarada / Lava Leap
    createPlatform(new THREE.Vector3(0, 0, -135), new THREE.Vector3(7, 1, 7), 0xff4757);
    createHazard(new THREE.Vector3(0, -1.0, -155), new THREE.Vector3(20, 0.6, 36), 'lava');
    createPlatform(new THREE.Vector3(-2.5, 0.3, -145), new THREE.Vector3(2.5, 0.8, 2.5), 0x2f3542);
    createPlatform(new THREE.Vector3(2.5, 0.6, -153), new THREE.Vector3(2.5, 0.8, 2.5), 0x2f3542);
    createPlatform(new THREE.Vector3(-2.5, 0.9, -161), new THREE.Vector3(2.5, 0.8, 2.5), 0x2f3542);
    createPlatform(new THREE.Vector3(2.5, 1.2, -169), new THREE.Vector3(2.5, 0.8, 2.5), 0x2f3542);
    createCoin(new THREE.Vector3(0, 2.8, -157), 25);

    // Stage 5: Super Batuudid / Bounce Pads
    createPlatform(new THREE.Vector3(0, 0, -180), new THREE.Vector3(7, 1, 7), 0x1e90ff);
    createBouncePad(new THREE.Vector3(0, 0.5, -188), new THREE.Vector3(3.5, 0.4, 3.5));
    createPlatform(new THREE.Vector3(0, 8.5, -200), new THREE.Vector3(5, 1, 5), 0x3742fa);
    createBouncePad(new THREE.Vector3(0, 9.0, -208), new THREE.Vector3(3.5, 0.4, 3.5));
    createPlatform(new THREE.Vector3(0, 16.5, -220), new THREE.Vector3(5, 1, 5), 0x3742fa);
    createCoin(new THREE.Vector3(0, 12.0, -204), 25);

    // Stage 6: Spiraalhüpped / Neon Spiral Hop
    createPlatform(new THREE.Vector3(0, 0, -230), new THREE.Vector3(8, 1, 8), 0x9b59b6);
    const spiralColors = [0x9b59b6, 0x8e44ad, 0xa55eea, 0xd980fa, 0x8e44ad, 0x9b59b6, 0xa55eea, 0xd980fa];
    for (let i = 0; i < 8; i++) {
        const angle = (i * 0.75);
        const radius = 3.6;
        const px = Math.sin(angle) * radius;
        const pz = -238 - (i * 4.8);
        const py = (i <= 4 ? i * 0.75 : (8 - i) * 0.75);
        const col = spiralColors[i % spiralColors.length];
        createPlatform(new THREE.Vector3(px, py, pz), new THREE.Vector3(3.2, 0.75, 3.2), col);
        if (i === 2 || i === 5) {
            createCoin(new THREE.Vector3(px, py + 2.0, pz), 15);
        }
    }

    // Stage 7: Kitsas Tasakaalutala / Sky Balance Beams
    createPlatform(new THREE.Vector3(0, 0, -280), new THREE.Vector3(7, 1, 7), 0x1abc9c);
    createPlatform(new THREE.Vector3(0, 0, -290), new THREE.Vector3(0.8, 0.8, 12), 0x16a085);
    createPlatform(new THREE.Vector3(2.5, 0.3, -302), new THREE.Vector3(5.5, 0.8, 0.8), 0x16a085);
    createPlatform(new THREE.Vector3(5.0, 0.6, -314), new THREE.Vector3(0.8, 0.8, 12), 0x16a085);
    createPlatform(new THREE.Vector3(2.5, 0.9, -323), new THREE.Vector3(5.5, 0.8, 0.8), 0x16a085);
    createCoin(new THREE.Vector3(5.0, 2.2, -314), 25);

    // Stage 8: Libe Jääpalee / Slippery Ice Palace
    createPlatform(new THREE.Vector3(0, 0, -330), new THREE.Vector3(7, 1, 7), 0x70a1ff);
    createPlatform(new THREE.Vector3(0, -0.5, -342), new THREE.Vector3(4, 0.6, 14), 0xa4b0be);
    createPlatform(new THREE.Vector3(-3.5, -1.0, -356), new THREE.Vector3(4, 0.6, 12), 0xa4b0be);
    createPlatform(new THREE.Vector3(0, -1.5, -368), new THREE.Vector3(4, 0.6, 12), 0xa4b0be);
    createCoin(new THREE.Vector3(-3.5, 0.8, -356), 25);

    // Stage 9: Veerevad Hiidvasarad / Swinging Hammers
    createPlatform(new THREE.Vector3(0, 0, -380), new THREE.Vector3(7, 1, 7), 0xe67e22);
    createPlatform(new THREE.Vector3(0, 0, -394), new THREE.Vector3(4, 0.8, 20), 0xd35400);
    createSwingingHammer(new THREE.Vector3(0, 5, -390), 2.2);
    createSwingingHammer(new THREE.Vector3(0, 5, -398), -2.5);
    createPlatform(new THREE.Vector3(0, 0.5, -412), new THREE.Vector3(4, 0.8, 14), 0xd35400);
    createSwingingHammer(new THREE.Vector3(0, 5, -410), 2.8);
    createCoin(new THREE.Vector3(0, 2.5, -394), 25);

    // Stage 10: Finaal - Taevane Tsitadell / Celestial Citadel
    createPlatform(new THREE.Vector3(0, 0, -430), new THREE.Vector3(12, 1.2, 12), 0xffd32a);
    for (let s = 0; s < 7; s++) {
        const stepPos = new THREE.Vector3(0, 1.0 + s * 1.2, -440 - s * 4.5);
        createPlatform(stepPos, new THREE.Vector3(6 - s * 0.4, 0.8, 3.5), 0xf5cd79);
    }
    const finalPodiumPos = new THREE.Vector3(0, 10.5, -475);
    createPlatform(finalPodiumPos, new THREE.Vector3(16, 2.0, 16), 0xffd32a);
    createGiantTrophy(new THREE.Vector3(0, 12.0, -475));

    return {
        platforms,
        platformMeshes,
        bouncePads,
        hazards,
        disappearingPlatforms,
        movingPlatforms,
        rotatingHazards,
        checkpoints,
        coinsList
    };
}
