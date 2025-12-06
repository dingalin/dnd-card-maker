import { getRarityFromLevel } from '../utils.js';
import GeminiService from '../gemini-service.js';

export class GeneratorController {
    constructor(stateManager, uiManager, previewManager) {
        this.state = stateManager;
        this.ui = uiManager;
        this.preview = previewManager;
        this.gemini = null;

        // Bind methods
        this.onGenerate = this.onGenerate.bind(this);
        this.onRegenerateImage = this.onRegenerateImage.bind(this);
        this.onRegenerateStats = this.onRegenerateStats.bind(this);
        this.onGenerateBackground = this.onGenerateBackground.bind(this);

        this.setupListeners();
    }

    setupListeners() {
        const form = document.getElementById('generator-form');
        const regenImageBtn = document.getElementById('regen-image-btn');
        const regenStatsBtn = document.getElementById('regen-stats-btn');
        const generateBgBtn = document.getElementById('generate-bg-btn');

        if (form) form.addEventListener('submit', this.onGenerate);
        if (regenImageBtn) regenImageBtn.addEventListener('click', this.onRegenerateImage);
        if (regenStatsBtn) regenStatsBtn.addEventListener('click', this.onRegenerateStats);
        if (generateBgBtn) generateBgBtn.addEventListener('click', this.onGenerateBackground);
    }

    getApiKey() {
        const input = document.getElementById('api-key');
        if (!input || !input.value.trim()) {
            this.ui.showToast('נא להזין מפתח API', 'warning');
            return null;
        }
        const key = input.value.trim();
        localStorage.setItem('gemini_api_key', key);
        return key;
    }

    async onGenerate(e) {
        e.preventDefault();
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        this.gemini = new GeminiService(apiKey);
        this.ui.showLoading();
        this.preview.updateProgress(0, 5, 'מתחיל...');

        try {
            const formData = new FormData(e.target);

            // Read Sticky Note (Source of Truth)
            const noteLevel = document.getElementById('note-level');
            const noteType = document.getElementById('note-type');
            const noteSubtype = document.getElementById('note-subtype');

            const type = noteType?.dataset.value || formData.get('type');
            const subtype = noteSubtype?.dataset.value || formData.get('subtype');
            const level = noteLevel?.dataset.value || formData.get('level');
            const ability = formData.get('ability');

            let finalType = type;
            if (subtype) finalType = `${type} - ${subtype}`;
            if (type === 'armor' && !finalType.toLowerCase().includes('armor')) finalType += ' Armor';

            const rarity = getRarityFromLevel(level);

            // 1. Context
            const currentState = this.state.getState();
            const contextImage = currentState.lastContext;
            if (contextImage) this.preview.updateProgress(1, 15, 'מעבד תמונה...');

            // 2. Random Subtype
            let finalSubtype = subtype;
            if (!finalSubtype && window.OFFICIAL_ITEMS[type]) {
                const categories = window.OFFICIAL_ITEMS[type];
                const allSubtypes = [];
                for (const cat in categories) {
                    if (Array.isArray(categories[cat])) allSubtypes.push(...categories[cat]);
                }
                if (allSubtypes.length > 0) {
                    finalSubtype = allSubtypes[Math.floor(Math.random() * allSubtypes.length)];
                }
            }

            // 3. Generate Text
            this.preview.updateProgress(2, 30, 'כותב סיפור...');
            const itemDetails = await this.gemini.generateItemDetails(level, type, finalSubtype, rarity, ability, contextImage);

            // Manual Overrides
            const attunement = document.getElementById('attunement');
            itemDetails.requiresAttunement = attunement ? attunement.checked : false;

            if (type === 'weapon') {
                const dmg = document.getElementById('weapon-damage')?.value;
                const type = document.getElementById('damage-type')?.value;
                if (dmg) itemDetails.weaponDamage = dmg;
                if (type) itemDetails.damageType = type;
            } else if (type === 'armor') {
                const ac = document.getElementById('armor-class')?.value;
                if (ac) itemDetails.armorClass = ac;
            }

            // Custom Prompt
            const customPrompt = document.getElementById('custom-visual-prompt');
            if (customPrompt && customPrompt.value.trim()) {
                console.log('Using custom prompt:', customPrompt.value);
                itemDetails.visualPrompt = customPrompt.value.trim();
            }

            // 4. Generate Image
            this.preview.updateProgress(3, 60, 'מצייר...');
            const imageUrl = await this.generateImage(itemDetails.visualPrompt);

            // 5. Save & Render
            const newCardData = {
                ...itemDetails,
                gold: itemDetails.gold || '1000',
                imageUrl: imageUrl,
                originalParams: { level, type, subtype: finalSubtype, rarity, ability }
            };

            this.state.setCardData(newCardData);
            this.state.saveCurrentCard();
            this.state.saveToHistory();

            this.preview.updateProgress(4, 100, 'מוכן!');
            await new Promise(r => setTimeout(r, 500));
            this.ui.hideLoading();
            this.preview.resetProgress();

        } catch (error) {
            console.error(error);
            this.ui.hideLoading();
            this.ui.showToast(error.message, 'error');
        }
    }

    async onRegenerateImage() {
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        const currentState = this.state.getState();
        if (!currentState.cardData) return;

        const btn = document.getElementById('regen-image-btn');
        if (btn) btn.disabled = true;

        try {
            this.gemini = new GeminiService(apiKey);

            // Custom Prompt Check
            const customPrompt = document.getElementById('custom-visual-prompt');
            let prompt = currentState.cardData.visualPrompt;
            if (customPrompt && customPrompt.value.trim()) {
                prompt = customPrompt.value.trim();
            }

            const imageUrl = await this.generateImage(prompt);

            const newCardData = {
                ...currentState.cardData,
                imageUrl: imageUrl
            };

            this.state.setCardData(newCardData);
            this.ui.showToast('תמונה חדשה נוצרה!', 'success');

        } catch (error) {
            console.error(error);
            this.ui.showToast('שגיאה ביצירת תמונה', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async onRegenerateStats() {
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        const currentState = this.state.getState();
        if (!currentState.cardData) return;

        const btn = document.getElementById('regen-stats-btn');
        if (btn) btn.disabled = true;

        try {
            this.gemini = new GeminiService(apiKey);
            const params = currentState.cardData.originalParams || {};

            // Helper to get element data
            const getVal = (id) => document.getElementById(id)?.dataset.value;
            const level = getVal('note-level') || params.level || '1-4';
            const type = getVal('note-type') || params.type || 'wondrous';
            const subtype = getVal('note-subtype') || params.subtype || '';
            const rarity = getRarityFromLevel(level);

            const itemDetails = await this.gemini.generateItemDetails(level, type, subtype, rarity, params.ability || '', currentState.lastContext);

            const newCardData = {
                ...itemDetails,
                gold: itemDetails.gold || '1000',
                imageUrl: currentState.cardData.imageUrl,
                originalParams: params
            };

            this.state.setCardData(newCardData);
            this.ui.showToast('תכונות חדשות נוצרו!', 'success');
        } catch (error) {
            console.error(error);
            this.ui.showToast('שגיאה ביצירת תכונות', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async onGenerateBackground() {
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        const btn = document.getElementById('generate-bg-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'מייצר...';
        }

        try {
            this.gemini = new GeminiService(apiKey);
            const theme = document.getElementById('bg-theme-select')?.value || 'Fire';
            const getImgKey = document.getElementById('getimg-api-key')?.value.trim() || '';

            const bgUrl = await this.gemini.generateCardBackground(theme, getImgKey);

            if (window.cardRenderer) {
                await window.cardRenderer.setTemplate(bgUrl);
                this.state.notify('cardData');
            }
            this.ui.showToast('רקע חדש נוצר!', 'success');
        } catch (error) {
            this.ui.showToast('שגיאה ביצירת רקע', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'צור רקע';
            }
        }
    }

    async generateImage(prompt) {
        const model = document.getElementById('image-model')?.value || 'flux';
        const style = document.getElementById('image-style')?.value || 'realistic';
        const styleOption = document.getElementById('image-style-option')?.value || 'natural';
        const color = document.getElementById('image-bg-color')?.value || '#ffffff';

        if (model.startsWith('getimg-')) {
            const key = document.getElementById('getimg-api-key')?.value.trim();
            if (!key) throw new Error("חסר מפתח GetImg API");
            localStorage.setItem('getimg_api_key', key);
            return await this.gemini.generateImageGetImg(prompt, model, style, key, styleOption, color);
        } else {
            return await this.gemini.generateItemImage(prompt, model, style, styleOption, color);
        }
    }
}
