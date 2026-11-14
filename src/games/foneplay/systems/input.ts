import { PlayardMobileControls, isMobileOrTabletDevice } from '../../../shared/mobileControls';

export class FoneInputSystem {
    public keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false
    };

    private mobileControls: PlayardMobileControls | null = null;
    private keyState: Record<string, boolean> = {};

    constructor() {
        this.initMobileControls();
        this.initKeyboardListeners();
    }

    private initMobileControls() {
        // Exact same mapping as Creator Studio Play Test:
        // vector.y < -0.15 => KeyW (Forward)
        // vector.y > 0.15 => KeyS (Backward)
        // vector.x < -0.15 => KeyA (Turn Left)
        // vector.x > 0.15 => KeyD (Turn Right)
        this.mobileControls = new PlayardMobileControls({
            showJump: true,
            jumpLabel: 'Jump',
            onMove: (vector) => {
                this.keyState['KeyW'] = vector.y < -0.15;
                this.keyState['KeyS'] = vector.y > 0.15;
                this.keyState['KeyA'] = vector.x < -0.15;
                this.keyState['KeyD'] = vector.x > 0.15;
                this.syncKeys();
            },
            onJump: () => {
                this.keyState['Space'] = true;
                this.syncKeys();
            },
            onJumpEnd: () => {
                this.keyState['Space'] = false;
                this.syncKeys();
            }
        });

        this.mobileControls.init();
    }

    private initKeyboardListeners() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            this.keyState[e.code] = true;
            this.keyState[e.key.toLowerCase()] = true;
            this.syncKeys();
        });

        window.addEventListener('keyup', (e) => {
            this.keyState[e.code] = false;
            this.keyState[e.key.toLowerCase()] = false;
            this.syncKeys();
        });
    }

    private syncKeys() {
        this.keys.forward = !!(this.keyState['KeyW'] || this.keyState['ArrowUp'] || this.keyState['w']);
        this.keys.backward = !!(this.keyState['KeyS'] || this.keyState['ArrowDown'] || this.keyState['s']);
        this.keys.left = !!(this.keyState['KeyA'] || this.keyState['ArrowLeft'] || this.keyState['a']);
        this.keys.right = !!(this.keyState['KeyD'] || this.keyState['ArrowRight'] || this.keyState['d']);
        this.keys.jump = !!(this.keyState['Space'] || this.keyState[' ']);
    }

    public getKeys() {
        return { ...this.keys };
    }
}
