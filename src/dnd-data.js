window.CHARACTER_OPTIONS = {
    genders: [
        { value: 'male', label: 'זכר' },
        { value: 'female', label: 'נקבה' },
        { value: 'non-binary', label: 'א-בינארי' }
    ],
    races: [
        { value: 'human', label: 'בן אנוש' },
        { value: 'elf', label: 'אלף' },
        { value: 'dwarf', label: 'גמד' },
        { value: 'halfling', label: 'זוטון' },
        { value: 'tiefling', label: 'טיפלינג' },
        { value: 'gnome', label: 'ננס' },
        { value: 'dragonborn', label: 'דם דרקון' },
        { value: 'orc', label: 'אורק' }
    ],
    classes: [
        { value: 'fighter', label: 'לוחם' },
        { value: 'wizard', label: 'קוסם' },
        { value: 'rogue', label: 'נוכל' },
        { value: 'cleric', label: 'כוהן' },
        { value: 'paladin', label: 'פלאדין' },
        { value: 'ranger', label: 'סייר' },
        { value: 'barbarian', label: 'ברברי' },
        { value: 'bard', label: 'פייטן' },
        { value: 'druid', label: 'דרואיד' },
        { value: 'monk', label: 'נזיר' },
        { value: 'sorcerer', label: 'מכשף' },
        { value: 'warlock', label: 'אמגוש' }
    ],
    styles: [
        { value: 'portrait', label: 'פורטרט פנים' },
        { value: 'full_body', label: 'גוף מלא' }
    ],
    backgrounds: [
        { value: 'dungeon', label: 'מבוך אפל' },
        { value: 'forest', label: 'יער עבות' },
        { value: 'tavern', label: 'פונדק' },
        { value: 'city_street', label: 'רחוב עיר' },
        { value: 'library', label: 'ספרייה עתיקה' },
        { value: 'mountain', label: 'פסגת הר' },
        { value: 'desert', label: 'מדבר' },
        { value: 'none', label: 'רקע חלק/סטודיו' }
    ],
    artStyles: [
        { value: 'realistic', label: 'ריאליסטי (Realistic)' },
        { value: 'watercolor_lineart', label: 'צבעי מים וקו (Watercolor & Line Art)' },
        { value: 'oil_painting', label: 'ציור שמן (Oil Painting)' },
        { value: 'pencil_sketch', label: 'רישום עיפרון (Pencil Sketch)' },
        { value: 'dark_fantasy', label: 'פנטזיה אפלה (Dark Fantasy)' },
        { value: 'anime', label: 'אנימה (Anime)' },
        { value: 'woodcut', label: 'תחריט עץ (Woodcut)' },
        { value: 'pixel_art', label: 'פיקסל ארט (Pixel Art)' },
        { value: 'comic_book', label: 'קומיקס / נובלה גרפית (Comic Book)' },
        { value: 'simple_icon', label: 'אייקון פשוט (Simple Icon)' }
    ],
    poses: [
        { value: 'standing', label: 'עמידה רגילה' },
        { value: 'combat', label: 'תנוחת קרב' },
        { value: 'casting', label: 'הטלת לחש' },
        { value: 'stealth', label: 'התגנבות' },
        { value: 'sitting', label: 'ישיבה' }
    ]
};

window.OFFICIAL_ITEMS = {
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

window.ITEM_STATS = {
    // Simple Melee
    "Club (אלה)": { damage: "1d4", damageType: "bludgeoning" },
    "Dagger (פגיון)": { damage: "1d4", damageType: "piercing", light: true },
    "Greatclub (אלה גדולה)": { damage: "1d8", damageType: "bludgeoning", twoHanded: true },
    "Handaxe (גרזן יד)": { damage: "1d6", damageType: "slashing", light: true },
    "Javelin (כידון)": { damage: "1d6", damageType: "piercing", thrown: true },
    "Light Hammer (פטיש קל)": { damage: "1d4", damageType: "bludgeoning", light: true },
    "Mace (אלת קרב)": { damage: "1d6", damageType: "bludgeoning" },
    "Quarterstaff (מטה)": { damage: "1d6", damageType: "bludgeoning", versatile: "1d8" },
    "Sickle (מגל)": { damage: "1d4", damageType: "slashing", light: true },
    "Spear (חנית)": { damage: "1d6", damageType: "piercing", versatile: "1d8", thrown: true },

    // Simple Ranged
    "Light Crossbow (רובה קשת קל)": { damage: "1d8", damageType: "piercing", twoHanded: true, ranged: true },
    "Dart (חץ הטלה)": { damage: "1d4", damageType: "piercing", thrown: true, ranged: true },
    "Shortbow (קשת קצרה)": { damage: "1d6", damageType: "piercing", twoHanded: true, ranged: true },
    "Sling (קלע)": { damage: "1d4", damageType: "bludgeoning", ranged: true },

    // Martial Melee
    "Battleaxe (גרזן קרב)": { damage: "1d8", damageType: "slashing", versatile: "1d10" },
    "Flail (מורג)": { damage: "1d8", damageType: "bludgeoning" },
    "Glaive (גלייב)": { damage: "1d10", damageType: "slashing", twoHanded: true, reach: true },
    "Greataxe (גרזן דו-ידני)": { damage: "1d12", damageType: "slashing", twoHanded: true },
    "Greatsword (חרב דו-ידנית)": { damage: "2d6", damageType: "slashing", twoHanded: true },
    "Halberd (הלבארד)": { damage: "1d10", damageType: "slashing", twoHanded: true, reach: true },
    "Lance (רומח)": { damage: "1d12", damageType: "piercing", reach: true },
    "Longsword (חרב ארוכה)": { damage: "1d8", damageType: "slashing", versatile: "1d10" },
    "Maul (פטיש קרב)": { damage: "2d6", damageType: "bludgeoning", twoHanded: true },
    "Morningstar (כוכב שחר)": { damage: "1d8", damageType: "piercing" },
    "Pike (רומח רגלים)": { damage: "1d10", damageType: "piercing", twoHanded: true, reach: true },
    "Rapier (סיף)": { damage: "1d8", damageType: "piercing", finesse: true },
    "Scimitar (חרב מעוקלת)": { damage: "1d6", damageType: "slashing", light: true, finesse: true },
    "Shortsword (חרב קצרה)": { damage: "1d6", damageType: "piercing", light: true, finesse: true },
    "Trident (קלשון)": { damage: "1d6", damageType: "piercing", versatile: "1d8", thrown: true },
    "War Pick (מכוש מלחמה)": { damage: "1d8", damageType: "piercing" },
    "Warhammer (קורנס)": { damage: "1d8", damageType: "bludgeoning", versatile: "1d10" },

    // Martial Ranged
    "Blowgun (רובה נשיפה)": { damage: "1", damageType: "piercing", ranged: true },
    "Hand Crossbow (רובה קשת יד)": { damage: "1d6", damageType: "piercing", light: true, ranged: true },
    "Heavy Crossbow (רובה קשת כבד)": { damage: "1d10", damageType: "piercing", twoHanded: true, ranged: true },
    "Longbow (קשת ארוכה)": { damage: "1d8", damageType: "piercing", twoHanded: true, ranged: true },
    "Net (רשת)": { damage: "-", damageType: "-", thrown: true, ranged: true },

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
