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

    private carriage200Audio: HTMLAudioElement | null = null;
    public isCarriage200MusicActive: boolean = false;

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
        if (this.isCarriage200MusicActive && this.carriage200Audio && this.carriage200Audio.paused) {
            this.carriage200Audio.play().catch(() => {});
        }
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
        }
        if (this.carriage200Audio) {
            this.carriage200Audio.muted = this.isMuted;
        }
        return this.isMuted;
    }

    public setVolume(val: number) {
        if (this.masterGain && this.ctx && !this.isMuted) {
            this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
        }
        if (this.carriage200Audio && !this.isMuted) {
            this.carriage200Audio.volume = Math.max(0, Math.min(1, val));
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

    // Creepy Shadow Hand Grab Stinger
    public playShadowGrab() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.6);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.65);
    }

    // Horrifying Death Drag Sound (Dragged out into rushing void)
    public playDeathScream() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Low heavy impact + screech
        const dur = 2.5;
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 1.2));
        }

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + dur);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start(now);
        src.stop(now + dur);

        // Ominous Sub-bass Drone
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(90, now);
        sub.frequency.exponentialRampToValueAtTime(20, now + dur);
        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        sub.connect(subGain);
        subGain.connect(this.masterGain);
        sub.start(now);
        sub.stop(now + dur);
    }

    // --- Coins & Golden Shop Audio ---

    public playCoinPickup() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        [ { freq: 987.77, time: 0 }, { freq: 1318.51, time: 0.08 } ].forEach(tone => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(tone.freq, now + tone.time);
            gain.gain.setValueAtTime(0.2, now + tone.time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + tone.time + 0.25);

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(now + tone.time);
            osc.stop(now + tone.time + 0.3);
        });
    }

    public playShopPurchase() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Cash register chime + magic shimmer arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0.18, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.45);
        });
    }

    // Calming Golden Shop Music (Procedural Ambient Chords & Gentle Bells)
    private shopMusicInterval: any = null;
    public playShopMusic() {
        this.initContext();
        if (this.shopMusicInterval) return;

        const chordProgression = [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7
            [220.00, 261.63, 329.63, 392.00], // Am7
            [174.61, 220.00, 261.63, 329.63], // Fmaj7
            [196.00, 246.94, 293.66, 392.00]  // G7
        ];
        let chordIdx = 0;

        const playChord = () => {
            if (!this.ctx || !this.masterGain || this.isMuted) return;
            const now = this.ctx.currentTime;
            const chord = chordProgression[chordIdx % chordProgression.length];
            chordIdx++;

            chord.forEach((freq, i) => {
                const osc = this.ctx!.createOscillator();
                const gain = this.ctx!.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq * 1.5, now + i * 0.12);

                gain.gain.setValueAtTime(0.06, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 3.2);

                osc.connect(gain);
                gain.connect(this.masterGain!);
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 3.4);
            });
        };

        playChord();
        this.shopMusicInterval = setInterval(playChord, 3500);
    }

    public stopShopMusic() {
        if (this.shopMusicInterval) {
            clearInterval(this.shopMusicInterval);
            this.shopMusicInterval = null;
        }
    }

    // Radio Music & Mystery Broadcast
    private radioInterval: any = null;
    public playRadioAudio() {
        this.initContext();
        if (this.radioInterval) return;

        const lofiScale = [220, 261.6, 293.7, 329.6, 392.0, 440, 523.2];
        const playLofiNote = () => {
            if (!this.ctx || !this.masterGain || this.isMuted) return;
            const now = this.ctx.currentTime;
            const freq = lofiScale[Math.floor(Math.random() * lofiScale.length)];

            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.Q.setValueAtTime(3.0, now);

            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.65);
        };

        playLofiNote();
        this.radioInterval = setInterval(playLofiNote, 600);
    }

    public stopRadioAudio() {
        if (this.radioInterval) {
            clearInterval(this.radioInterval);
            this.radioInterval = null;
        }
    }

    // Phone Ringing (Carriage 19)
    public playPhoneRingingAll() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        for (let ring = 0; ring < 3; ring++) {
            const start = ring * 0.7;
            [ 853, 960 ].forEach(f => {
                const osc = this.ctx!.createOscillator();
                const gain = this.ctx!.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + start);
                gain.gain.setValueAtTime(0.12, now + start);
                gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.4);

                osc.connect(gain);
                gain.connect(this.masterGain!);
                osc.start(now + start);
                osc.stop(now + start + 0.42);
            });
        }
    }

    // Radar Clue Detector Ping (Vihjeandur)
    public playRadarPing() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    // Item Equip Pop (Roblox style tool equip sound)
    public playItemEquip() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    // Teleport Chime (Playard Owner Teleport)
    public playTeleport() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0.15, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.38);
        });
    }

    // Error Buzzer (Invalid carriage / Sellist vagunit ei ole)
    public playError() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.setValueAtTime(120, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    // Train Brakes Screech (Carriage 20 Sudden Deceleration & Friction)
    public playTrainBrakesScreech(duration: number = 5.0) {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Friction squeal oscillator
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2800, now);
        osc.frequency.linearRampToValueAtTime(1900, now + duration * 0.4);
        osc.frequency.linearRampToValueAtTime(950, now + duration);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, now);
        filter.Q.setValueAtTime(5.0, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.1);
    }

    public playBrakesScreech(duration: number = 5.0) {
        this.playTrainBrakesScreech(duration);
    }

    // Creepy Escalating 5-Second Drone (Carriage 20 Ominous Countdown)
    public playCreepyDrone5s() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        [ { f: 65.4, type: 'sawtooth' as OscillatorType, q: 4.0 }, { f: 69.3, type: 'triangle' as OscillatorType, q: 2.0 } ].forEach(d => {
            const osc = this.ctx!.createOscillator();
            const filter = this.ctx!.createBiquadFilter();
            const gain = this.ctx!.createGain();

            osc.type = d.type;
            osc.frequency.setValueAtTime(d.f, now);
            osc.frequency.exponentialRampToValueAtTime(d.f * 2.8, now + 5.0);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(180, now);
            filter.frequency.exponentialRampToValueAtTime(1600, now + 5.0);
            filter.Q.setValueAtTime(d.q, now);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 4.5);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 5.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(now);
            osc.stop(now + 5.3);
        });
    }

    // Terrifying Shadow Creature Monster Roar & Violent Dark Storm Gust (Must Olend Dashing)
    public playShadowRushScreech() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;
        const dur = 3.5;

        // 1. Terrifying Demonic Screech / Howl Cluster (3 dissonant FM modulated oscillators)
        const freqs = [740, 520, 310];
        freqs.forEach((f, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(f, now);
            osc.frequency.linearRampToValueAtTime(f * 1.35, now + 0.8);
            osc.frequency.exponentialRampToValueAtTime(f * 0.45, now + dur);

            // LFO frequency vibrato for terrifying warble
            const lfo = this.ctx!.createOscillator();
            const lfoGain = this.ctx!.createGain();
            lfo.frequency.setValueAtTime(14 + idx * 3, now);
            lfoGain.gain.setValueAtTime(35, now);
            lfo.connect(osc.frequency);
            lfo.start(now);
            lfo.stop(now + dur);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.28 / freqs.length, now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(now);
            osc.stop(now + dur + 0.1);
        });

        // 2. Guttural Sub-Bass Roar
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(65, now);
        subOsc.frequency.linearRampToValueAtTime(95, now + 1.0);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + dur);

        subGain.gain.setValueAtTime(0.01, now);
        subGain.gain.linearRampToValueAtTime(0.35, now + 0.5);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        subOsc.start(now);
        subOsc.stop(now + dur + 0.1);

        // 3. Violent Roaring Wind Gust & Atmospheric Dark Storm
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
        }

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(1400, now + 1.2);
        filter.frequency.exponentialRampToValueAtTime(200, now + dur);

        const gustGain = this.ctx.createGain();
        gustGain.gain.setValueAtTime(0.01, now);
        gustGain.gain.linearRampToValueAtTime(0.38, now + 0.8);
        gustGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        src.connect(filter);
        filter.connect(gustGain);
        gustGain.connect(this.masterGain);

        src.start(now);
        src.stop(now + dur);
    }

    // Horrifying Horror Song / Atmospheric Music (Väga Hirmus Laul)
    public playHorrorShadowSong() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Horrifying dissonant gothic chord progression:
        // Chord 1 (0s): D minor augmented / cluster [146.8 (D3), 174.6 (F3), 220.0 (A3), 311.1 (Eb4)]
        // Chord 2 (2.0s): Tritone suspense cluster [138.6 (C#3), 196.0 (G3), 261.6 (C4), 370.0 (F#4)]
        const chords = [
            { start: 0.0, len: 2.2, notes: [146.83, 174.61, 220.00, 311.13, 622.25] },
            { start: 2.0, len: 2.8, notes: [138.59, 196.00, 261.63, 369.99, 739.99] }
        ];

        chords.forEach(chord => {
            const chordStart = now + chord.start;
            chord.notes.forEach((freq, nIdx) => {
                const osc = this.ctx!.createOscillator();
                const gain = this.ctx!.createGain();

                // Mix sine/sawtooth for ghostly organ / dark string pad tone
                osc.type = nIdx % 2 === 0 ? 'sine' : 'sawtooth';
                osc.frequency.setValueAtTime(freq, chordStart);
                // Subtle creepy pitch detuning
                osc.frequency.linearRampToValueAtTime(freq * (1.0 + (Math.random() - 0.5) * 0.04), chordStart + chord.len);

                // Chorus / Tremolo effect
                const tremolo = this.ctx!.createOscillator();
                const tremoloGain = this.ctx!.createGain();
                tremolo.frequency.setValueAtTime(4.5 + nIdx, chordStart);
                tremoloGain.gain.setValueAtTime(0.08, chordStart);
                tremolo.connect(gain.gain);
                tremolo.start(chordStart);
                tremolo.stop(chordStart + chord.len);

                gain.gain.setValueAtTime(0.01, chordStart);
                gain.gain.linearRampToValueAtTime(0.18 / chord.notes.length, chordStart + 0.6);
                gain.gain.exponentialRampToValueAtTime(0.001, chordStart + chord.len);

                osc.connect(gain);
                gain.connect(this.masterGain!);

                osc.start(chordStart);
                osc.stop(chordStart + chord.len + 0.1);
            });
        });

        // Creepy music box / high chime discordant notes
        const melodyNotes = [
            { time: 0.2, freq: 880.0 },   // A5
            { time: 0.8, freq: 932.33 },  // Bb5
            { time: 1.5, freq: 783.99 },  // G5
            { time: 2.2, freq: 659.25 },  // E5
            { time: 2.9, freq: 622.25 },  // Eb5
            { time: 3.6, freq: 587.33 }   // D5
        ];

        melodyNotes.forEach(m => {
            const t = now + m.time;
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(m.freq, t);

            gain.gain.setValueAtTime(0.01, t);
            gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(t);
            osc.stop(t + 0.75);
        });
    }

    // High-pitched eerie horror piano track (Vagun 26 - 31)
    private isEeriePianoActive: boolean = false;
    private eeriePianoInterval: any = null;
    private eeriePianoMasterGain: GainNode | null = null;

    public startEerieHighPianoTrack() {
        this.initContext();
        if (!this.ctx || !this.masterGain) return;
        if (this.isEeriePianoActive) return;

        this.isEeriePianoActive = true;

        if (!this.eeriePianoMasterGain) {
            this.eeriePianoMasterGain = this.ctx.createGain();
            this.eeriePianoMasterGain.connect(this.masterGain);
        }
        this.eeriePianoMasterGain.gain.setValueAtTime(0.32, this.ctx.currentTime);

        const playPhrase = () => {
            if (!this.isEeriePianoActive || !this.ctx || this.isMuted) return;
            const now = this.ctx.currentTime;

            // High haunting horror piano notes in octaves 5, 6 and 7 (frequencies between 800Hz and 2800Hz)
            const horrorMotifs = [
                // Phrase 1: Chilling Minor Second Descent & Gothic Leap
                [
                    { freq: 1318.51, delay: 0.0, dur: 2.2, vel: 0.28 }, // E6
                    { freq: 1244.51, delay: 0.5, dur: 2.0, vel: 0.24 }, // D#6
                    { freq: 1318.51, delay: 1.1, dur: 1.8, vel: 0.26 }, // E6
                    { freq: 1567.98, delay: 1.7, dur: 2.4, vel: 0.30 }, // G6
                    { freq: 1975.53, delay: 2.4, dur: 3.2, vel: 0.35 }, // B6
                    { freq: 1864.66, delay: 3.2, dur: 3.5, vel: 0.32 }, // A#6
                    { freq: 2093.00, delay: 4.0, dur: 3.8, vel: 0.36 }  // C7
                ],
                // Phrase 2: Unresolved Tension & High Discordant Tolls
                [
                    { freq: 1760.00, delay: 0.0, dur: 2.5, vel: 0.30 }, // A6
                    { freq: 1661.22, delay: 0.6, dur: 2.2, vel: 0.28 }, // G#6
                    { freq: 1479.98, delay: 1.3, dur: 2.0, vel: 0.26 }, // F#6
                    { freq: 1396.91, delay: 1.9, dur: 2.8, vel: 0.32 }, // F6
                    { freq: 2637.02, delay: 2.7, dur: 3.6, vel: 0.38 }, // E7 (piercing high note)
                    { freq: 2489.02, delay: 3.6, dur: 4.0, vel: 0.34 }  // D#7
                ],
                // Phrase 3: Ghostly Slow Music Box Arpeggio
                [
                    { freq: 1108.73, delay: 0.0, dur: 2.0, vel: 0.25 }, // C#6
                    { freq: 1318.51, delay: 0.45, dur: 2.2, vel: 0.27 }, // E6
                    { freq: 1567.98, delay: 0.95, dur: 2.5, vel: 0.30 }, // G6
                    { freq: 2217.46, delay: 1.5, dur: 3.2, vel: 0.35 }, // C#7
                    { freq: 2093.00, delay: 2.3, dur: 3.5, vel: 0.33 }, // C7
                    { freq: 1760.00, delay: 3.1, dur: 3.0, vel: 0.28 }  // A6
                ]
            ];

            const phrase = horrorMotifs[Math.floor(Math.random() * horrorMotifs.length)];

            phrase.forEach(note => {
                const startTime = now + note.delay;
                this.synthesizePianoNote(note.freq, startTime, note.dur, note.vel);
            });
        };

        // Play immediately, then loop phrase every 5.5s
        playPhrase();
        if (this.eeriePianoInterval) clearInterval(this.eeriePianoInterval);
        this.eeriePianoInterval = setInterval(playPhrase, 5500);
    }

    private synthesizePianoNote(freq: number, startTime: number, duration: number, velocity: number) {
        if (!this.ctx || !this.eeriePianoMasterGain) return;

        // Harmonic overtones (Fundamental + 2nd, 3rd, 4th harmonics for high piano wire ring)
        const harmonics = [
            { mult: 1.0, type: 'sine' as OscillatorType, gainMult: 0.75, decay: duration },
            { mult: 2.0, type: 'sine' as OscillatorType, gainMult: 0.35, decay: duration * 0.75 },
            { mult: 3.0, type: 'triangle' as OscillatorType, gainMult: 0.18, decay: duration * 0.5 },
            { mult: 4.01, type: 'sine' as OscillatorType, gainMult: 0.09, decay: duration * 0.35 } // Slight inharmonicity
        ];

        const noteGain = this.ctx.createGain();
        noteGain.connect(this.eeriePianoMasterGain);

        harmonics.forEach(h => {
            const osc = this.ctx!.createOscillator();
            const hGain = this.ctx!.createGain();

            osc.type = h.type;
            osc.frequency.setValueAtTime(freq * h.mult, startTime);

            // Fast piano hammer attack (0.012s) then realistic exponential wire resonance decay
            hGain.gain.setValueAtTime(0.0001, startTime);
            hGain.gain.linearRampToValueAtTime(velocity * h.gainMult, startTime + 0.012);
            hGain.gain.exponentialRampToValueAtTime(0.0001, startTime + h.decay);

            osc.connect(hGain);
            hGain.connect(noteGain);

            osc.start(startTime);
            osc.stop(startTime + h.decay + 0.05);
        });
    }

    public stopEerieHighPianoTrack() {
        if (!this.isEeriePianoActive) return;
        this.isEeriePianoActive = false;
        if (this.eeriePianoInterval) {
            clearInterval(this.eeriePianoInterval);
            this.eeriePianoInterval = null;
        }
        if (this.eeriePianoMasterGain && this.ctx) {
            this.eeriePianoMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
        }
    }

    // Sit Down / Stand Up Cloth Rustle
    public playSitDown() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    // Sword Slash / Combat Swing Audio
    public playSwordSlash() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const bufferSize = this.ctx.sampleRate * 0.22;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.2);
        filter.Q.setValueAtTime(3.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.22);
    }

    public playMonsterHit() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    public playMonsterDeath() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.7);
    }

    public playPlayerHurt() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.28);
    }

    public playStandUp() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    // --- Ajapahalane (Time Villain) Clock Tower Bells Horror Audio ---
    private clockTowerBellInterval: any = null;
    public isClockTowerBellsActive: boolean = false;

    public startClockTowerBells() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        if (this.isClockTowerBellsActive) return;
        this.isClockTowerBellsActive = true;

        // Play repeating deep, reverberating horror bell strikes
        const playBellStrike = () => {
            if (!this.ctx || !this.masterGain || this.isMuted || !this.isClockTowerBellsActive) return;
            const now = this.ctx.currentTime;

            // Deep bell fundamental (church bell tone ~196 Hz G3)
            const bell1 = this.ctx.createOscillator();
            const bell1Gain = this.ctx.createGain();
            bell1.type = 'sine';
            bell1.frequency.setValueAtTime(196, now);
            bell1.frequency.exponentialRampToValueAtTime(180, now + 1.8);
            bell1Gain.gain.setValueAtTime(0.5, now);
            bell1Gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
            bell1.connect(bell1Gain);
            bell1Gain.connect(this.masterGain);
            bell1.start(now);
            bell1.stop(now + 2.1);

            // Metallic overtone (eerie high partial ~587 Hz D5)
            const bell2 = this.ctx.createOscillator();
            const bell2Gain = this.ctx.createGain();
            bell2.type = 'sine';
            bell2.frequency.setValueAtTime(587, now);
            bell2.frequency.exponentialRampToValueAtTime(550, now + 1.5);
            bell2Gain.gain.setValueAtTime(0.25, now);
            bell2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
            bell2.connect(bell2Gain);
            bell2Gain.connect(this.masterGain);
            bell2.start(now);
            bell2.stop(now + 1.7);

            // Dissonant sub-harmonic rumble (~98 Hz)
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'triangle';
            sub.frequency.setValueAtTime(98, now);
            subGain.gain.setValueAtTime(0.3, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
            sub.connect(subGain);
            subGain.connect(this.masterGain);
            sub.start(now);
            sub.stop(now + 2.3);

            // Harsh metallic clang
            const clang = this.ctx.createOscillator();
            const clangGain = this.ctx.createGain();
            clang.type = 'square';
            clang.frequency.setValueAtTime(1800, now);
            clang.frequency.exponentialRampToValueAtTime(400, now + 0.15);
            clangGain.gain.setValueAtTime(0.12, now);
            clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            clang.connect(clangGain);
            clangGain.connect(this.masterGain);
            clang.start(now);
            clang.stop(now + 0.22);
        };

        playBellStrike();
        this.clockTowerBellInterval = setInterval(() => {
            if (this.isClockTowerBellsActive) {
                playBellStrike();
            }
        }, 1400);
    }

    public stopClockTowerBells() {
        this.isClockTowerBellsActive = false;
        if (this.clockTowerBellInterval) {
            clearInterval(this.clockTowerBellInterval);
            this.clockTowerBellInterval = null;
        }
    }

    public playTimeVillainRoar() {
        this.initContext();
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Deep monstrous roar
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.8);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.9);

        // High screeching overtone
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(2200, now);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 0.5);
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now);
        osc2.stop(now + 0.6);
    }

    // --- Vagun 200 Music Track (Last Metro Soundtrack) ---
    public playCarriage200Music() {
        this.initContext();
        this.isCarriage200MusicActive = true;
        if (!this.carriage200Audio) {
            const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/games/';
            const cleanBase = base.endsWith('/') ? base : base + '/';
            const audioUrl = `${cleanBase}audio/last_metro_200.mp3`;
            this.carriage200Audio = new Audio(audioUrl);
            this.carriage200Audio.loop = true;
        }
        this.carriage200Audio.muted = this.isMuted;
        this.carriage200Audio.volume = this.isMuted ? 0 : 0.8;
        this.carriage200Audio.play().catch(e => {
            console.warn('[Metro Audio] Carriage 200 music autoplay prevented or waiting for interaction:', e);
        });
    }

    public stopCarriage200Music() {
        this.isCarriage200MusicActive = false;
        if (this.carriage200Audio) {
            this.carriage200Audio.pause();
            this.carriage200Audio.currentTime = 0;
        }
    }
}

export const metroAudio = new MetroAudioEngine();

