const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.goto('http://localhost:5174/games/racing/');
    await new Promise(r => setTimeout(r, 2000));
    
    // Simulate setting level 2 and starting race
    await page.evaluate(() => {
        console.log("Money: ", document.getElementById('money-val').innerText);
        const btnLevel2 = document.getElementById('btn-level-2');
        if (btnLevel2) btnLevel2.click();
        console.log("Selected level bg: ", btnLevel2.style.background);
        
        const startBtn = document.getElementById('btn-start-race');
        if (startBtn) startBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const count = await page.evaluate(() => {
        return document.getElementById('pos-val') ? document.getElementById('pos-val').innerText : 'not found';
    });
    console.log("HUD Position:", count);
    
    await browser.close();
})();
