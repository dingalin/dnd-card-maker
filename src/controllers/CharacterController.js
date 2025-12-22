import { GetImgService } from '../services/GetImgService.js';
import i18n from '../i18n.js';
import CardRenderer from '../card-renderer.js';
// Note: stateManager is now passed as constructor parameter (like TreasureController)


export class CharacterController {
    constructor(stateManager) {
        this.itemRegistry = new Map(); // Stores cardData by UUID
        this.backpackItems = new Map(); // Stores backpack items by slot index
        this.state = stateManager;     // Reference to global state (passed from main.js)
        this.draggedItem = null;       // Currently dragged item data
        this.init();
    }


    init() {
        console.log("CharacterController: Initializing...");

        // Populate dropdowns with current locale
        this.populateOptions();
        this.setupListeners();

        // Register locale change listener only once
        if (!this.localeListenerRegistered) {
            this.localeListenerRegistered = true;
            console.log('CharacterController: Registering locale change listener...');
            i18n.onLocaleChange((newLocale) => {
                console.log(`CharacterController: Locale changed to '${newLocale}', re-populating options...`);
                this.populateOptions();
            });
            console.log('CharacterController: Locale change listener registered. Total listeners:', i18n.listeners?.length);
        }

        // Also re-populate after i18n finishes loading (handles initial load race condition)
        if (!i18n.isLoaded && !this.i18nLoadWatcher) {
            this.i18nLoadWatcher = true;
            // Poll until i18n is loaded then re-populate
            const checkLoaded = setInterval(() => {
                if (i18n.isLoaded) {
                    clearInterval(checkLoaded);
                    console.log("CharacterController: i18n loaded, re-populating options...");
                    this.populateOptions();
                }
            }, 100);
        }

        // Initialize backpack system
        this.initBackpack();
    }

    populateOptions() {
        const options = window.CHARACTER_OPTIONS;
        if (!options) return;

        const locale = i18n.getLocale();
        const isEnglish = locale === 'en';
        console.log(`CharacterController: populateOptions() - locale='${locale}', isEnglish=${isEnglish}`);

        this.populateSelect('char-gender', options.genders, isEnglish);
        this.populateSelect('char-race', options.races, isEnglish);
        this.populateSelect('char-class', options.classes, isEnglish);
        this.populateSelect('char-background', options.backgrounds, isEnglish);
        this.populateSelect('char-art-style', options.artStyles, isEnglish);
        this.populateSelect('char-pose', options.poses, isEnglish);

        // Also update the portrait style dropdown
        this.populateSelect('char-style', [
            { value: 'portrait', label: 'תמונה: פנים (Portrait)', labelEn: 'Portrait (Face)' },
            { value: 'full_body', label: 'תמונה: גוף מלא (Full Body)', labelEn: 'Full Body' }
        ], isEnglish);
    }

    populateSelect(elementId, items, isEnglish) {
        const select = document.getElementById(elementId);
        if (!select) {
            console.warn(`CharacterController: Element #${elementId} not found in DOM`);
            return;
        }

        select.innerHTML = '';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            // Use English label if available and locale is English, otherwise use Hebrew
            option.textContent = (isEnglish && item.labelEn) ? item.labelEn : item.label;
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

        // Auto-Equip Button
        const autoEquipBtn = document.getElementById('auto-equip-btn');
        if (autoEquipBtn) {
            autoEquipBtn.addEventListener('click', () => this.autoEquipAllSlots());
        }

        // Character Name - Press Enter to display above portrait
        const nameInput = document.getElementById('character-name');
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.displayCharacterName(nameInput.value.trim());
                }
            });
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

        // Export All to Gallery Button
        const exportBtn = document.getElementById('export-all-gallery-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAllToGallery());
        }

        // --- Synchronization with Card Creator ---
        this.setupSyncListeners();

        // Setup Drag & Drop for inventory management
        this.setupDragDrop();
    }

    /**
     * Synchronize Level and Complexity settings with the Card Creator tab
     */
    setupSyncListeners() {
        const creatorLevel = document.getElementById('item-level');
        const charLevel = document.getElementById('auto-equip-level');
        const charComplexity = document.getElementById('auto-equip-complexity');

        // Sync Level: Creator -> Character
        if (creatorLevel && charLevel) {
            creatorLevel.addEventListener('change', () => {
                if (charLevel.value !== creatorLevel.value) {
                    charLevel.value = creatorLevel.value;
                    console.log('🔄 Sync (Creator -> Char): Level set to', charLevel.value);
                }
            });

            // Sync Level: Character -> Creator
            charLevel.addEventListener('change', () => {
                if (creatorLevel.value !== charLevel.value) {
                    creatorLevel.value = charLevel.value;
                    // Trigger change on creator to update sticky note etc.
                    creatorLevel.dispatchEvent(new Event('change'));
                    console.log('🔄 Sync (Char -> Creator): Level set to', creatorLevel.value);
                }
            });
        }

        // Complexity Syncing
        // Note: Creator tab doesn't have a complexity dropdown, but we can sync 
        // the Character's complexity choice to a global hint if needed.
        // For now, let's just ensure they are initialized from each other if one exists.
        if (creatorLevel && charLevel) {
            charLevel.value = creatorLevel.value;
        }
    }

    /**
     * Display character name above portrait
     * @param {string} name - The character name to display
     */
    displayCharacterName(name) {
        const displayEl = document.getElementById('character-name-display');
        if (displayEl) {
            displayEl.textContent = name;
            console.log('📝 Character name set to:', name);
        }
    }

    // ===============================
    // BACKPACK INVENTORY SYSTEM
    // ===============================

    /**
     * Initialize the backpack UI
     */
    initBackpack() {
        console.log('🎒 Initializing backpack system...');

        // Add click handlers for backpack slots (for viewing items)
        const backpackGrid = document.querySelector('.backpack-grid');
        if (backpackGrid) {
            backpackGrid.addEventListener('click', (e) => this.handleBackpackSlotClick(e));
        }
    }

    /**
     * Setup drag & drop for all slots (equipment and backpack)
     */
    setupDragDrop() {
        console.log('🎒 Setting up drag & drop...');

        // Make all equipped item images draggable
        this.makeDraggable('.equipment-grid .equipped-item-icon');
        this.makeDraggable('.backpack-grid .backpack-item-icon');

        // Setup drop zones for all slots
        this.setupDropZones('.slot[data-slot]');           // Equipment slots
        this.setupDropZones('.backpack-slot[data-backpack-slot]');  // Backpack slots

        // Setup equipment grid as a drop zone for auto-slotting from backpack
        this.setupEquipmentGridDrop();

        // Listen for new items being equipped to make them draggable
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.classList?.contains('equipped-item-icon') ||
                            node.classList?.contains('backpack-item-icon')) {
                            this.makeElementDraggable(node);
                        }
                        // Check for img inside added nodes
                        if (node.querySelector) {
                            const imgs = node.querySelectorAll('.equipped-item-icon, .backpack-item-icon');
                            imgs.forEach(img => this.makeElementDraggable(img));
                        }
                    });
                }
            });
        });

        const sheetContainer = document.querySelector('.character-sheet-container');
        if (sheetContainer) {
            observer.observe(sheetContainer, { childList: true, subtree: true });
        }
    }

    /**
     * Setup equipment grid as drop zone for auto-slot detection
     */
    setupEquipmentGridDrop() {
        const grid = document.querySelector('.equipment-grid');
        if (!grid || grid.dataset.gridDropSetup) return;
        grid.dataset.gridDropSetup = 'true';

        grid.addEventListener('dragover', (e) => {
            // Only handle if dragging from backpack
            if (this.draggedItem && this.draggedItem.sourceType === 'backpack') {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });

        grid.addEventListener('drop', (e) => {
            // Only handle if the drop target is the grid itself (not a slot)
            if (e.target !== grid && !e.target.classList.contains('equipment-grid')) return;
            if (!this.draggedItem || this.draggedItem.sourceType !== 'backpack') return;

            e.preventDefault();
            this.handleAutoSlotFromBackpack(this.draggedItem);
        });
    }

    /**
     * Auto-detect natural slot when dragging from backpack to equipment grid
     */
    handleAutoSlotFromBackpack(dragData) {
        console.log('🎒 Auto-slotting from backpack:', dragData);

        // Get card data from registry
        const cardData = this.itemRegistry.get(dragData.uniqueId);
        if (!cardData) {
            console.warn('Card data not found for auto-slot:', dragData.uniqueId);
            return;
        }

        // Use the existing getTargetSlots method to find natural slot
        const result = this.getTargetSlots(cardData);
        if (!result || !result.slots || result.slots.length === 0) {
            // No natural slot found - notify user
            if (window.uiManager) {
                window.uiManager.showToast(i18n.t('character.noSlotFound') || 'לא נמצא מקום מתאים', 'warning');
            }
            return;
        }

        let targetSlotId = result.slots[0];
        let targetSlot = document.querySelector(`.slot[data-slot="${targetSlotId}"]`);

        // Check if primary slot is occupied and we have an alternate
        if (targetSlot) {
            const targetContent = targetSlot.querySelector('.slot-content');
            const existingImg = targetContent?.querySelector('img');

            if (existingImg && result.altSlot) {
                // Primary is full, try alternate
                const altSlot = document.querySelector(`.slot[data-slot="${result.altSlot}"]`);
                const altContent = altSlot?.querySelector('.slot-content');
                const altExisting = altContent?.querySelector('img');

                if (!altExisting) {
                    // Alt slot is empty - use it
                    targetSlotId = result.altSlot;
                    targetSlot = altSlot;
                }
            }
        }

        if (!targetSlot) {
            if (window.uiManager) {
                window.uiManager.showToast(i18n.t('character.noSlotFound') || 'לא נמצא מקום מתאים', 'warning');
            }
            return;
        }

        // Now handle the drop on the target slot
        this.handleDropOnEquipment(targetSlot, dragData);
    }

    /**
     * Make existing elements draggable
     */
    makeDraggable(selector) {
        document.querySelectorAll(selector).forEach(el => {
            this.makeElementDraggable(el);
        });
    }

    /**
     * Make a single element draggable
     */
    makeElementDraggable(el) {
        if (el.dataset.draggableSetup) return; // Already setup
        el.dataset.draggableSetup = 'true';
        el.draggable = true;

        el.addEventListener('dragstart', (e) => {
            console.log('🎒 Drag started');
            e.stopPropagation();

            // Get slot info
            const equipmentSlot = el.closest('.slot[data-slot]');
            const backpackSlot = el.closest('.backpack-slot[data-backpack-slot]');

            let sourceType, sourceId;
            if (equipmentSlot) {
                sourceType = 'equipment';
                sourceId = equipmentSlot.dataset.slot;
            } else if (backpackSlot) {
                sourceType = 'backpack';
                sourceId = backpackSlot.dataset.backpackSlot;
            }

            // Store drag data
            this.draggedItem = {
                element: el,
                sourceType,
                sourceId,
                uniqueId: el.dataset.uniqueId,
                itemName: el.dataset.itemName,
                imageSrc: el.src
            };

            el.classList.add('dragging');

            // Set drag image
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                sourceType,
                sourceId,
                uniqueId: el.dataset.uniqueId
            }));
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            this.draggedItem = null;
            // Remove all drag-over states
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
    }

    /**
     * Setup drop zones
     */
    setupDropZones(selector) {
        document.querySelectorAll(selector).forEach(slot => {
            if (slot.dataset.dropSetup) return;
            slot.dataset.dropSetup = 'true';

            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', (e) => {
                // Only remove if actually leaving the slot (not entering child)
                if (!slot.contains(e.relatedTarget)) {
                    slot.classList.remove('drag-over');
                }
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');

                if (!this.draggedItem) return;

                const isEquipmentSlot = slot.dataset.slot !== undefined;
                const isBackpackSlot = slot.dataset.backpackSlot !== undefined;

                if (isEquipmentSlot) {
                    this.handleDropOnEquipment(slot, this.draggedItem);
                } else if (isBackpackSlot) {
                    this.handleDropOnBackpack(slot, this.draggedItem);
                }
            });
        });
    }

    /**
     * Handle dropping an item on an equipment slot
     */
    handleDropOnEquipment(targetSlot, dragData) {
        const targetSlotId = targetSlot.dataset.slot;
        let targetContent = targetSlot.querySelector('.slot-content');

        console.log(`🎒 Drop on equipment slot: ${targetSlotId}`, dragData);

        // Get card data from registry
        const cardData = this.itemRegistry.get(dragData.uniqueId);
        if (!cardData) {
            console.warn('Card data not found for:', dragData.uniqueId);
            return;
        }

        // If dragging from backpack, ALWAYS use the natural slot (not where user dropped)
        if (dragData.sourceType === 'backpack') {
            const result = this.getTargetSlots(cardData);
            if (result && result.slots && result.slots.length > 0) {
                let naturalSlotId = result.slots[0];
                let naturalSlot = document.querySelector(`.slot[data-slot="${naturalSlotId}"]`);

                // Check if natural slot is occupied and we have an alternate
                if (naturalSlot) {
                    const naturalContent = naturalSlot.querySelector('.slot-content');
                    const naturalExisting = naturalContent?.querySelector('img');

                    if (naturalExisting && result.altSlot) {
                        // Primary is full, try alternate first
                        const altSlot = document.querySelector(`.slot[data-slot="${result.altSlot}"]`);
                        const altContent = altSlot?.querySelector('.slot-content');
                        const altExisting = altContent?.querySelector('img');

                        if (!altExisting) {
                            // Alternate is empty - use it
                            naturalSlotId = result.altSlot;
                            naturalSlot = altSlot;
                        }
                        // If alternate is also full, stay with primary and let swap handle it
                    }
                    // If no alternate, stay with primary and let swap handle it
                }

                if (naturalSlot) {
                    console.log(`🎒 Auto-redirecting from ${targetSlotId} to natural slot: ${naturalSlotId}`);
                    // ALWAYS use the natural slot - don't fall back to user's target
                    targetSlot = naturalSlot;
                    targetContent = naturalSlot.querySelector('.slot-content');
                }
            }
        }

        const actualTargetSlotId = targetSlot.dataset.slot;

        // Check if target slot already has an item
        const existingImg = targetContent.querySelector('img');
        if (existingImg && existingImg.dataset.uniqueId !== dragData.uniqueId) {
            // Slot is occupied - ask user if they want to swap
            const existingData = {
                uniqueId: existingImg.dataset.uniqueId,
                itemName: existingImg.dataset.itemName,
                imageSrc: existingImg.src
            };

            // Get the slot label for the message
            const slotLabel = i18n.t(`characterSheet.${actualTargetSlotId.replace(/\\d/g, '')}`) || actualTargetSlotId;

            this.promptSwapConfirmation(slotLabel, () => {
                // User confirmed - perform the swap
                if (dragData.sourceType === 'backpack') {
                    this.placeItemInBackpack(dragData.sourceId, existingData);
                } else if (dragData.sourceType === 'equipment') {
                    const sourceSlot = document.querySelector(`.slot[data-slot="${dragData.sourceId}"] .slot-content`);
                    if (sourceSlot) {
                        sourceSlot.innerHTML = `<img src="${existingData.imageSrc}" data-item-name="${existingData.itemName || ''}" data-unique-id="${existingData.uniqueId}" class="equipped-item-icon" style="width:100%; height:100%; object-fit:contain;" />`;
                        this.makeElementDraggable(sourceSlot.querySelector('img'));
                    }
                }

                // Place dragged item in target
                targetContent.innerHTML = `<img src="${dragData.imageSrc}" data-item-name="${dragData.itemName || ''}" data-unique-id="${dragData.uniqueId}" class="equipped-item-icon" style="width:100%; height:100%; object-fit:contain;" />`;
                this.makeElementDraggable(targetContent.querySelector('img'));

                if (window.uiManager) {
                    window.uiManager.showToast(i18n.t('characterSheet.itemMoved') || 'פריט הועבר', 'success');
                }
            });
        } else {
            // Slot is empty - just move the item
            this.clearSourceSlot(dragData);

            // Place dragged item in target
            targetContent.innerHTML = `<img src="${dragData.imageSrc}" data-item-name="${dragData.itemName || ''}" data-unique-id="${dragData.uniqueId}" class="equipped-item-icon" style="width:100%; height:100%; object-fit:contain;" />`;
            this.makeElementDraggable(targetContent.querySelector('img'));

            if (window.uiManager) {
                window.uiManager.showToast(i18n.t('characterSheet.itemMoved') || 'פריט הועבר', 'success');
            }
        }
    }

    /**
     * Show confirmation dialog for item swap
     */
    promptSwapConfirmation(slotLabel, onConfirm) {
        const modal = document.getElementById('confirmation-modal');
        if (!modal) {
            // Fallback if modal missing
            if (confirm(i18n.t('character.conflictConfirm', { label: slotLabel }) || `המיקום תפוס. האם להחליף?`)) {
                onConfirm();
            }
            return;
        }

        const msg = modal.querySelector('.modal-message');
        if (msg) msg.textContent = i18n.t('character.conflictConfirm', { label: slotLabel }) || `המקום מיועד ל-${slotLabel} תפוס. האם להחליף?`;

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
            cleanup();
        });

        newOk.addEventListener('click', () => {
            onConfirm();
            cleanup();
        });
    }

    /**
     * Handle dropping an item on a backpack slot
     */
    handleDropOnBackpack(targetSlot, dragData) {
        const targetSlotIndex = targetSlot.dataset.backpackSlot;
        const targetContent = targetSlot.querySelector('.slot-content');

        console.log(`🎒 Drop on backpack slot: ${targetSlotIndex}`, dragData);

        // Check if target slot already has an item
        const existingImg = targetContent.querySelector('img');
        if (existingImg && existingImg.dataset.uniqueId !== dragData.uniqueId) {
            // Swap items
            const existingData = {
                uniqueId: existingImg.dataset.uniqueId,
                itemName: existingImg.dataset.itemName,
                imageSrc: existingImg.src
            };

            // Move existing to source location
            if (dragData.sourceType === 'equipment') {
                const sourceSlot = document.querySelector(`.slot[data-slot="${dragData.sourceId}"] .slot-content`);
                if (sourceSlot) {
                    sourceSlot.innerHTML = `<img src="${existingData.imageSrc}" data-item-name="${existingData.itemName || ''}" data-unique-id="${existingData.uniqueId}" class="equipped-item-icon" style="width:100%; height:100%; object-fit:contain;" />`;
                    this.makeElementDraggable(sourceSlot.querySelector('img'));
                }
            } else if (dragData.sourceType === 'backpack') {
                this.placeItemInBackpack(dragData.sourceId, existingData);
            }
        } else {
            // Clear source location
            this.clearSourceSlot(dragData);
        }

        // Place dragged item in backpack slot
        this.placeItemInBackpack(targetSlotIndex, {
            uniqueId: dragData.uniqueId,
            itemName: dragData.itemName,
            imageSrc: dragData.imageSrc
        });

        if (window.uiManager) {
            window.uiManager.showToast(i18n.t('characterSheet.itemStored') || 'פריט הועבר לתיק', 'info');
        }
    }

    /**
     * Place an item in a backpack slot
     */
    placeItemInBackpack(slotIndex, itemData) {
        const slot = document.querySelector(`.backpack-slot[data-backpack-slot="${slotIndex}"] .slot-content`);
        if (!slot) return;

        slot.innerHTML = `<img src="${itemData.imageSrc}" data-item-name="${itemData.itemName || ''}" data-unique-id="${itemData.uniqueId}" class="backpack-item-icon" />`;

        // Store in backpack registry
        this.backpackItems.set(slotIndex, itemData);

        // Make draggable
        const img = slot.querySelector('img');
        if (img) this.makeElementDraggable(img);
    }

    /**
     * Clear the source slot after a successful drop
     */
    clearSourceSlot(dragData) {
        if (dragData.sourceType === 'equipment') {
            const sourceSlot = document.querySelector(`.slot[data-slot="${dragData.sourceId}"] .slot-content`);
            if (sourceSlot) sourceSlot.innerHTML = '';
        } else if (dragData.sourceType === 'backpack') {
            const sourceSlot = document.querySelector(`.backpack-slot[data-backpack-slot="${dragData.sourceId}"] .slot-content`);
            if (sourceSlot) sourceSlot.innerHTML = '';
            this.backpackItems.delete(dragData.sourceId);
        }
    }

    /**
     * Handle click on backpack slot (view item)
     */
    handleBackpackSlotClick(e) {
        const slot = e.target.closest('.backpack-slot');
        if (!slot) return;

        const img = slot.querySelector('img');
        if (img) {
            // Show card viewer for backpack item
            this.showCardViewer(img);
        }
    }

    /**
     * Get list of all empty equipment slots
     */
    getEmptySlots() {
        const allSlots = ['helmet', 'armor', 'mainhand', 'offhand', 'ranged', 'ring1', 'ring2', 'necklace', 'cape', 'boots', 'belt', 'ammo'];
        const emptySlots = [];

        allSlots.forEach(slotId => {
            const slotEl = document.querySelector(`.slot[data-slot="${slotId}"] .slot-content`);
            if (slotEl && !slotEl.querySelector('img')) {
                emptySlots.push(slotId);
            }
        });

        return emptySlots;
    }

    /**
     * Show progress indicator for auto-equip
     */
    showAutoEquipProgress(message) {
        const status = document.getElementById('auto-equip-status');
        const text = document.getElementById('auto-equip-progress-text');
        const btn = document.getElementById('auto-equip-btn');

        if (status) status.classList.remove('hidden');
        if (text) text.textContent = message;
        if (btn) btn.disabled = true;
    }

    /**
     * Hide progress indicator for auto-equip
     */
    hideAutoEquipProgress() {
        const status = document.getElementById('auto-equip-status');
        const btn = document.getElementById('auto-equip-btn');

        if (status) status.classList.add('hidden');
        if (btn) btn.disabled = false;
    }

    /**
     * Auto-generate and equip items for all empty slots
     */
    async autoEquipAllSlots() {
        const emptySlots = this.getEmptySlots();

        if (emptySlots.length === 0) {
            if (window.uiManager) {
                window.uiManager.showToast(i18n.t('characterSidebar.autoEquipNoEmpty'), 'info');
            }
            return;
        }

        // Get selected level
        const levelSelect = document.getElementById('auto-equip-level');
        const level = levelSelect ? levelSelect.value : '1-4';

        // Get selected complexity mode (only applies to magical items)
        const complexitySelect = document.getElementById('auto-equip-complexity');
        const complexityMode = complexitySelect ? complexitySelect.value : 'simple';

        console.log(`🎲 Auto-equip starting: ${emptySlots.length} empty slots, level: ${level}, complexity: ${complexityMode}`);

        // Dispatch event to trigger generation for each slot
        // The GeneratorController will handle the actual generation
        for (let i = 0; i < emptySlots.length; i++) {
            const slotId = emptySlots[i];
            const slotMapping = this.getSlotMapping();
            const config = slotMapping[slotId];

            if (!config) continue;

            const slotLabel = i18n.t(`characterSheet.${slotId.replace(/\d/g, '')}`) || config.label;
            this.showAutoEquipProgress(i18n.t('characterSidebar.autoEquipProgress', { slot: slotLabel }));

            try {
                // Dispatch custom event for generation
                const event = new CustomEvent('auto-equip-generate-item', {
                    detail: {
                        slotId,
                        level,
                        complexityMode, // Pass user's choice
                        type: config.type,
                        subtype: config.subtype || '',
                        label: slotLabel
                    }
                });
                document.dispatchEvent(event);

                // Wait for generation to complete (listen for response)
                await this.waitForItemGeneration(slotId);

            } catch (error) {
                console.error(`Error generating item for ${slotId}:`, error);
            }
        }

        this.hideAutoEquipProgress();
        if (window.uiManager) {
            window.uiManager.showToast(i18n.t('characterSidebar.autoEquipComplete'), 'success');
        }
    }

    /**
     * Get mapping from slot ID to item type/subtype
     * For slots that support multiple subtypes (like armor), picks a random one
     */
    getSlotMapping() {
        // Helper to pick random subtype from OFFICIAL_ITEMS
        const pickRandomSubtype = (type, excludeShield = false) => {
            const items = window.OFFICIAL_ITEMS?.[type];
            if (!items) return null;

            const allSubtypes = [];
            for (const category in items) {
                if (Array.isArray(items[category])) {
                    // Exclude Shield from armor randomization
                    if (excludeShield && category === 'Shield') continue;
                    allSubtypes.push(...items[category]);
                }
            }
            if (allSubtypes.length > 0) {
                return allSubtypes[Math.floor(Math.random() * allSubtypes.length)];
            }
            return null;
        };

        // Pick random armor type (excluding Shield - it has its own slot)
        const randomArmor = pickRandomSubtype('armor', true) || 'Leather (עור)';
        // Pick random weapon for mainhand
        const randomWeapon = pickRandomSubtype('weapon') || 'Longsword (חרב ארוכה)';
        // Pick random ranged weapon
        const rangedItems = window.OFFICIAL_ITEMS?.weapon?.['Simple Ranged']?.concat(
            window.OFFICIAL_ITEMS?.weapon?.['Martial Ranged'] || []
        ) || [];
        const randomRanged = rangedItems.length > 0
            ? rangedItems[Math.floor(Math.random() * rangedItems.length)]
            : 'Longbow (קשת ארוכה)';

        return {
            'helmet': { type: 'wondrous', subtype: 'Helmet', label: 'קסדה' },
            'armor': { type: 'armor', subtype: randomArmor, label: 'שריון' },
            'mainhand': { type: 'weapon', subtype: randomWeapon, label: 'נשק' },
            'offhand': { type: 'armor', subtype: 'Shield (מגן)', label: 'מגן' },
            'ranged': { type: 'weapon', subtype: randomRanged, label: 'קשת' },
            'ring1': { type: 'ring', label: 'טבעת' },
            'ring2': { type: 'ring', label: 'טבעת' },
            'necklace': { type: 'wondrous', subtype: 'Amulet', label: 'שרשרת' },
            'cape': { type: 'wondrous', subtype: 'Cloak', label: 'גלימה' },
            'boots': { type: 'wondrous', subtype: 'Boots', label: 'מגפיים' },
            'belt': { type: 'wondrous', subtype: 'Belt', label: 'חגורה' },
            'gloves': { type: 'wondrous', subtype: 'Gloves', label: 'כפפות' },
            'ammo': { type: 'wondrous', subtype: 'Quiver', label: 'תחמושת' }
        };
    }

    /**
     * Wait for an item to be generated and equipped to a slot
     */
    waitForItemGeneration(slotId) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const slotEl = document.querySelector(`.slot[data-slot="${slotId}"] .slot-content`);
                if (slotEl && slotEl.querySelector('img')) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);

            // Timeout after 60 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 60000);
        });
    }

    /**
     * Export all equipped items to gallery
     */
    async exportAllToGallery() {
        const allSlots = ['helmet', 'armor', 'mainhand', 'offhand', 'ranged', 'ring1', 'ring2', 'necklace', 'cape', 'boots', 'belt', 'ammo'];
        const exportedItems = [];
        const statusEl = document.getElementById('export-status');
        const statusText = document.getElementById('export-status-text');
        const btn = document.getElementById('export-all-gallery-btn');

        // Show progress
        if (statusEl) statusEl.classList.remove('hidden');
        if (btn) btn.disabled = true;

        try {
            for (const slotId of allSlots) {
                const slotEl = document.querySelector(`.slot[data-slot="${slotId}"] .slot-content`);
                const img = slotEl ? slotEl.querySelector('img') : null;

                if (img && img.dataset.uniqueId) {
                    const uniqueId = img.dataset.uniqueId;
                    const cardData = this.itemRegistry.get(uniqueId);

                    if (cardData) {
                        // Get the front image from the slot
                        const frontImage = img.src;
                        const backImage = cardData.capturedBackImage || null;

                        // Create save data
                        const saveData = {
                            id: Date.now() + Math.random() * 1000, // Unique ID
                            cardData: { ...cardData },
                            thumbnail: frontImage,
                            name: cardData.name || cardData.front?.title || i18n.t('toasts.unnamed'),
                            savedAt: new Date().toISOString()
                        };

                        // Save to gallery
                        if (window.storageManager) {
                            await window.storageManager.saveCard(saveData);
                            exportedItems.push(saveData.name);

                            if (statusText) {
                                statusText.textContent = i18n.t('characterSidebar.exportingItem', { name: saveData.name });
                            }
                        }
                    }
                }
            }

            // Show success message
            if (exportedItems.length > 0) {
                if (window.uiManager) {
                    window.uiManager.showToast(
                        i18n.t('characterSidebar.exportComplete', { count: exportedItems.length }),
                        'success'
                    );
                }
                // Refresh gallery if open
                if (window.historyController) {
                    window.historyController.renderGrid();
                }
                // Also notify state manager
                if (window.stateManager) {
                    window.stateManager.notify('historyUpdated');
                }
            } else {
                if (window.uiManager) {
                    window.uiManager.showToast(i18n.t('characterSidebar.exportNoItems'), 'warning');
                }
            }

        } catch (error) {
            console.error('Export failed:', error);
            if (window.uiManager) {
                window.uiManager.showToast(i18n.t('toasts.saveError'), 'error');
            }
        } finally {
            // Hide progress
            if (statusEl) statusEl.classList.add('hidden');
            if (btn) btn.disabled = false;
        }
    }

    handleSlotClick(e) {
        // Stop propagation to prevent double triggers
        e.stopPropagation();

        const slotEl = e.target.closest('.slot');
        if (!slotEl) return;

        const slotId = slotEl.dataset.slot;
        const slotContent = slotEl.querySelector('.slot-content');
        const img = slotContent ? slotContent.querySelector('img') : null;

        // 1. Check for Quick Action Buttons
        const autoGenBtn = e.target.closest('.auto-gen-btn');

        if (autoGenBtn) {
            console.log('🖱️ Auto-gen button clicked for slot:', slotId);
            this.handleAutoGenerateSlot(slotId);
            return;
        }

        // 2. Default behavior (Clicking the slot center or image)
        if (img) {
            console.log('🖱️ Occupied slot clicked - showing viewer');
            this.showCardViewer(img);
        } else {
            console.log('🖱️ Empty slot clicked - navigating to creator');
            this.navigateToCreatorForSlot(slotId);
        }
    }

    /**
     * Trigger auto-generation for a single slot
     */
    async handleAutoGenerateSlot(slotId) {
        const slotMapping = this.getSlotMapping();
        const config = slotMapping[slotId];
        if (!config) return;

        // Get selected level and complexity from global UI if available
        const levelSelect = document.getElementById('auto-equip-level');
        const level = levelSelect ? levelSelect.value : '1-4';
        const complexitySelect = document.getElementById('auto-equip-complexity');
        const complexityMode = complexitySelect ? complexitySelect.value : 'simple';

        const slotLabel = i18n.t(`characterSheet.${slotId.replace(/\d/g, '')}`) || config.label;

        if (window.uiManager) {
            window.uiManager.showToast(i18n.t('characterSidebar.autoEquipProgress', { slot: slotLabel }), 'info');
        }

        try {
            // Dispatch custom event for generation
            const event = new CustomEvent('auto-equip-generate-item', {
                detail: {
                    slotId,
                    level,
                    complexityMode,
                    type: config.type,
                    subtype: config.subtype || '',
                    label: slotLabel
                }
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`Error triggering single auto-gen for ${slotId}:`, error);
        }
    }

    navigateToCreatorForSlot(slotId) {
        const mapping = {
            'helmet': { type: 'wondrous', subtype: 'Helmet', label: 'קסדה' }, // Changed to Wondrous
            'armor': { type: 'armor', subtype: 'Leather (עור)', label: 'שריון' },
            'mainhand': { type: 'weapon', label: 'נשק' },
            'offhand': { type: 'armor', subtype: 'Shield', label: 'מגן' },
            'ranged': { type: 'weapon', subtype: 'Bow', label: 'קשת' },
            'ring1': { type: 'ring', label: 'טבעת' },
            'ring2': { type: 'ring', label: 'טבעת' },
            'necklace': { type: 'wondrous', subtype: 'Amulet', label: 'שרשרת' },
            'cape': { type: 'wondrous', subtype: 'Cloak', label: 'גלימה' },
            'boots': { type: 'wondrous', subtype: 'Boots', label: 'מגפיים' },
            'belt': { type: 'wondrous', subtype: 'Belt', label: 'חגורה' }, // Changed to Wondrous
            'gloves': { type: 'wondrous', subtype: 'Gloves', label: 'כפפות' },
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
            window.uiManager.showToast(i18n.t('character.creatingItemFor', { label: config.label }), 'info');
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

    async equipToSlots(slots, imageUrl, cardName, cardData, isRenderedCard = false) {
        // Special case: Alternate slots (Main -> Off, Ring1 -> Ring2)
        // If we are here, it means we either had NO conflicts, or User Confirmed overwrite.

        // Generate full card thumbnail if we have enough data and it's not already rendered
        let displayImage = imageUrl;
        if (cardData && !isRenderedCard) {
            // If it's just the raw image, render the full card (both sides)
            console.log('🎨 CharacterController: Generating full card thumbnail (Front & Back)...');
            const thumbnails = await this.renderCardThumbnail(cardData, imageUrl);
            if (thumbnails) {
                displayImage = thumbnails.front;
                // Store back image in cardData for the viewer
                cardData.capturedBackImage = thumbnails.back;
            }
        }

        // Generate unique ID for this instance
        const uniqueId = 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Store data if provided
        if (cardData) {
            // Snapshot current settings to ensure the card looks the same when re-loaded for editing
            const currentSettings = JSON.parse(JSON.stringify(this.state.getState().settings || {}));

            const registryEntry = {
                ...cardData,
                settings: currentSettings,
                equippedAt: new Date().toISOString()
            };

            console.log('💾 Saving to itemRegistry:', uniqueId, 'with settings snapshot');
            this.itemRegistry.set(uniqueId, registryEntry);
        }

        slots.forEach(slotKey => {
            const slot = document.querySelector(`.slot[data-slot="${slotKey}"] .slot-content`);
            if (slot) {
                // PRUNE itemRegistry: If there's an existing item, remove its data to prevent memory leak
                const existingImg = slot.querySelector('img');
                if (existingImg && existingImg.dataset.uniqueId) {
                    const oldId = existingImg.dataset.uniqueId;
                    console.log('🧹 CharacterController: Pruning old item data from registry:', oldId);
                    this.itemRegistry.delete(oldId);
                }

                // Use displayImage (either the full card thumbnail or the original image)
                slot.innerHTML = `<img src="${displayImage}" data-item-name="${cardName ? cardName.replace(/"/g, '&quot;') : ''}" data-unique-id="${uniqueId}" class="equipped-item-icon" style="width:100%; height:100%; object-fit:contain;" />`;
            }
        });

        // Switch Tab
        const tabBtn = document.querySelector('.nav-tab[data-tab="character-sheet"]');
        if (tabBtn) tabBtn.click();

        if (window.uiManager) window.uiManager.showToast(i18n.t('character.successEquipped'), 'success');
    }

    /**
     * Render full card thumbnails (Front & Back) to an off-screen canvas
     * Returns { front, back } dataURLs
     * Uses shared CardThumbnailRenderer utility for consistency
     */
    async renderCardThumbnail(cardData, imageUrl) {
        // Import shared renderer dynamically to avoid circular dependencies
        const { renderCardThumbnail: sharedRender } = await import('../utils/CardThumbnailRenderer.ts');
        return sharedRender(cardData, imageUrl, this.state, true);
    }


    handleEquipRequest(data) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // Reset processing flag after a short delay (debounce)
        setTimeout(() => this.isProcessing = false, 500);

        const { cardData, imageUrl, isRenderedCard } = data;
        if (!cardData) return;

        // Extract Name (Handle V1 flattened vs V2 nested structure)
        const cardName = cardData.name || (cardData.front ? cardData.front.title : '') || "Unknown Item";

        // Check if item is ALREADY equipped anywhere
        const existingItem = document.querySelector(`.slot-content img[data-item-name="${CSS.escape(cardName)}"]`);
        if (existingItem) {
            if (window.uiManager) window.uiManager.showToast(i18n.t('character.alreadyEquipped', { name: cardName }), 'warning');
            return;
        }

        const result = this.getTargetSlots(cardData);
        if (!result) {
            if (window.uiManager) window.uiManager.showToast(i18n.t('character.noSlotFound'), 'error');
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
            this.promptConflict(conflicts, slots, imageUrl, itemLabel, cardName, cardData, isRenderedCard);
        } else {
            this.equipToSlots(slots, imageUrl, cardName, cardData, isRenderedCard);
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
        // --- QUIVER / AMMUNITION ---
        if (subtype.includes('Quiver') || subtype.includes('אשפה') ||
            nameLower.includes('אשפה') || nameLower.includes('תחמושת') ||
            nameLower.includes('חצים') || nameLower.includes('קליעים')) {
            console.log('  → Detected as AMMO');
            return { slots: ['ammo'], isTwoHanded: false, itemLabel: name };
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

    promptConflict(conflicts, slots, imageUrl, itemLabel, cardName, cardData, isRenderedCard) {
        const modal = document.getElementById('confirmation-modal');
        if (!modal) {
            // Fallback if modal missing
            if (confirm(`המיקום תפוס על ידי חפץ אחר. האם להחליף?`)) {
                this.equipToSlots(slots, imageUrl, cardName, cardData, isRenderedCard);
            }
            return;
        }

        const msg = modal.querySelector('.modal-message');
        if (msg) msg.textContent = i18n.t('character.conflictConfirm', { label: itemLabel });

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
            this.equipToSlots(slots, imageUrl, cardName, cardData, isRenderedCard);
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
            alert(i18n.t('character.apiKeyRequired'));
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
                alert(i18n.t('character.checkApiKey'));
            } else {
                alert(i18n.t('character.generationError', { error: error.message }));
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

            if (window.uiManager) window.uiManager.showToast(i18n.t('character.portraitUpdated'), 'success');
        }
    }

    setLoading(isLoading) {
        const status = document.getElementById('generation-status');
        const btn = document.getElementById('create-character-btn');
        if (status) status.classList.toggle('hidden', !isLoading);
        if (btn) btn.disabled = isLoading;
    }
}
