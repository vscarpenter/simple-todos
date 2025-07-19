/**
 * Settings Management Module
 * Handles user preferences and configuration
 */

import eventBus from './eventBus.js';
import { StorageError } from './errorHandler.js';

export class Settings {
    constructor() {
        this.storageKey = 'cascade-settings';
        this.defaultSettings = {
            autoArchiveDays: 30,
            enableAutoArchive: true,
            theme: 'auto', // 'light', 'dark', 'auto'
            animations: true,
            soundEnabled: false,
            compactMode: false,
            defaultBoard: 'main',
            autoSave: true,
            showTaskCounts: true,
            enableKeyboardShortcuts: true,
            debugMode: false // Enable verbose logging
        };
        
        this.currentSettings = null;
        this.init();
    }

    /**
     * Initialize settings
     */
    init() {
        this.loadSettings();
        this.bindEvents();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        eventBus.on('settings:load', () => this.loadSettings());
        eventBus.on('settings:save', (data) => this.saveSettings(data.settings));
        eventBus.on('settings:reset', () => this.resetSettings());
        eventBus.on('settings:export', () => this.exportSettings());
        eventBus.on('settings:import', (data) => this.importSettings(data.settings));
    }

    /**
     * Load settings from localStorage
     * @returns {Object} Current settings
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const savedSettings = stored ? JSON.parse(stored) : {};
            
            // Merge with defaults to ensure all properties exist
            this.currentSettings = {
                ...this.defaultSettings,
                ...savedSettings
            };
            
            // Validate settings
            this.validateSettings();
            
            eventBus.emit('settings:loaded', { settings: this.currentSettings });
            return this.currentSettings;
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.currentSettings = { ...this.defaultSettings };
            eventBus.emit('settings:error', { 
                error: new StorageError('Failed to load settings'),
                context: 'Settings Load'
            });
            return this.currentSettings;
        }
    }

    /**
     * Save settings to localStorage
     * @param {Object} settings - Settings to save
     */
    saveSettings(settings) {
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
            
            localStorage.setItem(this.storageKey, JSON.stringify(newSettings));
            this.currentSettings = newSettings;
            
            eventBus.emit('settings:saved', { settings: this.currentSettings });
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            eventBus.emit('settings:error', { 
                error: new StorageError('Failed to save settings'),
                context: 'Settings Save'
            });
            throw error;
        }
    }

    /**
     * Validate settings object
     * @param {Object} settings - Settings to validate
     * @returns {boolean} True if valid
     */
    validateSettings(settings = this.currentSettings) {
        if (!settings || typeof settings !== 'object') {
            return false;
        }

        // Validate auto archive days
        if (settings.autoArchiveDays !== undefined) {
            const days = parseInt(settings.autoArchiveDays);
            if (isNaN(days) || days < 1 || days > 365) {
                return false;
            }
        }

        // Validate theme
        if (settings.theme !== undefined) {
            const validThemes = ['light', 'dark', 'auto'];
            if (!validThemes.includes(settings.theme)) {
                return false;
            }
        }

        // Validate boolean settings
        const booleanSettings = [
            'enableAutoArchive', 'animations', 'soundEnabled', 
            'compactMode', 'autoSave', 'showTaskCounts', 'enableKeyboardShortcuts'
        ];
        
        for (const key of booleanSettings) {
            if (settings[key] !== undefined && typeof settings[key] !== 'boolean') {
                return false;
            }
        }

        return true;
    }

    /**
     * Reset settings to defaults
     */
    resetSettings() {
        try {
            this.currentSettings = { ...this.defaultSettings };
            localStorage.setItem(this.storageKey, JSON.stringify(this.currentSettings));
            
            eventBus.emit('settings:reset:complete', { settings: this.currentSettings });
            eventBus.emit('settings:saved', { settings: this.currentSettings });
            
        } catch (error) {
            console.error('Failed to reset settings:', error);
            eventBus.emit('settings:error', { 
                error: new StorageError('Failed to reset settings'),
                context: 'Settings Reset'
            });
        }
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    get() {
        return { ...this.currentSettings };
    }

    /**
     * Get a specific setting value
     * @param {string} key - Setting key
     * @returns {*} Setting value
     */
    getValue(key) {
        return this.currentSettings[key];
    }

    /**
     * Set a specific setting value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    setValue(key, value) {
        const newSettings = { [key]: value };
        this.saveSettings(newSettings);
    }

    /**
     * Export settings for backup
     * @returns {Object} Settings export object
     */
    exportSettings() {
        const exportData = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            settings: { ...this.currentSettings }
        };
        
        eventBus.emit('settings:exported', { data: exportData });
        return exportData;
    }

    /**
     * Import settings from backup
     * @param {Object} importData - Settings import object
     */
    importSettings(importData) {
        try {
            if (!importData || typeof importData !== 'object') {
                throw new Error('Invalid import data');
            }

            let settingsToImport;
            
            // Handle different import formats
            if (importData.settings) {
                // New format with metadata
                settingsToImport = importData.settings;
            } else {
                // Direct settings object
                settingsToImport = importData;
            }

            // Validate imported settings
            if (!this.validateSettings(settingsToImport)) {
                throw new Error('Invalid settings in import data');
            }

            // Merge with defaults to ensure all properties exist
            const mergedSettings = {
                ...this.defaultSettings,
                ...settingsToImport
            };

            this.saveSettings(mergedSettings);
            
            eventBus.emit('settings:imported', { settings: this.currentSettings });
            
        } catch (error) {
            console.error('Failed to import settings:', error);
            eventBus.emit('settings:error', { 
                error: new StorageError('Failed to import settings'),
                context: 'Settings Import'
            });
            throw error;
        }
    }

    /**
     * Apply theme setting
     */
    applyTheme() {
        const theme = this.getValue('theme');
        const root = document.documentElement;
        
        if (theme === 'auto') {
            // Use system preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.setAttribute('data-theme', 'dark');
            } else {
                root.setAttribute('data-theme', 'light');
            }
        } else {
            root.setAttribute('data-theme', theme);
        }
        
        eventBus.emit('theme:applied', { theme });
    }

    /**
     * Check if auto-archive is enabled and get threshold
     * @returns {Object} Auto-archive configuration
     */
    getAutoArchiveConfig() {
        return {
            enabled: this.getValue('enableAutoArchive'),
            days: this.getValue('autoArchiveDays')
        };
    }

    /**
     * Toggle debug mode on/off
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.setValue('debugMode', enabled);
        
        // Log the change (always show this, even when debug is off)
        if (enabled) {
            console.log('🔧 [DEBUG MODE ENABLED] Verbose logging is now active');
            debugLog.log('Debug mode activated - you will see detailed console output');
        } else {
            console.log('🔇 [DEBUG MODE DISABLED] Verbose logging is now off');
        }
        
        eventBus.emit('debug:toggled', { enabled });
    }

    /**
     * Generate settings UI HTML
     * @returns {string} Settings form HTML
     */
    generateSettingsHTML() {
        const settings = this.get();
        
        return `
            <div class="settings-form">
                <!-- Archive Settings -->
                <div class="settings-section">
                    <h4 class="settings-section__title">Auto-Archive</h4>
                    <div class="setting-item">
                        <label for="auto-archive-days" class="setting-label">
                            Archive completed tasks after:
                        </label>
                        <div class="setting-input-group">
                            <input type="number" 
                                   id="auto-archive-days" 
                                   class="form-control" 
                                   min="1" 
                                   max="365" 
                                   value="${settings.autoArchiveDays}">
                            <span class="setting-suffix">days</span>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-checkbox">
                            <input type="checkbox" 
                                   id="enable-auto-archive" 
                                   class="form-check-input" 
                                   ${settings.enableAutoArchive ? 'checked' : ''}>
                            <label for="enable-auto-archive" class="setting-label">
                                Enable automatic archiving
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Appearance Settings -->
                <div class="settings-section">
                    <h4 class="settings-section__title">Appearance</h4>
                    <div class="setting-item">
                        <label for="theme-select" class="setting-label">Theme:</label>
                        <select id="theme-select" class="form-control">
                            <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>Auto (System)</option>
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <div class="setting-checkbox">
                            <input type="checkbox" 
                                   id="animations-enabled" 
                                   class="form-check-input" 
                                   ${settings.animations ? 'checked' : ''}>
                            <label for="animations-enabled" class="setting-label">
                                Enable animations
                            </label>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-checkbox">
                            <input type="checkbox" 
                                   id="compact-mode" 
                                   class="form-check-input" 
                                   ${settings.compactMode ? 'checked' : ''}>
                            <label for="compact-mode" class="setting-label">
                                Compact mode
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Behavior Settings -->
                <div class="settings-section">
                    <h4 class="settings-section__title">Behavior</h4>
                    <div class="setting-item">
                        <div class="setting-checkbox">
                            <input type="checkbox" 
                                   id="auto-save" 
                                   class="form-check-input" 
                                   ${settings.autoSave ? 'checked' : ''}>
                            <label for="auto-save" class="setting-label">
                                Auto-save changes
                            </label>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-checkbox">
                            <input type="checkbox" 
                                   id="show-task-counts" 
                                   class="form-check-input" 
                                   ${settings.showTaskCounts ? 'checked' : ''}>
                            <label for="show-task-counts" class="setting-label">
                                Show task counts
                            </label>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-checkbox">
                            <input type="checkbox" 
                                   id="keyboard-shortcuts" 
                                   class="form-check-input" 
                                   ${settings.enableKeyboardShortcuts ? 'checked' : ''}>
                            <label for="keyboard-shortcuts" class="setting-label">
                                Enable keyboard shortcuts
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="settings-actions">
                    <button type="button" class="btn btn-outline-secondary" id="reset-settings-btn">
                        Reset Settings
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Parse settings from form
     * @param {HTMLElement} container - Settings form container element
     * @returns {Object} Parsed settings
     */
    parseSettingsFromForm(container) {
        try {
            const getElement = (id) => {
                const element = container.querySelector(`#${id}`);
                if (!element) {
                    throw new Error(`Element with id '${id}' not found`);
                }
                return element;
            };

            const autoArchiveDaysElement = getElement('auto-archive-days');
            const autoArchiveDays = parseInt(autoArchiveDaysElement.value);
            
            if (isNaN(autoArchiveDays)) {
                throw new Error('Invalid auto-archive days value');
            }

            return {
                autoArchiveDays: autoArchiveDays,
                enableAutoArchive: getElement('enable-auto-archive').checked,
                theme: getElement('theme-select').value,
                animations: getElement('animations-enabled').checked,
                compactMode: getElement('compact-mode').checked,
                autoSave: getElement('auto-save').checked,
                showTaskCounts: getElement('show-task-counts').checked,
                enableKeyboardShortcuts: getElement('keyboard-shortcuts').checked
            };
        } catch (error) {
            console.error('Error parsing settings from form:', error);
            throw new Error(`Failed to parse settings: ${error.message}`);
        }
    }
}

// Create and export singleton instance
export const settingsManager = new Settings();

/**
 * Debug logging utility
 * Only logs when debug mode is enabled
 */
export const debugLog = {
    log: (...args) => {
        try {
            if (settingsManager.get('debugMode')) {
                console.log('[DEBUG]', ...args);
            }
        } catch (e) {
            // Silently fail if settings not available - debug mode off by default
        }
    },
    info: (...args) => {
        try {
            if (settingsManager.get('debugMode')) {
                console.info('[DEBUG]', ...args);
            }
        } catch (e) {
            // Silently fail if settings not available - debug mode off by default
        }
    },
    warn: (...args) => {
        try {
            if (settingsManager.get('debugMode')) {
                console.warn('[DEBUG]', ...args);
            }
        } catch (e) {
            // Silently fail if settings not available - debug mode off by default
        }
    },
    error: (...args) => {
        try {
            if (settingsManager.get('debugMode')) {
                console.error('[DEBUG]', ...args);
            }
        } catch (e) {
            // Silently fail if settings not available - debug mode off by default
        }
    },
    group: (label) => {
        try {
            if (settingsManager.get('debugMode')) {
                console.group(`[DEBUG] ${label}`);
            }
        } catch (e) {
            // Silently fail if settings not available - debug mode off by default
        }
    },
    groupEnd: () => {
        try {
            if (settingsManager.get('debugMode')) {
                console.groupEnd();
            }
        } catch (e) {
            // Silently fail if settings not available - debug mode off by default
        }
    },
    table: (data) => {
        try {
            if (settingsManager.get('debugMode')) {
                console.table(data);
            }
        } catch (e) {
            // Silently fail if settings not available - debug mode off by default
        }
    }
};