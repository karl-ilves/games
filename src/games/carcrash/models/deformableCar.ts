import * as THREE from 'three';
import { VehicleConfig, DeformableVertex } from '../types';

export interface DeformableVehicleBundle {
    root: THREE.Group;
    bodyMesh: THREE.Mesh;
    deformableGeo: THREE.BufferGeometry;
    originalPositions: Float32Array;
    currentPositions: Float32Array;
    deformableVertices: DeformableVertex[];
    wheels: {
        fl: THREE.Group;
        fr: THREE.Group;
        rl: THREE.Group;
        rr: THREE.Group;
    };
    parts: {
        hood: THREE.Mesh;
        bumperFront: THREE.Mesh;
        bumperRear: THREE.Mesh;
        windshield: THREE.Mesh;
        roof: THREE.Mesh;
        doors: THREE.Mesh[];
        radiator: THREE.Mesh;
    };
    headlights: THREE.Mesh[];
    taillights: THREE.Mesh[];
    config: VehicleConfig;
    applyImpactDeformation: (
        localContactPt: THREE.Vector3,
        impactForceVec: THREE.Vector3,
        stiffness: number,
        impactSpeedKmh?: number
    ) => { deformedCount: number; damagePercent: number };
    charredBurnedState: () => void;
    resetToFactory: () => void;
}

export function buildDeformableVehicle(config: VehicleConfig): DeformableVehicleBundle {
    const root = new THREE.Group();
    root.name = 'DeformableCar_' + config.id;

    const { length, width, height } = config.dimensions;

    // 1. Deformable Soft-Body Lattice Geometry (Box with high subdivisions)
    const segX = 8;
    const segY = 6;
    const segZ = 12;
    const baseGeo = new THREE.BoxGeometry(width, height * 0.7, length, segX, segY, segZ);
    baseGeo.translate(0, height * 0.45, 0);

    const posAttr = baseGeo.attributes.position as THREE.BufferAttribute;
    const vertexCount = posAttr.count;

    const originalPositions = new Float32Array(posAttr.array);
    const currentPositions = new Float32Array(posAttr.array);

    const deformableVertices: DeformableVertex[] = [];
    for (let i = 0; i < vertexCount; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);

        let zone: DeformableVertex['zone'] = 'chassis';
        if (z > length * 0.3) zone = 'front';
        else if (z < -length * 0.3) zone = 'rear';
        else if (y > height * 0.5) zone = 'roof';
        else if (x > width * 0.35) zone = 'right';
        else if (x < -width * 0.35) zone = 'left';

        deformableVertices.push({
            original: new THREE.Vector3(x, y, z),
            current: new THREE.Vector3(x, y, z),
            displacement: new THREE.Vector3(0, 0, 0),
            nodeIndex: i,
            zone
        });
    }

    const bodyMat = new THREE.MeshStandardMaterial({
        color: config.primaryColor,
        roughness: 0.25,
        metalness: 0.7,
        flatShading: false
    });

    const bodyMesh = new THREE.Mesh(baseGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    root.add(bodyMesh);

    // 2. Cabin Glass (Windshield)
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x112233,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.75
    });
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, height * 0.42, length * 0.46), glassMat);
    windshield.position.set(0, height * 0.75, 0);
    root.add(windshield);

    // 3. Separate Hood (Crumples, buckles up in inverted V, or flips on impact)
    const hoodMat = new THREE.MeshStandardMaterial({
        color: config.primaryColor,
        roughness: 0.3,
        metalness: 0.65
    });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, height * 0.08, length * 0.35), hoodMat);
    hood.position.set(0, height * 0.64, length * 0.28);
    hood.castShadow = true;
    root.add(hood);

    // 4. Radiator / Engine Core (visible when bumper or hood crumples)
    const radiatorMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, metalness: 0.85, roughness: 0.5 });
    const radiator = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, height * 0.32, 0.12), radiatorMat);
    radiator.position.set(0, height * 0.36, length * 0.42);
    root.add(radiator);

    // 5. Detachable / Crumpling Bumpers
    const bumperMat = new THREE.MeshStandardMaterial({ color: config.secondaryColor, roughness: 0.5, metalness: 0.6 });
    const bumperFront = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, height * 0.25, 0.25), bumperMat);
    bumperFront.position.set(0, height * 0.28, length * 0.51);
    root.add(bumperFront);

    const bumperRear = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, height * 0.25, 0.25), bumperMat);
    bumperRear.position.set(0, height * 0.28, -length * 0.51);
    root.add(bumperRear);

    // 6. Wheels
    const wheelRadius = height * 0.32;
    const wheelWidth = 0.32;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 });

    const createWheel = () => {
        const grp = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeo, tireMat);
        tire.castShadow = true;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth + 0.02, 16), rimMat);
        rim.rotateZ(Math.PI / 2);
        grp.add(tire, rim);
        return grp;
    };

    const wheels = {
        fl: createWheel(),
        fr: createWheel(),
        rl: createWheel(),
        rr: createWheel()
    };

    const halfW = width * 0.52;
    const halfL = length * 0.35;
    wheels.fl.position.set(-halfW, wheelRadius, halfL);
    wheels.fr.position.set(halfW, wheelRadius, halfL);
    wheels.rl.position.set(-halfW, wheelRadius, -halfL);
    wheels.rr.position.set(halfW, wheelRadius, -halfL);
    root.add(wheels.fl, wheels.fr, wheels.rl, wheels.rr);

    // 7. Lights
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xfffae0, emissiveIntensity: 0.8 });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headlightMat);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headlightMat);
    hlL.position.set(-width * 0.35, height * 0.45, length * 0.51);
    hlR.position.set(width * 0.35, height * 0.45, length * 0.51);
    root.add(hlL, hlR);

    const taillightMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.6 });
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), taillightMat);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), taillightMat);
    tlL.position.set(-width * 0.35, height * 0.45, -length * 0.51);
    tlR.position.set(width * 0.35, height * 0.45, -length * 0.51);
    root.add(tlL, tlR);

    // 8. SpaceX Jet Rocket Thrusters (for Tesla Roadcoaster) - clearly visible pods!
    if (config.hasThrusters) {
        const jetTitaniumMat = new THREE.MeshStandardMaterial({
            color: 0x1e272e,
            metalness: 0.92,
            roughness: 0.2
        });
        const jetRingMat = new THREE.MeshStandardMaterial({
            color: 0x00d2d3,
            metalness: 0.6,
            roughness: 0.3
        });
        const jetNozzleMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x00a8ff,
            emissiveIntensity: 1.4
        });

        // 1. Dual Rear High-Output Rocket Jet Boosters (prominently protruding from rear bumper!)
        const makeRearJet = (x: number) => {
            const grp = new THREE.Group();
            // Outer jet turbine housing
            const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.55, 20), jetTitaniumMat);
            housing.rotation.x = Math.PI / 2;
            // Turbine glowing ring
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.04, 12, 24), jetRingMat);
            ring.position.set(0, 0, 0.2);
            // Glowing core exhaust nozzle
            const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.56, 16), jetNozzleMat);
            nozzle.rotation.x = Math.PI / 2;

            grp.add(housing, ring, nozzle);
            grp.position.set(x, height * 0.42, -length * 0.54);
            return grp;
        };
        root.add(makeRearJet(-width * 0.28), makeRearJet(width * 0.28));

        // 2. Four External Aerodynamic Vertical Lift Jet Pods (Mounted visibly on the 4 corners/sides!)
        const makeLiftJetPod = (x: number, z: number, angleZ: number) => {
            const pod = new THREE.Group();
            // Aerodynamic nacelle body
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.45, 8, 16), jetTitaniumMat);
            body.rotation.z = angleZ;
            // Downward angled thruster nozzle
            const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.22, 16), jetNozzleMat);
            nozzle.position.set(0, -0.22, 0);
            // Intake fan / ring on top
            const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.1, 16), jetRingMat);
            intake.position.set(0, 0.24, 0);

            pod.add(body, nozzle, intake);
            pod.position.set(x, height * 0.45, z);
            return pod;
        };

        const sideOffset = width * 0.55;
        root.add(
            makeLiftJetPod(-sideOffset, length * 0.25, 0.1),  // Front Left Lift Jet
            makeLiftJetPod(sideOffset, length * 0.25, -0.1),  // Front Right Lift Jet
            makeLiftJetPod(-sideOffset, -length * 0.25, 0.1), // Rear Left Lift Jet
            makeLiftJetPod(sideOffset, -length * 0.25, -0.1)  // Rear Right Lift Jet
        );
    }

    // Real-Time Soft-Body Deformation Function (Graded strictly by Impact Speed & Physics Force)
    const applyImpactDeformation = (
        localContactPt: THREE.Vector3,
        impactForceVec: THREE.Vector3,
        vehicleStiffness: number,
        impactSpeedKmh: number = 50
    ) => {
        const forceMagnitude = impactForceVec.length();
        if (forceMagnitude < 0.5) return { deformedCount: 0, damagePercent: 0 };

        // Speed-dependent scaling factor:
        // low speed (< 25 km/h): small scratch/minor dent
        // medium speed (30-60 km/h): visible crumple & hood fold
        // high speed (70-100 km/h): massive destruction, deep chassis cave-in
        const speedRatio = Math.max(0.1, Math.min(2.0, impactSpeedKmh / 50.0));
        const effectiveStiffness = Math.max(0.2, vehicleStiffness);

        const radius = Math.min(3.4, (0.7 + speedRatio * 1.2) / Math.sqrt(effectiveStiffness));
        const impactDir = impactForceVec.clone().normalize();
        const maxDisplacement = Math.min(1.85, (0.08 + speedRatio * 0.95) / effectiveStiffness);

        let deformedNodes = 0;
        let totalDispMagnitude = 0;

        for (let i = 0; i < vertexCount; i++) {
            const v = deformableVertices[i];
            const dist = v.current.distanceTo(localContactPt);

            if (dist < radius) {
                const factor = Math.cos((dist / radius) * (Math.PI / 2));
                const push = impactDir.clone().multiplyScalar(maxDisplacement * factor);

                // Add realistic metal crinkle and accordion folds
                const foldNoise = (Math.sin(v.original.x * 12.0) * Math.cos(v.original.z * 12.0)) * 0.1 * factor * speedRatio;
                push.y += foldNoise;

                v.current.add(push);
                v.displacement.copy(v.current).sub(v.original);

                posAttr.setXYZ(i, v.current.x, v.current.y, v.current.z);
                deformedNodes++;
            }

            totalDispMagnitude += v.displacement.length();
        }

        posAttr.needsUpdate = true;
        baseGeo.computeVertexNormals();

        // 1. FRONT COLLISION VISUAL EFFECTS
        if (localContactPt.z > length * 0.15) {
            // Front bumper deformation
            if (impactSpeedKmh < 25) {
                bumperFront.position.z -= 0.12 * speedRatio;
            } else if (impactSpeedKmh < 60) {
                bumperFront.position.z -= 0.38 * speedRatio;
                bumperFront.rotation.x -= 0.28;
                bumperFront.rotation.y += (Math.random() - 0.5) * 0.35;
            } else {
                // High speed violent crunch: bumper crushed deep into frame and hangs askew
                bumperFront.position.z -= Math.min(0.95, 0.7 * speedRatio);
                bumperFront.position.y -= 0.16;
                bumperFront.rotation.z += (localContactPt.x < 0 ? 0.4 : -0.4);
                bumperFront.rotation.x -= 0.55;
            }

            // Hood buckling (Inverted V fold upwards)
            if (impactSpeedKmh >= 20) {
                const buckleAngle = Math.min(0.9, (impactSpeedKmh / 100.0) * 1.05);
                hood.rotation.x = -buckleAngle;
                hood.position.y = height * 0.64 + buckleAngle * 0.52;
                hood.position.z = length * 0.28 - buckleAngle * 0.32;
            }

            // Headlights smash out
            if (impactSpeedKmh >= 28) {
                const smashLeft = localContactPt.x <= 0.2 || impactSpeedKmh > 60;
                const smashRight = localContactPt.x >= -0.2 || impactSpeedKmh > 60;
                if (smashLeft && hlL.material instanceof THREE.MeshStandardMaterial) {
                    hlL.material.color.set(0x222222);
                    hlL.material.emissive.set(0x000000);
                    hlL.rotation.y += 0.3;
                }
                if (smashRight && hlR.material instanceof THREE.MeshStandardMaterial) {
                    hlR.material.color.set(0x222222);
                    hlR.material.emissive.set(0x000000);
                    hlR.rotation.y -= 0.3;
                }
            }

            // Front wheels alignment knocked askew
            if (impactSpeedKmh >= 45) {
                if (localContactPt.x < 0) {
                    wheels.fl.rotation.z = 0.35; // Camber tilt
                } else {
                    wheels.fr.rotation.z = -0.35;
                }
            }
        }

        // 2. REAR COLLISION VISUAL EFFECTS
        if (localContactPt.z < -length * 0.15) {
            bumperRear.position.z += Math.min(0.85, 0.45 * speedRatio);
            bumperRear.rotation.x += (Math.random() - 0.5) * 0.4;
            if (impactSpeedKmh > 30) {
                tlL.material instanceof THREE.MeshStandardMaterial && tlL.material.emissive.set(0x000000);
                tlR.material instanceof THREE.MeshStandardMaterial && tlR.material.emissive.set(0x000000);
            }
        }

        // 3. WINDSHIELD GLASS SHATTERING VISUALS
        if (impactSpeedKmh >= 35) {
            glassMat.roughness = 0.75;
            glassMat.color.set(0x88aacc);
            glassMat.opacity = 0.88;
        }
        if (impactSpeedKmh >= 68) {
            // Shattered safety spiderweb look
            glassMat.roughness = 0.98;
            glassMat.color.set(0xedf2f7);
            glassMat.opacity = 0.96;
        }

        // Damage percentage
        const damagePercent = Math.min(100, Math.round((totalDispMagnitude / (vertexCount * 0.18)) * 100));

        return { deformedCount: deformedNodes, damagePercent };
    };

    const charredBurnedState = () => {
        // Scorched blackened burned body, hood, and bumpers
        bodyMat.color.set(0x141414);
        bodyMat.roughness = 0.95;
        bodyMat.metalness = 0.1;
        hoodMat.color.set(0x101010);
        hoodMat.roughness = 0.98;
        bumperMat.color.set(0x0c0c0c);

        // Blown out shattered black glass
        glassMat.color.set(0x050505);
        glassMat.opacity = 0.3;
        glassMat.roughness = 1.0;

        // Destroyed dead lights
        if (hlL.material instanceof THREE.MeshStandardMaterial) {
            hlL.material.color.set(0x000000);
            hlL.material.emissive.set(0x000000);
        }
        if (hlR.material instanceof THREE.MeshStandardMaterial) {
            hlR.material.color.set(0x000000);
            hlR.material.emissive.set(0x000000);
        }
        if (tlL.material instanceof THREE.MeshStandardMaterial) {
            tlL.material.color.set(0x000000);
            tlL.material.emissive.set(0x000000);
        }
        if (tlR.material instanceof THREE.MeshStandardMaterial) {
            tlR.material.color.set(0x000000);
            tlR.material.emissive.set(0x000000);
        }

        // Blown open hood & detached bumpers
        hood.rotation.x = -1.25;
        hood.position.y = height * 0.85;
        bumperFront.position.y -= 0.22;
        bumperFront.rotation.x -= 0.65;
        bumperRear.rotation.x += 0.5;

        // Knock wheels out of alignment
        wheels.fl.rotation.z = 0.55;
        wheels.fr.rotation.z = -0.55;
        wheels.rl.rotation.z = 0.35;
        wheels.rr.rotation.z = -0.35;
    };

    const resetToFactory = () => {
        for (let i = 0; i < vertexCount; i++) {
            const v = deformableVertices[i];
            v.current.copy(v.original);
            v.displacement.set(0, 0, 0);
            posAttr.setXYZ(i, v.original.x, v.original.y, v.original.z);
        }
        posAttr.needsUpdate = true;
        baseGeo.computeVertexNormals();

        // Reset Paint
        bodyMat.color.set(config.primaryColor);
        bodyMat.roughness = 0.25;
        bodyMat.metalness = 0.7;
        hoodMat.color.set(config.primaryColor);
        hoodMat.roughness = 0.3;
        hoodMat.metalness = 0.65;
        bumperMat.color.set(config.secondaryColor);

        // Reset Hood
        hood.position.set(0, height * 0.64, length * 0.28);
        hood.rotation.set(0, 0, 0);

        // Reset Bumpers
        bumperFront.position.set(0, height * 0.28, length * 0.51);
        bumperFront.rotation.set(0, 0, 0);
        bumperRear.position.set(0, height * 0.28, -length * 0.51);
        bumperRear.rotation.set(0, 0, 0);

        // Reset Glass
        glassMat.roughness = 0.1;
        glassMat.color.set(0x112233);
        glassMat.opacity = 0.75;

        // Reset Lights
        if (hlL.material instanceof THREE.MeshStandardMaterial) {
            hlL.material.color.set(0xffffee);
            hlL.material.emissive.set(0xfffae0);
            hlL.rotation.set(0, 0, 0);
        }
        if (hlR.material instanceof THREE.MeshStandardMaterial) {
            hlR.material.color.set(0xffffee);
            hlR.material.emissive.set(0xfffae0);
            hlR.rotation.set(0, 0, 0);
        }
        if (tlL.material instanceof THREE.MeshStandardMaterial) {
            tlL.material.color.set(0xff2222);
            tlL.material.emissive.set(0xff0000);
        }
        if (tlR.material instanceof THREE.MeshStandardMaterial) {
            tlR.material.color.set(0xff2222);
            tlR.material.emissive.set(0xff0000);
        }

        // Reset Wheels alignment
        wheels.fl.rotation.z = 0;
        wheels.fr.rotation.z = 0;
        wheels.rl.rotation.z = 0;
        wheels.rr.rotation.z = 0;
    };

    return {
        root,
        bodyMesh,
        deformableGeo: baseGeo,
        originalPositions,
        currentPositions,
        deformableVertices,
        wheels,
        parts: {
            hood,
            bumperFront,
            bumperRear,
            windshield,
            roof: windshield,
            doors: [],
            radiator
        },
        headlights: [hlL, hlR],
        taillights: [tlL, tlR],
        config,
        applyImpactDeformation,
        charredBurnedState,
        resetToFactory
    };
}
