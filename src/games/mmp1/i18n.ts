import { getCurrentUserProfile, isPlayardOwner } from '../../auth';

export type Language = 'en' | 'et';

export function isOwnerUser(): boolean {
    const userProf = getCurrentUserProfile();
    return isPlayardOwner(userProf?.email);
}

export function getLanguage(): Language {
    return isOwnerUser() ? 'et' : 'en';
}

export const I18N = {
    et: {
        roles: {
            murderer: {
                name: 'MÕRVAR',
                revealTitle: 'MÕRVAR',
                revealDesc: 'Tapa salaja kõik süütud ja väldi šerifi kuule enne aja lõppu!',
                understoodBtn: 'MÕISTETUD! ⚔️',
                adminSub: 'Nuga · 1-löök tapmine · +200 € & 1 Crate'
            },
            sheriff: {
                name: 'ŠERIF',
                revealTitle: 'ŠERIF',
                revealDesc: 'Otsi üles mõrvar ja lase ta maha! Kui eksid ja tabad süütut, kaotad relva!',
                understoodBtn: 'MÕISTETUD! 🔫',
                adminSub: 'Revolver · Lase mõrvarit · +100 €'
            },
            innocent: {
                name: 'SÜÜTU',
                revealTitle: 'SÜÜTU',
                revealDesc: 'Jää ellu! Kogu münte ja kui šerif langeb, otsi üles mahakukkunud relv!',
                understoodBtn: 'MÕISTETUD! 🛡️',
                adminSub: 'Jää ellu · Kogu münte · +50 €'
            },
            hero: {
                name: 'KANGELANE',
                revealTitle: 'KANGELANE',
                revealDesc: 'Võtsid relva üles! Kaitse süütuid ja peata mõrtsukas!',
                understoodBtn: 'MÕISTETUD! 🔫',
                adminSub: 'Kangelane relvaga'
            }
        },
        hud: {
            lobby: 'LOBBY',
            alive: '👥 ELUS:',
            crateShopBtn: 'KASTIPOOD',
            crateShopTitle: 'Ava Kastipood ja Relvainventar',
            adminPanelBtn: 'ADMIN ROLLID',
            adminPanelTitle: 'Ava Playard Admin Rollivalik (P)',
            soundTitle: 'Heli sisse/välja',
            lobbyBannerPrefix: '🕒 OOTESAAL · VOOR ALUSTAB:',
            forceStartBtn: '⚡ ALUSTA KOHE',
            gunDropped: 'DETEKTIIV ON LANGENUD! RELV ON PÕRANDAL!',
            interactPickupGun: '[E] Võta maast detektiivi relv',
            hotbarHands: 'Käed',
            hotbarCoins: 'Mündid'
        },
        incidents: {
            sheriffMistake: '⚠️ Šerif eksis ja lasi süütu! Šerif langes!',
            sheriffHit: (name: string) => `⭐ Šerif tabas märki! ${name} langes!`,
            playerDiedKnife: '💀 Said surma! (Mõrvar tabas sind)',
            playerDiedGun: '💀 Said surma! (Kuulitaba)',
            victimEliminated: (name: string) => `💀 Mängija ${name} elimineeriti!`,
            victimFell: (name: string) => `💀 Mängija ${name} langes!`,
            sheriffWitnessed: '👁️ Šerif nägi mõrva pealt! Mõrvar on paljastatud!',
            allEliminated: '🏆 Mõrtsukas elimineeris kõik!',
            gunDroppedFeed: '⚠️ Relv on maas! Süütud saavad selle [E] klahviga üles korjata!',
            heroPickedUp: '⭐ Korjasid maast šerifi relva! Oled nüüd Kangelane!',
            otherPickedUp: (name: string) => `⭐ ${name} korjas maast šerifi relva!`,
            sheriffWinReason: (name: string) => `${name} laskis mõrvari maha! Süütud ja šerif võitsid!`,
            murdererWinReason: 'Mõrvar kõrvaldas kõik süütud ja šerifi! Mõrvar võitis!'
        },
        mapVote: {
            title: 'KAARDI VALIK / MAP VOTING',
            subtitlePrefix: 'Vali järgmine 3D lahinguväli! Mäng algab: ',
            footer: 'Mängijad ja botid hääletavad. Enim hääli saanud kaart võidab!',
            hotel2Desc: 'Lobby & Rõdud',
            milbaseDesc: 'Punkrid & Hangar',
            officeDesc: 'Boksid & Server',
            vacationDesc: 'Rand & Bangalod',
            yatchyDesc: 'Luksusjaht & Tekk'
        },
        roundEnd: {
            sheriffWinTitle: 'DETECTIVE WINS 🔫',
            detectiveWinTitle: 'DETECTIVE WINS 🔫',
            innocentsWinTitle: 'INNOCENTS WIN 🏆',
            murdererWinTitle: 'MURDERER WINS 🔪',
            timeOutTitle: 'INNOCENTS WIN 🏆',
            sheriffEliminatedMurderer: (heroName: string) => `${heroName} laskis mõrvari maha! Süütud ja šerif võitsid!`,
            murdererEliminatedAll: 'Mõrvar elimineeris kõik süütud ja šerifi!',
            murdererRanOutOfTime: 'Aeg sai läbi! Mõrvar ei suutnud kõiki elimineerida.',
            murdererWas: 'Mõrvar oli:',
            hero: 'Kangelane:',
            map: 'Kaart:',
            rewardMoney: 'Võidusumma:',
            bonusLegendaryCrate: '🎁 Boonus: +1 Legendary Crate!',
            backToLobbyBtn: 'TAGASI LOBBYSSE 🔄'
        },
        crateShop: {
            title: 'KASTIPOOD & RELVAD',
            subtitle: 'Osta kaste, ava unikaalseid relvanahku ja varusta need 3D-s!',
            tabShop: '📦 KASTIPOOD (SHOP)',
            tabInventory: '🎒 MINU INVENTAR (INVENTORY)',
            tabExchange: '💶 OSTA RAHA (BUY CASH)',
            inGameNotice: '🔒 KASTIDE OSTMINE ON LUKUSTATUD! Kaste saab osta ainult ooteruumis (lobis) enne mängu algust.',
            inGameNoticeAlert: 'Kaste saab osta ainult ooteruumis (lobis) enne mängu algust!',
            buyBtn: (price: number) => `OSTA ${price} €`,
            buyBtnLobbyOnly: 'AINULT LOBIS 🔒',
            buyBtnSoldOut: 'LÄBI MÜÜDUD',
            setBundleBadge: '👑 TÄISKOMPLEKT: NUGA + PÜSTOL',
            stockLabel: '📦 Laos:',
            pcs: 'tk',
            restockTimer: '⏱️ Uus laovaru:',
            ownedCratesTitle: '🎁 Avamata Kastid (Owned Crates)',
            emptyCratesText: 'Sul ei ole avamata kaste. Osta poest või võida voorus!',
            knivesTitle: '🔪 Noanahad (Knife Skins)',
            gunsTitle: '🔫 Revolvrinahad (Revolver Skins)',
            openCrateBtn: 'AVA KAST 🎁',
            ownedCount: (count: number) => `Omad: ${count} tk`,
            equipped: 'VARUSTATUD ✅',
            equip: 'VARUSTA ⚔️',
            unboxingTitle: 'KASTI AVAMINE...',
            unboxingSubtitle: 'Rulett pöörleb — vaata, kuhu punane fookusjoon seisma jääb!',
            congratsSet: '🎉 PALJU ÕNNE! SAID TÄISKOMPLEKTI! 🎁',
            congratsSetSub: (crateName: string) => `${crateName}: Saadud nii nuga kui ka revolver!`,
            congratsDuplicate: 'DUPLIKAAT! SAID POOLE RAHAST TAGASI! 💰',
            congratsDuplicateSub: (amount: number) => `Sul on see relv juba olemas! Tagastati pool kasti hinnast: +${amount} €!`,
            congratsWeapon: 'PALJU ÕNNE! SAID UUE RELVA!',
            congratsWeaponSub: (crateName: string) => `${crateName} avatud!`,
            itemTypeSet: '👑 TÄISKOMPLEKT (NUGA + PÜSTOL)',
            itemTypeDuplicate: (amount: number) => `♻️ DUPLIKAAT (+${amount} €)`,
            itemTypeKnife: '🔪 UUS NOANAHK',
            itemTypeGun: '🔫 UUS REVOLVRINAHK',
            equipSetBtn: 'VARUSTA KOMPLEKT 👑',
            equipNowBtn: 'VARUSTA KOHE ⚔️',
            closeBtn: 'SULGE ✕'
        },
        moneyExchange: {
            title: 'OSTA MÄNGURAHA YARDIDE EEST',
            subtitle: 'Vaheta oma Playard Yardid mänguraha (€) vastu! Yarde maksad rohkem kui saad raha.',
            yourYards: 'Sinu Yardid:',
            yourCash: 'Sinu Mänguraha:',
            buyBtn: (yards: number) => `OSTA ${yards} Y`,
            pack1Title: 'Taskuraha (Pocket Cash)',
            pack1Desc: '+100 € mänguraha',
            pack2Title: 'Rahapakk (Banker Stack)',
            pack2Desc: '+500 € mänguraha',
            pack3Title: 'Suurmängija (High Roller)',
            pack3Desc: '+2,500 € mänguraha',
            pack4Title: 'Kullaait (Jackpot Vault)',
            pack4Desc: '+5,000 € mänguraha',
            popularBadge: 'POPULAARNE ⭐',
            bestValueBadge: 'PARIM VÄÄRTUS 💎',
            successToast: (amount: number, yards: number) => `+${amount} € lisatud! Kulutatud ${yards} Yardi.`,
            notEnoughYards: (needed: number, have: number) => `Pole piisavalt Yarde! Vajad ${needed} Y, sul on ${have} Y.`
        },
        adminPanel: {
            title: 'PLAYARD ADMIN PANEEL',
            subtitle: 'Vali oma roll ja soovitud 3D kaart:',
            mapSelectTitle: '🗺️ Vali 3D Kaart (Täpselt 5 klassikalist kaarti):',
            randomBtn: '🎲 JUHUSLIK',
            forceStartBtn: '⚡ Käivita Raund',
            addMoneyBtn: '💰 +500 € Raha',
            closeBtn: '✕ Sulge'
        }
    },
    en: {
        roles: {
            murderer: {
                name: 'MURDERER',
                revealTitle: 'MURDERER',
                revealDesc: 'Secretly eliminate all innocents and avoid the Sheriff\'s bullets before time runs out!',
                understoodBtn: 'UNDERSTOOD! ⚔️',
                adminSub: 'Knife · 1-hit kill · +200 € & 1 Crate'
            },
            sheriff: {
                name: 'SHERIFF',
                revealTitle: 'SHERIFF',
                revealDesc: 'Find the Murderer and shoot them down! If you mistake and shoot an innocent, you lose your weapon!',
                understoodBtn: 'UNDERSTOOD! 🔫',
                adminSub: 'Revolver · Shoot Murderer · +100 €'
            },
            innocent: {
                name: 'INNOCENT',
                revealTitle: 'INNOCENT',
                revealDesc: 'Survive! Collect coins and if the Sheriff falls, find and pick up the dropped gun!',
                understoodBtn: 'UNDERSTOOD! 🛡️',
                adminSub: 'Survive · Collect coins · +50 €'
            },
            hero: {
                name: 'HERO',
                revealTitle: 'HERO',
                revealDesc: 'You picked up the gun! Protect innocents and stop the Murderer!',
                understoodBtn: 'UNDERSTOOD! 🔫',
                adminSub: 'Hero with gun'
            }
        },
        hud: {
            lobby: 'LOBBY',
            alive: '👥 ALIVE:',
            crateShopBtn: 'CRATE SHOP',
            crateShopTitle: 'Open Crate Shop & Weapon Inventory',
            adminPanelBtn: 'ADMIN ROLES',
            adminPanelTitle: 'Open Playard Admin Role Selection (P)',
            soundTitle: 'Toggle Sound',
            lobbyBannerPrefix: '🕒 LOBBY · ROUND STARTS IN:',
            forceStartBtn: '⚡ START NOW',
            gunDropped: 'SHERIFF HAS FALLEN! GUN IS ON THE FLOOR!',
            interactPickupGun: '[E] Pick up Sheriff\'s dropped gun',
            hotbarHands: 'Hands',
            hotbarCoins: 'Coins'
        },
        incidents: {
            sheriffMistake: '⚠️ Sheriff made a mistake and shot an innocent! Sheriff fell!',
            sheriffHit: (name: string) => `⭐ Sheriff hit the target! ${name} fell!`,
            playerDiedKnife: '💀 You were eliminated! (Stabbed by Murderer)',
            playerDiedGun: '💀 You were eliminated! (Shot by bullet)',
            victimEliminated: (name: string) => `💀 Player ${name} was eliminated!`,
            victimFell: (name: string) => `💀 Player ${name} fell!`,
            sheriffWitnessed: '👁️ Sheriff witnessed the murder! Murderer exposed!',
            allEliminated: '🏆 Murderer eliminated everyone!',
            gunDroppedFeed: '⚠️ Gun dropped! Innocents can pick it up with [E]!',
            heroPickedUp: '⭐ You picked up the Sheriff\'s gun! You are now the Hero!',
            otherPickedUp: (name: string) => `⭐ ${name} picked up the Sheriff\'s gun!`,
            sheriffWinReason: (name: string) => `${name} shot the Murderer! Innocents and Sheriff win!`,
            murdererWinReason: 'The Murderer eliminated all innocents and the Sheriff! Murderer wins!'
        },
        mapVote: {
            title: 'MAP VOTING',
            subtitlePrefix: 'Vote for the next 3D battleground! Match begins: ',
            footer: 'Players and bots vote. Map with most votes wins!',
            hotel2Desc: 'Lobby & Balconies',
            milbaseDesc: 'Bunkers & Hangar',
            officeDesc: 'Cubicles & Server',
            vacationDesc: 'Beach & Bungalows',
            yatchyDesc: 'Luxury Yacht & Deck'
        },
        roundEnd: {
            sheriffWinTitle: 'DETECTIVE WINS 🔫',
            detectiveWinTitle: 'DETECTIVE WINS 🔫',
            innocentsWinTitle: 'INNOCENTS WIN 🏆',
            murdererWinTitle: 'MURDERER WINS 🔪',
            timeOutTitle: 'INNOCENTS WIN 🏆',
            sheriffEliminatedMurderer: (heroName: string) => `${heroName} shot the Murderer! Innocents and Sheriff win!`,
            murdererEliminatedAll: 'The Murderer eliminated all innocents and the Sheriff!',
            murdererRanOutOfTime: 'Time ran out! The Murderer could not eliminate everyone.',
            murdererWas: 'Murderer was:',
            hero: 'Hero:',
            map: 'Map:',
            rewardMoney: 'Prize:',
            bonusLegendaryCrate: '🎁 Bonus: +1 Legendary Crate!',
            backToLobbyBtn: 'BACK TO LOBBY 🔄'
        },
        crateShop: {
            title: 'CRATE SHOP & WEAPONS',
            subtitle: 'Buy crates, unlock unique weapon skins, and equip them in 3D!',
            tabShop: '📦 CRATE SHOP',
            tabInventory: '🎒 MY INVENTORY',
            tabExchange: '💶 BUY CASH',
            inGameNotice: '🔒 CRATE PURCHASES LOCKED! Crates can only be purchased in the lobby before match starts.',
            inGameNoticeAlert: 'Crates can only be purchased in the lobby before match starts!',
            buyBtn: (price: number) => `BUY ${price} €`,
            buyBtnLobbyOnly: 'LOBBY ONLY 🔒',
            buyBtnSoldOut: 'SOLD OUT',
            setBundleBadge: '👑 FULL BUNDLE: KNIFE + GUN',
            stockLabel: '📦 Stock:',
            pcs: 'pcs',
            restockTimer: '⏱️ Restocks in:',
            ownedCratesTitle: '🎁 Unopened Crates',
            emptyCratesText: 'You have no unopened crates. Buy from the shop or win a round!',
            knivesTitle: '🔪 Knife Skins',
            gunsTitle: '🔫 Revolver Skins',
            openCrateBtn: 'OPEN CRATE 🎁',
            ownedCount: (count: number) => `Owned: ${count} pcs`,
            equipped: 'EQUIPPED ✅',
            equip: 'EQUIP ⚔️',
            unboxingTitle: 'OPENING CRATE...',
            unboxingSubtitle: 'Roulette is spinning — watch where the red center line stops!',
            congratsSet: '🎉 CONGRATULATIONS! YOU GOT A FULL SET! 🎁',
            congratsSetSub: (crateName: string) => `${crateName}: Received both a knife and revolver!`,
            congratsDuplicate: 'DUPLICATE! RECEIVED 50% REFUND! 💰',
            congratsDuplicateSub: (amount: number) => `You already own this weapon! Refunded 50% of crate price: +${amount} €!`,
            congratsWeapon: 'CONGRATULATIONS! YOU GOT A NEW WEAPON!',
            congratsWeaponSub: (crateName: string) => `${crateName} opened!`,
            itemTypeSet: '👑 FULL BUNDLE (KNIFE + GUN)',
            itemTypeDuplicate: (amount: number) => `♻️ DUPLICATE (+${amount} €)`,
            itemTypeKnife: '🔪 NEW KNIFE SKIN',
            itemTypeGun: '🔫 NEW REVOLVER SKIN',
            equipSetBtn: 'EQUIP BUNDLE 👑',
            equipNowBtn: 'EQUIP NOW ⚔️',
            closeBtn: 'CLOSE ✕'
        },
        moneyExchange: {
            title: 'BUY GAME CASH WITH YARDS',
            subtitle: 'Exchange your Playard Yards for in-game Cash (€)! Pay more Yards than the cash received.',
            yourYards: 'Your Yards:',
            yourCash: 'Your Cash:',
            buyBtn: (yards: number) => `BUY FOR ${yards} Y`,
            pack1Title: 'Pocket Cash',
            pack1Desc: '+100 € Cash',
            pack2Title: 'Banker Stack',
            pack2Desc: '+500 € Cash',
            pack3Title: 'High Roller',
            pack3Desc: '+2,500 € Cash',
            pack4Title: 'Jackpot Vault',
            pack4Desc: '+5,000 € Cash',
            popularBadge: 'POPULAR ⭐',
            bestValueBadge: 'BEST VALUE 💎',
            successToast: (amount: number, yards: number) => `+${amount} € added! Spent ${yards} Yards.`,
            notEnoughYards: (needed: number, have: number) => `Not enough Yards! Need ${needed} Y, you have ${have} Y.`
        },
        adminPanel: {
            title: 'PLAYARD ADMIN PANEL',
            subtitle: 'Select your role and desired 3D map:',
            mapSelectTitle: '🗺️ Select 3D Map (Exact 5 classic maps):',
            randomBtn: '🎲 RANDOM',
            forceStartBtn: '⚡ Start Round',
            addMoneyBtn: '💰 +500 € Cash',
            closeBtn: '✕ Close'
        }
    }
};

export function t(): typeof I18N['en'] {
    return I18N[getLanguage()];
}

export function applyMmp1Localization() {
    const lang = getLanguage();
    const texts = I18N[lang];

    // 1. Top HUD
    const ownerPill = document.querySelector('.owner-pill') as HTMLElement | null;
    if (ownerPill) {
        ownerPill.style.display = isOwnerUser() ? 'inline-block' : 'none';
    }

    const btnCrateShop = document.getElementById('btn-crate-shop');
    if (btnCrateShop) {
        btnCrateShop.title = texts.hud.crateShopTitle;
        const label = btnCrateShop.querySelector('span:last-child');
        if (label) label.textContent = texts.hud.crateShopBtn;
    }

    const btnAdmin = document.getElementById('btn-admin-panel');
    if (btnAdmin) {
        btnAdmin.title = texts.hud.adminPanelTitle;
        const label = btnAdmin.querySelector('span:last-child');
        if (label) label.textContent = texts.hud.adminPanelBtn;
    }

    const aliveBadge = document.getElementById('hud-alive-badge');
    if (aliveBadge) {
        const span = aliveBadge.querySelector('span:first-child');
        if (span) span.textContent = texts.hud.alive;
    }

    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) soundBtn.title = texts.hud.soundTitle;

    // 2. Lobby Banner
    const lobbyBanner = document.getElementById('lobby-banner');
    if (lobbyBanner) {
        const span = lobbyBanner.querySelector('span:first-child');
        if (span) span.textContent = texts.hud.lobbyBannerPrefix;
    }
    const forceStartBtn = document.getElementById('btn-force-start');
    if (forceStartBtn) forceStartBtn.textContent = texts.hud.forceStartBtn;

    // 3. Gun Dropped Banner & Interaction Prompt
    const gunDroppedText = document.getElementById('gun-dropped-text');
    if (gunDroppedText) gunDroppedText.textContent = texts.hud.gunDropped;

    const interactionPromptText = document.getElementById('interaction-prompt-text');
    if (interactionPromptText) interactionPromptText.textContent = texts.hud.interactPickupGun;

    // 4. Hotbar
    const slotWeaponName = document.getElementById('slot-weapon-name');
    if (slotWeaponName && (slotWeaponName.textContent === 'Käed' || slotWeaponName.textContent === 'Hands')) {
        slotWeaponName.textContent = texts.hud.hotbarHands;
    }
    const slotItemName = document.querySelector('#slot-item .hotbar-name');
    if (slotItemName) slotItemName.textContent = texts.hud.hotbarCoins;

    // 5. Map Voting Modal
    const mapVoteHeader = document.querySelector('#map-vote-overlay h2');
    if (mapVoteHeader) mapVoteHeader.textContent = texts.mapVote.title;

    const mapVoteDesc = document.querySelector('#map-vote-overlay p');
    if (mapVoteDesc) {
        const timer = document.getElementById('map-vote-timer');
        const timerText = timer ? timer.outerHTML : '5s';
        mapVoteDesc.innerHTML = `${texts.mapVote.subtitlePrefix}${timerText}`;
    }

    const mapVoteFooter = document.querySelector('#map-vote-overlay .map-vote-card > div:last-child');
    if (mapVoteFooter && !mapVoteFooter.classList.contains('map-vote-grid')) {
        mapVoteFooter.textContent = texts.mapVote.footer;
    }

    const descHotel2 = document.querySelector('.map-vote-btn[data-map="hotel2"] span:last-child');
    if (descHotel2) descHotel2.textContent = texts.mapVote.hotel2Desc;
    const descMilbase = document.querySelector('.map-vote-btn[data-map="milbase"] span:last-child');
    if (descMilbase) descMilbase.textContent = texts.mapVote.milbaseDesc;
    const descOffice = document.querySelector('.map-vote-btn[data-map="office"] span:last-child');
    if (descOffice) descOffice.textContent = texts.mapVote.officeDesc;
    const descVacation = document.querySelector('.map-vote-btn[data-map="vacation"] span:last-child');
    if (descVacation) descVacation.textContent = texts.mapVote.vacationDesc;
    const descYatchy = document.querySelector('.map-vote-btn[data-map="yatchy"] span:last-child');
    if (descYatchy) descYatchy.textContent = texts.mapVote.yatchyDesc;

    // 6. Role Reveal Modal
    const roleRevealBtn = document.getElementById('btn-role-reveal-close');
    if (roleRevealBtn) roleRevealBtn.textContent = texts.roles.innocent.understoodBtn;

    // 7. Victory Modal
    const endMurdererLabel = document.querySelector('#round-end-overlay .victory-card > div > div:nth-child(1)');
    if (endMurdererLabel) {
        const strong = document.getElementById('end-murderer-name');
        endMurdererLabel.innerHTML = `${texts.roundEnd.murdererWas} <strong id="end-murderer-name" style="color: #ff2e63;">${strong?.textContent || ''}</strong>`;
    }
    const endHeroLabel = document.querySelector('#round-end-overlay .victory-card > div > div:nth-child(2)');
    if (endHeroLabel) {
        const strong = document.getElementById('end-hero-name');
        endHeroLabel.innerHTML = `${texts.roundEnd.hero} <strong id="end-hero-name" style="color: #00f2fe;">${strong?.textContent || ''}</strong>`;
    }
    const endMapLabel = document.querySelector('#round-end-overlay .victory-card > div > div:nth-child(3)');
    if (endMapLabel) {
        const strong = document.getElementById('end-map-name');
        endMapLabel.innerHTML = `${texts.roundEnd.map} <strong id="end-map-name" style="color: #ffd32a;">${strong?.textContent || ''}</strong>`;
    }
    const endRewardLabel = document.querySelector('#round-end-overlay .victory-card > div > div:nth-child(4)');
    if (endRewardLabel) {
        const span = document.getElementById('end-reward-money');
        endRewardLabel.innerHTML = `${texts.roundEnd.rewardMoney} +<span id="end-reward-money">${span?.textContent || '0'}</span> €`;
    }
    const endBonusBox = document.getElementById('end-reward-crate-box');
    if (endBonusBox) endBonusBox.textContent = texts.roundEnd.bonusLegendaryCrate;

    const btnNextRound = document.getElementById('btn-next-round');
    if (btnNextRound) btnNextRound.textContent = texts.roundEnd.backToLobbyBtn;

    // 8. Crate Shop Modal
    const shopHeaderTitle = document.querySelector('.crate-modal-header h2');
    if (shopHeaderTitle) shopHeaderTitle.textContent = texts.crateShop.title;
    const shopHeaderSub = document.querySelector('.crate-modal-header div > div > div:last-child');
    if (shopHeaderSub) shopHeaderSub.textContent = texts.crateShop.subtitle;

    const btnTabShop = document.getElementById('btn-tab-shop');
    if (btnTabShop) btnTabShop.textContent = texts.crateShop.tabShop;
    const btnTabInv = document.getElementById('btn-tab-inventory');
    if (btnTabInv) btnTabInv.textContent = texts.crateShop.tabInventory;
    const btnTabExchange = document.getElementById('btn-tab-exchange');
    if (btnTabExchange) btnTabExchange.textContent = texts.crateShop.tabExchange;

    const exchangeTitle = document.getElementById('exchange-view-title');
    if (exchangeTitle) exchangeTitle.textContent = texts.moneyExchange.title;
    const exchangeSub = document.getElementById('exchange-view-subtitle');
    if (exchangeSub) exchangeSub.textContent = texts.moneyExchange.subtitle;

    const invCratesTitle = document.querySelector('#tab-inventory-view h3:nth-of-type(1) span:last-child');
    if (invCratesTitle) invCratesTitle.textContent = texts.crateShop.ownedCratesTitle;
    const invKnivesTitle = document.querySelector('#tab-inventory-view h3:nth-of-type(2) span:last-child');
    if (invKnivesTitle) invKnivesTitle.textContent = texts.crateShop.knivesTitle;
    const invGunsTitle = document.querySelector('#tab-inventory-view h3:nth-of-type(3) span:last-child');
    if (invGunsTitle) invGunsTitle.textContent = texts.crateShop.gunsTitle;

    // 9. Admin Panel
    const adminHeaderTitle = document.querySelector('#admin-role-modal h2');
    if (adminHeaderTitle) adminHeaderTitle.textContent = texts.adminPanel.title;
    const adminHeaderSub = document.querySelector('#admin-role-modal p');
    if (adminHeaderSub) adminHeaderSub.textContent = texts.adminPanel.subtitle;

    const adminMurdStrong = document.querySelector('#btn-admin-role-murderer strong');
    if (adminMurdStrong) adminMurdStrong.textContent = texts.roles.murderer.name;
    const adminMurdSub = document.querySelector('#btn-admin-role-murderer span:last-child');
    if (adminMurdSub) adminMurdSub.textContent = texts.roles.murderer.adminSub;

    const adminSherStrong = document.querySelector('#btn-admin-role-sheriff strong');
    if (adminSherStrong) adminSherStrong.textContent = texts.roles.sheriff.name;
    const adminSherSub = document.querySelector('#btn-admin-role-sheriff span:last-child');
    if (adminSherSub) adminSherSub.textContent = texts.roles.sheriff.adminSub;

    const adminInnoStrong = document.querySelector('#btn-admin-role-innocent strong');
    if (adminInnoStrong) adminInnoStrong.textContent = texts.roles.innocent.name;
    const adminInnoSub = document.querySelector('#btn-admin-role-innocent span:last-child');
    if (adminInnoSub) adminInnoSub.textContent = texts.roles.innocent.adminSub;

    const adminMapTitle = document.querySelector('#admin-role-modal div[style*="text-align: left"] > div:first-child');
    if (adminMapTitle) adminMapTitle.textContent = texts.adminPanel.mapSelectTitle;

    const adminRandomBtn = document.querySelector('.admin-map-btn[data-map="random"]');
    if (adminRandomBtn) adminRandomBtn.textContent = texts.adminPanel.randomBtn;

    const adminForceStart = document.getElementById('btn-admin-force-start');
    if (adminForceStart) adminForceStart.textContent = texts.adminPanel.forceStartBtn;
    const adminAddMoney = document.getElementById('btn-admin-add-yards');
    if (adminAddMoney) adminAddMoney.textContent = texts.adminPanel.addMoneyBtn;
    const adminClose = document.getElementById('btn-admin-close');
    if (adminClose) adminClose.textContent = texts.adminPanel.closeBtn;
}
