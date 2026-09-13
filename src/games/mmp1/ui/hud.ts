import { Role, Character } from '../types';
import { WEAPON_SKIN_CATALOG } from '../catalog';
import { getWeaponArtworkSvg } from './svgArtwork';
import { MmpCrateManager } from '../state/crateManager';

export interface HudContext {
    playerChar: Character;
    characters: Character[];
    crateManager: MmpCrateManager;
}

export class HudUI {
    private ctx: HudContext;
    public hudRoleBadge: HTMLElement | null = null;
    public hudRoleIcon: HTMLElement | null = null;
    public hudRoleText: HTMLElement | null = null;
    public hudAliveBadge: HTMLElement | null = null;
    public hudAliveCount: HTMLElement | null = null;
    public hudCoinsBadge: HTMLElement | null = null;
    public hudCoinsVal: HTMLElement | null = null;
    public slotWeapon: HTMLElement | null = null;
    public slotWeaponIcon: HTMLElement | null = null;
    public slotWeaponName: HTMLElement | null = null;
    public roleRevealOverlay: HTMLElement | null = null;
    public incidentFeed: HTMLElement | null = null;

    constructor(ctx: HudContext) {
        this.ctx = ctx;
        this.cacheDom();
    }

    private cacheDom() {
        this.hudRoleBadge = document.getElementById('hud-role-badge');
        this.hudRoleIcon = document.getElementById('hud-role-icon');
        this.hudRoleText = document.getElementById('hud-role-text');
        this.hudAliveBadge = document.getElementById('hud-alive-badge');
        this.hudAliveCount = document.getElementById('hud-alive-count');
        this.hudCoinsBadge = document.getElementById('hud-coins-badge');
        this.hudCoinsVal = document.getElementById('hud-coins-val');
        this.slotWeapon = document.getElementById('slot-weapon');
        this.slotWeaponIcon = document.getElementById('slot-weapon-icon');
        this.slotWeaponName = document.getElementById('slot-weapon-name');
        this.roleRevealOverlay = document.getElementById('role-reveal-overlay');
        this.incidentFeed = document.getElementById('incident-feed');
    }

    public updateRoleHud() {
        if (!this.hudRoleBadge || !this.hudRoleIcon || !this.hudRoleText) return;

        const inv = this.ctx.crateManager?.getInventory();
        const equippedKnifeId = inv?.equippedKnife || 'knife_default';
        const equippedGunId = inv?.equippedGun || 'gun_default';
        const knifeSkin = WEAPON_SKIN_CATALOG[equippedKnifeId] || WEAPON_SKIN_CATALOG['knife_default'];
        const gunSkin = WEAPON_SKIN_CATALOG[equippedGunId] || WEAPON_SKIN_CATALOG['gun_default'];

        if (this.ctx.playerChar.role === 'murderer') {
            this.hudRoleIcon.textContent = '🔪';
            this.hudRoleText.textContent = 'MÕRVAR';
            this.hudRoleBadge.style.borderColor = '#ff2e63';
            this.hudRoleBadge.style.color = '#ff2e63';
            if (this.slotWeaponIcon) {
                this.slotWeaponIcon.innerHTML = `<div class="hotbar-weapon-art">${getWeaponArtworkSvg(knifeSkin)}</div>`;
            }
            if (this.slotWeaponName) this.slotWeaponName.textContent = knifeSkin.name;
            if (this.slotWeapon) {
                if (this.ctx.playerChar.hasWeaponEquipped) {
                    this.slotWeapon.classList.add('active');
                } else {
                    this.slotWeapon.classList.remove('active');
                }
            }
        } else if (this.ctx.playerChar.role === 'sheriff') {
            this.hudRoleIcon.textContent = '🔫';
            this.hudRoleText.textContent = 'ŠERIF';
            this.hudRoleBadge.style.borderColor = '#00f2fe';
            this.hudRoleBadge.style.color = '#00f2fe';
            if (this.slotWeaponIcon) {
                this.slotWeaponIcon.innerHTML = `<div class="hotbar-weapon-art">${getWeaponArtworkSvg(gunSkin)}</div>`;
            }
            if (this.slotWeaponName) this.slotWeaponName.textContent = gunSkin.name;
            if (this.slotWeapon) {
                if (this.ctx.playerChar.hasWeaponEquipped) {
                    this.slotWeapon.classList.add('active');
                } else {
                    this.slotWeapon.classList.remove('active');
                }
            }
        } else {
            this.hudRoleIcon.textContent = '🛡️';
            this.hudRoleText.textContent = 'SÜÜTU';
            this.hudRoleBadge.style.borderColor = '#2ecc71';
            this.hudRoleBadge.style.color = '#2ecc71';
            if (this.slotWeaponIcon) this.slotWeaponIcon.textContent = '✊';
            if (this.slotWeaponName) this.slotWeaponName.textContent = 'Käed';
            if (this.slotWeapon) {
                this.slotWeapon.classList.remove('active');
            }
        }
    }

    public updateAliveCount() {
        const alive = this.ctx.characters.filter(c => c.isAlive).length;
        if (this.hudAliveCount) this.hudAliveCount.textContent = `${alive}/${this.ctx.characters.length}`;
    }

    public showRoleRevealModal(role: Role) {
        if (!this.roleRevealOverlay) return;
        const iconEl = document.getElementById('role-reveal-icon');
        const titleEl = document.getElementById('role-reveal-title');
        const descEl = document.getElementById('role-reveal-desc');
        const boxEl = document.getElementById('role-card-box');

        if (role === 'murderer') {
            if (iconEl) iconEl.textContent = '🔪';
            if (titleEl) {
                titleEl.textContent = 'MÕRVAR';
                titleEl.className = 'role-title role-murderer';
            }
            if (descEl) descEl.textContent = 'Tapa salaja kõik süütud ja väldi šerifi kuule! Võidu korral saad +150 Jardi!';
            if (boxEl) boxEl.style.borderColor = '#ff2e63';
        } else if (role === 'sheriff') {
            if (iconEl) iconEl.textContent = '🔫';
            if (titleEl) {
                titleEl.textContent = 'ŠERIF';
                titleEl.className = 'role-title role-sheriff';
            }
            if (descEl) descEl.textContent = 'Otsi üles mõrvar ja lase ta maha! Kui eksid ja tabad süütut, kaotad relva!';
            if (boxEl) boxEl.style.borderColor = '#00f2fe';
        } else {
            if (iconEl) iconEl.textContent = '🛡️';
            if (titleEl) {
                titleEl.textContent = 'SÜÜTU';
                titleEl.className = 'role-title role-innocent';
            }
            if (descEl) descEl.textContent = 'Jää ellu! Kogu münte ja kui šerif langeb, otsi üles mahakukkunud relv!';
            if (boxEl) boxEl.style.borderColor = '#2ecc71';
        }

        this.roleRevealOverlay.style.display = 'flex';
    }

    public addIncidentFeed(text: string) {
        if (!this.incidentFeed) return;
        const item = document.createElement('div');
        item.className = 'incident-item';
        item.textContent = text;
        this.incidentFeed.prepend(item);
        setTimeout(() => {
            item.remove();
        }, 6000);
    }
}
