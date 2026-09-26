import { Direction } from '../types';

export class InputManager {
    private onDirectionChange: (dir: Direction) => void;
    private onPauseToggle: () => void;

    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private minSwipeDistance: number = 25;

    constructor(
        element: HTMLElement,
        onDirectionChange: (dir: Direction) => void,
        onPauseToggle: () => void
    ) {
        this.onDirectionChange = onDirectionChange;
        this.onPauseToggle = onPauseToggle;

        this.bindKeyboard();
        this.bindTouch(element);
        this.bindVirtualDpad();
    }

    private bindKeyboard() {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            // Prevent scrolling on arrow keys and space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.onDirectionChange('UP');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.onDirectionChange('DOWN');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.onDirectionChange('LEFT');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.onDirectionChange('RIGHT');
                    break;
                case ' ':
                case 'p':
                case 'P':
                    this.onPauseToggle();
                    break;
            }
        });
    }

    private bindTouch(element: HTMLElement) {
        element.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length > 0) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }
        }, { passive: false });

        element.addEventListener('touchmove', (e: TouchEvent) => {
            // Prevent pull-to-refresh or page bouncing during gameplay
            e.preventDefault();
        }, { passive: false });

        element.addEventListener('touchend', (e: TouchEvent) => {
            if (e.changedTouches.length === 0) return;

            const deltaX = e.changedTouches[0].clientX - this.touchStartX;
            const deltaY = e.changedTouches[0].clientY - this.touchStartY;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (Math.max(absX, absY) > this.minSwipeDistance) {
                if (absX > absY) {
                    this.onDirectionChange(deltaX > 0 ? 'RIGHT' : 'LEFT');
                } else {
                    this.onDirectionChange(deltaY > 0 ? 'DOWN' : 'UP');
                }
            }
        }, { passive: true });
    }

    private bindVirtualDpad() {
        const bindButton = (id: string, dir: Direction) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const handlePress = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                this.onDirectionChange(dir);
            };

            btn.addEventListener('pointerdown', handlePress);
            btn.addEventListener('click', handlePress);
        };

        bindButton('btn-dpad-up', 'UP');
        bindButton('btn-dpad-down', 'DOWN');
        bindButton('btn-dpad-left', 'LEFT');
        bindButton('btn-dpad-right', 'RIGHT');
    }
}
