import type { AiBuildStep, AiMessage } from '../types';
import type { PlayardAiScene } from '../systems/gameGenerator';

export type StateChangeListener = () => void;

export class AiState {
    private static instance: AiState;

    private messages: AiMessage[] = [];
    private activeScene: PlayardAiScene | null = null;
    private currentSteps: AiBuildStep[] = [];
    private isBuilding: boolean = false;
    private listeners: StateChangeListener[] = [];

    private constructor() {
        this.addSystemMessage(
            'Tere! Olen Playard AI – sinu personaalne mänguehitaja. Kirjelda mulle mängu, mida soovid luua (nt "Tee mäng, kus mängija peab tornaado eest põgenema" või "Loo lennumäng") või anna käske olemasoleva maailma muutmiseks!'
        );
    }

    public static getInstance(): AiState {
        if (!this.instance) {
            this.instance = new AiState();
        }
        return this.instance;
    }

    public getMessages(): AiMessage[] {
        return this.messages;
    }

    public getActiveScene(): PlayardAiScene | null {
        return this.activeScene;
    }

    public setActiveScene(scene: PlayardAiScene | null) {
        this.activeScene = scene;
        this.notify();
    }

    public getCurrentSteps(): AiBuildStep[] {
        return this.currentSteps;
    }

    public setCurrentSteps(steps: AiBuildStep[]) {
        this.currentSteps = steps;
        this.notify();
    }

    public updateStepStatus(stepId: string, status: AiBuildStep['status']) {
        const step = this.currentSteps.find(s => s.id === stepId);
        if (step) {
            step.status = status;
            this.notify();
        }
    }

    public getIsBuilding(): boolean {
        return this.isBuilding;
    }

    public setIsBuilding(building: boolean) {
        this.isBuilding = building;
        this.notify();
    }

    public addUserMessage(text: string): AiMessage {
        const msg: AiMessage = {
            id: 'msg_' + Math.random().toString(36).substring(2, 9),
            sender: 'user',
            text,
            timestamp: Date.now()
        };
        this.messages.push(msg);
        this.notify();
        return msg;
    }

    public addAiMessage(
        text: string,
        options?: {
            clarificationOptions?: string[];
            codeSnippet?: string;
            steps?: AiBuildStep[];
            safetyWarning?: string;
            isVerificationReport?: boolean;
        }
    ): AiMessage {
        const msg: AiMessage = {
            id: 'msg_' + Math.random().toString(36).substring(2, 9),
            sender: 'ai',
            text,
            timestamp: Date.now(),
            ...options
        };
        this.messages.push(msg);
        this.notify();
        return msg;
    }

    public addSystemMessage(text: string): AiMessage {
        const msg: AiMessage = {
            id: 'msg_' + Math.random().toString(36).substring(2, 9),
            sender: 'system',
            text,
            timestamp: Date.now()
        };
        this.messages.push(msg);
        this.notify();
        return msg;
    }

    public subscribe(listener: StateChangeListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        for (const listener of this.listeners) {
            try {
                listener();
            } catch (e) {
                console.error('Error in AiState listener:', e);
            }
        }
    }
}
