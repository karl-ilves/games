import { CarInputState } from '../types';
import { CityCarMobileArrows } from '../ui/mobileArrows';

export class CityCarInputController {
    public state: CarInputState = {
        throttle: 0,
        brake: 0,
        steer: 0,
        handbrake: false,
        horn: false,
        reset: false
    };

    private keys: Record<string, boolean> = {};
    private onCameraToggleCallback?: () => void;
    private onAudioToggleCallback?: () => void;
    private mobileArrows: CityCarMobileArrows | null = null;
    private touchThrottle = 0;
    private touchBrake = 0;
    private touchSteer = 0;
    private touchHandbrake = false;

    constructor(onCameraToggle?: () => void, onAudioToggle?: () => void) {
        this.onCameraToggleCallback = onCameraToggle;
        this.onAudioToggleCallback = onAudioToggle;

        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => this.handleKeyDown(e));
            window.addEventListener('keyup', (e) => this.handleKeyUp(e));

            // Initialize mobile touch arrow controls for phone players
            // User request: "kui andmepaas tuvastab telefonis mängja siis ilmub talle nooled"
            this.mobileArrows = new CityCarMobileArrows({
                onThrottle: (val) => {
                    this.touchThrottle = val;
                    this.updateState();
                },
                onBrake: (val) => {
                    this.touchBrake = val;
                    this.updateState();
                },
                onSteer: (val) => {
                    this.touchSteer = val;
                    this.updateState();
                },
                onHandbrake: (active) => {
                    this.touchHandbrake = active;
                    this.updateState();
                },
                onHorn: (active) => {
                    this.triggerHorn(active);
                },
                onReset: () => {
                    this.triggerReset();
                },
                onCameraToggle: () => {
                    if (this.onCameraToggleCallback) {
                        this.onCameraToggleCallback();
                    }
                }
            });
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const key = e.key.toLowerCase();
        this.keys[key] = true;

        if (key === 'c' && this.onCameraToggleCallback) {
            this.onCameraToggleCallback();
        }
        if (key === 'm' && this.onAudioToggleCallback) {
            this.onAudioToggleCallback();
        }
        if (key === 'r') {
            this.state.reset = true;
        }
        if (key === 'h') {
            this.state.horn = true;
        }

        this.updateState();
    }

    private handleKeyUp(e: KeyboardEvent): void {
        const key = e.key.toLowerCase();
        this.keys[key] = false;
        if (key === 'h') {
            this.state.horn = false;
        }
        this.updateState();
    }

    private updateState(): void {
        // Throttle (Forward)
        let throttle = this.touchThrottle;
        if (this.keys['w'] || this.keys['arrowup']) throttle = 1;

        // Brake / Reverse
        let brake = this.touchBrake;
        if (this.keys['s'] || this.keys['arrowdown']) brake = 1;

        // Steering
        let steer = this.touchSteer;
        if (this.keys['a'] || this.keys['arrowleft']) steer = -1;
        if (this.keys['d'] || this.keys['arrowright']) steer = 1;

        this.state.throttle = Math.max(0, Math.min(1, throttle));
        this.state.brake = Math.max(0, Math.min(1, brake));
        this.state.steer = Math.max(-1, Math.min(1, steer));
        this.state.handbrake = !!this.keys[' '] || this.touchHandbrake;
    }

    public postPhysicsUpdate(): void {
        // Clear one-shot pulse inputs
        this.state.reset = false;
    }

    public triggerReset(): void {
        this.state.reset = true;
    }

    public triggerHorn(active: boolean): void {
        this.state.horn = active;
    }

    public getMobileArrows(): CityCarMobileArrows | null {
        return this.mobileArrows;
    }

    public setMobileArrowsVisible(visible: boolean): void {
        this.mobileArrows?.setVisible(visible);
    }
}
