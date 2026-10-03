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
        metalness: config.category === 'Fighter' ? 0.6 : 0.2,
        side: THREE.DoubleSide
    });

    const secMat = new THREE.MeshStandardMaterial({
        color: config.secondaryColor,
        roughness: 0.4,
        metalness: 0.3,
        side: THREE.DoubleSide
    });

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85
    });

    const metalMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.4,
        metalness: 0.8
    });

    const wheelMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.9,
        metalness: 0.1
    });

    let gearDownY = 0;
    let gearUpY = 1.0;

    if (config.id === 'f22_raptor') {
        // ==========================================
        // ⚡ F-22 RAPTOR (5TH GEN STEALTH FIGHTER)
        // ==========================================
        // Stealth Chined Fuselage
        const fuseGeo = new THREE.ConeGeometry(1.5, 13, 6);
        fuseGeo.rotateX(Math.PI / 2);
        fuseGeo.scale(1.4, 0.42, 1);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // Stealth Cockpit Canopy
        const canopyGeo = new THREE.SphereGeometry(0.7, 16, 12);
        canopyGeo.scale(0.65, 0.55, 2.5);
        const canopy = new THREE.Mesh(canopyGeo, glassMat);
        canopy.position.set(0, 0.35, 1.6);
        group.add(canopy);

        // Symmetric Diamond Wings (Left and Right)
        const halfSpan = 5.2;
        const leftWingGeo = new THREE.BufferGeometry();
        // Triangle strip / polygon for diamond wing
        const leftVerts = new Float32Array([
            0, 0, 1.2,        // Root leading edge
            halfSpan, 0, -2.6, // Wingtip leading edge
            halfSpan - 0.6, 0, -4.2, // Wingtip trailing edge
            
            0, 0, 1.2,
            halfSpan - 0.6, 0, -4.2,
            0, 0, -3.2        // Root trailing edge
        ]);
        leftWingGeo.setAttribute('position', new THREE.BufferAttribute(leftVerts, 3));
        leftWingGeo.computeVertexNormals();
        const leftWing = new THREE.Mesh(leftWingGeo, bodyMat);
        leftWing.castShadow = true;

        const rightWingGeo = new THREE.BufferGeometry();
        const rightVerts = new Float32Array([
            0, 0, 1.2,
            -halfSpan, 0, -2.6,
            -(halfSpan - 0.6), 0, -4.2,

            0, 0, 1.2,
            -(halfSpan - 0.6), 0, -4.2,
            0, 0, -3.2
        ]);
        rightWingGeo.setAttribute('position', new THREE.BufferAttribute(rightVerts, 3));
        rightWingGeo.computeVertexNormals();
        const rightWing = new THREE.Mesh(rightWingGeo, bodyMat);
        rightWing.castShadow = true;
        group.add(leftWing, rightWing);

        // Twin Canted Vertical Fins (Tilted ~28 degrees)
        const finGeo = new THREE.BoxGeometry(0.1, 2.2, 1.8);
        const leftFin = new THREE.Mesh(finGeo, bodyMat);
        leftFin.position.set(1.3, 1.0, -3.8);
        leftFin.rotation.z = -0.42; // canted outward
        leftFin.rotation.x = -0.15;

        const rightFin = new THREE.Mesh(finGeo, bodyMat);
        rightFin.position.set(-1.3, 1.0, -3.8);
        rightFin.rotation.z = 0.42;
        rightFin.rotation.x = -0.15;
        group.add(leftFin, rightFin);

        // Horizontal Stabilators
        const hTailGeo = new THREE.BoxGeometry(2.4, 0.08, 1.5);
        const leftHTail = new THREE.Mesh(hTailGeo, bodyMat);
        leftHTail.position.set(1.8, -0.05, -5.0);
        leftHTail.rotation.y = -0.25;

        const rightHTail = new THREE.Mesh(hTailGeo, bodyMat);
        rightHTail.position.set(-1.8, -0.05, -5.0);
        rightHTail.rotation.y = 0.25;
        group.add(leftHTail, rightHTail);
        elevators.push(leftHTail, rightHTail);

        // Twin Afterburner Jet Nozzles
        const nozGeo = new THREE.CylinderGeometry(0.48, 0.52, 1.4, 16);
        nozGeo.rotateX(Math.PI / 2);
        const leftNoz = new THREE.Mesh(nozGeo, metalMat);
        leftNoz.position.set(0.7, 0, -5.8);
        const rightNoz = new THREE.Mesh(nozGeo, metalMat);
        rightNoz.position.set(-0.7, 0, -5.8);
        group.add(leftNoz, rightNoz);

        exhaustAnchors.push(new THREE.Vector3(0.7, 0, -6.6));
        exhaustAnchors.push(new THREE.Vector3(-0.7, 0, -6.6));

        // Retractable Landing Gear
        const gearGroup = new THREE.Group();
        const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2);
        const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.18, 16);
        wheelGeo.rotateZ(Math.PI / 2);

        // Nose wheel
        const nStrut = new THREE.Mesh(strutGeo, metalMat);
        nStrut.position.set(0, -0.65, 3.2);
        const nWheel = new THREE.Mesh(wheelGeo, wheelMat);
        nWheel.position.set(0, -1.25, 3.2);
        gearGroup.add(nStrut, nWheel);

        // Main wheels
        [-1.3, 1.3].forEach(x => {
            const mStrut = new THREE.Mesh(strutGeo, metalMat);
            mStrut.position.set(x, -0.65, -0.8);
            const mWheel = new THREE.Mesh(wheelGeo, wheelMat);
            mWheel.position.set(x, -1.25, -0.8);
            gearGroup.add(mStrut, mWheel);
        });

        group.add(gearGroup);
        landingGears.push(gearGroup);
        gearDownY = 0;
        gearUpY = 1.3;

    } else if (config.id === 'ufo') {
        // ==========================================
        // 🛸 APEX UFO (EXPERIMENTAL ALIEN SAUCER)
        // ==========================================
        const saucerGeo = new THREE.CylinderGeometry(4.8, 5.4, 0.9, 32);
        const saucer = new THREE.Mesh(saucerGeo, bodyMat);
        saucer.castShadow = true;
        group.add(saucer);

        // Neon Glow Ring
        const ringGeo = new THREE.TorusGeometry(5.2, 0.22, 12, 32);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        group.add(ringMesh);

        // Upper Cockpit Dome
        const domeGeo = new THREE.SphereGeometry(2.0, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const dome = new THREE.Mesh(domeGeo, glassMat);
        dome.position.y = 0.45;
        group.add(dome);

        // Lower Antigravity Emitter
        const emitGeo = new THREE.CylinderGeometry(1.6, 2.2, 0.5, 24);
        const emit = new THREE.Mesh(emitGeo, metalMat);
        emit.position.y = -0.55;
        group.add(emit);

        exhaustAnchors.push(new THREE.Vector3(0, -0.8, 0));

    } else if (config.id === 'biplane') {
        // ==========================================
        // 🎪 PITTS SPECIAL BIPLANE (VINTAGE AEROBATIC)
        // ==========================================
        const fuseGeo = new THREE.CylinderGeometry(0.7, 0.42, 6.4, 16);
        fuseGeo.rotateX(Math.PI / 2);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // Upper & Lower Wings
        const wingSpan = 7.6;
        const upperWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.12, 1.3), bodyMat);
        upperWing.position.set(0, 0.9, 0.5);
        upperWing.castShadow = true;

        const lowerWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan * 0.92, 0.12, 1.2), bodyMat);
        lowerWing.position.set(0, -0.2, 0.4);
        lowerWing.castShadow = true;
        group.add(upperWing, lowerWing);

        // Interplane Struts
        const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1);
        [-3.0, 3.0].forEach(x => {
            const s1 = new THREE.Mesh(strutGeo, metalMat);
            s1.position.set(x, 0.35, 0.7);
            const s2 = new THREE.Mesh(strutGeo, metalMat);
            s2.position.set(x, 0.35, 0.2);
            group.add(s1, s2);
        });

        // Tail
        const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 1.2), bodyMat);
        vFin.position.set(0, 0.65, -3.0);
        rudder = vFin;
        const hTail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.9), bodyMat);
        hTail.position.set(0, 0.2, -3.0);
        elevators.push(hTail);
        group.add(vFin, hTail);

        // Propeller
        const propGroup = new THREE.Group();
        propGroup.position.set(0, 0, 3.25);
        const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 12), metalMat);
        spinner.rotateX(Math.PI / 2);
        const blades = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.03), secMat);
        propGroup.add(spinner, blades);
        group.add(propGroup);
        propellers.push(propGroup);

        // Landing Gear
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.16, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        [-0.95, 0.95].forEach(x => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9), metalMat);
            leg.position.set(x * 0.7, -0.55, 0.9);
            leg.rotation.z = x > 0 ? -0.2 : 0.2;
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(x, -1.0, 0.9);
            group.add(leg, wheel);
            landingGears.push(wheel);
        });

    } else if (config.id === 'seaplane') {
        // ==========================================
        // 🌊 TWIN OTTER SEAPLANE (WITH FLOATS)
        // ==========================================
        const fuseGeo = new THREE.BoxGeometry(1.8, 1.9, 10.0);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // High Wing
        const wingGeo = new THREE.BoxGeometry(14.5, 0.18, 2.0);
        const wing = new THREE.Mesh(wingGeo, bodyMat);
        wing.position.set(0, 1.05, 0.8);
        wing.castShadow = true;
        group.add(wing);

        // Twin Engines on Wings
        [-3.2, 3.2].forEach(x => {
            const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 2.4, 16), metalMat);
            nacelle.rotateX(Math.PI / 2);
            nacelle.position.set(x, 1.05, 1.1);
            group.add(nacelle);

            const prop = new THREE.Group();
            prop.position.set(x, 1.05, 2.35);
            const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 12), metalMat);
            spinner.rotateX(Math.PI / 2);
            const blades = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.03), secMat);
            prop.add(spinner, blades);
            group.add(prop);
            propellers.push(prop);
        });

        // Twin Catamaran Floats / Pontoons
        const floatGeo = new THREE.CylinderGeometry(0.42, 0.42, 8.5, 16);
        floatGeo.rotateX(Math.PI / 2);
        [-2.0, 2.0].forEach(x => {
            const p = new THREE.Mesh(floatGeo, secMat);
            p.position.set(x, -1.35, 0.4);
            p.castShadow = true;
            group.add(p);

            // Strong structural struts
            const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1), metalMat);
            s1.position.set(x * 0.7, -0.85, 1.8);
            s1.rotation.z = x > 0 ? -0.25 : 0.25;

            const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1), metalMat);
            s2.position.set(x * 0.7, -0.85, -1.0);
            s2.rotation.z = x > 0 ? -0.25 : 0.25;
            group.add(s1, s2);
        });

        // T-Tail
        const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 2.0), bodyMat);
        vFin.position.set(0, 2.0, -4.5);
        rudder = vFin;

        const hTail = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 1.3), bodyMat);
        hTail.position.set(0, 3.1, -4.5);
        elevators.push(hTail);
        group.add(vFin, hTail);

    } else if (config.id === 'boeing_747' || config.id === 'airliner_a320' || config.id === 'concorde') {
        // ==========================================
        // 🛫 COMMERCIAL JETS & CONCORDE
        // ==========================================
        const is747 = config.id === 'boeing_747';
        const isConcorde = config.id === 'concorde';
        const length = is747 ? 19.0 : (isConcorde ? 17.0 : 13.0);
        const radius = is747 ? 1.7 : (isConcorde ? 0.95 : 1.15);

        // Fuselage
        const fuseGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
        fuseGeo.rotateX(Math.PI / 2);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // 747 Upper Deck Hump
        if (is747) {
            const humpGeo = new THREE.CylinderGeometry(1.3, 1.6, 7.5, 16);
            humpGeo.rotateX(Math.PI / 2);
            const hump = new THREE.Mesh(humpGeo, bodyMat);
            hump.position.set(0, 0.9, length * 0.22);
            group.add(hump);
        }

        // Nose Cone & Cockpit
        const noseGeo = isConcorde 
            ? new THREE.ConeGeometry(radius, 4.0, 24) 
            : new THREE.SphereGeometry(radius, 20, 16);
        if (isConcorde) noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, secMat);
        nose.position.set(0, 0, length * 0.5 + (isConcorde ? 2.0 : 0));
        group.add(nose);

        // Cockpit Window Band
        const cockGeo = new THREE.BoxGeometry(radius * 1.6, 0.45, 1.2);
        const cock = new THREE.Mesh(cockGeo, glassMat);
        cock.position.set(0, radius * 0.5, length * 0.45);
        group.add(cock);

        // Wings (Both Left and Right properly mirrored)
        if (isConcorde) {
            // Delta wing
            const dSpan = 6.8;
            const leftDGeo = new THREE.BufferGeometry();
            const leftDVerts = new Float32Array([
                0, 0, 3.0,
                dSpan, 0, -6.5,
                0, 0, -7.0
            ]);
            leftDGeo.setAttribute('position', new THREE.BufferAttribute(leftDVerts, 3));
            leftDGeo.computeVertexNormals();
            const leftD = new THREE.Mesh(leftDGeo, bodyMat);

            const rightDGeo = new THREE.BufferGeometry();
            const rightDVerts = new Float32Array([
                0, 0, 3.0,
                -dSpan, 0, -6.5,
                0, 0, -7.0
            ]);
            rightDGeo.setAttribute('position', new THREE.BufferAttribute(rightDVerts, 3));
            rightDGeo.computeVertexNormals();
            const rightD = new THREE.Mesh(rightDGeo, bodyMat);
            group.add(leftD, rightD);

        } else {
            // Swept wings for 747 and A320
            const halfSpan = is747 ? 10.5 : 6.5;
            const rootChord = is747 ? 3.8 : 2.5;
            const tipChord = is747 ? 1.4 : 1.0;
            const sweep = is747 ? 4.2 : 2.5;

            // Left Wing
            const leftWGeo = new THREE.BufferGeometry();
            const leftWVerts = new Float32Array([
                0, -0.2, rootChord * 0.5,
                halfSpan, 0.4, rootChord * 0.5 - sweep,
                halfSpan, 0.4, rootChord * 0.5 - sweep - tipChord,

                0, -0.2, rootChord * 0.5,
                halfSpan, 0.4, rootChord * 0.5 - sweep - tipChord,
                0, -0.2, -rootChord * 0.5
            ]);
            leftWGeo.setAttribute('position', new THREE.BufferAttribute(leftWVerts, 3));
            leftWGeo.computeVertexNormals();
            const leftW = new THREE.Mesh(leftWGeo, bodyMat);
            leftW.castShadow = true;

            // Right Wing
            const rightWGeo = new THREE.BufferGeometry();
            const rightWVerts = new Float32Array([
                0, -0.2, rootChord * 0.5,
                -halfSpan, 0.4, rootChord * 0.5 - sweep - tipChord,
                -halfSpan, 0.4, rootChord * 0.5 - sweep,

                0, -0.2, rootChord * 0.5,
                0, -0.2, -rootChord * 0.5,
                -halfSpan, 0.4, rootChord * 0.5 - sweep - tipChord
            ]);
            rightWGeo.setAttribute('position', new THREE.BufferAttribute(rightWVerts, 3));
            rightWGeo.computeVertexNormals();
            const rightW = new THREE.Mesh(rightWGeo, bodyMat);
            rightW.castShadow = true;

            group.add(leftW, rightW);
        }

        // Turbofan Jet Engines
        const engineCount = config.engineCount;
        const engRadius = is747 ? 0.65 : 0.45;
        const engPositions = engineCount === 4 
            ? [-5.5, -2.8, 2.8, 5.5] 
            : [-2.8, 2.8];

        engPositions.forEach(x => {
            const engGeo = new THREE.CylinderGeometry(engRadius, engRadius * 0.92, 2.4, 20);
            engGeo.rotateX(Math.PI / 2);
            const eng = new THREE.Mesh(engGeo, metalMat);
            eng.position.set(x, isConcorde ? -0.8 : -0.85, isConcorde ? -4.5 : 0.2);
            group.add(eng);

            // Turbine spinner cone
            const spin = new THREE.Mesh(new THREE.ConeGeometry(engRadius * 0.35, 0.5, 12), bodyMat);
            spin.rotateX(-Math.PI / 2);
            spin.position.set(x, eng.position.y, eng.position.z + 1.25);
            group.add(spin);

            exhaustAnchors.push(new THREE.Vector3(x, eng.position.y, eng.position.z - 1.3));
        });

        // Tail Fin (Vertical Stabilizer)
        const tailH = is747 ? 4.5 : 3.0;
        const finGeo = new THREE.BoxGeometry(0.16, tailH, tailH * 0.85);
        const fin = new THREE.Mesh(finGeo, secMat);
        fin.position.set(0, tailH * 0.5 + radius * 0.5, -length * 0.42);
        fin.rotation.x = -0.32;
        group.add(fin);
        rudder = fin;

        // Horizontal Stabilizers (Tailplanes)
        const hTailSpan = is747 ? 8.2 : 5.4;
        const hTailGeo = new THREE.BoxGeometry(hTailSpan, 0.14, 1.8);
        const hTail = new THREE.Mesh(hTailGeo, bodyMat);
        hTail.position.set(0, radius * 0.4, -length * 0.44);
        group.add(hTail);
        elevators.push(hTail);

        // Retractable Landing Gear
        const gearGroup = new THREE.Group();
        const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8);
        const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 16);
        wheelGeo.rotateZ(Math.PI / 2);

        // Nose wheel
        const nStrut = new THREE.Mesh(strutGeo, metalMat);
        nStrut.position.set(0, -1.0, length * 0.36);
        const nWheel = new THREE.Mesh(wheelGeo, wheelMat);
        nWheel.position.set(0, -1.8, length * 0.36);
        gearGroup.add(nStrut, nWheel);

        // Main wheels
        [-1.8, 1.8].forEach(x => {
            const mStrut = new THREE.Mesh(strutGeo, metalMat);
            mStrut.position.set(x, -1.0, -0.2);
            const mWheel = new THREE.Mesh(wheelGeo, wheelMat);
            mWheel.position.set(x, -1.8, -0.2);
            gearGroup.add(mStrut, mWheel);
        });

        group.add(gearGroup);
        landingGears.push(gearGroup);
        gearDownY = 0;
        gearUpY = 1.8;

    } else {
        // ==========================================
        // 🛩️ CESSNA 172 SKYHAWK (LIGHT TRAINER)
        // ==========================================
        const fuseGeo = new THREE.CylinderGeometry(0.72, 0.42, 7.8, 16);
        fuseGeo.rotateX(Math.PI / 2);
        const fuse = new THREE.Mesh(fuseGeo, bodyMat);
        fuse.castShadow = true;
        group.add(fuse);

        // Cockpit Windshield & Glass Cabin
        const windGeo = new THREE.BoxGeometry(1.05, 0.72, 2.0);
        const wind = new THREE.Mesh(windGeo, glassMat);
        wind.position.set(0, 0.52, 0.9);
        group.add(wind);

        // High Wing
        const wingGeo = new THREE.BoxGeometry(10.2, 0.14, 1.5);
        const wing = new THREE.Mesh(wingGeo, bodyMat);
        wing.position.set(0, 0.88, 0.7);
        wing.castShadow = true;
        group.add(wing);

        // V-Struts
        const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.7);
        [-2.4, 2.4].forEach(x => {
            const s = new THREE.Mesh(strutGeo, metalMat);
            s.position.set(x * 0.65, 0.15, 0.7);
            s.rotation.z = x > 0 ? -0.45 : 0.45;
            group.add(s);
        });

        // Vertical Tail Fin
        const finGeo = new THREE.BoxGeometry(0.1, 1.5, 1.3);
        const fin = new THREE.Mesh(finGeo, secMat);
        fin.position.set(0, 0.85, -3.3);
        fin.rotation.x = -0.22;
        rudder = fin;
        group.add(fin);

        // Horizontal Stabilizer & Elevators
        const hTailGeo = new THREE.BoxGeometry(3.2, 0.08, 0.9);
        const hTail = new THREE.Mesh(hTailGeo, bodyMat);
        hTail.position.set(0, 0.28, -3.4);
        elevators.push(hTail);
        group.add(hTail);

        // Front Propeller
        const propGroup = new THREE.Group();
        propGroup.position.set(0, 0, 3.95);
        const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 12), metalMat);
        spinner.rotateX(Math.PI / 2);
        const blades = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.03), secMat);
        propGroup.add(spinner, blades);
        group.add(propGroup);
        propellers.push(propGroup);

        // Tricycle Landing Gear
        const gearGroup = new THREE.Group();
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
        wheelGeo.rotateZ(Math.PI / 2);

        // Nose wheel
        const nLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95), metalMat);
        nLeg.position.set(0, -0.55, 2.3);
        const nWheel = new THREE.Mesh(wheelGeo, wheelMat);
        nWheel.position.set(0, -0.98, 2.3);
        gearGroup.add(nLeg, nWheel);

        // Main wheels
        [-1.05, 1.05].forEach(x => {
            const mLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.05), metalMat);
            mLeg.position.set(x * 0.7, -0.58, 0.3);
            mLeg.rotation.z = x > 0 ? -0.22 : 0.22;
            const mWheel = new THREE.Mesh(wheelGeo, wheelMat);
            mWheel.position.set(x, -0.98, 0.3);
            gearGroup.add(mLeg, mWheel);
        });

        group.add(gearGroup);
        landingGears.push(gearGroup);
    }

    // Navigation Strobe Lights (Red port, Green starboard)
    const wingSpanHalf = config.wingSpanMeters * 0.45;
    const redLight = new THREE.PointLight(0xff0000, 1.8, 25);
    redLight.position.set(-wingSpanHalf, 0, 0);
    const greenLight = new THREE.PointLight(0x00ff00, 1.8, 25);
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
