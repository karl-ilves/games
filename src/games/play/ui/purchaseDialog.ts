import * as THREE from 'three';
import { yardService } from '../../../shared/yardService';
import { PlayState } from '../state/playState';
import { playPlaySound } from '../audio';

export function promptPurchase(objData: any, group: THREE.Group, state: PlayState) {
    state.pendingPurchaseObject = { objData, group };
    const popup = document.getElementById('play-dialog-popup');
    const title = document.getElementById('play-dialog-title');
    const text = document.getElementById('play-dialog-text');
    const icon = document.getElementById('play-dialog-icon');
    const actions = document.getElementById('play-dialog-actions');
    if (popup && title && text) {
        if (icon) icon.innerText = objData.icon || '💎';
        title.innerText = `Osta: ${objData.name}`;
        text.innerText = `Kas soovid osta eseme "${objData.name}" hinnaga ${objData.pbxPrice} Playbuxi?\n(Müügitulu läheb loojale: ${state.currentGame?.creatorUsername || 'mängu looja'})`;
        if (actions) actions.style.display = 'flex';
        popup.style.display = 'block';
    }
}

export function setupPurchaseDialog(state: PlayState) {
    const confirmBtn = document.getElementById('btn-play-buy-confirm');
    const cancelBtn = document.getElementById('btn-play-buy-cancel');
    const popup = document.getElementById('play-dialog-popup');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (!state.pendingPurchaseObject) return;
            const { objData, group } = state.pendingPurchaseObject;
            const price = objData.pbxPrice || 0;
            const balance = yardService.getPlaybux();

            if (balance >= price) {
                yardService.spendPlaybux(price, objData.id || 'item', `Ostetud ese: ${objData.name}`);
                if (state.currentGame && state.currentGame.creatorUsername) {
                    yardService.creditCreatorRevenue(state.currentGame.creatorUsername, price, objData.name, state.currentGame.title);
                }
                state.equipPlayItemInHand(objData);
                group.visible = false;
                group.userData.isCollected = true;
                if (popup) popup.style.display = 'none';
                state.updatePlayHUD();
                playPlaySound('victory');
                alert(`💎 Ostsid eseme "${objData.name}" hinnaga ${price} PBX! Müügitulu laekus loojale (${state.currentGame?.creatorUsername}).`);
            } else {
                alert(`❌ Sul pole piisavalt Playbuxe! Sul on ${balance} PBX, aga vaja on ${price} PBX.`);
            }
            state.pendingPurchaseObject = null;
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (popup) popup.style.display = 'none';
            state.pendingPurchaseObject = null;
        });
    }
}
