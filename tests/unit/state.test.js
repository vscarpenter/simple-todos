/**
 * Comprehensive Unit Tests for State Management
 * Tests reactive state, history management, subscriptions, and board operations
 */

import { jest } from '@jest/globals';

// Mock eventBus before importing state
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Create module mock
global.createModuleMock('scripts/modules/eventBus.js', mockEventBus);

describe('AppState', () => {
  let AppState;
  let state;

  beforeEach(async () => {
    // Clear mocks
    mockEventBus.emit.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();
    
    // Import AppState after mocking
    const stateModule = await import('scripts/modules/state.js');
    AppState = stateModule.default;
    state = new AppState();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const initialState = state.getState();
      
      expect(initialState).toHaveProperty('boards', []);
      expect(initialState).toHaveProperty('currentBoardId', null);
      expect(initialState).toHaveProperty('tasks', []);
      expect(initialState).toHaveProperty('filter', 'all');
      expect(initialState).toHaveProperty('history', []);
      expect(initialState).toHaveProperty('historyIndex', -1);
      expect(initialState).toHaveProperty('maxHistorySize', 50);
    });

    test('should have empty listeners map', () => {
      expect(state.listeners).toBeInstanceOf(Map);
      expect(state.listeners.size).toBe(0);
    });
  });

  describe('State Access and Updates', () => {
    test('should get complete state', () => {
      const currentState = state.getState();
      
      expect(currentState).toEqual(state.state);
      expect(currentState).not.toBe(state.state); // Should be a copy
    });

    test('should get specific state property', () => {
      expect(state.get('filter')).toBe('all');
      expect(state.get('boards')).toEqual([]);
      expect(state.get('nonexistent')).toBeUndefined();
    });

    test('should update state and emit events', () => {
      const updates = { filter: 'todo', currentBoardId: 'board-1' };
      
      state.setState(updates);
      
      expect(state.get('filter')).toBe('todo');
      expect(state.get('currentBoardId')).toBe('board-1');
      expect(mockEventBus.emit).toHaveBeenCalledWith('state:changed', expect.any(Object));
    });

    test('should not emit events when silent option is true', () => {
      state.setState({ filter: 'done' }, { silent: true });
      
      expect(state.get('filter')).toBe('done');
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    test('should handle nested object updates', () => {
      const board = { id: 'board-1', name: 'Test Board', tasks: [] };
      state.setState({ boards: [board] });
      
      expect(state.get('boards')).toHaveLength(1);
      expect(state.get('boards')[0]).toEqual(board);
    });
  });

  describe('History Management', () => {
    test('should add state to history by default', () => {
      const initialHistoryLength = state.get('history').length;
      
      state.setState({ filter: 'todo' });
      
      expect(state.get('history').length).toBe(initialHistoryLength + 1);
      expect(state.get('historyIndex')).toBe(0);
    });

    test('should not add to history when addToHistory is false', () => {
      const initialHistoryLength = state.get('history').length;
      
      state.setState({ filter: 'todo' }, { addToHistory: false });
      
      expect(state.get('history').length).toBe(initialHistoryLength);
    });

    test('should limit history size to maxHistorySize', () => {
      // Fill history beyond max size
      for (let i = 0; i < 55; i++) {
        state.setState({ filter: `filter-${i}` });
      }
      
      expect(state.get('history').length).toBe(50);
      expect(state.get('historyIndex')).toBe(49);
    });

    test('should support undo operation', () => {
      state.setState({ filter: 'todo' });
      state.setState({ filter: 'doing' });
      
      const canUndo = state.canUndo();
      expect(canUndo).toBe(true);
      
      const undoResult = state.undo();
      expect(undoResult).toBe(true);
      expect(state.get('filter')).toBe('todo');
      expect(mockEventBus.emit).toHaveBeenCalledWith('state:undo', expect.any(Object));
    });

    test('should support redo operation', () => {
      state.setState({ filter: 'todo' });
      state.setState({ filter: 'doing' });
      state.undo();
      
      const canRedo = state.canRedo();
      expect(canRedo).toBe(true);
      
      const redoResult = state.redo();
      expect(redoResult).toBe(true);
      expect(state.get('filter')).toBe('doing');
      expect(mockEventBus.emit).toHaveBeenCalledWith('state:redo', expect.any(Object));
    });

    test('should return false when undo is not possible', () => {
      expect(state.canUndo()).toBe(false);
      expect(state.undo()).toBe(false);
    });

    test('should return false when redo is not possible', () => {
      expect(state.canRedo()).toBe(false);
      expect(state.redo()).toBe(false);
    });

    test('should clear future history when new state is added after undo', () => {
      state.setState({ filter: 'todo' });
      state.setState({ filter: 'doing' });
      state.setState({ filter: 'done' });
      
      state.undo(); // Back to 'doing'
      state.undo(); // Back to 'todo'
      
      // Add new state, should clear future history
      state.setState({ filter: 'new-filter' });
      
      expect(state.canRedo()).toBe(false);
      expect(state.get('filter')).toBe('new-filter');
    });
  });

  describe('Subscription System', () => {
    test('should subscribe to state changes', () => {
      const callback = jest.fn();
      const unsubscribe = state.subscribe('filter', callback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(state.listeners.has('filter')).toBe(true);
      
      state.setState({ filter: 'todo' });
      
      expect(callback).toHaveBeenCalledWith('todo', 'all');
    });

    test('should support multiple subscribers for same key', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      state.subscribe('filter', callback1);
      state.subscribe('filter', callback2);
      
      state.setState({ filter: 'todo' });
      
      expect(callback1).toHaveBeenCalledWith('todo', 'all');
      expect(callback2).toHaveBeenCalledWith('todo', 'all');
    });

    test('should unsubscribe from state changes', () => {
      const callback = jest.fn();
      const unsubscribe = state.subscribe('filter', callback);
      
      unsubscribe();
      
      state.setState({ filter: 'todo' });
      
      expect(callback).not.toHaveBeenCalled();
    });

    test('should handle subscription to non-existent keys', () => {
      const callback = jest.fn();
      state.subscribe('nonexistent', callback);
      
      state.setState({ nonexistent: 'value' });
      
      expect(callback).toHaveBeenCalledWith('value', undefined);
    });

    test('should not call callback if value has not changed', () => {
      const callback = jest.fn();
      state.subscribe('filter', callback);
      
      state.setState({ filter: 'all' }); // Same as initial value
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Board Management', () => {
    test('should get current board when none is set', () => {
      expect(state.getCurrentBoard()).toBeNull();
    });

    test('should set and get current board', () => {
      const board = { id: 'board-1', name: 'Test Board', tasks: [] };
      state.setState({ boards: [board] });
      
      state.setCurrentBoard('board-1');
      
      expect(state.get('currentBoardId')).toBe('board-1');
      expect(state.getCurrentBoard()).toEqual(board);
    });

    test('should add board to state', () => {
      const board = { id: 'board-1', name: 'Test Board', tasks: [] };
      
      state.addBoard(board);
      
      expect(state.get('boards')).toHaveLength(1);
      expect(state.get('boards')[0]).toEqual(board);
      expect(mockEventBus.emit).toHaveBeenCalledWith('board:added', board);
    });

    test('should update existing board', () => {
      const board = { id: 'board-1', name: 'Test Board', tasks: [] };
      state.addBoard(board);
      
      const updates = { name: 'Updated Board', description: 'New description' };
      state.updateBoard('board-1', updates);
      
      const updatedBoard = state.get('boards')[0];
      expect(updatedBoard.name).toBe('Updated Board');
      expect(updatedBoard.description).toBe('New description');
      expect(mockEventBus.emit).toHaveBeenCalledWith('board:updated', expect.objectContaining(updates));
    });

    test('should not update non-existent board', () => {
      const initialBoards = state.get('boards');
      
      state.updateBoard('non-existent', { name: 'Updated' });
      
      expect(state.get('boards')).toEqual(initialBoards);
    });

    test('should remove board from state', () => {
      const board1 = { id: 'board-1', name: 'Board 1', tasks: [] };
      const board2 = { id: 'board-2', name: 'Board 2', tasks: [] };
      
      state.addBoard(board1);
      state.addBoard(board2);
      
      state.removeBoard('board-1');
      
      expect(state.get('boards')).toHaveLength(1);
      expect(state.get('boards')[0]).toEqual(board2);
      expect(mockEventBus.emit).toHaveBeenCalledWith('board:removed', 'board-1');
    });

    test('should update current board ID when current board is removed', () => {
      const board1 = { id: 'board-1', name: 'Board 1', tasks: [] };
      const board2 = { id: 'board-2', name: 'Board 2', tasks: [] };
      
      state.addBoard(board1);
      state.addBoard(board2);
      state.setCurrentBoard('board-1');
      
      state.removeBoard('board-1');
      
      expect(state.get('currentBoardId')).toBe('board-2');
    });

    test('should set current board ID to null when last board is removed', () => {
      const board = { id: 'board-1', name: 'Board 1', tasks: [] };
      
      state.addBoard(board);
      state.setCurrentBoard('board-1');
      
      state.removeBoard('board-1');
      
      expect(state.get('currentBoardId')).toBeNull();
    });

    test('should get active boards', () => {
      const activeBoard = { id: 'board-1', name: 'Active Board', isArchived: false };
      const archivedBoard = { id: 'board-2', name: 'Archived Board', isArchived: true };
      
      state.addBoard(activeBoard);
      state.addBoard(archivedBoard);
      
      const activeBoards = state.getActiveBoards();
      
      expect(activeBoards).toHaveLength(1);
      expect(activeBoards[0]).toEqual(activeBoard);
    });

    test('should get archived boards', () => {
      const activeBoard = { id: 'board-1', name: 'Active Board', isArchived: false };
      const archivedBoard = { id: 'board-2', name: 'Archived Board', isArchived: true };
      
      state.addBoard(activeBoard);
      state.addBoard(archivedBoard);
      
      const archivedBoards = state.getArchivedBoards();
      
      expect(archivedBoards).toHaveLength(1);
      expect(archivedBoards[0]).toEqual(archivedBoard);
    });
  });

  describe('Task Management', () => {
    test('should compute tasks from current board', () => {
      const tasks = [
        { id: 'task-1', text: 'Task 1', status: 'todo' },
        { id: 'task-2', text: 'Task 2', status: 'doing' }
      ];
      const board = { id: 'board-1', name: 'Test Board', tasks };
      
      state.addBoard(board);
      state.setCurrentBoard('board-1');
      
      expect(state.get('tasks')).toEqual(tasks);
    });

    test('should return empty tasks when no current board', () => {
      expect(state.get('tasks')).toEqual([]);
    });

    test('should update tasks when current board changes', () => {
      const board1Tasks = [{ id: 'task-1', text: 'Task 1', status: 'todo' }];
      const board2Tasks = [{ id: 'task-2', text: 'Task 2', status: 'doing' }];
      
      const board1 = { id: 'board-1', name: 'Board 1', tasks: board1Tasks };
      const board2 = { id: 'board-2', name: 'Board 2', tasks: board2Tasks };
      
      state.addBoard(board1);
      state.addBoard(board2);
      
      state.setCurrentBoard('board-1');
      expect(state.get('tasks')).toEqual(board1Tasks);
      
      state.setCurrentBoard('board-2');
      expect(state.get('tasks')).toEqual(board2Tasks);
    });
  });

  describe('State Reset', () => {
    test('should reset state to initial values', () => {
      // Modify state
      state.setState({ filter: 'todo', currentBoardId: 'board-1' });
      state.addBoard({ id: 'board-1', name: 'Test Board', tasks: [] });
      
      // Reset state
      state.reset();
      
      const resetState = state.getState();
      expect(resetState.boards).toEqual([]);
      expect(resetState.currentBoardId).toBeNull();
      expect(resetState.tasks).toEqual([]);
      expect(resetState.filter).toBe('all');
      expect(resetState.history).toEqual([]);
      expect(resetState.historyIndex).toBe(-1);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('state:reset');
    });

    test('should clear all subscriptions on reset', () => {
      const callback = jest.fn();
      state.subscribe('filter', callback);
      
      expect(state.listeners.size).toBeGreaterThan(0);
      
      state.reset();
      
      expect(state.listeners.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid state updates gracefully', () => {
      expect(() => state.setState(null)).not.toThrow();
      expect(() => state.setState(undefined)).not.toThrow();
      expect(() => state.setState('invalid')).not.toThrow();
    });

    test('should handle subscription errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      state.subscribe('filter', errorCallback);
      
      expect(() => state.setState({ filter: 'todo' })).not.toThrow();
      expect(errorCallback).toHaveBeenCalled();
    });

    test('should handle invalid board operations', () => {
      expect(() => state.setCurrentBoard('non-existent')).not.toThrow();
      expect(() => state.updateBoard(null, {})).not.toThrow();
      expect(() => state.removeBoard(undefined)).not.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    test('should not create excessive history entries', () => {
      // Rapidly update state
      for (let i = 0; i < 100; i++) {
        state.setState({ filter: `filter-${i}` });
      }
      
      expect(state.get('history').length).toBeLessThanOrEqual(50);
    });

    test('should properly clean up subscriptions', () => {
      const callbacks = [];
      const unsubscribers = [];
      
      // Create many subscriptions
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        unsubscribers.push(state.subscribe('filter', callback));
      }
      
      // Unsubscribe all
      unsubscribers.forEach(unsub => unsub());
      
      // Verify no callbacks are called
      state.setState({ filter: 'test' });
      callbacks.forEach(callback => {
        expect(callback).not.toHaveBeenCalled();
      });
    });

    test('should handle deep object updates efficiently', () => {
      const largeBoard = {
        id: 'large-board',
        name: 'Large Board',
        tasks: Array.from({ length: 1000 }, (_, i) => ({
          id: `task-${i}`,
          text: `Task ${i}`,
          status: 'todo'
        }))
      };
      
      const startTime = Date.now();
      state.addBoard(largeBoard);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(state.get('boards')).toHaveLength(1);
    });
  });
});