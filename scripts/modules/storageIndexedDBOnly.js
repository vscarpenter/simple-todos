/**
 * IndexedDB-Only Storage API
 * Pure IndexedDB implementation without localStorage fallback
 */

import eventBus from './eventBus.js';
import { settingsManager, debugLog } from './settings.js';
import { generateUniqueId } from './utils.js';

/**
 * IndexedDB-Only Storage API
 */
class IndexedDBOnlyStorage {
    constructor() {
        this.dbName = 'cascade-app';
        this.version = 5;
        this.db = null;
        this.isInitialized = false;
        
        // Store configuration
        this.stores = {
            boards: {
                keyPath: 'id',
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'createdDate', keyPath: 'createdDate', unique: false },
                    { name: 'isDefault', keyPath: 'isDefault', unique: false },
                    { name: 'isArchived', keyPath: 'isArchived', unique: false }
                ]
            },
            tasks: {
                keyPath: 'id',
                indexes: [
                    { name: 'boardId', keyPath: 'boardId', unique: false },
                    { name: 'status', keyPath: 'status', unique: false },
                    { name: 'createdDate', keyPath: 'createdDate', unique: false }
                ]
            },
            settings: {
                keyPath: 'key',
                indexes: []
            },
            metadata: {
                keyPath: 'key',
                indexes: []
            }
        };

        this.init();
    }

    /**
     * Initialize IndexedDB storage
     */
    async init() {
        if (this.isInitialized) {
            return true;
        }

        if (!window.indexedDB) {
            throw new Error('IndexedDB not supported in this browser');
        }

        try {
            this.db = await this.openDatabase();
            this.isInitialized = true;
            
            debugLog.log('🗄️ IndexedDB storage initialized successfully');
            
            // Initialize first-time setup
            await this.initializeFirstTimeSetup();
            
            return true;
        } catch (error) {
            console.error('IndexedDB initialization failed:', error);
            throw new Error(`Storage initialization failed: ${error.message}`);
        }
    }

    /**
     * Open IndexedDB database
     * @returns {Promise<IDBDatabase>}
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create or update object stores
                Object.entries(this.stores).forEach(([storeName, storeConfig]) => {
                    let objectStore;
                    
                    if (db.objectStoreNames.contains(storeName)) {
                        // Store exists, we might need to update indexes
                        // For now, just continue - indexes will be managed during transaction
                        return;
                    }
                    
                    // Create new object store
                    objectStore = db.createObjectStore(storeName, { 
                        keyPath: storeConfig.keyPath 
                    });
                    
                    // Create indexes
                    storeConfig.indexes.forEach(index => {
                        objectStore.createIndex(index.name, index.keyPath, { 
                            unique: index.unique || false 
                        });
                    });
                    
                    debugLog.log(`Created object store: ${storeName}`);
                });
            };
        });
    }

    /**
     * Save data to IndexedDB with incremental updates
     * @param {Object} data - Application data
     * @returns {Promise<boolean>}
     */
    async save(data) {
        try {
            await this.ensureInitialized();

            // Get existing boards for comparison (separate read transaction)
            let existingBoardIds = new Set();
            if (data.boards && Array.isArray(data.boards)) {
                const readTransaction = this.db.transaction(['boards'], 'readonly');
                const readBoardStore = readTransaction.objectStore('boards');
                const existingBoards = await this.getAllData(readBoardStore);
                existingBoardIds = new Set(existingBoards.map(board => board.id));
                await this.waitForTransaction(readTransaction);
            }

            // Main write transaction
            const transaction = this.db.transaction(['boards', 'settings'], 'readwrite');
            const boardStore = transaction.objectStore('boards');
            const settingsStore = transaction.objectStore('settings');

            // Incremental board updates
            if (data.boards && Array.isArray(data.boards)) {
                const newBoardIds = new Set(data.boards.map(board => board.id));

                // Delete removed boards
                for (const existingId of existingBoardIds) {
                    if (!newBoardIds.has(existingId)) {
                        await this.deleteData(boardStore, existingId);
                    }
                }

                // Add or update boards
                for (const board of data.boards) {
                    await this.putData(boardStore, board);
                }
            } else {
                // If no boards provided, clear all
                await this.clearStore(boardStore);
            }

            // Save metadata (always update)
            await this.putData(settingsStore, {
                key: 'appData',
                currentBoardId: data.currentBoardId,
                filter: data.filter || 'all',
                lastModified: new Date().toISOString(),
                version: this.version
            });

            await this.waitForTransaction(transaction);
            
            eventBus.emit('storage:saved', { data });
            return true;

        } catch (error) {
            console.error('Failed to save data to IndexedDB:', error);
            eventBus.emit('storage:error', { error, operation: 'save' });
            throw error;
        }
    }

    /**
     * Load data from IndexedDB
     * @param {*} defaultValue - Default value if no data found
     * @returns {Promise<*>}
     */
    async load(defaultValue = null) {
        try {
            await this.ensureInitialized();

            const transaction = this.db.transaction(['boards', 'settings'], 'readonly');
            const boardStore = transaction.objectStore('boards');
            const settingsStore = transaction.objectStore('settings');

            // Load boards
            const boards = await this.getAllData(boardStore);
            
            // Load metadata
            const metadata = await this.getData(settingsStore, 'appData');

            const result = {
                boards: boards || [],
                currentBoardId: metadata?.currentBoardId || null,
                filter: metadata?.filter || 'all'
            };

            eventBus.emit('storage:loaded', { data: result });
            return result;

        } catch (error) {
            console.error('Failed to load data from IndexedDB:', error);
            eventBus.emit('storage:error', { error, operation: 'load' });
            
            // If we can't load data, return default
            if (defaultValue !== null) {
                return defaultValue;
            }
            
            throw error;
        }
    }

    /**
     * Initialize first-time setup (replaces legacy migration)
     */
    async initializeFirstTimeSetup() {
        try {
            // Check if already initialized
            const initCheck = await this.getData(
                this.db.transaction(['settings'], 'readonly').objectStore('settings'),
                'initialized'
            );
            
            if (initCheck) {
                return; // Already initialized
            }

            // Mark as initialized
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const settingsStore = transaction.objectStore('settings');
            await this.putData(settingsStore, {
                key: 'initialized',
                value: true,
                timestamp: new Date().toISOString()
            });
            await this.waitForTransaction(transaction);
            
            debugLog.log('✅ First-time setup completed');

        } catch (error) {
            console.warn('First-time setup failed (non-critical):', error);
        }
    }

    /**
     * Clear all storage
     * @returns {Promise<boolean>}
     */
    async clear() {
        try {
            await this.ensureInitialized();

            const transaction = this.db.transaction(['boards', 'settings'], 'readwrite');
            await this.clearStore(transaction.objectStore('boards'));
            await this.clearStore(transaction.objectStore('settings'));
            await this.waitForTransaction(transaction);
            
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            throw error;
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>}
     */
    async getStorageInfo() {
        try {
            await this.ensureInitialized();
            
            return {
                type: 'IndexedDB',
                database: this.dbName,
                version: this.version,
                available: true,
                initialized: this.isInitialized
            };
        } catch (error) {
            return {
                type: 'IndexedDB',
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Helper methods for IndexedDB operations
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    async putData(store, data) {
        return new Promise((resolve, reject) => {
            try {
                const request = store.put(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    const error = request.error || event.target?.error || new Error('Put operation failed');
                    debugLog.error('Put operation failed:', error, data);
                    reject(error);
                };
            } catch (error) {
                debugLog.error('Put operation setup failed:', error, data);
                reject(error);
            }
        });
    }

    async deleteData(store, key) {
        return new Promise((resolve, reject) => {
            try {
                const request = store.delete(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    const error = request.error || event.target?.error || new Error('Delete operation failed');
                    debugLog.error('Delete operation failed:', error, { key });
                    reject(error);
                };
            } catch (error) {
                debugLog.error('Delete operation setup failed:', error, { key });
                reject(error);
            }
        });
    }

    async getData(store, key) {
        return new Promise((resolve, reject) => {
            try {
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    const error = request.error || event.target?.error || new Error('Get operation failed');
                    debugLog.error('Get operation failed:', error, { key });
                    reject(error);
                };
            } catch (error) {
                debugLog.error('Get operation setup failed:', error, { key });
                reject(error);
            }
        });
    }

    async getAllData(store) {
        return new Promise((resolve, reject) => {
            try {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    const error = request.error || event.target?.error || new Error('GetAll operation failed');
                    debugLog.error('GetAll operation failed:', error);
                    reject(error);
                };
            } catch (error) {
                debugLog.error('GetAll operation setup failed:', error);
                reject(error);
            }
        });
    }

    async clearStore(store) {
        return new Promise((resolve, reject) => {
            try {
                const request = store.clear();
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    const error = request.error || event.target?.error || new Error('Clear operation failed');
                    debugLog.error('Clear operation failed:', error);
                    reject(error);
                };
            } catch (error) {
                debugLog.error('Clear operation setup failed:', error);
                reject(error);
            }
        });
    }

    async waitForTransaction(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                const error = transaction.error || event.target?.error || new Error('Transaction failed');
                debugLog.error('Transaction failed:', error);
                reject(error);
            };
            transaction.onabort = (event) => {
                const error = new Error('Transaction was aborted');
                debugLog.error('Transaction aborted:', error);
                reject(error);
            };
        });
    }
}

// Create and export storage instance
const storage = new IndexedDBOnlyStorage();
export default storage;