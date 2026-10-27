import * as THREE from 'three';
import { waterParkState } from '../state/waterParkState';
import { PARK_ATTRACTIONS_CATALOG } from '../catalog';
import { AttractionModelBuilder } from '../models/attractionBuilder';
import { PlacedStructure, ParkAttractionDef } from '../types';
import { waterAudio } from '../audio';

export class BuildSystem {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private domElement: HTMLElement;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();

    private isBuildActive: boolean = false;
    private isDeleteMode: boolean = false;
    private selectedDef: ParkAttractionDef | null = null;
    private ghostMesh: THREE.Group | null = null;
    private structureMeshes: Map<string, THREE.Group> = new Map();

    public getPlacedStructureMeshes(): Map<string, THREE.Group> {
        return this.structureMeshes;
    }

    private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private currentRotation: number = 0;
    private targetCandidate: {
        pos: THREE.Vector3;
        rotY: number;
        valid: boolean;
        reason?: string;
        attachedToId?: string;
        stackLevel?: number;
        exitPos?: THREE.Vector3;
        exitRotY?: number;
    } | null = null;

    private toastElement: HTMLElement | null = null;

    constructor(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        this.initEvents();
        this.syncStructures();
    }

    private initEvents() {
        this.domElement.addEventListener('pointermove', (e) => {
            const rect = this.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            if (this.isDeleteMode) {
                this.updateDeleteHighlight();
                return;
            }

            if (!this.isBuildActive || !this.selectedDef) return;
            this.updateCandidatePlacement();
        });

        this.domElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;

            // Delete mode handling: click structure to delete it
            if (this.isDeleteMode) {
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const allMeshes = Array.from(this.structureMeshes.values());
                const hits = this.raycaster.intersectObjects(allMeshes, true);
                if (hits.length > 0) {
                    let hitObj: THREE.Object3D | null = hits[0].object;
                    let foundId: string | null = null;
                    while (hitObj) {
                        for (const [id, m] of this.structureMeshes.entries()) {
                            if (m === hitObj) {
                                foundId = id;
                                break;
                            }
                        }
                        if (foundId) break;
                        hitObj = hitObj.parent;
                    }

                    if (foundId) {
                        this.deleteStructure(foundId);
                        return;
                    }
                }
                return;
            }

            if (!this.isBuildActive || !this.selectedDef) return;

            if (!this.targetCandidate || !this.targetCandidate.valid) {
                if (this.targetCandidate?.reason) {
                    this.showToast(this.targetCandidate.reason);
                }
                return;
            }

            // Place item
            const def = this.selectedDef;
            const instanceId = 'struct_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

            const placed: PlacedStructure = {
                instanceId,
                attractionId: def.id,
                x: this.targetCandidate.pos.x,
                y: this.targetCandidate.pos.y,
                z: this.targetCandidate.pos.z,
                rotationY: this.targetCandidate.rotY,
                builtAt: Date.now(),
                stackLevel: this.targetCandidate.stackLevel,
                attachedToId: this.targetCandidate.attachedToId,
                exitPos: this.targetCandidate.exitPos ? {
                    x: this.targetCandidate.exitPos.x,
                    y: this.targetCandidate.exitPos.y,
                    z: this.targetCandidate.exitPos.z
                } : undefined,
                exitRotY: this.targetCandidate.exitRotY
            };

            waterParkState.addStructure(placed);

            const mesh = AttractionModelBuilder.createStructureMesh(def);
            mesh.position.set(placed.x, placed.y, placed.z);
            mesh.rotation.y = placed.rotationY;
            this.scene.add(mesh);
            this.structureMeshes.set(placed.instanceId, mesh);

            waterAudio.playBuildSuccess();

            // Re-evaluate candidate immediately for chain building
            this.updateCandidatePlacement();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.currentRotation += Math.PI / 2;
                if (this.selectedDef?.category === 'pools' || this.selectedDef?.isTower) {
                    this.updateCandidatePlacement();
                }
            } else if (e.key === 'Escape') {
                if (this.isDeleteMode) {
                    this.setDeleteMode(false);
                } else {
                    this.cancelBuild();
                }
            }
        });
    }

    private updateCandidatePlacement() {
        if (!this.selectedDef) return;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const def = this.selectedDef;

        if (def.category === 'pools') {
            // Pools: Place freely on ground
            const intersection = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.groundPlane, intersection)) {
                const snapX = Math.round(intersection.x / 2) * 2;
                const snapZ = Math.round(intersection.z / 2) * 2;
                this.targetCandidate = {
                    pos: new THREE.Vector3(snapX, 0, snapZ),
                    rotY: this.currentRotation,
                    valid: true
                };
            }
        } else if (def.isTower) {
            // Tower: Place on ground OR stack on existing tower up to 6 high
            // First check if mouse points at existing tower top
            const existingTowers = waterParkState.getStructures().filter(s => s.attractionId === 'tower_segment');
            let stackedTower: PlacedStructure | null = null;

            // Check raycast with placed structure meshes
            const meshArray = Array.from(this.structureMeshes.entries())
                .filter(([id]) => existingTowers.some(t => t.instanceId === id))
                .map(([_, m]) => m);

            const intersects = this.raycaster.intersectObjects(meshArray, true);
            if (intersects.length > 0) {
                // Find top tower at this (x, z)
                const hitObj = intersects[0];
                let hitParent = hitObj.object.parent;
                while (hitParent && !hitParent.name.startsWith('attraction_') && hitParent !== this.scene) {
                    hitParent = hitParent.parent;
                }
                // Find matching structure
                const found = existingTowers.find(t => {
                    const mesh = this.structureMeshes.get(t.instanceId);
                    return mesh && (mesh === hitParent || mesh.children.includes(hitObj.object as any));
                });
                if (found) {
                    // Check highest stack at this column (tower height is 7.0m when 2x scaled)
                    const columnTowers = existingTowers.filter(t => Math.abs(t.x - found.x) < 2 && Math.abs(t.z - found.z) < 2);
                    const currentMaxLevel = Math.max(...columnTowers.map(t => t.stackLevel ?? 0));
                    if (currentMaxLevel < 5) { // 0 to 5 = 6 pieces total
                        this.targetCandidate = {
                            pos: new THREE.Vector3(found.x, (currentMaxLevel + 1) * 7.0, found.z),
                            rotY: found.rotationY,
                            valid: true,
                            stackLevel: currentMaxLevel + 1,
                            attachedToId: found.instanceId
                        };
                    } else {
                        this.targetCandidate = {
                            pos: new THREE.Vector3(found.x, (currentMaxLevel + 1) * 7.0, found.z),
                            rotY: found.rotationY,
                            valid: false,
                            reason: 'Maksimaalselt saab panna 6 tornitükki üksteise peale!'
                        };
                    }
                }
            }

            if (!this.targetCandidate || (!this.targetCandidate.valid && !this.targetCandidate.reason)) {
                // Place on ground
                const intersection = new THREE.Vector3();
                if (this.raycaster.ray.intersectPlane(this.groundPlane, intersection)) {
                    const snapX = Math.round(intersection.x / 4) * 4;
                    const snapZ = Math.round(intersection.z / 4) * 4;
                    this.targetCandidate = {
                        pos: new THREE.Vector3(snapX, 0, snapZ),
                        rotY: this.currentRotation,
                        valid: true,
                        stackLevel: 0
                    };
                }
            }
        } else if (def.isSlideStart) {
            // Pipe Start: CAN ONLY BE ATTACHED TO A TOWER!
            // "seal lasteveetorude all on start seda saab panna AINULT SELLE TORNI KÜLGE"
            const towers = waterParkState.getStructures().filter(s => s.attractionId === 'tower_segment');
            if (towers.length === 0) {
                this.targetCandidate = {
                    pos: new THREE.Vector3(),
                    rotY: 0,
                    valid: false,
                    reason: 'Veetoru starti saab panna AINULT torni külge! Ehita esmalt torn.'
                };
            } else {
                // Raycast first against tower meshes, fallback to raycaster ground plane
                const towerMeshes = towers.map(t => this.structureMeshes.get(t.instanceId)).filter(Boolean) as THREE.Group[];
                const hit = this.raycaster.intersectObjects(towerMeshes, true);

                let closestTower: PlacedStructure | null = null;
                let lookPt = new THREE.Vector3();

                if (hit.length > 0) {
                    lookPt.copy(hit[0].point);
                    // Find matching tower
                    let obj: THREE.Object3D | null = hit[0].object;
                    while (obj && !towers.some(t => this.structureMeshes.get(t.instanceId) === obj)) {
                        obj = obj.parent;
                    }
                    closestTower = towers.find(t => this.structureMeshes.get(t.instanceId) === obj) || null;
                }

                if (!closestTower) {
                    const intersection = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
                    lookPt.copy(intersection);

                    let minDist = Infinity;
                    for (const t of towers) {
                        const d = Math.hypot(t.x - intersection.x, t.z - intersection.z);
                        if (d < minDist) {
                            minDist = d;
                            closestTower = t;
                        }
                    }
                    if (minDist > 20) {
                        closestTower = null;
                    }
                }

                if (closestTower) {
                    // Find highest tower stack in this column so slide starts from the top deck
                    const columnTowers = towers.filter(t => Math.abs(t.x - closestTower!.x) < 2 && Math.abs(t.z - closestTower!.z) < 2);
                    const topTower = columnTowers.reduce((prev, curr) => ((curr.stackLevel ?? 0) > (prev.stackLevel ?? 0) ? curr : prev), closestTower);
                    const level = topTower.stackLevel ?? 0;
                    const deckY = (level + 1) * 7.0;

                    // Choose exit direction towards cursor relative to tower center (North, South, East, West)
                    // Tower width is 8.0m (half-width = 4.0m)
                    const dx = lookPt.x - topTower.x;
                    const dz = lookPt.z - topTower.z;
                    let rotY = 0;
                    let attachOffset = new THREE.Vector3(0, 0, 4.0);

                    if (Math.abs(dx) > Math.abs(dz)) {
                        if (dx > 0) {
                            rotY = Math.PI / 2;
                            attachOffset.set(4.0, 0, 0);
                        } else {
                            rotY = -Math.PI / 2;
                            attachOffset.set(-4.0, 0, 0);
                        }
                    } else {
                        if (dz < 0) {
                            rotY = Math.PI;
                            attachOffset.set(0, 0, -4.0);
                        } else {
                            rotY = 0;
                            attachOffset.set(0, 0, 4.0);
                        }
                    }

                    const attachPos = new THREE.Vector3(topTower.x + attachOffset.x, deckY, topTower.z + attachOffset.z);
                    // The exit of pipe_start is at local z = 1.4 * 2 = 2.8m
                    const forward = new THREE.Vector3(0, 0, 2.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
                    const exitPos = attachPos.clone().add(forward);

                    this.targetCandidate = {
                        pos: attachPos,
                        rotY: rotY,
                        valid: true,
                        attachedToId: topTower.instanceId,
                        exitPos,
                        exitRotY: rotY
                    };
                } else {
                    this.targetCandidate = {
                        pos: new THREE.Vector3(),
                        rotY: 0,
                        valid: false,
                        reason: 'Toru starti saab panna AINULT torni külge! Liigu kursoriga torni peale.'
                    };
                }
            }
        } else if (def.isSlideSegment) {
            // Slide Segment (straight, down20, turn right, turn left)
            // "NB NEID TORUSI SAAB PANNA AINULT STARDI KÜLGE JA TEISTE TORUDE KÜlGE"
            const existingPipes = waterParkState.getStructures().filter(s => s.attractionId.startsWith('pipe_'));
            if (existingPipes.length === 0) {
                this.targetCandidate = {
                    pos: new THREE.Vector3(),
                    rotY: 0,
                    valid: false,
                    reason: 'Toru saab panna AINULT stardi või teiste torude külge! Paigalda esmalt Toru Start.'
                };
            } else {
                // Raycast against existing pipe meshes first, or test nearest endpoint
                const pipeMeshes = existingPipes.map(p => this.structureMeshes.get(p.instanceId)).filter(Boolean) as THREE.Group[];
                const hit = this.raycaster.intersectObjects(pipeMeshes, true);

                let bestPipe: PlacedStructure | null = null;
                let lookPt = new THREE.Vector3();

                if (hit.length > 0) {
                    lookPt.copy(hit[0].point);
                    let obj: THREE.Object3D | null = hit[0].object;
                    while (obj && !existingPipes.some(p => this.structureMeshes.get(p.instanceId) === obj)) {
                        obj = obj.parent;
                    }
                    bestPipe = existingPipes.find(p => this.structureMeshes.get(p.instanceId) === obj) || null;
                }

                if (!bestPipe) {
                    const intersection = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
                    lookPt.copy(intersection);

                    // Find closest pipe endpoint
                    let minEndDist = Infinity;
                    for (const p of existingPipes) {
                        const exit = p.exitPos || { x: p.x, y: p.y, z: p.z + 8 };
                        const d = Math.hypot(exit.x - lookPt.x, exit.z - lookPt.z);
                        if (d < minEndDist) {
                            minEndDist = d;
                            bestPipe = p;
                        }
                    }
                    if (minEndDist > 40) {
                        bestPipe = null;
                    }
                }

                if (bestPipe) {
                    const attachPos = bestPipe.exitPos ? new THREE.Vector3(bestPipe.exitPos.x, bestPipe.exitPos.y, bestPipe.exitPos.z) : new THREE.Vector3(bestPipe.x, bestPipe.y, bestPipe.z + 4);
                    const attachRot = bestPipe.exitRotY ?? bestPipe.rotationY;

                    // Calculate new exit position and rotation based on segment type (scaled 2x)
                    let nextExitPos = attachPos.clone();
                    let nextExitRot = attachRot;

                    if (def.id === 'pipe_straight') {
                        const forward = new THREE.Vector3(0, 0, 8.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), attachRot);
                        nextExitPos.add(forward);
                    } else if (def.id === 'pipe_down20') {
                        // 8.0m length rotated down by 20 deg
                        const dy = -Math.sin(THREE.MathUtils.degToRad(20)) * 8.0;
                        const dz = Math.cos(THREE.MathUtils.degToRad(20)) * 8.0;
                        const forward = new THREE.Vector3(0, dy, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), attachRot);
                        nextExitPos.add(forward);
                    } else if (def.id === 'pipe_turn_right') {
                        // 90 deg turn right: offset x = +5.0, z = +5.0
                        const offset = new THREE.Vector3(5.0, 0, 5.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), attachRot);
                        nextExitPos.add(offset);
                        nextExitRot = attachRot - Math.PI / 2;
                    } else if (def.id === 'pipe_turn_left') {
                        // 90 deg turn left: offset x = -5.0, z = +5.0
                        const offset = new THREE.Vector3(-5.0, 0, 5.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), attachRot);
                        nextExitPos.add(offset);
                        nextExitRot = attachRot + Math.PI / 2;
                    }

                    this.targetCandidate = {
                        pos: attachPos,
                        rotY: attachRot,
                        valid: true,
                        attachedToId: bestPipe.instanceId,
                        exitPos: nextExitPos,
                        exitRotY: nextExitRot
                    };
                } else {
                    this.targetCandidate = {
                        pos: new THREE.Vector3(),
                        rotY: 0,
                        valid: false,
                        reason: 'Neid torusid saab panna AINULT stardi või eelmise toru otsa!'
                    };
                }
            }
        }

        // Update Ghost Mesh
        if (this.ghostMesh) {
            if (this.targetCandidate && this.targetCandidate.valid) {
                this.ghostMesh.visible = true;
                this.ghostMesh.position.copy(this.targetCandidate.pos);
                this.ghostMesh.rotation.y = this.targetCandidate.rotY;
            } else {
                this.ghostMesh.visible = false;
            }
        }
    }

    public selectItem(id: string) {
        const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === id);
        if (!def) return;

        this.selectedDef = def;
        this.isBuildActive = true;

        if (this.ghostMesh) {
            this.scene.remove(this.ghostMesh);
            this.ghostMesh = null;
        }

        this.ghostMesh = AttractionModelBuilder.createStructureMesh(def);
        this.ghostMesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                m.material = new THREE.MeshBasicMaterial({
                    color: 0x00f2fe,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.65
                });
            }
        });
        this.scene.add(this.ghostMesh);
        this.updateCandidatePlacement();
    }

    public cancelBuild() {
        this.isBuildActive = false;
        this.selectedDef = null;
        if (this.ghostMesh) {
            this.scene.remove(this.ghostMesh);
            this.ghostMesh = null;
        }
    }

    public syncStructures() {
        for (const [_, m] of this.structureMeshes) {
            this.scene.remove(m);
        }
        this.structureMeshes.clear();

        const placed = waterParkState.getStructures();
        for (const p of placed) {
            const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === p.attractionId);
            if (def) {
                const mesh = AttractionModelBuilder.createStructureMesh(def);
                mesh.position.set(p.x, p.y, p.z);
                mesh.rotation.y = p.rotationY;
                this.scene.add(mesh);
                this.structureMeshes.set(p.instanceId, mesh);
            }
        }
    }

    public setDeleteMode(enable: boolean) {
        this.isDeleteMode = enable;
        if (enable) {
            this.cancelBuild();
            this.showToast('Kustutusrežiim aktiivne! Klõpsa esemel, mida soovid eemaldada.');
        } else {
            this.clearDeleteHighlight();
        }
    }

    public getDeleteMode(): boolean {
        return this.isDeleteMode;
    }

    private hoveredStructureId: string | null = null;

    private updateDeleteHighlight() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const allMeshes = Array.from(this.structureMeshes.values());
        const hits = this.raycaster.intersectObjects(allMeshes, true);

        let hitId: string | null = null;
        if (hits.length > 0) {
            let hitObj: THREE.Object3D | null = hits[0].object;
            while (hitObj) {
                for (const [id, m] of this.structureMeshes.entries()) {
                    if (m === hitObj) {
                        hitId = id;
                        break;
                    }
                }
                if (hitId) break;
                hitObj = hitObj.parent;
            }
        }

        if (hitId !== this.hoveredStructureId) {
            this.clearDeleteHighlight();
            this.hoveredStructureId = hitId;
            if (hitId) {
                const mesh = this.structureMeshes.get(hitId);
                mesh?.traverse((c) => {
                    if ((c as THREE.Mesh).isMesh) {
                        const m = c as THREE.Mesh;
                        (m as any)._origColor = (m.material as any).color?.getHex();
                        (m.material as any).color?.setHex(0xff3838);
                    }
                });
            }
        }
    }

    private clearDeleteHighlight() {
        if (this.hoveredStructureId) {
            const mesh = this.structureMeshes.get(this.hoveredStructureId);
            mesh?.traverse((c) => {
                if ((c as THREE.Mesh).isMesh) {
                    const m = c as THREE.Mesh;
                    if ((m as any)._origColor !== undefined) {
                        (m.material as any).color?.setHex((m as any)._origColor);
                    }
                }
            });
            this.hoveredStructureId = null;
        }
    }

    public deleteStructure(instanceId: string): boolean {
        const mesh = this.structureMeshes.get(instanceId);
        if (mesh) {
            this.scene.remove(mesh);
            this.structureMeshes.delete(instanceId);
        }
        const removed = waterParkState.removeStructure(instanceId);
        if (removed) {
            waterAudio.playDemolish();
            this.showToast('Ese edukalt kustutatud!');
        }
        return removed;
    }

    private showToast(msg: string) {
        let el = document.getElementById('waterpark-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'waterpark-toast';
            el.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(231,76,60,0.95);color:#fff;padding:12px 24px;border-radius:12px;font-weight:800;font-size:0.95rem;z-index:9999;box-shadow:0 6px 25px rgba(0,0,0,0.5);border:2px solid #fff;pointer-events:none;transition:opacity 0.3s;';
            document.body.appendChild(el);
        }
        el.textContent = '⚠️ ' + msg;
        el.style.opacity = '1';
        el.style.display = 'block';
        clearTimeout((el as any)._timeout);
        (el as any)._timeout = setTimeout(() => {
            if (el) el.style.opacity = '0';
        }, 2500);
    }
}
