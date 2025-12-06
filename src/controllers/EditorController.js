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
            'bg-scale': 'backgroundScale'
        };

        Object.keys(sliders).forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    let val = parseFloat(e.target.value);
                    if (id === 'ability-offset') val += 530;
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
    }

    setupTypeSelection() {
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
}
