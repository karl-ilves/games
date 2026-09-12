export const estToEngDict: Record<string, string> = {
    // Creator Studio
    "Mängusisene Pood / Item Shop": "In-Game Shop / Item Shop",
    "Alustada uut tühja mängu? Pooleli olev mäng jääb alles \"My Games\" alla.": "Start a new empty game? Current progress will be saved in \"My Games\".",
    "Salvestamine edukas!": "Save successful!",
    "Salvestan...": "Saving...",
    "Viga salvestamisel!": "Error saving!",
    "Oled sa kindel, et soovid kustutada?": "Are you sure you want to delete?",
    "Kustuta": "Delete",
    "Tervis sai otsa! Vali, kas soovid taassündida kontrollpunktis või redigeerida mängu.": "Out of health! Choose to respawn at checkpoint or edit the game.",
    "Object Script / Loogika": "Object Script / Logic",
    "Mängu alguses kohe (On Start)": "Immediately on Start",
    "Kuva dialoogiaken / tekst": "Show dialog / text",
    "Salvesta Skript": "Save Script",
    "Uus Maa Mäng (Land)": "New Land Game",
    "Uus Mere Mäng (Sea)": "New Sea Game",
    "Uus Linn": "New City",
    "Asjade Loomise Töölaud (Custom Item Creator)": "Custom Item Creator",
    "Vali kuju, nihuta tasapindasid üles/alla ja loo oma unikaalne 3D ese!": "Select shape, move planes up/down and create your unique 3D item!",
    "Salvesta (Save)": "Save",
    "Tagasi (Back)": "Back",
    "Välju": "Exit",
    "Mängi (Play)": "Play",
    "Muuda (Edit)": "Edit",
    "Avalikusta (Publish)": "Publish",
    "Loo uus mäng": "Create new game",
    "Salvesta mäng": "Save Game",
    "Proovi Mängu": "Test Game",
    "Minu Mängud": "My Games",
    "Kogukonna Mängud": "Community Games",
    "Jaga Mängu": "Share Game",
    
    // Hub
    "Tere tulemast Playardi": "Welcome to Playard",
    "Ametlikud simulaatorid": "Official Simulators",
    "Kogukonna loodud mängud": "Community Created Games",
    "Mängi 3D simulaatoreid, avasta kogukonna loodud maailmu ja loo oma mänge!": "Play 3D simulators, explore community-created worlds, and create your own games!",
    "Konto sisselogimine / Registreerimine": "Account Login / Register",
    "Logi sisse, et luua mänge ja salvestada oma progress": "Log in to create games & save your progress",
    "E-post": "E-mail",
    "Kasutajanimi (ilma emotikonideta)": "Username (no emojis)",
    "Parool": "Password",
    "Logi sisse": "Login",
    "Registreeru": "Register",
    "Logi välja": "Logout",
    "Sisse logitud kui:": "Logged in as:",
    "MÄNGUDE AJALUGU": "GAME HISTORY",
    "Viimati mängitud mängud": "Recently Played Games",
    "Kõige vasakul": "Most recent",
    "on viimati mängitud mäng": "is the last played game",
    "Ringraja võidusõit": "Circuit Racing Experience",
    "TEENI SIIN JARDE": "EARN YARDS HERE",
    "TEENI MÄNGURAHA": "EARN GAME MONEY",
    "JAAMAPEATUSED": "STATION STOPS",
    "Takistusrada": "Obstacle Course",
    "CHECKPOINT PREEMIAD": "CHECKPOINT REWARDS",
    "PLAYARD OWNER EKSKLUSIIV": "PLAYARD OWNER EXCLUSIVE",
    "Viimane Metroo": "Last Metro",
    "MÜSTEERIUM & LÕPUTUD VAGUNID": "MYSTERY & INFINITE CARRIAGES",
    "SURVIVE & SOLVE": "SURVIVE & SOLVE",
    "Loo mäng": "Create Game",
    "Igapäevased preemiad": "Daily Rewards",
    "Admini paneel": "Admin Panel",
    "Andmebaas": "Database",
    "Oled kindel, et soovid selle mängu kustutada?": "Are you sure you want to delete this game?",
    "Laen andmebaasist mänge...": "Loading games from database...",
    "Andmebaasis ei ole ühtegi mängu.": "No games in the database.",
    "Looja:": "Creator:",
    "Staatus:": "Status:",
    "Loodud:": "Created:",
    "KUSTUTA ANDMEBAASIST: Oled sa täiesti kindel? Seda ei saa tagasi võtta!": "DELETE FROM DATABASE: Are you absolutely sure? This cannot be undone!",
    "Viga andmebaasi laadimisel!": "Error loading database!",
    
    // In-game common
    "Sinu raha:": "Your money:",
    "Osta": "Buy",
    "Varusta": "Equip",
    "Müüdud": "Sold out",
    "Tagasi menüüsse": "Back to menu",
    "Võit!": "Victory!",
    "Kaotus!": "Defeat!",
    "Punktid:": "Points:",
    "Aeg:": "Time:"
};

// Function to translate text dynamically
export function t(estText: string): string {
    const lang = (window as any).playardCurrentLang || 'en';
    if (lang === 'et') return estText; // Estonian user gets original text
    
    // Exact match
    if (estToEngDict[estText]) return estToEngDict[estText];
    
    // Trimmed match
    const trimmed = estText.trim();
    if (estToEngDict[trimmed]) {
        return estText.replace(trimmed, estToEngDict[trimmed]);
    }
    
    // Fallback: return original if no translation found
    return estText;
}

export function translateDOM(root: HTMLElement) {
    const lang = (window as any).playardCurrentLang || 'en';
    if (lang === 'et') return; // Do not modify DOM for Estonian users

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.trim().length > 0) {
            const original = node.nodeValue;
            const translated = t(original);
            if (original !== translated) {
                node.nodeValue = translated;
            } else {
                // Try to find substrings (basic)
                let newStr = original;
                for (const [est, eng] of Object.entries(estToEngDict)) {
                    if (newStr.includes(est)) {
                        newStr = newStr.replace(est, eng);
                    }
                }
                if (newStr !== original) {
                    node.nodeValue = newStr;
                }
            }
        }
    }
    
    // Translate placeholders
    const inputs = root.querySelectorAll('input, textarea');
    inputs.forEach((el: any) => {
        if (el.placeholder) {
            const tr = t(el.placeholder);
            if (tr !== el.placeholder) el.placeholder = tr;
        }
    });
}
