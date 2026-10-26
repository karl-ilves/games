import { yardService } from './yardService';

export type PlayardAiTier = 'FREE' | 'PRO' | 'PLUS' | 'VIP';

export type PlayardAiModelId = 'playard_game_ai_1_1' | 'play_ai_2';

export interface PlayardAiModelConfig {
    id: PlayardAiModelId;
    name: string;
    subtitle: string;
    description: string;
    icon: string;
    badge: string;
    vipOnly: boolean;
    has5hLimit: boolean;
    has5dLimit: boolean;
    pct5dPerQuery?: number; // For PlayAi 2: 2.5%
}

export const PLAYARD_AI_MODELS: Record<PlayardAiModelId, PlayardAiModelConfig> = {
    playard_game_ai_1_1: {
        id: 'playard_game_ai_1_1',
        name: 'Playard game ai 1.1',
        subtitle: '⚡ Välkkiire 3D mängulooja & koodimootor',
        description: 'Optimeeritud mudel Playard 3D maailmade ehitamiseks, skriptimiseks, füüsika arvutamiseks ja semantiliseks sünteesiks.',
        icon: '🤖',
        badge: 'Universaalne',
        vipOnly: false,
        has5hLimit: true,
        has5dLimit: true
    },
    play_ai_2: {
        id: 'play_ai_2',
        name: 'PlayAi 2',
        subtitle: '👑 Eksklusiivne VIP tehisintellekt',
        description: 'VIP tellijatele loodud võimas tehisintellekt. Sama nutikas ja võimekas kui Playard game ai 1.1, spetsiaalse 5 päeva limiidiga.',
        icon: '💎',
        badge: '👑 VIP AINULT',
        vipOnly: true,
        has5hLimit: false,
        has5dLimit: true,
        pct5dPerQuery: 2.5
    }
};

export interface AiTierCapabilities {
    maxObjectsPerGen: number;
    maxNpcs: number;
    maxMapRadius: number;
    canAutoTest: boolean;
    canAutoFindBugs: boolean;
    canAutoFixBugs: boolean;
    advanced3D: boolean;
    advancedNpc: boolean;
    advancedAnimations: boolean;
    multiStepExecution: boolean;
    singlePromptMassiveBuild: boolean;
    fastestAi: boolean;
}

export interface AiTierConfig {
    id: PlayardAiTier;
    name: string;
    badge: string;
    icon: string;
    pricePbx: number; // PBX per month
    dailyLimit: number; // questions/requests per day (legacy compatibility)
    questionLevel: string; // "Vähe küsimusi", "Rohkem küsimusi", "Palju küsimusi", "Väga palju küsimusi"
    pct5hPerQuery: number; // % reduction in 5-hour limit per query (e.g. 5, 2, 1, 0.5)
    pct5dPerQuery: number; // % reduction in 5-day limit per query (e.g. 1, 0.5, 0.2, 0.1)
    accentColor: string;
    bgGradient: string;
    description: string;
    features: string[];
    capabilities: AiTierCapabilities;
}

export const AI_TIER_CONFIGS: Record<PlayardAiTier, AiTierConfig> = {
    FREE: {
        id: 'FREE',
        name: 'Free',
        badge: '🆓 FREE',
        icon: '🆓',
        pricePbx: 0,
        dailyLimit: 20,
        questionLevel: 'Vähe küsimusi',
        pct5hPerQuery: 5, // 5h limiit väheneb 5% iga küsimuse korral
        pct5dPerQuery: 1, // 5 päeva limiit väheneb 1% iga küsimuse korral
        accentColor: '#38bdf8',
        bgGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.1))',
        description: 'Algtase kõigile tasuta katsetamiseks ja lihtsate asjade ehitamiseks.',
        features: [
            'Tavaline AI vestlus & üldistele küsimustele vastamine',
            'Lihtne Playardi abi & mänguideede loomine',
            'Lihtsate objektide & piiratud mängude loomine',
            'Piiratud koodi loomine',
            '5h limiit: -5% küsimus • 5 päeva limiit: -1% küsimus'
        ],
        capabilities: {
            maxObjectsPerGen: 15,
            maxNpcs: 3,
            maxMapRadius: 60,
            canAutoTest: false,
            canAutoFindBugs: false,
            canAutoFixBugs: false,
            advanced3D: false,
            advancedNpc: false,
            advancedAnimations: false,
            multiStepExecution: false,
            singlePromptMassiveBuild: false,
            fastestAi: false
        }
    },
    PRO: {
        id: 'PRO',
        name: 'Pro',
        badge: '⚡ PRO',
        icon: '⚡',
        pricePbx: 100,
        dailyLimit: 100,
        questionLevel: 'Rohkem küsimusi',
        pct5hPerQuery: 2, // 5h limiit väheneb 2% iga küsimuse kohta
        pct5dPerQuery: 0.5, // 5 päeva limiit väheneb 0.5% iga küsimuse kohta
        accentColor: '#a855f7',
        bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(147, 51, 234, 0.15))',
        description: 'Tõsisele mänguloojale – suuremad kaardid, rohkem objekte ja kiirem AI.',
        features: [
            'Kõik Free taseme võimalused',
            'Suuremate mängude loomine & rohkem objekte ja NPC-sid',
            'Rohkem skripte & parem projektimälu',
            'Keerukamate mängusüsteemide loomine',
            'Koodi automaatne parandamine',
            'Suuremad kaardid & kiirem AI',
            '5h limiit: -2% küsimus • 5 päeva limiit: -0.5% küsimus'
        ],
        capabilities: {
            maxObjectsPerGen: 50,
            maxNpcs: 15,
            maxMapRadius: 150,
            canAutoTest: false,
            canAutoFindBugs: true,
            canAutoFixBugs: true,
            advanced3D: true,
            advancedNpc: true,
            advancedAnimations: false,
            multiStepExecution: false,
            singlePromptMassiveBuild: false,
            fastestAi: false
        }
    },
    PLUS: {
        id: 'PLUS',
        name: 'Plus',
        badge: '🌟 PLUS',
        icon: '🌟',
        pricePbx: 300,
        dailyLimit: 500,
        questionLevel: 'Palju küsimusi',
        pct5hPerQuery: 1, // 5h limiit 1% iga küsimuse kohta
        pct5dPerQuery: 0.2, // 5 päeva 0.2%
        accentColor: '#eab308',
        bgGradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(202, 138, 4, 0.15))',
        description: 'Professionaalne tase – automaatne testimine, vigade parandus ja väga suured kaardid.',
        features: [
            'Kõik Pro taseme võimalused',
            'Suurte mängude loomine & väga suured kaardid',
            'Automaatne mängu testimine & vigade leidmine',
            'Automaatne vigade parandamine',
            'Täiustatud 3D objektide ja NPC-de loomine',
            'Pikem projektimälu & mitmeastmeliste ülesannete automaatne täitmine',
            '5h limiit: -1% küsimus • 5 päeva limiit: -0.2% küsimus'
        ],
        capabilities: {
            maxObjectsPerGen: 150,
            maxNpcs: 40,
            maxMapRadius: 280,
            canAutoTest: true,
            canAutoFindBugs: true,
            canAutoFixBugs: true,
            advanced3D: true,
            advancedNpc: true,
            advancedAnimations: true,
            multiStepExecution: true,
            singlePromptMassiveBuild: false,
            fastestAi: true
        }
    },
    VIP: {
        id: 'VIP',
        name: 'VIP',
        badge: '👑 VIP',
        icon: '👑',
        pricePbx: 750,
        dailyLimit: 2000,
        questionLevel: 'Väga palju küsimusi',
        pct5hPerQuery: 0.5, // 5h 0.5%
        pct5dPerQuery: 0.1, // 5 päeva 0.1%
        accentColor: '#f43f5e',
        bgGradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.3), rgba(225, 29, 72, 0.2))',
        description: 'Kõrgeim tase – massiivsed projektid, ülikiire AI ja terve mängu ehitamine üheainsa käsuga!',
        features: [
            'Kõik Plus taseme võimalused',
            'Kõige suuremad projektid & maksimaalne projektimälu',
            'Kõige kiirem AI & kõige keerukamate mängude loomine',
            'Täiustatud Game Creator & hiiglaslikud kaardid',
            'Keerukad mängumehaanikad & täiustatud animatsioonid',
            'Väga pikkade ülesannete automaatne täitmine',
            'Võimalus ehitada suur osa mängust ühe käsu põhjal',
            '5h limiit: -0.5% küsimus • 5 päeva limiit: -0.1% küsimus'
        ],
        capabilities: {
            maxObjectsPerGen: 600,
            maxNpcs: 120,
            maxMapRadius: 500,
            canAutoTest: true,
            canAutoFindBugs: true,
            canAutoFixBugs: true,
            advanced3D: true,
            advancedNpc: true,
            advancedAnimations: true,
            multiStepExecution: true,
            singlePromptMassiveBuild: true,
            fastestAi: true
        }
    }
};

const STORAGE_KEY_TIER = 'playard_ai_tier_subscription';
const STORAGE_KEY_USAGE = 'playard_ai_daily_usage';
const STORAGE_KEY_LIMITS = 'playard_ai_dual_limits';
const STORAGE_KEY_MODEL = 'playard_ai_selected_model';
const STORAGE_KEY_PLAYAI2_LIMITS = 'playard_ai_playai2_limits';

interface StoredTierData {
    tier: PlayardAiTier;
    subscribedAt: number;
    expiresAt: number; // 30 days
}

interface StoredUsageData {
    count: number;
    lastReset: number;
}

export interface StoredDualLimitsData {
    fiveHourUsedPct: number;
    fiveHourResetTime: number;
    fiveDayUsedPct: number;
    fiveDayResetTime: number;
}

export interface StoredPlayAi2LimitsData {
    fiveDayUsedPct: number;
    fiveDayResetTime: number;
}

export interface DualLimitsStatus {
    fiveHourRemainingPct: number;
    fiveHourUsedPct: number;
    fiveHourResetsInMs: number;
    fiveDayRemainingPct: number;
    fiveDayUsedPct: number;
    fiveDayResetsInMs: number;
    canRequest: boolean;
    blockedReason?: '5h' | '5p';
}

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export class AiTierService {
    private static instance: AiTierService;
    private subscribers: Array<() => void> = [];

    private constructor() {}

    public static getInstance(): AiTierService {
        if (!AiTierService.instance) {
            AiTierService.instance = new AiTierService();
        }
        return AiTierService.instance;
    }

    public subscribe(cb: () => void) {
        this.subscribers.push(cb);
    }

    private notify() {
        this.subscribers.forEach(cb => {
            try { cb(); } catch (e) { console.error('AiTier subscriber error:', e); }
        });
    }

    /**
     * Get active selected AI model
     */
    public getSelectedModel(): PlayardAiModelId {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_MODEL);
            if (raw === 'play_ai_2') {
                return 'play_ai_2';
            }
        } catch (e) {}
        return 'playard_game_ai_1_1';
    }

    /**
     * Set selected AI model.
     * PlayAi 2 can only be selected by VIP subscribers.
     * If free, pro, or plus user tries to select it, returns error: "you tont own vip"
     */
    public setSelectedModel(modelId: PlayardAiModelId): { success: boolean; message?: string } {
        if (modelId === 'play_ai_2') {
            const currentTier = this.getTier();
            if (currentTier !== 'VIP') {
                return {
                    success: false,
                    message: 'you tont own vip'
                };
            }
        }
        localStorage.setItem(STORAGE_KEY_MODEL, modelId);
        this.notify();
        return { success: true };
    }

    /**
     * Get limit status for PlayAi 2 (ONLY 5 päeva limit, 2.5% per question)
     */
    public getPlayAi2Limits(): { fiveDayRemainingPct: number; fiveDayUsedPct: number; fiveDayResetsInMs: number; canRequest: boolean } {
        const now = Date.now();
        let data: StoredPlayAi2LimitsData = {
            fiveDayUsedPct: 0,
            fiveDayResetTime: now + FIVE_DAYS_MS
        };

        try {
            const raw = localStorage.getItem(STORAGE_KEY_PLAYAI2_LIMITS);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.fiveDayUsedPct === 'number') data.fiveDayUsedPct = parsed.fiveDayUsedPct;
                if (typeof parsed.fiveDayResetTime === 'number') data.fiveDayResetTime = parsed.fiveDayResetTime;
            }
        } catch (e) {}

        if (now >= data.fiveDayResetTime) {
            data.fiveDayUsedPct = 0;
            data.fiveDayResetTime = now + FIVE_DAYS_MS;
            localStorage.setItem(STORAGE_KEY_PLAYAI2_LIMITS, JSON.stringify(data));
        }

        const fiveDayRemainingPct = Math.max(0, Math.round((100 - data.fiveDayUsedPct) * 10) / 10);
        const fiveDayResetsInMs = Math.max(0, data.fiveDayResetTime - now);

        return {
            fiveDayRemainingPct,
            fiveDayUsedPct: Math.min(100, Math.round(data.fiveDayUsedPct * 10) / 10),
            fiveDayResetsInMs,
            canRequest: fiveDayRemainingPct > 0
        };
    }

    /**
     * Get user active AI subscription tier.
     * Automatically handles 30-day expiration check and fallback to FREE.
     */
    public getTier(): PlayardAiTier {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_TIER);
            if (raw) {
                const data: StoredTierData = JSON.parse(raw);
                if (data.tier && data.tier !== 'FREE') {
                    if (Date.now() > data.expiresAt) {
                        this.setTier('FREE');
                        return 'FREE';
                    }
                    return data.tier;
                }
            }
        } catch (e) {}
        return 'FREE';
    }

    /**
     * Set subscription tier
     */
    public setTier(tier: PlayardAiTier): void {
        const data: StoredTierData = {
            tier,
            subscribedAt: Date.now(),
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
        };
        localStorage.setItem(STORAGE_KEY_TIER, JSON.stringify(data));
        this.notify();
    }

    /**
     * Get config for active tier
     */
    public getActiveConfig(): AiTierConfig {
        return AI_TIER_CONFIGS[this.getTier()];
    }

    /**
     * Get 5h and 5 päeva limit percentages and reset status.
     * 5h window resets after 5 hours, 5 päeva window resets after 5 days.
     */
    public getLimits(): DualLimitsStatus {
        const now = Date.now();
        let data: StoredDualLimitsData = {
            fiveHourUsedPct: 0,
            fiveHourResetTime: now + FIVE_HOURS_MS,
            fiveDayUsedPct: 0,
            fiveDayResetTime: now + FIVE_DAYS_MS
        };

        try {
            const raw = localStorage.getItem(STORAGE_KEY_LIMITS);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.fiveHourUsedPct === 'number') data.fiveHourUsedPct = parsed.fiveHourUsedPct;
                if (typeof parsed.fiveHourResetTime === 'number') data.fiveHourResetTime = parsed.fiveHourResetTime;
                if (typeof parsed.fiveDayUsedPct === 'number') data.fiveDayUsedPct = parsed.fiveDayUsedPct;
                if (typeof parsed.fiveDayResetTime === 'number') data.fiveDayResetTime = parsed.fiveDayResetTime;
            }
        } catch (e) {}

        let modified = false;
        // Check 5 hour expiration
        if (now >= data.fiveHourResetTime) {
            data.fiveHourUsedPct = 0;
            data.fiveHourResetTime = now + FIVE_HOURS_MS;
            modified = true;
        }

        // Check 5 day expiration
        if (now >= data.fiveDayResetTime) {
            data.fiveDayUsedPct = 0;
            data.fiveDayResetTime = now + FIVE_DAYS_MS;
            modified = true;
        }

        if (modified) {
            localStorage.setItem(STORAGE_KEY_LIMITS, JSON.stringify(data));
        }

        const fiveHourRemainingPct = Math.max(0, Math.round((100 - data.fiveHourUsedPct) * 10) / 10);
        const fiveDayRemainingPct = Math.max(0, Math.round((100 - data.fiveDayUsedPct) * 10) / 10);
        const fiveHourResetsInMs = Math.max(0, data.fiveHourResetTime - now);
        const fiveDayResetsInMs = Math.max(0, data.fiveDayResetTime - now);

        let blockedReason: '5h' | '5p' | undefined;
        if (fiveHourRemainingPct <= 0) {
            blockedReason = '5h';
        } else if (fiveDayRemainingPct <= 0) {
            blockedReason = '5p';
        }

        return {
            fiveHourRemainingPct,
            fiveHourUsedPct: Math.min(100, Math.round(data.fiveHourUsedPct * 10) / 10),
            fiveHourResetsInMs,
            fiveDayRemainingPct,
            fiveDayUsedPct: Math.min(100, Math.round(data.fiveDayUsedPct * 10) / 10),
            fiveDayResetsInMs,
            canRequest: !blockedReason,
            blockedReason
        };
    }

    /**
     * Get daily usage and limit status.
     * Limit strictly resets every 24 hours.
     * Also maintained for backwards compatibility with legacy tests.
     */
    public getDailyUsage(): { usedToday: number; dailyLimit: number; remaining: number; resetsInMs: number } {
        const tier = this.getTier();
        const cfg = AI_TIER_CONFIGS[tier];
        const limit = cfg.dailyLimit;
        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        let usage: StoredUsageData = { count: 0, lastReset: now };
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USAGE);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.count === 'number' && typeof parsed.lastReset === 'number') {
                    usage = parsed;
                }
            }
        } catch (e) {}

        // Reset if 24 hours passed
        if (now - usage.lastReset >= ONE_DAY_MS) {
            usage.count = 0;
            usage.lastReset = now;
            localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usage));
        }

        const remaining = Math.max(0, limit - usage.count);
        const resetsInMs = Math.max(0, ONE_DAY_MS - (now - usage.lastReset));

        return {
            usedToday: usage.count,
            dailyLimit: limit,
            remaining,
            resetsInMs
        };
    }

    /**
     * Check if user is allowed to make an AI question/request.
     * Enforces both 5h limit and 5 päeva limit for Playard game ai 1.1.
     * For PlayAi 2: VIP only, requires "you tont own vip" error if not VIP, and enforces 5-day limit only.
     */
    public canMakeRequest(): { allowed: boolean; message?: string; tier: PlayardAiTier; usedToday: number; dailyLimit: number; limits: DualLimitsStatus; selectedModel: PlayardAiModelId; playAi2Limits?: { fiveDayRemainingPct: number; fiveDayUsedPct: number; fiveDayResetsInMs: number } } {
        const tier = this.getTier();
        const selectedModel = this.getSelectedModel();
        const usage = this.getDailyUsage();
        const limits = this.getLimits();

        if (selectedModel === 'play_ai_2') {
            if (tier !== 'VIP') {
                return {
                    allowed: false,
                    message: 'you tont own vip',
                    tier,
                    usedToday: usage.usedToday,
                    dailyLimit: usage.dailyLimit,
                    limits,
                    selectedModel
                };
            }

            const playAi2Limits = this.getPlayAi2Limits();
            if (!playAi2Limits.canRequest) {
                const hours = Math.ceil(playAi2Limits.fiveDayResetsInMs / (3600 * 1000));
                return {
                    allowed: false,
                    message: `Sa oled PlayAi 2 5 päeva limiidi ära kasutanud (0% alles). Uus limiit vabaneb ${hours} tunni pärast.`,
                    tier,
                    usedToday: usage.usedToday,
                    dailyLimit: usage.dailyLimit,
                    limits,
                    selectedModel,
                    playAi2Limits
                };
            }

            return {
                allowed: true,
                tier,
                usedToday: usage.usedToday,
                dailyLimit: usage.dailyLimit,
                limits,
                selectedModel,
                playAi2Limits
            };
        }

        if (!limits.canRequest || usage.usedToday >= usage.dailyLimit) {
            let detail = 'Sa oled AI limiidi ära kasutanud.';
            if (limits.blockedReason === '5h') {
                const mins = Math.ceil(limits.fiveHourResetsInMs / (60 * 1000));
                detail = `Sa oled 5 tunni AI limiidi ära kasutanud (0% alles). Uus limiit vabaneb ${mins} minuti pärast.`;
            } else if (limits.blockedReason === '5p') {
                const hours = Math.ceil(limits.fiveDayResetsInMs / (3600 * 1000));
                detail = `Sa oled 5 päeva AI limiidi ära kasutanud (0% alles). Uus limiit vabaneb ${hours} tunni pärast.`;
            }

            return {
                allowed: false,
                message: `Sa oled tänase AI limiidi ära kasutanud. ${detail} Proovi uuesti pärast limiidi lähtestamist või vali kõrgem AI tase.`,
                tier,
                usedToday: usage.usedToday,
                dailyLimit: usage.dailyLimit,
                limits,
                selectedModel
            };
        }

        return {
            allowed: true,
            tier,
            usedToday: usage.usedToday,
            dailyLimit: usage.dailyLimit,
            limits,
            selectedModel
        };
    }

    /**
     * Consume one AI request from quotas based on active model.
     * For Playard game ai 1.1: reduces 5h and 5 päeva limits by tier percentages.
     * For PlayAi 2: reduces ONLY 5 päeva limit by 2.5%.
     */
    public recordRequest(): { success: boolean; usedToday: number; dailyLimit: number; remaining: number; limits: DualLimitsStatus; selectedModel: PlayardAiModelId; playAi2Limits?: { fiveDayRemainingPct: number; fiveDayUsedPct: number; fiveDayResetsInMs: number } } {
        const check = this.canMakeRequest();
        if (!check.allowed) {
            return {
                success: false,
                usedToday: check.usedToday,
                dailyLimit: check.dailyLimit,
                remaining: 0,
                limits: check.limits,
                selectedModel: check.selectedModel,
                playAi2Limits: check.playAi2Limits
            };
        }

        const now = Date.now();
        const tier = this.getTier();
        const selectedModel = this.getSelectedModel();

        if (selectedModel === 'play_ai_2') {
            let p2Data: StoredPlayAi2LimitsData = {
                fiveDayUsedPct: 0,
                fiveDayResetTime: now + FIVE_DAYS_MS
            };
            try {
                const raw = localStorage.getItem(STORAGE_KEY_PLAYAI2_LIMITS);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed.fiveDayUsedPct === 'number') p2Data.fiveDayUsedPct = parsed.fiveDayUsedPct;
                    if (typeof parsed.fiveDayResetTime === 'number') p2Data.fiveDayResetTime = parsed.fiveDayResetTime;
                }
            } catch (e) {}

            if (now >= p2Data.fiveDayResetTime) {
                p2Data.fiveDayUsedPct = 0;
                p2Data.fiveDayResetTime = now + FIVE_DAYS_MS;
            }

            p2Data.fiveDayUsedPct = Math.min(100, p2Data.fiveDayUsedPct + 2.5); // 2.5% per question
            localStorage.setItem(STORAGE_KEY_PLAYAI2_LIMITS, JSON.stringify(p2Data));
            this.notify();

            const p2Limits = this.getPlayAi2Limits();
            return {
                success: true,
                usedToday: check.usedToday,
                dailyLimit: check.dailyLimit,
                remaining: Math.round(p2Limits.fiveDayRemainingPct / 2.5),
                limits: check.limits,
                selectedModel: 'play_ai_2',
                playAi2Limits: p2Limits
            };
        }

        const cfg = AI_TIER_CONFIGS[tier];

        // 1. Update legacy usage count
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        let usage: StoredUsageData = { count: 0, lastReset: now };
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USAGE);
            if (raw) usage = JSON.parse(raw);
        } catch (e) {}

        if (now - usage.lastReset >= ONE_DAY_MS) {
            usage.count = 0;
            usage.lastReset = now;
        }
        usage.count += 1;
        localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usage));

        // 2. Update dual limits (5h and 5 days)
        let limitsData: StoredDualLimitsData = {
            fiveHourUsedPct: 0,
            fiveHourResetTime: now + FIVE_HOURS_MS,
            fiveDayUsedPct: 0,
            fiveDayResetTime: now + FIVE_DAYS_MS
        };
        try {
            const rawLimits = localStorage.getItem(STORAGE_KEY_LIMITS);
            if (rawLimits) {
                const parsed = JSON.parse(rawLimits);
                if (typeof parsed.fiveHourUsedPct === 'number') limitsData.fiveHourUsedPct = parsed.fiveHourUsedPct;
                if (typeof parsed.fiveHourResetTime === 'number') limitsData.fiveHourResetTime = parsed.fiveHourResetTime;
                if (typeof parsed.fiveDayUsedPct === 'number') limitsData.fiveDayUsedPct = parsed.fiveDayUsedPct;
                if (typeof parsed.fiveDayResetTime === 'number') limitsData.fiveDayResetTime = parsed.fiveDayResetTime;
            }
        } catch (e) {}

        if (now >= limitsData.fiveHourResetTime) {
            limitsData.fiveHourUsedPct = 0;
            limitsData.fiveHourResetTime = now + FIVE_HOURS_MS;
        }
        if (now >= limitsData.fiveDayResetTime) {
            limitsData.fiveDayUsedPct = 0;
            limitsData.fiveDayResetTime = now + FIVE_DAYS_MS;
        }

        limitsData.fiveHourUsedPct = Math.min(100, limitsData.fiveHourUsedPct + cfg.pct5hPerQuery);
        limitsData.fiveDayUsedPct = Math.min(100, limitsData.fiveDayUsedPct + cfg.pct5dPerQuery);
        localStorage.setItem(STORAGE_KEY_LIMITS, JSON.stringify(limitsData));

        this.notify();

        const currentLimits = this.getLimits();
        return {
            success: true,
            usedToday: usage.count,
            dailyLimit: cfg.dailyLimit,
            remaining: Math.max(0, cfg.dailyLimit - usage.count),
            limits: currentLimits,
            selectedModel: 'playard_game_ai_1_1'
        };
    }

    /**
     * Subscribe or upgrade to a higher tier using PBX (PlayBux).
     */
    public upgradeToTier(targetTier: PlayardAiTier): { success: boolean; message: string; newTier: PlayardAiTier } {
        const currentTier = this.getTier();
        if (targetTier === currentTier) {
            return {
                success: false,
                message: `Sul on juba aktiivne ${targetTier} tase!`,
                newTier: currentTier
            };
        }

        const targetConfig = AI_TIER_CONFIGS[targetTier];
        const costPbx = targetConfig.pricePbx;

        if (costPbx > 0) {
            const userPbx = yardService.getPlaybux();
            if (userPbx < costPbx) {
                return {
                    success: false,
                    message: `Sul ei ole piisavalt PlayBuxe (PBX)! Vaja on ${costPbx} PBX, sul on ${userPbx} PBX.`,
                    newTier: currentTier
                };
            }

            const spendOk = yardService.spendPlaybux(costPbx, `ai_tier_${targetTier.toLowerCase()}`, `Playard AI ${targetTier} kuutellimus`);
            if (!spendOk) {
                return {
                    success: false,
                    message: 'Tehingu tegemine PlayBuxidega ebaõnnestus.',
                    newTier: currentTier
                };
            }
        }

        this.setTier(targetTier);
        // Reset limits to give new tier full capacity immediately upon upgrade
        this.resetDailyUsage();

        return {
            success: true,
            message: `🎉 Palju õnne! Oled nüüd Playard AI ${targetConfig.name} (${targetConfig.badge}) kasutaja! ${targetConfig.questionLevel}: 5h limiit -${targetConfig.pct5hPerQuery}%, 5 päeva limiit -${targetConfig.pct5dPerQuery}% küsimuse kohta.`,
            newTier: targetTier
        };
    }

    /**
     * Helper for tests or debug to simulate questions count and percentage consumption
     */
    public simulateUsage(count: number, fiveHourUsedPct?: number, fiveDayUsedPct?: number): void {
        const now = Date.now();
        const usage: StoredUsageData = {
            count,
            lastReset: now
        };
        localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usage));

        const tier = this.getTier();
        const cfg = AI_TIER_CONFIGS[tier];
        const limitsData: StoredDualLimitsData = {
            fiveHourUsedPct: typeof fiveHourUsedPct === 'number' ? fiveHourUsedPct : Math.min(100, count * cfg.pct5hPerQuery),
            fiveHourResetTime: now + FIVE_HOURS_MS,
            fiveDayUsedPct: typeof fiveDayUsedPct === 'number' ? fiveDayUsedPct : Math.min(100, count * cfg.pct5dPerQuery),
            fiveDayResetTime: now + FIVE_DAYS_MS
        };
        localStorage.setItem(STORAGE_KEY_LIMITS, JSON.stringify(limitsData));

        this.notify();
    }

    /**
     * Reset PlayAi 2 limit (5 days)
     */
    public resetPlayAi2Usage(): void {
        const now = Date.now();
        const p2Data: StoredPlayAi2LimitsData = {
            fiveDayUsedPct: 0,
            fiveDayResetTime: now + FIVE_DAYS_MS
        };
        localStorage.setItem(STORAGE_KEY_PLAYAI2_LIMITS, JSON.stringify(p2Data));
        this.notify();
    }

    /**
     * Reset daily usage counter, dual limits and PlayAi 2 limits
     */
    public resetDailyUsage(): void {
        const now = Date.now();
        const usage: StoredUsageData = {
            count: 0,
            lastReset: now
        };
        localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usage));

        const limitsData: StoredDualLimitsData = {
            fiveHourUsedPct: 0,
            fiveHourResetTime: now + FIVE_HOURS_MS,
            fiveDayUsedPct: 0,
            fiveDayResetTime: now + FIVE_DAYS_MS
        };
        localStorage.setItem(STORAGE_KEY_LIMITS, JSON.stringify(limitsData));

        const p2Data: StoredPlayAi2LimitsData = {
            fiveDayUsedPct: 0,
            fiveDayResetTime: now + FIVE_DAYS_MS
        };
        localStorage.setItem(STORAGE_KEY_PLAYAI2_LIMITS, JSON.stringify(p2Data));

        this.notify();
    }
}

export const aiTierService = AiTierService.getInstance();
(window as any).aiTierService = aiTierService;

