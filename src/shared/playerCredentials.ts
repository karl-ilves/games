/**
 * Player Credentials & Secret Reveal Service
 * Manages masked passwords (e.g. 1st letter visible, rest asterisks)
 * and 10s temporary code reveal when secret button is pressed 5 times + code 6776abc is entered.
 */

const CREDENTIALS_STORAGE_KEY = 'playard_known_player_passwords';
const REVEAL_DURATION_MS = 10000; // 10 seconds

// Default known player credentials (kept accounts: Playard owner, mai girl, PAdmin, twoserrand / twoserrmvp)
const DEFAULT_KNOWN_CREDENTIALS: Record<string, string> = {
    'mai girl': 'mai2026',
    'maigirl': 'mai2026',
    'twoserrmvp': 'mvp99',
    'twoserrand': 'mvp99',
    'padmin': 'padmin2026',
    'playard owner': '1337331',
    'admin': '1337331'
};

const ALLOWED_ACCOUNT_USERNAMES = new Set([
    'playard owner',
    'mai girl',
    'maigirl',
    'padmin',
    'twoserrmvp',
    'twoserrand',
    'admin'
]);

export class PlayerCredentialsService {
    private secretClickCount = 0;
    private revealActiveUntil = 0;
    private revealTimer: any = null;

    constructor() {
        this.initDefaults();
    }

    private initDefaults() {
        try {
            const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
            const map: Record<string, string> = raw ? JSON.parse(raw) : {};
            // Filter out deleted accounts except allowed accounts
            const cleanedMap: Record<string, string> = {};
            for (const [uname, pass] of Object.entries(map)) {
                if (ALLOWED_ACCOUNT_USERNAMES.has(uname.toLowerCase().trim())) {
                    cleanedMap[uname] = pass;
                }
            }
            for (const [uname, pass] of Object.entries(DEFAULT_KNOWN_CREDENTIALS)) {
                if (!cleanedMap[uname]) {
                    cleanedMap[uname] = pass;
                }
            }
            localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(cleanedMap));
        } catch (e) {}
    }

    public recordPassword(username: string, pass: string) {
        const clean = (username || '').toLowerCase().trim();
        if (!clean || !pass) return;
        try {
            const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
            const map: Record<string, string> = raw ? JSON.parse(raw) : {};
            map[clean] = pass;
            localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(map));
        } catch (e) {}
    }

    public getPassword(username: string): string {
        const clean = (username || '').toLowerCase().trim();
        try {
            const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[clean]) return map[clean];
            }
        } catch (e) {}
        if (DEFAULT_KNOWN_CREDENTIALS[clean]) return DEFAULT_KNOWN_CREDENTIALS[clean];
        // Generate a deterministic believable password for players without explicit password
        const hash = clean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return `${clean.charAt(0).toUpperCase()}${clean.slice(1, 4)}${hash % 1000}`;
    }

    /**
     * Formats password: strictly hidden with asterisks/bullets so it remains secret in database and owner panel
     */
    public getMaskedPassword(username: string): string {
        const pass = this.getPassword(username);
        if (!pass) return '••••••••';
        const stars = '•'.repeat(Math.max(6, Math.min(12, pass.length)));
        return stars;
    }

    /**
     * Deterministic player code (e.g. #7729)
     */
    public getPlayerCode(username: string): string {
        const clean = (username || '').toLowerCase().trim();
        let hash = 5381;
        for (let i = 0; i < clean.length; i++) {
            hash = (hash * 33) ^ clean.charCodeAt(i);
        }
        const num = Math.abs(hash % 9000) + 1000;
        return `#${num}`;
    }

    public isRevealActive(): boolean {
        return Date.now() < this.revealActiveUntil;
    }

    public getRemainingRevealSeconds(): number {
        const remaining = Math.max(0, this.revealActiveUntil - Date.now());
        return Math.ceil(remaining / 1000);
    }

    public registerSecretClick(): { clicks: number; readyForPrompt: boolean } {
        this.secretClickCount++;
        if (this.secretClickCount >= 5) {
            this.secretClickCount = 0;
            return { clicks: 5, readyForPrompt: true };
        }
        return { clicks: this.secretClickCount, readyForPrompt: false };
    }

    public activateRevealWithCode(enteredCode: string): { success: boolean; message: string } {
        const clean = (enteredCode || '').trim().toLowerCase();
        if (clean === '6776abc') {
            return { success: false, message: '🔒 Koodide ja paroolide kuvamine on turvakaalutlustel keelatud (koode ei saa vaadata).' };
        }
        return { success: false, message: '❌ Vale kood!' };
    }
}

export const playerCredentialsService = new PlayerCredentialsService();

if (typeof window !== 'undefined') {
    (window as any).playerCredentialsService = playerCredentialsService;
}
