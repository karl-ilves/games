import { trainAudio } from '../audio';
import { getT } from '../i18n';

export interface InputHandlers {
    onThrottleUp: (step?: number) => void;
    onThrottleDown: (step?: number) => void;
    onBrake: (braking: boolean) => void;
    onHorn: () => void;
    onSwitchTrack: () => void;
    onToggleCamera: () => void;
    onToggleWeather: () => void;
    onOpenDepot: () => void;
    onCloseDepot: () => void;
    onStartDriving: () => void;
    onCategorySwitch: (category: 'train' | 'metro') => void;
}

export function setupInputControls(handlers: InputHandlers) {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
            handlers.onThrottleUp(15);
        } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
            handlers.onThrottleDown(15);
        } else if (e.code === 'Space') {
            handlers.onBrake(true);
            trainAudio.playBrakeSqueal();
        } else if (e.code === 'KeyH') {
            handlers.onHorn();
        } else if (e.code === 'KeyJ' || e.code === 'KeyT') {
            handlers.onSwitchTrack();
        } else if (e.code === 'KeyC') {
            handlers.onToggleCamera();
        } else if (e.code === 'KeyN') {
            handlers.onToggleWeather();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            handlers.onBrake(false);
        }
    });

    // Depot Modal Open / Close / Start Driving
    document.getElementById('btn-open-depot')?.addEventListener('click', () => {
        handlers.onOpenDepot();
    });
    document.getElementById('btn-close-depot')?.addEventListener('click', () => {
        handlers.onCloseDepot();
    });
    document.getElementById('btn-depot-start-driving')?.addEventListener('click', () => {
        handlers.onStartDriving();
    });

    // Continuous touch & button hold intervals
    let powerInterval: any = null;
    let brakeInterval: any = null;

    const btnPowerEl = document.getElementById('btn-throttle-up');
    const btnBrakeEl = document.getElementById('btn-throttle-down');
    const btnHornEl = document.getElementById('btn-horn');

    const mBtnPower = document.getElementById('m-btn-throttle-up');
    const mBtnBrake = document.getElementById('m-btn-throttle-down');
    const mBtnHorn = document.getElementById('m-btn-horn');
    const mBtnSwitch = document.getElementById('m-btn-switch');
    const mBtnCam = document.getElementById('m-btn-cam');
    const mBtnWeather = document.getElementById('m-btn-weather');

    function startPower() {
        handlers.onThrottleUp(15);
        mBtnPower?.classList.add('active');
        if (powerInterval) clearInterval(powerInterval);
        powerInterval = setInterval(() => {
            handlers.onThrottleUp(8);
        }, 70);
    }
    function stopPower() {
        mBtnPower?.classList.remove('active');
        if (powerInterval) {
            clearInterval(powerInterval);
            powerInterval = null;
        }
    }

    function startBrake() {
        handlers.onThrottleDown(15);
        mBtnBrake?.classList.add('active');
        if (brakeInterval) clearInterval(brakeInterval);
        brakeInterval = setInterval(() => {
            handlers.onThrottleDown(10);
        }, 70);
    }
    function stopBrake() {
        mBtnBrake?.classList.remove('active');
        if (brakeInterval) {
            clearInterval(brakeInterval);
            brakeInterval = null;
        }
    }

    // Standard Buttons
    btnPowerEl?.addEventListener('click', () => handlers.onThrottleUp(20));
    btnBrakeEl?.addEventListener('click', () => handlers.onThrottleDown(20));
    btnHornEl?.addEventListener('click', () => handlers.onHorn());
    document.getElementById('btn-switch-track')?.addEventListener('click', () => handlers.onSwitchTrack());
    document.getElementById('btn-camera-view')?.addEventListener('click', () => handlers.onToggleCamera());
    document.getElementById('btn-toggle-weather')?.addEventListener('click', () => handlers.onToggleWeather());

    // Mobile touch controls
    if (mBtnPower) {
        mBtnPower.addEventListener('touchstart', (e) => { e.preventDefault(); startPower(); }, { passive: false });
        mBtnPower.addEventListener('touchend', (e) => { e.preventDefault(); stopPower(); }, { passive: false });
        mBtnPower.addEventListener('touchcancel', (e) => { e.preventDefault(); stopPower(); }, { passive: false });
        mBtnPower.addEventListener('mousedown', startPower);
        mBtnPower.addEventListener('mouseup', stopPower);
        mBtnPower.addEventListener('mouseleave', stopPower);
    }

    if (mBtnBrake) {
        mBtnBrake.addEventListener('touchstart', (e) => { e.preventDefault(); startBrake(); }, { passive: false });
        mBtnBrake.addEventListener('touchend', (e) => { e.preventDefault(); stopBrake(); }, { passive: false });
        mBtnBrake.addEventListener('touchcancel', (e) => { e.preventDefault(); stopBrake(); }, { passive: false });
        mBtnBrake.addEventListener('mousedown', startBrake);
        mBtnBrake.addEventListener('mouseup', stopBrake);
        mBtnBrake.addEventListener('mouseleave', stopBrake);
    }

    if (mBtnHorn) {
        const triggerHorn = (e?: Event) => {
            if (e && e.cancelable) e.preventDefault();
            mBtnHorn.classList.add('active');
            handlers.onHorn();
            setTimeout(() => mBtnHorn.classList.remove('active'), 250);
        };
        mBtnHorn.addEventListener('touchstart', triggerHorn, { passive: false });
        mBtnHorn.addEventListener('click', triggerHorn);
    }

    if (mBtnSwitch) {
        const triggerSwitch = (e?: Event) => {
            if (e && e.cancelable) e.preventDefault();
            mBtnSwitch.classList.add('active');
            handlers.onSwitchTrack();
            setTimeout(() => mBtnSwitch.classList.remove('active'), 250);
        };
        mBtnSwitch.addEventListener('touchstart', triggerSwitch, { passive: false });
        mBtnSwitch.addEventListener('click', triggerSwitch);
    }

    if (mBtnCam) {
        const triggerCam = (e?: Event) => {
            if (e && e.cancelable) e.preventDefault();
            handlers.onToggleCamera();
        };
        mBtnCam.addEventListener('touchstart', triggerCam, { passive: false });
        mBtnCam.addEventListener('click', triggerCam);
    }

    if (mBtnWeather) {
        const triggerWeather = (e?: Event) => {
            if (e && e.cancelable) e.preventDefault();
            handlers.onToggleWeather();
        };
        mBtnWeather.addEventListener('touchstart', triggerWeather, { passive: false });
        mBtnWeather.addEventListener('click', triggerWeather);
    }

    // Automatic Phone / Tablet Touch Controls Activation
    const isMobileOrTablet = ('ontouchstart' in window) ||
                             (navigator.maxTouchPoints > 0) ||
                             window.matchMedia('(pointer: coarse)').matches ||
                             window.innerWidth <= 1024 ||
                             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(navigator.userAgent);

    const mobileControlsContainer = document.getElementById('mobile-train-controls');
    if (mobileControlsContainer && isMobileOrTablet) {
        mobileControlsContainer.style.display = 'flex';
    }

    // Audio Mute Toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            const t = getT();
            const muted = trainAudio.toggleMute();
            soundBtn.innerText = muted ? t.soundMuted : t.sound;
        });
    }

    // Help Modal
    const helpModal = document.getElementById('modal-help');
    document.getElementById('btn-open-help')?.addEventListener('click', () => {
        if (helpModal) helpModal.style.display = 'flex';
    });
    document.getElementById('btn-close-help')?.addEventListener('click', () => {
        if (helpModal) helpModal.style.display = 'none';
    });

    // Vehicle Category Switcher Tabs (Rongid vs Metrood)
    document.getElementById('tab-btn-trains')?.addEventListener('click', () => {
        handlers.onCategorySwitch('train');
    });
    document.getElementById('tab-btn-metros')?.addEventListener('click', () => {
        handlers.onCategorySwitch('metro');
    });
}
