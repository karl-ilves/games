// Emote Sound System — Web Audio API Synthesized Sounds
// Each emote gets a unique procedurally-generated sound effect or looping music.

export type EmoteSoundType = 'sfx' | 'loop';

export interface EmoteSoundDef {
    type: EmoteSoundType;
    label: string;
}

/** Registry of which emotes have sounds and their type */
export const EMOTE_SOUND_DEFS: Record<string, EmoteSoundDef> = {
    wave:         { type: 'sfx',  label: 'Friendly Chime' },
    dance:        { type: 'loop', label: 'Disco Beat' },
    salute:       { type: 'sfx',  label: 'Drum Snap' },
    backflip:     { type: 'sfx',  label: 'Whoosh & Land' },
    breakdance:   { type: 'loop', label: 'Funky Beat' },
    laugh:        { type: 'sfx',  label: 'Bubbly Notes' },
    flex:         { type: 'sfx',  label: 'Power Up' },
    levitate:     { type: 'loop', label: 'Ethereal Hum' },
    zombie:       { type: 'loop', label: 'Eerie Drone' },
    guitar:       { type: 'loop', label: 'Guitar Riff' },
    dab:          { type: 'sfx',  label: 'Bass Drop' },
    moonwalk:     { type: 'loop', label: 'Smooth Funk' },
    tpose:        { type: 'sfx',  label: 'Assert Beep' },
    robot_dance:  { type: 'loop', label: 'Electro Beat' },
    kungfu:       { type: 'sfx',  label: 'Strike Whoosh' },
    headspin:     { type: 'loop', label: 'Spin Whoosh' },
    cheer:        { type: 'sfx',  label: 'Crowd Cheer' },
    bow:          { type: 'sfx',  label: 'Harp Gliss' },
    matrix_dodge: { type: 'sfx',  label: 'Time Warp' },
    hype_clap:    { type: 'sfx',  label: 'Rhythmic Clap' },
    slow_clap:    { type: 'sfx',  label: 'Slow Clap' },
    ground_slam:  { type: 'sfx',  label: 'Heavy Impact' },
};

function getBaseUrl(): string {
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.BASE_URL === 'string') {
        const b = import.meta.env.BASE_URL;
        return b.endsWith('/') ? b : b + '/';
    }
    return '/games/';
}

/** Mapping to real audio files (MP3 / OGG) stored in public/audio/emotes/ */
export const EMOTE_FILE_MAP: Record<string, string> = {
    wave:         'audio/emotes/wave.mp3',
    dance:        'audio/emotes/dance.ogg',
    salute:       'audio/emotes/salute.mp3',
    backflip:     'audio/emotes/backflip.mp3',
    breakdance:   'audio/emotes/breakdance.ogg',
    laugh:        'audio/emotes/laugh.ogg',
    flex:         'audio/emotes/flex.mp3',
    levitate:     'audio/emotes/levitate.ogg',
    zombie:       'audio/emotes/zombie.ogg',
    guitar:       'audio/emotes/guitar.ogg',
    dab:          'audio/emotes/dab.mp3',
    moonwalk:     'audio/emotes/moonwalk.ogg',
    tpose:        'audio/emotes/tpose.mp3',
    robot_dance:  'audio/emotes/robot_dance.mp3',
    kungfu:       'audio/emotes/kungfu.mp3',
    headspin:     'audio/emotes/headspin.mp3',
    cheer:        'audio/emotes/cheer.ogg',
    bow:          'audio/emotes/bow.mp3',
    matrix_dodge: 'audio/emotes/matrix_dodge.mp3',
    hype_clap:    'audio/emotes/hype_clap.ogg',
    slow_clap:    'audio/emotes/slow_clap.ogg',
    ground_slam:  'audio/emotes/ground_slam.mp3',
};

export function getEmoteAudioUrl(action: string): string | undefined {
    const rel = EMOTE_FILE_MAP[action];
    if (!rel) return undefined;
    return getBaseUrl() + rel;
}

class EmoteAudio {
    private ctx: AudioContext | null = null;
    private muted: boolean = false;
    private currentLoop: { nodes: AudioNode[]; sources: (OscillatorNode | AudioBufferSourceNode)[]; action: string } | null = null;
    private currentAudioElement: HTMLAudioElement | null = null;
    private masterGain: GainNode | null = null;

    private initCtx() {
        if (!this.ctx) {
            const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.masterGain.gain.value = this.muted ? 0 : 0.35;
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public toggleMute(): boolean {
        this.muted = !this.muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
        }
        if (this.currentAudioElement) {
            this.currentAudioElement.volume = this.muted ? 0 : 0.65;
        }
        return this.muted;
    }

    public isMuted(): boolean {
        return this.muted;
    }

    public getRealAudioUrl(action: string): string | undefined {
        return getEmoteAudioUrl(action);
    }

    /** Play the sound for an emote action. Tries real MP3/OGG audio first, falls back to procedural synth. */
    public playEmoteSound(action: string) {
        const def = EMOTE_SOUND_DEFS[action];
        if (!def) return; // No sound for this action (idle, walk, run, jump)

        // Stop existing loop or audio element if switching emotes
        this.stopEmoteSound();

        const realAudioPath = this.getRealAudioUrl(action);
        if (realAudioPath && typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
            try {
                const audio = new window.Audio(realAudioPath);
                audio.loop = (def.type === 'loop');
                audio.volume = this.muted ? 0 : 0.65;
                this.currentAudioElement = audio;

                const playPromise = audio.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch((err) => {
                        console.warn(`[EmoteAudio] Real audio failed for "${action}", falling back to synth:`, err);
                        // Fallback to synthesized audio if file load/playback is blocked
                        this.playSynthFallback(action, def);
                    });
                }
                return;
            } catch (e) {
                console.warn(`[EmoteAudio] Error creating audio element for "${action}":`, e);
            }
        }

        // Procedural synthesis fallback
        this.playSynthFallback(action, def);
    }

    private playSynthFallback(action: string, def: EmoteSoundDef) {
        this.initCtx();
        if (!this.ctx || !this.masterGain) return;

        if (def.type === 'sfx') {
            this.playSfx(action);
        } else {
            this.playLoop(action);
        }
    }

    /** Stop any currently playing looping sound or audio file */
    public stopEmoteSound() {
        if (this.currentAudioElement) {
            try {
                this.currentAudioElement.pause();
                this.currentAudioElement.currentTime = 0;
            } catch (_e) {
                // Ignore pause error
            }
            this.currentAudioElement = null;
        }

        if (this.currentLoop) {
            for (const src of this.currentLoop.sources) {
                try { src.stop(); } catch (_e) { /* already stopped */ }
            }
            this.currentLoop = null;
        }
    }

    public hasSound(action: string): boolean {
        return action in EMOTE_SOUND_DEFS;
    }

    public getSoundDef(action: string): EmoteSoundDef | undefined {
        return EMOTE_SOUND_DEFS[action];
    }

    // ─── SFX (one-shot) synthesizers ───────────────────────────────

    private playSfx(action: string) {
        const fn = (this as any)[`sfx_${action}`];
        if (typeof fn === 'function') {
            fn.call(this);
        }
    }

    private playLoop(action: string) {
        const fn = (this as any)[`loop_${action}`];
        if (typeof fn === 'function') {
            fn.call(this);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // SFX implementations
    // ─────────────────────────────────────────────────────────────

    /** Wave — friendly ascending chime */
    private sfx_wave() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const notes = [523, 659, 784]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.6, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
            osc.connect(gain); gain.connect(dest);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.35);
        });
    }

    /** Salute — sharp snare-like drum snap */
    private sfx_salute() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const bufLen = ctx.sampleRate * 0.15;
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
        }
        const noise = ctx.createBufferSource(); noise.buffer = buf;
        const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 2000;
        const gain = ctx.createGain(); gain.gain.setValueAtTime(0.8, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        noise.connect(filt); filt.connect(gain); gain.connect(dest);
        noise.start(now);
    }

    /** Backflip — whoosh + landing thud */
    private sfx_backflip() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
        g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.5);
        const thud = ctx.createOscillator(); const tg = ctx.createGain();
        thud.type = 'sine'; thud.frequency.setValueAtTime(80, now + 0.35);
        thud.frequency.exponentialRampToValueAtTime(30, now + 0.55);
        tg.gain.setValueAtTime(0.7, now + 0.35); tg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        thud.connect(tg); tg.connect(dest); thud.start(now + 0.35); thud.stop(now + 0.6);
    }

    /** Laugh — bubbly ascending notes */
    private sfx_laugh() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const freqs = [350, 420, 500, 560, 630, 700];
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            const t = now + i * 0.08;
            g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(g); g.connect(dest); osc.start(t); osc.stop(t + 0.15);
        });
    }

    /** Flex — power-up rising tone */
    private sfx_flex() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.5);
        g.gain.setValueAtTime(0.4, now);
        g.gain.setValueAtTime(0.4, now + 0.4);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.65);
    }

    /** Dab — quick bass drop + snap */
    private sfx_dab() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        g.gain.setValueAtTime(0.8, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.35);
        const bLen = ctx.sampleRate * 0.05;
        const buf = ctx.createBuffer(1, bLen, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01));
        const n = ctx.createBufferSource(); n.buffer = buf;
        const ng = ctx.createGain(); ng.gain.setValueAtTime(0.7, now + 0.05); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        n.connect(ng); ng.connect(dest); n.start(now + 0.05);
    }

    /** T-Pose — robotic assertion beep */
    private sfx_tpose() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 880;
        g.gain.setValueAtTime(0.4, now); g.gain.setValueAtTime(0.4, now + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.25);
    }

    /** Kung Fu — whoosh + strike impact */
    private sfx_kungfu() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const bLen = ctx.sampleRate * 0.2;
        const buf = ctx.createBuffer(1, bLen, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bLen; i++) {
            const env = Math.sin((i / bLen) * Math.PI);
            d[i] = (Math.random() * 2 - 1) * env * 0.4;
        }
        const n = ctx.createBufferSource(); n.buffer = buf;
        const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1500; filt.Q.value = 2;
        const g = ctx.createGain(); g.gain.value = 0.6;
        n.connect(filt); filt.connect(g); g.connect(dest); n.start(now);
        const imp = ctx.createOscillator(); const ig = ctx.createGain();
        imp.type = 'sine'; imp.frequency.setValueAtTime(200, now + 0.15);
        imp.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        ig.gain.setValueAtTime(0.7, now + 0.15); ig.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        imp.connect(ig); ig.connect(dest); imp.start(now + 0.15); imp.stop(now + 0.4);
    }

    /** Cheer — crowd cheer (noise burst + airhorn) */
    private sfx_cheer() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const bLen = ctx.sampleRate * 0.6;
        const buf = ctx.createBuffer(1, bLen, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bLen; i++) {
            const env = Math.min(1, i / (ctx.sampleRate * 0.05)) * Math.exp(-(i - ctx.sampleRate * 0.05) / (ctx.sampleRate * 0.4));
            d[i] = (Math.random() * 2 - 1) * env;
        }
        const n = ctx.createBufferSource(); n.buffer = buf;
        const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2500; filt.Q.value = 0.5;
        const g = ctx.createGain(); g.gain.value = 0.5;
        n.connect(filt); filt.connect(g); g.connect(dest); n.start(now);
        const osc = ctx.createOscillator(); const og = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = 540;
        og.gain.setValueAtTime(0.3, now); og.gain.setValueAtTime(0.3, now + 0.3); og.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(og); og.connect(dest); osc.start(now); osc.stop(now + 0.55);
    }

    /** Bow — elegant descending harp glissando */
    private sfx_bow() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const notes = [1047, 880, 784, 659, 523, 440];
        notes.forEach((f, i) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            const t = now + i * 0.08;
            g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.connect(g); g.connect(dest); osc.start(t); osc.stop(t + 0.3);
        });
    }

    /** Matrix dodge — slow-mo time warp */
    private sfx_matrix_dodge() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);
        g.gain.setValueAtTime(0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.75);
        const osc2 = ctx.createOscillator(); const g2 = ctx.createGain();
        osc2.type = 'sine'; osc2.frequency.setValueAtTime(400, now + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(80, now + 0.8);
        g2.gain.setValueAtTime(0.2, now + 0.1); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc2.connect(g2); g2.connect(dest); osc2.start(now + 0.1); osc2.stop(now + 0.9);
    }

    /** Hype clap — rhythmic clapping */
    private sfx_hype_clap() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        for (let i = 0; i < 4; i++) {
            const bLen = ctx.sampleRate * 0.04;
            const buf = ctx.createBuffer(1, bLen, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let j = 0; j < bLen; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.008));
            const n = ctx.createBufferSource(); n.buffer = buf;
            const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 1500;
            const g = ctx.createGain(); g.gain.value = 0.7;
            n.connect(filt); filt.connect(g); g.connect(dest);
            n.start(now + i * 0.15);
        }
    }

    /** Slow clap — slower clapping */
    private sfx_slow_clap() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        for (let i = 0; i < 3; i++) {
            const bLen = ctx.sampleRate * 0.05;
            const buf = ctx.createBuffer(1, bLen, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let j = 0; j < bLen; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.01));
            const n = ctx.createBufferSource(); n.buffer = buf;
            const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 1200;
            const g = ctx.createGain(); g.gain.value = 0.65;
            n.connect(filt); filt.connect(g); g.connect(dest);
            n.start(now + i * 0.45);
        }
    }

    /** Ground slam — heavy impact boom */
    private sfx_ground_slam() {
        const ctx = this.ctx!; const now = ctx.currentTime; const dest = this.masterGain!;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
        g.gain.setValueAtTime(0.9, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(g); g.connect(dest); osc.start(now); osc.stop(now + 0.55);
        const bLen = ctx.sampleRate * 0.3;
        const buf = ctx.createBuffer(1, bLen, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
        const n = ctx.createBufferSource(); n.buffer = buf;
        const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.setValueAtTime(2000, now);
        filt.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        const ng = ctx.createGain(); ng.gain.setValueAtTime(0.6, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        n.connect(filt); filt.connect(ng); ng.connect(dest); n.start(now);
    }

    // ─────────────────────────────────────────────────────────────
    // LOOP implementations (continuous music / ambient)
    // ─────────────────────────────────────────────────────────────

    private startLoop(action: string, sources: (OscillatorNode | AudioBufferSourceNode)[], nodes: AudioNode[]) {
        this.currentLoop = { action, sources, nodes };
    }

    /** Dance — disco beat with bass + hi-hat pattern */
    private loop_dance() {
        const ctx = this.ctx!; const dest = this.masterGain!;
        const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
        const nodes: AudioNode[] = [];

        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.type = 'sawtooth'; bass.frequency.value = 110;
        bassGain.gain.value = 0.3;
        bass.connect(bassGain); bassGain.connect(dest);
        bass.start();
        sources.push(bass); nodes.push(bassGain);

        const pad = ctx.createOscillator();
        const padGain = ctx.createGain();
        pad.type = 'triangle'; pad.frequency.value = 330;
        padGain.gain.value = 0.15;
        pad.connect(padGain); padGain.connect(dest);
        pad.start();
        sources.push(pad); nodes.push(padGain);

        const hhLen = ctx.sampleRate * 2;
        const hhBuf = ctx.createBuffer(1, hhLen, ctx.sampleRate);
        const hhData = hhBuf.getChannelData(0);
        const beatInterval = ctx.sampleRate * 0.25;
        for (let beat = 0; beat < 8; beat++) {
            const start = Math.floor(beat * beatInterval);
            const clickLen = Math.floor(ctx.sampleRate * 0.02);
            for (let i = 0; i < clickLen && (start + i) < hhLen; i++) {
                hhData[start + i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
            }
        }
        const hh = ctx.createBufferSource(); hh.buffer = hhBuf; hh.loop = true;
        const hhFilt = ctx.createBiquadFilter(); hhFilt.type = 'highpass'; hhFilt.frequency.value = 6000;
        const hhGain = ctx.createGain(); hhGain.gain.value = 0.5;
        hh.connect(hhFilt); hhFilt.connect(hhGain); hhGain.connect(dest);
        hh.start();
        sources.push(hh); nodes.push(hhFilt, hhGain);

        this.startLoop('dance', sources, nodes);
    }

    /** Breakdance — funky beat with kick + snare pattern */
    private loop_breakdance() {
        const ctx = this.ctx!; const dest = this.masterGain!;
        const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
        const nodes: AudioNode[] = [];

        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.type = 'square'; bass.frequency.value = 82;
        bassGain.gain.value = 0.25;
        bass.connect(bassGain); bassGain.connect(dest);
        bass.start(); sources.push(bass); nodes.push(bassGain);

        const beatLen = ctx.sampleRate * 2;
        const beatBuf = ctx.createBuffer(1, beatLen, ctx.sampleRate);
        const bd = beatBuf.getChannelData(0);
        const kickTimes = [0, 0.5, 1.0, 1.5];
        kickTimes.forEach(t => {
            const s = Math.floor(t * ctx.sampleRate);
            for (let i = 0; i < ctx.sampleRate * 0.08 && (s + i) < beatLen; i++) {
                bd[s + i] += Math.sin(2 * Math.PI * 60 * i / ctx.sampleRate) * Math.exp(-i / (ctx.sampleRate * 0.03)) * 0.6;
            }
        });
        const snareTimes = [0.25, 0.75, 1.25, 1.75];
        snareTimes.forEach(t => {
            const s = Math.floor(t * ctx.sampleRate);
            for (let i = 0; i < ctx.sampleRate * 0.04 && (s + i) < beatLen; i++) {
                bd[s + i] += (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01)) * 0.4;
            }
        });
        const beat = ctx.createBufferSource(); beat.buffer = beatBuf; beat.loop = true;
        const bg = ctx.createGain(); bg.gain.value = 0.5;
        beat.connect(bg); bg.connect(dest);
        beat.start(); sources.push(beat); nodes.push(bg);

        this.startLoop('breakdance', sources, nodes);
    }

    /** Levitate — ethereal humming pad */
    private loop_levitate() {
        const ctx = this.ctx!; const dest = this.masterGain!;
        const sources: OscillatorNode[] = [];
        const nodes: AudioNode[] = [];

        [220, 330, 440, 554].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = freq;
            gain.gain.value = 0.08;
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.type = 'sine'; lfo.frequency.value = 0.3 + Math.random() * 0.4;
            lfoGain.gain.value = 3;
            lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
            lfo.start();
            osc.connect(gain); gain.connect(dest);
            osc.start();
            sources.push(osc, lfo as OscillatorNode);
            nodes.push(gain, lfoGain);
        });

        this.startLoop('levitate', sources, nodes);
    }

    /** Zombie — low eerie drone */
    private loop_zombie() {
        const ctx = this.ctx!; const dest = this.masterGain!;
        const sources: OscillatorNode[] = [];
        const nodes: AudioNode[] = [];

        const drone = ctx.createOscillator(); const dg = ctx.createGain();
        drone.type = 'sawtooth'; drone.frequency.value = 55;
        dg.gain.value = 0.2;
        const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
        drone.connect(filt); filt.connect(dg); dg.connect(dest);
        drone.start(); sources.push(drone); nodes.push(filt, dg);

        const whistle = ctx.createOscillator(); const wg = ctx.createGain();
        whistle.type = 'sine'; whistle.frequency.value = 660;
        wg.gain.value = 0.06;
        const lfo = ctx.createOscillator(); const lg = ctx.createGain();
        lfo.type = 'sine'; lfo.frequency.value = 0.5; lg.gain.value = 40;
        lfo.connect(lg); lg.connect(whistle.frequency);
        lfo.start();
        whistle.connect(wg); wg.connect(dest);
        whistle.start();
        sources.push(whistle, lfo); nodes.push(wg, lg);

        this.startLoop('zombie', sources, nodes);
    }

    /** Guitar — distorted guitar riff loop */
    private loop_guitar() {
        const ctx = this.ctx!; const dest = this.masterGain!;
        const sources: OscillatorNode[] = [];
        const nodes: AudioNode[] = [];

        const root = ctx.createOscillator();
        root.type = 'sawtooth'; root.frequency.value = 146.83;
        const fifth = ctx.createOscillator();
        fifth.type = 'sawtooth'; fifth.frequency.value = 220;

        const ws = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i * 2) / 256 - 1;
            curve[i] = (Math.PI + 3) * x / (Math.PI + 3 * Math.abs(x));
        }
        ws.curve = curve;

        const mix = ctx.createGain(); mix.gain.value = 0.3;
        root.connect(ws); fifth.connect(ws);
        ws.connect(mix); mix.connect(dest);
        root.start(); fifth.start();
        sources.push(root, fifth);
        nodes.push(ws, mix);

        const vib = ctx.createOscillator(); const vibG = ctx.createGain();
        vib.type = 'sine'; vib.frequency.value = 5; vibG.gain.value = 3;
        vib.connect(vibG); vibG.connect(root.frequency); vibG.connect(fifth.frequency);
        vib.start(); sources.push(vib); nodes.push(vibG);

        this.startLoop('guitar', sources, nodes);
    }

    /** Moonwalk — smooth funk bassline */
    private loop_moonwalk() {
        const ctx = this.ctx!; const dest = this.masterGain!;
        const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
        const nodes: AudioNode[] = [];

        const bass = ctx.createOscillator(); const bg = ctx.createGain();
        bass.type = 'sine'; bass.frequency.value = 98;
        bg.gain.value = 0.3;
        bass.connect(bg); bg.connect(dest);
        bass.start(); sources.push(bass); nodes.push(bg);

        const wah = ctx.createOscillator(); const wahGain = ctx.createGain();
        wah.type = 'triangle'; wah.frequency.value = 392;
        wahGain.gain.value = 0.12;
        const wahFilt = ctx.createBiquadFilter(); wahFilt.type = 'bandpass'; wahFilt.frequency.value = 800; wahFilt.Q.value = 5;
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.type = 'sine'; lfo.frequency.value = 2; lfoG.gain.value = 400;
        lfo.connect(lfoG); lfoG.connect(wahFilt.frequency);
        lfo.start();
        wah.connect(wahFilt); wahFilt.connect(wahGain); wahGain.connect(dest);
        wah.start();
        sources.push(wah, lfo); nodes.push(wahGain, wahFilt, lfoG);

        this.startLoop('moonwalk', sources, nodes);
    }

    /** Robot dance — electronic bleep-bloop beat */
    private loop_robot_dance() {
        const ctx = this.ctx!; const dest = this.masterGain!;
        const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
        const nodes: AudioNode[] = [];

        const arpLen = ctx.sampleRate * 2;
        const arpBuf = ctx.createBuffer(1, arpLen, ctx.sampleRate);
        const ad = arpBuf.getChannelData(0);
        const arpNotes = [440, 523, 659, 523, 440, 349, 440, 523];
        arpNotes.forEach((freq, i) => {
            const start = Math.floor(i * ctx.sampleRate * 0.25);
            const dur = Math.floor(ctx.sampleRate * 0.12);
            for (let j = 0; j < dur && (start + j) < arpLen; j++) {
                ad[start + j] = Math.sin(2 * Math.PI * freq * j / ctx.sampleRate) *
                    Math.exp(-j / (ctx.sampleRate * 0.04)) * 0.3;
            }
        });
        const arp = ctx.createBufferSource(); arp.buffer = arpBuf; arp.loop = true;
        const ag = ctx.createGain(); ag.gain.value = 0.6;
        arp.connect(ag); ag.connect(dest);
        arp.start(); sources.push(arp); nodes.push(ag);

        const bass = ctx.createOscillator(); const bassG = ctx.createGain();
        bass.type = 'square'; bass.frequency.value = 110;
        bassG.gain.value = 0.15;
        bass.connect(bassG); bassG.connect(dest);
        bass.start(); sources.push(bass); nodes.push(bassG);

        this.startLoop('robot_dance', sources, nodes);
    }

    /** Headspin — spinning whoosh loop */
    private loop_headspin() {
        const ctx = this.ctx!; const dest = this.masterGain!;
        const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
        const nodes: AudioNode[] = [];

        const whooshLen = ctx.sampleRate * 1;
        const whooshBuf = ctx.createBuffer(1, whooshLen, ctx.sampleRate);
        const wd = whooshBuf.getChannelData(0);
        for (let i = 0; i < whooshLen; i++) {
            const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * i / whooshLen);
            wd[i] = (Math.random() * 2 - 1) * env * 0.3;
        }
        const whoosh = ctx.createBufferSource(); whoosh.buffer = whooshBuf; whoosh.loop = true;
        const filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1000; filt.Q.value = 2;
        const wg = ctx.createGain(); wg.gain.value = 0.6;
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.type = 'sine'; lfo.frequency.value = 3; lfoG.gain.value = 800;
        lfo.connect(lfoG); lfoG.connect(filt.frequency);
        lfo.start();
        whoosh.connect(filt); filt.connect(wg); wg.connect(dest);
        whoosh.start();
        sources.push(whoosh, lfo); nodes.push(filt, wg, lfoG);

        this.startLoop('headspin', sources, nodes);
    }

    public dispose() {
        this.stopEmoteSound();
        if (this.ctx) {
            this.ctx.close().catch(() => {});
            this.ctx = null;
            this.masterGain = null;
        }
    }
}

/** Singleton instance */
export const emoteAudio = new EmoteAudio();
