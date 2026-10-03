import { ShopItem, ClueItem } from './types';

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
