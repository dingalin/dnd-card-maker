import { getRarityFromLevel, blobToBase64 } from '../utils.js';
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
        this.onSurprise = this.onSurprise.bind(this);

        this.setupListeners();
    }

    setupListeners() {
        const form = document.getElementById('generator-form');
        const regenImageBtn = document.getElementById('regen-image-btn');
        const regenStatsBtn = document.getElementById('regen-stats-btn');
        const generateBgBtn = document.getElementById('generate-bg-btn');
        const surpriseBtn = document.getElementById('surprise-btn');

        if (form) form.addEventListener('submit', this.onGenerate);
        if (regenImageBtn) regenImageBtn.addEventListener('click', this.onRegenerateImage);
        if (regenStatsBtn) regenStatsBtn.addEventListener('click', this.onRegenerateStats);
        if (generateBgBtn) generateBgBtn.addEventListener('click', this.onGenerateBackground);
        if (surpriseBtn) surpriseBtn.addEventListener('click', this.onSurprise);

        // Manual Save Button - Handled by RenderController

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
            const form = document.getElementById('generator-form');
            const formData = new FormData(form);

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
            const useVisualContext = document.getElementById('use-visual-context')?.checked;
            const currentState = this.state.getState();
            let contextImage = null;

            if (useVisualContext) {
                contextImage = currentState.lastContext;
                if (contextImage) this.preview.updateProgress(1, 15, 'מעבד תמונה...');
            }

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
            // Convert Blob URL to Base64 for persistence
            let persistentImageUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                this.preview.updateProgress(3, 80, 'שומר תמונה...');
                persistentImageUrl = await blobToBase64(imageUrl);
            }

            const newCardData = {
                ...itemDetails,
                gold: itemDetails.gold || '1000',
                imageUrl: persistentImageUrl,
                originalParams: { level, type, subtype: finalSubtype, rarity, ability }
            };

            this.state.setCardData(newCardData);
            this.state.saveCurrentCard();
            this.state.setCardData(newCardData);
            this.state.saveCurrentCard();
            // Auto-save removed: this.state.saveToHistory();

            // Enable Save Button
            const saveBtn = document.getElementById('save-gallery-btn');
            if (saveBtn) saveBtn.disabled = false;

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

            // Convert to Base64 for persistence
            let persistentImageUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                persistentImageUrl = await blobToBase64(imageUrl);
            }

            const newCardData = {
                ...currentState.cardData,
                imageUrl: persistentImageUrl
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

            // Check visual context toggle
            const useVisualContext = document.getElementById('use-visual-context')?.checked;
            const contextImage = useVisualContext ? currentState.lastContext : null;

            const itemDetails = await this.gemini.generateItemDetails(level, type, subtype, rarity, params.ability || '', contextImage);

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

            // Convert to Base64 for persistence
            let persistentBgUrl = bgUrl;
            if (bgUrl.startsWith('blob:')) {
                persistentBgUrl = await blobToBase64(bgUrl);
            }

            // Save to state so it persists in history
            this.state.updateStyle('cardBackgroundUrl', persistentBgUrl);
            if (window.cardRenderer) {
                // Ensure renderer updates immediately
                await window.cardRenderer.setTemplate(persistentBgUrl);
            }

            this.ui.showToast('רקע חדש נוצר ונשמר!', 'success');
        } catch (error) {
            this.ui.showToast('שגיאה ביצירת רקע', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'צור רקע';
            }
        }
    }

    async onSurprise(e) {
        e.preventDefault();

        const apiKey = this.getApiKey();
        if (!apiKey) return;

        // 0. Random Background
        if (window.backgroundManager) {
            this.ui.showToast('בוחר רקע אקראי...', 'info');
            await window.backgroundManager.pickRandomBackground();
        }

        // 1. Random Level
        const levels = ['1-4', '5-10', '11-16', '17+'];
        const randomLevel = levels[Math.floor(Math.random() * levels.length)];

        // 2. Random Type
        const types = Object.keys(window.OFFICIAL_ITEMS);
        const randomType = types[Math.floor(Math.random() * types.length)];

        // 3. Random Subtype
        let randomSubtype = '';
        if (window.OFFICIAL_ITEMS[randomType]) {
            const categories = window.OFFICIAL_ITEMS[randomType];
            const allSubtypes = [];
            for (const cat in categories) {
                if (Array.isArray(categories[cat])) allSubtypes.push(...categories[cat]);
            }
            if (allSubtypes.length > 0) {
                randomSubtype = allSubtypes[Math.floor(Math.random() * allSubtypes.length)];
            }
        }

        console.log(`🎲 Surprise! Level: ${randomLevel}, Type: ${randomType}, Subtype: ${randomSubtype}`);

        // 4. Update UI (So onGenerate reads correct values)
        // We update the "Sticky Note" source of truth directly as onGenerate reads from it
        const noteLevel = document.getElementById('note-level');
        const noteType = document.getElementById('note-type');
        const noteSubtype = document.getElementById('note-subtype');

        if (noteLevel) {
            noteLevel.textContent = randomLevel;
            noteLevel.dataset.value = randomLevel;
        }
        if (noteType) {
            noteType.textContent = randomType;
            noteType.dataset.value = randomType;
        }
        if (noteSubtype) {
            noteSubtype.textContent = randomSubtype.split('(')[0].trim(); // Display English/Hebrew mix cleanly
            noteSubtype.dataset.value = randomSubtype;
        }

        // Also update form inputs for consistency (optional but good for UX)
        const typeSelect = document.getElementById('item-type');
        const levelSelect = document.getElementById('item-level');
        if (typeSelect) typeSelect.value = randomType;
        if (levelSelect) levelSelect.value = randomLevel;

        this.ui.showToast('מגריל חפץ בהפתעה...', 'info');

        // 5. Trigger Generation
        await this.onGenerate(e);
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
