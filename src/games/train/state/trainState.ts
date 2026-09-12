import { getCurrentUserProfile, saveLocalProfile } from '../../../auth';
import { yardService } from '../../../shared/yardService';
import { TRAINS_CATALOG } from '../catalog';
import { checkIsOwner } from '../i18n';
import { TrainDef } from '../types';

export const TRAIN_MONEY_KEY = 'playard_train_money';
export const DB_RONGIMANG_KEY = 'rongimäng';
export const DB_RONGINANG_KEY = 'ronginäng';

export const UNLOCKED_TRAINS_KEY = 'playard_unlocked_trains';
export const ACTIVE_TRAIN_KEY = 'playard_active_train';

let _activeDepotCategory: 'train' | 'metro' = 'train';

export function getActiveDepotCategory(): 'train' | 'metro' {
    return _activeDepotCategory;
}

export function setActiveDepotCategory(cat: 'train' | 'metro') {
    _activeDepotCategory = cat;
}

export function getTrainMoney(): number {
    try {
        const prof = getCurrentUserProfile();
        if (prof?.rongimäng !== undefined && !isNaN(Number(prof.rongimäng))) {
            return Math.max(0, Math.round(Number(prof.rongimäng)));
        }
        if (prof?.ronginäng !== undefined && !isNaN(Number(prof.ronginäng))) {
            return Math.max(0, Math.round(Number(prof.ronginäng)));
        }

        const directDbVal = localStorage.getItem(DB_RONGIMANG_KEY) || localStorage.getItem(DB_RONGINANG_KEY);
        if (directDbVal !== null) {
            const parsed = parseInt(directDbVal, 10);
            if (!isNaN(parsed)) {
                if (prof && (prof.rongimäng === undefined || prof.ronginäng === undefined)) {
                    prof.rongimäng = parsed;
                    prof.ronginäng = parsed;
                    saveLocalProfile(prof);
                }
                return Math.max(0, parsed);
            }
        }

        const raw = localStorage.getItem(TRAIN_MONEY_KEY);
        if (raw !== null) {
            const parsed = parseInt(raw, 10);
            if (!isNaN(parsed)) return Math.max(0, parsed);
        }
    } catch (e) {}

    // Initial starting money (Playard Owner gets 100,000 € default for rongimäng)
    if (checkIsOwner()) {
        const prof = getCurrentUserProfile();
        if (prof) {
            prof.rongimäng = 100000;
            prof.ronginäng = 100000;
            localStorage.setItem('playard_current_user_profile', JSON.stringify(prof));
            saveLocalProfile(prof);
        }
        localStorage.setItem(DB_RONGIMANG_KEY, '100000');
        localStorage.setItem(DB_RONGINANG_KEY, '100000');
        localStorage.setItem(TRAIN_MONEY_KEY, '100000');
        return 100000;
    }
    return 0;
}

export function saveTrainMoney(amount: number) {
    const clamped = Math.max(0, Math.round(amount));
    localStorage.setItem(TRAIN_MONEY_KEY, clamped.toString());

    // Sync with database fields 'rongimäng' and 'ronginäng'
    localStorage.setItem(DB_RONGIMANG_KEY, clamped.toString());
    localStorage.setItem(DB_RONGINANG_KEY, clamped.toString());

    const prof = getCurrentUserProfile();
    if (prof) {
        if (prof.email) {
            localStorage.setItem(`playard_train_money_user_${prof.email.toLowerCase()}`, clamped.toString());
        }
        if (prof.username) {
            localStorage.setItem(`playard_train_money_user_${prof.username.toLowerCase()}`, clamped.toString());
        }
        prof.rongimäng = clamped;
        prof.ronginäng = clamped;
        localStorage.setItem('playard_current_user_profile', JSON.stringify(prof));
        saveLocalProfile(prof);
    }
}

export function addTrainMoney(delta: number) {
    const current = getTrainMoney();
    const next = current + delta;
    saveTrainMoney(next);
}

export function spendTrainMoney(price: number): boolean {
    const current = getTrainMoney();
    if (current < price) return false;
    saveTrainMoney(current - price);
    return true;
}

export function getUnlockedTrainIds(): string[] {
    const list: string[] = ['classic_steam', 'metro_standard'];
    try {
        const raw = localStorage.getItem(UNLOCKED_TRAINS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                parsed.forEach(id => {
                    if (!list.includes(id)) list.push(id);
                });
            }
        }
    } catch (e) {}

    // Check cloud-synced yard inventory for unlocked trains or metros
    try {
        const yardInv = yardService.getInventory();
        if (Array.isArray(yardInv)) {
            for (const item of yardInv) {
                if (TRAINS_CATALOG.some(t => t.id === item) && !list.includes(item)) {
                    list.push(item);
                }
            }
        }
    } catch (e) {}

    return list;
}

export function saveUnlockedTrainIds(list: string[]) {
    localStorage.setItem(UNLOCKED_TRAINS_KEY, JSON.stringify(list));
}

export function getActiveTrainDef(): TrainDef {
    const activeId = localStorage.getItem(ACTIVE_TRAIN_KEY) || 'classic_steam';
    return TRAINS_CATALOG.find(t => t.id === activeId) || TRAINS_CATALOG[0];
}

export function setActiveTrainId(id: string) {
    localStorage.setItem(ACTIVE_TRAIN_KEY, id);
}
