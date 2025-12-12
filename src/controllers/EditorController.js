export class EditorController {
    constructor(stateManager) {
        this.state = stateManager;
        this.isFlipped = false; // State for UI toggle
        this.globalMarginY = 0; // Store global vertical offset
        this.globalMarginX = 0; // Store global horizontal offset
        this.setupListeners();
    }

    setupListeners() {
        this.setupFlipListener();
        this.setupInputListeners();
        this.setupSliderListeners();
        this.setupGlobalMarginListeners();
        this.setupFontListeners();
        this.setupTypeSelection();
        this.setupLevelSelection();
        this.setupColorPalette();

        // Subscribe to external state changes (e.g. History Load)
        this.state.subscribe((newState, key) => {
            if (key === 'cardData' || key === 'fullState') {
                this.syncUIFromState(newState);
            }
        });
    }

    syncUIFromState(state) {
        if (!state || !state.cardData) return;

        // 0. Sync Core Stats (Special Logic)
        const coreStatsInput = document.getElementById('edit-core-stats');
        if (coreStatsInput && state.cardData) {
            if (state.cardData.weaponDamage) {
                coreStatsInput.value = state.cardData.damageType
                    ? `${state.cardData.weaponDamage} ${state.cardData.damageType}`
                    : state.cardData.weaponDamage;
            } else if (state.cardData.armorClass) {
                coreStatsInput.value = state.cardData.armorClass; // Just the number usually
            } else {
                coreStatsInput.value = '';
            }
        }

        // 1. Sync Text Inputs
        const editInputs = {
            'edit-name': 'front.title',
            'edit-type': 'front.type',
            'edit-rarity': 'front.rarity',
            'edit-quick-stats': 'front.quickStats',
            'edit-ability-name': 'back.title',
            'edit-ability-desc': 'back.mechanics',
            'edit-desc': 'back.lore',
            'edit-gold': 'front.gold',
            'edit-core-stats': 'front.coreStats' // Added core stats input
        };
        Object.entries(editInputs).forEach(([id, path]) => {
            const input = document.getElementById(id);
            if (!input) return;

            // Resolve dot notation for reading
            let val = state.cardData;
            if (path.includes('.')) {
                const keys = path.split('.');
                for (const k of keys) {
                    val = val ? val[k] : undefined;
                }
            } else {
                val = val[path];
            }

            if (val !== undefined) {
                input.value = val;
            }
        });

        // 2. Sync Sliders (Offsets & Settings) - now from nested front/back structure
        const frontSliders = {
            'name-offset': 'name',
            'type-offset': 'type',
            'rarity-offset': 'rarity',
            'coreStats-offset': 'coreStats',
            'stats-offset': 'stats',
            'gold-offset': 'gold',
            'image-offset': 'imageYOffset',
            'image-scale': 'imageScale',
            'image-rotation': 'imageRotation',
            'image-fade': 'imageFade',
            'image-shadow': 'imageShadow',
            'bg-scale': 'backgroundScale',
            'name-width': 'nameWidth',
            'coreStats-width': 'coreStatsWidth',
            'stats-width': 'statsWidth'
        };

        const backSliders = {
            'ability-offset': 'abilityName',
            'mech-offset': 'mech',
            'lore-offset': 'lore',
            'ability-width': 'mechWidth',
            'lore-width': 'loreWidth'
        };

        // Sync front sliders
        if (state.settings && state.settings.front && state.settings.front.offsets) {
            Object.entries(frontSliders).forEach(([id, field]) => {
                const slider = document.getElementById(id);
                if (slider) {
                    if (state.settings.front.offsets[field] !== undefined) {
                        slider.value = state.settings.front.offsets[field];
                    } else if (field === 'coreStats') {
                        // Fallback for new key that might be missing in old localstorage
                        slider.value = 680;
                    }
                }
            });
        }

        // Sync back sliders
        if (state.settings && state.settings.back && state.settings.back.offsets) {
            Object.entries(backSliders).forEach(([id, field]) => {
                const slider = document.getElementById(id);
                if (slider && state.settings.back.offsets[field] !== undefined) {
                    slider.value = state.settings.back.offsets[field];
                }
            });
        }

        // 3. Sync Styles (Fonts)
        if (state.settings && state.settings.style) {
            const fontFamilySelect = document.getElementById('font-family-select');
            if (fontFamilySelect && state.settings.style.fontFamily) {
                fontFamilySelect.value = state.settings.style.fontFamily;
            }

            // Sync Image Style logic if needed
            const styleOption = document.getElementById('image-style-option');
            if (styleOption && state.settings.style.imageStyle) {
                styleOption.value = state.settings.style.imageStyle;
                styleOption.dispatchEvent(new Event('change'));
            }

            // Sync Image Color
            const colorInput = document.getElementById('image-bg-color');
            if (colorInput && state.settings.style.imageColor) {
                colorInput.value = state.settings.style.imageColor;
                // Update color swatch UI
                const palette = document.getElementById('color-palette');
                if (palette) {
                    palette.querySelectorAll('.color-swatch').forEach(s => {
                        if (s.dataset.value === state.settings.style.imageColor) s.classList.add('active');
                        else s.classList.remove('active');
                    });
                }
            }
        }

        // 4. Sync Font Bold/Italic checkboxes from nested structure
        const syncFontStyles = (fontStyles, prefix) => {
            if (!fontStyles) return;
            Object.entries(fontStyles).forEach(([key, val]) => {
                let type, field;
                if (key.endsWith('Bold')) {
                    type = 'bold';
                    field = key.replace('Bold', '');
                } else if (key.endsWith('Italic')) {
                    type = 'italic';
                    field = key.replace('Italic', '');
                } else if (key.endsWith('Glow')) {
                    type = 'glow';
                    field = key.replace('Glow', '');
                }
                if (type && field) {
                    const id = `style-${type}-${field}`;
                    const cb = document.getElementById(id);
                    if (cb) cb.checked = val;
                }
            });
        };

        if (state.settings?.front?.fontStyles) {
            syncFontStyles(state.settings.front.fontStyles);
        }
        if (state.settings?.back?.fontStyles) {
            syncFontStyles(state.settings.back.fontStyles);
        }

        // 5. Sync Font Size displays
        const syncFontSizeDisplays = (fontSizes) => {
            if (!fontSizes) return;
            Object.entries(fontSizes).forEach(([key, val]) => {
                const display = document.getElementById(`${key}-display`);
                if (display) display.textContent = `${val}px`;
            });
        };

        if (state.settings?.front?.fontSizes) {
            syncFontSizeDisplays(state.settings.front.fontSizes);
        }
        if (state.settings?.back?.fontSizes) {
            syncFontSizeDisplays(state.settings.back.fontSizes);
        }

        console.log("♻️ UI Synced from State");
    }


    setupFlipListener() {
        const btn = document.getElementById('flip-card-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.isFlipped = !this.isFlipped;
                // Sync with StateManager
                this.state.state.isFlipped = this.isFlipped;

                // Trigger flip animation on canvas container
                const canvasContainer = document.querySelector('.canvas-container');
                if (canvasContainer) {
                    // Remove previous animation class
                    canvasContainer.classList.remove('flipping');

                    // Force reflow to restart animation
                    void canvasContainer.offsetWidth;

                    // Add animation class
                    canvasContainer.classList.add('flipping');

                    // At the middle of the animation (90 degrees), update the card content
                    setTimeout(() => {
                        this.updateFlipState();
                    }, 250); // Half of the 500ms animation

                    // Remove animation class after it completes
                    setTimeout(() => {
                        canvasContainer.classList.remove('flipping');
                    }, 500);
                } else {
                    this.updateFlipState();
                }
            });
        }
    }

    updateFlipState() {
        const btn = document.getElementById('flip-card-btn');
        if (btn) {
            btn.classList.toggle('active', this.isFlipped);
            btn.innerHTML = this.isFlipped ? '↺ הצג קדימה' : '↻ הצג אחורה';
        }

        // Toggle Visibility of Edit Sections based on Card Face
        const frontControls = document.getElementById('front-controls');
        const backControls = document.getElementById('back-controls');

        if (frontControls && backControls) {
            if (this.isFlipped) {
                frontControls.classList.add('hidden');
                backControls.classList.remove('hidden');
            } else {
                frontControls.classList.remove('hidden');
                backControls.classList.add('hidden');
            }
        }

        // Dispatch event for RenderController to catch
        document.dispatchEvent(new CustomEvent('card-flip', { detail: { isFlipped: this.isFlipped } }));
    }

    setupInputListeners() {
        const editInputs = {
            'edit-name': 'front.title',
            'edit-type': 'front.type',
            'edit-rarity': 'front.rarity',
            'edit-quick-stats': 'front.quickStats',
            'edit-gold': 'front.gold',
            'edit-ability-name': 'back.title',
            'edit-ability-desc': 'back.mechanics',
            'edit-desc': 'back.lore'
        };

        Object.keys(editInputs).forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.state.updateCardField(editInputs[id], e.target.value);
                    this.state.saveCurrentCard(); // Auto-save
                });
            }
        });

        // Special Handler for Core Stats (Damage/AC)
        const coreStatsInput = document.getElementById('edit-core-stats');
        if (coreStatsInput) {
            coreStatsInput.addEventListener('input', (e) => {
                const val = e.target.value;
                const state = this.state.getState();
                const type = state.cardData?.originalParams?.type || 'weapon';

                if (type === 'armor') {
                    this.state.updateCardData({ armorClass: val });
                } else {
                    // For weapons, update weaponDamage and clear deprecated damageType
                    this.state.updateCardData({ weaponDamage: val, damageType: '' });
                }
                this.state.saveCurrentCard();
            });
        }
    }

    setupSliderListeners() {
        // Front-side sliders - route to front.offsets
        const frontSliders = {
            'name-offset': 'name',
            'type-offset': 'type',
            'rarity-offset': 'rarity',
            'coreStats-offset': 'coreStats',
            'stats-offset': 'stats',
            'gold-offset': 'gold',
            'image-offset': 'imageYOffset',
            'image-scale': 'imageScale',
            'image-rotation': 'imageRotation',
            'image-fade': 'imageFade',
            'image-shadow': 'imageShadow',
            'bg-scale': 'backgroundScale',
            'name-width': 'nameWidth',
            'type-width': 'typeWidth',
            'coreStats-width': 'coreStatsWidth',
            'stats-width': 'statsWidth'
        };

        // Back-side sliders - route to back.offsets
        const backSliders = {
            'ability-offset': 'abilityName',
            'mech-offset': 'mech',
            'lore-offset': 'lore',
            'ability-width': 'mechWidth',
            'lore-width': 'loreWidth'
        };

        // Combine all sliders
        const allSliders = { ...frontSliders, ...backSliders };

        Object.keys(allSliders).forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                let rafId = null;
                slider.addEventListener('input', (e) => {
                    const rawVal = e.target.value;

                    if (rafId) return;

                    rafId = requestAnimationFrame(() => {
                        let val = parseFloat(rawVal);

                        this.state.updateOffset(allSliders[id], val);

                        // Update displays
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

                        rafId = null;
                    });
                });

                // Save only when dragging stops
                slider.addEventListener('change', () => {
                    this.state.saveCurrentCard();
                });
            }
        });
    }

    setupGlobalMarginListeners() {
        const marginYSlider = document.getElementById('global-margin-y');
        const marginXSlider = document.getElementById('global-margin-x');
        const lockCheckbox = document.getElementById('global-margin-lock');
        const marginYDisplay = document.getElementById('global-margin-y-val');
        const marginXDisplay = document.getElementById('global-margin-x-val');

        if (!marginYSlider || !marginXSlider) return;

        // Store base values on first interaction
        let baseVerticalOffsets = null;
        let baseHorizontalWidths = null;

        // Elements with their default offset values (to determine direction from center)
        // FRONT SIDE elements
        const frontVerticalElements = {
            'rarity': -110,      // Top - moves down a lot
            'type': -50,         // Upper - moves down medium
            'name': -10,         // Upper-middle - moves down slightly
            'imageYOffset': 150, // Image below center - moves up when compressing
            'coreStats': 450,    // Lower area - moves up
            'stats': 550,        // Lower - moves up more
            'gold': 700          // Bottom - moves up most
        };

        // BACK SIDE elements
        const backVerticalElements = {
            'abilityName': 140,  // Top header
            'mech': 220,         // Body text
            'lore': 880          // Bottom lore
        };

        // Elements affected by horizontal compression (widths)
        const horizontalKeys = ['nameWidth', 'coreStatsWidth', 'statsWidth'];

        const DEFAULT_WIDTH = 500; // Base width

        let rafId = null;

        // Capture base values when slider is first touched
        const captureBaseValues = () => {
            // Select elements based on which side is being viewed
            const verticalElements = this.isFlipped ? backVerticalElements : frontVerticalElements;

            if (!baseVerticalOffsets) {
                baseVerticalOffsets = {};
                Object.keys(verticalElements).forEach(key => {
                    baseVerticalOffsets[key] = this.state.getOffset(key) ?? verticalElements[key];
                });
            }
            if (!baseHorizontalWidths) {
                baseHorizontalWidths = {};
                horizontalKeys.forEach(key => {
                    baseHorizontalWidths[key] = this.state.getOffset(key) || DEFAULT_WIDTH;
                });
            }
        };

        // Handle vertical compression/expansion
        marginYSlider.addEventListener('input', (e) => {
            captureBaseValues();
            const sliderValue = parseFloat(e.target.value);
            if (marginYDisplay) marginYDisplay.textContent = sliderValue;

            // Select elements based on which side is being viewed
            const verticalElements = this.isFlipped ? backVerticalElements : frontVerticalElements;

            // Compression factor: 0 = no change, positive = compress towards center
            const compressionFactor = sliderValue / 100; // -1 to 1 range

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                Object.keys(verticalElements).forEach(key => {
                    const baseVal = baseVerticalOffsets[key];
                    const defaultPos = verticalElements[key];

                    // Calculate movement based on distance from center
                    // Top elements (negative default) move DOWN when compressing
                    // Bottom elements (positive default) move UP when compressing
                    const direction = defaultPos < 0 ? 1 : -1; // Top moves +, Bottom moves -
                    const distance = Math.abs(defaultPos) / 100; // Normalize distance
                    const movement = compressionFactor * 30 * distance * direction;

                    const newVal = baseVal + movement;
                    this.state.updateOffset(key, newVal);
                });

                // If locked, also update X
                if (lockCheckbox && lockCheckbox.checked) {
                    marginXSlider.value = sliderValue;
                    if (marginXDisplay) marginXDisplay.textContent = sliderValue;

                    // Apply same factor to widths (positive = narrower)
                    horizontalKeys.forEach(key => {
                        const baseVal = baseHorizontalWidths[key];
                        const newVal = baseVal - (compressionFactor * 100);
                        this.state.updateOffset(key, Math.max(200, newVal)); // Min width 200
                    });
                }

                rafId = null;
            });
        });

        // Handle horizontal compression/expansion
        marginXSlider.addEventListener('input', (e) => {
            captureBaseValues();
            const sliderValue = parseFloat(e.target.value);
            if (marginXDisplay) marginXDisplay.textContent = sliderValue;

            // Compression factor for width
            const compressionFactor = sliderValue / 100;

            // Select elements based on which side is being viewed
            const verticalElements = this.isFlipped ? backVerticalElements : frontVerticalElements;

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                // Apply to widths (positive = narrower)
                horizontalKeys.forEach(key => {
                    const baseVal = baseHorizontalWidths[key];
                    const newVal = baseVal - (compressionFactor * 100);
                    this.state.updateOffset(key, Math.max(200, newVal)); // Min width 200
                });

                // If locked, also update Y
                if (lockCheckbox && lockCheckbox.checked) {
                    marginYSlider.value = sliderValue;
                    if (marginYDisplay) marginYDisplay.textContent = sliderValue;

                    Object.keys(verticalElements).forEach(key => {
                        const baseVal = baseVerticalOffsets[key];
                        const defaultPos = verticalElements[key];
                        const direction = defaultPos < 0 ? 1 : -1;
                        const distance = Math.abs(defaultPos) / 100;
                        const movement = compressionFactor * 30 * distance * direction;
                        const newVal = baseVal + movement;
                        this.state.updateOffset(key, newVal);
                    });
                }

                rafId = null;
            });
        });

        // Reset base values on mouseup so next interaction captures fresh values
        marginYSlider.addEventListener('change', () => {
            baseVerticalOffsets = null;
            baseHorizontalWidths = null;
            this.state.saveCurrentCard();
        });
        marginXSlider.addEventListener('change', () => {
            baseVerticalOffsets = null;
            baseHorizontalWidths = null;
            this.state.saveCurrentCard();
        });

        console.log('🎯 Global compression sliders initialized');
    }

    setupFontListeners() {
        // Font Family
        const fontFamilySelect = document.getElementById('font-family-select');
        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', (e) => {
                this.state.updateStyle('fontFamily', e.target.value);
            });
        }

        // Font Size Buttons
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                const action = btn.classList.contains('font-increase') ? 1 : -1;
                this.state.updateFontSize(target, action);
            });
        });

        // Font Style Checkboxes (Bold/Italic/Shadow)
        // Front side: name, type, rarity, stats, gold
        // Back side: abilityName, mech, lore
        const styleMap = [
            'name', 'type', 'rarity', 'coreStats', 'stats', 'gold', // Front
            'abilityName', 'mech', 'lore' // Back
        ];
        styleMap.forEach(key => {
            const boldId = `style-bold-${key}`;
            const italicId = `style-italic-${key}`;
            const shadowId = `style-shadow-${key}`;
            const glowId = `style-glow-${key}`; // NEW: Glow support

            const boldCb = document.getElementById(boldId);
            const italicCb = document.getElementById(italicId);
            const shadowCb = document.getElementById(shadowId);
            const glowCb = document.getElementById(glowId);

            if (boldCb) {
                boldCb.addEventListener('change', (e) => {
                    this.state.updateFontStyle(`${key}Bold`, e.target.checked);
                    this.state.saveCurrentCard();
                });
            }
            if (italicCb) {
                italicCb.addEventListener('change', (e) => {
                    this.state.updateFontStyle(`${key}Italic`, e.target.checked);
                    this.state.saveCurrentCard();
                });
            }
            if (shadowCb) {
                shadowCb.addEventListener('change', (e) => {
                    this.state.updateFontStyle(`${key}Shadow`, e.target.checked);
                    this.state.saveCurrentCard();
                });
            }
            if (glowCb) {
                glowCb.addEventListener('change', (e) => {
                    this.state.updateFontStyle(`${key}Glow`, e.target.checked);
                    this.state.saveCurrentCard();
                });
            }
        });

        // Image Style Options (Color Picker Toggle)
        const styleOption = document.getElementById('image-style-option');
        const colorContainer = document.getElementById('image-color-picker-container');
        const styleSelect = document.getElementById('image-style');

        if (styleOption && colorContainer) {
            styleOption.addEventListener('change', (e) => {
                const val = e.target.value;
                this.state.updateStyle('imageStyle', val); // Update state!

                if (val === 'colored-background') {
                    colorContainer.classList.remove('hidden');
                } else {
                    colorContainer.classList.add('hidden');
                }
            });
        }

        // Text Effect Controls
        const outlineCheckbox = document.getElementById('text-outline-enabled');
        const outlineControls = document.getElementById('text-outline-controls');
        const outlineWidthSlider = document.getElementById('text-outline-width');
        const outlineWidthVal = document.getElementById('text-outline-width-val');

        const shadowCheckbox = document.getElementById('text-shadow-enabled');
        const shadowControls = document.getElementById('text-shadow-controls');
        const shadowBlurSlider = document.getElementById('text-shadow-blur');
        const shadowBlurVal = document.getElementById('text-shadow-blur-val');

        if (outlineCheckbox) {
            outlineCheckbox.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.state.updateStyle('textOutlineEnabled', enabled);
                if (outlineControls) {
                    outlineControls.classList.toggle('hidden', !enabled);
                }
                this.state.saveCurrentCard();
            });
        }

        if (outlineWidthSlider) {
            outlineWidthSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                if (outlineWidthVal) outlineWidthVal.textContent = val;
                this.state.updateStyle('textOutlineWidth', val);
            });
            outlineWidthSlider.addEventListener('change', () => {
                this.state.saveCurrentCard();
            });
        }

        if (shadowCheckbox) {
            shadowCheckbox.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.state.updateStyle('textShadowEnabled', enabled);
                if (shadowControls) {
                    shadowControls.classList.toggle('hidden', !enabled);
                }
                this.state.saveCurrentCard();
            });
        }

        if (shadowBlurSlider) {
            shadowBlurSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                if (shadowBlurVal) shadowBlurVal.textContent = val;
                this.state.updateStyle('textShadowBlur', val);
            });
            shadowBlurSlider.addEventListener('change', () => {
                this.state.saveCurrentCard();
            });
        }

        // Text Backdrop Controls
        const backdropCheckbox = document.getElementById('text-backdrop-enabled');
        const backdropControls = document.getElementById('text-backdrop-controls');
        const backdropOpacitySlider = document.getElementById('text-backdrop-opacity');
        const backdropOpacityVal = document.getElementById('text-backdrop-opacity-val');

        if (backdropCheckbox) {
            console.log('EditorController: Backdrop checkbox found!');
            backdropCheckbox.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                console.log('EditorController: Backdrop checkbox changed:', enabled);
                this.state.updateStyle('textBackdropEnabled', enabled);
                if (backdropControls) {
                    backdropControls.classList.toggle('hidden', !enabled);
                }
                this.state.saveCurrentCard();
            });
        } else {
            console.warn('EditorController: Backdrop checkbox NOT found!');
        }

        if (backdropOpacitySlider) {
            backdropOpacitySlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                if (backdropOpacityVal) backdropOpacityVal.textContent = val + '%';
                this.state.updateStyle('textBackdropOpacity', val);
            });
            backdropOpacitySlider.addEventListener('change', () => {
                this.state.saveCurrentCard();
            });
        }
    }

    setupTypeSelection() {
        const typeSelect = document.getElementById('item-type');
        const noteType = document.getElementById('note-type');
        const noteSubtype = document.getElementById('note-subtype');
        const subtypeSelect = document.getElementById('item-subtype');

        // Setup Subtype Listener (once)
        if (subtypeSelect && noteSubtype) {
            subtypeSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                // Display simple text, store full value
                noteSubtype.textContent = val ? val.split('(')[0].trim() : '-';
                noteSubtype.dataset.value = val;
            });
        }

        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                const selectedType = e.target.value;

                // Sync Sticky Note Type
                if (noteType) {
                    const typeText = typeSelect.options[typeSelect.selectedIndex].text.split('(')[0].trim();
                    noteType.textContent = typeText;
                    noteType.dataset.value = selectedType;
                }
                // Reset Sticky Note Subtype
                if (noteSubtype) {
                    noteSubtype.textContent = '-';
                    noteSubtype.dataset.value = '';
                }

                // Update Subtypes UI (Existing Logic)
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

                // Toggle Weapon/Armor Fields
                const weaponFields = document.getElementById('weapon-fields');
                const armorFields = document.getElementById('armor-fields');
                if (weaponFields) weaponFields.classList.add('hidden');
                if (armorFields) armorFields.classList.add('hidden');

                if (selectedType === 'weapon' && weaponFields) weaponFields.classList.remove('hidden');
                else if (selectedType === 'armor' && armorFields) armorFields.classList.remove('hidden');
            });

            // Trigger initial change to populate UI if a value is already selected
            if (typeSelect.value) {
                typeSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    setupLevelSelection() {
        const levelSelect = document.getElementById('item-level');
        const noteLevel = document.getElementById('note-level');

        if (levelSelect && noteLevel) {
            levelSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                noteLevel.textContent = val;
                noteLevel.dataset.value = val;
            });
        }
    }

    setupColorPalette() {
        const palette = document.getElementById('color-palette');
        const input = document.getElementById('image-bg-color');
        if (!palette || !input) return;

        const colors = [
            '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
            '#ffff00', '#00ffff', '#ff00ff', '#8b4513', '#808080',
            '#e6e6fa', '#f0f8ff', '#f5f5dc', '#ffe4e1'
        ];

        palette.innerHTML = '';
        colors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-swatch';
            div.style.backgroundColor = color;
            div.dataset.value = color;
            div.onclick = () => {
                // Remove active class from all
                palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                div.classList.add('active');
                input.value = color; // Store simple hex
                this.state.updateStyle('imageColor', color); // Update state!
            };
            palette.appendChild(div);
        });

        // Manual Color Input
        if (input) {
            input.addEventListener('input', (e) => {
                this.state.updateStyle('imageColor', e.target.value);
            });
        }

        // Add custom color input logic if needed, but for now fixed palette
    }
}


