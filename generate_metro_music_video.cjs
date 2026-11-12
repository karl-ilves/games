const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 9015;
const DURATION_SECONDS = parseInt(process.env.DURATION || '239', 10); // Full song is ~239.64s

// 1. Simple HTTP server to serve local files
const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
    }
    if (reqPath === '/' || reqPath === '/metro_music_video.html') {
        reqPath = '/metro_music_video.html';
    }

    const filePath = path.join(__dirname, reqPath);
    if (!fs.existsSync(filePath)) {
        console.log('[Server 404]', reqPath, '->', filePath);
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4'
    };

    res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, async () => {
    console.log(`[Music Video Generator] Server running at http://localhost:${PORT}`);
    console.log(`[Music Video Generator] Target Recording Duration: ${DURATION_SECONDS}s`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            protocolTimeout: 600000,
            args: [
                '--autoplay-policy=no-user-gesture-required',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.error('PAGE ERROR:', err));

        console.log(`[Music Video Generator] Navigating to http://localhost:${PORT}/metro_music_video.html...`);
        await page.goto(`http://localhost:${PORT}/metro_music_video.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait 2 seconds for images/fonts to stabilize
        await new Promise(r => setTimeout(r, 2000));

        console.log(`[Music Video Generator] Starting audio playback and high-quality recording (${DURATION_SECONDS}s)...`);
        
        // Execute recording in page context
        const recordPromise = page.evaluate((duration) => {
            return window.startPlaybackAndRecording(duration);
        }, DURATION_SECONDS);

        // Progress logging
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const percent = Math.min(100, Math.floor((elapsed / DURATION_SECONDS) * 100));
            process.stdout.write(`\r[Recording Progress] ${elapsed}s / ${DURATION_SECONDS}s (${percent}%)`);
            if (elapsed >= DURATION_SECONDS + 2) {
                clearInterval(interval);
                console.log('');
            }
        }, 5000);

        const dataUrl = await recordPromise;
        clearInterval(interval);
        console.log('\n[Music Video Generator] Recording finished! Processing video output...');

        // Clean split on ';base64,' to avoid codec string commas
        const base64Index = dataUrl.indexOf(';base64,');
        if (base64Index === -1) {
            throw new Error('Invalid data URL returned: missing ;base64, marker');
        }
        const base64Data = dataUrl.substring(base64Index + 8);
        const buffer = Buffer.from(base64Data, 'base64');

        const outputPath = path.join(__dirname, 'last_metro_full_music_video.mp4');
        fs.writeFileSync(outputPath, buffer);

        const stats = fs.statSync(outputPath);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`[Music Video Generator] SUCCESS! Saved video to: ${outputPath}`);
        console.log(`[Music Video Generator] File size: ${sizeMb} MB`);

        // Inspect header bytes
        const fd = fs.openSync(outputPath, 'r');
        const headerBuf = Buffer.alloc(16);
        fs.readSync(fd, headerBuf, 0, 16, 0);
        fs.closeSync(fd);
        console.log(`[Music Video Generator] File header: ${headerBuf.toString('hex')} | ASCII: ${headerBuf.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);

    } catch (err) {
        console.error('[Music Video Generator] ERROR:', err);
    } finally {
        if (browser) await browser.close();
        server.close();
        process.exit(0);
    }
});
