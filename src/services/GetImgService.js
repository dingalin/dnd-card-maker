export class GetImgService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        // User provided proxy:
        this.baseUrl = 'https://dnd-api-proxy.dingalin2000.workers.dev';
    }

    async generateImage(prompt, options = {}) {
        // The worker expects a single endpoint
        const endpoint = this.baseUrl;

        // Construct the payload expected by the worker (Action-Based)
        const workerPayload = {
            password: this.apiKey, // User enters the Proxy Password
            action: 'getimg-generate',
            data: {
                prompt: prompt,
                width: 1024,
                height: 1024,
                steps: 4,
                response_format: 'b64',
                ...options
            }
        };

        console.log("GetImgService: Sending to Worker...", { action: 'getimg-generate' });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workerPayload)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Worker Error: ${response.status}`);
        }

        const data = await response.json();

        // The worker returns the GetImg response directly. 
        // GetImg returns { image: "base64..." } (singular) or { images: [] }? 
        // Flux via GetImg usually returns { image: "..." } or { images: [...] }.
        // Let's check the worker: result = await response.json(); return jsonResponse(result);
        // GetImg API: POST /v1/flux-schnell/text-to-image returns JSON.
        // If response_format='b64', it returns { image: "..." }.

        if (data.error) throw new Error(data.error);
        return data.image || data.images?.[0]; // Handle both cases just to be safe
    }
}
