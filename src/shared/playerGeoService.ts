/**
 * Player Geo & Location Service
 * Automatically detects player's country and country flag using IP geolocation
 * with fallback to browser timezone/locale.
 */

export interface PlayerGeoInfo {
    country: string;
    countryCode: string;
    flag: string;
    city?: string;
}

const GEO_CACHE_KEY = 'playard_detected_player_geo';
const KNOWN_PLAYERS_GEO_KEY = 'playard_known_players_geo';

// Pre-defined / realistic fallback locations for known community players
const DEFAULT_PLAYER_LOCATIONS: Record<string, PlayerGeoInfo> = {
    'mai girl': { country: 'Estonia', countryCode: 'EE', flag: '🇪🇪', city: 'Tallinn' },
    'maigirl': { country: 'Estonia', countryCode: 'EE', flag: '🇪🇪', city: 'Tallinn' },
    'playard owner': { country: 'Estonia', countryCode: 'EE', flag: '🇪🇪', city: 'Tallinn' },
    'twoserrmvp': { country: 'United States', countryCode: 'US', flag: '🇺🇸', city: 'New York' },
    'admin': { country: 'Estonia', countryCode: 'EE', flag: '🇪🇪', city: 'Tartu' }
};

export class PlayerGeoService {
    private currentGeo: PlayerGeoInfo | null = null;
    private hasFetched = false;

    constructor() {
        this.loadCachedGeo();
    }

    private loadCachedGeo() {
        try {
            const raw = localStorage.getItem(GEO_CACHE_KEY);
            if (raw) {
                this.currentGeo = JSON.parse(raw);
            }
        } catch (e) {}
    }

    public async detectCurrentLocation(): Promise<PlayerGeoInfo> {
        if (this.currentGeo && this.hasFetched) {
            return this.currentGeo;
        }

        // Try IP geolocation APIs
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            
            const res = await fetch('https://ipwho.is/', { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await res.json();
            
            if (data && data.success) {
                const geo: PlayerGeoInfo = {
                    country: data.country || 'Estonia',
                    countryCode: data.country_code || 'EE',
                    flag: data.country_flag || '🇪🇪',
                    city: data.city || ''
                };
                this.currentGeo = geo;
                this.hasFetched = true;
                try {
                    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
                } catch (e) {}
                return geo;
            }
        } catch (e) {
            // Fallback to timezone/locale detection
        }

        // Timezone based fallback
        const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) 
            ? Intl.DateTimeFormat().resolvedOptions().timeZone 
            : '';
        
        let country = 'Estonia';
        let countryCode = 'EE';
        let flag = '🇪🇪';

        if (tz.includes('Helsinki')) {
            country = 'Finland';
            countryCode = 'FI';
            flag = '🇫🇮';
        } else if (tz.includes('Riga')) {
            country = 'Latvia';
            countryCode = 'LV';
            flag = '🇱🇻';
        } else if (tz.includes('London')) {
            country = 'United Kingdom';
            countryCode = 'GB';
            flag = '🇬🇧';
        } else if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) {
            country = 'United States';
            countryCode = 'US';
            flag = '🇺🇸';
        } else if (tz.includes('Berlin') || tz.includes('Paris')) {
            country = 'Germany';
            countryCode = 'DE';
            flag = '🇩🇪';
        }

        const geo: PlayerGeoInfo = { country, countryCode, flag, city: tz.split('/')[1]?.replace(/_/g, ' ') || '' };
        this.currentGeo = geo;
        this.hasFetched = true;
        try {
            localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
        } catch (e) {}
        return geo;
    }

    public getGeoForPlayer(username: string): PlayerGeoInfo {
        const clean = (username || '').toLowerCase().trim();
        
        // 1. Check known specific defaults
        if (DEFAULT_PLAYER_LOCATIONS[clean]) {
            return DEFAULT_PLAYER_LOCATIONS[clean];
        }

        // 2. Check stored player locations
        try {
            const raw = localStorage.getItem(KNOWN_PLAYERS_GEO_KEY);
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[clean]) {
                    return map[clean];
                }
            }
        } catch (e) {}

        // 3. Fallback to current player's geo or Estonia default
        if (this.currentGeo) {
            return this.currentGeo;
        }

        return { country: 'Estonia', countryCode: 'EE', flag: '🇪🇪', city: 'Tallinn' };
    }

    public recordPlayerGeo(username: string, geo: PlayerGeoInfo) {
        const clean = (username || '').toLowerCase().trim();
        if (!clean) return;
        try {
            const raw = localStorage.getItem(KNOWN_PLAYERS_GEO_KEY);
            const map = raw ? JSON.parse(raw) : {};
            map[clean] = geo;
            localStorage.setItem(KNOWN_PLAYERS_GEO_KEY, JSON.stringify(map));
        } catch (e) {}
    }
}

export const playerGeoService = new PlayerGeoService();
// Auto trigger detection in background
if (typeof window !== 'undefined') {
    playerGeoService.detectCurrentLocation().catch(() => {});
}
