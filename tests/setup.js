/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import { jest } from '@jest/globals';

// Enable module mocking
global.jest = jest;

// Basic mocks without jest functions for now
const mockStorage = {};

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, value) => { mockStorage[key] = value; },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
    key: (index) => Object.keys(mockStorage)[index] || null,
    get length() { return Object.keys(mockStorage).length; }
  },
  writable: true
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-12345'
  },
  writable: true
});

// Mock window.matchMedia for responsive design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock console methods for testing
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Custom matchers for better assertions
expect.extend({
  toBeValidTask(received) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.text === 'string' &&
      ['todo', 'doing', 'done'].includes(received.status) &&
      typeof received.createdDate === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid task`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid task with id, text, status, and createdDate`,
        pass: false,
      };
    }
  },
  
  toBeValidBoard(received) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      Array.isArray(received.tasks);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid board`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid board with id, name, and tasks array`,
        pass: false,
      };
    }
  }
});

// Setup console mocks for testing
beforeAll(() => {
  // Create Jest spy functions for console methods
  global.console = {
    ...console,
    log: jest.fn((...args) => originalConsole.log(...args)),
    error: jest.fn((...args) => originalConsole.error(...args)),
    warn: jest.fn((...args) => originalConsole.warn(...args)),
    info: jest.fn((...args) => originalConsole.info(...args))
  };
});

afterAll(() => {
  // Restore original console methods
  global.console = originalConsole;
});

// Global mock registry for modules
global.__MOCK_MODULES__ = new Map();

// Helper to create module mocks
global.createModuleMock = (modulePath, mockImplementation) => {
  global.__MOCK_MODULES__.set(modulePath, mockImplementation);
  return mockImplementation;
};

// Helper to get module mock
global.getModuleMock = (modulePath) => {
  return global.__MOCK_MODULES__.get(modulePath);
};

// Helper to create basic DOM structure
function setupBasicDOM() {
  document.body.innerHTML = `
    <header class="bg-white text-dark shadow-sm py-4">
      <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="header__brand">
            <div class="brand">
              <div class="brand__icon">
                <img src="assets/cascade-icon.svg" alt="Cascade App Icon" width="32" height="32">
              </div>
              <div class="brand__text">
                <h1 class="brand__title">Cascade</h1>
                <p class="brand__subtitle">Watch your productivity flow.</p>
              </div>
            </div>
            <div class="board-selector">
              <div class="dropdown">
                <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="board-selector-btn" data-bs-toggle="dropdown" aria-expanded="false" title="Switch board">
                  <span class="me-2">📋</span>
                  <span id="current-board-name">Main Board</span>
                </button>
                <ul class="dropdown-menu" id="board-selector-menu" aria-labelledby="board-selector-btn">
                  <li><h6 class="dropdown-header">Active Boards</h6></li>
                  <li id="active-boards-list"></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" id="new-board-btn"><span class="me-2">➕</span> New Board</a></li>
                  <li><a class="dropdown-item" href="#" id="manage-boards-btn"><span class="me-2">⚙️</span> Manage Boards</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="header__actions d-flex gap-2">
            <div class="dropdown">
              <button class="btn btn-outline-secondary rounded-pill px-3 py-2 dropdown-toggle" type="button" id="main-menu-btn" data-bs-toggle="dropdown" aria-expanded="false" title="Menu">
                <span class="me-2">☰</span> Menu
              </button>
              <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="main-menu-btn">
                <li><button id="settings-button" class="dropdown-item" title="Archive settings"><span class="me-2">⚙️</span> Settings</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><button id="import-button" class="dropdown-item"><span class="me-2">↓</span> Import Tasks</button></li>
                <li><button id="export-button" class="dropdown-item"><span class="me-2">↑</span> Export Tasks</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><h6 class="dropdown-header">Help & Support</h6></li>
                <li><a class="dropdown-item" href="user-guide.html">📖 User Guide</a></li>
                <li><a class="dropdown-item" href="terms.html">📋 Terms of Service</a></li>
                <li><a class="dropdown-item" href="privacy.html">🔒 Privacy Policy</a></li>
              </ul>
            </div>
            <input type="file" id="import-file" accept=".json" style="display: none" />
            <button id="new-task-btn" class="btn btn-primary rounded-pill px-4 py-2"><span class="me-2">+</span> New Task</button>
          </div>
        </div>
      </div>
    </header>
    <main id="main-content" class="container-fluid mt-4">
      <section id="todo-app">
        <form id="todo-form" class="d-flex gap-3 mb-4 p-3 shadow-sm rounded bg-white justify-content-center">
          <input type="text" id="todo-input" placeholder="Add a new task" aria-label="New task" class="form-control rounded-pill" maxlength="200" style="max-width: 400px" />
          <button type="submit" class="btn btn-primary rounded-pill px-4">Add Task</button>
        </form>
        <div class="task-board">
          <div class="board-column board-column--todo" id="todo-column">
            <div class="board-column__header">
              <h3 class="board-column__title">To Do</h3>
              <span class="board-column__count" id="todo-count">0</span>
            </div>
            <div class="board-column__content" id="todo-list" data-status="todo"></div>
          </div>
          <div class="board-column board-column--doing" id="doing-column">
            <div class="board-column__header">
              <h3 class="board-column__title">In Progress</h3>
              <span class="board-column__count" id="doing-count">0</span>
            </div>
            <div class="board-column__content" id="doing-list" data-status="doing"></div>
          </div>
          <div class="board-column board-column--done" id="done-column">
            <div class="board-column__header">
              <h3 class="board-column__title">Done</h3>
              <div class="board-column__actions d-flex align-items-center gap-2">
                <span class="board-column__count" id="done-count">0</span>
                <button id="archive-button" class="btn btn-sm btn-outline-primary" title="Archive all completed tasks in the Done column" data-bs-toggle="tooltip" data-bs-placement="top">📦</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="showArchivedTasks()" title="View history of all archived tasks" data-bs-toggle="tooltip" data-bs-placement="top">📋</button>
              </div>
            </div>
            <div class="board-column__content" id="done-list" data-status="done"></div>
          </div>
        </div>
      </section>
    </main>
    <div id="custom-modal" class="modal-overlay">
      <div class="modal-box">
        <h5 id="modal-title"></h5>
        <p id="modal-message"></p>
        <input id="modal-input" type="text" class="form-control" maxlength="200" style="display: none" />
        <div class="modal-actions">
          <button id="modal-confirm" type="button" class="btn btn-primary">Confirm</button>
          <button id="modal-cancel" type="button" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

// Reset localStorage and console mocks before each test
beforeEach(() => {
  localStorage.clear();
  
  // Setup basic DOM structure
  setupBasicDOM();
  
  // Clear module mocks
  global.__MOCK_MODULES__.clear();
  
  // Reset console mock calls
  if (console.log && console.log.mockClear) {
    console.log.mockClear();
  }
  if (console.error && console.error.mockClear) {
    console.error.mockClear();
  }
  if (console.warn && console.warn.mockClear) {
    console.warn.mockClear();
  }
  if (console.info && console.info.mockClear) {
    console.info.mockClear();
  }
});