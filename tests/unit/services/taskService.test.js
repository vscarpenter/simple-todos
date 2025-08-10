/**
 * Unit Tests for TaskService
 * Tests the business logic for task management.
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
};

// Mock the eventBus module
jest.mock('scripts/modules/eventBus.js', () => mockEventBus);

// Import the service and models
const { TaskService } = await import('../../scripts/modules/services/taskService.js');
const { Task, createTask } = await import('../../../scripts/modules/models.js');

describe('TaskService', () => {
  let taskService;
  let mockState;
  let mockStorage;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mocks for each test to ensure isolation
    mockState = {
        getState: jest.fn(),
        setState: jest.fn(),
    };
    mockStorage = {
        save: jest.fn().mockResolvedValue(true),
    };

    // Instantiate the service with mocks
    taskService = new TaskService(mockState, mockStorage);
  });

  describe('createTask', () => {
    test('should create a task successfully', async () => {
      // Arrange
      const board = { id: 'board-1', name: 'Test Board', tasks: [] };
      mockState.getState.mockReturnValue({ boards: [board] });
      const taskText = 'New test task';

      // Act
      const createdTask = await taskService.createTask(taskText, 'board-1');

      // Assert
      expect(createdTask).toBeInstanceOf(Task);
      expect(createdTask.text).toBe(taskText);
      expect(createdTask.status).toBe('todo');
      
      expect(mockState.setState).toHaveBeenCalledWith({
        boards: expect.any(Array),
        tasks: expect.any(Array),
      });
      
      const updatedBoard = mockState.setState.mock.calls[0][0].boards[0];
      expect(updatedBoard.tasks).toHaveLength(1);
      expect(updatedBoard.tasks[0].text).toBe(taskText);

      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:created', expect.any(Object));
      expect(mockEventBus.emit).toHaveBeenCalledWith('data:changed');
    });

    test('should throw an error for empty task text', async () => {
      mockState.getState.mockReturnValue({ boards: [{ id: 'board-1', name: 'Test Board', tasks: [] }] });
      await expect(taskService.createTask('  ', 'board-1')).rejects.toThrow('Task text cannot be empty');
    });

    test('should throw an error for duplicate task text', async () => {
        const existingTask = { id: 'task-1', text: 'Existing task', status: 'todo' };
        const board = { id: 'board-1', name: 'Test Board', tasks: [existingTask] };
        mockState.getState.mockReturnValue({ boards: [board] });
  
        await expect(taskService.createTask('Existing task', 'board-1')).rejects.toThrow('A task with this text already exists');
    });

    test('should throw an error if board is not found', async () => {
        mockState.getState.mockReturnValue({ boards: [] });
        await expect(taskService.createTask('A task', 'non-existent-board')).rejects.toThrow('Board not found');
    });
  });

  describe('updateTask', () => {
    test('should update a task successfully', async () => {
      // Arrange
      const task = createTask({ text: 'Original Text' });
      const board = { id: 'board-1', name: 'Test Board', tasks: [task.toJSON()] };
      mockState.getState.mockReturnValue({ boards: [board], currentBoardId: 'board-1' });
      const updates = { text: 'Updated Text', status: 'doing' };

      // Act
      const updatedTask = await taskService.updateTask(task.id, updates);

      // Assert
      expect(updatedTask.text).toBe('Updated Text');
      expect(updatedTask.status).toBe('doing');
      
      const updatedBoard = mockState.setState.mock.calls[0][0].boards[0];
      expect(updatedBoard.tasks[0].text).toBe('Updated Text');

      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:updated', expect.any(Object));
    });

    test('should throw an error if task is not found', async () => {
        mockState.getState.mockReturnValue({ boards: [] });
        await expect(taskService.updateTask('non-existent-id', { text: 'Update' })).rejects.toThrow('Task not found');
    });
  });

  describe('deleteTask', () => {
    test('should delete a task successfully', async () => {
      // Arrange
      const task = createTask({ text: 'To be deleted' });
      const board = { id: 'board-1', name: 'Test Board', tasks: [task.toJSON()] };
      mockState.getState.mockReturnValue({ boards: [board], currentBoardId: 'board-1' });

      // Act
      const result = await taskService.deleteTask(task.id);

      // Assert
      expect(result).toBe(true);
      const updatedBoard = mockState.setState.mock.calls[0][0].boards[0];
      expect(updatedBoard.tasks).toHaveLength(0);
      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:deleted', expect.any(Object));
    });
  });
});