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

    console.log("Launching headless browser to check runtime errors...");
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
        console.log("Checking Homepage...");
        await page.goto('http://localhost:4173/');
        await new Promise(r => setTimeout(r, 1000));
        
        console.log("Checking Airplane Simulator...");
        await page.goto('http://localhost:4173/games/airplane/index.html');
        await new Promise(r => setTimeout(r, 2000));
        
        console.log("Simulating UI Interaction: Selecting PC platform...");
        await page.waitForSelector('#btn-intro-pc', { visible: true, timeout: 5000 });
        await page.click('#btn-intro-pc');
        await new Promise(r => setTimeout(r, 1000));
        
        console.log("Simulating UI Interaction: Selecting Helicopter...");
        await page.select('#plane-select', 'helicopter_rescue');
        await new Promise(r => setTimeout(r, 1000));
        await new Promise(r => setTimeout(r, 1000));

        console.log("Simulating UI Interaction: Clicking OK...");
        await page.waitForSelector('#btn-start-pc', { visible: true, timeout: 5000 });
        await page.click('#btn-start-pc');
        
        console.log("Waiting for game loop to run...");
        await new Promise(r => setTimeout(r, 3000));
    } catch(err) {
        console.error("Failed to load page:", err);
        hasErrors = true;
    }
    
    await browser.close();
    serverProcess.kill();
    
    if (hasErrors) {
        console.error("Runtime errors detected! Test failed.");
        process.exit(1);
    } else {
        console.log("No runtime errors detected. Test passed!");
    }
})();
