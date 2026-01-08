/**
 * ImageGenerator - Handles image generation using GetImg/FLUX
 * Extracted from GeminiService for better code organization
 */

import { API } from '../../config/index';
// @ts-ignore
import { BlobURLRegistry } from '../blob-registry';
// @ts-ignore
import { FLUX_STYLE_CONFIGS, getColorName, getElementalEnhancement, getRarityQuality, FluxStyleConfig } from '../style-configs';
import { GeminiConfig } from '../../types/api';

// Cloudflare Worker URL for secure API access
const WORKER_URL = API.WORKER_URL;

interface ItemEnhancement {
    itemTypeEnhancement: string;
    compositionGuide: string;
}

/**
 * Generate item image using GetImg/FLUX
 * Optimized for fantasy items with smart background matching
 */
export async function generateImageGetImg(
    geminiConfig: GeminiConfig,
    visualPrompt: string,
    model: string,
    style: string,
    getImgApiKey: string,
    styleOption: string = 'natural',
    userColor: string = '#ffffff',
    colorDescription: string | null = null,
    templateImageUrl: string | null = null,
    detectTemplateTheme: ((url: string) => Promise<string>) | null = null,
    abilityDesc: string = '',
    itemSubtype: string = ''
): Promise<string> {
    const { password } = geminiConfig;

    let styleConfig: FluxStyleConfig = FLUX_STYLE_CONFIGS[style] || FLUX_STYLE_CONFIGS['realistic'];

    // Fix for studio artifacts: If 'no-background' is selected, override the 'realistic' style 
    // to avoid "softbox lighting" and "studio setup" which cause artifacts.
    if (styleOption === 'no-background' && (style === 'realistic' || !style)) {
        styleConfig = {
            primary: 'high quality 3D render, photorealistic digital art, sharp detail',
            technique: 'neutral lighting, ambient occlusion, ray tracing, sharp focus, digital clear style',
            finish: 'high resolution, 8k, unreal engine 5 style, clean finish'
        };
    }

    // Use the smart color description if provided, otherwise fall back to hex lookup
    const colorName = colorDescription || getColorName(userColor);

    // Combine visualPrompt and abilityDesc to detect elemental effects
    // This ensures abilities like "נזק ברק" show lightning in the image
    const combinedPromptForElements = `${visualPrompt} ${abilityDesc}`;
    const elementalEnhancement = getElementalEnhancement(combinedPromptForElements);
    const rarityQuality = getRarityQuality(visualPrompt);

    // === ITEM TYPE DETECTION & SPECIALIZED PROMPTS ===
    // PRIORITY: itemSubtype comes FIRST to ensure correct item type
    // This prevents AI's visualPrompt from overriding the actual item type
    const promptForTypeDetection = itemSubtype
        ? `${itemSubtype} ${visualPrompt}`
        : visualPrompt;
    const { itemTypeEnhancement, compositionGuide } = getItemTypeEnhancement(promptForTypeDetection);

    // === BACKGROUND CONFIGURATION ===
    const backgroundPrompt = await buildBackgroundPrompt(
        styleOption,
        colorName,
        templateImageUrl,
        detectTemplateTheme
    );

    // === BUILD FINAL OPTIMIZED PROMPT ===
    let compositionInstructions = 'isolated single item floating in air, item fills two-thirds of image frame with generous space around, complete item fully visible, shot with 85mm lens at f/2.8, shallow depth of field, sharp focus on item, centered composition';

    // Fix for no-background mode: remove photography terms that trigger studio equipment generation
    if (styleOption === 'no-background') {
        compositionInstructions = 'isolated single item floating in air, item fills two-thirds of image frame, complete item fully visible, sharp focus on item, centered composition, 3D render style, clean edges';
    }

    const finalPrompt = [
        styleConfig.primary,
        styleConfig.technique,
        visualPrompt,
        itemTypeEnhancement,
        compositionGuide,
        compositionInstructions,
        elementalEnhancement,
        rarityQuality,
        backgroundPrompt,
        styleConfig.finish
    ].filter(Boolean).join(', ');

    console.log(`🎨 ImageGenerator (GetImg/FLUX): Style=${style}, Option=${styleOption}`);
    console.log(`📝 Optimized Prompt: "${finalPrompt.substring(0, 150)}..."`);

    // Handle FAL Z-Image model (lower resolution for cost savings)
    if (model === 'fal-zimage') {
        return generateWithFal(password!, finalPrompt);
    }

    // Handle Z-Image model (Kie.ai)
    if (model === 'getimg-zimage') {
        return generateWithZImage(password!, finalPrompt);
    }

    // Handle FLUX/Seedream via GetImg
    let endpoint = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';
    if (model === 'getimg-seedream') {
        endpoint = 'https://api.getimg.ai/v1/seedream-v4/text-to-image';
    }

    const body = {
        prompt: finalPrompt,
        response_format: 'b64'
    };

    // Use Worker proxy if not a direct API key
    const useWorkersForGetImg = !getImgApiKey.startsWith('key-');

    if (useWorkersForGetImg) {
        return generateViaWorker(password!, finalPrompt, model);
    }

    // Direct API call
    return generateDirect(endpoint, getImgApiKey, body);
}

// Get item type enhancement based on visual prompt
function getItemTypeEnhancement(visualPrompt: string): ItemEnhancement {
    const promptLower = visualPrompt.toLowerCase();
    let itemTypeEnhancement = '';
    let compositionGuide = '';

    // WEAPONS
    if (promptLower.includes('axe') || promptLower.includes('גרזן') || promptLower.includes('hatchet')) {
        itemTypeEnhancement = 'formidable battle axe weapon, heavy curved axe head, thick wooden or metal handle, single or double-headed axe design, chopping weapon';
        compositionGuide = 'angled view showing the distinctive axe head shape';
    } else if (promptLower.includes('sword') || promptLower.includes('blade') || promptLower.includes('חרב')) {
        itemTypeEnhancement = 'ornate fantasy sword, detailed hilt and guard, sharp glinting blade edge, intricate engravings';
        compositionGuide = 'full weapon visible from pommel to tip, angled hero pose';
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
    } else if (promptLower.includes('hammer') || promptLower.includes('פטיש') || promptLower.includes('warhammer')) {
        // HAMMER/WARHAMMER - rectangular/square head like Thor's hammer
        itemTypeEnhancement = 'heavy war hammer weapon, large rectangular metal striking head, thick sturdy handle, powerful crushing weapon, Thor-like hammer design';
        compositionGuide = 'showing the weight and impact potential of the rectangular head';
    } else if (promptLower.includes('mace') || promptLower.includes('אלה') || promptLower.includes('אלת')) {
        // MACE - round/spherical head with flanges or spikes, shorter handle
        itemTypeEnhancement = 'medieval flanged mace weapon, spherical bulbous metal head with protruding flanges, short sturdy grip handle, crushing bludgeoning weapon, morning star style';
        compositionGuide = 'showing the round flanged head with spikes or ridges';
    } else if (promptLower.includes('club')) {
        itemTypeEnhancement = 'primitive wooden club, thick heavy end, simple bludgeoning weapon';
        compositionGuide = 'showing the thick weighted end';
    } else if (promptLower.includes('sickle') || promptLower.includes('מגל')) {
        itemTypeEnhancement = 'curved harvesting sickle, sharp crescent blade, wooden handle, druidic tool';
        compositionGuide = 'showing the curved blade arc and edge';
    } else if (promptLower.includes('crossbow') || promptLower.includes('arbalet') || promptLower.includes('קשתון')) {
        itemTypeEnhancement = 'mechanical crossbow, intricate trigger mechanism, loaded bolt';
        compositionGuide = 'three-quarter view showing mechanism detail';
    } else if (promptLower.includes('blowgun') || promptLower.includes('נשיפה') || promptLower.includes('dart') || promptLower.includes('חיצים')) {
        itemTypeEnhancement = 'primitive blowgun hunting weapon, long hollow bamboo tube, tribal decorations, small poison darts nearby, simple ranged weapon';
        compositionGuide = 'horizontal layout showing full length of tube, item displayed on stand, product photography';
    }

    // ARMOR
    else if (promptLower.includes('chain') || promptLower.includes('שרשראות')) {
        itemTypeEnhancement = 'medieval chainmail armor, interlocking metal rings, protective mail hauberk, iron ring mesh, warrior torso armor, wearable body protection';
        compositionGuide = 'front torso view showing chainmail ring pattern texture';
    } else if (promptLower.includes('hide') || promptLower.includes('פרווה') || promptLower.includes('fur')) {
        itemTypeEnhancement = 'fur hide armor vest, thick animal pelt chest piece, tanned leather with brown fur trim, primitive armor item on display stand, rugged wilderness gear';
        compositionGuide = 'front view of armor piece on mannequin torso, showing fur texture';
    } else if (promptLower.includes('leather') || promptLower.includes('עור')) {
        itemTypeEnhancement = 'supple leather armor, stitched panels, reinforced shoulders, adventurer gear';
        compositionGuide = 'front view showing leather texture and straps';
    } else if (promptLower.includes('scale') || promptLower.includes('קשקשים')) {
        itemTypeEnhancement = 'overlapping metal scale armor, fish-scale pattern, protective scales, dragon-like mail';
        compositionGuide = 'front view showing scale pattern and metallic sheen';
    } else if (promptLower.includes('armor') || promptLower.includes('plate') || promptLower.includes('שריון') || promptLower.includes('צלחות')) {
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

    // Default
    if (!itemTypeEnhancement) {
        itemTypeEnhancement = 'detailed fantasy item, magical craftsmanship, mystical properties';
        compositionGuide = 'centered product shot, clear details visible';
    }

    return { itemTypeEnhancement, compositionGuide };
}

// Build background prompt based on style option
async function buildBackgroundPrompt(
    styleOption: string,
    colorName: string,
    templateImageUrl: string | null,
    detectTemplateTheme: ((url: string) => Promise<string>) | null
): Promise<string> {
    console.log(`🎨 FLUX Background: styleOption=${styleOption}, colorName=${colorName}`);

    if (styleOption === 'no-background') {
        return 'isolated on solid white background, pure white background, simple flat white background, floating in air, shadowless, completely empty background, object isolation';
    } else if (styleOption === 'colored-background') {
        return `isolated on ${colorName} gradient background, soft ambient glow, ${colorName} color tones`;
    } else {
        // 'natural' mode - item in sharp focus with THEME-AWARE bokeh background
        let cardTheme = 'Nature';

        if (templateImageUrl && detectTemplateTheme) {
            try {
                cardTheme = await detectTemplateTheme(templateImageUrl);
            } catch (_e) {
                // eslint-disable-next-line no-unused-vars
                console.warn('ImageGenerator: Failed to sample background color', _e);
                const bgThemeSelect = document.getElementById('bg-theme-select') as HTMLSelectElement | null;
                cardTheme = bgThemeSelect?.value || 'Nature';
            }
        } else {
            const bgThemeSelect = document.getElementById('bg-theme-select') as HTMLSelectElement | null;
            cardTheme = bgThemeSelect?.value || 'Nature';
        }

        const themedNaturalBackgrounds: { [key: string]: string } = {
            'Fire': 'sharp focused item in foreground, blurred volcanic landscape background, molten lava bokeh, ember particles floating, warm orange-red ambient glow, shallow depth of field, fiery atmosphere',
            'Nature': 'sharp focused item in foreground, beautiful blurred bokeh nature background, forest leaves and sunlight bokeh, shallow depth of field, dreamy soft background blur, natural outdoor lighting, fantasy forest atmosphere',
            'Arcane': 'sharp focused item in foreground, mystical purple fog bokeh background, floating magical particles, ethereal blue-purple ambient glow, shallow depth of field, arcane energy wisps blurred',
            'Divine': 'sharp focused item in foreground, heavenly golden light bokeh background, radiant sunbeams, warm white celestial glow, shallow depth of field, blessed atmosphere, soft clouds blurred',
            'Necrotic': 'sharp focused item in foreground, eerie graveyard fog bokeh background, ghostly green wisps, dark shadows, shallow depth of field, haunted atmosphere, spectral mist blurred',
            'Ice': 'sharp focused item in foreground, blurred snowy mountain background, ice crystal bokeh, frozen blue ambient glow, shallow depth of field, winter frost atmosphere, snowflakes floating',
            'Lightning': 'sharp focused item in foreground, stormy sky bokeh background, electric blue lightning flashes blurred, crackling energy atmosphere, shallow depth of field, thunderstorm ambiance',
            'Ocean': 'sharp focused item in foreground, underwater caustic light bokeh background, floating bubbles, deep blue-turquoise ambient glow, shallow depth of field, marine atmosphere',
            'Shadow': 'sharp focused item in foreground, dark void bokeh background, creeping shadow wisps, deep purple-black ambient, shallow depth of field, mysterious darkness atmosphere',
            'Celestial': 'sharp focused item in foreground, cosmic starfield bokeh background, nebula colors blurred, twinkling stars, shallow depth of field, infinite cosmos atmosphere',
            'Blood': 'sharp focused item in foreground, dark crimson fog bokeh background, floating blood mist, deep red ambient glow, shallow depth of field, violent dramatic atmosphere',
            'Industrial': 'sharp focused item in foreground, steampunk factory bokeh background, steam clouds blurred, copper-brass ambient glow, shallow depth of field, mechanical workshop atmosphere',
            'Iron': 'sharp focused item in foreground, forge fire bokeh background, molten metal sparks floating, warm iron-red glow, shallow depth of field, blacksmith workshop atmosphere',
            'Old Scroll': 'sharp focused item in foreground, ancient library bokeh background, dust motes floating, warm candlelight amber glow, shallow depth of field, scholarly atmosphere',
            'Elemental': 'sharp focused item in foreground, swirling elemental chaos bokeh background, multi-colored primal energy, rainbow ambient glow, shallow depth of field, raw elemental power atmosphere'
        };

        console.log(`🎨 AI-detected theme for natural background: ${cardTheme}`);
        return themedNaturalBackgrounds[cardTheme] || themedNaturalBackgrounds['Nature'];
    }
}

// Generate image via FAL Z-Image (lower resolution for cost savings)
async function generateWithFal(password: string, finalPrompt: string): Promise<string> {
    console.log('🖼️ Using FAL Z-Image Turbo (512x512 for items)');

    try {
        const truncatedPrompt = finalPrompt.length > 1000
            ? finalPrompt.substring(0, 997) + '...'
            : finalPrompt;

        console.log(`FAL Z-Image prompt length: ${truncatedPrompt.length} chars`);

        const data = await callViaWorker(password, 'fal-zimage', {
            prompt: truncatedPrompt,
            image_size: 'square',  // 512x512 - cheaper than square_hd (1024x1024)
            num_inference_steps: 8,
            output_format: 'jpeg'
        });

        if (data.image) {
            const imageUrl = `data:image/jpeg;base64,${data.image}`;
            const blob = await (await fetch(imageUrl)).blob();
            return BlobURLRegistry.register(URL.createObjectURL(blob));
        } else if (data.error) {
            throw new Error(data.error);
        }
        throw new Error("No image returned from FAL Z-Image");
    } catch (error) {
        console.error('FAL Z-Image Error:', error);
        throw error;
    }
}

// Generate image via Z-Image (Kie.ai)
async function generateWithZImage(password: string, finalPrompt: string): Promise<string> {
    console.log('🖼️ Using Z-Image Turbo via Kie.ai');

    try {
        const truncatedPrompt = finalPrompt.length > 1000
            ? finalPrompt.substring(0, 997) + '...'
            : finalPrompt;

        console.log(`Z-Image prompt length: ${truncatedPrompt.length} chars`);

        const data = await callViaWorker(password, 'kie-zimage', {
            prompt: truncatedPrompt,
            aspect_ratio: '1:1'
        });

        if (data.image) {
            const imageUrl = `data:image/jpeg;base64,${data.image}`;
            const blob = await (await fetch(imageUrl)).blob();
            return BlobURLRegistry.register(URL.createObjectURL(blob));
        } else if (data.error) {
            throw new Error(data.error);
        }
        throw new Error("No image returned from Z-Image");
    } catch (error) {
        console.error('Kie.ai Z-Image Error:', error);
        throw error;
    }
}

// Generate image via Worker proxy
async function generateViaWorker(password: string, finalPrompt: string, model: string): Promise<string> {
    console.log("ImageGenerator: Using Worker for GetImg (Proxy Mode)");

    try {
        const data = await callViaWorker(password, 'getimg-generate', {
            prompt: finalPrompt,
            model: model,
            response_format: 'b64'
        });

        if (data.image) {
            const imageUrl = `data:image/jpeg;base64,${data.image}`;
            const blob = await (await fetch(imageUrl)).blob();
            return BlobURLRegistry.register(URL.createObjectURL(blob));
        } else if (data.error) {
            const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
            console.error("GetImg API Error Details:", data.error);
            throw new Error(errorMsg);
        } else {
            console.error("Unexpected response from Worker:", data);
            throw new Error("Worker did not return an image");
        }
    } catch (workerError: any) {
        const errorMsg = workerError.message || JSON.stringify(workerError);
        console.error("GetImg Proxy Error:", errorMsg);
        throw new Error(`GetImg Error: ${errorMsg}`);
    }
}

// Generate image via direct API call
async function generateDirect(endpoint: string, getImgApiKey: string, body: any): Promise<string> {
    console.log(`ImageGenerator: Generating with Getimg.ai`, endpoint);

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
        return BlobURLRegistry.register(URL.createObjectURL(blob));

    } catch (error) {
        console.error("GetImg Generation failed:", error);
        throw error;
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

export default { generateImageGetImg };
