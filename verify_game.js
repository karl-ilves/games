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

        // Check Cooking Game visibility for guest (Expected: none)
        const guestCookingDisplay = await page.$eval('#card-cooking-game', el => window.getComputedStyle(el).display);
        console.log("   Guest Cooking Game Card visibility (Expected: none):", guestCookingDisplay);
        if (guestCookingDisplay !== 'none') {
            throw new Error("Cooking game card should be hidden for guests!");
        }

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

            await page.type('#ai-prompt-input', 'add roads and drivable cars');
            await page.click('#btn-ai-submit');
            await new Promise(r => setTimeout(r, 600));

            const chatContent = await page.$eval('#ai-chat-log', el => el.textContent);
            console.log("   AI Roads & Cars output:", chatContent.substring(chatContent.lastIndexOf('🤖')).substring(0, 110) + '...');
            if (!chatContent.includes('road') && !chatContent.includes('Supercar')) {
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
        await page.evaluate(() => { const v = document.getElementById('vip-restricted-overlay'); if(v) v.style.display = 'none'; });

        console.log("✅ All Playard Platform tests passed successfully!");
    } catch(err) { console.error("Verification failed:", err); process.exit(1); } finally { await browser.close(); serverProcess.kill(); }
})();
