/**
 * Comprehensive Unit Tests for Data Models
 * Tests Task and Board models with validation, business logic, and edge cases
 */

import { jest } from '@jest/globals';
import { Task, Board, Column, createTask, createBoard, createColumn } from 'scripts/modules/models.js';

describe('Task Model', () => {
  describe('Constructor and Validation', () => {
    test('should create a valid task with minimal data', () => {
      const task = new Task({ text: 'Test task' });
      
      expect(task.id).toBeDefined();
      expect(task.text).toBe('Test task');
      expect(task.status).toBe('todo');
      expect(task.createdDate).toBeDefined();
      expect(task.lastModified).toBeDefined();
      expect(task.completedDate).toBeNull();
    });

    test('should create a task with all properties', () => {
      const taskData = {
        id: 'test-id',
        text: 'Complete task',
        status: 'doing',
        createdDate: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-02T00:00:00.000Z',
        completedDate: '2024-01-03T00:00:00.000Z'
      };

      const task = new Task(taskData);
      
      expect(task.id).toBe('test-id');
      expect(task.text).toBe('Complete task');
      expect(task.status).toBe('doing');
      expect(task.createdDate).toBe('2024-01-01T00:00:00.000Z');
      expect(task.lastModified).toBe('2024-01-02T00:00:00.000Z');
      expect(task.completedDate).toBe('2024-01-03T00:00:00.000Z');
    });

    test('should throw error for empty text', () => {
      expect(() => new Task({ text: '' })).toThrow('Task text is required');
    });

    test('should throw error for text exceeding 200 characters', () => {
      const longText = 'a'.repeat(201);
      expect(() => new Task({ text: longText })).toThrow('Task text cannot exceed 200 characters');
    });

    test('should throw error for invalid status', () => {
      expect(() => new Task({ text: 'Test', status: 'invalid' })).toThrow('Task status must be one of: todo, doing, done');
    });

    test('should accept valid statuses', () => {
      expect(() => new Task({ text: 'Test', status: 'todo' })).not.toThrow();
      expect(() => new Task({ text: 'Test', status: 'doing' })).not.toThrow();
      expect(() => new Task({ text: 'Test', status: 'done' })).not.toThrow();
    });
  });

  describe('Business Logic Methods', () => {
    let task;

    beforeEach(() => {
      task = new Task({ text: 'Test task' });
    });

    test('should move task to different status', () => {
      const updatedTask = task.moveTo('doing');
      
      expect(updatedTask.status).toBe('doing');
      expect(updatedTask.lastModified).not.toBe(task.lastModified);
      expect(updatedTask.completedDate).toBeNull();
    });

    test('should set completion date when moved to done', () => {
      const updatedTask = task.moveTo('done');
      
      expect(updatedTask.status).toBe('done');
      expect(updatedTask.completedDate).toBeDefined();
      expect(new Date(updatedTask.completedDate)).toBeInstanceOf(Date);
    });

    test('should clear completion date when moved from done', () => {
      const doneTask = task.moveTo('done');
      const todoTask = doneTask.moveTo('todo');
      
      expect(todoTask.status).toBe('todo');
      expect(todoTask.completedDate).toBeNull();
    });

    test('should complete task', () => {
      const completedTask = task.complete();
      
      expect(completedTask.status).toBe('done');
      expect(completedTask.completedDate).toBeDefined();
    });

    test('should start task', () => {
      const startedTask = task.start();
      
      expect(startedTask.status).toBe('doing');
      expect(startedTask.completedDate).toBeNull();
    });

    test('should reset task', () => {
      const doneTask = task.complete();
      const resetTask = doneTask.reset();
      
      expect(resetTask.status).toBe('todo');
      expect(resetTask.completedDate).toBeNull();
    });

    test('should update task properties', () => {
      const updates = { text: 'Updated text', status: 'doing' };
      const updatedTask = task.update(updates);
      
      expect(updatedTask.text).toBe('Updated text');
      expect(updatedTask.status).toBe('doing');
      expect(updatedTask.lastModified).not.toBe(task.lastModified);
    });

    test('should validate updates', () => {
      expect(() => task.update({ text: '' })).toThrow('Task text is required');
      expect(() => task.update({ status: 'invalid' })).toThrow('Task status must be one of: todo, doing, done');
    });

    test('should clone task', () => {
      const clonedTask = task.clone();
      
      expect(clonedTask).not.toBe(task);
      expect(clonedTask.id).not.toBe(task.id);
      expect(clonedTask.text).toBe(task.text);
      expect(clonedTask.status).toBe(task.status);
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      const task = new Task({ text: 'Test task', status: 'doing' });
      const json = task.toJSON();
      
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('text', 'Test task');
      expect(json).toHaveProperty('status', 'doing');
      expect(json).toHaveProperty('createdDate');
      expect(json).toHaveProperty('lastModified');
      expect(json).toHaveProperty('completedDate');
    });

    test('should create task from JSON', () => {
      const taskData = {
        id: 'test-id',
        text: 'Test task',
        status: 'done',
        createdDate: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-02T00:00:00.000Z',
        completedDate: '2024-01-03T00:00:00.000Z'
      };

      const task = Task.fromJSON(taskData);
      
      expect(task).toBeInstanceOf(Task);
      expect(task.id).toBe('test-id');
      expect(task.text).toBe('Test task');
      expect(task.status).toBe('done');
    });
  });
});

describe('Board Model', () => {
  describe('Constructor and Validation', () => {
    test('should create a valid board with minimal data', () => {
      const board = new Board({ name: 'Test Board' });
      
      expect(board.id).toBeDefined();
      expect(board.name).toBe('Test Board');
      expect(board.description).toBe('');
      expect(board.color).toBe('#6750a4');
      expect(board.tasks).toEqual([]);
      expect(board.archivedTasks).toEqual([]);
      expect(board.createdDate).toBeDefined();
      expect(board.lastModified).toBeDefined();
      expect(board.isArchived).toBe(false);
      expect(board.isDefault).toBe(false);
    });

    test('should create a board with all properties', () => {
      const boardData = {
        id: 'test-board-id',
        name: 'Project Board',
        description: 'Board for project tasks',
        color: '#ff5722',
        tasks: [{ id: 'task-1', text: 'Task 1', status: 'todo' }],
        archivedTasks: [{ id: 'task-2', text: 'Task 2', status: 'done' }],
        createdDate: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-02T00:00:00.000Z',
        isArchived: true,
        isDefault: true
      };

      const board = new Board(boardData);
      
      expect(board.id).toBe('test-board-id');
      expect(board.name).toBe('Project Board');
      expect(board.description).toBe('Board for project tasks');
      expect(board.color).toBe('#ff5722');
      expect(board.tasks).toHaveLength(1);
      expect(board.archivedTasks).toHaveLength(1);
      expect(board.isArchived).toBe(true);
      expect(board.isDefault).toBe(true);
    });

    test('should throw error for empty name', () => {
      expect(() => new Board({ name: '' })).toThrow('Board name is required');
    });

    test('should throw error for name exceeding 50 characters', () => {
      const longName = 'a'.repeat(51);
      expect(() => new Board({ name: longName })).toThrow('Board name cannot exceed 50 characters');
    });

    test('should throw error for description exceeding 200 characters', () => {
      const longDescription = 'a'.repeat(201);
      expect(() => new Board({ name: 'Test', description: longDescription })).toThrow('Board description cannot exceed 200 characters');
    });

    test('should throw error for invalid color format', () => {
      expect(() => new Board({ name: 'Test', color: 'invalid-color' })).toThrow('Board color must be a valid hex color');
    });

    test('should accept valid hex colors', () => {
      expect(() => new Board({ name: 'Test', color: '#ff0000' })).not.toThrow();
      expect(() => new Board({ name: 'Test', color: '#FF0000' })).not.toThrow();
      expect(() => new Board({ name: 'Test', color: '#f00' })).not.toThrow();
    });

    test('should throw error for invalid isArchived type', () => {
      expect(() => new Board({ name: 'Test', isArchived: 'true' })).toThrow('isArchived must be a boolean');
    });

    test('should throw error for invalid isDefault type', () => {
      expect(() => new Board({ name: 'Test', isDefault: 'false' })).toThrow('isDefault must be a boolean');
    });
  });

  describe('Business Logic Methods', () => {
    let board;

    beforeEach(() => {
      board = new Board({ name: 'Test Board' });
    });

    test('should update board properties', () => {
      const updates = { name: 'Updated Board', description: 'New description' };
      const updatedBoard = board.update(updates);
      
      expect(updatedBoard.name).toBe('Updated Board');
      expect(updatedBoard.description).toBe('New description');
      expect(updatedBoard.lastModified).not.toBe(board.lastModified);
    });

    test('should archive board', () => {
      const archivedBoard = board.archive();
      
      expect(archivedBoard.isArchived).toBe(true);
      expect(archivedBoard.lastModified).not.toBe(board.lastModified);
    });

    test('should unarchive board', () => {
      const archivedBoard = board.archive();
      const unarchivedBoard = archivedBoard.unarchive();
      
      expect(unarchivedBoard.isArchived).toBe(false);
    });

    test('should duplicate board', () => {
      board.tasks = [
        { id: 'task-1', text: 'Task 1', status: 'todo' },
        { id: 'task-2', text: 'Task 2', status: 'done' }
      ];

      const duplicatedBoard = board.duplicate('Duplicated Board');
      
      expect(duplicatedBoard.id).not.toBe(board.id);
      expect(duplicatedBoard.name).toBe('Duplicated Board');
      expect(duplicatedBoard.tasks).toHaveLength(2);
      expect(duplicatedBoard.tasks[0].id).not.toBe(board.tasks[0].id);
      expect(duplicatedBoard.tasks[0].text).toBe(board.tasks[0].text);
    });

    test('should add task to board', () => {
      const task = new Task({ text: 'New task' });
      const updatedBoard = board.addTask(task);
      
      expect(updatedBoard.tasks).toHaveLength(1);
      expect(updatedBoard.tasks[0]).toBe(task);
    });

    test('should remove task from board', () => {
      const task = new Task({ text: 'Task to remove' });
      const boardWithTask = board.addTask(task);
      const boardWithoutTask = boardWithTask.removeTask(task.id);
      
      expect(boardWithoutTask.tasks).toHaveLength(0);
    });

    test('should get task by id', () => {
      const task = new Task({ text: 'Find me' });
      const boardWithTask = board.addTask(task);
      const foundTask = boardWithTask.getTask(task.id);
      
      expect(foundTask).toBe(task);
    });

    test('should get tasks by status', () => {
      const todoTask = new Task({ text: 'Todo task', status: 'todo' });
      const doingTask = new Task({ text: 'Doing task', status: 'doing' });
      const doneTask = new Task({ text: 'Done task', status: 'done' });
      
      const boardWithTasks = board
        .addTask(todoTask)
        .addTask(doingTask)
        .addTask(doneTask);
      
      expect(boardWithTasks.getTasksByStatus('todo')).toHaveLength(1);
      expect(boardWithTasks.getTasksByStatus('doing')).toHaveLength(1);
      expect(boardWithTasks.getTasksByStatus('done')).toHaveLength(1);
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      const board = new Board({ name: 'Test Board', description: 'Test description' });
      const json = board.toJSON();
      
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'Test Board');
      expect(json).toHaveProperty('description', 'Test description');
      expect(json).toHaveProperty('color');
      expect(json).toHaveProperty('tasks');
      expect(json).toHaveProperty('createdDate');
      expect(json).toHaveProperty('lastModified');
      expect(json).toHaveProperty('isArchived');
      expect(json).toHaveProperty('isDefault');
    });

    test('should create board from JSON', () => {
      const boardData = {
        id: 'test-board-id',
        name: 'Test Board',
        description: 'Test description',
        color: '#ff5722',
        tasks: [],
        archivedTasks: [],
        createdDate: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-02T00:00:00.000Z',
        isArchived: false,
        isDefault: false
      };

      const board = Board.fromJSON(boardData);
      
      expect(board).toBeInstanceOf(Board);
      expect(board.id).toBe('test-board-id');
      expect(board.name).toBe('Test Board');
    });
  });
});

describe('Factory Functions', () => {
  describe('createTask', () => {
    test('should create task with text only', () => {
      const task = createTask('Test task');
      
      expect(task).toBeInstanceOf(Task);
      expect(task.text).toBe('Test task');
      expect(task.status).toBe('todo');
    });

    test('should create task with options', () => {
      const task = createTask('Test task', { status: 'doing' });
      
      expect(task.text).toBe('Test task');
      expect(task.status).toBe('doing');
    });

    test('should validate task creation', () => {
      expect(() => createTask('')).toThrow('Task text is required');
      expect(() => createTask('Test', { status: 'invalid' })).toThrow();
    });
  });

  describe('createBoard', () => {
    test('should create board with name only', () => {
      const board = createBoard('Test Board');
      
      expect(board).toBeInstanceOf(Board);
      expect(board.name).toBe('Test Board');
      expect(board.tasks).toEqual([]);
    });

    test('should create board with options', () => {
      const board = createBoard('Test Board', { 
        description: 'Test description',
        color: '#ff5722'
      });
      
      expect(board.name).toBe('Test Board');
      expect(board.description).toBe('Test description');
      expect(board.color).toBe('#ff5722');
    });

    test('should validate board creation', () => {
      expect(() => createBoard('')).toThrow('Board name is required');
      expect(() => createBoard('Test', { color: 'invalid' })).toThrow();
    });
  });
});

describe('Column Model', () => {
  describe('Constructor and Validation', () => {
    test('should create a column with default values', () => {
      const column = new Column();
      
      expect(column.id).toBe('todo');
      expect(column.name).toBeDefined();
      expect(column.status).toBe('todo');
      expect(column.tasks).toEqual([]);
      expect(column.limit).toBeNull();
      expect(column.color).toBeDefined();
    });

    test('should create a column with custom data', () => {
      const columnData = {
        id: 'custom-id',
        name: 'Custom Column',
        status: 'doing',
        limit: 5,
        color: '#ff5722'
      };

      const column = new Column(columnData);
      
      expect(column.id).toBe('custom-id');
      expect(column.name).toBe('Custom Column');
      expect(column.status).toBe('doing');
      expect(column.limit).toBe(5);
      expect(column.color).toBe('#ff5722');
    });
  });

  describe('Business Logic Methods', () => {
    let column;

    beforeEach(() => {
      column = new Column({ id: 'todo', name: 'Test Column', status: 'todo' });
    });

    test('should add task to column', () => {
      const task = new Task({ text: 'Test task' });
      column.addTask(task);
      
      expect(column.tasks).toHaveLength(1);
      expect(column.tasks[0]).toBe(task);
    });

    test('should remove task from column', () => {
      const task = new Task({ text: 'Test task' });
      column.addTask(task);
      column.removeTask(task.id);
      
      expect(column.tasks).toHaveLength(0);
    });

    test('should get task by id', () => {
      const task = new Task({ text: 'Test task' });
      column.addTask(task);
      
      const foundTask = column.getTask(task.id);
      expect(foundTask).toBe(task);
    });

    test('should check if column is full', () => {
      column.limit = 2;
      expect(column.getTaskCount()).toBe(0);
      
      const task1 = new Task({ text: 'Task 1' });
      const task2 = new Task({ text: 'Task 2' });
      column.addTask(task1);
      column.addTask(task2);
      
      expect(column.getTaskCount()).toBe(2);
    });

    test('should get task count', () => {
      expect(column.getTaskCount()).toBe(0);
      
      const task = new Task({ text: 'Task 1' });
      column.addTask(task);
      expect(column.getTaskCount()).toBe(1);
    });

    test('should throw error when adding non-Task object', () => {
      expect(() => column.addTask({ id: 'task-1', text: 'Not a Task' })).toThrow('Task must be an instance of Task class');
    });

    test('should return false when column is full', () => {
      column.limit = 1;
      const task1 = new Task({ text: 'Task 1' });
      const task2 = new Task({ text: 'Task 2' });
      
      const result1 = column.addTask(task1);
      const result2 = column.addTask(task2);
      
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(column.tasks).toHaveLength(1);
    });

    test('should handle removing non-existent task', () => {
      expect(() => column.removeTask('non-existent')).not.toThrow();
      expect(column.tasks).toHaveLength(0);
    });

    test('should return null for non-existent task', () => {
      const foundTask = column.getTask('non-existent');
      expect(foundTask).toBeNull();
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      const column = new Column({ id: 'test', name: 'Test Column' });
      const json = column.toJSON();
      
      expect(json).toHaveProperty('id', 'test');
      expect(json).toHaveProperty('name', 'Test Column');
      expect(json).toHaveProperty('taskCount', 0);
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('limit');
      expect(json).toHaveProperty('color');
    });

    test('should create column from JSON', () => {
      const columnData = {
        id: 'test-id',
        name: 'Test Column',
        status: 'doing',
        limit: 5,
        color: '#ff5722'
      };

      const column = Column.fromJSON(columnData);
      
      expect(column).toBeInstanceOf(Column);
      expect(column.id).toBe('test-id');
      expect(column.name).toBe('Test Column');
      expect(column.status).toBe('doing');
      expect(column.limit).toBe(5);
      expect(column.color).toBe('#ff5722');
    });
  });
});

describe('Factory Functions', () => {
  describe('createColumn', () => {
    test('should create column with data', () => {
      const column = createColumn({ id: 'test', name: 'Test Column' });
      
      expect(column).toBeInstanceOf(Column);
      expect(column.id).toBe('test');
      expect(column.name).toBe('Test Column');
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  test('should handle null/undefined inputs gracefully', () => {
    expect(() => new Task()).toThrow();
    expect(() => new Task(null)).toThrow();
    expect(() => new Task({})).toThrow();
    
    expect(() => new Board()).toThrow();
    expect(() => new Board(null)).toThrow();
    expect(() => new Board({})).toThrow();
  });

  test('should handle malformed data', () => {
    expect(() => new Task({ text: 123 })).toThrow();
    expect(() => new Task({ text: 'Test', status: 123 })).toThrow();
    
    expect(() => new Board({ name: 123 })).toThrow();
    expect(() => new Board({ name: 'Test', isArchived: 'not-boolean' })).toThrow();
  });

  test('should preserve immutability', () => {
    const task = new Task({ text: 'Original task' });
    const updatedTask = task.update({ text: 'Updated task' });
    
    expect(task.text).toBe('Original task');
    expect(updatedTask.text).toBe('Updated task');
    expect(task).not.toBe(updatedTask);
  });

  test('should generate unique IDs', () => {
    const task1 = new Task({ text: 'Task 1' });
    const task2 = new Task({ text: 'Task 2' });
    const board1 = new Board({ name: 'Board 1' });
    const board2 = new Board({ name: 'Board 2' });
    
    expect(task1.id).not.toBe(task2.id);
    expect(board1.id).not.toBe(board2.id);
    expect(task1.id).not.toBe(board1.id);
  });

  test('should handle crypto.randomUUID fallback', () => {
    // Mock crypto to be undefined to test fallback
    const originalCrypto = global.crypto;
    global.crypto = undefined;
    
    const task = new Task({ text: 'Fallback test' });
    expect(task.id).toBeDefined();
    expect(typeof task.id).toBe('string');
    expect(task.id.length).toBeGreaterThan(0);
    
    // Restore crypto
    global.crypto = originalCrypto;
  });
});