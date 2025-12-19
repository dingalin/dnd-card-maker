/**
 * StateValidator - Validates card data and settings before save
 * Prevents corrupted data from being stored
 */

import type { CardData, AppSettings, RenderOptions } from '../types/index.js';
import { logWarning, logError } from './ErrorLogger.js';

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate CardData before saving
 */
export function validateCardData(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
        errors.push('Card data must be an object');
        return { valid: false, errors, warnings };
    }

    const card = data as Record<string, unknown>;

    // Required fields check (at least one identifier)
    if (!card.name && !card.front) {
        warnings.push('Card has no name or front data');
    }

    // Type validation
    if (card.name && typeof card.name !== 'string') {
        errors.push('Card name must be a string');
    }

    if (card.gold && typeof card.gold !== 'string') {
        warnings.push('Gold should be a string, converting...');
    }

    // Image URL validation
    if (card.imageUrl && typeof card.imageUrl === 'string') {
        if (!isValidImageUrl(card.imageUrl as string)) {
            warnings.push('Image URL may be invalid');
        }
    }

    // Front/Back structure validation
    if (card.front && typeof card.front !== 'object') {
        errors.push('Front data must be an object');
    }

    if (card.back && typeof card.back !== 'object') {
        errors.push('Back data must be an object');
    }

    // Log issues
    if (errors.length > 0) {
        logError('StateValidator', 'Card data validation failed', errors);
    }
    if (warnings.length > 0) {
        logWarning('StateValidator', `Card data warnings: ${warnings.join(', ')}`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate render options
 */
export function validateRenderOptions(options: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!options || typeof options !== 'object') {
        errors.push('Render options must be an object');
        return { valid: false, errors, warnings };
    }

    const opts = options as Record<string, unknown>;

    // Numeric range validations
    const numericRanges: Record<string, [number, number]> = {
        imageScale: [0.1, 5],
        imageRotation: [-180, 180],
        imageFade: [0, 100],
        imageShadow: [0, 100],
        backgroundScale: [0.5, 2],
        centerFade: [0, 100]
    };

    for (const [key, [min, max]] of Object.entries(numericRanges)) {
        if (opts[key] !== undefined) {
            const value = opts[key] as number;
            if (typeof value !== 'number' || isNaN(value)) {
                errors.push(`${key} must be a number`);
            } else if (value < min || value > max) {
                warnings.push(`${key} (${value}) is outside recommended range [${min}, ${max}]`);
            }
        }
    }

    // Font size validations
    if (opts.fontSizes && typeof opts.fontSizes === 'object') {
        const sizes = opts.fontSizes as Record<string, unknown>;
        for (const [key, value] of Object.entries(sizes)) {
            if (typeof value !== 'number' || value < 8 || value > 200) {
                warnings.push(`Font size ${key} (${value}) may be too small or large`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate settings structure
 */
export function validateSettings(settings: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!settings || typeof settings !== 'object') {
        errors.push('Settings must be an object');
        return { valid: false, errors, warnings };
    }

    const s = settings as Record<string, unknown>;

    // Check required sections
    if (!s.front || typeof s.front !== 'object') {
        warnings.push('Missing front settings, using defaults');
    }
    if (!s.back || typeof s.back !== 'object') {
        warnings.push('Missing back settings, using defaults');
    }
    if (!s.style || typeof s.style !== 'object') {
        warnings.push('Missing style settings, using defaults');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Sanitize card data (fix common issues)
 */
export function sanitizeCardData(data: CardData): CardData {
    const sanitized = { ...data };

    // Ensure gold is string
    if (sanitized.gold !== undefined && typeof sanitized.gold !== 'string') {
        sanitized.gold = String(sanitized.gold);
    }

    // Trim strings
    if (sanitized.name) {
        sanitized.name = sanitized.name.trim();
    }
    if (sanitized.quickStats) {
        sanitized.quickStats = sanitized.quickStats.trim();
    }

    // Ensure arrays are arrays
    if (sanitized.weaponProperties && !Array.isArray(sanitized.weaponProperties)) {
        sanitized.weaponProperties = [];
    }

    return sanitized;
}

/**
 * Check if URL is valid image
 */
function isValidImageUrl(url: string): boolean {
    if (!url) return false;

    // Data URLs
    if (url.startsWith('data:image/')) return true;

    // Blob URLs
    if (url.startsWith('blob:')) return true;

    // HTTP URLs
    if (url.startsWith('http://') || url.startsWith('https://')) return true;

    // Relative paths
    if (url.startsWith('/') || url.startsWith('./')) return true;

    return false;
}

export default {
    validateCardData,
    validateRenderOptions,
    validateSettings,
    sanitizeCardData
};
