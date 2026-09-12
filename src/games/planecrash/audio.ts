/**
 * Procedural Audio Synthesizer for Plane Crash Simulator using Web Audio API.
 * Provides realistic engine drone, aerodynamic wind rush, dramatic crash explosions,
 * stunt whooshes, and coin reward chimes without external audio assets.
 */
class PlaneCrashAudio {
    private ctx: AudioContext | null = null;
    private engineOsc: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;
    private windGain: GainNode | null = null;
    private isEngineRunning: boolean = false;
    private isMuted: boolean = false;

    private getContext(): AudioContext | null {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    public startEngine(initialThrottle: number = 0.5): void {
        if (this.isEngineRunning || this.isMuted) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            // Engine Drone Oscillator (dual oscillator saw + triangle for rich engine timbre)
            this.engineOsc = ctx.createOscillator();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(60 + initialThrottle * 80, ctx.currentTime);

            // Filter for low-end aircraft rumble
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, ctx.currentTime);

            this.engineGain = ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.08, ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(ctx.destination);
            this.engineOsc.start();

            // Wind Rush White Noise
            const bufferSize = ctx.sampleRate * 2;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            const windFilter = ctx.createBiquadFilter();
            windFilter.type = 'bandpass';
            windFilter.frequency.setValueAtTime(500, ctx.currentTime);
            windFilter.Q.setValueAtTime(1.0, ctx.currentTime);

            this.windGain = ctx.createGain();
            this.windGain.gain.setValueAtTime(0.02, ctx.currentTime);

            whiteNoise.connect(windFilter);
            windFilter.connect(this.windGain);
            this.windGain.connect(ctx.destination);
            whiteNoise.start();

            this.isEngineRunning = true;
        } catch (e) {
            console.warn('[PlaneCrashAudio] Failed starting engine:', e);
        }
    }

    public updateEngine(throttle: number, speedKmh: number): void {
        if (!this.engineOsc || !this.engineGain || !this.ctx || this.isMuted) return;
        const targetFreq = 50 + throttle * 120 + (speedKmh / 500) * 80;
        const targetGain = 0.05 + throttle * 0.12;
        const targetWind = Math.min(0.15, (speedKmh / 800) * 0.12);

        this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
        this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
        if (this.windGain) {
            this.windGain.gain.setTargetAtTime(targetWind, this.ctx.currentTime, 0.15);
        }
    }

    public stopEngine(): void {
        if (!this.isEngineRunning) return;
        try {
            if (this.engineGain && this.ctx) {
                this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            }
            setTimeout(() => {
                if (this.engineOsc) {
                    try { this.engineOsc.stop(); } catch(e){}
                    this.engineOsc.disconnect();
                    this.engineOsc = null;
                }
            }, 80);
            this.isEngineRunning = false;
        } catch (e) {}
    }

    /**
     * Massive procedural crash explosion with multi-band sub bass and metal crunch.
     */
    public playCrashExplosion(scale: number = 1.0): void {
        this.stopEngine();
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;

        try {
            const now = ctx.currentTime;

            // 1. Heavy Sub-Bass Boom
            const subOsc = ctx.createOscillator();
            const subGain = ctx.createGain();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(120, now);
            subOsc.frequency.exponentialRampToValueAtTime(20, now + 1.2);

            subGain.gain.setValueAtTime(0.7 * Math.min(1.5, scale), now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

            subOsc.connect(subGain);
            subGain.connect(ctx.destination);
            subOsc.start(now);
            subOsc.stop(now + 1.5);

            // 2. High-energy explosion noise burst (fireball roar + crunch)
            const dur = 1.8 * Math.min(1.8, scale);
            const bufferSize = Math.floor(ctx.sampleRate * dur);
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.4));
            }

            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + dur);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.6 * scale, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            noiseSource.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noiseSource.start(now);
        } catch (e) {
            console.warn('[PlaneCrashAudio] Explosion sound error:', e);
        }
    }

    /**
     * Stunt reward swoosh when completing a 360 spin or loop.
     */
    public playStuntWhoosh(): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.45);
        } catch (e) {}
    }

    /**
     * Sparkly coin collection chime.
     */
    public playCoinChime(pitchMultiplier: number = 1.0): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;

        try {
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';

            const base = 987.77 * pitchMultiplier; // B5
            osc1.frequency.setValueAtTime(base, now);
            osc1.frequency.setValueAtTime(base * 1.3348, now + 0.08); // E6
            osc2.frequency.setValueAtTime(base * 1.5, now + 0.08); // F#6

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.45);
            osc2.stop(now + 0.45);
        } catch (e) {}
    }

    public playButtonClick(): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }
}

export const planeAudio = new PlaneCrashAudio();
