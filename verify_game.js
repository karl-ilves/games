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

    console.log("Launching headless browser to check runtime errors and Yard currency...");
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    let hasErrors = false;
    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
        hasErrors = true;
    });
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            if (msg.text().includes('404')) return;
            console.log('CONSOLE ERROR:', msg.text());
            hasErrors = true;
        }
    });

    try {
        console.log("1. Checking Playard Hub Homepage (English UI)...");
        await page.goto('http://localhost:4173/games/');
        await new Promise(r => setTimeout(r, 1000));
        
        // Check Yard display
        await page.waitForSelector('#header-yard-val', { visible: true, timeout: 5000 });
        const startYards = await page.$eval('#header-yard-val', el => el.textContent);
        console.log("   Initial Yard Balance:", startYards);

        // Test 7-Day Daily Streak Rewards Modal
        console.log("2. Testing 7-Day Daily Streak Modal...");
        await page.click('#btn-open-streak');
        await page.waitForSelector('#modal-streak', { visible: true, timeout: 3000 });
        
        const streakCardsCount = await page.$$eval('.streak-day-card', els => els.length);
        console.log(`   Found ${streakCardsCount} streak day cards (Expected: 7)`);
        if (streakCardsCount !== 7) throw new Error("Expected 7 streak cards in daily rewards!");

        // Claim Day 1 reward (5 Yards)
        console.log("   Claiming Day 1 reward (+5 Yards)...");
        await page.click('#btn-claim-daily');
        await new Promise(r => setTimeout(r, 500));
        
        // Fast forward 24h & test all 7 days up to Jackpot (+25 Y)!
        console.log("   Simulating 7-Day Streak cycle with +24h Fast Forward...");
        for (let d = 2; d <= 7; d++) {
            await page.click('#btn-debug-fastforward');
            await new Promise(r => setTimeout(r, 300));
            await page.click('#btn-claim-daily');
            await new Promise(r => setTimeout(r, 300));
        }

        const yardsAfterStreak = await page.$eval('#header-yard-val', el => el.textContent);
        console.log("   Yard Balance after full 7-day streak cycle:", yardsAfterStreak);

        // Close Streak Modal
        await page.click('#btn-close-streak');
        await new Promise(r => setTimeout(r, 500));

        // 3. Test Airplane Simulator (No Missions, Pure Simulation)
        console.log("3. Checking Airplane Simulator...");
        await page.goto('http://localhost:4173/games/games/airplane/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.waitForSelector('#airplane-yard-badge', { visible: true, timeout: 5000 });
        const airplaneYards = await page.$eval('#airplane-yard-val', el => el.textContent);
        console.log("   Airplane Simulator Yard Balance:", airplaneYards);

        console.log("   Simulating Airplane UI selection...");
        await page.waitForSelector('#btn-intro-pc', { visible: true, timeout: 5000 });
        await page.click('#btn-intro-pc');
        await new Promise(r => setTimeout(r, 500));
        await page.waitForSelector('#btn-start-pc', { visible: true, timeout: 5000 });
        await page.click('#btn-start-pc');
        await new Promise(r => setTimeout(r, 1000));

        // 4. Test Racing Simulator (Circuit Racing)
        console.log("4. Checking Racing Simulator...");
        await page.goto('http://localhost:4173/games/games/racing/index.html');
        await new Promise(r => setTimeout(r, 1500));
        await page.waitForSelector('#garage-screen', { visible: true, timeout: 5000 });
        const racingYards = await page.$eval('#racing-yard-val', el => el.textContent);
        console.log("   Racing Simulator Garage Yard Balance:", racingYards);

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
        console.log("✅ All Playard tests passed successfully!");
    }
})();
