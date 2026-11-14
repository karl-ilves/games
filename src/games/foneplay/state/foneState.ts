import { LivePollState } from '../types';

export const FONEPLAY_POLL_STORAGE_KEY = 'playard_foneplay_live_poll_v1';
export const FONEPLAY_USER_VOTE_KEY = 'playard_foneplay_user_vote';
export const FONEPLAY_COMPLETED_VARIANTS_KEY = 'playard_foneplay_completed_variants';
export const FONEPLAY_PRESENCE_CHANNEL = 'playard_foneplay_presence';

export class FonePlayState {
    private pollState: LivePollState;
    private broadcast: BroadcastChannel | null = null;
    private presenceMap: Map<string, number> = new Map();
    private myTabId: string;
    private heartbeatInterval: number | null = null;

    constructor() {
        this.myTabId = 'fone_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        this.pollState = this.loadPollState();
        this.setupBroadcast();
        this.startPresence();
    }

    private loadPollState(): LivePollState {
        const defaultState: LivePollState = {
            votes: { v1: 0, v2: 0, v3: 0 },
            userVoted: null,
            totalVotersOnline: 1,
            lastUpdated: Date.now()
        };

        if (typeof window === 'undefined' || !window.localStorage) {
            return defaultState;
        }

        try {
            const raw = localStorage.getItem(FONEPLAY_POLL_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.votes) {
                    const userVote = this.getUserVote();
                    return {
                        votes: {
                            v1: Math.max(0, Number(parsed.votes.v1) || 0),
                            v2: Math.max(0, Number(parsed.votes.v2) || 0),
                            v3: Math.max(0, Number(parsed.votes.v3) || 0)
                        },
                        userVoted: userVote,
                        totalVotersOnline: 1,
                        lastUpdated: parsed.lastUpdated || Date.now()
                    };
                }
            }
        } catch (e) {
            console.warn('Failed to load foneplay poll state', e);
        }

        return defaultState;
    }

    private savePollState() {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            localStorage.setItem(FONEPLAY_POLL_STORAGE_KEY, JSON.stringify({
                votes: this.pollState.votes,
                lastUpdated: Date.now()
            }));
            this.broadcast?.postMessage({
                type: 'poll_update',
                votes: this.pollState.votes
            });
        } catch (e) {
            console.warn('Failed to save foneplay poll state', e);
        }
    }

    private setupBroadcast() {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            this.broadcast = new BroadcastChannel(FONEPLAY_PRESENCE_CHANNEL);
            this.broadcast.onmessage = (event) => {
                const data = event.data;
                if (!data) return;

                if (data.type === 'poll_update' && data.votes) {
                    this.pollState.votes = {
                        v1: Number(data.votes.v1) || 0,
                        v2: Number(data.votes.v2) || 0,
                        v3: Number(data.votes.v3) || 0
                    };
                    window.dispatchEvent(new CustomEvent('foneplay:poll_changed', { detail: this.getPollState() }));
                } else if (data.type === 'presence_heartbeat' && data.tabId) {
                    this.presenceMap.set(data.tabId, Date.now());
                    this.recalcOnlineCount();
                } else if (data.type === 'presence_leave' && data.tabId) {
                    this.presenceMap.delete(data.tabId);
                    this.recalcOnlineCount();
                }
            };
        } catch (e) {
            console.warn('BroadcastChannel not available in environment', e);
        }
    }

    private startPresence() {
        this.presenceMap.set(this.myTabId, Date.now());
        this.recalcOnlineCount();

        if (typeof window !== 'undefined') {
            this.heartbeatInterval = window.setInterval(() => {
                const now = Date.now();
                this.presenceMap.set(this.myTabId, now);
                // Clean stale entries older than 8s
                for (const [id, time] of this.presenceMap.entries()) {
                    if (now - time > 8000) {
                        this.presenceMap.delete(id);
                    }
                }
                this.recalcOnlineCount();
                try {
                    this.broadcast?.postMessage({
                        type: 'presence_heartbeat',
                        tabId: this.myTabId
                    });
                } catch (e) {}
            }, 3000);

            const handleExit = () => {
                try {
                    this.broadcast?.postMessage({
                        type: 'presence_leave',
                        tabId: this.myTabId
                    });
                } catch (e) {}
            };
            window.addEventListener('beforeunload', handleExit);
            window.addEventListener('pagehide', handleExit);
        }
    }

    private recalcOnlineCount() {
        // Real online count is always at least 1 (the current player) plus other active tabs
        const onlineCount = Math.max(1, this.presenceMap.size);
        if (this.pollState.totalVotersOnline !== onlineCount) {
            this.pollState.totalVotersOnline = onlineCount;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('foneplay:poll_changed', { detail: this.getPollState() }));
            }
        }
    }

    public getPollState(): LivePollState {
        this.pollState.userVoted = this.getUserVote();
        return {
            votes: { ...this.pollState.votes },
            userVoted: this.pollState.userVoted,
            totalVotersOnline: this.pollState.totalVotersOnline,
            lastUpdated: this.pollState.lastUpdated
        };
    }

    public castVote(variantId: number): boolean {
        if (variantId < 1 || variantId > 3) return false;

        const currentVote = this.getUserVote();
        if (currentVote === variantId) {
            return false; // Already voted for this variant
        }

        // If previously voted, remove old vote
        if (currentVote === 1) this.pollState.votes.v1 = Math.max(0, this.pollState.votes.v1 - 1);
        if (currentVote === 2) this.pollState.votes.v2 = Math.max(0, this.pollState.votes.v2 - 1);
        if (currentVote === 3) this.pollState.votes.v3 = Math.max(0, this.pollState.votes.v3 - 1);

        // Add new vote
        if (variantId === 1) this.pollState.votes.v1++;
        if (variantId === 2) this.pollState.votes.v2++;
        if (variantId === 3) this.pollState.votes.v3++;

        this.setUserVote(variantId);
        this.savePollState();

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('foneplay:poll_changed', { detail: this.getPollState() }));
        }
        return true;
    }

    public getUserVote(): number | null {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        try {
            const raw = localStorage.getItem(FONEPLAY_USER_VOTE_KEY);
            if (raw !== null) {
                const parsed = parseInt(raw, 10);
                if (parsed >= 1 && parsed <= 3) return parsed;
            }
        } catch (e) {}
        return null;
    }

    public setUserVote(variantId: number | null) {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            if (variantId === null) {
                localStorage.removeItem(FONEPLAY_USER_VOTE_KEY);
            } else {
                localStorage.setItem(FONEPLAY_USER_VOTE_KEY, String(variantId));
            }
        } catch (e) {}
    }

    public markVariantCompleted(variantId: number) {
        const completed = this.getCompletedVariants();
        if (!completed.includes(variantId)) {
            completed.push(variantId);
            try {
                localStorage.setItem(FONEPLAY_COMPLETED_VARIANTS_KEY, JSON.stringify(completed));
            } catch (e) {}
        }
    }

    public getCompletedVariants(): number[] {
        if (typeof window === 'undefined' || !window.localStorage) return [];
        try {
            const raw = localStorage.getItem(FONEPLAY_COMPLETED_VARIANTS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return [];
    }

    public hasCompletedAllVariants(): boolean {
        const completed = this.getCompletedVariants();
        return completed.includes(1) && completed.includes(2) && completed.includes(3);
    }

    public dispose() {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
        }
        try {
            this.broadcast?.close();
        } catch (e) {}
    }
}

export const fonePlayState = new FonePlayState();
