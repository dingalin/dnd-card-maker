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
                    backgroundScale: 1.0
                },
                style: {
                    fontFamily: 'Heebo',
                    imageStyle: 'natural',
                    imageColor: '#ffffff'
                }
            },
            lastContext: null // Store the last selected image/background URL
        };

        this.listeners = [];
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
    /**
     * Save current card to history (max 20 cards)
     * @param {string} thumbnail - Base64 data URL of the rendered card thumbnail
     */
    saveToHistory(thumbnail = null) {
        if (!this.state.cardData) return;

        const history = this.getHistory();

        const historyItem = {
            id: Date.now(),
            name: this.state.cardData.name || 'חפץ ללא שם',
            cardData: this.state.cardData,
            settings: this.state.settings,
            thumbnail: thumbnail, // Save the full visual preview
            savedAt: new Date().toISOString()
        };

        // Add to beginning of array
        history.unshift(historyItem);

        // Keep only last 20 items
        if (history.length > 20) {
            history.pop();
        }

        localStorage.setItem('dnd_card_history', JSON.stringify(history));
        console.log('📚 Card saved to history');
    }

    /**
     * Get card history from localStorage
     * @returns {Array} - Array of saved cards
     */
    getHistory() {
        try {
            const history = localStorage.getItem('dnd_card_history');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error('Failed to load history:', e);
            return [];
        }
    }

    /**
     * Load a card from history by ID
     * @param {number} id - Card ID
     * @returns {boolean} - Whether the card was loaded
     */
    loadFromHistory(id) {
        const history = this.getHistory();
        const card = history.find(item => item.id === id);

        if (card) {
            // Clear blob URLs as they don't survive page refresh
            if (card.cardData.imageUrl && card.cardData.imageUrl.startsWith('blob:')) {
                console.log('📂 Clearing stale blob URL from history card');
                card.cardData.imageUrl = null;
            }

            this.state.cardData = card.cardData;
            if (card.settings) {
                this.state.settings = { ...this.state.settings, ...card.settings };
            }
            this.notify('cardData');
            console.log('📂 Card loaded from history:', card.name);
            return true;
        }
        return false;
    }

    /**
     * Delete a card from history
     * @param {number} id - Card ID to delete
     */
    deleteFromHistory(id) {
        const history = this.getHistory().filter(item => item.id !== id);
        localStorage.setItem('dnd_card_history', JSON.stringify(history));
        console.log('🗑️ Card deleted from history');
    }

    /**
     * Clear all history
     */
    clearHistory() {
        localStorage.removeItem('dnd_card_history');
        console.log('🗑️ History cleared');
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

