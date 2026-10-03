import * as THREE from 'three';
import { AircraftConfig, AircraftMeshBundle } from '../types';

export function buildAircraftMesh(config: AircraftConfig): AircraftMeshBundle {
    const group = new THREE.Group();
    group.name = `aircraft_${config.id}`;

    const propellers: THREE.Object3D[] = [];
    const landingGears: THREE.Object3D[] = [];
    const ailerons: { left?: THREE.Object3D; right?: THREE.Object3D } = {};
    const elevators: THREE.Object3D[] = [];
    let rudder: THREE.Object3D | undefined;
    const navLights: THREE.Light[] = [];
    const exhaustAnchors: THREE.Vector3[] = [];

    const bodyMat = new THREE.MeshStandardMaterial({
        color: config.primaryColor,
        roughness: 0.35,
        metalness: config.category === 'Fighter' ? 0.6 : 0.2
    });

    const secMat = new THREE.MeshStandardMaterial({
        color: config.secondaryColor,
        roughness: 0.4,
        metalness: 0.3
    });

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.7
    });

    const metalMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.5,
        metalness: 0.8
    });

    const wheelMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.9,
        metalness: 0.1
    });

    let gearDownY = 0;
    let gearUpY = 0.8;

    if (config.id === 'f22_raptor') {
        // --- F-22 RAPTOR (STEALTH FIGHTER) ---
        // Angular stealth fuselage
        const fuseGeo = new THREE.ConeGeometry(1.6, 12, 5);
        fuseGeo.rotateX(Math.PI / 2);
        fuseGeo.scale(1.2, 0.4, 1);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // Canopy bubble
        const canopyGeo = new THREE.SphereGeometry(0.7, 16, 12);
        canopyGeo.scale(0.7, 0.6, 2.2);
        const canopy = new THREE.Mesh(canopyGeo, glassMat);
        canopy.position.set(0, 0.35, 1.2);
        group.add(canopy);

        // Stealth trapezoidal wings
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(4.8, -2.5);
        wingShape.lineTo(4.2, -4.2);
        wingShape.lineTo(0, -3.2);
        wingShape.closePath();
        const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.12, bevelEnabled: false });
        wingGeo.rotateX(Math.PI / 2);

        const leftWing = new THREE.Mesh(wingGeo, bodyMat);
        leftWing.castShadow = true;
        group.add(leftWing);

        const rightWingGeo = wingGeo.clone();
        rightWingGeo.scale(-1, 1, 1);
        const rightWing = new THREE.Mesh(rightWingGeo, bodyMat);
        rightWing.castShadow = true;
        group.add(rightWing);

        // Twin canted vertical stabilizers
        const finGeo = new THREE.BoxGeometry(0.12, 1.8, 1.6);
        const leftFin = new THREE.Mesh(finGeo, bodyMat);
        leftFin.position.set(1.1, 0.9, -3.2);
        leftFin.rotation.z = -0.35;
        group.add(leftFin);

        const rightFin = new THREE.Mesh(finGeo, bodyMat);
        rightFin.position.set(-1.1, 0.9, -3.2);
        rightFin.rotation.z = 0.35;
        group.add(rightFin);

        // Twin afterburner exhausts
        const nozGeo = new THREE.CylinderGeometry(0.42, 0.46, 1.2, 16);
        nozGeo.rotateX(Math.PI / 2);
        const leftNoz = new THREE.Mesh(nozGeo, metalMat);
        leftNoz.position.set(0.65, 0, -5.2);
        const rightNoz = new THREE.Mesh(nozGeo, metalMat);
        rightNoz.position.set(-0.65, 0, -5.2);
        group.add(leftNoz, rightNoz);

        exhaustAnchors.push(new THREE.Vector3(0.65, 0, -5.8));
        exhaustAnchors.push(new THREE.Vector3(-0.65, 0, -5.8));

        // Retractable Landing Gear
        const gearGroup = new THREE.Group();
        const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2);
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.18, 12);
        wheelGeo.rotateZ(Math.PI / 2);

        // Nose gear
        const noseStrut = new THREE.Mesh(strutGeo, metalMat);
        noseStrut.position.set(0, -0.6, 2.5);
        const noseWheel = new THREE.Mesh(wheelGeo, wheelMat);
        noseWheel.position.set(0, -1.1, 2.5);
        gearGroup.add(noseStrut, noseWheel);

        // Main gears
        [-1.2, 1.2].forEach(x => {
            const mStrut = new THREE.Mesh(strutGeo, metalMat);
            mStrut.position.set(x, -0.6, -1.0);
            const mWheel = new THREE.Mesh(wheelGeo, wheelMat);
            mWheel.position.set(x, -1.1, -1.0);
            gearGroup.add(mStrut, mWheel);
        });
        group.add(gearGroup);
        landingGears.push(gearGroup);
        gearDownY = 0;
        gearUpY = 1.0;

    } else if (config.id === 'ufo') {
        // --- UFO / ALIEN SAUCER ---
        const saucerGeo = new THREE.CylinderGeometry(4.5, 5.0, 0.8, 32);
        const saucer = new THREE.Mesh(saucerGeo, bodyMat);
        saucer.castShadow = true;
        group.add(saucer);

        // Glowing perimeter ring
        const ringGeo = new THREE.TorusGeometry(4.7, 0.18, 12, 32);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        group.add(ringMesh);

        // Cockpit dome
        const domeGeo = new THREE.SphereGeometry(1.8, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const dome = new THREE.Mesh(domeGeo, glassMat);
        dome.position.y = 0.4;
        group.add(dome);

        // Thruster anchor
        exhaustAnchors.push(new THREE.Vector3(0, -0.4, 0));

    } else if (config.id === 'biplane') {
        // --- VINTAGE BIPLANE ---
        const fuseGeo = new THREE.CylinderGeometry(0.65, 0.45, 6.2, 16);
        fuseGeo.rotateX(Math.PI / 2);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // Top Wing & Bottom Wing
        const wingGeo = new THREE.BoxGeometry(7.2, 0.1, 1.2);
        const topWing = new THREE.Mesh(wingGeo, bodyMat);
        topWing.position.set(0, 0.85, 0.4);
        topWing.castShadow = true;
        const bottomWing = new THREE.Mesh(wingGeo, bodyMat);
        bottomWing.position.set(0, -0.2, 0.4);
        bottomWing.castShadow = true;
        group.add(topWing, bottomWing);

        // Struts
        const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.05);
        [-2.8, 2.8].forEach(x => {
            const s1 = new THREE.Mesh(strutGeo, metalMat);
            s1.position.set(x, 0.32, 0.7);
            const s2 = new THREE.Mesh(strutGeo, metalMat);
            s2.position.set(x, 0.32, 0.1);
            group.add(s1, s2);
        });

        // Tail
        const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.0), bodyMat);
        tailFin.position.set(0, 0.55, -2.8);
        rudder = tailFin;
        const tailPlane = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.8), bodyMat);
        tailPlane.position.set(0, 0.15, -2.8);
        elevators.push(tailPlane);
        group.add(tailFin, tailPlane);

        // Front Propeller
        const propGroup = new THREE.Group();
        propGroup.position.set(0, 0, 3.15);
        const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 12), metalMat);
        spinner.rotateX(Math.PI / 2);
        const bladeGeo = new THREE.BoxGeometry(2.2, 0.12, 0.03);
        const blades = new THREE.Mesh(bladeGeo, secMat);
        propGroup.add(spinner, blades);
        group.add(propGroup);
        propellers.push(propGroup);

        // Fixed landing gear
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        [-0.9, 0.9].forEach(x => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0), metalMat);
            leg.position.set(x, -0.6, 0.8);
            leg.rotation.z = x > 0 ? -0.2 : 0.2;
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(x * 1.1, -1.0, 0.8);
            group.add(leg, wheel);
            landingGears.push(wheel);
        });

    } else if (config.id === 'seaplane') {
        // --- TWIN OTTER SEAPLANE (WITH FLOATS) ---
        const fuseGeo = new THREE.BoxGeometry(1.6, 1.7, 9.5);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // High Wing
        const wingGeo = new THREE.BoxGeometry(14.0, 0.16, 1.8);
        const wing = new THREE.Mesh(wingGeo, bodyMat);
        wing.position.set(0, 0.9, 0.8);
        wing.castShadow = true;
        group.add(wing);

        // Twin Props on Wing
        [-2.8, 2.8].forEach(x => {
            const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 2.2, 12), metalMat);
            nacelle.rotateX(Math.PI / 2);
            nacelle.position.set(x, 0.9, 1.0);
            group.add(nacelle);

            const prop = new THREE.Group();
            prop.position.set(x, 0.9, 2.15);
            const blades = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.03), secMat);
            prop.add(blades);
            group.add(prop);
            propellers.push(prop);
        });

        // Twin Floats (Pontoons)
        const floatGeo = new THREE.CylinderGeometry(0.35, 0.35, 7.5, 12);
        floatGeo.rotateX(Math.PI / 2);
        [-1.8, 1.8].forEach(x => {
            const p = new THREE.Mesh(floatGeo, secMat);
            p.position.set(x, -1.6, 0.3);
            p.castShadow = true;
            group.add(p);

            // Struts connecting float to fuselage
            const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), metalMat);
            s1.position.set(x * 0.7, -1.0, 1.5);
            const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), metalMat);
            s2.position.set(x * 0.7, -1.0, -1.0);
            group.add(s1, s2);
        });

        // T-Tail
        const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 1.8), bodyMat);
        vFin.position.set(0, 1.8, -4.2);
        const hTail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 1.2), bodyMat);
        hTail.position.set(0, 2.8, -4.2);
        group.add(vFin, hTail);

    } else if (config.id === 'boeing_747' || config.id === 'airliner_a320' || config.id === 'concorde') {
        // --- COMMERCIAL PASSENGER JETS & CONCORDE ---
        const is747 = config.id === 'boeing_747';
        const isConcorde = config.id === 'concorde';
        const length = is747 ? 18.0 : isConcorde ? 16.0 : 12.0;
        const radius = is747 ? 1.6 : isConcorde ? 0.9 : 1.1;

        // Fuselage
        const fuseGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
        fuseGeo.rotateX(Math.PI / 2);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // 747 Upper Deck Hump
        if (is747) {
            const humpGeo = new THREE.CylinderGeometry(1.2, 1.5, 7.0, 16);
            humpGeo.rotateX(Math.PI / 2);
            const hump = new THREE.Mesh(humpGeo, bodyMat);
            hump.position.set(0, 0.8, length * 0.2);
            group.add(hump);
        }

        // Nose Cone
        const noseGeo = isConcorde ? new THREE.ConeGeometry(radius, 3.5, 24) : new THREE.SphereGeometry(radius, 16, 12);
        if (isConcorde) noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, secMat);
        nose.position.set(0, 0, length * 0.5 + (isConcorde ? 1.75 : 0));
        group.add(nose);

        // Wings
        if (isConcorde) {
            // Delta wing
            const deltaShape = new THREE.Shape();
            deltaShape.moveTo(0, 2);
            deltaShape.lineTo(6.5, -6);
            deltaShape.lineTo(0, -6.5);
            deltaShape.closePath();
            const dGeo = new THREE.ExtrudeGeometry(deltaShape, { depth: 0.15, bevelEnabled: false });
            dGeo.rotateX(Math.PI / 2);
            const leftD = new THREE.Mesh(dGeo, bodyMat);
            const rightDGeo = dGeo.clone().scale(-1, 1, 1);
            const rightD = new THREE.Mesh(rightDGeo, bodyMat);
            group.add(leftD, rightD);
        } else {
            // Swept wings
            const span = is747 ? 18.0 : 11.0;
            const wingGeo = new THREE.BoxGeometry(span, 0.2, 2.6);
            wingGeo.rotateY(0.25);
            const leftW = new THREE.Mesh(wingGeo, bodyMat);
            leftW.position.set(span * 0.25, -0.2, 0);
            leftW.rotation.z = 0.08; // dihedral
            group.add(leftW);

            const rightW = leftW.clone();
            rightW.scale.set(-1, 1, 1);
            group.add(rightW);
        }

        // Jet Engines (Turbofans)
        const engineCount = config.engineCount;
        const engRadius = is747 ? 0.65 : 0.45;
        const engPositions = engineCount === 4 
            ? [-4.8, -2.4, 2.4, 4.8] 
            : [-2.6, 2.6];

        engPositions.forEach(x => {
            const engGeo = new THREE.CylinderGeometry(engRadius, engRadius * 0.9, 2.2, 16);
            engGeo.rotateX(Math.PI / 2);
            const eng = new THREE.Mesh(engGeo, metalMat);
            eng.position.set(x, isConcorde ? -0.8 : -0.7, isConcorde ? -4.5 : 0.2);
            group.add(eng);

            // Glowing exhaust ring
            exhaustAnchors.push(new THREE.Vector3(x, eng.position.y, eng.position.z - 1.2));
        });

        // Vertical Tail Fin
        const tailH = is747 ? 4.2 : 2.8;
        const finGeo = new THREE.BoxGeometry(0.15, tailH, tailH * 0.8);
        const fin = new THREE.Mesh(finGeo, secMat);
        fin.position.set(0, tailH * 0.5 + radius * 0.5, -length * 0.42);
        fin.rotation.x = -0.3;
        group.add(fin);

        // Retractable Landing Gear
        const gearGroup = new THREE.Group();
        const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8);
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 16);
        wheelGeo.rotateZ(Math.PI / 2);

        // Nose wheel
        const nStrut = new THREE.Mesh(strutGeo, metalMat);
        nStrut.position.set(0, -1.0, length * 0.35);
        const nWheel = new THREE.Mesh(wheelGeo, wheelMat);
        nWheel.position.set(0, -1.8, length * 0.35);
        gearGroup.add(nStrut, nWheel);

        // Main wheels
        [-1.6, 1.6].forEach(x => {
            const mStrut = new THREE.Mesh(strutGeo, metalMat);
            mStrut.position.set(x, -1.0, 0);
            const mWheel = new THREE.Mesh(wheelGeo, wheelMat);
            mWheel.position.set(x, -1.8, 0);
            gearGroup.add(mStrut, mWheel);
        });

        group.add(gearGroup);
        landingGears.push(gearGroup);
        gearDownY = 0;
        gearUpY = 1.6;

    } else {
        // --- CESSNA 172 SKYHAWK (DEFAULT TRAINER) ---
        // High-wing classic trainer
        const fuseGeo = new THREE.CylinderGeometry(0.7, 0.4, 7.5, 16);
        fuseGeo.rotateX(Math.PI / 2);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // Cockpit windshield & side windows
        const windGeo = new THREE.BoxGeometry(1.0, 0.7, 1.8);
        const wind = new THREE.Mesh(windGeo, glassMat);
        wind.position.set(0, 0.5, 0.8);
        group.add(wind);

        // High Wing
        const wingGeo = new THREE.BoxGeometry(9.6, 0.12, 1.4);
        const wing = new THREE.Mesh(wingGeo, bodyMat);
        wing.position.set(0, 0.85, 0.6);
        wing.castShadow = true;
        group.add(wing);

        // Wing Struts
        const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6);
        [-2.2, 2.2].forEach(x => {
            const s = new THREE.Mesh(strutGeo, metalMat);
            s.position.set(x, 0.1, 0.6);
            s.rotation.z = x > 0 ? -0.5 : 0.5;
            group.add(s);
        });

        // Tail Fin (Vertical Stabilizer & Rudder)
        const finGeo = new THREE.BoxGeometry(0.08, 1.4, 1.2);
        const fin = new THREE.Mesh(finGeo, secMat);
        fin.position.set(0, 0.8, -3.2);
        rudder = fin;
        group.add(fin);

        // Horizontal Stabilizer & Elevators
        const hTailGeo = new THREE.BoxGeometry(3.0, 0.08, 0.8);
        const hTail = new THREE.Mesh(hTailGeo, bodyMat);
        hTail.position.set(0, 0.25, -3.3);
        elevators.push(hTail);
        group.add(hTail);

        // Front Propeller
        const propGroup = new THREE.Group();
        propGroup.position.set(0, 0, 3.8);
        const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 12), metalMat);
        spinner.rotateX(Math.PI / 2);
        const bladeGeo = new THREE.BoxGeometry(2.0, 0.1, 0.02);
        const blades = new THREE.Mesh(bladeGeo, secMat);
        propGroup.add(spinner, blades);
        group.add(propGroup);
        propellers.push(propGroup);

        // Tricycle Landing Gear
        const gearGroup = new THREE.Group();
        const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.14, 16);
        wheelGeo.rotateZ(Math.PI / 2);

        // Nose gear
        const nLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9), metalMat);
        nLeg.position.set(0, -0.5, 2.2);
        const nWheel = new THREE.Mesh(wheelGeo, wheelMat);
        nWheel.position.set(0, -0.9, 2.2);
        gearGroup.add(nLeg, nWheel);

        // Main gear (left/right)
        [-0.95, 0.95].forEach(x => {
            const mLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0), metalMat);
            mLeg.position.set(x, -0.55, 0.2);
            mLeg.rotation.z = x > 0 ? -0.2 : 0.2;
            const mWheel = new THREE.Mesh(wheelGeo, wheelMat);
            mWheel.position.set(x * 1.15, -0.9, 0.2);
            gearGroup.add(mLeg, mWheel);
        });

        group.add(gearGroup);
        landingGears.push(gearGroup);
    }

    // Navigation Lights (Red left, Green right, White tail)
    const wingSpanHalf = config.wingSpanMeters * 0.45;
    const redLight = new THREE.PointLight(0xff0000, 1.5, 20);
    redLight.position.set(-wingSpanHalf, 0, 0);
    const greenLight = new THREE.PointLight(0x00ff00, 1.5, 20);
    greenLight.position.set(wingSpanHalf, 0, 0);
    group.add(redLight, greenLight);
    navLights.push(redLight, greenLight);

    return {
        group,
        bodyMesh: group,
        propellers,
        landingGears,
        ailerons,
        elevators,
        rudder,
        navLights,
        wingtipAnchors: {
            left: new THREE.Vector3(-wingSpanHalf, 0, 0),
            right: new THREE.Vector3(wingSpanHalf, 0, 0)
        },
        exhaustAnchors,
        gearDownY,
        gearUpY
    };
}
