/**
 * Balance Guide - D&D 5e Item Generation Rules
 * 
 * This configuration file defines the balance rules for AI-generated items.
 * Users can customize these in Settings to match their campaign style.
 * 
 * Based on official D&D 5e DMG tables and Sane Magic Item Prices.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export type Rarity = 'common' | 'uncommon' | 'rare' | 'veryRare' | 'legendary';
export type BalanceMode = 'strict' | 'balanced' | 'homebrew';

export interface StatLimits {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    ac: number;
    toHit: number;
    damage: string;  // e.g., "1d6", "2d10"
    saveDC: number;
    spellLevel: number;
}

export interface PriceRange {
    min: number;
    max: number;
}

export interface DurationLimits {
    instantaneous: boolean;
    rounds: number;      // Max rounds for combat effects
    minutes: number;     // Max minutes for short effects
    hours: number;       // Max hours for medium effects
    concentration: boolean;
}

export interface RarityConfig {
    displayName: { en: string; he: string };
    statLimits: StatLimits;
    priceRange: PriceRange;
    duration: DurationLimits;
    charges: { min: number; max: number };
    usesPerDay: number;
    attunementSlots: number;  // How much "attunement budget" this takes
}

export interface BalanceGuideConfig {
    enabled: boolean;
    mode: BalanceMode;
    enforceStats: boolean;
    enforcePrices: boolean;
    enforceDuration: boolean;
    allowCursedItems: boolean;
    maxAttunementSlots: number;  // Default 3 in 5e
    rarities: Record<Rarity, RarityConfig>;
}

// ============================================
// DEFAULT BALANCE RULES (D&D 5e DMG)
// ============================================

export const DEFAULT_BALANCE_GUIDE: BalanceGuideConfig = {
    enabled: true,
    mode: 'balanced',
    enforceStats: true,
    enforcePrices: true,
    enforceDuration: true,
    allowCursedItems: true,
    maxAttunementSlots: 3,

    rarities: {
        common: {
            displayName: { en: 'Common', he: 'נפוץ' },
            statLimits: {
                strength: 20,      // No stat boost for common
                dexterity: 20,
                constitution: 20,
                intelligence: 20,
                wisdom: 20,
                charisma: 20,
                ac: 0,             // No AC bonus
                toHit: 0,          // No to-hit bonus
                damage: '0',       // No extra damage
                saveDC: 0,         // No save DC effects
                spellLevel: 0      // Cantrips only
            },
            priceRange: { min: 50, max: 100 },
            duration: {
                instantaneous: true,
                rounds: 1,
                minutes: 10,
                hours: 1,
                concentration: false
            },
            charges: { min: 0, max: 3 },
            usesPerDay: 3,
            attunementSlots: 0
        },

        uncommon: {
            displayName: { en: 'Uncommon', he: 'לא נפוץ' },
            statLimits: {
                strength: 21,      // Hill Giant Strength
                dexterity: 21,
                constitution: 21,
                intelligence: 21,
                wisdom: 21,
                charisma: 21,
                ac: 1,             // +1 AC
                toHit: 1,          // +1 weapons
                damage: '1d6',     // Small extra damage
                saveDC: 13,        // Low save DC
                spellLevel: 2      // Up to 2nd level spells
            },
            priceRange: { min: 101, max: 500 },
            duration: {
                instantaneous: true,
                rounds: 10,
                minutes: 60,
                hours: 8,
                concentration: true
            },
            charges: { min: 1, max: 6 },
            usesPerDay: 3,
            attunementSlots: 1
        },

        rare: {
            displayName: { en: 'Rare', he: 'נדיר' },
            statLimits: {
                strength: 25,      // Fire Giant Strength
                dexterity: 25,
                constitution: 25,
                intelligence: 25,
                wisdom: 25,
                charisma: 25,
                ac: 2,             // +2 AC
                toHit: 2,          // +2 weapons
                damage: '2d6',     // Medium extra damage
                saveDC: 15,        // Medium save DC
                spellLevel: 5      // Up to 5th level spells
            },
            priceRange: { min: 501, max: 5000 },
            duration: {
                instantaneous: true,
                rounds: 100,       // Up to 10 minutes
                minutes: 480,      // Up to 8 hours
                hours: 24,
                concentration: true
            },
            charges: { min: 3, max: 10 },
            usesPerDay: 5,
            attunementSlots: 1
        },

        veryRare: {
            displayName: { en: 'Very Rare', he: 'נדיר מאוד' },
            statLimits: {
                strength: 27,      // Cloud Giant Strength
                dexterity: 27,
                constitution: 27,
                intelligence: 27,
                wisdom: 27,
                charisma: 27,
                ac: 3,             // +3 AC
                toHit: 3,          // +3 weapons
                damage: '3d6',     // High extra damage
                saveDC: 17,        // High save DC
                spellLevel: 7      // Up to 7th level spells
            },
            priceRange: { min: 5001, max: 50000 },
            duration: {
                instantaneous: true,
                rounds: 600,       // Up to 1 hour
                minutes: 1440,     // Up to 24 hours
                hours: 168,        // Up to 1 week
                concentration: true
            },
            charges: { min: 5, max: 20 },
            usesPerDay: 7,
            attunementSlots: 1
        },

        legendary: {
            displayName: { en: 'Legendary', he: 'אגדי' },
            statLimits: {
                strength: 29,      // Storm Giant Strength
                dexterity: 29,
                constitution: 29,
                intelligence: 29,
                wisdom: 29,
                charisma: 29,
                ac: 3,             // +3 AC (same as very rare)
                toHit: 3,          // +3 weapons
                damage: '4d6',     // Very high extra damage
                saveDC: 19,        // Very high save DC
                spellLevel: 9      // Up to 9th level spells
            },
            priceRange: { min: 50001, max: 500000 },
            duration: {
                instantaneous: true,
                rounds: 6000,      // Up to 10 hours
                minutes: 14400,    // Up to 10 days
                hours: 720,        // Up to 1 month
                concentration: true
            },
            charges: { min: 7, max: 50 },
            usesPerDay: 10,
            attunementSlots: 1
        }
    }
};

// ============================================
// PRESET CONFIGURATIONS
// ============================================

export const BALANCE_PRESETS: Record<BalanceMode, Partial<BalanceGuideConfig>> = {
    strict: {
        mode: 'strict',
        enforceStats: true,
        enforcePrices: true,
        enforceDuration: true,
        allowCursedItems: false
    },
    balanced: {
        mode: 'balanced',
        enforceStats: true,
        enforcePrices: true,
        enforceDuration: true,
        allowCursedItems: true
    },
    homebrew: {
        mode: 'homebrew',
        enforceStats: false,
        enforcePrices: false,
        enforceDuration: false,
        allowCursedItems: true
    }
};

// ============================================
// GIANT STRENGTH REFERENCE (Official)
// ============================================

export const GIANT_STRENGTH_TABLE = {
    'Hill Giant': { strength: 21, rarity: 'uncommon' as Rarity, price: 200 },
    'Stone Giant': { strength: 23, rarity: 'rare' as Rarity, price: 800 },
    'Frost Giant': { strength: 23, rarity: 'rare' as Rarity, price: 800 },
    'Fire Giant': { strength: 25, rarity: 'rare' as Rarity, price: 1500 },
    'Cloud Giant': { strength: 27, rarity: 'veryRare' as Rarity, price: 27000 },
    'Storm Giant': { strength: 29, rarity: 'legendary' as Rarity, price: 50000 }
};

// ============================================
// POTION PRICES (Official DMG)
// ============================================

export const POTION_PRICES = {
    'Potion of Healing': { rarity: 'common', price: 50 },
    'Potion of Greater Healing': { rarity: 'uncommon', price: 200 },
    'Potion of Superior Healing': { rarity: 'rare', price: 500 },
    'Potion of Supreme Healing': { rarity: 'veryRare', price: 5000 },
    'Potion of Climbing': { rarity: 'common', price: 75 },
    'Potion of Invisibility': { rarity: 'veryRare', price: 5000 },
    'Potion of Flying': { rarity: 'veryRare', price: 5000 },
    'Potion of Speed': { rarity: 'veryRare', price: 5000 }
};

// ============================================
// BALANCE GUIDE SERVICE
// ============================================

class BalanceGuideService {
    private config: BalanceGuideConfig;
    private readonly STORAGE_KEY = 'dnd-card-creator-balance-guide';

    constructor() {
        this.config = this.loadConfig();
    }

    // Load config from localStorage or use defaults
    private loadConfig(): BalanceGuideConfig {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_BALANCE_GUIDE, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('[BalanceGuide] Failed to load config:', e);
        }
        return { ...DEFAULT_BALANCE_GUIDE };
    }

    // Save config to localStorage
    saveConfig(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
        } catch (e) {
            console.error('[BalanceGuide] Failed to save config:', e);
        }
    }

    // Get current config
    getConfig(): BalanceGuideConfig {
        return this.config;
    }

    // Update config with partial values
    updateConfig(updates: Partial<BalanceGuideConfig>): void {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }

    // Apply a preset
    applyPreset(preset: BalanceMode): void {
        const presetConfig = BALANCE_PRESETS[preset];
        this.updateConfig(presetConfig);
    }

    // Reset to defaults
    resetToDefaults(): void {
        this.config = { ...DEFAULT_BALANCE_GUIDE };
        this.saveConfig();
    }

    // Get stat limits for a rarity
    getStatLimits(rarity: Rarity): StatLimits {
        return this.config.rarities[rarity].statLimits;
    }

    // Get price range for a rarity
    getPriceRange(rarity: Rarity): PriceRange {
        return this.config.rarities[rarity].priceRange;
    }

    // Validate if a stat value is allowed for a rarity
    isStatAllowed(stat: keyof StatLimits, value: number, rarity: Rarity): boolean {
        if (!this.config.enforceStats) return true;
        const limits = this.getStatLimits(rarity);
        const limit = limits[stat];
        if (typeof limit === 'number') {
            return value <= limit;
        }
        return true;
    }

    // Suggest the correct rarity for a given stat value
    suggestRarityForStat(stat: keyof StatLimits, value: number): Rarity {
        const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'veryRare', 'legendary'];
        for (const rarity of rarities) {
            const limit = this.config.rarities[rarity].statLimits[stat];
            if (typeof limit === 'number' && value <= limit) {
                return rarity;
            }
        }
        return 'legendary';
    }

    // Generate balance rules text for AI prompt
    generatePromptRules(): string {
        if (!this.config.enabled) {
            return '';
        }

        const rules: string[] = [
            '## Balance Rules (MUST FOLLOW):',
            ''
        ];

        if (this.config.enforceStats) {
            rules.push('### Stat Limits by Rarity:');
            for (const [rarity, config] of Object.entries(this.config.rarities)) {
                const limits = config.statLimits;
                rules.push(`- ${rarity.toUpperCase()}: Max Strength/Dex/etc: ${limits.strength}, Max +AC: ${limits.ac}, Max +hit: ${limits.toHit}`);
            }
            rules.push('');
        }

        if (this.config.enforcePrices) {
            rules.push('### Price Ranges by Rarity:');
            for (const [rarity, config] of Object.entries(this.config.rarities)) {
                const price = config.priceRange;
                rules.push(`- ${rarity.toUpperCase()}: ${price.min}-${price.max} gold`);
            }
            rules.push('');
        }

        rules.push('### Official Giant Strength Potions:');
        rules.push('- Strength 21 = Hill Giant = Uncommon');
        rules.push('- Strength 23 = Stone/Frost Giant = Rare');
        rules.push('- Strength 25 = Fire Giant = Rare');
        rules.push('- Strength 27 = Cloud Giant = Very Rare (27,000 gp!)');
        rules.push('- Strength 29 = Storm Giant = Legendary');
        rules.push('');

        rules.push('IMPORTANT: If item has Strength 27, it MUST be Very Rare or Legendary and cost 5,000+ gold!');

        return rules.join('\n');
    }
}

// Singleton export
export const balanceGuide = new BalanceGuideService();
