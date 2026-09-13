import { supabase } from '../../../lib/supabase';
import { getCurrentUserProfile, isPlayardOwner } from '../../../auth';
import { yardService } from '../../../shared/yardService';
import { Team, UnitClass, ActiveWeapon, CombatUnit } from '../types';

export class WarGameState {
    public localPlayerId: string = 'p_' + Math.random().toString(36).substring(2, 9);
    public localUsername: string = 'Commander';
    public localTeam: Team = 'blue';
    public localClass: UnitClass = 'tank';
    public activeWeapon: ActiveWeapon = 'cannon';

    public mgAmmo: number = 500;
    public primaryReloadTime: number = 1.2;
    public primaryReloadTimer: number = 0;
    public secondaryReloadTimer: number = 0;
    public airstrikeCooldown: number = 0;
    public missileCooldown: number = 0;
    public nukeTimer: number = 60.0;

    public isSatelliteTargeting: boolean = false;
    public satelliteTargetType: 'missile' | 'nuke' = 'missile';

    public myKills: number = 0;
    public warMoney: number = parseInt(localStorage.getItem('playard_war_game_money') || '0', 10);
    public isPlaneUnlocked: boolean = false;
    public isMissileUnlocked: boolean = false;
    public matchMoneyEarned: number = 0;

    public redScore: number = 0;
    public blueScore: number = 0;
    public readonly targetScore: number = 100;
    public isMatchEnded: boolean = false;

    public isCountdownActive: boolean = false;
    public isOutOfBounds: boolean = false;
    public outOfBoundsTimer: number = 5.0;

    public isOwnerLang: boolean = false;

    public async init(): Promise<void> {
        this.setupLocalIdentity();
        await this.loadUserDataFromDb();
    }

    public setupLocalIdentity(): void {
        const prof = getCurrentUserProfile();
        this.isOwnerLang = isPlayardOwner(prof?.email);
        if (prof) {
            this.localUsername = prof.displayName || prof.username || (this.isOwnerLang ? 'Komandör' : 'Commander');
            if (prof.id) this.localPlayerId = prof.id;
        } else {
            this.localUsername = this.isOwnerLang ? 'Komandör' : 'Commander';
        }
    }

    public async loadUserDataFromDb(): Promise<void> {
        const prof = getCurrentUserProfile();
        const userId = prof?.id || this.localPlayerId;
        const storageKey = `playard_war_data_${userId}`;

        let hasLocalData = false;
        const localData =
            localStorage.getItem(storageKey) ||
            (prof?.id ? localStorage.getItem(`playard_war_data_${prof.id}`) : null) ||
            (prof?.username ? localStorage.getItem(`playard_war_data_${prof.username.toLowerCase()}`) : null) ||
            localStorage.getItem('playard_war_game_money');

        if (localData) {
            try {
                if (localData.startsWith('{')) {
                    const parsed = JSON.parse(localData);
                    if (parsed.money !== undefined) {
                        this.warMoney = parsed.money;
                        hasLocalData = true;
                    }
                    if (parsed.isPlaneUnlocked !== undefined) this.isPlaneUnlocked = !!parsed.isPlaneUnlocked;
                    if (parsed.isMissileUnlocked !== undefined) this.isMissileUnlocked = !!parsed.isMissileUnlocked;
                } else {
                    const num = parseInt(localData, 10);
                    if (!isNaN(num)) {
                        this.warMoney = num;
                        hasLocalData = true;
                    }
                }
            } catch (e) {}
        }

        if (!hasLocalData && prof) {
            if (typeof (prof as any).war_money === 'number') {
                this.warMoney = (prof as any).war_money;
                hasLocalData = true;
            } else if (typeof (prof as any).warmäng === 'number') {
                this.warMoney = (prof as any).warmäng;
                hasLocalData = true;
            }
        }

        const isTestEnv = (window as any).__PLAYARD_TEST_MODE__;
        if (supabase && prof && prof.id && !isTestEnv) {
            try {
                const { data, error } = await supabase
                    .from('war_game_stats')
                    .select('money, is_plane_unlocked, is_missile_unlocked, kills, matches_won')
                    .eq('user_id', prof.id)
                    .single();

                if (data && !error) {
                    if (typeof data.money === 'number') {
                        this.warMoney = data.money;
                        hasLocalData = true;
                    }
                    if (data.is_plane_unlocked !== undefined) this.isPlaneUnlocked = !!data.is_plane_unlocked;
                    if (data.is_missile_unlocked !== undefined) this.isMissileUnlocked = !!data.is_missile_unlocked;
                    if (typeof data.kills === 'number') this.myKills = Math.max(this.myKills, data.kills);
                } else {
                    const { data: progData } = await supabase
                        .from('user_progress')
                        .select('vehicle_upgrades')
                        .eq('user_id', prof.id)
                        .single();

                    const warBackup = progData?.vehicle_upgrades?.war_data;
                    if (warBackup && typeof warBackup.money === 'number') {
                        this.warMoney = warBackup.money;
                        if (warBackup.isPlaneUnlocked !== undefined) this.isPlaneUnlocked = !!warBackup.isPlaneUnlocked;
                        if (warBackup.isMissileUnlocked !== undefined) this.isMissileUnlocked = !!warBackup.isMissileUnlocked;
                        if (typeof warBackup.kills === 'number') this.myKills = Math.max(this.myKills, warBackup.kills);
                        hasLocalData = true;
                    }
                }
            } catch (e) {
                console.warn('War DB load note:', e);
            }
        }

        try {
            const yardInv = yardService.getInventory();
            if (Array.isArray(yardInv)) {
                for (const item of yardInv) {
                    if (item === 'war_plane_unlock') this.isPlaneUnlocked = true;
                    if (item === 'war_missile_unlock') this.isMissileUnlocked = true;
                    if (item.startsWith('meta_war_money:')) {
                        const m = parseInt(item.replace('meta_war_money:', ''), 10);
                        if (!isNaN(m) && m > this.warMoney) {
                            this.warMoney = m;
                            hasLocalData = true;
                        }
                    }
                }
            }
        } catch (e) {}

        if (isPlayardOwner(prof?.email)) {
            const hasOwnerInit = localStorage.getItem(`playard_war_initialized_${userId}`) === 'true';
            if (!hasLocalData && !hasOwnerInit && this.warMoney === 0) {
                this.warMoney = 200000;
                localStorage.setItem(`playard_war_initialized_${userId}`, 'true');
                this.saveUserDataToDb();
            }
        } else if (!hasLocalData) {
            this.warMoney = 0;
            this.saveUserDataToDb();
        }
    }

    public async saveUserDataToDb(): Promise<void> {
        const prof = getCurrentUserProfile();
        const isTestEnv = (window as any).__PLAYARD_TEST_MODE__;
        const userId = prof?.id || this.localPlayerId;
        const storageKey = `playard_war_data_${userId}`;

        const dataToSave = {
            user_id: userId,
            username: this.localUsername,
            money: this.warMoney,
            isPlaneUnlocked: this.isPlaneUnlocked,
            isMissileUnlocked: this.isMissileUnlocked,
            kills: this.myKills,
            updated_at: new Date().toISOString()
        };

        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        localStorage.setItem('playard_war_game_money', this.warMoney.toString());
        if (prof?.id) localStorage.setItem(`playard_war_data_${prof.id}`, JSON.stringify(dataToSave));
        if (prof?.username) localStorage.setItem(`playard_war_data_${prof.username.toLowerCase()}`, JSON.stringify(dataToSave));
        if (prof?.email) localStorage.setItem(`playard_war_data_${prof.email.toLowerCase()}`, JSON.stringify(dataToSave));

        if (prof) {
            (prof as any).warmäng = this.warMoney;
            (prof as any).war_money = this.warMoney;
            try {
                const profilesRaw = localStorage.getItem('playard_user_profiles');
                if (profilesRaw) {
                    const profiles = JSON.parse(profilesRaw);
                    const idx = profiles.findIndex(
                        (p: any) => p.id === prof.id || p.username?.toLowerCase() === prof.username?.toLowerCase()
                    );
                    if (idx >= 0) {
                        profiles[idx].warmäng = this.warMoney;
                        profiles[idx].war_money = this.warMoney;
                        localStorage.setItem('playard_user_profiles', JSON.stringify(profiles));
                    }
                }
                localStorage.setItem('playard_current_user_profile', JSON.stringify(prof));
            } catch (e) {}
        }

        if (supabase && prof && prof.id && !isTestEnv) {
            try {
                const { error: warErr } = await supabase
                    .from('war_game_stats')
                    .upsert(
                        {
                            user_id: prof.id,
                            username: prof.username || this.localUsername,
                            money: this.warMoney,
                            is_plane_unlocked: this.isPlaneUnlocked,
                            is_missile_unlocked: this.isMissileUnlocked,
                            kills: this.myKills,
                            updated_at: new Date().toISOString()
                        },
                        { onConflict: 'user_id' }
                    );
                if (warErr) {
                    console.warn('War Game DB save note (war_game_stats):', warErr);
                }
            } catch (e) {
                console.warn('War Game DB save error:', e);
            }

            try {
                const { data: progData } = await supabase
                    .from('user_progress')
                    .select('vehicle_upgrades')
                    .eq('user_id', prof.id)
                    .single();

                const existingUpgrades =
                    progData && progData.vehicle_upgrades && typeof progData.vehicle_upgrades === 'object'
                        ? progData.vehicle_upgrades
                        : {};

                await supabase.from('user_progress').upsert({
                    user_id: prof.id,
                    vehicle_upgrades: {
                        ...existingUpgrades,
                        war_data: {
                            money: this.warMoney,
                            isPlaneUnlocked: this.isPlaneUnlocked,
                            isMissileUnlocked: this.isMissileUnlocked,
                            kills: this.myKills,
                            updated_at: new Date().toISOString()
                        }
                    }
                });
            } catch (e) {
                console.warn('War Game DB backup save note (user_progress):', e);
            }

            try {
                if (this.isPlaneUnlocked && !yardService.hasItem('war_plane')) yardService.addItem('war_plane');
                if (this.isMissileUnlocked && !yardService.hasItem('war_missile')) yardService.addItem('war_missile');
            } catch (e) {}
        }
    }
}
