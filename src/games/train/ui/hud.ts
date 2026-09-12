import { yardService, YardData } from '../../../shared/yardService';
import { trainAudio } from '../audio';
import { checkIsOwner, getStationName, getT, updateLocalization } from '../i18n';
import { getTrainMoney } from '../state/trainState';
import { getActiveStations, JUNCTION } from '../tracks/trackData';
import { CameraMode, Station, TrainDef, WeatherMode } from '../types';

let skippedBannerTimeout: any = null;

export function setupHUD(
    activeTrain: TrainDef,
    cameraMode: CameraMode,
    weatherMode: WeatherMode,
    currentStationIndex: number
) {
    applyTrainLocalization(activeTrain, cameraMode, weatherMode, currentStationIndex);

    const hudYardIcon = document.getElementById('hud-yard-icon');
    if (hudYardIcon) hudYardIcon.innerHTML = yardService.renderYardSvg(20);

    const initialYard = yardService.getYards();
    updateYardBalance({ yards: initialYard } as any);
}

export function applyTrainLocalization(
    activeTrain: TrainDef,
    cameraMode: CameraMode,
    weatherMode: WeatherMode,
    currentStationIndex: number
) {
    updateLocalization();
    const t = getT();
    const isOwner = checkIsOwner();

    const logoTitle = document.getElementById('logo-title-text');
    if (logoTitle) logoTitle.innerText = t.gameTitle;

    const ownerPill = document.getElementById('owner-badge-pill');
    if (ownerPill) ownerPill.innerText = t.ownerPill;

    const btnOpenDepotText = document.getElementById('btn-open-depot-text');
    if (btnOpenDepotText) btnOpenDepotText.innerText = t.depotBtn;

    const tabTrainsText = document.getElementById('tab-trains-text');
    if (tabTrainsText) tabTrainsText.innerText = t.tabTrains;

    const tabMetrosText = document.getElementById('tab-metros-text');
    if (tabMetrosText) tabMetrosText.innerText = t.tabMetros;

    const targetStationLabel = document.getElementById('target-station-label');
    if (targetStationLabel) targetStationLabel.innerText = t.targetStation;

    const stations = getActiveStations(activeTrain);
    const initialTargetStation = stations[currentStationIndex % stations.length];
    const targetStationName = document.getElementById('target-station-name');
    if (targetStationName && initialTargetStation) targetStationName.innerText = getStationName(initialTargetStation);

    const passengersLabel = document.getElementById('passengers-label');
    if (passengersLabel) passengersLabel.innerText = t.passengers;

    const moneyBox = document.getElementById('train-money-box');
    if (moneyBox) moneyBox.title = t.moneyTooltip;

    const camBtn = document.getElementById('btn-camera-view');
    if (camBtn) camBtn.innerText = t.camModes[cameraMode];

    const weatherBtn = document.getElementById('btn-toggle-weather');
    if (weatherBtn) weatherBtn.innerText = t.weatherModes[weatherMode];

    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) soundBtn.innerText = t.sound;

    const helpBtn = document.getElementById('btn-open-help');
    if (helpBtn) helpBtn.innerText = t.help;

    const junctionNotice = document.getElementById('junction-notice-text');
    if (junctionNotice) junctionNotice.innerText = t.approachingJunction;

    const btnSwitchTrack = document.getElementById('btn-switch-track');
    if (btnSwitchTrack) btnSwitchTrack.innerText = t.switchTrackBtn;

    const junctionDir = document.getElementById('junction-dir-text');
    if (junctionDir) junctionDir.innerText = JUNCTION.activeBranch === 'main' ? t.branchMain : t.branchMountain;

    const boardingTitle = document.getElementById('boarding-station-title');
    if (boardingTitle) boardingTitle.innerText = t.stationStopTitle;

    const boardingSub = document.getElementById('boarding-subtext');
    if (boardingSub) boardingSub.innerText = t.stationStopSubtext;

    const skippedTitle = document.getElementById('skipped-title');
    if (skippedTitle) skippedTitle.innerText = t.skippedTitle;

    const throttleLabel = document.getElementById('throttle-label-text');
    if (throttleLabel) throttleLabel.innerText = t.throttleLabel;

    const btnPower = document.getElementById('btn-power-text');
    if (btnPower) btnPower.innerText = t.btnPower;

    const btnBrake = document.getElementById('btn-brake-text');
    if (btnBrake) btnBrake.innerText = t.btnBrake;

    const btnHorn = document.getElementById('btn-horn-text');
    if (btnHorn) btnHorn.innerText = t.btnHorn;

    const mPowerLabel = document.getElementById('m-power-label');
    if (mPowerLabel) mPowerLabel.innerText = t.mPower;

    const mBrakeLabel = document.getElementById('m-brake-label');
    if (mBrakeLabel) mBrakeLabel.innerText = t.mBrake;

    const mHornLabel = document.getElementById('m-horn-label');
    if (mHornLabel) mHornLabel.innerText = t.mHorn;

    const mSwitchLabel = document.getElementById('m-switch-label');
    if (mSwitchLabel) mSwitchLabel.innerText = t.mSwitch;

    const mCamLabel = document.getElementById('m-cam-label');
    if (mCamLabel) mCamLabel.innerText = t.mCam;

    const mWeatherLabel = document.getElementById('m-weather-label');
    if (mWeatherLabel) mWeatherLabel.innerText = weatherMode === 0 ? (isOwner ? 'PÄEV' : 'DAY') : (weatherMode === 1 ? (isOwner ? 'LOOJANG' : 'SUNSET') : (isOwner ? 'ÖÖ' : 'NIGHT'));

    const depotTitle = document.getElementById('depot-title-text');
    if (depotTitle) depotTitle.innerText = t.depotTitle;

    const depotDesc = document.getElementById('depot-desc-text');
    if (depotDesc) depotDesc.innerText = t.depotDesc;

    const depotMoneyLabel = document.getElementById('depot-money-label-text');
    if (depotMoneyLabel) depotMoneyLabel.innerText = t.depotMoneyLabel;

    const depotYardLabel = document.getElementById('depot-yard-label-text');
    if (depotYardLabel) depotYardLabel.innerText = t.depotYardLabel;

    const btnDepotStart = document.getElementById('btn-depot-start-driving');
    if (btnDepotStart) btnDepotStart.innerText = t.depotStartDriving;

    const helpTitle = document.getElementById('help-title');
    if (helpTitle) helpTitle.innerText = t.helpTitle;

    const helpContent = document.getElementById('help-content-box');
    if (helpContent) helpContent.innerHTML = t.helpContent;
}

export function updateYardBalance(data: YardData) {
    const yardVal = document.getElementById('train-yard-val');
    const depotYardVal = document.getElementById('depot-yard-val');
    if (yardVal) {
        yardVal.innerText = data.yards.toLocaleString();
    }
    if (depotYardVal) {
        depotYardVal.innerText = data.yards.toLocaleString();
    }
}

export function updateCameraBtnText(cameraMode: CameraMode) {
    const t = getT();
    const camBtn = document.getElementById('btn-camera-view');
    if (camBtn) camBtn.innerText = t.camModes[cameraMode];
    const mCamLabel = document.getElementById('m-cam-label');
    if (mCamLabel) mCamLabel.innerText = t.mCam;
}

export function updateHUD(trainSpeed: number, currentThrottle: number, totalPassengers: number) {
    const speedEl = document.getElementById('speed-text');
    if (speedEl) speedEl.innerText = Math.round(trainSpeed).toString();

    const throttleEl = document.getElementById('throttle-text');
    const throttleFill = document.getElementById('throttle-fill');
    if (throttleEl) throttleEl.innerText = `${Math.round(currentThrottle)}%`;
    if (throttleFill) throttleFill.style.width = `${Math.round(currentThrottle)}%`;

    const passEl = document.getElementById('stat-passengers');
    if (passEl) passEl.innerText = totalPassengers.toString();

    const moneyEl = document.getElementById('train-money-val');
    if (moneyEl) moneyEl.innerText = getTrainMoney().toLocaleString();

    const depotMoneyEl = document.getElementById('depot-money-val');
    if (depotMoneyEl) depotMoneyEl.innerText = getTrainMoney().toLocaleString();
}

export function showStationSkippedNotification(station: Station) {
    const t = getT();
    const banner = document.getElementById('station-skipped-banner');
    const title = document.getElementById('skipped-title');
    const desc = document.getElementById('skipped-desc');
    if (!banner) return;

    if (title) title.innerText = t.skippedTitle;
    if (desc) desc.innerText = t.skippedDesc(getStationName(station));
    banner.style.display = 'block';

    trainAudio.playBrakeSqueal();

    if (skippedBannerTimeout) clearTimeout(skippedBannerTimeout);
    skippedBannerTimeout = setTimeout(() => {
        if (banner) banner.style.display = 'none';
    }, 4500);
}

export function showStationRewardModal(station: Station, money: number) {
    const t = getT();
    const modal = document.getElementById('modal-station-success');
    const title = document.getElementById('reward-modal-title');
    const desc = document.getElementById('reward-modal-desc');
    const moneyTxt = document.getElementById('reward-money-text');
    const moneyLabel = document.getElementById('reward-money-label');
    const btn = document.getElementById('btn-next-station-continue');

    if (title) title.innerText = t.rewardTitle(getStationName(station));
    if (desc) desc.innerText = t.rewardDesc(station.passengersWaiting);
    if (moneyTxt) moneyTxt.innerText = `+${money} € 🪙`;
    if (moneyLabel) moneyLabel.innerText = t.rewardMoneyLabel;
    if (btn) btn.innerText = t.rewardBtn;
    if (modal) modal.style.display = 'flex';
}
