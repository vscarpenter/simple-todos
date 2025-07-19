/**
 * Storage Mock utilities for testing
 * Provides localStorage and data persistence mocking
 */

export class MockStorage {
  constructor() {
    this.data = {};
    this.length = 0;
  }

  getItem(key) {
    return this.data[key] || null;
  }

  setItem(key, value) {
    if (!(key in this.data)) {
      this.length++;
    }
    this.data[key] = String(value);
  }

  removeItem(key) {
    if (key in this.data) {
      delete this.data[key];
      this.length--;
    }
  }

  clear() {
    this.data = {};
    this.length = 0;
  }

  key(index) {
    const keys = Object.keys(this.data);
    return keys[index] || null;
  }

  // Additional test utilities
  getAllData() {
    return { ...this.data };
  }

  setMockData(data) {
    this.clear();
    Object.entries(data).forEach(([key, value]) => {
      this.setItem(key, value);
    });
  }
}

export function createStorageMock() {
  return new MockStorage();
}

export function mockLocalStorage() {
  const mockStorage = createStorageMock();
  
  Object.defineProperty(global, 'localStorage', {
    value: mockStorage,
    writable: true
  });
  
  return mockStorage;
}

// Pre-defined test data for common scenarios
export const TEST_STORAGE_DATA = {
  // Empty state
  empty: {},
  
  // Single board with tasks
  singleBoard: {
    'cascade-tasks': JSON.stringify({
      version: '1.0',
      data: {
        boards: [{
          id: 'board-1',
          name: 'Test Board',
          description: 'Test board description',
          color: '#6750a4',
          isDefault: true,
          createdDate: '2025-01-01',
          lastModified: '2025-01-01T00:00:00.000Z',
          tasks: [
            {
              id: 'task-1',
              text: 'Test task 1',
              status: 'todo',
              createdDate: '2025-01-01',
              lastModified: '2025-01-01T00:00:00.000Z'
            },
            {
              id: 'task-2', 
              text: 'Test task 2',
              status: 'doing',
              createdDate: '2025-01-01',
              lastModified: '2025-01-01T00:00:00.000Z'
            }
          ]
        }],
        currentBoardId: 'board-1',
        filter: 'all',
        lastSaved: '2025-01-01T00:00:00.000Z'
      }
    })
  },
  
  // Multiple boards
  multipleBoards: {
    'cascade-tasks': JSON.stringify({
      version: '1.0',
      data: {
        boards: [
          {
            id: 'board-1',
            name: 'Work Board',
            description: 'Work tasks',
            color: '#6750a4',
            isDefault: true,
            createdDate: '2025-01-01',
            lastModified: '2025-01-01T00:00:00.000Z',
            tasks: [
              {
                id: 'task-1',
                text: 'Work task 1',
                status: 'todo',
                createdDate: '2025-01-01',
                lastModified: '2025-01-01T00:00:00.000Z'
              }
            ]
          },
          {
            id: 'board-2',
            name: 'Personal Board', 
            description: 'Personal tasks',
            color: '#dc2626',
            isDefault: false,
            createdDate: '2025-01-02',
            lastModified: '2025-01-02T00:00:00.000Z',
            tasks: [
              {
                id: 'task-2',
                text: 'Personal task 1',
                status: 'done',
                createdDate: '2025-01-02',
                lastModified: '2025-01-02T00:00:00.000Z'
              }
            ]
          }
        ],
        currentBoardId: 'board-1',
        filter: 'all',
        lastSaved: '2025-01-02T00:00:00.000Z'
      }
    })
  },
  
  // Legacy data format (for migration testing)
  legacyData: {
    'todos': JSON.stringify([
      {
        text: 'Legacy task 1',
        completed: false,
        createdDate: '2024-12-01'
      },
      {
        text: 'Legacy task 2', 
        completed: true,
        createdDate: '2024-12-02'
      }
    ])
  },
  
  // Settings data
  withSettings: {
    'cascade-settings': JSON.stringify({
      theme: 'light',
      autoArchive: true,
      autoArchiveDays: 30,
      debugMode: false
    })
  },
  
};

// Utility function to set up specific test scenarios
export function setupTestStorage(scenario = 'empty') {
  const mockStorage = mockLocalStorage();
  const data = TEST_STORAGE_DATA[scenario] || {};
  mockStorage.setMockData(data);
  return mockStorage;
}