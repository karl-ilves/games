export type AvatarCategory = 
    | 'body'
    | 'skin'
    | 'face'
    | 'hair'
    | 'tops'
    | 'pants'
    | 'shoes'
    | 'hats'
    | 'accessories'
    | 'back'
    | 'emotes'
    | 'animations';

export type ItemRarity = 
    | 'Common'
    | 'Uncommon'
    | 'Rare'
    | 'Epic'
    | 'Legendary'
    | 'Mythic';

export type AttachmentSocket = 
    | 'head'
    | 'hair'
    | 'face'
    | 'torso'
    | 'pants'
    | 'shoes'
    | 'back'
    | 'hand_r'
    | 'hand_l';

export interface AvatarItem {
    id: string;
    name: string;
    category: AvatarCategory;
    rarity: ItemRarity;
    price: number;
    currency: 'Yard';
    attachmentSocket: AttachmentSocket;
    colorable?: boolean;
    defaultColor?: string;
    description: string;
    thumbnail?: string; // WebP, SVG data uri or icon
    isDefault?: boolean; // Granted to all players for free
}

export interface AvatarConfig {
    bodyId: string;
    skinColor: string;
    faceId: string;
    hairId: string;
    hairColor: string;
    topId: string;
    pantsId: string;
    shoesId: string;
    hatId: string | null;
    accessoryId: string | null;
    backId: string | null;
    activeEmote: 'idle' | 'wave' | 'dance' | 'jump' | 'salute' | 'backflip' | 'breakdance' | 'laugh' | 'flex' | 'levitate' | 'zombie' | 'guitar' | string;
    movementStyle?: string;
    updatedAt?: string;
}

export interface UserAvatarData {
    config: AvatarConfig;
    inventory: string[]; // List of unlocked item IDs
}
