import { stateManager } from './state.js';
import GeminiService from './gemini-service.js';
import { initUI, showToast, initWindowManager } from './ui-helpers.js';
import { getRarityFromLevel } from './utils.js';
import { previewManager } from './preview-manager.js';

export function setupEventListeners() {
    console.log("🔧 Setting up event listeners (Refactored)...");

    const form = document.getElementById('generator-form');
    const apiKeyInput = document.getElementById('api-key');
    const getImgApiKeyInput = document.getElementById('getimg-api-key');
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    const skeletonOverlay = document.getElementById('skeleton-overlay');
    const loadingText = document.getElementById('loading-text');
    const errorDiv = document.getElementById('error-message');
    const downloadBtn = document.getElementById('download-btn');
    const downloadBtnToolbar = document.getElementById('download-btn-toolbar');
    const surpriseBtn = document.getElementById('surprise-btn');
    const regenImageBtn = document.getElementById('regen-image-btn');
    const regenStatsBtn = document.getElementById('regen-stats-btn');
    const regenerateControls = document.getElementById('regenerate-controls');
    const contentEditor = document.getElementById('content-editor');
    const imageModelSelect = document.getElementById('image-model');

    // Editor Inputs
    const editInputs = {
        'edit-name': 'name',
        'edit-type': 'typeHe',
        'edit-rarity': 'rarityHe',
        'edit-ability-name': 'abilityName',
        'edit-ability-desc': 'abilityDesc',
        'edit-desc': 'description',
        'edit-gold': 'gold'
    };

    Object.keys(editInputs).forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                stateManager.updateCardField(editInputs[id], e.target.value);
            });
        }
    });

    // Sliders
    const sliders = {
        'name-offset': 'name',
        'type-offset': 'type',
        'rarity-offset': 'rarity',
        'ability-offset': 'abilityY',
        'fluff-offset': 'fluffPadding',
        'gold-offset': 'gold',
        'image-offset': 'imageYOffset',
        'image-scale': 'imageScale',
        'edit-image-scale': 'imageScale',
        'image-rotation': 'imageRotation',
        'edit-image-rotation': 'imageRotation',
        'image-fade': 'imageFade',
        'image-shadow': 'imageShadow',
        'bg-scale': 'backgroundScale'
    };

    Object.keys(sliders).forEach(id => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                // Special case for ability offset which is relative to 530 in original code
                if (id === 'ability-offset') val += 530;
                stateManager.updateOffset(sliders[id], val);

                // Update display values if they exist
                if (id.includes('scale')) {
                    const display = document.getElementById(`${id}-val`);
                    if (display) display.textContent = val.toFixed(1);
                } else if (id.includes('rotation')) {
                    const display = document.getElementById(`${id}-val`);
                    if (display) display.textContent = `${val}°`;
                } else if (id.includes('fade') || id.includes('shadow')) {
                    const display = document.getElementById(`${id}-val`);
                    if (display) display.textContent = val;
                }
            });
        }
    });

    // Font Family
    const fontFamilySelect = document.getElementById('font-family-select');
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', (e) => {
            stateManager.updateStyle('fontFamily', e.target.value);
        });
    }

    // Font Size Buttons
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            const action = btn.classList.contains('font-increase') ? 1 : -1;
            stateManager.updateFontSize(target, action);
        });
    });

    // Image Style
    // Image Style & Color Palette
    const imageStyleSelect = document.getElementById('image-style-option');
    const imageColorContainer = document.getElementById('image-color-picker-container');
    const imageColorInput = document.getElementById('image-bg-color');
    const colorPalette = document.getElementById('color-palette');

    // 16 Predefined Colors
    const colors = [
        { name: 'Red', hex: '#ef4444' },
        { name: 'Green', hex: '#22c55e' },
        { name: 'Blue', hex: '#3b82f6' },
        { name: 'Yellow', hex: '#eab308' },
        { name: 'Purple', hex: '#a855f7' },
        { name: 'Orange', hex: '#f97316' },
        { name: 'Pink', hex: '#ec4899' },
        { name: 'Cyan', hex: '#06b6d4' },
        { name: 'White', hex: '#ffffff' },
        { name: 'Black', hex: '#000000' },
        { name: 'Gray', hex: '#6b7280' },
        { name: 'Brown', hex: '#78350f' },
        { name: 'Gold', hex: '#ffd700' },
        { name: 'Silver', hex: '#c0c0c0' },
        { name: 'Crimson', hex: '#991b1b' },
        { name: 'Indigo', hex: '#4338ca' }
    ];

    if (colorPalette && imageColorInput) {
        // Clear existing
        colorPalette.innerHTML = '';

        // Generate Palette
        colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-option';
            div.style.backgroundColor = color.hex;
            div.title = color.name;
            div.dataset.name = color.name;

            div.addEventListener('click', () => {
                // Remove selected from all
                document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
                // Add to clicked
                div.classList.add('selected');
                // Update hidden input with NAME
                imageColorInput.value = color.name;
                // Update state
                stateManager.updateStyle('imageColor', color.name);
            });

            colorPalette.appendChild(div);
        });

        // Select default (White)
        const defaultColor = colorPalette.querySelector('[data-name="White"]');
        if (defaultColor) {
            defaultColor.classList.add('selected');
            imageColorInput.value = 'White';
        }
    }

    if (imageStyleSelect) {
        // Always show color picker - it's useful for all styles
        if (imageColorContainer) {
            imageColorContainer.classList.remove('hidden');
        }

        imageStyleSelect.addEventListener('change', (e) => {
            stateManager.updateStyle('imageStyle', e.target.value);
        });
    }

    // Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            let apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                showToast('נא להזין מפתח API', 'warning');
                return;
            }

            localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());

            // UI Loading State
            loadingOverlay.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');
            if (skeletonOverlay) skeletonOverlay.classList.remove('hidden');
            if (downloadBtn) downloadBtn.disabled = true;
            if (regenerateControls) regenerateControls.classList.add('hidden');
            if (contentEditor) contentEditor.classList.add('hidden');
            if (errorDiv) errorDiv.classList.add('hidden');

            try {
                const formData = new FormData(form);

                // Read from Sticky Note (Source of Truth)
                const noteLevel = document.getElementById('note-level');
                const noteType = document.getElementById('note-type');
                const noteSubtype = document.getElementById('note-subtype');

                const type = noteType?.dataset.value || formData.get('type');
                const subtype = noteSubtype?.dataset.value || formData.get('subtype');
                const level = noteLevel?.dataset.value || formData.get('level');
                const ability = formData.get('ability');

                let finalType = type;
                if (subtype) {
                    finalType = `${type} - ${subtype}`;
                }

                // Special case for Armor to ensure it's treated as armor
                if (type === 'armor' && !finalType.toLowerCase().includes('armor')) {
                    finalType += ' Armor';
                }

                const rarity = getRarityFromLevel(level);

                const gemini = new GeminiService(apiKey);

                // Step 1: Starting
                previewManager.updateProgress(1, 10, 'מתחיל לחשוב על רעיון...');

                // Generate Details
                const currentState = stateManager.getState();
                const contextImage = currentState.lastContext;

                if (contextImage) {
                    console.log("Using visual context for generation:", contextImage);
                    previewManager.updateProgress(1, 15, 'מעבד את התמונה...');
                }

                // Random Subtype Logic
                let finalSubtype = subtype;
                if (!finalSubtype && window.OFFICIAL_ITEMS[type]) {
                    const categories = window.OFFICIAL_ITEMS[type];
                    const allSubtypes = [];
                    for (const category in categories) {
                        if (Array.isArray(categories[category])) {
                            allSubtypes.push(...categories[category]);
                        }
                    }
                    if (allSubtypes.length > 0) {
                        finalSubtype = allSubtypes[Math.floor(Math.random() * allSubtypes.length)];
                        console.log(`Randomly selected subtype: ${finalSubtype}`);
                    }
                }

                // Step 2: Generating text
                previewManager.updateProgress(2, 30, 'רוקח את הסיפור...');
                const itemDetails = await gemini.generateItemDetails(level, type, finalSubtype, rarity, ability, contextImage);

                // Add manual fields
                const attunementCheckbox = document.getElementById('attunement');
                itemDetails.requiresAttunement = attunementCheckbox ? attunementCheckbox.checked : false;
                if (type === 'weapon') {
                    const weaponDamage = document.getElementById('weapon-damage')?.value;
                    const damageType = document.getElementById('damage-type')?.value;
                    if (weaponDamage) itemDetails.weaponDamage = weaponDamage;
                    if (damageType) itemDetails.damageType = damageType;
                } else if (type === 'armor') {
                    const ac = document.getElementById('armor-class')?.value;
                    if (ac) itemDetails.armorClass = ac;
                }

                // Override with Custom Prompt if provided
                const customPromptInput = document.getElementById('custom-visual-prompt');
                if (customPromptInput && customPromptInput.value.trim()) {
                    console.log("Using Custom Visual Prompt:", customPromptInput.value.trim());
                    itemDetails.visualPrompt = customPromptInput.value.trim();
                }

                // Step 3: Generate Image
                previewManager.updateProgress(3, 60, 'מצייר את החפץ...');
                const model = imageModelSelect ? imageModelSelect.value : 'flux';
                const style = document.getElementById('image-style')?.value || 'realistic';
                const styleOption = imageStyleSelect ? imageStyleSelect.value : 'natural';
                const userColor = imageColorInput ? imageColorInput.value : '#ffffff';

                let imageUrl;
                if (model.startsWith('getimg-')) {
                    let getImgKey = getImgApiKeyInput ? getImgApiKeyInput.value.trim() : '';

                    if (!getImgKey) throw new Error("Missing GetImg API Key");
                    localStorage.setItem('getimg_api_key', getImgApiKeyInput.value.trim());
                    imageUrl = await gemini.generateImageGetImg(itemDetails.visualPrompt, model, style, getImgKey, styleOption, userColor);
                } else {
                    imageUrl = await gemini.generateItemImage(itemDetails.visualPrompt, model, style, styleOption, userColor);
                }

                const newCardData = {
                    ...itemDetails,
                    gold: itemDetails.gold || '1000',
                    imageUrl: imageUrl,
                    originalParams: { level, type: finalType, rarity, ability }
                };

                stateManager.setCardData(newCardData);

                // Auto-save to localStorage
                stateManager.saveCurrentCard();
                stateManager.saveToHistory();

                // Step 4: Finishing
                previewManager.updateProgress(4, 100, 'הושלם! ✨');

                // Brief delay before hiding overlay
                await new Promise(resolve => setTimeout(resolve, 500));

                // UI Success State
                loadingOverlay.classList.add('hidden');
                if (skeletonOverlay) skeletonOverlay.classList.add('hidden');
                if (regenerateControls) regenerateControls.classList.remove('hidden');
                if (contentEditor) contentEditor.classList.remove('hidden');
                if (downloadBtn) downloadBtn.disabled = false;

                // Reset progress for next time
                previewManager.resetProgress();

            } catch (error) {
                console.error("Generation Error:", error);
                loadingOverlay.classList.add('hidden');
                if (skeletonOverlay) skeletonOverlay.classList.add('hidden');
                if (downloadBtn) downloadBtn.disabled = false;
                showToast(error.message, 'error');
                if (contentEditor) contentEditor.classList.remove('hidden');
            }
        });
    }

    // Regenerate Image (Mirror)
    if (regenImageBtn) {
        regenImageBtn.addEventListener('click', async () => {
            const currentState = stateManager.getState();
            if (!currentState.cardData) return;

            let apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                showToast('נא להזין מפתח API', 'warning');
                return;
            }


            try {
                regenImageBtn.disabled = true;
                const originalText = regenImageBtn.innerHTML;
                regenImageBtn.innerHTML = '<span class="icon">⏳</span> ציור...';

                const gemini = new GeminiService(apiKey);
                const model = imageModelSelect ? imageModelSelect.value : 'flux';
                const style = document.getElementById('image-style')?.value || 'realistic';
                const styleOption = document.getElementById('image-style-option')?.value || 'natural';
                const userColor = document.getElementById('image-bg-color')?.value || '#ffffff';

                // CHECK FOR CUSTOM PROMPT
                const customPromptInput = document.getElementById('custom-visual-prompt');
                let visualPrompt = currentState.cardData.visualPrompt;
                if (customPromptInput && customPromptInput.value.trim()) {
                    console.log("Regenerating with Custom Visual Prompt:", customPromptInput.value.trim());
                    visualPrompt = customPromptInput.value.trim();
                }

                let imageUrl;
                if (model.startsWith('getimg-')) {
                    let getImgKey = getImgApiKeyInput ? getImgApiKeyInput.value.trim() : '';

                    if (!getImgKey) throw new Error("Missing GetImg API Key");
                    imageUrl = await gemini.generateImageGetImg(visualPrompt, model, style, getImgKey, styleOption, userColor);
                } else {
                    imageUrl = await gemini.generateItemImage(visualPrompt, model, style, styleOption, userColor);
                }

                const newCardData = {
                    ...currentState.cardData,
                    imageUrl: imageUrl
                };

                stateManager.setCardData(newCardData);
                showToast('תמונה חדשה נוצרה!', 'success');

            } catch (error) {
                console.error("Regen Image Error:", error);
                showToast('שגיאה ביצירת תמונה', 'error');
            } finally {
                regenImageBtn.disabled = false;
                regenImageBtn.innerHTML = '<span class="icon">🎨</span> מראה';
            }
        });
    }

    // Regenerate Stats
    if (regenStatsBtn) {
        regenStatsBtn.addEventListener('click', async () => {
            const currentState = stateManager.getState();
            if (!currentState.cardData) return;

            let apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                showToast('נא להזין מפתח API', 'warning');
                return;
            }


            try {
                regenStatsBtn.disabled = true;
                const originalText = regenStatsBtn.innerHTML;
                regenStatsBtn.innerHTML = '<span class="icon">⏳</span> חושב...';

                const gemini = new GeminiService(apiKey);
                const params = currentState.cardData.originalParams || {};

                // Read from Sticky Note (Source of Truth)
                const noteLevel = document.getElementById('note-level');
                const noteType = document.getElementById('note-type');
                const noteSubtype = document.getElementById('note-subtype');

                // Use Sticky Note values if available, otherwise fall back to original params
                const level = noteLevel?.dataset.value || params.level || '1-4';
                const type = noteType?.dataset.value || params.type || 'wondrous';
                const subtype = noteSubtype?.dataset.value || params.subtype || '';
                const rarity = getRarityFromLevel(level);
                const ability = params.ability || '';

                const contextImage = currentState.lastContext;
                if (contextImage) {
                    console.log("Regenerating stats with visual context:", contextImage);
                }

                const itemDetails = await gemini.generateItemDetails(level, type, subtype, rarity, ability, contextImage);

                // Preserve image and original params
                const newCardData = {
                    ...itemDetails,
                    gold: itemDetails.gold || '1000',
                    imageUrl: currentState.cardData.imageUrl,
                    originalParams: params
                };

                stateManager.setCardData(newCardData);
                showToast('תכונות חדשות נוצרו!', 'success');

            } catch (error) {
                console.error("Regen Stats Error:", error);
                showToast('שגיאה ביצירת תכונות', 'error');
            } finally {
                regenStatsBtn.disabled = false;
                regenStatsBtn.innerHTML = '<span class="icon">📝</span> תכונות';
            }
        });
    }

    // Type Selection (Standard UI)
    const typeSelect = document.getElementById('item-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            const selectedType = e.target.value;

            // Update Subtypes
            const subtypeSelect = document.getElementById('item-subtype');
            const subtypeContainer = document.getElementById('subtype-container');

            if (subtypeSelect && window.OFFICIAL_ITEMS[selectedType]) {
                subtypeContainer.classList.remove('hidden');
                subtypeSelect.innerHTML = '<option value="">-- בחר חפץ --</option>';
                const categories = window.OFFICIAL_ITEMS[selectedType];
                for (const [category, items] of Object.entries(categories)) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = category;
                    items.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item;
                        option.textContent = item;
                        optgroup.appendChild(option);
                    });
                    subtypeSelect.appendChild(optgroup);
                }
            } else if (subtypeContainer) {
                subtypeContainer.classList.add('hidden');
            }

            // Toggle Fields
            const weaponFields = document.getElementById('weapon-fields');
            const armorFields = document.getElementById('armor-fields');
            if (weaponFields) weaponFields.classList.add('hidden');
            if (armorFields) armorFields.classList.add('hidden');

            if (selectedType === 'weapon' && weaponFields) weaponFields.classList.remove('hidden');
            else if (selectedType === 'armor' && armorFields) armorFields.classList.remove('hidden');
        });
    }
    // Background Generation
    const generateBgBtn = document.getElementById('generate-bg-btn');
    const resetBgBtn = document.getElementById('reset-bg-btn');
    const bgThemeSelect = document.getElementById('bg-theme-select');
    stateManager.notify('cardData'); // Force re-render
    if (generateBgBtn) {
        generateBgBtn.addEventListener('click', async () => {
            const theme = bgThemeSelect ? bgThemeSelect.value : 'Fire';
            const apiKey = apiKeyInput.value.trim();

            // Get GetImg Key if available
            let getImgKey = document.getElementById('getimg-api-key')?.value.trim() || '';


            try {
                generateBgBtn.disabled = true;
                generateBgBtn.textContent = 'מייצר רקע...';
                const gemini = new GeminiService(apiKey || 'dummy');
                const bgUrl = await gemini.generateCardBackground(theme, getImgKey);

                // Update Renderer
                if (window.cardRenderer) {
                    await window.cardRenderer.setTemplate(bgUrl);
                    // Trigger re-render
                    const currentState = stateManager.getState();
                    if (currentState.cardData) {
                        stateManager.notify('cardData'); // Force re-render
                    } else {
                        // If no card data, just clear and draw template
                        window.cardRenderer.render({}, currentState.settings.offsets);
                    }
                }
                showToast('רקע חדש נוצר בהצלחה!', 'success');
            } catch (error) {
                console.error("Background Generation Error:", error);
                showToast('שגיאה ביצירת רקע', 'error');
            } finally {
                generateBgBtn.disabled = false;
                generateBgBtn.textContent = 'צור רקע';
            }
        });
    }

    if (resetBgBtn) {
        resetBgBtn.addEventListener('click', async () => {
            if (window.cardRenderer) {
                // Detect base path for GitHub Pages or local development
                const basePath = window.location.pathname.includes('/dnd-card-maker/')
                    ? '/dnd-card-maker/'
                    : '/';
                await window.cardRenderer.setTemplate(basePath + 'assets/card-template.png');
                const currentState = stateManager.getState();
                if (currentState.cardData) {
                    stateManager.notify('cardData');
                } else {
                    window.cardRenderer.render({}, currentState.settings.offsets);
                }
                showToast('רקע חזר לברירת מחדל', 'info');
            }
        });
    }
    // Sticky Note Logic
    const stickyNote = document.getElementById('sticky-note');
    const noteLevel = document.getElementById('note-level');
    const noteType = document.getElementById('note-type');
    const noteSubtype = document.getElementById('note-subtype');

    const levelInput = document.getElementById('item-level');
    const subtypeInput = document.getElementById('item-subtype');

    function updateStickyNote() {
        if (!stickyNote) return;

        const levelSelect = document.getElementById('item-level');
        const typeSelect = document.getElementById('item-type');
        const subtypeSelect = document.getElementById('item-subtype');

        if (noteLevel && levelSelect) {
            // Get text, split by '(' to remove English if present
            const text = levelSelect.options[levelSelect.selectedIndex]?.text || levelSelect.value;
            noteLevel.textContent = text.split('(')[0].trim();
            noteLevel.dataset.value = levelSelect.value; // Store raw value
        }

        if (noteType && typeSelect) {
            const typeText = typeSelect.options[typeSelect.selectedIndex]?.text || typeSelect.value;
            noteType.textContent = typeText.split('(')[0].trim();
            noteType.dataset.value = typeSelect.value; // Store raw value
        }

        if (noteSubtype && subtypeSelect) {
            const subtypeText = subtypeSelect.value ? (subtypeSelect.options[subtypeSelect.selectedIndex]?.text || subtypeSelect.value) : '-';
            noteSubtype.textContent = subtypeText;
            noteSubtype.dataset.value = subtypeSelect.value || ''; // Store raw value
        }

        // Show note
        stickyNote.classList.remove('hidden');
    }

    if (levelInput) levelInput.addEventListener('change', updateStickyNote);

    // Hook into existing typeSelect if available
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            // Wait for subtype population
            setTimeout(updateStickyNote, 50);
        });
    }

    if (subtypeInput) subtypeInput.addEventListener('change', updateStickyNote);

    // Initial update
    setTimeout(updateStickyNote, 500);

}
