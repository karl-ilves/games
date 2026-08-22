import { supabase } from './lib/supabase';
import { initAuth, getCurrentUserProfile } from './auth';
import { yardService, YardData, CreatedGame } from './shared/yardService';
import { setLanguage, applyLocalization } from './shared/i18n';

console.log("Playard Hub & Platform Loaded.");
initAuth();

const ADMIN_EMAIL = '1karl.ilves@gmail.com';

function updateAdminControlsVisibility(userEmail?: string | null) {
    const adminStreakControls = document.getElementById('streak-admin-controls');
    const adminNavBtn = document.getElementById('btn-open-admin-panel');
    
    let emailToCheck = userEmail;
    if (!emailToCheck) {
        const prof = getCurrentUserProfile();
        emailToCheck = prof?.email;
    }

    const isAdmin = !!emailToCheck && emailToCheck.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (adminStreakControls) {
        adminStreakControls.style.display = isAdmin ? 'flex' : 'none';
    }
    if (adminNavBtn) {
        adminNavBtn.style.display = isAdmin ? 'flex' : 'none';
    }

    // Switch language: Estonian for admin 1karl.ilves@gmail.com, English for others!
    setLanguage(isAdmin ? 'et' : 'en');
}

// --- Setup UI Icons & Elements ---
function setupIcons() {
    const navYardIcon = document.getElementById('nav-yard-icon');
    if (navYardIcon) navYardIcon.innerHTML = yardService.renderYardSvg(28);

    const headerYardIcon = document.getElementById('header-yard-icon');
    if (headerYardIcon) headerYardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardAirplaneYardIcon = document.getElementById('card-airplane-yard-icon');
    if (cardAirplaneYardIcon) cardAirplaneYardIcon.innerHTML = yardService.renderYardSvg(16);

    const cardRacingYardIcon = document.getElementById('card-racing-yard-icon');
    if (cardRacingYardIcon) cardRacingYardIcon.innerHTML = yardService.renderYardSvg(16);
}

// --- Live HMS Countdown Updater ---
let wasCanClaim = false;

function updateStreakTimerLive() {
    const cd = yardService.getFormattedCountdown();
    
    // 1. Header Timer Badge
    const headerTimer = document.getElementById('header-streak-timer');
    if (headerTimer) {
        headerTimer.innerText = cd.badgeText;
        headerTimer.style.color = cd.canClaim ? '#2ecc71' : '#ffd32a';
    }

    // 2. Modal HMS Box
    const modalHms = document.getElementById('streak-timer-hms');
    if (modalHms) {
        modalHms.innerText = cd.hmsString;
        modalHms.style.color = cd.canClaim ? '#2ecc71' : '#ffd32a';
    }

    // 3. Notification Dot
    const streakDot = document.getElementById('streak-notification-dot');
    if (streakDot) {
        streakDot.style.display = cd.canClaim ? 'inline-block' : 'none';
    }

    // Auto-refresh cards if state flipped from waiting to ready
    if (cd.canClaim !== wasCanClaim) {
        wasCanClaim = cd.canClaim;
        renderStreakCards();
    }
}

// --- Update UI with Current Yard Data ---
function updateYardDisplay(data: YardData) {
    const headerVal = document.getElementById('header-yard-val');
    if (headerVal) headerVal.innerText = data.yards.toLocaleString();

    updateStreakTimerLive();
    renderStreakCards();
}

// --- Render 7-Day Streak Calendar ---
function renderStreakCards() {
    const container = document.getElementById('streak-cards-container');
    if (!container) return;

    const streakInfo = yardService.getDailyStreakInfo();
    container.innerHTML = '';

    streakInfo.days.forEach(d => {
        const card = document.createElement('div');
        card.className = `streak-day-card ${d.status} ${d.isJackpot ? 'jackpot' : ''}`;

        let statusText = '';
        if (d.status === 'claimed') statusText = '✓ Claimed';
        else if (d.status === 'available') statusText = '🎁 CLAIM';
        else statusText = '🔒 Locked';

        card.innerHTML = `
            <div class="day-label">${d.isJackpot ? '🌟 DAY 7' : `Day ${d.day}`}</div>
            <div>${yardService.renderYardSvg(d.isJackpot ? 30 : 22)}</div>
            <div class="reward-val" style="color: ${d.isJackpot ? '#ffd32a' : '#00f2fe'};">
                +${d.reward}
            </div>
            <div style="font-size: 0.72rem; font-weight: 700; color: ${d.status === 'claimed' ? '#2ecc71' : (d.status === 'available' ? '#00f2fe' : '#718093')}">
                ${statusText}
            </div>
        `;
        container.appendChild(card);
    });

    const claimBtn = document.getElementById('btn-claim-daily') as HTMLButtonElement | null;
    const statusMsg = document.getElementById('streak-status-msg');

    if (claimBtn) {
        claimBtn.disabled = !streakInfo.canClaim;
        if (streakInfo.canClaim) {
            claimBtn.innerText = `CLAIM DAY ${streakInfo.nextDayIndex} (+${streakInfo.nextRewardAmount} YARDS)`;
            claimBtn.style.background = streakInfo.nextDayIndex === 7
                ? 'linear-gradient(135deg, #ffd32a, #ff9f1a)'
                : 'linear-gradient(135deg, #00f2fe, #4facfe)';
        } else {
            claimBtn.innerText = `DAY ${streakInfo.currentStreak} CLAIMED`;
            claimBtn.style.background = '#4b6584';
        }
    }

    if (statusMsg && !statusMsg.dataset.custom) {
        if (streakInfo.canClaim) {
            statusMsg.innerText = streakInfo.nextDayIndex === 7
                ? '🔥 Day 7 Jackpot ready: Claim 500 Yards now!'
                : `🎁 Day ${streakInfo.nextDayIndex} Streak Reward Ready! (+${streakInfo.nextRewardAmount} Y)`;
            statusMsg.style.color = '#00f2fe';
        } else {
            statusMsg.innerText = `Current streak: ${streakInfo.currentStreak} / 7 Days.`;
            statusMsg.style.color = '#a4b0be';
        }
    }

    updateStreakTimerLive();
}

// --- Load and Render Community Games on Hub ---
async function renderCommunityGames() {
    const container = document.getElementById('community-games-grid');
    if (!container) return;

    const approvedGames = await yardService.getApprovedGames();
    if (!approvedGames || approvedGames.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; background: #1a232e; padding: 30px; border-radius: 12px; text-align: center; color: #718093; border: 1px dashed rgba(255,255,255,0.1);">
                <p style="font-size: 1.1rem; margin-bottom: 10px; color: #a4b0be;">No community games approved yet!</p>
                <p style="font-size: 0.9rem; margin: 0;">Be the first creator to build a game in the Creator Studio and submit it for review.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    approvedGames.forEach(game => {
        const card = document.createElement('a');
        card.href = `./games/play/index.html?id=${game.id}`;
        card.className = 'game-card';
        card.innerHTML = `
            <h2>🎮 ${game.title}</h2>
            <p>${game.description || 'Community created 3D game. Explore the world and have fun!'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                <div class="reward-tag">
                    <span>👤 By: <strong>${game.creatorUsername}</strong></span>
                </div>
                <span style="color: #00f2fe; font-weight: bold; font-size: 0.9rem;">▶️ Play</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Admin Panel Functions ---
async function renderAdminReviewGames() {
    const listContainer = document.getElementById('admin-review-games-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align: center; color: #718093; padding: 20px;">Fetching pending games...</div>';

    const pending = await yardService.getPendingGames();
    if (!pending || pending.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; color: #2ecc71; padding: 30px; background: rgba(46, 204, 113, 0.08); border-radius: 8px; border: 1px dashed rgba(46, 204, 113, 0.3);">
                <p style="margin: 0; font-size: 1.1rem; font-weight: bold;">✓ All caught up!</p>
                <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #a4b0be;">There are currently no games waiting for review.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = '';
    pending.forEach(game => {
        const item = document.createElement('div');
        item.style.cssText = 'background: #242f3d; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;';
        
        const dateStr = new Date(game.createdAt).toLocaleString();
        const objCount = game.sceneData?.objects?.length ?? 0;

        item.innerHTML = `
            <div>
                <h4 style="margin: 0 0 4px 0; color: #00f2fe; font-size: 1.1rem;">${game.title}</h4>
                <div style="font-size: 0.85rem; color: #a4b0be;">
                    By: <strong style="color: #ffd32a;">${game.creatorUsername}</strong> | Category: <strong>${game.category}</strong> | Objects: <strong>${objCount}</strong> | ${dateStr}
                </div>
                <div style="font-size: 0.85rem; color: #d2dae2; margin-top: 6px;">${game.description || 'No description provided.'}</div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="./games/play/index.html?id=${game.id}&mode=review" target="_blank" style="padding: 8px 14px; background: #3498db; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.85rem; display: flex; align-items: center; gap: 5px;">
                    🎮 Play & Test
                </a>
                <button class="btn-admin-approve" data-id="${game.id}" style="padding: 8px 14px; background: #2ecc71; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">
                    ✅ Approve
                </button>
                <button class="btn-admin-reject" data-id="${game.id}" style="padding: 8px 14px; background: #e74c3c; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">
                    ❌ Reject
                </button>
                <button class="btn-admin-changes" data-id="${game.id}" style="padding: 8px 14px; background: #f39c12; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">
                    ⚠️ Request Changes
                </button>
            </div>
        `;
        listContainer.appendChild(item);
    });

    // Bind action buttons
    listContainer.querySelectorAll('.btn-admin-approve').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) {
                await yardService.updateGameStatus(id, 'approved');
                renderAdminReviewGames();
                renderCommunityGames();
            }
        });
    });

    listContainer.querySelectorAll('.btn-admin-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id && confirm('Are you sure you want to reject this game?')) {
                const reason = prompt('Optional rejection reason:', '') || '';
                await yardService.updateGameStatus(id, 'rejected', reason);
                renderAdminReviewGames();
            }
        });
    });

    listContainer.querySelectorAll('.btn-admin-changes').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) {
                const feedback = prompt('What changes should the creator make?', 'Please add more gameplay elements.');
                if (feedback) {
                    await yardService.updateGameStatus(id, 'changes_requested', feedback);
                    renderAdminReviewGames();
                }
            }
        });
    });
}

function renderAdminYardLogs() {
    const logsContainer = document.getElementById('admin-yard-logs-container');
    if (!logsContainer) return;

    const logs = yardService.getAdminYardLogs();
    if (!logs || logs.length === 0) {
        logsContainer.innerHTML = '<div style="color: #718093; text-align: center;">No Yard grant logs recorded yet.</div>';
        return;
    }

    logsContainer.innerHTML = logs.map(l => {
        const time = new Date(l.timestamp).toLocaleString();
        return `<div style="margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 3px;">
            [${time}] <strong style="color: #ffd32a;">+${l.amount} Y</strong> granted to <strong style="color: #00f2fe;">@${l.targetUsername}</strong> (Reason: ${l.reason || 'N/A'}) by ${l.adminEmail}
        </div>`;
    }).join('');
}

function renderAdminPromoStats() {
    const stats = yardService.getCodeRedemptionStats();
    
    // Overview numbers
    const totalClaimsEl = document.getElementById('admin-stat-total-claims');
    const totalYardsEl = document.getElementById('admin-stat-total-yards');
    const activeCodesEl = document.getElementById('admin-stat-active-codes');

    if (totalClaimsEl) totalClaimsEl.innerText = stats.totalRedemptions.toString();
    if (totalYardsEl) totalYardsEl.innerText = stats.totalYardsGiven.toLocaleString() + ' Y';
    if (activeCodesEl) activeCodesEl.innerText = stats.codes.length.toString();

    // Table of codes
    const tableContainer = document.getElementById('admin-promo-codes-table');
    if (tableContainer) {
        tableContainer.innerHTML = stats.codes.map(c => {
            const userNames = c.users.map(u => `@${u.username}`).slice(0, 3).join(', ');
            const moreUsers = c.users.length > 3 ? ` ja veel ${c.users.length - 3}` : '';
            const usersDisplay = c.users.length > 0 ? `${userNames}${moreUsers}` : 'Mitte keegi veel';
            const lastTime = c.lastRedeemed ? new Date(c.lastRedeemed).toLocaleString() : '-';

            return `
                <div style="background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <span style="font-family: monospace; font-size: 1.05rem; font-weight: 800; color: #00f2fe; background: rgba(0,242,254,0.1); padding: 3px 8px; border-radius: 5px;">
                            ${c.code}
                        </span>
                        <span style="font-size: 0.85rem; color: #ffd32a; font-weight: bold; margin-left: 8px;">+${c.reward} Yards</span>
                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">
                            Sisestanud kasutajad: <strong style="color: #e2e8f0;">${usersDisplay}</strong>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.1rem; font-weight: 900; color: #2ecc71;">
                            ${c.count} <span style="font-size: 0.8rem; font-weight: normal; color: #a4b0be;">inimest</span>
                        </div>
                        <div style="font-size: 0.75rem; color: #64748b;">Viimati: ${lastTime}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Recent Logs
    const logsContainer = document.getElementById('admin-code-redemption-logs');
    if (logsContainer) {
        if (stats.recentLogs.length === 0) {
            logsContainer.innerHTML = '<div style="color: #718093; text-align: center;">Ühtegi koodi pole veel sisestatud.</div>';
        } else {
            logsContainer.innerHTML = stats.recentLogs.map(l => {
                const time = new Date(l.timestamp).toLocaleString();
                return `<div style="margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 3px;">
                    [${time}] Kasutaja <strong style="color: #00f2fe;">@${l.username}</strong> sisestas koodi <strong style="color: #ffd32a;">${l.code}</strong> ja sai <strong style="color: #2ecc71;">+${l.amount} Y</strong>
                </div>`;
            }).join('');
        }
    }
}

// --- Setup Modal & Button Event Listeners ---
function setupModals() {
    // 1. Streak Modal
    const modalStreak = document.getElementById('modal-streak');
    const openStreakBtn = document.getElementById('btn-open-streak');
    const closeStreakBtn = document.getElementById('btn-close-streak');
    const walletBadge = document.getElementById('btn-wallet-badge');

    if (openStreakBtn && modalStreak) {
        openStreakBtn.addEventListener('click', () => {
            modalStreak.style.display = 'flex';
            renderStreakCards();
            updateStreakTimerLive();
        });
    }
    if (walletBadge && modalStreak) {
        walletBadge.addEventListener('click', () => {
            modalStreak.style.display = 'flex';
            renderStreakCards();
            updateStreakTimerLive();
        });
    }
    if (closeStreakBtn && modalStreak) {
        closeStreakBtn.addEventListener('click', () => modalStreak.style.display = 'none');
    }

    // 2. Claim Daily Button
    const claimDailyBtn = document.getElementById('btn-claim-daily');
    if (claimDailyBtn) {
        claimDailyBtn.addEventListener('click', () => {
            const res = yardService.claimDailyReward();
            const statusMsg = document.getElementById('streak-status-msg');
            if (statusMsg) {
                statusMsg.dataset.custom = 'true';
                statusMsg.innerText = res.message;
                statusMsg.style.color = res.success ? '#2ecc71' : '#ff4757';
                setTimeout(() => {
                    delete statusMsg.dataset.custom;
                    renderStreakCards();
                }, 4000);
            }
            updateStreakTimerLive();
        });
    }

    // 3. Promo Code Redeem
    const promoInput = document.getElementById('promo-code-input') as HTMLInputElement | null;
    const redeemBtn = document.getElementById('btn-redeem-promo');
    const promoStatus = document.getElementById('promo-code-status');

    if (redeemBtn && promoInput) {
        redeemBtn.addEventListener('click', () => {
            const code = promoInput.value;
            const res = yardService.redeemPromoCode(code);
            if (promoStatus) {
                promoStatus.innerText = res.message;
                promoStatus.style.color = res.success ? '#2ecc71' : '#ff4757';
            }
            if (res.success) {
                promoInput.value = '';
            }
        });
    }

    // 4. Debug Fast-Forward & Reset (Admin)
    const debugBtn = document.getElementById('btn-debug-fastforward');
    if (debugBtn) {
        debugBtn.addEventListener('click', () => {
            yardService.debugFastForward24Hours();
            renderStreakCards();
            updateStreakTimerLive();
            const statusMsg = document.getElementById('streak-status-msg');
            if (statusMsg) {
                statusMsg.innerText = '⚡ Simulated 24 hours passing! Next reward is ready.';
                statusMsg.style.color = '#ffd32a';
            }
        });
    }

    const resetBtn = document.getElementById('btn-debug-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            yardService.resetStreakAndTimer();
            renderStreakCards();
            updateStreakTimerLive();
            const statusMsg = document.getElementById('streak-status-msg');
            if (statusMsg) {
                statusMsg.innerText = '🔄 Daily streak and timer have been reset to Day 1!';
                statusMsg.style.color = '#e74c3c';
            }
        });
    }

    // 5. Create Game Floating & Hub Buttons
    const handleCreateGameClick = () => {
        const profile = getCurrentUserProfile();
        if (!profile) {
            alert('🔒 You must have an account to create games. Please login or register above!');
            const authElem = document.getElementById('auth-container');
            if (authElem) {
                authElem.scrollIntoView({ behavior: 'smooth' });
                authElem.style.border = '2px solid #00f2fe';
                setTimeout(() => authElem.style.border = '1px solid rgba(255,255,255,0.08)', 2000);
            }
            return;
        }
        window.location.href = './games/creator/index.html';
    };

    document.getElementById('btn-create-game')?.addEventListener('click', handleCreateGameClick);
    document.getElementById('btn-hub-create-game')?.addEventListener('click', handleCreateGameClick);

    // 6. Admin Panel Modal & Tabs
    const modalAdmin = document.getElementById('modal-admin-panel');
    const openAdminBtn = document.getElementById('btn-open-admin-panel');
    const closeAdminBtn = document.getElementById('btn-close-admin-panel');

    if (openAdminBtn && modalAdmin) {
        openAdminBtn.addEventListener('click', () => {
            modalAdmin.style.display = 'flex';
            renderAdminReviewGames();
            renderAdminYardLogs();
            renderAdminPromoStats();
        });
    }
    if (closeAdminBtn && modalAdmin) {
        closeAdminBtn.addEventListener('click', () => modalAdmin.style.display = 'none');
    }

    // Tab Switching
    const tabReview = document.getElementById('tab-btn-review-games');
    const tabGive = document.getElementById('tab-btn-give-yards');
    const tabPromo = document.getElementById('tab-btn-promo-stats');
    const viewReview = document.getElementById('admin-tab-review-games');
    const viewGive = document.getElementById('admin-tab-give-yards');
    const viewPromo = document.getElementById('admin-tab-promo-stats');

    const switchAdminTab = (activeTab: 'review' | 'give' | 'promo') => {
        tabReview?.classList.toggle('active', activeTab === 'review');
        tabGive?.classList.toggle('active', activeTab === 'give');
        tabPromo?.classList.toggle('active', activeTab === 'promo');

        if (viewReview) viewReview.style.display = activeTab === 'review' ? 'block' : 'none';
        if (viewGive) viewGive.style.display = activeTab === 'give' ? 'block' : 'none';
        if (viewPromo) viewPromo.style.display = activeTab === 'promo' ? 'block' : 'none';

        if (activeTab === 'review') renderAdminReviewGames();
        if (activeTab === 'give') renderAdminYardLogs();
        if (activeTab === 'promo') renderAdminPromoStats();
    };

    tabReview?.addEventListener('click', () => switchAdminTab('review'));
    tabGive?.addEventListener('click', () => switchAdminTab('give'));
    tabPromo?.addEventListener('click', () => switchAdminTab('promo'));

    // Give Yards Handler
    const giveYardsBtn = document.getElementById('btn-admin-give-yards');
    const giveUsernameInput = document.getElementById('admin-give-username') as HTMLInputElement | null;
    const giveAmountInput = document.getElementById('admin-give-amount') as HTMLInputElement | null;
    const giveReasonInput = document.getElementById('admin-give-reason') as HTMLInputElement | null;
    const giveStatus = document.getElementById('admin-give-status');

    if (giveYardsBtn && giveUsernameInput && giveAmountInput) {
        giveYardsBtn.addEventListener('click', async () => {
            const username = giveUsernameInput.value.trim();
            const amount = parseInt(giveAmountInput.value, 10);
            const reason = giveReasonInput?.value.trim() || 'Admin Grant';

            if (!username) {
                if (giveStatus) {
                    giveStatus.innerText = 'Please enter a target username.';
                    giveStatus.style.color = '#ff4757';
                }
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                if (giveStatus) {
                    giveStatus.innerText = 'Please enter a valid amount of Yards.';
                    giveStatus.style.color = '#ff4757';
                }
                return;
            }

            if (giveStatus) {
                giveStatus.innerText = `Granting ${amount} Yards to @${username}...`;
                giveStatus.style.color = '#ffd32a';
            }

            const res = await yardService.adminGiveYardsByUsername(username, amount, reason, ADMIN_EMAIL);
            if (giveStatus) {
                giveStatus.innerText = res.message;
                giveStatus.style.color = res.success ? '#2ecc71' : '#ff4757';
            }

            if (res.success) {
                giveUsernameInput.value = '';
                renderAdminYardLogs();
            }
        });
    }

    // Modal Background Clicks
    window.addEventListener('click', (e) => {
        if (e.target === modalStreak && modalStreak) modalStreak.style.display = 'none';
        if (e.target === modalAdmin && modalAdmin) modalAdmin.style.display = 'none';
    });
}

// Initialise
setupIcons();
setupModals();
renderCommunityGames();

const initialProf = getCurrentUserProfile();
updateAdminControlsVisibility(initialProf?.email);

yardService.subscribe(updateYardDisplay);
setInterval(updateStreakTimerLive, 1000);

window.addEventListener('playard_games_updated', () => {
    renderCommunityGames();
    renderAdminReviewGames();
});

window.addEventListener('playard_auth_changed', (e: any) => {
    const profile = e.detail;
    updateAdminControlsVisibility(profile?.email);
});
