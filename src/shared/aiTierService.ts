import { yardService } from './yardService';

export type PlayardAiTier = 'FREE' | 'PRO' | 'PLUS' | 'VIP';

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
    dailyLimit: number; // questions/requests per day
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
        accentColor: '#38bdf8',
        bgGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.1))',
        description: 'Algtase kõigile tasuta katsetamiseks ja lihtsate asjade ehitamiseks.',
        features: [
            'Tavaline AI vestlus & üldistele küsimustele vastamine',
            'Lihtne Playardi abi & mänguideede loomine',
            'Lihtsate objektide & piiratud mängude loomine',
            'Piiratud koodi loomine',
            '20 AI küsimust päevas (lähtestub iga 24h järel)'
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
            '100 AI küsimust päevas'
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
            '500 AI küsimust päevas'
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
            '2 000 AI küsimust päevas'
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

interface StoredTierData {
    tier: PlayardAiTier;
    subscribedAt: number;
    expiresAt: number; // 30 days
}

interface StoredUsageData {
    count: number;
    lastReset: number;
}

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
     * Get daily usage and limit status.
     * Limit strictly resets every 24 hours.
     */
    public getDailyUsage(): { usedToday: number; dailyLimit: number; remaining: number; resetsInMs: number } {
        const tier = this.getTier();
        const limit = AI_TIER_CONFIGS[tier].dailyLimit;
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
     */
    public canMakeRequest(): { allowed: boolean; message?: string; tier: PlayardAiTier; usedToday: number; dailyLimit: number } {
        const tier = this.getTier();
        const usage = this.getDailyUsage();

        if (usage.usedToday >= usage.dailyLimit) {
            return {
                allowed: false,
                message: 'Sa oled tänase AI limiidi ära kasutanud. Proovi uuesti pärast limiidi lähtestamist või vali kõrgem AI tase.',
                tier,
                usedToday: usage.usedToday,
                dailyLimit: usage.dailyLimit
            };
        }

        return {
            allowed: true,
            tier,
            usedToday: usage.usedToday,
            dailyLimit: usage.dailyLimit
        };
    }

    /**
     * Consume one AI request from daily quota.
     * AI cannot bypass or change its own limit.
     */
    public recordRequest(): { success: boolean; usedToday: number; dailyLimit: number; remaining: number } {
        const check = this.canMakeRequest();
        if (!check.allowed) {
            return {
                success: false,
                usedToday: check.usedToday,
                dailyLimit: check.dailyLimit,
                remaining: 0
            };
        }

        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        let usage: StoredUsageData = { count: 0, lastReset: now };

        try {
            const raw = localStorage.getItem(STORAGE_KEY_USAGE);
            if (raw) {
                usage = JSON.parse(raw);
            }
        } catch (e) {}

        if (now - usage.lastReset >= ONE_DAY_MS) {
            usage.count = 0;
            usage.lastReset = now;
        }

        usage.count += 1;
        localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usage));
        this.notify();

        const limit = AI_TIER_CONFIGS[this.getTier()].dailyLimit;
        return {
            success: true,
            usedToday: usage.count,
            dailyLimit: limit,
            remaining: Math.max(0, limit - usage.count)
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
        return {
            success: true,
            message: `🎉 Palju õnne! Oled nüüd Playard AI ${targetConfig.name} (${targetConfig.badge}) kasutaja! Päevane limiit: ${targetConfig.dailyLimit} küsimust.`,
            newTier: targetTier
        };
    }

    /**
     * Helper for tests or debug to simulate questions count
     */
    public simulateUsage(count: number): void {
        const usage: StoredUsageData = {
            count,
            lastReset: Date.now()
        };
        localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usage));
        this.notify();
    }

    /**
     * Reset daily usage counter
     */
    public resetDailyUsage(): void {
        const usage: StoredUsageData = {
            count: 0,
            lastReset: Date.now()
        };
        localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usage));
        this.notify();
    }
}

export const aiTierService = AiTierService.getInstance();
(window as any).aiTierService = aiTierService;
