import * as THREE from 'three';
import { Team, CombatUnit } from '../types';
import { WarGameState } from '../state/warState';
import { warAudio } from '../audio';
import { UnitBuilder } from '../models/unitBuilder';
import { WarMultiplayerNetwork } from '../multiplayer';

export class MatchSystem {
    private scene: THREE.Scene;
    private state: WarGameState;
    private unitBuilder: UnitBuilder;
    private network?: WarMultiplayerNetwork;

    public isCountdownActive = false;
    private countdownTimer: any = null;

    constructor(scene: THREE.Scene, state: WarGameState, unitBuilder: UnitBuilder, network?: WarMultiplayerNetwork) {
        this.scene = scene;
        this.state = state;
        this.unitBuilder = unitBuilder;
        this.network = network;
    }

    public setNetwork(network: WarMultiplayerNetwork) {
        this.network = network;
    }

    public addKillFeedEntry(killerName: string, killerTeam: Team, victimName: string, victimTeam: Team) {
        const feed = document.getElementById('kill-feed');
        if (!feed) return;
        const entry = document.createElement('div');
        entry.className = 'kill-entry';
        const kColor = killerTeam === 'red' ? '#ff6b81' : '#70a1ff';
        const vColor = victimTeam === 'red' ? '#ff6b81' : '#70a1ff';
        entry.innerHTML = `<span style="color: ${kColor};">${killerName}</span> 💥 <span style="color: ${vColor};">${victimName}</span>`;
        feed.appendChild(entry);
        setTimeout(() => entry.remove(), 5000);
    }

    public showRespawnOverlay(sec: number) {
        const overlay = document.getElementById('respawn-overlay');
        const countEl = document.getElementById('respawn-countdown');
        if (!overlay || !countEl) return;
        overlay.style.display = 'flex';
        let left = sec;
        countEl.innerText = left.toString();
        const timer = setInterval(() => {
            left--;
            if (left > 0) countEl.innerText = left.toString();
            else { clearInterval(timer); overlay.style.display = 'none'; }
        }, 1000);
    }

    public handleKill(
        killerId: string,
        killerName: string,
        killerTeam: Team,
        victimId: string,
        victimName: string,
        victimTeam: Team,
        units: Map<string, CombatUnit>,
        onUpdateHUD: () => void
    ) {
        if (killerTeam === 'red') this.state.redScore++;
        else this.state.blueScore++;

        this.addKillFeedEntry(killerName, killerTeam, victimName, victimTeam);
        this.network?.send({
            type: 'unit_killed',
            payload: { killerId, killerName, killerTeam, victimId, victimName, victimTeam, redScore: this.state.redScore, blueScore: this.state.blueScore }
        });

        if (killerId === this.state.localPlayerId) {
            this.state.myKills++;
            this.state.warMoney += 150;
            this.state.matchMoneyEarned += 150;
            this.state.saveUserDataToDb();
        }

        onUpdateHUD();
        if (this.state.redScore >= this.state.targetScore || this.state.blueScore >= this.state.targetScore) {
            this.endMatch(this.state.redScore >= this.state.targetScore ? 'red' : 'blue');
            return;
        }

        const victim = units.get(victimId);
        if (victim && !victim.isCrashing) {
            victim.respawnTimer = 5.0;
            if (victim.isLocalPlayer) this.showRespawnOverlay(5);
        }
    }

    public endMatch(winningTeam: Team) {
        this.state.isMatchEnded = true;
        const isWin = winningTeam === this.state.localTeam;
        if (isWin) {
            warAudio.playVictory();
            this.state.warMoney += 1000;
            this.state.matchMoneyEarned += 1000;
        }
        this.state.saveUserDataToDb();

        const modal = document.getElementById('match-end-modal');
        const icon = document.getElementById('match-end-icon');
        const title = document.getElementById('match-end-title');
        const desc = document.getElementById('match-end-desc');
        const finalKills = document.getElementById('final-kills-val');
        const finalMoney = document.getElementById('final-money-val');

        if (modal && title && desc && finalKills && finalMoney) {
            modal.style.display = 'flex';
            if (isWin) {
                if (icon) icon.innerText = '🏆';
                title.innerText = this.state.isOwnerLang ? 'VÕIT!' : 'VICTORY!';
                title.style.color = '#ffd32a';
                desc.innerText = this.state.isOwnerLang
                    ? `Sinu ${this.state.localTeam.toUpperCase()} tiim saavutas 100 tapmist ja kindlustas lahinguvälja võidu!`
                    : `Your ${this.state.localTeam.toUpperCase()} team reached 100 kills and secured battlefield victory!`;
            } else {
                if (icon) icon.innerText = '⚔️';
                title.innerText = this.state.isOwnerLang ? 'KAOTUS!' : 'DEFEAT!';
                title.style.color = '#ff4757';
                desc.innerText = this.state.isOwnerLang
                    ? `Vastaste ${winningTeam.toUpperCase()} tiim jõudis 100 tapmiseni esimesena.`
                    : `Enemy ${winningTeam.toUpperCase()} team reached 100 kills first.`;
            }
            finalKills.innerText = this.state.myKills.toString();
            finalMoney.innerText = `+${this.state.matchMoneyEarned.toLocaleString()} €`;
        }
    }

    public startMatchCountdown(onResetAll: () => void) {
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }

        onResetAll();
        this.isCountdownActive = true;

        const overlay = document.getElementById('match-countdown-overlay');
        const numEl = document.getElementById('countdown-number');
        const subEl = document.getElementById('countdown-subtitle');

        if (!overlay || !numEl || !subEl) {
            this.isCountdownActive = false;
            return;
        }

        overlay.style.display = 'flex';
        const prepText = this.state.isOwnerLang ? 'VALMISTU LAHINGUKS' : 'PREPARE FOR BATTLE';
        const goText = this.state.isOwnerLang ? 'LAHINUGUSSE!' : 'ENGAGE!';

        const setStep = (text: string, color: string, scale: number, subText: string, isGo = false) => {
            numEl.innerText = text;
            numEl.style.color = color;
            numEl.style.transform = `scale(${scale})`;
            subEl.innerText = subText;
            setTimeout(() => { numEl.style.transform = 'scale(1)'; }, 50);
            warAudio.playCountdownBeep(isGo);
        };

        setStep('3', '#ffd32a', 1.8, prepText, false);
        this.countdownTimer = setTimeout(() => {
            setStep('2', '#ffd32a', 1.8, prepText, false);
            this.countdownTimer = setTimeout(() => {
                setStep('1', '#ff9f1a', 1.8, prepText, false);
                this.countdownTimer = setTimeout(() => {
                    setStep(goText, '#2ecc71', 2.2, '', true);
                    this.countdownTimer = setTimeout(() => {
                        overlay.style.display = 'none';
                        this.isCountdownActive = false;
                        this.countdownTimer = null;
                    }, 850);
                }, 1000);
            }, 1000);
        }, 1000);
    }
}
