import { CookingState } from '../state/cookingState';
import { INGREDIENTS } from '../catalog';
import { kitchenAudio } from '../audio';

export class KitchenStations {
    private state: CookingState;
    private onPlateChanged: () => void;
    private onPanChanged: () => void;
    private onOvenChanged: () => void;
    private showPopup: (text: string) => void;

    constructor(
        state: CookingState,
        onPlateChanged: () => void,
        onPanChanged: () => void,
        onOvenChanged: () => void,
        showPopup: (text: string) => void
    ) {
        this.state = state;
        this.onPlateChanged = onPlateChanged;
        this.onPanChanged = onPanChanged;
        this.onOvenChanged = onOvenChanged;
        this.showPopup = showPopup;
    }

    public addToPlate(ingredientId: string): void {
        this.state.currentPlate.push(ingredientId);
        kitchenAudio.playChop();
        this.onPlateChanged();
    }

    public startChopping(rawId: string): void {
        this.state.currentChoppingRaw = rawId;
        this.state.choppingClicks = 0;

        const raw = INGREDIENTS[rawId];
        const activeArea = document.getElementById('chopping-active-area');
        const iconEl = document.getElementById('chopping-item-icon');
        const nameEl = document.getElementById('chopping-item-name');
        const progressEl = document.getElementById('chopping-progress-fill');
        const slicesCountEl = document.getElementById('chopping-slices-count');

        if (activeArea && iconEl && nameEl && progressEl) {
            activeArea.style.display = 'flex';
            iconEl.innerText = raw.icon;
            nameEl.innerText = this.state.getName(rawId);
            progressEl.style.width = '0%';
            if (slicesCountEl) {
                slicesCountEl.innerText = `${this.state.choppingClicks} / ${this.state.requiredChoppingClicks} ${
                    this.state.isEt ? 'viilu lõigatud' : 'slices cut'
                }`;
            }
        }
    }

    public handleChopClick(knife3D: THREE.Mesh | null): void {
        if (!this.state.currentChoppingRaw) return;

        this.state.choppingClicks++;
        kitchenAudio.playChop();

        const raw = INGREDIENTS[this.state.currentChoppingRaw];

        // 1. 2D Knife Slash Animation
        const knifeActor = document.getElementById('knife-actor-el');
        if (knifeActor) {
            knifeActor.classList.remove('chopping');
            void knifeActor.offsetWidth;
            knifeActor.classList.add('chopping');
            setTimeout(() => knifeActor.classList.remove('chopping'), 100);
        }

        // 2. 2D Food Impact & Squash Animation
        const foodTarget = document.getElementById('chopping-item-icon');
        if (foodTarget) {
            foodTarget.classList.remove('impact');
            void foodTarget.offsetWidth;
            foodTarget.classList.add('impact');
            setTimeout(() => foodTarget.classList.remove('impact'), 100);
        }

        // 3. Flying slice crumbs and cut lines
        const arena = document.getElementById('chopping-arena-el');
        if (arena && raw) {
            const crumb = document.createElement('div');
            crumb.className = 'flying-crumb';
            crumb.innerText = raw.icon;
            const angle = Math.random() * Math.PI - Math.PI / 2;
            const dist = 40 + Math.random() * 50;
            crumb.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
            crumb.style.setProperty('--ty', `${-Math.abs(Math.sin(angle) * dist) - 20}px`);
            crumb.style.setProperty('--rot', `${(Math.random() - 0.5) * 360}deg`);
            arena.appendChild(crumb);
            setTimeout(() => crumb.remove(), 400);

            const cut = document.createElement('div');
            cut.className = 'cut-line';
            cut.style.left = `${90 + this.state.choppingClicks * 18 + (Math.random() * 8 - 4)}px`;
            cut.style.top = `${45 + (Math.random() * 16 - 8)}px`;
            cut.style.transform = `rotate(${(Math.random() - 0.5) * 30}deg)`;
            arena.appendChild(cut);
            setTimeout(() => cut.remove(), 800);
        }

        // 4. 3D Knife Animation
        if (knife3D) {
            knife3D.rotation.z = -0.4;
            knife3D.position.y = 1.44;
            setTimeout(() => {
                knife3D.rotation.z = 0;
                knife3D.position.y = 1.5;
            }, 90);
        }

        // 5. Progress Bar and Count
        const pct = (this.state.choppingClicks / this.state.requiredChoppingClicks) * 100;
        const progressEl = document.getElementById('chopping-progress-fill');
        if (progressEl) progressEl.style.width = `${pct}%`;

        const slicesCountEl = document.getElementById('chopping-slices-count');
        if (slicesCountEl) {
            slicesCountEl.innerText = `${this.state.choppingClicks} / ${this.state.requiredChoppingClicks} ${
                this.state.isEt ? 'viilu lõigatud' : 'slices cut'
            }`;
        }

        // 6. Check Completion
        if (this.state.choppingClicks >= this.state.requiredChoppingClicks) {
            if (raw && raw.chopResult) {
                this.addToPlate(raw.chopResult);
                const resName = this.state.getName(raw.chopResult);
                this.showPopup(
                    this.state.isEt
                        ? `🍽️ +1 ${resName} viilutatud ja pandud otse taldrikule! 🔪✨`
                        : `🍽️ +1 ${resName} sliced and added to plate! 🔪✨`
                );
            }
            this.state.currentChoppingRaw = null;
            this.state.choppingClicks = 0;
            const activeArea = document.getElementById('chopping-active-area');
            if (activeArea) activeArea.style.display = 'none';
        }
    }

    public putOnPan(panId: number, rawId: string): void {
        const pan = this.state.pans[panId];
        if (!pan || pan.holding || pan.state !== 'empty') return;

        pan.holding = rawId;
        pan.progress = 0;
        pan.washProgress = 0;
        pan.state = 'cooking';
        kitchenAudio.playSizzle(true);
        this.onPanChanged();
    }

    public takeFromPan(panId: number): void {
        const pan = this.state.pans[panId];
        if (!pan || !pan.holding || (pan.state !== 'done' && pan.state !== 'burned')) return;

        const rawItem = pan.holding;
        const isDone = pan.state === 'done';

        pan.holding = null;
        pan.progress = 0;
        pan.washProgress = 0;
        pan.state = 'washing';

        this.onPanChanged();

        if (isDone) {
            const raw = INGREDIENTS[rawItem];
            const resultId = raw?.cookResult || rawItem;
            this.addToPlate(resultId);
            kitchenAudio.playServe();
            const resName = this.state.getName(resultId);
            this.showPopup(
                this.state.isEt
                    ? `🍽️ +1 ${resName} pandud taldrikule! 🧼 ${pan.nameEt} peseb 30s!`
                    : `🍽️ +1 ${resName} added to plate! 🧼 ${pan.nameEn} washing 30s!`
            );
        } else {
            kitchenAudio.playBurn();
            this.showPopup(
                this.state.isEt
                    ? `🔥 Kõrbenud toit visatud minema! 🧼 ${pan.nameEt} peseb 30s!`
                    : `🔥 Burned food thrown away! 🧼 ${pan.nameEn} washing 30s!`
            );
        }

        const anyCooking = this.state.pans.some(p => p.state === 'cooking');
        if (!anyCooking) kitchenAudio.playSizzle(false);
    }

    public bakePizza(): void {
        this.state.oven.state = 'baking';
        this.state.oven.progress = 0;
        this.onOvenChanged();
    }

    public takeFromOven(): void {
        if (this.state.oven.state !== 'done') return;
        this.state.oven.state = 'empty';
        this.state.oven.progress = 0;
        this.onOvenChanged();

        this.addToPlate('baked_in_oven');
        kitchenAudio.playServe();
        this.showPopup(
            this.state.isEt
                ? '🍽️ +1 Küpsetatud Pitsa pandud otse taldrikule! 🍕✨'
                : '🍽️ +1 Baked Pizza added to plate! 🍕✨'
        );
    }

    public tickCooking(): void {
        let stateChanged = false;

        this.state.pans.forEach(pan => {
            if (pan.state === 'cooking') {
                pan.progress += 1.0;
                if (pan.progress >= 100 && pan.progress < 200) {
                    if (pan.state !== 'done') {
                        pan.state = 'done';
                        stateChanged = true;
                    }
                } else if (pan.progress >= 200) {
                    if (pan.state !== 'burned') {
                        pan.state = 'burned';
                        stateChanged = true;
                    }
                }

                const panCard = document.querySelector(`.pan-card[data-pan-id="${pan.id}"]`);
                if (panCard && pan.state === 'cooking') {
                    const statusEl = panCard.querySelector('.pan-status-text');
                    const fillEl = panCard.querySelector('.pan-heat-fill') as HTMLElement;
                    const ingName = this.state.getName(pan.holding || '');
                    if (statusEl) {
                        statusEl.innerHTML = `<strong style="color: #ffd32a; animation: pulse 1s infinite;">🔥 ${
                            this.state.isEt ? 'PRAEB:' : 'COOKING:'
                        } ${ingName} (${Math.round(pan.progress)}%)</strong>`;
                    }
                    if (fillEl) {
                        fillEl.style.width = `${Math.min(100, pan.progress)}%`;
                    }
                }
            } else if (pan.state === 'washing') {
                pan.washProgress += 100 / 300;
                const timeLeft = Math.max(0, Math.ceil(30 - (pan.washProgress / 100) * 30));

                if (pan.washProgress >= 100) {
                    pan.state = 'empty';
                    pan.washProgress = 0;
                    pan.progress = 0;
                    pan.holding = null;
                    stateChanged = true;
                    kitchenAudio.playSuccess();
                } else {
                    const panCard = document.querySelector(`.pan-card[data-pan-id="${pan.id}"]`);
                    if (panCard) {
                        const statusEl = panCard.querySelector('.pan-status-text');
                        const fillEl = panCard.querySelector('.pan-heat-fill') as HTMLElement;
                        if (statusEl) {
                            statusEl.innerHTML = `<strong style="color: #00f2fe; animation: pulse 1s infinite;">🧼 ${
                                this.state.isEt ? 'PESEMINE:' : 'WASHING:'
                            } ${timeLeft}s (${Math.round(pan.washProgress)}%)</strong>`;
                        }
                        if (fillEl) {
                            fillEl.style.width = `${Math.min(100, pan.washProgress)}%`;
                            fillEl.style.background = 'linear-gradient(90deg, #00f2fe, #4facfe)';
                        }
                    }
                }
            }
        });

        if (stateChanged) {
            this.onPanChanged();
        }

        if (this.state.oven.state === 'baking') {
            this.state.oven.progress += 1.0;
            if (this.state.oven.progress >= 100) {
                this.state.oven.state = 'done';
                kitchenAudio.playBell();
                this.onOvenChanged();
            } else {
                const fillEl = document.getElementById('oven-progress-fill');
                if (fillEl) {
                    fillEl.style.width = `${this.state.oven.progress}%`;
                }
            }
        }
    }
}
