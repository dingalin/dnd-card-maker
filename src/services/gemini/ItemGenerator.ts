/**
 * ItemGenerator - Handles AI-powered item generation for D&D cards
 * Extracted from GeminiService for better code organization
 */

import { API } from '../../config/index';
import { GeminiConfig } from '../../types/api';
import { balanceGuide } from '../../config/balance-guide';
import { calculatePriceFromDescription } from '../PricingService';


// Cloudflare Worker URL for secure API access
const WORKER_URL = API.WORKER_URL;

interface RarityBoundaries {
    maxBonus?: number;
    minBonus?: number;
    allowedDamageTypes: string[];
    priceRange: string;
    spellLevelMax?: number;
    spellLevelMin?: number;
    allowedAbilities: string[];
    abilitiesHe: string[];
}

interface ItemGenerationResult {
    name: string;
    typeHe: string;
    rarityHe: string;
    abilityName: string;
    abilityDesc: string;
    description: string;
    gold: string;
    weaponDamage: string;
    damageType: null;
    armorClass: number | null;
    quickStats: string;
    specialDamage?: string;  // Extra elemental damage for front card
    spellAbility?: string;   // Spell summary for front card
    visualPrompt: string;
    [key: string]: any;
}

/**
 * Generate item details using Gemini AI
 * Uses BOUNDARIES approach - AI has creative freedom within defined limits
 */
export async function generateItemDetails(
    geminiConfig: GeminiConfig,
    level: string | number,
    type: string,
    subtype: string,
    rarity: string,
    ability: string,
    contextImage: string | null = null,
    complexityMode: string = 'creative',
    locale: string = 'he'
): Promise<ItemGenerationResult> {
    const { apiKey, password, useWorker, baseUrl } = geminiConfig;
    const isHebrew = locale === 'he';
    const outputLanguage = isHebrew ? 'Hebrew' : 'English';

    let modeInstruction = "";

    // Mundane mode - non-magical basic items
    if (complexityMode === 'mundane') {
        modeInstruction = isHebrew ? `
        MODE: MUNDANE (Non-Magical)
        - CRITICAL: This item is NOT magical. It is a standard, non-magical piece of equipment.
        - NO magical abilities, NO special powers, NO enchantments.
        - The item is made of normal materials (steel, leather, wood, etc.)
        - For weapons: Use standard damage dice with NO bonuses.
        - For armor: Use standard AC values with NO bonuses.
        - Rarity MUST be: נפוץ (Common)
        - abilityName and abilityDesc should describe the CRAFTSMANSHIP, not magic.
        - Example abilityName: "עבודת יד מקצועית", "ייצור איכותי", "עיצוב קלאסי"
        - Example abilityDesc: "חרב זו עשויה מפלדה מחושלת היטב עם ידית עור נוחה. מתוחזקת היטב ומאוזנת."
        - quickStats should be ONLY the damage dice or AC value.
        ` : `
        MODE: MUNDANE (Non-Magical)
        - CRITICAL: This item is NOT magical. It is a standard, non-magical piece of equipment.
        - NO magical abilities, NO special powers, NO enchantments.
        - The item is made of normal materials (steel, leather, wood, etc.)
        - For weapons: Use standard damage dice with NO bonuses.
        - For armor: Use standard AC values with NO bonuses.
        - Rarity MUST be: Common
        - abilityName and abilityDesc should describe the CRAFTSMANSHIP, not magic.
        - Example abilityName: "Professional Craftsmanship", "Quality Make", "Classic Design"
        - Example abilityDesc: "This sword is made of well-tempered steel with a comfortable leather grip. Well-maintained and balanced."
        - quickStats should be ONLY the damage dice or AC value.
        `;
    } else if (complexityMode === 'simple') {
        modeInstruction = isHebrew ? `
        MODE: EXTREMELY SIMPLE (Stats Only)
        
        === DISTRIBUTION (IMPORTANT!) ===
        When generating weapons/armor in Simple Mode, follow this distribution:
        - 50% chance: PURE +X ITEM (JUST the bonus, NO other effects at all!)
        - 25% chance: +X with extra elemental damage (e.g., +1d6 fire)
        - 15% chance: +X with passive resistance
        - 10% chance: +X with simple active ability (1/day)
        
        === PURE +X ITEMS (PRIORITY!) ===
        A "Pure +X" weapon is a masterwork item with ONLY a numerical bonus:
        - abilityName: "אומנות מופת" / "חידוד קסום" / "איזון מושלם"
        - abilityDesc: "נשק זה מעניק +X להתקפה ולנזק." (THAT'S IT! Nothing else!)
        - quickStats: LEAVE EMPTY ("") for pure +X items! The bonus is already shown in damage.
        - weaponDamage: MUST include the bonus! e.g., "1d8+2 חותך" (NOT "1d8 חותך")
        - NO extra damage, NO resistances, NO spells, NO charges.
        
        Example Pure +2 Longsword:
        - name: "להב הדיוק"
        - abilityName: "חידוד קסום"
        - abilityDesc: "חרב זו מעניקה +2 להתקפות ולנזק."
        - weaponDamage: "1d8+2 חותך"
        - quickStats: "" (empty! bonus is already in damage line)
        
        === OTHER SIMPLE OPTIONS (Less Common) ===
        - Extra damage dice (e.g. +1d6 Fire)
        - Advantage on specific checks
        - Resistance to one damage type
        
        KEEP IT SHORT. PURE +X IS THE DEFAULT.
        ` : `
        MODE: EXTREMELY SIMPLE (Stats Only)
        
        === DISTRIBUTION (IMPORTANT!) ===
        When generating weapons/armor in Simple Mode, follow this distribution:
        - 50% chance: PURE +X ITEM (JUST the bonus, NO other effects at all!)
        - 25% chance: +X with extra elemental damage (e.g., +1d6 fire)
        - 15% chance: +X with passive resistance
        - 10% chance: +X with simple active ability (1/day)
        
        === PURE +X ITEMS (PRIORITY!) ===
        A "Pure +X" weapon is a masterwork item with ONLY a numerical bonus:
        - abilityName: "Masterwork Crafting" / "Magical Edge" / "Perfect Balance"
        - abilityDesc: "This weapon grants +X to attack and damage rolls." (THAT'S IT!)
        - quickStats: LEAVE EMPTY ("") for pure +X items! The bonus is already shown in damage.
        - weaponDamage: MUST include the bonus! e.g., "1d8+2 slashing" (NOT "1d8 slashing")
        - NO extra damage, NO resistances, NO spells, NO charges.
        
        Example Pure +2 Longsword:
        - name: "Precision Blade"
        - abilityName: "Magical Edge"
        - abilityDesc: "This sword grants +2 to attack and damage rolls."
        - weaponDamage: "1d8+2 slashing"
        - quickStats: "" (empty! bonus is already in damage line)
        
        === OTHER SIMPLE OPTIONS (Less Common) ===
        - Extra damage dice (e.g. +1d6 Fire)
        - Advantage on specific checks
        - Resistance to one damage type
        
        KEEP IT SHORT. PURE +X IS THE DEFAULT.
        `;
    } else {
        modeInstruction = `
        MODE: CREATIVE & UNIQUE
            - Focus on UNIQUE, interesting mechanics that tell a story.
        - Create custom active abilities with charges or cooldowns(e.g., "Once per day...").
        - Avoid boring flat + 1 bonuses unless necessary.
        - Make the item feel special and distinct.
        `;
    }

    // ============================================
    // BOUNDARIES APPROACH (Not Pre-Roll!)
    // AI gets creative freedom within defined limits
    // ============================================
    const boundariesInstruction = buildBoundariesInstruction(rarity, isHebrew);

    // Conditional prompt based on whether item is mundane or magical
    const itemDescription = complexityMode === 'mundane'
        ? `a standard, non - magical ${type} `
        : `a unique magic item`;

    let prompt = buildMainPrompt(
        itemDescription,
        outputLanguage,
        level,
        type,
        subtype,
        rarity,
        ability,
        complexityMode,
        modeInstruction,
        boundariesInstruction,
        isHebrew
    );

    if (contextImage) {
        prompt += `
      VISUAL CONTEXT PROVIDED:
      An image is attached. Use it as INSPIRATION for the item's appearance and theme.
      - The image suggests a visual style - use it for the item's description and visual prompt.
      - If the image implies a specific element (e.g., fire, ice, necrotic), USE that element for damage.
      - IMPORTANT: The visual context should NOT limit other abilities!
        You can STILL add on-hit effects (prone, frighten, bleed), special features (keen, returning), advantages, etc.
        The element from the image is for DAMAGE TYPE only, not the entire ability set.
      - Example: An ice-themed image = cold damage, BUT you can still add "knock prone on hit" or "critical on 19-20"
      `;
    }


    prompt += buildOutputStructure(isHebrew);

    const parts: any[] = [{ text: prompt }];

    if (contextImage) {
        try {
            const imageData = await processContextImage(contextImage);
            parts.push({
                inline_data: {
                    mime_type: imageData.mimeType,
                    data: imageData.base64Data
                }
            });
            console.log("ItemGenerator: Added visual context to prompt");
        } catch (e) {
            console.error("Failed to process context image:", e);
        }
    }

    const payload = {
        contents: [{
            parts: parts
        }],
        generationConfig: undefined // Explicitly undefined to match JS behavior where it wasn't present
    };

    try {
        console.log("Sending Gemini Request. Payload size:", JSON.stringify(payload).length);

        let data;

        if (useWorker) {
            data = await callViaWorker(password!, 'gemini-generate', {
                model: 'gemini-2.5-flash-lite',
                contents: payload.contents,
                generationConfig: payload.generationConfig
            });
        } else {
            const response = await fetch(`${baseUrl}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || "Gemini API request failed");
                } else {
                    const errorText = await response.text();
                    throw new Error(`Gemini API Failed (${response.status}): ${errorText}`);
                }
            }

            data = await response.json();
        }

        if (data.error) {
            console.error("Gemini API Error (via Worker):", data.error);
            throw new Error(`Gemini Error: ${data.error.message || JSON.stringify(data.error)} `);
        }

        if (!data.candidates || !data.candidates[0]) {
            console.error("Gemini Unexpected Response:", data);
            if (data.promptFeedback) {
                throw new Error(`Blocked by Safety Filters: ${JSON.stringify(data.promptFeedback)} `);
            }
            throw new Error("No candidates returned from Gemini. See console for full response.");
        }

        const text = data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(jsonStr);

        // Fix RTL issues with dice notation in Hebrew text
        fixDiceNotationRTL(parsedResult);

        // Validate and adjust price
        validateAndAdjustPrice(parsedResult, rarity, subtype);

        // Update AC in quickStats if there's a bonus (e.g., Plate 18 -> 19 if +1)
        updateArmorClassWithBonus(parsedResult);

        // Clean quickStats if it contains garbage data (like duplicate dice notation)
        validateAndCleanQuickStats(parsedResult, complexityMode);

        // Extract quick-glance fields from abilityDesc if AI didn't populate them
        extractQuickGlanceFields(parsedResult);

        console.log('✨ AI generated item:', parsedResult.name, '| Price:', parsedResult.gold, 'GP');
        console.log('🎯 Quick-glance fields BEFORE return:', {
            specialDamage: parsedResult.specialDamage || '(empty)',
            spellAbility: parsedResult.spellAbility || '(empty)',
            abilityDesc: (parsedResult.abilityDesc || '').substring(0, 80)
        });

        return parsedResult;
    } catch (error: any) {
        if (contextImage) {
            console.warn("Gemini API request failed with context image. Retrying without image...", error);
            return generateItemDetails(geminiConfig, level, type, subtype, rarity, ability, null, complexityMode, locale);
        }

        console.error("Text Generation Error:", error);
        throw new Error(error.message || "Failed to generate item details");
    }
}

// Helper function to call through Worker
async function callViaWorker(password: string, action: string, data: any) {
    let response;
    try {
        response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: password,
                action: action,
                data: data
            })
        });
    } catch (networkError) {
        console.error("Worker Network Error:", networkError);
        throw new Error(`Connection Failed. Is the Worker URL correct? (${WORKER_URL})`);
    }

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Incorrect Password (401). Please check your key.");
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const error = await response.json();
            throw new Error(error.error || `Worker Error ${response.status}`);
        } else {
            const text = await response.text();
            if (text.includes('Access')) {
                throw new Error(`Cloudflare Access Blocked (Status ${response.status}). Check Settings.`);
            }
            throw new Error(`Worker Error ${response.status}: ${text.substring(0, 50)}...`);
        }
    }

    return response.json();
}

// Build boundaries instruction based on rarity
function buildBoundariesInstruction(rarity: string, isHebrew: boolean): string {
    const rarityBoundaries: { [key: string]: RarityBoundaries } = {
        'Common': {
            maxBonus: 0,
            allowedDamageTypes: [],
            priceRange: '50-100',
            spellLevelMax: 0,
            allowedAbilities: ['cosmetic', 'light'],
            abilitiesHe: ['קוסמטי (זוהר, שינוי צבע)', 'אור קל כנר']
        },
        'Uncommon': {
            maxBonus: 1,
            allowedDamageTypes: ['fire', 'cold', 'lightning', 'אש', 'קור', 'ברק'],
            priceRange: '250-450',
            spellLevelMax: 2,
            allowedAbilities: [
                'extra 1d4 elemental damage',
                'resistance to 1 damage type',
                'advantage on 1 type of check (initiative, perception, stealth)',
                '1/day spell (level 1-2)',
                'push 5ft/10ft on hit',
                'reduce target speed by 10 on hit',
                'weapon returns to hand when thrown',
                'sheds light 20/40 ft',
                'PURE +X (no ability at all)'
            ],
            abilitiesHe: [
                'נזק יסודי נוסף 1d4',
                'עמידות לסוג נזק אחד',
                'יתרון לבדיקה (יוזמה, תפיסה, התגנבות)',
                'כישוף 1/יום (רמה 1-2)',
                'דחיפה 5/10 רגל בפגיעה',
                'האטת מהירות -10 בפגיעה',
                'נשק חוזר ליד כשנזרק',
                'מאיר 20/40 רגל',
                'טהור +X (ללא יכולת)'
            ]
        },

        'Rare': {
            maxBonus: 2,
            allowedDamageTypes: ['fire', 'cold', 'lightning', 'radiant', 'necrotic', 'אש', 'קור', 'ברק', 'זוהר', 'נמק'],
            priceRange: '2000-4000',
            spellLevelMax: 4,
            allowedAbilities: [
                'extra 1d6 elemental damage',
                'resistance to 2 damage types',
                '1/day spell (level 3-4)',
                '1/day active ability (recharge at dawn)',
                'permanent passive (e.g., darkvision 60ft)',
                'knock prone on hit (STR DC 13 save)',
                'frighten target on hit (WIS DC 13 save)',
                'bleed damage (1d4/turn until healed)',
                'critical hit on 19-20',
                'PURE +X'
            ],
            abilitiesHe: [
                'נזק יסודי נוסף 1d6',
                'עמידות ל-2 סוגי נזק',
                'כישוף 1/יום (רמה 3-4)',
                'יכולת פעילה 1/יום (נטען בזריחה)',
                'פסיבי קבוע (כמו ראיית חושך 60 רגל)',
                'הפלה בפגיעה (הצלת כוח DC 13)',
                'הפחדה בפגיעה (הצלת חוכמה DC 13)',
                'דימום (1d4/סיבוב עד לריפוי)',
                'קריטי ב-19-20',
                'טהור +X'
            ]
        },

        'Very Rare': {
            maxBonus: 3,
            allowedDamageTypes: ['fire', 'cold', 'lightning', 'radiant', 'necrotic', 'force', 'psychic'],
            priceRange: '15000-30000',
            spellLevelMax: 6,
            allowedAbilities: [
                'extra 2d6 elemental damage',
                'immunity to 1 damage type',
                '3 charges/day spell (level 5-6)',
                'multiple passive effects',
                'powerful active ability',
                'PURE +X'
            ],
            abilitiesHe: [
                'נזק יסודי נוסף 2d6',
                'חסינות לסוג נזק אחד',
                '3 מטענים/יום כישוף (רמה 5-6)',
                'מספר אפקטים פסיביים',
                'יכולת פעילה חזקה',
                'טהור +X'
            ]
        },
        'Legendary': {
            minBonus: 4, // Note: Not used in template but present in object
            maxBonus: 5,
            allowedDamageTypes: ['any'],
            priceRange: '75000-150000',
            spellLevelMin: 6, // Note: Not used in template but present in object
            spellLevelMax: 9,
            allowedAbilities: [
                'MUST have +4 or +5 bonus - NO LESS!',
                'any powerful combinations',
                'sentient item (consciousness)',
                'multiple high-level spells (level 6-9 ONLY)',
                'unique game-changing ability',
                'legendary history/story',
                'immunity to 2+ damage types',
                'permanent flight or teleportation (30ft)',
                'auto-cast Shield/Absorb Elements when hit',
                'advantage on ALL saving throws',
                '+4 or +5 AC bonus PLUS additional magical properties'
            ],
            abilitiesHe: [
                'חובה +4 או +5 בונוס - לא פחות!',
                'שילובים חזקים כרצונך',
                'פריט בעל תודעה',
                'מספר כישופים ברמה גבוהה בלבד (דרגה 6-9)',
                'יכולת ייחודית משנת משחק',
                'היסטוריה אגדית',
                'חסינות ל-2+ סוגי נזק',
                'טיסה או טלפורטציה קבועה (30 רגל)',
                'כישוף מגן/ספיגת יסודות אוטומטי כשנפגע',
                'יתרון בכל גלגולי ההצלה',
                '+4 או +5 לדרג"ש בנוסף ליכולות קסומות נוספות'
            ]
        }
    };

    const bounds = rarityBoundaries[rarity] || rarityBoundaries['Uncommon'];

    // Get dynamic balance rules from balanceGuide service
    const balanceRules = balanceGuide.generatePromptRules();

    return isHebrew ? `
    === גבולות יצירה (חובה לעמוד בהם!) ===
    נדירות: ${rarity}
    - בונוס מקסימלי לנשק/שריון: +${bounds.maxBonus}
    - סוגי נזק יסודי מותרים: ${bounds.allowedDamageTypes.length > 0 ? bounds.allowedDamageTypes.join(', ') : 'אין (פריט Common)'}
    - רמת כישוף מקסימלית: ${bounds.spellLevelMax}
    
    === 🏋️ כללי שיקויי כוח ענקים (חובה!) ===
    אם אתה יוצר שיקוי שמעלה כוח, חייב לעקוב אחרי הטבלה הבאה:
    • כוח 21 (Hill Giant) = Uncommon = 200gp
    • כוח 23 (Stone/Frost Giant) = Rare = 800gp
    • כוח 25 (Fire Giant) = Rare = 1,500gp
    • כוח 27 (Cloud Giant) = Very Rare = 27,000gp ⚠️
    • כוח 29 (Storm Giant) = Legendary = 50,000gp
    
    ❌ אסור ליצור שיקוי עם כוח 27 אם הנדירות היא Uncommon!
    ❌ אם הנדירות היא Uncommon, כוח מקסימלי הוא 21.
    
    === תכונות/יכולות מותרות לנדירות הזו ===
    ${bounds.abilitiesHe.map(a => `• ${a}`).join('\n    ')}
    
    === חופש יצירתי ===
    בתוך הגבולות האלה, אתה חופשי ליצור!
    - תן שם יצירתי ומקורי
    - בחר נושא/תמה מעניינת
    - בחר יכולת אחת מהרשימה (או שילוב הגיוני)
    - או השאר "נשק טהור +X" בלי שום יכולת
    
    === תמחור (העריך בעצמך!) ===
    אחרי שיצרת את הפריט, העריך את שוויו:
    - טווח מחיר לנדירות הזו: ${bounds.priceRange} זהב
    - שקלל: חוזק היכולת, סוג הנזק (זוהר/כוח יקרים יותר), תדירות שימוש
    - נשק טהור +X בלי יכולת = יקר יותר בטווח
    - ⚠️ המחיר חייב להיות **עגול לעשרות** (למשל: 350, 2500)
    ` : `
    === CREATION BOUNDARIES (MUST follow!) ===
    Rarity: ${rarity}
    - Maximum weapon/armor bonus: +${bounds.maxBonus}
    - Allowed elemental damage types: ${bounds.allowedDamageTypes.length > 0 ? bounds.allowedDamageTypes.join(', ') : 'None (Common item)'}
    - Maximum spell level: ${bounds.spellLevelMax}
    
    === 🏋️ GIANT STRENGTH POTION RULES (MANDATORY!) ===
    If you create a potion that sets Strength score, you MUST follow this table:
    • Strength 21 (Hill Giant) = Uncommon = 200gp
    • Strength 23 (Stone/Frost Giant) = Rare = 800gp
    • Strength 25 (Fire Giant) = Rare = 1,500gp
    • Strength 27 (Cloud Giant) = Very Rare = 27,000gp ⚠️
    • Strength 29 (Storm Giant) = Legendary = 50,000gp
    
    ❌ DO NOT create a Strength 27 potion if rarity is Uncommon!
    ❌ For Uncommon rarity, maximum Strength is 21.
    
    === ALLOWED ABILITIES FOR THIS RARITY ===
    ${bounds.allowedAbilities.map(a => `• ${a}`).join('\n    ')}
    
    === CREATIVE FREEDOM ===
    Within these boundaries, you are FREE to create!
    - Give a creative, original name
    - Choose an interesting theme
    - Pick ONE ability from the list (or a logical combination)
    - Or keep it as a "PURE +X weapon" with no ability
    
    === PRICING (You decide!) ===
    After creating the item, evaluate its value:
    - Price range for this rarity: ${bounds.priceRange} GP
    - Consider: ability strength, damage type (radiant/force worth more), usage frequency
    - Pure +X with no ability = higher end of the range
    - ⚠️ Price MUST be **rounded to tens** (e.g., 350, 2500)
    `;
}

// Build main prompt
function buildMainPrompt(itemDescription: string, outputLanguage: string, level: string | number, type: string, subtype: string, rarity: string, ability: string, complexityMode: string, modeInstruction: string, boundariesInstruction: string, _isHebrew: boolean): string {
    return `
  You are a D & D 5e Dungeon Master.Create ${itemDescription} in ${outputLanguage}.

        Parameters:
        - Level / Power: ${level}
        - Main Type: ${subtype ? subtype : type} (Priority: ${subtype ? 'Strictly follow this subtype' : 'Follow Main Type'})
    - Category: ${type}
    - Rarity: ${rarity}
    - Special Theme / Ability: ${complexityMode === 'mundane' ? 'None - this is a plain, standard item' : (ability || 'Random cool theme')}
  
  ${modeInstruction}
  ${boundariesInstruction}
  
  CRITICAL INSTRUCTION:
    - You MUST strictly adhere to the provided 'Type' and 'Subtype'.
    
  RARITY & BALANCING STANDARDS (STRICTLY FOLLOW):
    === REALISTIC PRICE TIERS (D&D 5e Economy) ===
    | Rarity       | Gold Range    | Max Bonus | Notes |
    |--------------|---------------|-----------|-------|
    | Common       | 50-100        | +0        | Cosmetic/utility only |
    | Uncommon     | 101-500       | +1        | Pure +1 weapon: 350-500 GP |
    | Rare         | 501-5,000     | +2        | Pure +2 weapon: 2,000-4,000 GP |
    | Very Rare    | 5,001-50,000  | +3        | Pure +3 weapon: 15,000-30,000 GP |
    | Legendary    | 50,001+       | +4 or +5  | MUST have +4/+5! Unique artifacts |
    
    === ENFORCEMENT ===
    - Pure +1 weapon MUST cost 350-500 GP (not 100-200!)
    - NEVER give a +2 weapon if rarity is Uncommon.
    - Weapon categories (Simple/Martial) must match official PHB classification.
    - If in doubt, price HIGHER rather than lower.
    - Ensure the 'gold' value is realistic for the power level.

  - VISUAL PROMPT RULES:
    1. The 'visualPrompt' MUST start with the physical object description.
    2. NEGATIVE CONSTRAINTS:
    - If Type is 'Ring', do NOT describe a bottle, potion, weapon, or armor.
       - If Type is 'Potion', do NOT describe jewelry, weapons, or armor.
       - If Type is 'Armor', do NOT describe a shield or helmet unless explicitly asked.
       - If Type is 'Weapon', do NOT describe a potion or ring.
  
  - If Type is 'Potion'(or contains 'Potion'), the item MUST be a consumable liquid in a bottle / vial.
  - If Type is 'Ring'(or contains 'Ring'), it MUST be a finger ring.
  - If Type is 'Scroll', it MUST be a parchment scroll.
  - If the Subtype is 'Helmet', 'Belt', 'Boots', 'Cloak', or 'Amulet', CREATE THAT SPECIFIC ITEM.
  - If Type is 'Wondrous Item' and no specific subtype is given, it can be anything.
  - If the Type is 'Armor'(and not Shield / Helmet), you MUST create BODY ARMOR(Chest / Torso).
  - If the Type is 'Weapon', create a weapon.
  
  === D&D 5e MECHANICS WHITELIST (USE ONLY THESE!) ===
  
  SAVING THROWS (6 only):
  - Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
  - Format: "DC X [Ability] saving throw" (e.g., "DC 15 Wisdom saving throw")
  
  ABILITY CHECKS:
  - Strength (Athletics), Dexterity (Acrobatics, Sleight of Hand, Stealth)
  - Intelligence (Arcana, History, Investigation, Nature, Religion)
  - Wisdom (Animal Handling, Insight, Medicine, Perception, Survival)
  - Charisma (Deception, Intimidation, Performance, Persuasion)
  
  CONDITIONS (official 5e only):
  - blinded, charmed, deafened, frightened, grappled, incapacitated
  - invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious
  
  HEBREW COMBAT TERMS (USE THESE!):
  - Critical Hit = פגיעה קריטית (NOT "פגיעות מנצחות"!)
  - Attack Roll = הטלת התקפה
  - Saving Throw = בדיקת הצלה / זריקת הצלה
  - Damage = נזק
  - Hit = פגיעה
  - Miss = החטאה
  - Advantage = יתרון
  - Disadvantage = חיסרון
  
  DURATION FORMATS:
  - "1 round", "1 minute" (=10 rounds), "10 minutes", "1 hour", "8 hours", "24 hours", "until dispelled"
  - Concentration: "up to X minutes (concentration)"
  
  RECHARGE FORMATS:
  - "1/day", "3/day", "once per short rest", "once per long rest", "recharge at dawn"
  - "X charges, regains Y at dawn"
  
  ❌ FORBIDDEN MECHANICS (DO NOT USE!):
  - "Saving throw against [damage type]" (saves are vs effects, not damage types!)
  - Ability scores above 30
  - Percentage-based effects ("50% chance to...")
  - Video game terms ("cooldown", "level up", "mana")
  - Non-5e conditions (staggered, dazed, slowed - unless specific spell effect)
    `;
}

// Build output structure
function buildOutputStructure(isHebrew: boolean): string {
    return `
  Return ONLY a JSON object with this exact structure (no markdown, just raw JSON):
  ${isHebrew ? `{
    "name": "1-3 Hebrew words. FORBIDDEN: Do NOT use item type words like חרב/גרזן/שריון/טבעת/שיקוי in name! Use creative nicknames like: להב הקפאון, ניב הסערה, אגרוף הברזל, עין הדרקון",
    "typeHe": "Hebrew Type (e.g. נשק, שריון, שיקוי, טבעת)",
    "rarityHe": "Hebrew Rarity: נפוץ/לא נפוץ/נדיר/נדיר מאוד/אגדי",
    "abilityName": "HEBREW Ability Name (2-4 words)",
    "abilityDesc": "HEBREW full mechanical description (max 50 words). Use D&D 5e standard terminology.",
    "description": "Hebrew Fluff Description (max 20 words)",
    "gold": "NUMBER ONLY (e.g. 500, 2500, 15000)",
    "weaponDamage": "Base weapon damage ONLY! Format: XdY+Z [HEBREW damage type]. Do NOT include extra elemental damage here!",
    "damageType": null,
    "armorClass": "Number if armor, null otherwise",
    "specialDamage": "REQUIRED if item deals extra elemental damage! Extract from abilityDesc. Format: '+XdY סוג' (e.g., '+1d4 נפשי', '+1d6 אש'). Leave empty ONLY if no extra damage.",
    "spellAbility": "REQUIRED if item has spell/ability! Extract from abilityDesc. Format: 'פעם/יום: [Hebrew spell name]' (e.g., 'פעם/יום: זיהוי', '2/יום: אור'). Leave empty ONLY if no spell.",

    "quickStats": "LEAVE EMPTY for weapons/armor!",
    "visualPrompt": "ENGLISH description for image (max 18 words)"
  }
  
  === CRITICAL: FIELD SEPARATION RULES ===
  If abilityDesc says "פגיעה גורמת 1d4 נזק נפשי נוסף" then specialDamage MUST be "+1d4 נפשי"
  If abilityDesc says "פעם ביום להטיל Identify" then spellAbility MUST be "פעם/יום: Identify"
  NEVER leave specialDamage empty if the ability adds elemental damage!
  NEVER leave spellAbility empty if the ability grants a spell!
  
  === DAMAGE TYPE TRANSLATIONS (MUST USE HEBREW!) ===
  | English      | Hebrew   |
  |--------------|----------|
  | slashing     | חותך     |
  | piercing     | דוקר     |
  | bludgeoning  | מוחץ     |
  | fire         | אש       |
  | cold         | קור      |
  | lightning    | ברק      |
  | thunder      | רעם      |
  | acid         | חומצה    |
  | poison       | רעל      |
  | necrotic     | נמק      |
  | radiant      | זוהר     |
  | force        | כוח      |
  | psychic      | נפשי     |
  
  ❌ FORBIDDEN: פירסינג, סלאשינג, בלאדג'ונינג (NO English transliterations!)
  ✅ CORRECT: דוקר, חותך, מוחץ
  
  === CONDITION TRANSLATIONS (MUST USE HEBREW!) ===
  | English      | Hebrew (USE THIS!)   |
  |--------------|----------------------|
  | Charmed      | מוקסם                |
  | Frightened   | מפוחד                |
  | Stunned      | המום                 |
  | Prone        | שרוע                 |
  | Blinded      | מעוור                |
  | Paralyzed    | משותק                |
  | Poisoned     | מורעל                |
  | Restrained   | מרותק                |
  | Incapacitated| מנוטרל               |
  
  ❌ WRONG: מכושפת, מוקפאת, מהולמת
  ✅ CORRECT: מוקסם (Charmed), מפוחד (Frightened), המום (Stunned)

  
  === HEBREW SPELL TERMINOLOGY ===
  ❌ WRONG: "לזרוק לחש" (literal translation of "cast")
  ✅ CORRECT: "להטיל לחש" / "להטיל [spell name]"
  
  === SPELL NAMES - USE HEBREW ONLY! ===
  | English         | Hebrew (USE THIS!)  |
  |-----------------|---------------------|
  | Faerie Fire     | אש פיות            |
  | Dancing Lights  | אורות מרקדים       |
  | Burning Hands   | ידיים בוערות       |
  | Cure Wounds     | ריפוי פצעים        |
  | Magic Missile   | קליע קסם           |
  | Shield          | מגן                |
  | Invisibility    | היעלמות            |
  | Misty Step      | צעד ערפילי         |
  | Hold Person     | אחיזת אדם          |
  | Fireball        | כדור אש            |
  | Lightning Bolt  | חזיז ברק           |
  | Fly             | מעוף               |
  | Haste           | האצה               |
  | Ray of Frost    | קרן כפור           |
  | Guiding Bolt    | חזיז מנחה          |
  | Bless           | ברכה               |
  | Command         | פקודה              |
  | Identify        | זיהוי              |
  | Detect Magic    | גילוי קסם          |
  | Light           | אור                |
  
  ❌ FORBIDDEN: Using English spell names! (NO "Faerie Fire", "Burning Hands", etc.)
  ✅ CORRECT: "1/יום: אש פיות" NOT "1/יום: Faerie Fire"

  
  === EXAMPLE OUTPUT (Rare +2 Ice Longsword) ===
  {
    "name": "להב הקרח",
    "typeHe": "נשק (חרב ארוכה)",
    "rarityHe": "נדיר",
    "abilityName": "קור נצחי",
    "abilityDesc": "פגיעה גורמת 1d6 נזק קור נוסף. 1/יום: הטל קרן כפור (DC 14).",
    "description": "חרב עתיקה חושלה בלב קרחון. להבה תמיד קפוא.",
    "gold": "3500",
    "weaponDamage": "1d8+2 חותך",
    "damageType": null,
    "armorClass": null,
    "specialDamage": "+1d6 קור",
    "spellAbility": "1/יום: קרן כפור (DC 14)",

    "quickStats": "",
    "visualPrompt": "ice-covered longsword, frozen blade with frost crystals, glowing blue, fantasy weapon"
  }
  
  === EXAMPLE OUTPUT (Rare +1 Plate Armor) ===
  {
    "name": "מגן הצל",
    "typeHe": "שריון לוחות (כבד)",
    "rarityHe": "נדיר",
    "abilityName": "הגנת צללים",
    "abilityDesc": "מעניק +1 לשריון. פעם ביום, כתגובה לפגיעה, אפשר להפעיל צעד ערפילי.",
    "description": "שריון עתיק שנטבל בצללי עולם אחר.",
    "gold": "2500",
    "weaponDamage": null,
    "damageType": null,
    "armorClass": 19,
    "specialDamage": "",
    "spellAbility": "1/יום: צעד ערפילי",
    "quickStats": "",
    "visualPrompt": "dark gothic plate armor with shadow tendrils, mysterious purple glow"
  }
  
  ⚠️ ARMOR RULE: For armor, put TOTAL AC (base+bonus) in "armorClass" field, and leave "quickStats" EMPTY!
  - Plate +1 = armorClass: 19, quickStats: ""
  - DO NOT put AC in quickStats for armor - it will cause duplicate display!
  
  ` : `{
    "name": "1-3 English words. FORBIDDEN: Do NOT use item type words like Sword/Axe/Armor/Ring/Potion in name! Use creative nicknames like: Frostbite, Stormfang, Iron Fist, Dragon's Eye",
    "typeHe": "English Type (e.g. Weapon, Armor, Potion, Ring)",
    "rarityHe": "English Rarity: Common/Uncommon/Rare/Very Rare/Legendary",
    "abilityName": "English Ability Name (2-4 words)",
    "abilityDesc": "English mechanical description (max 50 words). Use D&D 5e standard terminology.",
    "description": "English Fluff Description (max 20 words)",
    "gold": "NUMBER ONLY (e.g. 500, 2500, 15000)",
    "weaponDamage": "Format: XdY+Z [damage type] (e.g. 1d8+2 slashing, 1d6 cold)",
    "damageType": null,
    "armorClass": "Number if armor, null otherwise",
    "specialDamage": "EXTRA elemental damage ONLY (e.g., '+1d4 cold', '+1d6 fire'). EMPTY if none!",
    "spellAbility": "Spell/ability summary for front (e.g., '1/day: Cast Fireball'). EMPTY if none!",
    "quickStats": "LEAVE EMPTY for weapons/armor! Only for special effects.",
    "visualPrompt": "ENGLISH description for image (max 18 words)"
  }
  
  === EXAMPLE OUTPUT (Rare +2 Ice Longsword) ===
  {
    "name": "Frostbite",
    "typeHe": "Weapon (Longsword)",
    "rarityHe": "Rare",
    "abilityName": "Eternal Cold",
    "abilityDesc": "Hits deal an extra 1d6 cold damage. 1/day: Cast Ray of Frost (DC 14).",
    "description": "An ancient blade forged in a glacier's heart. Always frozen.",
    "gold": "3500",
    "weaponDamage": "1d8+2 slashing",
    "damageType": null,
    "armorClass": null,
    "specialDamage": "+1d6 cold",
    "spellAbility": "1/day: Cast Ray of Frost (DC 14)",
    "quickStats": "",
    "visualPrompt": "ice-covered longsword, frozen blade with frost crystals, glowing blue, fantasy weapon"
  }`}
  
  === SELF-VALIDATION (CRITICAL!) ===
  BEFORE returning your JSON, verify these consistency rules:
  
  1. ARMOR CLASS (CRITICAL!):
     - For ARMOR items: Use "armorClass" field with TOTAL AC number (base + bonus)
     - Plate base=18, so +1 Plate = armorClass: 19
     - Leave "quickStats" EMPTY for armor! Do NOT put AC there!
  
  2. DAMAGE TYPE: If abilityDesc mentions a damage type (fire/cold/necrotic/etc):
     - specialDamage MUST use the SAME type
     - Example: If abilityDesc says "נזק נמק", then specialDamage = "+1d4 נמק" (NOT אש!)
  
  3. SPELL NAMES: Must be in Hebrew for Hebrew output
  
  4. PRICE: Plate Armor = 1500+ GP base, add magic bonus value
  
  If you find ANY inconsistency, FIX IT before outputting the JSON!
    `;
}

// Process context image for API
async function processContextImage(contextImage: string): Promise<{ base64Data: string; mimeType: string }> {
    let base64Data = contextImage;
    let mimeType = "image/jpeg";

    if (contextImage.startsWith('http') || contextImage.startsWith('blob:')) {
        const response = await fetch(contextImage);
        const blob = await response.blob();
        mimeType = blob.type;
        const buffer = await blob.arrayBuffer();
        base64Data = btoa(
            new Uint8Array(buffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
    } else if (contextImage.startsWith('data:')) {
        const matches = contextImage.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            mimeType = matches[1];
            base64Data = matches[2];
        }
    }

    return { base64Data, mimeType };
}

// Validate and adjust price based on rarity
function validateAndAdjustPrice(parsedResult: ItemGenerationResult, rarity: string, subtype?: string): void {
    // Calculate price based on item abilities (using imported PricingService)

    // Use subtype if available and not random, otherwise fallback to Hebrew type
    const itemTypeForPricing = (subtype && subtype !== 'random') ? subtype : (parsedResult.typeHe || '');

    // Calculate price based on item abilities
    console.log('💰 Pricing Debug:', {
        abilityDesc: parsedResult.abilityDesc?.substring(0, 50),
        typeHe: parsedResult.typeHe,
        subtype: subtype,
        usingForPricing: itemTypeForPricing,
        rarity: rarity
    });

    const calculatedPrice = calculatePriceFromDescription(
        parsedResult.abilityDesc || '',
        itemTypeForPricing,
        rarity
    );

    // Use the calculated price if it's valid
    if (calculatedPrice > 0) {
        const oldPrice = parsedResult.gold;
        parsedResult.gold = String(calculatedPrice);
        console.log(`💰 Price calculated: ${oldPrice} -> ${calculatedPrice} (based on abilities)`);
    } else {
        // Fallback to rarity-based ranges if calculation fails
        const priceRanges: { [key: string]: { min: number; max: number } } = {
            'Common': { min: 25, max: 150 },
            'Uncommon': { min: 150, max: 600 },
            'Rare': { min: 1000, max: 6000 },
            'Very Rare': { min: 10000, max: 50000 },
            'Legendary': { min: 50000, max: 200000 }
        };

        const range = priceRanges[rarity] || priceRanges['Uncommon'];

        if (parsedResult.gold) {
            let price = parseInt(parsedResult.gold, 10);

            if (!isNaN(price)) {
                // Only fix EXTREME outliers
                if (price < range.min * 0.5) {
                    console.log(`⚠️ Price ${price} way too low for ${rarity}, adjusting to min: ${range.min} `);
                    price = range.min;
                } else if (price > range.max * 1.5) {
                    console.log(`⚠️ Price ${price} way too high for ${rarity}, adjusting to max: ${range.max} `);
                    price = range.max;
                }

                // Round to nearest 10
                price = Math.round(price / 10) * 10;
                parsedResult.gold = String(price);
            }
        }
    }
}

/**
 * Update Armor Class in quickStats based on magic bonus
 * Example: If parsedResult says "AC 18" but bonus is +1, update to "AC 19"
 */
function updateArmorClassWithBonus(parsedResult: ItemGenerationResult): void {
    // Skip if not armor
    if (!parsedResult.typeHe?.includes('שריון')) return;

    // 1. Detect magic bonus from description
    const bonusMatch = parsedResult.abilityDesc?.match(/\+(\d)\s+(?:לדרג"ש|לדרגת|לדירוג|לשכבת|AC|armor|shield|bonus|לשריון)/i) ||
        parsedResult.abilityDesc?.match(/(?:משפר|מעניק|מקבל|bonus).*?\+(\d)/i);

    const bonus = bonusMatch ? parseInt(bonusMatch[1], 10) : 0;

    // 2. Determine base AC from armor type
    let baseAC = 18; // Default to Plate
    const typeHe = parsedResult.typeHe?.toLowerCase() || '';
    if (typeHe.includes('עור') && !typeHe.includes('מחוזק')) baseAC = 11; // Leather
    else if (typeHe.includes('עור מחוזק') || typeHe.includes('studded')) baseAC = 12;
    else if (typeHe.includes('שרשראות') || typeHe.includes('chain')) baseAC = 16;
    else if (typeHe.includes('קשקשים') || typeHe.includes('scale')) baseAC = 14;
    else if (typeHe.includes('לוחות חצי') || typeHe.includes('half plate')) baseAC = 15;
    else if (typeHe.includes('לוחות') || typeHe.includes('plate')) baseAC = 18;
    else if (typeHe.includes('מגן') || typeHe.includes('shield')) baseAC = 2; // Shield bonus

    const correctAC = baseAC + bonus;

    // 3. Fix armorClass field if it's wrong
    const currentArmorClass = typeof parsedResult.armorClass === 'number'
        ? parsedResult.armorClass
        : parseInt(String(parsedResult.armorClass), 10) || 0;

    // If armorClass is just the bonus (e.g., 1, 2, 4) instead of total AC, fix it
    if (currentArmorClass < 10 || currentArmorClass !== correctAC) {
        console.log(`🛡️ Fixing armorClass: ${currentArmorClass} -> ${correctAC} (base ${baseAC} + bonus ${bonus})`);
        parsedResult.armorClass = correctAC;
    }

    // Also set armorBonus for proper display in FrontCardRenderer
    if (bonus > 0) {
        (parsedResult as any).armorBonus = bonus;
        console.log(`🛡️ Setting armorBonus: ${bonus}`);
    }

    // 4. Also fix quickStats if it has AC
    if (parsedResult.quickStats) {
        const acMatch = parsedResult.quickStats.match(/(\d+)\s*(?:AC|דרג"ש)/i);
        if (acMatch) {
            const qsAC = parseInt(acMatch[1], 10);
            if (qsAC < 10 || qsAC !== correctAC) {
                console.log(`🛡️ Fixing quickStats AC: ${qsAC} -> ${correctAC}`);
                parsedResult.quickStats = parsedResult.quickStats.replace(
                    acMatch[0],
                    `${correctAC} דרג"ש`
                );
            }
        }
    }
}



/**
 * Validate and clean quickStats field
 * Removes garbage data like duplicate dice notation or invalid content
 */
function validateAndCleanQuickStats(parsedResult: ItemGenerationResult, complexityMode: string): void {
    if (!parsedResult.quickStats) return;

    const quickStats = parsedResult.quickStats.trim();

    // 1. If quickStats is just dice notation (e.g., "1ק8", "1d8"), it's duplicate of weaponDamage - clear it
    // Match patterns like: 1d6, 2d8+2, 1ק8, 1 ק 8, etc.
    // Also catches Hebrew letters that might be misinterpreted as dice
    const cleanedStats = quickStats.replace(/\s/g, '');

    // Check for dice-only pattern (XdY or XקY with optional +Z)
    const diceOnlyPattern = /^[\d]+[dקDכ][\d]+([+\-][\d]+)?$/i;

    // Also check if it looks like damage dice without type (just numbers and d/ק)
    const looksLikeDice = /^[\d]+[dקDכ][\d]+/.test(cleanedStats) && cleanedStats.length < 10;

    if (diceOnlyPattern.test(cleanedStats) || looksLikeDice) {
        console.log(`⚠️ quickStats "${quickStats}" appears to be duplicate dice notation, clearing it`);
        parsedResult.quickStats = '';
        return;
    }

    // 2. If in 'simple' or 'mundane' mode and weaponDamage exists, quickStats should usually be empty
    if ((complexityMode === 'simple' || complexityMode === 'mundane') && parsedResult.weaponDamage) {
        // Check if quickStats is essentially the same as weaponDamage
        const normalizedQuick = quickStats.replace(/[\s,]/g, '').toLowerCase();
        const normalizedDamage = (parsedResult.weaponDamage || '').replace(/[\s,]/g, '').toLowerCase();

        if (normalizedQuick === normalizedDamage || normalizedDamage.includes(normalizedQuick)) {
            console.log(`⚠️ quickStats duplicates weaponDamage, clearing it`);
            parsedResult.quickStats = '';
            return;
        }
    }

    // 3. If quickStats is too long (more than 30 chars), it might be description not stats - truncate
    if (quickStats.length > 30) {
        console.log(`⚠️ quickStats too long (${quickStats.length} chars), truncating`);
        parsedResult.quickStats = quickStats.substring(0, 27) + '...';
    }
}

/**
 * Extract quick-glance fields from abilityDesc if AI didn't populate them
 * Uses simple word-based parsing instead of complex regex for Hebrew compatibility
 */
function extractQuickGlanceFields(parsedResult: ItemGenerationResult): void {
    console.log('🔍 [EXTRACT] Start - abilityDesc:', (parsedResult.abilityDesc || '').substring(0, 60));

    const abilityDesc = parsedResult.abilityDesc || '';
    if (!abilityDesc) return;

    const parts: string[] = [];

    // === DAMAGE EXTRACTION ===
    const damageTypes = ['אש', 'קור', 'ברק', 'רעם', 'חומצה', 'רעל', 'נמק', 'זוהר', 'כוח', 'נפשי'];
    const diceMatch = abilityDesc.match(/(\d+d\d+)/);

    if (diceMatch) {
        const dice = diceMatch[1];
        console.log('🎲 [EXTRACT] Found dice:', dice);

        for (const dmgType of damageTypes) {
            if (abilityDesc.includes(dmgType)) {
                // Include damage type so cleanStatsText preserves dice
                const damageText = `+${dice} ${dmgType}`;
                parts.push(damageText);
                parsedResult.specialDamage = damageText;
                console.log('✅ [EXTRACT] Damage:', damageText);

                // Fix quickStats if it has wrong damage type
                if (parsedResult.quickStats) {
                    for (const wrongType of damageTypes) {
                        if (wrongType !== dmgType && parsedResult.quickStats.includes(wrongType)) {
                            console.log(`🔧 [EXTRACT] Fixing quickStats: replacing "${wrongType}" with "${dmgType}"`);
                            parsedResult.quickStats = parsedResult.quickStats.replace(wrongType, dmgType);
                        }
                    }
                }
                break;
            }
        }
    }

    // === SPELL EXTRACTION ===
    // Try to extract Hebrew spell name first (e.g., "הטל 'אורות מרקדים'" or "הטל את הלחש 'קלע קסם'")
    // Then fall back to English spell names
    let spellName = '';

    // Pattern 1: Any quoted spell name in text (single or double quotes, Hebrew quotes)
    // This handles: "הטל את הלחש 'קלע קסם'" or "הטל 'אורות מרקדים'"
    const quotedMatch = abilityDesc.match(/[''"']([^''"']+)[''"']/);
    if (quotedMatch) {
        spellName = quotedMatch[1].trim();
        console.log('📜 [EXTRACT] Found quoted spell:', spellName);
    }

    // Pattern 2: Hebrew spell name directly after הטל (skip "את הלחש" if present)
    // Matches 1-3 Hebrew words after הטל
    if (!spellName) {
        const hebrewSpellMatch = abilityDesc.match(/הטל(?:\s+את\s+הלחש)?\s+([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+){0,2})/);
        if (hebrewSpellMatch) {
            const match = hebrewSpellMatch[1].trim();
            // Skip if it's just "את" or "הלחש" filler words
            if (!match.match(/^(את|הלחש|לחש)$/) && match.length >= 2) {
                spellName = match;
                console.log('📜 [EXTRACT] Found Hebrew spell:', spellName);
            }
        }
    }


    // Pattern 3: English spell name (fallback for old format)
    if (!spellName) {
        const englishSpellMatch = abilityDesc.match(/הטל[^A-Z]*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
        if (englishSpellMatch) {
            spellName = englishSpellMatch[1].trim();
            console.log('📜 [EXTRACT] Found English spell:', spellName);
        }
    }


    if (spellName) {
        let spellText = spellName;
        if (abilityDesc.includes('פעם ביום') || abilityDesc.includes('1/יום')) {
            spellText = `1/יום: ${spellName}`;
        } else if (abilityDesc.includes('2/יום')) {
            spellText = `2/יום: ${spellName}`;
        } else if (abilityDesc.includes('3/יום')) {
            spellText = `3/יום: ${spellName}`;
        }

        parts.push(spellText);
        parsedResult.spellAbility = spellText; // Keep for legacy
        console.log('✅ [EXTRACT] Spell:', spellText);
    }


    // === POPULATE quickStats ===
    if (parts.length > 0 && (!parsedResult.quickStats || !parsedResult.quickStats.trim())) {
        parsedResult.quickStats = parts.join('\n');
        console.log('✅ [EXTRACT] Set quickStats:', parsedResult.quickStats);
    }

    console.log('🔍 [EXTRACT] End - quickStats:', parsedResult.quickStats || '(none)');
}

/**
 * Fix RTL issues in Hebrew text:
 * 1. Dice notation and game terms using Bidi Isolate
 * 2. Punctuation placement using RLE/PDF marks
 */
function fixDiceNotationRTL(result: ItemGenerationResult): void {
    // Unicode Bidi characters
    const LRI = '\u2066'; // Left-To-Right Isolate
    const PDI = '\u2069'; // Pop Directional Isolate
    const RLM = '\u200F'; // Right-To-Left Mark - helps punctuation stay with RTL text

    // Patterns to isolate (LTR content in RTL context):
    const ltrPatterns = [
        /(\d+d\d+(?:[+\-]\d+)?)/g,  // Dice: 1d4, 2d6+2
        /(DC\s*\d+)/gi,              // DC values: DC 13
        /(\d+\s*(?:מטר|רגל|feet|ft))/g,  // Distances: 18 מטר
    ];

    const fixText = (text: string): string => {
        if (!text) return text;

        let result = text;

        // 1. Isolate LTR content (dice, DC values)
        for (const pattern of ltrPatterns) {
            result = result.replace(pattern, `${LRI}$1${PDI}`);
        }

        // 2. Fix punctuation at wrong position
        // Add RLM before punctuation that follows Hebrew text to keep it on the correct side
        result = result.replace(/([א-ת])([.,!?;:])/g, `$1${RLM}$2`);

        // 3. Fix punctuation that appears at beginning of line (wrong side)
        // This happens when punctuation "floats" to LTR position
        result = result.replace(/^([.,!?;:])(\s*)/gm, `$2$1`);

        return result;
    };

    // Fix relevant fields
    if (result.abilityDesc) {
        result.abilityDesc = fixText(result.abilityDesc);
    }
    if (result.weaponDamage) {
        result.weaponDamage = fixText(result.weaponDamage);
    }
    if (result.quickStats) {
        result.quickStats = fixText(result.quickStats);
    }
    if (result.description) {
        result.description = fixText(result.description);
    }
}

/**
 * Generate only a visual prompt for image generation (no item details)
 * Used when user wants to generate just an image from form settings
 */
export async function generateVisualPromptOnly(
    geminiConfig: GeminiConfig,
    type: string,
    subtype: string,
    rarity: string,
    ability: string,
    locale: string = 'he'
): Promise<string> {
    const { apiKey, password, useWorker, baseUrl } = geminiConfig;
    const isHebrew = locale === 'he';

    const prompt = `You are a D&D 5e visual artist assistant.
Generate a SHORT, CONCISE English description (max 20 words) for an item image.

Item Details:
- Type: ${subtype || type}
- Category: ${type}
- Rarity: ${rarity}
- Theme/Ability: ${ability || 'Fantasy magical item'}

RULES:
1. Output ONLY the visual prompt text, nothing else.
2. Use English regardless of locale.
3. Focus on the physical appearance of the item.
4. Include the style: fantasy, detailed, game item artwork
5. For ${type}: describe the specific item type correctly (sword for weapon, armor for armor, etc.)

Examples:
- "A glowing blue longsword with ice crystals, fantasy game item, detailed"
- "An ornate golden ring with ruby gem, magical aura, fantasy artwork"
- "A dark leather armor with dragon scales, epic fantasy, detailed"

Generate the visual prompt now:`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        let data;

        if (useWorker) {
            data = await callViaWorker(password!, 'gemini-generate', {
                model: 'gemini-2.5-flash-lite',
                contents: payload.contents
            });
        } else {
            const response = await fetch(`${baseUrl}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Gemini API Failed (${response.status})`);
            }

            data = await response.json();
        }

        if (!data.candidates || !data.candidates[0]) {
            throw new Error("No response from Gemini");
        }

        const visualPrompt = data.candidates[0].content.parts[0].text.trim();
        console.log('🎨 Generated visual prompt:', visualPrompt);

        return visualPrompt;
    } catch (error: any) {
        console.error("Visual prompt generation error:", error);
        // Fallback: create a basic prompt from the inputs
        const fallbackPrompt = `A ${rarity.toLowerCase()} fantasy ${subtype || type}${ability ? `, ${ability}` : ''}, detailed game item artwork`;
        console.log('Using fallback prompt:', fallbackPrompt);
        return fallbackPrompt;
    }
}

export default { generateItemDetails, generateVisualPromptOnly };
