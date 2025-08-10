/**
 * Simple IndexedDB Storage
 * Simplified storage without complex abstractions
 */

/**
 * Simple IndexedDB Storage Class
 */
class SimpleStorage {
    constructor() {
        this.dbName = 'cascade-app';
        this.version = 5;
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Initialize storage
     */
    async init() {
        if (this.isInitialized) return true;

        if (!window.indexedDB) {
            throw new Error('IndexedDB not supported');
        }

        try {
            this.db = await this.openDatabase();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Storage init failed:', error);
            throw error;
        }
    }

    /**
     * Open IndexedDB database
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(new Error('Failed to open database'));
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create boards store
                if (!db.objectStoreNames.contains('boards')) {
                    const boardStore = db.createObjectStore('boards', { keyPath: 'id' });
                    boardStore.createIndex('name', 'name', { unique: false });
                }

                // Create settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Save application data
     * @param {Object} data - Data to save
     */
    async save(data) {
        await this.ensureInitialized();

        try {
            const transaction = this.db.transaction(['boards', 'settings'], 'readwrite');
            const boardStore = transaction.objectStore('boards');
            const settingsStore = transaction.objectStore('settings');

            // Clear and save boards
            await this.clearStore(boardStore);
            if (data.boards && data.boards.length > 0) {
                for (const board of data.boards) {
                    await this.putData(boardStore, board);
                }
            }

            // Save metadata
            await this.putData(settingsStore, {
                key: 'appData',
                currentBoardId: data.currentBoardId,
                filter: data.filter || 'all'
            });

            await this.waitForTransaction(transaction);
        } catch (error) {
            console.error('Save failed:', error);
            throw error;
        }
    }

    /**
     * Load application data
     */
    async load() {
        await this.ensureInitialized();

        try {
            const transaction = this.db.transaction(['boards', 'settings'], 'readonly');
            const boardStore = transaction.objectStore('boards');
            const settingsStore = transaction.objectStore('settings');

            // Load boards
            const boards = await this.getAllData(boardStore);
            
            // Load metadata
            const metadata = await this.getData(settingsStore, 'appData');

            return {
                boards: boards || [],
                currentBoardId: metadata?.currentBoardId || null,
                filter: metadata?.filter || 'all'
            };
        } catch (error) {
            console.error('Load failed:', error);
            return {
                boards: [],
                currentBoardId: null,
                filter: 'all'
            };
        }
    }

    /**
     * Clear all data
     */
    async clear() {
        await this.ensureInitialized();

        try {
            const transaction = this.db.transaction(['boards', 'settings'], 'readwrite');
            await this.clearStore(transaction.objectStore('boards'));
            await this.clearStore(transaction.objectStore('settings'));
            await this.waitForTransaction(transaction);
        } catch (error) {
            console.error('Clear failed:', error);
            throw error;
        }
    }

    /**
     * Get storage info
     */
    async getStorageInfo() {
        return {
            type: 'IndexedDB',
            available: !!window.indexedDB,
            initialized: this.isInitialized,
            database: this.dbName,
            version: this.version
        };
    }

    // Helper methods
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    putData(store, data) {
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Put operation failed'));
        });
    }

    getData(store, key) {
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Get operation failed'));
        });
    }

    getAllData(store) {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('GetAll operation failed'));
        });
    }

    clearStore(store) {
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Clear operation failed'));
        });
    }

    waitForTransaction(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error('Transaction failed'));
        });
    }
}

// Export singleton instance
export default new SimpleStorage();