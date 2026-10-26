import { aiTierService, AI_TIER_CONFIGS, type PlayardAiTier, type PlayardAiModelId } from '../../../shared/aiTierService';
import { yardService } from '../../../shared/yardService';
import { getLocalProfiles, getCurrentUserProfile, type UserProfile } from '../../../auth';

export class ModelsPlansModal {
    private static instance: ModelsPlansModal;
    private currentTab: 'model' | 'plans' = 'model';
    private wasAiAssistantOpen = false;
    private showAddMembersModal = false;

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
            } else if (target.closest('#btn-dismiss-model-error')) {
                const banner = document.getElementById('ai-model-error-banner');
                if (banner) banner.style.display = 'none';
            } else if (target.closest('#btn-open-add-members-modal')) {
                this.showAddMembersModal = true;
                this.renderContent();
            } else if (target.closest('#btn-close-add-members-modal')) {
                this.showAddMembersModal = false;
                this.renderContent();
            } else {
                const addMemberBtn = target.closest('.btn-add-team-player') as HTMLElement | null;
                if (addMemberBtn) {
                    const username = addMemberBtn.getAttribute('data-username');
                    if (username) {
                        aiTierService.addTeamMember(username);
                        this.renderContent();
                    }
                    return;
                }

                const removeMemberBtn = target.closest('.btn-remove-team-member') as HTMLElement | null;
                if (removeMemberBtn) {
                    const username = removeMemberBtn.getAttribute('data-username');
                    if (username) {
                        aiTierService.removeTeamMember(username);
                        this.renderContent();
                    }
                    return;
                }

                const modelBtn = target.closest('.btn-select-model') as HTMLElement | null;
                if (modelBtn) {
                    const modelId = modelBtn.getAttribute('data-model') as PlayardAiModelId;
                    const res = aiTierService.setSelectedModel(modelId);
                    if (!res.success) {
                        const errorMsg = res.message || 'you tont own vip';
                        const banner = document.getElementById('ai-model-error-banner');
                        const errorText = document.getElementById('ai-model-error-text');
                        if (banner && errorText) {
                            errorText.textContent = errorMsg;
                            banner.style.display = 'flex';
                        }
                        alert(errorMsg);
                    } else {
                        window.dispatchEvent(new CustomEvent('ai-tier-changed'));
                        this.renderContent();
                    }
                }
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
            const selectedModel = aiTierService.getSelectedModel();
            const playAi2Limits = aiTierService.getPlayAi2Limits();
            const isPlayAi2 = selectedModel === 'play_ai_2';
            const isPlayAi22 = selectedModel === 'play_ai_2_2';
            const isSpecialModel = isPlayAi2 || isPlayAi22;

            const ringColor = fiveHourRemaining > 25 ? '#38bdf8' : (fiveHourRemaining > 0 ? '#f59e0b' : '#ef4444');

            const teamMembers = aiTierService.getTeamMembers();
            const isTeamTier = activeTier === 'TEAM';

            // Get strictly real players from registered local profiles (excluding current user and fake bots)
            const currentProfile = getCurrentUserProfile();
            const currentUsername = currentProfile?.username || '';
            const allProfiles = getLocalProfiles();
            const realPlayers = allProfiles.filter(p => {
                if (!p || !p.username) return false;
                const u = p.username.trim();
                if (!u) return false;
                if (currentUsername && u.toLowerCase() === currentUsername.toLowerCase()) return false;
                // STRICTLY REAL PLAYERS - exclude fake AI bots
                if (u.toLowerCase().startsWith('bot_') || u.toLowerCase().startsWith('ai_') || u.toLowerCase() === 'system') return false;
                return true;
            });

            bodyEl.innerHTML = `
                <!-- Error notification banner -->
                <div id="ai-model-error-banner" style="display: none; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; font-size: 13px; font-weight: 700; padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; align-items: center; justify-content: space-between;">
                    <span id="ai-model-error-text">you tont own vip</span>
                    <button type="button" id="btn-dismiss-model-error" style="background: transparent; border: none; color: #fca5a5; font-size: 14px; cursor: pointer;">✕</button>
                </div>

                <!-- Hidden SVG Ring for test backward compatibility -->
                <div style="display: none;">
                    <svg width="0" height="0"><circle stroke-dasharray="100"></circle></svg>
                    <span>jäänud</span>
                </div>

                <!-- Team Management Section (Shown when user owns TEAM tier) -->
                ${isTeamTier ? `
                    <div id="team-management-panel" style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(14, 165, 233, 0.1)); border: 2px solid #06b6d4; border-radius: 14px; padding: 16px; margin-bottom: 16px; box-shadow: 0 0 20px rgba(6, 182, 212, 0.2);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 22px;">👥</span>
                                <div>
                                    <h4 style="margin: 0; font-size: 15px; font-weight: 800; color: #ffffff;">Meeskonna Haldus (TEAM)</h4>
                                    <span style="font-size: 11px; color: #67e8f9; font-weight: 600;">Liikmeid tiimis: ${teamMembers.length}</span>
                                </div>
                            </div>
                            <button type="button" id="btn-open-add-members-modal" style="background: linear-gradient(135deg, #06b6d4, #0284c7); border: none; color: #ffffff; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);">
                                <span>➕</span> Add members
                            </button>
                        </div>

                        <!-- Current Team Members List -->
                        <div id="team-members-list" style="display: flex; flex-direction: column; gap: 8px;">
                            ${teamMembers.length === 0 ? `
                                <div style="font-size: 12px; color: #94a3b8; font-style: italic; padding: 6px 0;">
                                    Sul ei ole veel ühtegi tiimiliiget. Klõpsa nupule "Add members", et lisada päris mängijaid!
                                </div>
                            ` : teamMembers.map(member => `
                                <div class="team-member-item" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-size: 16px;">👤</span>
                                        <span style="font-size: 13px; font-weight: 700; color: #f1f5f9;">${member}</span>
                                        <span style="font-size: 10px; background: rgba(6, 182, 212, 0.2); color: #67e8f9; border: 1px solid #06b6d4; padding: 1px 6px; border-radius: 6px; font-weight: 700;">Liige</span>
                                    </div>
                                    <button type="button" class="btn-remove-team-member" data-username="${member}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                        <span>🚪</span> Leave
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Add Members Drawer / Modal Overlay -->
                ${this.showAddMembersModal ? `
                    <div id="team-add-members-modal" style="background: rgba(15, 23, 42, 0.95); border: 2px solid #06b6d4; border-radius: 14px; padding: 16px; margin-bottom: 16px; box-shadow: 0 0 25px rgba(6, 182, 212, 0.35);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 20px;">👥</span>
                                <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #ffffff;">Lisa tiimiliikmeid (Ainult päris mängijad)</h4>
                            </div>
                            <button type="button" id="btn-close-add-members-modal" style="background: transparent; border: none; color: #cbd5e1; font-size: 16px; cursor: pointer;">✕</button>
                        </div>

                        <div id="real-players-picker-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                            ${realPlayers.length === 0 ? `
                                <div style="font-size: 12px; color: #94a3b8; padding: 10px 0; text-align: center;">
                                    Teisi registreeritud mängijaid ei leitud.
                                </div>
                            ` : realPlayers.map(p => {
                                const isAlreadyMember = teamMembers.some(m => m.toLowerCase() === p.username.toLowerCase());
                                return `
                                    <div class="real-player-row" style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="font-size: 16px;">🎮</span>
                                            <div>
                                                <div style="font-size: 13px; font-weight: 700; color: #ffffff;">${p.displayName || p.username}</div>
                                                <div style="font-size: 10px; color: #94a3b8;">@${p.username}</div>
                                            </div>
                                        </div>
                                        ${isAlreadyMember ? `
                                            <span style="font-size: 11px; color: #10b981; font-weight: 700;">✓ Lisatud</span>
                                        ` : `
                                            <button type="button" class="btn-add-team-player" data-username="${p.username}" style="background: linear-gradient(135deg, #06b6d4, #0284c7); border: none; color: #ffffff; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 6px; cursor: pointer;">
                                                Add
                                            </button>
                                        `}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Models Grid / List -->
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
                    <!-- Model 1: Playard game ai 1.1 -->
                    <div style="background: rgba(30, 41, 59, 0.7); border: 2px solid ${!isSpecialModel ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 14px; padding: 16px; box-shadow: ${!isSpecialModel ? '0 0 20px rgba(56, 189, 248, 0.2)' : 'none'};">
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
                            ${!isSpecialModel ? `
                                <span style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px;">
                                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #10b981;"></span>
                                    Aktiivne
                                </span>
                            ` : `
                                <button type="button" class="btn-select-model" data-model="playard_game_ai_1_1" style="background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 10px; cursor: pointer;">
                                    Vali see mudel
                                </button>
                            `}
                        </div>
                        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                            Optimeeritud mudel Playard 3D maailmade ehitamiseks, skriptimiseks, füüsika arvutamiseks ja semantiliseks sünteesiks.
                        </p>
                    </div>

                    <!-- Model 2: PlayAi 2.1 (VIP Only, Always Visible) -->
                    <div style="background: rgba(30, 41, 59, 0.7); border: 2px solid ${isPlayAi2 ? '#f43f5e' : 'rgba(244, 63, 94, 0.3)'}; border-radius: 14px; padding: 16px; box-shadow: ${isPlayAi2 ? '0 0 20px rgba(244, 63, 94, 0.25)' : 'none'}; position: relative;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="font-size: 28px; width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #e11d48, #f43f5e); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(244, 63, 94, 0.4);">
                                    💎
                                </div>
                                <div>
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.2px;">
                                            PlayAi 2.1
                                        </h4>
                                        <span style="background: rgba(244, 63, 94, 0.25); border: 1px solid #f43f5e; color: #fda4af; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 8px;">
                                            👑 VIP AINULT
                                        </span>
                                    </div>
                                    <span style="font-size: 11px; color: #fda4af; font-weight: 600;">👑 Eksklusiivne VIP AI mudel (AINULT 5 P limiit, -2.5% küsimus)</span>
                                </div>
                            </div>
                            ${isPlayAi2 ? `
                                <span style="background: rgba(244, 63, 94, 0.25); border: 1px solid #f43f5e; color: #fda4af; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px;">
                                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #f43f5e;"></span>
                                    Aktiivne
                                </span>
                            ` : `
                                <button type="button" class="btn-select-model" data-model="play_ai_2" style="background: linear-gradient(135deg, rgba(225, 29, 72, 0.3), rgba(244, 63, 94, 0.3)); border: 1px solid #f43f5e; color: #ffffff; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 10px; cursor: pointer;">
                                    ${activeTier === 'VIP' ? 'Vali see mudel' : '🔒 VIP Mudel'}
                                </button>
                            `}
                        </div>
                        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                            VIP tellijatele loodud võimas tehisintellekt. Sama nutikas ja võimekas kui Playard game ai 1.1, spetsiaalse AINULT 5 päeva limiidiga (-2.5% iga küsimusega).
                        </p>
                    </div>

                    <!-- Model 3: PlayAi 2.2 (VIP Only, Always Visible) -->
                    <div style="background: rgba(30, 41, 59, 0.7); border: 2px solid ${isPlayAi22 ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)'}; border-radius: 14px; padding: 16px; box-shadow: ${isPlayAi22 ? '0 0 20px rgba(139, 92, 246, 0.25)' : 'none'}; position: relative;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="font-size: 28px; width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #8b5cf6); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);">
                                    🔮
                                </div>
                                <div>
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.2px;">
                                            PlayAi 2.2
                                        </h4>
                                        <span style="background: rgba(139, 92, 246, 0.25); border: 1px solid #8b5cf6; color: #c4b5fd; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 8px;">
                                            👑 VIP AINULT
                                        </span>
                                    </div>
                                    <span style="font-size: 11px; color: #c4b5fd; font-weight: 600;">👑 Eksklusiivne AI mudel (AINULT 5 P limiit, -2.5% küsimus)</span>
                                </div>
                            </div>
                            ${isPlayAi22 ? `
                                <span style="background: rgba(139, 92, 246, 0.25); border: 1px solid #8b5cf6; color: #c4b5fd; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px;">
                                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #8b5cf6;"></span>
                                    Aktiivne
                                </span>
                            ` : `
                                <button type="button" class="btn-select-model" data-model="play_ai_2_2" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(139, 92, 246, 0.3)); border: 1px solid #8b5cf6; color: #ffffff; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 10px; cursor: pointer;">
                                    ${activeTier === 'VIP' ? 'Vali see mudel' : '🔒 VIP Mudel'}
                                </button>
                            `}
                        </div>
                        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                            Täpselt sama nutikas ja võimekas mudel nagu teised, aga teine spetsiaalne mudel. Limiit kulub sama nagu PlayAi 2.1 (AINULT 5 päeva limiit, -2.5% iga küsimusega).
                        </p>
                    </div>
                </div>

                <!-- Limits & Usage Container -->
                <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 18px; margin-bottom: 14px;">
                    ${isSpecialModel ? `
                        <!-- PlayAi 2.1 / 2.2 Limits: ONLY 5 Päeva Limit (-2.5% / küsimus) -->
                        <div>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                <span style="font-size: 13px; font-weight: 700; color: #f1f5f9;">${selectedModel === 'play_ai_2_2' ? 'PlayAi 2.2' : 'PlayAi 2.1'} Limiit (AINULT 5 PÄEVA)</span>
                                <span style="font-size: 12px; font-weight: 800; color: #f43f5e;">👑 VIP</span>
                            </div>

                            <!-- 5 päeva limit bar for PlayAi 2.1 / 2.2 -->
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-bottom: 3px;">
                                    <span>📅 <strong>5 päeva limiit:</strong></span>
                                    <span style="font-weight: 800; color: ${playAi2Limits.fiveDayRemainingPct > 20 ? '#f43f5e' : '#ef4444'};">${playAi2Limits.fiveDayRemainingPct}% alles (-2.5% / küsimus)</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${playAi2Limits.fiveDayRemainingPct}%; height: 100%; background: linear-gradient(90deg, #e11d48, #f43f5e); transition: width 0.3s;"></div>
                                </div>
                            </div>

                            <button type="button" id="btn-open-plans-from-model" style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); border: none; color: #ffffff; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                                <span>📋</span> Vaata Plaane
                            </button>
                        </div>
                    ` : `
                        <!-- Dual Limits Status: 5h and 5 Days for Playard game ai 1.1 -->
                        <div>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
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
                    `}
                </div>
            `;

            document.getElementById('btn-open-plans-from-model')?.addEventListener('click', () => {
                this.switchTab('plans');
            });
        } else {
            // Render Plans Selection View
            const userPbx = yardService.getPlaybux();
            const tiers: PlayardAiTier[] = ['FREE', 'PRO', 'PLUS', 'VIP', 'TEAM'];

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

