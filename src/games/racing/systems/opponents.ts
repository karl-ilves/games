import * as THREE from 'three';
import { Opponent, Checkpoint } from '../types';
import { VEHICLES } from '../catalog';
import { VehicleBuilder } from '../models/vehicleBuilder';

export class OpponentsManager {
    public opponents: Opponent[] = [];

    public spawnOpponents(
        scene: THREE.Scene,
        checkpoints: Checkpoint[],
        selectedLevel: number,
        vehicleBuilder: VehicleBuilder
    ): void {
        this.opponents.forEach(o => scene.remove(o.group));
        this.opponents = [];

        const cp = checkpoints[0];
        const cpNext = checkpoints[1];
        const dx = cpNext.x - cp.x;
        const dz = cpNext.z - cp.z;
        const angle = Math.atan2(dx, dz) + Math.PI;

        const numOpponents = selectedLevel === 1 ? 3 : (selectedLevel === 2 ? 9 : 19);

        for (let i = 0; i < numOpponents; i++) {
            const group = new THREE.Group();

            // Staggered grid starting positions
            const row = Math.floor((i + 1) / 2);
            const col = (i + 1) % 2 === 0 ? 1 : -1;

            const offsetX = col * 12;
            const offsetZ = row * 15;

            const startPos = new THREE.Vector3(offsetX, 0, offsetZ);
            startPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

            group.position.set(cp.x + startPos.x, 0, cp.z + startPos.z);

            const randomDef = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
            const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);

            const buildRes = vehicleBuilder.buildDetailedVehicle(randomDef, color);
            group.add(buildRes.group);

            const aiArrow = vehicleBuilder.createFloatingArrow(0x00ff00);
            group.add(aiArrow);

            scene.add(group);

            this.opponents.push({
                group: group,
                wheels: buildRes.wheels,
                speed: 0,
                heading: angle,
                targetCpIndex: 1,
                type: randomDef.type,
                maxSpeed: selectedLevel === 1
                    ? (30 + Math.random() * (randomDef.maxSpeed * 0.6))
                    : (selectedLevel === 2 ? (40 + Math.random() * (randomDef.maxSpeed * 0.8)) : (50 + Math.random() * (randomDef.maxSpeed * 1.0))),
                finished: false,
                finishOrder: 0,
                acceleration: selectedLevel === 1
                    ? randomDef.acceleration * 0.8
                    : (selectedLevel === 2 ? randomDef.acceleration * 1.0 : randomDef.acceleration * 1.2),
                crashed: false,
                crashTimer: 0
            });
        }
    }

    public updateOpponents(dt: number, checkpoints: Checkpoint[]): void {
        this.opponents.forEach(ai => {
            if (ai.finished || ai.crashed) {
                ai.speed *= 0.95;
                if (ai.speed < 0.5) ai.speed = 0;
                return;
            }

            let targetCp = checkpoints[ai.targetCpIndex];
            let adx = targetCp.x - ai.group.position.x;
            let adz = targetCp.z - ai.group.position.z;
            let dist = Math.sqrt(adx * adx + adz * adz);

            if (dist < targetCp.radius) {
                ai.targetCpIndex++;
                if (ai.targetCpIndex >= checkpoints.length) {
                    ai.finished = true;
                    ai.targetCpIndex = checkpoints.length - 1;
                    ai.finishOrder = this.opponents.filter(o => o.finished).length;
                    return;
                }
                targetCp = checkpoints[ai.targetCpIndex];
                adx = targetCp.x - ai.group.position.x;
                adz = targetCp.z - ai.group.position.z;
            }

            const targetHeading = Math.atan2(adx, adz) + Math.PI;

            let angleDiff = targetHeading - ai.heading;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            ai.heading += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 1.5 * dt);

            ai.speed += (ai.acceleration || 20) * dt;
            if (ai.speed > ai.maxSpeed) ai.speed = ai.maxSpeed;

            ai.group.rotation.y = ai.heading;
            const moveDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ai.heading);
            ai.group.position.add(moveDir.multiplyScalar(ai.speed * dt));

            // Update AI 3D Arrow
            const bobGroup = ai.group.getObjectByName('floatingArrowBob');
            if (bobGroup) {
                const arrow = bobGroup.getObjectByName('floatingArrow');
                if (arrow) {
                    const cpTarget = checkpoints[ai.targetCpIndex];
                    const aadx = cpTarget.x - ai.group.position.x;
                    const aadz = cpTarget.z - ai.group.position.z;
                    const targetAngle = Math.atan2(aadx, aadz) + Math.PI;
                    arrow.rotation.y = targetAngle - ai.heading;
                }
                bobGroup.position.y = Math.sin(Date.now() * 0.005 + ai.group.id) * 1.0;
            }

            // Lean for AI moto
            if (ai.type === 'moto') {
                const body = ai.group.children[0];
                if (body) {
                    const lean = Math.sign(angleDiff) * -0.5;
                    body.rotation.z += (lean - body.rotation.z) * 5 * dt;
                }
            }
        });
    }

    public animateWheels(dt: number): void {
        this.opponents.forEach(o => {
            const oppRotSpeed = (o.speed * dt) / 0.4;
            o.wheels.forEach(w => (w.rotation.x -= oppRotSpeed));
        });
    }
}
