import { PlayardMobileControls, isPhoneDevice } from '../../../shared/mobileControls';

export class FoneInputSystem {
    public moveVector: { x: number; y: number } = { x: 0, y: 0 };
    public jumpRequested: boolean = false;
    private mobileControls: PlayardMobileControls | null = null;
    private keys: Record<string, boolean> = {};

    constructor() {
        this.initControls();
        this.initKeyboardFallback();
    }

    private initControls() {
        this.mobileControls = new PlayardMobileControls({
            showJump: true,
            jumpLabel: 'Hüppa',
            onMove: (v) => {
                this.moveVector.x = v.x;
                this.moveVector.y = v.y;
            },
            onJump: () => {
                this.jumpRequested = true;
            },
            onJumpEnd: () => {
                this.jumpRequested = false;
            }
        });

        // Initialize mobile controls (renders virtual joystick and jump button on touch/phone)
        this.mobileControls.init();
    }

    private initKeyboardFallback() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code] = true;
            if (e.code === 'Space' || e.key === ' ') {
                this.jumpRequested = true;
            }
            this.updateKeyboardVector();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code] = false;
            if (e.code === 'Space' || e.key === ' ') {
                this.jumpRequested = false;
            }
            this.updateKeyboardVector();
        });
    }

    private updateKeyboardVector() {
        // If mobile controls are actively being used, prefer touch vector
        if (Math.abs(this.moveVector.x) > 0.05 || Math.abs(this.moveVector.y) > 0.05) {
            return;
        }

        let x = 0;
        let y = 0;
        if (this.keys['keya'] || this.keys['arrowleft'] || this.keys['a']) x -= 1;
        if (this.keys['keyd'] || this.keys['arrowright'] || this.keys['d']) x += 1;
        if (this.keys['keyw'] || this.keys['arrowup'] || this.keys['w']) y -= 1; // forward
        if (this.keys['keys'] || this.keys['arrowdown'] || this.keys['s']) y += 1; // backward

        this.moveVector = { x, y };
    }

    public consumeJump(): boolean {
        if (this.jumpRequested) {
            this.jumpRequested = false;
            return true;
        }
        return false;
    }
}
