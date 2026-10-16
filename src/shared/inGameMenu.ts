/**
 * Playard In-Game Menu (P Nupp & Server Info & Leave)
 *
 * Provides a unified top-right "P" button across all Playard games.
 * When clicked (or pressing 'P' / 'Escape'):
 * - Opens a sleek Playard server menu showing:
 *   - Current game name
 *   - Player count in this server (e.g. "1 / 20 Mängijat", "4 võistlejat", "5 mängijat", etc.)
 *   - List of players in the server
 *   - "Leave" button at the bottom to return to Playard Hub
 *   - "Resume" button to continue playing
 */

import { addPlayerReport } from './playerReports';
import { serverManager } from './serverManager';

export interface PlayardMenuOptions {
    gameTitle?: string;
    getPlayerCount?: () => { countStr: string; players: string[] };
    hubUrl?: string;
}

function getDetectedServerPlayerInfo(): { countStr: string; players: string[] } {
    let currentUserName = 'Mängija';
    let isOwner = false;
    let isVerified = false;

    try {
        const raw = localStorage.getItem('playard_current_user_profile');
        if (raw) {
            const p = JSON.parse(raw);
            if (p.displayName || p.username) {
                currentUserName = p.displayName || p.username;
            }
            const email = (p.email || '').toLowerCase().trim();
            const uname = (p.username || '').toLowerCase().trim();
            if (email === '1karl.ilves@gmail.com' || uname === 'playard owner' || p.isOwner) {
                isOwner = true;
                isVerified = true;
            } else if (p.isVerified) {
                isVerified = true;
            }
        }
    } catch (e) {}

    const ownerTag = isOwner ? ' 👑 Playard Owner ✔' : (isVerified ? ' ✔' : '');
    const cleanBaseName = currentUserName.replace(/👑.*$/, '').replace(/✔.*$/, '').replace(/\(Sina\)/i, '').trim();
    const myNameDisplay = `${cleanBaseName}${ownerTag} (Sina)`;

    const path = (typeof window !== 'undefined' ? window.location.pathname : '').toLowerCase();
    return serverManager.getInGameServerDisplay(path, myNameDisplay);
}

function getDetectedGameTitle(): string {
    if (typeof document === 'undefined') return 'Playard Game';
    
    // Check specific title elements
    const h1or2 = document.querySelector('header h1, header h2, .logo-badge span, .title-badge span, .game-title-badge strong');
    if (h1or2 && h1or2.textContent) {
        const clean = h1or2.textContent.replace(/^[^\w\s]+/g, '').trim();
        if (clean && clean.length > 2) return clean;
    }

    const docTitle = document.title || '';
    if (docTitle.includes('-')) {
        const parts = docTitle.split('-');
        return parts[parts.length - 1].split('|')[0].trim();
    }
    return docTitle.split('|')[0].trim() || 'Playard Game';
}

export function initPlayardMenu(options?: PlayardMenuOptions) {
    if (typeof document === 'undefined') return;

    // Avoid multiple inits
    if (document.getElementById('btn-playard-menu')) return;

    const hubUrl = options?.hubUrl || (window.location.pathname.includes('/games/') ? '../../index.html' : '/');
    const gameTitle = options?.gameTitle || getDetectedGameTitle();

    // 1. Inject CSS
    const style = document.createElement('style');
    style.id = 'playard-in-game-menu-styles';
    style.textContent = `
        /* Playard Top-Right P Button */
        #btn-playard-menu {
            position: fixed;
            top: 12px;
            right: 12px;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.9);
            border: 1.5px solid rgba(0, 242, 254, 0.5);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(0, 242, 254, 0.15);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 99999;
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            user-select: none;
            outline: none;
            padding: 0;
        }
        #btn-playard-menu:hover {
            transform: scale(1.08);
            border-color: #00f2fe;
            box-shadow: 0 0 20px rgba(0, 242, 254, 0.6), inset 0 0 14px rgba(0, 242, 254, 0.3);
        }
        #btn-playard-menu:active {
            transform: scale(0.96);
        }
        #btn-playard-menu .playard-p-letter {
            font-family: 'Poppins', system-ui, -apple-system, sans-serif;
            font-weight: 900;
            font-size: 1.35rem;
            line-height: 1;
            background: linear-gradient(135deg, #00f2fe, #4facfe);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 0 6px rgba(0, 242, 254, 0.8));
            pointer-events: none;
        }

        /* Playard In-Game Menu Modal Overlay */
        #modal-playard-menu {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(4, 8, 16, 0.82);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 100000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            box-sizing: border-box;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        #modal-playard-menu.active {
            display: flex;
            opacity: 1;
        }
        #modal-playard-menu .playard-menu-card {
            background: linear-gradient(180deg, #131c28 0%, #0c121a 100%);
            border: 1.5px solid rgba(0, 242, 254, 0.35);
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            padding: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 242, 254, 0.15);
            color: #ffffff;
            font-family: 'Poppins', system-ui, -apple-system, sans-serif;
            text-align: center;
            position: relative;
            transform: scale(0.95);
            transition: transform 0.2s ease;
            box-sizing: border-box;
        }
        #modal-playard-menu.active .playard-menu-card {
            transform: scale(1);
        }

        /* Player Report Button */
        .btn-player-report {
            background: rgba(255, 71, 87, 0.15);
            border: 1px solid rgba(255, 71, 87, 0.35);
            color: #ff6b81;
            border-radius: 6px;
            padding: 2px 7px;
            font-size: 0.72rem;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 3px;
            transition: all 0.2s ease;
            outline: none;
            user-select: none;
        }
        .btn-player-report:hover {
            background: rgba(255, 71, 87, 0.32);
            border-color: #ff4757;
            color: #ffffff;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(255, 71, 87, 0.4);
        }

        /* Report Modal Overlay */
        #modal-playard-report {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(4, 8, 16, 0.86);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            z-index: 100002;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            box-sizing: border-box;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        #modal-playard-report.active {
            display: flex;
            opacity: 1;
        }
        #modal-playard-report .playard-report-card {
            background: linear-gradient(180deg, #161e2b 0%, #0c121a 100%);
            border: 1.5px solid rgba(255, 71, 87, 0.5);
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            padding: 22px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(255, 71, 87, 0.22);
            color: #ffffff;
            font-family: 'Poppins', system-ui, -apple-system, sans-serif;
            text-align: left;
            position: relative;
            transform: scale(0.95);
            transition: transform 0.2s ease;
            box-sizing: border-box;
        }
        #modal-playard-report.active .playard-report-card {
            transform: scale(1);
        }
    `;
    document.head.appendChild(style);

    // 2. Inject P Button
    const pBtn = document.createElement('button');
    pBtn.id = 'btn-playard-menu';
    pBtn.type = 'button';
    pBtn.title = 'Playard Menüü [P]';
    pBtn.innerHTML = `<span class="playard-p-letter">P</span>`;
    document.body.appendChild(pBtn);

    // 3. Inject Modal
    const modal = document.createElement('div');
    modal.id = 'modal-playard-menu';
    modal.innerHTML = `
        <div class="playard-menu-card">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px; text-align: left;">
                    <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(0,242,254,0.15); border: 1.5px solid #00f2fe; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #00f2fe; font-size: 1.2rem; box-shadow: 0 0 12px rgba(0,242,254,0.3);">
                        P
                    </div>
                    <div>
                        <h3 id="playard-menu-game-title" style="margin: 0; font-size: 1.05rem; color: #ffffff; font-weight: 800; letter-spacing: 0.3px;">${gameTitle}</h3>
                        <span style="font-size: 0.75rem; color: #718093; font-weight: 600;">Playard Games Server</span>
                    </div>
                </div>
                <button type="button" id="btn-close-playard-menu" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; width: 32px; height: 32px; border-radius: 50%; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Sulge menüü">✕</button>
            </div>

            <!-- Server Status & Player Count Box -->
            <div style="background: rgba(19, 25, 34, 0.95); border: 1.5px solid rgba(0, 242, 254, 0.3); border-radius: 14px; padding: 16px; margin-bottom: 20px; text-align: left;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #2ecc71; box-shadow: 0 0 10px #2ecc71;"></span>
                        <strong style="color: #ffffff; font-size: 0.92rem;">Sinu server</strong>
                    </div>
                    <span style="background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.35); padding: 2px 8px; border-radius: 8px; font-size: 0.72rem; font-weight: 800;">ONLINE</span>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                    <span style="font-size: 1.5rem; user-select: none;">👥</span>
                    <div>
                        <div style="font-size: 0.78rem; color: #a4b0be; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Mängijad sinu serveris:</div>
                        <div id="playard-menu-player-count" style="font-size: 1.15rem; font-weight: 800; color: #00f2fe;">Laen...</div>
                    </div>
                </div>

                <!-- Server Players List -->
                <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 700; margin-bottom: 6px;">Serveri nimekiri:</div>
                <div id="playard-menu-player-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto; padding-right: 4px;">
                    <!-- Dynamically populated -->
                </div>
            </div>

            <!-- Bottom Actions: Resume & Leave Button -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button type="button" id="btn-playard-resume" style="width: 100%; padding: 12px; border-radius: 10px; border: 1.5px solid rgba(0, 242, 254, 0.4); background: rgba(0, 242, 254, 0.15); color: #00f2fe; font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;">
                    ▶️ Jätka mängu (Resume)
                </button>
                <button type="button" id="btn-playard-leave" style="width: 100%; padding: 13px; border-radius: 10px; border: 1.5px solid rgba(255, 71, 87, 0.5); background: linear-gradient(135deg, #ff4757, #c0392b); color: #ffffff; font-weight: 900; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 16px rgba(255, 71, 87, 0.45); transition: all 0.2s;">
                    <span>🚪</span>
                    <span>Leave (Lahku Hubi)</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 3b. Inject Report Modal
    const reportModal = document.createElement('div');
    reportModal.id = 'modal-playard-report';
    reportModal.innerHTML = `
        <div class="playard-report-card">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(255,71,87,0.15); border: 1.5px solid #ff4757; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; box-shadow: 0 0 10px rgba(255,71,87,0.3);">
                        🚩
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.05rem; color: #ff6b81; font-weight: 800;">Raporteeri mängijat</h3>
                        <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">Teade edastatakse Playard Owneri paneeli</span>
                    </div>
                </div>
                <button type="button" id="btn-close-playard-report" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; width: 30px; height: 30px; border-radius: 50%; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Sulge">✕</button>
            </div>

            <!-- Target player info badge -->
            <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 10px; padding: 9px 12px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.8rem; color: #cbd5e1; font-weight: 600;">Raporteeritav mängija:</span>
                <strong id="report-target-player-name" style="color: #ff6b81; font-size: 0.92rem; font-weight: 800;">-</strong>
            </div>

            <!-- Reason selection -->
            <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; color: #94a3b8; font-weight: 700; display: block; margin-bottom: 6px;">Vali rikkumise põhjus:</label>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 7px 10px; cursor: pointer;">
                        <input type="radio" name="playard-report-reason" value="Cheating" checked style="accent-color: #ff4757;">
                        <div>
                            <strong style="color: #ffffff; font-size: 0.84rem; display: block;">⚡ Cheating</strong>
                            <span style="font-size: 0.7rem; color: #8899a6;">Koodimine, kiiruse häkk, läbi seinte liikumine</span>
                        </div>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 7px 10px; cursor: pointer;">
                        <input type="radio" name="playard-report-reason" value="Spamming" style="accent-color: #ff4757;">
                        <div>
                            <strong style="color: #ffffff; font-size: 0.84rem; display: block;">📢 Spamming</strong>
                            <span style="font-size: 0.7rem; color: #8899a6;">Vestluse risustamine, ropendamine või tüütamine</span>
                        </div>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 7px 10px; cursor: pointer;">
                        <input type="radio" name="playard-report-reason" value="custom" style="accent-color: #ff4757;">
                        <div>
                            <strong style="color: #ffffff; font-size: 0.84rem; display: block;">✍️ Oma põhjus (Kirjuta ise)</strong>
                            <span style="font-size: 0.7rem; color: #8899a6;">Sisesta vabas vormis oma põhjendus</span>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Custom / Details Input -->
            <div style="margin-bottom: 14px;">
                <label style="font-size: 0.78rem; color: #94a3b8; font-weight: 700; display: block; margin-bottom: 4px;">Täpsem selgitus (või sinu põhjus):</label>
                <textarea id="report-custom-reason-input" rows="2" placeholder="nt Teeb speedhacki või hüppab läbi lae..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1.5px solid #334155; background: #0b1118; color: #ffffff; font-size: 0.85rem; font-family: inherit; resize: none; outline: none;"></textarea>
            </div>

            <div id="report-submit-status" style="display: none; padding: 8px; border-radius: 8px; font-size: 0.82rem; font-weight: 700; margin-bottom: 12px; text-align: center;"></div>

            <!-- Actions -->
            <div style="display: flex; gap: 8px;">
                <button type="button" id="btn-cancel-player-report" style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #cbd5e1; font-weight: 700; font-size: 0.85rem; cursor: pointer;">
                    Tühista
                </button>
                <button type="button" id="btn-submit-player-report" style="flex: 1.6; padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 71, 87, 0.5); background: linear-gradient(135deg, #ff4757, #c0392b); color: #ffffff; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 14px rgba(255, 71, 87, 0.4);">
                    <span>🚩</span>
                    <span>Saada raport</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(reportModal);

    let activeReportPlayer = '';

    const openReportModal = (targetPlayer: string) => {
        activeReportPlayer = targetPlayer;
        const targetEl = document.getElementById('report-target-player-name');
        if (targetEl) targetEl.textContent = targetPlayer;

        const customInput = document.getElementById('report-custom-reason-input') as HTMLTextAreaElement | null;
        if (customInput) customInput.value = '';

        const statusEl = document.getElementById('report-submit-status');
        if (statusEl) {
            statusEl.style.display = 'none';
            statusEl.textContent = '';
        }

        // Reset radio to Cheating
        const radios = document.getElementsByName('playard-report-reason') as NodeListOf<HTMLInputElement>;
        radios.forEach(r => {
            r.checked = r.value === 'Cheating';
        });

        reportModal.style.display = 'flex';
        void reportModal.offsetWidth;
        reportModal.classList.add('active');
    };

    const closeReportModal = () => {
        reportModal.classList.remove('active');
        setTimeout(() => {
            if (!reportModal.classList.contains('active')) {
                reportModal.style.display = 'none';
            }
        }, 200);
    };

    // 4. Update function
    const updateMenuData = () => {
        const info = options?.getPlayerCount ? options.getPlayerCount() : getDetectedServerPlayerInfo();
        const countEl = document.getElementById('playard-menu-player-count');
        const listEl = document.getElementById('playard-menu-player-list');
        const titleEl = document.getElementById('playard-menu-game-title');

        if (titleEl && !options?.gameTitle) {
            titleEl.textContent = getDetectedGameTitle();
        }

        if (countEl) {
            countEl.textContent = info.countStr;
        }

        if (listEl) {
            listEl.innerHTML = '';
            info.players.forEach((pName, idx) => {
                const row = document.createElement('div');
                row.style.cssText = 'background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; font-weight: 700; gap: 8px;';

                const isSelf = idx === 0 || pName.includes('(Sina)');
                const cleanName = pName.replace(/^[^\w\s]+/, '').replace(/✔.*$/, '').replace(/👑.*$/, '').trim();

                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <span style="font-size: 0.75rem; color: #00f2fe; flex-shrink: 0;">#${idx + 1}</span>
                        <span style="color: #ffffff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pName}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span style="font-size: 0.7rem; color: #2ecc71; background: rgba(46, 204, 113, 0.12); padding: 1px 6px; border-radius: 4px;">🟢 Sees</span>
                        ${!isSelf ? `
                            <button type="button" class="btn-player-report" data-player="${cleanName || pName}" title="Raporteeri mängijat">
                                <span>🚩</span>
                                <span>Report</span>
                            </button>
                        ` : ''}
                    </div>
                `;
                listEl.appendChild(row);
            });

            // Wire report buttons
            listEl.querySelectorAll('.btn-player-report').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const target = (btn as HTMLElement).getAttribute('data-player') || 'Mängija';
                    openReportModal(target);
                });
            });
        }
    };

    // 5. Open / Close controls
    const openMenu = () => {
        updateMenuData();
        modal.style.display = 'flex';
        // force reflow
        void modal.offsetWidth;
        modal.classList.add('active');
    };

    const closeMenu = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            if (!modal.classList.contains('active')) {
                modal.style.display = 'none';
            }
        }, 200);
    };

    const toggleMenu = () => {
        if (modal.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    };

    // Wire buttons
    pBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    document.getElementById('btn-close-playard-menu')?.addEventListener('click', closeMenu);
    document.getElementById('btn-playard-resume')?.addEventListener('click', closeMenu);

    document.getElementById('btn-playard-leave')?.addEventListener('click', () => {
        window.location.href = hubUrl;
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMenu();
        }
    });

    // Wire Report Modal actions
    document.getElementById('btn-close-playard-report')?.addEventListener('click', closeReportModal);
    document.getElementById('btn-cancel-player-report')?.addEventListener('click', closeReportModal);
    reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) {
            closeReportModal();
        }
    });

    document.getElementById('btn-submit-player-report')?.addEventListener('click', () => {
        const radios = document.getElementsByName('playard-report-reason') as NodeListOf<HTMLInputElement>;
        let selectedReason = 'Cheating';
        radios.forEach(r => {
            if (r.checked) selectedReason = r.value;
        });

        const customInput = document.getElementById('report-custom-reason-input') as HTMLTextAreaElement | null;
        const customText = (customInput?.value || '').trim();
        const statusEl = document.getElementById('report-submit-status');

        if (selectedReason === 'custom' && !customText) {
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.background = 'rgba(255, 71, 87, 0.2)';
                statusEl.style.color = '#ff6b81';
                statusEl.style.border = '1px solid #ff4757';
                statusEl.textContent = 'Palun kirjuta oma põhjus tekstikasti!';
            }
            return;
        }

        const finalReason = selectedReason === 'custom' ? (customText || 'Oma põhjus') : selectedReason;
        const currentGame = document.getElementById('playard-menu-game-title')?.textContent || gameTitle;

        // Find reporter username from local storage
        let reporterName = 'Mängija';
        try {
            const raw = localStorage.getItem('playard_current_user_profile');
            if (raw) {
                const p = JSON.parse(raw);
                reporterName = p.displayName || p.username || 'Mängija';
            }
        } catch (e) {}

        addPlayerReport({
            targetPlayer: activeReportPlayer,
            reporter: reporterName,
            reason: finalReason,
            details: customText,
            game: currentGame
        });

        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = 'rgba(46, 204, 113, 0.2)';
            statusEl.style.color = '#2ecc71';
            statusEl.style.border = '1px solid #2ecc71';
            statusEl.textContent = '✅ Raport edukalt saadetud Playard Ownerile!';
        }

        setTimeout(() => {
            closeReportModal();
        }, 700);
    });

    // Keyboard shortcut: 'P' or 'Escape' toggles menu
    window.addEventListener('keydown', (e) => {
        // If typing in an input/textarea, don't trigger on 'P'
        const target = e.target as HTMLElement | null;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

        if (e.key === 'Escape') {
            if (reportModal.classList.contains('active')) {
                closeReportModal();
                return;
            }
            if (modal.classList.contains('active')) {
                closeMenu();
            }
        } else if ((e.key === 'p' || e.key === 'P') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Avoid conflict with MMP1's admin key and Flight simulator autopilot
            if (!window.location.pathname.includes('/mmp1/') && !window.location.pathname.includes('/flight/')) {
                toggleMenu();
            }
        }
    });

    // Also export on window for testing
    if (typeof window !== 'undefined') {
        (window as any).PlayardInGameMenu = {
            open: openMenu,
            close: closeMenu,
            toggle: toggleMenu,
            update: updateMenuData,
            openReport: openReportModal,
            closeReport: closeReportModal
        };
    }
}

// Auto-initialize when loaded on any game page
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initPlayardMenu());
    } else {
        initPlayardMenu();
    }
}
