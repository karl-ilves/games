const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 9018;

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
    let filePath = path.join(__dirname, cleanUrl === '/' ? 'warning_video.html' : cleanUrl);
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

server.listen(PORT, '127.0.0.1', async () => {
    console.log(`[Warning Video] Serving on http://127.0.0.1:${PORT}/warning_video.html`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--autoplay-policy=no-user-gesture-required'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1920 });

        page.on('console', msg => console.log('   [Browser]', msg.text()));

        await page.goto(`http://127.0.0.1:${PORT}/warning_video.html`, { waitUntil: 'networkidle0' });

        console.log("[Warning Video] Starting 22-second video recording...");
        await page.evaluate(() => {
            window.startWarningRecording();
        });

        console.log("[Warning Video] Rendering 22s alert video with audio...");
        for (let i = 0; i < 50; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const done = await page.evaluate(() => window.__RECORDING_DONE__);
            if (done) {
                console.log("\n[Warning Video] Browser reported recording finished!");
                break;
            }
            process.stdout.write(`... ${i + 1}s`);
        }

        const dataUrl = await page.evaluate(() => window.__RECORDED_BASE64__);
        if (!dataUrl) {
            throw new Error("Failed to retrieve recorded base64 data!");
        }

        const base64Marker = ';base64,';
        const markerIndex = dataUrl.indexOf(base64Marker);
        if (markerIndex === -1) {
            throw new Error("Invalid data URL string, ;base64, not found!");
        }

        const base64Data = dataUrl.substring(markerIndex + base64Marker.length);
        const buffer = Buffer.from(base64Data, 'base64');
        const outputPath = path.join(__dirname, 'playard_games_update_warning.mp4');

        fs.writeFileSync(outputPath, buffer);
        console.log(`\n🎉 HOIATUSVIDEO VALMIS! Salvestatud faili: ${outputPath}`);
        console.log(`Suurus: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);

    } catch (err) {
        console.error("[Warning Video] ERROR:", err);
    } finally {
        if (browser) await browser.close();
        server.close();
        process.exit(0);
    }
});
