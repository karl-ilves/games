import { yardService } from '../../../shared/yardService';
import { CookingState } from '../state/cookingState';
import { INGREDIENTS, RECIPES } from '../catalog';

export class CookingHud {
    private state: CookingState;

    constructor(state: CookingState) {
        this.state = state;
    }

    public applyLocalization(): void {
        const isEt = this.state.isEt;

        const backHub = document.querySelector('#btn-back-hub span:last-child');
        if (backHub) backHub.textContent = isEt ? 'Pealeht / Hub' : 'Back to Hub';

        const hudScoreLabel = document.getElementById('hud-score-label');
        if (hudScoreLabel) hudScoreLabel.textContent = isEt ? '⭐ Punktid:' : '⭐ Score:';

        const hudStreakLabel = document.getElementById('hud-streak-label');
        if (hudStreakLabel) hudStreakLabel.textContent = isEt ? '🔥 Seeria (300p = +50 Y):' : '🔥 Streak (300pts = +50 Y):';

        const hudOrdersLabel = document.getElementById('hud-orders-label');
        if (hudOrdersLabel) hudOrdersLabel.textContent = isEt ? '📦 Tellimused:' : '📦 Orders:';

        const btnOpenRecipes = document.querySelector('#btn-open-recipes span:last-child');
        if (btnOpenRecipes) btnOpenRecipes.textContent = isEt ? 'Retseptid' : 'Recipes';

        const ordersTitle = document.querySelector('.orders-header-title span:last-child');
        if (ordersTitle) ordersTitle.textContent = isEt
            ? 'Aktiivsed Klienditellimused (Valmista retsepti järgi ja teeni Jarde):'
            : 'Active Customer Orders (Follow recipes and earn Yards):';

        const tabAssembly = document.querySelector('#tab-btn-assembly span:last-child');
        if (tabAssembly) tabAssembly.textContent = isEt ? '1. Taldrik & Komplekteerimine' : '1. Plate Assembly';

        const tabStove = document.querySelector('#tab-btn-stove span:last-child');
        if (tabStove) tabStove.textContent = isEt ? '2. PLIIT & PRAADIMINE (KÜPSETA SIIN!)' : '2. STOVE & FRYING (COOK HERE!)';

        const tabOven = document.querySelector('#tab-btn-oven span:last-child');
        if (tabOven) tabOven.textContent = isEt ? '3. KÜPSETUSAHI (KÜPSETA PITSA!)' : '3. BAKING OVEN (BAKE PIZZA!)';

        const tabCutting = document.querySelector('#tab-btn-cutting span:last-child');
        if (tabCutting) tabCutting.textContent = isEt ? '4. Lõikelaud (Haki toorained)' : '4. Cutting Board (Chop items)';

        const assemblyInstruction = document.querySelector('#panel-assembly .station-panel-title-hint');
        if (assemblyInstruction) assemblyInstruction.textContent = isEt
            ? 'Vali ja klõpsa siit alt valmis toiduained (praetud pihvid, hakitud köögiviljad, saiad jne) taldrikule lisamiseks:'
            : 'Select and click finished ingredients below (patties, chopped veggies, buns, etc.) to add to plate:';

        const plateTitle = document.querySelector('.plate-assembly-row strong');
        if (plateTitle) plateTitle.textContent = isEt ? 'Sinu Taldrik:' : 'Your Plate:';

        const plateEmpty = document.getElementById('plate-empty-msg');
        if (plateEmpty) plateEmpty.textContent = isEt
            ? 'Taldrik on tühi. Vali sahvrist koostisosi või võta valminud toidud pliidilt/lõikelaualt!'
            : 'Plate is empty. Pick ingredients from pantry or take cooked/sliced food from stations!';

        const clearBtn = document.getElementById('btn-clear-plate');
        if (clearBtn) {
            clearBtn.textContent = isEt ? '🗑️ Tühjenda' : '🗑️ Clear Plate';
            clearBtn.setAttribute('title', isEt ? 'Tühjenda taldrik' : 'Clear plate');
        }

        const serveBtnText = document.querySelector('#btn-serve-dish span:last-child');
        if (serveBtnText) serveBtnText.textContent = isEt ? 'SERVEERI TOIT!' : 'SERVE DISH!';

        const chopHead = document.querySelector('.chopping-board-box h3');
        if (chopHead) chopHead.textContent = isEt ? '🔪 Lõikelaud & Hakkimise Animatsioon' : '🔪 Cutting Board & Chopping Animation';

        const chopInstruction = document.getElementById('chopping-instruction');
        if (chopInstruction) chopInstruction.textContent = isEt
            ? 'Vali tooraine (Tomat, Juust, Sibul, Salat, Seened, Pepperoni) ja klõpsa "HAKI!" nuppu viilutamiseks!'
            : 'Select raw item (Tomato, Cheese, Onion, Lettuce, Mushrooms, Pepperoni) and click "CHOP!" rapidly to slice!';

        const chopBtn = document.getElementById('btn-do-chop');
        if (chopBtn) chopBtn.textContent = isEt ? '🔪 HAKI! (Klõpsa kiiresti)' : '🔪 CHOP! (Click rapidly)';

        const stoveHead = document.querySelector('#panel-stove h3');
        if (stoveHead) stoveHead.textContent = isEt ? '🔥 Pliit & Praepannid' : '🔥 Stove & Cooking Pans';

        const stoveSub = document.querySelector('#panel-stove .station-panel-desc');
        if (stoveSub) stoveSub.textContent = isEt ? 'Pane tooraine pannile ja jälgi, et see ei kõrbeks!' : 'Place raw items in pans and make sure they do not burn!';

        const ovenHead = document.querySelector('#panel-oven h3');
        if (ovenHead) ovenHead.textContent = isEt ? '🍕 Küpsetusahi (Pitsa & Pirukad)' : '🍕 Baking Oven (Pizza & Pastries)';

        const ovenSub = document.querySelector('#panel-oven .station-panel-desc');
        if (ovenSub) ovenSub.textContent = isEt
            ? 'Valmista pitsapõhi, lisa kaste, juust ja lisandid ning pane ahju küpsema!'
            : 'Prepare pizza crust, add sauce, cheese and toppings, then bake in the oven!';

        const recipesHead = document.querySelector('#modal-recipes h2');
        if (recipesHead) recipesHead.textContent = isEt ? '📖 Peakoka Retseptiraamat' : '📖 Master Chef Recipe Book';

        const recipesSub = document.querySelector('#modal-recipes p');
        if (recipesSub) recipesSub.textContent = isEt
            ? 'Vaata, milliseid koostisosi on vaja erinevate roogade valmistamiseks!'
            : 'View all recipes and required ingredients to satisfy customer orders!';
    }

    public updateScoreDisplay(): void {
        const scoreEl = document.getElementById('hud-score');
        const streakEl = document.getElementById('hud-streak');
        const countEl = document.getElementById('hud-orders-count');

        if (scoreEl) scoreEl.innerText = this.state.score.toLocaleString();
        if (streakEl) streakEl.innerText = `${this.state.streakPoints}/300`;
        if (countEl) countEl.innerText = this.state.completedOrders.toString();
    }

    public updateYardDisplay(): void {
        const yardsEl = document.getElementById('hud-yards-val');
        if (yardsEl) {
            yardsEl.innerText = yardService.getYards().toLocaleString();
        }
    }

    public renderPlateUI(onRemoveItem: (index: number) => void): void {
        const container = document.getElementById('plate-items-container');
        const emptyMsg = document.getElementById('plate-empty-msg');
        if (!container) return;

        if (this.state.currentPlate.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            container.innerHTML = '';
            if (emptyMsg) container.appendChild(emptyMsg);
            return;
        }

        if (emptyMsg) emptyMsg.style.display = 'none';
        container.innerHTML = '';

        this.state.currentPlate.forEach((id, index) => {
            const ing = INGREDIENTS[id] || { nameEt: id, nameEn: id, icon: '🥘' };
            const ingName = this.state.getName(id);
            const badge = document.createElement('div');
            badge.className = 'plate-item-badge';
            badge.innerHTML = `
                <span>${ing.icon}</span>
                <span>${ingName}</span>
                <span style="cursor: pointer; color: #ff6b81; font-weight: bold; margin-left: 4px;" data-idx="${index}">✕</span>
            `;
            badge.querySelector('span:last-child')?.addEventListener('click', (e) => {
                e.stopPropagation();
                onRemoveItem(index);
            });
            container.appendChild(badge);
        });
    }

    public renderPantryItems(onAddToPlate: (id: string) => void): void {
        const groupPantry = document.getElementById('pantry-group-pantry');
        if (!groupPantry) return;

        groupPantry.innerHTML = '';
        const isEt = this.state.isEt;

        Object.values(INGREDIENTS).forEach(ing => {
            if (ing.category === 'pantry' || ing.category === 'sauce') {
                const ingName = this.state.getName(ing.id);
                const btn = document.createElement('button');
                btn.className = 'ingredient-btn';
                btn.setAttribute('data-id', ing.id);
                btn.innerHTML = `
                    <span class="ingredient-icon">${ing.icon}</span>
                    <span class="ingredient-label">${ingName}</span>
                    <span style="font-size: 0.7rem; color: #2ed573; font-weight: bold;">${isEt ? '+ Lisa taldrikule' : '+ Add to plate'}</span>
                `;
                btn.addEventListener('click', () => onAddToPlate(ing.id));
                groupPantry.appendChild(btn);
            }
        });
    }

    public renderStovePans(): void {
        const container = document.getElementById('stove-pans-container');
        if (!container) return;

        const isEt = this.state.isEt;

        container.innerHTML = this.state.pans.map(pan => {
            const panName = isEt ? pan.nameEt : pan.nameEn;
            let statusText = `<span style="color: #a4b0be;">${isEt ? 'Tühi - Vali tooraine küpsetamiseks!' : 'Empty - Select item to cook!'}</span>`;
            let btnAction = `
                <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; align-items: center;">
                    <span style="font-size: 0.85rem; color: #ffd32a; font-weight: 800;">${isEt ? '👇 VALI TOORAINE KÜPSETAMISEKS:' : '👇 SELECT ITEM TO COOK:'}</span>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                        <button class="btn-action btn-add-pan" data-pan="${pan.id}" data-item="raw_patty" style="background: linear-gradient(135deg, #e74c3c, #c0392b); border-color: #ff7675; font-size: 0.95rem; padding: 10px 16px; font-weight: 900; cursor: pointer; border-radius: 8px;">
                            🥩 ${isEt ? 'Prae Pihv' : 'Fry Patty'} (🔥)
                        </button>
                        <button class="btn-action btn-add-pan" data-pan="${pan.id}" data-item="raw_steak" style="background: linear-gradient(135deg, #d35400, #e67e22); border-color: #f39c12; font-size: 0.95rem; padding: 10px 16px; font-weight: 900; cursor: pointer; border-radius: 8px;">
                            🥩 ${isEt ? 'Prae Steak' : 'Fry Steak'} (🔥)
                        </button>
                        <button class="btn-action btn-add-pan" data-pan="${pan.id}" data-item="raw_pasta" style="background: linear-gradient(135deg, #2980b9, #3498db); border-color: #74b9ff; font-size: 0.95rem; padding: 10px 16px; font-weight: 900; cursor: pointer; border-radius: 8px;">
                            🍝 ${isEt ? 'Keeda Pasta' : 'Boil Pasta'} (💧)
                        </button>
                    </div>
                </div>
            `;

            if (pan.holding) {
                const ingName = this.state.getName(pan.holding);
                if (pan.state === 'cooking') {
                    statusText = `<strong style="color: #ffd32a; font-size: 1.1rem; animation: pulse 1s infinite;">🔥 ${isEt ? 'PRAEB:' : 'COOKING:'} ${ingName} (${Math.round(pan.progress)}%)</strong>`;
                    btnAction = `<span style="font-size: 0.9rem; color: #ffd32a; font-weight: bold;">⏳ ${isEt ? 'Küpseb... oota kuni valmib!' : 'Cooking... wait until done!'}</span>`;
                } else if (pan.state === 'done') {
                    const raw = INGREDIENTS[pan.holding];
                    const resultId = raw?.cookResult || pan.holding;
                    const resultName = this.state.getName(resultId);
                    statusText = `<strong style="color: #2ed573; font-size: 1.2rem;">✨🔥 ${isEt ? 'VALMIS:' : 'READY:'} ${resultName}</strong>`;
                    btnAction = `
                        <button class="btn-action btn-take-pan" data-pan="${pan.id}" style="background: linear-gradient(135deg, #2ed573, #10ac84); font-weight: 900; font-size: 1.1rem; padding: 12px 28px; box-shadow: 0 0 20px #2ed573; cursor: pointer; border-radius: 10px;">
                            🍽️ ${isEt ? 'VÕTA TALDRIKULE' : 'TAKE TO PLATE'}
                        </button>
                    `;
                } else if (pan.state === 'burned') {
                    statusText = `<strong style="color: #ff4757; font-size: 1.1rem;">🔥 ${isEt ? 'KÕRBENUD!' : 'BURNED!'}</strong>`;
                    btnAction = `<button class="btn-action btn-take-pan" data-pan="${pan.id}" style="background: #eb4d4b; font-weight: bold; font-size: 1rem; padding: 10px 20px; cursor: pointer; border-radius: 8px;">🗑️ ${isEt ? 'Viska minema' : 'Throw away'}</button>`;
                }
            } else if (pan.state === 'washing') {
                const timeLeft = Math.max(0, Math.ceil(30 - (pan.washProgress / 100) * 30));
                statusText = `<strong style="color: #00f2fe; font-size: 1.15rem; animation: pulse 1s infinite;">🧼 ${isEt ? 'PESEMINE:' : 'WASHING:'} ${timeLeft}s (${Math.round(pan.washProgress)}%)</strong>`;
                btnAction = `<span style="font-size: 0.95rem; color: #70a1ff; font-weight: 700;">🧼 ${isEt ? 'Pann peseb ja jahtub (30s)... oota enne uue tegemist!' : 'Pan is washing (30s)... please wait!'}</span>`;
            }

            const fillWidth = pan.state === 'washing' ? Math.min(100, pan.washProgress) : Math.min(100, pan.progress);
            const fillColor = pan.state === 'washing'
                ? 'linear-gradient(90deg, #00f2fe, #4facfe)'
                : (pan.state === 'burned' ? '#eb4d4b' : (pan.state === 'done' ? '#2ed573' : '#ffd32a'));
            const borderColor = pan.state === 'washing'
                ? '#00f2fe'
                : (pan.state === 'done' ? '#2ed573' : (pan.state === 'cooking' ? '#ff793f' : 'rgba(255,255,255,0.12)'));
            const bgColor = pan.state === 'washing'
                ? 'rgba(0, 242, 254, 0.08)'
                : (pan.state === 'cooking' ? 'rgba(255, 121, 63, 0.1)' : '#1e272e');

            return `
                <div class="pan-card" data-pan-id="${pan.id}" style="border: 2px solid ${borderColor}; background: ${bgColor}; padding: 18px; border-radius: 14px;">
                    <strong style="color: #ffd32a; font-size: 1.25rem;">🍳 ${panName}</strong>
                    <div class="pan-status-text" style="font-size: 1.05rem; color: #dfe6e9; margin: 8px 0;">${statusText}</div>
                    <div class="pan-heat-bar" style="height: 12px; border-radius: 6px; margin-bottom: 10px;">
                        <div class="pan-heat-fill" style="width: ${fillWidth}%; background: ${fillColor};"></div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 8px; width: 100%;">
                        ${btnAction}
                    </div>
                </div>
            `;
        }).join('');
    }

    public renderOvenStatus(): void {
        const box = document.getElementById('oven-status-box');
        if (!box) return;

        const isEt = this.state.isEt;

        if (this.state.oven.state === 'empty') {
            box.innerHTML = `
                <div style="font-size: 2.2rem;">🍕</div>
                <div style="text-align: left;">
                    <strong>${isEt ? 'Ahi on tühi' : 'Oven is empty'}</strong>
                    <div style="font-size: 0.8rem; color: #a4b0be;">${isEt ? 'Pane pitsapõhi ahju küpsema!' : 'Put pizza crust into oven to bake!'}</div>
                </div>
                <button class="btn-action" id="btn-oven-bake-pizza" style="background: #e67e22; font-weight: bold; padding: 10px 20px; cursor: pointer; border-radius: 8px;">
                    🍕 ${isEt ? 'Pane Pitsa Ahju (10s)' : 'Put Pizza into Oven (10s)'}
                </button>
            `;
        } else if (this.state.oven.state === 'baking') {
            box.innerHTML = `
                <div style="font-size: 2.2rem; animation: pulse 1s infinite;">🔥</div>
                <div style="text-align: left;">
                    <strong style="color: #ffd32a;">${isEt ? 'Pitsa küpseb ahjus...' : 'Pizza is baking in the oven...'}</strong>
                    <div style="width: 180px; height: 8px; background: #2f3542; border-radius: 4px; overflow: hidden; margin-top: 6px;">
                        <div id="oven-progress-fill" style="width: ${this.state.oven.progress}%; height: 100%; background: #ffd32a; transition: width 0.2s;"></div>
                    </div>
                </div>
            `;
        } else if (this.state.oven.state === 'done') {
            box.innerHTML = `
                <div style="font-size: 2.2rem;">✨🍕</div>
                <div style="text-align: left;">
                    <strong style="color: #2ed573; font-size: 1.05rem;">${isEt ? 'Pitsa on valmis ja krõbe!' : 'Pizza is ready and crispy!'}</strong>
                </div>
                <button class="btn-action" id="btn-oven-take-pizza" style="background: linear-gradient(135deg, #2ed573, #10ac84); font-weight: 900; font-size: 0.95rem; padding: 10px 20px; box-shadow: 0 0 15px #2ed573; cursor: pointer; border-radius: 8px;">
                    🍽️ ${isEt ? 'VÕTA TALDRIKULE' : 'TAKE TO PLATE'}
                </button>
            `;
        }
    }

    public renderOrdersQueue(): void {
        const container = document.getElementById('orders-queue-container');
        if (!container) return;

        const isEt = this.state.isEt;

        container.innerHTML = this.state.activeOrders.map(order => {
            const ingList = order.requiredIngredients.map(id => {
                const ing = INGREDIENTS[id] || { nameEt: id, nameEn: id, icon: '🥘', category: 'pantry' };
                const ingName = this.state.getName(id);

                let tagBadge = `<span class="tag-pantry">${isEt ? '🍞 Sahvrist' : '🍞 Pantry'}</span>`;
                if (ing.category === 'cooked') {
                    if (id === 'baked_in_oven') {
                        tagBadge = `<span class="tag-need-oven">${isEt ? '🍕 AHJUS KÜPSETADA' : '🍕 BAKE IN OVEN'}</span>`;
                    } else {
                        tagBadge = `<span class="tag-need-cook">${isEt ? '🔥 KÜPSETA PLIIDIL' : '🔥 COOK ON STOVE'}</span>`;
                    }
                } else if (ing.category === 'chopped') {
                    tagBadge = `<span class="tag-need-chop">${isEt ? '🔪 HAKI LÕIKELAUAL' : '🔪 CHOP ON BOARD'}</span>`;
                }

                return `
                    <li style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 2px 0; border-bottom: 1px dashed #ecf0f1;">
                        <span style="display: flex; align-items: center; gap: 4px; font-weight: 600;">
                            <span>${ing.icon}</span> <span>${ingName}</span>
                        </span>
                        ${tagBadge}
                    </li>
                `;
            }).join('');

            const pct = Math.max(0, (order.currentPatience / order.maxPatience) * 100);
            const barColor = pct < 30 ? '#ff4757' : (pct < 60 ? '#ffa502' : '#2ed573');
            const title = this.state.getRecipeTitle(order);

            return `
                <div class="order-ticket" id="ticket-${order.id}">
                    <div class="ticket-title">
                        <span>${order.icon} ${title}</span>
                    </div>
                    <div style="margin: 4px 0 8px 0;">
                        <span style="background: linear-gradient(135deg, #00f2fe, #2ecc71); color: #111; font-weight: 900; font-size: 0.78rem; padding: 3px 8px; border-radius: 8px; box-shadow: 0 0 8px rgba(0,242,254,0.4); display: inline-flex; align-items: center; gap: 4px;">
                            ⭐ ${isEt ? 'TEENID: +30 PUNKTI (300p ➔ +50 Y)' : 'EARN: +30 PTS (300p ➔ +50 Y)'}
                        </span>
                    </div>
                    <ul class="ticket-recipe-list">
                        ${ingList}
                    </ul>
                    <div class="patience-bar-wrap">
                        <div class="patience-bar" style="width: ${pct}%; background: ${barColor};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    public showScorePopup(text: string): void {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.innerText = text;
        popup.style.left = `${window.innerWidth / 2 - 120}px`;
        popup.style.top = `${window.innerHeight / 2 - 50}px`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1200);
    }
}
