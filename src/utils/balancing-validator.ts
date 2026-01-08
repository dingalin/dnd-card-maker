/**
 * D&D 5e Item Balancing Validator
 * Ensures generated items conform to official rarity/power/price standards.
 */

export interface RarityStandard {
    maxBonus: number;
    maxSpellLevel: number;
    goldRange: { min: number; max: number };
    maxExtraDamageDice: number;
    hebrewName: string;
}

export interface ValidationResult {
    isValid: boolean;
    issues: string[];
    fixedItem: any; // Type as 'any' for now, ideally 'CardData' or similar but structure varies
    rarity: string;
    standards: RarityStandard;
}

export interface ValidationOptions {
    autoFix?: boolean;
    mode?: 'simple' | 'creative' | 'mundane';
}

// Official D&D 5e Rarity Limits (Based on DMG guidelines)
export const RARITY_STANDARDS: { [key: string]: RarityStandard } = {
    'Common': {
        maxBonus: 0,
        maxSpellLevel: 0,          // Cantrips only or no spells
        goldRange: { min: 50, max: 100 },  // DMG: 50-100
        maxExtraDamageDice: 0,
        hebrewName: 'נפוץ'
    },
    'Uncommon': {
        maxBonus: 1,
        maxSpellLevel: 2,          // 1st-2nd level spells
        goldRange: { min: 100, max: 500 },  // DMG: 101-500
        maxExtraDamageDice: 1,
        hebrewName: 'לא נפוץ'
    },
    'Rare': {
        maxBonus: 2,
        maxSpellLevel: 4,          // 3rd-4th level spells
        goldRange: { min: 500, max: 5000 },  // DMG: 501-5000
        maxExtraDamageDice: 2,
        hebrewName: 'נדיר'
    },
    'Very Rare': {
        maxBonus: 3,
        maxSpellLevel: 6,          // 5th-6th level spells
        goldRange: { min: 5000, max: 50000 },  // DMG: 5001-50000
        maxExtraDamageDice: 3,
        hebrewName: 'נדיר מאוד'
    },
    'Legendary': {
        maxBonus: 4,
        maxSpellLevel: 8,          // 7th-8th level spells
        goldRange: { min: 50000, max: 200000 },  // DMG: 50001+
        maxExtraDamageDice: 4,
        hebrewName: 'אגדי'
    },
    'Artifact': {
        maxBonus: 5,
        maxSpellLevel: 9,          // 9th level spells
        goldRange: { min: 100000, max: Infinity },
        maxExtraDamageDice: 6,
        hebrewName: 'ארטיפקט'
    }
};

// Hebrew to English rarity mapping
export const HEBREW_RARITY_MAP: { [key: string]: string } = {
    'נפוץ': 'Common',
    'לא נפוץ': 'Uncommon',
    'נדיר': 'Rare',
    'נדיר מאוד': 'Very Rare',
    'אגדי': 'Legendary',
    'ארטיפקט': 'Artifact'
};

/**
 * Normalize rarity to English key
 */
export function normalizeRarity(rarity?: string): string {
    if (!rarity) return 'Common';

    // Check if already English
    if (RARITY_STANDARDS[rarity]) {
        return rarity;
    }

    // Check Hebrew mapping
    if (HEBREW_RARITY_MAP[rarity]) {
        return HEBREW_RARITY_MAP[rarity];
    }

    // Fuzzy match
    const lower = rarity.toLowerCase();
    if (lower.includes('common') && !lower.includes('uncommon')) return 'Common';
    if (lower.includes('uncommon')) return 'Uncommon';
    if (lower.includes('very rare') || lower.includes('נדיר מאוד')) return 'Very Rare';
    if (lower.includes('rare') || lower.includes('נדיר')) return 'Rare';
    if (lower.includes('legendary') || lower.includes('אגדי')) return 'Legendary';
    if (lower.includes('artifact') || lower.includes('ארטיפקט')) return 'Artifact';

    return 'Common';
}

/**
 * Extract bonus from weapon damage string
 * e.g., "1d8+2 slashing" => 2
 */
export function extractBonus(weaponDamage?: string): number {
    if (!weaponDamage) return 0;

    const match = weaponDamage.match(/\+(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * Validate and optionally fix an item's balance
 */
export function validateItemBalance(item: any, options: ValidationOptions = {}): ValidationResult {
    const { autoFix = true, mode = 'creative' } = options;
    const issues: string[] = [];
    const fixedItem = { ...item };

    // Normalize rarity
    const rarity = normalizeRarity(item.rarityHe || item.rarity);
    const standards = RARITY_STANDARDS[rarity];

    if (!standards) {
        issues.push(`Unknown rarity: ${item.rarityHe}`);
        return { isValid: false, issues, fixedItem, rarity, standards };
    }

    // 1. Validate Gold Price
    // Note: Only enforce MINIMUM gold, not maximum. 
    // Expensive base items (e.g., Plate Armor = 1500gp) are valid even at low rarity.
    const gold = parseInt(item.gold, 10) || 0;
    if (gold < standards.goldRange.min) {
        issues.push(`Gold too low for ${rarity}: ${gold} < ${standards.goldRange.min}`);
        if (autoFix) {
            fixedItem.gold = standards.goldRange.min;
        }
    }
    // REMOVED: Gold "too high" check - expensive base items are valid.
    // A mundane Plate Armor (1500gp) should not be capped to 150gp just because it's "Common".

    // 2. Validate Weapon Bonus
    const bonus = extractBonus(item.weaponDamage);
    let maxAllowedBonus = standards.maxBonus;

    // In Simple mode, Legendary can have +4
    if (mode === 'simple' && rarity === 'Legendary') {
        maxAllowedBonus = 4;
    }

    if (bonus > maxAllowedBonus) {
        issues.push(`Bonus too high for ${rarity}: +${bonus} > +${maxAllowedBonus}`);
        if (autoFix) {
            // Instead of reducing bonus, UPGRADE RARITY to match the bonus
            // This is more realistic - a +1 weapon should be Uncommon, not Common with +0
            const rarityForBonus: { [key: number]: { en: string; he: string; minGold: number } } = {
                1: { en: 'Uncommon', he: 'לא נפוץ', minGold: 200 },
                2: { en: 'Rare', he: 'נדיר', minGold: 1500 },
                3: { en: 'Very Rare', he: 'נדיר מאוד', minGold: 10000 },
                4: { en: 'Legendary', he: 'אגדי', minGold: 60000 },
                5: { en: 'Artifact', he: 'ארטיפקט', minGold: 100000 }
            };

            const targetRarity = rarityForBonus[bonus] || rarityForBonus[3];
            fixedItem.rarityHe = targetRarity.he;
            fixedItem.rarity = targetRarity.en;

            // Also update gold if below minimum for new rarity
            const currentGold = parseInt(fixedItem.gold, 10) || 0;
            if (currentGold < targetRarity.minGold) {
                fixedItem.gold = targetRarity.minGold;
            }
        }
    }

    // 3. Validate Armor Class bonus (if applicable)
    if (item.armorClass) {
        const acBonus = parseInt(item.armorClass, 10);
        // AC bonuses typically follow same rules as weapon bonuses
        if (acBonus > maxAllowedBonus && mode !== 'simple') {
            issues.push(`AC bonus too high for ${rarity}: +${acBonus} > +${maxAllowedBonus}`);
            if (autoFix) {
                fixedItem.armorClass = maxAllowedBonus;
            }
        }
    }

    // 4. Validate Extra Damage Dice (e.g., +1d4 fire)
    // Common items should NOT have extra elemental damage
    if (rarity === 'Common') {
        const hasExtraDamage = item.abilityDesc && (
            /\d+d\d+\s*(נזק|damage|אש|קור|ברק|חומצה|רעל|fire|cold|lightning|acid|poison)/i.test(item.abilityDesc) ||
            /extra.*\d+d\d+/i.test(item.abilityDesc) ||
            /להוסיף\s*\d+d\d+/i.test(item.abilityDesc)
        );

        if (hasExtraDamage) {
            issues.push(`Common items cannot have extra damage dice - should be Uncommon or higher`);
            // Auto-fix: upgrade rarity to Uncommon
            if (autoFix) {
                fixedItem.rarityHe = 'לא נפוץ';
                fixedItem.rarity = 'Uncommon';
                // Also update gold to Uncommon range
                const uncommonStandards = RARITY_STANDARDS['Uncommon'];
                const currentGold = parseInt(fixedItem.gold, 10) || 0;
                if (currentGold < uncommonStandards.goldRange.min) {
                    fixedItem.gold = uncommonStandards.goldRange.min;
                }
            }
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
        fixedItem,
        rarity,
        standards
    };
}

/**
 * Generate a balanced gold price for a given rarity
 */
export function generateBalancedGold(rarity: string, powerLevel: 'low' | 'medium' | 'high' = 'medium'): number {
    const standards = RARITY_STANDARDS[normalizeRarity(rarity)];
    if (!standards) return 100;

    const { min, max } = standards.goldRange;
    const range = max - min;

    switch (powerLevel) {
        case 'low':
            return Math.floor(min + range * 0.2);
        case 'medium':
            return Math.floor(min + range * 0.5);
        case 'high':
            return Math.floor(min + range * 0.8);
        default:
            return Math.floor(min + range * 0.5);
    }
}

/**
 * Get the balance rating of an item
 * @returns 'balanced' | 'underpowered' | 'overpowered'
 */
export function getBalanceRating(item: any): 'balanced' | 'underpowered' | 'overpowered' {
    const result = validateItemBalance(item, { autoFix: false });

    if (result.isValid) {
        return 'balanced';
    }

    // Check if issues indicate over/under power
    const hasOverpowered = result.issues.some(i =>
        i.includes('too high') || i.includes('exceeds')
    );
    const hasUnderpowered = result.issues.some(i =>
        i.includes('too low')
    );

    if (hasOverpowered) return 'overpowered';
    if (hasUnderpowered) return 'underpowered';

    return 'balanced';
}

// Export for use in other modules
export default {
    RARITY_STANDARDS,
    HEBREW_RARITY_MAP,
    validateItemBalance,
    generateBalancedGold,
    getBalanceRating,
    normalizeRarity,
    extractBonus
};
