import { STAGES } from '../catalog';

export class HudManager {
    public formatTime(ms: number): string {
        const totalSec = Math.floor(ms / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const hundredths = Math.floor((ms % 1000) / 10);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
    }

    public showToast(msg: string) {
        const toast = document.createElement('div');
        toast.className = 'toast-notify';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    public showCheckpointBanner(stageIndex: number, isOwner: boolean) {
        const banner = document.getElementById('checkpoint-banner');
        const bannerText = document.getElementById('checkpoint-banner-text');
        if (banner && bannerText) {
            bannerText.textContent = isOwner ? `KONTROLLPUNKT ${stageIndex + 1}/10! (+5 PLAYCOINS)` : `CHECKPOINT ${stageIndex + 1}/10! (+5 PLAYCOINS)`;
            banner.classList.add('show');
            setTimeout(() => banner.classList.remove('show'), 2200);
        }
    }

    public updateHUD(currentStageIndex: number, deaths: number, coins: number, bestTime: number, isOwner: boolean) {
        const stageVal = document.getElementById('hud-stage-val');
        if (stageVal) stageVal.textContent = (currentStageIndex + 1).toString();

        const stageName = document.getElementById('hud-stage-name');
        if (stageName) {
            const stg = STAGES[currentStageIndex];
            stageName.textContent = `(${isOwner ? stg.nameEt : stg.nameEn})`;
        }

        const deathsVal = document.getElementById('hud-deaths-val');
        if (deathsVal) deathsVal.textContent = deaths.toString();

        const coinsVal = document.getElementById('hud-coins-val');
        if (coinsVal) coinsVal.textContent = coins.toString();

        const progressPercent = document.getElementById('hud-progress-percent');
        const progressFill = document.getElementById('stage-progress-fill');
        const pct = Math.round(((currentStageIndex + 1) / STAGES.length) * 100);
        if (progressPercent) progressPercent.textContent = `${pct}%`;
        if (progressFill) progressFill.style.width = `${pct}%`;

        const bestVal = document.getElementById('hud-best-time-val');
        if (bestVal) {
            bestVal.textContent = bestTime > 0 ? this.formatTime(bestTime) : '--:--.--';
        }
    }

    public checkCooldown(): boolean {
        const cooldownUntil = parseInt(localStorage.getItem('playard_obby_cooldown_until') || '0', 10);
        const now = Date.now();
        if (cooldownUntil > now) {
            const overlay = document.getElementById('obby-cooldown-overlay');
            if (overlay) overlay.style.display = 'flex';
            this.updateCooldownTimer(cooldownUntil);
            return true;
        }
        return false;
    }

    public updateCooldownTimer(cooldownUntil: number) {
        const clock = document.getElementById('cooldown-timer-clock');
        const update = () => {
            const remaining = Math.max(0, cooldownUntil - Date.now());
            if (remaining <= 0) {
                const overlay = document.getElementById('obby-cooldown-overlay');
                if (overlay) overlay.style.display = 'none';
                localStorage.removeItem('playard_obby_cooldown_until');
                return;
            }
            const hrs = Math.floor(remaining / (1000 * 60 * 60));
            const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((remaining % (1000 * 60)) / 1000);
            if (clock) {
                clock.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        };
        update();
        setInterval(update, 1000);
    }

    public applyLocalization(isOwner: boolean) {
        const isEt = isOwner;

        const ownerPill = document.getElementById('hud-owner-pill');
        if (ownerPill) {
            ownerPill.style.display = isEt ? 'inline-block' : 'none';
            ownerPill.textContent = '👑 PLAYARD OWNER';
        }

        const stageLabel = document.getElementById('hud-stage-label');
        if (stageLabel) stageLabel.textContent = isEt ? 'Tase:' : 'Stage:';

        const timerLabel = document.getElementById('hud-timer-label');
        if (timerLabel) timerLabel.textContent = isEt ? 'Aeg:' : 'Time:';

        const bestLabel = document.getElementById('hud-best-label');
        if (bestLabel) bestLabel.textContent = isEt ? 'Parim:' : 'Best:';

        const deathsLabel = document.getElementById('hud-deaths-label');
        if (deathsLabel) deathsLabel.textContent = isEt ? 'Kukkumisi:' : 'Falls:';

        const coinsUnit = document.getElementById('hud-coins-unit');
        if (coinsUnit) coinsUnit.textContent = isEt ? 'MÜNTE' : 'COINS';

        const respawnBtn = document.getElementById('btn-respawn');
        const respawnLabel = document.getElementById('btn-respawn-label');
        if (respawnBtn) respawnBtn.title = isEt ? 'Taassünn viimasesse kontrollpunkti (R)' : 'Respawn to checkpoint (R)';
        if (respawnLabel) respawnLabel.textContent = isEt ? 'Taassünn' : 'Respawn';

        const shopBtn = document.getElementById('btn-open-shop');
        const shopLabel = document.getElementById('btn-shop-label');
        if (shopBtn) shopBtn.title = isEt ? 'Obby Pood' : 'Obby Shop';
        if (shopLabel) shopLabel.textContent = isEt ? 'Pood' : 'Shop';

        const stagesBtn = document.getElementById('btn-open-stages');
        const stagesLabel = document.getElementById('btn-stages-label');
        if (stagesBtn) stagesBtn.title = isEt ? 'Vali Tase' : 'Select Stage';
        if (stagesLabel) stagesLabel.textContent = isEt ? 'Tasemed' : 'Stages';

        const camBtn = document.getElementById('btn-toggle-camera');
        if (camBtn) camBtn.title = isEt ? 'Vaheta Kaamerat (V)' : 'Toggle Camera (V)';

        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) soundBtn.title = isEt ? 'Heli sisse/välja' : 'Toggle Sound';

        const helpBtn = document.getElementById('btn-open-help');
        if (helpBtn) helpBtn.title = isEt ? 'Mängujuhis & Klahvid' : 'Instructions & Controls';

        const progressTitle = document.getElementById('hud-progress-title');
        if (progressTitle) progressTitle.textContent = isEt ? 'Takistusraja Edenemine:' : 'Obstacle Course Progress:';

        const touchJumpLabel = document.getElementById('btn-touch-jump-label');
        if (touchJumpLabel) touchJumpLabel.textContent = isEt ? 'Hüppa' : 'Jump';

        const shopTitle = document.getElementById('modal-shop-title');
        if (shopTitle) shopTitle.textContent = isEt ? 'Parkour Obby Pood' : 'Parkour Obby Shop';

        const shopSubtitle = document.getElementById('modal-shop-subtitle');
        if (shopSubtitle) shopSubtitle.textContent = isEt
            ? 'Kasuta teenitud Obby münte oma tegelase välimuse ja võimete kohandamiseks!'
            : 'Use your earned Obby Coins to customize your character appearance and abilities!';

        const headerHats = document.getElementById('shop-header-hats');
        if (headerHats) headerHats.textContent = isEt ? '👑 Mütsid & Peaehted' : '👑 Hats & Headwear';

        const headerTrails = document.getElementById('shop-header-trails');
        if (headerTrails) headerTrails.textContent = isEt ? '✨ Värvilised Efektirajad (Trails)' : '✨ Particle Trails';

        const headerBoots = document.getElementById('shop-header-boots');
        if (headerBoots) headerBoots.textContent = isEt ? '👟 Võimendussaapad (Power Boots)' : '👟 Power Boots';

        const headerSkins = document.getElementById('shop-header-skins');
        if (headerSkins) headerSkins.textContent = isEt ? '🎨 Tegelase Nahavärvid (Skins)' : '🎨 Character Skins';

        const stagesTitle = document.getElementById('modal-stages-title');
        if (stagesTitle) stagesTitle.textContent = isEt ? 'Vali Obby Tase' : 'Select Obby Stage';

        const stagesDesc = document.getElementById('modal-stages-desc');
        if (stagesDesc) stagesDesc.textContent = isEt
            ? 'Vali tase, milleni oled jõudnud või harjuta eelnevaid radu:'
            : 'Select a stage you have reached or practice previous stages:';

        const helpTitle = document.getElementById('modal-help-title');
        if (helpTitle) helpTitle.textContent = isEt ? 'Obby Juhend & Klahvid' : 'Obby Guide & Controls';

        const helpContent = document.getElementById('modal-help-content');
        if (helpContent) {
            helpContent.innerHTML = isEt ? `
                <p><strong>🎮 Juhtimine:</strong></p>
                <ul>
                    <li><strong>W, A, S, D</strong> või <strong>Nooled:</strong> Liikumine</li>
                    <li><strong>Space (Tühik):</strong> Hüpe & <strong>Topelthüpe</strong> (vajuta õhus teist korda)</li>
                    <li><strong>Shift:</strong> Sprint (kiirem jooks)</li>
                    <li><strong>Hiir:</strong> Kaamera pööramine (hoia all ja lohista) & suumiratas</li>
                    <li><strong>V:</strong> Kaameravaate vahetamine (3rd Person / 1st Person)</li>
                    <li><strong>R:</strong> Kiirtaassünd viimasesse kontrollpunkti</li>
                </ul>
                <p><strong>🌟 Reeglid & Preemiad:</strong></p>
                <ul>
                    <li>Astuge helendavale <strong>Kontrollpunkti Plaadile</strong>, et salvestada oma asukoht ja teenida <strong>+5 Yardi</strong>!</li>
                    <li>Vältige punast laavat, laserkiiri ja allakukkumist.</li>
                    <li>Koguge rajal hõljuvaid <strong>kuldmünte</strong>, et osta poest mütse, efekte ja super-hüppesaapaid!</li>
                    <li>Kogu raja läbimisel (10/10) teenid <strong>+100 Yardi</strong> ja kuldse karika!</li>
                </ul>
            ` : `
                <p><strong>🎮 Controls:</strong></p>
                <ul>
                    <li><strong>W, A, S, D</strong> or <strong>Arrow Keys:</strong> Movement</li>
                    <li><strong>Space:</strong> Jump & <strong>Double Jump</strong> (press again in mid-air)</li>
                    <li><strong>Shift:</strong> Sprint (faster run)</li>
                    <li><strong>Mouse:</strong> Look around (drag) & zoom wheel</li>
                    <li><strong>V:</strong> Toggle camera view (3rd Person / 1st Person)</li>
                    <li><strong>R:</strong> Quick respawn to last checkpoint</li>
                </ul>
                <p><strong>🌟 Rules & Rewards:</strong></p>
                <ul>
                    <li>Step on glowing <strong>Checkpoint Pads</strong> to save your spot and earn <strong>+5 Yards</strong>!</li>
                    <li>Dodge red lava, laser beams, and falling into the void.</li>
                    <li>Collect spinning <strong>Gold Coins</strong> along the track to buy hats, trails, and power boots!</li>
                    <li>Conquer all 10 stages (10/10) to earn <strong>+100 Yards</strong> and the golden trophy!</li>
                </ul>
            `;
        }

        const vicTitle = document.getElementById('victory-title');
        if (vicTitle) vicTitle.textContent = isEt ? 'PALJU ÕNNE! OBBY LÄBITUD!' : 'CONGRATULATIONS! OBBY COMPLETED!';

        const vicSubtitle = document.getElementById('victory-subtitle');
        if (vicSubtitle) vicSubtitle.textContent = isEt
            ? 'Oled edukalt vallutanud kõik 10 taset ja jõudnud Taevasesse Tsitadelli!'
            : 'You conquered all 10 stages and reached the Celestial Citadel!';

        const vicTimeLabel = document.getElementById('victory-time-label');
        if (vicTimeLabel) vicTimeLabel.textContent = isEt ? 'Lõpuaeg' : 'Final Time';

        const vicDeathsLabel = document.getElementById('victory-deaths-label');
        if (vicDeathsLabel) vicDeathsLabel.textContent = isEt ? 'Kukkumisi' : 'Falls';

        const vicRewardLabel = document.getElementById('victory-reward-label');
        if (vicRewardLabel) vicRewardLabel.textContent = isEt ? 'Preemia' : 'Reward';

        const vicCooldownText = document.getElementById('victory-cooldown-text');
        if (vicCooldownText) vicCooldownText.textContent = isEt
            ? '⏳ 24h Ooteaeg: Uuesti saab seda rada mängida 24 tunni pärast!'
            : '⏳ 24h Cooldown: You can play this obstacle course again in 24 hours!';

        const vicHubBtnText = document.getElementById('victory-hub-btn-text');
        if (vicHubBtnText) vicHubBtnText.textContent = isEt ? 'Hubi' : 'To Hub';

        const cdTitle = document.getElementById('cooldown-overlay-title');
        if (cdTitle) cdTitle.textContent = isEt ? '24H OOTAEG (COOLDOWN)' : '24H COOLDOWN';

        const cdDesc = document.getElementById('cooldown-overlay-desc');
        if (cdDesc) cdDesc.textContent = isEt
            ? 'Oled Obby takistusraja juba edukalt läbinud! Vastavalt reeglitele saab seda mängu uuesti teha 24h pärast.'
            : 'You have already conquered the Obby course! As per rules, you can play again in 24h.';

        const cdClockLabel = document.getElementById('cooldown-clock-label');
        if (cdClockLabel) cdClockLabel.textContent = isEt ? 'Aega järgmise mänguni:' : 'Time until next play:';
    }
}
