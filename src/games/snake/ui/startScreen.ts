export interface StartScreenCallbacks {
    onPlaySolo: () => void;
    onPlayWithFriends: () => void;
}

export class StartScreenUI {
    private overlay: HTMLElement | null;
    private btnPlaySolo: HTMLButtonElement | null;
    private btnPlayFriends: HTMLButtonElement | null;
    private callbacks: StartScreenCallbacks;
    public isVisible: boolean = true;

    constructor(callbacks: StartScreenCallbacks) {
        this.callbacks = callbacks;
        this.overlay = document.getElementById('start-screen-overlay');
        this.btnPlaySolo = document.getElementById('btn-play-solo') as HTMLButtonElement | null;
        this.btnPlayFriends = document.getElementById('btn-play-friends') as HTMLButtonElement | null;

        this.bindEvents();
    }

    private bindEvents(): void {
        this.btnPlaySolo?.addEventListener('click', () => {
            this.hide();
            this.callbacks.onPlaySolo();
        });

        this.btnPlayFriends?.addEventListener('click', () => {
            this.callbacks.onPlayWithFriends();
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
