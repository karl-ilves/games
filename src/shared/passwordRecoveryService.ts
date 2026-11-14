/**
 * Password Recovery & Gmail 6-Digit Code Service
 * Manages "Forgot Password" system setup during account creation,
 * Gmail verification code dispatch, and automatic verification.
 */

export interface RecoveryConfig {
    username: string;
    gmail: string;
    enabled: boolean;
    setupAt: number;
}

const RECOVERY_STORAGE_KEY = 'playard_recovery_configs';
const PENDING_CODES_STORAGE_KEY = 'playard_pending_recovery_codes';

export class PasswordRecoveryService {
    private lastGeneratedCodes: Map<string, { code: string; expiresAt: number; gmail: string }> = new Map();

    constructor() {
        this.loadPendingCodes();
    }

    private loadPendingCodes() {
        try {
            const raw = localStorage.getItem(PENDING_CODES_STORAGE_KEY);
            if (raw) {
                const obj = JSON.parse(raw);
                for (const [k, v] of Object.entries(obj)) {
                    this.lastGeneratedCodes.set(k, v as any);
                }
            }
        } catch (e) {}
    }

    private savePendingCodes() {
        try {
            const obj: Record<string, any> = {};
            this.lastGeneratedCodes.forEach((val, key) => {
                if (Date.now() < val.expiresAt) {
                    obj[key] = val;
                }
            });
            localStorage.setItem(PENDING_CODES_STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {}
    }

    public getRecoveryConfig(username: string): RecoveryConfig | null {
        const clean = (username || '').trim().toLowerCase();
        if (!clean) return null;
        try {
            const raw = localStorage.getItem(RECOVERY_STORAGE_KEY);
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[clean]) {
                    return map[clean];
                }
            }
        } catch (e) {}
        return null;
    }

    public setRecoveryConfig(username: string, gmail: string, enabled: boolean = true) {
        const clean = (username || '').trim().toLowerCase();
        const cleanGmail = (gmail || '').trim().toLowerCase();
        if (!clean) return;

        try {
            const raw = localStorage.getItem(RECOVERY_STORAGE_KEY);
            const map = raw ? JSON.parse(raw) : {};
            map[clean] = {
                username: clean,
                gmail: cleanGmail,
                enabled,
                setupAt: Date.now()
            };
            localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(map));
        } catch (e) {}
    }

    /**
     * Generate a 6-digit numeric code (e.g. 582914)
     */
    public generate6DigitCode(username: string, gmail: string): string {
        const clean = (username || '').trim().toLowerCase();
        // Generate random 6-digit number between 100000 and 999999
        const codeNum = Math.floor(100000 + Math.random() * 900000);
        const code = String(codeNum);

        this.lastGeneratedCodes.set(clean, {
            code,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes valid
            gmail
        });
        this.savePendingCodes();

        // Also store in window for inspection/mocking
        if (typeof window !== 'undefined') {
            (window as any).__lastSentRecoveryCode = { username: clean, code, gmail, timestamp: Date.now() };
        }

        return code;
    }

    public getPendingCode(username: string): { code: string; expiresAt: number; gmail: string } | null {
        const clean = (username || '').trim().toLowerCase();
        const entry = this.lastGeneratedCodes.get(clean);
        if (entry && Date.now() < entry.expiresAt) {
            return entry;
        }
        return null;
    }

    public verifyCode(username: string, enteredCode: string): { success: boolean; message: string } {
        const cleanUser = (username || '').trim().toLowerCase();
        const cleanCode = (enteredCode || '').trim().replace(/\D/g, '');

        if (!cleanCode || cleanCode.length !== 6) {
            return { success: false, message: 'Palun sisesta 6-kohaline numberkood!' };
        }

        const pending = this.getPendingCode(cleanUser);
        if (!pending) {
            return { success: false, message: 'Kood on aegunud või puudub. Palun telli uus kood!' };
        }

        if (pending.code === cleanCode) {
            return { success: true, message: '✅ Kood on õige!' };
        }

        return { success: false, message: '❌ Vale kood! Kontrolli oma Gmailist saadetud 6-kohalist koodi.' };
    }
}

export const passwordRecoveryService = new PasswordRecoveryService();
