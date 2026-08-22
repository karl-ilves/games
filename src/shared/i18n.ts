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

    // Official simulators header
    const officialH2 = document.querySelector('.hub-container > h2');
    if (officialH2) officialH2.textContent = isEt ? 'Ametlikud simulaatorid' : 'Official Simulators';

    // Game cards
    const cards = document.querySelectorAll('.game-card');
    if (cards.length >= 3) {
        // Airplane
        const p1 = cards[0].querySelector('p');
        if (p1) p1.textContent = isEt
            ? 'Lenda Cessna või Boeinguga üle 3D linna, maandu lennuradadele ja naudi realistlikku ilmastikku.'
            : 'Fly a Cessna or Boeing over a realistic 3D city, land safely on runways, and navigate dynamic weather.';
        const t1 = cards[0].querySelector('.reward-tag span:last-child');
        if (t1) t1.textContent = isEt ? 'Realistlik lennusimulatsioon' : 'Realistic Flight Simulation';

        // Racing
        const p2 = cards[1].querySelector('p');
        if (p2) p2.textContent = isEt
            ? 'Sõida kiirete sportautode ja mootorratastega ringradadel vastaste vastu.'
            : 'Race high-speed sports cars and motorcycles on challenging circuits against opponents.';
        const t2 = cards[1].querySelector('.reward-tag span:last-child');
        if (t2) t2.textContent = isEt ? 'Ringraja võidusõit' : 'Circuit Racing Experience';

        // Space
        const spaceCard = document.querySelector('.game-card.disabled');
        if (spaceCard) {
            const p3 = spaceCard.querySelector('p');
            if (p3) p3.textContent = isEt
                ? 'Tähtedevaheline kosmoseuuring ja planeetide avastamine.'
                : 'Interstellar planetary exploration & space flight simulation.';
            const t3 = spaceCard.querySelector('.reward-tag span:last-child');
            if (t3) t3.textContent = isEt ? 'Varsti tulekul' : 'Coming Soon';
        }
    }

    // Cooking Game Card
    const cookingCard = document.getElementById('card-cooking-game');
    if (cookingCard) {
        const pCook = cookingCard.querySelector('p');
        if (pCook) pCook.textContent = isEt
            ? 'Valmista restorani peakokana burgereid, pitsasid ja pastasid, täida klientide tellimusi ja teeni Jarde!'
            : 'Cook burgers, pizzas, and pasta dishes as master chef, satisfy customer orders, and earn Yards!';
        const tCook = cookingCard.querySelector('.reward-tag span:last-child');
        if (tCook) tCook.textContent = isEt ? 'VIP Eksklusiivne Kokandusmäng' : 'VIP Exclusive Cooking Simulator';
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

    const promoTitle = document.querySelector('#modal-streak h4');
    if (promoTitle) promoTitle.textContent = isEt ? '🎁 Lunasta loojakoode' : '🎁 Redeem Creator Codes';

    const promoSub = document.querySelector('#modal-streak div p');
    if (promoSub) promoSub.innerHTML = isEt
        ? 'Sisesta kood, et saada rohkem Jarde. Uusi koode leiad <strong style="color: #ff4757;">SkyAviation2</strong> YouTube\'i kanalilt.'
        : 'Enter codes to get more Yards. You can find new codes by watching the <strong style="color: #ff4757;">SkyAviation2</strong> YouTube channel.';

    const promoInput = document.getElementById('promo-code-input') as HTMLInputElement | null;
    if (promoInput) promoInput.placeholder = isEt ? 'Sisesta kood (nt SKYAVIATION2)' : 'Enter code (e.g. SKYAVIATION2)';

    const redeemBtn = document.getElementById('btn-redeem-promo');
    if (redeemBtn) redeemBtn.textContent = isEt ? 'Lunasta' : 'Redeem';

    const debugReset = document.getElementById('btn-debug-reset');
    if (debugReset) debugReset.textContent = isEt ? '🔄 Lähtesta seeria ja taimer' : '🔄 Reset Streak & Timer';

    const debugFf = document.getElementById('btn-debug-fastforward');
    if (debugFf) debugFf.textContent = isEt ? '⚡ Keri edasi +24h (Admin)' : '⚡ Fast Forward +24h (Admin)';

    // Admin Panel Modal
    const adminPanelH2 = document.querySelector('#modal-admin-panel h2');
    if (adminPanelH2) adminPanelH2.textContent = isEt ? 'Playardi Salajane Administraatori Paneel' : 'Playard Secret Admin Panel';

    const adminPanelSub = document.querySelector('#modal-admin-panel > .modal-card > p');
    if (adminPanelSub) adminPanelSub.innerHTML = isEt
        ? 'Sisse logitud kui <strong>Admin✅</strong>. Vaata üle kasutajate mänge ja jaga Jarde.'
        : 'Logged in as <strong>Admin✅</strong>. Review creator games & grant Yards.';

    const tabReview = document.getElementById('tab-btn-review-games');
    if (tabReview) tabReview.textContent = isEt ? '🎮 Ülevaatust ootavad mängud' : '🎮 Games to Review';

    const tabGive = document.getElementById('tab-btn-give-yards');
    if (tabGive) tabGive.textContent = isEt ? '💎 Jaga Jarde kasutajanime järgi' : '💎 Give Yards by Username';

    const reviewH3 = document.querySelector('#admin-tab-review-games h3');
    if (reviewH3) reviewH3.textContent = isEt ? 'Esitatud mängud, mis ootavad heakskiitu' : 'Submitted Games Waiting for Approval';

    const giveH3 = document.querySelector('#admin-tab-give-yards h3');
    if (giveH3) giveH3.textContent = isEt ? 'Anna kasutajale Jarde kasutajanime järgi' : 'Grant Yards to User by Username';

    const giveBtn = document.getElementById('btn-admin-give-yards');
    if (giveBtn) giveBtn.textContent = isEt ? '💎 Anna Yardid' : '💎 Give Yards';

    const logsH4 = document.querySelector('#admin-tab-give-yards h4');
    if (logsH4) logsH4.textContent = isEt ? 'Viimased Yardide jagamise logid:' : 'Recent Yard Grant Logs:';
}
