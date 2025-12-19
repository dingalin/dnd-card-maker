/**
 * Card Rendering Constants
 * Centralized values for card layout and defaults
 */

// ============== CARD DIMENSIONS ==============
export const CARD_WIDTH = 750;
export const CARD_HEIGHT = 1050;

// ============== DEFAULT FONT SIZES ==============
export const DEFAULT_FONT_SIZES = {
    front: {
        nameSize: 64,
        typeSize: 24,
        raritySize: 24,
        statsSize: 32,
        coreStatsSize: 42,
        goldSize: 32
    },
    back: {
        abilityNameSize: 52,
        mechSize: 32,
        loreSize: 24
    }
};

// ============== DEFAULT OFFSETS ==============
export const DEFAULT_OFFSETS = {
    front: {
        name: 0,
        type: 0,
        rarity: 0,
        stats: 780,
        coreStats: 680,
        gold: 0,
        imageYOffset: 0,
        imageScale: 1.0,
        imageRotation: 0,
        imageFade: 0,
        imageShadow: 0,
        backgroundScale: 1.0,
        centerFade: 0
    },
    back: {
        abilityName: 140,
        mech: 220,
        lore: 880
    }
};

// ============== DEFAULT WIDTHS ==============
export const DEFAULT_WIDTHS = {
    nameWidth: 543,
    typeWidth: 500,
    rarityWidth: 500,
    coreStatsWidth: 500,
    statsWidth: 500,
    goldWidth: 500,
    mechWidth: 600,
    loreWidth: 550
};

// ============== DEFAULT STYLE ==============
export const DEFAULT_STYLE = {
    fontFamily: 'Heebo',
    imageStyle: 'natural',
    imageColor: '#ffffff',
    textOutlineEnabled: false,
    textOutlineWidth: 2,
    textShadowEnabled: false,
    textShadowBlur: 4,
    textBackdropEnabled: false,
    textBackdropOpacity: 40
};

// ============== THUMBNAIL QUALITY ==============
export const THUMBNAIL_QUALITY = 0.85;
export const THUMBNAIL_FORMAT = 'image/jpeg';
