import './storage/StorageManager.js';

/**
 * StateManager - Centralized state management for the D&D Card Creator
 * Handles application state, data updates, and event subscriptions.
 */
class StateManager {
    constructor() {
        this.state = {
            cardData: null,
            isFlipped: false, // Track which side is displayed
            settings: {
                // ===== FRONT SIDE SETTINGS =====
                front: {
                    fontSizes: {
                        nameSize: 64, // Large title
                        typeSize: 24,
                        raritySize: 24,
                        statsSize: 32,
                        coreStatsSize: 42, // NEW: Dedicated size for Damage/AC
                        goldSize: 32 // Large gold text
                    },
                    offsets: {
                        name: -10, // ~Y=250
                        type: -50, // ~Y=170
                        rarity: -110, // ~Y=130 (Top)
                        stats: 780, // Description ~Y=780
                        coreStats: 680, // Damage/AC ~Y=680 (Separate from description)
                        gold: 15, // ~Y=935
                        imageYOffset: 0,
                        imageScale: 1.0,
                        imageRotation: 0,
                        imageFade: 0,
                        imageShadow: 0,
                        backgroundScale: 1.0,
                        nameWidth: 543,
                        typeWidth: 500,
                        rarityWidth: 500,
                        coreStatsWidth: 500,
                        statsWidth: 500,
                        goldWidth: 500
                    },
                    fontStyles: {
                        nameBold: true, nameItalic: false,
                        typeBold: false, typeItalic: false,
                        rarityBold: false, rarityItalic: false,
                        statsBold: true, statsItalic: false,
                        coreStatsBold: true, coreStatsItalic: false,
                        goldBold: true, goldItalic: false
                    }
                },
                // ===== BACK SIDE SETTINGS =====
                back: {
                    fontSizes: {
                        abilityNameSize: 52, // Large header
                        mechSize: 32, // Readable body
                        loreSize: 24
                    },
                    offsets: {
                        abilityName: 140, // Y position (High)
                        mech: 220, // Start of body
                        lore: 880, // Bottom fade area
                        mechWidth: 600,
                        loreWidth: 550
                    },
                    fontStyles: {
                        abilityNameBold: true, abilityNameItalic: false,
                        mechBold: false, mechItalic: false,
                        loreBold: false, loreItalic: true
                    }
                },
                // ===== SHARED SETTINGS =====
                style: {
                    fontFamily: 'Heebo',
                    imageStyle: 'natural',
                    imageColor: '#ffffff',
                    // Text effects
                    textOutlineEnabled: false,
                    textOutlineWidth: 2,
                    textShadowEnabled: false,
                    textShadowBlur: 4,
                    textBackdropEnabled: false,
                    textBackdropOpacity: 40
                }
            },
            lastContext: null,
            lastVisualPrompt: null // Store last used visual prompt for regeneration
        };

        this.listeners = [];

        // Initialize DB
        this.initStorage();
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function receiving (newState, changedKey)
     * @returns {Function} - Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of state changes
     * @param {string} changedKey - The key that changed (e.g., 'cardData', 'settings.offsets')
     */
    /**
     * Notify all listeners of state changes
     * @param {string} changedKey - The key that changed (e.g., 'cardData', 'settings.offsets')
     */
    notify(changedKey) {
        this.listeners.forEach(listener => listener(this.state, changedKey));

        // Auto-save on meaningful changes
        if (changedKey === 'cardData' || changedKey.startsWith('cardData.') || changedKey.startsWith('settings.')) {
            this.saveCurrentCard();
        }
    }

    /**
     * Ensure data follows V2 structure (Front/Back)
     * @param {Object} data - Raw card data
     * @returns {Object} V2 Compliant Data
     */
    migrateToV2(data) {
        if (data.front && data.back) {
            return data; // Already V2
        }

        console.log("📦 Migrating Card Data to V2 (Double-Sided)...");

        // V1 -> V2 Migration
        return {
            id: data.id || Date.now(),
            timestamp: data.timestamp || Date.now(),
            front: {
                title: data.name || '',
                type: data.type || data.typeHe || '',
                rarity: data.rarity || data.rarityHe || '',
                imageUrl: data.imageUrl || null,
                imageStyle: data.imageStyle || 'natural',
                quickStats: data.quickStats || '', // NEW: Quick stats for front side
                gold: data.gold || '',
                badges: data.gold ? [data.gold] : []
            },
            back: {
                title: data.abilityName || '',
                mechanics: data.abilityDesc || '',
                lore: data.description || '' // Fluff maps to Lore
            },
            // Preserve weapon/armor stats at root for renderer access
            weaponDamage: data.weaponDamage || '',
            damageType: data.damageType || '',
            armorClass: data.armorClass || '',
            versatileDamage: data.versatileDamage || null,
            weaponProperties: data.weaponProperties || [],
            // Keep specific legacy fields if needed for direct access before full UI update
            // But ideally we rely on the new structure
            legacy: true
        };
    }

    /**
     * Set the entire card data
     * @param {Object} data - New card data
     */
    setCardData(data) {
        this.state.cardData = this.migrateToV2(data);

        // Merge existing font sizes/offsets if present in data
        if (data.fontSizes) {
            this.state.settings.fontSizes = { ...this.state.settings.fontSizes, ...data.fontSizes };
        }
        if (data.offsets) {
            this.state.settings.offsets = { ...this.state.settings.offsets, ...data.offsets };
        }
        this.notify('cardData');
    }

    /**
     * Update a specific field in card data
     * Supports dot notation: 'front.title', 'back.mechanics'
     * @param {string} path - Field path
     * @param {any} value - New value
     */
    updateCardField(path, value) {
        if (!this.state.cardData) return;

        // Handle Dot Notation for nested updates
        if (path.includes('.')) {
            const keys = path.split('.');
            let current = this.state.cardData;

            // Traverse to parent
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {}; // Create if missing
                current = current[keys[i]];
            }

            // Set value
            current[keys[keys.length - 1]] = value;
        } else {
            // Fallback for flat keys (should be avoided in V2)
            this.state.cardData[path] = value;
        }

        this.notify(`cardData.${path}`);
    }

    /**
     * Determine which side (front/back) an offset key belongs to
     * @param {string} key - Offset key
     * @returns {string} - 'front' or 'back'
     */
    _getSideForKey(key) {
        // Back-side specific keys
        const backKeys = ['abilityName', 'mech', 'lore', 'mechWidth', 'loreWidth'];
        if (backKeys.includes(key)) return 'back';

        // Front-side keys (default)
        return 'front';
    }

    /**
     * Update a specific offset setting
     * @param {string} key - Offset key
     * @param {number} value - New value
     */
    updateOffset(key, value) {
        const side = this._getSideForKey(key);
        if (!this.state.settings[side]) this.state.settings[side] = {};
        if (!this.state.settings[side].offsets) this.state.settings[side].offsets = {};

        this.state.settings[side].offsets[key] = value;
        this.notify(`settings.${side}.offsets.${key}`);
    }

    /**
     * Get a specific offset value
     * @param {string} key - Offset key
     * @returns {number|undefined} - Current offset value
     */
    getOffset(key) {
        const side = this._getSideForKey(key);
        return this.state.settings[side]?.offsets?.[key];
    }

    /**
     * Determine which side a font size key belongs to
     * @param {string} key - Font size key
     * @returns {string} - 'front' or 'back'
     */
    _getSideForFontSizeKey(key) {
        // Back-side specific font sizes
        const backKeys = ['abilityNameSize', 'mechSize', 'loreSize'];
        if (backKeys.includes(key)) return 'back';

        return 'front';
    }

    /**
     * Update a specific font size
     * @param {string} key - Font size key (e.g., 'nameSize')
     * @param {number} change - Amount to change (e.g., +2, -2)
     */
    updateFontSize(key, change) {
        const side = this._getSideForFontSizeKey(key);
        if (!this.state.settings[side]) this.state.settings[side] = {};
        if (!this.state.settings[side].fontSizes) this.state.settings[side].fontSizes = {};

        const current = this.state.settings[side].fontSizes[key] || 24;
        this.state.settings[side].fontSizes[key] = current + (change * 2);
        this.notify(`settings.${side}.fontSizes.${key}`);
    }

    /**
     * Update style settings
     * @param {string} key - Style key
     * @param {any} value - New value
     */
    updateStyle(key, value) {
        // Ensure style object exists
        if (!this.state.settings.style) {
            this.state.settings.style = {};
        }
        console.log('StateManager.updateStyle:', key, value, 'before:', this.state.settings.style[key]);
        this.state.settings.style[key] = value;
        console.log('StateManager.updateStyle:', key, 'after:', this.state.settings.style[key]);
        this.notify(`settings.style.${key}`);
    }

    /**
     * Determine which side a font style key belongs to
     * @param {string} key - Font style key (e.g., 'nameBold', 'mechItalic')
     * @returns {string} - 'front' or 'back'
     */
    _getSideForFontStyleKey(key) {
        // Back-side specific font styles (prefix-based)
        const backPrefixes = ['abilityName', 'mech', 'lore'];
        for (const prefix of backPrefixes) {
            if (key.startsWith(prefix)) return 'back';
        }
        return 'front';
    }

    /**
     * Update font style (bold/italic)
     * @param {string} key - e.g., 'nameBold'
     * @param {boolean} value 
     */
    updateFontStyle(key, value) {
        const side = this._getSideForFontStyleKey(key);
        if (!this.state.settings[side]) this.state.settings[side] = {};
        if (!this.state.settings[side].fontStyles) this.state.settings[side].fontStyles = {};

        this.state.settings[side].fontStyles[key] = value;
        this.notify(`settings.${side}.fontStyles.${key}`);
    }

    /**
     * Set the last context (e.g., background image URL)
     * @param {string} context - URL or data of the context
     */
    setLastContext(context) {
        this.state.lastContext = context;
        this.notify('lastContext');
    }

    /**
     * Set the last visual prompt (for image regeneration)
     * @param {string} prompt - The visual prompt used for image generation
     */
    setLastVisualPrompt(prompt) {
        this.state.lastVisualPrompt = prompt;
        console.log('💾 Saved lastVisualPrompt:', prompt?.substring(0, 50) + '...');
        // No notify needed - this is just for internal use
    }

    /**
     * Get current state
     * @returns {Object}
     */
    getState() {
        return this.state;
    }

    // ==================== localStorage Persistence ====================

    /**
     * Save current card to localStorage
     */
    saveCurrentCard() {
        if (!this.state.cardData) return;

        const saveData = {
            cardData: this.state.cardData,
            settings: this.state.settings,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem('dnd_current_card', JSON.stringify(saveData));
        console.log('💾 Card saved to localStorage');
    }

    /**
     * Load current card from localStorage
     * @returns {boolean} - Whether a card was loaded
     */
    loadCurrentCard() {
        try {
            const saved = localStorage.getItem('dnd_current_card');
            if (!saved) return false;

            const data = JSON.parse(saved);
            if (data.cardData) {
                // Clear blob URLs as they don't survive page refresh
                if (data.cardData.imageUrl && data.cardData.imageUrl.startsWith('blob:')) {
                    console.log('📂 Clearing stale blob URL from saved card');
                    data.cardData.imageUrl = null;
                }
                if (data.cardData.front?.imageUrl && data.cardData.front.imageUrl.startsWith('blob:')) {
                    console.log('📂 Clearing stale blob URL from saved card (front)');
                    data.cardData.front.imageUrl = null;
                }

                // Ensure data is V2 compliant (Migrate on load)
                this.state.cardData = this.migrateToV2(data.cardData);

                // Deep merge settings to preserve nested objects
                if (data.settings) {
                    this.state.settings = {
                        ...this.state.settings,
                        ...data.settings,
                        front: {
                            ...this.state.settings.front,
                            ...(data.settings.front || {}),
                            offsets: { ...this.state.settings.front.offsets, ...(data.settings.front?.offsets || {}) },
                            fontSizes: { ...this.state.settings.front.fontSizes, ...(data.settings.front?.fontSizes || {}) },
                            fontStyles: { ...this.state.settings.front.fontStyles, ...(data.settings.front?.fontStyles || {}) }
                        },
                        back: {
                            ...this.state.settings.back,
                            ...(data.settings.back || {}),
                            offsets: { ...this.state.settings.back.offsets, ...(data.settings.back?.offsets || {}) },
                            fontSizes: { ...this.state.settings.back.fontSizes, ...(data.settings.back?.fontSizes || {}) },
                            fontStyles: { ...this.state.settings.back.fontStyles, ...(data.settings.back?.fontStyles || {}) }
                        },
                        style: {
                            ...this.state.settings.style,
                            ...(data.settings.style || {})
                        }
                    };
                }
                this.notify('cardData');
                console.log('📂 Card loaded from localStorage');
                return true;
            }
        } catch (e) {
            console.error('Failed to load card from localStorage:', e);
        }
        return false;
    }

    /**
     * Save current card to history (max 20 cards)
     */
    // ==================== StorageManager Integration (IndexedDB) ====================

    /**
     * Initialize Storage and Migrate if needed
     */
    async initStorage() {
        if (!window.storageManager) return;

        // Check if migration is needed (if localStorage has items but DB is empty-ish)
        const localHistory = localStorage.getItem('dnd_card_history');
        if (localHistory) {
            try {
                const items = JSON.parse(localHistory);
                if (items.length > 0) {
                    console.log(`📦 Migrating ${items.length} items from localStorage to IndexedDB...`);
                    for (const item of items) {
                        await window.storageManager.saveCard(item);
                    }
                    // Clear localStorage after successful migration
                    localStorage.removeItem('dnd_card_history');
                    console.log("✅ Migration complete. LocalStorage history cleared.");
                }
            } catch (e) {
                console.error("Migration failed:", e);
            }
        }
    }

    /**
     * Save current card to history (IndexedDB)
     * @param {string} thumbnail - Base64 data URL
     */
    async saveToHistory(thumbnail = null) {
        if (!this.state.cardData) return;

        // Get base name from card data - check V2 format (front.title) first, then legacy name, then type
        let baseName = this.state.cardData.front?.title ||
            this.state.cardData.name ||
            this.state.cardData.type ||
            this.state.cardData.front?.rarity ||
            (window.i18n?.t('toasts.unnamed') || 'Unnamed Item');

        // Remove any existing number suffix for the base comparison
        baseName = baseName.replace(/\s*\d+$/, '').trim();

        // Get all existing cards to find duplicates
        const existingCards = await window.storageManager.getAllCards();

        // Find cards with the same base name
        let maxNumber = 0;
        existingCards.forEach(card => {
            if (card.name) {
                // Extract base name and number from existing card names
                const match = card.name.match(/^(.+?)\s*(\d+)?$/);
                if (match) {
                    const existingBase = match[1].trim();
                    const existingNum = parseInt(match[2]) || 1;

                    if (existingBase === baseName) {
                        maxNumber = Math.max(maxNumber, existingNum);
                    }
                }
            }
        });

        // Create unique name with incremented counter
        const uniqueName = `${baseName} ${maxNumber + 1}`;

        const historyItem = {
            id: Date.now(),
            name: uniqueName,
            cardData: this.state.cardData,
            settings: this.state.settings,
            thumbnail: thumbnail,
            savedAt: new Date().toISOString()
        };

        await window.storageManager.saveCard(historyItem);
        // We no longer maintain a local array, we notify listeners that 'history' changed
        // Consumers should call getHistory() which is now async or return a promise
        this.notify('historyUpdated');
        console.log(`📚 Card saved to DB as "${uniqueName}"`);
    }

    /**
     * Get card history from DB
     * @returns {Promise<Array>}
     */
    async getHistory() {
        return await window.storageManager.getAllCards();
    }

    /**
 * Load a card from history by ID
 * @param {number} id - Card ID
 * @returns {Promise<boolean>}
 */
    async loadFromHistory(id) {
        // We need to fetch all or find specific. getAll is fine for now.
        const history = await this.getHistory();
        const card = history.find(item => item.id === id);

        if (card) {
            // Clear blob URLs (they don't survive page refresh)
            // Handle both V1 (imageUrl) and V2 (front.imageUrl) formats
            if (card.cardData.imageUrl && card.cardData.imageUrl.startsWith('blob:')) {
                card.cardData.imageUrl = null;
            }
            if (card.cardData.front?.imageUrl && card.cardData.front.imageUrl.startsWith('blob:')) {
                card.cardData.front.imageUrl = null;
            }

            this.state.cardData = card.cardData;

            // Deep merge settings to preserve nested objects (front, back, style)
            if (card.settings) {
                this.state.settings = {
                    ...this.state.settings,
                    ...card.settings,
                    front: {
                        ...this.state.settings.front,
                        ...(card.settings.front || {}),
                        offsets: { ...this.state.settings.front.offsets, ...(card.settings.front?.offsets || {}) },
                        fontSizes: { ...this.state.settings.front.fontSizes, ...(card.settings.front?.fontSizes || {}) },
                        fontStyles: { ...this.state.settings.front.fontStyles, ...(card.settings.front?.fontStyles || {}) }
                    },
                    back: {
                        ...this.state.settings.back,
                        ...(card.settings.back || {}),
                        offsets: { ...this.state.settings.back.offsets, ...(card.settings.back?.offsets || {}) },
                        fontSizes: { ...this.state.settings.back.fontSizes, ...(card.settings.back?.fontSizes || {}) },
                        fontStyles: { ...this.state.settings.back.fontStyles, ...(card.settings.back?.fontStyles || {}) }
                    },
                    style: {
                        ...this.state.settings.style,
                        ...(card.settings.style || {})
                    }
                };
            }
            this.notify('cardData');
            console.log('📂 Card loaded from DB:', card.name);
            return true;
        }
        return false;
    }

    async deleteFromHistory(id) {
        await window.storageManager.deleteCard(id);
        this.notify('historyUpdated');
        console.log('🗑️ Card deleted from DB');
    }

    async clearHistory() {
        await window.storageManager.clearAll();
        this.notify('historyUpdated');
        console.log('🗑️ DB History cleared');
    }

    /**
     * Clear current saved card
     */
    clearCurrentCard() {
        localStorage.removeItem('dnd_current_card');
        this.state.cardData = null;
        this.notify('cardData');
        console.log('🗑️ Current card cleared');
    }
}

// Export singleton
export const stateManager = new StateManager();
window.stateManager = stateManager; // For debugging

