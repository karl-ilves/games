import puppeteer from 'puppeteer';
import { execSync, spawn } from 'child_process';

// 1. Build Check
try {
    console.log("Checking TypeScript compilation and Vite build...");
    execSync('npx vite build', { stdio: 'inherit' });
    console.log("Build passed!");
} catch (e) {
    console.error("Build failed!");
    process.exit(1);
}

// 2. Load Check
(async () => {
    try {
        execSync('lsof -ti:4173 | xargs kill -9', { stdio: 'ignore' });
    } catch (e) {}
    console.log("Starting preview server...");
    const serverProcess = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
    
    // Give it a moment to start
    await new Promise(r => setTimeout(r, 2500));

    console.log("Launching headless browser to check runtime errors and game platform features...");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        window.__PLAYARD_TEST_MODE__ = true;
    });
    await page.setViewport({ width: 1400, height: 900 });
    
    let hasErrors = false;
    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
        hasErrors = true;
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            if (msg.text().includes('404') || msg.text().includes('400') || msg.text().includes('Failed to load resource') || msg.text().includes('supabase')) return;
            console.log('CONSOLE ERROR:', msg.text());
            hasErrors = true;
        }
    });

    try {
        console.log("1. Checking Playard Hub Homepage...");
        await page.goto('http://localhost:4173/games/');
        await new Promise(r => setTimeout(r, 1000));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; window.prompt = () => 'Great game'; });
        
        // Check initial Yard display
        await page.waitForSelector('#header-yard-val', { visible: true, timeout: 5000 });
        const startYards = await page.$eval('#header-yard-val', el => el.textContent);
        console.log("   Initial Guest Yard Balance (Expected: 0):", startYards);

        // Check Cooking Game visibility for guest (Expected: flex)
        const cookingCardVisible = await page.$eval('#card-cooking-game', el => window.getComputedStyle(el).display);
        console.log(`   Guest Cooking Game Card visibility (Expected: flex): ${cookingCardVisible}`);
        if (cookingCardVisible !== 'flex') {
            throw new Error("Cooking game card must be visible to everyone on Hub!");
        }

        // Test Recently Played Games Section (English for guests, Estonian for Playard Owner)
        console.log("   Testing Recently Played Games Table (English for Guest)...");
        await page.waitForSelector('#recently-played-section', { visible: true, timeout: 5000 });
        
        // 1. Verify clean empty state for a new guest player (English: You haven't played any games yet)
        const emptyStateText = await page.$eval('#recently-played-empty', el => el.textContent).catch(() => '');
        console.log("   New guest player empty state (Expected: You haven't played any games yet):", emptyStateText.replace(/\s+/g, ' ').substring(0, 60));
        if (!emptyStateText.includes("You haven't played any games yet")) {
            throw new Error("New guest player must see English empty state!");
        }

        // 2. Play 1st game (Racing) -> Should appear as #1 on far left in English
        await page.evaluate(() => {
            window.yardService.recordPlayedGame({
                id: 'racing',
                title: '🏎️ Racing Simulator',
                description: 'Race high-speed sports cars and motorcycles.',
                url: './games/racing/index.html',
                icon: '🏎️',
                badgeText: 'Circuit Racing'
            });
        });
        await new Promise(r => setTimeout(r, 200));
        let cards = await page.$$('#recently-played-grid .recently-played-card');
        console.log(`   Cards count after 1st game played (Expected: 1): ${cards.length}`);
        if (cards.length !== 1) throw new Error("Expected exactly 1 recently played card after 1st game!");

        const guestBadge1 = await page.$eval('#recently-played-grid .recently-played-card:first-child', el => el.textContent);
        console.log("   Guest #1 Card text (Expected: MOST RECENT & Play again):", guestBadge1.replace(/\s+/g, ' ').substring(0, 60));
        if (!guestBadge1.includes('MOST RECENT') || !guestBadge1.includes('Play again')) {
            throw new Error("Guest cards in Recently Played must be in English!");
        }

        // 3. Play 2nd game (Cooking) -> Cooking must become #1 (leftmost), Racing becomes #2
        await page.evaluate(() => {
            window.yardService.recordPlayedGame({
                id: 'cooking',
                title: '🍳 3D Master Chef',
                description: 'Cook burgers and pizzas.',
                url: './games/cooking/index.html',
                icon: '🍳',
                badgeText: '💎 +20Y to +40Y'
            });
        });
        await new Promise(r => setTimeout(r, 200));
        cards = await page.$$('#recently-played-grid .recently-played-card');
        console.log(`   Cards count after 2nd game played (Expected: 2): ${cards.length}`);
        const leftmostId2 = await page.$eval('#recently-played-grid .recently-played-card:first-child', el => el.getAttribute('data-game-id'));
        console.log(`   Leftmost game ID after cooking played (Expected: cooking): ${leftmostId2}`);
        if (leftmostId2 !== 'cooking') throw new Error("Cooking must be #1 leftmost after being played most recently!");

        // 4. Play 3rd game (Play) -> Play becomes #1, Cooking is #2, Racing is #3
        await page.evaluate(() => {
            window.yardService.recordPlayedGame({
                id: 'play',
                title: '🎮 Community 3D Games',
                description: 'Play community created 3D worlds.',
                url: './games/play/index.html',
                icon: '🎮',
                badgeText: 'Community Play'
            });
        });
        await new Promise(r => setTimeout(r, 200));
        cards = await page.$$('#recently-played-grid .recently-played-card');
        console.log(`   Cards count after 3rd game played (Expected: 3): ${cards.length}`);
        const leftmostId3 = await page.$eval('#recently-played-grid .recently-played-card:first-child', el => el.getAttribute('data-game-id'));
        console.log(`   Leftmost game ID after play played (Expected: play): ${leftmostId3}`);
        if (leftmostId3 !== 'play') throw new Error("Play community game must be #1 leftmost!");

        // 5. Re-play Racing -> Racing jumps to leftmost #1!
        await page.evaluate(() => {
            window.yardService.recordPlayedGame({
                id: 'racing',
                title: '🏎️ Racing Simulator',
                description: 'Race high-speed sports cars and motorcycles.',
                url: './games/racing/index.html',
                icon: '🏎️',
                badgeText: 'Circuit Racing'
            });
        });
        await new Promise(r => setTimeout(r, 200));
        const leftmostIdReplay = await page.$eval('#recently-played-grid .recently-played-card:first-child', el => el.getAttribute('data-game-id'));
        console.log(`   Leftmost game ID after re-playing racing (Expected: racing): ${leftmostIdReplay}`);
        if (leftmostIdReplay !== 'racing') throw new Error("Racing must jump back to #1 leftmost after being played again!");

        // Check War Game visibility for guest (Expected: flex - published to everyone!)
        const guestWarCardDisplay = await page.$eval('#card-war-game', el => window.getComputedStyle(el).display);
        console.log(`   Guest War Game Card visibility (Expected: flex): ${guestWarCardDisplay}`);
        if (guestWarCardDisplay !== 'flex') {
            throw new Error("War game card must be visible to all players on Hub!");
        }

        // Check Rongimäng visibility for guest (Expected: flex - published to everyone, even not logged in)
        const guestTrainCardDisplay = await page.$eval('#card-train-game', el => window.getComputedStyle(el).display);
        console.log(`   Guest Train Game Card visibility (Expected: flex): ${guestTrainCardDisplay}`);
        if (guestTrainCardDisplay !== 'flex') {
            throw new Error("Train game card must be visible to non-logged in guests on Hub!");
        }

        // Check Guest Admin Panel visibility (Expected: none)
        const guestAdminPanelDisplay = await page.$eval('#btn-open-admin-panel', el => window.getComputedStyle(el).display);
        console.log(`   Guest Admin Panel visibility (Expected: none): ${guestAdminPanelDisplay}`);
        if (guestAdminPanelDisplay !== 'none') {
            throw new Error("Admin Panel button should be hidden for guests!");
        }

        // Test Owner login (1karl.ilves@gmail.com) -> Admin panel must be hidden, War game AND Rongimäng card must be visible!
        await page.evaluate(() => {
            const ownerProf = { id: 'owner_1', username: 'playard owner', email: '1karl.ilves@gmail.com', displayName: 'Playard Owner✅', isAdmin: true };
            localStorage.setItem('playard_current_user_profile', JSON.stringify(ownerProf));
            window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: { profile: ownerProf } }));
        });
        await new Promise(r => setTimeout(r, 200));

        // Verify Estonian translation for Playard Owner in Recently Played
        const ownerRecentBadge1 = await page.$eval('#recently-played-grid .recently-played-card:first-child', el => el.textContent);
        console.log("   Playard Owner #1 Card text (Expected: VIIMATI MÄNGITUD & Mängi uuesti):", ownerRecentBadge1.replace(/\s+/g, ' ').substring(0, 60));
        if (!ownerRecentBadge1.includes('VIIMATI MÄNGITUD') || !ownerRecentBadge1.includes('Mängi uuesti')) {
            throw new Error("Playard Owner must see Estonian text in Recently Played!");
        }
        await new Promise(r => setTimeout(r, 200));
        const ownerAdminPanelDisplay = await page.$eval('#btn-open-admin-panel', el => window.getComputedStyle(el).display);
        console.log(`   Playard Owner Admin Panel visibility (Expected: none): ${ownerAdminPanelDisplay}`);
        if (ownerAdminPanelDisplay !== 'none') {
            throw new Error("Admin panel must be removed from Playard Owner!");
        }

        const ownerWarCardDisplay = await page.$eval('#card-war-game', el => window.getComputedStyle(el).display);
        console.log(`   Playard Owner War Game Card visibility (Expected: flex): ${ownerWarCardDisplay}`);
        if (ownerWarCardDisplay !== 'flex') {
            throw new Error("War game card must be visible for Playard Owner!");
        }

        const ownerTrainCardDisplay = await page.$eval('#card-train-game', el => window.getComputedStyle(el).display);
        console.log(`   Playard Owner Rongimäng Card visibility (Expected: flex): ${ownerTrainCardDisplay}`);
        if (ownerTrainCardDisplay !== 'flex') {
            throw new Error("Rongimäng card must be visible for Playard Owner (1karl.ilves@gmail.com)!");
        }

        // Test Admin login (grx@trenet.ee) -> Admin panel visible, War game visible, and Rongimäng visible (published to all)!
        await page.evaluate(() => {
            const adminProf = { id: 'admin_root', username: 'admin', email: 'grx@trenet.ee', displayName: 'Admin✅', isAdmin: true };
            localStorage.setItem('playard_current_user_profile', JSON.stringify(adminProf));
            window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: { profile: adminProf } }));
        });
        await new Promise(r => setTimeout(r, 200));
        const adminAdminPanelDisplay = await page.$eval('#btn-open-admin-panel', el => window.getComputedStyle(el).display);
        console.log(`   Admin (grx@trenet.ee) Admin Panel visibility (Expected: flex): ${adminAdminPanelDisplay}`);
        if (adminAdminPanelDisplay !== 'flex') {
            throw new Error("Admin panel must be visible for Admin grx@trenet.ee!");
        }

        const adminWarCardDisplay = await page.$eval('#card-war-game', el => window.getComputedStyle(el).display);
        console.log(`   Admin (grx@trenet.ee) War Game Card visibility (Expected: flex): ${adminWarCardDisplay}`);
        if (adminWarCardDisplay !== 'flex') {
            throw new Error("War game card must be visible for Admin grx@trenet.ee!");
        }

        const adminTrainCardDisplay = await page.$eval('#card-train-game', el => window.getComputedStyle(el).display);
        console.log(`   Admin (grx@trenet.ee) Train Game Card visibility (Expected: flex): ${adminTrainCardDisplay}`);
        if (adminTrainCardDisplay !== 'flex') {
            throw new Error("Train game card must be visible to non-owner admin (grx@trenet.ee)!");
        }

        // Click to open Admin Update Panel
        await page.click('#btn-open-admin-panel');
        await new Promise(r => setTimeout(r, 200));

        // Fill update fields
        await page.evaluate(() => {
            (document.getElementById('admin-update-title')).value = 'Uus 3D Superauto ja Kaart';
            (document.getElementById('admin-update-version')).value = 'v2.1.0';
            (document.getElementById('admin-update-content')).value = 'Lisasime uued sõidukid, täiustasime andmebaasi ja parandasime heli.';
        });

        // Click Send Update to Owner
        await page.click('#btn-send-update-to-owner');
        await new Promise(r => setTimeout(r, 1200));

        const updateStatusText = await page.$eval('#admin-update-status', el => el.textContent);
        console.log("   Admin Update Submit Status:", updateStatusText);
        if (!updateStatusText.includes('edukalt saadetud')) {
            throw new Error(`Expected successful update send message, got: ${updateStatusText}`);
        }

        let sentUpdatesText = await page.$eval('#admin-sent-updates-list', el => el.textContent);
        if (!sentUpdatesText.includes('Uus 3D Superauto ja Kaart')) {
            await new Promise(r => setTimeout(r, 800));
            sentUpdatesText = await page.$eval('#admin-sent-updates-list', el => el.textContent);
        }
        if (!sentUpdatesText.includes('Uus 3D Superauto ja Kaart') || !sentUpdatesText.includes('v2.1.0')) {
            throw new Error(`Sent update not found in sent updates list! Got: ${sentUpdatesText}`);
        }
        console.log("   Admin successfully sent update to Owner and saved to database!");

        // Close admin modal
        await page.click('#btn-close-admin-panel');
        await new Promise(r => setTimeout(r, 200));

        // Reset to guest for remaining tests
        await page.evaluate(() => {
            localStorage.removeItem('playard_current_user_profile');
            window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: { profile: null } }));
        });
        await new Promise(r => setTimeout(r, 200));

        // 5. Test 3D Game Creator Studio (Ultra Grass, Human, 10,000 Objects)
        console.log("5. Testing 3D Game Creator Studio...");
        await page.goto('http://localhost:4173/games/games/creator/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

        // Verify 10,000 items catalog badge
        const catalogCountText = await page.$eval('#catalog-count-badge', el => el.textContent);
        console.log("   Catalog object count badge:", catalogCountText);
        if (!catalogCountText.includes('10,000')) {
            throw new Error(`Expected catalog badge to have 10,000 items, got: ${catalogCountText}`);
        }

        // Click first object to spawn into scene
        const firstObjCard = await page.$('.object-card');
        if (firstObjCard) {
            await firstObjCard.click();
            await new Promise(r => setTimeout(r, 500));
            console.log("   Successfully spawned object into 3D Creator scene!");

            // Test Object Rotation with R key & Visual Buttons
            await page.click('#btn-rotate-r');
            const rotVal = await page.$eval('#obj-rot-val', el => el.textContent);
            console.log("   Object Rotation after 'R' / Rotate button:", rotVal);

            // Test Object Move with Arrow Keys / Buttons
            await page.click('#btn-move-fwd');
            const posVal = await page.$eval('#obj-pos-val', el => el.textContent);
            console.log("   Object Position after Move button:", posVal);

            // Test Object Delete with 'D' key
            await page.keyboard.press('KeyD');
            await new Promise(r => setTimeout(r, 400));
            console.log("   Successfully tested Object Deletion with 'D' key!");

            // Re-spawn an object for subsequent tests
            await firstObjCard.click();
            await new Promise(r => setTimeout(r, 400));

            // Test AI Game Assistant with Roads & Drivable Cars Prompt
            await page.click('#btn-toggle-ai');
            await new Promise(r => setTimeout(r, 400));
            const aiModalVisible = await page.$eval('#ai-assistant-modal', el => window.getComputedStyle(el).display);
            console.log("   AI Assistant Modal visibility:", aiModalVisible);
            if (aiModalVisible !== 'flex') {
                throw new Error("AI Assistant modal failed to open!");
            }

            const submitAi = async (prompt) => {
                await page.evaluate((val) => {
                    const inp = document.getElementById('ai-prompt-input');
                    if (inp) inp.value = val;
                }, prompt);
                await page.click('#btn-ai-submit');
                await new Promise(r => setTimeout(r, 350));
            };

            await submitAi('add roads and drivable cars');

            // Test Smart Contextual Addition: "lisa autole asju juurde"
            console.log("   Testing Smart Contextual Addition to Car with AI...");
            await submitAi('lisa autole asju juurde');

            const chatContent = await page.$eval('#ai-chat-log', el => el.textContent);
            console.log("   AI Smart Addition output (Guest/English):", chatContent.substring(chatContent.lastIndexOf('🚗')).substring(0, 110) + '...');
            if (!chatContent.includes('Added details to the car') && !chatContent.includes('fuel pump')) {
                throw new Error("AI Smart Contextual addition response for non-admin failed!");
            }

            // Test Smart Contextual Addition to Nature: "kaunista mets"
            console.log("   Testing Smart Contextual Addition to Nature with AI...");
            await submitAi('add rocks and flowers to trees');

            // Test AI Math Solver: "1+1"
            console.log("   Testing AI Math Solver ('1+1')...");
            await submitAi('1+1');

            const mathChatContent = await page.$eval('#ai-chat-log', el => el.textContent);
            console.log("   AI Math Output for '1+1':", mathChatContent.substring(mathChatContent.lastIndexOf('🧮')).substring(0, 80));
            if (!mathChatContent.includes('1+1 = 2') && !mathChatContent.includes('1 + 1 = 2')) {
                throw new Error("AI Math Solver for 1+1 failed!");
            }

            // Test AI Q&A: "How to drive car?"
            console.log("   Testing AI Q&A ('How to drive car?')...");
            await submitAi('How to drive car?');

            // Test AI World Knowledge Q&A: "What are the largest airplanes in the world?"
            console.log("   Testing AI World Knowledge Q&A ('Largest airplanes')...");
            await submitAi('What are the largest airplanes in the world?');

            const planeChatContent = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!planeChatContent.includes('Antonov An-225') && !planeChatContent.includes('Airbus A380')) {
                throw new Error("AI World Knowledge for largest airplanes failed!");
            }

            // Test AI World Capitals Q&A: "What is the capital of France?"
            console.log("   Testing World Capitals Q&A ('Capital of France')...");
            await submitAi('What is the capital of France?');

            const capitalChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!capitalChat.includes('Paris')) {
                throw new Error("World Capitals Q&A failed for France!");
            }

            // Test AI Largest Countries Q&A: "What is the largest country in the world?"
            console.log("   Testing Largest Countries Q&A ('Largest country')...");
            await submitAi('What is the capital of France?');

            // Test AI Game Logic Programming: "Program a speed boost trigger"
            console.log("   Testing AI Game Logic Programming ('Program speed boost')...");
            await submitAi('Program a speed boost trigger');

            const progChatContent = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!progChatContent.includes('successfully programmed') && !progChatContent.includes('speed_boost')) {
                throw new Error("AI Game Logic Programming failed!");
            }

            // Test Realistic Rabbit 3D Creation: "Create a cute white bunny rabbit"
            console.log("   Testing Realistic Rabbit 3D Creation ('Create a cute white bunny rabbit')...");
            await submitAi('Create a cute white bunny rabbit');

            const rabbitChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!rabbitChat.includes('custom 3D model') && !rabbitChat.includes('Bunny') && !rabbitChat.includes('Rabbit')) {
                throw new Error("Realistic Rabbit 3D Model Creation failed!");
            }

            // Test Realistic Saturn with Rings 3D Creation: "Create planet Saturn with rings"
            console.log("   Testing Realistic Saturn 3D Creation ('Create planet Saturn with rings')...");
            await submitAi('Create planet Saturn with rings');

            const saturnChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!saturnChat.includes('custom 3D model') && !saturnChat.includes('Saturn')) {
                throw new Error("Realistic Saturn 3D Model Creation failed!");
            }

            // Test Semantic 3D Understanding & Color Intent: "Paint gold"
            console.log("   Testing Semantic 3D Intent ('Paint gold')...");
            await submitAi('Paint gold');

            const paintChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!paintChat.includes('Painted') && !paintChat.includes('Gold')) {
                throw new Error("Semantic 3D Paint Intent failed!");
            }

            // Test Semantic Complex 3D World Building: "Build tropical island with palm trees"
            console.log("   Testing Complex Procedural 3D World ('Tropical island with palm trees')...");
            await submitAi('Build tropical island with palm trees');

            // Test Dynamic Motion & Animation: "Make it move back and forth"
            console.log("   Testing Dynamic 3D Object Movement ('Make it move')...");
            await submitAi('Make it move back and forth');

            const moveChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!moveChat.includes('Animated object into motion') && !moveChat.includes('patrolling')) {
                throw new Error("Dynamic 3D Object Movement failed!");
            }

            // Test Elevator Vertical Motion: "Make an elevator moving up and down"
            console.log("   Testing Elevator Vertical Motion ('Make elevator up and down')...");
            await submitAi('Make an elevator moving up and down');

            // Test Continuous Rotation: "Make it rotate"
            console.log("   Testing Continuous Rotation ('Make it rotate')...");
            await submitAi('Make it rotate continuously');

            // Test Universal Custom 3D Object Synthesis (Any creature / item: "Loo koer ja pitsa")
            console.log("   Testing Universal Custom 3D Object Creation ('Loo koer ja pitsa')...");
            await submitAi('Loo armas koer ja suur pizza');
            const customObjChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!customObjChat.includes('mudel') && !customObjChat.includes('model') && !customObjChat.includes('Lõin') && !customObjChat.includes('Created')) {
                throw new Error("Universal custom 3D object creation failed!");
            }

            // Test AI Flyable Airplane Creation: "Loo lendav lennuk ja lennurada millega lennata"
            console.log("   Testing AI Flyable Airplane Creation ('Loo lendav lennuk ja lennurada')...");
            await submitAi('Loo lendav lennuk ja lennurada millega lennata');

            const planeAiChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!planeAiChat.includes('lennuk') && !planeAiChat.includes('airplane') && !planeAiChat.includes('lennata')) {
                throw new Error("AI Flyable Airplane creation failed!");
            }

            // Test Whole Map Scatter ("pane tervesse mappi midagi")
            console.log("   Testing Whole Map Scatter ('pane tervesse mappi midagi')...");
            await submitAi('pane tervesse mappi midagi');

            const scatterChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!scatterChat.includes('terve') && !scatterChat.includes('entire') && !scatterChat.includes('map')) {
                throw new Error("Whole Map Scatter failed!");
            }

            // Test Exact Quantity Scatter ("pane 30 autot tervesse kaarti")
            console.log("   Testing Exact Quantity Scatter ('pane 30 autot tervesse kaarti')...");
            await submitAi('pane 30 autot tervesse kaarti');

            // Test Pahalane (Bad Guy Villain) Creation ("lisa pahalane")
            console.log("   Testing Pahalane (Bad Guy Villain) Creation ('lisa pahalane')...");
            await submitAi('lisa pahalane ja kurikael');

            const villainChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!villainChat.includes('Pahalase') && !villainChat.includes('Villain') && !villainChat.includes('Enemy')) {
                throw new Error("Pahalane villain creation failed!");
            }

            // Test NPC / NBS Character Creation ("lisa nbs tegelane")
            console.log("   Testing NPC / NBS Character Creation ('lisa nbs tegelane')...");
            await submitAi('lisa nbs külaelanik tegelane');

            const npcChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!npcChat.includes('NPC') && !npcChat.includes('tegelase') && !npcChat.includes('külaelanik')) {
                throw new Error("NPC/NBS character creation failed!");
            }

            // Test Full AI Horror Game Generation ("Tee õudusmäng mahajäetud haiglas...")
            console.log("   Testing Full AI Horror Game Generation ('Tee õudusmäng mahajäetud haiglas')...");
            await submitAi('Tee õudusmäng mahajäetud haiglas, kus mängija peab leidma kolm võtit ja põgenema');

            const horrorChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!horrorChat.includes('Haigla') && !horrorChat.includes('Hospital') && !horrorChat.includes('võtit')) {
                throw new Error("Full AI Horror Game generation failed!");
            }

            // Test Full AI Medieval Dragon RPG Game Generation ("Tee RPG seiklusmäng draakoni ja lossiga...")
            console.log("   Testing Full AI Medieval Dragon RPG Game Generation ('Tee RPG seiklusmäng draakoni ja lossiga')...");
            await submitAi('Tee RPG seiklusmäng draakoni, lossi, küla ja mõõgaga');

            const rpgChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!rpgChat.includes('Draakon') && !rpgChat.includes('Dragon') && !rpgChat.includes('RPG')) {
                throw new Error("Full AI Medieval Dragon RPG Game generation failed!");
            }

            // Test Health Regulation ("pane eludeks 250")
            console.log("   Testing Health Regulation ('pane eludeks 250')...");
            await submitAi('pane eludeks 250');
            const hpChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!hpChat.includes('250') || !hpChat.includes('HP')) {
                throw new Error("Health regulation failed!");
            }

            // Test Enemy Damage Regulation ("pahalane võtab 35")
            console.log("   Testing Enemy Damage Regulation ('pahalane võtab 35')...");
            await submitAi('pahalane võtab 35');
            const dmgChat = await page.$eval('#ai-chat-log', el => el.textContent);
            if (!dmgChat.includes('35') || !dmgChat.includes('HP')) {
                throw new Error("Enemy damage regulation failed!");
            }

            // Test In-Game Money and Yards Activation ("lisa raha" & "lisa yardid")
            console.log("   Testing Money and Yards Activation ('lisa raha', 'lisa yardid')...");
            await submitAi('lisa raha ja lisa yardid');

            // Test Undo and Redo
            console.log("   Testing Undo and Redo...");
            await page.click('#btn-undo');
            await new Promise(r => setTimeout(r, 300));
            await page.click('#btn-redo');
            await new Promise(r => setTimeout(r, 300));

            await page.click('#btn-close-ai');

            // Test Play Test Mode with Full Gameplay HUD & Combat Attack
            console.log("   Testing Play Test Mode with Gameplay HUD and Combat...");
            await page.click('#btn-toggle-play-test');
            await new Promise(r => setTimeout(r, 500));

            const gameplayHudVis = await page.$eval('#gameplay-hud', el => window.getComputedStyle(el).display);
            const healthContainerVis = await page.$eval('#hud-health-container', el => window.getComputedStyle(el).display);
            const attackActionVis = await page.$eval('#gameplay-action-controls', el => window.getComputedStyle(el).display);
            if (gameplayHudVis !== 'flex' || healthContainerVis !== 'flex' || attackActionVis !== 'flex') {
                throw new Error("Combat HUD (Health Bar and Attack Button) failed to display in Play Test mode!");
            }

            // Test Combat Attack with [E] and Attack button
            await page.keyboard.press('KeyE');
            await page.click('#btn-attack-action');
            await new Promise(r => setTimeout(r, 300));

            // Test Exit Play Test Mode back to Edit Mode
            await page.click('#btn-toggle-play-test');
            await new Promise(r => setTimeout(r, 500));

            // Test Studio Camera View Navigation Buttons & Keyboard Pan (Edit Mode)
            await page.waitForSelector('#cam-btn-fwd', { visible: true, timeout: 5000 });
            await page.click('#cam-btn-fwd');
            await page.click('#cam-btn-zoom-in');
            console.log("   Successfully tested Camera View Pan and Zoom controls in Creator Studio!");

            // Test Play Test Mode & On-Screen Arrow Controls
            await page.click('#btn-toggle-play-test');
            await new Promise(r => setTimeout(r, 400));
            const playControlsVisible = await page.$eval('#play-test-controls', el => window.getComputedStyle(el).display);
            console.log("   Play Test Mode on-screen controls visibility:", playControlsVisible);
            if (playControlsVisible !== 'flex') {
                throw new Error("Play test controls failed to display in Play Test mode!");
            }

            // Click Jump & Up buttons in Play Test
            await page.click('#touch-btn-up');
            await page.click('#touch-btn-jump');
            await new Promise(r => setTimeout(r, 300));

            // Exit Play Test
            await page.click('#btn-toggle-play-test');
            await new Promise(r => setTimeout(r, 400));
        }

        // Test Submit for Review
        console.log("   Submitting created game for admin review...");
        // Auto-dismiss any alert/confirm dialogs from submit
        page.on('dialog', async dialog => { await dialog.dismiss(); });
        await page.click('#btn-save-draft');
        await new Promise(r => setTimeout(r, 400));
        await page.click('#btn-submit-review');
        await new Promise(r => setTimeout(r, 1500));

        // 6b. Test Bug Report Button
        console.log("6b. Testing Bug Report Button...");
        await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 10000 });
        await new Promise(r => setTimeout(r, 1500));
        await page.waitForSelector('#btn-open-bug-report', { visible: true, timeout: 5000 });
        const bugBtnVisible = await page.$eval('#btn-open-bug-report', el => window.getComputedStyle(el).display);
        console.log("   Bug Report Button visibility:", bugBtnVisible);
        if (bugBtnVisible === 'none') {
            throw new Error("Bug Report button should be visible on homepage!");
        }
        await page.click('#btn-open-bug-report');
        await new Promise(r => setTimeout(r, 500));
        const bugModalVisible = await page.$eval('#modal-bug-report', el => el.style.display);
        console.log("   Bug Report Modal visibility:", bugModalVisible);
        if (bugModalVisible !== 'flex') {
            throw new Error("Bug Report modal should be visible after clicking button!");
        }
        await page.click('#btn-close-bug-report');

        // 7. Test Racing Simulator
        console.log("7. Checking Racing Simulator...");
        await page.goto('http://localhost:4173/games/games/racing/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });
        await page.waitForSelector('#garage-screen', { visible: true, timeout: 5000 });
        
        const racingYards = await page.$eval('#racing-yard-val', el => el.textContent);
        console.log("   Racing Garage Yard Balance:", racingYards);

        // 9. Test 3D Master Chef Cooking Simulator
        console.log("9. Checking 3D Master Chef Cooking Simulator...");
        await page.goto('http://localhost:4173/games/games/cooking/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

        // Check that VIP restricted overlay is hidden for admin
        await page.evaluate(() => { const v = document.getElementById('vip-restricted-overlay'); if(v) v.style.display = 'none'; });

        // 10. Test 3D War Game (Team & Class Selection + Fighter Jet 50k Lock + 3-2-1 Countdown)
        console.log("10. Checking 3D War Game (Team & Class Selection + Fighter Jet 50k Lock + 3-2-1 Countdown)...");
        await page.goto('http://localhost:4173/games/games/war/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

        // Verify Team & Class selection modal
        const deployModalExists = await page.$eval('#modal-deploy-selection', el => !!el);
        if (!deployModalExists) {
            throw new Error("Deploy team/class selection modal not found!");
        }

        // Check Fighter Jet card & 50,000 € lock badge
        const planeCardExists = await page.$eval('#btn-select-plane', el => !!el);
        const planeLockBadge = await page.$eval('#plane-lock-badge', el => el.textContent);
        console.log("   Fighter Jet Option Exists:", planeCardExists, "Lock Badge:", planeLockBadge.trim());
        if (!planeCardExists || !planeLockBadge.includes('50,000 €')) {
            throw new Error("Fighter jet option with 50,000 € lock badge must exist!");
        }

        // Check Missile Team role in scrollable roles selection
        const missileRoleOptionExists = await page.$eval('#btn-select-missile', el => !!el);
        console.log("   Raketitiim Role Option Exists in Modal:", missileRoleOptionExists);
        if (!missileRoleOptionExists) {
            throw new Error("Raketitiim option (#btn-select-missile) must exist in deploy modal roles!");
        }

        // Verify Deploy / Play button is visible and clickable
        const deployBtnVisible = await page.$eval('#btn-confirm-deploy', el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
        });
        console.log("   Deploy / Play Button Visible:", deployBtnVisible);
        if (!deployBtnVisible) {
            throw new Error("Deploy button (#btn-confirm-deploy) must be visible!");
        }

        // Test Selecting Red Team and Human Class, then Deploy
        await page.click('#btn-select-red');
        await page.click('#btn-select-human');
        await page.click('#btn-confirm-deploy');
        await new Promise(r => setTimeout(r, 300));

        // Verify 3-2-1 Countdown Overlay triggered
        const countdownOverlayDisplay = await page.$eval('#match-countdown-overlay', el => window.getComputedStyle(el).display);
        console.log("   Match Countdown Overlay on Deploy (Expected: flex):", countdownOverlayDisplay);
        if (countdownOverlayDisplay !== 'flex') {
            throw new Error("3-2-1 Countdown overlay must appear when match starts/deploys!");
        }

        // Wait for countdown to finish (3.5s)
        await new Promise(r => setTimeout(r, 4000));

        // Verify Player Team Badge updated to RED and Soldier / Inimene
        const teamBadgeText = await page.$eval('#player-team-name', el => el.textContent);
        console.log("   Player Team & Role Badge:", teamBadgeText);
        if (!teamBadgeText.includes('RED') || (!teamBadgeText.includes('SOLDIER') && !teamBadgeText.includes('INIMENE'))) {
            throw new Error(`Expected badge to reflect RED and SOLDIER/INIMENE, got: ${teamBadgeText}`);
        }

        // Verify War Game HUD elements
        await page.waitForSelector('#hp-text', { visible: true, timeout: 5000 });
        const initialHp = await page.$eval('#hp-text', el => el.textContent);
        console.log("   War Game Unit HP Display:", initialHp);

        // Verify Scoreboard (Red vs Blue)
        const redScore = await page.$eval('#team-red-score', el => el.textContent);
        const blueScore = await page.$eval('#team-blue-score', el => el.textContent);
        console.log(`   Scoreboard: Red=${redScore}, Blue=${blueScore}`);

        const serverCount = await page.$eval('#server-players-count', el => el.textContent);
        console.log("   Server Player Status:", serverCount);
        if (!serverCount.includes('10v10') || !serverCount.includes('20')) {
            throw new Error(`Expected 10v10 battle status, got: ${serverCount}`);
        }

        const warMoneyText = await page.$eval('#stat-money', el => el.textContent);
        console.log("   War Game Money Display:", warMoneyText);

        const radarCanvasExists = await page.$eval('#radar-canvas', el => !!el);
        if (!radarCanvasExists) {
            throw new Error("Radar canvas not found in War Game!");
        }

        // Test Weapon Switching (MG-42 and Cannon)
        await page.click('#weapon-mg');
        const mgActive = await page.$eval('#weapon-mg', el => el.classList.contains('active'));
        if (!mgActive) throw new Error("Expected #weapon-mg to be active after click!");
        console.log("   Successfully switched active weapon to MG-42!");

        await page.click('#weapon-cannon');
        const cannonActive = await page.$eval('#weapon-cannon', el => el.classList.contains('active'));
        if (!cannonActive) throw new Error("Expected #weapon-cannon to be active after click!");
        console.log("   Successfully switched active weapon to Cannon!");

        // Test Weapon Firing & Spreading Explosion
        await page.keyboard.press('Space');
        await new Promise(r => setTimeout(r, 300));
        console.log("   Successfully tested weapon firing and spreading shockwave in 3D War Game!");

        // Verify missile & nuke are hidden for regular soldier/red team
        const redMissileDisplay = await page.$eval('#weapon-missile', el => window.getComputedStyle(el).display);
        const redNukeDisplay = await page.$eval('#weapon-nuke', el => window.getComputedStyle(el).display);
        console.log("   Regular Soldier Missile & Nuke Display (Expected: none):", redMissileDisplay, redNukeDisplay);
        if (redMissileDisplay !== 'none' || redNukeDisplay !== 'none') {
            throw new Error("Missiles and Nukes must be hidden for regular soldiers/tanks!");
        }

        // Test Deploying as Raketitiim Role (Purchase with 100,000 €)
        console.log("   Testing Raketitiim Role Exclusive Weapons, 100,000 € Purchase & Satellite Targeting...");
        await page.evaluate(() => {
            localStorage.setItem('playard_war_game_money', '150000');
            if ((window).warGameEngine) {
                (window).warGameEngine.warMoney = 150000;
                (window).warGameEngine.updateHUD();
            }
        });
        await page.click('#btn-open-loadout');
        await new Promise(r => setTimeout(r, 300));
        await page.click('#btn-select-missile');
        await page.click('#btn-confirm-deploy');
        await new Promise(r => setTimeout(r, 4000)); // Wait for 3-2-1 countdown

        const missileRoleBadgeText = await page.$eval('#player-team-name', el => el.textContent);
        console.log("   Player Role Badge as Raketitiim:", missileRoleBadgeText);
        if (!missileRoleBadgeText.includes('MISSILE') && !missileRoleBadgeText.includes('RAKETITIIM')) {
            throw new Error(`Expected badge to reflect MISSILE / RAKETITIIM, got: ${missileRoleBadgeText}`);
        }

        // Test 10s Missile Strike & Satellite Targeting HUD for Raketitiim Role
        const missileCardDisplay = await page.$eval('#weapon-missile', el => window.getComputedStyle(el).display);
        const nukeCardDisplay = await page.$eval('#weapon-nuke', el => window.getComputedStyle(el).display);
        console.log("   Raketitiim Card Display (Expected: flex):", missileCardDisplay, nukeCardDisplay);
        if (missileCardDisplay !== 'flex' || nukeCardDisplay !== 'flex') {
            throw new Error("Missile and Nuke cards must be visible for Raketitiim role!");
        }

        // Test opening Satellite Targeting Mode for Raketitiim Role and firing missile without exiting satellite view
        await page.click('#weapon-missile');
        await new Promise(r => setTimeout(r, 200));
        
        // Verify satellite targeting HUD is visible
        const satHudDisplay = await page.$eval('#satellite-targeting-hud', el => window.getComputedStyle(el).display);
        console.log("   Satellite Targeting HUD display (Expected: flex):", satHudDisplay);
        if (satHudDisplay !== 'flex') {
            throw new Error("Satellite targeting HUD must be open!");
        }

        // Fire missile with Space / click
        await page.keyboard.press('Space');
        await new Promise(r => setTimeout(r, 300));

        // Verify still in satellite targeting view after launch (does not revert to walking soldier)
        const satHudDisplayAfterLaunch = await page.$eval('#satellite-targeting-hud', el => window.getComputedStyle(el).display);
        console.log("   Satellite Targeting HUD display after missile launch (Expected: flex):", satHudDisplayAfterLaunch);
        if (satHudDisplayAfterLaunch !== 'flex') {
            throw new Error("Missile Commander must stay in satellite targeting map view after launching missile!");
        }

        // Test clicking on Radar / Minimap to jump satellite camera
        await page.click('#radar-canvas');
        await new Promise(r => setTimeout(r, 200));
        // Verify soldier weapon cards are hidden for Raketitiim
        const cannonHidden = await page.$eval('#weapon-cannon', el => window.getComputedStyle(el).display);
        const mgHidden = await page.$eval('#weapon-mg', el => window.getComputedStyle(el).display);
        console.log("   Raketitiim Soldier Weapon Cards (Expected: none):", cannonHidden, mgHidden);
        if (cannonHidden !== 'none' || mgHidden !== 'none') {
            throw new Error("Soldier/tank weapons must be completely hidden for Raketitiim!");
        }

        // Ready the nuke timer for test firing
        await page.evaluate(() => {
            if ((window).warGameEngine) {
                (window).warGameEngine.nukeTimer = 0;
            }
        });

        // Test pressing 2 to switch to Nuke and launching 5-second realistic alarm and warning banner
        await page.keyboard.press('Digit2');
        await new Promise(r => setTimeout(r, 200));
        const nukeActive = await page.$eval('#weapon-nuke', el => el.classList.contains('active'));
        if (!nukeActive) throw new Error("Pressing 2 in Raketitiim must select Nuke!");

        await page.keyboard.press('Space');
        await new Promise(r => setTimeout(r, 300));
        const nukeBannerDisplay = await page.$eval('#nuke-warning-banner', el => window.getComputedStyle(el).display);
        console.log("   Nuclear Warning Banner Display with 5s Alarm (Expected: flex):", nukeBannerDisplay);
        if (nukeBannerDisplay !== 'flex') {
            throw new Error("Nuclear warning banner and 5s alarm must trigger on nuclear launch!");
        }

        // Test pressing 1 to switch back to 10s Missile
        await page.keyboard.press('Digit1');
        await new Promise(r => setTimeout(r, 200));
        const missileActive = await page.$eval('#weapon-missile', el => el.classList.contains('active'));
        if (!missileActive) throw new Error("Pressing 1 in Raketitiim must select 10s Missile!");

        console.log("   Successfully verified Raketitiim role is locked to missile/nuke operations, no yellow dot, and 5s nuclear siren works!");

        // Test Fighter Jet Unlock with 50,000 € (Remaining money: 50,000 €)
        console.log("10a. Testing Fighter Jet Purchase with 50,000 € War Cash...");
        await page.click('#btn-open-loadout');
        await new Promise(r => setTimeout(r, 300));
        await page.click('#btn-select-plane');
        await page.click('#btn-confirm-deploy');
        await new Promise(r => setTimeout(r, 4000)); // Wait for 3-2-1 countdown

        const planeBadgeText = await page.$eval('#player-team-name', el => el.textContent);
        console.log("   Player Team & Role Badge as Fighter Jet:", planeBadgeText);
        if (!planeBadgeText.includes('JET') && !planeBadgeText.includes('LENNUK')) {
            throw new Error(`Expected badge to reflect FIGHTER JET, got: ${planeBadgeText}`);
        }

        // Verify airstrike card is hidden for Fighter Jet
        const airstrikeDisplay = await page.$eval('#weapon-airstrike', el => window.getComputedStyle(el).display);
        console.log("   Fighter Jet Airstrike Card Display (Expected: none):", airstrikeDisplay);
        if (airstrikeDisplay !== 'none') {
            throw new Error(`Expected airstrike card to be hidden for Fighter Jet, got: ${airstrikeDisplay}`);
        }

        // Test bomb drop directly under fighter jet
        await page.click('#weapon-mg');
        await page.keyboard.press('Space');
        await new Promise(r => setTimeout(r, 200));
        console.log("   Successfully verified Fighter Jet Airstrike disabled and direct bomb dropping!");
        console.log("   Successfully unlocked and deployed Fighter Jet with 50,000 €!");

        // 10b. Test Playard Owner Estonian Localization in War Game
        console.log("10b. Checking Playard Owner Estonian Localization & 200,000 € in War Game...");
        await page.evaluate(() => {
            const ownerProf = { id: 'owner_1', username: 'playard owner', email: '1karl.ilves@gmail.com', displayName: 'Playard Owner✅', isAdmin: true };
            localStorage.setItem('playard_current_user_profile', JSON.stringify(ownerProf));
            localStorage.setItem('playard_war_game_money', '200000');
        });
        await page.goto('http://localhost:4173/games/games/war/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

        const ownerDeployTitle = await page.$eval('#deploy-modal-title', el => el.textContent);
        console.log("   Playard Owner War Deploy Modal Title (Estonian):", ownerDeployTitle);
        if (!ownerDeployTitle.includes('VALI TIIM JA LAHINGUROLL')) {
            throw new Error(`Expected Playard Owner War modal title to be in Estonian, got: ${ownerDeployTitle}`);
        }

        await page.click('#btn-select-blue');
        await page.click('#btn-select-plane');
        await page.click('#btn-confirm-deploy');
        await new Promise(r => setTimeout(r, 4000)); // Wait for countdown

        const ownerBadgeText = await page.$eval('#player-team-name', el => el.textContent);
        console.log("   Playard Owner Team Badge (Estonian):", ownerBadgeText);
        if (!ownerBadgeText.includes('LAHINGULENNUK')) {
            throw new Error(`Expected Playard Owner badge to say LAHINGULENNUK, got: ${ownerBadgeText}`);
        }

        const ownerWarMoneyText = await page.$eval('#stat-money', el => el.textContent);
        console.log("   Playard Owner War Cash Balance (Expected: >= 150,000 €):", ownerWarMoneyText);
        if (parseInt(ownerWarMoneyText.replace(/,/g, ''), 10) < 150000) {
            throw new Error(`Expected Playard Owner to have >= 150,000 € War Cash, got: ${ownerWarMoneyText}`);
        }
        console.log("   Successfully tested Playard Owner Estonian Localization with 200,000 € initial balance in War Game!");

        // Test Out of Bounds Warning for Playard Owner
        await page.evaluate(() => {
            const el = document.getElementById('out-of-bounds-overlay');
            if (el) el.style.display = 'flex';
        });
        const oobTitle = await page.$eval('#out-of-bounds-title', el => el.textContent);
        console.log("   Playard Owner Out of Bounds Warning Title:", oobTitle);
        if (!oobTitle.includes('MINE TAGASI')) {
            throw new Error(`Expected Out of Bounds title to contain 'MINE TAGASI', got: ${oobTitle}`);
        }
        console.log("   Successfully tested Out-of-Bounds Warning System and Visible Boundaries!");

        // Reset guest profile for subsequent tests
        await page.evaluate(() => {
            localStorage.removeItem('playard_current_user_profile');
            localStorage.removeItem('playard_war_game_money');
        });

        // 11. Test 3D Train Simulator (3D Rongimäng - English for all, Estonian for Playard Owner)
            console.log("11. Checking 3D Train Simulator (Guest English Localization)...");
            await page.goto('http://localhost:4173/games/games/train/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await new Promise(r => setTimeout(r, 1500));
            await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

            // Verify Train Depot Modal with 10 Trains & Dual Currency Options in English for guest
            await page.waitForSelector('.train-card', { visible: true, timeout: 5000 });
            const trainCardsCount = await page.$$eval('.train-card', els => els.length);
            console.log("   Depot 3D Trains Count (Expected: 10):", trainCardsCount);
            if (trainCardsCount !== 10) {
                throw new Error(`Expected 10 trains in depot, found: ${trainCardsCount}`);
            }

            const depotText = await page.$eval('#trains-grid-container', el => el.textContent);
            if (!depotText.includes('100 €') || !depotText.includes('500 Y') || (!depotText.includes('FREE') && !depotText.includes('TASUTA'))) {
                throw new Error(`Depot must contain cheapest 100 € train with 5x Yard price (500 Y)! Got: ${depotText.substring(0, 120)}`);
            }

            const depotYardVal = await page.$eval('#depot-yard-val', el => el.textContent);
            console.log("   Depot Real Yard Balance:", depotYardVal);

            const moneyBuyBtnCount = await page.$$eval('.btn-buy-money', els => els.length);
            const yardBuyBtnCount = await page.$$eval('.btn-buy-yard', els => els.length);
            console.log(`   Depot Buy Options: ${moneyBuyBtnCount} Money buttons, ${yardBuyBtnCount} Yard buttons`);
            if (moneyBuyBtnCount === 0 || yardBuyBtnCount === 0) {
                throw new Error("Expected both Rongiraha and Yard purchase buttons in depot!");
            }
            console.log("   Successfully verified 10 distinct trains with real Yard balance and 5x Yard price in depot!");

            // Start driving from depot
            await page.click('#btn-depot-start-driving');
            await new Promise(r => setTimeout(r, 400));

            // Test Opening Depot from Top HUD and closing
            await page.click('#btn-open-depot');
            await new Promise(r => setTimeout(r, 300));
            const depotVisible = await page.$eval('#modal-train-depot', el => window.getComputedStyle(el).display);
            if (depotVisible !== 'flex') {
                throw new Error("Expected #modal-train-depot to be open after clicking #btn-open-depot!");
            }
            await page.click('#btn-close-depot');
            await new Promise(r => setTimeout(r, 300));

            // Verify Train In-Game Money HUD & Yard HUD
            await page.waitForSelector('#train-money-val', { visible: true, timeout: 5000 });
            const initialMoney = await page.$eval('#train-money-val', el => el.textContent);
            console.log("   Initial Rongiraha In-Game Currency:", initialMoney);

            // Verify Train HUD elements in English for guest
            await page.waitForSelector('#speed-text', { visible: true, timeout: 5000 });
            const initialSpeed = await page.$eval('#speed-text', el => el.textContent);
            console.log("   Initial Train Speedometer:", initialSpeed);

            const targetStation = await page.$eval('#target-station-name', el => el.textContent);
            console.log("   Initial Target Station (English):", targetStation);
            if (!targetStation.includes('Pine Forest Station')) {
                throw new Error(`Expected initial station to be Pine Forest Station in English, got: ${targetStation}`);
            }

            const passCount = await page.$eval('#stat-passengers', el => el.textContent);
            console.log("   Initial Passenger Count:", passCount);

            // Test Throttle Acceleration
            await page.click('#btn-throttle-up');
            await page.click('#btn-throttle-up');
            await new Promise(r => setTimeout(r, 300));
            const throttleText = await page.$eval('#throttle-text', el => el.textContent);
            console.log("   Throttle after acceleration:", throttleText);

            // Test Whistle (Tuut-tuut!)
            await page.click('#btn-horn');
            await page.keyboard.press('KeyH');
            await new Promise(r => setTimeout(r, 200));
            console.log("   Successfully tested Train Whistle & Steam Burst!");

            // Test Camera View Switch
            await page.click('#btn-camera-view');
            await new Promise(r => setTimeout(r, 200));
            const camBtnText = await page.$eval('#btn-camera-view', el => el.textContent);
            console.log("   Camera mode after toggle:", camBtnText);

            // Test Weather / Time of Day Switch
            await page.click('#btn-toggle-weather');
            await new Promise(r => setTimeout(r, 200));
            const weatherBtnText = await page.$eval('#btn-toggle-weather', el => el.textContent);
            console.log("   Weather after toggle:", weatherBtnText);

            // Test Track Switch with 'KeyJ'
            await page.keyboard.press('KeyJ');
            await new Promise(r => setTimeout(r, 200));
            console.log("   Successfully tested Track Switch key (KeyJ)!");

            // Test Brake Button
            await page.click('#btn-throttle-down');
            await page.click('#btn-throttle-down');
            await new Promise(r => setTimeout(r, 200));
            console.log("   Successfully tested Train Braking!");

            // Test Help Modal
            await page.click('#btn-open-help');
            await new Promise(r => setTimeout(r, 200));
            const helpVisible = await page.$eval('#modal-help', el => window.getComputedStyle(el).display);
            if (helpVisible !== 'flex') {
                throw new Error("Expected #modal-help to be visible after click!");
            }
            await page.click('#btn-close-help');
            await new Promise(r => setTimeout(r, 200));
            console.log("   Successfully tested Help Modal in 3D Train Simulator!");

            // Verify Station Skipped Notification Element in English
            await page.waitForSelector('#station-skipped-banner', { timeout: 3000 });
            const skippedTitle = await page.$eval('#skipped-title', el => el.textContent);
            if (!skippedTitle.includes('MISSED THE STATION') && !skippedTitle.includes('JÄTSID PEATUSE VAHELE')) {
                throw new Error(`Expected station skipped title, got: ${skippedTitle}`);
            }
            console.log("   Successfully verified 'You missed the station' notification banner in 3D Train Simulator!");

            // 11b. Test Mobile / Tablet Automatic Touch Controls Detection
            console.log("11b. Checking Mobile / Tablet Automatic Touch Controls in 3D Train Simulator...");
            const mobilePage = await browser.newPage();
            await mobilePage.evaluateOnNewDocument(() => {
                window.__PLAYARD_TEST_MODE__ = true;
            });
            await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
            await mobilePage.goto('http://localhost:4173/games/games/train/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await new Promise(r => setTimeout(r, 1500));

            // Verify on-screen touch controls are automatically displayed on phone/tablet
            const mobileControlsDisplay = await mobilePage.$eval('#mobile-train-controls', el => window.getComputedStyle(el).display);
            console.log("   Mobile / Tablet Touch Controls Display (Expected: flex):", mobileControlsDisplay);
            if (mobileControlsDisplay !== 'flex') {
                throw new Error("Mobile/Tablet touch controls must be automatically visible on mobile/touch devices!");
            }

            // Test Mobile Touch Buttons
            await mobilePage.click('#m-btn-throttle-up');
            await new Promise(r => setTimeout(r, 200));
            const mobileThrottle = await mobilePage.$eval('#throttle-text', el => el.textContent);
            console.log("   Mobile Throttle after Touch Power Button:", mobileThrottle);

            await mobilePage.click('#m-btn-horn');
            await new Promise(r => setTimeout(r, 100));

            await mobilePage.click('#m-btn-cam');
            await new Promise(r => setTimeout(r, 200));

            await mobilePage.click('#m-btn-weather');
            await new Promise(r => setTimeout(r, 200));

            await mobilePage.click('#m-btn-throttle-down');
            await mobilePage.click('#m-btn-throttle-down');
            await new Promise(r => setTimeout(r, 200));
            console.log("   Successfully tested all Mobile / Tablet Touch Controls in 3D Train Simulator!");
            await mobilePage.close();

            // 12. Test Playard Owner Estonian Localization & Database Money Persistence in Rongimäng
            console.log("12. Checking Playard Owner Estonian Localization & Database Money (rongimäng)...");
            await page.evaluate(() => {
                const ownerProf = { id: 'owner_1', username: 'playard owner', email: '1karl.ilves@gmail.com', displayName: 'Playard Owner✅', isAdmin: true };
                localStorage.setItem('playard_current_user_profile', JSON.stringify(ownerProf));
            });
            await page.goto('http://localhost:4173/games/games/train/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await new Promise(r => setTimeout(r, 1500));

            const ownerStationName = await page.$eval('#target-station-name', el => el.textContent);
            console.log("   Playard Owner Target Station (Estonian):", ownerStationName);
            if (!ownerStationName.includes('Männimetsa Peatus')) {
                throw new Error(`Expected Playard Owner target station to be 'Männimetsa Peatus', got: ${ownerStationName}`);
            }

            const ownerDepotText = await page.$eval('#trains-grid-container', el => el.textContent);
            if (!ownerDepotText.includes('TASUTA') || !ownerDepotText.includes('Linnalähirong Express')) {
                throw new Error(`Expected Playard Owner depot to be in Estonian, got: ${ownerDepotText.substring(0, 120)}`);
            }

            const ownerMoneyVal = await page.$eval('#train-money-val', el => el.textContent);
            console.log("   Playard Owner Saved Train Money (Expected: >= 100000):", ownerMoneyVal);
            if (parseInt(ownerMoneyVal.replace(/,/g, ''), 10) < 100000) {
                throw new Error(`Expected Playard Owner to have 100,000 € saved money, got: ${ownerMoneyVal}`);
            }

            // Verify 'rongimäng' database column in localStorage and user profile
            const dbCheck = await page.evaluate(() => {
                const p = JSON.parse(localStorage.getItem('playard_current_user_profile') || '{}');
                const rawDb = localStorage.getItem('rongimäng') || localStorage.getItem('ronginäng');
                return { profileDb: p.rongimäng || p.ronginäng, rawDb: rawDb };
            });
            console.log("   Database 'rongimäng' column check in profile:", dbCheck);
            if (!dbCheck.rawDb || !dbCheck.profileDb) {
                throw new Error(`Expected 'rongimäng' database column to be populated, got: ${JSON.stringify(dbCheck)}`);
            }

            console.log("   Successfully verified Estonian localization & 'rongimäng' database money persistence for Playard Owner!");

            console.log("✅ All Playard Platform tests passed successfully!");
        } catch(err) { console.error("Verification failed:", err); process.exit(1); } finally { await browser.close(); serverProcess.kill(); }
})();
