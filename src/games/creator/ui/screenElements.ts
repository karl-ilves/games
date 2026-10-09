import { ScreenElement, ScreenElementType } from '../types';
import { csState, isPlayTestMode } from '../state/creatorState';
import { autoSaveDraft } from './creatorUI';
import { playGameSound } from '../audio';
import { healPlayer, boostPlayerSpeed, collectCoin } from '../systems/physics';

let currentlyEditingElementId: string | null = null;
let isDraggingScreenElement = false;
let dragElementId: string | null = null;
let dragStartPos = { x: 0, y: 0 };
let elemStartPos = { x: 0, y: 0 };

/**
 * Initializes the Screen Elements system (UI listeners, dropdown, modal handlers)
 */
export function initScreenElementsSystem() {
    setupDropdownListeners();
    setupEditModalListeners();
    renderScreenElements();
}

/**
 * Sets up the dropdown menu next to 'Add Block'
 */
function setupDropdownListeners() {
    const btnToggle = document.getElementById('btn-add-screen-element');
    const menu = document.getElementById('screen-element-dropdown-menu');

    btnToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu) {
            menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (menu && menu.style.display === 'flex') {
            const target = e.target as HTMLElement;
            if (!target.closest('#screen-element-dropdown-wrapper')) {
                menu.style.display = 'none';
            }
        }
    });

    // 1. Nupp (Button)
    document.getElementById('btn-add-screen-btn')?.addEventListener('click', () => {
        if (menu) menu.style.display = 'none';
        addScreenElement('button');
    });

    // 2. Ekraan (Screen panel)
    document.getElementById('btn-add-screen-panel')?.addEventListener('click', () => {
        if (menu) menu.style.display = 'none';
        addScreenElement('screen');
    });

    // 3. Lae oma pilt nupp (Custom image button)
    document.getElementById('btn-add-screen-img-btn')?.addEventListener('click', () => {
        if (menu) menu.style.display = 'none';
        addScreenElement('image_button');
    });

    // 4. Lae oma pilt ekraan (Custom image screen display)
    document.getElementById('btn-add-screen-img-panel')?.addEventListener('click', () => {
        if (menu) menu.style.display = 'none';
        addScreenElement('image_screen');
    });
}

/**
 * Adds a new screen element to the game
 */
export function addScreenElement(type: ScreenElementType, customData?: Partial<ScreenElement>): ScreenElement {
    const list: ScreenElement[] = csState.screenElements || [];
    const count = list.length + 1;
    const id = 'screen_el_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    let defaultTitle = 'Nupp';
    let defaultWidth = 140;
    let defaultHeight = 48;
    let defaultBg = 'linear-gradient(135deg, #10b981, #059669)';
    let defaultTextColor = '#ffffff';

    if (type === 'screen') {
        defaultTitle = 'Ekraani Paneel';
        defaultWidth = 260;
        defaultHeight = 160;
        defaultBg = 'rgba(15, 23, 42, 0.92)';
    } else if (type === 'image_button') {
        defaultTitle = 'Pildi Nupp';
        defaultWidth = 80;
        defaultHeight = 80;
        defaultBg = 'rgba(255, 255, 255, 0.1)';
    } else if (type === 'image_screen') {
        defaultTitle = 'Pildi Ekraan';
        defaultWidth = 240;
        defaultHeight = 180;
        defaultBg = 'rgba(15, 23, 42, 0.92)';
    }

    // Default position staggered across screen
    const defaultX = 60 + ((count * 30) % 300);
    const defaultY = 120 + ((count * 30) % 250);

    const newElement: ScreenElement = {
        id,
        type,
        name: `${defaultTitle} ${count}`,
        text: type === 'button' ? 'Vajuta siia!' : (type === 'screen' ? 'Tere tulemast mängu! Siin on sinu teade.' : ''),
        imageUrl: (type === 'image_button' || type === 'image_screen') 
            ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231e293b" rx="12"/><text x="50" y="55" font-size="34" text-anchor="middle" dominant-baseline="middle">🖼️</text></svg>'
            : undefined,
        position: { x: defaultX, y: defaultY },
        size: { width: defaultWidth, height: defaultHeight },
        backgroundColor: defaultBg,
        textColor: defaultTextColor,
        borderRadius: type === 'image_button' ? 16 : 12,
        fontSize: type === 'button' ? 15 : 14,
        action: (type === 'button' || type === 'image_button') ? { type: 'message', value: 'Vajutasid ekraaninuppu! 🎉' } : undefined,
        visible: true,
        ...customData
    };

    list.push(newElement);
    csState.screenElements = list;
    renderScreenElements();
    autoSaveDraft();

    // Automatically open editor for image elements so user can upload right away
    if (type === 'image_button' || type === 'image_screen') {
        openScreenElementEditor(newElement);
    }

    return newElement;
}

/**
 * Renders all screen elements inside #screen-gui-container
 */
export function renderScreenElements() {
    const container = document.getElementById('screen-gui-container');
    if (!container) return;

    container.innerHTML = '';
    const list: ScreenElement[] = csState.screenElements || [];
    const inPlayMode = isPlayTestMode;

    list.forEach(elem => {
        if (elem.visible === false) return;

        const elDiv = document.createElement('div');
        elDiv.id = `gui-${elem.id}`;
        elDiv.className = 'screen-gui-element';
        elDiv.setAttribute('data-id', elem.id);

        // Styling
        elDiv.style.position = 'absolute';
        elDiv.style.left = `${elem.position.x}px`;
        elDiv.style.top = `${elem.position.y}px`;
        elDiv.style.width = `${elem.size.width}px`;
        elDiv.style.height = `${elem.size.height}px`;
        elDiv.style.borderRadius = `${elem.borderRadius ?? 10}px`;
        elDiv.style.boxSizing = 'border-box';
        elDiv.style.pointerEvents = 'auto';
        elDiv.style.userSelect = 'none';
        elDiv.style.display = 'flex';
        elDiv.style.flexDirection = 'column';
        elDiv.style.alignItems = 'center';
        elDiv.style.justifyContent = 'center';
        elDiv.style.overflow = 'hidden';
        elDiv.style.transition = inPlayMode ? 'transform 0.1s, box-shadow 0.1s' : 'none';
        elDiv.style.cursor = inPlayMode ? (elem.type.includes('button') ? 'pointer' : 'default') : 'grab';

        // Background styling
        if (elem.backgroundColor) {
            elDiv.style.background = elem.backgroundColor;
        }

        // Edit mode outline & badges
        if (!inPlayMode) {
            elDiv.style.border = '2px dashed rgba(16, 185, 129, 0.7)';
            elDiv.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
            elDiv.title = 'Kliki seadistamiseks, lohista asukoha muutmiseks';
        } else {
            elDiv.style.border = '1px solid rgba(255, 255, 255, 0.15)';
            elDiv.style.boxShadow = '0 8px 24px rgba(0,0,0,0.45)';
        }

        // Inner Content based on type
        if (elem.type === 'button') {
            const btnSpan = document.createElement('span');
            btnSpan.style.color = elem.textColor || '#fff';
            btnSpan.style.fontWeight = '800';
            btnSpan.style.fontSize = `${elem.fontSize || 15}px`;
            btnSpan.style.padding = '4px 10px';
            btnSpan.style.textAlign = 'center';
            btnSpan.textContent = elem.text || 'Nupp';
            elDiv.appendChild(btnSpan);
        } else if (elem.type === 'screen') {
            const titleBar = document.createElement('div');
            titleBar.style.width = '100%';
            titleBar.style.padding = '6px 10px';
            titleBar.style.background = 'rgba(255,255,255,0.06)';
            titleBar.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            titleBar.style.fontWeight = '800';
            titleBar.style.fontSize = '0.8rem';
            titleBar.style.color = '#38bdf8';
            titleBar.style.display = 'flex';
            titleBar.style.alignItems = 'center';
            titleBar.style.justifyContent = 'space-between';
            titleBar.innerHTML = `<span>🖥️ ${elem.name}</span>`;

            const content = document.createElement('div');
            content.style.flex = '1';
            content.style.width = '100%';
            content.style.padding = '8px 12px';
            content.style.color = elem.textColor || '#cbd5e1';
            content.style.fontSize = `${elem.fontSize || 13}px`;
            content.style.overflowY = 'auto';
            content.style.lineHeight = '1.4';
            content.textContent = elem.text || 'Info';

            elDiv.appendChild(titleBar);
            elDiv.appendChild(content);
        } else if (elem.type === 'image_button') {
            if (elem.imageUrl) {
                const img = document.createElement('img');
                img.src = elem.imageUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.pointerEvents = 'none';
                elDiv.appendChild(img);
            }
            if (elem.text) {
                const badge = document.createElement('div');
                badge.style.position = 'absolute';
                badge.style.bottom = '2px';
                badge.style.left = '0';
                badge.style.right = '0';
                badge.style.background = 'rgba(0,0,0,0.6)';
                badge.style.color = '#fff';
                badge.style.fontSize = '10px';
                badge.style.fontWeight = 'bold';
                badge.style.textAlign = 'center';
                badge.textContent = elem.text;
                elDiv.appendChild(badge);
            }
        } else if (elem.type === 'image_screen') {
            if (elem.imageUrl) {
                const img = document.createElement('img');
                img.src = elem.imageUrl;
                img.style.width = '100%';
                img.style.height = elem.text ? 'calc(100% - 24px)' : '100%';
                img.style.objectFit = 'cover';
                img.style.pointerEvents = 'none';
                elDiv.appendChild(img);
            }
            if (elem.text) {
                const caption = document.createElement('div');
                caption.style.width = '100%';
                caption.style.height = '24px';
                caption.style.lineHeight = '24px';
                caption.style.background = 'rgba(0,0,0,0.7)';
                caption.style.color = elem.textColor || '#fff';
                caption.style.fontSize = '12px';
                caption.style.fontWeight = 'bold';
                caption.style.textAlign = 'center';
                caption.textContent = elem.text;
                elDiv.appendChild(caption);
            }
        }

        // Interaction (Edit Mode vs Play Mode)
        if (!inPlayMode) {
            // Drag and drop positioning
            elDiv.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                isDraggingScreenElement = true;
                dragElementId = elem.id;
                dragStartPos = { x: e.clientX, y: e.clientY };
                elemStartPos = { x: elem.position.x, y: elem.position.y };
                elDiv.style.cursor = 'grabbing';
                (elDiv as any).setPointerCapture?.(e.pointerId);
                e.stopPropagation();
            });

            elDiv.addEventListener('pointermove', (e) => {
                if (isDraggingScreenElement && dragElementId === elem.id) {
                    const dx = e.clientX - dragStartPos.x;
                    const dy = e.clientY - dragStartPos.y;
                    const newX = Math.max(0, Math.min(window.innerWidth - elem.size.width, elemStartPos.x + dx));
                    const newY = Math.max(0, Math.min(window.innerHeight - elem.size.height, elemStartPos.y + dy));
                    elDiv.style.left = `${newX}px`;
                    elDiv.style.top = `${newY}px`;
                    elem.position.x = Math.round(newX);
                    elem.position.y = Math.round(newY);
                }
            });

            elDiv.addEventListener('pointerup', (e) => {
                if (isDraggingScreenElement && dragElementId === elem.id) {
                    isDraggingScreenElement = false;
                    dragElementId = null;
                    elDiv.style.cursor = 'grab';
                    try { (elDiv as any).releasePointerCapture?.(e.pointerId); } catch (_) {}
                    autoSaveDraft();

                    // If it was just a click (not a drag), open properties editor
                    const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
                    if (dist < 4) {
                        openScreenElementEditor(elem);
                    }
                }
            });
        } else {
            // Play Mode Click Reaction
            elDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                if (elem.type === 'button' || elem.type === 'image_button') {
                    // Micro bounce animation
                    elDiv.style.transform = 'scale(0.95)';
                    setTimeout(() => { elDiv.style.transform = 'scale(1)'; }, 100);
                    executeScreenElementAction(elem);
                }
            });
        }

        container.appendChild(elDiv);
    });
}

/**
 * Executes a screen element's configured action (in play mode)
 */
export function executeScreenElementAction(elem: ScreenElement) {
    if (!elem.action || elem.action.type === ('none' as any)) return;

    playGameSound('coin');

    if (elem.action.type === 'message') {
        showScreenNotification(String(elem.action.value || elem.text || 'Teade ekraanilt!'));
    } else if (elem.action.type === 'sound') {
        const s = String(elem.action.value || 'victory') as any;
        playGameSound(s);
    } else if (elem.action.type === 'heal') {
        const amt = Number(elem.action.value) || 25;
        healPlayer(amt);
        showScreenNotification(`💖 Said +${amt} HP elusid!`);
    } else if (elem.action.type === 'speed_boost') {
        boostPlayerSpeed(1.6, 5);
        showScreenNotification('⚡ Kiiruse boost aktiveeritud 5 sekundiks!');
    } else if (elem.action.type === 'coins') {
        const amt = Number(elem.action.value) || 10;
        collectCoin(amt);
        showScreenNotification(`💰 Said +${amt} münti!`);
    }
}

/**
 * Temporary on-screen HUD message popup for screen element actions
 */
function showScreenNotification(msg: string) {
    let notif = document.getElementById('screen-element-notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'screen-element-notification';
        notif.style.position = 'fixed';
        notif.style.top = '80px';
        notif.style.left = '50%';
        notif.style.transform = 'translateX(-50%)';
        notif.style.zIndex = '99999';
        notif.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))';
        notif.style.color = '#fff';
        notif.style.padding = '10px 24px';
        notif.style.borderRadius = '30px';
        notif.style.fontWeight = '800';
        notif.style.fontSize = '0.95rem';
        notif.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(16, 185, 129, 0.4)';
        notif.style.pointerEvents = 'none';
        notif.style.transition = 'opacity 0.25s, transform 0.25s';
        document.body.appendChild(notif);
    }

    notif.textContent = msg;
    notif.style.display = 'block';
    notif.style.opacity = '1';

    setTimeout(() => {
        if (notif) notif.style.opacity = '0';
        setTimeout(() => { if (notif) notif.style.display = 'none'; }, 250);
    }, 2500);
}

/**
 * Opens properties editor modal for a screen element
 */
export function openScreenElementEditor(elem: ScreenElement) {
    currentlyEditingElementId = elem.id;
    const modal = document.getElementById('screen-element-edit-modal');
    if (!modal) return;

    modal.style.display = 'flex';

    const titleEl = document.getElementById('modal-screen-element-title');
    if (titleEl) {
        let typeLabel = 'Nupp';
        if (elem.type === 'screen') typeLabel = 'Ekraani Paneel';
        else if (elem.type === 'image_button') typeLabel = 'Pildi Nupp';
        else if (elem.type === 'image_screen') typeLabel = 'Pildi Ekraan';
        titleEl.textContent = `Seadista: ${typeLabel}`;
    }

    // Name
    const nameInput = document.getElementById('screen-elem-name-input') as HTMLInputElement | null;
    if (nameInput) nameInput.value = elem.name;

    // Text / Content
    const textWrap = document.getElementById('screen-elem-text-wrap');
    const textInput = document.getElementById('screen-elem-text-input') as HTMLInputElement | null;
    if (textWrap && textInput) {
        textWrap.style.display = 'flex';
        textInput.value = elem.text || '';
    }

    // Image Upload Section (visible for image_button and image_screen)
    const imgWrap = document.getElementById('screen-elem-image-wrap');
    const imgPreview = document.getElementById('screen-elem-image-preview') as HTMLImageElement | null;
    if (imgWrap) {
        const isImage = elem.type === 'image_button' || elem.type === 'image_screen';
        imgWrap.style.display = isImage ? 'flex' : 'none';
        if (isImage && imgPreview && elem.imageUrl) {
            imgPreview.src = elem.imageUrl;
        }
    }

    // Action Section (visible for button and image_button)
    const actionWrap = document.getElementById('screen-elem-action-wrap');
    const actionSelect = document.getElementById('screen-elem-action-select') as HTMLSelectElement | null;
    const actionValInput = document.getElementById('screen-elem-action-val') as HTMLInputElement | null;
    if (actionWrap) {
        const isClickable = elem.type === 'button' || elem.type === 'image_button';
        actionWrap.style.display = isClickable ? 'flex' : 'none';
        if (isClickable) {
            if (actionSelect) actionSelect.value = elem.action?.type || 'message';
            if (actionValInput) actionValInput.value = String(elem.action?.value || elem.text || 'Tere!');
        }
    }

    // Size & Dimensions
    const widthInput = document.getElementById('screen-elem-width-input') as HTMLInputElement | null;
    const heightInput = document.getElementById('screen-elem-height-input') as HTMLInputElement | null;
    if (widthInput) widthInput.value = String(elem.size.width);
    if (heightInput) heightInput.value = String(elem.size.height);

    // Background color
    const bgInput = document.getElementById('screen-elem-bg-input') as HTMLInputElement | null;
    if (bgInput) bgInput.value = elem.backgroundColor || '#10b981';
}

/**
 * Sets up editor modal listeners (file upload, save, delete, close)
 */
function setupEditModalListeners() {
    const modal = document.getElementById('screen-element-edit-modal');
    const btnClose = document.getElementById('btn-close-screen-elem-modal');
    const btnSave = document.getElementById('btn-save-screen-elem');
    const btnDelete = document.getElementById('btn-delete-screen-elem');
    const fileInput = document.getElementById('screen-elem-file-input') as HTMLInputElement | null;
    const btnUpload = document.getElementById('btn-upload-screen-elem-file');

    btnClose?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
        currentlyEditingElementId = null;
    });

    // File Upload Trigger
    btnUpload?.addEventListener('click', () => {
        fileInput?.click();
    });

    fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (!dataUrl) return;
            const imgPreview = document.getElementById('screen-elem-image-preview') as HTMLImageElement | null;
            if (imgPreview) imgPreview.src = dataUrl;

            // Apply directly to active element
            if (currentlyEditingElementId) {
                const list: ScreenElement[] = csState.screenElements || [];
                const elem = list.find(e => e.id === currentlyEditingElementId);
                if (elem) {
                    elem.imageUrl = dataUrl;
                    renderScreenElements();
                    autoSaveDraft();
                }
            }
        };
        reader.readAsDataURL(file);
    });

    // Save button
    btnSave?.addEventListener('click', () => {
        if (!currentlyEditingElementId) return;
        const list: ScreenElement[] = csState.screenElements || [];
        const elem = list.find(e => e.id === currentlyEditingElementId);
        if (elem) {
            const nameInput = document.getElementById('screen-elem-name-input') as HTMLInputElement | null;
            const textInput = document.getElementById('screen-elem-text-input') as HTMLInputElement | null;
            const actionSelect = document.getElementById('screen-elem-action-select') as HTMLSelectElement | null;
            const actionValInput = document.getElementById('screen-elem-action-val') as HTMLInputElement | null;
            const widthInput = document.getElementById('screen-elem-width-input') as HTMLInputElement | null;
            const heightInput = document.getElementById('screen-elem-height-input') as HTMLInputElement | null;
            const bgInput = document.getElementById('screen-elem-bg-input') as HTMLInputElement | null;

            if (nameInput) elem.name = nameInput.value;
            if (textInput) elem.text = textInput.value;
            if (widthInput) elem.size.width = Math.max(30, parseInt(widthInput.value, 10) || 100);
            if (heightInput) elem.size.height = Math.max(20, parseInt(heightInput.value, 10) || 40);
            if (bgInput) elem.backgroundColor = bgInput.value;

            if (elem.type === 'button' || elem.type === 'image_button') {
                if (actionSelect) {
                    elem.action = {
                        type: actionSelect.value as any,
                        value: actionValInput?.value || ''
                    };
                }
            }

            renderScreenElements();
            autoSaveDraft();
        }

        if (modal) modal.style.display = 'none';
        currentlyEditingElementId = null;
    });

    // Delete button
    btnDelete?.addEventListener('click', () => {
        if (!currentlyEditingElementId) return;
        deleteScreenElement(currentlyEditingElementId);
        if (modal) modal.style.display = 'none';
        currentlyEditingElementId = null;
    });
}

/**
 * Deletes a screen element by ID
 */
export function deleteScreenElement(id: string) {
    const list: ScreenElement[] = csState.screenElements || [];
    csState.screenElements = list.filter(e => e.id !== id);
    renderScreenElements();
    autoSaveDraft();
}
