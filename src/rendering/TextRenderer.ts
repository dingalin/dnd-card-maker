// @ts-nocheck
/**
 * TextRenderer - Handles all text rendering for D&D cards
 * Includes styled text, damage translation, and text wrapping
 *
 * Extracted from CardRenderer for better code organization
 */

// Damage type translations
export const DAMAGE_TYPES = {
    "slashing": "חותך", "piercing": "דוקר", "bludgeoning": "מוחץ",
    "fire": "אש", "cold": "קור", "lightning": "ברק", "poison": "רעל",
    "acid": "חומצה", "necrotic": "נמק", "radiant": "זוהר", "force": "כוח",
    "psychic": "נפשי", "thunder": "רעם"
};

/**
 * Translate damage types based on locale
 * @param {string} text - Text containing damage types
 * @param {string} locale - Target locale ('he' or 'en')
 * @returns {string} - Translated text
 */
export function translateDamageTypes(text, locale = 'he') {
    if (!text) return text;

    const isHebrew = locale === 'he';
    let result = text;

    if (isHebrew) {
        // Translate English to Hebrew
        for (const [eng, heb] of Object.entries(DAMAGE_TYPES)) {
            result = result.replace(new RegExp(eng, 'gi'), heb);
        }
        // Remove duplicate Hebrew damage types
        for (const heb of Object.values(DAMAGE_TYPES)) {
            result = result.replace(new RegExp(`${heb}\\s+${heb}`, 'g'), heb);
        }
    } else {
        // Translate Hebrew to English
        for (const [eng, heb] of Object.entries(DAMAGE_TYPES)) {
            result = result.replace(new RegExp(heb, 'g'), eng);
        }
        // Remove duplicate English damage types
        for (const eng of Object.keys(DAMAGE_TYPES)) {
            result = result.replace(new RegExp(`${eng}\\s+${eng}`, 'gi'), eng);
        }
    }

    return result.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Draw styled text with optional glow, shadow, and outline
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} maxWidth - Maximum width
 * @param {Object} options - Style options
 */
export function drawStyledText(ctx, text, x, y, maxWidth, options = {}) {
    if (!text) return;

    const {
        elementName = '',
        styles = {},
        outlineEnabled = false,
        outlineWidth = 2,
        shadowBlur = 4,
        shadowEnabled = false
    } = options;

    ctx.save();

    // Check per-element shadow and glow
    const elementShadow = styles[`${elementName}Shadow`] || shadowEnabled;
    const elementGlow = styles[`${elementName}Glow`];

    // 1. Draw Glow (Halo) - BEHIND everything
    if (elementGlow) {
        ctx.save();
        ctx.shadowColor = '#e2c47f'; // Softer, parchment-gold
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = '#e2c47f';
        ctx.fillText(text, x, y, maxWidth);
        ctx.fillText(text, x, y, maxWidth);
        ctx.restore();
    }

    // 2. Apply shadow if enabled
    if (elementShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
    }

    // 3. Draw outline first (behind fill but above glow)
    if (outlineEnabled) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y, maxWidth);
    }

    // 4. Draw fill with AUTO SCALING (not squishing)
    // ctx.fillText(text, x, y, maxWidth) causes squishing.
    // We want to reduce font size instead.

    // Parse current font size
    let currentFont = ctx.font;
    let fontSize = parseInt(currentFont.match(/\d+/) || [0]) || 40; // Default fallback
    const originalFontSize = fontSize;
    // NO MINIMUM - allow any font size

    // Check width
    if (maxWidth && text) {
        let width = ctx.measureText(text).width;
        if (width > maxWidth) {
            // Optimization: Estimate new size directly first
            const ratio = maxWidth / width;
            fontSize = Math.floor(fontSize * ratio);

            // NO CLAMPING - allow tiny fonts if needed

            // Apply new font
            ctx.font = currentFont.replace(/\d+px/, `${fontSize}px`);
        }
    }

    // Now draw (allow maxWidth to still squish if we hit minFontSize)
    ctx.fillText(text, x, y, maxWidth);

    ctx.restore();
}

// Icon cache for drawTextWithIcon
const iconCache: Record<string, HTMLImageElement> = {};

/**
 * Damage type to icon mapping (Hebrew and English)
 */
export const DAMAGE_TYPE_ICONS: Record<string, string> = {
    'אש': 'fire', 'קור': 'cold', 'ברק': 'lightning', 'רעם': 'thunder',
    'חומצה': 'acid', 'רעל': 'poison', 'נמק': 'necrotic', 'זוהר': 'radiant',
    'כוח': 'force', 'נפשי': 'psychic',
    'מוחץ': 'bludgeoning', 'דוקר': 'piercing', 'חותך': 'slashing',
    'fire': 'fire', 'cold': 'cold', 'lightning': 'lightning', 'thunder': 'thunder',
    'acid': 'acid', 'poison': 'poison', 'necrotic': 'necrotic', 'radiant': 'radiant',
    'force': 'force', 'psychic': 'psychic'
};

/**
 * Preload an icon into cache
 * @param {string} iconName - Icon name (e.g., 'fire', 'spell')
 * @returns {HTMLImageElement} - Image element (may still be loading)
 */
export function preloadIcon(iconName: string): HTMLImageElement {
    if (!iconCache[iconName]) {
        const img = new Image();
        img.src = `/assets/icons/damage/${iconName}.png`;
        iconCache[iconName] = img;
    }
    return iconCache[iconName];
}

/**
 * Draw text with an optional icon that scales with font size
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to draw
 * @param {number} x - Center X coordinate
 * @param {number} y - Y coordinate (baseline)
 * @param {Object} options - Rendering options
 * @returns {Object} - { width: number, height: number } of rendered content
 */
export function drawTextWithIcon(ctx, text, x, y, options = {}) {
    if (!text) return { width: 0, height: 0 };

    const {
        iconName = '',           // Icon name (e.g., 'fire', 'spell') or empty for no icon
        iconPosition = 'right',  // 'left' or 'right' of text
        fontSize = 28,           // Font size in pixels
        iconScale = 2.5,         // Icon size = fontSize * iconScale
        maxWidth = 500,          // Maximum width for text
        spacing = 8,             // Space between icon and text
        fontFamily = 'Heebo',
        fontStyles = {},
        elementName = '',
        fillStyle = '#1a1a1a',
        drawOpts = {}
    } = options;

    ctx.save();

    // Set font
    const fontString = buildFontString(fontStyles, elementName, fontSize, fontFamily);
    ctx.font = fontString;
    ctx.fillStyle = fillStyle;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate icon size based on font size
    const iconSize = fontSize * iconScale;

    // Measure text
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;

    // Get icon if specified
    let icon = null;
    let iconReady = false;
    if (iconName) {
        icon = preloadIcon(iconName);
        iconReady = icon.complete && icon.naturalWidth > 0;
    }

    // Calculate total width and positioning
    const iconWidthWithSpacing = iconReady ? (iconSize + spacing) : 0;
    const totalWidth = textWidth + iconWidthWithSpacing;

    // Calculate start position for centered layout
    let textX, iconX;
    if (iconPosition === 'left') {
        const startX = x - (totalWidth / 2);
        iconX = startX + (iconSize / 2);
        textX = startX + iconWidthWithSpacing + (textWidth / 2);
    } else {
        // icon on right
        const startX = x - (totalWidth / 2);
        textX = startX + (textWidth / 2);
        iconX = startX + textWidth + spacing + (iconSize / 2);
    }

    // Draw icon if ready
    if (iconReady && icon) {
        const aspectRatio = icon.naturalWidth / icon.naturalHeight;
        const drawWidth = iconSize * aspectRatio;
        const drawHeight = iconSize;
        ctx.drawImage(
            icon,
            iconX - (drawWidth / 2),
            y - (drawHeight / 2),
            drawWidth,
            drawHeight
        );
    }

    // Draw text using drawStyledText for consistency
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const textY = y + (fontSize * 0.35); // Adjust for baseline

    drawStyledText(
        ctx,
        text,
        textX,
        textY,
        maxWidth,
        { ...drawOpts, elementName, styles: fontStyles }
    );

    ctx.restore();

    return {
        width: totalWidth,
        height: Math.max(iconSize, fontSize)
    };
}

/**
 * Detect icon name from text content
 * @param {string} text - Text to analyze
 * @returns {string} - Icon name or empty string
 */
export function detectIconFromText(text: string): string {
    if (!text) return '';

    // Check for spell indicators
    if (text.includes('/יום') || text.match(/[A-Z][a-z]+/)) {
        return 'spell';
    }

    // Check for damage types
    for (const [type, icon] of Object.entries(DAMAGE_TYPE_ICONS)) {
        if (text.includes(type)) {
            return icon;
        }
    }

    return '';
}

/**
 * Wrap text with centered alignment
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} x - Center X coordinate
 * @param {number} y - Starting Y coordinate
 * @param {number} maxWidth - Maximum width per line
 * @param {number} lineHeight - Height between lines
 * @param {Object} options - Optional glow settings
 * @returns {number} - Final Y position after all lines
 */
export function wrapTextCentered(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
    // Split by newlines first to respect manual line breaks
    const paragraphs = text.split('\n');
    let currentY = y;

    paragraphs.forEach(paragraph => {
        const words = paragraph.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                if (options.glow) {
                    ctx.save();
                    ctx.shadowColor = '#e2c47f';
                    ctx.shadowBlur = 15;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    ctx.fillStyle = '#e2c47f';
                    ctx.fillText(line, x, currentY);
                    ctx.fillText(line, x, currentY);
                    ctx.restore();
                }
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (options.glow) {
            ctx.save();
            ctx.shadowColor = '#e2c47f';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = '#e2c47f';
            ctx.fillText(line, x, currentY);
            ctx.fillText(line, x, currentY);
            ctx.restore();
        }
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
    });

    return currentY;
}

/**
 * Wrap text with left alignment
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} x - Starting X coordinate
 * @param {number} y - Starting Y coordinate
 * @param {number} maxWidth - Maximum width per line
 * @param {number} lineHeight - Height between lines
 * @returns {number} - Final Y position
 */
export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
    return currentY;
}

/**
 * Build font string from options
 * @param {Object} styles - Font styles object
 * @param {string} prefix - Element prefix (e.g., 'name', 'rarity')
 * @param {number} size - Font size in pixels
 * @param {string} fontFamily - Font family name
 * @returns {string} - CSS font string
 */
export function buildFontString(styles, prefix, size, fontFamily) {
    const bold = styles[`${prefix}Bold`] ? 'bold ' : '';
    const italic = styles[`${prefix}Italic`] ? 'italic ' : '';
    return `${italic}${bold}${size}px "${fontFamily}"`;
}

/**
 * Clean up stats text by removing redundant info
 * @param {string} text - Stats text to clean
 * @param {string} locale - Current locale
 * @returns {string} - Cleaned text
 */
export function cleanStatsText(text, locale = 'he') {
    if (!text) return '';

    let result = translateDamageTypes(text, locale);

    // Remove dice patterns ONLY if they're standalone (not part of elemental damage like "+1d6 אש")
    // First, check if text contains elemental damage - if so, DON'T strip dice
    const elementalDamageTypes = ['אש', 'קור', 'ברק', 'רעם', 'חומצה', 'רעל', 'נמק', 'זוהר', 'כוח', 'נפשי',
        'fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic'];
    const hasElementalDamage = elementalDamageTypes.some(type => text.toLowerCase().includes(type.toLowerCase()));

    if (!hasElementalDamage) {
        // Only remove dice if no elemental damage (pure weapon dice shown elsewhere)
        result = result.replace(/\d+d\d+(\s*[+-]\s*\d+)?/gi, '').trim();
    }

    if (locale === 'he') {
        // Remove ONLY physical damage types (redundant with weapon)
        result = result.replace(/(מוחץ|דוקר|חותך)/gi, '').trim();
        // Remove redundant armor class mentions
        result = result.replace(/דרגת שריון\s*:?\s*\d+/gi, '').trim();
        result = result.replace(/דרג"ש\s*:?\s*\d+/gi, '').trim();
        // Remove confusing dexterity text
        result = result.replace(/\(?\s*ללא\s*זריזות\s*\)?/gi, '').trim();
        result = result.replace(/\(?\s*\+\s*זריזות[^)]*\)?/gi, '').trim();
    } else {
        // Remove ONLY physical damage types
        result = result.replace(/(bludgeoning|piercing|slashing)/gi, '').trim();
        // Remove redundant AC mentions
        result = result.replace(/AC\s*:?\s*\d+/gi, '').trim();
        result = result.replace(/Armor Class\s*:?\s*\d+/gi, '').trim();
        // Remove confusing dexterity text
        result = result.replace(/\(?\s*no\s*Dex(terity)?\s*\)?/gi, '').trim();
        result = result.replace(/\(?\s*\+\s*Dex[^)]*\)?/gi, '').trim();
    }

    // Clean up orphaned fragments
    result = result.replace(/\+\d*\s*ל\s*,?/gi, '').trim();
    result = result.replace(/^\s*,\s*/g, '').trim();
    result = result.replace(/\s*,\s*$/g, '').trim();
    result = result.replace(/^\s*\+\s*$/g, '').trim();
    result = result.replace(/\s*,\s*,\s*/g, ', ').trim();
    result = result.replace(/[^\S\n]{2,}/g, ' ');

    return result;
}

export default {
    translateDamageTypes,
    drawStyledText,
    drawTextWithIcon,
    detectIconFromText,
    preloadIcon,
    wrapTextCentered,
    wrapText,
    buildFontString,
    cleanStatsText,
    DAMAGE_TYPES,
    DAMAGE_TYPE_ICONS
};
