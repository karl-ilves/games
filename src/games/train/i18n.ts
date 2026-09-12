import { getCurrentUserProfile, isPlayardOwner } from '../../auth';
import { Station, TrainDef } from './types';

// Access Gating Check
export function checkOwnerAccess(): boolean {
    const vipOverlay = document.getElementById('vip-restricted-overlay');
    if (vipOverlay) {
        vipOverlay.style.display = 'none';
    }
    return true;
}

// User Profile & Language Determination
export function checkIsOwner(): boolean {
    const userProf = getCurrentUserProfile();
    return isPlayardOwner(userProf?.email);
}

// Dual Localization Dictionary (Estonian for Playard Owner, English for Everyone Else)
export const I18N = {
    et: {
        gameTitle: 'RONGIMÄNG',
        ownerPill: '👑 PLAYARD OWNER',
        depotBtn: 'Sõiduki Valik (Rongid & Metrood)',
        tabTrains: '🚂 Rongid',
        tabMetros: '🚇 Metrood',
        targetStation: '🎯 Sihtjaam:',
        passengers: '👥 Reisijaid:',
        moneyTooltip: 'Rongimängu oma raha (teenid +50€ iga jaamaga)',
        camModes: ['🎥 Tagaajam (3D)', '🎥 Kabiin (Juht)', '🎥 Kinovaade', '🎥 Pealtvaade'],
        weatherModes: ['☀️ Päev', '🌅 Loojang', '🌙 Öö'],
        sound: '🔊 Heli',
        soundMuted: '🔇 Vaigistatud',
        help: '❓ Abi',
        hub: '🏠 Hub',
        approachingJunction: 'Lähened pöörmele:',
        switchTrackBtn: 'Vaheta Suunda (J / Tühik)',
        branchMain: '[PÕHILIIN]',
        branchMountain: '[MÄERING]',
        stationStopTitle: 'PEATUS JAAMAS',
        stationStopSubtext: 'Reisijate pealeminek ja kaubavahetus (+50 €)...',
        skippedTitle: 'SA JÄTSID PEATUSE VAHELE!',
        skippedDesc: (name: string) => `Jätsid vahele: "${name}". Sõit jätkub järgmise jaama poole!`,
        rewardTitle: (name: string) => `🎉 ${name.toUpperCase()} EDUKALT LÄBITUD!`,
        rewardDesc: (passengers: number) => `Reisijad (+${passengers} inimest) toimetati kohale. Teeni igal peatusel +50 € Rongiraha!`,
        rewardBtn: '🚂 JÄTKA SÕITU',
        rewardMoneyLabel: 'Teenitud Rongiraha:',
        depotTitle: 'Depoo: Rongid & Metrood',
        depotDesc: 'Vali oma rong või metroo ning ava uusi sõidukeid Rongiraha (+50€ jaamaga) või Yardidega (Yardid = 5x mänguraha)!',
        depotMoneyLabel: '🪙 Rongiraha:',
        depotYardLabel: '💎 Yardid:',
        depotStartDriving: '🚂 ALUSTA SÕITU',
        topSpeed: 'Tippkiirus:',
        accel: 'Kiirendus:',
        capacity: 'Mahutavus:',
        passengersUnit: 'reisijat',
        free: 'TASUTA',
        or: 'või',
        selected: '✅ VALITUD',
        chooseTrain: '▶️ VALI SÕIDUK',
        buyMoney: (price: number) => `🪙 OSTA (${price} €)`,
        buyYard: (price: number) => `💎 OSTA (${price} Y)`,
        boughtSuccessMoney: (name: string, price: number) => `🎉 Ostsid edukalt sõiduki "${name}" Rongiraha eest (${price} €)!`,
        boughtSuccessYard: (name: string, price: number) => `🎉 Ostsid edukalt sõiduki "${name}" Yardide eest (${price} Y)!`,
        notEnoughMoney: (price: number, cur: number) => `Sul pole piisavalt Rongiraha! Vajad ${price} € (sul on ${cur} €).`,
        notEnoughYards: (price: number, cur: number) => `Sul pole piisavalt Yarde! Vajad ${price} Y (praegu ${cur} Y).`,
        speedUnit: 'KM / H',
        throttleLabel: 'KIIRENDUS',
        btnPower: 'GAAS',
        btnBrake: 'PIDUR',
        btnHorn: 'VILE',
        mPower: 'GAAS',
        mBrake: 'PIDUR',
        mHorn: 'VILE',
        mSwitch: 'PÖÖRE',
        mCam: 'VAADE',
        mWeather: 'ILM',
        helpTitle: '🚂 Rongimäng - Juhtimisjuhised',
        helpContent: `
            <div><strong style="color: #00f2fe;">W / Nool Üles / [GAAS]:</strong> Kiirenda rongi/metrood edasi</div>
            <div><strong style="color: #ff4757;">S / Nool Alla / [PIDUR]:</strong> Pidurda või tagurda</div>
            <div><strong style="color: #ffd32a;">H / Tühik / [VILE]:</strong> Lase rongivilet või metroosignaali</div>
            <div><strong style="color: #ffd32a;">J / Tühik:</strong> Vaheta raudteepööret / suunda ristmikel</div>
            <div><strong style="color: #00f2fe;">C:</strong> Vaheta kaameravaadet (Juhi kabiin, Tagaajamisvaade, Kinovaade, Pealtvaade)</div>
            <div><strong style="color: #ffd32a;">N:</strong> Vaheta ilma ja kellaaega (Päev, Loojang, Öö)</div>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
            <div><strong style="color: #ffd32a;">🪙 Kuidas teenida Rongiraha:</strong> Peatu jaamatsoonis kiirusel 0 km/h, oota kuni reisijad peale lähevad ja teeni iga peatusega +50 €!</div>
            <div><strong style="color: #2ecc71;">📱 Nutiseadmed:</strong> Telefonis ja tahvlis aktiveeruvad ekraanile automaatselt mugavad puutetundlikud juhtnupud!</div>
        `
    },
    en: {
        gameTitle: '3D TRAIN SIMULATOR',
        ownerPill: '🔥 3D SIMULATOR',
        depotBtn: 'Vehicle Selection (Trains & Metros)',
        tabTrains: '🚂 Trains',
        tabMetros: '🚇 Metros',
        targetStation: '🎯 Target Station:',
        passengers: '👥 Passengers:',
        moneyTooltip: 'Train Money (earn +50€ per station stop)',
        camModes: ['🎥 Chase (3D)', '🎥 Cab (Driver)', '🎥 Cinematic', '🎥 Top-Down'],
        weatherModes: ['☀️ Day', '🌅 Sunset', '🌙 Night'],
        sound: '🔊 Sound',
        soundMuted: '🔇 Muted',
        help: '❓ Help',
        hub: '🏠 Hub',
        approachingJunction: 'Approaching Junction:',
        switchTrackBtn: 'Switch Track (J / Space)',
        branchMain: '[MAIN LINE]',
        branchMountain: '[MOUNTAIN LOOP]',
        stationStopTitle: 'STATION STOP',
        stationStopSubtext: 'Passenger boarding and cargo exchange (+50 €)...',
        skippedTitle: 'YOU MISSED THE STATION!',
        skippedDesc: (name: string) => `You missed: "${name}". Continuing towards next station!`,
        rewardTitle: (name: string) => `🎉 ${name.toUpperCase()} ARRIVAL SUCCESS!`,
        rewardDesc: (passengers: number) => `Passengers (+${passengers} people) delivered. Earn +50 € Train Money at every stop!`,
        rewardBtn: '🚂 CONTINUE JOURNEY',
        rewardMoneyLabel: 'Earned Train Money:',
        depotTitle: 'Depot: Trains & Metros',
        depotDesc: 'Select your locomotive or metro train and unlock vehicles with Train Money (+50€ per stop) or Yards (Yards = 5x train price)!',
        depotMoneyLabel: '🪙 Train Money:',
        depotYardLabel: '💎 Yards:',
        depotStartDriving: '🚂 START DRIVING',
        topSpeed: 'Top Speed:',
        accel: 'Acceleration:',
        capacity: 'Capacity:',
        passengersUnit: 'passengers',
        free: 'FREE',
        or: 'or',
        selected: '✅ SELECTED',
        chooseTrain: '▶️ SELECT VEHICLE',
        buyMoney: (price: number) => `🪙 BUY (${price} €)`,
        buyYard: (price: number) => `💎 BUY (${price} Y)`,
        boughtSuccessMoney: (name: string, price: number) => `🎉 Successfully purchased "${name}" with Train Money (${price} €)!`,
        boughtSuccessYard: (name: string, price: number) => `🎉 Successfully purchased "${name}" with Yards (${price} Y)!`,
        notEnoughMoney: (price: number, cur: number) => `Not enough Train Money! You need ${price} € (you have ${cur} €).`,
        notEnoughYards: (price: number, cur: number) => `Not enough Yards! You need ${price} Y (you have ${cur} Y).`,
        speedUnit: 'KM / H',
        throttleLabel: 'THROTTLE',
        btnPower: 'POWER',
        btnBrake: 'BRAKE',
        btnHorn: 'HORN',
        mPower: 'POWER',
        mBrake: 'BRAKE',
        mHorn: 'HORN',
        mSwitch: 'SWITCH',
        mCam: 'CAM',
        mWeather: 'DAY',
        helpTitle: '🚂 Train Simulator Guide & Controls',
        helpContent: `
            <div><strong style="color: #00f2fe;">W / Up Arrow / [POWER]:</strong> Accelerate train / metro forward</div>
            <div><strong style="color: #ff4757;">S / Down Arrow / [BRAKE]:</strong> Brake or reverse</div>
            <div><strong style="color: #ffd32a;">H / Space / [HORN]:</strong> Sound train horn / metro chime</div>
            <div><strong style="color: #ffd32a;">J / KeyJ:</strong> Switch track junction (Main line vs Mountain Loop)</div>
            <div><strong style="color: #00f2fe;">C:</strong> Toggle camera view (Cab Driver, Chase 3D, Cinematic, Map)</div>
            <div><strong style="color: #ffd32a;">N:</strong> Toggle weather & lighting (Day, Sunset, Night)</div>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
            <div><strong style="color: #ffd32a;">🪙 How to Earn Train Money:</strong> Stop inside station zone at 0 km/h, wait for boarding to finish, and earn +50 € at every station stop!</div>
            <div><strong style="color: #2ecc71;">📱 Touch Devices:</strong> On phone or tablet, ergonomic on-screen touch buttons appear automatically!</div>
        `
    }
};

export let isOwner = checkIsOwner();
export let t = isOwner ? I18N.et : I18N.en;

export function updateLocalization() {
    isOwner = checkIsOwner();
    t = isOwner ? I18N.et : I18N.en;
}

export function getStationName(st: Station): string {
    return isOwner ? st.name : st.nameEn;
}

export function getTrainName(train: TrainDef): string {
    return isOwner ? train.name : train.nameEn;
}

export function getTrainDesc(train: TrainDef): string {
    return isOwner ? train.description : train.descriptionEn;
}

export function getT() {
    return isOwner ? I18N.et : I18N.en;
}
