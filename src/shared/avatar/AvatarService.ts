import { AvatarConfig, AvatarItem } from './types';
import { DEFAULT_AVATAR_CONFIG, AVATAR_CATALOG, getItemById } from './catalog';
import { AvatarOutfitBundle, getOutfitItems } from './outfits';
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
    guitar: 'emote_guitar_solo',
    dab: 'emote_dab_swag',
    moonwalk: 'emote_moonwalk_slide',
    tpose: 'emote_tpose_dominance',
    robot_dance: 'emote_robot_popper',
    kungfu: 'emote_kungfu_strike',
    headspin: 'emote_headspin_air',
    cheer: 'emote_cheer_hype',
    bow: 'emote_formal_bow',
    matrix_dodge: 'emote_matrix_dodge',
    hype_clap: 'emote_hype_clap',
    slow_clap: 'emote_slow_clap',
    ground_slam: 'emote_superhero_landing'
};

export const EMOTE_ID_TO_ACTION: Record<string, string> = Object.entries(ACTION_TO_EMOTE_ID).reduce((acc, [action, id]) => {
    acc[id] = action;
    return acc;
}, {} as Record<string, string>);

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
        if (!actionOrId || ['idle', 'walk', 'run', 'jump'].includes(actionOrId)) return true;
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

            // Also integrate cloud-synced items from yardService inventory
            const yardItems = yardService.getInventory();
            if (Array.isArray(yardItems)) {
                yardItems.forEach(id => {
                    if (!id.startsWith('meta_')) {
                        this.userInventory.add(id);
                    }
                });
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
        this.syncToCloud().catch(err => console.warn('Avatar cloud sync:', err));
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

    public async equipOutfit(outfitConfig: Partial<AvatarConfig>): Promise<boolean> {
        return this.saveAvatar(outfitConfig);
    }

    public getOutfitPriceDetails(outfit: AvatarOutfitBundle) {
        const items = getOutfitItems(outfit);
        const totalPrice = items.reduce((sum, it) => sum + (it.price || 0), 0);
        const unownedItems = items.filter(it => !this.hasItem(it.id) && !it.isDefault && (it.price || 0) > 0);
        const unownedPrice = unownedItems.reduce((sum, it) => sum + (it.price || 0), 0);
        const isFullyOwned = unownedItems.length === 0;

        return {
            totalPrice,
            unownedPrice,
            totalItemsCount: items.length,
            unownedItemsCount: unownedItems.length,
            isFullyOwned,
            items,
            unownedItems
        };
    }

    public async buyOutfit(outfit: AvatarOutfitBundle): Promise<{ success: boolean; message: string; cost: number }> {
        const details = this.getOutfitPriceDetails(outfit);

        // If user already owns all items in the bundle, equip directly for 0 cost
        if (details.isFullyOwned) {
            await this.equipOutfit(outfit.config);
            return {
                success: true,
                message: `✨ Outfit "${outfit.name}" equipped! (All items already owned)`,
                cost: 0
            };
        }

        const currentYards = yardService.getYards();
        if (currentYards < details.unownedPrice) {
            return {
                success: false,
                message: `Not enough Yards! Set requires ${details.unownedPrice.toLocaleString()} Yards (You have ${currentYards.toLocaleString()}).`,
                cost: details.unownedPrice
            };
        }

        // Spend Yards through yardService with audit logging
        const spendSuccess = yardService.spendYards(
            details.unownedPrice,
            outfit.id,
            `Outfit Bundle: ${outfit.name} (${details.unownedItemsCount} items)`
        );

        if (!spendSuccess) {
            return {
                success: false,
                message: 'Transaction failed while spending Yards.',
                cost: details.unownedPrice
            };
        }

        // Add all unowned items into player inventory
        details.unownedItems.forEach(it => {
            this.userInventory.add(it.id);
        });

        const key = this.getUserIdKey();
        localStorage.setItem(`${INVENTORY_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(Array.from(this.userInventory)));

        // Keep yardService local inventory in sync with bought bundle items
        yardService.mergeCloudInventory(details.unownedItems.map(it => it.id));

        // Equip the entire outfit set
        await this.equipOutfit(outfit.config);
        this.syncToCloud().catch(err => console.warn('Outfit cloud sync error:', err));

        return {
            success: true,
            message: `🎉 Successfully purchased and equipped "${outfit.name}" for ${details.unownedPrice.toLocaleString()} Yards!`,
            cost: details.unownedPrice
        };
    }

    public applyConfigFromCloud(config: Partial<AvatarConfig>) {
        if (!config || typeof config !== 'object') return;
        this.currentConfig = { ...this.currentConfig, ...config };
        const key = this.getUserIdKey();
        localStorage.setItem(`${AVATAR_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(this.currentConfig));
        this.notify();
    }

    private getResolvedUserId(): string | null {
        const prof = getCurrentUserProfile();
        if (!prof) return null;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (prof.id && uuidRegex.test(prof.id)) {
            return prof.id;
        }
        if (prof.email && (prof.email.toLowerCase() === '1karl.ilves@gmail.com' || prof.email.toLowerCase() === '1karl.ilves@gmailo.com' || prof.email.toLowerCase() === '1karl.iles@gmail.com')) {
            return '5cc22da5-ea52-4623-8978-09a2c33bc5b2';
        }
        const u = (prof.username || '').toLowerCase();
        if (u === 'playard owner' || u === 'owner') {
            return '5cc22da5-ea52-4623-8978-09a2c33bc5b2';
        }
        if (u === 'minionbanana0_0' || (prof.email && prof.email.toLowerCase().includes('minionbanana0_0'))) {
            return 'd4983d4c-6288-40a2-9a2b-d5a7797bee1e';
        }
        if (u === 'admin' || (prof.email && prof.email.toLowerCase() === 'grx@trenet.ee')) {
            return '6e8aeb96-7959-4000-8beb-c2077ca31952';
        }
        return prof.id || null;
    }

    public async syncWithCloud(): Promise<boolean> {
        const userId = this.getResolvedUserId();
        if (!supabase || !userId) return false;

        let synced = false;

        // 1. Primary Cloud Persistence via user_yards table
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(userId)) {
                const { data: yardRecord } = await supabase
                    .from('user_yards')
                    .select('inventory')
                    .eq('user_id', userId)
                    .single();

                if (yardRecord && Array.isArray(yardRecord.inventory)) {
                    for (const item of yardRecord.inventory) {
                        if (typeof item === 'string') {
                            if (item.startsWith('meta_avatar_config:')) {
                                try {
                                    const jsonStr = item.replace('meta_avatar_config:', '');
                                    const parsed = JSON.parse(jsonStr);
                                    if (parsed && typeof parsed === 'object') {
                                        this.currentConfig = { ...this.currentConfig, ...parsed };
                                        synced = true;
                                    }
                                } catch (_err) {}
                            } else if (!item.startsWith('meta_')) {
                                this.userInventory.add(item);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[AvatarService] Cloud read from user_yards note:', e);
        }

        // 2. Secondary check via user_avatars table (if exists)
        try {
            const { data, error } = await supabase
                .from('user_avatars')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (data && !error) {
                this.currentConfig = {
                    bodyId: data.body_id || this.currentConfig.bodyId || 'body_standard',
                    skinColor: data.skin_color || this.currentConfig.skinColor || '#f5d0b5',
                    faceId: data.face_id || this.currentConfig.faceId || 'face_smile',
                    hairId: data.hair_id || this.currentConfig.hairId || 'hair_classic',
                    hairColor: data.hair_color || this.currentConfig.hairColor || '#221812',
                    topId: data.top_id || this.currentConfig.topId || 'top_hoodie_cyan',
                    pantsId: data.pants_id || this.currentConfig.pantsId || 'pants_jeans_dark',
                    shoesId: data.shoes_id || this.currentConfig.shoesId || 'shoes_sneakers_white',
                    hatId: data.hat_id !== undefined ? data.hat_id : this.currentConfig.hatId,
                    accessoryId: data.accessory_id !== undefined ? data.accessory_id : this.currentConfig.accessoryId,
                    backId: data.back_accessory_id !== undefined ? data.back_accessory_id : this.currentConfig.backId,
                    activeEmote: (data.active_emote as any) || this.currentConfig.activeEmote || 'idle',
                    movementStyle: data.movement_style || this.currentConfig.movementStyle || 'anim_style_default'
                };
                synced = true;
            }
        } catch (e) {
            // Optional table
        }

        // 3. Sync user inventory from user_avatar_inventory table (if exists)
        try {
            const { data: invData } = await supabase
                .from('user_avatar_inventory')
                .select('item_id')
                .eq('user_id', userId);

            if (invData && Array.isArray(invData)) {
                invData.forEach(row => this.userInventory.add(row.item_id));
            }
        } catch (e) {}

        // Sync with yardService local inventory
        const yardInv = yardService.getInventory();
        if (Array.isArray(yardInv)) {
            yardInv.forEach(id => {
                if (!id.startsWith('meta_')) this.userInventory.add(id);
            });
        }

        // Cache into local storage
        const key = this.getUserIdKey();
        localStorage.setItem(`${AVATAR_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(this.currentConfig));
        localStorage.setItem(`${INVENTORY_STORAGE_KEY_PREFIX}${key}`, JSON.stringify(Array.from(this.userInventory)));

        this.notify();
        return synced;
    }

    public async syncToCloud(): Promise<boolean> {
        const userId = this.getResolvedUserId();
        if (!supabase || !userId) return false;

        let anySuccess = false;

        // 1. Primary Cloud Persistence via user_yards table
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(userId)) {
                const { data: curRecord } = await supabase
                    .from('user_yards')
                    .select('inventory')
                    .eq('user_id', userId)
                    .single();

                const existingInv: string[] = curRecord?.inventory && Array.isArray(curRecord.inventory) ? curRecord.inventory : [];
                
                // Merge player avatar inventory into cloud inventory
                const nonMetaInv = existingInv.filter(it => !it.startsWith('meta_'));
                const avatarItems = Array.from(this.userInventory).filter(id => !id.startsWith('meta_'));
                const mergedItems = Array.from(new Set([...nonMetaInv, ...avatarItems]));

                // Retain other metadata (train money, war money etc.)
                const otherMeta = existingInv.filter(it => it.startsWith('meta_') && !it.startsWith('meta_avatar_config:'));

                // Encode full current avatar configuration
                const avatarMeta = `meta_avatar_config:${JSON.stringify(this.currentConfig)}`;
                const finalInventory = [...mergedItems, ...otherMeta, avatarMeta];

                const { error: updErr } = await supabase
                    .from('user_yards')
                    .update({ 
                        inventory: finalInventory,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                if (!updErr) {
                    anySuccess = true;
                    if (yardService) {
                        yardService.mergeCloudInventory(mergedItems);
                    }
                }
            }
        } catch (e) {
            console.warn('[AvatarService] Cloud save to user_yards note:', e);
        }

        // 2. Secondary Cloud Persistence via user_avatars table (if created)
        try {
            const { error: avErr } = await supabase.from('user_avatars').upsert({
                user_id: userId,
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

            if (!avErr) anySuccess = true;
        } catch (e) {
            // Table might not exist yet
        }

        return anySuccess;
    }

    public get catalog(): AvatarItem[] {
        return AVATAR_CATALOG;
    }
}

export const avatarService = new AvatarService();

// Expose globally for games integration
(window as any).playardAvatar = avatarService;

