/**
 * Tests for src/utils.ts
 * Core utility functions used throughout the application
 */

import { getRarityFromLevel, formatGold } from '../utils';

describe('getRarityFromLevel', () => {
    describe('Level to Rarity Mapping (DMG Guidelines)', () => {
        test('levels 1-4 should return uncommon', () => {
            expect(getRarityFromLevel('1-4')).toBe('uncommon');
        });

        test('levels 5-10 should return rare', () => {
            expect(getRarityFromLevel('5-10')).toBe('rare');
        });

        test('levels 11-16 should return very rare', () => {
            expect(getRarityFromLevel('11-16')).toBe('very rare');
        });

        test('levels 17+ should return legendary', () => {
            expect(getRarityFromLevel('17+')).toBe('legendary');
        });
    });

    describe('Edge Cases', () => {
        test('unknown level should default to uncommon', () => {
            expect(getRarityFromLevel('unknown')).toBe('uncommon');
        });

        test('empty string should default to uncommon', () => {
            expect(getRarityFromLevel('')).toBe('uncommon');
        });

        test('mundane level should default to uncommon', () => {
            expect(getRarityFromLevel('mundane')).toBe('uncommon');
        });
    });
});

describe('formatGold', () => {
    describe('Number Formatting', () => {
        test('formats small numbers correctly', () => {
            expect(formatGold(100)).toMatch(/100/);
        });

        test('formats large numbers with locale separators', () => {
            const result = formatGold(10000);
            // Hebrew locale uses different separator
            expect(result).toMatch(/10[,.]?000/);
        });

        test('handles string input', () => {
            expect(formatGold('500')).toMatch(/500/);
        });
    });

    describe('Edge Cases', () => {
        test('handles zero', () => {
            expect(formatGold(0)).toBe('0');
        });

        test('handles invalid string gracefully', () => {
            expect(formatGold('not a number')).toBe('not a number');
        });
    });
});
