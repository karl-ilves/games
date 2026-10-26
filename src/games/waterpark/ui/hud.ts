import { BuildCategory, SubCategory } from '../types';
import { PARK_ATTRACTIONS_CATALOG } from '../catalog';

export class WaterParkHUD {
    private onSelectItemCallback: (id: string) => void;
    private currentCategory: BuildCategory = 'pools';
    private currentSubCategory: SubCategory = 'main';

    constructor(onSelectItem: (id: string) => void) {
        this.onSelectItemCallback = onSelectItem;
        this.initEvents();
        this.renderCatalog();
    }

    private initEvents() {
        // Category tabs: Basseinid vs Veetorud
        const tabPools = document.getElementById('tab-cat-pools');
        const tabTubes = document.getElementById('tab-cat-tubes');

        tabPools?.addEventListener('click', () => {
            this.currentCategory = 'pools';
            this.currentSubCategory = 'main';
            tabPools.classList.add('active');
            tabTubes?.classList.remove('active');
            this.renderCatalog();
        });

        tabTubes?.addEventListener('click', () => {
            this.currentCategory = 'tubes';
            this.currentSubCategory = 'main';
            tabTubes.classList.add('active');
            tabPools?.classList.remove('active');
            this.renderCatalog();
        });

        // Open build drawer button
        const btnOpenBuild = document.getElementById('btn-open-build');
        const buildDrawer = document.getElementById('build-drawer');
        btnOpenBuild?.addEventListener('click', () => {
            const isOpen = buildDrawer?.style.display === 'flex';
            if (buildDrawer) buildDrawer.style.display = isOpen ? 'none' : 'flex';
        });

        const btnCloseDrawer = document.getElementById('btn-close-drawer');
        btnCloseDrawer?.addEventListener('click', () => {
            if (buildDrawer) buildDrawer.style.display = 'none';
        });
    }

    public renderCatalog() {
        const grid = document.getElementById('build-items-grid');
        const subNav = document.getElementById('drawer-subnav');
        if (!grid) return;
        grid.innerHTML = '';

        if (subNav) {
            subNav.innerHTML = '';
            // If in sub-category 'kids_tubes', show "Tagasi" button!
            // "kui selle peale vajutan ilmub nende asjade asemele tagasi nupp"
            if (this.currentCategory === 'tubes' && this.currentSubCategory === 'kids_tubes') {
                const backBtn = document.createElement('button');
                backBtn.className = 'btn-subnav-back';
                backBtn.innerHTML = '⬅️ Tagasi (Veetorude Peamenüü)';
                backBtn.addEventListener('click', () => {
                    this.currentSubCategory = 'main';
                    this.renderCatalog();
                });
                subNav.appendChild(backBtn);
            }
        }

        if (this.currentCategory === 'pools') {
            // Pools category: kids bassein, sügav bassein, pikk bassein
            const pools = PARK_ATTRACTIONS_CATALOG.filter(a => a.category === 'pools');
            pools.forEach(item => {
                const card = this.createItemCard(item);
                grid.appendChild(card);
            });
        } else if (this.currentCategory === 'tubes') {
            if (this.currentSubCategory === 'main') {
                // Main tubes menu: Torn + Laste veetoru folder/button
                const towerItem = PARK_ATTRACTIONS_CATALOG.find(a => a.id === 'tower_segment');
                if (towerItem) {
                    const card = this.createItemCard(towerItem);
                    grid.appendChild(card);
                }

                // Laste veetorud button
                const kidsFolderCard = document.createElement('div');
                kidsFolderCard.className = 'build-item-card folder-card';
                kidsFolderCard.innerHTML = `
                    <div class="card-icon">🛝</div>
                    <div class="card-info">
                        <div class="card-title" style="color: #00f2fe; font-size: 1.05rem;">👶 Laste Veetorud (Ava osad)</div>
                        <div class="card-desc">Start, otse toru, alla 20° toru, vasakule ja paremale pöörded.</div>
                    </div>
                    <button class="btn-build-item" style="background: #00f2fe; color: #0b1320;">Ava Valik ➔</button>
                `;
                kidsFolderCard.addEventListener('click', () => {
                    this.currentSubCategory = 'kids_tubes';
                    this.renderCatalog();
                });
                grid.appendChild(kidsFolderCard);
            } else if (this.currentSubCategory === 'kids_tubes') {
                // Inside "laste veetorud": start, otse, alla 20, paremale, vasakule
                const kidsPipes = PARK_ATTRACTIONS_CATALOG.filter(a => a.subCategory === 'kids_tubes');
                kidsPipes.forEach(item => {
                    const card = this.createItemCard(item);
                    grid.appendChild(card);
                });
            }
        }
    }

    private createItemCard(item: any): HTMLElement {
        const card = document.createElement('div');
        card.className = 'build-item-card';
        card.innerHTML = `
            <div class="card-icon">${item.icon}</div>
            <div class="card-info">
                <div class="card-title">${item.name}</div>
                <div class="card-desc">${item.description}</div>
            </div>
            <button class="btn-build-item" data-id="${item.id}">Vali</button>
        `;

        const btn = card.querySelector('.btn-build-item');
        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onSelectItemCallback(item.id);
            const buildDrawer = document.getElementById('build-drawer');
            if (buildDrawer) buildDrawer.style.display = 'none';
        });

        return card;
    }
}
