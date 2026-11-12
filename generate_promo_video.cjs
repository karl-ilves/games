const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Simple static HTTP server to serve files (audio & html)
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.png': 'image/png'
};

const server = http.createServer((req, res) => {
    const cleanUrl = req.url.split('?')[0];
    let filePath = path.join(__dirname, cleanUrl === '/' ? 'promo_video.html' : cleanUrl);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'public', cleanUrl);
    }
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(8999, '127.0.0.1', async () => {
    console.log("Serving promo video generator on http://127.0.0.1:8999/promo_video.html");

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--autoplay-policy=no-user-gesture-required',
            '--enable-features=PlatformHEVCDecoderSupport'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });

    page.on('console', msg => console.log('   [Browser]', msg.text()));

    await page.goto('http://127.0.0.1:8999/promo_video.html', { waitUntil: 'networkidle0' });

    console.log("Starting 25-second video recording...");
    await page.evaluate(() => {
        window.startPromoRecording();
    });

    // Wait until recording is done (25s + buffer)
    console.log("Rendering 25s frames with audio...");
    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write(`... ${i + 1}s\r`);
        const done = await page.evaluate(() => window.__RECORDING_DONE__);
        if (done) {
            console.log("\nBrowser reported recording finished!");
            break;
        }
    }

    const dataUrl = await page.evaluate(() => window.__RECORDED_BASE64__);
    if (!dataUrl) {
        console.error("Failed to retrieve recorded base64 data!");
        await browser.close();
        server.close();
        process.exit(1);
    }

    const base64Marker = ';base64,';
    const markerIndex = dataUrl.indexOf(base64Marker);
    if (markerIndex === -1) {
        console.error("Invalid data URL string, ;base64, not found!");
        await browser.close();
        server.close();
        process.exit(1);
    }

    const header = dataUrl.substring(0, markerIndex);
    const base64Data = dataUrl.substring(markerIndex + base64Marker.length);
    const mime = header.split(';')[0].replace('data:', '');
    const buffer = Buffer.from(base64Data, 'base64');
    const outputPath = path.join(__dirname, 'playard_first_player_promo.mp4');

    fs.writeFileSync(outputPath, buffer);
    console.log(`\n🎉 VIDEO VALMIS! Salvestatud faili: ${outputPath}`);
    console.log(`Suurus: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Formaat: ${mime}`);

    // If MP4 was requested and we got webm or vice-versa, make sure an .mp4 copy exists if valid
    const mp4FinalPath = path.join(__dirname, 'playard_first_player_promo.mp4');
    if (!fs.existsSync(mp4FinalPath)) {
        fs.writeFileSync(mp4FinalPath, buffer);
        console.log(`Kopeeritud ka nimega: ${mp4FinalPath}`);
    }

    await browser.close();
    server.close();
    process.exit(0);
});
