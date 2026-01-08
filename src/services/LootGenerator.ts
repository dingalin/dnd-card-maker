/**
 * LootGenerator - Core Engine for Treasure Generation
 * 
 * Generates treasure based on official D&D 5e DMG tables:
 * - Individual treasure (pocket contents)
 * - Treasure hoards (dragon lairs, dungeons)
 * - Monster-specific loot with contextual items
 */

import {
    INDIVIDUAL_TREASURE,
    TREASURE_HOARDS,
    GEMS,
    ART_OBJECTS,
    rollDice,
    COIN_VALUES
} from '../config/treasure-tables';

import {
    MAGIC_ITEM_TABLES,
    rollOnMagicItemTable
} from '../config/magic-item-tables';

import {
    MONSTER_LOOT_PROFILES,
    getMonsterProfile,
    MonsterLootProfile
} from '../config/monster-loot-profiles';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CoinPile {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
    totalGoldValue: number;
}

export interface GemItem {
    name: string;
    nameHe: string;
    description: string;
    value: number;
}

export interface ArtItem {
    name: string;
    nameHe: string;
    description: string;
    value: number;
}

export interface MagicItemResult {
    name: string;
    rarity: string;
    type: string;
    table: string;
}

export interface LootResult {
    coins: CoinPile;
    gems: GemItem[];
    artObjects: ArtItem[];
    magicItems: MagicItemResult[];
    carriedItems: string[];
    nearbyItems: string[];
    specialItems: string[];
    flavor: string;
    totalValue: number;
}

export interface HoardResult extends LootResult {
    crRange: string;
}

export interface MonsterLootResult extends LootResult {
    monsterType: string;
    cr: number;
    includesHoard: boolean;
}

// ============================================
// CR RANGE MAPPING
// ============================================

function getCRRange(cr: number): 'CR_0_4' | 'CR_5_10' | 'CR_11_16' | 'CR_17_PLUS' {
    if (cr <= 4) return 'CR_0_4';
    if (cr <= 10) return 'CR_5_10';
    if (cr <= 16) return 'CR_11_16';
    return 'CR_17_PLUS';
}

// ============================================
// LOOT GENERATOR CLASS
// ============================================

export class LootGenerator {

    // ==========================================
    // COIN GENERATION
    // ==========================================

    /**
     * Roll coins for individual treasure
     */
    rollIndividualCoins(cr: number): CoinPile {
        const crRange = getCRRange(cr);
        const table = INDIVIDUAL_TREASURE[crRange];

        // Roll d100 for weighted selection
        const roll = Math.floor(Math.random() * 100) + 1;
        let cumulativeWeight = 0;
        let selectedResult = table.coins[0].result;

        for (const entry of table.coins) {
            cumulativeWeight += entry.weight;
            if (roll <= cumulativeWeight) {
                selectedResult = entry.result;
                break;
            }
        }

        // Roll each coin type (cast to access potentially undefined properties safely)
        const result = selectedResult as { cp?: string; sp?: string; ep?: string; gp?: string; pp?: string };
        const coins: CoinPile = {
            cp: result.cp ? rollDice(result.cp) : 0,
            sp: result.sp ? rollDice(result.sp) : 0,
            ep: result.ep ? rollDice(result.ep) : 0,
            gp: result.gp ? rollDice(result.gp) : 0,
            pp: result.pp ? rollDice(result.pp) : 0,
            totalGoldValue: 0
        };

        // Calculate total gold value
        coins.totalGoldValue =
            coins.cp * COIN_VALUES.cp +
            coins.sp * COIN_VALUES.sp +
            coins.ep * COIN_VALUES.ep +
            coins.gp * COIN_VALUES.gp +
            coins.pp * COIN_VALUES.pp;

        return coins;
    }

    /**
     * Roll coins for a treasure hoard
     */
    rollHoardCoins(crRange: 'CR_0_4' | 'CR_5_10' | 'CR_11_16' | 'CR_17_PLUS'): CoinPile {
        const hoard = TREASURE_HOARDS[crRange];
        const hoardCoins = hoard.coins as { cp?: string; sp?: string; ep?: string; gp?: string; pp?: string };

        const coins: CoinPile = {
            cp: hoardCoins.cp ? rollDice(hoardCoins.cp) : 0,
            sp: hoardCoins.sp ? rollDice(hoardCoins.sp) : 0,
            ep: hoardCoins.ep ? rollDice(hoardCoins.ep) : 0,
            gp: hoardCoins.gp ? rollDice(hoardCoins.gp) : 0,
            pp: hoardCoins.pp ? rollDice(hoardCoins.pp) : 0,
            totalGoldValue: 0
        };

        coins.totalGoldValue =
            coins.cp * COIN_VALUES.cp +
            coins.sp * COIN_VALUES.sp +
            coins.ep * COIN_VALUES.ep +
            coins.gp * COIN_VALUES.gp +
            coins.pp * COIN_VALUES.pp;

        return coins;
    }

    // ==========================================
    // GEM & ART GENERATION
    // ==========================================

    /**
     * Roll gems of a specific value
     */
    rollGems(value: number, countNotation: string): GemItem[] {
        const gemList = GEMS[value as keyof typeof GEMS];
        if (!gemList) return [];

        const count = typeof countNotation === 'number'
            ? countNotation
            : rollDice(countNotation);

        const result: GemItem[] = [];
        for (let i = 0; i < count; i++) {
            const gem = gemList[Math.floor(Math.random() * gemList.length)];
            result.push({
                name: gem.name,
                nameHe: gem.nameHe,
                description: gem.description,
                value: value
            });
        }

        return result;
    }

    /**
     * Roll art objects of a specific value
     */
    rollArtObjects(value: number, countNotation: string): ArtItem[] {
        const artList = ART_OBJECTS[value as keyof typeof ART_OBJECTS];
        if (!artList) return [];

        const count = typeof countNotation === 'number'
            ? countNotation
            : rollDice(countNotation);

        const result: ArtItem[] = [];
        for (let i = 0; i < count; i++) {
            const art = artList[Math.floor(Math.random() * artList.length)];
            result.push({
                name: art.name,
                nameHe: art.nameHe,
                description: art.description,
                value: value
            });
        }

        return result;
    }

    // ==========================================
    // MAGIC ITEM GENERATION
    // ==========================================

    /**
     * Roll magic items from a specific table
     */
    rollMagicItems(table: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I', countNotation: string | number): MagicItemResult[] {
        const count = typeof countNotation === 'number'
            ? countNotation
            : rollDice(countNotation);

        const result: MagicItemResult[] = [];
        for (let i = 0; i < count; i++) {
            const item = rollOnMagicItemTable(table);
            result.push({
                ...item,
                table: table
            });
        }

        return result;
    }

    // ==========================================
    // HOARD GENERATION
    // ==========================================

    /**
     * Generate a complete treasure hoard based on CR
     */
    generateHoard(cr: number): HoardResult {
        const crRange = getCRRange(cr);
        const hoard = TREASURE_HOARDS[crRange];

        // Roll coins
        const coins = this.rollHoardCoins(crRange);

        // Roll on hoard table (d100)
        const roll = Math.floor(Math.random() * 100) + 1;
        let selectedRow = hoard.rollTable[0];

        for (const row of hoard.rollTable) {
            if (roll >= row.min && roll <= row.max) {
                selectedRow = row;
                break;
            }
        }

        // Generate gems, art, and magic items based on table result
        const gems: GemItem[] = selectedRow.gems
            ? this.rollGems(selectedRow.gems.value, selectedRow.gems.count)
            : [];

        const artObjects: ArtItem[] = selectedRow.art
            ? this.rollArtObjects(selectedRow.art.value, selectedRow.art.count)
            : [];

        const magicItems: MagicItemResult[] = selectedRow.magicItems
            ? this.rollMagicItems(
                selectedRow.magicItems.table as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I',
                selectedRow.magicItems.count
            )
            : [];

        // Calculate total value
        const gemsValue = gems.reduce((sum, g) => sum + g.value, 0);
        const artValue = artObjects.reduce((sum, a) => sum + a.value, 0);
        const totalValue = coins.totalGoldValue + gemsValue + artValue;

        return {
            crRange,
            coins,
            gems,
            artObjects,
            magicItems,
            carriedItems: [],
            nearbyItems: [],
            specialItems: [],
            flavor: `A treasure hoard appropriate for CR ${cr} encounters`,
            totalValue
        };
    }

    // ==========================================
    // MONSTER LOOT GENERATION
    // ==========================================

    /**
     * Generate loot appropriate for a specific monster type
     */
    generateMonsterLoot(monsterType: string, cr: number, includeHoard: boolean = false): MonsterLootResult {
        const profile = getMonsterProfile(monsterType);

        // Start with individual treasure (scaled by gold multiplier)
        let coins = this.rollIndividualCoins(cr);
        coins.cp = Math.floor(coins.cp * profile.goldMultiplier);
        coins.sp = Math.floor(coins.sp * profile.goldMultiplier);
        coins.ep = Math.floor(coins.ep * profile.goldMultiplier);
        coins.gp = Math.floor(coins.gp * profile.goldMultiplier);
        coins.pp = Math.floor(coins.pp * profile.goldMultiplier);
        coins.totalGoldValue =
            coins.cp * COIN_VALUES.cp +
            coins.sp * COIN_VALUES.sp +
            coins.ep * COIN_VALUES.ep +
            coins.gp * COIN_VALUES.gp +
            coins.pp * COIN_VALUES.pp;

        let gems: GemItem[] = [];
        let artObjects: ArtItem[] = [];
        let magicItems: MagicItemResult[] = [];

        // If including hoard, add hoard treasure
        if (includeHoard) {
            const hoard = this.generateHoard(cr);
            coins.cp += hoard.coins.cp;
            coins.sp += hoard.coins.sp;
            coins.ep += hoard.coins.ep;
            coins.gp += hoard.coins.gp;
            coins.pp += hoard.coins.pp;
            coins.totalGoldValue += hoard.coins.totalGoldValue;

            gems = hoard.gems;
            artObjects = hoard.artObjects;
            magicItems = hoard.magicItems;
        }

        // Select random carried items from profile
        const carriedItems = this._selectRandomItems(profile.carriedItems, Math.min(3, profile.carriedItems.length));

        // Select random nearby items
        const nearbyItems = includeHoard
            ? this._selectRandomItems(profile.nearbyItems, Math.min(3, profile.nearbyItems.length))
            : [];

        // Check for special items
        const specialItems: string[] = [];
        if (profile.specialLoot && Math.random() < 0.3) {  // 30% chance
            specialItems.push(profile.specialLoot[Math.floor(Math.random() * profile.specialLoot.length)]);
        }

        // Maybe add cursed item
        if (profile.cursedChance > 0 && Math.random() < profile.cursedChance) {
            magicItems.push({
                name: 'Cursed Item (DM\'s choice)',
                rarity: 'uncommon',
                type: 'wondrous',
                table: 'CURSED'
            });
        }

        // Get flavor text
        const flavor = profile.flavor.he || profile.flavor.en;

        // Calculate total value
        const gemsValue = gems.reduce((sum, g) => sum + g.value, 0);
        const artValue = artObjects.reduce((sum, a) => sum + a.value, 0);
        const totalValue = coins.totalGoldValue + gemsValue + artValue;

        return {
            monsterType,
            cr,
            includesHoard: includeHoard,
            coins,
            gems,
            artObjects,
            magicItems,
            carriedItems,
            nearbyItems,
            specialItems,
            flavor,
            totalValue
        };
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    /**
     * Select random items from an array
     */
    private _selectRandomItems(items: string[], count: number): string[] {
        if (items.length === 0) return [];

        const shuffled = [...items].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    /**
     * Apply a theme filter to magic items
     */
    filterByTheme(items: MagicItemResult[], themes: string[]): MagicItemResult[] {
        // This is a basic filter - in a real implementation,
        // you'd have theme tags on each item
        return items;  // TODO: Implement theme filtering
    }

    /**
     * Get the rarity order for comparison
     */
    getRarityOrder(rarity: string): number {
        const order: Record<string, number> = {
            'common': 1,
            'uncommon': 2,
            'rare': 3,
            'veryRare': 4,
            'legendary': 5
        };
        return order[rarity] || 0;
    }
}

// Export singleton instance
export const lootGenerator = new LootGenerator();
