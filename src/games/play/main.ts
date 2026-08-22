import * as THREE from 'three';
import { yardService, CreatedGame } from '../../shared/yardService';
import { getCurrentUserProfile } from '../../auth';

console.log("Community Game Player Loading...");

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;

let humanCharacter: THREE.Group;
let characterVelocity = new THREE.Vector3();
let isGrounded = true;
let characterYaw = 0;

const keys: { [key: string]: boolean } = {};
let currentGame: CreatedGame | null = null;

// Get URL Params
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
const isReviewMode = urlParams.get('mode') === 'review';

// --- Create Ultra Grass ---
function createUltraGrass() {
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

// --- Create Ultra Human Character ---
function createUltraHuman() {
    humanCharacter = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2c1a0e, roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.8 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.9, 12), shirtMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    humanCharacter.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
    head.position.y = 2.05;
    head.castShadow = true;
    humanCharacter.add(head);

    // Hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
    hair.position.y = 2.1;
    humanCharacter.add(hair);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.75, 8);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(-0.52, 1.4, 0);
    leftArm.castShadow = true;
    humanCharacter.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(0.52, 1.4, 0);
    rightArm.castShadow = true;
    humanCharacter.add(rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.85, 8);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.2, 0.5, 0);
    leftLeg.castShadow = true;
    humanCharacter.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.2, 0.5, 0);
    rightLeg.castShadow = true;
    humanCharacter.add(rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.35);
    const leftShoe = new THREE.Mesh(shoeGeo, shoesMat);
    leftShoe.position.set(-0.2, 0.06, 0.05);
    humanCharacter.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, shoesMat);
    rightShoe.position.set(0.2, 0.06, 0.05);
    humanCharacter.add(rightShoe);

    humanCharacter.position.set(0, 0, 0);
    scene.add(humanCharacter);
}

// --- Build Scene from Game Data ---
function buildSceneFromData(sceneData: any) {
    if (!sceneData || !Array.isArray(sceneData.objects)) return;

    sceneData.objects.forEach((obj: any) => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: obj.color || 0x00f2fe,
            roughness: 0.5,
            metalness: 0.2
        });

        if (obj.category === 'nature') {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            trunk.position.y = 0.75;
            group.add(trunk);

            const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 7), mat);
            leaves.position.y = 2.2;
            group.add(leaves);
        } else if (obj.category === 'city') {
            const bldg = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3), mat);
            bldg.position.y = 4;
            group.add(bldg);
        } else if (obj.category === 'vehicles') {
            const car = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), mat);
            car.position.y = 0.6;
            group.add(car);
        } else if (obj.category === 'gameplay') {
            const coin = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 12, 24), mat);
            coin.position.y = 1.6;
            group.add(coin);
        } else {
            const prop = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), mat);
            prop.position.y = 1.5;
            group.add(prop);
        }

        group.position.set(obj.position.x, obj.position.y, obj.position.z);
        if (obj.rotation) group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
        if (obj.scale) group.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);

        group.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(group);
    });
}

// --- Load Game & Initialize ---
async function initPlayer() {
    const container = document.getElementById('canvas-container')!;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    createUltraGrass();
    createUltraHuman();

    // Fetch Game Data
    const titleDisp = document.getElementById('game-title-display');
    const authorDisp = document.getElementById('game-author-display');
    const reviewBadge = document.getElementById('review-badge');
    const reviewToolbar = document.getElementById('admin-review-toolbar');

    if (isReviewMode) {
        if (reviewBadge) reviewBadge.style.display = 'block';
        if (reviewToolbar) reviewToolbar.style.display = 'flex';
    }

    if (gameId) {
        const localGames = yardService.getLocalCreatedGames();
        currentGame = localGames.find(g => g.id === gameId) || null;

        if (!currentGame) {
            const pending = await yardService.getPendingGames();
            currentGame = pending.find(g => g.id === gameId) || null;
        }
        if (!currentGame) {
            const approved = await yardService.getApprovedGames();
            currentGame = approved.find(g => g.id === gameId) || null;
        }

        if (currentGame) {
            if (titleDisp) titleDisp.innerText = currentGame.title;
            if (authorDisp) authorDisp.innerHTML = `By: <strong style="color: #ffd32a;">${currentGame.creatorUsername}</strong> | Category: ${currentGame.category}`;
            buildSceneFromData(currentGame.sceneData);
        } else {
            if (titleDisp) titleDisp.innerText = 'Game Not Found';
        }
    } else {
        if (titleDisp) titleDisp.innerText = 'Demo Community World';
    }

    // Setup Admin Review Buttons
    if (isReviewMode && gameId) {
        document.getElementById('btn-review-approve')?.addEventListener('click', async () => {
            await yardService.updateGameStatus(gameId, 'approved');
            alert('✅ Game Approved! It is now live on the Playard Hub.');
            window.location.href = '../../index.html';
        });

        document.getElementById('btn-review-reject')?.addEventListener('click', async () => {
            const reason = prompt('Optional rejection reason:', '') || '';
            await yardService.updateGameStatus(gameId, 'rejected', reason);
            alert('❌ Game Rejected.');
            window.location.href = '../../index.html';
        });

        document.getElementById('btn-review-changes')?.addEventListener('click', async () => {
            const feedback = prompt('What changes should the creator make?', 'Please improve world layout.');
            if (feedback) {
                await yardService.updateGameStatus(gameId, 'changes_requested', feedback);
                alert('⚠️ Feedback sent to creator.');
                window.location.href = '../../index.html';
            }
        });
    }

    // Controls & On-Screen Buttons
    window.addEventListener('keydown', e => { keys[e.code] = true; });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const bindTouchBtn = (id: string, code: string) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const press = (e: Event) => { e.preventDefault(); keys[code] = true; };
        const release = (e: Event) => { e.preventDefault(); keys[code] = false; };
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
    };

    bindTouchBtn('touch-btn-up', 'ArrowUp');
    bindTouchBtn('touch-btn-down', 'ArrowDown');
    bindTouchBtn('touch-btn-left', 'ArrowLeft');
    bindTouchBtn('touch-btn-right', 'ArrowRight');
    bindTouchBtn('touch-btn-jump', 'Space');

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    const moveSpeed = 9;
    const moveDir = new THREE.Vector3();

    if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        characterYaw = Math.atan2(moveDir.x, moveDir.z);
        humanCharacter.rotation.y = THREE.MathUtils.lerp(humanCharacter.rotation.y, characterYaw, 0.2);

        humanCharacter.position.x += moveDir.x * moveSpeed * delta;
        humanCharacter.position.z += moveDir.z * moveSpeed * delta;
    }

    if (keys['Space'] && isGrounded) {
        characterVelocity.y = 9;
        isGrounded = false;
    }

    if (!isGrounded) {
        characterVelocity.y -= 22 * delta;
        humanCharacter.position.y += characterVelocity.y * delta;
        if (humanCharacter.position.y <= 0) {
            humanCharacter.position.y = 0;
            characterVelocity.y = 0;
            isGrounded = true;
        }
    }

    // Smooth Camera follow
    const targetCamPos = new THREE.Vector3(
        humanCharacter.position.x - Math.sin(characterYaw) * 7,
        humanCharacter.position.y + 4,
        humanCharacter.position.z - Math.cos(characterYaw) * 7
    );
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(humanCharacter.position.x, humanCharacter.position.y + 1.6, humanCharacter.position.z);

    renderer.render(scene, camera);
}

initPlayer();
