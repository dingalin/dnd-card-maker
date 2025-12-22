import { getRarityFromLevel, blobToBase64 } from '../utils.js';
import { enrichItemDetails } from '../utils/item-enrichment.js';
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
        this.onAutoLayout = this.onAutoLayout.bind(this);
        this.onLassoTool = this.onLassoTool.bind(this);

        this.setupListeners();
    }

    setupListeners() {
        const form = document.getElementById('generator-form');
        const regenImageBtn = document.getElementById('regen-image-btn');
        const regenStatsBtn = document.getElementById('regen-stats-btn');
        const generateBgBtn = document.getElementById('generate-bg-btn');
        const surpriseBtn = document.getElementById('surprise-btn');
        const autoLayoutBtn = document.getElementById('auto-layout-btn');
        const lassoBtn = document.getElementById('lasso-tool-btn');

        // Split buttons (handled via form submitter)
        if (form) form.addEventListener('submit', this.onGenerate);

        if (regenImageBtn) regenImageBtn.addEventListener('click', this.onRegenerateImage);
        if (regenStatsBtn) regenStatsBtn.addEventListener('click', this.onRegenerateStats);
        if (generateBgBtn) generateBgBtn.addEventListener('click', this.onGenerateBackground);
        if (surpriseBtn) surpriseBtn.addEventListener('click', this.onSurprise);
        if (autoLayoutBtn) autoLayoutBtn.addEventListener('click', this.onAutoLayout);
        if (lassoBtn) lassoBtn.addEventListener('click', this.onLassoTool);

        // Listen for auto-equip generation requests from CharacterController
        document.addEventListener('auto-equip-generate-item', async (e) => {
            await this.onAutoEquipGenerateItem(e.detail);
        });
    }

    /**
     * Handle auto-equip generation request for a single slot
     * Called by CharacterController when batch-generating items for all empty slots
     */
    async onAutoEquipGenerateItem(detail) {
        const { slotId, level, complexityMode: userComplexityMode, type, subtype, label } = detail;

        console.log(`🎲 Auto-equip generating item for slot: ${slotId}, level: ${level}, complexity: ${userComplexityMode}, type: ${type}`);

        // Get API key silently (don't show toast)
        const apiKeyInput = document.getElementById('api-key');
        const apiKey = apiKeyInput?.value.trim() || localStorage.getItem('gemini_api_key');

        if (!apiKey) {
            console.error('No API key available for auto-equip generation');
            return;
        }

        try {
            this.gemini = new GeminiService(apiKey);

            // Determine rarity and complexity mode based on level
            let rarity, complexityMode;
            if (level === 'mundane') {
                rarity = 'common';
                complexityMode = 'mundane'; // Special mode for non-magical items (overrides user choice)
            } else {
                rarity = getRarityFromLevel(level);
                complexityMode = userComplexityMode || 'simple'; // Use user's choice for magical items
            }

            const locale = window.i18n?.getLocale() || 'he';

            // --- Context Inheritance ---
            // Pull Ability/Theme context from the Card Creator tab
            const creatorAbility = document.getElementById('item-ability')?.value.trim() || '';

            // Pull manual overrides from the Card Creator tab
            const manualDamage = document.getElementById('weapon-damage')?.value.trim() || '';
            const manualAC = document.getElementById('armor-class')?.value.trim() || '';

            console.log(`🧠 Auto-equip Context: Ability='${creatorAbility}', manualDamage='${manualDamage}', manualAC='${manualAC}'`);

            // Generate item details
            const itemDetails = await this.gemini.generateItemDetails(
                level === 'mundane' ? '1-4' : level, // Use low level for mundane
                type,
                subtype,
                rarity,
                creatorAbility, // Use current ability as context
                null, // No context image
                complexityMode,
                locale
            );

            // Apply manual overrides IF they were provided in the Creator tab
            if (manualDamage && type === 'weapon') {
                console.log('⚔️ Inheriting manual damage override:', manualDamage);
                itemDetails.weaponDamage = manualDamage;
            }
            if (manualAC && type === 'armor') {
                console.log('🛡️ Inheriting manual AC override:', manualAC);
                itemDetails.armorClass = manualAC;
            }

            // Enrich with official stats
            enrichItemDetails(itemDetails, type, subtype, locale);

            // Generate image
            const finalVisualPrompt = itemDetails.visualPrompt || `${type} ${subtype || ''}`;
            const imageUrl = await this.generateImage(finalVisualPrompt);

            // Convert to Base64 for persistence
            let persistentImageUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                persistentImageUrl = await blobToBase64(imageUrl);
            }

            // Create card data
            const cardData = {
                ...itemDetails,
                gold: itemDetails.gold || '100',
                imageUrl: persistentImageUrl,
                visualPrompt: finalVisualPrompt,
                originalParams: { level, type, subtype, rarity }
            };

            // Dispatch equip request
            // CharacterController will handle rendering the full card thumbnail
            document.dispatchEvent(new CustomEvent('request-character-equip-item', {
                detail: {
                    cardData,
                    imageUrl: persistentImageUrl,
                    isRenderedCard: false
                }
            }));

            console.log(`✅ Auto-equip item generated for slot: ${slotId}`);

        } catch (error) {
            console.error(`❌ Error generating item for ${slotId}:`, error);
        }
    }

    getApiKey() {
        const input = document.getElementById('api-key');
        if (!input || !input.value.trim()) {
            this.ui.showToast(window.i18n?.t('toasts.enterApiKey') || 'Please enter API key', 'warning');
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
        this.preview.updateProgress(0, 5, window.i18n?.t('preview.starting') || 'Starting...');

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

            // Determine rarity and complexity mode based on level
            let rarity, complexityMode;
            if (level === 'mundane') {
                rarity = 'common';
                complexityMode = 'mundane'; // Force mundane mode for non-magical items
            } else {
                rarity = getRarityFromLevel(level);
                // Use button-determined mode for magical items
                const submitterId = e.submitter ? e.submitter.id : 'generate-creative-btn';
                complexityMode = (submitterId === 'generate-simple-btn') ? 'simple' : 'creative';
            }
            console.log(`Generator: Level=${level}, Rarity=${rarity}, Mode=${complexityMode}`);

            // 1. Context
            const useVisualContext = document.getElementById('use-visual-context')?.checked;
            const currentState = this.state.getState();
            let contextImage = null;

            if (useVisualContext) {
                contextImage = currentState.lastContext;
                if (contextImage) this.preview.updateProgress(1, 15, window.i18n?.t('preview.processingImage') || 'Processing image...');
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
            this.preview.updateProgress(2, 30, window.i18n?.t('preview.writingStory') || 'Writing story...');
            const locale = window.i18n?.getLocale() || 'he';
            const itemDetails = await this.gemini.generateItemDetails(level, type, finalSubtype, rarity, ability, contextImage, complexityMode, locale);

            // --- CUSTOM TYPE FORMATTING & BACKFILL ---
            enrichItemDetails(itemDetails, type, finalSubtype, locale);
            // -------------------------------------
            // -------------------------------------

            // Manual Overrides
            const attunement = document.getElementById('attunement');
            itemDetails.requiresAttunement = attunement ? attunement.checked : false;

            if (type === 'weapon') {
                const dmg = document.getElementById('weapon-damage')?.value?.trim();
                // Only use manual damage if it contains explicit bonus (e.g., "+1")
                // Base damage comes from official ITEM_STATS via enrichItemDetails
                if (dmg && dmg.includes('+')) {
                    const bonusMatch = dmg.match(/(\+\s*\d+)/);
                    if (bonusMatch && itemDetails.weaponDamage && !itemDetails.weaponDamage.includes('+')) {
                        itemDetails.weaponDamage = itemDetails.weaponDamage + ' ' + bonusMatch[1].replace(/\s/g, '');
                    }
                }
                // NOTE: damageType is ALWAYS from official stats in enrichItemDetails, not override
            } else if (type === 'armor') {
                const ac = document.getElementById('armor-class')?.value?.trim();
                if (ac && parseInt(ac) > 0) {
                    itemDetails.armorClass = ac;
                }
            }

            // Custom Prompt
            const customPrompt = document.getElementById('custom-visual-prompt');
            if (customPrompt && customPrompt.value.trim()) {
                console.log('Using custom prompt:', customPrompt.value);
                itemDetails.visualPrompt = customPrompt.value.trim();
            }

            // Save the visual prompt that will be used (for regeneration later)
            const finalVisualPrompt = itemDetails.visualPrompt || '';
            console.log('Final visualPrompt to be saved:', finalVisualPrompt);

            // 4. Generate Image
            this.preview.updateProgress(3, 60, window.i18n?.t('preview.drawing') || 'Drawing...');
            const imageUrl = await this.generateImage(finalVisualPrompt);

            // 5. Save & Render
            // Convert Blob URL to Base64 for persistence
            let persistentImageUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                this.preview.updateProgress(3, 80, window.i18n?.t('preview.savingImage') || 'Saving image...');
                persistentImageUrl = await blobToBase64(imageUrl);
            }

            const newCardData = {
                ...itemDetails,
                gold: itemDetails.gold || '1000',
                imageUrl: persistentImageUrl,
                visualPrompt: finalVisualPrompt, // EXPLICITLY save visualPrompt
                originalParams: { level, type, subtype: finalSubtype, rarity, ability }
            };

            // Also save to state for easy access
            this.state.setLastVisualPrompt(finalVisualPrompt);

            this.state.setCardData(newCardData);
            this.state.saveCurrentCard();
            // Auto-save removed: this.state.saveToHistory();

            // Enable Save Button
            const saveBtn = document.getElementById('save-gallery-btn');
            if (saveBtn) saveBtn.disabled = false;

            this.preview.updateProgress(4, 100, window.i18n?.t('preview.ready') || 'Ready!');
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

            // PRIORITY: Use custom prompt if provided, otherwise use EXACT original visualPrompt
            let prompt = '';
            if (customPrompt && customPrompt.value.trim()) {
                prompt = customPrompt.value.trim();
                console.log('Using custom prompt:', prompt);
            } else if (currentState.cardData.visualPrompt) {
                prompt = currentState.cardData.visualPrompt;
                console.log('Using cardData.visualPrompt:', prompt);
            } else if (currentState.lastVisualPrompt) {
                // Fallback to state's lastVisualPrompt
                prompt = currentState.lastVisualPrompt;
                console.log('Using state.lastVisualPrompt:', prompt);
            } else {
                // No prompt available - show error
                this.ui.showToast(window.i18n?.t('toasts.noPromptSaved') || 'No prompt saved', 'warning');
                if (btn) btn.disabled = false;
                return;
            }

            const imageUrl = await this.generateImage(prompt);

            // Convert to Base64 for persistence
            let persistentImageUrl = imageUrl;
            if (imageUrl.startsWith('blob:')) {
                persistentImageUrl = await blobToBase64(imageUrl);
            }

            // Update both root and front.imageUrl for renderer compatibility
            const newCardData = {
                ...currentState.cardData,
                imageUrl: persistentImageUrl,
                front: {
                    ...currentState.cardData.front,
                    imageUrl: persistentImageUrl
                }
            };

            this.state.setCardData(newCardData);
            this.ui.showToast(window.i18n?.t('toasts.newImageCreated') || 'New image created!', 'success');

        } catch (error) {
            console.error(error);
            this.ui.showToast(window.i18n?.t('toasts.errorCreatingImage') || 'Error creating image', 'error');
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

            // Get subtype from multiple sources (UI dropdown, sticky note, or saved params)
            const subtypeDropdown = document.getElementById('item-subtype');
            const subtypeNote = document.getElementById('note-subtype');
            let subtype = '';
            if (subtypeDropdown && subtypeDropdown.value) {
                subtype = subtypeDropdown.value;
            } else if (subtypeNote?.dataset.value) {
                subtype = subtypeNote.dataset.value;
            } else if (params.subtype) {
                subtype = params.subtype;
            }
            console.log("RegenerateStats: Resolved subtype=", subtype, " from dropdown:", subtypeDropdown?.value, " from note:", subtypeNote?.dataset.value, " from params:", params.subtype);

            const rarity = getRarityFromLevel(level);

            // Check visual context toggle
            const useVisualContext = document.getElementById('use-visual-context')?.checked;
            const contextImage = useVisualContext ? currentState.lastContext : null;

            const locale = window.i18n?.getLocale() || 'he';
            const itemDetails = await this.gemini.generateItemDetails(level, type, subtype, rarity, params.ability || '', contextImage, 'creative', locale);

            console.log("RegenerateStats: type=", type, "subtype=", subtype);

            const newCardData = {
                ...itemDetails,
                gold: itemDetails.gold || '1000',
                // Get imageUrl from V2 structure (front.imageUrl) or fallback to root
                imageUrl: currentState.cardData.front?.imageUrl || currentState.cardData.imageUrl,
                // Preserve and update originalParams with current subtype
                originalParams: { ...params, type, subtype }
            };

            // Apply Enrichment (Formatting + Backfill)
            enrichItemDetails(newCardData, type, subtype, locale);

            this.state.setCardData(newCardData);
            this.ui.showToast(window.i18n?.t('toasts.newStatsCreated') || 'New stats created!', 'success');
        } catch (error) {
            console.error(error);
            this.ui.showToast(window.i18n?.t('toasts.errorCreatingStats') || 'Error creating stats', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // enrichItemDetails is now imported from '../utils/item-enrichment.js'

    async onGenerateBackground() {
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        const btn = document.getElementById('generate-bg-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = window.i18n?.t('generator.calculating') || 'Processing...';
        }

        try {
            this.gemini = new GeminiService(apiKey);
            const theme = document.getElementById('bg-theme-select')?.value || 'Fire';
            const style = document.getElementById('bg-style-select')?.value || 'watercolor';
            const getImgKey = document.getElementById('getimg-api-key')?.value.trim() || '';

            const bgUrl = await this.gemini.generateCardBackground(theme, style, getImgKey);

            // Convert to Base64 for persistence
            let persistentBgUrl = bgUrl;
            if (bgUrl.startsWith('blob:')) {
                persistentBgUrl = await blobToBase64(bgUrl);
            }

            // Save to state so it persists in history
            // RenderController will detect the change and load the new background via its render() method
            this.state.updateStyle('cardBackgroundUrl', persistentBgUrl);

            // Trigger re-render via settings change - this will make RenderController:
            // 1. Detect the new cardBackgroundUrl differs from currentBackgroundUrl (line 67-68)
            // 2. Call setTemplate() to load the new background
            // 3. Render the full card (text + image) on top
            if (window.stateManager) {
                window.stateManager.notify('settings.style');
            }

            this.ui.showToast(window.i18n?.t('toasts.newBackgroundCreated') || 'New background created!', 'success');
        } catch (error) {
            this.ui.showToast(window.i18n?.t('toasts.errorCreatingBackground') || 'Error creating background', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = window.i18n?.t('cardBackground.generate') || 'Create Background';
            }
        }
    }

    async onSurprise(e) {
        e.preventDefault();

        const apiKey = this.getApiKey();
        if (!apiKey) return;

        // 0. Random Background
        if (window.backgroundManager) {
            this.ui.showToast(window.i18n?.t('toasts.selectingRandomBg') || 'Selecting random background...', 'info');
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

        this.ui.showToast(window.i18n?.t('toasts.surpriseRolling') || 'Rolling surprise item...', 'info');

        // 5. Trigger Generation
        await this.onGenerate(e);
    }

    /**
     * Sample the center color of the card background and convert to descriptive words
     * @returns {Promise<{hex: string, description: string}>}
     */
    async sampleCardBackgroundColor() {
        try {
            const state = this.state.getState();
            const bgUrl = state.settings?.style?.cardBackgroundUrl;

            if (!bgUrl) {
                console.log('🎨 No card background URL, using default cream');
                return { hex: '#F5E6D3', description: 'warm cream parchment' };
            }

            // Load image and sample center
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = bgUrl;
            });

            // Create small canvas to sample
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Sample from CENTER of template (where items will be placed)
            // This is the card template WITHOUT any item - sample 30% of center area
            const centerX = Math.floor(img.width / 2);
            const centerY = Math.floor(img.height / 2);
            const sampleWidth = Math.floor(img.width * 0.3);
            const sampleHeight = Math.floor(img.height * 0.3);

            const imageData = ctx.getImageData(
                centerX - sampleWidth / 2,
                centerY - sampleHeight / 2,
                sampleWidth,
                sampleHeight
            );

            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
                r += imageData.data[i];
                g += imageData.data[i + 1];
                b += imageData.data[i + 2];
                count++;
            }

            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);

            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

            // Convert RGB to descriptive words
            const description = this.colorToDescription(r, g, b);

            console.log(`🎨 Sampled card template center (30%): ${hex} → "${description}"`);
            return { hex, description };

        } catch (err) {
            console.warn('Failed to sample card background:', err);
            return { hex: '#F5E6D3', description: 'warm cream parchment' };
        }
    }

    /**
     * Convert RGB values to descriptive color words for FLUX prompt
     */
    colorToDescription(r, g, b) {
        // Calculate HSL for better color naming
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const l = (max + min) / 2;

        // Lightness descriptions
        let lightness = '';
        if (l > 0.85) lightness = 'very light ';
        else if (l > 0.7) lightness = 'light ';
        else if (l < 0.3) lightness = 'dark ';
        else if (l < 0.15) lightness = 'very dark ';

        // Determine dominant color
        const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;

        // Check for neutrals (gray/white/black)
        if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30) {
            if (l > 0.9) return 'pure white';
            if (l > 0.75) return 'off-white cream';
            if (l > 0.5) return 'light gray';
            if (l > 0.25) return 'medium gray';
            return 'dark charcoal';
        }

        // Color naming based on RGB dominance
        let colorName = '';

        // Warm colors (red/orange/yellow/brown)
        if (r > g && r > b) {
            if (g > b * 1.5) {
                if (r > 200 && g > 150) colorName = 'golden yellow';
                else if (g > r * 0.6) colorName = 'warm orange';
                else colorName = 'amber brown';
            } else {
                colorName = l > 0.5 ? 'coral pink' : 'deep red';
            }
        }
        // Green tones
        else if (g > r && g > b) {
            if (r > b) colorName = 'olive green';
            else colorName = l > 0.5 ? 'sage green' : 'forest green';
        }
        // Blue/purple tones
        else if (b > r && b > g) {
            if (r > g) colorName = l > 0.5 ? 'lavender purple' : 'deep purple';
            else colorName = l > 0.5 ? 'sky blue' : 'navy blue';
        }
        // Fallback for edge cases
        else {
            if (r > 180 && g > 150 && b < 150) colorName = 'warm beige';
            else if (r > 200 && g > 180 && b > 150) colorName = 'cream parchment';
            else colorName = 'neutral tan';
        }

        return `${lightness}${colorName}`;
    }

    async generateImage(prompt) {
        const style = document.getElementById('image-style')?.value || 'realistic';
        const styleOption = document.getElementById('image-style-option')?.value || 'natural';

        // Smart color: Sample from card background instead of user picker
        const { hex: cardColor, description: colorDesc } = await this.sampleCardBackgroundColor();
        console.log(`🎨 Using card-matched background: ${colorDesc} (${cardColor})`);

        // IMPORTANT: Save the sampled color to state so CardRenderer uses it for removal
        this.state.updateStyle('imageColor', cardColor);
        console.log(`🎨 Saved imageColor to state: ${cardColor}`);

        // Get API key from UI or localStorage
        const key = document.getElementById('getimg-api-key')?.value.trim()
            || localStorage.getItem('getimg_api_key');

        if (!key) {
            throw new Error("Missing GetImg API key. Please enter your API key.");
        }

        // Save key for future use
        localStorage.setItem('getimg_api_key', key);

        // Get selected image model from dropdown (default to flux)
        const model = document.getElementById('image-model')?.value || 'getimg-flux';

        // Get current template URL for AI theme detection
        const templateUrl = this.state.getState()?.settings?.style?.cardBackgroundUrl || null;

        // Use GetImg with selected model - pass the card-matched color description and template URL
        console.log(`🎨 Generating image with GetImg/${model}...`);
        return await this.gemini.generateImageGetImg(prompt, model, style, key, styleOption, cardColor, colorDesc, templateUrl);
    }


    /**
     * Auto-layout: Use smart algorithm to calculate optimal positioning
     * First detects the safe area inside the card template, then calculates positions
     */
    async onAutoLayout() {
        const currentState = this.state.getState();
        if (!currentState.cardData) {
            this.ui.showToast(window.i18n?.t('generator.noCardForLayout') || 'No card to adjust', 'warning');
            return;
        }

        const btn = document.getElementById('auto-layout-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = window.i18n?.t('generator.detectingArea') || 'Detecting area...';
        }

        try {
            // Import utilities dynamically
            const { SafeAreaDetector } = await import('../utils/SafeAreaDetector.js');
            const { LayoutCalculator } = await import('../utils/LayoutCalculator.js');

            // Step 1: Detect safe area from the current canvas
            const canvas = document.getElementById('card-canvas');
            if (!canvas) throw new Error('Canvas not found');

            if (btn) btn.textContent = window.i18n?.t('generator.detectingFrame') || 'Detecting frame...';

            // Use smart fixed defaults based on standard 750x1050 card
            // These values work for most card templates with decorative frames
            const safeArea = {
                top: 85,        // Below top frame decorations
                bottom: 920,    // Above gold area
                left: 70,       // Inside left frame
                right: 680,     // Inside right frame
                width: 610,     // Usable width
                height: 835     // Usable height
            };

            console.log('Using standard safe area for 750x1050 card:', safeArea);

            if (btn) btn.textContent = window.i18n?.t('generator.calculating') || 'Calculating...';

            // Step 2: Get card data
            const cardData = currentState.cardData;

            // Step 3: Calculate optimal layout using detected safe area
            const layout = LayoutCalculator.calculateLayoutWithSafeArea(cardData, safeArea, currentState.settings);

            console.log('Smart layout calculated with safe area:', layout);

            // Apply offsets
            for (const [key, value] of Object.entries(layout.offsets)) {
                if (typeof value === 'number') {
                    this.state.updateOffset(key, value);

                    // Update slider UI
                    const sliderId = key === 'coreStats' ? 'coreStats-offset' :
                        key === 'imageYOffset' ? 'image-offset' :
                            key === 'imageScale' ? 'image-scale' :
                                `${key}-offset`;
                    const slider = document.getElementById(sliderId);
                    if (slider) slider.value = value;
                }
            }

            // Apply font sizes
            if (layout.fontSizes.name) {
                const defaultSize = 48;
                const delta = layout.fontSizes.name - defaultSize;
                if (delta !== 0) {
                    this.state.updateFontSize('name', delta);
                }
                const display = document.getElementById('nameSize-display');
                if (display) display.textContent = `${layout.fontSizes.name}px`;
            }

            // Apply image scale
            if (layout.imageSettings.scale) {
                this.state.updateOffset('imageScale', layout.imageSettings.scale);
                const scaleSlider = document.getElementById('image-scale');
                if (scaleSlider) scaleSlider.value = layout.imageSettings.scale;
                const scaleDisplay = document.getElementById('image-scale-val');
                if (scaleDisplay) scaleDisplay.textContent = layout.imageSettings.scale.toFixed(1);
            }

            this.state.saveCurrentCard();

            this.ui.showToast(`${window.i18n?.t('toasts.autoLayoutComplete') || '✨ Auto layout complete!'} (${safeArea.width}x${safeArea.height})`, 'success');

        } catch (error) {
            console.error('Auto-layout error:', error);
            this.ui.showToast(`${window.i18n?.t('toasts.autoLayoutError') || 'Auto layout error'}: ${error.message}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '✨ כיוונון אוטומטי';
            }
        }
    }

    /**
     * Open the Lasso Tool for interactive safe area selection
     */
    async onLassoTool() {
        const currentState = this.state.getState();
        if (!currentState.cardData) {
            this.ui.showToast(window.i18n?.t('toasts.noCardToAnalyze') || 'No card to analyze', 'warning');
            return;
        }

        const canvas = document.getElementById('card-canvas');
        if (!canvas) {
            this.ui.showToast(window.i18n?.t('toasts.canvasNotFound') || 'Canvas not found', 'error');
            return;
        }

        try {
            // Import LassoTool dynamically
            const { LassoTool } = await import('../utils/LassoTool.js');

            // Get the EMPTY template image from the GLOBAL renderer
            const templateImg = window.cardRenderer?.template;
            if (!templateImg || !templateImg.complete || templateImg.naturalWidth === 0) {
                this.ui.showToast(window.i18n?.t('toasts.templateStillLoading') || 'Template still loading, try again', 'warning');
                console.error('Template check:', {
                    exists: !!templateImg,
                    complete: templateImg?.complete,
                    width: templateImg?.naturalWidth
                });
                return;
            }

            console.log('onLassoTool: Using EMPTY template for detection, size:', templateImg.naturalWidth, 'x', templateImg.naturalHeight);

            // Create and open the lasso tool with the TEMPLATE (not the full canvas)
            const lasso = new LassoTool();
            lasso.open(templateImg, canvas, (detectedArea) => {
                // Log the detected values
                console.log('=== DETECTED SAFE AREA (from EMPTY template) ===');
                console.log('Tolerance used:', detectedArea.tolerance + '%');
                console.log('Safe Area:', {
                    top: detectedArea.top,
                    bottom: detectedArea.bottom,
                    left: detectedArea.left,
                    right: detectedArea.right,
                    width: detectedArea.width,
                    height: detectedArea.height
                });
                console.log('Coverage:', detectedArea.coverage + '%');
                console.log('================================================');

                // Apply layout using detected area
                this.applyLayoutWithArea(detectedArea);
            });

        } catch (error) {
            console.error('Lasso tool error:', error);
            this.ui.showToast(`${window.i18n?.t('toasts.toolOpenError') || 'Error opening tool'}: ${error.message}`, 'error');
        }
    }

    /**
     * Apply layout using a specific safe area
     */
    async applyLayoutWithArea(safeArea) {
        try {
            const { LayoutCalculator } = await import('../utils/LayoutCalculator.js');
            const currentState = this.state.getState();
            const cardData = currentState.cardData;

            const layout = LayoutCalculator.calculateLayoutWithSafeArea(cardData, safeArea, currentState.settings);
            console.log('Layout calculated with detected area:', layout);

            // Apply offsets
            for (const [key, value] of Object.entries(layout.offsets)) {
                if (typeof value === 'number') {
                    this.state.updateOffset(key, value);
                    const sliderId = key === 'coreStats' ? 'coreStats-offset' :
                        key === 'imageYOffset' ? 'image-offset' :
                            key === 'imageScale' ? 'image-scale' :
                                `${key}-offset`;
                    const slider = document.getElementById(sliderId);
                    if (slider) slider.value = value;
                }
            }

            // Apply font sizes
            if (layout.fontSizes.name) {
                const defaultSize = 48;
                const delta = layout.fontSizes.name - defaultSize;
                if (delta !== 0) {
                    this.state.updateFontSize('name', delta);
                }
            }

            // Apply image scale
            if (layout.imageSettings.scale) {
                this.state.updateOffset('imageScale', layout.imageSettings.scale);
            }

            this.state.saveCurrentCard();
            this.ui.showToast(`${window.i18n?.t('toasts.layoutApplied') || '✅ Layout applied!'} (${safeArea.width}x${safeArea.height})`, 'success');

        } catch (error) {
            console.error('Apply layout error:', error);
            this.ui.showToast(`${window.i18n?.t('toasts.layoutApplyError') || 'Error applying layout'}: ${error.message}`, 'error');
        }
    }
}
