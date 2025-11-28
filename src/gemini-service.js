// No external imports needed! We use raw fetch.

console.log("GeminiService module loaded (Raw Fetch Version)");

export class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    }

    async generateItemDetails(level, type, rarity, ability) {
        const prompt = `
      You are a D&D 5e Dungeon Master. Create a unique magic item in Hebrew.
      
      Parameters:
      - Level/Power: ${level}
      - Type: ${type}
      - Rarity: ${rarity}
      - Special Theme/Ability: ${ability || 'Random cool theme'}

      Return ONLY a JSON object with this exact structure (no markdown, just raw JSON):
      {
        "name": "Hebrew Name",
        "typeHe": "Hebrew Type (e.g. נשק, שריון)",
        "rarityHe": "Hebrew Rarity",
        "abilityName": "Hebrew Ability Name",
        "abilityDesc": "Hebrew Ability Description (max 30 words)",
        "description": "Hebrew Fluff Description (max 20 words)",
        "weaponDamage": "Damage dice (e.g. 1d8) if weapon, else null",
        "damageType": "Damage type (Hebrew) if weapon, else null",
        "armorClass": "AC value (number) if armor, else null",
        "visualPrompt": "A highly detailed English description of the item for an image generator. Focus on visual details, materials, lighting, and style. The object should be centered. No text in image."
      }
    `;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        try {
            // Add 20s timeout for text generation
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Gemini API request failed");
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;

            // Clean up markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("Text Generation Error:", error);
            throw new Error(error.message || "Failed to generate item details");
        }
    }

    async generateItemImage(visualPrompt, model = 'flux', style = 'realistic') {
        // Style Mappings
        const styles = {
            'realistic': '',
            'watercolor': 'watercolor painting, art line, defined edges, ink outline, artistic, colorful',
            'oil': 'oil painting, classic fantasy art, detailed brushstrokes, rich colors',
            'sketch': 'pencil sketch, graphite, technical drawing, on paper, monochrome',
            'dark_fantasy': 'dark fantasy, gothic, grim, high contrast, moody lighting, elden ring style',
            'anime': 'anime style, cel shaded, vibrant, studio ghibli style',
            'woodcut': 'woodcut print, old book illustration, black and white, ink lines',
            'woodcut': 'woodcut print, old book illustration, black and white, ink lines',
            'pixel': 'pixel art, 16-bit, retro game asset',
            'simple_icon': 'simple vector icon, flat design, minimal, white background, high contrast, symbol'
        };

        const styleKeywords = styles[style] || '';

        // Use Pollinations.ai (Free, No API Key)
        // We add "isolated on white background" to make removal easier
        // Truncate visualPrompt to avoid URL length issues (keep first 400 chars)
        const safePrompt = visualPrompt.substring(0, 400);
        const enhancedPrompt = encodeURIComponent(`${safePrompt}, ${styleKeywords}, fantasy art style, d&d item, isolated on pure white background, no background, simple background, studio lighting, high quality, 8k, realistic texture`);

        // Construct URL based on selected model
        let modelParam = `model=${model}`;
        // Midjourney style is just a prompt tweak + flux usually, but Pollinations has a 'midjourney' model alias sometimes, 
        // or we can just use flux with specific keywords. 
        // For now, we'll pass the model parameter directly as Pollinations supports 'flux', 'turbo', etc.

        const imageUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=512&height=512&${modelParam}&seed=${Math.floor(Math.random() * 10000)}`;
        console.log(`GeminiService: Fetching image from (${model}) with style (${style})`, imageUrl);

        try {
            // Fetch with 30s timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(imageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`${model} generation failed: ${response.status}`);

            const blob = await response.blob();
            return await this.removeWhiteBackground(blob);

        } catch (error) {
            console.warn("FLUX Image Generation Error, trying default model:", error);

            // Fallback to default model
            const defaultUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
            console.log("GeminiService: Fetching image from (Default)", defaultUrl);

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                const response = await fetch(defaultUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Default generation failed: ${response.status}`);

                const blob = await response.blob();
                return await this.removeWhiteBackground(blob);
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
}
