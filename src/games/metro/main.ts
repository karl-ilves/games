import * as THREE from 'three';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { yardService } from '../../shared/yardService';
import { metroAudio } from './audio';

// --- Types & Interfaces ---
type GameState = 'intro_station' | 'intro_riding' | 'intro_first_stop' | 'intro_departing' | 'player_free' | 'inspecting' | 'keypad' | 'dragged_death' | 'golden_shop' | 'dead' | 'start_screen';
type DirectionBranch = 'right' | 'left' | 'undecided';

interface AnomalyEvent {
    id: string;
    carIndex: number;
    triggered: boolean;
    active: boolean;
    timer: number;
}

interface AIPassenger {
    group: THREE.Group;
    head: THREE.Object3D;
    body: THREE.Object3D;
    isSitting: boolean;
    seatPos: THREE.Vector3;
    animType: 'phone' | 'look_window' | 'reading' | 'uncanny_stare' | 'chat';
    baseRotY: number;
    targetRotY: number;
    isCreepy: boolean;
    phoneMesh?: THREE.Mesh;
    headphones?: boolean;
    thumbLeft?: THREE.Mesh;
    thumbRight?: THREE.Mesh;
}

interface CarriageData {
    index: number;
    branch: DirectionBranch;
    theme: 'normal' | 'flicker' | 'dark' | 'abandoned' | 'neon' | 'lounge' | 'archive' | 'anomaly' | 'golden_shop';
    group: THREE.Group;
    lights: THREE.PointLight[];
    lightMeshes: THREE.Mesh[];
    passengers: AIPassenger[];
    doorFront: THREE.Group;
    doorBack: THREE.Group;
    mapMesh?: THREE.Mesh | THREE.Group;
    puzzleSolved: boolean;
    puzzleCode?: string;
    hasKeypad?: boolean;
    inspectableItem?: THREE.Group;
    inspectableText?: { titleEt: string; descEt: string; titleEn: string; descEn: string };
}

export interface ShopItem {
    id: string;
    icon: string;
    nameEt: string;
    nameEn: string;
    descEt: string;
    descEn: string;
    price: number;
}

export const GOLDEN_SHOP_ITEMS: ShopItem[] = [
    {
        id: 'night_vision',
        icon: '👓',
        nameEt: 'ÖÖPRILLID',
        nameEn: 'NIGHT VISION GOGGLES',
        descEt: 'Aitavad pimedates vagunites paremini näha ja toovad nähtavale salajased detailid.',
        descEn: 'Helps see clearly in dark carriages and reveals hidden clues.',
        price: 120
    },
    {
        id: 'speed_boost',
        icon: '👟',
        nameEt: 'KIIRUSEBOONUS',
        nameEn: 'SPEED BOOST',
        descEt: 'Muudab mängija liikumise +50% kiiremaks, et ohtlikes olukordades kiiresti edasi liikuda.',
        descEn: 'Increases player movement speed by +50%.',
        price: 150
    },
    {
        id: 'clue_detector',
        icon: '🔍',
        nameEt: 'VIHJEANDUR',
        nameEn: 'CLUE DETECTOR',
        descEt: 'Hakkab piiksuma ja märku andma, kui oled läheduses peidetud vihjetele või saladustele.',
        descEn: 'Beeps and pulses when near hidden clues or lore objects.',
        price: 225
    },
    {
        id: 'secret_pass',
        icon: '🎟️',
        nameEt: 'SALAPILET',
        nameEn: 'SECRET PASS',
        descEt: 'Salapärane pilet, mis võib avada erilisi uksi ja salajasi kohti.',
        descEn: 'A mysterious subway pass for special locked chambers.',
        price: 300
    },
    {
        id: 'radio',
        icon: '📻',
        nameEt: 'RAADIO',
        nameEn: 'SUBWAY RADIO',
        descEt: 'Mängib rahulikku muusikat ning võib püüda kinni kummalisi teateid ja sosinaid.',
        descEn: 'Plays vintage tunes and picks up rare whispers and broadcasts.',
        price: 175
    }
];

export interface ClueItem {
    id: string;
    carIndex: number;
    type: 'ticket' | 'photo' | 'document' | 'map' | 'plate' | 'list' | 'watch' | 'note' | 'item';
    icon: string;
    titleEt: string;
    titleEn: string;
    textEt: string;
    textEn: string;
    placement?: 'seat' | 'floor' | 'table' | 'wall' | 'door';
    collected?: boolean;
}

export const CLUES_DATABASE: ClueItem[] = [
    {
        id: 'clue_101',
        carIndex: 101,
        type: 'ticket',
        icon: '🎫',
        titleEt: 'Vana Pilet (Vagun 101)',
        titleEn: 'Vintage Ticket (Carriage 101)',
        textEt: '„SEE RONG EI PEATUNUD KUNAGI.”',
        textEn: '“THIS TRAIN NEVER STOPPED.”',
        placement: 'seat'
    },
    {
        id: 'clue_103',
        carIndex: 103,
        type: 'photo',
        icon: '📷',
        titleEt: 'Vana Foto (Vagun 103)',
        titleEn: 'Old Photograph (Carriage 103)',
        textEt: '[Hämar mustvalge polaroidfoto tühjast metroorongist ilma tekstita]',
        textEn: '[Dim black & white polaroid of an empty metro carriage without text]',
        placement: 'seat'
    },
    {
        id: 'clue_105',
        carIndex: 105,
        type: 'map',
        icon: '🗺️',
        titleEt: 'Vana Metrookaart (Vagun 105)',
        titleEn: 'Vintage Subway Map (Carriage 105)',
        textEt: 'Kaardil on mustaks märgitud tunnel ja kiri:\n„SIIT ALGAS KÕIK.”',
        textEn: 'A blacked-out tunnel is marked on the map with the note:\n“THIS IS WHERE IT ALL BEGAN.”',
        placement: 'wall'
    },
    {
        id: 'clue_108',
        carIndex: 108,
        type: 'note',
        icon: '👁️',
        titleEt: 'Salajane Märge (Vagun 108)',
        titleEn: 'Secret Wall Inscription (Carriage 108)',
        textEt: 'Ööprillidega seinal helendav kiri:\n„NAD JÄID SINNA.”',
        textEn: 'Glowing wall inscription visible under night vision:\n“THEY STAYED BEHIND.”',
        placement: 'wall'
    },
    {
        id: 'clue_111',
        carIndex: 111,
        type: 'plate',
        icon: '🛡️',
        titleEt: 'Graveeritud Metallplaat (Vagun 111)',
        titleEn: 'Engraved Metal Plate (Carriage 111)',
        textEt: 'Raske metallplaat lauakesel:\n„ÄRA AVA VIIMAST UST.”',
        textEn: 'Heavy metallic plate on the table:\n“DO NOT OPEN THE FINAL DOOR.”',
        placement: 'table'
    },
    {
        id: 'clue_113',
        carIndex: 113,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Häguse Numbriga (Vagun 113)',
        titleEn: 'Photo with Blurred Number (Carriage 113)',
        textEt: '[Vana foto samast metroorongist, kuid vaguninumber on fotol kummaliselt hägune]',
        textEn: '[Old photo of this very subway train, but the carriage number is eerily blurred out]',
        placement: 'seat'
    },
    {
        id: 'clue_114',
        carIndex: 114,
        type: 'document',
        icon: '📄',
        titleEt: 'Salajane Dokument (Vagun 114)',
        titleEn: 'Confidential Document (Carriage 114)',
        textEt: 'Ametlik pitsatiga dokument:\n„SIGNAAL TULEB RONGI LÕPUST.”',
        textEn: 'Official stamped document:\n“THE SIGNAL ORIGINATES FROM THE END OF THE TRAIN.”',
        placement: 'seat'
    },
    {
        id: 'clue_119',
        carIndex: 119,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Kolmest Inimesest (Vagun 119)',
        titleEn: 'Photo of Three People (Carriage 119)',
        textEt: '[Kolm teadlast seisavad metroo perroonil, nägudel tõsine ilme]',
        textEn: '[Three researchers standing on the subway platform with stern expressions]',
        placement: 'seat'
    },
    {
        id: 'clue_121',
        carIndex: 121,
        type: 'document',
        icon: '📖',
        titleEt: 'Päevikuleht (Vagun 121)',
        titleEn: 'Diary Page (Carriage 121)',
        textEt: 'Käsikirjaline päevikuleht:\n„ME ARVASIME, ET SEE JÄI TUNNELISSE.”',
        textEn: 'Handwritten journal excerpt:\n“WE THOUGHT IT REMAINED IN THE TUNNEL.”',
        placement: 'floor'
    },
    {
        id: 'clue_123',
        carIndex: 123,
        type: 'map',
        icon: '📊',
        titleEt: 'Metroodiagramm (Vagun 123)',
        titleEn: 'Subway Diagram (Carriage 123)',
        textEt: 'Tehniline joonis punaste tulede all:\n„SEKTOR 200”',
        textEn: 'Technical blueprint under red emergency lights:\n“SECTOR 200”',
        placement: 'wall'
    },
    {
        id: 'clue_126',
        carIndex: 126,
        type: 'list',
        icon: '📋',
        titleEt: 'Reisijate Nimekiri (Vagun 126)',
        titleEn: 'Passenger Manifest (Carriage 126)',
        textEt: 'Vana nimekiri 1987. aastast. Viimane rida:\n„PUUDUB.”',
        textEn: 'Vintage manifest from 1987. The final entry:\n“MISSING.”',
        placement: 'seat'
    },
    {
        id: 'clue_128',
        carIndex: 128,
        type: 'note',
        icon: '📜',
        titleEt: 'Seinale Kraabitud Hoiatus (Vagun 128)',
        titleEn: 'Scratched Wall Warning (Carriage 128)',
        textEt: 'Metalli kraabitud kiri:\n„NAD EI LÄINUD ÄRA.”',
        textEn: 'Words scratched into the carriage metal:\n“THEY NEVER LEFT.”',
        placement: 'wall'
    },
    {
        id: 'clue_131',
        carIndex: 131,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Tühjast Metroost (Vagun 131)',
        titleEn: 'Photo of Abandoned Car (Carriage 131)',
        textEt: '[Foto täiesti tühjast hämarast vagunist. Akendest paistab lõputu must sügavus]',
        textEn: '[Photo of a completely empty carriage. Endless black void outside windows]',
        placement: 'seat'
    },
    {
        id: 'clue_133',
        carIndex: 133,
        type: 'note',
        icon: '👁️',
        titleEt: 'Ööprillide Vihje (Vagun 133)',
        titleEn: 'Night Vision Clue (Carriage 133)',
        textEt: 'Ööprillidega nähtav kiri seinal:\n„TUNNEL EI LÕPE.”',
        textEn: 'Fluorescent wall inscription:\n“THE TUNNEL HAS NO END.”',
        placement: 'wall'
    },
    {
        id: 'clue_136',
        carIndex: 136,
        type: 'document',
        icon: '📑',
        titleEt: 'Uurimisraport (Vagun 136)',
        titleEn: 'Research Dossier (Carriage 136)',
        textEt: 'Protokoll nr 7-B:\n„OBJEKT VIIDI VAGUNISSE.”',
        textEn: 'Protocol No. 7-B:\n“THE OBJECT WAS TRANSFERRED TO THE CARRIAGE.”',
        placement: 'seat'
    },
    {
        id: 'clue_138',
        carIndex: 138,
        type: 'watch',
        icon: '🕰️',
        titleEt: 'Vana Kellamehhanism (Vagun 138)',
        titleEn: 'Old Clockwork (Carriage 138)',
        textEt: 'Tardunud messingist kellamehhanism. Seierid seisavad täpselt: 02:00.',
        textEn: 'Frozen brass clockwork mechanism. Hands permanently set to 02:00.',
        placement: 'table'
    },
    {
        id: 'clue_141',
        carIndex: 141,
        type: 'note',
        icon: '📜',
        titleEt: 'Seinamärge (Vagun 141)',
        titleEn: 'Wall Note (Carriage 141)',
        textEt: 'Värviga kirjutatud hoiatus:\n„NAD JÕUAVAD 200-NI.”',
        textEn: 'Warning painted across the wall:\n“THEY WILL REACH 200.”',
        placement: 'wall'
    },
    {
        id: 'clue_146',
        carIndex: 146,
        type: 'document',
        icon: '📄',
        titleEt: 'Paberleht Istmel (Vagun 146)',
        titleEn: 'Slip on Seat (Carriage 146)',
        textEt: 'Kollasel paberil kiri:\n„VIIMANE PEATUS EI OLE VÄLJAPÄÄS.”',
        textEn: 'Note on aged yellow paper:\n“THE FINAL STATION IS NOT AN EXIT.”',
        placement: 'seat'
    },
    {
        id: 'clue_148',
        carIndex: 148,
        type: 'document',
        icon: '📑',
        titleEt: 'Dokument Katse 10 (Vagun 148)',
        titleEn: 'Document Experiment 10 (Carriage 148)',
        textEt: 'Salastatud raport:\n„KATSE NR 10 ALGAB VAGUNIS 200.”',
        textEn: 'Classified report:\n“EXPERIMENT NO. 10 COMMENCES IN CARRIAGE 200.”',
        placement: 'table'
    },
    {
        id: 'clue_161',
        carIndex: 161,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Mahakriipsutatud Numbriga (Vagun 161)',
        titleEn: 'Photo with Crossed-out Number (Carriage 161)',
        textEt: '[Vana foto samast metroost. Vaguninumber on fotol musta tindiga läbi kriipsutatud]',
        textEn: '[Old photo of this subway. The carriage number is violently crossed out with black ink]',
        placement: 'seat'
    },
    {
        id: 'clue_165',
        carIndex: 165,
        type: 'ticket',
        icon: '🎫',
        titleEt: 'Vana Pilet 002 (Vagun 165)',
        titleEn: 'Vintage Ticket 002 (Carriage 165)',
        textEt: 'Istme alt leitud reljeefne pilet numbriga: 002.',
        textEn: 'Embossed ticket recovered from under the seat bearing number: 002.',
        placement: 'floor'
    },
    {
        id: 'clue_168',
        carIndex: 168,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Tühjast Metroost (Vagun 168)',
        titleEn: 'Photo of Void Subway (Carriage 168)',
        textEt: '[Lihtsalt vana foto tühjast metroorongist. Tagaküljel pole mitte ühtegi kirja]',
        textEn: '[Just an old photo of an empty subway. The back side is completely blank]',
        placement: 'seat'
    },
    {
        id: 'clue_172',
        carIndex: 172,
        type: 'document',
        icon: '📄',
        titleEt: 'Dokument Objekt 002 (Vagun 172)',
        titleEn: 'Document Object 002 (Carriage 172)',
        textEt: 'Laboratooriumi märge:\n„Objekt 002 reageeris teisele katsele.”',
        textEn: 'Laboratory log:\n“Object 002 responded to the secondary experiment.”',
        placement: 'table'
    },
    {
        id: 'clue_173',
        carIndex: 173,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Metroojaamast (Vagun 173)',
        titleEn: 'Photo of Subway Station (Carriage 173)',
        textEt: '[Vana foto mahajäetud maa-alusest jaamast. Jaama nimesildid on tühjad]',
        textEn: '[Old photo of an abandoned underground terminal. The station signage is blank]',
        placement: 'seat'
    },
    {
        id: 'clue_176',
        carIndex: 176,
        type: 'watch',
        icon: '⌚',
        titleEt: 'Salapärane Käekell (Vagun 176)',
        titleEn: 'Mysterious Wristwatch (Carriage 176)',
        textEt: 'Vana käekell istmel. Selle sekundiseier liigub ainult siis, kui mängija ise liigub.',
        textEn: 'Old wristwatch on seat. Its second hand only ticks while the player is moving.',
        placement: 'seat'
    },
    {
        id: 'clue_178',
        carIndex: 178,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Neljast Inimesest (Vagun 178)',
        titleEn: 'Photo of Four (Carriage 178)',
        textEt: '[Foto neljast inimesest perroonil. Üks inimene on fotolt terava kääridega välja lõigatud]',
        textEn: '[Photo of four people on the platform. One person has been precisely cut out]',
        placement: 'seat'
    },
    {
        id: 'clue_182',
        carIndex: 182,
        type: 'list',
        icon: '📋',
        titleEt: 'Nimekiri Kadunutest (Vagun 182)',
        titleEn: 'List of the Missing (Carriage 182)',
        textEt: 'Ametlik leht nimedega. Peaaegu iga nime taga seisab punane tempel: „KADUNUD”.',
        textEn: 'Official list of names. Nearly every name is stamped in red: “LOST”.',
        placement: 'table'
    },
    {
        id: 'clue_186',
        carIndex: 186,
        type: 'map',
        icon: '🗺️',
        titleEt: 'Käsitsi Märgitud Kaart (Vagun 186)',
        titleEn: 'Hand-drawn Map (Carriage 186)',
        textEt: 'Vana metrookaart, mille lõppu on pliiatsiga joonistatud salajane peatus: „200”.',
        textEn: 'Transit map with a penciled terminal station at the very end: “200”.',
        placement: 'wall'
    },
    {
        id: 'clue_188',
        carIndex: 188,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Rongist 200 (Vagun 188)',
        titleEn: 'Photo of Train 200 (Carriage 188)',
        textEt: '[Vana foto samast rongist. Esiklaasi kohal särab number 200]',
        textEn: '[Vintage photo of this train. Number 200 glows above the front windshield]',
        placement: 'seat'
    },
    {
        id: 'clue_192',
        carIndex: 192,
        type: 'ticket',
        icon: '🎫',
        titleEt: 'Pilet 002 (Vagun 192)',
        titleEn: 'Ticket 002 (Carriage 192)',
        textEt: 'Põrandal lebav vana pilet reljeefse numbriga 002.',
        textEn: 'Old ticket lying on the floor stamped with embossed 002.',
        placement: 'floor'
    },
    {
        id: 'clue_193',
        carIndex: 193,
        type: 'photo',
        icon: '📷',
        titleEt: 'Foto Vaguni 200 Ees (Vagun 193)',
        titleEn: 'Photo in Front of 200 (Carriage 193)',
        textEt: '[Kolm teadlast seisavad otse Vaguni 200 metallukse ees]',
        textEn: '[Three researchers standing directly in front of the bulkhead of Carriage 200]',
        placement: 'seat'
    },
    {
        id: 'clue_198',
        carIndex: 198,
        type: 'document',
        icon: '📄',
        titleEt: 'Lõplik Dokument Katse 002 (Vagun 198)',
        titleEn: 'Final Dossier Experiment 002 (Carriage 198)',
        textEt: 'Viimane ametlik märge enne jaama 200:\n„Katse 002 andis tulemuse. Rong leidis tee.”',
        textEn: 'Final official record before station 200:\n“Experiment 002 yielded results. The train found its passage.”',
        placement: 'table'
    }
];


// Module-level reusable scratch vectors for 60+ FPS zero-allocation performance
const _scratchV1 = new THREE.Vector3();
const _scratchV2 = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export class LastMetroGame {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;

    // Player State
    private isOwner: boolean = false;
    private lang: 'et' | 'en' = 'et';
    public state: GameState = 'intro_station';
    public currentCarIndex: number = 0; // 0 = start car, 1-100 = story & checkpoints, 101+ = infinite
    private branchDirection: DirectionBranch = 'undecided';
    private totalCarriagesExplored: number = 0;
    private cluesFound: number = 0;

    // Coins Economy & Inventory (Roblox Style)
    public coins: number = 0;
    public collectibleCoins: { mesh: THREE.Mesh; value: number; collected: boolean }[] = [];
    public inventory: { [itemKey: string]: boolean } = {};
    public equippedItem: string | null = null;
    public heldItemMesh: THREE.Group | null = null;

    // Active Equipment Effects
    public nightVisionActive: boolean = false;
    public speedBoostActive: boolean = false;
    public clueDetectorActive: boolean = false;
    public radioActive: boolean = false;
    public radarPingTimer: number = 0;

    // Puzzle & Progression Flags
    public hasUnlockedCarriage28WithClue: boolean = false;
    public hasUnlockedCarriage64WithKey: boolean = false;
    public hasUnlockedCarriage78WithHint: boolean = false;

    // Dynamic Special Props & Timers
    public reverseTunnelTimer: number = 0;
    public soundCutoutTimer: number = 0;
    public parallelTrainMesh: THREE.Group | null = null;
    public parallelTrainActive: boolean = false;
    public goldenShopKeeperMesh: THREE.Group | null = null;

    // FPS Controls
    private playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);
    private playerVel: THREE.Vector3 = new THREE.Vector3();
    private cameraEuler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
    private moveKeys: { [key: string]: boolean } = {};
    private isPointerLocked: boolean = false;
    public aimedInteractable: 'inspectable' | 'keypad' | 'shop' | 'seat' | 'stand' | 'switch' | null = null;
    public aimedSwitchIndex: number = -1;
    private stepTimer: number = 0;
    private headBobTimer: number = 0;
    private flashlightOn: boolean = false;
    private flashlight: THREE.SpotLight | null = null;

    // Carriages & World
    private currentCarriage: CarriageData | null = null;
    private tunnelGroup: THREE.Group = new THREE.Group();
    private stationPlatformGroup: THREE.Group = new THREE.Group();
    private tunnelOffsetZ: number = 0;
    private trainSpeed: number = 0;
    private targetTrainSpeed: number = 60;

    // Cutscene & Timers
    private cutsceneTimer: number = 0;
    private ambientWhisperCooldown: number = 10;
    private currentThoughtTimeout: any = null;

    // Special Anomaly References
    private stalkerMesh: THREE.Group | null = null;
    private stalkerActive: boolean = false;
    private stalkerDistZ: number = 16;
    private stalkerLookAwayTimer: number = 0;

    private windowSurrealSky: THREE.Mesh | null = null;
    private jumpScareMesh: THREE.Group | null = null;
    private jumpScareActive: boolean = false;

    // Mobile & Desktop Look Controls
    private isMouseDown: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private lastLockedDoorSoundTime: number = 0;

    // Intro Cutscene Timers & Animation State
    private introSideDoorsOpen: boolean = false;
    private sideDoorMeshes: { mesh: THREE.Mesh; baseZ: number; dir: number }[] = [];
    private introTimeouts: any[] = [];
    private introCameraTarget: THREE.Vector3 = new THREE.Vector3(3.8, 1.6, -3.5);
    private introLookTarget: THREE.Vector3 = new THREE.Vector3(0, 1.2, -25);

    // Shadow Hands Void Anomaly State (Carriage 9 & Beyond)
    public shadowHandsActive: boolean = false;
    public shadowHandsGroups: THREE.Group[] = [];
    public shadowHandsTimer: number = 0;
    private shadowHandsAnimTimer: number = 0;
    private deathDragSide: number = 1;
    private deathTimer: number = 0;

    // Seating State (Sit on any seat bench)
    public isSitting: boolean = false;

    // Carriage 20 Shadow Creature (Must Olend) Rush Event State
    public shadowRushActive: boolean = false;
    public shadowEntityMesh: THREE.Group | null = null;
    public shadowRushSpeed: number = 0;
    public shadowRushCountdown: number = 0;
    public carriage20EventTriggered: boolean = false;

    // Player Health System (User requirement: "rida mis näitab su elusi vasakul üleval nurgas viimane metroo teksti all")
    public playerHp: number = 100;
    public maxPlayerHp: number = 100;

    // Glowing Eyes Anomaly State (Carriages 26 - 30)
    public shadowEyesGroup: THREE.Group | null = null;

    // Shadow Villains State (Carriage 31 - "ilmub pahalased")
    public shadowVillains: { group: THREE.Group; hp: number; maxHp: number; attackCooldown: number; bodyMesh: THREE.Mesh }[] = [];
    public isSwordSwinging: boolean = false;
    private swordSwingTimer: number = 0;

    // Ajapahalane (Time Villain) State — rare event when player stays too long in a carriage
    public timeVillainActive: boolean = false;
    public timeVillainCountdown: number = 0;
    public carriageStayTimer: number = 0;
    public timeVillainGroup: THREE.Group | null = null;
    private timeVillainFlickerInterval: any = null;
    private timeVillainShakeOffset: THREE.Vector3 = new THREE.Vector3();
    private timeVillainTriggeredThisCarriage: boolean = false;

    // ── Politsei Jälituse Sündmus (Vagunid 150–160) ─────────────────────────
    public policeChaseActive: boolean = false;
    public policeOfficers: THREE.Group[] = [];
    public policeChaseTriggered: boolean = false;
    public policeChaseAnimLocked: boolean = false; // mängija liikumine blokeeritud
    public policeRemovedByGrip: number = 0; // mitu politseinikku on Grip eemaldanud
    public policeChaseRunActive: boolean = false; // mängija jookseb animatsioon
    public carriage150IntroPlayed: boolean = false;

    // ── Vihjed & Seljakott (Clue Collectible System) ────────────────────────
    public collectedClues: ClueItem[] = [];
    public currentInspectedClue: ClueItem | null = null;
    public activeClueMesh: THREE.Group | null = null;

    // ── Vagun 200 Kuulja Boss & Switches ────────────────────────────────────
    public kuuljaBossGroup: THREE.Group | null = null;
    public kuuljaHearingAlert: boolean = false;
    public kuuljaSwitchesActivated: number = 0;
    public kuuljaSwitches: { mesh: THREE.Group; activated: boolean }[] = [];
    public kuuljaSpeed: number = 0;
    public kuuljaTargetPos: THREE.Vector3 = new THREE.Vector3();
    public stationStairsGroup: THREE.Group | null = null;

    // ── Vagunid 201–250 Kanalisatsioon (Sewers) ────────────────────────────
    public sewerWaterSubmerged: boolean = false;
    public sewerSubmergeTimer: number = 0;
    public isCrouching: boolean = false;
    public carriage201IntroPlayed: boolean = false;
    public carriage250DoorOpened: boolean = false;

    // ── Vagun 300 Finale ───────────────────────────────────────────────────
    public carriage300ExitTriggered: boolean = false;


    constructor() {
        const cont = document.getElementById('canvas-container');
        if (!cont) throw new Error("Canvas container not found!");
        this.container = cont;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06080c);
        this.scene.fog = new THREE.FogExp2(0x06080c, 0.04);

        this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 120);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
        this.renderer.shadowMap.enabled = false;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.init();
    }

    private async init() {
        console.log("🚇 Initializing LAST METRO 3D Mystery...");

        // 1. VIP / Playard Owner Verification
        const userProf = getCurrentUserProfile();
        this.isOwner = isPlayardOwner(userProf?.email);

        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (!this.isOwner && vipOverlay) {
            vipOverlay.style.display = 'flex';
            return;
        }

        // Language determination: Estonian for Owner by default, English otherwise
        this.lang = this.isOwner ? 'et' : 'en';
        this.updateLanguageUI();

        // Record to Recently Played
        yardService.recordPlayedGame({
            id: 'metro',
            title: this.lang === 'et' ? '🚇 Last Metro' : '🚇 Last Metro',
            description: this.lang === 'et' ? '3D atmosfääriline seiklus- ja müsteeriumimäng lõputus metroorongis.' : '3D atmospheric mystery adventure on an endless subway train.',
            url: './games/metro/index.html',
            icon: '🚇',
            badgeText: '👑 OWNER EXCLUSIVE'
        });

        // 2. Setup Lighting & Flashlight
        this.setupLighting();

        // 3. Build Metro Station & Passing Tunnel
        this.buildStationPlatform();
        this.buildTunnel();

        // 4. Build Initial Carriage (Carriage 0)
        this.loadCarriage(0, 'undecided');

        // Player starts with Sword in inventory & Full Health (User requirement)
        this.inventory['sword'] = true;
        this.playerHp = 100;
        this.updateHealthUI();
        this.updateHotbarUI();

        // 5. Input Listeners
        this.setupInputs();
        this.setupUI();
        this.updateCursorState();

        // 6. Start Loop
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.setAnimationLoop(this.animate.bind(this));

        // User requirement: "kui sa hubis vajutad selle mängu pealle siis sinna mängu ilmud vajuta üks kõik kuhu et mängu alustada ja kui ta vajutab siis tuleb intro"
        this.state = 'start_screen';
    }

    public startGameFromOverlay() {
        const startOverlay = document.getElementById('start-game-overlay');
        if (startOverlay) {
            startOverlay.style.opacity = '0';
            setTimeout(() => {
                startOverlay.style.display = 'none';
            }, 500);
        }
        metroAudio.enableAudio();
        this.startIntroSequence();
        this.updateCursorState();
    }

    private setupLighting() {
        const ambient = new THREE.AmbientLight(0x222633, 0.7);
        this.scene.add(ambient);

        // Flashlight attached to camera
        this.flashlight = new THREE.SpotLight(0xffffff, 0, 22, Math.PI / 5, 0.4, 1.2);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.castShadow = true;
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.flashlight.target.position.set(0, 0, -5);
        this.scene.add(this.camera);
    }

    private setupUI() {
        // Start screen click anywhere to begin listener
        const startOverlay = document.getElementById('start-game-overlay');
        if (startOverlay) {
            startOverlay.addEventListener('click', () => this.startGameFromOverlay());
        }

        // Flashlight toggle button
        const flashBtn = document.getElementById('btn-toggle-flashlight');
        if (flashBtn) {
            flashBtn.addEventListener('click', () => this.toggleFlashlight());
        }

        // Skip intro button
        const skipBtn = document.getElementById('btn-skip-intro');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipIntro());
        }

        // Replay intro button
        const replayBtn = document.getElementById('btn-replay-intro');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.replayIntro());
        }

        // Stand up button for mobile & sitting
        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) {
            standBtn.addEventListener('click', () => this.standUp());
        }

        // Sit / Stand HUD button
        const sitToggleBtn = document.getElementById('btn-toggle-sit');
        if (sitToggleBtn) {
            sitToggleBtn.addEventListener('click', () => this.toggleSit());
        }

        // Crouch / Sneak toggle button
        const crouchToggleBtn = document.getElementById('btn-toggle-crouch');
        if (crouchToggleBtn) {
            crouchToggleBtn.addEventListener('click', () => this.toggleCrouch());
        }

        // Audio mute toggle
        const audioBtn = document.getElementById('btn-toggle-audio');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const muted = metroAudio.toggleMute();
                audioBtn.innerText = muted ? '🔇' : '🔊';
            });
        }

        // Language button
        const langBtn = document.getElementById('btn-toggle-lang');
        if (langBtn) {
            langBtn.addEventListener('click', () => {
                this.lang = this.lang === 'et' ? 'en' : 'et';
                this.updateLanguageUI();
            });
        }

        // Keypad submit
        const keypadSubmit = document.getElementById('btn-keypad-submit');
        if (keypadSubmit) {
            keypadSubmit.addEventListener('click', () => this.submitKeypad());
        }

        const keypadClose = document.getElementById('btn-keypad-close');
        if (keypadClose) {
            keypadClose.addEventListener('click', () => {
                const modal = document.getElementById('keypad-modal');
                if (modal) modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
            });
        }

        // Lore modal close
        const loreClose = document.getElementById('btn-lore-close');
        if (loreClose) {
            loreClose.addEventListener('click', () => {
                const modal = document.getElementById('lore-modal');
                if (modal) modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
            });
        }

        // Death retry button
        const deathRetry = document.getElementById('btn-death-retry');
        if (deathRetry) {
            deathRetry.addEventListener('click', () => this.respawnFromDeath());
        }

        // Golden Shop modal close button
        const shopClose = document.getElementById('btn-shop-close');
        if (shopClose) {
            shopClose.addEventListener('click', () => {
                const modal = document.getElementById('golden-shop-modal');
                if (modal) modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
            });
        }

        // Backpack / Clues Folder button
        const backpackBtn = document.getElementById('btn-backpack-folder');
        if (backpackBtn) {
            backpackBtn.addEventListener('click', () => this.toggleCluesFolderModal());
        }

        const cluesFolderClose = document.getElementById('btn-clues-folder-close');
        if (cluesFolderClose) {
            cluesFolderClose.addEventListener('click', () => this.closeCluesFolderModal());
        }

        // Pack Clue Button & Card click
        const packClueBtn = document.getElementById('btn-pack-clue');
        if (packClueBtn) {
            packClueBtn.addEventListener('click', () => this.packCurrentInspectedClue());
        }

        const clueCardContainer = document.getElementById('clue-card-container');
        if (clueCardContainer) {
            clueCardContainer.addEventListener('click', () => this.packCurrentInspectedClue());
        }

        const clueInspectModal = document.getElementById('clue-inspect-modal');
        if (clueInspectModal) {
            clueInspectModal.addEventListener('click', (e) => {
                if (e.target === clueInspectModal) {
                    this.packCurrentInspectedClue();
                }
            });
        }


        // Playard Owner Panel UI Wireup
        const ownerPanelBtn = document.getElementById('btn-owner-panel');
        if (ownerPanelBtn) {
            if (this.isOwner) {
                ownerPanelBtn.style.display = 'flex';
                ownerPanelBtn.addEventListener('click', () => this.openOwnerTeleportModal());
            } else {
                ownerPanelBtn.style.display = 'none';
            }
        }

        const ownerTpSubmit = document.getElementById('btn-owner-teleport-submit');
        if (ownerTpSubmit) {
            ownerTpSubmit.addEventListener('click', () => {
                const input = document.getElementById('owner-teleport-input') as HTMLInputElement;
                const carNum = parseInt(input?.value, 10);
                this.teleportToCarriage(carNum);
            });
        }

        const ownerTpInput = document.getElementById('owner-teleport-input') as HTMLInputElement;
        if (ownerTpInput) {
            ownerTpInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const carNum = parseInt(ownerTpInput.value, 10);
                    this.teleportToCarriage(carNum);
                }
            });
        }

        const ownerTpClose = document.getElementById('btn-owner-teleport-close');
        if (ownerTpClose) {
            ownerTpClose.addEventListener('click', () => this.closeOwnerTeleportModal());
        }

        document.querySelectorAll('.btn-quick-tp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = (e.currentTarget as HTMLElement).getAttribute('data-car');
                if (target !== null) {
                    this.teleportToCarriage(parseInt(target, 10));
                }
            });
        });

        // Restore saved coins and inventory from checkpoint
        try {
            const savedCoins = localStorage.getItem('last_metro_coins');
            if (savedCoins) this.coins = parseInt(savedCoins, 10) || 0;
            const savedInv = localStorage.getItem('last_metro_inventory');
            if (savedInv) this.inventory = { ...this.inventory, ...JSON.parse(savedInv) };
            this.updateCoinsUI();
            this.updateHotbarUI();
        } catch (e) {}
    }

    private updateLanguageUI() {
        const isEt = this.lang === 'et';
        const titleEl = document.getElementById('hud-game-title');
        if (titleEl) titleEl.innerText = isEt ? '🚇 VIIMANE METROO' : '🚇 LAST METRO';

        const startTitle = document.getElementById('start-game-title');
        const startSub = document.getElementById('start-game-sub');
        const startPrompt = document.getElementById('start-game-prompt-text');
        if (startTitle) startTitle.innerText = isEt ? 'VIIMANE METROO' : 'LAST METRO';
        if (startSub) startSub.innerText = isEt ? 'LAST METRO · 3D MÜSTEERIUM' : 'LAST METRO · 3D MYSTERY ADVENTURE';
        if (startPrompt) startPrompt.innerText = isEt ? '👆 Vajuta ükskõik kuhu, et mängu alustada' : '👆 Click anywhere to start the game';

        const carLabel = document.getElementById('hud-car-label');
        if (carLabel) {
            if (this.currentCarIndex === 0) {
                carLabel.innerText = isEt ? 'ESIALGNE VAGUN' : 'INITIAL CAR';
            } else {
                carLabel.innerText = isEt ? `VAGUN ${this.currentCarIndex}` : `CARRIAGE ${this.currentCarIndex}`;
            }
        }

        const branchLabel = document.getElementById('hud-branch-label');
        if (branchLabel) {
            if (this.branchDirection === 'right') branchLabel.innerText = isEt ? '➡️ PAREM RADA' : '➡️ RIGHT TRACK';
            else if (this.branchDirection === 'left') branchLabel.innerText = isEt ? '⬅️ VASAK RADA' : '⬅️ LEFT TRACK';
            else branchLabel.innerText = isEt ? '❓ SUUND VALIMATA' : '❓ NO DIRECTION';
        }

        const crouchText = document.getElementById('btn-toggle-crouch-text');
        if (crouchText) {
            crouchText.innerText = this.isCrouching
                ? (isEt ? 'Püsti [C]' : 'Stand [C]')
                : (isEt ? 'Kükita [C]' : 'Crouch [C]');
        }
    }

    public showThought(textEt: string, textEn: string, durationMs: number = 4000) {
        const text = this.lang === 'et' ? textEt : textEn;
        const thoughtBox = document.getElementById('thought-bubble');
        const thoughtText = document.getElementById('thought-text');
        if (thoughtBox && thoughtText) {
            thoughtText.innerText = `„${text}”`;
            thoughtBox.style.display = 'flex';
            thoughtBox.classList.add('fade-in');

            if (this.currentThoughtTimeout) clearTimeout(this.currentThoughtTimeout);
            this.currentThoughtTimeout = setTimeout(() => {
                thoughtBox.style.display = 'none';
            }, durationMs);
        }
    }
    private buildStationPlatform() {
        this.stationPlatformGroup = new THREE.Group();

        // Platform floor
        const platMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.7 });
        const platGeo = new THREE.BoxGeometry(10, 0.8, 55);
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.set(4.5, -0.4, 0);
        platform.receiveShadow = true;
        this.stationPlatformGroup.add(platform);

        // Yellow safety edge line
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3, emissive: 0xf1c40f, emissiveIntensity: 0.2 });
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 55), edgeMat);
        edge.position.set(0.65, 0.01, 0);
        this.stationPlatformGroup.add(edge);

        // Station wall & advertising posters
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.8 });
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 55), wallMat);
        wall.position.set(9.5, 2.6, 0);
        this.stationPlatformGroup.add(wall);

        // Steel Rails & Ties on Track Bed
        const railMat = new THREE.MeshStandardMaterial({ color: 0xa4b0be, metalness: 0.95, roughness: 0.15 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.9 });
        [-0.7, 0.7].forEach(rx => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 60), railMat);
            rail.position.set(rx, -0.45, 0);
            this.stationPlatformGroup.add(rail);
        });
        for (let tz = -30; tz <= 30; tz += 1.2) {
            const tie = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.25), tieMat);
            tie.position.set(0, -0.52, tz);
            this.stationPlatformGroup.add(tie);
        }

        // Platform Pillars
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.4 });
        for (let z = -20; z <= 20; z += 10) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), pillarMat);
            pillar.position.set(3.5, 2.1, z);
            this.stationPlatformGroup.add(pillar);
        }

        // Bright Platform Ceiling & Overhead Lights (Optimized for 60+ FPS)
        const platformAmbient = new THREE.PointLight(0xfff8ee, 2.4, 40);
        platformAmbient.position.set(4.5, 4.0, 0);
        this.stationPlatformGroup.add(platformAmbient);

        for (let z = -22; z <= 22; z += 7.5) {
            // Bright fluorescent lamp strip fixture (glowing MeshBasicMaterial)
            const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const lampFixture = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 2.2), lampMat);
            lampFixture.position.set(3.5, 4.5, z);
            this.stationPlatformGroup.add(lampFixture);
        }

        // Two key point lights covering the platform ends smoothly
        [-12, 12].forEach(pz => {
            const pLight = new THREE.PointLight(0xfffaed, 1.8, 24);
            pLight.position.set(3.5, 4.2, pz);
            this.stationPlatformGroup.add(pLight);
        });

        // Digital Destination Board
        const boardCanvas = document.createElement('canvas');
        boardCanvas.width = 512;
        boardCanvas.height = 128;
        const bCtx = boardCanvas.getContext('2d');
        if (bCtx) {
            bCtx.fillStyle = '#0a0d14';
            bCtx.fillRect(0, 0, 512, 128);
            bCtx.strokeStyle = '#ffd32a';
            bCtx.lineWidth = 4;
            bCtx.strokeRect(4, 4, 504, 120);
            bCtx.fillStyle = '#ffd32a';
            bCtx.font = 'bold 26px monospace';
            bCtx.textAlign = 'center';
            bCtx.fillText('🚇 VIIMANE METROO', 256, 45);
            bCtx.fillStyle = '#00f2fe';
            bCtx.font = 'bold 22px monospace';
            bCtx.fillText('23:45 · SAABUB KOHE', 256, 90);
        }
        const boardTex = new THREE.CanvasTexture(boardCanvas);
        const boardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.6, 2.2),
            new THREE.MeshBasicMaterial({ map: boardTex })
        );
        boardMesh.position.set(3.5, 3.2, 0);
        this.stationPlatformGroup.add(boardMesh);

        this.scene.add(this.stationPlatformGroup);
    }

    private buildTunnel() {
        this.tunnelGroup = new THREE.Group();

        // Long tunnel tube segments
        const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.95, side: THREE.BackSide });
        const tunnelGeo = new THREE.CylinderGeometry(5.5, 5.5, 120, 24, 1, true);
        const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        tunnelMesh.rotation.x = Math.PI / 2;
        tunnelMesh.position.set(0, 1.5, 0);
        this.tunnelGroup.add(tunnelMesh);

        // Vivid Passing Subway Tunnel Lights (Ultra-Fast GPU-efficient Glowing Meshes)
        for (let z = -56; z <= 56; z += 6) {
            // Wall fluorescent strip lamps (both left and right sides)
            [-4.8, 4.8].forEach((lx, sIdx) => {
                const isWarm = (Math.abs(z) + sIdx) % 3 === 0;
                const lampMat = new THREE.MeshBasicMaterial({
                    color: isWarm ? 0xffbe76 : 0x70a1ff
                });
                const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 1.8), lampMat);
                lampMesh.position.set(lx, 1.8, z);
                this.tunnelGroup.add(lampMesh);
            });

            // Ceiling overhead light strips
            const ceilLamp = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.1, 1.2),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            ceilLamp.position.set(0, 4.2, z);
            this.tunnelGroup.add(ceilLamp);

            // Signal track lights (Red / Green / Amber dots)
            if (z % 18 === 0) {
                const sigColor = z % 36 === 0 ? 0x2ed573 : 0xff4757;
                const sigMat = new THREE.MeshBasicMaterial({ color: sigColor });
                const signalMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), sigMat);
                signalMesh.position.set(-3.2, 0.4, z);
                this.tunnelGroup.add(signalMesh);
            }
        }

        // Single ambient tunnel light for smooth mood lighting
        const tunnelAmbient = new THREE.PointLight(0x40739e, 0.6, 60);
        tunnelAmbient.position.set(0, 2.5, 0);
        this.tunnelGroup.add(tunnelAmbient);

        // Surreal exterior backdrop mesh (for Vagun 5 window anomaly)
        const skyGeo = new THREE.SphereGeometry(60, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x8e44ad,
            side: THREE.BackSide,
            wireframe: true,
            transparent: true,
            opacity: 0
        });
        this.windowSurrealSky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.windowSurrealSky);

        this.scene.add(this.tunnelGroup);
    }

    // --- High Fidelity Carriage Construction ---

    private createCarriageGeometry(index: number, branch: DirectionBranch, theme: CarriageData['theme']): CarriageData {
        const carGroup = new THREE.Group();
        const lights: THREE.PointLight[] = [];
        const lightMeshes: THREE.Mesh[] = [];
        const passengers: AIPassenger[] = [];

        const carLength = 20;
        const carWidth = 3.4;
        const carHeight = 3.0;

        // 1. Floor: Rubberized subway floor + Safety yellow tactile boundary stripe along aisle
        const floorMat = new THREE.MeshStandardMaterial({
            color: theme === 'abandoned' ? 0x222629 : 0x3d4852,
            roughness: 0.75,
            metalness: 0.15
        });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(carWidth, 0.2, carLength), floorMat);
        floor.position.set(0, 0, 0);
        floor.receiveShadow = true;
        carGroup.add(floor);

        // Tactile safety yellow boundary stripes along the aisle
        const yellowStripeMat = new THREE.MeshStandardMaterial({
            color: 0xf1c40f,
            roughness: 0.55,
            metalness: 0.1
        });
        [-0.85, 0.85].forEach(sx => {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.202, carLength), yellowStripeMat);
            stripe.position.set(sx, 0.001, 0);
            carGroup.add(stripe);
        });

        // Stainless steel threshold floor plates at door entries (z = 0)
        const thresholdMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.25,
            metalness: 0.9
        });
        [-carWidth / 2 + 0.15, carWidth / 2 - 0.15].forEach(tx => {
            const threshold = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.203, 2.3), thresholdMat);
            threshold.position.set(tx, 0.002, 0);
            carGroup.add(threshold);
        });

        // 2. Ceiling: Ribbed architectural subway ceiling with recessed lighting channels
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: theme === 'lounge' ? 0x242830 : 0xe8ecf1,
            roughness: 0.45,
            metalness: 0.15
        });
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(carWidth, 0.15, carLength), ceilingMat);
        ceiling.position.set(0, carHeight, 0);
        carGroup.add(ceiling);

        // Air conditioning vents and emergency speakers in ceiling
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x333a42, roughness: 0.8 });
        for (let vz = -8; vz <= 8; vz += 3.2) {
            const vent = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.35), ventMat);
            vent.position.set(0, carHeight - 0.08, vz);
            carGroup.add(vent);
        }

        // 3. Side Walls with Window Cutouts & Platform Sliding Doors
        const wallColor = theme === 'abandoned' ? 0x3d3d3d : theme === 'neon' ? 0x1e272e : 0xf1f2f6;
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 });

        this.sideDoorMeshes = [];

        // Build left and right walls with central door entryways at z = 0
        [-carWidth / 2, carWidth / 2].forEach(x => {
            const wallFront = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight, 8.8), wallMat);
            wallFront.position.set(x, carHeight / 2, 5.6);
            carGroup.add(wallFront);

            const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight, 8.8), wallMat);
            wallBack.position.set(x, carHeight / 2, -5.6);
            carGroup.add(wallBack);

            const wallTop = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight - 2.2, 2.4), wallMat);
            wallTop.position.set(x, 2.2 + (carHeight - 2.2) / 2, 0);
            carGroup.add(wallTop);

            // Pneumatic Sliding Doors in each doorway
            const doorLeafMat = new THREE.MeshStandardMaterial({
                color: theme === 'abandoned' ? 0x7f1d1d : 0x10ac84,
                metalness: 0.6,
                roughness: 0.35
            });
            const doorGlassMat = new THREE.MeshBasicMaterial({ color: 0x010204 });

            const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 1.15), doorLeafMat);
            const leftWin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.45), doorGlassMat);
            leftWin.position.set(0, 0.25, 0);
            leftLeaf.add(leftWin);
            leftLeaf.position.set(x, 1.1, -0.55);
            carGroup.add(leftLeaf);
            this.sideDoorMeshes.push({ mesh: leftLeaf, baseZ: -0.55, dir: -1 });

            const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 1.15), doorLeafMat);
            const rightWin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.45), doorGlassMat);
            rightWin.position.set(0, 0.25, 0);
            rightLeaf.add(rightWin);
            rightLeaf.position.set(x, 1.1, 0.55);
            carGroup.add(rightLeaf);
            this.sideDoorMeshes.push({ mesh: rightLeaf, baseZ: 0.55, dir: 1 });
        });

        // Windows (Subway Tinted Glass - passing tunnel lights clearly visible outside!)
        const windowGlassMat = new THREE.MeshPhysicalMaterial({
            color: 0x1a2634,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.25
        });
        [-carWidth / 2, carWidth / 2].forEach(x => {
            for (let z = -7; z <= 7; z += 4.5) {
                if (Math.abs(z) < 2) continue; // skip door entry
                const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 2.5), windowGlassMat);
                windowPane.position.set(x, 1.6, z);
                carGroup.add(windowPane);
            }
        });

        // 4. Stainless Steel Grab Rails & Overhead Hanging Grab Loops (Straps)
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xededed, metalness: 0.95, roughness: 0.15 });
        const strapMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.6 });
        [-0.9, 0.9].forEach(x => {
            for (let z = -8; z <= 8; z += 4) {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, carHeight, 12), poleMat);
                pole.position.set(x, carHeight / 2, z);
                carGroup.add(pole);
            }

            // Overhead long rail
            const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, carLength - 2, 12), poleMat);
            rail.rotation.x = Math.PI / 2;
            rail.position.set(x, 2.3, 0);
            carGroup.add(rail);

            // Overhead hanging grab straps with handles
            for (let sz = -7.5; sz <= 7.5; sz += 1.5) {
                if (Math.abs(sz) < 1.4) continue; // clear above doorway
                const strapBand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), ventMat);
                strapBand.position.set(x, 2.18, sz);
                carGroup.add(strapBand);

                const strapRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), strapMat);
                strapRing.rotation.y = Math.PI / 2;
                strapRing.position.set(x, 2.04, sz);
                carGroup.add(strapRing);
            }
        });

        // 5. Glass Windscreen Partitions at ends of seat rows
        const partitionGlassMat = new THREE.MeshStandardMaterial({
            color: 0xddf0ff,
            transparent: true,
            opacity: 0.35,
            roughness: 0.05,
            metalness: 0.1
        });
        [-1.25, 1.25].forEach(px => {
            [-1.8, 1.8].forEach(pz => {
                // Sleek transparent safety glass
                const partitionGlass = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.1, 0.62), partitionGlassMat);
                partitionGlass.position.set(px, 0.85, pz);
                carGroup.add(partitionGlass);

                // Sleek vertical chrome edge pole on aisle side
                const edgeX = px > 0 ? px - 0.31 : px + 0.31;
                const edgePole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.2, 12), poleMat);
                edgePole.position.set(edgeX, 0.85, pz);
                carGroup.add(edgePole);

                // Top and bottom mounting rails
                const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.64), poleMat);
                topRail.position.set(px, 1.4, pz);
                carGroup.add(topRail);

                const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.64), poleMat);
                bottomRail.position.set(px, 0.32, pz);
                carGroup.add(bottomRail);
            });
        });

        // 6. Dual Long Ergonomic Passenger Subway Benches with Sculpted Cushions & Dividers
        const seatBaseColor = theme === 'lounge' ? 0x6c5ce7 : theme === 'abandoned' ? 0x2d3436 : 0x0984e3;
        const seatBaseMat = new THREE.MeshStandardMaterial({ color: seatBaseColor, roughness: 0.65 });
        const cushionColor = theme === 'lounge' ? 0x574b90 : theme === 'abandoned' ? 0x1e272e : 0x1e3799;
        const cushionMat = new THREE.MeshStandardMaterial({ color: cushionColor, roughness: 0.75 });
        const dividerMat = new THREE.MeshStandardMaterial({ color: 0x718093, metalness: 0.8, roughness: 0.2 });

        [-1.28, 1.28].forEach(x => {
            // Rear Bench (z = -4.9, length 6.0m) and Front Bench (z = 4.9, length 6.0m)
            [-4.9, 4.9].forEach(centerZ => {
                // Bench Base Structure
                const seatBench = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 6.0), seatBaseMat);
                seatBench.position.set(x, 0.22, centerZ);
                carGroup.add(seatBench);

                // Continuous Plush Cushion Surface (top surface at y = 0.48)
                const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 5.96), cushionMat);
                seatCushion.position.set(x, 0.46, centerZ);
                carGroup.add(seatCushion);

                // Backrest against the subway wall
                const backX = x > 0 ? 1.58 : -1.58;
                const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 5.96), cushionMat);
                seatBack.position.set(backX, 0.8, centerZ);
                carGroup.add(seatBack);

                // Individual Seat Divider Bars / Armrests along the bench
                for (let dz = -2.4; dz <= 2.4; dz += 1.2) {
                    const divider = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 8), dividerMat);
                    divider.rotation.z = x > 0 ? -Math.PI / 8 : Math.PI / 8;
                    divider.position.set(x, 0.62, centerZ + dz);
                    carGroup.add(divider);
                }
            });
        });

        // 7. Cove Transit Posters & Warning Signs Above Windows
        const adPalette = [0x0984e3, 0x00b894, 0xe17055, 0x6c5ce7, 0xfdcb6e];
        [-carWidth / 2 + 0.08, carWidth / 2 - 0.08].forEach((ax, sideIdx) => {
            for (let az = -6.5; az <= 6.5; az += 2.8) {
                if (Math.abs(az) < 1.6) continue;
                const adColor = adPalette[Math.abs(Math.floor(az * 3 + sideIdx)) % adPalette.length];
                const adMat = new THREE.MeshStandardMaterial({ color: adColor, roughness: 0.4 });
                const adMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.85), adMat);
                adMesh.position.set(ax, 2.45, az);
                carGroup.add(adMesh);
            }
        });

        // 8. Fluorescent Ceiling Tube Lights
        for (let z = -6.5; z <= 6.5; z += 4.5) {
            const lightCoverMat = new THREE.MeshBasicMaterial({ color: theme === 'dark' ? 0xff4757 : 0xffffff });
            const lightCover = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 1.8), lightCoverMat);
            lightCover.position.set(0, carHeight - 0.05, z);
            carGroup.add(lightCover);
            lightMeshes.push(lightCover);

            const pLight = new THREE.PointLight(
                theme === 'dark' ? 0xff4757 : theme === 'neon' ? 0x00f2fe : 0xffeedd,
                theme === 'dark' ? 0.3 : 0.85,
                10
            );
            pLight.position.set(0, carHeight - 0.3, z);
            carGroup.add(pLight);
            lights.push(pLight);
        }

        // 9. Interactive Dynamic Metro Route Map & Status Displays on Interior Walls
        const isEt = this.lang === 'et';
        const routeDisplayRight = this.buildMetroRouteDisplay(index, isEt);
        routeDisplayRight.position.set(1.64, 1.82, 0);
        routeDisplayRight.rotation.y = -Math.PI / 2;
        carGroup.add(routeDisplayRight);

        const routeDisplayLeft = this.buildMetroRouteDisplay(index, isEt);
        routeDisplayLeft.position.set(-1.64, 1.82, 0);
        routeDisplayLeft.rotation.y = Math.PI / 2;
        carGroup.add(routeDisplayLeft);

        let mapMesh: THREE.Group = routeDisplayRight;

        // 10. End Gangway Doors (Front = +Z / Right Branch, Back = -Z / Left Branch)
        const doorFront = this.buildGangwayDoor(carWidth, carHeight, 1, index, branch, theme);
        doorFront.position.set(0, 0, carLength / 2);
        carGroup.add(doorFront);

        const doorBack = this.buildGangwayDoor(carWidth, carHeight, -1, index, branch, theme);
        doorBack.position.set(0, 0, -carLength / 2);
        carGroup.add(doorBack);

        // 11. Golden Shop (Vagun 100 Checkpoint) Construction & Setup
        let inspectableItem: THREE.Group | undefined;
        let inspectableText: any;

        if (index === 100 || theme === 'golden_shop') {
            // Golden Shop Luxury Counter & Pedestals
            const counterMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.3, metalness: 0.2 });
            const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.95, roughness: 0.15 });

            // Long Sales Counter
            const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.9), counterMat);
            counter.position.set(0, 0.48, 1.5);
            carGroup.add(counter);

            const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 1.0), goldTrimMat);
            counterTop.position.set(0, 0.98, 1.5);
            carGroup.add(counterTop);

            // Glowing 3D Neon Sign: ✨ GOLDEN SHOP ✨
            const signCanvas = document.createElement('canvas');
            signCanvas.width = 512;
            signCanvas.height = 128;
            const sCtx = signCanvas.getContext('2d');
            if (sCtx) {
                sCtx.fillStyle = '#0a0d14';
                sCtx.fillRect(0, 0, 512, 128);
                sCtx.strokeStyle = '#ffd32a';
                sCtx.lineWidth = 6;
                sCtx.strokeRect(6, 6, 500, 116);
                sCtx.fillStyle = '#ffd32a';
                sCtx.font = 'bold 36px sans-serif';
                sCtx.textAlign = 'center';
                sCtx.fillText('✨ GOLDEN SHOP ✨', 256, 58);
                sCtx.fillStyle = '#ffffff';
                sCtx.font = 'bold 20px sans-serif';
                sCtx.fillText('VAGUN 100 CHECKPOINT', 256, 96);
            }
            const signTex = new THREE.CanvasTexture(signCanvas);
            const signMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.05), new THREE.MeshBasicMaterial({ map: signTex }));
            signMesh.position.set(0, 2.5, 1.5);
            carGroup.add(signMesh);

            // 5 Item display pedestals on counter
            const itemPedestals = [
                { id: 'night_vision', x: -0.9, icon: '👓', name: 'NV Goggles' },
                { id: 'speed_boost', x: -0.45, icon: '👟', name: 'Speed' },
                { id: 'clue_detector', x: 0.0, icon: '🔍', name: 'Detector' },
                { id: 'secret_pass', x: 0.45, icon: '🎟️', name: 'Secret Pass' },
                { id: 'radio', x: 0.9, icon: '📻', name: 'Radio' }
            ];

            itemPedestals.forEach(p => {
                const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 16), goldTrimMat);
                ped.position.set(p.x, 1.05, 1.5);
                carGroup.add(ped);

                const itemMesh = this.createHeldItemModel(p.id);
                itemMesh.position.set(p.x, 1.2, 1.5);
                itemMesh.rotation.set(0, Math.PI, 0);
                carGroup.add(itemMesh);
            });

            // Friendly AI Shopkeeper NPC behind counter
            const shopkeeper = new THREE.Group();
            const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.5 });
            const uniformMat = new THREE.MeshStandardMaterial({ color: 0x1b1464, roughness: 0.6 });
            const goldBadgeMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9 });

            // Torso
            const sTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.28), uniformMat);
            sTorso.position.set(0, 1.3, 0);
            shopkeeper.add(sTorso);

            // Golden Epaulets & Badge
            const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), goldBadgeMat);
            badge.position.set(-0.1, 1.45, 0.15);
            shopkeeper.add(badge);

            // Head & Golden Cap
            const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), skinMat);
            sHead.position.set(0, 1.75, 0);
            shopkeeper.add(sHead);

            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), uniformMat);
            cap.position.set(0, 1.86, 0);
            shopkeeper.add(cap);

            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.12), goldBadgeMat);
            visor.position.set(0, 1.83, 0.14);
            shopkeeper.add(visor);

            shopkeeper.position.set(0, 0, 2.3);
            carGroup.add(shopkeeper);
            this.goldenShopKeeperMesh = shopkeeper;

            // Interactive Shop Prompt Mesh on Counter
            inspectableItem = this.createInspectableNote();
            inspectableItem.position.set(0, 1.05, 1.1);
            carGroup.add(inspectableItem);
            inspectableText = {
                titleEt: '🛒 KULDNE POOD (VAGUN 100)',
                descEt: 'Astu leti juurde ja vali endale vajalikud esemed (Ööprillid, Kiirus, Vihjeandur, Salapilet, Raadio).',
                titleEn: '🛒 GOLDEN SHOP (CARRIAGE 100)',
                descEn: 'Step up to the counter and purchase equipment with your collected Metro Coins.'
            };
        } else if (index === 6 || index === 14 || index === 25 || index === 28 || index === 32 || index === 39 || index === 42 || index === 50 || index === 55 || index === 70 || index === 78 || index === 80 || index === 87) {
            // Story Inspectable Props
            inspectableItem = this.createInspectableNote();
            inspectableItem.position.set(index % 2 === 0 ? -1.1 : 1.1, 0.62, (index % 5) * 1.5 - 2.0);
            carGroup.add(inspectableItem);

            const storyClues: { [key: number]: { titleEt: string; descEt: string; titleEn: string; descEn: string } } = {
                6: {
                    titleEt: '📜 Vana Metroopilet ja Märkmik (1987)',
                    descEt: '„Rong nr 404 väljus viimast korda 14. oktoobril 1987. Peatusi ei registreeritud enam kunagi. Süsteem lukustus igaveseks ringiks...”',
                    titleEn: '📜 Vintage Subway Pass & Notebook (1987)',
                    descEn: '“Train No. 404 departed for the final time on October 14, 1987. No station arrivals were ever recorded again. The track sealed into an infinite loop...”'
                },
                14: {
                    titleEt: '🎫 Salapärane Metroopilet',
                    descEt: 'Vana reljeefne pilet: „Rong 100 · Ühesuunapilet Tundmatusse”.',
                    titleEn: '🎫 Mysterious Subway Ticket',
                    descEn: 'An embossed ticket: „Train 100 · One-way ticket into the Unknown”.'
                },
                26: {
                    titleEt: '🎫 Vana Metroopilet 1987',
                    descEt: 'Kuupäev: 14.10.1987. Märge: „Projekt Viimane Metroo — Peatusi ei ole.”',
                    titleEn: '🎫 Old Ticket 1987',
                    descEn: 'Date: 14.10.1987. Note: „Project Last Metro — No scheduled stops.”'
                },
                28: {
                    titleEt: '🧩 Peidetud Koodisedel (Vagun 28)',
                    descEt: 'Sedel istme all: „Uksekood: 1987”. Uks on nüüd avatud!',
                    titleEn: '🧩 Hidden Code Slip (Carriage 28)',
                    descEn: 'Note under the seat: „Door code: 1987”. Bulkhead door is now unlocked!'
                },
                32: {
                    titleEt: '🗺️ Märgistatud Metrookaart',
                    descEt: 'Kaardil on punane ring: „Vagun 50 peidab tõde. Jätka liikumist.”',
                    titleEn: '🗺️ Marked Transit Map',
                    descEn: 'A red circle notes: „Carriage 50 holds the truth. Keep moving forward.”'
                },
                39: {
                    titleEt: '📋 Hooldusraamatu Väljavõte',
                    descEt: '„Tunnel 7C ei jõua kunagi pinnale. Rong sõidab suletud ajatsüklis.”',
                    titleEn: '📋 Maintenance Log Excerpt',
                    descEn: '„Tunnel 7C never surfaces. The train operates in a closed temporal loop.”'
                },
                42: {
                    titleEt: '🎒 Mahajäetud Seljakott',
                    descEt: 'Koti sees on märkmik: „Vagunis 50 saabub esimene suur vastus.”',
                    titleEn: '🎒 Abandoned Backpack',
                    descEn: 'Inside is a diary: „In Carriage 50, the first great answer awaits.”'
                },
                50: {
                    titleEt: '⭐ Projekti „Igavene Metroo” Dokument (1987)',
                    descEt: '„Rong 100 loodi 1987. aastal ruumi ja aja anomaalia testimiseks. Väljapääs asub Vagun 100 taga. Jätka liikumist!”',
                    titleEn: '⭐ Project „Eternal Metro” Document (1987)',
                    descEn: '„Train 100 was designed in 1987 to test temporal displacement. The gateway lies beyond Carriage 100. Keep going!”'
                },
                55: {
                    titleEt: '🎫 Kuldne Pilet #100',
                    descEt: '„Pilet Vagunisse 100 — Kuldne Checkpoint ja Pood”.',
                    titleEn: '🎫 Golden Ticket #100',
                    descEn: '„Ticket to Carriage 100 — Golden Checkpoint & Shop”.'
                },
                70: {
                    titleEt: '⭐ Kadunud Reisija Päevik',
                    descEt: '„Olen jõudnud vagunisse 70. Vagun 100 on checkpoint ja oaas. Ära anna alla!”',
                    titleEn: '⭐ Lost Passenger\'s Journal',
                    descEn: '„I have reached Carriage 70. Carriage 100 is a checkpoint and safe haven. Do not give up!”'
                },
                78: {
                    titleEt: '🧩 Uksehoova Juhend (Vagun 78)',
                    descEt: '„Tõmba kuldset hooba paremal. Teekond jätkub.” Uks on avatud!',
                    titleEn: '🧩 Bulkhead Lever Guide (Carriage 78)',
                    descEn: '„Pull the golden lever on the right. The journey continues.” Door unlocked!'
                },
                80: {
                    titleEt: '⭐ Suur Metroo Peakaart',
                    descEt: '„Vagun 80 läbitud. Vagun 100 (Kuldne Pood) asub vaid 20 vaguni kaugusel!”',
                    titleEn: '⭐ Grand Master Transit Map',
                    descEn: '„Carriage 80 reached. Carriage 100 (Golden Shop) is just 20 carriages ahead!”'
                },
                87: {
                    titleEt: '💳 Kuldne Konduktori Kaart',
                    descEt: '„Vagun 100 on avatud kõigile ränduritele. Pood võtab vastu Metro Coine.”',
                    titleEn: '💳 Golden Conductor Keycard',
                    descEn: '„Carriage 100 is open to all explorers. The Shop accepts Metro Coins.”'
                }
            };
            inspectableText = storyClues[index] || {
                titleEt: `📜 Dokument Vagunis ${index}`,
                descEt: 'Metroo saladused süvenevad iga vaguniga.',
                titleEn: `📜 Document in Carriage ${index}`,
                descEn: 'The mysteries of the subway deepen with every carriage.'
            };
        } else if (index >= 101) {
            // Check CLUES_DATABASE for collectible items in carriages 101-200+
            const dbClue = CLUES_DATABASE.find(c => c.carIndex === index && !this.collectedClues.some(cc => cc.id === c.id));
            if (dbClue) {
                inspectableItem = this.createClue3DMesh(dbClue);
                if (dbClue.placement === 'floor') {
                    inspectableItem.position.set(0.2, 0.08, 0);
                } else if (dbClue.placement === 'table') {
                    inspectableItem.position.set(0, 0.68, 1.2);
                } else if (dbClue.placement === 'wall') {
                    inspectableItem.position.set(index % 2 === 0 ? -1.62 : 1.62, 1.4, 0);
                } else { // 'seat'
                    inspectableItem.position.set(index % 2 === 0 ? -1.1 : 1.1, 0.58, (index % 5) * 1.5 - 2.0);
                }
                carGroup.add(inspectableItem);
                this.activeClueMesh = inspectableItem;
                inspectableText = {
                    titleEt: dbClue.titleEt,
                    descEt: dbClue.textEt,
                    titleEn: dbClue.titleEn,
                    descEn: dbClue.textEn
                };
            }
        } else if (index >= 11 && index % 5 === 1) {
            // Procedural Keypad Puzzle
            const code = `${Math.floor(1000 + Math.random() * 9000)}`;
            inspectableItem = this.createKeypadProp();
            inspectableItem.position.set(1.6, 1.4, 8.8);
            carGroup.add(inspectableItem);
            inspectableText = {
                titleEt: `🔐 Elektrooniline Uksekood: ${code}`,
                descEt: 'Vajuta nuppudele ja sisesta 4-kohaline kood ukse avamiseks.',
                titleEn: `🔐 Electronic Door Code: ${code}`,
                descEn: 'Enter the 4-digit code to unlock the carriage bulkhead door.'
            };
        }


        // 12. Scatter Collectible Rotating Golden Coins throughout the carriage
        this.spawnCollectibleCoins(carGroup, index === 100 ? 8 : 3);

        // 13. Populate Realistic 3D AI Passengers
        this.populatePassengers(carGroup, index, theme, passengers);

        // 14. Carriage 200 Abandoned Station Platform Area (Step Out Onto Platform)
        if (index === 200) {
            const platformGroup = new THREE.Group();
            platformGroup.name = 'station_platform_200';

            // Platform floor (x from 1.7 to 9.5 -> width 7.8, centered at x = 5.6, z from -16 to 16 -> length 32)
            const platFloorMat = new THREE.MeshStandardMaterial({
                color: 0x2b303a,
                roughness: 0.85,
                metalness: 0.1
            });
            const platFloor = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.2, 32), platFloorMat);
            platFloor.position.set(5.6, 0, 0);
            platFloor.receiveShadow = true;
            platformGroup.add(platFloor);

            // Tactile safety yellow warning edge along the track (x = 1.85)
            const platEdgeMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 });
            const platEdge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.205, 32), platEdgeMat);
            platEdge.position.set(1.85, 0.002, 0);
            platformGroup.add(platEdge);

            // Platform ceiling at y = 3.6
            const platCeilingMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.9 });
            const platCeiling = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.2, 32), platCeilingMat);
            platCeiling.position.set(5.6, 3.6, 0);
            platformGroup.add(platCeiling);

            // Platform back wall at x = 9.5
            const platWallMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.8 });
            const platBackWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 32), platWallMat);
            platBackWall.position.set(9.5, 1.8, 0);
            platformGroup.add(platBackWall);

            // Platform end walls (z = -16 and z = 16)
            [-16, 16].forEach(wz => {
                const platEndWall = new THREE.Mesh(new THREE.BoxGeometry(7.8, 3.6, 0.2), platWallMat);
                platEndWall.position.set(5.6, 1.8, wz);
                platformGroup.add(platEndWall);
            });

            // Support Pillars at x = 5.2 (z = -12, -6, 0, 6, 12)
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.7, metalness: 0.2 });
            [-12, -6, 0, 6, 12].forEach(pz => {
                const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.6, 0.5), pillarMat);
                pillar.position.set(5.2, 1.8, pz);
                platformGroup.add(pillar);

                // Warning striped base on pillar
                const pillarBaseMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.5 });
                const pillarBase = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.6, 0.54), pillarBaseMat);
                pillarBase.position.set(5.2, 0.3, pz);
                platformGroup.add(pillarBase);
            });

            // Station Hanging Tube Lights & Point Lights along the platform (Fully Bright and Illuminated)
            [-12, -6, 0, 6, 12].forEach(lz => {
                const platLightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
                platLightMesh.position.set(5.5, 3.5, lz);
                platformGroup.add(platLightMesh);
                lightMeshes.push(platLightMesh);

                const platLight = new THREE.PointLight(0xffeedd, 1.4, 18);
                platLight.position.set(5.5, 3.1, lz);
                platformGroup.add(platLight);
                lights.push(platLight);
            });

            // Train interior bright floodlights for Carriage 200
            [-6, 0, 6].forEach(tz => {
                const carInteriorLight = new THREE.PointLight(0xffffff, 1.3, 12);
                carInteriorLight.position.set(0, 2.7, tz);
                carGroup.add(carInteriorLight);
                lights.push(carInteriorLight);
            });

            // Station Signboard on Back Wall
            const signGroup = new THREE.Group();
            const signBoardMat = new THREE.MeshStandardMaterial({ color: 0x0a192f, metalness: 0.8 });
            const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 5.0), signBoardMat);
            signBoard.position.set(9.38, 2.4, 0);
            signGroup.add(signBoard);

            const signCanvas = document.createElement('canvas');
            signCanvas.width = 512;
            signCanvas.height = 128;
            const sctx = signCanvas.getContext('2d');
            if (sctx) {
                sctx.fillStyle = '#0a192f';
                sctx.fillRect(0, 0, 512, 128);
                sctx.fillStyle = '#ff4757';
                sctx.font = 'bold 34px monospace';
                sctx.textAlign = 'center';
                sctx.fillText('🚇 JAAM 200 · TERMINAL', 256, 50);
                sctx.fillStyle = '#00d2d3';
                sctx.font = '20px sans-serif';
                sctx.fillText('SEKTOR 200 — LÕPPEATUSED', 256, 90);
            }

            const signTex = new THREE.CanvasTexture(signCanvas);
            const signFaceMat = new THREE.MeshBasicMaterial({ map: signTex });
            const signFace = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.75), signFaceMat);
            signFace.rotation.y = -Math.PI / 2;
            signFace.position.set(9.33, 2.4, 0);
            signGroup.add(signFace);
            platformGroup.add(signGroup);

            // Station Exit Stairs Group (saved for cutscene collapse animation)
            const stairsGroup = new THREE.Group();
            stairsGroup.name = 'station_stairs_group';
            this.stationStairsGroup = stairsGroup;

            const stairMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.7, metalness: 0.3 });
            for (let s = 0; s < 7; s++) {
                const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.65), stairMat);
                step.position.set(6.0, 0.14 + s * 0.28, 10.5 + s * 0.65);
                stairsGroup.add(step);
            }
            platformGroup.add(stairsGroup);

            // Blast Exit Door at top of stairs (z = 15.2, x = 6.0, y = 2.4)
            const blastDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x11141a, metalness: 0.9 }));
            blastDoorFrame.position.set(6.0, 2.4, 15.1);
            platformGroup.add(blastDoorFrame);

            const blastDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.5, 0.15), new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4, metalness: 0.7 }));
            blastDoorLeaf.position.set(6.0, 2.4, 15.05);
            blastDoorLeaf.name = 'station_200_blast_door';
            platformGroup.add(blastDoorLeaf);

            const exitSignMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.1), new THREE.MeshBasicMaterial({ color: 0x2ed573 }));
            exitSignMesh.position.set(6.0, 3.8, 15.0);
            platformGroup.add(exitSignMesh);

            carGroup.add(platformGroup);
        }

        return {
            group: carGroup,
            index,
            branch,
            theme,
            lights,
            lightMeshes,
            passengers,
            doorFront,
            doorBack,
            mapMesh,
            puzzleSolved: index < 11 || (index === 28 && this.hasUnlockedCarriage28WithClue) || (index === 64 && (this.hasUnlockedCarriage64WithKey || !!this.inventory['key'])) || (index === 78 && this.hasUnlockedCarriage78WithHint),
            puzzleCode: index >= 11 ? '1987' : undefined,
            hasKeypad: index >= 11 && index % 5 === 1,
            inspectableItem,
            inspectableText
        };
    }

    private buildMetroRouteDisplay(index: number, isEt: boolean): THREE.Group {
        const group = new THREE.Group();

        // 1. High-resolution canvas for crystal clear LCD/LED route display
        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = 1024;
        mapCanvas.height = 256;
        const ctx = mapCanvas.getContext('2d');
        if (ctx) {
            // Dark sleek subway display background
            ctx.fillStyle = '#0a0e17';
            ctx.fillRect(0, 0, 1024, 256);

            // Subtle bezel border and grid
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 4;
            ctx.strokeRect(4, 4, 1016, 248);

            // Header banner
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(8, 8, 1008, 48);

            // Header line & title
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'left';
            const lineTitle = isEt
                ? '🚇 METROOLIIN M1 · SÜGAVTUNNEL'
                : '🚇 METRO LINE M1 · DEEP TUNNEL';
            ctx.fillText(lineTitle, 24, 40);

            // Carriage indicator badge on top right
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'right';
            const carStatus = isEt
                ? `📍 ASUKOHT: VAGUN ${index}`
                : `📍 CURRENT: CARRIAGE ${index}`;
            ctx.fillText(carStatus, 1000, 40);

            // Route track line
            const lineY = 145;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(60, lineY);
            ctx.lineTo(964, lineY);
            ctx.stroke();

            // Active / Completed track line portion
            const progressRatio = Math.min(1.0, Math.max(0, index / 100));
            const progressX = 60 + progressRatio * (964 - 60);

            ctx.strokeStyle = '#10b981'; // Vibrant glowing green for traversed path
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(60, lineY);
            ctx.lineTo(progressX, lineY);
            ctx.stroke();

            // Story Anomaly custom states
            if (index === 22) {
                // Glitching shifting map
                const glitchSymbols = ['[ ??! ]', '[ #&% ]', '[ 404 ]', '[ ERR ]', '[ ☠️ ]'];
                glitchSymbols.forEach((sym, sIdx) => {
                    const x = 90 + sIdx * 210;
                    ctx.fillStyle = '#ef4444';
                    ctx.font = 'bold 24px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(sym, x, lineY - 30);
                    ctx.beginPath();
                    ctx.arc(x, lineY, 12, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.fillStyle = '#f87171';
                ctx.font = 'bold 18px monospace';
                ctx.fillText(isEt ? '⚠️ ANOMAALIA: KAART MUUTUB PIDEVALT!' : '⚠️ ANOMALY: MAP CONSTANTLY SHIFTING!', 512, 225);
            } else if (index === 53) {
                // All stations disappeared
                ctx.fillStyle = '#64748b';
                ctx.font = 'italic bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(isEt ? '⚠️ KÕIK PEATUSED ON KAARDILT KADUNUD — TÜHI JOON' : '⚠️ ALL STATIONS DISAPPEARED FROM MAP', 512, 100);
                ctx.fillText(isEt ? 'Rong sõidab tundmatusse suunda...' : 'Train speeding into unknown...', 512, 210);
            } else if (index === 94) {
                // Alien / mystery glyphs
                const glyphs = ['⍾ KESK', '⍝ SÜGAV', '⍲ TSOON', '⍿ VÄRAV', '⎔ KULD 100'];
                glyphs.forEach((gl, gIdx) => {
                    const x = 90 + gIdx * 210;
                    ctx.fillStyle = '#c084fc';
                    ctx.font = 'bold 22px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(gl, x, lineY - 30);
                    ctx.beginPath();
                    ctx.arc(x, lineY, 12, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.fillStyle = '#e879f9';
                ctx.font = 'bold 18px monospace';
                ctx.fillText('⚡ ⍾ ⍝ ⍲ ⍿ ⎔ · ANOMAALIA TASE: MAXIMAALNE · ⎔ ⍿ ⍲ ⍝ ⍾', 512, 225);
            } else {
                // Standard Realistic Subway Line Key Milestones (0 -> 20 -> 50 -> 80 -> 100)
                const milestones = [
                    { num: 0, labelEt: 'KESKJAAM', labelEn: 'CENTRAL', sub: '23:45' },
                    { num: 20, labelEt: 'VAGUN 20', labelEn: 'CARRIAGE 20', sub: 'Vari / Shadow' },
                    { num: 50, labelEt: 'VAGUN 50', labelEn: 'CARRIAGE 50', sub: 'Tõde / Truth' },
                    { num: 80, labelEt: 'VAGUN 80', labelEn: 'CARRIAGE 80', sub: 'Peakaart' },
                    { num: 100, labelEt: 'KULDNE TERMINAL 100 ⭐', labelEn: 'GOLDEN TERMINAL 100 ⭐', sub: 'Checkpoint & Pood' }
                ];

                milestones.forEach((m, mIdx) => {
                    const x = 90 + mIdx * 210;
                    const isPassed = index >= m.num;
                    const isCurrent = (mIdx === 0 && index === 0) || (index >= m.num && (mIdx === milestones.length - 1 || index < milestones[mIdx + 1].num));

                    // Station Dot
                    ctx.beginPath();
                    ctx.arc(x, lineY, isCurrent ? 14 : 10, 0, Math.PI * 2);
                    if (m.num === 100) {
                        ctx.fillStyle = isPassed ? '#f59e0b' : '#78350f';
                    } else {
                        ctx.fillStyle = isPassed ? '#10b981' : '#334155';
                    }
                    ctx.fill();

                    if (isCurrent) {
                        ctx.strokeStyle = '#f59e0b';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.arc(x, lineY, 18, 0, Math.PI * 2);
                        ctx.stroke();
                    }

                    // Station Name
                    ctx.fillStyle = isCurrent ? '#fef08a' : (isPassed ? '#ffffff' : '#94a3b8');
                    ctx.font = isCurrent ? 'bold 18px "Segoe UI", Arial, sans-serif' : 'bold 16px "Segoe UI", Arial, sans-serif';
                    ctx.textAlign = 'center';
                    const mainLbl = isEt ? m.labelEt : m.labelEn;
                    ctx.fillText(mainLbl, x, lineY - 26);

                    // Subtitle / Milestone description
                    ctx.fillStyle = isCurrent ? '#fbbf24' : (isPassed ? '#6ee7b7' : '#64748b');
                    ctx.font = '13px "Segoe UI", Arial, sans-serif';
                    ctx.fillText(m.sub, x, lineY + 36);
                });

                // Footer Status Message
                ctx.fillStyle = '#94a3b8';
                ctx.font = '14px "Segoe UI", Arial, sans-serif';
                ctx.textAlign = 'center';
                if (index < 100) {
                    const remaining = 100 - index;
                    ctx.fillText(
                        isEt
                            ? `Järgmise suure checkpointini (Vagun 100): veel ${remaining} vagunit`
                            : `Distance to next major checkpoint (Carriage 100): ${remaining} carriages remaining`,
                        512,
                        228
                    );
                } else if (index === 100) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
                    ctx.fillText(
                        isEt ? '🌟 Oled jõudnud KULDSE TERMINALINI (Vagun 100)! Pood ja Checkpoint on avatud.' : '🌟 REACHED GOLDEN TERMINAL (Carriage 100)! Shop & Checkpoint active.',
                        512,
                        228
                    );
                } else {
                    ctx.fillStyle = '#a855f7';
                    ctx.fillText(
                        isEt ? `Lõputu metroo tsoon: Vagun ${index} (Edasijõudnud sügavus)` : `Endless subway zone: Carriage ${index} (Advanced depth)`,
                        512,
                        228
                    );
                }
            }
        }

        const mapTexture = new THREE.CanvasTexture(mapCanvas);
        const mapMat = new THREE.MeshStandardMaterial({
            map: mapTexture,
            roughness: 0.3,
            metalness: 0.1,
            emissive: new THREE.Color(0x0a101f),
            emissiveIntensity: 0.2
        });

        // Sleek frame backing
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x181e29, metalness: 0.8, roughness: 0.2 });
        const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.64, 0.04), frameMat);
        group.add(frameMesh);

        // Display panel face
        const displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.6), mapMat);
        displayMesh.position.z = 0.022;
        group.add(displayMesh);

        return group;
    }

    private buildGangwayDoor(carWidth: number, carHeight: number, dir: number, carIndex: number, branch: DirectionBranch, theme: CarriageData['theme']): THREE.Group {
        const doorGroup = new THREE.Group();

        // End Bulkhead Wall with centered door archway
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.6 });
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry((carWidth - 1.4) / 2, carHeight, 0.25), wallMat);
        leftWall.position.set(-(carWidth + 1.4) / 4, carHeight / 2, 0);
        doorGroup.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry((carWidth - 1.4) / 2, carHeight, 0.25), wallMat);
        rightWall.position.set((carWidth + 1.4) / 4, carHeight / 2, 0);
        doorGroup.add(rightWall);

        const topWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, carHeight - 2.2, 0.25), wallMat);
        topWall.position.set(0, 2.2 + (carHeight - 2.2) / 2, 0);
        doorGroup.add(topWall);

        // Gangway Glass Door Frame
        const frameMat = new THREE.MeshStandardMaterial({
            color: theme === 'abandoned' ? 0x7f1d1d : 0x1e272e,
            metalness: 0.7,
            roughness: 0.3
        });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.15, 0.08), frameMat);
        frame.position.set(0, 1.1, 0);
        doorGroup.add(frame);

        // Glass Window in Gangway Door
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x111e2e,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.25, 0.09), glassMat);
        glass.position.set(0, 1.35, 0);
        doorGroup.add(glass);

        // Metallic Handle
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.9, roughness: 0.2 });
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), handleMat);
        handle.position.set(0.48, 1.05, 0.08);
        doorGroup.add(handle);

        // Status Indicator above door
        const isForwardDoor = (branch === 'right' && dir > 0) || (branch === 'left' && dir < 0) || (branch === 'undecided');
        const isLockedBackDoor = !isForwardDoor && carIndex >= 1;

        const indColor = isLockedBackDoor ? 0xff4757 : 0x2ed573;
        const indMat = new THREE.MeshBasicMaterial({ color: indColor });
        const ind = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.06), indMat);
        ind.position.set(0, 2.25, dir * 0.14);
        doorGroup.add(ind);

        // --- Creepy Red-Faced Entity in Every Locked Back Gangway Door ---
        if (isLockedBackDoor) {
            const redFaceGroup = new THREE.Group();

            // Dark Silhouette Body
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0x050608,
                roughness: 0.9,
                metalness: 0.1
            });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 0.35), bodyMat);
            body.position.set(0, 0.9, 0);
            redFaceGroup.add(body);

            // Glowing Crimson Red Face (Punane Nägu)
            const faceMat = new THREE.MeshStandardMaterial({
                color: 0xff1744,
                emissive: 0xd50000,
                emissiveIntensity: 0.85,
                roughness: 0.25
            });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), faceMat);
            head.position.set(0, 1.46, 0);
            redFaceGroup.add(head);

            // Piercing Glowing Eyes
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            [-0.055, 0.055].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eyeMat);
                eye.position.set(ex, 1.48, -dir * 0.16);
                redFaceGroup.add(eye);
            });

            // Glowing Crimson Point Light to make the red face clearly visible
            const redGlow = new THREE.PointLight(0xff1744, 2.2, 3.8);
            redGlow.position.set(0, 1.48, -dir * 0.22);
            redFaceGroup.add(redGlow);

            // Position right behind the glass window of the locked door
            redFaceGroup.position.set(0, 0, dir * 0.55);
            doorGroup.add(redFaceGroup);
        }

        return doorGroup;
    }

    private populatePassengers(carGroup: THREE.Group, carIndex: number, theme: CarriageData['theme'], passengers: AIPassenger[]) {
        let count = 0;
        if (carIndex === 0) count = 6;
        else if (carIndex === 1) count = 4;
        else if (carIndex === 2) count = 3;
        else if (carIndex <= 8) count = Math.max(1, 4 - Math.floor(carIndex / 2));
        else if (carIndex >= 11) count = Math.random() < 0.35 ? 1 : 0;

        const seatPositions = [
            new THREE.Vector3(-1.22, 0.48, -6.2),
            new THREE.Vector3( 1.22, 0.48, -4.8),
            new THREE.Vector3(-1.22, 0.48, -3.2),
            new THREE.Vector3( 1.22, 0.48,  3.2),
            new THREE.Vector3(-1.22, 0.48,  4.8),
            new THREE.Vector3( 1.22, 0.48,  6.2)
        ];

        // Realistic skin tones
        const skinPalette = [0xf5cd79, 0xf7d794, 0xdfe6e9, 0xd1a374, 0x805533, 0xfad390, 0xaa7a53];
        // Eye iris colors
        const eyeColors = [0x2980b9, 0x833400, 0x27ae60, 0x3d271d, 0x16a085, 0x2c3e50];

        // Detailed Passenger Character Archetypes
        const archetypes = [
            {
                name: 'Business Commuter',
                top: 0x2c3e50, pants: 0x1e272e, inner: 0xffffff, tie: 0xc0392b,
                hair: 0x1e272e, hairType: 'side_part', coatStyle: 'suit', shoe: 0x111111,
                prop: 'newspaper', glasses: false, headphones: false
            },
            {
                name: 'Music Student',
                top: 0xe74c3c, pants: 0x2c3e50, inner: 0x2d3436,
                hair: 0x8b4513, hairType: 'fade', coatStyle: 'hoodie', shoe: 0xffffff,
                prop: 'phone', glasses: false, headphones: true
            },
            {
                name: 'Winter Commuter',
                top: 0x16a085, pants: 0x2f3640, inner: 0xdfe6e9,
                hair: 0xd63031, hairType: 'long', coatStyle: 'puffer', shoe: 0x636e72,
                prop: 'coffee', glasses: true, headphones: false
            },
            {
                name: 'Casual Traveler',
                top: 0xd35400, pants: 0x1b1464, inner: 0xffffff,
                hair: 0x2d3436, hairType: 'beanie', coatStyle: 'puffer', shoe: 0xffffff,
                prop: 'phone', glasses: false, headphones: false
            },
            {
                name: 'Office Worker',
                top: 0x8e44ad, pants: 0x34495e, inner: 0xf5f6fa,
                hair: 0x111111, hairType: 'ponytail', coatStyle: 'trench', shoe: 0x2d3436,
                prop: 'phone', glasses: false, headphones: false
            },
            {
                name: 'Urban Explorer',
                top: 0x27ae60, pants: 0x2c2c54, inner: 0x1e272e,
                hair: 0x57606f, hairType: 'fade', coatStyle: 'hoodie', shoe: 0xffffff,
                prop: 'newspaper', glasses: false, headphones: false
            }
        ];

        for (let i = 0; i < count; i++) {
            const seatPos = seatPositions[i % seatPositions.length];
            const arch = archetypes[i % archetypes.length];
            const skinColor = skinPalette[i % skinPalette.length];
            const irisColor = eyeColors[i % eyeColors.length];

            const pGroup = new THREE.Group();
            pGroup.position.copy(seatPos);

            // Realistic PBR materials
            const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.05 });
            const clothingTopMat = new THREE.MeshStandardMaterial({ color: arch.top, roughness: 0.7 });
            const clothingPantsMat = new THREE.MeshStandardMaterial({ color: arch.pants, roughness: 0.8 });
            const innerMat = new THREE.MeshStandardMaterial({ color: arch.inner, roughness: 0.85 });
            const hairMat = new THREE.MeshStandardMaterial({ color: arch.hair, roughness: 0.85 });
            const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.2 });
            const irisMat = new THREE.MeshStandardMaterial({ color: irisColor, roughness: 0.3 });
            const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
            const lipMat = new THREE.MeshStandardMaterial({ color: 0xd68172, roughness: 0.6 });
            const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
            const shoeUpperMat = new THREE.MeshStandardMaterial({ color: arch.shoe, roughness: 0.6 });

            // --- 1. Realistic Head & Face Anatomy ---
            const pHead = new THREE.Group();
            pHead.position.set(0, 0.78, 0);

            // Cranium & Jaw Structure
            const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), skinMat);
            cranium.scale.set(1.0, 1.15, 1.05);
            pHead.add(cranium);

            const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.14), skinMat);
            jaw.position.set(0, -0.06, 0.03);
            pHead.add(jaw);

            // Neck with collar contour
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.13, 10), skinMat);
            neck.position.set(0, -0.15, 0);
            pHead.add(neck);

            // 3D Realistic Eyes (Sclera + Iris + Pupil + Eyelids)
            [-0.048, 0.048].forEach(ex => {
                // Sclera (eyeball white)
                const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), eyeWhiteMat);
                eyeball.position.set(ex, 0.02, 0.12);
                pHead.add(eyeball);

                // Colored Iris
                const iris = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), irisMat);
                iris.position.set(ex, 0.02, 0.135);
                pHead.add(iris);

                // Dark Pupil
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), pupilMat);
                pupil.position.set(ex, 0.02, 0.144);
                pHead.add(pupil);

                // Upper Eyelid crease
                const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.008, 0.02), skinMat);
                eyelid.position.set(ex, 0.04, 0.132);
                pHead.add(eyelid);

                // Eyebrow matching hair color
                const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.012, 0.015), hairMat);
                eyebrow.rotation.z = (ex > 0 ? -1 : 1) * 0.08;
                eyebrow.position.set(ex, 0.058, 0.135);
                pHead.add(eyebrow);
            });

            // 3D Nose Bridge and Nostrils
            const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.055, 0.045), skinMat);
            noseBridge.rotation.x = -Math.PI / 16;
            noseBridge.position.set(0, -0.015, 0.148);
            pHead.add(noseBridge);

            // 3D Expressive Lips
            const lips = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.016, 0.022), lipMat);
            lips.position.set(0, -0.072, 0.13);
            pHead.add(lips);

            // 3D Realistic Ears
            [-0.142, 0.142].forEach(earX => {
                const ear = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.065, 0.04), skinMat);
                ear.position.set(earX, 0.01, -0.01);
                pHead.add(ear);
            });

            // --- 2. Realistic Hairstyles & Headwear ---
            if (arch.hairType === 'fade' || arch.hairType === 'short') {
                // Layered Textured Short Hair
                const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 12), hairMat);
                hairTop.position.set(0, 0.06, -0.01);
                hairTop.scale.set(1.02, 1.08, 1.05);
                pHead.add(hairTop);

                const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.06), hairMat);
                bangs.position.set(0, 0.095, 0.115);
                pHead.add(bangs);
            } else if (arch.hairType === 'long') {
                // Long Cascading Wavy Hair
                const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), hairMat);
                hairTop.position.set(0, 0.05, -0.01);
                hairTop.scale.set(1.04, 1.1, 1.06);
                pHead.add(hairTop);

                // Front shoulder-draping strands
                [-0.12, 0.12].forEach(sx => {
                    const strand = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.42, 0.08), hairMat);
                    strand.position.set(sx, -0.16, 0.04);
                    pHead.add(strand);
                });

                // Back voluminous flowing hair
                const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.46, 0.12), hairMat);
                hairBack.position.set(0, -0.18, -0.13);
                pHead.add(hairBack);
            } else if (arch.hairType === 'ponytail') {
                // High Ponytail with Scrunchie
                const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 12), hairMat);
                hairCap.position.set(0, 0.05, -0.02);
                pHead.add(hairCap);

                const scrunchie = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 12), new THREE.MeshStandardMaterial({ color: 0xf39c12 }));
                scrunchie.position.set(0, 0.08, -0.15);
                scrunchie.rotation.x = Math.PI / 4;
                pHead.add(scrunchie);

                const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.02, 0.32, 8), hairMat);
                tail.rotation.x = Math.PI / 3.5;
                tail.position.set(0, -0.05, -0.22);
                pHead.add(tail);
            } else if (arch.hairType === 'beanie') {
                // Ribbed Knit Winter Beanie with Folded Brim
                const beanieMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
                const beanieCrown = new THREE.Mesh(new THREE.SphereGeometry(0.162, 14, 14), beanieMat);
                beanieCrown.position.set(0, 0.07, -0.01);
                beanieCrown.scale.set(1.05, 1.15, 1.05);
                pHead.add(beanieCrown);

                const beanieBrim = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.028, 8, 16), beanieMat);
                beanieBrim.rotation.x = Math.PI / 2;
                beanieBrim.position.set(0, 0.02, 0);
                pHead.add(beanieBrim);
            } else if (arch.hairType === 'side_part') {
                // Business Combed Side-Part
                const hairPart = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.08, 0.28), hairMat);
                hairPart.position.set(0, 0.11, -0.01);
                pHead.add(hairPart);

                const sideburns = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.18), hairMat);
                sideburns.position.set(0, 0.02, -0.04);
                pHead.add(sideburns);
            }

            // High-End Studio Headphones with Glowing Audio LED
            if (arch.headphones) {
                const hpFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
                const hpPadMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.7 });
                const hpLedMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });

                // Symmetrical headband arch over top of head from ear to ear
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.016, 8, 24, Math.PI), hpFrameMat);
                band.position.set(0, 0.01, -0.01);
                pHead.add(band);

                [-0.16, 0.16].forEach(hx => {
                    const earpad = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.035, 12), hpPadMat);
                    earpad.rotation.z = Math.PI / 2;
                    earpad.position.set(hx, 0.01, -0.01);
                    pHead.add(earpad);

                    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.038, 8), hpLedMat);
                    led.rotation.z = Math.PI / 2;
                    led.position.set(hx > 0 ? hx + 0.002 : hx - 0.002, 0.01, -0.01);
                    pHead.add(led);
                });
            }

            // Reading Glasses
            if (arch.glasses) {
                const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
                const lensMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.4, roughness: 0.1 });
                [-0.048, 0.048].forEach(gx => {
                    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 6, 12), frameMat);
                    rim.position.set(gx, 0.02, 0.14);
                    pHead.add(rim);

                    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), lensMat);
                    lens.position.set(gx, 0.02, 0.14);
                    pHead.add(lens);
                });
                const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.004, 0.004), frameMat);
                bridge.position.set(0, 0.02, 0.14);
                pHead.add(bridge);
            }

            pGroup.add(pHead);

            // --- 3. Layered Outfits & Torso ---
            const pBody = new THREE.Group();
            pBody.position.set(0, 0.32, 0);

            // Inner Shirt / Collar / Tie
            const innerChest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.25), innerMat);
            innerChest.position.set(0, 0, 0.02);
            pBody.add(innerChest);

            if (arch.coatStyle === 'suit') {
                // Business Suit Blazer with Lapels and Tie
                const suitLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.28), clothingTopMat);
                suitLeft.position.set(-0.14, 0, 0);
                pBody.add(suitLeft);

                const suitRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.28), clothingTopMat);
                suitRight.position.set(0.14, 0, 0);
                pBody.add(suitRight);

                const suitBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.1), clothingTopMat);
                suitBack.position.set(0, 0, -0.09);
                pBody.add(suitBack);

                if (arch.tie) {
                    const tieMat = new THREE.MeshStandardMaterial({ color: arch.tie, roughness: 0.5 });
                    const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.32, 0.015), tieMat);
                    tieMesh.position.set(0, 0.06, 0.146);
                    pBody.add(tieMesh);
                }
            } else if (arch.coatStyle === 'puffer') {
                // Segmented Winter Puffer Jacket with Horizontal Baffles
                for (let b = 0; b < 3; b++) {
                    const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.31), clothingTopMat);
                    baffle.position.set(0, -0.15 + b * 0.16, 0);
                    pBody.add(baffle);
                }
                const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.29), clothingTopMat);
                collar.position.set(0, 0.25, 0);
                pBody.add(collar);

                // Zipper Line
                const zipMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.3 });
                const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.48, 0.012), zipMat);
                zipper.position.set(0, 0, 0.158);
                pBody.add(zipper);
            } else if (arch.coatStyle === 'hoodie') {
                // Relaxed Streetwear Hoodie with Kangaroo Pocket
                const hoodieTorso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.52, 0.3), clothingTopMat);
                hoodieTorso.position.set(0, 0, 0);
                pBody.add(hoodieTorso);

                const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.04), clothingTopMat);
                pocket.position.set(0, -0.12, 0.16);
                pBody.add(pocket);

                // Drawstrings
                const cordMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
                [-0.05, 0.05].forEach(cx => {
                    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), cordMat);
                    cord.position.set(cx, 0.12, 0.155);
                    pBody.add(cord);
                });
            } else {
                // Classic Trench Coat
                const trenchTorso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.54, 0.29), clothingTopMat);
                trenchTorso.position.set(0, 0, 0);
                pBody.add(trenchTorso);

                const lapelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.03), clothingTopMat);
                lapelLeft.rotation.z = -0.2;
                lapelLeft.position.set(-0.08, 0.1, 0.15);
                pBody.add(lapelLeft);

                const lapelRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.03), clothingTopMat);
                lapelRight.rotation.z = 0.2;
                lapelRight.position.set(0.08, 0.1, 0.15);
                pBody.add(lapelRight);
            }

            pGroup.add(pBody);

            // --- 4. Articulated Arms & Detailed Sculpted Hands ---
            let leftThumbMesh: THREE.Mesh | undefined;
            let rightThumbMesh: THREE.Mesh | undefined;
            let phoneMesh: THREE.Mesh | undefined;

            [-0.23, 0.23].forEach((ax, armIdx) => {
                const armGroup = new THREE.Group();
                armGroup.position.set(ax, 0.44, 0.02);

                // Upper arm
                const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.046, 0.24, 8), clothingTopMat);
                upperArm.rotation.x = 0.35;
                upperArm.position.set(0, -0.1, 0.04);
                armGroup.add(upperArm);

                // Sleeve Cuff
                const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.04, 8), clothingTopMat);
                cuff.rotation.x = 0.85;
                cuff.position.set(0, -0.2, 0.12);
                armGroup.add(cuff);

                // Forearm extending towards lap / prop
                const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.22, 8), skinMat);
                forearm.rotation.x = 0.95;
                forearm.position.set(0, -0.23, 0.17);
                armGroup.add(forearm);

                // Detailed Sculpted Hand with Separate Thumb & Fingers
                const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.028, 0.075), skinMat);
                palm.position.set(0, -0.26, 0.26);
                armGroup.add(palm);

                const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.045), skinMat);
                thumb.rotation.y = (ax > 0 ? -1 : 1) * 0.4;
                thumb.position.set(ax > 0 ? -0.035 : 0.035, -0.25, 0.27);
                armGroup.add(thumb);

                if (armIdx === 0) leftThumbMesh = thumb;
                else rightThumbMesh = thumb;

                pGroup.add(armGroup);
            });

            // --- 5. Seated Legs & Detailed 3D Sneakers ---
            [-0.11, 0.11].forEach(lx => {
                // Thighs (resting horizontally forward on seat cushion)
                const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.38), clothingPantsMat);
                thigh.position.set(lx, 0.08, 0.16);
                pGroup.add(thigh);

                // Calves (extending downward to train floor)
                const calf = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), clothingPantsMat);
                calf.position.set(lx, -0.15, 0.32);
                pGroup.add(calf);

                // Realistic 2-Tone Modern Sneaker / Shoe
                const shoeGroup = new THREE.Group();
                shoeGroup.position.set(lx, -0.34, 0.36);

                // Midsole & Rubber Outsole
                const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.24), shoeSoleMat);
                sole.position.set(0, 0, 0.01);
                shoeGroup.add(sole);

                // Upper Body
                const upper = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.22), shoeUpperMat);
                upper.position.set(0, 0.05, 0);
                shoeGroup.add(upper);

                // White Rubber Toe Cap
                const toeCap = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.05, 0.06), shoeSoleMat);
                toeCap.position.set(0, 0.04, 0.09);
                shoeGroup.add(toeCap);

                // Shoelaces Ridge
                const laces = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.1), shoeSoleMat);
                laces.position.set(0, 0.086, 0.02);
                laces.rotation.x = -Math.PI / 8;
                shoeGroup.add(laces);

                pGroup.add(shoeGroup);
            });

            // --- 6. Realistic Interactive Props (Smartphone, Newspaper, Coffee, Backpack) ---
            if (arch.prop === 'phone') {
                // Sleek OLED Smartphone with Glowing UI
                const phoneBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.9, roughness: 0.1 });
                const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });

                phoneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.2), phoneBodyMat);
                phoneMesh.rotation.x = -Math.PI / 5.5;
                phoneMesh.position.set(0, 0.24, 0.31);
                pGroup.add(phoneMesh);

                const screen = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.004, 0.18), phoneScreenMat);
                screen.position.set(0, 0.007, 0);
                phoneMesh.add(screen);
            } else if (arch.prop === 'newspaper') {
                // Broadsheet Metro Newspaper with Printed Layout
                const paperMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.9 });
                const inkMat = new THREE.MeshBasicMaterial({ color: 0x2f3640 });

                const paper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.01), paperMat);
                paper.rotation.x = -Math.PI / 3.8;
                paper.position.set(0, 0.26, 0.32);
                pGroup.add(paper);

                // Headline Bar & Image Frame
                const headline = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.002), inkMat);
                headline.position.set(0, 0.08, 0.006);
                paper.add(headline);

                const articleCol1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.002), inkMat);
                articleCol1.position.set(-0.08, -0.02, 0.006);
                paper.add(articleCol1);

                const articleCol2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.002), inkMat);
                articleCol2.position.set(0.08, -0.02, 0.006);
                paper.add(articleCol2);
            } else if (arch.prop === 'coffee') {
                // Paper Coffee Cup with Heat Cardboard Sleeve & Sip Lid
                const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
                const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x833400, roughness: 0.9 });
                const lidMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.3 });

                const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.11, 10), cupMat);
                cup.position.set(0.06, 0.26, 0.3);
                pGroup.add(cup);

                const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.05, 10), sleeveMat);
                sleeve.position.set(0, 0, 0);
                cup.add(sleeve);

                const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.015, 10), lidMat);
                lid.position.set(0, 0.058, 0);
                cup.add(lid);
            }

            // Floor / Seat Commuter Backpack
            if (i % 2 === 1) {
                const packMat = new THREE.MeshStandardMaterial({ color: arch.top, roughness: 0.8 });
                const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.16), packMat);
                backpack.position.set(seatPos.x > 0 ? -0.28 : 0.28, -0.22, 0.1);
                pGroup.add(backpack);

                const frontPocket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.05), packMat);
                frontPocket.position.set(0, -0.05, 0.1);
                backpack.add(frontPocket);
            }

            const baseRotY = seatPos.x > 0 ? -Math.PI / 2 : Math.PI / 2;
            pGroup.rotation.y = baseRotY;

            const isCreepy = carIndex === 2 && i === 1; // Special uncanny staring passenger
            passengers.push({
                group: pGroup,
                head: pHead,
                body: pBody,
                isSitting: true,
                seatPos,
                animType: isCreepy ? 'uncanny_stare' : arch.prop === 'phone' ? 'phone' : 'look_window',
                baseRotY,
                targetRotY: baseRotY,
                isCreepy,
                phoneMesh,
                headphones: arch.headphones,
                thumbLeft: leftThumbMesh,
                thumbRight: rightThumbMesh
            });

            carGroup.add(pGroup);
        }
    }

    // --- Coins, Roblox-Style Hotbar & Equipment Models ---

    public addCoins(amount: number) {
        this.coins += amount;
        this.updateCoinsUI();
        try {
            localStorage.setItem('last_metro_coins', String(this.coins));
        } catch (e) {}
    }

    public spendCoins(amount: number): boolean {
        if (this.coins < amount) return false;
        this.coins -= amount;
        this.updateCoinsUI();
        try {
            localStorage.setItem('last_metro_coins', String(this.coins));
        } catch (e) {}
        return true;
    }

    public updateCoinsUI() {
        const isEt = this.lang === 'et';
        const coinsLabel = document.getElementById('hud-coins-label');
        if (coinsLabel) {
            coinsLabel.innerText = isEt ? `${this.coins} COINI` : `${this.coins} COINS`;
        }
        const shopBal = document.getElementById('shop-coin-balance');
        if (shopBal) {
            shopBal.innerText = isEt ? `🪙 ${this.coins} COINI` : `🪙 ${this.coins} COINS`;
        }
    }

    public unlockItem(itemKey: string) {
        if (this.inventory[itemKey]) return;
        this.inventory[itemKey] = true;
        this.updateHotbarUI();
        metroAudio.playItemEquip();

        const isEt = this.lang === 'et';
        if (itemKey === 'key') {
            this.showThought('Sain VÕTME! 🗝️ (Klõpsa ekraani all olevale võtmele, et see kätte võtta nagu Robloxsis)', 'Acquired KEY! 🗝️ (Click the hotbar slot below to equip it like in Roblox)');
        }
        try {
            localStorage.setItem('last_metro_inventory', JSON.stringify(this.inventory));
        } catch (e) {}
    }

    public toggleEquipItem(itemKey: string) {
        if (this.equippedItem === itemKey) {
            // Unequip item ("nagu robloxsis")
            this.equippedItem = null;
            if (this.heldItemMesh) {
                this.camera.remove(this.heldItemMesh);
                this.heldItemMesh = null;
            }
            if (itemKey === 'night_vision') {
                this.nightVisionActive = false;
                const nvOverlay = document.getElementById('night-vision-overlay');
                if (nvOverlay) nvOverlay.style.display = 'none';
            } else if (itemKey === 'radio') {
                this.radioActive = false;
                metroAudio.stopRadioAudio();
            } else if (itemKey === 'speed_boost') {
                this.speedBoostActive = false;
            } else if (itemKey === 'clue_detector') {
                this.clueDetectorActive = false;
            }
            metroAudio.playItemEquip();
            this.updateHotbarUI();
        } else {
            // Equip new item
            this.equippedItem = itemKey;
            metroAudio.playItemEquip();

            if (this.heldItemMesh) {
                this.camera.remove(this.heldItemMesh);
                this.heldItemMesh = null;
            }

            // Create 3D held model on camera view
            this.heldItemMesh = this.createHeldItemModel(itemKey);
            if (this.heldItemMesh) {
                this.heldItemMesh.position.set(0.26, -0.22, -0.45);
                this.camera.add(this.heldItemMesh);
            }

            if (itemKey === 'night_vision') {
                this.nightVisionActive = true;
                const nvOverlay = document.getElementById('night-vision-overlay');
                if (nvOverlay) nvOverlay.style.display = 'block';
            } else if (itemKey === 'radio') {
                this.radioActive = true;
                metroAudio.playRadioAudio();
            } else if (itemKey === 'speed_boost') {
                this.speedBoostActive = true;
            } else if (itemKey === 'clue_detector') {
                this.clueDetectorActive = true;
            }
            this.updateHotbarUI();
        }
    }

    public updateHotbarUI() {
        const hotbar = document.getElementById('inventory-hotbar');
        if (!hotbar) return;
        hotbar.innerHTML = '';

        const isEt = this.lang === 'et';
        let currentSlot = 1;

        // Slot 1: Sword (⚔️ Mõõk)
        if (this.inventory['sword']) {
            const slotNum = currentSlot++;
            const slotDiv = document.createElement('div');
            slotDiv.className = `hotbar-slot ${this.equippedItem === 'sword' ? 'equipped' : ''}`;
            slotDiv.id = 'slot-sword';
            slotDiv.innerHTML = `
                <span class="slot-num">${slotNum}</span>
                <span class="slot-icon">⚔️</span>
                <span class="slot-name">${isEt ? 'Mõõk' : 'Sword'}</span>
            `;
            slotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEquipItem('sword');
            });
            hotbar.appendChild(slotDiv);
        }

        // Slot 2: Tuli / Taskulamp (🔦 Tuli / Flashlight) - User requirement: "kaust ja tuli peab olema seal"
        {
            const slotNum = currentSlot++;
            const slotDiv = document.createElement('div');
            slotDiv.className = `hotbar-slot ${this.flashlightOn ? 'equipped' : ''}`;
            slotDiv.id = 'slot-flashlight';
            slotDiv.innerHTML = `
                <span class="slot-num">${slotNum}</span>
                <span class="slot-icon">🔦</span>
                <span class="slot-name">${isEt ? 'Tuli' : 'Light'}</span>
            `;
            slotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFlashlight();
            });
            hotbar.appendChild(slotDiv);
        }

        // Slot 3: Kaust / Seljakott (📁 Kaust / Folder) - User requirement: "kaust ja tuli peab olema seal"
        {
            const slotNum = currentSlot++;
            const isFolderOpen = document.getElementById('clues-folder-modal')?.style.display === 'flex';
            const slotDiv = document.createElement('div');
            slotDiv.className = `hotbar-slot ${isFolderOpen ? 'equipped' : ''}`;
            slotDiv.id = 'slot-clues_folder';
            slotDiv.innerHTML = `
                <span class="slot-num">${slotNum}</span>
                <span class="slot-icon">📁</span>
                <span class="slot-name">${isEt ? 'Kaust' : 'Folder'}</span>
            `;
            slotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCluesFolderModal();
            });
            hotbar.appendChild(slotDiv);
        }

        // Slot 4: Admin / Owner Paneel (👑 Admin) - User requirement: "admini paneel läheb kausta kõrvale"
        if (this.isOwner) {
            const slotNum = currentSlot++;
            const isOwnerOpen = document.getElementById('owner-teleport-modal')?.style.display === 'flex';
            const slotDiv = document.createElement('div');
            slotDiv.className = `hotbar-slot ${isOwnerOpen ? 'equipped' : ''}`;
            slotDiv.id = 'slot-owner_panel';
            slotDiv.style.borderColor = 'rgba(255, 211, 42, 0.6)';
            slotDiv.innerHTML = `
                <span class="slot-num">${slotNum}</span>
                <span class="slot-icon">👑</span>
                <span class="slot-name">${isEt ? 'Admin' : 'Owner'}</span>
            `;
            slotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('owner-teleport-modal');
                if (modal && modal.style.display === 'flex') {
                    this.closeOwnerTeleportModal();
                } else {
                    this.openOwnerTeleportModal();
                }
            });
            hotbar.appendChild(slotDiv);
        }

        // Unlockable / Purchasable items in hotbar
        const itemDefs: { key: string; icon: string; nameEt: string; nameEn: string }[] = [
            { key: 'key', icon: '🗝️', nameEt: 'Võti', nameEn: 'Key' },
            { key: 'night_vision', icon: '👓', nameEt: 'Ööprillid', nameEn: 'NV Goggles' },
            { key: 'speed_boost', icon: '👟', nameEt: 'Kiirus', nameEn: 'Speed' },
            { key: 'clue_detector', icon: '🔍', nameEt: 'Vihjeandur', nameEn: 'Detector' },
            { key: 'secret_pass', icon: '🎟️', nameEt: 'Salapilet', nameEn: 'Secret Pass' },
            { key: 'radio', icon: '📻', nameEt: 'Raadio', nameEn: 'Radio' }
        ];

        itemDefs.forEach(def => {
            if (this.inventory[def.key]) {
                const slotNum = currentSlot++;
                const slotDiv = document.createElement('div');
                slotDiv.className = `hotbar-slot ${this.equippedItem === def.key ? 'equipped' : ''}`;
                slotDiv.id = `slot-${def.key}`;
                slotDiv.innerHTML = `
                    <span class="slot-num">${slotNum}</span>
                    <span class="slot-icon">${def.icon}</span>
                    <span class="slot-name">${isEt ? def.nameEt : def.nameEn}</span>
                `;
                slotDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleEquipItem(def.key);
                });
                hotbar.appendChild(slotDiv);
            }
        });
    }

    public updateHealthUI() {
        const heartsEl = document.getElementById('player-health-hearts');
        const textEl = document.getElementById('player-health-text');
        if (!heartsEl || !textEl) return;

        const hp = Math.max(0, Math.min(100, this.playerHp));
        textEl.innerText = `${hp} HP`;

        // 5 Hearts display
        const filledHearts = Math.ceil(hp / 20);
        let heartsStr = '';
        for (let i = 0; i < 5; i++) {
            heartsStr += (i < filledHearts) ? '❤️' : '🖤';
        }
        heartsEl.innerText = heartsStr;

        if (hp <= 30) {
            textEl.style.color = '#ff4757';
        } else if (hp <= 60) {
            textEl.style.color = '#ffd32a';
        } else {
            textEl.style.color = '#2ed573';
        }
    }

    public takePlayerDamage(amount: number, reasonEt?: string, reasonEn?: string) {
        if (this.state !== 'player_free') return;
        this.playerHp = Math.max(0, this.playerHp - amount);
        this.updateHealthUI();
        metroAudio.playPlayerHurt();

        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) {
            flashOverlay.style.display = 'block';
            flashOverlay.style.opacity = '0.7';
            setTimeout(() => {
                flashOverlay.style.opacity = '0';
                setTimeout(() => flashOverlay.style.display = 'none', 300);
            }, 150);
        }

        if (this.playerHp <= 0) {
            this.state = 'dead';
            const deathModal = document.getElementById('death-modal');
            const dTitle = document.getElementById('death-title');
            const dDesc = document.getElementById('death-desc');
            if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
            if (dDesc) {
                dDesc.textContent = this.lang === 'et'
                    ? (reasonEt || 'Must vari ja pahalased võtsid su elud!')
                    : (reasonEn || 'Your health reached zero!');
            }
            if (deathModal) deathModal.style.display = 'flex';
            this.updateCursorState();
        }
    }

    public triggerGameOver(reasonEt?: string, reasonEn?: string) {
        this.playerHp = 0;
        this.updateHealthUI();
        this.state = 'dead';
        const deathModal = document.getElementById('death-modal');
        const dTitle = document.getElementById('death-title');
        const dDesc = document.getElementById('death-desc');
        if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
        if (dDesc) {
            dDesc.textContent = this.lang === 'et'
                ? (reasonEt || 'Must vari ja pahalased võtsid su elud!')
                : (reasonEn || 'Your health reached zero!');
        }
        if (deathModal) deathModal.style.display = 'flex';
        this.updateCursorState();
    }

    public attackWithSword() {
        if (this.equippedItem !== 'sword' || this.isSwordSwinging) return;
        this.isSwordSwinging = true;
        this.swordSwingTimer = 0.28;
        metroAudio.playSwordSlash();

        // Find closest villain in range
        let closestVillain: typeof this.shadowVillains[0] | null = null;
        let closestDist = Infinity;
        let closestIndex = -1;
        const playerPos = this.playerPos;

        for (let i = 0; i < this.shadowVillains.length; i++) {
            const v = this.shadowVillains[i];
            const dx = v.group.position.x - playerPos.x;
            const dz = v.group.position.z - playerPos.z;
            const dist2D = Math.sqrt(dx * dx + dz * dz);

            if (dist2D < 4.0 && dist2D < closestDist) {
                closestDist = dist2D;
                closestVillain = v;
                closestIndex = i;
            }
        }

        if (closestVillain && closestIndex >= 0) {
            closestVillain.hp -= 40;
            metroAudio.playMonsterHit();

            const origMat = closestVillain.bodyMesh.material;
            closestVillain.bodyMesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            setTimeout(() => {
                if (closestVillain?.bodyMesh) closestVillain.bodyMesh.material = origMat;
            }, 120);

            if (closestVillain.hp <= 0) {
                metroAudio.playMonsterDeath();
                this.scene.remove(closestVillain.group);
                this.shadowVillains.splice(closestIndex, 1);
                this.coins += 15;
                this.updateCoinsUI();
                this.showThought(
                    '⚔️ Pahalane alistatud! (+15 Coini)',
                    '⚔️ Shadow Villain Defeated! (+15 Coins)',
                    3000
                );
            }
        }
    }

    public spawnGlowingShadowEyes(count: number) {
        if (this.shadowEyesGroup) {
            this.scene.remove(this.shadowEyesGroup);
            this.shadowEyesGroup = null;
        }

        const group = new THREE.Group();
        group.name = 'shadow_eyes_group';

        const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.6 });

        // Positions along windows, roof corners, and aisle
        const candidatePositions = [
            new THREE.Vector3(-1.42, 1.7, -3.0),
            new THREE.Vector3(1.42, 1.8, -1.0),
            new THREE.Vector3(-1.42, 1.6, 2.5),
            new THREE.Vector3(1.42, 1.75, 4.2),
            new THREE.Vector3(0, 2.4, -4.5),
            new THREE.Vector3(-1.3, 2.2, 0.5),
            new THREE.Vector3(1.3, 2.3, -2.5)
        ];

        for (let i = 0; i < count; i++) {
            const eyeGroup = new THREE.Group();
            const pos = candidatePositions[i % candidatePositions.length];

            // Pair of piercing red eyes
            [-0.05, 0.05].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeGlowMat);
                eye.position.set(ex, 0, 0);
                eyeGroup.add(eye);

                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), pupilMat);
                pupil.position.set(ex, 0, 0.038);
                eyeGroup.add(pupil);
            });

            // Surrounding dark shadow aura
            const halo = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), smokeMat);
            halo.scale.set(1.5, 0.8, 1.0);
            eyeGroup.add(halo);

            eyeGroup.position.copy(pos);
            group.add(eyeGroup);
        }

        this.shadowEyesGroup = group;
        this.scene.add(this.shadowEyesGroup);
    }

    public spawnShadowVillains(count: number = 2) {
        // Clear existing villains
        this.shadowVillains.forEach(v => this.scene.remove(v.group));
        this.shadowVillains = [];

        const villainMat = new THREE.MeshStandardMaterial({
            color: 0x050508,
            roughness: 0.8,
            metalness: 0.2,
            emissive: 0x220000,
            emissiveIntensity: 0.7
        });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x0a0000, transparent: true, opacity: 0.65 });

        const startPositions = [
            new THREE.Vector3(0, 0, 4.5),
            new THREE.Vector3(-0.6, 0, 6.5)
        ];

        for (let i = 0; i < count; i++) {
            const vGroup = new THREE.Group();
            const pos = startPositions[i % startPositions.length];

            // 1. Dark Menacing Body Torso
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.3, 8), villainMat);
            body.position.set(0, 0.85, 0);
            vGroup.add(body);

            // 2. Horned / Spiky Shadow Head
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), villainMat);
            head.position.set(0, 1.7, 0);
            vGroup.add(head);

            // Red glowing eyes
            [-0.08, 0.08].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
                eye.position.set(ex, 1.72, 0.18);
                vGroup.add(eye);
            });

            // Shadow Claws
            [-0.38, 0.38].forEach(cx => {
                const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.1), villainMat);
                arm.position.set(cx, 1.2, 0.2);
                arm.rotation.x = Math.PI / 4;
                vGroup.add(arm);
            });

            // Dark shadowy aura
            const aura = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), smokeMat);
            aura.position.set(0, 1.2, 0);
            vGroup.add(aura);

            vGroup.position.copy(pos);
            this.scene.add(vGroup);

            this.shadowVillains.push({
                group: vGroup,
                hp: 80,
                maxHp: 80,
                attackCooldown: 1.0,
                bodyMesh: body
            });
        }
    }

    private createHeldItemModel(itemKey: string): THREE.Group {
        const group = new THREE.Group();

        if (itemKey === 'sword') {
            // Radiant Steel & Gold Mystery Sword (User requirement)
            const hiltMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 });
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.95, roughness: 0.2 });
            const steelMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, metalness: 0.95, roughness: 0.1, emissive: 0x00f2fe, emissiveIntensity: 0.15 });

            // Grip / Handle
            const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.16, 8), hiltMat);
            grip.position.set(0, -0.06, 0);
            group.add(grip);

            // Pommel
            const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), goldMat);
            pommel.position.set(0, -0.15, 0);
            group.add(pommel);

            // Crossguard
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.04), goldMat);
            guard.position.set(0, 0.025, 0);
            group.add(guard);

            // Long Sharp Steel Blade
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.52, 0.01), steelMat);
            blade.position.set(0, 0.28, 0);
            group.add(blade);

            // Blade Tip
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), steelMat);
            tip.position.set(0, 0.59, 0);
            tip.rotation.y = Math.PI / 4;
            group.add(tip);

            // Glowing Rune Core on Blade
            const runeMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
            const rune = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.35, 0.014), runeMat);
            rune.position.set(0, 0.26, 0);
            group.add(rune);

            group.rotation.x = Math.PI / 4;
            group.rotation.y = -Math.PI / 6;
            return group;
        } else if (itemKey === 'key') {
            // Golden Skeleton Key
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.95, roughness: 0.15 });
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16), goldMat);
            ring.position.set(0, 0, 0);
            group.add(ring);

            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8), goldMat);
            shaft.rotation.x = Math.PI / 2;
            shaft.position.set(0, 0, -0.07);
            group.add(shaft);

            const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.015), goldMat);
            bit1.position.set(0, -0.015, -0.12);
            group.add(bit1);

            const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.012), goldMat);
            bit2.position.set(0, -0.012, -0.135);
            group.add(bit2);
        } else if (itemKey === 'radio') {
            // Vintage Portable Subway Radio
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.6 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), bodyMat);
            group.add(body);

            const dialMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
            const dial = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.005), dialMat);
            dial.position.set(0, 0.03, 0.021);
            group.add(dial);

            const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 }));
            antenna.position.set(0.03, 0.12, 0);
            group.add(antenna);
        } else if (itemKey === 'secret_pass') {
            // Golden Secret Pass
            const passMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.85, roughness: 0.25 });
            const pass = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.004), passMat);
            group.add(pass);
        } else if (itemKey === 'clue_detector') {
            // Radar Clue Detector
            const casingMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, metalness: 0.7, roughness: 0.3 });
            const casing = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.03), casingMat);
            group.add(casing);

            const ledMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });
            const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), ledMat);
            led.position.set(0, 0.04, 0.016);
            group.add(led);
        } else if (itemKey === 'night_vision') {
            // Goggles
            const gMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5 });
            const lensMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });
            [-0.03, 0.03].forEach(gx => {
                const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), gMat);
                tube.rotation.x = Math.PI / 2;
                tube.position.set(gx, 0, 0);
                group.add(tube);

                const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), lensMat);
                lens.position.set(gx, 0, -0.031);
                group.add(lens);
            });
        }

        group.rotation.set(0.1, -0.2, 0.05);
        return group;
    }

    private spawnCollectibleCoins(carGroup: THREE.Group, count: number = 3) {
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd32a,
            metalness: 0.95,
            roughness: 0.12,
            emissive: 0xffd32a,
            emissiveIntensity: 0.35
        });
        const coinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.025, 16);

        const possiblePositions = [
            new THREE.Vector3(-0.9, 0.55, -4.5),
            new THREE.Vector3(0.9, 0.55, -2.0),
            new THREE.Vector3(0, 0.15, 0.5),
            new THREE.Vector3(-0.9, 0.55, 3.5),
            new THREE.Vector3(0.9, 0.55, 6.0),
            new THREE.Vector3(0, 0.15, -6.5)
        ];

        for (let i = 0; i < count; i++) {
            const pos = possiblePositions[(i + this.currentCarIndex) % possiblePositions.length];
            const coinMesh = new THREE.Mesh(coinGeo, coinMat);
            coinMesh.rotation.x = Math.PI / 2;
            coinMesh.position.copy(pos);
            carGroup.add(coinMesh);

            this.collectibleCoins.push({
                mesh: coinMesh,
                value: 2,
                collected: false
            });
        }
    }

    public openGoldenShopModal() {
        const modal = document.getElementById('golden-shop-modal');
        if (!modal) return;
        this.updateCoinsUI();

        const grid = document.getElementById('shop-items-grid');
        if (grid) {
            grid.innerHTML = '';
            GOLDEN_SHOP_ITEMS.forEach(item => {
                const isOwned = this.inventory[item.id];
                const canAfford = this.coins >= item.price;
                const card = document.createElement('div');
                card.className = 'shop-item-card';
                card.innerHTML = `
                    <div class="shop-item-header">
                        <span style="font-size: 1.6rem;">${item.icon}</span>
                        <div>
                            <div class="shop-item-title">${this.lang === 'et' ? item.nameEt : item.nameEn}</div>
                            <div class="shop-item-price">🪙 ${item.price} COINI</div>
                        </div>
                    </div>
                    <div class="shop-item-desc">${this.lang === 'et' ? item.descEt : item.descEn}</div>
                    <div class="shop-item-footer">
                        <span style="font-size: 0.75rem; color: #a4b0be;">${isOwned ? '✅ OMATUD' : 'Saadaval'}</span>
                        <button class="btn-shop-buy" id="btn-buy-${item.id}" ${isOwned ? 'disabled' : canAfford ? '' : 'disabled'}>
                            ${isOwned ? '✅ OMAD' : '🛒 OSTA / BUY'}
                        </button>
                    </div>
                `;

                const buyBtn = card.querySelector(`#btn-buy-${item.id}`);
                if (buyBtn && !isOwned) {
                    buyBtn.addEventListener('click', () => {
                        this.buyShopItem(item.id);
                    });
                }
                grid.appendChild(card);
            });
        }

        modal.style.display = 'flex';
        this.state = 'golden_shop';
        this.updateCursorState();
    }

    public buyShopItem(itemId: string) {
        const item = GOLDEN_SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (this.spendCoins(item.price)) {
            this.unlockItem(item.id);
            metroAudio.playShopPurchase();
            this.openGoldenShopModal(); // Refresh view
            this.showThought(
                `Ostsid eseme: ${this.lang === 'et' ? item.nameEt : item.nameEn}!`,
                `Purchased item: ${item.nameEn}!`
            );
        } else {
            this.showThought('Sul ei ole piisavalt coine!', 'You do not have enough coins!');
        }
    }

    public triggerReverseTunnel(duration: number = 5.0) {
        this.reverseTunnelTimer = duration;
    }

    public triggerSoundCutout(duration: number = 4.0) {
        this.soundCutoutTimer = duration;
        metroAudio.setVolume(0);
        setTimeout(() => {
            metroAudio.setVolume(0.7);
        }, duration * 1000);
    }

    private createInspectableNote(): THREE.Group {
        const noteGroup = new THREE.Group();

        // Leather notebook cover
        const bookCoverMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.8 });
        const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.26), bookCoverMat);
        noteGroup.add(bookCover);

        // Yellowed paper pages
        const paperMat = new THREE.MeshStandardMaterial({ color: 0xfae5bf, roughness: 0.9 });
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.045, 0.24), paperMat);
        paper.position.y = 0.01;
        noteGroup.add(paper);

        // Interactive subtle pulse beacon
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), beaconMat);
        beacon.position.set(0, 0.1, 0);
        noteGroup.add(beacon);

        return noteGroup;
    }

    private createKeypadProp(): THREE.Group {
        const keypadGroup = new THREE.Group();

        // Metal mounting plate
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8, roughness: 0.3 });
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.08), plateMat);
        keypadGroup.add(plate);

        // Digital backlit LCD screen
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.09), screenMat);
        screen.position.set(0, 0.1, 0);
        keypadGroup.add(screen);

        return keypadGroup;
    }

    private createClue3DMesh(clue: ClueItem): THREE.Group {
        const group = new THREE.Group();
        group.name = 'clue_prop_' + clue.id;

        if (clue.type === 'ticket') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
            const ticket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, 0.16), mat);
            group.add(ticket);
            const light = new THREE.PointLight(0x00f2fe, 1.2, 2.5);
            light.position.set(0, 0.2, 0);
            group.add(light);
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
            dot.position.set(0, 0.04, 0);
            group.add(dot);
        } else if (clue.type === 'photo') {
            const frameMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.35), frameMat);
            group.add(frame);
            const photoMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
            const photo = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.24), photoMat);
            photo.position.set(0, 0.005, -0.03);
            group.add(photo);
            const light = new THREE.PointLight(0xffffff, 1.0, 2.0);
            light.position.set(0, 0.2, 0);
            group.add(light);
        } else if (clue.type === 'plate') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.9, roughness: 0.2 });
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.2), mat);
            group.add(plate);
            const light = new THREE.PointLight(0x00f2fe, 1.0, 2.0);
            light.position.set(0, 0.2, 0);
            group.add(light);
        } else if (clue.type === 'watch') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.3 });
            const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), mat);
            group.add(watch);
            const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            face.rotation.x = -Math.PI / 2;
            face.position.y = 0.022;
            group.add(face);
        } else if (clue.type === 'map') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xe8d8b5, roughness: 0.8 });
            const map = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), mat);
            group.add(map);
            const light = new THREE.PointLight(0xf1c40f, 1.0, 2.0);
            light.position.set(0, 0.2, 0);
            group.add(light);
        } else {
            const mat = new THREE.MeshStandardMaterial({ color: 0xf7f1e3, roughness: 0.9 });
            const doc = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.42), mat);
            group.add(doc);
            const redSeal = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), new THREE.MeshBasicMaterial({ color: 0xc0392b }));
            redSeal.rotation.x = -Math.PI / 2;
            redSeal.position.set(0.08, 0.01, 0.12);
            group.add(redSeal);
            const light = new THREE.PointLight(0xf1c40f, 0.8, 2.0);
            light.position.set(0, 0.2, 0);
            group.add(light);
        }

        return group;
    }

    // --- Clue Visual Rendering (Realistic Polaroid Photos, Vintage Tickets, Dossiers, Maps) ---

    public renderClueCardVisual(clue: ClueItem, isEt: boolean): string {
        const text = isEt ? clue.textEt : clue.textEn;
        const title = isEt ? clue.titleEt : clue.titleEn;

        if (clue.type === 'photo') {
            return `
                <div style="background: #fbf9f5; border-radius: 6px; padding: 14px 14px 22px 14px; box-shadow: 0 18px 40px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.5); max-width: 440px; margin: 0 auto; transform: rotate(-1deg); cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="background: #070a10; border-radius: 3px; overflow: hidden; position: relative; width: 100%; aspect-ratio: 4/3; box-shadow: inset 0 0 30px rgba(0,0,0,0.95); border: 1px solid rgba(0,0,0,0.3);">
                        <svg viewBox="0 0 400 300" width="100%" height="100%" style="display: block;">
                            <defs>
                                <linearGradient id="photo-vignette" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#020408" stop-opacity="0.95" />
                                    <stop offset="35%" stop-color="#0f172a" stop-opacity="0.4" />
                                    <stop offset="70%" stop-color="#0b1120" stop-opacity="0.6" />
                                    <stop offset="100%" stop-color="#010204" stop-opacity="0.98" />
                                </linearGradient>
                                <radialGradient id="lamp-glow" cx="50%" cy="20%" r="50%">
                                    <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.85" />
                                    <stop offset="40%" stop-color="#00f2fe" stop-opacity="0.25" />
                                    <stop offset="100%" stop-color="#000000" stop-opacity="0" />
                                </radialGradient>
                                <radialGradient id="red-danger-glow" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stop-color="#ff4757" stop-opacity="0.9" />
                                    <stop offset="60%" stop-color="#ff4757" stop-opacity="0.1" />
                                    <stop offset="100%" stop-color="#000000" stop-opacity="0" />
                                </radialGradient>
                            </defs>
                            <!-- Tunnel & Carriage Walls Perspective -->
                            <rect width="400" height="300" fill="#060911" />
                            <!-- Perspective Lines of Ceiling & Floor -->
                            <polygon points="0,0 400,0 260,110 140,110" fill="#0b1220" />
                            <polygon points="0,300 400,300 270,210 130,210" fill="#080e18" />
                            <polygon points="0,0 140,110 130,210 0,300" fill="#0d1829" />
                            <polygon points="400,0 260,110 270,210 400,300" fill="#09121f" />
                            
                            <!-- Subway Windows (Dark blue & foggy reflection) -->
                            <rect x="25" y="70" width="70" height="110" rx="6" fill="#050a14" stroke="#1e293b" stroke-width="2" />
                            <line x1="25" y1="125" x2="95" y2="125" stroke="#1e293b" stroke-width="1.5" />
                            <rect x="305" y="70" width="70" height="110" rx="6" fill="#050a14" stroke="#1e293b" stroke-width="2" />
                            <line x1="305" y1="125" x2="375" y2="125" stroke="#1e293b" stroke-width="1.5" />

                            <!-- Empty Passenger Benches -->
                            <path d="M 40,185 L 125,185 L 120,225 L 35,245 Z" fill="#1e3799" opacity="0.8" />
                            <path d="M 40,150 L 125,160 L 125,185 L 40,185 Z" fill="#0c2461" />
                            <path d="M 360,185 L 275,185 L 280,225 L 365,245 Z" fill="#1e3799" opacity="0.7" />
                            <path d="M 360,150 L 275,160 L 275,185 L 360,185 Z" fill="#0c2461" />

                            <!-- Deep Tunnel End Doorway (Pitch Black / Mystery) -->
                            <rect x="155" y="112" width="90" height="96" fill="#010204" stroke="#00f2fe" stroke-width="1" stroke-opacity="0.4" />
                            <line x1="200" y1="112" x2="200" y2="208" stroke="#00f2fe" stroke-width="0.8" stroke-opacity="0.3" />

                            <!-- Overhead Tube Lights -->
                            <rect x="175" y="45" width="50" height="8" rx="4" fill="#00f2fe" opacity="0.9" filter="drop-shadow(0 0 8px #00f2fe)" />
                            <circle cx="200" cy="50" r="90" fill="url(#lamp-glow)" />

                            <!-- Mysterious Glowing Eyes in End Tunnel -->
                            <circle cx="192" cy="155" r="2.5" fill="#ff4757" />
                            <circle cx="208" cy="155" r="2.5" fill="#ff4757" />
                            <circle cx="200" cy="155" r="30" fill="url(#red-danger-glow)" />

                            <!-- Vignette & Grain Overlay -->
                            <rect width="400" height="300" fill="url(#photo-vignette)" />

                            <!-- Date Timestamp in amber retro camera font -->
                            <text x="310" y="282" fill="#ffd32a" font-family="'Courier New', monospace" font-size="12" font-weight="900" opacity="0.85">’87 10 14</text>
                            <text x="25" y="32" fill="#a4b0be" font-family="'Courier New', monospace" font-size="11" font-weight="700" opacity="0.6">POLAROID 600 · EXP 002</text>
                        </svg>
                    </div>
                    <div style="margin-top: 12px; color: #1e272e; font-family: 'Courier New', monospace; font-size: 0.96rem; font-weight: 800; text-align: center; letter-spacing: 0.5px;">
                        📷 ${title}
                    </div>
                    <div style="color: #576574; font-family: 'Courier New', monospace; font-size: 0.82rem; margin-top: 4px; text-align: center; font-style: italic;">
                        ${text}
                    </div>
                </div>
            `;
        }

        if (clue.type === 'ticket') {
            return `
                <div style="background: linear-gradient(135deg, #f5e6cb 0%, #edd3a8 100%); border-radius: 10px; padding: 22px 24px; color: #2c2416; font-family: 'Courier New', monospace; border: 2.5px dashed #8c7b65; box-shadow: 0 15px 35px rgba(0,0,0,0.85); position: relative; max-width: 460px; margin: 0 auto; text-align: left; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8c7b65; padding-bottom: 10px; margin-bottom: 12px;">
                        <div>
                            <div style="font-weight: 900; font-size: 1.1rem; letter-spacing: 2px; color: #1e272e;">🚇 METRO TRANSIT</div>
                            <div style="font-size: 0.72rem; color: #57606f; font-weight: 700;">RAPID TRANSIT ONE-WAY PASS</div>
                        </div>
                        <div style="background: #2f3542; color: #ffd32a; font-weight: 900; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; letter-spacing: 1px;">
                            № 002-${clue.carIndex}
                        </div>
                    </div>
                    <div style="margin: 16px 0; background: rgba(0,0,0,0.06); padding: 14px; border-radius: 8px; border-left: 4px solid #ff4757;">
                        <div style="font-size: 0.75rem; font-weight: 800; color: #e84118; letter-spacing: 1px; text-transform: uppercase;">KÄSITSI KIRJUTATUD SÕNUM / STAMP:</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: #1e272e; margin-top: 6px; letter-spacing: 1px;">
                            ${text}
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.75rem; color: #57606f; border-top: 1px dashed #8c7b65; padding-top: 10px;">
                        <div>VALIDITY: UNTIL LAST STOP<br>DATE: 23:45 · EXP 002</div>
                        <div style="font-family: monospace; letter-spacing: 3px; font-size: 1.2rem; font-weight: 900; color: #2f3542;">||| | |||| || |</div>
                    </div>
                </div>
            `;
        }

        if (clue.type === 'document' || clue.type === 'diary') {
            return `
                <div style="background: #fdfbf7; border-radius: 8px; padding: 24px 26px; color: #1e272e; font-family: 'Courier New', monospace; box-shadow: 0 18px 40px rgba(0,0,0,0.9); position: relative; max-width: 480px; margin: 0 auto; text-align: left; border: 1px solid #dcdde1; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="position: absolute; top: -10px; left: 24px; width: 14px; height: 32px; border: 2.5px solid #718093; border-radius: 6px; background: transparent; z-index: 2;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; border-bottom: 2px solid #2f3542; padding-bottom: 10px;">
                        <div>
                            <div style="font-size: 0.72rem; font-weight: 900; color: #718093; letter-spacing: 2px;">DEPT. OF UNDERGROUND TRANSIT</div>
                            <div style="font-size: 1.15rem; font-weight: 900; color: #0c111a; letter-spacing: 1px;">AMETLIK RAPORT #002</div>
                        </div>
                        <div style="border: 2px solid #e84118; color: #e84118; padding: 2px 8px; font-size: 0.75rem; font-weight: 900; transform: rotate(5deg); letter-spacing: 1px;">
                            🔴 SALAJANE
                        </div>
                    </div>
                    <div style="font-size: 0.82rem; color: #2f3542; line-height: 1.5; margin-bottom: 14px;">
                        <span style="font-weight: 900;">ASUKOHT:</span> Vagun ${clue.carIndex} &nbsp;|&nbsp; <span style="font-weight: 900;">OBJEKT:</span> Katse 002
                    </div>
                    <div style="background: rgba(0,0,0,0.04); border-left: 4px solid #2f3542; padding: 12px 14px; font-size: 1.05rem; font-weight: 800; color: #0c111a; line-height: 1.5; white-space: pre-line;">
                        ${text}
                    </div>
                    <div style="margin-top: 16px; font-size: 0.72rem; color: #718093; text-align: right; border-top: 1px solid #dcdde1; padding-top: 8px;">
                        ALLKIRI: [REDACTED / KUSTUTATUD] ✍️
                    </div>
                </div>
            `;
        }

        if (clue.type === 'map' || clue.type === 'diagram') {
            return `
                <div style="background: #08111e; border-radius: 10px; padding: 18px; border: 2px solid #00f2fe; box-shadow: 0 0 35px rgba(0,242,254,0.35); max-width: 480px; margin: 0 auto; text-align: left; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(0,242,254,0.3); padding-bottom: 8px;">
                        <div style="color: #00f2fe; font-weight: 900; font-size: 0.9rem; letter-spacing: 2px;">🗺️ METROOSÜSTEEMI SKEEM</div>
                        <div style="color: #ffd32a; font-size: 0.75rem; font-weight: 800;">TUNNEL LINE 002</div>
                    </div>
                    <div style="background: #050a12; border-radius: 6px; padding: 10px; border: 1px solid rgba(0,242,254,0.2); margin-bottom: 12px;">
                        <svg viewBox="0 0 360 120" width="100%" height="100%" style="display: block;">
                            <line x1="20" y1="60" x2="340" y2="60" stroke="#00f2fe" stroke-width="4" />
                            <line x1="180" y1="60" x2="320" y2="100" stroke="#ff4757" stroke-width="3" stroke-dasharray="4,4" />
                            
                            <circle cx="40" cy="60" r="7" fill="#ffd32a" stroke="#fff" stroke-width="2" />
                            <text x="30" y="45" fill="#a4b0be" font-size="9" font-family="monospace">JAAM 1</text>

                            <circle cx="120" cy="60" r="7" fill="#00f2fe" stroke="#fff" stroke-width="2" />
                            <text x="100" y="45" fill="#a4b0be" font-size="9" font-family="monospace">VAGUN 100</text>

                            <circle cx="220" cy="60" r="8" fill="#ff4757" stroke="#fff" stroke-width="2" />
                            <text x="200" y="45" fill="#ff4757" font-size="10" font-weight="900" font-family="monospace">VAGUN 200</text>

                            <circle cx="320" cy="100" r="9" fill="#ff0000" stroke="#ffd32a" stroke-width="2" />
                            <text x="260" y="115" fill="#ffd32a" font-size="10" font-weight="900" font-family="monospace">⚠️ KATSE LÕPP (300)</text>
                        </svg>
                    </div>
                    <div style="color: #f1f2f6; font-size: 0.95rem; font-weight: 700; line-height: 1.4; white-space: pre-line; background: rgba(0,242,254,0.08); padding: 10px; border-radius: 6px; border-left: 3px solid #ffd32a;">
                        ${text}
                    </div>
                </div>
            `;
        }

        if (clue.type === 'plate') {
            return `
                <div style="background: linear-gradient(135deg, #353b48 0%, #1e272e 100%); border: 2.5px solid #ffd32a; border-radius: 8px; padding: 24px; box-shadow: inset 0 0 25px rgba(0,0,0,0.9), 0 15px 35px rgba(0,0,0,0.85); max-width: 460px; margin: 0 auto; text-align: center; position: relative; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="position: absolute; top: 8px; left: 8px; font-size: 0.7rem; color: #ffd32a;">🔩</div>
                    <div style="position: absolute; top: 8px; right: 8px; font-size: 0.7rem; color: #ffd32a;">🔩</div>
                    <div style="position: absolute; bottom: 8px; left: 8px; font-size: 0.7rem; color: #ffd32a;">🔩</div>
                    <div style="position: absolute; bottom: 8px; right: 8px; font-size: 0.7rem; color: #ffd32a;">🔩</div>
                    <div style="color: #ffd32a; font-size: 0.8rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">
                        🛡️ GRAVEERITUD METALLPLAAT
                    </div>
                    <div style="color: #f5f6fa; font-size: 1.25rem; font-weight: 900; font-family: 'Georgia', serif; letter-spacing: 1.5px; line-height: 1.5; text-shadow: 0 2px 4px #000; border-top: 1px solid rgba(255,211,42,0.4); border-bottom: 1px solid rgba(255,211,42,0.4); padding: 14px 6px; margin: 8px 0;">
                        ${text}
                    </div>
                </div>
            `;
        }

        if (clue.type === 'watch') {
            return `
                <div style="background: radial-gradient(circle at center, #1b263b 0%, #080c14 100%); border: 3px solid #ffd32a; border-radius: 14px; padding: 20px; box-shadow: 0 0 40px rgba(255,211,42,0.3); max-width: 440px; margin: 0 auto; text-align: center; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="font-size: 3.2rem; margin-bottom: 6px; filter: drop-shadow(0 0 15px #ffd32a);">🕰️</div>
                    <div style="color: #ffd32a; font-size: 1.6rem; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: 4px; margin-bottom: 8px;">
                        02:00:00
                    </div>
                    <div style="color: #d2dae2; font-size: 1.05rem; font-weight: 700; line-height: 1.5; background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,211,42,0.3);">
                        ${text}
                    </div>
                </div>
            `;
        }

        // Generic Note / Inscription fallback
        return `
            <div style="background: #111927; border: 2px solid #00f2fe; border-radius: 12px; padding: 22px; box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.8); max-width: 460px; margin: 0 auto; text-align: left; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 1.8rem;">${clue.icon || '📜'}</span>
                    <span style="color: #00f2fe; font-weight: 900; font-size: 1rem; letter-spacing: 1px;">${title}</span>
                </div>
                <div style="color: #f1f2f6; font-size: 1.12rem; font-weight: 700; font-family: 'Courier New', monospace; line-height: 1.5; white-space: pre-line; background: rgba(0,0,0,0.4); padding: 14px; border-radius: 8px; border-left: 3px solid #00f2fe;">
                    ${text}
                </div>
            </div>
        `;
    }

    // --- Clue / Collectible System: 1st Click Inspect -> 2nd Click Pack ---

    public openClueInspection(clue: ClueItem) {
        this.state = 'inspecting';
        this.currentInspectedClue = clue;

        const isEt = this.lang === 'et';
        const modal = document.getElementById('clue-inspect-modal');
        const box = document.getElementById('clue-inspect-box');
        const badge = document.getElementById('clue-badge-type');
        const title = document.getElementById('clue-inspect-title');
        const cardContainer = document.getElementById('clue-card-container');

        if (box) {
            box.style.transform = 'scale(1) translateY(0)';
            box.style.opacity = '1';
        }

        if (badge) {
            const typeLabels: { [key: string]: string } = {
                ticket: '🎫 PILET',
                photo: '📷 VANA FOTO',
                document: '📄 DOKUMENT',
                map: '🗺️ METROOKAART',
                plate: '🛡️ METALLPLAAT',
                list: '📋 NIMEKIRI',
                watch: '🕰️ MEHHANISM',
                note: '📜 SALAJANE MÄRGE'
            };
            badge.innerText = typeLabels[clue.type] || '📜 SALAJANE VIHJE';
        }

        if (title) title.innerText = isEt ? clue.titleEt : clue.titleEn;

        // Render full realistic graphic image / card into cardContainer
        if (cardContainer) {
            cardContainer.innerHTML = this.renderClueCardVisual(clue, isEt);
        }

        if (modal) modal.style.display = 'flex';
        metroAudio.playItemInspect();

        // Release mouse lock automatically so cursor is freely movable on screen
        document.body.classList.remove('metro-in-game');
        document.body.classList.add('metro-cursor-visible');
        if (document.pointerLockElement) {
            try { document.exitPointerLock?.(); } catch (_) {}
        }
        this.updateCursorState();
    }

    public packCurrentInspectedClue() {
        const clue = this.currentInspectedClue;
        const modal = document.getElementById('clue-inspect-modal');
        const box = document.getElementById('clue-inspect-box');

        if (box) {
            // Smooth packing animation into backpack
            box.style.transform = 'scale(0.15) translateY(350px)';
            box.style.opacity = '0';
        }

        setTimeout(() => {
            if (modal) modal.style.display = 'none';
            if (box) {
                box.style.transform = 'scale(1) translateY(0)';
                box.style.opacity = '1';
            }

            if (clue) {
                if (!this.collectedClues.some(c => c.id === clue.id)) {
                    this.collectedClues.push(clue);
                    clue.collected = true;
                    this.cluesFound++;
                }

                // Remove 3D mesh from the current carriage
                if (this.activeClueMesh) {
                    this.scene.remove(this.activeClueMesh);
                    if (this.currentCarriage?.group) this.currentCarriage.group.remove(this.activeClueMesh);
                    this.activeClueMesh = null;
                }
                if (this.currentCarriage?.inspectableItem) {
                    this.scene.remove(this.currentCarriage.inspectableItem);
                    if (this.currentCarriage?.group) this.currentCarriage.group.remove(this.currentCarriage.inspectableItem);
                    this.currentCarriage.inspectableItem = undefined;
                }

                // Update HUD backpack button counter & hotbar
                const countBadge = document.getElementById('backpack-btn-text');
                if (countBadge) countBadge.innerText = `Kaust (${this.collectedClues.length})`;

                this.showThought(
                    `📦 „${clue.titleEt}” pandi seljakotti! (Ava [B] kaudu)`,
                    `📦 “${clue.titleEn}” packed into backpack! (Press [B] to view)`
                );
                metroAudio.playDoorLatch();
            }

            this.currentInspectedClue = null;
            this.state = 'player_free';
            // Return to normal in-game state & re-lock cursor seamlessly
            this.updateCursorState();
            this.updateHotbarUI();
        }, 320);
    }

    // --- Seljakott / Clues Folder Modal ---

    public openCluesFolderModal() {
        this.state = 'inspecting';
        const modal = document.getElementById('clues-folder-modal');
        const countText = document.getElementById('clues-folder-count');
        const grid = document.getElementById('clues-folder-grid');
        const emptyMsg = document.getElementById('clues-folder-empty');

        if (countText) {
            countText.innerText = `${this.collectedClues.length} eset kogutud`;
        }

        if (grid) {
            grid.innerHTML = '';
            if (this.collectedClues.length === 0) {
                if (emptyMsg) emptyMsg.style.display = 'block';
            } else {
                if (emptyMsg) emptyMsg.style.display = 'none';
                this.collectedClues.forEach(clue => {
                    const card = document.createElement('div');
                    card.style.cssText = 'background: rgba(20, 28, 42, 0.9); border: 1.5px solid rgba(0, 242, 254, 0.35); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: all 0.2s;';
                    card.innerHTML = `
                        <div style="font-size: 2.2rem; margin-bottom: 6px;">${clue.icon}</div>
                        <div style="color: #ffd32a; font-weight: 800; font-size: 0.8rem; margin-bottom: 4px; line-height: 1.2;">${clue.titleEt}</div>
                        <div style="color: #747d8c; font-size: 0.68rem; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${clue.textEt}</div>
                    `;
                    card.onmouseenter = () => { card.style.borderColor = '#00f2fe'; card.style.transform = 'translateY(-3px)'; card.style.background = 'rgba(30, 42, 60, 0.95)'; };
                    card.onmouseleave = () => { card.style.borderColor = 'rgba(0, 242, 254, 0.35)'; card.style.transform = 'none'; card.style.background = 'rgba(20, 28, 42, 0.9)'; };
                    card.onclick = () => {
                        this.closeCluesFolderModal();
                        this.openClueInspection(clue);
                    };
                    grid.appendChild(card);
                });
            }
        }

        if (modal) modal.style.display = 'flex';
        this.updateCursorState();
        this.updateHotbarUI();
    }

    public closeCluesFolderModal() {
        const modal = document.getElementById('clues-folder-modal');
        if (modal) modal.style.display = 'none';
        this.state = 'player_free';
        this.updateCursorState();
        this.updateHotbarUI();
    }

    public toggleCluesFolderModal() {
        const modal = document.getElementById('clues-folder-modal');
        if (modal && modal.style.display === 'flex') {
            this.closeCluesFolderModal();
        } else {
            this.openCluesFolderModal();
        }
    }

    public toggleCrouch() {
        this.isCrouching = !this.isCrouching;
        this.playerPos.y = this.isCrouching ? 0.95 : 1.6;

        const crouchBtn = document.getElementById('btn-toggle-crouch');
        const crouchText = document.getElementById('btn-toggle-crouch-text');
        const crouchIcon = document.getElementById('btn-toggle-crouch-icon');
        if (crouchBtn) {
            crouchBtn.style.background = this.isCrouching ? 'rgba(0, 242, 254, 0.35)' : 'rgba(10, 15, 25, 0.85)';
            crouchBtn.style.borderColor = this.isCrouching ? '#00f2fe' : 'rgba(0, 242, 254, 0.5)';
        }
        if (crouchIcon) {
            crouchIcon.textContent = this.isCrouching ? '🧍‍♂️' : '🧎‍♂️';
        }
        if (crouchText) {
            crouchText.textContent = this.isCrouching
                ? (this.lang === 'et' ? 'Püsti [C]' : 'Stand [C]')
                : (this.lang === 'et' ? 'Kükita [C]' : 'Crouch [C]');
        }

        if (this.currentCarIndex === 217) {
            if (this.isCrouching) this.submergeInSewerWater();
            else this.emergeFromSewerWater();
        }
    }

    public submergeInSewerWater() {
        this.sewerWaterSubmerged = true;
        this.playerPos.y = 0.5; // low in water
        const overlay = document.getElementById('water-submerge-overlay');
        if (overlay) overlay.style.display = 'block';
    }

    public emergeFromSewerWater() {
        this.sewerWaterSubmerged = false;
        this.playerPos.y = 1.6;
        const overlay = document.getElementById('water-submerge-overlay');
        if (overlay) overlay.style.display = 'none';
        const canvas = this.renderer.domElement;
        if (canvas) canvas.style.filter = '';
    }

    public triggerVictory300() {
        if (this.carriage300ExitTriggered) return;
        this.carriage300ExitTriggered = true;
        this.state = 'dead'; // disable controls

        // Give +1000 Yards to player
        try {
            yardService.awardYards(1000, 'Metro 300 Väljapääs');
        } catch (e) {}

        const victoryModal = document.getElementById('victory-300-modal');
        if (victoryModal) victoryModal.style.display = 'flex';
        this.updateCursorState();
    }


    // --- Story & Anomaly Transitions ---

    // --- Story & Anomaly Transitions ---

    public loadCarriage(index: number, branch: DirectionBranch) {
        console.log(`🚇 Loading Carriage ${index} (Branch: ${branch})`);
        const prevIndex = this.currentCarIndex;
        this.currentCarIndex = index;
        this.totalCarriagesExplored++;
        if (branch !== 'undecided') this.branchDirection = branch;

        // Coins are now earned only from 3D pickups, not automatic door crossing

        // Stop or start Golden Shop calming music on transition
        if (prevIndex === 100 && index !== 100) {
            metroAudio.stopShopMusic();
        } else if (index === 100) {
            metroAudio.playShopMusic();
            try {
                localStorage.setItem('last_metro_checkpoint', JSON.stringify({
                    carriage: 100,
                    coins: this.coins,
                    inventory: this.inventory
                }));
            } catch (e) {}
        }

        // Vagun 200 Music Track & Time Villain immunity
        if (prevIndex === 200 && index !== 200) {
            metroAudio.stopCarriage200Music();
        } else if (index === 200) {
            metroAudio.playCarriage200Music();
            this.deactivateTimeVillain();
        }

        // Cleanly dispose and remove previous carriage to free GPU memory
        if (this.currentCarriage) {
            this.scene.remove(this.currentCarriage.group);
            this.currentCarriage.group.traverse((child: any) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                    else child.material.dispose();
                }
            });
        }

        // Clean up previous anomalies (shadow hands, stalkers, shadow entity, shadow eyes, villains, modals)
        this.shadowHandsGroups.forEach(h => this.scene.remove(h));
        this.shadowHandsGroups = [];
        this.shadowHandsActive = false;
        if (this.stalkerMesh) {
            this.scene.remove(this.stalkerMesh);
            this.stalkerMesh = null;
            this.stalkerActive = false;
        }
        if (this.shadowEntityMesh) {
            this.scene.remove(this.shadowEntityMesh);
            this.shadowEntityMesh = null;
            this.shadowRushActive = false;
        }
        if (this.shadowEyesGroup) {
            this.scene.remove(this.shadowEyesGroup);
            this.shadowEyesGroup = null;
        }
        this.shadowVillains.forEach(v => this.scene.remove(v.group));
        this.shadowVillains = [];
        this.shadowRushCountdown = 0;

        // Deactivate Ajapahalane if active (player escaped to next carriage!)
        this.deactivateTimeVillain();
        this.carriageStayTimer = 0;
        this.timeVillainTriggeredThisCarriage = false;
        this.isSitting = false;
        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) standBtn.style.display = 'none';
        const sitIcon = document.getElementById('btn-toggle-sit-icon');
        const sitText = document.getElementById('btn-toggle-sit-text');
        if (sitIcon) sitIcon.textContent = '🪑';
        if (sitText) sitText.textContent = this.lang === 'et' ? 'Istu' : 'Sit';

        const deathModal = document.getElementById('death-modal');
        if (deathModal) deathModal.style.display = 'none';

        // Determine Theme based on story progression or infinite randomness
        let theme: CarriageData['theme'] = 'normal';
        const shadowRushCarriages = [20, 25, 32, 48, 50, 57, 63, 70, 75, 82, 90, 97];
        if (shadowRushCarriages.includes(index) || index === 4 || index === 15 || index === 35 || index === 49 || index === 60 || index === 96) theme = 'flicker';
        else if (index === 7 || index === 9 || index === 10 || index === 38 || index === 54 || index === 77) theme = 'dark';
        else if (index === 23) theme = 'neon';
        else if (index === 100) theme = 'golden_shop';
        else if (index >= 101) {
            const themes: CarriageData['theme'][] = ['normal', 'flicker', 'dark', 'abandoned', 'neon', 'lounge', 'archive'];
            theme = themes[Math.floor(Math.random() * themes.length)];
        }

        this.currentCarriage = this.createCarriageGeometry(index, this.branchDirection, theme);
        this.scene.add(this.currentCarriage.group);

        // Position player at entrance door and set free movement facing forward down the aisle
        this.state = 'player_free';
        this.playerPos.set(0, 1.6, branch === 'left' ? 7.5 : -7.5);
        this.cameraEuler.y = branch === 'left' ? 0 : Math.PI;

        // Play heavy door latch audio
        metroAudio.playDoorLatch();

        // Update UI
        this.updateLanguageUI();
        this.updateCoinsUI();
        this.updateHotbarUI();

        // User requirement: "uks 26 hakkb tulema kõrge kõlaga klaveri pala et oleka väga hirmulav kuni vagun 31"
        if (index >= 26 && index <= 31) {
            metroAudio.startEerieHighPianoTrack();
        } else {
            metroAudio.stopEerieHighPianoTrack();
        }

        // Stop train and open sliding doors at Carriage 200 terminal station
        if (index === 200) {
            this.trainSpeed = 0;
            this.introSideDoorsOpen = true;
            metroAudio.playBrakesScreech();
            metroAudio.playDoorSlide(true);
        } else if (index < 200) {
            this.trainSpeed = 60;
            this.introSideDoorsOpen = false;
        }

        // Trigger story events per carriage index
        this.triggerCarriageStoryEvent(index);
    }

    private triggerCarriageStoryEvent(index: number) {
        // Ramping eerie drone (resets to peaceful 0 at checkpoint 100)
        metroAudio.setEerinessLevel(index === 100 ? 0.0 : Math.min(1.0, index * 0.03));

        switch (index) {
            case 1:
                setTimeout(() => {
                    metroAudio.playWhisper(4.0);
                    setTimeout(() => {
                        this.showThought('Kas ma kujutasin seda ette?', 'Did I imagine that?');
                    }, 4200);
                }, 3000);
                break;
            case 2:
                this.showThought('See reisija ees... ta käitub imelikult.', 'That passenger ahead... they are behaving strangely.');
                break;
            case 3:
                this.showThought('Metrookaart seinal... mis jaam see on?', 'The subway map on the wall... what station is that?');
                break;
            case 4:
                this.startLightFlickerAnomaly();
                break;
            case 5:
                this.showThought('Aknast välja vaadates... see ei ole linn.', 'Looking out the window... that is not the city.');
                break;
            case 6:
                this.showThought('Istmel on midagi. Ma peaksin seda uurima.', 'There is something on the seat. I should inspect it.');
                break;
            case 7:
                this.showThought('Tagasiteed enam ei ole. Ma pean edasi liikuma.', 'There is no way back. I must keep moving forward.');
                break;
            case 8:
                this.startDoorGlitchAnomaly();
                break;
            case 9:
                this.spawnStalkerEntity();
                this.showThought('Seal ees seisab keegi... ta lihtsalt jälgib mind.', 'Someone is standing ahead... they are just watching me.');
                break;
            case 10:
                this.startCarriage10JumpScare();
                break;

            // --- Vagunid 11–20 ---
            case 11:
                this.showThought('Kõik tundub täiesti normaalne, aga kõik AI-reisijad vaatavad korraga akna poole. 👀', 'Everything seems normal, but all AI passengers are staring out the window simultaneously. 👀');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => p.animType = 'look_window');
                }
                break;
            case 12:
                this.showThought('Metroo ekraan näitab peatust, mida metrookaardil ei eksisteeri.', 'The subway display shows a phantom station that does not exist on the map.');
                break;
            case 13:
                this.showThought('Vagun on peaaegu tühi ja kuskilt kostab vaikne muusika. 🎵', 'The carriage is nearly empty and faint music echoes from somewhere. 🎵');
                metroAudio.playRadioAudio();
                setTimeout(() => metroAudio.stopRadioAudio(), 7000);
                break;
            case 14:
                this.showThought('Üks AI-reisija annab sulle salapärase pileti. 🎫', 'An AI passenger reaches out and hands you a mysterious ticket. 🎫');
                break;
            case 15:
                this.showThought('Tuled kustuvad korraks ja tagasi tulles on reisijad teistes kohtades.', 'Lights extinguish for a second, and passengers are in different seats upon return.');
                this.startLightFlickerAnomaly();
                this.triggerShadowHandsEvent();
                break;
            case 16:
                this.showThought('Akna taga liigub linn ja tunnel tagurpidi!', 'Outside the window, the city and tunnel are moving backwards!');
                this.triggerReverseTunnel(6.0);
                break;
            case 17:
                this.showThought('Leiad seinalt kummalise noole, mis näitab edasi. ➡️', 'Found a strange arrow on the wall pointing forward. ➡️');
                break;
            case 18:
                this.showThought('Vagunis on kell, mis liigub liiga kiiresti. 🕒', 'The clock in the carriage is spinning unnaturally fast. 🕒');
                break;
            case 19:
                this.showThought('Kõik telefonid AI-reisijate käes hakkavad korraga helisema! 📱', 'All phones in the passengers\' hands start ringing simultaneously! 📱');
                metroAudio.playPhoneRingingAll();
                break;
            case 20:
                this.startShadowRushCarriageEvent(20);
                break;

            // --- Vagunid 21–30 ---
            case 21:
                this.showThought('Üks reisija küsib: „Kas sina tead, kus me oleme?” 🤔', 'A passenger asks: „Do you know where we are?” 🤔');
                this.triggerShadowHandsEvent();
                break;
            case 22:
                this.showThought('Vagunis olev metrookaart muutub iga kord, kui sellele otsa vaatad.', 'The subway map shifts every time you look at it.');
                break;
            case 23:
                this.showThought('Akendest on näha täiesti tundmatu, helendavate kristallidega tunnel.', 'An unfamiliar tunnel filled with glowing crystals is visible outside.');
                break;
            case 24:
                this.showThought('Tuled hakkavad liikuma nagu valguslaine läbi vaguni. 💡', 'Lights ripple like a wave of illumination through the carriage. 💡');
                break;
            case 25:
                this.showThought('Leiad vana metroopileti, millel on kummaline kuupäev (14.10.1987).', 'Found an old subway ticket with a strange date (14.10.1987).');
                this.startShadowRushCarriageEvent(25);
                break;
            case 26:
                this.showThought('Akendesse ja pimedusse ilmusid 2 helendavat punast silma... 👀', '2 glowing red eyes appeared in the windows and shadows... 👀');
                this.spawnGlowingShadowEyes(2);
                break;
            case 27:
                this.showThought('Kõlaritest kostab ragin ja pimeduses jälgib sind juba 3 silma! 👀', 'Static crackles and 3 glowing eyes watch you from the shadows! 👀');
                this.spawnGlowingShadowEyes(3);
                break;
            case 28:
                this.showThought('Üks uks on lukus ja vagunis luurab juba 4 silma! 🧩 (Uuri sedelit istme all)', 'Bulkhead door is locked and 4 eyes lurk in the carriage! 🧩 (Inspect note under seat)');
                this.spawnGlowingShadowEyes(4);
                break;
            case 29:
                this.showThought('5 punast silma jälgivad iga sinu sammu! Pimedus tiheneb... 👁️', '5 red eyes watch your every step! The darkness thickens... 👁️');
                this.spawnGlowingShadowEyes(5);
                break;
            case 30:
                this.showThought('7 silma vaatavad sind korraga pimedusest! Pinge aina kasvab... 👁️', '7 eyes stare at you simultaneously! Something dreadful is approaching... 👁️');
                this.spawnGlowingShadowEyes(7);
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 31–40 ---
            case 31:
                this.showThought('⚠️ VAGUNIS ON PAHALASED! Kasuta Mõõka ⚔️ (klõpsa ekraani all), et neid rünnata!', '⚠️ SHADOW VILLAINS IN THE CARRIAGE! Use your Sword ⚔️ to fight them!');
                this.spawnShadowVillains(2);
                break;
            case 32:
                this.showThought('Mängija leiab väikese kaardi, kus on märgitud vagun number 50. 🗺️', 'You find a small pocket map with Carriage number 50 circled. 🗺️');
                this.startShadowRushCarriageEvent(32);
                this.triggerShadowHandsEvent();
                break;
            case 33:
                this.showThought('Metroo hakkab korraks sõitma väga aeglaselt... ja kiirendab siis uuesti.', 'The subway slows down to a crawl... then accelerates again.');
                break;
            case 34:
                this.showThought('Kõik AI-reisijad on kadunud ja vagun on täiesti tühi.', 'All AI passengers have vanished and the carriage is completely empty.');
                break;
            case 35:
                this.showThought('Tuled vilguvad ja üks reisija ilmub korraks vaguni teise otsa.', 'Lights flicker and a mysterious figure appears briefly at the far end.');
                this.startLightFlickerAnomaly();
                break;
            case 36:
                this.showThought('Vagunis on vana ekraan, mis näitab mängija läbitud vagunite numbreid: 36.', 'An old CRT screen displays the count of explored carriages: 36.');
                break;
            case 37:
                this.showThought('Kõlaritest kostab mängija jaoks tundmatu salapärane teade.', 'An unknown, mysterious chime announcement plays from the speakers.');
                break;
            case 38:
                this.showThought('Uks avaneb ja järgmine vagun tundub esialgu täiesti pime. (Kasuta taskulampi või ööprille!)', 'Door opens and the carriage is pitch black. (Use flashlight or night vision!)');
                break;
            case 39:
                this.showThought('Mängija leiab uue vihje metroo salajase ehituse kohta.', 'You find a new classified document about the subway\'s secret construction.');
                break;
            case 40:
                this.showThought('Kõik muutub korraks täiesti normaalseks, nagu mängu alguses.', 'Everything turns completely calm and normal for a moment, just like the beginning.');
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 41–50 ---
            case 41:
                this.showThought('Vagunis on jälle palju reisijaid, kuid keegi ei räägi ega liiguta.', 'Many passengers sit here again, but nobody speaks or moves.');
                break;
            case 42:
                this.showThought('Üks reisija jätab maha salapärase koti, mille sees on vihje. 🎒', 'A passenger left behind a mysterious bag containing a clue. 🎒');
                break;
            case 43:
                this.showThought('Metroo kaart näitab, et rong on jõudnud oma viimasesse peatusesse — kuid rong sõidab edasi!', 'The subway map shows the final stop has arrived — yet the train speeds on!');
                break;
            case 44:
                this.showThought('Akna taga on korraks näha sama jaama, kust mäng algas kell 23:45!', 'Outside the window, the exact central station from 23:45 flashes past!');
                break;
            case 45:
                this.showThought('Mängija leiab ukse, millel on number 0. Kas me alustasime uuesti?', 'Found a bulkhead plaque with number 0. Have we restarted?');
                break;
            case 46:
                this.showThought('Vagunis on mitu kella ja kõik näitavad täiesti erinevat aega. 🕰️', 'There are several clocks in the carriage and each shows a different time. 🕰️');
                break;
            case 47:
                this.showThought('Kõlaritest kostab sosin, mis ütleb ainult ühe sõna: „Edasi…” 🔈', 'A whisper resonates over the intercom saying just one word: „Forward...” 🔈');
                metroAudio.playWhisper(3.0);
                break;
            case 48:
                this.showThought('Vagunis on sein, millel on kriipsud nagu keegi oleks lugenud läbitud vaguneid.', 'Tally marks are scratched on the wall as if counting passing carriages.');
                this.startShadowRushCarriageEvent(48);
                break;
            case 49:
                this.showThought('Tuled vilguvad ja mängija näeb korraks sama läbipaistvat jälitajat vaguni lõpus.', 'Lights flicker and the translucent shadow stalker glimpses at the far end.');
                this.startLightFlickerAnomaly();
                break;
            case 50:
                this.showThought('⭐ SUUR ERILINE VAGUN 50! Leidsid suure vihje selle kohta, miks metroo lõputult sõidab!', '⭐ MAJOR CARRIAGE 50! Found the classified blueprint revealing why the subway runs forever!');
                this.startShadowRushCarriageEvent(50);
                break;

            // --- Vagunid 51–60 ---
            case 51:
                this.showThought('Vagun on täiesti tühi, kuid kõlaritest kostab tavaline metrooteade.', 'Carriage is completely empty, yet a routine transit announcement plays.');
                break;
            case 52:
                this.showThought('Üks AI-reisija küsib: „Mitmendas vagunis sa oled?” 👀', 'An AI passenger asks: „What carriage are you in?” 👀');
                break;
            case 53:
                this.showThought('Metrookaardil on kõik peatused kadunud — jäänud on tühi joon.', 'All stations on the transit map have disappeared — leaving a blank line.');
                this.triggerShadowHandsEvent();
                break;
            case 54:
                this.showThought('Akna taga on väga pikk must tunnel, mille lõppu ei ole näha.', 'Outside is a vast dark tunnel with no visible end.');
                break;
            case 55:
                this.showThought('Mängija leiab vana kuldse pileti, millel on number 100. 🎫', 'Found an antique golden ticket stamped with number 100. 🎫');
                break;
            case 56:
                this.showThought('Kõik vaguni istmed on teises suunas kui tavaliselt.', 'All seats are positioned in reverse against the train motion.');
                break;
            case 57:
                this.showThought('Üks reisija seisab ukse juures ja kaob, kui mängija lähemale jõuab!', 'A passenger stands by the door and vanishes as you approach!');
                this.startShadowRushCarriageEvent(57);
                break;
            case 58:
                this.showThought('Metroo ekraan näitab korraks punaselt: „ÄRA PÖÖRDU TAGASI.” 🚫', 'Subway display flashes crimson: „DO NOT TURN BACK.” 🚫');
                break;
            case 59:
                this.showThought('Vagun on täiesti normaalne ja midagi kummalist ei juhtu.', 'Carriage is peaceful and normal with nothing strange occurring.');
                break;
            case 60:
                this.showThought('Tuled lähevad hetkeks välja ning tagasi tulles on vagun täiesti tühi.', 'Lights turn off for a moment, and returning, the carriage is completely empty.');
                this.startLightFlickerAnomaly();
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 61–70 ---
            case 61:
                this.showThought('Mängija kuuleb oma samme, kuid tundub, nagu kostaks veel üks sammude heli. 👣', 'You hear your own footsteps, but an extra pair of steps seems to echo behind you. 👣');
                break;
            case 62:
                this.showThought('Akna peegelduses on näha tundmatu tume kuju.', 'A dark unfamiliar figure is seen in the window reflection.');
                break;
            case 63:
                this.showThought('🗝️ AI-reisija annab sulle VÕTME! Klõpsa ekraani all olevale võtmeikoonile, et see kätte võtta nagu Robloxsis!', '🗝️ AI passenger hands you a KEY! Click the key icon on the hotbar below to equip it like in Roblox!');
                this.unlockItem('key');
                this.startShadowRushCarriageEvent(63);
                break;
            case 64:
                this.showThought('Järgmise vaguni uks on lukus ja võti aitab selle avada! (Võta võti kätte)', 'The next carriage door is locked! Equip the key from hotbar to open it!');
                break;
            case 65:
                this.showThought('Vagunis on vana metrookaamera monitor, mis näitab mängija eelmist vagunit 64.', 'An old CCTV monitor on the wall shows a security feed of Carriage 64.');
                break;
            case 66:
                this.showThought('Mängija näeb ekraanilt, et keegi liigub tema selja taga, kuid vagun on tühi!', 'On screen, someone is walking right behind you, yet the carriage is empty!');
                break;
            case 67:
                this.showThought('Metroo heli muutub korraks täiesti vaikseks.', 'The subway audio goes into complete silence for a few seconds.');
                this.triggerSoundCutout(3.5);
                break;
            case 68:
                this.showThought('Kõik tuled muutuvad hetkeks väga nõrgaks ja siis taastuvad.', 'All lights dim to a faint glow and then restore.');
                break;
            case 69:
                this.showThought('Leiad seinalt kirjutatud sõnumi: „Sa ei ole esimene.”', 'Found a scratched message on the bulkhead: „You are not the first.”');
                break;
            case 70:
                this.showThought('⭐ SUUR VIHJE-VAGUN 70! Leidsid märkmiku, mis räägib inimesest, kes oli kunagi samas metroos.', '⭐ MAJOR CLUE CARRIAGE 70! Found the journal of an explorer who was trapped in this subway.');
                this.startShadowRushCarriageEvent(70);
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 71–80 ---
            case 71:
                this.showThought('Vagun tundub täiesti normaalne, kuid kellad ei liigu.', 'Carriage feels normal, but all clocks have frozen.');
                break;
            case 72:
                this.showThought('Üks AI-reisija istub ja joonistab metrood, millel on lõpmatult vaguneid. ✏️', 'An AI passenger sits sketching an infinite subway train into a notebook. ✏️');
                break;
            case 73:
                this.showThought('Metroo ekraan näitab: „JÄRGMINE PEATUS: ???”', 'The subway display shows: „NEXT STOP: ???”');
                break;
            case 74:
                this.showThought('Akna taga on korraks näha mahajäetud 1980ndate metroojaama.', 'An abandoned 1980s station platform flashes past outside the window.');
                break;
            case 75:
                this.showThought('Vagunis olevad tuled hakkavad järjest ükshaaval kustuma.', 'Lights in the carriage begin turning off one by one in sequence.');
                this.startShadowRushCarriageEvent(75);
                break;
            case 76:
                this.showThought('Kõik istmed on tühjad, kuid õhus kajab selgelt reisijate juttu.', 'Seats are empty, yet distant crowd conversations echo clearly.');
                break;
            case 77:
                this.showThought('Üks uks avaneb, kuid selle taga ei ole järgmine vagun — ainult tundmatu pime ruum.', 'Door opens into a dark observation chamber instead of a normal carriage.');
                break;
            case 78:
                this.showThought('Mängija peab leidma vihje, et õige ukse kaudu edasi minna. 🧩', 'You must inspect the clue on the bulkhead to unlock the right path. 🧩');
                break;
            case 79:
                this.showThought('Õige ukse leidmisel on järgmine vagun meeldivalt rahulik ja tavaline.', 'Having solved the door puzzle, this carriage is calm, clean and normal.');
                break;
            case 80:
                this.showThought('⭐ VAGUN 80! Leidsid suure metrookaardi, millel on sinu asukoht: VAGUN 80. (Kuldne Pood läheneb!)', '⭐ CARRIAGE 80! Found the master transit map showing: Currently at Carriage 80. (Golden Shop approaches!)');
                break;

            // --- Vagunid 81–90 ---
            case 81:
                this.showThought('Mängija leiab taas ühe vana pileti, kuid sellel on tema enda vaguninumber: 81.', 'Found an old ticket printed with your exact carriage number: 81.');
                break;
            case 82:
                this.showThought('Kõlaritest tuleb teade, mis tundub olevat mõeldud just sinule: „Reisija... oled peagi kohal.”', 'An announcement speaks directly to you: „Passenger... you are nearly there.”');
                this.startShadowRushCarriageEvent(82);
                break;
            case 83:
                this.showThought('AI-reisijad vaatavad korraga kõik ühes suunas minu poole.', 'All AI passengers turn their heads in unison towards you.');
                break;
            case 84:
                this.showThought('Mängija kuuleb kaugelt metrooukse avanemise kaja.', 'You hear the pneumatic hiss of a distant subway door opening.');
                break;
            case 85:
                this.showThought('Vagunis on üks vana LED-ekraan, mis näitab numbreid 1–100.', 'An old LED board displays numbers 1 to 100.');
                break;
            case 86:
                this.showThought('Number 86 on ekraanil eraldi ereda kullaga märgitud!', 'Number 86 is highlighted in bright gold on the display!');
                break;
            case 87:
                this.showThought('Mängija leiab konduktori kuldse kaardi, mis aitab Vagun 100 poodi avada. 💳', 'Found the conductor\'s golden card for the Carriage 100 shop. 💳');
                break;
            case 88:
                this.showThought('Akna taga liigub metroo kõrval korraks teine täpselt samasugune rong! 🚇', 'Outside the right window, an identical parallel subway train speeds alongside! 🚇');
                this.triggerShadowHandsEvent();
                break;
            case 89:
                this.showThought('Teises rongis olevad reisijad vaatavad aknast otse sinu poole.', 'Passengers in the parallel train are staring through the glass right at you.');
                break;
            case 90:
                this.showThought('⭐ Mõlemad rongid lähevad eri suundades ja teine rong kaob tunnelisse.', '⭐ The trains diverge and the parallel train disappears into the dark tunnel.');
                this.startShadowRushCarriageEvent(90);
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 91–100 ---
            case 91:
                this.showThought('Mängija jõuab vagunisse, mis näeb välja täpselt nagu mängu alguse vagun 0.', 'You arrive at a carriage that looks identical to the very starting carriage 0.');
                break;
            case 92:
                this.showThought('Seal istub üks AI-reisija, keda mängija nägi mängu alguses jaamas.', 'The very same AI passenger from the station intro sits right there.');
                break;
            case 93:
                this.showThought('Reisija ütleb salapäraselt: „Sa oled juba väga kaugel.”', 'The passenger speaks mysteriously: „You have come very far.”');
                break;
            case 94:
                this.showThought('Metrookaardil ei ole enam ühtegi normaalset peatust — ainult kummalised märgid.', 'All normal stations are gone from the map — replaced by glowing glyphs.');
                break;
            case 95:
                this.showThought('Mängija leiab ukse numbriga 100.', 'You find a heavy door embossed with number 100.');
                break;
            case 96:
                this.showThought('Enne seda ust hakkavad tuled aeglaselt ja soojalt vilkuma.', 'Before the door, lights begin to pulse slowly with a warm golden hue.');
                break;
            case 97:
                this.showThought('Metrooheli muutub järjest vaiksemaks ja rahulikumaks.', 'The subway running sound softens into a calm, gentle hum.');
                this.startShadowRushCarriageEvent(97);
                break;
            case 98:
                this.showThought('Kõlaritest kostab vana pühalik metrooteade: „Saabume Vagunisse 100.”', 'A solemn announcement chimes: „Arriving at Carriage 100 — The Golden Terminal.”');
                this.triggerShadowHandsEvent();
                break;
            case 99:
                this.showThought('Uks avaneb ja ees särab helge, soe ja kuldne valgus!', 'The door slides open revealing radiant, warm golden light ahead!');
                break;
            case 100:
                this.showThought(
                    '🌟 SUUR CHECKPOINT-VAGUN 100 — KULDNE POOD! Checkpoint salvestatud. Astu leti juurde ja osta varustust!',
                    '🌟 GRAND CHECKPOINT CARRIAGE 100 — GOLDEN SHOP! Progress saved. Step up to the counter and purchase gear!'
                );
                this.openGoldenShopModal();
                break;


            // ── VAGUNID 101–160 ───────────────────────────────────────────────────

            case 101:
                this.showThought('Kõik reisijad vaatavad korraga mängija poole, siis pöörduvad tagasi.', 'All passengers turn to face you simultaneously — then look away.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => { p.animType = 'uncanny_stare'; p.targetRotY = Math.PI; });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.passengers.forEach(p => { p.animType = 'look_window'; p.targetRotY = p.baseRotY; });
                    }, 3000);
                }
                break;

            case 102:
                // Grip — must käsi ukse vahelt (10 sekundit)
                this.showThought('Ukse vahelt sirutub välja must varjukäsi... kui ta sind puudutab, oled kadunud!', 'A black shadow hand reaches through the door... if it touches you, you are gone!');
                this.triggerShadowHandsEvent();
                break;

            case 103:
                // Shadow Dash
                this.startShadowRushCarriageEvent(103);
                break;

            case 104:
                this.showThought('Tühi iste liigub iseenesest... kui sa lähenesid, jäi see seisma.', 'An empty seat is moving by itself... it stopped when you approached.');
                if (this.currentCarriage && this.currentCarriage.passengers.length > 0) {
                    const seat = this.currentCarriage.passengers[0];
                    if (seat.group) {
                        const startZ = seat.group.position.z;
                        let moving = true;
                        const seatMoveInterval = setInterval(() => {
                            if (!moving) { clearInterval(seatMoveInterval); return; }
                            seat.group.position.z = startZ + Math.sin(Date.now() * 0.003) * 0.18;
                            const dist = Math.abs(this.playerPos.z - seat.group.position.z);
                            if (dist < 1.5) { moving = false; seat.group.position.z = startZ; clearInterval(seatMoveInterval); }
                        }, 16);
                        setTimeout(() => { moving = false; clearInterval(seatMoveInterval); seat.group.position.z = startZ; }, 8000);
                    }
                }
                break;

            case 105:
                this.showThought('Kõlaritest kostab metrooteade — aga lõpus on vale vaguninumber: „Järgmine peatus: Vagun 4."', 'Speakers announce a stop — but the carriage number is wrong: "Next stop: Carriage 4."');
                metroAudio.playRadioAudio();
                setTimeout(() => metroAudio.stopRadioAudio(), 5000);
                break;

            case 106:
                this.showThought('Akna peegelduses liigub üks reisija — aga ta seisab sinust teispool paigal.', 'In the window reflection, one passenger moves — yet they stand perfectly still.');
                break;

            case 107:
                this.showThought('Reisija tõuseb aeglaselt püsti, vaatab sulle otsa... ja istub tagasi, nagu midagi ei juhtunud.', 'A passenger slowly rises, stares at you... then sits back as if nothing happened.');
                if (this.currentCarriage && this.currentCarriage.passengers.length > 0) {
                    const p = this.currentCarriage.passengers[0];
                    setTimeout(() => { if (p?.group) p.group.position.y += 0.4; }, 1500);
                    setTimeout(() => { if (p?.group) p.group.position.y -= 0.4; }, 4000);
                }
                break;

            case 108:
                this.showThought('Vaguni kell jääb täpselt kümneks sekundiks seisma... siis liigub jälle edasi.', 'The carriage clock freezes for exactly ten seconds... then ticks forward again.');
                this.startLightFlickerAnomaly();
                break;

            case 109:
                // Grip
                this.showThought('Ukse vahelt piilub sisse must varjukäsi...', 'A black shadow hand peers in through the door gap...');
                this.triggerShadowHandsEvent();
                break;

            case 110:
                this.showThought('Kõik tuled kustuvad hetkeks. Kui need tagasi tulevad — üks reisija on kadunud.', 'All lights go out for a moment. When they return — one passenger has vanished.');
                this.startLightFlickerAnomaly();
                if (this.currentCarriage && this.currentCarriage.passengers.length > 0) {
                    setTimeout(() => {
                        const p = this.currentCarriage?.passengers[0];
                        if (p?.group) { p.group.visible = false; }
                    }, 2200);
                }
                break;

            case 111:
                this.showThought('Ukse tagant kostab koputus... uks avaneb. Seal pole kedagi.', 'A knock echoes from behind the door... it slides open. No one is there.');
                setTimeout(() => metroAudio.playDoorSlide(true), 1500);
                setTimeout(() => metroAudio.playDoorSlide(false), 4000);
                break;

            case 112:
                this.showThought('Reklaamiekraan muutub järsku mustaks. Ekraanil ei ole midagi.', 'The advertisement screen turns pitch black. Nothing on the display.');
                break;

            case 113:
                this.showThought('Akna taga möödub teine metroorong — aga selle akendes pole mitte kedagi.', 'Another subway train passes the window — but its carriages are completely empty.');
                this.startShadowRushCarriageEvent(113);
                break;

            case 114:
                this.showThought('Kõik tuled muutuvad korraks siniseks — unenäoline ja rahutu tunne.', 'All lights shift to a cold blue — an unsettling, dreamlike atmosphere.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0x3498db); });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.lights.forEach(l => l.color.setHex(0xffffff));
                    }, 6000);
                }
                break;

            case 115:
                this.showThought('Ühe reisija silmad on kinni — ta ei liigu. Ta ei hingagi.', 'One passenger has their eyes closed — motionless. Not even breathing.');
                break;

            case 116:
                this.showThought('Vagunis on hästi külm. Hingates on näha aurupilv.', 'The air in the carriage is freezing cold. You can see your breath fog.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0x88ccff); l.intensity = 0.6; });
                    setTimeout(() => {
                        if (this.currentCarriage) { this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 0.85; }); }
                    }, 8000);
                }
                break;

            case 117:
                this.showThought('Üks reisija istub sinu kõrvale. Kui liigud — ta on kadunud.', 'A passenger sits right next to you. When you move — they are gone.');
                break;

            case 118:
                this.showThought('Metroo pidurdab järsult — aga ühtegi jaama ei paista.', 'The train brakes sharply — but no station comes into view.');
                metroAudio.playFlickerBuzz();
                setTimeout(() => metroAudio.playFlickerBuzz(), 800);
                break;

            case 119:
                this.showThought('Kõik aknad muutuvad korraks uduseks — nagu hingaks metroo ise.', 'Every window fogs over for a moment — as if the metro itself is breathing.');
                break;

            case 120:
                this.showThought('Kõik helid kaovad. Absoluutne vaikus. Kümne sekundi pärast kõik taastub.', 'All sound disappears. Absolute silence. Ten seconds later — everything returns.');
                metroAudio.stopRadioAudio();
                setTimeout(() => metroAudio.playRadioAudio(), 10000);
                setTimeout(() => metroAudio.stopRadioAudio(), 14000);
                break;

            case 121:
                this.showThought('Üks lamp vilgub kindlas rütmis — nagu morses midagi edastades.', 'One lamp flickers in a precise rhythm — like transmitting morse code.');
                this.startLightFlickerAnomaly();
                break;

            case 122:
                this.showThought('Kõik tuled muutuvad punaseks. Vagun on nagu veriseks muutunud.', 'All lights shift to a deep red. The carriage looks blood-soaked.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0xff1744); l.intensity = 1.2; });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 0.85; });
                    }, 7000);
                }
                break;

            case 123:
                this.showThought('Näed aknas oma peegeldust — aga peegeldus liigub hiljem. 👤', 'You see your reflection in the window — but it moves a second after you do. 👤');
                break;

            case 124:
                this.showThought('Üks uks avaneb — ja sulgub kohe. Seal polnud kedagi.', 'One door slides open — and immediately shuts. No one was there.');
                setTimeout(() => metroAudio.playDoorSlide(true), 1000);
                setTimeout(() => metroAudio.playDoorSlide(false), 2500);
                break;

            case 125:
                this.showThought('Kõlaritest kostab vana rongijuhi hääl — aga rongijuhti pole olemas.', 'The speakers crackle with an old driver\'s voice — but there is no driver on this train.');
                metroAudio.playRadioAudio();
                setTimeout(() => metroAudio.stopRadioAudio(), 6000);
                break;

            case 126:
                this.showThought('Üks reisija vaatab pidevalt ukse poole. Ta ei pöördu ära.', 'One passenger stares constantly at the door. They will not look away.');
                this.startShadowRushCarriageEvent(126);
                break;

            case 127:
                this.showThought('Reklaam seinal muutub — nüüd on seal üks sõnum: „ÄRA PEATU."', 'The wall advertisement changes — now it shows one message: "DO NOT STOP."');
                break;

            case 128:
                this.showThought('Kõik reisijad kaovad ühe tule vilkumise ajal — ja ilmuvad siis tagasi.', 'All passengers vanish during a single light flicker — and reappear.');
                this.startLightFlickerAnomaly();
                if (this.currentCarriage) {
                    const pax = [...this.currentCarriage.passengers];
                    setTimeout(() => { pax.forEach(p => { if (p.group) p.group.visible = false; }); }, 1000);
                    setTimeout(() => { pax.forEach(p => { if (p.group) p.group.visible = true; }); }, 2800);
                }
                break;

            case 129:
                // Grip
                this.showThought('Uksest sirutub välja must varjukäsi...', 'A black shadow hand reaches through the door...');
                this.triggerShadowHandsEvent();
                break;

            case 130:
                this.showThought('Kuuled enda järel kummalisi samme — aga kui peatad, on kõik vaikne.', 'You hear strange footsteps trailing behind you — when you stop, silence.');
                metroAudio.playShadowGrab();
                break;

            case 131:
                this.showThought('Tuled vilguvad ja vaguni teises otsas on korraks näha tumedat varju.', 'Lights flicker — for a moment a dark silhouette is visible at the far end.');
                this.startLightFlickerAnomaly();
                break;

            case 132:
                this.showThought('Kõlaritest kostab kaugelt kummaline naer — siis vaikus.', 'Strange laughter echoes distantly from the speakers — then silence.');
                metroAudio.playFlickerBuzz();
                break;

            case 133:
                this.showThought('Üks iste hakkab aeglaselt värisema — kuigi metroo sõidab sujuvalt.', 'One seat begins to tremble slowly — though the metro runs smoothly.');
                break;

            case 134:
                this.showThought('Kõik tuled muutuvad korraks siniseks — unenäoline, rahutu tunne.', 'All lights shift briefly to blue — dreamlike and unsettling.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0x4facfe); l.intensity = 0.9; });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 0.85; });
                    }, 5000);
                }
                break;

            case 135:
                this.showThought('Näed aknas oma peegeldust — aga peegeldus liigub iseseisvalt vaguni lõppu. 👤', 'Your window reflection moves independently — walking to the far end of the carriage. 👤');
                break;

            case 136:
                this.showThought('Reisijad vaikivad korraks — vaatavad kõik korraga akna poole.', 'Passengers fall silent — every one of them turns to face the window simultaneously.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => { p.animType = 'look_window'; });
                }
                break;

            case 137:
                this.showThought('Kõik helid muutuvad väga vaikseks — jääb ainult sinu hingamine.', 'All sounds fade to near-silence — only your own breathing remains.');
                break;

            case 138:
                this.showThought('Vagun hakkab aeglaselt peatuma — aga ühtegi jaama pole näha.', 'The carriage begins to slow — no station comes into view.');
                metroAudio.playFlickerBuzz();
                break;

            case 139:
                this.showThought('Akna taga vilgub korraks ere valgus — siis kaob.', 'A brilliant flash blazes outside the window — then vanishes.');
                break;

            case 140:
                // Shadow Dash
                this.startShadowRushCarriageEvent(140);
                break;

            case 141:
                this.showThought('Tuled vilguvad kordamööda — vagun tundub kummaliselt pikaks veninud.', 'Lights flicker one by one — the carriage feels strangely, impossibly long.');
                this.startLightFlickerAnomaly();
                break;

            case 142:
                this.showThought('„Ära jäta mind siia..." — sosin kõlaritest. Keegi räägib sinuga.', '"Do not leave me here..." — a whisper from the speakers. Someone is speaking to you.');
                metroAudio.playWhisper(4.0);
                break;

            case 143:
                this.showThought('Tuled muutuvad äkki kuldseks — ja näed korraks enda varju, mis pole päris sinu oma.', 'Lights turn golden — your shadow flickers into something not quite your own shape.');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffd32a); l.intensity = 1.1; });
                    setTimeout(() => {
                        if (this.currentCarriage) this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 0.85; });
                    }, 6000);
                }
                break;

            case 144:
                this.showThought('⚠️ Helisignaal kõlaritest — jookse kohe järgmise ukse juurde!', '⚠️ An alarm signal from the speakers — run to the next door immediately!');
                metroAudio.playPhoneRingingAll();
                setTimeout(() => metroAudio.stopRadioAudio(), 4000);
                break;

            case 145:
                this.showThought('Akna taga liigub tume kuju — aga seal pole kedagi, keda näha oleks.', 'A dark shape moves past the window — but there is no one out there to be seen.');
                break;

            case 146:
                // Grip — poole lühem käsi (nagu 151-157 sündmustes)
                this.showThought('Ukse vahelt sirutub välja must varjukäsi — aga ta käsi on lühem. Sa saad sellest mööda minna!', 'A black shadow hand reaches through — but the arm is shorter. You can slip past it!');
                this.triggerShadowHandsEvent();
                break;

            case 147:
                this.showThought('Kõik reisijad on ootamatult kadunud. Vagun on tühi.', 'All passengers have vanished without a trace. The carriage is empty.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => { if (p.group) p.group.visible = false; });
                }
                break;

            case 148:
                this.showThought('...Kuuled enda nime sosinat kaugelt... aga sa oled siin üksi.', '...You hear your name whispered from far away... but you are alone here.');
                metroAudio.playWhisper(5.0);
                break;

            case 149:
                this.showThought('Akna taga vilgub valge valgus — siis kaob. Järgmine peatus on teistsugune.', 'White light blazes outside the window — then disappears. The next stop is different.');
                break;

            case 150:
                this.showThought('Metroo pidurdab korraks järsult — tuled vilguvad ja koridori tekib paks udu...', 'The metro brakes sharply for a moment — lights flicker and thick fog fills the aisle...');
                this.startLightFlickerAnomaly();
                break;

            case 151:
            case 152:
            case 153:
                this.showThought(`Vagun ${index} — pimedus ja vaikus tunnelis süvenevad.`, `Carriage ${index} — darkness and silence in the tunnel deepen.`);
                break;

            case 154:
                this.showThought('Ukse vahelt libiseb mööda must vari Grip. Liigu ettevaatlikult edasi.', 'A black shadow Grip slithers past the door. Proceed carefully.');
                this.triggerShadowHandsEvent();
                break;

            case 155:
            case 156:
            case 157:
            case 158:
            case 159:
                this.showThought(`Vagun ${index} — metallkest nagiseb survetundlikult.`, `Carriage ${index} — the metallic hull groans under pressure.`);
                break;

            case 160:
                this.showThought('Vagun 160 — metroo kihutab läbi pimeda tühjuse järgmiste katsete poole.', 'Carriage 160 — the metro speeds through dark void towards the next trials.');
                break;

            // ── VAGUNID 161–200 ───────────────────────────────────────────────────

            case 161:
                this.showThought('Metro sõidab jälle. Istmel on vana foto samast metroost, vaguninumber on ära kriipsutatud.', 'The metro speeds on. On the seat lies an old photo with the carriage number crossed out.');
                break;

            case 162:
                this.showThought('Ekraan vilgutab korraks: „KATSE 002 LÕPP.”', 'The screen blinks briefly: “EXPERIMENT 002 CONCLUSION.”');
                this.startLightFlickerAnomaly();
                break;

            case 163:
            case 164:
                this.showThought('Ukse vahelt ilmub must varjukäsi Grip! Hoidu sellest eemale!', 'A black shadow hand Grip emerges from the door gap! Keep your distance!');
                this.triggerShadowHandsEvent();
                break;

            case 165:
                this.showThought('Istme alt on leitav vana pilet numbriga 002.', 'Under the seat lies an old ticket stamped with number 002.');
                break;

            case 166:
                this.showThought('Kõik kellad vagunis näitavad korraga 02:00.', 'Every clock in the carriage simultaneously reads 02:00.');
                break;

            case 167:
                this.showThought('Raadio annab vihje: „Teine katse ei lõppenud siin.”', 'The radio crackles: “The second experiment did not conclude here.”');
                metroAudio.playWhisper(4.0);
                break;

            case 168:
                this.showThought('Istmel on vana foto tühjast metroost. Tagaküljel pole midagi.', 'On the seat is an old photo of an empty subway. The back is blank.');
                break;

            case 169:
                this.showThought('Akna taga liigub korraks teine metroorong, kuigi tunnelis pole teist rööbast.', 'Another subway train flashes past the window, though there are no second tracks in the tunnel.');
                break;

            case 170:
                this.showThought('Seinal on tume kiri: „ÄRA USU VAGUNIT 200.”', 'Dark words on the wall read: “DO NOT TRUST CARRIAGE 200.”');
                break;

            case 171:
                this.showThought('Grip ilmub kaugemast uksest ja kaob kiiresti tühjusesse.', 'Grip appears at the far door and quickly withdraws into the void.');
                this.triggerShadowHandsEvent();
                break;

            case 172:
                this.showThought('Vana dokument lauakesel: „Objekt 002 reageeris teisele katsele.”', 'Old document on the table: “Object 002 responded to the second test.”');
                break;

            case 173:
                this.showThought('Vana foto metroojaamast. Jaama nime pole näha.', 'An old photograph of a subway station. The station name is missing.');
                break;

            case 174:
                this.showThought('Valgustus kustub. Ööprillidega on näha korraks vaguni lõpus siluetti.', 'The lights cut out. Under night vision, a silhouette is visible at the far end.');
                this.startLightFlickerAnomaly();
                break;

            case 175:
                this.showThought('Raadio: „Nad ei ehitanud seda rongi. Nad leidsid selle.”', 'Radio: “They did not build this train. They found it.”');
                metroAudio.playWhisper(4.5);
                break;

            case 176:
                this.showThought('Istmel on vana käekell, mis liigub ainult siis, kui sa ise liigud.', 'An old wristwatch on the seat only ticks while you are moving.');
                break;

            case 177:
                this.startShadowRushCarriageEvent(177);
                this.showThought('Shadow Dash kihutab mööda! Pärast sündmust on vagun jälle täiesti tühi.', 'Shadow Dash screams past! The carriage falls completely silent afterwards.');
                break;

            case 178:
                this.showThought('Vana foto neljast inimesest. Üks inimene on pildilt teravalt välja lõigatud.', 'An old photo of four people. One person has been sharply cut out.');
                break;

            case 179:
                this.showThought('Metro peatub hetkeks, kuid uksed ei avane... Pinge tõuseb.', 'The metro halts for a brief moment, but doors remain shut... Tension rises.');
                metroAudio.playFlickerBuzz();
                break;

            case 180:
                this.showThought('Seinal vilgub number 002, seejärel muutub see numbriks 200.', 'Number 002 flashes on the bulkhead, shifting into number 200.');
                break;

            case 181:
                this.showThought('Grip ilmub lühemalt ukse vahelt — sa jõuad sellest mööda joosta!', 'Grip reaches out briefly — you can sprint past it!');
                this.triggerShadowHandsEvent();
                break;

            case 182:
                this.showThought('Vana nimekiri, kus enamiku nimede kõrval on punane märge „kadunud”.', 'An old manifest where almost every name is stamped “missing”.');
                break;

            case 183:
                this.showThought('Grip sirutub taas uksest välja!', 'Grip strikes again from the doorway!');
                this.triggerShadowHandsEvent();
                break;

            case 184:
                this.showThought('Raadio: „Katse 002 ei olnud esimene. See oli ainus, mis töötas.”', 'Radio: “Experiment 002 was not the first. It was the only one that worked.”');
                metroAudio.playWhisper(5.0);
                break;

            case 185:
                this.showThought('Kõik reisijad vaatavad korraga mängija poole, kuid keegi ei räägi.', 'Every passenger silently turns their head to face you simultaneously.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => p.animType = 'uncanny_stare');
                }
                break;

            case 186:
                this.showThought('Vana metrookaart, millele on käsitsi märgitud uus jaam: 200.', 'A transit map with a handwritten secret terminal: 200.');
                break;

            case 187:
                this.startShadowRushCarriageEvent(187);
                break;

            case 188:
                this.showThought('Vana foto samast rongist. Esiklaasi kohal on vaguninumber 200.', 'An old photo of this train. Carriage number 200 glows above the front.');
                break;

            case 189:
                this.showThought('Raadio ütleb katkendlikult: „…nad ootavad…”', 'Radio statics intermittently: “…they are waiting…”');
                metroAudio.playWhisper(3.5);
                break;

            case 190:
                this.showThought('Metroo hakkab väga kiiresti sõitma! Kõik tuled muutuvad punaseks!', 'The metro accelerates violently! All lights blaze crimson!');
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => { l.color.setHex(0xff1744); l.intensity = 1.3; });
                }
                break;

            case 191:
                this.showThought('Ukse klaasile ilmub helendav tekst: „VIIMASED 10 VAGUNIT.”', 'Glowing text blazes across the door glass: “FINAL 10 CARRIAGES.”');
                break;

            case 192:
                this.startShadowRushCarriageEvent(192);
                this.showThought('Shadow Dash tormab mööda! Põrandale jääb pilet numbriga 002.', 'Shadow Dash sweeps through! Ticket 002 remains on the floor.');
                break;

            case 193:
                this.showThought('Vana foto kolmest inimesest. Nad seisavad otse Vaguni 200 ukse ees.', 'An old photo of three people standing directly in front of Carriage 200.');
                break;

            case 194:
                this.showThought('Raadio: „Kui uks avaneb, ära vaata, kes sind ootab.”', 'Radio: “When the door opens, do not look at who is waiting for you.”');
                metroAudio.playWhisper(4.0);
                break;

            case 195:
                this.showThought('Metro aeglustub ja kõik reisijad kaovad korraga ümbert ära.', 'The metro decelerates and all passengers instantly vanish.');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => { if (p.group) p.group.visible = false; });
                }
                break;

            case 196:
                this.showThought('Grip ilmub. Pärast selle kadumist jääb uksele hõõguma number 200.', 'Grip reaches out. After it withdraws, glowing number 200 remains on the door.');
                this.triggerShadowHandsEvent();
                break;

            case 197:
                this.showThought('Kõik aknad muutuvad mustaks. Mängija näeb ainult enda peegeldust.', 'All windows turn pitch black. You only see your own reflection in the glass.');
                break;

            case 198:
                this.showThought('Vana dokument: „Katse 002 andis tulemuse. Rong leidis tee.”', 'Old dossier: “Experiment 002 yielded results. The train found its path.”');
                break;

            case 199:
                this.showThought('Metro peatub. Uks vagunisse 200 avaneb aeglaselt. Raadio: „Nüüd saad teada.”', 'The metro halts. The heavy door to Carriage 200 slides open. Radio: “Now you will know.”');
                metroAudio.playDoorSlide(true);
                break;

            case 200:
                // ── VAGUN 200: MAHAJÄETUD METROOPEATUSE LÕPP & KUULJA BOSS ──
                metroAudio.playCarriage200Music();
                this.triggerCarriage200Boss();
                break;

            // ── VAGUNID 201–250 — KANALISATSIOON (THE CANALIZATION) ─────────────────

            case 201:
                this.triggerCarriage201SewerIntro();
                break;

            case 202:
                this.showThought('Liigud mööda kitsast rada vee kõrval. Tunnel on väga pikk ja kaugelt on kuulda vee voolamist.', 'You walk along the narrow catwalk beside flowing water.');
                break;

            case 203:
                this.showThought('Suur tühi ruum. Keskel voolab vesi läbi sügava kanali. Teisele poole viib väike metallist sild.', 'Vast chamber. Water rushes through a central canal. A narrow steel bridge crosses over.');
                break;

            case 204:
                this.showThought('Metalluks on lukus. Leia kõrval asuv väike kang, mis ukse avab!', 'The metal door is locked. Find the wall lever nearby to open it!');
                break;

            case 205:
                this.showThought('Pikk sirge tunnel. Vesi voolab sinu kõrval ja tuled vilguvad.', 'Long straight sewer conduit. Water flows beside you under flickering industrial lights.');
                this.startLightFlickerAnomaly();
                break;

            case 206:
                this.showThought('Suured trellid blokeerivad ühe tunneli poole. Nende taga paistab teine sügav tunnel.', 'Heavy iron grates block one side of the conduit.');
                break;

            case 207:
                this.showThought('Vesi hakkab järsku kiiremini voolama! Jõua kiiresti järgmise ukse juurde!', 'The water suddenly rushes faster! Hurry to the next doorway!');
                break;

            case 208:
                this.showThought('Tühi hooldusruum. Seinad on märjad ja laest tilgub vett.', 'Empty maintenance vault. The concrete walls are wet and ceiling drips.');
                break;

            case 209:
                this.showThought('Metalluks avaneb väga aeglaselt. Ukse taga laiub veelgi suurem tunnel.', 'The heavy floodgate grinds open revealing an even larger water cavern.');
                break;

            case 210:
                this.showThought('Suur tunnel, mille keskel voolab vesi. Mõlemal pool on kitsad kõnniteed.', 'Large vaulted tunnel with a central torrent and narrow walkways on both flanks.');
                break;

            case 211:
                this.showThought('Kaugelt kostab sammude moodi heli... aga kedagi pole näha.', 'Footstep-like echoes reverberate in the distance... yet no one is visible.');
                break;

            case 212:
                this.showThought('⚠️ Tuleb Shadow Dash kanalisatsioonis!', '⚠️ Shadow Dash approaches through the sewer tunnels!');
                this.startShadowRushCarriageEvent(212);
                break;

            case 213:
                this.showThought('Pikk tunnel, kus kõik lambid kustuvad ükshaaval sinu selja taga...', 'Long conduit where floodlights shut off one by one behind you...');
                this.startLightFlickerAnomaly();
                break;

            case 214:
                this.showThought('Leia seinal olev nupp, mis avab järgmise metallukse!', 'Find the circuit button on the wall to open the next door!');
                break;

            case 215:
                this.showThought('Suur tühi ruum. Vesi langeb kõrgemalt alla ja tekitab väga tugeva kaja.', 'Huge subterranean waterfall hall. Rushing water creates thunderous echoes.');
                break;

            case 216:
                this.showThought('Üks tunnel on trellidega suletud. Mine mööda avatud tunnelit edasi.', 'One tunnel is barred with iron grates. Proceed along the open passage.');
                break;

            case 217:
                // Shadow Dash + Water Submerge mechanic
                this.triggerCarriage217SewerShadowDash();
                break;

            case 218:
                this.showThought('Kõik jääb hetkeks täiesti vaikseks. Seejärel kostab kaugelt tugev metallikolin.', 'Everything falls dead silent. Then a sharp metallic clatter echoes from afar.');
                break;

            case 219:
                this.showThought('Uks avaneb automaatselt, kui sellele lähened.', 'The pneumatic door slides open automatically as you approach.');
                break;

            case 220:
                this.showThought('Väga pikk sirge tunnel. Kauguses paistab väike valgus.', 'An exceptionally long tunnel. A faint glimmer glows far in the distance.');
                break;

            case 221:
                this.showThought('Jõuad valguseni — see on vana katkine lamp, mis vaevu särab.', 'You reach the light — only an old broken lamp flickering on the wall.');
                break;

            case 222:
                this.showThought('Suur kanalisatsiooniruum mitme massiivse toruga. Mõnest torust voolab vett tunnelisse.', 'Massive sewer junction with giant rusted industrial pipes.');
                break;

            case 223:
                this.showThought('Üks toru hakkab tugevalt värisema! Liigu sellest eemale!', 'One of the massive steam pipes vibrates violently! Step away from it!');
                break;

            case 224:
                this.showThought('Trellidega suletud ala. Trellide taga laiub tühi pimedus.', 'Barred iron enclosure with vast darkness beyond.');
                break;

            case 225:
                this.showThought('Metallist kõnnitee üle vee. Kõndides kostab tugev metallikaja.', 'Grated catwalk suspended above deep water. Footsteps echo loudly.');
                break;

            case 226:
                this.showThought('Kõik tuled kustuvad... mõne sekundi pärast lähevad need uuesti põlema.', 'Total blackout... a few seconds later the lights pulse back on.');
                this.startLightFlickerAnomaly();
                break;

            case 227:
                this.showThought('Kuuled enda taga vee pritsimist. Kui pöörad ümber — pole seal kedagi.', 'You hear water splashing behind you. When you turn — nothing is there.');
                break;

            case 228:
                this.showThought('Suur uks avaneb ja pääsed järgmisse sügavasse tunnelisse.', 'The blast door rises, opening the way to the next deep conduit.');
                break;

            case 229:
                this.showThought('Tunnel muutub kitsamaks. Mõlemal pool kõrguvad märjad betoonseinad.', 'The channel narrows between towering damp concrete walls.');
                break;

            case 230:
                this.showThought('Vesi hakkab tunnelis kõrgemale tõusma! Liigu kiiresti edasi!', 'The water level is rising! Move forward quickly!');
                break;

            case 231:
                this.showThought('Jõuad kõrgele kuivale platvormile. Vesi voolab selle all.', 'You step onto a high dry platform. Rushing water flows underneath.');
                break;

            case 232:
                this.showThought('Platvormi kõrval on suured trellid, mis ulatuvad laeni.', 'Tall iron grates line the platform reaching all the way to the ceiling.');
                break;

            case 233:
                this.showThought('Trellide taga kustub üks lamp ja kostab tugev kolks.', 'Beyond the grates a lamp snaps off followed by a heavy metallic thump.');
                break;

            case 234:
                this.showThought('Pikk tühi tunnel. Ainult vee voolamise heli kajab laes.', 'Long deserted conduit. Only the sound of flowing water fills the space.');
                break;

            case 235:
                this.showThought('Leiad vana juhtpaneeli. Nupu vajutamisel avaneb järgmine metalluks!', 'You find an old control console. Pressing the switch unlocks the next floodgate!');
                break;

            case 236:
                this.showThought('Uks sulgub kohe pärast läbimist selja taga.', 'The steel door seals shut behind you as soon as you step through.');
                break;

            case 237:
                this.showThought('Suur ruum, kus vesi voolab mitmes erinevas kanalis.', 'Large subterranean reservoir where water splits into multiple aqueducts.');
                break;

            case 238:
                this.showThought('Üks kanal on trellidega blokeeritud. Teisel pool voolab vesi meeletu kiirusega.', 'One channel is barred by heavy grates with a roaring torrent behind.');
                break;

            case 239:
                this.showThought('Liigu mööda kitsast rada suure veekanali kõrval.', 'Follow the narrow walkway bordering the roaring canal.');
                break;

            case 240:
                this.showThought('Kauguses on näha suurt ümmargust betoontunnelit.', 'In the distance, a massive circular concrete aqueduct looms ahead.');
                break;

            case 241:
                this.showThought('Sisenesid ümmargusse tunnelisse. Vesi voolab mööda selle keskosa.', 'You enter the giant circular conduit. Water rushes along its center.');
                break;

            case 242:
                this.showThought('Tunnelis olevad lambid hakkavad järjest vilkuma.', 'The arched ceiling lights begin to flicker sequentially.');
                this.startLightFlickerAnomaly();
                break;

            case 243:
                this.showThought('Üks metalluks on lahti. Selle taga on täiesti pime ruum.', 'An open iron doorway leads into a pitch-black chamber.');
                break;

            case 244:
                this.showThought('Lähed pimedast ruumist läbi ja jõuad tagasi suuremasse veetunnelisse.', 'You make your way through the darkness back into the main conduit.');
                break;

            case 245:
                this.showThought('Suur trellidega värav blokeerib tee. Selle kõrval on vana roostes kang.', 'A massive portcullis blocks the way. A rusty iron lever sits beside it.');
                break;

            case 246:
                this.showThought('Tõmbad kangi ja trellidega värav hakkab aeglaselt üles kerkima!', 'You pull the lever and the heavy iron gate grinds slowly upward!');
                metroAudio.playDoorSlide(true);
                break;

            case 247:
                this.showThought('Värava avanemise ajal hakkab vesi tugevalt lainetama. Oota, kuni tee vabaneb!', 'Surging water churns beneath the lifting gate. Wait for clear passage!');
                break;

            case 248:
                this.showThought('Pärast väravat jätkub suur tunnel. Ees paistab tohutu metalluks!', 'Past the gate, the cavern opens up towards a massive steel blast door!');
                break;

            case 249:
                this.showThought('Jõuad metallukse juurde. Ukse taga on kuulda väga nõrka metroorongi heli!', 'You reach the blast door. Faint subway train reverberations echo from beyond!');
                break;

            case 250:
                // ── VAGUN 250: KANALISATSIOONI OSA LÕPP ──
                this.triggerCarriage250SewerEnd();
                break;

            // ── VAGUNID 251–300 — SÜGAV METROO JA LÕPP ────────────────────────────

            case 251:
                this.showThought('Seisad maa-aluse metrooraja kõrval. Mõlemal pool on ainult pimedus. Kauguses vilgub üksik lamp.', 'You stand beside deep subterranean tracks. Pitch darkness all around, a single lamp blinking.');
                break;

            case 252:
                this.showThought('Liigud mööda rööbaste kõrval olevat kitsast rada. Kaugelt kostab metrooheli, kuid rongi pole näha.', 'Walking along the railway bed. Distant train sounds rumble with no train in sight.');
                break;

            case 253:
                this.showThought('Rööbaste kõrval seisab vana metroovagun. Selle uks on lahti, kuid sees pole mitte kedagi.', 'A derelict subway coach rests beside the track with open doors. Empty inside.');
                break;

            case 254:
                this.showThought('Kui vagunist möödud, sulgub selle uks iseenesest!', 'As you walk past the derelict coach, its pneumatic doors slam shut on their own!');
                metroAudio.playDoorSlide(false);
                break;

            case 255:
                this.showThought('Vana ekraan seinal süttib ja näitab ainult: „002”.', 'An old display lights up on the bulkhead displaying solely: “002”.');
                break;

            case 256:
                this.showThought('Kuuled enda selja taga samme. Kui pöörad ümber, pole seal kedagi.', 'You hear footsteps trailing behind. Turning around reveals nothing.');
                break;

            case 257:
                // Shadow Dash + Maintenance Room Hideout
                this.triggerCarriage257MaintenanceHideout();
                break;

            case 258:
                this.showThought('Hooldusruumi seintele on kirjutatud palju kordi sama number: 002.', 'The maintenance room walls are etched hundreds of times with the number: 002.');
                break;

            case 259:
                this.showThought('Väljud ruumist. Rööbastel seisab nüüd vana rong, mida enne seal ei olnud.', 'Exiting the room, an ancient ghost train now rests silently on the rails.');
                break;

            case 260:
                this.showThought('Rong seisab täiesti vaikselt. Kõik selle aknad on pigimustad.', 'The ghost train rests in absolute stillness. All windows are opaque black.');
                break;

            case 261:
                this.showThought('Rongist kostab korraks koputus vastu akent... keegi on sees.', 'A sharp tap on the window glass echoes from inside the phantom coach.');
                metroAudio.playWhisper(3.0);
                break;

            case 262:
                this.showThought('Möödud viimasest aknast — seal liigub korraks vari!', 'As you pass the final window, a dark silhouette shifts inside!');
                break;

            case 263:
                this.showThought('Rööbaste kohal hakkavad lambid järjest kustuma, liikudes sinu suunas!', 'Tunnel floodlights snap off sequentially overhead, racing toward you!');
                this.startLightFlickerAnomaly();
                break;

            case 264:
                this.showThought('Jõuad suure metallukse juurde. Uks avaneb iseenesest.', 'You arrive at a giant bulkhead. The heavy door glides open on its own.');
                metroAudio.playDoorSlide(true);
                break;

            case 265:
                this.showThought('Ukse taga on pikk tunnel. Sealt kostab väga vaikne hingamise moodi heli.', 'Beyond is a cavernous conduit. A faint, rhythmic breathing sound echoes.');
                break;

            case 266:
                this.showThought('Liigud edasi. Hingamise heli muutub iga sammuga valjemaks...', 'Moving forward. The breathing sound grows louder with each step...');
                break;

            case 267:
                this.showThought('Järsku jääb kõik täiesti vaikseks.', 'Suddenly, utter and profound silence engulfs the tunnel.');
                break;

            case 268:
                this.showThought('Sinu ees seisab vana metroovagun, mis blokeerib kogu tunneli.', 'A giant vintage subway carriage stands directly ahead, barring the tunnel.');
                break;

            case 269:
                this.showThought('Vagun hakkab aeglaselt ise liikuma, kuigi selles pole juhti!', 'The empty carriage begins to roll forward on its own with no driver aboard!');
                break;

            case 270:
                this.showThought('Kui vagun ära liigub, on selle taga ainult tühi ja lõputu tunnel.', 'As the coach rolls away, only a vast empty tunnel remains.');
                break;

            case 271:
                this.showThought('Näed kauguses inimest meenutavat kuju. Kuju seisab täiesti liikumatult.', 'In the distance, a motionless humanoid silhouette stands in the gloom.');
                break;

            case 272:
                this.showThought('Kui lähened, kustuvad tuled. Kui need tagasi süttivad, on kuju kadunud!', 'As you approach, lights extinguish. When they return, the figure is gone!');
                this.startLightFlickerAnomaly();
                break;

            case 273:
                this.showThought('Vana kõlar hakkab tööle: „Palun ärge lahkuge rongist.”', 'An antique PA speaker crackles: “Please do not leave the train.”');
                metroAudio.playWhisper(4.0);
                break;

            case 274:
                this.showThought('Kõlar ütleb sama lauset uuesti, aga seekord teise, moonutatud häälega.', 'The speaker repeats the announcement, but in a distorted, unnatural voice.');
                break;

            case 275:
                this.showThought('Kõik metroouksed tunneli ääres avanevad korraga!', 'All subway doors along the tunnel wall snap open simultaneously!');
                metroAudio.playDoorSlide(true);
                break;

            case 276:
                this.showThought('Ühe ukse taga laiub ainult täielik ja põhjatu pimedus.', 'Beyond one of the open doorways lies only total, bottomless darkness.');
                break;

            case 277:
                this.showThought('Jookse kiiresti järgmise valgustatud alani!', 'Hurry forward to the next illuminated station sector!');
                break;

            case 278:
                this.showThought('Valgustatud alal on vana metrookaart. Sellel pole enam ühtegi tavalist jaama.', 'A vintage transit chart hangs on the wall. All normal stations are gone.');
                break;

            case 279:
                this.showThought('Kaardi kõige all on üksainus uus märge: „300”.', 'At the bottom of the map is a single handwritten destination: “300”.');
                break;

            case 280:
                this.showThought('Kuuled metroorongi lähenemist. Rongi tuled paistavad kauguses!', 'You hear a subway train approaching! Its twin headlights pierce the darkness!');
                break;

            case 281:
                this.showThought('Rong sõidab sinust väga kiiresti mööda, kuid ei tee peaaegu üldse heli.', 'The ghost train rushes past at extreme speed, making almost no sound at all.');
                break;

            case 282:
                this.showThought('Pärast rongi möödumist on rööbaste kõrval üks uus metalluks.', 'After the train passes, a new reinforced blast door appears beside the tracks.');
                break;

            case 283:
                this.showThought('Uks avaneb, kui sellele lähened.', 'The heavy door slides open as you draw near.');
                metroAudio.playDoorSlide(true);
                break;

            case 284:
                this.showThought('Ukse taga on suur tühi metroohall. Lagi on nii kõrge, et seda pole näha.', 'Beyond lies a colossal vaulted metro cathedral hall.');
                break;

            case 285:
                this.showThought('Halli keskel ripub vana ekraan. See näitab: „KATSE 002 – VIIMANE ETAPP.”', 'Suspended in the center, an old CRT screen flashes: “EXPERIMENT 002 – FINAL PHASE.”');
                break;

            case 286:
                this.showThought('Ekraan kustub ja langeb pimedusse.', 'The display snaps off into complete darkness.');
                break;

            case 287:
                this.showThought('Kõik uksed hallis sulguvad korraga!', 'All bulkhead doors in the grand hall slam shut simultaneously!');
                metroAudio.playDoorSlide(false);
                break;

            case 288:
                this.showThought('Leia juhtpaneel, et uksed uuesti avada!', 'Find the circuit console to restore power and reopen the doors!');
                break;

            case 289:
                this.showThought('Juhtpaneeli leidmisel kostab sinu selja tagant tugev metallikolin!', 'As you locate the panel, a heavy metallic clang echoes behind your back!');
                break;

            case 290:
                this.showThought('Sa ei näe midagi, kuid kuuled aeglaseid samme lähenemas...', 'You see nothing in the dark, but hear slow footsteps pacing closer...');
                break;

            case 291:
                this.showThought('Sammud jäävad sinu lähedal seisma.', 'The footsteps stop just a few feet away.');
                break;

            case 292:
                this.showThought('Tuled lähevad põlema. Kedagi pole!', 'The floodlights snap on! The hall is empty!');
                this.startLightFlickerAnomaly();
                break;

            case 293:
                this.showThought('Halli kaugemas otsas avaneb suur värav!', 'A giant arched gateway rumbles open at the far end of the hall!');
                metroAudio.playDoorSlide(true);
                break;

            case 294:
                this.showThought('Selle taga on taas metroorööpad, mis viivad sügavamale maa alla.', 'Beyond lie the deep railway tracks descending to the final terminal.');
                break;

            case 295:
                this.showThought('Kõlar ütleb hoiatavalt: „Ära mine 300-ni.”', 'The speaker intones a final warning: “Do not proceed to 300.”');
                metroAudio.playWhisper(4.0);
                break;

            case 296:
                this.showThought('Metroorong ilmub pimedusest ja peatub sinu ees.', 'A metro train emerges from the black tunnel and halts before you.');
                break;

            case 297:
                this.showThought('Rongi uksed avanevad. Sees on tühi vagun, mille ekraanil vilgub „300”.', 'The train doors slide open. Inside is an empty coach flashing “300”.');
                break;

            case 298:
                this.showThought('Vagun seisab paigal — rongi sisse ei saa minna, pead minema mööda platvormi.', 'The train rests stationary — follow the platform alongside.');
                break;

            case 299:
                this.showThought('Kõik vaguni tuled kustuvad. Ekraanile ilmub: „KATSE 002 EI LÕPPENUD.” Sosin: „Sa jõudsid liiga kaugele.”', 'Lights extinguish. Screen: “EXPERIMENT 002 DID NOT END.” Whisper: “You came too far.”');
                metroAudio.playWhisper(5.0);
                break;

            case 300:
                // ── VAGUN 300: METROOJAAM JA VÄLJAPÄÄS (GRAND FINALE) ──
                this.triggerCarriage300Finale();
                break;

            default:
                if (index > 300) {
                    this.showThought(
                        `Vagun ${index}. Metroo sõidab lõputusse... (🪙 ${this.coins} Coini)`,
                        `Carriage ${index}. The metro rides on endlessly... (🪙 ${this.coins} Coins)`
                    );
                }
                break;
        }
    }

    // ── Vagun 200 Kuulja Boss Sündmused ────────────────────────────────────────

    private triggerCarriage200Boss() {
        this.kuuljaSwitchesActivated = 0;
        this.showThought(
            '🚇 METROO PIDURDAS JA JÄI SEISMA! Uksed avanesid. Astu metroost välja jaamaplatvormile! Kuulja varitseb pimeduses — KÜKITA [C] ja aktiveeri 3 lülitit!',
            '🚇 METRO HALTED TO A STOP! Doors opened. Step out onto the station platform! The Listener lurks in the dark — CROUCH [C] and activate 3 switches!'
        );

        // Spawn 3 electrical circuit switches on station platform
        this._spawnCarriage200Switches();

        // Spawn Kuulja boss entity on station platform
        this._spawnKuuljaBoss();
    }

    private _spawnCarriage200Switches() {
        this.kuuljaSwitches = [];
        const switchPositions = [
            { pos: new THREE.Vector3(5.2, 1.4, -6.0), label: '1/3' }, // On platform pillar
            { pos: new THREE.Vector3(9.2, 1.4, 0.0), label: '2/3' },  // On platform back wall
            { pos: new THREE.Vector3(6.5, 1.4, 8.0), label: '3/3' }   // Near blast exit stairs
        ];

        switchPositions.forEach((item, i) => {
            const swGroup = new THREE.Group();
            swGroup.name = `kuulja_switch_${i + 1}`;

            // 1. High-visibility yellow/black hazard backplate
            const hazardCanvas = document.createElement('canvas');
            hazardCanvas.width = 128;
            hazardCanvas.height = 128;
            const hctx = hazardCanvas.getContext('2d');
            if (hctx) {
                hctx.fillStyle = '#ffd32a';
                hctx.fillRect(0, 0, 128, 128);
                hctx.fillStyle = '#111111';
                for (let x = -128; x < 256; x += 32) {
                    hctx.beginPath();
                    hctx.moveTo(x, 0);
                    hctx.lineTo(x + 16, 0);
                    hctx.lineTo(x + 16 + 128, 128);
                    hctx.lineTo(x + 128, 128);
                    hctx.fill();
                }
            }
            const hazardTex = new THREE.CanvasTexture(hazardCanvas);
            const hazardPlate = new THREE.Mesh(
                new THREE.BoxGeometry(0.7, 1.1, 0.04),
                new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.5 })
            );
            swGroup.add(hazardPlate);

            // 2. Industrial Control Box
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x22272e, metalness: 0.8, roughness: 0.3 });
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), boxMat);
            box.position.set(0, 0, 0.12);
            swGroup.add(box);

            // 3. Glowing LED Indicator Dome (Red = Off, Green = On)
            const indicatorMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
            const indicatorDome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), indicatorMat);
            indicatorDome.position.set(0, 0.48, 0.15);
            indicatorDome.name = 'switch_indicator_dome';
            swGroup.add(indicatorDome);

            // 4. Bright Point Light for switch visibility
            const light = new THREE.PointLight(0xff3333, 2.8, 8.0);
            light.position.set(0, 0.48, 0.25);
            swGroup.add(light);

            // 5. High-visibility glowing beam / light column above switch
            const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3838, transparent: true, opacity: 0.65 });
            const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 8), beamMat);
            beam.position.set(0, 1.8, 0.15);
            beam.name = 'switch_beacon_beam';
            swGroup.add(beam);

            // 6. Pull-down Lever
            const leverMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.3, metalness: 0.7 });
            const leverArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), leverMat);
            leverArm.position.set(0, 0.06, 0.26);
            leverArm.name = 'switch_lever';
            swGroup.add(leverArm);

            // 7. Billboard text label above switch
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 256;
            labelCanvas.height = 128;
            const lctx = labelCanvas.getContext('2d');
            if (lctx) {
                lctx.fillStyle = '#0a0d14';
                lctx.fillRect(0, 0, 256, 128);
                lctx.strokeStyle = '#ffd32a';
                lctx.lineWidth = 6;
                lctx.strokeRect(6, 6, 244, 116);
                lctx.fillStyle = '#ffd32a';
                lctx.font = 'bold 34px monospace';
                lctx.textAlign = 'center';
                lctx.fillText(`⚡ LÜLITI ${item.label}`, 128, 75);
            }
            const labelTex = new THREE.CanvasTexture(labelCanvas);
            const labelMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.9, 0.45),
                new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
            );
            labelMesh.position.set(0, 0.9, 0.18);
            swGroup.add(labelMesh);

            swGroup.position.copy(item.pos);
            this.scene.add(swGroup);
            this.kuuljaSwitches.push({ mesh: swGroup, activated: false });
        });
    }

    private _spawnKuuljaBoss() {
        if (this.kuuljaBossGroup) this.scene.remove(this.kuuljaBossGroup);

        const kuulja = new THREE.Group();
        kuulja.name = 'kuulja_boss';

        const skinMat = new THREE.MeshStandardMaterial({
            color: 0x111620,
            roughness: 0.35,
            metalness: 0.6
        });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const clawMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.9 });

        // Tall very skinny body (2.7m tall)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.2, 12), skinMat);
        body.position.set(0, 1.2, 0);
        kuulja.add(body);

        // Highlighted metallic ribcage
        for (let r = 0; r < 4; r++) {
            const rib = new THREE.Mesh(new THREE.TorusGeometry(0.24 + r * 0.01, 0.025, 8, 16), skinMat);
            rib.rotation.x = Math.PI / 2;
            rib.position.set(0, 1.0 + r * 0.28, 0);
            kuulja.add(rib);
        }

        // Large smooth head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), skinMat);
        head.position.set(0, 2.45, 0);
        kuulja.add(head);

        // Glowing red eyes (clearly visible in the dark and light)
        [-0.1, 0.1].forEach(ex => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), eyeMat);
            eye.position.set(ex, 2.5, 0.3);
            kuulja.add(eye);
        });

        // Red light emitted from head for eerie silhouette visibility
        const headLight = new THREE.PointLight(0xff0033, 2.4, 8.0);
        headLight.position.set(0, 2.5, 0.4);
        kuulja.add(headLight);

        // Long jointed arms with sharp claws
        [-0.38, 0.38].forEach(ax => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 8), skinMat);
            arm.position.set(ax, 1.3, 0);
            arm.rotation.z = ax > 0 ? -0.25 : 0.25;
            kuulja.add(arm);

            // Claws on hands
            for (let c = -0.04; c <= 0.04; c += 0.04) {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.25, 6), clawMat);
                claw.rotation.x = Math.PI / 2;
                claw.position.set(ax + c, 0.2, 0.1);
                kuulja.add(claw);
            }
        });

        kuulja.position.set(5.5, 0, -10.0);
        this.scene.add(kuulja);
        this.kuuljaBossGroup = kuulja;
    }

    public activateKuuljaSwitch(index: number) {
        if (index < 0 || index >= this.kuuljaSwitches.length) return;
        const sw = this.kuuljaSwitches[index];
        if (sw.activated) return;
        sw.activated = true;
        this.kuuljaSwitchesActivated++;

        // Visual change to green for dome, beacon beam, and lever pull
        const pointLight = sw.mesh.children.find(c => c instanceof THREE.PointLight) as THREE.PointLight;
        if (pointLight) pointLight.color.setHex(0x2ed573);

        const dome = sw.mesh.getObjectByName('switch_indicator_dome') as THREE.Mesh;
        if (dome) (dome.material as THREE.MeshBasicMaterial).color.setHex(0x2ed573);

        const beam = sw.mesh.getObjectByName('switch_beacon_beam') as THREE.Mesh;
        if (beam) (beam.material as THREE.MeshBasicMaterial).color.setHex(0x2ed573);

        const lever = sw.mesh.getObjectByName('switch_lever');
        if (lever) lever.rotation.x = 0.6;

        metroAudio.playKeypadBeep(true);
        this.showThought(
            `⚡ Lüliti ${this.kuuljaSwitchesActivated}/3 aktiveeritud! Kuulja kuulis seda heli!`,
            `⚡ Switch ${this.kuuljaSwitchesActivated}/3 activated! The Listener heard the sound!`
        );

        // Make Kuulja rush toward switch
        if (this.kuuljaBossGroup) {
            this.kuuljaHearingAlert = true;
            this.kuuljaTargetPos.copy(sw.mesh.position);
            const alertEl = document.getElementById('kuulja-alert-overlay');
            if (alertEl) alertEl.style.display = 'block';
            setTimeout(() => {
                this.kuuljaHearingAlert = false;
                if (alertEl) alertEl.style.display = 'none';
            }, 3500);
        }

        if (this.kuuljaSwitchesActivated >= 3) {
            this._finishCarriage200Boss();
        }
    }

    private _finishCarriage200Boss() {
        this.state = 'cutscene_carriage200' as any;
        this.showThought(
            '🌟 KÕIK 3 LÜLITIT ON SEES! Tuled süttivad ja väljapääsu uks avaneb päikesevalguse kätte!',
            '🌟 ALL 3 SWITCHES ACTIVATED! Station blast door opens to bright daylight!'
        );

        // Power up all station lights
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => { l.color.setHex(0xffffff); l.intensity = 1.8; });
        }

        // Open Blast Exit Door & create glowing sunlight
        const blastDoor = this.currentCarriage?.group.getObjectByName('station_200_blast_door');
        if (blastDoor) {
            blastDoor.position.x += 2.6; // slide door open
            const sunLight = new THREE.PointLight(0xfffae0, 6.0, 40);
            sunLight.position.set(6.0, 2.5, 16.0);
            this.scene.add(sunLight);
        }

        // Step 1: Player automatically sprints up towards the stairs (2.0s)
        const startPos = this.playerPos.clone();
        const midStairsPos = new THREE.Vector3(6.0, 2.0, 12.2);
        const startTime = performance.now();
        const runDuration = 2200;

        const runInterval = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, elapsed / runDuration);
            const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            this.playerPos.lerpVectors(startPos, midStairsPos, easeT);
            this.cameraEuler.y = THREE.MathUtils.lerp(this.cameraEuler.y, 0, 0.1);
            this.cameraEuler.x = THREE.MathUtils.lerp(this.cameraEuler.x, 0.25, 0.1);

            if (Math.floor(elapsed / 250) % 2 === 0) {
                metroAudio.playFootstep();
            }

            if (t >= 1) {
                clearInterval(runInterval);

                // Step 2: Mid-stairs, Kuulja / Pahalane suddenly leaps down in front of player and smashes stairs!
                if (this.kuuljaBossGroup) {
                    this.kuuljaBossGroup.position.set(6.0, 2.4, 13.8);
                    this.kuuljaBossGroup.lookAt(this.playerPos.x, 2.4, this.playerPos.z);
                }

                this.showThought(
                    '😱 Kuulja hüppab ette ja purustab trepi! Trepp variseb kokku ja sa kukud sügavasse kanalisatsiooni!',
                    '😱 The Listener leaps in front and smashes the stairs! The staircase crumbles and you plummet into the sewers!'
                );
                metroAudio.playShadowRushScreech();

                // Break and collapse stairs
                if (this.stationStairsGroup) {
                    this.stationStairsGroup.children.forEach((step, sIdx) => {
                        step.rotation.x = 0.4 + sIdx * 0.1;
                        step.rotation.z = (sIdx % 2 === 0 ? 0.3 : -0.3);
                        step.position.y -= 1.8;
                    });
                }

                // Step 3: Dramatic screen shake and rapid vertical fall
                const fallStartTime = performance.now();
                const fallInterval = setInterval(() => {
                    const fallElapsed = performance.now() - fallStartTime;
                    this.cameraEuler.x += (Math.random() - 0.5) * 0.18;
                    this.cameraEuler.z = (Math.random() - 0.5) * 0.25;
                    this.playerPos.y -= 0.65; // plunge downward

                    if (fallElapsed > 1800) {
                        clearInterval(fallInterval);
                        this.cameraEuler.z = 0;

                        // Falling countdown through mystery levels
                        let count = 0;
                        const levels = [199, 150, 100, 50, 10, '002'];
                        const levelInterval = setInterval(() => {
                            if (count < levels.length) {
                                this.showThought(`Kukkumine läbi tasemete... TASE ${levels[count]}`, `Plummeting through levels... LEVEL ${levels[count]}`);
                                count++;
                            } else {
                                clearInterval(levelInterval);
                                metroAudio.stopCarriage200Music();
                                this.showThought('🌊 KUKKUSID KANALISATSIOONI (VAGUN 201)!', '🌊 FELL INTO THE SEWERS (CARRIAGE 201)!');
                                setTimeout(() => {
                                    this.loadCarriage(201, 'right');
                                }, 1800);
                            }
                        }, 600);
                    }
                }, 40);
            }
        }, 30);
    }

    // ── Kanalisatsiooni Sündmused (Vagunid 201–250) ──────────────────────────

    private triggerCarriage201SewerIntro() {
        this.carriage201IntroPlayed = true;
        const titleOverlay = document.getElementById('canalization-title-overlay');
        if (titleOverlay) {
            titleOverlay.style.display = 'flex';
            setTimeout(() => {
                titleOverlay.style.display = 'none';
                this.showThought(
                    'Kukkusid vette... Tõused aeglaselt püsti. Ees on suur betoontunnel ja vesi.',
                    'You plunged into water... Slowly getting up. A concrete sewer tunnel stretches ahead.'
                );
            }, 5000);
        }
    }

    private triggerCarriage217SewerShadowDash() {
        this.showThought(
            '⚠️ SHADOW DASH TULEB! LAMA VEES [C / E], et peita! (Kuni 20s)',
            '⚠️ SHADOW DASH INCOMING! SUBMERGE IN WATER [C / E] to hide! (Up to 20s)'
        );

        this.startShadowRushCarriageEvent(217);

        // Track submerge survival in loop
        let elapsed = 0;
        const subCheck = setInterval(() => {
            if (!this.shadowRushActive) {
                clearInterval(subCheck);
                this.emergeFromSewerWater();
                return;
            }
            elapsed += 0.5;
            if (this.sewerWaterSubmerged) {
                if (elapsed >= 10) {
                    const canvas = this.renderer.domElement;
                    if (canvas) canvas.style.filter = 'grayscale(0.8)';
                }
                if (elapsed >= 20) {
                    this.playerHp = Math.max(0, this.playerHp - 5);
                    this.updateHealthUI();
                }
            } else {
                // Standing during Shadow rush = death
                if (Math.abs(this.playerPos.z) < 5.0) {
                    clearInterval(subCheck);
                    this.triggerDraggedDeath(1);
                }
            }
        }, 500);
    }

    private triggerCarriage250SewerEnd() {
        this.carriage250DoorOpened = true;
        this.showThought(
            '🌟 KANALISATSIOONI OSA LÕPP! Metalluks avaneb ja ees paistavad metroorööpad.',
            '🌟 CANALIZATION COMPLETE! The blast door opens revealing deep subway tracks.'
        );
        metroAudio.playDoorSlide(true);
    }

    private triggerCarriage257MaintenanceHideout() {
        this.showThought(
            '🚨 SHADOW DASH LÄHENEB! MINE PEIDA HOOLDUSRUUMI! 🚨',
            '🚨 SHADOW DASH INCOMING! HIDE INSIDE THE MAINTENANCE ROOM! 🚨'
        );
        this.startShadowRushCarriageEvent(257);
    }

    private triggerCarriage300Finale() {
        this.showThought(
            '☀️ VAGUN 300 — METROOJAAM JA VÄLJAPÄÄS! Astu mööda pikka platvormi metallukseni!',
            '☀️ CARRIAGE 300 — SUBWAY TERMINAL & FINAL EXIT! Walk along the long platform to the blast door!'
        );

        setTimeout(() => {
            this.triggerVictory300();
        }, 5000);
    }


    // ── Politsei jälituse sündmused ────────────────────────────────────────────

    // ── Anomaly Mechanics ────────────────────────────────────────────────────

    private startLightFlickerAnomaly() {
        if (!this.currentCarriage) return;
        let count = 0;
        const interval = setInterval(() => {
            if (!this.currentCarriage) { clearInterval(interval); return; }
            count++;
            const isOn = count % 2 === 0;
            this.currentCarriage.lights.forEach(l => l.intensity = isOn ? 0.9 : 0.05);
            this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(isOn ? 0xffffff : 0x222222));
            metroAudio.playFlickerBuzz();

            if (count > 12) {
                clearInterval(interval);
                this.currentCarriage.lights.forEach(l => l.intensity = 0.85);
                this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff));
            }
        }, 180);
    }

    public isShadowEventActive(): boolean {
        return this.shadowRushActive || this.shadowRushCountdown > 0 || this.shadowEntityMesh !== null;
    }

    // --- Ajapahalane (Time Villain) — 10 Second Escape Event ---

    public activateTimeVillain() {
        if (this.timeVillainActive || this.state !== 'player_free' || this.currentCarIndex === 0 || this.currentCarIndex === 100 || this.currentCarIndex === 200) return;

        this.timeVillainActive = true;
        this.timeVillainCountdown = 10.0;
        this.timeVillainTriggeredThisCarriage = true;

        // 1. Start clock tower horror bells
        metroAudio.startClockTowerBells();

        // 2. Apply grayscale (black & white) filter to canvas
        const canvas = this.renderer.domElement;
        if (canvas) canvas.style.filter = 'grayscale(1) contrast(1.3)';

        // 3. Rapid light flickering
        this.timeVillainFlickerInterval = setInterval(() => {
            if (!this.currentCarriage || !this.timeVillainActive) return;
            const isOn = Math.random() > 0.4;
            this.currentCarriage.lights.forEach(l => l.intensity = isOn ? 1.2 : 0.05);
            this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(isOn ? 0xffffff : 0x220000));
        }, 80);

        // 4. Spawn the Time Villain entity directly in front of player
        const villainGroup = new THREE.Group();
        villainGroup.name = 'time_villain';

        // Tall dark cloaked humanoid figure with clock motifs
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, metalness: 0.1 });
        const clockMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // Tall body (cloaked)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 0.5), bodyMat);
        body.position.set(0, 1.0, 0);
        villainGroup.add(body);

        // Wide cloak bottom
        const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 6), bodyMat);
        cloak.position.set(0, 0.6, 0);
        villainGroup.add(cloak);

        // Head (dark sphere with burning red eyes)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), bodyMat);
        head.position.set(0, 2.2, 0);
        villainGroup.add(head);

        // Burning red eyes
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
        leftEye.position.set(-0.08, 2.25, 0.2);
        villainGroup.add(leftEye);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
        rightEye.position.set(0.08, 2.25, 0.2);
        villainGroup.add(rightEye);

        // Glowing clock face on chest
        const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), clockMat);
        clockFace.position.set(0, 1.5, 0.26);
        villainGroup.add(clockFace);

        // Clock hands (pointing to XII)
        const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hourHand.position.set(0, 1.56, 0.28);
        villainGroup.add(hourHand);
        const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        minHand.position.set(0, 1.58, 0.28);
        villainGroup.add(minHand);

        // Red point lights on the villain for eerie glow
        const glowLight = new THREE.PointLight(0xff0000, 2.5, 6);
        glowLight.position.set(0, 1.6, 0);
        villainGroup.add(glowLight);

        // Position villain in front of the player
        const camDir = new THREE.Vector3(0, 0, -1).applyEuler(this.cameraEuler);
        villainGroup.position.set(
            this.playerPos.x + camDir.x * 4,
            0,
            this.playerPos.z + camDir.z * 4
        );
        villainGroup.lookAt(this.playerPos.x, 1.6, this.playerPos.z);

        this.scene.add(villainGroup);
        this.timeVillainGroup = villainGroup;

        // Roar sound
        metroAudio.playTimeVillainRoar();

        // 5. Show countdown overlay
        const overlay = document.getElementById('time-villain-overlay');
        if (overlay) overlay.style.display = 'block';

        // 6. Show thought
        this.showThought(
            '👹 AJAPAHALANE! JOOKSE JÄRGMISSE VAGUNISSE! Sul on 10 SEKUNDIT!',
            '👹 TIME VILLAIN! RUN TO THE NEXT CARRIAGE! You have 10 SECONDS!',
            3000
        );
    }

    public deactivateTimeVillain() {
        if (!this.timeVillainActive) return;
        this.timeVillainActive = false;
        this.timeVillainCountdown = 0;

        // Stop clock tower bells
        metroAudio.stopClockTowerBells();

        // Remove grayscale filter
        const canvas = this.renderer.domElement;
        if (canvas) canvas.style.filter = '';

        // Stop rapid flickering
        if (this.timeVillainFlickerInterval) {
            clearInterval(this.timeVillainFlickerInterval);
            this.timeVillainFlickerInterval = null;
        }

        // Restore normal lights
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => l.intensity = 0.85);
            this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff));
        }

        // Remove villain mesh
        if (this.timeVillainGroup) {
            this.scene.remove(this.timeVillainGroup);
            this.timeVillainGroup = null;
        }

        // Reset shake offset
        this.timeVillainShakeOffset.set(0, 0, 0);

        // Hide countdown overlay
        const overlay = document.getElementById('time-villain-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    public timeVillainKillPlayer() {
        this.deactivateTimeVillain();
        this.playerHp = 0;
        this.updateHealthUI();
        this.state = 'dead';

        const deathModal = document.getElementById('death-modal');
        const dTitle = document.getElementById('death-title');
        const dDesc = document.getElementById('death-desc');
        if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
        if (dDesc) {
            dDesc.textContent = this.lang === 'et'
                ? '👹 Ajapahalane jõudis sinuni! Sa ei jõudnud järgmisse vagunisse õigel ajal.'
                : '👹 The Time Villain caught you! You did not reach the next carriage in time.';
        }
        if (deathModal) deathModal.style.display = 'flex';
        this.updateCursorState();
    }


    public startShadowRushCarriageEvent(index: number = this.currentCarIndex) {
        this.carriage20EventTriggered = true;
        this.shadowRushActive = false;
        this.shadowRushCountdown = 5.0;

        // 1. Violent light flickering with emergency dim red/white pulses
        this.startLightFlickerAnomaly();

        // 2. Train screeching brakes audio (rongi pidurduse hääl)
        metroAudio.playTrainBrakesScreech(5.0);

        // 3. Eerie creepy escalating sound for 5 seconds (imelik hääl kestab 5 sek)
        metroAudio.playCreepyDrone5s();

        // 4. Train speed rapidly decelerates with heavy vibrations
        this.trainSpeed = 20;

        // 5. Urgent warning thought / HUD notification
        this.showThought(
            `⚠️ RONG PIDURDAB! (Vagun ${index}) Kuskilt kostub hirmus kisa... ISTU KIIRESTI TOOLILE! (Vajuta [E] või klõpsa istmele)`,
            `⚠️ TRAIN BRAKING! (Carriage ${index}) A terrifying shriek echoes... SIT DOWN QUICKLY! (Press [E] or click a seat)`,
            5000
        );

        // After 5 seconds: Spawn the Shadow Creature (Must Olend) and dash through the carriage!
        const triggerCar = this.currentCarIndex;
        setTimeout(() => {
            if (this.currentCarIndex === triggerCar && this.state !== 'game_over' && this.state !== 'dead') {
                this.spawnAndRushShadowCreature();
            }
        }, 5000);
    }

    public startCarriage20ShadowRushEvent() {
        this.startShadowRushCarriageEvent(20);
    }

    public spawnAndRushShadowCreature() {
        if (this.shadowEntityMesh) {
            this.scene.remove(this.shadowEntityMesh);
            this.shadowEntityMesh = null;
        }

        const group = new THREE.Group();
        group.name = 'shadow_creature_entity';

        const shadowMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.9,
            metalness: 0.1,
            emissive: 0x1a0000,
            emissiveIntensity: 0.8
        });

        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x020202,
            transparent: true,
            opacity: 0.85
        });

        const eyeGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff0000
        });

        // 1. Dark Smoky Torso & Shadow Mass
        const mainBody = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), shadowMat);
        mainBody.scale.set(1.1, 1.6, 1.4);
        mainBody.position.set(0, 1.4, 0);
        group.add(mainBody);

        // Surrounding Shadow Smoke Volumes
        for (let i = 0; i < 8; i++) {
            const smokeBall = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 8, 8), smokeMat);
            smokeBall.position.set((Math.random() - 0.5) * 0.8, 1.2 + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.2);
            group.add(smokeBall);
        }

        // 2. Piercing Glowing Crimson Eyes
        [-0.18, 0.18].forEach(ex => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyeGlowMat);
            eye.position.set(ex, 1.65, 0.45);
            group.add(eye);

            const eyeTrail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), eyeGlowMat);
            eyeTrail.position.set(ex, 1.65, 0.2);
            group.add(eyeTrail);
        });

        // 3. Shadow Claws / Tendrils reaching outward
        [-0.55, 0.55].forEach(cx => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.2, 8), shadowMat);
            arm.rotation.z = cx > 0 ? -Math.PI / 3 : Math.PI / 3;
            arm.rotation.x = Math.PI / 4;
            arm.position.set(cx, 1.3, 0.3);
            group.add(arm);

            // Claws
            [-0.06, 0, 0.06].forEach(fingerZ => {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 6), shadowMat);
                claw.rotation.x = Math.PI / 2;
                claw.position.set(cx > 0 ? cx + 0.5 : cx - 0.5, 0.9, 0.7 + fingerZ);
                group.add(claw);
            });
        });

        // Rush slower through the carriage so the player can see the horrifying shadowy entity approaching
        const startZ = this.playerPos.z < 0 ? 9.5 : -9.5;
        this.shadowRushSpeed = startZ > 0 ? -7.0 : 7.0;

        group.position.set(0, 0, startZ);
        group.rotation.y = this.shadowRushSpeed < 0 ? Math.PI : 0;

        this.shadowEntityMesh = group;
        this.scene.add(this.shadowEntityMesh);
        this.shadowRushActive = true;

        // Play terrifying monster roar, dark wind storm AND horrifying horror song / music
        metroAudio.playShadowRushScreech();
        metroAudio.playHorrorShadowSong();

        this.showThought(
            '😱 MUST OLEND LIIGUB AEGLASELT MÖÖDA VAGUNIT! ISTU TOOLIL, ET ELLU JÄÄDA!',
            '😱 SHADOW CREATURE IS CREEPING DOWN THE AISLE! STAY SEATED TO SURVIVE!',
            3500
        );
    }

    private startDoorGlitchAnomaly() {
        setTimeout(() => {
            metroAudio.playDoorSlide(true);
            metroAudio.playWhisper(3.0);
            this.showThought('Uks avanes iseenesest! Mis väljas liigub?!', 'The door opened on its own! What is moving out there?!');
            setTimeout(() => {
                metroAudio.playDoorSlide(false);
            }, 3000);
        }, 2500);
    }

    private spawnStalkerEntity() {
        if (this.stalkerMesh) this.scene.remove(this.stalkerMesh);

        const stalker = new THREE.Group();
        const stalkerMat = new THREE.MeshPhysicalMaterial({
            color: 0x00f2fe,
            transparent: true,
            opacity: 0.55,
            roughness: 0.1,
            transmission: 0.6
        });

        // Slender shadowy figure
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.8), stalkerMat);
        body.position.set(0, 0.9, 0);
        stalker.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), stalkerMat);
        head.position.set(0, 1.9, 0);
        stalker.add(head);

        // Glowing white eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.05, 0.05].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
            eye.position.set(x, 1.92, -0.15);
            stalker.add(eye);
        });

        stalker.position.set(0, 0, 8.5);
        this.scene.add(stalker);
        this.stalkerMesh = stalker;
        this.stalkerActive = true;
        this.stalkerDistZ = 8.5;
    }

    // --- Ultra-Realistic Shadow Hand Void Emergence (Mustad Käed) ---

    public createShadowHandMesh(side: number, zOffset: number = 0): THREE.Group {
        const handGroup = new THREE.Group();

        const armSkinMat = new THREE.MeshStandardMaterial({
            color: 0x030406,
            roughness: 0.85,
            metalness: 0.35
        });
        const jointMat = new THREE.MeshStandardMaterial({
            color: 0x08090d,
            roughness: 0.7,
            metalness: 0.5
        });
        const clawMat = new THREE.MeshStandardMaterial({
            color: 0x14041b,
            roughness: 0.25,
            metalness: 0.75
        });
        const veinMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

        // 1. Shoulder Socket & Upper Arm
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), jointMat);
        shoulder.position.set(0, 0, 0);
        handGroup.add(shoulder);

        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.75, 10), armSkinMat);
        upperArm.rotation.z = side > 0 ? -Math.PI / 2.8 : Math.PI / 2.8;
        upperArm.position.set(-side * 0.35, 0.05, 0);
        handGroup.add(upperArm);

        // 2. Elbow Joint
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), jointMat);
        elbow.position.set(-side * 0.7, 0.1, 0);
        handGroup.add(elbow);

        // 3. Forearm (reaching inward towards center of aisle)
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 0.85, 10), armSkinMat);
        forearm.rotation.z = side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3;
        forearm.position.set(-side * 1.1, 0.12, 0);
        handGroup.add(forearm);

        // Pulsating vein ridges on forearm
        [-0.03, 0.03].forEach(vOffset => {
            const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), veinMat);
            vein.rotation.z = side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3;
            vein.position.set(-side * 1.1, 0.12 + vOffset, vOffset);
            handGroup.add(vein);
        });

        // 4. Wrist & Anatomical Palm
        const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), jointMat);
        wrist.position.set(-side * 1.5, 0.14, 0);
        handGroup.add(wrist);

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.28), armSkinMat);
        palm.position.set(-side * 1.62, 0.14, 0);
        handGroup.add(palm);

        // 5. Five Articulated Fingers (Thumb, Index, Middle, Ring, Pinky)
        const fingerOffsets = [
            { z: -0.11, len: 0.26, scale: 0.9, isThumb: true },
            { z: -0.06, len: 0.38, scale: 1.0, isThumb: false },
            { z: -0.00, len: 0.44, scale: 1.1, isThumb: false },
            { z: 0.06, len: 0.38, scale: 1.0, isThumb: false },
            { z: 0.11, len: 0.28, scale: 0.85, isThumb: false }
        ];

        fingerOffsets.forEach((f) => {
            const fingerGroup = new THREE.Group();
            fingerGroup.name = 'finger';

            // Proximal Phalanx
            const pPhalanx = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * f.scale, 0.024 * f.scale, f.len * 0.5, 6), armSkinMat);
            pPhalanx.rotation.z = side > 0 ? -Math.PI / 3 : Math.PI / 3;
            pPhalanx.position.set(-side * (f.len * 0.2), 0, 0);
            fingerGroup.add(pPhalanx);

            // Knuckle Joint
            const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.022 * f.scale, 6, 6), jointMat);
            knuckle.position.set(-side * (f.len * 0.45), 0, 0);
            fingerGroup.add(knuckle);

            // Distal Phalanx & Curved Razor Claw
            const dPhalanx = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * f.scale, 0.018 * f.scale, f.len * 0.45, 6), armSkinMat);
            dPhalanx.rotation.z = side > 0 ? -Math.PI / 2.4 : Math.PI / 2.4;
            dPhalanx.position.set(-side * (f.len * 0.65), -0.02, 0);
            fingerGroup.add(dPhalanx);

            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025 * f.scale, 0.22 * f.scale, 6), clawMat);
            claw.rotation.z = side > 0 ? -Math.PI / 1.8 : Math.PI / 1.8;
            claw.position.set(-side * (f.len * 0.9), -0.05, 0);
            fingerGroup.add(claw);

            // Glowing claw tip
            const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), veinMat);
            tipGlow.position.set(-side * (f.len * 1.0), -0.06, 0);
            fingerGroup.add(tipGlow);

            fingerGroup.position.set(-side * 1.68, 0.14, f.z);
            handGroup.add(fingerGroup);
        });

        // 6. Eerie Red/Purple Volumetric Point Light from Palm
        const palmLight = new THREE.PointLight(0xff1744, 2.5, 4.5);
        palmLight.position.set(-side * 1.55, 0.2, 0);
        handGroup.add(palmLight);

        // Position hand right inside the doorway at x = side * 1.68, y = 1.35, z = zOffset
        handGroup.position.set(side * 1.68, 1.35, zOffset);
        return handGroup;
    }

    public triggerShadowHandsEvent() {
        if (this.shadowHandsActive) return;
        this.shadowHandsActive = true;
        this.shadowHandsTimer = 10.0; // Stays active for exactly 10s then disappears (kui käsi tuleb on se 10 sek siis läheb ära)

        // Doors vanish completely (uksi pole näha!)
        this.sideDoorMeshes.forEach(d => d.mesh.visible = false);

        // Play scary audio
        metroAudio.playDoorSlide(true);
        metroAudio.playShadowGrab();

        // Flickering red lights in carriage
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => {
                l.color.setHex(0xff1744);
                l.intensity = 1.4;
            });
        }

        // Exactly 1 hand from 1 side only (ainult 1 pool tuleb käsi)
        const activeSide = 1; // Reaching from right doorway
        const hand = this.createShadowHandMesh(activeSide, 0);
        this.scene.add(hand);
        this.shadowHandsGroups.push(hand);

        this.showThought(
            'Uksed kadusid ära... Tühjusest sirutub välja must varjukäsi! Pea 10 sekundit vastu ja ära puuduta seda!',
            'The doors vanished into the void... A black shadow hand is reaching in! Survive for 10 seconds and do not touch it!'
        );
    }

    public dismissShadowHands() {
        if (!this.shadowHandsActive) return;
        this.shadowHandsActive = false;

        // Remove shadow hand meshes from scene
        this.shadowHandsGroups.forEach(hand => this.scene.remove(hand));
        this.shadowHandsGroups = [];

        // Restore sliding side doors
        this.sideDoorMeshes.forEach(d => d.mesh.visible = true);

        // Restore carriage lighting back to normal
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => {
                l.color.setHex(this.currentCarriage!.theme === 'dark' ? 0xff4757 : 0xffffff);
                l.intensity = 0.85;
            });
        }

        // Play door closing sound & victory thought
        metroAudio.playDoorSlide(false);
        this.showThought(
            'Must varjukäsi tõmbus tagasi tühjusesse ja uksed taastusid... Oht on möödas!',
            'The shadow hand retreated back into the void and the doors restored... The danger has passed!'
        );
    }

    public triggerDraggedDeath(side: number) {
        if (this.state === 'dragged_death' || this.state === 'dead') return;
        this.state = 'dragged_death';
        this.deathDragSide = side;
        this.deathTimer = 0;

        // Horror Audio
        metroAudio.playShadowGrab();
        metroAudio.playDeathScream();

        // Red flash
        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) {
            flashOverlay.style.display = 'block';
            flashOverlay.style.opacity = '0.9';
            setTimeout(() => {
                flashOverlay.style.opacity = '0';
                setTimeout(() => flashOverlay.style.display = 'none', 600);
            }, 300);
        }

        this.showThought('Mind tõmmatakse rongist välja...!', 'I am being dragged out of the train...!');
    }

    public openDeathModal() {
        this.state = 'dead';
        const modal = document.getElementById('death-modal');
        const title = document.getElementById('death-title');
        const desc = document.getElementById('death-desc');
        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) flashOverlay.style.display = 'none';

        if (modal && title && desc) {
            title.innerText = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
            desc.innerText = this.lang === 'et'
                ? 'Must varjukäsi haaras sinust ja tõmbas su kihutavast rongist tühjusesse...'
                : 'The dark shadow hand grabbed you and dragged you from the speeding train into the void...';
            modal.style.display = 'flex';
        }
        this.updateCursorState();
    }

    public respawnFromDeath() {
        const modal = document.getElementById('death-modal');
        if (modal) modal.style.display = 'none';

        // Replay full cinematic intro sequence from the beginning (kui panen retry siis peab ka intro tulema)
        this.replayIntro();
        this.updateCursorState();
    }

    private startCarriage10JumpScare() {
        setTimeout(() => {
            // Cut lights
            if (this.currentCarriage) {
                this.currentCarriage.lights.forEach(l => l.intensity = 0);
                this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0x111111));
            }

            // Spawn horror glitch creature right in front of camera
            const scareGroup = new THREE.Group();
            const horrorMat = new THREE.MeshBasicMaterial({ color: 0xff4757, wireframe: true });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), horrorMat);
            head.position.set(0, 1.6, -1.2);
            scareGroup.add(head);
            this.camera.add(scareGroup);
            this.jumpScareMesh = scareGroup;
            this.jumpScareActive = true;

            // Screamer stinger audio
            metroAudio.playJumpScareStinger();

            // Flash effect on screen
            const flashOverlay = document.getElementById('scare-flash-overlay');
            if (flashOverlay) {
                flashOverlay.style.display = 'block';
                flashOverlay.style.opacity = '1';
                setTimeout(() => {
                    flashOverlay.style.opacity = '0';
                    setTimeout(() => flashOverlay.style.display = 'none', 500);
                }, 200);
            }

            // Clean up jumpscare after 1.5 seconds and restore normal lights
            setTimeout(() => {
                if (this.jumpScareMesh) {
                    this.camera.remove(this.jumpScareMesh);
                    this.jumpScareMesh = null;
                }
                this.jumpScareActive = false;
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => l.intensity = 0.85);
                    this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff));
                }
                this.showThought('Mis see oli...? Rong sõidab ikka edasi.', 'What on earth was that...? The train keeps moving forward.');
            }, 1400);
        }, 3500);
    }

    // --- Intro Sequence Flow ---

    public startIntroSequence() {
        // Clear previous intro timeouts
        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];

        metroAudio.stopCarriage200Music();
        metroAudio.stopShopMusic();

        // Reset all coins, inventory items, buffs & progress when returning to the beginning
        this.coins = 0;
        this.inventory = { sword: true };
        this.playerHp = 100;
        this.updateHealthUI();
        this.equippedItem = null;
        if (this.heldItemMesh) {
            this.camera.remove(this.heldItemMesh);
            this.heldItemMesh = null;
        }
        this.updateHotbarUI();
        this.updateCoinsUI();

        const nvOverlay = document.getElementById('night-vision-overlay');
        if (nvOverlay) nvOverlay.style.display = 'none';
        this.nightVisionActive = false;
        this.speedBoostActive = false;
        this.clueDetectorActive = false;

        this.hasUnlockedCarriage28WithClue = false;
        this.hasUnlockedCarriage64WithKey = false;
        this.hasUnlockedCarriage78WithHint = false;
        this.cluesFound = 0;

        try {
            localStorage.removeItem('last_metro_save');
        } catch (e) {}

        this.currentCarIndex = 0;
        this.loadCarriage(0, 'undecided');
        this.state = 'intro_station';
        this.cutsceneTimer = 0;
        this.trainSpeed = 0;
        this.introSideDoorsOpen = false;

        // Position train deep in dark tunnel initially
        if (this.currentCarriage) {
            this.currentCarriage.group.position.set(0, 0, -65);
        }
        // Position platform at track level
        this.stationPlatformGroup.position.set(0, 0, 0);

        // Camera starts outside on station platform looking across the bright station towards approaching train track
        this.playerPos.set(2.8, 1.6, -1.0);
        this.cameraEuler.set(0, -Math.PI / 2.1, 0);

        // Show cinematic letterbox and intro location badge
        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const locCard = document.getElementById('intro-location-card');
        const skipBtn = document.getElementById('btn-skip-intro');
        const standBtn = document.getElementById('btn-stand-up');

        if (cTop) cTop.classList.remove('cinematic-hidden');
        if (cBottom) cBottom.classList.remove('cinematic-hidden');
        if (locCard) {
            locCard.style.display = 'block';
            locCard.style.opacity = '1';
        }
        if (skipBtn) skipBtn.style.display = 'block';
        if (standBtn) standBtn.style.display = 'none';

        this.showThought(
            'Ootan viimast metrood. Kell on hilja ja jaam on peaaegu tühi.',
            'Waiting for the last metro. It is late and the station is nearly empty.',
            4000
        );

        // t = 1.2s: Distant subway train approaches with announcement chime
        this.introTimeouts.push(setTimeout(() => {
            metroAudio.playAnnouncementChime();
        }, 1200));

        // t = 4.2s: Train arrives and stops at platform! Doors chime and slide open
        this.introTimeouts.push(setTimeout(() => {
            if (this.currentCarriage) this.currentCarriage.group.position.z = 0;
            metroAudio.playDoorChime();
            setTimeout(() => {
                metroAudio.playDoorSlide(true);
                this.introSideDoorsOpen = true;
                this.state = 'intro_boarding';
                this.showThought(
                    'Metroorong saabus. Astun rongi ja otsin vaba istme.',
                    'The subway train arrived. I step aboard and look for a free seat.',
                    3500
                );
            }, 600);
        }, 4200));

        // t = 7.5s: Player walks into train and sits down on seat
        this.introTimeouts.push(setTimeout(() => {
            this.state = 'intro_riding';
            metroAudio.playFootstep();
            this.playerPos.set(1.1, 0.95, -1);
            this.cameraEuler.set(0, -Math.PI / 2, 0);

            // Hide location badge
            if (locCard) locCard.style.opacity = '0';
        }, 7500));

        // t = 9.8s: Side doors close and train departs into dark tunnel
        this.introTimeouts.push(setTimeout(() => {
            metroAudio.playDoorChime();
            setTimeout(() => {
                metroAudio.playDoorSlide(false);
                this.introSideDoorsOpen = false;
                this.trainSpeed = 50;
                metroAudio.setSpeedAudio(0.85);
                this.stationPlatformGroup.position.set(0, -50, 0);

                this.showThought(
                    'Uksed sulgusid. Esimene peatus peaks varsti saabuma.',
                    'Doors closed. The first stop should arrive shortly.',
                    4500
                );
            }, 800);
        }, 9800));

        // t = 15.5s: Arrive at First Stop (Keskjaam / Central Station)
        this.introTimeouts.push(setTimeout(() => {
            this.arriveAtFirstStop();
        }, 15500));
    }

    public skipIntro() {
        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];

        if (this.currentCarriage) {
            this.currentCarriage.group.position.set(0, 0, 0);
        }
        this.stationPlatformGroup.position.set(0, -50, 0);
        this.introSideDoorsOpen = false;
        this.trainSpeed = 60;
        metroAudio.setSpeedAudio(0.9);

        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const locCard = document.getElementById('intro-location-card');
        const skipBtn = document.getElementById('btn-skip-intro');

        if (cTop) cTop.classList.add('cinematic-hidden');
        if (cBottom) cBottom.classList.add('cinematic-hidden');
        if (locCard) locCard.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';

        this.standUp();
    }

    public replayIntro() {
        this.startIntroSequence();
    }

    private sitInTrain() {
        this.state = 'intro_riding';
        this.trainSpeed = 50;
        metroAudio.setSpeedAudio(0.8);

        // Sit on seat at (1.1, 0.9, -1)
        this.playerPos.set(1.1, 0.95, -1);
        this.cameraEuler.set(0, -Math.PI / 2, 0);

        // Hide station platform, move through tunnel
        this.stationPlatformGroup.position.set(0, -50, 0);

        this.showThought(
            'Istusin maha. Esimene peatus peaks varsti saabuma.',
            'I sat down. The first stop should arrive shortly.'
        );

        setTimeout(() => {
            this.arriveAtFirstStop();
        }, 5500);
    }

    private arriveAtFirstStop() {
        this.state = 'intro_first_stop';
        this.trainSpeed = 0;
        metroAudio.setSpeedAudio(0);

        // Show station platform outside right windows
        this.stationPlatformGroup.position.set(0, 0, 0);

        metroAudio.playAnnouncementChime();
        metroAudio.playDoorChime();
        setTimeout(() => {
            metroAudio.playDoorSlide(true);
            this.introSideDoorsOpen = true;
        }, 500);

        this.showThought(
            'Esimene peatus: Keskjaam. Mõned reisijad lähevad maha, uued tulevad peale.',
            'First stop: Central Station. Some passengers get off, new ones board.'
        );

        // Passenger shuffle animation & doors close
        this.introTimeouts.push(setTimeout(() => {
            metroAudio.playDoorChime();
            setTimeout(() => {
                metroAudio.playDoorSlide(false);
                this.introSideDoorsOpen = false;

                setTimeout(() => {
                    this.departFirstStop();
                }, 1500);
            }, 800);
        }, 4000));
    }

    private departFirstStop() {
        this.state = 'intro_departing';
        this.trainSpeed = 55;
        metroAudio.setSpeedAudio(0.85);
        this.stationPlatformGroup.position.set(0, -50, 0);

        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const skipBtn = document.getElementById('btn-skip-intro');
        if (cTop) cTop.classList.add('cinematic-hidden');
        if (cBottom) cBottom.classList.add('cinematic-hidden');
        if (skipBtn) skipBtn.style.display = 'none';

        // Unlock player movement!
        this.introTimeouts.push(setTimeout(() => {
this.state = 'player_free';
            const standBtn = document.getElementById('btn-stand-up');
            if (standBtn) standBtn.style.display = 'flex';

            this.showThought(
                'Rong hakkas uuesti sõitma. Nüüd saan püsti tõusta ja rongi uurida.',
                'The train started moving again. I can now stand up and explore the train.'
            );
        }, 1200));
    }

    public sitDown() {
        if (this.state !== 'player_free' && this.state !== 'intro_riding') return;
        this.isSitting = true;
        const sideX = this.playerPos.x >= 0 ? 1.22 : -1.22;
        this.playerPos.x = sideX;
        this.playerPos.y = 0.95;
        metroAudio.playSitDown();

        const sitIcon = document.getElementById('btn-toggle-sit-icon');
        const sitText = document.getElementById('btn-toggle-sit-text');
        if (sitIcon) sitIcon.textContent = '🧍‍♂️';
        if (sitText) sitText.textContent = this.lang === 'et' ? 'Tõuse' : 'Stand';

        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) {
            standBtn.style.display = 'flex';
            standBtn.innerHTML = `<span>🧍‍♂️</span><span>${this.lang === 'et' ? 'Tõuse Püsti / Stand Up (W / E / Tap)' : 'Stand Up (W / E / Tap)'}</span>`;
        }

        this.showThought(
            'Istusin toolile. (Vajuta W, E või puuduta nuppu püstitõusmiseks)',
            'Sat down on the seat. (Press W, E or tap button to stand up)',
            2500
        );
    }

    public standUp() {
        this.isSitting = false;
        if (this.state === 'player_free' || this.state === 'intro_first_stop' || this.state === 'intro_riding' || this.state === 'intro_departing') {
            this.state = 'player_free';
            this.playerPos.y = 1.6;
            this.playerPos.x = 0; // step into aisle
            const standBtn = document.getElementById('btn-stand-up');
            if (standBtn) standBtn.style.display = 'none';

            const sitIcon = document.getElementById('btn-toggle-sit-icon');
            const sitText = document.getElementById('btn-toggle-sit-text');
            if (sitIcon) sitIcon.textContent = '🪑';
            if (sitText) sitText.textContent = this.lang === 'et' ? 'Istu' : 'Sit';

            metroAudio.playStandUp();
        }

        // Only show direction choice thought in the very first carriage (Carriage 0)
        if (this.currentCarIndex === 0) {
            this.cameraEuler.y = Math.PI; // Look forward down the aisle towards +Z
            this.showThought(
                'Vali suund: kas minna ettepoole (PAREM) või tahapoole (VASAK)?',
                'Choose a direction: head forward (RIGHT) or backward (LEFT)?'
            );
        }
    }

    public toggleSit() {
        if (this.isSitting) {
            this.standUp();
        } else {
            this.sitDown();
        }
    }

    // --- Input Handling & Player Movement ---

    private setupInputs() {
        window.addEventListener('keydown', (e) => {
            this.moveKeys[e.code] = true;

            // Stand up from seat if sitting and any movement/action key is pressed
            if (this.isSitting && (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'Space' || e.code.startsWith('Arrow'))) {
                this.standUp();
            }

            // Flashlight toggle (KeyF)
            if (e.code === 'KeyF') {
                this.toggleFlashlight();
            }

            // Interact (KeyE)
            if (e.code === 'KeyE') {
                this.checkInteractions();
            }

            // Hotbar quick slot keys (1-9)
            if (e.code === 'Digit1') this.toggleEquipItem('sword');
            if (e.code === 'Digit2') this.toggleFlashlight();
            if (e.code === 'Digit3') this.toggleCluesFolderModal();
            if (e.code === 'Digit4' && this.inventory['key']) this.toggleEquipItem('key');
            if (e.code === 'Digit5' && this.inventory['night_vision']) this.toggleEquipItem('night_vision');
            if (e.code === 'Digit6' && this.inventory['speed_boost']) this.toggleEquipItem('speed_boost');
            if (e.code === 'Digit7' && this.inventory['clue_detector']) this.toggleEquipItem('clue_detector');
            if (e.code === 'Digit8' && this.inventory['secret_pass']) this.toggleEquipItem('secret_pass');
            if (e.code === 'Digit9' && this.inventory['radio']) this.toggleEquipItem('radio');

            // Backpack / Clues Folder shortcut (KeyB or KeyJ)
            if (e.code === 'KeyB' || e.code === 'KeyJ') {
                this.toggleCluesFolderModal();
            }

            // Crouch / Sneak / Submerge in water toggle (KeyC)
            if (e.code === 'KeyC') {
                this.toggleCrouch();
            }

            // Playard Owner Teleport Modal shortcut (F2)
            if (e.code === 'F2' && this.isOwner) {
                const modal = document.getElementById('owner-teleport-modal');
                if (modal && modal.style.display === 'flex') {
                    this.closeOwnerTeleportModal();
                } else {
                    this.openOwnerTeleportModal();
                }
            }

            // Escape to close modals
            if (e.code === 'Escape') {
                this.closeOwnerTeleportModal();
                this.closeCluesFolderModal();
                const clueModal = document.getElementById('clue-inspect-modal');
                if (clueModal && clueModal.style.display === 'flex') {
                    this.packCurrentInspectedClue();
                }
            }

        });

        window.addEventListener('keyup', (e) => {
            this.moveKeys[e.code] = false;
        });

        // Mouse Look / Pointer Lock for Camera (Active immediately from start without needing to press anything)
        const canRotateHead = () => {
            return this.state === 'player_free' || this.state.startsWith('intro_') || this.isSitting;
        };

        let hasInitializedMouse = false;

        const handleStartLook = (clientX: number, clientY: number) => {
            metroAudio.enableAudio();
            this.isMouseDown = true;
            this.lastMouseX = clientX;
            this.lastMouseY = clientY;
            hasInitializedMouse = true;

            // Attack with sword if equipped
            if (this.state === 'player_free' && this.equippedItem === 'sword') {
                this.attackWithSword();
                return;
            }

            if (this.state === 'player_free' && this.aimedInteractable) {
                this.checkInteractions();
            }
        };

        const handleMoveLook = (clientX: number, clientY: number, movementX?: number, movementY?: number) => {
            if (!canRotateHead()) return;

            // User requirement: "Sihikutäpiga vaatamine peab juba alguses olema isegi kui ma midagi ei vajuta"
            // Immediate camera rotation upon mouse movement, whether pointer locked, hovering, or dragging
            if (this.isPointerLocked && movementX !== undefined && movementY !== undefined) {
                const sensitivity = 0.0024;
                this.cameraEuler.y -= movementX * sensitivity;
                this.cameraEuler.x -= movementY * sensitivity;
                this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
            } else {
                if (!hasInitializedMouse) {
                    this.lastMouseX = clientX;
                    this.lastMouseY = clientY;
                    hasInitializedMouse = true;
                    return;
                }

                const dx = (movementX !== undefined && movementX !== 0) ? movementX : (clientX - this.lastMouseX);
                const dy = (movementY !== undefined && movementY !== 0) ? movementY : (clientY - this.lastMouseY);
                this.lastMouseX = clientX;
                this.lastMouseY = clientY;

                const sensitivity = 0.0028;
                this.cameraEuler.y -= dx * sensitivity;
                this.cameraEuler.x -= dy * sensitivity;
                this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
            }
        };

        const handleEndLook = () => {
            this.isMouseDown = false;
        };

        window.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement)?.closest('button, a, input, .modal-box, .hotbar-slot')) return;
            handleStartLook(e.clientX, e.clientY);
            this.updateCursorState();
        });

        window.addEventListener('mousemove', (e) => {
            handleMoveLook(e.clientX, e.clientY, e.movementX, e.movementY);
        });

        window.addEventListener('mouseup', () => handleEndLook());

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
            if (this.isPointerLocked) {
                document.body.classList.add('metro-in-game');
                document.body.classList.remove('metro-cursor-visible');
            }
        });

        // Touch controls on mobile/tablets
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                if ((e.target as HTMLElement)?.closest('button, a, input, .modal-box, .hotbar-slot')) return;
                metroAudio.enableAudio();
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.isMouseDown = true;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;
                hasInitializedMouse = true;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0 && canRotateHead()) {
                const dx = e.touches[0].clientX - this.touchStartX;
                const dy = e.touches[0].clientY - this.touchStartY;
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;

                const sensitivity = 0.0045;
                this.cameraEuler.y -= dx * sensitivity;
                this.cameraEuler.x -= dy * sensitivity;
                this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
            }
        }, { passive: true });

        window.addEventListener('touchend', () => handleEndLook());
    }

    // --- Cursor & Pointer Lock State Management ---
    public updateCursorState() {
        const isShopOpen = document.getElementById('golden-shop-modal')?.style.display === 'flex';
        const isDeathOpen = document.getElementById('death-modal')?.style.display === 'flex';
        const isLoreOpen = document.getElementById('lore-modal')?.style.display === 'flex';
        const isKeypadOpen = document.getElementById('keypad-modal')?.style.display === 'flex';
        const isOwnerOpen = document.getElementById('owner-teleport-modal')?.style.display === 'flex';
        const isClueInspectOpen = document.getElementById('clue-inspect-modal')?.style.display === 'flex';
        const isCluesFolderOpen = document.getElementById('clues-folder-modal')?.style.display === 'flex';
        const isVictory300Open = document.getElementById('victory-300-modal')?.style.display === 'flex';
        const startOverlay = document.getElementById('start-game-overlay');
        const isStartOpen = !!startOverlay && startOverlay.style.display !== 'none' && startOverlay.style.opacity !== '0';

        const isAnyModalOpen = isShopOpen || isDeathOpen || isLoreOpen || isKeypadOpen || isOwnerOpen || isClueInspectOpen || isCluesFolderOpen || isVictory300Open || isStartOpen;

        if (isAnyModalOpen) {
            document.body.classList.remove('metro-in-game');
            document.body.classList.add('metro-cursor-visible');
            if (document.pointerLockElement) {
                try { document.exitPointerLock?.(); } catch (_) {}
            }
        } else {
            document.body.classList.add('metro-in-game');
            document.body.classList.remove('metro-cursor-visible');
            if (!this.isPointerLocked && (this.state === 'player_free' || this.state.startsWith('intro_') || this.isSitting)) {
                try {
                    const p = this.renderer.domElement.requestPointerLock?.();
                    if (p && typeof (p as any).catch === 'function') {
                        (p as any).catch(() => {});
                    }
                } catch (_) {}
            }
        }
    }

    // --- Center Reticle / Dot Interaction Raycast Detection ---
    public updateReticleAim() {
        const crosshair = document.getElementById('hud-crosshair');
        const prompt = document.getElementById('crosshair-prompt');
        const promptText = document.getElementById('crosshair-prompt-text');

        if (this.state !== 'player_free' && !this.isSitting) {
            this.aimedInteractable = null;
            if (crosshair) crosshair.classList.remove('active');
            if (prompt) prompt.style.display = 'none';
            return;
        }

        const isEt = this.lang === 'et';

        if (this.isSitting) {
            this.aimedInteractable = 'stand';
            if (crosshair) crosshair.classList.add('active');
            if (prompt && promptText) {
                promptText.innerText = isEt ? 'Tõuse püsti / Stand Up' : 'Stand Up';
                prompt.style.display = 'block';
            }
            return;
        }

        // Camera forward direction vector
        const camDir = new THREE.Vector3(0, 0, -1).applyEuler(this.cameraEuler);
        const playerHeadPos = new THREE.Vector3(this.playerPos.x, this.playerPos.y, this.playerPos.z);
        let foundAim: 'inspectable' | 'keypad' | 'shop' | 'seat' | null = null;
        let text = '';

        // 1. Inspectable Note / Ticket / Clue / Keypad
        if (this.currentCarriage?.inspectableItem) {
            const itemPos = this.currentCarriage.inspectableItem.position;
            const toItem = itemPos.clone().sub(playerHeadPos);
            const dist = toItem.length();
            if (dist < 5.5) {
                const toItemDir = toItem.clone().normalize();
                const dot3D = camDir.dot(toItemDir);
                const camDir2D = new THREE.Vector2(camDir.x, camDir.z).normalize();
                const toItem2D = new THREE.Vector2(toItem.x, toItem.z).normalize();
                const dot2D = camDir2D.dot(toItem2D);

                if (dot3D > 0.55 || dot2D > 0.70) {
                    if (this.currentCarriage.hasKeypad) {
                        foundAim = 'keypad';
                        text = isEt ? 'Sisesta kood (Keypad)' : 'Enter Code (Keypad)';
                    } else {
                        foundAim = 'inspectable';
                        const clue = this.currentCarriage.inspectableText;
                        const title = isEt ? clue?.titleEt || 'Uuri piletit / vihjet' : clue?.titleEn || 'Inspect Note / Ticket';
                        text = title;
                    }
                }
            }
        }

        // 2. Golden Shop Counter in Carriage 100
        if (!foundAim && this.currentCarIndex === 100) {
            const counterPos = new THREE.Vector3(0, 1.0, 1.5);
            const toCounter = counterPos.clone().sub(playerHeadPos);
            const dist = toCounter.length();
            if (dist < 4.5) {
                const toCounterDir = toCounter.clone().normalize();
                const dot = camDir.dot(toCounterDir);
                if (dot > 0.70) {
                    foundAim = 'shop';
                    text = isEt ? 'Ava Kuldne Pood (Golden Shop)' : 'Open Golden Shop';
                }
            }
        }

        // 3. Seats / Benches (Only aim at empty seat cushions, not occupied by passengers)
        if (!foundAim && !this.isSitting) {
            const leftSeatPos = new THREE.Vector3(-1.1, 0.55, this.playerPos.z);
            const rightSeatPos = new THREE.Vector3(1.1, 0.55, this.playerPos.z);
            const toLeft = leftSeatPos.clone().sub(playerHeadPos);
            const toRight = rightSeatPos.clone().sub(playerHeadPos);
            const dotL = camDir.dot(toLeft.clone().normalize());
            const dotR = camDir.dot(toRight.clone().normalize());

            const isPassengerNearLeft = this.currentCarriage?.passengers?.some(p => Math.abs(p.seatPos.x - (-1.1)) < 0.4 && Math.abs(p.seatPos.z - this.playerPos.z) < 0.85);
            const isPassengerNearRight = this.currentCarriage?.passengers?.some(p => Math.abs(p.seatPos.x - 1.1) < 0.4 && Math.abs(p.seatPos.z - this.playerPos.z) < 0.85);

            if ((dotL > 0.70 && toLeft.length() < 3.2 && !isPassengerNearLeft) || (dotR > 0.70 && toRight.length() < 3.2 && !isPassengerNearRight)) {
                foundAim = 'seat';
                text = isEt ? 'Istu toolile' : 'Sit Down';
            }
        }

        // 4. Kuulja Circuit Switches in Carriage 200 (Station Platform)
        if (!foundAim && this.currentCarIndex === 200 && this.kuuljaSwitches.length > 0) {
            for (let i = 0; i < this.kuuljaSwitches.length; i++) {
                const sw = this.kuuljaSwitches[i];
                if (sw.activated) continue;
                const toSw = sw.mesh.position.clone().sub(playerHeadPos);
                const dist = toSw.length();
                if (dist < 4.0) {
                    const toSwDir = toSw.clone().normalize();
                    const dot = camDir.dot(toSwDir);
                    if (dot > 0.65) {
                        foundAim = 'switch';
                        this.aimedSwitchIndex = i;
                        text = isEt ? `⚡ Aktiveeri lüliti ${i + 1}/3` : `⚡ Activate Switch ${i + 1}/3`;
                        break;
                    }
                }
            }
        }

        this.aimedInteractable = foundAim;

        if (foundAim) {
            if (crosshair) crosshair.classList.add('active');
            if (prompt && promptText) {
                promptText.innerText = text;
                prompt.style.display = 'block';
            }
        } else {
            if (crosshair) crosshair.classList.remove('active');
            if (prompt) prompt.style.display = 'none';
        }
    }

    private toggleFlashlight() {
        this.flashlightOn = !this.flashlightOn;
        if (this.flashlight) {
            this.flashlight.intensity = this.flashlightOn ? 2.5 : 0;
        }
        metroAudio.playFlashlightClick();
        this.updateHotbarUI();
    }

    public checkInteractions() {
        if (!this.currentCarriage || (this.state !== 'player_free' && !this.isSitting)) return;

        // User requirement: "se pilet või asjad tulevad sulle ette siis kui sse täpp mis on su ees on selle peal ja vajutad e"
        if (this.isSitting) {
            this.standUp();
            return;
        }

        if (this.aimedInteractable === 'switch') {
            if (this.aimedSwitchIndex >= 0 && this.aimedSwitchIndex < this.kuuljaSwitches.length) {
                this.activateKuuljaSwitch(this.aimedSwitchIndex);
                this.aimedSwitchIndex = -1;
            }
            return;
        }

        if (this.aimedInteractable === 'inspectable') {
            const dbClue = CLUES_DATABASE.find(c => c.carIndex === this.currentCarIndex && !this.collectedClues.some(cc => cc.id === c.id));
            if (dbClue) {
                this.openClueInspection(dbClue);
                return;
            }
            if (this.currentCarIndex === 28) this.hasUnlockedCarriage28WithClue = true;
            if (this.currentCarIndex === 78) this.hasUnlockedCarriage78WithHint = true;
            this.openLoreModal();
            return;
        }


        if (this.aimedInteractable === 'keypad') {
            this.openKeypadModal();
            return;
        }

        if (this.aimedInteractable === 'shop') {
            this.openGoldenShopModal();
            return;
        }

        if (this.aimedInteractable === 'seat') {
            this.sitDown();
            return;
        }
    }

    public openLoreModal() {
        if (!this.currentCarriage || !this.currentCarriage.inspectableText) return;
        this.state = 'inspecting';
        this.cluesFound++;

        const isEt = this.lang === 'et';
        const modal = document.getElementById('lore-modal');
        const title = document.getElementById('lore-title');
        const desc = document.getElementById('lore-desc');
        if (modal && title && desc) {
            title.innerText = isEt ? this.currentCarriage.inspectableText.titleEt : this.currentCarriage.inspectableText.titleEn;
            desc.innerText = isEt ? this.currentCarriage.inspectableText.descEt : this.currentCarriage.inspectableText.descEn;
            modal.style.display = 'flex';
        }
        metroAudio.playItemInspect();
        this.updateCursorState();
    }

    private openKeypadModal() {
        this.state = 'keypad';
        const modal = document.getElementById('keypad-modal');
        const codeDisplay = document.getElementById('keypad-input');
        if (modal && codeDisplay) {
            (codeDisplay as HTMLInputElement).value = '';
            modal.style.display = 'flex';
        }
        this.updateCursorState();
    }

    private submitKeypad() {
        const input = document.getElementById('keypad-input') as HTMLInputElement;
        const modal = document.getElementById('keypad-modal');
        if (input && modal && this.currentCarriage) {
            if (input.value === '1987' || input.value === this.currentCarriage.puzzleCode) {
                metroAudio.playKeypadBeep(true);
                this.currentCarriage.puzzleSolved = true;
                modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
                this.showThought('Kood õige! Uks avanes.', 'Code correct! The door unlocked.');
            } else {
                metroAudio.playKeypadBeep(false);
                input.value = '';
                this.showThought('Vale kood. Proovi uuesti.', 'Wrong code. Try again.');
            }
        }
    }

    public openOwnerTeleportModal() {
        if (!this.isOwner) return;
        const modal = document.getElementById('owner-teleport-modal');
        const errEl = document.getElementById('owner-teleport-error');
        const input = document.getElementById('owner-teleport-input') as HTMLInputElement;
        if (errEl) errEl.style.display = 'none';
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 60);
        }
        if (modal) modal.style.display = 'flex';
        this.state = 'inspecting';
        this.updateCursorState();
        this.updateHotbarUI();
    }

    public closeOwnerTeleportModal() {
        const modal = document.getElementById('owner-teleport-modal');
        if (modal) modal.style.display = 'none';
        if (this.state === 'inspecting') {
            this.state = 'player_free';
        }
        this.updateCursorState();
        this.updateHotbarUI();
    }

    public teleportToCarriage(carNum: number): boolean {
        if (!this.isOwner) return false;

        // Teleport supports all carriages from 0 to 300
        if (isNaN(carNum) || carNum < 0 || carNum > 300) {
            const errEl = document.getElementById('owner-teleport-error');
            if (errEl) {
                errEl.innerText = this.lang === 'et' ? '❌ Sellist vagunit ei ole' : '❌ No such carriage exists';
                errEl.style.display = 'block';
            }
            metroAudio.playError();
            this.showThought(
                'Sellist vagunit ei ole.',
                'No such carriage exists.'
            );
            return false;
        }


        // If in intro, skip to active gameplay
        if (this.state === 'intro_station' || this.state === 'intro_boarding' || this.state === 'intro_inside') {
            this.skipIntro();
        }

        // Teleport to requested carriage
        this.loadCarriage(carNum, 'right');
        this.playerPos.set(0, 1.6, -6.5);
        this.cameraEuler.y = 0;
        this.state = 'player_free';
        metroAudio.playTeleport();

        this.closeOwnerTeleportModal();
        this.showThought(
            `⚡ Teleporditud vagunisse ${carNum}!`,
            `⚡ Teleported to carriage ${carNum}!`
        );
        return true;
    }

    // --- Animation & Physics Loop ---

    private animate() {
        const delta = Math.min(this.clock.getDelta(), 0.1);

        // 0. Intro Cinematic Animations
        if (this.state === 'intro_station' && this.currentCarriage) {
            // Train pulls smoothly into station from z = -65 to 0
            this.currentCarriage.group.position.z = THREE.MathUtils.lerp(this.currentCarriage.group.position.z, 0, delta * 1.5);
        } else if (this.state === 'intro_boarding') {
            // Camera walks smoothly from platform (3.8, 1.6, -3.5) through doors (1.7, 1.6, 0) into aisle (0, 1.6, 0)
            this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, 0, delta * 2.2);
            this.playerPos.z = THREE.MathUtils.lerp(this.playerPos.z, 0, delta * 2.2);
            if (!this.isMouseDown && !this.moveKeys['ArrowLeft'] && !this.moveKeys['ArrowRight'] && !this.moveKeys['KeyQ']) {
                this.cameraEuler.y = THREE.MathUtils.lerp(this.cameraEuler.y, -Math.PI / 2, delta * 2.0);
            }
        }

        // Side sliding doors animation
        const openOffset = this.introSideDoorsOpen ? 0.95 : 0;
        this.sideDoorMeshes.forEach(door => {
            const targetZ = door.baseZ + door.dir * openOffset;
            door.mesh.position.z = THREE.MathUtils.lerp(door.mesh.position.z, targetZ, delta * 6);
        });

        // 1. Move passing tunnel for sense of forward subway speed or reverse anomaly
        if (this.reverseTunnelTimer > 0) {
            this.reverseTunnelTimer -= delta;
            this.tunnelOffsetZ -= (this.trainSpeed * 2.0) * delta;
            this.tunnelGroup.position.z = (this.tunnelOffsetZ % 12);
        } else if (this.trainSpeed > 0) {
            this.tunnelOffsetZ += this.trainSpeed * delta;
            this.tunnelGroup.position.z = (this.tunnelOffsetZ % 12);
        }

        // 2. Realistic Passenger Breathing, Awareness & Lifelike Animation Logic
        if (this.currentCarriage) {
            const time = performance.now() * 0.0015;
            this.currentCarriage.passengers.forEach((p, pIdx) => {
                // Subtle rhythmic chest breathing expansion
                const breath = Math.sin(time * 2.2 + pIdx * 1.6) * 0.008;
                p.body.position.y = 0.32 + breath;
                p.body.scale.set(1.0 + breath * 0.8, 1.0 + breath * 1.2, 1.0 + breath * 0.8);

                const distToPlayer = this.playerPos.distanceTo(p.group.position);

                if (p.isCreepy || this.currentCarIndex === 83 || this.currentCarIndex === 71) {
                    if (distToPlayer < 6.5) {
                        // Creepy staring anomaly: head locks unblinkingly onto player
                        const angle = Math.atan2(this.playerPos.x - p.group.position.x, this.playerPos.z - p.group.position.z);
                        p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, angle - p.group.rotation.y, delta * 5);
                    } else {
                        p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, 0, delta * 3);
                    }
                } else if (distToPlayer < 3.2 && this.playerPos.z > p.group.position.z - 2.5 && this.playerPos.z < p.group.position.z + 2.5) {
                    // Natural commuter glance as player walks down the aisle
                    const targetAngle = Math.atan2(this.playerPos.x - p.group.position.x, this.playerPos.z - p.group.position.z) - p.group.rotation.y;
                    const clampedAngle = THREE.MathUtils.clamp(targetAngle, -0.65, 0.65);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, clampedAngle, delta * 3.5);
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, 0.05, delta * 3.5);
                } else if (p.animType === 'phone') {
                    // Looking at phone with subtle screen glow and thumb scrolling
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, 0.28 + Math.sin(time * 1.5 + pIdx) * 0.03, delta * 4);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, (p.seatPos.x > 0 ? -1 : 1) * 0.06, delta * 4);
                    if (p.thumbRight) {
                        p.thumbRight.position.z = 0.27 + Math.sin(time * 5.0 + pIdx) * 0.005;
                    }
                } else if (p.animType === 'look_window') {
                    // Gazing out the subway window watching passing tunnel lights
                    const windowAngle = (p.seatPos.x > 0 ? 1 : -1) * (0.82 + Math.sin(time * 0.8 + pIdx) * 0.05);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, windowAngle, delta * 3);
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, -0.04, delta * 3);
                }

                // Headphone wearer subtle rhythm head nod
                if (p.headphones) {
                    p.head.rotation.x += Math.sin(time * 4.2 + pIdx) * 0.025;
                }
            });
        }

        // 2b. Collectible Coins Rotation & Proximity Collection Loop
        for (let i = this.collectibleCoins.length - 1; i >= 0; i--) {
            const coin = this.collectibleCoins[i];
            if (!coin.collected) {
                coin.mesh.rotation.z += delta * 3.5;
                const dist = this.playerPos.distanceTo(coin.mesh.position);
                if (dist < 1.35) {
                    coin.collected = true;
                    this.addCoins(coin.value);
                    metroAudio.playCoinPickup();
                    this.currentCarriage?.group.remove(coin.mesh);
                    this.collectibleCoins.splice(i, 1);
                    this.showThought(`+${coin.value} 🪙 Metro Coin!`, `+${coin.value} 🪙 Metro Coin!`, 1500);
                }
            }
        }

        // 2c. Clue Detector (Vihjeandur) Radar Proximity Ping
        if (this.clueDetectorActive || this.equippedItem === 'clue_detector') {
            if (this.currentCarriage?.inspectableItem) {
                const dist = this.playerPos.distanceTo(this.currentCarriage.inspectableItem.position);
                if (dist < 6.0) {
                    this.radarPingTimer -= delta;
                    const pingInterval = Math.max(0.25, dist * 0.28);
                    if (this.radarPingTimer <= 0) {
                        this.radarPingTimer = pingInterval;
                        metroAudio.playRadarPing();
                    }
                }
            }
        }

        // 3. Ghost Stalker Creeping Logic in Carriage 9
        if (this.stalkerActive && this.stalkerMesh) {
            _scratchV1.subVectors(this.stalkerMesh.position, this.playerPos).normalize();
            _scratchV2.set(0, 0, -1).applyEuler(this.cameraEuler);
            const dot = _scratchV2.dot(_scratchV1);

            if (dot < 0.2) {
                // Looking away -> Stalker creeps closer!
                this.stalkerDistZ -= 2.6 * delta;
                this.stalkerMesh.position.z = this.stalkerDistZ;
                metroAudio.playHeartbeat();
            }

            // When stalker gets close or player advances -> Stalker dissolves & triggers Void Shadow Hands!
            if (this.playerPos.z > 3.0 || this.stalkerDistZ < this.playerPos.z + 2.0) {
                this.scene.remove(this.stalkerMesh);
                this.stalkerActive = false;
                this.stalkerMesh = null;
                this.triggerShadowHandsEvent();
            }
        }

        // 3b. Ultra-Realistic Shadow Hand Reaching & 10s Timer Dismissal
        if (this.shadowHandsActive && this.state === 'player_free') {
            this.shadowHandsTimer -= delta;
            if (this.shadowHandsTimer <= 0) {
                this.dismissShadowHands();
            } else {
                this.shadowHandsAnimTimer += delta * 4.5;
                this.shadowHandsGroups.forEach((hand) => {
                    const wave = Math.sin(this.shadowHandsAnimTimer);
                    hand.position.y = 1.35 + wave * 0.14;
                    hand.rotation.x = Math.sin(this.shadowHandsAnimTimer * 0.7) * 0.22;
                    hand.rotation.y = Math.cos(this.shadowHandsAnimTimer * 0.5) * 0.28;

                    // Animate articulated fingers flexing and grasping
                    hand.children.forEach(child => {
                        if (child.name === 'finger') {
                            child.rotation.z = Math.sin(this.shadowHandsAnimTimer * 2.0) * 0.28;
                            child.rotation.x = Math.cos(this.shadowHandsAnimTimer * 1.6) * 0.18;
                        }
                    });

                    // Reach inwards toward center aisle
                    const side = hand.position.x > 0 ? 1 : -1;
                    hand.position.x = (side * 1.68) - (side * (0.65 + wave * 0.35));

                    // Ultra-sensitive collision check: even slight contact or entering reach zone triggers instant death
            const handWorldPos = hand.position;
                    const distToHand = this.playerPos.distanceTo(handWorldPos);
                    const nearDoorWay = (side > 0 ? this.playerPos.x > 0.25 : this.playerPos.x < -0.25) && Math.abs(this.playerPos.z - handWorldPos.z) < 2.0;

                    if (distToHand < 1.75 || nearDoorWay) {
                        this.triggerDraggedDeath(side);
                    }
                });
            }
        }

        // 3c. Dragged Out Death Cutscene Animation
        if (this.state === 'dragged_death') {
            this.deathTimer += delta;
            // Drag violently sideways out through the open door into the dark rushing tunnel
            const targetX = this.deathDragSide * 4.5;
            this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, targetX, delta * 5.0);
            this.playerPos.y = THREE.MathUtils.lerp(this.playerPos.y, 0.4, delta * 2.5);

            // Camera violent spin and tilt
            this.cameraEuler.z += delta * (this.deathDragSide * 5.0);
            this.cameraEuler.x += delta * 2.8;

            if (this.deathTimer > 1.6) {
                this.openDeathModal();
            }
        }

        if (this.shadowRushCountdown > 0) {
            this.shadowRushCountdown = Math.max(0, this.shadowRushCountdown - delta);
        }

        // 3d. Carriage 20 Shadow Creature (Must Olend) Rush Logic & Seating Survival Check
        if (this.shadowRushActive && this.shadowEntityMesh) {
            this.shadowEntityMesh.position.z += this.shadowRushSpeed * delta;

            // Violent camera vibration / shake when creature rushes closer
            const distToPlayerZ = Math.abs(this.shadowEntityMesh.position.z - this.playerPos.z);
            if (distToPlayerZ < 7.0) {
                const shakeIntensity = (1.0 - distToPlayerZ / 7.0) * 0.09;
                this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
                this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            }

            // Creature strikes player zone!
            if (distToPlayerZ < 2.0 && this.state !== 'game_over' && this.state !== 'dragged_death') {
                if (!this.isSitting) {
                    // Player was STANDING -> Instant Death!
                    this.state = 'game_over';
                    metroAudio.playJumpScareStinger();
                    const deathModal = document.getElementById('death-modal');
                    const dTitle = document.getElementById('death-title');
                    const dReason = document.getElementById('death-reason');
                    if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
                    if (dReason) {
                        dReason.textContent = this.lang === 'et'
                            ? 'Must vari pühkis su minema! Sa seisid püsti — sa oleksid pidanud toolile istuma!'
                            : 'The shadow entity swept you away! You were standing — you should have sat on a seat!';
                    }
                    if (deathModal) deathModal.style.display = 'flex';
                }
            }

            // Creature finished dashing out of the carriage into darkness
            if (Math.abs(this.shadowEntityMesh.position.z) > 10.5) {
                this.shadowRushActive = false;
                this.scene.remove(this.shadowEntityMesh);
                this.shadowEntityMesh = null;
                this.trainSpeed = 60;

                if (this.state !== 'game_over') {
                    this.showThought(
                        'See läks napilt... Istumine päästis mu elu! Must vari kadus pimedusse ja uksed avanesid. Võid nüüd püsti tõusta.',
                        'That was close... Sitting down saved my life! The shadow vanished into darkness and doors unlocked. You can stand up now.',
                        4500
                    );
                }
            }
        }

        // 3d. Vagun 200 Kuulja Boss Stalking & Hearing AI on Station Platform
        if (this.currentCarIndex === 200 && this.kuuljaBossGroup && this.state === 'player_free') {
            const kuuljaPos = this.kuuljaBossGroup.position;
            const distToPlayer = kuuljaPos.distanceTo(this.playerPos);

            // Touching Kuulja / kuulmispahalane: ALWAYS causes instant death!
            if (distToPlayer < 1.6 && this.state === 'player_free') {
                metroAudio.playShadowRushScreech();
                this.triggerGameOver(
                    'Kuulja tabas sind! Kuulmispahalase puudutus oli surmav.',
                    'The Listener caught you! Touching the hearing villain was fatal.'
                );
                return;
            }

            // Subtle eerie breathing animation
            const kTime = performance.now() * 0.002;
            this.kuuljaBossGroup.position.y = Math.sin(kTime * 3) * 0.05;

            // Kuulja hears footsteps if player moves loudly (not crouching) on the platform
            const isPlayerMovingLoudly = _moveDir.lengthSq() > 0 && !this.isCrouching && this.playerPos.x > 1.4;

            if (this.kuuljaHearingAlert) {
                // Rushing to switch sound
                const moveSpeed = 4.2 * delta;
                kuuljaPos.x = THREE.MathUtils.lerp(kuuljaPos.x, this.kuuljaTargetPos.x, moveSpeed * 0.8);
                kuuljaPos.z = THREE.MathUtils.lerp(kuuljaPos.z, this.kuuljaTargetPos.z, moveSpeed);
                this.kuuljaBossGroup.lookAt(this.kuuljaTargetPos.x, this.kuuljaBossGroup.position.y, this.kuuljaTargetPos.z);
            } else if (isPlayerMovingLoudly) {
                // Stalking toward player footsteps
                const moveSpeed = 2.4 * delta;
                kuuljaPos.x = THREE.MathUtils.lerp(kuuljaPos.x, this.playerPos.x, moveSpeed * 0.7);
                kuuljaPos.z = THREE.MathUtils.lerp(kuuljaPos.z, this.playerPos.z, moveSpeed);
                this.kuuljaBossGroup.lookAt(this.playerPos.x, this.kuuljaBossGroup.position.y, this.playerPos.z);

                if (distToPlayer < 1.4) {
                    metroAudio.playShadowRushScreech();
                    this.triggerGameOver(
                        'Kuulja kuulis su samme ja ründas pimedusest! Kükita [C], et liikuda jaamal hääletult.',
                        'The Listener heard your footsteps! Crouch [C] to sneak silently across the platform.'
                    );
                }
            } else {
                // Idle patrol along platform
                const patrolZ = Math.sin(kTime * 0.5) * 8.0;
                kuuljaPos.z = THREE.MathUtils.lerp(kuuljaPos.z, patrolZ, delta * 0.8);
                kuuljaPos.x = THREE.MathUtils.lerp(kuuljaPos.x, 5.5, delta * 0.8);
            }

            // Kuulja Wall Collisions: Kuulja cannot enter or clip through walls
            if (kuuljaPos.x > 1.8) {
                // Platform boundaries: back wall at x = 9.5, train boundary at x = 2.0, end walls at z = +/- 16.0
                kuuljaPos.x = Math.max(2.2, Math.min(8.8, kuuljaPos.x));
                kuuljaPos.z = Math.max(-14.8, Math.min(14.8, kuuljaPos.z));

                // Platform support pillars collision (x = 5.2, z in [-12, -6, 0, 6, 12])
                const pillarsZ = [-12, -6, 0, 6, 12];
                for (const pz of pillarsZ) {
                    const dx = kuuljaPos.x - 5.2;
                    const dz = kuuljaPos.z - pz;
                    const distSq = dx * dx + dz * dz;
                    if (distSq < 0.64) {
                        const dist = Math.sqrt(distSq) || 0.001;
                        kuuljaPos.x = 5.2 + (dx / dist) * 0.8;
                        kuuljaPos.z = pz + (dz / dist) * 0.8;
                    }
                }
            } else {
                // Inside train car threshold
                kuuljaPos.x = Math.max(-1.1, Math.min(1.8, kuuljaPos.x));
                kuuljaPos.z = Math.max(-1.5, Math.min(1.5, kuuljaPos.z));
            }
        }

        // 4. Keyboard Camera Turning (Arrows & Q/E)
        if (this.state === 'player_free' || this.state.startsWith('intro_') || this.isSitting) {
            const rotSpeed = 1.9;
            if (this.moveKeys['ArrowLeft'] || this.moveKeys['KeyQ']) {
                this.cameraEuler.y += rotSpeed * delta;
            }
            if (this.moveKeys['ArrowRight']) {
                this.cameraEuler.y -= rotSpeed * delta;
            }
            if (this.moveKeys['ArrowUp']) {
                this.cameraEuler.x += rotSpeed * 0.75 * delta;
            }
            if (this.moveKeys['ArrowDown']) {
                this.cameraEuler.x -= rotSpeed * 0.75 * delta;
            }
            this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
        }

        // 5. Player Physics & Movement (when player_free and not sitting)
        if (this.state === 'player_free' && !this.isSitting) {
            let baseSpeed = (this.speedBoostActive || this.equippedItem === 'speed_boost') ? 5.4 : 3.6;
            if (this.isCrouching) {
                baseSpeed *= 0.65; // Sneak movement speed while crouched
                this.playerPos.y = 0.95;
            } else if (this.currentCarIndex !== 217 || !this.sewerWaterSubmerged) {
                this.playerPos.y = 1.6;
            }

            _moveDir.set(0, 0, 0);

            if (this.moveKeys['KeyW']) _moveDir.z -= 1;
            if (this.moveKeys['KeyS']) _moveDir.z += 1;
            if (this.moveKeys['KeyA']) _moveDir.x -= 1;
            if (this.moveKeys['KeyD']) _moveDir.x += 1;

            if (_moveDir.lengthSq() > 0) {
                _moveDir.normalize();
                _moveDir.applyAxisAngle(_upAxis, this.cameraEuler.y);

                this.playerPos.x += _moveDir.x * baseSpeed * delta;
                this.playerPos.z += _moveDir.z * baseSpeed * delta;

                // Train carriage boundary collision & platform exploration
                if (this.currentCarIndex === 200) {
                    if (this.playerPos.x > 1.4) {
                        // Player is outside on the station platform
                        this.playerPos.x = Math.max(1.4, Math.min(9.2, this.playerPos.x));
                        this.playerPos.z = Math.max(-15.5, Math.min(15.5, this.playerPos.z));
                    } else {
                        // Player is inside the train
                        if (Math.abs(this.playerPos.z) <= 1.8) {
                            // In doorway threshold: can step out (x up to 9.2) or remain inside (x down to -1.4)
                            this.playerPos.x = Math.max(-1.4, Math.min(9.2, this.playerPos.x));
                        } else {
                            // Inside main car body
                            this.playerPos.x = Math.max(-1.4, Math.min(1.4, this.playerPos.x));
                        }
                        this.playerPos.z = Math.max(-8.5, Math.min(8.5, this.playerPos.z));
                    }
                } else if (this.currentCarIndex >= 201) {
                    this.playerPos.x = Math.max(-5.0, Math.min(5.0, this.playerPos.x));
                } else {
                    this.playerPos.x = Math.max(-1.4, Math.min(1.4, this.playerPos.x));
                }

                // Head bob & footsteps (footsteps silent while crouching)
                this.headBobTimer += delta * (baseSpeed > 4 ? 16 : 12);
                if (!this.isCrouching) {
                    this.stepTimer += delta;
                    if (this.stepTimer > (baseSpeed > 4 ? 0.32 : 0.48)) {
                        this.stepTimer = 0;
                        metroAudio.playFootstep();
                    }
                }
            }

            // Door Navigation & Locked Door Checks
            const now = performance.now();

            // Shadow Event Trap Check (Vagun 20, 25, 32, 48, 50, 57, 63, 70, 75, 82, 90, 97)
            // User requirement: "kui tuleb se koll 20 uks ja 25 jne tuleb siis ei saa nii kaua minna teise vagunisse ehk oled kinni kuni se laul läbi saab"
            if (this.isShadowEventActive() && Math.abs(this.playerPos.z) > 7.5) {
                this.playerPos.z = this.playerPos.z > 0 ? 7.4 : -7.4;
                if (now - this.lastLockedDoorSoundTime > 1200) {
                    this.lastLockedDoorSoundTime = now;
                    metroAudio.playDoorLocked();
                    this.showThought(
                        '⚠️ Uksed on anomaalia ajal lukus! Oled vagunis kinni, kuni must vari ja laul on möödas! ISTU TOOLILE!',
                        '⚠️ Doors are locked during the anomaly! You are trapped until the shadow creature and song subside! SIT DOWN!'
                    );
                }
                return;
            }

            // Carriage 64 Key Unlock Door Check
            if (this.currentCarIndex === 64 && Math.abs(this.playerPos.z) > 8.0) {
                if (this.equippedItem === 'key' || this.inventory['key']) {
                    if (!this.hasUnlockedCarriage64WithKey) {
                        this.hasUnlockedCarriage64WithKey = true;
                        metroAudio.playDoorLatch();
                        this.showThought('🗝️ Võti keeras luku lahti! Uks avanes.', '🗝️ Key unlocked the bulkhead door!');
                    }
                } else if (!this.hasUnlockedCarriage64WithKey) {
                    this.playerPos.z = this.playerPos.z > 0 ? 7.6 : -7.6;
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought('Uks on lukus! Vajad võtit (Vagun 63), et see avada.', 'Door is locked! You need the key (Carriage 63) to open it.');
                    }
                    return;
                }
            }

            if (this.branchDirection === 'right') {
                // Front Door (+Z) -> Open Next Carriage
                if (this.playerPos.z > 8.8) {
                    this.loadCarriage(this.currentCarIndex + 1, 'right');
                }
                // Back Door (-Z) -> LOCKED Previous Carriage
                else if (this.playerPos.z < -7.8) {
                    this.playerPos.z = -7.6; // bounce back
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought(
                            'Uks on lukus. Tagasi eelmisesse vagunisse ei saa minna. Edasi liikumine on ainus võimalus.',
                            'The door is locked. You cannot return to the previous carriage. Moving forward is the only way.'
                        );
                    }
                }
            } else if (this.branchDirection === 'left') {
                // Back Door (-Z) -> Open Next Carriage
                if (this.playerPos.z < -8.8) {
                    this.loadCarriage(this.currentCarIndex + 1, 'left');
                }
                // Front Door (+Z) -> LOCKED Previous Carriage
                else if (this.playerPos.z > 7.8) {
                    this.playerPos.z = 7.6; // bounce back
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought(
                            'Uks on lukus. Tagasi eelmisesse vagunisse ei saa minna. Edasi liikumine on ainus võimalus.',
                            'The door is locked. You cannot return to the previous carriage. Moving forward is the only way.'
                        );
                    }
                }
            } else {
                // Undecided (Carriage 0 initial choice)
                if (this.playerPos.z > 8.8) {
                    this.loadCarriage(1, 'right');
                } else if (this.playerPos.z < -8.8) {
                    this.loadCarriage(1, 'left');
                }
            }

            this.playerPos.z = Math.max(-9.2, Math.min(9.2, this.playerPos.z));
        }

        // Glowing Shadow Eyes Animation (Pulsing / Breathing)
        if (this.shadowEyesGroup) {
            this.shadowEyesGroup.children.forEach((eyePair, idx) => {
                const pulse = Math.sin(this.headBobTimer * 2 + idx) * 0.12;
                eyePair.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
            });
        }

        // Shadow Villains AI & Combat Attack Logic (Carriage 31)
        if (this.shadowVillains.length > 0 && this.state === 'player_free' && !this.isSitting) {
            this.shadowVillains.forEach(v => {
                const toPlayer = this.playerPos.clone().sub(v.group.position);
                toPlayer.y = 0;
                const dist = toPlayer.length();

                v.group.lookAt(this.playerPos.x, v.group.position.y, this.playerPos.z);

                if (dist > 1.3) {
                    const moveStep = toPlayer.normalize().multiplyScalar(1.5 * delta);
                    v.group.position.add(moveStep);
                }

                // Attack player when in melee range
                v.attackCooldown -= delta;
                if (dist <= 1.8 && v.attackCooldown <= 0) {
                    v.attackCooldown = 1.6;
                    this.takePlayerDamage(20, 'Pahalane ründas sind ja võttis sult elud!', 'Shadow villain struck you and dealt damage!');
                }
            });
        }

        // Sword Swing Animation
        if (this.isSwordSwinging && this.heldItemMesh && this.equippedItem === 'sword') {
            this.swordSwingTimer -= delta;
            const progress = 1.0 - (this.swordSwingTimer / 0.28);
            const swingAngle = Math.sin(progress * Math.PI);
            this.heldItemMesh.rotation.x = Math.PI / 4 + swingAngle * 0.95;
            this.heldItemMesh.rotation.z = -swingAngle * 0.7;
            if (this.swordSwingTimer <= 0) {
                this.isSwordSwinging = false;
                this.heldItemMesh.rotation.x = Math.PI / 4;
                this.heldItemMesh.rotation.z = 0;
            }
        }

        // --- Ajapahalane (Time Villain) Timer & Chase Logic ---
        // Increment carriage stay timer when player_free and not in special carriages
        if (this.state === 'player_free' && this.currentCarIndex > 0 && this.currentCarIndex !== 100 && this.currentCarIndex !== 200 && !this.timeVillainActive && !this.timeVillainTriggeredThisCarriage) {
            this.carriageStayTimer += delta;

            // Deterministic event: trigger when staying >= 20 seconds, unless other anomalies are active
            if (this.carriageStayTimer >= 20 && !this.isShadowEventActive() && !this.shadowHandsActive) {
                this.activateTimeVillain();
                // Prevent re-triggering in the same carriage
                this.timeVillainTriggeredThisCarriage = true;
            }
        }

        // Time Villain countdown update
        if (this.timeVillainActive && this.state === 'player_free') {
            this.timeVillainCountdown -= delta;

            // Update countdown display
            const countdownEl = document.getElementById('time-villain-countdown');
            if (countdownEl) {
                const seconds = Math.max(0, Math.ceil(this.timeVillainCountdown));
                countdownEl.textContent = `⏱️ ${seconds}`;
            }

            // Camera shake effect (violent shaking)
            this.timeVillainShakeOffset.set(
                (Math.random() - 0.5) * 0.08,
                (Math.random() - 0.5) * 0.06,
                (Math.random() - 0.5) * 0.04
            );

            // Time Villain slowly chases the player
            if (this.timeVillainGroup) {
                this.timeVillainGroup.lookAt(this.playerPos.x, 1.6, this.playerPos.z);
                const toPlayer = this.playerPos.clone().sub(this.timeVillainGroup.position);
                toPlayer.y = 0;
                const dist = toPlayer.length();
                if (dist > 1.0) {
                    const chaseSpeed = 1.8 * delta;
                    this.timeVillainGroup.position.add(toPlayer.normalize().multiplyScalar(chaseSpeed));
                }
            }

            // Time's up — kill player
            if (this.timeVillainCountdown <= 0) {
                this.timeVillainKillPlayer();
            }
        } else {
            this.timeVillainShakeOffset.set(0, 0, 0);
        }

        // 6. Update Camera & Held Item Sway
        const headBobOffset = Math.sin(this.headBobTimer) * 0.04;
        this.camera.position.set(
            this.playerPos.x + this.timeVillainShakeOffset.x,
            this.playerPos.y + (this.state === 'player_free' ? headBobOffset : 0) + this.timeVillainShakeOffset.y,
            this.playerPos.z + this.timeVillainShakeOffset.z
        );
        this.camera.quaternion.setFromEuler(this.cameraEuler);

        // Update Center Reticle Raycast Aim
        this.updateReticleAim();

        // Render Frame
        this.renderer.render(this.scene, this.camera);
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Instantiate and expose globally for Playard tests
window.addEventListener('DOMContentLoaded', () => {
    (window as any).__metroAudio = metroAudio;
    (window as any).__lastMetro = new LastMetroGame();
});
