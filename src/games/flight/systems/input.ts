export interface FlightInputState {
    pitch: number;
    roll: number;
    yaw: number;
    throttleDelta: number;
    toggleGear: boolean;
    toggleFlaps: boolean;
    toggleBrakes: boolean;
    toggleAP: boolean;
    toggleCam: boolean;
    toggleAntiIce: boolean;
}

export class FlightInputController {
    private keys: { [code: string]: boolean } = {};
    private pendingToggles = {
        gear: false,
        flaps: false,
        brakes: false,
        ap: false,
        cam: false,
        antiIce: false
    };

    // Mobile touch overrides
    private touchThrottleUp = false;
    private touchThrottleDown = false;
    private touchPitchUp = false;
    private touchPitchDown = false;
    private touchRollLeft = false;
    private touchRollRight = false;
    private touchYawLeft = false;
    private touchYawRight = false;

    constructor() {
        this.bindKeyboard();
        this.bindMobileUI();
    }

    private bindKeyboard(): void {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'KeyG' && !e.repeat) this.pendingToggles.gear = true;
            if (e.code === 'KeyT' && !e.repeat) this.pendingToggles.flaps = true;
            if (e.code === 'KeyB' && !e.repeat) this.pendingToggles.brakes = true;
            if (e.code === 'KeyP' && !e.repeat) this.pendingToggles.ap = true;
            if (e.code === 'KeyC' && !e.repeat) this.pendingToggles.cam = true;
            if (e.code === 'KeyJ' && !e.repeat) this.pendingToggles.antiIce = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    private bindMobileUI(): void {
        const bindBtn = (id: string, onDown: () => void, onUp: () => void) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
            btn.addEventListener('pointerup', (e) => { e.preventDefault(); onUp(); });
            btn.addEventListener('pointercancel', (e) => { e.preventDefault(); onUp(); });
        };

        const bindClick = (id: string, onClick: () => void) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('click', (e) => { e.preventDefault(); onClick(); });
        };

        bindBtn('mob-throttle-up', () => this.touchThrottleUp = true, () => this.touchThrottleUp = false);
        bindBtn('mob-throttle-down', () => this.touchThrottleDown = true, () => this.touchThrottleDown = false);
        bindBtn('mob-yaw-left', () => this.touchYawLeft = true, () => this.touchYawLeft = false);
        bindBtn('mob-yaw-right', () => this.touchYawRight = true, () => this.touchYawRight = false);
        bindBtn('mob-pitch-up', () => this.touchPitchUp = true, () => this.touchPitchUp = false);
        bindBtn('mob-pitch-down', () => this.touchPitchDown = true, () => this.touchPitchDown = false);
        bindBtn('mob-roll-left', () => this.touchRollLeft = true, () => this.touchRollLeft = false);
        bindBtn('mob-roll-right', () => this.touchRollRight = true, () => this.touchRollRight = false);

        bindClick('mob-gear', () => this.pendingToggles.gear = true);
        bindClick('mob-flaps', () => this.pendingToggles.flaps = true);
        bindClick('mob-brakes', () => this.pendingToggles.brakes = true);
        bindClick('btn-toggle-ap', () => this.pendingToggles.ap = true);
    }

    public getInputs(): FlightInputState {
        // Pitch: S / ArrowDown pulls nose up (+1), W / ArrowUp pushes nose down (-1)
        let pitch = 0;
        if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchPitchUp) pitch += 1.0;
        if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchPitchDown) pitch -= 1.0;

        // Roll: A / ArrowLeft banks left (-1), D / ArrowRight banks right (+1)
        let roll = 0;
        if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touchRollLeft) roll -= 1.0;
        if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.touchRollRight) roll += 1.0;

        // Saba / Rudder: Q left (-1), E right (+1)
        let yaw = 0;
        if (this.keys['KeyQ'] || this.touchYawLeft) yaw -= 1.0;
        if (this.keys['KeyE'] || this.touchYawRight) yaw += 1.0;

        // Throttle delta: R throttles up (+1), F throttles down (-1)
        let throttleDelta = 0;
        if (this.keys['KeyR'] || this.touchThrottleUp) throttleDelta += 1.0;
        if (this.keys['KeyF'] || this.touchThrottleDown) throttleDelta -= 1.0;

        const inputs: FlightInputState = {
            pitch,
            roll,
            yaw,
            throttleDelta,
            toggleGear: this.pendingToggles.gear,
            toggleFlaps: this.pendingToggles.flaps,
            toggleBrakes: this.pendingToggles.brakes,
            toggleAP: this.pendingToggles.ap,
            toggleCam: this.pendingToggles.cam,
            toggleAntiIce: this.pendingToggles.antiIce
        };

        // Reset single-frame toggles
        this.pendingToggles.gear = false;
        this.pendingToggles.flaps = false;
        this.pendingToggles.brakes = false;
        this.pendingToggles.ap = false;
        this.pendingToggles.cam = false;
        this.pendingToggles.antiIce = false;

        return inputs;
    }
}
