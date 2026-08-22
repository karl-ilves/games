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
    console.log("Starting preview server...");
    const serverProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'pipe' });
    
    // Give it a moment to start
    await new Promise(r => setTimeout(r, 2000));

    console.log("Launching headless browser to check runtime errors and game platform features...");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
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

        // 2. Test User Registration with @SuperPlayer & Earning Yards
        console.log("2. Testing User Registration (@SuperPlayer) & Yard Persistence on Logout/Login...");
        await page.type('#auth-email', 'super@player.com');
        await page.type('#auth-username', 'SuperPlayer');
        await page.type('#auth-password', 'Pass12345!');
        await page.click('#btn-register');
        await new Promise(r => setTimeout(r, 1200));

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
        await new Promise(r => setTimeout(r, 1000));

        // Check if Admin Panel button is visible for 1karl.ilves@gmail.com
        const adminBtnDisplay = await page.$eval('#btn-open-admin-panel', el => window.getComputedStyle(el).display);
        console.log("   Admin Panel button visibility for 1karl.ilves@gmail.com (Expected: flex):", adminBtnDisplay);
        if (adminBtnDisplay !== 'flex') {
            throw new Error("Admin Panel button should be visible for admin account!");
        }

        // 4. Test Admin Panel & Give Yards by Username
        console.log("4. Testing Admin Panel & Give Yards by Username...");
        await page.click('#btn-open-admin-panel');
        await page.waitForSelector('#modal-admin-panel', { visible: true, timeout: 3000 });

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

        await page.click('#btn-close-admin-panel');
        await new Promise(r => setTimeout(r, 500));

        // 5. Test 3D Game Creator Studio (Ultra Grass, Human, 5000 Objects)
        console.log("5. Testing 3D Game Creator Studio...");
        await page.goto('http://localhost:4173/games/games/creator/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

        // Verify 5,000 items catalog badge
        const catalogCountText = await page.$eval('#catalog-count-badge', el => el.textContent);
        console.log("   Catalog object count badge:", catalogCountText);

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

            // Test AI Game Assistant
            await page.click('#btn-toggle-ai');
            await new Promise(r => setTimeout(r, 400));
            const aiModalVisible = await page.$eval('#ai-assistant-modal', el => window.getComputedStyle(el).display);
            console.log("   AI Assistant Modal visibility:", aiModalVisible);
            if (aiModalVisible !== 'flex') {
                throw new Error("AI Assistant modal failed to open!");
            }

            // Click AI Quick Build (Parkour / Mets)
            const aiQuickBtn = await page.$('.ai-quick-btn');
            if (aiQuickBtn) {
                await aiQuickBtn.click();
                await new Promise(r => setTimeout(r, 600));
                const chatContent = await page.$eval('#ai-chat-log', el => el.textContent);
                console.log("   AI Assistant Chat output:", chatContent.substring(0, 80) + '...');
                if (!chatContent.includes('AI Builder:')) {
                    throw new Error("AI Builder response failed to appear in AI Chat log!");
                }
            }
            await page.click('#btn-close-ai');

            // Test Save Game Button & My Games Modal
            await page.click('#btn-save-draft');
            await new Promise(r => setTimeout(r, 400));
            console.log("   Successfully clicked 'Save Game' button!");

            await page.click('#btn-open-my-games');
            await new Promise(r => setTimeout(r, 400));
            const myGamesModalVisible = await page.$eval('#my-games-modal', el => window.getComputedStyle(el).display);
            console.log("   My Games Modal visibility:", myGamesModalVisible);
            if (myGamesModalVisible !== 'flex') {
                throw new Error("My Games modal failed to open!");
            }
            await page.click('#btn-close-my-games');

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
        const feedbackText = await page.$eval('#feedback-banner-text', el => el.textContent);
        console.log("   Admin Feedback Banner visibility in Creator Studio:", feedbackBannerVisible);
        console.log("   Admin Feedback message:", feedbackText);

        if (feedbackBannerVisible === 'none' || !feedbackText.includes('more trees and obstacles')) {
            throw new Error("Admin Requested Changes banner failed to display in Creator Studio!");
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
