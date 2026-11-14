export interface CrashInputs {
    forward: number;
    steer: number;
    brake: boolean;
    handbrake: boolean;
    jumpThruster: boolean;
    boost: boolean;
    pitch: number;
    yaw: number;
    respawnRequested: boolean;
    slowMoToggled: boolean;
    cameraToggled: boolean;
}

export class CrashInputController {
    private keys: Record<string, boolean> = {};
    private respawnQueued = false;
    private slowMoQueued = false;
    private cameraQueued = false;

    constructor() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            this.keys[e.code.toLowerCase()] = true;

            if (key === 'r') this.respawnQueued = true;
            if (key === 't' || key === 'g') this.slowMoQueued = true;
            if (key === 'c') this.cameraQueued = true;
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            this.keys[e.code.toLowerCase()] = false;
        });
    }

    public getInputs(): CrashInputs {
        let forward = 0;
        let steer = 0;

        if (this.keys['w'] || this.keys['arrowup']) forward += 1;
        if (this.keys['s'] || this.keys['arrowdown']) forward -= 1;

        if (this.keys['a'] || this.keys['arrowleft']) steer += 1;
        if (this.keys['d'] || this.keys['arrowright']) steer -= 1;

        const brake = false; // Physics handles braking when rolling forward vs reversing when stopped
        const handbrake = !!this.keys['b'];
        const jumpThruster = !!this.keys[' '] || !!this.keys['space'];
        const boost = !!this.keys['shift'] || !!this.keys['shiftleft'] || !!this.keys['shiftright'];

        let pitch = 0;
        if (this.keys['w'] || this.keys['arrowup']) pitch -= 1; // W: nina vajub alla
        if (this.keys['s'] || this.keys['arrowdown']) pitch += 1; // S: nina ülesse

        let yaw = 0;
        if (this.keys['a'] || this.keys['arrowleft']) yaw += 1; // A: vasakule
        if (this.keys['d'] || this.keys['arrowright']) yaw -= 1; // D: paremale

        const respawn = this.respawnQueued;
        const slowMo = this.slowMoQueued;
        const camera = this.cameraQueued;

        this.respawnQueued = false;
        this.slowMoQueued = false;
        this.cameraQueued = false;

        return {
            forward,
            steer,
            brake,
            handbrake,
            jumpThruster,
            boost,
            pitch,
            yaw,
            respawnRequested: respawn,
            slowMoToggled: slowMo,
            cameraToggled: camera
        };
    }
}
