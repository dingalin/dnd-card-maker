/**
 * Core Type Definitions for D&D Card Creator
 * These types are used throughout the application
 */

// ============== CARD DATA ==============

/**
 * Front side of a card
 */
export interface CardFront {
    title: string;
    type: string;
    rarity: string;
    imageUrl?: string;
    quickStats?: string;
    gold?: string;
}

/**
 * Back side of a card
 */
export interface CardBack {
    title: string;
    mechanics: string;
    lore: string;
}

/**
 * Full card data structure (V2 format)
 */
export interface CardData {
    id?: number | string;

    // V1 style (flat)
    name?: string;
    typeHe?: string;
    rarityHe?: string;
    quickStats?: string;
    gold?: string;
    imageUrl?: string;

    // V2 style (nested)
    front?: CardFront;
    back?: CardBack;

    // Weapon stats
    weaponDamage?: string;
    damageType?: string;
    armorClass?: string;
    versatileDamage?: string;
    weaponProperties?: string[];

    // Quick-glance stats (shown on front of card)
    specialDamage?: string;   // Extra elemental damage (e.g., "+1d4 נפשי")
    spellAbility?: string;    // Spell summary (e.g., "1/יום: Augury")

    // Back side (V1 style)
    abilityName?: string;
    abilityDesc?: string;
    description?: string;

    // Metadata
    savedAt?: string;
    type?: string;
    subtype?: string;
    rarity?: string;
}

// ============== FONT SIZES ==============

export interface FrontFontSizes {
    nameSize: number;
    typeSize: number;
    raritySize: number;
    statsSize: number;
    coreStatsSize: number;
    goldSize: number;
}

export interface BackFontSizes {
    abilityNameSize: number;
    mechSize: number;
    loreSize: number;
}

// ============== OFFSETS ==============

export interface FrontOffsets {
    name: number;
    type: number;
    rarity: number;
    stats: number;
    coreStats: number;
    gold: number;
    imageYOffset: number;
    imageScale: number;
    imageRotation: number;
    imageFade: number;
    imageShadow: number;
    backgroundScale: number;
    centerFade: number;
    nameWidth: number;
    typeWidth: number;
    rarityWidth: number;
    coreStatsWidth: number;
    statsWidth: number;
    goldWidth: number;
}

export interface BackOffsets {
    abilityName: number;
    mech: number;
    lore: number;
    mechWidth: number;
    loreWidth: number;
}

// ============== STYLE SETTINGS ==============

export interface StyleSettings {
    fontFamily: string;
    imageStyle: 'natural' | 'vignette' | 'glow' | 'silhouette';
    imageColor: string;
    textOutlineEnabled: boolean;
    textOutlineWidth: number;
    textShadowEnabled: boolean;
    textShadowBlur: number;
    textBackdropEnabled: boolean;
    textBackdropOpacity: number;
}

// ============== FONT STYLES ==============

export interface FontStyles {
    [key: string]: {
        bold?: boolean;
        italic?: boolean;
    };
}

// ============== SIDE SETTINGS ==============

export interface SideSettings {
    offsets: Partial<FrontOffsets> | Partial<BackOffsets>;
    fontSizes: Partial<FrontFontSizes> | Partial<BackFontSizes>;
    fontStyles: FontStyles;
}

// ============== APP SETTINGS ==============

export interface AppSettings {
    front: {
        offsets: Partial<FrontOffsets>;
        fontSizes: Partial<FrontFontSizes>;
        fontStyles: FontStyles;
    };
    back: {
        offsets: Partial<BackOffsets>;
        fontSizes: Partial<BackFontSizes>;
        fontStyles: FontStyles;
    };
    style: Partial<StyleSettings>;
}

// ============== RENDER OPTIONS ==============

export interface RenderOptions {
    // Font sizes
    fontSizes?: Partial<FrontFontSizes & BackFontSizes>;
    fontStyles?: FontStyles;
    fontFamily?: string;

    // Offsets (position adjustments)
    name?: number;
    type?: number;
    rarity?: number;
    stats?: number;
    coreStats?: number;
    gold?: number;
    abilityName?: number;
    mech?: number;
    lore?: number;

    // Image settings
    imageYOffset?: number;
    imageScale?: number;
    imageRotation?: number;
    imageFade?: number;
    imageShadow?: number;
    imageStyle?: string;
    imageColor?: string;

    // Widths
    nameWidth?: number;
    typeWidth?: number;
    rarityWidth?: number;
    coreStatsWidth?: number;
    statsWidth?: number;
    goldWidth?: number;
    mechWidth?: number;
    loreWidth?: number;

    // Background
    backgroundScale?: number;
    centerFade?: number;

    // Text effects
    textOutlineEnabled?: boolean;
    textOutlineWidth?: number;
    textShadowEnabled?: boolean;
    textShadowBlur?: number;
    textBackdropEnabled?: boolean;
    textBackdropOpacity?: number;

    // Local image
    useLocalImage?: boolean;
    localImageBase64?: string;
}

// ============== STATE ==============

export interface AppState {
    cardData: CardData | null;
    isFlipped: boolean;
    settings: AppSettings;
}

// ============== STATE MANAGER ==============

export interface IStateManager {
    getState(): AppState;
    setCardData(data: CardData): void;
    updateCardField(path: string, value: any): void;
    updateOffset(key: string, value: number, side?: 'front' | 'back'): void;
    updateFontSize(key: string, value: number, side?: 'front' | 'back'): void;
    subscribe(callback: (state: AppState, changedKey?: string) => void): () => void;
    saveCurrentCard(): void;
    loadCurrentCard(): boolean;
}

// ============== THUMBNAIL RESULT ==============

export interface ThumbnailResult {
    front: string;
    back: string | null;
}
