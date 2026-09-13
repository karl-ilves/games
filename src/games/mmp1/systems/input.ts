import * as THREE from 'three';
import { isMobileOrTabletDevice } from '../../../shared/mobileControls';
import { MapId } from '../types';

export interface InputContext {
    container: HTMLElement;
    isPointerLocked: boolean;
    setPointerLocked: (locked: boolean) => void;
    keys: { [key: string]: boolean };
    setSprinting: (s: boolean) => void;
    joystickInput: { x: number; y: number };
    setCameraYaw: (yaw: number) => void;
    setCameraPitch: (pitch: number) => void;
    getCameraYaw: () => number;
    getCameraPitch: () => number;
    getCameraDistance: () => number;
    setCameraDistance: (d: number) => void;
    onAction: (coords?: { x: number; y: number }) => void;
    onToggleWeapon: () => void;
    onPickUpGun: () => void;
    onToggleAdminPanel: () => void;
    onStartMapVoting: () => void;
    onCastMapVote: (mapId: MapId) => void;
    onCloseRoleReveal: () => void;
    onReturnToLobby: () => void;
    isWeaponEquipped: () => boolean;
    alignPlayerRotation: () => void;
    isTouchDragging: boolean;
    setTouchDragging: (d: boolean) => void;
    toggleSound: () => void;
}

export class InputController {
    private ctx: InputContext;
    private isDraggingMouse = false;
    private lastMousePos = { x: 0, y: 0 };
    private touchStartPos = { x: 0, y: 0 };

    constructor(ctx: InputContext) {
        this.ctx = ctx;
    }

    public bindEvents() {
        window.addEventListener('keydown', e => {
            this.ctx.keys[e.code] = true;
            if (e.code === 'KeyE') {
                this.ctx.onPickUpGun();
            } else if (e.code === 'Digit1' || e.code === 'KeyQ') {
                this.ctx.onToggleWeapon();
            } else if (e.code === 'Space') {
                this.ctx.onAction();
            } else if (e.code === 'KeyP') {
                this.ctx.onToggleAdminPanel();
            } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.ctx.setSprinting(true);
            }
        });

        window.addEventListener('keyup', e => {
            this.ctx.keys[e.code] = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.ctx.setSprinting(false);
            }
        });

        const clearInput = () => {
            Object.keys(this.ctx.keys).forEach(k => { this.ctx.keys[k] = false; });
            this.ctx.setSprinting(false);
            this.isDraggingMouse = false;
            this.ctx.joystickInput.x = 0;
            this.ctx.joystickInput.y = 0;
        };

        window.addEventListener('blur', clearInput);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) clearInput();
        });

        let mouseDownPos = { x: 0, y: 0 };
        let hasMovedMouseSignificantly = false;

        this.ctx.container.addEventListener('mousedown', (e: MouseEvent) => {
            this.isDraggingMouse = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            mouseDownPos = { x: e.clientX, y: e.clientY };
            hasMovedMouseSignificantly = false;
        });

        window.addEventListener('mouseup', () => {
            this.isDraggingMouse = false;
        });

        this.ctx.container.addEventListener('click', (e: MouseEvent) => {
            if (hasMovedMouseSignificantly) return;
            let coords = { x: 0, y: 0 };
            if (!this.ctx.isPointerLocked) {
                const rect = this.ctx.container.getBoundingClientRect();
                coords = {
                    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                    y: -((e.clientY - rect.top) / rect.height) * 2 + 1
                };
                this.ctx.container.requestPointerLock?.();
            }
            this.ctx.onAction(coords);
        });

        document.addEventListener('pointerlockchange', () => {
            this.ctx.setPointerLocked(document.pointerLockElement === this.ctx.container);
        });

        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.ctx.isPointerLocked) {
                const sens = 0.0025;
                const newYaw = this.ctx.getCameraYaw() - e.movementX * sens;
                let newPitch = this.ctx.getCameraPitch() - e.movementY * sens;
                newPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, newPitch));
                this.ctx.setCameraYaw(newYaw);
                this.ctx.setCameraPitch(newPitch);
                if (this.ctx.isWeaponEquipped() || this.ctx.getCameraDistance() <= 1.2) {
                    this.ctx.alignPlayerRotation();
                }
            } else if (this.isDraggingMouse) {
                const dx = e.clientX - this.lastMousePos.x;
                const dy = e.clientY - this.lastMousePos.y;
                if (Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y) > 6) {
                    hasMovedMouseSignificantly = true;
                }
                this.lastMousePos = { x: e.clientX, y: e.clientY };
                const sens = 0.004;
                const newYaw = this.ctx.getCameraYaw() - dx * sens;
                let newPitch = this.ctx.getCameraPitch() - dy * sens;
                newPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, newPitch));
                this.ctx.setCameraYaw(newYaw);
                this.ctx.setCameraPitch(newPitch);
                if (this.ctx.isWeaponEquipped() || this.ctx.getCameraDistance() <= 1.2) {
                    this.ctx.alignPlayerRotation();
                }
            }
        });

        this.ctx.container.addEventListener('wheel', (e: WheelEvent) => {
            const crateModal = document.getElementById('crate-shop-modal');
            const unboxModal = document.getElementById('crate-unboxing-overlay');
            if (crateModal?.style.display === 'flex' || unboxModal?.style.display === 'flex') {
                return;
            }
            e.preventDefault();
            this.ctx.setCameraDistance(THREE.MathUtils.clamp(this.ctx.getCameraDistance() + e.deltaY * 0.006, 0.5, 14.0));
        }, { passive: false });

        let touchStartCoord = { x: 0, y: 0 };
        let touchMoved = false;

        this.ctx.container.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                this.ctx.setTouchDragging(true);
                this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                touchStartCoord = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                touchMoved = false;
            }
        }, { passive: true });

        this.ctx.container.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const dx = e.touches[0].clientX - this.touchStartPos.x;
                const dy = e.touches[0].clientY - this.touchStartPos.y;
                if (Math.hypot(e.touches[0].clientX - touchStartCoord.x, e.touches[0].clientY - touchStartCoord.y) > 8) {
                    touchMoved = true;
                }
                this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                const sens = 0.005;
                const newYaw = this.ctx.getCameraYaw() - dx * sens;
                let newPitch = this.ctx.getCameraPitch() - dy * sens;
                newPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, newPitch));
                this.ctx.setCameraYaw(newYaw);
                this.ctx.setCameraPitch(newPitch);
                if (this.ctx.isWeaponEquipped() || this.ctx.getCameraDistance() <= 1.2) {
                    this.ctx.alignPlayerRotation();
                }
            }
        }, { passive: true });

        this.ctx.container.addEventListener('touchend', () => {
            this.ctx.setTouchDragging(false);
            if (!touchMoved) {
                const rect = this.ctx.container.getBoundingClientRect();
                const coords = {
                    x: ((touchStartCoord.x - rect.left) / rect.width) * 2 - 1,
                    y: -((touchStartCoord.y - rect.top) / rect.height) * 2 + 1
                };
                this.ctx.onAction(coords);
            }
        });

        document.getElementById('btn-force-start')?.addEventListener('click', () => {
            this.ctx.onStartMapVoting();
        });

        document.querySelectorAll('.map-vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const mapVal = target.getAttribute('data-map') as MapId;
                if (mapVal) this.ctx.onCastMapVote(mapVal);
            });
        });

        document.getElementById('btn-role-reveal-close')?.addEventListener('click', () => {
            this.ctx.onCloseRoleReveal();
        });
        document.getElementById('btn-next-round')?.addEventListener('click', () => {
            this.ctx.onReturnToLobby();
        });
        document.getElementById('slot-weapon')?.addEventListener('click', () => {
            this.ctx.onToggleWeapon();
        });
        document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
            this.ctx.toggleSound();
        });

        const joystickZone = document.getElementById('touch-joystick-zone');
        const joystickKnob = document.getElementById('touch-joystick-knob');
        if (joystickZone && joystickKnob) {
            let touchId: number | null = null;
            let center = { x: 0, y: 0 };

            joystickZone.addEventListener('touchstart', (e: TouchEvent) => {
                const t = e.changedTouches[0];
                touchId = t.identifier;
                const rect = joystickZone.getBoundingClientRect();
                center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }, { passive: false });

            joystickZone.addEventListener('touchmove', (e: TouchEvent) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    if (t.identifier === touchId) {
                        const dx = t.clientX - center.x;
                        const dy = t.clientY - center.y;
                        const maxDist = 42;
                        const dist = Math.min(maxDist, Math.hypot(dx, dy));
                        const angle = Math.atan2(dy, dx);
                        const kx = Math.cos(angle) * dist;
                        const ky = Math.sin(angle) * dist;
                        joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
                        this.ctx.joystickInput.x = kx / maxDist;
                        this.ctx.joystickInput.y = ky / maxDist;
                    }
                }
            }, { passive: false });

            const resetJoystick = () => {
                touchId = null;
                joystickKnob.style.transform = 'translate(0px, 0px)';
                this.ctx.joystickInput.x = 0;
                this.ctx.joystickInput.y = 0;
            };
            joystickZone.addEventListener('touchend', resetJoystick);
            joystickZone.addEventListener('touchcancel', resetJoystick);
        }

        const btnMobileAction = document.getElementById('btn-mobile-action');
        if (btnMobileAction) {
            btnMobileAction.addEventListener('touchstart', e => {
                e.preventDefault();
                this.ctx.onAction();
            });
        }
        const btnMobileInteract = document.getElementById('btn-mobile-interact');
        if (btnMobileInteract) {
            btnMobileInteract.addEventListener('touchstart', e => {
                e.preventDefault();
                this.ctx.onPickUpGun();
            });
        }

        if (isMobileOrTabletDevice()) {
            const mobileLayer = document.getElementById('mobile-controls-layer');
            if (mobileLayer) mobileLayer.style.display = 'block';
        }
    }
}
