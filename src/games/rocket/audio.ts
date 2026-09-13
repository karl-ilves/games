// Ultra-Realistic Explosion Audio Synthesizer via Web Audio API
export class RocketAudio {
    private ctx: AudioContext | null = null;
    public soundEnabled: boolean = true;

    private init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) this.ctx = new AudioContextClass();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public playWhoosh() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.38);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
    }

    // Nuclear Detonation Multi-Band Blast: Blinding Crack + Seismic Sub-Bass (16-45Hz) + Mushroom Cloud Roar + Distant Echo
    public playUltraRealisticBoom() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Nuclear Prompt Supersonic Blast Wave (Instant white crack)
        const crackLen = Math.floor(this.ctx.sampleRate * 0.16);
        const crackBuf = this.ctx.createBuffer(1, crackLen, this.ctx.sampleRate);
        const crackData = crackBuf.getChannelData(0);
        for (let i = 0; i < crackLen; i++) {
            crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.025));
        }
        const crackSrc = this.ctx.createBufferSource();
        crackSrc.buffer = crackBuf;

        const crackFilter = this.ctx.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.setValueAtTime(1400, now);
        crackFilter.frequency.exponentialRampToValueAtTime(180, now + 0.16);

        const crackGain = this.ctx.createGain();
        crackGain.gain.setValueAtTime(1.1, now);
        crackGain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);

        crackSrc.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(this.ctx.destination);
        crackSrc.start(now);

        // 2. Heavy Seismic Sub-Bass Blast (Earth-shattering 16Hz - 70Hz shockwave)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(80, now);
        subOsc.frequency.exponentialRampToValueAtTime(16, now + 1.8);

        subGain.gain.setValueAtTime(1.3, now);
        subGain.gain.exponentialRampToValueAtTime(0.002, now + 1.8);

        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 1.8);

        // 3. Mushroom Cloud Fireball Roar & Atmospheric Vacuum Collapse
        const roarLen = Math.floor(this.ctx.sampleRate * 2.8);
        const roarBuf = this.ctx.createBuffer(1, roarLen, this.ctx.sampleRate);
        const roarData = roarBuf.getChannelData(0);
        for (let i = 0; i < roarLen; i++) {
            roarData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.85));
        }
        const roarSrc = this.ctx.createBufferSource();
        roarSrc.buffer = roarBuf;

        const roarFilter = this.ctx.createBiquadFilter();
        roarFilter.type = 'lowpass';
        roarFilter.frequency.setValueAtTime(2200, now);
        roarFilter.frequency.exponentialRampToValueAtTime(45, now + 2.6);

        const roarGain = this.ctx.createGain();
        roarGain.gain.setValueAtTime(1.0, now);
        roarGain.gain.exponentialRampToValueAtTime(0.002, now + 2.6);

        roarSrc.connect(roarFilter);
        roarFilter.connect(roarGain);
        roarGain.connect(this.ctx.destination);
        roarSrc.start(now);

        // 4. Distant Shockwave Rumble Echo
        setTimeout(() => {
            if (!this.ctx || !this.soundEnabled) return;
            const echoNow = this.ctx.currentTime;
            const echoOsc = this.ctx.createOscillator();
            const echoGain = this.ctx.createGain();
            echoOsc.type = 'triangle';
            echoOsc.frequency.setValueAtTime(55, echoNow);
            echoOsc.frequency.exponentialRampToValueAtTime(20, echoNow + 1.4);

            echoGain.gain.setValueAtTime(0.65, echoNow);
            echoGain.gain.exponentialRampToValueAtTime(0.005, echoNow + 1.4);

            echoOsc.connect(echoGain);
            echoGain.connect(this.ctx.destination);
            echoOsc.start(echoNow);
            echoOsc.stop(echoNow + 1.4);
        }, 180);
    }

    public playBoom() {
        this.playUltraRealisticBoom();
    }

    public playHitChime() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(783.99, now); // G5
        osc.frequency.setValueAtTime(1174.66, now + 0.08); // D6

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    public playFanfare() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const now = this.ctx!.currentTime + idx * 0.12;
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now);
            osc.stop(now + 0.32);
        });
    }

    public playPurchase() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }
}
