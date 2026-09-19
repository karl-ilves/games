import { CarInputState } from '../types';

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

    constructor(onCameraToggle?: () => void, onAudioToggle?: () => void) {
        this.onCameraToggleCallback = onCameraToggle;
        this.onAudioToggleCallback = onAudioToggle;

        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => this.handleKeyDown(e));
            window.addEventListener('keyup', (e) => this.handleKeyUp(e));
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
        let throttle = 0;
        if (this.keys['w'] || this.keys['arrowup']) throttle += 1;

        // Brake / Reverse
        let brake = 0;
        if (this.keys['s'] || this.keys['arrowdown']) brake += 1;

        // Steering
        let steer = 0;
        if (this.keys['a'] || this.keys['arrowleft']) steer -= 1;
        if (this.keys['d'] || this.keys['arrowright']) steer += 1;

        this.state.throttle = throttle;
        this.state.brake = brake;
        this.state.steer = steer;
        this.state.handbrake = !!this.keys[' '];
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
}
