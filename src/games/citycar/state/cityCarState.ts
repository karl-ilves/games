import { CameraMode } from '../types';
import { CAR_COLORS } from '../catalog';

const STORAGE_KEY_COLOR = 'playard_citycar_color';
const STORAGE_KEY_AUDIO = 'playard_citycar_audio';
const STORAGE_KEY_ODOMETER = 'playard_citycar_odometer';

export interface CityCarStateData {
    carColor: string;
    audioEnabled: boolean;
    cameraMode: CameraMode;
    totalDistanceKm: number;
    currentSpeedKmh: number;
    gear: 'P' | 'D' | 'R';
    userId: string;
    userName: string;
}

export class CityCarStateManager {
    private state: CityCarStateData;

    constructor() {
        const savedColor = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_COLOR) || CAR_COLORS[0].hex : CAR_COLORS[0].hex;
        const savedAudio = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_AUDIO) !== 'false' : true;
        const savedOdometer = typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem(STORAGE_KEY_ODOMETER) || '0') : 0;

        this.state = {
            carColor: savedColor,
            audioEnabled: savedAudio,
            cameraMode: 'chase',
            totalDistanceKm: isNaN(savedOdometer) ? 0 : savedOdometer,
            currentSpeedKmh: 0,
            gear: 'P',
            userId: this.generateOrLoadUserId(),
            userName: this.loadUserName()
        };
    }

    private generateOrLoadUserId(): string {
        if (typeof localStorage === 'undefined') return 'driver_' + Math.floor(Math.random() * 10000);
        let id = localStorage.getItem('playard_citycar_uid');
        if (!id) {
            id = 'driver_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('playard_citycar_uid', id);
        }
        return id;
    }

    private loadUserName(): string {
        if (typeof localStorage === 'undefined') return 'Driver';
        try {
            const raw = localStorage.getItem('playard_current_user_profile');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.username) return parsed.username;
                if (parsed.displayName) return parsed.displayName;
            }
        } catch (e) {}
        return 'Driver ' + Math.floor(10 + Math.random() * 89);
    }

    public getCarColor(): string {
        return this.state.carColor;
    }

    public setCarColor(colorHex: string): void {
        this.state.carColor = colorHex;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_COLOR, colorHex);
        }
    }

    public isAudioEnabled(): boolean {
        return this.state.audioEnabled;
    }

    public toggleAudio(): boolean {
        this.state.audioEnabled = !this.state.audioEnabled;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_AUDIO, this.state.audioEnabled ? 'true' : 'false');
        }
        return this.state.audioEnabled;
    }

    public getCameraMode(): CameraMode {
        return this.state.cameraMode;
    }

    public setCameraMode(mode: CameraMode): void {
        this.state.cameraMode = mode;
    }

    public cycleCameraMode(): CameraMode {
        const modes: CameraMode[] = ['chase', 'close', 'hood', 'topdown'];
        const nextIdx = (modes.indexOf(this.state.cameraMode) + 1) % modes.length;
        this.state.cameraMode = modes[nextIdx];
        return this.state.cameraMode;
    }

    public addDistanceTraveled(km: number): void {
        this.state.totalDistanceKm += km;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_ODOMETER, this.state.totalDistanceKm.toFixed(2));
        }
    }

    public getOdometer(): number {
        return this.state.totalDistanceKm;
    }

    public updateSpeedAndGear(speedKmh: number, gear: 'P' | 'D' | 'R'): void {
        this.state.currentSpeedKmh = speedKmh;
        this.state.gear = gear;
    }

    public getSpeed(): number {
        return this.state.currentSpeedKmh;
    }

    public getGear(): 'P' | 'D' | 'R' {
        return this.state.gear;
    }

    public getUserId(): string {
        return this.state.userId;
    }

    public getUserName(): string {
        return this.state.userName;
    }

    public setUserName(name: string): void {
        this.state.userName = name;
    }
}

export const cityCarState = new CityCarStateManager();
