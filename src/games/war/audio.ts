// Web Audio API Sound Synthesizer for 3D War Game

class WarAudio {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;
    private engineOsc: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;

    private initCtx() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.engineGain && this.ctx) {
            this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    // Heavy Tank Cannon Blast
    public playCannonShot() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Deep Bass Boom
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

        oscGain.gain.setValueAtTime(0.9, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        // 2. High-Frequency Noise Blast & Shockwave
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
    }

    // Rapid Machine Gun Burst
    public playMachineGun() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
    }

    // Heavy Explosion for Tanks & Targets
    public playExplosion() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Sub-bass thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.7);

        oscGain.gain.setValueAtTime(1.0, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);

        // Long rumbling noise burst
        const bufferSize = this.ctx.sampleRate * 0.8;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + 0.8);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.85, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
    }

    // Metal Hit Ricochet
    public playHit() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(900 + Math.random() * 400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    // Airstrike Jet Flyby + Bombing Run
    public playAirstrike() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Jet engine Doppler swoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.6);
        osc.frequency.exponentialRampToValueAtTime(150, now + 1.4);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.5);

        // Multiple delayed bomb detonations
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.playExplosion();
            }, 800 + i * 220);
        }
    }

    // Field Repair Audio
    public playRepair() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            const time = now + idx * 0.08;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(time);
            osc.stop(time + 0.14);
        });
    }

    // Victory Fanfare
    public playVictory() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            const time = now + idx * 0.12;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.4, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(time);
            osc.stop(time + 0.38);
        });
    }

    // Authentic Real Military Radar / Sonar "PING"
    public playRadarBeep(volume = 0.32) {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Primary Sonar Resonator (Iconic 1280 Hz Sine Ping)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1280, now);
        osc1.frequency.exponentialRampToValueAtTime(1240, now + 0.22);

        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(volume, now + 0.005);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);

        // 2. Harmonic Overtone (2560 Hz Metallic Sonar Shimmer)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2560, now);
        osc2.frequency.exponentialRampToValueAtTime(2480, now + 0.12);

        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.linearRampToValueAtTime(volume * 0.45, now + 0.004);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.15);

        // 3. Subtle Acoustic Transducer Transient Click
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(3200, now);
        clickOsc.frequency.exponentialRampToValueAtTime(800, now + 0.015);

        clickGain.gain.setValueAtTime(volume * 0.3, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

        clickOsc.connect(clickGain);
        clickGain.connect(this.ctx.destination);
        clickOsc.start(now);
        clickOsc.stop(now + 0.02);
    }

    public playCountdownBeep(isGo: boolean = false) {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isGo ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
        if (isGo) {
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.4);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        } else {
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.55 : 0.25));
    }

    public playMissileLaunch() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.8);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.95);
    }

    public playNuclearSiren() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = 5.0; // 5-second realistic siren alarm

        // Dual detuned oscillators for realistic mechanical horn sound
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        subOsc.type = 'sine';

        // Acoustic horn body resonance
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1700, now);
        filter.Q.setValueAtTime(3.5, now);

        // 5-second cycling pitch wave (4 distinct wailing cycles across 5.0s)
        const cycles = 4;
        const cycleDuration = duration / cycles; // 1.25s per cycle
        for (let i = 0; i < cycles; i++) {
            const startT = now + i * cycleDuration;
            const peakT = startT + cycleDuration * 0.5;
            const endT = startT + cycleDuration;

            osc1.frequency.setValueAtTime(420, startT);
            osc1.frequency.linearRampToValueAtTime(780, peakT);
            osc1.frequency.linearRampToValueAtTime(420, endT);

            osc2.frequency.setValueAtTime(425, startT);
            osc2.frequency.linearRampToValueAtTime(785, peakT);
            osc2.frequency.linearRampToValueAtTime(425, endT);

            subOsc.frequency.setValueAtTime(210, startT);
            subOsc.frequency.linearRampToValueAtTime(390, peakT);
            subOsc.frequency.linearRampToValueAtTime(210, endT);
        }

        // 5-second amplitude envelope: crescendo, sustained wail, decrescendo
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.35);
        gain.gain.setValueAtTime(0.45, now + duration - 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        subOsc.start(now);

        osc1.stop(now + duration + 0.05);
        osc2.stop(now + duration + 0.05);
        subOsc.stop(now + duration + 0.05);
    }

    public playNuclearBlast() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Massive seismic bass rumble
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(85, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 1.5);

        oscGain.gain.setValueAtTime(1.0, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 2.0);

        // Thunderous shockwave explosion noise
        const bufferSize = this.ctx.sampleRate * 1.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.45));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 1.4);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.9, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
    }
}

export const warAudio = new WarAudio();
