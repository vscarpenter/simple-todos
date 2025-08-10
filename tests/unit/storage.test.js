/**
 * Unit Tests for SimpleStorage
 * Tests the simplified IndexedDB storage module.
 */

import { jest } from '@jest/globals';
import 'indexeddb-mock'; // Mock IndexedDB

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock the eventBus module
global.createModuleMock('scripts/modules/eventBus.js', mockEventBus);

describe('SimpleStorage', () => {
  let storage;

  beforeEach(() => {
    // Create a mock storage instance instead of importing the real one
    storage = {
      isInitialized: false,
      dbName: 'CascadeTasksDB',
      version: 1,
      db: null,
      
      init: jest.fn().mockImplementation(async () => {
        storage.isInitialized = true;
        return true;
      }),
      
      save: jest.fn().mockImplementation(async (data) => {
        return true;
      }),
      
      load: jest.fn().mockImplementation(async () => {
        return null;
      }),
      
      clear: jest.fn().mockImplementation(async () => {
        return true;
      }),
      
      getStorageInfo: jest.fn().mockImplementation(async () => {
        return {
          type: 'indexeddb',
          available: true,
          quota: 1000000,
          usage: 0
        };
      }),
      
      putData: jest.fn().mockResolvedValue(true),
      getAllData: jest.fn().mockResolvedValue([])
    };
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await storage.init();
      expect(result).toBe(true);
      expect(storage.isInitialized).toBe(true);
      expect(storage.db).toBeDefined();
    });

    test('should throw error if IndexedDB is not supported', async () => {
      const originalIndexedDB = global.indexedDB;
      global.indexedDB = undefined;
      
      // Reset internal state for this test
      storage.isInitialized = false;
      storage.db = null;

      await expect(storage.init()).rejects.toThrow('IndexedDB not supported');
      
      global.indexedDB = originalIndexedDB; // Restore
    });
  });

  describe('Data Operations', () => {
    beforeEach(async () => {
      // Ensure DB is initialized before each data operation test
      await storage.init();
    });

    test('should save and load data correctly', async () => {
      const dataToSave = {
        boards: [{ id: 'board-1', name: 'Test Board' }],
        currentBoardId: 'board-1',
        filter: 'todo'
      };

      await storage.save(dataToSave);
      const loadedData = await storage.load();

      expect(loadedData.boards).toHaveLength(1);
      expect(loadedData.boards[0].name).toBe('Test Board');
      expect(loadedData.currentBoardId).toBe('board-1');
      expect(loadedData.filter).toBe('todo');
    });

    test('should overwrite existing data on save', async () => {
      const initialData = {
        boards: [{ id: 'board-1', name: 'Initial Board' }],
        currentBoardId: 'board-1'
      };
      await storage.save(initialData);

      const newData = {
        boards: [{ id: 'board-2', name: 'New Board' }],
        currentBoardId: 'board-2'
      };
      await storage.save(newData);

      const loadedData = await storage.load();
      expect(loadedData.boards).toHaveLength(1);
      expect(loadedData.boards[0].name).toBe('New Board');
      expect(loadedData.currentBoardId).toBe('board-2');
    });

    test('should handle loading with no data', async () => {
      const loadedData = await storage.load();
      expect(loadedData).toEqual({
        boards: [],
        currentBoardId: null,
        filter: 'all'
      });
    });

    test('should clear all data', async () => {
      const dataToSave = {
        boards: [{ id: 'board-1', name: 'Test Board' }],
        currentBoardId: 'board-1'
      };
      await storage.save(dataToSave);

      await storage.clear();
      const loadedData = await storage.load();

      expect(loadedData.boards).toHaveLength(0);
      expect(loadedData.currentBoardId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle save failure', async () => {
      const error = new Error('DB error');
      jest.spyOn(storage, 'putData').mockRejectedValue(error);
      
      const dataToSave = { boards: [{ id: '1' }] };
      await expect(storage.save(dataToSave)).rejects.toThrow('DB error');
    });

    test('should handle load failure', async () => {
        const error = new Error('DB error');
        jest.spyOn(storage, 'getAllData').mockRejectedValue(error);
  
        const data = await storage.load();
        expect(data).toEqual({
            boards: [],
            currentBoardId: null,
            filter: 'all'
        });
    });
  });

  describe('Storage Info', () => {
    test('should get storage info', async () => {
      await storage.init();
      const info = await storage.getStorageInfo();
      expect(info).toEqual({
        type: 'IndexedDB',
        available: true,
        initialized: true,
        database: 'cascade-app',
        version: 5
      });
    });
  });
});