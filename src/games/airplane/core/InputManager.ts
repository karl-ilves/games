export class InputManager {
    public keys: { [key: string]: boolean } = {};
    public mobileBtnMapping: { [key: string]: string } = {
        'mob-up': 'ArrowUp',
        'mob-down': 'ArrowDown',
        'mob-left': 'ArrowLeft',
        'mob-right': 'ArrowRight',
        'mob-throttle-up': 'ShiftLeft',
        'mob-throttle-down': 'ControlLeft'
    };

    constructor() {
        this.initEventListeners();
    }

    private initEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.key) this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.key) this.keys[e.key.toLowerCase()] = false;
        });

        const handleMobileBtn = (btnId: string, isDown: boolean) => {
            const code = this.mobileBtnMapping[btnId];
            if (code) {
                this.keys[code] = isDown;
            }
        };

        const buttons = Object.keys(this.mobileBtnMapping);
        buttons.forEach(btnId => {
            const el = document.getElementById(btnId);
            if (el) {
                el.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileBtn(btnId, true); }, {passive: false});
                el.addEventListener('touchend', (e) => { e.preventDefault(); handleMobileBtn(btnId, false); }, {passive: false});
                el.addEventListener('mousedown', (e) => { handleMobileBtn(btnId, true); });
                el.addEventListener('mouseup', (e) => { handleMobileBtn(btnId, false); });
                el.addEventListener('mouseleave', (e) => { handleMobileBtn(btnId, false); });
            }
        });
    }
}

export const inputManager = new InputManager();
export const keys = inputManager.keys;
