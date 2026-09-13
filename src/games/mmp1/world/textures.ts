import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getWoodPlankTexture(): THREE.CanvasTexture {
    if (textureCache.has('wood')) return textureCache.get('wood')!;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#5a3b22';
    ctx.fillRect(0, 0, 512, 512);

    const plankH = 64;
    for (let y = 0; y < 512; y += plankH) {
        ctx.fillStyle = (y / plankH) % 2 === 0 ? '#634226' : '#55371f';
        ctx.fillRect(0, y, 512, plankH - 2);

        ctx.strokeStyle = 'rgba(25, 14, 8, 0.28)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 16; i++) {
            const gy = y + Math.random() * plankH;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.bezierCurveTo(160, gy + (Math.random() - 0.5) * 6, 360, gy + (Math.random() - 0.5) * 6, 512, gy);
            ctx.stroke();
        }

        ctx.fillStyle = '#1c1007';
        ctx.fillRect(0, y + plankH - 2, 512, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    textureCache.set('wood', tex);
    return tex;
}

export function getMarbleTileTexture(): THREE.CanvasTexture {
    if (textureCache.has('marble')) return textureCache.get('marble')!;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 128;
    for (let x = 0; x < 512; x += tileSize) {
        for (let y = 0; y < 512; y += tileSize) {
            const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
            ctx.fillStyle = isAlt ? '#2e353d' : '#1e2227';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

            ctx.strokeStyle = isAlt ? 'rgba(200, 220, 245, 0.16)' : 'rgba(255, 255, 255, 0.09)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + Math.random() * tileSize, y);
            ctx.bezierCurveTo(x + tileSize * 0.4, y + tileSize * 0.5, x + tileSize * 0.7, y + tileSize * 0.3, x + tileSize, y + Math.random() * tileSize);
            ctx.stroke();

            ctx.strokeStyle = '#0d1014';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, tileSize, tileSize);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    textureCache.set('marble', tex);
    return tex;
}

export function getCarpetFabricTexture(): THREE.CanvasTexture {
    if (textureCache.has('carpet')) return textureCache.get('carpet')!;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#7a0016';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < 256; i += 4) {
        ctx.fillRect(i, 0, 2, 256);
        ctx.fillRect(0, i, 2, 256);
    }

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 236, 236);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 8);
    textureCache.set('carpet', tex);
    return tex;
}

export function getDiamondSteelTexture(): THREE.CanvasTexture {
    if (textureCache.has('steel')) return textureCache.get('steel')!;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2c3539';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#3f4c54';
    ctx.strokeStyle = '#181e22';
    ctx.lineWidth = 1;

    const step = 32;
    for (let x = 0; x < 256; x += step) {
        for (let y = 0; y < 256; y += step) {
            ctx.save();
            ctx.translate(x + 16, y + 16);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-6, -2, 12, 4);
            ctx.strokeRect(-6, -2, 12, 4);
            ctx.restore();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    textureCache.set('steel', tex);
    return tex;
}

export function getSandRippleTexture(): THREE.CanvasTexture {
    if (textureCache.has('sand')) return textureCache.get('sand')!;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(180, 130, 85, 0.35)';
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(128, y + 6, 256, y - 6, 384, y + 8);
        ctx.bezierCurveTo(440, y - 4, 480, y + 4, 512, y);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    textureCache.set('sand', tex);
    return tex;
}

export function getDamascusSteelTexture(): THREE.CanvasTexture {
    if (textureCache.has('damascus')) return textureCache.get('damascus')!;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3a4045';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#c8d3dc';
    ctx.lineWidth = 1.8;
    for (let y = 0; y < 256; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(64, y + 5, 128, y - 5, 192, y + 4);
        ctx.bezierCurveTo(220, y - 3, 240, y + 2, 256, y);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 4);
    textureCache.set('damascus', tex);
    return tex;
}
