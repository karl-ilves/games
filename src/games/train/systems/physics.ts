import * as THREE from 'three';
import { trainAudio } from '../audio';
import { emitSmokePuff } from '../effects/particles';
import { getStationName, getT } from '../i18n';
import { addTrainMoney } from '../state/trainState';
import { getActiveStations, JUNCTION } from '../tracks/trackData';
import { Station, TrainDef } from '../types';
import { showStationRewardModal, showStationSkippedNotification } from '../ui/hud';

export interface PhysicsState {
    trainU: number;
    currentThrottle: number;
    targetThrottle: number;
    trainSpeed: number;
    isBraking: boolean;
    currentStationIndex: number;
    isBoarding: boolean;
    boardingTimer: number;
    totalPassengers: number;
    smokeTimer: number;
}

export interface TrainRig {
    locomotiveGroup: THREE.Group;
    tenderGroup: THREE.Group;
    carriage1Group: THREE.Group;
    carriage2Group: THREE.Group;
    cargoGroup: THREE.Group;
    wheels: THREE.Mesh[];
    connectingRods: THREE.Mesh[];
}

export function updateTrainPhysics(
    state: PhysicsState,
    activeTrain: TrainDef,
    rig: TrainRig,
    mainTrackCurve: THREE.CatmullRomCurve3,
    scene: THREE.Scene,
    delta: number
) {
    const accelRate = (activeTrain.acceleration || 1.0) * 2.0;
    const maxSpd = activeTrain.maxSpeed || 120;

    if (state.isBraking) {
        state.currentThrottle = THREE.MathUtils.lerp(state.currentThrottle, 0, delta * 3.5);
        state.trainSpeed = THREE.MathUtils.lerp(state.trainSpeed, 0, delta * 2.8);
    } else {
        state.currentThrottle = THREE.MathUtils.lerp(state.currentThrottle, state.targetThrottle, delta * accelRate);
        const targetSpeed = (state.currentThrottle / 100) * maxSpd;
        state.trainSpeed = THREE.MathUtils.lerp(state.trainSpeed, targetSpeed, delta * 0.8);
    }

    if (Math.abs(state.trainSpeed) < 0.05) state.trainSpeed = 0;

    const speedRatio = state.trainSpeed / maxSpd;
    const trackLength = mainTrackCurve.getLength();
    const meterPerSec = (state.trainSpeed * 1000) / 3600;
    const deltaU = (meterPerSec * delta) / trackLength;

    state.trainU = (state.trainU + deltaU) % 1.0;
    if (state.trainU < 0) state.trainU += 1.0;

    trainAudio.updateChugSpeed(speedRatio);

    state.smokeTimer += delta;
    const puffInterval = Math.max(0.12, 0.6 - Math.abs(speedRatio) * 0.45);
    if (state.smokeTimer >= puffInterval && Math.abs(state.trainSpeed) > 1) {
        state.smokeTimer = 0;
        emitSmokePuff(scene, rig.locomotiveGroup, activeTrain, false);
    }

    positionTrainUnits(state.trainU, rig, mainTrackCurve);

    const wheelRotDelta = (meterPerSec * delta) / 0.9;
    rig.wheels.forEach(w => w.rotation.x += wheelRotDelta);
    rig.connectingRods.forEach((r) => {
        r.position.y = 0.9 + Math.sin(rig.wheels[0]?.rotation.x || 0) * 0.35;
        r.position.z = 0.1 + Math.cos(rig.wheels[0]?.rotation.x || 0) * 0.35;
    });

    checkStationArrival(state, activeTrain, mainTrackCurve, delta);
    checkJunctionProximity(state.trainU);
}

export function positionTrainUnits(
    trainU: number,
    rig: TrainRig,
    mainTrackCurve: THREE.CatmullRomCurve3
) {
    const units = [
        { group: rig.locomotiveGroup, offsetDist: 0 },
        { group: rig.tenderGroup, offsetDist: 6.5 },
        { group: rig.carriage1Group, offsetDist: 14.5 },
        { group: rig.carriage2Group, offsetDist: 23.5 },
        { group: rig.cargoGroup, offsetDist: 32.0 },
    ];

    const totalLen = mainTrackCurve.getLength();

    units.forEach(u => {
        if (!u.group) return;
        const unitU = (trainU - (u.offsetDist / totalLen) + 1.0) % 1.0;
        const pos = mainTrackCurve.getPointAt(unitU);
        const tangent = mainTrackCurve.getTangentAt(unitU).normalize();

        u.group.position.copy(pos);
        u.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    });
}

export function checkStationArrival(
    state: PhysicsState,
    activeTrain: TrainDef,
    mainTrackCurve: THREE.CatmullRomCurve3,
    delta: number
) {
    const stations = getActiveStations(activeTrain);
    const targetStation = stations[state.currentStationIndex % stations.length];
    if (!targetStation) return;

    const totalLen = mainTrackCurve.getLength();
    const targetU = targetStation.trackU;
    let distU = targetU - state.trainU;
    if (distU < -0.5) distU += 1.0;
    if (distU > 0.5) distU -= 1.0;

    const distMeters = Math.abs(distU * totalLen);

    const distEl = document.getElementById('target-station-dist');
    if (distEl) distEl.innerText = `(${Math.round(distMeters)}m)`;

    const boardingPanel = document.getElementById('station-boarding-panel');
    const progressBar = document.getElementById('boarding-progress');
    const t = getT();

    // If within 30 meters and train stopped (< 5 km/h)
    if (distMeters < 30 && state.trainSpeed < 5.0) {
        if (!state.isBoarding) {
            state.isBoarding = true;
            state.boardingTimer = 0;
            trainAudio.playStationBell();
            if (boardingPanel) {
                boardingPanel.style.display = 'flex';
                const title = document.getElementById('boarding-station-title');
                if (title) title.innerText = `${t.stationStopTitle}: ${getStationName(targetStation).toUpperCase()}`;
            }
        }

        state.boardingTimer += delta;
        const progressPct = Math.min(100, (state.boardingTimer / 2.5) * 100);
        if (progressBar) progressBar.style.width = `${progressPct}%`;

        if (state.boardingTimer >= 2.5) {
            state.isBoarding = false;
            if (boardingPanel) boardingPanel.style.display = 'none';

            const moneyReward = 50;
            state.totalPassengers += targetStation.passengersWaiting;

            addTrainMoney(moneyReward);
            trainAudio.playCoinReward();

            showStationRewardModal(targetStation, moneyReward);

            state.currentStationIndex = (state.currentStationIndex + 1) % stations.length;
            const nextSt = stations[state.currentStationIndex];
            const nameEl = document.getElementById('target-station-name');
            if (nameEl) nameEl.innerText = getStationName(nextSt);
        }
    } else {
        if (state.isBoarding && distMeters >= 40) {
            state.isBoarding = false;
            if (boardingPanel) boardingPanel.style.display = 'none';
        }

        // Kui sõidetakse peatusest mööda ilma peatumata -> "Sa jätsid peatuse vahele" / "You missed the station"
        if (distU < -0.015 && distU > -0.25 && !state.isBoarding && state.trainSpeed > 2.0) {
            showStationSkippedNotification(targetStation);

            state.currentStationIndex = (state.currentStationIndex + 1) % stations.length;
            const nextSt = stations[state.currentStationIndex];
            const nameEl = document.getElementById('target-station-name');
            if (nameEl) nameEl.innerText = getStationName(nextSt);
        }
    }
}

export function checkJunctionProximity(trainU: number) {
    const juncBanner = document.getElementById('junction-banner');
    const distU = Math.abs(trainU - JUNCTION.switchU);

    if (distU < 0.04) {
        if (juncBanner) juncBanner.style.display = 'flex';
    } else {
        if (juncBanner) juncBanner.style.display = 'none';
    }
}

export function toggleTrackSwitch() {
    const t = getT();
    JUNCTION.activeBranch = JUNCTION.activeBranch === 'main' ? 'mountain' : 'main';
    trainAudio.playSwitchTrack();
    const dirText = document.getElementById('junction-dir-text');
    if (dirText) {
        dirText.innerText = JUNCTION.activeBranch === 'main' ? t.branchMain : t.branchMountain;
        dirText.style.color = JUNCTION.activeBranch === 'main' ? '#00f2fe' : '#ffd32a';
    }
}
