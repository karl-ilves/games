import * as THREE from 'three';
import { checkIsOwner, getStationName, getT } from '../i18n';
import { METRO_STATIONS, TRAIN_STATIONS } from '../tracks/trackData';
import { Station, TrainDef, WeatherMode } from '../types';

export function buildRailwayTracks(
    scene: THREE.Scene,
    mainTrackCurve: THREE.CatmullRomCurve3,
    mountainTrackCurve: THREE.CatmullRomCurve3
) {
    renderTrackMesh(scene, mainTrackCurve, 1200);
    renderTrackMesh(scene, mountainTrackCurve, 300);
}

function renderTrackMesh(scene: THREE.Scene, curve: THREE.CatmullRomCurve3, samples: number) {
    const railGauge = 2.4;
    const sleeperSpacing = 3.0;
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8c97a8, metalness: 0.85, roughness: 0.3 });
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x4f4a43, roughness: 0.95 });

    const totalLength = curve.getLength();
    const numSleepers = Math.floor(totalLength / sleeperSpacing);

    const sleeperGeo = new THREE.BoxGeometry(3.6, 0.25, 0.7);
    const sleeperInstanced = new THREE.InstancedMesh(sleeperGeo, sleeperMat, numSleepers);
    sleeperInstanced.castShadow = true;
    sleeperInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < numSleepers; i++) {
        const u = (i / numSleepers);
        const pos = curve.getPointAt(u);
        const tangent = curve.getTangentAt(u).normalize();
        dummy.position.copy(pos);
        dummy.position.y += 0.1;
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        dummy.updateMatrix();
        sleeperInstanced.setMatrixAt(i, dummy.matrix);
    }
    sleeperInstanced.instanceMatrix.needsUpdate = true;
    scene.add(sleeperInstanced);

    [-railGauge / 2, railGauge / 2].forEach(offset => {
        const railPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
            const u = i / samples;
            const p = curve.getPointAt(u);
            const tangent = curve.getTangentAt(u).normalize();
            const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            const railPoint = p.clone().add(normal.clone().multiplyScalar(offset));
            railPoint.y += 0.35;
            railPoints.push(railPoint);
        }
        const railCurve = new THREE.CatmullRomCurve3(railPoints, curve.closed);
        const railGeo = new THREE.TubeGeometry(railCurve, samples, 0.12, 6, curve.closed);
        const railMesh = new THREE.Mesh(railGeo, railMat);
        railMesh.castShadow = true;
        railMesh.receiveShadow = true;
        scene.add(railMesh);
    });

    const ballastGeo = new THREE.TubeGeometry(curve, samples, 2.3, 5, curve.closed);
    const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
    ballastMesh.scale.set(1, 0.25, 1);
    ballastMesh.receiveShadow = true;
    scene.add(ballastMesh);
}

export function buildTerrainAndScenery(mainTrackCurve: THREE.CatmullRomCurve3): THREE.Group {
    const group = new THREE.Group();

    // 2x Suurem maastik (3600 x 3600), tasapinnaline maapind y = -0.1
    const groundGeo = new THREE.PlaneGeometry(3600, 3600, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3d7e35,
        roughness: 0.9,
        flatShading: true
    });

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = true;
    group.add(groundMesh);

    // River maa tasapinnal
    const riverGeo = new THREE.PlaneGeometry(160, 2600);
    const riverMat = new THREE.MeshStandardMaterial({
        color: 0x1d70b8,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity: 0.85
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = Math.PI / 12;
    river.position.set(200, -0.05, 1000);
    river.receiveShadow = true;
    group.add(river);

    // Sild üle jõe
    const bridgeRiverUStart = 0.38;
    const bridgeRiverUEnd = 0.46;
    const bridgeSteps = 14;
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });

    for (let i = 0; i <= bridgeSteps; i++) {
        const u = bridgeRiverUStart + (i / bridgeSteps) * (bridgeRiverUEnd - bridgeRiverUStart);
        const pos = mainTrackCurve.getPointAt(u);
        const tangent = mainTrackCurve.getTangentAt(u).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        const postGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
        const postL = new THREE.Mesh(postGeo, postMat);
        postL.position.copy(pos).add(normal.clone().multiplyScalar(2.2));
        postL.position.y += 0.45;

        const postR = new THREE.Mesh(postGeo, postMat);
        postR.position.copy(pos).add(normal.clone().multiplyScalar(-2.2));
        postR.position.y += 0.45;

        group.add(postL, postR);

        if (i % 3 === 0) {
            const pierGeo = new THREE.CylinderGeometry(1.2, 1.5, 6, 8);
            const pier = new THREE.Mesh(pierGeo, pierMat);
            pier.position.copy(pos);
            pier.position.y -= 2.8;
            pier.receiveShadow = true;
            group.add(pier);
        }
    }

    buildPineForest(group);
    buildStations(group, mainTrackCurve);

    return group;
}

function buildPineForest(group: THREE.Group) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x543d2b, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.8, flatShading: true });
    const birchFoliageMat = new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.8, flatShading: true });

    const numTrees = 450;
    const treeGroup = new THREE.Group();

    for (let i = 0; i < numTrees; i++) {
        const isBirch = Math.random() > 0.65;
        const tree = new THREE.Group();

        let x = (Math.random() - 0.5) * 2800;
        let z = (Math.random() - 0.5) * 2800;

        if (Math.abs(x) < 70 && Math.abs(z) < 70) x += 150;

        const scale = 0.8 + Math.random() * 0.9;
        tree.scale.set(scale, scale, scale);
        tree.position.set(x, 0, z);

        const trunkHeight = isBirch ? 6 : 4;
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        if (!isBirch) {
            for (let c = 0; c < 3; c++) {
                const cone = new THREE.Mesh(new THREE.ConeGeometry(2.8 - c * 0.6, 3.5, 6), foliageMat);
                cone.position.y = 3 + c * 2.2;
                cone.castShadow = true;
                tree.add(cone);
            }
        } else {
            const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(3), birchFoliageMat);
            sphere.position.y = trunkHeight + 2;
            sphere.castShadow = true;
            tree.add(sphere);
        }

        treeGroup.add(tree);
    }
    group.add(treeGroup);
}

function buildStations(group: THREE.Group, mainTrackCurve: THREE.CatmullRomCurve3) {
    TRAIN_STATIONS.forEach(st => {
        st.worldPos = mainTrackCurve.getPointAt(st.trackU);
        const tangent = mainTrackCurve.getTangentAt(st.trackU).normalize();

        const stationGroup = new THREE.Group();
        stationGroup.position.copy(st.worldPos);
        stationGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        const platformMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
        const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 45), platformMat);
        platform.position.set(5.5, 0.4, 0);
        platform.receiveShadow = true;
        platform.castShadow = true;
        stationGroup.add(platform);

        const lineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 45), lineMat);
        line.position.set(2.2, 0.81, 0);
        stationGroup.add(line);

        const signPostMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), signPostMat);
        post1.position.set(6, 2, -10);
        const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), signPostMat);
        post2.position.set(6, 2, 10);
        stationGroup.add(post1, post2);

        const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.3, roughness: 0.4 });
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 25), roofMat);
        canopy.position.set(6, 4.5, 0);
        canopy.castShadow = true;
        stationGroup.add(canopy);

        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.4, 8), new THREE.MeshBasicMaterial({ color: 0xfff3bf }));
        lamp.position.set(6, 4.2, 0);
        stationGroup.add(lamp);

        const passengerMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.7 });
        for (let p = 0; p < 6; p++) {
            const person = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.4, 6), passengerMat);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffedd5 }));
            head.position.y = 0.95;
            person.add(body, head);
            person.position.set(5 + (Math.random() - 0.5) * 3, 1.5, (p - 2.5) * 5 + (Math.random() - 0.5) * 2);
            stationGroup.add(person);
        }

        group.add(stationGroup);
    });
}

export function buildUndergroundSubwayWorld(mainTrackCurve: THREE.CatmullRomCurve3): THREE.Group {
    const group = new THREE.Group();

    // 1. Bedrock põrand
    const bedrockGeo = new THREE.PlaneGeometry(3600, 3600);
    const bedrockMat = new THREE.MeshStandardMaterial({
        color: 0x0a0d14,
        roughness: 0.95
    });
    const bedrock = new THREE.Mesh(bedrockGeo, bedrockMat);
    bedrock.rotation.x = -Math.PI / 2;
    bedrock.position.y = -0.12;
    bedrock.receiveShadow = true;
    group.add(bedrock);

    // 2. Betoonist tunnelite võrgustik
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.9 });
    const archMat = new THREE.MeshStandardMaterial({ color: 0x181c24, metalness: 0.4, roughness: 0.6 });
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
    const lightMatAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const lightMatCyan = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const thirdRailMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });

    const mainLen = mainTrackCurve.getLength();
    const numSegments = 120;
    const stationPositions = METRO_STATIONS.map(s => s.trackU);

    for (let i = 0; i < numSegments; i++) {
        const u = i / numSegments;

        const isNearStation = stationPositions.some(stU => {
            let diff = Math.abs(u - stU);
            if (diff > 0.5) diff = 1.0 - diff;
            return diff * mainLen < 32;
        });

        if (isNearStation) continue;

        const pos = mainTrackCurve.getPointAt(u);
        const tangent = mainTrackCurve.getTangentAt(u).normalize();

        const segGroup = new THREE.Group();
        segGroup.position.copy(pos);
        segGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        const wallGeo = new THREE.BoxGeometry(0.6, 6.4, 9.0);
        const wallL = new THREE.Mesh(wallGeo, concreteMat);
        wallL.position.set(-4.6, 3.2, 0);
        const wallR = new THREE.Mesh(wallGeo, concreteMat);
        wallR.position.set(4.6, 3.2, 0);
        segGroup.add(wallL, wallR);

        const ceilGeo = new THREE.BoxGeometry(9.8, 0.6, 9.0);
        const ceiling = new THREE.Mesh(ceilGeo, concreteMat);
        ceiling.position.set(0, 6.4, 0);
        segGroup.add(ceiling);

        const archGeo = new THREE.BoxGeometry(10.2, 0.45, 0.7);
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(0, 6.3, 0);
        segGroup.add(arch);

        const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 9.0, 6), conduitMat);
        conduit.rotation.x = Math.PI / 2;
        conduit.position.set(-4.2, 4.2, 0);
        segGroup.add(conduit);

        if (i % 2 === 0) {
            const lampHousing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.5), archMat);
            lampHousing.position.set(-4.25, 4.8, 0);
            const lampBulb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.35), (i % 4 === 0) ? lightMatCyan : lightMatAmber);
            lampBulb.position.set(-4.15, 4.8, 0);
            segGroup.add(lampHousing, lampBulb);
        }

        const thirdRail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 9.0), thirdRailMat);
        thirdRail.position.set(1.9, 0.45, 0);
        segGroup.add(thirdRail);

        group.add(segGroup);
    }

    buildUndergroundStations(group, mainTrackCurve);
    return group;
}

function buildUndergroundStations(group: THREE.Group, mainTrackCurve: THREE.CatmullRomCurve3) {
    const tilePlatformMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.1 });
    const tactileMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const wallTileMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const neonLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const signBoardMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const passengerMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 });

    METRO_STATIONS.forEach(st => {
        st.worldPos = mainTrackCurve.getPointAt(st.trackU);
        const tangent = mainTrackCurve.getTangentAt(st.trackU).normalize();

        const stationGroup = new THREE.Group();
        stationGroup.position.copy(st.worldPos);
        stationGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        const platform = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.8, 55), tilePlatformMat);
        platform.position.set(6.2, 0.4, 0);
        platform.receiveShadow = true;
        stationGroup.add(platform);

        const yellowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 55), tactileMat);
        yellowStrip.position.set(1.7, 0.81, 0);
        stationGroup.add(yellowStrip);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7.5, 60), wallTileMat);
        backWall.position.set(11.2, 3.75, 0);
        stationGroup.add(backWall);

        const oppWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7.5, 60), wallTileMat);
        oppWall.position.set(-4.5, 3.75, 0);
        stationGroup.add(oppWall);

        const stCeiling = new THREE.Mesh(new THREE.BoxGeometry(17.0, 0.8, 60), ceilingMat);
        stCeiling.position.set(3.5, 7.5, 0);
        stationGroup.add(stCeiling);

        for (let c = -20; c <= 20; c += 10) {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7.0, 8), columnMat);
            col.position.set(6.2, 3.9, c);
            stationGroup.add(col);
        }

        for (let l = -20; l <= 20; l += 8) {
            const lightBar = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.1, 0.4), neonLightMat);
            lightBar.position.set(6.2, 7.0, l);
            stationGroup.add(lightBar);
        }

        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 12), signBoardMat);
        sign.position.set(10.7, 4.0, 0);
        stationGroup.add(sign);

        for (let p = 0; p < 8; p++) {
            const person = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.4, 6), passengerMat);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffedd5 }));
            head.position.y = 0.95;
            person.add(body, head);
            person.position.set(5.5 + (Math.random() - 0.5) * 3.5, 1.5, (p - 3.5) * 5 + (Math.random() - 0.5) * 2);
            stationGroup.add(person);
        }

        group.add(stationGroup);
    });
}

export interface EnvironmentContext {
    scene: THREE.Scene;
    dirLight: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    hemiLight: THREE.HemisphereLight;
    trainHeadlight?: THREE.SpotLight;
    aboveGroundGroup?: THREE.Group;
    undergroundSubwayGroup?: THREE.Group;
    activeTrain: TrainDef;
    weatherMode: WeatherMode;
    targetStation?: Station;
}

export function applyWorldEnvironment(ctx: EnvironmentContext) {
    const isMetro = ctx.activeTrain && ctx.activeTrain.category === 'metro';
    const isOwner = checkIsOwner();

    if (ctx.aboveGroundGroup) ctx.aboveGroundGroup.visible = !isMetro;
    if (ctx.undergroundSubwayGroup) ctx.undergroundSubwayGroup.visible = isMetro;

    const envBadge = document.getElementById('environment-mode-badge');
    if (envBadge) {
        if (isMetro) {
            envBadge.innerText = isOwner ? '🚇 MAA ALL (METROO)' : '🚇 UNDERGROUND (SUBWAY)';
            envBadge.style.background = 'rgba(168, 85, 247, 0.25)';
            envBadge.style.borderColor = 'rgba(168, 85, 247, 0.5)';
            envBadge.style.color = '#c084fc';
        } else {
            envBadge.innerText = isOwner ? '🌲 MAA PEAL (RAUDTEE)' : '🌲 SURFACE (RAILWAY)';
            envBadge.style.background = 'rgba(56, 189, 248, 0.2)';
            envBadge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
            envBadge.style.color = '#38bdf8';
        }
    }

    if (isMetro) {
        if (ctx.scene) {
            ctx.scene.background = new THREE.Color(0x06080e);
            ctx.scene.fog = new THREE.FogExp2(0x06080e, 0.0055);
        }
        if (ctx.dirLight) {
            ctx.dirLight.intensity = 0.2;
            ctx.dirLight.color.setHex(0x38bdf8);
        }
        if (ctx.ambientLight) {
            ctx.ambientLight.intensity = 0.25;
            ctx.ambientLight.color.setHex(0x1e293b);
        }
        if (ctx.hemiLight) {
            ctx.hemiLight.intensity = 0.2;
            ctx.hemiLight.color.setHex(0x1e293b);
            ctx.hemiLight.groundColor.setHex(0x090d16);
        }
        if (ctx.trainHeadlight) {
            ctx.trainHeadlight.intensity = 16;
            ctx.trainHeadlight.distance = 220;
            ctx.trainHeadlight.angle = 0.5;
        }
    } else {
        if (ctx.hemiLight) {
            ctx.hemiLight.intensity = 0.5;
            ctx.hemiLight.color.setHex(0xffffff);
            ctx.hemiLight.groundColor.setHex(0x3d7e35);
        }
        if (ctx.trainHeadlight) {
            ctx.trainHeadlight.distance = 120;
            ctx.trainHeadlight.angle = Math.PI / 6;
        }
        applyWeatherMode(ctx);
    }

    const nameEl = document.getElementById('target-station-name');
    if (nameEl && ctx.targetStation) {
        nameEl.innerText = getStationName(ctx.targetStation);
    }
}

export function applyWeatherMode(ctx: EnvironmentContext) {
    const t = getT();
    const btn = document.getElementById('btn-toggle-weather');
    const mWeatherLabel = document.getElementById('m-weather-label');
    const isOwner = checkIsOwner();

    if (ctx.weatherMode === 0) {
        if (ctx.scene) {
            ctx.scene.background = new THREE.Color(0x87ceeb);
            ctx.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0012);
        }
        if (ctx.dirLight) {
            ctx.dirLight.color.setHex(0xfffaed);
            ctx.dirLight.intensity = 1.3;
        }
        if (ctx.ambientLight) ctx.ambientLight.intensity = 0.4;
        if (ctx.trainHeadlight) ctx.trainHeadlight.intensity = 3;
        if (btn) btn.innerText = t.weatherModes[0];
        if (mWeatherLabel) mWeatherLabel.innerText = isOwner ? 'PÄEV' : 'DAY';
    } else if (ctx.weatherMode === 1) {
        if (ctx.scene) {
            ctx.scene.background = new THREE.Color(0xf97316);
            ctx.scene.fog = new THREE.FogExp2(0xea580c, 0.0028);
        }
        if (ctx.dirLight) {
            ctx.dirLight.color.setHex(0xffaa5e);
            ctx.dirLight.intensity = 1.1;
        }
        if (ctx.ambientLight) ctx.ambientLight.intensity = 0.3;
        if (ctx.trainHeadlight) ctx.trainHeadlight.intensity = 6;
        if (btn) btn.innerText = t.weatherModes[1];
        if (mWeatherLabel) mWeatherLabel.innerText = isOwner ? 'LOOJANG' : 'SUNSET';
    } else if (ctx.weatherMode === 2) {
        if (ctx.scene) {
            ctx.scene.background = new THREE.Color(0x060b13);
            ctx.scene.fog = new THREE.FogExp2(0x060b13, 0.0038);
        }
        if (ctx.dirLight) {
            ctx.dirLight.color.setHex(0x38bdf8);
            ctx.dirLight.intensity = 0.2;
        }
        if (ctx.ambientLight) ctx.ambientLight.intensity = 0.15;
        if (ctx.trainHeadlight) ctx.trainHeadlight.intensity = 12;
        if (btn) btn.innerText = t.weatherModes[2];
        if (mWeatherLabel) mWeatherLabel.innerText = isOwner ? 'ÖÖ' : 'NIGHT';
    }
}
