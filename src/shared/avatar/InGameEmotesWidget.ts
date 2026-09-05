import { AvatarRig } from './AvatarRig';

export interface GameEmoteDef {
    id: string;
    action: string;
    name: string;
    icon: string;
    keyLabel?: string;
}

export const IN_GAME_EMOTES_LIST: GameEmoteDef[] = [
    { id: 'emote_wave', action: 'wave', name: 'Laine (Wave)', icon: '👋', keyLabel: '1' },
    { id: 'emote_dance_spin', action: 'dance', name: 'Tants (Dance)', icon: '🕺', keyLabel: '2' },
    { id: 'emote_salute_military', action: 'salute', name: 'Saluut (Salute)', icon: '🪖', keyLabel: '3' },
    { id: 'emote_backflip', action: 'backflip', name: 'Salto (Backflip)', icon: '🤸', keyLabel: '4' },
    { id: 'emote_breakdance', action: 'breakdance', name: 'Breiktants', icon: '🌪️', keyLabel: '5' },
    { id: 'emote_laugh_triumph', action: 'laugh', name: 'Võidunaer', icon: '😂', keyLabel: '6' },
    { id: 'emote_flex_muscles', action: 'flex', name: 'Musklite Flex', icon: '💪', keyLabel: '7' },
    { id: 'emote_levitate_zen', action: 'levitate', name: 'Zen Hõljumine', icon: '🧘', keyLabel: '8' },
    { id: 'emote_zombie_groan', action: 'zombie', name: 'Zombi (Zombie)', icon: '🧟', keyLabel: '9' },
    { id: 'emote_guitar_solo', action: 'guitar', name: 'Kitarri Soolo', icon: '🎸', keyLabel: '0' },
];

export interface InGameEmotesWidgetOptions {
    getAvatarRig?: () => AvatarRig | null | undefined;
    onEmoteChange?: (emoteAction: string) => void;
    topOffset?: number;
    leftOffset?: number;
}

export class InGameEmotesWidget {
    private container: HTMLElement;
    private options: InGameEmotesWidgetOptions;
    private isOpen: boolean = false;
    private activeEmote: string = 'idle';
    private toggleBtn!: HTMLButtonElement;
    private menuEl!: HTMLElement;

    constructor(options: InGameEmotesWidgetOptions = {}) {
        this.options = options;
        this.container = document.createElement('div');
        this.container.className = 'playard-in-game-emotes-bar';
        this.container.id = 'playard-in-game-emotes-bar';

        const top = options.topOffset ?? 70;
        const left = options.leftOffset ?? 16;

        this.container.style.cssText = `
            position: absolute;
            top: ${top}px;
            left: ${left}px;
            z-index: 990;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
            pointer-events: auto;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            user-select: none;
        `;

        this.render();
        document.body.appendChild(this.container);
        this.setupEvents();
    }

    private render() {
        this.container.innerHTML = `
            <style>
                .playard-in-game-emotes-bar * { box-sizing: border-box; }
                .playard-btn-emote-toggle {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 14px;
                    border-radius: 24px;
                    background: rgba(18, 22, 33, 0.88);
                    backdrop-filter: blur(12px);
                    border: 1.5px solid rgba(255, 46, 99, 0.6);
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 46, 99, 0.3);
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .playard-btn-emote-toggle:hover {
                    background: rgba(255, 46, 99, 0.25);
                    border-color: #ff2e63;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(255, 46, 99, 0.45);
                }
                .playard-btn-emote-toggle.is-playing {
                    background: linear-gradient(135deg, rgba(255, 46, 99, 0.35), rgba(0, 242, 254, 0.35));
                    border-color: #00f2fe;
                    box-shadow: 0 0 16px rgba(0, 242, 254, 0.55);
                    animation: playardPulse 2s infinite;
                }
                @keyframes playardPulse {
                    0%, 100% { box-shadow: 0 0 12px rgba(0, 242, 254, 0.4); }
                    50% { box-shadow: 0 0 22px rgba(0, 242, 254, 0.8); }
                }
                .playard-emotes-menu {
                    display: none;
                    flex-direction: column;
                    gap: 5px;
                    background: rgba(14, 18, 27, 0.94);
                    backdrop-filter: blur(16px);
                    border: 1.5px solid rgba(255, 46, 99, 0.4);
                    border-radius: 14px;
                    padding: 8px;
                    min-width: 220px;
                    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 46, 99, 0.2);
                    animation: playardSlideDown 0.2s ease-out;
                    max-height: 380px;
                    overflow-y: auto;
                }
                @keyframes playardSlideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .playard-emotes-menu::-webkit-scrollbar { width: 5px; }
                .playard-emotes-menu::-webkit-scrollbar-thumb { background: rgba(255, 46, 99, 0.4); border-radius: 4px; }
                .playard-emote-item-btn {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 7px 12px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid transparent;
                    color: #e2e8f0;
                    font-size: 0.82rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    text-align: left;
                }
                .playard-emote-item-btn:hover {
                    background: rgba(255, 46, 99, 0.2);
                    border-color: rgba(255, 46, 99, 0.5);
                    color: #fff;
                    transform: translateX(3px);
                }
                .playard-emote-item-btn.active {
                    background: rgba(0, 242, 254, 0.2);
                    border-color: #00f2fe;
                    color: #00f2fe;
                }
                .playard-emote-key-badge {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                    padding: 1px 5px;
                    font-size: 0.68rem;
                    color: #94a3b8;
                    font-family: monospace;
                }
                .playard-stop-emote-btn {
                    margin-top: 4px;
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.4);
                    color: #fca5a5;
                }
                .playard-stop-emote-btn:hover {
                    background: rgba(239, 68, 68, 0.35);
                    border-color: #ef4444;
                    color: #fff;
                }
            </style>

            <button class="playard-btn-emote-toggle" id="btn-toggle-in-game-emotes" title="Ava emotede menüü (B)">
                <span class="emote-icon">🎭</span>
                <span class="emote-label">EMOTED (B)</span>
            </button>

            <div class="playard-emotes-menu" id="playard-in-game-emotes-menu">
                ${IN_GAME_EMOTES_LIST.map(em => `
                    <button class="playard-emote-item-btn" data-emote-action="${em.action}">
                        <span>${em.icon} ${em.name}</span>
                        ${em.keyLabel ? `<span class="playard-emote-key-badge">${em.keyLabel}</span>` : ''}
                    </button>
                `).join('')}
                <button class="playard-emote-item-btn playard-stop-emote-btn" data-emote-action="idle">
                    <span>🛑 Peata / Tavaline (Stop)</span>
                    <span class="playard-emote-key-badge">ESC</span>
                </button>
            </div>
        `;

        this.toggleBtn = this.container.querySelector('#btn-toggle-in-game-emotes') as HTMLButtonElement;
        this.menuEl = this.container.querySelector('#playard-in-game-emotes-menu') as HTMLElement;
    }

    private setupEvents() {
        // Toggle menu on button click
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // Click emote buttons
        this.menuEl.querySelectorAll('[data-emote-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-emote-action') || 'idle';
                this.triggerEmote(action);
            });
        });

        // Click outside closes menu
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.container.contains(e.target as Node)) {
                this.closeMenu();
            }
        });

        // Keyboard Shortcut 'B' to toggle menu, and 1-9 to trigger emotes
        window.addEventListener('keydown', (e) => {
            // Ignore if typing in input/textarea
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
                return;
            }

            if (e.key === 'b' || e.key === 'B') {
                this.toggleMenu();
                return;
            }

            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
                this.triggerEmote('idle');
                return;
            }

            // Movement keys (WASD / Arrows) cancel emote back to idle
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                if (this.activeEmote !== 'idle') {
                    this.stopEmoteQuietly();
                }
            }
        });
    }

    public toggleMenu() {
        this.isOpen ? this.closeMenu() : this.openMenu();
    }

    public openMenu() {
        this.isOpen = true;
        this.menuEl.style.display = 'flex';
        this.updateActiveItemUI();
    }

    public closeMenu() {
        this.isOpen = false;
        this.menuEl.style.display = 'none';
    }

    public triggerEmote(action: string) {
        if (action === 'idle' || action === this.activeEmote) {
            this.activeEmote = 'idle';
        } else {
            this.activeEmote = action;
        }

        const rig = this.options.getAvatarRig?.();
        if (rig) {
            rig.updateAnimation(performance.now() * 0.001, this.activeEmote);
        }

        if (this.options.onEmoteChange) {
            this.options.onEmoteChange(this.activeEmote);
        }

        this.updateActiveItemUI();
        this.closeMenu();
    }

    public stopEmoteQuietly() {
        this.activeEmote = 'idle';
        this.updateActiveItemUI();
        if (this.options.onEmoteChange) {
            this.options.onEmoteChange('idle');
        }
    }

    public getActiveEmote(): string {
        return this.activeEmote;
    }

    private updateActiveItemUI() {
        const isPlaying = this.activeEmote !== 'idle';
        this.toggleBtn.classList.toggle('is-playing', isPlaying);

        const foundEm = IN_GAME_EMOTES_LIST.find(e => e.action === this.activeEmote);
        if (isPlaying && foundEm) {
            this.toggleBtn.innerHTML = `
                <span class="emote-icon">${foundEm.icon}</span>
                <span class="emote-label">${foundEm.name} (B)</span>
            `;
        } else {
            this.toggleBtn.innerHTML = `
                <span class="emote-icon">🎭</span>
                <span class="emote-label">EMOTED (B)</span>
            `;
        }

        this.menuEl.querySelectorAll('.playard-emote-item-btn').forEach(btn => {
            const act = btn.getAttribute('data-emote-action');
            btn.classList.toggle('active', act === this.activeEmote);
        });
    }
}
