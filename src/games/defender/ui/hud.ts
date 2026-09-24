import { GameStats } from '../types';

export class DefenderHud {
    private wavePill: HTMLElement | null = null;
    private scoreBox: HTMLElement | null = null;
    private comboBox: HTMLElement | null = null;
    private earthHpFill: HTMLElement | null = null;
    private earthHpText: HTMLElement | null = null;
    private earthShieldFill: HTMLElement | null = null;
    private earthShieldText: HTMLElement | null = null;
    private dangerBanner: HTMLElement | null = null;
    private gameOverModal: HTMLElement | null = null;
    private ownerOnlyModal: HTMLElement | null = null;
    private soundBtn: HTMLElement | null = null;
    private toastTimer: number | null = null;

    constructor() {
        this.cacheElements();
    }

    private cacheElements() {
        this.wavePill = document.getElementById('hud-wave-pill');
        this.scoreBox = document.getElementById('hud-score');
        this.comboBox = document.getElementById('hud-combo');
        this.earthHpFill = document.getElementById('earth-hp-fill');
        this.earthHpText = document.getElementById('earth-hp-text');
        this.earthShieldFill = document.getElementById('earth-shield-fill');
        this.earthShieldText = document.getElementById('earth-shield-text');
        this.dangerBanner = document.getElementById('danger-banner');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.ownerOnlyModal = document.getElementById('owner-only-modal');
        this.soundBtn = document.getElementById('btn-toggle-sound');
    }

    public updateStats(stats: GameStats) {
        if (this.wavePill) {
            this.wavePill.textContent = `LAINE ${stats.wave}`;
        }
        if (this.scoreBox) {
            this.scoreBox.textContent = `SKOOR: ${stats.score.toLocaleString()}`;
        }
        if (this.comboBox) {
            this.comboBox.textContent = stats.combo > 1 ? `KOMBO: x${stats.combo} 🔥` : `KOMBO: x1`;
            this.comboBox.style.color = stats.combo > 1 ? '#ffd700' : '#a4b0be';
        }

        // Earth HP
        if (this.earthHpFill && this.earthHpText) {
            const hpPct = Math.max(0, Math.min(100, (stats.earthHp / stats.earthMaxHp) * 100));
            this.earthHpFill.style.width = `${hpPct}%`;
            this.earthHpText.textContent = `${stats.earthHp} / ${stats.earthMaxHp} HP`;

            if (hpPct < 30) {
                this.earthHpFill.style.background = 'linear-gradient(90deg, #ff4757, #ff6b81)';
            } else {
                this.earthHpFill.style.background = 'linear-gradient(90deg, #ff4757, #2ed573)';
            }
        }

        // Earth Shield
        if (this.earthShieldFill && this.earthShieldText) {
            const spPct = Math.max(0, Math.min(100, (stats.earthShield / stats.earthMaxShield) * 100));
            this.earthShieldFill.style.width = `${spPct}%`;
            this.earthShieldText.textContent = `${stats.earthShield} / ${stats.earthMaxShield} SP`;
        }

        // Danger banner when Earth is under 35 HP
        if (this.dangerBanner) {
            if (stats.earthHp < 35 && stats.earthHp > 0) {
                this.dangerBanner.style.display = 'block';
            } else {
                this.dangerBanner.style.display = 'none';
            }
        }
    }

    public showGameOver(stats: GameStats) {
        if (this.gameOverModal) {
            const scoreEl = document.getElementById('final-score-val');
            const destEl = document.getElementById('final-destroyed-val');
            const waveEl = document.getElementById('final-wave-val');
            const rewardEl = document.getElementById('reward-pbx-val');

            if (scoreEl) scoreEl.textContent = stats.score.toLocaleString();
            if (destEl) destEl.textContent = stats.asteroidsDestroyed.toString();
            if (waveEl) waveEl.textContent = stats.wave.toString();
            if (rewardEl) rewardEl.textContent = `+${(stats.earnedPbx ?? 50).toLocaleString()}`;

            this.gameOverModal.style.display = 'flex';
        }
    }

    public hideGameOver() {
        if (this.gameOverModal) {
            this.gameOverModal.style.display = 'none';
        }
    }

    public showOwnerLockModal() {
        if (this.ownerOnlyModal) {
            this.ownerOnlyModal.style.display = 'flex';
        }
    }

    public updateSoundButton(enabled: boolean) {
        if (this.soundBtn) {
            this.soundBtn.textContent = enabled ? '🔊 Heli' : '🔇 Heli';
            this.soundBtn.style.opacity = enabled ? '1.0' : '0.6';
        }
    }

    public showToast(text: string, color: string = '#00f2fe') {
        let toastEl = document.getElementById('defender-toast');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'defender-toast';
            toastEl.style.cssText = `
                position: absolute;
                top: 72px;
                right: 16px;
                padding: 10px 16px;
                background: rgba(8, 14, 28, 0.9);
                border: 1.5px solid ${color};
                border-radius: 10px;
                font-weight: 800;
                font-size: 0.85rem;
                color: #ffffff;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                z-index: 120;
                transition: opacity 0.3s;
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(toastEl);
        }

        toastEl.textContent = text;
        toastEl.style.borderColor = color;
        toastEl.style.display = 'block';
        toastEl.style.opacity = '1';

        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = window.setTimeout(() => {
            if (toastEl) {
                toastEl.style.opacity = '0';
                setTimeout(() => { if (toastEl) toastEl.style.display = 'none'; }, 300);
            }
        }, 2500);
    }
}
