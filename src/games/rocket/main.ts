import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { isMobileOrTabletDevice } from '../../shared/mobileControls';

// Ultra-Realistic Explosion Audio Synthesizer via Web Audio API
class RocketAudio {
    private ctx: AudioContext | null = null;
    public soundEnabled: boolean = true;
    private fireNode: AudioBufferSourceNode | null = null;
    private fireGain: GainNode | null = null;

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

// Rocket Definition
export interface RocketType {
    id: string;
    name: string;
    icon: string;
    desc: string;
    speed: number;
    color: number;
    trailColor: number;
    price: number;
    scoreMultiplier: number;
    blastRadius: number;
    category: 'tactical' | 'incendiary' | 'demolition' | 'plasma' | 'cluster' | 'cosmic' | 'thermobaric' | 'singularity';
}

// 54 DISTINCT ROCKET TYPES (8 Tiers / Categories)
export const ROCKET_CATALOG: RocketType[] = [
    // --- 1. TACTICAL & BALLISTIC (1 - 7) ---
    { id: 'red_dart', name: 'Red Dart', icon: '🔴', desc: 'Klassikaline kiire arkaad-rakett kineetilise laenguga.', speed: 90, color: 0xff4757, trailColor: 0xffa502, price: 0, scoreMultiplier: 1.0, blastRadius: 8.5, category: 'tactical' },
    { id: 'steel_falcon', name: 'Steel Falcon', icon: '🦅', desc: 'Terasest aerodünaamiline nool kiireks tabamiseks.', speed: 105, color: 0x94a3b8, trailColor: 0xffd32a, price: 250, scoreMultiplier: 1.1, blastRadius: 9.5, category: 'tactical' },
    { id: 'viper_strike', name: 'Viper Strike', icon: '🐍', desc: 'Salakaval madalalenduv tiibrakett stabiilse lennujoonega.', speed: 115, color: 0x2ed573, trailColor: 0x7bed9f, price: 400, scoreMultiplier: 1.15, blastRadius: 10.0, category: 'tactical' },
    { id: 'cobra_ap', name: 'Cobra AP', icon: '🎯', desc: 'Soomustläbistav volframtipp tugevdatud betoonile.', speed: 125, color: 0xe056fd, trailColor: 0xbe2edd, price: 600, scoreMultiplier: 1.2, blastRadius: 10.5, category: 'tactical' },
    { id: 'stryker_x', name: 'Stryker X', icon: '⚡', desc: 'Topeltkiirendiga taktikalise rünnaku rakett.', speed: 135, color: 0xfffa65, trailColor: 0xff9f1a, price: 800, scoreMultiplier: 1.25, blastRadius: 11.0, category: 'tactical' },
    { id: 'hawk_eye', name: 'Hawk Eye', icon: '👁️', desc: 'Optilise korrigeerimisega suure täpsusega mürsk.', speed: 140, color: 0x17c0eb, trailColor: 0x18dcff, price: 1000, scoreMultiplier: 1.3, blastRadius: 11.5, category: 'tactical' },
    { id: 'thunderhead', name: 'Thunderhead', icon: '🌩️', desc: 'Raske sepistatud koonusega kineetiline hävitaja.', speed: 145, color: 0x7158e2, trailColor: 0x3d3d3d, price: 1250, scoreMultiplier: 1.35, blastRadius: 12.0, category: 'tactical' },

    // --- 2. INCENDIARY & FIRESTORM (8 - 14) (Maja süütamine & põlemine) ---
    { id: 'pyro_flare', name: 'Pyro Flare', icon: '🔥', desc: 'Süütab hooned koheselt põlema ja levitab leeke.', speed: 100, color: 0xff6348, trailColor: 0xff7f50, price: 700, scoreMultiplier: 1.3, blastRadius: 11.5, category: 'incendiary' },
    { id: 'napalm_stinger', name: 'Napalm Stinger', icon: '🧪', desc: 'Kleepuva vedelkütusega laeng, mis tekitab tugeva tulemöllu.', speed: 115, color: 0xff4757, trailColor: 0xff6b81, price: 950, scoreMultiplier: 1.4, blastRadius: 13.0, category: 'incendiary' },
    { id: 'magma_core', name: 'Magma Core', icon: '🌋', desc: 'Vedela laava kuumusega rakett, mis sulatab seinu.', speed: 125, color: 0xff3838, trailColor: 0xff9f1a, price: 1200, scoreMultiplier: 1.45, blastRadius: 14.0, category: 'incendiary' },
    { id: 'firestorm_hydra', name: 'Firestorm Hydra', icon: '🐉', desc: 'Hiiglaslik leegitormi külvaja laia süütealaga.', speed: 130, color: 0xff9f1a, trailColor: 0xff3838, price: 1500, scoreMultiplier: 1.5, blastRadius: 15.0, category: 'incendiary' },
    { id: 'blazing_phoenix', name: 'Blazing Phoenix', icon: '🦅', desc: 'Leekiv fööniks, mis tõstab põlemistemperatuuri maksimumini.', speed: 145, color: 0xff5252, trailColor: 0xffb142, price: 1850, scoreMultiplier: 1.6, blastRadius: 16.0, category: 'incendiary' },
    { id: 'solar_flare', name: 'Solar Flare', icon: '☀️', desc: 'Päikese pinnakuuma plasmaga termiline hävitaja.', speed: 150, color: 0xffda79, trailColor: 0xff5252, price: 2200, scoreMultiplier: 1.7, blastRadius: 17.0, category: 'incendiary' },
    { id: 'thermite_sledge', name: 'Thermite Sledge', icon: '🔨', desc: 'Termiitvasar, mis põletab läbi betooni ja terase.', speed: 160, color: 0xff793f, trailColor: 0xfffa65, price: 2600, scoreMultiplier: 1.8, blastRadius: 18.0, category: 'incendiary' },

    // --- 3. DEMOLITION & BUNKER BUSTERS (15 - 21) (Maja tükkideks lendamine) ---
    { id: 'ground_shaker', name: 'Ground Shaker', icon: '💥', desc: 'Seismiline lööklaine, mis purustab hoonete vundamendi.', speed: 110, color: 0x8395a7, trailColor: 0x576574, price: 900, scoreMultiplier: 1.35, blastRadius: 14.0, category: 'demolition' },
    { id: 'titan_breaker', name: 'Titan Breaker', icon: '🛡️', desc: 'Topeltlaenguga pilvelõhkuja murdja.', speed: 125, color: 0x576574, trailColor: 0x222f3e, price: 1300, scoreMultiplier: 1.45, blastRadius: 16.0, category: 'demolition' },
    { id: 'mega_smasher', name: 'Mega Smasher', icon: '🔨', desc: 'Massiivne plahvatusjõud paiskab maja tükkideks taevasse.', speed: 135, color: 0xc8d6e5, trailColor: 0x8395a7, price: 1700, scoreMultiplier: 1.55, blastRadius: 17.5, category: 'demolition' },
    { id: 'concrete_crusher', name: 'Concrete Crusher', icon: '🏗️', desc: 'Purustab terved kiviseinad sekundiga tolmuks.', speed: 140, color: 0x54a0ff, trailColor: 0x2e86de, price: 2100, scoreMultiplier: 1.65, blastRadius: 18.5, category: 'demolition' },
    { id: 'earth_rupture', name: 'Earth Rupture', icon: '🌍', desc: 'Lõhestab pinnase hoone all ja tekitab hiiglasliku kraatri.', speed: 150, color: 0xee5253, trailColor: 0x10ac84, price: 2600, scoreMultiplier: 1.75, blastRadius: 20.0, category: 'demolition' },
    { id: 'siege_master', name: 'Siege Master', icon: '🏰', desc: 'Sõjaline kindlusehävitaja hävitava löökvõimsusega.', speed: 160, color: 0x1dd1a1, trailColor: 0x10ac84, price: 3100, scoreMultiplier: 1.85, blastRadius: 21.0, category: 'demolition' },
    { id: 'colossus_hammer', name: 'Colossus Hammer', icon: '⚒️', desc: 'Kolossaalne vasar – garanteerib hoone täieliku lammutuse.', speed: 170, color: 0xff9f43, trailColor: 0xee5253, price: 3700, scoreMultiplier: 2.0, blastRadius: 23.0, category: 'demolition' },

    // --- 4. PLASMA & HIGH-ENERGY (22 - 28) ---
    { id: 'neon_turbo', name: 'Neon Turbo', icon: '⚡', desc: 'Tsüaan-plasma laeng ülikiire lennukiirusega.', speed: 125, color: 0x00f2fe, trailColor: 0x4facfe, price: 500, scoreMultiplier: 1.25, blastRadius: 13.0, category: 'plasma' },
    { id: 'blue_ion_pulse', name: 'Blue Ion Pulse', icon: '💠', desc: 'Kõrgsageduslik ioonrakett puhta sinise sähvatusega.', speed: 135, color: 0x0abde3, trailColor: 0x48dbfb, price: 850, scoreMultiplier: 1.4, blastRadius: 14.5, category: 'plasma' },
    { id: 'cyan_lightning', name: 'Cyan Lightning', icon: '⚡', desc: 'Elektromagnetiline välgulöök suure sähvatusega.', speed: 145, color: 0x00d2d3, trailColor: 0x01a3a4, price: 1250, scoreMultiplier: 1.5, blastRadius: 15.5, category: 'plasma' },
    { id: 'emerald_surge', name: 'Emerald Surge', icon: '❇️', desc: 'Smaragdroheline plasmaimpulss võimsa survelainega.', speed: 155, color: 0x10ac84, trailColor: 0x1dd1a1, price: 1700, scoreMultiplier: 1.6, blastRadius: 16.5, category: 'plasma' },
    { id: 'violet_ray', name: 'Violet Ray', icon: '🔮', desc: 'Violetne energiavoog, mis aurustab sihtmärgi materjali.', speed: 165, color: 0x5f27cd, trailColor: 0x341f97, price: 2200, scoreMultiplier: 1.7, blastRadius: 17.5, category: 'plasma' },
    { id: 'crimson_pulsar', name: 'Crimson Pulsar', icon: '🔴', desc: 'Veripunane ülelaetud pulsarrakett kiire löögiga.', speed: 175, color: 0xff3838, trailColor: 0xff4d4d, price: 2800, scoreMultiplier: 1.8, blastRadius: 19.0, category: 'plasma' },
    { id: 'quantum_ionizer', name: 'Quantum Ionizer', icon: '🌀', desc: 'Aatomeid laiali rebiv kvant-ionisatsioon.', speed: 185, color: 0x48dbfb, trailColor: 0x5f27cd, price: 3500, scoreMultiplier: 2.0, blastRadius: 21.0, category: 'plasma' },

    // --- 5. CLUSTER & MULTI-BURST (29 - 35) ---
    { id: 'micro_cluster', name: 'Micro Cluster', icon: '💣', desc: 'Jaguneb enne tabamist mitmeks sekundaarseks lõhkepaketiks.', speed: 115, color: 0x6c5ce7, trailColor: 0xa29bfe, price: 1100, scoreMultiplier: 1.4, blastRadius: 14.5, category: 'cluster' },
    { id: 'shrapnel_storm', name: 'Shrapnel Storm', icon: '🌪️', desc: 'Tuhanded teraslaastud lendavad hoone seintesse.', speed: 125, color: 0x636e72, trailColor: 0xb2bec3, price: 1500, scoreMultiplier: 1.5, blastRadius: 16.0, category: 'cluster' },
    { id: 'hive_swarm', name: 'Hive Swarm', icon: '🐝', desc: 'Terve sülem minirakette katab hoone plahvatustega.', speed: 135, color: 0xfdcb6e, trailColor: 0xe17055, price: 2000, scoreMultiplier: 1.6, blastRadius: 17.5, category: 'cluster' },
    { id: 'carpet_striker', name: 'Carpet Striker', icon: '🎯', desc: 'Vaipkobar rida purustusi kogu kvartalile.', speed: 145, color: 0xd63031, trailColor: 0xff7675, price: 2600, scoreMultiplier: 1.75, blastRadius: 19.0, category: 'cluster' },
    { id: 'rainmaker', name: 'Rainmaker', icon: '🌧️', desc: 'Taevast langev tulevihm hävitab katuse ja laed.', speed: 155, color: 0x0984e3, trailColor: 0x74b9ff, price: 3200, scoreMultiplier: 1.9, blastRadius: 20.5, category: 'cluster' },
    { id: 'nova_scatter', name: 'Nova Scatter', icon: '✨', desc: 'Radiaalselt paiskuvad plahvatustuumad.', speed: 165, color: 0xfd79a8, trailColor: 0xe84393, price: 3900, scoreMultiplier: 2.1, blastRadius: 22.0, category: 'cluster' },
    { id: 'apocalypse_cluster', name: 'Apocalypse Cluster', icon: '💀', desc: 'Katastroofiline kobarmürsk linna lammutamiseks.', speed: 180, color: 0x2d3436, trailColor: 0xd63031, price: 4800, scoreMultiplier: 2.4, blastRadius: 24.5, category: 'cluster' },

    // --- 6. COSMIC & RAINBOW (36 - 42) ---
    { id: 'rainbow_comet', name: 'Rainbow Comet', icon: '🌈', desc: 'Vikerkaare sädemetega komeetrakett +50% boonusega.', speed: 135, color: 0xff6b81, trailColor: 0x2ed573, price: 1200, scoreMultiplier: 1.5, blastRadius: 15.0, category: 'cosmic' },
    { id: 'prism_nova', name: 'Prism Nova', icon: '💎', desc: 'Kristallne valguse murdumine pimestava värvimölluga.', speed: 145, color: 0x70a1ff, trailColor: 0x2ed573, price: 1800, scoreMultiplier: 1.65, blastRadius: 16.5, category: 'cosmic' },
    { id: 'starlight_dream', name: 'Starlight Dream', icon: '⭐', desc: 'Tähetolm ja sädelevad kosmilised osakesed.', speed: 155, color: 0xeccc68, trailColor: 0xff6b81, price: 2400, scoreMultiplier: 1.8, blastRadius: 18.0, category: 'cosmic' },
    { id: 'aurora_borealis', name: 'Aurora Borealis', icon: '🌌', desc: 'Põhjavalguse helkiv ja lainetav taevaplahvatus.', speed: 165, color: 0x7bed9f, trailColor: 0x70a1ff, price: 3100, scoreMultiplier: 1.95, blastRadius: 19.5, category: 'cosmic' },
    { id: 'hyper_prism', name: 'Hyper Prism', icon: '🔷', desc: 'Kõrgenergeetiline vikerkaaresfäär.', speed: 175, color: 0x2ed573, trailColor: 0xff4757, price: 3900, scoreMultiplier: 2.15, blastRadius: 21.0, category: 'cosmic' },
    { id: 'nebula_mirage', name: 'Nebula Mirage', icon: '🪐', desc: 'Süvakosmose udukogu värvikas gaasipilv.', speed: 185, color: 0x5352ed, trailColor: 0xff78c4, price: 4800, scoreMultiplier: 2.35, blastRadius: 23.0, category: 'cosmic' },
    { id: 'cosmic_dreamer', name: 'Cosmic Dreamer', icon: '🛸', desc: 'Ekstragalaktiline lõhkekeha suurejoonelise plahvatusega.', speed: 200, color: 0xff78c4, trailColor: 0xeccc68, price: 5800, scoreMultiplier: 2.6, blastRadius: 25.0, category: 'cosmic' },

    // --- 7. THERMOBARIC & VACUUM (43 - 48) ---
    { id: 'fuel_air_blast', name: 'Fuel-Air Blast', icon: '💨', desc: 'Pihustab õhku kütusepilve ja süütab selle hiiglaslikuks rõhulaineks.', speed: 130, color: 0xf39c12, trailColor: 0xd35400, price: 2200, scoreMultiplier: 1.7, blastRadius: 18.5, category: 'thermobaric' },
    { id: 'aerosol_destroyer', name: 'Aerosol Destroyer', icon: '☁️', desc: 'Imab õhu hoonest välja ja varistab siseseinad.', speed: 140, color: 0xe67e22, trailColor: 0xc0392b, price: 2900, scoreMultiplier: 1.9, blastRadius: 20.5, category: 'thermobaric' },
    { id: 'vacuum_annihilator', name: 'Vacuum Annihilator', icon: '🕳️', desc: 'Vaakumimplosioon, millele järgneb massiivne väljapaiskamine.', speed: 155, color: 0x34495e, trailColor: 0xe74c3c, price: 3700, scoreMultiplier: 2.1, blastRadius: 22.5, category: 'thermobaric' },
    { id: 'atmospheric_ripper', name: 'Atmospheric Ripper', icon: '🌪️', desc: 'Lõikab atmosfääri ja tekitab hüperhelirõhu seina.', speed: 170, color: 0x9b59b6, trailColor: 0x8e44ad, price: 4600, scoreMultiplier: 2.3, blastRadius: 24.5, category: 'thermobaric' },
    { id: 'vortex_oblivion', name: 'Vortex Oblivion', icon: '🌀', desc: 'Pöörlev tulekeeris purustab hoone konstruktsiooni.', speed: 185, color: 0x1abc9c, trailColor: 0x16a085, price: 5600, scoreMultiplier: 2.5, blastRadius: 26.5, category: 'thermobaric' },
    { id: 'super_thermobaric', name: 'Super Thermobaric', icon: '🌋', desc: 'Raskeim termobaariline pomm – pühib terved kvartalid.', speed: 205, color: 0xc0392b, trailColor: 0xf1c40f, price: 6800, scoreMultiplier: 2.8, blastRadius: 29.0, category: 'thermobaric' },

    // --- 8. MYTHIC, ATOMIC & SINGULARITY (49 - 54) ---
    { id: 'quantum_starfire', name: 'Quantum Starfire', icon: '🌟', desc: 'Kuldne supernoova rakett 2.0x topeltpunktidega!', speed: 175, color: 0xffd32a, trailColor: 0xff9f1a, price: 2500, scoreMultiplier: 2.0, blastRadius: 22.0, category: 'singularity' },
    { id: 'uranium_buster', name: 'Uranium Buster', icon: '☢️', desc: 'Rikastatud uraanilaeng – mürgine roheline tulekera.', speed: 190, color: 0x2ecc71, trailColor: 0x27ae60, price: 4200, scoreMultiplier: 2.5, blastRadius: 25.5, category: 'singularity' },
    { id: 'atomic_dawn', name: 'Atomic Dawn', icon: '☣️', desc: 'Taktikaline aatomlõhkepea miniatuurse seenepilvega.', speed: 205, color: 0xf1c40f, trailColor: 0xe67e22, price: 6000, scoreMultiplier: 3.0, blastRadius: 28.0, category: 'singularity' },
    { id: 'supernova_titan', name: 'Supernova Titan', icon: '☀️', desc: 'Kollapsiva tähe plahvatusjõud – hiiglaslik tulemöll.', speed: 215, color: 0xff7675, trailColor: 0xd63031, price: 8000, scoreMultiplier: 3.5, blastRadius: 30.5, category: 'singularity' },
    { id: 'antimatter_core', name: 'Antimatter Core', icon: '⚡', desc: 'Puhas antiaine hävitus, mis muudab aine puhtaks energiaks.', speed: 225, color: 0x6c5ce7, trailColor: 0x00cec9, price: 10500, scoreMultiplier: 4.0, blastRadius: 33.0, category: 'singularity' },
    { id: 'dark_matter_singularity', name: 'Dark Matter Singularity', icon: '🕳️', desc: 'Musta augu gravitatsiooniline kollaps ja ülim 5.0x punktisadu!', speed: 240, color: 0x2d3436, trailColor: 0x6c5ce7, price: 14000, scoreMultiplier: 5.0, blastRadius: 36.0, category: 'singularity' }
];

// Destructible Building
export interface DestructibleBuilding {
    id: string;
    name: string;
    group: THREE.Group;
    mesh: THREE.Mesh;
    type: 'building';
    basePoints: number;
    position: THREE.Vector3;
    size: { w: number; h: number; d: number };
    color: number;
    active: boolean;
    respawnTimer: number;
    hp: number;
    maxHp: number;
    rubbleMesh?: THREE.Mesh;
    isBurning: boolean;
    fireLight?: THREE.PointLight;
    fireParticles?: THREE.Group;
}

// Flying Building Debris (Maja tükid lendavad)
export interface FlyingDebris {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotAxis: THREE.Vector3;
    rotSpeed: number;
    isGrounded: boolean;
    age: number;
    maxAge: number;
    isBurning: boolean;
}

// In-Flight Rocket
export interface InFlightRocket {
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    targetPos: THREE.Vector3;
    rocketType: RocketType;
    spawnTime: number;
}

export class RocketGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private audio: RocketAudio;

    // Aerial View & Targeting Ring
    private targetRing: THREE.Group;
    private ringPosition = new THREE.Vector3(0, 0.2, 0);
    private ringMaterial: THREE.MeshBasicMaterial;
    private beaconBeam: THREE.Mesh;
    private groundPlaneMesh: THREE.Mesh | null = null;

    // Movement & Controls
    private keys: { [key: string]: boolean } = {};
    private mobileMoveVector = { x: 0, y: 0 };
    private isMobileDevice = false;
    private raycaster = new THREE.Raycaster();
    private mouseCoords = new THREE.Vector2(0, 0);

    // Destructible Buildings, Debris & Rockets
    public targets: DestructibleBuilding[] = [];
    private activeDebris: FlyingDebris[] = [];
    public activeRockets: InFlightRocket[] = [];
    private particlePuffGroup: THREE.Group;
    private debrisGroup: THREE.Group;
    private fireGroup: THREE.Group;

    // Scoring, Upgrades & Round
    public currentScore = 0;
    private totalPointsBank = 0;
    public shotsFired = 0;
    public targetsHit = 0;
    private roundDuration = 75; // seconds
    private roundRemaining = 75;
    private roundActive = true;
    private roundTimerInterval: any = null;

    public equippedRocket: RocketType = ROCKET_CATALOG[0];
    private unlockedRockets: Set<string> = new Set(['red_dart']);
    private activeCategory: string = 'all';

    // Screen Shake Trauma
    private trauma = 0;

    constructor() {
        this.audio = new RocketAudio();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0c111e);
        this.scene.fog = new THREE.FogExp2(0x0c111e, 0.0035);

        // Aerial Camera Surveying the City / Arena
        this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 1, 1400);
        this.camera.position.set(0, 78, 56);
        this.camera.lookAt(0, 0, -6);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const container = document.getElementById('canvas-container');
        if (container) {
            container.appendChild(this.renderer.domElement);
        }

        this.targetRing = new THREE.Group();
        this.particlePuffGroup = new THREE.Group();
        this.debrisGroup = new THREE.Group();
        this.fireGroup = new THREE.Group();

        this.scene.add(this.particlePuffGroup);
        this.scene.add(this.debrisGroup);
        this.scene.add(this.fireGroup);

        this.ringMaterial = new THREE.MeshBasicMaterial({
            color: this.equippedRocket.color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const beamGeo = new THREE.CylinderGeometry(0.35, 3.2, 60, 16, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: this.equippedRocket.color,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        this.beaconBeam = new THREE.Mesh(beamGeo, beamMat);
        this.beaconBeam.position.y = 30;

        this.isMobileDevice = isMobileOrTabletDevice();
    }

    public init(): boolean {
        // 1. VIP Verification for Playard Owner
        const userProf = getCurrentUserProfile();
        const isOwner = isPlayardOwner(userProf?.email);
        const vipOverlay = document.getElementById('vip-restricted-overlay');

        if (!isOwner && !isTestMode() && !(window as any).__PLAYARD_TEST_MODE__) {
            if (vipOverlay) vipOverlay.style.display = 'flex';
            return false;
        }
        if (vipOverlay) vipOverlay.style.display = 'none';

        // Load saved state
        this.loadProgress();

        // 2. Setup Lighting, Ground & Destructible Buildings
        this.setupLighting();
        this.buildCityGround();
        this.createTargetRing();
        this.setupDestructibleBuildings();

        // 3. Setup Controls
        this.setupKeyboardControls();
        this.setupMouseAiming();
        this.setupButtons();
        if (this.isMobileDevice) {
            this.setupMobileControls();
        }

        // 4. Update HUD
        this.updateHUD();
        this.setupShopFilterTabs();
        this.renderShopCatalog();
        this.startRoundTimer();

        // 5. Start Render Loop
        window.addEventListener('resize', () => this.onWindowResize());
        this.animate(0);

        // Record to recently played
        yardService.recordPlayedGame({
            id: 'rocket',
            title: '🚀 Rocket Playard',
            description: 'Vaade õhust: 54 unikaalset raketti, põlevad ja tükkideks lendavad majad ning ultra-realistlikud plahvatused!',
            url: './games/rocket/index.html',
            icon: '🚀',
            badgeText: '👑 OWNER EXCLUSIVE'
        });

        return true;
    }

    private setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.75);
        this.scene.add(ambient);

        const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
        sunLight.position.set(65, 150, 75);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 400;
        sunLight.shadow.camera.left = -150;
        sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150;
        sunLight.shadow.camera.bottom = -150;
        this.scene.add(sunLight);

        // City glow lights
        const point1 = new THREE.PointLight(0x00f2fe, 3.5, 140);
        point1.position.set(-50, 35, -35);
        this.scene.add(point1);

        const point2 = new THREE.PointLight(0xff4757, 3.5, 140);
        point2.position.set(50, 35, 35);
        this.scene.add(point2);
    }

    private buildCityGround() {
        const groundSize = 340;
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x131929,
            roughness: 0.85,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.groundPlaneMesh = ground;

        // Street grid
        const gridHelper = new THREE.GridHelper(groundSize, 68, 0x00f2fe, 0x1c2438);
        gridHelper.position.y = 0.05;
        this.scene.add(gridHelper);

        // Boundary walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x161d31, roughness: 0.5 });
        const wallHeight = 16;
        const half = groundSize / 2;

        const makeWall = (w: number, d: number, x: number, z: number) => {
            const geo = new THREE.BoxGeometry(w, wallHeight, d);
            const m = new THREE.Mesh(geo, wallMat);
            m.position.set(x, wallHeight / 2, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };
        makeWall(groundSize, 4, 0, -half);
        makeWall(groundSize, 4, 0, half);
        makeWall(4, groundSize, -half, 0);
        makeWall(4, groundSize, half, 0);
    }

    private createTargetRing() {
        const outerRingGeo = new THREE.RingGeometry(4.4, 5.0, 48);
        const outerRing = new THREE.Mesh(outerRingGeo, this.ringMaterial);
        outerRing.rotation.x = -Math.PI / 2;
        this.targetRing.add(outerRing);

        const midRingGeo = new THREE.RingGeometry(2.4, 2.8, 36);
        const midRing = new THREE.Mesh(midRingGeo, this.ringMaterial);
        midRing.rotation.x = -Math.PI / 2;
        this.targetRing.add(midRing);

        const centerDotGeo = new THREE.CircleGeometry(0.85, 24);
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const centerDot = new THREE.Mesh(centerDotGeo, centerMat);
        centerDot.rotation.x = -Math.PI / 2;
        this.targetRing.add(centerDot);

        const tickGeo = new THREE.PlaneGeometry(0.38, 2.4);
        const makeTick = (x: number, z: number, rotY: number) => {
            const tick = new THREE.Mesh(tickGeo, this.ringMaterial);
            tick.rotation.x = -Math.PI / 2;
            tick.rotation.z = rotY;
            tick.position.set(x, 0.02, z);
            this.targetRing.add(tick);
        };
        makeTick(0, -5.8, 0);
        makeTick(0, 5.8, 0);
        makeTick(-5.8, 0, Math.PI / 2);
        makeTick(5.8, 0, Math.PI / 2);

        this.targetRing.add(this.beaconBeam);
        this.targetRing.position.copy(this.ringPosition);
        this.scene.add(this.targetRing);
    }

    private setupDestructibleBuildings() {
        const buildingConfigs = [
            { id: 'b_central_tower', name: '🏢 Sky Office Tower', pos: new THREE.Vector3(0, 0, 0), w: 22, h: 30, d: 22, color: 0x1e2a4a, roofColor: 0x00f2fe, pts: 650, hp: 2 },
            { id: 'b_north_corp', name: '🏙️ North Corporate HQ', pos: new THREE.Vector3(-45, 0, -45), w: 20, h: 25, d: 20, color: 0x241d38, roofColor: 0xff4757, pts: 550, hp: 2 },
            { id: 'b_east_complex', name: '🏬 Commercial Mall', pos: new THREE.Vector3(50, 0, -35), w: 24, h: 18, d: 22, color: 0x1a2e3b, roofColor: 0xffd32a, pts: 500, hp: 1 },
            { id: 'b_south_hotel', name: '🏨 Grand Plaza Hotel', pos: new THREE.Vector3(45, 0, 45), w: 22, h: 24, d: 24, color: 0x2e1b27, roofColor: 0x2ed573, pts: 550, hp: 2 },
            { id: 'b_west_factory', name: '🏭 Industrial Powerplant', pos: new THREE.Vector3(-50, 0, 35), w: 26, h: 16, d: 24, color: 0x2b261b, roofColor: 0xff9f1a, pts: 450, hp: 1 },
            { id: 'b_suburb_villa_1', name: '🏡 Urban Villa Alpha', pos: new THREE.Vector3(-25, 0, 60), w: 16, h: 12, d: 16, color: 0x1d2938, roofColor: 0x00f2fe, pts: 350, hp: 1 },
            { id: 'b_suburb_villa_2', name: '🏘️ City Apartments', pos: new THREE.Vector3(25, 0, 60), w: 18, h: 15, d: 16, color: 0x301c2c, roofColor: 0xff4757, pts: 400, hp: 1 },
            { id: 'b_warehouse_north', name: '📦 Logistics Terminal', pos: new THREE.Vector3(15, 0, -65), w: 24, h: 13, d: 18, color: 0x192d35, roofColor: 0xffd32a, pts: 380, hp: 1 },
            { id: 'b_bank_tower', name: '🏦 National Vault Tower', pos: new THREE.Vector3(-25, 0, -25), w: 18, h: 22, d: 18, color: 0x251c33, roofColor: 0x9b59b6, pts: 500, hp: 2 },
            { id: 'b_tech_lab', name: '🔬 Quantum Tech Lab', pos: new THREE.Vector3(25, 0, -10), w: 18, h: 16, d: 20, color: 0x152c38, roofColor: 0x00f2fe, pts: 450, hp: 1 },
            { id: 'b_radio_station', name: '📡 Broadcast Tower', pos: new THREE.Vector3(-60, 0, -10), w: 16, h: 28, d: 16, color: 0x1b2836, roofColor: 0xff4757, pts: 600, hp: 2 },
            { id: 'b_port_hangar', name: '🚢 Harbor Warehouse', pos: new THREE.Vector3(60, 0, 10), w: 26, h: 14, d: 20, color: 0x2a241e, roofColor: 0x2ed573, pts: 400, hp: 1 }
        ];

        buildingConfigs.forEach(cfg => {
            const group = new THREE.Group();
            group.position.set(cfg.pos.x, 0, cfg.pos.z);

            const bodyGeo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: cfg.color,
                roughness: 0.65,
                metalness: 0.35
            });
            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.position.y = cfg.h / 2;
            bodyMesh.castShadow = true;
            bodyMesh.receiveShadow = true;
            group.add(bodyMesh);

            // Glowing Windows
            const windowCols = Math.floor(cfg.w / 4);
            const windowRows = Math.floor(cfg.h / 4);
            const winMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });

            for (let r = 1; r < windowRows; r++) {
                for (let c = 0; c < windowCols; c++) {
                    const winMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), winMat);
                    const wx = -cfg.w / 2 + 2.5 + c * 4;
                    const wy = r * 4;
                    winMesh.position.set(wx, wy, cfg.d / 2 + 0.05);
                    group.add(winMesh);

                    const winBack = winMesh.clone();
                    winBack.position.set(wx, wy, -cfg.d / 2 - 0.05);
                    winBack.rotation.y = Math.PI;
                    group.add(winBack);
                }
            }

            // Glowing Rooftop Trim
            const roofGeo = new THREE.BoxGeometry(cfg.w + 0.6, 0.8, cfg.d + 0.6);
            const roofMat = new THREE.MeshBasicMaterial({ color: cfg.roofColor });
            const roofMesh = new THREE.Mesh(roofGeo, roofMat);
            roofMesh.position.y = cfg.h + 0.4;
            group.add(roofMesh);

            this.scene.add(group);

            this.targets.push({
                id: cfg.id,
                name: cfg.name,
                group,
                mesh: bodyMesh,
                type: 'building',
                basePoints: cfg.pts,
                position: cfg.pos.clone().setY(cfg.h / 2),
                size: { w: cfg.w, h: cfg.h, d: cfg.d },
                color: cfg.color,
                active: true,
                respawnTimer: 0,
                hp: cfg.hp,
                maxHp: cfg.hp,
                isBurning: false
            });
        });
    }

    private setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter') {
                e.preventDefault();
                this.fireRocket();
            }

            if (e.code === 'KeyE') {
                this.toggleShop(true);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    private setupMouseAiming() {
        const viewport = document.getElementById('game-viewport-wrapper') || document.body;

        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.isMobileDevice) return;

            this.mouseCoords.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseCoords.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouseCoords, this.camera);
            if (this.groundPlaneMesh) {
                const intersects = this.raycaster.intersectObjects([this.groundPlaneMesh, ...this.scene.children], true);
                for (const hit of intersects) {
                    if (hit.object !== this.beaconBeam && hit.point) {
                        this.ringPosition.x = Math.max(-140, Math.min(140, hit.point.x));
                        this.ringPosition.z = Math.max(-140, Math.min(140, hit.point.z));
                        this.ringPosition.y = Math.max(0.2, hit.point.y + 0.1);
                        break;
                    }
                }
            }
        });

        viewport.addEventListener('mousedown', (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.top-hud, .desktop-fire-btn, .game-modal-backdrop')) return;
            if (e.button === 0) {
                this.fireRocket();
            }
        });
    }

    private setupButtons() {
        const fireBtn = document.getElementById('btn-fire');
        if (fireBtn) {
            fireBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.fireRocket();
            });
        }

        const openShopBtn = document.getElementById('btn-open-shop');
        if (openShopBtn) openShopBtn.addEventListener('click', () => this.toggleShop(true));

        const closeShopBtn = document.getElementById('btn-close-shop');
        if (closeShopBtn) closeShopBtn.addEventListener('click', () => this.toggleShop(false));

        const winnerShopBtn = document.getElementById('btn-winner-shop');
        if (winnerShopBtn) {
            winnerShopBtn.addEventListener('click', () => {
                this.toggleModal('round-end-modal', false);
                this.toggleShop(true);
            });
        }

        const playAgainBtn = document.getElementById('btn-play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.toggleModal('round-end-modal', false);
                this.resetRound();
            });
        }

        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.audio.soundEnabled = !this.audio.soundEnabled;
                soundBtn.textContent = this.audio.soundEnabled ? '🔊' : '🔇';
            });
        }

        const pcBar = document.getElementById('pc-controls-bar');
        if (this.isMobileDevice && pcBar) {
            pcBar.style.display = 'none';
        }
    }

    private setupShopFilterTabs() {
        const filterBar = document.getElementById('shop-filter-bar');
        if (!filterBar) return;

        filterBar.querySelectorAll('.filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterBar.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeCategory = btn.getAttribute('data-cat') || 'all';
                this.renderShopCatalog();
            });
        });
    }

    private setupMobileControls() {
        const existingLayer = document.getElementById('playard-universal-mobile-controls');
        if (existingLayer) existingLayer.remove();

        const layer = document.createElement('div');
        layer.id = 'playard-universal-mobile-controls';
        layer.style.position = 'fixed';
        layer.style.top = '0';
        layer.style.left = '0';
        layer.style.width = '100vw';
        layer.style.height = '100vh';
        layer.style.pointerEvents = 'none';
        layer.style.zIndex = '9999';
        layer.style.userSelect = 'none';
        layer.style.touchAction = 'none';

        // 1. Draggable Virtual Joystick Zone (Bottom Left)
        const zone = document.createElement('div');
        zone.id = 'playard-mobile-joystick-zone';
        zone.style.position = 'absolute';
        zone.style.bottom = '35px';
        zone.style.left = '35px';
        zone.style.width = '130px';
        zone.style.height = '130px';
        zone.style.borderRadius = '50%';
        zone.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)';
        zone.style.border = '2.5px solid rgba(255, 255, 255, 0.35)';
        zone.style.backdropFilter = 'blur(8px)';
        zone.style.pointerEvents = 'auto';
        zone.style.display = 'flex';
        zone.style.alignItems = 'center';
        zone.style.justifyContent = 'center';

        const knob = document.createElement('div');
        knob.id = 'playard-mobile-joystick-knob';
        knob.style.width = '56px';
        knob.style.height = '56px';
        knob.style.borderRadius = '50%';
        knob.style.background = 'linear-gradient(135deg, #00f2fe 0%, #0072ff 100%)';
        knob.style.border = '2px solid #ffffff';
        knob.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.8)';
        knob.style.pointerEvents = 'none';
        knob.innerHTML = '<span style="font-size: 18px; color: white; display: flex; align-items: center; justify-content: center; height: 100%;">🎯</span>';

        zone.appendChild(knob);
        layer.appendChild(zone);

        // 2. Right Action Zone (FIRE Button + JUMP Button)
        const actionZone = document.createElement('div');
        actionZone.style.position = 'absolute';
        actionZone.style.bottom = '35px';
        actionZone.style.right = '35px';
        actionZone.style.display = 'flex';
        actionZone.style.flexDirection = 'column-reverse';
        actionZone.style.gap = '16px';
        actionZone.style.alignItems = 'center';
        actionZone.style.pointerEvents = 'auto';

        // JUMP button
        const jumpBtn = document.createElement('button');
        jumpBtn.type = 'button';
        jumpBtn.id = 'playard-mobile-jump-btn';
        jumpBtn.style.width = '78px';
        jumpBtn.style.height = '78px';
        jumpBtn.style.borderRadius = '50%';
        jumpBtn.style.background = 'linear-gradient(135deg, #00f2fe 0%, #0072ff 100%)';
        jumpBtn.style.border = '2.5px solid #ffffff';
        jumpBtn.style.color = '#ffffff';
        jumpBtn.style.display = 'flex';
        jumpBtn.style.flexDirection = 'column';
        jumpBtn.style.alignItems = 'center';
        jumpBtn.style.justifyContent = 'center';
        jumpBtn.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.7)';
        jumpBtn.style.cursor = 'pointer';
        jumpBtn.style.pointerEvents = 'auto';
        jumpBtn.innerHTML = '<span style="font-size: 24px;">🦘</span><span style="font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">JUMP</span>';

        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.ringPosition.set(0, 0.2, 0);
            this.showImpactToast('CENTER LOCK! 🎯');
        }, { passive: false });

        // Mobile FIRE button
        const mobileFireBtn = document.createElement('button');
        mobileFireBtn.type = 'button';
        mobileFireBtn.id = 'playard-mobile-fire-btn';
        mobileFireBtn.style.width = '88px';
        mobileFireBtn.style.height = '88px';
        mobileFireBtn.style.borderRadius = '50%';
        mobileFireBtn.style.background = 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)';
        mobileFireBtn.style.border = '3px solid #ffffff';
        mobileFireBtn.style.color = '#ffffff';
        mobileFireBtn.style.display = 'flex';
        mobileFireBtn.style.flexDirection = 'column';
        mobileFireBtn.style.alignItems = 'center';
        mobileFireBtn.style.justifyContent = 'center';
        mobileFireBtn.style.boxShadow = '0 0 25px rgba(255, 65, 108, 0.85)';
        mobileFireBtn.style.cursor = 'pointer';
        mobileFireBtn.style.pointerEvents = 'auto';
        mobileFireBtn.innerHTML = '<span style="font-size: 28px;">🚀</span><span style="font-size: 11px; font-weight: 900; letter-spacing: 1px;">FIRE</span>';

        mobileFireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.fireRocket();
        }, { passive: false });

        actionZone.appendChild(jumpBtn);
        actionZone.appendChild(mobileFireBtn);
        layer.appendChild(actionZone);
        document.body.appendChild(layer);

        let touchId: number | null = null;
        let centerX = 0;
        let centerY = 0;

        const onTouchStart = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const rect = zone.getBoundingClientRect();
                centerX = rect.left + rect.width / 2;
                centerY = rect.top + rect.height / 2;
                touchId = t.identifier;
                updateJoystick(t.clientX, t.clientY);
                break;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchId) {
                    updateJoystick(t.clientX, t.clientY);
                    break;
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchId) {
                    touchId = null;
                    this.mobileMoveVector = { x: 0, y: 0 };
                    knob.style.transform = 'translate(0px, 0px)';
                    break;
                }
            }
        };

        const updateJoystick = (clientX: number, clientY: number) => {
            const dx = clientX - centerX;
            const dy = clientY - centerY;
            const dist = Math.hypot(dx, dy);
            const maxRadius = 45;
            const angle = Math.atan2(dy, dx);
            const clampedDist = Math.min(dist, maxRadius);

            const kx = Math.cos(angle) * clampedDist;
            const ky = Math.sin(angle) * clampedDist;
            knob.style.transform = `translate(${kx}px, ${ky}px)`;

            this.mobileMoveVector = {
                x: kx / maxRadius,
                y: ky / maxRadius
            };
        };

        zone.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: false });
        window.addEventListener('touchcancel', onTouchEnd, { passive: false });
    }

    public fireRocket(): boolean {
        if (!this.roundActive) return false;

        this.shotsFired++;
        this.audio.playWhoosh();

        const targetPoint = this.ringPosition.clone();
        const startPoint = new THREE.Vector3(
            targetPoint.x - 15 + (Math.random() - 0.5) * 8,
            targetPoint.y + 85,
            targetPoint.z + 34 + (Math.random() - 0.5) * 8
        );

        const toTarget = targetPoint.clone().sub(startPoint);
        const dir = toTarget.clone().normalize();

        const rocketGroup = new THREE.Group();
        rocketGroup.position.copy(startPoint);

        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.44, 2.5, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: this.equippedRocket.color,
            metalness: 0.75,
            roughness: 0.25
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        rocketGroup.add(body);

        const noseGeo = new THREE.ConeGeometry(0.38, 1.1, 16);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.z = 1.6;
        nose.rotation.x = Math.PI / 2;
        rocketGroup.add(nose);

        const finGeo = new THREE.BoxGeometry(1.5, 0.08, 0.75);
        const finMat = new THREE.MeshBasicMaterial({ color: this.equippedRocket.trailColor });
        const fin1 = new THREE.Mesh(finGeo, finMat);
        fin1.position.z = -0.75;
        rocketGroup.add(fin1);

        const fin2 = fin1.clone();
        fin2.rotation.z = Math.PI / 2;
        rocketGroup.add(fin2);

        const thrusterLight = new THREE.PointLight(this.equippedRocket.trailColor, 4.5, 20);
        thrusterLight.position.z = -1.5;
        rocketGroup.add(thrusterLight);

        rocketGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.scene.add(rocketGroup);

        this.activeRockets.push({
            mesh: rocketGroup,
            velocity: dir.multiplyScalar(this.equippedRocket.speed),
            targetPos: targetPoint,
            rocketType: this.equippedRocket,
            spawnTime: performance.now()
        });

        this.trauma = Math.max(this.trauma, 0.18);
        return true;
    }

    // ULTRA-REALISTIC EXPLOSION & BURNING BUILDING DESTRUCTION
    public triggerExplosion(impactPos: THREE.Vector3, rocketType: RocketType, hitTarget?: DestructibleBuilding, hitDistFromCenter: number = 0) {
        this.audio.playUltraRealisticBoom();

        // 1. Dynamic Flash Point Light (Blinding Nuclear Incandescent Blast Flash)
        const flashLight = new THREE.PointLight(0xffffff, 28.0, 180);
        flashLight.position.copy(impactPos).add(new THREE.Vector3(0, 8, 0));
        this.scene.add(flashLight);

        // 2. Nuclear Mushroom Cloud System (Rising Thermal Stem + Expanding Toroidal Cap + Ground Skirt)
        const nukeGroup = new THREE.Group();

        // A. Rising Stem Column (Turbulent rising vortex of superheated fire and radioactive soot)
        const stemSpheres: { mesh: THREE.Mesh; velY: number; initialScale: number; expansionRate: number }[] = [];
        const stemCount = 18;
        for (let i = 0; i < stemCount; i++) {
            const size = 1.6 + Math.random() * 1.5;
            const geo = new THREE.SphereGeometry(size, 14, 14);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.96
            });
            const mesh = new THREE.Mesh(geo, mat);
            // Slight radial drift, mainly stacked vertically
            const rad = Math.random() * 2.2;
            const ang = Math.random() * Math.PI * 2;
            mesh.position.set(
                impactPos.x + Math.cos(ang) * rad,
                impactPos.y + 0.5 + i * 1.6,
                impactPos.z + Math.sin(ang) * rad
            );
            nukeGroup.add(mesh);
            stemSpheres.push({
                mesh,
                velY: 18.0 + (stemCount - i) * 1.5, // Superheated upward suction
                initialScale: size,
                expansionRate: 1.8 + Math.random() * 1.6
            });
        }

        // B. Mushroom Cap Head (Radial spreading anvil / toroidal fireball rolling over)
        const capSpheres: { mesh: THREE.Mesh; vel: THREE.Vector3; initialScale: number }[] = [];
        const capCount = 26;
        for (let i = 0; i < capCount; i++) {
            const size = 2.4 + Math.random() * 2.2;
            const geo = new THREE.SphereGeometry(size, 16, 16);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.98
            });
            const mesh = new THREE.Mesh(geo, mat);
            const ang = (i / capCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const dist = 1.8 + Math.random() * 3.5;
            mesh.position.set(
                impactPos.x + Math.cos(ang) * dist,
                impactPos.y + 22 + (Math.random() - 0.5) * 4.0,
                impactPos.z + Math.sin(ang) * dist
            );
            nukeGroup.add(mesh);

            // Cap rolls outward and slightly rises
            const rollOutSpeed = 12.0 + Math.random() * 10.0;
            capSpheres.push({
                mesh,
                vel: new THREE.Vector3(
                    Math.cos(ang) * rollOutSpeed,
                    4.5 + Math.random() * 6.5,
                    Math.sin(ang) * rollOutSpeed
                ),
                initialScale: size
            });
        }

        // C. Base Blast Fireball & Ground Wilson Cloud
        const baseFireballGeo = new THREE.SphereGeometry(3.5, 20, 20);
        const baseFireballMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95
        });
        const baseFireball = new THREE.Mesh(baseFireballGeo, baseFireballMat);
        baseFireball.position.copy(impactPos).setY(impactPos.y + 1.5);
        nukeGroup.add(baseFireball);

        this.scene.add(nukeGroup);

        // 3. Double Supersonic Ground Shockwave & Wilson Condensation Ring
        const shockRingGeo = new THREE.RingGeometry(1.5, 4.2, 64);
        const shockRingMat = new THREE.MeshBasicMaterial({
            color: 0xffe699,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        const shockRing = new THREE.Mesh(shockRingGeo, shockRingMat);
        shockRing.rotation.x = -Math.PI / 2;
        shockRing.position.copy(impactPos).setY(0.22);
        this.scene.add(shockRing);

        // Outer atmospheric vapor condensation shock ring
        const vaporRingGeo = new THREE.RingGeometry(3.0, 5.5, 64);
        const vaporRingMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        const vaporRing = new THREE.Mesh(vaporRingGeo, vaporRingMat);
        vaporRing.rotation.x = -Math.PI / 2;
        vaporRing.position.copy(impactPos).setY(2.2);
        this.scene.add(vaporRing);

        // Ground Nuclear Scorch Crater Ring
        const scorchGeo = new THREE.CircleGeometry(rocketType.blastRadius * 1.6, 32);
        const scorchMat = new THREE.MeshBasicMaterial({
            color: 0x0a0c10,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const scorchMesh = new THREE.Mesh(scorchGeo, scorchMat);
        scorchMesh.rotation.x = -Math.PI / 2;
        scorchMesh.position.copy(impactPos).setY(0.08);
        this.scene.add(scorchMesh);

        // 4. Burning Shrapnel & Molten Sparks (120 Sparks Arching in 3D Space)
        const sparkCount = 120;
        const sparkGeo = new THREE.BufferGeometry();
        const sparkPos = new Float32Array(sparkCount * 3);
        const sparkVels: THREE.Vector3[] = [];

        for (let i = 0; i < sparkCount; i++) {
            sparkPos[i * 3] = impactPos.x;
            sparkPos[i * 3 + 1] = impactPos.y + 1.5;
            sparkPos[i * 3 + 2] = impactPos.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.45;
            const speed = 28 + Math.random() * 45;
            sparkVels.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed + 14,
                Math.sin(phi) * Math.sin(theta) * speed
            ));
        }
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
        const sparkMat = new THREE.PointsMaterial({
            color: 0xffa502,
            size: 1.8,
            transparent: true,
            opacity: 1.0
        });
        const sparkSystem = new THREE.Points(sparkGeo, sparkMat);
        this.scene.add(sparkSystem);

        // Animate Mushroom Cloud, Thermal Roll, Shockwaves, and Sparks
        let animElapsed = 0;
        const explosionAnim = setInterval(() => {
            animElapsed += 0.03;
            flashLight.intensity = Math.max(0, 28.0 * (1.0 - animElapsed * 2.8));

            // Shockwave expansions
            const ringScale = 1.0 + animElapsed * (rocketType.blastRadius * 4.5);
            shockRing.scale.set(ringScale, ringScale, 1);
            shockRingMat.opacity = Math.max(0, 0.95 - animElapsed * 1.4);

            const vaporScale = 1.0 + animElapsed * (rocketType.blastRadius * 5.8);
            vaporRing.scale.set(vaporScale, vaporScale, 1);
            vaporRingMat.opacity = Math.max(0, 0.85 - animElapsed * 1.7);

            // Base fireball expansion and thermal cooling
            const baseScale = 1.0 + animElapsed * 4.2;
            baseFireball.scale.set(baseScale, baseScale * 0.85, baseScale);
            if (animElapsed < 0.15) {
                (baseFireball.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
            } else if (animElapsed < 0.45) {
                (baseFireball.material as THREE.MeshBasicMaterial).color.setHex(0xff5500);
            } else {
                (baseFireball.material as THREE.MeshBasicMaterial).color.setHex(0x221815);
            }
            (baseFireball.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 - animElapsed * 0.7);

            // Animate Mushroom Stem (Rising thermal vortex column)
            stemSpheres.forEach(st => {
                st.mesh.position.y += st.velY * 0.03;
                st.velY *= 0.96; // Slow down as altitude increases
                const exp = st.initialScale * (1.0 + animElapsed * st.expansionRate);
                st.mesh.scale.set(exp, exp * 1.25, exp);

                const m = st.mesh.material as THREE.MeshBasicMaterial;
                if (animElapsed < 0.18) {
                    m.color.setHex(0xffffff);
                } else if (animElapsed < 0.45) {
                    m.color.setHex(0xff6b1a);
                } else if (animElapsed < 0.85) {
                    m.color.setHex(0x5a180a);
                } else {
                    m.color.setHex(0x1a1a20); // Dense black radioactive soot
                }
                m.opacity = Math.max(0, 0.96 - animElapsed * 0.65);
            });

            // Animate Mushroom Cap (Rolling outward anvil head)
            capSpheres.forEach(cp => {
                cp.mesh.position.addScaledVector(cp.vel, 0.03);
                cp.vel.x *= 0.97;
                cp.vel.z *= 0.97;
                cp.vel.y *= 0.98;

                const exp = cp.initialScale * (1.0 + animElapsed * 4.8);
                cp.mesh.scale.set(exp * 1.3, exp * 0.8, exp * 1.3); // Flatten into mushroom dome

                const m = cp.mesh.material as THREE.MeshBasicMaterial;
                if (animElapsed < 0.15) {
                    m.color.setHex(0xffffff);
                } else if (animElapsed < 0.38) {
                    m.color.setHex(0xff4d00);
                } else if (animElapsed < 0.75) {
                    m.color.setHex(0x6a1a0d);
                } else {
                    m.color.setHex(0x16161b); // Billowing dark mushroom cloud cap
                }
                m.opacity = Math.max(0, 0.98 - animElapsed * 0.6);
            });

            // Flying sparks
            const sArr = sparkGeo.attributes.position.array as Float32Array;
            for (let i = 0; i < sparkCount; i++) {
                sArr[i * 3] += sparkVels[i].x * 0.03;
                sArr[i * 3 + 1] += sparkVels[i].y * 0.03;
                sArr[i * 3 + 2] += sparkVels[i].z * 0.03;
                sparkVels[i].y -= 42 * 0.03;
            }
            sparkGeo.attributes.position.needsUpdate = true;
            sparkMat.opacity = Math.max(0, 1.0 - animElapsed * 1.1);

            if (animElapsed >= 1.6) {
                clearInterval(explosionAnim);
                this.scene.remove(flashLight);
                this.scene.remove(nukeGroup);
                this.scene.remove(shockRing);
                this.scene.remove(vaporRing);
                this.scene.remove(sparkSystem);
                flashLight.dispose();
                shockRingGeo.dispose();
                shockRingMat.dispose();
                vaporRingGeo.dispose();
                vaporRingMat.dispose();
                sparkGeo.dispose();
                sparkMat.dispose();
                baseFireballGeo.dispose();
                baseFireballMat.dispose();

                // Gradually fade out scorch ring
                setTimeout(() => {
                    this.scene.remove(scorchMesh);
                    scorchGeo.dispose();
                    scorchMat.dispose();
                }, 12000);
            }
        }, 30);

        // 5. Heavy Camera Trauma Screen Shake
        this.trauma = Math.min(1.0, this.trauma + 1.0);
        this.triggerViewportShake();

        // 6. Check Building Damage, Ignite Flames & Violently Shatter into Flying Chunks
        let buildingsDemolished = 0;
        let anyBuildingHit = false;

        for (const building of this.targets) {
            if (!building.active) continue;

            const bPosGround = building.position.clone().setY(0);
            const blastGround = impactPos.clone().setY(0);
            const dist = bPosGround.distanceTo(blastGround);

            if (dist <= rocketType.blastRadius + building.size.w / 2 || building === hitTarget) {
                building.hp--;
                anyBuildingHit = true;

                // IGNITE BUILDING (Maja hakkab põlema)
                this.igniteBuilding(building);

                if (building.hp <= 0) {
                    buildingsDemolished++;
                    building.active = false;
                    building.respawnTimer = 7.0;
                    this.targetsHit++;
                    this.audio.playHitChime();

                    let earned = building.basePoints;
                    let label = 'BOOM! BUILDING DEMOLISHED! 🏢💥';
                    if (dist < 4.0 || hitDistFromCenter < 2.5) {
                        earned = Math.round(earned * 1.5);
                        label = 'BOOM! DIRECT SHATTER! 🎯🏙️';
                    }

                    earned = Math.round(earned * rocketType.scoreMultiplier);
                    this.currentScore += earned;
                    this.totalPointsBank += earned;
                    this.saveProgress();

                    this.showImpactToast(`${label} +${earned} PTS`);
                    this.updateHUD();

                    // Hide intact building structure
                    building.group.visible = false;
                    this.spawnBuildingRubble(building);

                    // VIOLENTLY EXPLODE AND SHATTER INTO 60-80 FLYING 3D PIECES (Maja lendab tükkideks)
                    this.spawnFlyingBuildingDebris(building, impactPos);
                } else {
                    // Building damaged and ignited! Award damage hit points and show arcade BOOM flame toast
                    const hitPoints = Math.round(building.basePoints * 0.5 * rocketType.scoreMultiplier);
                    this.currentScore += hitPoints;
                    this.totalPointsBank += hitPoints;
                    this.saveProgress();
                    this.updateHUD();
                    this.showImpactToast(`BOOM! BUILDING ON FIRE! 🔥🏢 +${hitPoints} PTS`);
                }
            }
        }

        if (buildingsDemolished === 0 && !anyBuildingHit) {
            this.showImpactToast('BOOM! 💥');
        }
    }

    // IGNITE BUILDING: Visible Flickering Flames, Scorched Walls, and Billowing Fire Light
    private igniteBuilding(building: DestructibleBuilding) {
        if (building.isBurning) return;
        building.isBurning = true;

        // Scorch building exterior
        (building.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x1a1512);

        // Dynamic flickering fire light
        const fLight = new THREE.PointLight(0xff5500, 6.0, building.size.w * 2.5);
        fLight.position.set(0, building.size.h * 0.6, 0);
        building.group.add(fLight);
        building.fireLight = fLight;

        // Fire group for flame tongues
        const fGroup = new THREE.Group();
        const flameCount = 18;
        const flameGeo = new THREE.ConeGeometry(1.2, 4.5, 6);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3b00, transparent: true, opacity: 0.9 });

        for (let i = 0; i < flameCount; i++) {
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(
                (Math.random() - 0.5) * (building.size.w * 0.8),
                building.size.h + Math.random() * 1.5,
                (Math.random() - 0.5) * (building.size.d * 0.8)
            );
            flame.rotation.z = (Math.random() - 0.5) * 0.3;
            fGroup.add(flame);
        }
        building.group.add(fGroup);
        building.fireParticles = fGroup;
    }

    // VIOLENTLY EXPLODE BUILDING INTO 60-80 PHYSICAL 3D FRAGMENTS
    private spawnFlyingBuildingDebris(building: DestructibleBuilding, blastOrigin: THREE.Vector3) {
        const chunkCount = 65; // Massive debris explosion
        const colors = [building.color, 0x475569, 0x334155, 0x94a3b8, 0x1e293b, 0x0f172a, 0xff5500];

        for (let i = 0; i < chunkCount; i++) {
            const cw = 0.9 + Math.random() * 2.4;
            const ch = 0.7 + Math.random() * 2.0;
            const cd = 0.9 + Math.random() * 2.4;

            const geo = new THREE.BoxGeometry(cw, ch, cd);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                roughness: 0.85,
                metalness: 0.3
            });
            const chunk = new THREE.Mesh(geo, mat);
            chunk.castShadow = true;
            chunk.receiveShadow = true;

            // Spawn inside the original building footprint
            const spawnX = building.position.x + (Math.random() - 0.5) * building.size.w;
            const spawnY = Math.random() * building.size.h + 0.8;
            const spawnZ = building.position.z + (Math.random() - 0.5) * building.size.d;
            chunk.position.set(spawnX, spawnY, spawnZ);

            // Explosive ballistic outward velocity
            const dirX = spawnX - blastOrigin.x;
            const dirZ = spawnZ - blastOrigin.z;
            const horizDist = Math.hypot(dirX, dirZ) || 1;

            const speed = 16 + Math.random() * 34;
            const vel = new THREE.Vector3(
                (dirX / horizDist) * speed + (Math.random() - 0.5) * 12,
                16 + Math.random() * 32, // High violent blast into the sky
                (dirZ / horizDist) * speed + (Math.random() - 0.5) * 12
            );

            this.debrisGroup.add(chunk);

            this.activeDebris.push({
                mesh: chunk,
                velocity: vel,
                rotAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
                rotSpeed: (Math.random() - 0.5) * 18,
                isGrounded: false,
                age: 0,
                maxAge: 9.0 + Math.random() * 4.0,
                isBurning: Math.random() > 0.4
            });
        }
    }

    private spawnBuildingRubble(building: DestructibleBuilding) {
        const rubbleGeo = new THREE.BoxGeometry(building.size.w * 0.95, 1.4, building.size.d * 0.95);
        const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.95 });
        const rubble = new THREE.Mesh(rubbleGeo, rubbleMat);
        rubble.position.set(building.position.x, 0.7, building.position.z);
        this.scene.add(rubble);
        building.rubbleMesh = rubble;

        // Burning embers on the rubble foundation
        const emberLight = new THREE.PointLight(0xff4400, 4.0, building.size.w * 1.5);
        emberLight.position.set(building.position.x, 2.0, building.position.z);
        this.scene.add(emberLight);

        // Continuous black smoke rising from ruins
        for (let p = 0; p < 8; p++) {
            setTimeout(() => {
                if (!building.active) {
                    const smokePos = building.position.clone().setY(2.2);
                    smokePos.x += (Math.random() - 0.5) * (building.size.w * 0.7);
                    smokePos.z += (Math.random() - 0.5) * (building.size.d * 0.7);
                    this.createSmokePuff(smokePos, 0x181820);
                }
            }, p * 350);
        }

        setTimeout(() => {
            this.scene.remove(emberLight);
            emberLight.dispose();
        }, 8000);
    }

    private triggerViewportShake() {
        const wrapper = document.getElementById('game-viewport-wrapper');
        if (wrapper) {
            wrapper.classList.remove('screen-shake');
            void wrapper.offsetWidth;
            wrapper.classList.add('screen-shake');
        }
        this.triggerNuclearScreenFlash();
    }

    private triggerNuclearScreenFlash() {
        const flashOverlay = document.getElementById('nuke-flash-overlay');
        const thermalTint = document.getElementById('nuke-thermal-tint');

        if (flashOverlay) {
            flashOverlay.style.opacity = '1';
            setTimeout(() => {
                flashOverlay.style.transition = 'opacity 0.75s ease-out';
                flashOverlay.style.opacity = '0';
            }, 60);
        }

        if (thermalTint) {
            setTimeout(() => {
                thermalTint.style.opacity = '0.85';
                setTimeout(() => {
                    thermalTint.style.transition = 'opacity 1.8s ease-out';
                    thermalTint.style.opacity = '0';
                }, 400);
            }, 80);
        }
    }

    private showImpactToast(text: string) {
        const container = document.getElementById('impact-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'boom-toast';
        toast.textContent = text;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 1300);
    }

    private startRoundTimer() {
        if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
        this.roundRemaining = this.roundDuration;
        this.roundActive = true;

        this.roundTimerInterval = setInterval(() => {
            if (!this.roundActive) return;
            this.roundRemaining--;
            this.updateHUD();

            if (this.roundRemaining <= 0) {
                this.endRound();
            }
        }, 1000);
    }

    public endRound() {
        this.roundActive = false;
        clearInterval(this.roundTimerInterval);
        this.audio.playFanfare();

        const acc = this.shotsFired > 0 ? Math.round((this.targetsHit / this.shotsFired) * 100) : 0;
        const yardsReward = Math.max(10, Math.min(100, Math.floor(this.currentScore / 80)));
        try {
            yardService.awardYards(yardsReward);
        } catch (e) {}

        const scoreDisp = document.getElementById('winner-score-display');
        if (scoreDisp) scoreDisp.textContent = `${this.currentScore} PTS`;

        const hitDisp = document.getElementById('winner-targets-hit');
        if (hitDisp) hitDisp.textContent = `${this.targetsHit}`;

        const shotDisp = document.getElementById('winner-shots-fired');
        if (shotDisp) shotDisp.textContent = `${this.shotsFired}`;

        const accDisp = document.getElementById('winner-accuracy');
        if (accDisp) accDisp.textContent = `${acc}%`;

        const rewardDisp = document.getElementById('winner-yards-reward');
        if (rewardDisp) rewardDisp.textContent = `+${yardsReward} Y`;

        this.toggleModal('round-end-modal', true);
    }

    private resetRound() {
        this.currentScore = 0;
        this.shotsFired = 0;
        this.targetsHit = 0;
        this.ringPosition.set(0, 0.2, 0);

        this.targets.forEach(b => {
            b.active = true;
            b.hp = b.maxHp;
            b.isBurning = false;
            b.group.visible = true;
            b.respawnTimer = 0;
            (b.mesh.material as THREE.MeshStandardMaterial).color.setHex(b.color);

            if (b.fireLight) {
                b.group.remove(b.fireLight);
                b.fireLight.dispose();
                b.fireLight = undefined;
            }
            if (b.fireParticles) {
                b.group.remove(b.fireParticles);
                b.fireParticles = undefined;
            }
            if (b.rubbleMesh) {
                this.scene.remove(b.rubbleMesh);
                b.rubbleMesh.geometry.dispose();
                (b.rubbleMesh.material as THREE.Material).dispose();
                b.rubbleMesh = undefined;
            }
        });

        for (const deb of this.activeDebris) {
            this.debrisGroup.remove(deb.mesh);
            deb.mesh.geometry.dispose();
            (deb.mesh.material as THREE.Material).dispose();
        }
        this.activeDebris = [];

        this.updateHUD();
        this.startRoundTimer();
    }

    private toggleModal(id: string, show: boolean) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = show ? 'flex' : 'none';
        }
    }

    private toggleShop(show: boolean) {
        this.toggleModal('rocket-shop-modal', show);
        if (show) {
            this.renderShopCatalog();
        }
    }

    public renderShopCatalog() {
        const list = document.getElementById('rocket-catalog-list');
        const pointsDisp = document.getElementById('shop-points-display');
        const countBadge = document.getElementById('shop-count-badge');

        if (pointsDisp) pointsDisp.textContent = `${this.totalPointsBank} PTS`;
        if (countBadge) countBadge.textContent = `${ROCKET_CATALOG.length} unikaalset raketti`;
        if (!list) return;

        list.innerHTML = '';

        const filtered = ROCKET_CATALOG.filter(r => {
            if (this.activeCategory === 'all') return true;
            return r.category === this.activeCategory;
        });

        filtered.forEach(rocket => {
            const isEquipped = this.equippedRocket.id === rocket.id;
            const isUnlocked = this.unlockedRockets.has(rocket.id);

            const card = document.createElement('div');
            card.className = `rocket-item-card ${isEquipped ? 'equipped' : ''}`;

            card.innerHTML = `
                <div class="rocket-item-title">
                    <span>${rocket.icon}</span>
                    <span>${rocket.name}</span>
                </div>
                <div class="rocket-item-desc">${rocket.desc}</div>
                <div class="rocket-item-stats">Kiirus: ${rocket.speed} m/s · Raadius: ${rocket.blastRadius}m · ${rocket.scoreMultiplier}x punktid</div>
                <button type="button" class="rocket-action-btn ${isEquipped ? 'btn-equipped' : (isUnlocked ? 'btn-equip' : 'btn-buy')}" data-id="${rocket.id}">
                    ${isEquipped ? '✓ KASUTUSES' : (isUnlocked ? 'KASUTA' : `OSTA (${rocket.price} PTS)`)}
                </button>
            `;

            const btn = card.querySelector('button');
            if (btn) {
                btn.addEventListener('click', () => {
                    this.handleRocketAction(rocket);
                });
            }

            list.appendChild(card);
        });
    }

    private handleRocketAction(rocket: RocketType) {
        if (this.unlockedRockets.has(rocket.id)) {
            this.equippedRocket = rocket;
            this.ringMaterial.color.setHex(rocket.color);
            this.saveProgress();
            this.updateHUD();
            this.renderShopCatalog();
            this.audio.playPurchase();
        } else if (this.totalPointsBank >= rocket.price) {
            this.totalPointsBank -= rocket.price;
            this.unlockedRockets.add(rocket.id);
            this.equippedRocket = rocket;
            this.ringMaterial.color.setHex(rocket.color);
            this.saveProgress();
            this.updateHUD();
            this.renderShopCatalog();
            this.audio.playPurchase();
            this.showImpactToast(`AVATUD: ${rocket.name}! 🚀`);
        } else {
            this.showImpactToast('POLE PIISAVALT PUNKTE!');
        }
    }

    private updateHUD() {
        const timerText = document.getElementById('hud-timer-text');
        if (timerText) {
            const m = Math.floor(this.roundRemaining / 60);
            const s = this.roundRemaining % 60;
            timerText.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        const scoreText = document.getElementById('hud-score-text');
        if (scoreText) scoreText.textContent = `${this.currentScore} PTS`;

        const rocketName = document.getElementById('hud-rocket-name');
        if (rocketName) rocketName.textContent = this.equippedRocket.name;

        const rocketIcon = document.getElementById('hud-rocket-icon');
        if (rocketIcon) rocketIcon.textContent = this.equippedRocket.icon;

        const yardText = document.getElementById('hud-yard-text');
        if (yardText) {
            try {
                yardText.textContent = `${yardService.getYards()} Y`;
            } catch (e) {
                yardText.textContent = '0 Y';
            }
        }
    }

    private saveProgress() {
        try {
            const data = {
                bank: this.totalPointsBank,
                unlocked: Array.from(this.unlockedRockets),
                equipped: this.equippedRocket.id
            };
            localStorage.setItem('playard_rocket_save', JSON.stringify(data));
        } catch (e) {}
    }

    private loadProgress() {
        try {
            const raw = localStorage.getItem('playard_rocket_save');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.bank === 'number') this.totalPointsBank = parsed.bank;
                if (Array.isArray(parsed.unlocked)) {
                    parsed.unlocked.forEach((id: string) => this.unlockedRockets.add(id));
                }
                if (parsed.equipped) {
                    const found = ROCKET_CATALOG.find(r => r.id === parsed.equipped);
                    if (found) {
                        this.equippedRocket = found;
                        this.ringMaterial.color.setHex(found.color);
                    }
                }
            }
        } catch (e) {}
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private updateTargetRing(dt: number) {
        let moveX = 0;
        let moveZ = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

        if (this.isMobileDevice && (this.mobileMoveVector.x !== 0 || this.mobileMoveVector.y !== 0)) {
            moveX = this.mobileMoveVector.x;
            moveZ = this.mobileMoveVector.y;
        }

        const ringSpeed = 46.0;
        this.ringPosition.x += moveX * ringSpeed * dt;
        this.ringPosition.z += moveZ * ringSpeed * dt;

        this.ringPosition.x = Math.max(-140, Math.min(140, this.ringPosition.x));
        this.ringPosition.z = Math.max(-140, Math.min(140, this.ringPosition.z));

        this.targetRing.position.copy(this.ringPosition);
        this.targetRing.rotation.y += dt * 1.6;

        // Smooth overhead camera tracking
        const targetCamX = this.ringPosition.x * 0.45;
        const targetCamZ = this.ringPosition.z * 0.45 + 56;
        const targetCamY = 78;

        this.camera.position.x += (targetCamX - this.camera.position.x) * 4 * dt;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * 4 * dt;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 4 * dt;

        // Violent trauma shake
        if (this.trauma > 0) {
            const shake = this.trauma * this.trauma * 5.0;
            this.camera.position.x += (Math.random() - 0.5) * shake;
            this.camera.position.y += (Math.random() - 0.5) * shake;
            this.camera.position.z += (Math.random() - 0.5) * shake;
            this.trauma = Math.max(0, this.trauma - dt * 2.2);
        }

        const lookAtTarget = new THREE.Vector3(this.ringPosition.x * 0.6, 0, this.ringPosition.z * 0.6 - 6);
        this.camera.lookAt(lookAtTarget);
    }

    private updateRockets(dt: number) {
        for (let i = this.activeRockets.length - 1; i >= 0; i--) {
            const rocket = this.activeRockets[i];
            const oldPos = rocket.mesh.position.clone();
            const step = rocket.velocity.clone().multiplyScalar(dt);
            const newPos = oldPos.clone().add(step);

            this.createSmokePuff(oldPos, rocket.rocketType.trailColor);

            if (newPos.y <= rocket.targetPos.y || oldPos.distanceTo(rocket.targetPos) < step.length()) {
                this.triggerExplosion(rocket.targetPos, rocket.rocketType);
                this.scene.remove(rocket.mesh);
                this.activeRockets.splice(i, 1);
                continue;
            }

            if (performance.now() - rocket.spawnTime > 5000) {
                this.scene.remove(rocket.mesh);
                this.activeRockets.splice(i, 1);
                continue;
            }

            rocket.mesh.position.copy(newPos);
        }
    }

    // Update physical flying building fragments
    private updateDebris(dt: number) {
        for (let i = this.activeDebris.length - 1; i >= 0; i--) {
            const deb = this.activeDebris[i];
            deb.age += dt;

            if (!deb.isGrounded) {
                deb.velocity.y -= 36 * dt; // Gravity
                deb.mesh.position.addScaledVector(deb.velocity, dt);
                deb.mesh.rotateOnAxis(deb.rotAxis, deb.rotSpeed * dt);

                // Flying chunks emit smoke puffs while in the air
                if (deb.isBurning && Math.random() < 0.15) {
                    this.createSmokePuff(deb.mesh.position, 0x1f242d);
                }

                // Ground bounce
                if (deb.mesh.position.y <= 0.45) {
                    deb.mesh.position.y = 0.45;
                    if (Math.abs(deb.velocity.y) > 3.0) {
                        deb.velocity.y = -deb.velocity.y * 0.38;
                        deb.velocity.x *= 0.65;
                        deb.velocity.z *= 0.65;
                        deb.rotSpeed *= 0.65;
                    } else {
                        deb.velocity.set(0, 0, 0);
                        deb.isGrounded = true;
                    }
                }
            }

            if (deb.age >= deb.maxAge) {
                this.debrisGroup.remove(deb.mesh);
                deb.mesh.geometry.dispose();
                (deb.mesh.material as THREE.Material).dispose();
                this.activeDebris.splice(i, 1);
            }
        }
    }

    private createSmokePuff(pos: THREE.Vector3, color: number) {
        const puff = new THREE.Mesh(
            new THREE.SphereGeometry(0.5 + Math.random() * 0.35, 8, 8),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.85
            })
        );
        puff.position.copy(pos);
        this.particlePuffGroup.add(puff);

        let age = 0;
        const interval = setInterval(() => {
            age += 0.04;
            puff.scale.multiplyScalar(1.12);
            (puff.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - age * 2.5);

            if (age >= 0.34) {
                clearInterval(interval);
                this.particlePuffGroup.remove(puff);
                puff.geometry.dispose();
                (puff.material as THREE.Material).dispose();
            }
        }, 30);
    }

    // Update burning buildings & flame animations
    private updateBuildings(dt: number, time: number) {
        for (const building of this.targets) {
            // Animate building flames if burning
            if (building.isBurning && building.active && building.fireParticles) {
                building.fireParticles.children.forEach((flame, idx) => {
                    const scaleY = 1.0 + Math.sin(time * 12 + idx) * 0.35;
                    flame.scale.set(1.0, scaleY, 1.0);
                });
                if (building.fireLight) {
                    building.fireLight.intensity = 5.0 + Math.sin(time * 15) * 1.5;
                }
                // Periodic smoke rising from burning roof
                if (Math.random() < 0.25) {
                    const sPos = building.position.clone();
                    sPos.y = building.size.h + 2.0;
                    sPos.x += (Math.random() - 0.5) * (building.size.w * 0.7);
                    sPos.z += (Math.random() - 0.5) * (building.size.d * 0.7);
                    this.createSmokePuff(sPos, 0x14161c);
                }
            }

            if (!building.active) {
                building.respawnTimer -= dt;
                if (building.respawnTimer <= 0) {
                    building.active = true;
                    building.hp = building.maxHp;
                    building.isBurning = false;
                    building.group.visible = true;
                    (building.mesh.material as THREE.MeshStandardMaterial).color.setHex(building.color);

                    if (building.fireLight) {
                        building.group.remove(building.fireLight);
                        building.fireLight.dispose();
                        building.fireLight = undefined;
                    }
                    if (building.fireParticles) {
                        building.group.remove(building.fireParticles);
                        building.fireParticles = undefined;
                    }
                    if (building.rubbleMesh) {
                        this.scene.remove(building.rubbleMesh);
                        building.rubbleMesh.geometry.dispose();
                        (building.rubbleMesh.material as THREE.Material).dispose();
                        building.rubbleMesh = undefined;
                    }
                }
            }
        }
    }

    private lastTime = 0;
    private animate(timestamp: number) {
        requestAnimationFrame((t) => this.animate(t));

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        const time = timestamp / 1000;

        this.updateTargetRing(dt);
        this.updateRockets(dt);
        this.updateDebris(dt);
        this.updateBuildings(dt, time);

        this.renderer.render(this.scene, this.camera);
    }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
    const game = new RocketGame();
    (window as any).rocketGame = game;
    game.init();
});
