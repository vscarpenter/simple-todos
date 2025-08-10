/**
 * Unit Tests for DOM Manager
 * Tests low-level DOM utilities and event delegation.
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
};

// Mock the eventBus import directly
jest.unstable_mockModule('scripts/modules/eventBus.js', () => ({
  default: mockEventBus
}));

// Mock utility for drag events
class MockDataTransfer {
  constructor() {
    this.data = {};
  }
  setData(format, data) {
    this.data[format] = data;
  }
  getData(format) {
    return this.data[format];
  }
}

class MockDragEvent extends Event {
    constructor(type, options) {
        super(type, options);
        this.dataTransfer = options.dataTransfer || new MockDataTransfer();
    }
}

describe('DOM Manager', () => {
  let domManager;

  beforeEach(async () => {
    // Set up a basic DOM structure for each test
    document.body.innerHTML = `
        <div id="todo-list" class="column-content" data-status="todo"></div>
        <div id="doing-list" class="column-content" data-status="doing"></div>
        <div id="done-list" class="column-content" data-status="done"></div>
        <div class="task-card" data-task-id="task-1"></div>
    `;

    jest.clearAllMocks();
    
    // Clear the eventBus mock
    mockEventBus.emit.mockClear();
    
    // Import DOM manager (it's a singleton)
    const domModule = await import('../../scripts/modules/dom.js');
    domManager = domModule.default;
    
    // Reset and initialize
    domManager.initialized = false;
    domManager.elements = {};
    domManager.delegateHandlers.clear();
    domManager.init();
  });

  describe('Initialization', () => {
    test('should cache elements on init', () => {
      expect(domManager.elements.todoList).toBeDefined();
      expect(domManager.elements.doingList).toBeDefined();
      expect(domManager.elements.doneList).toBeDefined();
    });

    test('should handle drag and drop events', () => {
        const todoList = document.getElementById('todo-list');
        const taskCard = document.querySelector('.task-card');

        // Simulate drag start
        const dataTransfer = new MockDataTransfer();
        const dragStartEvent = new MockDragEvent('dragstart', { bubbles: true, dataTransfer });
        taskCard.dispatchEvent(dragStartEvent);
        
        // Check that data was set in dataTransfer
        expect(dataTransfer.getData('text/plain')).toBe('task-1');
        expect(taskCard.classList.contains('dragging')).toBe(true);
        
        // Check that drag:start event was emitted
        expect(mockEventBus.emit).toHaveBeenCalledWith('drag:start', { 
            taskId: 'task-1', 
            element: taskCard 
        });

        // Simulate drag end
        const dragEndEvent = new MockDragEvent('dragend', { bubbles: true });
        taskCard.dispatchEvent(dragEndEvent);
        expect(taskCard.classList.contains('dragging')).toBe(false);

        // Simulate drop
        const dropEvent = new MockDragEvent('drop', { bubbles: true, dataTransfer });
        dropEvent.preventDefault = jest.fn();
        todoList.dispatchEvent(dropEvent);
        
        // Check that task:drop event was emitted
        expect(mockEventBus.emit).toHaveBeenCalledWith('task:drop', { 
            taskId: 'task-1', 
            targetStatus: 'todo' 
        });
    });
  });

  describe('Event Delegation Utility', () => {
    test('should delegate events correctly', () => {
        const handler = jest.fn();
        domManager.delegate('click', '.task-card', handler);

        const taskCard = document.querySelector('.task-card');
        const clickEvent = new MouseEvent('click', { bubbles: true });
        taskCard.dispatchEvent(clickEvent);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.any(Event), taskCard);
    });

    test('should not fire handler for non-matching elements', () => {
        const handler = jest.fn();
        domManager.delegate('click', '.non-existent', handler);

        const taskCard = document.querySelector('.task-card');
        taskCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
    });
  });
});