import * as THREE from 'three';
import { CrashEvent } from '../types';

export class EmergencySystem {
    public crashEvents: CrashEvent[] = [];

    public buildEmergencyVehicle(type: 'ambulance' | 'towtruck'): THREE.Group {
        const group = new THREE.Group();

        if (type === 'ambulance') {
            // White box with red cross
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(2.2, 1.5, 4),
                new THREE.MeshLambertMaterial({ color: 0xffffff })
            );
            body.position.y = 1.2;
            group.add(body);

            // Red cross on top
            const crossH = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.1, 0.3),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            crossH.position.y = 2.0;
            group.add(crossH);
            const crossV = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.1, 1.0),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            crossV.position.y = 2.0;
            group.add(crossV);

            // Flashing light
            const light = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.3, 0.4),
                new THREE.MeshBasicMaterial({ color: 0x0000ff })
            );
            light.position.set(0, 2.1, -1.5);
            light.name = 'flashLight';
            group.add(light);

            // Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12).rotateZ(Math.PI / 2);
            const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
            [[-1.1, -1.2], [1.1, -1.2], [-1.1, 1.2], [1.1, 1.2]].forEach(pos => {
                const w = new THREE.Mesh(wheelGeo, wheelMat);
                w.position.set(pos[0], 0.4, pos[1]);
                group.add(w);
            });
        } else {
            // Orange/yellow tow truck
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(2.2, 1.2, 5),
                new THREE.MeshLambertMaterial({ color: 0xe67e22 })
            );
            body.position.y = 1.0;
            group.add(body);

            // Cabin
            const cabin = new THREE.Mesh(
                new THREE.BoxGeometry(2.0, 1.0, 1.8),
                new THREE.MeshLambertMaterial({ color: 0xd35400 })
            );
            cabin.position.set(0, 1.8, -1.2);
            group.add(cabin);

            // Crane arm
            const crane = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 3),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            crane.position.set(0, 2.0, 1.5);
            crane.rotation.x = -0.3;
            group.add(crane);

            // Flashing light
            const light = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.3, 0.4),
                new THREE.MeshBasicMaterial({ color: 0xffaa00 })
            );
            light.position.set(0, 2.4, -1.5);
            light.name = 'flashLight';
            group.add(light);

            // Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12).rotateZ(Math.PI / 2);
            const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
            [[-1.1, -1.5], [1.1, -1.5], [-1.1, 1.5], [1.1, 1.5]].forEach(pos => {
                const w = new THREE.Mesh(wheelGeo, wheelMat);
                w.position.set(pos[0], 0.5, pos[1]);
                group.add(w);
            });
        }

        return group;
    }

    public spawnCrashEvent(scene: THREE.Scene, position: THREE.Vector3, raceTime: number): void {
        // Don't spawn too many at once
        if (this.crashEvents.length >= 3) return;
        // Don't spawn too close to existing events
        for (const ev of this.crashEvents) {
            if (ev.position.distanceTo(position) < 60) return;
        }

        const event: CrashEvent = {
            position: position.clone(),
            time: raceTime,
            ambulance: null,
            towTruck: null,
            ambulanceArrived: false,
            towTruckArrived: false,
            yellowFlagActive: true,
            cleanup: false,
            timer: 0
        };

        // Spawn ambulance from a distance
        const amb = this.buildEmergencyVehicle('ambulance');
        const offset1 = new THREE.Vector3(80 + Math.random() * 40, 0, 80 + Math.random() * 40);
        if (Math.random() > 0.5) offset1.x *= -1;
        if (Math.random() > 0.5) offset1.z *= -1;
        amb.position.copy(position).add(offset1);
        scene.add(amb);
        event.ambulance = amb;

        // Spawn tow truck from different direction
        const tow = this.buildEmergencyVehicle('towtruck');
        const offset2 = new THREE.Vector3(-60 - Math.random() * 40, 0, 60 + Math.random() * 40);
        if (Math.random() > 0.5) offset2.x *= -1;
        if (Math.random() > 0.5) offset2.z *= -1;
        tow.position.copy(position).add(offset2);
        scene.add(tow);
        event.towTruck = tow;

        this.crashEvents.push(event);
    }

    public updateCrashEvents(scene: THREE.Scene, dt: number): void {
        for (let i = this.crashEvents.length - 1; i >= 0; i--) {
            const ev = this.crashEvents[i];
            ev.timer += dt;

            // Drive ambulance towards crash site
            if (ev.ambulance && !ev.ambulanceArrived) {
                const dir = ev.position.clone().sub(ev.ambulance.position);
                dir.y = 0;
                const dist = dir.length();
                if (dist > 3) {
                    dir.normalize().multiplyScalar(25 * dt);
                    ev.ambulance.position.add(dir);
                    ev.ambulance.rotation.y = Math.atan2(dir.x, dir.z);
                } else {
                    ev.ambulanceArrived = true;
                }
            }

            // Drive tow truck towards crash site
            if (ev.towTruck && !ev.towTruckArrived) {
                const dir = ev.position.clone().sub(ev.towTruck.position);
                dir.y = 0;
                const dist = dir.length();
                if (dist > 5) {
                    dir.normalize().multiplyScalar(20 * dt);
                    ev.towTruck.position.add(dir);
                    ev.towTruck.rotation.y = Math.atan2(dir.x, dir.z);
                } else {
                    ev.towTruckArrived = true;
                }
            }

            // Flash lights
            const flashOn = Math.floor(ev.timer * 4) % 2 === 0;
            if (ev.ambulance) {
                const fl = ev.ambulance.getObjectByName('flashLight');
                if (fl) (fl as THREE.Mesh).visible = flashOn;
            }
            if (ev.towTruck) {
                const fl = ev.towTruck.getObjectByName('flashLight');
                if (fl) (fl as THREE.Mesh).visible = !flashOn;
            }

            // After both arrive, wait 5 seconds then start cleanup
            if (ev.ambulanceArrived && ev.towTruckArrived && !ev.cleanup && ev.timer > 8) {
                ev.cleanup = true;
                ev.yellowFlagActive = false;
            }

            // Cleanup: drive away
            if (ev.cleanup) {
                if (ev.ambulance) {
                    ev.ambulance.position.x += 30 * dt;
                    ev.ambulance.position.z += 20 * dt;
                }
                if (ev.towTruck) {
                    ev.towTruck.position.x -= 30 * dt;
                    ev.towTruck.position.z -= 20 * dt;
                }

                // Remove after driving away
                if (ev.timer > 15) {
                    if (ev.ambulance) scene.remove(ev.ambulance);
                    if (ev.towTruck) scene.remove(ev.towTruck);
                    this.crashEvents.splice(i, 1);
                }
            }
        }
    }

    public isInYellowFlagZone(pos: THREE.Vector3): boolean {
        for (const ev of this.crashEvents) {
            if (ev.yellowFlagActive && ev.position.distanceTo(pos) < 50) {
                return true;
            }
        }
        return false;
    }

    public clear(scene: THREE.Scene): void {
        this.crashEvents.forEach(ev => {
            if (ev.ambulance) scene.remove(ev.ambulance);
            if (ev.towTruck) scene.remove(ev.towTruck);
        });
        this.crashEvents = [];
    }
}
