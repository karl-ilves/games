/**
 * robloxRibbonUI.ts
 * Manages the Roblox Studio Ribbon Tabs (HOME, MODEL, TEST, VIEW),
 * Quick Access Bar, Bottom Output Console Window, and Panel Toggles.
 */

export function setupRobloxRibbonUI() {
    // 1. Ribbon Tab Switching (HOME, MODEL, TEST, VIEW)
    const ribbonTabs = document.querySelectorAll<HTMLButtonElement>('.roblox-ribbon-tab');
    const ribbonSections = document.querySelectorAll<HTMLElement>('.roblox-ribbon-content-section');

    ribbonTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            ribbonTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            ribbonSections.forEach(sec => {
                if (sec.getAttribute('data-section') === targetTab) {
                    sec.style.display = 'flex';
                } else {
                    sec.style.display = 'none';
                }
            });
        });
    });

    // 2. View Tab Checkboxes / Toggles for Panels
    const chkExplorer = document.getElementById('chk-view-explorer') as HTMLInputElement | null;
    const chkProperties = document.getElementById('chk-view-properties') as HTMLInputElement | null;
    const chkToolbox = document.getElementById('chk-view-toolbox') as HTMLInputElement | null;
    const chkOutput = document.getElementById('chk-view-output') as HTMLInputElement | null;

    const inspectorPanel = document.getElementById('inspector-panel');
    const catalogPanel = document.getElementById('catalog-panel');
    const outputPanel = document.getElementById('roblox-output-window');
    const workspaceView = document.getElementById('workspace-panel-view');
    const propertiesView = document.getElementById('properties-panel-view');
    const tabWorkspace = document.getElementById('tab-btn-workspace');
    const tabProperties = document.getElementById('tab-btn-properties');
    const tabSplit = document.getElementById('tab-btn-split');

    if (chkExplorer) {
        chkExplorer.addEventListener('change', () => {
            if (inspectorPanel) {
                if (chkExplorer.checked) {
                    inspectorPanel.style.display = 'flex';
                    if (chkProperties && chkProperties.checked) {
                        tabSplit?.click();
                    } else {
                        tabWorkspace?.click();
                    }
                } else {
                    if (chkProperties && chkProperties.checked) {
                        tabProperties?.click();
                    } else {
                        inspectorPanel.style.display = 'none';
                    }
                }
            }
        });
    }

    if (chkProperties) {
        chkProperties.addEventListener('change', () => {
            if (inspectorPanel) {
                if (chkProperties.checked) {
                    inspectorPanel.style.display = 'flex';
                    if (chkExplorer && chkExplorer.checked) {
                        tabSplit?.click();
                    } else {
                        tabProperties?.click();
                    }
                } else {
                    if (chkExplorer && chkExplorer.checked) {
                        tabWorkspace?.click();
                    } else {
                        inspectorPanel.style.display = 'none';
                    }
                }
            }
        });
    }

    if (chkToolbox) {
        chkToolbox.addEventListener('change', () => {
            if (catalogPanel) {
                catalogPanel.style.display = chkToolbox.checked ? 'flex' : 'none';
            }
        });
    }

    if (chkOutput) {
        chkOutput.addEventListener('change', () => {
            if (outputPanel) {
                outputPanel.style.display = chkOutput.checked ? 'flex' : 'none';
            }
        });
    }

    const chkAssistant = document.getElementById('chk-view-assistant') as HTMLInputElement | null;
    const aiModal = document.getElementById('ai-assistant-modal');
    if (chkAssistant && aiModal) {
        chkAssistant.addEventListener('change', () => {
            const btnToggleAi = document.getElementById('btn-toggle-ai');
            btnToggleAi?.click();
        });

        // Watch for external modal open/close to keep checkbox in sync
        const observer = new MutationObserver(() => {
            const isVisible = aiModal.style.display === 'flex' || window.getComputedStyle(aiModal).display === 'flex';
            if (chkAssistant.checked !== isVisible) {
                chkAssistant.checked = isVisible;
            }
        });
        observer.observe(aiModal, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // Toggle Output Window Close & Clear Buttons
    const btnCloseOutput = document.getElementById('btn-close-output');
    const btnClearOutput = document.getElementById('btn-clear-output');
    const outputLogsContainer = document.getElementById('roblox-output-logs');

    btnCloseOutput?.addEventListener('click', () => {
        if (outputPanel) outputPanel.style.display = 'none';
        if (chkOutput) chkOutput.checked = false;
    });

    btnClearOutput?.addEventListener('click', () => {
        if (outputLogsContainer) outputLogsContainer.innerHTML = '';
    });

    // 3. Setup Interception of console.log, console.warn, console.error to Output Window
    setupConsoleInterception(outputLogsContainer);

    // Initial welcome log
    logToRobloxOutput('Roblox Studio v2.4 initialized. Ready.', 'info');
}

/**
 * Appends a log line to the Roblox Studio Output window
 */
export function logToRobloxOutput(message: string, type: 'info' | 'warn' | 'error' = 'info') {
    const container = document.getElementById('roblox-output-logs');
    if (!container) return;

    const row = document.createElement('div');
    row.className = `roblox-output-line roblox-output-${type}`;
    row.style.cssText = `
        font-family: Consolas, 'Courier New', monospace;
        font-size: 0.78rem;
        line-height: 1.4;
        padding: 1px 4px;
        white-space: pre-wrap;
        word-break: break-all;
    `;

    const timeStr = new Date().toTimeString().split(' ')[0];
    const prefix = document.createElement('span');
    prefix.style.color = '#64748b';
    prefix.style.marginRight = '8px';
    prefix.innerText = `[${timeStr}]`;
    row.appendChild(prefix);

    const textSpan = document.createElement('span');
    if (type === 'error') {
        textSpan.style.color = '#f87171';
        textSpan.innerText = '❌ ' + message;
    } else if (type === 'warn') {
        textSpan.style.color = '#facc15';
        textSpan.innerText = '⚠️ ' + message;
    } else {
        textSpan.style.color = '#e2e8f0';
        textSpan.innerText = message;
    }
    row.appendChild(textSpan);

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
}

function setupConsoleInterception(container: HTMLElement | null) {
    if (!container) return;
    const origLog = console.log;
    const origWarn = console.warn;
    const origErr = console.error;

    console.log = function(...args: any[]) {
        origLog.apply(console, args);
        try {
            const str = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            if (str.length < 500 && !str.includes('THREE.WebGLRenderer')) {
                logToRobloxOutput(str, 'info');
            }
        } catch (_) {}
    };

    console.warn = function(...args: any[]) {
        origWarn.apply(console, args);
        try {
            const str = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            if (str.length < 500) {
                logToRobloxOutput(str, 'warn');
            }
        } catch (_) {}
    };

    console.error = function(...args: any[]) {
        origErr.apply(console, args);
        try {
            const str = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            if (str.length < 500) {
                logToRobloxOutput(str, 'error');
            }
        } catch (_) {}
    };
}
