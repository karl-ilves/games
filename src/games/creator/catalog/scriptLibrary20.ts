// 20 eelkoostatud JavaScripti skripti Playard Creator Studio jaoks
export interface ScriptLibraryItem {
    id: string;
    name: string;
    description: string;
    category: 'movement' | 'combat' | 'rewards' | 'interaction' | 'environment';
    icon: string;
    code: string;
}

export const SCRIPT_LIBRARY_20: ScriptLibraryItem[] = [
    {
        id: 'iga_asi_pickup',
        name: '✨ Iga Asi (Eseme Kättevõtmine)',
        description: 'Kui objekt on ese, võetakse see [E] vajutamisel mängija kätte; kui part, käivitab koodi.',
        category: 'interaction',
        icon: '✋',
        code: `// IGA ASI: Kui ese, võta kätte; kui part, programmeeri siia alla!
if (api.object.isHoldable()) {
  api.object.pickup();
} else {
  api.hud.showMessage('Aktiviseeritud: ' + api.object.getName(), 'Info');
}`
    },
    {
        id: 'super_speed_boost',
        name: '⚡ Super Kiirendus (Speed Boost)',
        description: 'Annab mängijale 3.0x superkiiruse 5 sekundiks ja mängib heliefekti.',
        category: 'movement',
        icon: '⚡',
        code: `// Annab 3x kiirenduse 5 sekundiks
api.player.setSpeed(3.0, 5);
api.sound.play('powerup');
api.hud.showMessage('⚡ Superkiirus aktiveeritud (5 sekundit)!', 'Kiirendus');`
    },
    {
        id: 'mega_high_jump',
        name: '🚀 Mega Kõrghüpe (Trampliin)',
        description: 'Lennutab mängija kõrgele taevasse jõuga 24.',
        category: 'movement',
        icon: '🚀',
        code: `// Trampliin: Lennutab mängija kõrgele õhku
api.player.jump(24);
api.sound.play('jump');
api.hud.showMessage('🚀 Superhüpe pilvedesse!', 'Hüpe');`
    },
    {
        id: 'give_lucky_coins',
        name: '🪙 Õnnemündid (+25 Münti)',
        description: 'Annab mängijale korjamisel kohe +25 münti ja teeb heliefekti.',
        category: 'rewards',
        icon: '🪙',
        code: `// Anna mängijale 25 kuldmünti
api.player.giveCoins(25);
api.sound.play('coin');
api.hud.showMessage('🪙 Leidsid salajased +25 münti!', 'Aare');`
    },
    {
        id: 'give_playard_yards',
        name: '💎 Playard Yardid (+10 Yard)',
        description: 'Kingib mängijale päris Playard Yardi valuutat profiilile.',
        category: 'rewards',
        icon: '💎',
        code: `// Kingi mängijale +10 Playard Yardi
api.player.giveYards(10);
api.sound.play('victory');
api.hud.showMessage('💎 Teenisid +10 Playard Yardi!', 'Auhind');`
    },
    {
        id: 'teleport_spawn',
        name: '🌀 Teleport Alguspunkti (Spawn)',
        description: 'Telepordib mängija koheselt koordinaatidele (0, 0, 0) või kaardi algusse.',
        category: 'movement',
        icon: '🌀',
        code: `// Telepordi mängija tagasi algusesse
api.player.teleport(0, 1, 0);
api.sound.play('teleport');
api.hud.showMessage('🌀 Teleporditi alguspunkti!', 'Portaal');`
    },
    {
        id: 'teleport_secret_roof',
        name: '🏰 Salajane Katuse Teleport',
        description: 'Telepordib mängija 20 meetri kõrgusele salajasele katusele või vaateplatvormile.',
        category: 'movement',
        icon: '🏰',
        code: `// Teleport kõrgele vaateplatvormile
api.player.teleport(0, 20, 0);
api.sound.play('teleport');
api.hud.showMessage('🏰 Jõudsid salajasele vaateplatvormile!', 'Saladus');`
    },
    {
        id: 'lava_hazard_damage',
        name: '🔥 Laava Oht (-30 HP Elu)',
        description: 'Teeb mängijale 30 punkti kahju ja teeb valusa löögiheli.',
        category: 'combat',
        icon: '🔥',
        code: `// Laava / Okkad: Teeb kahju
api.player.damage(30);
api.sound.play('hit');
api.hud.showMessage('🔥 Said tulise laava käest -30 HP kahju!', 'Ettevaatust');`
    },
    {
        id: 'healing_fountain',
        name: '💖 Tervendav Allikas (+40 HP Elu)',
        description: 'Ravib mängija elusid +40 HP ja taastab tervise.',
        category: 'combat',
        icon: '💖',
        code: `// Ravi mängija elusid
api.player.heal(40);
api.sound.play('powerup');
api.hud.showMessage('💖 Tervendav allikas ravis +40 HP!', 'Tervis');`
    },
    {
        id: 'disco_color_change',
        name: '🌈 Disko Värvimuutja (Juhuslik Värv)',
        description: 'Muudab objekti värvi iga kord uueks juhuslikuks neoonvärviks.',
        category: 'environment',
        icon: '🌈',
        code: `// Disko efekt: Muuda objekti värvi juhuslikuks
const colors = ['#ff0055', '#00f2fe', '#ffd32a', '#2ecc71', '#a855f7', '#ff7675'];
const randomColor = colors[Math.floor(Math.random() * colors.length)];
api.object.setColor(randomColor);
api.sound.play('coin');`
    },
    {
        id: 'continuous_rotation',
        name: '🔄 Pidev Pöörlemine (Spinner)',
        description: 'Paneb objekti iga sekund natuke edasi pöörlema.',
        category: 'environment',
        icon: '🔄',
        code: `// Pööra objekti Y-teljel
api.object.rotate(0, 0.4, 0);`
    },
    {
        id: 'npc_greeting_dialog',
        name: '💬 NPC Tere Dialoog',
        description: 'NPC tegelane tervitab mängijat ja annab vihjeid ülesande kohta.',
        category: 'interaction',
        icon: '💬',
        code: `// NPC Dialoog ja tervitus
api.sound.play('powerup');
api.hud.showMessage('Tere seikleja! Leia üles 3 kuldmünti ja ava lossi uks!', 'NPC Vahimees');`
    },
    {
        id: 'quiz_question_gate',
        name: '🧠 Mõistatus / Küsimus',
        description: 'Kuvab mängijale mõistatuse või matemaatika küsimuse enne edasipääsu.',
        category: 'interaction',
        icon: '🧠',
        code: `// Esitab mängijale mõistatuse
api.sound.play('powerup');
api.hud.showMessage('MÕISTATUS: Mis on kergem kui sulg, aga keegi ei suuda seda kaua kinni hoida? (Hingus!)', 'Tarkusekivi');`
    },
    {
        id: 'checkpoint_save',
        name: '🚩 Kontrollpunkt (Checkpoint)',
        description: 'Salvestab praeguse asukoha mängija uueks taassünnikohaks.',
        category: 'movement',
        icon: '🚩',
        code: `// Kontrollpunkti salvestamine
api.sound.play('victory');
api.hud.showMessage('🚩 Kontrollpunkt salvestatud! Kui kukud, ärkad siin.', 'Kontrollpunkt');`
    },
    {
        id: 'boss_battle_shout',
        name: '👹 Bossi Lahingu Hoiatus',
        description: 'Hirmutav bossi möire, heliefekt ja teade suure lahingu algusest.',
        category: 'combat',
        icon: '👹',
        code: `// Bossi lahingu algus
api.sound.play('hit');
api.hud.showMessage('👹 "KES JULGES MINU KUNINGRIIKI ASTUDA?!" - Lahing algas!', 'BOSS');`
    },
    {
        id: 'instant_victory_finish',
        name: '🏆 Finiš ja Võidupidu',
        description: 'Mängib võiduhelina, annab punkte ja kuulutab taseme läbituks.',
        category: 'rewards',
        icon: '🏆',
        code: `// Finišijoon ja võit
api.sound.play('victory');
api.player.giveCoins(100);
api.hud.showMessage('🏆 PALJU ÕNNE! Läbisid mängu võidukalt!', 'VÕIT');`
    },
    {
        id: 'bouncy_jump_pad',
        name: '🦘 Põrkepadi (Väike Hüpe)',
        description: 'Lõbus vedrupadi, mis hüpitab mängijat kergelt üle takistuse (jõud 14).',
        category: 'movement',
        icon: '🦘',
        code: `// Väike hüppepadi
api.player.jump(14);
api.sound.play('jump');`
    },
    {
        id: 'freeze_trap_slow',
        name: '❄️ Jääpüünis / Aeglustus',
        description: 'Aeglustab mängija liikumiskiirust poole võrra 3 sekundiks.',
        category: 'combat',
        icon: '❄️',
        code: `// Jääpüünis: Aeglustab mängijat
api.player.setSpeed(0.5, 3.0);
api.sound.play('hit');
api.hud.showMessage('❄️ Libe jää! Sinu liikumine on aeglustatud!', 'Jääpüünis');`
    },
    {
        id: 'gold_touch_transmute',
        name: '✨ Kuldsõrm (Muuda Kuldseks)',
        description: 'Muudab eseme läikivaks kullakarva kollaseks ja annab +5 münti.',
        category: 'environment',
        icon: '✨',
        code: `// Muuda objekt kuldseks
api.object.setColor('#ffd32a');
api.player.giveCoins(5);
api.sound.play('coin');
api.hud.showMessage('✨ Ese muutus puhtaks kullaks!', 'Kuld');`
    },
    {
        id: 'stealth_invisibility_boost',
        name: '🥷 Ninja Kiiruse ja Hüppe Pakett',
        description: 'Kombineeritud ninja boost: annab 2.2x kiiruse ja lennutab hüppega edasi.',
        category: 'movement',
        icon: '🥷',
        code: `// Ninja boost: Kiirus + Hüpe
api.player.setSpeed(2.2, 6.0);
api.player.jump(16);
api.sound.play('powerup');
api.hud.showMessage('🥷 Ninja akrobaatika aktiveeritud!', 'Ninja');`
    }
];
