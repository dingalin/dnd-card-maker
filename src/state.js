import './storage/StorageManager.js';

/**
 * StateManager - Centralized state management for the D&D Card Creator
 * Handles application state, data updates, and event subscriptions.
 */
class StateManager {
    constructor() {
        this.state = {
            cardData: null,
            settings: {
                fontSizes: {
                    nameSize: 48,
                    typeSize: 24,
                    raritySize: 24,
                    abilityNameSize: 28,
                    abilityDescSize: 24,
                    descSize: 22,
                    goldSize: 24
                },
                offsets: {
                    name: 50,
                    type: 27,
                    rarity: -59,
                    abilityY: 578,
                    fluffPadding: 20,
                    gold: 0,
                    imageYOffset: 0,
                    imageScale: 1.0,
                    imageRotation: 0,
                    imageFade: 0,
                    imageShadow: 0,
                    backgroundScale: 1.0,
                    nameWidth: 500,
                    typeWidth: 500,
                    rarityWidth: 500,
                    abilityWidth: 500,
                    fluffWidth: 500,
                    goldWidth: 500
                },
                style: {
                    fontFamily: 'Heebo',
                    imageStyle: 'natural',
                    imageColor: '#ffffff'
                },
                fontStyles: {
                    nameBold: true, nameItalic: false,
                    typeBold: false, typeItalic: false,
                    rarityBold: false, rarityItalic: false,
                    abilityNameBold: true, abilityNameItalic: false,
                    abilityDescBold: false, abilityDescItalic: false,
                    descBold: false, descItalic: true, // Fluff default italic
                    goldBold: true, goldItalic: false
                }
            },
            lastContext: null // Store the last selected image/background URL
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
    notify(changedKey) {
        this.listeners.forEach(listener => listener(this.state, changedKey));

        // Auto-save on meaningful changes
        if (changedKey === 'cardData' || changedKey.startsWith('cardData.') || changedKey.startsWith('settings.')) {
            this.saveCurrentCard();
        }
    }

    /**
     * Set the entire card data
     * @param {Object} data - New card data
     */
    setCardData(data) {
        this.state.cardData = { ...data };
        // Merge existing font sizes/offsets if present in data, otherwise keep current defaults
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
     * @param {string} field - Field name
     * @param {any} value - New value
     */
    updateCardField(field, value) {
        if (!this.state.cardData) return;
        this.state.cardData[field] = value;
        this.notify(`cardData.${field}`);
    }

    /**
     * Update a specific offset setting
     * @param {string} key - Offset key
     * @param {number} value - New value
     */
    updateOffset(key, value) {
        this.state.settings.offsets[key] = value;
        this.notify(`settings.offsets.${key}`);
    }

    /**
     * Update a specific font size
     * @param {string} key - Font size key (e.g., 'nameSize')
     * @param {number} change - Amount to change (e.g., +2, -2)
     */
    updateFontSize(key, change) {
        const current = this.state.settings.fontSizes[key] || 24;
        this.state.settings.fontSizes[key] = current + (change * 2);
        this.notify(`settings.fontSizes.${key}`);
    }

    /**
     * Update style settings
     * @param {string} key - Style key
     * @param {any} value - New value
     */
    updateStyle(key, value) {
        this.state.settings.style[key] = value;
        this.notify(`settings.style.${key}`);
    }

    /**
     * Update font style (bold/italic)
     * @param {string} key - e.g., 'nameBold'
     * @param {boolean} value 
     */
    updateFontStyle(key, value) {
        if (!this.state.settings.fontStyles) this.state.settings.fontStyles = {};
        this.state.settings.fontStyles[key] = value;
        this.notify(`settings.fontStyles.${key}`);
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

                this.state.cardData = data.cardData;
                if (data.settings) {
                    this.state.settings = { ...this.state.settings, ...data.settings };
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

        const historyItem = {
            id: Date.now(),
            name: this.state.cardData.name || 'חפץ ללא שם',
            cardData: this.state.cardData,
            settings: this.state.settings,
            thumbnail: thumbnail,
            savedAt: new Date().toISOString()
        };

        await window.storageManager.saveCard(historyItem);
        // We no longer maintain a local array, we notify listeners that 'history' changed
        // Consumers should call getHistory() which is now async or return a promise
        this.notify('historyUpdated');
        console.log('📚 Card saved to DB');
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
            // Clear blob URLs
            if (card.cardData.imageUrl && card.cardData.imageUrl.startsWith('blob:')) {
                card.cardData.imageUrl = null;
            }

            this.state.cardData = card.cardData;
            if (card.settings) {
                this.state.settings = { ...this.state.settings, ...card.settings };
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

