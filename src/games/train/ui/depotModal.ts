import { yardService } from '../../../shared/yardService';
import { trainAudio } from '../audio';
import { TRAINS_CATALOG } from '../catalog';
import { getT, getTrainDesc, getTrainName } from '../i18n';
import {
    getActiveDepotCategory,
    getActiveTrainDef,
    getTrainMoney,
    getUnlockedTrainIds,
    saveUnlockedTrainIds,
    spendTrainMoney
} from '../state/trainState';
import { TrainDef } from '../types';

export function renderDepotModal(onSelectTrain: (train: TrainDef) => void) {
    const t = getT();
    const gridContainer = document.getElementById('trains-grid-container');
    const depotYardVal = document.getElementById('depot-yard-val');
    const depotMoneyVal = document.getElementById('depot-money-val');
    if (!gridContainer) return;

    const unlockedIds = getUnlockedTrainIds();
    const activeTrain = getActiveTrainDef();
    const currentActiveId = activeTrain.id;
    const currentYards = yardService.getYards();
    const currentMoney = getTrainMoney();

    if (depotYardVal) depotYardVal.innerText = currentYards.toLocaleString();
    if (depotMoneyVal) depotMoneyVal.innerText = currentMoney.toLocaleString();

    // Update Category Switcher Tabs UI
    const tabTrains = document.getElementById('tab-btn-trains');
    const tabMetros = document.getElementById('tab-btn-metros');
    const tabTrainsCount = document.getElementById('tab-trains-count');
    const tabMetrosCount = document.getElementById('tab-metros-count');

    const totalTrains = TRAINS_CATALOG.filter(tr => tr.category === 'train');
    const totalMetros = TRAINS_CATALOG.filter(tr => tr.category === 'metro');

    if (tabTrainsCount) tabTrainsCount.innerText = totalTrains.length.toString();
    if (tabMetrosCount) tabMetrosCount.innerText = totalMetros.length.toString();

    const activeDepotCategory = getActiveDepotCategory();

    if (tabTrains && tabMetros) {
        if (activeDepotCategory === 'train') {
            tabTrains.className = 'depot-tab-btn active';
            tabMetros.className = 'depot-tab-btn';
        } else {
            tabTrains.className = 'depot-tab-btn';
            tabMetros.className = 'depot-tab-btn active tab-metro';
        }
    }

    gridContainer.innerHTML = '';

    // Filter vehicles by category: Trains vs Metros
    const displayVehicles = TRAINS_CATALOG.filter(v => v.category === activeDepotCategory);

    displayVehicles.forEach(train => {
        const isUnlocked = unlockedIds.includes(train.id);
        const isActive = train.id === currentActiveId;
        const yardPrice = train.price * 5;

        const card = document.createElement('div');
        card.className = `train-card ${isActive ? 'active-train' : (!isUnlocked ? 'locked-train' : '')}`;

        let priceBadgeHtml = '';
        if (train.price === 0) {
            priceBadgeHtml = `<span class="train-price-badge badge-free">${t.free}</span>`;
        } else {
            priceBadgeHtml = `<span class="train-price-badge badge-price">🪙 ${train.price} €  ${t.or}  💎 ${yardPrice} Y</span>`;
        }

        let actionBtnHtml = '';
        if (isActive) {
            actionBtnHtml = `<button class="btn-train-select btn-selected" disabled>${t.selected}</button>`;
        } else if (isUnlocked) {
            actionBtnHtml = `<button class="btn-train-select btn-choose" data-train-id="${train.id}">${t.chooseTrain}</button>`;
        } else {
            actionBtnHtml = `
                <div style="display: flex; flex-direction: column; width: 100%; gap: 6px; margin-top: 8px;">
                    <button class="btn-train-select btn-buy-money" data-train-id="${train.id}" data-price="${train.price}">${t.buyMoney(train.price)}</button>
                    <button class="btn-train-select btn-buy-yard" data-train-id="${train.id}" data-price="${yardPrice}">${t.buyYard(yardPrice)}</button>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="train-icon">${train.icon}</div>
            <div class="train-title">${getTrainName(train)}</div>
            ${priceBadgeHtml}
            <div style="width: 100%; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; margin-bottom: 8px;">
                <div class="train-stat-row">
                    <span>${t.topSpeed}</span>
                    <strong>${train.maxSpeed} km/h</strong>
                </div>
                <div class="train-stat-row">
                    <span>${t.accel}</span>
                    <strong>${train.acceleration}x</strong>
                </div>
                <div class="train-stat-row">
                    <span>${t.capacity}</span>
                    <strong>${train.passengers} ${t.passengersUnit}</strong>
                </div>
            </div>
            <div style="font-size: 0.72rem; color: #64748b; line-height: 1.3; min-height: 28px; margin-bottom: 4px;">
                ${getTrainDesc(train)}
            </div>
            ${actionBtnHtml}
        `;

        gridContainer.appendChild(card);
    });

    // Attach Click Handlers
    gridContainer.querySelectorAll('.btn-choose').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const trainId = target.dataset.trainId;
            if (!trainId) return;
            const chosen = TRAINS_CATALOG.find(tr => tr.id === trainId);
            if (chosen) onSelectTrain(chosen);
        });
    });

    gridContainer.querySelectorAll('.btn-buy-money').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const trainId = target.dataset.trainId;
            const price = parseInt(target.dataset.price || '0', 10);
            if (!trainId) return;
            buyTrainWithMoney(trainId, price, onSelectTrain);
        });
    });

    gridContainer.querySelectorAll('.btn-buy-yard').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const trainId = target.dataset.trainId;
            const yardPrice = parseInt(target.dataset.price || '0', 10);
            if (!trainId) return;
            buyTrainWithYards(trainId, yardPrice, onSelectTrain);
        });
    });
}

export function showDepotMessage(text: string, isError: boolean = false) {
    const msgEl = document.getElementById('depot-msg');
    if (!msgEl) return;
    msgEl.innerText = text;
    msgEl.style.display = 'block';
    msgEl.style.background = isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(46, 204, 113, 0.2)';
    msgEl.style.border = isError ? '1px solid #ef4444' : '1px solid #2ecc71';
    msgEl.style.color = isError ? '#f87171' : '#4ade80';

    setTimeout(() => {
        if (msgEl) msgEl.style.display = 'none';
    }, 4000);
}

function buyTrainWithMoney(
    trainId: string,
    price: number,
    onSelectTrain: (train: TrainDef) => void
) {
    const t = getT();
    const train = TRAINS_CATALOG.find(tr => tr.id === trainId);
    if (!train) return;

    const success = spendTrainMoney(price);
    if (!success) {
        showDepotMessage(t.notEnoughMoney(price, getTrainMoney()), true);
        return;
    }

    const unlocked = getUnlockedTrainIds();
    if (!unlocked.includes(trainId)) {
        unlocked.push(trainId);
        saveUnlockedTrainIds(unlocked);
    }

    trainAudio.playCoinReward();
    showDepotMessage(t.boughtSuccessMoney(getTrainName(train), price), false);
    onSelectTrain(train);
}

function buyTrainWithYards(
    trainId: string,
    yardPrice: number,
    onSelectTrain: (train: TrainDef) => void
) {
    const t = getT();
    const train = TRAINS_CATALOG.find(tr => tr.id === trainId);
    if (!train) return;

    const success = yardService.spendYards(yardPrice, train.id, `Train purchase: ${getTrainName(train)}`);
    if (!success) {
        showDepotMessage(t.notEnoughYards(yardPrice, yardService.getYards()), true);
        return;
    }

    const unlocked = getUnlockedTrainIds();
    if (!unlocked.includes(trainId)) {
        unlocked.push(trainId);
        saveUnlockedTrainIds(unlocked);
    }

    trainAudio.playCoinReward();
    showDepotMessage(t.boughtSuccessYard(getTrainName(train), yardPrice), false);
    onSelectTrain(train);
}
