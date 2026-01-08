/**
 * D&D 5e Magic Item Tables
 * Based on Dungeon Master's Guide Chapter 7 (p.144-149)
 * 
 * Tables A through I, used for hoard generation
 * Each table contains weighted entries for random selection
 */

// ============================================
// MAGIC ITEM TABLE A (DMG p.144)
// Common minor items - potions and scrolls
// ============================================

export const MAGIC_ITEM_TABLE_A = [
    { min: 1, max: 50, item: 'Potion of healing', rarity: 'common', type: 'potion' },
    { min: 51, max: 60, item: 'Spell scroll (cantrip)', rarity: 'common', type: 'scroll' },
    { min: 61, max: 70, item: 'Potion of climbing', rarity: 'common', type: 'potion' },
    { min: 71, max: 90, item: 'Spell scroll (1st level)', rarity: 'common', type: 'scroll' },
    { min: 91, max: 94, item: 'Spell scroll (2nd level)', rarity: 'uncommon', type: 'scroll' },
    { min: 95, max: 98, item: 'Potion of greater healing', rarity: 'uncommon', type: 'potion' },
    { min: 99, max: 99, item: 'Bag of holding', rarity: 'uncommon', type: 'wondrous' },
    { min: 100, max: 100, item: 'Driftglobe', rarity: 'uncommon', type: 'wondrous' }
];

// ============================================
// MAGIC ITEM TABLE B (DMG p.144)
// Uncommon minor items
// ============================================

export const MAGIC_ITEM_TABLE_B = [
    { min: 1, max: 15, item: 'Potion of greater healing', rarity: 'uncommon', type: 'potion' },
    { min: 16, max: 22, item: 'Potion of fire breath', rarity: 'uncommon', type: 'potion' },
    { min: 23, max: 29, item: 'Potion of resistance', rarity: 'uncommon', type: 'potion' },
    { min: 30, max: 34, item: 'Ammunition, +1', rarity: 'uncommon', type: 'weapon' },
    { min: 35, max: 39, item: 'Potion of animal friendship', rarity: 'uncommon', type: 'potion' },
    { min: 40, max: 44, item: 'Potion of hill giant strength', rarity: 'uncommon', type: 'potion' },
    { min: 45, max: 49, item: 'Potion of growth', rarity: 'uncommon', type: 'potion' },
    { min: 50, max: 54, item: 'Potion of water breathing', rarity: 'uncommon', type: 'potion' },
    { min: 55, max: 59, item: 'Spell scroll (2nd level)', rarity: 'uncommon', type: 'scroll' },
    { min: 60, max: 64, item: 'Spell scroll (3rd level)', rarity: 'uncommon', type: 'scroll' },
    { min: 65, max: 67, item: 'Bag of holding', rarity: 'uncommon', type: 'wondrous' },
    { min: 68, max: 70, item: 'Keoghtom\'s ointment', rarity: 'uncommon', type: 'wondrous' },
    { min: 71, max: 73, item: 'Oil of slipperiness', rarity: 'uncommon', type: 'potion' },
    { min: 74, max: 75, item: 'Dust of disappearance', rarity: 'uncommon', type: 'wondrous' },
    { min: 76, max: 77, item: 'Dust of dryness', rarity: 'uncommon', type: 'wondrous' },
    { min: 78, max: 79, item: 'Dust of sneezing and choking', rarity: 'uncommon', type: 'wondrous' },
    { min: 80, max: 81, item: 'Elemental gem', rarity: 'uncommon', type: 'wondrous' },
    { min: 82, max: 83, item: 'Philter of love', rarity: 'uncommon', type: 'potion' },
    { min: 84, max: 84, item: 'Alchemy jug', rarity: 'uncommon', type: 'wondrous' },
    { min: 85, max: 85, item: 'Cap of water breathing', rarity: 'uncommon', type: 'wondrous' },
    { min: 86, max: 86, item: 'Cloak of the manta ray', rarity: 'uncommon', type: 'wondrous' },
    { min: 87, max: 87, item: 'Driftglobe', rarity: 'uncommon', type: 'wondrous' },
    { min: 88, max: 88, item: 'Goggles of night', rarity: 'uncommon', type: 'wondrous' },
    { min: 89, max: 89, item: 'Helm of comprehending languages', rarity: 'uncommon', type: 'wondrous' },
    { min: 90, max: 90, item: 'Immovable rod', rarity: 'uncommon', type: 'wondrous' },
    { min: 91, max: 91, item: 'Lantern of revealing', rarity: 'uncommon', type: 'wondrous' },
    { min: 92, max: 92, item: 'Mariner\'s armor', rarity: 'uncommon', type: 'armor' },
    { min: 93, max: 93, item: 'Mithral armor', rarity: 'uncommon', type: 'armor' },
    { min: 94, max: 94, item: 'Potion of poison', rarity: 'uncommon', type: 'potion' },
    { min: 95, max: 95, item: 'Ring of swimming', rarity: 'uncommon', type: 'ring' },
    { min: 96, max: 96, item: 'Robe of useful items', rarity: 'uncommon', type: 'wondrous' },
    { min: 97, max: 97, item: 'Rope of climbing', rarity: 'uncommon', type: 'wondrous' },
    { min: 98, max: 98, item: 'Saddle of the cavalier', rarity: 'uncommon', type: 'wondrous' },
    { min: 99, max: 99, item: 'Wand of magic detection', rarity: 'uncommon', type: 'wand' },
    { min: 100, max: 100, item: 'Wand of secrets', rarity: 'uncommon', type: 'wand' }
];

// ============================================
// MAGIC ITEM TABLE C (DMG p.145)
// Uncommon minor items (higher end)
// ============================================

export const MAGIC_ITEM_TABLE_C = [
    { min: 1, max: 15, item: 'Potion of superior healing', rarity: 'rare', type: 'potion' },
    { min: 16, max: 22, item: 'Spell scroll (4th level)', rarity: 'rare', type: 'scroll' },
    { min: 23, max: 27, item: 'Ammunition, +2', rarity: 'rare', type: 'weapon' },
    { min: 28, max: 32, item: 'Potion of clairvoyance', rarity: 'rare', type: 'potion' },
    { min: 33, max: 37, item: 'Potion of diminution', rarity: 'rare', type: 'potion' },
    { min: 38, max: 42, item: 'Potion of gaseous form', rarity: 'rare', type: 'potion' },
    { min: 43, max: 47, item: 'Potion of frost giant strength', rarity: 'rare', type: 'potion' },
    { min: 48, max: 52, item: 'Potion of stone giant strength', rarity: 'rare', type: 'potion' },
    { min: 53, max: 57, item: 'Potion of heroism', rarity: 'rare', type: 'potion' },
    { min: 58, max: 62, item: 'Potion of invulnerability', rarity: 'rare', type: 'potion' },
    { min: 63, max: 67, item: 'Potion of mind reading', rarity: 'rare', type: 'potion' },
    { min: 68, max: 72, item: 'Spell scroll (5th level)', rarity: 'rare', type: 'scroll' },
    { min: 73, max: 75, item: 'Elixir of health', rarity: 'rare', type: 'potion' },
    { min: 76, max: 78, item: 'Oil of etherealness', rarity: 'rare', type: 'potion' },
    { min: 79, max: 81, item: 'Potion of fire giant strength', rarity: 'rare', type: 'potion' },
    { min: 82, max: 84, item: 'Quaal\'s feather token', rarity: 'rare', type: 'wondrous' },
    { min: 85, max: 87, item: 'Scroll of protection', rarity: 'rare', type: 'scroll' },
    { min: 88, max: 89, item: 'Bag of beans', rarity: 'rare', type: 'wondrous' },
    { min: 90, max: 91, item: 'Bead of force', rarity: 'rare', type: 'wondrous' },
    { min: 92, max: 92, item: 'Chime of opening', rarity: 'rare', type: 'wondrous' },
    { min: 93, max: 93, item: 'Decanter of endless water', rarity: 'uncommon', type: 'wondrous' },
    { min: 94, max: 94, item: 'Eyes of minute seeing', rarity: 'uncommon', type: 'wondrous' },
    { min: 95, max: 95, item: 'Folding boat', rarity: 'rare', type: 'wondrous' },
    { min: 96, max: 96, item: 'Heward\'s handy haversack', rarity: 'rare', type: 'wondrous' },
    { min: 97, max: 97, item: 'Horseshoes of speed', rarity: 'rare', type: 'wondrous' },
    { min: 98, max: 98, item: 'Necklace of fireballs', rarity: 'rare', type: 'wondrous' },
    { min: 99, max: 99, item: 'Periapt of health', rarity: 'uncommon', type: 'wondrous' },
    { min: 100, max: 100, item: 'Sending Stones', rarity: 'uncommon', type: 'wondrous' }
];

// ============================================
// MAGIC ITEM TABLE D (DMG p.146)
// Rare minor items
// ============================================

export const MAGIC_ITEM_TABLE_D = [
    { min: 1, max: 20, item: 'Potion of supreme healing', rarity: 'veryRare', type: 'potion' },
    { min: 21, max: 30, item: 'Potion of invisibility', rarity: 'veryRare', type: 'potion' },
    { min: 31, max: 40, item: 'Potion of speed', rarity: 'veryRare', type: 'potion' },
    { min: 41, max: 50, item: 'Spell scroll (6th level)', rarity: 'veryRare', type: 'scroll' },
    { min: 51, max: 57, item: 'Spell scroll (7th level)', rarity: 'veryRare', type: 'scroll' },
    { min: 58, max: 62, item: 'Ammunition, +3', rarity: 'veryRare', type: 'weapon' },
    { min: 63, max: 67, item: 'Oil of sharpness', rarity: 'veryRare', type: 'potion' },
    { min: 68, max: 72, item: 'Potion of flying', rarity: 'veryRare', type: 'potion' },
    { min: 73, max: 77, item: 'Potion of cloud giant strength', rarity: 'veryRare', type: 'potion' },
    { min: 78, max: 82, item: 'Potion of longevity', rarity: 'veryRare', type: 'potion' },
    { min: 83, max: 87, item: 'Potion of vitality', rarity: 'veryRare', type: 'potion' },
    { min: 88, max: 92, item: 'Spell scroll (8th level)', rarity: 'veryRare', type: 'scroll' },
    { min: 93, max: 95, item: 'Horseshoes of a zephyr', rarity: 'veryRare', type: 'wondrous' },
    { min: 96, max: 98, item: 'Nolzur\'s marvelous pigments', rarity: 'veryRare', type: 'wondrous' },
    { min: 99, max: 99, item: 'Bag of devouring', rarity: 'veryRare', type: 'wondrous' },
    { min: 100, max: 100, item: 'Portable hole', rarity: 'rare', type: 'wondrous' }
];

// ============================================
// MAGIC ITEM TABLE E (DMG p.146)
// Very Rare minor items
// ============================================

export const MAGIC_ITEM_TABLE_E = [
    { min: 1, max: 30, item: 'Spell scroll (8th level)', rarity: 'veryRare', type: 'scroll' },
    { min: 31, max: 55, item: 'Potion of storm giant strength', rarity: 'legendary', type: 'potion' },
    { min: 56, max: 70, item: 'Potion of supreme healing', rarity: 'veryRare', type: 'potion' },
    { min: 71, max: 85, item: 'Spell scroll (9th level)', rarity: 'legendary', type: 'scroll' },
    { min: 86, max: 93, item: 'Universal solvent', rarity: 'legendary', type: 'wondrous' },
    { min: 94, max: 98, item: 'Arrow of slaying', rarity: 'veryRare', type: 'weapon' },
    { min: 99, max: 100, item: 'Sovereign glue', rarity: 'legendary', type: 'wondrous' }
];

// ============================================
// MAGIC ITEM TABLE F (DMG p.146)
// Uncommon permanent items
// ============================================

export const MAGIC_ITEM_TABLE_F = [
    { min: 1, max: 15, item: 'Weapon, +1', rarity: 'uncommon', type: 'weapon' },
    { min: 16, max: 18, item: 'Shield, +1', rarity: 'uncommon', type: 'armor' },
    { min: 19, max: 21, item: 'Sentinel shield', rarity: 'uncommon', type: 'armor' },
    { min: 22, max: 23, item: 'Amulet of proof against detection and location', rarity: 'uncommon', type: 'wondrous' },
    { min: 24, max: 25, item: 'Boots of elvenkind', rarity: 'uncommon', type: 'wondrous' },
    { min: 26, max: 27, item: 'Boots of striding and springing', rarity: 'uncommon', type: 'wondrous' },
    { min: 28, max: 29, item: 'Bracers of archery', rarity: 'uncommon', type: 'wondrous' },
    { min: 30, max: 31, item: 'Brooch of shielding', rarity: 'uncommon', type: 'wondrous' },
    { min: 32, max: 33, item: 'Broom of flying', rarity: 'uncommon', type: 'wondrous' },
    { min: 34, max: 35, item: 'Cloak of elvenkind', rarity: 'uncommon', type: 'wondrous' },
    { min: 36, max: 37, item: 'Cloak of protection', rarity: 'uncommon', type: 'wondrous' },
    { min: 38, max: 39, item: 'Gauntlets of ogre power', rarity: 'uncommon', type: 'wondrous' },
    { min: 40, max: 41, item: 'Hat of disguise', rarity: 'uncommon', type: 'wondrous' },
    { min: 42, max: 43, item: 'Javelin of lightning', rarity: 'uncommon', type: 'weapon' },
    { min: 44, max: 45, item: 'Pearl of power', rarity: 'uncommon', type: 'wondrous' },
    { min: 46, max: 47, item: 'Rod of the pact keeper, +1', rarity: 'uncommon', type: 'rod' },
    { min: 48, max: 49, item: 'Slippers of spider climbing', rarity: 'uncommon', type: 'wondrous' },
    { min: 50, max: 51, item: 'Staff of the adder', rarity: 'uncommon', type: 'staff' },
    { min: 52, max: 53, item: 'Staff of the python', rarity: 'uncommon', type: 'staff' },
    { min: 54, max: 55, item: 'Sword of vengeance', rarity: 'uncommon', type: 'weapon' },
    { min: 56, max: 57, item: 'Trident of fish command', rarity: 'uncommon', type: 'weapon' },
    { min: 58, max: 59, item: 'Wand of magic missiles', rarity: 'uncommon', type: 'wand' },
    { min: 60, max: 61, item: 'Wand of the war mage, +1', rarity: 'uncommon', type: 'wand' },
    { min: 62, max: 63, item: 'Wand of web', rarity: 'uncommon', type: 'wand' },
    { min: 64, max: 65, item: 'Weapon of warning', rarity: 'uncommon', type: 'weapon' },
    { min: 66, max: 66, item: 'Adamantine armor (chain mail)', rarity: 'uncommon', type: 'armor' },
    { min: 67, max: 67, item: 'Adamantine armor (chain shirt)', rarity: 'uncommon', type: 'armor' },
    { min: 68, max: 68, item: 'Adamantine armor (scale mail)', rarity: 'uncommon', type: 'armor' },
    { min: 69, max: 69, item: 'Bag of tricks (gray)', rarity: 'uncommon', type: 'wondrous' },
    { min: 70, max: 70, item: 'Bag of tricks (rust)', rarity: 'uncommon', type: 'wondrous' },
    { min: 71, max: 71, item: 'Bag of tricks (tan)', rarity: 'uncommon', type: 'wondrous' },
    { min: 72, max: 72, item: 'Boots of the winterlands', rarity: 'uncommon', type: 'wondrous' },
    { min: 73, max: 73, item: 'Circlet of blasting', rarity: 'uncommon', type: 'wondrous' },
    { min: 74, max: 74, item: 'Deck of illusions', rarity: 'uncommon', type: 'wondrous' },
    { min: 75, max: 75, item: 'Eversmoking bottle', rarity: 'uncommon', type: 'wondrous' },
    { min: 76, max: 76, item: 'Eyes of charming', rarity: 'uncommon', type: 'wondrous' },
    { min: 77, max: 77, item: 'Eyes of the eagle', rarity: 'uncommon', type: 'wondrous' },
    { min: 78, max: 78, item: 'Figurine of wondrous power (silver raven)', rarity: 'uncommon', type: 'wondrous' },
    { min: 79, max: 79, item: 'Gem of brightness', rarity: 'uncommon', type: 'wondrous' },
    { min: 80, max: 80, item: 'Gloves of missile snaring', rarity: 'uncommon', type: 'wondrous' },
    { min: 81, max: 81, item: 'Gloves of swimming and climbing', rarity: 'uncommon', type: 'wondrous' },
    { min: 82, max: 82, item: 'Gloves of thievery', rarity: 'uncommon', type: 'wondrous' },
    { min: 83, max: 83, item: 'Headband of intellect', rarity: 'uncommon', type: 'wondrous' },
    { min: 84, max: 84, item: 'Helm of telepathy', rarity: 'uncommon', type: 'wondrous' },
    { min: 85, max: 85, item: 'Instrument of the bards (Doss lute)', rarity: 'uncommon', type: 'wondrous' },
    { min: 86, max: 86, item: 'Instrument of the bards (Fochlucan bandore)', rarity: 'uncommon', type: 'wondrous' },
    { min: 87, max: 87, item: 'Instrument of the bards (Mac-Fuirmidh cittern)', rarity: 'uncommon', type: 'wondrous' },
    { min: 88, max: 88, item: 'Medallion of thoughts', rarity: 'uncommon', type: 'wondrous' },
    { min: 89, max: 89, item: 'Necklace of adaptation', rarity: 'uncommon', type: 'wondrous' },
    { min: 90, max: 90, item: 'Periapt of wound closure', rarity: 'uncommon', type: 'wondrous' },
    { min: 91, max: 91, item: 'Pipes of haunting', rarity: 'uncommon', type: 'wondrous' },
    { min: 92, max: 92, item: 'Pipes of the sewers', rarity: 'uncommon', type: 'wondrous' },
    { min: 93, max: 93, item: 'Ring of jumping', rarity: 'uncommon', type: 'ring' },
    { min: 94, max: 94, item: 'Ring of mind shielding', rarity: 'uncommon', type: 'ring' },
    { min: 95, max: 95, item: 'Ring of warmth', rarity: 'uncommon', type: 'ring' },
    { min: 96, max: 96, item: 'Ring of water walking', rarity: 'uncommon', type: 'ring' },
    { min: 97, max: 97, item: 'Quiver of Ehlonna', rarity: 'uncommon', type: 'wondrous' },
    { min: 98, max: 98, item: 'Stone of good luck', rarity: 'uncommon', type: 'wondrous' },
    { min: 99, max: 99, item: 'Wind fan', rarity: 'uncommon', type: 'wondrous' },
    { min: 100, max: 100, item: 'Winged boots', rarity: 'uncommon', type: 'wondrous' }
];

// ============================================
// MAGIC ITEM TABLE G (DMG p.147)
// Rare permanent items
// ============================================

export const MAGIC_ITEM_TABLE_G = [
    { min: 1, max: 11, item: 'Weapon, +2', rarity: 'rare', type: 'weapon' },
    { min: 12, max: 14, item: 'Figurine of wondrous power (roll d8)', rarity: 'rare', type: 'wondrous' },
    { min: 15, max: 15, item: 'Adamantine armor (breastplate)', rarity: 'uncommon', type: 'armor' },
    { min: 16, max: 16, item: 'Adamantine armor (splint)', rarity: 'uncommon', type: 'armor' },
    { min: 17, max: 17, item: 'Amulet of health', rarity: 'rare', type: 'wondrous' },
    { min: 18, max: 18, item: 'Armor of vulnerability', rarity: 'rare', type: 'armor' },
    { min: 19, max: 19, item: 'Arrow-catching shield', rarity: 'rare', type: 'armor' },
    { min: 20, max: 20, item: 'Belt of dwarvenkind', rarity: 'rare', type: 'wondrous' },
    { min: 21, max: 21, item: 'Belt of hill giant strength', rarity: 'rare', type: 'wondrous' },
    { min: 22, max: 22, item: 'Berserker axe', rarity: 'rare', type: 'weapon' },
    { min: 23, max: 23, item: 'Boots of levitation', rarity: 'rare', type: 'wondrous' },
    { min: 24, max: 24, item: 'Boots of speed', rarity: 'rare', type: 'wondrous' },
    { min: 25, max: 25, item: 'Bowl of commanding water elementals', rarity: 'rare', type: 'wondrous' },
    { min: 26, max: 26, item: 'Bracers of defense', rarity: 'rare', type: 'wondrous' },
    { min: 27, max: 27, item: 'Brazier of commanding fire elementals', rarity: 'rare', type: 'wondrous' },
    { min: 28, max: 28, item: 'Cape of the mountebank', rarity: 'rare', type: 'wondrous' },
    { min: 29, max: 29, item: 'Censer of controlling air elementals', rarity: 'rare', type: 'wondrous' },
    { min: 30, max: 30, item: 'Armor, +1 chain mail', rarity: 'rare', type: 'armor' },
    { min: 31, max: 31, item: 'Armor of resistance (chain mail)', rarity: 'rare', type: 'armor' },
    { min: 32, max: 32, item: 'Armor, +1 chain shirt', rarity: 'rare', type: 'armor' },
    { min: 33, max: 33, item: 'Armor of resistance (chain shirt)', rarity: 'rare', type: 'armor' },
    { min: 34, max: 34, item: 'Cloak of displacement', rarity: 'rare', type: 'wondrous' },
    { min: 35, max: 35, item: 'Cloak of the bat', rarity: 'rare', type: 'wondrous' },
    { min: 36, max: 36, item: 'Cube of force', rarity: 'rare', type: 'wondrous' },
    { min: 37, max: 37, item: 'Daern\'s instant fortress', rarity: 'rare', type: 'wondrous' },
    { min: 38, max: 38, item: 'Dagger of venom', rarity: 'rare', type: 'weapon' },
    { min: 39, max: 39, item: 'Dimensional shackles', rarity: 'rare', type: 'wondrous' },
    { min: 40, max: 40, item: 'Dragon slayer', rarity: 'rare', type: 'weapon' },
    { min: 41, max: 41, item: 'Elven chain', rarity: 'rare', type: 'armor' },
    { min: 42, max: 42, item: 'Flame tongue', rarity: 'rare', type: 'weapon' },
    { min: 43, max: 43, item: 'Gem of seeing', rarity: 'rare', type: 'wondrous' },
    { min: 44, max: 44, item: 'Giant slayer', rarity: 'rare', type: 'weapon' },
    { min: 45, max: 45, item: 'Glamoured studded leather', rarity: 'rare', type: 'armor' },
    { min: 46, max: 46, item: 'Helm of teleportation', rarity: 'rare', type: 'wondrous' },
    { min: 47, max: 47, item: 'Horn of blasting', rarity: 'rare', type: 'wondrous' },
    { min: 48, max: 48, item: 'Horn of Valhalla (silver or brass)', rarity: 'rare', type: 'wondrous' },
    { min: 49, max: 49, item: 'Instrument of the bards (Canaith mandolin)', rarity: 'rare', type: 'wondrous' },
    { min: 50, max: 50, item: 'Instrument of the bards (Cli lyre)', rarity: 'rare', type: 'wondrous' },
    { min: 51, max: 51, item: 'Ioun stone (awareness)', rarity: 'rare', type: 'wondrous' },
    { min: 52, max: 52, item: 'Ioun stone (protection)', rarity: 'rare', type: 'wondrous' },
    { min: 53, max: 53, item: 'Ioun stone (reserve)', rarity: 'rare', type: 'wondrous' },
    { min: 54, max: 54, item: 'Ioun stone (sustenance)', rarity: 'rare', type: 'wondrous' },
    { min: 55, max: 55, item: 'Iron bands of Bilarro', rarity: 'rare', type: 'wondrous' },
    { min: 56, max: 56, item: 'Armor, +1 leather', rarity: 'rare', type: 'armor' },
    { min: 57, max: 57, item: 'Armor of resistance (leather)', rarity: 'rare', type: 'armor' },
    { min: 58, max: 58, item: 'Mace of disruption', rarity: 'rare', type: 'weapon' },
    { min: 59, max: 59, item: 'Mace of smiting', rarity: 'rare', type: 'weapon' },
    { min: 60, max: 60, item: 'Mace of terror', rarity: 'rare', type: 'weapon' },
    { min: 61, max: 61, item: 'Mantle of spell resistance', rarity: 'rare', type: 'wondrous' },
    { min: 62, max: 62, item: 'Necklace of prayer beads', rarity: 'rare', type: 'wondrous' },
    { min: 63, max: 63, item: 'Periapt of proof against poison', rarity: 'rare', type: 'wondrous' },
    { min: 64, max: 64, item: 'Ring of animal influence', rarity: 'rare', type: 'ring' },
    { min: 65, max: 65, item: 'Ring of evasion', rarity: 'rare', type: 'ring' },
    { min: 66, max: 66, item: 'Ring of feather falling', rarity: 'rare', type: 'ring' },
    { min: 67, max: 67, item: 'Ring of free action', rarity: 'rare', type: 'ring' },
    { min: 68, max: 68, item: 'Ring of protection', rarity: 'rare', type: 'ring' },
    { min: 69, max: 69, item: 'Ring of resistance', rarity: 'rare', type: 'ring' },
    { min: 70, max: 70, item: 'Ring of spell storing', rarity: 'rare', type: 'ring' },
    { min: 71, max: 71, item: 'Ring of the ram', rarity: 'rare', type: 'ring' },
    { min: 72, max: 72, item: 'Ring of x-ray vision', rarity: 'rare', type: 'ring' },
    { min: 73, max: 73, item: 'Robe of eyes', rarity: 'rare', type: 'wondrous' },
    { min: 74, max: 74, item: 'Rod of rulership', rarity: 'rare', type: 'rod' },
    { min: 75, max: 75, item: 'Rod of the pact keeper, +2', rarity: 'rare', type: 'rod' },
    { min: 76, max: 76, item: 'Rope of entanglement', rarity: 'rare', type: 'wondrous' },
    { min: 77, max: 77, item: 'Armor, +1 scale mail', rarity: 'rare', type: 'armor' },
    { min: 78, max: 78, item: 'Armor of resistance (scale mail)', rarity: 'rare', type: 'armor' },
    { min: 79, max: 79, item: 'Shield, +2', rarity: 'rare', type: 'armor' },
    { min: 80, max: 80, item: 'Shield of missile attraction', rarity: 'rare', type: 'armor' },
    { min: 81, max: 81, item: 'Staff of charming', rarity: 'rare', type: 'staff' },
    { min: 82, max: 82, item: 'Staff of healing', rarity: 'rare', type: 'staff' },
    { min: 83, max: 83, item: 'Staff of swarming insects', rarity: 'rare', type: 'staff' },
    { min: 84, max: 84, item: 'Staff of the woodlands', rarity: 'rare', type: 'staff' },
    { min: 85, max: 85, item: 'Staff of withering', rarity: 'rare', type: 'staff' },
    { min: 86, max: 86, item: 'Stone of controlling earth elementals', rarity: 'rare', type: 'wondrous' },
    { min: 87, max: 87, item: 'Sun blade', rarity: 'rare', type: 'weapon' },
    { min: 88, max: 88, item: 'Sword of life stealing', rarity: 'rare', type: 'weapon' },
    { min: 89, max: 89, item: 'Sword of wounding', rarity: 'rare', type: 'weapon' },
    { min: 90, max: 90, item: 'Tentacle rod', rarity: 'rare', type: 'rod' },
    { min: 91, max: 91, item: 'Vicious weapon', rarity: 'rare', type: 'weapon' },
    { min: 92, max: 92, item: 'Wand of binding', rarity: 'rare', type: 'wand' },
    { min: 93, max: 93, item: 'Wand of enemy detection', rarity: 'rare', type: 'wand' },
    { min: 94, max: 94, item: 'Wand of fear', rarity: 'rare', type: 'wand' },
    { min: 95, max: 95, item: 'Wand of fireballs', rarity: 'rare', type: 'wand' },
    { min: 96, max: 96, item: 'Wand of lightning bolts', rarity: 'rare', type: 'wand' },
    { min: 97, max: 97, item: 'Wand of paralysis', rarity: 'rare', type: 'wand' },
    { min: 98, max: 98, item: 'Wand of the war mage, +2', rarity: 'rare', type: 'wand' },
    { min: 99, max: 99, item: 'Wand of wonder', rarity: 'rare', type: 'wand' },
    { min: 100, max: 100, item: 'Wings of flying', rarity: 'rare', type: 'wondrous' }
];

// ============================================
// MAGIC ITEM TABLE H (DMG p.148)
// Very Rare permanent items
// ============================================

export const MAGIC_ITEM_TABLE_H = [
    { min: 1, max: 10, item: 'Weapon, +3', rarity: 'veryRare', type: 'weapon' },
    { min: 11, max: 12, item: 'Amulet of the planes', rarity: 'veryRare', type: 'wondrous' },
    { min: 13, max: 14, item: 'Carpet of flying', rarity: 'veryRare', type: 'wondrous' },
    { min: 15, max: 16, item: 'Crystal ball', rarity: 'veryRare', type: 'wondrous' },
    { min: 17, max: 18, item: 'Ring of regeneration', rarity: 'veryRare', type: 'ring' },
    { min: 19, max: 20, item: 'Ring of shooting stars', rarity: 'veryRare', type: 'ring' },
    { min: 21, max: 22, item: 'Ring of telekinesis', rarity: 'veryRare', type: 'ring' },
    { min: 23, max: 24, item: 'Robe of scintillating colors', rarity: 'veryRare', type: 'wondrous' },
    { min: 25, max: 26, item: 'Robe of stars', rarity: 'veryRare', type: 'wondrous' },
    { min: 27, max: 28, item: 'Rod of absorption', rarity: 'veryRare', type: 'rod' },
    { min: 29, max: 30, item: 'Rod of alertness', rarity: 'veryRare', type: 'rod' },
    { min: 31, max: 32, item: 'Rod of security', rarity: 'veryRare', type: 'rod' },
    { min: 33, max: 34, item: 'Rod of the pact keeper, +3', rarity: 'veryRare', type: 'rod' },
    { min: 35, max: 36, item: 'Scimitar of speed', rarity: 'veryRare', type: 'weapon' },
    { min: 37, max: 38, item: 'Shield, +3', rarity: 'veryRare', type: 'armor' },
    { min: 39, max: 40, item: 'Staff of fire', rarity: 'veryRare', type: 'staff' },
    { min: 41, max: 42, item: 'Staff of frost', rarity: 'veryRare', type: 'staff' },
    { min: 43, max: 44, item: 'Staff of power', rarity: 'veryRare', type: 'staff' },
    { min: 45, max: 46, item: 'Staff of striking', rarity: 'veryRare', type: 'staff' },
    { min: 47, max: 48, item: 'Staff of thunder and lightning', rarity: 'veryRare', type: 'staff' },
    { min: 49, max: 50, item: 'Sword of sharpness', rarity: 'veryRare', type: 'weapon' },
    { min: 51, max: 52, item: 'Wand of polymorph', rarity: 'veryRare', type: 'wand' },
    { min: 53, max: 54, item: 'Wand of the war mage, +3', rarity: 'veryRare', type: 'wand' },
    { min: 55, max: 55, item: 'Adamantine armor (half plate)', rarity: 'uncommon', type: 'armor' },
    { min: 56, max: 56, item: 'Adamantine armor (plate)', rarity: 'uncommon', type: 'armor' },
    { min: 57, max: 57, item: 'Animated shield', rarity: 'veryRare', type: 'armor' },
    { min: 58, max: 58, item: 'Belt of fire giant strength', rarity: 'veryRare', type: 'wondrous' },
    { min: 59, max: 59, item: 'Belt of frost (or stone) giant strength', rarity: 'veryRare', type: 'wondrous' },
    { min: 60, max: 60, item: 'Armor, +1 breastplate', rarity: 'rare', type: 'armor' },
    { min: 61, max: 61, item: 'Armor of resistance (breastplate)', rarity: 'rare', type: 'armor' },
    { min: 62, max: 62, item: 'Candle of invocation', rarity: 'veryRare', type: 'wondrous' },
    { min: 63, max: 63, item: 'Armor, +2 chain mail', rarity: 'rare', type: 'armor' },
    { min: 64, max: 64, item: 'Armor, +2 chain shirt', rarity: 'rare', type: 'armor' },
    { min: 65, max: 65, item: 'Cloak of arachnida', rarity: 'veryRare', type: 'wondrous' },
    { min: 66, max: 66, item: 'Dancing sword', rarity: 'veryRare', type: 'weapon' },
    { min: 67, max: 67, item: 'Demon armor', rarity: 'veryRare', type: 'armor' },
    { min: 68, max: 68, item: 'Dragon scale mail', rarity: 'veryRare', type: 'armor' },
    { min: 69, max: 69, item: 'Dwarven plate', rarity: 'veryRare', type: 'armor' },
    { min: 70, max: 70, item: 'Dwarven thrower', rarity: 'veryRare', type: 'weapon' },
    { min: 71, max: 71, item: 'Efreeti bottle', rarity: 'veryRare', type: 'wondrous' },
    { min: 72, max: 72, item: 'Figurine of wondrous power (obsidian steed)', rarity: 'veryRare', type: 'wondrous' },
    { min: 73, max: 73, item: 'Frost brand', rarity: 'veryRare', type: 'weapon' },
    { min: 74, max: 74, item: 'Helm of brilliance', rarity: 'veryRare', type: 'wondrous' },
    { min: 75, max: 75, item: 'Horn of Valhalla (bronze)', rarity: 'veryRare', type: 'wondrous' },
    { min: 76, max: 76, item: 'Instrument of the bards (Anstruth harp)', rarity: 'veryRare', type: 'wondrous' },
    { min: 77, max: 77, item: 'Ioun stone (absorption)', rarity: 'veryRare', type: 'wondrous' },
    { min: 78, max: 78, item: 'Ioun stone (agility)', rarity: 'veryRare', type: 'wondrous' },
    { min: 79, max: 79, item: 'Ioun stone (fortitude)', rarity: 'veryRare', type: 'wondrous' },
    { min: 80, max: 80, item: 'Ioun stone (insight)', rarity: 'veryRare', type: 'wondrous' },
    { min: 81, max: 81, item: 'Ioun stone (intellect)', rarity: 'veryRare', type: 'wondrous' },
    { min: 82, max: 82, item: 'Ioun stone (leadership)', rarity: 'veryRare', type: 'wondrous' },
    { min: 83, max: 83, item: 'Ioun stone (strength)', rarity: 'veryRare', type: 'wondrous' },
    { min: 84, max: 84, item: 'Armor, +2 leather', rarity: 'rare', type: 'armor' },
    { min: 85, max: 85, item: 'Manual of bodily health', rarity: 'veryRare', type: 'wondrous' },
    { min: 86, max: 86, item: 'Manual of gainful exercise', rarity: 'veryRare', type: 'wondrous' },
    { min: 87, max: 87, item: 'Manual of golems', rarity: 'veryRare', type: 'wondrous' },
    { min: 88, max: 88, item: 'Manual of quickness of action', rarity: 'veryRare', type: 'wondrous' },
    { min: 89, max: 89, item: 'Mirror of life trapping', rarity: 'veryRare', type: 'wondrous' },
    { min: 90, max: 90, item: 'Nine lives stealer', rarity: 'veryRare', type: 'weapon' },
    { min: 91, max: 91, item: 'Oathbow', rarity: 'veryRare', type: 'weapon' },
    { min: 92, max: 92, item: 'Armor, +2 scale mail', rarity: 'rare', type: 'armor' },
    { min: 93, max: 93, item: 'Spellguard shield', rarity: 'veryRare', type: 'armor' },
    { min: 94, max: 94, item: 'Armor, +1 splint', rarity: 'rare', type: 'armor' },
    { min: 95, max: 95, item: 'Armor of resistance (splint)', rarity: 'rare', type: 'armor' },
    { min: 96, max: 96, item: 'Armor, +1 studded leather', rarity: 'rare', type: 'armor' },
    { min: 97, max: 97, item: 'Armor of resistance (studded leather)', rarity: 'rare', type: 'armor' },
    { min: 98, max: 98, item: 'Tome of clear thought', rarity: 'veryRare', type: 'wondrous' },
    { min: 99, max: 99, item: 'Tome of leadership and influence', rarity: 'veryRare', type: 'wondrous' },
    { min: 100, max: 100, item: 'Tome of understanding', rarity: 'veryRare', type: 'wondrous' }
];

// ============================================
// MAGIC ITEM TABLE I (DMG p.149)
// Legendary permanent items
// ============================================

export const MAGIC_ITEM_TABLE_I = [
    { min: 1, max: 5, item: 'Defender', rarity: 'legendary', type: 'weapon' },
    { min: 6, max: 10, item: 'Hammer of thunderbolts', rarity: 'legendary', type: 'weapon' },
    { min: 11, max: 15, item: 'Luck blade', rarity: 'legendary', type: 'weapon' },
    { min: 16, max: 20, item: 'Sword of answering', rarity: 'legendary', type: 'weapon' },
    { min: 21, max: 23, item: 'Holy avenger', rarity: 'legendary', type: 'weapon' },
    { min: 24, max: 26, item: 'Ring of djinni summoning', rarity: 'legendary', type: 'ring' },
    { min: 27, max: 29, item: 'Ring of invisibility', rarity: 'legendary', type: 'ring' },
    { min: 30, max: 32, item: 'Ring of spell turning', rarity: 'legendary', type: 'ring' },
    { min: 33, max: 35, item: 'Rod of lordly might', rarity: 'legendary', type: 'rod' },
    { min: 36, max: 38, item: 'Staff of the magi', rarity: 'legendary', type: 'staff' },
    { min: 39, max: 41, item: 'Vorpal sword', rarity: 'legendary', type: 'weapon' },
    { min: 42, max: 43, item: 'Belt of cloud giant strength', rarity: 'legendary', type: 'wondrous' },
    { min: 44, max: 45, item: 'Armor, +2 breastplate', rarity: 'rare', type: 'armor' },
    { min: 46, max: 47, item: 'Armor, +3 chain mail', rarity: 'legendary', type: 'armor' },
    { min: 48, max: 49, item: 'Armor, +3 chain shirt', rarity: 'legendary', type: 'armor' },
    { min: 50, max: 51, item: 'Cloak of invisibility', rarity: 'legendary', type: 'wondrous' },
    { min: 52, max: 53, item: 'Crystal ball (legendary)', rarity: 'legendary', type: 'wondrous' },
    { min: 54, max: 55, item: 'Armor, +1 half plate', rarity: 'rare', type: 'armor' },
    { min: 56, max: 57, item: 'Iron flask', rarity: 'legendary', type: 'wondrous' },
    { min: 58, max: 59, item: 'Armor, +3 leather', rarity: 'legendary', type: 'armor' },
    { min: 60, max: 61, item: 'Armor, +1 plate', rarity: 'rare', type: 'armor' },
    { min: 62, max: 63, item: 'Robe of the archmagi', rarity: 'legendary', type: 'wondrous' },
    { min: 64, max: 65, item: 'Rod of resurrection', rarity: 'legendary', type: 'rod' },
    { min: 66, max: 67, item: 'Armor, +1 scale mail', rarity: 'rare', type: 'armor' },
    { min: 68, max: 69, item: 'Scarab of protection', rarity: 'legendary', type: 'wondrous' },
    { min: 70, max: 71, item: 'Armor, +2 splint', rarity: 'rare', type: 'armor' },
    { min: 72, max: 73, item: 'Armor, +2 studded leather', rarity: 'rare', type: 'armor' },
    { min: 74, max: 75, item: 'Well of many worlds', rarity: 'legendary', type: 'wondrous' },
    { min: 76, max: 76, item: 'Magic armor (roll d12)', rarity: 'varies', type: 'armor' },
    { min: 77, max: 77, item: 'Apparatus of Kwalish', rarity: 'legendary', type: 'wondrous' },
    { min: 78, max: 78, item: 'Armor of invulnerability', rarity: 'legendary', type: 'armor' },
    { min: 79, max: 79, item: 'Belt of storm giant strength', rarity: 'legendary', type: 'wondrous' },
    { min: 80, max: 80, item: 'Cubic gate', rarity: 'legendary', type: 'wondrous' },
    { min: 81, max: 81, item: 'Deck of many things', rarity: 'legendary', type: 'wondrous' },
    { min: 82, max: 82, item: 'Efreeti chain', rarity: 'legendary', type: 'armor' },
    { min: 83, max: 83, item: 'Armor of resistance (half plate)', rarity: 'rare', type: 'armor' },
    { min: 84, max: 84, item: 'Horn of Valhalla (iron)', rarity: 'legendary', type: 'wondrous' },
    { min: 85, max: 85, item: 'Instrument of the bards (Ollamh harp)', rarity: 'legendary', type: 'wondrous' },
    { min: 86, max: 86, item: 'Ioun stone (greater absorption)', rarity: 'legendary', type: 'wondrous' },
    { min: 87, max: 87, item: 'Ioun stone (mastery)', rarity: 'legendary', type: 'wondrous' },
    { min: 88, max: 88, item: 'Ioun stone (regeneration)', rarity: 'legendary', type: 'wondrous' },
    { min: 89, max: 89, item: 'Plate armor of etherealness', rarity: 'legendary', type: 'armor' },
    { min: 90, max: 90, item: 'Armor of resistance (plate)', rarity: 'rare', type: 'armor' },
    { min: 91, max: 91, item: 'Ring of air elemental command', rarity: 'legendary', type: 'ring' },
    { min: 92, max: 92, item: 'Ring of earth elemental command', rarity: 'legendary', type: 'ring' },
    { min: 93, max: 93, item: 'Ring of fire elemental command', rarity: 'legendary', type: 'ring' },
    { min: 94, max: 94, item: 'Ring of three wishes', rarity: 'legendary', type: 'ring' },
    { min: 95, max: 95, item: 'Ring of water elemental command', rarity: 'legendary', type: 'ring' },
    { min: 96, max: 96, item: 'Sphere of annihilation', rarity: 'legendary', type: 'wondrous' },
    { min: 97, max: 97, item: 'Talisman of pure good', rarity: 'legendary', type: 'wondrous' },
    { min: 98, max: 98, item: 'Talisman of the sphere', rarity: 'legendary', type: 'wondrous' },
    { min: 99, max: 99, item: 'Talisman of ultimate evil', rarity: 'legendary', type: 'wondrous' },
    { min: 100, max: 100, item: 'Tome of the stilled tongue', rarity: 'legendary', type: 'wondrous' }
];

// ============================================
// EXPORT ALL TABLES
// ============================================

export const MAGIC_ITEM_TABLES = {
    A: MAGIC_ITEM_TABLE_A,
    B: MAGIC_ITEM_TABLE_B,
    C: MAGIC_ITEM_TABLE_C,
    D: MAGIC_ITEM_TABLE_D,
    E: MAGIC_ITEM_TABLE_E,
    F: MAGIC_ITEM_TABLE_F,
    G: MAGIC_ITEM_TABLE_G,
    H: MAGIC_ITEM_TABLE_H,
    I: MAGIC_ITEM_TABLE_I
};

// Helper to roll on a magic item table
export function rollOnMagicItemTable(tableName: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'): {
    name: string;
    rarity: string;
    type: string;
} {
    const table = MAGIC_ITEM_TABLES[tableName];
    const roll = Math.floor(Math.random() * 100) + 1;

    for (const entry of table) {
        if (roll >= entry.min && roll <= entry.max) {
            return {
                name: entry.item,
                rarity: entry.rarity,
                type: entry.type
            };
        }
    }

    // Fallback (shouldn't happen)
    return { name: table[0].item, rarity: table[0].rarity, type: table[0].type };
}
