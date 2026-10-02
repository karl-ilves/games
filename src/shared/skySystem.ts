import * as THREE from 'three';

export type SkyMode = 'day' | 'night' | 'sunset' | 'sunrise' | 'space' | 'alien' | 'custom';
export type WeatherType = 'clear' | 'cloudy' | 'storm' | 'rain' | 'snow' | 'fog';
export type CelestialTheme = 'earth' | 'space' | 'mars' | 'cyberpunk' | 'nebula' | 'sunset' | 'aurora' | 'alien_planet';

export interface SkySunConfig {
    enabled: boolean;
    position: [number, number, number];
    size: number;
    color: number;
    intensity: number;
}

export interface SkyMoonConfig {
    enabled: boolean;
    position: [number, number, number];
    size: number;
    color: number;
    glow: boolean;
    phase?: number;
}

export interface SkyStarsConfig {
    enabled: boolean;
    count: number;
    size: number;
    color: number;
    twinkle: boolean;
}

export interface SkyCloudsConfig {
    enabled: boolean;
    density: number;
    speed: number;
    altitude: number;
    color: number;
}

export interface SkyPrecipitationConfig {
    type: 'none' | 'rain' | 'snow';
    intensity: number;
    speed: number;
    particleCount: number;
}

export interface SkyCycleConfig {
    enabled: boolean;
    speed: number; // rate of time progression
    currentTime: number; // 0 to 24 hours
}

export interface SkyWeatherCycleConfig {
    enabled: boolean;
    intervalSeconds: number;
    patterns: WeatherType[];
}

export interface SkyBiomeTrigger {
    biome: string;
    radius: number;
    center: [number, number, number];
    skyConfig: Partial<SkyConfig>;
}

export interface SkyEventTrigger {
    event: string;
    description: string;
    targetSky: Partial<SkyConfig>;
}

export interface SkyConfig {
    mode: SkyMode;
    weather: WeatherType;
    theme: CelestialTheme;
    skyColor: number;
    horizonColor: number;
    zenithColor: number;
    lightColor: number;
    ambientColor: number;
    fogColor: number;
    fogDensity: number;
    brightness: number;
    sun: SkySunConfig;
    moon: SkyMoonConfig;
    stars: SkyStarsConfig;
    clouds: SkyCloudsConfig;
    precipitation: SkyPrecipitationConfig;
    cycle: SkyCycleConfig;
    weatherCycle?: SkyWeatherCycleConfig;
    eventTriggers?: SkyEventTrigger[];
    biomeTriggers?: SkyBiomeTrigger[];
}

export const SKY_PRESETS: Record<string, SkyConfig> = {
    day: {
        mode: 'day',
        weather: 'clear',
        theme: 'earth',
        skyColor: 0x87ceeb,
        horizonColor: 0xb0e0e6,
        zenithColor: 0x4682b4,
        lightColor: 0xfff4e0,
        ambientColor: 0xddeeff,
        fogColor: 0x87ceeb,
        fogDensity: 0.005,
        brightness: 1.0,
        sun: {
            enabled: true,
            position: [30, 60, 20],
            size: 4,
            color: 0xfff7c2,
            intensity: 1.2
        },
        moon: {
            enabled: false,
            position: [-30, -50, -20],
            size: 2.5,
            color: 0xe0e7ff,
            glow: false
        },
        stars: {
            enabled: false,
            count: 0,
            size: 0.8,
            color: 0xffffff,
            twinkle: false
        },
        clouds: {
            enabled: true,
            density: 0.4,
            speed: 0.5,
            altitude: 45,
            color: 0xffffff
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 12
        }
    },
    night: {
        mode: 'night',
        weather: 'clear',
        theme: 'earth',
        skyColor: 0x05051a,
        horizonColor: 0x0b112c,
        zenithColor: 0x02020a,
        lightColor: 0x334466,
        ambientColor: 0x11162b,
        fogColor: 0x05051a,
        fogDensity: 0.012,
        brightness: 0.35,
        sun: {
            enabled: false,
            position: [-30, -60, -20],
            size: 3,
            color: 0xff8833,
            intensity: 0.1
        },
        moon: {
            enabled: true,
            position: [25, 55, -25],
            size: 5,
            color: 0xe2e8f0,
            glow: true
        },
        stars: {
            enabled: true,
            count: 1200,
            size: 1.2,
            color: 0xf8fafc,
            twinkle: true
        },
        clouds: {
            enabled: true,
            density: 0.2,
            speed: 0.2,
            altitude: 45,
            color: 0x1e293b
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 0
        }
    },
    sunset: {
        mode: 'sunset',
        weather: 'clear',
        theme: 'sunset',
        skyColor: 0xff6b4a,
        horizonColor: 0xfdbb2d,
        zenithColor: 0x221c35,
        lightColor: 0xff8c42,
        ambientColor: 0x5a2d4b,
        fogColor: 0xff7b54,
        fogDensity: 0.008,
        brightness: 0.8,
        sun: {
            enabled: true,
            position: [40, 10, -20],
            size: 6,
            color: 0xff4500,
            intensity: 1.1
        },
        moon: {
            enabled: true,
            position: [-35, 30, 20],
            size: 3,
            color: 0xffeedd,
            glow: false
        },
        stars: {
            enabled: true,
            count: 350,
            size: 1.0,
            color: 0xfff1e6,
            twinkle: true
        },
        clouds: {
            enabled: true,
            density: 0.5,
            speed: 0.4,
            altitude: 42,
            color: 0xfca5a5
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 19
        }
    },
    sunrise: {
        mode: 'sunrise',
        weather: 'clear',
        theme: 'sunset',
        skyColor: 0xf97316,
        horizonColor: 0xfef08a,
        zenithColor: 0x1e3a8a,
        lightColor: 0xfed7aa,
        ambientColor: 0x475569,
        fogColor: 0xfba97a,
        fogDensity: 0.009,
        brightness: 0.75,
        sun: {
            enabled: true,
            position: [-40, 12, 20],
            size: 5.5,
            color: 0xf59e0b,
            intensity: 1.0
        },
        moon: {
            enabled: false,
            position: [35, -20, -20],
            size: 2.5,
            color: 0xffffff,
            glow: false
        },
        stars: {
            enabled: true,
            count: 200,
            size: 0.9,
            color: 0xffffff,
            twinkle: true
        },
        clouds: {
            enabled: true,
            density: 0.35,
            speed: 0.4,
            altitude: 45,
            color: 0xfef08a
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 6
        }
    },
    cloudy: {
        mode: 'day',
        weather: 'cloudy',
        theme: 'earth',
        skyColor: 0x94a3b8,
        horizonColor: 0xcbd5e1,
        zenithColor: 0x64748b,
        lightColor: 0xd4d4d8,
        ambientColor: 0xa1a1aa,
        fogColor: 0x94a3b8,
        fogDensity: 0.015,
        brightness: 0.75,
        sun: {
            enabled: true,
            position: [20, 50, 20],
            size: 3.5,
            color: 0xf3f4f6,
            intensity: 0.6
        },
        moon: {
            enabled: false,
            position: [0, -50, 0],
            size: 2,
            color: 0xffffff,
            glow: false
        },
        stars: {
            enabled: false,
            count: 0,
            size: 0.8,
            color: 0xffffff,
            twinkle: false
        },
        clouds: {
            enabled: true,
            density: 0.9,
            speed: 0.8,
            altitude: 35,
            color: 0xe2e8f0
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 14
        }
    },
    storm: {
        mode: 'custom',
        weather: 'storm',
        theme: 'earth',
        skyColor: 0x1e293b,
        horizonColor: 0x0f172a,
        zenithColor: 0x090d16,
        lightColor: 0x64748b,
        ambientColor: 0x1e293b,
        fogColor: 0x1e293b,
        fogDensity: 0.025,
        brightness: 0.45,
        sun: {
            enabled: false,
            position: [0, -50, 0],
            size: 2,
            color: 0xffffff,
            intensity: 0.1
        },
        moon: {
            enabled: false,
            position: [0, -50, 0],
            size: 2,
            color: 0xffffff,
            glow: false
        },
        stars: {
            enabled: false,
            count: 0,
            size: 0.8,
            color: 0xffffff,
            twinkle: false
        },
        clouds: {
            enabled: true,
            density: 1.0,
            speed: 1.8,
            altitude: 30,
            color: 0x334155
        },
        precipitation: {
            type: 'rain',
            intensity: 1.0,
            speed: 2.2,
            particleCount: 1500
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 17
        }
    },
    rain: {
        mode: 'custom',
        weather: 'rain',
        theme: 'earth',
        skyColor: 0x475569,
        horizonColor: 0x64748b,
        zenithColor: 0x334155,
        lightColor: 0x94a3b8,
        ambientColor: 0x475569,
        fogColor: 0x475569,
        fogDensity: 0.02,
        brightness: 0.6,
        sun: {
            enabled: true,
            position: [20, 45, 10],
            size: 3,
            color: 0xcbd5e1,
            intensity: 0.4
        },
        moon: {
            enabled: false,
            position: [0, -50, 0],
            size: 2,
            color: 0xffffff,
            glow: false
        },
        stars: {
            enabled: false,
            count: 0,
            size: 0.8,
            color: 0xffffff,
            twinkle: false
        },
        clouds: {
            enabled: true,
            density: 0.85,
            speed: 0.9,
            altitude: 35,
            color: 0x64748b
        },
        precipitation: {
            type: 'rain',
            intensity: 0.7,
            speed: 1.8,
            particleCount: 1000
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 15
        }
    },
    snow: {
        mode: 'custom',
        weather: 'snow',
        theme: 'earth',
        skyColor: 0xdbeafe,
        horizonColor: 0xf1f5f9,
        zenithColor: 0xbfdbfe,
        lightColor: 0xf8fafc,
        ambientColor: 0x93c5fd,
        fogColor: 0xdbeafe,
        fogDensity: 0.022,
        brightness: 0.85,
        sun: {
            enabled: true,
            position: [15, 35, 15],
            size: 3,
            color: 0xfffbeb,
            intensity: 0.7
        },
        moon: {
            enabled: false,
            position: [0, -50, 0],
            size: 2,
            color: 0xffffff,
            glow: false
        },
        stars: {
            enabled: false,
            count: 0,
            size: 0.8,
            color: 0xffffff,
            twinkle: false
        },
        clouds: {
            enabled: true,
            density: 0.75,
            speed: 0.4,
            altitude: 38,
            color: 0xf8fafc
        },
        precipitation: {
            type: 'snow',
            intensity: 0.8,
            speed: 0.5,
            particleCount: 800
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 11
        }
    },
    fog: {
        mode: 'custom',
        weather: 'fog',
        theme: 'earth',
        skyColor: 0xcccccc,
        horizonColor: 0xe5e7eb,
        zenithColor: 0x9ca3af,
        lightColor: 0xdddddd,
        ambientColor: 0xbbbbbb,
        fogColor: 0xcccccc,
        fogDensity: 0.045,
        brightness: 0.65,
        sun: {
            enabled: true,
            position: [10, 30, 10],
            size: 3,
            color: 0xffffff,
            intensity: 0.35
        },
        moon: {
            enabled: false,
            position: [0, -50, 0],
            size: 2,
            color: 0xffffff,
            glow: false
        },
        stars: {
            enabled: false,
            count: 0,
            size: 0.8,
            color: 0xffffff,
            twinkle: false
        },
        clouds: {
            enabled: true,
            density: 0.6,
            speed: 0.15,
            altitude: 25,
            color: 0xd1d5db
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 7
        }
    },
    space: {
        mode: 'space',
        weather: 'clear',
        theme: 'space',
        skyColor: 0x000003,
        horizonColor: 0x00000a,
        zenithColor: 0x000000,
        lightColor: 0xffffff,
        ambientColor: 0x111122,
        fogColor: 0x000005,
        fogDensity: 0.001,
        brightness: 0.4,
        sun: {
            enabled: true,
            position: [70, 40, -50],
            size: 6,
            color: 0xffffff,
            intensity: 1.8
        },
        moon: {
            enabled: true,
            position: [-50, 20, 60], // Earth / distant sphere
            size: 9,
            color: 0x38bdf8,
            glow: true
        },
        stars: {
            enabled: true,
            count: 2200,
            size: 1.5,
            color: 0xffffff,
            twinkle: true
        },
        clouds: {
            enabled: false,
            density: 0,
            speed: 0,
            altitude: 0,
            color: 0x000000
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 0
        }
    },
    mars: {
        mode: 'custom',
        weather: 'clear',
        theme: 'mars',
        skyColor: 0xb91c1c,
        horizonColor: 0xe11d48,
        zenithColor: 0x7f1d1d,
        lightColor: 0xfca5a5,
        ambientColor: 0x991b1b,
        fogColor: 0xb91c1c,
        fogDensity: 0.012,
        brightness: 0.7,
        sun: {
            enabled: true,
            position: [25, 45, 15],
            size: 3,
            color: 0xfef08a,
            intensity: 0.9
        },
        moon: {
            enabled: true,
            position: [-30, 50, -20], // Phobos
            size: 2,
            color: 0x94a3b8,
            glow: false
        },
        stars: {
            enabled: true,
            count: 800,
            size: 1.1,
            color: 0xfecaca,
            twinkle: true
        },
        clouds: {
            enabled: true,
            density: 0.3,
            speed: 0.4,
            altitude: 40,
            color: 0xd97706
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 13
        }
    },
    alien_planet: {
        mode: 'alien',
        weather: 'clear',
        theme: 'alien_planet',
        skyColor: 0x4c1d95,
        horizonColor: 0x06b6d4,
        zenithColor: 0x2e1065,
        lightColor: 0xa855f7,
        ambientColor: 0x581c87,
        fogColor: 0x4c1d95,
        fogDensity: 0.01,
        brightness: 0.8,
        sun: {
            enabled: true,
            position: [35, 50, 10],
            size: 5,
            color: 0x06b6d4,
            intensity: 1.3
        },
        moon: {
            enabled: true,
            position: [-25, 60, -30],
            size: 7,
            color: 0xf43f5e,
            glow: true
        },
        stars: {
            enabled: true,
            count: 1600,
            size: 1.4,
            color: 0x67e8f9,
            twinkle: true
        },
        clouds: {
            enabled: true,
            density: 0.5,
            speed: 0.6,
            altitude: 42,
            color: 0xc084fc
        },
        precipitation: {
            type: 'none',
            intensity: 0,
            speed: 1,
            particleCount: 0
        },
        cycle: {
            enabled: false,
            speed: 1,
            currentTime: 22
        }
    }
};

/**
 * PlayardSkySystem: Three.js Sky, Atmosphere, Celestial bodies & Weather Engine
 */
export class PlayardSkySystem {
    public config: SkyConfig;
    private scene: THREE.Scene;
    private dirLight: THREE.DirectionalLight;
    private hemiLight: THREE.HemisphereLight;

    // 3D Visual Objects
    public skyRootGroup: THREE.Group;
    public sunMesh: THREE.Mesh | null = null;
    public moonMesh: THREE.Mesh | null = null;
    public moonGlowMesh: THREE.Mesh | null = null;
    public starsPoints: THREE.Points | null = null;
    public cloudsGroup: THREE.Group | null = null;
    public precipitationPoints: THREE.Points | null = null;
    private precipitationVelocities: number[] = [];

    // Animation & Cycle state
    private cycleAngle: number = 0; // 0 to 2*PI
    private weatherTimer: number = 0;
    private currentPatternIndex: number = 0;

    constructor(scene: THREE.Scene, dirLight: THREE.DirectionalLight, hemiLight: THREE.HemisphereLight, initialConfig?: Partial<SkyConfig>) {
        this.scene = scene;
        this.dirLight = dirLight;
        this.hemiLight = hemiLight;

        this.skyRootGroup = new THREE.Group();
        this.skyRootGroup.name = 'playard_sky_system';
        this.scene.add(this.skyRootGroup);

        this.config = JSON.parse(JSON.stringify(SKY_PRESETS.day));
        if (initialConfig) {
            this.mergeConfig(initialConfig);
        }
        this.rebuildAll();
    }

    public mergeConfig(partial: Partial<SkyConfig>) {
        this.config = {
            ...this.config,
            ...partial,
            sun: { ...this.config.sun, ...(partial.sun || {}) },
            moon: { ...this.config.moon, ...(partial.moon || {}) },
            stars: { ...this.config.stars, ...(partial.stars || {}) },
            clouds: { ...this.config.clouds, ...(partial.clouds || {}) },
            precipitation: { ...this.config.precipitation, ...(partial.precipitation || {}) },
            cycle: { ...this.config.cycle, ...(partial.cycle || {}) }
        };
    }

    public applyConfig(newConfig?: Partial<SkyConfig>, fallbackSkyColor?: number) {
        if (!newConfig && fallbackSkyColor !== undefined) {
            this.config.skyColor = fallbackSkyColor;
            this.scene.background = new THREE.Color(fallbackSkyColor);
            if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
                this.scene.fog.color.setHex(fallbackSkyColor);
            }
            return;
        }

        if (newConfig) {
            this.mergeConfig(newConfig);
        }
        this.rebuildAll();
    }

    public setTimeOfDay(time: 'day' | 'night' | 'sunset' | 'sunrise' | 'space' | 'alien') {
        const preset = SKY_PRESETS[time] || SKY_PRESETS.day;
        this.applyConfig(JSON.parse(JSON.stringify(preset)));
    }

    public setWeather(weather: WeatherType) {
        const preset = SKY_PRESETS[weather];
        if (preset) {
            this.applyConfig(JSON.parse(JSON.stringify(preset)));
        } else {
            this.config.weather = weather;
            this.rebuildPrecipitation();
        }
    }

    public setSunPosition(x: number, y: number, z: number) {
        this.config.sun.position = [x, y, z];
        this.config.sun.enabled = true;
        if (this.sunMesh) {
            this.sunMesh.position.set(x, y, z);
            this.sunMesh.visible = true;
        }
        this.dirLight.position.set(x, y, z);
    }

    public setMoonPosition(x: number, y: number, z: number, size?: number) {
        this.config.moon.position = [x, y, z];
        this.config.moon.enabled = true;
        if (size) this.config.moon.size = size;
        if (this.moonMesh) {
            this.moonMesh.position.set(x, y, z);
            if (size) this.moonMesh.scale.set(size, size, size);
            this.moonMesh.visible = true;
        }
        if (this.moonGlowMesh) {
            this.moonGlowMesh.position.set(x, y, z);
            if (size) this.moonGlowMesh.scale.set(size * 1.3, size * 1.3, size * 1.3);
            this.moonGlowMesh.visible = true;
        }
    }

    public setStars(enabled: boolean, count: number = 1000) {
        this.config.stars.enabled = enabled;
        this.config.stars.count = count;
        this.rebuildStars();
    }

    public setClouds(enabled: boolean, density: number = 0.5) {
        this.config.clouds.enabled = enabled;
        this.config.clouds.density = density;
        this.rebuildClouds();
    }

    public setDayNightCycle(enabled: boolean, speed: number = 1) {
        this.config.cycle.enabled = enabled;
        this.config.cycle.speed = speed;
    }

    public rebuildAll() {
        // Clear root children
        while (this.skyRootGroup.children.length > 0) {
            const child = this.skyRootGroup.children[0];
            this.skyRootGroup.remove(child);
        }

        // Apply background, fog, and light
        this.scene.background = new THREE.Color(this.config.skyColor);
        if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.color.setHex(this.config.fogColor || this.config.skyColor);
            this.scene.fog.density = this.config.fogDensity;
        }
        this.dirLight.color.setHex(this.config.lightColor);
        this.hemiLight.color.setHex(this.config.lightColor);
        this.hemiLight.groundColor.setHex(this.config.ambientColor);

        // Rebuild components
        this.rebuildSun();
        this.rebuildMoon();
        this.rebuildStars();
        this.rebuildClouds();
        this.rebuildPrecipitation();
    }

    private rebuildSun() {
        const sun = this.config.sun;
        if (!sun.enabled) {
            this.sunMesh = null;
            return;
        }

        const geo = new THREE.SphereGeometry(sun.size, 24, 24);
        const mat = new THREE.MeshBasicMaterial({
            color: sun.color,
            wireframe: false
        });
        this.sunMesh = new THREE.Mesh(geo, mat);
        this.sunMesh.position.set(sun.position[0], sun.position[1], sun.position[2]);
        this.skyRootGroup.add(this.sunMesh);

        // Corona / glow ring
        const coronaGeo = new THREE.RingGeometry(sun.size * 1.1, sun.size * 2.2, 32);
        const coronaMat = new THREE.MeshBasicMaterial({
            color: sun.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4
        });
        const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
        coronaMesh.lookAt(0, 0, 0);
        this.sunMesh.add(coronaMesh);

        this.dirLight.position.set(sun.position[0], sun.position[1], sun.position[2]);
        this.dirLight.intensity = sun.intensity * this.config.brightness;
    }

    private rebuildMoon() {
        const moon = this.config.moon;
        if (!moon.enabled) {
            this.moonMesh = null;
            this.moonGlowMesh = null;
            return;
        }

        const geo = new THREE.SphereGeometry(moon.size, 24, 24);
        const mat = new THREE.MeshStandardMaterial({
            color: moon.color,
            roughness: 0.9,
            metalness: 0.1,
            emissive: moon.glow ? 0x223344 : 0x000000
        });
        this.moonMesh = new THREE.Mesh(geo, mat);
        this.moonMesh.position.set(moon.position[0], moon.position[1], moon.position[2]);
        this.skyRootGroup.add(this.moonMesh);

        // Add lunar craters
        const craterMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
        for (let i = 0; i < 5; i++) {
            const craterGeo = new THREE.CircleGeometry(moon.size * 0.18, 12);
            const crater = new THREE.Mesh(craterGeo, craterMat);
            const angle = (i / 5) * Math.PI * 2;
            crater.position.set(
                Math.sin(angle) * (moon.size * 0.6),
                Math.cos(angle) * (moon.size * 0.6),
                moon.size * 0.9
            );
            crater.rotation.z = angle;
            this.moonMesh.add(crater);
        }

        if (moon.glow) {
            const glowGeo = new THREE.SphereGeometry(moon.size * 1.35, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({
                color: moon.color,
                transparent: true,
                opacity: 0.25,
                wireframe: true
            });
            this.moonGlowMesh = new THREE.Mesh(glowGeo, glowMat);
            this.moonGlowMesh.position.set(moon.position[0], moon.position[1], moon.position[2]);
            this.skyRootGroup.add(this.moonGlowMesh);
        }
    }

    private rebuildStars() {
        const stars = this.config.stars;
        if (!stars.enabled || stars.count <= 0) {
            this.starsPoints = null;
            return;
        }

        const count = Math.min(stars.count, 4000);
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const baseColor = new THREE.Color(stars.color);

        const radius = 250;
        for (let i = 0; i < count; i++) {
            // Spherical distribution in upper hemisphere
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const sinPhi = Math.sin(phi);

            const x = radius * sinPhi * Math.cos(theta);
            const y = Math.abs(radius * Math.cos(phi)) + 15; // Above horizon
            const z = radius * sinPhi * Math.sin(theta);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            const variation = 0.8 + Math.random() * 0.4;
            colors[i * 3] = baseColor.r * variation;
            colors[i * 3 + 1] = baseColor.g * variation;
            colors[i * 3 + 2] = baseColor.b * variation;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: stars.size,
            vertexColors: true,
            transparent: true,
            opacity: 0.95
        });

        this.starsPoints = new THREE.Points(geometry, material);
        this.skyRootGroup.add(this.starsPoints);
    }

    private rebuildClouds() {
        const clouds = this.config.clouds;
        if (!clouds.enabled || clouds.density <= 0) {
            this.cloudsGroup = null;
            return;
        }

        this.cloudsGroup = new THREE.Group();
        this.cloudsGroup.name = 'clouds_group';

        const cloudPuffsCount = Math.floor(clouds.density * 18);
        const cloudMat = new THREE.MeshStandardMaterial({
            color: clouds.color,
            roughness: 0.9,
            metalness: 0.05,
            transparent: true,
            opacity: 0.88
        });

        for (let i = 0; i < cloudPuffsCount; i++) {
            const singleCloud = new THREE.Group();
            const px = (Math.random() - 0.5) * 160;
            const pz = (Math.random() - 0.5) * 160;
            const py = clouds.altitude + (Math.random() - 0.5) * 6;
            singleCloud.position.set(px, py, pz);

            // Cluster of 4-6 spheres per cloud
            const spheresInCloud = 4 + Math.floor(Math.random() * 3);
            for (let s = 0; s < spheresInCloud; s++) {
                const radius = 3 + Math.random() * 4;
                const sphereGeo = new THREE.SphereGeometry(radius, 8, 8);
                const sphereMesh = new THREE.Mesh(sphereGeo, cloudMat);
                sphereMesh.position.set(
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 8
                );
                singleCloud.add(sphereMesh);
            }

            this.cloudsGroup.add(singleCloud);
        }

        this.skyRootGroup.add(this.cloudsGroup);
    }

    private rebuildPrecipitation() {
        const precip = this.config.precipitation;
        if (precip.type === 'none' || precip.particleCount <= 0) {
            this.precipitationPoints = null;
            return;
        }

        const count = Math.min(precip.particleCount, 2500);
        const positions = new Float32Array(count * 3);
        this.precipitationVelocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 120;
            positions[i * 3 + 1] = Math.random() * 60;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 120;

            const baseSpeed = precip.type === 'rain' ? 35 : 12;
            this.precipitationVelocities.push((baseSpeed + Math.random() * 10) * precip.speed);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const isRain = precip.type === 'rain';
        const material = new THREE.PointsMaterial({
            color: isRain ? 0x93c5fd : 0xffffff,
            size: isRain ? 0.7 : 1.2,
            transparent: true,
            opacity: isRain ? 0.65 : 0.9
        });

        this.precipitationPoints = new THREE.Points(geometry, material);
        this.skyRootGroup.add(this.precipitationPoints);
    }

    public update(delta: number = 0.016) {
        // Animate clouds
        if (this.cloudsGroup && this.config.clouds.enabled) {
            const speed = this.config.clouds.speed * 2.5 * delta;
            this.cloudsGroup.children.forEach(cloud => {
                cloud.position.x += speed;
                if (cloud.position.x > 90) {
                    cloud.position.x = -90;
                }
            });
        }

        // Animate precipitation (Rain or Snow)
        if (this.precipitationPoints && this.config.precipitation.type !== 'none') {
            const attr = this.precipitationPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
            const positions = attr.array as Float32Array;
            const count = this.precipitationVelocities.length;
            const isSnow = this.config.precipitation.type === 'snow';

            for (let i = 0; i < count; i++) {
                const vel = this.precipitationVelocities[i];
                positions[i * 3 + 1] -= vel * delta;

                if (isSnow) {
                    positions[i * 3] += Math.sin(positions[i * 3 + 1] * 0.1) * 0.08;
                }

                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 60;
                    positions[i * 3] = (Math.random() - 0.5) * 120;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
                }
            }
            attr.needsUpdate = true;
        }

        // Stars Twinkle
        if (this.starsPoints && this.config.stars.twinkle) {
            this.starsPoints.rotation.y += 0.0003 * delta * 60;
        }

        // Day-Night Cycle Animation
        if (this.config.cycle.enabled) {
            this.cycleAngle += (0.05 * this.config.cycle.speed) * delta;
            if (this.cycleAngle > Math.PI * 2) this.cycleAngle -= Math.PI * 2;

            const radius = 70;
            const sunX = Math.cos(this.cycleAngle) * radius;
            const sunY = Math.sin(this.cycleAngle) * radius;
            const moonX = Math.cos(this.cycleAngle + Math.PI) * radius;
            const moonY = Math.sin(this.cycleAngle + Math.PI) * radius;

            if (this.sunMesh) {
                this.sunMesh.position.set(sunX, sunY, 20);
                this.sunMesh.visible = sunY > -10;
            }
            if (this.moonMesh) {
                this.moonMesh.position.set(moonX, moonY, -20);
                this.moonMesh.visible = moonY > -10;
            }
            if (this.moonGlowMesh) {
                this.moonGlowMesh.position.set(moonX, moonY, -20);
                this.moonGlowMesh.visible = moonY > -10;
            }

            // Interpolate sky colors based on sun elevation
            const elevation = sunY / radius; // -1 to 1
            if (elevation > 0.2) {
                // Full Day
                this.scene.background = new THREE.Color(0x87ceeb);
                this.dirLight.intensity = 1.0;
                this.dirLight.color.setHex(0xffffff);
            } else if (elevation > -0.1) {
                // Sunset / Sunrise transition
                this.scene.background = new THREE.Color(0xff7744);
                this.dirLight.intensity = 0.7;
                this.dirLight.color.setHex(0xffaa44);
            } else {
                // Night
                this.scene.background = new THREE.Color(0x05051a);
                this.dirLight.intensity = 0.3;
                this.dirLight.color.setHex(0x334466);
            }
        }

        // Automatic Weather Cycle
        if (this.config.weatherCycle?.enabled && this.config.weatherCycle.patterns.length > 0) {
            this.weatherTimer += delta;
            if (this.weatherTimer >= this.config.weatherCycle.intervalSeconds) {
                this.weatherTimer = 0;
                this.currentPatternIndex = (this.currentPatternIndex + 1) % this.config.weatherCycle.patterns.length;
                const nextWeather = this.config.weatherCycle.patterns[this.currentPatternIndex];
                this.setWeather(nextWeather);
            }
        }
    }

    /**
     * Trigger sky change based on player position / biome
     */
    public checkBiomePosition(playerPos: [number, number, number]) {
        if (!this.config.biomeTriggers || this.config.biomeTriggers.length === 0) return;

        for (const trigger of this.config.biomeTriggers) {
            const dx = playerPos[0] - trigger.center[0];
            const dy = playerPos[1] - trigger.center[1];
            const dz = playerPos[2] - trigger.center[2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist <= trigger.radius) {
                this.applyConfig(trigger.skyConfig);
                break;
            }
        }
    }

    /**
     * Trigger sky change during a specific game event
     */
    public triggerGameEvent(eventName: string) {
        if (!this.config.eventTriggers) return;
        const match = this.config.eventTriggers.find(e => e.event.toLowerCase() === eventName.toLowerCase());
        if (match) {
            this.applyConfig(match.targetSky);
        }
    }

    /**
     * Parse natural language sky commands into detailed Sky parameters
     */
    public static parseSkyIntent(text: string): { matches: boolean; parameters?: any } {
        const lower = text.toLowerCase().trim();

        // Do not intercept game creation prompts (e.g. "Tee horror õudusmäng")
        if (/mäng|game/i.test(lower) && !/taevas|taeva|taevast|ilmastik/i.test(lower)) {
            return { matches: false };
        }

        // Sky keywords with word boundaries
        const skyRegex = /\b(taevas|taeva|taevast|tähistaevas|öiseks|päevaseks|sky|atmosfäär|päike|päikese|päikesetõus|päikeseloojang|loojang|sun|kuu|moon|tähed|täht|stars|pilv|pilved|clouds|vihm|vihmane|rain|torm|tormine|storm|lumi|lumine|snow|udu|udune|fog|kosmos|kosmosest|space|planeet|planeedid|planeetidega|mars|tsükkel|cycle|horisont)\b/i;
        if (!skyRegex.test(lower)) {
            return { matches: false };
        }

        // Detect mode
        let skyMode: SkyMode = 'day';
        let weather: WeatherType = 'clear';
        let theme: CelestialTheme = 'earth';

        if (/päikesetõus|sunrise|koit/i.test(lower)) {
            skyMode = 'sunrise';
            theme = 'sunset';
        } else if (/loojang|sunset|eha/i.test(lower)) {
            skyMode = 'sunset';
            theme = 'sunset';
        } else if (/kosmos|space|orbiit/i.test(lower)) {
            skyMode = 'space';
            theme = 'space';
        } else if (/mars|punane planeet/i.test(lower)) {
            skyMode = 'custom';
            theme = 'mars';
        } else if (/tulnuk|alien/i.test(lower)) {
            skyMode = 'alien';
            theme = 'alien_planet';
        } else if (/torm|storm/i.test(lower)) {
            skyMode = 'custom';
            weather = 'storm';
        } else if (/vihm|rain/i.test(lower)) {
            skyMode = 'custom';
            weather = 'rain';
        } else if (/lumi|snow|talv/i.test(lower)) {
            skyMode = 'custom';
            weather = 'snow';
        } else if (/udu|fog/i.test(lower)) {
            skyMode = 'custom';
            weather = 'fog';
        } else if (/pilv|cloud/i.test(lower)) {
            skyMode = 'day';
            weather = 'cloudy';
        } else if (/öö|öis|öine|night|dark|pime|tähis|täht|kuu/i.test(lower)) {
            skyMode = 'night';
        } else if (/päev|day|valge|selge/i.test(lower)) {
            skyMode = 'day';
        }

        const params: any = {
            skyMode,
            weather,
            theme
        };

        // Stars check
        if (/palju tähti|rohkelt tähti|tihe tähistaevas|many stars|tähistaevas/i.test(lower)) {
            params.stars = { enabled: true, count: 2000, size: 1.4, twinkle: true };
            if (skyMode === 'day') params.skyMode = 'night';
        } else if (/tähed|tähti|stars/i.test(lower)) {
            if (/eemalda|ilma|ära|kustuta|remove/i.test(lower)) {
                params.stars = { enabled: false, count: 0 };
            } else {
                params.stars = { enabled: true, count: 1200, twinkle: true };
            }
        }

        // Moon check
        if (/suur kuu|giant moon|huge moon|suurt kuud/i.test(lower)) {
            params.moon = { enabled: true, size: 7.5, glow: true, position: [25, 55, -25] };
            if (skyMode === 'day') params.skyMode = 'night';
        } else if (/kuu|moon/i.test(lower)) {
            if (/eemalda|ilma|ära|kustuta|remove/i.test(lower)) {
                params.moon = { enabled: false };
            } else {
                params.moon = { enabled: true, size: 5, glow: true };
            }
        }

        // Sun check
        if (/päike|sun/i.test(lower)) {
            if (/kõrgel|keskpäev|high/i.test(lower)) {
                params.sunPosition = [0, 80, 0];
            } else if (/madalal|low/i.test(lower)) {
                params.sunPosition = [40, 15, 10];
            } else if (/asukoht/i.test(lower)) {
                params.sunPosition = [35, 65, 20];
            }
        }

        // Clouds check
        if (/pilv|cloud/i.test(lower)) {
            if (/eemalda|ilma|ära|kustuta|remove/i.test(lower)) {
                params.cloudDensity = 0;
            } else if (/palju|paksud|heavy/i.test(lower)) {
                params.cloudDensity = 0.9;
            } else {
                params.cloudDensity = 0.5;
            }
        }

        // Precipitation
        if (/vihm|rain/i.test(lower)) {
            params.precipitation = { type: 'rain', intensity: 0.8, particleCount: 1200, speed: 2 };
        } else if (/lumi|snow/i.test(lower)) {
            params.precipitation = { type: 'snow', intensity: 0.8, particleCount: 800, speed: 0.6 };
        }

        // Cycle & dynamic sky
        if (/tsükkel|cycle|päeva ja öö tsükkel|dünaamiline/i.test(lower)) {
            params.cycleEnabled = true;
        }

        // Weather cycle
        if (/ilmastiku automaatne|automaatne ilmastik/i.test(lower)) {
            params.weatherCycle = {
                enabled: true,
                intervalSeconds: 15,
                patterns: ['clear', 'cloudy', 'rain', 'fog']
            };
        }

        // Event trigger
        if (/sündmus|event|boss/i.test(lower)) {
            params.eventTriggers = [
                {
                    event: 'boss_spawn',
                    description: 'Bossi ilmumisel muutub taevas punaseks tormiks',
                    targetSky: SKY_PRESETS.storm
                },
                {
                    event: 'victory',
                    description: 'Võidu korral muutub taevas kuldseks päikesetõusuks',
                    targetSky: SKY_PRESETS.sunrise
                }
            ];
        }

        // Biome trigger
        if (/mängija asukoha järgi|bioom/i.test(lower)) {
            params.biomeTriggers = [
                {
                    biome: 'kõrb',
                    radius: 35,
                    center: [0, 0, 0],
                    skyConfig: SKY_PRESETS.day
                },
                {
                    biome: 'arktika',
                    radius: 35,
                    center: [60, 0, 60],
                    skyConfig: SKY_PRESETS.snow
                }
            ];
        }

        return { matches: true, parameters: params };
    }
}
