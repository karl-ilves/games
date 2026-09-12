import * as THREE from 'three';
import { TrainDef } from '../types';

export interface BuiltTrain {
    trainGroup: THREE.Group;
    locomotiveGroup: THREE.Group;
    tenderGroup: THREE.Group;
    carriage1Group: THREE.Group;
    carriage2Group: THREE.Group;
    cargoGroup: THREE.Group;
    wheels: THREE.Mesh[];
    connectingRods: THREE.Mesh[];
    trainHeadlight: THREE.SpotLight;
    trainHeadlightMesh: THREE.Mesh;
}

export function buildTrainModel(trainDef: TrainDef): BuiltTrain {
    const wheels: THREE.Mesh[] = [];
    const connectingRods: THREE.Mesh[] = [];

    const trainGroup = new THREE.Group();

    // 1. Locomotive Engine
    const { locomotiveGroup, trainHeadlight, trainHeadlightMesh } = buildLocomotiveEngine(trainDef, wheels, connectingRods);
    trainGroup.add(locomotiveGroup);

    // 2. Tender / Power Car
    const tenderGroup = buildTenderOrPowerUnit(trainDef, wheels);
    trainGroup.add(tenderGroup);

    // 3. Passenger Carriage 1
    const carriage1Group = buildPassengerCarriage(trainDef, 1, wheels);
    trainGroup.add(carriage1Group);

    // 4. Passenger Carriage 2
    const carriage2Group = buildPassengerCarriage(trainDef, 2, wheels);
    trainGroup.add(carriage2Group);

    // 5. Cargo / Rear Unit
    const cargoGroup = buildRearOrCargoWagon(trainDef, wheels);
    trainGroup.add(cargoGroup);

    return {
        trainGroup,
        locomotiveGroup,
        tenderGroup,
        carriage1Group,
        carriage2Group,
        cargoGroup,
        wheels,
        connectingRods,
        trainHeadlight,
        trainHeadlightMesh
    };
}

function buildLocomotiveEngine(
    def: TrainDef,
    wheels: THREE.Mesh[],
    connectingRods: THREE.Mesh[]
): {
    locomotiveGroup: THREE.Group;
    trainHeadlight: THREE.SpotLight;
    trainHeadlightMesh: THREE.Mesh;
} {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.locoColor, metalness: 0.6, roughness: 0.35 });
    const trimMat = new THREE.MeshStandardMaterial({ color: def.trimColor, metalness: 0.8, roughness: 0.2 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8, roughness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 });

    if (def.category === 'metro') {
        // --- 🚇 Sleek 3D Rapid-Transit Metro Subway Car ---
        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 7.8), bodyMat);
        cab.position.set(0, 2.3, 0);
        cab.castShadow = true;
        group.add(cab);

        // Front Aerodynamic Curved Glass Windshield
        const winFront = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.3), glassMat);
        winFront.position.set(0, 2.7, 3.92);
        group.add(winFront);

        // LED Destination Sign Board ([METRO EXPRESS] / [KESKLINN])
        const signMat = new THREE.MeshBasicMaterial({ color: def.trimColor });
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.08), signMat);
        sign.position.set(0, 3.5, 3.92);
        group.add(sign);

        // Signature Color Side Livery Stripe
        const stripeMat = new THREE.MeshBasicMaterial({ color: def.trimColor });
        const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 7.8), stripeMat);
        stripeL.position.set(-1.52, 1.8, 0);
        const stripeR = stripeL.clone();
        stripeR.position.set(1.52, 1.8, 0);
        group.add(stripeL, stripeR);

        // Subway Side Double Doors
        [-1.8, 1.8].forEach(z => {
            [-1.52, 1.52].forEach(x => {
                const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }));
                door.position.set(x, 2.1, z);
                door.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
                group.add(door);
            });
        });

        // Rooftop AC & Ventilation Units
        const ac1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 2.2), trimMat);
        ac1.position.set(0, 3.95, -1.2);
        const ac2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 2.2), trimMat);
        ac2.position.set(0, 3.95, 1.8);
        group.add(ac1, ac2);

    } else if (def.style === 'bullet_shinkansen' || def.style === 'cyber_bullet' || def.style === 'hyperloop_plasma') {
        // Futuristic Streamlined Bullet Train Nose
        const noseGeo = new THREE.ConeGeometry(1.6, 6.0, 16);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 2.0, 4.0);
        nose.scale.set(1.0, 1.0, 0.75);
        group.add(nose);

        const cabBody = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.6, 7.0), bodyMat);
        cabBody.position.set(0, 2.0, -1.0);
        cabBody.castShadow = true;
        group.add(cabBody);

        // Cyber Glow Trim Strip
        const stripMat = new THREE.MeshBasicMaterial({ color: def.trimColor });
        const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 8.5), stripMat);
        stripL.position.set(-1.52, 1.5, 0.5);
        const stripR = stripL.clone();
        stripR.position.set(1.52, 1.5, 0.5);
        group.add(stripL, stripR);

        // Windshield Glass
        const glass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.8), glassMat);
        glass.position.set(0, 2.8, 3.2);
        glass.rotation.x = -Math.PI / 8;
        group.add(glass);

    } else if (def.style === 'commuter_emu' || def.style === 'alpine_climber') {
        // Modern Commuter / Mountain Railcar
        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 7.5), bodyMat);
        cab.position.set(0, 2.3, 0);
        cab.castShadow = true;
        group.add(cab);

        const frontNose = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.0, 12, 1, false, 0, Math.PI), trimMat);
        frontNose.rotation.z = Math.PI / 2;
        frontNose.position.set(0, 2.3, 3.75);
        group.add(frontNose);

        const winFront = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), windowMat);
        winFront.position.set(0, 2.8, 3.8);
        group.add(winFront);

    } else if (def.style === 'heavy_diesel') {
        // Heavy American Boxy Industrial Diesel
        const hood = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 6.0), bodyMat);
        hood.position.set(0, 2.2, 1.0);
        hood.castShadow = true;

        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.4, 2.8), bodyMat);
        cab.position.set(0, 2.6, -3.0);
        cab.castShadow = true;
        group.add(hood, cab);

        const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.0, 8), trimMat);
        horn.rotation.x = Math.PI / 2;
        horn.position.set(0.6, 4.4, -2.5);
        group.add(horn);

    } else {
        // Classic Steam / Royal Orient / Armored Dreadnought Boiler
        const boilerGeo = new THREE.CylinderGeometry(1.3, 1.3, 6.5, 16);
        const boiler = new THREE.Mesh(boilerGeo, bodyMat);
        boiler.rotation.x = Math.PI / 2;
        boiler.position.set(0, 2.4, 0.5);
        boiler.castShadow = true;
        group.add(boiler);

        [-1.5, 0.5, 2.5].forEach(z => {
            const band = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.06, 8, 24), trimMat);
            band.position.set(0, 2.4, z);
            group.add(band);
        });

        const cap = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), trimMat);
        cap.rotation.x = -Math.PI / 2;
        cap.position.set(0, 2.4, 3.75);
        group.add(cap);

        const smokestack = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 1.6, 12), bodyMat);
        smokestack.position.set(0, 4.3, 2.8);
        smokestack.castShadow = true;
        group.add(smokestack);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.2, 3.2), bodyMat);
        cab.position.set(0, 3.0, -3.0);
        cab.castShadow = true;
        group.add(cab);
    }

    // Headlight & Spotlight Beam
    const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.8, 12), trimMat);
    lampHousing.rotation.x = Math.PI / 2;
    lampHousing.position.set(0, 2.8, 4.6);
    const trainHeadlightMesh = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    trainHeadlightMesh.position.set(0, 2.8, 5.01);

    const trainHeadlight = new THREE.SpotLight(0xfffaed, 6, 90, Math.PI / 6, 0.4, 1.2);
    trainHeadlight.position.set(0, 2.8, 5.0);
    trainHeadlight.target.position.set(0, 0, 35);
    group.add(lampHousing, trainHeadlightMesh, trainHeadlight, trainHeadlight.target);

    // 6 Drive Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.3 });
    const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16);
    [-2.2, 0.2, 2.4].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.9, z);
            wheel.castShadow = true;
            group.add(wheel);
            wheels.push(wheel);
        });
    });

    // Connecting Rods
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95 });
    const rodL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 4.8), rodMat);
    rodL.position.set(-1.55, 0.9, 0.1);
    const rodR = rodL.clone();
    rodR.position.set(1.55, 0.9, 0.1);
    group.add(rodL, rodR);
    connectingRods.push(rodL, rodR);

    return { locomotiveGroup: group, trainHeadlight, trainHeadlightMesh };
}

function buildTenderOrPowerUnit(def: TrainDef, wheels: THREE.Mesh[]): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.locoColor, metalness: 0.7, roughness: 0.4 });
    const trimMat = new THREE.MeshStandardMaterial({ color: def.trimColor, roughness: 0.5 });

    if (def.category === 'metro') {
        // Metro Intermediate Carriage
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.9, 6.0), bodyMat);
        body.position.y = 2.3;
        body.castShadow = true;
        group.add(body);

        const stripeMat = new THREE.MeshBasicMaterial({ color: def.trimColor });
        const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 6.0), stripeMat);
        stripeL.position.set(-1.47, 1.8, 0);
        const stripeR = stripeL.clone();
        stripeR.position.set(1.47, 1.8, 0);
        group.add(stripeL, stripeR);
    } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 4.5), bodyMat);
        body.position.y = 2.0;
        body.castShadow = true;
        group.add(body);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.3, 4.6), trimMat);
        roof.position.y = 3.2;
        group.add(roof);
    }

    [-1.3, 1.3].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.3, 12), bodyMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.7, z);
            group.add(w);
            wheels.push(w);
        });
    });

    return group;
}

function buildPassengerCarriage(def: TrainDef, idx: number, wheels: THREE.Mesh[]): THREE.Group {
    const group = new THREE.Group();
    const coachMat = new THREE.MeshStandardMaterial({ color: def.coachColor, metalness: 0.4, roughness: 0.4 });
    const roofMat = new THREE.MeshStandardMaterial({ color: def.trimColor, roughness: 0.3 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.7 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 7.5), coachMat);
    body.position.y = 2.4;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7.6, 16, 1, false, 0, Math.PI), roofMat);
    roof.rotation.z = Math.PI / 2;
    roof.position.set(0, 3.8, 0);
    group.add(roof);

    for (let z = -2.6; z <= 2.6; z += 1.3) {
        [-1.42, 1.42].forEach(x => {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), winMat);
            win.position.set(x, 2.7, z);
            win.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
            group.add(win);
        });
    }

    [-2.4, -1.2, 1.2, 2.4].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 12), coachMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.7, z);
            group.add(w);
            wheels.push(w);
        });
    });

    return group;
}

function buildRearOrCargoWagon(def: TrainDef, wheels: THREE.Mesh[]): THREE.Group {
    const group = new THREE.Group();

    if (def.category === 'metro') {
        // Rear Metro Cab with Red Tail-lights
        const bodyMat = new THREE.MeshStandardMaterial({ color: def.locoColor, metalness: 0.6, roughness: 0.35 });
        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.9, 7.0), bodyMat);
        cab.position.y = 2.3;
        group.add(cab);

        // Rear Red Warning Tail-Lights
        const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const lightL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), redLightMat);
        lightL.position.set(-1.0, 2.5, -3.52);
        const lightR = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), redLightMat);
        lightR.position.set(1.0, 2.5, -3.52);
        group.add(lightL, lightR);
    } else {
        const flatbedMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
        const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });

        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 6.5), flatbedMat);
        bed.position.y = 1.4;
        group.add(bed);

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3 - row; col++) {
                const log = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6.0, 8), logMat);
                log.rotation.x = Math.PI / 2;
                log.position.set((col - (2 - row) / 2) * 0.85, 2.1 + row * 0.75, 0);
                log.castShadow = true;
                group.add(log);
            }
        }
    }

    [-2.0, 2.0].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.7, z);
            group.add(w);
            wheels.push(w);
        });
    });

    return group;
}
