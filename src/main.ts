import { initAuth } from './auth';
import { yardService, YardData } from './shared/yardService';

console.log("Playard Hub Loaded.");
initAuth();

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

// --- Setup Modal Event Listeners ---
function setupModals() {
    const modalStreak = document.getElementById('modal-streak');
    const openStreakBtn = document.getElementById('btn-open-streak');
    const closeStreakBtn = document.getElementById('btn-close-streak');

    if (openStreakBtn && modalStreak) {
        openStreakBtn.addEventListener('click', () => {
            modalStreak.style.display = 'flex';
            renderStreakCards();
            updateStreakTimerLive();
        });
    }
    if (closeStreakBtn && modalStreak) {
        closeStreakBtn.addEventListener('click', () => modalStreak.style.display = 'none');
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalStreak && modalStreak) modalStreak.style.display = 'none';
    });

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

    const resetAllBtn = document.getElementById('btn-reset-all-data');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all Yards and game progress to 0?')) {
                await yardService.resetAll();
                alert('✅ All progress and Yards have been completely reset!');
                location.reload();
            }
        });
    }
}

// Initialise
setupIcons();
setupModals();
yardService.subscribe(updateYardDisplay);
setInterval(updateStreakTimerLive, 1000);
