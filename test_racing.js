import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.goto('http://localhost:5174/games/racing/index.html');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Clicking shop button...');
    await page.click('#btn-open-shop').catch(e => console.log('Error clicking shop:', e.message));
    
    await new Promise(r => setTimeout(r, 1000));
    await browser.close();
})();
