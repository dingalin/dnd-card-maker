/**
 * Spell Translation Service
 * Translates D&D spell names from English to Hebrew using the spell dictionary
 */

import spellTranslations from '../data/spell-translations.json';

// Create reverse mapping for Hebrew to English (useful for future features)
const hebrewToEnglish: Record<string, string> = {};
for (const [english, hebrew] of Object.entries(spellTranslations.spells)) {
    hebrewToEnglish[hebrew as string] = english;
}

/**
 * Translate an English spell name to Hebrew
 * @param englishName - The English spell name (e.g., "Fireball")
 * @returns The Hebrew translation (e.g., "כדור אש") or the original name if not found
 */
export function translateSpellToHebrew(englishName: string): string {
    // Direct lookup
    const translation = (spellTranslations.spells as Record<string, string>)[englishName];
    if (translation) {
        return translation;
    }

    // Try case-insensitive lookup
    const lowerName = englishName.toLowerCase();
    for (const [spell, hebrew] of Object.entries(spellTranslations.spells)) {
        if (spell.toLowerCase() === lowerName) {
            return hebrew as string;
        }
    }

    // Return original if no translation found
    return englishName;
}

/**
 * Translate a text that may contain spell names
 * Preserves the structure (like "1/יום: Fireball (DC 15)") while translating the spell name
 * @param text - Text possibly containing a spell name
 * @returns Text with translated spell name
 */
export function translateSpellText(text: string): string {
    if (!text) return text;

    console.log('[SpellTranslation] Input:', text);

    let result = text;

    // Helper to escape regex special characters
    function escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    }

    // Sort spells by name length (longest first) to prevent partial matches
    // e.g., "Faerie Fire" should match before "Fire"
    const sortedSpells = Object.entries(spellTranslations.spells)
        .sort((a, b) => b[0].length - a[0].length);

    // Try to translate each known spell name found in the text
    for (const [english, hebrew] of sortedSpells) {
        // Escape special characters and use word boundaries
        const escapedEnglish = escapeRegex(english);
        const regex = new RegExp(`\\b${escapedEnglish}\\b`, 'gi');
        if (regex.test(result)) {
            console.log(`[SpellTranslation] Found: "${english}" -> "${hebrew}"`);
            // Need to create new regex since test() moved the lastIndex
            const replaceRegex = new RegExp(`\\b${escapedEnglish}\\b`, 'gi');
            result = result.replace(replaceRegex, hebrew as string);
        }
    }

    console.log('[SpellTranslation] Output:', result);
    return result;
}


/**
 * Check if a spell name exists in the dictionary
 */
export function hasSpellTranslation(spellName: string): boolean {
    return spellName in spellTranslations.spells ||
        spellName.toLowerCase() in Object.fromEntries(
            Object.entries(spellTranslations.spells).map(([k, v]) => [k.toLowerCase(), v])
        );
}

export { spellTranslations };
;
