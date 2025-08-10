/**
 * E2E Test Fixtures - Index file for easy imports
 * Exports all Page Object Model classes and helper utilities
 */

// Page Object Model classes
export { BasePage } from './page-objects/BasePage.js';

// Helper utilities
export { StorageHelper } from './helpers/storage-helper.js';
export { DragDropHelper } from './helpers/drag-drop-helper.js';
export { AccessibilityHelper } from './helpers/accessibility-helper.js';

// Test data fixtures
export const testData = {
  minimal: {
    boards: [
      {
        id: 'test-board-1',
        name: 'Test Project',
        color: 'blue',
        tasks: [
          {
            id: 'task-1',
            text: 'Sample todo task',
            status: 'todo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'task-2',
            text: 'Sample in progress task',
            status: 'doing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'task-3',
            text: 'Sample completed task',
            status: 'done',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      }
    ],
    currentBoardId: 'test-board-1',
    settings: {
      theme: 'light',
      autoArchive: false,
      archiveAfterDays: 30
    },
    archive: []
  },

  multiBoard: {
    boards: [
      {
        id: 'board-1',
        name: 'Project Alpha',
        color: 'blue',
        tasks: [
          { id: 'task-1-1', text: 'Alpha Task 1', status: 'todo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'task-1-2', text: 'Alpha Task 2', status: 'doing', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'board-2',
        name: 'Project Beta',
        color: 'green',
        tasks: [
          { id: 'task-2-1', text: 'Beta Task 1', status: 'todo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'task-2-2', text: 'Beta Task 2', status: 'done', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString()
      }
    ],
    currentBoardId: 'board-1',
    settings: {
      theme: 'light',
      autoArchive: true,
      archiveAfterDays: 30
    },
    archive: []
  },

  withArchive: {
    boards: [
      {
        id: 'board-with-archive',
        name: 'Project with Archive',
        color: 'purple',
        tasks: [
          { id: 'active-task-1', text: 'Active Task', status: 'todo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString()
      }
    ],
    currentBoardId: 'board-with-archive',
    settings: {
      theme: 'light',
      autoArchive: true,
      archiveAfterDays: 30
    },
    archive: [
      {
        id: 'archived-task-1',
        text: 'Archived Task 1',
        status: 'done',
        boardId: 'board-with-archive',
        archivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'archived-task-2',
        text: 'Archived Task 2',
        status: 'done',
        boardId: 'board-with-archive',
        archivedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
      }
    ]
  },

  empty: {
    boards: [],
    currentBoardId: null,
    settings: {
      theme: 'light',
      autoArchive: false,
      archiveAfterDays: 30
    },
    archive: []
  },

  corrupted: {
    // This will be used to test error handling
    invalidJson: '{"boards": [{"id": "test", "name": "Test", "tasks": [invalid json}',
    missingFields: {
      boards: [{ name: 'No ID Board' }] // Missing required id field
    },
    invalidStructure: {
      boards: 'not an array',
      currentBoardId: 123,
      settings: null
    }
  }
};

// Common selectors used across tests
export const selectors = {
  // App structure
  app: '#app',
  taskBoard: '.task-board',
  loading: '.loading',

  // Task elements
  taskItem: '[data-task-id]',
  taskText: '.task-text',
  taskStatus: '[data-status]',
  
  // Columns
  todoColumn: '[data-column="todo"]',
  doingColumn: '[data-column="doing"]',
  doneColumn: '[data-column="done"]',
  taskList: '.task-list',

  // Board selector
  boardSelector: '.board-selector',
  boardOption: '.board-option',
  currentBoard: '.current-board',

  // Menu and modals
  menuButton: '.menu-button',
  menuPanel: '.menu-panel',
  modal: '.modal',
  modalClose: '.modal-close',

  // Forms
  taskInput: '#task-input',
  boardNameInput: '#board-name-input',
  submitButton: '.submit-button',
  cancelButton: '.cancel-button',

  // Import/Export
  exportButton: '.export-button',
  importButton: '.import-button',
  fileInput: 'input[type="file"]',

  // Settings
  settingsButton: '.settings-button',
  themeToggle: '.theme-toggle',
  autoArchiveToggle: '.auto-archive-toggle',

  // Error handling
  errorToast: '.error-toast',
  errorMessage: '.error-message',
  retryButton: '.retry-button'
};

// Common test utilities
export const testUtils = {
  /**
   * Wait for a specific number of milliseconds
   * @param {number} ms - Milliseconds to wait
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a unique test ID
   * @param {string} prefix - Optional prefix
   */
  generateTestId: (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Create a timestamp for test data
   */
  timestamp: () => new Date().toISOString(),

  /**
   * Generate random text for testing
   * @param {number} length - Length of text to generate
   */
  randomText: (length = 10) => Math.random().toString(36).substring(2, length + 2),

  /**
   * Create a test task object
   * @param {Object} overrides - Properties to override
   */
  createTestTask: (overrides = {}) => ({
    id: testUtils.generateTestId('task'),
    text: `Test task ${testUtils.randomText(5)}`,
    status: 'todo',
    createdAt: testUtils.timestamp(),
    updatedAt: testUtils.timestamp(),
    ...overrides
  }),

  /**
   * Create a test board object
   * @param {Object} overrides - Properties to override
   */
  createTestBoard: (overrides = {}) => ({
    id: testUtils.generateTestId('board'),
    name: `Test Board ${testUtils.randomText(3)}`,
    color: 'blue',
    tasks: [],
    createdAt: testUtils.timestamp(),
    ...overrides
  })
};