// GeminiService - Cleaned version (Dec 2024)
// Removed: generateItemImage (Pollinations), removeWhiteBackground (duplicate), generateImageImagen3 (not working)
// Image generation now uses GetImg/FLUX exclusively

console.log("GeminiService module loaded (Clean Version)");

// Cloudflare Worker URL for secure API access
const WORKER_URL = "https://dnd-api-proxy.dingalin2000.workers.dev/";

class GeminiService {
    constructor(apiKeyOrPassword) {
        // Check if this looks like an API key or a password
        // API keys start with "AIza" typically
        if (apiKeyOrPassword.startsWith('AIza')) {
            this.apiKey = apiKeyOrPassword;
            this.useWorker = false;
        } else {
            // It's a password - use Worker
            this.password = apiKeyOrPassword;
            this.useWorker = true;
            console.log("GeminiService: Using Worker proxy mode 🔐");
        }
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    }

    // Helper method to call through Worker
    async callViaWorker(action, data) {
        let response;
        try {
            response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: this.password,
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

    async generateItemDetails(level, type, subtype, rarity, ability, contextImage = null, complexityMode = 'creative', locale = 'he') {
        const isHebrew = locale === 'he';
        const outputLanguage = isHebrew ? 'Hebrew' : 'English';

        let modeInstruction = "";

        if (complexityMode === 'simple') {
            modeInstruction = isHebrew ? `
            MODE: EXTREMELY SIMPLE (Stats Only)
            - STRICT PROHIBITION: Do NOT create summoning spells, complex active abilities, transformations, or multi-turn effects.
            - The item MUST be practical and strictly mechanical.
            - PERMITTED EFFECTS ONLY:
              1. Flat bonuses (+1/+2/+3 to Hit/Damage/AC/Saves).
              2. Extra damage dice (e.g. +1d6 Fire).
              3. Advantage on specific checks (e.g. Advantage on Perception).
              4. Resistance to one damage type.
              5. One simple utility spell cast once per day (e.g. Light, Feather Fall).
            - If I selected a Weapon, just give me a +1 Weapon with maybe 1d6 elemental damage.
            - KEEP IT SHORT.
            - Quick Stats Example: "+1 להתקפה ולנזק", "+1 לדרג השריון", "תוספת 1d6 נזק אש", "עמידות לאש".
            ` : `
            MODE: EXTREMELY SIMPLE (Stats Only)
            - STRICT PROHIBITION: Do NOT create summoning spells, complex active abilities, transformations, or multi-turn effects.
            - The item MUST be practical and strictly mechanical.
            - PERMITTED EFFECTS ONLY:
              1. Flat bonuses (+1/+2/+3 to Hit/Damage/AC/Saves).
              2. Extra damage dice (e.g. +1d6 Fire).
              3. Advantage on specific checks (e.g. Advantage on Perception).
              4. Resistance to one damage type.
              5. One simple utility spell cast once per day (e.g. Light, Feather Fall).
            - If I selected a Weapon, just give me a +1 Weapon with maybe 1d6 elemental damage.
            - KEEP IT SHORT.
            - Quick Stats Example: "+1 to attack and damage", "+1 to AC", "extra 1d6 fire damage", "fire resistance".
            `;
        } else {
            modeInstruction = `
            MODE: CREATIVE & UNIQUE
            - Focus on UNIQUE, interesting mechanics that tell a story.
            - Create custom active abilities with charges or cooldowns (e.g., "Once per day...").
            - Avoid boring flat +1 bonuses unless necessary.
            - Make the item feel special and distinct.
            `;
        }

        let prompt = `
      You are a D&D 5e Dungeon Master. Create a unique magic item in ${outputLanguage}.
      
      Parameters:
      - Level/Power: ${level}
      - Main Type: ${subtype ? subtype : type} (Priority: ${subtype ? 'Strictly follow this subtype' : 'Follow Main Type'})
      - Category: ${type}
      - Rarity: ${rarity}
      - Special Theme/Ability: ${ability || 'Random cool theme'}
      
      ${modeInstruction}
      `;

        if (contextImage) {
            prompt += `
      VISUAL CONTEXT PROVIDED:
      The user has provided an image (attached). Use this image as the primary inspiration for the item's appearance, theme, and flavor.
      - Describe the item based on what you see in the image.
      - If the image shows a specific material (e.g., bone, crystal, gold), use that.
      - If the image implies a specific element (e.g., fire, ice, necrotic), use that.
      `;
        }

        prompt += `
      CRITICAL INSTRUCTION:
      - You MUST strictly adhere to the provided 'Type' and 'Subtype'.
      - VISUAL PROMPT RULES:
        1. The 'visualPrompt' MUST start with the physical object description (e.g., "A glowing blue ring...", "A glass potion bottle...").
        2. NEGATIVE CONSTRAINTS:
           - If Type is 'Ring', do NOT describe a bottle, potion, weapon, or armor.
           - If Type is 'Potion', do NOT describe jewelry, weapons, or armor.
           - If Type is 'Armor', do NOT describe a shield or helmet unless explicitly asked.
           - If Type is 'Weapon', do NOT describe a potion or ring.
      
      - If Type is 'Potion' (or contains 'Potion'), the item MUST be a consumable liquid in a bottle/vial.
      - If Type is 'Ring' (or contains 'Ring'), it MUST be a finger ring.
      - If Type is 'Scroll', it MUST be a parchment scroll.
      - If the Subtype is 'Helmet', 'Belt', 'Boots', 'Cloak', or 'Amulet', CREATE THAT SPECIFIC ITEM.
      - If Type is 'Wondrous Item' and no specific subtype is given, it can be anything.
      - If the Type is 'Armor' (and not Shield/Helmet), you MUST create BODY ARMOR (Chest/Torso).
      - If the Type is 'Weapon', create a weapon.

      Return ONLY a JSON object with this exact structure (no markdown, just raw JSON):
      ${isHebrew ? `{
        "name": "STRICT RULES: 1-3 Hebrew words MAX. FORBIDDEN WORDS (never use these in name): חרב, גרזן, רומח, קשת, מגל, פטיש, פגיון, מגן, שריון, טבעת, שרביט, מטה, שיקוי. Use ONLY creative nicknames like: להב הרעם, עוקץ הצל, שן הדרקון, קול הקרח, נשימת האש, עין הנשר.",
        "typeHe": "Hebrew Type (e.g. נשק, שריון, שיקוי, טבעת)",
        "rarityHe": "Hebrew Rarity - Use these exact translations: Common=נפוץ, Uncommon=לא נפוץ, Rare=נדיר, Very Rare=נדיר מאוד, Legendary=אגדי, Artifact=ארטיפקט",
        "abilityName": "HEBREW Ability Name (שם היכולת בעברית, e.g. 'התמרה הדהודית', 'מכת צל', 'זעם יסודי', 'נשימת מים'). Creative and thematic.",
        "abilityDesc": "COMPLETE HEBREW mechanical description (max 50 words) with ALL game rules in Hebrew: include saving throw type and DC (e.g. 'חיסכון חוכמה DC 14'), duration (e.g. 'דקה אחת', 'שעה', 'עד המנוחה הארוכה הבאה'), number of uses (e.g. 'פעם ביום', '3 פעמים בלילה'), mechanical effects (e.g. 'חיסרון בהתקפות', 'מהירות מופחתת ב-10'). הכל בעברית!",
        "description": "Hebrew Fluff Description (max 20 words)",
        "gold": "Estimated price in GP (number only, e.g. 500)",
        "weaponDamage": "Full damage string including dice and type in HEBREW (e.g. '1d8 + 1d6 אש' or '2d6 חותך'). Use Hebrew damage types: slashing=חותך, piercing=דוקר, bludgeoning=מוחץ, fire=אש, cold=קור, lightning=ברק, poison=רעל, acid=חומצה, necrotic=נמק, radiant=זוהר, force=כוח, psychic=נפשי, thunder=רעם.",
        "damageType": "Always null (deprecated, put type in weaponDamage).",
        "armorClass": "AC value (number) if armor, else null",
        "quickStats": "EXTREMELY CONCISE mechanical summary in Hebrew (max 4-5 words). Priority: mechanics over flavor. Examples: '1d8 + 1d6 אש', '+2 להגנה ולגלגולי הצלה', 'הטלת כדור אש פעם ביום', 'יתרון בבדיקות התגנבות'. Do NOT use full sentences.",
        "visualPrompt": "A SHORT, CONCISE English description (max 15 words) of the item for image generation. Focus ONLY on the main object's appearance. No background descriptions."
      }` : `{
        "name": "STRICT RULES: 1-3 English words MAX. Use ONLY creative nicknames like: Thunder's Edge, Shadow Sting, Dragon's Fang, Frost Voice, Fire's Breath, Eagle Eye. Do NOT use generic names like 'sword', 'axe', 'ring'.",
        "typeHe": "English Type (e.g. Weapon, Armor, Potion, Ring)",
        "rarityHe": "English Rarity - Use these exact terms: Common, Uncommon, Rare, Very Rare, Legendary, Artifact",
        "abilityName": "English Ability Name",
        "abilityDesc": "COMPLETE English mechanical description (max 50 words) with ALL game rules: include saving throw type and DC (e.g. 'DC 14 Wisdom'), duration (e.g. '1 minute', '1 hour', 'until next long rest'), number of uses (e.g. 'once per day', '3 times per night'), mechanical effects (e.g. 'disadvantage on attacks', 'speed reduced by 10'). Be specific and playable!",
        "description": "English Fluff Description (max 20 words)",
        "gold": "Estimated price in GP (number only, e.g. 500)",
        "weaponDamage": "Full damage string including dice and type in ENGLISH (e.g. '1d8 + 1d6 fire' or '2d6 slashing'). Use English damage types: slashing, piercing, bludgeoning, fire, cold, lightning, poison, acid, necrotic, radiant, force, psychic, thunder.",
        "damageType": "Always null (deprecated, put type in weaponDamage).",
        "armorClass": "AC value (number) if armor, else null",
        "quickStats": "EXTREMELY CONCISE mechanical summary in English (max 4-5 words). Priority: mechanics over flavor. Examples: '1d8 + 1d6 fire', '+2 to AC and saves', 'cast fireball once per day', 'advantage on stealth'. Do NOT use full sentences.",
        "visualPrompt": "A SHORT, CONCISE English description (max 15 words) of the item for image generation. Focus ONLY on the main object's appearance. No background descriptions."
      }`}
    `;

        const parts = [{ text: prompt }];

        if (contextImage) {
            try {
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

                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
                console.log("GeminiService: Added visual context to prompt");
            } catch (e) {
                console.error("Failed to process context image:", e);
            }
        }

        const payload = {
            contents: [{
                parts: parts
            }]
        };

        try {
            console.log("Sending Gemini Request. Payload size:", JSON.stringify(payload).length);

            let data;

            if (this.useWorker) {
                data = await this.callViaWorker('gemini-generate', {
                    model: 'gemini-2.0-flash',
                    contents: payload.contents,
                    generationConfig: payload.generationConfig
                });
            } else {
                const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || "Gemini API request failed");
                }

                data = await response.json();
            }

            if (data.error) {
                console.error("Gemini API Error (via Worker):", data.error);
                throw new Error(`Gemini Error: ${data.error.message || JSON.stringify(data.error)}`);
            }

            if (!data.candidates || !data.candidates[0]) {
                console.error("Gemini Unexpected Response:", data);
                if (data.promptFeedback) {
                    throw new Error(`Blocked by Safety Filters: ${JSON.stringify(data.promptFeedback)}`);
                }
                throw new Error("No candidates returned from Gemini. See console for full response.");
            }

            const text = data.candidates[0].content.parts[0].text;
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            if (contextImage) {
                console.warn("Gemini API request failed with context image. Retrying without image...", error);
                return this.generateItemDetails(level, type, subtype, rarity, ability, null);
            }

            console.error("Text Generation Error:", error);
            throw new Error(error.message || "Failed to generate item details");
        }
    }

    // Main image generation using GetImg/FLUX - OPTIMIZED FOR FANTASY ITEMS
    async generateImageGetImg(visualPrompt, model, style, getImgApiKey, styleOption = 'natural', userColor = '#ffffff') {

        // === FLUX-OPTIMIZED PROMPT BUILDER ===
        // Based on research: FLUX excels with natural language, detailed descriptions,
        // and structured prompts following Subject → Style → Context format

        const styleConfigs = {
            'realistic': {
                prefix: 'ultra-realistic photography',
                suffix: 'studio lighting, professional product shot, sharp focus, 8K resolution',
                quality: 'highly detailed, photorealistic, cinematic'
            },
            'watercolor': {
                prefix: 'watercolor painting, artistic illustration',
                suffix: 'soft edges, flowing colors, painterly strokes, art paper texture',
                quality: 'beautiful artwork, defined ink outlines, vibrant pigments'
            },
            'oil': {
                prefix: 'classical oil painting, Renaissance style artwork',
                suffix: 'rich oil colors, detailed brushwork, dramatic chiaroscuro lighting',
                quality: 'masterpiece quality, museum painting, baroque details'
            },
            'sketch': {
                prefix: 'detailed pencil sketch, technical drawing',
                suffix: 'graphite on paper, cross-hatching, precise lines, monochrome',
                quality: 'professional illustration, concept art style'
            },
            'dark_fantasy': {
                prefix: 'dark fantasy artwork, gothic illustration',
                suffix: 'dramatic shadows, ominous atmosphere, Elden Ring aesthetic',
                quality: 'high contrast, moody lighting, gritty details, dark souls style'
            },
            'anime': {
                prefix: 'anime style illustration, manga artwork',
                suffix: 'cel shading, clean lines, vibrant colors, Studio Ghibli inspired',
                quality: 'high quality anime, detailed, beautiful illustration'
            },
            'woodcut': {
                prefix: 'medieval woodcut print, old book illustration',
                suffix: 'black and white, carved lines, vintage printed art',
                quality: 'antique style, historical artwork, ink print'
            },
            'pixel': {
                prefix: '16-bit pixel art, retro game sprite',
                suffix: 'clean pixels, limited color palette, nostalgic',
                quality: 'game asset, sharp pixels, iconic design'
            },
            'simple_icon': {
                prefix: 'flat vector icon, minimalist design',
                suffix: 'clean edges, symbolic, high contrast',
                quality: 'professional icon, simple shapes, clear silhouette'
            }
        };

        const styleConfig = styleConfigs[style] || styleConfigs['realistic'];

        // Helper to convert hex to descriptive color name
        const getColorName = (hex) => {
            const map = {
                '#ffffff': 'pure white', '#000000': 'deep black', '#ff0000': 'crimson red',
                '#00ff00': 'emerald green', '#0000ff': 'royal blue', '#ffff00': 'golden yellow',
                '#00ffff': 'icy cyan', '#ff00ff': 'arcane magenta', '#8b4513': 'rich brown',
                '#808080': 'steel gray', '#e6e6fa': 'soft lavender', '#f0f8ff': 'pale ice blue',
                '#f5f5dc': 'antique beige', '#ffe4e1': 'rose quartz'
            };
            return map[hex.toLowerCase()] || 'neutral';
        };
        const colorName = getColorName(userColor);

        // === ITEM TYPE DETECTION & SPECIALIZED PROMPTS ===
        // Detect item type from visualPrompt and apply type-specific enhancements
        const promptLower = visualPrompt.toLowerCase();
        let itemTypeEnhancement = '';
        let compositionGuide = '';

        // WEAPONS - Enhanced for clear, detailed weapon renders
        if (promptLower.includes('sword') || promptLower.includes('blade') || promptLower.includes('חרב')) {
            itemTypeEnhancement = 'ornate fantasy sword, detailed hilt and guard, sharp glinting blade edge, intricate engravings';
            compositionGuide = 'full weapon visible from pommel to tip, angled hero pose';
        } else if (promptLower.includes('axe') || promptLower.includes('גרזן')) {
            itemTypeEnhancement = 'formidable battle axe, heavy curved blade, reinforced handle with leather grip';
            compositionGuide = 'dynamic angle showing the axe head detail';
        } else if (promptLower.includes('bow') || promptLower.includes('קשת')) {
            itemTypeEnhancement = 'elegant recurve bow, carved wood or bone, taut bowstring, decorative limbs';
            compositionGuide = 'full bow visible, graceful curved shape emphasized';
        } else if (promptLower.includes('staff') || promptLower.includes('מטה') || promptLower.includes('שרביט')) {
            itemTypeEnhancement = 'magical wizard staff, crystalline focus gemstone, arcane runes along the shaft';
            compositionGuide = 'vertical composition showing the magical top ornament';
        } else if (promptLower.includes('dagger') || promptLower.includes('פגיון')) {
            itemTypeEnhancement = 'sleek throwing dagger, double-edged blade, balanced design';
            compositionGuide = 'centered blade with sharp point visible';
        } else if (promptLower.includes('spear') || promptLower.includes('רומח')) {
            itemTypeEnhancement = 'long war spear, deadly pointed head, wrapped shaft grip';
            compositionGuide = 'angled to show spear tip detail and length';
        } else if (promptLower.includes('hammer') || promptLower.includes('mace') || promptLower.includes('פטיש')) {
            itemTypeEnhancement = 'heavy war hammer, reinforced striking head, powerful design';
            compositionGuide = 'showing the weight and impact potential of the head';
        } else if (promptLower.includes('crossbow') || promptLower.includes('arbalet')) {
            itemTypeEnhancement = 'mechanical crossbow, intricate trigger mechanism, loaded bolt';
            compositionGuide = 'three-quarter view showing mechanism detail';
        }

        // ARMOR - Enhanced for detailed armor renders
        else if (promptLower.includes('armor') || promptLower.includes('plate') || promptLower.includes('שריון')) {
            itemTypeEnhancement = 'ornate plate armor piece, polished metal surface, functional battle design, riveted construction';
            compositionGuide = 'front view showing craftsmanship details';
        } else if (promptLower.includes('shield') || promptLower.includes('מגן')) {
            itemTypeEnhancement = 'heraldic battle shield, emblazoned surface, reinforced rim, sturdy grip';
            compositionGuide = 'front face view with emblem visible';
        } else if (promptLower.includes('helmet') || promptLower.includes('קסדה')) {
            itemTypeEnhancement = 'detailed warrior helmet, protective visor, decorative crest';
            compositionGuide = 'three-quarter view showing depth and profile';
        } else if (promptLower.includes('gauntlet') || promptLower.includes('glove') || promptLower.includes('כפפ')) {
            itemTypeEnhancement = 'articulated armored gauntlet, flexible finger joints, reinforced knuckles';
            compositionGuide = 'dynamic pose showing articulation';
        } else if (promptLower.includes('boots') || promptLower.includes('מגפ')) {
            itemTypeEnhancement = 'sturdy adventuring boots, reinforced toe and heel, magical enhancement visible';
            compositionGuide = 'side profile showing design';
        }

        // ACCESSORIES & MAGICAL ITEMS
        else if (promptLower.includes('ring') || promptLower.includes('טבעת')) {
            itemTypeEnhancement = 'intricate magical ring, precious metal band, embedded gemstone, subtle enchantment glow';
            compositionGuide = 'close-up macro view, gemstone as focal point';
        } else if (promptLower.includes('amulet') || promptLower.includes('necklace') || promptLower.includes('קמע')) {
            itemTypeEnhancement = 'mystical amulet pendant, ornate chain, magical centerpiece gem';
            compositionGuide = 'centered with chain flowing around it';
        } else if (promptLower.includes('potion') || promptLower.includes('bottle') || promptLower.includes('שיקוי')) {
            itemTypeEnhancement = 'glass potion bottle, swirling magical liquid inside, cork stopper, alchemical labels';
            compositionGuide = 'vertical bottle with liquid effects visible';
        } else if (promptLower.includes('scroll') || promptLower.includes('מגילה')) {
            itemTypeEnhancement = 'ancient spell scroll, weathered parchment, magical glowing text, wax seal';
            compositionGuide = 'partially unrolled showing mystical writing';
        } else if (promptLower.includes('cloak') || promptLower.includes('cape') || promptLower.includes('גלימ')) {
            itemTypeEnhancement = 'flowing magical cloak, rich fabric, ornate clasp, mystical shimmer';
            compositionGuide = 'draped to show fabric flow and magical effects';
        } else if (promptLower.includes('belt') || promptLower.includes('חגור')) {
            itemTypeEnhancement = 'enchanted leather belt, ornate buckle, magical pouches attached';
            compositionGuide = 'horizontal layout showing buckle detail';
        } else if (promptLower.includes('wand') || promptLower.includes('שרביט')) {
            itemTypeEnhancement = 'elegant magical wand, carved from rare wood, crystalline tip emanating power';
            compositionGuide = 'diagonal pose with magical particles at tip';
        }

        // Default enhancement if no type detected
        if (!itemTypeEnhancement) {
            itemTypeEnhancement = 'detailed fantasy item, magical craftsmanship, mystical properties';
            compositionGuide = 'centered product shot, clear details visible';
        }

        // === BACKGROUND CONFIGURATION ===
        let backgroundPrompt = '';
        if (styleOption === 'no-background') {
            backgroundPrompt = 'isolated on pure white background, clean studio shot, no shadows';
        } else if (styleOption === 'colored-background') {
            backgroundPrompt = `isolated on ${colorName} gradient background, soft ambient glow, ${colorName} color tones`;
        } else { // natural
            backgroundPrompt = 'atmospheric fantasy environment background, mystical ambiance, complementary lighting';
        }

        // === NEGATIVE PROMPTS (what to avoid) ===
        const negativeElements = 'NO hands holding the item, NO people, NO watermarks, NO text, NO cropped edges, NO blurry, NO low quality';

        // === BUILD FINAL OPTIMIZED PROMPT ===
        // Structure: [Composition] [Style Prefix] [Subject/Item] [Type Enhancement] [Visual Prompt] [Quality] [Background] [Style Suffix] [Negatives]
        const finalPrompt = [
            compositionGuide,
            styleConfig.prefix,
            itemTypeEnhancement,
            visualPrompt,
            styleConfig.quality,
            backgroundPrompt,
            styleConfig.suffix,
            negativeElements
        ].filter(Boolean).join(', ');

        console.log(`🎨 GeminiService (GetImg/FLUX): Style=${style}, Option=${styleOption}`);
        console.log(`📝 Optimized Prompt: "${finalPrompt.substring(0, 150)}..."`);

        let endpoint = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';
        let body = {
            prompt: finalPrompt,
            response_format: 'b64'
        };

        if (model === 'getimg-seedream') {
            endpoint = 'https://api.getimg.ai/v1/seedream-v4/text-to-image';
        }

        // Use Worker proxy if not a direct API key
        const useWorkersForGetImg = !getImgApiKey.startsWith('key-');

        if (useWorkersForGetImg) {
            console.log("GeminiService: Using Worker for GetImg (Proxy Mode)");
            try {
                const data = await this.callViaWorker('getimg-generate', {
                    prompt: finalPrompt,
                    model: model,
                    response_format: 'b64'
                });

                if (data.image) {
                    const imageUrl = `data:image/jpeg;base64,${data.image}`;
                    const blob = await (await fetch(imageUrl)).blob();
                    return URL.createObjectURL(blob);
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    throw new Error("Worker did not return an image");
                }
            } catch (workerError) {
                console.error("GetImg Proxy Error:", workerError);
                throw workerError;
            }
        }

        console.log(`GeminiService: Generating with Getimg.ai (${model})`, endpoint);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getImgApiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Getimg API Error: ${err.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const base64Image = data.image;
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;

            const blob = await (await fetch(imageUrl)).blob();
            return URL.createObjectURL(blob);

        } catch (error) {
            console.error("GetImg Generation failed:", error);
            throw error;
        }
    }

    // Background generation using GetImg/FLUX
    async generateCardBackground(theme, getImgApiKey = '') {
        const themeColors = {
            'Fire': 'light orange',
            'Nature': 'light green',
            'Arcane': 'light purple',
            'Divine': 'light gold',
            'Necrotic': 'pale necrotic green',
            'Industrial': 'light metallic grey',
            'Iron': 'light rust',
            'Old Scroll': 'aged parchment',
            'Elemental': 'prismatic'
        };
        const color = themeColors[theme] || 'light';
        const prompt = `watercolor style, ${color} colored ornate ${theme} style decorated old parchment paper texture, vintage card background, no white`;

        console.log(`GeminiService: Generating background for theme "${theme}" with GetImg/FLUX`);

        // Use GetImg/FLUX via Worker proxy
        try {
            const body = {
                prompt: prompt,
                response_format: 'b64',
                width: 512,
                height: 768
            };

            console.log("GeminiService: Using Worker for Background generation");
            const data = await this.callViaWorker('getimg-generate', body);

            if (data.image) {
                const imageUrl = `data:image/jpeg;base64,${data.image}`;
                const blob = await (await fetch(imageUrl)).blob();
                return URL.createObjectURL(blob);
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                throw new Error("Worker did not return an image");
            }
        } catch (error) {
            console.error("Background generation failed:", error);
            throw error;
        }
    }

    // AI-powered layout analysis
    async analyzeCardLayout(cardImageBase64, contentInfo) {
        const prompt = `
You are a professional D&D card designer. Your goal is to achieve a CLEAN, BALANCED layout like a professional trading card.

IDEAL CARD LAYOUT (top to bottom):
1. RARITY - small text at very top center (נפוץ, נדיר, etc.)
2. TYPE - weapon/armor type below rarity (מגל (פשוט), חרב ארוכה (קרבי))
3. NAME - large bold title, centered (עוקץ האבן)
4. IMAGE - circular item image in the center, properly sized
5. CORE STATS - damage or AC below image (1d4 חותך (קל))
6. QUICK STATS - brief ability description (יוצר שטח קשה פעם ביום)
7. GOLD - coin value at bottom (50)

CARD CONTENT INFO:
- Item Name: "${contentInfo.name}" (${contentInfo.nameLength} characters)
- Item Type: "${contentInfo.type}"
- Has Item Image: ${contentInfo.hasImage}
- Has Stats (damage/AC): ${contentInfo.hasStats}
- Description Length: ${contentInfo.descriptionLength} words

CURRENT CARD IMAGE IS ATTACHED. Compare it to the ideal layout.

YOUR TASK:
Suggest Y-offset adjustments to achieve the ideal layout. Values are in PIXELS.
- NEGATIVE values = move element UP
- POSITIVE values = move element DOWN

OFFSET GUIDELINES:
- rarity: position at -200 to -100 (should be at TOP)
- type: position at -150 to -50 (below rarity)
- name: position at -50 to 50 (prominent title area)
- imageYOffset: -100 to 100 (center the image nicely)
- imageScale: 0.8 to 1.5 (size the image appropriately)
- coreStats: 600 to 750 (damage/AC below image, around 680 is good)
- stats: 700 to 800 (quick description below damage)
- gold: -20 to 20 (fine-tune bottom position)

FONT SIZE:
- nameSize: 40-70 (use smaller for longer names, default 56)

Return ONLY a JSON object (no markdown):
{
  "rarity": -100,
  "type": -38,
  "name": 0,
  "imageYOffset": 0,
  "imageScale": 1.0,
  "coreStats": 680,
  "stats": 0,
  "gold": 0,
  "nameSize": 56,
  "reasoning": "Brief explanation"
}
`;

        const parts = [
            { text: prompt },
            {
                inline_data: {
                    mime_type: "image/png",
                    data: cardImageBase64.replace(/^data:image\/\w+;base64,/, '')
                }
            }
        ];

        const payload = {
            contents: [{ parts }]
        };

        try {
            console.log("GeminiService: Analyzing card layout with AI Vision...");

            let data;
            if (this.useWorker) {
                data = await this.callViaWorker('gemini-generate', {
                    model: 'gemini-2.0-flash',
                    contents: payload.contents
                });
            } else {
                const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || "Layout analysis failed");
                }

                data = await response.json();
            }

            if (!data.candidates || !data.candidates[0]) {
                throw new Error("No layout suggestions returned");
            }

            const text = data.candidates[0].content.parts[0].text;
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const suggestions = JSON.parse(jsonStr);

            console.log("GeminiService: Layout suggestions:", suggestions);
            return suggestions;

        } catch (error) {
            console.error("Layout Analysis Error:", error);
            throw new Error("Failed to analyze card layout: " + error.message);
        }
    }
}

export default GeminiService;
