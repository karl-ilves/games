import { isMobileOrTabletDevice } from '../../../shared/mobileControls';

export interface InputContext {
    onFireRocket: () => void;
    onToggleShop: (show: boolean) => void;
    onPlayAgain: () => void;
    onToggleSound: () => void;
    onCenterLock: () => void;
    onMouseMove: (clientX: number, clientY: number) => void;
    isSoundEnabled: () => boolean;
}

export class InputManager {
    private ctx: InputContext;

    public keys: { [key: string]: boolean } = {};
    public mobileMoveVector = { x: 0, y: 0 };
    public isMobileDevice = false;

    constructor(ctx: InputContext) {
        this.ctx = ctx;
        this.isMobileDevice = isMobileOrTabletDevice();
    }

    public init() {
        this.setupKeyboardControls();
        this.setupMouseAiming();
        this.setupButtons();
        if (this.isMobileDevice) {
            this.setupMobileControls();
        }
    }

    public setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter') {
                e.preventDefault();
                this.ctx.onFireRocket();
            }

            if (e.code === 'KeyE') {
                this.ctx.onToggleShop(true);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    public setupMouseAiming() {
        const viewport = document.getElementById('game-viewport-wrapper') || document.body;

        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.isMobileDevice) return;
            this.ctx.onMouseMove(e.clientX, e.clientY);
        });

        viewport.addEventListener('mousedown', (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.top-hud, .desktop-fire-btn, .game-modal-backdrop')) return;
            if (e.button === 0) {
                this.ctx.onFireRocket();
            }
        });
    }

    public setupButtons() {
        const fireBtn = document.getElementById('btn-fire');
        if (fireBtn) {
            fireBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.ctx.onFireRocket();
            });
        }

        const openShopBtn = document.getElementById('btn-open-shop');
        if (openShopBtn) openShopBtn.addEventListener('click', () => this.ctx.onToggleShop(true));

        const closeShopBtn = document.getElementById('btn-close-shop');
        if (closeShopBtn) closeShopBtn.addEventListener('click', () => this.ctx.onToggleShop(false));

        const winnerShopBtn = document.getElementById('btn-winner-shop');
        if (winnerShopBtn) {
            winnerShopBtn.addEventListener('click', () => {
                this.ctx.onToggleShop(true);
            });
        }

        const playAgainBtn = document.getElementById('btn-play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.ctx.onPlayAgain();
            });
        }

        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.ctx.onToggleSound();
                soundBtn.textContent = this.ctx.isSoundEnabled() ? '🔊' : '🔇';
            });
        }

        const pcBar = document.getElementById('pc-controls-bar');
        if (this.isMobileDevice && pcBar) {
            pcBar.style.display = 'none';
        }
    }

    public setupMobileControls() {
        const existingLayer = document.getElementById('playard-universal-mobile-controls');
        if (existingLayer) existingLayer.remove();

        const layer = document.createElement('div');
        layer.id = 'playard-universal-mobile-controls';
        layer.style.position = 'fixed';
        layer.style.top = '0';
        layer.style.left = '0';
        layer.style.width = '100vw';
        layer.style.height = '100vh';
        layer.style.pointerEvents = 'none';
        layer.style.zIndex = '9999';
        layer.style.userSelect = 'none';
        layer.style.touchAction = 'none';

        // 1. Draggable Virtual Joystick Zone (Bottom Left)
        const zone = document.createElement('div');
        zone.id = 'playard-mobile-joystick-zone';
        zone.style.position = 'absolute';
        zone.style.bottom = '35px';
        zone.style.left = '35px';
        zone.style.width = '130px';
        zone.style.height = '130px';
        zone.style.borderRadius = '50%';
        zone.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)';
        zone.style.border = '2.5px solid rgba(255, 255, 255, 0.35)';
        zone.style.backdropFilter = 'blur(8px)';
        zone.style.pointerEvents = 'auto';
        zone.style.display = 'flex';
        zone.style.alignItems = 'center';
        zone.style.justifyContent = 'center';

        const knob = document.createElement('div');
        knob.id = 'playard-mobile-joystick-knob';
        knob.style.width = '56px';
        knob.style.height = '56px';
        knob.style.borderRadius = '50%';
        knob.style.background = 'linear-gradient(135deg, #00f2fe 0%, #0072ff 100%)';
        knob.style.border = '2px solid #ffffff';
        knob.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.8)';
        knob.style.pointerEvents = 'none';
        knob.innerHTML = '<span style="font-size: 18px; color: white; display: flex; align-items: center; justify-content: center; height: 100%;">🎯</span>';

        zone.appendChild(knob);
        layer.appendChild(zone);

        // 2. Right Action Zone (FIRE Button + JUMP Button)
        const actionZone = document.createElement('div');
        actionZone.style.position = 'absolute';
        actionZone.style.bottom = '35px';
        actionZone.style.right = '35px';
        actionZone.style.display = 'flex';
        actionZone.style.flexDirection = 'column-reverse';
        actionZone.style.gap = '16px';
        actionZone.style.alignItems = 'center';
        actionZone.style.pointerEvents = 'auto';

        // JUMP button
        const jumpBtn = document.createElement('button');
        jumpBtn.type = 'button';
        jumpBtn.id = 'playard-mobile-jump-btn';
        jumpBtn.style.width = '78px';
        jumpBtn.style.height = '78px';
        jumpBtn.style.borderRadius = '50%';
        jumpBtn.style.background = 'linear-gradient(135deg, #00f2fe 0%, #0072ff 100%)';
        jumpBtn.style.border = '2.5px solid #ffffff';
        jumpBtn.style.color = '#ffffff';
        jumpBtn.style.display = 'flex';
        jumpBtn.style.flexDirection = 'column';
        jumpBtn.style.alignItems = 'center';
        jumpBtn.style.justifyContent = 'center';
        jumpBtn.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.7)';
        jumpBtn.style.cursor = 'pointer';
        jumpBtn.style.pointerEvents = 'auto';
        jumpBtn.innerHTML = '<span style="font-size: 24px;">🦘</span><span style="font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">JUMP</span>';

        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.ctx.onCenterLock();
        }, { passive: false });

        // Mobile FIRE button
        const mobileFireBtn = document.createElement('button');
        mobileFireBtn.type = 'button';
        mobileFireBtn.id = 'playard-mobile-fire-btn';
        mobileFireBtn.style.width = '88px';
        mobileFireBtn.style.height = '88px';
        mobileFireBtn.style.borderRadius = '50%';
        mobileFireBtn.style.background = 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)';
        mobileFireBtn.style.border = '3px solid #ffffff';
        mobileFireBtn.style.color = '#ffffff';
        mobileFireBtn.style.display = 'flex';
        mobileFireBtn.style.flexDirection = 'column';
        mobileFireBtn.style.alignItems = 'center';
        mobileFireBtn.style.justifyContent = 'center';
        mobileFireBtn.style.boxShadow = '0 0 25px rgba(255, 65, 108, 0.85)';
        mobileFireBtn.style.cursor = 'pointer';
        mobileFireBtn.style.pointerEvents = 'auto';
        mobileFireBtn.innerHTML = '<span style="font-size: 28px;">🚀</span><span style="font-size: 11px; font-weight: 900; letter-spacing: 1px;">FIRE</span>';

        mobileFireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.ctx.onFireRocket();
        }, { passive: false });

        actionZone.appendChild(jumpBtn);
        actionZone.appendChild(mobileFireBtn);
        layer.appendChild(actionZone);
        document.body.appendChild(layer);

        let touchId: number | null = null;
        let centerX = 0;
        let centerY = 0;

        const onTouchStart = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const rect = zone.getBoundingClientRect();
                centerX = rect.left + rect.width / 2;
                centerY = rect.top + rect.height / 2;
                touchId = t.identifier;
                updateJoystick(t.clientX, t.clientY);
                break;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchId) {
                    updateJoystick(t.clientX, t.clientY);
                    break;
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchId) {
                    touchId = null;
                    this.mobileMoveVector = { x: 0, y: 0 };
                    knob.style.transform = 'translate(0px, 0px)';
                    break;
                }
            }
        };

        const updateJoystick = (clientX: number, clientY: number) => {
            const dx = clientX - centerX;
            const dy = clientY - centerY;
            const dist = Math.hypot(dx, dy);
            const maxRadius = 45;
            const angle = Math.atan2(dy, dx);
            const clampedDist = Math.min(dist, maxRadius);

            const kx = Math.cos(angle) * clampedDist;
            const ky = Math.sin(angle) * clampedDist;
            knob.style.transform = `translate(${kx}px, ${ky}px)`;

            this.mobileMoveVector = {
                x: kx / maxRadius,
                y: ky / maxRadius
            };
        };

        zone.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: false });
        window.addEventListener('touchcancel', onTouchEnd, { passive: false });
    }
}
