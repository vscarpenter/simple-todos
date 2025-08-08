/**
 * Mock for dependency injection container
 * Used in tests to avoid complex dependency setup
 */

import { jest } from '@jest/globals';

// Mock Task and Board classes for testing
class MockTask {
    constructor(data = {}) {
        this.id = data.id || 'test-task-id';
        this.text = data.text || 'Test task';
        this.status = data.status || 'todo';
        this.createdDate = data.createdDate || new Date().toISOString();
        this.completedDate = data.completedDate || null;
        this.lastModified = data.lastModified || new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            text: this.text,
            status: this.status,
            createdDate: this.createdDate,
            completedDate: this.completedDate,
            lastModified: this.lastModified
        };
    }
}

class MockBoard {
    constructor(data = {}) {
        this.id = data.id || 'test-board-id';
        this.name = data.name || 'Test Board';
        this.description = data.description || '';
        this.color = data.color || '#6750a4';
        this.tasks = data.tasks || [];
        this.archivedTasks = data.archivedTasks || [];
        this.createdDate = data.createdDate || new Date().toISOString();
        this.lastModified = data.lastModified || new Date().toISOString();
        this.isArchived = data.isArchived || false;
        this.isDefault = data.isDefault || false;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            color: this.color,
            tasks: this.tasks,
            archivedTasks: this.archivedTasks,
            createdDate: this.createdDate,
            lastModified: this.lastModified,
            isArchived: this.isArchived,
            isDefault: this.isDefault
        };
    }
}

// Mock factory functions
const mockCreateTask = (data) => new MockTask(data);
const mockCreateBoard = (data) => new MockBoard(data);

// Mock ErrorHandler
const mockErrorHandler = {
    init: jest.fn(),
    handleError: jest.fn(),
    clearErrors: jest.fn()
};

// Mock settings manager
const mockSettingsManager = {
    get: jest.fn(() => ({})),
    set: jest.fn(),
    setDebugMode: jest.fn(),
    getTheme: jest.fn(() => 'light')
};

// Mock performance optimizer
const mockPerformanceOptimizer = {
    getPerformanceStats: jest.fn(() => ({})),
    searchTasks: jest.fn((tasks) => tasks),
    optimizeRender: jest.fn()
};

// Mock IndexedDB storage
const mockStorage = {
    init: jest.fn(() => Promise.resolve(true)),
    save: jest.fn(() => Promise.resolve(true)),
    load: jest.fn(() => Promise.resolve({ boards: [], currentBoardId: null, filter: 'all' })),
    clear: jest.fn(() => Promise.resolve(true)),
    getStorageInfo: jest.fn(() => Promise.resolve({ 
        type: 'IndexedDB', 
        available: true, 
        initialized: true,
        database: 'cascade-app',
        version: 5
    })),
    initializeFirstTimeSetup: jest.fn(() => Promise.resolve()),
    isInitialized: true
};

// Mock Container class
export class MockContainer {
    constructor() {
        this.services = new Map();
        
        // Register default mock services
        this.services.set('Task', { factory: MockTask, singleton: false, instance: null });
        this.services.set('Board', { factory: MockBoard, singleton: false, instance: null });
        this.services.set('createTask', { factory: mockCreateTask, singleton: false, instance: null });
        this.services.set('createBoard', { factory: mockCreateBoard, singleton: false, instance: null });
        this.services.set('ErrorHandler', { factory: mockErrorHandler, singleton: true, instance: mockErrorHandler });
        this.services.set('settingsManager', { factory: mockSettingsManager, singleton: true, instance: mockSettingsManager });
        this.services.set('performanceOptimizer', { factory: mockPerformanceOptimizer, singleton: true, instance: mockPerformanceOptimizer });
        this.services.set('storage', { factory: mockStorage, singleton: true, instance: mockStorage });
    }

    register(name, factory, options = {}) {
        this.services.set(name, {
            factory,
            singleton: options.singleton || false,
            instance: null
        });
    }

    get(name) {
        const service = this.services.get(name);
        
        if (!service) {
            throw new Error(`Service '${name}' not found in container`);
        }

        if (service.singleton && service.instance) {
            return service.instance;
        }

        let instance;
        if (typeof service.factory === 'function') {
            instance = service.factory;
        } else {
            instance = service.factory;
        }

        if (service.singleton) {
            service.instance = instance;
        }

        return instance;
    }

    has(name) {
        return this.services.has(name);
    }

    registerServices(services) {
        Object.entries(services).forEach(([name, config]) => {
            if (typeof config === 'function' || typeof config === 'object') {
                this.register(name, config);
            } else if (config.factory) {
                this.register(name, config.factory, config.options || {});
            }
        });
    }

    clear() {
        this.services.clear();
    }
}

// Mock AppContext class
export class MockAppContext {
    constructor(container) {
        this.container = container || new MockContainer();
        this.app = null;
        this.keyboardNav = null;
    }

    setApp(app) {
        this.app = app;
    }

    getApp() {
        if (!this.app) {
            // Return a basic mock app for tests
            return {
                getState: jest.fn(() => ({ boards: [], tasks: [] })),
                getTasks: jest.fn(() => []),
                createTask: jest.fn(),
                showEmptyState: jest.fn()
            };
        }
        return this.app;
    }

    setKeyboardNav(keyboardNav) {
        this.keyboardNav = keyboardNav;
    }

    getKeyboardNav() {
        return this.keyboardNav || {
            showShortcutHelp: jest.fn(),
            selectTask: jest.fn()
        };
    }

    get(name) {
        return this.container.get(name);
    }

    has(name) {
        return this.container.has(name);
    }
}

// Create mock instances
export const mockContainer = new MockContainer();
export const mockAppContext = new MockAppContext(mockContainer);

// Export individual mocks for direct use
export {
    MockTask,
    MockBoard,
    mockCreateTask,
    mockCreateBoard,
    mockErrorHandler,
    mockSettingsManager,
    mockPerformanceOptimizer,
    mockStorage
};