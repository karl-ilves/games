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
            // 1. Screeching Metal Tearing / Shearing (FM synthesis)
            const metalMod = ctx.createOscillator();
            const metalModGain = ctx.createGain();
            const metalCarrier = ctx.createOscillator();
            const metalGain = ctx.createGain();

            metalMod.type = 'sawtooth';
            metalMod.frequency.setValueAtTime(340, now);
            metalMod.frequency.linearRampToValueAtTime(80, now + 0.5);

            metalModGain.gain.setValueAtTime(800, now);
            metalModGain.gain.exponentialRampToValueAtTime(10, now + 0.6);

            metalCarrier.type = 'sawtooth';
            metalCarrier.frequency.setValueAtTime(420, now);
            metalCarrier.frequency.exponentialRampToValueAtTime(60, now + 0.8);

            metalMod.connect(metalCarrier.frequency);
            metalCarrier.connect(metalGain);

            metalGain.gain.setValueAtTime(0.45 * scale, now);
            metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            metalGain.connect(ctx.destination);

            metalMod.start(now);
            metalCarrier.start(now);
            metalMod.stop(now + 0.9);
            metalCarrier.stop(now + 0.9);

            // 2. Heavy Sub-Bass Boom
            const subOsc = ctx.createOscillator();
            const subGain = ctx.createGain();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(140, now);
            subOsc.frequency.exponentialRampToValueAtTime(18, now + 1.4);

            subGain.gain.setValueAtTime(0.85 * Math.min(1.6, scale), now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

            subOsc.connect(subGain);
            subGain.connect(ctx.destination);
            subOsc.start(now);
            subOsc.stop(now + 1.7);

            // 3. High-energy explosion noise burst (fireball roar + crunch)
            const dur = 2.2 * Math.min(1.8, scale);
            const bufferSize = Math.floor(ctx.sampleRate * dur);
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.45));
            }

            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(950, now);
            filter.frequency.exponentialRampToValueAtTime(65, now + dur);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.75 * scale, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            noiseSource.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noiseSource.start(now);

            // 4. Secondary clattering debris impacts
            for (let d = 0; d < 4; d++) {
                const delay = 0.2 + d * 0.18 + Math.random() * 0.1;
                const dOsc = ctx.createOscillator();
                const dGain = ctx.createGain();
                dOsc.type = 'triangle';
                dOsc.frequency.setValueAtTime(220 - d * 30 + Math.random() * 40, now + delay);
                dOsc.frequency.exponentialRampToValueAtTime(50, now + delay + 0.12);

                dGain.gain.setValueAtTime(0.2 * scale, now + delay);
                dGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);

                dOsc.connect(dGain);
                dGain.connect(ctx.destination);
                dOsc.start(now + delay);
                dOsc.stop(now + delay + 0.15);
            }
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

    /**
     * Heavy structural concrete collapse sound: deep rumble + screeching debris.
     */
    public playTowerCollapse(): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;
        try {
            const now = ctx.currentTime;

            // Deep rumble oscillator
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.linearRampToValueAtTime(80, now + 1.2);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 1.4);

            // Shorter debris noise crunch
            const bufSize = ctx.sampleRate;
            const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuf;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(600, now);
            noiseFilter.Q.setValueAtTime(1.5, now);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.25, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + 1.0);
        } catch (e) {}
    }

    /**
     * Pleasant architectural rebuild chime.
     */
    public playMapRebuilt(): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;
        try {
            const now = ctx.currentTime;
            const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            chords.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + idx * 0.08;

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + 0.38);
            });
        } catch (e) {}
    }

    /**
     * Mechanical hydraulic whir and locking clunk for landing gear extension/retraction.
     */
    public playGearToggle(down: boolean): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            if (down) {
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.linearRampToValueAtTime(220, now + 0.3);
            } else {
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.linearRampToValueAtTime(110, now + 0.3);
            }
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.36);

            // Mechanical latch clunk
            const clunk = ctx.createOscillator();
            const clunkGain = ctx.createGain();
            clunk.type = 'square';
            clunk.frequency.setValueAtTime(80, now + 0.32);
            clunk.frequency.exponentialRampToValueAtTime(30, now + 0.45);
            clunkGain.gain.setValueAtTime(0.2, now + 0.32);
            clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            clunk.connect(clunkGain);
            clunkGain.connect(ctx.destination);
            clunk.start(now + 0.32);
            clunk.stop(now + 0.46);
        } catch (e) {}
    }

    /**
     * Rubber tire touchdown chirp on smooth landing.
     */
    public playTouchdownChirp(): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1400, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.16);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.19);
        } catch (e) {}
    }

    /**
     * Harsh grinding metal skid when fuselage slides across asphalt/ground.
     */
    public playMetalSkid(): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;
        try {
            const now = ctx.currentTime;
            const bufSize = Math.floor(ctx.sampleRate * 0.8);
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.08);
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buf;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.Q.setValueAtTime(3.0, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + 0.82);
        } catch (e) {}
    }

    /**
     * Low rumbling building destruction and concrete collapse.
     */
    public playBuildingCollapse(): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;
        try {
            const now = ctx.currentTime;
            const sub = ctx.createOscillator();
            const subGain = ctx.createGain();
            sub.type = 'triangle';
            sub.frequency.setValueAtTime(95, now);
            sub.frequency.exponentialRampToValueAtTime(25, now + 1.2);
            subGain.gain.setValueAtTime(0.6, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
            sub.connect(subGain);
            subGain.connect(ctx.destination);
            sub.start(now);
            sub.stop(now + 1.28);
        } catch (e) {}
    }

    /**
     * Victorious fanfare for successful smooth landing (+1,000 Coins).
     */
    public playLandingSuccess(): void {
        const ctx = this.getContext();
        if (!ctx || this.isMuted) return;
        try {
            const now = ctx.currentTime;
            const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const t = now + idx * 0.1;
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.28, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.42);
            });
        } catch (e) {}
    }
}

export const planeAudio = new PlaneCrashAudio();
