export class EditorController {
    constructor(stateManager) {
        this.state = stateManager;
        this.setupListeners();
    }

    setupListeners() {
        this.setupInputListeners();
        this.setupSliderListeners();
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

        // 1. Sync Text Inputs
        const editInputs = {
            'edit-name': 'name',
            'edit-type': 'typeHe',
            'edit-rarity': 'rarityHe',
            'edit-ability-name': 'abilityName',
            'edit-ability-desc': 'abilityDesc',
            'edit-desc': 'description',
            'edit-gold': 'gold'
        };
        Object.entries(editInputs).forEach(([id, field]) => {
            const input = document.getElementById(id);
            if (input && state.cardData[field] !== undefined) {
                input.value = state.cardData[field];
            }
        });

        // 2. Sync Sliders (Offsets & Settings)
        const sliders = {
            'name-offset': 'name',
            'type-offset': 'type',
            'rarity-offset': 'rarity',
            'ability-offset': 'abilityY',
            'fluff-offset': 'fluffPadding',
            'gold-offset': 'gold',
            'image-offset': 'imageYOffset',
            'image-scale': 'imageScale',
            'image-rotation': 'imageRotation',
            'image-fade': 'imageFade',
            'image-shadow': 'imageShadow',
            'bg-scale': 'backgroundScale',
            'name-width': 'nameWidth',
            'ability-width': 'abilityWidth',
            'fluff-width': 'fluffWidth'
        };

        if (state.settings && state.settings.offsets) {
            Object.entries(sliders).forEach(([id, field]) => {
                const slider = document.getElementById(id);
                if (slider && state.settings.offsets[field] !== undefined) {
                    let val = state.settings.offsets[field];
                    if (id === 'ability-offset') val -= 530; // Reverse logic
                    slider.value = val;

                    // Trigger input event manually to update labels/displays
                    // slider.dispatchEvent(new Event('input')); // Removed to prevent recursion (RenderController updates displays)
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

        // 4. Sync Font Bold/Italic checkboxes
        if (state.settings && state.settings.fontStyles) {
            Object.entries(state.settings.fontStyles).forEach(([key, val]) => {
                // key e.g. 'nameBold' -> id 'style-bold-name'
                // Map back: logic requires parsing key
                let type, field;
                if (key.endsWith('Bold')) {
                    type = 'bold';
                    field = key.replace('Bold', '');
                } else if (key.endsWith('Italic')) {
                    type = 'italic';
                    field = key.replace('Italic', '');
                }

                if (type && field) {
                    const id = `style-${type}-${field}`;
                    const cb = document.getElementById(id);
                    if (cb) cb.checked = val;
                }
            });
        }

        console.log("♻️ UI Synced from State");
    }


    setupInputListeners() {
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
                    this.state.updateCardField(editInputs[id], e.target.value);
                    this.state.saveCurrentCard(); // Auto-save
                });
            }
        });
    }

    setupSliderListeners() {
        const sliders = {
            'name-offset': 'name',
            'type-offset': 'type',
            'rarity-offset': 'rarity',
            'ability-offset': 'abilityY',
            'fluff-offset': 'fluffPadding',
            'gold-offset': 'gold',
            'image-offset': 'imageYOffset',
            'image-scale': 'imageScale',
            'image-rotation': 'imageRotation',
            'image-fade': 'imageFade',
            'image-shadow': 'imageShadow',
            'bg-scale': 'backgroundScale',
            'name-width': 'nameWidth',
            'ability-width': 'abilityWidth',
            'fluff-width': 'fluffWidth'
        };

        Object.keys(sliders).forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                let rafId = null;
                slider.addEventListener('input', (e) => {
                    const rawVal = e.target.value; // Capture value immediately

                    if (rafId) return; // Skip if already pending

                    rafId = requestAnimationFrame(() => {
                        let val = parseFloat(rawVal);
                        if (id === 'ability-offset') val += 530;

                        // DEBUG: Log width slider changes
                        if (id.includes('width')) {
                            // console.log(`Slider ${id} changed to ${val}`);
                        }

                        this.state.updateOffset(sliders[id], val);
                        // this.state.saveCurrentCard(); // Move auto-save to 'change' event to avoid spamming DB?

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
            } else {
                console.warn(`EditorController: Slider element "${id}" not found`);
            }
        });
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

        // Font Style Checkboxes (Bold/Italic)
        const styleMap = [
            'name', 'type', 'rarity', 'abilityName', 'abilityDesc', 'desc', 'gold'
        ];
        styleMap.forEach(key => {
            const boldId = `style-bold-${key}`;
            const italicId = `style-italic-${key}`;
            const boldCb = document.getElementById(boldId);
            const italicCb = document.getElementById(italicId);

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


