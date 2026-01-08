/**
 * D&D 5e Treasure Tables
 * Based on Dungeon Master's Guide Chapter 7 (p.133-149)
 * 
 * This file contains official treasure generation tables for:
 * - Individual treasure by CR
 * - Treasure hoards by CR
 * - Gems and Art Objects by value
 * - Magic Item Tables A-I
 */

// ============================================
// INDIVIDUAL TREASURE (DMG p.136)
// What a single creature might carry
// ============================================

export const INDIVIDUAL_TREASURE = {
    'CR_0_4': {
        coins: [
            { weight: 30, result: { cp: '5d6' } },
            { weight: 30, result: { sp: '4d6' } },
            { weight: 20, result: { ep: '3d6' } },
            { weight: 15, result: { gp: '3d6' } },
            { weight: 5, result: { pp: '1d6' } }
        ]
    },
    'CR_5_10': {
        coins: [
            { weight: 30, result: { cp: '4d6*100', ep: '1d6*10' } },
            { weight: 30, result: { sp: '6d6*10', gp: '2d6*10' } },
            { weight: 25, result: { ep: '3d6*10', gp: '2d6*10' } },
            { weight: 10, result: { gp: '4d6*10' } },
            { weight: 5, result: { gp: '2d6*10', pp: '3d6' } }
        ]
    },
    'CR_11_16': {
        coins: [
            { weight: 20, result: { sp: '4d6*100', gp: '1d6*100' } },
            { weight: 35, result: { ep: '1d6*100', gp: '1d6*100' } },
            { weight: 35, result: { gp: '2d6*100', pp: '1d6*10' } },
            { weight: 10, result: { gp: '2d6*100', pp: '2d6*10' } }
        ]
    },
    'CR_17_PLUS': {
        coins: [
            { weight: 15, result: { ep: '2d6*1000', gp: '8d6*100' } },
            { weight: 40, result: { gp: '1d6*1000', pp: '1d6*100' } },
            { weight: 45, result: { gp: '1d6*1000', pp: '2d6*100' } }
        ]
    }
};

// ============================================
// TREASURE HOARDS (DMG p.137-139)
// Dragon lairs, dungeons, boss encounters
// ============================================

export const TREASURE_HOARDS = {
    'CR_0_4': {
        coins: { cp: '6d6*100', sp: '3d6*100', gp: '2d6*10' },
        rollTable: [
            { min: 1, max: 6, gems: null, art: null, magicItems: null },
            { min: 7, max: 16, gems: { value: 10, count: '2d6' }, art: null, magicItems: null },
            { min: 17, max: 26, gems: null, art: { value: 25, count: '2d4' }, magicItems: null },
            { min: 27, max: 36, gems: { value: 50, count: '2d6' }, art: null, magicItems: null },
            { min: 37, max: 44, gems: { value: 10, count: '2d6' }, art: null, magicItems: { table: 'A', count: '1d6' } },
            { min: 45, max: 52, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'A', count: '1d6' } },
            { min: 53, max: 60, gems: { value: 50, count: '2d6' }, art: null, magicItems: { table: 'A', count: '1d6' } },
            { min: 61, max: 65, gems: { value: 10, count: '2d6' }, art: null, magicItems: { table: 'B', count: '1d4' } },
            { min: 66, max: 70, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'B', count: '1d4' } },
            { min: 71, max: 75, gems: { value: 50, count: '2d6' }, art: null, magicItems: { table: 'B', count: '1d4' } },
            { min: 76, max: 78, gems: { value: 10, count: '2d6' }, art: null, magicItems: { table: 'C', count: '1d4' } },
            { min: 79, max: 80, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'C', count: '1d4' } },
            { min: 81, max: 85, gems: { value: 50, count: '2d6' }, art: null, magicItems: { table: 'C', count: '1d4' } },
            { min: 86, max: 92, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'F', count: '1d4' } },
            { min: 93, max: 97, gems: { value: 50, count: '2d6' }, art: null, magicItems: { table: 'F', count: '1d4' } },
            { min: 98, max: 99, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'G', count: 1 } },
            { min: 100, max: 100, gems: { value: 50, count: '2d6' }, art: null, magicItems: { table: 'G', count: 1 } }
        ]
    },
    'CR_5_10': {
        coins: { cp: '2d6*100', sp: '2d6*1000', gp: '6d6*100', pp: '3d6*10' },
        rollTable: [
            { min: 1, max: 4, gems: null, art: null, magicItems: null },
            { min: 5, max: 10, gems: null, art: { value: 25, count: '2d4' }, magicItems: null },
            { min: 11, max: 16, gems: { value: 50, count: '3d6' }, art: null, magicItems: null },
            { min: 17, max: 22, gems: { value: 100, count: '3d6' }, art: null, magicItems: null },
            { min: 23, max: 28, gems: null, art: { value: 250, count: '2d4' }, magicItems: null },
            { min: 29, max: 32, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'A', count: '1d6' } },
            { min: 33, max: 36, gems: { value: 50, count: '3d6' }, art: null, magicItems: { table: 'A', count: '1d6' } },
            { min: 37, max: 40, gems: { value: 100, count: '3d6' }, art: null, magicItems: { table: 'A', count: '1d6' } },
            { min: 41, max: 44, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'A', count: '1d6' } },
            { min: 45, max: 49, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'B', count: '1d4' } },
            { min: 50, max: 54, gems: { value: 50, count: '3d6' }, art: null, magicItems: { table: 'B', count: '1d4' } },
            { min: 55, max: 59, gems: { value: 100, count: '3d6' }, art: null, magicItems: { table: 'B', count: '1d4' } },
            { min: 60, max: 63, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'B', count: '1d4' } },
            { min: 64, max: 66, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'C', count: '1d4' } },
            { min: 67, max: 69, gems: { value: 50, count: '3d6' }, art: null, magicItems: { table: 'C', count: '1d4' } },
            { min: 70, max: 72, gems: { value: 100, count: '3d6' }, art: null, magicItems: { table: 'C', count: '1d4' } },
            { min: 73, max: 74, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'C', count: '1d4' } },
            { min: 75, max: 76, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'D', count: 1 } },
            { min: 77, max: 78, gems: { value: 50, count: '3d6' }, art: null, magicItems: { table: 'D', count: 1 } },
            { min: 79, max: 79, gems: { value: 100, count: '3d6' }, art: null, magicItems: { table: 'D', count: 1 } },
            { min: 80, max: 80, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'D', count: 1 } },
            { min: 81, max: 84, gems: null, art: { value: 25, count: '2d4' }, magicItems: { table: 'F', count: '1d4' } },
            { min: 85, max: 88, gems: { value: 50, count: '3d6' }, art: null, magicItems: { table: 'F', count: '1d4' } },
            { min: 89, max: 91, gems: { value: 100, count: '3d6' }, art: null, magicItems: { table: 'F', count: '1d4' } },
            { min: 92, max: 94, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'F', count: '1d4' } },
            { min: 95, max: 96, gems: { value: 100, count: '3d6' }, art: null, magicItems: { table: 'G', count: '1d4' } },
            { min: 97, max: 98, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'G', count: '1d4' } },
            { min: 99, max: 99, gems: { value: 100, count: '3d6' }, art: null, magicItems: { table: 'H', count: 1 } },
            { min: 100, max: 100, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'H', count: 1 } }
        ]
    },
    'CR_11_16': {
        coins: { gp: '4d6*1000', pp: '5d6*100' },
        rollTable: [
            { min: 1, max: 3, gems: null, art: null, magicItems: null },
            { min: 4, max: 6, gems: null, art: { value: 250, count: '2d4' }, magicItems: null },
            { min: 7, max: 9, gems: null, art: { value: 750, count: '2d4' }, magicItems: null },
            { min: 10, max: 12, gems: { value: 500, count: '3d6' }, art: null, magicItems: null },
            { min: 13, max: 15, gems: { value: 1000, count: '3d6' }, art: null, magicItems: null },
            { min: 16, max: 19, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'A', count: '1d4' } },
            { min: 20, max: 23, gems: null, art: { value: 750, count: '2d4' }, magicItems: { table: 'A', count: '1d4' } },
            { min: 24, max: 26, gems: { value: 500, count: '3d6' }, art: null, magicItems: { table: 'A', count: '1d4' } },
            { min: 27, max: 29, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'A', count: '1d4' } },
            { min: 30, max: 35, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'B', count: '1d6' } },
            { min: 36, max: 40, gems: null, art: { value: 750, count: '2d4' }, magicItems: { table: 'B', count: '1d6' } },
            { min: 41, max: 45, gems: { value: 500, count: '3d6' }, art: null, magicItems: { table: 'B', count: '1d6' } },
            { min: 46, max: 50, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'B', count: '1d6' } },
            { min: 51, max: 54, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'C', count: '1d6' } },
            { min: 55, max: 58, gems: null, art: { value: 750, count: '2d4' }, magicItems: { table: 'C', count: '1d6' } },
            { min: 59, max: 62, gems: { value: 500, count: '3d6' }, art: null, magicItems: { table: 'C', count: '1d6' } },
            { min: 63, max: 66, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'C', count: '1d6' } },
            { min: 67, max: 68, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'D', count: '1d4' } },
            { min: 69, max: 70, gems: null, art: { value: 750, count: '2d4' }, magicItems: { table: 'D', count: '1d4' } },
            { min: 71, max: 72, gems: { value: 500, count: '3d6' }, art: null, magicItems: { table: 'D', count: '1d4' } },
            { min: 73, max: 74, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'D', count: '1d4' } },
            { min: 75, max: 76, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'E', count: 1 } },
            { min: 77, max: 78, gems: null, art: { value: 750, count: '2d4' }, magicItems: { table: 'E', count: 1 } },
            { min: 79, max: 80, gems: { value: 500, count: '3d6' }, art: null, magicItems: { table: 'E', count: 1 } },
            { min: 81, max: 82, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'E', count: 1 } },
            { min: 83, max: 85, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'F', count: '1d4' } },
            { min: 86, max: 88, gems: null, art: { value: 750, count: '2d4' }, magicItems: { table: 'F', count: '1d4' } },
            { min: 89, max: 90, gems: { value: 500, count: '3d6' }, art: null, magicItems: { table: 'F', count: '1d4' } },
            { min: 91, max: 92, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'F', count: '1d4' } },
            { min: 93, max: 94, gems: null, art: { value: 250, count: '2d4' }, magicItems: { table: 'G', count: '1d4' } },
            { min: 95, max: 96, gems: null, art: { value: 750, count: '2d4' }, magicItems: { table: 'G', count: '1d4' } },
            { min: 97, max: 98, gems: { value: 500, count: '3d6' }, art: null, magicItems: { table: 'G', count: '1d4' } },
            { min: 99, max: 99, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'G', count: '1d4' } },
            { min: 100, max: 100, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'H', count: '1d4' } }
        ]
    },
    'CR_17_PLUS': {
        coins: { gp: '12d6*1000', pp: '8d6*1000' },
        rollTable: [
            { min: 1, max: 2, gems: null, art: null, magicItems: null },
            { min: 3, max: 5, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'C', count: '1d8' } },
            { min: 6, max: 8, gems: null, art: { value: 2500, count: '1d10' }, magicItems: { table: 'C', count: '1d8' } },
            { min: 9, max: 11, gems: null, art: { value: 7500, count: '1d4' }, magicItems: { table: 'C', count: '1d8' } },
            { min: 12, max: 14, gems: { value: 5000, count: '1d8' }, art: null, magicItems: { table: 'C', count: '1d8' } },
            { min: 15, max: 22, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'D', count: '1d6' } },
            { min: 23, max: 30, gems: null, art: { value: 2500, count: '1d10' }, magicItems: { table: 'D', count: '1d6' } },
            { min: 31, max: 38, gems: null, art: { value: 7500, count: '1d4' }, magicItems: { table: 'D', count: '1d6' } },
            { min: 39, max: 46, gems: { value: 5000, count: '1d8' }, art: null, magicItems: { table: 'D', count: '1d6' } },
            { min: 47, max: 52, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'E', count: '1d6' } },
            { min: 53, max: 58, gems: null, art: { value: 2500, count: '1d10' }, magicItems: { table: 'E', count: '1d6' } },
            { min: 59, max: 63, gems: null, art: { value: 7500, count: '1d4' }, magicItems: { table: 'E', count: '1d6' } },
            { min: 64, max: 68, gems: { value: 5000, count: '1d8' }, art: null, magicItems: { table: 'E', count: '1d6' } },
            { min: 69, max: 69, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'G', count: '1d4' } },
            { min: 70, max: 70, gems: null, art: { value: 2500, count: '1d10' }, magicItems: { table: 'G', count: '1d4' } },
            { min: 71, max: 71, gems: null, art: { value: 7500, count: '1d4' }, magicItems: { table: 'G', count: '1d4' } },
            { min: 72, max: 72, gems: { value: 5000, count: '1d8' }, art: null, magicItems: { table: 'G', count: '1d4' } },
            { min: 73, max: 74, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'H', count: '1d4' } },
            { min: 75, max: 76, gems: null, art: { value: 2500, count: '1d10' }, magicItems: { table: 'H', count: '1d4' } },
            { min: 77, max: 78, gems: null, art: { value: 7500, count: '1d4' }, magicItems: { table: 'H', count: '1d4' } },
            { min: 79, max: 80, gems: { value: 5000, count: '1d8' }, art: null, magicItems: { table: 'H', count: '1d4' } },
            { min: 81, max: 85, gems: { value: 1000, count: '3d6' }, art: null, magicItems: { table: 'I', count: '1d4' } },
            { min: 86, max: 90, gems: null, art: { value: 2500, count: '1d10' }, magicItems: { table: 'I', count: '1d4' } },
            { min: 91, max: 95, gems: null, art: { value: 7500, count: '1d4' }, magicItems: { table: 'I', count: '1d4' } },
            { min: 96, max: 100, gems: { value: 5000, count: '1d8' }, art: null, magicItems: { table: 'I', count: '1d4' } }
        ]
    }
};

// ============================================
// GEMS (DMG p.134)
// ============================================

export const GEMS = {
    10: [
        { name: 'Azurite', nameHe: 'אזוריט', description: 'Opaque mottled deep blue' },
        { name: 'Banded agate', nameHe: 'אגת מפוספס', description: 'Translucent striped brown, blue, white, or red' },
        { name: 'Blue quartz', nameHe: 'קוורץ כחול', description: 'Transparent pale blue' },
        { name: 'Eye agate', nameHe: 'אגת עין', description: 'Translucent circles of gray, white, brown, blue, or green' },
        { name: 'Hematite', nameHe: 'המטיט', description: 'Opaque gray-black' },
        { name: 'Lapis lazuli', nameHe: 'לפיס לזולי', description: 'Opaque light and dark blue with yellow flecks' },
        { name: 'Malachite', nameHe: 'מלכיט', description: 'Opaque striated light and dark green' },
        { name: 'Moss agate', nameHe: 'אגט טחב', description: 'Translucent pink or yellow-white with mossy gray or green markings' },
        { name: 'Obsidian', nameHe: 'אובסידיאן', description: 'Opaque black' },
        { name: 'Rhodochrosite', nameHe: 'רודוכרוזיט', description: 'Opaque light pink' },
        { name: 'Tiger eye', nameHe: 'עין הנמר', description: 'Translucent brown with golden center' },
        { name: 'Turquoise', nameHe: 'טורקיז', description: 'Opaque light blue-green' }
    ],
    50: [
        { name: 'Bloodstone', nameHe: 'אבן דם', description: 'Opaque dark gray with red flecks' },
        { name: 'Carnelian', nameHe: 'קרנליאן', description: 'Opaque orange to red-brown' },
        { name: 'Chalcedony', nameHe: 'כלקדון', description: 'Opaque white' },
        { name: 'Chrysoprase', nameHe: 'כריזופראז', description: 'Translucent green' },
        { name: 'Citrine', nameHe: 'ציטרין', description: 'Transparent pale yellow-brown' },
        { name: 'Jasper', nameHe: 'יספה', description: 'Opaque blue, black, or brown' },
        { name: 'Moonstone', nameHe: 'אבן ירח', description: 'Translucent white with pale blue glow' },
        { name: 'Onyx', nameHe: 'אוניקס', description: 'Opaque bands of black and white' },
        { name: 'Quartz', nameHe: 'קוורץ', description: 'Transparent white, smoky gray, or yellow' },
        { name: 'Sardonyx', nameHe: 'סרדוניקס', description: 'Opaque bands of red and white' },
        { name: 'Star rose quartz', nameHe: 'קוורץ ורוד כוכב', description: 'Translucent rosy stone with white star-shaped center' },
        { name: 'Zircon', nameHe: 'זירקון', description: 'Transparent pale blue-green' }
    ],
    100: [
        { name: 'Amber', nameHe: 'ענבר', description: 'Transparent watery gold to rich gold' },
        { name: 'Amethyst', nameHe: 'אמטיסט', description: 'Transparent deep purple' },
        { name: 'Chrysoberyl', nameHe: 'כריזובריל', description: 'Transparent yellow-green to pale green' },
        { name: 'Coral', nameHe: 'אלמוג', description: 'Opaque crimson' },
        { name: 'Garnet', nameHe: 'גרנט', description: 'Transparent red, brown-green, or violet' },
        { name: 'Jade', nameHe: 'ג׳ייד', description: 'Translucent light green, deep green, or white' },
        { name: 'Jet', nameHe: 'ג׳ט', description: 'Opaque deep black' },
        { name: 'Pearl', nameHe: 'פנינה', description: 'Opaque lustrous white, yellow, or pink' },
        { name: 'Spinel', nameHe: 'ספינל', description: 'Transparent red, red-brown, or deep green' },
        { name: 'Tourmaline', nameHe: 'טורמלין', description: 'Transparent pale green, blue, brown, or red' }
    ],
    500: [
        { name: 'Alexandrite', nameHe: 'אלכסנדריט', description: 'Transparent dark green' },
        { name: 'Aquamarine', nameHe: 'אקוומרין', description: 'Transparent pale blue-green' },
        { name: 'Black pearl', nameHe: 'פנינה שחורה', description: 'Opaque pure black' },
        { name: 'Blue spinel', nameHe: 'ספינל כחול', description: 'Transparent deep blue' },
        { name: 'Peridot', nameHe: 'פרידוט', description: 'Transparent rich olive green' },
        { name: 'Topaz', nameHe: 'טופז', description: 'Transparent golden yellow' }
    ],
    1000: [
        { name: 'Black opal', nameHe: 'אופל שחור', description: 'Translucent dark green with black mottling and golden flecks' },
        { name: 'Blue sapphire', nameHe: 'ספיר כחול', description: 'Transparent blue-white to medium blue' },
        { name: 'Emerald', nameHe: 'אמרלד', description: 'Transparent deep bright green' },
        { name: 'Fire opal', nameHe: 'אופל אש', description: 'Translucent fiery red' },
        { name: 'Opal', nameHe: 'אופל', description: 'Translucent pale blue with green and golden mottling' },
        { name: 'Star ruby', nameHe: 'רובי כוכב', description: 'Translucent ruby with white star-shaped center' },
        { name: 'Star sapphire', nameHe: 'ספיר כוכב', description: 'Translucent blue sapphire with white star-shaped center' },
        { name: 'Yellow sapphire', nameHe: 'ספיר צהוב', description: 'Transparent fiery yellow or yellow-green' }
    ],
    5000: [
        { name: 'Black sapphire', nameHe: 'ספיר שחור', description: 'Translucent lustrous black with glowing highlights' },
        { name: 'Diamond', nameHe: 'יהלום', description: 'Transparent blue-white, canary, pink, brown, or blue' },
        { name: 'Jacinth', nameHe: 'ג׳סינת', description: 'Transparent fiery orange' },
        { name: 'Ruby', nameHe: 'רובי', description: 'Transparent clear red to deep crimson' }
    ]
};

// ============================================
// ART OBJECTS (DMG p.135)
// ============================================

export const ART_OBJECTS = {
    25: [
        { name: 'Silver ewer', nameHe: 'כד כסף', description: 'Ornate silver pitcher' },
        { name: 'Carved bone statuette', nameHe: 'פסלון עצם מגולף', description: 'Small carved bone figure' },
        { name: 'Small gold bracelet', nameHe: 'צמיד זהב קטן', description: 'Delicate gold bracelet' },
        { name: 'Cloth-of-gold vestments', nameHe: 'בגדי זהב טקסיים', description: 'Ceremonial clothing woven with gold thread' },
        { name: 'Black velvet mask', nameHe: 'מסכת קטיפה שחורה', description: 'Mask stitched with silver thread' },
        { name: 'Copper chalice', nameHe: 'גביע נחושת', description: 'Copper cup with silver filigree' },
        { name: 'Pair of bone dice', nameHe: 'זוג קוביות עצם', description: 'Engraved bone dice' },
        { name: 'Small mirror', nameHe: 'מראה קטנה', description: 'Mirror in a painted wooden frame' },
        { name: 'Silk handkerchief', nameHe: 'ממחטת משי', description: 'Embroidered silk handkerchief' },
        { name: 'Gold locket', nameHe: 'תליון זהב', description: 'Gold locket with a painted portrait inside' }
    ],
    250: [
        { name: 'Gold ring', nameHe: 'טבעת זהב', description: 'Gold ring set with bloodstones' },
        { name: 'Carved ivory statuette', nameHe: 'פסלון שנהב מגולף', description: 'Ornate ivory figurine' },
        { name: 'Gold bracelet', nameHe: 'צמיד זהב גדול', description: 'Large gold bracelet' },
        { name: 'Silver necklace', nameHe: 'שרשרת כסף', description: 'Silver necklace with a gemstone pendant' },
        { name: 'Bronze crown', nameHe: 'כתר ברונזה', description: 'Bronze crown' },
        { name: 'Silk robe', nameHe: 'גלימת משי', description: 'Silk robe with gold embroidery' },
        { name: 'Large tapestry', nameHe: 'שטיח קיר גדול', description: 'Large well-made tapestry' },
        { name: 'Brass mug', nameHe: 'כוס פליז', description: 'Brass mug with jade inlay' },
        { name: 'Box of turquoise figurines', nameHe: 'קופסת פסלוני טורקיז', description: 'Box of animal figurines' },
        { name: 'Gold bird cage', nameHe: 'כלוב ציפורים זהב', description: 'Gold bird cage with electrum filigree' }
    ],
    750: [
        { name: 'Silver chalice', nameHe: 'גביע כסף', description: 'Silver chalice set with moonstones' },
        { name: 'Silver-plated longsword', nameHe: 'חרב ארוכה מצופה כסף', description: 'Steel longsword with jet set in hilt' },
        { name: 'Carved harp', nameHe: 'נבל מגולף', description: 'Carved harp of exotic wood with ivory inlay and zircon gems' },
        { name: 'Small gold idol', nameHe: 'אליל זהב קטן', description: 'Small gold idol' },
        { name: 'Gold dragon comb', nameHe: 'מסרק דרקון זהב', description: 'Gold dragon comb set with red garnets as eyes' },
        { name: 'Bottle stopper cork', nameHe: 'פקק בקבוק זהב', description: 'Bottle stopper cork embossed with gold leaf and set with amethysts' },
        { name: 'Ceremonial dagger', nameHe: 'פגיון טקסי', description: 'Ceremonial electrum dagger with a black pearl in the Pommel' },
        { name: 'Silver and gold brooch', nameHe: 'סיכה כסף וזהב', description: 'Silver and gold brooch' },
        { name: 'Obsidian statuette', nameHe: 'פסלון אובסידיאן', description: 'Obsidian statuette with gold fittings and inlay' },
        { name: 'Painted gold war mask', nameHe: 'מסכת מלחמה זהב', description: 'Painted gold war mask' }
    ],
    2500: [
        { name: 'Fine gold chain', nameHe: 'שרשרת זהב עדינה', description: 'Fine gold chain set with a fire opal' },
        { name: 'Old masterpiece painting', nameHe: 'ציור מהאמנים הגדולים', description: 'Old masterpiece painting' },
        { name: 'Embroidered silk mantle', nameHe: 'גלימת משי רקומה', description: 'Embroidered silk and velvet mantle set with numerous moonstones' },
        { name: 'Platinum bracelet', nameHe: 'צמיד פלטינה', description: 'Platinum bracelet set with a sapphire' },
        { name: 'Embroidered glove', nameHe: 'כפפה רקומה', description: 'Embroidered glove set with jewel chips' },
        { name: 'Jeweled anklet', nameHe: 'אצעדה משובצת', description: 'Jeweled anklet' },
        { name: 'Gold music box', nameHe: 'תיבת נגינה זהב', description: 'Gold music box' },
        { name: 'Gold circlet', nameHe: 'עטרת זהב', description: 'Gold circlet set with four aquamarines' },
        { name: 'Eye patch', nameHe: 'רטיית עין', description: 'Eye patch with a mock eye set in blue sapphire and moonstone' },
        { name: 'Necklace string of pearls', nameHe: 'שרשרת פנינים', description: 'Necklace string of small pink pearls' }
    ],
    7500: [
        { name: 'Jeweled gold crown', nameHe: 'כתר זהב משובץ', description: 'Jeweled gold crown' },
        { name: 'Jeweled platinum ring', nameHe: 'טבעת פלטינה משובצת', description: 'Jeweled platinum ring' },
        { name: 'Small gold statuette', nameHe: 'פסלון זהב קטן', description: 'Small gold statuette set with rubies' },
        { name: 'Gold cup', nameHe: 'גביע זהב', description: 'Gold cup set with emeralds' },
        { name: 'Gold jewelry box', nameHe: 'קופסת תכשיטי זהב', description: 'Gold jewelry box with platinum filigree' },
        { name: 'Painted gold child\'s sarcophagus', nameHe: 'ארון קבורה מוזהב', description: 'Painted gold child\'s sarcophagus' },
        { name: 'Jade game board', nameHe: 'לוח משחק ג׳ייד', description: 'Jade game board with solid gold playing pieces' },
        { name: 'Bejeweled ivory drinking horn', nameHe: 'קרן שתייה משובצת', description: 'Bejeweled ivory drinking horn with gold filigree' }
    ]
};

// ============================================
// COIN CONVERSION RATES
// ============================================

export const COIN_VALUES = {
    cp: 0.01,  // Copper piece = 1/100 gp
    sp: 0.1,   // Silver piece = 1/10 gp
    ep: 0.5,   // Electrum piece = 1/2 gp
    gp: 1,     // Gold piece = 1 gp
    pp: 10     // Platinum piece = 10 gp
};

// Helper to parse dice notation
export function parseDiceNotation(notation: string): { dice: number; sides: number; multiplier: number } {
    const match = notation.match(/(\d+)d(\d+)(?:\*(\d+))?/);
    if (!match) return { dice: 1, sides: 6, multiplier: 1 };
    return {
        dice: parseInt(match[1]),
        sides: parseInt(match[2]),
        multiplier: match[3] ? parseInt(match[3]) : 1
    };
}

// Roll dice from notation string
export function rollDice(notation: string): number {
    const { dice, sides, multiplier } = parseDiceNotation(notation);
    let total = 0;
    for (let i = 0; i < dice; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total * multiplier;
}
