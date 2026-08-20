const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    const testUrl = 'file://' + path.resolve(__dirname, 'test.html');
    console.log("Loading", testUrl);
    await page.goto(testUrl);
    
    // wait a bit for tests to run
    await new Promise(r => setTimeout(r, 2000));
    
    const results = await page.evaluate(() => {
        return document.getElementById('test-results').innerText;
    });
    console.log("RESULTS:\n", results);

    await browser.close();
})();
