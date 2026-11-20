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

        // Create top floating logout button (centered, nothing else)
        if (!barEl) {
            barEl = document.createElement('div');
            barEl.id = PADMIN_BAR_ID;
            barEl.style.cssText = `
                position: fixed !important;
                top: 24px !important;
                left: 0 !important;
                right: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: transparent !important;
                z-index: 2147483647 !important;
                pointer-events: none !important;
                box-sizing: border-box !important;
            `;

            barEl.innerHTML = `
                <button id="btn-padmin-logout" style="
                    pointer-events: auto;
                    padding: 12px 32px;
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
