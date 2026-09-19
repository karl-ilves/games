import * as THREE from 'three';

export interface HelicopterMeshContainer {
    group: THREE.Group;
    mainRotor: THREE.Group;
    tailRotor: THREE.Group;
    searchLight: THREE.SpotLight;
    searchLightTarget: THREE.Object3D;
    update: (delta: number) => void;
}

export interface BomberPlaneMeshContainer {
    group: THREE.Group;
    propellers: THREE.Mesh[];
    update: (delta: number) => void;
}

export function createPoliceHelicopterMesh(id = 'heli_1'): HelicopterMeshContainer {
    const root = new THREE.Group();
    root.name = 'PoliceHeli_' + id;

    const blackMat = new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.3, metalness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.1, transparent: true, opacity: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.5, metalness: 0.8 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });

    // 1. Cabin
    const cabinGeo = new THREE.BoxGeometry(1.9, 1.7, 3.8);
    const cabin = new THREE.Mesh(cabinGeo, blackMat);
    cabin.position.y = 1.2;
    root.add(cabin);

    // Front Cockpit Glass
    const cockpitGeo = new THREE.BoxGeometry(1.8, 1.1, 1.4);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 1.35, 1.6);
    root.add(cockpit);

    // White Side Panels
    const sideGeo = new THREE.BoxGeometry(1.92, 0.9, 2.2);
    const sides = new THREE.Mesh(sideGeo, whiteMat);
    sides.position.set(0, 1.1, -0.1);
    root.add(sides);

    // 2. Tail Boom & Fin
    const boomGeo = new THREE.CylinderGeometry(0.25, 0.4, 5.0, 8);
    boomGeo.rotateX(Math.PI / 2);
    const boom = new THREE.Mesh(boomGeo, blackMat);
    boom.position.set(0, 1.4, -4.0);
    root.add(boom);

    const finGeo = new THREE.BoxGeometry(0.12, 1.6, 0.9);
    const fin = new THREE.Mesh(finGeo, whiteMat);
    fin.position.set(0, 2.0, -6.3);
    root.add(fin);

    // 3. Landing Skids
    const skidGeo = new THREE.BoxGeometry(0.12, 0.12, 4.2);
    const skidL = new THREE.Mesh(skidGeo, metalMat);
    skidL.position.set(-1.1, 0.1, 0.2);
    const skidR = new THREE.Mesh(skidGeo, metalMat);
    skidR.position.set(1.1, 0.1, 0.2);

    // Skid struts
    const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6);
    const strut1 = new THREE.Mesh(strutGeo, metalMat);
    strut1.position.set(-0.8, 0.6, 1.0);
    strut1.rotation.z = -0.3;
    const strut2 = new THREE.Mesh(strutGeo, metalMat);
    strut2.position.set(0.8, 0.6, 1.0);
    strut2.rotation.z = 0.3;
    const strut3 = new THREE.Mesh(strutGeo, metalMat);
    strut3.position.set(-0.8, 0.6, -0.8);
    strut3.rotation.z = -0.3;
    const strut4 = new THREE.Mesh(strutGeo, metalMat);
    strut4.position.set(0.8, 0.6, -0.8);
    strut4.rotation.z = 0.3;

    root.add(skidL, skidR, strut1, strut2, strut3, strut4);

    // 4. Main Rotor Mast & Blades
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), metalMat);
    mast.position.set(0, 2.3, 0.1);
    root.add(mast);

    const mainRotor = new THREE.Group();
    mainRotor.position.set(0, 2.6, 0.1);

    const bladeGeo = new THREE.BoxGeometry(0.24, 0.04, 7.6);
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
    blade2.rotation.y = Math.PI / 2;
    mainRotor.add(blade1, blade2);
    root.add(mainRotor);

    // 5. Tail Rotor
    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.15, 2.3, -6.3);
    const tBladeGeo = new THREE.BoxGeometry(0.08, 1.3, 0.02);
    const tBlade = new THREE.Mesh(tBladeGeo, bladeMat);
    tailRotor.add(tBlade);
    root.add(tailRotor);

    // 6. Searchlight / Spotlight pointed at ground
    const searchLightTarget = new THREE.Object3D();
    searchLightTarget.position.set(0, -25, 5);
    root.add(searchLightTarget);

    const searchLight = new THREE.SpotLight(0xfffae6, 4.5, 90, Math.PI / 6, 0.45, 1.2);
    searchLight.position.set(0, 0.4, 1.2);
    searchLight.target = searchLightTarget;
    searchLight.castShadow = true;
    root.add(searchLight);

    return {
        group: root,
        mainRotor,
        tailRotor,
        searchLight,
        searchLightTarget,
        update: (delta: number) => {
            mainRotor.rotation.y += 28 * delta;
            tailRotor.rotation.x += 35 * delta;
        }
    };
}

export function createBomberPlaneMesh(id = 'bomber_1'): BomberPlaneMeshContainer {
    const root = new THREE.Group();
    root.name = 'BomberPlane_' + id;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.35, metalness: 0.7 });
    const camoGreenMat = new THREE.MeshStandardMaterial({ color: 0x1e3728, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x747d8c, roughness: 0.4, metalness: 0.8 });
    const propellerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

    // Fuselage
    const fuseGeo = new THREE.CylinderGeometry(1.2, 0.6, 14.0, 10);
    fuseGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    fuselage.position.y = 1.0;
    root.add(fuselage);

    // Wings
    const wingGeo = new THREE.BoxGeometry(22.0, 0.28, 3.4);
    const wings = new THREE.Mesh(wingGeo, camoGreenMat);
    wings.position.set(0, 1.2, 0.5);
    root.add(wings);

    // Tail Fin & Stabilizers
    const finGeo = new THREE.BoxGeometry(0.2, 3.2, 2.2);
    const fin = new THREE.Mesh(finGeo, camoGreenMat);
    fin.position.set(0, 2.5, -6.0);
    root.add(fin);

    const stabGeo = new THREE.BoxGeometry(6.5, 0.18, 1.8);
    const stab = new THREE.Mesh(stabGeo, camoGreenMat);
    stab.position.set(0, 1.4, -6.0);
    root.add(stab);

    // Twin Wing Turbines
    const propellers: THREE.Mesh[] = [];
    [-4.5, 4.5].forEach(xPos => {
        const engGeo = new THREE.CylinderGeometry(0.7, 0.7, 3.2, 10);
        engGeo.rotateX(Math.PI / 2);
        const engine = new THREE.Mesh(engGeo, metalMat);
        engine.position.set(xPos, 0.9, 1.2);
        root.add(engine);

        // Propeller
        const propGeo = new THREE.BoxGeometry(2.4, 0.1, 0.04);
        const prop = new THREE.Mesh(propGeo, propellerMat);
        prop.position.set(xPos, 0.9, 2.85);
        root.add(prop);
        propellers.push(prop);
    });

    return {
        group: root,
        propellers,
        update: (delta: number) => {
            propellers.forEach(p => {
                p.rotation.z += 32 * delta;
            });
        }
    };
}

export function createBombMesh(): THREE.Mesh {
    const bombGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.35, metalness: 0.8 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });

    // Bomb Body (teardrop / bullet)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.15, 1.6, 10);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    bombGroup.add(body);

    // Yellow warning stripe
    const stripeGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.2, 10);
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.z = 0.2;
    bombGroup.add(stripe);

    // Tail Fins
    const finGeo = new THREE.BoxGeometry(0.8, 0.8, 0.06);
    const fins1 = new THREE.Mesh(finGeo, bodyMat);
    fins1.position.z = -0.7;
    const fins2 = new THREE.Mesh(finGeo, bodyMat);
    fins2.position.z = -0.7;
    fins2.rotation.z = Math.PI / 2;
    bombGroup.add(fins1, fins2);

    const container = new THREE.Mesh();
    container.add(bombGroup);
    return container;
}
