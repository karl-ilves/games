export interface OrderItem {
    id: string;
    recipeKey: string;
    title: string;
    titleEn: string;
    icon: string;
    requiredIngredients: string[];
    maxPatience: number;
    currentPatience: number;
    yardReward: number;
    scoreReward: number;
}

export interface IngredientDef {
    id: string;
    nameEt: string;
    nameEn: string;
    icon: string;
    category: 'raw' | 'pantry' | 'cooked' | 'chopped' | 'sauce';
    chopResult?: string;
    cookResult?: string;
}

export interface RecipeDef {
    key: string;
    title: string;
    titleEn: string;
    icon: string;
    ingredients: string[];
    yardReward: number;
    scoreReward: number;
    patience: number;
}

export interface PanState {
    id: number;
    nameEt: string;
    nameEn: string;
    holding: string | null;
    progress: number;
    washProgress: number;
    state: 'empty' | 'cooking' | 'done' | 'burned' | 'washing';
}

export interface OvenState {
    holding: string | null;
    progress: number;
    state: 'empty' | 'baking' | 'done';
}
