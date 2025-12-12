import { GetImgService } from '../services/GetImgService.js';

export class CharacterController {
    constructor() {
        this.itemRegistry = new Map(); // Stores cardData by UUID
        this.init();
    }

    init() {
        console.log("CharacterController: Initializing...");
        this.populateOptions();
        this.setupListeners();
    }

    populateOptions() {
        const options = window.CHARACTER_OPTIONS;
        if (!options) return;

        this.populateSelect('char-gender', options.genders);
        this.populateSelect('char-race', options.races);
        this.populateSelect('char-class', options.classes);
        this.populateSelect('char-background', options.backgrounds);
        this.populateSelect('char-art-style', options.artStyles);
        this.populateSelect('char-pose', options.poses);
    }

    populateSelect(elementId, items) {
        const select = document.getElementById(elementId);
        if (!select) return;

        select.innerHTML = '';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            select.appendChild(option);
        });
    }

    setupListeners() {
        // Guard against multiple bindings
        if (this.listenersSetup) return;
        this.listenersSetup = true;

        // Submit
        const btn = document.getElementById('create-character-btn');
        if (btn) {
            btn.addEventListener('click', () => this.generateCharacter());
        }

        // Listen for Equip Request (from RenderController)
        document.addEventListener('request-character-equip-item', (e) => {
            this.handleEquipRequest(e.detail);
        });

        // Listen for slot clicks to preview items
        const grid = document.querySelector('.equipment-grid');
        if (grid) {
            grid.addEventListener('click', (e) => this.handleSlotClick(e));
        }
    }

    handleSlotClick(e) {
        console.log('🖱️ handleSlotClick called', e.target);

        // Stop propagation to prevent double triggers
        e.stopPropagation();

        const slotEl = e.target.closest('.slot');
        if (!slotEl) return;

        const slotContent = slotEl.querySelector('.slot-content');
        const img = slotContent ? slotContent.querySelector('img') : null;

        // CASE 1: Occupied Slot -> Show Viewer
        if (img) {
            console.log('🖱️ Found img, calling showCardViewer');
            this.showCardViewer(img);
            return;
        }

        // CASE 2: Empty Slot -> Navigate to Creator
        const slotId = slotEl.dataset.slot;
        console.log('🖱️ Empty slot clicked:', slotId);

        this.navigateToCreatorForSlot(slotId);
    }

    navigateToCreatorForSlot(slotId) {
        const mapping = {
            'helmet': { type: 'wondrous', subtype: 'Helmet', label: 'קסדה' }, // Changed to Wondrous
            'armor': { type: 'armor', subtype: 'Armor', label: 'שריון' },
            'mainhand': { type: 'weapon', label: 'נשק' },
            'offhand': { type: 'armor', subtype: 'Shield', label: 'מגן' },
            'ranged': { type: 'weapon', subtype: 'Bow', label: 'קשת' },
            'ring1': { type: 'ring', label: 'טבעת' },
            'ring2': { type: 'ring', label: 'טבעת' },
            'necklace': { type: 'wondrous', subtype: 'Amulet', label: 'שרשרת' },
            'cape': { type: 'wondrous', subtype: 'Cloak', label: 'גלימה' },
            'boots': { type: 'wondrous', subtype: 'Boots', label: 'מגפיים' },
            'belt': { type: 'wondrous', subtype: 'Belt', label: 'חגורה' }, // Changed to Wondrous
            'ammo': { type: 'wondrous', label: 'תחמושת' }
        };

        const config = mapping[slotId];
        if (!config) return;

        // 1. Switch Tab
        const tabBtn = document.querySelector('.nav-tab[data-tab="card-creator"]');
        if (tabBtn) tabBtn.click();

        // 2. Set Type
        const typeSelect = document.getElementById('item-type');
        if (typeSelect) {
            typeSelect.value = config.type;
            // Trigger change to populate subtypes
            typeSelect.dispatchEvent(new Event('change'));
        }

        // 3. Set Subtype (if specific) - Wait a tick for population
        if (config.subtype) {
            setTimeout(() => {
                const subtypeSelect = document.getElementById('item-subtype');
                if (subtypeSelect) {
                    console.log(`Setting subtype to: ${config.subtype}`);
                    // Try to find a matching option (fuzzy match)
                    const options = Array.from(subtypeSelect.options);
                    const match = options.find(opt => opt.text.includes(config.subtype) || opt.value.includes(config.subtype));

                    if (match) {
                        subtypeSelect.value = match.value;
                        subtypeSelect.dispatchEvent(new Event('change'));
                        console.log(`Subtype matched and set: ${match.text}`);
                    } else {
                        console.warn(`Subtype '${config.subtype}' not found in options`, options.map(o => o.text));
                    }
                } else {
                    console.error('Subtype select element not found!');
                }
            }, 500); // Increased timeout to ensure population
        }

        if (window.uiManager) {
            window.uiManager.showToast(`יוצר חפץ חדש עבור: ${config.label}`, 'info');
        }
    }

    /**
     * Show card in CardViewerService
     */
    showCardViewer(imgEl) {
        console.log('🎴 showCardViewer called', imgEl.dataset.uniqueId);

        // Get card data from registry
        const uniqueId = imgEl.dataset.uniqueId;
        const cardData = this.itemRegistry.get(uniqueId);
        const frontImage = imgEl.src;
        const backImage = cardData?.capturedBackImage || cardData?.backImageUrl || null;

        console.log('🎴 cardData:', cardData ? 'exists' : 'null', 'backImage:', backImage ? 'exists' : 'null');

        // Use centralized CardViewerService
        if (window.cardViewerService) {
            window.cardViewerService.show({
                frontImage,
                backImage,
                cardData,
                sourceElement: imgEl
            });
        } else {
            console.error('CardViewerService not available');
        }
    }

    // ... promptConflict ...

    equipToSlots(slots, imageUrl, cardName, cardData) {
        // Special case: Alternate slots (Main -> Off, Ring1 -> Ring2)
        // If we are here, it means we either had NO conflicts, or User Confirmed overwrite.

        // Generate unique ID for this instance
        const uniqueId = 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Store data if provided
        if (cardData) {
            console.log('💾 Saving to itemRegistry:', uniqueId, 'capturedBackImage:', !!cardData.capturedBackImage);
            this.itemRegistry.set(uniqueId, cardData);
        } else {
            // Try to find from recent equip request?
            // Actually, equipToSlots is called FROM handleEquipRequest which has cardData.
            // We need to pass cardData into this function.
        }

        slots.forEach(slotKey => {
            const slot = document.querySelector(`.slot[data-slot="${slotKey}"] .slot-content`);
            if (slot) {
                slot.innerHTML = `<img src="${imageUrl}" data-item-name="${cardName ? cardName.replace(/"/g, '&quot;') : ''}" data-unique-id="${uniqueId}" class="equipped-item-icon" style="width:100%; height:100%; object-fit:contain;" />`;
            }
        });

        // Switch Tab
        const tabBtn = document.querySelector('.nav-tab[data-tab="character-sheet"]');
        if (tabBtn) tabBtn.click();

        if (window.uiManager) window.uiManager.showToast('החפץ הוסף בהצלחה!', 'success');
    }

    handleEquipRequest(data) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // Reset processing flag after a short delay (debounce)
        setTimeout(() => this.isProcessing = false, 500);

        const { cardData, imageUrl } = data;
        if (!cardData) return;

        // Extract Name (Handle V1 flattened vs V2 nested structure)
        const cardName = cardData.name || (cardData.front ? cardData.front.title : '') || "Unknown Item";

        // Check if item is ALREADY equipped anywhere
        const existingItem = document.querySelector(`.slot-content img[data-item-name="${CSS.escape(cardName)}"]`);
        if (existingItem) {
            if (window.uiManager) window.uiManager.showToast(`החפץ "${cardName}" כבר מצויד!`, 'warning');
            return;
        }

        const result = this.getTargetSlots(cardData);
        if (!result) {
            if (window.uiManager) window.uiManager.showToast('לא נמצא מקום מתאים לחפץ זה.', 'error');
            return;
        }

        let { slots, isTwoHanded, itemLabel, altSlot } = result;

        // Check primary slots
        let conflicts = this.checkConflicts(slots);

        // If primary is occupied, and we have an alternate option
        if (conflicts.length > 0 && altSlot && !isTwoHanded) {
            const altConflicts = this.checkConflicts([altSlot]);
            if (altConflicts.length === 0) {
                slots = [altSlot];
                conflicts = [];
            }
        }

        if (conflicts.length > 0) {
            this.promptConflict(conflicts, slots, imageUrl, itemLabel, cardName, cardData);
        } else {
            this.equipToSlots(slots, imageUrl, cardName, cardData);
        }
    }

    getTargetSlots(cardData) {
        // Use the FORM SELECTION directly - this is what the user chose in the dropdown
        // Try multiple sources for the type
        let formType = cardData.originalParams?.type || '';
        let subtype = cardData.originalParams?.subtype || cardData.subtype || '';

        // Fallback: Read directly from the form UI if originalParams is missing
        if (!formType) {
            const typeSelect = document.getElementById('item-type');
            if (typeSelect) {
                formType = typeSelect.value;
                console.log('🎒 Fallback: Reading type from form dropdown:', formType);
            }
        }
        if (!subtype) {
            const subtypeSelect = document.getElementById('item-subtype');
            if (subtypeSelect) {
                subtype = subtypeSelect.value;
            }
        }

        const name = String(cardData.name || cardData.front?.title || 'חפץ').toLowerCase();

        console.log('🎒 Equip Detection - formType:', formType, '| subtype:', subtype, '| name:', name);
        console.log('🎒 Debug cardData.originalParams:', cardData.originalParams);

        // --- SHIELDS (armor subtype that goes to offhand) ---
        if (formType === 'armor' && (subtype.includes('Shield') || subtype.includes('מגן'))) {
            console.log('  → Detected as SHIELD');
            return { slots: ['offhand'], isTwoHanded: false, itemLabel: name };
        }

        // --- SPECIFIC SUBTYPES (Cloak, Boots, Necklace, Helmet) ---
        // These can be under 'wondrous' or 'armor'
        // Also check the item name for Hebrew keywords if subtype is missing
        const subtypeLower = subtype.toLowerCase();
        const nameLower = name.toLowerCase();

        console.log('🎒 Checking subtypes - subtype:', subtype, '| name:', name);

        if (subtype.includes('Cloak') || subtype.includes('Cape') || subtype.includes('גלימה') ||
            nameLower.includes('גלימה') || nameLower.includes('מעיל')) {
            console.log('  → Detected as CLOAK');
            return { slots: ['cape'], isTwoHanded: false, itemLabel: name };
        }
        if (subtype.includes('Boots') || subtype.includes('מגפיים') ||
            nameLower.includes('מגפיים') || nameLower.includes('נעליים')) {
            console.log('  → Detected as BOOTS');
            return { slots: ['boots'], isTwoHanded: false, itemLabel: name };
        }
        if (subtype.includes('Amulet') || subtype.includes('Necklace') || subtype.includes('שרשרת') || subtype.includes('קמע') ||
            nameLower.includes('שרשרת') || nameLower.includes('קמע') || nameLower.includes('תליון')) {
            console.log('  → Detected as NECKLACE');
            return { slots: ['necklace'], isTwoHanded: false, itemLabel: name };
        }
        if (subtype.includes('Helmet') || subtype.includes('קסדה') ||
            nameLower.includes('קסדה') || nameLower.includes('כובע')) {
            console.log('  → Detected as HELMET');
            return { slots: ['helmet'], isTwoHanded: false, itemLabel: name };
        }
        if (subtype.includes('Belt') || subtype.includes('חגורה') ||
            nameLower.includes('חגורה') || nameLower.includes('אבנט')) {
            console.log('  → Detected as BELT');
            return { slots: ['belt'], isTwoHanded: false, itemLabel: name };
        }

        // --- WEAPONS: Check for two-handed ---
        if (formType === 'weapon') {
            const stats = window.ITEM_STATS?.[subtype] || {};
            const is2H = stats.twoHanded ||
                subtype.includes('Greatsword') || subtype.includes('חרב דו-ידנית') ||
                subtype.includes('Greataxe') || subtype.includes('גרזן דו-ידני') ||
                subtype.includes('Pike') || subtype.includes('Maul') ||
                subtype.includes('Halberd') || subtype.includes('Glaive') ||
                subtype.includes('Heavy Crossbow') || subtype.includes('Longbow') ||
                subtype.includes('קשת ארוכה');

            // Ranged weapons go to ranged slot
            const subtypeLc = subtype.toLowerCase();
            const isRanged = stats.ranged ||
                subtypeLc.includes('bow') ||
                subtype.includes('קשת') ||
                subtypeLc.includes('crossbow') ||
                subtypeLc.includes('sling') ||
                subtype.includes('קלע');

            if (isRanged) {
                console.log('  → Detected as RANGED WEAPON');
                return { slots: ['ranged'], isTwoHanded: !!stats.twoHanded, itemLabel: name };
            }

            if (is2H) {
                console.log('  → Detected as TWO-HANDED WEAPON');
                return { slots: ['mainhand', 'offhand'], isTwoHanded: true, itemLabel: name };
            }

            console.log('  → Detected as ONE-HANDED WEAPON');
            return { slots: ['mainhand'], isTwoHanded: false, itemLabel: name, altSlot: 'offhand' };
        }

        // Direct mapping from form dropdown values to slots
        const slotMap = {
            'ring': { slots: ['ring1'], altSlot: 'ring2', label: 'טבעת' },
            'armor': { slots: ['armor'], label: 'שריון' },
            'staff': { slots: ['mainhand'], altSlot: 'offhand', label: 'מטה' },
            'wand': { slots: ['mainhand'], altSlot: 'offhand', label: 'שרביט' },
            'potion': { slots: ['belt'], label: 'שיקוי' },
            'scroll': { slots: ['belt'], label: 'מגילה' },
            'wondrous': { slots: ['mainhand'], altSlot: 'offhand', label: 'חפץ פלא' }
        };

        const mapping = slotMap[formType];

        if (mapping) {
            console.log('  → Matched form type to slot:', mapping.slots);
            return {
                slots: mapping.slots,
                isTwoHanded: false,
                itemLabel: name || mapping.label,
                altSlot: mapping.altSlot
            };
        }

        // Fallback for items without originalParams (e.g., loaded from old saves)
        console.log('  → No form type found, defaulting to MAINHAND');
        return { slots: ['mainhand'], isTwoHanded: false, itemLabel: name, altSlot: 'offhand' };
    }

    checkConflicts(slots) {
        const conflicts = [];
        slots.forEach(slotName => {
            const slotEl = document.querySelector(`.slot[data-slot="${slotName}"] .slot-content`);
            if (slotEl && slotEl.querySelector('img')) {
                conflicts.push(slotName);
            }
        });
        return conflicts;
    }

    promptConflict(conflicts, slots, imageUrl, itemLabel, cardName, cardData) {
        const modal = document.getElementById('confirmation-modal');
        if (!modal) {
            // Fallback if modal missing
            if (confirm(`המיקום תפוס על ידי חפץ אחר. האם להחליף?`)) {
                this.equipToSlots(slots, imageUrl, cardName, cardData);
            }
            return;
        }

        const msg = modal.querySelector('.modal-message');
        if (msg) msg.textContent = `המקום מיועד ל-${itemLabel} תפוס. האם להחליף את החפץ הקיים?`;

        modal.classList.remove('hidden');

        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        const cleanup = () => {
            okBtn.replaceWith(okBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            modal.classList.add('hidden');
        };

        // Re-bind listeners
        const newOk = document.getElementById('confirm-ok-btn');
        const newCancel = document.getElementById('confirm-cancel-btn');

        newCancel.addEventListener('click', () => {
            // Try alternate slot logic if applicable?
            // E.g. if Ring1 taken, try Ring2.
            // For now, just cancel.
            cleanup();
        });

        newOk.addEventListener('click', () => {
            this.equipToSlots(slots, imageUrl, cardName, cardData);
            cleanup();
        });
    }

    // Note: equipToSlots is defined earlier in the class with cardData parameter
    getApiKey() {
        let key = localStorage.getItem('getimg_api_key');
        if (!key) {
            key = prompt('אנא הכנס מפתח API של GetImg (Flux):');
            if (key) {
                localStorage.setItem('getimg_api_key', key.trim());
            }
        }
        return key;
    }

    async generateCharacter() {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            alert("נדרש מפתח API לביצוע הפעולה.");
            return;
        }

        const raceSelect = document.getElementById('char-race');
        const classSelect = document.getElementById('char-class');
        const poseSelect = document.getElementById('char-pose');

        // New Selects
        const genderSelect = document.getElementById('char-gender');
        const styleSelect = document.getElementById('char-style');

        const raceVal = raceSelect.value;
        const classVal = classSelect.value;
        const background = document.getElementById('char-background').value;
        const artStyleVal = document.getElementById('char-art-style').value;
        let artStylePrompt = 'oil painting';

        if (artStyleVal) {
            if (artStyleVal === 'comic_book') {
                artStylePrompt = 'detailed comic book art, graphic novel style, bold ink lines, flat colors, cel shaded';
            } else {
                artStylePrompt = artStyleVal.replace(/_/g, ' ');
            }
        }
        const poseVal = poseSelect.value;

        // Get values from selects (with defaults)
        const gender = genderSelect ? genderSelect.value : 'male';
        const style = styleSelect ? styleSelect.value : 'portrait';

        const styleDesc = style === 'full_body'
            ? 'full body shot, showing entire character from head to toe, detailed clothing and boots'
            : 'close up face portrait, head and shoulders only, detailed facial features, looking at camera';

        const prompt = `Fantasy RPG character art, ${artStylePrompt} style, ${styleDesc} of a ${gender} ${raceVal} ${classVal}, ${background ? background + ' background, ' : ''}${poseVal} pose, highly detailed, dramatic lighting, masterpiece. Ensure no text, no writing, no watermarks, no logos, no brand names, clean image.`;

        console.log("Generating with Prompt:", prompt);
        this.setLoading(true);

        try {
            const service = new GetImgService(apiKey);
            const b64Image = await service.generateImage(prompt);
            const imageUrl = `data:image/jpeg;base64,${b64Image}`;
            this.updatePortrait(imageUrl);
        } catch (error) {
            console.error("Generation Error:", error);

            // If the error suggests an invalid key, clear it so the user can try again
            if (error.message.includes('401') || error.message.includes('auth') || error.message.includes('key')) {
                localStorage.removeItem('getimg_api_key');
                alert("המפתח שהוזן שגוי ונמחק. נסה שוב עם המפתח הנכון של GetImg.");
            } else {
                alert(`שגיאה ביצירת התמונה: ${error.message}`);
            }
        } finally {
            this.setLoading(false);
        }
    }

    updatePortrait(imageUrl) {
        const slot = document.querySelector('.character-portrait-slot');
        if (slot) {
            // Replace placeholder with image
            slot.innerHTML = `<img src="${imageUrl}" class="character-portrait-image" style="width:100%; height:100%; object-fit:cover; border-radius: 12px;" />`;

            // Switch to character sheet tab
            const tabBtn = document.querySelector('.nav-tab[data-tab="character-sheet"]');
            if (tabBtn) tabBtn.click();

            if (window.uiManager) window.uiManager.showToast('דיוקן דמות עודכן!', 'success');
        }
    }

    setLoading(isLoading) {
        const status = document.getElementById('generation-status');
        const btn = document.getElementById('create-character-btn');
        if (status) status.classList.toggle('hidden', !isLoading);
        if (btn) btn.disabled = isLoading;
    }
}
