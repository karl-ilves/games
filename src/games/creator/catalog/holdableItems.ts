// --- 1000 Holdable Items Catalog for Playard Creator Studio ---
// 10 distinct categories x 100 items = exactly 1000 unique holdable items.
// 50 of these items are battle weapons that take away lives/HP (dealsDamage: true, damageAmount: 10-75).

export interface HoldableCatalogItem {
    id: string;
    name: string;
    category: 'holdable';
    icon: string;
    color: string;
    geometryType: string;
    baseScale: number;
    isHoldable: boolean;
    inHandAtStart: boolean;
    costsPbx: boolean;
    pbxPrice: number;
    dealsDamage?: boolean;
    damageAmount?: number;
    subCategory: string;
}

export function get1000HoldableCatalogItems(): HoldableCatalogItem[] {
    const items: HoldableCatalogItem[] = [];

    // --- 1. Battle Weapons & Combat (100 items) ---
    // The first 50 items deal damage to players/enemies! (dealsDamage: true, damageAmount customizable)
    const weaponBases = [
        { name: 'Mõõk (Sword)', icon: '⚔️', shape: 'sword', damage: 25 },
        { name: 'Laser Mõõk (Laser Saber)', icon: '🗡️', shape: 'cylinder', damage: 35 },
        { name: 'Draakoni Kirves (Dragon Axe)', icon: '🪓', shape: 'box', damage: 45 },
        { name: 'Mürgine Puss (Poison Dagger)', icon: '🗡️', shape: 'cone', damage: 20 },
        { name: 'Piksenool (Thunder Bow)', icon: '🏹', shape: 'cylinder', damage: 30 },
        { name: 'Tulekepp (Fire Wand)', icon: '🪄', shape: 'cylinder', damage: 40 },
        { name: 'Sõjahaamer (War Hammer)', icon: '🔨', shape: 'box', damage: 50 },
        { name: 'Katana (Ninja Blade)', icon: '⚔️', shape: 'cylinder', damage: 35 },
        { name: 'Vikat (Grim Scythe)', icon: '🪓', shape: 'cone', damage: 60 },
        { name: 'Plasma Kahur (Plasma Blaster)', icon: '🔫', shape: 'cylinder', damage: 55 }
    ];

    const weaponModifiers = [
        'Kuldne', 'Tuline', 'Jäine', 'Pimeduse', 'Kosmiline', 
        'Smaragdne', 'Neoon', 'Iidne', 'Vampiiri', 'Küber'
    ];
    const weaponColors = ['#f1c40f', '#e74c3c', '#00cec9', '#2c3e50', '#a855f7', '#2ecc71', '#00f2fe', '#d35400', '#c0392b', '#38bdf8'];

    let weaponCount = 0;
    weaponModifiers.forEach((mod, modIdx) => {
        weaponBases.forEach((base, baseIdx) => {
            weaponCount++;
            const isOneOf50Damage = weaponCount <= 50;
            const dmg = isOneOf50Damage ? Math.round(base.damage + (modIdx * 3)) : 0;
            items.push({
                id: `holdable_wep_${weaponCount}`,
                name: `${mod} ${base.name} #${weaponCount}`,
                category: 'holdable',
                subCategory: 'weapons',
                icon: base.icon,
                color: weaponColors[(modIdx + baseIdx) % weaponColors.length],
                geometryType: base.shape,
                baseScale: 0.65,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: weaponCount % 2 === 0,
                pbxPrice: weaponCount % 2 === 0 ? (20 + (weaponCount % 10) * 10) : 0,
                dealsDamage: isOneOf50Damage,
                damageAmount: dmg
            });
        });
    });

    // --- 2. Mining & Utility Tools (100 items) ---
    const toolBases = [
        { name: 'Kirk (Pickaxe)', icon: '⛏️', shape: 'cone' },
        { name: 'Labidas (Shovel)', icon: '🪣', shape: 'cylinder' },
        { name: 'Taskulamp (Flashlight)', icon: '🔦', shape: 'cylinder' },
        { name: 'Kompass (Compass)', icon: '🧭', shape: 'sphere' },
        { name: 'Suur Luup (Magnifier)', icon: '🔍', shape: 'cylinder' },
        { name: 'Mutrivõti (Wrench)', icon: '🔧', shape: 'box' },
        { name: 'Raadiojaam (Walkie Talkie)', icon: '📻', shape: 'box' },
        { name: 'Binokkel (Binoculars)', icon: '🔭', shape: 'cylinder' },
        { name: 'Mõõdulint (Tape Measure)', icon: '📏', shape: 'box' },
        { name: 'Kuldne Võti (Golden Key)', icon: '🔑', shape: 'cylinder' }
    ];
    const toolMods = ['Titaan', 'Vase', 'Raua', 'Teemant', 'Obsidiaan', 'Kuld', 'Küber', 'Tulekindel', 'Süvavee', 'Ultra'];
    const toolColors = ['#95a5a6', '#e67e22', '#bdc3c7', '#3498db', '#34495e', '#f39c12', '#00f2fe', '#d35400', '#0984e3', '#e056fd'];

    let toolCount = 0;
    toolMods.forEach((mod, modIdx) => {
        toolBases.forEach((base, baseIdx) => {
            toolCount++;
            items.push({
                id: `holdable_tool_${toolCount}`,
                name: `${mod} ${base.name} #${toolCount}`,
                category: 'holdable',
                subCategory: 'tools',
                icon: base.icon,
                color: toolColors[(modIdx + baseIdx) % toolColors.length],
                geometryType: base.shape,
                baseScale: 0.6,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: toolCount % 3 === 0,
                pbxPrice: toolCount % 3 === 0 ? 30 : 0
            });
        });
    });

    // --- 3. Food, Snacks & Drinks (100 items) ---
    const foodBases = [
        { name: 'Punane Õun (Apple)', icon: '🍎', shape: 'sphere' },
        { name: 'Juustuburger (Burger)', icon: '🍔', shape: 'cylinder' },
        { name: 'Pitsa Lõik (Pizza Slice)', icon: '🍕', shape: 'cone' },
        { name: 'Friikartulid (Fries)', icon: '🍟', shape: 'box' },
        { name: 'Šokolaadi Donut (Donut)', icon: '🍩', shape: 'cylinder' },
        { name: 'Jäätisetuutu (Ice Cream)', icon: '🍦', shape: 'cone' },
        { name: 'Sünnipäevatort (Cake)', icon: '🎂', shape: 'cylinder' },
        { name: 'Banaan (Banana)', icon: '🍌', shape: 'cylinder' },
        { name: 'Krõbe Taco (Taco)', icon: '🌮', shape: 'cone' },
        { name: 'Kuum Kohv (Hot Coffee)', icon: '☕', shape: 'cylinder' }
    ];
    const foodMods = ['Maitsev', 'Super', 'Kuninglik', 'Värske', 'Magus', 'Vürtsikas', 'Kuldne', 'Hiiglaslik', 'Külm', 'Gurmee'];
    const foodColors = ['#e74c3c', '#f39c12', '#f1c40f', '#e67e22', '#d35400', '#c0392b', '#ffd32a', '#ff7675', '#00cec9', '#a0522d'];

    let foodCount = 0;
    foodMods.forEach((mod, modIdx) => {
        foodBases.forEach((base, baseIdx) => {
            foodCount++;
            items.push({
                id: `holdable_food_${foodCount}`,
                name: `${mod} ${base.name} #${foodCount}`,
                category: 'holdable',
                subCategory: 'food',
                icon: base.icon,
                color: foodColors[(modIdx + baseIdx) % foodColors.length],
                geometryType: base.shape,
                baseScale: 0.55,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: foodCount % 4 === 0,
                pbxPrice: foodCount % 4 === 0 ? 15 : 0
            });
        });
    });

    // --- 4. Magic Relics & Fantasy (100 items) ---
    const magicBases = [
        { name: 'Võlukepp (Magic Wand)', icon: '🪄', shape: 'cylinder' },
        { name: 'Loitsuraamat (Spellbook)', icon: '📖', shape: 'box' },
        { name: 'Kristallkuul (Crystal Orb)', icon: '🔮', shape: 'sphere' },
        { name: 'Püha Amulett (Holy Amulet)', icon: '🧿', shape: 'cylinder' },
        { name: 'Tähesau (Starlight Staff)', icon: '⭐', shape: 'cylinder' },
        { name: 'Draakonimuna (Dragon Egg)', icon: '🥚', shape: 'sphere' },
        { name: 'Fööniksi Sulg (Phoenix Feather)', icon: '🪶', shape: 'cone' },
        { name: 'Ajaratas (Time Hourglass)', icon: '⏳', shape: 'cylinder' },
        { name: 'Haldjatolm (Fairy Dust Flask)', icon: '✨', shape: 'sphere' },
        { name: 'Runic Tablet (Ruunikivi)', icon: '📜', shape: 'box' }
    ];
    const magicMods = ['Müstiline', 'Virmaliste', 'Taevalik', 'Põrgu', 'Tähe', 'Kuukiire', 'Päikese', 'Teadvuse', 'Igavene', 'Kuldne'];
    const magicColors = ['#9b59b6', '#3498db', '#e056fd', '#e74c3c', '#f1c40f', '#00cec9', '#ff9f1a', '#1abc9c', '#6c5ce7', '#ffd32a'];

    let magicCount = 0;
    magicMods.forEach((mod, modIdx) => {
        magicBases.forEach((base, baseIdx) => {
            magicCount++;
            items.push({
                id: `holdable_magic_${magicCount}`,
                name: `${mod} ${base.name} #${magicCount}`,
                category: 'holdable',
                subCategory: 'magic',
                icon: base.icon,
                color: magicColors[(modIdx + baseIdx) % magicColors.length],
                geometryType: base.shape,
                baseScale: 0.6,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: magicCount % 2 === 0,
                pbxPrice: magicCount % 2 === 0 ? 50 : 0
            });
        });
    });

    // --- 5. Tech & Cyber Gadgets (100 items) ---
    const techBases = [
        { name: 'Nutitelefon (Smart Phone)', icon: '📱', shape: 'box' },
        { name: 'Mängupult (Game Controller)', icon: '🎮', shape: 'box' },
        { name: 'Drooni Pult (Drone Remote)', icon: '🛸', shape: 'box' },
        { name: 'Kõrvaklapid (Headphones)', icon: '🎧', shape: 'cylinder' },
        { name: 'Küber Sülearvuti (Cyber Laptop)', icon: '💻', shape: 'box' },
        { name: 'Hologrammi Seade (Holo Projector)', icon: '💡', shape: 'cylinder' },
        { name: 'Kvantkiip (Quantum Chip)', icon: '💾', shape: 'box' },
        { name: 'Laserpointer (Laser Pointer)', icon: '🔴', shape: 'cylinder' },
        { name: 'Küberprillid (AR Visor)', icon: '🥽', shape: 'box' },
        { name: 'Elektrooniline Lukk (Cyber Keycard)', icon: '💳', shape: 'box' }
    ];
    const techMods = ['Küber', 'Tuleviku', 'Nano', 'Holo', 'Laser', 'Neoon', 'Kvant', 'AI', 'Matrix', 'Pro'];
    const techColors = ['#00f2fe', '#00cec9', '#38bdf8', '#a855f7', '#ff007f', '#2ecc71', '#0984e3', '#ffd32a', '#74b9ff', '#10b981'];

    let techCount = 0;
    techMods.forEach((mod, modIdx) => {
        techBases.forEach((base, baseIdx) => {
            techCount++;
            items.push({
                id: `holdable_tech_${techCount}`,
                name: `${mod} ${base.name} #${techCount}`,
                category: 'holdable',
                subCategory: 'tech',
                icon: base.icon,
                color: techColors[(modIdx + baseIdx) % techColors.length],
                geometryType: base.shape,
                baseScale: 0.55,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: techCount % 3 === 0,
                pbxPrice: techCount % 3 === 0 ? 40 : 0
            });
        });
    });

    // --- 6. Potions & Flasks (100 items) ---
    const potionBases = [
        { name: 'Tervisepudel (Health Potion)', icon: '🧪', shape: 'cylinder' },
        { name: 'Kiiruse Eliksiir (Speed Elixir)', icon: '⚡', shape: 'cylinder' },
        { name: 'Nähtamatuse Jook (Invisibility Brew)', icon: '👻', shape: 'cylinder' },
        { name: 'Superhüppe Jook (Jump Brew)', icon: '🦘', shape: 'cylinder' },
        { name: 'Kaitsekilbi Eliksiir (Shield Elixir)', icon: '🛡️', shape: 'cylinder' },
        { name: 'Lava Immuunsus (Lava Immunity)', icon: '🔥', shape: 'cylinder' },
        { name: 'Hinge Eliksiir (Soul Elixir)', icon: '💜', shape: 'sphere' },
        { name: 'Õnnejook (Lucky Brew)', icon: '🍀', shape: 'sphere' },
        { name: 'Kulla Eliksiir (Midas Gold)', icon: '💰', shape: 'cylinder' },
        { name: 'Veehingamise Jook (Water Breath)', icon: '🫧', shape: 'cylinder' }
    ];
    const potionMods = ['Vägev', 'Suur', 'Plahvatav', 'Kristall', 'Vana', 'Keemiline', 'Salajane', 'Puhas', 'Imeväeline', 'Lõpmatu'];
    const potionColors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#00cec9', '#ffd32a', '#e056fd'];

    let potionCount = 0;
    potionMods.forEach((mod, modIdx) => {
        potionBases.forEach((base, baseIdx) => {
            potionCount++;
            items.push({
                id: `holdable_pot_${potionCount}`,
                name: `${mod} ${base.name} #${potionCount}`,
                category: 'holdable',
                subCategory: 'potions',
                icon: base.icon,
                color: potionColors[(modIdx + baseIdx) % potionColors.length],
                geometryType: base.shape,
                baseScale: 0.5,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: potionCount % 3 === 0,
                pbxPrice: potionCount % 3 === 0 ? 25 : 0
            });
        });
    });

    // --- 7. Music & Instruments (100 items) ---
    const musicBases = [
        { name: 'Akustiline Kitarr (Guitar)', icon: '🎸', shape: 'box' },
        { name: 'Kuldne Mikrofon (Gold Mic)', icon: '🎤', shape: 'cylinder' },
        { name: 'Trummipulk (Drum Stick)', icon: '🥁', shape: 'cylinder' },
        { name: 'Viiul (Violin)', icon: '🎻', shape: 'box' },
        { name: 'Trompet (Trumpet)', icon: '🎺', shape: 'cone' },
        { name: 'Saksofon (Saxophone)', icon: '🎷', shape: 'cylinder' },
        { name: 'DJ Kõrvaklapid (DJ Cans)', icon: '🎧', shape: 'cylinder' },
        { name: 'Boombox Makk (Boombox)', icon: '📻', shape: 'box' },
        { name: 'Muusikakarp (Music Box)', icon: '🎵', shape: 'box' },
        { name: 'Kuninglik Pasun (Royal Horn)', icon: '📯', shape: 'cone' }
    ];
    const musicMods = ['Rockstaari', 'Klassikaline', 'Elektriline', 'Jazz', 'Kuldlõikeline', 'Soolo', 'Kontsert', 'Disko', 'Meloodiline', 'Virtuoosne'];
    const musicColors = ['#e74c3c', '#ffd32a', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#00cec9', '#2c3e50', '#e056fd', '#f1c40f'];

    let musicCount = 0;
    musicMods.forEach((mod, modIdx) => {
        musicBases.forEach((base, baseIdx) => {
            musicCount++;
            items.push({
                id: `holdable_music_${musicCount}`,
                name: `${mod} ${base.name} #${musicCount}`,
                category: 'holdable',
                subCategory: 'music',
                icon: base.icon,
                color: musicColors[(modIdx + baseIdx) % musicColors.length],
                geometryType: base.shape,
                baseScale: 0.65,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: musicCount % 2 === 0,
                pbxPrice: musicCount % 2 === 0 ? 35 : 0
            });
        });
    });

    // --- 8. Sports & Adventure Gear (100 items) ---
    const sportBases = [
        { name: 'Rula (Skateboard)', icon: '🛹', shape: 'box' },
        { name: 'Korvpall (Basketball)', icon: '🏀', shape: 'sphere' },
        { name: 'Jalgpall (Soccer Ball)', icon: '⚽', shape: 'sphere' },
        { name: 'Tennisereket (Tennis Racket)', icon: '🎾', shape: 'cylinder' },
        { name: 'Pesapallikurikas (Baseball Bat)', icon: '🏏', shape: 'cylinder' },
        { name: 'Võidukarikas (Champion Trophy)', icon: '🏆', shape: 'cylinder' },
        { name: 'Kuldmedal (Gold Medal)', icon: '🥇', shape: 'cylinder' },
        { name: 'Seikluse Tõrvik (Adventure Torch)', icon: '🔥', shape: 'cylinder' },
        { name: 'Ronimiskonks (Grapple Hook)', icon: '🪝', shape: 'cone' },
        { name: 'Päästerõngas (Lifebuoy)', icon: '🛟', shape: 'cylinder' }
    ];
    const sportMods = ['Meisterlik', 'Proff', 'Kiire', 'Tšempioni', 'Kuldne', 'Olümpiamängude', 'Ekstreemne', 'Legendaarne', 'Võitmatu', 'Kangelase'];
    const sportColors = ['#f39c12', '#e67e22', '#2ecc71', '#3498db', '#f1c40f', '#ffd32a', '#e74c3c', '#00cec9', '#a855f7', '#34495e'];

    let sportCount = 0;
    sportMods.forEach((mod, modIdx) => {
        sportBases.forEach((base, baseIdx) => {
            sportCount++;
            items.push({
                id: `holdable_sport_${sportCount}`,
                name: `${mod} ${base.name} #${sportCount}`,
                category: 'holdable',
                subCategory: 'sports',
                icon: base.icon,
                color: sportColors[(modIdx + baseIdx) % sportColors.length],
                geometryType: base.shape,
                baseScale: 0.6,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: sportCount % 3 === 0,
                pbxPrice: sportCount % 3 === 0 ? 30 : 0
            });
        });
    });

    // --- 9. Toys, Companions & Fun (100 items) ---
    const toyBases = [
        { name: 'Kaisukaru (Teddy Bear)', icon: '🧸', shape: 'sphere' },
        { name: 'Robotmänguasi (Toy Robot)', icon: '🤖', shape: 'box' },
        { name: 'Õhupall (Party Balloon)', icon: '🎈', shape: 'sphere' },
        { name: 'Vurri (Fidget Spinner)', icon: '🪀', shape: 'cylinder' },
        { name: 'Vesipüstol (Water Gun)', icon: '🔫', shape: 'box' },
        { name: 'Pehme Jänku (Plush Bunny)', icon: '🐰', shape: 'sphere' },
        { name: 'Vikerkaare Mullitaja (Bubble Wand)', icon: '🫧', shape: 'cylinder' },
        { name: 'Paberlennuk (Paper Plane)', icon: '✈️', shape: 'cone' },
        { name: 'Mänguauto (Toy Racecar)', icon: '🏎️', shape: 'box' },
        { name: 'Käpiknukk (Hand Puppet)', icon: '🎭', shape: 'cylinder' }
    ];
    const toyMods = ['Armas', 'Pehme', 'Lõbus', 'Mänguline', 'Särav', 'Värviline', 'Sõbralik', 'Võrratu', 'Kaisukas', 'Kuldne'];
    const toyColors = ['#ff7675', '#74b9ff', '#ffeaa7', '#55efc4', '#a29bfe', '#fd79a8', '#fab1a0', '#00cec9', '#ffd32a', '#ff9ff3'];

    let toyCount = 0;
    toyMods.forEach((mod, modIdx) => {
        toyBases.forEach((base, baseIdx) => {
            toyCount++;
            items.push({
                id: `holdable_toy_${toyCount}`,
                name: `${mod} ${base.name} #${toyCount}`,
                category: 'holdable',
                subCategory: 'toys',
                icon: base.icon,
                color: toyColors[(modIdx + baseIdx) % toyColors.length],
                geometryType: base.shape,
                baseScale: 0.55,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: toyCount % 4 === 0,
                pbxPrice: toyCount % 4 === 0 ? 10 : 0
            });
        });
    });

    // --- 10. Gems, Crystals & Royal Treasures (100 items) ---
    const gemBases = [
        { name: 'Smaragd (Emerald Gem)', icon: '💎', shape: 'cone' },
        { name: 'Rubiin (Ruby Crystal)', icon: '♦️', shape: 'cone' },
        { name: 'Teemant (Diamond)', icon: '💎', shape: 'cone' },
        { name: 'Kullakang (Gold Ingot)', icon: '🪙', shape: 'box' },
        { name: 'Kuninga Kroon (Royal Crown)', icon: '👑', shape: 'cylinder' },
        { name: 'Aardekirst (Treasure Chest)', icon: '📦', shape: 'box' },
        { name: 'Hõbedane Karikas (Silver Goblet)', icon: '🏆', shape: 'cylinder' },
        { name: 'Pärl (Sea Pearl)', icon: '🦪', shape: 'sphere' },
        { name: 'Safiir (Sapphire Stone)', icon: '💠', shape: 'cone' },
        { name: 'Meteoriidi Tükk (Meteorite Ore)', icon: '🪨', shape: 'sphere' }
    ];
    const gemMods = ['Sädelev', 'Hindamatu', 'Iidne', 'Kuninglik', 'Hiiglaslik', 'Lõikamata', 'Puhas', 'Hõõguv', 'Täiuslik', 'Salajane'];
    const gemColors = ['#2ecc71', '#e74c3c', '#38bdf8', '#ffd32a', '#f1c40f', '#e67e22', '#bdc3c7', '#ecf0f1', '#0984e3', '#34495e'];

    let gemCount = 0;
    gemMods.forEach((mod, modIdx) => {
        gemBases.forEach((base, baseIdx) => {
            gemCount++;
            items.push({
                id: `holdable_gem_${gemCount}`,
                name: `${mod} ${base.name} #${gemCount}`,
                category: 'holdable',
                subCategory: 'gems',
                icon: base.icon,
                color: gemColors[(modIdx + baseIdx) % gemColors.length],
                geometryType: base.shape,
                baseScale: 0.5,
                isHoldable: true,
                inHandAtStart: false,
                costsPbx: gemCount % 2 === 0,
                pbxPrice: gemCount % 2 === 0 ? 100 : 0
            });
        });
    });

    return items;
}
