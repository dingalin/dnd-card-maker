import { getRarityFromLevel, blobToBase64 } from '../../utils.ts';
import { enrichItemDetails } from '../../utils/item-enrichment.ts';
import { validateItemBalance } from '../../utils/balancing-validator.ts';
import { sampleCardBackgroundColor } from '../../utils/ColorSampler.ts';
import { calculatePriceFromDescription } from '../../services/PricingService.ts';
import GeminiService from '../../gemini-service.ts';

export class GenerationManager {
    constructor(apiKey, stateManager) {
        this.gemini = new GeminiService(apiKey);
        this.state = stateManager;
    }

    /**
     * Standard Single Item Generation
     */
    async generateItem(params, onProgress) {
        const { type, subtype, level, ability, complexityMode, useVisualContext, overrides, skipImage, existingImageUrl, imageOnly } = params;

        const locale = window.i18n?.getLocale() || 'he';

        // 1. Determine Rarity
        let rarity;
        let effectiveComplexity = complexityMode;

        if (level === 'mundane') {
            rarity = 'common';
            effectiveComplexity = 'mundane';
        } else {
            rarity = getRarityFromLevel(level);
        }

        // 2. Prepare Context (Image)
        let contextImage = null;
        if (useVisualContext && this.state.getState().lastContext) {
            onProgress?.(1, 15, window.i18n?.t('preview.processingImage') || 'Processing image...');
            contextImage = this.state.getState().lastContext;
        }

        // 3. Resolve Random Subtype
        let finalSubtype = subtype;
        let wasRandom = false;

        if (!finalSubtype && window.OFFICIAL_ITEMS[type]) {
            const categories = window.OFFICIAL_ITEMS[type];
            const allSubtypes = [];
            for (const cat in categories) {
                if (Array.isArray(categories[cat])) allSubtypes.push(...categories[cat]);
            }
            if (allSubtypes.length > 0) {
                finalSubtype = allSubtypes[Math.floor(Math.random() * allSubtypes.length)];
                wasRandom = true;
            }
        }

        console.log(`GenerationManager: Level=${level}, Rarity=${rarity}, Mode=${effectiveComplexity}, Subtype=${finalSubtype}, ImageOnly=${imageOnly}`);

        let itemDetails;

        if (imageOnly) {
            // Image-only mode: generate just the visual prompt, skip text details
            onProgress?.(2, 30, window.i18n?.t('preview.creatingPrompt') || 'Creating image prompt...');

            const visualPrompt = await this.gemini.generateVisualPromptOnly(
                type,
                finalSubtype,
                rarity,
                ability,
                locale
            );

            itemDetails = {
                name: '',
                type: type,
                subtype: finalSubtype,
                rarity: rarity,
                rarityHe: '',
                gold: '',
                visualPrompt: visualPrompt
            };
        } else {
            // 4. Generate Text via Gemini
            onProgress?.(2, 30, window.i18n?.t('preview.writingStory') || 'Writing story...');

            itemDetails = await this.gemini.generateItemDetails(
                level,
                type,
                finalSubtype,
                rarity,
                ability,
                contextImage,
                effectiveComplexity,
                locale
            );

            console.log('📦 GenerationManager received itemDetails:', {
                name: itemDetails.name,
                specialDamage: itemDetails.specialDamage || '(missing)',
                spellAbility: itemDetails.spellAbility || '(missing)'
            });
        }

        // 5. Enrich & Backfill
        enrichItemDetails(itemDetails, type, finalSubtype, locale);

        // 6. Balance Validation
        const balanceResult = validateItemBalance(itemDetails, { autoFix: true, mode: effectiveComplexity });
        if (!balanceResult.isValid) {
            console.log('⚖️ Balance auto-fix applied:', balanceResult.issues);
            Object.assign(itemDetails, balanceResult.fixedItem);
        }

        // 7. FINAL AC FIX - Ensure armor has correct AC after all processing
        if (type === 'armor' && itemDetails.typeHe?.includes('שריון')) {
            const currentAC = parseInt(String(itemDetails.armorClass), 10) || 0;
            if (currentAC < 10) {
                // Force correct AC calculation
                let baseAC = 18; // Default to Plate
                const typeHeLower = (itemDetails.typeHe || '').toLowerCase();
                if (typeHeLower.includes('עור') && !typeHeLower.includes('מחוזק')) baseAC = 11;
                else if (typeHeLower.includes('שרשראות')) baseAC = 16;
                else if (typeHeLower.includes('קשקשים')) baseAC = 14;
                else if (typeHeLower.includes('לוחות')) baseAC = 18;

                // Detect bonus from abilityDesc
                const bonusMatch = (itemDetails.abilityDesc || '').match(/\+(\d)/);
                const bonus = bonusMatch ? parseInt(bonusMatch[1], 10) : 0;

                const correctAC = baseAC + bonus;
                console.log(`🛡️ FINAL FIX: armorClass ${currentAC} -> ${correctAC} (base ${baseAC} + bonus ${bonus})`);
                itemDetails.armorClass = correctAC;
                itemDetails.armorBonus = bonus;
            }
        }

        // 8. RECALCULATE PRICE - Don't trust AI's price, calculate from base + abilities
        if (itemDetails.typeHe && itemDetails.abilityDesc) {
            const calculatedPrice = calculatePriceFromDescription(
                itemDetails.abilityDesc,
                itemDetails.typeHe,
                rarity
            );

            // Only use calculated price if it's reasonable (> 0)
            if (calculatedPrice > 0) {
                const oldPrice = parseInt(String(itemDetails.gold), 10) || 0;
                console.log(`💰 PRICE FIX: ${oldPrice} -> ${calculatedPrice} (calculated from abilities)`);
                itemDetails.gold = String(calculatedPrice);
            }
        }

        // 9. Rarity Normalization (Hebrew/English compat)
        this._normalizeRarity(itemDetails, locale, rarity);

        // 8. Apply Manual Overrides
        if (overrides) this._applyOverrides(itemDetails, overrides, type);

        // 9. Generate or Use Existing Image
        const customPrompt = overrides?.customVisualPrompt;
        if (customPrompt) {
            itemDetails.visualPrompt = customPrompt;
        }

        const finalVisualPrompt = itemDetails.visualPrompt || '';
        let persistentImageUrl = existingImageUrl;

        if (!skipImage) {
            onProgress?.(3, 60, window.i18n?.t('preview.drawing') || 'Drawing...');
            const imageUrl = await this.generateImage(finalVisualPrompt, itemDetails.abilityDesc || '', finalSubtype || type);

            if (imageUrl) {
                persistentImageUrl = imageUrl;

                if (imageUrl.startsWith('blob:')) {
                    onProgress?.(3, 80, window.i18n?.t('preview.savingImage') || 'Saving image...');
                    persistentImageUrl = await blobToBase64(imageUrl);
                }
            } else {
                console.warn("GenerationManager: Image generation skipped due to missing API key");
            }
        }

        // 11. Construct Result
        const newCardData = {
            ...itemDetails,
            gold: itemDetails.gold || '1000',
            imageUrl: persistentImageUrl,
            visualPrompt: finalVisualPrompt,
            originalParams: { level, type, subtype: finalSubtype, rarity, ability }
        };

        return {
            cardData: newCardData,
            generatedSubtype: wasRandom ? finalSubtype : null
        };
    }

    /**
     * Auto-Equip flow (Low complexity, strict override inheritance)
     */
    async generateAutoEquipItem(detail, overrides) {
        const { level, complexityMode: userComplexityMode, type, subtype } = detail;
        const locale = window.i18n?.getLocale() || 'he';

        // Complexity/Rarity logic
        let rarity, complexityMode;
        if (level === 'mundane') {
            rarity = 'common';
            complexityMode = 'mundane';
        } else {
            rarity = getRarityFromLevel(level);
            complexityMode = userComplexityMode || 'simple';
        }

        // Generate Item Details
        const itemDetails = await this.gemini.generateItemDetails(
            level === 'mundane' ? '1-4' : level,
            type,
            subtype,
            rarity,
            overrides.ability || '',
            null,
            complexityMode,
            locale
        );

        // Apply Overrides
        if (overrides.manualDamage && type === 'weapon') {
            itemDetails.weaponDamage = overrides.manualDamage;
        }
        if (overrides.manualAC && type === 'armor') {
            itemDetails.armorClass = overrides.manualAC;
        }

        // Enrich
        enrichItemDetails(itemDetails, type, subtype, locale);

        // Balance
        const balanceResult = validateItemBalance(itemDetails, { autoFix: true, mode: complexityMode });
        if (!balanceResult.isValid) {
            Object.assign(itemDetails, balanceResult.fixedItem);
        }

        // Generate Image
        const finalVisualPrompt = itemDetails.visualPrompt || `${type} ${subtype || ''}`;
        const imageUrl = await this.generateImage(finalVisualPrompt, itemDetails.abilityDesc || '', subtype || type);

        let persistentImageUrl = imageUrl; // Can be null
        if (imageUrl && imageUrl.startsWith('blob:')) {
            persistentImageUrl = await blobToBase64(imageUrl);
        }

        return {
            ...itemDetails,
            gold: itemDetails.gold || '100',
            imageUrl: persistentImageUrl,
            visualPrompt: finalVisualPrompt,
            originalParams: { level, type, subtype, rarity }
        };
    }

    /**
     * Assembly Table flow (User-defined abilities)
     */
    async generateAssemblyItem(buildData, onProgress) {
        const { base, rarity, enchantmentBonus, element, abilities, modifiers, itemName, locale } = buildData;

        const type = base.category === 'weapon' ? 'weapon' :
            base.category === 'armor' ? 'armor' :
                base.category === 'shield' ? 'armor' : 'wondrous';

        const subtype = locale === 'he' ? base.nameHe : base.nameEn;

        // Level Map
        const levelMap = { 'Common': '1-4', 'Uncommon': '1-4', 'Rare': '5-10', 'Very Rare': '11-16', 'Legendary': '17+' };
        const level = levelMap[rarity] || '1-4';

        // Build Prompt
        let abilitiesPrompt = '';
        if (abilities.length > 0) {
            const abilityNames = abilities.map(a => a.name).join(', ');
            abilitiesPrompt = `This item MUST include these specific abilities: ${abilityNames}. `;
        }
        if (element) {
            abilitiesPrompt += `The item deals extra ${element.dice || '1d6'} ${element.element} damage on hit. `;
        }
        if (enchantmentBonus > 0) {
            abilitiesPrompt += `This is a +${enchantmentBonus} magic ${type}. `;
        }
        if (modifiers.attunement) {
            abilitiesPrompt += `Requires attunement. `;
        }

        onProgress?.(1, 30, window.i18n?.t('preview.writingStory') || 'Writing story...');

        const itemDetails = await this.gemini.generateItemDetails(
            level, type, subtype, rarity.toLowerCase(),
            abilitiesPrompt, null, 'assembly', locale
        );

        if (itemName) itemDetails.name = itemName;

        // Apply Base Stats
        if (type === 'weapon') {
            let damage = base.damage || '1d8';
            if (enchantmentBonus > 0) damage += ` +${enchantmentBonus}`;
            if (element) damage += ` + ${element.dice} ${element.element}`;
            itemDetails.weaponDamage = damage;
            itemDetails.damageType = locale === 'he' ? base.damageTypeHe : base.damageType;
        } else if (type === 'armor') {
            const ac = (base.ac || 10) + enchantmentBonus;
            itemDetails.armorClass = String(ac);
        }

        itemDetails.assemblyAbilities = abilities;
        itemDetails.assemblyElement = element;
        itemDetails.requiresAttunement = modifiers.attunement;

        // Rarity Translation
        const rarityHe = {
            'Common': 'נפוץ', 'Uncommon': 'לא נפוץ', 'Rare': 'נדיר',
            'Very Rare': 'נדיר מאוד', 'Legendary': 'אגדי'
        }[rarity] || 'לא נפוץ';
        itemDetails.rarityHe = locale === 'he' ? rarityHe : rarity;

        // Visual Prompt
        const visualPromptBase = itemDetails.visualPrompt || `${rarity} magic ${subtype}, ${type === 'weapon' ? 'weapon' : 'armor'}`;
        let visualPrompt = visualPromptBase;
        if (element) visualPrompt += `, ${element.element} enchantment, ${element.icon} effects`;

        onProgress?.(2, 60, window.i18n?.t('preview.drawing') || 'Drawing...');
        const imageUrl = await this.generateImage(visualPrompt, abilitiesPrompt || itemDetails.abilityDesc || '', subtype || type);

        let persistentImageUrl = imageUrl;
        if (imageUrl && imageUrl.startsWith('blob:')) {
            onProgress?.(3, 80, window.i18n?.t('preview.savingImage') || 'Saving image...');
            persistentImageUrl = await blobToBase64(imageUrl);
        }

        return {
            ...itemDetails,
            gold: itemDetails.gold || '1000',
            imageUrl: persistentImageUrl,
            visualPrompt,
            originalParams: { level, type, subtype, rarity, abilities: abilities.map(a => a.id) }
        };
    }

    async generateImage(prompt, abilityDesc = '', itemSubtype = '') {
        const bgUrl = this.state.getState()?.settings?.style?.cardBackgroundUrl;
        let cardColor = '#ffffff';
        let colorDesc = null;

        try {
            if (bgUrl) {
                const result = await sampleCardBackgroundColor(bgUrl);
                cardColor = result.hex;
                colorDesc = result.description;
                // Store for renderer
                this.state.updateStyle('imageColor', cardColor);
            }
        } catch (e) {
            console.warn("GenerationManager: Failed to sample background color", e);
        }

        const getImgKey = localStorage.getItem('getimg_api_key');
        if (!getImgKey) {
            console.warn("GenerationManager: Missing GetImg API key, skipping image generation");
            return null;
        }

        const style = document.getElementById('image-style')?.value || 'realistic';
        const styleOption = document.getElementById('image-style-option')?.value || 'natural';
        const model = document.getElementById('image-model')?.value || 'getimg-flux';

        console.log('🖼️ GenerationManager.generateImage - styleOption:', styleOption, 'style:', style, 'model:', model);
        if (abilityDesc) {
            console.log('🔮 Image will include ability effects from:', abilityDesc.substring(0, 50));
        }
        if (itemSubtype) {
            console.log('📦 Item type priority:', itemSubtype);
        }

        // Pass all parameters including itemSubtype to ensure correct item type in image
        return await this.gemini.generateImage(prompt, model, style, getImgKey, styleOption, cardColor, colorDesc, bgUrl, abilityDesc, itemSubtype);
    }

    async generateBackground(theme, style, model, getImgKey) {
        return await this.gemini.generateCardBackground(theme, style, getImgKey, model);
    }

    _normalizeRarity(itemDetails, locale, originalRarity) {
        const rarityTranslations = {
            'Common': 'נפוץ', 'Uncommon': 'לא נפוץ', 'Rare': 'נדיר',
            'Very Rare': 'נדיר מאוד', 'Legendary': 'אגדי', 'Artifact': 'ארטיפקט'
        };

        if (locale === 'he') {
            const currentRarity = itemDetails.rarityHe || itemDetails.rarity;
            if (rarityTranslations[currentRarity]) {
                itemDetails.rarityHe = rarityTranslations[currentRarity];
            } else if (!currentRarity || /[a-zA-Z]/.test(currentRarity)) {
                itemDetails.rarityHe = rarityTranslations[originalRarity] || itemDetails.rarityHe || 'לא נפוץ';
            }
        }
    }

    _applyOverrides(itemDetails, overrides, type) {
        if (!overrides) return;

        if (overrides.attunement) {
            itemDetails.requiresAttunement = true;
        }

        if (type === 'weapon' && overrides.weaponDamage) {
            const dmg = overrides.weaponDamage;
            if (dmg && dmg.includes('+')) {
                const bonusMatch = dmg.match(/(\+\s*\d+)/);
                if (bonusMatch && itemDetails.weaponDamage && !itemDetails.weaponDamage.includes('+')) {
                    itemDetails.weaponDamage = itemDetails.weaponDamage + ' ' + bonusMatch[1].replace(/\s/g, '');
                }
            }
        }

        if (type === 'armor' && overrides.armorClass) {
            const ac = parseInt(overrides.armorClass);
            if (ac > 0) itemDetails.armorClass = String(ac);
        }
    }
}
