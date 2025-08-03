/**
 * IndexedDB wrapper/abstraction layer for Cascade application
 * Provides async storage with same API as localStorage-based StorageAPI
 */

import eventBus from './eventBus.js';
import { settingsManager, debugLog } from './settings.js';
import { generateUniqueId } from './utils.js';

/**
 * IndexedDB Storage API with async operations
 */
class IndexedDBStorage {
    constructor() {
        this.dbName = 'cascade-app';
        this.version = 3;
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
                    { name: 'createdDate', keyPath: 'createdDate', unique: false },
                    { name: 'completedDate', keyPath: 'completedDate', unique: false }
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
    }

    /**
     * Initialize IndexedDB connection and create/upgrade database
     * @returns {Promise<boolean>} Success status
     */
    async init() {
        if (this.isInitialized && this.db) {
            return true;
        }

        try {
            // Check IndexedDB support
            if (!this.isIndexedDBSupported()) {
                throw new Error('IndexedDB not supported');
            }

            this.db = await this.openDatabase();
            this.isInitialized = true;
            
            debugLog.log('🗄️ IndexedDB initialized successfully', {
                dbName: this.dbName,
                version: this.version
            });
            
            eventBus.emit('storage:initialized', { 
                type: 'indexedDB',
                version: this.version 
            });
            
            return true;
        } catch (error) {
            console.error('IndexedDB initialization failed:', error);
            eventBus.emit('storage:error', { error, operation: 'init' });
            return false;
        }
    }

    /**
     * Check if IndexedDB is supported
     * @returns {boolean} Support status
     */
    isIndexedDBSupported() {
        return 'indexedDB' in window && indexedDB !== null;
    }

    /**
     * Open IndexedDB database with proper version handling
     * @returns {Promise<IDBDatabase>} Database instance
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error(`Failed to open database: ${request.error}`));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                debugLog.log('🔄 Upgrading IndexedDB schema', {
                    oldVersion,
                    newVersion: this.version
                });

                this.upgradeDatabase(db, oldVersion);
            };
        });
    }

    /**
     * Handle database schema upgrades
     * @param {IDBDatabase} db - Database instance
     * @param {number} oldVersion - Previous version
     */
    upgradeDatabase(db, oldVersion) {
        // Create object stores for new database
        if (oldVersion < 1) {
            this.createObjectStores(db);
        }

        // Handle specific version upgrades
        if (oldVersion < 2) {
            // Add any v2 specific upgrades
        }

        if (oldVersion < 3) {
            // Add any v3 specific upgrades
        }
    }

    /**
     * Create all object stores and indexes
     * @param {IDBDatabase} db - Database instance
     */
    createObjectStores(db) {
        Object.entries(this.stores).forEach(([storeName, config]) => {
            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { 
                    keyPath: config.keyPath 
                });

                // Create indexes
                config.indexes.forEach(index => {
                    store.createIndex(index.name, index.keyPath, { 
                        unique: index.unique 
                    });
                });

                debugLog.log(`📁 Created object store: ${storeName}`);
            }
        });
    }

    /**
     * Save data to IndexedDB (maintains localStorage API compatibility)
     * @param {*} data - Data to save
     * @returns {Promise<boolean>} Success status
     */
    async save(data) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            // Transform data for IndexedDB storage
            const transformedData = this.transformDataForStorage(data);
            
            // Save to appropriate stores
            await this.saveToStores(transformedData);
            
            eventBus.emit('storage:saved', { data });
            return true;
        } catch (error) {
            console.error('Failed to save data to IndexedDB:', error);
            eventBus.emit('storage:error', { error, operation: 'save' });
            return false;
        }
    }

    /**
     * Transform application data for IndexedDB storage
     * @param {Object} data - Application data
     * @returns {Object} Transformed data
     */
    transformDataForStorage(data) {
        const transformed = {
            boards: [],
            tasks: [],
            settings: [],
            metadata: []
        };

        if (data && data.boards) {
            // Extract boards
            transformed.boards = data.boards.map(board => ({
                ...board,
                // Ensure required fields
                id: board.id || generateUniqueId(),
                createdDate: board.createdDate || new Date().toISOString(),
                lastModified: new Date().toISOString()
            }));

            // Extract tasks from all boards
            data.boards.forEach(board => {
                if (board.tasks && Array.isArray(board.tasks)) {
                    const boardTasks = board.tasks.map(task => ({
                        ...task,
                        boardId: board.id,
                        id: task.id || generateUniqueId(),
                        createdDate: task.createdDate || new Date().toISOString(),
                        lastModified: new Date().toISOString()
                    }));
                    transformed.tasks.push(...boardTasks);
                }

                // Include archived tasks
                if (board.archivedTasks && Array.isArray(board.archivedTasks)) {
                    const archivedTasks = board.archivedTasks.map(task => ({
                        ...task,
                        boardId: board.id,
                        id: `archived_${task.id || generateUniqueId()}`,
                        originalTaskId: task.id,
                        isArchived: true,
                        createdDate: task.createdDate || new Date().toISOString(),
                        lastModified: new Date().toISOString()
                    }));
                    transformed.tasks.push(...archivedTasks);
                }
            });
        }

        // Add metadata
        transformed.metadata.push({
            key: 'version',
            value: this.version,
            lastModified: new Date().toISOString()
        });

        return transformed;
    }

    /**
     * Save transformed data to appropriate object stores
     * @param {Object} transformedData - Data organized by store
     * @returns {Promise<void>}
     */
    async saveToStores(transformedData) {
        const transaction = this.db.transaction(
            Object.keys(this.stores), 
            'readwrite'
        );

        const promises = [];

        // Clear existing data and save new data for each store
        Object.entries(transformedData).forEach(([storeName, items]) => {
            const store = transaction.objectStore(storeName);
            
            // Clear existing data
            promises.push(this.clearStore(store));
            
            // Add new data
            if (Array.isArray(items)) {
                items.forEach(item => {
                    promises.push(this.addToStore(store, item));
                });
            }
        });

        await Promise.all(promises);
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Clear an object store
     * @param {IDBObjectStore} store - Object store
     * @returns {Promise<void>}
     */
    clearStore(store) {
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Add item to object store
     * @param {IDBObjectStore} store - Object store
     * @param {Object} item - Item to add
     * @returns {Promise<void>}
     */
    addToStore(store, item) {
        return new Promise((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load data from IndexedDB (maintains localStorage API compatibility)
     * @param {*} defaultValue - Default value if no data found
     * @returns {Promise<*>} Loaded data
     */
    async load(defaultValue = null) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            const data = await this.loadFromStores();
            const transformedData = this.transformDataFromStorage(data);
            
            if (transformedData) {
                eventBus.emit('storage:loaded', { data: transformedData });
                return transformedData;
            } else {
                return defaultValue;
            }
        } catch (error) {
            console.error('Failed to load data from IndexedDB:', error);
            eventBus.emit('storage:error', { error, operation: 'load' });
            return defaultValue;
        }
    }

    /**
     * Load data from all object stores
     * @returns {Promise<Object>} Raw data from stores
     */
    async loadFromStores() {
        const transaction = this.db.transaction(
            Object.keys(this.stores), 
            'readonly'
        );

        const data = {};
        const promises = [];

        Object.keys(this.stores).forEach(storeName => {
            const store = transaction.objectStore(storeName);
            promises.push(
                this.getAllFromStore(store).then(items => {
                    data[storeName] = items;
                })
            );
        });

        await Promise.all(promises);
        return data;
    }

    /**
     * Get all items from an object store
     * @param {IDBObjectStore} store - Object store
     * @returns {Promise<Array>} All items
     */
    getAllFromStore(store) {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Transform data from IndexedDB back to application format
     * @param {Object} data - Raw data from stores
     * @returns {Object} Application data format
     */
    transformDataFromStorage(data) {
        if (!data || !data.boards) {
            return null;
        }

        const boards = data.boards.map(board => {
            // Get tasks for this board
            const boardTasks = (data.tasks || [])
                .filter(task => task.boardId === board.id && !task.isArchived);
            
            // Get archived tasks for this board
            const archivedTasks = (data.tasks || [])
                .filter(task => task.boardId === board.id && task.isArchived)
                .map(task => ({
                    ...task,
                    id: task.originalTaskId || task.id.replace(/^archived_/, '')
                }));

            return {
                ...board,
                tasks: boardTasks,
                archivedTasks: archivedTasks
            };
        });

        return { boards };
    }

    /**
     * Clear specific data (maintains localStorage API compatibility)
     * @returns {Promise<boolean>} Success status
     */
    async clear() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            const transaction = this.db.transaction(
                Object.keys(this.stores), 
                'readwrite'
            );

            const promises = Object.keys(this.stores).map(storeName => {
                const store = transaction.objectStore(storeName);
                return this.clearStore(store);
            });

            await Promise.all(promises);
            
            eventBus.emit('storage:cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear IndexedDB:', error);
            eventBus.emit('storage:error', { error, operation: 'clear' });
            return false;
        }
    }

    /**
     * Clear all data including database (maintains localStorage API compatibility)
     * @returns {Promise<boolean>} Success status
     */
    async clearAll() {
        try {
            // Close current connection
            if (this.db) {
                this.db.close();
                this.db = null;
                this.isInitialized = false;
            }

            // Delete entire database
            await this.deleteDatabase();
            
            eventBus.emit('storage:cleared:all');
            return true;
        } catch (error) {
            console.error('Failed to clear all IndexedDB data:', error);
            eventBus.emit('storage:error', { error, operation: 'clearAll' });
            return false;
        }
    }

    /**
     * Delete the entire database
     * @returns {Promise<void>}
     */
    deleteDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                debugLog.log('🗑️ IndexedDB database deleted');
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error(`Failed to delete database: ${request.error}`));
            };
            
            request.onblocked = () => {
                console.warn('Database deletion blocked - close other tabs');
            };
        });
    }

    /**
     * Check if storage is available
     * @returns {Promise<boolean>} Availability status
     */
    async isAvailable() {
        try {
            await this.init();
            return this.isInitialized;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage statistics
     */
    async getStorageStats() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            const data = await this.loadFromStores();
            
            return {
                type: 'indexedDB',
                boards: data.boards?.length || 0,
                tasks: data.tasks?.length || 0,
                settings: data.settings?.length || 0,
                metadata: data.metadata?.length || 0,
                dbName: this.dbName,
                version: this.version
            };
        } catch (error) {
            return {
                type: 'indexedDB',
                error: error.message
            };
        }
    }

    /**
     * Migrate data from localStorage to IndexedDB
     * @returns {Promise<boolean>} Migration success status
     */
    async migrateFromLocalStorage() {
        try {
            debugLog.log('🔄 Starting localStorage to IndexedDB migration');
            
            // Check for existing localStorage data
            const localStorageKey = 'cascade-app';
            const rawData = localStorage.getItem(localStorageKey);
            
            if (!rawData) {
                debugLog.log('ℹ️ No localStorage data found to migrate');
                return true;
            }

            const localData = JSON.parse(rawData);
            
            if (!localData || !localData.data) {
                debugLog.log('ℹ️ No valid localStorage data found to migrate');
                return true;
            }

            // Save data to IndexedDB
            const success = await this.save(localData.data);
            
            if (success) {
                debugLog.log('✅ Migration completed successfully');
                
                // Optionally backup localStorage data before clearing
                const backupKey = `${localStorageKey}-backup-${Date.now()}`;
                localStorage.setItem(backupKey, rawData);
                
                // Clear original localStorage data
                localStorage.removeItem(localStorageKey);
                
                eventBus.emit('storage:migrated', { 
                    from: 'localStorage', 
                    to: 'indexedDB' 
                });
                
                return true;
            } else {
                throw new Error('Failed to save migrated data to IndexedDB');
            }
        } catch (error) {
            console.error('Migration from localStorage failed:', error);
            eventBus.emit('storage:error', { error, operation: 'migrate' });
            return false;
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.isInitialized = false;
    }
}

// Export singleton instance
export default new IndexedDBStorage();