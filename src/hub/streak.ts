import { yardService, YardData } from '../shared/yardService';
import { getCurrentUserProfile, isUserAdminEmail } from '../auth';

let wasCanClaim = false;

export function updateStreakTimerLive() {
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

export function renderStreakCards() {
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
            claimBtn.innerText = `CLAIM DAY ${streakInfo.nextDayIndex} (+${streakInfo.nextRewardAmount} PLAYBUX)`;
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
                ? '🔥 Day 7 Jackpot ready: Claim 500 Playbux now!'
                : `🎁 Day ${streakInfo.nextDayIndex} Streak Reward Ready! (+${streakInfo.nextRewardAmount} Playbux)`;
            statusMsg.style.color = '#00f2fe';
        } else {
            statusMsg.innerText = `Current streak: ${streakInfo.currentStreak} / 7 Days.`;
            statusMsg.style.color = '#a4b0be';
        }
    }

    updateStreakTimerLive();
}

export function updateYardDisplay(data: YardData) {
    const headerVal = document.getElementById('header-yard-val');
    const prof = getCurrentUserProfile();
    const isAdmin = isUserAdminEmail(prof?.email);
    
    if (headerVal) {
        headerVal.innerText = isAdmin ? '∞' : data.yards.toLocaleString();
    }

    updateStreakTimerLive();
    renderStreakCards();
}
