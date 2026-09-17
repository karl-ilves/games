import { GameState } from '../state/gameState';

export class CrownHud {
    private gameState: GameState;
    private stagePill: HTMLElement | null;
    private ownerBadge: HTMLElement | null;
    private resetBtn: HTMLElement | null;
    private victoryModal: HTMLElement | null;
    private onReset?: () => void;

    constructor(gameState: GameState, onReset?: () => void) {
        this.gameState = gameState;
        this.onReset = onReset;

        this.stagePill = document.getElementById('hud-stage-pill');
        this.ownerBadge = document.getElementById('owner-hud-badge');
        this.resetBtn = document.getElementById('btn-reset-checkpoint');
        this.victoryModal = document.getElementById('victory-modal');

        this.initEventListeners();
        this.update();
    }

    private initEventListeners() {
        if (this.resetBtn && this.onReset) {
            this.resetBtn.addEventListener('click', () => {
                this.onReset?.();
            });
        }

        const claimBtn = document.getElementById('btn-claim-reward');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                // Equip crown and notify user
                try {
                    const avatar = (window as any).playardAvatar;
                    if (avatar?.service) {
                        avatar.service.equipItem('hat_royal_crown');
                    }
                } catch (e) {}

                claimBtn.textContent = '✅ Crown & Outfit equipped!';
                claimBtn.setAttribute('disabled', 'true');
                (claimBtn as HTMLElement).style.opacity = '0.7';
            });
        }
    }

    public update() {
        const stage = this.gameState.getStage();
        const max = this.gameState.getMaxStage();
        const pct = this.gameState.getPercentage();

        if (this.stagePill) {
            this.stagePill.textContent = `STAGE ${stage} / ${max} (${pct}%)`;
        }

        if (this.ownerBadge) {
            this.ownerBadge.style.display = this.gameState.getIsOwner() ? 'inline-block' : 'none';
        }
    }

    public showVictory() {
        if (this.victoryModal) {
            this.victoryModal.style.display = 'flex';
        }
    }
}
