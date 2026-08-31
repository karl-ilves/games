// --- LAST METRO Procedural Audio Engine (Web Audio API) ---

export class MetroAudioEngine {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;
    private masterGain: GainNode | null = null;
    private trainMotorGain: GainNode | null = null;
    private trackRumbleGain: GainNode | null = null;
    private whisperGain: GainNode | null = null;
    private droneGain: GainNode | null = null;

    private motorOsc: OscillatorNode | null = null;
    private trackNoiseNode: AudioNode | null = null;
    private droneOsc1: OscillatorNode | null = null;
    private droneOsc2: OscillatorNode | null = null;

    constructor() {
        // AudioContext will be initialized on first user interaction
    }

    private initContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
                this.startAmbientTracks();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public enableAudio() {
        this.initContext();
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    public setVolume(val: number) {
        if (this.masterGain && this.ctx && !this.isMuted) {
            this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
        }
    }

    private startAmbientTracks() {
        if (!this.ctx || !this.masterGain) return;

        // 1. Train Motor Hum (Low frequency saw/sine with lowpass)
        const motorOsc = this.ctx.createOscillator();
        const motorFilter = this.ctx.createBiquadFilter();
        const motorGain = this.ctx.createGain();

        motorOsc.type = 'sawtooth';
        motorOsc.frequency.setValueAtTime(58, this.ctx.currentTime); // Low AC inverter hum
        motorFilter.type = 'lowpass';
        motorFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
        motorGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

        motorOsc.connect(motorFilter);
        motorFilter.connect(motorGain);
        motorGain.connect(this.masterGain);
        motorOsc.start();
        this.motorOsc = motorOsc;
        this.trainMotorGain = motorGain;

        // 2. Track Rumble Noise (Filtered Brownian/Pink Noise)
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99 * b0 + white * 0.05;
            b1 = 0.95 * b1 + white * 0.1;
            b2 = 0.85 * b2 + white * 0.2;
            output[i] = (b0 + b1 + b2) * 0.3;
        }

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;
        noiseSrc.loop = true;

        const trackFilter = this.ctx.createBiquadFilter();
        trackFilter.type = 'bandpass';
        trackFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
        trackFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

        const trackGain = this.ctx.createGain();
        trackGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

        noiseSrc.connect(trackFilter);
        trackFilter.connect(trackGain);
        trackGain.connect(this.masterGain);
        noiseSrc.start();
        this.trackNoiseNode = noiseSrc;
        this.trackRumbleGain = trackGain;

        // 3. Eerie Sub Drone (Starts quiet, ramps up with anomalies)
        const droneOsc1 = this.ctx.createOscillator();
        const droneOsc2 = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();

        droneOsc1.type = 'sine';
        droneOsc1.frequency.setValueAtTime(43.65, this.ctx.currentTime); // F1
        droneOsc2.type = 'triangle';
        droneOsc2.frequency.setValueAtTime(46.25, this.ctx.currentTime); // Dissonant minor second detune

        droneGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

        droneOsc1.connect(droneGain);
        droneOsc2.connect(droneGain);
        droneGain.connect(this.masterGain);
        droneOsc1.start();
        droneOsc2.start();

        this.droneOsc1 = droneOsc1;
        this.droneOsc2 = droneOsc2;
        this.droneGain = droneGain;
    }

    public setSpeedAudio(speedRatio: number) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        if (this.motorOsc && this.trainMotorGain) {
            this.motorOsc.frequency.setTargetAtTime(45 + speedRatio * 45, now, 0.5);
            this.trainMotorGain.gain.setTargetAtTime(0.04 + speedRatio * 0.15, now, 0.5);
        }
        if (this.trackRumbleGain) {
            this.trackRumbleGain.gain.setTargetAtTime(0.03 + speedRatio * 0.22, now, 0.5);
        }
    }

    public setEerinessLevel(level: number) {
        // level from 0.0 (normal) to 1.0 (super eerie)
        if (!this.ctx || !this.droneGain) return;
        const now = this.ctx.currentTime;
        const targetGain = Math.min(0.35, level * 0.3);
        this.droneGain.gain.setTargetAtTime(targetGain, now, 1.0);
    }

    // --- Sound Effects ---

    // Footstep on train floor
    public playFootstep() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80 + Math.random() * 30, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Metro Door Chime (Two-tone: G5 -> E5, standard metro warning)
    public playDoorChime() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        [ { freq: 784, start: 0, dur: 0.25 }, { freq: 659, start: 0.28, dur: 0.35 } ].forEach(tone => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(tone.freq, now + tone.start);

            gain.gain.setValueAtTime(0.18, now + tone.start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + tone.start + tone.dur);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(now + tone.start);
            osc.stop(now + tone.start + tone.dur + 0.05);
        });
    }

    // Pneumatic Door Open / Slide Sound
    public playDoorSlide(open: boolean = true) {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const dur = 1.2;
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
        }

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = open ? 'lowpass' : 'bandpass';
        filter.frequency.setValueAtTime(open ? 800 : 500, now);
        filter.frequency.linearRampToValueAtTime(open ? 400 : 250, now + dur);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        src.start(now);
        src.stop(now + dur);
    }

    // Automated PA Announcement Tone (Chime before speaker)
    public playAnnouncementChime() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const freqs = [523.25, 659.25, 783.99]; // C5 - E5 - G5
        freqs.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.18);

            gain.gain.setValueAtTime(0.14, now + idx * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.35);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(now + idx * 0.18);
            osc.stop(now + idx * 0.18 + 0.4);
        });
    }

    // Whisper Anomaly (Modulated filtered noise + formant-like resonators)
    public playWhisper(duration: number = 3.5) {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;

        const filter1 = this.ctx.createBiquadFilter();
        filter1.type = 'bandpass';
        filter1.frequency.setValueAtTime(1200, now);
        filter1.Q.setValueAtTime(6.0, now);

        // LFO for whisper speech cadence
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(3.2, now);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(400, now);
        lfo.connect(filter1.frequency);
        lfo.start(now);
        lfo.stop(now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.8);
        gain.gain.linearRampToValueAtTime(0.12, now + duration - 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        src.connect(filter1);
        filter1.connect(gain);
        gain.connect(this.masterGain);

        src.start(now);
        src.stop(now + duration);
    }

    // Light Flickering / Electrical Spark Buzz
    public playFlickerBuzz() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100 + Math.random() * 40, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Intercar Door Heavy Latch / Seal
    public playDoorLatch() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.26);
    }

    // Locked Door Rattle / Handle Jiggle Sound (Trying to open locked back door)
    public playDoorLocked() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Two rapid metallic rattle impulses
        [0, 0.09].forEach(delay => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(240, now + delay);
            osc.frequency.exponentialRampToValueAtTime(60, now + delay + 0.07);

            gain.gain.setValueAtTime(0.22, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(now + delay);
            osc.stop(now + delay + 0.09);
        });
    }

    // Keypad Beep (Correct / Press)
    public playKeypadBeep(success: boolean = false) {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(success ? 880 : 440, now);
        if (success) osc.frequency.setValueAtTime(1174, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (success ? 0.3 : 0.1));

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + (success ? 0.35 : 0.12));
    }

    // Item Pickup / Lore Note Unfold
    public playItemInspect() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.28);
    }

    // Intense Jump Scare Stinger (Vagun 10 / Major Anomaly)
    public playJumpScareStinger() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Dissonant brass-like cluster
        const freqs = [82.4, 87.3, 116.5, 123.5, 349.2, 466.2];
        freqs.forEach(f => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now);
            osc.frequency.exponentialRampToValueAtTime(f * 0.8, now + 1.2);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(now);
            osc.stop(now + 1.6);
        });

        // Heavy sub drop
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(110, now);
        subOsc.frequency.exponentialRampToValueAtTime(25, now + 1.8);
        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        subOsc.start(now);
        subOsc.stop(now + 1.9);
    }

    // Flashlight Click
    public playFlashlightClick() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    // Heartbeat Sound (For tense moments / Stalker nearby)
    public playHeartbeat() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        [0, 0.12].forEach((delay, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(idx === 0 ? 65 : 50, now + delay);
            osc.frequency.exponentialRampToValueAtTime(30, now + delay + 0.15);

            gain.gain.setValueAtTime(idx === 0 ? 0.25 : 0.18, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(now + delay);
            osc.stop(now + delay + 0.2);
        });
    }
}

export const metroAudio = new MetroAudioEngine();
