/**
 * Shop Profiles and Tier System
 * For generating merchant inventories based on shop type and settlement size
 * 
 * Each shop profile defines:
 * - itemTypes: What categories of items they sell
 * - specialItems: Unique items for this shop type
 * - priceModifier: How much they mark up/down prices
 * - services: Non-item services they offer
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ShopProfile {
    id: string;
    displayName: { en: string; he: string };
    icon: string;
    description: { en: string; he: string };
    itemTypes: string[];              // Item categories sold
    excludeRarities?: string[];       // Rarities they never stock
    specialItems?: string[];          // Unique items for this shop
    priceModifier: number;            // 1.0 = standard, 1.5 = 50% markup
    services?: { en: string; he: string }[];  // Services offered
    minTier?: ShopTier;               // Minimum settlement size
    atmosphereKeywords: string[];     // For AI-generated descriptions
}

export type ShopTier = 'village' | 'town' | 'city' | 'metropolis';

export interface ShopTierConfig {
    id: ShopTier;
    displayName: { en: string; he: string };
    maxRarity: string;
    inventorySize: number;
    goldLimit: number;
    magicItemChance: number;          // Chance of having ANY magic items
    description: { en: string; he: string };
}

// ============================================
// SHOP TIER SYSTEM
// ============================================

export const SHOP_TIERS: Record<ShopTier, ShopTierConfig> = {
    village: {
        id: 'village',
        displayName: { en: 'Village', he: 'כפר' },
        maxRarity: 'common',
        inventorySize: 5,
        goldLimit: 100,
        magicItemChance: 0.05,
        description: {
            en: 'Small settlement with basic supplies only',
            he: 'יישוב קטן עם אספקה בסיסית בלבד'
        }
    },
    town: {
        id: 'town',
        displayName: { en: 'Town', he: 'עיירה' },
        maxRarity: 'uncommon',
        inventorySize: 10,
        goldLimit: 500,
        magicItemChance: 0.15,
        description: {
            en: 'Medium settlement with varied supplies',
            he: 'יישוב בינוני עם מגוון אספקה'
        }
    },
    city: {
        id: 'city',
        displayName: { en: 'City', he: 'עיר' },
        maxRarity: 'rare',
        inventorySize: 15,
        goldLimit: 2000,
        magicItemChance: 0.35,
        description: {
            en: 'Large city with specialty shops',
            he: 'עיר גדולה עם חנויות מתמחות'
        }
    },
    metropolis: {
        id: 'metropolis',
        displayName: { en: 'Metropolis', he: 'מטרופולין' },
        maxRarity: 'veryRare',
        inventorySize: 25,
        goldLimit: 10000,
        magicItemChance: 0.60,
        description: {
            en: 'Major trade hub with rare and exotic goods',
            he: 'מרכז סחר עם סחורות נדירות ואקזוטיות'
        }
    }
};

// ============================================
// SHOP PROFILES
// ============================================

export const SHOP_PROFILES: Record<string, ShopProfile> = {
    // ====== WEAPONS & ARMOR ======
    blacksmith: {
        id: 'blacksmith',
        displayName: { en: 'Blacksmith', he: 'נפח' },
        icon: '⚒️',
        description: {
            en: 'Forges weapons and armor from metal',
            he: 'מייצר נשק ושריון ממתכת'
        },
        itemTypes: ['weapon', 'armor'],
        excludeRarities: ['legendary'],
        specialItems: ['Horseshoes', 'Iron spikes', 'Chains'],
        priceModifier: 1.0,
        services: [
            { en: 'Weapon repair', he: 'תיקון נשק' },
            { en: 'Armor fitting', he: 'התאמת שריון' }
        ],
        atmosphereKeywords: ['forge', 'anvil', 'hammer', 'sparks', 'heat']
    },

    weaponsmith: {
        id: 'weaponsmith',
        displayName: { en: 'Weaponsmith', he: 'נשק' },
        icon: '⚔️',
        description: {
            en: 'Specializes in fine weapons',
            he: 'מתמחה בנשק איכותי'
        },
        itemTypes: ['weapon'],
        priceModifier: 1.1,
        services: [
            { en: 'Weapon sharpening', he: 'השחזת נשק' },
            { en: 'Custom weapon crafting', he: 'ייצור נשק מותאם אישית' }
        ],
        minTier: 'town',
        atmosphereKeywords: ['blades', 'steel', 'craftsmanship', 'display racks']
    },

    armorsmith: {
        id: 'armorsmith',
        displayName: { en: 'Armorsmith', he: 'שריינאי' },
        icon: '🛡️',
        description: {
            en: 'Crafts protective armor and shields',
            he: 'מייצר שריון מגן ומגינים'
        },
        itemTypes: ['armor'],
        priceModifier: 1.1,
        services: [
            { en: 'Armor repair', he: 'תיקון שריון' },
            { en: 'Custom fitting', he: 'התאמה אישית' }
        ],
        minTier: 'town',
        atmosphereKeywords: ['leather', 'chainmail', 'plate', 'mannequins']
    },

    // ====== MAGIC ======
    alchemist: {
        id: 'alchemist',
        displayName: { en: 'Alchemist', he: 'אלכימאי' },
        icon: '⚗️',
        description: {
            en: 'Brews potions and elixirs',
            he: 'מכין שיקויים ואליקסירים'
        },
        itemTypes: ['potion'],
        specialItems: ['Antitoxin', 'Alchemist\'s Fire', 'Acid', 'Holy Water'],
        priceModifier: 1.2,
        services: [
            { en: 'Potion identification', he: 'זיהוי שיקויים' },
            { en: 'Custom brewing', he: 'בישול מותאם אישית' }
        ],
        atmosphereKeywords: ['bubbling', 'colorful liquids', 'strange smells', 'glass vials']
    },

    arcaneShop: {
        id: 'arcaneShop',
        displayName: { en: 'Arcane Emporium', he: 'אמפוריון קסמים' },
        icon: '🔮',
        description: {
            en: 'Sells magical items and components',
            he: 'מוכר חפצי קסם ורכיבים'
        },
        itemTypes: ['scroll', 'wand', 'staff', 'wondrous', 'ring'],
        priceModifier: 1.5,
        specialItems: ['Spell components', 'Arcane focus', 'Spellbook (blank)'],
        services: [
            { en: 'Spell scroll copying', he: 'העתקת מגילות קסם' },
            { en: 'Item identification', he: 'זיהוי חפצים' },
            { en: 'Enchantment services', he: 'שירותי הקסמה' }
        ],
        minTier: 'town',
        atmosphereKeywords: ['mystical', 'glowing', 'floating objects', 'ancient tomes']
    },

    scrollShop: {
        id: 'scrollShop',
        displayName: { en: 'Scroll Scrivener', he: 'סופר מגילות' },
        icon: '📜',
        description: {
            en: 'Specializes in magical scrolls',
            he: 'מתמחה במגילות קסומות'
        },
        itemTypes: ['scroll'],
        priceModifier: 1.3,
        services: [
            { en: 'Scroll copying', he: 'העתקת מגילות' },
            { en: 'Spell research', he: 'מחקר כשפים' }
        ],
        minTier: 'city',
        atmosphereKeywords: ['parchment', 'ink', 'quills', 'dusty shelves']
    },

    // ====== GENERAL ======
    generalStore: {
        id: 'generalStore',
        displayName: { en: 'General Store', he: 'מכולת' },
        icon: '🏪',
        description: {
            en: 'Sells everyday supplies and equipment',
            he: 'מוכר ציוד ואספקה יומיומית'
        },
        itemTypes: ['wondrous'],
        excludeRarities: ['rare', 'veryRare', 'legendary'],
        specialItems: ['Rope', 'Torches', 'Rations', 'Backpack', 'Bedroll', 'Waterskin'],
        priceModifier: 1.0,
        atmosphereKeywords: ['cluttered', 'practical', 'dusty', 'varied goods']
    },

    tavern: {
        id: 'tavern',
        displayName: { en: 'Tavern', he: 'פונדק' },
        icon: '🍺',
        description: {
            en: 'Food, drink, and rumors',
            he: 'אוכל, שתייה ושמועות'
        },
        itemTypes: ['potion'],  // Drinks that might be magical
        excludeRarities: ['rare', 'veryRare', 'legendary'],
        specialItems: ['Ale', 'Wine', 'Rations'],
        priceModifier: 0.8,
        services: [
            { en: 'Lodging', he: 'לינה' },
            { en: 'Rumors', he: 'שמועות' },
            { en: 'Hiring help', he: 'שכירת עזרה' }
        ],
        atmosphereKeywords: ['noisy', 'warm', 'fireplace', 'music', 'travelers']
    },

    // ====== SPECIALTY ======
    jeweler: {
        id: 'jeweler',
        displayName: { en: 'Jeweler', he: 'צורף' },
        icon: '💎',
        description: {
            en: 'Fine jewelry and gemstones',
            he: 'תכשיטים ואבני חן'
        },
        itemTypes: ['ring', 'wondrous'],
        specialItems: ['Signet ring', 'Gems', 'Necklace', 'Bracelet'],
        priceModifier: 1.4,
        services: [
            { en: 'Gem appraisal', he: 'הערכת אבני חן' },
            { en: 'Custom jewelry', he: 'תכשיטים מותאמים אישית' },
            { en: 'Ring resizing', he: 'שינוי גודל טבעות' }
        ],
        minTier: 'town',
        atmosphereKeywords: ['sparkling', 'glass cases', 'precious', 'elegant']
    },

    temple: {
        id: 'temple',
        displayName: { en: 'Temple', he: 'מקדש' },
        icon: '⛪',
        description: {
            en: 'Religious items and healing services',
            he: 'חפצי דת ושירותי ריפוי'
        },
        itemTypes: ['potion', 'wondrous', 'scroll'],
        specialItems: ['Holy water', 'Holy symbol', 'Prayer beads', 'Incense'],
        priceModifier: 1.0,  // Fair prices (for the faithful)
        services: [
            { en: 'Healing', he: 'ריפוי' },
            { en: 'Remove curse', he: 'הסרת קללה' },
            { en: 'Resurrection (if high level)', he: 'תחייה (ברמה גבוהה)' }
        ],
        atmosphereKeywords: ['sacred', 'candles', 'incense', 'peaceful', 'statues']
    },

    stables: {
        id: 'stables',
        displayName: { en: 'Stables', he: 'אורוות' },
        icon: '🐴',
        description: {
            en: 'Horses and riding equipment',
            he: 'סוסים וציוד רכיבה'
        },
        itemTypes: ['wondrous'],
        specialItems: ['Saddle', 'Riding horse', 'Draft horse', 'Warhorse', 'Barding'],
        priceModifier: 1.0,
        services: [
            { en: 'Horse care', he: 'טיפול בסוסים' },
            { en: 'Wagon rental', he: 'השכרת עגלה' }
        ],
        atmosphereKeywords: ['hay', 'horses', 'leather', 'outdoors']
    },

    herbalist: {
        id: 'herbalist',
        displayName: { en: 'Herbalist', he: 'צמחונאי' },
        icon: '🌿',
        description: {
            en: 'Natural remedies and spell components',
            he: 'תרופות טבעיות ורכיבי כשפים'
        },
        itemTypes: ['potion'],
        specialItems: ['Healer\'s kit', 'Antitoxin', 'Herbalism kit', 'Poultice'],
        priceModifier: 0.9,
        services: [
            { en: 'Natural healing', he: 'ריפוי טבעי' },
            { en: 'Poison identification', he: 'זיהוי רעלים' }
        ],
        atmosphereKeywords: ['plants', 'dried herbs', 'earthy', 'natural light']
    },

    // ====== UNDERGROUND ======
    blackMarket: {
        id: 'blackMarket',
        displayName: { en: 'Black Market', he: 'שוק שחור' },
        icon: '🗡️',
        description: {
            en: 'Illicit goods, no questions asked',
            he: 'סחורה לא חוקית, בלי שאלות'
        },
        itemTypes: ['weapon', 'poison', 'wondrous', 'potion'],
        specialItems: ['Poison', 'Thieves\' tools', 'Disguise kit', 'Forged documents'],
        priceModifier: 0.7,  // Stolen goods are cheap
        services: [
            { en: 'Fence stolen goods', he: 'מכירת רכוש גנוב' },
            { en: 'Assassination contracts', he: 'חוזי התנקשות' },
            { en: 'Smuggling', he: 'הברחה' }
        ],
        minTier: 'town',
        atmosphereKeywords: ['shadows', 'whispers', 'dangerous', 'hidden']
    },

    fenceShop: {
        id: 'fenceShop',
        displayName: { en: 'Pawnshop', he: 'חנות עבוט' },
        icon: '🔑',
        description: {
            en: 'Buys and sells used goods',
            he: 'קונה ומוכר סחורה משומשת'
        },
        itemTypes: ['weapon', 'armor', 'wondrous', 'ring'],
        priceModifier: 0.6,  // Everything is second-hand
        services: [
            { en: 'Buy used items', he: 'קניית חפצים משומשים' },
            { en: 'Pawn items', he: 'משכון חפצים' }
        ],
        atmosphereKeywords: ['cluttered', 'dusty', 'eclectic', 'mysterious origins']
    },

    // ====== EXOTIC ======
    exoticTrader: {
        id: 'exoticTrader',
        displayName: { en: 'Exotic Trader', he: 'סוחר אקזוטי' },
        icon: '🏺',
        description: {
            en: 'Rare goods from distant lands',
            he: 'סחורות נדירות מארצות רחוקות'
        },
        itemTypes: ['wondrous', 'potion', 'ring'],
        specialItems: ['Spyglass', 'Hourglass', 'Perfume', 'Silk', 'Spices'],
        priceModifier: 1.8,
        minTier: 'city',
        atmosphereKeywords: ['colorful', 'foreign', 'aromatic', 'curious']
    },

    magicalMenagerie: {
        id: 'magicalMenagerie',
        displayName: { en: 'Magical Menagerie', he: 'גן חיות קסום' },
        icon: '🦉',
        description: {
            en: 'Familiars and magical creatures',
            he: 'פמיליארים ויצורים קסומים'
        },
        itemTypes: ['wondrous'],
        specialItems: ['Familiar (owl)', 'Familiar (cat)', 'Familiar (raven)', 'Exotic pet'],
        priceModifier: 2.0,
        minTier: 'city',
        atmosphereKeywords: ['cages', 'animal sounds', 'feathers', 'magical glow']
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getShopProfile(shopId: string): ShopProfile {
    return SHOP_PROFILES[shopId] || SHOP_PROFILES.generalStore;
}

export function getAllShopTypes(): { id: string; displayName: string; icon: string }[] {
    return Object.values(SHOP_PROFILES).map(shop => ({
        id: shop.id,
        displayName: shop.displayName.he,  // Default to Hebrew
        icon: shop.icon
    }));
}

export function getShopsForTier(tier: ShopTier): { id: string; displayName: string; icon: string }[] {
    const tierOrder: ShopTier[] = ['village', 'town', 'city', 'metropolis'];
    const tierIndex = tierOrder.indexOf(tier);

    return Object.values(SHOP_PROFILES)
        .filter(shop => {
            if (!shop.minTier) return true;  // No restriction
            const shopTierIndex = tierOrder.indexOf(shop.minTier);
            return tierIndex >= shopTierIndex;
        })
        .map(shop => ({
            id: shop.id,
            displayName: shop.displayName.he,
            icon: shop.icon
        }));
}

export function getTierConfig(tier: ShopTier): ShopTierConfig {
    return SHOP_TIERS[tier];
}

export function getAllTiers(): ShopTierConfig[] {
    return Object.values(SHOP_TIERS);
}

// Get maximum item value for a shop at a given tier
export function getMaxItemValue(shopId: string, tier: ShopTier): number {
    const shop = getShopProfile(shopId);
    const tierConfig = getTierConfig(tier);
    return tierConfig.goldLimit * shop.priceModifier;
}
