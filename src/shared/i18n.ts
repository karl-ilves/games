export type Language = 'en' | 'et';

let currentLang: Language = 'en';

export function getLanguage(): Language {
    return currentLang;
}

export function setLanguage(lang: Language) {
    currentLang = lang;
    applyLocalization();
}

export function applyLocalization() {
    const isEt = currentLang === 'et';

    // 1. Navigation
    const streakBtnText = document.querySelector('#btn-open-streak span:nth-child(2)');
    if (streakBtnText) streakBtnText.textContent = isEt ? 'Igapäevased preemiad' : 'Daily Rewards';

    const adminNavBtnText = document.querySelector('#btn-open-admin-panel span:nth-child(2)');
    if (adminNavBtnText) adminNavBtnText.textContent = isEt ? 'Admini paneel' : 'Admin Panel';

    // 2. Pealeht
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = isEt ? 'Tere tulemast Playardi' : 'Welcome to Playard';

    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = isEt
        ? 'Mängi 3D simulaatoreid, avasta kogukonna loodud maailmu ja loo oma mänge!'
        : 'Play 3D simulators, explore community-created worlds, and create your own games!';

    // Auth box
    const loginTitle = document.querySelector('#login-form h3');
    if (loginTitle) loginTitle.textContent = isEt ? 'Konto sisselogimine / Registreerimine' : 'Account Login / Register';

    const loginSub = document.querySelector('#login-form p');
    if (loginSub) loginSub.textContent = isEt ? 'Logi sisse, et luua mänge ja salvestada oma progress' : 'Log in to create games & save your progress';

    const emailInput = document.getElementById('auth-email') as HTMLInputElement | null;
    if (emailInput) emailInput.placeholder = isEt ? 'E-post' : 'E-mail';

    const usernameInput = document.getElementById('auth-username') as HTMLInputElement | null;
    if (usernameInput) usernameInput.placeholder = isEt ? 'Kasutajanimi (ilma emotikonideta)' : 'Username (no emojis)';

    const passInput = document.getElementById('auth-password') as HTMLInputElement | null;
    if (passInput) passInput.placeholder = isEt ? 'Parool' : 'Password';

    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) loginBtn.textContent = isEt ? 'Logi sisse' : 'Login';

    const regBtn = document.getElementById('btn-register');
    if (regBtn) regBtn.textContent = isEt ? 'Registreeru' : 'Register';

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.textContent = isEt ? 'Logi välja' : 'Logout';

    const loggedInAs = document.querySelector('#user-info h3');
    if (loggedInAs) {
        const emailSpan = document.getElementById('user-email');
        const spanHtml = emailSpan ? emailSpan.outerHTML : '';
        loggedInAs.innerHTML = isEt ? `Sisse logitud kui: ${spanHtml}` : `Logged in as: ${spanHtml}`;
    }

    // Recently Played Games Section Header
    const recSub = document.getElementById('recently-played-subheading-text');
    if (recSub) recSub.textContent = isEt ? 'MÄNGUDE AJALUGU' : 'GAME HISTORY';

    const recTitle = document.getElementById('recently-played-title-text');
    if (recTitle) recTitle.textContent = isEt ? '⏱️ Viimati mängitud mängud' : '⏱️ Recently Played Games';

    const recHintStrong = document.getElementById('recently-played-hint-strong');
    if (recHintStrong) recHintStrong.textContent = isEt ? 'Kõige vasakul' : 'Most recent';

    const recHintSpan = document.getElementById('recently-played-hint-span');
    if (recHintSpan) recHintSpan.textContent = isEt ? 'on viimati mängitud mäng' : 'on the far left';

    // Official simulators header
    const officialH2 = document.querySelector('.hub-container > h2');
    if (officialH2) officialH2.textContent = isEt ? 'Ametlikud simulaatorid' : 'Official Simulators';

    // Racing Game Card
    const racingCard = document.getElementById('card-racing-game');
    if (racingCard) {
        const p2 = racingCard.querySelector('p');
        if (p2) p2.textContent = isEt
            ? 'Sõida kiirete sportautode ja mootorratastega ringradadel vastaste vastu.'
            : 'Race high-speed sports cars and motorcycles on challenging circuits against opponents.';
        const t2 = racingCard.querySelector('.reward-tag span:last-child');
        if (t2) t2.textContent = isEt ? 'Ringraja võidusõit' : 'Circuit Racing Experience';
    }

    // Cooking Game Card
    const cookingCard = document.getElementById('card-cooking-game');
    if (cookingCard) {
        const pCook = cookingCard.querySelector('p');
        if (pCook) pCook.textContent = isEt
            ? 'Valmista restorani peakokana burgereid, pitsasid ja pastasid, täida klientide tellimusi ja teeni Jarde!'
            : 'Cook burgers, pizzas, and pasta dishes as master chef, satisfy customer orders, and earn Yards!';
        const tCook = cookingCard.querySelector('.reward-tag span:last-child');
        if (tCook) tCook.textContent = isEt ? '💎 TEENI SIIN JARDE (+20Y kuni +40Y tellimuselt)' : '💎 EARN YARDS HERE (+20Y to +40Y per order)';
    }

    // War Game Card
    const warCard = document.getElementById('card-war-game');
    if (warCard) {
        const h2 = warCard.querySelector('h2');
        if (h2) h2.textContent = isEt ? '⚔️ War game' : '⚔️ 3D War Simulator';
        const pWar = warCard.querySelector('p');
        if (pWar) pWar.textContent = isEt
            ? 'Juhi võimsaid 3D tanke ja sõdureid, kasuta taktikalist tulejõudu, purusta vastased ja teeni mänguraha!'
            : 'Command powerful 3D tanks and soldiers, unleash tactical firepower, defeat enemy forces, and earn War Cash!';
        const tWar = warCard.querySelector('.reward-tag span:last-child');
        if (tWar) tWar.textContent = isEt ? '💰 10v10 LAHING · TEENI MÄNGURAHA (+150 € / +1,000 €)' : '💰 10v10 BATTLE · EARN WAR CASH (+150 € / +1,000 €)';
        const warPill = warCard.querySelector('.war-badge-pill');
        if (warPill) warPill.textContent = isEt ? '👑 10v10 LAHING' : '⚔️ 10v10 MULTIPLAYER';
    }

    // Train Game Card
    const trainCard = document.getElementById('card-train-game');
    if (trainCard) {
        const h2 = trainCard.querySelector('h2');
        if (h2) h2.textContent = isEt ? '🚂 Rongimäng' : '🚂 3D Train Simulator';
        const pTrain = trainCard.querySelector('p');
        if (pTrain) pTrain.textContent = isEt
            ? 'Juhi võimsat 3D vedurit mööda maalilist raudteevõrku, vaheta pöörmeid, lase vilet, teeninda jaamu ja teeni Rongiraha!'
            : 'Drive realistic 3D locomotives across scenic railway networks, switch tracks, blow the horn, stop at stations, and earn Train Money!';
        const tTrain = trainCard.querySelector('.reward-tag span:last-child');
        if (tTrain) tTrain.textContent = isEt ? '🪙 JAAMAPEATUSED (+50 € Rongiraha jaama kohta)' : '🪙 STATION STOPS (+50 € Train Money per stop)';
        const ownerPill = trainCard.querySelector('.owner-badge-pill');
        if (ownerPill) ownerPill.textContent = isEt ? '👑 PLAYARD OWNER' : '🔥 NEW 3D GAME';
    }

    // Community section
    const commH2 = document.querySelector('#btn-hub-create-game')?.previousElementSibling?.querySelector('h2');
    if (commH2) commH2.innerHTML = isEt ? '<span>🌐</span> Kogukonna loodud mängud' : '<span>🌐</span> Community Created Games';

    const commP = document.querySelector('#btn-hub-create-game')?.previousElementSibling?.querySelector('p');
    if (commP) commP.textContent = isEt
        ? 'Mängi mängijate loodud ja administraatori poolt heaks kiidetud 3D mänge!'
        : 'Play 3D worlds created by players and approved by admins!';

    const hubCreateBtn = document.getElementById('btn-hub-create-game');
    if (hubCreateBtn) hubCreateBtn.textContent = isEt ? '✨ Loo uus mäng' : '✨ Create New Game';

    const floatCreateBtn = document.querySelector('#btn-create-game span:last-child');
    if (floatCreateBtn) floatCreateBtn.textContent = isEt ? 'Loo mäng' : 'Create Game';

    // Modals
    const streakTitle = document.querySelector('#modal-streak h2');
    if (streakTitle) streakTitle.textContent = isEt ? '🎁 7-Päevane Igapäevane Yardide Seeria' : '🎁 Daily 7-Day Yard Streak';

    const streakSub = document.querySelector('#modal-streak p');
    if (streakSub) streakSub.textContent = isEt
        ? 'Logi sisse iga 24h järel Yardide lunastamiseks. Hoia 7-päevane seeria elus, et saada 7. päeva Jackpot!'
        : 'Log in every 24h to claim Yards. Keep your 7-day streak alive to earn the Day 7 Jackpot!';

    const countdownLabel = document.querySelector('#streak-countdown-box span:first-child');
    if (countdownLabel) countdownLabel.textContent = isEt ? '⏳ Järgmine +100 Y preemia:' : '⏳ Next +100 Y Reward:';

    const debugReset = document.getElementById('btn-debug-reset');
    if (debugReset) debugReset.textContent = isEt ? '🔄 Lähtesta seeria ja taimer' : '🔄 Reset Streak & Timer';

    const debugFf = document.getElementById('btn-debug-fastforward');
    if (debugFf) debugFf.textContent = isEt ? '⚡ Keri edasi +24h (Admin)' : '⚡ Fast Forward +24h (Admin)';

    // Admin Panel Modal (Update Hub)
    const adminPanelH2 = document.querySelector('#modal-admin-panel h2');
    if (adminPanelH2) adminPanelH2.textContent = isEt ? 'Admini Uuenduste Paneel' : 'Admin Update Hub';

    const adminPanelSub = document.querySelector('#modal-admin-panel > .modal-card > p');
    if (adminPanelSub) adminPanelSub.innerHTML = isEt
        ? 'Logitud sisse kui <strong style="color: #ffd32a;">Admin✅</strong> (<span style="color: #00f2fe;">grx@trenet.ee</span>). Siin saad koostada uusi mängu- ja süsteemiuuendusi ning saata need otse Playard Owneri andmebaasi.'
        : 'Logged in as <strong style="color: #ffd32a;">Admin✅</strong> (<span style="color: #00f2fe;">grx@trenet.ee</span>). Write new updates and send them directly to Playard Owner database.';
}
