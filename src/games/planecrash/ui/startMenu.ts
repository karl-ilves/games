import { planeAudio } from '../audio';

export class StartMenu {
    private modalEl: HTMLElement | null;
    private btnPlay: HTMLElement | null;

    public onPlayClicked?: () => void;

    constructor() {
        this.modalEl = document.getElementById('start-menu-modal');
        this.btnPlay = document.getElementById('btn-start-play');
        this.init();
    }

    private init(): void {
        if (this.btnPlay) {
            this.btnPlay.addEventListener('click', () => {
                planeAudio.playButtonClick();
                this.hide();
                if (this.onPlayClicked) {
                    this.onPlayClicked();
                }
            });
        }
    }

    public show(): void {
        if (this.modalEl) {
            this.modalEl.classList.add('active');
        }
    }

    public hide(): void {
        if (this.modalEl) {
            this.modalEl.classList.remove('active');
        }
    }
}
