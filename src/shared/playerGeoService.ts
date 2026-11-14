/**
 * Player Geo & Location Service
 * Automatically detects player's country and country flag using IP geolocation
 * with fallback to browser timezone/locale.
 */

import { supabase } from '../lib/supabase';

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

    private async loadRemoteLocations() {
        if (!supabase) return;
        try {
            // Read recorded geo metadata from Supabase user_created_games table
            const { data } = await supabase
                .from('user_created_games')
                .select('creator_username, description')
                .eq('category', 'player_geo_meta');
            
            if (Array.isArray(data)) {
                const raw = localStorage.getItem(KNOWN_PLAYERS_GEO_KEY);
                const map: Record<string, PlayerGeoInfo> = raw ? JSON.parse(raw) : {};
                data.forEach((row: any) => {
                    if (row.creator_username && row.description) {
                        try {
                            const parsed = JSON.parse(row.description);
                            if (parsed && parsed.country) {
                                map[row.creator_username.toLowerCase().trim()] = parsed;
                            }
                        } catch (e) {}
                    }
                });
                localStorage.setItem(KNOWN_PLAYERS_GEO_KEY, JSON.stringify(map));
            }
        } catch (e) {}
    }

    public getGeoForPlayer(username: string): PlayerGeoInfo {
        const clean = (username || '').toLowerCase().trim();
        
        // 1. Check stored player locations (synced from real device IPs)
        try {
            const raw = localStorage.getItem(KNOWN_PLAYERS_GEO_KEY);
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[clean]) {
                    return map[clean];
                }
            }
        } catch (e) {}

        // 2. Check known specific defaults
        if (DEFAULT_PLAYER_LOCATIONS[clean]) {
            return DEFAULT_PLAYER_LOCATIONS[clean];
        }

        // 3. Fallback to current player's geo or international default
        if (this.currentGeo) {
            return this.currentGeo;
        }

        return { country: 'United States', countryCode: 'US', flag: '🇺🇸', city: '' };
    }

    public async recordPlayerGeo(username: string, geo: PlayerGeoInfo) {
        const clean = (username || '').toLowerCase().trim();
        if (!clean) return;
        try {
            const raw = localStorage.getItem(KNOWN_PLAYERS_GEO_KEY);
            const map = raw ? JSON.parse(raw) : {};
            map[clean] = geo;
            localStorage.setItem(KNOWN_PLAYERS_GEO_KEY, JSON.stringify(map));
        } catch (e) {}

        // Sync with Supabase cloud table so everyone and the Owner panel sees it across devices
        if (supabase) {
            try {
                const geoId = `geo_${clean.replace(/[^a-z0-9]/g, '_')}`;
                await supabase.from('user_created_games').upsert({
                    id: geoId,
                    creator_username: username,
                    title: `Geo: ${geo.country}`,
                    description: JSON.stringify(geo),
                    category: 'player_geo_meta',
                    updated_at: new Date().toISOString()
                });
            } catch (e) {}
        }
    }
}

export const playerGeoService = new PlayerGeoService();
// Auto trigger detection and load cloud records in background
if (typeof window !== 'undefined') {
    playerGeoService.detectCurrentLocation().catch(() => {});
    (playerGeoService as any).loadRemoteLocations?.();
}
