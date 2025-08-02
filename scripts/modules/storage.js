import eventBus from './eventBus.js';
import { settingsManager, debugLog } from './settings.js';
import { generateUniqueId } from './utils.js';
import indexedDBStorage from './indexedDBStorage.js';

/**
 * Hybrid Storage API that uses IndexedDB with localStorage fallback
 * Maintains same interface for backward compatibility
 */
class StorageAPI {
    constructor() {
        this.version = '3.0'; // Updated for IndexedDB
        this.storageKey = 'cascade-app';
        this.useIndexedDB = false;
        this.isInitialized = false;
        this.migrations = {
            '1.0': this.migrateFrom1to2.bind(this)
        };
        
        this.init();
    }

    /**
     * Initialize storage and run migrations if needed
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Try to initialize IndexedDB first
            const indexedDBAvailable = await indexedDBStorage.isAvailable();
            
            if (indexedDBAvailable) {
                this.useIndexedDB = true;
                debugLog.log('🗄️ Using IndexedDB for storage');
                
                // Migrate from localStorage if needed
                await indexedDBStorage.migrateFromLocalStorage();
            } else {
                this.useIndexedDB = false;
                debugLog.log('💾 Falling back to localStorage');
                
                // Run localStorage migrations
                const stored = this.getStoredData();
                if (!stored || stored.version !== this.version) {
                    this.runMigrations(stored?.version, stored?.data);
                }
            }
            
            this.isInitialized = true;
            eventBus.emit('storage:initialized', { 
                version: this.version,
                type: this.useIndexedDB ? 'indexedDB' : 'localStorage'
            });
        } catch (error) {
            console.error('Storage initialization failed:', error);
            eventBus.emit('storage:error', { error, operation: 'init' });
            
            // Fallback to localStorage on any error
            this.useIndexedDB = false;
            this.isInitialized = true;
        }
    }

    /**
     * Get stored data with version info
     * @returns {Object|null} Stored data with version
     */
    getStoredData() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.error('Failed to parse stored data:', error);
            return null;
        }
    }

    /**
     * Save data with version info
     * @param {*} data - Data to save
     * @returns {Promise<boolean>} Success status
     */
    async save(data) {
        try {
            await this.ensureInitialized();
            
            if (this.useIndexedDB) {
                return await indexedDBStorage.save(data);
            } else {
                // Fallback to localStorage
                const payload = {
                    version: this.version,
                    timestamp: Date.now(),
                    data
                };
                
                localStorage.setItem(this.storageKey, JSON.stringify(payload));
                eventBus.emit('storage:saved', { data });
                return true;
            }
        } catch (error) {
            console.error('Failed to save data:', error);
            eventBus.emit('storage:error', { error, operation: 'save' });
            return false;
        }
    }

    /**
     * Load data
     * @param {*} defaultValue - Default value if no data
     * @returns {Promise<*>} Loaded data or default value
     */
    async load(defaultValue = null) {
        try {
            await this.ensureInitialized();
            
            if (this.useIndexedDB) {
                return await indexedDBStorage.load(defaultValue);
            } else {
                // Fallback to localStorage
                const stored = this.getStoredData();
                if (stored && stored.data !== undefined) {
                    eventBus.emit('storage:loaded', { data: stored.data });
                    return stored.data;
                }
                return defaultValue;
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            eventBus.emit('storage:error', { error, operation: 'load' });
            return defaultValue;
        }
    }

    /**
     * Clear all stored data
     * @returns {Promise<boolean>} Success status
     */
    async clear() {
        try {
            await this.ensureInitialized();
            
            if (this.useIndexedDB) {
                return await indexedDBStorage.clear();
            } else {
                // Fallback to localStorage
                localStorage.removeItem(this.storageKey);
                eventBus.emit('storage:cleared');
                return true;
            }
        } catch (error) {
            console.error('Failed to clear storage:', error);
            eventBus.emit('storage:error', { error, operation: 'clear' });
            return false;
        }
    }

    /**
     * Clear all app data including settings
     * @returns {Promise<boolean>} Success status
     */
    async clearAll() {
        try {
            await this.ensureInitialized();
            
            if (this.useIndexedDB) {
                const result = await indexedDBStorage.clearAll();
                // Also clear any remaining localStorage data
                this.clearLocalStorageCompletely();
                return result;
            } else {
                // Clear localStorage completely
                return this.clearLocalStorageCompletely();
            }
        } catch (error) {
            console.error('Failed to clear all storage:', error);
            eventBus.emit('storage:error', { error, operation: 'clearAll' });
            return false;
        }
    }

    /**
     * Clear all localStorage data completely
     * @returns {boolean} Success status
     */
    clearLocalStorageCompletely() {
        try {
            // Clear main app data
            localStorage.removeItem(this.storageKey);
            
            // Clear settings data
            localStorage.removeItem('cascade-settings');
            
            // Clear any archived tasks
            localStorage.removeItem('cascade-archived-tasks');
            
            // Clear legacy data keys that might still exist
            localStorage.removeItem('cascade-tasks'); // Legacy task format
            localStorage.removeItem('todos'); // Very old format
            
            // Clear any other cascade-related items (comprehensive cleanup)
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('cascade-') || key.startsWith('cascade_')) {
                    localStorage.removeItem(key);
                }
            });
            
            // Also clear any potential test or debug keys
            keys.forEach(key => {
                if (key.includes('cascade') && key !== 'cascade') {
                    localStorage.removeItem(key);
                }
            });
            
            // Clear sessionStorage as well (even though app doesn't use it, for completeness)
            try {
                const sessionKeys = Object.keys(sessionStorage);
                sessionKeys.forEach(key => {
                    if (key.startsWith('cascade-') || key.startsWith('cascade_') || key.includes('cascade')) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (sessionError) {
                // sessionStorage might not be available in some environments
                console.warn('Could not clear sessionStorage:', sessionError);
            }
            
            eventBus.emit('storage:cleared:all');
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage completely:', error);
            return false;
        }
    }

    /**
     * Run migrations for version updates
     * @param {string} fromVersion - Previous version
     * @param {*} oldData - Old data to migrate
     */
    runMigrations(fromVersion, oldData) {
        debugLog.log(`Migrating storage from ${fromVersion || 'unknown'} to ${this.version}`);
        
        // Handle legacy data migration
        if (!fromVersion) {
            oldData = this.migrateLegacyData();
        }
        
        // Run version-specific migrations
        let migratedData = oldData;
        if (fromVersion && this.migrations[fromVersion]) {
            migratedData = this.migrations[fromVersion](oldData);
        }
        
        // Save migrated data
        if (migratedData) {
            this.save(migratedData);
        }
        
        eventBus.emit('storage:migrated', { 
            from: fromVersion, 
            to: this.version,
            data: migratedData 
        });
    }

    /**
     * Migrate legacy data formats
     * @returns {*} Migrated data
     */
    migrateLegacyData() {
        try {
            // Check for old cascade-tasks format
            const cascadeTasks = localStorage.getItem('cascade-tasks');
            if (cascadeTasks) {
                const tasks = JSON.parse(cascadeTasks);
                localStorage.removeItem('cascade-tasks');
                
                // Create default board with legacy tasks
                const defaultBoard = {
                    id: generateUniqueId(),
                    name: 'Main Board',
                    description: 'Migrated from previous version',
                    color: '#6750a4',
                    tasks: tasks,
                    createdDate: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    isArchived: false,
                    isDefault: true
                };
                
                return {
                    boards: [defaultBoard],
                    currentBoardId: defaultBoard.id,
                    tasks: tasks // For backward compatibility
                };
            }
            
            // Check for even older todos format
            const oldTodos = localStorage.getItem('todos');
            if (oldTodos) {
                const todos = JSON.parse(oldTodos);
                const tasks = todos.map(todo => ({
                    id: generateUniqueId(),
                    text: todo.text,
                    status: todo.completed ? 'done' : 'todo',
                    createdDate: todo.createdDate || new Date().toISOString().split('T')[0]
                }));
                localStorage.removeItem('todos');
                
                // Create default board with migrated tasks
                const defaultBoard = {
                    id: generateUniqueId(),
                    name: 'Main Board',
                    description: 'Migrated from legacy todos',
                    color: '#6750a4',
                    tasks: tasks,
                    createdDate: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    isArchived: false,
                    isDefault: true
                };
                
                return {
                    boards: [defaultBoard],
                    currentBoardId: defaultBoard.id,
                    tasks: tasks
                };
            }
            
            return null;
        } catch (error) {
            console.error('Legacy migration failed:', error);
            return null;
        }
    }

    /**
     * Migrate from version 1.0 to 2.0 (single board to multi-board)
     * @param {Object} oldData - Data from version 1.0
     * @returns {Object} Migrated data for version 2.0
     */
    migrateFrom1to2(oldData) {
        debugLog.log('Migrating from v1.0 to v2.0: Converting single board to multi-board structure');
        
        if (!oldData || !oldData.tasks) {
            // No existing data, create empty multi-board structure
            return {
                boards: [],
                currentBoardId: null
            };
        }
        
        // Create default board with existing tasks
        const defaultBoard = {
            id: generateUniqueId(),
            name: 'Main Board',
            description: 'Default board created from migration',
            color: '#6750a4',
            tasks: oldData.tasks || [],
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            isArchived: false,
            isDefault: true
        };
        
        return {
            boards: [defaultBoard],
            currentBoardId: defaultBoard.id,
            filter: oldData.filter || 'all'
        };
    }

    /**
     * Add migration for a specific version
     * @param {string} version - Version identifier
     * @param {Function} migrationFn - Migration function
     */
    addMigration(version, migrationFn) {
        this.migrations[version] = migrationFn;
    }

    /**
     * Export data for backup
     * @returns {Promise<Object>} Export data with metadata
     */
    async exportData() {
        const data = await this.load();
        const settings = settingsManager.get();
        
        return {
            version: this.version,
            exportDate: new Date().toISOString(),
            appName: 'Cascade Tasks',
            data,
            settings
        };
    }

    /**
     * Import data from backup
     * @param {Object} importData - Data to import
     * @returns {Promise<boolean>} Success status
     */
    async importData(importData) {
        try {
            if (!importData || typeof importData !== 'object') {
                throw new Error('Invalid import data format');
            }
            
            let dataToImport = importData.data || importData;
            
            // Validate and clean data if needed
            if (Array.isArray(dataToImport)) {
                // Handle old format where data was just an array of tasks
                dataToImport = { tasks: dataToImport };
            }
            
            // Import settings if present
            if (importData.settings && typeof importData.settings === 'object') {
                try {
                    settingsManager.importSettings(importData.settings);
                    eventBus.emit('storage:settings-imported', { settings: importData.settings });
                } catch (error) {
                    console.warn('Failed to import settings:', error);
                    // Continue with data import even if settings import fails
                }
            }
            
            await this.save(dataToImport);
            eventBus.emit('storage:imported', { data: dataToImport });
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            eventBus.emit('storage:error', { error, operation: 'import' });
            return false;
        }
    }

    /**
     * Ensure storage is initialized before operations
     * @returns {Promise<void>}
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    /**
     * Get storage type being used
     * @returns {string} Storage type
     */
    getStorageType() {
        return this.useIndexedDB ? 'indexedDB' : 'localStorage';
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage statistics
     */
    async getStorageStats() {
        try {
            await this.ensureInitialized();
            
            if (this.useIndexedDB) {
                return await indexedDBStorage.getStorageStats();
            } else {
                // Return localStorage stats
                const data = this.getStoredData();
                return {
                    type: 'localStorage',
                    hasData: !!data,
                    version: data?.version || 'unknown',
                    timestamp: data?.timestamp || null
                };
            }
        } catch (error) {
            return {
                type: this.useIndexedDB ? 'indexedDB' : 'localStorage',
                error: error.message
            };
        }
    }


    /**
     * Get storage info
     * @returns {Object} Storage usage information
     */
    getStorageInfo() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const size = data ? new Blob([data]).size : 0;
            
            return {
                version: this.version,
                size,
                sizeFormatted: this.formatBytes(size),
                lastModified: this.getStoredData()?.timestamp,
                available: this.isStorageAvailable()
            };
        } catch (error) {
            return {
                version: this.version,
                size: 0,
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} True if available
     */
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

}

// Export singleton instance
export default new StorageAPI();