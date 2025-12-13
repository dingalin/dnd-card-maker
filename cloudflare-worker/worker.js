/**
 * Cloudflare Worker - API Proxy for DnD Card Creator
 * 
 * This worker protects your API keys by:
 * 1. Requiring a password to access
 * 2. Storing API keys as environment variables (secrets)
 * 3. Proxying requests to Gemini/GetImg APIs
 */

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // Only allow POST
        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        try {
            const body = await request.json();
            const { password, action, data } = body;

            // Check password
            if (password !== env.ACCESS_PASSWORD) {
                return jsonResponse({ error: 'Invalid password' }, 401);
            }

            // Route to appropriate handler
            switch (action) {
                case 'gemini-generate':
                    return await handleGeminiGenerate(data, env.GEMINI_API_KEY);

                case 'getimg-generate':
                    return await handleGetImgGenerate(data, env.GETIMG_API_KEY);

                case 'imagen-generate':
                    return await handleImagenGenerate(data, env.GEMINI_API_KEY);

                default:
                    return jsonResponse({ error: 'Unknown action' }, 400);
            }

        } catch (error) {
            return jsonResponse({ error: error.message }, 500);
        }
    },
};

// Gemini API Handler
async function handleGeminiGenerate(data, apiKey) {
    const { model, contents, generationConfig } = data;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig }),
    });

    const result = await response.json();
    return jsonResponse(result);
}

// GetImg API Handler
async function handleGetImgGenerate(data, apiKey) {
    const { prompt, model, width, height, steps, output_format, response_format } = data;

    const response = await fetch('https://api.getimg.ai/v1/flux-schnell/text-to-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            prompt,
            model: model || 'flux-schnell',
            width: width || 512,
            height: height || 512,
            steps: steps || 4,
            output_format: output_format || 'jpeg',
            response_format: response_format || 'b64'
        }),
    });

    const result = await response.json();
    return jsonResponse(result, response.status);
}

// Imagen 3 API Handler
async function handleImagenGenerate(data, apiKey) {
    const { prompt, aspectRatio } = data;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
                sampleCount: 1,
                aspectRatio: aspectRatio || "3:4",
                safetyFilterLevel: "BLOCK_MEDIUM_AND_ABOVE",
                personGeneration: "ALLOW_ADULT"
            }
        }),
    });

    const result = await response.json();

    // Extract the base64 image from the response
    if (result.predictions && result.predictions[0] && result.predictions[0].bytesBase64Encoded) {
        return jsonResponse({ image: result.predictions[0].bytesBase64Encoded });
    } else if (result.error) {
        return jsonResponse({ error: result.error.message || 'Imagen generation failed' }, response.status);
    } else {
        return jsonResponse({ error: 'No image generated' }, 500);
    }
}

// Helper function
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
