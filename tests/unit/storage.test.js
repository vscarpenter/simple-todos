/**
 * Comprehensive Unit Tests for Storage System
 * Tests versioned storage, data migration, import/export, and error handling
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

const mockSettingsManager = {
  get: jest.fn(() => false), // debugMode default
  debugLog: jest.fn()
};

// Create module mocks
global.createModuleMock('scripts/modules/eventBus.js', mockEventBus);
global.createModuleMock('scripts/modules/settings.js', { settingsManager: mockSettingsManager });

describe('StorageAPI', () => {
  let StorageAPI;
  let storage;

  beforeEach(async () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear mocks
    mockEventBus.emit.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();
    mockSettingsManager.get.mockClear();
    mockSettingsManager.debugLog.mockClear();
    
    // Import StorageAPI after mocking
    const storageModule = await import('scripts/modules/storage.js');
    StorageAPI = storageModule.default;
    storage = new StorageAPI();
  });

  describe('Initialization', () => {
    test('should initialize with correct version', () => {
      expect(storage.version).toBe('2.0');
      expect(storage.storageKey).toBe('cascade-app');
      expect(storage.migrations).toBeDefined();
    });

    test('should emit initialization event', () => {
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:initialized', { version: '2.0' });
    });

    test('should handle initialization errors gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Storage error');
      });
      
      expect(() => new StorageAPI()).not.toThrow();
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', expect.any(Object));
      
      // Restore localStorage
      localStorage.getItem = originalGetItem;
    });
  });

  describe('Basic Storage Operations', () => {
    test('should save data with version info', () => {
      const testData = { boards: [], currentBoardId: null };
      
      const result = storage.save(testData);
      
      expect(result).toBe(true);
      
      const stored = JSON.parse(localStorage.getItem('cascade-app'));
      expect(stored.version).toBe('2.0');
      expect(stored.data).toEqual(testData);
      expect(stored.timestamp).toBeDefined();
    });

    test('should load data successfully', () => {
      const testData = { boards: [{ id: 'board-1', name: 'Test' }], currentBoardId: 'board-1' };
      storage.save(testData);
      
      const loaded = storage.load();
      
      expect(loaded).toEqual(testData);
    });

    test('should return default value when no data exists', () => {
      const defaultValue = { boards: [], currentBoardId: null };
      
      const loaded = storage.load(defaultValue);
      
      expect(loaded).toEqual(defaultValue);
    });

    test('should handle corrupted data gracefully', () => {
      localStorage.setItem('cascade-app', 'invalid json');
      
      const loaded = storage.load({ default: 'value' });
      
      expect(loaded).toEqual({ default: 'value' });
    });

    test('should clear specific data', () => {
      storage.save({ test: 'data' });
      
      const result = storage.clear();
      
      expect(result).toBe(true);
      expect(localStorage.getItem('cascade-app')).toBeNull();
    });

    test('should clear all storage data', () => {
      localStorage.setItem('other-key', 'other-data');
      storage.save({ test: 'data' });
      
      const result = storage.clearAll();
      
      expect(result).toBe(true);
      expect(localStorage.length).toBe(0);
    });
  });

  describe('Data Migration', () => {
    test('should detect and run migrations for v1.0 data', () => {
      const v1Data = {
        version: '1.0',
        data: {
          todos: [
            { text: 'Task 1', completed: false },
            { text: 'Task 2', completed: true }
          ]
        }
      };
      
      localStorage.setItem('cascade-app', JSON.stringify(v1Data));
      
      // Create new storage instance to trigger migration
      const newStorage = new StorageAPI();
      
      const migratedData = newStorage.load();
      expect(migratedData.boards).toBeDefined();
      expect(migratedData.boards).toHaveLength(1);
      expect(migratedData.boards[0].tasks).toHaveLength(2);
    });

    test('should handle legacy cascade-tasks format', () => {
      const legacyTasks = [
        { id: 'task-1', text: 'Legacy task 1', status: 'todo' },
        { id: 'task-2', text: 'Legacy task 2', status: 'done' }
      ];
      
      localStorage.setItem('cascade-tasks', JSON.stringify(legacyTasks));
      
      const newStorage = new StorageAPI();
      const migratedData = newStorage.load();
      
      expect(migratedData.boards).toHaveLength(1);
      expect(migratedData.boards[0].name).toBe('Main Board');
      expect(migratedData.boards[0].tasks).toEqual(legacyTasks);
    });

    test('should handle legacy todos format', () => {
      const legacyTodos = [
        { text: 'Todo 1', completed: false },
        { text: 'Todo 2', completed: true }
      ];
      
      localStorage.setItem('todos', JSON.stringify(legacyTodos));
      
      const newStorage = new StorageAPI();
      const migratedData = newStorage.load();
      
      expect(migratedData.boards).toHaveLength(1);
      expect(migratedData.boards[0].tasks).toHaveLength(2);
      expect(migratedData.boards[0].tasks[0].status).toBe('todo');
      expect(migratedData.boards[0].tasks[1].status).toBe('done');
    });

    test('should add custom migration', () => {
      const customMigration = jest.fn((data) => ({ ...data, migrated: true }));
      
      storage.addMigration('1.5', customMigration);
      
      expect(storage.migrations['1.5']).toBe(customMigration);
    });

    test('should run custom migrations in order', () => {
      const migration1 = jest.fn((data) => ({ ...data, step1: true }));
      const migration2 = jest.fn((data) => ({ ...data, step2: true }));
      
      storage.addMigration('1.1', migration1);
      storage.addMigration('1.2', migration2);
      
      const testData = { version: '1.0', data: { original: true } };
      storage.runMigrations('1.0', testData.data);
      
      expect(migration1).toHaveBeenCalled();
      expect(migration2).toHaveBeenCalled();
    });
  });

  describe('Import/Export Operations', () => {
    test('should export data with metadata', () => {
      const testData = {
        boards: [{ id: 'board-1', name: 'Test Board', tasks: [] }],
        currentBoardId: 'board-1'
      };
      
      storage.save(testData);
      
      const exported = storage.exportData();
      
      expect(exported.version).toBe('2.0');
      expect(exported.exportDate).toBeDefined();
      expect(exported.data).toEqual(testData);
      expect(exported.metadata).toBeDefined();
      expect(exported.metadata.totalBoards).toBe(1);
      expect(exported.metadata.totalTasks).toBe(0);
    });

    test('should export with custom options', () => {
      const testData = { boards: [], currentBoardId: null };
      storage.save(testData);
      
      const options = { includeArchived: false, includeSettings: true };
      const exported = storage.exportData(options);
      
      expect(exported.options).toEqual(options);
    });

    test('should import valid data successfully', () => {
      const importData = {
        version: '2.0',
        data: {
          boards: [{ id: 'imported-board', name: 'Imported Board', tasks: [] }],
          currentBoardId: 'imported-board'
        }
      };
      
      const result = storage.importData(importData);
      
      expect(result).toBe(true);
      
      const loaded = storage.load();
      expect(loaded.boards).toHaveLength(1);
      expect(loaded.boards[0].name).toBe('Imported Board');
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:imported', expect.any(Object));
    });

    test('should validate import data format', () => {
      const invalidData = { invalid: 'format' };
      
      const result = storage.importData(invalidData);
      
      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', expect.any(Object));
    });

    test('should handle import data migration', () => {
      const v1ImportData = {
        version: '1.0',
        data: {
          todos: [{ text: 'Imported task', completed: false }]
        }
      };
      
      const result = storage.importData(v1ImportData);
      
      expect(result).toBe(true);
      
      const loaded = storage.load();
      expect(loaded.boards).toBeDefined();
      expect(loaded.boards[0].tasks).toHaveLength(1);
    });

    test('should merge import data when specified', () => {
      // Set up existing data
      const existingData = {
        boards: [{ id: 'existing-board', name: 'Existing', tasks: [] }],
        currentBoardId: 'existing-board'
      };
      storage.save(existingData);
      
      // Import new data with merge option
      const importData = {
        version: '2.0',
        data: {
          boards: [{ id: 'imported-board', name: 'Imported', tasks: [] }],
          currentBoardId: 'imported-board'
        },
        options: { merge: true }
      };
      
      const result = storage.importData(importData);
      
      expect(result).toBe(true);
      
      const loaded = storage.load();
      expect(loaded.boards).toHaveLength(2);
    });
  });

  describe('Storage Information and Monitoring', () => {
    test('should get storage information', () => {
      storage.save({ test: 'data' });
      
      const info = storage.getStorageInfo();
      
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('storageKey');
      expect(info).toHaveProperty('dataSize');
      expect(info).toHaveProperty('lastSaved');
      expect(info).toHaveProperty('isAvailable');
    });

    test('should check storage availability', () => {
      expect(storage.isStorageAvailable()).toBe(true);
    });

    test('should handle storage unavailability', () => {
      // Mock localStorage to be unavailable
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage not available');
      });
      
      const result = storage.save({ test: 'data' });
      
      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', expect.any(Object));
      
      // Restore localStorage
      localStorage.setItem = originalSetItem;
    });

    test('should calculate storage usage', () => {
      const largeData = {
        boards: Array.from({ length: 100 }, (_, i) => ({
          id: `board-${i}`,
          name: `Board ${i}`,
          tasks: Array.from({ length: 10 }, (_, j) => ({
            id: `task-${i}-${j}`,
            text: `Task ${j} in Board ${i}`,
            status: 'todo'
          }))
        }))
      };
      
      storage.save(largeData);
      
      const info = storage.getStorageInfo();
      expect(info.dataSize).toBeGreaterThan(0);
      expect(typeof info.dataSize).toBe('number');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle quota exceeded error', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      const result = storage.save({ large: 'data' });
      
      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', 
        expect.objectContaining({ 
          error: expect.objectContaining({ name: 'QuotaExceededError' })
        })
      );
      
      localStorage.setItem = originalSetItem;
    });

    test('should handle null/undefined data gracefully', () => {
      expect(() => storage.save(null)).not.toThrow();
      expect(() => storage.save(undefined)).not.toThrow();
      expect(() => storage.importData(null)).not.toThrow();
      expect(() => storage.importData(undefined)).not.toThrow();
    });

    test('should handle circular references in data', () => {
      const circularData = { boards: [] };
      circularData.self = circularData;
      
      const result = storage.save(circularData);
      
      expect(result).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', expect.any(Object));
    });

    test('should handle malformed JSON in localStorage', () => {
      localStorage.setItem('cascade-app', '{"invalid": json}');
      
      const loaded = storage.load({ default: 'fallback' });
      
      expect(loaded).toEqual({ default: 'fallback' });
    });

    test('should handle storage access errors', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Access denied');
      });
      
      const loaded = storage.load({ fallback: true });
      
      expect(loaded).toEqual({ fallback: true });
      
      localStorage.getItem = originalGetItem;
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle large datasets efficiently', () => {
      const largeData = {
        boards: Array.from({ length: 1000 }, (_, i) => ({
          id: `board-${i}`,
          name: `Board ${i}`,
          tasks: Array.from({ length: 100 }, (_, j) => ({
            id: `task-${i}-${j}`,
            text: `Task ${j}`,
            status: 'todo'
          }))
        }))
      };
      
      const startTime = Date.now();
      const saveResult = storage.save(largeData);
      const saveTime = Date.now() - startTime;
      
      expect(saveResult).toBe(true);
      expect(saveTime).toBeLessThan(1000); // Should complete within 1 second
      
      const loadStartTime = Date.now();
      const loaded = storage.load();
      const loadTime = Date.now() - loadStartTime;
      
      expect(loaded.boards).toHaveLength(1000);
      expect(loadTime).toBeLessThan(500); // Should load within 0.5 seconds
    });

    test('should compress data when possible', () => {
      const repetitiveData = {
        boards: Array.from({ length: 100 }, () => ({
          id: 'same-id',
          name: 'Same Name',
          description: 'Same Description',
          tasks: []
        }))
      };
      
      storage.save(repetitiveData);
      
      const rawStored = localStorage.getItem('cascade-app');
      const info = storage.getStorageInfo();
      
      // Data should be stored efficiently
      expect(rawStored.length).toBeLessThan(JSON.stringify(repetitiveData).length * 2);
    });

    test('should handle concurrent operations safely', async () => {
      const operations = [];
      
      // Simulate concurrent save operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise(resolve => {
            setTimeout(() => {
              const result = storage.save({ operation: i, timestamp: Date.now() });
              resolve(result);
            }, Math.random() * 10);
          })
        );
      }
      
      const results = await Promise.all(operations);
      
      // All operations should succeed
      results.forEach(result => {
        expect(result).toBe(true);
      });
      
      // Final data should be valid
      const finalData = storage.load();
      expect(finalData).toBeDefined();
      expect(finalData.operation).toBeDefined();
    });
  });

  describe('Event Emission', () => {
    test('should emit save events', () => {
      storage.save({ test: 'data' });
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:saved', expect.any(Object));
    });

    test('should emit load events', () => {
      storage.save({ test: 'data' });
      mockEventBus.emit.mockClear();
      
      storage.load();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:loaded', expect.any(Object));
    });

    test('should emit error events with context', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Test error');
      });
      
      storage.save({ test: 'data' });
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', 
        expect.objectContaining({
          error: expect.any(Error),
          operation: 'save'
        })
      );
      
      localStorage.setItem = originalSetItem;
    });

    test('should emit migration events', () => {
      const v1Data = {
        version: '1.0',
        data: { todos: [] }
      };
      
      localStorage.setItem('cascade-app', JSON.stringify(v1Data));
      
      new StorageAPI();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:migrated', 
        expect.objectContaining({
          fromVersion: '1.0',
          toVersion: '2.0'
        })
      );
    });
  });
});