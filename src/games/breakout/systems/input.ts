export class InputManager {
    public moveLeft: boolean = false;
    public moveRight: boolean = false;
    public pointerX: number | null = null;
    private canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.bindEvents();
    }

    private bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.moveLeft = true;
                this.pointerX = null;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.moveRight = true;
                this.pointerX = null;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.moveLeft = false;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.moveRight = false;
            }
        });

        // Mouse pointer move
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.pointerX = e.clientX - rect.left;
        });

        // Touch drag
        const handleTouch = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                this.pointerX = e.touches[0].clientX - rect.left;
            }
        };

        this.canvas.addEventListener('touchstart', handleTouch, { passive: true });
        this.canvas.addEventListener('touchmove', handleTouch, { passive: true });
    }

    public reset() {
        this.moveLeft = false;
        this.moveRight = false;
        this.pointerX = null;
    }
}
