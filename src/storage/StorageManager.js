export class StorageManager {
    constructor(dbName = 'DndCardCreatorDB', storeName = 'cards') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.version = 2; // Increment version for schema change
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Cards Store
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('savedAt', 'savedAt', { unique: false });
                    store.createIndex('folder', 'folder', { unique: false }); // Index by folder
                    console.log(`StorageManager: Object store '${this.storeName}' created.`);
                } else {
                    // Upgrade existing store to add index if missing
                    const store = request.transaction.objectStore(this.storeName);
                    if (!store.indexNames.contains('folder')) {
                        store.createIndex('folder', 'folder', { unique: false });
                    }
                }

                // Folders Store
                if (!db.objectStoreNames.contains('folders')) {
                    const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
                    // Default folders?
                    console.log("StorageManager: 'folders' store created.");
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("StorageManager: IndexedDB connected successfully.");
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("StorageManager: Failed to open IndexedDB", event);
                reject(event.target.error);
            };
        });
    }

    /**
     * Save a card to the database
     * @param {Object} cardData - The full card object (must have 'id')
     * @returns {Promise<void>}
     */
    async saveCard(cardData) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(cardData); // put updates or inserts

            request.onsuccess = () => {
                console.log(`StorageManager: Card saved (ID: ${cardData.id})`);
                resolve();
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Get all cards from the database
     * @returns {Promise<Array>} Sorted by date descending (newest first)
     */
    async getAllCards() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                let items = request.result;
                // Sort by date descending
                items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
                resolve(items);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Delete a card by ID
     * @param {number} id 
     * @returns {Promise<void>}
     */
    async deleteCard(id) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`StorageManager: Card deleted (ID: ${id})`);
                resolve();
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Delete multiple cards
     * @param {Array<number>} ids 
     */
    async deleteCards(ids) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            let count = 0;
            let errorOccurred = false;

            ids.forEach(id => {
                const req = store.delete(id);
                req.onsuccess = () => {
                    count++;
                    if (count === ids.length) resolve();
                };
                req.onerror = (e) => {
                    if (!errorOccurred) {
                        errorOccurred = true;
                        reject(e.target.error);
                    }
                };
            });
        });
    }

    /**
     * Clear all data
     */
    async clearAll() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Save a specific folder
     * @param {Object} folder { id: string, name: string }
     */
    async saveFolder(folder) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['folders'], 'readwrite');
            const store = tx.objectStore('folders');
            const req = store.put(folder);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async getAllFolders() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['folders'], 'readonly');
            const store = tx.objectStore('folders');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async deleteFolder(id) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['folders'], 'readwrite');
            const store = tx.objectStore('folders');
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Export all data as JSON string
     */
    async exportData() {
        const cards = await this.getAllCards();
        const exportObj = {
            version: this.version,
            exportedAt: new Date().toISOString(),
            cards: cards
        };
        return JSON.stringify(exportObj, null, 2);
    }

    /**
     * Import data from JSON string
     * @param {string} jsonString 
     * @param {boolean} merge - If true, keeps existing cards. If false, clears DB first.
     */
    async importData(jsonString, merge = true) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.cards || !Array.isArray(data.cards)) {
                throw new Error("Invalid format: 'cards' array missing");
            }

            if (!merge) {
                await this.clearAll();
            }

            let loaded = 0;
            for (const card of data.cards) {
                // validate minimal fields
                if (card.id && card.cardData) {
                    await this.saveCard(card);
                    loaded++;
                }
            }
            return loaded;
        } catch (e) {
            console.error("Import failed:", e);
            throw e;
        }
    }
}

export const storageManager = new StorageManager();
window.storageManager = storageManager;
