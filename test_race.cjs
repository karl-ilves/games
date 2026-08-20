const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:5173/games/racing/');
    await new Promise(r => setTimeout(r, 2000));
    // Click Start Race
    try {
        await page.click('#btn-start-race');
        await new Promise(r => setTimeout(r, 2000));
    } catch(e) {
        console.log("Could not click start race");
    }
    
    await browser.close();
})();
