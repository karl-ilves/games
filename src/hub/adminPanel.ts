import { supabase } from '../lib/supabase';
import { getCurrentUserProfile, isUserAdmin, isPlayardOwner } from '../auth';
import { yardService } from '../shared/yardService';
import { setLanguage } from '../shared/i18n';
import { renderRecentlyPlayed } from './recentlyPlayed';
import { updateGameAgeRestrictions } from './ageRestrictions';

export function updateAdminControlsVisibility(userEmail?: string | null, username?: string | null) {
    const adminStreakControls = document.getElementById('streak-admin-controls');
    const adminNavBtn = document.getElementById('btn-open-admin-panel');
    const dbNavBtn = document.getElementById('btn-open-database-panel');
    
    const prof = getCurrentUserProfile();
    const emailToCheck = userEmail !== undefined ? userEmail : prof?.email;
    const usernameToCheck = username !== undefined ? username : prof?.username;

    const showAdminPanel = isUserAdmin(emailToCheck);
    const isEstonian = isPlayardOwner(emailToCheck);

    if (adminStreakControls) {
        adminStreakControls.style.display = showAdminPanel ? 'flex' : 'none';
    }
    
    if (adminNavBtn) {
        adminNavBtn.style.display = showAdminPanel ? 'flex' : 'none';
    }
    
    if (dbNavBtn) {
        dbNavBtn.style.display = showAdminPanel ? 'flex' : 'none';
    }
    const btnOpenStreak = document.getElementById('btn-open-streak');
    if (btnOpenStreak) {
        btnOpenStreak.style.display = showAdminPanel ? 'none' : 'flex';
    }
    
    // War game on avaldatud KÕIKIDELE mängijatele
    const warGameCard = document.getElementById('card-war-game');
    if (warGameCard) warGameCard.style.display = 'flex';

    // Rongimäng on avaldatud KÕIKIDELE mängijatele
    const trainGameCard = document.getElementById('card-train-game');
    if (trainGameCard) trainGameCard.style.display = 'flex';

    // Obby (Takistusrada) mäng on avaldatud KÕIKIDELE mängijatele!
    const obbyGameCard = document.getElementById('card-obby-game');
    if (obbyGameCard) {
        obbyGameCard.style.display = 'flex';
        const cooldownUntil = parseInt(localStorage.getItem('playard_obby_cooldown_until') || '0', 10);
        const cooldownBadge = document.getElementById('card-obby-cooldown-badge');
        if (cooldownUntil > Date.now()) {
            const remaining = cooldownUntil - Date.now();
            const hrs = Math.floor(remaining / (1000 * 60 * 60));
            const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            if (cooldownBadge) {
                cooldownBadge.textContent = isEstonian ? `⏳ 24h Ooteaeg (${hrs}h ${mins}m)` : `⏳ 24h Cooldown (${hrs}h ${mins}m)`;
                cooldownBadge.style.display = 'inline-block';
            }
        } else if (cooldownBadge) {
            cooldownBadge.style.display = 'none';
        }
    }

    // LAST METRO mäng on nähtav KÕIKIDELE mängijatele!
    const metroGameCard = document.getElementById('card-metro-game');
    if (metroGameCard) metroGameCard.style.display = 'flex';

    // MMP1 (Murder Mystery) mäng on nähtav KÕIKIDELE mängijatele!
    const mmp1GameCard = document.getElementById('card-mmp1-game');
    if (mmp1GameCard) mmp1GameCard.style.display = 'flex';

    // ROCKET PLAYARD mäng on avaldatud KÕIKIDELE mängijatele!
    const rocketGameCard = document.getElementById('card-rocket-game');
    if (rocketGameCard) rocketGameCard.style.display = 'flex';

    // CityCar avalik ja nähtav kõigile
    const cityCarCard = document.getElementById('card-citycar-game');
    if (cityCarCard) cityCarCard.style.display = 'flex';

    // 2D Maa Kaitsja (Earth Defender) avalik ja nähtav kõigile
    const defenderCard = document.getElementById('card-defender-game');
    if (defenderCard) defenderCard.style.display = 'flex';

    // Switch language: English for all users across Playard!
    setLanguage('en');
    renderRecentlyPlayed();
    updateGameAgeRestrictions();
}

export async function renderAdminUpdatesList() {
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

export async function renderAdminBugReports() {
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

export function renderAdminAiLogs() {
    const listContainer = document.getElementById('admin-ai-logs-list');
    const countBadge = document.getElementById('admin-ai-logs-count-badge');
    if (!listContainer) return;

    const logs: any[] = yardService.getAiAuditLogs();
    if (countBadge) countBadge.textContent = `${logs.length} logi`;

    if (!logs || logs.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; color: #718093; padding: 20px;">Playard AI logisid pole veel salvestatud.</div>';
        return;
    }

    listContainer.innerHTML = '';
    const sorted = [...logs].sort((a: any, b: any) => b.timestamp - a.timestamp);
    for (const log of sorted) {
        const dateStr = new Date(log.timestamp).toLocaleString();
        const statusColor = log.status === 'blocked' ? '#ef4444' : (log.status === 'error' ? '#f59e0b' : '#10b981');
        const statusIcon = log.status === 'blocked' ? '🛡️' : (log.status === 'error' ? '⚠️' : '✅');
        const item = document.createElement('div');
        item.style.cssText = 'background: #1e293b; border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.85rem;">${statusIcon}</span>
                    <strong style="color: #e2e8f0; font-size: 0.9rem;">${log.intent}</strong>
                    <span style="color: ${statusColor}; font-size: 0.75rem; font-weight: 700; background: ${statusColor}20; padding: 2px 8px; border-radius: 4px;">${log.status?.toUpperCase()}</span>
                </div>
                <span style="font-size: 0.7rem; color: #64748b;">${dateStr}</span>
            </div>
            <div style="font-size: 0.82rem; color: #94a3b8; padding: 4px 0;">
                <strong>Kasutaja:</strong> <span style="color: #38bdf8;">${log.username}</span>
                ${log.gameTitle ? ` · <strong>Mäng:</strong> <span style="color: #ffd32a;">${log.gameTitle}</span>` : ''}
            </div>
            <div style="font-size: 0.8rem; color: #cbd5e1; background: #131920; padding: 6px 8px; border-radius: 4px; word-break: break-word;">"${log.prompt}"</div>
            ${log.violations && log.violations.length > 0 ? `<div style="font-size: 0.75rem; color: #ef4444; margin-top: 2px;">⚠️ ${log.violations.join(', ')}</div>` : ''}
        `;
        listContainer.appendChild(item);
    }
}

export function setupAdminPanel() {
    const tabAdminUpdates = document.getElementById('tab-admin-updates');
    const tabAdminAiLogs = document.getElementById('tab-admin-ai-logs');
    const adminUpdatesSection = document.getElementById('admin-updates-section');
    const adminAiLogsSection = document.getElementById('admin-ai-logs-section');

    if (tabAdminUpdates && tabAdminAiLogs && adminUpdatesSection && adminAiLogsSection) {
        tabAdminUpdates.addEventListener('click', () => {
            adminUpdatesSection.style.display = 'block';
            adminAiLogsSection.style.display = 'none';
            tabAdminUpdates.style.background = 'rgba(255, 211, 42, 0.2)';
            tabAdminUpdates.style.borderColor = '#ffd32a';
            tabAdminAiLogs.style.background = 'rgba(56, 189, 248, 0.1)';
            tabAdminAiLogs.style.borderColor = 'rgba(56, 189, 248, 0.3)';
        });
        tabAdminAiLogs.addEventListener('click', () => {
            adminUpdatesSection.style.display = 'none';
            adminAiLogsSection.style.display = 'flex';
            tabAdminAiLogs.style.background = 'rgba(56, 189, 248, 0.2)';
            tabAdminAiLogs.style.borderColor = '#38bdf8';
            tabAdminUpdates.style.background = 'rgba(255, 211, 42, 0.1)';
            tabAdminUpdates.style.borderColor = 'rgba(255, 211, 42, 0.3)';
            renderAdminAiLogs();
        });
    }

    window.addEventListener('playard_ai_logs_updated', () => {
        if (adminAiLogsSection && adminAiLogsSection.style.display !== 'none') {
            renderAdminAiLogs();
        }
    });

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
}
