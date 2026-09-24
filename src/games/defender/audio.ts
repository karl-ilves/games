export class DefenderAudio {
    private ctx: AudioContext | null = null;
    private soundEnabled: boolean = true;

    constructor() {
        // AudioContext initialized on first user interaction
    }

    private initContext() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    public toggleSound(): boolean {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }

    public isEnabled(): boolean {
        return this.soundEnabled;
    }

    public playLaser(isOwner: boolean = false) {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = isOwner ? 'triangle' : 'sawtooth';

            const startFreq = isOwner ? 980 : 820;
            const endFreq = isOwner ? 220 : 180;

            osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + 0.12);

            gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.13);
        } catch {
            // Audio error ignored safely
        }
    }

    public playExplosion(large: boolean = false) {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        try {
            const duration = large ? 0.45 : 0.25;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(large ? 400 : 700, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + duration);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(large ? 0.35 : 0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch {
            // Audio error ignored safely
        }
    }

    public playEarthImpact() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';

            osc.frequency.setValueAtTime(140, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.52);
        } catch {
            // Audio error ignored safely
        }
    }

    public playPowerUp() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';

            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(330, now);
            osc.frequency.setValueAtTime(440, now + 0.06);
            osc.frequency.setValueAtTime(660, now + 0.12);
            osc.frequency.setValueAtTime(880, now + 0.18);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(now + 0.32);
        } catch {
            // Audio error ignored safely
        }
    }

    public playEmpBlast() {
        if (!this.soundEnabled) return;
        this.initContext();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';

            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(now + 0.52);
        } catch {
            // Audio error ignored safely
        }
    }
}
