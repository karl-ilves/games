import * as THREE from 'three';
import { VisitorGuest } from '../types';
import { VisitorBuilder } from '../models/visitorBuilder';
import { waterParkState } from '../state/waterParkState';
import { waterAudio } from '../audio';

export class VisitorSystem {
    private scene: THREE.Scene;
    private visitors: Map<string, { guest: VisitorGuest; mesh: THREE.Group }> = new Map();
    private maxVisitors: number = 40;
    private spawnTimer: number = 0;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public update(delta: number) {
        const capacity = waterParkState.calculateCapacity();
        const currentCount = this.visitors.size;

        // Spawn visitors based on reputation and ticket price attraction
        this.spawnTimer += delta;
        if (this.spawnTimer > 2.0 && currentCount < Math.min(capacity, this.maxVisitors)) {
            this.spawnTimer = 0;
            this.spawnVisitor();
        }

        // Update all visitors
        const structures = waterParkState.getStructures();

        for (const [id, entry] of this.visitors.entries()) {
            const { guest, mesh } = entry;
            guest.actionTimer -= delta;

            if (guest.actionTimer <= 0) {
                this.chooseNewTarget(guest, structures);
            }

            // Move towards target
            const dx = guest.target.x - guest.position.x;
            const dz = guest.target.z - guest.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 0.4) {
                const speed = 2.4 * delta;
                guest.position.x += (dx / dist) * speed;
                guest.position.z += (dz / dist) * speed;

                mesh.position.set(guest.position.x, guest.position.y, guest.position.z);
                mesh.rotation.y = Math.atan2(dx, dz);

                // Walking leg bob
                mesh.position.y = guest.position.y + Math.abs(Math.sin(Date.now() * 0.008)) * 0.08;
            } else {
                // Arrived at target: perform activity
                if (guest.currentAction === 'sliding') {
                    // Small splash
                    if (Math.random() < 0.02) waterAudio.playSplash();
                }
            }
        }
    }

    private spawnVisitor() {
        const id = 'guest_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const names = ['Kasper', 'Laura', 'Rasmus', 'Emma', 'Oliver', 'Marta', 'Robin', 'Sofia', 'Erik', 'Mia'];
        const name = names[Math.floor(Math.random() * names.length)];

        const colors = [0x38bdf8, 0xff4757, 0x2ed573, 0xffa502, 0xa55eea, 0xff6b81];
        const outfitColor = colors[Math.floor(Math.random() * colors.length)];
        const mesh = VisitorBuilder.createVisitorMesh(outfitColor);

        // Spawn at main entrance (z = 40)
        const startPos = { x: (Math.random() - 0.5) * 6, y: 0, z: 38 };
        mesh.position.set(startPos.x, startPos.y, startPos.z);
        this.scene.add(mesh);

        const guest: VisitorGuest = {
            id,
            name,
            meshId: mesh.id,
            position: startPos,
            target: { x: (Math.random() - 0.5) * 20, y: 0, z: (Math.random() - 0.5) * 20 },
            happiness: 85,
            currentAction: 'walking',
            actionTimer: 5 + Math.random() * 5
        };

        this.visitors.set(id, { guest, mesh });

        // Collect entrance ticket fee!
        waterParkState.addCash(waterParkState.getTicketPrice());
    }

    private chooseNewTarget(guest: VisitorGuest, structures: any[]) {
        if (structures.length > 0 && Math.random() < 0.7) {
            const randomStruct = structures[Math.floor(Math.random() * structures.length)];
            guest.target = {
                x: randomStruct.x + (Math.random() - 0.5) * 3,
                y: 0,
                z: randomStruct.z + (Math.random() - 0.5) * 3
            };
            guest.actionTimer = 8 + Math.random() * 8;
            guest.currentAction = 'swimming';
        } else {
            guest.target = {
                x: (Math.random() - 0.5) * 45,
                y: 0,
                z: (Math.random() - 0.5) * 45
            };
            guest.actionTimer = 6 + Math.random() * 6;
            guest.currentAction = 'walking';
        }
    }

    public getVisitorCount(): number {
        return this.visitors.size;
    }

    public dispose() {
        for (const [_, entry] of this.visitors.entries()) {
            this.scene.remove(entry.mesh);
        }
        this.visitors.clear();
    }
}
