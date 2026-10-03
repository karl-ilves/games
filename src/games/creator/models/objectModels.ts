import { csState } from "../state/creatorState";
import * as THREE from 'three';
import { PlacedObject, CatalogItem } from '../types';
import { scene, grassPlane, setGrassPlane, grassBlades, setGrassBlades, humanCharacter, setHumanCharacter, playerAvatarRig, setPlayerAvatarRig, emotesWidget, setEmotesWidget } from '../state/creatorState';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { avatarService } from '../../../shared/avatar/AvatarService';
import { InGameEmotesWidget } from '../../../shared/avatar/InGameEmotesWidget';
import { CustomShapeType } from '../../../shared/yardService';

export function isAirplaneObject(obj?: PlacedObject | null): boolean {
    if (!obj) return false;
    if (obj.isAirplane === true) return true;
    const n = ((obj.name || '') + ' ' + (obj.catalogId || '')).toLowerCase();
    return n.includes('plane') || n.includes('lennuk') || n.includes('jet') || n.includes('aircraft') || n.includes('fighter') || n.includes('propeller');
}

export function isBoatObject(obj?: PlacedObject | null): boolean {
    if (!obj) return false;
    if (obj.isBoat === true || (obj.mesh as any)?.userData?.isBoat === true) return true;
    const n = ((obj.name || '') + ' ' + (obj.catalogId || '')).toLowerCase();
    return n.includes('boat') || n.includes('paat') || n.includes('ship') || n.includes('laev') || n.includes('jaht') || n.includes('yacht') || n.includes('speedboat') || n.includes('jetski') || n.includes('parv') || n.includes('raft') || n.includes('kiirpaat');
}

export function createUltraRealisticGrass() {
    // 1. Terrain Ground
    const groundGeo = new THREE.PlaneGeometry(300, 300, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1b4d24,
        roughness: 0.85,
        metalness: 0.1,
        flatShading: false
    });
    csState.grassPlane = new THREE.Mesh(groundGeo, groundMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.receiveShadow = true;
    scene.add(grassPlane);

    // 2. High-Density 3D Grass Blades (Instanced Mesh for high performance)
    const bladeCount = 15000;
    const bladeGeo = new THREE.ConeGeometry(0.12, 1.2, 4);
    bladeGeo.translate(0, 0.6, 0);

    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x38ef7d,
        roughness: 0.6,
        metalness: 0.05
    });

    csState.grassBlades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
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

export function createUltraRealisticHuman() {
    csState.playerAvatarRig = new AvatarRig(avatarService.getConfig());
    csState.humanCharacter = playerAvatarRig.rootGroup;
    humanCharacter.name = 'Creator_Player_AvatarRig';
    humanCharacter.position.set(0, 0, 0);
    scene.add(humanCharacter);

    csState.emotesWidget = new InGameEmotesWidget({
        getAvatarRig: () => playerAvatarRig,
        topOffset: 135,
        leftOffset: 20
    });

    avatarService.subscribe(cfg => {
        if (playerAvatarRig) {
            playerAvatarRig.applyConfig(cfg);
        }
    });
}

export function createAirplane3DMesh(color = '#3498db'): THREE.Group {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.4 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.8 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // 1. Fuselage (Aerodynamic Body)
    const fuselageGeo = new THREE.CylinderGeometry(0.75, 0.8, 6.2, 16);
    fuselageGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    fuselage.position.y = 1.3;
    group.add(fuselage);

    // 2. Streamlined Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.75, 1.8, 16);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 1.3, -3.95);
    group.add(nose);

    // 3. Cockpit Canopy (Tinted Glass)
    const cockpitGeo = new THREE.SphereGeometry(0.65, 16, 16);
    cockpitGeo.scale(0.8, 0.75, 1.8);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 1.8, -1.2);
    group.add(cockpit);

    // 4. Main Swept Wings (Left & Right)
    const wingGeo = new THREE.BoxGeometry(9.2, 0.12, 1.8);
    const mainWings = new THREE.Mesh(wingGeo, wingMat);
    mainWings.position.set(0, 1.25, -0.4);
    group.add(mainWings);

    // Wingtips / Winglets with Red/Green Nav Lights
    [-4.55, 4.55].forEach((wx, idx) => {
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.8), bodyMat);
        winglet.position.set(wx, 1.55, -0.4);
        group.add(winglet);

        const navLightMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xff4757 : 0x2ecc71 });
        const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), navLightMat);
        navLight.position.set(wx, 1.95, -0.4);
        group.add(navLight);
    });

    // 5. Tail Fin (Vertical Stabilizer)
    const tailFinGeo = new THREE.BoxGeometry(0.14, 1.7, 1.6);
    const tailFin = new THREE.Mesh(tailFinGeo, bodyMat);
    tailFin.position.set(0, 2.3, 2.6);
    tailFin.rotation.x = -0.3;
    group.add(tailFin);

    // Horizontal Tail Stabilizers
    const tailWingGeo = new THREE.BoxGeometry(3.4, 0.1, 1.1);
    const tailWings = new THREE.Mesh(tailWingGeo, wingMat);
    tailWings.position.set(0, 1.45, 2.8);
    group.add(tailWings);

    // 6. Dual Jet Engines under Wings
    [-2.0, 2.0].forEach(ex => {
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.1, 12), engineMat);
        engine.rotateX(Math.PI / 2);
        engine.position.set(ex, 0.8, -0.3);
        group.add(engine);

        // Glowing Blue Jet Exhaust
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.15, 12), glowMat);
        exhaust.rotateX(Math.PI / 2);
        exhaust.position.set(ex, 0.8, 0.8);
        group.add(exhaust);
    });

    // 7. Landing Gear Wheels
    const frontGear = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12), wheelMat);
    frontGear.rotateZ(Math.PI / 2);
    frontGear.position.set(0, 0.24, -2.4);
    group.add(frontGear);

    [-1.3, 1.3].forEach(gx => {
        const rearGear = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 12), wheelMat);
        rearGear.rotateZ(Math.PI / 2);
        rearGear.position.set(gx, 0.26, 0.8);
        group.add(rearGear);
    });

    group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
}

export function createSpeedboat3DMesh(color = '#e74c3c'): THREE.Group {
    const group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.4 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.1, transparent: true, opacity: 0.65 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.9, roughness: 0.1 });

    // Hull (V-shaped bottom)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 5.8), hullMat);
    hull.position.set(0, 0.45, 0);
    group.add(hull);

    // Pointed bow (front nose)
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 4), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.45, -3.4);
    group.add(bow);

    // Deck & Cockpit cutout
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 5.0), deckMat);
    deck.position.set(0, 0.92, -0.2);
    group.add(deck);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 0.1), glassMat);
    windshield.position.set(0, 1.25, -1.2);
    windshield.rotation.x = -0.35;
    group.add(windshield);

    // Side windows
    [-1.02, 1.02].forEach(sideX => {
        const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 1.6), glassMat);
        sideWindow.position.set(sideX, 1.15, -0.4);
        group.add(sideWindow);
    });

    // Leather Seats
    [-0.5, 0.5].forEach(seatX => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.65), darkMat);
        seat.position.set(seatX, 1.05, -0.3);
        group.add(seat);
    });

    // Outboard Motor on stern
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.8), darkMat);
    motor.position.set(0, 0.7, 3.1);
    group.add(motor);

    const propShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8), chromeMat);
    propShaft.position.set(0, 0.1, 3.2);
    group.add(propShaft);

    // Steering wheel
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 12), chromeMat);
    wheel.position.set(0.48, 1.2, -0.9);
    wheel.rotation.x = -0.5;
    group.add(wheel);

    group.userData.isBoat = true;
    group.traverse(c => {
        if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });
    return group;
}

export function createWedgeGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
    // 3D Right-angle Ramp / Triangular Prism
    const hw = width / 2;
    const hd = depth / 2;
    const vertices = new Float32Array([
        // Front face (triangle)
        -hw, 0, -hd,   hw, 0, -hd,   -hw, height, -hd,
        // Back face (triangle)
        hw, 0, hd,   -hw, 0, hd,   hw, height, hd,
        // Slope / Ramp face (2 triangles)
        -hw, height, -hd,   hw, height, -hd,   -hw, 0, hd,
        hw, height, -hd,    hw, 0, hd,        -hw, 0, hd,
        // Bottom face (2 triangles)
        -hw, 0, -hd,   -hw, 0, hd,    hw, 0, hd,
        -hw, 0, -hd,   hw, 0, hd,     hw, 0, -hd,
        // Left vertical back/side face (2 triangles)
        -hw, 0, -hd,   -hw, height, -hd,  -hw, 0, hd,
        hw, height, hd,  hw, height, -hd,  hw, 0, -hd
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
}

export function createSinglePartMesh(part: {
    shapeType: CustomShapeType;
    width: number;
    height: number;
    depth: number;
    topElevation?: number;
    color?: string;
    position?: { x: number; y: number; z: number };
    rotationY?: number;
    isHazard?: boolean;
    isHeal?: boolean;
    isBoost?: boolean;
}, defaultColor = '#00f2fe'): THREE.Group {
    const partGroup = new THREE.Group();
    const w = Math.max(0.2, part.width || 2);
    const h = Math.max(0.2, part.height || 2);
    const d = Math.max(0.2, part.depth || 2);
    const col = part.color || defaultColor;

    let mat: THREE.Material;
    if (part.isHazard) {
        mat = new THREE.MeshStandardMaterial({
            color: col || '#ff3838',
            emissive: 0xd63031,
            emissiveIntensity: 0.6,
            roughness: 0.3
        });
    } else if (part.isHeal) {
        mat = new THREE.MeshStandardMaterial({
            color: col || '#2ecc71',
            emissive: 0x27ae60,
            emissiveIntensity: 0.5,
            roughness: 0.3
        });
    } else if (part.isBoost) {
        mat = new THREE.MeshStandardMaterial({
            color: col || '#f1c40f',
            emissive: 0xe67e22,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.4
        });
    } else {
        mat = new THREE.MeshStandardMaterial({
            color: col || '#00f2fe',
            roughness: 0.4,
            metalness: 0.2
        });
    }

    let geo: THREE.BufferGeometry;
    let meshPosY = h / 2;

    switch (part.shapeType) {
        case 'wedge': {
            const rampHeight = part.topElevation || h;
            geo = createWedgeGeometry(w, rampHeight, d);
            meshPosY = 0;
            break;
        }
        case 'cylinder': {
            const radius = Math.min(w, d) / 2;
            geo = new THREE.CylinderGeometry(radius, radius, h, 24);
            break;
        }
        case 'pyramid': {
            const radius = Math.max(w, d) / 2;
            geo = new THREE.ConeGeometry(radius, h, 4);
            geo.rotateY(Math.PI / 4);
            break;
        }
        case 'dome': {
            const radius = Math.min(w, d) / 2;
            geo = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            meshPosY = 0;
            break;
        }
        case 'sphere': {
            const radius = Math.min(w, Math.min(h, d)) / 2;
            geo = new THREE.SphereGeometry(radius, 24, 20);
            geo.scale(w / (radius * 2), h / (radius * 2), d / (radius * 2));
            meshPosY = h / 2;
            break;
        }
        case 'cone': {
            const radius = Math.min(w, d) / 2;
            geo = new THREE.ConeGeometry(radius, h, 24);
            meshPosY = h / 2;
            break;
        }
        case 'torus': {
            const radius = Math.min(w, d) / 2;
            const tube = Math.max(0.08, Math.min(radius * 0.35, h / 3));
            geo = new THREE.TorusGeometry(Math.max(0.1, radius - tube), tube, 16, 32);
            geo.rotateX(Math.PI / 2);
            meshPosY = h / 2;
            break;
        }
        case 'capsule': {
            const radius = Math.min(w, d) / 2;
            const length = Math.max(0.1, h - radius * 2);
            geo = new THREE.CapsuleGeometry(radius, length, 12, 24);
            meshPosY = h / 2;
            break;
        }
        case 'diamond': {
            const radius = Math.min(w, d) / 2;
            geo = new THREE.OctahedronGeometry(radius);
            geo.scale(1, h / (radius * 2), 1);
            meshPosY = h / 2;
            break;
        }
        case 'hexagon': {
            const radius = Math.min(w, d) / 2;
            geo = new THREE.CylinderGeometry(radius, radius, h, 6);
            meshPosY = h / 2;
            break;
        }
        case 'star': {
            const starShape = new THREE.Shape();
            const outerR = Math.min(w, d) / 2;
            const innerR = outerR * 0.45;
            const points = 5;
            for (let i = 0; i < points * 2; i++) {
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const r = i % 2 === 0 ? outerR : innerR;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) starShape.moveTo(x, y);
                else starShape.lineTo(x, y);
            }
            starShape.closePath();
            geo = new THREE.ExtrudeGeometry(starShape, {
                depth: h,
                bevelEnabled: false
            });
            geo.rotateX(Math.PI / 2);
            geo.translate(0, h, 0);
            meshPosY = 0;
            break;
        }
        case 'heart': {
            const heartShape = new THREE.Shape();
            const s = Math.min(w, d) / 3.2;
            heartShape.moveTo(0, 1.2 * s);
            heartShape.bezierCurveTo(1.2 * s, 2.5 * s, 2.5 * s, 1.2 * s, 2.5 * s, 0);
            heartShape.bezierCurveTo(2.5 * s, -1.2 * s, 1.2 * s, -2.0 * s, 0, -2.8 * s);
            heartShape.bezierCurveTo(-1.2 * s, -2.0 * s, -2.5 * s, -1.2 * s, -2.5 * s, 0);
            heartShape.bezierCurveTo(-2.5 * s, 1.2 * s, -1.2 * s, 2.5 * s, 0, 1.2 * s);
            geo = new THREE.ExtrudeGeometry(heartShape, {
                depth: h,
                bevelEnabled: false
            });
            geo.rotateX(Math.PI / 2);
            geo.rotateZ(Math.PI);
            geo.translate(0, h, 0);
            meshPosY = 0;
            break;
        }
        case 'stairs': {
            const stairShape = new THREE.Shape();
            const steps = 4;
            stairShape.moveTo(-d / 2, 0);
            for (let i = 0; i < steps; i++) {
                const x1 = -d / 2 + (d / steps) * i;
                const x2 = -d / 2 + (d / steps) * (i + 1);
                const y = (h / steps) * (i + 1);
                stairShape.lineTo(x1, y);
                stairShape.lineTo(x2, y);
            }
            stairShape.lineTo(d / 2, 0);
            stairShape.closePath();
            geo = new THREE.ExtrudeGeometry(stairShape, {
                depth: w,
                bevelEnabled: false
            });
            geo.rotateY(Math.PI / 2);
            geo.translate(-w / 2, 0, 0);
            meshPosY = 0;
            break;
        }
        case 'pipe': {
            const outerR = Math.min(w, d) / 2;
            const innerR = Math.max(0.05, outerR * 0.65);
            const pipeShape = new THREE.Shape();
            pipeShape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
            const holePath = new THREE.Path();
            holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
            pipeShape.holes.push(holePath);
            geo = new THREE.ExtrudeGeometry(pipeShape, {
                depth: h,
                bevelEnabled: false
            });
            geo.rotateX(Math.PI / 2);
            geo.translate(0, h, 0);
            meshPosY = 0;
            break;
        }
        case 'box':
        default: {
            geo = new THREE.BoxGeometry(w, h, d);
            break;
        }
    }

    const mainMesh = new THREE.Mesh(geo, mat);
    mainMesh.position.y = meshPosY;
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    partGroup.add(mainMesh);

    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    const wireframe = new THREE.LineSegments(edgeGeo, edgeMat);
    wireframe.position.copy(mainMesh.position);
    partGroup.add(wireframe);

    if (part.position) {
        partGroup.position.set(part.position.x || 0, part.position.y || 0, part.position.z || 0);
    }
    if (part.rotationY) {
        partGroup.rotation.y = part.rotationY;
    }

    return partGroup;
}

export function createCustomModel3DMesh(modelData: {
    shapeType: CustomShapeType;
    width: number;
    height: number;
    depth: number;
    topElevation?: number;
    faceOffsets?: { [key: string]: number };
    isHazard?: boolean;
    isHeal?: boolean;
    isBoost?: boolean;
    parts?: any[];
}, color = '#00f2fe'): THREE.Group {
    const group = new THREE.Group();

    // Kui mudelil on mitu kujundit (parts), loome iga kujundi eraldi ja liidame ühte tervikusse
    if (modelData.parts && modelData.parts.length > 0) {
        modelData.parts.forEach((p, idx) => {
            const pGroup = createSinglePartMesh({
                ...p,
                isHazard: modelData.isHazard,
                isHeal: modelData.isHeal,
                isBoost: modelData.isBoost
            }, p.color || color);
            pGroup.userData.partIndex = idx;
            pGroup.userData.partId = p.id;
            group.add(pGroup);
        });
        return group;
    }

    // Üksiku kujundi loogika
    const single = createSinglePartMesh(modelData, color);
    single.userData.partIndex = 0;
    group.add(single);
    return group;
}

export function createObjectMesh(item: CatalogItem, color?: string): THREE.Group {
    const matColor = color || item.color;
    if (item.customModelData) {
        return createCustomModel3DMesh(item.customModelData, matColor);
    }

    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: matColor,
        roughness: 0.5,
        metalness: 0.2
    });

    if (item.category === 'custom') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
        box.position.y = 1;
        group.add(box);
        return group;
    }

    if (item.category === 'nature') {
        if (item.geometryType.includes('pine')) {
            // Pine Trunk + Foliage
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            trunk.position.y = 0.75;
            group.add(trunk);

            const leaves1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 7), material);
            leaves1.position.y = 2.2;
            group.add(leaves1);

            const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 7), material);
            leaves2.position.y = 3.2;
            group.add(leaves2);
        } else if (item.geometryType.includes('rock') || item.geometryType.includes('boulder')) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), material);
            rock.position.y = 0.9;
            rock.scale.set(1.2, 0.9, 1.1);
            group.add(rock);
        } else {
            // Oak / Tree / Plant
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2), new THREE.MeshStandardMaterial({ color: 0x4e342e }));
            trunk.position.y = 1.0;
            group.add(trunk);

            const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), material);
            foliage.position.y = 2.8;
            group.add(foliage);
        }
    } else if (item.category === 'city') {
        if (item.geometryType.includes('skyscraper')) {
            const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 16, 3), material);
            tower.position.y = 8;
            group.add(tower);
        } else if (item.geometryType.includes('house')) {
            const base = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), material);
            base.position.y = 1.5;
            group.add(base);

            const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0xc0392b }));
            roof.position.y = 3.9;
            roof.rotation.y = Math.PI / 4;
            group.add(roof);
        } else if (item.geometryType.includes('road') || item.geometryType.includes('crossroad') || item.geometryType.includes('overpass')) {
            // Realistic Asphalt Road with yellow highway stripes
            const road = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.85 }));
            road.position.y = 0.06;
            group.add(road);

            // Center Road Dashes
            for (let s = -4.8; s <= 4.8; s += 2.4) {
                const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 1.4), new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.4 }));
                stripe.position.set(0, 0.07, s);
                group.add(stripe);
            }
            // Road Edge Lines
            [-3.6, 3.6].forEach(ex => {
                const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 14), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                edgeLine.position.set(ex, 0.07, 0);
                group.add(edgeLine);
            });
        } else {
            // City Prop / Wall
            const prop = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), material);
            prop.position.y = 1.5;
            group.add(prop);
        }
    } else if (item.category === 'vehicles') {
        const isPlane = item.geometryType.includes('plane') || item.geometryType.includes('jet') || item.name.toLowerCase().includes('plane') || item.name.toLowerCase().includes('jet') || item.name.toLowerCase().includes('fighter') || item.name.toLowerCase().includes('prop') || item.name.toLowerCase().includes('helicopter');
        if (isPlane) {
            return createAirplane3DMesh(matColor);
        }

        // Drivable Car Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 4.2), material);
        body.position.y = 0.65;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 2.2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 }));
        cabin.position.set(0, 1.25, -0.2);
        group.add(cabin);

        // Headlights & Taillights
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });

        [-0.7, 0.7].forEach(hx => {
            const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headlightMat);
            hl.position.set(hx, 0.65, -2.12);
            group.add(hl);

            const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), taillightMat);
            tl.position.set(hx, 0.65, 2.12);
            group.add(tl);
        });

        // 4 3D Rubber Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

        [-1.15, 1.15].forEach(x => {
            [-1.35, 1.35].forEach(z => {
                const w = new THREE.Mesh(wheelGeo, wheelMat);
                w.position.set(x, 0.4, z);
                group.add(w);
            });
        });
    } else if (item.category === 'gameplay') {
        const lowerType = (item.geometryType + ' ' + item.name).toLowerCase();
        if (lowerType.includes('lava')) {
            // Glowing Lava Floor Plate with Obsidian Rim
            const lavaMat = new THREE.MeshStandardMaterial({
                color: 0xff3b30,
                emissive: 0xff2d00,
                emissiveIntensity: 0.9,
                roughness: 0.3
            });
            const lavaPlate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 3.4), lavaMat);
            lavaPlate.position.y = 0.07;
            group.add(lavaPlate);

            // Dark Obsidian Border
            const rimMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 });
            [-1.7, 1.7].forEach(rx => {
                const rim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 3.6), rimMat);
                rim.position.set(rx, 0.1, 0);
                group.add(rim);
            });
            [-1.7, 1.7].forEach(rz => {
                const rim = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 0.2), rimMat);
                rim.position.set(0, 0.1, rz);
                group.add(rim);
            });
        } else if (lowerType.includes('spike') || lowerType.includes('blade') || lowerType.includes('laser')) {
            // Metallic Spike Trap Plate with Sharp Spikes
            const basePlate = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 3.0), new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8, roughness: 0.3 }));
            basePlate.position.y = 0.07;
            group.add(basePlate);

            const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff3838, metalness: 0.8, roughness: 0.2 });
            [-0.9, 0, 0.9].forEach(sx => {
                [-0.9, 0, 0.9].forEach(sz => {
                    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 4), spikeMat);
                    spike.position.set(sx, 0.45, sz);
                    group.add(spike);
                });
            });
        } else if (lowerType.includes('medkit') || lowerType.includes('heart') || lowerType.includes('heal') || lowerType.includes('potion')) {
            // 3D Medkit White Case with Red Cross
            const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.7), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
            caseMesh.position.y = 0.5;
            group.add(caseMesh);

            const crossMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xc0392b, emissiveIntensity: 0.5 });
            const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.75), crossMat);
            crossH.position.y = 0.5;
            group.add(crossH);
            const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.75), crossMat);
            crossV.position.y = 0.5;
            group.add(crossV);
        } else if (item.geometryType.includes('portal') || item.geometryType.includes('gate') || item.geometryType.includes('teleport')) {
            // Glowing Dimension Portal Frame
            const portalFrame = new THREE.Mesh(new THREE.TorusGeometry(2, 0.28, 16, 32), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x8e44ad, emissiveIntensity: 0.7 }));
            portalFrame.position.y = 2.2;
            group.add(portalFrame);

            const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
            portalDisc.position.y = 2.2;
            group.add(portalDisc);
        } else if (item.geometryType.includes('coin') || item.geometryType.includes('ring')) {
            const coin = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 12, 24), material);
            coin.position.y = 1.6;
            group.add(coin);
        } else if (item.geometryType.includes('pad') || item.geometryType.includes('booster')) {
            const pad = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), material);
            pad.position.y = 0.1;
            group.add(pad);
        } else {
            // Checkpoint Gate / Arch
            const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4), material);
            leftPost.position.set(-2, 2, 0);
            group.add(leftPost);

            const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4), material);
            rightPost.position.set(2, 2, 0);
            group.add(rightPost);

            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 0.4), material);
            topBeam.position.set(0, 4, 0);
            group.add(topBeam);
        }
    } else if (item.category === 'spawn' || item.geometryType.startsWith('spawn_') || item.id.startsWith('spawn_')) {
        const lowerType = (item.geometryType + ' ' + item.name + ' ' + item.id).toLowerCase();
        const isInvisible = lowerType.includes('invisible') || lowerType.includes('nähtamatu') || lowerType.includes('beacon') || lowerType.includes('ring');
        
        if (isInvisible) {
            group.userData.isInvisibleSpawn = true;
            // Holographic translucent marker for edit mode
            const ringGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.05, 32);
            const holoMat = new THREE.MeshStandardMaterial({
                color: matColor,
                transparent: true,
                opacity: 0.45,
                roughness: 0.2,
                emissive: matColor,
                emissiveIntensity: 0.6
            });
            const ring = new THREE.Mesh(ringGeo, holoMat);
            ring.position.y = 0.03;
            group.add(ring);

            // Floating holographic marker / arrow
            const markerGeo = new THREE.ConeGeometry(0.35, 0.7, 4);
            markerGeo.rotateX(Math.PI);
            const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: matColor, wireframe: true }));
            marker.position.y = 1.4;
            group.add(marker);

            // Torus aura
            const aura = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 12, 24), new THREE.MeshBasicMaterial({ color: matColor, transparent: true, opacity: 0.7 }));
            aura.rotation.x = Math.PI / 2;
            aura.position.y = 0.6;
            group.add(aura);
        } else if (lowerType.includes('flag') || lowerType.includes('lipp')) {
            // Checkpoint Flag Post (Visible)
            const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 }));
            stand.position.y = 0.07;
            group.add(stand);

            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 12), new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.7, roughness: 0.3 }));
            pole.position.y = 1.7;
            group.add(pole);

            const finial = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2 }));
            finial.position.y = 3.4;
            group.add(finial);

            const flagGeo = new THREE.BoxGeometry(1.3, 0.75, 0.04);
            const flagMesh = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.5 }));
            flagMesh.position.set(0.65, 2.8, 0);
            group.add(flagMesh);
        } else if (lowerType.includes('portal') || lowerType.includes('gate') || lowerType.includes('värav')) {
            // Dimension Portal Gate (Visible)
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.6 });
            [-1.6, 1.6].forEach(px => {
                const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.6, 0.45), pillarMat);
                pillar.position.set(px, 1.8, 0);
                group.add(pillar);
            });
            const arch = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.45, 0.5), pillarMat);
            arch.position.set(0, 3.8, 0);
            group.add(arch);

            const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.35, 32), new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
            portalDisc.position.y = 1.9;
            group.add(portalDisc);
        } else if (lowerType.includes('buoy') || lowerType.includes('poi')) {
            // Floating Ocean Water Buoy (Visible)
            const buoyBody = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 1.3, 16), new THREE.MeshStandardMaterial({ color: 0xff7675, roughness: 0.4 }));
            buoyBody.position.y = 0.5;
            group.add(buoyBody);

            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
            mast.position.y = 1.6;
            group.add(mast);

            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd32a }));
            beacon.position.y = 2.3;
            group.add(beacon);

            const collar = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            collar.rotation.x = Math.PI / 2;
            collar.position.y = 0.5;
            group.add(collar);
        } else if (lowerType.includes('seabed') || lowerType.includes('deep') || lowerType.includes('süvavee')) {
            // Deep Seabed Station (Visible)
            const basePad = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x1b2838, metalness: 0.8, roughness: 0.4 }));
            basePad.position.y = 0.17;
            group.add(basePad);

            const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), new THREE.MeshStandardMaterial({ color: 0x0984e3, transparent: true, opacity: 0.75, emissive: 0x00cec9, emissiveIntensity: 0.5 }));
            dome.position.y = 0.8;
            group.add(dome);

            [-1.5, 1.5].forEach(lx => {
                const light = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 }));
                light.position.set(lx, 0.5, 0);
                group.add(light);
            });
        } else if (lowerType.includes('torii')) {
            // Mystic Torii Gate (Visible)
            const woodMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.7 });
            [-1.4, 1.4].forEach(tx => {
                const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.6, 12), woodMat);
                col.position.set(tx, 1.8, 0);
                group.add(col);
            });
            const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 0.35), woodMat);
            top.position.set(0, 3.7, 0);
            group.add(top);
        } else if (lowerType.includes('altar') || lowerType.includes('throne')) {
            // Golden Altar (Visible)
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xfdcb6e, metalness: 0.8, roughness: 0.3 });
            const s1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.6), goldMat);
            s1.position.y = 0.1;
            group.add(s1);
            const s2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), goldMat);
            s2.position.y = 0.3;
            group.add(s2);
        } else {
            // Visible Sci-Fi Spawn Pad (Standard Visible)
            const baseRim = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.75, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.7, roughness: 0.3 }));
            baseRim.position.y = 0.1;
            group.add(baseRim);

            const neonCore = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.24, 32), new THREE.MeshStandardMaterial({ color: matColor, emissive: matColor, emissiveIntensity: 0.8, roughness: 0.2 }));
            neonCore.position.y = 0.12;
            group.add(neonCore);

            [-1.35, 1.35].forEach(ex => {
                [-1.35, 1.35].forEach(ez => {
                    const node = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.25), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 }));
                    node.position.set(ex, 0.2, ez);
                    group.add(node);
                });
            });
        }
    } else {
        // Sci-Fi
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), material);
        core.position.y = 2.0;
        group.add(core);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
        base.position.y = 0.3;
        group.add(base);
    }

    group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
}