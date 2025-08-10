import { jest } from '@jest/globals';

// Mock eventBus before importing state
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn((event, callback) => {
    // Return a mock unsubscribe function
    return () => mockEventBus.off(event, callback);
  }),
  off: jest.fn(),
};

// Mock the eventBus module
jest.mock('scripts/modules/eventBus.js', () => mockEventBus);

// Mock models
const MockTask = class {
    constructor(data = {}) {
        this.id = data.id || 'test-task-id';
        this.text = data.text || 'Test task';
        this.status = data.status || 'todo';
    }
    toJSON() { return { ...this }; }
};

const MockBoard = class {
    constructor(data = {}) {
        this.id = data.id || 'test-board-id';
        this.name = data.name || 'Test Board';
        this.tasks = data.tasks || [];
    }
    toJSON() { return { ...this }; }
};

// Create module mocks
global.createModuleMock('scripts/modules/models.js', { 
    Task: MockTask, 
    Board: MockBoard, 
    createTask: (data) => new MockTask(data)
});

// Import the class to be tested, not the singleton
const { AppState } = await import('../../scripts/modules/state.js');


describe('AppState', () => {
  let state;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a new instance for each test
    state = new AppState();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const initialState = state.getState();
      
      expect(initialState).toHaveProperty('boards', []);
      expect(initialState).toHaveProperty('currentBoardId', null);
      expect(initialState).toHaveProperty('tasks', []);
      expect(initialState).toHaveProperty('filter', 'all');
    });
  });

  describe('State Access and Updates', () => {
    test('should get complete state as a copy', () => {
      const currentState = state.getState();
      expect(currentState).toEqual(state.state);
      expect(currentState).not.toBe(state.state);
    });

    test('should update state and emit events', () => {
      const updates = { filter: 'todo' };
      state.setState(updates);

      expect(state.get('filter')).toBe('todo');
      expect(mockEventBus.emit).toHaveBeenCalledWith('state:changed', expect.any(Object));
      expect(mockEventBus.emit).toHaveBeenCalledWith('state:filterChanged', expect.any(Object));
    });

    test('should not emit events when silent option is true', () => {
      state.setState({ filter: 'done' }, { silent: true });
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Subscription System', () => {
    test('should subscribe to specific state changes', () => {
      const callback = jest.fn();
      state.subscribe('filter', callback);
      
      expect(mockEventBus.on).toHaveBeenCalledWith('state:filterChanged', callback);
    });

    test('should subscribe to all state changes', () => {
        const callback = jest.fn();
        state.subscribe(callback);

        expect(mockEventBus.on).toHaveBeenCalledWith('state:changed', callback);
    });

    test('should return an unsubscribe function', () => {
        const callback = jest.fn();
        const unsubscribe = state.subscribe('filter', callback);
        
        expect(typeof unsubscribe).toBe('function');
        
        unsubscribe();
        expect(mockEventBus.off).toHaveBeenCalledWith('state:filterChanged', callback);
    });
  });

  describe('Board Management', () => {
    test('should add a board and set it as current if it is the first', () => {
        const board = { id: 'board-1', name: 'Test Board', tasks: [] };
        state.addBoard(board);

        const currentState = state.getState();
        expect(currentState.boards).toHaveLength(1);
        expect(currentState.boards[0].name).toBe('Test Board');
        expect(currentState.currentBoardId).toBe('board-1');
    });

    test('should remove a board and update current board if needed', () => {
        const board1 = { id: 'board-1', name: 'Board 1', tasks: [] };
        const board2 = { id: 'board-2', name: 'Board 2', tasks: [] };
        state.addBoard(board1);
        state.addBoard(board2);
        state.setCurrentBoard('board-2');

        state.removeBoard('board-2');
        
        const currentState = state.getState();
        expect(currentState.boards).toHaveLength(1);
        expect(currentState.currentBoardId).toBe('board-1');
    });

    test('should get the current board object', () => {
        const board1 = { id: 'board-1', name: 'Board 1', tasks: [] };
        state.addBoard(board1);
        
        const currentBoard = state.getCurrentBoard();
        expect(currentBoard.name).toBe('Board 1');
    });
  });
});