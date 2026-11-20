/**
 * PAdmin (Kassivend) Special View Mode
 * 
 * When user is logged in as 'PAdmin' (case-insensitive) or email 'padmin@playard.com',
 * the screen turns completely white (#ffffff) everywhere, hiding all UI/games/backgrounds,
 * with ONLY a sleek, high-visibility "Logout / Logi välja" button floating at the top.
 */

import { getCurrentUserProfile } from '../auth';

const PADMIN_STYLE_ID = 'padmin-whiteout-style';
const PADMIN_BAR_ID = 'padmin-top-bar';

export function isPAdminUser(usernameOrEmail?: string | null): boolean {
    if (!usernameOrEmail) return false;
    const clean = usernameOrEmail.trim().toLowerCase();
    return clean === 'padmin' || clean === 'padmin@playard.com';
}

export function applyPAdminModeIfNeeded(profile?: { username?: string | null; email?: string | null } | null): void {
    if (typeof document === 'undefined') return;

    const user = profile !== undefined ? profile : getCurrentUserProfile();
    const isPAdmin = isPAdminUser(user?.username) || isPAdminUser(user?.email);

    let styleEl = document.getElementById(PADMIN_STYLE_ID) as HTMLStyleElement | null;
    let barEl = document.getElementById(PADMIN_BAR_ID);

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
                    overflow: hidden !important;
                }
                body.padmin-mode > *:not(#${PADMIN_BAR_ID}) {
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

        // Create top floating logout bar
        if (!barEl) {
            barEl = document.createElement('div');
            barEl.id = PADMIN_BAR_ID;
            barEl.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                height: 70px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                padding: 12px 24px !important;
                background: #ffffff !important;
                border-bottom: 2px solid #e2e8f0 !important;
                z-index: 2147483647 !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                box-sizing: border-box !important;
            `;

            barEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.6rem;">🐱🐾</span>
                    <div>
                        <strong style="color: #0f172a; font-size: 1.1rem; font-weight: 900; letter-spacing: 0.5px;">PAdmin · Kassivend</strong>
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Playard Special Mode</div>
                    </div>
                </div>
                <button id="btn-padmin-logout" style="
                    padding: 10px 24px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: #ffffff;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 900;
                    font-size: 0.95rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
                    transition: transform 0.15s, box-shadow 0.15s;
                ">
                    <span>🚪</span>
                    <span>Log Out</span>
                </button>
            `;

            document.body.appendChild(barEl);

            const logoutBtn = barEl.querySelector('#btn-padmin-logout');
            logoutBtn?.addEventListener('click', () => {
                // Trigger standard logout button if present, or clear auth
                const originalLogout = document.getElementById('btn-logout');
                if (originalLogout) {
                    originalLogout.click();
                } else {
                    localStorage.removeItem('playard_current_user_profile');
                    window.location.reload();
                }
            });
        } else {
            barEl.style.display = 'flex';
        }
    } else {
        // Remove whiteout style and bar
        document.documentElement.classList.remove('padmin-mode');
        document.body.classList.remove('padmin-mode');
        if (styleEl) {
            styleEl.remove();
        }
        if (barEl) {
            barEl.remove();
        }
    }
}
