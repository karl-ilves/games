import * as THREE from 'three';
import { FlightStateData, StuntRing } from '../types';
import { AIRPORTS } from '../catalog';

export class FlightHUD {
    private elAirspeed: HTMLElement | null;
    private elAltitude: HTMLElement | null;
    private elVsi: HTMLElement | null;
    private elHeading: HTMLElement | null;
    private elCardinal: HTMLElement | null;
    private elGyroHorizon: HTMLElement | null;
    private elThrottleFill: HTMLElement | null;
    private elThrottlePct: HTMLElement | null;
    private elGearTag: HTMLElement | null;
    private elFlapsTag: HTMLElement | null;
    private elBrakesTag: HTMLElement | null;
    private elApTag: HTMLElement | null;
    private elWarningBanner: HTMLElement | null;
    private elRadarCanvas: HTMLCanvasElement | null;
    private radarCtx: CanvasRenderingContext2D | null;
    private elCashVal: HTMLElement | null;
    private elPilotRank: HTMLElement | null;

    private papiDots: (HTMLElement | null)[] = [];
    private elPapiText: HTMLElement | null;

    constructor() {
        this.elAirspeed = document.getElementById('hud-airspeed');
        this.elAltitude = document.getElementById('hud-altitude');
        this.elVsi = document.getElementById('hud-vsi');
        this.elHeading = document.getElementById('hud-heading');
        this.elCardinal = document.getElementById('hud-cardinal');
        this.elGyroHorizon = document.getElementById('gyro-horizon');
        this.elThrottleFill = document.getElementById('throttle-fill');
        this.elThrottlePct = document.getElementById('hud-throttle-pct');
        this.elGearTag = document.getElementById('hud-gear-tag');
        this.elFlapsTag = document.getElementById('hud-flaps-tag');
        this.elBrakesTag = document.getElementById('hud-brakes-tag');
        this.elApTag = document.getElementById('hud-ap-tag');
        this.elWarningBanner = document.getElementById('warning-banner');
        this.elCashVal = document.getElementById('flight-cash-val');
        this.elPilotRank = document.getElementById('pilot-rank-text');

        this.elRadarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
        this.radarCtx = this.elRadarCanvas ? this.elRadarCanvas.getContext('2d') : null;

        for (let i = 1; i <= 4; i++) {
            this.papiDots.push(document.getElementById(`papi-${i}`));
        }
        this.elPapiText = document.getElementById('papi-text');
    }

    public update(
        state: FlightStateData,
        pos: THREE.Vector3,
        stuntRings: StuntRing[],
        papiStatus: { redCount: number; whiteCount: number; stateText: string },
        cash: number,
        rankTitle: string
    ): void {
        // Airspeed
        if (this.elAirspeed) {
            this.elAirspeed.textContent = Math.round(state.airspeed).toString();
        }

        // Altitude
        if (this.elAltitude) {
            this.elAltitude.textContent = state.altitude.toLocaleString();
        }

        // Vertical speed
        if (this.elVsi) {
            const vs = state.verticalSpeed;
            this.elVsi.textContent = (vs >= 0 ? '+' : '') + vs;
            this.elVsi.style.color = vs >= 0 ? '#2ecc71' : '#e74c3c';
        }

        // Heading & Cardinal
        if (this.elHeading) {
            const hdg = Math.round(state.heading);
            this.elHeading.textContent = `${hdg.toString().padStart(3, '0')}°`;
        }
        if (this.elCardinal) {
            const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
            const idx = Math.round(state.heading / 45) % 8;
            this.elCardinal.textContent = cardinals[idx];
        }

        // Artificial Horizon (Pitch ladder and Bank Angle)
        if (this.elGyroHorizon) {
            // Roll rotates, Pitch moves translateY
            const pitchPx = state.pitch * 3.5;
            const rollDeg = -state.roll;
            this.elGyroHorizon.style.transform = `rotate(${rollDeg}deg) translateY(${pitchPx}px)`;
        }

        // Throttle
        const pct = Math.round(state.throttle * 100);
        if (this.elThrottlePct) {
            this.elThrottlePct.textContent = `${pct}%`;
        }
        if (this.elThrottleFill) {
            this.elThrottleFill.style.width = `${pct}%`;
            this.elThrottleFill.style.background = state.afterburner 
                ? 'linear-gradient(90deg, #ff4757, #ff6b81)' 
                : 'linear-gradient(90deg, #00f2fe, #2ecc71)';
        }

        // Gear status
        if (this.elGearTag) {
            if (state.gearTransition >= 0.95) {
                this.elGearTag.textContent = 'DOWN';
                this.elGearTag.className = 'status-tag tag-green';
            } else if (state.gearTransition <= 0.05) {
                this.elGearTag.textContent = 'UP';
                this.elGearTag.className = 'status-tag tag-amber';
            } else {
                this.elGearTag.textContent = 'IN TRANSIT';
                this.elGearTag.className = 'status-tag tag-red';
            }
        }

        // Flaps
        if (this.elFlapsTag) {
            const flapNames = ['UP (0°)', '15° (T/O)', '30° (FULL)'];
            this.elFlapsTag.textContent = flapNames[state.flaps] || 'UP';
        }

        // Brakes
        if (this.elBrakesTag) {
            this.elBrakesTag.textContent = state.brakes ? 'BRAKES ON' : 'OFF';
            this.elBrakesTag.className = `status-tag ${state.brakes ? 'tag-amber' : 'tag-green'}`;
        }

        // Autopilot
        if (this.elApTag) {
            this.elApTag.textContent = state.autopilot ? 'ENGAGED' : 'DISENGAGED';
            this.elApTag.className = `status-tag ${state.autopilot ? 'tag-green' : 'tag-red'}`;
        }

        // Warnings
        if (this.elWarningBanner) {
            if (state.stalled) {
                this.elWarningBanner.style.display = 'block';
                this.elWarningBanner.textContent = '⚠️ STALL WARNING - PUSH NOSE DOWN';
            } else if (!state.isOnGround && state.verticalSpeed < -2500 && state.altitude < 1200) {
                this.elWarningBanner.style.display = 'block';
                this.elWarningBanner.textContent = '🚨 PULL UP! TERRAIN AHEAD';
            } else {
                this.elWarningBanner.style.display = 'none';
            }
        }

        // PAPI Approach slope
        for (let i = 0; i < 4; i++) {
            const dot = this.papiDots[i];
            if (dot) {
                dot.className = `papi-dot ${i < papiStatus.redCount ? 'papi-red' : 'papi-white'}`;
            }
        }
        if (this.elPapiText) {
            this.elPapiText.textContent = papiStatus.stateText;
            this.elPapiText.style.color = papiStatus.redCount === 2 ? '#2ecc71' : (papiStatus.redCount === 4 ? '#e74c3c' : '#f1c40f');
        }

        // Top Bar Cash & Rank
        if (this.elCashVal) this.elCashVal.textContent = cash.toLocaleString();
        if (this.elPilotRank) this.elPilotRank.textContent = rankTitle;

        // Render Radar Mini-map
        this.renderRadar(pos, state.heading, stuntRings);
    }

    private renderRadar(playerPos: THREE.Vector3, headingDeg: number, rings: StuntRing[]): void {
        if (!this.radarCtx || !this.elRadarCanvas) return;
        const ctx = this.radarCtx;
        const w = this.elRadarCanvas.width;
        const h = this.elRadarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 0.016; // 1 meter = 0.016 px (shows ~4500m radius)

        ctx.clearRect(0, 0, w, h);

        // Circular background
        ctx.fillStyle = '#06101e';
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.fill();

        // Range rings
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
        ctx.lineWidth = 1;
        [cx * 0.35, cx * 0.7, cx * 0.95].forEach(r => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-THREE.MathUtils.degToRad(headingDeg));

        // Draw Airport Runways relative to player
        AIRPORTS.forEach(ap => {
            const rx1 = (ap.runwayStart.x - playerPos.x) * scale;
            const rz1 = (ap.runwayStart.z - playerPos.z) * scale;
            const rx2 = (ap.runwayEnd.x - playerPos.x) * scale;
            const rz2 = (ap.runwayEnd.z - playerPos.z) * scale;

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(rx1, rz1);
            ctx.lineTo(rx2, rz2);
            ctx.stroke();

            // Label
            ctx.fillStyle = '#a7f3d0';
            ctx.font = '9px sans-serif';
            ctx.fillText(ap.id, (rx1 + rx2) * 0.5 + 4, (rz1 + rz2) * 0.5 - 4);
        });

        // Draw Stunt Rings
        rings.forEach(r => {
            if (!r.collected) {
                const px = (r.position.x - playerPos.x) * scale;
                const pz = (r.position.z - playerPos.z) * scale;

                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(px, pz, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();

        // Ownship Aircraft Icon (Center)
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx + 5, cy + 5);
        ctx.lineTo(cx, cy + 3);
        ctx.lineTo(cx - 5, cy + 5);
        ctx.closePath();
        ctx.fill();
    }
}
