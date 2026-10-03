import * as THREE from 'three';
import { MetroInventory } from './metroInventory';
import { metroAudio } from '../audio';

export class MetroCombat extends MetroInventory {
    public updateHealthUI() {
        const heartsEl = document.getElementById('player-health-hearts');
        const textEl = document.getElementById('player-health-text');
        if (!heartsEl || !textEl) return;

        const hp = Math.max(0, Math.min(100, this.playerHp));
        textEl.innerText = `${hp} HP`;

        // 5 Hearts display
        const filledHearts = Math.ceil(hp / 20);
        let heartsStr = '';
        for (let i = 0; i < 5; i++) {
            heartsStr += (i < filledHearts) ? '❤️' : '🖤';
        }
        heartsEl.innerText = heartsStr;

        if (hp <= 30) {
            textEl.style.color = '#ff4757';
        } else if (hp <= 60) {
            textEl.style.color = '#ffd32a';
        } else {
            textEl.style.color = '#2ed573';
        }
    }

    public healPlayer(amount: number = 30) {
        this.playerHp = Math.min(100, this.playerHp + amount);
        this.updateHealthUI();

        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) {
            flashOverlay.style.background = 'radial-gradient(circle, rgba(46, 213, 115, 0.6) 0%, rgba(0,0,0,0) 70%)';
            flashOverlay.style.display = 'block';
            flashOverlay.style.opacity = '0.6';
            setTimeout(() => {
                flashOverlay.style.opacity = '0';
                setTimeout(() => {
                    flashOverlay.style.display = 'none';
                    flashOverlay.style.background = '#ff0000';
                }, 300);
            }, 200);
        }
    }

    public takePlayerDamage(amount: number, reasonEt?: string, reasonEn?: string) {
        if (this.state !== 'player_free') return;
        this.playerHp = Math.max(0, this.playerHp - amount);
        this.updateHealthUI();
        metroAudio.playPlayerHurt();

        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) {
            flashOverlay.style.display = 'block';
            flashOverlay.style.opacity = '0.7';
            setTimeout(() => {
                flashOverlay.style.opacity = '0';
                setTimeout(() => flashOverlay.style.display = 'none', 300);
            }, 150);
        }

        if (this.playerHp <= 0) {
            this.state = 'dead';
            const deathModal = document.getElementById('death-modal');
            const dTitle = document.getElementById('death-title');
            const dDesc = document.getElementById('death-desc');
            if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
            if (dDesc) {
                dDesc.textContent = this.lang === 'et'
                    ? (reasonEt || 'Must vari ja pahalased võtsid su elud!')
                    : (reasonEn || 'Your health reached zero!');
            }
            if (deathModal) deathModal.style.display = 'flex';
            this.updateCursorState();
        }
    }

    public triggerGameOver(reasonEt?: string, reasonEn?: string) {
        this.playerHp = 0;
        this.updateHealthUI();
        this.state = 'dead';
        const deathModal = document.getElementById('death-modal');
        const dTitle = document.getElementById('death-title');
        const dDesc = document.getElementById('death-desc');
        if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
        if (dDesc) {
            dDesc.textContent = this.lang === 'et'
                ? (reasonEt || 'Must vari ja pahalased võtsid su elud!')
                : (reasonEn || 'Your health reached zero!');
        }
        if (deathModal) deathModal.style.display = 'flex';
        this.updateCursorState();
    }

    public attackWithSword() {
        if (this.equippedItem !== 'sword' || this.isSwordSwinging) return;
        this.isSwordSwinging = true;
        this.swordSwingTimer = 0.28;
        metroAudio.playSwordSlash();

        const playerPos = this.playerPos;

        // Check Carriage 200 Final Boss in range (User requirement: "selle vaguni lõpus on pahalane keda tapad mõõgaga 10 lõõki")
        if (this.currentCarIndex === 200 && this.carriage200Boss && !this.carriage200Boss.isDead) {
            const b = this.carriage200Boss;
            const dx = b.group.position.x - playerPos.x;
            const dz = b.group.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 4.5) {
                b.hp = Math.max(0, b.hp - 1);
                metroAudio.playMonsterHit();

                // Flash white on hit
                const origMat = b.bodyMesh.material;
                b.bodyMesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
                setTimeout(() => {
                    if (b?.bodyMesh) b.bodyMesh.material = origMat;
                }, 120);

                // Update boss floating health bar
                this.updateCarriage200BossHealthBar();

                if (b.hp > 0) {
                    this.showThought(
                        `⚔️ Mõõgalöök tabas lõpupahalast! (${b.hp}/10 tabamust jäänud)`,
                        `⚔️ Sword struck the Final Boss! (${b.hp}/10 hits left)`,
                        2000
                    );
                } else {
                    // Boss is defeated after 10 sword hits!
                    b.isDead = true;
                    metroAudio.playMonsterDeath();
                    this.scene.remove(b.group);
                    // Lights turn bright white and exit arrows appear pointing to next door!
                    this.activateCarriage200WhiteLightsAndExitArrow();
                }
                return;
            }
        }

        // Find closest shadow villain in range (Carriage 31 etc.)
        let closestVillain: typeof this.shadowVillains[0] | null = null;
        let closestDist = Infinity;
        let closestIndex = -1;

        for (let i = 0; i < this.shadowVillains.length; i++) {
            const v = this.shadowVillains[i];
            const dx = v.group.position.x - playerPos.x;
            const dz = v.group.position.z - playerPos.z;
            const dist2D = Math.sqrt(dx * dx + dz * dz);

            if (dist2D < 4.0 && dist2D < closestDist) {
                closestDist = dist2D;
                closestVillain = v;
                closestIndex = i;
            }
        }

        if (closestVillain && closestIndex >= 0) {
            closestVillain.hp -= 40;
            metroAudio.playMonsterHit();

            const origMat = closestVillain.bodyMesh.material;
            closestVillain.bodyMesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            setTimeout(() => {
                if (closestVillain?.bodyMesh) closestVillain.bodyMesh.material = origMat;
            }, 120);

            if (closestVillain.hp <= 0) {
                metroAudio.playMonsterDeath();
                this.scene.remove(closestVillain.group);
                this.shadowVillains.splice(closestIndex, 1);
                this.coins += 15;
                this.updateCoinsUI();
                this.showThought(
                    '⚔️ Pahalane alistatud! (+15 Coini)',
                    '⚔️ Shadow Villain Defeated! (+15 Coins)',
                    3000
                );
            }
        }
    }

    public updateCarriage200BossHealthBar() {
        if (!this.carriage200Boss) return;
        const b = this.carriage200Boss;
        const canvas = b.healthCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, 512, 128);

        // Background box
        ctx.fillStyle = 'rgba(10, 14, 24, 0.9)';
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(8, 8, 496, 112, 12);
        ctx.fill();
        ctx.stroke();

        // Title
        ctx.fillStyle = '#ff4757';
        ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.lang === 'et' ? '👹 LÕPUPAHALANE (VAGUN 200)' : '👹 FINAL BOSS (CARRIAGE 200)', 256, 38);

        // 10 Hit Segments (blocks)
        const startX = 36;
        const blockW = 40;
        const blockH = 22;
        const gap = 4;
        const y = 52;

        for (let i = 0; i < 10; i++) {
            const bx = startX + i * (blockW + gap);
            if (i < b.hp) {
                ctx.fillStyle = b.hp <= 3 ? '#ff4757' : (b.hp <= 6 ? '#ffa502' : '#2ed573');
                ctx.fillRect(bx, y, blockW, blockH);
            } else {
                ctx.fillStyle = '#2f3542';
                ctx.fillRect(bx, y, blockW, blockH);
            }
            ctx.strokeStyle = '#1e272e';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, y, blockW, blockH);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.lang === 'et'
                ? `Mõõgalööke jäänud: ${b.hp} / 10`
                : `Sword hits remaining: ${b.hp} / 10`,
            256,
            104
        );

        b.healthTex.needsUpdate = true;
    }

    public activateCarriage200WhiteLightsAndExitArrow() {
        // 1. Turn all lights bright white and peaceful ("lähevad tuled valgeks ja eredaks")
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => {
                l.color.setHex(0xffffff);
                l.intensity = 2.4;
                l.distance = 22;
            });
            this.currentCarriage.lightMeshes.forEach(m => {
                (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
            });
        }

        // 2. Play peaceful door chime (User requirement: "aga laul ei peatu" - keep carriage 200 music playing!)
        metroAudio.playDoorChime();

        // 3. Clear existing exit arrows if any
        if (this.carriage200ExitArrows) {
            this.carriage200ExitArrows.forEach(a => this.scene.remove(a));
            this.carriage200ExitArrows = [];
        } else {
            this.carriage200ExitArrows = [];
        }

        // 4. Build glowing 3D exit arrows pointing towards next door (+Z direction) ("ja tuleb nool järgmise ukse poole")
        const startZ = Math.min(this.playerPos.z + 2.5, 43.0);
        const endZ = 46.5;
        const arrowZPositions: number[] = [];
        for (let z = startZ; z <= endZ; z += 6.0) {
            arrowZPositions.push(z);
        }
        if (!arrowZPositions.includes(endZ)) {
            arrowZPositions.push(endZ);
        }

        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        const arrowGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

        arrowZPositions.forEach(z => {
            const arrowGroup = new THREE.Group();
            arrowGroup.position.set(0, 1.4, z);

            // Shaft
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 1.2), arrowMat);
            shaft.position.set(0, 0, -0.2);
            arrowGroup.add(shaft);

            // Head (Cone pointing towards +Z)
            const head = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 4), arrowMat);
            head.rotation.x = -Math.PI / 2;
            head.position.set(0, 0, 0.65);
            arrowGroup.add(head);

            // Inner bright white glow core
            const core = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4), arrowGlowMat);
            core.rotation.x = -Math.PI / 2;
            core.position.set(0, 0, 0.67);
            arrowGroup.add(core);

            // PointLight to cast vibrant neon glow on the floor and walls
            const pLight = new THREE.PointLight(0x00ffcc, 1.6, 6);
            pLight.position.set(0, 0.25, 0);
            arrowGroup.add(pLight);

            (arrowGroup as any).baseZ = z;
            (arrowGroup as any).baseY = 1.4;

            this.scene.add(arrowGroup);
            this.carriage200ExitArrows.push(arrowGroup);
        });

        // 5. Thought guidance ("läheb kõik korda", järgi noolt)
        this.showThought(
            '✨ Lõpupahalane on alistatud! Tuled läksid valgeks ja eredaks. Järgi noolt järgmise ukse poole!',
            '✨ The Final Boss is defeated! Lights turned bright white. Follow the arrow to the next door!',
            6000
        );
    }

    private triggerCarriage200Boss() {
        this.kuuljaSwitchesActivated = 0;
        this.showThought(
            '🚇 METROO PIDURDAS JA JÄI SEISMA! Uksed avanesid. Astu metroost välja jaamaplatvormile! Kuulja varitseb pimeduses — KÜKITA [C] ja aktiveeri 3 lülitit!',
            '🚇 METRO HALTED TO A STOP! Doors opened. Step out onto the station platform! The Listener lurks in the dark — CROUCH [C] and activate 3 switches!'
        );

        // Spawn 3 electrical circuit switches on station platform
        this._spawnCarriage200Switches();

        // Spawn Kuulja boss entity on station platform
        this._spawnKuuljaBoss();
    }
}
