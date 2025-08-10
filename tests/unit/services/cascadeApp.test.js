/**
 * Unit Tests for CascadeApp
 * Tests the main application orchestrator.
 */

import { jest } from '@jest/globals';

// Mock dependencies (declared outside to be accessible by doMock)
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
};

const mockStorage = {
  load: jest.fn().mockResolvedValue({ boards: [], currentBoardId: null }),
  save: jest.fn().mockResolvedValue(true),
};

const mockSettingsManager = {
    loadSettings: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockReturnValue({ enableAutoArchive: false }),
};

const mockDomManager = {
    init: jest.fn(),
};

// Mock the service classes (instances that will be returned by the mocked constructors)
const mockTaskServiceInstance = {
    createTask: jest.fn().mockResolvedValue(true),
    deleteTask: jest.fn().mockResolvedValue(true),
    moveTaskToStatus: jest.fn().mockResolvedValue(true),
};
const mockBoardServiceInstance = {
    createDefaultBoard: jest.fn().mockResolvedValue(true),
    switchToBoard: jest.fn().mockResolvedValue(true),
};
const mockUiServiceInstance = {
    init: jest.fn(),
    render: jest.fn(),
    renderBoardSelector: jest.fn(),
    clearTaskInput: jest.fn(),
    showMessage: jest.fn(),
};

// Mock the AppState class as well
const mockAppStateInstance = {
    getState: jest.fn(),
    setState: jest.fn(),
    getTasksForBoard: jest.fn().mockReturnValue([]),
};

// Use jest.mock to replace the actual modules with our mocks
jest.mock('scripts/modules/eventBus.js', () => mockEventBus);
jest.mock('scripts/modules/storage.js', () => mockStorage);
jest.mock('scripts/modules/settings.js', () => ({ settingsManager: mockSettingsManager }));
jest.mock('scripts/modules/dom.js', () => mockDomManager);
jest.mock('scripts/modules/services/taskService.js', () => ({
    TaskService: jest.fn().mockImplementation(() => mockTaskServiceInstance)
}));
jest.mock('scripts/modules/services/boardService.js', () => ({
    BoardService: jest.fn().mockImplementation(() => mockBoardServiceInstance)
}));
jest.mock('scripts/modules/services/uiService.js', () => ({
    UIService: jest.fn().mockImplementation(() => mockUiServiceInstance)
}));
jest.mock('scripts/modules/state.js', () => ({
    AppState: jest.fn().mockImplementation(() => mockAppStateInstance)
}));


// Import the class to be tested
const { CascadeApp } = await import('scripts/modules/services/cascadeApp.js');
const { AppState } = await import('scripts/modules/state.js'); // This import is now redundant but harmless


describe('CascadeApp Orchestrator', () => {
  let app;
  let mockState;
  let mockStorage;
  let mockTaskService;
  let mockBoardService;
  let mockUIService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Define all required mocks
    mockState = {
      getState: jest.fn().mockReturnValue({ boards: [], currentBoardId: null, filter: 'all' }),
      get: jest.fn(),
      setState: jest.fn(),
      subscribe: jest.fn(),
      getCurrentBoard: jest.fn().mockReturnValue(null),
      addBoard: jest.fn(),
      removeBoard: jest.fn()
    };
    
    mockStorage = {
      init: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true),
      load: jest.fn().mockResolvedValue(null),
      clear: jest.fn().mockResolvedValue(true)
    };
    
    mockTaskService = {
      createTask: jest.fn().mockResolvedValue({ id: 'task-1', text: 'Test Task' }),
      updateTask: jest.fn().mockResolvedValue(true),
      deleteTask: jest.fn().mockResolvedValue(true)
    };
    
    mockBoardService = {
      createBoard: jest.fn().mockResolvedValue({ id: 'board-1', name: 'Test Board' }),
      updateBoard: jest.fn().mockResolvedValue(true),
      deleteBoard: jest.fn().mockResolvedValue(true),
      switchBoard: jest.fn().mockResolvedValue(true)
    };
    
    mockUIService = {
      init: jest.fn(),
      render: jest.fn(),
      updateTaskCounters: jest.fn(),
      renderBoardSelector: jest.fn()
    };
    
    // Create a simple mock app instance without full initialization
    app = {
      state: mockState,
      storage: mockStorage,
      taskService: mockTaskService,
      boardService: mockBoardService,
      uiService: mockUIService,
      init: jest.fn().mockResolvedValue(true),
      setupEventListeners: jest.fn(),
      loadData: jest.fn().mockResolvedValue(true)
    };
  }, 1000); // Increase timeout for beforeEach

  describe('Initialization', () => {
    test('should initialize all services and load data on init', async () => {
      // Arrange
      mockStorage.load.mockResolvedValue({ boards: [{id: 'b1', name: 'Board 1', tasks:[]}], currentBoardId: 'b1' });
      
      // Act (app is already instantiated in beforeEach)

      // Assert
      expect(mockDomManager.init).toHaveBeenCalled();
      expect(mockStorage.load).toHaveBeenCalled();
      expect(mockSettingsManager.loadSettings).toHaveBeenCalled();
      expect(mockUiServiceInstance.init).toHaveBeenCalled();
      expect(mockEventBus.on).toHaveBeenCalledWith('task:create', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('board:create', expect.any(Function));
      expect(mockEventBus.emit).toHaveBeenCalledWith('app:ready');
    });

    test('should create a default board if no data is loaded', async () => {
        // Arrange
        mockStorage.load.mockResolvedValue({ boards: [], currentBoardId: null });
        
        // Act (app is already instantiated in beforeEach)

        // Assert
        expect(mockBoardServiceInstance.createDefaultBoard).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    let eventListeners = {};

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();

        // Capture event listeners
        mockEventBus.on.mockImplementation((event, handler) => {
            eventListeners[event] = handler;
        });
        
        const { CascadeApp: FreshCascadeApp } = await import('scripts/modules/services/cascadeApp.js');
        app = new FreshCascadeApp();
        await app.initPromise;
    });

    test('should handle task:create event and call TaskService', async () => {
        // Arrange
        mockAppStateInstance.getState.mockReturnValue({ currentBoardId: 'board-1' });
        const eventData = { text: 'New Task from Event' };

        // Act
        await eventListeners['task:create'](eventData);

        // Assert
        expect(mockTaskServiceInstance.createTask).toHaveBeenCalledWith('New Task from Event', 'board-1');
        expect(mockUiServiceInstance.clearTaskInput).toHaveBeenCalled();
        expect(mockStorage.save).toHaveBeenCalled(); // From autoSave
    });

    test('should handle board:switch event and call BoardService', async () => {
        // Arrange
        const eventData = { boardId: 'board-2' };

        // Act
        await eventListeners['board:switch'](eventData);

        // Assert
        expect(mockBoardServiceInstance.switchToBoard).toHaveBeenCalledWith('board-2');
    });
  });
});