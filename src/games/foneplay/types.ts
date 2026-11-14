export interface MotionStep {
    id: string;
    name: string;
    instruction: string;
    action: 'forward' | 'backward' | 'jump' | 'turn_left' | 'turn_right' | 'dash' | 'spin';
    durationSeconds: number;
    color: string;
}

export interface FoneVariant {
    id: number;
    title: string;
    subtitle: string;
    color: string;
    description: string;
    theme: string;
    steps: MotionStep[];
}

export interface LivePollState {
    votes: {
        v1: number;
        v2: number;
        v3: number;
    };
    userVoted: number | null;
    totalVotersOnline: number;
    lastUpdated: number;
}
