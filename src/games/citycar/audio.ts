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
}
