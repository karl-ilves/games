import { CookingState } from '../state/cookingState';
import { INGREDIENTS } from '../catalog';
import { yardService } from '../../../shared/yardService';
import { kitchenAudio } from '../audio';

export class OrderManager {
    private state: CookingState;
    private onOrdersChanged: () => void;
    private onPlateCleared: () => void;
    private onScoreUpdated: () => void;
    private showPopup: (text: string) => void;

    constructor(
        state: CookingState,
        onOrdersChanged: () => void,
        onPlateCleared: () => void,
        onScoreUpdated: () => void,
        showPopup: (text: string) => void
    ) {
        this.state = state;
        this.onOrdersChanged = onOrdersChanged;
        this.onPlateCleared = onPlateCleared;
        this.onScoreUpdated = onScoreUpdated;
        this.showPopup = showPopup;
    }

    public tickOrders(): void {
        let needsRender = false;
        for (let i = this.state.activeOrders.length - 1; i >= 0; i--) {
            const order = this.state.activeOrders[i];
            order.currentPatience -= 1;

            if (order.currentPatience <= 0) {
                this.state.activeOrders.splice(i, 1);
                this.state.combo = 1;
                this.state.streakPoints = 0;
                this.onScoreUpdated();
                this.showPopup(
                    this.state.isEt
                        ? `⚠️ Tellimuse aeg sai otsa! Punktiseeria katkes (0/300 p).`
                        : `⚠️ Order expired! Streak reset (0/300 pts).`
                );
                kitchenAudio.playBurn();
                needsRender = true;
            }
        }

        if (this.state.activeOrders.length < this.state.maxConcurrentOrders && Math.random() < 0.4) {
            this.state.spawnOrder();
            needsRender = true;
        }

        if (needsRender) this.onOrdersChanged();
        else this.updatePatienceBars();
    }

    public updatePatienceBars(): void {
        this.state.activeOrders.forEach(order => {
            const ticket = document.getElementById(`ticket-${order.id}`);
            if (ticket) {
                const bar = ticket.querySelector('.patience-bar') as HTMLElement;
                if (bar) {
                    const pct = Math.max(0, (order.currentPatience / order.maxPatience) * 100);
                    bar.style.width = `${pct}%`;
                    bar.style.backgroundColor = pct < 30 ? '#ff4757' : pct < 60 ? '#ffa502' : '#2ed573';
                }
            }
        });
    }

    public serveDish(): void {
        if (this.state.currentPlate.length === 0) {
            this.showPopup(this.state.isEt ? '⚠️ Taldrik on tühi!' : '⚠️ Plate is empty!');
            return;
        }

        const matchIndex = this.state.activeOrders.findIndex(ord => {
            if (this.state.currentPlate.length !== ord.requiredIngredients.length) return false;
            const p = [...this.state.currentPlate].sort();
            const r = [...ord.requiredIngredients].sort();
            return p.every((val, idx) => val === r[idx]);
        });

        if (matchIndex >= 0) {
            this.state.activeOrders.splice(matchIndex, 1);

            const pointsEarned = 30;
            this.state.score += pointsEarned;
            this.state.streakPoints += pointsEarned;
            this.state.completedOrders++;

            kitchenAudio.playBell();
            kitchenAudio.playSuccess();

            if (this.state.streakPoints >= 300) {
                const bonusYards = 50;
                yardService.addYards(bonusYards, 'Master Chef 3D: 300 Punkti Seeria Boonus (+50 Y)');
                kitchenAudio.playCoin();
                this.showPopup(
                    this.state.isEt
                        ? `🎉🏆 VÕIMAS! 300 PUNKTI TÄIS! SAID +50 YARDI (50 Y)! ⭐✨`
                        : `🎉🏆 AMAZING! 300 POINTS STREAK! +50 YARDS (50 Y) AWARDED! ⭐✨`
                );
                this.state.streakPoints = 0;
            } else {
                this.showPopup(
                    this.state.isEt
                        ? `🎉 +30 Punkti! (Seeria: ${this.state.streakPoints}/300 p ➔ +50 Y)`
                        : `🎉 +30 Points! (Streak: ${this.state.streakPoints}/300 pts ➔ +50 Y)`
                );
            }

            this.state.currentPlate = [];
            this.onPlateCleared();
            this.onOrdersChanged();
            this.onScoreUpdated();
        } else {
            kitchenAudio.playBurn();
            this.showPopup(
                this.state.isEt
                    ? '❌ Taldrikul olevad toiduained ei vasta ühelegi tellimusele! Kontrolli tellimust.'
                    : '❌ Plate items do not match any active order! Check customer tickets.'
            );
        }
    }
}
