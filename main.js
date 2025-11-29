// Imports removed for file:// compatibility
// Dependencies are loaded via script tags in index.html

console.log("Main.js: Imports done");

// --- Globals ---
let currentCardData = null;
let renderer;

// --- Initialization ---
initUI();
// Add delay to ensure DOM is ready for window manager
setTimeout(initWindowManager, 100);

window.debugLog = [];
function log(msg) {
    console.log(msg);
}

showToast("המערכת מוכנה! (JS Loaded)", 'success');

window.onerror = function (msg, url, line, col, error) {
    showToast(`שגיאה: ${msg}`, 'error');
    console.error("Global Error:", msg, url, line, col, error);
    return false;
};

window.addEventListener('unhandledrejection', function (event) {
    showToast(`שגיאה (Promise): ${event.reason}`, 'error');
    console.error("Unhandled Rejection:", event.reason);
});

// --- Helper Functions ---

function getDefaultFontSize(target) {
    const defaults = {
        nameSize: 60,
        typeSize: 24,
        raritySize: 24,
        abilityNameSize: 28,
        abilityDescSize: 24,
        descSize: 22,
        goldSize: 24
    };
    return defaults[target] || 24;
}

function getRarityFromLevel(level) {
    if (level === '1-4') return 'common';
    if (level === '5-10') return 'uncommon';
    if (level === '11-16') return 'rare';
    if (level === '17+') return 'legendary';
    return 'common'; // Default
}

async function updateLayout() {
    if (!currentCardData || !renderer) return;

    const nameOffset = parseInt(document.getElementById('name-offset').value) || 0;
    const typeOffset = parseInt(document.getElementById('type-offset').value) || 0;
    const rarityOffset = parseInt(document.getElementById('rarity-offset').value) || 0;
    const abilityOffset = parseInt(document.getElementById('ability-offset').value) || 0;
    const fluffOffset = parseInt(document.getElementById('fluff-offset').value) || 20;
    const goldOffset = parseInt(document.getElementById('gold-offset').value) || 0;
    const imageOffset = parseInt(document.getElementById('image-offset').value) || 0;
    const fontFamily = document.getElementById('font-family-select').value || 'Heebo';

    const offsets = {
        name: nameOffset,
        type: typeOffset,
        rarity: rarityOffset,
        abilityY: 530 + abilityOffset,
        fluffPadding: fluffOffset,
        gold: goldOffset,
        imageYOffset: imageOffset,
        fontFamily: fontFamily,
        fontSizes: currentCardData.fontSizes || {}
    };

    // Save offsets to current data
    currentCardData.offsets = offsets;

    await renderer.render(currentCardData, offsets);
}

function populateEditor(data) {
    if (!data) return;

    const editName = document.getElementById('edit-name');
    const editType = document.getElementById('edit-type');
    const editRarity = document.getElementById('edit-rarity');
    const editAbilityName = document.getElementById('edit-ability-name');
    const editAbilityDesc = document.getElementById('edit-ability-desc');
    const editDesc = document.getElementById('edit-desc');
    const editGold = document.getElementById('edit-gold');

    if (editName) editName.value = data.name || '';
    if (editType) editType.value = data.typeHe || '';
    if (editRarity) editRarity.value = data.rarityHe || '';
    if (editAbilityName) editAbilityName.value = data.abilityName || '';
    if (editAbilityDesc) editAbilityDesc.value = data.abilityDesc || '';
    if (editDesc) editDesc.value = data.description || '';
    if (editGold) editGold.value = data.gold || '';

    // Reset or set sliders
    if (data.offsets) {
        document.getElementById('name-offset').value = data.offsets.name || 0;
        document.getElementById('type-offset').value = data.offsets.type || 0;
        document.getElementById('rarity-offset').value = data.offsets.rarity || 0;
        document.getElementById('ability-offset').value = data.offsets.abilityY ? (data.offsets.abilityY - 530) : 0;
        document.getElementById('fluff-offset').value = data.offsets.fluffPadding || 20;
        document.getElementById('gold-offset').value = data.offsets.gold || 0;
        document.getElementById('image-offset').value = data.offsets.imageYOffset || 0;
    } else {
        // Defaults
        document.querySelectorAll('input[type="range"]').forEach(input => {
            if (input.id === 'fluff-offset') input.value = 20;
            else input.value = 0;
        });
    }

    // Update Font Size Displays
    if (data.fontSizes) {
        for (const [key, value] of Object.entries(data.fontSizes)) {
            const display = document.getElementById(`${key}-display`);
            if (display) display.textContent = `${value}px`;
        }
    }
}

function loadLayoutSettings() {
    console.log("Layout settings loaded");
}

// --- Main Logic ---

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Renderer
    try {
        renderer = new CardRenderer('card-canvas');
    } catch (e) {
        console.error("Renderer Init Error:", e);
        showToast("שגיאה בטעינת הקנבס: " + e.message, 'error');
    }

    // DOM Elements
    const form = document.getElementById('generator-form');
    const apiKeyInput = document.getElementById('api-key');
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
    const editName = document.getElementById('edit-name');
    const editType = document.getElementById('edit-type');
    const editRarity = document.getElementById('edit-rarity');
    const editAbilityName = document.getElementById('edit-ability-name');
    const editAbilityDesc = document.getElementById('edit-ability-desc');
    const editDesc = document.getElementById('edit-desc');
    const editGold = document.getElementById('edit-gold');

    // Load Settings
    loadLayoutSettings();
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey && apiKeyInput) apiKeyInput.value = savedKey;

    // Quick Presets Logic
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const rarity = btn.dataset.rarity;

            document.getElementById('item-type').value = type;

            showToast(`נבחרה תבנית: ${btn.title}`, 'info');
            document.getElementById('item-type').dispatchEvent(new Event('change'));
        });
    });

    // Editor Inputs Listeners
    [editName, editType, editRarity, editAbilityName, editAbilityDesc, editDesc, editGold].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                if (!currentCardData) return;
                currentCardData.name = editName.value;
                currentCardData.typeHe = editType.value;
                currentCardData.rarityHe = editRarity.value;
                currentCardData.abilityName = editAbilityName.value;
                currentCardData.abilityDesc = editAbilityDesc.value;
                currentCardData.description = editDesc.value;
                currentCardData.gold = editGold.value;
                updateLayout();
            });
        }
    });

    // Sliders Listeners
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('input', updateLayout);
    });

    // Font Family Listener
    const fontFamilySelect = document.getElementById('font-family-select');
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', updateLayout);
    }

    // Font Size Buttons
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentCardData) return;
            const target = btn.dataset.target;
            const action = btn.classList.contains('font-increase') ? 1 : -1;

            if (!currentCardData.fontSizes) currentCardData.fontSizes = {};
            const currentSize = currentCardData.fontSizes[target] || getDefaultFontSize(target);
            const newSize = currentSize + (action * 2);
            currentCardData.fontSizes[target] = newSize;

            const display = document.getElementById(`${target}-display`);
            if (display) display.textContent = `${newSize}px`;

            updateLayout();
        });
    });

    // Regen Image Logic
    const handleRegenerateImage = async () => {
        if (!currentCardData || !currentCardData.visualPrompt) return;

        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showToast('נא להזין מפתח API', 'warning');
            return;
        }

        try {
            loadingOverlay.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');
            if (skeletonOverlay) skeletonOverlay.classList.remove('hidden');
            loadingText.textContent = 'מצייר מחדש...';
            if (downloadBtn) downloadBtn.disabled = true;

            const styleSelect = document.getElementById('image-style');
            const style = styleSelect ? styleSelect.value : 'realistic';

            if (apiKey.toLowerCase().includes('mock')) {
                await new Promise(r => setTimeout(r, 1000));
                currentCardData.imageUrl = "https://placehold.co/512x512/1a1a1a/ffffff?text=New+Image";
            } else {
                const gemini = new GeminiService(apiKey);
                const model = imageModelSelect ? imageModelSelect.value : 'flux';
                const imageUrl = await gemini.generateItemImage(currentCardData.visualPrompt, model, style);
                currentCardData.imageUrl = imageUrl;
            }

            updateLayout();
            loadingOverlay.classList.add('hidden');
            if (downloadBtn) downloadBtn.disabled = false;

        } catch (error) {
            console.error("Regen Image Error:", error);
            loadingOverlay.classList.add('hidden');
            if (downloadBtn) downloadBtn.disabled = false;
            showToast("שגיאה ביצירת תמונה מחדש", 'error');
        }
    };

    // Regen Stats Logic
    const handleRegenerateStats = async () => {
        if (!currentCardData || !currentCardData.originalParams) return;

        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showToast('נא להזין מפתח API', 'warning');
            return;
        }

        try {
            loadingOverlay.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');
            if (skeletonOverlay) skeletonOverlay.classList.remove('hidden');
            loadingText.textContent = 'רוקח מחדש את הקסם...';
            if (downloadBtn) downloadBtn.disabled = true;

            if (apiKey.toLowerCase().includes('mock')) {
                await new Promise(r => setTimeout(r, 1000));
                currentCardData.name = "שם חדש ומגניב";
                currentCardData.description = "תיאור חדש לחלוטין שנוצר באופן אקראי.";
            } else {
                const gemini = new GeminiService(apiKey);
                const { level, type, rarity, ability } = currentCardData.originalParams;
                const itemDetails = await gemini.generateItemDetails(level, type, rarity, ability);

                currentCardData.name = itemDetails.name;
                currentCardData.typeHe = itemDetails.typeHe;
                currentCardData.rarityHe = itemDetails.rarityHe;
                currentCardData.abilityName = itemDetails.abilityName;
                currentCardData.abilityDesc = itemDetails.abilityDesc;
                currentCardData.description = itemDetails.description;

                if (type === 'weapon') {
                    currentCardData.weaponDamage = itemDetails.weaponDamage;
                    currentCardData.damageType = itemDetails.damageType;
                } else if (type === 'armor') {
                    currentCardData.armorClass = itemDetails.armorClass;
                }
            }

            populateEditor(currentCardData);
            updateLayout();
            loadingOverlay.classList.add('hidden');
            if (downloadBtn) downloadBtn.disabled = false;

        } catch (error) {
            console.error("Regen Stats Error:", error);
            loadingOverlay.classList.add('hidden');
            if (downloadBtn) downloadBtn.disabled = false;
            showToast("שגיאה ביצירת נתונים מחדש", 'error');
        }
    };

    if (regenImageBtn) regenImageBtn.addEventListener('click', handleRegenerateImage);
    if (regenStatsBtn) regenStatsBtn.addEventListener('click', handleRegenerateStats);

    // Surprise Me
    if (surpriseBtn) {
        surpriseBtn.addEventListener('click', () => {
            const types = Object.keys(OFFICIAL_ITEMS);
            const randomType = types[Math.floor(Math.random() * types.length)];
            const typeSelect = document.getElementById('item-type');
            typeSelect.value = randomType;
            typeSelect.dispatchEvent(new Event('change'));

            const categories = OFFICIAL_ITEMS[randomType];
            const allSubtypes = [];
            for (const category in categories) {
                allSubtypes.push(...categories[category]);
            }
            const randomSubtype = allSubtypes[Math.floor(Math.random() * allSubtypes.length)];
            const subtypeSelect = document.getElementById('item-subtype');
            subtypeSelect.value = randomSubtype;
            subtypeSelect.dispatchEvent(new Event('change'));

            const levels = ['1-4', '5-10', '11-16', '17+'];
            document.getElementById('item-level').value = levels[Math.floor(Math.random() * levels.length)];

            document.getElementById('item-ability').value = '';
            form.dispatchEvent(new Event('submit'));
        });
    }

    // Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const apiKey = apiKeyInput.value.trim();
            if (!apiKey) {
                showToast('נא להזין מפתח API', 'warning');
                return;
            }
            localStorage.setItem('gemini_api_key', apiKey);

            const formData = new FormData(form);
            const type = formData.get('type');
            const subtype = formData.get('subtype');
            const level = formData.get('level');
            const rarity = getRarityFromLevel(level);
            const ability = formData.get('ability');
            const finalType = subtype || type;

            loadingOverlay.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');
            if (skeletonOverlay) skeletonOverlay.classList.remove('hidden');
            if (downloadBtn) downloadBtn.disabled = true;
            if (regenerateControls) regenerateControls.classList.add('hidden');
            if (contentEditor) contentEditor.classList.add('hidden');
            if (errorDiv) errorDiv.classList.add('hidden');

            let isCancelled = false;
            const cancelBtn = document.getElementById('cancel-btn');
            const handleCancel = () => {
                isCancelled = true;
                loadingOverlay.classList.add('hidden');
                if (downloadBtn) downloadBtn.disabled = false;
                if (regenerateControls && currentCardData) regenerateControls.classList.remove('hidden');
            };
            if (cancelBtn) cancelBtn.onclick = handleCancel;

            // Capture existing settings
            let existingFontSizes = {
                nameSize: 60,
                typeSize: 24,
                raritySize: 24,
                abilityNameSize: 28,
                abilityDescSize: 24,
                descSize: 22,
                goldSize: 24
            };
            let existingOffsets = {
                name: 0,
                type: 0,
                rarity: 0,
                abilityY: 530,
                fluffPadding: 20,
                gold: 0,
                imageYOffset: 0
            };

            if (currentCardData && currentCardData.fontSizes) {
                existingFontSizes = { ...currentCardData.fontSizes };
            }
            if (currentCardData && currentCardData.offsets) {
                existingOffsets = { ...currentCardData.offsets };
            }

            try {
                const attunementCheckbox = document.getElementById('attunement');
                const weaponDamageInput = document.getElementById('weapon-damage');
                const damageTypeSelect = document.getElementById('damage-type');
                const armorClassInput = document.getElementById('armor-class');
                const styleSelect = document.getElementById('image-style');

                const requiresAttunement = attunementCheckbox ? attunementCheckbox.checked : false;
                const weaponDamage = weaponDamageInput ? weaponDamageInput.value.trim() : '';
                const damageType = damageTypeSelect ? damageTypeSelect.value : '';
                const armorClass = armorClassInput ? armorClassInput.value.trim() : '';
                const style = styleSelect ? styleSelect.value : 'realistic';

                if (apiKey.toLowerCase().includes('mock')) {
                    await new Promise(r => setTimeout(r, 1000));
                    if (isCancelled) return;
                    loadingText.textContent = 'מייצר נתונים מדומים...';
                    await new Promise(r => setTimeout(r, 500));
                    if (isCancelled) return;

                    const mockDetails = {
                        name: "חרב האור הגנוז",
                        typeHe: "חרב ארוכה, אגדי",
                        rarityHe: "אגדי",
                        abilityName: "להב השמש",
                        abilityDesc: "החרב זוהרת באור יקרות ברדיוס 9 מטר. התקפות נגד אל-מתים גורמות 2ק8 נזק קורן נוסף.",
                        description: "החרב עשויה ממתכת זהובה שאינה מחלידה לעולם, וניצב החרב משובץ באבן חן המזכירה את השמש בצהרי היום.\n\n(לחץ Enter כדי להוסיף שורות חדשות)",
                        visualPrompt: "Glowing golden sword"
                    };
                    const mockImage = "https://placehold.co/512x512/2c1810/d4af37?text=Mock+Item";

                    currentCardData = {
                        name: mockDetails.name,
                        typeHe: mockDetails.typeHe,
                        rarityHe: mockDetails.rarityHe,
                        abilityName: mockDetails.abilityName,
                        abilityDesc: mockDetails.abilityDesc,
                        description: mockDetails.description,
                        gold: '5000',
                        imageUrl: mockImage,
                        requiresAttunement: requiresAttunement,
                        weaponDamage: type === 'weapon' ? (weaponDamage || '1d8') : null,
                        damageType: type === 'weapon' ? (damageType || 'slashing') : null,
                        armorClass: type === 'armor' ? (armorClass || '18') : null,
                        visualPrompt: mockDetails.visualPrompt,
                        originalParams: { level, type: finalType, rarity, ability },
                        fontSizes: existingFontSizes,
                        offsets: existingOffsets
                    };
                } else {
                    const gemini = new GeminiService(apiKey);
                    loadingText.textContent = 'רוקח את הסיפור...';
                    const itemDetails = await gemini.generateItemDetails(level, finalType, rarity, ability);
                    if (isCancelled) return;

                    itemDetails.requiresAttunement = requiresAttunement;
                    if (type === 'weapon') {
                        itemDetails.weaponDamage = weaponDamage || itemDetails.weaponDamage;
                        itemDetails.damageType = damageType || itemDetails.damageType;
                    } else if (type === 'armor') {
                        itemDetails.armorClass = armorClass || itemDetails.armorClass;
                    }

                    loadingText.textContent = 'מצייר את החפץ...';
                    const model = imageModelSelect ? imageModelSelect.value : 'flux';
                    const imageUrl = await gemini.generateItemImage(itemDetails.visualPrompt, model, style);
                    if (isCancelled) return;

                    currentCardData = {
                        ...itemDetails,
                        gold: '1000', // Default gold
                        imageUrl: imageUrl,
                        originalParams: { level, type: finalType, rarity, ability },
                        fontSizes: existingFontSizes,
                        offsets: existingOffsets
                    };
                }

                populateEditor(currentCardData);
                await updateLayout();

                loadingOverlay.classList.add('hidden');
                if (skeletonOverlay) skeletonOverlay.classList.add('hidden');
                if (regenerateControls) regenerateControls.classList.remove('hidden');
                if (contentEditor) contentEditor.classList.remove('hidden');
                if (downloadBtn) downloadBtn.disabled = false;

            } catch (error) {
                console.error("Generation Error:", error);
                loadingOverlay.classList.add('hidden');
                if (skeletonOverlay) skeletonOverlay.classList.add('hidden');
                if (downloadBtn) downloadBtn.disabled = false;
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('hidden');
                }
            }
        });
    }

    // Dynamic Fields Logic
    const typeSelect = document.getElementById('item-type');
    const subtypeContainer = document.getElementById('subtype-container');
    const subtypeSelect = document.getElementById('item-subtype');
    const weaponFields = document.getElementById('weapon-fields');
    const armorFields = document.getElementById('armor-fields');
    const weaponDamageInput = document.getElementById('weapon-damage');
    const damageTypeSelect = document.getElementById('damage-type');
    const armorClassInput = document.getElementById('armor-class');

    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            const selectedType = typeSelect.value;
            if (subtypeSelect) {
                subtypeSelect.innerHTML = '<option value="">-- בחר חפץ --</option>';
                if (OFFICIAL_ITEMS[selectedType]) {
                    subtypeContainer.classList.remove('hidden');
                    const categories = OFFICIAL_ITEMS[selectedType];
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
                } else {
                    subtypeContainer.classList.add('hidden');
                }
            }
            if (weaponFields) weaponFields.classList.add('hidden');
            if (armorFields) armorFields.classList.add('hidden');
            if (selectedType === 'weapon' && weaponFields) weaponFields.classList.remove('hidden');
            else if (selectedType === 'armor' && armorFields) armorFields.classList.remove('hidden');
        });

        if (subtypeSelect) {
            subtypeSelect.addEventListener('change', () => {
                const selectedSubtype = subtypeSelect.value;
                const stats = ITEM_STATS[selectedSubtype];
                if (stats) {
                    if (stats.damage && weaponDamageInput) weaponDamageInput.value = stats.damage;
                    if (stats.damageType && damageTypeSelect) damageTypeSelect.value = stats.damageType;
                    if (stats.ac && armorClassInput) armorClassInput.value = stats.ac;
                }
            });
        }
    }

    // Download Button (Toolbar)
    if (downloadBtnToolbar) {
        downloadBtnToolbar.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `dnd-item-${Date.now()}.png`;
            link.href = document.getElementById('card-canvas').toDataURL();
            link.click();
        });
    }

    // Download Button (Original)
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `dnd-item-${Date.now()}.png`;
            link.href = document.getElementById('card-canvas').toDataURL();
            link.click();
        });
    }
});
