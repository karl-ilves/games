import * as THREE from 'three';

export interface PoliceCarMeshContainer {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    frontLeftWheel: THREE.Group;
    frontRightWheel: THREE.Group;
    rearLeftWheel: THREE.Group;
    rearRightWheel: THREE.Group;
    strobeRed: THREE.Mesh;
    strobeBlue: THREE.Mesh;
    strobeLightRed: THREE.PointLight;
    strobeLightBlue: THREE.PointLight;
    updateStrobes: (timeSec: number) => void;
    updateSteeringAndSpin: (steerAngle: number, wheelSpin: number) => void;
}

export function createPoliceCarMesh(id = 'police'): PoliceCarMeshContainer {
    const root = new THREE.Group();
    root.name = 'PoliceCar_' + id;

    // Materials
    const blackMat = new THREE.MeshStandardMaterial({
        color: 0x1a1d20,
        roughness: 0.25,
        metalness: 0.5
    });

    const whiteMat = new THREE.MeshStandardMaterial({
        color: 0xf1f2f6,
        roughness: 0.3,
        metalness: 0.2
    });

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x1e272e,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.88
    });

    const tireMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8
    });

    const rimMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.3,
        metalness: 0.8
    });

    const pushBarMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.5,
        metalness: 0.8
    });

    const redStrobeMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.2,
        roughness: 0.1
    });

    const blueStrobeMat = new THREE.MeshStandardMaterial({
        color: 0x0055ff,
        emissive: 0x0055ff,
        emissiveIntensity: 0.2,
        roughness: 0.1
    });

    // 1. Lower Black Chassis (Front & Rear)
    const chassisGeo = new THREE.BoxGeometry(1.85, 0.46, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, blackMat);
    chassis.position.y = 0.46;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    root.add(chassis);

    // 2. White Side Door Panels (Classic Interceptor livery)
    const doorGeo = new THREE.BoxGeometry(1.87, 0.42, 1.8);
    const doors = new THREE.Mesh(doorGeo, whiteMat);
    doors.position.set(0, 0.47, 0.05);
    root.add(doors);

    // 3. Cabin & White Roof
    const cabinGeo = new THREE.BoxGeometry(1.42, 0.52, 2.1);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.86, -0.15);
    cabin.castShadow = true;
    root.add(cabin);

    const roofGeo = new THREE.BoxGeometry(1.38, 0.08, 1.75);
    const roof = new THREE.Mesh(roofGeo, whiteMat);
    roof.position.set(0, 1.14, -0.15);
    root.add(roof);

    // 4. Heavy Front Push Bumper (Bullbar)
    const pushBar = new THREE.Group();
    const barGeoH = new THREE.BoxGeometry(1.6, 0.12, 0.12);
    const barTop = new THREE.Mesh(barGeoH, pushBarMat);
    barTop.position.set(0, 0.65, 2.26);
    const barBot = new THREE.Mesh(barGeoH, pushBarMat);
    barBot.position.set(0, 0.38, 2.26);

    const barGeoV = new THREE.BoxGeometry(0.12, 0.45, 0.12);
    const barL = new THREE.Mesh(barGeoV, pushBarMat);
    barL.position.set(-0.45, 0.52, 2.26);
    const barR = new THREE.Mesh(barGeoV, pushBarMat);
    barR.position.set(0.45, 0.52, 2.26);

    pushBar.add(barTop, barBot, barL, barR);
    root.add(pushBar);

    // 5. Rooftop Lightbar with Strobes
    const lightBarBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.22), pushBarMat);
    lightBarBase.position.set(0, 1.20, -0.15);
    root.add(lightBarBase);

    // Left Strobe (Red)
    const strobeRed = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.18), redStrobeMat);
    strobeRed.position.set(-0.25, 1.28, -0.15);
    root.add(strobeRed);

    // Right Strobe (Blue)
    const strobeBlue = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.18), blueStrobeMat);
    strobeBlue.position.set(0.25, 1.28, -0.15);
    root.add(strobeBlue);

    // Point lights for ground & car body illumination
    const strobeLightRed = new THREE.PointLight(0xff0000, 0, 15, 2);
    strobeLightRed.position.set(-0.35, 1.35, -0.15);
    root.add(strobeLightRed);

    const strobeLightBlue = new THREE.PointLight(0x0055ff, 0, 15, 2);
    strobeLightBlue.position.set(0.35, 1.35, -0.15);
    root.add(strobeLightBlue);

    // 6. Wheels
    function buildWheel(): { group: THREE.Group; mesh: THREE.Mesh } {
        const pivot = new THREE.Group();
        const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 16);
        tireGeo.rotateZ(Math.PI / 2);
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.castShadow = true;

        const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.29, 12);
        rimGeo.rotateZ(Math.PI / 2);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        tire.add(rim);

        pivot.add(tire);
        return { group: pivot, mesh: tire };
    }

    const wheelFL = buildWheel();
    const wheelFR = buildWheel();
    const wheelRL = buildWheel();
    const wheelRR = buildWheel();

    const trackWidth = 0.94;
    const wheelBase = 1.35;

    wheelFL.group.position.set(-trackWidth, 0.36, wheelBase);
    wheelFR.group.position.set(trackWidth, 0.36, wheelBase);
    wheelRL.group.position.set(-trackWidth, 0.36, -wheelBase);
    wheelRR.group.position.set(trackWidth, 0.36, -wheelBase);

    root.add(wheelFL.group, wheelFR.group, wheelRL.group, wheelRR.group);

    // Overhead Police badge sprite
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'rgba(15, 25, 45, 0.85)';
        ctx.roundRect(4, 4, 120, 32, 8);
        ctx.fill();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚔 POLICE', 64, 20);
    }
    const badgeTexture = new THREE.CanvasTexture(canvas);
    const badgeMat = new THREE.SpriteMaterial({ map: badgeTexture, transparent: true });
    const badgeSprite = new THREE.Sprite(badgeMat);
    badgeSprite.scale.set(1.8, 0.55, 1);
    badgeSprite.position.set(0, 2.2, 0);
    root.add(badgeSprite);

    return {
        group: root,
        bodyMesh: chassis,
        frontLeftWheel: wheelFL.group,
        frontRightWheel: wheelFR.group,
        rearLeftWheel: wheelRL.group,
        rearRightWheel: wheelRR.group,
        strobeRed,
        strobeBlue,
        strobeLightRed,
        strobeLightBlue,
        updateStrobes: (timeSec: number) => {
            // Alternating rapid flash: 6Hz cycle with double strobe pulse
            const flashPhase = Math.sin(timeSec * 16);
            const isRedOn = flashPhase > 0.15;
            const isBlueOn = flashPhase < -0.15;

            redStrobeMat.emissiveIntensity = isRedOn ? 3.0 : 0.1;
            strobeLightRed.intensity = isRedOn ? 2.5 : 0.0;

            blueStrobeMat.emissiveIntensity = isBlueOn ? 3.0 : 0.1;
            strobeLightBlue.intensity = isBlueOn ? 2.5 : 0.0;
        },
        updateSteeringAndSpin: (steerAngle: number, wheelSpin: number) => {
            wheelFL.group.rotation.y = steerAngle;
            wheelFR.group.rotation.y = steerAngle;

            wheelFL.mesh.rotation.x = wheelSpin;
            wheelFR.mesh.rotation.x = wheelSpin;
            wheelRL.mesh.rotation.x = wheelSpin;
            wheelRR.mesh.rotation.x = wheelSpin;
        }
    };
}
