/**
 * Item Pricing Service
 * Calculates magic item prices based on their abilities and properties
 */

// ============================================
// PRICING CONSTANTS
// ============================================

export const WEAPON_BONUS_PRICES: Record<number, number> = {
    0: 100,   // Magical (no bonus)
    1: 500,
    2: 2000,
    3: 8000
};

export const ARMOR_BONUS_PRICES: Record<number, number> = {
    0: 100,   // Magical (no bonus)
    1: 500,
    2: 2500,
    3: 10000
};

export const EXTRA_DAMAGE_PRICES: Record<string, number> = {
    '1d4': 300,
    '1d6': 600,
    '1d8': 1000,
    '2d6': 2000,
    '2d8': 3000
};

// Premium elements cost more
export const ELEMENT_MULTIPLIERS: Record<string, number> = {
    'fire': 1.0, 'אש': 1.0,
    'cold': 1.0, 'קור': 1.0,
    'lightning': 1.0, 'ברק': 1.0,
    'thunder': 1.0, 'רעם': 1.0,
    'acid': 1.0, 'חומצה': 1.0,
    'poison': 1.0, 'רעל': 1.0,
    // Premium elements
    'necrotic': 1.3, 'נמק': 1.3,
    'radiant': 1.3, 'זוהר': 1.3,
    'force': 1.3, 'כוח': 1.3,
    'psychic': 1.3, 'נפשי': 1.3
};

export const ON_HIT_EFFECT_PRICES: Record<string, number> = {
    'push_5ft': 100, 'דחיפה 5': 100,
    'push_10ft': 200, 'דחיפה 10': 200,
    'slow': 200, 'האטה': 200,
    'bleed': 400, 'דימום': 400,
    'prone': 500, 'הפלה': 500,
    'frightened': 500, 'הפחדה': 500,
    'stunned': 1000, 'הלם': 1000
};

export const SPECIAL_FEATURE_PRICES: Record<string, number> = {
    'returning': 100, 'חוזר': 100,
    'light': 100, 'מאיר': 100,
    'thrown': 100, 'זריקה': 100,
    'reach': 200, 'טווח': 200,
    'keen': 600, 'קריטי 19': 600, '19-20': 600,
    'vicious': 400, 'אכזרי': 400,
    'vorpal': 15000, 'עריפה': 15000,
    'warning': 400, 'אזהרה': 400
};

export const RESISTANCE_PRICES: Record<string, number> = {
    // Standard resistances
    'fire': 300, 'אש': 300,
    'cold': 300, 'קור': 300,
    'lightning': 300, 'ברק': 300,
    'thunder': 300, 'רעם': 300,
    'acid': 300, 'חומצה': 300,
    'poison': 300, 'רעל': 300,
    // Premium resistances
    'necrotic': 500, 'נמק': 500,
    'radiant': 500, 'זוהר': 500,
    'force': 500, 'כוח': 500,
    'psychic': 500, 'נפשי': 500
};

export const ADVANTAGE_PRICES: Record<string, number> = {
    'initiative': 300, 'יוזמה': 300,
    'perception': 300, 'תפיסה': 300,
    'stealth': 300, 'התגנבות': 300,
    'intimidation': 200, 'הפחדה': 200,
    'all_saves': 5000, 'כל הצלות': 5000
};

export const SPELL_LEVEL_PRICES: Record<number, number> = {
    0: 50,    // Cantrip
    1: 200,
    2: 400,
    3: 800,
    4: 1500,
    5: 3000,
    6: 6000,
    7: 10000,
    8: 15000,
    9: 25000
};

export const MATERIAL_PRICES: Record<string, number> = {
    'silvered': 100, 'כסף': 100, 'מצופה כסף': 100,
    'adamantine': 500, 'אדמנטיט': 500,
    'mithral': 500, "מית'ריל": 500
};

export const BASE_ITEM_PRICES: Record<string, number> = {
    // Armor
    'plate': 1500, 'plate armor': 1500, 'לוחות': 1500,
    'half plate': 750, 'half-plate': 750, 'לוחות חצי': 750,
    'splint': 200, 'לוחות ושרשראות': 200,
    'breastplate': 400, 'שריון חזה': 400,
    'chain mail': 75, 'chainmail': 75, 'שריון שרשראות': 75,
    'ring mail': 30, 'ringmail': 30,
    'scale mail': 50, 'scalemail': 50, 'שריון קשקשים': 50,
    'studded leather': 45, 'עור מחוזק': 45,
    'leather': 10, 'עור': 10,
    'padded': 5, 'מרופד': 5,
    'hide': 10, 'פרווה': 10,
    // Generic Types
    'heavy armor': 200, 'שריון כבד': 200,
    'medium armor': 50, 'שריון בינוני': 50,
    'light armor': 10, 'שריון קל': 10,
    // Weapons
    'greataxe': 30, 'גרזן דו': 30, 'גרזן אדיר': 30,
    'greatsword': 50, 'חרב אדירה': 50,
    'longsword': 15, 'חרב ארוכה': 15,
    'shortsword': 10, 'חרב קצרה': 10,
    'heavy crossbow': 50, 'קשת כבדה': 50,
    'hand crossbow': 75, 'קשת יד': 75
};

// ============================================
// PRICE CALCULATION FUNCTIONS
// ============================================

interface ItemPricingInput {
    itemName?: string;
    itemType: 'weapon' | 'armor' | 'ring' | 'wondrous' | 'potion';
    bonus?: number;
    extraDamage?: string;  // e.g., "1d6", "2d8"
    damageElement?: string;
    onHitEffects?: string[];
    specialFeatures?: string[];
    resistances?: string[];
    advantages?: string[];
    spellLevel?: number;
    spellCharges?: number;  // 1 = 1/day, 3 = 3/day
    material?: string;
    requiresAttunement?: boolean;
    isCursed?: boolean;
    isConsumable?: boolean;
}

/**
 * Calculate the price of an item based on its properties
 */
export function calculateItemPrice(input: ItemPricingInput): number {
    let basePrice = 0;

    // 0. Base item cost (e.g. Plate Armor = 1500)
    if (input.itemName) {
        // Sort keys by length (descending) to match specific items (e.g., "half plate") 
        // before generic ones (e.g., "plate")
        const sortedKeys = Object.keys(BASE_ITEM_PRICES).sort((a, b) => b.length - a.length);

        for (const key of sortedKeys) {
            if (input.itemName.toLowerCase().includes(key)) {
                basePrice += BASE_ITEM_PRICES[key];
                console.log(`💲 PricingService Matched: "${key}" in "${input.itemName}" (+${BASE_ITEM_PRICES[key]} gp)`);
                break;
            }
        }

        // Generic fallback for heavy armor if no specific match
        if (basePrice === 0 && input.itemType === 'armor') {
            if (input.itemName.includes('כבד') || input.itemName.includes('heavy') || input.itemName.includes('plate')) {
                basePrice += 200; // Splint mail minimum
            } else if (input.itemName.includes('בינוני') || input.itemName.includes('medium')) {
                basePrice += 50; // Scale mail minimum
            }
        }
    }

    // 1. Base bonus price
    if (input.bonus !== undefined) {
        if (input.itemType === 'weapon') {
            basePrice += WEAPON_BONUS_PRICES[input.bonus] || 0;
        } else if (input.itemType === 'armor') {
            basePrice += ARMOR_BONUS_PRICES[input.bonus] || 0;
        }
    } else if (input.itemType === 'ring' || input.itemType === 'wondrous') {
        basePrice += 200; // Base for non-weapon/armor
    }

    // 2. Extra damage
    if (input.extraDamage) {
        const damagePrice = EXTRA_DAMAGE_PRICES[input.extraDamage] || 0;
        const elementMultiplier = input.damageElement
            ? (ELEMENT_MULTIPLIERS[input.damageElement.toLowerCase()] || 1.0)
            : 1.0;
        basePrice += damagePrice * elementMultiplier;
    }

    // 3. On-hit effects
    if (input.onHitEffects) {
        for (const effect of input.onHitEffects) {
            for (const [key, price] of Object.entries(ON_HIT_EFFECT_PRICES)) {
                if (effect.toLowerCase().includes(key.toLowerCase())) {
                    basePrice += price;
                    break;
                }
            }
        }
    }

    // 4. Special features
    if (input.specialFeatures) {
        for (const feature of input.specialFeatures) {
            for (const [key, price] of Object.entries(SPECIAL_FEATURE_PRICES)) {
                if (feature.toLowerCase().includes(key.toLowerCase())) {
                    basePrice += price;
                    break;
                }
            }
        }
    }

    // 5. Resistances
    if (input.resistances) {
        for (const resistance of input.resistances) {
            for (const [key, price] of Object.entries(RESISTANCE_PRICES)) {
                if (resistance.toLowerCase().includes(key.toLowerCase())) {
                    basePrice += price;
                    break;
                }
            }
        }
    }

    // 6. Advantages
    if (input.advantages) {
        for (const advantage of input.advantages) {
            for (const [key, price] of Object.entries(ADVANTAGE_PRICES)) {
                if (advantage.toLowerCase().includes(key.toLowerCase())) {
                    basePrice += price;
                    break;
                }
            }
        }
    }

    // 7. Spells
    if (input.spellLevel !== undefined) {
        const spellPrice = SPELL_LEVEL_PRICES[input.spellLevel] || 0;
        const chargeMultiplier = input.spellCharges === 3 ? 2 : 1;
        basePrice += spellPrice * chargeMultiplier;
    }

    // 8. Material
    if (input.material) {
        for (const [key, price] of Object.entries(MATERIAL_PRICES)) {
            if (input.material.toLowerCase().includes(key.toLowerCase())) {
                basePrice += price;
                break;
            }
        }
    }

    // 9. Modifiers
    if (input.requiresAttunement) {
        basePrice *= 0.85; // -15%
    }
    if (input.isCursed) {
        basePrice *= 0.75; // -25%
    }
    if (input.isConsumable || input.itemType === 'potion') {
        basePrice *= 0.25; // Consumables are 1/4 price
    }

    // 10. Apply ±20% variance
    const variance = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
    basePrice *= variance;

    // 11. Round to nice numbers (no ones digit)
    return roundToNiceNumber(basePrice);
}

/**
 * Round to nice numbers based on magnitude
 */
function roundToNiceNumber(price: number): number {
    if (price < 100) {
        return Math.round(price / 5) * 5;      // Round to 5s
    } else if (price < 1000) {
        return Math.round(price / 10) * 10;    // Round to 10s
    } else if (price < 10000) {
        return Math.round(price / 50) * 50;    // Round to 50s
    } else {
        return Math.round(price / 100) * 100;  // Round to 100s
    }
}

/**
 * Parse item description and calculate price automatically
 */
export function calculatePriceFromDescription(
    abilityDesc: string,
    itemType: string,
    rarity: string
): number {
    const input: ItemPricingInput = {
        itemName: itemType, // Pass the raw string (e.g. "שריון לוחות") for base cost lookup
        itemType: detectItemType(itemType),
        bonus: detectBonus(abilityDesc),
        extraDamage: detectExtraDamage(abilityDesc),
        damageElement: detectDamageElement(abilityDesc),
        onHitEffects: detectOnHitEffects(abilityDesc),
        specialFeatures: detectSpecialFeatures(abilityDesc),
        resistances: detectResistances(abilityDesc),
        advantages: detectAdvantages(abilityDesc),
        spellLevel: detectSpellLevel(abilityDesc),
        requiresAttunement: abilityDesc.includes('התכווננות') || abilityDesc.toLowerCase().includes('attunement'),
        isCursed: abilityDesc.includes('מקולל') || abilityDesc.toLowerCase().includes('cursed')
    };

    return calculateItemPrice(input);
}

// ============================================
// DETECTION HELPERS
// ============================================

function detectItemType(type: string): 'weapon' | 'armor' | 'ring' | 'wondrous' | 'potion' {
    const lower = type.toLowerCase();
    if (lower.includes('נשק') || lower.includes('חרב') || lower.includes('גרזן') ||
        lower.includes('פטיש') || lower.includes('קשת') || lower.includes('weapon') ||
        lower.includes('sword') || lower.includes('axe')) {
        return 'weapon';
    }
    if (lower.includes('שריון') || lower.includes('armor') || lower.includes('shield') || lower.includes('מגן')) {
        return 'armor';
    }
    if (lower.includes('טבעת') || lower.includes('ring')) {
        return 'ring';
    }
    if (lower.includes('שיקוי') || lower.includes('potion')) {
        return 'potion';
    }
    return 'wondrous';
}

function detectBonus(desc: string): number | undefined {
    const match = desc.match(/\+(\d)/);
    if (match) {
        return parseInt(match[1]);
    }
    return undefined;
}

function detectExtraDamage(desc: string): string | undefined {
    const match = desc.match(/(\d+d\d+)\s*(?:נזק|damage)/i);
    if (match) {
        return match[1];
    }
    return undefined;
}

function detectDamageElement(desc: string): string | undefined {
    const elements = ['אש', 'קור', 'ברק', 'רעם', 'חומצה', 'רעל', 'נמק', 'זוהר', 'כוח', 'נפשי',
        'fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic'];
    for (const element of elements) {
        if (desc.toLowerCase().includes(element.toLowerCase())) {
            return element;
        }
    }
    return undefined;
}

function detectOnHitEffects(desc: string): string[] {
    const effects: string[] = [];
    const keywords = ['דחיפה', 'האטה', 'דימום', 'הפלה', 'הפחדה', 'הלם', 'push', 'slow', 'bleed', 'prone', 'frighten', 'stun'];
    for (const keyword of keywords) {
        if (desc.toLowerCase().includes(keyword.toLowerCase())) {
            effects.push(keyword);
        }
    }
    return effects;
}

function detectSpecialFeatures(desc: string): string[] {
    const features: string[] = [];
    const keywords = ['חוזר', 'מאיר', 'זריקה', 'טווח', '19-20', 'קריטי', 'אכזרי', 'עריפה', 'אזהרה',
        'returning', 'light', 'thrown', 'reach', 'keen', 'vicious', 'vorpal', 'warning'];
    for (const keyword of keywords) {
        if (desc.toLowerCase().includes(keyword.toLowerCase())) {
            features.push(keyword);
        }
    }
    return features;
}

function detectResistances(desc: string): string[] {
    const resistances: string[] = [];
    if (desc.includes('עמידות') || desc.toLowerCase().includes('resistance')) {
        const elements = ['אש', 'קור', 'ברק', 'רעם', 'חומצה', 'רעל', 'נמק', 'זוהר', 'כוח', 'נפשי'];
        for (const element of elements) {
            if (desc.includes(element)) {
                resistances.push(element);
            }
        }
    }
    return resistances;
}

function detectAdvantages(desc: string): string[] {
    const advantages: string[] = [];
    if (desc.includes('יתרון') || desc.toLowerCase().includes('advantage')) {
        const types = ['יוזמה', 'תפיסה', 'התגנבות', 'הפחדה', 'initiative', 'perception', 'stealth', 'intimidation'];
        for (const type of types) {
            if (desc.toLowerCase().includes(type.toLowerCase())) {
                advantages.push(type);
            }
        }
    }
    return advantages;
}

function detectSpellLevel(desc: string): number | undefined {
    // Look for spell level indicators
    const levelMatch = desc.match(/(?:רמה|level)\s*(\d)/i);
    if (levelMatch) {
        return parseInt(levelMatch[1]);
    }
    // Default to level 1 if spell is mentioned but no level
    if (desc.includes('הטל') || desc.includes('cast') || desc.includes('/יום') || desc.includes('/day')) {
        return 1;
    }
    return undefined;
}
