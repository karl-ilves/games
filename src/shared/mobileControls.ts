// Shared Mobile & Tablet Touch Controls for Playard Games
// Detects phone / tablet vs PC and renders a large draggable joystick (bottom-left) and jump button (bottom-right)

export interface MobileControlOptions {
    showJump?: boolean;
    jumpLabel?: string;
    onMove?: (vector: { x: number; y: number }) => void; // x: -1 to 1 (left to right), y: -1 to 1 (forward to back, where -1 is up/forward and 1 is down/backward)
    onJump?: () => void;
    onJumpEnd?: () => void;
    extraButtons?: {
        id: string;
        label: string;
        icon?: string;
        color?: string;
        onPress?: () => void;
        onRelease?: () => void;
    }[];
}

export function isMobileOrTabletDevice(): boolean {
    if (typeof window === 'undefined') return false;

    // Check if test mode forces touch or if URL has ?mobile=true
    if ((window as any).__PLAYARD_FORCE_MOBILE__) return true;
    if (new URLSearchParams(window.location.search).get('mobile') === 'true') return true;

    // Standard detection:
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|Mobile/i.test(navigator.userAgent);
    
    // An actual phone or tablet device has touch/coarse pointer AND mobile UA, or small touch viewport.
    // Laptops with touch screens typically have (pointer: fine) primary mouse or width > 1024 without mobile UA.
    return !!(hasTouch && (isCoarsePointer || isMobileUA || window.innerWidth <= 1024));
}

export class PlayardMobileControls {
    private container: HTMLElement | null = null;
    private knob: HTMLElement | null = null;
    private zone: HTMLElement | null = null;
    private jumpBtn: HTMLElement | null = null;
    private activeTouchId: number | null = null;
    private center = { x: 0, y: 0 };
    private currentVector = { x: 0, y: 0 };
    private options: MobileControlOptions;
    private moveListener: ((v: { x: number; y: number }) => void) | null = null;

    constructor(options: MobileControlOptions = {}) {
        this.options = {
            showJump: true,
            jumpLabel: 'Jump',
            ...options
        };
        this.moveListener = this.options.onMove || null;
    }

    public getVector(): { x: number; y: number } {
        return { ...this.currentVector };
    }

    public init(): boolean {
        if (typeof document === 'undefined') return false;

        const isTouchDevice = isMobileOrTabletDevice();
        if (!isTouchDevice) {
            // Desktop / PC: Do not render mobile controls
            return false;
        }

        this.injectStyles();
        this.renderElements();
        this.setupTouchListeners();
        return true;
    }

    private injectStyles() {
        const styleId = 'playard-mobile-controls-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .playard-mobile-layer {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                pointer-events: none;
                z-index: 9999;
                user-select: none;
                -webkit-user-select: none;
                touch-action: none;
            }

            .playard-joystick-zone {
                position: absolute;
                bottom: 35px;
                left: 35px;
                width: 140px;
                height: 140px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.14) 0%, rgba(15, 23, 42, 0.5) 100%);
                border: 2.5px solid rgba(255, 255, 255, 0.35);
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                pointer-events: auto;
                touch-action: none;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .playard-joystick-zone::before {
                content: '';
                position: absolute;
                width: 70px;
                height: 70px;
                border-radius: 50%;
                border: 1.5px dashed rgba(255, 255, 255, 0.25);
                pointer-events: none;
            }

            .playard-joystick-knob {
                width: 62px;
                height: 62px;
                border-radius: 50%;
                background: linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #0072ff 100%);
                border: 2.5px solid #ffffff;
                box-shadow: 0 0 20px rgba(0, 242, 254, 0.7), inset 0 2px 6px rgba(255, 255, 255, 0.6);
                pointer-events: none;
                transition: transform 0.03s ease-out;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 20px;
            }

            .playard-touch-action-zone {
                position: absolute;
                bottom: 35px;
                right: 35px;
                display: flex;
                flex-direction: column-reverse;
                gap: 16px;
                align-items: center;
                pointer-events: auto;
            }

            .playard-jump-btn {
                width: 86px;
                height: 86px;
                border-radius: 50%;
                background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
                border: 3px solid #ffffff;
                color: #ffffff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 25px rgba(255, 65, 108, 0.75), 0 8px 20px rgba(0, 0, 0, 0.5);
                cursor: pointer;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .playard-jump-btn:active, .playard-jump-btn.is-active {
                transform: scale(0.90);
                background: linear-gradient(135deg, #ff4b2b 0%, #ff416c 100%);
                box-shadow: 0 0 35px rgba(255, 65, 108, 1);
            }

            .playard-jump-icon {
                font-size: 30px;
                line-height: 1;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            }

            .playard-jump-label {
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 0.8px;
                text-transform: uppercase;
                margin-top: 2px;
                text-shadow: 0 1px 3px rgba(0,0,0,0.6);
            }

            .playard-extra-btn {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: rgba(30, 41, 59, 0.85);
                border: 2px solid rgba(255, 255, 255, 0.4);
                color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                pointer-events: auto;
                touch-action: none;
            }

            .playard-extra-btn:active {
                transform: scale(0.92);
            }

            @media (max-width: 600px) {
                .playard-joystick-zone {
                    bottom: 20px;
                    left: 20px;
                    width: 125px;
                    height: 125px;
                }
                .playard-joystick-knob {
                    width: 54px;
                    height: 54px;
                }
                .playard-touch-action-zone {
                    bottom: 20px;
                    right: 20px;
                }
                .playard-jump-btn {
                    width: 76px;
                    height: 76px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    private renderElements() {
        if (this.container) return;

        const layer = document.createElement('div');
        layer.className = 'playard-mobile-layer';
        layer.id = 'playard-universal-mobile-controls';

        // 1. Draggable Virtual Joystick on the bottom left
        const zone = document.createElement('div');
        zone.className = 'playard-joystick-zone';
        zone.id = 'playard-mobile-joystick-zone';

        const knob = document.createElement('div');
        knob.className = 'playard-joystick-knob';
        knob.id = 'playard-mobile-joystick-knob';
        knob.innerHTML = '<span>🕹️</span>';

        zone.appendChild(knob);
        layer.appendChild(zone);

        // 2. Action Zone on the bottom right (Jump & extra buttons)
        const actionZone = document.createElement('div');
        actionZone.className = 'playard-touch-action-zone';

        if (this.options.showJump) {
            const jumpBtn = document.createElement('button');
            jumpBtn.type = 'button';
            jumpBtn.className = 'playard-jump-btn';
            jumpBtn.id = 'playard-mobile-jump-btn';
            jumpBtn.innerHTML = `
                <span class="playard-jump-icon">🦘</span>
                <span class="playard-jump-label">${this.options.jumpLabel || 'Jump'}</span>
            `;
            actionZone.appendChild(jumpBtn);
            this.jumpBtn = jumpBtn;
        }

        if (this.options.extraButtons && this.options.extraButtons.length > 0) {
            this.options.extraButtons.forEach(btnConfig => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'playard-extra-btn';
                b.id = btnConfig.id;
                if (btnConfig.color) b.style.borderColor = btnConfig.color;
                b.innerHTML = `<span>${btnConfig.icon || '⚡'}</span><span style="font-size: 8px; font-weight: 800;">${btnConfig.label}</span>`;
                
                b.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (btnConfig.onPress) btnConfig.onPress();
                }, { passive: false });

                b.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (btnConfig.onRelease) btnConfig.onRelease();
                }, { passive: false });

                actionZone.appendChild(b);
            });
        }

        layer.appendChild(actionZone);
        document.body.appendChild(layer);

        this.container = layer;
        this.zone = zone;
        this.knob = knob;
    }

    private setupTouchListeners() {
        if (!this.zone || !this.knob) return;

        const maxDist = 48;

        const updateKnobAndVector = (touchX: number, touchY: number) => {
            const dx = touchX - this.center.x;
            const dy = touchY - this.center.y;
            const dist = Math.hypot(dx, dy);
            const clampedDist = Math.min(maxDist, dist);
            const angle = Math.atan2(dy, dx);

            const kx = Math.cos(angle) * clampedDist;
            const ky = Math.sin(angle) * clampedDist;

            this.knob!.style.transform = `translate(${kx}px, ${ky}px)`;

            // Vector: x (-1 to 1), y (-1 for up/forward, 1 for down/backward)
            this.currentVector.x = kx / maxDist;
            this.currentVector.y = ky / maxDist;

            if (this.moveListener) {
                this.moveListener(this.currentVector);
            }
        };

        const resetJoystick = () => {
            this.activeTouchId = null;
            if (this.knob) {
                this.knob.style.transform = 'translate(0px, 0px)';
            }
            this.currentVector.x = 0;
            this.currentVector.y = 0;
            if (this.moveListener) {
                this.moveListener(this.currentVector);
            }
        };

        // Pointer / Touch support
        const onStart = (clientX: number, clientY: number, touchIdentifier?: number) => {
            if (touchIdentifier !== undefined) this.activeTouchId = touchIdentifier;
            else this.activeTouchId = 999999;
            const rect = this.zone!.getBoundingClientRect();
            this.center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
            updateKnobAndVector(clientX, clientY);
        };

        this.zone.addEventListener('touchstart', (e: TouchEvent) => {
            e.preventDefault();
            if (e.changedTouches.length === 0) return;
            const t = e.changedTouches[0];
            onStart(t.clientX, t.clientY, t.identifier);
        }, { passive: false });

        window.addEventListener('touchmove', (e: TouchEvent) => {
            if (this.activeTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === this.activeTouchId) {
                    e.preventDefault();
                    updateKnobAndVector(t.clientX, t.clientY);
                    break;
                }
            }
        }, { passive: false });

        const endTouch = (e: TouchEvent) => {
            if (this.activeTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.activeTouchId) {
                    resetJoystick();
                    break;
                }
            }
        };

        window.addEventListener('touchend', endTouch);
        window.addEventListener('touchcancel', endTouch);

        // Also bind pointer / mouse for automated tests or simulator on desktop
        let isPointerDown = false;
        this.zone.addEventListener('mousedown', (e: MouseEvent) => {
            isPointerDown = true;
            onStart(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (isPointerDown) {
                updateKnobAndVector(e.clientX, e.clientY);
            }
        });
        window.addEventListener('mouseup', () => {
            if (isPointerDown) {
                isPointerDown = false;
                resetJoystick();
            }
        });

        // Jump button listeners
        if (this.jumpBtn) {
            this.jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.jumpBtn?.classList.add('is-active');
                if (this.options.onJump) this.options.onJump();
            }, { passive: false });

            const releaseJump = () => {
                this.jumpBtn?.classList.remove('is-active');
                if (this.options.onJumpEnd) this.options.onJumpEnd();
            };

            this.jumpBtn.addEventListener('touchend', releaseJump);
            this.jumpBtn.addEventListener('touchcancel', releaseJump);

            this.jumpBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.jumpBtn?.classList.add('is-active');
                if (this.options.onJump) this.options.onJump();
            });
            this.jumpBtn.addEventListener('mouseup', releaseJump);
            this.jumpBtn.addEventListener('mouseleave', releaseJump);
        }
    }

    public setVisible(visible: boolean) {
        if (this.container) {
            this.container.style.display = visible ? 'block' : 'none';
        }
    }

    public destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
    }
}
