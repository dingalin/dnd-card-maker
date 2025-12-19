/**
 * CardThumbnailRenderer - Shared utility for rendering card thumbnails
 * Used by CharacterController, TreasureController, and HistoryController
 * Eliminates code duplication and ensures consistent rendering
 */

import CardRenderer from '../card-renderer.js';
import {
    CARD_WIDTH,
    CARD_HEIGHT,
    DEFAULT_FONT_SIZES,
    DEFAULT_OFFSETS,
    DEFAULT_WIDTHS,
    DEFAULT_STYLE,
    THUMBNAIL_QUALITY,
    THUMBNAIL_FORMAT
} from './constants.js';

/**
 * Render a card to an off-screen canvas and return as dataURL
 * @param {Object} cardData - Card data to render
 * @param {string} imageUrl - URL of the card image
 * @param {Object} stateManager - StateManager instance for getting current settings
 * @param {boolean} renderBack - Whether to also render the back side
 * @returns {Promise<{front: string, back: string|null}>} - DataURLs for front and back
 */
export async function renderCardThumbnail(cardData, imageUrl, stateManager, renderBack = true) {
    try {
        // Create off-screen canvas
        const canvas = document.createElement('canvas');
        canvas.width = CARD_WIDTH;
        canvas.height = CARD_HEIGHT;
        canvas.id = 'temp-render-canvas-' + Date.now();
        canvas.style.display = 'none';
        document.body.appendChild(canvas);

        // Create temporary CardRenderer
        const tempRenderer = new CardRenderer(canvas.id);
        await tempRenderer.templateReady;

        // Build render data (CardRenderer expects specific format)
        const renderData = buildRenderData(cardData, imageUrl);

        // Get current settings from stateManager
        const settings = stateManager.getState().settings || {};

        // Build render options for front
        const frontOptions = buildFrontRenderOptions(settings);

        // Render FRONT
        await tempRenderer.render(renderData, frontOptions, false);
        const frontThumb = canvas.toDataURL(THUMBNAIL_FORMAT, THUMBNAIL_QUALITY);

        // Render BACK (if has content and requested)
        let backThumb = null;
        if (renderBack && hasBackContent(renderData)) {
            const backOptions = buildBackRenderOptions(settings);
            await tempRenderer.render(renderData, backOptions, true);
            backThumb = canvas.toDataURL(THUMBNAIL_FORMAT, THUMBNAIL_QUALITY);
        }

        // Cleanup
        document.body.removeChild(canvas);
        canvas.width = 0;
        canvas.height = 0;

        return { front: frontThumb, back: backThumb };
    } catch (error) {
        console.error('CardThumbnailRenderer: Failed to render thumbnail:', error);
        return { front: imageUrl, back: null };
    }
}

/**
 * Build render data object from card data
 */
function buildRenderData(cardData, imageUrl) {
    return {
        name: cardData.name || cardData.front?.title || 'חפץ',
        typeHe: cardData.typeHe || cardData.front?.type || '',
        rarityHe: cardData.rarityHe || cardData.front?.rarity || '',
        // Stats fields
        weaponDamage: cardData.weaponDamage,
        damageType: cardData.damageType,
        armorClass: cardData.armorClass,
        versatileDamage: cardData.versatileDamage,
        weaponProperties: cardData.weaponProperties,
        // Quick description
        quickStats: cardData.quickStats || cardData.front?.quickStats || '',
        gold: cardData.gold || cardData.front?.gold || '-',
        imageUrl: imageUrl,
        // Back side data
        abilityName: cardData.abilityName || cardData.back?.title || '',
        abilityDesc: cardData.abilityDesc || cardData.back?.mechanics || '',
        description: cardData.description || cardData.back?.lore || ''
    };
}

/**
 * Check if card has back content
 */
function hasBackContent(renderData) {
    return !!(renderData.abilityName || renderData.abilityDesc || renderData.description);
}

/**
 * Build render options for front side using stateManager settings
 */
function buildFrontRenderOptions(settings) {
    const frontSettings = settings.front || {};
    const styleSettings = settings.style || {};
    const fo = frontSettings.offsets || {};
    const fs = frontSettings.fontSizes || {};

    return {
        // Font sizes
        fontSizes: {
            nameSize: fs.nameSize ?? DEFAULT_FONT_SIZES.front.nameSize,
            typeSize: fs.typeSize ?? DEFAULT_FONT_SIZES.front.typeSize,
            raritySize: fs.raritySize ?? DEFAULT_FONT_SIZES.front.raritySize,
            statsSize: fs.statsSize ?? DEFAULT_FONT_SIZES.front.statsSize,
            coreStatsSize: fs.coreStatsSize ?? DEFAULT_FONT_SIZES.front.coreStatsSize,
            goldSize: fs.goldSize ?? DEFAULT_FONT_SIZES.front.goldSize
        },
        // Offsets
        name: fo.name ?? DEFAULT_OFFSETS.front.name,
        type: fo.type ?? DEFAULT_OFFSETS.front.type,
        rarity: fo.rarity ?? DEFAULT_OFFSETS.front.rarity,
        stats: fo.stats ?? DEFAULT_OFFSETS.front.stats,
        coreStats: fo.coreStats ?? DEFAULT_OFFSETS.front.coreStats,
        gold: fo.gold ?? DEFAULT_OFFSETS.front.gold,
        // Image settings
        imageYOffset: fo.imageYOffset ?? DEFAULT_OFFSETS.front.imageYOffset,
        imageScale: fo.imageScale ?? DEFAULT_OFFSETS.front.imageScale,
        imageRotation: fo.imageRotation ?? DEFAULT_OFFSETS.front.imageRotation,
        imageFade: fo.imageFade ?? DEFAULT_OFFSETS.front.imageFade,
        imageShadow: fo.imageShadow ?? DEFAULT_OFFSETS.front.imageShadow,
        imageStyle: styleSettings.imageStyle || DEFAULT_STYLE.imageStyle,
        imageColor: styleSettings.imageColor || DEFAULT_STYLE.imageColor,
        // Widths
        nameWidth: fo.nameWidth ?? DEFAULT_WIDTHS.nameWidth,
        typeWidth: fo.typeWidth ?? DEFAULT_WIDTHS.typeWidth,
        rarityWidth: fo.rarityWidth ?? DEFAULT_WIDTHS.rarityWidth,
        coreStatsWidth: fo.coreStatsWidth ?? DEFAULT_WIDTHS.coreStatsWidth,
        statsWidth: fo.statsWidth ?? DEFAULT_WIDTHS.statsWidth,
        goldWidth: fo.goldWidth ?? DEFAULT_WIDTHS.goldWidth,
        // Background
        backgroundScale: fo.backgroundScale ?? DEFAULT_OFFSETS.front.backgroundScale,
        centerFade: fo.centerFade ?? DEFAULT_OFFSETS.front.centerFade,
        // Font family and styles
        fontFamily: styleSettings.fontFamily || DEFAULT_STYLE.fontFamily,
        fontStyles: frontSettings.fontStyles || {},
        // Text effects
        textOutlineEnabled: styleSettings.textOutlineEnabled || DEFAULT_STYLE.textOutlineEnabled,
        textOutlineWidth: styleSettings.textOutlineWidth ?? DEFAULT_STYLE.textOutlineWidth,
        textShadowEnabled: styleSettings.textShadowEnabled || DEFAULT_STYLE.textShadowEnabled,
        textShadowBlur: styleSettings.textShadowBlur ?? DEFAULT_STYLE.textShadowBlur,
        textBackdropEnabled: styleSettings.textBackdropEnabled || DEFAULT_STYLE.textBackdropEnabled,
        textBackdropOpacity: styleSettings.textBackdropOpacity ?? DEFAULT_STYLE.textBackdropOpacity
    };
}

/**
 * Build render options for back side using stateManager settings
 */
function buildBackRenderOptions(settings) {
    const frontSettings = settings.front || {};
    const backSettings = settings.back || {};
    const styleSettings = settings.style || {};
    const fo = frontSettings.offsets || {};
    const bo = backSettings.offsets || {};
    const bs = backSettings.fontSizes || {};

    return {
        fontSizes: {
            abilityNameSize: bs.abilityNameSize ?? DEFAULT_FONT_SIZES.back.abilityNameSize,
            mechSize: bs.mechSize ?? DEFAULT_FONT_SIZES.back.mechSize,
            loreSize: bs.loreSize ?? DEFAULT_FONT_SIZES.back.loreSize
        },
        abilityName: bo.abilityName ?? DEFAULT_OFFSETS.back.abilityName,
        mech: bo.mech ?? DEFAULT_OFFSETS.back.mech,
        lore: bo.lore ?? DEFAULT_OFFSETS.back.lore,
        mechWidth: bo.mechWidth ?? DEFAULT_WIDTHS.mechWidth,
        loreWidth: bo.loreWidth ?? DEFAULT_WIDTHS.loreWidth,
        backgroundScale: fo.backgroundScale ?? DEFAULT_OFFSETS.front.backgroundScale,
        fontFamily: styleSettings.fontFamily || DEFAULT_STYLE.fontFamily,
        fontStyles: backSettings.fontStyles || {},
        textOutlineEnabled: styleSettings.textOutlineEnabled || DEFAULT_STYLE.textOutlineEnabled,
        textOutlineWidth: styleSettings.textOutlineWidth ?? DEFAULT_STYLE.textOutlineWidth,
        textShadowEnabled: styleSettings.textShadowEnabled || DEFAULT_STYLE.textShadowEnabled,
        textShadowBlur: styleSettings.textShadowBlur ?? DEFAULT_STYLE.textShadowBlur,
        textBackdropEnabled: styleSettings.textBackdropEnabled || DEFAULT_STYLE.textBackdropEnabled,
        textBackdropOpacity: styleSettings.textBackdropOpacity ?? DEFAULT_STYLE.textBackdropOpacity
    };
}

/**
 * Render only front side (convenience method)
 */
export async function renderFrontThumbnail(cardData, imageUrl, stateManager) {
    const result = await renderCardThumbnail(cardData, imageUrl, stateManager, false);
    return result.front;
}
