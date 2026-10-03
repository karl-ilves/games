import { AIRCRAFT_CATALOG } from '../catalog';
import { flightState } from '../state/flightState';
import { AircraftConfig, EmergencyMode, WeatherMode } from '../types';

export class FlightModalsController {
    private onSelectAircraft: (config: AircraftConfig) => void;
    private onSelectWeather: (weather: WeatherMode) => void;
    private onSelectEmergency: (emergency: EmergencyMode) => void;

    constructor(
        onSelectAircraft: (config: AircraftConfig) => void,
        onSelectWeather: (weather: WeatherMode) => void,
        onSelectEmergency: (emergency: EmergencyMode) => void
    ) {
        this.onSelectAircraft = onSelectAircraft;
        this.onSelectWeather = onSelectWeather;
        this.onSelectEmergency = onSelectEmergency;

        this.initHangar();
        this.initWeather();
        this.initEmergency();
        this.initHelp();
        this.initLanding();
    }

    private initHangar(): void {
        const btnOpen = document.getElementById('btn-open-hangar');
        const modal = document.getElementById('modal-hangar');
        const btnClose = document.getElementById('btn-close-hangar');
        const list = document.getElementById('aircraft-selection-list');

        if (btnOpen && modal) {
            btnOpen.addEventListener('click', () => {
                this.renderHangarList();
                modal.style.display = 'flex';
            });
        }

        if (btnClose && modal) {
            btnClose.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    }

    public renderHangarList(): void {
        const list = document.getElementById('aircraft-selection-list');
        if (!list) return;

        list.innerHTML = '';
        const currentId = flightState.getSelectedAircraftId();
        const currentCash = flightState.getCash();

        AIRCRAFT_CATALOG.forEach(craft => {
            const isUnlocked = flightState.isAircraftUnlocked(craft.id);
            const isSelected = craft.id === currentId;

            const card = document.createElement('div');
            card.className = `aircraft-card ${isSelected ? 'active' : ''}`;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.3rem;">${craft.icon} <strong style="color: #fff;">${craft.name}</strong></span>
                    <span class="status-tag tag-green" style="font-size: 0.7rem;">${craft.category}</span>
                </div>
                <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.3;">${craft.description}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.75rem; margin-top: 6px; color: #cbd5e1;">
                    <div>Max Speed: <strong style="color: #00f2fe;">${craft.maxSpeedKnots} kts</strong></div>
                    <div>Climb: <strong style="color: #2ecc71;">${craft.climbRateFtMin} ft/m</strong></div>
                    <div>Stall: <strong style="color: #f1c40f;">${craft.stallSpeedKnots} kts</strong></div>
                    <div>Weight: <strong>${(craft.weightKg / 1000).toFixed(1)} t</strong></div>
                </div>
                <div style="margin-top: 8px;">
                    ${isSelected ? `
                        <button class="hud-btn" style="width: 100%; justify-content: center; background: rgba(0, 242, 254, 0.25); border-color: #00f2fe; color: #00f2fe;" disabled>
                            ✓ CURRENT AIRCRAFT
                        </button>
                    ` : isUnlocked ? `
                        <button class="hud-btn btn-select-craft" data-id="${craft.id}" style="width: 100%; justify-content: center; background: rgba(46, 204, 113, 0.2); border-color: #2ecc71;">
                            FLY THIS AIRCRAFT
                        </button>
                    ` : `
                        <button class="hud-btn btn-buy-craft" data-id="${craft.id}" data-price="${craft.price}" style="width: 100%; justify-content: center; background: rgba(255, 215, 0, 0.2); border-color: #ffd700; color: #ffd700;">
                            UNLOCK FOR 🪙 ${craft.price} €
                        </button>
                    `}
                </div>
            `;

            const selectBtn = card.querySelector('.btn-select-craft');
            if (selectBtn) {
                selectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    flightState.setSelectedAircraftId(craft.id);
                    this.onSelectAircraft(craft);
                    const modal = document.getElementById('modal-hangar');
                    if (modal) modal.style.display = 'none';
                });
            }

            const buyBtn = card.querySelector('.btn-buy-craft');
            if (buyBtn) {
                buyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (flightState.unlockAircraft(craft.id, craft.price)) {
                        flightState.setSelectedAircraftId(craft.id);
                        this.onSelectAircraft(craft);
                        const modal = document.getElementById('modal-hangar');
                        if (modal) modal.style.display = 'none';
                    } else {
                        alert(`You need ${craft.price} € to unlock the ${craft.name}! Complete more flights or collect stunt rings.`);
                    }
                });
            }

            list.appendChild(card);
        });
    }

    private initWeather(): void {
        const btnOpen = document.getElementById('btn-open-weather');
        const modal = document.getElementById('modal-weather');
        const btnClose = document.getElementById('btn-close-weather');

        if (btnOpen && modal) {
            btnOpen.addEventListener('click', () => modal.style.display = 'flex');
        }
        if (btnClose && modal) {
            btnClose.addEventListener('click', () => modal.style.display = 'none');
        }

        const optionBtns = document.querySelectorAll('.weather-option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                optionBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const weather = btn.getAttribute('data-weather') as WeatherMode;
                if (weather) {
                    this.onSelectWeather(weather);
                    if (modal) modal.style.display = 'none';
                }
            });
        });
    }

    private initEmergency(): void {
        const btnOpen = document.getElementById('btn-open-emergency');
        const modal = document.getElementById('modal-emergency');
        const btnClose = document.getElementById('btn-close-emergency');

        if (btnOpen && modal) {
            btnOpen.addEventListener('click', () => modal.style.display = 'flex');
        }
        if (btnClose && modal) {
            btnClose.addEventListener('click', () => modal.style.display = 'none');
        }

        const emergencyBtns = document.querySelectorAll('.emergency-btn');
        emergencyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const em = btn.getAttribute('data-emergency') as EmergencyMode;
                if (em) {
                    this.onSelectEmergency(em);
                    if (modal) modal.style.display = 'none';
                }
            });
        });

        const randomBtn = document.getElementById('btn-random-emergency');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                const list: EmergencyMode[] = ['engine_fire', 'gear_fail', 'fuel_empty', 'turbulence', 'wing_damage'];
                const picked = list[Math.floor(Math.random() * list.length)];
                this.onSelectEmergency(picked);
                if (modal) modal.style.display = 'none';
            });
        }
    }

    private initHelp(): void {
        const btnOpen = document.getElementById('btn-open-help');
        const modal = document.getElementById('modal-help');
        const btnClose = document.getElementById('btn-close-help');

        if (btnOpen && modal) {
            btnOpen.addEventListener('click', () => modal.style.display = 'flex');
        }
        if (btnClose && modal) {
            btnClose.addEventListener('click', () => modal.style.display = 'none');
        }
    }

    private initLanding(): void {
        const modal = document.getElementById('modal-landing');
        const continueBtn = document.getElementById('btn-landing-continue');
        if (continueBtn && modal) {
            continueBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    }

    public showLandingScorecard(sinkRateFpm: number, airspeedKnots: number, isButter: boolean, rewardCash: number, rewardXP: number): void {
        const modal = document.getElementById('modal-landing');
        const title = document.getElementById('landing-title');
        const subtitle = document.getElementById('landing-subtitle');
        const sinkEl = document.getElementById('landing-sink-rate');
        const speedEl = document.getElementById('landing-speed');
        const rewardEl = document.getElementById('landing-reward');

        if (!modal) return;

        if (title) {
            title.textContent = isButter ? '🌟 BUTTER LANDING!' : (Math.abs(sinkRateFpm) < 450 ? '👍 GOOD TOUCHDOWN!' : '⚠️ FIRM LANDING');
            title.style.color = isButter ? '#ffd700' : (Math.abs(sinkRateFpm) < 450 ? '#2ecc71' : '#f1c40f');
        }

        if (subtitle) {
            subtitle.textContent = isButter 
                ? 'Silky smooth touchdown on runway centerline!' 
                : 'Aircraft safely grounded on the runway.';
        }

        if (sinkEl) sinkEl.textContent = `${Math.round(sinkRateFpm)} ft/min`;
        if (speedEl) speedEl.textContent = `${Math.round(airspeedKnots)} knots`;
        if (rewardEl) rewardEl.textContent = `+${rewardCash} € Flight Cash & +${rewardXP} XP`;

        modal.style.display = 'flex';
    }
}
