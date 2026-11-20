/**
 * PAdmin (Kassivend) Special View Mode
 * 
 * When user is logged in as 'PAdmin' (case-insensitive) or email 'padmin@playard.com',
 * the screen turns completely white (#ffffff) everywhere, hiding all normal UI/games/backgrounds.
 * Centered at the top: Logout button.
 * Centered in the middle: 10-day chart / table showing accounts created, with line graph + numbers,
 * and filter options: "Täna", "Eelmine nädal", "1 kuu".
 */

import { getCurrentUserProfile } from '../auth';
import { supabase } from '../lib/supabase';

const PADMIN_STYLE_ID = 'padmin-whiteout-style';
const PADMIN_CONTAINER_ID = 'padmin-special-container';

export function isPAdminUser(usernameOrEmail?: string | null): boolean {
    if (!usernameOrEmail) return false;
    const clean = usernameOrEmail.trim().toLowerCase();
    return clean === 'padmin' || clean === 'padmin@playard.com';
}

type FilterPeriod = 'today' | 'last_week' | 'month';

interface DailyStat {
    dateStr: string;   // e.g. "20. Nov"
    isoDate: string;   // e.g. "2026-11-20"
    count: number;
}

let cachedProfilesDates: string[] | null = null;
let currentPeriod: FilterPeriod = 'today';

async function fetchAccountCreationDates(): Promise<string[]> {
    if (cachedProfilesDates) return cachedProfilesDates;

    const dates: string[] = [];

    // 1. Try Supabase
    if (supabase) {
        try {
            const { data, error } = await supabase.from('profiles').select('created_at');
            if (!error && Array.isArray(data)) {
                data.forEach((row: any) => {
                    if (row?.created_at) dates.push(row.created_at);
                });
            }
        } catch (e) {
            console.warn('PAdmin fetchAccountCreationDates supabase error:', e);
        }
    }

    // 2. Also check local user profile if present
    try {
        const rawLocal = localStorage.getItem('playard_current_user_profile');
        if (rawLocal) {
            const prof = JSON.parse(rawLocal);
            if (prof?.created_at) dates.push(prof.created_at);
        }
    } catch {}

    cachedProfilesDates = dates;
    return dates;
}

function calculateDailyStats(dates: string[], period: FilterPeriod, numDays = 10): DailyStat[] {
    const stats: DailyStat[] = [];
    const now = new Date();

    // Determine end date offset based on period
    // 'today': ending today (last 10 days up to today)
    // 'last_week': 10 days ending 7 days ago
    // 'month': 10 samples across the past 30 days (or past 10 days of the month)
    let endAnchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'last_week') {
        endAnchor.setDate(endAnchor.getDate() - 7);
    }

    // Prepare date buckets
    const countMap: { [key: string]: number } = {};
    dates.forEach(d => {
        try {
            const iso = new Date(d).toISOString().slice(0, 10);
            countMap[iso] = (countMap[iso] || 0) + 1;
        } catch {}
    });

    const monthNames = ['Jaan', 'Veebr', 'Märts', 'Apr', 'Mai', 'Juuni', 'Juuli', 'Aug', 'Sept', 'Okt', 'Nov', 'Dets'];

    for (let i = numDays - 1; i >= 0; i--) {
        const cur = new Date(endAnchor);
        if (period === 'month') {
            // Step back every 3 days across the month
            cur.setDate(cur.getDate() - (i * 3));
        } else {
            cur.setDate(cur.getDate() - i);
        }

        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const day = String(cur.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${day}`;
        const label = `${cur.getDate()}. ${monthNames[cur.getMonth()]}`;

        let cnt = 0;
        if (period === 'month') {
            // count for the 3-day bucket
            for (let b = 0; b < 3; b++) {
                const sub = new Date(cur);
                sub.setDate(sub.getDate() + b);
                const subIso = sub.toISOString().slice(0, 10);
                cnt += countMap[subIso] || 0;
            }
        } else {
            cnt = countMap[iso] || 0;
        }

        stats.push({
            dateStr: label,
            isoDate: iso,
            count: cnt
        });
    }

    return stats;
}

function renderPAdminStatsCard(container: HTMLElement, stats: DailyStat[], period: FilterPeriod) {
    const totalAccounts = stats.reduce((acc, cur) => acc + cur.count, 0);
    const maxCount = Math.max(1, ...stats.map(s => s.count));

    // SVG Line chart calculations
    const svgWidth = 520;
    const svgHeight = 140;
    const paddingX = 30;
    const paddingY = 25;
    const plotWidth = svgWidth - paddingX * 2;
    const plotHeight = svgHeight - paddingY * 2;

    const points = stats.map((stat, idx) => {
        const x = paddingX + (idx / (stats.length - 1)) * plotWidth;
        const y = svgHeight - paddingY - (stat.count / maxCount) * plotHeight;
        return { x, y, count: stat.count, label: stat.dateStr };
    });

    const polylineStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaStr = `${points[0].x},${svgHeight - paddingY} ${polylineStr} ${points[points.length - 1].x},${svgHeight - paddingY}`;

    const cardHtml = `
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

        <!-- Center 10-Day Account Stats Card -->
        <div id="padmin-stats-card" style="
            width: 620px;
            max-width: calc(100vw - 32px);
            background: #ffffff;
            border: 2px solid #e2e8f0;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
            padding: 24px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
        ">
            <!-- Header & Filter Selector -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h2 style="margin: 0; font-size: 1.25rem; font-weight: 900; letter-spacing: -0.3px; color: #0f172a;">
                        Uute kontode statistika
                    </h2>
                    <div style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">
                        10 päeva vaade · Kokku perioodil: <strong style="color: #2563eb;">${totalAccounts}</strong> kontot
                    </div>
                </div>

                <!-- Filter Pills: Täna, Eelmine nädal, 1 kuu -->
                <div id="padmin-filter-group" style="display: inline-flex; background: #f1f5f9; padding: 4px; border-radius: 12px; gap: 4px;">
                    <button class="padmin-filter-btn" data-period="today" style="
                        padding: 6px 14px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.82rem;
                        font-weight: 700;
                        transition: all 0.15s;
                        background: ${period === 'today' ? '#ffffff' : 'transparent'};
                        color: ${period === 'today' ? '#0f172a' : '#64748b'};
                        box-shadow: ${period === 'today' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'};
                    ">Täna</button>
                    <button class="padmin-filter-btn" data-period="last_week" style="
                        padding: 6px 14px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.82rem;
                        font-weight: 700;
                        transition: all 0.15s;
                        background: ${period === 'last_week' ? '#ffffff' : 'transparent'};
                        color: ${period === 'last_week' ? '#0f172a' : '#64748b'};
                        box-shadow: ${period === 'last_week' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'};
                    ">Eelmine nädal</button>
                    <button class="padmin-filter-btn" data-period="month" style="
                        padding: 6px 14px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.82rem;
                        font-weight: 700;
                        transition: all 0.15s;
                        background: ${period === 'month' ? '#ffffff' : 'transparent'};
                        color: ${period === 'month' ? '#0f172a' : '#64748b'};
                        box-shadow: ${period === 'month' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'};
                    ">1 kuu</button>
                </div>
            </div>

            <!-- SVG Line Graph (Joon) -->
            <div style="background: #f8fafc; border-radius: 14px; padding: 12px; border: 1px solid #e2e8f0;">
                <svg id="padmin-stats-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: auto; overflow: visible; display: block;">
                    <defs>
                        <linearGradient id="padminLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
                            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
                        </linearGradient>
                    </defs>

                    <!-- Horizontal Grid lines -->
                    <line x1="${paddingX}" y1="${paddingY}" x2="${svgWidth - paddingX}" y2="${paddingY}" stroke="#e2e8f0" stroke-dasharray="4" />
                    <line x1="${paddingX}" y1="${svgHeight - paddingY}" x2="${svgWidth - paddingX}" y2="${svgHeight - paddingY}" stroke="#cbd5e1" stroke-width="1.5" />

                    <!-- Area under curve -->
                    <polygon points="${areaStr}" fill="url(#padminLineGrad)" />

                    <!-- Line (Joon) -->
                    <polyline points="${polylineStr}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

                    <!-- Data dots and value numbers -->
                    ${points.map(p => `
                        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#ffffff" stroke="#2563eb" stroke-width="2.5" />
                        <text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" font-size="11" font-weight="800" fill="#1e293b" text-anchor="middle">
                            ${p.count}
                        </text>
                    `).join('')}
                </svg>
            </div>

            <!-- 10 Päeva Tabel (Kuupäev, Number & Graafikuriba) -->
            <div style="max-height: 220px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
                <table id="padmin-stats-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #475569; position: sticky; top: 0; z-index: 2;">
                            <th style="padding: 10px 14px; font-weight: 700;">Kuupäev</th>
                            <th style="padding: 10px 14px; font-weight: 700; width: 80px; text-align: right;">Number</th>
                            <th style="padding: 10px 14px; font-weight: 700; width: 140px;">Jaotus</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map((s, idx) => {
                            const barPct = Math.round((s.count / maxCount) * 100);
                            return `
                                <tr style="border-top: 1px solid #f1f5f9; background: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
                                    <td style="padding: 8px 14px; font-weight: 600; color: #1e293b;">
                                        ${s.dateStr}
                                    </td>
                                    <td style="padding: 8px 14px; font-weight: 800; color: #2563eb; text-align: right;">
                                        ${s.count}
                                    </td>
                                    <td style="padding: 8px 14px;">
                                        <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                                            <div style="width: ${barPct}%; height: 100%; background: #2563eb; border-radius: 999px;"></div>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = cardHtml;

    // Attach logout event
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
            if (p && p !== currentPeriod) {
                currentPeriod = p;
                const dates = await fetchAccountCreationDates();
                const newStats = calculateDailyStats(dates, currentPeriod);
                renderPAdminStatsCard(container, newStats, currentPeriod);
            }
        });
    });
}

export async function applyPAdminModeIfNeeded(profile?: { username?: string | null; email?: string | null } | null): Promise<void> {
    if (typeof document === 'undefined') return;

    const user = profile !== undefined ? profile : getCurrentUserProfile();
    const isPAdmin = isPAdminUser(user?.username) || isPAdminUser(user?.email);

    let styleEl = document.getElementById(PADMIN_STYLE_ID) as HTMLStyleElement | null;
    let containerEl = document.getElementById(PADMIN_CONTAINER_ID);

    if (isPAdmin) {
        // Inject whiteout style
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
                body.padmin-mode > *:not(#${PADMIN_CONTAINER_ID}) {
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

        // Create main container
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

        // Fetch data and render
        const dates = await fetchAccountCreationDates();
        const stats = calculateDailyStats(dates, currentPeriod);
        renderPAdminStatsCard(containerEl, stats, currentPeriod);
    } else {
        // Remove whiteout style and container
        document.documentElement.classList.remove('padmin-mode');
        document.body.classList.remove('padmin-mode');
        if (styleEl) {
            styleEl.remove();
        }
        if (containerEl) {
            containerEl.remove();
        }
    }
}
