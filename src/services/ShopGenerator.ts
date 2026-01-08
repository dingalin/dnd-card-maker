/**
 * ShopGenerator - Merchant Inventory Generation
 * 
 * Generates shop inventories based on:
 * - Shop type (blacksmith, alchemist, arcane shop, etc.)
 * - Settlement tier (village, town, city, metropolis)
 * - Random availability
 */

import {
    SHOP_PROFILES,
    SHOP_TIERS,
    getShopProfile,
    getTierConfig,
    ShopProfile,
    ShopTierConfig,
    ShopTier
} from '../config/shop-profiles';

import {
    MAGIC_ITEM_TABLES,
    rollOnMagicItemTable
} from '../config/magic-item-tables';

import { lootGenerator, MagicItemResult } from './LootGenerator';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ShopItem {
    name: string;
    nameHe?: string;
    type: string;
    rarity: string;
    basePrice: number;
    shopPrice: number;  // After shop modifier
    inStock: boolean;
    quantity: number;
    isSpecial?: boolean;
    isMagical?: boolean;
}

export interface MerchantNPC {
    name: string;
    race: string;
    personality: string;
    quirk: string;
    priceModifier: number;  // Personal markup/discount
    secret?: string;
}

export interface ShopInventoryResult {
    shopType: string;
    shopName: string;
    tier: ShopTier;
    inventory: ShopItem[];
    services: { en: string; he: string }[];
    merchant?: MerchantNPC;
    totalStockValue: number;
    atmosphere: string;
}

// ============================================
// PRICE TABLES (base prices in gold)
// ============================================

const BASE_PRICES: Record<string, Record<string, number>> = {
    weapon: {
        'Dagger': 2,
        'Light Hammer': 2,
        'Sickle': 1,
        'Club': 0.1,
        'Javelin': 0.5,
        'Mace': 5,
        'Quarterstaff': 0.2,
        'Spear': 1,
        'Crossbow, light': 25,
        'Dart': 0.05,
        'Shortbow': 25,
        'Sling': 0.1,
        'Battleaxe': 10,
        'Flail': 10,
        'Glaive': 20,
        'Greataxe': 30,
        'Greatsword': 50,
        'Halberd': 20,
        'Lance': 10,
        'Longsword': 15,
        'Maul': 10,
        'Morningstar': 15,
        'Pike': 5,
        'Rapier': 25,
        'Scimitar': 25,
        'Shortsword': 10,
        'Trident': 5,
        'War pick': 5,
        'Warhammer': 15,
        'Whip': 2,
        'Blowgun': 10,
        'Crossbow, hand': 75,
        'Crossbow, heavy': 50,
        'Longbow': 50,
        'Net': 1
    },
    armor: {
        'Padded': 5,
        'Leather': 10,
        'Studded leather': 45,
        'Hide': 10,
        'Chain shirt': 50,
        'Scale mail': 50,
        'Breastplate': 400,
        'Half plate': 750,
        'Ring mail': 30,
        'Chain mail': 75,
        'Splint': 200,
        'Plate': 1500,
        'Shield': 10
    },
    potion: {
        'Potion of healing': 50,
        'Potion of greater healing': 200,
        'Potion of superior healing': 500,
        'Potion of supreme healing': 5000,
        'Antitoxin': 50,
        'Potion of climbing': 75,
        'Potion of resistance': 300,
        'Potion of water breathing': 200
    },
    scroll: {
        'Spell scroll (cantrip)': 25,
        'Spell scroll (1st level)': 75,
        'Spell scroll (2nd level)': 150,
        'Spell scroll (3rd level)': 300,
        'Spell scroll (4th level)': 500,
        'Spell scroll (5th level)': 1000
    },
    wondrous: {
        'Bag of holding': 500,
        'Rope of climbing': 200,
        'Lantern of revealing': 500,
        'Goggles of night': 300,
        'Cloak of protection': 500,
        'Boots of elvenkind': 300
    }
};

// Rarity price multipliers
const RARITY_PRICE_RANGES: Record<string, { min: number; max: number }> = {
    'common': { min: 50, max: 100 },
    'uncommon': { min: 101, max: 500 },
    'rare': { min: 501, max: 5000 },
    'veryRare': { min: 5001, max: 50000 },
    'legendary': { min: 50001, max: 200000 }
};

// ============================================
// MERCHANT NAME GENERATORS
// ============================================

const MERCHANT_NAMES = {
    human: ['Aldric', 'Bertram', 'Cedric', 'Dorothea', 'Eleanor', 'Fiona', 'Gerard', 'Helena'],
    dwarf: ['Barendd', 'Dain', 'Eberk', 'Fargrim', 'Gardain', 'Harbek', 'Kildrak', 'Morgran'],
    elf: ['Adran', 'Berrian', 'Carric', 'Enna', 'Galinndan', 'Hadarai', 'Immeral', 'Leshanna'],
    halfling: ['Alton', 'Beau', 'Cade', 'Corrin', 'Eldon', 'Finnan', 'Garret', 'Lindal'],
    gnome: ['Alston', 'Brocc', 'Dimble', 'Fonkin', 'Gerbo', 'Gimble', 'Glim', 'Warryn']
};

const PERSONALITIES = [
    { en: 'Friendly and talkative', he: 'ידידותי ודברן' },
    { en: 'Gruff but fair', he: 'גס אך הוגן' },
    { en: 'Suspicious of strangers', he: 'חשדן כלפי זרים' },
    { en: 'Eager to make a sale', he: 'להוט למכור' },
    { en: 'Knowledgeable expert', he: 'מומחה בעל ידע' },
    { en: 'Distracted and forgetful', he: 'מוסח ושכחן' }
];

const QUIRKS = [
    { en: 'Always polishes the merchandise', he: 'תמיד מצחצח את הסחורה' },
    { en: 'Speaks in third person', he: 'מדבר בגוף שלישי' },
    { en: 'Has a pet that lives in the shop', he: 'יש לו חיית מחמד בחנות' },
    { en: 'Hums while working', he: 'מפזם בזמן העבודה' },
    { en: 'Tells long stories about each item', he: 'מספר סיפורים ארוכים על כל פריט' },
    { en: 'Offers free tea to customers', he: 'מציע תה חינם ללקוחות' }
];

// ============================================
// SHOP GENERATOR CLASS
// ============================================

export class ShopGenerator {

    // ==========================================
    // INVENTORY GENERATION
    // ==========================================

    /**
     * Generate a complete shop inventory
     */
    generateInventory(shopType: string, tier: ShopTier, includeMerchant: boolean = true): ShopInventoryResult {
        const profile = getShopProfile(shopType);
        const tierConfig = getTierConfig(tier);

        // Determine inventory size
        const inventorySize = tierConfig.inventorySize;

        // Generate items
        const inventory: ShopItem[] = [];

        // Add special items for this shop
        if (profile.specialItems) {
            for (const specialItem of profile.specialItems) {
                if (inventory.length >= inventorySize) break;

                inventory.push({
                    name: specialItem,
                    type: 'special',
                    rarity: 'common',
                    basePrice: this._getBasePrice(specialItem),
                    shopPrice: Math.round(this._getBasePrice(specialItem) * profile.priceModifier),
                    inStock: true,
                    quantity: Math.floor(Math.random() * 5) + 1,
                    isSpecial: true,
                    isMagical: false
                });
            }
        }

        // Add mundane items based on shop type
        for (const itemType of profile.itemTypes) {
            if (inventory.length >= inventorySize) break;

            const items = this._generateMundaneItems(itemType, tierConfig, profile);
            inventory.push(...items);
        }

        // Maybe add magic items (based on tier)
        if (Math.random() < tierConfig.magicItemChance) {
            const magicItems = this._generateMagicItems(profile, tierConfig);
            inventory.push(...magicItems);
        }

        // Trim to max size
        inventory.splice(inventorySize);

        // Calculate total value
        const totalStockValue = inventory.reduce((sum, item) => sum + (item.shopPrice * item.quantity), 0);

        // Generate shop name
        const shopName = this._generateShopName(profile, tier);

        // Generate atmosphere description
        const atmosphere = this._generateAtmosphere(profile);

        // Generate merchant NPC
        const merchant = includeMerchant ? this.generateMerchant(profile) : undefined;

        return {
            shopType,
            shopName,
            tier,
            inventory,
            services: profile.services || [],
            merchant,
            totalStockValue,
            atmosphere
        };
    }

    // ==========================================
    // MERCHANT NPC GENERATION
    // ==========================================

    /**
     * Generate a merchant NPC
     */
    generateMerchant(shopProfile: ShopProfile): MerchantNPC {
        // Random race
        const races = Object.keys(MERCHANT_NAMES);
        const race = races[Math.floor(Math.random() * races.length)];

        // Random name from that race
        const names = MERCHANT_NAMES[race as keyof typeof MERCHANT_NAMES];
        const name = names[Math.floor(Math.random() * names.length)];

        // Random personality and quirk
        const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
        const quirk = QUIRKS[Math.floor(Math.random() * QUIRKS.length)];

        // Price modifier based on personality
        let priceModifier = 1.0;
        if (personality.en.includes('Eager')) priceModifier = 0.95;
        if (personality.en.includes('Gruff')) priceModifier = 1.05;
        if (personality.en.includes('Suspicious')) priceModifier = 1.1;

        return {
            name,
            race,
            personality: personality.he,
            quirk: quirk.he,
            priceModifier
        };
    }

    // ==========================================
    // PRIVATE HELPERS
    // ==========================================

    /**
     * Generate mundane items for a type
     */
    private _generateMundaneItems(itemType: string, tierConfig: ShopTierConfig, profile: ShopProfile): ShopItem[] {
        const items: ShopItem[] = [];
        const priceTable = BASE_PRICES[itemType];

        if (!priceTable) return items;

        // Pick random items from the price table
        const availableItems = Object.entries(priceTable)
            .filter(([_, price]) => price <= tierConfig.goldLimit);

        const count = Math.min(3, availableItems.length);
        const shuffled = availableItems.sort(() => Math.random() - 0.5).slice(0, count);

        for (const [name, basePrice] of shuffled) {
            items.push({
                name,
                type: itemType,
                rarity: 'mundane',
                basePrice,
                shopPrice: Math.round(basePrice * profile.priceModifier),
                inStock: Math.random() > 0.1,  // 90% chance in stock
                quantity: Math.floor(Math.random() * 3) + 1,
                isMagical: false
            });
        }

        return items;
    }

    /**
     * Generate magic items based on shop type and tier
     */
    private _generateMagicItems(profile: ShopProfile, tierConfig: ShopTierConfig): ShopItem[] {
        const items: ShopItem[] = [];

        // Determine which table to roll on based on tier
        let table: 'A' | 'B' | 'C' | 'D' | 'F' | 'G';
        switch (tierConfig.id) {
            case 'village': table = 'A'; break;
            case 'town': table = 'A'; break;
            case 'city':
                table = Math.random() > 0.5 ? 'B' : 'F';
                break;
            case 'metropolis':
                const roll = Math.random();
                if (roll < 0.3) table = 'C';
                else if (roll < 0.6) table = 'F';
                else table = 'G';
                break;
            default: table = 'A';
        }

        // Roll 1-2 magic items
        const count = Math.floor(Math.random() * 2) + 1;

        for (let i = 0; i < count; i++) {
            const magicItem = rollOnMagicItemTable(table);

            // Check if rarity is allowed
            if (this._isRarityAllowed(magicItem.rarity, tierConfig, profile)) {
                const priceRange = RARITY_PRICE_RANGES[magicItem.rarity] || RARITY_PRICE_RANGES.common;
                const basePrice = Math.floor(Math.random() * (priceRange.max - priceRange.min)) + priceRange.min;

                items.push({
                    name: magicItem.name,
                    type: magicItem.type,
                    rarity: magicItem.rarity,
                    basePrice,
                    shopPrice: Math.round(basePrice * profile.priceModifier),
                    inStock: true,
                    quantity: 1,
                    isMagical: true
                });
            }
        }

        return items;
    }

    /**
     * Check if a rarity is allowed for this shop/tier
     */
    private _isRarityAllowed(rarity: string, tierConfig: ShopTierConfig, profile: ShopProfile): boolean {
        // Check tier max rarity
        const rarityOrder = ['common', 'uncommon', 'rare', 'veryRare', 'legendary'];
        const maxIndex = rarityOrder.indexOf(tierConfig.maxRarity);
        const itemIndex = rarityOrder.indexOf(rarity);

        if (itemIndex > maxIndex) return false;

        // Check shop exclusions
        if (profile.excludeRarities?.includes(rarity)) return false;

        return true;
    }

    /**
     * Get base price for an item
     */
    private _getBasePrice(itemName: string): number {
        // Check all price tables
        for (const typeTable of Object.values(BASE_PRICES)) {
            if (typeTable[itemName]) return typeTable[itemName];
        }

        // Default prices for common items
        const defaults: Record<string, number> = {
            'Rope': 1,
            'Torches': 0.01,
            'Rations': 0.5,
            'Backpack': 2,
            'Bedroll': 1,
            'Waterskin': 0.2,
            'Holy water': 25,
            'Holy symbol': 5,
            'Horseshoes': 2,
            'Iron spikes': 0.1,
            'Chains': 5,
            'Saddle': 10,
            'Riding horse': 75,
            'Draft horse': 50,
            'Warhorse': 400
        };

        return defaults[itemName] || 10;
    }

    /**
     * Generate a shop name
     */
    private _generateShopName(profile: ShopProfile, tier: ShopTier): string {
        const adjectives = ['The Golden', 'The Silver', 'The Iron', 'The Rusty', 'The Shining', 'The Lucky'];
        const nouns = ['Dragon', 'Anvil', 'Shield', 'Crown', 'Hammer', 'Blade', 'Cauldron', 'Star'];

        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];

        return `${adj} ${noun}`;
    }

    /**
     * Generate atmosphere description
     */
    private _generateAtmosphere(profile: ShopProfile): string {
        const keywords = profile.atmosphereKeywords;
        if (!keywords || keywords.length === 0) {
            return 'A typical shop with various wares on display.';
        }

        return `The shop has an atmosphere of ${keywords.slice(0, 2).join(' and ')}, with ${keywords.slice(2).join(', ')} filling the space.`;
    }
}

// Export singleton instance
export const shopGenerator = new ShopGenerator();
