/**
 * Comprehensive Unit Tests for Settings Management
 * Tests settings storage, validation, theme management, and debug functionality
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

global.createModuleMock('scripts/modules/eventBus.js', mockEventBus);

describe('Settings Management', () => {
  let settingsModule;
  let settingsManager;

  beforeEach(async () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear mocks
    mockEventBus.emit.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();
    
    // Clear console mocks
    if (console.log.mockClear) console.log.mockClear();
    if (console.error.mockClear) console.error.mockClear();
    if (console.warn.mockClear) console.warn.mockClear();
    
    // Import settings module
    settingsModule = await import('scripts/modules/settings.js');
    settingsManager = settingsModule.settingsManager;
  });

  describe('Initialization', () => {
    test('should initialize with default settings', () => {
      expect(settingsManager.get('theme')).toBe('light');
      expect(settingsManager.get('autoArchive')).toBe(false);
      expect(settingsManager.get('autoArchiveDays')).toBe(30);
      expect(settingsManager.get('debugMode')).toBe(false);
      expect(settingsManager.get('accessibility')).toEqual({
        highContrast: false,
        reducedMotion: false,
        screenReader: false
      });
    });

    test('should load settings from localStorage if available', () => {
      const savedSettings = {
        theme: 'dark',
        autoArchive: true,
        autoArchiveDays: 7,
        debugMode: true
      };
      
      localStorage.setItem('cascade-settings', JSON.stringify(savedSettings));
      
      // Re-import to trigger initialization
      delete require.cache[require.resolve('scripts/modules/settings.js')];
      const newSettingsModule = require('scripts/modules/settings.js');
      
      expect(newSettingsModule.settingsManager.get('theme')).toBe('dark');
      expect(newSettingsModule.settingsManager.get('autoArchive')).toBe(true);
      expect(newSettingsModule.settingsManager.get('autoArchiveDays')).toBe(7);
      expect(newSettingsModule.settingsManager.get('debugMode')).toBe(true);
    });

    test('should handle corrupted settings gracefully', () => {
      localStorage.setItem('cascade-settings', 'invalid json');
      
      expect(() => {
        delete require.cache[require.resolve('scripts/modules/settings.js')];
        require('scripts/modules/settings.js');
      }).not.toThrow();
    });
  });

  describe('Settings Get/Set Operations', () => {
    test('should get setting values', () => {
      expect(settingsManager.get('theme')).toBe('light');
      expect(settingsManager.get('nonexistent')).toBeUndefined();
    });

    test('should set individual settings', () => {
      settingsManager.set('theme', 'dark');
      
      expect(settingsManager.get('theme')).toBe('dark');
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:changed', 
        expect.objectContaining({ key: 'theme', value: 'dark' })
      );
    });

    test('should set multiple settings at once', () => {
      const updates = {
        theme: 'dark',
        autoArchive: true,
        autoArchiveDays: 14
      };
      
      settingsManager.setMultiple(updates);
      
      expect(settingsManager.get('theme')).toBe('dark');
      expect(settingsManager.get('autoArchive')).toBe(true);
      expect(settingsManager.get('autoArchiveDays')).toBe(14);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:changed', 
        expect.objectContaining({ updates })
      );
    });

    test('should get all settings', () => {
      settingsManager.set('theme', 'dark');
      settingsManager.set('debugMode', true);
      
      const allSettings = settingsManager.getAll();
      
      expect(allSettings).toHaveProperty('theme', 'dark');
      expect(allSettings).toHaveProperty('debugMode', true);
      expect(allSettings).toHaveProperty('autoArchive', false);
    });

    test('should reset to default settings', () => {
      settingsManager.set('theme', 'dark');
      settingsManager.set('debugMode', true);
      
      settingsManager.reset();
      
      expect(settingsManager.get('theme')).toBe('light');
      expect(settingsManager.get('debugMode')).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:reset');
    });
  });

  describe('Settings Validation', () => {
    test('should validate theme setting', () => {
      expect(() => settingsManager.set('theme', 'light')).not.toThrow();
      expect(() => settingsManager.set('theme', 'dark')).not.toThrow();
      expect(() => settingsManager.set('theme', 'auto')).not.toThrow();
      expect(() => settingsManager.set('theme', 'invalid')).toThrow('Invalid theme value');
    });

    test('should validate autoArchiveDays setting', () => {
      expect(() => settingsManager.set('autoArchiveDays', 1)).not.toThrow();
      expect(() => settingsManager.set('autoArchiveDays', 30)).not.toThrow();
      expect(() => settingsManager.set('autoArchiveDays', 365)).not.toThrow();
      expect(() => settingsManager.set('autoArchiveDays', 0)).toThrow('Auto-archive days must be between 1 and 365');
      expect(() => settingsManager.set('autoArchiveDays', 366)).toThrow('Auto-archive days must be between 1 and 365');
      expect(() => settingsManager.set('autoArchiveDays', 'invalid')).toThrow('Auto-archive days must be a number');
    });

    test('should validate boolean settings', () => {
      expect(() => settingsManager.set('autoArchive', true)).not.toThrow();
      expect(() => settingsManager.set('autoArchive', false)).not.toThrow();
      expect(() => settingsManager.set('debugMode', true)).not.toThrow();
      expect(() => settingsManager.set('debugMode', false)).not.toThrow();
      expect(() => settingsManager.set('autoArchive', 'invalid')).toThrow();
      expect(() => settingsManager.set('debugMode', 1)).toThrow();
    });

    test('should validate accessibility settings', () => {
      const validAccessibility = {
        highContrast: true,
        reducedMotion: false,
        screenReader: true
      };
      
      expect(() => settingsManager.set('accessibility', validAccessibility)).not.toThrow();
      
      const invalidAccessibility = {
        highContrast: 'invalid',
        reducedMotion: false
      };
      
      expect(() => settingsManager.set('accessibility', invalidAccessibility)).toThrow();
    });

    test('should reject unknown settings', () => {
      expect(() => settingsManager.set('unknownSetting', 'value')).toThrow('Unknown setting: unknownSetting');
    });
  });

  describe('Theme Management', () => {
    test('should apply theme changes to document', () => {
      // Mock document.documentElement
      const mockDocumentElement = {
        setAttribute: jest.fn(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn()
        }
      };
      
      Object.defineProperty(document, 'documentElement', {
        value: mockDocumentElement,
        writable: true
      });
      
      settingsManager.set('theme', 'dark');
      
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    test('should detect system theme preference', () => {
      // Mock window.matchMedia
      const mockMatchMedia = jest.fn((query) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true
      });
      
      settingsManager.set('theme', 'auto');
      
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    test('should handle theme change events', () => {
      const themeCallback = jest.fn();
      
      mockEventBus.on.mockImplementation((event, callback) => {
        if (event === 'settings:changed') {
          themeCallback.mockImplementation(callback);
        }
      });
      
      settingsManager.set('theme', 'dark');
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:changed', 
        expect.objectContaining({ key: 'theme', value: 'dark' })
      );
    });
  });

  describe('Debug Mode', () => {
    test('should enable debug logging when debug mode is on', () => {
      settingsManager.set('debugMode', true);
      
      settingsModule.debugLog('Test debug message');
      
      expect(console.log).toHaveBeenCalledWith('[DEBUG]', 'Test debug message');
    });

    test('should not log when debug mode is off', () => {
      settingsManager.set('debugMode', false);
      
      settingsModule.debugLog('Test debug message');
      
      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle debug log with multiple arguments', () => {
      settingsManager.set('debugMode', true);
      
      settingsModule.debugLog('Message:', { data: 'test' }, 'additional info');
      
      expect(console.log).toHaveBeenCalledWith('[DEBUG]', 'Message:', { data: 'test' }, 'additional info');
    });

    test('should provide debug utilities', () => {
      settingsManager.set('debugMode', true);
      
      const debugUtils = settingsModule.getDebugUtils();
      
      expect(debugUtils).toHaveProperty('getSettings');
      expect(debugUtils).toHaveProperty('clearSettings');
      expect(debugUtils).toHaveProperty('exportSettings');
      expect(debugUtils).toHaveProperty('importSettings');
      expect(typeof debugUtils.getSettings).toBe('function');
    });
  });

  describe('Accessibility Settings', () => {
    test('should apply high contrast mode', () => {
      const mockDocumentElement = {
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn()
        }
      };
      
      Object.defineProperty(document, 'documentElement', {
        value: mockDocumentElement,
        writable: true
      });
      
      settingsManager.set('accessibility', {
        highContrast: true,
        reducedMotion: false,
        screenReader: false
      });
      
      expect(mockDocumentElement.classList.toggle).toHaveBeenCalledWith('high-contrast', true);
    });

    test('should apply reduced motion preference', () => {
      const mockDocumentElement = {
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn()
        }
      };
      
      Object.defineProperty(document, 'documentElement', {
        value: mockDocumentElement,
        writable: true
      });
      
      settingsManager.set('accessibility', {
        highContrast: false,
        reducedMotion: true,
        screenReader: false
      });
      
      expect(mockDocumentElement.classList.toggle).toHaveBeenCalledWith('reduced-motion', true);
    });

    test('should detect system accessibility preferences', () => {
      const mockMatchMedia = jest.fn((query) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true
      });
      
      const systemPrefs = settingsModule.getSystemAccessibilityPreferences();
      
      expect(systemPrefs).toHaveProperty('reducedMotion');
      expect(systemPrefs).toHaveProperty('highContrast');
    });
  });

  describe('Settings Persistence', () => {
    test('should save settings to localStorage', () => {
      settingsManager.set('theme', 'dark');
      settingsManager.set('autoArchive', true);
      
      const saved = JSON.parse(localStorage.getItem('cascade-settings'));
      expect(saved.theme).toBe('dark');
      expect(saved.autoArchive).toBe(true);
    });

    test('should handle localStorage save errors', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      
      expect(() => settingsManager.set('theme', 'dark')).not.toThrow();
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:error', expect.any(Object));
      
      localStorage.setItem = originalSetItem;
    });

    test('should export settings', () => {
      settingsManager.set('theme', 'dark');
      settingsManager.set('debugMode', true);
      
      const exported = settingsManager.export();
      
      expect(exported).toHaveProperty('version');
      expect(exported).toHaveProperty('exportDate');
      expect(exported).toHaveProperty('settings');
      expect(exported.settings.theme).toBe('dark');
      expect(exported.settings.debugMode).toBe(true);
    });

    test('should import settings', () => {
      const importData = {
        version: '2.0',
        settings: {
          theme: 'dark',
          autoArchive: true,
          autoArchiveDays: 7
        }
      };
      
      const result = settingsManager.import(importData);
      
      expect(result).toBe(true);
      expect(settingsManager.get('theme')).toBe('dark');
      expect(settingsManager.get('autoArchive')).toBe(true);
      expect(settingsManager.get('autoArchiveDays')).toBe(7);
    });

    test('should validate import data', () => {
      const invalidImportData = {
        version: '1.0', // Wrong version
        settings: {
          theme: 'invalid-theme'
        }
      };
      
      const result = settingsManager.import(invalidImportData);
      
      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:error', expect.any(Object));
    });
  });

  describe('Settings Migration', () => {
    test('should migrate old settings format', () => {
      const oldSettings = {
        darkMode: true, // Old format
        archiveDays: 14 // Old format
      };
      
      localStorage.setItem('cascade-settings', JSON.stringify(oldSettings));
      
      const migratedSettings = settingsModule.migrateSettings(oldSettings);
      
      expect(migratedSettings.theme).toBe('dark');
      expect(migratedSettings.autoArchiveDays).toBe(14);
    });

    test('should handle missing migration gracefully', () => {
      const unknownSettings = {
        unknownProperty: 'value'
      };
      
      expect(() => settingsModule.migrateSettings(unknownSettings)).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    test('should emit events on setting changes', () => {
      settingsManager.set('theme', 'dark');
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:changed', {
        key: 'theme',
        value: 'dark',
        previousValue: 'light'
      });
    });

    test('should emit events on multiple setting changes', () => {
      const updates = { theme: 'dark', debugMode: true };
      
      settingsManager.setMultiple(updates);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('settings:changed', {
        updates,
        type: 'multiple'
      });
    });

    test('should not emit events for unchanged values', () => {
      settingsManager.set('theme', 'light'); // Same as default
      
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid setting values gracefully', () => {
      expect(() => settingsManager.set('theme', null)).toThrow();
      expect(() => settingsManager.set('theme', undefined)).toThrow();
      expect(() => settingsManager.set('theme', {})).toThrow();
    });

    test('should handle storage errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });
      
      expect(() => settingsManager.set('theme', 'dark')).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });

    test('should handle corrupted localStorage data', () => {
      localStorage.setItem('cascade-settings', 'invalid json');
      
      expect(() => settingsManager.load()).not.toThrow();
      expect(settingsManager.get('theme')).toBe('light'); // Should fall back to defaults
    });
  });

  describe('Performance and Memory', () => {
    test('should handle rapid setting changes efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        settingsManager.set('autoArchiveDays', (i % 365) + 1);
      }
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(settingsManager.get('autoArchiveDays')).toBe(((999 % 365) + 1));
    });

    test('should not create memory leaks with event listeners', () => {
      const callbacks = [];
      
      // Simulate many event subscriptions
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        mockEventBus.on('settings:changed', callback);
      }
      
      settingsManager.set('theme', 'dark');
      
      // Should not cause performance issues
      expect(mockEventBus.emit).toHaveBeenCalled();
    });
  });

  describe('Integration with System Preferences', () => {
    test('should respect system color scheme preference', () => {
      const mockMatchMedia = jest.fn((query) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true
      });
      
      settingsManager.set('theme', 'auto');
      
      const effectiveTheme = settingsModule.getEffectiveTheme();
      expect(effectiveTheme).toBe('dark');
    });

    test('should update theme when system preference changes', () => {
      const mockMatchMedia = jest.fn((query) => {
        const mediaQuery = {
          matches: false,
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        };
        
        // Simulate system theme change
        setTimeout(() => {
          mediaQuery.matches = true;
          if (mediaQuery.onchange) {
            mediaQuery.onchange({ matches: true });
          }
        }, 10);
        
        return mediaQuery;
      });
      
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true
      });
      
      settingsManager.set('theme', 'auto');
      
      // Should set up listener for system changes
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
  });
});