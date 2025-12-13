// No external imports needed! We use raw fetch.

console.log("GeminiService module loaded (Raw Fetch Version)");

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
                // Check if it looks like a Cloudflare Access page
                if (text.includes('Access')) {
                    throw new Error(`Cloudflare Access Blocked (Status ${response.status}). Check Settings.`);
                }
                throw new Error(`Worker Error ${response.status}: ${text.substring(0, 50)}...`);
            }
        }

        return response.json();
    }

    async generateItemDetails(level, type, subtype, rarity, ability, contextImage = null, complexityMode = 'creative', locale = 'he') {
        // Determine output language based on locale
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
      - If the Subtype is 'Helmet', 'Belt', 'Boots', 'Cloak', or 'Amulet', CREATE THAT SPECIFIC ITEM. Do not create a generic wondrous item.
      - If Type is 'Wondrous Item' and no specific subtype is given, it can be anything.
      - If the Type is 'Armor' (and not Shield/Helmet), you MUST create BODY ARMOR (Chest/Torso).
      - If the Type is 'Weapon', create a weapon.

      Return ONLY a JSON object with this exact structure (no markdown, just raw JSON):
      ${isHebrew ? `{
        "name": "STRICT RULES: 1-3 Hebrew words MAX. FORBIDDEN WORDS (never use these in name): חרב, גרזן, רומח, קשת, מגל, פטיש, פגיון, מגן, שריון, טבעת, שרביט, מטה, שיקוי. Use ONLY creative nicknames like: להב הרעם, עוקץ הצל, שן הדרקון, קול הקרח, נשימת האש, עין הנשר.",
        "typeHe": "Hebrew Type (e.g. נשק, שריון, שיקוי, טבעת)",
        "rarityHe": "Hebrew Rarity - Use these exact translations: Common=נפוץ, Uncommon=לא נפוץ, Rare=נדיר, Very Rare=נדיר מאוד, Legendary=אגדי, Artifact=ארטיפקט",
        "abilityName": "Hebrew Ability Name",
        "abilityDesc": "COMPLETE Hebrew mechanical description (max 50 words) with ALL game rules: include saving throw type and DC (e.g. 'DC 14 חכמה'), duration (e.g. 'דקה אחת', 'שעה אחת', 'עד המנוחה הארוכה הבאה'), number of uses (e.g. 'פעם ביום', '3 פעמים בלילה'), mechanical effects (e.g. 'חסרון בהתקפות', 'מהירות מופחתת ב-10'). Be specific and playable!",
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
                // Convert URL to Base64 if needed
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
                // Use Worker proxy
                data = await this.callViaWorker('gemini-generate', {
                    model: 'gemini-2.0-flash',
                    contents: payload.contents,
                    generationConfig: payload.generationConfig
                });
            } else {
                // Direct API call
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
                // Check for safety ratings blocking
                if (data.promptFeedback) {
                    throw new Error(`Blocked by Safety Filters: ${JSON.stringify(data.promptFeedback)}`);
                }
                throw new Error("No candidates returned from Gemini. See console for full response.");
            }

            const text = data.candidates[0].content.parts[0].text;

            // Clean up markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            // Retry without context image if it failed
            if (contextImage) {
                console.warn("Gemini API request failed with context image. Retrying without image...", error);
                return this.generateItemDetails(level, type, subtype, rarity, ability, null);
            }

            console.error("Text Generation Error:", error);
            throw new Error(error.message || "Failed to generate item details");
        }
    }

    async generateItemImage(visualPrompt, model = 'flux', style = 'realistic', styleOption = 'natural', userColor = '#ffffff') {
        // Style Mappings
        const styles = {
            'realistic': '',
            'watercolor': 'watercolor painting, art line, defined edges, ink outline, artistic, colorful',
            'oil': 'oil painting, classic fantasy art, detailed brushstrokes, rich colors',
            'sketch': 'pencil sketch, graphite, technical drawing, on paper, monochrome',
            'dark_fantasy': 'dark fantasy, gothic, grim, high contrast, moody lighting, elden ring style',
            'anime': 'anime style, cel shaded, vibrant, studio ghibli style',
            'woodcut': 'woodcut print, old book illustration, black and white, ink lines',
            'pixel': 'pixel art, 16-bit, retro game asset',
            'simple_icon': 'simple vector icon, flat design, minimal, white background, high contrast, symbol'
        };

        const styleKeywords = styles[style] || '';

        // Prompt Modification Logic
        // Prompt Modification Logic
        let backgroundPrompt = `detailed cinematic ${userColor} background, atmospheric, context appropriate`;

        // Helper to convert hex to name
        const getColorName = (hex) => {
            const map = {
                '#ffffff': 'White', '#000000': 'Black', '#ff0000': 'Red', '#00ff00': 'Green', '#0000ff': 'Blue',
                '#ffff00': 'Yellow', '#00ffff': 'Cyan', '#ff00ff': 'Magenta', '#8b4513': 'Brown', '#808080': 'Gray',
                '#e6e6fa': 'Lavender', '#f0f8ff': 'Alice Blue', '#f5f5dc': 'Beige', '#ffe4e1': 'Rose'
            };
            return map[hex.toLowerCase()] || hex;
        };
        const colorName = getColorName(userColor);

        if (styleOption === 'no-background') {
            backgroundPrompt = "white background";
        } else if (styleOption === 'colored-background') {
            backgroundPrompt = `natural environment background, ${colorName} tones, atmospheric lighting, ${colorName} color palette`;
        } else if (styleOption === 'square-frame') {
            backgroundPrompt = `inside a decorative square border frame, framed illustration, parchment background, rpg icon style`;
        } else if (styleOption === 'round-frame') {
            backgroundPrompt = `inside a decorative circular round border frame, token style, round icon, isolated`;
        } else if (styleOption === 'natural') {
            backgroundPrompt = `natural environment background`;
        }

        // Truncate visualPrompt to avoid URL length issues (keep first 150 chars)
        const safePrompt = (visualPrompt || '').substring(0, 150).replace(/[^a-zA-Z0-9, ]/g, '').trim();

        // Construct final prompt, filtering out empty parts
        const promptParts = [
            'full shot',
            'entire object visible',
            'centered',
            styleKeywords,
            safePrompt,
            backgroundPrompt,
            '8k'
        ].filter(part => part && part.trim()); // Remove empty parts

        const enhancedPrompt = encodeURIComponent(promptParts.join(', '));
        console.log(`GeminiService DEBUG: Style=${style}, Option=${styleOption}, Color=${userColor}`);
        console.log(`GeminiService DEBUG: Background Prompt="${backgroundPrompt}"`);
        // Construct URL based on selected model
        let modelParam = `model=${model}`;

        const imageUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=512&height=512&${modelParam}&seed=${Math.floor(Math.random() * 10000)}`;
        console.log(`GeminiService: Generated Prompt: "${decodeURIComponent(enhancedPrompt)}"`);

        try {
            // Fetch with 90s timeout (Pollinations can be slow)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);

            const response = await fetch(imageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`${model} generation failed: ${response.status}`);

            const blob = await response.blob();
            return URL.createObjectURL(blob);

        } catch (error) {
            console.warn("FLUX Image Generation Error, trying default model:", error);

            // Fallback to default model
            const defaultUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=512&height=512&seed=${Math.floor(Math.random() * 10000)}`;
            console.log("GeminiService: Fetching image from (Default)", defaultUrl);

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 90000);
                const response = await fetch(defaultUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Default generation failed: ${response.status}`);

                const blob = await response.blob();
                return URL.createObjectURL(blob);
            } catch (fallbackError) {
                console.error("All Image Generation failed:", fallbackError);
                return `https://placehold.co/400x400/222/d4af37?text=${encodeURIComponent(visualPrompt.substring(0, 20))}`;
            }
        }
    }

    async removeWhiteBackground(imageBlob) {
        return new Promise((resolve, reject) => {
            // Safety timeout (3 seconds)
            const timeout = setTimeout(() => {
                console.warn("Background removal timed out, returning original");
                resolve(URL.createObjectURL(imageBlob));
            }, 3000);

            const img = new Image();
            img.crossOrigin = "Anonymous"; // Important for canvas manipulation
            img.onload = () => {
                clearTimeout(timeout);
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');

                    // Draw original image
                    ctx.drawImage(img, 0, 0);

                    // Get pixel data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Iterate through pixels
                    // R, G, B, A
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];

                        // Simple threshold for "white"
                        // If all channels are bright (> 240), make it transparent
                        if (r > 240 && g > 240 && b > 240) {
                            data[i + 3] = 0; // Alpha = 0
                        }
                    }

                    // Put modified data back
                    ctx.putImageData(imageData, 0, 0);

                    // Return as Data URL
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    console.error("Canvas processing error:", e);
                    resolve(URL.createObjectURL(imageBlob)); // Fallback to original
                }
            };
            img.onerror = (e) => {
                clearTimeout(timeout);
                console.error("Image load error for processing:", e);
                resolve(URL.createObjectURL(imageBlob)); // Fallback
            };
            img.src = URL.createObjectURL(imageBlob);
        });
    }

    async generateImageGetImg(visualPrompt, model, style, getImgApiKey, styleOption = 'natural', userColor = '#ffffff') {
        const styles = {
            'realistic': '',
            'watercolor': 'watercolor painting, art line, defined edges, ink outline, artistic, colorful',
            'oil': 'oil painting, classic fantasy art, detailed brushstrokes, rich colors',
            'sketch': 'pencil sketch, graphite, technical drawing, on paper, monochrome',
            'dark_fantasy': 'dark fantasy, gothic, grim, high contrast, moody lighting, elden ring style',
            'anime': 'anime style, cel shaded, vibrant, studio ghibli style',
            'woodcut': 'woodcut print, old book illustration, black and white, ink lines',
            'pixel': 'pixel art, 16-bit, retro game asset',
            'simple_icon': 'simple vector icon, flat design, minimal, white background, high contrast, symbol'
        };

        const styleKeywords = styles[style] || '';

        // Helper to convert hex to name
        const getColorName = (hex) => {
            const map = {
                '#ffffff': 'White', '#000000': 'Black', '#ff0000': 'Red', '#00ff00': 'Green', '#0000ff': 'Blue',
                '#ffff00': 'Yellow', '#00ffff': 'Cyan', '#ff00ff': 'Magenta', '#8b4513': 'Brown', '#808080': 'Gray',
                '#e6e6fa': 'Lavender', '#f0f8ff': 'Alice Blue', '#f5f5dc': 'Beige', '#ffe4e1': 'Rose'
            };
            return map[hex.toLowerCase()] || hex;
        };
        const colorName = getColorName(userColor);

        // Prompt Modification Logic
        let backgroundPrompt = `detailed cinematic ${colorName} background, atmospheric, context appropriate`;
        if (styleOption === 'no-background') {
            backgroundPrompt = "white background";
        } else if (styleOption === 'colored-background') {
            backgroundPrompt = `natural environment background, ${colorName} tones, atmospheric lighting, ${colorName} color palette`;
        } else if (styleOption === 'natural') {
            backgroundPrompt = "natural environment background, atmospheric, context appropriate";
        }

        const finalPrompt = `full shot, entire object visible, centered, ${styleKeywords}, ${visualPrompt}, ${backgroundPrompt}, 8k`.replace(/^, /, '');
        console.log(`GeminiService DEBUG (GetImg): Style=${style}, Option=${styleOption}, Color=${userColor}`);
        console.log(`GeminiService DEBUG (GetImg): Final Prompt="${finalPrompt}"`);

        let endpoint = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';
        let body = {
            prompt: finalPrompt,
            response_format: 'b64'
        };

        if (model === 'getimg-seedream') {
            endpoint = 'https://api.getimg.ai/v1/seedream-v4/text-to-image';
            // Seedream specific params if needed, otherwise same structure usually works or check docs
            // Docs say /v1/seedream-v4/text-to-image
        }

        // Check if getImgApiKey looks like a password (not starting with 'key-') or we want to force worker
        // Assume keys start with 'key-' (standard GetImg). If not, we try worker with this "key" as password.
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
            const base64Image = data.image; // Getimg returns 'image' field with base64 string
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;

            // Return original image URL (Background removal is now handled in renderer)
            const blob = await (await fetch(imageUrl)).blob();
            return URL.createObjectURL(blob);

        } catch (error) {
            console.error("All Background Generation failed:", error);
            throw error;
        }
    }

    /**
     * Generate image using Google's Imagen 3 API
     * Model: imagen-3.0-generate-002 (GA release Feb 2025)
     * @param {string} visualPrompt - The prompt describing the image
     * @param {string} style - Art style to apply
     * @param {string} styleOption - Background style option
     * @param {string} userColor - User selected color
     * @returns {Promise<string>} - Object URL of generated image
     */
    async generateImageImagen3(visualPrompt, style = 'realistic', styleOption = 'natural', userColor = '#ffffff') {
        const styles = {
            'realistic': 'photorealistic, highly detailed',
            'watercolor': 'watercolor painting, art line, defined edges, ink outline, artistic, colorful',
            'oil': 'oil painting, classic fantasy art, detailed brushstrokes, rich colors',
            'sketch': 'pencil sketch, graphite, technical drawing, on paper, monochrome',
            'dark_fantasy': 'dark fantasy, gothic, grim, high contrast, moody lighting',
            'anime': 'anime style, cel shaded, vibrant colors',
            'woodcut': 'woodcut print, old book illustration, black and white, ink lines',
            'pixel': 'pixel art, 16-bit, retro game asset',
            'simple_icon': 'simple vector icon, flat design, minimal, white background'
        };

        const styleKeywords = styles[style] || 'detailed';

        // Background prompt based on option
        let backgroundPrompt = 'natural environment background, atmospheric';
        if (styleOption === 'no-background') {
            backgroundPrompt = 'pure white background, isolated subject';
        } else if (styleOption === 'colored-background') {
            const colorName = this.hexToColorName(userColor);
            backgroundPrompt = `${colorName} toned background, atmospheric lighting`;
        }

        const finalPrompt = `${styleKeywords}, ${visualPrompt}, ${backgroundPrompt}, high quality, 8k resolution`;
        console.log(`🎨 Imagen 3: Generating image with prompt: "${finalPrompt.substring(0, 100)}..."`);

        const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict';

        const requestBody = {
            instances: [{ prompt: finalPrompt }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "3:4", // Card aspect ratio
                safetyFilterLevel: "BLOCK_MEDIUM_AND_ABOVE",
                personGeneration: "ALLOW_ADULT"
            }
        };

        try {
            let response;

            if (this.useWorker) {
                // Use Worker proxy for Imagen
                console.log("🎨 Imagen 3: Using Worker proxy");
                const data = await this.callViaWorker('imagen-generate', {
                    prompt: finalPrompt,
                    aspectRatio: "3:4"
                });

                if (data.image) {
                    const imageUrl = `data:image/png;base64,${data.image}`;
                    const blob = await (await fetch(imageUrl)).blob();
                    return URL.createObjectURL(blob);
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    throw new Error("Worker did not return an image");
                }
            } else {
                // Direct API call
                response = await fetch(`${endpoint}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Imagen 3 API Error: ${errorData.error?.message || response.statusText}`);
                }

                const data = await response.json();

                // Extract base64 image from response
                if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                    const base64Image = data.predictions[0].bytesBase64Encoded;
                    const imageUrl = `data:image/png;base64,${base64Image}`;
                    const blob = await (await fetch(imageUrl)).blob();
                    console.log("✅ Imagen 3: Image generated successfully");
                    return URL.createObjectURL(blob);
                } else {
                    throw new Error("Imagen 3 returned no image data");
                }
            }
        } catch (error) {
            console.error("❌ Imagen 3 generation failed:", error);
            throw error;
        }
    }

    // Helper to convert hex to color name
    hexToColorName(hex) {
        const map = {
            '#ffffff': 'white', '#000000': 'black', '#ff0000': 'red', '#00ff00': 'green', '#0000ff': 'blue',
            '#ffff00': 'yellow', '#00ffff': 'cyan', '#ff00ff': 'magenta', '#8b4513': 'brown', '#808080': 'gray',
            '#e6e6fa': 'lavender', '#f0f8ff': 'light blue', '#f5f5dc': 'beige', '#ffe4e1': 'rose pink'
        };
        return map[hex.toLowerCase()] || 'neutral';
    }

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
        const encodedPrompt = encodeURIComponent(prompt);

        // 1. Try Pollinations Flux
        const fluxUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=768&model=flux&seed=${Math.floor(Math.random() * 10000)}`;
        console.log(`GeminiService: Generating background for theme "${theme}" (Flux)`, fluxUrl);

        try {
            const response = await fetch(fluxUrl);
            if (!response.ok) throw new Error(`Flux generation failed: ${response.status}`);
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (fluxError) {
            console.warn("Background Flux generation failed:", fluxError);

            // 2. Try GetImg if Key is available
            if (getImgApiKey) {
                console.log("GeminiService: Trying GetImg fallback...");

                // Proxy Check
                const useWorkersForGetImg = !getImgApiKey.startsWith('key-');

                try {
                    let endpoint = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';
                    let body = {
                        prompt: prompt,
                        response_format: 'b64',
                        width: 512,
                        height: 768
                    };

                    if (useWorkersForGetImg) {
                        console.log("GeminiService: Using Worker for Background (Proxy Mode)");
                        const data = await this.callViaWorker('getimg-generate', body);

                        if (data.image) {
                            const imageUrl = `data:image/jpeg;base64,${data.image}`;
                            const blob = await (await fetch(imageUrl)).blob();
                            return URL.createObjectURL(blob);
                        } else if (data.error) {
                            throw new Error(data.error);
                        } else {
                            throw new Error("Worker (BG) did not return an image");
                        }
                    } else {
                        // Direct Call
                        const response = await fetch(endpoint, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${getImgApiKey}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(body)
                        });

                        if (!response.ok) throw new Error(`GetImg failed: ${response.status}`);
                        const data = await response.json();
                        const imageUrl = `data:image/jpeg;base64,${data.image}`;
                        const blob = await (await fetch(imageUrl)).blob();
                        return URL.createObjectURL(blob);
                    }

                } catch (getImgError) {
                    console.warn("Background GetImg fallback failed:", getImgError);
                }
            }

            // 3. Fallback to Pollinations Default (Turbo)
            const defaultUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=768&model=turbo&seed=${Math.floor(Math.random() * 10000)}`;
            console.log(`GeminiService: Generating background for theme "${theme}" (Default/Turbo)`, defaultUrl);

            try {
                const response = await fetch(defaultUrl);
                if (!response.ok) throw new Error(`Default generation failed: ${response.status}`);
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            } catch (fallbackError) {
                console.error("All Background Generation failed:", fallbackError);
                throw fallbackError;
            }
        }
    }

    /**
     * Analyze card layout using AI vision and suggest optimal positioning
     * @param {string} cardImageBase64 - Base64 encoded screenshot of the current card
     * @param {Object} contentInfo - Information about the card content
     * @returns {Object} Suggested offsets and settings
     */
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
