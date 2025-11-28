import { GeminiService } from './src/gemini-service.js';
import { CardRenderer } from './src/card-renderer.js';
import { OFFICIAL_ITEMS, ITEM_STATS } from './src/dnd-data.js';

console.log("Main.js: Imports done");

window.debugLog = [];
function log(msg) {
    console.log(msg);
    window.debugLog.push(msg);
    const debugDiv = document.getElementById('debug-log');
    if (debugDiv) {
        const line = document.createElement('div');
        line.textContent = msg;
        debugDiv.appendChild(line);
    }
}

// Toast Notification
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.background = '#d4af37';
    toast.style.color = '#000';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '10000';
    toast.style.fontWeight = 'bold';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

showToast("המערכת מוכנה! (JS Loaded)", 5000);

// --- DOM Elements ---
const form = document.getElementById('generator-form');
const apiKeyInput = document.getElementById('api-key');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const errorDiv = document.getElementById('error-message');
const downloadBtn = document.getElementById('download-btn');
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

// State
let currentCardData = null;

// Initialize Renderer
const renderer = new CardRenderer('card-canvas');

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

function updateLayout() {
    if (!currentCardData) return;

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

    renderer.render(currentCardData, offsets);
}

function populateEditor(data) {
    if (!data) return;

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
    // Could load from localStorage if needed
    console.log("Layout settings loaded");
}

// --- Event Listeners ---

// Content Editor Inputs
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

// Sliders
document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', updateLayout);
});

// Font Family
document.getElementById('font-family-select').addEventListener('change', updateLayout);

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

        // Update display
        const display = document.getElementById(`${target}-display`);
        if (display) display.textContent = `${newSize}px`;

        updateLayout();
    });
});

// --- Logic Functions ---

const handleRegenerateImage = async () => {
    if (!currentCardData || !currentCardData.visualPrompt) return;

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('נא להזין מפתח API');
        return;
    }

    try {
        loadingOverlay.classList.remove('hidden');
        loadingText.textContent = 'מצייר מחדש...';
        downloadBtn.disabled = true;

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
        downloadBtn.disabled = false;

    } catch (error) {
        console.error("Regen Image Error:", error);
        loadingOverlay.classList.add('hidden');
        downloadBtn.disabled = false;
        alert("שגיאה ביצירת תמונה מחדש");
    }
};

const handleRegenerateStats = async () => {
    if (!currentCardData || !currentCardData.originalParams) return;

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('נא להזין מפתח API');
        return;
    }

    try {
        loadingOverlay.classList.remove('hidden');
        loadingText.textContent = 'רוקח מחדש את הקסם...';
        downloadBtn.disabled = true;

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
        downloadBtn.disabled = false;

    } catch (error) {
        console.error("Regen Stats Error:", error);
        loadingOverlay.classList.add('hidden');
        downloadBtn.disabled = false;
        alert("שגיאה ביצירת נתונים מחדש");
    }
};

// --- Initialization ---

// Attach Regen Listeners
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

        const rarities = ['common', 'uncommon', 'rare', 'very rare', 'legendary'];
        document.getElementById('item-rarity').value = rarities[Math.floor(Math.random() * rarities.length)];

        const levels = ['1-4', '5-10', '11-16', '17+'];
        document.getElementById('item-level').value = levels[Math.floor(Math.random() * levels.length)];

        document.getElementById('item-ability').value = '';
        form.dispatchEvent(new Event('submit'));
    });
}

// Form Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('נא להזין מפתח API');
        return;
    }
    localStorage.setItem('gemini_api_key', apiKey);

    const formData = new FormData(form);
    const type = formData.get('type');
    const subtype = formData.get('subtype');
    const rarity = formData.get('rarity');
    const level = formData.get('level');
    const ability = formData.get('ability');
    const finalType = subtype || type;

    loadingOverlay.classList.remove('hidden');
    downloadBtn.disabled = true;
    if (regenerateControls) regenerateControls.classList.add('hidden');
    if (contentEditor) contentEditor.classList.add('hidden');
    errorDiv.classList.add('hidden');

    let isCancelled = false;
    const cancelBtn = document.getElementById('cancel-btn');
    const handleCancel = () => {
        isCancelled = true;
        loadingOverlay.classList.add('hidden');
        downloadBtn.disabled = false;
        if (regenerateControls && currentCardData) regenerateControls.classList.remove('hidden');
    };
    if (cancelBtn) cancelBtn.onclick = handleCancel;

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
            // log("Using mock generation");
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
                fontSizes: {
                    nameSize: 60,
                    typeSize: 24,
                    raritySize: 24,
                    abilityNameSize: 28,
                    abilityDescSize: 24,
                    descSize: 22,
                    goldSize: 24
                },
                offsets: {
                    name: 0,
                    type: 0,
                    rarity: 0,
                    abilityY: 530,
                    fluffPadding: 20,
                    gold: 0,
                    imageYOffset: 0
                }
            };
            // log("Mock data set");
        } else {
            // ... (keep existing else block logic if needed, but for now we focus on mock)
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
                name: itemDetails.name,
                typeHe: itemDetails.typeHe,
                rarityHe: itemDetails.rarityHe,
                abilityName: itemDetails.abilityName,
                abilityDesc: itemDetails.abilityDesc,
                description: itemDetails.description,
                gold: '400',
                imageUrl: imageUrl,
                requiresAttunement: itemDetails.requiresAttunement,
                weaponDamage: itemDetails.weaponDamage,
                damageType: itemDetails.damageType,
                armorClass: itemDetails.armorClass,
                visualPrompt: itemDetails.visualPrompt,
                originalParams: { level, type: finalType, rarity, ability },
                fontSizes: {
                    nameSize: 60,
                    typeSize: 24,
                    raritySize: 24,
                    abilityNameSize: 28,
                    abilityDescSize: 24,
                    descSize: 22,
                    goldSize: 24
                },
                offsets: {
                    name: 0,
                    type: 0,
                    rarity: 0,
                    abilityY: 530,
                    fluffPadding: 20,
                    gold: 0,
                    imageYOffset: 0
                }
            };
        }

        log("Hiding loading overlay");
        loadingOverlay.classList.add('hidden');
        const editor = document.getElementById('content-editor');
        log(`Editor element found: ${!!editor}`);
        if (editor) {
            log(`Editor classes before: ${editor.classList.toString()}`);
            editor.classList.remove('hidden');
            log(`Editor classes after: ${editor.classList.toString()}`);
            log("Calling populateEditor");
            populateEditor(currentCardData);
        }
        log("Calling updateLayout");
        updateLayout();
        downloadBtn.disabled = false;
        if (regenerateControls) regenerateControls.classList.remove('hidden');
        log("Generation complete");

    } catch (error) {
        log(`Error caught: ${error.message}`);
        console.error('Main.js Error:', error);
        loadingOverlay.classList.add('hidden');
        downloadBtn.disabled = false;
        errorDiv.textContent = `שגיאה: ${error.message}`;
        errorDiv.classList.remove('hidden');
    }
});

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

// Load Settings on Start
loadLayoutSettings();
const savedKey = localStorage.getItem('gemini_api_key');
if (savedKey) apiKeyInput.value = savedKey;

// Download
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `dnd-item-${Date.now()}.png`;
    link.href = document.getElementById('card-canvas').toDataURL();
    link.click();
});
