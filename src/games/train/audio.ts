// Web Audio API Sound Synthesizer for 3D Train Simulator (Rongimäng)

class TrainAudio {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;
    private chugTimer: any = null;
    private isChugging: boolean = false;
    private currentSpeedRatio: number = 0;

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

    public init() {
        this.initCtx();
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    // Classic Steam Train Whistle (Tuut-Tuut!) - Rich harmonic chord + steam noise
    public playWhistle() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = 1.4;

        // Multi-frequency train horn chord (F4, A4, C5, D#5 authentic steam chord)
        const freqs = [349.23, 440.0, 523.25, 622.25];
        freqs.forEach(freq => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            // Slight pitch bend up then down
            osc.frequency.linearRampToValueAtTime(freq * 1.02, now + 0.2);
            osc.frequency.linearRampToValueAtTime(freq * 0.98, now + duration);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Filter for warm brass whistle resonance
            const filter = this.ctx!.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = freq;
            filter.Q.value = 4.0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx!.destination);

            osc.start(now);
            osc.stop(now + duration);
        });

        // Steam hiss burst
        this.playSteamHiss(now, duration);
    }

    private playSteamHiss(startTime: number, duration: number) {
        if (!this.ctx) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.08;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1200;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(startTime);
        noise.stop(startTime + duration);
    }

    // Dynamic Steam Puff / Chug loop based on speed
    public updateChugSpeed(speedRatio: number) {
        this.currentSpeedRatio = Math.max(0, Math.min(1, Math.abs(speedRatio)));
        if (this.currentSpeedRatio > 0.04 && !this.isChugging && !this.isMuted) {
            this.startChugging();
        } else if (this.currentSpeedRatio <= 0.04 && this.isChugging) {
            this.stopChugging();
        }
    }

    private startChugging() {
        this.isChugging = true;
        const scheduleNext = () => {
            if (!this.isChugging || this.isMuted) {
                this.isChugging = false;
                return;
            }
            this.playSingleChug(this.currentSpeedRatio);
            // Intervals range from 600ms (slow) to 120ms (full speed)
            const interval = Math.max(110, 600 - this.currentSpeedRatio * 480);
            this.chugTimer = setTimeout(scheduleNext, interval);
        };
        scheduleNext();
    }

    private stopChugging() {
        this.isChugging = false;
        if (this.chugTimer) clearTimeout(this.chugTimer);
    }

    private playSingleChug(intensity: number) {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const dur = 0.09;

        // White noise burst shaped like steam exhaust puff
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (0.15 + intensity * 0.2);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450 + intensity * 600, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + dur);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12 + intensity * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + dur);
    }

    // Mechanical track junction switch clunk sound
    public playSwitchTrack() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.13);
    }

    // Brake squeal on heavy deceleration
    public playBrakeSqueal() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2400 + Math.random() * 300, now);
        osc.frequency.linearRampToValueAtTime(2100, now + 0.4);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.42);
    }

    // Station Arrival & Departure Bell Chime
    public playStationBell() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [1046.5, 1318.5, 1567.98]; // C6, E6, G6 cheerful arpeggio
        freqs.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            const t = now + idx * 0.12;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);

            osc.start(t);
            osc.stop(t + 0.55);
        });
    }

    // Yard reward coin pickup sound
    public playCoinReward() {
        if (this.isMuted) return;
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
    }
}

export const trainAudio = new TrainAudio();
