import { SCRIPT_LIBRARY_20, ScriptLibraryItem } from '../catalog/scriptLibrary20';
import { switchScriptTab } from '../systems/scriptRunner';

export function showStartupScriptPrompt() {
    const modal = document.getElementById('startup-script-prompt-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

export function closeStartupScriptPrompt() {
    const modal = document.getElementById('startup-script-prompt-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export function openScriptLibraryModal() {
    closeStartupScriptPrompt();
    const modal = document.getElementById('script-library-modal');
    if (modal) {
        modal.style.display = 'flex';
        const searchInput = document.getElementById('script-library-search-input') as HTMLInputElement | null;
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        renderScriptLibraryCards('');
    }
}

export function closeScriptLibraryModal() {
    const modal = document.getElementById('script-library-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export function renderScriptLibraryCards(query: string = '') {
    const container = document.getElementById('script-library-cards-container');
    const countLabel = document.getElementById('script-library-count-label');
    if (!container) return;

    const q = (query || '').trim().toLowerCase();
    const filtered = SCRIPT_LIBRARY_20.filter(item => {
        if (!q) return true;
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        return nameMatch || descMatch;
    });

    if (countLabel) {
        countLabel.innerText = `Näidatakse ${filtered.length} / ${SCRIPT_LIBRARY_20.length} skripti`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #94a3b8;">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍❌</div>
                <div style="font-size: 1.1rem; font-weight: bold; color: #cbd5e1; margin-bottom: 6px;">Ühtegi skripti ei leitud</div>
                <div style="font-size: 0.85rem;">Proovi otsida teist märksõna (nt "kiirus", "hüpe", "münt", "kahju", "heli", "uks")</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const escapedCode = item.code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        return `
            <div class="script-library-card" data-script-id="${item.id}" style="background: rgba(255, 255, 255, 0.04); border: 1.5px solid rgba(168, 85, 247, 0.35); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s; cursor: pointer;">
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.3rem;">${item.icon}</span>
                            <span class="script-card-name" style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">${item.name}</span>
                        </div>
                        <span style="font-size: 0.7rem; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; background: rgba(168, 85, 247, 0.2); color: #c084fc; font-weight: 700;">${item.category}</span>
                    </div>
                    <p class="script-card-desc" style="margin: 0 0 10px 0; font-size: 0.82rem; color: #94a3b8; line-height: 1.4;">${item.description}</p>
                    <pre style="margin: 0; padding: 8px 10px; background: #070a10; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); color: #38ef7d; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.74rem; line-height: 1.35; max-height: 90px; overflow-y: hidden; text-overflow: ellipsis; white-space: pre-wrap; word-break: break-all;"><code>${escapedCode}</code></pre>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button type="button" class="btn-insert-library-script" data-script-id="${item.id}" style="flex: 1; padding: 7px 12px; background: linear-gradient(135deg, #a855f7, #6366f1); border: none; border-radius: 8px; color: #fff; font-weight: 800; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span>📥</span> <span>Sisesta kood</span>
                    </button>
                    <button type="button" class="btn-copy-library-script" data-script-id="${item.id}" style="padding: 7px 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #cbd5e1; font-weight: 700; font-size: 0.8rem; cursor: pointer;">
                        Kopeeri
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Attach click events on the cards and buttons
    container.querySelectorAll('.script-library-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            (card as HTMLElement).style.borderColor = '#00f2fe';
            (card as HTMLElement).style.boxShadow = '0 8px 24px rgba(0, 242, 254, 0.2)';
            (card as HTMLElement).style.transform = 'translateY(-2px)';
        });
        card.addEventListener('mouseleave', () => {
            (card as HTMLElement).style.borderColor = 'rgba(168, 85, 247, 0.35)';
            (card as HTMLElement).style.boxShadow = 'none';
            (card as HTMLElement).style.transform = 'translateY(0)';
        });
    });

    container.querySelectorAll('.btn-insert-library-script').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).getAttribute('data-script-id');
            const item = SCRIPT_LIBRARY_20.find(s => s.id === id);
            if (item) {
                insertScriptIntoEditor(item);
            }
        });
    });

    container.querySelectorAll('.btn-copy-library-script').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = (btn as HTMLElement).getAttribute('data-script-id');
            const item = SCRIPT_LIBRARY_20.find(s => s.id === id);
            if (item) {
                navigator.clipboard?.writeText(item.code);
                const originalText = (btn as HTMLElement).innerText;
                (btn as HTMLElement).innerText = 'Kopeeritud! ✅';
                setTimeout(() => {
                    (btn as HTMLElement).innerText = originalText;
                }, 1500);
            }
        });
    });
}

export function insertScriptIntoEditor(item: ScriptLibraryItem) {
    // Open editor modal if not opened
    const editorModal = document.getElementById('script-editor-modal');
    if (editorModal) {
        editorModal.style.display = 'flex';
    }
    // Switch to code tab
    switchScriptTab('code');

    const editor = document.getElementById('script-code-editor') as HTMLTextAreaElement | null;
    if (editor) {
        editor.value = item.code;
        editor.focus();
    }

    closeScriptLibraryModal();
}

export function setupScriptLibraryEvents() {
    // Startup modal buttons
    const btnStartupYes = document.getElementById('btn-startup-scripts-yes');
    if (btnStartupYes) {
        btnStartupYes.addEventListener('click', () => {
            openScriptLibraryModal();
        });
    }

    const btnStartupNo = document.getElementById('btn-startup-scripts-no');
    if (btnStartupNo) {
        btnStartupNo.addEventListener('click', () => {
            closeStartupScriptPrompt();
        });
    }

    // Script library modal buttons
    const btnCloseLib = document.getElementById('btn-close-script-library');
    if (btnCloseLib) {
        btnCloseLib.addEventListener('click', () => {
            closeScriptLibraryModal();
        });
    }

    // Button in script editor footer: "20 Skripti"
    const btnOpenLib = document.getElementById('btn-open-script-library');
    if (btnOpenLib) {
        btnOpenLib.addEventListener('click', () => {
            openScriptLibraryModal();
        });
    }

    // Search input (searches by both name and description)
    const searchInput = document.getElementById('script-library-search-input') as HTMLInputElement | null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderScriptLibraryCards(searchInput.value);
        });
    }

    const btnClearSearch = document.getElementById('btn-clear-script-search');
    if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            renderScriptLibraryCards('');
        });
    }
}
