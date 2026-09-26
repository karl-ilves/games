import type { AiMessage } from '../types';

export class ChatView {
    private container: HTMLElement;
    private onSendMessage: (text: string) => void;
    private onSelectClarification: (option: string) => void;
    private onInspectCode: (code: string) => void;

    constructor(
        container: HTMLElement,
        callbacks: {
            onSendMessage: (text: string) => void;
            onSelectClarification: (option: string) => void;
            onInspectCode: (code: string) => void;
        }
    ) {
        this.container = container;
        this.onSendMessage = callbacks.onSendMessage;
        this.onSelectClarification = callbacks.onSelectClarification;
        this.onInspectCode = callbacks.onInspectCode;

        this.bindEvents();
    }

    private bindEvents() {
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Clarification button click
            if (target && target.matches('.btn-clarify-opt')) {
                const opt = target.getAttribute('data-opt');
                if (opt) {
                    this.onSelectClarification(opt);
                }
            }

            // Quick suggestion chips
            if (target && target.closest('.ai-suggestion-chip')) {
                const chip = target.closest('.ai-suggestion-chip') as HTMLElement;
                const prompt = chip.getAttribute('data-prompt');
                if (prompt) {
                    this.onSendMessage(prompt);
                }
            }

            // Inspect code button
            if (target && target.closest('.btn-inspect-code')) {
                const btn = target.closest('.btn-inspect-code') as HTMLElement;
                const code = btn.getAttribute('data-code');
                if (code) {
                    this.onInspectCode(decodeURIComponent(code));
                }
            }
        });
    }

    public render(messages: AiMessage[], isBuilding: boolean) {
        let html = `
            <div id="ai-chat-messages" style="flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px;">
        `;

        for (const msg of messages) {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';

            let bubbleBg = isUser ? '#2563eb' : (isSystem ? 'rgba(30, 41, 59, 0.7)' : '#1e293b');
            let align = isUser ? 'flex-end' : 'flex-start';
            let textColor = isUser ? '#ffffff' : '#e2e8f0';
            let border = isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.1)';

            html += `
                <div style="display: flex; flex-direction: column; align-items: ${align}; max-width: 90%; align-self: ${align};">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 11px; color: #94a3b8;">
                        <span>${isUser ? 'Sina' : (isSystem ? 'Süsteem' : '🤖 Playard AI')}</span>
                    </div>
                    <div class="ai-speech-bubble" style="background: ${bubbleBg}; color: ${textColor}; border: ${border}; border-radius: 12px; padding: 10px 14px; font-size: 13px; line-height: 1.5; word-break: break-word; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        ${escapeHtml(msg.text)}
                    </div>
            `;

            // Safety Warning if present
            if (msg.safetyWarning) {
                html += `
                    <div style="margin-top: 6px; padding: 8px 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; font-size: 12px; color: #fca5a5;">
                        🛡️ <strong>Turvakontroll:</strong> ${escapeHtml(msg.safetyWarning)}
                    </div>
                `;
            }

            // Clarification options buttons
            if (msg.clarificationOptions && msg.clarificationOptions.length > 0) {
                html += `
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
                `;
                for (const opt of msg.clarificationOptions) {
                    html += `
                        <button type="button" class="btn-clarify-opt" data-opt="${escapeHtml(opt)}" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 6px 12px; border-radius: 16px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">
                            👉 ${escapeHtml(opt)}
                        </button>
                    `;
                }
                html += `</div>`;
            }

            // Code inspect snippet
            if (msg.codeSnippet) {
                html += `
                    <div style="margin-top: 8px;">
                        <button type="button" class="btn-inspect-code" data-code="${encodeURIComponent(msg.codeSnippet)}" style="background: rgba(147, 51, 234, 0.2); border: 1px solid rgba(147, 51, 234, 0.4); color: #c084fc; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">
                            🔍 Vaata genereeritud skripti ja turvaanalüüsi
                        </button>
                    </div>
                `;
            }

            html += `</div>`;
        }

        if (isBuilding) {
            html += `
                <div style="align-self: flex-start; padding: 8px 12px; background: rgba(56, 189, 248, 0.1); border-radius: 12px; font-size: 12px; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
                    <div class="ai-spinner" style="width: 12px; height: 12px; border: 2px solid #38bdf8; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>Playard AI ehitab ja testib mängu...</span>
                </div>
            `;
        }

        html += `
            </div>
            <!-- Quick Suggestion Chips -->
            <div style="padding: 6px 14px; display: flex; gap: 6px; overflow-x: auto; border-top: 1px solid rgba(255,255,255,0.06);">
                <button type="button" class="ai-suggestion-chip" data-prompt="Tee mäng, kus mängija peab tornaado eest põgenema" style="white-space: nowrap; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 12px; padding: 4px 10px; font-size: 11px; cursor: pointer;">
                    🌪️ Tornaado põgenemine
                </button>
                <button type="button" class="ai-suggestion-chip" data-prompt="Loo lennumäng" style="white-space: nowrap; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 12px; padding: 4px 10px; font-size: 11px; cursor: pointer;">
                    ✈️ Lennumäng
                </button>
                <button type="button" class="ai-suggestion-chip" data-prompt="Muuda taevas öiseks" style="white-space: nowrap; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 12px; padding: 4px 10px; font-size: 11px; cursor: pointer;">
                    🌙 Öine taevas
                </button>
                <button type="button" class="ai-suggestion-chip" data-prompt="Tee maja suuremaks" style="white-space: nowrap; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 12px; padding: 4px 10px; font-size: 11px; cursor: pointer;">
                    🏠 Suurem maja
                </button>
                <button type="button" class="ai-suggestion-chip" data-prompt="Lisa mängijale 100 raha" style="white-space: nowrap; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 12px; padding: 4px 10px; font-size: 11px; cursor: pointer;">
                    🪙 +100 Raha
                </button>
            </div>
            <!-- Input Area -->
            <form id="ai-chat-form" style="display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.1); background: #0f172a;">
                <input id="ai-chat-input" type="text" placeholder="Kirjelda mängu või muudatust..." autocomplete="off" style="flex: 1; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px 14px; color: #ffffff; font-size: 13px; outline: none;" />
                <button id="ai-chat-submit" type="submit" style="background: #3b82f6; color: #ffffff; border: none; border-radius: 8px; padding: 0 16px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    <span>Saada</span>
                </button>
            </form>
        `;

        this.container.innerHTML = html;

        // Auto-scroll to bottom
        const msgList = this.container.querySelector('#ai-chat-messages');
        if (msgList) {
            msgList.scrollTop = msgList.scrollHeight;
        }

        // Attach form submit
        const form = this.container.querySelector('#ai-chat-form');
        const input = this.container.querySelector('#ai-chat-input') as HTMLInputElement;
        if (form && input) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const val = input.value.trim();
                if (val) {
                    input.value = '';
                    this.onSendMessage(val);
                }
            });
        }
    }
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
