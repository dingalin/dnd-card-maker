/**
 * Tests for src/utils/balancing-validator.ts
 * Ensures item balancing follows D&D 5e DMG guidelines
 */

import {
    RARITY_STANDARDS,
    HEBREW_RARITY_MAP
} from '../utils/balancing-validator';

describe('RARITY_STANDARDS', () => {
    describe('Gold Ranges (DMG Guidelines)', () => {
        test('Common items: 50-100 gp', () => {
            const standard = RARITY_STANDARDS['Common'];
            expect(standard.goldRange.min).toBe(50);
            expect(standard.goldRange.max).toBe(100);
        });

        test('Uncommon items: 100-500 gp', () => {
            const standard = RARITY_STANDARDS['Uncommon'];
            expect(standard.goldRange.min).toBe(100);
            expect(standard.goldRange.max).toBe(500);
        });

        test('Rare items: 500-5000 gp', () => {
            const standard = RARITY_STANDARDS['Rare'];
            expect(standard.goldRange.min).toBe(500);
            expect(standard.goldRange.max).toBe(5000);
        });

        test('Very Rare items: 5000-50000 gp', () => {
            const standard = RARITY_STANDARDS['Very Rare'];
            expect(standard.goldRange.min).toBe(5000);
            expect(standard.goldRange.max).toBe(50000);
        });

        test('Legendary items: 50000-200000 gp', () => {
            const standard = RARITY_STANDARDS['Legendary'];
            expect(standard.goldRange.min).toBe(50000);
            expect(standard.goldRange.max).toBe(200000);
        });
    });

    describe('Max Bonuses (DMG Guidelines)', () => {
        test('Common: +0 bonus', () => {
            expect(RARITY_STANDARDS['Common'].maxBonus).toBe(0);
        });

        test('Uncommon: +1 bonus', () => {
            expect(RARITY_STANDARDS['Uncommon'].maxBonus).toBe(1);
        });

        test('Rare: +2 bonus', () => {
            expect(RARITY_STANDARDS['Rare'].maxBonus).toBe(2);
        });

        test('Very Rare: +3 bonus', () => {
            expect(RARITY_STANDARDS['Very Rare'].maxBonus).toBe(3);
        });

        test('Legendary: +4 bonus', () => {
            expect(RARITY_STANDARDS['Legendary'].maxBonus).toBe(4);
        });
    });

    describe('Spell Level Limits', () => {
        test('Common allows no spells (level 0)', () => {
            expect(RARITY_STANDARDS['Common'].maxSpellLevel).toBe(0);
        });

        test('Uncommon allows up to 2nd level spells', () => {
            expect(RARITY_STANDARDS['Uncommon'].maxSpellLevel).toBe(2);
        });

        test('Rare allows up to 4th level spells', () => {
            expect(RARITY_STANDARDS['Rare'].maxSpellLevel).toBe(4);
        });

        test('Very Rare allows up to 6th level spells', () => {
            expect(RARITY_STANDARDS['Very Rare'].maxSpellLevel).toBe(6);
        });

        test('Legendary allows up to 8th level spells', () => {
            expect(RARITY_STANDARDS['Legendary'].maxSpellLevel).toBe(8);
        });
    });
});

describe('HEBREW_RARITY_MAP', () => {
    test('maps נפוץ to Common', () => {
        expect(HEBREW_RARITY_MAP['נפוץ']).toBe('Common');
    });

    test('maps לא נפוץ to Uncommon', () => {
        expect(HEBREW_RARITY_MAP['לא נפוץ']).toBe('Uncommon');
    });

    test('maps נדיר to Rare', () => {
        expect(HEBREW_RARITY_MAP['נדיר']).toBe('Rare');
    });

    test('maps נדיר מאוד to Very Rare', () => {
        expect(HEBREW_RARITY_MAP['נדיר מאוד']).toBe('Very Rare');
    });

    test('maps אגדי to Legendary', () => {
        expect(HEBREW_RARITY_MAP['אגדי']).toBe('Legendary');
    });

    test('maps ארטיפקט to Artifact', () => {
        expect(HEBREW_RARITY_MAP['ארטיפקט']).toBe('Artifact');
    });
});

describe('Rarity Standards Consistency', () => {
    test('all rarities have Hebrew names', () => {
        for (const [key, standard] of Object.entries(RARITY_STANDARDS)) {
            expect(standard.hebrewName).toBeDefined();
            expect(standard.hebrewName.length).toBeGreaterThan(0);
        }
    });

    test('gold ranges are progressive (each tier is more expensive)', () => {
        const rarities = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];

        for (let i = 1; i < rarities.length; i++) {
            const prevMax = RARITY_STANDARDS[rarities[i - 1]].goldRange.max;
            const currMin = RARITY_STANDARDS[rarities[i]].goldRange.min;

            expect(currMin).toBeGreaterThanOrEqual(prevMax);
        }
    });

    test('max bonus increases with rarity', () => {
        const rarities = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];

        for (let i = 1; i < rarities.length; i++) {
            const prevBonus = RARITY_STANDARDS[rarities[i - 1]].maxBonus;
            const currBonus = RARITY_STANDARDS[rarities[i]].maxBonus;

            expect(currBonus).toBeGreaterThan(prevBonus);
        }
    });
});
