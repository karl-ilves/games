import { CarCrashState } from '../types';

export class CarCrashStateManager {
    private state: CarCrashState;
    private listeners: ((state: CarCrashState) => void)[] = [];

    constructor() {
        this.state = {
            speedKmh: 0,
            gear: 'N',
            damagePercent: 0,
            gForce: 0,
            deformedNodesCount: 0,
            isSlowMo: false,
            slowMoScale: 1.0,
            selectedVehicleId: 'muscle_v8',
            cameraMode: 'chase',
            totalCrashes: 0,
            maxImpactG: 0
        };
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            const raw = localStorage.getItem('playard_carcrash_stats');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.totalCrashes === 'number') this.state.totalCrashes = parsed.totalCrashes;
                if (typeof parsed.maxImpactG === 'number') this.state.maxImpactG = parsed.maxImpactG;
                if (parsed.selectedVehicleId) this.state.selectedVehicleId = parsed.selectedVehicleId;
            }
        } catch (_) {}
    }

    private saveToStorage(): void {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            localStorage.setItem('playard_carcrash_stats', JSON.stringify({
                totalCrashes: this.state.totalCrashes,
                maxImpactG: this.state.maxImpactG,
                selectedVehicleId: this.state.selectedVehicleId
            }));
        } catch (_) {}
    }

    public getState(): Readonly<CarCrashState> {
        return this.state;
    }

    public subscribe(fn: (state: CarCrashState) => void): () => void {
        this.listeners.push(fn);
        return () => {
            this.listeners = this.listeners.filter(l => l !== fn);
        };
    }

    private notify(): void {
        for (const fn of this.listeners) {
            fn(this.state);
        }
    }

    public updateTelemetry(speedKmh: number, gear: string, gForce: number): void {
        this.state.speedKmh = Math.max(0, Math.round(speedKmh));
        this.state.gear = gear;
        this.state.gForce = Math.max(0, Math.round(gForce * 10) / 10);
        if (gForce > this.state.maxImpactG) {
            this.state.maxImpactG = Math.round(gForce * 10) / 10;
            this.saveToStorage();
        }
        this.notify();
    }

    public updateDamage(damagePercent: number, deformedNodes: number): void {
        const prev = this.state.damagePercent;
        this.state.damagePercent = Math.min(100, Math.max(0, Math.round(damagePercent)));
        this.state.deformedNodesCount = deformedNodes;
        if (this.state.damagePercent > prev + 5) {
            this.state.totalCrashes++;
            this.saveToStorage();
        }
        this.notify();
    }

    public setVehicle(vehicleId: string): void {
        this.state.selectedVehicleId = vehicleId;
        this.resetDamage();
        this.saveToStorage();
        this.notify();
    }

    public toggleSlowMo(): boolean {
        this.state.isSlowMo = !this.state.isSlowMo;
        this.state.slowMoScale = this.state.isSlowMo ? 0.2 : 1.0;
        this.notify();
        return this.state.isSlowMo;
    }

    public setSlowMo(active: boolean): void {
        this.state.isSlowMo = active;
        this.state.slowMoScale = active ? 0.2 : 1.0;
        this.notify();
    }

    public cycleCamera(): string {
        const modes: ('chase' | 'hood' | 'cinematic' | 'orbit')[] = ['chase', 'hood', 'cinematic', 'orbit'];
        const idx = modes.indexOf(this.state.cameraMode);
        this.state.cameraMode = modes[(idx + 1) % modes.length];
        this.notify();
        return this.state.cameraMode;
    }

    public resetDamage(): void {
        this.state.damagePercent = 0;
        this.state.deformedNodesCount = 0;
        this.state.gForce = 0;
        this.notify();
    }
}

export const carCrashState = new CarCrashStateManager();
