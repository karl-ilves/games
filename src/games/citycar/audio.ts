export class CityCarAudioSystem {
    private ctx: AudioContext | null = null;
    private engineOsc: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;
    private hornOsc1: OscillatorNode | null = null;
    private hornOsc2: OscillatorNode | null = null;
    private hornGain: GainNode | null = null;
    private enabled = true;
    private isHornActive = false;

    constructor(enabled = true) {
        this.enabled = enabled;
    }

    public setEnabled(val: boolean): void {
        this.enabled = val;
        if (!val && this.engineGain) {
            this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
        }
    }

    private ensureContext(): boolean {
        if (typeof window === 'undefined') return false;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.initEngineSound();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return !!this.ctx;
    }

    private initEngineSound(): void {
        if (!this.ctx) return;
        try {
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();

            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

            // Soft lowpass filter to give deep rumbling engine note
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, this.ctx.currentTime);

            this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
        } catch (e) {
            console.warn('Audio init note:', e);
        }
    }

    public updateEngine(speedKmh: number, throttle: number): void {
        if (!this.enabled || !this.ensureContext() || !this.engineOsc || !this.engineGain || !this.ctx) return;

        const baseFreq = 45;
        const targetFreq = baseFreq + (speedKmh * 1.8) + (throttle * 25);
        const targetVol = Math.min(0.04 + (speedKmh / 200) * 0.08 + (throttle * 0.04), 0.15);

        const now = this.ctx.currentTime;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
        this.engineGain.gain.setTargetAtTime(targetVol, now, 0.08);
    }

    public playHorn(active: boolean): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx) return;

        if (active && !this.isHornActive) {
            this.isHornActive = true;
            try {
                this.hornOsc1 = this.ctx.createOscillator();
                this.hornOsc2 = this.ctx.createOscillator();
                this.hornGain = this.ctx.createGain();

                // Dual tone European car horn chord (F4 & A4)
                this.hornOsc1.type = 'triangle';
                this.hornOsc1.frequency.setValueAtTime(349.23, this.ctx.currentTime);

                this.hornOsc2.type = 'triangle';
                this.hornOsc2.frequency.setValueAtTime(440.0, this.ctx.currentTime);

                this.hornGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

                this.hornOsc1.connect(this.hornGain);
                this.hornOsc2.connect(this.hornGain);
                this.hornGain.connect(this.ctx.destination);

                this.hornOsc1.start();
                this.hornOsc2.start();
            } catch (e) {}
        } else if (!active && this.isHornActive) {
            this.isHornActive = false;
            try {
                if (this.hornGain && this.ctx) {
                    this.hornGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
                    setTimeout(() => {
                        this.hornOsc1?.stop();
                        this.hornOsc2?.stop();
                        this.hornOsc1?.disconnect();
                        this.hornOsc2?.disconnect();
                    }, 50);
                }
            } catch (e) {}
        }
    }

    private sirenOsc: OscillatorNode | null = null;
    private sirenLfo: OscillatorNode | null = null;
    private sirenLfoGain: GainNode | null = null;
    private sirenGain: GainNode | null = null;
    private isSirenActive = false;

    public playLampHit(): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Metallic clang and thump
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    public playStarAwarded(): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Two-tone rising star chime (E5 -> B5)
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(659.25, now);
            osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.18);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1318.5, now);
            osc2.frequency.exponentialRampToValueAtTime(1975.5, now + 0.22);

            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.95);
            osc2.stop(now + 0.95);
        } catch (e) {}
    }

    public updatePoliceSiren(active: boolean, targetVol = 0.12): void {
        if (!this.enabled || !this.ensureContext() || !this.ctx) {
            this.stopPoliceSiren();
            return;
        }

        if (active) {
            if (!this.isSirenActive) {
                this.isSirenActive = true;
                try {
                    const now = this.ctx.currentTime;
                    this.sirenOsc = this.ctx.createOscillator();
                    this.sirenLfo = this.ctx.createOscillator();
                    this.sirenLfoGain = this.ctx.createGain();
                    this.sirenGain = this.ctx.createGain();

                    // Siren base tone 750 Hz
                    this.sirenOsc.type = 'sawtooth';
                    this.sirenOsc.frequency.setValueAtTime(750, now);

                    // Lowpass filter to avoid harshness
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(1600, now);

                    // LFO wails up and down at 1.5 Hz (0.66s cycle)
                    this.sirenLfo.type = 'sine';
                    this.sirenLfo.frequency.setValueAtTime(1.5, now);
                    this.sirenLfoGain.gain.setValueAtTime(220, now); // modulates +- 220 Hz

                    this.sirenLfo.connect(this.sirenLfoGain);
                    this.sirenLfoGain.connect(this.sirenOsc.frequency);

                    this.sirenGain.gain.setValueAtTime(0.001, now);
                    this.sirenGain.gain.setTargetAtTime(targetVol, now, 0.2);

                    this.sirenOsc.connect(filter);
                    filter.connect(this.sirenGain);
                    this.sirenGain.connect(this.ctx.destination);

                    this.sirenOsc.start(now);
                    this.sirenLfo.start(now);
                } catch (e) {}
            } else if (this.sirenGain) {
                this.sirenGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.15);
            }
        } else {
            this.stopPoliceSiren();
        }
    }

    private stopPoliceSiren(): void {
        if (!this.isSirenActive) return;
        this.isSirenActive = false;
        if (this.sirenGain && this.ctx) {
            this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
            setTimeout(() => {
                this.sirenOsc?.stop();
                this.sirenLfo?.stop();
                this.sirenOsc?.disconnect();
                this.sirenLfo?.disconnect();
                this.sirenLfoGain?.disconnect();
                this.sirenGain?.disconnect();
                this.sirenOsc = null;
                this.sirenLfo = null;
                this.sirenLfoGain = null;
                this.sirenGain = null;
            }, 250);
        }
    }
}


