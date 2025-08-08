/**
 * Settings Management with IndexedDB Storage
 * Replaces localStorage-based settings with IndexedDB implementation
 */

import eventBus from './eventBus.js';
import { generateUniqueId } from './utils.js';

// Settings storage using IndexedDB
class SettingsStorage {
    constructor() {
        this.dbName = 'cascade-settings';
        this.version = 1;
        this.db = null;
        this.isInitialized = false;
    }

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
            console.error('Settings storage initialization failed:', error);
            throw error;
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async get(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async set(key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value, timestamp: new Date().toISOString() });

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async clear() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

/**
 * Settings Manager Class
 */
class SettingsManager {
    constructor() {
        this.storage = new SettingsStorage();
        this.storageKey = 'app-settings';
        
        this.defaultSettings = {
            theme: 'light',
            debugMode: false,
            notifications: true,
            autoSave: true,
            taskSorting: 'createdDate',
            taskDensity: 'comfortable',
            keyboardShortcuts: true,
            animationsEnabled: true,
            backupEnabled: true,
            maxHistoryEntries: 50,
            archiveAfterDays: 30,
            confirmTaskDeletion: true,
            showCompletedTasks: true,
            autoArchiveCompleted: false,
            compactMode: false,
            showTaskProgress: true,
            enableDragDrop: true,
            soundEnabled: false,
            language: 'en'
        };
        
        this.currentSettings = { ...this.defaultSettings };
        this.isInitialized = false;
        
        // Initialize settings
        this.init();
        
        // Setup event listeners
        eventBus.on('settings:reset', () => this.resetSettings());
        eventBus.on('settings:export', () => this.exportSettings());
        eventBus.on('settings:import', (data) => this.importSettings(data.settings));
    }

    async init() {
        if (this.isInitialized) return;

        try {
            await this.loadSettings();
            this.isInitialized = true;
        } catch (error) {
            console.error('Settings initialization failed:', error);
            this.currentSettings = { ...this.defaultSettings };
            this.isInitialized = true;
        }
    }

    /**
     * Load settings from IndexedDB
     * @returns {Promise<Object>} Current settings
     */
    async loadSettings() {
        try {
            const stored = await this.storage.get(this.storageKey);
            const savedSettings = stored || {};
            
            // Merge with defaults to ensure all properties exist
            this.currentSettings = {
                ...this.defaultSettings,
                ...savedSettings
            };
            
            // Always ensure debug mode is disabled on startup
            this.currentSettings.debugMode = false;
            
            // Validate settings
            this.validateSettings();
            
            eventBus.emit('settings:loaded', { settings: this.currentSettings });
            return this.currentSettings;
            
        } catch (error) {
            console.error('Failed to load settings from IndexedDB:', error);
            this.currentSettings = { ...this.defaultSettings };
            this.currentSettings.debugMode = false;
            eventBus.emit('settings:error', { 
                error: new Error('Failed to load settings'),
                context: 'Settings Load'
            });
            return this.currentSettings;
        }
    }

    /**
     * Save settings to IndexedDB
     * @param {Object} settings - Settings to save
     */
    async saveSettings(settings) {
        try {
            // Merge with current settings
            const newSettings = {
                ...this.currentSettings,
                ...settings
            };
            
            // Validate before saving
            if (!this.validateSettings(newSettings)) {
                throw new Error('Invalid settings provided');
            }
            
            await this.storage.set(this.storageKey, newSettings);
            this.currentSettings = newSettings;
            
            eventBus.emit('settings:saved', { settings: this.currentSettings });
            
        } catch (error) {
            console.error('Failed to save settings to IndexedDB:', error);
            eventBus.emit('settings:error', { 
                error: new Error('Failed to save settings'),
                context: 'Settings Save'
            });
        }
    }

    /**
     * Get current settings or specific setting
     * @param {string} [key] - Specific setting key
     * @returns {*} Settings object or specific value
     */
    get(key) {
        if (!this.isInitialized) {
            console.warn('Settings not initialized yet, returning defaults');
            return key ? this.defaultSettings[key] : this.defaultSettings;
        }
        
        if (key) {
            return this.currentSettings[key] !== undefined ? this.currentSettings[key] : this.defaultSettings[key];
        }
        
        return { ...this.currentSettings };
    }

    /**
     * Set a specific setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    async set(key, value) {
        const updates = { [key]: value };
        await this.saveSettings(updates);
    }

    /**
     * Set debug mode
     * @param {boolean} enabled - Debug mode state
     */
    async setDebugMode(enabled) {
        await this.set('debugMode', Boolean(enabled));
    }

    /**
     * Get theme setting
     * @returns {string} Current theme
     */
    getTheme() {
        return this.get('theme') || 'light';
    }

    /**
     * Set theme
     * @param {string} theme - Theme name
     */
    async setTheme(theme) {
        const validThemes = ['light', 'dark', 'auto'];
        if (validThemes.includes(theme)) {
            await this.set('theme', theme);
            eventBus.emit('settings:theme-changed', { theme });
        }
    }

    /**
     * Validate settings object
     * @param {Object} [settings] - Settings to validate (defaults to current)
     * @returns {boolean} Validation result
     */
    validateSettings(settings = this.currentSettings) {
        try {
            const validThemes = ['light', 'dark', 'auto'];
            const validSorting = ['createdDate', 'text', 'status', 'manual'];
            const validDensity = ['compact', 'comfortable', 'spacious'];
            const validLanguages = ['en', 'es', 'fr', 'de'];

            // Validate each setting
            if (!validThemes.includes(settings.theme)) {
                console.warn('Invalid theme:', settings.theme);
                return false;
            }

            if (!validSorting.includes(settings.taskSorting)) {
                console.warn('Invalid task sorting:', settings.taskSorting);
                return false;
            }

            if (!validDensity.includes(settings.taskDensity)) {
                console.warn('Invalid task density:', settings.taskDensity);
                return false;
            }

            if (!validLanguages.includes(settings.language)) {
                console.warn('Invalid language:', settings.language);
                return false;
            }

            // Validate numeric ranges
            if (settings.maxHistoryEntries < 10 || settings.maxHistoryEntries > 1000) {
                console.warn('Invalid max history entries:', settings.maxHistoryEntries);
                return false;
            }

            if (settings.archiveAfterDays < 1 || settings.archiveAfterDays > 365) {
                console.warn('Invalid archive after days:', settings.archiveAfterDays);
                return false;
            }

            return true;

        } catch (error) {
            console.error('Settings validation error:', error);
            return false;
        }
    }

    /**
     * Reset settings to defaults
     */
    async resetSettings() {
        try {
            await this.storage.clear();
            this.currentSettings = { ...this.defaultSettings };
            eventBus.emit('settings:reset', { settings: this.currentSettings });
        } catch (error) {
            console.error('Failed to reset settings:', error);
        }
    }

    /**
     * Export settings for backup
     * @returns {Object} Settings export data
     */
    exportSettings() {
        const exportData = {
            settings: this.get(),
            exportDate: new Date().toISOString(),
            version: '3.0.0'
        };
        
        eventBus.emit('settings:exported', exportData);
        return exportData;
    }

    /**
     * Import settings from backup
     * @param {Object} settingsData - Imported settings data
     */
    async importSettings(settingsData) {
        try {
            if (!settingsData || typeof settingsData !== 'object') {
                throw new Error('Invalid settings data');
            }

            const settingsToImport = settingsData.settings || settingsData;
            
            if (this.validateSettings(settingsToImport)) {
                await this.saveSettings(settingsToImport);
                eventBus.emit('settings:imported', { settings: this.currentSettings });
            } else {
                throw new Error('Invalid settings format');
            }

        } catch (error) {
            console.error('Failed to import settings:', error);
            eventBus.emit('settings:error', { 
                error: new Error('Failed to import settings'),
                context: 'Settings Import'
            });
        }
    }
}

/**
 * Debug Log Utility
 */
export const debugLog = {
    log: (...args) => {
        if (settingsManager.get('debugMode')) {
            console.log('[DEBUG]', ...args);
        }
    },
    
    warn: (...args) => {
        if (settingsManager.get('debugMode')) {
            console.warn('[DEBUG]', ...args);
        }
    },
    
    error: (...args) => {
        if (settingsManager.get('debugMode')) {
            console.error('[DEBUG]', ...args);
        }
    }
};

// Create and export singleton instance
const settingsManager = new SettingsManager();
export { settingsManager };