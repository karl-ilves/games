import * as THREE from 'three';
import { MetroStory } from '../systems/metroStory';
import { isTestMode } from '../../../auth';
import { metroAudio } from '../audio';
import { GOLDEN_SHOP_ITEMS } from '../catalog';

export class MetroModals extends MetroStory {
    public openGoldenShopModal() {
        const modal = document.getElementById('golden-shop-modal');
        if (!modal) return;
        this.updateCoinsUI();

        const grid = document.getElementById('shop-items-grid');
        if (grid) {
            grid.innerHTML = '';
            GOLDEN_SHOP_ITEMS.forEach(item => {
                const isOwned = this.inventory[item.id];
                const canAfford = this.coins >= item.price;
                const card = document.createElement('div');
                card.className = 'shop-item-card';
                card.innerHTML = `
                    <div class="shop-item-header">
                        <span style="font-size: 1.6rem;">${item.icon}</span>
                        <div>
                            <div class="shop-item-title">${this.lang === 'et' ? item.nameEt : item.nameEn}</div>
                            <div class="shop-item-price">🪙 ${item.price} ${this.lang === 'et' ? 'COINI' : 'COINS'}</div>
                        </div>
                    </div>
                    <div class="shop-item-desc">${this.lang === 'et' ? item.descEt : item.descEn}</div>
                    <div class="shop-item-footer">
                        <span style="font-size: 0.75rem; color: #a4b0be;">${isOwned ? (this.lang === 'et' ? '✅ OMATUD' : '✅ OWNED') : (this.lang === 'et' ? 'Saadaval' : 'Available')}</span>
                        <button class="btn-shop-buy" id="btn-buy-${item.id}" ${isOwned ? 'disabled' : canAfford ? '' : 'disabled'}>
                            ${isOwned ? (this.lang === 'et' ? '✅ OMAD' : '✅ OWNED') : (this.lang === 'et' ? '🛒 OSTA' : '🛒 BUY')}
                        </button>
                    </div>
                `;

                const buyBtn = card.querySelector(`#btn-buy-${item.id}`);
                if (buyBtn && !isOwned) {
                    buyBtn.addEventListener('click', () => {
                        this.buyShopItem(item.id);
                    });
                }
                grid.appendChild(card);
            });
        }

        modal.style.display = 'flex';
        this.state = 'golden_shop';
        this.updateCursorState();
    }

    public buyShopItem(itemId: string) {
        const item = GOLDEN_SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (this.spendCoins(item.price)) {
            this.unlockItem(item.id);
            metroAudio.playShopPurchase();
            this.openGoldenShopModal(); // Refresh view
            this.showThought(
                `Ostsid eseme: ${this.lang === 'et' ? item.nameEt : item.nameEn}!`,
                `Purchased item: ${item.nameEn}!`
            );
        } else {
            this.showThought('Sul ei ole piisavalt coine!', 'You do not have enough coins!');
        }
    }

    public renderClueCardVisual(clue: ClueItem, isEt: boolean): string {
        const text = isEt ? clue.textEt : clue.textEn;
        const title = isEt ? clue.titleEt : clue.titleEn;

        if (clue.type === 'photo') {
            return `
                <div style="background: #fbf9f5; border-radius: 6px; padding: 14px 14px 22px 14px; box-shadow: 0 18px 40px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.5); max-width: 440px; margin: 0 auto; transform: rotate(-1deg); cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="background: #070a10; border-radius: 3px; overflow: hidden; position: relative; width: 100%; aspect-ratio: 4/3; box-shadow: inset 0 0 30px rgba(0,0,0,0.95); border: 1px solid rgba(0,0,0,0.3);">
                        <svg viewBox="0 0 400 300" width="100%" height="100%" style="display: block;">
                            <defs>
                                <linearGradient id="photo-vignette" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#020408" stop-opacity="0.95" />
                                    <stop offset="35%" stop-color="#0f172a" stop-opacity="0.4" />
                                    <stop offset="70%" stop-color="#0b1120" stop-opacity="0.6" />
                                    <stop offset="100%" stop-color="#010204" stop-opacity="0.98" />
                                </linearGradient>
                                <radialGradient id="lamp-glow" cx="50%" cy="20%" r="50%">
                                    <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.85" />
                                    <stop offset="40%" stop-color="#00f2fe" stop-opacity="0.25" />
                                    <stop offset="100%" stop-color="#000000" stop-opacity="0" />
                                </radialGradient>
                                <radialGradient id="red-danger-glow" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stop-color="#ff4757" stop-opacity="0.9" />
                                    <stop offset="60%" stop-color="#ff4757" stop-opacity="0.1" />
                                    <stop offset="100%" stop-color="#000000" stop-opacity="0" />
                                </radialGradient>
                            </defs>
                            <!-- Tunnel & Carriage Walls Perspective -->
                            <rect width="400" height="300" fill="#060911" />
                            <!-- Perspective Lines of Ceiling & Floor -->
                            <polygon points="0,0 400,0 260,110 140,110" fill="#0b1220" />
                            <polygon points="0,300 400,300 270,210 130,210" fill="#080e18" />
                            <polygon points="0,0 140,110 130,210 0,300" fill="#0d1829" />
                            <polygon points="400,0 260,110 270,210 400,300" fill="#09121f" />
                            
                            <!-- Subway Windows (Dark blue & foggy reflection) -->
                            <rect x="25" y="70" width="70" height="110" rx="6" fill="#050a14" stroke="#1e293b" stroke-width="2" />
                            <line x1="25" y1="125" x2="95" y2="125" stroke="#1e293b" stroke-width="1.5" />
                            <rect x="305" y="70" width="70" height="110" rx="6" fill="#050a14" stroke="#1e293b" stroke-width="2" />
                            <line x1="305" y1="125" x2="375" y2="125" stroke="#1e293b" stroke-width="1.5" />

                            <!-- Empty Passenger Benches -->
                            <path d="M 40,185 L 125,185 L 120,225 L 35,245 Z" fill="#1e3799" opacity="0.8" />
                            <path d="M 40,150 L 125,160 L 125,185 L 40,185 Z" fill="#0c2461" />
                            <path d="M 360,185 L 275,185 L 280,225 L 365,245 Z" fill="#1e3799" opacity="0.7" />
                            <path d="M 360,150 L 275,160 L 275,185 L 360,185 Z" fill="#0c2461" />

                            <!-- Deep Tunnel End Doorway (Pitch Black / Mystery) -->
                            <rect x="155" y="112" width="90" height="96" fill="#010204" stroke="#00f2fe" stroke-width="1" stroke-opacity="0.4" />
                            <line x1="200" y1="112" x2="200" y2="208" stroke="#00f2fe" stroke-width="0.8" stroke-opacity="0.3" />

                            <!-- Overhead Tube Lights -->
                            <rect x="175" y="45" width="50" height="8" rx="4" fill="#00f2fe" opacity="0.9" filter="drop-shadow(0 0 8px #00f2fe)" />
                            <circle cx="200" cy="50" r="90" fill="url(#lamp-glow)" />

                            <!-- Mysterious Glowing Eyes in End Tunnel -->
                            <circle cx="192" cy="155" r="2.5" fill="#ff4757" />
                            <circle cx="208" cy="155" r="2.5" fill="#ff4757" />
                            <circle cx="200" cy="155" r="30" fill="url(#red-danger-glow)" />

                            <!-- Vignette & Grain Overlay -->
                            <rect width="400" height="300" fill="url(#photo-vignette)" />

                            <!-- Date Timestamp in amber retro camera font -->
                            <text x="310" y="282" fill="#ffd32a" font-family="'Courier New', monospace" font-size="12" font-weight="900" opacity="0.85">’87 10 14</text>
                            <text x="25" y="32" fill="#a4b0be" font-family="'Courier New', monospace" font-size="11" font-weight="700" opacity="0.6">POLAROID 600 · EXP 002</text>
                        </svg>
                    </div>
                    <div style="margin-top: 12px; color: #1e272e; font-family: 'Courier New', monospace; font-size: 0.96rem; font-weight: 800; text-align: center; letter-spacing: 0.5px;">
                        📷 ${title}
                    </div>
                    <div style="color: #576574; font-family: 'Courier New', monospace; font-size: 0.82rem; margin-top: 4px; text-align: center; font-style: italic;">
                        ${text}
                    </div>
                </div>
            `;
        }

        if (clue.type === 'ticket') {
            return `
                <div style="background: linear-gradient(135deg, #f5e6cb 0%, #edd3a8 100%); border-radius: 10px; padding: 22px 24px; color: #2c2416; font-family: 'Courier New', monospace; border: 2.5px dashed #8c7b65; box-shadow: 0 15px 35px rgba(0,0,0,0.85); position: relative; max-width: 460px; margin: 0 auto; text-align: left; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8c7b65; padding-bottom: 10px; margin-bottom: 12px;">
                        <div>
                            <div style="font-weight: 900; font-size: 1.1rem; letter-spacing: 2px; color: #1e272e;">🚇 METRO TRANSIT</div>
                            <div style="font-size: 0.72rem; color: #57606f; font-weight: 700;">RAPID TRANSIT ONE-WAY PASS</div>
                        </div>
                        <div style="background: #2f3542; color: #ffd32a; font-weight: 900; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; letter-spacing: 1px;">
                            № 002-${clue.carIndex}
                        </div>
                    </div>
                    <div style="margin: 16px 0; background: rgba(0,0,0,0.06); padding: 14px; border-radius: 8px; border-left: 4px solid #ff4757;">
                        <div style="font-size: 0.75rem; font-weight: 800; color: #e84118; letter-spacing: 1px; text-transform: uppercase;">KÄSITSI KIRJUTATUD SÕNUM / STAMP:</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: #1e272e; margin-top: 6px; letter-spacing: 1px;">
                            ${text}
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.75rem; color: #57606f; border-top: 1px dashed #8c7b65; padding-top: 10px;">
                        <div>VALIDITY: UNTIL LAST STOP<br>DATE: 23:45 · EXP 002</div>
                        <div style="font-family: monospace; letter-spacing: 3px; font-size: 1.2rem; font-weight: 900; color: #2f3542;">||| | |||| || |</div>
                    </div>
                </div>
            `;
        }

        if (clue.type === 'document' || clue.type === 'diary') {
            return `
                <div style="background: #fdfbf7; border-radius: 8px; padding: 24px 26px; color: #1e272e; font-family: 'Courier New', monospace; box-shadow: 0 18px 40px rgba(0,0,0,0.9); position: relative; max-width: 480px; margin: 0 auto; text-align: left; border: 1px solid #dcdde1; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="position: absolute; top: -10px; left: 24px; width: 14px; height: 32px; border: 2.5px solid #718093; border-radius: 6px; background: transparent; z-index: 2;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; border-bottom: 2px solid #2f3542; padding-bottom: 10px;">
                        <div>
                            <div style="font-size: 0.72rem; font-weight: 900; color: #718093; letter-spacing: 2px;">DEPT. OF UNDERGROUND TRANSIT</div>
                            <div style="font-size: 1.15rem; font-weight: 900; color: #0c111a; letter-spacing: 1px;">AMETLIK RAPORT #002</div>
                        </div>
                        <div style="border: 2px solid #e84118; color: #e84118; padding: 2px 8px; font-size: 0.75rem; font-weight: 900; transform: rotate(5deg); letter-spacing: 1px;">
                            🔴 SALAJANE
                        </div>
                    </div>
                    <div style="font-size: 0.82rem; color: #2f3542; line-height: 1.5; margin-bottom: 14px;">
                        <span style="font-weight: 900;">ASUKOHT:</span> Vagun ${clue.carIndex} &nbsp;|&nbsp; <span style="font-weight: 900;">OBJEKT:</span> Katse 002
                    </div>
                    <div style="background: rgba(0,0,0,0.04); border-left: 4px solid #2f3542; padding: 12px 14px; font-size: 1.05rem; font-weight: 800; color: #0c111a; line-height: 1.5; white-space: pre-line;">
                        ${text}
                    </div>
                    <div style="margin-top: 16px; font-size: 0.72rem; color: #718093; text-align: right; border-top: 1px solid #dcdde1; padding-top: 8px;">
                        ALLKIRI: [REDACTED / KUSTUTATUD] ✍️
                    </div>
                </div>
            `;
        }

        if (clue.type === 'map' || clue.type === 'diagram') {
            return `
                <div style="background: #08111e; border-radius: 10px; padding: 18px; border: 2px solid #00f2fe; box-shadow: 0 0 35px rgba(0,242,254,0.35); max-width: 480px; margin: 0 auto; text-align: left; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(0,242,254,0.3); padding-bottom: 8px;">
                        <div style="color: #00f2fe; font-weight: 900; font-size: 0.9rem; letter-spacing: 2px;">🗺️ METROOSÜSTEEMI SKEEM</div>
                        <div style="color: #ffd32a; font-size: 0.75rem; font-weight: 800;">TUNNEL LINE 002</div>
                    </div>
                    <div style="background: #050a12; border-radius: 6px; padding: 10px; border: 1px solid rgba(0,242,254,0.2); margin-bottom: 12px;">
                        <svg viewBox="0 0 360 120" width="100%" height="100%" style="display: block;">
                            <line x1="20" y1="60" x2="340" y2="60" stroke="#00f2fe" stroke-width="4" />
                            <line x1="180" y1="60" x2="320" y2="100" stroke="#ff4757" stroke-width="3" stroke-dasharray="4,4" />
                            
                            <circle cx="40" cy="60" r="7" fill="#ffd32a" stroke="#fff" stroke-width="2" />
                            <text x="30" y="45" fill="#a4b0be" font-size="9" font-family="monospace">JAAM 1</text>

                            <circle cx="120" cy="60" r="7" fill="#00f2fe" stroke="#fff" stroke-width="2" />
                            <text x="100" y="45" fill="#a4b0be" font-size="9" font-family="monospace">VAGUN 100</text>

                            <circle cx="220" cy="60" r="8" fill="#ff4757" stroke="#fff" stroke-width="2" />
                            <text x="200" y="45" fill="#ff4757" font-size="10" font-weight="900" font-family="monospace">VAGUN 200</text>

                            <circle cx="320" cy="100" r="9" fill="#ff0000" stroke="#ffd32a" stroke-width="2" />
                            <text x="260" y="115" fill="#ffd32a" font-size="10" font-weight="900" font-family="monospace">⚠️ KATSE LÕPP (300)</text>
                        </svg>
                    </div>
                    <div style="color: #f1f2f6; font-size: 0.95rem; font-weight: 700; line-height: 1.4; white-space: pre-line; background: rgba(0,242,254,0.08); padding: 10px; border-radius: 6px; border-left: 3px solid #ffd32a;">
                        ${text}
                    </div>
                </div>
            `;
        }

        if (clue.type === 'plate') {
            return `
                <div style="background: linear-gradient(135deg, #353b48 0%, #1e272e 100%); border: 2.5px solid #ffd32a; border-radius: 8px; padding: 24px; box-shadow: inset 0 0 25px rgba(0,0,0,0.9), 0 15px 35px rgba(0,0,0,0.85); max-width: 460px; margin: 0 auto; text-align: center; position: relative; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="position: absolute; top: 8px; left: 8px; font-size: 0.7rem; color: #ffd32a;">🔩</div>
                    <div style="position: absolute; top: 8px; right: 8px; font-size: 0.7rem; color: #ffd32a;">🔩</div>
                    <div style="position: absolute; bottom: 8px; left: 8px; font-size: 0.7rem; color: #ffd32a;">🔩</div>
                    <div style="position: absolute; bottom: 8px; right: 8px; font-size: 0.7rem; color: #ffd32a;">🔩</div>
                    <div style="color: #ffd32a; font-size: 0.8rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">
                        🛡️ GRAVEERITUD METALLPLAAT
                    </div>
                    <div style="color: #f5f6fa; font-size: 1.25rem; font-weight: 900; font-family: 'Georgia', serif; letter-spacing: 1.5px; line-height: 1.5; text-shadow: 0 2px 4px #000; border-top: 1px solid rgba(255,211,42,0.4); border-bottom: 1px solid rgba(255,211,42,0.4); padding: 14px 6px; margin: 8px 0;">
                        ${text}
                    </div>
                </div>
            `;
        }

        if (clue.type === 'watch') {
            return `
                <div style="background: radial-gradient(circle at center, #1b263b 0%, #080c14 100%); border: 3px solid #ffd32a; border-radius: 14px; padding: 20px; box-shadow: 0 0 40px rgba(255,211,42,0.3); max-width: 440px; margin: 0 auto; text-align: center; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                    <div style="font-size: 3.2rem; margin-bottom: 6px; filter: drop-shadow(0 0 15px #ffd32a);">🕰️</div>
                    <div style="color: #ffd32a; font-size: 1.6rem; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: 4px; margin-bottom: 8px;">
                        02:00:00
                    </div>
                    <div style="color: #d2dae2; font-size: 1.05rem; font-weight: 700; line-height: 1.5; background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,211,42,0.3);">
                        ${text}
                    </div>
                </div>
            `;
        }

        // Generic Note / Inscription fallback
        return `
            <div style="background: #111927; border: 2px solid #00f2fe; border-radius: 12px; padding: 22px; box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.8); max-width: 460px; margin: 0 auto; text-align: left; cursor: pointer;" title="Vajuta esemele seljakotti panemiseks">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 1.8rem;">${clue.icon || '📜'}</span>
                    <span style="color: #00f2fe; font-weight: 900; font-size: 1rem; letter-spacing: 1px;">${title}</span>
                </div>
                <div style="color: #f1f2f6; font-size: 1.12rem; font-weight: 700; font-family: 'Courier New', monospace; line-height: 1.5; white-space: pre-line; background: rgba(0,0,0,0.4); padding: 14px; border-radius: 8px; border-left: 3px solid #00f2fe;">
                    ${text}
                </div>
            </div>
        `;
    }

    public openClueInspection(clue: ClueItem) {
        this.state = 'inspecting';
        this.currentInspectedClue = clue;

        const isEt = this.lang === 'et';
        const modal = document.getElementById('clue-inspect-modal');
        const box = document.getElementById('clue-inspect-box');
        const badge = document.getElementById('clue-badge-type');
        const title = document.getElementById('clue-inspect-title');
        const cardContainer = document.getElementById('clue-card-container');

        if (box) {
            box.style.transform = 'scale(1) translateY(0)';
            box.style.opacity = '1';
        }

        if (badge) {
            const typeLabels: { [key: string]: string } = isEt ? {
                ticket: '🎫 PILET',
                photo: '📷 VANA FOTO',
                document: '📄 DOKUMENT',
                map: '🗺️ METROOKAART',
                plate: '🛡️ METALLPLAAT',
                list: '📋 NIMEKIRI',
                watch: '🕰️ MEHHANISM',
                note: '📜 SALAJANE MÄRGE'
            } : {
                ticket: '🎫 TICKET',
                photo: '📷 OLD PHOTO',
                document: '📄 DOCUMENT',
                map: '🗺️ SUBWAY MAP',
                plate: '🛡️ METAL PLATE',
                list: '📋 PASSENGER LIST',
                watch: '🕰️ MECHANISM',
                note: '📜 SECRET NOTE'
            };
            badge.innerText = typeLabels[clue.type] || (isEt ? '📜 SALAJANE VIHJE' : '📜 SECRET CLUE');
        }

        if (title) title.innerText = isEt ? clue.titleEt : clue.titleEn;

        const packPrompt = modal?.querySelector('p');
        if (packPrompt) {
            packPrompt.innerText = isEt
                ? '💡 Vajuta pildile või allolevale nupule, et see seljakotti panna.'
                : '💡 Click the card or button below to put it in your backpack.';
        }
        const packBtn = document.getElementById('btn-pack-clue');
        if (packBtn) {
            packBtn.innerHTML = isEt ? '<span>📦 Pane Seljakotti</span>' : '<span>📦 Put in Backpack</span>';
        }

        // Render full realistic graphic image / card into cardContainer
        if (cardContainer) {
            cardContainer.innerHTML = this.renderClueCardVisual(clue, isEt);
        }

        if (modal) modal.style.display = 'flex';
        metroAudio.playItemInspect();

        // Release mouse lock automatically so cursor is freely movable on screen
        document.body.classList.remove('metro-in-game');
        document.body.classList.add('metro-cursor-visible');
        if (document.pointerLockElement) {
            try { document.exitPointerLock?.(); } catch (_) {}
        }
        this.updateCursorState();
    }

    public packCurrentInspectedClue() {
        const clue = this.currentInspectedClue;
        const modal = document.getElementById('clue-inspect-modal');
        const box = document.getElementById('clue-inspect-box');

        if (box) {
            // Smooth packing animation into backpack
            box.style.transform = 'scale(0.15) translateY(350px)';
            box.style.opacity = '0';
        }

        setTimeout(() => {
            if (modal) modal.style.display = 'none';
            if (box) {
                box.style.transform = 'scale(1) translateY(0)';
                box.style.opacity = '1';
            }

            if (clue) {
                if (!this.collectedClues.some(c => c.id === clue.id)) {
                    this.collectedClues.push(clue);
                    clue.collected = true;
                    this.cluesFound++;
                }

                // Remove 3D mesh from the current carriage
                if (this.activeClueMesh) {
                    this.scene.remove(this.activeClueMesh);
                    if (this.currentCarriage?.group) this.currentCarriage.group.remove(this.activeClueMesh);
                    this.activeClueMesh = null;
                }
                if (this.currentCarriage?.inspectableItem) {
                    this.scene.remove(this.currentCarriage.inspectableItem);
                    if (this.currentCarriage?.group) this.currentCarriage.group.remove(this.currentCarriage.inspectableItem);
                    this.currentCarriage.inspectableItem = undefined;
                }

                // Update HUD backpack button counter & hotbar
                const countBadge = document.getElementById('backpack-btn-text');
                if (countBadge) countBadge.innerText = `Kaust (${this.collectedClues.length})`;

                this.showThought(
                    `📦 „${clue.titleEt}” pandi seljakotti! (Ava [B] kaudu)`,
                    `📦 “${clue.titleEn}” packed into backpack! (Press [B] to view)`
                );
                metroAudio.playDoorLatch();
            }

            this.currentInspectedClue = null;
            this.state = 'player_free';
            // Return to normal in-game state & re-lock cursor seamlessly
            this.updateCursorState();
            this.updateHotbarUI();
        }, 320);
    }

    public openCluesFolderModal() {
        this.state = 'inspecting';
        const isEt = this.lang === 'et';
        const modal = document.getElementById('clues-folder-modal');
        const countText = document.getElementById('clues-folder-count');
        const grid = document.getElementById('clues-folder-grid');
        const emptyMsg = document.getElementById('clues-folder-empty');

        if (countText) {
            countText.innerText = isEt ? `${this.collectedClues.length} eset kogutud` : `${this.collectedClues.length} items collected`;
        }

        if (emptyMsg) {
            emptyMsg.innerText = isEt
                ? 'Sa ei ole veel ühtegi vihjet kogunud. Uuri vagunitest leiduvaid esemeid!'
                : 'You have not collected any clues yet. Inspect items found in the carriages!';
        }

        if (grid) {
            grid.innerHTML = '';
            if (this.collectedClues.length === 0) {
                if (emptyMsg) emptyMsg.style.display = 'block';
            } else {
                if (emptyMsg) emptyMsg.style.display = 'none';
                this.collectedClues.forEach(clue => {
                    const card = document.createElement('div');
                    card.style.cssText = 'background: rgba(20, 28, 42, 0.9); border: 1.5px solid rgba(0, 242, 254, 0.35); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: all 0.2s;';
                    card.innerHTML = `
                        <div style="font-size: 2.2rem; margin-bottom: 6px;">${clue.icon}</div>
                        <div style="color: #ffd32a; font-weight: 800; font-size: 0.8rem; margin-bottom: 4px; line-height: 1.2;">${isEt ? clue.titleEt : clue.titleEn}</div>
                        <div style="color: #747d8c; font-size: 0.68rem; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${isEt ? clue.textEt : clue.textEn}</div>
                    `;
                    card.onmouseenter = () => { card.style.borderColor = '#00f2fe'; card.style.transform = 'translateY(-3px)'; card.style.background = 'rgba(30, 42, 60, 0.95)'; };
                    card.onmouseleave = () => { card.style.borderColor = 'rgba(0, 242, 254, 0.35)'; card.style.transform = 'none'; card.style.background = 'rgba(20, 28, 42, 0.9)'; };
                    card.onclick = () => {
                        this.closeCluesFolderModal();
                        this.openClueInspection(clue);
                    };
                    grid.appendChild(card);
                });
            }
        }

        if (modal) modal.style.display = 'flex';
        this.updateCursorState();
        this.updateHotbarUI();
    }

    public closeCluesFolderModal() {
        const modal = document.getElementById('clues-folder-modal');
        if (modal) modal.style.display = 'none';
        this.state = 'player_free';
        this.updateCursorState();
        this.updateHotbarUI();
    }

    public toggleCluesFolderModal() {
        const modal = document.getElementById('clues-folder-modal');
        if (modal && modal.style.display === 'flex') {
            this.closeCluesFolderModal();
        } else {
            this.openCluesFolderModal();
        }
    }

    public openDeathModal() {
        this.state = 'dead';
        const modal = document.getElementById('death-modal');
        const title = document.getElementById('death-title');
        const desc = document.getElementById('death-desc');
        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) flashOverlay.style.display = 'none';

        if (modal && title && desc) {
            title.innerText = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
            desc.innerText = this.lang === 'et'
                ? 'Must varjukäsi haaras sinust ja tõmbas su kihutavast rongist tühjusesse...'
                : 'The dark shadow hand grabbed you and dragged you from the speeding train into the void...';
            modal.style.display = 'flex';
        }
        this.updateCursorState();
    }

    public respawnFromDeath() {
        const modal = document.getElementById('death-modal');
        if (modal) modal.style.display = 'none';

        // Replay full cinematic intro sequence from the beginning (kui panen retry siis peab ka intro tulema)
        this.replayIntro();
        this.updateCursorState();
    }

    public openLoreModal() {
        if (!this.currentCarriage || !this.currentCarriage.inspectableText) return;
        this.state = 'inspecting';
        this.cluesFound++;

        const isEt = this.lang === 'et';
        const modal = document.getElementById('lore-modal');
        const title = document.getElementById('lore-title');
        const desc = document.getElementById('lore-desc');
        if (modal && title && desc) {
            title.innerText = isEt ? this.currentCarriage.inspectableText.titleEt : this.currentCarriage.inspectableText.titleEn;
            desc.innerText = isEt ? this.currentCarriage.inspectableText.descEt : this.currentCarriage.inspectableText.descEn;
            modal.style.display = 'flex';
        }
        metroAudio.playItemInspect();
        this.updateCursorState();
    }

    private openKeypadModal() {
        this.state = 'keypad';
        const modal = document.getElementById('keypad-modal');
        const codeDisplay = document.getElementById('keypad-input');
        if (modal && codeDisplay) {
            (codeDisplay as HTMLInputElement).value = '';
            modal.style.display = 'flex';
        }
        this.updateCursorState();
    }

    private submitKeypad() {
        const input = document.getElementById('keypad-input') as HTMLInputElement;
        const modal = document.getElementById('keypad-modal');
        if (input && modal && this.currentCarriage) {
            if (input.value === '1987' || input.value === this.currentCarriage.puzzleCode) {
                metroAudio.playKeypadBeep(true);
                this.currentCarriage.puzzleSolved = true;
                modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
                this.showThought('Kood õige! Uks avanes.', 'Code correct! The door unlocked.');
            } else {
                metroAudio.playKeypadBeep(false);
                input.value = '';
                this.showThought('Vale kood. Proovi uuesti.', 'Wrong code. Try again.');
            }
        }
    }

    public openOwnerTeleportModal() {
        if (!this.isOwner) return;
        const modal = document.getElementById('owner-teleport-modal');
        const errEl = document.getElementById('owner-teleport-error');
        const input = document.getElementById('owner-teleport-input') as HTMLInputElement;
        if (errEl) errEl.style.display = 'none';
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 60);
        }
        if (modal) modal.style.display = 'flex';
        this.state = 'inspecting';
        this.updateCursorState();
        this.updateHotbarUI();
    }

    public closeOwnerTeleportModal() {
        const modal = document.getElementById('owner-teleport-modal');
        if (modal) modal.style.display = 'none';
        if (this.state === 'inspecting') {
            this.state = 'player_free';
        }
        this.updateCursorState();
        this.updateHotbarUI();
    }

    public teleportToCarriage(carNum: number): boolean {
        if (!this.isOwner) return false;

        // Teleport supports all carriages from 0 to 200 (Carriage 200 is the final carriage)
        if (isNaN(carNum) || carNum < 0 || carNum > 200) {
            const errEl = document.getElementById('owner-teleport-error');
            if (errEl) {
                errEl.innerText = this.lang === 'et' ? '❌ Sellist vagunit ei ole' : '❌ No such carriage exists';
                errEl.style.display = 'block';
            }
            metroAudio.playError();
            this.showThought(
                'Sellist vagunit ei ole.',
                'No such carriage exists.'
            );
            return false;
        }


        // If in intro, skip to active gameplay
        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];
        if (this.state === 'intro_station' || this.state === 'intro_boarding' || this.state === 'intro_inside') {
            this.skipIntro();
        }

        // Teleport to requested carriage
        this.loadCarriage(carNum, 'right');
        if (carNum === 200) {
            this.playerPos.set(0, 1.6, -46);
            this.cameraEuler.y = Math.PI;
        } else {
            this.playerPos.set(0, 1.6, -6.5);
            this.cameraEuler.y = 0;
        }
        this.state = 'player_free';
        metroAudio.playTeleport();

        this.closeOwnerTeleportModal();
        this.showThought(
            `⚡ Teleporditud vagunisse ${carNum}!`,
            `⚡ Teleported to carriage ${carNum}!`
        );
        return true;
    }
}
