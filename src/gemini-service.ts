// @ts-nocheck
/**
 * GeminiService - Facade for all AI-powered generation services
 *
 * REFACTORED: Dec 2024
 * This file now serves as a facade/wrapper that maintains backwards compatibility
 * while delegating to specialized modules:
 * - ItemGenerator.js - generateItemDetails
 * - ImageGenerator.js - generateImageGetImg
 * - BackgroundGenerator.js - generateCardBackground
 * - LayoutAnalyzer.js - detectTemplateTheme, analyzeCardLayout
 *
 * Image generation uses GetImg/FLUX exclusively.
 * Item generation uses BOUNDARIES approach - AI has creative freedom within defined limits.
 */

console.log("GeminiService module loaded (Refactored Version)");

// Import extracted modules
import { BlobURLRegistry } from './services/blob-registry.ts';
import { FLUX_STYLE_CONFIGS, getColorName, getElementalEnhancement, getRarityQuality } from './services/style-configs.ts';

// Import new modular services
import { generateItemDetails as _generateItemDetails, generateVisualPromptOnly as _generateVisualPromptOnly } from './services/gemini/ItemGenerator.ts';
import { generateImageGetImg as _generateImageGetImg } from './services/gemini/ImageGenerator.ts';
import { generateCardBackground as _generateCardBackground } from './services/gemini/BackgroundGenerator.ts';
import { detectTemplateTheme as _detectTemplateTheme, analyzeCardLayout as _analyzeCardLayout } from './services/gemini/LayoutAnalyzer.ts';

// Re-export for backwards compatibility
export { BlobURLRegistry, FLUX_STYLE_CONFIGS, getColorName, getElementalEnhancement, getRarityQuality };

// Cloudflare Worker URL for secure API access
const WORKER_URL = "https://dnd-api-proxy.dingalin2000.workers.dev/";

export interface GeminiConfig {
    apiKey?: string;
    password?: string;
    useWorker: boolean;
    baseUrl: string;
}

/**
 * GeminiService class - Facade pattern maintaining original API
 * All methods delegate to specialized modules while preserving the same interface
 */
export default class GeminiService {
    private apiKey?: string;
    private password?: string;
    private useWorker: boolean;
    private baseUrl: string;

    constructor(apiKeyOrPassword: string) {
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
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
    }

    /**
     * Get configuration object for module calls
     */
    _getConfig(): GeminiConfig {
        return {
            apiKey: this.apiKey,
            password: this.password,
            useWorker: this.useWorker,
            baseUrl: this.baseUrl
        };
    }

    /**
     * Helper method to call through Worker
     */
    async callViaWorker(action: string, data: any): Promise<any> {
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

    /**
     * Detect the theme of a card template using Gemini Vision
     * @param {string} templateImageUrl - URL or base64 of the template image
     * @returns {Promise<string>} - Detected theme (e.g., 'Fire', 'Ocean', 'Arcane')
     */
    async detectTemplateTheme(templateImageUrl: string): Promise<string> {
        return _detectTemplateTheme(this._getConfig(), templateImageUrl);
    }

    /**
     * Generate D&D item details using AI
     * Uses BOUNDARIES approach - AI has creative freedom within defined limits
     */
    async generateItemDetails(level: string, type: string, subtype: string, rarity: string, ability: string, contextImage: any = null, complexityMode: string = 'creative', locale: string = 'he') {
        return _generateItemDetails(
            this._getConfig(),
            level,
            type,
            subtype,
            rarity,
            ability,
            contextImage,
            complexityMode,
            locale
        );
    }

    /**
     * Generate only a visual prompt for image generation (no item details)
     */
    async generateVisualPromptOnly(type: string, subtype: string, rarity: string, ability: string, locale: string = 'he'): Promise<string> {
        return _generateVisualPromptOnly(
            this._getConfig(),
            type,
            subtype,
            rarity,
            ability,
            locale
        );
    }

    /**
     * Generate item image using GetImg/FLUX
     * Optimized for fantasy items with smart background matching
     */
    async generateImage(visualPrompt: string, model: string, style: string, getImgApiKey: string, styleOption: string = 'natural', userColor: string = '#ffffff', colorDescription: string | null = null, templateImageUrl: string | null = null, abilityDesc: string = '', itemSubtype: string = '') {
        // Create a bound detectTemplateTheme function for the ImageGenerator
        const detectTheme = (url: string) => this.detectTemplateTheme(url);

        return _generateImageGetImg(
            this._getConfig(),
            visualPrompt,
            model,
            style,
            getImgApiKey,
            styleOption,
            userColor,
            colorDescription,
            templateImageUrl,
            detectTheme,
            abilityDesc,
            itemSubtype
        );
    }

    /**
     * Generate card background using GetImg/FLUX or Z-Image
     */
    async generateCardBackground(theme: string, style: string = 'watercolor', getImgApiKey: string = '', model: string = 'getimg-flux') {
        return _generateCardBackground(
            this._getConfig(),
            theme,
            style,
            getImgApiKey,
            model
        );
    }

    /**
     * AI-powered layout analysis for card positioning
     */
    async analyzeCardLayout(cardImageBase64: string, contentInfo: any) {
        return _analyzeCardLayout(this._getConfig(), cardImageBase64, contentInfo);
    }
}
