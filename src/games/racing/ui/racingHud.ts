import * as THREE from 'three';
import { Checkpoint, Opponent } from '../types';
import { yardService } from '../../../shared/yardService';
import { RacingState } from '../state/racingState';

export class RacingHud {
    public drawMinimap(
        checkpoints: Checkpoint[],
        nextCheckpointIndex: number,
        playerPos: THREE.Vector3 | null,
        opponents: Opponent[]
    ): void {
        const canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        let minX = Infinity,
            maxX = -Infinity,
            minZ = Infinity,
            maxZ = -Infinity;
        checkpoints.forEach(cp => {
            if (cp.x < minX) minX = cp.x;
            if (cp.x > maxX) maxX = cp.x;
            if (cp.z < minZ) minZ = cp.z;
            if (cp.z > maxZ) maxZ = cp.z;
        });

        const pad = 80;
        minX -= pad;
        maxX += pad;
        minZ -= pad;
        maxZ += pad;
        const rangeX = maxX - minX;
        const rangeZ = maxZ - minZ;
        const scale = Math.min((W - 20) / rangeX, (H - 20) / rangeZ);
        const offX = (W - rangeX * scale) / 2;
        const offZ = (H - rangeZ * scale) / 2;

        function toScreen(wx: number, wz: number): [number, number] {
            return [(wx - minX) * scale + offX, (wz - minZ) * scale + offZ];
        }

        // Track lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < checkpoints.length; i++) {
            const [sx, sy] = toScreen(checkpoints[i].x, checkpoints[i].z);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        const [sx0, sy0] = toScreen(checkpoints[0].x, checkpoints[0].z);
        ctx.lineTo(sx0, sy0);
        ctx.stroke();

        // Checkpoint dots
        checkpoints.forEach((cp, i) => {
            const [sx, sy] = toScreen(cp.x, cp.z);
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#666';
            ctx.fill();

            ctx.fillStyle = '#888';
            ctx.font = '8px sans-serif';
            ctx.fillText((i + 1).toString(), sx + 4, sy - 2);
        });

        // Next checkpoint
        if (nextCheckpointIndex < checkpoints.length) {
            const ncp = checkpoints[nextCheckpointIndex];
            const [nx, ny] = toScreen(ncp.x, ncp.z);
            ctx.beginPath();
            ctx.arc(nx, ny, 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Opponents
        opponents.forEach(ai => {
            const [ax, ay] = toScreen(ai.group.position.x, ai.group.position.z);
            ctx.beginPath();
            ctx.arc(ax, ay, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#3498db';
            ctx.fill();
        });

        // Player
        if (playerPos) {
            const [px, py] = toScreen(playerPos.x, playerPos.z);
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    public updateRaceHud(raceTime: number, position: number, totalRacers: number, cpIndex: number): void {
        const m = Math.floor(raceTime / 60);
        const s = Math.floor(raceTime % 60);
        const ms = Math.floor((raceTime * 100) % 100);

        const timeVal = document.getElementById('time-val');
        if (timeVal) {
            timeVal.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
        }

        const posVal = document.getElementById('pos-val');
        if (posVal) {
            posVal.innerText = `${position}/${totalRacers}`;
        }

        const cpVal = document.getElementById('cp-val');
        if (cpVal) {
            cpVal.innerText = `${cpIndex === 0 ? 10 : cpIndex}/10`;
        }
    }

    public updateNitroBar(nitro: number): void {
        const nitroBar = document.getElementById('nitro-bar');
        if (nitroBar) {
            nitroBar.style.width = `${nitro}%`;
        }
    }

    public handleRaceFinished(
        state: RacingState,
        pos: number,
        timeStr: string
    ): void {
        let prize = 50;
        if (state.selectedLevel === 1) {
            if (pos === 1) prize = 200;
            else if (pos === 2) prize = 100;
            else prize = 50;
        } else if (state.selectedLevel === 2) {
            if (pos === 1) prize = 1000;
            else if (pos === 2) prize = 500;
            else if (pos === 3) prize = 300;
            else if (pos === 4) prize = 250;
            else if (pos >= 5 && pos <= 10) prize = 200;
            else prize = 50;
        } else if (state.selectedLevel === 3) {
            if (pos === 1) prize = 10000;
            else if (pos === 2) prize = 5000;
            else if (pos === 3) prize = 4000;
            else if (pos === 4) prize = 3000;
            else if (pos >= 5 && pos <= 9) prize = 2000;
            else if (pos >= 10 && pos <= 20) prize = 1000;
            else prize = 500;
        }

        state.money += prize;
        state.saveProgress();

        alert(`🏁 Race Finished: Place ${pos}!\n⏱️ Time: ${timeStr}\n💵 Won: $${prize}`);
        location.reload();
    }
}
