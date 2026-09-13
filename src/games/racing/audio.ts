export class RacingAudio {
    private audioCtx: AudioContext | null = null;
    private bgmOsc1: OscillatorNode | null = null;
    private engineOsc: OscillatorNode | null = null;
    private isAudioStarted = false;

    public initAudio(): void {
        if (this.isAudioStarted) return;
        this.isAudioStarted = true;
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Stressful BGM
        const bgmGain = this.audioCtx.createGain();
        bgmGain.gain.value = 0.1;
        bgmGain.connect(this.audioCtx.destination);

        this.bgmOsc1 = this.audioCtx.createOscillator();
        this.bgmOsc1.type = 'sawtooth';
        this.bgmOsc1.frequency.value = 55; // Low bass pulse
        this.bgmOsc1.connect(bgmGain);
        this.bgmOsc1.start();

        // Modulate the bass for tension
        const lfo = this.audioCtx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 8; // 8Hz pulsing
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(this.bgmOsc1.frequency);
        lfo.start();

        // Engine sound
        const engineGain = this.audioCtx.createGain();
        engineGain.gain.value = 0.05;
        engineGain.connect(this.audioCtx.destination);
        this.engineOsc = this.audioCtx.createOscillator();
        this.engineOsc.type = 'triangle';
        this.engineOsc.connect(engineGain);
        this.engineOsc.start();
    }

    public updateEngineSound(playerSpeed: number, maxSpeed: number, isMoto: boolean): void {
        if (!this.audioCtx || !this.engineOsc) return;

        const speedRatio = Math.abs(playerSpeed) / (maxSpeed || 50);
        const basePitch = isMoto ? 150 : 80;
        const maxPitch = isMoto ? 600 : 300;

        this.engineOsc.frequency.setTargetAtTime(
            basePitch + (maxPitch - basePitch) * speedRatio,
            this.audioCtx.currentTime,
            0.1
        );
    }
}
