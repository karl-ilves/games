const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.setViewport({width: 1280, height: 720});
    
    await page.goto('http://localhost:5173/games/racing/');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.click('#btn-start-race');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({path: 'race_screen.png'});
    console.log('Screenshot saved to race_screen.png');
    
    await browser.close();
})();
