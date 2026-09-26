import { GridPoint, FoodItem, FoodType, Direction } from '../types';
import { SNAKE_CONFIG } from '../catalog';

export class SnakeRenderer {
    public static renderBackground(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        offsetX: number,
        offsetY: number,
        playAreaWidth: number,
        playAreaHeight: number,
        cols: number,
        rows: number,
        tileSize: number
    ) {
        // Clear whole canvas
        ctx.fillStyle = '#06090f';
        ctx.fillRect(0, 0, width, height);

        // Playfield background
        ctx.save();
        ctx.fillStyle = SNAKE_CONFIG.THEME.bg;
        ctx.fillRect(offsetX, offsetY, playAreaWidth, playAreaHeight);

        // Grid lines
        ctx.strokeStyle = SNAKE_CONFIG.THEME.gridLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
            const x = offsetX + c * tileSize;
            ctx.moveTo(x, offsetY);
            ctx.lineTo(x, offsetY + playAreaHeight);
        }
        for (let r = 0; r <= rows; r++) {
            const y = offsetY + r * tileSize;
            ctx.moveTo(offsetX, y);
            ctx.lineTo(offsetX + playAreaWidth, y);
        }
        ctx.stroke();

        // Glowing outer border
        ctx.strokeStyle = SNAKE_CONFIG.THEME.border;
        ctx.lineWidth = 3;
        ctx.shadowColor = SNAKE_CONFIG.THEME.borderGlow;
        ctx.shadowBlur = 12;
        ctx.strokeRect(offsetX, offsetY, playAreaWidth, playAreaHeight);
        ctx.restore();
    }

    public static renderFood(
        ctx: CanvasRenderingContext2D,
        foodItems: FoodItem[],
        offsetX: number,
        offsetY: number,
        tileSize: number,
        time: number
    ) {
        ctx.save();
        for (const item of foodItems) {
            const cx = offsetX + item.x * tileSize + tileSize / 2;
            const cy = offsetY + item.y * tileSize + tileSize / 2;
            const radius = (tileSize / 2) * 0.78;

            const pulse = Math.sin(time * 5 + (item.pulsePhase || 0)) * 0.12 + 1;
            const currentRadius = radius * pulse;

            const config = SNAKE_CONFIG.FOOD[item.type];
            ctx.shadowColor = config.glowColor;
            ctx.shadowBlur = 14;

            if (item.type === 'apple') {
                // Red glowing apple
                const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, currentRadius);
                grad.addColorStop(0, '#ff6b81');
                grad.addColorStop(1, '#ff4757');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
                ctx.fill();

                // Apple stem & leaf
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#2ed573';
                ctx.beginPath();
                ctx.ellipse(cx + 3, cy - currentRadius + 1, 3.5, 2, 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else if (item.type === 'star') {
                // Golden star
                ctx.fillStyle = '#ffd700';
                this.drawStar(ctx, cx, cy, 5, currentRadius * 1.1, currentRadius * 0.5);
                ctx.fill();
            } else if (item.type === 'freeze') {
                // Cyan freeze berry
                const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, currentRadius);
                grad.addColorStop(0, '#70a1ff');
                grad.addColorStop(1, '#00d2d3');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
                ctx.fill();

                // Ice crystal sparkle
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(cx - 1, cy - currentRadius * 0.7, 2, currentRadius * 1.4);
                ctx.fillRect(cx - currentRadius * 0.7, cy - 1, currentRadius * 1.4, 2);
            } else if (item.type === 'magnet') {
                // Purple magnet berry
                const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, currentRadius);
                grad.addColorStop(0, '#e056fd');
                grad.addColorStop(1, '#a55eea');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
                ctx.fill();

                // Pulse ring
                ctx.strokeStyle = 'rgba(224, 86, 253, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, currentRadius + 4 * pulse, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    public static renderSnake(
        ctx: CanvasRenderingContext2D,
        body: GridPoint[],
        direction: Direction,
        activePowerUp: FoodType | null,
        offsetX: number,
        offsetY: number,
        tileSize: number,
        time: number
    ) {
        if (body.length === 0) return;

        ctx.save();

        // 1. Draw Body Segments (tail to neck)
        const total = body.length;
        for (let i = total - 1; i > 0; i--) {
            const seg = body[i];
            const px = offsetX + seg.x * tileSize + 1.5;
            const py = offsetY + seg.y * tileSize + 1.5;
            const size = tileSize - 3;

            const t = i / total;
            // Color gradient from head to tail
            const r = Math.round(46 * (1 - t) + 16 * t);
            const g = Math.round(213 * (1 - t) + 172 * t);
            const b = Math.round(115 * (1 - t) + 132 * t);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

            ctx.shadowColor = 'rgba(46, 213, 115, 0.4)';
            ctx.shadowBlur = 6;

            const radius = Math.max(3, (size / 2) * (1 - t * 0.3));
            this.drawRoundedRect(ctx, px, py, size, size, radius);
            ctx.fill();
        }

        // 2. Draw Head
        const head = body[0];
        const hx = offsetX + head.x * tileSize + 1.5;
        const hy = offsetY + head.y * tileSize + 1.5;
        const hsize = tileSize - 3;

        // Power-Up aura if active
        if (activePowerUp) {
            ctx.save();
            ctx.strokeStyle = activePowerUp === 'freeze' ? '#00d2d3' : '#a55eea';
            ctx.lineWidth = 3;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 15;
            const auraPulse = Math.sin(time * 8) * 3 + 4;
            this.drawRoundedRect(ctx, hx - auraPulse / 2, hy - auraPulse / 2, hsize + auraPulse, hsize + auraPulse, 10);
            ctx.stroke();
            ctx.restore();
        }

        // Head Base
        ctx.fillStyle = SNAKE_CONFIG.SNAKE.colors.head;
        ctx.shadowColor = SNAKE_CONFIG.SNAKE.colors.headGlow;
        ctx.shadowBlur = 12;
        this.drawRoundedRect(ctx, hx, hy, hsize, hsize, 8);
        ctx.fill();

        // 3. Eyes on Head looking towards movement direction
        ctx.shadowBlur = 0;
        const cx = hx + hsize / 2;
        const cy = hy + hsize / 2;
        let eye1X = cx;
        let eye1Y = cy;
        let eye2X = cx;
        let eye2Y = cy;
        const eyeOffset = hsize * 0.26;
        const eyeForward = hsize * 0.22;
        const eyeRadius = hsize * 0.16;
        const pupilRadius = hsize * 0.08;

        let pupilShiftX = 0;
        let pupilShiftY = 0;

        switch (direction) {
            case 'RIGHT':
                eye1X = cx + eyeForward; eye1Y = cy - eyeOffset;
                eye2X = cx + eyeForward; eye2Y = cy + eyeOffset;
                pupilShiftX = 1.5;
                break;
            case 'LEFT':
                eye1X = cx - eyeForward; eye1Y = cy - eyeOffset;
                eye2X = cx - eyeForward; eye2Y = cy + eyeOffset;
                pupilShiftX = -1.5;
                break;
            case 'UP':
                eye1X = cx - eyeOffset; eye1Y = cy - eyeForward;
                eye2X = cx + eyeOffset; eye2Y = cy - eyeForward;
                pupilShiftY = -1.5;
                break;
            case 'DOWN':
                eye1X = cx - eyeOffset; eye1Y = cy + eyeForward;
                eye2X = cx + eyeOffset; eye2Y = cy + eyeForward;
                pupilShiftY = 1.5;
                break;
        }

        // Eye whites
        ctx.fillStyle = SNAKE_CONFIG.SNAKE.colors.eyeWhite;
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupils
        ctx.fillStyle = SNAKE_CONFIG.SNAKE.colors.eyePupil;
        ctx.beginPath();
        ctx.arc(eye1X + pupilShiftX, eye1Y + pupilShiftY, pupilRadius, 0, Math.PI * 2);
        ctx.arc(eye2X + pupilShiftX, eye2Y + pupilShiftY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();

        // Flickering tongue (animated)
        if (Math.sin(time * 12) > 0.3) {
            ctx.fillStyle = SNAKE_CONFIG.SNAKE.colors.tongue;
            let tx = cx;
            let ty = cy;
            let tw = 2;
            let th = 6;
            if (direction === 'RIGHT') { tx = hx + hsize; ty = cy - 1; tw = 6; th = 2; }
            else if (direction === 'LEFT') { tx = hx - 6; ty = cy - 1; tw = 6; th = 2; }
            else if (direction === 'UP') { tx = cx - 1; ty = hy - 6; tw = 2; th = 6; }
            else if (direction === 'DOWN') { tx = cx - 1; ty = hy + hsize; tw = 2; th = 6; }
            ctx.fillRect(tx, ty, tw, th);
        }

        ctx.restore();
    }

    private static drawRoundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
    ) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.arcTo(x + w, y, x + w, y + radius, radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
        ctx.lineTo(x + radius, y + h);
        ctx.arcTo(x, y + h, x, y + h - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }

    private static drawStar(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        spikes: number,
        outerRadius: number,
        innerRadius: number
    ) {
        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }
}
