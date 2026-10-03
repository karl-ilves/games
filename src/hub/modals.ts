import { yardService } from '../shared/yardService';
import { supabase } from '../lib/supabase';
import { getCurrentUserProfile, isUserAdmin } from '../auth';
import { renderStreakCards, updateStreakTimerLive } from './streak';
import { renderAdminUpdatesList } from './adminPanel';
import { renderDatabaseGamesList } from './communityGames';

export function setupModals() {
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
        closeStreakBtn.addEventListener('click', () => { modalStreak.style.display = 'none'; });
    }

    // Crown Obby Coming Soon Modal & Passcode Unlock (133731)
    const closeCrownBtn = document.getElementById('btn-close-crown-coming-soon');
    const crownModal = document.getElementById('modal-crown-coming-soon');
    const homeCrownPassInput = document.getElementById('home-crown-passcode-input') as HTMLInputElement | null;
    const homeCrownPassBtn = document.getElementById('btn-submit-home-crown-passcode');
    const homeCrownPassErr = document.getElementById('home-crown-passcode-error');

    const tryHomeCrownUnlock = () => {
        const val = homeCrownPassInput?.value.trim() || '';
        if (val === '133731') {
            try {
                sessionStorage.setItem('crown_passcode_unlocked', 'true');
            } catch (e) {}
            if (crownModal) crownModal.style.display = 'none';
            window.location.href = './games/crown/index.html';
        } else {
            if (homeCrownPassErr) {
                homeCrownPassErr.textContent = 'Better luck next time 😂';
                homeCrownPassErr.style.display = 'block';
            }
            if (homeCrownPassInput) {
                homeCrownPassInput.style.borderColor = '#ff4757';
                homeCrownPassInput.value = '';
                homeCrownPassInput.focus();
            }
        }
    };

    if (closeCrownBtn && crownModal) {
        closeCrownBtn.addEventListener('click', () => {
            crownModal.style.display = 'none';
            if (homeCrownPassErr) homeCrownPassErr.style.display = 'none';
        });
    }
    homeCrownPassBtn?.addEventListener('click', tryHomeCrownUnlock);
    homeCrownPassInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryHomeCrownUnlock();
    });

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
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        if (isMobile) {
            alert('💻 Game Creator is only available on a computer or laptop!\n\nYou need a keyboard and mouse to build 3D games.');
            return;
        }
        window.location.href = './games/creator/index.html';
    };

    document.getElementById('btn-create-game')?.addEventListener('click', handleCreateGameClick);
    document.getElementById('btn-hub-create-game')?.addEventListener('click', handleCreateGameClick);

    // 6. Admin Panel & Database Modal
    const modalAdmin = document.getElementById('modal-admin-panel');
    const openAdminBtn = document.getElementById('btn-open-admin-panel');
    const closeAdminBtn = document.getElementById('btn-close-admin-panel');

    const modalDatabase = document.getElementById('modal-database-panel');
    const openDatabaseBtn = document.getElementById('btn-open-database-panel');
    const closeDatabaseBtn = document.getElementById('btn-close-database-panel');

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
        closeAdminBtn.addEventListener('click', () => { modalAdmin.style.display = 'none'; });
    }

    if (openDatabaseBtn && modalDatabase) {
        openDatabaseBtn.addEventListener('click', () => {
            const prof = getCurrentUserProfile();
            if (!isUserAdmin(prof?.email)) {
                return;
            }
            modalDatabase.style.display = 'flex';
            renderDatabaseGamesList();
        });
    }
    if (closeDatabaseBtn && modalDatabase) {
        closeDatabaseBtn.addEventListener('click', () => { modalDatabase.style.display = 'none'; });
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
        closeBugBtn.addEventListener('click', () => { modalBugReport.style.display = 'none'; });
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

            try {
                const reports = JSON.parse(localStorage.getItem('playard_bug_reports') || '[]');
                reports.push({
                    username: prof?.username || 'Guest',
                    email: prof?.email || null,
                    title,
                    description,
                    page: window.location.pathname,
                    created_at: new Date().toISOString(),
                    status: 'new'
                });
                localStorage.setItem('playard_bug_reports', JSON.stringify(reports));
            } catch (e) {}

            const isTest = typeof window !== 'undefined' && ((window as any).__PLAYARD_TEST_MODE__ || navigator.webdriver);
            if (supabase && !isTest) {
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
                    if (error) {
                        console.error('Supabase bug report insert error:', error);
                        throw error;
                    }
                    if (statusEl) { statusEl.innerText = '✅ Bug report submitted! Thank you!'; statusEl.style.color = '#2ecc71'; }
                    if (titleInput) titleInput.value = '';
                    if (descInput) descInput.value = '';
                } catch (err: any) {
                    console.error('Bug report submit error:', err);
                    if (statusEl) { statusEl.innerText = '✅ Bug report saved! Thank you!'; statusEl.style.color = '#2ecc71'; }
                    if (titleInput) titleInput.value = '';
                    if (descInput) descInput.value = '';
                }
            } else {
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
