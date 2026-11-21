/**
 * PAdmin (Kassivend) Special View Mode
 * 
 * When user is logged in as 'PAdmin' (case-insensitive) or email 'padmin@playard.com':
 * 1. Screen turns completely white (#ffffff) everywhere, hiding all normal UI/games/backgrounds.
 * 2. Top centered: sleek "Log Out" button.
 * 3. Middle center: side-by-side (or responsive wrap) charts for:
 *    A) "Uued kontod" (Accounts Created):
 *       - Period filters: "Täna" (1 punkt / tänane päev), "Nädal" (7 viimast päeva / 7 punkti), "Kuu" (30 viimast päeva / 30 punkti)
 *       - Smooth SVG line graph with dots
 *       - Hover tooltip near mouse showing:
 *         * Total accounts created on that day
 *         * 👦 Poisid: X, 👧 Tüdrukud: Y (või Määramata: Z)
 *    B) "Uued mängud" (Games Created):
 *       - Exactly same principle and filter period
 *       - Hover tooltip near mouse showing:
 *         * Total games created on that day
 * 4. Lower table removed as requested.
 */

import { getCurrentUserProfile } from '../auth';
import { supabase } from '../lib/supabase';

const PADMIN_STYLE_ID = 'padmin-whiteout-style';
const PADMIN_CONTAINER_ID = 'padmin-special-container';
const PADMIN_TOOLTIP_ID = 'padmin-hover-tooltip';

export function isPAdminUser(usernameOrEmail?: string | null): boolean {
    if (!usernameOrEmail) return false;
    const clean = usernameOrEmail.trim().toLowerCase();
    return clean === 'padmin' || clean === 'padmin@playard.com';
}

export type FilterPeriod = 'today' | 'week' | 'month';

export interface ProfileRecord {
    createdAt: string;
    gender?: string | null;
}

export interface GameRecord {
    createdAt: string;
    title?: string;
}

export interface ChartDayPoint {
    dateLabel: string; // e.g. "20. Nov"
    isoDate: string;   // "2026-11-20"
    count: number;
    boysCount: number;
    girlsCount: number;
    otherCount: number;
}

let cachedProfiles: ProfileRecord[] | null = null;
let cachedGames: GameRecord[] | null = null;
let activePeriod: FilterPeriod = 'week'; // Default to week (7 viimast päeva)

async function fetchAccountsData(): Promise<ProfileRecord[]> {
    if (cachedProfiles) return cachedProfiles;
    const list: ProfileRecord[] = [];

    if (supabase) {
        try {
            const { data, error } = await supabase.from('profiles').select('created_at, gender');
            if (!error && Array.isArray(data)) {
                data.forEach((r: any) => {
                    if (r?.created_at) {
                        list.push({
                            createdAt: r.created_at,
                            gender: r.gender
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('PAdmin fetchAccountsData error:', e);
        }
    }

    try {
        const rawLocal = localStorage.getItem('playard_current_user_profile');
        if (rawLocal) {
            const p = JSON.parse(rawLocal);
            if (p?.created_at) list.push({ createdAt: p.created_at, gender: p.gender });
        }
    } catch {}

    cachedProfiles = list;
    return list;
}

async function fetchGamesData(): Promise<GameRecord[]> {
    if (cachedGames) return cachedGames;
    const list: GameRecord[] = [];

    if (supabase) {
        try {
            const { data, error } = await supabase.from('user_created_games').select('id, title, category, created_at').limit(500);
            if (!error && Array.isArray(data)) {
                data.forEach((r: any) => {
                    if (!r.title) return;
                    if (r.title.startsWith('GAME_STATS:')) return;
                    if (r.title.startsWith('ACTIVE_GAME:')) return;
                    if (r.category === 'friend_request' || r.category === 'friend_relation') return;
                    if (r.created_at) {
                        list.push({ createdAt: r.created_at, title: r.title });
                    }
                });
            }
        } catch (e) {
            console.warn('PAdmin fetchGamesData error:', e);
        }
    }

    // Local storage fallback / addition
    try {
        const rawLocal = localStorage.getItem('playard_user_created_games') || localStorage.getItem('playard_created_games');
        if (rawLocal) {
            const arr = JSON.parse(rawLocal);
            if (Array.isArray(arr)) {
                arr.forEach((g: any) => {
                    const c = g.createdAt || g.created_at || (g.id && typeof g.id === 'string' && g.id.startsWith('game_') ? new Date(parseInt(g.id.split('_')[1], 10)).toISOString() : null);
                    if (c) list.push({ createdAt: c, title: g.title });
                });
            }
        }
    } catch {}

    cachedGames = list;
    return list;
}

function buildDailyPoints(
    items: { createdAt: string; gender?: string | null }[],
    period: FilterPeriod
): ChartDayPoint[] {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthNames = ['Jaan', 'Veebr', 'Märts', 'Apr', 'Mai', 'Juuni', 'Juuli', 'Aug', 'Sept', 'Okt', 'Nov', 'Dets'];

    let numDays = 7;
    if (period === 'today') numDays = 1;
    else if (period === 'week') numDays = 7;
    else if (period === 'month') numDays = 30;

    // Prepare date buckets map
    const bucketMap: { [iso: string]: { count: number; boys: number; girls: number; other: number } } = {};

    items.forEach(item => {
        try {
            const d = new Date(item.createdAt);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!bucketMap[iso]) bucketMap[iso] = { count: 0, boys: 0, girls: 0, other: 0 };
            bucketMap[iso].count++;
            const g = (item.gender || '').toLowerCase().trim();
            if (g === 'boy' || g === 'poiss') bucketMap[iso].boys++;
            else if (g === 'girl' || g === 'tüdruk') bucketMap[iso].girls++;
            else bucketMap[iso].other++;
        } catch {}
    });

    const points: ChartDayPoint[] = [];

    for (let i = numDays - 1; i >= 0; i--) {
        const cur = new Date(end);
        cur.setDate(cur.getDate() - i);
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        const label = `${cur.getDate()}. ${monthNames[cur.getMonth()]}`;

        const bucket = bucketMap[iso] || { count: 0, boys: 0, girls: 0, other: 0 };
        points.push({
            dateLabel: label,
            isoDate: iso,
            count: bucket.count,
            boysCount: bucket.boys,
            girlsCount: bucket.girls,
            otherCount: bucket.other
        });
    }

    return points;
}

function getOrCreateTooltip(): HTMLElement {
    let tip = document.getElementById(PADMIN_TOOLTIP_ID);
    if (!tip) {
        tip = document.createElement('div');
        tip.id = PADMIN_TOOLTIP_ID;
        tip.style.cssText = `
            position: fixed;
            display: none;
            z-index: 2147483647;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(8px);
            color: #ffffff;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 0.8rem;
            line-height: 1.4;
            pointer-events: none;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transform: translate(-50%, -120%);
            white-space: nowrap;
            transition: opacity 0.1s ease, transform 0.1s ease;
        `;
        document.body.appendChild(tip);
    }
    return tip;
}

function renderSingleChartSvg(
    points: ChartDayPoint[],
    chartType: 'accounts' | 'games',
    primaryColor: string,
    accentGrad: string
): string {
    const svgWidth = 460;
    const svgHeight = 160;
    const paddingX = 35;
    const paddingY = 28;
    const plotWidth = svgWidth - paddingX * 2;
    const plotHeight = svgHeight - paddingY * 2;

    const maxCount = Math.max(1, ...points.map(p => p.count));
    const isSinglePoint = points.length === 1;

    const svgPoints = points.map((p, idx) => {
        const x = isSinglePoint ? svgWidth / 2 : paddingX + (idx / (points.length - 1)) * plotWidth;
        const y = svgHeight - paddingY - (p.count / maxCount) * plotHeight;
        return { ...p, x, y };
    });

    const polylineStr = svgPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaStr = isSinglePoint
        ? ''
        : `${svgPoints[0].x},${svgHeight - paddingY} ${polylineStr} ${svgPoints[svgPoints.length - 1].x},${svgHeight - paddingY}`;

    // Point radius depends on number of points (30 points -> smaller radius)
    const dotRadius = points.length > 20 ? 3.5 : 5.5;

    // Y-axis tick values (e.g. 0, mid, max)
    const midCount = maxCount > 1 ? Math.round(maxCount / 2) : null;
    const midY = svgHeight - paddingY - (plotHeight / 2);

    return `
        <svg class="padmin-chart-svg" data-chart="${chartType}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: auto; overflow: visible; display: block;">
            <defs>
                <linearGradient id="grad_${chartType}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.32" />
                    <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.0" />
                </linearGradient>
            </defs>

            <!-- Y-Axis Horizontal Grid Lines and Left Numbers -->
            <!-- Top / Max Line -->
            <line x1="${paddingX}" y1="${paddingY}" x2="${svgWidth - 15}" y2="${paddingY}" stroke="#e2e8f0" stroke-dasharray="4" />
            <text x="${paddingX - 10}" y="${paddingY + 4}" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="end">
                ${maxCount}
            </text>

            <!-- Middle Line (if max > 1) -->
            ${midCount !== null && midCount !== maxCount && midCount > 0 ? `
                <line x1="${paddingX}" y1="${midY.toFixed(1)}" x2="${svgWidth - 15}" y2="${midY.toFixed(1)}" stroke="#f1f5f9" stroke-dasharray="3" />
                <text x="${paddingX - 10}" y="${(midY + 4).toFixed(1)}" font-size="10" font-weight="600" fill="#cbd5e1" text-anchor="end">
                    ${midCount}
                </text>
            ` : ''}

            <!-- Bottom / Zero Line -->
            <line x1="${paddingX}" y1="${svgHeight - paddingY}" x2="${svgWidth - 15}" y2="${svgHeight - paddingY}" stroke="#cbd5e1" stroke-width="1.5" />
            <text x="${paddingX - 10}" y="${svgHeight - paddingY + 4}" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="end">
                0
            </text>

            ${!isSinglePoint ? `<polygon points="${areaStr}" fill="url(#grad_${chartType})" />` : ''}
            ${!isSinglePoint ? `<polyline points="${polylineStr}" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}

            <!-- Dots (Täpid) & Interactive Hit Areas -->
            ${svgPoints.map((p, idx) => `
                <g class="padmin-chart-dot-group"
                   data-chart="${chartType}"
                   data-label="${p.dateLabel}"
                   data-count="${p.count}"
                   data-boys="${p.boysCount}"
                   data-girls="${p.girlsCount}"
                   data-other="${p.otherCount}"
                   style="cursor: pointer;">
                    <!-- Visible dot -->
                    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dotRadius}" fill="#ffffff" stroke="${primaryColor}" stroke-width="${points.length > 20 ? 2 : 3}" />
                    
                    <!-- Label numbers on top (if fewer points or non-zero) -->
                    ${(points.length <= 10 || p.count > 0) ? `
                        <text x="${p.x.toFixed(1)}" y="${(p.y - (dotRadius + 5)).toFixed(1)}" font-size="${points.length > 10 ? 9 : 11}" font-weight="800" fill="#1e293b" text-anchor="middle">
                            ${p.count}
                        </text>
                    ` : ''}

                    <!-- Larger invisible hover target for easy mouseover -->
                    <circle class="padmin-dot-hit" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="14" fill="transparent" />
                </g>
            `).join('')}
        </svg>
    `;
}

function renderPAdminDashboard(container: HTMLElement, accountPoints: ChartDayPoint[], gamePoints: ChartDayPoint[], period: FilterPeriod) {
    const totalAccounts = accountPoints.reduce((sum, p) => sum + p.count, 0);
    const totalGames = gamePoints.reduce((sum, p) => sum + p.count, 0);

    const periodSubtitles: { [k in FilterPeriod]: string } = {
        today: 'Tänane päev (1 punkt)',
        week: '7 viimast päeva (7 punkti)',
        month: '30 viimast päeva (30 punkti)'
    };

    const html = `
        <!-- Top Centered Logout Button -->
        <div style="
            position: fixed;
            top: 24px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            z-index: 2147483647;
            pointer-events: none;
        ">
            <button id="btn-padmin-logout" style="
                pointer-events: auto;
                padding: 12px 34px;
                background: #111827;
                color: #ffffff;
                border: 2px solid #000000;
                border-radius: 9999px;
                cursor: pointer;
                font-weight: 800;
                font-size: 1rem;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                transition: transform 0.15s, background-color 0.15s;
                font-family: inherit;
            ">
                Log Out
            </button>
        </div>

        <!-- Center Container -->
        <div id="padmin-stats-card" style="
            width: 1060px;
            max-width: calc(100vw - 32px);
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 24px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
            padding: 28px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 22px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
        ">
            <!-- Filter Bar: Täna, Nädal, Kuu -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 18px;">
                <div>
                    <h1 style="margin: 0; font-size: 1.4rem; font-weight: 900; letter-spacing: -0.4px; color: #0f172a;">
                        Statistika ülevaade
                    </h1>
                    <div style="font-size: 0.85rem; color: #64748b; margin-top: 3px;">
                        ${periodSubtitles[period]}
                    </div>
                </div>

                <div id="padmin-filter-group" style="display: inline-flex; background: #f1f5f9; padding: 4px; border-radius: 14px; gap: 4px;">
                    <button class="padmin-filter-btn" data-period="today" style="
                        padding: 8px 18px;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 0.85rem;
                        font-weight: 700;
                        transition: all 0.15s;
                        background: ${period === 'today' ? '#ffffff' : 'transparent'};
                        color: ${period === 'today' ? '#0f172a' : '#64748b'};
                        box-shadow: ${period === 'today' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'};
                    ">Täna</button>
                    <button class="padmin-filter-btn" data-period="week" style="
                        padding: 8px 18px;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 0.85rem;
                        font-weight: 700;
                        transition: all 0.15s;
                        background: ${period === 'week' ? '#ffffff' : 'transparent'};
                        color: ${period === 'week' ? '#0f172a' : '#64748b'};
                        box-shadow: ${period === 'week' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'};
                    ">Nädal</button>
                    <button class="padmin-filter-btn" data-period="month" style="
                        padding: 8px 18px;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 0.85rem;
                        font-weight: 700;
                        transition: all 0.15s;
                        background: ${period === 'month' ? '#ffffff' : 'transparent'};
                        color: ${period === 'month' ? '#0f172a' : '#64748b'};
                        box-shadow: ${period === 'month' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'};
                    ">Kuu</button>
                </div>
            </div>

            <!-- Side-by-Side Charts (Kontod vs Mängud) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
                <!-- Chart 1: Uued kontod -->
                <div id="padmin-accounts-card" style="
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 1rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                <span>👤</span>
                                <span>Uued kontod</span>
                            </div>
                            <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                                Liiguta hiir täpi kohale detailideks
                            </div>
                        </div>
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-weight: 900; font-size: 1.1rem; padding: 4px 14px; border-radius: 12px;">
                            ${totalAccounts}
                        </div>
                    </div>

                    <div style="background: #ffffff; border-radius: 14px; padding: 10px; border: 1px solid #e2e8f0;">
                        ${renderSingleChartSvg(accountPoints, 'accounts', '#2563eb', '#3b82f6')}
                    </div>
                </div>

                <!-- Chart 2: Uued mängud -->
                <div id="padmin-games-card" style="
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 1rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                <span>🎮</span>
                                <span>Uued mängud</span>
                            </div>
                            <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                                Liiguta hiir täpi kohale detailideks
                            </div>
                        </div>
                        <div style="background: #fdf2f8; border: 1px solid #fbcfe8; color: #be185d; font-weight: 900; font-size: 1.1rem; padding: 4px 14px; border-radius: 12px;">
                            ${totalGames}
                        </div>
                    </div>

                    <div style="background: #ffffff; border-radius: 14px; padding: 10px; border: 1px solid #e2e8f0;">
                        ${renderSingleChartSvg(gamePoints, 'games', '#db2777', '#f472b6')}
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Attach logout button
    const logoutBtn = container.querySelector('#btn-padmin-logout');
    logoutBtn?.addEventListener('click', () => {
        const originalLogout = document.getElementById('btn-logout');
        if (originalLogout) {
            originalLogout.click();
        } else {
            localStorage.removeItem('playard_current_user_profile');
            window.location.reload();
        }
    });

    // Attach filter buttons
    const filterBtns = container.querySelectorAll('.padmin-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const p = btn.getAttribute('data-period') as FilterPeriod;
            if (p && p !== activePeriod) {
                activePeriod = p;
                const accounts = await fetchAccountsData();
                const games = await fetchGamesData();
                const accPts = buildDailyPoints(accounts, activePeriod);
                const gamePts = buildDailyPoints(games, activePeriod);
                renderPAdminDashboard(container, accPts, gamePts, activePeriod);
            }
        });
    });

    // Tooltip logic for mouseover
    const tooltip = getOrCreateTooltip();
    const dotGroups = container.querySelectorAll('.padmin-chart-dot-group');

    dotGroups.forEach(group => {
        const showTip = (e: MouseEvent) => {
            const chart = group.getAttribute('data-chart');
            const label = group.getAttribute('data-label') || '';
            const count = group.getAttribute('data-count') || '0';
            const boys = group.getAttribute('data-boys') || '0';
            const girls = group.getAttribute('data-girls') || '0';
            const other = group.getAttribute('data-other') || '0';

            if (chart === 'accounts') {
                let genderLine = `👦 Poisid: <strong>${boys}</strong> &nbsp;|&nbsp; 👧 Tüdrukud: <strong>${girls}</strong>`;
                if (parseInt(other, 10) > 0) {
                    genderLine += ` &nbsp;|&nbsp; ❓ Määramata: <strong>${other}</strong>`;
                }
                tooltip.innerHTML = `
                    <div style="font-weight: 800; font-size: 0.85rem; margin-bottom: 4px; color: #93c5fd;">📅 ${label}</div>
                    <div style="font-size: 0.82rem; margin-bottom: 3px;">👤 Tehtud kontosid: <strong style="color: #ffffff; font-size: 0.95rem;">${count}</strong></div>
                    <div style="font-size: 0.76rem; color: #cbd5e1;">${genderLine}</div>
                `;
            } else {
                tooltip.innerHTML = `
                    <div style="font-weight: 800; font-size: 0.85rem; margin-bottom: 4px; color: #f472b6;">📅 ${label}</div>
                    <div style="font-size: 0.82rem;">🎮 Tehtud mänge: <strong style="color: #ffffff; font-size: 0.95rem;">${count}</strong></div>
                `;
            }

            tooltip.style.left = `${e.clientX}px`;
            tooltip.style.top = `${e.clientY - 10}px`;
            tooltip.style.display = 'block';
            tooltip.style.opacity = '1';
        };

        const moveTip = (e: MouseEvent) => {
            tooltip.style.left = `${e.clientX}px`;
            tooltip.style.top = `${e.clientY - 10}px`;
        };

        const hideTip = () => {
            tooltip.style.display = 'none';
            tooltip.style.opacity = '0';
        };

        group.addEventListener('mouseenter', showTip as any);
        group.addEventListener('mousemove', moveTip as any);
        group.addEventListener('mouseleave', hideTip as any);
    });
}

export async function applyPAdminModeIfNeeded(profile?: { username?: string | null; email?: string | null } | null): Promise<void> {
    if (typeof document === 'undefined') return;

    const user = profile !== undefined ? profile : getCurrentUserProfile();
    const isPAdmin = isPAdminUser(user?.username) || isPAdminUser(user?.email);

    let styleEl = document.getElementById(PADMIN_STYLE_ID) as HTMLStyleElement | null;
    let containerEl = document.getElementById(PADMIN_CONTAINER_ID);

    if (isPAdmin) {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = PADMIN_STYLE_ID;
            styleEl.innerHTML = `
                html.padmin-mode, body.padmin-mode {
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                    background-image: none !important;
                    color: #000000 !important;
                    overflow: auto !important;
                }
                body.padmin-mode > *:not(#${PADMIN_CONTAINER_ID}):not(#${PADMIN_TOOLTIP_ID}) {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
            `;
            document.head.appendChild(styleEl);
        }
        document.documentElement.classList.add('padmin-mode');
        document.body.classList.add('padmin-mode');

        if (!containerEl) {
            containerEl = document.createElement('div');
            containerEl.id = PADMIN_CONTAINER_ID;
            containerEl.style.cssText = `
                position: fixed !important;
                inset: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: #ffffff !important;
                z-index: 2147483646 !important;
                overflow-y: auto !important;
                padding: 80px 16px 30px !important;
                box-sizing: border-box !important;
            `;
            document.body.appendChild(containerEl);
        } else {
            containerEl.style.display = 'flex';
        }

        const accounts = await fetchAccountsData();
        const games = await fetchGamesData();
        const accPoints = buildDailyPoints(accounts, activePeriod);
        const gamePoints = buildDailyPoints(games, activePeriod);
        renderPAdminDashboard(containerEl, accPoints, gamePoints, activePeriod);
    } else {
        document.documentElement.classList.remove('padmin-mode');
        document.body.classList.remove('padmin-mode');
        if (styleEl) styleEl.remove();
        if (containerEl) containerEl.remove();
        const tip = document.getElementById(PADMIN_TOOLTIP_ID);
        if (tip) tip.remove();
    }
}
