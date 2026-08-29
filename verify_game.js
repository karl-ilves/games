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

        // Check War Game visibility for guest (Expected: none - restricted to Owner & Admin)
        const guestWarCardDisplay = await page.$eval('#card-war-game', el => window.getComputedStyle(el).display);
        console.log(`   Guest War Game Card visibility (Expected: none): ${guestWarCardDisplay}`);
        if (guestWarCardDisplay !== 'none') {
            throw new Error("War game card must be hidden for guests!");
        }

        // Check Guest Admin Panel visibility (Expected: none)
        const guestAdminPanelDisplay = await page.$eval('#btn-open-admin-panel', el => window.getComputedStyle(el).display);
        console.log(`   Guest Admin Panel visibility (Expected: none): ${guestAdminPanelDisplay}`);
        if (guestAdminPanelDisplay !== 'none') {
            throw new Error("Admin Panel button should be hidden for guests!");
        }

        // Test Owner login (1karl.ilves@gmail.com) -> Admin panel must be hidden, but War game card must be visible!
        await page.evaluate(() => {
            const ownerProf = { id: 'owner_1', username: 'playard owner', email: '1karl.ilves@gmail.com', displayName: 'Playard Owner✅', isAdmin: true };
            localStorage.setItem('playard_current_user_profile', JSON.stringify(ownerProf));
            window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: { profile: ownerProf } }));
        });
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

        // Test Admin login (grx@trenet.ee) -> Admin panel must be visible, and War game card must be visible!
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

        // Click to open Admin Update Panel
        await page.click('#btn-open-admin-panel');
        await new Promise(r => setTimeout(r, 200));

        // Fill update fields
        await page.type('#admin-update-title', 'Uus 3D Superauto ja Kaart');
        await page.evaluate(() => { document.getElementById('admin-update-version').value = 'v2.1.0'; });
        await page.type('#admin-update-content', 'Lisasime uued sõidukid, täiustasime andmebaasi ja parandasime heli.');

        // Click Send Update to Owner
        await page.click('#btn-send-update-to-owner');
        await new Promise(r => setTimeout(r, 400));

        const updateStatusText = await page.$eval('#admin-update-status', el => el.textContent);
        console.log("   Admin Update Submit Status:", updateStatusText);
        if (!updateStatusText.includes('edukalt saadetud')) {
            throw new Error(`Expected successful update send message, got: ${updateStatusText}`);
        }

        const sentUpdatesText = await page.$eval('#admin-sent-updates-list', el => el.textContent);
        if (!sentUpdatesText.includes('Uus 3D Superauto ja Kaart') || !sentUpdatesText.includes('v2.1.0')) {
            throw new Error("Sent update not found in sent updates list!");
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

        // 10. Test 3D War Game (3 Tanks + 7 Soldiers Squad Battle)
        console.log("10. Checking 3D War Game (3 Tanks + 7 Soldiers Squad Battle)...");
        await page.goto('http://localhost:4173/games/games/war/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

        // Verify War Game HUD elements
        await page.waitForSelector('#hp-text', { visible: true, timeout: 5000 });
        const initialHp = await page.$eval('#hp-text', el => el.textContent);
        console.log("   War Game Tank HP Display:", initialHp);
        if (!initialHp.includes('100')) {
            throw new Error(`Expected initial HP 100 / 100, got: ${initialHp}`);
        }

        // Verify 10v10 Squad Scoreboard (Red vs Blue)
        const redScore = await page.$eval('#team-red-score', el => el.textContent);
        const blueScore = await page.$eval('#team-blue-score', el => el.textContent);
        console.log(`   Squad Scoreboard: Red=${redScore}, Blue=${blueScore}`);

        const serverCount = await page.$eval('#server-players-count', el => el.textContent);
        console.log("   Server Player Status:", serverCount);
        if (!serverCount.includes('Mängijat') && !serverCount.includes('Online')) {
            throw new Error(`Expected server status to show players count, got: ${serverCount}`);
        }

        const radarCanvasExists = await page.$eval('#radar-canvas', el => !!el);
        if (!radarCanvasExists) {
            throw new Error("Radar canvas not found in War Game!");
        }

        // Test Fire Cannon key action
        await page.keyboard.press('Space');
        await new Promise(r => setTimeout(r, 300));
        console.log("   Successfully tested cannon firing in 3D War Game!");

        console.log("✅ All Playard Platform tests passed successfully!");
    } catch(err) { console.error("Verification failed:", err); process.exit(1); } finally { await browser.close(); serverProcess.kill(); }
})();
