import * as THREE from 'three';

export class UIManager {
    private throttleEl = document.getElementById('throttle-val');
    private speedEl = document.getElementById('speed-val');
    private altEl = document.getElementById('alt-val');
    private headingEl = document.getElementById('heading-val');
    private apStatusEl = document.getElementById('ap-status');
    
    public updateFlightStats(
        gameState: string,
        playerMode: boolean,
        autopilot: boolean,
        throttle: number,
        velocity: THREE.Vector3,
        altitude: number,
        heading: number,
        gearDown: boolean,
        hasRetractableGear: boolean
    ) {
        const isCrashedOrWalking = (gameState === 'crashed' || playerMode);
        
        const statsDiv = document.getElementById('stats');
        if (statsDiv) statsDiv.style.display = isCrashedOrWalking ? 'none' : 'grid';
        
        const gyroDiv = document.getElementById('gyro-container');
        if (gyroDiv) gyroDiv.style.display = isCrashedOrWalking ? 'none' : 'block';
        
        const apMenu = document.getElementById('autopilot-menu');
        if (apMenu) apMenu.style.display = (isCrashedOrWalking || !autopilot) ? 'none' : 'block';

        if (this.throttleEl) this.throttleEl.innerText = Math.round(throttle).toString();
        if (this.speedEl) this.speedEl.innerText = Math.round(velocity.length() * 10).toString();
        if (this.altEl) this.altEl.innerText = Math.max(0, Math.round(altitude)).toString();
        
        const vspeedEl = document.getElementById('vspeed-val');
        if (vspeedEl) vspeedEl.innerText = Math.round(velocity.y * 600).toString();
        
        if (this.headingEl) this.headingEl.innerText = Math.round(heading).toString();
        
        const gearEl = document.getElementById('gear-val');
        if (gearEl && hasRetractableGear) {
            gearEl.innerText = gearDown ? 'DOWN' : 'UP';
            gearEl.style.color = gearDown ? '#27ae60' : '#e74c3c';
        }
        
        if (this.apStatusEl) {
            this.apStatusEl.innerText = `Autopilot: ${autopilot ? 'ON' : 'OFF'}`;
            this.apStatusEl.style.color = autopilot ? '#2ecc71' : '#e74c3c';
        }
    }

    public updateGyroscope(euler: THREE.Euler) {
        const gyroHorizon = document.getElementById('gyro-horizon');
        if (gyroHorizon) {
            if (!gyroHorizon.hasChildNodes()) {
                for (let i = -90; i <= 90; i += 10) {
                    if (i === 0) continue;
                    let line = document.createElement('div');
                    let yOffset = (i * Math.PI / 180) * 50; 
                    line.style.position = 'absolute';
                    line.style.left = '50%';
                    line.style.top = `calc(50% - ${yOffset}px)`;
                    line.style.transform = 'translate(-50%, -50%)';
                    line.style.width = i % 30 === 0 ? '40px' : '20px';
                    line.style.height = '1px';
                    line.style.backgroundColor = 'white';
                    gyroHorizon.appendChild(line);
                    
                    if (i % 30 === 0) {
                        let text = document.createElement('div');
                        text.innerText = Math.abs(i).toString();
                        text.style.position = 'absolute';
                        text.style.left = 'calc(50% + 25px)';
                        text.style.top = `calc(50% - ${yOffset}px)`;
                        text.style.transform = 'translateY(-50%)';
                        text.style.fontSize = '8px';
                        text.style.color = 'white';
                        gyroHorizon.appendChild(text);
                    }
                }
            }
            gyroHorizon.style.transform = `translateY(${euler.x * 50}px) rotate(${euler.z}rad)`;
        }
    }

    public updateStatusDisplay(activeEmergencies: any, emergencyState: any) {
        document.querySelectorAll('.status-part').forEach(el => {
            el.classList.remove('status-red');
        });
        
        const fireIcon = document.getElementById('status-fire-icon');
        if (fireIcon) {
            if (activeEmergencies.fire && emergencyState.firePart) {
                const el = document.getElementById('status-' + emergencyState.firePart);
                if (el) el.classList.add('status-red');
                fireIcon.style.display = 'block';
                
                let x=50, y=50;
                switch(emergencyState.firePart) {
                    case 'left-wing': x=25; y=65; break;
                    case 'right-wing': x=75; y=65; break;
                    case 'left-engine': x=29; y=67; break;
                    case 'right-engine': x=71; y=67; break;
                    case 'fuselage': x=50; y=55; break;
                    case 'tail': x=50; y=100; break;
                }
                fireIcon.setAttribute('x', x.toString());
                fireIcon.setAttribute('y', y.toString());
            } else {
                fireIcon.style.display = 'none';
            }
        }
        
        if (activeEmergencies.engine_explosion) {
            const el = document.getElementById('status-left-engine');
            if (el) el.classList.add('status-red');
        }
        
        if (activeEmergencies.fuel_empty) {
            const el1 = document.getElementById('status-left-wing');
            const el2 = document.getElementById('status-right-wing');
            if (el1) el1.classList.add('status-red');
            if (el2) el2.classList.add('status-red');
        }
        
        if (activeEmergencies.wing_damage && emergencyState.wingDamagePart) {
            const el = document.getElementById('status-' + emergencyState.wingDamagePart);
            if (el) el.classList.add('status-red');
        }
    }

    public showWinScreen() {
        const os = document.getElementById('objective-status');
        if (os) os.style.display = 'none';
        const winScreen = document.getElementById('win-screen');
        if (winScreen) winScreen.style.display = 'flex';
        const wm = document.getElementById('weather-menu');
        if (wm) wm.style.display = 'none';
    }
}

export const uiManager = new UIManager();
