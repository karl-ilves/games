import * as THREE from 'three';

export class WeatherSystem {
    public currentWeather = 'sun';
    public antiIceSystem = false;
    public iceAmount = 0;
    public weatherState = {
        windTimer: 0,
        windNextAction: 300,
        windDirection: 1,
        snowTimer: 0,
        snowTimerActive: false,
        iceGracePeriod: 900,
        rainSystem: null as any,
        snowSystem: null as any,
        cloudsGroup: null as any,
        thunderNextFlash: 0
    };

    private rainParticleGeo = new THREE.BufferGeometry();
    private snowParticleGeo = new THREE.BufferGeometry();

    constructor(
        private ctx: any
        
        
        
    ) {}

    public createParticles(type: string, count: number, size: number, color: number, geo: THREE.BufferGeometry) {
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 4000;
            positions[i * 3 + 1] = Math.random() * 2000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 4000;
            
            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = -0.5 - Math.random() * 0.5;
            velocities[i * 3 + 2] = 0;
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        let mat = new THREE.PointsMaterial({
            color: color,
            size: size,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });
        
        let system = new THREE.Points(geo, mat);
        system.visible = false;
        this.ctx.scene.add(system);
        return system;
    }

    public updateParticles(system: any, type: string, speedMult: number) {
        let positions = system.geometry.attributes.position.array;
        let velocities = system.geometry.attributes.velocity.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * speedMult;
            positions[i+1] += velocities[i+1] * speedMult;
            positions[i+2] += velocities[i+2] * speedMult;
            
            if (positions[i+1] < 0) {
                positions[i] = this.ctx.camera.position.x + (Math.random() - 0.5) * 4000;
                positions[i+1] = this.ctx.camera.position.y + 1000 + Math.random() * 1000;
                positions[i+2] = this.ctx.camera.position.z + (Math.random() - 0.5) * 4000;
            }
        }
        system.geometry.attributes.position.needsUpdate = true;
    }

    public createClouds() {
        this.weatherState.cloudsGroup = new THREE.Group();
        let cloudGeo = new THREE.BoxGeometry(200, 40, 200);
        let cloudMat = new THREE.MeshLambertMaterial({color: 0xecf0f1, transparent: true, opacity: 0.8});
        
        for (let i = 0; i < 50; i++) {
            let mesh = new THREE.Mesh(cloudGeo, cloudMat);
            mesh.position.set(
                (Math.random() - 0.5) * 10000,
                1500 + Math.random() * 500,
                (Math.random() - 0.5) * 10000
            );
            mesh.rotation.y = Math.random() * Math.PI;
            let s = 1 + Math.random() * 2;
            mesh.scale.set(s, 1, s);
            this.weatherState.cloudsGroup.add(mesh);
        }
        this.weatherState.cloudsGroup.visible = false;
        this.ctx.scene.add(this.weatherState.cloudsGroup);
    }

    public setWeather(type: string) {
        this.currentWeather = type;
        
        if (this.weatherState.rainSystem) this.weatherState.rainSystem.visible = (type === 'rain' || type === 'thunder');
        if (this.weatherState.snowSystem) this.weatherState.snowSystem.visible = (type === 'snow');
        if (this.weatherState.cloudsGroup) this.weatherState.cloudsGroup.visible = (type !== 'sun');
        
        if (type === 'sun') {
            this.ctx.scene.fog = new THREE.FogExp2(0x87CEEB, 0.00005);
            this.ctx.scene.background = new THREE.Color(0x87CEEB);
            if (document.getElementById('weather-status')) document.getElementById('weather-status')!.innerText = 'Weather: Sunny & Clear';
        } else if (type === 'clouds') {
            this.ctx.scene.fog = new THREE.FogExp2(0xbdc3c7, 0.0001);
            this.ctx.scene.background = new THREE.Color(0xbdc3c7);
            if (document.getElementById('weather-status')) document.getElementById('weather-status')!.innerText = 'Weather: Cloudy (Light turbulence)';
        } else if (type === 'rain') {
            this.ctx.scene.fog = new THREE.FogExp2(0x7f8c8d, 0.0002);
            this.ctx.scene.background = new THREE.Color(0x7f8c8d);
            if (document.getElementById('weather-status')) document.getElementById('weather-status')!.innerText = 'Weather: Rain (Reduced visibility)';
        } else if (type === 'thunder') {
            this.ctx.scene.fog = new THREE.FogExp2(0x222233, 0.0003);
            this.ctx.scene.background = new THREE.Color(0x222233);
            if (document.getElementById('weather-status')) document.getElementById('weather-status')!.innerText = 'Weather: Thunderstorm (Heavy turbulence!)';
        } else if (type === 'snow') {
            this.ctx.scene.fog = new THREE.FogExp2(0xdfe6e9, 0.00025);
            this.ctx.scene.background = new THREE.Color(0xdfe6e9);
            if (document.getElementById('weather-status')) document.getElementById('weather-status')!.innerText = 'Weather: Snow (ICE WARNING - Use Anti-Ice!)';
        }
    }

    public updateWeather() {
        if (this.ctx.gameState !== 'playing') return;
        
        const ws = document.getElementById('weather-select') as HTMLSelectElement;
        const bw = document.getElementById('btn-set-weather') as HTMLButtonElement;
        const wm = document.getElementById('weather-menu');
        if (ws && bw) {
            let locked = (this.weatherState.windTimer > 0) || this.weatherState.snowTimerActive;
            ws.disabled = locked;
            bw.disabled = locked;
            if (wm) wm.style.display = locked ? 'none' : 'block';
        }
        
        if (this.weatherState.rainSystem && this.weatherState.rainSystem.visible) {
            this.updateParticles(this.weatherState.rainSystem, 'rain', 10 + Math.random() * 5);
        }
        if (this.weatherState.snowSystem && this.weatherState.snowSystem.visible) {
            this.updateParticles(this.weatherState.snowSystem, 'snow', 2 + Math.random() * 2);
        }
        
        if (this.currentWeather === 'thunder') {
            this.weatherState.thunderNextFlash--;
            if (this.weatherState.thunderNextFlash <= 0) {
                this.ctx.scene.background = new THREE.Color(0xffffff);
                setTimeout(() => {
                    if (this.currentWeather === 'thunder') this.ctx.scene.background = new THREE.Color(0x222233);
                }, 100);
                this.weatherState.thunderNextFlash = 120 + Math.random() * 400;
            }
            if (this.ctx.planeGroup) this.ctx.planeGroup.rotateZ((Math.random() - 0.5) * 0.02);
            if (this.ctx.planeGroup) this.ctx.planeGroup.rotateX((Math.random() - 0.5) * 0.01);
        }
        else if (this.currentWeather === 'clouds' || this.currentWeather === 'rain') {
            if (this.ctx.planeGroup) this.ctx.planeGroup.rotateZ((Math.random() - 0.5) * 0.005);
        }
        
        if (this.weatherState.windTimer > 0) {
            this.weatherState.windTimer--;
            let secs = Math.ceil(this.weatherState.windTimer / 30);
            let m = Math.floor(secs / 60);
            let s = secs % 60;
            if (document.getElementById('weather-alert-time')) document.getElementById('weather-alert-time')!.innerText = `Time remaining: ${m}:${s < 10 ? '0'+s : s}`;
            
            this.weatherState.windNextAction--;
            if (this.weatherState.windNextAction <= 0) {
                let offset = 500 * this.weatherState.windDirection;
                if (this.ctx.planeGroup && this.ctx.planeGroup.position.y - offset > 100) {
                    if (this.ctx.planeGroup) this.ctx.planeGroup.position.y -= offset;
                }
                this.weatherState.windDirection *= -1;
                this.weatherState.windNextAction = 300;
            }
            
            if (this.weatherState.windTimer <= 0) {
                this.setWeather('sun');
            }
        }
        
        if (this.weatherState.snowTimerActive && this.weatherState.snowTimer > 0) {
            this.weatherState.snowTimer--;
            let secs = Math.ceil(this.weatherState.snowTimer / 30);
            let m = Math.floor(secs / 60);
            let s = secs % 60;
            if (document.getElementById('weather-alert-time')) document.getElementById('weather-alert-time')!.innerText = `Time remaining: ${m}:${s < 10 ? '0'+s : s}`;
            
            if (this.weatherState.snowTimer <= 0) {
                this.setWeather('sun');
            }
        }
        
        if (this.currentWeather === 'snow' && !this.antiIceSystem) {
            if (this.weatherState.iceGracePeriod > 0) {
                this.weatherState.iceGracePeriod--;
            } else {
                this.iceAmount += 0.0005;
                if (this.iceAmount > 1) this.iceAmount = 1;
            }
        } else if (this.antiIceSystem) {
            this.iceAmount -= 0.002;
            if (this.iceAmount < 0) this.iceAmount = 0;
        }
        
        if (this.iceAmount > 0) {
            let icePitchForce = this.iceAmount * 0.005;
            if (this.ctx.planeGroup) this.ctx.planeGroup.rotateX(icePitchForce);
            
            if (this.ctx.planeGroup) this.ctx.planeGroup.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    if (child.material && child.material.color) {
                        if (!child.userData.origColor) {
                            child.userData.origColor = child.material.color.clone();
                        }
                        child.material.color.copy(child.userData.origColor).lerp(new THREE.Color(0xaae8ff), this.iceAmount);
                    }
                }
            });
            if (document.getElementById('ice-warning')) document.getElementById('ice-warning')!.style.display = 'block';
        } else {
            if (this.ctx.planeGroup) this.ctx.planeGroup.traverse(child => {
                if (child instanceof THREE.Mesh && child.userData.origColor) {
                    child.material.color.copy(child.userData.origColor);
                }
            });
            if (document.getElementById('ice-warning')) document.getElementById('ice-warning')!.style.display = 'none';
        }
    }

    public toggleAntiIce() {
        this.antiIceSystem = !this.antiIceSystem;
        const btnAntiIce = document.getElementById('btn-anti-ice')!;
        if (this.antiIceSystem) {
            btnAntiIce.innerText = 'Anti-Ice: ON';
            btnAntiIce.style.background = '#27ae60';
            btnAntiIce.style.borderColor = '#2ecc71';
        } else {
            btnAntiIce.innerText = 'Anti-Ice: OFF';
            btnAntiIce.style.background = '#e74c3c';
            btnAntiIce.style.borderColor = '#c0392b';
        }
    }

    public init() {
        this.weatherState.rainSystem = this.createParticles('rain', 20000, 2.0, 0xbdc3c7, this.rainParticleGeo);
        this.weatherState.snowSystem = this.createParticles('snow', 15000, 3.5, 0xffffff, this.snowParticleGeo);
        this.createClouds();
        
        document.getElementById('btn-anti-ice')?.addEventListener('click', () => this.toggleAntiIce());
        
        // Setup J key
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'j') {
                this.toggleAntiIce();
            }
        });

        document.getElementById('btn-set-weather')?.addEventListener('click', () => {
            const ws = document.getElementById('weather-select') as HTMLSelectElement;
            this.setWeather(ws.value);
        });
    }
}
