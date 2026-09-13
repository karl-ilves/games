import { Role, MapId } from '../types';

export interface AdminPanelContext {
    getState: () => string;
    getPlayerRole: () => Role;
    getAdminForcedRole: () => Role | null;
    getAdminSelectedMap: () => MapId | 'random';
    setAdminRole: (r: Role) => void;
    setAdminSelectedMap: (m: MapId | 'random') => void;
    addMoney: (n: number) => void;
    startRound: () => void;
    addIncidentFeed: (t: string) => void;
    isPointerLocked: boolean;
}

export class AdminPanelUI {
    private ctx: AdminPanelContext;
    private adminModal: HTMLElement | null = null;
    private btnAdminPanel: HTMLElement | null = null;

    constructor(ctx: AdminPanelContext) {
        this.ctx = ctx;
        this.adminModal = document.getElementById('admin-role-modal');
        this.btnAdminPanel = document.getElementById('btn-admin-panel');
        this.bindEvents();
    }

    private bindEvents() {
        document.getElementById('btn-admin-panel')?.addEventListener('click', () => {
            this.openAdminPanel();
        });
        document.getElementById('btn-admin-close')?.addEventListener('click', () => {
            this.closeAdminPanel();
        });
        document.getElementById('btn-admin-role-murderer')?.addEventListener('click', () => {
            this.ctx.setAdminRole('murderer');
        });
        document.getElementById('btn-admin-role-sheriff')?.addEventListener('click', () => {
            this.ctx.setAdminRole('sheriff');
        });
        document.getElementById('btn-admin-role-innocent')?.addEventListener('click', () => {
            this.ctx.setAdminRole('innocent');
        });

        document.querySelectorAll('.admin-map-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const mapVal = target.getAttribute('data-map') as (MapId | 'random');
                if (mapVal) {
                    this.ctx.setAdminSelectedMap(mapVal);
                    document.querySelectorAll('.admin-map-btn').forEach(b => {
                        b.classList.remove('active');
                        (b as HTMLElement).style.borderColor = '';
                        (b as HTMLElement).style.color = '';
                    });
                    target.classList.add('active');
                    target.style.borderColor = '#ffd32a';
                    target.style.color = '#ffd32a';
                    
                    const label = target.textContent?.trim() || mapVal;
                    this.ctx.addIncidentFeed(`🗺️ Admin valis järgmiseks kaardiks: ${label}`);
                }
            });
        });

        document.getElementById('btn-admin-force-start')?.addEventListener('click', () => {
            this.closeAdminPanel();
            this.ctx.startRound();
        });
        document.getElementById('btn-admin-add-yards')?.addEventListener('click', () => {
            this.ctx.addMoney(500);
            this.ctx.addIncidentFeed('💰 Admin lisas +500 € mänguraha!');
        });
    }

    public openAdminPanel() {
        if (!this.adminModal) return;
        if (this.ctx.isPointerLocked) {
            document.exitPointerLock?.();
        }
        this.adminModal.style.display = 'flex';
        this.updateAdminModalActiveState();
    }

    public closeAdminPanel() {
        if (this.adminModal) this.adminModal.style.display = 'none';
    }

    public updateAdminModalActiveState() {
        const current = (this.ctx.getState() === 'in_game') ? this.ctx.getPlayerRole() : (this.ctx.getAdminForcedRole() || 'innocent');
        ['murderer', 'sheriff', 'innocent'].forEach(r => {
            const btn = document.getElementById(`btn-admin-role-${r}`);
            if (btn) {
                if (r === current) {
                    btn.classList.add('active-role');
                } else {
                    btn.classList.remove('active-role');
                }
            }
        });

        const activeMap = this.ctx.getAdminSelectedMap() || 'random';
        document.querySelectorAll('.admin-map-btn').forEach(b => {
            const m = b.getAttribute('data-map');
            const el = b as HTMLElement;
            if (m === activeMap) {
                el.classList.add('active');
                el.style.borderColor = '#ffd32a';
                el.style.color = '#ffd32a';
            } else {
                el.classList.remove('active');
                el.style.borderColor = '';
                el.style.color = '';
            }
        });
    }
}
