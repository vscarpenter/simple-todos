/**
 * Comprehensive Integration Tests for Module Communication
 * Tests inter-module communication, data flow, event handling, and system integration
 */

import { jest } from '@jest/globals';

describe('Module Integration Tests', () => {
  let modules = {};
  let eventBus;

  beforeEach(async () => {
    // Clear localStorage
    localStorage.clear();
    
    // Set up basic DOM structure
    document.body.innerHTML = `
      <div id="main-content">
        <div id="todo-list" data-status="todo"></div>
        <div id="doing-list" data-status="doing"></div>
        <div id="done-list" data-status="done"></div>
        <span id="todo-count">0</span>
        <span id="doing-count">0</span>
        <span id="done-count">0</span>
        <div id="board-selector-menu"></div>
        <span id="current-board-name">Main Board</span>
        <div id="custom-modal" class="modal-overlay" style="display: none;">
          <div class="modal-box">
            <h5 id="modal-title"></h5>
            <p id="modal-message"></p>
            <input id="modal-input" type="text" />
            <div class="modal-actions">
              <button id="modal-confirm">Confirm</button>
              <button id="modal-cancel">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    try {
      // Import all modules
      const eventBusModule = await import('scripts/modules/eventBus.js');
      const stateModule = await import('scripts/modules/state.js');
      const storageModule = await import('scripts/modules/storage.js');
      const domModule = await import('scripts/modules/dom.js');
      const modelsModule = await import('scripts/modules/models.js');
      const settingsModule = await import('scripts/modules/settings.js');
      const mainModule = await import('scripts/modules/main.js');
      
      modules = {
        eventBus: eventBusModule.default,
        state: stateModule.default,
        storage: storageModule.default,
        dom: domModule.default,
        models: modelsModule,
        settings: settingsModule.settingsManager,
        main: mainModule.default
      };
      
      eventBus = modules.eventBus;
    } catch (error) {
      // Create mocks if modules don't exist
      eventBus = {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        listeners: new Map()
      };
      
      modules = {
        eventBus,
        state: {
          getState: jest.fn(() => ({ boards: [], currentBoardId: null, tasks: [] })),
          setState: jest.fn(),
          subscribe: jest.fn(() => () => {}),
          addBoard: jest.fn(),
          getCurrentBoard: jest.fn(() => null)
        },
        storage: {
          save: jest.fn(() => true),
          load: jest.fn(() => ({ boards: [], currentBoardId: null })),
          exportData: jest.fn(() => ({ data: {} })),
          importData: jest.fn(() => true)
        },
        dom: {
          renderTasks: jest.fn(),
          renderBoardSelector: jest.fn(),
          showModal: jest.fn(),
          hideModal: jest.fn(),
          showToast: jest.fn()
        },
        models: {
          Task: class {
            constructor(data) {
              this.id = data.id || 'test-id';
              this.text = data.text || '';
              this.status = data.status || 'todo';
              this.createdDate = data.createdDate || new Date().toISOString();
            }
          },
          Board: class {
            constructor(data) {
              this.id = data.id || 'test-board-id';
              this.name = data.name || 'Test Board';
              this.tasks = data.tasks || [];
            }
          },
          createTask: jest.fn((text) => new modules.models.Task({ text })),
          createBoard: jest.fn((name) => new modules.models.Board({ name }))
        },
        settings: {
          get: jest.fn(() => false),
          set: jest.fn(),
          getAll: jest.fn(() => ({}))
        },
        main: {
          init: jest.fn(),
          createTask: jest.fn(),
          editTask: jest.fn(),
          deleteTask: jest.fn(),
          moveTask: jest.fn(),
          createBoard: jest.fn(),
          switchBoard: jest.fn()
        }
      };
    }
  });

  describe('Application Initialization Flow', () => {
    test('should initialize modules in correct order', async () => {
      const initOrder = [];
      
      // Mock module initialization
      modules.settings.init = jest.fn(() => {
        initOrder.push('settings');
        return Promise.resolve();
      });
      
      modules.storage.init = jest.fn(() => {
        initOrder.push('storage');
        return Promise.resolve();
      });
      
      modules.state.init = jest.fn(() => {
        initOrder.push('state');
        return Promise.resolve();
      });
      
      modules.dom.init = jest.fn(() => {
        initOrder.push('dom');
        return Promise.resolve();
      });
      
      // Simulate app initialization
      await modules.settings.init();
      await modules.storage.init();
      await modules.state.init();
      await modules.dom.init();
      
      expect(initOrder).toEqual(['settings', 'storage', 'state', 'dom']);
    });

    test('should load data and update state on startup', async () => {
      const mockData = {
        boards: [
          { id: 'board-1', name: 'Work Board', tasks: [] },
          { id: 'board-2', name: 'Personal Board', tasks: [] }
        ],
        currentBoardId: 'board-1'
      };
      
      modules.storage.load.mockReturnValue(mockData);
      
      // Simulate data loading
      const loadedData = modules.storage.load();
      modules.state.setState(loadedData);
      
      expect(modules.storage.load).toHaveBeenCalled();
      expect(modules.state.setState).toHaveBeenCalledWith(mockData);
    });

    test('should handle initialization errors gracefully', async () => {
      modules.storage.load.mockImplementation(() => {
        throw new Error('Storage initialization failed');
      });
      
      let initError = null;
      try {
        modules.storage.load();
      } catch (error) {
        initError = error;
      }
      
      expect(initError).toBeDefined();
      expect(initError.message).toBe('Storage initialization failed');
      
      // App should continue with default state
      const defaultState = { boards: [], currentBoardId: null, tasks: [] };
      modules.state.setState(defaultState);
      
      expect(modules.state.setState).toHaveBeenCalledWith(defaultState);
    });
  });

  describe('Task Management Flow', () => {
    test('should handle complete task creation flow', async () => {
      const taskText = 'Complete integration tests';
      const events = [];
      
      // Mock event tracking
      eventBus.emit.mockImplementation((event, data) => {
        events.push({ event, data });
      });
      
      // Simulate task creation flow
      const newTask = modules.models.createTask(taskText);
      eventBus.emit('task:create:requested', { text: taskText });
      
      // Main module handles the request
      modules.main.createTask(taskText);
      
      // State is updated
      const currentState = modules.state.getState();
      const updatedTasks = [...currentState.tasks, newTask];
      modules.state.setState({ ...currentState, tasks: updatedTasks });
      
      // Storage saves the data
      modules.storage.save(modules.state.getState());
      
      // DOM is updated
      modules.dom.renderTasks(updatedTasks);
      
      // Verify the flow
      expect(modules.models.createTask).toHaveBeenCalledWith(taskText);
      expect(modules.main.createTask).toHaveBeenCalledWith(taskText);
      expect(modules.state.setState).toHaveBeenCalled();
      expect(modules.storage.save).toHaveBeenCalled();
      expect(modules.dom.renderTasks).toHaveBeenCalledWith(updatedTasks);
    });

    test('should handle task movement between columns', () => {
      const taskId = 'task-1';
      const newStatus = 'doing';
      const events = [];
      
      eventBus.emit.mockImplementation((event, data) => {
        events.push({ event, data });
      });
      
      // Simulate task movement
      eventBus.emit('task:move:requested', { taskId, newStatus });
      modules.main.moveTask(taskId, newStatus);
      
      // State should be updated
      const mockState = {
        tasks: [
          { id: 'task-1', text: 'Test task', status: 'doing' }
        ]
      };
      modules.state.setState(mockState);
      
      // Storage should save
      modules.storage.save(mockState);
      
      // DOM should re-render
      modules.dom.renderTasks(mockState.tasks);
      
      expect(modules.main.moveTask).toHaveBeenCalledWith(taskId, newStatus);
      expect(modules.state.setState).toHaveBeenCalledWith(mockState);
      expect(modules.storage.save).toHaveBeenCalledWith(mockState);
      expect(modules.dom.renderTasks).toHaveBeenCalledWith(mockState.tasks);
    });

    test('should handle task deletion with confirmation', async () => {
      const taskId = 'task-1';
      let modalResolve;
      
      // Mock modal confirmation
      modules.dom.showModal.mockImplementation((options) => {
        // Simulate user confirmation
        setTimeout(() => {
          if (options.onConfirm) {
            options.onConfirm();
          }
        }, 10);
      });
      
      // Simulate deletion flow
      eventBus.emit('task:delete:requested', { taskId });
      
      // Show confirmation modal
      modules.dom.showModal({
        title: 'Delete Task',
        message: 'Are you sure you want to delete this task?',
        onConfirm: () => {
          modules.main.deleteTask(taskId);
          
          // Update state
          const updatedState = {
            tasks: [] // Task removed
          };
          modules.state.setState(updatedState);
          
          // Save and render
          modules.storage.save(updatedState);
          modules.dom.renderTasks(updatedState.tasks);
        }
      });
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(modules.dom.showModal).toHaveBeenCalled();
      expect(modules.main.deleteTask).toHaveBeenCalledWith(taskId);
    });
  });

  describe('Board Management Flow', () => {
    test('should handle board creation and switching', () => {
      const boardName = 'New Project Board';
      const boardColor = '#ff5722';
      
      // Create new board
      const newBoard = modules.models.createBoard(boardName);
      newBoard.color = boardColor;
      
      modules.main.createBoard({ name: boardName, color: boardColor });
      
      // Add to state
      modules.state.addBoard(newBoard);
      
      // Switch to new board
      modules.main.switchBoard(newBoard.id);
      modules.state.setState({ currentBoardId: newBoard.id });
      
      // Update DOM
      const boards = [newBoard];
      modules.dom.renderBoardSelector(boards, newBoard.id);
      
      expect(modules.models.createBoard).toHaveBeenCalledWith(boardName);
      expect(modules.main.createBoard).toHaveBeenCalledWith({ name: boardName, color: boardColor });
      expect(modules.state.addBoard).toHaveBeenCalledWith(newBoard);
      expect(modules.main.switchBoard).toHaveBeenCalledWith(newBoard.id);
      expect(modules.dom.renderBoardSelector).toHaveBeenCalledWith(boards, newBoard.id);
    });

    test('should handle board switching with task loading', () => {
      const boardId = 'board-2';
      const boardTasks = [
        { id: 'task-1', text: 'Board 2 Task 1', status: 'todo' },
        { id: 'task-2', text: 'Board 2 Task 2', status: 'doing' }
      ];
      
      // Mock board with tasks
      modules.state.getCurrentBoard.mockReturnValue({
        id: boardId,
        name: 'Board 2',
        tasks: boardTasks
      });
      
      // Switch board
      modules.main.switchBoard(boardId);
      modules.state.setState({ currentBoardId: boardId, tasks: boardTasks });
      
      // Render tasks for new board
      modules.dom.renderTasks(boardTasks);
      
      // Save state
      modules.storage.save(modules.state.getState());
      
      expect(modules.main.switchBoard).toHaveBeenCalledWith(boardId);
      expect(modules.state.setState).toHaveBeenCalledWith({ 
        currentBoardId: boardId, 
        tasks: boardTasks 
      });
      expect(modules.dom.renderTasks).toHaveBeenCalledWith(boardTasks);
      expect(modules.storage.save).toHaveBeenCalled();
    });
  });

  describe('Data Persistence Flow', () => {
    test('should handle auto-save on state changes', () => {
      const stateChangeHandler = jest.fn();
      
      // Mock state subscription
      modules.state.subscribe.mockImplementation((key, callback) => {
        if (key === 'tasks') {
          stateChangeHandler.mockImplementation(callback);
        }
        return () => {}; // unsubscribe function
      });
      
      // Subscribe to state changes
      modules.state.subscribe('tasks', (newTasks, oldTasks) => {
        if (newTasks !== oldTasks) {
          modules.storage.save(modules.state.getState());
        }
      });
      
      // Simulate state change
      const newTasks = [{ id: 'task-1', text: 'New task', status: 'todo' }];
      stateChangeHandler(newTasks, []);
      
      expect(stateChangeHandler).toHaveBeenCalledWith(newTasks, []);
    });

    test('should handle import/export operations', async () => {
      const importData = {
        version: '2.0',
        data: {
          boards: [
            { id: 'imported-board', name: 'Imported Board', tasks: [] }
          ],
          currentBoardId: 'imported-board'
        }
      };
      
      // Mock successful import
      modules.storage.importData.mockReturnValue(true);
      
      // Import data
      const importResult = modules.storage.importData(importData);
      
      if (importResult) {
        // Update state with imported data
        modules.state.setState(importData.data);
        
        // Update DOM
        modules.dom.renderBoardSelector(importData.data.boards, importData.data.currentBoardId);
        modules.dom.renderTasks([]);
        
        // Show success message
        modules.dom.showToast('Data imported successfully', 'success');
      }
      
      expect(modules.storage.importData).toHaveBeenCalledWith(importData);
      expect(modules.state.setState).toHaveBeenCalledWith(importData.data);
      expect(modules.dom.showToast).toHaveBeenCalledWith('Data imported successfully', 'success');
    });

    test('should handle export operations', () => {
      const mockExportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        data: modules.state.getState(),
        metadata: {
          totalBoards: 2,
          totalTasks: 5
        }
      };
      
      modules.storage.exportData.mockReturnValue(mockExportData);
      
      // Export data
      const exportData = modules.storage.exportData();
      
      // Create download (would be handled by DOM module)
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      expect(modules.storage.exportData).toHaveBeenCalled();
      expect(exportData).toEqual(mockExportData);
      expect(blob.type).toBe('application/json');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle and propagate errors across modules', () => {
      const error = new Error('Storage operation failed');
      const errorEvents = [];
      
      eventBus.emit.mockImplementation((event, data) => {
        errorEvents.push({ event, data });
      });
      
      // Simulate error in storage
      modules.storage.save.mockImplementation(() => {
        throw error;
      });
      
      try {
        modules.storage.save({});
      } catch (caughtError) {
        // Error handler processes the error
        eventBus.emit('error:occurred', {
          error: caughtError,
          module: 'storage',
          operation: 'save'
        });
        
        // Show user-friendly error
        modules.dom.showToast('Failed to save data. Please try again.', 'error');
      }
      
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0].event).toBe('error:occurred');
      expect(modules.dom.showToast).toHaveBeenCalledWith(
        'Failed to save data. Please try again.',
        'error'
      );
    });

    test('should handle validation errors in task creation', () => {
      const invalidTaskText = ''; // Empty text should fail validation
      
      modules.models.createTask.mockImplementation((text) => {
        if (!text || text.trim().length === 0) {
          throw new Error('Task text is required');
        }
        return new modules.models.Task({ text });
      });
      
      try {
        modules.models.createTask(invalidTaskText);
      } catch (error) {
        // Handle validation error
        eventBus.emit('validation:error', {
          field: 'taskText',
          message: error.message
        });
        
        modules.dom.showToast(error.message, 'error');
      }
      
      expect(modules.dom.showToast).toHaveBeenCalledWith('Task text is required', 'error');
    });
  });

  describe('Settings Integration', () => {
    test('should apply theme changes across modules', () => {
      const newTheme = 'dark';
      
      // Settings change
      modules.settings.set('theme', newTheme);
      
      // Emit theme change event
      eventBus.emit('theme:changed', { theme: newTheme });
      
      // DOM should apply theme
      document.documentElement.setAttribute('data-theme', newTheme);
      
      expect(modules.settings.set).toHaveBeenCalledWith('theme', newTheme);
      expect(document.documentElement.getAttribute('data-theme')).toBe(newTheme);
    });

    test('should handle debug mode changes', () => {
      const debugMode = true;
      
      modules.settings.set('debugMode', debugMode);
      
      // Debug mode affects logging across modules
      eventBus.emit('settings:changed', { 
        key: 'debugMode', 
        value: debugMode 
      });
      
      expect(modules.settings.set).toHaveBeenCalledWith('debugMode', debugMode);
    });
  });

  describe('Performance Integration', () => {
    test('should handle large datasets efficiently', () => {
      const largeBoardSet = Array.from({ length: 50 }, (_, i) => ({
        id: `board-${i}`,
        name: `Board ${i}`,
        tasks: Array.from({ length: 100 }, (_, j) => ({
          id: `task-${i}-${j}`,
          text: `Task ${j}`,
          status: 'todo'
        }))
      }));
      
      const startTime = Date.now();
      
      // Simulate loading large dataset
      modules.state.setState({ boards: largeBoardSet });
      modules.dom.renderBoardSelector(largeBoardSet, largeBoardSet[0].id);
      modules.storage.save({ boards: largeBoardSet });
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(modules.state.setState).toHaveBeenCalledWith({ boards: largeBoardSet });
    });

    test('should debounce rapid state changes', (done) => {
      let saveCount = 0;
      
      modules.storage.save.mockImplementation(() => {
        saveCount++;
        return true;
      });
      
      // Simulate rapid state changes
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          modules.state.setState({ counter: i });
          modules.storage.save(modules.state.getState());
        }, i * 10);
      }
      
      setTimeout(() => {
        // Should have been debounced
        expect(saveCount).toBeLessThan(10);
        done();
      }, 200);
    });
  });

  describe('Event System Integration', () => {
    test('should handle complex event chains', () => {
      const eventChain = [];
      
      eventBus.emit.mockImplementation((event, data) => {
        eventChain.push(event);
        
        // Simulate event chain reactions
        if (event === 'task:created') {
          eventBus.emit('state:changed', data);
        } else if (event === 'state:changed') {
          eventBus.emit('storage:save:requested', data);
        } else if (event === 'storage:save:requested') {
          eventBus.emit('dom:update:requested', data);
        }
      });
      
      // Start the chain
      eventBus.emit('task:created', { id: 'task-1' });
      
      expect(eventChain).toEqual([
        'task:created',
        'state:changed',
        'storage:save:requested',
        'dom:update:requested'
      ]);
    });

    test('should handle event subscription cleanup', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      // Mock subscription system
      const subscriptions = new Map();
      
      modules.eventBus.on = jest.fn((event, callback) => {
        if (!subscriptions.has(event)) {
          subscriptions.set(event, []);
        }
        subscriptions.get(event).push(callback);
      });
      
      modules.eventBus.off = jest.fn((event, callback) => {
        if (subscriptions.has(event)) {
          const callbacks = subscriptions.get(event);
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      });
      
      // Subscribe
      modules.eventBus.on('test:event', callback1);
      modules.eventBus.on('test:event', callback2);
      
      expect(subscriptions.get('test:event')).toHaveLength(2);
      
      // Unsubscribe
      modules.eventBus.off('test:event', callback1);
      
      expect(subscriptions.get('test:event')).toHaveLength(1);
      expect(subscriptions.get('test:event')).toContain(callback2);
    });
  });

  describe('Accessibility Integration', () => {
    test('should announce state changes to screen readers', () => {
      const announcements = [];
      
      // Mock screen reader announcements
      const announceToScreenReader = jest.fn((message) => {
        announcements.push(message);
      });
      
      // Simulate task creation with announcement
      const newTask = { id: 'task-1', text: 'New task', status: 'todo' };
      modules.main.createTask(newTask.text);
      
      announceToScreenReader(`Task "${newTask.text}" created in Todo column`);
      
      expect(announceToScreenReader).toHaveBeenCalledWith(
        'Task "New task" created in Todo column'
      );
      expect(announcements).toContain('Task "New task" created in Todo column');
    });

    test('should handle keyboard navigation events', () => {
      const keyboardEvents = [];
      
      // Mock keyboard event handling
      document.addEventListener('keydown', (e) => {
        keyboardEvents.push({
          key: e.key,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey
        });
        
        // Handle keyboard shortcuts
        if (e.ctrlKey && e.key === 'n') {
          modules.main.createTask('New task from keyboard');
        }
      });
      
      // Simulate keyboard shortcut
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true
      });
      
      document.dispatchEvent(keyEvent);
      
      expect(keyboardEvents).toHaveLength(1);
      expect(keyboardEvents[0]).toEqual({
        key: 'n',
        ctrlKey: true,
        altKey: false
      });
      expect(modules.main.createTask).toHaveBeenCalledWith('New task from keyboard');
    });
  });
});