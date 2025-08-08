/**
 * Comprehensive Unit Tests for IndexedDB-based Settings Management
 * Tests settings storage, validation, theme management with IndexedDB
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock IndexedDB storage for settings
const createMockStorage = () => ({
  init: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  clear: jest.fn().mockResolvedValue(true)
});

global.createModuleMock('scripts/modules/eventBus.js', mockEventBus);

describe('IndexedDB-based Settings Management', () => {
  let settingsModule;
  let settingsManager;
  let mockStorage;

  beforeEach(async () => {
    // Clear mocks
    mockEventBus.emit.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();
    
    // Clear console mocks
    if (console.log.mockClear) console.log.mockClear();
    if (console.error.mockClear) console.error.mockClear();
    if (console.warn.mockClear) console.warn.mockClear();
    
    // Create fresh mock storage
    mockStorage = createMockStorage();
    
    // Import settings module
    settingsModule = await import('scripts/modules/settings.js');
    settingsManager = settingsModule.settingsManager;
    
    // Replace the storage instance with mock
    settingsManager.storage = mockStorage;
    settingsManager.isInitialized = false;
  });

  describe('Initialization', () => {
    test('should initialize with default settings', async () => {
      await settingsManager.init();
      
      expect(settingsManager.get('theme')).toBe('light');
      expect(settingsManager.get('debugMode')).toBe(false);
      expect(settingsManager.get('notifications')).toBe(true);
      expect(settingsManager.get('autoSave')).toBe(true);
      expect(settingsManager.get('taskSorting')).toBe('createdDate');
    });

    test('should load settings from IndexedDB if available', async () => {
      const savedSettings = {
        theme: 'dark',
        notifications: false,
        taskSorting: 'text'
      };
      
      mockStorage.get.mockResolvedValue(savedSettings);
      
      await settingsManager.init();
      
      expect(settingsManager.get('theme')).toBe('dark');
      expect(settingsManager.get('notifications')).toBe(false);
      expect(settingsManager.get('taskSorting')).toBe('text');
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:loaded', 
        expect.objectContaining({ settings: expect.objectContaining(savedSettings) })
      );
    });

    test('should handle IndexedDB errors gracefully during initialization', async () => {
      mockStorage.get.mockRejectedValue(new Error('IndexedDB error'));
      
      await settingsManager.init();
      
      // Should fall back to defaults
      expect(settingsManager.get('theme')).toBe('light');
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:error', 
        expect.objectContaining({ context: 'Settings Load' })
      );
    });

    test('should always disable debug mode on startup', async () => {
      const savedSettings = { debugMode: true };
      mockStorage.get.mockResolvedValue(savedSettings);
      
      await settingsManager.init();
      
      expect(settingsManager.get('debugMode')).toBe(false);
    });
  });

  describe('Settings Get/Set Operations', () => {
    beforeEach(async () => {
      await settingsManager.init();
    });

    test('should get setting values', () => {
      expect(settingsManager.get('theme')).toBe('light');
      expect(settingsManager.get('nonexistent')).toBeUndefined();
    });

    test('should get all settings when no key specified', () => {
      const allSettings = settingsManager.get();
      
      expect(allSettings).toEqual(expect.objectContaining({
        theme: 'light',
        debugMode: false,
        notifications: true,
        autoSave: true
      }));
    });

    test('should set individual settings', async () => {
      await settingsManager.set('theme', 'dark');
      
      expect(settingsManager.get('theme')).toBe('dark');
      expect(mockStorage.set).toHaveBeenCalledWith(
        'app-settings',
        expect.objectContaining({ theme: 'dark' })
      );
    });

    test('should save settings to IndexedDB', async () => {
      const updates = {
        theme: 'dark',
        notifications: false
      };
      
      await settingsManager.saveSettings(updates);
      
      expect(mockStorage.set).toHaveBeenCalledWith(
        'app-settings',
        expect.objectContaining(updates)
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:saved', 
        expect.objectContaining({ settings: expect.objectContaining(updates) })
      );
    });

    test('should handle save errors gracefully', async () => {
      mockStorage.set.mockRejectedValue(new Error('IndexedDB save failed'));
      
      await settingsManager.saveSettings({ theme: 'dark' });
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:error', 
        expect.objectContaining({ context: 'Settings Save' })
      );
    });
  });

  describe('Debug Mode Management', () => {
    beforeEach(async () => {
      await settingsManager.init();
    });

    test('should set debug mode', async () => {
      await settingsManager.setDebugMode(true);
      
      expect(settingsManager.get('debugMode')).toBe(true);
      expect(mockStorage.set).toHaveBeenCalled();
    });

    test('should ensure debug mode is boolean', async () => {
      await settingsManager.setDebugMode('true');
      
      expect(settingsManager.get('debugMode')).toBe(true);
    });
  });

  describe('Theme Management', () => {
    beforeEach(async () => {
      await settingsManager.init();
    });

    test('should get current theme', () => {
      expect(settingsManager.getTheme()).toBe('light');
    });

    test('should set valid theme', async () => {
      await settingsManager.setTheme('dark');
      
      expect(settingsManager.get('theme')).toBe('dark');
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:theme-changed', { theme: 'dark' });
    });

    test('should reject invalid theme', async () => {
      await settingsManager.setTheme('invalid');
      
      expect(settingsManager.get('theme')).toBe('light'); // Should remain unchanged
    });

    test('should accept valid themes', async () => {
      const validThemes = ['light', 'dark', 'auto'];
      
      for (const theme of validThemes) {
        await settingsManager.setTheme(theme);
        expect(settingsManager.get('theme')).toBe(theme);
      }
    });
  });

  describe('Settings Validation', () => {
    beforeEach(async () => {
      await settingsManager.init();
    });

    test('should validate correct settings', () => {
      const validSettings = {
        theme: 'dark',
        taskSorting: 'text',
        taskDensity: 'compact',
        language: 'en',
        maxHistoryEntries: 50,
        archiveAfterDays: 30
      };
      
      expect(settingsManager.validateSettings(validSettings)).toBe(true);
    });

    test('should reject invalid theme', () => {
      const invalidSettings = { theme: 'invalid' };
      
      expect(settingsManager.validateSettings(invalidSettings)).toBe(false);
    });

    test('should reject invalid task sorting', () => {
      const invalidSettings = { taskSorting: 'invalid' };
      
      expect(settingsManager.validateSettings(invalidSettings)).toBe(false);
    });

    test('should reject invalid numeric ranges', () => {
      expect(settingsManager.validateSettings({ maxHistoryEntries: 5 })).toBe(false);
      expect(settingsManager.validateSettings({ maxHistoryEntries: 2000 })).toBe(false);
      expect(settingsManager.validateSettings({ archiveAfterDays: 0 })).toBe(false);
      expect(settingsManager.validateSettings({ archiveAfterDays: 400 })).toBe(false);
    });

    test('should accept valid numeric ranges', () => {
      expect(settingsManager.validateSettings({ maxHistoryEntries: 50 })).toBe(true);
      expect(settingsManager.validateSettings({ archiveAfterDays: 30 })).toBe(true);
    });
  });

  describe('Settings Reset', () => {
    beforeEach(async () => {
      await settingsManager.init();
    });

    test('should reset settings to defaults', async () => {
      // First change some settings
      await settingsManager.set('theme', 'dark');
      await settingsManager.set('notifications', false);
      
      await settingsManager.resetSettings();
      
      expect(mockStorage.clear).toHaveBeenCalled();
      expect(settingsManager.get('theme')).toBe('light');
      expect(settingsManager.get('notifications')).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:reset', 
        expect.objectContaining({ settings: expect.anything() })
      );
    });
  });

  describe('Import/Export Functionality', () => {
    beforeEach(async () => {
      await settingsManager.init();
    });

    test('should export settings', () => {
      const exportData = settingsManager.exportSettings();
      
      expect(exportData).toEqual(expect.objectContaining({
        settings: expect.objectContaining({
          theme: 'light',
          debugMode: false
        }),
        exportDate: expect.any(String),
        version: '3.0.0'
      }));
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:exported', exportData);
    });

    test('should import valid settings', async () => {
      const importData = {
        settings: {
          theme: 'dark',
          notifications: false,
          taskSorting: 'text'
        }
      };
      
      await settingsManager.importSettings(importData);
      
      expect(settingsManager.get('theme')).toBe('dark');
      expect(settingsManager.get('notifications')).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:imported', 
        expect.objectContaining({ settings: expect.anything() })
      );
    });

    test('should reject invalid import data', async () => {
      const invalidData = {
        settings: { theme: 'invalid' }
      };
      
      await settingsManager.importSettings(invalidData);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:error', 
        expect.objectContaining({ context: 'Settings Import' })
      );
    });

    test('should handle malformed import data', async () => {
      await settingsManager.importSettings(null);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:error', 
        expect.objectContaining({ context: 'Settings Import' })
      );
    });
  });

  describe('Debug Log Utility', () => {
    test('should log when debug mode is enabled', () => {
      settingsManager.currentSettings.debugMode = true;
      
      const { debugLog } = settingsModule;
      debugLog.log('test message');
      
      expect(console.log).toHaveBeenCalledWith('[DEBUG]', 'test message');
    });

    test('should not log when debug mode is disabled', () => {
      settingsManager.currentSettings.debugMode = false;
      
      const { debugLog } = settingsModule;
      debugLog.log('test message');
      
      expect(console.log).not.toHaveBeenCalled();
    });

    test('should support warn and error logging', () => {
      settingsManager.currentSettings.debugMode = true;
      
      const { debugLog } = settingsModule;
      debugLog.warn('warning');
      debugLog.error('error');
      
      expect(console.warn).toHaveBeenCalledWith('[DEBUG]', 'warning');
      expect(console.error).toHaveBeenCalledWith('[DEBUG]', 'error');
    });
  });

  describe('Settings Before Initialization', () => {
    test('should return defaults when not initialized', () => {
      const newManager = Object.create(Object.getPrototypeOf(settingsManager));
      newManager.defaultSettings = settingsManager.defaultSettings;
      newManager.isInitialized = false;
      
      expect(newManager.get('theme')).toBe('light');
    });

    test('should warn when accessing settings before initialization', () => {
      const newManager = Object.create(Object.getPrototypeOf(settingsManager));
      newManager.defaultSettings = settingsManager.defaultSettings;
      newManager.isInitialized = false;
      
      newManager.get('theme');
      
      expect(console.warn).toHaveBeenCalledWith('Settings not initialized yet, returning defaults');
    });
  });
});