// Web Audio API Sound Synthesizer for 3D Cooking Game

class KitchenAudio {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;
    private sizzleNode: AudioBufferSourceNode | null = null;
    private sizzleGain: GainNode | null = null;

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
        if (this.isMuted && this.sizzleGain) {
            this.sizzleGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
        }
        return this.isMuted;
    }

    public playChop() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        // Snappy chopping wood sound with quick pitch drop
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320 + Math.random() * 80, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    public playSizzle(active: boolean) {
        if (this.isMuted || !active) {
            if (this.sizzleGain && this.ctx) {
                this.sizzleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
            }
            return;
        }

        this.initCtx();
        if (!this.ctx) return;

        if (!this.sizzleNode) {
            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.15;
            }

            this.sizzleNode = this.ctx.createBufferSource();
            this.sizzleNode.buffer = buffer;
            this.sizzleNode.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1800;
            filter.Q.value = 1.5;

            this.sizzleGain = this.ctx.createGain();
            this.sizzleGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

            this.sizzleNode.connect(filter);
            filter.connect(this.sizzleGain);
            this.sizzleGain.connect(this.ctx.destination);
            this.sizzleNode.start();
        } else if (this.sizzleGain) {
            this.sizzleGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.1);
        }
    }

    public playBell() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [1046.5, 2093.0]; // High C service bell ding

        freqs.forEach((freq, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(idx === 0 ? 0.35 : 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 1.25);
        });
    }

    public playSuccess() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

        notes.forEach((freq, i) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + i * 0.08;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.25, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(noteStart);
            osc.stop(noteStart + 0.32);
        });
    }

    public playCoin() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.42);
    }

    public playBurn() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.3);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.36);
    }
}

export const kitchenAudio = new KitchenAudio();
