import { AiState } from './state/aiState';
import { ConversationEngine, type ParsedCommand } from './systems/conversationEngine';
import { StepPlanner } from './systems/stepPlanner';
import { GameGenerator } from './systems/gameGenerator';
import { SceneModifier } from './systems/sceneModifier';
import { SelfVerifier } from './systems/selfVerifier';
import { AuditLogger } from './systems/auditLogger';
import { PreviewViewport } from './world/previewViewport';
import { ChatView } from './ui/chatView';
import { StepTrackerView } from './ui/stepTrackerView';
import { yardService } from '../../shared/yardService';
import { aiTierService, AI_TIER_CONFIGS } from '../../shared/aiTierService';
import {
    AiCodeAndSystemEngine,
    PlayardNaturalLanguageCompiler,
    PlayardEconomyAndBalanceEngine,
    PlayardPerformanceOptimizer,
    PlayardCoPilotAdvisor,
    type TechnicalGamePlan
} from '../../shared/playardAiKnowledge';



class PlayardAiApp {
    public state: AiState;
    public viewport!: PreviewViewport;
    private chatView!: ChatView;
    private stepTracker!: StepTrackerView;

    constructor() {
        this.state = AiState.getInstance();
        this.initUI();
        this.initEventListeners();
    }

    private initUI() {
        const viewportContainer = document.getElementById('ai-viewport-container');
        if (viewportContainer) {
            this.viewport = new PreviewViewport(viewportContainer);
        }

        const stepTrackerContainer = document.getElementById('ai-step-tracker-container');
        if (stepTrackerContainer) {
            this.stepTracker = new StepTrackerView(stepTrackerContainer);
            this.stepTracker.render(this.state.getCurrentSteps(), this.state.getIsBuilding());
        }

        const chatContainer = document.getElementById('ai-chat-container');
        if (chatContainer) {
            this.chatView = new ChatView(chatContainer, {
                onSendMessage: (text) => this.handleUserInput(text),
                onSelectClarification: (opt) => this.handleUserInput(opt),
                onInspectCode: (code) => this.showCodeModal(code)
            });
            this.chatView.render(this.state.getMessages(), this.state.getIsBuilding());
        }

        this.state.subscribe(() => {
            if (this.chatView) {
                this.chatView.render(this.state.getMessages(), this.state.getIsBuilding());
            }
            if (this.stepTracker) {
                this.stepTracker.render(this.state.getCurrentSteps(), this.state.getIsBuilding());
            }
            if (this.viewport) {
                this.viewport.renderScene(this.state.getActiveScene());
            }
            this.updateHeaderBadges();
        });
    }

    private initEventListeners() {
        // Submit for Owner Review
        document.getElementById('btn-submit-review')?.addEventListener('click', () => {
            const scene = this.state.getActiveScene();
            if (!scene) return alert('Esmalt loo või ava mäng!');
            const games = JSON.parse(localStorage.getItem('playard_pending_review_games') || '[]');
            games.push({ id: scene.id, title: scene.title, description: scene.description, author: yardService.getCurrentUsername() || 'Playard AI Creator', status: 'pending_owner_review', submittedAt: Date.now(), sceneData: scene });
            localStorage.setItem('playard_pending_review_games', JSON.stringify(games));
            this.state.addSystemMessage(`📋 Mäng "${scene.title}" on esitatud Playard Ownerile ülevaatamiseks!`);
            alert(`✅ Mäng "${scene.title}" edukalt saadetud ülevaatamisele!`);
        });

        // Open in Creator Studio
        document.getElementById('btn-open-creator')?.addEventListener('click', () => {
            const scene = this.state.getActiveScene();
            if (!scene) return alert('Esmalt genereeri mäng!');
            localStorage.setItem('playard_imported_ai_scene', JSON.stringify(scene));
            window.location.href = '/games/creator/index.html?ai_import=1';
        });

        // Test play
        document.getElementById('btn-test-play')?.addEventListener('click', () => {
            const scene = this.state.getActiveScene();
            if (!scene) return alert('Esmalt genereeri mäng!');
            const desc = document.getElementById('test-play-desc');
            if (desc) desc.textContent = `${scene.title}: ${scene.rules.objective}`;
            const modal = document.getElementById('modal-test-play');
            if (modal) modal.style.display = 'flex';
        });

        document.getElementById('btn-close-test-play')?.addEventListener('click', () => {
            const modal = document.getElementById('modal-test-play');
            if (modal) modal.style.display = 'none';
        });


        // Close Code Modal
        document.getElementById('btn-close-code-modal')?.addEventListener('click', () => {
            const modal = document.getElementById('modal-code-inspect');
            if (modal) modal.style.display = 'none';
        });
    }

    private updateHeaderBadges() {
        const scene = this.state.getActiveScene();
        const titleEl = document.getElementById('ai-current-game-title');
        const objectsCountEl = document.getElementById('ai-current-objects-count');

        if (titleEl) {
            titleEl.textContent = scene ? scene.title : 'Pole aktiivset mängu';
        }
        if (objectsCountEl) {
            objectsCountEl.textContent = scene ? `${scene.objects.length} 3D objekti` : '0 objekti';
        }
    }

    public async handleUserInput(input: string) {
        if (!input.trim() || this.state.getIsBuilding()) return;

        this.state.addUserMessage(input);

        // AI Tier ja 24h päevalimiidi kontroll
        const quotaCheck = aiTierService.canMakeRequest();
        if (!quotaCheck.allowed) {
            const activeCfg = AI_TIER_CONFIGS[quotaCheck.tier];
            this.state.addAiMessage(
                `🚫 ${quotaCheck.message}\n\nAktiivne tase: ${activeCfg.badge} (${quotaCheck.dailyLimit} küsimust päevas).\nTänaseks kasutatud: ${quotaCheck.usedToday} / ${quotaCheck.dailyLimit}.\nVali kõrgem AI tase (PRO / PLUS / VIP) või oota 24h limiidi lähtestamiseni.`
            );
            return;
        }
        aiTierService.recordRequest();

        const parsed = await ConversationEngine.parseInput(input, this.state.getActiveScene());

        // Turvakontroll
        if (parsed.intent === 'SECURITY_VIOLATION') {
            AuditLogger.logAction({
                prompt: input,
                intent: 'SECURITY_VIOLATION',
                isSafe: false,
                riskLevel: 'blocked',
                violations: parsed.safetyReport.violations,
                stepsCount: 0,
                status: 'blocked'
            });

            this.state.addAiMessage(
                '❌ Tegevus blokeeritud turvapoliitika rikkumise tõttu.',
                {
                    safetyWarning: parsed.safetyReport.violations.join('; ')
                }
            );
            return;
        }

        // Täpsustuse küsimine
        if (parsed.intent === 'CLARIFICATION_NEEDED') {
            this.state.addAiMessage(
                parsed.clarificationQuestion || 'Täpsusta palun oma soovi:',
                {
                    clarificationOptions: parsed.clarificationOptions
                }
            );
            return;
        }

        // Üldteadmised, teadus, kosmos, tehnoloogia või anti-hallutsinatsiooni selgitus
        if (parsed.intent === 'GENERAL_KNOWLEDGE') {
            this.state.addAiMessage(parsed.parameters?.answer || 'Siin on vastus sinu küsimusele.');
            return;
        }

        // 7-etapiline arenduskonveier (IDEA -> PLAAN -> LOOMINE -> KOOD -> TESTIMINE -> PARANDAMINE -> AVALDAMINE)
        if (parsed.intent === 'PIPELINE_STEP') {
            const guidance = parsed.parameters?.guidance;
            const stage = parsed.parameters?.stage;
            if (guidance) {
                const checklist = guidance.checklist.map((c: string) => `• ${c}`).join('\n');
                const msg = `🚀 **Playard Arenduskonveier: Etapp ${guidance.stageNumber} / 7 – ${guidance.title} (${stage})**\n\n${guidance.description}\n\n📋 **Tegevuskava & Kontrollnimekiri:**\n${checklist}\n\n💡 **Soovitus:** ${guidance.actionPrompt}`;
                this.state.addAiMessage(msg, guidance.codeTemplate ? { codeSnippet: guidance.codeTemplate } : undefined);
                return;
            }
        }

        // Koodi parandamine, silumine ja optimeerimine
        if (parsed.intent === 'CODE_ASSIST') {
            const repair = AiCodeAndSystemEngine.repairCode(parsed.rawText);
            const bugs = repair.detectedBugs.map(b => `• ⚠️ ${b}`).join('\n');
            const msg = `🛠️ **Playard AI Koodimootor:**\n\n${repair.explanation}\n\n**Tuvastatud parandused:**\n${bugs}`;
            this.state.addAiMessage(msg, { codeSnippet: repair.fixedCode });
            return;
        }

        // UI komponentide genereerimine (Shop, Inventory, HUD jne)
        if (parsed.intent === 'UI_GEN') {
            const comp = AiCodeAndSystemEngine.generateUIComponent(parsed.parameters?.uiType || 'hud');
            const msg = `🎨 **Playard UI Generaator:** Lõin valmis puhta kasutajaliidese komponendi (${parsed.parameters?.uiType || 'hud'}).`;
            this.state.addAiMessage(msg, { codeSnippet: `${comp.html}\n\n<script>\n${comp.script}\n</script>` });
            return;
        }

        // Loomuliku keele tehniline kompileerimine (9 alamsüsteemi)
        if (parsed.intent === 'TECHNICAL_COMPILATION') {
            const plan: TechnicalGamePlan = parsed.parameters?.plan;
            if (plan) {
                this.state.addAiMessage(PlayardNaturalLanguageCompiler.formatPlan(plan));
                return;
            }
        }

        // 10/10 AI: Majanduse tasakaalustus, 60 FPS jõudlus & Co-Pilot nõuanded
        if (parsed.intent === 'ECONOMY_BALANCE') {
            this.state.addAiMessage(PlayardEconomyAndBalanceEngine.formatReport(parsed.parameters?.balance));
            return;
        }
        if (parsed.intent === 'PERFORMANCE_OPTIMIZE') {
            this.state.addAiMessage(PlayardPerformanceOptimizer.formatReport(parsed.parameters?.perf));
            return;
        }
        if (parsed.intent === 'COPILOT_ADVISE') {
            this.state.addAiMessage(PlayardCoPilotAdvisor.formatReport(parsed.parameters?.advice));
            return;
        }

        // Planeeri sammud

        const steps = StepPlanner.planSteps(parsed);

        this.state.setCurrentSteps(steps);
        this.state.setIsBuilding(true);

        try {
            if (parsed.intent === 'CREATE_GAME') {
                await this.executeGameCreation(parsed);
            } else {
                await this.executeModification(parsed);
            }
        } finally {
            this.state.setIsBuilding(false);
        }
    }

    private async executeGameCreation(parsed: ParsedCommand) {
        const steps = this.state.getCurrentSteps();
        const theme = parsed.parameters?.theme || 'custom_adventure';
        const title = parsed.parameters?.title || 'Uus Mäng';

        // Step by step visual execution
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            this.state.updateStepStatus(step.id, 'in_progress');
            await new Promise(r => setTimeout(r, (window as any).__FAST_TEST_MODE__ ? 10 : 250));
            this.state.updateStepStatus(step.id, 'completed');
        }

        const newScene = GameGenerator.generateGame(theme, title, parsed.parameters?.rawPrompt || parsed.rawText);
        this.state.setActiveScene(newScene);

        // Self-verification
        const verification = SelfVerifier.verifyScene(newScene);

        AuditLogger.logAction({
            prompt: parsed.rawText,
            intent: parsed.intent,
            isSafe: true,
            riskLevel: 'safe',
            stepsCount: steps.length,
            gameId: newScene.id,
            gameTitle: newScene.title,
            status: 'success'
        });

        // AI Response with verification report
        const checkSummary = verification.checks.map(c => `${c.passed ? '✅' : '⚠️'} ${c.name}: ${c.message}`).join('\n');
        this.state.addAiMessage(
            `Valmis! Lõin mängu "${newScene.title}".\n\n${verification.summary}\n\n${checkSummary}`,
            {
                codeSnippet: `// Playard Scripting Engine v1.0\n// Generated for: ${newScene.title}\n${newScene.objects.filter(o => o.script).map(o => `// Object [${o.name}]:\n${o.script}`).join('\n\n')}`,
                isVerificationReport: true
            }
        );
    }

    private async executeModification(parsed: ParsedCommand) {
        let scene = this.state.getActiveScene();
        if (!scene) {
            scene = GameGenerator.generateGame('custom_adventure', 'Playard Maailm');
            this.state.setActiveScene(scene);
        }

        const steps = this.state.getCurrentSteps();
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            this.state.updateStepStatus(step.id, 'in_progress');
            await new Promise(r => setTimeout(r, (window as any).__FAST_TEST_MODE__ ? 10 : 200));
            this.state.updateStepStatus(step.id, 'completed');
        }

        const result = SceneModifier.applyCommand(scene, parsed);
        this.state.setActiveScene(result.modifiedScene);

        const verification = SelfVerifier.verifyScene(result.modifiedScene);

        AuditLogger.logAction({
            prompt: parsed.rawText,
            intent: parsed.intent,
            isSafe: true,
            riskLevel: 'safe',
            stepsCount: steps.length,
            gameId: result.modifiedScene.id,
            gameTitle: result.modifiedScene.title,
            status: 'success'
        });

        this.state.addAiMessage(
            `${result.message}\n\nAutomaatkontroll: ${verification.summary}`
        );
    }

    private showCodeModal(code: string) {
        const modal = document.getElementById('modal-code-inspect');
        const codePre = document.getElementById('code-inspect-content');
        if (modal && codePre) {
            codePre.textContent = code;
            modal.style.display = 'flex';
        }
    }

    public triage(input: string) {
        return ConversationEngine.triageInput(input);
    }
}

// Start application
document.addEventListener('DOMContentLoaded', () => {
    (window as any).playardAi = new PlayardAiApp();
});
