import { isPhoneUser } from '../../../auth';

export interface MobileArrowsCallbacks {
    onThrottle: (val: number) => void;
    onBrake: (val: number) => void;
    onSteer: (val: number) => void;
    onHandbrake: (active: boolean) => void;
    onHorn: (active: boolean) => void;
    onReset: () => void;
    onCameraToggle: () => void;
}

export class CityCarMobileArrows {
    private container: HTMLElement | null = null;
    private callbacks: MobileArrowsCallbacks;
    private isVisibleState = false;
    private pressedState = {
        up: false,
        down: false,
        left: false,
        right: false,
        drift: false,
        horn: false
    };

    constructor(callbacks: MobileArrowsCallbacks) {
        this.callbacks = callbacks;
        this.init();
    }

    public isVisible(): boolean {
        return this.isVisibleState;
    }

    public show(): void {
        if (!this.container) {
            this.buildDOM();
        }
        if (this.container) {
            this.container.style.display = 'block';
            this.isVisibleState = true;
        }
    }

    public hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisibleState = false;
            this.releaseAll();
        }
    }

    public setVisible(showArrows: boolean): void {
        if (showArrows) this.show();
        else this.hide();
    }

    private init(): void {
        if (typeof document === 'undefined') return;

        // When the database or device detection detects a player on phone, show arrows!
        // User request: "kui andmepaas tuvastab telefonis mängja siis ilmub talle nooled"
        const shouldShow = isPhoneUser();
        if (shouldShow) {
            this.show();
        }
    }

    private buildDOM(): void {
        const existing = document.getElementById('citycar-mobile-arrows');
        if (existing) {
            this.container = existing;
            return;
        }

        this.injectStyles();

        const layer = document.createElement('div');
        layer.id = 'citycar-mobile-arrows';
        layer.className = 'citycar-arrows-layer';

        layer.innerHTML = `
            <!-- Top Utility Bar for Mobile (Reset, Camera, Horn) -->
            <div class="arrows-top-bar">
                <button class="arrow-util-btn" id="btn-arrow-reset" title="Reset Car">
                    <span class="util-icon">🔄</span>
                    <span class="util-text">RESET</span>
                </button>
                <button class="arrow-util-btn" id="btn-arrow-cam" title="Toggle Camera">
                    <span class="util-icon">📷</span>
                    <span class="util-text">CAM</span>
                </button>
                <button class="arrow-util-btn" id="btn-arrow-horn" title="Honk Horn">
                    <span class="util-icon">📢</span>
                    <span class="util-text">HORN</span>
                </button>
            </div>

            <!-- Bottom Left: Steering Arrows (Vasak & Parem nooled) -->
            <div class="arrows-group-left" id="arrows-steering-group">
                <button class="arrow-btn arrow-steer-left" id="btn-arrow-left" data-key="left" title="Steer Left">
                    <span class="arrow-glyph">◀</span>
                    <span class="arrow-label">LEFT</span>
                </button>
                <button class="arrow-btn arrow-steer-right" id="btn-arrow-right" data-key="right" title="Steer Right">
                    <span class="arrow-glyph">▶</span>
                    <span class="arrow-label">RIGHT</span>
                </button>
            </div>

            <!-- Bottom Right: Drive & Brake Arrows (Gaas / Üles & Pidur / Alla + Drift) -->
            <div class="arrows-group-right" id="arrows-drive-group">
                <div class="arrows-pedals-column">
                    <button class="arrow-btn arrow-gas-up" id="btn-arrow-up" data-key="up" title="Accelerate Forward">
                        <span class="arrow-glyph">▲</span>
                        <span class="arrow-label">GAS</span>
                    </button>
                    <button class="arrow-btn arrow-brake-down" id="btn-arrow-down" data-key="down" title="Brake / Reverse">
                        <span class="arrow-glyph">▼</span>
                        <span class="arrow-label">BRAKE</span>
                    </button>
                </div>
                <button class="arrow-btn arrow-drift-btn" id="btn-arrow-drift" data-key="drift" title="Handbrake / Drift">
                    <span class="arrow-glyph">💨</span>
                    <span class="arrow-label">DRIFT</span>
                </button>
            </div>
        `;

        document.body.appendChild(layer);
        this.container = layer;

        this.bindEvents();
    }

    private injectStyles(): void {
        const styleId = 'citycar-mobile-arrows-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .citycar-arrows-layer {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                pointer-events: none;
                z-index: 1000;
                user-select: none;
                -webkit-user-select: none;
                touch-action: none;
            }

            /* Top quick utility buttons */
            .arrows-top-bar {
                position: absolute;
                top: 70px;
                right: 20px;
                display: flex;
                gap: 10px;
                pointer-events: auto;
            }

            .arrow-util-btn {
                background: rgba(15, 23, 42, 0.75);
                border: 1.5px solid rgba(255, 255, 255, 0.25);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border-radius: 12px;
                color: #ffffff;
                padding: 6px 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                transition: transform 0.08s, background 0.15s;
            }
            .arrow-util-btn:active, .arrow-util-btn.is-pressed {
                transform: scale(0.92);
                background: rgba(0, 242, 254, 0.35);
                border-color: #00f2fe;
            }
            .util-icon { font-size: 18px; line-height: 1; }
            .util-text { font-size: 9px; font-weight: 800; letter-spacing: 0.5px; opacity: 0.9; }

            /* Bottom Left Steering Group (Horizontal Left & Right arrows) */
            .arrows-group-left {
                position: absolute;
                bottom: 25px;
                left: 20px;
                display: flex;
                gap: 14px;
                pointer-events: auto;
                align-items: center;
            }

            /* Bottom Right Drive Group (Gas & Brake arrows + Drift) */
            .arrows-group-right {
                position: absolute;
                bottom: 25px;
                right: 20px;
                display: flex;
                gap: 14px;
                pointer-events: auto;
                align-items: flex-end;
            }

            .arrows-pedals-column {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            /* Base Arrow Button Style */
            .arrow-btn {
                background: rgba(15, 23, 42, 0.78);
                border: 2px solid rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-radius: 18px;
                color: #ffffff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                touch-action: none;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                transition: transform 0.06s ease-out, box-shadow 0.1s, border-color 0.1s, background 0.1s;
            }

            .arrow-glyph {
                font-size: 26px;
                line-height: 1;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
            }

            .arrow-label {
                font-size: 10px;
                font-weight: 900;
                letter-spacing: 0.8px;
                margin-top: 3px;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
            }

            /* Steering Left & Right */
            .arrow-steer-left, .arrow-steer-right {
                width: 72px;
                height: 72px;
                border-color: rgba(0, 242, 254, 0.5);
                box-shadow: 0 4px 18px rgba(0, 242, 254, 0.25), 0 8px 24px rgba(0, 0, 0, 0.5);
            }
            .arrow-steer-left:active, .arrow-steer-left.is-pressed,
            .arrow-steer-right:active, .arrow-steer-right.is-pressed {
                transform: scale(0.92);
                background: linear-gradient(135deg, rgba(0, 242, 254, 0.4) 0%, rgba(79, 172, 254, 0.5) 100%);
                border-color: #00f2fe;
                box-shadow: 0 0 25px rgba(0, 242, 254, 0.8);
            }

            /* Up Arrow (Gas / Accelerate) */
            .arrow-gas-up {
                width: 76px;
                height: 68px;
                border-color: rgba(16, 185, 129, 0.6);
                box-shadow: 0 4px 18px rgba(16, 185, 129, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5);
                background: linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%);
            }
            .arrow-gas-up:active, .arrow-gas-up.is-pressed {
                transform: scale(0.92);
                background: linear-gradient(180deg, rgba(16, 185, 129, 0.6) 0%, rgba(5, 150, 105, 0.7) 100%);
                border-color: #10b981;
                box-shadow: 0 0 28px rgba(16, 185, 129, 0.9);
            }

            /* Down Arrow (Brake / Reverse) */
            .arrow-brake-down {
                width: 76px;
                height: 68px;
                border-color: rgba(239, 68, 68, 0.6);
                box-shadow: 0 4px 18px rgba(239, 68, 68, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5);
                background: linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%);
            }
            .arrow-brake-down:active, .arrow-brake-down.is-pressed {
                transform: scale(0.92);
                background: linear-gradient(180deg, rgba(239, 68, 68, 0.6) 0%, rgba(220, 38, 38, 0.7) 100%);
                border-color: #ef4444;
                box-shadow: 0 0 28px rgba(239, 68, 68, 0.9);
            }

            /* Drift / Handbrake button */
            .arrow-drift-btn {
                width: 72px;
                height: 148px;
                border-radius: 20px;
                border-color: rgba(245, 158, 11, 0.65);
                box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35), 0 8px 24px rgba(0, 0, 0, 0.5);
                background: linear-gradient(180deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.25) 100%);
            }
            .arrow-drift-btn:active, .arrow-drift-btn.is-pressed {
                transform: scale(0.92);
                background: linear-gradient(180deg, rgba(245, 158, 11, 0.65) 0%, rgba(217, 119, 6, 0.85) 100%);
                border-color: #f59e0b;
                box-shadow: 0 0 35px rgba(245, 158, 11, 0.95);
            }

            /* Responsive Scaling on Small Phones */
            @media (max-width: 600px) {
                .arrows-group-left { bottom: 15px; left: 12px; gap: 8px; }
                .arrows-group-right { bottom: 15px; right: 12px; gap: 8px; }
                .arrow-steer-left, .arrow-steer-right { width: 62px; height: 62px; }
                .arrow-gas-up, .arrow-brake-down { width: 66px; height: 58px; }
                .arrow-drift-btn { width: 60px; height: 128px; }
                .arrow-glyph { font-size: 22px; }
            }
        `;
        document.head.appendChild(style);
    }

    private bindEvents(): void {
        const btnUp = document.getElementById('btn-arrow-up');
        const btnDown = document.getElementById('btn-arrow-down');
        const btnLeft = document.getElementById('btn-arrow-left');
        const btnRight = document.getElementById('btn-arrow-right');
        const btnDrift = document.getElementById('btn-arrow-drift');
        const btnHorn = document.getElementById('btn-arrow-horn');
        const btnReset = document.getElementById('btn-arrow-reset');
        const btnCam = document.getElementById('btn-arrow-cam');

        // Multi-touch helper for press-and-hold buttons
        const attachHoldButton = (el: HTMLElement | null, onPress: () => void, onRelease: () => void) => {
            if (!el) return;

            const start = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                el.classList.add('is-pressed');
                onPress();
            };

            const end = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                el.classList.remove('is-pressed');
                onRelease();
            };

            el.addEventListener('pointerdown', start);
            el.addEventListener('pointerup', end);
            el.addEventListener('pointercancel', end);
            el.addEventListener('pointerleave', end);

            el.addEventListener('touchstart', start, { passive: false });
            el.addEventListener('touchend', end, { passive: false });
            el.addEventListener('touchcancel', end, { passive: false });
        };

        // Up Arrow (Throttle / Gas)
        attachHoldButton(
            btnUp,
            () => { this.pressedState.up = true; this.updateInputs(); },
            () => { this.pressedState.up = false; this.updateInputs(); }
        );

        // Down Arrow (Brake / Reverse)
        attachHoldButton(
            btnDown,
            () => { this.pressedState.down = true; this.updateInputs(); },
            () => { this.pressedState.down = false; this.updateInputs(); }
        );

        // Left Arrow (Steer Left)
        attachHoldButton(
            btnLeft,
            () => { this.pressedState.left = true; this.updateInputs(); },
            () => { this.pressedState.left = false; this.updateInputs(); }
        );

        // Right Arrow (Steer Right)
        attachHoldButton(
            btnRight,
            () => { this.pressedState.right = true; this.updateInputs(); },
            () => { this.pressedState.right = false; this.updateInputs(); }
        );

        // Drift / Handbrake
        attachHoldButton(
            btnDrift,
            () => {
                this.pressedState.drift = true;
                this.callbacks.onHandbrake(true);
            },
            () => {
                this.pressedState.drift = false;
                this.callbacks.onHandbrake(false);
            }
        );

        // Horn
        attachHoldButton(
            btnHorn,
            () => {
                this.pressedState.horn = true;
                this.callbacks.onHorn(true);
            },
            () => {
                this.pressedState.horn = false;
                this.callbacks.onHorn(false);
            }
        );

        // One-tap buttons (Reset & Camera)
        btnReset?.addEventListener('click', (e) => {
            e.preventDefault();
            this.callbacks.onReset();
        });
        btnReset?.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.callbacks.onReset();
        });

        btnCam?.addEventListener('click', (e) => {
            e.preventDefault();
            this.callbacks.onCameraToggle();
        });
        btnCam?.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.callbacks.onCameraToggle();
        });
    }

    private updateInputs(): void {
        // Throttle & Brake
        let throttle = 0;
        let brake = 0;
        if (this.pressedState.up) throttle = 1;
        if (this.pressedState.down) brake = 1;

        // Steer: -1 (left), 1 (right)
        let steer = 0;
        if (this.pressedState.left) steer -= 1;
        if (this.pressedState.right) steer += 1;

        this.callbacks.onThrottle(throttle);
        this.callbacks.onBrake(brake);
        this.callbacks.onSteer(steer);
    }

    private releaseAll(): void {
        this.pressedState.up = false;
        this.pressedState.down = false;
        this.pressedState.left = false;
        this.pressedState.right = false;
        this.pressedState.drift = false;
        this.pressedState.horn = false;
        this.updateInputs();
        this.callbacks.onHandbrake(false);
        this.callbacks.onHorn(false);
    }

    public destroy(): void {
        this.releaseAll();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
    }
}
