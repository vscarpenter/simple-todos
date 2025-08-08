/**
 * Simplified CascadeApp Unit Tests
 * Basic testing of core functionality without complex mocking
 */

import { jest } from '@jest/globals';

describe('CascadeApp Simple Tests', () => {
  let app;
  
  beforeEach(async () => {
    // Clear any storage before each test
    localStorage.clear(); // For test mocks only
    
    // Import and create new app instance
    const { default: CascadeApp } = await import('scripts/modules/main.js');
    app = new CascadeApp();
  });

  describe('Basic Functionality', () => {
    test('should initialize successfully', () => {
      expect(app).toBeDefined();
      expect(app.state).toBeDefined();
      expect(app.storage).toBeDefined();
      expect(app.dom).toBeDefined();
      expect(app.eventBus).toBeDefined();
    });

    test('should have core methods available', () => {
      expect(typeof app.saveData).toBe('function');
      expect(typeof app.render).toBe('function');
      expect(typeof app.createTask).toBe('function');
      expect(typeof app.getTasks).toBe('function');
      expect(typeof app.getState).toBe('function');
      expect(typeof app.handleError).toBe('function');
    });

    test('should get initial state', () => {
      const state = app.getState();
      expect(state).toBeDefined();
      expect(state.boards).toBeDefined();
      expect(Array.isArray(state.boards)).toBe(true);
    });

    test('should get tasks from current board', () => {
      const tasks = app.getTasks();
      expect(Array.isArray(tasks)).toBe(true);
    });

    test('should handle createTask method', () => {
      // Create a new task with unique text to avoid conflicts
      const uniqueTaskText = `Test task for Jest ${Date.now()}`;
      
      // Get initial tasks
      const initialTasks = app.getTasks();
      const initialCount = initialTasks.length;
      
      // Check that our test task doesn't already exist
      const existingTestTask = initialTasks.find(task => task.text === uniqueTaskText);
      expect(existingTestTask).toBeUndefined();
      
      // Create the new task
      app.createTask(uniqueTaskText);
      
      // Get updated tasks
      const newTasks = app.getTasks();
      
      // Check that the new task exists (regardless of how many tasks were there initially)
      const newTask = newTasks.find(task => task.text === uniqueTaskText);
      expect(newTask).toBeDefined();
      expect(newTask.status).toBe('todo');
      expect(newTask.id).toBeDefined();
      expect(newTask.createdDate).toBeDefined();
      
      // Verify task count increased
      expect(newTasks.length).toBeGreaterThan(initialCount);
    });

    test('should validate board data correctly', () => {
      // Valid board
      const validBoard = {
        id: 'test-board-1',
        name: 'Test Board',
        tasks: []
      };
      
      const validResult = app.validateBoardData(validBoard);
      expect(validResult.isValid).toBe(true);
      
      // Invalid board - missing name
      const invalidBoard = {
        id: 'test-board-2',
        tasks: []
      };
      
      const invalidResult = app.validateBoardData(invalidBoard);
      expect(invalidResult.isValid).toBe(false);
    });

    test('should handle error logging', () => {
      // Mock console.error to check if it's called
      const originalError = console.error;
      console.error = jest.fn();
      
      app.handleError('Test error message', new Error('Test error'));
      
      expect(console.error).toHaveBeenCalled();
      
      // Restore original console.error
      console.error = originalError;
    });
  });

  describe('Data Validation', () => {
    test('should validate import data structure', () => {
      const validData = {
        data: {
          boards: [{
            id: 'board-1',
            name: 'Test Board',
            tasks: [{
              id: 'task-1',
              text: 'Test task',
              status: 'todo',
              createdDate: new Date().toISOString()
            }]
          }]
        }
      };
      
      const result = app.validateImportData(validData);
      expect(result.isValid).toBe(true);
      expect(result.boards).toBeDefined();
      expect(result.boards.length).toBe(1);
    });

    test('should reject invalid import data', () => {
      const invalidData = {
        invalid: 'structure'
      };
      
      const result = app.validateImportData(invalidData);
      expect(result.isValid).toBe(false);
    });
  });
});