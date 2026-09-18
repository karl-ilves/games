import { GameState } from '../state/gameState';

export class CrownChatUI {
    private gameState: GameState;
    private container: HTMLElement | null;
    private messagesContainer: HTMLElement | null;
    private form: HTMLFormElement | null;
    private input: HTMLInputElement | null;
    private onlineBadge: HTMLElement | null;

    constructor(gameState: GameState) {
        this.gameState = gameState;
        this.container = document.getElementById('crown-chat-container');
        this.messagesContainer = document.getElementById('crown-chat-messages');
        this.form = document.getElementById('crown-chat-form') as HTMLFormElement;
        this.input = document.getElementById('crown-chat-input') as HTMLInputElement;
        this.onlineBadge = document.getElementById('crown-chat-online-badge');

        this.init();
    }

    private init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendMessage();
            });
        }

        const sendBtn = document.getElementById('crown-chat-send');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSendMessage();
            });
        }

        if (this.input) {
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSendMessage();
                } else if (e.key === 'Escape') {
                    this.input?.blur();
                }
            });
        }

        // Auto-blur input when clicking 3D game canvas so controls immediately resume
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.addEventListener('pointerdown', () => {
                if (this.input && document.activeElement === this.input) {
                    this.input.blur();
                }
            });
        }
        window.addEventListener('pointerdown', (e) => {
            if (this.container && !this.container.contains(e.target as Node)) {
                if (this.input && document.activeElement === this.input) {
                    this.input.blur();
                }
            }
        });

        // Auto-subscribe to live chat updates
        this.gameState.onChatUpdated(() => {
            this.renderMessages();
        });

        // Auto-subscribe to online player count updates
        this.gameState.onOnlineCountUpdated((count) => {
            this.updateOnlineBadge(count);
        });

        this.updateOnlineBadge(this.gameState.getOnlineCount());
        this.renderMessages();
    }

    private updateOnlineBadge(count: number) {
        if (!this.onlineBadge) {
            this.onlineBadge = document.getElementById('crown-chat-online-badge');
        }
        if (this.onlineBadge) {
            this.onlineBadge.textContent = `🟢 ${count} ONLINE`;
        }
    }

    private handleSendMessage() {
        if (!this.input) return;
        const text = this.input.value.trim();
        if (!text) {
            this.input.blur();
            return;
        }

        // Strict Anti-AI protection: Only humans can write
        const ok = this.gameState.addChatMessage(text);
        if (ok) {
            this.input.value = '';
            this.input.blur();
            this.renderMessages();
        } else {
            alert('Could not send message. AI bots are strictly prohibited in this chat!');
            this.input.blur();
        }
    }

    public renderMessages() {
        if (!this.messagesContainer) return;
        const messages = this.gameState.getChatMessages();

        this.messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'chat-empty-state';
            empty.style.cssText = 'text-align: center; color: #8899a6; padding: 25px 10px; font-size: 0.78rem;';
            empty.innerHTML = '💬 Global chat is online.<br><span style="color: #ffd700; font-size: 0.72rem;">Say hello to other players!</span>';
            this.messagesContainer.appendChild(empty);
            return;
        }

        messages.forEach((msg) => {
            const row = document.createElement('div');
            row.className = 'chat-msg';

            const header = document.createElement('div');
            header.className = 'chat-msg-header';

            const authorSpan = document.createElement('span');
            authorSpan.className = 'chat-msg-author';
            if (msg.isOwner) {
                authorSpan.style.color = '#ffd700';
                authorSpan.innerHTML = `👑 ${escapeHtml(msg.author)}`;
            } else {
                authorSpan.style.color = '#00f2fe';
                authorSpan.textContent = msg.author;
            }

            const timeSpan = document.createElement('span');
            const d = new Date(msg.timestamp);
            timeSpan.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

            header.appendChild(authorSpan);
            header.appendChild(timeSpan);

            const body = document.createElement('div');
            body.className = 'chat-msg-text';
            body.textContent = msg.text;

            row.appendChild(header);
            row.appendChild(body);
            this.messagesContainer!.appendChild(row);
        });

        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
