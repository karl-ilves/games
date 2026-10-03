export class FlightAudioSystem {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;

    // Engine sound nodes
    private engineOsc1: OscillatorNode | null = null;
    private engineOsc2: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;

    // Wind sound nodes
    private windGain: GainNode | null = null;

    // Alarms
    private stallInterval: any = null;
    private isStallAlarmPlaying: boolean = false;
    private pullUpInterval: any = null;

    constructor(initialEnabled: boolean = true) {
        this.enabled = initialEnabled;
    }

    private init(): void {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? 0.35 : 0;
        this.masterGain.connect(this.ctx.destination);

        // 1. Engine Synthesizer (Twin harmonic oscillators)
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.value = 65;

        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'triangle';
        this.engineOsc2.frequency.value = 130;

        const engineFilter = this.ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 450;

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.2;

        this.engineOsc1.connect(engineFilter);
        this.engineOsc2.connect(engineFilter);
        engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc1.start();
        this.engineOsc2.start();

        // 2. Wind Rush Synthesizer (Filtered white noise)
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 800;
        windFilter.Q.value = 1.0;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0;

        whiteNoise.connect(windFilter);
        windFilter.connect(this.windGain);
        this.windGain.connect(this.masterGain);
        whiteNoise.start();
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(enabled ? 0.35 : 0, this.ctx.currentTime, 0.05);
        }
    }

    public update(throttle: number, airspeedKnots: number, isJet: boolean, afterburner: boolean): void {
        if (!this.ctx) {
            // Lazy init on first user interaction
            const resumeHandler = () => {
                this.init();
                window.removeEventListener('keydown', resumeHandler);
                window.removeEventListener('pointerdown', resumeHandler);
            };
            window.addEventListener('keydown', resumeHandler);
            window.addEventListener('pointerdown', resumeHandler);
            return;
        }

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;

        // Modulate engine pitch
        if (this.engineOsc1 && this.engineOsc2 && this.engineGain) {
            const baseFreq = isJet ? 90 : 55;
            const targetFreq1 = baseFreq + throttle * (isJet ? 140 : 110) + (afterburner ? 60 : 0);
            this.engineOsc1.frequency.setTargetAtTime(targetFreq1, now, 0.1);
            this.engineOsc2.frequency.setTargetAtTime(targetFreq1 * 2, now, 0.1);

            const targetGain = 0.15 + throttle * 0.25 + (afterburner ? 0.15 : 0);
            this.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
        }

        // Modulate wind noise
        if (this.windGain) {
            const windVolume = Math.min(0.4, (airspeedKnots / 500) * 0.35);
            this.windGain.gain.setTargetAtTime(windVolume, now, 0.15);
        }
    }

    public playTouchdownScreech(): void {
        if (!this.ctx || !this.enabled || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.36);
    }

    public playRingChime(): void {
        if (!this.ctx || !this.enabled || !this.masterGain) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0.2, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.32);
        });
    }

    public playStallAlarm(active: boolean): void {
        if (active === this.isStallAlarmPlaying) return;
        this.isStallAlarmPlaying = active;

        if (active) {
            this.stallInterval = setInterval(() => {
                if (!this.ctx || !this.enabled || !this.masterGain) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(880, now);

                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.2);
            }, 300);
        } else {
            if (this.stallInterval) {
                clearInterval(this.stallInterval);
                this.stallInterval = null;
            }
        }
    }

    public playChime(): void {
        if (!this.ctx || !this.enabled || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.42);
    }
}
