import { supabase } from './lib/supabase';
import { initAuth, getCurrentUserProfile, isUserAdminEmail, isUserAdmin, isPlayardOwner } from './auth';
import { yardService, YardData, CreatedGame } from './shared/yardService';
import { setLanguage, applyLocalization } from './shared/i18n';

console.log("Playard Hub & Platform Loaded.");
initAuth();
(window as any).yardService = yardService;

function updateAdminControlsVisibility(userEmail?: string | null) {
    const adminStreakControls = document.getElementById('streak-admin-controls');
    const adminNavBtn = document.getElementById('btn-open-admin-panel');
    
    let emailToCheck = userEmail;
    if (!emailToCheck) {
        const prof = getCurrentUserProfile();
        emailToCheck = prof?.email;
    }

    const showAdminPanel = isUserAdmin(emailToCheck);
    const isEstonian = isUserAdminEmail(emailToCheck);

    if (adminStreakControls) {
        adminStreakControls.style.display = showAdminPanel ? 'flex' : 'none';
    }
    if (adminNavBtn) {
        adminNavBtn.style.display = showAdminPanel ? 'flex' : 'none';
    }
    const btnOpenStreak = document.getElementById('btn-open-streak');
    if (btnOpenStreak) {
        btnOpenStreak.style.display = showAdminPanel ? 'none' : 'flex';
    }
    
    // War game kaart on nähtav Playardi Ownerile ja Adminile
    const warGameCard = document.getElementById('card-war-game');
    if (warGameCard) {
        warGameCard.style.display = isUserAdminEmail(emailToCheck) ? 'flex' : 'none';
    }

    // Rongimäng on nähtav Playard Ownerile
    const trainGameCard = document.getElementById('card-train-game');
    if (trainGameCard) {
        trainGameCard.style.display = isPlayardOwner(emailToCheck) ? 'flex' : 'none';
    }

    // Switch language: Estonian for admin and owner, English for others!
    setLanguage(isEstonian ? 'et' : 'en');
}

// --- Setup UI Icons & Elements ---
function setupIcons() {
    const navYardIcon = document.getElementById('nav-yard-icon');
    if (navYardIcon) navYardIcon.innerHTML = yardService.renderYardSvg(28);

    const headerYardIcon = document.getElementById('header-yard-icon');
    if (headerYardIcon) headerYardIcon.innerHTML = yardService.renderYardSvg(22);

    const cardRacingYardIcon = document.getElementById('card-racing-yard-icon');
    if (cardRacingYardIcon) cardRacingYardIcon.innerHTML = yardService.renderYardSvg(16);

    const cardCookingYardIcon = document.getElementById('card-cooking-yard-icon');
    if (cardCookingYardIcon) cardCookingYardIcon.innerHTML = yardService.renderYardSvg(16);

    const cardWarYardIcon = document.getElementById('card-war-yard-icon');
    if (cardWarYardIcon) cardWarYardIcon.innerHTML = yardService.renderYardSvg(16);

    const cardTrainYardIcon = document.getElementById('card-train-yard-icon');
    if (cardTrainYardIcon) cardTrainYardIcon.innerHTML = yardService.renderYardSvg(16);
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
    const prof = getCurrentUserProfile();
    const isAdmin = isUserAdminEmail(prof?.email);
    
    if (headerVal) {
        headerVal.innerText = isAdmin ? '∞' : data.yards.toLocaleString();
    }

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

// --- Admin Update Panel Functions ---
async function renderAdminUpdatesList() {
    const listContainer = document.getElementById('admin-sent-updates-list');
    const countBadge = document.getElementById('admin-updates-count-badge');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align: center; color: #718093; padding: 15px;">Laen uuendusi andmebaasist...</div>';

    const updates = await yardService.fetchPlatformUpdatesFromCloud();
    if (countBadge) {
        countBadge.innerText = `${updates.length} uuendust`;
    }

    if (!updates || updates.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; color: #a4b0be; padding: 25px; background: rgba(255, 255, 255, 0.02); border-radius: 8px;">
                <p style="margin: 0; font-size: 0.95rem; font-weight: bold; color: #718093;">📭 Ühtegi uuendust pole veel saadetud.</p>
                <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #57606f;">Kirjuta ülalpool uus uuendus ja vajuta "Saada Ownerile".</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = '';
    updates.forEach(upd => {
        const item = document.createElement('div');
        item.style.cssText = 'background: #1e293b; border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;';
        
        const dateStr = new Date(upd.createdAt).toLocaleString();
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="color: #ffd32a; font-size: 1rem;">${upd.title}</strong>
                    <span style="background: rgba(0,242,254,0.15); color: #00f2fe; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; font-family: monospace;">${upd.version}</span>
                </div>
                <span style="font-size: 0.75rem; color: #2ecc71; background: rgba(46, 204, 113, 0.15); padding: 3px 8px; border-radius: 6px; font-weight: bold;">
                    ✓ Saadetud Ownerile andmebaasi
                </span>
            </div>
            <div style="font-size: 0.85rem; color: #e2e8f0; white-space: pre-wrap; line-height: 1.4; background: #131920; padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.04);">${upd.content}</div>
            <div style="font-size: 0.75rem; color: #64748b; display: flex; justify-content: space-between;">
                <span>Saatja: <strong style="color: #ffd32a;">${upd.authorName} (${upd.authorEmail})</strong></span>
                <span>${dateStr}</span>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// --- Render Admin Bug Reports ---
async function renderAdminBugReports() {
    const container = document.getElementById('admin-bug-reports-list');
    if (!container) return;

    if (!supabase) {
        container.innerHTML = '<div style="text-align: center; color: #718093; padding: 25px;">Supabase not connected.</div>';
        return;
    }

    try {
        const { data: reports, error } = await supabase
            .from('bug_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!reports || reports.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #718093; padding: 25px;">🎉 No bug reports yet!</div>';
            return;
        }

        container.innerHTML = reports.map((r: any) => {
            const date = new Date(r.created_at).toLocaleString();
            const statusColors: Record<string, string> = { 'new': '#ff4757', 'seen': '#ffd32a', 'fixed': '#2ecc71', 'wontfix': '#a4b0be' };
            const statusLabels: Record<string, string> = { 'new': '🆕 New', 'seen': '👀 Seen', 'fixed': '✅ Fixed', 'wontfix': '🚫 Won\'t Fix' };
            const color = statusColors[r.status] || '#a4b0be';
            const label = statusLabels[r.status] || r.status;

            return `<div style="background: #1a2430; border: 1px solid ${r.status === 'new' ? 'rgba(255,71,87,0.4)' : 'rgba(255,255,255,0.08)'}; border-radius: 10px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <strong style="color: #fff; font-size: 1rem;">${r.title}</strong>
                        <span style="font-size: 0.75rem; color: ${color}; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 10px; margin-left: 8px;">${label}</span>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <select data-bug-id="${r.id}" class="bug-status-select" style="background: #131920; color: #fff; border: 1px solid #485460; border-radius: 6px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;">
                            <option value="new" ${r.status === 'new' ? 'selected' : ''}>🆕 New</option>
                            <option value="seen" ${r.status === 'seen' ? 'selected' : ''}>👀 Seen</option>
                            <option value="fixed" ${r.status === 'fixed' ? 'selected' : ''}>✅ Fixed</option>
                            <option value="wontfix" ${r.status === 'wontfix' ? 'selected' : ''}>🚫 Won't Fix</option>
                        </select>
                        <button data-bug-id="${r.id}" class="bug-delete-btn" style="background: #ff4757; color: #fff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem; cursor: pointer; font-weight: bold;" title="Delete this report">🗑️</button>
                    </div>
                </div>
                <p style="color: #d2dae2; font-size: 0.9rem; margin: 0 0 8px 0; white-space: pre-wrap;">${r.description}</p>
                <div style="font-size: 0.75rem; color: #718093;">
                    👤 <strong style="color: #00f2fe;">@${r.username || 'Guest'}</strong>
                    ${r.email ? `(${r.email})` : ''}
                    · 📄 ${r.page || '/'}
                    · 🕐 ${date}
                </div>
            </div>`;
        }).join('');

        // Attach status change listeners
        container.querySelectorAll('.bug-status-select').forEach(sel => {
            sel.addEventListener('change', async (e) => {
                const target = e.target as HTMLSelectElement;
                const bugId = target.dataset.bugId;
                const newStatus = target.value;
                try {
                    await supabase!.from('bug_reports').update({ status: newStatus }).eq('id', bugId);
                    renderAdminBugReports();
                } catch (err) {
                    console.error('Failed to update bug status:', err);
                }
            });
        });

        // Attach delete listeners
        container.querySelectorAll('.bug-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.target as HTMLButtonElement;
                const bugId = target.dataset.bugId;
                try {
                    await supabase!.from('bug_reports').delete().eq('id', bugId);
                    renderAdminBugReports();
                } catch (err) {
                    console.error('Failed to delete bug report:', err);
                }
            });
        });

    } catch (err) {
        console.error('Failed to load bug reports:', err);
        container.innerHTML = '<div style="text-align: center; color: #ff4757; padding: 25px;">Failed to load bug reports.</div>';
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
        // Check if on mobile/tablet
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        if (isMobile) {
            alert('💻 Game Creator is only available on a computer or laptop!\n\nYou need a keyboard and mouse to build 3D games.');
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
            const prof = getCurrentUserProfile();
            if (!isUserAdmin(prof?.email)) {
                return;
            }
            modalAdmin.style.display = 'flex';
            renderAdminUpdatesList();
        });
    }
    if (closeAdminBtn && modalAdmin) {
        closeAdminBtn.addEventListener('click', () => modalAdmin.style.display = 'none');
    }

    // Send Update to Owner Handler
    const btnSendUpdate = document.getElementById('btn-send-update-to-owner');
    const updateTitleInput = document.getElementById('admin-update-title') as HTMLInputElement | null;
    const updateVersionInput = document.getElementById('admin-update-version') as HTMLInputElement | null;
    const updateContentInput = document.getElementById('admin-update-content') as HTMLTextAreaElement | null;
    const updateStatus = document.getElementById('admin-update-status');

    if (btnSendUpdate && updateTitleInput && updateContentInput) {
        btnSendUpdate.addEventListener('click', async () => {
            const title = updateTitleInput.value.trim();
            const version = updateVersionInput?.value.trim() || 'v1.0.0';
            const content = updateContentInput.value.trim();
            const prof = getCurrentUserProfile();

            if (!title) {
                if (updateStatus) {
                    updateStatus.innerText = 'Palun sisesta uuenduse pealkiri!';
                    updateStatus.style.color = '#ff4757';
                }
                return;
            }

            if (!content) {
                if (updateStatus) {
                    updateStatus.innerText = 'Palun sisesta uuenduse sisu / muudatuste kirjeldus!';
                    updateStatus.style.color = '#ff4757';
                }
                return;
            }

            btnSendUpdate.disabled = true;
            if (updateStatus) {
                updateStatus.innerText = 'Saadan uuendust andmebaasi...';
                updateStatus.style.color = '#00f2fe';
            }

            try {
                await yardService.sendUpdateToOwner(title, content, version, prof?.email || 'grx@trenet.ee');
                if (updateStatus) {
                    updateStatus.innerText = '✅ Uuendus edukalt saadetud Playard Ownerile ja salvestatud andmebaasi!';
                    updateStatus.style.color = '#2ecc71';
                }
                updateTitleInput.value = '';
                updateContentInput.value = '';
                await renderAdminUpdatesList();
            } catch (err: any) {
                if (updateStatus) {
                    updateStatus.innerText = 'Viga uuenduse saatmisel: ' + (err?.message || 'Tundmatu viga');
                    updateStatus.style.color = '#ff4757';
                }
            } finally {
                btnSendUpdate.disabled = false;
            }
        });
    }

    // Bug Report Modal
    const modalBugReport = document.getElementById('modal-bug-report');
    const openBugBtn = document.getElementById('btn-open-bug-report');
    const closeBugBtn = document.getElementById('btn-close-bug-report');
    const submitBugBtn = document.getElementById('btn-submit-bug-report');

    if (openBugBtn && modalBugReport) {
        openBugBtn.addEventListener('click', () => {
            modalBugReport.style.display = 'flex';
        });
    }
    if (closeBugBtn && modalBugReport) {
        closeBugBtn.addEventListener('click', () => modalBugReport.style.display = 'none');
    }

    if (submitBugBtn) {
        submitBugBtn.addEventListener('click', async () => {
            const titleInput = document.getElementById('bug-report-title') as HTMLInputElement | null;
            const descInput = document.getElementById('bug-report-description') as HTMLTextAreaElement | null;
            const statusEl = document.getElementById('bug-report-status');
            const title = titleInput?.value.trim() || '';
            const description = descInput?.value.trim() || '';

            if (!title || !description) {
                if (statusEl) { statusEl.innerText = 'Please fill in both title and description!'; statusEl.style.color = '#ff4757'; }
                return;
            }

            if (statusEl) { statusEl.innerText = 'Submitting...'; statusEl.style.color = '#ffd32a'; }

            const prof = getCurrentUserProfile();

            if (supabase) {
                try {
                    const isValidUuid = prof?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prof.id);
                    const { error } = await supabase.from('bug_reports').insert({
                        user_id: isValidUuid ? prof!.id : null,
                        username: prof?.username || 'Guest',
                        email: prof?.email || null,
                        title,
                        description,
                        page: window.location.pathname
                    });
                    if (error) throw error;
                    if (statusEl) { statusEl.innerText = '✅ Bug report submitted! Thank you!'; statusEl.style.color = '#2ecc71'; }
                    if (titleInput) titleInput.value = '';
                    if (descInput) descInput.value = '';
                } catch (err: any) {
                    console.error('Bug report submit error:', err);
                    if (statusEl) { statusEl.innerText = 'Failed to submit. Please try again.'; statusEl.style.color = '#ff4757'; }
                }
            } else {
                // Save locally if no Supabase
                const reports = JSON.parse(localStorage.getItem('playard_bug_reports') || '[]');
                reports.push({ username: prof?.username || 'Guest', email: prof?.email, title, description, page: window.location.pathname, created_at: new Date().toISOString(), status: 'new' });
                localStorage.setItem('playard_bug_reports', JSON.stringify(reports));
                if (statusEl) { statusEl.innerText = '✅ Bug report saved locally! Thank you!'; statusEl.style.color = '#2ecc71'; }
                if (titleInput) titleInput.value = '';
                if (descInput) descInput.value = '';
            }
        });
    }

    // Modal Background Clicks
    window.addEventListener('click', (e) => {
        if (e.target === modalStreak && modalStreak) modalStreak.style.display = 'none';
        if (e.target === modalAdmin && modalAdmin) modalAdmin.style.display = 'none';
        if (e.target === modalBugReport && modalBugReport) modalBugReport.style.display = 'none';
    });
}

// --- Recently Played Games Management & Rendering ---
function formatTimeAgo(timestamp: number): string {
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Äsja mängitud';
    if (mins < 60) return `${mins} min tagasi`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h tagasi`;
    const days = Math.floor(hours / 24);
    return `${days} p tagasi`;
}

function renderRecentlyPlayed() {
    const container = document.getElementById('recently-played-grid');
    if (!container) return;

    const games = yardService.getRecentlyPlayedGames();
    if (!games || games.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; padding: 25px; text-align: center; color: #8899a6; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">Pole veel mänge mängitud. Vali allpool simulaator ja alusta!</div>`;
        return;
    }

    // Always take top 3 (leftmost = index 0 = most recently played)
    const top3 = games.slice(0, 3);

    container.innerHTML = top3.map((game, index) => {
        const isLatest = index === 0;
        const rankLabel = isLatest ? '👑 #1 VIIMATI MÄNGITUD' : (index === 1 ? '🥈 #2 EELMINE' : '🥉 #3 MÄNGITUD');
        const rankBadgeStyle = isLatest
            ? 'background: linear-gradient(135deg, #00f2fe, #4facfe); color: #0b1a2d; font-weight: 900; box-shadow: 0 0 12px rgba(0, 242, 254, 0.4);'
            : (index === 1 ? 'background: rgba(255, 211, 42, 0.18); color: #ffd32a; border: 1px solid rgba(255, 211, 42, 0.4); font-weight: 800;' : 'background: rgba(255, 255, 255, 0.08); color: #a4b0be; border: 1px solid rgba(255, 255, 255, 0.15); font-weight: 700;');

        const cardBorder = isLatest
            ? 'border: 1.5px solid rgba(0, 242, 254, 0.6); box-shadow: 0 12px 32px rgba(0, 242, 254, 0.22); background: linear-gradient(145deg, #162432 0%, #111a24 100%);'
            : 'border: 1px solid rgba(255, 255, 255, 0.08); background: #1e272e;';

        const timeStr = formatTimeAgo(game.lastPlayed);
        const badgeColor = game.badgeColor || '#00f2fe';

        return `
            <a href="${game.url}" class="game-card recently-played-card" data-game-id="${game.id}" style="${cardBorder}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 0.72rem; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.5px; ${rankBadgeStyle}">
                        ${rankLabel}
                    </span>
                    <span style="font-size: 0.78rem; color: #8899a6; display: flex; align-items: center; gap: 4px;">
                        <span>🕒</span>
                        <span>${timeStr}</span>
                    </span>
                </div>
                <h2 style="font-size: 1.45rem; margin-bottom: 8px; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                    <span>${game.title}</span>
                </h2>
                <p style="font-size: 0.9rem; line-height: 1.45; color: #a4b0be; margin-bottom: 16px; min-height: 42px;">${game.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">
                    <div class="reward-tag" style="border-color: ${badgeColor}; color: ${badgeColor}; background: rgba(0, 242, 254, 0.08); font-size: 0.78rem; padding: 4px 10px;">
                        <span>${yardService.renderYardSvg(14)}</span>
                        <span>${game.badgeText || 'Playard'}</span>
                    </div>
                    <span style="font-size: 0.85rem; font-weight: 800; color: #00f2fe; display: flex; align-items: center; gap: 4px;">
                        Mängi uuesti ▶
                    </span>
                </div>
            </a>
        `;
    }).join('');

    // Attach click listeners to update recently played immediately
    container.querySelectorAll('.recently-played-card').forEach(el => {
        el.addEventListener('click', () => {
            const gameId = el.getAttribute('data-game-id');
            const targetGame = top3.find(g => g.id === gameId);
            if (targetGame) {
                yardService.recordPlayedGame(targetGame);
            }
        });
    });
}

function setupGameCardTracking() {
    // Track clicks on official and community cards
    const officialGameMap: Record<string, { id: string; title: string; description: string; url: string; icon: string; badgeText: string; badgeColor: string }> = {
        './games/racing/index.html': {
            id: 'racing',
            title: '🏎️ Racing Simulator',
            description: 'Race high-speed sports cars and motorcycles on challenging circuits against opponents.',
            url: './games/racing/index.html',
            icon: '🏎️',
            badgeText: 'Circuit Racing',
            badgeColor: '#00f2fe'
        },
        './games/cooking/index.html': {
            id: 'cooking',
            title: '🍳 3D Master Chef',
            description: 'Cook burgers, pizzas, and pasta dishes as master chef, satisfy customer orders, and earn Yards!',
            url: './games/cooking/index.html',
            icon: '🍳',
            badgeText: '💎 +20Y to +40Y',
            badgeColor: '#ffd32a'
        },
        './games/war/index.html': {
            id: 'war',
            title: '⚔️ War game',
            description: 'Lead advanced 3D armored combat units, command tactical firepower, defeat enemy forces, and capture strategic zones.',
            url: './games/war/index.html',
            icon: '⚔️',
            badgeText: '🎖️ Combat (+50Y)',
            badgeColor: '#ff4757'
        },
        './games/train/index.html': {
            id: 'train',
            title: '🚂 Rongimäng',
            description: 'Juhi võimsat 3D vedurit mööda maalilist raudteevõrku, vaheta pöörmeid, teeninda jaamu ja teeni Yarde!',
            url: './games/train/index.html',
            icon: '🚂',
            badgeText: '💎 +40Y kuni +100Y',
            badgeColor: '#00f2fe'
        },
        './games/play/index.html': {
            id: 'play',
            title: '🎮 Play Community Games',
            description: 'Play 3D community created games submitted by players.',
            url: './games/play/index.html',
            icon: '🎮',
            badgeText: 'Community Play',
            badgeColor: '#00f2fe'
        }
    };

    document.querySelectorAll<HTMLAnchorElement>('.game-grid a.game-card').forEach(card => {
        if (card.classList.contains('recently-played-card')) return;
        const href = card.getAttribute('href');
        if (href && officialGameMap[href]) {
            card.addEventListener('click', () => {
                yardService.recordPlayedGame(officialGameMap[href]);
            });
        }
    });
}

// Initialise
setupIcons();
setupModals();
renderRecentlyPlayed();
setupGameCardTracking();
renderCommunityGames();

const initialProf = getCurrentUserProfile();
updateAdminControlsVisibility(initialProf?.email);

yardService.subscribe(updateYardDisplay);
setInterval(updateStreakTimerLive, 1000);

window.addEventListener('playard_game_played', () => {
    renderRecentlyPlayed();
});

window.addEventListener('playard_games_updated', () => {
    renderCommunityGames();
    renderAdminReviewGames();
});

window.addEventListener('playard_auth_changed', (e: any) => {
    const profile = e.detail;
    updateAdminControlsVisibility(profile?.email);
    renderRecentlyPlayed();
});
