import { createHumanoid } from "./entities/PedestrianBuilder";
import { VehicleBuilder } from "./entities/VehicleBuilder";
import { uiManager } from "./ui/UIManager";
import { WeatherSystem } from "./world/WeatherSystem";
let weatherSystem;
import { inputManager, keys } from "./core/InputManager";
import { yardService } from "../../shared/yardService";
import * as THREE from 'three';

function updateAirplaneYardUI() {
    const icon = document.getElementById('airplane-yard-icon');
    if (icon) icon.innerHTML = yardService.renderYardSvg(20);
    const val = document.getElementById('airplane-yard-val');
    if (val) val.innerText = yardService.getYards().toLocaleString();
}
setTimeout(() => {
    updateAirplaneYardUI();
    yardService.subscribe(() => updateAirplaneYardUI());
}, 100);

let wingSpanX = 0, wingOffsetZ = 0;
let isMobileMode = false;
let vehicleType = 'airplane';
let helicopterType = 'rescue';
let hospitals = [];



function spawnWaterDrop(x, y, z) {
    let dropCount = 50 * CRASH_SCALE;
    let waterGeo = new THREE.BoxGeometry(1 * CRASH_SCALE, 1 * CRASH_SCALE, 1 * CRASH_SCALE);
    let waterMat = new THREE.MeshBasicMaterial({ color: 0x3498db, transparent: true, opacity: 0.7 });
    
    for (let i = 0; i < dropCount; i++) {
        let mesh = new THREE.Mesh(waterGeo, waterMat);
        mesh.position.set(
            x + (Math.random() - 0.5) * 15 * CRASH_SCALE,
            y + (Math.random() - 0.5) * 5 * CRASH_SCALE,
            z + (Math.random() - 0.5) * 15 * CRASH_SCALE
        );
        let vel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            - (Math.random() * 2 + 3), // Fall down fast
            (Math.random() - 0.5) * 0.5
        );
        scene.add(mesh);
        waterDrops.push({ mesh: mesh, vel: vel, life: 100 });
    }
}

// Setup Three.js Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky color
scene.fog = new THREE.Fog(0x87CEEB, 100, 100000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 2.0, 50000);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Ultra Realistic Lighting & Environment ---
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Create a simple procedural environment scene
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x87CEEB); // Sky color

const envSun = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
envSun.position.set(500, 1000, -500);
envScene.add(envSun);

const envGround = new THREE.Mesh(
    new THREE.PlaneGeometry(10000, 10000),
    new THREE.MeshBasicMaterial({ color: 0x27ae60 })
);
envGround.rotation.x = -Math.PI / 2;
envGround.position.y = -50;
envScene.add(envGround);

scene.environment = pmremGenerator.fromScene(envScene).texture;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5); // Brighter sun for better PBR highlights
dirLight.position.set(2000, 4000, 2000);
dirLight.castShadow = true;
dirLight.shadow.camera.left = -5000;
dirLight.shadow.camera.right = 5000;
dirLight.shadow.camera.top = 5000;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 30000;
dirLight.shadow.bias = -0.0005;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

let map1Group = new THREE.Group();
let map2Group = new THREE.Group();
let map3Group = new THREE.Group();
let map4Group = new THREE.Group();
scene.add(map1Group);
scene.add(map2Group);
scene.add(map3Group);
scene.add(map4Group);

// Environment (Ground and Runway)
function createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base green
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw noise/grass blades
    for (let i = 0; i < 40000; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        let w = Math.random() * 2 + 1;
        let h = Math.random() * 10 + 2;
        
        let r = 20 + Math.random() * 30;
        let g = 140 + Math.random() * 60;
        let b = 50 + Math.random() * 30;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, w, h);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(800, 800);
    return texture;
}

const groundGeo = new THREE.PlaneGeometry(80000, 80000);
const groundMat = new THREE.MeshLambertMaterial({ 
    map: createGrassTexture()
}); 
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const runwayGeo = new THREE.PlaneGeometry(100, 8000);
const runwayMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
const runway = new THREE.Mesh(runwayGeo, runwayMat);
runway.rotation.x = -Math.PI / 2;
runway.position.y = 0.2; 
runway.position.z = -1000; 
runway.receiveShadow = true;
map1Group.add(runway);

const linesGeo = new THREE.PlaneGeometry(5, 8000);
const linesMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const line = new THREE.Mesh(linesGeo, linesMat);
line.rotation.x = -Math.PI / 2;
line.position.y = 0.3;
line.position.z = -1000;
map1Group.add(line);

// Airport Perimeter Fence
const fenceMatSolid = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
const fenceSideGeo = new THREE.BoxGeometry(4, 8, 8000);
const fenceFrontGeo = new THREE.BoxGeometry(164, 8, 4);

const fenceL = new THREE.Mesh(fenceSideGeo, fenceMatSolid);
fenceL.position.set(-80, 4, -1000);
fenceL.castShadow = true; fenceL.receiveShadow = true;
map1Group.add(fenceL);

const fenceR = new THREE.Mesh(fenceSideGeo, fenceMatSolid);
fenceR.position.set(80, 4, -1000);
fenceR.castShadow = true; fenceR.receiveShadow = true;
map1Group.add(fenceR);

const fenceFront = new THREE.Mesh(fenceFrontGeo, fenceMatSolid);
fenceFront.position.set(0, 4, 3000);
fenceFront.castShadow = true; fenceFront.receiveShadow = true;
map1Group.add(fenceFront);

const fenceBack = new THREE.Mesh(fenceFrontGeo, fenceMatSolid);
fenceBack.position.set(0, 4, -5000);
fenceBack.castShadow = true; fenceBack.receiveShadow = true;
map1Group.add(fenceBack);

// Add Ground Objects (Trees and Buildings)
const treeGeo = new THREE.ConeGeometry(5, 20, 8);
const treeMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
const bldgGeo = new THREE.BoxGeometry(20, 50, 20);
const bldgMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });

let buildings = [];
let roads = [];
let civCars = [];
let policeCars = [];
let pedestrians = [];
let hospitalBuilding = null;

const blockSize = 450;
const roadWidth = 100;
const gridCells = 48;

// Create roads
const roadGeo = new THREE.PlaneGeometry(roadWidth, gridCells * blockSize);
const roadGeoHalf = new THREE.PlaneGeometry(roadWidth, (gridCells * blockSize) / 2 - 150);
const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

// Dashed lines for roads
const lineGeo = new THREE.PlaneGeometry(2, gridCells * blockSize);
const lineGeoHalf = new THREE.PlaneGeometry(2, (gridCells * blockSize) / 2 - 150);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Split roads for non-bridges
const roadGeoRight1 = new THREE.PlaneGeometry(roadWidth, 2100);
const lineGeoRight1 = new THREE.PlaneGeometry(2, 2100);

const roadGeoRight2 = new THREE.PlaneGeometry(roadWidth, 8100);
const lineGeoRight2 = new THREE.PlaneGeometry(2, 8100);

for (let r = -gridCells/2; r < gridCells/2; r++) {
    // Horizontal roads (along X axis) - Split into left and right to avoid runway
    let hrLeft = new THREE.Mesh(roadGeoHalf, roadMat);
    hrLeft.rotation.x = -Math.PI / 2;
    hrLeft.rotation.z = Math.PI / 2;
    hrLeft.position.set(-((gridCells * blockSize)/4 + 75), 0.4, r * blockSize);
    hrLeft.receiveShadow = true;
    map1Group.add(hrLeft);
    
    let hlLeft = new THREE.Mesh(lineGeoHalf, lineMat);
    hlLeft.rotation.x = -Math.PI / 2;
    hlLeft.rotation.z = Math.PI / 2;
    hlLeft.position.set(-((gridCells * blockSize)/4 + 75), 0.5, r * blockSize);
    map1Group.add(hlLeft);
    
    // Only 5 roads cross the river (bridges)
    const isBridge = [-20, -10, 0, 10, 20].includes(r);
    
    if (isBridge) {
        let hrRight = new THREE.Mesh(roadGeoHalf, roadMat);
        hrRight.rotation.x = -Math.PI / 2;
        hrRight.rotation.z = Math.PI / 2;
        hrRight.position.set(((gridCells * blockSize)/4 + 75), 0.4, r * blockSize);
        hrRight.receiveShadow = true;
        map1Group.add(hrRight);
        
        let hlRight = new THREE.Mesh(lineGeoHalf, lineMat);
        hlRight.rotation.x = -Math.PI / 2;
        hlRight.rotation.z = Math.PI / 2;
        hlRight.position.set(((gridCells * blockSize)/4 + 75), 0.5, r * blockSize);
        map1Group.add(hlRight);
    } else {
        // Runway to River
        let hrRight1 = new THREE.Mesh(roadGeoRight1, roadMat);
        hrRight1.rotation.x = -Math.PI / 2;
        hrRight1.rotation.z = Math.PI / 2;
        hrRight1.position.set(1200, 0.4, r * blockSize);
        hrRight1.receiveShadow = true;
        map1Group.add(hrRight1);
        
        let hlRight1 = new THREE.Mesh(lineGeoRight1, lineMat);
        hlRight1.rotation.x = -Math.PI / 2;
        hlRight1.rotation.z = Math.PI / 2;
        hlRight1.position.set(1200, 0.5, r * blockSize);
        map1Group.add(hlRight1);
        
        // River to End
        let hrRight2 = new THREE.Mesh(roadGeoRight2, roadMat);
        hrRight2.rotation.x = -Math.PI / 2;
        hrRight2.rotation.z = Math.PI / 2;
        hrRight2.position.set(6750, 0.4, r * blockSize);
        hrRight2.receiveShadow = true;
        map1Group.add(hrRight2);
        
        let hlRight2 = new THREE.Mesh(lineGeoRight2, lineMat);
        hlRight2.rotation.x = -Math.PI / 2;
        hlRight2.rotation.z = Math.PI / 2;
        hlRight2.position.set(6750, 0.5, r * blockSize);
        map1Group.add(hlRight2);
    }
    
    roads.push({ type: 'h', z: r * blockSize, leftEnd: -150, rightStart: 150 });
    
    // Vertical roads (along Z axis)
    if (r !== 0) { // Skip the road that perfectly overlaps the runway (x = 0)
        let vr = new THREE.Mesh(roadGeo, roadMat);
        vr.rotation.x = -Math.PI / 2;
        vr.position.set(r * blockSize, 0.4, 0);
        vr.receiveShadow = true;
        map1Group.add(vr);
        
        let vl = new THREE.Mesh(lineGeo, lineMat);
        vl.rotation.x = -Math.PI / 2;
        vl.position.set(r * blockSize, 0.5, 0);
        map1Group.add(vl);
        roads.push({ type: 'v', x: r * blockSize });
    }
}

// Create River
const riverWidth = blockSize; // 450
const riverGeo = new THREE.PlaneGeometry(riverWidth, gridCells * blockSize);
const riverMat = new THREE.MeshLambertMaterial({ color: 0x2980b9, transparent: true, opacity: 0.8 });
let river = new THREE.Mesh(riverGeo, riverMat);
river.rotation.x = -Math.PI / 2;
// Place river exactly on block x = 5
river.position.set(5 * blockSize + blockSize/2, 0.2, 0);
map1Group.add(river);

// --- River Crossings ---
const bridgeStreets = [-7, -3, 1, 5, 9];
const tunnelStreets = [-9, -5, -1, 3, 7];

function createRiverCrossings() {
    let riverX = 5 * blockSize + blockSize/2; // 2475
    let bridgeMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    let tunnelMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    
    // Bridges
    bridgeStreets.forEach(z => {
        let zPos = z * blockSize;
        let bGeo = new THREE.BoxGeometry(blockSize, 10, roadWidth);
        let bMesh = new THREE.Mesh(bGeo, bridgeMat);
        bMesh.position.set(riverX, 5, zPos);
        bMesh.receiveShadow = true;
        bMesh.castShadow = true;
        map1Group.add(bMesh);
        
        let railGeo = new THREE.BoxGeometry(blockSize, 5, 2);
        let railMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
        let r1 = new THREE.Mesh(railGeo, railMat);
        r1.position.set(riverX, 10, zPos - roadWidth/2);
        map1Group.add(r1);
        let r2 = new THREE.Mesh(railGeo, railMat);
        r2.position.set(riverX, 10, zPos + roadWidth/2);
        map1Group.add(r2);
    });

    // Tunnels
    tunnelStreets.forEach(z => {
        let zPos = z * blockSize;
        let wEntGeo = new THREE.BoxGeometry(20, 20, roadWidth);
        let wEnt = new THREE.Mesh(wEntGeo, tunnelMat);
        wEnt.position.set(riverX - blockSize/2, 10, zPos);
        map1Group.add(wEnt);
        
        let eEntGeo = new THREE.BoxGeometry(20, 20, roadWidth);
        let eEnt = new THREE.Mesh(eEntGeo, tunnelMat);
        eEnt.position.set(riverX + blockSize/2, 10, zPos);
        map1Group.add(eEnt);
    });
}
createRiverCrossings();

// --- Runway Tunnels ---
function createRunwayTunnels() {
    let tunnelMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    for (let r = -gridCells/2; r < gridCells/2; r++) {
        let zPos = r * blockSize;
        // West Entrance
        let wEntGeo = new THREE.BoxGeometry(20, 20, roadWidth);
        let wEnt = new THREE.Mesh(wEntGeo, tunnelMat);
        wEnt.position.set(-150, 10, zPos);
        map1Group.add(wEnt);
        // East Entrance
        let eEntGeo = new THREE.BoxGeometry(20, 20, roadWidth);
        let eEnt = new THREE.Mesh(eEntGeo, tunnelMat);
        eEnt.position.set(150, 10, zPos);
        map1Group.add(eEnt);
    }
}
createRunwayTunnels();


let bldgData: any[] = [];
let treeData: any[] = [];

for (let x = -gridCells/2; x < gridCells/2; x++) {
    for (let z = -gridCells/2; z < gridCells/2; z++) {
        if (x === 0 || (x === -1 || x === 1) && z > -15 && z < 10 || x === 5) continue;
        if (x === 10 && z === -5) continue;
        
        let cx = x * blockSize + blockSize/2;
        let cz = z * blockSize + blockSize/2;
        
        let numBldgs = Math.floor(Math.random() * 4) + 2;
        for (let b = 0; b < numBldgs; b++) {
            let height = 20 + Math.random() * 150;
            let sx = 1 + Math.random();
            let sy = height/50;
            let sz = 1 + Math.random();
            let bx = cx + (Math.random() - 0.5) * (blockSize - roadWidth - 40);
            let bz = cz + (Math.random() - 0.5) * (blockSize - roadWidth - 40);
            let by = height / 2;
            
            bldgData.push({ px: bx, py: by, pz: bz, sx: sx, sy: sy, sz: sz, height: height });
            // Add dummy object for collision logic
            buildings.push({
                position: new THREE.Vector3(bx, by, bz),
                userData: { isTree: false, height: height, originalScale: new THREE.Vector3(sx, sy, sz) }
            });
        }
        
        for (let t = 0; t < 10; t++) {
            let tx = cx + (Math.random() - 0.5) * (blockSize - roadWidth - 10);
            let tz = cz + (Math.random() - 0.5) * (blockSize - roadWidth - 10);
            let ty = 10;
            
            treeData.push({ px: tx, py: ty, pz: tz, sx: 1, sy: 1, sz: 1 });
            buildings.push({
                position: new THREE.Vector3(tx, ty, tz),
                userData: { isTree: true, height: 20 }
            });
        }
    }
}

// Create InstancedMesh for Buildings
if (bldgData.length > 0) {
    let bldgInstanced = new THREE.InstancedMesh(bldgGeo, bldgMat, bldgData.length);
    bldgInstanced.castShadow = true;
    bldgInstanced.receiveShadow = true;
    let dummy = new THREE.Object3D();
    for (let i = 0; i < bldgData.length; i++) {
        let d = bldgData[i];
        dummy.position.set(d.px, d.py, d.pz);
        dummy.scale.set(d.sx, d.sy, d.sz);
        dummy.updateMatrix();
        bldgInstanced.setMatrixAt(i, dummy.matrix);
    }
    map1Group.add(bldgInstanced);
}


// --- Generate Map 2 (Mountains) ---
function generateMap2() {
    let mountGeo = new THREE.ConeGeometry(500, 1500, 8);
    let mountMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    
    // Create large mountains in a ring around the city
    let mountInstanced = new THREE.InstancedMesh(mountGeo, mountMat, 60);
    mountInstanced.castShadow = true;
    mountInstanced.receiveShadow = true;
    
    let dummy = new THREE.Object3D();
    
    let map2CenterX = 0;
    let map2CenterZ = -25000;
    
    for (let i = 0; i < 60; i++) {
        let angle = (i / 60) * Math.PI * 2;
        let radius = 6000 + Math.random() * 2000;
        
        let px = map2CenterX + Math.cos(angle) * radius;
        let pz = map2CenterZ + Math.sin(angle) * radius;
        
        let sy = 1.0 + Math.random() * 2.0; // Higher mountains
        let sx = 1 + Math.random() * 2;
        let sz = 1 + Math.random() * 2;
        
        dummy.position.set(px, 750 * sy, pz);
        dummy.scale.set(sx, sy, sz);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        
        mountInstanced.setMatrixAt(i, dummy.matrix);
        
        buildings.push({
            position: new THREE.Vector3(px, 750 * sy, pz),
            userData: { isTree: false, isMountain: true, height: 1500 * sy, originalScale: new THREE.Vector3(sx * 10, sy, sz * 10) }
        });
    }
    map2Group.add(mountInstanced);
    
    // Create a small city in the valley
    
    // Mountain City Roads
    let map2GridSize = 10; // 10x10 blocks
    let mRoadGeoX = new THREE.PlaneGeometry(4500, 30);
    let mRoadGeoZ = new THREE.PlaneGeometry(30, 4500);
    let mRoadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (let i = -map2GridSize/2; i <= map2GridSize/2; i++) {
        // Horizontal roads (along X)
        let rx = new THREE.Mesh(mRoadGeoX, mRoadMat);
        rx.rotation.x = -Math.PI / 2;
        rx.position.set(map2CenterX, 0.2, map2CenterZ + i * 450);
        map2Group.add(rx);
        
        // Vertical roads (along Z)
        let rz = new THREE.Mesh(mRoadGeoZ, mRoadMat);
        rz.rotation.x = -Math.PI / 2;
        rz.position.set(map2CenterX + i * 450, 0.2, map2CenterZ);
        map2Group.add(rz);
    }

    let map2BldgData = [];
    let map2TreeData = [];
    
    for (let x = -map2GridSize/2; x < map2GridSize/2; x++) {
        for (let z = -map2GridSize/2; z < map2GridSize/2; z++) {
            let cx = map2CenterX + x * 450 + 225;
            let cz = map2CenterZ + z * 450 + 225;
            
            // Randomly place buildings or trees
            let isPark = Math.random() < 0.2;
            
            if (!isPark) {
                // Buildings
                let bCount = Math.floor(Math.random() * 6) + 3;
                for (let b = 0; b < bCount; b++) {
                    let h = 40 + Math.random() * 150;
                    if (Math.random() > 0.9) h += 200; // skyscraper
                    let w = 30 + Math.random() * 50;
                    let d = 30 + Math.random() * 50;
                    
                    let tx = cx + (Math.random() - 0.5) * (450 - 40 - w);
                    let tz = cz + (Math.random() - 0.5) * (450 - 40 - d);
                    let ty = h / 2;
                    
                    map2BldgData.push({ px: tx, py: ty, pz: tz, sx: w/20, sy: h/50, sz: d/20 });
                    buildings.push({
                        position: new THREE.Vector3(tx, ty, tz),
                        userData: { isTree: false, height: h }
                    });
                }
            } else {
                // Trees
                let tCount = Math.floor(Math.random() * 8) + 4;
                for (let t = 0; t < tCount; t++) {
                    let tx = cx + (Math.random() - 0.5) * (450 - 40 - 10);
                    let tz = cz + (Math.random() - 0.5) * (450 - 40 - 10);
                    let ty = 10;
                    
                    map2TreeData.push({ px: tx, py: ty, pz: tz, sx: 1, sy: 1, sz: 1 });
                    buildings.push({
                        position: new THREE.Vector3(tx, ty, tz),
                        userData: { isTree: true, height: 20 }
                    });
                }
            }
        }
    }
    
    // Add InstancedMesh for Map 2 City Buildings
    if (map2BldgData.length > 0) {
        // Reuse bldgGeo and bldgMat from Map 1
        let map2BldgInstanced = new THREE.InstancedMesh(bldgGeo, bldgMat, map2BldgData.length);
        map2BldgInstanced.castShadow = true;
        map2BldgInstanced.receiveShadow = true;
        for (let i = 0; i < map2BldgData.length; i++) {
            let d = map2BldgData[i];
            dummy.position.set(d.px, d.py, d.pz);
            dummy.scale.set(d.sx, d.sy, d.sz);
            dummy.updateMatrix();
            map2BldgInstanced.setMatrixAt(i, dummy.matrix);
        }
        map2Group.add(map2BldgInstanced);
    }
    
    // Add InstancedMesh for Map 2 Trees
    if (map2TreeData.length > 0) {
        let map2TreeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, map2TreeData.length);
        map2TreeInstanced.castShadow = true;
        map2TreeInstanced.receiveShadow = true;
        for (let i = 0; i < map2TreeData.length; i++) {
            let d = map2TreeData[i];
            dummy.position.set(d.px, d.py, d.pz);
            dummy.scale.set(d.sx, d.sy, d.sz);
            dummy.updateMatrix();
            map2TreeInstanced.setMatrixAt(i, dummy.matrix);
        }
        map2Group.add(map2TreeInstanced);
    }
}
generateMap2();

function generateMap3() {
    let map3CenterX = 0;
    
    // Add Highway connecting Map 1 (Z=10800) to Map 3 (Z=20000)
    let highwayGeo = new THREE.PlaneGeometry(100, 9200);
    let highwayMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    let highway = new THREE.Mesh(highwayGeo, highwayMat);
    highway.rotation.x = -Math.PI / 2;
    highway.position.set(0, 0.2, 15400);
    highway.receiveShadow = true;
    map3Group.add(highway);
    let map3CenterZ = 20000;
    
    let map3BldgData = [];
    let map3TreeData = [];
    
    // Exactly 30 houses in a small cluster
    for (let i = 0; i < 30; i++) {
        let angle = Math.random() * Math.PI * 2;
        let radius = Math.random() * 600; // Small cluster radius 600
        
        let tx = map3CenterX + Math.cos(angle) * radius;
        let tz = map3CenterZ + Math.sin(angle) * radius;
        
        let h = 20 + Math.random() * 20; // Max height 40 (2 floors)
        let w = 30 + Math.random() * 20;
        let d = 30 + Math.random() * 20;
        let ty = h / 2;
        
        map3BldgData.push({ px: tx, py: ty, pz: tz, sx: w/20, sy: h/50, sz: d/20 });
        buildings.push({
            position: new THREE.Vector3(tx, ty, tz),
            userData: { isTree: false, height: h }
        });
    }
    
    // Add around 100 trees around the village
    for (let i = 0; i < 100; i++) {
        let angle = Math.random() * Math.PI * 2;
        let radius = Math.random() * 800; // Trees slightly wider spread
        
        let tx = map3CenterX + Math.cos(angle) * radius;
        let tz = map3CenterZ + Math.sin(angle) * radius;
        let ty = 10;
        
        map3TreeData.push({ px: tx, py: ty, pz: tz, sx: 1, sy: 1, sz: 1 });
        buildings.push({
            position: new THREE.Vector3(tx, ty, tz),
            userData: { isTree: true, height: 20 }
        });
    }
    
    // Add InstancedMesh for Map 3 Buildings
    if (map3BldgData.length > 0) {
        let bMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 }); // Orange-ish warm color for village houses
        let map3BldgInstanced = new THREE.InstancedMesh(bldgGeo, bMat, map3BldgData.length);
        map3BldgInstanced.castShadow = true;
        map3BldgInstanced.receiveShadow = true;
        let dummy = new THREE.Object3D();
        for (let i = 0; i < map3BldgData.length; i++) {
            let d = map3BldgData[i];
            dummy.position.set(d.px, d.py, d.pz);
            dummy.scale.set(d.sx, d.sy, d.sz);
            dummy.rotation.y = Math.random() * Math.PI; // Random rotation for houses
            dummy.updateMatrix();
            map3BldgInstanced.setMatrixAt(i, dummy.matrix);
        }
        map3Group.add(map3BldgInstanced);
    }
    
    // Add InstancedMesh for Map 3 Trees
    if (map3TreeData.length > 0) {
        let map3TreeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, map3TreeData.length);
        map3TreeInstanced.castShadow = true;
        map3TreeInstanced.receiveShadow = true;
        let dummy = new THREE.Object3D();
        for (let i = 0; i < map3TreeData.length; i++) {
            let d = map3TreeData[i];
            dummy.position.set(d.px, d.py, d.pz);
            dummy.scale.set(d.sx, d.sy, d.sz);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.updateMatrix();
            map3TreeInstanced.setMatrixAt(i, dummy.matrix);
        }
        map3Group.add(map3TreeInstanced);
    }
}

    
    let tunnelGeo = new THREE.BoxGeometry(60, 40, 2200);
    let tunnelMat = new THREE.MeshLambertMaterial({ color: 0x111111 }); // Dark tunnel
    let tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnelMesh.position.set(1800, 75, -30000);
    tunnelMesh.rotation.x = -Math.atan2(150, 2000); // tilt up towards -Z
    map2Group.add(tunnelMesh);
    
    // Add a light inside the tunnel entrance
    
    // Cave Entrance Rocks
    let rockGeo = new THREE.DodecahedronGeometry(30);
    let rockMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    for(let i=0; i<15; i++) {
        let rock = new THREE.Mesh(rockGeo, rockMat);
        let angle = (i / 15) * Math.PI; // Arch over the entrance
        let radius = 40 + Math.random() * 10;
        rock.position.set(
            1800 + Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            -31050 + Math.random() * 20
        );
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.scale.set(1 + Math.random(), 1 + Math.random(), 1 + Math.random());
        map2Group.add(rock);
    }

    
    // Giant mountain for the tunnel
    let giantMountGeo = new THREE.ConeGeometry(2500, 3000, 16);
    let giantMountMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    let giantMount = new THREE.Mesh(giantMountGeo, giantMountMat);
    giantMount.position.set(1800, 1500, -29000);
    map2Group.add(giantMount);

    // Connecting Highway to Shore
    let shoreRoadGeo = new THREE.PlaneGeometry(30, 4000);
    let shoreRoadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    let shoreRoad = new THREE.Mesh(shoreRoadGeo, shoreRoadMat);
    shoreRoad.rotation.x = -Math.PI / 2;
    shoreRoad.position.set(1800, 0.2, -33000);
    map2Group.add(shoreRoad);


    let tunnelLight = new THREE.PointLight(0xffaa00, 1, 300);
    tunnelLight.position.set(1800, 20, -31000);
    map2Group.add(tunnelLight);

    let m2HospGeo = new THREE.BoxGeometry(200, 300, 200);
    let m2HospMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
    let map2Hospital = new THREE.Mesh(m2HospGeo, m2HospMat);
    map2Hospital.position.set(1800, 150, -29000);
    
    let m2CrossGeo1 = new THREE.BoxGeometry(20, 80, 205);
    let m2CrossGeo2 = new THREE.BoxGeometry(80, 20, 205);
    let m2CrossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let m2Cross1 = new THREE.Mesh(m2CrossGeo1, m2CrossMat);
    let m2Cross2 = new THREE.Mesh(m2CrossGeo2, m2CrossMat);
    m2Cross1.position.y = 100;
    m2Cross2.position.y = 100;
    map2Hospital.add(m2Cross1);
    map2Hospital.add(m2Cross2);
    map2Group.add(map2Hospital);
    hospitals.push({ mesh: map2Hospital, position: map2Hospital.position, name: "Mountain Hospital" });

    generateMap3();

function generateMap4() {
    // Huge Ocean
    const oceanWidth = 100000;
    const oceanLength = 100000;
    const oceanGeo = new THREE.PlaneGeometry(oceanWidth, oceanLength);
    const oceanMat = new THREE.MeshLambertMaterial({ 
        color: 0x001133, 
        transparent: false, 
        opacity: 1.0 
    });
    
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, 5, -85000); // 5 units above y=0 to slightly cover the green ground
    oceanMesh.receiveShadow = true;
    
    map4Group.add(oceanMesh);
}
generateMap4();

    weatherSystem = new WeatherSystem({
        get scene() { return scene; },
        get camera() { return camera; },
        get planeGroup() { return planeGroup; },
        get gameState() { return gameState; }
    });
    weatherSystem.init();

// Create InstancedMesh for Trees
if (treeData.length > 0) {
    let treeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, treeData.length);
    treeInstanced.castShadow = true;
    treeInstanced.receiveShadow = true;
    let dummy = new THREE.Object3D();
    for (let i = 0; i < treeData.length; i++) {
        let d = treeData[i];
        dummy.position.set(d.px, d.py, d.pz);
        dummy.scale.set(d.sx, d.sy, d.sz);
        dummy.updateMatrix();
        treeInstanced.setMatrixAt(i, dummy.matrix);
    }
    map1Group.add(treeInstanced);
}


// Create Hospital Building
function createHospital() {
    let hospGroup = new THREE.Group();
    
    // Main building
    let mainHospMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White building
    let mainHosp = new THREE.Mesh(new THREE.BoxGeometry(60, 80, 60), mainHospMat);
    mainHosp.position.y = 40;
    mainHosp.castShadow = true;
    // NOT added to hospGroup, will be added to scene directly
    
    // Red Cross symbols
    let crossMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
    let vCross1 = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 2), crossMat);
    vCross1.position.set(0, 60, 30.1);
    let hCross1 = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 2), crossMat);
    hCross1.position.set(0, 60, 30.1);
    
    // Front cross
    let vCross2 = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 2), crossMat);
    vCross2.position.set(0, 60, -30.1);
    let hCross2 = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 2), crossMat);
    hCross2.position.set(0, 60, -30.1);
    
    // Roof cross
    let roofCross1 = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 40), crossMat);
    roofCross1.position.set(0, 80.1, 0);
    let roofCross2 = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 10), crossMat);
    roofCross2.position.set(0, 80.1, 0);
    
    hospGroup.add(vCross1);
    hospGroup.add(hCross1);
    hospGroup.add(vCross2);
    hospGroup.add(hCross2);
    hospGroup.add(roofCross1);
    hospGroup.add(roofCross2);
    
    // Place it at the corner of intersection x=4500, z=-1800
    hospGroup.position.set(4600, 0, -1700);
    map1Group.add(hospGroup);
    
    // Make main building accessible as a solid structure in the buildings array
    // Add it directly to scene so absolute positioning works for collision detection
    mainHosp.position.copy(hospGroup.position);
    mainHosp.position.y += 40; // absolute position
    mainHosp.userData = { isTree: false, height: 80, originalScale: mainHosp.scale.clone(), isHospital: true };
    map1Group.add(mainHosp);
    buildings.push(mainHosp);
    hospitalBuilding = mainHosp;
}
createHospital();

let ambulanceDepot;
function createAmbulanceDepot() {
    let depotGroup = new THREE.Group();
    let depotMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 }); // Grey
    let depotRoofMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    let doorMat = new THREE.MeshLambertMaterial({ color: 0x34495e });
    
    let mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), depotMat);
    mainBuilding.position.y = 10;
    mainBuilding.castShadow = true;
    // NOT added to depotGroup, will be added directly to scene for collision
    
    let roof = new THREE.Mesh(new THREE.BoxGeometry(42, 2, 42), depotRoofMat);
    roof.position.y = 21;
    depotGroup.add(roof);
    
    // Garage doors (facing +Z)
    for (let i = -1; i <= 1; i += 2) {
        let door = new THREE.Mesh(new THREE.BoxGeometry(12, 14, 2), doorMat);
        door.position.set(i * 10, 7, 20);
        depotGroup.add(door);
    }
    
    // Place it near the hospital on the grass
    depotGroup.position.set(4600, 0, -1600);
    map1Group.add(depotGroup);
    ambulanceDepot = depotGroup;
    
    // Solid building
    mainBuilding.position.copy(depotGroup.position);
    mainBuilding.position.y += 10;
    mainBuilding.userData = { isTree: false, height: 20, originalScale: mainBuilding.scale.clone() };
    map1Group.add(mainBuilding);
    buildings.push(mainBuilding);
}
createAmbulanceDepot();




// Spawn Civilian Cars


// Create Ambulance (Ultra Realistic)


// Function to get grid-based waypoints for the ambulance
// Function to get grid-based waypoints for the ambulance
function getHospitalWaypoints(startPos, endPos) {
    let wps = [];
    wps.push(startPos.clone());
    
    // Snap to nearest Z road first
    let currentX = startPos.x;
    let currentZ = Math.round(startPos.z / blockSize) * blockSize;
    wps.push(new THREE.Vector3(currentX, 0, currentZ));
    
    let targetX = Math.round(endPos.x / blockSize) * blockSize;
    let targetZ = Math.round(endPos.z / blockSize) * blockSize;
    
    let riverX = 2475;
    
    // Check if we need to cross the river
    if ((currentX < riverX && targetX > riverX) || (currentX > riverX && targetX < riverX)) {
        // Find nearest crossing
        let allCrossings = [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9].map(z => z * blockSize);
        let bestCrossing = allCrossings[0];
        let minDist = Infinity;
        
        for (let cz of allCrossings) {
            // Distance from start to crossing + crossing to end
            let dist = Math.abs(currentZ - cz) + Math.abs(targetZ - cz);
            if (dist < minDist) {
                minDist = dist;
                bestCrossing = cz;
            }
        }
        
        // Go to crossing Z
        wps.push(new THREE.Vector3(currentX, 0, bestCrossing));
        // Cross the river
        wps.push(new THREE.Vector3(targetX, 0, bestCrossing));
        // Go to target Z
        wps.push(new THREE.Vector3(targetX, 0, targetZ));
    } else {
        // No river crossing needed
        wps.push(new THREE.Vector3(targetX, 0, currentZ));
        wps.push(new THREE.Vector3(targetX, 0, targetZ));
    }
    
    wps.push(endPos.clone());
    return wps;
}

const carColors = [0x3498db, 0x2ecc71, 0xffffff, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22];
for (let i = 0; i < 600; i++) {
    let color = carColors[Math.floor(Math.random() * carColors.length)];
    let car = VehicleBuilder.createCivCar(color);
    
    // Pick random road
    let r = roads[Math.floor(Math.random() * roads.length)];
    let dir = Math.random() > 0.5 ? 1 : -1;
    
    if (r.type === 'h') {
        let rx = (Math.random() - 0.5) * 21600;
        if (Math.abs(rx) < 200) rx = (rx > 0) ? 200 : -200; // Avoid middle gap
        car.position.set(rx, 0, r.z + dir * 15);
        car.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    } else {
        car.position.set(r.x + dir * 15, 0, (Math.random() - 0.5) * 21600);
        car.rotation.y = dir === 1 ? 0 : Math.PI;
    }
    map1Group.add(car);
    civCars.push({ mesh: car, speed: 0.8 + Math.random() * 0.8, wheels: car.userData.wheels, bounds: { minX: -10800, maxX: 10800, minZ: -10800, maxZ: 10800 } });
}

// Spawn 4 Village CivCars
    for (let i = 0; i < 4; i++) {
        let color = carColors[Math.floor(Math.random() * carColors.length)];
        let car = VehicleBuilder.createCivCar(color);
        car.position.set((Math.random() - 0.5) * 1000, 0, 20000 + (Math.random() - 0.5) * 1000);
        car.rotation.y = Math.random() * Math.PI * 2;
        map3Group.add(car);
        civCars.push({ mesh: car, speed: 0.8 + Math.random() * 0.8, wheels: car.userData.wheels, bounds: { minX: -1000, maxX: 1000, minZ: 19000, maxZ: 21000 } });
    }
    
    // Spawn 2 Highway CivCars
    for (let i = 0; i < 2; i++) {
        let color = carColors[Math.floor(Math.random() * carColors.length)];
        let car = VehicleBuilder.createCivCar(color);
        let dir = (i === 0) ? 1 : -1;
        car.position.set(dir * 15, 0, 15000 + (Math.random() - 0.5) * 4000);
        car.rotation.y = dir === 1 ? 0 : Math.PI; // Go along Z
        map3Group.add(car);
        civCars.push({ mesh: car, speed: 1.5 + Math.random() * 0.5, wheels: car.userData.wheels, bounds: { minX: -50, maxX: 50, minZ: 10800, maxZ: 20000 } });
    }
    
    // Spawn Pedestrians
const shirtColors = [0x3498db, 0xe74c3c, 0x2ecc71, 0x9b59b6, 0xffffff];
const pantsColors = [0x2c3e50, 0x34495e, 0x7f8c8d];
for (let i = 0; i < 1200; i++) {
    let shirt = shirtColors[Math.floor(Math.random() * shirtColors.length)];
    let pants = pantsColors[Math.floor(Math.random() * pantsColors.length)];
    let ped = createHumanoid(shirt, pants, null, false); // No extinguisher
    
    // Random position in city
    let px = (Math.random() - 0.5) * 21600;
    let pz = (Math.random() - 0.5) * 21600;
    // Don't spawn on runway
    if (Math.abs(px) < 100 && pz > -1000 && pz < 1000) px += 200;
    
    ped.position.set(px, 0, pz);
    ped.rotation.y = Math.random() * Math.PI * 2;
    map1Group.add(ped);
    pedestrians.push({ bounds: { minX: -10800, maxX: 10800, minZ: -10800, maxZ: 10800 },
        mesh: ped,
        leftArm: ped.userData.leftArm,
        rightArm: ped.userData.rightArm,
        leftLeg: ped.userData.leftLeg,
        rightLeg: ped.userData.rightLeg,
        legTime: Math.random() * 5,
        speed: 0.05 + Math.random() * 0.1
    });
}

// Add Dense Forest Outside City
const forestTreeCount = 150000;
const forestInstanced = new THREE.InstancedMesh(treeGeo, treeMat, forestTreeCount);
forestInstanced.castShadow = true;
forestInstanced.receiveShadow = true;

const dummy = new THREE.Object3D();
let spawned = 0;
while (spawned < forestTreeCount) {
    let tx = (Math.random() - 0.5) * 50000;
    let tz = (Math.random() - 0.5) * 50000;
    
    // Avoid city area (21600x21600)
    if (Math.abs(tx) < 11000 && Math.abs(tz) < 11000) continue; 
    // Avoid runway area expanding out
    if (Math.abs(tx) < 300 && tz < 5000 && tz > -6000) continue; 
    
    dummy.position.set(tx, 10, tz);
    let scale = 0.5 + Math.random() * 1.5;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    forestInstanced.setMatrixAt(spawned, dummy.matrix);
    spawned++;
}
scene.add(forestInstanced);

let aiPlanes = [];
let buildingFires = [];

for (let i = 0; i < 15; i++) {
    let grp = new THREE.Group();
    let body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 15, 12), new THREE.MeshLambertMaterial({ color: 0xecf0f1 }));
    body.rotation.x = Math.PI / 2;
    grp.add(body);
    let wings = new THREE.Mesh(new THREE.BoxGeometry(25, 0.4, 3), new THREE.MeshLambertMaterial({ color: 0xbdc3c7 }));
    grp.add(wings);
    let tail = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 2), new THREE.MeshLambertMaterial({ color: 0xbdc3c7 }));
    tail.position.z = 6;
    grp.add(tail);
    let fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 2), new THREE.MeshLambertMaterial({ color: 0xe74c3c }));
    fin.position.set(0, 1.5, 6);
    grp.add(fin);
    
    grp.position.set((Math.random() - 0.5) * 21600, 1000 + Math.random() * 3000, (Math.random() - 0.5) * 21600);
    grp.rotation.y = Math.random() * Math.PI * 2;
    scene.add(grp);
    aiPlanes.push({ mesh: grp, speed: 2 + Math.random() * 2 });
}

// 20 planes exactly at 2000 feet over the city
for (let i = 0; i < 20; i++) {
    let grp = new THREE.Group();
    let body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 15, 12), new THREE.MeshLambertMaterial({ color: 0x3498db })); // blue body
    body.rotation.x = Math.PI / 2;
    grp.add(body);
    let wings = new THREE.Mesh(new THREE.BoxGeometry(25, 0.4, 3), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    grp.add(wings);
    let tail = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 2), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    tail.position.z = 6;
    grp.add(tail);
    let fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 2), new THREE.MeshLambertMaterial({ color: 0x2ecc71 })); // green tail
    fin.position.set(0, 1.5, 6);
    grp.add(fin);
    
    // Spawn tightly within the city bounds (-10800 to 10800) at exactly 2000 height
    grp.position.set((Math.random() - 0.5) * 21600, 2000, (Math.random() - 0.5) * 21600);
    grp.rotation.y = Math.random() * Math.PI * 2;
    scene.add(grp);
    aiPlanes.push({ mesh: grp, speed: 1.5 + Math.random() * 1.5 });
}

const planeGroup = new THREE.Group();
scene.add(planeGroup);

let landingGearGroup = new THREE.Group();

let MAX_THROTTLE = 100;
let THROTTLE_RATE = 1.0;
let MAX_SPEED_CAP = 25.0;
let BASE_LIFT = 0.01;
let MANEUVER_MULTIPLIER = 1.0;
let currentPlaneType = 'cessna';
let STALL_SPEED = 25;
let LOW_SPEED_ALARM = 40;

// Firefighters and Trucks
let firefighters = [];
let investigators = [];
let crashResponseState = 'none';

let waterCrash = false;
let lifeRafts = [];
let ambulanceBoats = [];
let crashDebris: any[] = [];
let cameraShake = 0;
let smokeParticles = [];
let waterSplashes = [];
let helicopters = [];
let shoreZ = -35000;
let waterRescuePatients = 0;
let rescuedWaterPatients = 0;

function startWaterRescueMission(totalCount) {
    const hosp = document.getElementById('hospital-choice');
    if (hosp) hosp.style.display = 'none';
    const rBtn = document.getElementById('restart-btn');
    if (rBtn) rBtn.style.display = 'none';
    const rUi = document.getElementById('rescue-mission-ui');
    if (rUi) rUi.style.display = 'block';
    
    playerMode = true;
    playerMesh.visible = true; 
    playerVelocity.set(0, 0, 0);
    
    totalPatients = totalCount;
    rescuedPatients = 0;
    const rCount = document.getElementById('rescue-counter');
    if (rCount) rCount.innerText = rescuedPatients + ' / ' + totalPatients;
}
 // 'none', 'firefighting', 'investigating'
let firetrucks = [];
let HAS_RETRACTABLE_GEAR = true;
let CRASH_SCALE = 1.0;

// Ultra-realistic fire texture using radial gradient
function createFireTexture() {
    let canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    let ctx = canvas.getContext('2d');
    
    let gradient = ctx.createRadialGradient(32, 48, 0, 32, 48, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Bright hot core
    gradient.addColorStop(0.2, 'rgba(255, 200, 0, 1)'); // Yellow
    gradient.addColorStop(0.4, 'rgba(255, 50, 0, 0.8)'); // Orange-Red
    gradient.addColorStop(0.8, 'rgba(30, 0, 0, 0.4)'); // Dark smoke edge
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent outer
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}
const globalFireTexture = createFireTexture();
const globalFireMat = new THREE.SpriteMaterial({ 
    map: globalFireTexture, 
    color: 0xffffff, 
    transparent: true, 
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

function createAirlinerTexture() {
    let canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    let ctx = canvas.getContext('2d');
    
    // Base white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 512);
    
    // Panel lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    for(let i = 0; i < 1024; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
    }
    
    // Blue stripe along the side
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(0, 220, 1024, 60);
    
    // Windows
    ctx.fillStyle = '#111111';
    for(let i = 40; i < 980; i += 32) {
        if(i > 400 && i < 600) continue; // Wing gap
        ctx.fillRect(i, 235, 16, 24);
    }
    
    // Doors
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(30, 210, 25, 80);
    ctx.fillRect(380, 210, 25, 80);
    ctx.fillRect(620, 210, 25, 80);
    ctx.fillRect(960, 210, 25, 80);
    
    let tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}
const globalAirlinerTexture = createAirlinerTexture();
function buildPlane(type) {
    while(planeGroup.children.length > 0){ 
        planeGroup.remove(planeGroup.children[0]); 
    }
    landingGearGroup = new THREE.Group();
    
    currentPlaneType = type;
    
    if (type && type.startsWith('helicopter_')) {
        vehicleType = 'helicopter';
        helicopterType = type.replace('helicopter_', '');
        
        let heli = VehicleBuilder.createHelicopter(helicopterType);
        
        // Adjust helicopter position so it sits properly
        heli.position.y = -2;
        
        planeGroup.add(heli);
        planeGroup.add(landingGearGroup);
        
        HAS_RETRACTABLE_GEAR = false;
        MAX_SPEED_CAP = 150;
        MAX_THROTTLE = 100;
        THROTTLE_RATE = 2.0;
        wingSpanX = 0;
        wingOffsetZ = 0;
        
        // Save references for animation
        if (heli.userData.rotor) window.heliRotor = heli.userData.rotor;
        if (heli.userData.tailRotor) window.heliTailRotor = heli.userData.tailRotor;
        
        return;
    }
    
    vehicleType = 'airplane';
    HAS_RETRACTABLE_GEAR = false; // Default to false, explicitly enabled for complex planes
    gearDown = true; // Ensure gear is down upon spawning
    
    if (type === 'airliner') {
        MAX_THROTTLE = 100;
        THROTTLE_RATE = 1.0;
        MAX_SPEED_CAP = 25.0; // 200 knots
        BASE_LIFT = 0.01;
        MANEUVER_MULTIPLIER = 1.0;
        wingSpanX = 15;
        wingOffsetZ = -2;
        STALL_SPEED = 25;
        LOW_SPEED_ALARM = 50;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 3.0;
        
        let whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff , metalness: 0.2, roughness: 0.4 });
        let blueMat = new THREE.MeshStandardMaterial({ color: 0x2980b9 , metalness: 0.2, roughness: 0.4 });
        let windowMat = new THREE.MeshStandardMaterial({ color: 0x111111 , metalness: 0.2, roughness: 0.4 });
        let metalMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6 , metalness: 0.2, roughness: 0.4 });
        
        // Main fuselage
        const bodyGeo = new THREE.CylinderGeometry(2, 2, 16, 32);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(bodyGeo, whiteMat);
        bodyMesh.position.z = -1;
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);
        
        // Nose (Tapered)
        const noseGeo = new THREE.SphereGeometry(2, 32, 16);
        noseGeo.scale(1, 1, 1.8);
        const nose = new THREE.Mesh(noseGeo, whiteMat);
        nose.position.z = -9;
        planeGroup.add(nose);
        
        // Tail section (Tapered)
        const tailBodyGeo = new THREE.CylinderGeometry(2, 0.5, 6, 32);
        tailBodyGeo.rotateX(Math.PI / 2);
        const tailBody = new THREE.Mesh(tailBodyGeo, whiteMat);
        tailBody.position.z = 10;
        planeGroup.add(tailBody);
        
        // Cockpit windows
        const cockpitGeo = new THREE.BoxGeometry(2.8, 0.8, 1.5);
        const cockpit = new THREE.Mesh(cockpitGeo, windowMat);
        cockpit.position.set(0, 1.2, -10.5);
        cockpit.rotation.x = Math.PI / 8;
        planeGroup.add(cockpit);
        
        // Passenger windows
        for (let z = -6; z <= 6; z += 1.5) {
            let winL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), windowMat);
            winL.position.set(-1.95, 0.5, z);
            planeGroup.add(winL);
            let winR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), windowMat);
            winR.position.set(1.95, 0.5, z);
            planeGroup.add(winR);
        }
        
        // Livery (Stripe)
        const stripeGeo = new THREE.CylinderGeometry(2.02, 2.02, 16, 32);
        stripeGeo.rotateX(Math.PI / 2);
        // Only take a slice of the cylinder for the stripe (scale Y down)
        stripeGeo.scale(1, 0.15, 1);
        const stripe = new THREE.Mesh(stripeGeo, blueMat);
        stripe.position.set(0, -0.2, -1);
        planeGroup.add(stripe);

        // Wings
        const wingGeo = new THREE.BoxGeometry(16, 0.4, 6);
        
        const wingL = new THREE.Mesh(wingGeo, metalMat);
        wingL.position.set(7.5, -0.5, 0);
        wingL.rotation.y = -Math.PI / 10;
        wingL.castShadow = true;
        planeGroup.add(wingL);
        
        const wingR = new THREE.Mesh(wingGeo, metalMat);
        wingR.position.set(-7.5, -0.5, 0);
        wingR.rotation.y = Math.PI / 10;
        wingR.castShadow = true;
        planeGroup.add(wingR);
        
        // Winglets
        const wingletGeo = new THREE.BoxGeometry(0.2, 2, 2);
        const wingletL = new THREE.Mesh(wingletGeo, blueMat);
        wingletL.position.set(15, 0.5, 2.5);
        planeGroup.add(wingletL);
        const wingletR = new THREE.Mesh(wingletGeo, blueMat);
        wingletR.position.set(-15, 0.5, 2.5);
        planeGroup.add(wingletR);
        
        // Horizontal stabilizers
        const tailWingGeo = new THREE.BoxGeometry(7, 0.3, 3);
        const tailWingL = new THREE.Mesh(tailWingGeo, metalMat);
        tailWingL.position.set(3, 0.5, 11);
        tailWingL.rotation.y = -Math.PI / 8;
        planeGroup.add(tailWingL);
        
        const tailWingR = new THREE.Mesh(tailWingGeo, metalMat);
        tailWingR.position.set(-3, 0.5, 11);
        tailWingR.rotation.y = Math.PI / 8;
        planeGroup.add(tailWingR);
        
        // Vertical stabilizer
        const finGeo2 = new THREE.BoxGeometry(0.4, 5, 4);
        const finMesh = new THREE.Mesh(finGeo2, blueMat);
        finMesh.position.set(0, 2.5, 11.5);
        finMesh.rotation.x = -Math.PI / 12; // swept back
        planeGroup.add(finMesh);
        
        // Detailed Engines
        for (let x of [-6, 6]) {
            let engGroup = new THREE.Group();
            
            // Pylon
            let pylon = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 2), metalMat);
            pylon.position.set(0, 1, 0);
            engGroup.add(pylon);
            
            // Engine pod
            let pod = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4, 16), metalMat);
            pod.rotation.x = Math.PI / 2;
            engGroup.add(pod);
            
            // Engine Inlet (Black hole)
            let inlet = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.2, 16), new THREE.MeshBasicMaterial({color: 0x000000}));
            inlet.rotation.x = Math.PI / 2;
            inlet.position.z = -2.01;
            engGroup.add(inlet);
            
            // Engine Exhaust cone
            let exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 16), metalMat);
            exhaust.rotation.x = -Math.PI / 2;
            exhaust.position.z = 2.4;
            engGroup.add(exhaust);
            
            engGroup.position.set(x, -1.8, -1);
            planeGroup.add(engGroup);
        }
        
        // Navigation Lights
        let redLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({color: 0xff0000}));
        redLight.position.set(-15, -0.5, 0);
        planeGroup.add(redLight);
        let greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({color: 0x00ff00}));
        greenLight.position.set(15, -0.5, 0);
        planeGroup.add(greenLight);
        
    } else if (type === 'fighter') {
        MAX_THROTTLE = 200;
        THROTTLE_RATE = 3.0;
        MAX_SPEED_CAP = 60.0; // 600 knots
        BASE_LIFT = 0.002; // requires more speed
        MANEUVER_MULTIPLIER = 3.0;
        wingSpanX = 8;
        wingOffsetZ = 2;
        STALL_SPEED = 120;
        LOW_SPEED_ALARM = 180;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 1.5;
        
        // Sleek body
        const bodyGeo = new THREE.CylinderGeometry(0.5, 1.5, 18, 16);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x34495e , metalness: 0.2, roughness: 0.4 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);
        
        // Nose cone
        const noseGeo = new THREE.ConeGeometry(0.5, 4, 16);
        noseGeo.rotateX(Math.PI / 2);
        const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
        noseMesh.position.set(0, 0, -11);
        planeGroup.add(noseMesh);

        const cockpitGeo = new THREE.BoxGeometry(1, 1, 4);
        const cockpitMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f , metalness: 0.2, roughness: 0.4 });
        const cockpitMesh = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpitMesh.position.set(0, 1, -2);
        planeGroup.add(cockpitMesh);

        // Swept wings (use a polygon or just angled boxes)
        const wingGeo = new THREE.BoxGeometry(16, 0.2, 5);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 , metalness: 0.2, roughness: 0.4 });
        const wingMesh = new THREE.Mesh(wingGeo, wingMat);
        wingMesh.position.set(0, 0, 2);
        wingMesh.castShadow = true;
        planeGroup.add(wingMesh);
        
        const finGeo = new THREE.BoxGeometry(0.2, 3, 3);
        const finMesh = new THREE.Mesh(finGeo, wingMat);
        finMesh.position.set(0, 1.5, 7);
        planeGroup.add(finMesh);
        
    } else if (type === 'cargo') {
        MAX_THROTTLE = 150;
        THROTTLE_RATE = 0.5;
        MAX_SPEED_CAP = 18.0; 
        BASE_LIFT = 0.015; 
        MANEUVER_MULTIPLIER = 0.4; // Very sluggish
        wingSpanX = 25;
        wingOffsetZ = -2;
        STALL_SPEED = 30;
        LOW_SPEED_ALARM = 45;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 5.0;
        
        const bodyGeo = new THREE.BoxGeometry(4, 4, 25);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d , metalness: 0.2, roughness: 0.4 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);

        const cockpitGeo = new THREE.BoxGeometry(4, 2, 4);
        const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x3498db , metalness: 0.2, roughness: 0.4 });
        const cockpitMesh = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpitMesh.position.set(0, 2.5, -10);
        planeGroup.add(cockpitMesh);

        // High huge wings
        const wingGeo = new THREE.BoxGeometry(50, 0.8, 6);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6 , metalness: 0.2, roughness: 0.4 });
        const wingMesh = new THREE.Mesh(wingGeo, wingMat);
        wingMesh.position.set(0, 2.2, -2);
        wingMesh.castShadow = true;
        planeGroup.add(wingMesh);
        
        // Huge Tail
        const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(15, 0.5, 4), wingMat);
        tailMesh.position.set(0, 1.5, 10);
        planeGroup.add(tailMesh);
        const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 4), wingMat);
        finMesh.position.set(0, 4, 10);
        planeGroup.add(finMesh);

    } else if (type === 'a380') {
        MAX_THROTTLE = 180;
        THROTTLE_RATE = 0.5;
        MAX_SPEED_CAP = 30.0;
        BASE_LIFT = 0.005; 
        MANEUVER_MULTIPLIER = 0.4;
        wingSpanX = 25;
        wingOffsetZ = 0;
        STALL_SPEED = 40;
        LOW_SPEED_ALARM = 60;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 5.0;
        
        let whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff , metalness: 0.2, roughness: 0.4 });
        let darkBlueMat = new THREE.MeshStandardMaterial({ color: 0x192a56 , metalness: 0.2, roughness: 0.4 });
        let windowMat = new THREE.MeshStandardMaterial({ color: 0x111111 , metalness: 0.2, roughness: 0.4 });
        let metalMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1 , metalness: 0.2, roughness: 0.4 });

        // Double decker fuselage
        const bodyGeo = new THREE.CylinderGeometry(3.5, 3.5, 35, 32);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(bodyGeo, whiteMat);
        bodyMesh.position.y = 1;
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);
        
        // Nose cone
        const noseGeo = new THREE.SphereGeometry(3.5, 32, 16);
        noseGeo.scale(1, 0.9, 1.5);
        const nose = new THREE.Mesh(noseGeo, whiteMat);
        nose.position.set(0, 1.35, -17.5);
        planeGroup.add(nose);
        
        // Tail cone
        const tailGeo = new THREE.CylinderGeometry(3.5, 0.5, 10, 32);
        tailGeo.rotateX(Math.PI / 2);
        const tail = new THREE.Mesh(tailGeo, whiteMat);
        tail.position.set(0, 1, 22);
        planeGroup.add(tail);

        // Cockpit window
        const cockpitGeo = new THREE.BoxGeometry(4, 1.2, 2);
        const cockpit = new THREE.Mesh(cockpitGeo, windowMat);
        cockpit.position.set(0, 1.2, -19.5);
        cockpit.rotation.x = Math.PI / 6;
        planeGroup.add(cockpit);
        
        // Passenger windows (Lower & Upper Deck)
        for (let z = -14; z <= 12; z += 1.5) {
            // Lower
            let winL1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), windowMat);
            winL1.position.set(-3.45, 0, z);
            planeGroup.add(winL1);
            let winR1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), windowMat);
            winR1.position.set(3.45, 0, z);
            planeGroup.add(winR1);
            
            // Upper
            if (z > -12 && z < 10) {
                let winL2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.4), windowMat);
                winL2.position.set(-2.8, 3, z);
                planeGroup.add(winL2);
                let winR2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.4), windowMat);
                winR2.position.set(2.8, 3, z);
                planeGroup.add(winR2);
            }
        }
        
        // Livery (Stripe)
        const stripeGeo = new THREE.CylinderGeometry(3.52, 3.52, 35, 32);
        stripeGeo.rotateX(Math.PI / 2);
        stripeGeo.scale(1, 0.1, 1);
        const stripe = new THREE.Mesh(stripeGeo, darkBlueMat);
        stripe.position.set(0, -0.5, 0);
        planeGroup.add(stripe);

        // Wings
        const wingGeo = new THREE.BoxGeometry(26, 0.6, 9);
        const wingL = new THREE.Mesh(wingGeo, metalMat);
        wingL.position.set(12.5, -1, 1);
        wingL.rotation.y = -Math.PI / 8;
        wingL.castShadow = true;
        planeGroup.add(wingL);
        
        const wingR = new THREE.Mesh(wingGeo, metalMat);
        wingR.position.set(-12.5, -1, 1);
        wingR.rotation.y = Math.PI / 8;
        wingR.castShadow = true;
        planeGroup.add(wingR);
        
        // Winglets
        const wingletGeo = new THREE.BoxGeometry(0.3, 3, 3);
        const wingletL = new THREE.Mesh(wingletGeo, darkBlueMat);
        wingletL.position.set(24.5, 0.5, 5.5);
        planeGroup.add(wingletL);
        const wingletR = new THREE.Mesh(wingletGeo, darkBlueMat);
        wingletR.position.set(-24.5, 0.5, 5.5);
        planeGroup.add(wingletR);

        // 4 Engines
        for (let x of [-15, -8, 8, 15]) {
            let engGroup = new THREE.Group();
            let pylon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.5, 3), metalMat);
            pylon.position.set(0, 1.5, 0);
            engGroup.add(pylon);
            let pod = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6, 24), metalMat);
            pod.rotation.x = Math.PI / 2;
            engGroup.add(pod);
            let inlet = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 24), new THREE.MeshBasicMaterial({color: 0x000000}));
            inlet.rotation.x = Math.PI / 2;
            inlet.position.z = -3.01;
            engGroup.add(inlet);
            let exhaust = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.5, 24), metalMat);
            exhaust.rotation.x = -Math.PI / 2;
            exhaust.position.z = 3.75;
            engGroup.add(exhaust);
            
            engGroup.position.set(x, -2.5, 1);
            planeGroup.add(engGroup);
        }

        // Horizontal stabilizers
        const tailWingGeo = new THREE.BoxGeometry(12, 0.4, 4);
        const tailWingL = new THREE.Mesh(tailWingGeo, metalMat);
        tailWingL.position.set(5, 1, 22);
        tailWingL.rotation.y = -Math.PI / 6;
        planeGroup.add(tailWingL);
        
        const tailWingR = new THREE.Mesh(tailWingGeo, metalMat);
        tailWingR.position.set(-5, 1, 22);
        tailWingR.rotation.y = Math.PI / 6;
        planeGroup.add(tailWingR);

        // Vertical stabilizer
        const finGeo = new THREE.BoxGeometry(0.6, 9, 6);
        const finMesh = new THREE.Mesh(finGeo, darkBlueMat);
        finMesh.position.set(0, 4.5, 23);
        finMesh.rotation.x = -Math.PI / 8; // Swept back
        planeGroup.add(finMesh);
        
        let redLight = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({color: 0xff0000}));
        redLight.position.set(-25, -1, 3);
        planeGroup.add(redLight);
        let greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({color: 0x00ff00}));
        greenLight.position.set(25, -1, 3);
        planeGroup.add(greenLight);

    } else if (type === 'b747') {
        MAX_THROTTLE = 160;
        THROTTLE_RATE = 0.6;
        MAX_SPEED_CAP = 32.0;
        BASE_LIFT = 0.006; 
        MANEUVER_MULTIPLIER = 0.5;
        wingSpanX = 22;
        wingOffsetZ = -2;
        STALL_SPEED = 38;
        LOW_SPEED_ALARM = 58;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 4.5;
        
        let whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff , metalness: 0.2, roughness: 0.4 });
        let redMat = new THREE.MeshStandardMaterial({ color: 0xc0392b , metalness: 0.2, roughness: 0.4 });
        let windowMat = new THREE.MeshStandardMaterial({ color: 0x111111 , metalness: 0.2, roughness: 0.4 });
        let metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7 , metalness: 0.2, roughness: 0.4 });

        // Main body
        const bodyGeo = new THREE.CylinderGeometry(3, 3, 38, 32);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(bodyGeo, whiteMat);
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);
        
        // Nose
        const noseGeo = new THREE.SphereGeometry(3, 32, 16);
        noseGeo.scale(1, 0.9, 1.5);
        const nose = new THREE.Mesh(noseGeo, whiteMat);
        nose.position.set(0, 0.3, -19);
        planeGroup.add(nose);
        
        // Tail
        const tailGeo = new THREE.CylinderGeometry(3, 0.5, 12, 32);
        tailGeo.rotateX(Math.PI / 2);
        const tail = new THREE.Mesh(tailGeo, whiteMat);
        tail.position.set(0, 0, 25);
        planeGroup.add(tail);
        
        // Iconic 747 upper deck hump
        const humpGeo = new THREE.CylinderGeometry(2, 2.8, 16, 32);
        humpGeo.rotateX(Math.PI / 2);
        const humpMesh = new THREE.Mesh(humpGeo, whiteMat);
        humpMesh.position.set(0, 1.5, -11);
        planeGroup.add(humpMesh);
        
        const humpFront = new THREE.SphereGeometry(2, 32, 16);
        humpFront.scale(1, 0.8, 1.5);
        const humpNose = new THREE.Mesh(humpFront, whiteMat);
        humpNose.position.set(0, 2.1, -19);
        planeGroup.add(humpNose);
        
        // Cockpit window on the hump
        const cockpitGeo = new THREE.BoxGeometry(2.5, 1, 1.5);
        const cockpit = new THREE.Mesh(cockpitGeo, windowMat);
        cockpit.position.set(0, 3.2, -19.5);
        cockpit.rotation.x = Math.PI / 8;
        planeGroup.add(cockpit);
        
        // Windows
        for (let z = -15; z <= 15; z += 1.5) {
            let winL1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), windowMat);
            winL1.position.set(-2.95, -0.2, z);
            planeGroup.add(winL1);
            let winR1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), windowMat);
            winR1.position.set(2.95, -0.2, z);
            planeGroup.add(winR1);
            
            // Upper deck windows
            if (z > -16 && z < -5) {
                let winL2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.4), windowMat);
                winL2.position.set(-1.8, 2.5, z);
                planeGroup.add(winL2);
                let winR2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.4), windowMat);
                winR2.position.set(1.8, 2.5, z);
                planeGroup.add(winR2);
            }
        }
        
        // Livery (Stripe)
        const stripeGeo = new THREE.CylinderGeometry(3.02, 3.02, 38, 32);
        stripeGeo.rotateX(Math.PI / 2);
        stripeGeo.scale(1, 0.1, 1);
        const stripe = new THREE.Mesh(stripeGeo, redMat);
        stripe.position.set(0, -1, 0);
        planeGroup.add(stripe);

        // Swept Wings
        const wingGeo = new THREE.BoxGeometry(23, 0.5, 8);
        const wingL = new THREE.Mesh(wingGeo, metalMat);
        wingL.position.set(11, -1.5, 2);
        wingL.rotation.y = -Math.PI / 8;
        wingL.castShadow = true;
        planeGroup.add(wingL);
        
        const wingR = new THREE.Mesh(wingGeo, metalMat);
        wingR.position.set(-11, -1.5, 2);
        wingR.rotation.y = Math.PI / 8;
        wingR.castShadow = true;
        planeGroup.add(wingR);
        
        // Winglets
        const wingletGeo = new THREE.BoxGeometry(0.3, 2.5, 2.5);
        const wingletL = new THREE.Mesh(wingletGeo, redMat);
        wingletL.position.set(22, 0, 6.5);
        planeGroup.add(wingletL);
        const wingletR = new THREE.Mesh(wingletGeo, redMat);
        wingletR.position.set(-22, 0, 6.5);
        planeGroup.add(wingletR);

        // 4 Engines
        for (let x of [-12, -6, 6, 12]) {
            let engGroup = new THREE.Group();
            let pylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 2.5), metalMat);
            pylon.position.set(0, 1.2, 0);
            engGroup.add(pylon);
            let pod = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 5, 24), metalMat);
            pod.rotation.x = Math.PI / 2;
            engGroup.add(pod);
            let inlet = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.2, 24), new THREE.MeshBasicMaterial({color: 0x000000}));
            inlet.rotation.x = Math.PI / 2;
            inlet.position.z = -2.51;
            engGroup.add(inlet);
            let exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 24), metalMat);
            exhaust.rotation.x = -Math.PI / 2;
            exhaust.position.z = 3.1;
            engGroup.add(exhaust);
            
            engGroup.position.set(x, -2.5, 3);
            planeGroup.add(engGroup);
        }

        // Horizontal stabilizers
        const tailWingGeo = new THREE.BoxGeometry(10, 0.4, 4);
        const tailWingL = new THREE.Mesh(tailWingGeo, metalMat);
        tailWingL.position.set(4, 0, 24);
        tailWingL.rotation.y = -Math.PI / 6;
        planeGroup.add(tailWingL);
        
        const tailWingR = new THREE.Mesh(tailWingGeo, metalMat);
        tailWingR.position.set(-4, 0, 24);
        tailWingR.rotation.y = Math.PI / 6;
        planeGroup.add(tailWingR);

        // Vertical stabilizer
        const finGeo = new THREE.BoxGeometry(0.6, 8, 5);
        const finMesh = new THREE.Mesh(finGeo, redMat);
        finMesh.position.set(0, 3.5, 25);
        finMesh.rotation.x = -Math.PI / 8; // Swept back
        planeGroup.add(finMesh);
        
        let redLight = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({color: 0xff0000}));
        redLight.position.set(-22, -1.5, 6);
        planeGroup.add(redLight);
        let greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({color: 0x00ff00}));
        greenLight.position.set(22, -1.5, 6);
        planeGroup.add(greenLight);

    } else if (type === 'f22') {
        MAX_THROTTLE = 250;
        THROTTLE_RATE = 2.0;
        MAX_SPEED_CAP = 45.0;
        BASE_LIFT = 0.015;
        MANEUVER_MULTIPLIER = 2.0;
        wingSpanX = 8;
        wingOffsetZ = 1;
        STALL_SPEED = 20;
        LOW_SPEED_ALARM = 35;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 1.5;
        
        let darkMat = new THREE.MeshStandardMaterial({ color: 0x333333 , metalness: 0.2, roughness: 0.4 });
        const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 16), darkMat);
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);
        const noseGeo = new THREE.ConeGeometry(1.25, 4, 4);
        noseGeo.rotateX(Math.PI/2);
        noseGeo.rotateZ(Math.PI/4);
        const nose = new THREE.Mesh(noseGeo, darkMat);
        nose.position.set(0, 0, -10);
        planeGroup.add(nose);
        const cockpitGeo = new THREE.BoxGeometry(1.2, 1, 3);
        const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x111111 , metalness: 0.2, roughness: 0.4 });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.8, -5);
        planeGroup.add(cockpit);
        
        // Delta Wings
        let wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(8, 4);
        wingShape.lineTo(0, 5);
        let extSettings = { depth: 0.2, bevelEnabled: false };
        let wingGeoL = new THREE.ExtrudeGeometry(wingShape, extSettings);
        wingGeoL.rotateX(Math.PI/2);
        let wingL = new THREE.Mesh(wingGeoL, darkMat);
        wingL.position.set(0, 0, 1);
        planeGroup.add(wingL);
        let wingGeoR = new THREE.ExtrudeGeometry(wingShape, extSettings);
        wingGeoR.rotateX(Math.PI/2);
        wingGeoR.rotateZ(Math.PI);
        let wingR = new THREE.Mesh(wingGeoR, darkMat);
        wingR.position.set(0, 0, 1);
        planeGroup.add(wingR);
        
        // Angled Tail Fins
        const finGeo = new THREE.BoxGeometry(0.2, 3, 3);
        let finL = new THREE.Mesh(finGeo, darkMat);
        finL.position.set(-1, 1.5, 6);
        finL.rotation.z = Math.PI / 8;
        planeGroup.add(finL);
        let finR = new THREE.Mesh(finGeo, darkMat);
        finR.position.set(1, 1.5, 6);
        finR.rotation.z = -Math.PI / 8;
        planeGroup.add(finR);

    } else if (type === 'concorde') {
        MAX_THROTTLE = 220;
        THROTTLE_RATE = 1.0;
        MAX_SPEED_CAP = 50.0;
        BASE_LIFT = 0.008;
        MANEUVER_MULTIPLIER = 0.6;
        wingSpanX = 12;
        wingOffsetZ = 2;
        STALL_SPEED = 30;
        LOW_SPEED_ALARM = 50;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 2.5;
        
        let whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff , metalness: 0.2, roughness: 0.4 });
        let blueMat = new THREE.MeshStandardMaterial({ color: 0x2980b9 , metalness: 0.2, roughness: 0.4 });
        let redMat = new THREE.MeshStandardMaterial({ color: 0xc0392b , metalness: 0.2, roughness: 0.4 });
        let windowMat = new THREE.MeshStandardMaterial({ color: 0x111111 , metalness: 0.2, roughness: 0.4 });
        let metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7 , metalness: 0.2, roughness: 0.4 });

        // Long slender body
        const bodyGeo = new THREE.CylinderGeometry(1.2, 1.2, 35, 32);
        bodyGeo.rotateX(Math.PI/2);
        const bodyMesh = new THREE.Mesh(bodyGeo, whiteMat);
        planeGroup.add(bodyMesh);
        
        // Droop snoot / Needle nose
        const noseGeo = new THREE.ConeGeometry(1.2, 14, 32);
        noseGeo.rotateX(Math.PI/2);
        const nose = new THREE.Mesh(noseGeo, whiteMat);
        nose.position.set(0, -0.15, -24);
        nose.rotation.x = -Math.PI / 32; // slight droop
        planeGroup.add(nose);
        
        // Tail cone
        const tailGeo = new THREE.CylinderGeometry(1.2, 0.2, 8, 32);
        tailGeo.rotateX(Math.PI / 2);
        const tail = new THREE.Mesh(tailGeo, whiteMat);
        tail.position.set(0, 0, 21.5);
        planeGroup.add(tail);

        // Cockpit window
        const cockpitGeo = new THREE.BoxGeometry(1.3, 0.4, 1.5);
        const cockpit = new THREE.Mesh(cockpitGeo, windowMat);
        cockpit.position.set(0, 0.6, -18);
        cockpit.rotation.x = Math.PI / 12;
        planeGroup.add(cockpit);

        // Very small passenger windows
        for (let z = -12; z <= 12; z += 1.0) {
            let winL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), windowMat);
            winL.position.set(-1.15, 0.2, z);
            planeGroup.add(winL);
            let winR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.3), windowMat);
            winR.position.set(1.15, 0.2, z);
            planeGroup.add(winR);
        }

        // Concorde Livery (Red and Blue stripes)
        const stripeGeo = new THREE.CylinderGeometry(1.22, 1.22, 35, 32);
        stripeGeo.rotateX(Math.PI / 2);
        stripeGeo.scale(1, 0.05, 1);
        const stripe1 = new THREE.Mesh(stripeGeo, redMat);
        stripe1.position.set(0, 0, 0);
        planeGroup.add(stripe1);
        const stripe2 = new THREE.Mesh(stripeGeo, blueMat);
        stripe2.position.set(0, -0.2, 0);
        planeGroup.add(stripe2);

        // Iconic Ogival Delta Wings (approximated with BoxGeometry)
        const wingGeo = new THREE.BoxGeometry(22, 0.4, 20);
        const wingL = new THREE.Mesh(wingGeo, whiteMat);
        wingL.position.set(11, -0.5, 5);
        wingL.rotation.y = -Math.PI / 12;
        wingL.castShadow = true;
        planeGroup.add(wingL);
        
        const wingR = new THREE.Mesh(wingGeo, whiteMat);
        wingR.position.set(-11, -0.5, 5);
        wingR.rotation.y = Math.PI / 12;
        wingR.castShadow = true;
        planeGroup.add(wingR);

        // 4 Underwing Engines (Boxy shape on Concorde)
        for (let x of [-6, -3.5, 3.5, 6]) {
            let engGroup = new THREE.Group();
            let pod = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 8), metalMat);
            engGroup.add(pod);
            let inlet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.2), new THREE.MeshBasicMaterial({color: 0x000000}));
            inlet.position.z = -4.01;
            engGroup.add(inlet);
            let exhaust = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.5), metalMat);
            exhaust.position.z = 4.75;
            engGroup.add(exhaust);
            
            engGroup.position.set(x, -1.2, 10);
            planeGroup.add(engGroup);
        }

        // Vertical stabilizer
        const finGeo = new THREE.BoxGeometry(0.4, 6, 8);
        const finMesh = new THREE.Mesh(finGeo, whiteMat);
        finMesh.position.set(0, 3, 17);
        finMesh.rotation.x = -Math.PI / 8; // Swept back
        planeGroup.add(finMesh);
        
        // Nav Lights
        let redLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({color: 0xff0000}));
        redLight.position.set(-12, -0.5, 12);
        planeGroup.add(redLight);
        let greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({color: 0x00ff00}));
        greenLight.position.set(12, -0.5, 12);
        planeGroup.add(greenLight);

    } else if (type === 'seaplane') {
        MAX_THROTTLE = 80;
        THROTTLE_RATE = 1.0;
        MAX_SPEED_CAP = 18.0;
        BASE_LIFT = 0.02;
        MANEUVER_MULTIPLIER = 1.2;
        wingSpanX = 10;
        wingOffsetZ = -2;
        STALL_SPEED = 15;
        LOW_SPEED_ALARM = 25;
        HAS_RETRACTABLE_GEAR = false;
        CRASH_SCALE = 1.2;
        
        let yellowMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f , metalness: 0.2, roughness: 0.4 });
        const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 10), yellowMat);
        bodyMesh.position.y = 1;
        planeGroup.add(bodyMesh);
        const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 2), new THREE.MeshStandardMaterial({ color: 0x3498db, metalness: 0.2, roughness: 0.4 }));
        cockpit.position.set(0, 2, -3);
        planeGroup.add(cockpit);
        
        const wingGeo = new THREE.BoxGeometry(18, 0.4, 2.5);
        const wing = new THREE.Mesh(wingGeo, yellowMat);
        wing.position.set(0, 2.2, -1);
        planeGroup.add(wing);
        
        const tail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 2), yellowMat);
        tail.position.set(0, 1, 4);
        planeGroup.add(tail);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 2), yellowMat);
        fin.position.set(0, 2.5, 4);
        planeGroup.add(fin);
        
        // Floats
        let floatMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7 , metalness: 0.2, roughness: 0.4 });
        for (let x of [-2, 2]) {
            let flt = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 10, 8), floatMat);
            flt.rotation.x = Math.PI/2;
            flt.position.set(x, -1, 0);
            planeGroup.add(flt);
            // struts
            let strut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2), floatMat);
            strut.position.set(x, 0, -1);
            planeGroup.add(strut);
        }
        
        // Propellers (Twin)
        for (let x of [-3, 3]) {
            let engine = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), floatMat);
            engine.position.set(x, 2, -2);
            planeGroup.add(engine);
            let prop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 0.1), new THREE.MeshBasicMaterial({color:0x0}));
            prop.position.set(x, 2, -3.1);
            prop.name = 'propeller';
            planeGroup.add(prop);
        }

    } else if (type === 'c130') {
        MAX_THROTTLE = 120;
        THROTTLE_RATE = 0.5;
        MAX_SPEED_CAP = 22.0;
        BASE_LIFT = 0.012;
        MANEUVER_MULTIPLIER = 0.5;
        wingSpanX = 20;
        wingOffsetZ = -2;
        STALL_SPEED = 25;
        LOW_SPEED_ALARM = 40;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 3.5;
        
        let camoMat = new THREE.MeshStandardMaterial({ color: 0x4b5320 , metalness: 0.2, roughness: 0.4 }); // army green
        const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 25, 16), camoMat);
        body.rotation.x = Math.PI/2;
        planeGroup.add(body);
        
        const nose = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 16), camoMat);
        nose.position.z = -12.5;
        planeGroup.add(nose);
        const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 }));
        cockpit.position.set(0, 2, -11);
        planeGroup.add(cockpit);
        
        const wing = new THREE.Mesh(new THREE.BoxGeometry(35, 1, 4), camoMat);
        wing.position.set(0, 2.5, -2);
        planeGroup.add(wing);
        
        for (let x of [-10, -5, 5, 10]) {
            let engine = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3, 8), camoMat);
            engine.rotation.x = Math.PI/2;
            engine.position.set(x, 2, -3);
            planeGroup.add(engine);
            let prop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 0.1), new THREE.MeshBasicMaterial({color:0x0}));
            prop.position.set(x, 2, -4.6);
            prop.name = 'propeller';
            planeGroup.add(prop);
        }
        
        const tail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 3), camoMat);
        tail.position.set(0, 3, 12);
        planeGroup.add(tail);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 4), camoMat);
        fin.position.set(0, 6, 11);
        planeGroup.add(fin);

    } else if (type === 'sr71') {
        MAX_THROTTLE = 300;
        THROTTLE_RATE = 1.0;
        MAX_SPEED_CAP = 65.0; // Mach 3+
        BASE_LIFT = 0.005; // Requires very high speed to stay up
        MANEUVER_MULTIPLIER = 0.8;
        wingSpanX = 10;
        wingOffsetZ = 2;
        STALL_SPEED = 45;
        LOW_SPEED_ALARM = 70;
        HAS_RETRACTABLE_GEAR = true;
        CRASH_SCALE = 2.0;
        
        let blackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a , metalness: 0.2, roughness: 0.4 });
        const bodyGeo = new THREE.CylinderGeometry(1, 1.5, 25, 16);
        bodyGeo.rotateX(Math.PI/2);
        bodyGeo.scale(2, 0.3, 1);
        const body = new THREE.Mesh(bodyGeo, blackMat);
        planeGroup.add(body);
        
        const noseGeo = new THREE.ConeGeometry(1, 15, 16);
        noseGeo.rotateX(Math.PI/2);
        noseGeo.scale(2, 0.3, 1);
        const nose = new THREE.Mesh(noseGeo, blackMat);
        nose.position.set(0, 0, -20);
        planeGroup.add(nose);
        
        const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 2), new THREE.MeshStandardMaterial({ color: 0x0, metalness: 0.9, roughness: 0.1 }));
        cockpit.position.set(0, 0.5, -10);
        planeGroup.add(cockpit);
        
        const wingGeo = new THREE.CylinderGeometry(0, 10, 15, 3, 1);
        wingGeo.rotateY(-Math.PI/2);
        wingGeo.scale(1, 0.05, 1);
        const wing = new THREE.Mesh(wingGeo, blackMat);
        wing.position.set(0, 0, 5);
        planeGroup.add(wing);
        
        for (let x of [-4, 4]) {
            let engine = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 15, 16), blackMat);
            engine.rotation.x = Math.PI/2;
            engine.position.set(x, 0, 3);
            planeGroup.add(engine);
            let spike = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4, 16), blackMat);
            spike.rotation.x = Math.PI/2;
            spike.position.set(x, 0, -6.5);
            planeGroup.add(spike);
        }
        
        const finGeo = new THREE.BoxGeometry(0.2, 3, 4);
        let finL = new THREE.Mesh(finGeo, blackMat);
        finL.position.set(-3, 1.5, 8);
        finL.rotation.z = Math.PI/6;
        planeGroup.add(finL);
        let finR = new THREE.Mesh(finGeo, blackMat);
        finR.position.set(3, 1.5, 8);
        finR.rotation.z = -Math.PI/6;
        planeGroup.add(finR);

    } else if (type === 'glider') {
        MAX_THROTTLE = 20; // Just a small motor
        THROTTLE_RATE = 2.0;
        MAX_SPEED_CAP = 10.0;
        BASE_LIFT = 0.08; // Huge lift
        MANEUVER_MULTIPLIER = 1.2;
        wingSpanX = 20;
        wingOffsetZ = 0;
        STALL_SPEED = 12;
        LOW_SPEED_ALARM = 18;
        HAS_RETRACTABLE_GEAR = false;
        CRASH_SCALE = 0.5;
        
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.2, 12, 16);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff , metalness: 0.2, roughness: 0.4 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);

        // Very long thin wings
        const wingGeo = new THREE.BoxGeometry(40, 0.1, 1.5);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xf39c12 , metalness: 0.2, roughness: 0.4 });
        const wingMesh = new THREE.Mesh(wingGeo, wingMat);
        wingMesh.position.set(0, 0, 0);
        wingMesh.castShadow = true;
        planeGroup.add(wingMesh);
        
        const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 1), wingMat);
        tailMesh.position.set(0, 0, 5);
        planeGroup.add(tailMesh);
        const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 1), wingMat);
        finMesh.position.set(0, 0.75, 5);
        planeGroup.add(finMesh);
        
        // Tiny prop
        const propGeo = new THREE.BoxGeometry(0.1, 2, 0.1);
        const propMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const propMesh = new THREE.Mesh(propGeo, propMat);
        propMesh.position.set(0, 0, -6);
        propMesh.name = 'propeller';
        planeGroup.add(propMesh);

    } else if (type === 'ufo') {
        MAX_THROTTLE = 300;
        THROTTLE_RATE = 10.0;
        MAX_SPEED_CAP = 80.0;
        BASE_LIFT = 0.1; // Crazy lift
        MANEUVER_MULTIPLIER = 5.0; // Crazy turning
        wingSpanX = 8;
        wingOffsetZ = 0;
        STALL_SPEED = 0; // Doesn't stall
        LOW_SPEED_ALARM = 10;
        HAS_RETRACTABLE_GEAR = false;
        CRASH_SCALE = 2.0;
        
        const bodyGeo = new THREE.TorusGeometry(3, 1, 16, 100);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x34495e, emissive: 0x2980b9, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.1 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);

        const domeGeo = new THREE.SphereGeometry(2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.8, metalness: 0.9, roughness: 0.1 });
        const domeMesh = new THREE.Mesh(domeGeo, domeMat);
        domeMesh.position.set(0, 0.5, 0);
        planeGroup.add(domeMesh);
        
        // Add glowing ring
        const ringGeo = new THREE.TorusGeometry(4, 0.2, 8, 32);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(0, 0, 0);
        planeGroup.add(ringMesh);
        
    } else if (type === 'biplane') {
        MAX_THROTTLE = 50;
        THROTTLE_RATE = 2.0;
        MAX_SPEED_CAP = 12.0;
        BASE_LIFT = 0.05;
        MANEUVER_MULTIPLIER = 1.0;
        wingSpanX = 12;
        wingOffsetZ = -2;
        STALL_SPEED = 15;
        LOW_SPEED_ALARM = 25;
        HAS_RETRACTABLE_GEAR = false;
        CRASH_SCALE = 0.8;
        
        const bodyGeo = new THREE.CylinderGeometry(0.8, 1.0, 9, 12);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad , metalness: 0.2, roughness: 0.4 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.set(0, 0, 0);
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);

        const noseGeo = new THREE.SphereGeometry(0.8, 12, 12);
        const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
        noseMesh.position.set(0, 0, -4.5);
        planeGroup.add(noseMesh);

        const wingGeo = new THREE.BoxGeometry(20, 0.2, 3);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f , metalness: 0.2, roughness: 0.4 });
        
        const topWing = new THREE.Mesh(wingGeo, wingMat);
        topWing.position.set(0, 1.5, -2);
        topWing.castShadow = true;
        planeGroup.add(topWing);
        
        const bottomWing = new THREE.Mesh(wingGeo, wingMat);
        bottomWing.position.set(0, -0.5, -2);
        bottomWing.castShadow = true;
        planeGroup.add(bottomWing);
        
        const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2), wingMat);
        tailMesh.position.set(0, 0, 4);
        planeGroup.add(tailMesh);
        
        const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 2), wingMat);
        finMesh.position.set(0, 1, 4);
        planeGroup.add(finMesh);
        
        const propGeo = new THREE.BoxGeometry(0.2, 4, 0.2);
        const propMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const propMesh = new THREE.Mesh(propGeo, propMat);
        propMesh.position.set(0, 0, -5.1);
        propMesh.name = 'propeller';
        planeGroup.add(propMesh);
        
    } else if (type === 'cessna') {
        MAX_THROTTLE = 50;
        THROTTLE_RATE = 2.0;
        MAX_SPEED_CAP = 15.0; // 120 knots
        BASE_LIFT = 0.03; // glides well
        MANEUVER_MULTIPLIER = 0.7;
        wingSpanX = 12;
        wingOffsetZ = -3;
        STALL_SPEED = 20;
        LOW_SPEED_ALARM = 35;
        HAS_RETRACTABLE_GEAR = false;
        CRASH_SCALE = 1.0;
        
        const bodyGeo = new THREE.CylinderGeometry(1.2, 1.2, 10, 16);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff , metalness: 0.2, roughness: 0.4 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        planeGroup.add(bodyMesh);

        const noseGeo = new THREE.SphereGeometry(1.2, 16, 16);
        noseGeo.scale(1, 0.9, 1.5);
        const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
        noseMesh.position.set(0, 0, -5);
        planeGroup.add(noseMesh);

        const tailGeo = new THREE.ConeGeometry(1.2, 4, 16);
        tailGeo.rotateX(-Math.PI / 2);
        const tailConeMesh = new THREE.Mesh(tailGeo, bodyMat);
        tailConeMesh.position.set(0, 0, 7);
        planeGroup.add(tailConeMesh);
        
        const windowGeo = new THREE.SphereGeometry(1.22, 16, 16, 0, Math.PI, 0, Math.PI/2);
        windowGeo.scale(1, 0.9, 1.5);
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const windowMesh = new THREE.Mesh(windowGeo, windowMat);
        windowMesh.position.set(0, 0.05, -3.5);
        windowMesh.rotation.x = -Math.PI / 8;
        planeGroup.add(windowMesh);

        // High wing
        const wingGeo = new THREE.BoxGeometry(24, 0.3, 3);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c , metalness: 0.2, roughness: 0.4 });
        const wingMesh = new THREE.Mesh(wingGeo, wingMat);
        wingMesh.position.set(0, 1.25, -3);
        wingMesh.castShadow = true;
        planeGroup.add(wingMesh);
        
        const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 2), wingMat);
        tailMesh.position.set(0, 0.5, 5);
        planeGroup.add(tailMesh);

        const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 2), wingMat);
        finMesh.position.set(0, 1.5, 5);
        planeGroup.add(finMesh);
        
        // Propeller box
        const propGeo = new THREE.BoxGeometry(0.2, 4, 0.2);
        const propMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const propMesh = new THREE.Mesh(propGeo, propMat);
        propMesh.position.set(0, 0, -6.1);
        propMesh.name = 'propeller';
        planeGroup.add(propMesh);
    }
    
    // Add realistic landing gear (complex bogies)
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const strutMat = new THREE.MeshPhongMaterial({ color: 0x888888 });

    function createGear(x, y, z, isMain) {
        let gear = new THREE.Group();
        gear.position.set(x, y, z);
        
        // Main strut
        let strut = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5), strutMat);
        strut.position.y = -0.75;
        gear.add(strut);
        
        let wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        
        if (isMain) {
            // 4-wheel bogie
            let bogie = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.2), strutMat);
            bogie.position.y = -1.5;
            gear.add(bogie);
            
            for (let wx of [-0.3, 0.3]) {
                for (let wz of [-0.4, 0.4]) {
                    let w = new THREE.Mesh(wheelGeo, wheelMat);
                    w.position.set(wx, -1.5, wz);
                    gear.add(w);
                }
            }
        } else {
            // 2-wheel nose gear
            let axle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), strutMat);
            axle.position.y = -1.5;
            gear.add(axle);
            
            let w1 = new THREE.Mesh(wheelGeo, wheelMat);
            w1.position.set(-0.3, -1.5, 0);
            gear.add(w1);
            let w2 = new THREE.Mesh(wheelGeo, wheelMat);
            w2.position.set(0.3, -1.5, 0);
            gear.add(w2);
        }
        return gear;
    }

    // Attach landing gear to plane
    landingGearGroup.add(createGear(0, 0, -6, false)); // nose
    landingGearGroup.add(createGear(-2.5, 0, 1, true)); // left main
    landingGearGroup.add(createGear(2.5, 0, 1, true));  // right main
    
    planeGroup.add(landingGearGroup);
}

// Explosion and Grass Fire
const explosionMat = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.8 });
const explosionGeo = new THREE.SphereGeometry(5, 16, 16);
let explosion = null;
let grassFires = []; // Array to hold all fires (grass, debris, buildings)
let firePlanes = []; // AI firefighting planes
let waterDrops = []; // Water particle drops

// Passenger capacities per plane type
const PLANE_PASSENGERS = {
    'cessna': 1,
    'airliner': 15,
    'a380': 15, // Capped at 15 to prevent lag
    'b747': 15,
    'concorde': 10,
    'c130': 5,
    'fighter': 0,
    'f22': 0,
    'sr71': 0,
    'seaplane': 2,
    'biplane': 1,
    'cargo': 2,
    'glider': 1,
    'ufo': 3
};
let passengerMeshes = [];
let totalPatients = 0;
let rescuedPatients = 0;



// Player Character setup
const playerMesh = createHumanoid(0x2980b9, 0x34495e, null, true);
playerMesh.visible = false;
scene.add(playerMesh);

let playerMode = false;
let playerVelocity = new THREE.Vector3();

// Audio Setup
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let alarmOsc = null;
let alarmGain = null;
let stallOsc = null;
let stallGain = null;
let airSpeedOsc = null;
let airSpeedGain = null;
let explosionOsc1 = null;
let explosionOsc2 = null;

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        engineOsc = audioCtx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(50, audioCtx.currentTime); 
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, audioCtx.currentTime);
        
        engineGain = audioCtx.createGain();
        engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
        
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        
        alarmOsc = audioCtx.createOscillator();
        alarmOsc.type = 'square';
        alarmGain = audioCtx.createGain();
        alarmGain.gain.setValueAtTime(0, audioCtx.currentTime);
        alarmOsc.connect(alarmGain);
        alarmGain.connect(audioCtx.destination);
        alarmOsc.start();

        stallOsc = audioCtx.createOscillator();
        stallOsc.type = 'square';
        stallGain = audioCtx.createGain();
        stallGain.gain.setValueAtTime(0, audioCtx.currentTime);
        stallOsc.connect(stallGain);
        stallGain.connect(audioCtx.destination);
        stallOsc.start();

        airSpeedOsc = audioCtx.createOscillator();
        airSpeedOsc.type = 'sine';
        airSpeedGain = audioCtx.createGain();
        airSpeedGain.gain.setValueAtTime(0, audioCtx.currentTime);
        airSpeedOsc.connect(airSpeedGain);
        airSpeedGain.connect(audioCtx.destination);
        airSpeedOsc.start();

        engineOsc.start();
    } catch(e) {
        console.log("Audio init failed");
    }
}

function updateEngineSound(throttle, speed) {
    if (!audioCtx || !engineOsc) return;
    if (gameState !== 'playing') {
        engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        return;
    }
    const freq = 50 + (throttle / 100) * 80 + (speed * 5);
    engineOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.1);
    const vol = throttle > 0 ? 0.05 + (throttle / 100) * 0.15 : (speed > 1 ? 0.02 : 0);
    engineGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.1);
}

let fireNoiseSource = null;
let fireSoundGain = null;

function startFireSound() {
    if (!audioCtx) return;
    
    // Create continuous white noise for fire
    const bufferSize = audioCtx.sampleRate * 2; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    fireNoiseSource = audioCtx.createBufferSource();
    fireNoiseSource.buffer = buffer;
    fireNoiseSource.loop = true;
    
    // Bandpass filter to make it sound like fire crackling/hissing
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800; // mid/high frequencies
    filter.Q.value = 1.0;
    
    fireSoundGain = audioCtx.createGain();
    let maxVol = Math.min(1.0, 0.2 * CRASH_SCALE); // Bigger fire = louder
    fireSoundGain.gain.setValueAtTime(0, audioCtx.currentTime);
    
    // Fade in the fire sound slowly after the initial explosion
    fireSoundGain.gain.linearRampToValueAtTime(maxVol, audioCtx.currentTime + 3.0);
    
    fireNoiseSource.connect(filter);
    filter.connect(fireSoundGain);
    fireSoundGain.connect(audioCtx.destination);
    
    fireNoiseSource.start();
}

function stopFireSound() {
    if (fireSoundGain && audioCtx) {
        fireSoundGain.gain.cancelScheduledValues(audioCtx.currentTime);
        fireSoundGain.gain.setValueAtTime(fireSoundGain.gain.value, audioCtx.currentTime);
        fireSoundGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        
        if (fireNoiseSource) {
            let src = fireNoiseSource;
            setTimeout(() => { try { src.stop(); } catch(e){} }, 500);
        }
        
        fireSoundGain = null;
        fireNoiseSource = null;
    }
}

let sirenOsc = null;
let sirenGain = null;
let sirenInterval = null;


function updateSirenVolume() {
    if (!sirenGain || !audioCtx) return;
    
    let minDistSq = Infinity;
    let allVehicles = [...firetrucks, ...policeCars];
    
    for (let v of allVehicles) {
        let d = v.mesh.position.distanceToSquared(camera.position);
        if (d < minDistSq) minDistSq = d;
    }
    
    let maxVol = Math.min(0.5, 0.1 * CRASH_SCALE);
    let targetVol = 0;
    
    // 20m in game could be around 200 units. 200 squared = 40000
    if (minDistSq < 40000) {
        // Linear falloff from 100 units to 200 units
        let dist = Math.sqrt(minDistSq);
        if (dist < 100) {
            targetVol = maxVol;
        } else {
            targetVol = maxVol * (1 - (dist - 100) / 100);
        }
    }
    
    // Smoothly transition volume
    sirenGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.1);
}

function startSirenSound() {
    if (!audioCtx) return;
    
    sirenOsc = audioCtx.createOscillator();
    sirenOsc.type = 'triangle'; 
    
    sirenGain = audioCtx.createGain();
    let maxVol = Math.min(0.5, 0.1 * CRASH_SCALE); // Volume based on firetruck count
    sirenGain.gain.setValueAtTime(0, audioCtx.currentTime);
    
    // Fade in siren because they are "arriving from far away"
    // sirenGain.gain.linearRampToValueAtTime(maxVol, audioCtx.currentTime + 4.0);
    
    sirenOsc.connect(sirenGain);
    sirenGain.connect(audioCtx.destination);
    
    sirenOsc.start();
    
    let isHigh = false;
    let switchFreq = () => {
        if (!sirenOsc || !audioCtx) return;
        if (isHigh) {
            sirenOsc.frequency.setTargetAtTime(600, audioCtx.currentTime, 0.05); // quick smooth slide
        } else {
            sirenOsc.frequency.setTargetAtTime(800, audioCtx.currentTime, 0.05);
        }
        isHigh = !isHigh;
    };
    
    switchFreq();
    sirenInterval = setInterval(switchFreq, 600); // Switch every 600ms (Nee-Naa)
}

function stopSirenSound() {
    if (sirenInterval) {
        clearInterval(sirenInterval);
        sirenInterval = null;
    }
    
    if (sirenGain && audioCtx) {
        sirenGain.gain.cancelScheduledValues(audioCtx.currentTime);
        sirenGain.gain.setValueAtTime(sirenGain.gain.value, audioCtx.currentTime);
        sirenGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0); // Fade out
        
        if (sirenOsc) {
            let src = sirenOsc;
            setTimeout(() => { try { src.stop(); } catch(e){} }, 1000);
        }
        
        sirenGain = null;
        sirenOsc = null;
    }
}

function playGearSound() {
    if (!audioCtx) return;
    
    // Mechanical whir
    let osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    let gain = audioCtx.createGain();
    
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 1.5);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 1.2);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 1.5);
    
    // Clunk at the end
    setTimeout(() => {
        if (!audioCtx) return;
        let clunk = audioCtx.createOscillator();
        clunk.type = 'square';
        let clunkGain = audioCtx.createGain();
        clunk.frequency.setValueAtTime(60, audioCtx.currentTime);
        clunk.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.1);
        
        clunkGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        clunkGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        clunk.connect(clunkGain);
        clunkGain.connect(audioCtx.destination);
        clunk.start(audioCtx.currentTime);
        clunk.stop(audioCtx.currentTime + 0.1);
    }, 1400);
}

function playCrashSound() {
    if (!audioCtx) return;
    
    const duration = Math.max(1.0, 2.0 * CRASH_SCALE); // Bigger plane = longer rumble
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.8; // White noise
    }
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    // Lowpass filter for deep explosion rumble
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + duration);
    
    // Gain node for the explosion "bang" and decay
    const gainNode = audioCtx.createGain();
    const maxVolume = Math.min(2.0, 0.5 * CRASH_SCALE); 
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(maxVolume, audioCtx.currentTime + 0.05); // sharp attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration); // smooth decay
    
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseSource.start();
}

function playWinSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.2);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// Physics & State
let debrisPieces = [];
const GRAVITY = 0.05;

let planeVelocity = new THREE.Vector3(0, 0, 0);
let angularVelocity = new THREE.Vector3(0, 0, 0);
let planeThrottle = 0;
let gameState = 'intro';
let hasTakenOff = false;
let autopilot = false;

// --- EMERGENCY SYSTEM ---
let activeEmergencies = {
    fire: false,
    gears: false,
    engine_explosion: false,
    fuel_empty: false,
    fog_turbulence: false,
    wing_damage: false
};

let emergencyState = {
    fireTimer: 0,
    firePart: null, // "left-wing", "right-wing", "left-engine", "right-engine", "fuselage", "tail"
    fireParticleSystem: null,
    fuelTimer: 0,
    fogTimer: 0,
    fogNextAltitudeDrop: 0,
    damagedWing: null // "left" or "right"
};
// -----------------------
let gearDown = true;
let startTime = Date.now();
let alarmTimer = 0;
let gearsAlarmTimer = 0;

function resetPlane() {
    planeGroup.position.set(0, 2, 2800); 
    planeGroup.rotation.set(0, Math.PI, 0); 
    planeVelocity.set(0, 0, 0);
    angularVelocity.set(0, 0, 0);
    planeThrottle = 0;
    gameState = 'playing';
    hasTakenOff = false;
    autopilot = false;
    gearDown = true;
    playerMode = false;
    if (playerMesh) playerMesh.visible = false;
    landingGearGroup.rotation.x = 0;
    startTime = Date.now();
    
    if (explosionMat) {
        explosionMat.opacity = 0.8;
    }
    const msgEl = document.getElementById('message');
    if (msgEl) msgEl.innerText = '';
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.style.display = 'none';
    const hospChoice = document.getElementById('hospital-choice');
    if (hospChoice) hospChoice.style.display = 'none';
    const skipAmb = document.getElementById('skip-amb-btn');
    if (skipAmb) skipAmb.style.display = 'none';
    const rescueUi = document.getElementById('rescue-mission-ui');
    if (rescueUi) rescueUi.style.display = 'none';
    const statusDisp = document.getElementById('plane-status-display');
    if (statusDisp) statusDisp.style.display = 'block';

    const mobControls = document.getElementById('mobile-controls');
    const antiIce = document.getElementById('anti-ice-container');
    const weatherMenu = document.getElementById('weather-menu');
    const emMenu = document.getElementById('emergency-menu');

    if (typeof isMobileMode !== 'undefined' && isMobileMode) {
        if (mobControls) mobControls.style.display = 'block';
        if (antiIce) antiIce.style.display = 'none';
        if (emMenu) emMenu.style.display = 'none';
        if (weatherMenu) weatherMenu.style.display = 'none';
    } else {
        if (antiIce) antiIce.style.display = 'block';
        if (emMenu) emMenu.style.display = 'block';
        if (weatherMenu) weatherMenu.style.display = 'block';
    }
    if (engineGain && audioCtx) engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
    updateAlarms(false, false, false, false);
    stopFireSound();
    stopSirenSound();
    
    // Snap camera immediately to avoid it skewing "not straight" at the beginning
    const cameraOffset = new THREE.Vector3(0, 15, 60).applyQuaternion(planeGroup.quaternion);
    camera.position.copy(planeGroup.position).add(cameraOffset);
    camera.up.set(0, 1, 0);

    planeGroup.visible = true;
    if (explosion) {
        scene.remove(explosion);
        explosion = null;
    }
    for (let p of debrisPieces) {
        scene.remove(p.mesh);
    }
    debrisPieces = [];
    
    // Remove old fires
    
    firePlanes.forEach(fp => scene.remove(fp.mesh));
    firePlanes = [];
    
    waterDrops.forEach(w => scene.remove(w.mesh));
    waterDrops = [];
    
    ambulanceBoats.forEach(b => scene.remove(b));
    ambulanceBoats = [];
    waterCrash = false;

    grassFires.forEach(fire => scene.remove(fire));
    grassFires = [];
    
    firefighters.forEach(ff => scene.remove(ff.mesh));
    firefighters = [];
    firetrucks.forEach(t => scene.remove(t.mesh));
    firetrucks = [];
    investigators.forEach(inv => scene.remove(inv.mesh));
    investigators = [];
    passengerMeshes.forEach(p => scene.remove(p.mesh));
    passengerMeshes = [];
    crashResponseState = 'none';
    
    // Reset Civilian cars
    civCars.forEach(c => c.mesh.visible = true);
    
    // Reset pedestrians (they never die currently, but if they did we'd reset them)
    
    // Reset buildings
    for (let b of buildings) {
        if (b.userData.onFire) {
            b.userData.onFire = false;
        }
    }
    
    // Reset emergencies
    for (let key in activeEmergencies) {
        activeEmergencies[key] = false;
    }
    emergencyState.fireTimer = 0;
    emergencyState.fuelTimer = 0;
    emergencyState.fogTimer = 0;
    emergencyState.firePart = null;
    emergencyState.damagedWing = null;
    document.getElementById('weather-alert').style.display = 'none';
    if (typeof uiManager !== 'undefined') {
        uiManager.updateStatusDisplay(activeEmergencies, emergencyState);
    }
    
    // Reset weather
    if (typeof weatherSystem !== 'undefined' && weatherSystem) {
        weatherSystem.setWeather('sun');
        document.getElementById('weather-select').value = 'sun';
    }
}
resetPlane();

// Input Handling
// keys object is now imported from InputManager
window.addEventListener('keydown', e => {
    // keys[e.code] is set in InputManager
    if (e.code === 'KeyP' && !playerMode) {
        autopilot = !autopilot;
        document.getElementById('autopilot-menu').style.display = autopilot ? 'block' : 'none';
    }
    if (e.code === 'KeyG' && !playerMode) {
        if (HAS_RETRACTABLE_GEAR) {
            gearDown = !gearDown;
            if (typeof playGearSound === 'function') playGearSound();
        }
    }
    if (e.code === 'Space') {
        if ((gameState === 'playing' || gameState === 'landed') && planeVelocity.length() < 5.0 && planeGroup.position.y < 4) {
            if (playerMode) {
                // Get back in plane
                if (playerMesh.position.distanceTo(planeGroup.position) < 20) {
                    playerMode = false;
                    playerMesh.visible = false;
                }
            } else {
                // Safely get out of parked plane
                playerMode = true;
                playerMesh.position.copy(planeGroup.position);
                playerMesh.position.x -= 5;
                playerMesh.position.y = 0.9;
                playerMesh.visible = true;
                playerVelocity.set(0, 0, 0);
            }
        }
    }
});
// keyup is handled in InputManager

// Mouse Look & Extinguisher
let isDragging = false;
let cameraAngleX = 0;
let cameraAngleY = 0.2;

window.addEventListener('mousedown', (e) => {
    isDragging = true;
    initAudio();
    
    // Extinguish fire
    if (playerMode && gameState === 'crashed') {
        for (let i = grassFires.length - 1; i >= 0; i--) {
            let fire = grassFires[i];
            let distSq = playerMesh.position.distanceToSquared(fire.position);
            if (distSq < 400) { // Reach of 20 units
                scene.remove(fire);
                grassFires.splice(i, 1);
                
                // Foam particle effect could be added here
            }
        }
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (isDragging && playerMode) {
        cameraAngleX -= e.movementX * 0.01;
        cameraAngleY += e.movementY * 0.01;
        // Allow looking up (negative angle) and down (positive angle)
        cameraAngleY = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraAngleY)); 
    }
});

let cameraZoomDist = 35;
window.addEventListener('wheel', (e) => {
    cameraZoomDist += e.deltaY * 0.05;
    if (cameraZoomDist < 15) cameraZoomDist = 15;
    if (cameraZoomDist > 200) cameraZoomDist = 200;
});

const rstBtn = document.getElementById('restart-btn');
if (rstBtn) rstBtn.addEventListener('click', resetPlane);

// Hospital Logic
function startRescueMission() {
    const hosp = document.getElementById('hospital-choice');
    if (hosp) hosp.style.display = 'none';
    const rBtn = document.getElementById('restart-btn');
    if (rBtn) rBtn.style.display = 'none';
    
    // Show Rescue Mission UI
    const rUi = document.getElementById('rescue-mission-ui');
    if (rUi) rUi.style.display = 'block';
    
    crashResponseState = 'ambulance_rescue';
    
    playerMode = true;
    playerMesh.position.copy(planeGroup.position);
    playerMesh.position.x -= 5;
    playerMesh.position.y = 0.5;
    playerMesh.rotation.x = -Math.PI / 2; // Lie down
    playerMesh.visible = true;
    playerVelocity.set(0, 0, 0);
    
    let allPatients = [{ mesh: playerMesh, isPlayer: true, rescued: false }];
    passengerMeshes.forEach(p => {
        if (!p.rescued) allPatients.push({ mesh: p.mesh, isPlayer: false, rescued: false });
    });
    
    totalPatients = allPatients.length;
    rescuedPatients = 0;
    document.getElementById('rescue-counter').innerText = rescuedPatients + ' / ' + totalPatients;
    
    let ambIndex = 0;
    firetrucks.forEach(f => {
        if (f.isAmbulance) {
            f.state = 'driving_to_crash'; 
            if (ambIndex === 0) f.isPlayerAmbulance = true;
            ambIndex++;
        }
    });
}



window.onPlaneSelect = function(e) {
    try {
        if (currentPlaneType !== e.target.value) {
            buildPlane(e.target.value);
            resetPlane();
        }
        e.target.blur(); // Remove focus so arrow keys work for flying!
    } catch (err) {
        alert("Error swapping planes: " + err.message);
    }
}
document.getElementById('plane-select').addEventListener('change', window.onPlaneSelect);
document.getElementById('plane-select').addEventListener('input', window.onPlaneSelect);

document.getElementById('ap-alt').addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Escape') {
        e.target.blur();
    }
    e.stopPropagation(); // prevent flight controls while typing!
});



// Game Loop

function updateWaterRescue() {
    let dt = 0.016;
    if (crashResponseState !== 'water_rescue') return;
    
    // Sink the plane slowly
    if (planeGroup.position.y > -300) {
        planeGroup.position.y -= 2 * dt;
        planeGroup.rotation.x -= 0.05 * dt; // tilt forward
    } else {
        planeGroup.visible = false;
    }
    
    // Helicopters hover
    helicopters.forEach((heli, idx) => {
        heli.userData.rotor.rotation.y += 10 * dt;
        heli.userData.tailRotor.rotation.y += 10 * dt;
        heli.position.y = 100 + Math.sin(Date.now() * 0.002 + idx) * 5;
        heli.position.x += Math.cos(Date.now() * 0.001 + idx) * 0.5;
        heli.position.z += Math.sin(Date.now() * 0.001 + idx) * 0.5;
    });
    
    // Life rafts bob on the water
    lifeRafts.forEach((raft, idx) => {
        raft.position.y = 5 + Math.sin(Date.now() * 0.002 + idx) * 1.5;
        raft.rotation.x = Math.sin(Date.now() * 0.003 + idx) * 0.1;
        raft.rotation.z = Math.cos(Date.now() * 0.002 + idx) * 0.1;
        
        // Sync passengers
        raft.userData.passengers.forEach((p, pIdx) => {
            // Give them a fixed offset on the raft based on index
            let offsetX = Math.cos(pIdx) * 1.5;
            let offsetZ = Math.sin(pIdx) * 1.5;
            
            if (p.isPlayer) {
                if (playerMesh.visible) {
                    playerMesh.position.x = raft.position.x + offsetX;
                    playerMesh.position.y = raft.position.y + 0.5;
                    playerMesh.position.z = raft.position.z + offsetZ;
                }
            } else {
                if (p.mesh.parent === scene) { // if not picked up by boat yet
                    p.mesh.position.x = raft.position.x + offsetX;
                    p.mesh.position.y = raft.position.y + 0.5;
                    p.mesh.position.z = raft.position.z + offsetZ;
                }
            }
        });
    });
    
    // Ambulance Boats
    ambulanceBoats.forEach(boat => {
        // Simple state machine: 'idle' -> 'to_raft' -> 'boarding' -> 'to_shore' -> 'unloading'
        
        // Bob on water
        boat.position.y = 5 + Math.sin(Date.now() * 0.002 + boat.id) * 1.0;
        
        if (boat.userData.state === 'idle') {
            // Find a raft that has un-claimed passengers
            let targetRaft = null;
            let targetPassenger = null;
            for (let r of lifeRafts) {
                let p = r.userData.passengers.find(pass => !pass.claimed && !pass.rescued);
                if (p) {
                    targetRaft = r;
                    targetPassenger = p;
                    break;
                }
            }
            
            if (targetRaft) {
                boat.userData.targetRaft = targetRaft;
                // Claim up to 3 passengers from this raft
                boat.userData.claimedPassengers = [];
                for (let p of targetRaft.userData.passengers) {
                    if (!p.claimed && !p.rescued && boat.userData.claimedPassengers.length < 3) {
                        p.claimed = true;
                        boat.userData.claimedPassengers.push(p);
                    }
                }
                boat.userData.state = 'to_raft';
                // Turn on siren visually
                boat.userData.sirenMat.color.setHex(0x3498db);
            }
            
        } else if (boat.userData.state === 'to_raft') {
            let target = boat.userData.targetRaft.position;
            let dir = new THREE.Vector3().subVectors(target, boat.position);
            dir.y = 0;
            let dist = dir.length();
            if (dist > 15) {
                dir.normalize();
                let step = 3000 * dt;
                if (step > dist - 14) step = dist - 14;
                boat.position.add(dir.multiplyScalar(step));
                let targetAngle = Math.atan2(-dir.x, -dir.z); // -x, -z because of three.js coord system
                boat.rotation.y = targetAngle;
                // boat tilt
                boat.rotation.x = -0.1;
            } else {
                boat.userData.state = 'boarding';
                boat.userData.timer = 2; // 2 seconds to board
                boat.rotation.x = 0;
            }
            
        } else if (boat.userData.state === 'boarding') {
            boat.userData.timer -= dt;
            if (boat.userData.timer <= 0) {
                // Board passengers
                boat.userData.claimedPassengers.forEach(p => {
                    p.rescued = true; // In the boat now
                    if (p.isPlayer) {
                        playerMesh.visible = false;
                        boat.add(playerMesh);
                        playerMesh.position.set(0, 2, 0); // Put player in boat
                    } else {
                        scene.remove(p.mesh);
                        boat.add(p.mesh);
                        p.mesh.position.set((Math.random()-0.5)*2, 2, (Math.random()-0.5)*2);
                        p.mesh.rotation.set(0, 0, 0);
                    }
                });
                boat.userData.state = 'to_shore';
            }
            
        } else if (boat.userData.state === 'to_shore') {
            let shorePos = new THREE.Vector3(1800, 0, shoreZ - 50); // Just go straight back to shore line
            let dir = new THREE.Vector3().subVectors(shorePos, boat.position);
            dir.y = 0;
            let dist = dir.length();
            if (dist > 5) {
                dir.normalize();
                let step = 3000 * dt;
                if (step > dist - 4) step = dist - 4;
                boat.position.add(dir.multiplyScalar(step));
                let targetAngle = Math.atan2(-dir.x, -dir.z);
                boat.rotation.y = targetAngle;
                boat.rotation.x = -0.1;
            } else {
                boat.rotation.x = 0;
                boat.userData.state = 'unloading';
                boat.userData.timer = 2; // 2 seconds to unload
                boat.userData.sirenMat.color.setHex(0xffffff); // turn off siren
            }
            
        } else if (boat.userData.state === 'unloading') {
            boat.userData.timer -= dt;
            if (boat.userData.timer <= 0) {
                // Spawn Ambulance Car at shore to take them to hospital
                let amb = VehicleBuilder.createAmbulance();
                amb.position.set(1800, 1, shoreZ + 20); // slightly inland
                scene.add(amb);
                
                // Transfer passengers to ambulance
                boat.userData.claimedPassengers.forEach(p => {
                    boat.remove(p.isPlayer ? playerMesh : p.mesh);
                    if (p.isPlayer) {
                        amb.add(playerMesh);
                        playerMesh.position.set(0,0,0);
                        playerMesh.visible = false;
                    } else {
                        amb.add(p.mesh);
                        p.mesh.position.set((Math.random()-0.5)*2, 1, -2);
                        p.mesh.rotation.set(0,0,0);
                    }
                    

                });
                
                // For water rescues, always go to the mountain hospital through the new tunnel
                let targetHospPos = new THREE.Vector3(1800, 150, -29000);
                
                // Waypoints:
                let waypoints = [
                    new THREE.Vector3(1800, 1, -31000),           // drive straight down the road to tunnel entrance
                    targetHospPos                                 // drive through tunnel to hospital
                ];
                
                let ambObj = {
                    mesh: amb,
                    isAmbulance: true,
                    isPlayerAmbulance: boat.userData.claimedPassengers.some(p => p.isPlayer),
                    state: 'driving_to_hospital',
                    passengers: boat.userData.claimedPassengers,
                    waypoints: waypoints,
                    sirenMat: amb.userData.sirenMat,
                    wheels: amb.userData.wheels,
                    targetPatient: null,
                    capacity: 2,
                    doorOpen: false,
                    doorTimer: 0
                };
                
                firetrucks.push(ambObj); // We reuse the firetruck array for land ambulances
                
                boat.userData.claimedPassengers = [];
                boat.userData.state = 'idle'; // ready for next run
                
                // If all rescued
                if (rescuedPatients >= totalPatients) {
                    crashResponseState = 'water_rescue_complete';
                    yardService.addYards(50, 'Flight Simulator Water Rescue Mission');
                    setTimeout(() => {
                        const messageEl = document.getElementById('message');
                        messageEl.innerText = "All passengers successfully rescued from the water! (+50 Yards)";
                        messageEl.style.color = "#2ecc71";
                        document.getElementById('restart-btn').style.display = 'block';
                    }, 2000);
                }
            }
        }
    });
}

function animate() {
    updateWaterRescue();
    // Update Firefighting Planes
    for (let i = firePlanes.length - 1; i >= 0; i--) {
        let fp = firePlanes[i];
        
        // Move towards target
        let dir = new THREE.Vector3().subVectors(fp.targetPos, fp.mesh.position);
        let dist = dir.length();
        dir.normalize();
        
        // Add velocity
        fp.mesh.position.add(dir.multiplyScalar(fp.speed));
        
        // Spin props
        fp.props.forEach(p => p.rotation.x += 0.5);
        
        // Drop water if close enough
        if (!fp.dropped && dist < 300) {
            fp.dropped = true;
            spawnWaterDrop(fp.mesh.position.x, fp.mesh.position.y - 10, fp.mesh.position.z);
        }
        
        // Continue flying away after drop
        if (fp.dropped) {
            fp.targetPos.add(dir.multiplyScalar(100)); // Keep pushing target further away in same direction
            fp.lifeAfterDrop--;
            if (fp.lifeAfterDrop <= 0) {
                scene.remove(fp.mesh);
                firePlanes.splice(i, 1);
            }
        }
    }
    
    // Update Water Drops
    for (let i = waterDrops.length - 1; i >= 0; i--) {
        let w = waterDrops[i];
        w.mesh.position.add(w.vel);
        
        if (w.mesh.position.y <= 0.5) { // Hit ground
            // Extinguish fires in radius
            for (let j = grassFires.length - 1; j >= 0; j--) {
                let fire = grassFires[j];
                let dx = fire.position.x - w.mesh.position.x;
                if (dx > 100 || dx < -100) continue;
                let dz = fire.position.z - w.mesh.position.z;
                if (dz > 100 || dz < -100) continue;
                
                let fDist = fire.position.distanceTo(w.mesh.position);
                if (fDist < 30 * CRASH_SCALE) {
                    scene.remove(fire);
                    grassFires.splice(j, 1);
                }
            }
            scene.remove(w.mesh);
            waterDrops.splice(i, 1);
        } else {
            w.life--;
            if (w.life <= 0) {
                scene.remove(w.mesh);
                waterDrops.splice(i, 1);
            }
        }
    }

    
    // Dynamic Map Loading based on Z coordinate
    // Map 1 goes until -10800. Transition zone from -10000 to -15000. Map 2 from -15000 onwards.
    let playerZ = planeGroup.position.z;
    if (playerZ > 10000) {
        map1Group.visible = (playerZ < 15000);
        map2Group.visible = false;
        map3Group.visible = true;
        map4Group.visible = false;
    } else if (playerZ > -8000) {
        map1Group.visible = true;
        map2Group.visible = false;
        map3Group.visible = false;
        map4Group.visible = false;
    } else if (playerZ <= -8000 && playerZ > -15000) {
        map1Group.visible = true;
        map2Group.visible = true;
        map3Group.visible = false;
        map4Group.visible = false;
    } else if (playerZ <= -15000 && playerZ > -35000) {
        map1Group.visible = false;
        map2Group.visible = true;
        map3Group.visible = false;
        map4Group.visible = false;
    } else if (playerZ <= -35000 && playerZ > -45000) {
        map1Group.visible = false;
        map2Group.visible = true;
        map3Group.visible = false;
        map4Group.visible = true;
    } else {
        map1Group.visible = false;
        map2Group.visible = false;
        map3Group.visible = false;
        map4Group.visible = true;
    }
    requestAnimationFrame(animate);

    if (gameState === 'playing') {
        updatePhysics();
    } else if (gameState === 'crashed') {
        if (explosion) {
            explosion.scale.addScalar(1.5);
            explosionMat.opacity -= 0.015;
        }
        // Animate new crash debris
        for (let i = crashDebris.length - 1; i >= 0; i--) {
            let p = crashDebris[i];
            p.position.add(p.userData.velocity);
            p.rotation.x += p.userData.rotationSpeed.x;
            p.rotation.y += p.userData.rotationSpeed.y;
            p.rotation.z += p.userData.rotationSpeed.z;
            p.userData.velocity.y -= GRAVITY * 20; // Gravity
            
            // Ground collision
            if (p.position.y <= 0.5) {
                p.position.y = 0.5;
                if (p.userData.velocity.y < -1.0) {
                    p.userData.velocity.y *= -0.4; // Bounce
                    p.userData.velocity.x *= 0.6;
                    p.userData.velocity.z *= 0.6;
                } else {
                    p.userData.velocity.y = 0;
                    p.userData.velocity.x *= 0.85;
                    p.userData.velocity.z *= 0.85;
                }
            }
        }
        
        // Animate smoke particles (Explosion)
        for (let i = smokeParticles.length - 1; i >= 0; i--) {
            let s = smokeParticles[i];
            s.position.add(s.userData.velocity);
            if (s.userData.isExplosion) {
                s.userData.velocity.multiplyScalar(0.9); // Air friction
                s.userData.velocity.y += 0.2; // Rise up
                s.scale.multiplyScalar(1.05); // Expand
                s.userData.life -= 0.01;
                s.material.opacity = s.userData.life;
                if (s.userData.life <= 0) {
                    scene.remove(s);
                    smokeParticles.splice(i, 1);
                }
            }
        }
        
        // Animate water splashes
        for (let i = waterSplashes.length - 1; i >= 0; i--) {
            let w = waterSplashes[i];
            w.position.add(w.userData.velocity);
            w.userData.velocity.y -= GRAVITY * 40; // Heavy gravity for water
            w.scale.multiplyScalar(1.02);
            w.userData.life -= 0.02;
            w.material.opacity = w.userData.life;
            if (w.position.y <= 5 || w.userData.life <= 0) {
                scene.remove(w);
                waterSplashes.splice(i, 1);
            }
        }
        
        // Animate plane sinking
        if (waterCrash && planeGroup && planeGroup.visible) {
            if (planeGroup.position.y > -50) {
                planeGroup.position.y -= 0.05; // Sink slowly
                planeGroup.rotation.x += 0.0005; // Tilt forward
                planeGroup.rotation.z += 0.0002; // Tilt sideways
            }
        }
    }
    
    updateEmergencies();
    weatherSystem.updateWeather();
    updateWorld();
    updatePlayer();
    updateCamera();
    updateSirenVolume();
    uiManager.updateFlightStats(gameState, playerMode, autopilot, planeThrottle, planeVelocity, planeGroup.position.y - 2, ((new THREE.Euler().setFromQuaternion(planeGroup.quaternion, 'YXZ').y * 180 / Math.PI) % 360 + 360) % 360, gearDown, HAS_RETRACTABLE_GEAR);
    uiManager.updateGyroscope(new THREE.Euler().setFromQuaternion(planeGroup.quaternion, 'YXZ'));
    
    if (gameState === 'playing') {
        updateEngineSound(planeThrottle, planeVelocity.length());
    } else {
        updateEngineSound(0, 0);
    }
    
    // Animate propeller if it exists
    const prop = planeGroup.getObjectByName('propeller');
    if (prop && gameState !== 'crashed') {
        let throttlePercent = planeThrottle / MAX_THROTTLE;
        prop.rotation.z += 0.2 + throttlePercent * 0.8;
    }
    
    // Animate Helicopter Rotors
    if (vehicleType === 'helicopter' && gameState !== 'crashed') {
        let throttlePercent = planeThrottle / MAX_THROTTLE;
        let rotorSpeed = 0.2 + throttlePercent * 0.8; // Spin based on throttle
        if (window.heliRotor) window.heliRotor.rotation.y += rotorSpeed;
        if (window.heliTailRotor) window.heliTailRotor.rotation.x += rotorSpeed;
    }
    
    renderer.render(scene, camera);
}


function resolveBuildingCollision(pos, radius, isPlayer = false) {
    let resolved = false;
    for (let i = 0; i < buildings.length; i++) {
        let b = buildings[i];
        let bx = b.position.x;
        
        let dx = pos.x - bx;
        // Fast bounding box check (max hospital radius is 45, player radius 2)
        if (dx > 55 || dx < -55) continue; 
        
        let bz = b.position.z;
        let dz = pos.z - bz;
        if (dz > 55 || dz < -55) continue;
        
        let distSq = dx * dx + dz * dz;
        
        let bRadius = b.userData.isTree ? 4 : (b.userData.isHospital ? 45 : 18);
        let minRadius = radius + bRadius;
        
        if (distSq < minRadius * minRadius) {
            let dist = Math.sqrt(distSq);
            if (dist === 0) { dx = 1; dist = 1; }
            let overlap = minRadius - dist;
            pos.x += (dx / dist) * overlap;
            pos.z += (dz / dist) * overlap;
            resolved = true;
        }
    }
    return resolved;
}

function resolveVehicleCollision(pos, radius, ignoreVehiclesArray) {
    let allVehicles = [...firetrucks, ...policeCars];
    // Could add civCars here if they were driving off-road, but they don't.
    for (let i = 0; i < allVehicles.length; i++) {
        let v = allVehicles[i];
        if (ignoreVehiclesArray && ignoreVehiclesArray.includes(v)) continue;
        
        let dx = pos.x - v.mesh.position.x;
        let dz = pos.z - v.mesh.position.z;
        let distSq = dx * dx + dz * dz;
        let minRadius = radius + 6; // Other vehicle radius roughly 6
        
        if (distSq < minRadius * minRadius) {
            let dist = Math.sqrt(distSq);
            if (dist === 0) { dx = 1; dist = 1; }
            let overlap = minRadius - dist;
            pos.x += (dx / dist) * overlap;
            pos.z += (dz / dist) * overlap;
        }
    }
}

function updatePlayer() {
    if (!playerMode) return;
    
    playerVelocity.y -= 0.05; // Gravity
    
    let walkDir = new THREE.Vector3();
    if (playerMesh.position.y <= 2.5 && Math.abs(playerMesh.rotation.x) < 0.1) {
        if (keys['KeyW'] || keys['ArrowUp']) walkDir.z -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) walkDir.z += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) walkDir.x -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) walkDir.x += 1;
    }
    
    if (walkDir.lengthSq() > 0) {
        walkDir.normalize();
        let camEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        walkDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), camEuler.y);
        
        playerVelocity.x = walkDir.x * 0.4;
        playerVelocity.z = walkDir.z * 0.4;
        
        playerMesh.lookAt(playerMesh.position.clone().add(walkDir));
        
        const time = Date.now() * 0.01;
        const swing = Math.sin(time) * 0.5;
        playerMesh.userData.leftArm.rotation.x = swing;
        playerMesh.userData.rightArm.rotation.x = -swing;
        playerMesh.userData.leftLeg.rotation.x = -swing;
        playerMesh.userData.rightLeg.rotation.x = swing;
    } else {
        playerVelocity.x *= 0.5;
        playerVelocity.z *= 0.5;
        
        playerMesh.userData.leftArm.rotation.x = 0;
        playerMesh.userData.rightArm.rotation.x = 0;
        playerMesh.userData.leftLeg.rotation.x = 0;
        playerMesh.userData.rightLeg.rotation.x = 0;
    }
    
    playerMesh.position.add(playerVelocity);
    

    resolveBuildingCollision(playerMesh.position, 2);
    resolveVehicleCollision(playerMesh.position, 2, []);

    if (playerMesh.position.y < 0.9) {
        playerMesh.position.y = 0.9;
        playerVelocity.y = 0;
    }
    
    // Extinguisher visibility
    if (playerMesh.userData.extinguisher) {
        playerMesh.userData.extinguisher.visible = (gameState === 'crashed');
    }
}

// Spawn 10 Village Pedestrians
for (let i = 0; i < 10; i++) {
    let shirt = shirtColors[Math.floor(Math.random() * shirtColors.length)];
    let pants = pantsColors[Math.floor(Math.random() * pantsColors.length)];
    let ped = createHumanoid(shirt, pants, null, false);
    
    let px = (Math.random() - 0.5) * 1000;
    let pz = 20000 + (Math.random() - 0.5) * 1000;
    
    ped.position.set(px, 0, pz);
    ped.rotation.y = Math.random() * Math.PI * 2;
    map3Group.add(ped);
    pedestrians.push({
        bounds: { minX: -600, maxX: 600, minZ: 19400, maxZ: 20600 },
        mesh: ped,
        leftArm: ped.userData.leftArm,
        rightArm: ped.userData.rightArm,
        leftLeg: ped.userData.leftLeg,
        rightLeg: ped.userData.rightLeg,
        legTime: Math.random() * Math.PI,
        speed: 0.1 + Math.random() * 0.1
    });
}

function updateWorld() {
    let strobeFlash = (Date.now() % 2000) < 100; // Flash for 100ms every 2 seconds
    planeGroup.children.forEach(c => {
        if (c.userData && c.userData.isStrobe) {
            c.visible = strobeFlash;
        }
    });

    if (gameState === 'crashed' && crashResponseState === 'firefighting' && grassFires.length === 0 && (!explosion || explosionMat.opacity <= 0)) {
        crashResponseState = 'investigating';
        if (typeof stopSirenSound === 'function') stopSirenSound();
        
        let invCount = Math.max(1, Math.floor(2 * CRASH_SCALE));
        for (let i = 0; i < invCount; i++) {
            // White shirt, black pants, no hat
            let invGroup = createHumanoid(0xffffff, 0x111111, null, false);
            let angle = Math.random() * Math.PI * 2;
            invGroup.position.set(
                planeGroup.position.x + Math.cos(angle) * 300,
                0,
                planeGroup.position.z + Math.sin(angle) * 300
            );
            scene.add(invGroup);
            investigators.push({
                mesh: invGroup,
                leftLeg: invGroup.userData.leftLeg,
                rightLeg: invGroup.userData.rightLeg,
                leftArm: invGroup.userData.leftArm,
                rightArm: invGroup.userData.rightArm,
                legTime: Math.random() * 10,
                speed: 0.2 + Math.random() * 0.1,
                targetDebris: debrisPieces.length > 0 ? debrisPieces[Math.floor(Math.random() * debrisPieces.length)] : { mesh: planeGroup }
            });
        }
    }
    
    // Animate grass fires
    if (grassFires.length > 0) {
        grassFires.forEach(fire => {
            let s = (1.0 + Math.random() * 0.5);
            
            // Randomly animate scale to simulate flickering
            if (!fire.userData.baseScaleX) fire.userData.baseScaleX = fire.scale.x;
            if (!fire.userData.baseScaleY) fire.userData.baseScaleY = fire.scale.y;
            fire.scale.set(fire.userData.baseScaleX * s, fire.userData.baseScaleY * s, 1);
            
            // Move upwards and fade
            fire.userData.life = (fire.userData.life || 0) + 0.05;
            
            if (fire.userData.isBuildingFire) {
                fire.userData.offsetY += fire.userData.speed;
                if (fire.userData.offsetY > fire.userData.height + 20) {
                    fire.userData.offsetY = 0;
                }
                fire.position.y = fire.userData.basey + fire.userData.offsetY;
                fire.material.opacity = 1.0 - (fire.userData.offsetY / (fire.userData.height + 20));
            } else if (fire.userData.attachedDebris) {
                let d = fire.userData.attachedDebris;
                fire.position.copy(d.mesh.position);
                fire.position.x += fire.userData.offsetX || 0;
                fire.position.z += fire.userData.offsetZ || 0;
                fire.position.y += Math.max(0.5, (fire.userData.offsetY || 0)); 
            }
        });
        
        if (grassFires.length < 600 * CRASH_SCALE && Math.random() < 0.2) {
            let sourceFire = grassFires[Math.floor(Math.random() * grassFires.length)];
            let newFire = new THREE.Sprite(globalFireMat.clone());
            newFire.scale.set(6, 12, 1);
            
            let offsetX = (Math.random() - 0.5) * 5;
            let offsetZ = (Math.random() - 0.5) * 5;
            
            if (sourceFire.userData.isBuildingFire) {
                newFire.userData.isBuildingFire = true;
                newFire.userData.basey = sourceFire.userData.basey;
                newFire.userData.offsetY = sourceFire.userData.offsetY - 5;
                newFire.userData.height = sourceFire.userData.height;
                newFire.userData.speed = sourceFire.userData.speed;
                newFire.position.set(
                    sourceFire.position.x + (Math.random() - 0.5) * 10,
                    newFire.userData.basey + newFire.userData.offsetY,
                    sourceFire.position.z + (Math.random() - 0.5) * 10
                );
            } else if (sourceFire.userData.attachedDebris) {
                newFire.userData.attachedDebris = sourceFire.userData.attachedDebris;
                newFire.userData.offsetX = (sourceFire.userData.offsetX || 0) + offsetX;
                newFire.userData.offsetZ = (sourceFire.userData.offsetZ || 0) + offsetZ;
                newFire.userData.offsetY = Math.random() * 3;
            } else {
                newFire.position.set(
                    sourceFire.position.x + offsetX,
                    0.5,
                    sourceFire.position.z + offsetZ
                );
            }
            
            scene.add(newFire);
            grassFires.push(newFire);
        }
    }

    // Update AI Planes
    aiPlanes.forEach(p => {
        let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(p.mesh.quaternion);
        p.mesh.position.add(forward.multiplyScalar(p.speed));
        
        if (p.mesh.position.x > 12000) p.mesh.position.x = -12000;
        if (p.mesh.position.x < -12000) p.mesh.position.x = 12000;
        if (p.mesh.position.z > 12000) p.mesh.position.z = -12000;
        if (p.mesh.position.z < -12000) p.mesh.position.z = 12000;
    });
    
    // Update Firefighters
    if (firefighters.length > 0) {
        for (let i = firefighters.length - 1; i >= 0; i--) {
            let ff = firefighters[i];
            
            if (crashResponseState === 'investigating') {
                ff.waterJet.visible = false;
                ff.rightArm.rotation.x = 0;
                
                if (!ff.isLeaving) {
                    let moveDir = new THREE.Vector3();
                    ff.mesh.getWorldDirection(moveDir);
                    ff.mesh.lookAt(ff.mesh.position.x + moveDir.x * 100, ff.mesh.position.y, ff.mesh.position.z + moveDir.z * 100);
                    ff.isLeaving = true;
                }
                
                let moveDir = new THREE.Vector3();
                ff.mesh.getWorldDirection(moveDir);
                ff.mesh.position.add(moveDir.multiplyScalar(0.2));
                
                ff.legTime += 0.2;
                ff.leftLeg.rotation.x = Math.sin(ff.legTime) * 0.5;
                ff.rightLeg.rotation.x = -Math.sin(ff.legTime) * 0.5;
                ff.leftArm.rotation.x = -Math.sin(ff.legTime) * 0.5;
                ff.rightArm.rotation.x = Math.sin(ff.legTime) * 0.5;
                
                if (ff.mesh.position.distanceToSquared(planeGroup.position) > 250000) { // far away
                    scene.remove(ff.mesh);
                    firefighters.splice(i, 1);
                }
            } else if (grassFires.length > 0) {
                let closestFire = null;
                let closestDist = Infinity;
                for (let f of grassFires) {
                    let d = ff.mesh.position.distanceToSquared(f.position);
                    if (d < closestDist) {
                        closestDist = d;
                        closestFire = f;
                    }
                }
                
                
                if (closestFire) {
                    if (closestDist > 100) {
                        ff.mesh.lookAt(closestFire.position.x, ff.mesh.position.y, closestFire.position.z);
                        let moveDir = new THREE.Vector3();
                        ff.mesh.getWorldDirection(moveDir);
                        ff.mesh.position.add(moveDir.multiplyScalar(0.2));
                        
                        ff.legTime += 0.2;
                        ff.leftLeg.rotation.x = Math.sin(ff.legTime) * 0.5;
                        ff.rightLeg.rotation.x = -Math.sin(ff.legTime) * 0.5;
                        ff.leftArm.rotation.x = -Math.sin(ff.legTime) * 0.5;
                        ff.rightArm.rotation.x = Math.sin(ff.legTime) * 0.2;
                        ff.waterJet.visible = false;
                    } else {
                        ff.leftLeg.rotation.x = 0;
                        ff.rightLeg.rotation.x = 0;
                        ff.leftArm.rotation.x = 0;
                        ff.rightArm.rotation.x = -Math.PI / 4; 
                        ff.mesh.lookAt(closestFire.position.x, ff.mesh.position.y, closestFire.position.z);
                        
                        ff.waterJet.visible = true;
                        let dist = Math.sqrt(closestDist);
                        ff.waterJet.scale.set(1, dist, 1);
                        ff.waterJet.position.set(0, -0.4, dist / 2 + 0.5); 
                    }
                } else {
                    ff.waterJet.visible = false;
                    ff.rightArm.rotation.x = 0;
                    ff.leftLeg.rotation.x = 0;
                    ff.rightLeg.rotation.x = 0;
                    ff.leftArm.rotation.x = 0;
                }
            } else {
                ff.waterJet.visible = false;
                ff.rightArm.rotation.x = 0;
                ff.leftLeg.rotation.x = 0;
                ff.rightLeg.rotation.x = 0;
                ff.leftArm.rotation.x = 0;
            }
        }
    }
    
    // Update Firetrucks
    if (firetrucks.length > 0) {
        for (let i = firetrucks.length - 1; i >= 0; i--) {
            let t = firetrucks[i];
            t.timer++;
            
            if (crashResponseState === 'investigating') {
                if (t.cannon) t.cannon.visible = false;
                if (t.light) t.light.material.color.setHex(0xaaaaaa); // Turn off lights (grey)
                if (t.isAmbulance && t.sirenMat) t.sirenMat.color.setHex(0xaaaaaa);
                
                if (!t.isLeaving) {
                    let moveDir = new THREE.Vector3();
                    t.mesh.getWorldDirection(moveDir);
                    t.mesh.lookAt(t.mesh.position.x + moveDir.x * 100 + (Math.random()-0.5)*50, t.mesh.position.y, t.mesh.position.z + moveDir.z * 100 + (Math.random()-0.5)*50);
                    t.isLeaving = true;
                }
                
                let moveDir = new THREE.Vector3();
                t.mesh.getWorldDirection(moveDir);
                t.mesh.position.add(moveDir.multiplyScalar(1.8));
                t.wheels.forEach(w => w.rotation.x -= 0.45);
                
                if (t.mesh.position.distanceToSquared(planeGroup.position) > 4000000) {
                    scene.remove(t.mesh);
                    firetrucks.splice(i, 1);
                }
            } else if (t.isAmbulance) {
                // Ambulance logic
                t.sirenMat.color.setHex((Math.floor(t.timer / 10) % 2 === 0) ? 0x3498db : 0xe74c3c);
                
                
                if (t.state === 'driving_to_crash') {
                    if (!t.waypoints || t.waypoints.length === 0) {
                        let targetPos = null;
                        if (t.targetPatient && !t.targetPatient.rescued) {
                            targetPos = t.targetPatient.mesh.position.clone();
                        } else if (t.isPlayerAmbulance && playerMesh.visible && (!t.passengers || !t.passengers.includes('player'))) {
                            targetPos = playerMesh.position.clone();
                            t.targetPatient = null;
                        } else {
                            // Find next unrescued
                            let unrescued = passengerMeshes.find(p => !p.rescued && !p.claimed);
                            if (unrescued) {
                                unrescued.claimed = true;
                                t.targetPatient = unrescued;
                                targetPos = unrescued.mesh.position.clone();
                            } else {
                                // No patients left
                                t.state = 'driving_to_hospital';
                                t.waypoints = getHospitalWaypoints(t.mesh.position, ambulanceDepot.position);
                            }
                        }
                        if (targetPos) t.waypoints = [targetPos];
                    }
                    
                    if (t.waypoints && t.waypoints.length > 0) {
                        let targetPos = t.waypoints[0];
                        targetPos.y = t.mesh.position.y;
                        let distSq = t.mesh.position.distanceToSquared(targetPos);
                        
                        let threshold = (t.waypoints.length === 1) ? 900 : 400; // 30 units for final waypoint to avoid getting stuck on buildings
                        if (distSq > threshold) {
                            let dir = new THREE.Vector3().subVectors(targetPos, t.mesh.position).normalize();
                            // Mountain avoidance
                            let avoidDir = new THREE.Vector3(0, 0, 0);
                            for (let i = 0; i < buildings.length; i++) {
                                let b = buildings[i];
                                if (b.userData.isMountain) {
                                    let dx = t.mesh.position.x - b.position.x;
                                    let dz = t.mesh.position.z - b.position.z;
                                    let dSq = dx * dx + dz * dz;
                                    let mRadius = (b.userData.originalScale.x / 10) * 500;
                                    if (dSq < (mRadius + 200) * (mRadius + 200)) {
                                        let mDir = new THREE.Vector3(dx, 0, dz).normalize();
                                        let cross = new THREE.Vector3(0, 1, 0).cross(mDir);
                                        if (cross.dot(dir) > 0) avoidDir.add(cross.multiplyScalar(2.0));
                                        else avoidDir.sub(cross.multiplyScalar(2.0));
                                    }
                                }
                            }
                            if (avoidDir.lengthSq() > 0) {
                                dir.add(avoidDir).normalize();
                            }
                            let lookPos = new THREE.Vector3().subVectors(t.mesh.position, dir);
                            t.mesh.lookAt(lookPos);
                            let moveDir = new THREE.Vector3();
                            t.mesh.getWorldDirection(moveDir);
                            t.mesh.position.sub(moveDir.clone().multiplyScalar(16.0));
                            t.wheels.forEach(w => w.rotation.x += 1.0);
                        } else {
                            t.waypoints.shift();
                            if (t.waypoints.length === 0) {
                                t.state = 'loading_patient';
                                t.timer = 0;
                            }
                        }
                    }
                    
                    if (t.state === 'loading_patient' && t.timer === 0) {
                        if (!t.stretcher) {
                            t.stretcher = new THREE.Group();
                            t.p1 = createHumanoid(0x27ae60, 0xecf0f1, null, false);
                            t.p2 = createHumanoid(0x27ae60, 0xecf0f1, null, false);
                            scene.add(t.p1);
                            scene.add(t.p2);
                            scene.add(t.stretcher);
                            
                            let bedGeo = new THREE.BoxGeometry(2, 0.2, 5);
                            let bedMat = new THREE.MeshLambertMaterial({color: 0xbdc3c7});
                            let bed = new THREE.Mesh(bedGeo, bedMat);
                            t.stretcher.add(bed);
                        }
                        t.stretcher.visible = true;
                        t.p1.visible = true;
                        t.p2.visible = true;
                        
                        let offset = new THREE.Vector3(0,0,10);
                        offset.applyAxisAngle(new THREE.Vector3(0,1,0), t.mesh.rotation.y);
                        t.ambBack = t.mesh.position.clone().add(offset);
                        
                        let crashPos = t.targetPatient ? t.targetPatient.mesh.position.clone() : playerMesh.position.clone();
                        crashPos.y = t.mesh.position.y;
                        
                        t.playerLocal = crashPos;
                        t.playerOnStretcher = false;
                    }
                } else if (t.state === 'loading_patient') {
                    t.timer++;
                    
                    if (t.timer < 100) {
                        // parameds walk to patient
                        let progress = t.timer / 100;
                        t.stretcher.position.lerpVectors(t.ambBack, t.playerLocal, progress);
                    } else {
                        let phase = (t.timer - 100) / 100;
                        let progress = phase;
                        if (phase < 0.5) {
                            progress = phase / 0.5;
                            t.stretcher.position.copy(t.playerLocal); // Wait
                        } else {
                            progress = (phase - 0.5) / 0.5;
                            t.stretcher.position.lerpVectors(t.playerLocal, t.ambBack, progress);
                            if (!t.playerOnStretcher) {
                                t.playerOnStretcher = true;
                                let targetMesh = t.targetPatient ? t.targetPatient.mesh : playerMesh;
                                targetMesh.visible = false; 
                                let dummyPlayer = targetMesh.clone();
                                dummyPlayer.position.set(0, 0.7, 0);
                                dummyPlayer.rotation.x = -Math.PI / 2; 
                                t.stretcher.add(dummyPlayer);
                                if (t.targetPatient) t.targetPatient.rescued = true;
                            }
                        }
                    }
                    
                    t.p1.position.copy(t.stretcher.position).add(new THREE.Vector3(-1, 0, -1.2));
                    t.p2.position.copy(t.stretcher.position).add(new THREE.Vector3(1, 0, 1.2));
                    
                    let walkTime = t.timer * 0.2;
                    let swing = Math.sin(walkTime) * 0.5;
                    t.p1.userData.leftLeg.rotation.x = swing;
                    t.p1.userData.rightLeg.rotation.x = -swing;
                    t.p2.userData.leftLeg.rotation.x = -swing;
                    t.p2.userData.rightLeg.rotation.x = swing;
                    
                    if (t.timer > 200) {
                        t.p1.visible = false;
                        t.p2.visible = false;
                        t.stretcher.visible = false;
                        
                        // Check if we need to pick up another one
                        if (t.targetPatient) {
                            t.passengers.push(t.targetPatient);
                        } else {
                            t.passengers.push('player');
                        }
                        
                        let unrescued = passengerMeshes.find(p => !p.rescued && !p.claimed);
                        if (unrescued && t.passengers.length < t.capacity) {
                            unrescued.claimed = true;
                            t.state = 'driving_to_crash';
                            t.targetPatient = unrescued;
                            t.waypoints = [unrescued.mesh.position.clone()];
                        } else {
                            t.state = 'driving_to_hospital';
                            t.waypoints = getHospitalWaypoints(t.mesh.position, hospitalBuilding.position.clone());
                        }
                    }
                } else if (t.state === 'driving_to_hospital') {
                    if (!t.waypoints || t.waypoints.length === 0) {
                        t.waypoints = getHospitalWaypoints(t.mesh.position, hospitalBuilding.position.clone());
                    }
                    
                    let targetPos = t.waypoints[0];
                    targetPos.y = t.mesh.position.y;
                    let distSq = t.mesh.position.distanceToSquared(targetPos);
                    
                    if (distSq > 400) {
                        let dir = new THREE.Vector3().subVectors(targetPos, t.mesh.position).normalize();
                        // Mountain avoidance
                        let avoidDir = new THREE.Vector3(0, 0, 0);
                        // Skip mountain avoidance if we are entering the tunnel (z < -23000 and x is around 2000)
                        let inTunnelZone = (t.mesh.position.z < -28000 && Math.abs(t.mesh.position.x - 1800) < 500);
                        if (!inTunnelZone) {
                            for (let i = 0; i < buildings.length; i++) {
                                let b = buildings[i];
                                if (b.userData.isMountain) {
                                let dx = t.mesh.position.x - b.position.x;
                                let dz = t.mesh.position.z - b.position.z;
                                let dSq = dx * dx + dz * dz;
                                let mRadius = (b.userData.originalScale.x / 10) * 500;
                                if (dSq < (mRadius + 200) * (mRadius + 200)) {
                                    let mDir = new THREE.Vector3(dx, 0, dz).normalize();
                                    let cross = new THREE.Vector3(0, 1, 0).cross(mDir);
                                    if (cross.dot(dir) > 0) avoidDir.add(cross.multiplyScalar(2.0));
                                    else avoidDir.sub(cross.multiplyScalar(2.0));
                                }
                            }
                        }
                        }
                        if (avoidDir.lengthSq() > 0) {
                            dir.add(avoidDir).normalize();
                        }
                        let lookPos = new THREE.Vector3().subVectors(t.mesh.position, dir);
                        t.mesh.lookAt(lookPos);
                        let moveDir = new THREE.Vector3();
                        t.mesh.getWorldDirection(moveDir);
                        t.mesh.position.sub(moveDir.clone().multiplyScalar(16.0));
                        t.wheels.forEach(w => w.rotation.x += 1.0);
                    } else {
                        t.waypoints.shift();
                        if (t.waypoints.length === 0) {
                            t.state = 'arrived';
                            rescuedPatients += t.passengers.length;
                            document.getElementById('rescue-counter').innerText = rescuedPatients + ' / ' + totalPatients;
                            
                            t.passengers = []; // Empty ambulance
                            
                            if (t.isPlayerAmbulance) {
                                document.getElementById('survival-text').style.display = 'block';
                                setTimeout(() => {
                                    document.getElementById('survival-text').style.display = 'none';
                                    resetPlane();
                                }, 2000);
                            }
                            
                            // Check if more to rescue
                            let unrescued = passengerMeshes.find(p => !p.rescued && !p.claimed);
                            if (unrescued) {
                                unrescued.claimed = true;
                                t.state = 'driving_to_crash';
                                t.targetPatient = unrescued;
                                t.waypoints = getHospitalWaypoints(t.mesh.position, unrescued.mesh.position.clone());
                            } else {
                                // done
                                if (rescuedPatients >= totalPatients && !t.isPlayerAmbulance) {
                                    scene.remove(t.mesh);
                                    let idx = firetrucks.indexOf(t);
                                    if (idx > -1) firetrucks.splice(idx, 1);
                                    i--; 
                                }
                            }
                        }
                    }
                }

            } else {
                t.light.material.color.setHex((Math.floor(t.timer / 10) % 2 === 0) ? 0x3498db : 0xffffff);
                
                let closestFire = null;
                let closestDist = Infinity;
                for (let f of grassFires) {
                    let d = t.mesh.position.distanceToSquared(f.position);
                    if (d < closestDist) {
                        closestDist = d;
                        closestFire = f;
                    }
                }
                if (closestFire) {
                    if (closestDist > 2500) { 
                        t.mesh.lookAt(closestFire.position.x, t.mesh.position.y, closestFire.position.z);
                        let moveDir = new THREE.Vector3();
                        t.mesh.getWorldDirection(moveDir);
                        t.mesh.position.add(moveDir.multiplyScalar(1.8)); 
                        
                        t.wheels.forEach(w => w.rotation.x -= 0.45);
                        t.cannon.visible = false;
                    } else {
                        t.mesh.lookAt(closestFire.position.x, t.mesh.position.y, closestFire.position.z);
                        t.cannon.visible = true;
                        let dist = Math.sqrt(closestDist);
                        t.cannon.scale.set(1, dist, 1);
                        t.cannon.position.set(0, 6, dist/2 + 2);
                        
                        t.extinguishTimer = (t.extinguishTimer || 0) + 1;
                        if (t.extinguishTimer > 40) { 
                            let idx = grassFires.indexOf(closestFire);
                            if (idx > -1) {
                                scene.remove(closestFire);
                                grassFires.splice(idx, 1);
                            }
                            t.extinguishTimer = 0;
                            t.cannon.visible = false;
                        }
                    }
                } else {
                    t.cannon.visible = false;
                }
            }
            

            // --- Terrain Y adjustments for tunnels and bridges ---
            let currentY = 1.5;
            if (Math.abs(t.mesh.position.x) < 150) {
                currentY = -10; // Runway tunnel
            } else if (t.mesh.position.x > 2250 && t.mesh.position.x < 2700) {
                // River crossing
                let zGrid = Math.round(t.mesh.position.z / 450);
                if ([-9, -5, -1, 3, 7].includes(zGrid)) {
                    currentY = -10; // River tunnel
                } else if ([-7, -3, 1, 5, 9].includes(zGrid)) {
                    currentY = 6; // River bridge
                }
            }
            t.mesh.position.y += (currentY - t.mesh.position.y) * 0.1;
            // ----------------------------------------------------

            // Resolve collisions for firetruck/ambulance
            if (t.state !== 'picking_up' && t.state !== 'arrived' && t.mesh) {
                if (!t.isAmbulance) {
                    resolveBuildingCollision(t.mesh.position, 6);
                }
                resolveVehicleCollision(t.mesh.position, 6, [t]);
            }
        }
    }
    
    // Update Investigators
    if (investigators.length > 0) {
        investigators.forEach(inv => {
            if (inv.targetDebris) {
                let d = inv.targetDebris.mesh.position.distanceToSquared(inv.mesh.position);
                if (d > 200) {
                    inv.mesh.lookAt(inv.targetDebris.mesh.position.x, inv.mesh.position.y, inv.targetDebris.mesh.position.z);
                    let moveDir = new THREE.Vector3();
                    inv.mesh.getWorldDirection(moveDir);
                    inv.mesh.position.add(moveDir.multiplyScalar(inv.speed));
                    
                    inv.legTime += inv.speed * 2;
                    inv.leftLeg.rotation.x = Math.sin(inv.legTime) * 0.5;
                    inv.rightLeg.rotation.x = -Math.sin(inv.legTime) * 0.5;
                    inv.leftArm.rotation.x = -Math.sin(inv.legTime) * 0.5;
                    inv.rightArm.rotation.x = Math.sin(inv.legTime) * 0.5;
                } else {
                    inv.leftLeg.rotation.x = 0;
                    inv.rightLeg.rotation.x = 0;
                    inv.leftArm.rotation.x = 0;
                    
                    inv.mesh.rotation.y += (Math.random() - 0.5) * 0.1;
                    
                    if (Math.random() < 0.02) {
                        inv.rightArm.rotation.x = -Math.PI / 2; // point
                    } else if (Math.random() < 0.05) {
                        inv.rightArm.rotation.x = 0;
                    }
                }
            }
        });
    }

    
    // Update Police Cars
    for (let i = policeCars.length - 1; i >= 0; i--) {
        let pc = policeCars[i];
        pc.timer++;
        
        // Flash sirens
        pc.sirenL.color.setHex((Math.floor(pc.timer / 8) % 2 === 0) ? 0x3498db : 0x111111);
        pc.sirenR.color.setHex((Math.floor(pc.timer / 8) % 2 !== 0) ? 0xe74c3c : 0x111111);
        
        if (pc.state === 'driving') {
            let distSq = pc.mesh.position.distanceToSquared(pc.targetPos);
            if (distSq > 100) {
                let dir = new THREE.Vector3().subVectors(pc.targetPos, pc.mesh.position).normalize();
                let lookPos = new THREE.Vector3().subVectors(pc.mesh.position, dir);
                pc.mesh.lookAt(lookPos);
                
                let moveDir = new THREE.Vector3();
                pc.mesh.getWorldDirection(moveDir);
                pc.mesh.position.sub(moveDir.clone().multiplyScalar(pc.speed));
                pc.wheels.forEach(w => w.rotation.x += pc.speed * 0.25);
                
                // Collision check against buildings and other emergency vehicles
                resolveBuildingCollision(pc.mesh.position, 4);
                let allVehicles = [...firetrucks, ...policeCars];
                resolveVehicleCollision(pc.mesh.position, 4, [pc]);
            } else {
                pc.state = 'parked';
                // Turn slightly inwards to look cool
                pc.mesh.rotation.y += Math.PI / 4;
            }
        }
    }

    // Update Civilian Cars
    civCars.forEach(c => {
        
        if (!c.mesh.visible) return;
        let fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(c.mesh.quaternion);
        c.mesh.position.add(fwd.multiplyScalar(c.speed));
        
        if (gameState === 'crashed') {
            let distSq = c.mesh.position.distanceToSquared(planeGroup.position);
            if (distSq < 22500) { // 150 radius (inside perimeter)
                c.mesh.rotation.y += Math.PI; // Turn around 180 degrees
                c.mesh.position.add(fwd.clone().multiplyScalar(-c.speed * 2));
            }
        }
        
        c.wheels.forEach(w => w.rotation.x -= c.speed * 0.15);
        
        if (c.mesh.position.x > c.bounds.maxX) c.mesh.position.x = c.bounds.minX;
        if (c.mesh.position.x < c.bounds.minX) c.mesh.position.x = c.bounds.maxX;
        if (c.mesh.position.z > c.bounds.maxZ) c.mesh.position.z = c.bounds.minZ;
        if (c.mesh.position.z < c.bounds.minZ) c.mesh.position.z = c.bounds.maxZ;
    });
    
    // Update Pedestrians
    pedestrians.forEach(ped => {
        let moveDir = new THREE.Vector3();
        ped.mesh.getWorldDirection(moveDir);
        let currentSpeed = ped.speed;
        
        ped.mesh.position.add(moveDir.multiplyScalar(currentSpeed));
        if (gameState === 'crashed') {
            let distSq = ped.mesh.position.distanceToSquared(planeGroup.position);
            if (distSq < 22500) { // 150 radius (inside perimeter)
                ped.mesh.rotation.y += Math.PI; // Turn around 180 degrees
                ped.mesh.position.add(moveDir.clone().multiplyScalar(-currentSpeed * 2));
            }
        }
        
        ped.legTime += currentSpeed * 2;
        ped.leftLeg.rotation.x = Math.sin(ped.legTime) * 0.5;
        ped.rightLeg.rotation.x = -Math.sin(ped.legTime) * 0.5;
        ped.leftArm.rotation.x = -Math.sin(ped.legTime) * 0.5;
        ped.rightArm.rotation.x = Math.sin(ped.legTime) * 0.5;
        
        if (Math.random() < 0.005) {
            ped.mesh.rotation.y += Math.PI / 2;
        }
        if (ped.mesh.position.x > ped.bounds.maxX) ped.mesh.position.x = ped.bounds.minX;
        if (ped.mesh.position.x < ped.bounds.minX) ped.mesh.position.x = ped.bounds.maxX;
        if (ped.mesh.position.z > ped.bounds.maxZ) ped.mesh.position.z = ped.bounds.minZ;
        if (ped.mesh.position.z < ped.bounds.minZ) ped.mesh.position.z = ped.bounds.maxZ;
    });
}


function updatePhysics() {
    if (playerMode) {
        // Plane does not respond to throttle or control inputs
    } else {
        if (keys['KeyW'] || keys['w'] || keys['ShiftLeft']) planeThrottle = Math.min(MAX_THROTTLE, planeThrottle + THROTTLE_RATE * 5);
        if (keys['KeyS'] || keys['s'] || keys['ControlLeft']) planeThrottle = Math.max(0, planeThrottle - THROTTLE_RATE * 5);
    }

    let speed = planeVelocity.length();
    
    if (vehicleType === 'helicopter') {
        let pitchInput = 0;
        let rollInput = 0;
        let yawInput = 0;
        
        if (!playerMode) {
            if (keys['ArrowUp']) pitchInput = 1;
            if (keys['ArrowDown']) pitchInput = -1;
            if (keys['ArrowLeft']) rollInput = 1;
            if (keys['ArrowRight']) rollInput = -1;
            if (keys['KeyA']) yawInput = 1;
            if (keys['KeyD']) yawInput = -1;
            
            // Mobile inputs
            if (keys['KeyA']) yawInput = 1; // Actually we didn't add Q/E, so let's map A/D to yaw.
        }
        
        // Apply inputs to angular velocity
        angularVelocity.x += pitchInput * 0.001;
        angularVelocity.z += rollInput * 0.001;
        angularVelocity.y += yawInput * 0.0015;
        
        // Auto-level
        if (pitchInput === 0) angularVelocity.x += (0 - planeGroup.rotation.x) * 0.02;
        if (rollInput === 0) angularVelocity.z += (0 - planeGroup.rotation.z) * 0.02;
        
        angularVelocity.multiplyScalar(0.9); // air damping
        
        planeGroup.rotation.x = Math.max(-0.4, Math.min(0.4, planeGroup.rotation.x + angularVelocity.x));
        planeGroup.rotation.z = Math.max(-0.4, Math.min(0.4, planeGroup.rotation.z + angularVelocity.z));
        planeGroup.rotation.y += angularVelocity.y;
        
        const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(planeGroup.quaternion);
        const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(planeGroup.quaternion);
        
        // Lift: 30 throttle = hover (snappier takeoff)
        let liftAccel = (planeThrottle / 30.0) * GRAVITY;
        planeVelocity.add(upVector.clone().multiplyScalar(liftAccel));
        
        // Gravity
        planeVelocity.y -= GRAVITY;
        
        // Friction / Drag
        planeVelocity.multiplyScalar(0.98);
        
        planeGroup.position.add(planeVelocity);
        
        if (planeGroup.position.y > 10) hasTakenOff = true;
    } else {
        // --- AIRPLANE PHYSICS START ---
    
    // Control inputs
    let elevator = 0;
    let aileron = 0;
    
    if (playerMode) {
        // No pilot in plane
    } else if (autopilot) {
        // Simple leveling autopilot
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(planeGroup.quaternion);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeGroup.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(planeGroup.quaternion);
        
        let rollError = right.y; // > 0 means right wing is up (banked left)
        
        // If plane is upside down, force a roll to right itself
        if (up.y < 0) {
            rollError = Math.sign(rollError || 1) * 1.0; 
        }
        
        aileron = rollError * 2.0; 
        
        let pitchError = forward.y; // > 0 means nose is up
        
        let targetAlt = parseFloat(document.getElementById('ap-alt').value) || 2000;
        let currentAlt = planeGroup.position.y * 10;
        
        let targetPitch = 0.05; // level flight
        if (currentAlt < targetAlt - 50) {
            targetPitch = 0.3; // pitch up to climb
        } else if (currentAlt > targetAlt + 50) {
            targetPitch = -0.3; // pitch down to descend
        }
        
        // If upside down, we prioritize rolling over pitching down too hard
        if (up.y < 0) pitchError = -0.5; // pitch up to recover if inverted
        
        elevator = (targetPitch - pitchError) * 2.0;
        
        // Auto throttle
        if (hasTakenOff && speed < 3.0) planeThrottle = Math.min(MAX_THROTTLE, planeThrottle + THROTTLE_RATE * 5);
    } else {
        if (keys['ArrowUp']) elevator = -1; // Pitch down
        if (keys['ArrowDown']) elevator = 1; // Pitch up
        
        let localControlEffect = Math.min(1.0, speed / 5.0);
        if (keys['ArrowLeft'] || keys['KeyA'] || keys['a']) {
            aileron = 1; // Roll left
            // Ground steering
            if (planeGroup.position.y <= 2) {
                angularVelocity.y += 0.002 * localControlEffect;
            }
        } else if (keys['ArrowRight'] || keys['KeyD'] || keys['d']) {
            aileron = -1; // Roll right
            // Ground steering
            if (planeGroup.position.y <= 2) {
                angularVelocity.y -= 0.002 * localControlEffect;
            }
        } else {
            // Auto-level roll when keys are released
            let right = new THREE.Vector3(1, 0, 0).applyQuaternion(planeGroup.quaternion);
            let up = new THREE.Vector3(0, 1, 0).applyQuaternion(planeGroup.quaternion);
            let rollError = right.y;
            if (up.y < 0) rollError = Math.sign(rollError || 1) * 1.0; // recover if upside down
            
            // Apply a very gentle auto-level force so it doesn't violently snap back
            aileron = rollError * 0.4; 
        }
    }

    // Control surface effectiveness (0 when stopped, maxes out quickly as you gain speed)
    let controlEffect = Math.min(1.0, speed / 5.0);
    if (planeGroup.position.y <= 2 && speed < 0.5) controlEffect = 0; // No steering if stopped on ground
    
    // Apply angular acceleration (consistent at all flying speeds, much softer)
    angularVelocity.x += elevator * controlEffect * 0.001 * MANEUVER_MULTIPLIER;
    angularVelocity.z += aileron * controlEffect * 0.001 * MANEUVER_MULTIPLIER;
    
    // Air damping (smoother friction on rotation)
    angularVelocity.multiplyScalar(0.92);
    
    // (Redundant drag removed to allow the plane to reach 200 speed)
    
    // Max speed cap
    if (planeVelocity.length() > MAX_SPEED_CAP) {
        planeVelocity.setLength(MAX_SPEED_CAP);
    }
    
    // Animate landing gear
    const targetGearRot = gearDown ? 0 : -Math.PI / 2;
    landingGearGroup.rotation.x += (targetGearRot - landingGearGroup.rotation.x) * 0.05;
    
    // Hide wheels when fully retracted
    if (!gearDown && Math.abs(landingGearGroup.rotation.x - targetGearRot) < 0.1) {
        landingGearGroup.visible = false;
    } else {
        landingGearGroup.visible = true;
    }

    // Apply rotation
    planeGroup.rotateX(angularVelocity.x);
    planeGroup.rotateZ(angularVelocity.z);
    
    // Coordinated turn approximation (yaw from bank angle)
    let rightY = Math.max(-1, Math.min(1, new THREE.Vector3(1,0,0).applyQuaternion(planeGroup.quaternion).y));
    let bankAngle = Math.asin(rightY);
    // Constant turning factor, reduced so it turns realistically without snapping
    if (!isNaN(bankAngle)) planeGroup.rotateY(-bankAngle * 0.006);

    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(planeGroup.quaternion);
    const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(planeGroup.quaternion);
    
    // Thrust overrides from emergencies
    if (activeEmergencies.fuel_empty && emergencyState.fuelTimer <= 0) {
        planeThrottle = 0;
    } else if (activeEmergencies.engine_explosion) {
        planeThrottle = Math.min(planeThrottle, MAX_THROTTLE * 0.4);
    }

    // Thrust
    // Scale thrust relative to how fast the plane is supposed to be (much faster acceleration now)
    let thrustAccel = (planeThrottle / MAX_THROTTLE) * 0.6 * (MAX_SPEED_CAP / 20.0);
    planeVelocity.add(forwardVector.clone().multiplyScalar(thrustAccel));

    // Realistic Lift & Drag
    let forwardSpeed = planeVelocity.dot(forwardVector);
    let verticalSpeed = planeVelocity.dot(upVector); // relative to plane
    
    // Angle of Attack (AoA) approximation
    let aoa = 0;
    if (forwardSpeed > 0.1) {
        aoa = Math.atan2(-verticalSpeed, forwardSpeed);
    }
    
    // Lift is proportional to speed^2 and AoA. 
    // If on the ground, don't apply base lift unless pitched up explicitly
    let displaySpeed = speed * 10;
    let effectiveBaseLift = BASE_LIFT;
    if (planeGroup.position.y <= 2.5 && displaySpeed < 25 && forwardVector.y <= 0.05) {
        effectiveBaseLift = 0;
    }
    
    let liftCoefficient = effectiveBaseLift + aoa * 0.1;
    if (liftCoefficient < 0) liftCoefficient = 0;
    
    let liftAccel = forwardSpeed * forwardSpeed * liftCoefficient;
    
    // Automatic takeoff for ALL planes at 25 knots
    if (planeGroup.position.y <= 2.5 && displaySpeed >= 25) {
        if (liftAccel <= GRAVITY) liftAccel = GRAVITY + 0.02; // Ensure we beat gravity
        angularVelocity.x += 0.001; // Gently pitch nose up
    }
    
    planeVelocity.add(upVector.clone().multiplyScalar(liftAccel));

    // Induced Drag from Lift/AoA
    let inducedDrag = Math.abs(aoa) * 0.05 * forwardSpeed;
    
    // Parasitic drag
    let parasiticDrag = speed * speed * 0.0003;

    // Apply drag opposite to velocity
    if (speed > 0) {
        let dragForce = (parasiticDrag + inducedDrag);
        let dragVector = planeVelocity.clone().normalize().multiplyScalar(-dragForce);
        planeVelocity.add(dragVector);
    }

    // Gravity
    planeVelocity.y -= GRAVITY;

    // Move plane
    planeGroup.position.add(planeVelocity);

    // Track takeoff
    if (planeGroup.position.y > 10) {
        hasTakenOff = true;
    }
    
    } // --- AIRPLANE PHYSICS END ---
    
    // Wing Strike Detection
    planeGroup.updateMatrixWorld();
    const leftWingLocal = new THREE.Vector3(wingSpanX, 0, wingOffsetZ);
    const rightWingLocal = new THREE.Vector3(-wingSpanX, 0, wingOffsetZ);
    const leftWingWorld = leftWingLocal.applyMatrix4(planeGroup.matrixWorld);
    const rightWingWorld = rightWingLocal.applyMatrix4(planeGroup.matrixWorld);
    
    if (leftWingWorld.y <= 0 || rightWingWorld.y <= 0) {
        if (speed > 1.0 && (Date.now() - startTime > 2000)) { // 10 knots is enough for crash
            triggerCrash("Crash! Wing Strike!");
            return;
        }
    }
    
    // Building Collision
    for (let i = 0; i < buildings.length; i++) {
        let b = buildings[i];
        if (b.userData.onFire) continue; // Already destroyed
        
        let dx = planeGroup.position.x - b.position.x;
        let dz = planeGroup.position.z - b.position.z;
        let distSq = dx * dx + dz * dz;
        
        if (b.userData.isMountain) {
            if (planeGroup.position.y < b.userData.height) {
                let r = 500 * Math.max(b.userData.originalScale.x / 10, b.userData.originalScale.z / 10);
                let radiusAtHeight = r * (1 - (planeGroup.position.y / b.userData.height));
                if (distSq < radiusAtHeight * radiusAtHeight) {
                    triggerCrash("Crash! Hit a mountain!");
                    return;
                }
            }
        } else {
            if (distSq < 150) { // Rough radius check for buildings
                if (planeGroup.position.y < b.userData.height + 5) {
                    if (Date.now() - startTime > 2000) {
                        b.userData.onFire = true;
                        triggerCrash("Crash! Hit a building!");
                        return;
                    }
                }
            }
        }
    }
    
    // Civilian Car Collision
    for (let c of civCars) {
        if (!c.mesh.visible) continue;
        let dx = planeGroup.position.x - c.mesh.position.x;
        let dz = planeGroup.position.z - c.mesh.position.z;
        if (dx*dx + dz*dz < 150 && planeGroup.position.y < 8) {
            c.mesh.visible = false;
            // Spawn an extra fire where the car was
            let fire = new THREE.Sprite(globalFireMat.clone());
            fire.scale.set(10, 15, 1);
            fire.position.copy(c.mesh.position);
            scene.add(fire);
            grassFires.push(fire);
            
            triggerCrash("Crash! Hit a civilian car!");
            return;
        }
    }

    // Ground Collision
    if (planeGroup.position.y <= 2) {
        planeGroup.position.y = 2; 
        
        const localForwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(planeGroup.quaternion);
        
        let sinkRate = -planeVelocity.y;
        let rightY = Math.max(-1, Math.min(1, new THREE.Vector3(1,0,0).applyQuaternion(planeGroup.quaternion).y));
        let bank = Math.abs(Math.asin(rightY));
        let fwdY = Math.max(-1, Math.min(1, localForwardVector.y));
        let pitch = Math.abs(Math.asin(fwdY));

        let isCrashed = false;
        let reason = "";
        if (sinkRate > 2.0) { isCrashed = true; reason = `Sink rate: ${sinkRate.toFixed(2)}`; }
        if (bank > 0.6) { isCrashed = true; reason = `Bank: ${bank.toFixed(2)}`; }
        if (pitch > 0.6) { isCrashed = true; reason = `Pitch: ${pitch.toFixed(2)}`; }
        if (!gearDown && landingGearGroup.rotation.x < -0.1) {
            isCrashed = true; reason = "Belly landing (Gear UP!)";
        }

        // Give a 2 second grace period on spawn before allowing a crash
        if (isCrashed && (Date.now() - startTime > 2000)) {
            triggerCrash(`Crash! ${reason}`);
        } else {
            planeVelocity.y = 0; 
            planeVelocity.multiplyScalar(0.97); // Ground friction
            
            angularVelocity.set(0,0,0);
            // Settle on ground
            planeGroup.rotation.x *= 0.9;
            planeGroup.rotation.z *= 0.9;
            
            if (hasTakenOff && speed < 0.1 && planeThrottle === 0) {
                let absX = Math.abs(planeGroup.position.x);
                let zPos = planeGroup.position.z;
                if (absX < 50 && zPos > -4000 && zPos < 4000) {
                    win("Landed Successfully on the runway!");
                } else {
                    win("Safely Landed (but off the runway).");
                }
            }
        }
    }
    
    // Update Alarms (Stall / Pull Up / Air Speed Low)
    if (gameState === 'playing' && !playerMode) {
        // Check alarms
        let isStall = false;
        let isPullUp = false;
        let isLowSpeed = false;
        let isGears = false;
        
        let altitudeFt = planeGroup.position.y * 10;
        
        // Pull Up logic: < 1000 ft AND descending fast
        if (altitudeFt < 1000 && planeVelocity.y < -1.0) {
            isPullUp = true;
        }
        
        // Speed logic (converted to knots)
        let displaySpeed = speed * 10;
        if (displaySpeed >= 1 && displaySpeed < STALL_SPEED) {
            isStall = true;
        } else if (displaySpeed >= STALL_SPEED && displaySpeed < LOW_SPEED_ALARM) {
            isLowSpeed = true;
        }
        
        // Gears logic: < 500 ft AND gear UP (only if plane actually has gears!)
        if (HAS_RETRACTABLE_GEAR && altitudeFt < 500 && !gearDown) {
            isGears = true;
        }
        
        updateAlarms(isStall, isPullUp, isLowSpeed, isGears);
    } else {
        updateAlarms(false, false, false, false);
    }
}

function playGearsSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function updateAlarms(isStall, isPullUp, isLowSpeed, isGears) {
    const stallEl = document.getElementById('stall-text');
    const pullUpEl = document.getElementById('pullup-text');
    const airSpeedEl = document.getElementById('airspeed-text');
    const gearsEl = document.getElementById('gears-text');
    
    // Priorities
    if (isStall) {
        isPullUp = false;
        isLowSpeed = false;
    } else if (isPullUp) {
        isLowSpeed = false;
    }
    
    alarmTimer += 0.016; 
    
    if (isPullUp) {
        if (pullUpEl) pullUpEl.style.display = 'block';
        let pulse = (alarmTimer % 0.15) < 0.075;
        if (pullUpEl) pullUpEl.style.color = pulse ? "red" : "yellow";
        if (alarmOsc && alarmGain && audioCtx) {
            if (pulse) {
                let t = (alarmTimer % 0.075) / 0.075; 
                alarmOsc.frequency.setValueAtTime(400 + t * 400, audioCtx.currentTime);
                alarmGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            } else {
                alarmGain.gain.setValueAtTime(0, audioCtx.currentTime);
            }
        }
    } else {
        if (pullUpEl) pullUpEl.style.display = 'none';
        if (alarmGain && audioCtx) {
            alarmGain.gain.cancelScheduledValues(audioCtx.currentTime);
            alarmGain.gain.value = 0;
        }
    }
    
    if (isStall) {
        if (stallEl) stallEl.style.display = 'block';
        let pulse = (alarmTimer % 0.08) < 0.04;
        if (stallEl) stallEl.style.color = pulse ? "red" : "white";
        if (stallOsc && stallGain && audioCtx) {
            stallOsc.frequency.setValueAtTime(300, audioCtx.currentTime);
            stallGain.gain.setValueAtTime(pulse ? 0.2 : 0, audioCtx.currentTime);
        }
    } else {
        if (stallEl) stallEl.style.display = 'none';
        if (stallGain && audioCtx) {
            stallGain.gain.cancelScheduledValues(audioCtx.currentTime);
            stallGain.gain.value = 0;
        }
    }
    
    if (isLowSpeed) {
        if (airSpeedEl) airSpeedEl.style.display = 'block';
        let pulse = (alarmTimer % 0.25) < 0.125;
        if (airSpeedEl) airSpeedEl.style.color = pulse ? "orange" : "white";
        if (airSpeedOsc && airSpeedGain && audioCtx) {
            airSpeedOsc.frequency.setValueAtTime(440, audioCtx.currentTime);
            airSpeedGain.gain.setValueAtTime(pulse ? 0.2 : 0, audioCtx.currentTime);
        }
    } else {
        if (airSpeedEl) airSpeedEl.style.display = 'none';
        if (airSpeedGain && audioCtx) {
            airSpeedGain.gain.cancelScheduledValues(audioCtx.currentTime);
            airSpeedGain.gain.value = 0;
        }
    }
    
    if (isGears) {
        if (gearsEl) gearsEl.style.display = 'block';
        let now = Date.now();
        if (now - gearsAlarmTimer > 600) { 
            playGearsSound();
            gearsAlarmTimer = now;
        }
    } else {
        if (gearsEl) gearsEl.style.display = 'none';
    }
}

function triggerCrash(msg) {
    gameState = 'crashed';
    waterCrash = (planeGroup.position.z <= -35000);
    crashResponseState = waterCrash ? 'water_rescue' : 'firefighting';
    
    // Scale impact by speed (assume speed affects camera shake)
    let impactForce = Math.min(30, Math.max(5, planeVelocity.length() * 2));
    cameraShake = impactForce * CRASH_SCALE; // Activate camera shake
    
    // Hard stop all alarms
    if (audioCtx) {
        if (alarmGain) { alarmGain.gain.cancelScheduledValues(audioCtx.currentTime); alarmGain.gain.value = 0; }
        if (stallGain) { stallGain.gain.cancelScheduledValues(audioCtx.currentTime); stallGain.gain.value = 0; }
        if (airSpeedGain) { airSpeedGain.gain.cancelScheduledValues(audioCtx.currentTime); airSpeedGain.gain.value = 0; }
    }
    
    const messageEl = document.getElementById('message');
    if (messageEl) messageEl.innerText = '';
    const rstBtn2 = document.getElementById('restart-btn');
    if (rstBtn2) rstBtn2.style.display = 'none';
    const skipAmb = document.getElementById('skip-amb-btn');
    if (skipAmb) skipAmb.style.display = 'none';
    const hosp = document.getElementById('hospital-choice');
    if (hosp) hosp.style.display = 'none';
    
    const antiIce = document.getElementById('anti-ice-container');
    if (antiIce) antiIce.style.display = 'none';
    const emMenu = document.getElementById('emergency-menu');
    if (emMenu) emMenu.style.display = 'none';
    const wMenu = document.getElementById('weather-menu');
    if (wMenu) wMenu.style.display = 'none';
    const pStatus = document.getElementById('plane-status-display');
    if (pStatus) pStatus.style.display = 'none';
    const mobCtrl = document.getElementById('mobile-controls');
    if (mobCtrl) mobCtrl.style.display = 'none';
    
    playCrashSound();
    
    passengerMeshes.forEach(p => scene.remove(p.mesh));
    passengerMeshes = [];
    
    let planeSelector = document.getElementById('plane-select');
    let pType = planeSelector ? planeSelector.value : 'cessna';
    let pCount = PLANE_PASSENGERS[pType] || 0;
    
    for (let i = 0; i < pCount; i++) {
        let pass = createHumanoid(0x3498db, 0x2c3e50, null, false);
        pass.position.copy(planeGroup.position);
        pass.position.y = 0.5;
        pass.rotation.x = -Math.PI / 2;
        pass.rotation.z = Math.random() * Math.PI * 2;
        passengerMeshes.push({ mesh: pass, rescued: false, claimed: false });
    }
    
    if (waterCrash) {
        planeGroup.visible = true; // Sinks in animate
        
        // Massive water splash particle effect!
        let splashCount = Math.floor(150 * CRASH_SCALE);
        for(let i=0; i<splashCount; i++) {
            let mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
            let size = Math.random() * 4 + 1;
            let geo = new THREE.BoxGeometry(size, size, size);
            let drop = new THREE.Mesh(geo, mat);
            drop.position.copy(planeGroup.position);
            drop.position.y = 5; // Water level
            
            // Blast outwards and upwards
            let angle = Math.random() * Math.PI * 2;
            let outwardSpeed = (Math.random() * 15 + 5) * CRASH_SCALE;
            let upSpeed = (Math.random() * 20 + 10) * CRASH_SCALE;
            
            drop.userData.velocity = new THREE.Vector3(Math.cos(angle)*outwardSpeed, upSpeed, Math.sin(angle)*outwardSpeed);
            drop.userData.life = 1.0; // Decay rate
            scene.add(drop);
            waterSplashes.push(drop);
        }
        
        let raftCount = 1; let raftCapacity = 4;
        if (pType === 'airliner') { raftCount = 5; raftCapacity = 30; }
        else if (pType === 'cessna') { raftCount = 1; raftCapacity = 4; }
        else if (pType === 'biplane') { raftCount = 1; raftCapacity = 2; }
        else if (pType === 'f16') { raftCount = 1; raftCapacity = 1; }
        
        for (let i=0; i<raftCount; i++) {
            let raft = VehicleBuilder.createLifeRaft();
            let angle = Math.random() * Math.PI * 2;
            let dist = 10 + Math.random() * 20 * CRASH_SCALE;
            raft.position.set(planeGroup.position.x + Math.cos(angle) * dist, 5, planeGroup.position.z + Math.sin(angle) * dist);
            raft.userData.capacity = raftCapacity;
            scene.add(raft);
            lifeRafts.push(raft);
        }
        
        let allWaterPatients = [{ mesh: playerMesh, isPlayer: true, rescued: false, claimed: false }];
        passengerMeshes.forEach(p => allWaterPatients.push(p));
        
        let currRaftIdx = 0;
        allWaterPatients.forEach(p => {
            let raft = lifeRafts[currRaftIdx];
            raft.userData.passengers.push(p);
            p.mesh.position.set(raft.position.x + (Math.random()-0.5)*4, 5.5, raft.position.z + (Math.random()-0.5)*4);
            scene.add(p.mesh);
            p.mesh.visible = true;
            if (raft.userData.passengers.length >= raft.userData.capacity) {
                currRaftIdx = (currRaftIdx + 1) % lifeRafts.length;
            }
        });
        
        let totalPatients = allWaterPatients.length;
        let boatCount = Math.min(10, Math.ceil(totalPatients / 3));
        for (let i=0; i<boatCount; i++) {
            let boat = VehicleBuilder.createAmbulanceBoat();
            boat.position.set(planeGroup.position.x + (Math.random()-0.5)*100, 5, shoreZ - 100);
            scene.add(boat);
            ambulanceBoats.push(boat);
        }
        
        setTimeout(() => { startWaterRescueMission(totalPatients); }, 500);
        
    } else {
        planeGroup.visible = false;
        
        // Dynamic Particle Explosion instead of a static orange sphere
        let explosionCount = Math.floor(100 * CRASH_SCALE);
        for(let i=0; i<explosionCount; i++) {
            let fireSprite = new THREE.Sprite(globalFireMat.clone());
            fireSprite.scale.set(10, 10, 1);
            fireSprite.position.copy(planeGroup.position);
            fireSprite.position.y += Math.random() * 5;
            
            // Blast outwards in all directions
            let blastDir = new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.2)*2, (Math.random()-0.5)*2).normalize();
            let blastSpeed = (Math.random() * 15 + 5) * CRASH_SCALE;
            
            fireSprite.userData.velocity = blastDir.multiplyScalar(blastSpeed);
            fireSprite.userData.life = 1.0;
            fireSprite.userData.isExplosion = true;
            
            scene.add(fireSprite);
            smokeParticles.push(fireSprite);
        }
        
        grassFires.forEach(fire => scene.remove(fire));
        grassFires = [];
        
        for (let b of buildings) {
            if (b.userData.onFire) {
                let bFireCount = Math.floor(40 * CRASH_SCALE);
                for (let j = 0; j < bFireCount; j++) {
                    let fire = new THREE.Sprite(globalFireMat.clone());
                    fire.scale.set(8, 12, 1);
                    let bW = 22; let side = Math.random(); let offsetX = (Math.random() - 0.5) * bW; let offsetZ = (Math.random() - 0.5) * bW;
                    if (side < 0.25) offsetX = bW; else if (side < 0.5) offsetX = -bW; else if (side < 0.75) offsetZ = bW; else offsetZ = -bW;
                    let basey = b.position.y - b.userData.height / 2; let offsetY = Math.random() * b.userData.height;
                    fire.position.set(b.position.x + offsetX, basey + offsetY, b.position.z + offsetZ);
                    fire.userData.isBuildingFire = true; fire.userData.basey = basey; fire.userData.offsetY = offsetY; fire.userData.height = b.userData.height; fire.userData.speed = (0.5 + Math.random() * 1.5) * CRASH_SCALE;
                    scene.add(fire); grassFires.push(fire);
                }
            }
        }
        
        // Realistic metallic debris
        const metalColors = [0x222222, 0x444444, 0x111111, 0x333333, 0x555555];
        let debrisCount = Math.floor(60 * CRASH_SCALE); // More debris
        for(let i = 0; i < debrisCount; i++) {
            let mat = new THREE.MeshPhongMaterial({ color: metalColors[Math.floor(Math.random() * metalColors.length)] });
            // Debris are flat, twisted shapes
            let geo = new THREE.BoxGeometry((Math.random() * 4 + 1) * CRASH_SCALE, (Math.random() * 0.5 + 0.1) * CRASH_SCALE, (Math.random() * 4 + 1) * CRASH_SCALE);
            let debris = new THREE.Mesh(geo, mat);
            debris.position.copy(planeGroup.position);
            
            // Powerful blast velocity
            debris.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 30 * CRASH_SCALE, (Math.random() * 20 + 10) * CRASH_SCALE, (Math.random() - 0.5) * 30 * CRASH_SCALE);
            debris.userData.rotationSpeed = new THREE.Vector3(Math.random()*0.5, Math.random()*0.5, Math.random()*0.5);
            debris.userData.onFire = Math.random() < 0.3; // Some debris are on fire!
            
            scene.add(debris); 
            crashDebris.push(debris);
        }
        
        passengerMeshes.forEach(p => {
            p.mesh.position.x += (Math.random() - 0.5) * 60 * CRASH_SCALE;
            p.mesh.position.z += (Math.random() - 0.5) * 60 * CRASH_SCALE;
            scene.add(p.mesh);
        });
        
        let ffCount = Math.max(1, Math.floor(3 * CRASH_SCALE));
        for (let i = 0; i < ffCount; i++) {
            let ffGroup = createHumanoid(0xe67e22, 0x2c3e50, 0xf1c40f, true);
            let angle = Math.random() * Math.PI * 2;
            ffGroup.position.set(planeGroup.position.x + Math.cos(angle) * 100, 0, planeGroup.position.z + Math.sin(angle) * 100);
            scene.add(ffGroup);
            firefighters.push({ mesh: ffGroup, leftArm: ffGroup.userData.leftArm, rightArm: ffGroup.userData.rightArm, leftLeg: ffGroup.userData.leftLeg, rightLeg: ffGroup.userData.rightLeg, waterJet: ffGroup.userData.waterJet, legTime: Math.random() * 5 });
        }
        
        let allPatientsCount = passengerMeshes.filter(p => !p.rescued).length + 1;
        let ambCount = Math.min(5, allPatientsCount);
        for (let i = 0; i < ambCount; i++) {
            let amb = VehicleBuilder.createAmbulance();
            amb.position.copy(planeGroup.position);
            let aAngle = Math.random() * Math.PI * 2;
            let aDist = 15 + Math.random() * 15;
            amb.position.x += Math.cos(aAngle) * aDist * CRASH_SCALE;
            amb.position.z += Math.sin(aAngle) * aDist * CRASH_SCALE;
            amb.lookAt(planeGroup.position);
            scene.add(amb);
            amb.userData.type = 'ambulance';
            amb.userData.passengers = [];
            amb.userData.state = 'waiting_at_scene';
            amb.userData.targetPatient = null;
            amb.userData.doorOpen = false;
            amb.userData.doorTimer = 0;
            firetrucks.push({
                mesh: amb,
                isAmbulance: true,
                state: amb.userData.state,
                passengers: amb.userData.passengers,
                targetPatient: amb.userData.targetPatient,
                doorOpen: amb.userData.doorOpen,
                doorTimer: amb.userData.doorTimer,
                sirenL: amb.userData.sirenL,
                sirenR: amb.userData.sirenR,
                wheels: amb.userData.wheels,
                sirenMat: amb.userData.sirenMat
            });
        }
        
        setTimeout(() => { startRescueMission(); }, 500);
        startFireSound();
        startSirenSound();
    }
}

function applyCameraShake() {
    if (cameraShake > 0) {
        camera.position.x += (Math.random() - 0.5) * cameraShake;
        camera.position.y += (Math.random() - 0.5) * cameraShake;
        camera.position.z += (Math.random() - 0.5) * cameraShake;
        cameraShake *= 0.9;
        if (cameraShake < 0.1) cameraShake = 0;
    }
}

function updateCamera() {
    // 0. Water Rescue Boat Mode
    if (crashResponseState === 'water_rescue' || crashResponseState === 'water_rescue_complete') {
        let playerBoat = ambulanceBoats.find(b => b.userData.claimedPassengers && b.userData.claimedPassengers.some(p => p.isPlayer));
        if (playerBoat && (playerBoat.userData.state === 'to_shore' || playerBoat.userData.state === 'boarding' || playerBoat.userData.state === 'unloading')) {
            // Give boat the same chase view as ambulance
            const cameraOffset = new THREE.Vector3(0, 8, 25).applyQuaternion(playerBoat.quaternion);
            camera.position.copy(playerBoat.position).add(cameraOffset);
            camera.lookAt(playerBoat.position.x, playerBoat.position.y + 4, playerBoat.position.z);
            applyCameraShake(); return;
        }
    }

    // 1. Ambulance Rescue Mode
    let amb = firetrucks.find(f => f.isAmbulance && f.isPlayerAmbulance);
    if (amb) {
        if (amb.state === 'picking_up' || amb.state === 'driving_to_hospital') {
            // Fixed 3rd person chase camera, "like driving a car"
            const cameraOffset = new THREE.Vector3(0, 8, 25).applyQuaternion(amb.mesh.quaternion);
            camera.position.copy(amb.mesh.position).add(cameraOffset);
            camera.lookAt(amb.mesh.position.x, amb.mesh.position.y + 4, amb.mesh.position.z);
            applyCameraShake(); return;
        } else if (amb.state === 'driving_to_crash') {
            // Look at the ambulance coming from the hospital
            camera.position.set(playerMesh.position.x, playerMesh.position.y + 0.5, playerMesh.position.z);
            camera.lookAt(amb.mesh.position);
            applyCameraShake(); return;
        }
    }

    // 2. Player Walking Mode
    if (playerMode) {
        camera.up.set(0, 1, 0); // Reset camera tilt
        
        // Arrow Key Zooming (Only when walking)
        if (keys['ArrowUp']) cameraZoomDist = Math.max(15, cameraZoomDist - 2);
        if (keys['ArrowDown']) cameraZoomDist = Math.min(200, cameraZoomDist + 2);
        
        let targetPos = new THREE.Vector3();
        playerMesh.getWorldPosition(targetPos);
        const camDist = cameraZoomDist * 0.4;
        const camX = targetPos.x + Math.sin(cameraAngleX) * Math.cos(cameraAngleY) * camDist;
        const camY = Math.max(0.5, targetPos.y + Math.sin(cameraAngleY) * camDist);
        const camZ = targetPos.z + Math.cos(cameraAngleX) * Math.cos(cameraAngleY) * camDist;
        camera.position.set(camX, camY, camZ);
        camera.lookAt(targetPos.x, targetPos.y + 1, targetPos.z);
        applyCameraShake(); return;
    }

    // 3. Airplane Crashed Mode (Orbital)
    if (gameState === 'crashed' && !playerMode && crashResponseState !== 'water_rescue' && crashResponseState !== 'ambulance_rescue') {
        const time = Date.now() * 0.001;
        let targetPosition = planeGroup.position.clone().add(new THREE.Vector3(Math.cos(time)*100, 50, Math.sin(time)*100));
        camera.position.lerp(targetPosition, 0.1);
        camera.lookAt(planeGroup.position);
        camera.up.set(0, 1, 0);
        applyCameraShake(); return;
    }

    // 4. Airplane Flying Mode (Smooth Third Person with Banking)
    const cameraOffset = new THREE.Vector3(0, cameraZoomDist * 0.25, cameraZoomDist); 
    cameraOffset.applyQuaternion(planeGroup.quaternion);
    let targetPosition = planeGroup.position.clone().add(cameraOffset);
    camera.position.lerp(targetPosition, 0.1);
    
    const lookAhead = new THREE.Vector3(0, 0, -100);
    lookAhead.applyQuaternion(planeGroup.quaternion);
    const lookTarget = planeGroup.position.clone().add(lookAhead);
    
    const currentLookTarget = new THREE.Vector3();
    camera.getWorldDirection(currentLookTarget);
    currentLookTarget.add(camera.position); 
    currentLookTarget.lerp(lookTarget, 0.1);
    camera.lookAt(currentLookTarget);
    
    // Prevent the camera from clipping under the ground
    if (camera.position.y < 2) camera.position.y = 2;
 
    applyCameraShake();   
    // Match the camera roll (up vector) to the plane's up vector
    const planeUp = new THREE.Vector3(0, 1, 0).applyQuaternion(planeGroup.quaternion);
    camera.up.lerp(planeUp, 0.1);
}
function updateUI() {
    const isCrashedOrWalking = (gameState === 'crashed' || playerMode);
    
    // Hide flight stats, but keep main UI container visible for prompts
    const statsDiv = document.getElementById('stats');
    if (statsDiv) statsDiv.style.display = isCrashedOrWalking ? 'none' : 'grid';
    
    const gyroDiv = document.getElementById('gyro-container');
    if (gyroDiv) gyroDiv.style.display = isCrashedOrWalking ? 'none' : 'block';
    
    const apMenu = document.getElementById('autopilot-menu');
    if (apMenu) apMenu.style.display = (isCrashedOrWalking || !autopilot || isMobileMode) ? 'none' : 'block';

    throttleEl.innerText = Math.round(planeThrottle);
    let speed = planeVelocity.length();
    speedEl.innerText = Math.round(speed * 10);
    let alt = planeGroup.position.y - 2;
    altEl.innerText = Math.max(0, Math.round(alt));
    
    const vspeedEl = document.getElementById('vspeed-val');
    if (vspeedEl) vspeedEl.innerText = Math.round(planeVelocity.y * 600);
    
    let euler = new THREE.Euler().setFromQuaternion(planeGroup.quaternion, 'YXZ');
    let heading = (euler.y * 180 / Math.PI) % 360;
    if (heading < 0) heading += 360;
    headingEl.innerText = Math.round(heading);
    
    const gearEl = document.getElementById('gear-val');
    if (gearEl) {
        gearEl.innerText = gearDown ? 'DOWN' : 'UP';
        gearEl.style.color = gearDown ? '#27ae60' : '#e74c3c';
    }
    
    apStatusEl.innerText = `Autopilot: ${autopilot ? 'ON' : 'OFF'}`;
    apStatusEl.style.color = autopilot ? '#2ecc71' : '#e74c3c';
    
    // Update Gyroscope
    const gyroHorizon = document.getElementById('gyro-horizon');
    if (gyroHorizon) {
        // Initialize pitch ladder once
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
                line.style.background = 'rgba(255,255,255,0.8)';
                line.style.fontFamily = 'sans-serif';
                line.style.fontSize = '8px';
                line.style.fontWeight = 'bold';
                line.style.color = 'white';
                line.style.textShadow = '1px 1px 0 #000';
                line.innerHTML = `<span style="position:absolute; left: ${i%30===0? '45px':'25px'}; top:-4px;">${Math.abs(i)}&deg;</span>`;
                gyroHorizon.appendChild(line);
            }
        }
        
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(planeGroup.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(planeGroup.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(planeGroup.quaternion);
        
        let pitchAngle = Math.asin(Math.max(-1, Math.min(1, fwd.y)));
        let rollAngle = Math.atan2(-right.y, up.y); // Negative so right bank rotates horizon left
        
        // Translate horizon for pitch (1 radian ~ 50px)
        let translateY = pitchAngle * 50; 
        
        // Apply transformations: Rotate first, then translate vertically in the rotated space
        gyroHorizon.style.transform = `rotate(${rollAngle}rad) translateY(${translateY}px)`;
    }
}

function win(msg) {
    gameState = 'landed';
    const messageEl = document.getElementById('message');
    messageEl.innerText = msg;
    messageEl.style.color = '#27ae60';
    document.getElementById('restart-btn').style.display = 'block';
    playWinSound();
}




// --- EMERGENCY FUNCTIONS ---

function updateStatusDisplay() {
    // Reset all colors
    document.querySelectorAll('.status-part').forEach(el => {
        el.classList.remove('status-red');
    });
    
    // Fire
    const fireIcon = document.getElementById('status-fire-icon');
    if (activeEmergencies.fire && emergencyState.firePart) {
        document.getElementById('status-' + emergencyState.firePart).classList.add('status-red');
        fireIcon.style.display = 'block';
        
        // Position fire icon based on part
        let x=50, y=50;
        switch(emergencyState.firePart) {
            case 'left-wing': x=25; y=65; break;
            case 'right-wing': x=75; y=65; break;
            case 'left-engine': x=29; y=67; break;
            case 'right-engine': x=71; y=67; break;
            case 'fuselage': x=50; y=55; break;
            case 'tail': x=50; y=100; break;
        }
        fireIcon.setAttribute('x', x);
        fireIcon.setAttribute('y', y);
    } else {
        fireIcon.style.display = 'none';
    }
    
    // Engine Explosion
    if (activeEmergencies.engine_explosion) {
        document.getElementById('status-left-engine').classList.add('status-red');
    }
    
    // Gears
    if (activeEmergencies.gears) {
        document.querySelectorAll('.status-gear').forEach(el => el.classList.add('status-red'));
    }
    
    // Wing Damage
    if (activeEmergencies.wing_damage && emergencyState.damagedWing) {
        document.getElementById('status-' + emergencyState.damagedWing + '-wing').classList.add('status-red');
    }
}

function triggerEmergency(type) {
    if (gameState !== 'playing') return;
    
    // Reset any previous time-based UI
    document.getElementById('weather-alert').style.display = 'none';
    
    if (type === 'fire') {
        activeEmergencies.fire = true;
        emergencyState.fireTimer = 180 * 30; // 3 mins * 30fps
        moveFire();
    } 
    else if (type === 'gears') {
        activeEmergencies.gears = true;
        gearDown = false; // force up
    }
    else if (type === 'engine_explosion') {
        activeEmergencies.engine_explosion = true;
        // create explosion particles here...
        if (explosionMat) {
            let exp = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), explosionMat.clone());
            exp.position.set(-6, 0, 0); // approx left engine
            planeGroup.add(exp);
            setTimeout(() => { planeGroup.remove(exp); }, 1000);
        }
    }
    else if (type === 'fuel_empty') {
        activeEmergencies.fuel_empty = true;
        emergencyState.fuelTimer = 60 * 30; // 1 minute
    }
    else if (type === 'fog_turbulence') {
        activeEmergencies.fog_turbulence = true;
        emergencyState.fogTimer = 180 * 30; // 3 mins
        emergencyState.fogNextAltitudeDrop = 300; // 10 secs
        scene.fog.density = 0.008; // heavy fog
        document.getElementById('weather-alert').style.display = 'block';
    }
    else if (type === 'wing_damage') {
        activeEmergencies.wing_damage = true;
        emergencyState.damagedWing = Math.random() < 0.5 ? 'left' : 'right';
    }
    
    uiManager.updateStatusDisplay(activeEmergencies, emergencyState);
}

function moveFire() {
    const parts = ['left-wing', 'right-wing', 'left-engine', 'right-engine', 'fuselage', 'tail'];
    emergencyState.firePart = parts[Math.floor(Math.random() * parts.length)];
    
    // Create or move 3D particle system
    if (!emergencyState.fireParticleSystem) {
        const fireGeo = new THREE.BufferGeometry();
        const fireCount = 100;
        const posArray = new Float32Array(fireCount * 3);
        for(let i=0; i<fireCount*3; i++) {
            posArray[i] = (Math.random() - 0.5) * 5;
        }
        fireGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const fireMat = new THREE.PointsMaterial({
            size: 8, color: 0xffaa00, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
        });
        emergencyState.fireParticleSystem = new THREE.Points(fireGeo, fireMat);
        planeGroup.add(emergencyState.fireParticleSystem);
    }
    
    // Set local position based on part
    let lp = emergencyState.fireParticleSystem.position;
    switch(emergencyState.firePart) {
        case 'left-wing': lp.set(-15, 0, 0); break;
        case 'right-wing': lp.set(15, 0, 0); break;
        case 'left-engine': lp.set(-8, -2, 5); break;
        case 'right-engine': lp.set(8, -2, 5); break;
        case 'fuselage': lp.set(0, 3, 0); break;
        case 'tail': lp.set(0, 5, 20); break;
    }
    
    uiManager.updateStatusDisplay(activeEmergencies, emergencyState);
}

function updateEmergencies() {
    if (gameState !== 'playing') return;
    
    // Update emergency menu lock state
    const emMenu = document.getElementById('emergency-menu');
    if (emMenu) {
        let locked = (emergencyState.fireTimer > 0) || (emergencyState.fuelTimer > 0) || (emergencyState.fogTimer > 0);
        emMenu.style.display = (locked || isMobileMode) ? 'none' : 'block';
    }

    // 1. Fire logic
    if (activeEmergencies.fire) {
        emergencyState.fireTimer--;
        
        // Randomly move fire every 5-10 seconds
        if (Math.random() < 0.003) {
            moveFire();
        }
        
        // Animate particles
        if (emergencyState.fireParticleSystem) {
            const positions = emergencyState.fireParticleSystem.geometry.attributes.position.array;
            for(let i=1; i<positions.length; i+=3) {
                positions[i] += 0.5; // move up
                if (positions[i] > 10) {
                    positions[i] = 0; // reset
                    positions[i-1] = (Math.random() - 0.5) * 5;
                    positions[i+1] = (Math.random() - 0.5) * 5;
                }
            }
            emergencyState.fireParticleSystem.geometry.attributes.position.needsUpdate = true;
        }
        
        if (emergencyState.fireTimer <= 0) {
            // Fail state
            triggerCrash();
        }
    }
    
    // 2. Engine explosion
    if (activeEmergencies.engine_explosion) {
        // Asymmetric thrust -> yaw
        planeGroup.rotateY(0.001); 
        // Throttle limited (will do this in animate loop / updatePhysics)
    }
    
    // 3. Fuel empty
    if (activeEmergencies.fuel_empty) {
        if (emergencyState.fuelTimer > 0) {
            emergencyState.fuelTimer--;
        } else {
            planeThrottle = 0; // Engine stops
        }
    }
    
    // 4. Fog & Turbulence
    if (activeEmergencies.fog_turbulence) {
        emergencyState.fogTimer--;
        
        // Update UI timer
        let secs = Math.ceil(emergencyState.fogTimer / 30);
        let m = Math.floor(secs / 60);
        let s = secs % 60;
        document.getElementById('weather-alert-time').innerText = `Time remaining: ${m}:${s < 10 ? '0'+s : s}`;
        
        // Turbulence
        planeGroup.rotateZ((Math.random() - 0.5) * 0.05);
        planeGroup.rotateX((Math.random() - 0.5) * 0.02);
        
        emergencyState.fogNextAltitudeDrop--;
        if (emergencyState.fogNextAltitudeDrop <= 0) {
            if (planeGroup.position.y > 500) {
                planeGroup.position.y -= 500;
            }
            emergencyState.fogNextAltitudeDrop = 300; // 10 secs
        }
        
        if (emergencyState.fogTimer <= 0) {
            activeEmergencies.fog_turbulence = false;
            scene.fog.density = 0.0015;
            document.getElementById('weather-alert').style.display = 'none';
        }
    }
    
    // 5. Wing damage
    if (activeEmergencies.wing_damage) {
        if (emergencyState.damagedWing === 'left') {
            planeGroup.rotateZ(0.003); // banks left
        } else {
            planeGroup.rotateZ(-0.003); // banks right
        }
    }
    
    // Overrides
    if (activeEmergencies.gears) {
        gearDown = false;
    }
}

// UI Listeners
const btnTriggerEm = document.getElementById('btn-trigger-emergency');
if (btnTriggerEm) {
    btnTriggerEm.addEventListener('click', () => {
        const sel = document.getElementById('emergency-select') as HTMLSelectElement | null;
        let type = sel ? sel.value : 'none';
        if (type !== 'none') triggerEmergency(type);
    });
}

const btnRandEm = document.getElementById('btn-random-emergency');
if (btnRandEm) {
    btnRandEm.addEventListener('click', () => {
        const types = ['fire', 'gears', 'engine_explosion', 'fuel_empty', 'fog_turbulence', 'wing_damage'];
        let type = types[Math.floor(Math.random() * types.length)];
        const sel = document.getElementById('emergency-select') as HTMLSelectElement | null;
        if (sel) sel.value = type;
        triggerEmergency(type);
    });
}



buildPlane('cessna');
animate();

// --- INTRO & MOBILE LOGIC ---

document.getElementById('btn-intro-mobile').addEventListener('click', () => {
    document.getElementById('intro-platform').style.display = 'none';
    document.getElementById('intro-mobile-ins').style.display = 'block';
});

document.getElementById('btn-intro-pc').addEventListener('click', () => {
    document.getElementById('intro-platform').style.display = 'none';
    document.getElementById('intro-pc-ins').style.display = 'block';
});

document.getElementById('btn-start-mobile').addEventListener('click', () => {
    document.getElementById('intro-overlay').style.display = 'none';
    document.getElementById('mobile-controls').style.display = 'block';
    isMobileMode = true;
    gameState = 'playing';
    
    // Clean up UI for mobile
    let ui = document.getElementById('ui');
    if (ui) {
        ui.style.background = 'transparent';
        ui.style.boxShadow = 'none';
        ui.querySelectorAll('h1, p').forEach(el => (el as HTMLElement).style.display = 'none');
    }
    
    let emMenu = document.getElementById('emergency-menu');
    if (emMenu) emMenu.style.display = 'none';
    
    let wMenu = document.getElementById('weather-menu');
    if (wMenu) wMenu.style.display = 'none';
    
    let apMenu = document.getElementById('autopilot-menu');
    if (apMenu) apMenu.style.display = 'none';
    
    let iceMenu = document.getElementById('anti-ice-container');
    if (iceMenu) iceMenu.style.display = 'none';
    
    let planeSel = document.getElementById('plane-select');
    if (planeSel && planeSel.parentElement) planeSel.parentElement.style.display = 'none';
    
    let stats = document.getElementById('stats');
    if (stats) {
        // Force stats to single column for cleaner look on mobile
        stats.style.gridTemplateColumns = '1fr';
        Array.from(stats.children).forEach(child => {
            let html = child.innerHTML.toLowerCase();
            // Hide everything except Speed and Altitude
            if (html.includes('throttle-val') || html.includes('vspeed-val') || 
                html.includes('heading-val') || html.includes('gear-val') || 
                html.includes('ap-status') || html.includes('autopilot |')) {
                (child as HTMLElement).style.display = 'none';
            }
        });
    }
});

document.getElementById('btn-start-pc').addEventListener('click', () => {
    document.getElementById('intro-overlay').style.display = 'none';
    gameState = 'playing';
});

// Map mobile buttons to key codes
const mobileBtnMapping = {
    'mob-up': 'ArrowUp',
    'mob-down': 'ArrowDown',
    'mob-left': 'ArrowLeft',
    'mob-right': 'ArrowRight',
    'mob-throttle-up': 'KeyW',
    'mob-throttle-down': 'KeyS'
};

for (let id in mobileBtnMapping) {
    let btn = document.getElementById(id);
    if (!btn) continue;
    let key = mobileBtnMapping[id];
    
    let pressFn = (e) => {
        e.preventDefault();
        keys[key] = true;
        btn.style.background = btn.style.background.replace('0.5', '0.9'); // highlight
    };
    let releaseFn = (e) => {
        e.preventDefault();
        keys[key] = false;
        btn.style.background = btn.style.background.replace('0.9', '0.5'); // un-highlight
    };
    
    btn.addEventListener('mousedown', pressFn);
    btn.addEventListener('touchstart', pressFn, {passive: false});
    btn.addEventListener('mouseup', releaseFn);
    btn.addEventListener('mouseleave', releaseFn);
    btn.addEventListener('touchend', releaseFn, {passive: false});
}
