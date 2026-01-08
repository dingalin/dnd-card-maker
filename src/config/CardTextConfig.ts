/**
 * CardTextConfig.ts
 * ==================
 * SINGLE SOURCE OF TRUTH for all card text settings
 * 
 * This file controls ALL text rendering on both front and back of cards:
 * - Position offsets (Y coordinates)
 * - Font sizes
 * - Text widths
 * - Slider limits (min/max)
 * 
 * DO NOT hardcode these values elsewhere in the codebase!
 * Import from this file instead.
 */

// ============================================================================
// FRONT CARD TEXT CONFIGURATION
// ============================================================================

/**
 * Front card element positions
 * These are OFFSETS added to base positions in the renderer:
 * - rarity: base Y = 100
 * - type: base Y = 140
 * - name: base Y = 200
 * - coreStats: ABSOLUTE Y position
 * - stats: ABSOLUTE Y position
 * - gold: base Y = 920
 */
export const FRONT_POSITIONS = {
    rarity: 61,          // נדירות - offset from base 100
    type: 97,            // סוג - offset from base 140
    name: 129,           // שם החפץ - offset from base 200
    coreStats: 1027,     // נזק/דרד"ש - ABSOLUTE Y position
    stats: 1089,         // תיאור קצר - ABSOLUTE Y position
    gold: 359,           // מחיר - offset from base 920
} as const;

/**
 * Front card font sizes (in pixels)
 */
export const FRONT_FONT_SIZES = {
    raritySize: 54,      // נדירות
    typeSize: 50,        // סוג
    nameSize: 78,        // שם החפץ
    coreStatsSize: 60,   // נזק/דרג"ש
    statsSize: 52,       // תיאור קצר
    goldSize: 50,        // מחיר
} as const;

/**
 * Front card text widths (in pixels)
 */
export const FRONT_WIDTHS = {
    rarityWidth: 500,
    typeWidth: 450,
    nameWidth: 450,
    coreStatsWidth: 537,
    statsWidth: 450,
    goldWidth: 500,
} as const;

/**
 * Front card font styles (bold, italic, glow)
 */
export const FRONT_FONT_STYLES = {
    nameBold: true, nameItalic: false,
    typeBold: false, typeItalic: false,
    rarityBold: false, rarityItalic: false,
    statsBold: true, statsItalic: false,
    coreStatsBold: true, coreStatsItalic: false,
    goldBold: true, goldItalic: false,
} as const;

// ============================================================================
// BACK CARD TEXT CONFIGURATION
// ============================================================================

/**
 * Back card element positions
 * These are ABSOLUTE Y positions
 */
export const BACK_POSITIONS = {
    abilityName: 220,    // שם יכולת
    mech: 320,           // מכניקה
    lore: 1100,          // לור
} as const;

/**
 * Back card font sizes (in pixels)
 */
export const BACK_FONT_SIZES = {
    abilityNameSize: 62, // שם יכולת
    mechSize: 50,        // מכניקה
    loreSize: 46,        // לור
} as const;

/**
 * Back card text widths (in pixels)
 */
export const BACK_WIDTHS = {
    mechWidth: 600,
    loreWidth: 550,
} as const;

/**
 * Back card font styles
 */
export const BACK_FONT_STYLES = {
    abilityNameBold: true, abilityNameItalic: false,
    mechBold: false, mechItalic: false,
    loreBold: false, loreItalic: true,
} as const;

// ============================================================================
// IMAGE SETTINGS
// ============================================================================

export const IMAGE_SETTINGS = {
    imageYOffset: 0,
    imageScale: 1.25,
    imageRotation: 0,
    imageFade: 100,
    imageShadow: 78,
    backgroundScale: 1.0,
} as const;

// ============================================================================
// GLOBAL MARGINS
// ============================================================================

export const GLOBAL_MARGINS = {
    x: 6,
    y: 6,
} as const;

// ============================================================================
// SLIDER LIMITS (min/max for UI sliders)
// ============================================================================

export interface SliderLimit {
    min: number;
    max: number;
    default: number;
    step?: number;
}

export const FRONT_POSITION_LIMITS: Record<string, SliderLimit> = {
    'rarity-offset': { min: -100, max: 200, default: FRONT_POSITIONS.rarity },
    'type-offset': { min: -100, max: 400, default: FRONT_POSITIONS.type },
    'name-offset': { min: -100, max: 200, default: FRONT_POSITIONS.name },
    'coreStats-offset': { min: 600, max: 1350, default: FRONT_POSITIONS.coreStats },
    'stats-offset': { min: 600, max: 1350, default: FRONT_POSITIONS.stats },
    'gold-offset': { min: 0, max: 480, default: FRONT_POSITIONS.gold },
};

export const BACK_POSITION_LIMITS: Record<string, SliderLimit> = {
    'ability-offset': { min: 0, max: 400, default: BACK_POSITIONS.abilityName },
    'mech-offset': { min: 0, max: 800, default: BACK_POSITIONS.mech },
    'lore-offset': { min: 0, max: 1200, default: BACK_POSITIONS.lore },
};

export const FONT_SIZE_LIMITS: Record<string, SliderLimit> = {
    // Front - NO LIMITS
    nameSize: { min: 1, max: 999, default: FRONT_FONT_SIZES.nameSize },
    typeSize: { min: 1, max: 999, default: FRONT_FONT_SIZES.typeSize },
    raritySize: { min: 1, max: 999, default: FRONT_FONT_SIZES.raritySize },
    coreStatsSize: { min: 1, max: 999, default: FRONT_FONT_SIZES.coreStatsSize },
    statsSize: { min: 1, max: 999, default: FRONT_FONT_SIZES.statsSize },
    goldSize: { min: 1, max: 999, default: FRONT_FONT_SIZES.goldSize },
    // Back - NO LIMITS
    abilityNameSize: { min: 1, max: 999, default: BACK_FONT_SIZES.abilityNameSize },
    mechSize: { min: 1, max: 999, default: BACK_FONT_SIZES.mechSize },
    loreSize: { min: 1, max: 999, default: BACK_FONT_SIZES.loreSize },
};

// ============================================================================
// AUTO-LAYOUT RATIOS (for proportional layout calculations)
// ============================================================================

export const AUTO_LAYOUT_RATIOS = {
    rarity: 0.03,
    type: 0.20,
    name: 0.26,
    imageCenter: 0.45,
    coreStats: 1.1,
    quickStats: 1.2,
    gold: 1.25,
} as const;

// ============================================================================
// COMBINED EXPORTS (for backwards compatibility)
// ============================================================================

/**
 * Combined front offsets (positions + widths + image settings)
 * Used by SliderDefaults.ts for backwards compatibility
 */
export const FRONT_OFFSETS = {
    ...FRONT_POSITIONS,
    ...FRONT_WIDTHS,
    ...IMAGE_SETTINGS,
} as const;

/**
 * Combined back offsets (positions + widths)
 */
export const BACK_OFFSETS = {
    ...BACK_POSITIONS,
    ...BACK_WIDTHS,
} as const;

/**
 * Master config object
 */
export const CARD_TEXT_CONFIG = {
    front: {
        positions: FRONT_POSITIONS,
        fontSizes: FRONT_FONT_SIZES,
        widths: FRONT_WIDTHS,
        fontStyles: FRONT_FONT_STYLES,
    },
    back: {
        positions: BACK_POSITIONS,
        fontSizes: BACK_FONT_SIZES,
        widths: BACK_WIDTHS,
        fontStyles: BACK_FONT_STYLES,
    },
    image: IMAGE_SETTINGS,
    globalMargins: GLOBAL_MARGINS,
    limits: {
        frontPositions: FRONT_POSITION_LIMITS,
        backPositions: BACK_POSITION_LIMITS,
        fontSizes: FONT_SIZE_LIMITS,
    },
    autoLayoutRatios: AUTO_LAYOUT_RATIOS,
} as const;

export default CARD_TEXT_CONFIG;
