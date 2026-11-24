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
import { getPlayardUpdates, getPlayardProjects, PlayardUpdateItem, PlayardProject, polishAndCorrectText, addPlayardUpdate } from './playardUpdatesService';
import { getEmailStats, getSentEmailsLog } from './forgotPasswordService';

export function fetchEmailsData(): { createdAt: string }[] {
    return getSentEmailsLog().map(m => ({ createdAt: new Date(m.timestamp).toISOString() }));
}

const PADMIN_STYLE_ID = 'padmin-whiteout-style';
const PADMIN_CONTAINER_ID = 'padmin-special-container';
const PADMIN_TOOLTIP_ID = 'padmin-hover-tooltip';

export function isPAdminUser(usernameOrEmail?: string | null): boolean {
    if (!usernameOrEmail) return false;
    const clean = usernameOrEmail.trim().toLowerCase();
    return clean === 'padmin' || clean === 'padmin@playard.com';
}

export type FilterPeriod = 'today' | 'week' | 'month';
export type PAdminTab = 'analytics' | 'updates' | 'servers';
export type ServerTrafficStatus = 'offline' | 'waiting' | 'busy'; // offline: punane (ei tööta), waiting: punane+roheline (ootab ülesannet), busy: roheline (teeb midagi)

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
let activePAdminTab: PAdminTab = 'analytics'; // Default to Analüütika
let currentServerStatus: ServerTrafficStatus = 'waiting'; // Praegu server käivitatud, Playard peal, ootab ülesannet
let currentServerTaskDescription: string = 'Server on võrgus. Playard paigaldatud, ootab ülesannet.';

export function setServerTrafficStatus(status: ServerTrafficStatus, taskDescription?: string) {
    currentServerStatus = status;
    if (taskDescription !== undefined) {
        currentServerTaskDescription = taskDescription;
    }
}

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

function renderPAdminDashboard(
    container: HTMLElement,
    accountPoints: ChartDayPoint[],
    gamePoints: ChartDayPoint[],
    period: FilterPeriod,
    currentTab: PAdminTab = activePAdminTab
) {
    const totalAccounts = accountPoints.reduce((sum, p) => sum + p.count, 0);
    const totalGames = gamePoints.reduce((sum, p) => sum + p.count, 0);

    const periodSubtitles: { [k in FilterPeriod]: string } = {
        today: 'Tänane päev (1 punkt)',
        week: '7 viimast päeva (7 punkti)',
        month: '30 viimast päeva (30 punkti)'
    };

    // Owner panel updates data
    const allUpdates = getPlayardUpdates();
    const allProjects = getPlayardProjects();
    const publishedUpdates = allUpdates.filter(u => u.status === 'published');
    // PAdmin poolt saadetud uued ettepanekud ei ilmu PAdmini nimekirja, vaid AINULT Owneri paneeli!
    const futureUpdates = allUpdates.filter(u => u.status === 'draft' && (u.author || '').toLowerCase() !== 'padmin'); // Tulevased / Staging uuendused (ainult Ownerilt)
    // Email stats (EmailJS saadetud sõnumid ja allesjäänud limiit)
    const emailStats = getEmailStats();
    const emailPercent = Math.min(100, Math.round((emailStats.sentThisMonth / emailStats.limit) * 100));
    const emailRecords = fetchEmailsData();
    const emailPoints = buildDailyPoints(emailRecords, period);

    // Analytics Card HTML
    const analyticsContentHtml = `
        <div id="padmin-stats-card" style="
            width: 1220px;
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
            <!-- 3 Side-by-Side Charts (Kontod, Mängud ja E-mailid) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
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

                <!-- Chart 3: E-maili teavitused (EmailJS) -->
                <div id="padmin-emails-card" style="
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
                                <span>✉️</span>
                                <span>E-maili teavitused</span>
                            </div>
                            <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                                Liiguta hiir täpi kohale detailideks
                            </div>
                        </div>
                        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; font-weight: 900; font-size: 1.1rem; padding: 4px 14px; border-radius: 12px;">
                            ${emailStats.sentThisMonth} / ${emailStats.limit}
                        </div>
                    </div>

                    <div style="background: #ffffff; border-radius: 14px; padding: 10px; border: 1px solid #e2e8f0;">
                        ${renderSingleChartSvg(emailPoints, 'emails', '#10b981', '#34d399')}
                    </div>

                    <!-- EmailJS saadetud sõnumite ja allesjäänud limiidi tabel/plokk -->
                    <div id="padmin-email-stats-box" style="
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 14px;
                        padding: 10px 14px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                    ">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; text-align: center;">
                                <div style="font-size: 0.68rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Saadetud sõnumid</div>
                                <div id="padmin-emails-sent-val" style="font-size: 1.15rem; font-weight: 900; color: #2563eb; margin-top: 1px;">
                                    ${emailStats.sentThisMonth}
                                </div>
                            </div>
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 6px 8px; text-align: center;">
                                <div style="font-size: 0.68rem; color: #15803d; font-weight: 700; text-transform: uppercase;">Saab veel saata</div>
                                <div id="padmin-emails-remaining-val" style="font-size: 1.15rem; font-weight: 900; color: #16a34a; margin-top: 1px;">
                                    ${emailStats.remaining}
                                </div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div style="display: flex; flex-direction: column; gap: 3px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: #64748b; font-weight: 600;">
                                <span>Kasutatud: ${emailPercent}%</span>
                                <span>${emailStats.sentThisMonth} / ${emailStats.limit}</span>
                            </div>
                            <div style="height: 6px; background: #f1f5f9; border-radius: 4px; overflow: hidden; border: 1px solid #e2e8f0;">
                                <div style="height: 100%; width: ${Math.min(100, emailPercent)}%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 4px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Updates Card HTML
    const renderUpdateItemHtml = (u: PlayardUpdateItem, isDraft: boolean) => {
        const d = new Date(u.publishedAt || u.createdAt);
        const dateStr = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `
            <div class="padmin-update-row" style="
                background: #f8fafc;
                border: 1px solid ${isDraft ? '#fed7aa' : '#e2e8f0'};
                border-left: 4px solid ${isDraft ? '#f97316' : '#10b981'};
                border-radius: 14px;
                padding: 16px 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                transition: transform 0.15s, box-shadow 0.15s;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 900; font-size: 1.05rem; color: #0f172a;">${u.title}</span>
                        ${u.version ? `<span style="background: #e2e8f0; color: #475569; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;">${u.version}</span>` : ''}
                        <span style="background: ${isDraft ? '#ffedd5' : '#d1fae5'}; color: ${isDraft ? '#c2410c' : '#047857'}; font-size: 0.74rem; font-weight: 800; padding: 2px 10px; border-radius: 9999px;">
                            ${isDraft ? '⏳ Tulevane (Staging)' : '🚀 Avaldatud'}
                        </span>
                    </div>
                    <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">
                        📅 ${dateStr} · 👤 ${u.author || 'Playard Owner'}
                    </div>
                </div>
                <div style="font-size: 0.9rem; color: #334155; line-height: 1.5; white-space: pre-wrap;">
                    ${u.description || 'Kirjeldus puudub.'}
                </div>
                ${u.projectTitle ? `
                    <div style="font-size: 0.78rem; color: #64748b; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                        <span>📦 Projekt:</span>
                        <strong style="color: #0f172a;">${u.projectTitle}</strong>
                    </div>
                ` : ''}
            </div>
        `;
    };

    // Convert projects without direct updates into upcoming items (Tulevased uuendused)
    const projectItemsAsFutureUpdates: PlayardUpdateItem[] = allProjects.map(p => {
        return {
            id: 'proj_update_' + p.id,
            projectId: p.id,
            projectTitle: p.title,
            title: `🎄 ${p.title}`,
            description: p.description || `Kategooria: ${p.category || 'General'}. Staatus: ${p.isOpen ? 'Avatud' : 'Plaanis'}.`,
            version: p.scheduledPublishLabel ? `Ajastatud (${p.scheduledPublishLabel})` : 'Plaanis',
            status: 'draft',
            createdAt: p.createdAt,
            author: 'Playard Owner'
        };
    });

    // All future updates include both draft updates and created projects (e.g. Jõulu uuendus)
    const allFutureUpdates = [...futureUpdates, ...projectItemsAsFutureUpdates];

    const updatesContentHtml = `
        <div id="padmin-updates-card" style="
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
            gap: 24px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
        ">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 18px;">
                <div>
                    <h1 style="margin: 0; font-size: 1.4rem; font-weight: 900; letter-spacing: -0.4px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                        <span>🚀</span>
                        <span>Playard Uuendused (Updates)</span>
                    </h1>
                    <div style="font-size: 0.85rem; color: #64748b; margin-top: 3px;">
                        Kõik reaalajas Playard Owneri paneelis loodud ja avaldatud uuendused
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 0.82rem; font-weight: 800; padding: 6px 14px; border-radius: 9999px;">
                        ${publishedUpdates.length} avaldatud
                    </div>
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-size: 0.82rem; font-weight: 800; padding: 6px 14px; border-radius: 9999px;">
                        ${allFutureUpdates.length} tulevast
                    </div>
                </div>
            </div>

            <!-- Tulevased uuendused (Kõik loodud projektid ja tulevased uuendused) -->
            <div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span>🔮</span>
                    <span>Tulevased uuendused (${allFutureUpdates.length})</span>
                </div>
                ${allFutureUpdates.length === 0 ? `
                    <div style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 14px; padding: 24px; text-align: center; color: #64748b; font-size: 0.9rem;">
                        Praegu tulevasi uuendusi ei ole (kõik uuendused ja projektid ilmuvad otse Playard Owneri paneelist).
                    </div>
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${allFutureUpdates.map(u => renderUpdateItemHtml(u, true)).join('')}
                    </div>
                `}
            </div>

            <!-- Praegused (Avaldatud) uuendused -->
            <div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span>✨</span>
                    <span>Praegused uuendused (${publishedUpdates.length})</span>
                </div>
                ${publishedUpdates.length === 0 ? `
                    <div style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 14px; padding: 24px; text-align: center; color: #64748b; font-size: 0.9rem;">
                        Ühtegi avaldatud uuendust pole veel lisatud.
                    </div>
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${publishedUpdates.map(u => renderUpdateItemHtml(u, false)).join('')}
                    </div>
                `}
            </div>

            <!-- Lisa Uuendus (PAdmin -> Owner Panel Proposal Form) -->
            <div id="padmin-add-update-card" style="
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 18px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                gap: 16px;
                position: relative;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                            <span>✍️</span>
                            <span>Lisa Uuendus</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
                            Kirjuta uuenduse nimi ja kirjeldus. Saatmisel tehakse tekst automaatselt veatuks ja saadetakse Owneri paneeli!
                        </div>
                    </div>
                    <span style="background: #e0e7ff; color: #4338ca; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 9999px;">
                        Automaatne õigekirja viimistlus ✨
                    </span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <label style="font-size: 0.8rem; font-weight: 800; color: #334155; display: block; margin-bottom: 6px;">Uuenduse nimi / pealkiri:</label>
                        <input type="text" id="padmin-update-title-input" placeholder="nt Jõulu uuendus, uued autod ja sujuv mängimine..." style="
                            width: 100%;
                            box-sizing: border-box;
                            padding: 12px 16px;
                            border-radius: 12px;
                            border: 1.5px solid #cbd5e1;
                            background: #ffffff;
                            color: #0f172a;
                            font-size: 0.95rem;
                            font-weight: 600;
                            outline: none;
                            transition: border-color 0.15s;
                        ">
                    </div>

                    <div>
                        <label style="font-size: 0.8rem; font-weight: 800; color: #334155; display: block; margin-bottom: 6px;">Uuenduse kirjeldus:</label>
                        <textarea id="padmin-update-desc-input" placeholder="Kirjuta siia, mis uues versioonis lisandub või muutub..." rows="4" style="
                            width: 100%;
                            box-sizing: border-box;
                            padding: 12px 16px;
                            border-radius: 12px;
                            border: 1.5px solid #cbd5e1;
                            background: #ffffff;
                            color: #0f172a;
                            font-size: 0.9rem;
                            line-height: 1.5;
                            resize: vertical;
                            outline: none;
                            font-family: inherit;
                        "></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 4px;">
                        <span id="padmin-update-form-status" style="font-size: 0.85rem; font-weight: 700; color: #10b981; display: none;"></span>
                        <button type="button" id="btn-padmin-send-update" style="
                            padding: 12px 32px;
                            background: linear-gradient(135deg, #2563eb, #1d4ed8);
                            color: #ffffff;
                            border: none;
                            border-radius: 12px;
                            font-size: 0.95rem;
                            font-weight: 800;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
                            transition: transform 0.15s, box-shadow 0.15s;
                        ">
                            <span>🚀</span>
                            <span>Saada</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Servers Card HTML
    const serversContentHtml = `
        <div id="padmin-servers-card" style="
            width: 1220px;
            max-width: calc(100vw - 32px);
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 24px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
            padding: 36px 28px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 24px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            min-height: 520px;
        ">
            <div style="text-align: center;">
                <h1 style="margin: 0; font-size: 1.5rem; font-weight: 900; letter-spacing: -0.4px; color: #0f172a;">
                    Playardi Serverid
                </h1>
                <div style="font-size: 0.88rem; color: #64748b; margin-top: 4px;">
                    Kodu- ja tootmisserverite infrastruktuur
                </div>
            </div>

            <!-- Serveri liiklusvalgusfoor (punane: ei tööta, punane+roheline: ootab ülesannet, roheline: teeb midagi) -->
            <div id="padmin-server-image-container" style="
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 20px;
            ">
                <!-- Serveri kast -->
                <div id="padmin-server-image" style="
                    width: 520px;
                    max-width: calc(100vw - 120px);
                    height: 340px;
                    background: #94a3b8;
                    border: 2px solid #64748b;
                    border-radius: 16px;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
                "></div>

                <!-- Tuled kõrval (Valgusfoor: punane ja roheline) -->
                <div id="padmin-server-leds" style="
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 14px 12px;
                    background: #0f172a;
                    border: 2px solid #334155;
                    border-radius: 16px;
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
                ">
                    <!-- Punane tuli -->
                    <div id="padmin-led-red" title="${currentServerStatus === 'offline' ? 'Punane: Ei tööta' : (currentServerStatus === 'waiting' ? 'Punane + Roheline: Ootab ülesannet' : 'Punane: Väljas')}" style="
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: ${currentServerStatus === 'offline' || currentServerStatus === 'waiting' ? '#ef4444' : '#450a0a'};
                        box-shadow: ${currentServerStatus === 'offline' || currentServerStatus === 'waiting' ? '0 0 16px #ef4444, 0 0 6px #dc2626' : 'none'};
                        border: 2px solid ${currentServerStatus === 'offline' || currentServerStatus === 'waiting' ? '#b91c1c' : '#1f2937'};
                        opacity: ${currentServerStatus === 'offline' || currentServerStatus === 'waiting' ? '1' : '0.25'};
                        transition: all 0.3s ease;
                    "></div>

                    <!-- Roheline tuli -->
                    <div id="padmin-led-green" title="${currentServerStatus === 'busy' ? 'Roheline: Teeb midagi' : (currentServerStatus === 'waiting' ? 'Punane + Roheline: Ootab ülesannet' : 'Roheline: Väljas')}" style="
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: ${currentServerStatus === 'busy' || currentServerStatus === 'waiting' ? '#22c55e' : '#052e16'};
                        box-shadow: ${currentServerStatus === 'busy' || currentServerStatus === 'waiting' ? '0 0 16px #22c55e, 0 0 6px #16a34a' : 'none'};
                        border: 2px solid ${currentServerStatus === 'busy' || currentServerStatus === 'waiting' ? '#15803d' : '#1f2937'};
                        opacity: ${currentServerStatus === 'busy' || currentServerStatus === 'waiting' ? '1' : '0.25'};
                        transition: all 0.3s ease;
                    "></div>
                </div>
            </div>

            <!-- All tekst, mida server teeb -->
            <div id="padmin-server-status-info" style="
                margin-top: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                text-align: center;
            ">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px; ${
                        currentServerStatus === 'offline'
                            ? 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;'
                            : currentServerStatus === 'waiting'
                            ? 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
                            : 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;'
                    }">
                        ${
                            currentServerStatus === 'offline'
                                ? '🔴 Ei tööta'
                                : currentServerStatus === 'waiting'
                                ? '🟡 Ootab ülesannet (Punane + Roheline)'
                                : '🟢 Teeb midagi (Roheline)'
                        }
                    </span>
                </div>
                <div id="padmin-server-task-desc" style="
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #334155;
                    max-width: 600px;
                    line-height: 1.5;
                ">
                    ${currentServerTaskDescription}
                </div>
            </div>
        </div>
    `;

    const html = `
        <!-- Top Header Bar with Logout and Categories (Analüütika, Updates, Serverid) to the right -->
        <div style="
            position: fixed;
            top: 20px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
            z-index: 2147483647;
            pointer-events: none;
            padding: 0 16px;
            box-sizing: border-box;
        ">
            <!-- Log Out Button -->
            <button id="btn-padmin-logout" style="
                pointer-events: auto;
                padding: 10px 28px;
                background: #111827;
                color: #ffffff;
                border: 2px solid #000000;
                border-radius: 9999px;
                cursor: pointer;
                font-weight: 800;
                font-size: 0.95rem;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                transition: transform 0.15s, background-color 0.15s;
                font-family: inherit;
            ">
                Log Out
            </button>

            <!-- Categories Tabs: 1) Analüütika, 2) Updates, 3) Serverid -->
            <div id="padmin-category-tabs" style="
                pointer-events: auto;
                display: inline-flex;
                background: #f1f5f9;
                padding: 4px;
                border-radius: 9999px;
                border: 1px solid #cbd5e1;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                gap: 4px;
            ">
                <button class="padmin-tab-btn" data-tab="analytics" style="
                    padding: 8px 22px;
                    border: none;
                    border-radius: 9999px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 800;
                    transition: all 0.15s;
                    background: ${currentTab === 'analytics' ? '#111827' : 'transparent'};
                    color: ${currentTab === 'analytics' ? '#ffffff' : '#64748b'};
                    box-shadow: ${currentTab === 'analytics' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
                ">📊 Analüütika</button>
                <button class="padmin-tab-btn" data-tab="updates" style="
                    padding: 8px 22px;
                    border: none;
                    border-radius: 9999px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 800;
                    transition: all 0.15s;
                    background: ${currentTab === 'updates' ? '#111827' : 'transparent'};
                    color: ${currentTab === 'updates' ? '#ffffff' : '#64748b'};
                    box-shadow: ${currentTab === 'updates' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
                ">🚀 Updates</button>
                <button class="padmin-tab-btn" data-tab="servers" style="
                    padding: 8px 22px;
                    border: none;
                    border-radius: 9999px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 800;
                    transition: all 0.15s;
                    background: ${currentTab === 'servers' ? '#111827' : 'transparent'};
                    color: ${currentTab === 'servers' ? '#ffffff' : '#64748b'};
                    box-shadow: ${currentTab === 'servers' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
                ">🖥️ Serverid</button>
            </div>
        </div>

        <!-- Center View Content (Analytics vs Updates vs Servers) -->
        <div id="padmin-view-wrapper" style="width: 100%; display: flex; justify-content: center;">
            ${currentTab === 'analytics' ? analyticsContentHtml : (currentTab === 'updates' ? updatesContentHtml : serversContentHtml)}
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

    // Attach category tabs (Analüütika vs Updates)
    const tabBtns = container.querySelectorAll('.padmin-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab') as PAdminTab;
            if (targetTab) {
                activePAdminTab = targetTab;
                renderPAdminDashboard(container, accountPoints, gamePoints, period, activePAdminTab);
            }
        });
    });

    // If on analytics tab, attach filter buttons and chart tooltip logic
    if (currentTab === 'analytics') {
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
                    renderPAdminDashboard(container, accPts, gamePts, activePeriod, activePAdminTab);
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
                } else if (chart === 'emails') {
                    tooltip.innerHTML = `
                        <div style="font-weight: 800; font-size: 0.85rem; margin-bottom: 4px; color: #6ee7b7;">📅 ${label}</div>
                        <div style="font-size: 0.82rem; margin-bottom: 3px;">✉️ Saadetud e-kirju: <strong style="color: #ffffff; font-size: 0.95rem;">${count}</strong></div>
                        <div style="font-size: 0.76rem; color: #cbd5e1;">EmailJS limiit: 200 tk / kuus</div>
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

    // If on updates tab, attach Lisa Uuendus submission with timeline and auto-correction
    if (currentTab === 'updates') {
        const sendBtn = container.querySelector('#btn-padmin-send-update') as HTMLButtonElement | null;
        const titleInput = container.querySelector('#padmin-update-title-input') as HTMLInputElement | null;
        const descInput = container.querySelector('#padmin-update-desc-input') as HTMLTextAreaElement | null;
        const statusEl = container.querySelector('#padmin-update-form-status') as HTMLElement | null;

        sendBtn?.addEventListener('click', () => {
            const rawTitle = titleInput?.value.trim() || '';
            const rawDesc = descInput?.value.trim() || '';

            if (!rawTitle) {
                alert('Palun sisesta uuenduse pealkiri!');
                titleInput?.focus();
                return;
            }

            // Create or show centered progress timeline overlay
            let overlay = document.getElementById('padmin-timeline-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'padmin-timeline-overlay';
                document.body.appendChild(overlay);
            }

            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(8px);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;

            overlay.innerHTML = `
                <div style="
                    background: #ffffff;
                    border-radius: 20px;
                    padding: 32px 36px;
                    width: 440px;
                    max-width: 90vw;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    box-sizing: border-box;
                ">
                    <div style="font-size: 2.2rem; line-height: 1;">⏳</div>
                    <div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: #0f172a;" id="padmin-timeline-status-text">
                            Teeme teksti veatuks &amp; saadame...
                        </div>
                        <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;" id="padmin-timeline-subtext">
                            Kontrollin grammatikat ja sünkroniseerin Owneri paneeliga
                        </div>
                    </div>

                    <!-- Animated Timeline / Progress Bar -->
                    <div style="
                        width: 100%;
                        background: #f1f5f9;
                        border: 1px solid #e2e8f0;
                        border-radius: 9999px;
                        height: 14px;
                        overflow: hidden;
                        position: relative;
                    ">
                        <div id="padmin-timeline-bar" style="
                            width: 0%;
                            height: 100%;
                            background: linear-gradient(90deg, #2563eb, #38bdf8, #10b981);
                            border-radius: 9999px;
                            transition: width 0.05s linear;
                        "></div>
                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #64748b;">
                        <span id="padmin-timeline-percent">0%</span>
                        <span id="padmin-timeline-countdown">Aega jäänud: 2.5s</span>
                    </div>
                </div>
            `;

            const totalDurationMs = 2500;
            const startTime = Date.now();
            const bar = overlay.querySelector('#padmin-timeline-bar') as HTMLElement;
            const percentEl = overlay.querySelector('#padmin-timeline-percent') as HTMLElement;
            const countdownEl = overlay.querySelector('#padmin-timeline-countdown') as HTMLElement;
            const statusTextEl = overlay.querySelector('#padmin-timeline-status-text') as HTMLElement;

            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / totalDurationMs);
                const percent = Math.round(progress * 100);
                const remainSec = Math.max(0, ((totalDurationMs - elapsed) / 1000)).toFixed(1);

                if (bar) bar.style.width = `${percent}%`;
                if (percentEl) percentEl.textContent = `${percent}%`;
                if (countdownEl) countdownEl.textContent = `Aega jäänud: ${remainSec}s`;

                if (progress >= 0.5 && statusTextEl) {
                    statusTextEl.textContent = '✨ Viimistlen teksti ja salvestan Owneri paneeli...';
                }

                if (progress >= 1) {
                    clearInterval(interval);

                    // Perform text polishing and automatic error correction
                    const polishedTitle = polishAndCorrectText(rawTitle);
                    const polishedDesc = polishAndCorrectText(rawDesc);

                    // Save as draft update authored by PAdmin
                    addPlayardUpdate({
                        projectId: 'global',
                        projectTitle: 'PAdmin Proposal',
                        title: polishedTitle,
                        description: polishedDesc,
                        version: 'v1.0',
                        publishNow: false,
                        author: 'PAdmin'
                    });

                    if (statusTextEl) {
                        statusTextEl.textContent = '✅ Edukalt saadetud Owneri paneeli!';
                        statusTextEl.style.color = '#10b981';
                    }

                    setTimeout(() => {
                        if (overlay) overlay.remove();
                        // Re-render dashboard updates tab
                        renderPAdminDashboard(container, accountPoints, gamePoints, period, 'updates');
                    }, 500);
                }
            }, 50);
        });
    }
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
                flex-direction: column !important;
                align-items: center !important;
                justify-content: flex-start !important;
                background: #ffffff !important;
                z-index: 2147483646 !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                padding: 95px 16px 40px !important;
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
        renderPAdminDashboard(containerEl, accPoints, gamePoints, activePeriod, activePAdminTab);
    } else {
        activePAdminTab = 'analytics';
        activePeriod = 'week';
        document.documentElement.classList.remove('padmin-mode');
        document.body.classList.remove('padmin-mode');
        if (styleEl) styleEl.remove();
        if (containerEl) containerEl.remove();
        const tip = document.getElementById(PADMIN_TOOLTIP_ID);
        if (tip) tip.remove();
    }
}

if (typeof window !== 'undefined') {
    (window as any).applyPAdminModeIfNeeded = applyPAdminModeIfNeeded;
}
