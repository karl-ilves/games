/**
 * Playard Server-Isolated In-Game Chat System
 *
 * Requirements:
 * - Only communicates with THIS SERVER (AINULT SELLE SERVERIGA).
 * - Banned words are filtered/censored (e.g. replaced with ****).
 * - Toggleable via chat button to the left of 'P' button or keyboard [C].
 * - Can be disabled completely if chatEnabled === false for the game.
 */

import { serverManager } from './serverManager';
import { getMyDisplayNameAndRole } from './inGameMenu';

export interface ServerChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    serverId: string;
    isOwner?: boolean;
    isVerified?: boolean;
}

export class ServerChatController {
    private serverId: string = 'default';
    private serverName: string = 'Server #1';
    private bannedWords: string[] = [];
    private isChatEnabled: boolean = true;
    private messages: ServerChatMessage[] = [];
    private broadcast: BroadcastChannel | null = null;
    private isOpen: boolean = false;
    private storageKey: string = '';

    constructor() {
        // Will initialize when mounted or detected
    }

    public init(options?: { chatEnabled?: boolean; bannedWords?: string; serverId?: string; serverName?: string }) {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        // 1. Detect Chat Enabled & Banned Words from game configuration
        this.detectChatConfig(options);

        if (!this.isChatEnabled) {
            // Chat is explicitly OFF: do not inject UI
            const existingBtn = document.getElementById('btn-playard-chat');
            if (existingBtn) existingBtn.remove();
            const existingModal = document.getElementById('modal-playard-chat');
            if (existingModal) existingModal.remove();
            return;
        }

        // 2. Resolve Active Server ID
        this.resolveActiveServer(options?.serverId, options?.serverName);

        // 3. Storage key scoped STRICTLY to this server
        this.storageKey = `playard_server_chat_${this.serverId}`;

        // 4. Setup BroadcastChannel for real-time tab-to-tab sync within this server
        this.setupBroadcastChannel();

        // 5. Load existing messages for this server
        this.loadMessages();

        // 6. Inject Chat UI (button to the left of P, and chat modal)
        this.injectUI();

        // 7. Setup Event Listeners
        this.setupListeners();
    }

    private detectChatConfig(options?: { chatEnabled?: boolean; bannedWords?: string }) {
        // Default to true
        let enabled = true;
        let wordsStr = '';

        if (typeof options?.chatEnabled === 'boolean') {
            enabled = options.chatEnabled;
        }

        if (options?.bannedWords) {
            wordsStr = options.bannedWords;
        }

        // Check if running in /games/play/?id=...
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const gameId = urlParams.get('id');
            if (gameId) {
                const storedGames = JSON.parse(localStorage.getItem('playard_user_created_games') || localStorage.getItem('playard_created_games') || '[]');
                const found = storedGames.find((g: any) => g.id === gameId);
                if (found) {
                    if (typeof found.chatEnabled === 'boolean') {
                        enabled = found.chatEnabled;
                    } else if (found.sceneData && typeof found.sceneData.chatEnabled === 'boolean') {
                        enabled = found.sceneData.chatEnabled;
                    }
                    if (found.chatBannedWords) {
                        wordsStr = found.chatBannedWords;
                    } else if (found.sceneData?.chatBannedWords) {
                        wordsStr = found.sceneData.chatBannedWords;
                    }
                }
            }

            // Also check session / local flag if set by tests or runner
            const sessionFlag = sessionStorage.getItem('playard_current_game_chat_disabled') || localStorage.getItem('playard_current_game_chat_disabled');
            if (sessionFlag === 'true' || sessionFlag === '1') {
                enabled = false;
            }
            const sessionBanned = sessionStorage.getItem('playard_current_game_chat_banned_words') || localStorage.getItem('playard_current_game_chat_banned_words');
            if (sessionBanned) {
                wordsStr = sessionBanned;
            }
        } catch (e) {}

        this.isChatEnabled = enabled;
        this.bannedWords = wordsStr
            ? wordsStr.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0)
            : [];
    }

    private resolveActiveServer(explicitId?: string, explicitName?: string) {
        if (explicitId) {
            this.serverId = explicitId;
            this.serverName = explicitName || explicitId;
            return;
        }

        // Get server display info from serverManager
        const path = window.location.pathname.toLowerCase();
        let targetGameId = 'other';
        if (path.includes('/mmp1/')) targetGameId = 'mmp1';
        else if (path.includes('/citycar/')) targetGameId = 'citycar';
        else if (path.includes('/racing/')) targetGameId = 'racing';
        else if (path.includes('/snake/')) targetGameId = 'snake';
        else if (path.includes('/train/')) targetGameId = 'train';
        else if (path.includes('/metro/')) targetGameId = 'metro';
        else if (path.includes('/flight/')) targetGameId = 'flight';
        else if (path.includes('/play/')) targetGameId = 'play';
        else if (path.includes('/creator/')) targetGameId = 'creator';

        const servers = serverManager.getServersByGame(targetGameId);
        if (servers && servers.length > 0) {
            this.serverId = servers[0].id || servers[0].serverId;
            this.serverName = `Server #${servers[0].serverNumber || 1}`;
        } else {
            this.serverId = `srv_${targetGameId}_default`;
            this.serverName = `Server #1`;
        }
    }

    private setupBroadcastChannel() {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this.broadcast = new BroadcastChannel(`playard_chat_${this.serverId}`);
                this.broadcast.onmessage = (event) => {
                    if (event.data?.type === 'chat_message' && event.data.message) {
                        this.handleIncomingMessage(event.data.message);
                    }
                };
            }
        } catch (e) {}
    }

    private loadMessages() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                this.messages = JSON.parse(raw);
            } else {
                // Initial system greeting for this server
                this.messages = [{
                    id: 'msg_sys_welcome',
                    sender: 'Playard Server',
                    text: `Tere tulemast serverisse (${this.serverName})! Chat suhtleb AINULT selle serveriga.`,
                    timestamp: Date.now(),
                    serverId: this.serverId,
                    isVerified: true
                }];
                this.saveMessages();
            }
        } catch (e) {
            this.messages = [];
        }
    }

    private saveMessages() {
        try {
            if (this.messages.length > 100) {
                this.messages = this.messages.slice(this.messages.length - 100);
            }
            localStorage.setItem(this.storageKey, JSON.stringify(this.messages));
        } catch (e) {}
    }

    public filterBannedWords(text: string): string {
        if (!text || this.bannedWords.length === 0) return text;
        let filtered = text;
        for (const word of this.bannedWords) {
            if (!word) continue;
            // Escape special regex chars
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const reg = new RegExp(`\\b${escaped}\\b|${escaped}`, 'gi');
            filtered = filtered.replace(reg, (match) => '*'.repeat(match.length));
        }
        return filtered;
    }

    public sendMessage(rawText: string): ServerChatMessage | null {
        const trimmed = rawText.trim();
        if (!trimmed) return null;

        const censoredText = this.filterBannedWords(trimmed);
        const { myNameDisplay, isOwner, isVerified } = getMyDisplayNameAndRole();

        const cleanSender = myNameDisplay.replace(/\(Sina\)/i, '').replace(/\(You\)/i, '').trim();

        const msg: ServerChatMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            sender: cleanSender || 'Mängija',
            text: censoredText,
            timestamp: Date.now(),
            serverId: this.serverId,
            isOwner,
            isVerified
        };

        this.messages.push(msg);
        this.saveMessages();

        // Broadcast to tabs connected to this server
        try {
            this.broadcast?.postMessage({ type: 'chat_message', message: msg });
        } catch (e) {}

        // Fire storage sync event
        try {
            window.dispatchEvent(new CustomEvent('playard_server_chat_new_message', { detail: msg }));
        } catch (e) {}

        this.renderMessages();
        this.scrollToBottom();
        return msg;
    }

    private handleIncomingMessage(msg: ServerChatMessage) {
        if (msg.serverId !== this.serverId) return; // Strict server isolation
        if (this.messages.some(m => m.id === msg.id)) return;

        this.messages.push(msg);
        this.renderMessages();
        this.scrollToBottom();

        // Visual unread indicator on chat button if closed
        if (!this.isOpen) {
            const unreadDot = document.getElementById('playard-chat-unread-dot');
            if (unreadDot) unreadDot.style.display = 'block';
        }
    }

    private injectUI() {
        if (document.getElementById('btn-playard-chat')) return;

        // 1. Inject Chat Button (Positioned to the left of the P button: right: 60px)
        const btn = document.createElement('button');
        btn.id = 'btn-playard-chat';
        btn.type = 'button';
        btn.title = 'Server Chat [C]';
        btn.onclick = (e) => {
            if (e) e.stopPropagation();
            this.toggleChat();
        };
        btn.innerHTML = `
            <span style="font-size: 1.25rem; line-height: 1; pointer-events: none;">💬</span>
            <span id="playard-chat-unread-dot" style="display: none; position: absolute; top: -2px; right: -2px; width: 11px; height: 11px; background: #ff4757; border: 2px solid #0f172a; border-radius: 50%; box-shadow: 0 0 8px #ff4757;"></span>
        `;
        document.body.appendChild(btn);

        // 2. Inject Chat Modal / Floating Box
        const modal = document.createElement('div');
        modal.id = 'modal-playard-chat';
        modal.innerHTML = `
            <div class="playard-chat-card">
                <!-- Header -->
                <div class="playard-chat-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2rem;">💬</span>
                        <div>
                            <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff; letter-spacing: 0.3px;">Server Chat</div>
                            <div style="font-size: 0.72rem; color: #00f2fe; font-weight: 600;">🔒 Ainult see server: <strong id="playard-chat-server-title">${this.serverName}</strong></div>
                        </div>
                    </div>
                    <button type="button" id="btn-close-playard-chat" class="playard-chat-close-btn" title="Sulge Chat [C / Esc]">✕</button>
                </div>

                <!-- Messages Log -->
                <div id="playard-chat-messages-log" class="playard-chat-body">
                    <!-- Populated dynamically -->
                </div>

                <!-- Input area -->
                <div class="playard-chat-input-bar">
                    <input type="text" id="input-playard-chat" placeholder="Kirjuta sõnum serverisse... (Enter)" maxlength="180" autocomplete="off">
                    <button type="button" id="btn-send-playard-chat">
                        <span>Saada</span>
                        <span>🚀</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        this.renderMessages();
    }

    private renderMessages() {
        const log = document.getElementById('playard-chat-messages-log');
        if (!log) return;

        log.innerHTML = '';
        this.messages.forEach(msg => {
            const row = document.createElement('div');
            row.className = 'playard-chat-msg-row';
            
            const isSystem = msg.sender === 'Playard Server';
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (isSystem) {
                row.innerHTML = `
                    <div style="background: rgba(0, 242, 254, 0.1); border-left: 3px solid #00f2fe; padding: 6px 10px; border-radius: 6px; font-size: 0.78rem; color: #cbd5e1; line-height: 1.35;">
                        <span style="color: #00f2fe; font-weight: 800;">⚙️ ${msg.sender}:</span> ${msg.text}
                    </div>
                `;
            } else {
                let badge = '';
                if (msg.isOwner) {
                    badge = `<span style="background: linear-gradient(135deg, #ffd32a, #ff9f43); color: #111; font-weight: 900; font-size: 0.65rem; padding: 1px 5px; border-radius: 4px; margin-right: 4px;">👑 OWNER</span>`;
                } else if (msg.isVerified) {
                    badge = `<span style="color: #00f2fe; font-size: 0.75rem; margin-right: 2px;">✔</span>`;
                }

                row.innerHTML = `
                    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 8px; padding: 7px 10px; font-size: 0.82rem; word-break: break-word;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-weight: 800; color: #ffffff; display: flex; align-items: center;">${badge}${msg.sender}</span>
                            <span style="font-size: 0.68rem; color: #64748b;">${timeStr}</span>
                        </div>
                        <div style="color: #e2e8f0; line-height: 1.35;">${msg.text}</div>
                    </div>
                `;
            }

            log.appendChild(row);
        });
    }

    private scrollToBottom() {
        const log = document.getElementById('playard-chat-messages-log');
        if (log) {
            log.scrollTop = log.scrollHeight;
        }
    }

    public openChat() {
        const modal = document.getElementById('modal-playard-chat');
        if (!modal) return;
        this.isOpen = true;
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Hide unread dot
        const dot = document.getElementById('playard-chat-unread-dot');
        if (dot) dot.style.display = 'none';

        this.scrollToBottom();

        // Focus input
        setTimeout(() => {
            const inp = document.getElementById('input-playard-chat') as HTMLInputElement | null;
            if (inp) inp.focus();
        }, 50);
    }

    public closeChat() {
        const modal = document.getElementById('modal-playard-chat');
        if (!modal) return;
        this.isOpen = false;
        modal.classList.remove('active');
        modal.style.display = 'none';
        
        const inp = document.getElementById('input-playard-chat') as HTMLInputElement | null;
        if (inp) inp.blur();
    }

    public toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    private setupListeners() {
        const closeBtn = document.getElementById('btn-close-playard-chat');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.closeChat();
            };
        }

        const sendBtn = document.getElementById('btn-send-playard-chat');
        const inputEl = document.getElementById('input-playard-chat') as HTMLInputElement | null;

        const handleSend = () => {
            if (!inputEl) return;
            const text = inputEl.value;
            if (text.trim().length > 0) {
                this.sendMessage(text);
                inputEl.value = '';
            }
        };

        sendBtn?.addEventListener('click', handleSend);

        inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
            } else if (e.key === 'Escape') {
                this.closeChat();
            }
        });

        // Global hotkeys: [C] or Enter toggles chat if not in input
        window.addEventListener('keydown', (e) => {
            const target = e.target as HTMLElement | null;
            const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

            if ((e.key === 'c' || e.key === 'C') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                this.toggleChat();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.closeChat();
            }
        });

        // Cross-tab storage event sync
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && e.newValue) {
                try {
                    this.messages = JSON.parse(e.newValue);
                    this.renderMessages();
                    this.scrollToBottom();
                } catch (err) {}
            }
        });
    }

    public getMessages(): ServerChatMessage[] {
        return [...this.messages];
    }

    public getServerId(): string {
        return this.serverId;
    }

    public getBannedWords(): string[] {
        return [...this.bannedWords];
    }

    public getChatEnabled(): boolean {
        return this.isChatEnabled;
    }
}

export const serverChatController = new ServerChatController();

if (typeof window !== 'undefined') {
    (window as any).serverChatController = serverChatController;
}
