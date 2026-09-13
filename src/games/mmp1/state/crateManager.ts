import { CrateTier, CrateStockData, InventoryData } from "../types";
import { CRATE_CATALOG, WEAPON_SKIN_CATALOG } from "../catalog";

export class MmpCrateManager {
    private moneyKey = 'mmp1_money';
    private stocksKey = 'mmp1_crate_stocks_v2';
    private inventoryKey = 'mmp1_inventory_v2';

    constructor() {
        this.getStocks();
        this.initMoney();
    }

    public getMoney(): number {
        const stored = localStorage.getItem(this.moneyKey);
        if (stored === null || isNaN(Number(stored))) {
            localStorage.setItem(this.moneyKey, '100');
            return 100;
        }
        return Math.max(0, parseInt(stored, 10));
    }

    public setMoney(amount: number) {
        localStorage.setItem(this.moneyKey, Math.max(0, Math.floor(amount)).toString());
        this.updateMoneyUI();
    }

    public addMoney(amount: number) {
        this.setMoney(this.getMoney() + amount);
    }

    public spendMoney(amount: number): boolean {
        const current = this.getMoney();
        if (current >= amount) {
            this.setMoney(current - amount);
            return true;
        }
        return false;
    }

    public updateMoneyUI() {
        const money = this.getMoney();
        const hudMoney = document.getElementById('hud-money-val');
        if (hudMoney) hudMoney.textContent = money.toString();
        const shopMoney = document.getElementById('shop-modal-money-val');
        if (shopMoney) shopMoney.textContent = money.toString();
    }

    public initMoney() {
        this.updateMoneyUI();
    }

    public getStocks(): Record<string, CrateStockData> {
        let data: Record<string, CrateStockData> = {};
        try {
            const raw = localStorage.getItem(this.stocksKey);
            if (raw) data = JSON.parse(raw);
        } catch (e) {}

        const now = Date.now();
        let changed = false;

        for (const [tier, crate] of Object.entries(CRATE_CATALOG)) {
            if (!data[tier] || typeof data[tier].stock !== 'number') {
                data[tier] = {
                    stock: crate.defaultStock,
                    nextRestock: now + crate.restockIntervalSec * 1000
                };
                changed = true;
            } else {
                // If restock time passed, restock 1 item up to maxStock
                while (now >= data[tier].nextRestock) {
                    if (data[tier].stock < crate.maxStock) {
                        data[tier].stock = Math.min(crate.maxStock, data[tier].stock + 1);
                    }
                    data[tier].nextRestock += crate.restockIntervalSec * 1000;
                    changed = true;
                }
            }
        }

        if (changed) {
            localStorage.setItem(this.stocksKey, JSON.stringify(data));
        }
        return data;
    }

    public saveStocks(data: Record<string, CrateStockData>) {
        localStorage.setItem(this.stocksKey, JSON.stringify(data));
    }

    public buyCrate(tier: CrateTier, isLobby: boolean = true): { success: boolean; message: string } {
        if (!isLobby) {
            return { success: false, message: 'Kaste saab osta ainult ooteruumis (lobis) enne mängu algust!' };
        }
        const crate = CRATE_CATALOG[tier];
        if (!crate) return { success: false, message: 'Tundmatu kast!' };

        const stocks = this.getStocks();
        if (!stocks[tier] || stocks[tier].stock <= 0) {
            return { success: false, message: 'See kast on hetkel laost otsas! Oota uut laovaru.' };
        }

        if (this.getMoney() < crate.price) {
            return { success: false, message: `Sul pole piisavalt raha! Vajad ${crate.price} €.` };
        }

        this.spendMoney(crate.price);
        stocks[tier].stock--;
        this.saveStocks(stocks);

        this.awardCrate(tier, 1);
        return { success: true, message: `Ostsid kasti: ${crate.name}!` };
    }

    public awardCrate(tier: CrateTier, count: number = 1) {
        const inv = this.getInventory();
        inv.crates[tier] = (inv.crates[tier] || 0) + count;
        this.saveInventory(inv);
    }

    public getInventory(): InventoryData {
        let inv: InventoryData = {
            crates: {},
            skins: ['knife_default', 'gun_default'],
            equippedKnife: 'knife_default',
            equippedGun: 'gun_default'
        };
        try {
            const raw = localStorage.getItem(this.inventoryKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                inv = { ...inv, ...parsed };
            }
        } catch (e) {}
        if (!inv.skins.includes('knife_default')) inv.skins.push('knife_default');
        if (!inv.skins.includes('gun_default')) inv.skins.push('gun_default');
        return inv;
    }

    public saveInventory(inv: InventoryData) {
        localStorage.setItem(this.inventoryKey, JSON.stringify(inv));
    }

    public openCrate(tier: CrateTier): (WeaponSkinDef & { isDuplicate?: boolean; refundAmount?: number; isSetAward?: boolean; setKnifeSkin?: WeaponSkinDef; setGunSkin?: WeaponSkinDef }) | null {
        const inv = this.getInventory();
        if (!inv.crates[tier] || inv.crates[tier] <= 0) return null;

        inv.crates[tier]--;
        const crate = CRATE_CATALOG[tier];
        if (!crate) return null;

        if (crate.isSetCrate) {
            // Komplekti kast annab KOGU KOMPLEKTI (nii sobiva noa KUI KA sobiva relva)!
            const knifeSkin = WEAPON_SKIN_CATALOG[crate.knifeSkinId] || WEAPON_SKIN_CATALOG['knife_default'];
            const gunSkin = WEAPON_SKIN_CATALOG[crate.gunSkinId] || WEAPON_SKIN_CATALOG['gun_default'];
            let refundAmount = 0;
            let dupCount = 0;

            if (inv.skins.includes(knifeSkin.id)) {
                refundAmount += Math.floor(crate.price / 4);
                dupCount++;
            } else {
                inv.skins.push(knifeSkin.id);
            }

            if (inv.skins.includes(gunSkin.id)) {
                refundAmount += Math.floor(crate.price / 4);
                dupCount++;
            } else {
                inv.skins.push(gunSkin.id);
            }

            if (refundAmount > 0) {
                this.addMoney(refundAmount);
            }
            this.saveInventory(inv);

            return {
                ...knifeSkin,
                isDuplicate: dupCount === 2,
                refundAmount,
                isSetAward: true,
                setKnifeSkin: knifeSkin,
                setGunSkin: gunSkin
            };
        }

        // Standard kast (50% nuga, 50% püstol)
        const skinId = Math.random() < 0.5 ? crate.knifeSkinId : crate.gunSkinId;
        const skin = WEAPON_SKIN_CATALOG[skinId] || WEAPON_SKIN_CATALOG[crate.knifeSkinId];

        const isDuplicate = inv.skins.includes(skin.id);
        let refundAmount = 0;

        if (isDuplicate) {
            // Duplicate item: refund half of crate price (50%)
            refundAmount = Math.floor(crate.price / 2);
            this.addMoney(refundAmount);
        } else {
            inv.skins.push(skin.id);
        }
        this.saveInventory(inv);
        return {
            ...skin,
            isDuplicate,
            refundAmount
        };
    }

    public equipSkin(skinId: string): boolean {
        const skin = WEAPON_SKIN_CATALOG[skinId];
        if (!skin) return false;
        const inv = this.getInventory();
        if (!inv.skins.includes(skinId)) return false;

        if (skin.type === 'knife') {
            inv.equippedKnife = skinId;
        } else {
            inv.equippedGun = skinId;
        }
        this.saveInventory(inv);
        return true;
    }
}