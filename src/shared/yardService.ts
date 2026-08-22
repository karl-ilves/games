import { supabase } from '../lib/supabase';

export interface YardData {
    yards: number;
    streak: number; // 0 to 7
    lastClaimTimestamp: number; // ms
    inventory: string[];
    redeemedCodes: string[];
    transactions: {
        id: string;
        amount: number;
        type: 'earn' | 'spend' | 'bonus' | 'claim' | 'promo' | 'admin_grant';
        reason: string;
        timestamp: number;
    }[];
}

export interface AdminYardLog {
    id: string;
    adminEmail: string;
    targetUsername: string;
    amount: number;
    reason: string;
    timestamp: number;
}

export interface CodeRedemptionEntry {
    id: string;
    code: string;
    amount: number;
    username: string;
    email?: string;
    timestamp: number;
}

export interface CreatedGame {
    id: string;
    userId?: string;
    creatorUsername: string;
    title: string;
    description: string;
    category: string;
    thumbnail?: string;
    sceneData: any;
    status: 'pending_review' | 'approved' | 'rejected' | 'changes_requested';
    feedback?: string;
    plays: number;
    createdAt: number;
    updatedAt: number;
}

const PRIMARY_STORAGE_KEY = 'playard_yards_data';
const STORAGE_PREFIX = 'playard_yards_';
const ADMIN_LOGS_KEY = 'playard_admin_yard_logs';
const GAMES_STORAGE_KEY = 'playard_user_created_games';
const CODE_REDEMPTIONS_STORAGE_KEY = 'playard_code_redemptions_global';

const MS_IN_24_HOURS = 24 * 60 * 60 * 1000;
const MS_IN_48_HOURS = 48 * 60 * 60 * 1000;

const DAILY_STREAK_REWARD = 100;
const DAY_7_JACKPOT_REWARD = 500;

export const PROMO_CODES: Record<string, number> = {
    'A380': 3800,
    'SKYAVIATION2': 250,
    'PLAYARD2026': 500,
    'YARDS1000': 1000,
    'YOUTUBE': 100,
    'ADMINSPECIAL': 2000,
    'CREATOR': 300
};

class YardService {
    private data: YardData;
    private currentUserId: string | null = null;
    private currentUserUsername: string | null = null;
    private currentUserEmail: string | null = null;
    private listeners: Array<(data: YardData) => void> = [];

    constructor() {
        this.data = this.loadLocalData();
        this.initStorageListener();
        this.initAuthAndSync();
    }

    private getUserStorageKeys(): string[] {
        const keys: string[] = [];
        if (this.currentUserId) keys.push(`${STORAGE_PREFIX}user_${this.currentUserId}`);
        if (this.currentUserUsername) keys.push(`${STORAGE_PREFIX}user_${this.currentUserUsername.toLowerCase()}`);
        if (this.currentUserEmail) keys.push(`${STORAGE_PREFIX}user_${this.currentUserEmail.toLowerCase()}`);
        return keys;
    }

    private loadLocalData(): YardData {
        try {
            const userKeys = this.getUserStorageKeys();
            for (const key of userKeys) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed.yards === 'number') {
                        return {
                            yards: parsed.yards,
                            streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
                            lastClaimTimestamp: typeof parsed.lastClaimTimestamp === 'number' ? parsed.lastClaimTimestamp : 0,
                            inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
                            redeemedCodes: Array.isArray(parsed.redeemedCodes) ? parsed.redeemedCodes : [],
                            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
                        };
                    }
                }
            }

            const raw = localStorage.getItem(PRIMARY_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    yards: typeof parsed.yards === 'number' ? parsed.yards : 0,
                    streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
                    lastClaimTimestamp: typeof parsed.lastClaimTimestamp === 'number' ? parsed.lastClaimTimestamp : 0,
                    inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
                    redeemedCodes: Array.isArray(parsed.redeemedCodes) ? parsed.redeemedCodes : [],
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
            redeemedCodes: [],
            transactions: []
        };
    }

    private saveLocally(data: YardData) {
        this.data = data;
        try {
            const raw = JSON.stringify(data);
            localStorage.setItem(PRIMARY_STORAGE_KEY, raw);
            const userKeys = this.getUserStorageKeys();
            userKeys.forEach(k => localStorage.setItem(k, raw));
        } catch (e) {
            console.warn('Could not save YardData locally:', e);
        }
        this.notifyListeners();
    }

    private initStorageListener() {
        window.addEventListener('storage', (e) => {
            const userKeys = this.getUserStorageKeys();
            if (e.key === PRIMARY_STORAGE_KEY || (e.key && userKeys.includes(e.key))) {
                if (e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        this.data = {
                            yards: typeof parsed.yards === 'number' ? parsed.yards : 0,
                            streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
                            lastClaimTimestamp: typeof parsed.lastClaimTimestamp === 'number' ? parsed.lastClaimTimestamp : 0,
                            inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
                            redeemedCodes: Array.isArray(parsed.redeemedCodes) ? parsed.redeemedCodes : [],
                            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
                        };
                        this.notifyListeners();
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        });
    }

    public onUserLogout() {
        if (this.currentUserId || this.currentUserUsername || this.currentUserEmail) {
            // Save state under all user identifiers before resetting to guest 0
            const raw = JSON.stringify(this.data);
            const userKeys = this.getUserStorageKeys();
            userKeys.forEach(k => localStorage.setItem(k, raw));
            this.saveToCloud();
        }

        this.currentUserId = null;
        this.currentUserUsername = null;
        this.currentUserEmail = null;

        // Guest mode resets strictly to 0
        this.data = {
            yards: 0,
            streak: 0,
            lastClaimTimestamp: 0,
            inventory: [],
            redeemedCodes: [],
            transactions: []
        };
        localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(this.data));
        this.notifyListeners();
    }

    public async onUserLogin(userId: string, username?: string, email?: string) {
        this.currentUserId = userId;
        this.currentUserUsername = username || null;
        this.currentUserEmail = email || null;

        let maxFoundYards = 0;
        let bestData: YardData | null = null;

        const candidateKeys = [
            `${STORAGE_PREFIX}user_${userId}`,
            username ? `${STORAGE_PREFIX}user_${username.toLowerCase()}` : '',
            email ? `${STORAGE_PREFIX}user_${email.toLowerCase()}` : '',
            userId.includes('@') ? `${STORAGE_PREFIX}user_${userId.toLowerCase()}` : ''
        ].filter(Boolean);

        for (const k of candidateKeys) {
            const raw = localStorage.getItem(k);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed.yards === 'number' && (bestData === null || parsed.yards >= maxFoundYards)) {
                        maxFoundYards = parsed.yards;
                        bestData = {
                            yards: parsed.yards,
                            streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
                            lastClaimTimestamp: typeof parsed.lastClaimTimestamp === 'number' ? parsed.lastClaimTimestamp : 0,
                            inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
                            redeemedCodes: Array.isArray(parsed.redeemedCodes) ? parsed.redeemedCodes : [],
                            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
                        };
                    }
                } catch (e) {}
            }
        }

        if (bestData) {
            this.data = bestData;
        } else {
            this.data = {
                yards: 0,
                streak: 0,
                lastClaimTimestamp: 0,
                inventory: [],
                redeemedCodes: [],
                transactions: []
            };
        }

        this.saveLocally(this.data);
        await this.syncWithCloud(userId);
    }

    private async initAuthAndSync() {
        if (!supabase) return;
        try {
            // 1. Initial Session Check
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                await this.onUserLogin(session.user.id, session.user.user_metadata?.username, session.user.email);
            }

            // 2. Listen to login / logout events
            supabase.auth.onAuthStateChange(async (_event, newSession) => {
                if (newSession?.user?.id) {
                    await this.onUserLogin(newSession.user.id, newSession.user.user_metadata?.username, newSession.user.email);
                } else {
                    const currentProfRaw = localStorage.getItem('playard_current_user_profile');
                    if (!currentProfRaw) {
                        this.onUserLogout();
                    }
                }
            });
        } catch (e) {
            console.warn('Auth sync initialization error:', e);
        }
    }

    private async syncWithCloud(userId: string) {
        if (!supabase || !userId) return;
        try {
            const { data: yardRecord, error: yardErr } = await supabase
                .from('user_yards')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (yardRecord && !yardErr && typeof yardRecord.yards === 'number') {
                if (yardRecord.yards >= this.data.yards) {
                    this.data.yards = yardRecord.yards;
                    this.data.streak = yardRecord.streak ?? this.data.streak;
                    this.data.lastClaimTimestamp = yardRecord.last_claim_timestamp ?? this.data.lastClaimTimestamp;
                    if (Array.isArray(yardRecord.inventory)) {
                        this.data.inventory = yardRecord.inventory;
                    }
                    this.saveLocally(this.data);
                } else {
                    await this.saveToCloud();
                }
            } else {
                const { data: progRecord } = await supabase
                    .from('user_progress')
                    .select('yards')
                    .eq('user_id', userId)
                    .single();

                if (progRecord && typeof progRecord.yards === 'number') {
                    if (progRecord.yards >= this.data.yards) {
                        this.data.yards = progRecord.yards;
                        this.saveLocally(this.data);
                    } else {
                        await this.saveToCloud();
                    }
                } else {
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

                await supabase.from('user_yards').upsert(payload);
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

    // --- Promo Code Redemption ---
    public redeemPromoCode(codeRaw: string): { success: boolean; amount: number; message: string } {
        const code = codeRaw.trim().toUpperCase();
        if (!code) {
            return { success: false, amount: 0, message: 'Please enter a promo code.' };
        }

        if (this.data.redeemedCodes.includes(code)) {
            return { success: false, amount: 0, message: `Code '${code}' has already been redeemed on this account!` };
        }

        const reward = PROMO_CODES[code];
        if (!reward) {
            return {
                success: false,
                amount: 0,
                message: 'Invalid code! Check the SkyAviation2 YouTube channel for active codes.'
            };
        }

        this.data.redeemedCodes.push(code);
        this.data.yards += reward;
        this.data.transactions.unshift({
            id: 'tx_promo_' + Date.now(),
            amount: reward,
            type: 'promo',
            reason: `Promo Code Redeemed: ${code}`,
            timestamp: Date.now()
        });

        // Record global code redemption for Admin stats
        this.recordCodeRedemption(
            code,
            reward,
            this.currentUserUsername || 'GuestPlayer',
            this.currentUserEmail || undefined
        );

        this.saveLocally(this.data);
        this.saveToCloud();

        return {
            success: true,
            amount: reward,
            message: `🎉 Success! Redeemed code '${code}' for +${reward} Yards!`
        };
    }

    public recordCodeRedemption(code: string, amount: number, username: string, email?: string) {
        const entry: CodeRedemptionEntry = {
            id: 'redemption_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            code,
            amount,
            username: username || 'GuestPlayer',
            email,
            timestamp: Date.now()
        };

        const logs = this.getCodeRedemptions();
        logs.unshift(entry);
        try {
            localStorage.setItem(CODE_REDEMPTIONS_STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {}

        if (supabase) {
            try {
                supabase.from('admin_yard_logs').insert({
                    id: entry.id,
                    admin_email: 'PROMO_CODE',
                    target_username: entry.username,
                    amount: entry.amount,
                    reason: `Code Redeemed: ${entry.code}`
                }).then(() => {});
            } catch (e) {}
        }
    }

    public getCodeRedemptions(): CodeRedemptionEntry[] {
        try {
            const raw = localStorage.getItem(CODE_REDEMPTIONS_STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    public getCodeRedemptionStats() {
        const logs = this.getCodeRedemptions();
        const codeMap: Record<string, {
            code: string;
            reward: number;
            count: number;
            totalYards: number;
            users: Array<{ username: string; email?: string; timestamp: number }>;
            lastRedeemed: number | null;
        }> = {};

        // Pre-fill known promo codes
        Object.entries(PROMO_CODES).forEach(([c, r]) => {
            codeMap[c] = {
                code: c,
                reward: r,
                count: 0,
                totalYards: 0,
                users: [],
                lastRedeemed: null
            };
        });

        logs.forEach(l => {
            if (!codeMap[l.code]) {
                codeMap[l.code] = {
                    code: l.code,
                    reward: l.amount,
                    count: 0,
                    totalYards: 0,
                    users: [],
                    lastRedeemed: null
                };
            }
            codeMap[l.code].count++;
            codeMap[l.code].totalYards += l.amount;
            codeMap[l.code].users.push({
                username: l.username,
                email: l.email,
                timestamp: l.timestamp
            });
            if (!codeMap[l.code].lastRedeemed || l.timestamp > codeMap[l.code].lastRedeemed!) {
                codeMap[l.code].lastRedeemed = l.timestamp;
            }
        });

        return {
            totalRedemptions: logs.length,
            totalYardsGiven: logs.reduce((sum, l) => sum + l.amount, 0),
            codes: Object.values(codeMap),
            recentLogs: logs.slice(0, 50)
        };
    }

    // --- Admin Give Yards by Username ---
    public async adminGiveYardsByUsername(
        username: string,
        amount: number,
        reason = 'Admin Grant',
        adminEmail = '1karl.ilves@gmail.com'
    ): Promise<{ success: boolean; message: string; targetYards?: number }> {
        const cleanUsername = username.trim();
        const grantAmount = Math.round(amount);

        if (!cleanUsername) {
            return { success: false, message: 'Please enter a valid username.' };
        }
        if (isNaN(grantAmount) || grantAmount <= 0) {
            return { success: false, message: 'Please enter a positive Yards amount.' };
        }

        // 1. Log transfer
        const logEntry: AdminYardLog = {
            id: 'admin_log_' + Date.now(),
            adminEmail,
            targetUsername: cleanUsername,
            amount: grantAmount,
            reason,
            timestamp: Date.now()
        };

        const existingLogs = this.getAdminYardLogs();
        existingLogs.unshift(logEntry);
        localStorage.setItem(ADMIN_LOGS_KEY, JSON.stringify(existingLogs.slice(0, 100)));

        if (supabase) {
            try {
                await supabase.from('admin_yard_logs').insert({
                    id: logEntry.id,
                    admin_email: adminEmail,
                    target_username: cleanUsername,
                    amount: grantAmount,
                    reason: reason
                });
            } catch (err) {
                console.warn('Could not sync admin log to cloud:', err);
            }
        }

        // 2. Check if granting to self / current user
        const currentProfileRaw = localStorage.getItem('playard_current_user_profile');
        let isSelf = false;
        if (currentProfileRaw) {
            try {
                const profile = JSON.parse(currentProfileRaw);
                if (profile.username && profile.username.toLowerCase() === cleanUsername.toLowerCase()) {
                    isSelf = true;
                }
            } catch (e) {}
        }

        if (isSelf || cleanUsername.toLowerCase() === 'admin') {
            this.addYards(grantAmount, `Admin Grant: ${reason}`);
            return {
                success: true,
                message: `Successfully granted +${grantAmount} Yards to @${cleanUsername}!`,
                targetYards: this.data.yards
            };
        }

        // 3. Search target user in Supabase by username
        if (supabase) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .ilike('username', cleanUsername)
                    .single();

                if (profile && profile.id) {
                    // Update user_yards
                    const { data: targetYardRec } = await supabase
                        .from('user_yards')
                        .select('yards')
                        .eq('user_id', profile.id)
                        .single();

                    const currentTargetYards = targetYardRec?.yards ?? 0;
                    const newTargetYards = currentTargetYards + grantAmount;

                    await supabase.from('user_yards').upsert({
                        user_id: profile.id,
                        yards: newTargetYards,
                        updated_at: new Date().toISOString()
                    });

                    return {
                        success: true,
                        message: `Successfully granted +${grantAmount} Yards to @${profile.username} (New balance: ${newTargetYards} Y)!`,
                        targetYards: newTargetYards
                    };
                }
            } catch (err) {
                console.warn('Cloud username search error:', err);
            }
        }

        // 4. Local storage fallback search
        const userSpecificKey = `${STORAGE_PREFIX}username_${cleanUsername.toLowerCase()}`;
        let rawTarget = localStorage.getItem(userSpecificKey);
        let targetData = rawTarget ? JSON.parse(rawTarget) : { yards: 0 };
        targetData.yards = (targetData.yards || 0) + grantAmount;
        localStorage.setItem(userSpecificKey, JSON.stringify(targetData));

        return {
            success: true,
            message: `Successfully granted +${grantAmount} Yards to @${cleanUsername}!`,
            targetYards: targetData.yards
        };
    }

    public getAdminYardLogs(): AdminYardLog[] {
        try {
            const raw = localStorage.getItem(ADMIN_LOGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    // --- User Created Games Management ---
    public async submitGameForReview(game: Omit<CreatedGame, 'id' | 'status' | 'plays' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; message: string; gameId: string }> {
        const gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const fullGame: CreatedGame = {
            ...game,
            id: gameId,
            status: 'pending_review',
            plays: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Save locally: clear any previous changes_requested records for this title/creator
        let games = this.getLocalCreatedGames();
        games = games.filter(g => !(g.creatorUsername.toLowerCase() === game.creatorUsername.toLowerCase() && (g.title.toLowerCase() === game.title.toLowerCase() || g.status === 'changes_requested')));
        games.unshift(fullGame);
        localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));

        // Save to Supabase
        if (supabase) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                // Archive or update older changes_requested for this creator
                await supabase
                    .from('user_created_games')
                    .update({ status: 'archived' })
                    .ilike('creator_username', game.creatorUsername)
                    .eq('status', 'changes_requested');

                await supabase.from('user_created_games').insert({
                    id: gameId,
                    user_id: session?.user?.id ?? null,
                    creator_username: game.creatorUsername,
                    title: game.title,
                    description: game.description,
                    category: game.category,
                    scene_data: game.sceneData,
                    status: 'pending_review'
                });
            } catch (err) {
                console.warn('Could not sync created game to cloud:', err);
            }
        }

        window.dispatchEvent(new CustomEvent('playard_games_updated'));

        return {
            success: true,
            message: `Game "${game.title}" submitted for review! Admin✅ will review it soon.`,
            gameId
        };
    }

    public getLocalCreatedGames(): CreatedGame[] {
        try {
            const raw = localStorage.getItem(GAMES_STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    public async getPendingGames(): Promise<CreatedGame[]> {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('user_created_games')
                    .select('*')
                    .eq('status', 'pending_review')
                    .order('created_at', { ascending: false });

                if (!error && Array.isArray(data) && data.length > 0) {
                    return data.map(d => ({
                        id: d.id,
                        userId: d.user_id,
                        creatorUsername: d.creator_username,
                        title: d.title,
                        description: d.description || '',
                        category: d.category || 'Adventure',
                        thumbnail: d.thumbnail,
                        sceneData: d.scene_data,
                        status: d.status,
                        feedback: d.feedback,
                        plays: d.plays || 0,
                        createdAt: new Date(d.created_at).getTime(),
                        updatedAt: new Date(d.updated_at).getTime()
                    }));
                }
            } catch (err) {
                console.warn('Could not fetch pending games from cloud:', err);
            }
        }

        // Fallback to local
        return this.getLocalCreatedGames().filter(g => g.status === 'pending_review');
    }

    public async getApprovedGames(): Promise<CreatedGame[]> {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('user_created_games')
                    .select('*')
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false });

                if (!error && Array.isArray(data) && data.length > 0) {
                    return data.map(d => ({
                        id: d.id,
                        userId: d.user_id,
                        creatorUsername: d.creator_username,
                        title: d.title,
                        description: d.description || '',
                        category: d.category || 'Adventure',
                        thumbnail: d.thumbnail,
                        sceneData: d.scene_data,
                        status: d.status,
                        feedback: d.feedback,
                        plays: d.plays || 0,
                        createdAt: new Date(d.created_at).getTime(),
                        updatedAt: new Date(d.updated_at).getTime()
                    }));
                }
            } catch (err) {
                console.warn('Could not fetch approved games from cloud:', err);
            }
        }

        // Fallback to local
        return this.getLocalCreatedGames().filter(g => g.status === 'approved');
    }

    public async updateGameStatus(
        gameId: string,
        status: 'approved' | 'rejected' | 'changes_requested',
        feedback = ''
    ): Promise<{ success: boolean; message: string }> {
        // 1. Update locally
        const games = this.getLocalCreatedGames();
        const target = games.find(g => g.id === gameId);
        if (target) {
            target.status = status;
            target.feedback = feedback;
            target.updatedAt = Date.now();
            localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));

            // If changes are requested, ensure feedback banner is shown for this game
            if (status === 'changes_requested') {
                try {
                    localStorage.removeItem('playard_hide_admin_feedback');
                    localStorage.removeItem('playard_dismissed_feedback_' + gameId);
                } catch (e) {}
            }

            // If game is rejected or approved, clear any active changes_requested draft
            if (status === 'rejected' || status === 'approved') {
                if (target.creatorUsername) {
                    this.clearDraftGame(target.creatorUsername);
                }
            }
        }

        // 2. Update in Supabase
        if (supabase) {
            try {
                await supabase
                    .from('user_created_games')
                    .update({
                        status,
                        feedback,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', gameId);
            } catch (err) {
                console.warn('Could not update game status in cloud:', err);
            }
        }

        window.dispatchEvent(new CustomEvent('playard_games_updated'));

        return {
            success: true,
            message: `Game status successfully updated to "${status.toUpperCase()}"!`
        };
    }

    // --- Draft Game Auto-Save & Restore ---
    public saveDraftGame(username: string | null, draftData: any) {
        if (!draftData) return;
        try {
            const raw = JSON.stringify(draftData);
            localStorage.setItem('playard_draft_game_global', raw);
            if (username) {
                localStorage.setItem(`playard_draft_game_${username.toLowerCase()}`, raw);
            }
        } catch (e) {
            console.warn('Could not save game draft:', e);
        }
    }

    public getDraftGame(username?: string | null): any | null {
        try {
            if (username) {
                const userDraft = localStorage.getItem(`playard_draft_game_${username.toLowerCase()}`);
                if (userDraft) return JSON.parse(userDraft);
            }
            const globalDraft = localStorage.getItem('playard_draft_game_global');
            if (globalDraft) return JSON.parse(globalDraft);
        } catch (e) {
            console.warn('Could not load game draft:', e);
        }
        return null;
    }

    // --- Saved Games List per User ---
    public getUserSavedGames(username?: string | null): any[] {
        if (!username) {
            try {
                const raw = localStorage.getItem('playard_user_games_global');
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return [];
        }
        try {
            const raw = localStorage.getItem(`playard_user_games_${username.toLowerCase()}`);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    public saveUserGame(username: string | null, gameData: any) {
        if (!gameData) return;
        this.saveDraftGame(username, gameData);

        const list = this.getUserSavedGames(username);
        const gameTitle = gameData.title?.trim() || 'My 3D Game';
        const idx = list.findIndex(g => g.title?.toLowerCase() === gameTitle.toLowerCase() || (gameData.id && g.id === gameData.id));
        const savedEntry = {
            id: gameData.id || 'game_saved_' + Date.now(),
            title: gameTitle,
            category: gameData.category || 'Adventure',
            description: gameData.description || '',
            objects: gameData.objects || [],
            objectCount: gameData.objects?.length || 0,
            updatedAt: Date.now()
        };

        if (idx >= 0) {
            list[idx] = savedEntry;
        } else {
            list.unshift(savedEntry);
        }

        try {
            const raw = JSON.stringify(list);
            localStorage.setItem('playard_user_games_global', raw);
            if (username) {
                localStorage.setItem(`playard_user_games_${username.toLowerCase()}`, raw);
            }
        } catch (e) {
            console.warn(e);
        }
    }

    public deleteUserSavedGame(username: string | null, gameId: string) {
        let list = this.getUserSavedGames(username);
        list = list.filter(g => g.id !== gameId);
        try {
            const raw = JSON.stringify(list);
            localStorage.setItem('playard_user_games_global', raw);
            if (username) {
                localStorage.setItem(`playard_user_games_${username.toLowerCase()}`, raw);
            }
        } catch (e) {}
    }

    public clearDraftGame(username?: string | null) {
        try {
            localStorage.removeItem('playard_draft_game_global');
            if (username) {
                localStorage.removeItem(`playard_draft_game_${username.toLowerCase()}`);
            }
        } catch (e) {}
    }

    public async getFeedbackGamesForCreator(username: string): Promise<CreatedGame[]> {
        if (!username) return [];
        const cleanUser = username.trim().toLowerCase();

        // 1. Cloud query
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('user_created_games')
                    .select('*')
                    .ilike('creator_username', cleanUser)
                    .eq('status', 'changes_requested')
                    .order('updated_at', { ascending: false });

                if (!error && Array.isArray(data) && data.length > 0) {
                    return data.map(d => ({
                        id: d.id,
                        userId: d.user_id,
                        creatorUsername: d.creator_username,
                        title: d.title,
                        description: d.description || '',
                        category: d.category || 'Adventure',
                        thumbnail: d.thumbnail,
                        sceneData: d.scene_data,
                        status: d.status,
                        feedback: d.feedback,
                        plays: d.plays || 0,
                        createdAt: new Date(d.created_at).getTime(),
                        updatedAt: new Date(d.updated_at).getTime()
                    }));
                }
            } catch (err) {
                console.warn('Could not fetch creator feedback games from cloud:', err);
            }
        }

        // 2. Local fallback
        return this.getLocalCreatedGames().filter(g => 
            g.creatorUsername.toLowerCase() === cleanUser && 
            g.status === 'changes_requested' && 
            !!g.feedback
        );
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

    public async resetAll() {
        this.data = {
            yards: 0,
            streak: 0,
            lastClaimTimestamp: 0,
            inventory: [],
            redeemedCodes: [],
            transactions: []
        };
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('playard_') || key.startsWith('racingSave')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn(e);
        }

        this.saveLocally(this.data);
        await this.saveToCloud();

        if (supabase) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    await supabase.from('user_progress').upsert({
                        user_id: session.user.id,
                        money: 0,
                        selected_level: 1,
                        unlocked_vehicles: ['car_1'],
                        vehicle_upgrades: {},
                        level2_unlocked: false,
                        level3_unlocked: false,
                        yards: 0
                    });
                }
            } catch (err) {
                console.warn(err);
            }
        }
        this.notifyListeners();
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
