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

    constructor() {
        this.bindKeyboard();
        this.bindMobileUI();
    }

    private bindKeyboard(): void {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'KeyG' && !e.repeat) this.pendingToggles.gear = true;
            if (e.code === 'KeyF' && !e.repeat) this.pendingToggles.flaps = true;
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
        // Pitch: Down Arrow / S pulls nose up (+1), Up Arrow / W pushes nose down (-1) in aviation convention
        let pitch = 0;
        if (this.keys['ArrowDown'] || this.touchPitchUp) pitch += 1.0;
        if (this.keys['ArrowUp'] || this.touchPitchDown) pitch -= 1.0;

        // Roll: Left Arrow / A banks left (-1), Right Arrow / D banks right (+1)
        let roll = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchRollLeft) roll -= 1.0;
        if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchRollRight) roll += 1.0;

        // Yaw: Q left (-1), E right (+1)
        let yaw = 0;
        if (this.keys['KeyQ']) yaw -= 1.0;
        if (this.keys['KeyE']) yaw += 1.0;

        // Throttle delta: W throttles up (+1), S throttles down (-1)
        let throttleDelta = 0;
        if (this.keys['KeyW'] || this.touchThrottleUp) throttleDelta += 1.0;
        if (this.keys['KeyS'] || this.touchThrottleDown) throttleDelta -= 1.0;

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
