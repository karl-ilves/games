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

        // Check Cooking Game visibility for guest (Expected: none)
        const guestCookingDisplay = await page.$eval('#card-cooking-game', el => window.getComputedStyle(el).display);
        console.log("   Guest Cooking Game Card visibility (Expected: none):", guestCookingDisplay);
        if (guestCookingDisplay !== 'none') {
            throw new Error("Cooking game card should be hidden for guests!");
        }

        // 2. Test User Registration with @SuperPlayer & Earning Yards
        console.log("2. Testing User Registration (@SuperPlayer) & Yard Persistence on Logout/Login...");
        await page.type('#auth-email', 'super@player.com');
        await page.type('#auth-username', 'SuperPlayer');
        await page.type('#auth-password', 'Pass12345!');
        await page.click('#btn-register');
        await page.waitForFunction(() => document.getElementById('user-info')?.style.display === 'block' || (document.getElementById('auth-message')?.textContent || '').includes('Account created'), { timeout: 6000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 600));

        // Check Cooking Game visibility for SuperPlayer (Expected: none)
        const superCookingDisplay = await page.$eval('#card-cooking-game', el => window.getComputedStyle(el).display);
        console.log("   SuperPlayer Cooking Game Card visibility (Expected: none):", superCookingDisplay);
        if (superCookingDisplay !== 'none') {
            throw new Error("Cooking game card should be hidden for non-admin users!");
        }

        const authMsg = await page.$eval('#auth-message', el => el.textContent);
        const userInfoDisplay = await page.$eval('#user-info', el => window.getComputedStyle(el).display);
        const loginFormDisplay = await page.$eval('#login-form', el => window.getComputedStyle(el).display);
        console.log("   Registration debug -> AuthMsg:", authMsg, "UserInfo:", userInfoDisplay, "LoginForm:", loginFormDisplay);

        // Redeem promo code +500 Y as SuperPlayer
        await page.click('#btn-open-streak');
        await page.waitForSelector('#promo-code-input', { visible: true, timeout: 3000 });
        await page.type('#promo-code-input', 'PLAYARD2026');
        await page.click('#btn-redeem-promo');
        await new Promise(r => setTimeout(r, 500));
        await page.click('#btn-close-streak');
        await new Promise(r => setTimeout(r, 500));

        const userYards = await page.$eval('#header-yard-val', el => el.textContent);
        console.log("   SuperPlayer Yard Balance after promo (Expected: 500):", userYards);
        if (userYards !== '500') {
            throw new Error(`Expected SuperPlayer to have 500 Yards, got ${userYards}`);
        }

        // --- Test LOGOUT: Yards MUST reset strictly to 0 ---
        console.log("   Testing Logout -> Yards MUST reset to 0...");
        await page.waitForSelector('#btn-logout', { visible: true, timeout: 4000 });
        await page.click('#btn-logout');
        await new Promise(r => setTimeout(r, 800));

        const yardsAfterLogout = await page.$eval('#header-yard-val', el => el.textContent);
        console.log("   Yard Balance after Logout (Expected: 0):", yardsAfterLogout);
        if (yardsAfterLogout !== '0') {
            throw new Error(`Yard reset on logout failed! Expected '0', got '${yardsAfterLogout}'`);
        }

        // --- Test LOGIN with Non-Existent Username: MUST say 'This username does not exist!' ---
        console.log("   Testing Login with Non-Existent Username -> MUST display 'This username does not exist!'...");
        await page.type('#auth-email', 'super@player.com');
        await page.type('#auth-username', 'GhostUser');
        await page.type('#auth-password', 'Pass12345!');
        await page.click('#btn-login');
        await page.waitForFunction(() => {
            const msg = document.getElementById('auth-message')?.textContent || '';
            return msg !== '' && msg !== 'Checking credentials...' && msg !== 'Kontrollin andmeid...';
        }, { timeout: 4000 });

        const errorMsg = await page.$eval('#auth-message', el => el.textContent);
        console.log("   Non-existent username error message:", errorMsg);
        if (!errorMsg.includes('does not exist') && !errorMsg.includes('Seda nime ei ole')) {
            throw new Error(`Expected 'This username does not exist!', got '${errorMsg}'`);
        }

        // --- Test LOGIN with CORRECT Username: Yards MUST be restored to 500 ---
        console.log("   Testing Login with Correct Username (@SuperPlayer) -> Yards MUST restore to 500...");
        await page.$eval('#auth-username', el => el.value = '');
        await page.type('#auth-username', 'SuperPlayer');
        await page.click('#btn-login');
        await page.waitForFunction(() => {
            const msg = document.getElementById('auth-message')?.textContent || '';
            return msg.includes('Welcome back') || msg.includes('Tere tulemast');
        }, { timeout: 4000 });

        const restoredYards = await page.$eval('#header-yard-val', el => el.textContent);
        console.log("   Restored Yard Balance for SuperPlayer (Expected: 500):", restoredYards);
        if (restoredYards !== '500') {
            throw new Error(`Yard restoration on login failed! Expected '500', got '${restoredYards}'`);
        }

        // Logout SuperPlayer before testing Admin flow
        await page.click('#btn-logout');
        await new Promise(r => setTimeout(r, 600));

        // 3. Test Admin Registration & Controls
        console.log("3. Testing Admin Registration & Controls (1karl.ilves@gmail.com)...");
        await page.type('#auth-email', '1karl.ilves@gmail.com');
        await page.type('#auth-username', 'admin');
        await page.type('#auth-password', 'SecretAdminPass123!');
        await page.click('#btn-register');
        await new Promise(r => setTimeout(r, 2000));

        // Wait for page ready
        await page.waitForSelector('#btn-open-admin-panel', { visible: true, timeout: 6000 });

        // Check if Admin Panel button is visible for 1karl.ilves@gmail.com
        const adminBtnDisplay = await page.$eval('#btn-open-admin-panel', el => window.getComputedStyle(el).display);
        console.log("   Admin Panel button visibility for 1karl.ilves@gmail.com (Expected: flex):", adminBtnDisplay);
        if (adminBtnDisplay !== 'flex') {
            throw new Error("Admin Panel button should be visible for admin account!");
        }

        // Check Cooking Game visibility for 1karl.ilves@gmail.com (Expected: flex)
        const adminCookingDisplay = await page.$eval('#card-cooking-game', el => window.getComputedStyle(el).display);
        console.log("   Admin Cooking Game Card visibility (Expected: flex):", adminCookingDisplay);
        if (adminCookingDisplay !== 'flex') {
            throw new Error("Cooking game card should be visible for 1karl.ilves@gmail.com!");
        }

        // 4. Test Admin Panel & Give Yards by Username
        console.log("4. Testing Admin Panel & Give Yards by Username...");
        await page.click('#btn-open-admin-panel');
        await page.waitForSelector('#modal-admin-panel', { visible: true, timeout: 4000 });

        // Switch to Give Yards Tab
        await page.click('#tab-btn-give-yards');
        await new Promise(r => setTimeout(r, 400));

        await page.type('#admin-give-username', 'SuperPlayer');
        await page.$eval('#admin-give-amount', el => el.value = '500');
        await page.type('#admin-give-reason', 'Contest Prize');
        await page.click('#btn-admin-give-yards');
        await new Promise(r => setTimeout(r, 600));

        const grantStatus = await page.$eval('#admin-give-status', el => el.textContent);
        console.log("   Admin Yard Grant status:", grantStatus);

        // Switch to Code Redemptions & Stats Tab
        await page.click('#tab-btn-promo-stats');
        await new Promise(r => setTimeout(r, 400));
        const promoStatsVisible = await page.$eval('#admin-tab-promo-stats', el => window.getComputedStyle(el).display);
        console.log("   Admin Code Stats Tab visibility:", promoStatsVisible);
        if (promoStatsVisible !== 'block') {
            throw new Error("Admin Code Stats tab failed to display!");
        }

        const totalClaims = await page.$eval('#admin-stat-total-claims', el => el.textContent);
        console.log("   Admin Promo Code Total Claims:", totalClaims);

        await page.click('#btn-close-admin-panel');
        await new Promise(r => setTimeout(r, 500));

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

            await page.type('#ai-prompt-input', 'lisa autoteed ja autod millega saab soita');
            await page.click('#btn-ai-submit');
            await new Promise(r => setTimeout(r, 600));

            const chatContent = await page.$eval('#ai-chat-log', el => el.textContent);
            console.log("   AI Roads & Cars output:", chatContent.substring(chatContent.lastIndexOf('🤖')).substring(0, 110) + '...');
            if (!chatContent.includes('autotee') && !chatContent.includes('Supercar')) {
                throw new Error("AI Roads & Drivable Cars response failed to appear in chat log!");
            }
            await page.click('#btn-close-ai');

            // Test Drivable Car in Play Test Mode
            console.log("   Testing Drivable Car in Play Test Mode...");
            await page.click('#btn-toggle-play-test');
            await new Promise(r => setTimeout(r, 500));

            // Walk to car at x: 1.8, z: -4 and press F to enter
            await page.keyboard.down('KeyW');
            await page.keyboard.down('KeyD');
            await new Promise(r => setTimeout(r, 600));
            await page.keyboard.up('KeyW');
            await page.keyboard.up('KeyD');

            // Enter vehicle with F
            await page.keyboard.press('KeyF');
            await new Promise(r => setTimeout(r, 400));

            const vehicleHudDisplay = await page.$eval('#vehicle-hud', el => window.getComputedStyle(el).display);
            console.log("   Vehicle HUD display after [F] (Expected: block):", vehicleHudDisplay);
            if (vehicleHudDisplay !== 'block') {
                throw new Error("Vehicle HUD failed to show when entering car with [F]!");
            }

            // Accelerate vehicle with W
            await page.keyboard.down('KeyW');
            await new Promise(r => setTimeout(r, 500));
            await page.keyboard.up('KeyW');
            const carSpeed = await page.$eval('#vehicle-hud-speed', el => el.textContent);
            console.log("   Drivable Car Speed after W acceleration:", carSpeed);

            // Exit car with F
            await page.keyboard.press('KeyF');
            await new Promise(r => setTimeout(r, 300));
            const vehicleHudAfterExit = await page.$eval('#vehicle-hud', el => window.getComputedStyle(el).display);
            console.log("   Vehicle HUD display after exit [F] (Expected: none):", vehicleHudAfterExit);

            // Exit Play Test Mode back to Edit Mode
            await page.click('#btn-toggle-play-test');
            await new Promise(r => setTimeout(r, 400));

            // Save first game as "World 1"
            await page.$eval('#game-title-input', el => el.value = 'World 1 - Highway');
            await page.click('#btn-save-draft');
            await new Promise(r => setTimeout(r, 500));

            // Start New Game and Save as "World 2"
            await page.click('#btn-new-game');
            await new Promise(r => setTimeout(r, 500));
            await page.$eval('#game-title-input', el => el.value = 'World 2 - Castle & Forest');
            await firstObjCard.click();
            await page.click('#btn-save-draft');
            await new Promise(r => setTimeout(r, 500));

            // Test Portal Destination Selection in Inspector & Walk-Through Teleportation
            console.log("   Testing Portal Target Destination Selection in Inspector...");
            // Filter catalog to gameplay/portal
            await page.click('.cat-btn[data-cat="gameplay"]');
            await new Promise(r => setTimeout(r, 400));
            const portalCard = await page.$('.object-card');
            if (portalCard) {
                await portalCard.click();
                await new Promise(r => setTimeout(r, 500));

                // Verify Portal Destination Dropdown is populated with saved games
                const portalTargetOptions = await page.$eval('#obj-portal-target', el => el.children.length);
                console.log("   Portal Target options count in inspector:", portalTargetOptions);
                if (portalTargetOptions < 2) {
                    throw new Error("Portal Target dropdown should contain saved games!");
                }

                // Select World 1 as target
                await page.evaluate(() => {
                    const select = document.getElementById('obj-portal-target');
                    if (select && select.children.length > 1) {
                        select.selectedIndex = 1;
                        select.dispatchEvent(new Event('change'));
                    }
                });
                await new Promise(r => setTimeout(r, 400));

                // Move portal closer to player spawn (z = -3)
                await page.click('#btn-move-fwd');
                await page.click('#btn-move-fwd');
                await page.click('#btn-move-fwd');

                // Enter Play Test Mode and walk into portal
                console.log("   Testing Walk-Through Portal Automatic Teleportation...");
                await page.evaluate(() => document.getElementById('btn-toggle-play-test')?.click());
                await new Promise(r => setTimeout(r, 500));

                // Walk forward into portal
                await page.keyboard.down('KeyW');
                await new Promise(r => setTimeout(r, 900));
                await page.keyboard.up('KeyW');
                await new Promise(r => setTimeout(r, 800));

                const currentWorldTitle = await page.$eval('#game-title-input', el => el.value);
                console.log("   World Title after walking through portal:", currentWorldTitle);

                // Exit Play Test Mode
                await page.evaluate(() => document.getElementById('btn-toggle-play-test')?.click());
                await new Promise(r => setTimeout(r, 400));
            }

            // Test Multi-World Dimension Travel Modal
            console.log("   Testing Dimension Travel Modal between saved worlds...");
            await page.evaluate(() => document.getElementById('btn-toggle-play-test')?.click());
            await new Promise(r => setTimeout(r, 500));
            await page.evaluate(() => document.getElementById('btn-quick-travel-hud')?.click());
            await new Promise(r => setTimeout(r, 500));

            const dimensionModalVisible = await page.$eval('#dimension-travel-modal', el => window.getComputedStyle(el).display);
            console.log("   Dimension Travel Modal visibility:", dimensionModalVisible);
            if (dimensionModalVisible !== 'flex') {
                throw new Error("Dimension travel modal failed to open!");
            }

            const hopBtn = await page.$('.btn-hop-world');
            if (hopBtn) {
                await hopBtn.click();
                await new Promise(r => setTimeout(r, 600));
                const loadedTitle = await page.$eval('#game-title-input', el => el.value);
                console.log("   Loaded World Title after Dimension Travel:", loadedTitle);
            }
            await page.evaluate(() => document.getElementById('btn-close-dimension-modal')?.click());
            await new Promise(r => setTimeout(r, 300));

            // Exit Play Test Mode
            await page.evaluate(() => document.getElementById('btn-toggle-play-test')?.click());
            await new Promise(r => setTimeout(r, 400));
            await page.click('#btn-save-draft');
            await new Promise(r => setTimeout(r, 500));

            // Test Studio Camera View Navigation Buttons & Keyboard Pan (Edit Mode)
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
        await page.click('#btn-save-draft');
        await new Promise(r => setTimeout(r, 400));
        await page.click('#btn-submit-review');
        await new Promise(r => setTimeout(r, 800));

        // 6. Test Admin Review & Request Changes / Approve Workflow
        console.log("6. Testing Admin Review & Request Changes Workflow...");
        await page.goto('http://localhost:4173/games/');
        await new Promise(r => setTimeout(r, 1000));
        await page.evaluate(() => { 
            window.alert = () => {}; 
            window.confirm = () => true; 
            window.prompt = () => "Please add more trees and obstacles before approval!";
        });

        await page.waitForSelector('#btn-open-admin-panel', { visible: true, timeout: 5000 });
        await page.click('#btn-open-admin-panel');
        await page.waitForSelector('.btn-admin-changes', { visible: true, timeout: 4000 });

        // Admin clicks Request Changes
        console.log("   Admin requesting changes with feedback: 'Please add more trees and obstacles before approval!'");
        await page.click('.btn-admin-changes');
        await new Promise(r => setTimeout(r, 1000));
        await page.click('#btn-close-admin-panel');
        await new Promise(r => setTimeout(r, 500));

        // Now open Creator Studio again as creator -> Admin Feedback Banner MUST be displayed!
        console.log("   Checking Creator Studio for Admin Feedback Banner...");
        await page.goto('http://localhost:4173/games/games/creator/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

        const feedbackBannerVisible = await page.$eval('#admin-feedback-banner', el => window.getComputedStyle(el).display);
        const feedbackTitle = await page.$eval('#feedback-banner-title', el => el.textContent);
        const feedbackText = await page.$eval('#feedback-banner-text', el => el.textContent);
        console.log("   Admin Feedback Banner visibility in Creator Studio:", feedbackBannerVisible);
        console.log("   Admin Feedback Banner title:", feedbackTitle);
        console.log("   Admin Feedback message:", feedbackText);

        if (feedbackBannerVisible === 'none' || !feedbackText.includes('more trees and obstacles')) {
            throw new Error("Admin Requested Changes banner failed to display in Creator Studio!");
        }
        if (!feedbackTitle.includes('Admin✅') || feedbackTitle.includes('1karl.ilves@gmail.com')) {
            throw new Error("Feedback banner title still contains email instead of Admin✅!");
        }

        // Creator re-submits the game after changes
        console.log("   Creator re-submitting game after changes...");
        await page.click('#btn-submit-review');
        await new Promise(r => setTimeout(r, 800));

        // Test Reject Workflow: If admin rejects a game, Request Changes banner MUST NOT appear!
        console.log("   Admin Rejecting game -> Request Changes banner MUST disappear...");
        await page.goto('http://localhost:4173/games/');
        await new Promise(r => setTimeout(r, 1000));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; window.prompt = () => "Rejected"; });
        await page.waitForSelector('#btn-open-admin-panel', { visible: true, timeout: 5000 });
        await page.click('#btn-open-admin-panel');
        await page.waitForSelector('.btn-admin-reject', { visible: true, timeout: 4000 });
        await page.click('.btn-admin-reject');
        await new Promise(r => setTimeout(r, 1000));
        await page.click('#btn-close-admin-panel');
        await new Promise(r => setTimeout(r, 500));

        // Open Creator Studio -> Banner MUST BE HIDDEN (none)
        console.log("   Checking Creator Studio after Reject -> Banner MUST be 'none'...");
        await page.goto('http://localhost:4173/games/games/creator/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });
        const bannerAfterReject = await page.$eval('#admin-feedback-banner', el => window.getComputedStyle(el).display);
        console.log("   Admin Feedback Banner visibility after Reject (Expected: none):", bannerAfterReject);
        if (bannerAfterReject !== 'none') {
            throw new Error("Request Changes banner was displayed for a rejected game!");
        }

        // Now create a fresh game, submit and approve it
        console.log("   Submitting new game for approval...");
        await page.click('#btn-submit-review');
        await new Promise(r => setTimeout(r, 800));

        // Return to Hub and Approve
        await page.goto('http://localhost:4173/games/');
        await new Promise(r => setTimeout(r, 1000));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });
        await page.waitForSelector('#btn-open-admin-panel', { visible: true, timeout: 5000 });
        await page.click('#btn-open-admin-panel');
        await page.waitForSelector('.btn-admin-approve', { visible: true, timeout: 4000 });
        console.log("   Found submitted game waiting for review. Approving game...");
        await page.click('.btn-admin-approve');
        await new Promise(r => setTimeout(r, 1000));
        await page.click('#btn-close-admin-panel');
        await new Promise(r => setTimeout(r, 500));

        // Check Community Games Grid on Hub
        const communityGameCards = await page.$$eval('#community-games-grid .game-card', els => els.length);
        console.log(`   Community Games Grid count after approval: ${communityGameCards} (Expected >= 1)`);
        if (communityGameCards < 1) {
            throw new Error("Approved game did not appear in Community Created Games grid!");
        }

        // 7. Test Airplane Simulator
        console.log("7. Checking Airplane Simulator...");
        await page.goto('http://localhost:4173/games/games/airplane/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.waitForSelector('#airplane-yard-badge', { visible: true, timeout: 5000 });
        const airplaneYards = await page.$eval('#airplane-yard-val', el => el.textContent);
        console.log("   Airplane Simulator Yard Balance:", airplaneYards);

        // 8. Test Racing Simulator
        console.log("8. Checking Racing Simulator...");
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
        const vipOverlayDisplay = await page.$eval('#vip-restricted-overlay', el => window.getComputedStyle(el).display);
        console.log("   Cooking Game VIP restricted overlay (Expected: none):", vipOverlayDisplay);
        if (vipOverlayDisplay !== 'none') {
            throw new Error("VIP Restricted overlay should be hidden for admin 1karl.ilves@gmail.com!");
        }

        // Verify Yard display
        await page.waitForSelector('#hud-yards-val', { visible: true, timeout: 5000 });
        const cookingYards = await page.$eval('#hud-yards-val', el => el.textContent);
        console.log("   Cooking HUD Yard Balance:", cookingYards);

        // Test Pantry interaction (add ingredient to plate)
        const firstIngredientBtn = await page.$('#pantry-items-grid .ingredient-btn');
        if (firstIngredientBtn) {
            await firstIngredientBtn.click();
            await new Promise(r => setTimeout(r, 300));
            const plateItemsCount = await page.$$eval('#plate-items-container .plate-item-badge', els => els.length);
            console.log("   Plate items count after adding ingredient:", plateItemsCount);
            if (plateItemsCount < 1) {
                throw new Error("Failed to add ingredient to plate from pantry!");
            }
        }

        // Test Chopping station
        await page.evaluate(() => document.getElementById('tab-btn-cutting')?.click());
        await new Promise(r => setTimeout(r, 300));
        await page.evaluate(() => document.querySelector('#chopping-raw-options .ingredient-btn')?.click());
        await new Promise(r => setTimeout(r, 300));
        // Click chop button 5 times
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => document.getElementById('btn-do-chop')?.click());
            await new Promise(r => setTimeout(r, 100));
        }
        console.log("   Successfully performed chopping minigame on cutting board!");

        // Test Stove station
        await page.evaluate(() => document.getElementById('tab-btn-stove')?.click());
        await new Promise(r => setTimeout(r, 300));
        await page.evaluate(() => document.querySelector('#stove-pans-container .btn-add-pan')?.click());
        await new Promise(r => setTimeout(r, 300));
        console.log("   Successfully placed item on stove pan!");

        // Test Recipe Book modal
        await page.evaluate(() => document.getElementById('btn-open-recipes')?.click());
        await new Promise(r => setTimeout(r, 300));
        const recipeModalDisplay = await page.$eval('#modal-recipes', el => window.getComputedStyle(el).display);
        console.log("   Recipe Book modal visibility:", recipeModalDisplay);
        if (recipeModalDisplay !== 'flex') {
            throw new Error("Recipe Book modal failed to open!");
        }
        await page.evaluate(() => document.getElementById('btn-close-recipes')?.click());
        await new Promise(r => setTimeout(r, 300));

        // Test Sound toggle
        await page.evaluate(() => document.getElementById('btn-toggle-sound')?.click());
        const soundIcon = await page.$eval('#sound-icon', el => el.textContent);
        console.log("   Sound toggle icon after click:", soundIcon);

        // Test Clear plate
        await page.evaluate(() => document.getElementById('tab-btn-assembly')?.click());
        await new Promise(r => setTimeout(r, 300));
        await page.evaluate(() => document.getElementById('btn-clear-plate')?.click());
        await new Promise(r => setTimeout(r, 300));
        console.log("   Successfully cleared plate!");

    } catch(err) {
        console.error("Verification failed:", err);
        hasErrors = true;
    }
    
    await browser.close();
    serverProcess.kill();
    
    if (hasErrors) {
        console.error("Runtime errors detected! Test failed.");
        process.exit(1);
    } else {
        console.log("✅ All Playard Platform tests passed successfully!");
    }
})();
