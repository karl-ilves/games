import { ChatMessage, PlayerProgress } from '../types';
import { getCurrentUserProfile, isPlayardOwner, isTestMode, formatOwnerNametag } from '../../../auth';

const CHAT_STORAGE_KEY = 'playard_crown_chat_v1';

export interface INetworkHandler {
    broadcastChatMessage(msg: ChatMessage): void;
    broadcastProgress(stage: number, percentage: number, isFinished: boolean): void;
    trackPresence(): void;
}

export class GameState {
    private currentStage: number = 1;
    private maxStage: number = 50;
    private respawnPos: { x: number; y: number; z: number } = { x: 0, y: 1.5, z: 0 };
    private isFinished: boolean = false;
    private network: INetworkHandler | null = null;
    private isOwner: boolean = false;
    private playerName: string = 'Külaline';
    private stagesCount: number = 50;
    private cachedProgress: Map<string, PlayerProgress> = new Map();
    private localChatMessages: ChatMessage[] = [];

    private onlinePlayers: PlayerProgress[] = [];
    private onlineCount: number = 1;

    private chatListeners: (() => void)[] = [];
    private leaderboardListeners: (() => void)[] = [];
    private onlineCountListeners: ((count: number) => void)[] = [];

    constructor() {
        this.checkAuth();
        this.loadChat();
    }

    public setNetwork(network: INetworkHandler) {
        this.network = network;
    }

    private checkAuth() {
        const prof = getCurrentUserProfile();
        this.isOwner = isPlayardOwner(prof?.email) || isTestMode() || !!(prof?.username?.toLowerCase().includes('owner'));
        const rawName = prof?.displayName || prof?.username || (this.isOwner ? 'Playard Owner' : 'Player');
        this.playerName = this.isOwner ? formatOwnerNametag(rawName, true) : rawName;
    }

    public getIsOwner(): boolean {
        return this.isOwner;
    }

    public isUnlockedWithPasscode(): boolean {
        try {
            return sessionStorage.getItem('crown_passcode_unlocked') === 'true' || localStorage.getItem('crown_passcode_unlocked') === 'true';
        } catch (e) {
            return false;
        }
    }

    public checkPasscode(code: string): boolean {
        if (code.trim() === '133731') {
            try {
                sessionStorage.setItem('crown_passcode_unlocked', 'true');
            } catch (e) {}
            return true;
        }
        return false;
    }

    public getPlayerName(): string {
        return this.playerName;
    }

    public getStage(): number {
        return this.currentStage;
    }

    public getMaxStage(): number {
        return this.maxStage;
    }

    public getPercentage(): number {
        return Math.min(100, Math.round((this.currentStage / this.maxStage) * 100));
    }

    public getRespawnPos(): { x: number; y: number; z: number } {
        return { ...this.respawnPos };
    }

    public setRespawnPos(pos: { x: number; y: number; z: number }) {
        this.respawnPos = { ...pos };
    }

    public setStage(stageNum: number, newSpawn?: { x: number; y: number; z: number }): boolean {
        if (stageNum > this.currentStage && stageNum <= this.maxStage) {
            this.currentStage = stageNum;
            if (newSpawn) {
                this.respawnPos = { ...newSpawn };
            }
            if (stageNum === this.maxStage) {
                this.handleVictory();
            } else {
                this.network?.broadcastProgress(this.currentStage, this.getPercentage(), false);
            }
            return true;
        }
        return false;
    }

    public isGameWon(): boolean {
        return this.isWon;
    }

    // Victory Crown Proximity
    public handleVictory() {
        this.isWon = true;

        // Award 24K Royal Crown & Golden Monarch outfit to player inventory
        try {
            const avatar = (window as any).playardAvatar;
            if (avatar?.userInventory) {
                avatar.userInventory.add('hat_royal_crown');
                avatar.userInventory.add('hair_golden_super');
                avatar.userInventory.add('face_golden_snarl_grill');
                avatar.userInventory.add('top_golden_dragon_kimono');
                avatar.userInventory.add('pants_golden_monarch_trousers');
                avatar.userInventory.add('shoes_golden_emperor_boots');
                avatar.userInventory.add('back_golden_archangel_wings');
                avatar.userInventory.add('anim_style_monarch');
            }

            const yard = (window as any).yardService;
            if (yard?.data?.inventory && Array.isArray(yard.data.inventory)) {
                if (!yard.data.inventory.includes('hat_royal_crown')) {
                    yard.data.inventory.push('hat_royal_crown');
                }
            }
        } catch (e) {
            console.warn('Could not unlock items on victory:', e);
        }

        this.network?.broadcastProgress(this.currentStage, 100, true);
        this.notifyLeaderboardUpdated();
    }

    public onChatUpdated(cb: () => void) {
        this.chatListeners.push(cb);
    }

    public onLeaderboardUpdated(cb: () => void) {
        this.leaderboardListeners.push(cb);
    }

    public onOnlineCountUpdated(cb: (count: number) => void) {
        this.onlineCountListeners.push(cb);
    }

    public notifyChatUpdated() {
        this.chatListeners.forEach(cb => {
            try { cb(); } catch (e) {}
        });
    }

    public notifyLeaderboardUpdated() {
        this.leaderboardListeners.forEach(cb => {
            try { cb(); } catch (e) {}
        });
    }

    public notifyOnlineCountUpdated() {
        this.onlineCountListeners.forEach(cb => {
            try { cb(this.onlineCount); } catch (e) {}
        });
    }

    public getOnlineCount(): number {
        return this.onlineCount;
    }

    public setOnlineCount(count: number) {
        this.onlineCount = Math.max(1, count);
        this.notifyOnlineCountUpdated();
    }

    // Leaderboard management with real online players
    public updateOnlinePlayers(remotePlayers: PlayerProgress[]) {
        this.onlinePlayers = remotePlayers;
        this.notifyLeaderboardUpdated();
    }

    public updateRemotePlayerProgress(progress: PlayerProgress) {
        const idx = this.onlinePlayers.findIndex(p => p.id === progress.id);
        if (idx >= 0) {
            this.onlinePlayers[idx] = { ...this.onlinePlayers[idx], ...progress };
        } else {
            this.onlinePlayers.push(progress);
        }
        this.notifyLeaderboardUpdated();
    }

    public tickLiveRunners() {
        // Safe no-op: no fake runners, only real players
    }

    // Chat management (Strictly human messages, real online players, NO AI)
    private loadChat() {
        try {
            const raw = localStorage.getItem(CHAT_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.chatMessages = parsed;
                    return;
                }
            }
        } catch (e) {
            console.warn('Could not parse chat storage:', e);
        }

        this.chatMessages = [];
    }

    public getChatMessages(): ChatMessage[] {
        return [...this.chatMessages];
    }

    // Real player sends chat message
    public addChatMessage(text: string): boolean {
        const clean = text.trim();
        if (!clean || clean.length > 120) return false;

        // Anti-AI Bot filter: AI bots cannot post to this chat
        if (/\[AI\]|\bbot\b|openai|gpt|gemini|assistant|chatbot/i.test(clean)) {
            return false;
        }

        const msg: ChatMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            author: this.playerName,
            isOwner: this.isOwner,
            text: clean,
            timestamp: Date.now()
        };

        this.chatMessages.push(msg);
        if (this.chatMessages.length > 60) {
            this.chatMessages.shift();
        }

        this.saveChatMessages();
        this.notifyChatUpdated();

        // Broadcast to other real online players worldwide
        this.network?.broadcastChatMessage(msg);

        return true;
    }

    // Incoming chat message from another real player via network
    public receiveOnlineMessage(msg: ChatMessage) {
        if (!msg || !msg.id || !msg.text) return;

        // Anti-AI Bot filter on incoming messages as well
        if (/\[AI\]|\bbot\b|openai|gpt|gemini|assistant|chatbot/i.test(msg.text)) {
            return;
        }

        // Deduplicate
        if (this.chatMessages.some(m => m.id === msg.id)) {
            return;
        }

        this.chatMessages.push(msg);
        if (this.chatMessages.length > 60) {
            this.chatMessages.shift();
        }

        this.saveChatMessages();
        this.notifyChatUpdated();
    }

    // Sync history received from other active players or storage
    public mergeHistory(msgs: ChatMessage[]) {
        if (!Array.isArray(msgs) || msgs.length === 0) return;

        let hasNew = false;
        const existingIds = new Set(this.chatMessages.map(m => m.id));

        msgs.forEach(m => {
            if (m && m.id && !existingIds.has(m.id)) {
                if (!/\[AI\]|\bbot\b|openai|gpt|gemini|assistant|chatbot/i.test(m.text)) {
                    this.chatMessages.push(m);
                    existingIds.add(m.id);
                    hasNew = true;
                }
            }
        });

        if (hasNew) {
            this.chatMessages.sort((a, b) => a.timestamp - b.timestamp);
            if (this.chatMessages.length > 60) {
                this.chatMessages = this.chatMessages.slice(-60);
            }
            this.saveChatMessages();
            this.notifyChatUpdated();
        }
    }

    public syncChatFromStorage(msgs: ChatMessage[]) {
        this.mergeHistory(msgs);
    }

    private saveChatMessages() {
        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.chatMessages));
        } catch (e) {
            console.warn('Could not save chat messages:', e);
        }
    }

    // Leaderboard table entries (Local player + any real online players)
    public getLeaderboard(): PlayerProgress[] {
        const list: PlayerProgress[] = [
            {
                id: 'curr_player',
                name: this.playerName,
                isOwner: this.isOwner,
                stage: this.currentStage,
                percentage: this.getPercentage(),
                isFinished: this.isWon
            },
            ...this.onlinePlayers
        ];
        return list.sort((a, b) => b.stage - a.stage);
    }
}
