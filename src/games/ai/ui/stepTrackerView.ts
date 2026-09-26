import type { AiBuildStep } from '../types';

export class StepTrackerView {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    public render(steps: AiBuildStep[], isBuilding: boolean) {
        if (!steps || steps.length === 0) {
            this.container.innerHTML = `
                <div style="padding: 16px; color: #94a3b8; font-size: 13px; text-align: center;">
                    Kirjuta käsk või vali idee, et näha AI mänguehituse samme reaalajas.
                </div>
            `;
            return;
        }

        const completedCount = steps.filter(s => s.status === 'completed').length;
        const totalCount = steps.length;
        const percent = Math.round((completedCount / totalCount) * 100);

        let html = `
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; font-size: 13px; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px;">
                    Ehituse etapid (${completedCount}/${totalCount})
                </span>
                <span style="font-size: 12px; font-weight: 600; color: #38bdf8;">${percent}%</span>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 14px;">
                <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); transition: width 0.3s ease;"></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

        steps.forEach((step, idx) => {
            let statusIcon = '⏳';
            let badgeBg = 'rgba(255,255,255,0.05)';
            let badgeColor = '#94a3b8';
            let borderColor = 'transparent';

            if (step.status === 'completed') {
                statusIcon = '✅';
                badgeBg = 'rgba(16, 185, 129, 0.15)';
                badgeColor = '#34d399';
                borderColor = 'rgba(16, 185, 129, 0.3)';
            } else if (step.status === 'in_progress') {
                statusIcon = '⚙️';
                badgeBg = 'rgba(56, 189, 248, 0.15)';
                badgeColor = '#38bdf8';
                borderColor = 'rgba(56, 189, 248, 0.5)';
            } else if (step.status === 'failed') {
                statusIcon = '❌';
                badgeBg = 'rgba(239, 68, 68, 0.15)';
                badgeColor = '#f87171';
                borderColor = 'rgba(239, 68, 68, 0.4)';
            }

            html += `
                <div id="step-card-${step.id}" style="display: flex; gap: 10px; align-items: flex-start; padding: 10px; background: ${badgeBg}; border: 1px solid ${borderColor}; border-radius: 8px; transition: all 0.2s ease;">
                    <div style="font-size: 15px; margin-top: 1px;">${statusIcon}</div>
                    <div style="flex: 1;">
                        <div style="font-size: 13px; font-weight: 600; color: #f8fafc;">
                            ${idx + 1}. ${escapeHtml(step.title)}
                        </div>
                        <div style="font-size: 11px; color: ${badgeColor}; margin-top: 2px;">
                            ${escapeHtml(step.description)}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        this.container.innerHTML = html;
    }
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
