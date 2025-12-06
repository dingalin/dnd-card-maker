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

    async generateItemDetails(level, type, subtype, rarity, ability, contextImage = null) {
        let prompt = `
      You are a D&D 5e Dungeon Master. Create a unique magic item in Hebrew.
      
      Parameters:
      - Level/Power: ${level}
      - Main Type: ${type}
      - Subtype/Specific Kind: ${subtype || 'Any appropriate for Main Type'}
      - Rarity: ${rarity}
      - Special Theme/Ability: ${ability || 'Random cool theme'}
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
      - If Type is 'Wondrous Item', it can be anything, but respect the Subtype if provided.
      - If the Type is 'Armor' or a specific armor type (e.g. 'Leather', 'Chain Mail', 'Plate'), you MUST create BODY ARMOR (Chest/Torso). Do NOT create gloves, boots, helmets, or shields unless the 'Special Theme' explicitly asks for them.
      - If the Type is 'Weapon', create a weapon.

      Return ONLY a JSON object with this exact structure (no markdown, just raw JSON):
      {
        "name": "Hebrew Name",
        "typeHe": "Hebrew Type (e.g. נשק, שריון, שיקוי, טבעת)",
        "rarityHe": "Hebrew Rarity",
        "abilityName": "Hebrew Ability Name",
        "abilityDesc": "Hebrew Ability Description (max 30 words)",
        "description": "Hebrew Fluff Description (max 20 words)",
        "gold": "Estimated price in GP (number only, e.g. 500)",
        "weaponDamage": "Damage dice (e.g. 1d8) if weapon, else null",
        "damageType": "Damage type (Hebrew) if weapon, else null",
        "armorClass": "AC value (number) if armor, else null",
        "visualPrompt": "A SHORT, CONCISE English description (max 15 words) of the item for image generation. Focus ONLY on the main object's appearance. No background descriptions."
      }
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
        let backgroundPrompt = `detailed cinematic ${userColor} background, atmospheric, context appropriate`;
        if (styleOption === 'no-background') {
            backgroundPrompt = "isolated on white background";
        } else if (styleOption === 'colored-background') {
            // Convert hex to approximate color name or just use hex (AI handles hex okay usually, or we can map)
            // For simplicity, we'll try to use the hex or a generic "solid color" if needed.
            // Actually, let's just say "solid background of color ${userColor}"
            backgroundPrompt = `solid ${userColor} background`;
        }

        // Truncate visualPrompt to avoid URL length issues (keep first 150 chars)
        const safePrompt = visualPrompt.substring(0, 150).replace(/[^a-zA-Z0-9, ]/g, '');

        // Construct final prompt
        const enhancedPrompt = encodeURIComponent(`${styleKeywords}, ${safePrompt}, ${backgroundPrompt}, 8k`);        // Construct URL based on selected model
        let modelParam = `model=${model}`;

        const imageUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=512&height=512&${modelParam}&seed=${Math.floor(Math.random() * 10000)}`;
        console.log(`GeminiService: Generated Prompt: "${decodeURIComponent(enhancedPrompt)}"`);
        console.log(`GeminiService: Fetching image from (${model}) with style (${style})`, imageUrl);

        try {
            // Fetch with 30s timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

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
                const timeoutId = setTimeout(() => controller.abort(), 30000);
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

        // Prompt Modification Logic
        let backgroundPrompt = `detailed cinematic ${userColor} background, atmospheric, context appropriate`;
        if (styleOption === 'no-background') {
            backgroundPrompt = "isolated on white background";
        } else if (styleOption === 'colored-background') {
            backgroundPrompt = `solid ${userColor} background`;
        }

        const finalPrompt = `${styleKeywords}, ${visualPrompt}, ${backgroundPrompt}, 8k`.replace(/^, /, '');

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
            console.error("All Background Generation failed:", fallbackError);
            throw fallbackError;
        }
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
                try {
                    const endpoint = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';
                    const body = {
                        prompt: prompt,
                        response_format: 'b64',
                        width: 512,
                        height: 768
                    };

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
}


export default GeminiService;
