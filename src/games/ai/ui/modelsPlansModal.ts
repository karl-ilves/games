import { aiTierService, AI_TIER_CONFIGS, type PlayardAiTier } from '../../../shared/aiTierService';
import { yardService } from '../../../shared/yardService';

export class ModelsPlansModal {
    private static instance: ModelsPlansModal;
    private currentTab: 'model' | 'plans' = 'model';
    private wasAiAssistantOpen = false;

    public static getInstance(): ModelsPlansModal {
        if (!this.instance) {
            this.instance = new ModelsPlansModal();
        }
        return this.instance;
    }

    private initialized = false;

    public init(): void {
        if (this.initialized) return;
        this.initialized = true;

        // Global delegation for opening plus button and modal controls
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            if (target.closest('#btn-ai-model-plus')) {
                this.openModal();
            } else if (target.closest('#btn-close-models-modal') || target.closest('#btn-back-models-modal')) {
                this.closeModal();
            } else if (target.closest('#btn-tab-plans')) {
                this.switchTab('plans');
            } else if (target.closest('#btn-tab-model') || target.closest('#btn-back-to-limit-from-plans')) {
                this.switchTab('model');
            }
        });
    }

    public openModal(): void {
        const modal = document.getElementById('modal-ai-models-plans');
        if (!modal) return;

        // Hide AI assistant modal so it does not stay behind or on top
        const aiModal = document.getElementById('ai-assistant-modal');
        if (aiModal && (aiModal.style.display === 'flex' || window.getComputedStyle(aiModal).display === 'flex')) {
            this.wasAiAssistantOpen = true;
            aiModal.style.display = 'none';
        } else {
            this.wasAiAssistantOpen = false;
        }

        this.renderContent();
        modal.style.display = 'flex';
    }

    public closeModal(): void {
        const modal = document.getElementById('modal-ai-models-plans');
        if (modal) modal.style.display = 'none';

        // When going back, restore AI assistant modal
        if (this.wasAiAssistantOpen) {
            const aiModal = document.getElementById('ai-assistant-modal');
            if (aiModal) {
                aiModal.style.display = 'flex';
            }
        }
    }

    public switchTab(tab: 'model' | 'plans'): void {
        this.currentTab = tab;
        this.renderContent();
    }

    public renderContent(): void {
        const quota = aiTierService.canMakeRequest();
        const activeTier = quota.tier;
        const tierCfg = AI_TIER_CONFIGS[activeTier];
        const limits = aiTierService.getLimits();
        const fiveHourRemaining = limits.fiveHourRemainingPct;
        const fiveDayRemaining = limits.fiveDayRemainingPct;

        // Update Tab buttons visual
        const btnTabPlans = document.getElementById('btn-tab-plans');
        const btnTabModel = document.getElementById('btn-tab-model');
        if (btnTabPlans && btnTabModel) {
            if (this.currentTab === 'plans') {
                btnTabPlans.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
                btnTabPlans.style.color = '#ffffff';
                btnTabModel.style.background = 'rgba(255, 255, 255, 0.06)';
                btnTabModel.style.color = '#94a3b8';
            } else {
                btnTabModel.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
                btnTabModel.style.color = '#ffffff';
                btnTabPlans.style.background = 'rgba(255, 255, 255, 0.06)';
                btnTabPlans.style.color = '#94a3b8';
            }
        }

        const bodyEl = document.getElementById('models-modal-dynamic-body');
        if (!bodyEl) return;

        if (this.currentTab === 'model') {
            // Render Model View with Circular Progress Ring for 5h Limit
            const radius = 46;
            const circumference = 2 * Math.PI * radius; // ~289.02
            const strokeDashoffset5h = circumference * (1 - fiveHourRemaining / 100);
            const ringColor = fiveHourRemaining > 25 ? '#38bdf8' : (fiveHourRemaining > 0 ? '#f59e0b' : '#ef4444');

            bodyEl.innerHTML = `
                <!-- Active Model Card -->
                <div style="background: rgba(30, 41, 59, 0.7); border: 2px solid #38bdf8; border-radius: 14px; padding: 16px; margin-bottom: 16px; box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="font-size: 28px; width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #0284c7, #38bdf8); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);">
                                🤖
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.2px;">
                                    Playard game ai 1.1
                                </h4>
                                <span style="font-size: 11px; color: #38bdf8; font-weight: 600;">⚡ Välkkiire 3D mängulooja & koodimootor</span>
                            </div>
                        </div>
                        <span style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px;">
                            <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
                            Aktiivne
                        </span>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                        Optimeeritud mudel Playard 3D maailmade ehitamiseks, skriptimiseks, füüsika arvutamiseks ja semantiliseks sünteesiks.
                    </p>
                </div>

                <!-- Circular Limit & Usage Ring Container -->
                <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 18px; display: flex; align-items: center; gap: 20px; margin-bottom: 14px;">
                    <!-- SVG Circular Progress Ring (5h Limit) -->
                    <div style="position: relative; width: 115px; height: 115px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                        <svg width="115" height="115" style="transform: rotate(-90deg);">
                            <circle cx="57.5" cy="57.5" r="${radius}" stroke="rgba(255, 255, 255, 0.08)" stroke-width="10" fill="transparent" />
                            <circle cx="57.5" cy="57.5" r="${radius}" stroke="${ringColor}" stroke-width="10" stroke-linecap="round" fill="transparent"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${strokeDashoffset5h}"
                                style="transition: stroke-dashoffset 0.6s ease, stroke 0.4s ease;"
                            />
                        </svg>
                        <div style="position: absolute; text-align: center;">
                            <span style="font-size: 20px; font-weight: 800; color: #ffffff; display: block; line-height: 1;">
                                ${fiveHourRemaining}%
                            </span>
                            <span style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">5h jäänud</span>
                        </div>
                    </div>

                    <!-- Dual Limits Status: 5h and 5 Days -->
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                            <span style="font-size: 13px; font-weight: 700; color: #f1f5f9;">AI Limiidid (${tierCfg.questionLevel})</span>
                            <span style="font-size: 12px; font-weight: 800; color: ${tierCfg.accentColor};">${tierCfg.badge}</span>
                        </div>

                        <!-- 5h limit bar -->
                        <div style="margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-bottom: 3px;">
                                <span>⏳ <strong>5h limiit:</strong></span>
                                <span style="font-weight: 800; color: ${fiveHourRemaining > 20 ? '#38bdf8' : '#ef4444'};">${fiveHourRemaining}% alles (-${tierCfg.pct5hPerQuery}% / küsimus)</span>
                            </div>
                            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${fiveHourRemaining}%; height: 100%; background: ${ringColor}; transition: width 0.3s;"></div>
                            </div>
                        </div>

                        <!-- 5 päeva limit bar -->
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-bottom: 3px;">
                                <span>📅 <strong>5 päeva limiit:</strong></span>
                                <span style="font-weight: 800; color: ${fiveDayRemaining > 20 ? '#10b981' : '#ef4444'};">${fiveDayRemaining}% alles (-${tierCfg.pct5dPerQuery}% / küsimus)</span>
                            </div>
                            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${fiveDayRemaining}%; height: 100%; background: ${fiveDayRemaining > 25 ? '#10b981' : '#f59e0b'}; transition: width 0.3s;"></div>
                            </div>
                        </div>

                        <button type="button" id="btn-open-plans-from-model" style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); border: none; color: #ffffff; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                            <span>📋</span> Vaata Plaane & Suurenda Limiiti
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('btn-open-plans-from-model')?.addEventListener('click', () => {
                this.switchTab('plans');
            });
        } else {
            // Render Plans Selection View
            const userPbx = yardService.getPlaybux();
            const tiers: PlayardAiTier[] = ['FREE', 'PRO', 'PLUS', 'VIP'];

            let plansHtml = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 8px; flex-wrap: wrap;">
                    <button type="button" id="btn-back-to-limit-from-plans" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        ⬅️ Tagasi mudeli ja limiidi juurde
                    </button>
                    <span style="font-size: 12px; font-weight: 700; color: #ffd700; background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3); padding: 3px 10px; border-radius: 12px;">
                        💰 Sinu PlayBux: ${userPbx} PBX
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            `;

            tiers.forEach(t => {
                const cfg = AI_TIER_CONFIGS[t];
                const isActive = activeTier === t;
                const canAfford = userPbx >= cfg.pricePbx;

                plansHtml += `
                    <div style="background: rgba(30, 41, 59, 0.7); border: 2px solid ${isActive ? cfg.accentColor : 'rgba(255, 255, 255, 0.1)'}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
                        ${isActive ? `
                            <span style="position: absolute; top: -10px; right: 12px; background: ${cfg.accentColor}; color: #000; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">
                                Aktiivne Plaan
                            </span>
                        ` : ''}
                        <div>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                                <h5 style="margin: 0; font-size: 14px; font-weight: 800; color: #ffffff;">${cfg.badge}</h5>
                                <span style="font-size: 12px; font-weight: 700; color: #ffd700;">${cfg.pricePbx === 0 ? 'Tasuta' : `${cfg.pricePbx} PBX`}</span>
                            </div>
                            <div style="font-size: 13px; font-weight: 800; color: #ffd32a; margin-bottom: 4px;">
                                💬 ${cfg.questionLevel}
                            </div>
                            <div style="font-size: 11px; font-weight: 700; color: ${cfg.accentColor}; margin-bottom: 8px; line-height: 1.3;">
                                ⏳ 5h limiit: -${cfg.pct5hPerQuery}% / küsimus<br>
                                📅 5 päeva limiit: -${cfg.pct5dPerQuery}% / küsimus
                            </div>
                            <ul style="margin: 0 0 12px 0; padding-left: 16px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                                ${cfg.features.slice(0, 3).map(f => `<li>${f}</li>`).join('')}
                            </ul>
                        </div>
                        <button type="button" class="btn-select-tier" data-tier="${t}" ${isActive ? 'disabled' : ''} style="width: 100%; border: none; border-radius: 8px; padding: 8px; font-size: 12px; font-weight: 700; cursor: ${isActive ? 'default' : 'pointer'}; background: ${isActive ? 'rgba(255,255,255,0.1)' : (canAfford ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#475569')}; color: ${isActive ? '#94a3b8' : '#ffffff'};">
                            ${isActive ? '✓ Valitud' : (canAfford ? `Vali see plaan (${cfg.pricePbx} PBX)` : `Puudu ${cfg.pricePbx - userPbx} PBX`)}
                        </button>
                    </div>
                `;
            });

            plansHtml += `</div>`;
            bodyEl.innerHTML = plansHtml;

            // Bind tier selection buttons
            bodyEl.querySelectorAll('.btn-select-tier').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    const tier = target.getAttribute('data-tier') as PlayardAiTier;
                    if (!tier || tier === activeTier) return;

                    const res = aiTierService.upgradeToTier(tier);
                    if (res.success) {
                        alert(res.message);
                        window.dispatchEvent(new CustomEvent('ai-tier-changed'));
                        this.renderContent();
                    } else {
                        alert(`❌ ${res.message}`);
                    }
                });
            });
        }
    }
}
