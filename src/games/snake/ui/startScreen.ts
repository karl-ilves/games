import { SNAKE_COLOR_PRESETS, SnakeColorPreset, getSnakeColorPreset } from '../catalog';

export interface StartScreenCallbacks {
    onPlaySolo: (colorId?: string) => void;
    onPlayWithFriends?: () => void;
}

export class StartScreenUI {
    private overlay: HTMLElement | null;
    private btnPlaySolo: HTMLButtonElement | null;
    private colorPickerGrid: HTMLElement | null;
    private callbacks: StartScreenCallbacks;
    public isVisible: boolean = true;
    public selectedColorId: string = 'green';

    constructor(callbacks: StartScreenCallbacks) {
        this.callbacks = callbacks;
        this.overlay = document.getElementById('start-screen-overlay');
        this.btnPlaySolo = document.getElementById('btn-play-solo') as HTMLButtonElement | null;
        this.colorPickerGrid = document.getElementById('snake-color-picker-grid');

        try {
            const saved = localStorage.getItem('playard_snake_color');
            if (saved && SNAKE_COLOR_PRESETS.some(p => p.id === saved)) {
                this.selectedColorId = saved;
            }
        } catch {}

        this.renderColorPicker();
        this.bindEvents();
    }

    public renderColorPicker(): void {
        if (!this.colorPickerGrid) return;
        this.colorPickerGrid.innerHTML = '';

        SNAKE_COLOR_PRESETS.forEach(preset => {
            const isSelected = preset.id === this.selectedColorId;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `snake-color-btn ${isSelected ? 'selected' : ''}`;
            btn.setAttribute('data-color-id', preset.id);
            btn.title = preset.name;
            btn.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                background: ${isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
                border: 2px solid ${isSelected ? preset.head : 'rgba(255, 255, 255, 0.1)'};
                border-radius: 10px;
                padding: 8px 4px;
                cursor: pointer;
                transition: all 0.15s ease;
                box-shadow: ${isSelected ? `0 0 14px ${preset.glow}` : 'none'};
            `;

            const iconSpan = document.createElement('span');
            iconSpan.style.fontSize = '1.3rem';
            iconSpan.textContent = preset.emoji;

            const nameSpan = document.createElement('span');
            nameSpan.style.cssText = `
                font-size: 0.72rem;
                font-weight: 700;
                color: ${isSelected ? '#ffffff' : '#a4b0be'};
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
            `;
            nameSpan.textContent = preset.name;

            btn.appendChild(iconSpan);
            btn.appendChild(nameSpan);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectColor(preset.id);
            });

            this.colorPickerGrid!.appendChild(btn);
        });
    }

    public selectColor(colorId: string): void {
        this.selectedColorId = colorId;
        try {
            localStorage.setItem('playard_snake_color', colorId);
        } catch {}
        this.renderColorPicker();
    }

    private bindEvents(): void {
        this.btnPlaySolo?.addEventListener('click', () => {
            this.hide();
            this.callbacks.onPlaySolo(this.selectedColorId);
        });
    }

    public show(): void {
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }
        this.isVisible = true;
    }

    public hide(): void {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        this.isVisible = false;
    }
}
