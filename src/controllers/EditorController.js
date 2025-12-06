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
            'edit-image-scale': 'imageScale',
            'image-rotation': 'imageRotation',
            'edit-image-rotation': 'imageRotation',
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
                slider.addEventListener('input', (e) => {
                    let val = parseFloat(e.target.value);
                    if (id === 'ability-offset') val += 530;

                    // DEBUG: Log width slider changes
                    if (id.includes('width')) {
                        console.log(`Slider ${id} changed to ${val}`);
                    }

                    this.state.updateOffset(sliders[id], val);
                    this.state.saveCurrentCard(); // Auto-save

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


