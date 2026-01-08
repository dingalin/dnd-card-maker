// Extend Window interface
declare global {
    interface Window {
        storageManager: StorageManager;
    }
}

// Types
export interface CardData {
    id: number;
    savedAt: string;
    folder?: string;
    cardData: unknown;
    [key: string]: unknown;
}

export interface Folder {
    id: string;
    name: string;
}

export interface ExportData {
    version: number;
    exportedAt: string;
    cards: CardData[];
}

export class StorageManager {
    private dbName: string;
    private storeName: string;
    private version: number;
    private db: IDBDatabase | null;
    private initFailed: boolean;
    private initPromise: Promise<IDBDatabase | null>;

    constructor(dbName: string = 'DndCardCreatorDB', storeName: string = 'cards') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.version = 2; // Increment version for schema change
        this.db = null;
        this.initFailed = false;
        this.initPromise = this.init();
    }

    async init(retryAfterDelete: boolean = false): Promise<IDBDatabase | null> {
        return new Promise((resolve) => {
            // Check if IndexedDB is available
            if (!window.indexedDB) {
                console.warn("StorageManager: IndexedDB not available in this browser.");
                this.initFailed = true;
                resolve(null);
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Cards Store
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('savedAt', 'savedAt', { unique: false });
                    store.createIndex('folder', 'folder', { unique: false }); // Index by folder
                    console.log(`StorageManager: Object store '${this.storeName}' created.`);
                } else {
                    // Upgrade existing store to add index if missing
                    try {
                        const store = request.transaction!.objectStore(this.storeName);
                        if (!store.indexNames.contains('folder')) {
                            store.createIndex('folder', 'folder', { unique: false });
                        }
                    } catch (e) {
                        console.warn("StorageManager: Could not upgrade store:", (e as Error).message);
                    }
                }

                // Folders Store
                if (!db.objectStoreNames.contains('folders')) {
                    db.createObjectStore('folders', { keyPath: 'id' });
                    console.log("StorageManager: 'folders' store created.");
                }
            };

            request.onsuccess = (event: Event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                this.initFailed = false;
                console.log("StorageManager: IndexedDB connected successfully.");
                resolve(this.db);
            };

            request.onerror = (event: Event) => {
                const error = (event.target as IDBOpenDBRequest).error;
                const errorName = error?.name || 'Unknown';
                const errorMessage = error?.message || 'No message';
                console.error(`StorageManager: Failed to open IndexedDB - ${errorName}: ${errorMessage}`);

                // If this is first attempt and it failed, try to delete and recreate
                if (!retryAfterDelete) {
                    console.warn("StorageManager: Attempting to delete corrupted database and retry...");
                    const deleteRequest = indexedDB.deleteDatabase(this.dbName);
                    deleteRequest.onsuccess = () => {
                        console.log("StorageManager: Old database deleted, retrying...");
                        this.init(true).then(resolve);
                    };
                    deleteRequest.onerror = () => {
                        console.error("StorageManager: Could not delete database. Storage may be corrupted.");
                        this.initFailed = true;
                        resolve(null); // Resolve with null to allow app to continue
                    };
                    deleteRequest.onblocked = () => {
                        console.warn("StorageManager: Database delete blocked. Close other tabs and refresh.");
                        this.initFailed = true;
                        resolve(null);
                    };
                } else {
                    console.error("StorageManager: Database recovery failed. Gallery features will be unavailable.");
                    this.initFailed = true;
                    resolve(null); // Resolve with null to allow app to continue without storage
                }
            };

            request.onblocked = () => {
                console.warn("StorageManager: Database upgrade blocked. Please close other tabs using this app.");
            };
        });
    }

    /**
     * Check if storage is available
     */
    isAvailable(): boolean {
        return this.db !== null && !this.initFailed;
    }

    /**
     * Save a card to the database
     */
    async saveCard(cardData: CardData): Promise<void> {
        await this.initPromise;
        if (!this.isAvailable()) {
            console.warn('StorageManager: Cannot save - database unavailable');
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(cardData); // put updates or inserts

            request.onsuccess = () => {
                console.log(`StorageManager: Card saved (ID: ${cardData.id})`);
                resolve();
            };

            request.onerror = (e: Event) => reject((e.target as IDBRequest).error);
        });
    }

    /**
     * Get all cards from the database
     */
    async getAllCards(): Promise<CardData[]> {
        await this.initPromise;
        if (!this.isAvailable()) {
            console.warn('StorageManager: Cannot get cards - database unavailable');
            return [];
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const items = request.result as CardData[];
                // Sort by date descending
                items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
                resolve(items);
            };

            request.onerror = (e: Event) => reject((e.target as IDBRequest).error);
        });
    }

    /**
     * Delete a card by ID
     */
    async deleteCard(id: number): Promise<void> {
        await this.initPromise;
        if (!this.isAvailable()) {
            console.warn('StorageManager: Cannot delete - database unavailable');
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`StorageManager: Card deleted (ID: ${id})`);
                resolve();
            };

            request.onerror = (e: Event) => reject((e.target as IDBRequest).error);
        });
    }

    /**
     * Delete multiple cards
     */
    async deleteCards(ids: number[]): Promise<void> {
        await this.initPromise;
        if (!this.isAvailable()) {
            console.warn('StorageManager: Cannot delete cards - database unavailable');
            return;
        }
        if (!ids || ids.length === 0) {
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            let count = 0;
            let errorOccurred = false;

            ids.forEach(id => {
                const req = store.delete(id);
                req.onsuccess = () => {
                    count++;
                    if (count === ids.length) resolve();
                };
                req.onerror = (e: Event) => {
                    if (!errorOccurred) {
                        errorOccurred = true;
                        reject((e.target as IDBRequest).error);
                    }
                };
            });
        });
    }

    /**
     * Clear all data
     */
    async clearAll(): Promise<void> {
        await this.initPromise;
        if (!this.isAvailable()) {
            console.warn('StorageManager: Cannot clear - database unavailable');
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = (e: Event) => reject((e.target as IDBRequest).error);
        });
    }

    /**
     * Save a specific folder
     */
    async saveFolder(folder: Folder): Promise<void> {
        await this.initPromise;
        if (!this.isAvailable()) {
            console.warn('StorageManager: Cannot save folder - database unavailable');
            return;
        }
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(['folders'], 'readwrite');
            const store = tx.objectStore('folders');
            const req = store.put(folder);
            req.onsuccess = () => resolve();
            req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
        });
    }

    async getAllFolders(): Promise<Folder[]> {
        await this.initPromise;
        if (!this.isAvailable()) {
            console.warn('StorageManager: Cannot get folders - database unavailable');
            return [];
        }
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(['folders'], 'readonly');
            const store = tx.objectStore('folders');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result as Folder[]);
            req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
        });
    }

    async deleteFolder(id: string): Promise<void> {
        await this.initPromise;
        if (!this.isAvailable()) {
            console.warn('StorageManager: Cannot delete folder - database unavailable');
            return;
        }
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(['folders'], 'readwrite');
            const store = tx.objectStore('folders');
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
        });
    }

    /**
     * Export all data as JSON string
     */
    async exportData(): Promise<string> {
        const cards = await this.getAllCards();
        const exportObj: ExportData = {
            version: this.version,
            exportedAt: new Date().toISOString(),
            cards: cards
        };
        return JSON.stringify(exportObj, null, 2);
    }

    /**
     * Import data from JSON string
     */
    async importData(jsonString: string, merge: boolean = true): Promise<number> {
        try {
            const data = JSON.parse(jsonString) as ExportData;
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
