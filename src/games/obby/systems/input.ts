import { isMobileOrTabletDevice } from '../../../shared/mobileControls';

export interface InputContext {
    onJump: () => void;
    onRespawn: () => void;
    onToggleCamera: () => void;
    onStartTimer: () => void;
    onPointerDown: (x: number, y: number) => void;
    onPointerMove: (x: number, y: number) => void;
    onPointerUp: () => void;
    onWheel: (deltaY: number) => void;
}

export class InputManager {
    private ctx: InputContext;
    public keys: { [key: string]: boolean } = {};
    public joystickInput = { x: 0, y: 0 };

    constructor(ctx: InputContext) {
        this.ctx = ctx;
    }

    public init() {
        this.setupKeyboard();
        this.setupMouse();
        this.setupTouch();
    }

    private setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && !e.repeat) {
                this.ctx.onJump();
            }
            if (e.code === 'KeyR') this.ctx.onRespawn();
            if (e.code === 'KeyV') this.ctx.onToggleCamera();
            if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'Space') {
                this.ctx.onStartTimer();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    private setupMouse() {
        window.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement).tagName === 'CANVAS') {
                this.ctx.onPointerDown(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mousemove', (e) => {
            this.ctx.onPointerMove(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            this.ctx.onPointerUp();
        });

        window.addEventListener('wheel', (e) => {
            this.ctx.onWheel(e.deltaY);
        });
    }

    private setupTouch() {
        const joystickZone = document.getElementById('touch-joystick-zone');
        const joystickKnob = document.getElementById('touch-joystick-knob');
        if (joystickZone && joystickKnob) {
            let touchId: number | null = null;
            let center = { x: 0, y: 0 };

            joystickZone.addEventListener('touchstart', (e) => {
                const t = e.changedTouches[0];
                touchId = t.identifier;
                const rect = joystickZone.getBoundingClientRect();
                center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                this.ctx.onStartTimer();
            }, { passive: false });

            joystickZone.addEventListener('touchmove', (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    if (t.identifier === touchId) {
                        const dx = t.clientX - center.x;
                        const dy = t.clientY - center.y;
                        const dist = Math.min(45, Math.hypot(dx, dy));
                        const angle = Math.atan2(dy, dx);
                        const kx = Math.cos(angle) * dist;
                        const ky = Math.sin(angle) * dist;
                        joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
                        this.joystickInput.x = kx / 45;
                        this.joystickInput.y = ky / 45;
                    }
                }
            }, { passive: false });

            const resetJoystick = () => {
                touchId = null;
                joystickKnob.style.transform = `translate(0px, 0px)`;
                this.joystickInput = { x: 0, y: 0 };
            };
            joystickZone.addEventListener('touchend', resetJoystick);
            joystickZone.addEventListener('touchcancel', resetJoystick);
        }

        const touchJump = document.getElementById('btn-touch-jump');
        if (touchJump) {
            touchJump.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.ctx.onJump();
                this.ctx.onStartTimer();
            });
            touchJump.addEventListener('touchend', () => { this.keys['Space'] = false; });
        }

        const touchRespawn = document.getElementById('btn-touch-respawn');
        if (touchRespawn) {
            touchRespawn.addEventListener('click', () => this.ctx.onRespawn());
        }

        if (isMobileOrTabletDevice()) {
            const mobileLayer = document.getElementById('mobile-controls-layer');
            if (mobileLayer) mobileLayer.style.display = 'block';
        }
    }
}
