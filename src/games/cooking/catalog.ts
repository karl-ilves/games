import { IngredientDef, RecipeDef } from './types';

export const INGREDIENTS: Record<string, IngredientDef> = {
    // Pantry base
    'bun_bottom': { id: 'bun_bottom', nameEt: 'Burgerisai (Alumine)', nameEn: 'Bottom Bun', icon: '🍞', category: 'pantry' },
    'bun_top': { id: 'bun_top', nameEt: 'Burgerisai (Ülemine)', nameEn: 'Top Bun', icon: '🍔', category: 'pantry' },
    'pizza_dough': { id: 'pizza_dough', nameEt: 'Pitsapõhi', nameEn: 'Pizza Dough', icon: '🫓', category: 'pantry' },
    'tomato_sauce': { id: 'tomato_sauce', nameEt: 'Tomatikaste', nameEn: 'Tomato Sauce', icon: '🥫', category: 'sauce' },
    'salt_sauce': { id: 'salt_sauce', nameEt: 'Sool & Kaste', nameEn: 'Salt & Sauce', icon: '🧂', category: 'sauce' },

    // Raw for chopping
    'raw_tomato': { id: 'raw_tomato', nameEt: 'Terve Tomat', nameEn: 'Raw Tomato', icon: '🍅', category: 'raw', chopResult: 'tomato_chopped' },
    'raw_cheese': { id: 'raw_cheese', nameEt: 'Juustuplokk', nameEn: 'Cheese Block', icon: '🧀', category: 'raw', chopResult: 'cheese_slice' },
    'raw_lettuce': { id: 'raw_lettuce', nameEt: 'Salatipea', nameEn: 'Lettuce Head', icon: '🥬', category: 'raw', chopResult: 'lettuce_chopped' },
    'raw_onion': { id: 'raw_onion', nameEt: 'Sibul', nameEn: 'Raw Onion', icon: '🧅', category: 'raw', chopResult: 'onion_chopped' },
    'raw_mushrooms': { id: 'raw_mushrooms', nameEt: 'Seened', nameEn: 'Mushrooms', icon: '🍄', category: 'raw', chopResult: 'mushrooms_chopped' },
    'raw_pepperoni': { id: 'raw_pepperoni', nameEt: 'Pepperoni vorst', nameEn: 'Pepperoni Sausage', icon: '🍖', category: 'raw', chopResult: 'pepperoni_chopped' },

    // Chopped items
    'tomato_chopped': { id: 'tomato_chopped', nameEt: 'Viilutatud Tomat', nameEn: 'Sliced Tomato', icon: '🍅', category: 'chopped' },
    'cheese_slice': { id: 'cheese_slice', nameEt: 'Juustuviil', nameEn: 'Cheese Slice', icon: '🧀', category: 'chopped' },
    'lettuce_chopped': { id: 'lettuce_chopped', nameEt: 'Hakitud Salat', nameEn: 'Chopped Lettuce', icon: '🥗', category: 'chopped' },
    'onion_chopped': { id: 'onion_chopped', nameEt: 'Sibularõngad', nameEn: 'Onion Rings', icon: '🧅', category: 'chopped' },
    'mushrooms_chopped': { id: 'mushrooms_chopped', nameEt: 'Viilutatud Seened', nameEn: 'Sliced Mushrooms', icon: '🍄', category: 'chopped' },
    'pepperoni_chopped': { id: 'pepperoni_chopped', nameEt: 'Pepperoni Viilud', nameEn: 'Pepperoni Slices', icon: '🍕', category: 'chopped' },

    // Raw for cooking / stove
    'raw_patty': { id: 'raw_patty', nameEt: 'Toores Pihv', nameEn: 'Raw Patty', icon: '🥩', category: 'raw', cookResult: 'cooked_patty' },
    'raw_steak': { id: 'raw_steak', nameEt: 'Toores Praelõik', nameEn: 'Raw Steak', icon: '🥩', category: 'raw', cookResult: 'cooked_steak' },
    'raw_pasta': { id: 'raw_pasta', nameEt: 'Kuiv Pasta', nameEn: 'Dry Pasta', icon: '🍝', category: 'raw', cookResult: 'boiled_pasta' },

    // Cooked items
    'cooked_patty': { id: 'cooked_patty', nameEt: 'Praetud Pihv', nameEn: 'Grilled Patty', icon: '🍔', category: 'cooked' },
    'cooked_steak': { id: 'cooked_steak', nameEt: 'Mahlane Steak', nameEn: 'Juicy Steak', icon: '🥩', category: 'cooked' },
    'boiled_pasta': { id: 'boiled_pasta', nameEt: 'Keedetud Pasta', nameEn: 'Boiled Pasta', icon: '🍝', category: 'cooked' },
    'baked_in_oven': { id: 'baked_in_oven', nameEt: 'Ahjus Küpsetatud', nameEn: 'Baked in Oven', icon: '🔥', category: 'cooked' }
};

export const RECIPES: RecipeDef[] = [
    {
        key: 'cheeseburger',
        title: 'Mahlane Juustuburger',
        titleEn: 'Deluxe Cheeseburger',
        icon: '🍔',
        ingredients: ['bun_bottom', 'cooked_patty', 'cheese_slice', 'lettuce_chopped', 'tomato_chopped', 'bun_top'],
        yardReward: 20,
        scoreReward: 200,
        patience: 80
    },
    {
        key: 'double_burger',
        title: 'Topelt Juustuburger Sibulaga',
        titleEn: 'Double Bacon & Onion Burger',
        icon: '🍔',
        ingredients: ['bun_bottom', 'cooked_patty', 'cheese_slice', 'cooked_patty', 'cheese_slice', 'onion_chopped', 'bun_top'],
        yardReward: 30,
        scoreReward: 300,
        patience: 90
    },
    {
        key: 'pepperoni_pizza',
        title: 'Krõbe Pepperoni Pitsa',
        titleEn: 'Crispy Pepperoni Pizza',
        icon: '🍕',
        ingredients: ['pizza_dough', 'tomato_sauce', 'cheese_slice', 'pepperoni_chopped', 'baked_in_oven'],
        yardReward: 35,
        scoreReward: 350,
        patience: 100
    },
    {
        key: 'steak_deluxe',
        title: 'Peakoka Mahlane Steak & Seened',
        titleEn: 'Chef Gourmet Steak & Veggies',
        icon: '🥩',
        ingredients: ['cooked_steak', 'mushrooms_chopped', 'tomato_chopped', 'lettuce_chopped'],
        yardReward: 40,
        scoreReward: 400,
        patience: 90
    },
    {
        key: 'pasta_bolognese',
        title: 'Pasta Bolognese Juustuga',
        titleEn: 'Pasta Bolognese with Cheese',
        icon: '🍝',
        ingredients: ['boiled_pasta', 'tomato_sauce', 'cooked_patty', 'cheese_slice'],
        yardReward: 30,
        scoreReward: 300,
        patience: 90
    }
];
