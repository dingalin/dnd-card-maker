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

                case 'kie-zimage':
                    return await handleKieZImage(data, env.KIE_API_KEY);

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

// GetImg API Handler - Supports multiple models (FLUX, Z-Image, Seedream)
async function handleGetImgGenerate(data, apiKey) {
    const { prompt, model, width, height, steps, output_format, response_format, endpoint } = data;

    // Determine which endpoint and model to use
    let apiEndpoint = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';
    let modelName = null;  // For FLUX endpoints, model is in the URL path

    if (endpoint) {
        // Use provided endpoint directly
        apiEndpoint = endpoint;
    } else if (model === 'getimg-zimage' || model === 'z-image-turbo') {
        // Z-Image uses stable-diffusion endpoint with model in body
        apiEndpoint = 'https://api.getimg.ai/v1/stable-diffusion/text-to-image';
        modelName = 'z-image-turbo';
    } else if (model === 'seedream-v4' || model === 'getimg-seedream') {
        apiEndpoint = 'https://api.getimg.ai/v1/seedream-v4/text-to-image';
    }
    // For FLUX (default), modelName stays null and endpoint has model in path

    console.log(`GetImg Worker: Using endpoint ${apiEndpoint}${modelName ? ` with model ${modelName}` : ''}`);

    // Build body - different parameters for different endpoints
    let body;

    if (modelName) {
        // Stable-diffusion endpoint (for Z-Image Turbo - fast model, only 4-8 steps)
        body = {
            model: modelName,
            prompt,
            width: width || 1024,
            height: height || 1024,
            steps: 4,  // Z-Image Turbo is fast, only needs 4-8 steps
            guidance: 3.5
        };
    } else {
        // FLUX endpoint
        body = {
            prompt,
            width: width || 512,
            height: height || 512,
            steps: steps || 4,
            output_format: output_format || 'jpeg',
            response_format: response_format || 'b64'
        };
    }

    const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    const result = await response.json();
    return jsonResponse(result, response.status);
}

// Imagen 3 API Handler
async function handleImagenGenerate(data, apiKey) {
    const { prompt, aspectRatio, model } = data;

    // Use predict endpoint (correct method for Imagen 3)
    const modelName = model || 'imagen-3.0-generate-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

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

    if (!response.ok) {
        return jsonResponse({ error: `Imagen Error (${response.status}): ${result.error?.message || response.statusText}` }, response.status);
    }

    // Extract the base64 image from the new format (generatedImages)
    if (result.generatedImages && result.generatedImages[0] && result.generatedImages[0].image) {
        return jsonResponse({ image: result.generatedImages[0].image.imageBytes });
    }
    // Fallback to old format (predictions)
    else if (result.predictions && result.predictions[0] && result.predictions[0].bytesBase64Encoded) {
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

// Kie.ai Z-Image Handler (async API with polling)
async function handleKieZImage(data, apiKey) {
    const { prompt, aspect_ratio } = data;

    if (!apiKey) {
        return jsonResponse({ error: 'KIE_API_KEY not configured' }, 500);
    }

    // Step 1: Create task
    // Use 3:4 aspect ratio for smaller image size (faster generation + less storage)
    const requestBody = {
        model: 'z-image',
        input: {
            prompt,
            aspect_ratio: aspect_ratio || '3:4'  // 3:4 is smaller than 1:1
        }
    };

    console.log('Kie.ai: Creating task with body:', JSON.stringify(requestBody));

    const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    });

    const createResult = await createResponse.json();
    console.log('Kie.ai: Create response:', JSON.stringify(createResult));

    if (createResult.code !== 200 || !createResult.data?.taskId) {
        const errorDetail = JSON.stringify(createResult);
        return jsonResponse({ error: `Kie task creation failed: ${errorDetail}` }, 400);
    }

    const taskId = createResult.data.taskId;
    console.log(`Kie.ai: Created task ${taskId}`);

    // Step 2: Poll for result (max 60 seconds)
    // Adaptive polling: start fast (500ms), slow down over time to reduce API calls
    const maxAttempts = 60;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Adaptive polling: 500ms for first 5 attempts, then 1000ms
        const pollInterval = attempt < 5 ? 500 : 1000;
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        // Use recordInfo endpoint for querying Market model task status
        const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        const statusResult = await statusResponse.json();
        console.log(`Kie.ai: Poll attempt ${attempt + 1}, state: ${statusResult.data?.state}`);

        if (statusResult.data?.state === 'success') {
            // Log the full response for debugging
            console.log('Kie.ai: Success response data:', JSON.stringify(statusResult.data));

            try {
                // Try to parse resultJson if it's a string
                let resultData = statusResult.data.resultJson;
                if (typeof resultData === 'string') {
                    resultData = JSON.parse(resultData);
                }

                console.log('Kie.ai: Parsed result:', JSON.stringify(resultData));

                // Try different possible image URL locations
                const imageUrl = resultData?.resultUrls?.[0]
                    || resultData?.imageUrl
                    || resultData?.url
                    || resultData?.image;

                if (imageUrl) {
                    console.log('Kie.ai: Found image URL:', imageUrl);
                    // Fetch the image and convert to base64
                    const imageResponse = await fetch(imageUrl);
                    const imageArrayBuffer = await imageResponse.arrayBuffer();

                    // Convert to base64 in chunks to avoid stack overflow
                    const bytes = new Uint8Array(imageArrayBuffer);
                    let binary = '';
                    const chunkSize = 8192;
                    for (let i = 0; i < bytes.length; i += chunkSize) {
                        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
                        binary += String.fromCharCode.apply(null, chunk);
                    }
                    const base64 = btoa(binary);

                    return jsonResponse({ image: base64 });
                } else {
                    // Maybe the image is directly in the response
                    console.log('Kie.ai: No URL found, full result:', JSON.stringify(statusResult));
                    return jsonResponse({ error: `No image URL in response: ${JSON.stringify(resultData)}` }, 500);
                }
            } catch (parseError) {
                console.log('Kie.ai: Parse error:', parseError.message);
                return jsonResponse({ error: `Failed to parse Kie result: ${parseError.message}, data: ${JSON.stringify(statusResult.data)}` }, 500);
            }
        } else if (statusResult.data?.state === 'fail') {
            return jsonResponse({ error: statusResult.data.failMsg || 'Kie task failed' }, 500);
        }
        // Still processing, continue polling
    }

    return jsonResponse({ error: 'Kie task timeout (60s)' }, 504);
}
