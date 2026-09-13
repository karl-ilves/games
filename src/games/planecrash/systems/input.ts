import { FlightControlInputs } from './flightPhysics';

export class InputController {
    public inputs: FlightControlInputs = {
        pitch: 0,
        roll: 0,
        yaw: 0,
        throttleDelta: 0
    };

    private keys: Record<string, boolean> = {};

    public onToggleCamera?: () => void;
    public onRestartRequested?: () => void;
    public onToggleGear?: () => void;

    constructor() {
        this.setupKeyboard();
        this.setupMobileControls();
    }

    private setupKeyboard(): void {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;

            if (key === 'c' && this.onToggleCamera) {
                this.onToggleCamera();
            }
            if (key === 'r' && this.onRestartRequested) {
                this.onRestartRequested();
            }
            if (key === 'g' && this.onToggleGear) {
                this.onToggleGear();
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
        });
    }

    private setupMobileControls(): void {
        const btnThUp = document.getElementById('m-btn-throttle-up');
        const btnThDown = document.getElementById('m-btn-throttle-down');
        const btnRollL = document.getElementById('m-btn-roll-left');
        const btnRollR = document.getElementById('m-btn-roll-right');
        const btnPitchUp = document.getElementById('m-btn-pitch-up');

        const bindHold = (el: HTMLElement | null, key: string) => {
            if (!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; });
            el.addEventListener('mousedown', () => { this.keys[key] = true; });
            el.addEventListener('mouseup', () => { this.keys[key] = false; });
        };

        bindHold(btnThUp, 'shift');
        bindHold(btnThDown, ' ');
        bindHold(btnRollL, 'a');
        bindHold(btnRollR, 'd');
        bindHold(btnPitchUp, 's');
    }

    public update(): void {
        // Pitch: W/ArrowUp (nose down = -1), S/ArrowDown (nose up = +1)
        let pitch = 0;
        if (this.keys['s'] || this.keys['arrowdown']) pitch += 1;
        if (this.keys['w'] || this.keys['arrowup']) pitch -= 1;

        // Roll: A/ArrowLeft (roll left = -1), D/ArrowRight (roll right = +1)
        let roll = 0;
        if (this.keys['d'] || this.keys['arrowright']) roll += 1;
        if (this.keys['a'] || this.keys['arrowleft']) roll -= 1;

        // Yaw: Q (left = -1), E (right = +1)
        let yaw = 0;
        if (this.keys['e']) yaw += 1;
        if (this.keys['q']) yaw -= 1;

        // Throttle: Shift (up = +1), Space / Ctrl (down = -1)
        let throttleDelta = 0;
        if (this.keys['shift']) throttleDelta += 1;
        if (this.keys[' '] || this.keys['control']) throttleDelta -= 1;

        this.inputs.pitch = pitch;
        this.inputs.roll = roll;
        this.inputs.yaw = yaw;
        this.inputs.throttleDelta = throttleDelta;
    }
}
