/**
 * PlayardImageGenerationEngine
 * Procedural & Vector Visual Art, Game Textures, Badges, Icons & Skybox Generator
 */

export interface GeneratedImageResult {
    id: string;
    prompt: string;
    title: string;
    style: 'fantasy' | 'sci_fi' | 'cyberpunk' | 'pixel_art' | 'texture' | 'badge' | 'icon' | 'nature' | 'retro';
    category: 'concept' | 'texture' | 'badge' | 'icon' | 'landscape' | 'character' | 'item';
    width: number;
    height: number;
    dataUrl: string;
    description: string;
    dominantColors: string[];
    createdAt: number;
}

export interface ImageGenOptions {
    width?: number;
    height?: number;
    style?: 'fantasy' | 'sci_fi' | 'cyberpunk' | 'pixel_art' | 'texture' | 'badge' | 'icon' | 'nature' | 'retro';
    category?: 'concept' | 'texture' | 'badge' | 'icon' | 'landscape' | 'character' | 'item';
}

export class PlayardImageGenerationEngine {
    /**
     * Synthesizes an image based on a natural language prompt
     */
    public static generateImage(prompt: string, options?: ImageGenOptions): GeneratedImageResult {
        const lower = prompt.toLowerCase().trim();
        const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

        // Detect category & style
        let category: GeneratedImageResult['category'] = 'concept';
        let style: GeneratedImageResult['style'] = options?.style || 'fantasy';

        if (/tekstuur|texture|muster|pattern|seina|põranda|materjal/i.test(lower)) {
            category = 'texture';
            style = 'texture';
        } else if (/ikoon|icon|logo|nupp|sümbol/i.test(lower)) {
            category = 'icon';
            style = 'icon';
        } else if (/märk|badge|embleem|medal|saavutus|achievement|trofee|karikas/i.test(lower)) {
            category = 'badge';
            style = 'badge';
        } else if (/kosmos|tähed|galaktika|planeet|ufo|sci-fi|ulme|robot/i.test(lower)) {
            category = /planeet|tähed|galaktika/i.test(lower) ? 'landscape' : 'concept';
            style = 'sci_fi';
        } else if (/neoon|küber|cyber|synthwave|retrowave/i.test(lower)) {
            style = 'cyberpunk';
        } else if (/piksel|pixel|retro|8-bit|16-bit/i.test(lower)) {
            style = 'pixel_art';
        } else if (/maastik|meri|rand|loodus|mets|mäed|päikeseloojang|nature|landscape/i.test(lower)) {
            category = 'landscape';
            style = 'nature';
        } else if (/mõõk|relv|kilp|rüü|kristall|münt|potion|jook|amulett|item|ese/i.test(lower)) {
            category = 'item';
            style = 'fantasy';
        } else if (/draakon|koll|koletis|tegelane|avatar|character|kangelane/i.test(lower)) {
            category = 'character';
            style = 'fantasy';
        }

        const width = options?.width || (category === 'icon' || category === 'badge' ? 256 : 512);
        const height = options?.height || width;

        // Title derivation
        let cleanSubject = prompt
            .replace(/^(?:palun\s+)?(?:loo|genereeri|tee|joonista|kuva|create|generate|draw)\s+(?:mulle\s+)?(?:uus\s+)?(?:pilt|illustratsioon|foto|tekstuur|ikoon|märk|badge|artwork|texture|image)?\s*(?:kellest|millest|kohta)?\s*/i, '')
            .trim();
        if (!cleanSubject) cleanSubject = 'Playard Fantaasiapilt';
        const title = cleanSubject.charAt(0).toUpperCase() + cleanSubject.slice(1);

        // Generate data URL via Canvas or SVG fallback
        const { dataUrl, dominantColors } = this.renderVisual(lower, style, category, width, height);

        return {
            id,
            prompt,
            title,
            style,
            category,
            width,
            height,
            dataUrl,
            description: `Kõrglahutusega ${style} stiilis visuaal (${category}): "${title}".`,
            dominantColors,
            createdAt: Date.now()
        };
    }

    /**
     * Renders procedural art onto HTML5 Canvas or SVG
     */
    private static renderVisual(
        prompt: string,
        style: GeneratedImageResult['style'],
        category: GeneratedImageResult['category'],
        width: number,
        height: number
    ): { dataUrl: string; dominantColors: string[] } {
        // In browser environment, use HTML5 Canvas for real raster PNG rendering
        if (typeof document !== 'undefined' && document.createElement) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const colors = this.paintCanvas(ctx, prompt, style, category, width, height);
                return {
                    dataUrl: canvas.toDataURL('image/png'),
                    dominantColors: colors
                };
            }
        }

        // Headless Node environment SVG fallback with embedded data URI
        const svg = this.generateSvgString(prompt, style, category, width, height);
        return {
            dataUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
            dominantColors: ['#3b82f6', '#10b981', '#f59e0b']
        };
    }

    /**
     * Paints rich procedural art using 2D Canvas context
     */
    private static paintCanvas(
        ctx: CanvasRenderingContext2D,
        prompt: string,
        style: GeneratedImageResult['style'],
        category: GeneratedImageResult['category'],
        w: number,
        h: number
    ): string[] {
        ctx.clearRect(0, 0, w, h);

        // 1. Textures (Brick, Stone, Wood, Lava, Cyber Grid)
        if (category === 'texture' || prompt.includes('tekstuur') || prompt.includes('kiviaed') || prompt.includes('sein')) {
            return this.paintTexture(ctx, prompt, w, h);
        }

        // 2. Badges & Game Icons
        if (category === 'badge' || category === 'icon' || prompt.includes('ikoon') || prompt.includes('märk')) {
            return this.paintBadgeOrIcon(ctx, prompt, style, w, h);
        }

        // 3. Space & Sci-Fi
        if (style === 'sci_fi' || prompt.includes('kosmos') || prompt.includes('galaktika') || prompt.includes('planeet')) {
            return this.paintSpace(ctx, prompt, w, h);
        }

        // 4. Landscapes & Nature
        if (category === 'landscape' || prompt.includes('mäed') || prompt.includes('päikeseloojang') || prompt.includes('rand') || prompt.includes('mets')) {
            return this.paintLandscape(ctx, prompt, w, h);
        }

        // 5. Fantasy Characters & Items (Dragons, Swords, Castles, Potions)
        return this.paintFantasyArt(ctx, prompt, w, h);
    }

    /**
     * Procedural Texture Generator (Bricks, Wood, Lava, Stone)
     */
    private static paintTexture(ctx: CanvasRenderingContext2D, prompt: string, w: number, h: number): string[] {
        const isLava = /laava|lava|tuli/i.test(prompt);
        const isWood = /puit|wood|laudis/i.test(prompt);

        if (isLava) {
            // Glowing Lava Texture
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#7f1d1d');
            grad.addColorStop(0.5, '#dc2626');
            grad.addColorStop(1, '#f97316');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Lava cracks
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 12;

            for (let i = 0; i < 12; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * w, Math.random() * h);
                for (let s = 0; s < 4; s++) {
                    ctx.lineTo(Math.random() * w, Math.random() * h);
                }
                ctx.stroke();
            }
            return ['#dc2626', '#f97316', '#fef08a'];
        }

        if (isWood) {
            // Wood plank texture
            ctx.fillStyle = '#78350f';
            ctx.fillRect(0, 0, w, h);
            const plankH = h / 6;
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#92400e' : '#b45309';
                ctx.fillRect(0, i * plankH, w, plankH - 4);
                ctx.fillStyle = '#451a03';
                ctx.fillRect(0, (i + 1) * plankH - 4, w, 4); // seam
            }
            return ['#78350f', '#92400e', '#b45309'];
        }

        // Stone Brick Texture (Default)
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, w, h);
        const brickH = h / 8;
        const brickW = w / 4;

        for (let r = 0; r < 8; r++) {
            const offset = (r % 2) * (brickW / 2);
            for (let c = -1; c < 5; c++) {
                const shade = 100 + Math.floor(Math.random() * 40);
                ctx.fillStyle = `rgb(${shade}, ${shade + 10}, ${shade + 20})`;
                ctx.fillRect(c * brickW + offset + 2, r * brickH + 2, brickW - 4, brickH - 4);
            }
        }
        return ['#334155', '#64748b', '#94a3b8'];
    }

    /**
     * Game Icon & Achievement Badge Generator
     */
    private static paintBadgeOrIcon(ctx: CanvasRenderingContext2D, prompt: string, style: string, w: number, h: number): string[] {
        // Deep background
        const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
        bgGrad.addColorStop(0, '#1e1b4b');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const r = w * 0.38;

        // Outer glow
        ctx.save();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 25;

        // Gold Shield/Badge Border
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        const goldGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        goldGrad.addColorStop(0, '#fef08a');
        goldGrad.addColorStop(0.3, '#f59e0b');
        goldGrad.addColorStop(0.7, '#d97706');
        goldGrad.addColorStop(1, '#b45309');
        ctx.strokeStyle = goldGrad;
        ctx.lineWidth = 14;
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
        ctx.fillStyle = '#312e81';
        ctx.fill();
        ctx.restore();

        // Central Emblem (Sword or Star or Crown)
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 15;

        // Star Emblem
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = cx + Math.cos(a) * (r * 0.55);
            const y = cy + Math.sin(a) * (r * 0.55);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            const aIn = a + Math.PI / 5;
            const xIn = cx + Math.cos(aIn) * (r * 0.25);
            const yIn = cy + Math.sin(aIn) * (r * 0.25);
            ctx.lineTo(xIn, yIn);
        }
        ctx.closePath();
        ctx.fill();

        return ['#f59e0b', '#312e81', '#0f172a'];
    }

    /**
     * Space & Sci-Fi Art Generator (Planets, Stars, Nebulae)
     */
    private static paintSpace(ctx: CanvasRenderingContext2D, prompt: string, w: number, h: number): string[] {
        // Deep space cosmic background
        const grad = ctx.createRadialGradient(w * 0.3, h * 0.3, 50, w / 2, h / 2, w);
        grad.addColorStop(0, '#311042');
        grad.addColorStop(0.5, '#0d1527');
        grad.addColorStop(1, '#05070f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Cosmic nebula clouds
        for (let i = 0; i < 6; i++) {
            ctx.save();
            const nx = Math.random() * w;
            const ny = Math.random() * h;
            const nr = 120 + Math.random() * 150;
            const nGrad = ctx.createRadialGradient(nx, ny, 10, nx, ny, nr);
            nGrad.addColorStop(0, i % 2 === 0 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.3)');
            nGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = nGrad;
            ctx.beginPath();
            ctx.arc(nx, ny, nr, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Twinkling stars
        for (let i = 0; i < 180; i++) {
            const sx = Math.random() * w;
            const sy = Math.random() * h;
            const sr = Math.random() * 1.8 + 0.3;
            ctx.fillStyle = i % 10 === 0 ? '#38bdf8' : (i % 8 === 0 ? '#fde047' : '#ffffff');
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }

        // Giant ringed planet
        const px = w * 0.72;
        const py = h * 0.45;
        const pr = w * 0.22;

        ctx.save();
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 35;
        const pGrad = ctx.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
        pGrad.addColorStop(0, '#f43f5e');
        pGrad.addColorStop(0.5, '#c026d3');
        pGrad.addColorStop(1, '#4c1d95');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Planet Rings
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-Math.PI / 6);
        ctx.beginPath();
        ctx.ellipse(0, 0, pr * 1.8, pr * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.75)';
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.restore();

        return ['#a855f7', '#38bdf8', '#f43f5e'];
    }

    /**
     * Landscapes & Nature (Mountains, Sunset, Water)
     */
    private static paintLandscape(ctx: CanvasRenderingContext2D, prompt: string, w: number, h: number): string[] {
        // Sunset sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
        skyGrad.addColorStop(0, '#4c1d95');
        skyGrad.addColorStop(0.4, '#db2777');
        skyGrad.addColorStop(0.7, '#f97316');
        skyGrad.addColorStop(1, '#fde047');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.65);

        // Setting Sun
        ctx.save();
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.48, w * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mountain Silhouettes
        ctx.fillStyle = '#3730a3';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.65);
        ctx.lineTo(w * 0.25, h * 0.35);
        ctx.lineTo(w * 0.5, h * 0.55);
        ctx.lineTo(w * 0.75, h * 0.3);
        ctx.lineTo(w, h * 0.65);
        ctx.closePath();
        ctx.fill();

        // Closer Mountain Ridge
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.65);
        ctx.lineTo(w * 0.35, h * 0.45);
        ctx.lineTo(w * 0.65, h * 0.6);
        ctx.lineTo(w * 0.9, h * 0.42);
        ctx.lineTo(w, h * 0.65);
        ctx.closePath();
        ctx.fill();

        // Water with reflection
        const waterGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
        waterGrad.addColorStop(0, '#1e1b4b');
        waterGrad.addColorStop(0.3, '#312e81');
        waterGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, h * 0.65, w, h * 0.35);

        // Water reflection glow
        ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
        for (let i = 0; i < 8; i++) {
            const y = h * 0.68 + i * 14;
            const rw = (w * 0.3) * (1 - i * 0.08);
            ctx.fillRect((w - rw) / 2, y, rw, 3);
        }

        return ['#db2777', '#f97316', '#1e1b4b'];
    }

    /**
     * Fantasy Art (Dragon, Castle, Glowing Swords)
     */
    private static paintFantasyArt(ctx: CanvasRenderingContext2D, prompt: string, w: number, h: number): string[] {
        // Dramatic Dark Fantasy Atmosphere
        const bgGrad = ctx.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h / 2, w * 0.8);
        bgGrad.addColorStop(0, '#7f1d1d');
        bgGrad.addColorStop(0.4, '#3b0764');
        bgGrad.addColorStop(1, '#090514');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Magical Floating Sparks
        for (let i = 0; i < 70; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#ec4899';
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2.5 + 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        const cx = w / 2;
        const cy = h * 0.52;

        if (/mõõk|sword|relv/i.test(prompt)) {
            // Glowing Runic Sword
            ctx.save();
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 25;

            // Blade
            const bladeGrad = ctx.createLinearGradient(cx - 10, cy - 140, cx + 10, cy + 60);
            bladeGrad.addColorStop(0, '#ffffff');
            bladeGrad.addColorStop(0.5, '#7dd3fc');
            bladeGrad.addColorStop(1, '#0284c7');
            ctx.fillStyle = bladeGrad;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 170); // tip
            ctx.lineTo(cx + 14, cy - 120);
            ctx.lineTo(cx + 12, cy + 60);
            ctx.lineTo(cx - 12, cy + 60);
            ctx.lineTo(cx - 14, cy - 120);
            ctx.closePath();
            ctx.fill();

            // Crossguard & Hilt
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(cx - 45, cy + 60, 90, 14); // crossguard
            ctx.fillStyle = '#78350f';
            ctx.fillRect(cx - 7, cy + 74, 14, 50); // grip
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.arc(cx, cy + 132, 14, 0, Math.PI * 2); // pommel
            ctx.fill();
            ctx.restore();

            return ['#38bdf8', '#f59e0b', '#7f1d1d'];
        }

        // Dragon Silhouette & Fiery Breath (Default Fantasy)
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 30;

        // Dragon Wings & Body Silhouette
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        // Body & Neck
        ctx.moveTo(cx - 40, cy + 100);
        ctx.quadraticCurveTo(cx - 60, cy - 20, cx - 20, cy - 80);
        // Head & Horns
        ctx.lineTo(cx - 10, cy - 100);
        ctx.lineTo(cx + 25, cy - 85);
        ctx.lineTo(cx + 40, cy - 65);
        // Left Wing
        ctx.lineTo(cx - 140, cy - 140);
        ctx.quadraticCurveTo(cx - 90, cy - 50, cx - 50, cy);
        // Right Wing
        ctx.lineTo(cx + 160, cy - 130);
        ctx.quadraticCurveTo(cx + 100, cy - 40, cx + 50, cy + 30);
        ctx.lineTo(cx + 20, cy + 120);
        ctx.closePath();
        ctx.fill();

        // Fiery Breath Stream
        const fireGrad = ctx.createLinearGradient(cx + 40, cy - 65, w * 0.95, cy - 20);
        fireGrad.addColorStop(0, '#ffffff');
        fireGrad.addColorStop(0.2, '#fde047');
        fireGrad.addColorStop(0.6, '#f97316');
        fireGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.moveTo(cx + 35, cy - 70);
        ctx.lineTo(w * 0.95, cy - 40);
        ctx.lineTo(w * 0.88, cy + 20);
        ctx.lineTo(cx + 35, cy - 60);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        return ['#ef4444', '#f59e0b', '#18181b'];
    }

    /**
     * Generates scalable SVG fallback
     */
    private static generateSvgString(prompt: string, style: string, category: string, w: number, h: number): string {
        return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
            <defs>
                <radialGradient id="bg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8" />
                    <stop offset="100%" stop-color="#0f172a" stop-opacity="1" />
                </radialGradient>
                <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#fef08a" />
                    <stop offset="100%" stop-color="#f59e0b" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bg)" />
            <circle cx="${w/2}" cy="${h/2}" r="${w*0.35}" fill="none" stroke="url(#gold)" stroke-width="8" />
            <polygon points="${w/2},${h*0.25} ${w*0.75},${h*0.75} ${w*0.25},${h*0.75}" fill="#ec4899" opacity="0.9" />
            <text x="50%" y="88%" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">
                ${prompt}
            </text>
        </svg>
        `.trim();
    }
}
