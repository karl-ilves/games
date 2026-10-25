import { GeminiCloudEngine } from '../systems/geminiCloudEngine';

export class NeuralKeyModal {
    private static instance: NeuralKeyModal;

    public static getInstance(): NeuralKeyModal {
        if (!this.instance) {
            this.instance = new NeuralKeyModal();
        }
        return this.instance;
    }

    public init(): void {
        const badge = document.getElementById('ai-engine-status-badge');
        const modal = document.getElementById('modal-neural-key');
        const closeBtn = document.getElementById('btn-close-neural-modal');
        const saveBtn = document.getElementById('btn-save-gemini-key');
        const clearBtn = document.getElementById('btn-clear-gemini-key');
        const testModeBtn = document.getElementById('btn-toggle-test-mode');
        const keyInput = document.getElementById('input-gemini-key') as HTMLInputElement | null;

        this.updateBadge();

        if (badge && modal) {
            badge.addEventListener('click', () => {
                if (keyInput) keyInput.value = GeminiCloudEngine.getInstance().getApiKey();
                modal.style.display = 'flex';
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (saveBtn && keyInput && modal) {
            saveBtn.addEventListener('click', () => {
                const key = keyInput.value.trim();
                GeminiCloudEngine.getInstance().setApiKey(key);
                this.updateBadge();
                modal.style.display = 'none';
                alert(key ? '✅ Gemini API võti salvestatud! Playard AI töötab nüüd tasemel 8000+ (Gemini).' : 'ℹ️ Võti eemaldatud. Kasutatakse lokaalset tuletusmootorit (Tase 1800).');
            });
        }

        if (clearBtn && keyInput && modal) {
            clearBtn.addEventListener('click', () => {
                GeminiCloudEngine.getInstance().setApiKey('');
                if (keyInput) keyInput.value = '';
                this.updateBadge();
                modal.style.display = 'none';
                alert('ℹ️ Lülituti lokaalsele mootorile (Tase 1800).');
            });
        }

        if (testModeBtn && modal) {
            testModeBtn.addEventListener('click', () => {
                (window as any).__PLAYARD_NEURAL_TEST_MODE__ = !(window as any).__PLAYARD_NEURAL_TEST_MODE__;
                this.updateBadge();
                modal.style.display = 'none';
                const isTest = (window as any).__PLAYARD_NEURAL_TEST_MODE__;
                alert(isTest ? '⚡ Tase 8000 Närvimootor (Test Simulatsioon) sisse lülitatud!' : '⚙️ Tase 1800 Lokaalne mootor aktiivne.');
            });
        }

        window.addEventListener('playard_neural_status_changed', () => {
            this.updateBadge();
        });
    }

    public updateBadge(): void {
        const status = GeminiCloudEngine.getInstance().getStatus();
        const iconEl = document.getElementById('ai-engine-icon');
        const textEl = document.getElementById('ai-engine-text');
        const badgeEl = document.getElementById('ai-engine-status-badge');

        if (textEl) {
            textEl.textContent = status.tier === 'HYBRID_8000' ? '⚡ Tase 8000 (Gemini)' : '⚙️ Tase 1800 (Lokaalne)';
            textEl.style.color = status.badgeColor;
        }
        if (iconEl) {
            iconEl.textContent = status.tier === 'HYBRID_8000' ? '🧠⚡' : '⚙️';
        }
        if (badgeEl) {
            badgeEl.title = `${status.label}\n${status.description}\nKlõpsa seadistamiseks.`;
            badgeEl.style.borderColor = status.tier === 'HYBRID_8000' ? 'rgba(168, 85, 247, 0.6)' : 'rgba(56, 189, 248, 0.4)';
        }
    }
}
