import * as THREE from 'three';
import { AIRPORTS } from '../catalog';
import { StuntRing, WeatherMode } from '../types';

export interface FlightWorld {
    scene: THREE.Scene;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    stuntRings: StuntRing[];
    clouds: THREE.Group[];
    radarDish?: THREE.Object3D;
    windsock?: THREE.Object3D;
    papiLights: THREE.Mesh[];
    updateWorld: (delta: number, playerPos: THREE.Vector3) => void;
    setWeather: (weather: WeatherMode) => void;
    checkRingPass: (pos: THREE.Vector3) => StuntRing | null;
    getPapiStatus: (pos: THREE.Vector3) => { redCount: number; whiteCount: number; stateText: string };
}

export function buildFlightWorld(scene: THREE.Scene): FlightWorld {
    // 1. Lighting
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 1.2);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.0);
    sunLight.position.set(500, 1000, 300);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 3000;
    sunLight.shadow.camera.left = -600;
    sunLight.shadow.camera.right = 600;
    sunLight.shadow.camera.top = 600;
    sunLight.shadow.camera.bottom = -600;
    scene.add(sunLight);

    // Fog
    scene.fog = new THREE.FogExp2(0xcce7ff, 0.00018);

    // 2. Endless Ocean
    const oceanGeo = new THREE.PlaneGeometry(16000, 16000, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({
        color: 0x0f4c81,
        roughness: 0.1,
        metalness: 0.8
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = 0;
    scene.add(ocean);

    // 3. Main Airport Island Terrain
    const islandGeo = new THREE.ConeGeometry(3800, 18, 32);
    islandGeo.scale(1.4, 1, 0.9);
    const islandMat = new THREE.MeshStandardMaterial({
        color: 0x2d6a4f,
        roughness: 0.85,
        metalness: 0.05
    });
    const mainIsland = new THREE.Mesh(islandGeo, islandMat);
    mainIsland.position.set(0, -9, 0);
    mainIsland.receiveShadow = true;
    scene.add(mainIsland);

    // Sand beaches around main island
    const beachGeo = new THREE.RingGeometry(3600, 4200, 32);
    beachGeo.rotateX(-Math.PI / 2);
    const beachMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.position.set(0, 0.4, 0);
    scene.add(beach);

    // 4. Distant Mountain Range
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });

    const mountainPositions = [
        { x: -3200, z: -2800, r: 800, h: 650 },
        { x: -4200, z: -2200, r: 950, h: 800 },
        { x: -2600, z: -3800, r: 750, h: 550 },
        { x: -4800, z: -3500, r: 1100, h: 950 }
    ];

    mountainPositions.forEach(m => {
        const mGeo = new THREE.ConeGeometry(m.r, m.h, 16);
        const mountain = new THREE.Mesh(mGeo, mountainMat);
        mountain.position.set(m.x, m.h * 0.5, m.z);
        scene.add(mountain);

        // Snow Cap
        const capGeo = new THREE.ConeGeometry(m.r * 0.35, m.h * 0.35, 16);
        const cap = new THREE.Mesh(capGeo, snowMat);
        cap.position.set(m.x, m.h * 0.82, m.z);
        scene.add(cap);
    });

    // 5. Tropical Island Atoll (Second Airport)
    const atollGeo = new THREE.CylinderGeometry(1400, 1800, 12, 24);
    const atoll = new THREE.Mesh(atollGeo, islandMat);
    atoll.position.set(3200, -5, -2900);
    scene.add(atoll);

    // 6. Main Runway 09/27 at Playard Intl
    const mainAirport = AIRPORTS[0];
    const runwayGeo = new THREE.PlaneGeometry(mainAirport.runwayLength, mainAirport.runwayWidth);
    runwayGeo.rotateX(-Math.PI / 2);
    const runwayMat = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.9
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.position.set(0, 0.6, 0);
    runway.receiveShadow = true;
    scene.add(runway);

    // Runway Centerline Dashes
    const dashCount = 30;
    const dashLength = 35;
    const dashGap = 45;
    const dashGeo = new THREE.PlaneGeometry(dashLength, 2.2);
    dashGeo.rotateX(-Math.PI / 2);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = -dashCount / 2; i < dashCount / 2; i++) {
        const dash = new THREE.Mesh(dashGeo, whiteMat);
        dash.position.set(i * (dashLength + dashGap), 0.65, 0);
        scene.add(dash);
    }

    // Threshold Piano Key Stripes
    const stripeCount = 8;
    const stripeGeo = new THREE.PlaneGeometry(30, 2.2);
    stripeGeo.rotateX(-Math.PI / 2);

    [-1120, 1120].forEach(endX => {
        for (let s = -stripeCount / 2; s < stripeCount / 2; s++) {
            const stripe = new THREE.Mesh(stripeGeo, whiteMat);
            stripe.position.set(endX, 0.65, s * 4.5 + 2.25);
            scene.add(stripe);
        }
    });

    // 7. 3D Runway Edge Lights & PAPI Lights
    const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const whiteLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const bulbGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const pylonGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });

    // Edge lights along runway
    const lightStep = 100;
    for (let x = -1180; x <= 1180; x += lightStep) {
        [-26, 26].forEach(z => {
            const pylon = new THREE.Mesh(pylonGeo, pylonMat);
            pylon.position.set(x, 0.9, z);
            const isThreshold = Math.abs(x) > 1150;
            const bulb = new THREE.Mesh(bulbGeo, isThreshold ? (x < 0 ? greenLightMat : redLightMat) : whiteLightMat);
            bulb.position.set(x, 1.3, z);
            scene.add(pylon, bulb);
        });
    }

    // PAPI (Precision Approach Path Indicator) - 4 lights to the left of Runway 09 touchdown
    const papiLights: THREE.Mesh[] = [];
    for (let p = 0; p < 4; p++) {
        const papiBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), pylonMat);
        papiBox.position.set(-850 + p * 8, 1.2, -34);
        const papiBulb = new THREE.Mesh(bulbGeo, redLightMat);
        papiBulb.position.set(-850 + p * 8, 1.8, -34);
        scene.add(papiBox, papiBulb);
        papiLights.push(papiBulb);
    }

    // 8. Airport Buildings: Control Tower, Terminal, Hangars
    const buildMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const termGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 });

    // Main Passenger Terminal
    const termGeo = new THREE.BoxGeometry(220, 24, 60);
    const terminal = new THREE.Mesh(termGeo, buildMat);
    terminal.position.set(0, 12, -90);
    terminal.castShadow = true;
    terminal.receiveShadow = true;
    scene.add(terminal);

    // Terminal glass facade
    const facadeGeo = new THREE.BoxGeometry(210, 16, 2);
    const facade = new THREE.Mesh(facadeGeo, termGlassMat);
    facade.position.set(0, 12, -59);
    scene.add(facade);

    // Control Tower
    const towerShaftGeo = new THREE.CylinderGeometry(6, 9, 85, 16);
    const towerShaft = new THREE.Mesh(towerShaftGeo, buildMat);
    towerShaft.position.set(-180, 42.5, -110);
    scene.add(towerShaft);

    // Tower Cab (Glass Observation Deck)
    const towerCabGeo = new THREE.CylinderGeometry(14, 11, 16, 16);
    const towerCab = new THREE.Mesh(towerCabGeo, termGlassMat);
    towerCab.position.set(-180, 88, -110);
    scene.add(towerCab);

    // Rotating Radar Dish on top of Tower
    const radarGroup = new THREE.Group();
    radarGroup.position.set(-180, 98, -110);
    const radarDishGeo = new THREE.BoxGeometry(16, 4, 1.2);
    const radarDish = new THREE.Mesh(radarDishGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    radarGroup.add(radarDish);
    scene.add(radarGroup);

    // Hangars
    [-280, 280].forEach(x => {
        const hangarGeo = new THREE.CylinderGeometry(35, 35, 90, 16, 1, false, 0, Math.PI);
        hangarGeo.rotateZ(Math.PI / 2);
        const hangar = new THREE.Mesh(hangarGeo, buildMat);
        hangar.position.set(x, 0, -100);
        scene.add(hangar);
    });

    // Island Atoll Runway
    const islAirport = AIRPORTS[1];
    const islRunwayGeo = new THREE.PlaneGeometry(islAirport.runwayWidth, islAirport.runwayLength);
    islRunwayGeo.rotateX(-Math.PI / 2);
    const islRunway = new THREE.Mesh(islRunwayGeo, runwayMat);
    islRunway.position.set(islAirport.runwayStart.x, 0.6, (islAirport.runwayStart.z + islAirport.runwayEnd.z) * 0.5);
    scene.add(islRunway);

    // 9. Floating 3D Volumetric Clouds
    const clouds: THREE.Group[] = [];
    const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        transparent: true,
        opacity: 0.8
    });

    for (let c = 0; c < 24; c++) {
        const cloudGroup = new THREE.Group();
        const puffCount = 5 + Math.floor(Math.random() * 5);
        for (let p = 0; p < puffCount; p++) {
            const puffR = 60 + Math.random() * 80;
            const puff = new THREE.Mesh(new THREE.SphereGeometry(puffR, 8, 8), cloudMat);
            puff.position.set(
                (Math.random() - 0.5) * 160,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 160
            );
            cloudGroup.add(puff);
        }
        cloudGroup.position.set(
            (Math.random() - 0.5) * 8000,
            600 + Math.random() * 1200,
            (Math.random() - 0.5) * 8000
        );
        scene.add(cloudGroup);
        clouds.push(cloudGroup);
    }

    // 10. Golden Stunt Rings in the Sky
    const stuntRings: StuntRing[] = [];
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.9
    });

    const ringWaypoints = [
        new THREE.Vector3(400, 150, 0),
        new THREE.Vector3(900, 260, -200),
        new THREE.Vector3(1600, 420, -800),
        new THREE.Vector3(2200, 520, -1600),
        new THREE.Vector3(2800, 400, -2400),
        new THREE.Vector3(3200, 220, -2900), // Over Island Atoll
        new THREE.Vector3(2000, 550, -3200),
        new THREE.Vector3(0, 680, -3500),
        new THREE.Vector3(-1800, 750, -3200), // Alpine approach
        new THREE.Vector3(-2800, 600, -2000),
        new THREE.Vector3(-2000, 350, -1000),
        new THREE.Vector3(-1200, 180, -200) // Base leg to Runway 09
    ];

    ringWaypoints.forEach((pos, idx) => {
        const ringGroup = new THREE.Group();
        ringGroup.position.copy(pos);

        const ringGeo = new THREE.TorusGeometry(32, 2.5, 12, 32);
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringGroup.add(ringMesh);

        // Center beacon light
        const beacon = new THREE.PointLight(0xffd700, 2.0, 120);
        ringGroup.add(beacon);

        scene.add(ringGroup);

        stuntRings.push({
            id: `ring_${idx}`,
            position: pos.clone(),
            rotation: ringGroup.rotation,
            radius: 34,
            mesh: ringGroup,
            collected: false,
            reward: 25
        });
    });

    // Weather handler
    function setWeather(weather: WeatherMode): void {
        switch (weather) {
            case 'sunset':
                sunLight.color.setHex(0xf97316);
                sunLight.intensity = 2.4;
                hemiLight.color.setHex(0xfdba74);
                hemiLight.groundColor.setHex(0x3f2212);
                if (scene.fog) scene.fog.color.setHex(0xfb923c);
                scene.background = new THREE.Color(0xfb923c);
                break;
            case 'rain':
            case 'storm':
                sunLight.color.setHex(0x94a3b8);
                sunLight.intensity = 0.8;
                hemiLight.color.setHex(0x64748b);
                hemiLight.groundColor.setHex(0x0f172a);
                if (scene.fog) scene.fog.color.setHex(0x475569);
                scene.background = new THREE.Color(0x475569);
                break;
            case 'snow':
                sunLight.color.setHex(0xe2e8f0);
                sunLight.intensity = 1.2;
                hemiLight.color.setHex(0xf1f5f9);
                if (scene.fog) scene.fog.color.setHex(0xdbeafe);
                scene.background = new THREE.Color(0xdbeafe);
                break;
            case 'fog':
                sunLight.intensity = 0.5;
                if (scene.fog) scene.fog.color.setHex(0x94a3b8);
                scene.background = new THREE.Color(0x94a3b8);
                break;
            case 'clear':
            default:
                sunLight.color.setHex(0xfffbeb);
                sunLight.intensity = 2.0;
                hemiLight.color.setHex(0xbae6fd);
                hemiLight.groundColor.setHex(0x1e293b);
                if (scene.fog) scene.fog.color.setHex(0xcce7ff);
                scene.background = new THREE.Color(0x7dd3fc);
                break;
        }
    }

    setWeather('clear');

    function checkRingPass(pos: THREE.Vector3): StuntRing | null {
        for (const ring of stuntRings) {
            if (!ring.collected && ring.position.distanceTo(pos) < ring.radius) {
                ring.collected = true;
                ring.mesh.visible = false;
                return ring;
            }
        }
        return null;
    }

    // PAPI calculation: Checks aircraft position relative to Runway 09 touchdown point (-750, 0, 0)
    function getPapiStatus(pos: THREE.Vector3): { redCount: number; whiteCount: number; stateText: string } {
        const touchdownX = -750;
        const dx = touchdownX - pos.x; // distance along runway
        if (dx <= 50 || pos.x > touchdownX) {
            return { redCount: 2, whiteCount: 2, stateText: 'THRESHOLD' };
        }
        const idealAlt = 0.5 + dx * Math.tan(3.0 * (Math.PI / 180)); // 3 degree slope
        const altDiff = pos.y - idealAlt;

        let redCount = 2;
        let whiteCount = 2;
        let stateText = 'ON GLIDEPATH';

        if (altDiff > 40) {
            redCount = 0; whiteCount = 4; stateText = 'TOO HIGH (4W)';
        } else if (altDiff > 15) {
            redCount = 1; whiteCount = 3; stateText = 'SLIGHTLY HIGH (3W 1R)';
        } else if (altDiff < -40) {
            redCount = 4; whiteCount = 0; stateText = 'TOO LOW (4R)';
        } else if (altDiff < -15) {
            redCount = 3; whiteCount = 1; stateText = 'SLIGHTLY LOW (3R 1W)';
        }

        // Update 3D PAPI light bulbs
        for (let i = 0; i < 4; i++) {
            papiLights[i].material = i < redCount ? redLightMat : whiteLightMat;
        }

        return { redCount, whiteCount, stateText };
    }

    function updateWorld(delta: number, _playerPos: THREE.Vector3): void {
        // Rotate Radar Dish
        if (radarDish) {
            radarDish.rotation.y += delta * 1.5;
        }

        // Slowly drift clouds
        clouds.forEach(c => {
            c.position.x += delta * 6;
            if (c.position.x > 4500) c.position.x = -4500;
        });

        // Spin stunt rings slowly
        stuntRings.forEach(r => {
            if (!r.collected) {
                r.mesh.rotation.z += delta * 0.8;
            }
        });
    }

    return {
        scene,
        sunLight,
        hemiLight,
        stuntRings,
        clouds,
        radarDish,
        papiLights,
        updateWorld,
        setWeather,
        checkRingPass,
        getPapiStatus
    };
}
