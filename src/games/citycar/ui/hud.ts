import * as THREE from 'three';
import { CameraMode, DriverInfo, WantedLevel, WorldZone } from '../types';
import { CAR_COLORS, CAMERA_CONFIGS } from '../catalog';

export class CityCarHUD {
    private speedEl: HTMLElement | null = null;
    private gearPEl: HTMLElement | null = null;
    private gearDEl: HTMLElement | null = null;
    private gearREl: HTMLElement | null = null;
    private zoneBannerEl: HTMLElement | null = null;
    private onlineCountEl: HTMLElement | null = null;
    private rosterEl: HTMLElement | null = null;
    private camLabelEl: HTMLElement | null = null;
    private audioIconEl: HTMLElement | null = null;
    private minimapCanvas: HTMLCanvasElement | null = null;
    private minimapCtx: CanvasRenderingContext2D | null = null;
    private accessModalEl: HTMLElement | null = null;
    private colorModalEl: HTMLElement | null = null;
    private wantedCardEl: HTMLElement | null = null;
    private star1El: HTMLElement | null = null;
    private star2El: HTMLElement | null = null;
    private star3El: HTMLElement | null = null;
    private star4El: HTMLElement | null = null;
    private flyingStarContainerEl: HTMLElement | null = null;
    private flyingStarIconEl: HTMLElement | null = null;
    private arrestedModalEl: HTMLElement | null = null;
    private btnArrestedResetEl: HTMLElement | null = null;
    private onResetCallback: (() => void) | null = null;

    private lastZone: WorldZone | null = null;
    private bannerTimeout: any = null;

    constructor(
        onColorSelected: (colorHex: string) => void,
        onCameraToggle: () => void,
        onResetCar: () => void,
        onHornToggle: (active: boolean) => void,
        onAudioToggle: () => void
    ) {
        this.bindDomElements();
        this.setupButtons(onColorSelected, onCameraToggle, onResetCar, onHornToggle, onAudioToggle);
        this.populateColorPalette(onColorSelected);
    }

    private bindDomElements(): void {
        this.speedEl = document.getElementById('speed-val');
        this.gearPEl = document.getElementById('gear-p');
        this.gearDEl = document.getElementById('gear-d');
        this.gearREl = document.getElementById('gear-r');
        this.zoneBannerEl = document.getElementById('zone-banner');
        this.onlineCountEl = document.getElementById('online-count');
        this.rosterEl = document.getElementById('drivers-roster');
        this.camLabelEl = document.getElementById('cam-view-label');
        this.audioIconEl = document.getElementById('audio-icon');
        this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
        if (this.minimapCanvas) {
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }
        this.accessModalEl = document.getElementById('access-restricted-modal');
        this.colorModalEl = document.getElementById('color-modal');
        this.wantedCardEl = document.getElementById('wanted-card');
        this.star1El = document.getElementById('hud-star-1');
        this.star2El = document.getElementById('hud-star-2');
        this.star3El = document.getElementById('hud-star-3');
        this.star4El = document.getElementById('hud-star-4');
        this.flyingStarContainerEl = document.getElementById('flying-star-container');
        this.flyingStarIconEl = document.getElementById('flying-star-icon');
        this.arrestedModalEl = document.getElementById('arrested-modal');
        this.btnArrestedResetEl = document.getElementById('btn-arrested-reset');

        if (this.btnArrestedResetEl) {
            this.btnArrestedResetEl.addEventListener('click', () => {
                if (this.onResetCallback) {
                    this.onResetCallback();
                }
            });
        }
    }

    private setupButtons(
        onColorSelected: (colorHex: string) => void,
        onCameraToggle: () => void,
        onResetCar: () => void,
        onHornToggle: (active: boolean) => void,
        onAudioToggle: () => void
    ): void {
        const btnCam = document.getElementById('btn-toggle-cam');
        btnCam?.addEventListener('click', onCameraToggle);

        const btnReset = document.getElementById('btn-reset-car');
        btnReset?.addEventListener('click', onResetCar);

        const btnHorn = document.getElementById('btn-car-horn');
        btnHorn?.addEventListener('mousedown', () => onHornToggle(true));
        btnHorn?.addEventListener('mouseup', () => onHornToggle(false));
        btnHorn?.addEventListener('touchstart', (e) => { e.preventDefault(); onHornToggle(true); });
        btnHorn?.addEventListener('touchend', (e) => { e.preventDefault(); onHornToggle(false); });

        const btnAudio = document.getElementById('btn-toggle-audio');
        btnAudio?.addEventListener('click', onAudioToggle);

        const btnColor = document.getElementById('btn-car-color');
        btnColor?.addEventListener('click', () => {
            if (this.colorModalEl) this.colorModalEl.style.display = 'flex';
        });

        const btnCloseColor = document.getElementById('btn-close-color-modal');
        btnCloseColor?.addEventListener('click', () => {
            if (this.colorModalEl) this.colorModalEl.style.display = 'none';
        });
    }

    private populateColorPalette(onColorSelected: (colorHex: string) => void): void {
        const container = document.getElementById('color-palette-container');
        if (!container) return;
        container.innerHTML = '';

        CAR_COLORS.forEach((c) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = c.hex;
            swatch.title = c.name;
            swatch.addEventListener('click', () => {
                onColorSelected(c.hex);
                if (this.colorModalEl) this.colorModalEl.style.display = 'none';
            });
            container.appendChild(swatch);
        });
    }

    public updateSpeedAndGear(speedKmh: number, gear: 'P' | 'D' | 'R'): void {
        if (this.speedEl) this.speedEl.textContent = speedKmh.toString();
        if (this.gearPEl) this.gearPEl.className = gear === 'P' ? 'gear-letter active' : 'gear-letter';
        if (this.gearDEl) this.gearDEl.className = gear === 'D' ? 'gear-letter active' : 'gear-letter';
        if (this.gearREl) this.gearREl.className = gear === 'R' ? 'gear-letter active' : 'gear-letter';
    }

    public updateZone(zone: WorldZone): void {
        if (zone === this.lastZone) return;
        this.lastZone = zone;

        if (!this.zoneBannerEl) return;

        const zoneLabels: Record<WorldZone, string> = {
            city: '🏙️ Downtown City',
            river: '🌊 Grand River Waterway',
            bridge: '🌉 Suspension Bridge Crossing',
            border: '🚧 North Border Checkpoint',
            forest: '🌲 Pinecone Nature Forest'
        };

        this.zoneBannerEl.textContent = zoneLabels[zone] || zone;
        this.zoneBannerEl.classList.add('show');

        clearTimeout(this.bannerTimeout);
        this.bannerTimeout = setTimeout(() => {
            this.zoneBannerEl?.classList.remove('show');
        }, 3200);
    }

    public updateDriversRoster(drivers: DriverInfo[]): void {
        if (this.onlineCountEl) {
            this.onlineCountEl.textContent = drivers.length.toString();
        }
        if (!this.rosterEl) return;

        this.rosterEl.innerHTML = '';
        drivers.forEach((d) => {
            const li = document.createElement('li');
            li.className = 'driver-item';
            const dot = `<span style="color: ${d.color || '#00f2fe'};">●</span>`;
            const name = d.isLocal ? `<strong>${d.name} (You)</strong>` : d.name;
            li.innerHTML = `${dot} <span>${name}</span>`;
            this.rosterEl?.appendChild(li);
        });
    }

    public updateCameraLabel(mode: CameraMode): void {
        if (this.camLabelEl) {
            this.camLabelEl.textContent = CAMERA_CONFIGS[mode]?.label || mode;
        }
    }

    public updateAudioIcon(enabled: boolean): void {
        if (this.audioIconEl) {
            this.audioIconEl.textContent = enabled ? '🔊' : '🔇';
        }
    }

    public showAccessRestrictedModal(): void {
        if (this.accessModalEl) {
            this.accessModalEl.style.display = 'flex';
        }
    }

    public updateWantedLevel(level: WantedLevel): void {
        if (!this.wantedCardEl) return;
        if (level === 0) {
            this.wantedCardEl.style.display = 'none';
            if (this.star1El) this.star1El.style.display = 'none';
            if (this.star2El) this.star2El.style.display = 'none';
            if (this.star3El) this.star3El.style.display = 'none';
            if (this.star4El) this.star4El.style.display = 'none';
        } else {
            this.wantedCardEl.style.display = 'flex';
            if (this.star1El) this.star1El.style.display = level >= 1 ? 'inline-block' : 'none';
            if (this.star2El) this.star2El.style.display = level >= 2 ? 'inline-block' : 'none';
            if (this.star3El) this.star3El.style.display = level >= 3 ? 'inline-block' : 'none';
            if (this.star4El) this.star4El.style.display = level >= 4 ? 'inline-block' : 'none';
        }
    }

    public triggerStarAwardAnimation(newLevel: WantedLevel): void {
        if (!this.flyingStarContainerEl || !this.flyingStarIconEl) {
            this.updateWantedLevel(newLevel);
            return;
        }

        const container = this.flyingStarContainerEl;
        const icon = this.flyingStarIconEl;

        // 1. Show star in center of the screen
        container.style.display = 'block';
        icon.style.transition = 'none';
        icon.style.top = '50%';
        icon.style.left = '50%';
        icon.style.transform = 'translate(-50%, -50%) scale(0.1)';
        icon.style.opacity = '1';

        // 2. Animate star pop
        requestAnimationFrame(() => {
            icon.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            icon.style.transform = 'translate(-50%, -50%) scale(1.35)';
        });

        // 3. Hold in center for 1.0s, then fly to top-right corner
        // (User: "ilmub su ette üks täht ja ja püsib 1 sek ja siis läheb paremale ülesse nurka")
        setTimeout(() => {
            let targetX = window.innerWidth - 80;
            let targetY = 28;

            if (this.wantedCardEl) {
                this.wantedCardEl.style.display = 'flex';
            }

            const starElements: Record<number, HTMLElement | null> = {
                1: this.star1El,
                2: this.star2El,
                3: this.star3El,
                4: this.star4El
            };
            const targetStar = starElements[newLevel] || this.star1El;
            if (targetStar) {
                targetStar.style.display = 'inline-block';
                targetStar.style.opacity = '0.3';
                const rect = targetStar.getBoundingClientRect();
                if (rect.left > 0 && rect.top > 0) {
                    targetX = rect.left;
                    targetY = rect.top;
                }
            }

            icon.style.transition = 'all 0.65s cubic-bezier(0.2, 0.85, 0.25, 1)';
            icon.style.top = `${targetY}px`;
            icon.style.left = `${targetX}px`;
            icon.style.transform = 'translate(0, 0) scale(0.3)';
            icon.style.opacity = '0.6';

            setTimeout(() => {
                container.style.display = 'none';
                this.updateWantedLevel(newLevel);
            }, 680);
        }, 1000);
    }

    public showArrestedModal(onReset: () => void): void {
        this.onResetCallback = onReset;
        if (this.arrestedModalEl) {
            this.arrestedModalEl.style.display = 'flex';
            requestAnimationFrame(() => {
                this.arrestedModalEl?.classList.add('active');
            });
        }
    }

    public hideArrestedModal(): void {
        if (this.arrestedModalEl) {
            this.arrestedModalEl.classList.remove('active');
            setTimeout(() => {
                if (this.arrestedModalEl && !this.arrestedModalEl.classList.contains('active')) {
                    this.arrestedModalEl.style.display = 'none';
                }
            }, 300);
        }
    }

    public updateMinimap(localPos: THREE.Vector3, localYaw: number, otherDrivers: DriverInfo[]): void {
        const ctx = this.minimapCtx;
        if (!ctx || !this.minimapCanvas) return;

        const w = this.minimapCanvas.width;
        const h = this.minimapCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Map scale: world range X: -300 to +300, Z: -250 to +250
        const scale = w / 600;
        const centerX = w / 2;
        const centerY = h / 2;

        const toScreenX = (worldX: number) => centerX + worldX * scale;
        const toScreenY = (worldZ: number) => centerY + worldZ * scale;

        // 1. City Zone Ground
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(0, 0, toScreenX(-40), h);

        // 2. Forest Zone Ground
        ctx.fillStyle = '#1b4332';
        ctx.fillRect(toScreenX(40), 0, w - toScreenX(40), h);

        // 3. River Channel
        ctx.fillStyle = '#0984e3';
        ctx.fillRect(toScreenX(-40), 0, toScreenX(40) - toScreenX(-40), h);

        // 4. Bridges
        ctx.fillStyle = '#e74c3c';
        // Central Bridge (Z=0)
        ctx.fillRect(toScreenX(-50), toScreenY(0) - 3, toScreenX(50) - toScreenX(-50), 6);
        // North Border Bridge (Z=120)
        ctx.fillRect(toScreenX(-50), toScreenY(120) - 3, toScreenX(50) - toScreenX(-50), 6);
        // South Bridge (Z=-120)
        ctx.fillRect(toScreenX(-50), toScreenY(-120) - 3, toScreenX(50) - toScreenX(-50), 6);

        // 5. Local Player Dot & Direction Needle
        const px = toScreenX(localPos.x);
        const py = toScreenY(localPos.z);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-localYaw);

        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Direction pointer
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 10);
        ctx.stroke();

        ctx.restore();
    }
}
