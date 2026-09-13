import { Team, UnitClass } from '../types';
import { WarGameState } from '../state/warState';

export interface DeployModalCallbacks {
    onConfirm: (team: Team, unitClass: UnitClass) => void;
    showToast: (msg: string, color: string) => void;
    updateHUD: () => void;
}

export class DeployModal {
    private state: WarGameState;
    private callbacks: DeployModalCallbacks;

    constructor(state: WarGameState, callbacks: DeployModalCallbacks) {
        this.state = state;
        this.callbacks = callbacks;
        this.setup();
    }

    public updateRoleBadgesUI() {
        const planeBadge = document.getElementById('plane-lock-badge');
        const missileBadge = document.getElementById('missile-lock-badge');

        if (planeBadge) {
            if (this.state.isPlaneUnlocked) {
                planeBadge.style.background = 'rgba(46, 213, 115, 0.2)';
                planeBadge.style.borderColor = '#2ecc71';
                planeBadge.style.color = '#2ecc71';
                planeBadge.innerText = this.state.isOwnerLang ? '✨ AVATUD' : '✨ UNLOCKED';
            } else {
                planeBadge.style.background = 'rgba(255, 71, 87, 0.2)';
                planeBadge.style.borderColor = '#ff4757';
                planeBadge.style.color = '#ff6b81';
                planeBadge.innerText = '🔒 50,000 €';
            }
        }
        if (missileBadge) {
            if (this.state.isMissileUnlocked) {
                missileBadge.style.background = 'rgba(46, 213, 115, 0.2)';
                missileBadge.style.borderColor = '#2ecc71';
                missileBadge.style.color = '#2ecc71';
                missileBadge.innerText = this.state.isOwnerLang ? '✨ AVATUD' : '✨ UNLOCKED';
            } else {
                missileBadge.style.background = 'rgba(255, 71, 87, 0.2)';
                missileBadge.style.borderColor = '#ff4757';
                missileBadge.style.color = '#ff6b81';
                missileBadge.innerText = '🔒 100,000 €';
            }
        }
    }

    private setup() {
        const deployModal = document.getElementById('modal-deploy-selection');
        const btnBlue = document.getElementById('btn-select-blue');
        const btnRed = document.getElementById('btn-select-red');
        const btnTank = document.getElementById('btn-select-tank');
        const btnHuman = document.getElementById('btn-select-human');
        const btnPlane = document.getElementById('btn-select-plane');
        const btnMissile = document.getElementById('btn-select-missile');
        const btnConfirm = document.getElementById('btn-confirm-deploy');

        let chosenTeam: Team = 'blue';
        let chosenClass: UnitClass = 'tank';

        this.updateRoleBadgesUI();

        btnBlue?.addEventListener('click', () => { chosenTeam = 'blue'; btnBlue.className = 'select-box selected-blue'; btnRed!.className = 'select-box'; });
        btnRed?.addEventListener('click', () => { chosenTeam = 'red'; btnRed.className = 'select-box selected-red'; btnBlue!.className = 'select-box'; });
        btnTank?.addEventListener('click', () => { chosenClass = 'tank'; btnTank.className = 'select-box selected-class'; btnHuman!.className = 'select-box'; if (btnPlane) btnPlane.className = 'select-box'; if (btnMissile) btnMissile.className = 'select-box'; });
        btnHuman?.addEventListener('click', () => { chosenClass = 'soldier'; btnHuman.className = 'select-box selected-class'; btnTank!.className = 'select-box'; if (btnPlane) btnPlane.className = 'select-box'; if (btnMissile) btnMissile.className = 'select-box'; });
        btnPlane?.addEventListener('click', () => {
            if (!this.state.isPlaneUnlocked) {
                if (this.state.warMoney < 50000) {
                    this.callbacks.showToast(this.state.isOwnerLang ? `🔒 Vajad 50,000 € lahingulennuki ostmiseks! Sul on: ${this.state.warMoney.toLocaleString()} €` : `🔒 Requires 50,000 € War Cash! Current: ${this.state.warMoney.toLocaleString()} €`, '#ff4757');
                    return;
                }
                this.state.warMoney -= 50000;
                this.state.isPlaneUnlocked = true;
                this.state.saveUserDataToDb();
                this.callbacks.updateHUD();
                this.updateRoleBadgesUI();
                this.callbacks.showToast(this.state.isOwnerLang ? '✈️ Lahingulennuk edukalt ostetud! (-50,000 €)' : '✈️ Fighter Jet purchased! (-50,000 €)', '#2ecc71');
            }
            chosenClass = 'plane';
            btnPlane.className = 'select-box selected-class'; btnTank!.className = 'select-box'; btnHuman!.className = 'select-box'; if (btnMissile) btnMissile.className = 'select-box';
        });
        btnMissile?.addEventListener('click', () => {
            if (!this.state.isMissileUnlocked) {
                if (this.state.warMoney < 100000) {
                    this.callbacks.showToast(this.state.isOwnerLang ? `🔒 Vajad 100,000 € Raketitiimi ostmiseks! Sul on: ${this.state.warMoney.toLocaleString()} €` : `🔒 Requires 100,000 € War Cash! Current: ${this.state.warMoney.toLocaleString()} €`, '#ff4757');
                    return;
                }
                this.state.warMoney -= 100000;
                this.state.isMissileUnlocked = true;
                this.state.saveUserDataToDb();
                this.callbacks.updateHUD();
                this.updateRoleBadgesUI();
                this.callbacks.showToast(this.state.isOwnerLang ? '🚀 Raketitiim edukalt ostetud! (-100,000 €)' : '🚀 Missile Team purchased! (-100,000 €)', '#2ecc71');
            }
            chosenClass = 'missile';
            btnMissile.className = 'select-box selected-class'; btnTank!.className = 'select-box'; btnHuman!.className = 'select-box'; if (btnPlane) btnPlane.className = 'select-box';
        });

        btnConfirm?.addEventListener('click', () => {
            this.state.localTeam = chosenTeam || 'blue';
            this.state.localClass = chosenClass;
            if (deployModal) deployModal.style.display = 'none';
            this.callbacks.onConfirm(this.state.localTeam, this.state.localClass);
        });

        document.getElementById('btn-open-loadout')?.addEventListener('click', () => {
            this.updateRoleBadgesUI();
            chosenTeam = this.state.localTeam;
            chosenClass = this.state.localClass;
            if (deployModal) deployModal.style.display = 'flex';
        });
    }
}
