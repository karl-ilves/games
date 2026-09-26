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

class PlayardAiApp {
    public state: AiState;
    private viewport!: PreviewViewport;
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
            if (!scene) {
                alert('Esmalt loo või ava mäng!');
                return;
            }
            const games = JSON.parse(localStorage.getItem('playard_pending_review_games') || '[]');
            const reviewItem = {
                id: scene.id,
                title: scene.title,
                description: scene.description,
                author: yardService.getCurrentUsername() || 'Playard AI Creator',
                status: 'pending_owner_review',
                submittedAt: Date.now(),
                sceneData: scene
            };
            games.push(reviewItem);
            localStorage.setItem('playard_pending_review_games', JSON.stringify(games));

            this.state.addSystemMessage(
                `📋 Mäng "${scene.title}" on esitatud Playard Ownerile ülevaatamiseks! Enne avalikustamist vaadatakse mäng administraatori poolt üle.`
            );
            alert(`✅ Mäng "${scene.title}" edukalt saadetud ülevaatamisele!`);
        });

        // Open in Creator Studio
        document.getElementById('btn-open-creator')?.addEventListener('click', () => {
            const scene = this.state.getActiveScene();
            if (!scene) {
                alert('Esmalt genereeri mäng!');
                return;
            }
            localStorage.setItem('playard_imported_ai_scene', JSON.stringify(scene));
            window.location.href = '/games/creator/index.html?ai_import=1';
        });

        // Test play
        document.getElementById('btn-test-play')?.addEventListener('click', () => {
            const scene = this.state.getActiveScene();
            if (!scene) {
                alert('Esmalt genereeri mäng!');
                return;
            }
            const modal = document.getElementById('modal-test-play');
            const desc = document.getElementById('test-play-desc');
            if (modal && desc) {
                desc.textContent = `${scene.title}: ${scene.rules.objective}`;
                modal.style.display = 'flex';
            }
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
        const parsed = ConversationEngine.parseInput(input, this.state.getActiveScene());

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
            await new Promise(r => setTimeout(r, 250));
            this.state.updateStepStatus(step.id, 'completed');
        }

        const newScene = GameGenerator.generateGame(theme, title);
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
            await new Promise(r => setTimeout(r, 200));
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
}

// Start application
document.addEventListener('DOMContentLoaded', () => {
    (window as any).playardAi = new PlayardAiApp();
});
