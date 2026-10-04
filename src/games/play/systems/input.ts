import * as THREE from 'three';
import { PlayState } from '../state/playState';
import { PlayardMobileControls, isMobileOrTabletDevice } from '../../../shared/mobileControls';

export function setupInputListeners(state: PlayState, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    window.addEventListener('keydown', e => {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }
        state.keys[e.code] = true;

        // Number Keys 1, 2, 3, 4, 5, 6, 7, 8, 9, 0: Toggle Roblox Hotbar Inventory Slots
        const numKeys: { [key: string]: number } = {
            'Digit1': 0, 'Numpad1': 0, '1': 0,
            'Digit2': 1, 'Numpad2': 1, '2': 1,
            'Digit3': 2, 'Numpad3': 2, '3': 2,
            'Digit4': 3, 'Numpad4': 3, '4': 3,
            'Digit5': 4, 'Numpad5': 4, '5': 4,
            'Digit6': 5, 'Numpad6': 5, '6': 5,
            'Digit7': 6, 'Numpad7': 6, '7': 6,
            'Digit8': 7, 'Numpad8': 7, '8': 7,
            'Digit9': 8, 'Numpad9': 8, '9': 8,
            'Digit0': 9, 'Numpad0': 9, '0': 9
        };
        const mappedSlot = numKeys[e.code] !== undefined ? numKeys[e.code] : numKeys[e.key];
        if (mappedSlot !== undefined) {
            e.preventDefault();
            state.togglePlayInventorySlot(mappedSlot);
        }
    });
    window.addEventListener('keyup', e => { state.keys[e.code] = false; });
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let isMouseDown = false;
    let mousePos = { x: 0, y: 0 };
    window.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        mousePos = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { isMouseDown = false; });
    window.addEventListener('mousemove', (e) => {
        if (isMouseDown) {
            const dx = e.clientX - mousePos.x;
            state.characterYaw -= dx * 0.006;
            mousePos = { x: e.clientX, y: e.clientY };
        }
    });

    let touchStartPos = { x: 0, y: 0 };
    let isTouching = false;
    window.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isTouching = true;
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: true });
    window.addEventListener('touchend', () => { isTouching = false; }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (isTouching && e.touches.length === 1) {
            const dx = e.touches[0].clientX - touchStartPos.x;
            state.characterYaw -= dx * 0.006;
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: true });

    const bindTouchBtn = (id: string, code: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            state.keys[code] = true;
        });
        const release = () => { state.keys[code] = false; };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('pointerleave', release);
    };
    bindTouchBtn('touch-btn-up', 'KeyW');
    bindTouchBtn('touch-btn-down', 'KeyS');
    bindTouchBtn('touch-btn-left', 'KeyA');
    bindTouchBtn('touch-btn-right', 'KeyD');
    bindTouchBtn('touch-btn-jump', 'Space');

    const oldControls = document.getElementById('play-screen-controls');
    if (isMobileOrTabletDevice()) {
        if (oldControls) oldControls.style.display = 'none';
        const mobileControls = new PlayardMobileControls({
            showJump: true,
            jumpLabel: 'Jump',
            onMove: (vector) => {
                state.keys['KeyW'] = vector.y < -0.15;
                state.keys['KeyS'] = vector.y > 0.15;
                state.keys['KeyA'] = vector.x < -0.15;
                state.keys['KeyD'] = vector.x > 0.15;
            },
            onJump: () => { state.keys['Space'] = true; },
            onJumpEnd: () => { state.keys['Space'] = false; }
        });
        mobileControls.init();
    } else {
        if (oldControls) oldControls.style.display = 'none';
    }
}
