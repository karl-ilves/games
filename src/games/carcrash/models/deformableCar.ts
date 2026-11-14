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
    };
    headlights: THREE.Mesh[];
    taillights: THREE.Mesh[];
    config: VehicleConfig;
    applyImpactDeformation: (localContactPt: THREE.Vector3, impactForceVec: THREE.Vector3, stiffness: number) => { deformedCount: number; damagePercent: number };
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
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, height * 0.4, length * 0.45), glassMat);
    windshield.position.set(0, height * 0.75, 0);
    root.add(windshield);

    // 3. Detachable / Crumpling Bumpers
    const bumperMat = new THREE.MeshStandardMaterial({ color: config.secondaryColor, roughness: 0.5, metalness: 0.6 });
    const bumperFront = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, height * 0.25, 0.25), bumperMat);
    bumperFront.position.set(0, height * 0.28, length * 0.51);
    root.add(bumperFront);

    const bumperRear = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, height * 0.25, 0.25), bumperMat);
    bumperRear.position.set(0, height * 0.28, -length * 0.51);
    root.add(bumperRear);

    // 4. Wheels
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

    // 5. Lights
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

    // Real-Time Soft-Body Deformation Function
    const applyImpactDeformation = (localContactPt: THREE.Vector3, impactForceVec: THREE.Vector3, vehicleStiffness: number) => {
        const forceMagnitude = impactForceVec.length();
        if (forceMagnitude < 1.0) return { deformedCount: 0, damagePercent: 0 };

        const radius = Math.min(2.5, 0.8 + (forceMagnitude / 50.0) * (1.2 / vehicleStiffness));
        const impactDir = impactForceVec.clone().normalize();
        const maxDisplacement = Math.min(1.4, (forceMagnitude / 35.0) * (1.0 / vehicleStiffness));

        let deformedNodes = 0;
        let totalDispMagnitude = 0;

        for (let i = 0; i < vertexCount; i++) {
            const v = deformableVertices[i];
            const dist = v.current.distanceTo(localContactPt);

            if (dist < radius) {
                // Bell curve falloff
                const factor = Math.cos((dist / radius) * (Math.PI / 2));
                const push = impactDir.clone().multiplyScalar(maxDisplacement * factor);

                // Add slight chaotic crumple wrinkle
                const noise = (Math.sin(v.original.x * 12.0) + Math.cos(v.original.z * 12.0)) * 0.08 * factor;
                push.y += noise;

                v.current.add(push);
                v.displacement.copy(v.current).sub(v.original);

                posAttr.setXYZ(i, v.current.x, v.current.y, v.current.z);
                deformedNodes++;
            }

            totalDispMagnitude += v.displacement.length();
        }

        posAttr.needsUpdate = true;
        baseGeo.computeVertexNormals();

        // Also deform bumpers & windshield if hit nearby
        if (localContactPt.z > length * 0.3) {
            bumperFront.position.z -= Math.min(0.8, maxDisplacement * 0.7);
            bumperFront.rotation.x += (Math.random() - 0.5) * 0.3;
        } else if (localContactPt.z < -length * 0.3) {
            bumperRear.position.z += Math.min(0.8, maxDisplacement * 0.7);
            bumperRear.rotation.x += (Math.random() - 0.5) * 0.3;
        }

        // Damage percentage relative to total lattice capacity
        const damagePercent = Math.min(100, Math.round((totalDispMagnitude / (vertexCount * 0.25)) * 100));

        return { deformedCount: deformedNodes, damagePercent };
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

        bumperFront.position.set(0, height * 0.28, length * 0.51);
        bumperFront.rotation.set(0, 0, 0);
        bumperRear.position.set(0, height * 0.28, -length * 0.51);
        bumperRear.rotation.set(0, 0, 0);
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
            hood: bumperFront,
            bumperFront,
            bumperRear,
            windshield,
            roof: windshield,
            doors: []
        },
        headlights: [hlL, hlR],
        taillights: [tlL, tlR],
        config,
        applyImpactDeformation,
        resetToFactory
    };
}
