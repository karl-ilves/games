const puppeteer = require('puppeteer-core');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: "new"
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Select PC
    await page.waitForSelector('#btn-intro-pc', { visible: true });
    await page.click('#btn-intro-pc');
    await new Promise(r => setTimeout(r, 1000));
    
    // Select Helicopter
    await page.select('#plane-select', 'helicopter_rescue');
    await new Promise(r => setTimeout(r, 1000));
    
    // Inject code to log
    await page.evaluate(() => {
        window.logInterval = setInterval(() => {
            if (window.planeGroup && window.vehicleType === 'helicopter') {
                console.log(`y: ${window.planeGroup.position.y.toFixed(3)}, vel.y: ${window.planeVelocity.y.toFixed(3)}, throttle: ${window.planeThrottle}`);
            }
        }, 100);
    });
    
    // Hold W for 3 seconds
    await page.keyboard.down('w');
    await new Promise(r => setTimeout(r, 3000));
    await page.keyboard.up('w');
    
    await browser.close();
})();
