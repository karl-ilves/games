import { GameState } from '../state/gameState';

export class CrownChatUI {
    private gameState: GameState;
    private container: HTMLElement | null;
    private messagesContainer: HTMLElement | null;
    private form: HTMLFormElement | null;
    private input: HTMLInputElement | null;

    constructor(gameState: GameState) {
        this.gameState = gameState;
        this.container = document.getElementById('crown-chat-container');
        this.messagesContainer = document.getElementById('crown-chat-messages');
        this.form = document.getElementById('crown-chat-form') as HTMLFormElement;
        this.input = document.getElementById('crown-chat-input') as HTMLInputElement;

        this.init();
    }

    private init() {
        if (this.form && this.input) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendMessage();
            });
        }

        this.renderMessages();
    }

    private handleSendMessage() {
        if (!this.input) return;
        const text = this.input.value.trim();
        if (!text) return;

        // Strict Anti-AI protection: Only humans can write
        const ok = this.gameState.addChatMessage(text);
        if (ok) {
            this.input.value = '';
            this.renderMessages();
        } else {
            alert('Could not send message. AI bots are strictly prohibited in this chat!');
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
            empty.innerHTML = '💬 No messages yet.<br><span style="color: #ffd700; font-size: 0.72rem;">Say hello to other players!</span>';
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
