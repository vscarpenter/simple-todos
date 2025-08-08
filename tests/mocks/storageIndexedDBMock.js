/**
 * IndexedDB Storage Mock utilities for testing
 * Provides IndexedDB mocking without localStorage dependencies
 */

import { jest } from '@jest/globals';

export class MockIndexedDBStorage {
  constructor() {
    this.data = new Map();
    this.isInitialized = false;
    this.dbName = 'cascade-app';
    this.version = 5;
  }

  async init() {
    this.isInitialized = true;
    return true;
  }

  async save(data) {
    if (!this.isInitialized) await this.init();
    this.data.set('appData', {
      boards: data.boards || [],
      currentBoardId: data.currentBoardId || null,
      filter: data.filter || 'all',
      lastModified: new Date().toISOString()
    });
    return true;
  }

  async load(defaultValue = null) {
    if (!this.isInitialized) await this.init();
    const stored = this.data.get('appData');
    return stored || defaultValue || {
      boards: [],
      currentBoardId: null,
      filter: 'all'
    };
  }

  async clear() {
    this.data.clear();
    return true;
  }

  async getStorageInfo() {
    return {
      type: 'IndexedDB',
      database: this.dbName,
      version: this.version,
      available: true,
      initialized: this.isInitialized
    };
  }

  // Test utilities
  getAllData() {
    return Object.fromEntries(this.data);
  }

  setMockData(key, value) {
    this.data.set(key, value);
  }

  getMockData(key) {
    return this.data.get(key);
  }
}

export class MockSettingsStorage {
  constructor() {
    this.data = new Map();
    this.isInitialized = false;
  }

  async init() {
    this.isInitialized = true;
    return true;
  }

  async get(key) {
    if (!this.isInitialized) await this.init();
    return this.data.get(key) || null;
  }

  async set(key, value) {
    if (!this.isInitialized) await this.init();
    this.data.set(key, value);
    return true;
  }

  async clear() {
    this.data.clear();
    return true;
  }

  // Test utilities
  getAllData() {
    return Object.fromEntries(this.data);
  }

  setMockData(data) {
    this.data.clear();
    Object.entries(data).forEach(([key, value]) => {
      this.data.set(key, value);
    });
  }
}

// Factory functions
export function createIndexedDBStorageMock() {
  return new MockIndexedDBStorage();
}

export function createSettingsStorageMock() {
  return new MockSettingsStorage();
}

// Mock IndexedDB API for environment
export function mockIndexedDBEnvironment() {
  const mockDB = {
    transaction: jest.fn(() => ({
      objectStore: jest.fn(() => ({
        put: jest.fn(() => ({ onsuccess: null, onerror: null, result: 'success' })),
        get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
        getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
        clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
        createIndex: jest.fn()
      })),
      oncomplete: null,
      onerror: null
    })),
    objectStoreNames: { contains: jest.fn(() => false) },
    createObjectStore: jest.fn(() => ({
      createIndex: jest.fn()
    }))
  };

  const mockIndexedDB = {
    open: jest.fn(() => {
      const request = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB
      };
      setTimeout(() => request.onsuccess?.(), 0);
      return request;
    })
  };

  Object.defineProperty(global, 'indexedDB', {
    value: mockIndexedDB,
    writable: true
  });

  return { mockDB, mockIndexedDB };
}

// Pre-defined test data for common scenarios
export const TEST_INDEXEDDB_DATA = {
  // Empty state
  empty: {
    boards: [],
    currentBoardId: null,
    filter: 'all'
  },
  
  // Single board with tasks
  singleBoard: {
    boards: [{
      id: 'board-1',
      name: 'Test Board',
      description: 'Test board description',
      color: '#6750a4',
      isDefault: true,
      isArchived: false,
      createdDate: '2025-01-01T00:00:00.000Z',
      lastModified: '2025-01-01T00:00:00.000Z',
      tasks: [
        {
          id: 'task-1',
          text: 'Test task 1',
          status: 'todo',
          createdDate: '2025-01-01T00:00:00.000Z',
          completedDate: null,
          lastModified: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 'task-2', 
          text: 'Test task 2',
          status: 'doing',
          createdDate: '2025-01-01T00:00:00.000Z',
          completedDate: null,
          lastModified: '2025-01-01T00:00:00.000Z'
        }
      ],
      archivedTasks: []
    }],
    currentBoardId: 'board-1',
    filter: 'all'
  },
  
  // Multiple boards
  multipleBoards: {
    boards: [
      {
        id: 'board-1',
        name: 'Work Board',
        description: 'Work tasks',
        color: '#6750a4',
        isDefault: true,
        isArchived: false,
        createdDate: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z',
        tasks: [
          {
            id: 'task-1',
            text: 'Work task 1',
            status: 'todo',
            createdDate: '2025-01-01T00:00:00.000Z',
            completedDate: null,
            lastModified: '2025-01-01T00:00:00.000Z'
          }
        ],
        archivedTasks: []
      },
      {
        id: 'board-2',
        name: 'Personal Board', 
        description: 'Personal tasks',
        color: '#dc2626',
        isDefault: false,
        isArchived: false,
        createdDate: '2025-01-02T00:00:00.000Z',
        lastModified: '2025-01-02T00:00:00.000Z',
        tasks: [
          {
            id: 'task-2',
            text: 'Personal task 1',
            status: 'done',
            createdDate: '2025-01-02T00:00:00.000Z',
            completedDate: '2025-01-02T01:00:00.000Z',
            lastModified: '2025-01-02T01:00:00.000Z'
          }
        ],
        archivedTasks: []
      }
    ],
    currentBoardId: 'board-1',
    filter: 'all'
  },
  
  // Settings data
  defaultSettings: {
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
  }
};

// Utility function to set up specific test scenarios
export function setupTestIndexedDB(scenario = 'empty') {
  mockIndexedDBEnvironment();
  const mockStorage = createIndexedDBStorageMock();
  const data = TEST_INDEXEDDB_DATA[scenario] || TEST_INDEXEDDB_DATA.empty;
  mockStorage.setMockData('appData', data);
  return mockStorage;
}

export function setupTestSettings(settingsData = TEST_INDEXEDDB_DATA.defaultSettings) {
  const mockStorage = createSettingsStorageMock();
  mockStorage.setMockData({ 'app-settings': settingsData });
  return mockStorage;
}