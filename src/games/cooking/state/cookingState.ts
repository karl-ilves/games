import { OrderItem, PanState, OvenState, RecipeDef } from '../types';
import { INGREDIENTS, RECIPES } from '../catalog';

export class CookingState {
    public score: number = 0;
    public streakPoints: number = 0;
    public combo: number = 1;
    public completedOrders: number = 0;
    public currentPlate: string[] = [];
    public activeOrders: OrderItem[] = [];
    public maxConcurrentOrders: number = 3;
    public orderIdCounter: number = 1;

    // Chopping
    public currentChoppingRaw: string | null = null;
    public choppingClicks: number = 0;
    public requiredChoppingClicks: number = 5;

    // Stove Pans
    public pans: PanState[] = [
        { id: 0, nameEt: 'Pann 1 (Küpsetuskoht 1)', nameEn: 'Pan 1 (Cooking Spot 1)', holding: null, progress: 0, washProgress: 0, state: 'empty' },
        { id: 1, nameEt: 'Pann 2 (Küpsetuskoht 2)', nameEn: 'Pan 2 (Cooking Spot 2)', holding: null, progress: 0, washProgress: 0, state: 'empty' }
    ];

    // Oven
    public oven: OvenState = {
        holding: null,
        progress: 0,
        state: 'empty'
    };

    public isEt: boolean = false;

    public getName(id: string): string {
        const ing = INGREDIENTS[id];
        if (!ing) return id;
        return this.isEt ? ing.nameEt : ing.nameEn;
    }

    public getRecipeTitle(recipe: RecipeDef | OrderItem): string {
        return this.isEt ? recipe.title : recipe.titleEn;
    }

    public spawnOrder(): OrderItem | null {
        if (this.activeOrders.length >= this.maxConcurrentOrders) return null;

        const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
        const order: OrderItem = {
            id: `ord_${this.orderIdCounter++}`,
            recipeKey: recipe.key,
            title: recipe.title,
            titleEn: recipe.titleEn,
            icon: recipe.icon,
            requiredIngredients: [...recipe.ingredients],
            maxPatience: recipe.patience,
            currentPatience: recipe.patience,
            yardReward: recipe.yardReward,
            scoreReward: recipe.scoreReward
        };

        this.activeOrders.push(order);
        return order;
    }
}
