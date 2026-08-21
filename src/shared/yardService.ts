import { supabase } from '../lib/supabase';

export interface YardData {
    yards: number;
    streak: number; // 0 to 7
    lastClaimTimestamp: number; // ms
    inventory: string[];
    transactions: {
        id: string;
        amount: number;
        type: 'earn' | 'spend' | 'bonus' | 'claim';
        reason: string;
        timestamp: number;
    }[];
}

const STORAGE_PREFIX = 'playard_yards_';
const MS_IN_24_HOURS = 24 * 60 * 60 * 1000;
const MS_IN_48_HOURS = 48 * 60 * 60 * 1000;

const DAILY_STREAK_REWARD = 100;
const DAY_7_JACKPOT_REWARD = 500;

class YardService {
    private data: YardData;
    private currentUserId: string | null = null;
    private listeners: Array<(data: YardData) => void> = [];

    constructor() {
        this.data = this.loadLocalData();
        this.initAuthAndSync();
    }

    private getStorageKey(): string {
        return this.currentUserId ? `${STORAGE_PREFIX}user_${this.currentUserId}` : `${STORAGE_PREFIX}guest`;
    }

    private loadLocalData(): YardData {
        try {
            const key = this.getStorageKey();
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    yards: typeof parsed.yards === 'number' ? parsed.yards : 0,
                    streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
                    lastClaimTimestamp: typeof parsed.lastClaimTimestamp === 'number' ? parsed.lastClaimTimestamp : 0,
                    inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
                    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
                };
            }
        } catch (e) {
            console.warn('Failed to parse YardData from storage:', e);
        }

        return {
            yards: 0,
            streak: 0,
            lastClaimTimestamp: 0,
            inventory: [],
            transactions: []
        };
    }

    private saveLocally(data: YardData) {
        this.data = data;
        const key = this.getStorageKey();
        localStorage.setItem(key, JSON.stringify(data));
        this.notifyListeners();
    }

    private async initAuthAndSync() {
        if (!supabase) return;
        try {
            // 1. Initial Session Check
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                this.currentUserId = session.user.id;
                this.data = this.loadLocalData();
                await this.syncWithCloud(session.user.id);
            }

            // 2. Listen to login / logout events
            supabase.auth.onAuthStateChange(async (_event, newSession) => {
                if (newSession?.user?.id) {
                    this.currentUserId = newSession.user.id;
                    this.data = this.loadLocalData();
                    await this.syncWithCloud(newSession.user.id);
                } else {
                    this.currentUserId = null;
                    this.data = this.loadLocalData();
                    this.notifyListeners();
                }
            });
        } catch (e) {
            console.warn('Auth sync initialization error:', e);
        }
    }

    private async syncWithCloud(userId: string) {
        if (!supabase || !userId) return;
        try {
            // Attempt to load from user_yards table
            const { data: yardRecord, error: yardErr } = await supabase
                .from('user_yards')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (yardRecord && !yardErr && typeof yardRecord.yards === 'number') {
                this.data.yards = yardRecord.yards;
                this.data.streak = yardRecord.streak ?? this.data.streak;
                this.data.lastClaimTimestamp = yardRecord.last_claim_timestamp ?? this.data.lastClaimTimestamp;
                if (Array.isArray(yardRecord.inventory)) {
                    this.data.inventory = yardRecord.inventory;
                }
                this.saveLocally(this.data);
            } else {
                // If not found in user_yards, check user_progress table (fallback)
                const { data: progRecord } = await supabase
                    .from('user_progress')
                    .select('yards')
                    .eq('user_id', userId)
                    .single();

                if (progRecord && typeof progRecord.yards === 'number') {
                    this.data.yards = progRecord.yards;
                    this.saveLocally(this.data);
                } else {
                    // First time save to cloud for this account
                    await this.saveToCloud();
                }
            }
        } catch (err) {
            console.warn('Could not sync yards from cloud:', err);
        }
    }

    public async saveToCloud() {
        if (!supabase) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const payload = {
                    user_id: session.user.id,
                    yards: this.data.yards,
                    streak: this.data.streak,
                    last_claim_timestamp: this.data.lastClaimTimestamp,
                    inventory: this.data.inventory,
                    updated_at: new Date().toISOString()
                };

                // Upsert to user_yards
                await supabase.from('user_yards').upsert(payload);

                // Also sync to user_progress if applicable
                await supabase.from('user_progress').upsert({
                    user_id: session.user.id,
                    yards: this.data.yards
                });
            }
        } catch (err) {
            console.warn('Could not save yards to account cloud:', err);
        }
    }

    public getYards(): number {
        return this.data.yards;
    }

    public getInventory(): string[] {
        return [...this.data.inventory];
    }

    public hasItem(itemId: string): boolean {
        return this.data.inventory.includes(itemId);
    }

    public addYards(amount: number, reason = 'Game Reward'): number {
        if (amount <= 0) return this.data.yards;
        
        const finalAmount = Math.round(amount);
        this.data.yards += finalAmount;
        this.data.transactions.unshift({
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            amount: finalAmount,
            type: 'earn',
            reason: reason,
            timestamp: Date.now()
        });

        if (this.data.transactions.length > 50) {
            this.data.transactions = this.data.transactions.slice(0, 50);
        }

        this.saveLocally(this.data);
        this.saveToCloud();
        return this.data.yards;
    }

    public spendYards(amount: number, itemId?: string, reason = 'Purchase'): boolean {
        if (amount <= 0) return true;
        if (this.data.yards < amount) {
            return false;
        }

        this.data.yards -= amount;
        if (itemId && !this.data.inventory.includes(itemId)) {
            this.data.inventory.push(itemId);
        }

        this.data.transactions.unshift({
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            amount: -amount,
            type: 'spend',
            reason: itemId ? `Unlocked ${reason}` : reason,
            timestamp: Date.now()
        });

        this.saveLocally(this.data);
        this.saveToCloud();
        return true;
    }

    public getDailyStreakInfo() {
        const now = Date.now();
        const last = this.data.lastClaimTimestamp;
        
        let canClaim = false;
        let timeRemainingMs = 0;
        let effectiveStreak = this.data.streak;

        if (last === 0) {
            canClaim = true;
            effectiveStreak = 0;
        } else {
            const timeSinceLast = now - last;
            if (timeSinceLast >= MS_IN_24_HOURS) {
                canClaim = true;
                if (timeSinceLast > MS_IN_48_HOURS) {
                    effectiveStreak = 0;
                }
            } else {
                canClaim = false;
                timeRemainingMs = MS_IN_24_HOURS - timeSinceLast;
            }
        }

        const nextDayIndex = effectiveStreak >= 7 ? 1 : effectiveStreak + 1;
        const nextRewardAmount = nextDayIndex === 7 ? DAY_7_JACKPOT_REWARD : DAILY_STREAK_REWARD;

        const days = [];
        for (let i = 1; i <= 7; i++) {
            const isJackpot = (i === 7);
            const reward = isJackpot ? DAY_7_JACKPOT_REWARD : DAILY_STREAK_REWARD;
            let status: 'claimed' | 'available' | 'locked';

            if (i <= effectiveStreak) {
                status = 'claimed';
            } else if (i === nextDayIndex && canClaim) {
                status = 'available';
            } else {
                status = 'locked';
            }

            days.push({
                day: i,
                reward,
                isJackpot,
                status
            });
        }

        return {
            canClaim,
            currentStreak: effectiveStreak,
            nextDayIndex,
            nextRewardAmount,
            timeRemainingMs,
            days
        };
    }

    public claimDailyReward(): { success: boolean; amount: number; day: number; message: string } {
        const info = this.getDailyStreakInfo();
        if (!info.canClaim) {
            const hoursLeft = Math.ceil(info.timeRemainingMs / (1000 * 60 * 60));
            return {
                success: false,
                amount: 0,
                day: info.currentStreak,
                message: `Daily reward already claimed! Return in ${hoursLeft} hours.`
            };
        }

        const nextStreak = (info.currentStreak >= 7 || info.currentStreak === 0) ? 1 : info.currentStreak + 1;
        const rewardAmount = nextStreak === 7 ? DAY_7_JACKPOT_REWARD : DAILY_STREAK_REWARD;

        this.data.streak = nextStreak;
        this.data.lastClaimTimestamp = Date.now();
        this.data.yards += rewardAmount;

        this.data.transactions.unshift({
            id: 'tx_' + Date.now(),
            amount: rewardAmount,
            type: 'claim',
            reason: `Daily Streak Day ${nextStreak} Reward${nextStreak === 7 ? ' (Day 7 Jackpot)' : ''}`,
            timestamp: Date.now()
        });

        this.saveLocally(this.data);
        this.saveToCloud();

        return {
            success: true,
            amount: rewardAmount,
            day: nextStreak,
            message: nextStreak === 7
                ? `🎉 DAY 7 JACKPOT CLAIMED: +${rewardAmount} YARDS! 🎉`
                : `🎁 Day ${nextStreak} claimed: +${rewardAmount} Yards!`
        };
    }

    public debugFastForward24Hours() {
        this.data.lastClaimTimestamp = Date.now() - (MS_IN_24_HOURS + 1000);
        this.saveLocally(this.data);
    }

    public subscribe(listener: (data: YardData) => void): () => void {
        this.listeners.push(listener);
        listener(this.data);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.data);
            } catch (e) {
                console.error(e);
            }
        }
        window.dispatchEvent(new CustomEvent('playard_yards_updated', { detail: this.data }));
    }

    public getFormattedCountdown() {
        const info = this.getDailyStreakInfo();
        if (info.canClaim) {
            return {
                canClaim: true,
                hours: 0,
                minutes: 0,
                seconds: 0,
                hmsString: 'READY TO CLAIM!',
                badgeText: 'READY!',
                timeRemainingMs: 0
            };
        }

        const totalSec = Math.max(0, Math.floor(info.timeRemainingMs / 1000));
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');
        const hmsString = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
        const badgeText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        return {
            canClaim: false,
            hours,
            minutes,
            seconds,
            hmsString,
            badgeText,
            timeRemainingMs: info.timeRemainingMs
        };
    }

    public resetStreakAndTimer() {
        this.data.streak = 0;
        this.data.lastClaimTimestamp = 0;
        this.saveLocally(this.data);
        this.saveToCloud();
    }

    public renderYardSvg(size = 22, className = ''): string {
        return `
        <svg class="${className}" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block; filter: drop-shadow(0 0 5px rgba(0, 242, 254, 0.6));">
            <defs>
                <linearGradient id="yardBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#00f2fe"/>
                    <stop offset="50%" stop-color="#4facfe"/>
                    <stop offset="100%" stop-color="#0be881"/>
                </linearGradient>
                <linearGradient id="yardGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffeaa7"/>
                    <stop offset="50%" stop-color="#fdcb6e"/>
                    <stop offset="100%" stop-color="#e67e22"/>
                </linearGradient>
                <linearGradient id="yardYGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="60%" stop-color="#e0f7fa"/>
                    <stop offset="100%" stop-color="#00f2fe"/>
                </linearGradient>
                <filter id="yardGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                </filter>
            </defs>
            <polygon points="50,3 93,26 93,74 50,97 7,74 7,26" fill="url(#yardBgGrad)" stroke="url(#yardGoldBorder)" stroke-width="6" stroke-linejoin="round"/>
            <polygon points="50,12 85,31 85,69 50,88 15,69 15,31" fill="#0b2447" fill-opacity="0.45" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6"/>
            <polygon points="50,12 85,31 50,50 15,31" fill="#ffffff" fill-opacity="0.15"/>
            <path d="M30 26 L45 50 L45 74 L55 74 L55 50 L70 26 L58 26 L50 40 L42 26 Z" fill="url(#yardYGrad)" stroke="#0984e3" stroke-width="1.5" filter="url(#yardGlow)"/>
        </svg>
        `;
    }
}

export const yardService = new YardService();
