import { FoneVariant } from '../types';
import { FONE_VARIANTS } from '../catalog';
import { fonePlayState } from '../state/foneState';

export class FonePlayHUD {
    private onSelectVariantCb: (v: FoneVariant) => void;
    private onReturnToMenuCb: () => void;
    private onOpenPollCb: () => void;

    constructor(
        onSelectVariant: (v: FoneVariant) => void,
        onReturnToMenu: () => void,
        onOpenPoll: () => void
    ) {
        this.onSelectVariantCb = onSelectVariant;
        this.onReturnToMenuCb = onReturnToMenu;
        this.onOpenPollCb = onOpenPoll;
        this.initEvents();
    }

    private initEvents() {
        // Variant cards selection (Option 1, 2, 3)
        const btnV1 = document.getElementById('btn-select-variant-1');
        const btnV2 = document.getElementById('btn-select-variant-2');
        const btnV3 = document.getElementById('btn-select-variant-3');

        btnV1?.addEventListener('click', () => {
            this.onSelectVariantCb(FONE_VARIANTS[0]);
        });
        btnV2?.addEventListener('click', () => {
            this.onSelectVariantCb(FONE_VARIANTS[1]);
        });
        btnV3?.addEventListener('click', () => {
            this.onSelectVariantCb(FONE_VARIANTS[2]);
        });

        // Top bar buttons
        document.getElementById('btn-fone-back-menu')?.addEventListener('click', () => {
            this.onReturnToMenuCb();
        });

        document.getElementById('btn-fone-open-poll')?.addEventListener('click', () => {
            this.onOpenPollCb();
        });

        // Modal "Do you want to vote?" buttons
        document.getElementById('btn-ask-poll-yes')?.addEventListener('click', () => {
            this.hideAskPollModal();
            this.onOpenPollCb();
        });

        document.getElementById('btn-ask-poll-no')?.addEventListener('click', () => {
            this.hideAskPollModal();
            this.showVariantPicker();
        });

        // Live Poll modal close & voting
        document.getElementById('btn-close-poll-modal')?.addEventListener('click', () => {
            this.hidePollModal();
            this.showVariantPicker();
        });

        document.getElementById('btn-poll-vote-1')?.addEventListener('click', () => {
            fonePlayState.castVote(1);
            this.updatePollModalUI();
        });
        document.getElementById('btn-poll-vote-2')?.addEventListener('click', () => {
            fonePlayState.castVote(2);
            this.updatePollModalUI();
        });
        document.getElementById('btn-poll-vote-3')?.addEventListener('click', () => {
            fonePlayState.castVote(3);
            this.updatePollModalUI();
        });

        // Listen for live updates
        window.addEventListener('foneplay:poll_changed', () => {
            this.updatePollModalUI();
        });
    }

    public showVariantPicker() {
        const picker = document.getElementById('variant-picker-overlay');
        const gameplayUi = document.getElementById('gameplay-hud-overlay');
        if (picker) picker.style.display = 'flex';
        if (gameplayUi) gameplayUi.style.display = 'none';
        this.updatePickerBadges();
    }

    public hideVariantPicker() {
        const picker = document.getElementById('variant-picker-overlay');
        const gameplayUi = document.getElementById('gameplay-hud-overlay');
        if (picker) picker.style.display = 'none';
        if (gameplayUi) gameplayUi.style.display = 'flex';
    }

    public updatePickerBadges() {
        const completed = fonePlayState.getCompletedVariants();
        [1, 2, 3].forEach(id => {
            const badge = document.getElementById(`badge-variant-completed-${id}`);
            if (badge) {
                badge.style.display = completed.includes(id) ? 'inline-block' : 'none';
            }
        });
    }

    public updateGameplayHUD(variant: FoneVariant, stepIndex: number, remainingSeconds: number, isActivelyPerforming: boolean = false) {
        const step = variant.steps[stepIndex];
        if (!step) return;

        const titleEl = document.getElementById('active-variant-title');
        const stepNameEl = document.getElementById('active-step-name');
        const instructionEl = document.getElementById('active-step-instruction');
        const timerEl = document.getElementById('step-timer-val');
        const statusEl = document.getElementById('step-active-status');
        const progressBar = document.getElementById('step-progress-fill');

        if (titleEl) {
            titleEl.textContent = variant.title;
            titleEl.style.color = variant.color;
        }
        if (stepNameEl) {
            stepNameEl.textContent = step.name;
        }
        if (instructionEl) {
            instructionEl.textContent = step.instruction;
        }
        if (timerEl) {
            timerEl.textContent = remainingSeconds.toFixed(1) + 's';
        }
        if (statusEl) {
            if (isActivelyPerforming) {
                statusEl.textContent = '⚡ Moving! Counting down...';
                statusEl.style.color = '#2ecc71';
            } else {
                statusEl.textContent = '👉 Waiting for your movement to start 2s timer...';
                statusEl.style.color = '#ffd32a';
            }
        }
        if (progressBar) {
            const total = step.durationSeconds;
            const pct = Math.max(0, Math.min(100, ((total - remainingSeconds) / total) * 100));
            progressBar.style.width = pct + '%';
            progressBar.style.backgroundColor = step.color;
        }
    }

    public showAskPollModal(variantId: number) {
        const modal = document.getElementById('modal-ask-poll');
        const text = document.getElementById('ask-poll-variant-text');
        if (text) {
            text.textContent = `Option ${variantId} completed successfully! 🎉`;
        }
        if (modal) modal.style.display = 'flex';
    }

    public hideAskPollModal() {
        const modal = document.getElementById('modal-ask-poll');
        if (modal) modal.style.display = 'none';
    }

    public showPollModal() {
        this.updatePollModalUI();
        const modal = document.getElementById('modal-live-poll');
        if (modal) modal.style.display = 'flex';
    }

    public hidePollModal() {
        const modal = document.getElementById('modal-live-poll');
        if (modal) modal.style.display = 'none';
    }

    public updatePollModalUI() {
        const state = fonePlayState.getPollState();
        const onlineCountEl = document.getElementById('poll-online-voters-count');
        if (onlineCountEl) {
            onlineCountEl.textContent = String(state.totalVotersOnline);
        }

        const totalVotes = state.votes.v1 + state.votes.v2 + state.votes.v3;

        const setBar = (num: number, votes: number) => {
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const fill = document.getElementById(`poll-bar-fill-${num}`);
            const text = document.getElementById(`poll-votes-text-${num}`);
            const btn = document.getElementById(`btn-poll-vote-${num}`);

            if (fill) fill.style.width = `${pct}%`;
            if (text) text.textContent = `${votes} ${votes === 1 ? 'vote' : 'votes'} (${pct}%)`;

            if (btn) {
                if (state.userVoted === num) {
                    btn.classList.add('voted-active');
                    btn.textContent = 'Your Vote ✔';
                } else {
                    btn.classList.remove('voted-active');
                    btn.textContent = 'Vote';
                }
            }
        };

        setBar(1, state.votes.v1);
        setBar(2, state.votes.v2);
        setBar(3, state.votes.v3);
    }
}
