/**
 * TreasureController - Handles the Treasure Generator tab
 * Manages both automatic (CR-based) and manual treasure generation
 */

import {
    CR_RARITY_MAP,
    ENEMY_TYPES,
    RARITY_LABELS,
    ITEM_TYPE_ICONS,
    rollGold,
    rollItemCount,
    selectItemType,
    selectRarity,
    getThemeKeywords,
    getVisualStyleHints
} from '../treasure-data.js';
import { enrichItemDetails } from '../utils/item-enrichment.js';
import i18n from '../i18n.js';
import CardRenderer from '../card-renderer.js';

class TreasureController {
    constructor(stateManager, uiManager, generatorController) {
        this.state = stateManager;
        this.ui = uiManager;
        this.generator = generatorController;

        // Internal state
        this.currentMode = 'auto';
        this.treasureList = []; // For manual mode
        this.generatedCards = []; // Generated treasure cards
        this.isGenerating = false;

        this.setupListeners();
    }

    setupListeners() {
        // Mode toggle
        const autoBtn = document.getElementById('treasure-mode-auto');
        const manualBtn = document.getElementById('treasure-mode-manual');

        if (autoBtn) {
            autoBtn.addEventListener('click', () => this.switchMode('auto'));
        }
        if (manualBtn) {
            manualBtn.addEventListener('click', () => this.switchMode('manual'));
        }

        // Counter controls
        const decreaseBtn = document.getElementById('item-count-decrease');
        const increaseBtn = document.getElementById('item-count-increase');

        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', () => this.updateItemCount(-1));
        }
        if (increaseBtn) {
            increaseBtn.addEventListener('click', () => this.updateItemCount(1));
        }

        // Generate treasure button (auto mode)
        const generateBtn = document.getElementById('generate-treasure-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateAutoTreasure());
        }

        // Manual mode controls
        const addItemBtn = document.getElementById('add-item-to-list-btn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.addItemToList());
        }

        const generateAllBtn = document.getElementById('generate-all-cards-btn');
        if (generateAllBtn) {
            generateAllBtn.addEventListener('click', () => this.generateManualTreasure());
        }

        // Item type change for subtype population
        const itemTypeSelect = document.getElementById('manual-item-type');
        if (itemTypeSelect) {
            itemTypeSelect.addEventListener('change', () => this.populateSubtypes());
        }

        // Action buttons
        const saveAllBtn = document.getElementById('save-all-to-gallery-btn');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => this.saveAllToGallery());
        }

        const clearBtn = document.getElementById('clear-treasure-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearTreasure());
        }

        // Initialize subtypes
        this.populateSubtypes();
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Update toggle buttons
        const autoBtn = document.getElementById('treasure-mode-auto');
        const manualBtn = document.getElementById('treasure-mode-manual');

        if (autoBtn && manualBtn) {
            autoBtn.classList.toggle('active', mode === 'auto');
            manualBtn.classList.toggle('active', mode === 'manual');
        }

        // Show/hide sections
        const autoSection = document.getElementById('treasure-auto-section');
        const manualSection = document.getElementById('treasure-manual-section');

        if (autoSection) {
            autoSection.classList.toggle('hidden', mode !== 'auto');
        }
        if (manualSection) {
            manualSection.classList.toggle('hidden', mode !== 'manual');
        }
    }

    updateItemCount(delta) {
        const display = document.getElementById('item-count-display');
        const input = document.getElementById('treasure-item-count');

        if (!display || !input) return;

        let count = parseInt(input.value) + delta;
        count = Math.max(1, Math.min(10, count)); // Clamp between 1-10

        input.value = count;
        display.textContent = count;
    }

    populateSubtypes() {
        const typeSelect = document.getElementById('manual-item-type');
        const subtypeSelect = document.getElementById('manual-subtype');

        if (!typeSelect || !subtypeSelect) return;

        const selectedType = typeSelect.value;
        const items = window.OFFICIAL_ITEMS?.[selectedType];

        // Get current locale
        const locale = window.i18n?.getLocale() || 'he';
        const isHebrew = locale === 'he';

        // Helper function to display item name based on locale
        // Format in data is "EnglishName (HebrewName)"
        const getDisplayName = (fullName) => {
            const match = fullName.match(/^(.+?)\s*\((.+)\)$/);
            if (match) {
                const [, englishName, hebrewName] = match;
                return isHebrew ? `${hebrewName} (${englishName})` : englishName;
            }
            return fullName;
        };

        // Clear existing options
        const defaultText = isHebrew ? '-- בחר חפץ --' : '-- Select Item --';
        subtypeSelect.innerHTML = `<option value="">${defaultText}</option>`;

        if (items) {
            Object.entries(items).forEach(([category, itemList]) => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;

                itemList.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item; // Keep original value for lookups
                    option.textContent = getDisplayName(item);
                    optgroup.appendChild(option);
                });

                subtypeSelect.appendChild(optgroup);
            });
        }
    }

    addItemToList() {
        const rarity = document.getElementById('manual-rarity')?.value || '5-10';
        const itemType = document.getElementById('manual-item-type')?.value || 'weapon';
        const subtype = document.getElementById('manual-subtype')?.value || '';
        const theme = document.getElementById('manual-theme')?.value || '';

        const item = {
            id: Date.now(),
            rarity,
            type: itemType,
            subtype,
            theme,
            icon: ITEM_TYPE_ICONS[itemType] || '📦',
            displayName: subtype || this.getTypeName(itemType)
        };

        this.treasureList.push(item);
        this.updateTreasureListUI();

        // Clear theme input
        const themeInput = document.getElementById('manual-theme');
        if (themeInput) themeInput.value = '';
    }

    removeItemFromList(id) {
        this.treasureList = this.treasureList.filter(item => item.id !== id);
        this.updateTreasureListUI();
    }

    getTypeName(type) {
        const locale = window.i18n?.getLocale() || 'he';
        const isHebrew = locale === 'he';

        const names = {
            weapon: isHebrew ? 'נשק' : 'Weapon',
            armor: isHebrew ? 'שריון' : 'Armor',
            wondrous: isHebrew ? 'חפץ פלא' : 'Wondrous Item',
            potion: isHebrew ? 'שיקוי' : 'Potion',
            ring: isHebrew ? 'טבעת' : 'Ring',
            scroll: isHebrew ? 'מגילה' : 'Scroll',
            staff: isHebrew ? 'מטה' : 'Staff',
            wand: isHebrew ? 'שרביט' : 'Wand'
        };
        return names[type] || type;
    }

    getRarityLabel(rarity) {
        const locale = window.i18n?.getLocale() || 'he';
        const isHebrew = locale === 'he';

        const labels = {
            'mundane': isHebrew ? 'רגיל' : 'Mundane',
            '1-4': isHebrew ? 'נפוץ' : 'Common',
            '5-10': isHebrew ? 'לא נפוץ' : 'Uncommon',
            '11-16': isHebrew ? 'נדיר' : 'Rare',
            '17+': isHebrew ? 'אגדי' : 'Legendary'
        };
        return labels[rarity] || rarity;
    }

    updateTreasureListUI() {
        const listContainer = document.getElementById('treasure-list');
        const countBadge = document.getElementById('list-count');
        const generateBtn = document.getElementById('generate-all-cards-btn');

        if (!listContainer) return;

        if (this.treasureList.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-list-message" data-i18n="treasureGenerator.emptyList">
                    הרשימה ריקה. הוסף חפצים למעלה.
                </div>
            `;
            if (generateBtn) generateBtn.disabled = true;
        } else {
            listContainer.innerHTML = this.treasureList.map(item => `
                <div class="treasure-list-item" data-id="${item.id}">
                    <div class="item-info">
                        <span class="item-icon">${item.icon}</span>
                        <span class="item-name">${item.displayName}</span>
                        <span class="item-rarity">${this.getRarityLabel(item.rarity)}</span>
                    </div>
                    <button class="remove-btn" onclick="window.treasureController?.removeItemFromList(${item.id})">🗑️</button>
                </div>
            `).join('');
            if (generateBtn) generateBtn.disabled = false;
        }

        if (countBadge) {
            countBadge.textContent = this.treasureList.length;
        }
    }

    async generateAutoTreasure() {
        if (this.isGenerating) return;

        const crRange = document.getElementById('treasure-cr')?.value || '5-10';
        const enemyType = document.getElementById('treasure-enemy-type')?.value || 'humanoid';
        const itemCount = parseInt(document.getElementById('treasure-item-count')?.value) || 3;
        const includeGold = document.getElementById('treasure-include-gold')?.checked ?? true;
        const surprise = document.getElementById('treasure-surprise')?.checked ?? false;

        this.showGenerationStatus(true);
        this.clearTreasurePreview();

        try {
            // Generate gold if enabled
            let goldAmount = 0;
            if (includeGold) {
                goldAmount = rollGold(crRange, enemyType);
                this.showGoldDisplay(goldAmount);
            }

            // Generate items
            const itemsToGenerate = [];
            for (let i = 0; i < itemCount; i++) {
                const itemType = selectItemType(enemyType);
                let rarity = selectRarity(crRange);

                // Surprise mode: last item is one rarity higher
                if (surprise && i === itemCount - 1) {
                    const rarityOrder = ['mundane', 'common', 'uncommon', 'rare', 'veryRare', 'legendary'];
                    const currentIndex = rarityOrder.indexOf(rarity);
                    if (currentIndex < rarityOrder.length - 1) {
                        rarity = rarityOrder[currentIndex + 1];
                    }
                }

                // Get theme keywords from enemy type
                const themeKeywords = getThemeKeywords(enemyType, i18n.getLocale());

                itemsToGenerate.push({
                    type: itemType,
                    rarity: this.rarityToLevel(rarity),
                    theme: themeKeywords,
                    enemyType
                });
            }

            // Generate each item
            for (let i = 0; i < itemsToGenerate.length; i++) {
                this.updateGenerationStatus(`יוצר חפץ ${i + 1} מתוך ${itemsToGenerate.length}...`);
                await this.generateSingleItem(itemsToGenerate[i], i);
            }

            this.showTreasureActions(true);
            this.ui.showToast(i18n.t('treasureGenerator.success') || `נוצרו ${itemsToGenerate.length} חפצים בהצלחה!`, 'success');

        } catch (error) {
            console.error('Treasure generation error:', error);
            this.ui.showToast(i18n.t('treasureGenerator.error') || 'שגיאה ביצירת האוצר', 'error');
        } finally {
            this.showGenerationStatus(false);
        }
    }

    async generateManualTreasure() {
        if (this.isGenerating || this.treasureList.length === 0) return;

        this.showGenerationStatus(true);
        this.clearTreasurePreview();

        try {
            // Get gold amount
            const goldAmount = parseInt(document.getElementById('manual-gold')?.value) || 0;
            if (goldAmount > 0) {
                this.showGoldDisplay(goldAmount);
            }

            // Generate each item from the list
            for (let i = 0; i < this.treasureList.length; i++) {
                const item = this.treasureList[i];
                this.updateGenerationStatus(`יוצר חפץ ${i + 1} מתוך ${this.treasureList.length}...`);

                await this.generateSingleItem({
                    type: item.type,
                    subtype: item.subtype,
                    rarity: item.rarity,
                    theme: item.theme
                }, i);
            }

            this.showTreasureActions(true);
            this.ui.showToast(i18n.t('treasureGenerator.success') || `נוצרו ${this.treasureList.length} חפצים בהצלחה!`, 'success');

        } catch (error) {
            console.error('Manual treasure generation error:', error);
            this.ui.showToast(i18n.t('treasureGenerator.error') || 'שגיאה ביצירת האוצר', 'error');
        } finally {
            this.showGenerationStatus(false);
        }
    }

    rarityToLevel(rarity) {
        const map = {
            'mundane': 'mundane',
            'common': '1-4',
            'uncommon': '5-10',
            'rare': '11-16',
            'veryRare': '17+',
            'legendary': '17+'
        };
        return map[rarity] || '5-10';
    }

    async generateSingleItem(itemConfig, index) {
        const { type, subtype, rarity, theme, enemyType } = itemConfig;

        // Add a loading card placeholder
        this.addLoadingCard(index);

        try {
            // Dispatch event to GeneratorController for actual item generation
            const generateEvent = new CustomEvent('treasure-generate-item', {
                detail: {
                    type,
                    subtype: subtype || this.getRandomSubtype(type),
                    level: rarity,
                    ability: theme,
                    enemyType,
                    targetIndex: index,
                    complexityMode: 'creative'
                }
            });

            // Use the existing generator infrastructure
            const result = await this.generateItemViaAPI(itemConfig);

            // Replace loading card with actual card
            this.replaceLoadingCard(index, result);
            this.generatedCards.push(result);

        } catch (error) {
            console.error(`Error generating item ${index}:`, error);
            this.replaceLoadingCardWithError(index);
        }
    }

    async generateItemViaAPI(itemConfig) {
        // Get API key
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            throw new Error('No API key configured');
        }

        // Use GeminiService directly
        const GeminiService = (await import('../gemini-service.js')).default;
        const gemini = new GeminiService(apiKey);

        // Determine subtype - ALWAYS pick a specific item from the dropdown list
        const subtype = itemConfig.subtype || this.getRandomSubtype(itemConfig.type);
        console.log('TreasureController: Using subtype:', subtype);

        // Build ability/theme with enemy type influence
        let ability = itemConfig.theme || '';
        if (itemConfig.enemyType && ENEMY_TYPES[itemConfig.enemyType]) {
            const enemyVisual = ENEMY_TYPES[itemConfig.enemyType].visualStyle;
            if (!ability && enemyVisual) {
                ability = enemyVisual.aesthetic;
            }
        }

        // Generate item details
        const itemDetails = await gemini.generateItemDetails(
            itemConfig.rarity,
            itemConfig.type,
            subtype,
            this.getRarityLabel(itemConfig.rarity),
            ability,
            null,
            'creative',
            i18n.getLocale()
        );

        // ENRICH item details with proper typeHe and coreStats from D&D data
        enrichItemDetails(itemDetails, itemConfig.type, subtype, i18n.getLocale());

        // Generate image - use same settings as Card Creator
        // ENHANCED: For wondrous items, ensure the item type is included in the visual prompt
        let visualPrompt = itemDetails.visualPrompt || itemDetails.name;

        // FIX: Ensure wondrous items include their specific type in the prompt to avoid irrelevant images
        if (itemConfig.type === 'wondrous' && subtype) {
            // Extract the English name from subtype (e.g., "Belt (חגורה)" -> "Belt")
            const englishName = subtype.includes('(') ? subtype.split('(')[0].trim() : subtype;
            // If the visualPrompt doesn't already mention the item type, prepend it
            if (!visualPrompt.toLowerCase().includes(englishName.toLowerCase())) {
                visualPrompt = `${englishName}: ${visualPrompt}`;
                console.log('📝 TreasureController: Enhanced wondrous item prompt:', visualPrompt);
            }
        }

        const getImgKey = localStorage.getItem('getimg_api_key');

        // Read user preferences from Card Creator UI or localStorage
        // Priority: 1. DOM element, 2. localStorage, 3. default
        const imageStyleEl = document.getElementById('image-style');
        const styleOptionEl = document.getElementById('image-style-option');

        // Try to get saved preferences from localStorage as fallback
        const savedImageStyle = localStorage.getItem('preferred_image_style');
        const savedStyleOption = localStorage.getItem('preferred_style_option');

        // Default to 'realistic' style (not dark_fantasy)
        const imageStyle = imageStyleEl?.value || savedImageStyle || 'realistic';
        const styleOption = styleOptionEl?.value || savedStyleOption || 'natural';

        // DEBUG: Log image generation settings
        console.log('🎨 TreasureController: Image generation settings:', {
            visualPrompt,
            imageStyle,
            styleOption,
            source: imageStyleEl ? 'DOM' : (savedImageStyle ? 'localStorage' : 'default'),
            hasStyleElement: !!imageStyleEl,
            hasStyleOptionElement: !!styleOptionEl
        });

        let imageUrl = null;
        try {
            // Get current template URL for AI theme detection
            const currentState = this.state.getState();
            const templateUrl = currentState?.settings?.style?.cardBackgroundUrl || null;

            // Get selected image model from dropdown (default to flux)
            const imageModel = document.getElementById('image-model')?.value || 'getimg-flux';

            const imageResult = await gemini.generateImageGetImg(
                visualPrompt,
                imageModel,     // Use selected model from dropdown
                imageStyle,     // Use user-selected style or 'realistic'
                getImgKey,
                styleOption,    // Use user-selected style option or 'natural'
                '#ffffff',      // Default color
                null,           // No color description
                templateUrl     // Pass template URL for AI theme detection
            );
            imageUrl = imageResult?.url || imageResult;
        } catch (imgError) {
            console.warn('Image generation failed:', imgError);
        }

        // DEBUG: Log what enrichItemDetails produced
        console.log('TreasureController: After enrichment:', {
            type: itemConfig.type,
            subtype,
            coreStats: itemDetails.coreStats,
            weaponDamage: itemDetails.weaponDamage,
            damageType: itemDetails.damageType,
            armorClass: itemDetails.armorClass,
            typeHe: itemDetails.typeHe
        });

        // Build full card data structure
        const cardData = {
            id: Date.now() + Math.random(),
            name: itemDetails.name || subtype || 'חפץ',
            rarityHe: this.getRarityLabel(itemConfig.rarity),
            typeHe: itemDetails.typeHe || this.getTypeName(itemConfig.type),
            // STATS FIELDS - Required by CardRenderer.drawText
            weaponDamage: itemDetails.weaponDamage,
            damageType: itemDetails.damageType,
            armorClass: itemDetails.armorClass,
            versatileDamage: itemDetails.versatileDamage,
            weaponProperties: itemDetails.weaponProperties,
            // Legacy field for compatibility
            coreStats: itemDetails.coreStats ||
                (itemDetails.weaponDamage ? `${itemDetails.weaponDamage} ${itemDetails.damageType || ''}`.trim() : '') ||
                (itemDetails.armorClass ? `AC ${itemDetails.armorClass}` : '') ||
                itemDetails.damage || '',
            quickStats: itemDetails.quickStats || itemDetails.description || '',
            gold: itemDetails.gold || '-',
            image: imageUrl,
            back: {
                title: itemDetails.abilityName || itemDetails.ability?.name || '',
                mechanics: itemDetails.abilityDesc || itemDetails.ability?.description || '',
                lore: itemDetails.lore || itemDetails.description || ''
            },
            // Visual settings
            visualPrompt: visualPrompt,
            type: itemConfig.type,
            subtype,
            rarity: itemConfig.rarity
        };

        // Render full card as thumbnail
        const cardThumbnail = await this.renderCardThumbnail(cardData, imageUrl);

        return {
            ...cardData,
            imageUrl: imageUrl,
            cardThumbnail: cardThumbnail || imageUrl
        };
    }

    // enrichItemDetails is now imported from '../utils/item-enrichment.js'
    // getDamageTypeHebrew is now handled by getDamageTypeTranslation in item-enrichment.js

    /**
     * Render a full card to an off-screen canvas and return as dataURL
     * Uses shared CardThumbnailRenderer utility for consistency
     */
    async renderCardThumbnail(cardData, imageUrl) {
        // Import shared renderer dynamically
        const { renderFrontThumbnail } = await import('../utils/CardThumbnailRenderer.ts');
        return renderFrontThumbnail(cardData, imageUrl, this.state);
    }

    getRandomSubtype(type) {
        const items = window.OFFICIAL_ITEMS?.[type];
        if (!items) return '';

        const allItems = Object.values(items).flat();
        return allItems[Math.floor(Math.random() * allItems.length)];
    }

    addLoadingCard(index) {
        const grid = document.getElementById('treasure-cards-grid');
        if (!grid) return;

        // Remove empty message if present
        const emptyMessage = grid.querySelector('.empty-treasure-message');
        if (emptyMessage) emptyMessage.remove();

        const loadingCard = document.createElement('div');
        loadingCard.className = 'treasure-card loading';
        loadingCard.id = `treasure-card-${index}`;
        grid.appendChild(loadingCard);
    }

    replaceLoadingCard(index, itemData) {
        const card = document.getElementById(`treasure-card-${index}`);
        if (!card) return;

        const rarityClass = this.getRarityClass(itemData.rarity);
        // Use the full card thumbnail if available, otherwise fall back to image
        const displayImage = itemData.cardThumbnail || itemData.imageUrl;

        // Store item data reference
        itemData._index = index;

        card.className = 'treasure-card';
        card.dataset.index = index;
        card.innerHTML = `
            <button class="quick-regenerate-btn" data-index="${index}" title="יצירה מחדש">🔄</button>
            ${displayImage ? `<img src="${displayImage}" class="card-image" alt="${itemData.name}" data-side="front">` : ''}
            <div class="card-actions">
                <button class="action-btn regenerate-btn" data-index="${index}" title="יצירה מחדש">🔄</button>
                <button class="action-btn flip-btn" data-index="${index}" title="הפוך">↩️</button>
                <button class="action-btn edit-btn" data-index="${index}" title="ערוך">✏️</button>
                <button class="action-btn delete-btn" data-index="${index}" title="מחק">🗑️</button>
            </div>
        `;

        // Store card data for actions
        this.generatedCards[index] = itemData;

        // Bind action button events
        this.bindCardActions(card, index, itemData);
    }

    /**
     * Bind click handlers for card action buttons
     */
    bindCardActions(cardElement, index, itemData) {
        // Click on image to view full card
        const cardImage = cardElement.querySelector('.card-image');
        if (cardImage) {
            cardImage.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewCard(itemData);
            });
        }

        // Quick Regenerate button (top-left corner)
        const quickRegenBtn = cardElement.querySelector('.quick-regenerate-btn');
        if (quickRegenBtn) {
            quickRegenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.regenerateCard(index, itemData);
            });
        }

        // Regenerate button (in action bar)
        const regenerateBtn = cardElement.querySelector('.regenerate-btn');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.regenerateCard(index, itemData);
            });
        }

        // Flip button
        const flipBtn = cardElement.querySelector('.flip-btn');
        if (flipBtn) {
            flipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.flipCard(index, itemData);
            });
        }

        // Edit button
        const editBtn = cardElement.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editCard(itemData);
            });
        }

        // Delete button
        const deleteBtn = cardElement.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCard(index);
            });
        }
    }

    /**
     * Regenerate a card with same parameters
     */
    async regenerateCard(index, itemData) {
        const card = document.getElementById(`treasure-card-${index}`);
        if (!card) return;

        // Show loading state
        card.classList.add('loading');
        card.innerHTML = '';

        try {
            // Regenerate with same config
            const newItemData = await this.generateItemViaAPI({
                type: itemData.type,
                subtype: itemData.subtype,
                rarity: itemData.rarity,
                theme: itemData.theme || ''
            });

            // Replace with new card
            this.replaceLoadingCard(index, newItemData);

            if (this.ui) {
                this.ui.showToast('הקלף נוצר מחדש!', 'success');
            }
        } catch (error) {
            console.error('Regenerate failed:', error);
            this.replaceLoadingCardWithError(index);
        }
    }

    /**
     * Flip card to show back side
     */
    async flipCard(index, itemData) {
        const card = document.getElementById(`treasure-card-${index}`);
        if (!card) return;

        const cardImage = card.querySelector('.card-image');
        if (!cardImage) return;

        const currentSide = cardImage.dataset.side || 'front';

        if (currentSide === 'front') {
            // Render back side
            const backThumbnail = await this.renderCardBackThumbnail(itemData);
            if (backThumbnail) {
                cardImage.src = backThumbnail;
                cardImage.dataset.side = 'back';
                card.querySelector('.flip-btn').textContent = '↪️';
            }
        } else {
            // Show front side
            cardImage.src = itemData.cardThumbnail || itemData.imageUrl;
            cardImage.dataset.side = 'front';
            card.querySelector('.flip-btn').textContent = '↩️';
        }
    }

    /**
     * Render card back to thumbnail
     */
    async renderCardBackThumbnail(cardData) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 750;
            canvas.height = 1050;
            canvas.id = 'temp-back-canvas-' + Date.now();
            canvas.style.display = 'none';
            document.body.appendChild(canvas);

            const tempRenderer = new CardRenderer(canvas.id);
            await tempRenderer.templateReady;

            const renderData = {
                name: cardData.name,
                abilityName: cardData.back?.title || '',
                abilityDesc: cardData.back?.mechanics || '',
                description: cardData.back?.lore || ''
            };

            // Get current settings from stateManager (same settings used in Card Creator)
            const currentState = this.state.getState();
            const backSettings = currentState.settings?.back || {};
            const styleSettings = currentState.settings?.style || {};
            const bo = backSettings.offsets || {};
            const bs = backSettings.fontSizes || {};

            // Back side render options from stateManager
            const renderOptions = {
                fontSizes: {
                    abilityNameSize: bs.abilityNameSize || 52,
                    mechSize: bs.mechSize || 32,
                    loreSize: bs.loreSize || 24
                },
                abilityName: bo.abilityName ?? 140,
                mech: bo.mech ?? 220,
                lore: bo.lore ?? 880,
                mechWidth: bo.mechWidth ?? 600,
                loreWidth: bo.loreWidth ?? 550,
                fontFamily: styleSettings.fontFamily || 'Heebo',
                backgroundScale: currentState.settings?.front?.offsets?.backgroundScale ?? 1.0,
                fontStyles: backSettings.fontStyles || {}
            };

            console.log('TreasureController: Rendering BACK with stateManager settings:', renderOptions);

            await tempRenderer.render(renderData, renderOptions, true); // true = back side

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            // MEMORY LEAK FIX: Clear canvas dimensions to release GPU memory before removal
            canvas.width = 0;
            canvas.height = 0;
            document.body.removeChild(canvas);

            return dataUrl;
        } catch (error) {
            console.error('Failed to render back thumbnail:', error);
            return null;
        }
    }

    /**
     * Edit card - send to card editor
     */
    editCard(itemData) {
        // Close the viewer first if it's open
        if (window.cardViewerService && window.cardViewerService.isOpen) {
            window.cardViewerService.hide();
        }
        // Load in card creator
        this.loadCardInCreator(itemData);
    }

    /**
     * Delete a card from the grid
     */
    deleteCard(index) {
        const card = document.getElementById(`treasure-card-${index}`);
        if (!card) return;

        // Animate out
        card.style.transform = 'scale(0)';
        card.style.opacity = '0';

        setTimeout(() => {
            card.remove();
            // Remove from generated cards array
            if (this.generatedCards[index]) {
                delete this.generatedCards[index];
            }

            // Check if grid is empty
            const grid = document.getElementById('treasure-cards-grid');
            const remainingCards = grid?.querySelectorAll('.treasure-card');
            if (!remainingCards || remainingCards.length === 0) {
                this.clearTreasurePreview();
            }
        }, 300);

        if (this.ui) {
            this.ui.showToast('הקלף נמחק', 'info');
        }
    }

    /**
     * Get selected card indices
     */
    getSelectedCards() {
        const checkboxes = document.querySelectorAll('.card-select-checkbox:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
    }

    replaceLoadingCardWithError(index) {
        const card = document.getElementById(`treasure-card-${index}`);
        if (!card) return;

        card.className = 'treasure-card error';
        card.innerHTML = `
            <div class="error-message">
                <span class="icon">❌</span>
                <p>שגיאה ביצירה</p>
            </div>
        `;
    }

    getRarityClass(rarity) {
        const map = {
            'mundane': 'rarity-mundane',
            '1-4': 'rarity-common',
            '5-10': 'rarity-uncommon',
            '11-16': 'rarity-rare',
            '17+': 'rarity-legendary'
        };
        return map[rarity] || 'rarity-common';
    }

    async viewCard(itemData, sourceElement = null) {
        // Show card in enlarged viewer modal
        if (window.cardViewerService && itemData) {
            // Use card thumbnail as front image (the full rendered card)
            const frontImage = itemData.cardThumbnail || itemData.imageUrl;

            // Render back side on demand
            let backImage = null;
            if (itemData.back && (itemData.back.title || itemData.back.mechanics || itemData.back.lore)) {
                backImage = await this.renderCardBackThumbnail(itemData);
            }

            // Find the source element for animation if not provided
            if (!sourceElement && itemData._index !== undefined) {
                const card = document.getElementById(`treasure-card-${itemData._index}`);
                sourceElement = card?.querySelector('.card-image') || card;
            }

            // Show in card viewer with full card data for actions
            window.cardViewerService.show({
                frontImage: frontImage,
                backImage: backImage,
                cardData: itemData,
                sourceElement: sourceElement
            });
        } else {
            console.log('Card data:', itemData);
        }
    }

    /**
     * Edit card - send to card creator for editing
     */
    loadCardInCreator(itemData) {
        if (window.stateManager && itemData) {
            // Build the new cardData object
            const newCardData = {
                name: itemData.name,
                typeHe: itemData.typeHe,
                rarityHe: itemData.rarityHe,
                coreStats: itemData.coreStats || '',
                quickStats: itemData.quickStats || '',
                gold: itemData.gold || '',
                imageUrl: itemData.imageUrl,
                image: itemData.imageUrl,
                abilityName: itemData.back?.title || '',
                abilityDesc: itemData.back?.mechanics || '',
                description: itemData.back?.lore || '',
                generationParams: {
                    type: itemData.type,
                    subtype: itemData.subtype,
                    level: itemData.rarity
                }
            };

            // Update state via setCardData to trigger proper render
            window.stateManager.setCardData(newCardData);

            // Switch to Card Creator tab
            const tabBtn = document.querySelector('.nav-tab[data-tab="card-creator"]');
            if (tabBtn) tabBtn.click();

            // Show toast
            if (this.ui) {
                this.ui.showToast('הקלף נטען ביוצר הקלפים! ניתן לערוך ולשמור.', 'success');
            }
        }
    }

    showGoldDisplay(amount) {
        const goldDisplay = document.getElementById('treasure-gold-display');
        const goldAmount = document.getElementById('generated-gold-amount');

        if (goldDisplay && goldAmount) {
            goldAmount.textContent = amount.toLocaleString();
            goldDisplay.classList.remove('hidden');
        }
    }

    showGenerationStatus(show) {
        this.isGenerating = show;
        const status = document.getElementById('treasure-generation-status');
        if (status) {
            status.classList.toggle('hidden', !show);
        }
    }

    updateGenerationStatus(text) {
        const statusText = document.getElementById('treasure-status-text');
        if (statusText) {
            statusText.textContent = text;
        }
    }

    showTreasureActions(show) {
        const actions = document.getElementById('treasure-actions');
        if (actions) {
            actions.classList.toggle('hidden', !show);
        }
    }

    clearTreasurePreview() {
        const grid = document.getElementById('treasure-cards-grid');
        const goldDisplay = document.getElementById('treasure-gold-display');
        const actions = document.getElementById('treasure-actions');

        if (grid) {
            grid.innerHTML = `
                <div class="empty-treasure-message">
                    <span class="icon">🎲</span>
                    <p data-i18n="treasureGenerator.noTreasureYet">לחץ על "יצירת אוצר" כדי להתחיל</p>
                </div>
            `;
        }

        if (goldDisplay) {
            goldDisplay.classList.add('hidden');
        }

        if (actions) {
            actions.classList.add('hidden');
        }

        this.generatedCards = [];
    }

    clearTreasure() {
        this.clearTreasurePreview();
        this.treasureList = [];
        this.updateTreasureListUI();

        // Reset gold input in manual mode
        const goldInput = document.getElementById('manual-gold');
        if (goldInput) goldInput.value = 0;
    }

    async saveAllToGallery() {
        // Get selected cards or all cards
        const selectedIndices = this.getSelectedCards();
        let cardsToSave;

        if (selectedIndices.length > 0) {
            // Save only selected cards
            cardsToSave = selectedIndices
                .map(idx => this.generatedCards[idx])
                .filter(card => card);
        } else {
            // Save all cards
            cardsToSave = Object.values(this.generatedCards).filter(card => card);
        }

        if (cardsToSave.length === 0) {
            this.ui.showToast('אין קלפים לשמירה', 'warning');
            return;
        }

        try {
            for (const card of cardsToSave) {
                // Save each card to the gallery via state manager
                await this.state.saveToGallery(card);
            }

            const msg = selectedIndices.length > 0
                ? `נשמרו ${cardsToSave.length} קלפים נבחרים לגלריה!`
                : `נשמרו ${cardsToSave.length} קלפים לגלריה!`;
            this.ui.showToast(msg, 'success');
        } catch (error) {
            console.error('Error saving to gallery:', error);
            this.ui.showToast('שגיאה בשמירה לגלריה', 'error');
        }
    }
}

// Expose for remove button onclick
window.treasureController = null;

export default TreasureController;
