import * as THREE from 'three';
import { waterParkState } from '../state/waterParkState';
import { AttractionModelBuilder } from '../models/attractionBuilder';
import { PARK_ATTRACTIONS_CATALOG } from '../catalog';
import { waterAudio } from '../audio';

export class BuildSystem {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private domElement: HTMLElement;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();

    private isBuildModeActive: boolean = false;
    private selectedAttractionId: string | null = null;
    private ghostMesh: THREE.Group | null = null;
    private structureMeshes: Map<string, THREE.Group> = new Map();

    private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private currentGridPos: THREE.Vector3 = new THREE.Vector3();
    private currentRotation: number = 0;

    constructor(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        this.initEventListeners();
        this.syncPlacedStructures();
    }

    private initEventListeners() {
        this.domElement.addEventListener('pointermove', (e) => {
            if (!this.isBuildModeActive) return;
            const rect = this.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersection = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.groundPlane, intersection)) {
                // Snap to 2m grid
                const snapX = Math.round(intersection.x / 2) * 2;
                const snapZ = Math.round(intersection.z / 2) * 2;
                this.currentGridPos.set(snapX, 0, snapZ);

                if (this.ghostMesh) {
                    this.ghostMesh.position.copy(this.currentGridPos);
                }
            }
        });

        this.domElement.addEventListener('pointerdown', (e) => {
            if (!this.isBuildModeActive || e.button !== 0 || !this.selectedAttractionId) return;

            // Place structure
            const placed = waterParkState.buildStructure(
                this.selectedAttractionId,
                this.currentGridPos.x,
                this.currentGridPos.z,
                this.currentRotation
            );

            if (placed) {
                const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === placed.attractionId);
                if (def) {
                    const mesh = AttractionModelBuilder.createStructureMesh(def);
                    mesh.position.set(placed.x, placed.y, placed.z);
                    mesh.rotation.y = placed.rotationY;
                    this.scene.add(mesh);
                    this.structureMeshes.set(placed.instanceId, mesh);
                    waterAudio.playBuildSuccess();
                }
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.currentRotation += Math.PI / 2;
                if (this.ghostMesh) this.ghostMesh.rotation.y = this.currentRotation;
            } else if (e.key === 'Escape') {
                this.exitBuildMode();
            }
        });
    }

    public selectAttractionToBuild(attractionId: string) {
        this.selectedAttractionId = attractionId;
        this.isBuildModeActive = true;

        if (this.ghostMesh) {
            this.scene.remove(this.ghostMesh);
            this.ghostMesh = null;
        }

        const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === attractionId);
        if (def) {
            this.ghostMesh = AttractionModelBuilder.createStructureMesh(def);
            // Apply semi-transparent ghost material to children
            this.ghostMesh.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.material = new THREE.MeshBasicMaterial({
                        color: 0x00f2fe,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.6
                    });
                }
            });
            this.ghostMesh.position.copy(this.currentGridPos);
            this.ghostMesh.rotation.y = this.currentRotation;
            this.scene.add(this.ghostMesh);
        }
    }

    public exitBuildMode() {
        this.isBuildModeActive = false;
        this.selectedAttractionId = null;
        if (this.ghostMesh) {
            this.scene.remove(this.ghostMesh);
            this.ghostMesh = null;
        }
    }

    public isBuilding(): boolean {
        return this.isBuildModeActive;
    }

    public syncPlacedStructures() {
        // Clear old meshes
        for (const [_, mesh] of this.structureMeshes.entries()) {
            this.scene.remove(mesh);
        }
        this.structureMeshes.clear();

        // Spawn existing saved structures
        const list = waterParkState.getStructures();
        for (const s of list) {
            const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === s.attractionId);
            if (def) {
                const mesh = AttractionModelBuilder.createStructureMesh(def);
                mesh.position.set(s.x, s.y, s.z);
                mesh.rotation.y = s.rotationY;
                this.scene.add(mesh);
                this.structureMeshes.set(s.instanceId, mesh);
            }
        }
    }

    public demolishInstance(instanceId: string): boolean {
        const ok = waterParkState.demolishStructure(instanceId);
        if (ok) {
            const mesh = this.structureMeshes.get(instanceId);
            if (mesh) {
                this.scene.remove(mesh);
                this.structureMeshes.delete(instanceId);
            }
            waterAudio.playDemolish();
        }
        return ok;
    }
}
