import { yardService } from '../../../shared/yardService';
import { RocketType } from '../types';

export class HudManager {
    public showImpactToast(text: string) {
        const container = document.getElementById('impact-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'boom-toast';
        toast.textContent = text;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 1300);
    }

    public triggerViewportShake() {
        const wrapper = document.getElementById('game-viewport-wrapper');
        if (wrapper) {
            wrapper.classList.remove('screen-shake');
            void wrapper.offsetWidth;
            wrapper.classList.add('screen-shake');
        }
        this.triggerNuclearScreenFlash();
    }

    public triggerNuclearScreenFlash() {
        const flashOverlay = document.getElementById('nuke-flash-overlay');
        const thermalTint = document.getElementById('nuke-thermal-tint');

        if (flashOverlay) {
            flashOverlay.style.opacity = '1';
            setTimeout(() => {
                flashOverlay.style.transition = 'opacity 0.75s ease-out';
                flashOverlay.style.opacity = '0';
            }, 60);
        }

        if (thermalTint) {
            setTimeout(() => {
                thermalTint.style.opacity = '0.85';
                setTimeout(() => {
                    thermalTint.style.transition = 'opacity 1.8s ease-out';
                    thermalTint.style.opacity = '0';
                }, 400);
            }, 80);
        }
    }

    public toggleModal(id: string, show: boolean) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = show ? 'flex' : 'none';
        }
    }

    public updateHUD(roundRemaining: number, currentScore: number, equippedRocket: RocketType) {
        const timerText = document.getElementById('hud-timer-text');
        if (timerText) {
            const m = Math.floor(roundRemaining / 60);
            const s = roundRemaining % 60;
            timerText.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        const scoreText = document.getElementById('hud-score-text');
        if (scoreText) scoreText.textContent = `${currentScore} PTS`;

        const rocketName = document.getElementById('hud-rocket-name');
        if (rocketName) rocketName.textContent = equippedRocket.name;

        const rocketIcon = document.getElementById('hud-rocket-icon');
        if (rocketIcon) rocketIcon.textContent = equippedRocket.icon;

        const yardText = document.getElementById('hud-yard-text');
        if (yardText) {
            try {
                yardText.textContent = `${yardService.getYards()} Y`;
            } catch (e) {
                yardText.textContent = '0 Y';
            }
        }
    }
}
