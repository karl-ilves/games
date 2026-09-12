import * as THREE from 'three';
import { AircraftConfig } from '../types';

export interface BuiltPlaneResult {
    rootGroup: THREE.Group;
    fuselage: THREE.Object3D;
    wingLeft: THREE.Object3D;
    wingRight: THREE.Object3D;
    tailFin: THREE.Object3D;
    tailHorizontal: THREE.Object3D;
    propellerMesh?: THREE.Mesh | THREE.Group;
    engines: THREE.Object3D[];
    gearGroup?: THREE.Group;
    debrisCandidates: THREE.Object3D[];
}

export class PlaneBuilder {
    /**
     * Builds a detailed procedural 3D model for any of the 11 aircraft.
     */
    public static build(config: AircraftConfig): BuiltPlaneResult {
        const root = new THREE.Group();
        root.name = `aircraft_${config.id}`;

        const matPrimary = new THREE.MeshStandardMaterial({
            color: config.colorPrimary,
            metalness: 0.3,
            roughness: 0.4
        });

        const matSecondary = new THREE.MeshStandardMaterial({
            color: config.colorSecondary,
            metalness: 0.4,
            roughness: 0.3
        });

        const matAccent = new THREE.MeshStandardMaterial({
            color: config.colorAccent,
            metalness: 0.5,
            roughness: 0.3
        });

        const matGlass = new THREE.MeshPhysicalMaterial({
            color: 0x1e90ff,
            transmission: 0.85,
            opacity: 0.9,
            transparent: true,
            roughness: 0.1,
            ior: 1.5
        });

        const matDark = new THREE.MeshStandardMaterial({
            color: 0x1e272e,
            roughness: 0.7
        });

        let fuselage: THREE.Object3D;
        let wingLeft: THREE.Object3D;
        let wingRight: THREE.Object3D;
        let tailFin: THREE.Object3D;
        let tailHorizontal: THREE.Object3D;
        let propellerMesh: THREE.Mesh | THREE.Group | undefined;
        const engines: THREE.Object3D[] = [];
        const debrisCandidates: THREE.Object3D[] = [];

        switch (config.meshType) {
            case 'cessna': {
                // Cessna 172: High wing, single nose prop
                // Fuselage
                const fuseGeom = new THREE.CylinderGeometry(0.7, 0.4, 6.5, 12);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);
                fuselage.castShadow = true;

                // Cockpit Glass
                const cockGeom = new THREE.BoxGeometry(1.2, 0.9, 2.0);
                const cockpit = new THREE.Mesh(cockGeom, matGlass);
                cockpit.position.set(0, 0.5, 0.6);
                fuselage.add(cockpit);

                // High Wings
                const wingGeom = new THREE.BoxGeometry(5.0, 0.12, 1.2);
                wingLeft = new THREE.Mesh(wingGeom, matPrimary);
                wingLeft.position.set(-2.8, 0.9, 0.5);
                wingLeft.rotation.z = 0.03;

                wingRight = new THREE.Mesh(wingGeom, matPrimary);
                wingRight.position.set(2.8, 0.9, 0.5);
                wingRight.rotation.z = -0.03;

                // Tail Fin
                const finGeom = new THREE.BoxGeometry(0.1, 1.4, 1.2);
                tailFin = new THREE.Mesh(finGeom, matSecondary);
                tailFin.position.set(0, 0.8, -2.8);
                tailFin.rotation.x = -0.3;

                // Horizontal Stabilizer
                const stabGeom = new THREE.BoxGeometry(2.4, 0.08, 0.8);
                tailHorizontal = new THREE.Mesh(stabGeom, matSecondary);
                tailHorizontal.position.set(0, 0.2, -3.0);

                // Propeller
                const propGroup = new THREE.Group();
                const spinnerGeom = new THREE.ConeGeometry(0.3, 0.5, 12);
                spinnerGeom.rotateX(Math.PI / 2);
                const spinner = new THREE.Mesh(spinnerGeom, matAccent);
                const bladeGeom = new THREE.BoxGeometry(2.0, 0.15, 0.04);
                const blades = new THREE.Mesh(bladeGeom, matDark);
                propGroup.add(spinner, blades);
                propGroup.position.set(0, 0, 3.4);
                fuselage.add(propGroup);
                propellerMesh = propGroup;

                // Tricycle Gear
                const gear = PlaneBuilder.createWheels(0.6, 1.2, 1.0);
                fuselage.add(gear);
                break;
            }

            case 'piper': {
                // Piper Super Cub: Bush plane, large tundra tires
                const fuseGeom = new THREE.CylinderGeometry(0.65, 0.35, 6.0, 10);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                const cockGeom = new THREE.BoxGeometry(1.0, 0.8, 1.8);
                const cockpit = new THREE.Mesh(cockGeom, matGlass);
                cockpit.position.set(0, 0.5, 0.5);
                fuselage.add(cockpit);

                const wingGeom = new THREE.BoxGeometry(4.8, 0.1, 1.3);
                wingLeft = new THREE.Mesh(wingGeom, matPrimary);
                wingLeft.position.set(-2.7, 0.85, 0.4);

                wingRight = new THREE.Mesh(wingGeom, matPrimary);
                wingRight.position.set(2.7, 0.85, 0.4);

                const finGeom = new THREE.BoxGeometry(0.08, 1.3, 1.1);
                tailFin = new THREE.Mesh(finGeom, matPrimary);
                tailFin.position.set(0, 0.7, -2.6);

                const stabGeom = new THREE.BoxGeometry(2.2, 0.08, 0.7);
                tailHorizontal = new THREE.Mesh(stabGeom, matPrimary);
                tailHorizontal.position.set(0, 0.15, -2.8);

                const propGroup = new THREE.Group();
                const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 10).rotateX(Math.PI/2), matDark);
                const blades = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.04), matAccent);
                propGroup.add(spinner, blades);
                propGroup.position.set(0, 0, 3.1);
                fuselage.add(propGroup);
                propellerMesh = propGroup;

                // Big Tundra Bush Tires
                const tundraGear = PlaneBuilder.createWheels(1.1, 1.4, 0.9);
                fuselage.add(tundraGear);
                break;
            }

            case 'biplane': {
                // Pitts Special: Aerobatic biplane, double staggered wings
                const fuseGeom = new THREE.CylinderGeometry(0.7, 0.45, 5.2, 12);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                // Open Cockpit windscreen
                const windScreen = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.6, 8, 1, false, 0, Math.PI), matGlass);
                windScreen.rotation.x = -Math.PI / 2;
                windScreen.position.set(0, 0.55, 0.1);
                fuselage.add(windScreen);

                // Upper Wing
                const upWingL = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.0), matPrimary);
                upWingL.position.set(-2.0, 1.1, 0.5);
                const upWingR = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.0), matPrimary);
                upWingR.position.set(2.0, 1.1, 0.5);

                // Lower Wing
                const lowWingL = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.9), matSecondary);
                lowWingL.position.set(-1.8, -0.3, 0.1);
                const lowWingR = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.9), matSecondary);
                lowWingR.position.set(1.8, -0.3, 0.1);

                // Combined wing nodes
                const leftGroup = new THREE.Group();
                leftGroup.add(upWingL, lowWingL);
                wingLeft = leftGroup;

                const rightGroup = new THREE.Group();
                rightGroup.add(upWingR, lowWingR);
                wingRight = rightGroup;

                tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 1.0), matAccent);
                tailFin.position.set(0, 0.65, -2.3);

                tailHorizontal = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.7), matSecondary);
                tailHorizontal.position.set(0, 0.1, -2.4);

                const propGroup = new THREE.Group();
                const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 12).rotateX(Math.PI/2), matAccent);
                const blades = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 0.04), matDark);
                propGroup.add(spinner, blades);
                propGroup.position.set(0, 0, 2.7);
                fuselage.add(propGroup);
                propellerMesh = propGroup;
                break;
            }

            case 'bizjet': {
                // Learjet 45: Twin aft engines, T-tail
                const fuseGeom = new THREE.CylinderGeometry(0.85, 0.45, 9.5, 16);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                const cockGeom = new THREE.ConeGeometry(0.85, 2.5, 16);
                cockGeom.rotateX(-Math.PI / 2);
                const nose = new THREE.Mesh(cockGeom, matPrimary);
                nose.position.set(0, 0, 5.0);
                fuselage.add(nose);

                // Swept Wings
                const wingGeom = new THREE.BoxGeometry(5.8, 0.14, 1.8);
                wingLeft = new THREE.Mesh(wingGeom, matPrimary);
                wingLeft.position.set(-3.2, -0.1, 0.5);
                wingLeft.rotation.y = -0.25;

                wingRight = new THREE.Mesh(wingGeom, matPrimary);
                wingRight.position.set(3.2, -0.1, 0.5);
                wingRight.rotation.y = 0.25;

                // T-Tail
                tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 1.8), matSecondary);
                tailFin.position.set(0, 1.2, -4.0);
                tailFin.rotation.x = -0.35;

                tailHorizontal = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 1.0), matSecondary);
                tailHorizontal.position.set(0, 2.3, -4.6);

                // Twin rear engines mounted on fuselage
                const engGeom = new THREE.CylinderGeometry(0.38, 0.38, 2.2, 12).rotateX(Math.PI/2);
                const engL = new THREE.Mesh(engGeom, matAccent);
                engL.position.set(-1.1, 0.5, -2.6);
                const engR = new THREE.Mesh(engGeom, matAccent);
                engR.position.set(1.1, 0.5, -2.6);
                fuselage.add(engL, engR);
                engines.push(engL, engR);
                break;
            }

            case 'warbird': {
                // Spitfire: Elliptical wings, round nose, Merlin exhaust
                const fuseGeom = new THREE.CylinderGeometry(0.75, 0.45, 7.5, 14);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                const cockGeom = new THREE.BoxGeometry(0.9, 0.7, 1.6);
                const cockpit = new THREE.Mesh(cockGeom, matGlass);
                cockpit.position.set(0, 0.5, 0.2);
                fuselage.add(cockpit);

                // Elliptical wings
                const wingGeom = new THREE.CylinderGeometry(1.6, 2.2, 5.2, 12);
                wingGeom.rotateZ(Math.PI / 2);
                wingGeom.scale(1, 0.08, 1);

                wingLeft = new THREE.Mesh(wingGeom, matSecondary);
                wingLeft.position.set(-3.0, -0.1, 0.4);

                wingRight = new THREE.Mesh(wingGeom, matSecondary);
                wingRight.position.set(3.0, -0.1, 0.4);

                tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 1.2), matAccent);
                tailFin.position.set(0, 0.8, -3.3);

                tailHorizontal = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.9), matSecondary);
                tailHorizontal.position.set(0, 0.15, -3.4);

                const propGroup = new THREE.Group();
                const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 12).rotateX(Math.PI/2), matAccent);
                const blades1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.05), matDark);
                const blades2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 0.05), matDark);
                propGroup.add(spinner, blades1, blades2);
                propGroup.position.set(0, 0, 3.8);
                fuselage.add(propGroup);
                propellerMesh = propGroup;
                break;
            }

            case 'airliner': {
                // Boeing 737: Long airliner, 2 underwing turbofans
                const fuseGeom = new THREE.CylinderGeometry(1.4, 1.1, 15.0, 18);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                const nose = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), matPrimary);
                nose.rotation.x = Math.PI / 2;
                nose.position.set(0, 0, 7.5);
                fuselage.add(nose);

                // Passenger windows strip
                const winGeom = new THREE.BoxGeometry(2.82, 0.25, 9.0);
                const windows = new THREE.Mesh(winGeom, matSecondary);
                windows.position.set(0, 0.4, 0);
                fuselage.add(windows);

                // Swept Wings
                const wingGeom = new THREE.BoxGeometry(8.5, 0.25, 3.2);
                wingLeft = new THREE.Mesh(wingGeom, matPrimary);
                wingLeft.position.set(-5.2, -0.4, 0.5);
                wingLeft.rotation.y = -0.35;
                wingLeft.rotation.z = 0.08;

                wingRight = new THREE.Mesh(wingGeom, matPrimary);
                wingRight.position.set(5.2, -0.4, 0.5);
                wingRight.rotation.y = 0.35;
                wingRight.rotation.z = -0.08;

                // Turbofan Engines under wings
                const engGeom = new THREE.CylinderGeometry(0.7, 0.65, 3.2, 14).rotateX(Math.PI / 2);
                const engL = new THREE.Mesh(engGeom, matSecondary);
                engL.position.set(-3.5, -1.2, 1.2);
                wingLeft.add(engL);

                const engR = new THREE.Mesh(engGeom, matSecondary);
                engR.position.set(3.5, -1.2, 1.2);
                wingRight.add(engR);
                engines.push(engL, engR);

                tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 3.0), matSecondary);
                tailFin.position.set(0, 2.2, -6.5);
                tailFin.rotation.x = -0.4;

                tailHorizontal = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 1.8), matPrimary);
                tailHorizontal.position.set(0, 0.4, -7.0);
                break;
            }

            case 'fighter': {
                // F-16 Falcon: Delta fighter, bubble canopy, afterburner nozzle
                const fuseGeom = new THREE.CylinderGeometry(0.8, 0.5, 8.5, 14);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), matGlass);
                canopy.scale.set(0.9, 0.8, 2.2);
                canopy.position.set(0, 0.6, 1.4);
                fuselage.add(canopy);

                // Cropped Delta Wings
                const wingGeom = new THREE.BoxGeometry(5.2, 0.12, 3.2);
                wingLeft = new THREE.Mesh(wingGeom, matPrimary);
                wingLeft.position.set(-2.8, 0.0, -0.2);
                wingLeft.rotation.y = -0.3;

                wingRight = new THREE.Mesh(wingGeom, matPrimary);
                wingRight.position.set(2.8, 0.0, -0.2);
                wingRight.rotation.y = 0.3;

                tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 1.8), matSecondary);
                tailFin.position.set(0, 1.2, -3.2);
                tailFin.rotation.x = -0.35;

                tailHorizontal = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 1.4), matSecondary);
                tailHorizontal.position.set(0, -0.1, -3.8);

                // Afterburner Nozzle
                const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 1.2, 14).rotateX(Math.PI/2), matDark);
                nozzle.position.set(0, 0, -4.6);
                fuselage.add(nozzle);
                engines.push(nozzle);
                break;
            }

            case 'supersonic': {
                // Concorde SST: Ogive delta wing, slender, droop nose
                const fuseGeom = new THREE.CylinderGeometry(0.9, 0.6, 18.0, 16);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                // Iconic needle nose
                const noseGeom = new THREE.ConeGeometry(0.9, 4.0, 16).rotateX(-Math.PI / 2);
                const nose = new THREE.Mesh(noseGeom, matPrimary);
                nose.position.set(0, -0.2, 10.5);
                fuselage.add(nose);

                // Large Delta Wing
                const wingLGeom = new THREE.BoxGeometry(6.5, 0.18, 9.5);
                wingLeft = new THREE.Mesh(wingLGeom, matPrimary);
                wingLeft.position.set(-3.5, -0.2, -1.5);
                wingLeft.rotation.y = -0.4;

                const wingRGeom = new THREE.BoxGeometry(6.5, 0.18, 9.5);
                wingRight = new THREE.Mesh(wingRGeom, matPrimary);
                wingRight.position.set(3.5, -0.2, -1.5);
                wingRight.rotation.y = 0.4;

                tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 3.6), matSecondary);
                tailFin.position.set(0, 2.1, -7.5);
                tailFin.rotation.x = -0.45;

                tailHorizontal = new THREE.Group(); // Concorde has no horizontal tail (delta elevons)

                // 4 Underwing jet engines
                for (let i = -1; i <= 1; i += 2) {
                    const eng = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 4.0), matSecondary);
                    eng.position.set(i * 2.8, -0.6, -3.0);
                    fuselage.add(eng);
                    engines.push(eng);
                }
                break;
            }

            case 'heavy_cargo': {
                // Antonov An-225: Giant 6-engine cargo plane, twin tail fins
                const fuseGeom = new THREE.CylinderGeometry(2.2, 1.8, 20.0, 20);
                fuseGeom.rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                // High swept mammoth wing
                const wingGeom = new THREE.BoxGeometry(13.0, 0.35, 4.5);
                wingLeft = new THREE.Mesh(wingGeom, matPrimary);
                wingLeft.position.set(-7.8, 1.6, 0.5);
                wingLeft.rotation.z = -0.06;

                wingRight = new THREE.Mesh(wingGeom, matPrimary);
                wingRight.position.set(7.8, 1.6, 0.5);
                wingRight.rotation.z = 0.06;

                // 6 Engines! 3 on each wing
                for (let wing of [wingLeft, wingRight]) {
                    const sign = wing === wingLeft ? -1 : 1;
                    for (let dist of [3.0, 6.0, 9.0]) {
                        const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.75, 3.2, 12).rotateX(Math.PI/2), matSecondary);
                        eng.position.set(dist * (sign > 0 ? 1 : -1) * 0.5, -1.4, 0.6);
                        wing.add(eng);
                        engines.push(eng);
                    }
                }

                // H-Tail (Twin vertical fins)
                tailHorizontal = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.25, 2.5), matSecondary);
                tailHorizontal.position.set(0, 1.0, -9.0);

                const finL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 2.2), matAccent);
                finL.position.set(-4.0, 2.0, -9.0);
                const finR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 2.2), matAccent);
                finR.position.set(4.0, 2.0, -9.0);

                const twinTailGroup = new THREE.Group();
                twinTailGroup.add(finL, finR);
                tailFin = twinTailGroup;
                break;
            }

            case 'stealth_wing': {
                // B-2 Spirit: Flying wing, stealth black faceted
                fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 8.0, 6).rotateX(Math.PI/2), matPrimary);
                fuselage.scale.set(1.4, 0.45, 1.0);

                // Huge Stealth Wings
                const wingGeom = new THREE.BoxGeometry(10.5, 0.2, 5.5);
                wingLeft = new THREE.Mesh(wingGeom, matPrimary);
                wingLeft.position.set(-5.8, 0.0, -0.6);
                wingLeft.rotation.y = -0.55;

                wingRight = new THREE.Mesh(wingGeom, matPrimary);
                wingRight.position.set(5.8, 0.0, -0.6);
                wingRight.rotation.y = 0.55;

                tailFin = new THREE.Group(); // B-2 has no vertical stabilizer
                tailHorizontal = new THREE.Group();
                break;
            }

            case 'shuttle': {
                // Space Shuttle: Black heat tiles bottom, delta wings, 3 main rocket bells
                const fuseGeom = new THREE.CylinderGeometry(1.5, 1.1, 13.0, 14).rotateX(Math.PI / 2);
                fuselage = new THREE.Mesh(fuseGeom, matPrimary);

                const bottomHeatShield = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.4, 13.0), matSecondary);
                bottomHeatShield.position.set(0, -0.9, 0);
                fuselage.add(bottomHeatShield);

                // Delta Wings
                const wingGeom = new THREE.BoxGeometry(5.8, 0.2, 6.5);
                wingLeft = new THREE.Mesh(wingGeom, matPrimary);
                wingLeft.position.set(-3.2, -0.4, -1.0);
                wingLeft.rotation.y = -0.45;

                wingRight = new THREE.Mesh(wingGeom, matPrimary);
                wingRight.position.set(3.2, -0.4, -1.0);
                wingRight.rotation.y = 0.45;

                tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.8, 3.2), matPrimary);
                tailFin.position.set(0, 2.1, -5.5);
                tailFin.rotation.x = -0.3;

                tailHorizontal = new THREE.Group();

                // 3 Rocket Engine Bells at tail
                for (let pos of [[0, 0.6, -6.8], [-0.7, -0.3, -6.8], [0.7, -0.3, -6.8]]) {
                    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 12).rotateX(Math.PI/2), matDark);
                    bell.position.set(pos[0], pos[1], pos[2]);
                    fuselage.add(bell);
                    engines.push(bell);
                }
                break;
            }
        }

        root.add(fuselage, wingLeft, wingRight, tailFin, tailHorizontal);

        debrisCandidates.push(fuselage, wingLeft, wingRight, tailFin, tailHorizontal);
        engines.forEach(e => debrisCandidates.push(e));

        return {
            rootGroup: root,
            fuselage,
            wingLeft,
            wingRight,
            tailFin,
            tailHorizontal,
            propellerMesh,
            engines,
            debrisCandidates
        };
    }

    private static createWheels(width: number, radius: number, groundOffset: number): THREE.Group {
        const group = new THREE.Group();
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });

        const tireGeom = new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, 0.25, 10).rotateZ(Math.PI/2);
        const rimGeom = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, 0.27, 8).rotateZ(Math.PI/2);

        // Left gear
        const wheelL = new THREE.Group();
        wheelL.add(new THREE.Mesh(tireGeom, tireMat), new THREE.Mesh(rimGeom, rimMat));
        wheelL.position.set(-width, -groundOffset, 0);

        // Right gear
        const wheelR = new THREE.Group();
        wheelR.add(new THREE.Mesh(tireGeom, tireMat), new THREE.Mesh(rimGeom, rimMat));
        wheelR.position.set(width, -groundOffset, 0);

        // Nose / Tail gear
        const wheelNose = new THREE.Group();
        wheelNose.add(new THREE.Mesh(tireGeom, tireMat), new THREE.Mesh(rimGeom, rimMat));
        wheelNose.position.set(0, -groundOffset, 2.0);

        group.add(wheelL, wheelR, wheelNose);
        return group;
    }
}
