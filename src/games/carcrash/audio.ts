export class CarCrashAudioSystem {
    private ctx: AudioContext | null = null;
    private engineOsc: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;
    private enabled = true;

    constructor(enabled = true) {
        this.enabled = enabled;
    }

    private ensureContext(): boolean {
        if (typeof window === 'undefined') return false;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.initEngine();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return !!this.ctx;
    }

    private initEngine(): void {
        if (!this.ctx) return;
        try {
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();

            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(380, this.ctx.currentTime);

            this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
        } catch (_) {}
    }

    public updateEngine(speedKmh: number, throttle: number): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx || !this.engineOsc || !this.engineGain) return;
        const now = this.ctx.currentTime;
        const targetFreq = 40 + (speedKmh / 250) * 160 + (throttle ? 35 : 0);
        const targetGain = 0.04 + Math.min(0.12, (speedKmh / 200) * 0.1) + (throttle ? 0.05 : 0);

        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }

    /**
     * Ultra-realistic procedural metal crunch, glass shatter, and structural thump
     * Intensity: 0.1 to 1.0 based on impact velocity
     */
    public playMetalCrunch(intensity = 0.5): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const clamped = Math.max(0.1, Math.min(1.0, intensity));

            // 1. Deep sub-thump (structural impact shockwave)
            const subOsc = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(120, now);
            subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.35 * clamped);
            subGain.gain.setValueAtTime(0.4 * clamped, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45 * clamped);
            subOsc.connect(subGain);
            subGain.connect(this.ctx.destination);
            subOsc.start(now);
            subOsc.stop(now + 0.5);

            // 2. High-speed metallic crunch & sheet-metal tear (filtered noise)
            const bufferSize = this.ctx.sampleRate * 0.4;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;

            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(650, now);
            bandpass.Q.setValueAtTime(3.0, now);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.5 * clamped, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            noise.connect(bandpass);
            bandpass.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);

            // 3. Glass shatter tinkles
            if (clamped > 0.3) {
                const glassOsc = this.ctx.createOscillator();
                const glassGain = this.ctx.createGain();
                glassOsc.type = 'triangle';
                glassOsc.frequency.setValueAtTime(2800, now);
                glassOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
                glassGain.gain.setValueAtTime(0.15 * clamped, now);
                glassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                glassOsc.connect(glassGain);
                glassGain.connect(this.ctx.destination);
                glassOsc.start(now);
                glassOsc.stop(now + 0.28);
            }
        } catch (_) {}
    }

    public playSkidSound(): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(380, now);
            osc.frequency.linearRampToValueAtTime(320, now + 0.15);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        } catch (_) {}
    }

    public playRepairChime(): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25); // C6
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.45);
        } catch (_) {}
    }

    public playExplosion(): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // 1. Sub-bass boom
            const boomOsc = this.ctx.createOscillator();
            const boomGain = this.ctx.createGain();
            boomOsc.type = 'sawtooth';
            boomOsc.frequency.setValueAtTime(120, now);
            boomOsc.frequency.exponentialRampToValueAtTime(25, now + 0.8);
            boomGain.gain.setValueAtTime(0.5, now);
            boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            boomOsc.connect(boomGain);
            boomGain.connect(this.ctx.destination);
            boomOsc.start(now);
            boomOsc.stop(now + 0.95);

            // 2. White noise blast
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.8);
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.7);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
        } catch (_) {}
    }
}
