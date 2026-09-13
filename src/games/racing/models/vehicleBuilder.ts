import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { VehicleDef } from '../types';

export class VehicleBuilder {
    private loadedCarModel: THREE.Group | null = null;
    private loadedMotoModel: THREE.Group | null = null;

    constructor() {
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load(import.meta.env.BASE_URL + 'models/ferrari.glb', (gltf) => {
            const model = gltf.scene;
            model.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            model.scale.set(1.2, 1.2, 1.2);
            model.position.y = 0;
            model.rotation.y = 0;
            this.loadedCarModel = model;
            console.log('Ultra realistic car model loaded!');
        });

        gltfLoader.load(import.meta.env.BASE_URL + 'models/Motorcycle.glb', (gltf) => {
            const model = gltf.scene;
            model.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            model.scale.set(0.015, 0.015, 0.015);
            model.position.y = 0;
            model.rotation.y = 0;
            this.loadedMotoModel = model;
            console.log('3D Motorcycle model loaded!');
        });
    }

    public createFloatingArrow(color: number = 0xff0000): THREE.Group {
        const group = new THREE.Group();
        group.name = 'floatingArrow';

        const mat = new THREE.MeshBasicMaterial({ color: color });

        // Flat rectangular body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.4, 4.0),
            mat
        );
        body.position.z = 1.0;

        // Custom shape for arrowhead
        const shape = new THREE.Shape();
        shape.moveTo(-3, 0);   // left
        shape.lineTo(3, 0);    // right
        shape.lineTo(0, -4);   // tip
        shape.lineTo(-3, 0);

        const extrudeSettings = { depth: 0.4, bevelEnabled: false };
        const headGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const headMesh = new THREE.Mesh(headGeo, mat);
        headMesh.rotation.x = Math.PI / 2;
        headMesh.position.z = -1.0;
        headMesh.position.y = 0.2;

        group.add(body);
        group.add(headMesh);

        group.position.y = 7;
        group.scale.set(1.5, 1.5, 1.5);

        const bobGroup = new THREE.Group();
        bobGroup.name = 'floatingArrowBob';
        bobGroup.add(group);

        return bobGroup;
    }

    public buildDetailedVehicle(vDef: VehicleDef, color: THREE.Color): { group: THREE.Group; wheels: THREE.Mesh[] } {
        const group = new THREE.Group();
        const wheels: THREE.Mesh[] = [];

        const mat = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            envMapIntensity: 2.0
        });
        const tireMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            metalness: 0.2,
            roughness: 0.8
        });
        const rimMat = new THREE.MeshPhysicalMaterial({
            color: 0xdddddd,
            metalness: 1.0,
            roughness: 0.2,
            clearcoat: 1.0,
            envMapIntensity: 2.0
        });
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 });

        if (vDef.type === 'car') {
            if (this.loadedCarModel) {
                const realCar = this.loadedCarModel.clone();

                realCar.traverse((child: any) => {
                    if (child.isMesh && child.material) {
                        if (
                            child.name.includes('body') ||
                            child.material.name.includes('body') ||
                            child.material.name.includes('paint') ||
                            child.name === 'Object_10' ||
                            child.name.includes('Mesh')
                        ) {
                            child.material = child.material.clone();
                            if (child.material.color) {
                                child.material.color.copy(color);
                                child.material.metalness = 0.8;
                                child.material.roughness = 0.2;
                                child.material.clearcoat = 1.0;
                            }
                        }
                        if (child.name.includes('wheel') || child.name.includes('tire')) {
                            wheels.push(child);
                        }
                    }
                });

                group.add(realCar);

                const hl = new THREE.PointLight(0xffffff, 2.0, 50);
                hl.position.set(0, 0.8, -2.5);
                group.add(hl);
                const tl = new THREE.PointLight(0xff0000, 2.0, 10);
                tl.position.set(0, 0.8, 2.5);
                group.add(tl);

                if (wheels.length === 0) {
                    wheels.push(new THREE.Mesh());
                }
            } else {
                const box = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), mat);
                box.position.y = 0.5;
                group.add(box);
                wheels.push(new THREE.Mesh());
            }
        } else {
            // Motorcycle
            if (this.loadedMotoModel) {
                const realMoto = this.loadedMotoModel.clone();

                realMoto.traverse((child: any) => {
                    if (child.isMesh && child.material) {
                        if (
                            child.name.toLowerCase().includes('body') ||
                            child.name.toLowerCase().includes('paint') ||
                            child.name.includes('Mesh')
                        ) {
                            child.material = child.material.clone();
                            if (child.material.color) {
                                child.material.color.copy(color);
                            }
                        }
                        if (child.name.toLowerCase().includes('wheel') || child.name.toLowerCase().includes('tire')) {
                            wheels.push(child);
                        }
                    }
                });

                group.add(realMoto);

                const hl = new THREE.PointLight(0xffffff, 2.0, 50);
                hl.position.set(0, 0.8, -1.5);
                group.add(hl);

                if (wheels.length === 0) {
                    wheels.push(new THREE.Mesh());
                }
            } else {
                const shape = new THREE.Shape();
                shape.moveTo(-1.2, 0.3);
                shape.lineTo(1.2, 0.3);
                shape.lineTo(1.4, 0.7);
                shape.lineTo(0.5, 1.2);
                shape.lineTo(-0.2, 1.0);
                shape.lineTo(-1.4, 1.2);
                shape.lineTo(-1.2, 0.3);

                const extrudeSettings = { depth: 0.6, bevelEnabled: true, bevelSegments: 3, steps: 2, bevelSize: 0.05, bevelThickness: 0.05 };
                const motoGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                motoGeo.center();
                const body = new THREE.Mesh(motoGeo, mat);
                body.rotation.y = Math.PI / 2;
                body.position.y = 0.6;
                group.add(body);

                const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.2, 32).rotateZ(Math.PI / 2);
                const rimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 16).rotateZ(Math.PI / 2);
                [[-1.2, 0], [1.2, 0]].forEach(pos => {
                    const w = new THREE.Mesh(wheelGeo, tireMat);
                    w.position.set(0, 0.45, pos[0]);
                    const rim = new THREE.Mesh(rimGeo, rimMat);
                    w.add(rim);
                    group.add(w);
                    wheels.push(w);
                });

                const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
                hl.position.set(0, 0.8, -1.4);
                group.add(hl);
            }
        }

        const underglow = new THREE.PointLight(color, 2.0, 5.0);
        underglow.position.set(0, 0.2, 0);
        group.add(underglow);

        return { group, wheels };
    }
}
