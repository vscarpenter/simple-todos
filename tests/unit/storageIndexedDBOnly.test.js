/**
 * Comprehensive Unit Tests for IndexedDB-Only Storage System
 * Tests pure IndexedDB storage implementation without localStorage fallback
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
global.createModuleMock('scripts/modules/settings.js', { 
  settingsManager: mockSettingsManager,
  debugLog: { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
});

describe('IndexedDBOnlyStorage', () => {
  let storage;

  beforeEach(async () => {
    // Clear mocks
    mockEventBus.emit.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();
    mockSettingsManager.get.mockClear();
    mockSettingsManager.debugLog.mockClear();
    
    // Import storage after mocking
    const storageModule = await import('scripts/modules/storageIndexedDBOnly.js');
    storage = storageModule.default;
    
    // Reset storage state
    storage.isInitialized = false;
    storage.db = null;
  });

  describe('Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(storage.dbName).toBe('cascade-app');
      expect(storage.version).toBe(5);
      expect(storage.stores).toBeDefined();
      expect(storage.stores.boards).toBeDefined();
      expect(storage.stores.tasks).toBeDefined();
      expect(storage.stores.settings).toBeDefined();
    });

    test('should throw error when IndexedDB is not supported', async () => {
      const originalIndexedDB = global.indexedDB;
      delete global.indexedDB;

      await expect(storage.init()).rejects.toThrow('IndexedDB not supported');
      
      global.indexedDB = originalIndexedDB;
    });

    test('should initialize successfully with IndexedDB support', async () => {
      // Mock successful initialization
      const mockDB = {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            get: jest.fn(() => ({ onsuccess: null, onerror: null })),
            put: jest.fn(() => ({ onsuccess: null, onerror: null }))
          })),
          oncomplete: null,
          onerror: null
        }))
      };

      storage.openDatabase = jest.fn().mockResolvedValue(mockDB);
      storage.initializeFirstTimeSetup = jest.fn().mockResolvedValue();

      const result = await storage.init();
      
      expect(result).toBe(true);
      expect(storage.isInitialized).toBe(true);
      expect(storage.db).toBe(mockDB);
    });
  });

  describe('Data Operations', () => {
    beforeEach(() => {
      // Mock initialized state
      storage.isInitialized = true;
      storage.db = {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
            put: jest.fn(() => ({ onsuccess: null, onerror: null })),
            get: jest.fn(() => ({ onsuccess: null, onerror: null })),
            getAll: jest.fn(() => ({ onsuccess: null, onerror: null }))
          })),
          oncomplete: null,
          onerror: null
        }))
      };
    });

    test('should save data successfully', async () => {
      const testData = {
        boards: [
          { id: 'board-1', name: 'Test Board', tasks: [] }
        ],
        currentBoardId: 'board-1',
        filter: 'all'
      };

      storage.clearStore = jest.fn().mockResolvedValue();
      storage.putData = jest.fn().mockResolvedValue();
      storage.waitForTransaction = jest.fn().mockResolvedValue();

      const result = await storage.save(testData);

      expect(result).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:saved', { data: testData });
    });

    test('should load data successfully', async () => {
      const mockBoards = [{ id: 'board-1', name: 'Test Board' }];
      const mockMetadata = { currentBoardId: 'board-1', filter: 'all' };

      storage.getAllData = jest.fn().mockResolvedValue(mockBoards);
      storage.getData = jest.fn().mockResolvedValue(mockMetadata);

      const result = await storage.load();

      expect(result).toEqual({
        boards: mockBoards,
        currentBoardId: 'board-1',
        filter: 'all'
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:loaded', { data: result });
    });

    test('should handle save errors gracefully', async () => {
      const testData = { boards: [], currentBoardId: null };
      const testError = new Error('IndexedDB error');

      storage.ensureInitialized = jest.fn().mockRejectedValue(testError);

      await expect(storage.save(testData)).rejects.toThrow(testError);
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', { 
        error: testError, 
        operation: 'save' 
      });
    });

    test('should handle load errors gracefully', async () => {
      const testError = new Error('IndexedDB error');
      const defaultValue = { boards: [], currentBoardId: null };

      storage.ensureInitialized = jest.fn().mockRejectedValue(testError);

      const result = await storage.load(defaultValue);

      expect(result).toEqual(defaultValue);
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', { 
        error: testError, 
        operation: 'load' 
      });
    });

    test('should clear storage successfully', async () => {
      storage.clearStore = jest.fn().mockResolvedValue();
      storage.waitForTransaction = jest.fn().mockResolvedValue();

      const result = await storage.clear();

      expect(result).toBe(true);
      expect(storage.clearStore).toHaveBeenCalledTimes(2); // boards and settings stores
    });
  });

  describe('Storage Information', () => {
    test('should return correct storage info when initialized', async () => {
      storage.isInitialized = true;

      const info = await storage.getStorageInfo();

      expect(info).toEqual({
        type: 'IndexedDB',
        database: 'cascade-app',
        version: 5,
        available: true,
        initialized: true
      });
    });

    test('should return error info when not available', async () => {
      storage.init = jest.fn().mockRejectedValue(new Error('Not supported'));

      const info = await storage.getStorageInfo();

      expect(info).toEqual({
        type: 'IndexedDB',
        available: false,
        error: 'Not supported'
      });
    });
  });

  describe('Helper Methods', () => {
    test('should ensure initialization before operations', async () => {
      storage.init = jest.fn().mockResolvedValue(true);
      storage.isInitialized = false;

      await storage.ensureInitialized();

      expect(storage.init).toHaveBeenCalled();
    });

    test('should not reinitialize if already initialized', async () => {
      storage.init = jest.fn();
      storage.isInitialized = true;

      await storage.ensureInitialized();

      expect(storage.init).not.toHaveBeenCalled();
    });

    test('should handle IndexedDB operations with promises', async () => {
      const mockStore = {
        put: jest.fn(() => {
          const request = { onsuccess: null, onerror: null, result: 'success' };
          setTimeout(() => request.onsuccess?.(), 0);
          return request;
        })
      };

      const result = await storage.putData(mockStore, { test: 'data' });
      
      expect(result).toBe('success');
      expect(mockStore.put).toHaveBeenCalledWith({ test: 'data' });
    });

    test('should handle transaction completion', async () => {
      const mockTransaction = {
        oncomplete: null,
        onerror: null
      };

      const promise = storage.waitForTransaction(mockTransaction);
      setTimeout(() => mockTransaction.oncomplete?.(), 0);

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('First-time Setup', () => {
    test('should skip setup if already initialized', async () => {
      const mockStore = {
        get: jest.fn(() => {
          const request = { onsuccess: null, onerror: null, result: { value: true } };
          setTimeout(() => request.onsuccess?.(), 0);
          return request;
        })
      };

      storage.db = {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => mockStore)
        }))
      };

      storage.getData = jest.fn().mockResolvedValue({ value: true });

      await storage.initializeFirstTimeSetup();

      // Should not attempt to initialize again
      expect(storage.getData).toHaveBeenCalledWith(expect.anything(), 'initialized');
    });

    test('should perform first-time setup when not initialized', async () => {
      storage.getData = jest.fn().mockResolvedValue(null);
      storage.putData = jest.fn().mockResolvedValue();
      storage.waitForTransaction = jest.fn().mockResolvedValue();

      const mockTransaction = { objectStore: jest.fn() };
      storage.db = {
        transaction: jest.fn(() => mockTransaction)
      };

      await storage.initializeFirstTimeSetup();

      expect(storage.putData).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          key: 'initialized',
          value: true
        })
      );
    });
  });
});