import * as THREE from 'three';
import { CarVisualConfig } from '../types';
import { formatOwnerNametag, isOwnerUser } from '../../../auth';

export interface CarMeshContainer {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    frontLeftWheel: THREE.Group;
    frontRightWheel: THREE.Group;
    rearLeftWheel: THREE.Group;
    rearRightWheel: THREE.Group;
    frontLeftWheelMesh: THREE.Mesh;
    frontRightWheelMesh: THREE.Mesh;
    rearLeftWheelMesh: THREE.Mesh;
    rearRightWheelMesh: THREE.Mesh;
    brakeLights: THREE.Mesh[];
    headlights: THREE.Mesh[];
    nameTagCanvas?: HTMLCanvasElement;
    nameTagTexture?: THREE.CanvasTexture;
    nameTagMesh?: THREE.Sprite;
    setBodyColor: (colorHex: string) => void;
    updateSteeringAndSpin: (steerAngle: number, wheelSpin: number) => void;
    setBraking: (braking: boolean) => void;
    setFrontWrecked: (wrecked: boolean) => void;
    isFrontWrecked: () => boolean;
    setEntireCarWrecked: (wrecked: boolean) => void;
    isEntireCarWrecked: () => boolean;
}

export function createCarMesh(config: CarVisualConfig): CarMeshContainer {
    const root = new THREE.Group();
    root.name = 'Car_' + config.driverName;

    // Body Material
    const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.bodyColor),
        roughness: 0.2,
        metalness: 0.6
    });

    const darkMat = new THREE.MeshStandardMaterial({
        color: 0x111620,
        roughness: 0.4,
        metalness: 0.8
    });

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x1a2536,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85
    });

    const rimMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.3,
        metalness: 0.8
    });

    const tireMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.1
    });

    const headlightMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.9,
        roughness: 0.1
    });

    const brakeLightOffMat = new THREE.MeshStandardMaterial({
        color: 0x550000,
        emissive: 0x220000,
        emissiveIntensity: 0.2,
        roughness: 0.3
    });

    const brakeLightOnMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff1a1a,
        emissiveIntensity: 1.5,
        roughness: 0.1
    });

    // 1. Lower Chassis
    const lowerChassisGeo = new THREE.BoxGeometry(1.85, 0.45, 4.3);
    const lowerChassis = new THREE.Mesh(lowerChassisGeo, bodyMat);
    lowerChassis.position.y = 0.45;
    lowerChassis.castShadow = true;
    lowerChassis.receiveShadow = true;
    root.add(lowerChassis);

    // 2. Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(1.4, 0.52, 2.1);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.85, -0.2);
    cabin.castShadow = true;
    root.add(cabin);

    // Roof Top
    const roofTopGeo = new THREE.BoxGeometry(1.36, 0.08, 1.8);
    const roofTop = new THREE.Mesh(roofTopGeo, bodyMat);
    roofTop.position.set(0, 1.13, -0.2);
    root.add(roofTop);

    // 3. Front Hood Slope
    const hoodGeo = new THREE.BoxGeometry(1.65, 0.22, 1.3);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 0.65, 1.3);
    hood.rotation.x = 0.05;
    root.add(hood);

    // Front Grille / Splitter
    const splitterGeo = new THREE.BoxGeometry(1.88, 0.1, 0.3);
    const splitter = new THREE.Mesh(splitterGeo, darkMat);
    splitter.position.set(0, 0.25, 2.15);
    root.add(splitter);

    // 4. Rear Spoiler
    const spoilerWingGeo = new THREE.BoxGeometry(1.7, 0.06, 0.35);
    const spoilerWing = new THREE.Mesh(spoilerWingGeo, darkMat);
    spoilerWing.position.set(0, 1.05, -2.05);

    const spoilerStandLGeo = new THREE.BoxGeometry(0.06, 0.35, 0.1);
    const standL = new THREE.Mesh(spoilerStandLGeo, darkMat);
    standL.position.set(-0.65, 0.85, -2.05);

    const standR = new THREE.Mesh(spoilerStandLGeo, darkMat);
    standR.position.set(0.65, 0.85, -2.05);

    root.add(spoilerWing, standL, standR);

    // 5. Headlights
    const headlightGeo = new THREE.BoxGeometry(0.35, 0.12, 0.1);
    const hlLeft = new THREE.Mesh(headlightGeo, headlightMat);
    hlLeft.position.set(-0.65, 0.55, 2.15);
    const hlRight = new THREE.Mesh(headlightGeo, headlightMat);
    hlRight.position.set(0.65, 0.55, 2.15);
    root.add(hlLeft, hlRight);

    // 6. Brake / Tail Lights
    const brakeLightGeo = new THREE.BoxGeometry(0.38, 0.12, 0.08);
    const blLeft = new THREE.Mesh(brakeLightGeo, brakeLightOffMat);
    blLeft.position.set(-0.65, 0.6, -2.15);
    const blRight = new THREE.Mesh(brakeLightGeo, brakeLightOffMat);
    blRight.position.set(0.65, 0.6, -2.15);
    root.add(blLeft, blRight);

    // 7. Wheels & Suspension Setup
    function buildWheelGroup(): { pivot: THREE.Group; spinMesh: THREE.Mesh } {
        const pivot = new THREE.Group();
        const spinMesh = new THREE.Group();

        // Tire
        const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18);
        tireGeo.rotateZ(Math.PI / 2);
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.castShadow = true;
        spinMesh.add(tire);

        // Rim
        const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.29, 12);
        rimGeo.rotateZ(Math.PI / 2);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        spinMesh.add(rim);

        // Rim Spokes
        const spokeGeo = new THREE.BoxGeometry(0.04, 0.4, 0.3);
        const spoke1 = new THREE.Mesh(spokeGeo, darkMat);
        const spoke2 = new THREE.Mesh(spokeGeo, darkMat);
        spoke2.rotation.x = Math.PI / 2;
        spinMesh.add(spoke1, spoke2);

        pivot.add(spinMesh);
        return { pivot, spinMesh: spinMesh as any };
    }

    const fl = buildWheelGroup();
    fl.pivot.position.set(-0.95, 0.38, 1.35);

    const fr = buildWheelGroup();
    fr.pivot.position.set(0.95, 0.38, 1.35);

    const rl = buildWheelGroup();
    rl.pivot.position.set(-0.95, 0.38, -1.35);

    const rr = buildWheelGroup();
    rr.pivot.position.set(0.95, 0.38, -1.35);

    root.add(fl.pivot, fr.pivot, rl.pivot, rr.pivot);

    // Exposed crumpled torn metal at the front break edge when half of car is destroyed
    // User requirement: "pool autost läheb katki ja pool autost jääb terveks"
    const crumpledEngineGeo = new THREE.BoxGeometry(1.7, 0.44, 0.3);
    const crumpledMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.4 });
    const crumpledEngine = new THREE.Mesh(crumpledEngineGeo, crumpledMat);
    crumpledEngine.position.set(0, 0.48, 0.15);
    crumpledEngine.visible = false;
    root.add(crumpledEngine);

    // Entire car wrecked frame (User: "terve auto läheb katki")
    const entireWreckGroup = new THREE.Group();
    const charredMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.95, metalness: 0.3 });
    const rustMetalMat = new THREE.MeshStandardMaterial({ color: 0x241d1a, roughness: 0.85, metalness: 0.5 });

    const charredFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 3.8), charredMat);
    charredFrame.position.y = 0.22;
    const twistedCabinCage = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.6), charredMat);
    twistedCabinCage.position.set(0, 0.45, -0.2);
    twistedCabinCage.rotation.z = 0.12;
    twistedCabinCage.rotation.y = -0.08;
    const burntEngine = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.7), rustMetalMat);
    burntEngine.position.set(0, 0.35, 0.9);
    const brokenAxleF = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), rustMetalMat);
    brokenAxleF.position.set(0, 0.2, 1.35);
    brokenAxleF.rotation.z = 0.15;
    const brokenAxleR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), rustMetalMat);
    brokenAxleR.position.set(0, 0.2, -1.35);
    brokenAxleR.rotation.z = -0.12;

    entireWreckGroup.add(charredFrame, twistedCabinCage, burntEngine, brokenAxleF, brokenAxleR);
    entireWreckGroup.visible = false;
    root.add(entireWreckGroup);

    const frontParts: THREE.Object3D[] = [hood, splitter, hlLeft, hlRight, fl.pivot, fr.pivot];
    const allBodyParts: THREE.Object3D[] = [
        lowerChassis, cabin, roofTop, hood, splitter,
        spoilerWing, standL, standR, hlLeft, hlRight, blLeft, blRight,
        fl.pivot, fr.pivot, rl.pivot, rr.pivot
    ];
    let isWrecked = false;
    let isEntireWrecked = false;

    // 8. Overhead Driver Name Tag
    let nameTagSprite: THREE.Sprite | undefined;
    let nameTagCanvas: HTMLCanvasElement | undefined;
    let nameTagTexture: THREE.CanvasTexture | undefined;

    if (config.driverName) {
        nameTagCanvas = document.createElement('canvas');
        nameTagCanvas.width = 256;
        nameTagCanvas.height = 64;
        const ctx = nameTagCanvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(10, 16, 24, 0.85)';
            ctx.roundRect(10, 10, 236, 44, 12);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = config.bodyColor;
            ctx.stroke();

            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const isOwner = isOwnerUser(config.driverName);
            const nameToDraw = isOwner ? formatOwnerNametag(config.driverName, true) : config.driverName;
            ctx.fillText(nameToDraw, 128, 32);
        }

        nameTagTexture = new THREE.CanvasTexture(nameTagCanvas);
        const spriteMat = new THREE.SpriteMaterial({ map: nameTagTexture, depthTest: false });
        nameTagSprite = new THREE.Sprite(spriteMat);
        nameTagSprite.scale.set(3.0, 0.75, 1);
        nameTagSprite.position.set(0, 2.2, 0);
        root.add(nameTagSprite);
    }

    return {
        group: root,
        bodyMesh: lowerChassis,
        frontLeftWheel: fl.pivot,
        frontRightWheel: fr.pivot,
        rearLeftWheel: rl.pivot,
        rearRightWheel: rr.pivot,
        frontLeftWheelMesh: fl.spinMesh,
        frontRightWheelMesh: fr.spinMesh,
        rearLeftWheelMesh: rl.spinMesh,
        rearRightWheelMesh: rr.spinMesh,
        brakeLights: [blLeft, blRight],
        headlights: [hlLeft, hlRight],
        nameTagMesh: nameTagSprite,
        nameTagCanvas,
        nameTagTexture,
        setBodyColor: (colorHex: string) => {
            bodyMat.color.set(colorHex);
            if (nameTagCanvas && nameTagTexture) {
                const ctx = nameTagCanvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, 256, 64);
                    ctx.fillStyle = 'rgba(10, 16, 24, 0.85)';
                    ctx.roundRect(10, 10, 236, 44, 12);
                    ctx.fill();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = colorHex;
                    ctx.stroke();
                    ctx.font = 'bold 22px sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const isOwner = isOwnerUser(config.driverName);
                    const nameToDraw = isOwner ? formatOwnerNametag(config.driverName, true) : config.driverName;
                    ctx.fillText(nameToDraw, 128, 32);
                    nameTagTexture.needsUpdate = true;
                }
            }
        },
        updateSteeringAndSpin: (steerAngle: number, wheelSpin: number) => {
            fl.pivot.rotation.y = steerAngle;
            fr.pivot.rotation.y = steerAngle;

            fl.spinMesh.rotation.x = wheelSpin;
            fr.spinMesh.rotation.x = wheelSpin;
            rl.spinMesh.rotation.x = wheelSpin;
            rr.spinMesh.rotation.x = wheelSpin;
        },
        setBraking: (braking: boolean) => {
            const mat = braking ? brakeLightOnMat : brakeLightOffMat;
            blLeft.material = mat;
            blRight.material = mat;
        },
        setFrontWrecked: (wrecked: boolean) => {
            isWrecked = wrecked;
            frontParts.forEach(p => { p.visible = !wrecked; });
            crumpledEngine.visible = wrecked;
            if (wrecked) {
                lowerChassis.scale.z = 0.52;
                lowerChassis.position.z = -1.03;
            } else {
                lowerChassis.scale.z = 1.0;
                lowerChassis.position.z = 0.0;
            }
        },
        isFrontWrecked: () => isWrecked
    };
}
