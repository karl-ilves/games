import { Character } from "../types";
import { MmpCrateManager } from "../state/crateManager";

export class InvisibilitySystem {
    private isPlayerInvisible = false;
    private isInvisCooldown = false;
    private invisTimer: any = null;
    private cooldownTimer: any = null;

    constructor(private ctx: {
        playerChar: Character;
        crateManager: MmpCrateManager;
        getState: () => string;
        addIncidentFeed: (msg: string) => void;
    }) {}

    public init() {
        this.updateSlotVisibility();
        const slotInvis = document.getElementById('slot-invis');
        if (slotInvis) {
            slotInvis.onclick = () => this.activateInvisibility();
        }
        const mobileInvis = document.getElementById('btn-mobile-invis');
        if (mobileInvis) {
            mobileInvis.onclick = () => this.activateInvisibility();
        }
    }

    public updateSlotVisibility() {
        const hasPass = this.ctx.crateManager.hasGamePass('gamepass_invis_cloak');
        const slotInvis = document.getElementById('slot-invis');
        if (slotInvis) {
            slotInvis.style.display = hasPass ? 'flex' : 'none';
        }
        const mobileInvis = document.getElementById('btn-mobile-invis');
        if (mobileInvis) {
            mobileInvis.style.display = hasPass ? 'flex' : 'none';
        }
    }

    public getIsInvisible(): boolean {
        return this.isPlayerInvisible;
    }

    public activateInvisibility(): boolean {
        if (!this.ctx.crateManager.hasGamePass('gamepass_invis_cloak')) return false;
        if (this.ctx.getState() !== 'in_game') return false;
        if (this.isPlayerInvisible || this.isInvisCooldown) return false;

        this.isPlayerInvisible = true;
        this.applyMeshInvisibility(true);

        const slotInvis = document.getElementById('slot-invis');
        const slotName = document.getElementById('slot-invis-name');
        slotInvis?.classList.add('active');

        let seconds = 10;
        if (slotName) slotName.textContent = `Invisible (${seconds}s)`;

        this.invisTimer = setInterval(() => {
            seconds--;
            if (seconds > 0) {
                if (slotName) slotName.textContent = `Invisible (${seconds}s)`;
            } else {
                clearInterval(this.invisTimer);
                this.invisTimer = null;
                this.deactivateInvisibility();
            }
        }, 1000);

        this.ctx.addIncidentFeed('👻 Invisible Cloak active for 10s!');
        return true;
    }

    public deactivateInvisibility() {
        this.isPlayerInvisible = false;
        this.applyMeshInvisibility(false);

        const slotInvis = document.getElementById('slot-invis');
        const slotName = document.getElementById('slot-invis-name');
        slotInvis?.classList.remove('active');

        this.isInvisCooldown = true;
        let cd = 15;
        if (slotName) slotName.textContent = `CD (${cd}s)`;

        this.cooldownTimer = setInterval(() => {
            cd--;
            if (cd > 0) {
                if (slotName) slotName.textContent = `CD (${cd}s)`;
            } else {
                clearInterval(this.cooldownTimer);
                this.cooldownTimer = null;
                this.isInvisCooldown = false;
                if (slotName) slotName.textContent = 'Invisible';
            }
        }, 1000);
    }

    public reset() {
        if (this.invisTimer) { clearInterval(this.invisTimer); this.invisTimer = null; }
        if (this.cooldownTimer) { clearInterval(this.cooldownTimer); this.cooldownTimer = null; }
        this.isPlayerInvisible = false;
        this.isInvisCooldown = false;
        this.applyMeshInvisibility(false);
        const slotName = document.getElementById('slot-invis-name');
        if (slotName) slotName.textContent = 'Invisible';
        const slotInvis = document.getElementById('slot-invis');
        slotInvis?.classList.remove('active');
        this.updateSlotVisibility();
    }

    private origMaterialProps = new Map<any, { opacity: number; transparent: boolean }>();

    private applyMeshInvisibility(isInvis: boolean) {
        if (!this.ctx.playerChar?.mesh) return;
        this.ctx.playerChar.mesh.traverse((child: any) => {
            // Hide overhead name tag or any sprite elements so player is truly stealth
            if (child.isSprite) {
                if (isInvis) {
                    if (child.userData.origVisible === undefined) {
                        child.userData.origVisible = child.visible;
                    }
                    child.visible = false;
                } else {
                    if (child.userData.origVisible !== undefined) {
                        child.visible = child.userData.origVisible;
                    }
                }
            }

            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of mats) {
                    if (!mat) continue;
                    if (isInvis) {
                        if (!this.origMaterialProps.has(mat)) {
                            this.origMaterialProps.set(mat, {
                                opacity: mat.opacity !== undefined ? mat.opacity : 1.0,
                                transparent: mat.transparent !== undefined ? mat.transparent : false
                            });
                        }
                        mat.transparent = true;
                        mat.opacity = 0.06; // Ultra-faint ghost silhouette: "isegi mina ei näe aga natuke näen"
                    } else {
                        const orig = this.origMaterialProps.get(mat);
                        if (orig) {
                            mat.opacity = orig.opacity;
                            mat.transparent = orig.transparent;
                        } else {
                            mat.opacity = 1.0;
                            mat.transparent = false;
                        }
                    }
                }
            }
        });
        if (!isInvis) {
            this.origMaterialProps.clear();
        }
    }
}
