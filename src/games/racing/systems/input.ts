import { PlayardMobileControls, isMobileOrTabletDevice } from '../../../shared/mobileControls';

export class InputManager {
    public keys: { [key: string]: boolean } = {};
    public joystickMoveVector = { x: 0, y: 0 };
    private playardMobile: PlayardMobileControls | null = null;

    public init(): void {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.key) this.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.key) this.keys[e.key.toLowerCase()] = false;
        });

        if (isMobileOrTabletDevice()) {
            this.setupMobileControls();
        }
    }

    private setupMobileControls(): void {
        const oldMobile = document.getElementById('mobile-controls');
        if (oldMobile) oldMobile.style.display = 'none';

        if (!this.playardMobile) {
            this.playardMobile = new PlayardMobileControls({
                showJump: true,
                jumpLabel: 'Nitro / Jump',
                onMove: (v) => {
                    this.joystickMoveVector = v;
                },
                onJump: () => {
                    this.keys['ShiftLeft'] = true;
                },
                onJumpEnd: () => {
                    this.keys['ShiftLeft'] = false;
                }
            });
            this.playardMobile.init();
        }
    }
}
