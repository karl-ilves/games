const puppeteer = require('puppeteer');
const { preview } = require('vite');

(async () => {
    let server = await preview({ preview: { port: 4173 } });
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('response', response => {
        if (!response.ok()) {
            console.error("Failed to load:", response.url(), response.status());
        }
    });

    let errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', error => {
        errors.push(error.message);
    });

    await page.goto('http://localhost:4173/games/racing/index.html', { waitUntil: 'networkidle0' });
    
    if (errors.length > 0) {
        console.error("Errors found:", errors);
        process.exit(1);
    } else {
        console.log("No errors.");
        process.exit(0);
    }
})();
