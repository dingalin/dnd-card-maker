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

        // Determine Complexity Mode
        const submitterId = e.submitter ? e.submitter.id : 'generate-creative-btn';
        const complexityMode = (submitterId === 'generate-simple-btn') ? 'simple' : 'creative';
        console.log(`Generator: Starting generation in ${complexityMode} mode.`);

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
            const itemDetails = await this.gemini.generateItemDetails(level, type, finalSubtype, rarity, ability, contextImage, complexityMode);

            // --- CUSTOM TYPE FORMATTING & BACKFILL ---
            this.enrichItemDetails(itemDetails, type, finalSubtype);
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
            this.preview.updateProgress(3, 60, 'מצייר...');
            const imageUrl = await this.generateImage(finalVisualPrompt);

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
                this.ui.showToast('אין פרומפט שמור - נסה ליצור חפץ חדש', 'warning');
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

            const itemDetails = await this.gemini.generateItemDetails(level, type, subtype, rarity, params.ability || '', contextImage);

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
            this.enrichItemDetails(newCardData, type, subtype);

            this.state.setCardData(newCardData);
            this.ui.showToast('תכונות חדשות נוצרו!', 'success');
        } catch (error) {
            console.error(error);
            this.ui.showToast('שגיאה ביצירת תכונות', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    enrichItemDetails(itemDetails, type, finalSubtype) {
        if (!window.OFFICIAL_ITEMS) return;

        try {
            console.log(`Generator: Enriching details for ${type} / ${finalSubtype}`);
            let specificType = "";

            // Extract Hebrew Name from Subtype (format: "Longsword (חרב ארוכה)")
            if (finalSubtype && finalSubtype.includes('(')) {
                const matches = finalSubtype.match(/\(([^)]+)\)/);
                if (matches && matches[1]) {
                    specificType = matches[1].trim();
                }
            } else if (finalSubtype) {
                specificType = finalSubtype;
            }

            // -- WEAPONS --
            if (type === 'weapon' && window.OFFICIAL_ITEMS.weapon) {
                let weaponPrefix = "נשק";
                const cats = window.OFFICIAL_ITEMS.weapon;

                // Check each category - look for the subtype in the category items
                const checkCategory = (category) => {
                    if (!cats[category]) return false;
                    return cats[category].some(item =>
                        item.includes(finalSubtype) || finalSubtype.includes(item.split(' ')[0]) ||
                        (specificType && item.includes(specificType))
                    );
                };

                const isSimple = checkCategory("Simple Melee") || checkCategory("Simple Ranged");
                const isMartial = checkCategory("Martial Melee") || checkCategory("Martial Ranged");

                if (isSimple) weaponPrefix = "פשוט";
                if (isMartial) weaponPrefix = "קרבי";

                // Always set typeHe if we have specific type, otherwise use a better fallback
                if (specificType) {
                    itemDetails.typeHe = `${specificType} (${weaponPrefix})`;
                } else if (itemDetails.typeHe && itemDetails.typeHe.toLowerCase() === 'weapon') {
                    // If AI returned "weapon" in English, at least translate it
                    itemDetails.typeHe = `נשק ${weaponPrefix}`;
                }
            }

            // -- ARMOR --
            else if (type === 'armor' && window.OFFICIAL_ITEMS.armor) {
                let armorCategory = "";
                const cats = window.OFFICIAL_ITEMS.armor;

                if ((cats["Light Armor"] || []).some(x => x.includes(finalSubtype))) armorCategory = "קל";
                else if ((cats["Medium Armor"] || []).some(x => x.includes(finalSubtype))) armorCategory = "בינוני";
                else if ((cats["Heavy Armor"] || []).some(x => x.includes(finalSubtype))) armorCategory = "כבד";
                else if ((cats["Shield"] || []).some(x => x.includes(finalSubtype))) armorCategory = "מגן";

                if (specificType) {
                    if (armorCategory === "מגן") {
                        itemDetails.typeHe = "מגן";
                    } else if (armorCategory) {
                        itemDetails.typeHe = `${specificType} (${armorCategory})`;
                    } else {
                        itemDetails.typeHe = specificType;
                    }
                }
            }

            // --- STAT BACKFILL LOGIC ---
            // Find matching stats using partial key match (keys are like "Longbow (קשת ארוכה)")
            if (window.ITEM_STATS && finalSubtype) {
                let officialStats = null;

                // Try direct match first
                if (window.ITEM_STATS[finalSubtype]) {
                    officialStats = window.ITEM_STATS[finalSubtype];
                    console.log("Generator: Direct match found:", finalSubtype);
                } else {
                    // Search for partial match - check multiple formats
                    const statsKeys = Object.keys(window.ITEM_STATS);
                    const matchingKey = statsKeys.find(key => {
                        // Check if key contains the subtype
                        if (key.includes(finalSubtype)) return true;
                        // Check if subtype contains the English name (first word of key)
                        if (finalSubtype.includes(key.split(' ')[0])) return true;
                        // Check if subtype matches the Hebrew name (inside parentheses)
                        const hebrewMatch = key.match(/\(([^)]+)\)/);
                        if (hebrewMatch && hebrewMatch[1]) {
                            const hebrewName = hebrewMatch[1].trim();
                            if (finalSubtype.includes(hebrewName) || hebrewName.includes(finalSubtype)) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (matchingKey) {
                        console.log("Generator: Found stats via partial match:", matchingKey, "for subtype:", finalSubtype);
                        officialStats = window.ITEM_STATS[matchingKey];
                    }
                }

                if (officialStats) {
                    // ALWAYS use official damage/type for weapons - these are known values
                    // Only AI-generated bonus (e.g., "+1") should be preserved
                    if (type === 'weapon' && officialStats.damage) {
                        const damageMap = { "bludgeoning": "מוחץ", "piercing": "דוקר", "slashing": "חותך" };
                        const officialDamageType = damageMap[officialStats.damageType] || officialStats.damageType;

                        // Check if AI added a bonus (e.g., "+1", "+2")
                        let bonusMatch = null;
                        if (itemDetails.weaponDamage && typeof itemDetails.weaponDamage === 'string') {
                            bonusMatch = itemDetails.weaponDamage.match(/(\+\s*\d+)/);
                        }
                        const bonus = bonusMatch ? ` ${bonusMatch[1].replace(/\s/g, '')}` : '';

                        // Set the official damage + any bonus
                        itemDetails.weaponDamage = `${officialStats.damage}${bonus}`;
                        itemDetails.damageType = officialDamageType;

                        console.log("Generator: Using official weapon stats:", itemDetails.weaponDamage, itemDetails.damageType);
                    }

                    // ALWAYS use official AC for armor
                    if (type === 'armor' && officialStats.ac) {
                        itemDetails.armorClass = officialStats.ac;
                        console.log("Generator: Using official armor AC:", officialStats.ac);
                    }

                    // Build weapon properties from official data
                    if (type === 'weapon') {
                        const props = [];
                        if (officialStats.twoHanded) props.push('דו-ידני');
                        if (officialStats.versatile) {
                            props.push('רב-שימושי');
                            // Store the versatile (two-handed) damage for display
                            itemDetails.versatileDamage = officialStats.versatile;
                        }
                        if (officialStats.finesse) props.push('עדין');
                        if (officialStats.reach) props.push('טווח');
                        if (officialStats.thrown) props.push('הטלה');
                        if (officialStats.light) props.push('קל');

                        // Store properties for display
                        itemDetails.weaponProperties = props;
                    }
                } else {
                    console.warn("Generator: NO OFFICIAL STATS FOUND for:", finalSubtype, "- type:", type);
                    console.log("Generator: Available stats keys:", Object.keys(window.ITEM_STATS || {}).slice(0, 10));
                }
            }

            // --- POST-PROCESSING: Translate any remaining English terms ---
            const damageTypeTranslations = {
                "slashing": "חותך", "piercing": "דוקר", "bludgeoning": "מוחץ",
                "fire": "אש", "cold": "קור", "lightning": "ברק", "poison": "רעל",
                "acid": "חומצה", "necrotic": "נמק", "radiant": "זוהר", "force": "כוח",
                "psychic": "נפשי", "thunder": "רעם"
            };

            // Helper function to clean damage string - translate and remove duplicates
            const cleanDamageString = (str) => {
                if (!str) return str;
                let result = str;

                // First translate any remaining English to Hebrew
                for (const [eng, heb] of Object.entries(damageTypeTranslations)) {
                    result = result.replace(new RegExp(eng, 'gi'), heb);
                }

                // Remove duplicate Hebrew damage types (e.g., "חותך חותך" -> "חותך")
                for (const heb of Object.values(damageTypeTranslations)) {
                    result = result.replace(new RegExp(`${heb}\\s+${heb}`, 'g'), heb);
                }

                // Clean up extra spaces
                result = result.replace(/\s{2,}/g, ' ').trim();

                return result;
            };

            // Clean up weaponDamage field
            if (itemDetails.weaponDamage) {
                itemDetails.weaponDamage = cleanDamageString(itemDetails.weaponDamage);
            }

            // Clean up quickStats field
            if (itemDetails.quickStats) {
                itemDetails.quickStats = cleanDamageString(itemDetails.quickStats);
            }

            // Fix typeHe if it's in English
            const typeTranslations = {
                "weapon": "נשק", "armor": "שריון", "potion": "שיקוי", "ring": "טבעת",
                "rod": "מטה", "staff": "מקל", "wand": "שרביט", "scroll": "מגילה",
                "wondrous": "פלאי", "wondrous item": "חפץ פלאי"
            };
            if (itemDetails.typeHe) {
                const lower = itemDetails.typeHe.toLowerCase();
                if (typeTranslations[lower]) {
                    itemDetails.typeHe = typeTranslations[lower];
                }
            }

        } catch (err) {
            console.warn("Error enriching item details:", err);
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

    /**
     * Auto-layout: Use smart algorithm to calculate optimal positioning
     * First detects the safe area inside the card template, then calculates positions
     */
    async onAutoLayout() {
        const currentState = this.state.getState();
        if (!currentState.cardData) {
            this.ui.showToast('אין קלף להתאמה', 'warning');
            return;
        }

        const btn = document.getElementById('auto-layout-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '🔍 מזהה שטח...';
        }

        try {
            // Import utilities dynamically
            const { SafeAreaDetector } = await import('../utils/SafeAreaDetector.js');
            const { LayoutCalculator } = await import('../utils/LayoutCalculator.js');

            // Step 1: Detect safe area from the current canvas
            const canvas = document.getElementById('card-canvas');
            if (!canvas) throw new Error('Canvas not found');

            if (btn) btn.textContent = '🔍 מזהה מסגרת...';

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

            if (btn) btn.textContent = '✨ מחשב...';

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

            this.ui.showToast(`✨ הכיוונון הושלם! (שטח פנוי: ${safeArea.width}x${safeArea.height})`, 'success');

        } catch (error) {
            console.error('Auto-layout error:', error);
            this.ui.showToast('שגיאה בכיוונון: ' + error.message, 'error');
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
            this.ui.showToast('אין קלף לניתוח', 'warning');
            return;
        }

        const canvas = document.getElementById('card-canvas');
        if (!canvas) {
            this.ui.showToast('Canvas לא נמצא', 'error');
            return;
        }

        try {
            // Import LassoTool dynamically
            const { LassoTool } = await import('../utils/LassoTool.js');

            // Get the EMPTY template image from the GLOBAL renderer
            const templateImg = window.cardRenderer?.template;
            if (!templateImg || !templateImg.complete || templateImg.naturalWidth === 0) {
                this.ui.showToast('Template עדיין נטען, נסה שוב', 'warning');
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
            this.ui.showToast('שגיאה בפתיחת הכלי: ' + error.message, 'error');
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
            this.ui.showToast(`✅ הוחל! (tolerance: ${safeArea.tolerance}%, שטח: ${safeArea.width}x${safeArea.height})`, 'success');

        } catch (error) {
            console.error('Apply layout error:', error);
            this.ui.showToast('שגיאה ביישום הפריסה: ' + error.message, 'error');
        }
    }
}
