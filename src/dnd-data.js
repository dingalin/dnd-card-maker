export const OFFICIAL_ITEMS = {
    weapon: {
        "Simple Melee": [
            "Club (אלה)",
            "Dagger (פגיון)",
            "Greatclub (אלה גדולה)",
            "Handaxe (גרזן יד)",
            "Javelin (כידון)",
            "Light Hammer (פטיש קל)",
            "Mace (אלת קרב)",
            "Quarterstaff (מטה)",
            "Sickle (מגל)",
            "Spear (חנית)"
        ],
        "Simple Ranged": [
            "Light Crossbow (רובה קשת קל)",
            "Dart (חץ הטלה)",
            "Shortbow (קשת קצרה)",
            "Sling (קלע)"
        ],
        "Martial Melee": [
            "Battleaxe (גרזן קרב)",
            "Flail (מורג)",
            "Glaive (גלייב)",
            "Greataxe (גרזן דו-ידני)",
            "Greatsword (חרב דו-ידנית)",
            "Halberd (הלבארד)",
            "Lance (רומח)",
            "Longsword (חרב ארוכה)",
            "Maul (פטיש קרב)",
            "Morningstar (כוכב שחר)",
            "Pike (רומח רגלים)",
            "Rapier (סיף)",
            "Scimitar (חרב מעוקלת)",
            "Shortsword (חרב קצרה)",
            "Trident (קלשון)",
            "War Pick (מכוש מלחמה)",
            "Warhammer (קורנס)"
        ],
        "Martial Ranged": [
            "Blowgun (רובה נשיפה)",
            "Hand Crossbow (רובה קשת יד)",
            "Heavy Crossbow (רובה קשת כבד)",
            "Longbow (קשת ארוכה)",
            "Net (רשת)"
        ]
    },
    armor: {
        "Light Armor": [
            "Padded (מרופד)",
            "Leather (עור)",
            "Studded Leather (עור מחוזק)"
        ],
        "Medium Armor": [
            "Hide (פרווה)",
            "Chain Shirt (חולצת שרשראות)",
            "Scale Mail (שריון קשקשים)",
            "Breastplate (שריון חזה)",
            "Half Plate (חצי לוחות)"
        ],
        "Heavy Armor": [
            "Ring Mail (שריון טבעות)",
            "Chain Mail (שריון שרשראות)",
            "Splint (שריון רצועות)",
            "Plate (שריון לוחות)"
        ],
        "Shield": [
            "Shield (מגן)"
        ]
    },
    potion: {
        "Potions": [
            "Healing (ריפוי)",
            "Climbing (טיפוס)",
            "Invisibility (היעלמות)",
            "Speed (מהירות)",
            "Water Breathing (נשימה במים)",
            "Giant Strength (כוח ענקים)"
        ]
    },
    ring: {
        "Rings": [
            "Protection (הגנה)",
            "Invisibility (היעלמות)",
            "Feather Falling (נפילת נוצה)",
            "Regeneration (התחדשות)"
        ]
    },
    wondrous: {
        "Worn": [
            "Amulet (קמע)",
            "Belt (חגורה)",
            "Boots (מגפיים)",
            "Cloak (גלימה)",
            "Gloves (כפפות)",
            "Helmet (קסדה)"
        ],
        "Held": [
            "Bag (תיק)",
            "Gem (אבן חן)",
            "Wand (שרביט)",
            "Rod (מוט)",
            "Staff (מטה קסם)"
        ]
    }
};

export const ITEM_STATS = {
    // Simple Melee
    "Club (אלה)": { damage: "1d4", damageType: "bludgeoning" },
    "Dagger (פגיון)": { damage: "1d4", damageType: "piercing" },
    "Greatclub (אלה גדולה)": { damage: "1d8", damageType: "bludgeoning" },
    "Handaxe (גרזן יד)": { damage: "1d6", damageType: "slashing" },
    "Javelin (כידון)": { damage: "1d6", damageType: "piercing" },
    "Light Hammer (פטיש קל)": { damage: "1d4", damageType: "bludgeoning" },
    "Mace (אלת קרב)": { damage: "1d6", damageType: "bludgeoning" },
    "Quarterstaff (מטה)": { damage: "1d6", damageType: "bludgeoning" },
    "Sickle (מגל)": { damage: "1d4", damageType: "slashing" },
    "Spear (חנית)": { damage: "1d6", damageType: "piercing" },

    // Simple Ranged
    "Light Crossbow (רובה קשת קל)": { damage: "1d8", damageType: "piercing" },
    "Dart (חץ הטלה)": { damage: "1d4", damageType: "piercing" },
    "Shortbow (קשת קצרה)": { damage: "1d6", damageType: "piercing" },
    "Sling (קלע)": { damage: "1d4", damageType: "bludgeoning" },

    // Martial Melee
    "Battleaxe (גרזן קרב)": { damage: "1d8", damageType: "slashing" },
    "Flail (מורג)": { damage: "1d8", damageType: "bludgeoning" },
    "Glaive (גלייב)": { damage: "1d10", damageType: "slashing" },
    "Greataxe (גרזן דו-ידני)": { damage: "1d12", damageType: "slashing" },
    "Greatsword (חרב דו-ידנית)": { damage: "2d6", damageType: "slashing" },
    "Halberd (הלבארד)": { damage: "1d10", damageType: "slashing" },
    "Lance (רומח)": { damage: "1d12", damageType: "piercing" },
    "Longsword (חרב ארוכה)": { damage: "1d8", damageType: "slashing" },
    "Maul (פטיש קרב)": { damage: "2d6", damageType: "bludgeoning" },
    "Morningstar (כוכב שחר)": { damage: "1d8", damageType: "piercing" },
    "Pike (רומח רגלים)": { damage: "1d10", damageType: "piercing" },
    "Rapier (סיף)": { damage: "1d8", damageType: "piercing" },
    "Scimitar (חרב מעוקלת)": { damage: "1d6", damageType: "slashing" },
    "Shortsword (חרב קצרה)": { damage: "1d6", damageType: "piercing" },
    "Trident (קלשון)": { damage: "1d6", damageType: "piercing" },
    "War Pick (מכוש מלחמה)": { damage: "1d8", damageType: "piercing" },
    "Warhammer (קורנס)": { damage: "1d8", damageType: "bludgeoning" },

    // Martial Ranged
    "Blowgun (רובה נשיפה)": { damage: "1", damageType: "piercing" },
    "Hand Crossbow (רובה קשת יד)": { damage: "1d6", damageType: "piercing" },
    "Heavy Crossbow (רובה קשת כבד)": { damage: "1d10", damageType: "piercing" },
    "Longbow (קשת ארוכה)": { damage: "1d8", damageType: "piercing" },
    "Net (רשת)": { damage: "-", damageType: "-" },

    // Armor
    "Padded (מרופד)": { ac: "11" },
    "Leather (עור)": { ac: "11" },
    "Studded Leather (עור מחוזק)": { ac: "12" },
    "Hide (פרווה)": { ac: "12" },
    "Chain Shirt (חולצת שרשראות)": { ac: "13" },
    "Scale Mail (שריון קשקשים)": { ac: "14" },
    "Breastplate (שריון חזה)": { ac: "14" },
    "Half Plate (חצי לוחות)": { ac: "15" },
    "Ring Mail (שריון טבעות)": { ac: "14" },
    "Chain Mail (שריון שרשראות)": { ac: "16" },
    "Splint (שריון רצועות)": { ac: "17" },
    "Plate (שריון לוחות)": { ac: "18" },
    "Shield (מגן)": { ac: "+2" }
};
