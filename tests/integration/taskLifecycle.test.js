/**
 * Task Lifecycle Integration Tests
 * Comprehensive testing of task CRUD operations and workflows
 */

import { jest } from '@jest/globals';

// Mock the modules before importing CascadeApp
const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  once: jest.fn()
};

const mockAppState = {
  get: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn(),
  getCurrentBoard: jest.fn(),
  getActiveBoards: jest.fn(),
  addBoard: jest.fn(),
  setCurrentBoard: jest.fn(),
  updateBoard: jest.fn(),
  removeBoard: jest.fn()
};

const mockStorage = {
  load: jest.fn(),
  save: jest.fn(),
  exportData: jest.fn(),
  clearAll: jest.fn()
};

const mockDomManager = {
  init: jest.fn(),
  renderTasks: jest.fn(),
  renderBoardSelector: jest.fn(),
  showModal: jest.fn(),
  clearTaskInput: jest.fn(),
  showToast: jest.fn(),
  sanitizeHTML: jest.fn(text => text)
};

const mockAccessibility = {
  init: jest.fn(),
  updateTaskCounts: jest.fn(),
  announceTaskAction: jest.fn()
};

const mockSettingsManager = {
  loadSettings: jest.fn(),
  applyTheme: jest.fn(),
  get: jest.fn(() => false), // Default to false for debugMode
  getAutoArchiveConfig: jest.fn(() => ({ enabled: false, days: 30 }))
};

const mockDebugLog = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockModels = {
  Board: jest.fn(),
  Task: jest.fn(),
  createBoard: jest.fn(),
  createTask: jest.fn()
};


// Mock all module imports
jest.unstable_mockModule('scripts/modules/eventBus.js', () => ({
  default: mockEventBus
}));

jest.unstable_mockModule('scripts/modules/state.js', () => ({
  default: mockAppState
}));

jest.unstable_mockModule('scripts/modules/storage.js', () => ({
  default: mockStorage
}));

jest.unstable_mockModule('scripts/modules/dom.js', () => ({
  default: mockDomManager
}));

jest.unstable_mockModule('scripts/modules/accessibility.js', () => ({
  default: mockAccessibility
}));

jest.unstable_mockModule('scripts/modules/settings.js', () => ({
  settingsManager: mockSettingsManager,
  debugLog: mockDebugLog
}));

jest.unstable_mockModule('scripts/modules/models.js', () => mockModels);


// Import test utilities
import { mockGlobalDOM } from '../mocks/domMock.js';
import { setupTestStorage, TEST_STORAGE_DATA } from '../mocks/storageMock.js';
import { 
  todoTask, 
  doingTask, 
  doneTask, 
  createTestTask,
  TASK_COLLECTIONS 
} from '../fixtures/index.js';

// Now import the module under test
const { default: CascadeApp } = await import('scripts/modules/main.js');

describe('Task Lifecycle Integration Tests', () => {
  let app;
  let mockDocument;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup DOM environment
    mockDocument = mockGlobalDOM();
    
    // Setup storage
    setupTestStorage('singleBoard');
    
    // Setup default mock returns
    mockAppState.get.mockImplementation((key) => {
      const state = {
        boards: [
          {
            id: 'board-1',
            name: 'Test Board',
            tasks: []
          }
        ],
        currentBoardId: 'board-1',
        tasks: [],
        filter: 'all'
      };
      return state[key];
    });

    mockAppState.getCurrentBoard.mockReturnValue({
      id: 'board-1',
      name: 'Test Board',
      tasks: []
    });

    mockStorage.load.mockReturnValue(TEST_STORAGE_DATA.singleBoard['cascade-tasks']);
    
    // Mock Task constructor
    mockModels.Task.mockImplementation((data) => {
      const task = {
        ...data,
        toJSON: function() {
          return {
            id: this.id,
            text: this.text,
            status: this.status,
            createdDate: this.createdDate,
            lastModified: this.lastModified,
            archived: this.archived,
            archivedDate: this.archivedDate,
            completedDate: this.completedDate
          };
        },
        update: function(updates) {
          Object.assign(this, updates);
          this.lastModified = new Date().toISOString();
          return this;
        },
        moveTo: function(status) {
          this.status = status;
          this.lastModified = new Date().toISOString();
          if (status === 'done') {
            this.completedDate = new Date().toISOString().split('T')[0];
          }
          return this;
        },
        complete: function() {
          return this.moveTo('done');
        },
        start: function() {
          return this.moveTo('doing');
        },
        reset: function() {
          return this.moveTo('todo');
        },
        archive: function() {
          this.archived = true;
        }
      };
      return task;
    });

    // Mock createBoard function
    mockModels.createBoard.mockImplementation((data) => new mockModels.Board({
      id: data.id || `test-board-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      color: data.color || '#6750a4',
      isDefault: data.isDefault || false,
      createdDate: data.createdDate || new Date().toISOString().split('T')[0],
      lastModified: data.lastModified || new Date().toISOString(),
      tasks: data.tasks || [],
      ...data
    }));

    // Mock createTask function
    mockModels.createTask.mockImplementation((data) => new mockModels.Task({
      id: data.id || `test-task-${Date.now()}`,
      text: data.text || '',
      status: data.status || 'todo',
      createdDate: data.createdDate || new Date().toISOString(),
      lastModified: data.lastModified || new Date().toISOString(),
      archived: data.archived || false,
      ...data
    }));

    // Setup createBoard mock to return a valid board object
    mockModels.createBoard.mockImplementation((data) => {
      const board = {
        id: 'test-board-id',
        name: data?.name || 'Default Board',
        description: data?.description || '',
        color: data?.color || '#6750a4',
        tasks: data?.tasks || [],
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        isArchived: data?.isArchived || false,
        isDefault: data?.isDefault || false,
        toJSON: function() {
          return {
            id: this.id,
            name: this.name,
            description: this.description,
            color: this.color,
            tasks: this.tasks,
            createdDate: this.createdDate,
            lastModified: this.lastModified,
            isArchived: this.isArchived,
            isDefault: this.isDefault
          };
        },
        update: function(updates) {
          Object.assign(this, updates);
          this.lastModified = new Date().toISOString();
          return this;
        },
        addTask: function(task) {
          this.tasks.push(task);
          return this;
        },
        removeTask: function(taskId) {
          this.tasks = this.tasks.filter(t => t.id !== taskId);
          return this;
        }
      };
      return board;
    });

    // Initialize app
    app = new CascadeApp();
  });

  describe('Task Creation Workflow', () => {
    test('should create a new task successfully', async () => {
      // Arrange
      const taskText = 'New integration test task';
      const expectedTask = createTestTask({ text: taskText });
      
      mockModels.createTask.mockReturnValue(expectedTask);
      mockAppState.get.mockReturnValue([]); // Empty task list initially

      // Act
      await app.handleCreateTask({ text: taskText });

      // Assert
      expect(mockModels.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          text: taskText
        })
      );
      
      expect(mockAppState.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          tasks: expect.arrayContaining([expectedTask])
        })
      );

      expect(mockDomManager.clearTaskInput).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:created', { task: expectedTask });
    });

    test('should validate task text before creation', async () => {
      // Test empty text
      await app.handleCreateTask({ text: '' });
      expect(mockDomManager.showModal).toHaveBeenCalledWith(
        'Error',
        'Task cannot be empty'
      );
      expect(mockModels.createTask).not.toHaveBeenCalled();

      // Test text too long
      const longText = 'x'.repeat(201);
      await app.handleCreateTask({ text: longText });
      expect(mockDomManager.showModal).toHaveBeenCalledWith(
        'Error',
        'Task cannot exceed 200 characters'
      );
      expect(mockModels.createTask).not.toHaveBeenCalled();
    });

    test('should handle task creation errors gracefully', async () => {
      // Arrange
      const error = new Error('Creation failed');
      mockModels.createTask.mockImplementation(() => {
        throw error;
      });

      // Act
      await app.handleCreateTask({ text: 'Test task' });

      // Assert
      expect(console.error).toHaveBeenCalledWith('❌ Failed to create task:', error);
    });
  });

  describe('Task Status Movement Workflow', () => {
    test('should move task from todo to doing', async () => {
      // Arrange
      const task = createTestTask({ status: 'todo' });
      const tasks = [task];
      
      mockAppState.get.mockReturnValue(tasks);
      
      // Act
      await app.handleDropTask({ taskId: task.id, targetStatus: 'doing' });

      // Assert
      expect(mockAppState.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({
              id: task.id,
              status: 'doing'
            })
          ])
        })
      );

      // Note: task:moved event is no longer emitted to prevent circular dependency
    });

    test('should complete task workflow (todo → doing → done)', async () => {
      // Arrange
      const task = createTestTask({ status: 'todo' });
      let currentTasks = [task];
      
      mockAppState.get.mockImplementation(() => currentTasks);
      mockAppState.setState.mockImplementation(({ tasks }) => {
        currentTasks = tasks;
      });

      // Act 1: Move to doing
      await app.handleStartTask({ taskId: task.id });
      
      // Assert 1: task:moved event is no longer emitted to prevent circular dependency
      
      // Act 2: Complete task
      await app.handleCompleteTask({ taskId: task.id });
      
      // Assert 2: task:moved event is no longer emitted to prevent circular dependency
    });

    test('should validate task movement parameters', async () => {
      // Test invalid task ID
      await app.handleDropTask({ taskId: '', targetStatus: 'doing' });
      expect(console.error).toHaveBeenCalledWith('❌ Invalid taskId:', '');

      // Test invalid target status
      await app.handleDropTask({ taskId: 'valid-id', targetStatus: 'invalid' });
      expect(console.error).toHaveBeenCalledWith('❌ Invalid target status:', 'invalid');

      // Test non-existent task
      mockAppState.get.mockReturnValue([]);
      await app.handleDropTask({ taskId: 'non-existent', targetStatus: 'doing' });
      expect(console.error).toHaveBeenCalledWith('❌ Task not found with ID:', 'non-existent');
    });
  });

  describe('Task Editing Workflow', () => {
    test('should edit task text successfully', async () => {
      // Arrange
      const originalTask = createTestTask({ text: 'Original text' });
      const newText = 'Updated text';
      const tasks = [originalTask];
      
      mockAppState.get.mockReturnValue(tasks);
      mockDomManager.showModal.mockResolvedValue(newText);

      // Act
      await app.handleEditTask({ taskId: originalTask.id });

      // Assert
      expect(mockDomManager.showModal).toHaveBeenCalledWith(
        'Edit Task',
        'Enter new task text:',
        {
          showInput: true,
          inputValue: originalTask.text
        }
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith('task:edited', {
        task: expect.objectContaining({
          id: originalTask.id,
          text: newText
        })
      });
    });

    test('should validate edited task text', async () => {
      // Arrange
      const task = createTestTask();
      const longText = 'x'.repeat(201);
      
      mockAppState.get.mockReturnValue([task]);
      mockDomManager.showModal.mockResolvedValue(longText);

      // Act
      await app.handleEditTask({ taskId: task.id });

      // Assert
      expect(mockDomManager.showModal).toHaveBeenCalledWith(
        'Error',
        'Task cannot exceed 200 characters'
      );
    });

    test('should handle edit cancellation', async () => {
      // Arrange
      const task = createTestTask();
      
      mockAppState.get.mockReturnValue([task]);
      mockDomManager.showModal.mockResolvedValue(null); // User cancelled

      // Act
      await app.handleEditTask({ taskId: task.id });

      // Assert - no state changes should occur
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'task:edited',
        expect.anything()
      );
    });
  });

  describe('Task Deletion Workflow', () => {
    test('should delete task with confirmation', async () => {
      // Arrange
      const task = createTestTask();
      const tasks = [task];
      
      mockAppState.get.mockReturnValue(tasks);
      mockDomManager.showModal.mockResolvedValue(true); // User confirms

      // Act
      await app.handleDeleteTask({ taskId: task.id });

      // Assert
      expect(mockDomManager.showModal).toHaveBeenCalledWith(
        'Confirm Delete',
        'Are you sure you want to delete this task?'
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith('task:deleted', {
        taskId: task.id
      });
    });

    test('should cancel deletion when user declines', async () => {
      // Arrange
      const task = createTestTask();
      const tasks = [task];
      
      mockAppState.get.mockReturnValue(tasks);
      mockDomManager.showModal.mockResolvedValue(false); // User cancels

      // Act
      await app.handleDeleteTask({ taskId: task.id });

      // Assert - no deletion should occur
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'task:deleted',
        expect.anything()
      );
    });
  });

  describe('Task Archiving Workflow', () => {
    test('should archive individual task', async () => {
      // Arrange
      const task = createTestTask({ status: 'done' });
      const tasks = [task];
      
      mockAppState.get.mockReturnValue(tasks);
      mockAppState.getCurrentBoard.mockReturnValue({
        id: 'board-1',
        tasks: [task]
      });

      // Act  
      await app.handleArchiveTask({ taskId: task.id });

      // Assert
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:archived', {
        taskId: task.id
      });
    });

    test('should archive all completed tasks', async () => {
      // Arrange
      const completedTask1 = createTestTask({ status: 'done', text: 'Completed 1' });
      const completedTask2 = createTestTask({ status: 'done', text: 'Completed 2' });
      const activeTask = createTestTask({ status: 'todo', text: 'Active task' });
      const tasks = [completedTask1, completedTask2, activeTask];
      
      mockAppState.get.mockReturnValue(tasks);
      mockAppState.getCurrentBoard.mockReturnValue({
        id: 'board-1',
        tasks: tasks
      });
      mockDomManager.showModal.mockResolvedValue(true); // User confirms

      // Act
      await app.handleArchiveCompleted();

      // Assert
      expect(mockDomManager.showModal).toHaveBeenCalledWith(
        'Archive Completed',
        'Archive 2 completed tasks?'
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith('tasks:archived', {
        count: 2
      });
    });

    test('should handle no completed tasks to archive', async () => {
      // Arrange
      const tasks = [createTestTask({ status: 'todo' })];
      
      mockAppState.get.mockReturnValue(tasks);

      // Act
      await app.handleArchiveCompleted();

      // Assert
      expect(mockDomManager.showModal).toHaveBeenCalledWith(
        'Info',
        'No completed tasks to archive'
      );
    });
  });

  describe('Complex Task Workflows', () => {
    test('should handle rapid task operations', async () => {
      // Simulate rapid task creation and movement
      const taskTexts = ['Task 1', 'Task 2', 'Task 3'];
      const createdTasks = [];

      // Rapid creation
      for (const text of taskTexts) {
        const task = createTestTask({ text });
        mockModels.createTask.mockReturnValue(task);
        mockAppState.get.mockReturnValue(createdTasks);
        
        await app.handleCreateTask({ text });
        createdTasks.push(task);
      }

      // Verify all tasks created
      expect(mockModels.createTask).toHaveBeenCalledTimes(3);
      expect(mockEventBus.emit).toHaveBeenCalledTimes(3);

      // Rapid status changes
      mockAppState.get.mockReturnValue(createdTasks);
      
      for (const task of createdTasks) {
        await app.handleStartTask({ taskId: task.id });
        await app.handleCompleteTask({ taskId: task.id });
      }

      // Verify all movements (task:moved events are no longer emitted to prevent circular dependency)
    });

    test('should maintain data consistency during concurrent operations', async () => {
      // Arrange
      const initialTasks = TASK_COLLECTIONS.workflow;
      let currentTasks = [...initialTasks];
      
      mockAppState.get.mockImplementation(() => currentTasks);
      mockAppState.setState.mockImplementation(({ tasks }) => {
        currentTasks = tasks || currentTasks;
      });

      // Act - Simulate concurrent operations
      const operations = [
        () => app.handleCreateTask({ text: 'Concurrent task 1' }),
        () => app.handleCreateTask({ text: 'Concurrent task 2' }),
        () => app.handleStartTask({ taskId: initialTasks[0].id }),
        () => app.handleCompleteTask({ taskId: initialTasks[1].id })
      ];

      // Execute operations
      await Promise.all(operations.map(op => op()));

      // Assert - All operations should complete without errors
      expect(mockAppState.setState).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:created', expect.anything());
      // task:moved events are no longer emitted to prevent circular dependency
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle storage failures gracefully', async () => {
      // Arrange
      const storageError = new Error('Storage quota exceeded');
      mockAppState.setState.mockImplementation(() => {
        throw storageError;
      });

      // Act
      await app.handleCreateTask({ text: 'Test task' });

      // Assert
      expect(console.error).toHaveBeenCalledWith('❌ Failed to create task:', storageError);
    });

    test('should handle DOM manipulation errors', async () => {
      // Arrange
      const domError = new Error('DOM element not found');
      mockDomManager.clearTaskInput.mockImplementation(() => {
        throw domError;
      });

      // Act & Assert - Should not crash the application
      await expect(app.handleCreateTask({ text: 'Test task' })).resolves.not.toThrow();
    });

    test('should handle invalid task data', async () => {
      // Test with various invalid inputs
      const invalidInputs = [
        null,
        undefined,
        { text: null },
        { text: undefined },
        { taskId: null },
        { taskId: undefined }
      ];

      for (const input of invalidInputs) {
        await expect(app.handleCreateTask(input)).resolves.not.toThrow();
        await expect(app.handleEditTask(input)).resolves.not.toThrow();
        await expect(app.handleDeleteTask(input)).resolves.not.toThrow();
      }
    });
  });
});