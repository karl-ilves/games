import * as THREE from 'three';
import { PlacedObject, SeaConfig, SceneSnapshot, PlayTestSnapshot, StudioToolMode, PullEdgeAxis, ScreenElement } from '../types';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { InGameEmotesWidget } from '../../../shared/avatar/InGameEmotesWidget';

export let scene: THREE.Scene;
export function setScene(s: THREE.Scene) { scene = s; }

export let camera: THREE.PerspectiveCamera;
export function setCamera(c: THREE.PerspectiveCamera) { camera = c; }

export let renderer: THREE.WebGLRenderer;
export function setRenderer(r: THREE.WebGLRenderer) { renderer = r; }

export let clock: THREE.Clock = new THREE.Clock();

export let isPlayTestMode = false;
export function setPlayTestMode(val: boolean) { isPlayTestMode = val; }

export let placedObjects: PlacedObject[] = [];
export function setPlacedObjects(val: PlacedObject[]) { placedObjects = val; }

export let screenElements: ScreenElement[] = [];
export function setScreenElements(val: ScreenElement[]) { screenElements = val; }

export let selectedObject: PlacedObject | null = null;
export function setSelectedObject(val: PlacedObject | null) { selectedObject = val; }

export let isTeleporting = false;
export function setIsTeleporting(val: boolean) { isTeleporting = val; }

export let playerHealth = 100;
export function setPlayerHealth(val: number) { playerHealth = val; }

export let playerMaxHealth = 100;
export function setPlayerMaxHealth(val: number) { playerMaxHealth = val; }

export let isHealthVisible = true;
export function setIsHealthVisible(val: boolean) { isHealthVisible = val; }

export let playerCoins = 0;
export function setPlayerCoins(val: number) { playerCoins = val; }

export let isCoinsVisible = true;
export function setIsCoinsVisible(val: boolean) { isCoinsVisible = val; }

export let playerAsma = 100;
export function setPlayerAsma(val: number) { playerAsma = val; }

export let playerMaxAsma = 100;
export function setPlayerMaxAsma(val: number) { playerMaxAsma = val; }

export let isAsmaVisible = true;
export function setIsAsmaVisible(val: boolean) { isAsmaVisible = val; }

export let playerInventory: Array<{ id: string; name: string; icon: string; type: string; objectRef?: any; gripOffset?: any }> = [];
export function setPlayerInventory(val: any[]) { playerInventory = val; }

export let equippedInventoryIndex = -1;
export function setEquippedInventoryIndex(val: number) { equippedInventoryIndex = val; }

export let activeQuest: any = null;
export function setActiveQuest(val: any) { activeQuest = val; }

export let checkpointPosition = new THREE.Vector3(0, 0, 0);

export let isGameFinished = false;
export function setIsGameFinished(val: boolean) { isGameFinished = val; }

export let isGameOver = false;
export function setIsGameOver(val: boolean) { isGameOver = val; }

export let playerAttackDamage = 25;
export function setPlayerAttackDamage(val: number) { playerAttackDamage = val; }

export let lastAttackTime = 0;
export function setLastAttackTime(val: number) { lastAttackTime = val; }

export let isCombatSystemEnabled = false;
export function setIsCombatSystemEnabled(val: boolean) { isCombatSystemEnabled = val; }

export let isMoneySystemEnabled = false;
export function setIsMoneySystemEnabled(val: boolean) { isMoneySystemEnabled = val; }

export let isYardsSystemEnabled = false;
export function setIsYardsSystemEnabled(val: boolean) { isYardsSystemEnabled = val; }

export let playerSpeedMultiplier = 1.0;
export function setPlayerSpeedMultiplier(val: number) { playerSpeedMultiplier = val; }

export let playerSpeedBoostEndTime = 0;
export function setPlayerSpeedBoostEndTime(val: number) { playerSpeedBoostEndTime = val; }

export let currentGameMaxPlayers = 8;
export function setCurrentGameMaxPlayers(val: number) { currentGameMaxPlayers = val; }

export let currentGameMinAge = 0;
export function setCurrentGameMinAge(val: number) { currentGameMinAge = val; }

export let currentGameAgeRating = '0+';
export function setCurrentGameAgeRating(val: string) { currentGameAgeRating = val; }

export let dirLight: THREE.DirectionalLight;
export function setDirLight(l: THREE.DirectionalLight) { dirLight = l; }

export let hemiLight: THREE.HemisphereLight;
export function setHemiLight(l: THREE.HemisphereLight) { hemiLight = l; }

export let currentEnvMode: 'day' | 'night' | 'sunset' | 'horror_fog' = 'day';
export function setCurrentEnvMode(val: any) { currentEnvMode = val; }

export let undoStack: SceneSnapshot[] = [];
export let redoStack: SceneSnapshot[] = [];

export let audioCtx: any = null;
export function setAudioCtx(val: any) { audioCtx = val; }

export let currentVehicle: PlacedObject | null = null;
export function setCurrentVehicle(val: PlacedObject | null) { currentVehicle = val; }

export let vehicleSpeed = 0;
export function setVehicleSpeed(val: number) { vehicleSpeed = val; }

export let nearbyVehicle: PlacedObject | null = null;
export function setNearbyVehicle(val: PlacedObject | null) { nearbyVehicle = val; }

export let playTestWorldSnapshots: PlayTestSnapshot[] = [];
export function setPlayTestWorldSnapshots(val: any) { playTestWorldSnapshots = val; }

export let humanCharacter: THREE.Group;
export function setHumanCharacter(val: THREE.Group) { humanCharacter = val; }

export let characterVelocity = new THREE.Vector3();
export let isGrounded = true;
export function setIsGrounded(val: boolean) { isGrounded = val; }

export let characterYaw = 0;
export function setCharacterYaw(val: number) { characterYaw = val; }

export let playerAvatarRig: AvatarRig | null = null;
export function setPlayerAvatarRig(val: AvatarRig | null) { playerAvatarRig = val; }

export let emotesWidget: InGameEmotesWidget | null = null;
export function setEmotesWidget(val: InGameEmotesWidget | null) { emotesWidget = val; }

export let grassPlane: THREE.Mesh;
export function setGrassPlane(val: THREE.Mesh) { grassPlane = val; }

export let grassBlades: THREE.InstancedMesh;
export function setGrassBlades(val: THREE.InstancedMesh) { grassBlades = val; }

export let activeSeaConfig: SeaConfig | null = null;
export function setActiveSeaConfig(val: SeaConfig | null) { activeSeaConfig = val; }

export let oceanWaterMesh: THREE.Mesh;
export function setOceanWaterMesh(val: THREE.Mesh) { oceanWaterMesh = val; }

export let oceanSeabedMesh: THREE.Mesh;
export function setOceanSeabedMesh(val: THREE.Mesh) { oceanSeabedMesh = val; }

export let beachSandMesh: THREE.Mesh;
export function setBeachSandMesh(val: THREE.Mesh) { beachSandMesh = val; }

export const keys: { [key: string]: boolean } = {};
export let orbitRadius = 28;
export function setOrbitRadius(val: number) { orbitRadius = val; }

export let orbitTheta = 0;
export function setOrbitTheta(val: number) { orbitTheta = val; }

export let orbitPhi = Math.PI / 4;
export function setOrbitPhi(val: number) { orbitPhi = val; }

export const orbitTarget = new THREE.Vector3(0, 1.5, 0);
export let isRightMouseDown = false;
export function setIsRightMouseDown(val: boolean) { isRightMouseDown = val; }

export let isLeftMouseDown = false;
export function setIsLeftMouseDown(val: boolean) { isLeftMouseDown = val; }

export let mousePos = { x: 0, y: 0 };

export let studioTestPlaybux = 6000000;
export function setStudioTestPlaybux(val: number) { studioTestPlaybux = val; }

export let currentPublishThumbnail: string | null = null;
export function setCurrentPublishThumbnail(val: string | null) { currentPublishThumbnail = val; }

export let isCheatersConfirmed = false;
export function setIsCheatersConfirmed(val: boolean) { isCheatersConfirmed = val; }

export let activeFeedbackGameId: string | null = null;
export function setActiveFeedbackGameId(val: string | null) { activeFeedbackGameId = val; }

export let studioToolMode: StudioToolMode = 'mouse';
export function setStudioToolModeState(val: StudioToolMode) { studioToolMode = val; }

export let moveGizmoGroup: THREE.Group;
export function setMoveGizmoGroup(val: THREE.Group) { moveGizmoGroup = val; }

export let moveGizmoHandles: any[] = [];
export let isMovingWithGizmo = false;
export function setIsMovingWithGizmo(val: boolean) { isMovingWithGizmo = val; }

export let moveActiveAxis: 'x' | 'y' | 'z' | null = null;
export function setMoveActiveAxis(val: any) { moveActiveAxis = val; }

export let moveStartObjectPos = { x: 0, y: 0, z: 0 };
export let moveStartMousePos = { x: 0, y: 0 };
export let moveScreenDir = { x: 0, y: 0 };
export let worldUnitsPerPixel = 0.05;
export function setWorldUnitsPerPixel(val: number) { worldUnitsPerPixel = val; }

export let pullActiveAxis: PullEdgeAxis = 'all';
export function setPullActiveAxisState(val: PullEdgeAxis) { pullActiveAxis = val; }

export let pullActiveSign: 1 | -1 = 1;
export function setPullActiveSign(val: 1 | -1) { pullActiveSign = val; }

export let isPullingObject = false;
export function setIsPullingObject(val: boolean) { isPullingObject = val; }

export let pullStartPos = { x: 0, y: 0 };
export let pullStartScaleVector = { x: 1, y: 1, z: 1 };
export let pullStartPositionVector = { x: 0, y: 0, z: 0 };
export let pullStartBoxMin = { x: 0, y: 0, z: 0 };
export let pullStartBoxMax = { x: 0, y: 0, z: 0 };
export let pullStartLocalMin = { x: -1, y: -1, z: -1 };
export let pullStartLocalMax = { x: 1, y: 1, z: 1 };
export let pullHandleScreenDir = { x: 1, y: 0 };
export let hideIndicatorTimeout: any = null;
export function setHideIndicatorTimeout(val: any) { hideIndicatorTimeout = val; }

export let pullGizmoGroup: THREE.Group;
export function setPullGizmoGroup(val: THREE.Group) { pullGizmoGroup = val; }

export let pullGizmoBoxHelper: THREE.BoxHelper;
export function setPullGizmoBoxHelper(val: THREE.BoxHelper) { pullGizmoBoxHelper = val; }

export let pullGizmoHandles: any[] = [];

export let rotateGizmoGroup: THREE.Group;
export function setRotateGizmoGroup(val: THREE.Group) { rotateGizmoGroup = val; }
export let rotateGizmoHandles: any[] = [];
export let isRotatingWithGizmo = false;
export function setIsRotatingWithGizmo(val: boolean) { isRotatingWithGizmo = val; }
export let rotateActiveAxis: 'x' | 'y' | 'z' | null = null;
export function setRotateActiveAxis(val: any) { rotateActiveAxis = val; }
export let rotateStartObjectRot = { x: 0, y: 0, z: 0 };
export let rotateStartMousePos = { x: 0, y: 0 };

export let isDraggingObject = false;
export function setIsDraggingObject(val: boolean) { isDraggingObject = val; }

export const dragPlane = new THREE.Plane();
export let lastPlayerDamageTime = 0;
export function setLastPlayerDamageTime(val: number) { lastPlayerDamageTime = val; }

export let dialogHideTimer: any = null;
export function setDialogHideTimer(val: any) { dialogHideTimer = val; }


export const csState: any = {
    get scene() { return scene; }, set scene(val: any) { scene = val; },
    get camera() { return camera; }, set camera(val: any) { camera = val; },
    get renderer() { return renderer; }, set renderer(val: any) { renderer = val; },
    get clock() { return clock; }, set clock(val: any) { clock = val; },
    get isPlayTestMode() { return isPlayTestMode; }, set isPlayTestMode(val: any) { isPlayTestMode = val; },
    get placedObjects() { return placedObjects; }, set placedObjects(val: any) { placedObjects = val; },
    get screenElements() { return screenElements; }, set screenElements(val: any) { screenElements = val; },
    get selectedObject() { return selectedObject; }, set selectedObject(val: any) { selectedObject = val; },
    get isTeleporting() { return isTeleporting; }, set isTeleporting(val: any) { isTeleporting = val; },
    get playerHealth() { return playerHealth; }, set playerHealth(val: any) { playerHealth = val; },
    get playerMaxHealth() { return playerMaxHealth; }, set playerMaxHealth(val: any) { playerMaxHealth = val; },
    get isHealthVisible() { return isHealthVisible; }, set isHealthVisible(val: any) { isHealthVisible = val; },
    get playerCoins() { return playerCoins; }, set playerCoins(val: any) { playerCoins = val; },
    get isCoinsVisible() { return isCoinsVisible; }, set isCoinsVisible(val: any) { isCoinsVisible = val; },
    get playerAsma() { return playerAsma; }, set playerAsma(val: any) { playerAsma = val; },
    get playerMaxAsma() { return playerMaxAsma; }, set playerMaxAsma(val: any) { playerMaxAsma = val; },
    get isAsmaVisible() { return isAsmaVisible; }, set isAsmaVisible(val: any) { isAsmaVisible = val; },
    get playerInventory() { return playerInventory; }, set playerInventory(val: any) { playerInventory = val; },
    get equippedInventoryIndex() { return equippedInventoryIndex; }, set equippedInventoryIndex(val: any) { equippedInventoryIndex = val; },
    get activeQuest() { return activeQuest; }, set activeQuest(val: any) { activeQuest = val; },
    get checkpointPosition() { return checkpointPosition; }, set checkpointPosition(val: any) { checkpointPosition = val; },
    get isGameFinished() { return isGameFinished; }, set isGameFinished(val: any) { isGameFinished = val; },
    get isGameOver() { return isGameOver; }, set isGameOver(val: any) { isGameOver = val; },
    get playerAttackDamage() { return playerAttackDamage; }, set playerAttackDamage(val: any) { playerAttackDamage = val; },
    get lastAttackTime() { return lastAttackTime; }, set lastAttackTime(val: any) { lastAttackTime = val; },
    get isCombatSystemEnabled() { return isCombatSystemEnabled; }, set isCombatSystemEnabled(val: any) { isCombatSystemEnabled = val; },
    get isMoneySystemEnabled() { return isMoneySystemEnabled; }, set isMoneySystemEnabled(val: any) { isMoneySystemEnabled = val; },
    get isYardsSystemEnabled() { return isYardsSystemEnabled; }, set isYardsSystemEnabled(val: any) { isYardsSystemEnabled = val; },
    get playerSpeedMultiplier() { return playerSpeedMultiplier; }, set playerSpeedMultiplier(val: any) { playerSpeedMultiplier = val; },
    get playerSpeedBoostEndTime() { return playerSpeedBoostEndTime; }, set playerSpeedBoostEndTime(val: any) { playerSpeedBoostEndTime = val; },
    get currentGameMaxPlayers() { return currentGameMaxPlayers; }, set currentGameMaxPlayers(val: any) { currentGameMaxPlayers = val; },
    get currentGameMinAge() { return currentGameMinAge; }, set currentGameMinAge(val: any) { currentGameMinAge = val; },
    get currentGameAgeRating() { return currentGameAgeRating; }, set currentGameAgeRating(val: any) { currentGameAgeRating = val; },
    get dirLight() { return dirLight; }, set dirLight(val: any) { dirLight = val; },
    get hemiLight() { return hemiLight; }, set hemiLight(val: any) { hemiLight = val; },
    get currentEnvMode() { return currentEnvMode; }, set currentEnvMode(val: any) { currentEnvMode = val; },
    get undoStack() { return undoStack; }, set undoStack(val: any) { undoStack = val; },
    get redoStack() { return redoStack; }, set redoStack(val: any) { redoStack = val; },
    get audioCtx() { return audioCtx; }, set audioCtx(val: any) { audioCtx = val; },
    get currentVehicle() { return currentVehicle; }, set currentVehicle(val: any) { currentVehicle = val; },
    get vehicleSpeed() { return vehicleSpeed; }, set vehicleSpeed(val: any) { vehicleSpeed = val; },
    get nearbyVehicle() { return nearbyVehicle; }, set nearbyVehicle(val: any) { nearbyVehicle = val; },
    get playTestWorldSnapshots() { return playTestWorldSnapshots; }, set playTestWorldSnapshots(val: any) { playTestWorldSnapshots = val; },
    get humanCharacter() { return humanCharacter; }, set humanCharacter(val: any) { humanCharacter = val; },
    get characterVelocity() { return characterVelocity; }, set characterVelocity(val: any) { characterVelocity = val; },
    get isGrounded() { return isGrounded; }, set isGrounded(val: any) { isGrounded = val; },
    get characterYaw() { return characterYaw; }, set characterYaw(val: any) { characterYaw = val; },
    get playerAvatarRig() { return playerAvatarRig; }, set playerAvatarRig(val: any) { playerAvatarRig = val; },
    get emotesWidget() { return emotesWidget; }, set emotesWidget(val: any) { emotesWidget = val; },
    get grassPlane() { return grassPlane; }, set grassPlane(val: any) { grassPlane = val; },
    get grassBlades() { return grassBlades; }, set grassBlades(val: any) { grassBlades = val; },
    get activeSeaConfig() { return activeSeaConfig; }, set activeSeaConfig(val: any) { activeSeaConfig = val; },
    get oceanWaterMesh() { return oceanWaterMesh; }, set oceanWaterMesh(val: any) { oceanWaterMesh = val; },
    get oceanSeabedMesh() { return oceanSeabedMesh; }, set oceanSeabedMesh(val: any) { oceanSeabedMesh = val; },
    get beachSandMesh() { return beachSandMesh; }, set beachSandMesh(val: any) { beachSandMesh = val; },
    get orbitRadius() { return orbitRadius; }, set orbitRadius(val: any) { orbitRadius = val; },
    get orbitTheta() { return orbitTheta; }, set orbitTheta(val: any) { orbitTheta = val; },
    get orbitPhi() { return orbitPhi; }, set orbitPhi(val: any) { orbitPhi = val; },
    get isRightMouseDown() { return isRightMouseDown; }, set isRightMouseDown(val: any) { isRightMouseDown = val; },
    get isLeftMouseDown() { return isLeftMouseDown; }, set isLeftMouseDown(val: any) { isLeftMouseDown = val; },
    get studioTestPlaybux() { return studioTestPlaybux; }, set studioTestPlaybux(val: any) { studioTestPlaybux = val; },
    get currentPublishThumbnail() { return currentPublishThumbnail; }, set currentPublishThumbnail(val: any) { currentPublishThumbnail = val; },
    get isCheatersConfirmed() { return isCheatersConfirmed; }, set isCheatersConfirmed(val: any) { isCheatersConfirmed = val; },
    get activeFeedbackGameId() { return activeFeedbackGameId; }, set activeFeedbackGameId(val: any) { activeFeedbackGameId = val; },
    get studioToolMode() { return studioToolMode; }, set studioToolMode(val: any) { studioToolMode = val; },
    get moveGizmoGroup() { return moveGizmoGroup; }, set moveGizmoGroup(val: any) { moveGizmoGroup = val; },
    get isMovingWithGizmo() { return isMovingWithGizmo; }, set isMovingWithGizmo(val: any) { isMovingWithGizmo = val; },
    get moveActiveAxis() { return moveActiveAxis; }, set moveActiveAxis(val: any) { moveActiveAxis = val; },
    get worldUnitsPerPixel() { return worldUnitsPerPixel; }, set worldUnitsPerPixel(val: any) { worldUnitsPerPixel = val; },
    get pullActiveAxis() { return pullActiveAxis; }, set pullActiveAxis(val: any) { pullActiveAxis = val; },
    get pullActiveSign() { return pullActiveSign; }, set pullActiveSign(val: any) { pullActiveSign = val; },
    get isPullingObject() { return isPullingObject; }, set isPullingObject(val: any) { isPullingObject = val; },
    get hideIndicatorTimeout() { return hideIndicatorTimeout; }, set hideIndicatorTimeout(val: any) { hideIndicatorTimeout = val; },
    get pullGizmoGroup() { return pullGizmoGroup; }, set pullGizmoGroup(val: any) { pullGizmoGroup = val; },
    get pullGizmoBoxHelper() { return pullGizmoBoxHelper; }, set pullGizmoBoxHelper(val: any) { pullGizmoBoxHelper = val; },
    get isDraggingObject() { return isDraggingObject; }, set isDraggingObject(val: any) { isDraggingObject = val; },
    get lastPlayerDamageTime() { return lastPlayerDamageTime; }, set lastPlayerDamageTime(val: any) { lastPlayerDamageTime = val; },
    get dialogHideTimer() { return dialogHideTimer; }, set dialogHideTimer(val: any) { dialogHideTimer = val; },
    get keys() { return keys; },
    get orbitTarget() { return orbitTarget; },
    get mousePos() { return mousePos; }, set mousePos(val: any) { mousePos = val; },
    get moveGizmoHandles() { return moveGizmoHandles; }, set moveGizmoHandles(val: any) { moveGizmoHandles = val; },
    get moveStartObjectPos() { return moveStartObjectPos; }, set moveStartObjectPos(val: any) { moveStartObjectPos = val; },
    get moveStartMousePos() { return moveStartMousePos; }, set moveStartMousePos(val: any) { moveStartMousePos = val; },
    get moveScreenDir() { return moveScreenDir; }, set moveScreenDir(val: any) { moveScreenDir = val; },
    get pullStartPos() { return pullStartPos; }, set pullStartPos(val: any) { pullStartPos = val; },
    get pullStartScaleVector() { return pullStartScaleVector; }, set pullStartScaleVector(val: any) { pullStartScaleVector = val; },
    get pullStartPositionVector() { return pullStartPositionVector; }, set pullStartPositionVector(val: any) { pullStartPositionVector = val; },
    get pullStartBoxMin() { return pullStartBoxMin; }, set pullStartBoxMin(val: any) { pullStartBoxMin = val; },
    get pullStartBoxMax() { return pullStartBoxMax; }, set pullStartBoxMax(val: any) { pullStartBoxMax = val; },
    get pullStartLocalMin() { return pullStartLocalMin; }, set pullStartLocalMin(val: any) { pullStartLocalMin = val; },
    get pullStartLocalMax() { return pullStartLocalMax; }, set pullStartLocalMax(val: any) { pullStartLocalMax = val; },
    get pullHandleScreenDir() { return pullHandleScreenDir; }, set pullHandleScreenDir(val: any) { pullHandleScreenDir = val; },
    get pullGizmoHandles() { return pullGizmoHandles; }, set pullGizmoHandles(val: any) { pullGizmoHandles = val; },
    get rotateGizmoGroup() { return rotateGizmoGroup; }, set rotateGizmoGroup(val: any) { rotateGizmoGroup = val; },
    get rotateGizmoHandles() { return rotateGizmoHandles; }, set rotateGizmoHandles(val: any) { rotateGizmoHandles = val; },
    get isRotatingWithGizmo() { return isRotatingWithGizmo; }, set isRotatingWithGizmo(val: any) { isRotatingWithGizmo = val; },
    get rotateActiveAxis() { return rotateActiveAxis; }, set rotateActiveAxis(val: any) { rotateActiveAxis = val; },
    get rotateStartObjectRot() { return rotateStartObjectRot; }, set rotateStartObjectRot(val: any) { rotateStartObjectRot = val; },
    get rotateStartMousePos() { return rotateStartMousePos; }, set rotateStartMousePos(val: any) { rotateStartMousePos = val; },
    get dragPlane() { return dragPlane; },
};
