import * as THREE from 'three';
import { Team, UnitClass, ActiveWeapon, CombatUnit } from '../types';
import { WarGameState } from '../state/warState';
import { warAudio } from '../audio';
import { getCurrentUserProfile } from '../../../auth';

export class WarHud {
    private state: WarGameState;
    public radarCanvas: HTMLCanvasElement | null = null;
    public radarCtx: CanvasRenderingContext2D | null = null;
    public radarSweepAngle = 0;

    constructor(state: WarGameState) {
        this.state = state;
    }

    public initRadar(onRadarClick?: (worldX: number, worldZ: number) => void) {
        this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
        if (this.radarCanvas) {
            this.radarCtx = this.radarCanvas.getContext('2d');
            this.radarCanvas.style.cursor = 'pointer';
            this.radarCanvas.addEventListener('pointerdown', (e) => {
                if (!this.radarCanvas || !onRadarClick) return;
                const rect = this.radarCanvas.getBoundingClientRect();
                const clickX = (e.clientX - rect.left) / rect.width;
                const clickY = (e.clientY - rect.top) / rect.height;
                const nx = (clickX - 0.5) / 0.425;
                const ny = (clickY - 0.5) / 0.425;
                const worldX = nx * 380;
                const worldZ = ny * 380;
                onRadarClick(worldX, worldZ);
            });
        }
    }

    public applyWarLocalization(connectedHumanCount: number) {
        const isEt = this.state.isOwnerLang;
        document.title = isEt ? 'Playard Games - War Game (10v10 Lahing)' : 'Playard Games - 3D War Simulator (10v10 Battle)';

        const serverEl = document.getElementById('server-players-count');
        if (serverEl) {
            serverEl.innerText = isEt
                ? `${Math.min(20, connectedHumanCount)} / 20 Mängijat (10v10 Lahing)`
                : `${Math.min(20, connectedHumanCount)} / 20 Players (10v10 Battle)`;
        }

        const btnLoadout = document.getElementById('btn-open-loadout');
        if (btnLoadout) btnLoadout.innerText = isEt ? '⚔️ Vali Tiim / Roll' : '⚔️ Choose Team / Role';

        const btnSound = document.getElementById('btn-sound-toggle');
        if (btnSound) btnSound.innerText = isEt ? (warAudio.getMuted() ? '🔇 Vaigistatud' : '🔊 Heli') : (warAudio.getMuted() ? '🔇 Muted' : '🔊 Sound');

        const btnHelp = document.getElementById('btn-open-help');
        if (btnHelp) btnHelp.innerText = isEt ? '❓ Abi' : '❓ Help';

        const ammoCannon = document.getElementById('ammo-cannon');
        if (ammoCannon) ammoCannon.innerText = isEt ? '∞ Mürsud' : '∞ Shells';

        const reloadLabel = document.getElementById('unit-reload-label');
        if (reloadLabel) reloadLabel.innerText = isEt ? '⏳ LAADIMINE' : '⏳ RELOAD';

        // Deploy Modal
        const deployTitle = document.getElementById('deploy-modal-title');
        if (deployTitle) deployTitle.textContent = isEt ? '⚔️ VALI TIIM JA LAHINGUROLL' : '⚔️ SELECT TEAM & COMBAT CLASS';

        const deployDesc = document.getElementById('deploy-modal-desc');
        if (deployDesc) deployDesc.textContent = isEt
            ? 'Vali oma meeskond ja kas soovid juhtida rasket lahingutanki või liikuvat jalaväelast!'
            : 'Choose your team and whether to command a heavy battle tank or a nimble frontline soldier!';

        const deployMoneyLabel = document.getElementById('deploy-money-label');
        if (deployMoneyLabel) deployMoneyLabel.textContent = isEt ? '💰 SINU MÄNGURAHA:' : '💰 YOUR BALANCE:';

        const step1 = document.getElementById('deploy-step-1-label');
        if (step1) step1.textContent = isEt ? '1. Vali Tiim:' : '1. Select Team:';

        const blueName = document.querySelector('#btn-select-blue .team-select-title');
        if (blueName) blueName.textContent = isEt ? 'SININE TIIM' : 'BLUE TEAM';
        const blueDesc = document.querySelector('#btn-select-blue .team-select-desc');
        if (blueDesc) blueDesc.textContent = isEt ? 'Lõuna baas (South Base)' : 'South Base';

        const redName = document.querySelector('#btn-select-red .team-select-title');
        if (redName) redName.textContent = isEt ? 'PUNANE TIIM' : 'RED TEAM';
        const redDesc = document.querySelector('#btn-select-red .team-select-desc');
        if (redDesc) redDesc.textContent = isEt ? 'Põhja baas (North Base)' : 'North Base';

        const missileTeamName = document.querySelector('#btn-select-missile-team .team-select-title');
        if (missileTeamName) missileTeamName.textContent = isEt ? 'RAKETITIIM' : 'MISSILE TEAM';
        const missileTeamDesc = document.querySelector('#btn-select-missile-team .team-select-desc');
        if (missileTeamDesc) missileTeamDesc.textContent = isEt ? 'Raketibaasi juhtimiskeskus' : 'Command Silo Base';

        const step2 = document.getElementById('deploy-step-2-label');
        if (step2) step2.textContent = isEt ? '2. Vali Roll / Üksus:' : '2. Select Class / Unit:';

        const tankTitle = document.querySelector('#btn-select-tank .class-select-title');
        if (tankTitle) tankTitle.textContent = isEt ? 'LAHINGTANK' : 'BATTLE TANK';
        const tankDesc = document.querySelector('#btn-select-tank .class-select-desc');
        if (tankDesc) tankDesc.textContent = isEt ? '100 HP · Raske Kahur · Suur Plahvatusjõud' : '100 HP · Heavy Cannon · Massive Blast Radius';

        const humanTitle = document.querySelector('#btn-select-human .class-select-title');
        if (humanTitle) humanTitle.textContent = isEt ? 'INIMENE / SÕDUR' : 'INFANTRY SOLDIER';
        const humanDesc = document.querySelector('#btn-select-human .class-select-desc');
        if (humanDesc) humanDesc.textContent = isEt ? '50 HP · Kiire Liikumine · Automaat & Granaat' : '50 HP · High Mobility · Assault Rifle & Grenade';

        const planeTitle = document.querySelector('#btn-select-plane .class-select-title');
        if (planeTitle) planeTitle.textContent = isEt ? 'LAHINGULENNUK' : 'FIGHTER JET';
        const planeDesc = document.querySelector('#btn-select-plane .class-select-desc');
        if (planeDesc) planeDesc.textContent = isEt ? '150 HP · Lennukipommid' : '150 HP · Air Bombs';

        const missileTitle = document.querySelector('#btn-select-missile .class-select-title');
        if (missileTitle) missileTitle.textContent = isEt ? 'RAKETITIIM' : 'MISSILE TEAM';
        const missileDesc = document.querySelector('#btn-select-missile .class-select-desc');
        if (missileDesc) missileDesc.textContent = isEt ? '10s Raketid & 60s Nuke' : '10s Missiles & 60s Nuke';

        const btnConfirm = document.getElementById('btn-confirm-deploy');
        if (btnConfirm) btnConfirm.textContent = isEt ? '🚀 SUUNDU LAHINGUVÄLJALE (DEPLOY)' : '🚀 PLAY / DEPLOY TO BATTLEFIELD';

        // Respawn Overlay
        const respawnTitle = document.getElementById('respawn-title');
        if (respawnTitle) respawnTitle.textContent = isEt ? '💥 ÜKSUS HÄVITATUD!' : '💥 UNIT DESTROYED!';
        const respawnDesc = document.getElementById('respawn-desc');
        if (respawnDesc) respawnDesc.textContent = isEt ? 'Taassünd baasis uue soomusega:' : 'Respawning at base with fresh armor in:';

        // Help Modal
        const helpTitle = document.getElementById('help-modal-title');
        if (helpTitle) helpTitle.textContent = isEt ? '🎮 War Game - Juhised & Reeglid' : '🎮 War Game - Controls & Rules';

        const helpContent = document.getElementById('help-modal-content');
        if (helpContent) {
            helpContent.innerHTML = isEt ? `
                <div><strong style="color: #00f2fe;">W / A / S / D:</strong> Liikumine (Tank, Sõdur, Lennuk või Raketijuht)</div>
                <div><strong style="color: #ffd32a;">Hiir:</strong> Torni või relva sihtimine (360 kraadi)</div>
                <div><strong style="color: #ffd32a;">Klahv 1 / 2 / 3 / 4 / 5:</strong> Relva vahetamine (1: Kahur, 2: MG/Pommid, 3: Airstrike, 4: Rakett (10s), 5: Tuumapomm (60s))</div>
                <div><strong style="color: #ff4757;">Vasak hiireklõps / Tühik:</strong> Tulistab valitud aktiivset relva!</div>
                <div><strong style="color: #2ed573;">🚀 Raketirünnak (10s vahega):</strong> Satelliidisihtimisega täppislöök 10-sekundilise vahega!</div>
                <div><strong style="color: #ff4757;">☢️ Tuumapomm (60s loendus):</strong> 4 korda suurema hävitava plahvatusraadiusega tuumarünnak!</div>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                <div><strong style="color: #ffd32a;">✈️ Lahingulennuk (50,000 €):</strong> Ava võimas ülehelikiirusega lennuk 50,000 € mänguraha eest!</div>
                <div><strong style="color: #ffd32a;">💥 Leviv Plahvatus:</strong> Plahvatused tekitavad leviva lööklaine, mis kahjustab kõiki objekte levialas!</div>
                <div><strong style="color: #00f2fe;">👥 Mängijate loogika:</strong> Mängus on eepiline 10v10 lahing (kokku 20 võitlejat: 10 Sinist vs 10 Punast). Kui oled üksi serveris, on Sinu tiimis 9 AI-d ja vastasel 10 AI-d!</div>
            ` : `
                <div><strong style="color: #00f2fe;">W / A / S / D:</strong> Movement (Tank, Soldier, Fighter Jet, or Missile Commander)</div>
                <div><strong style="color: #ffd32a;">Mouse:</strong> Turret & weapon aiming (360 degrees)</div>
                <div><strong style="color: #ffd32a;">Keys 1-5:</strong> Switch weapon (1: Cannon, 2: MG/Air Bombs, 3: Airstrike, 4: Missile (10s), 5: Nuke (60s))</div>
                <div><strong style="color: #ff4757;">Left Click / Space:</strong> Fire selected active weapon!</div>
                <div><strong style="color: #2ed573;">🚀 Missile Strike (10s Cooldown):</strong> Tactical satellite strike with 10s cooldown!</div>
                <div><strong style="color: #ff4757;">☢️ Nuclear Strike (60s Timer):</strong> Cataclysmic nuclear strike with 4x blast radius!</div>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                <div><strong style="color: #ffd32a;">✈️ Fighter Jet (50,000 €):</strong> Unlock supersonic combat jet with 50,000 € War Cash!</div>
                <div><strong style="color: #ffd32a;">💥 Spreading Blast:</strong> Explosions unleash expanding shockwaves damaging everything in radius!</div>
                <div><strong style="color: #00f2fe;">👥 10v10 Combat Roster:</strong> Massive 10v10 warfare (20 total units: 10 Blue vs 10 Red). When alone in server, 19 named AI combatants deploy automatically!</div>
            `;
        }

        const btnRestart = document.getElementById('btn-restart-match');
        if (btnRestart) btnRestart.innerText = isEt ? '🔄 Uus Lahing' : '🔄 New Battle';
        const finalKillsLabel = document.getElementById('final-kills-label');
        if (finalKillsLabel) finalKillsLabel.innerText = isEt ? 'Sinu Tapmised:' : 'Your Kills:';
        const finalMoneyLabel = document.getElementById('final-money-label');
        if (finalMoneyLabel) finalMoneyLabel.innerText = isEt ? 'Teenitud Mänguraha:' : 'War Cash Earned:';
    }

    public updateTeamBadge(onSelectWeapon?: (w: ActiveWeapon) => void) {
        const badge = document.getElementById('player-team-badge');
        const nameEl = document.getElementById('player-team-name');
        const hpLabel = document.getElementById('unit-hp-label');
        const weapon1Name = document.getElementById('weapon-name-1');
        const weapon1Icon = document.getElementById('weapon-icon-1');
        const weapon2Name = document.getElementById('weapon-name-2');
        const weapon2Icon = document.getElementById('weapon-icon-2');

        const roleIcon = this.state.localClass === 'plane'
            ? (this.state.isOwnerLang ? '✈️ LAHINGULENNUK' : '✈️ FIGHTER JET')
            : this.state.localClass === 'missile'
                ? (this.state.isOwnerLang ? '🚀 RAKETIJUHT' : '🚀 MISSILE COMMANDER')
                : this.state.localClass === 'tank'
                    ? '🏎️ TANK'
                    : (this.state.isOwnerLang ? '🏃 INIMENE (SÕDUR)' : '🏃 SOLDIER');

        const youAreLabel = this.state.isOwnerLang ? 'OLED:' : 'YOU ARE:';
        const youAreSpan = badge?.querySelector('span');
        if (youAreSpan) youAreSpan.innerText = youAreLabel;

        if (badge && nameEl) {
            const teamLabel = this.state.localTeam === 'red' ? '🔴 RED TEAM' : '🔵 BLUE TEAM';
            if (this.state.localTeam === 'red') {
                badge.className = 'team-red';
                badge.style.borderColor = '#e74c3c';
            } else {
                badge.className = 'team-blue';
                badge.style.borderColor = '#3498db';
            }

            if (this.state.localClass === 'missile') {
                const missileRole = this.state.isOwnerLang ? '🚀 RAKETITIIM' : '🚀 MISSILE TEAM';
                nameEl.innerText = `${teamLabel} · ${missileRole} · ${this.state.localUsername}`;
            } else {
                nameEl.innerText = `${teamLabel} · ${roleIcon} · ${this.state.localUsername}`;
            }
        }

        if (hpLabel) {
            hpLabel.innerText = this.state.localClass === 'plane'
                ? (this.state.isOwnerLang ? '🛡️ LENNUKI SOOMUS (HP)' : '🛡️ JET ARMOR (HP)')
                : this.state.localClass === 'tank'
                    ? (this.state.isOwnerLang ? '🛡️ SOOMUS (HP)' : '🛡️ ARMOR (HP)')
                    : (this.state.isOwnerLang ? '❤️ ELUD (HP)' : '❤️ HEALTH (HP)');
        }
        if (weapon1Name && weapon1Icon) {
            weapon1Name.innerText = this.state.localClass === 'plane'
                ? (this.state.isOwnerLang ? 'VULCAN KAHUR' : 'VULCAN CANNON')
                : this.state.localClass === 'missile'
                    ? (this.state.isOwnerLang ? 'RAKETT (10s)' : 'MISSILE (10s)')
                    : this.state.localClass === 'tank'
                        ? (this.state.isOwnerLang ? 'KAHUR' : 'CANNON')
                        : (this.state.isOwnerLang ? 'AUTOMAAT' : 'RIFLE');
            weapon1Icon.innerText = this.state.localClass === 'plane' ? '🚀' : this.state.localClass === 'missile' ? '🚀' : this.state.localClass === 'tank' ? '🚀' : '🔫';
        }
        if (weapon2Name && weapon2Icon) {
            weapon2Name.innerText = this.state.localClass === 'plane'
                ? (this.state.isOwnerLang ? 'LENNUKIPOMMID' : 'AIR BOMBS')
                : this.state.localClass === 'missile'
                    ? (this.state.isOwnerLang ? 'TUUMAPOMM (60s)' : 'NUKE (60s)')
                    : this.state.localClass === 'tank'
                        ? 'MG-42'
                        : (this.state.isOwnerLang ? 'GRANAAT' : 'GRENADE');
            weapon2Icon.innerText = this.state.localClass === 'plane' ? '💣' : this.state.localClass === 'missile' ? '☢️' : this.state.localClass === 'tank' ? '🔫' : '💣';
        }

        const cannonCard = document.getElementById('weapon-cannon');
        const mgCard = document.getElementById('weapon-mg');
        const airstrikeCard = document.getElementById('weapon-airstrike');
        const missileCard = document.getElementById('weapon-missile');
        const nukeCard = document.getElementById('weapon-nuke');

        if (this.state.localClass === 'missile') {
            if (cannonCard) cannonCard.style.display = 'none';
            if (mgCard) mgCard.style.display = 'none';
            if (airstrikeCard) airstrikeCard.style.display = 'none';
            if (missileCard) missileCard.style.display = 'flex';
            if (nukeCard) nukeCard.style.display = 'flex';
            if (this.state.activeWeapon !== 'missile' && this.state.activeWeapon !== 'nuke' && onSelectWeapon) {
                onSelectWeapon('missile');
            }
        } else {
            if (cannonCard) cannonCard.style.display = 'flex';
            if (mgCard) mgCard.style.display = 'flex';
            if (airstrikeCard) airstrikeCard.style.display = this.state.localClass === 'plane' ? 'none' : 'flex';
            if (missileCard) missileCard.style.display = 'none';
            if (nukeCard) nukeCard.style.display = 'none';
            if ((this.state.activeWeapon === 'missile' || this.state.activeWeapon === 'nuke') && onSelectWeapon) {
                onSelectWeapon('cannon');
            }
        }
    }

    public updateHUD(localUnit: CombatUnit | undefined, isAirstrikeTargeting: boolean) {
        const redScoreEl = document.getElementById('team-red-score');
        const blueScoreEl = document.getElementById('team-blue-score');
        const hpText = document.getElementById('hp-text');
        const hpBar = document.getElementById('hp-bar');
        const reloadText = document.getElementById('reload-text');
        const reloadBar = document.getElementById('reload-bar');
        const statKills = document.getElementById('stat-kills');
        const statMoney = document.getElementById('stat-money');
        const ammoMg = document.getElementById('ammo-mg');
        const cdAirstrike = document.getElementById('cooldown-airstrike');

        if (redScoreEl) redScoreEl.innerText = this.state.redScore.toString();
        if (blueScoreEl) blueScoreEl.innerText = this.state.blueScore.toString();

        if (hpText && hpBar && localUnit) {
            hpText.innerText = `${Math.round(localUnit.hp)} / ${localUnit.maxHp}`;
            const pct = Math.max(0, (localUnit.hp / localUnit.maxHp) * 100);
            hpBar.style.width = `${pct}%`;
        }

        if (reloadText && reloadBar) {
            if (this.state.activeWeapon === 'cannon') {
                if (this.state.primaryReloadTimer > 0) {
                    reloadText.innerText = `${this.state.primaryReloadTimer.toFixed(1)}s`;
                    const pct = ((this.state.primaryReloadTime - this.state.primaryReloadTimer) / this.state.primaryReloadTime) * 100;
                    reloadBar.style.width = `${pct}%`;
                } else {
                    reloadText.innerText = this.state.isOwnerLang ? 'VALMIS' : 'READY';
                    reloadBar.style.width = '100%';
                }
            } else if (this.state.activeWeapon === 'mg') {
                if (this.state.localClass === 'soldier') {
                    if (this.state.secondaryReloadTimer > 0) {
                        reloadText.innerText = `${this.state.secondaryReloadTimer.toFixed(1)}s`;
                        const pct = ((3.5 - this.state.secondaryReloadTimer) / 3.5) * 100;
                        reloadBar.style.width = `${pct}%`;
                    } else {
                        reloadText.innerText = this.state.isOwnerLang ? 'GRANAAT VALMIS' : 'GRENADE READY';
                        reloadBar.style.width = '100%';
                    }
                } else {
                    reloadText.innerText = this.state.mgAmmo > 0 ? `${this.state.mgAmmo} RDS` : (this.state.isOwnerLang ? 'TÜHI' : 'EMPTY');
                    reloadBar.style.width = `${Math.max(0, (this.state.mgAmmo / 500) * 100)}%`;
                }
            } else if (this.state.activeWeapon === 'airstrike') {
                if (this.state.airstrikeCooldown > 0) {
                    reloadText.innerText = `${Math.ceil(this.state.airstrikeCooldown)}s`;
                    const pct = ((25.0 - this.state.airstrikeCooldown) / 25.0) * 100;
                    reloadBar.style.width = `${pct}%`;
                } else {
                    reloadText.innerText = isAirstrikeTargeting
                        ? (this.state.isOwnerLang ? '📍 SIHI & KLÕPSA' : '📍 TARGET & CLICK')
                        : (this.state.isOwnerLang ? 'VALMIS' : 'READY');
                    reloadBar.style.width = '100%';
                }
            } else if (this.state.activeWeapon === 'missile') {
                reloadText.innerText = this.state.missileCooldown > 0 ? `🚀 ${Math.ceil(this.state.missileCooldown)}s` : (this.state.isOwnerLang ? '🚀 RAKETT VALMIS' : '🚀 MISSILE READY');
                reloadBar.style.width = this.state.missileCooldown > 0 ? `${((10.0 - this.state.missileCooldown) / 10.0) * 100}%` : '100%';
            } else if (this.state.activeWeapon === 'nuke') {
                reloadText.innerText = this.state.nukeTimer > 0 ? `☢️ ${Math.ceil(this.state.nukeTimer)}s` : (this.state.isOwnerLang ? '☢️ VALMIS' : '☢️ READY');
                reloadBar.style.width = this.state.nukeTimer > 0 ? `${((60.0 - this.state.nukeTimer) / 60.0) * 100}%` : '100%';
            }
        }

        if (statKills) statKills.innerText = this.state.myKills.toString();
        if (statMoney) statMoney.innerText = this.state.warMoney.toLocaleString();
        const deployMoneyVal = document.getElementById('deploy-money-val');
        if (deployMoneyVal) deployMoneyVal.innerText = `${this.state.warMoney.toLocaleString()} €`;
        if (ammoMg) {
            ammoMg.innerText = this.state.localClass === 'tank'
                ? `${this.state.mgAmmo} rds`
                : (this.state.isOwnerLang ? '💣 Granaat' : '💣 Grenade');
        }
        if (cdAirstrike) {
            cdAirstrike.innerText = this.state.airstrikeCooldown > 0
                ? `${Math.ceil(this.state.airstrikeCooldown)}s`
                : (this.state.isOwnerLang ? 'VALMIS' : 'READY');
        }
        const cdMissileEl = document.getElementById('cooldown-missile') || document.getElementById('cost-missile');
        if (cdMissileEl) {
            cdMissileEl.innerText = this.state.missileCooldown > 0
                ? `${Math.ceil(this.state.missileCooldown)}s`
                : (this.state.isOwnerLang ? 'VALMIS' : 'READY');
            cdMissileEl.style.color = this.state.missileCooldown > 0 ? '#ffd32a' : '#2ed573';
        }
        const timerNukeEl = document.getElementById('timer-nuke');
        if (timerNukeEl) {
            timerNukeEl.innerText = this.state.nukeTimer > 0
                ? `${Math.ceil(this.state.nukeTimer)}s`
                : (this.state.isOwnerLang ? 'VALMIS' : 'READY');
            timerNukeEl.style.color = this.state.nukeTimer > 0 ? '#ffd32a' : '#2ed573';
        }
    }

    public renderRadar(dt: number, localUnit: CombatUnit | undefined, units: Map<string, CombatUnit>) {
        if (!this.radarCtx || !this.radarCanvas || !localUnit) return;
        const ctx = this.radarCtx;
        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = w / 2 - 6;

        ctx.clearRect(0, 0, w, h);

        // Circular background
        ctx.fillStyle = 'rgba(10, 15, 25, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Concentric distance rings
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2);
        ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx, 6);
        ctx.lineTo(cx, h - 6);
        ctx.moveTo(6, cy);
        ctx.lineTo(w - 6, cy);
        ctx.stroke();

        // Sweeping radar beam
        this.radarSweepAngle += dt * 3.5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.radarSweepAngle);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
        grad.addColorStop(1, 'rgba(0, 242, 254, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, 0, Math.PI / 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Draw units on radar
        const radarRange = 380;
        units.forEach(u => {
            if (u.isDead) return;
            const dx = u.pos.x - localUnit.pos.x;
            const dz = u.pos.z - localUnit.pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > radarRange) return;

            const mapX = cx + (dx / radarRange) * (r * 0.85);
            const mapY = cy + (dz / radarRange) * (r * 0.85);

            ctx.fillStyle = u.isLocalPlayer
                ? '#ffd32a'
                : u.team === this.state.localTeam
                ? '#00f2fe'
                : '#ff4757';
            ctx.beginPath();
            ctx.arc(mapX, mapY, u.isLocalPlayer ? 4.5 : 3.0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    public showToast(message: string, color = '#2ecc71') {
        const toast = document.createElement('div');
        toast.className = 'playard-toast';
        toast.innerText = message;
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(13, 17, 23, 0.94);
            border: 1.5px solid ${color};
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 700;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => toast.remove(), 350);
        }, 3200);
    }
}
