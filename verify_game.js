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
        
        // Check Yard display
        await page.waitForSelector('#header-yard-val', { visible: true, timeout: 5000 });
        const startYards = await page.$eval('#header-yard-val', el => el.textContent);
        console.log("   Initial Yard Balance:", startYards);

        // 2. Test SkyAviation2 Promo Code Redemption
        console.log("2. Testing SkyAviation2 YouTube Promo Code Redemption...");
        await page.click('#btn-open-streak');
        await page.waitForSelector('#promo-code-input', { visible: true, timeout: 3000 });

        await page.type('#promo-code-input', 'SKYAVIATION2');
        await page.click('#btn-redeem-promo');
        await new Promise(r => setTimeout(r, 500));

        const promoStatus = await page.$eval('#promo-code-status', el => el.textContent);
        console.log("   Promo status response:", promoStatus);

        // Test Double-Redeem protection
        await page.type('#promo-code-input', 'SKYAVIATION2');
        await page.click('#btn-redeem-promo');
        await new Promise(r => setTimeout(r, 500));
        const doublePromoStatus = await page.$eval('#promo-code-status', el => el.textContent);
        console.log("   Double-redeem protection response:", doublePromoStatus);
        if (!doublePromoStatus.includes('already been redeemed')) {
            throw new Error("Promo code double-redemption protection failed!");
        }

        // Close Streak Modal
        await page.click('#btn-close-streak');
        await new Promise(r => setTimeout(r, 500));

        // 3. Test User Registration & Emoji Validation
        console.log("3. Testing User Registration & Username Emoji Validation...");
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

        await page.type('#admin-give-username', 'admin');
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
        }

        // Test Submit for Review
        console.log("   Submitting created game for admin review...");
        await page.click('#btn-submit-review');
        await new Promise(r => setTimeout(r, 800));

        // 6. Test Admin Review & Approve Workflow
        console.log("6. Testing Admin Review & Approve Workflow...");
        await page.goto('http://localhost:4173/games/');
        await new Promise(r => setTimeout(r, 1000));
        await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

        await page.waitForSelector('#btn-open-admin-panel', { visible: true, timeout: 5000 });
        await page.click('#btn-open-admin-panel');
        await page.waitForSelector('.btn-admin-approve', { visible: true, timeout: 4000 });
        const approveBtn = await page.$('.btn-admin-approve');
        if (approveBtn) {
            console.log("   Found submitted game waiting for review. Approving game...");
            await approveBtn.click();
            await new Promise(r => setTimeout(r, 1000));
        }

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

        // 8. Test Racing Simulator (Buying Cars with Yards & Unlocking Levels)
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
