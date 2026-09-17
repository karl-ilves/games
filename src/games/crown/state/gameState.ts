import { ChatMessage, PlayerProgress } from '../types';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../../auth';

const CHAT_STORAGE_KEY = 'playard_crown_chat_v1';

export class GameState {
    private currentStage: number = 1;
    private maxStage: number = 50;
    private respawnPos: { x: number; y: number; z: number } = { x: 0, y: 1.5, z: 0 };
    private isWon: boolean = false;
    private chatMessages: ChatMessage[] = [];
    private isOwner: boolean = false;
    private playerName: string = 'Külaline';

    constructor() {
        this.checkAuth();
        this.loadChat();
    }

    private checkAuth() {
        const prof = getCurrentUserProfile();
        this.isOwner = isPlayardOwner(prof?.email) || isTestMode() || !!(prof?.username?.toLowerCase().includes('owner'));
        this.playerName = prof?.displayName || prof?.username || (this.isOwner ? 'Playard Owner👑' : 'Player');
    }

    public getIsOwner(): boolean {
        return this.isOwner;
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
            }
            return true;
        }
        return false;
    }

    public isGameWon(): boolean {
        return this.isWon;
    }

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
    }

    // Chat management (Strictly human messages, NO AI)
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

        // No default fake messages - chat starts clean
        this.chatMessages = [];
    }

    public getChatMessages(): ChatMessage[] {
        return [...this.chatMessages];
    }

    public addChatMessage(text: string): boolean {
        const clean = text.trim();
        if (!clean || clean.length > 120) return false;

        // Anti-AI Bot filter: AI cannot post to this chat
        if (/\[AI\]|\bbot\b|openai|gpt|gemini|assistant|chatbot/i.test(clean)) {
            return false;
        }

        const msg: ChatMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            author: this.playerName,
            isOwner: this.isOwner,
            text: clean,
            timestamp: Date.now()
        };

        this.chatMessages.push(msg);
        if (this.chatMessages.length > 50) {
            this.chatMessages.shift();
        }

        try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.chatMessages));
        } catch (e) {
            console.warn('Could not save chat messages:', e);
        }

        return true;
    }

    // Leaderboard table entries (Only real players currently in game)
    public getLeaderboard(): PlayerProgress[] {
        return [
            {
                id: 'curr_player',
                name: this.playerName,
                isOwner: this.isOwner,
                stage: this.currentStage,
                percentage: this.getPercentage(),
                isFinished: this.isWon
            }
        ];
    }
}
