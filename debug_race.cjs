const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.on('console', msg => {
        console.log('BROWSER:', msg.type().toUpperCase(), msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:5173/games/racing/');
    await new Promise(r => setTimeout(r, 2000));
    
    try {
        await page.click('#btn-start-race');
        await new Promise(r => setTimeout(r, 2000));
        
        // Check if canvas is rendering by taking a screenshot or evaluating
        const info = await page.evaluate(() => {
            return {
                carModel: typeof loadedCarModel !== 'undefined' ? !!loadedCarModel : 'not defined',
                sceneChildren: window.scene ? window.scene.children.length : 'no scene',
                cameraPos: window.camera ? [window.camera.position.x, window.camera.position.y, window.camera.position.z] : 'no camera'
            }
        });
        console.log('PAGE INFO:', info);
        
    } catch(e) {
        console.log("Could not click start race", e);
    }
    
    await browser.close();
})();
