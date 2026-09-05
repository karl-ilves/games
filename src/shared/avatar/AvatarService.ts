import { AvatarConfig, AvatarItem } from './types';
import { DEFAULT_AVATAR_CONFIG, AVATAR_CATALOG, getItemById } from './catalog';
import { yardService } from '../yardService';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from '../../auth';

const AVATAR_STORAGE_KEY_PREFIX = 'playard_avatar_config_';
const INVENTORY_STORAGE_KEY_PREFIX = 'playard_avatar_inventory_';

export const ACTION_TO_EMOTE_ID: Record<string, string> = {
    wave: 'emote_wave',
    dance: 'emote_dance_spin',
    salute: 'emote_salute_military',
    backflip: 'emote_backflip',
    breakdance: 'emote_breakdance',
    laugh: 'emote_laugh_triumph',
    flex: 'emote_flex_muscles',
    levitate: 'emote_levitate_zen',
    zombie: 'emote_zombie_groan',
    guitar: 'emote_guitar_solo'
};

class AvatarService {
    private currentConfig: AvatarConfig;
    private userInventory: Set<string>;
    private listeners: Array<(config: AvatarConfig) => void> = [];

    constructor() {
        this.currentConfig = { ...DEFAULT_AVATAR_CONFIG };
        this.userInventory = new Set<string>();

        // Default unlocked starter items
        AVATAR_CATALOG.filter(item => item.isDefault || item.price === 0).forEach(item => {
            this.userInventory.add(item.id);
        });

        this.loadLocalAvatarData();
        this.syncWithCloud();

        window.addEventListener('playard_auth_changed', () => {
            this.loadLocalAvatarData();
            this.syncWithCloud();
        });
    }

    private getUserIdKey(): string {
        const prof = getCurrentUserProfile();
        return prof?.id || prof?.username || 'guest';
    }

    public getConfig(): AvatarConfig {
        return { ...this.currentConfig };
    }

    public getInventory(): string[] {
        return Array.from(this.userInventory);
    }

    public hasItem(itemId: string): boolean {
        return this.userInventory.has(itemId);
    }

    public isEmoteOwned(actionOrId: string): boolean {
        if (!actionOrId || actionOrId === 'idle' || actionOrId === 'jump') return true;
        const itemId = ACTION_TO_EMOTE_ID[actionOrId] || actionOrId;
        const item = getItemById(itemId);
        if (!item) return false;
        if (item.isDefault || item.price === 0) return true;
        return this.hasItem(itemId);
    }

    public isMovementStyleOwned(styleId: string): boolean {
        if (!styleId || styleId === 'anim_style_default') return true;
        const item = getItemById(styleId);
        if (!item) return false;
        if (item.isDefault || item.price === 0) return true;
        return this.hasItem(styleId);
    }

    public subscribe(fn: (config: AvatarConfig) => void): () => void {
        this.listeners.push(fn);
        fn(this.getConfig());
        return () => {
            this.listeners = this.listeners.filter(l => l !== fn);
        };
    }

    private notify() {
        const cfg = this.getConfig();
        this.listeners.forEach(fn => fn(cfg));
        window.dispatchEvent(new CustomEvent('playard_avatar_changed', { detail: cfg }));
    }

    private loadLocalAvatarData() {
        try {
            const key = this.getUserIdKey();
            const rawConfig = localStorage.getItem(`${AVATAR_STORAGE_KEY_PREFIX}${key}`) || localStorage.getItem('playard_avatar_config_guest');
            if (rawConfig) {
                const parsed = JSON.parse(rawConfig);
                this.currentConfig = { ...DEFAULT_AVATAR_CONFIG, ...parsed };
            }

            const rawInv = localStorage.getItem(`${INVENTORY_STORAGE_KEY_PREFIX}${key}`) || localStorage.getItem('playard_avatar_inventory_guest');
            if (rawInv) {
                const arr = JSON.parse(rawInv);
                if (Array.isArray(arr)) {
                    arr.forEach(id => this.userInventory.add(id));
                }
            }
        } catch (e) {
            console.warn('Could not load avatar config:', e);
        }
        this.notify();
    }

    public async saveAvatar(newConfig: Partial<AvatarConfig>): Promise<boolean> {
        if (newConfig.activeEmote && !this.isEmoteOwned(newConfig.activeEmote)) {
            newConfig.activeEmote = 'idle';
        }
        if (newConfig.movementStyle && !this.isMovementStyleOwned(newConfig.movementStyle)) {
            newConfig.movementStyle = 'anim_style_default';
        }
        this.currentConfig = { ...this.currentConfig, ...newConfig, updatedAt: new Date().toISOString() };
        const key = this.getUserIdKey();

        localStorage.setItem(`${AVATAR_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(this.currentConfig));
        localStorage.setItem(`${INVENTORY_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(Array.from(this.userInventory)));

        this.notify();
        await this.syncToCloud();
        return true;
    }

    public async buyItem(itemId: string): Promise<{ success: boolean; message: string }> {
        const item = getItemById(itemId);
        if (!item) {
            return { success: false, message: 'Item not found in catalog!' };
        }

        if (this.hasItem(itemId)) {
            return { success: false, message: 'You already own this item!' };
        }

        const currentYards = yardService.getYards();
        if (currentYards < item.price) {
            return {
                success: false,
                message: `Not enough Yards! Requires ${item.price} Yards (You have ${currentYards}).`
            };
        }

        // Spend Yards through yardService with audit logging
        const spendSuccess = yardService.spendYards(item.price, item.id, `Avatar Item: ${item.name}`);
        if (!spendSuccess) {
            return { success: false, message: 'Transaction failed while spending Yards.' };
        }

        // Add to inventory
        this.userInventory.add(item.id);
        const key = this.getUserIdKey();
        localStorage.setItem(`${INVENTORY_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(Array.from(this.userInventory)));

        // Equip immediately on purchase
        this.equipItem(item);

        await this.syncToCloud();
        return { success: true, message: `Successfully purchased and equipped ${item.name}!` };
    }

    public equipItem(item: AvatarItem) {
        if (!this.hasItem(item.id)) return;

        const update: Partial<AvatarConfig> = {};
        switch (item.category) {
            case 'skin':
                if (item.defaultColor) update.skinColor = item.defaultColor;
                break;
            case 'hair':
                update.hairId = item.id;
                if (item.defaultColor) update.hairColor = item.defaultColor;
                break;
            case 'face':
                update.faceId = item.id;
                break;
            case 'tops':
                update.topId = item.id;
                break;
            case 'pants':
                update.pantsId = item.id;
                break;
            case 'shoes':
                update.shoesId = item.id;
                break;
            case 'hats':
                update.hatId = item.id;
                break;
            case 'back':
                update.backId = item.id;
                break;
            case 'emotes': {
                const emoteActionMap: Record<string, string> = {
                    emote_wave: 'wave',
                    emote_dance_spin: 'dance',
                    emote_salute_military: 'salute',
                    emote_backflip: 'backflip',
                    emote_breakdance: 'breakdance',
                    emote_laugh_triumph: 'laugh',
                    emote_flex_muscles: 'flex',
                    emote_levitate_zen: 'levitate',
                    emote_zombie_groan: 'zombie',
                    emote_guitar_solo: 'guitar'
                };
                update.activeEmote = emoteActionMap[item.id] || (item.id.includes('dance') ? 'dance' : 'wave');
                break;
            }
            case 'animations':
                update.movementStyle = item.id;
                break;
        }

        this.saveAvatar(update);
    }

    public unequipItem(category: 'hats' | 'back' | 'accessories') {
        const update: Partial<AvatarConfig> = {};
        if (category === 'hats') update.hatId = null;
        if (category === 'back') update.backId = null;
        if (category === 'accessories') update.accessoryId = null;
        this.saveAvatar(update);
    }

    private async syncWithCloud() {
        const prof = getCurrentUserProfile();
        if (!supabase || !prof?.id) return;

        try {
            const { data, error } = await supabase
                .from('user_avatars')
                .select('*')
                .eq('user_id', prof.id)
                .single();

            if (data && !error) {
                this.currentConfig = {
                    bodyId: data.body_id || 'body_standard',
                    skinColor: data.skin_color || '#f5d0b5',
                    faceId: data.face_id || 'face_smile',
                    hairId: data.hair_id || 'hair_classic',
                    hairColor: data.hair_color || '#221812',
                    topId: data.top_id || 'top_hoodie_cyan',
                    pantsId: data.pants_id || 'pants_jeans_dark',
                    shoesId: data.shoes_id || 'shoes_sneakers_white',
                    hatId: data.hat_id || null,
                    accessoryId: data.accessory_id || null,
                    backId: data.back_accessory_id || null,
                    activeEmote: (data.active_emote as any) || 'idle',
                    movementStyle: data.movement_style || 'anim_style_default'
                };
                this.notify();
            }

            // Sync user inventory from database
            const { data: invData } = await supabase
                .from('user_avatar_inventory')
                .select('item_id')
                .eq('user_id', prof.id);

            if (invData && Array.isArray(invData)) {
                invData.forEach(row => this.userInventory.add(row.item_id));
                const key = this.getUserIdKey();
                localStorage.setItem(`${INVENTORY_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(Array.from(this.userInventory)));
            }
        } catch (e) {
            console.warn('Avatar cloud sync note:', e);
        }
    }

    private async syncToCloud() {
        const prof = getCurrentUserProfile();
        if (!supabase || !prof?.id) return;

        try {
            await supabase.from('user_avatars').upsert({
                user_id: prof.id,
                body_id: this.currentConfig.bodyId,
                skin_color: this.currentConfig.skinColor,
                face_id: this.currentConfig.faceId,
                hair_id: this.currentConfig.hairId,
                hair_color: this.currentConfig.hairColor,
                top_id: this.currentConfig.topId,
                pants_id: this.currentConfig.pantsId,
                shoes_id: this.currentConfig.shoesId,
                hat_id: this.currentConfig.hatId,
                accessory_id: this.currentConfig.accessoryId,
                back_accessory_id: this.currentConfig.backId,
                active_emote: this.currentConfig.activeEmote,
                movement_style: this.currentConfig.movementStyle || 'anim_style_default',
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch (e) {
            console.warn('Avatar cloud save error:', e);
        }
    }

    public get catalog(): AvatarItem[] {
        return AVATAR_CATALOG;
    }
}

export const avatarService = new AvatarService();

// Expose globally for games integration
(window as any).playardAvatar = avatarService;
