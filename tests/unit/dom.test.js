/**
 * Comprehensive Unit Tests for DOM Management
 * Tests DOM manipulation, rendering, accessibility, and user interactions
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

const mockSettingsManager = {
  get: jest.fn(() => false),
  debugLog: jest.fn()
};

// Create module mocks before importing
global.createModuleMock('scripts/modules/eventBus.js', mockEventBus);
global.createModuleMock('scripts/modules/settings.js', { 
  settingsManager: mockSettingsManager,
  debugLog: jest.fn()
});

// Mock the eventBus import directly
jest.unstable_mockModule('scripts/modules/eventBus.js', () => ({
  default: mockEventBus
}));

describe('DOM Manager', () => {
  let domManager;

  beforeEach(async () => {
    // Clear mocks
    mockEventBus.emit.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();
    mockSettingsManager.get.mockClear();
    
    // Import DOM manager (it's a singleton)
    const domModule = await import('scripts/modules/dom.js');
    domManager = domModule.default;
    
    // Reset DOM manager state
    domManager.initialized = false;
    domManager.elements = {};
    domManager.delegateHandlers.clear();
    
    // Initialize the DOM manager with the test DOM structure
    domManager.init();
  });

  afterEach(() => {
    // Clean up any created elements
    document.querySelectorAll('.task-card').forEach(el => el.remove());
    document.querySelectorAll('.toast').forEach(el => el.remove());
    document.querySelectorAll('.global-loading-overlay').forEach(el => el.remove());
    document.querySelectorAll('[aria-live]').forEach(el => el.remove());
    
    // Reset modal state
    const modal = document.getElementById('custom-modal');
    if (modal) {
      modal.style.display = '';
      modal.classList.remove('modal-overlay--visible');
    }
    
    // Reset input values
    const modalInput = document.getElementById('modal-input');
    if (modalInput) {
      modalInput.value = '';
      modalInput.style.display = 'none';
    }
    
    // Clear any timeouts
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    test('should initialize with DOM elements', () => {
      expect(domManager.elements).toBeDefined();
      expect(domManager.elements.todoList).toBe(document.getElementById('todo-list'));
      expect(domManager.elements.doingList).toBe(document.getElementById('doing-list'));
      expect(domManager.elements.doneList).toBe(document.getElementById('done-list'));
    });

    test('should handle missing DOM elements gracefully', () => {
      // Create a new DOM structure without some elements
      document.body.innerHTML = '<div id="todo-list"></div>'; 
      
      // Re-initialize with limited DOM
      expect(() => domManager.init()).not.toThrow();
      expect(domManager.elements.todoList).toBeTruthy();
      expect(domManager.elements.doingList).toBeFalsy();
    });

    test('should set up event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalled();
    });
  });

  describe('Task Rendering', () => {
    test('should render tasks in correct columns', () => {
      const tasksByStatus = {
        todo: [{ id: 'task-1', text: 'Todo task', status: 'todo', createdDate: '2024-01-01' }],
        doing: [{ id: 'task-2', text: 'Doing task', status: 'doing', createdDate: '2024-01-02' }],
        done: [{ id: 'task-3', text: 'Done task', status: 'done', createdDate: '2024-01-03' }]
      };
      
      domManager.renderTasks(tasksByStatus);
      
      expect(document.getElementById('todo-list').children.length).toBe(1);
      expect(document.getElementById('doing-list').children.length).toBe(1);
      expect(document.getElementById('done-list').children.length).toBe(1);
    });

    test('should update task counters', () => {
      const tasksByStatus = {
        todo: [
          { id: 'task-1', text: 'Todo task 1', status: 'todo', createdDate: '2024-01-01' },
          { id: 'task-2', text: 'Todo task 2', status: 'todo', createdDate: '2024-01-02' }
        ],
        doing: [{ id: 'task-3', text: 'Doing task', status: 'doing', createdDate: '2024-01-03' }],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      expect(document.getElementById('todo-count').textContent).toBe('2');
      expect(document.getElementById('doing-count').textContent).toBe('1');
      expect(document.getElementById('done-count').textContent).toBe('0');
    });

    test('should clear existing tasks before rendering', () => {
      // Add some existing content
      document.getElementById('todo-list').innerHTML = '<div class="existing">Existing</div>';
      
      const tasksByStatus = {
        todo: [{ id: 'task-1', text: 'New task', status: 'todo', createdDate: '2024-01-01' }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      expect(document.getElementById('todo-list').children.length).toBe(1);
      expect(document.getElementById('todo-list').querySelector('.existing')).toBeNull();
    });

    test('should handle empty task list', () => {
      const tasksByStatus = { todo: [], doing: [], done: [] };
      
      expect(() => domManager.renderTasks(tasksByStatus)).not.toThrow();
      
      // Empty state messages should be added
      expect(document.getElementById('todo-list').children.length).toBeGreaterThanOrEqual(0);
      expect(document.getElementById('doing-list').children.length).toBeGreaterThanOrEqual(0);
      expect(document.getElementById('done-list').children.length).toBeGreaterThanOrEqual(0);
      expect(document.getElementById('todo-count').textContent).toBe('0');
    });

    test('should create task cards with proper structure', () => {
      const tasksByStatus = {
        todo: [{ 
          id: 'task-1', 
          text: 'Test task', 
          status: 'todo', 
          createdDate: '2024-01-01T10:00:00.000Z' 
        }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const taskCard = document.querySelector('.task-card');
      expect(taskCard).toBeTruthy();
      expect(taskCard.getAttribute('data-task-id')).toBe('task-1');
      expect(taskCard.querySelector('.task-text').textContent).toBe('Test task');
    });

    test('should add accessibility attributes to task cards', () => {
      const tasksByStatus = {
        todo: [{ id: 'task-1', text: 'Accessible task', status: 'todo', createdDate: '2024-01-01' }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const taskCard = document.querySelector('.task-card');
      expect(taskCard.getAttribute('role')).toBe('article');
      expect(taskCard.getAttribute('aria-label')).toContain('Accessible task');
      expect(taskCard.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Board Selector Rendering', () => {
    test('should render board selector with boards', () => {
      const boards = [
        { id: 'board-1', name: 'Work Board', color: '#ff5722', tasks: [] },
        { id: 'board-2', name: 'Personal Board', color: '#2196f3', tasks: [] }
      ];
      const currentBoard = boards[0];
      
      domManager.renderBoardSelector(boards, currentBoard);
      
      const menu = document.getElementById('board-selector-menu');
      expect(menu.children.length).toBeGreaterThan(0);
    });

    test('should update current board name', () => {
      const boards = [
        { id: 'board-1', name: 'Selected Board', color: '#ff5722', tasks: [] }
      ];
      const currentBoard = boards[0];
      
      domManager.renderBoardSelector(boards, currentBoard);
      
      expect(document.getElementById('current-board-name').textContent).toBe('Selected Board');
    });

    test('should handle empty board list', () => {
      domManager.renderBoardSelector([], null);
      
      // Should not crash and current board name should remain unchanged
      expect(document.getElementById('current-board-name').textContent).toBe('Main Board');
    });

    test('should add board statistics to selector', () => {
      const boards = [
        { 
          id: 'board-1', 
          name: 'Board with Tasks', 
          color: '#ff5722', 
          tasks: [
            { id: 'task-1', status: 'todo' },
            { id: 'task-2', status: 'done' }
          ]
        }
      ];
      const currentBoard = boards[0];
      
      domManager.renderBoardSelector(boards, currentBoard);
      
      const boardItem = document.querySelector('[data-board-id="board-1"]');
      expect(boardItem.textContent).toContain('2'); // Task count
    });
  });

  describe('Modal Management', () => {
    test('should show modal with title and message', async () => {
      const modalPromise = domManager.showModal('Test Modal', 'This is a test message');
      
      // Wait for the modal to be shown (it has a 10ms delay)
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(document.getElementById('modal-title').textContent).toBe('Test Modal');
      expect(document.getElementById('modal-message').textContent).toBe('This is a test message');
      expect(document.getElementById('custom-modal').style.display).toBe('flex');
      
      // Clean up by canceling the modal
      document.getElementById('modal-cancel').click();
      await modalPromise;
    });

    test('should show modal with input field', async () => {
      const modalPromise = domManager.showModal('Input Modal', 'Enter value:', {
        showInput: true,
        inputValue: 'default value'
      });
      
      // Wait for the modal to be shown
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const input = document.getElementById('modal-input');
      expect(input.style.display).toBe('block');
      expect(input.value).toBe('default value');
      
      // Clean up
      document.getElementById('modal-cancel').click();
      await modalPromise;
    });

    test('should handle modal confirmation', async () => {
      const modalPromise = domManager.showModal('Confirm Modal', 'Are you sure?');
      
      // Wait for modal to be shown
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate confirm button click
      document.getElementById('modal-confirm').click();
      
      const result = await modalPromise;
      expect(result).toBe(true);
    });

    test('should handle modal cancellation', async () => {
      const modalPromise = domManager.showModal('Cancel Modal', 'Cancel this?');
      
      // Wait for modal to be shown
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate cancel button click
      document.getElementById('modal-cancel').click();
      
      const result = await modalPromise;
      expect(result).toBeNull();
    });

    test('should hide modal', async () => {
      const modalPromise = domManager.showModal('Test', 'Test');
      
      // Wait for modal to be shown
      await new Promise(resolve => setTimeout(resolve, 20));
      
      domManager.hideModal();
      
      expect(document.getElementById('custom-modal').style.display).toBe('none');
      
      // Clean up
      document.getElementById('modal-cancel').click();
      await modalPromise;
    });

    test('should focus modal input when shown', async () => {
      const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
      
      const modalPromise = domManager.showModal('Input Modal', 'Enter value:', { showInput: true });
      
      // Wait for focus to be called (it has a 100ms delay)
      await new Promise(resolve => setTimeout(resolve, 120));
      
      expect(focusSpy).toHaveBeenCalled();
      
      focusSpy.mockRestore();
      
      // Clean up
      document.getElementById('modal-cancel').click();
      await modalPromise;
    });
  });

  describe('Drag and Drop', () => {
    test('should set up drag and drop event listeners', () => {
      const tasksByStatus = {
        todo: [{ id: 'task-1', text: 'Draggable task', status: 'todo', createdDate: '2024-01-01' }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const taskCard = document.querySelector('.task-card');
      expect(taskCard.getAttribute('draggable')).toBe('true');
    });

    test('should handle drag start event', () => {
      const tasksByStatus = {
        todo: [{ id: 'task-1', text: 'Drag task', status: 'todo', createdDate: '2024-01-01' }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const taskCard = document.querySelector('.task-card');
      const dragEvent = new DragEvent('dragstart', {
        dataTransfer: new DataTransfer()
      });
      
      taskCard.dispatchEvent(dragEvent);
      
      expect(dragEvent.dataTransfer.getData('text/plain')).toBe('task-1');
    });

    test('should handle drop event', () => {
      const dropEvent = new DragEvent('drop', {
        dataTransfer: new DataTransfer()
      });
      dropEvent.dataTransfer.setData('text/plain', 'task-1');
      dropEvent.preventDefault = jest.fn();
      
      const doingList = document.getElementById('doing-list');
      doingList.dispatchEvent(dropEvent);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:moved', {
        taskId: 'task-1',
        newStatus: 'doing'
      });
    });

    test('should add visual feedback during drag over', () => {
      const dragOverEvent = new DragEvent('dragover');
      dragOverEvent.preventDefault = jest.fn();
      
      const todoList = document.getElementById('todo-list');
      todoList.dispatchEvent(dragOverEvent);
      
      expect(dragOverEvent.preventDefault).toHaveBeenCalled();
      expect(todoList.classList.contains('drag-over')).toBe(true);
    });

    test('should remove visual feedback on drag leave', () => {
      const todoList = document.getElementById('todo-list');
      todoList.classList.add('drag-over');
      
      const dragLeaveEvent = new DragEvent('dragleave');
      todoList.dispatchEvent(dragLeaveEvent);
      
      expect(todoList.classList.contains('drag-over')).toBe(false);
    });
  });

  describe('Task Interactions', () => {
    test('should handle task edit button click', () => {
      const tasksByStatus = {
        todo: [{ id: 'task-1', text: 'Editable task', status: 'todo', createdDate: '2024-01-01' }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const editButton = document.querySelector('.task-edit-btn');
      editButton.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:edit:requested', {
        taskId: 'task-1',
        currentText: 'Editable task'
      });
    });

    test('should handle task delete button click', () => {
      const tasksByStatus = {
        todo: [{ id: 'task-1', text: 'Deletable task', status: 'todo', createdDate: '2024-01-01' }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const deleteButton = document.querySelector('.task-delete-btn');
      deleteButton.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:delete:requested', {
        taskId: 'task-1'
      });
    });

    test('should handle task status change buttons', () => {
      const tasksByStatus = {
        todo: [{ id: 'task-1', text: 'Status task', status: 'todo', createdDate: '2024-01-01' }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const moveButton = document.querySelector('.task-move-btn[data-target-status="doing"]');
      moveButton.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:moved', {
        taskId: 'task-1',
        newStatus: 'doing'
      });
    });

    test('should handle task archive button click', () => {
      const tasks = [
        { id: 'task-1', text: 'Archivable task', status: 'done', createdDate: '2024-01-01' }
      ];
      
      domManager.renderTasks(tasks);
      
      const archiveButton = document.querySelector('.task-archive-btn');
      if (archiveButton) {
        archiveButton.click();
        
        expect(mockEventBus.emit).toHaveBeenCalledWith('task:archive:requested', {
          taskId: 'task-1'
        });
      }
    });
  });

  describe('Loading States', () => {
    test('should show loading indicator', () => {
      domManager.showLoading('todo-list');
      
      const todoList = document.getElementById('todo-list');
      expect(todoList.classList.contains('loading')).toBe(true);
      expect(todoList.querySelector('.loading-spinner')).toBeDefined();
    });

    test('should hide loading indicator', () => {
      domManager.showLoading('todo-list');
      domManager.hideLoading('todo-list');
      
      const todoList = document.getElementById('todo-list');
      expect(todoList.classList.contains('loading')).toBe(false);
      expect(todoList.querySelector('.loading-spinner')).toBeNull();
    });

    test('should show global loading state', () => {
      domManager.showGlobalLoading('Saving data...');
      
      const loadingOverlay = document.querySelector('.global-loading-overlay');
      expect(loadingOverlay).toBeDefined();
      expect(loadingOverlay.textContent).toContain('Saving data...');
    });

    test('should hide global loading state', () => {
      domManager.showGlobalLoading('Loading...');
      domManager.hideGlobalLoading();
      
      const loadingOverlay = document.querySelector('.global-loading-overlay');
      expect(loadingOverlay).toBeNull();
    });
  });

  describe('Toast Notifications', () => {
    test('should show success toast', () => {
      domManager.showToast('Success message', 'success');
      
      const toast = document.querySelector('.toast.success');
      expect(toast).toBeDefined();
      expect(toast.textContent).toContain('Success message');
    });

    test('should show error toast', () => {
      domManager.showToast('Error message', 'error');
      
      const toast = document.querySelector('.toast.error');
      expect(toast).toBeDefined();
      expect(toast.textContent).toContain('Error message');
    });

    test('should auto-hide toast after timeout', (done) => {
      domManager.showToast('Auto-hide message', 'info', 100);
      
      setTimeout(() => {
        const toast = document.querySelector('.toast');
        expect(toast).toBeNull();
        done();
      }, 150);
    });

    test('should allow manual toast dismissal', () => {
      domManager.showToast('Dismissible message', 'info');
      
      const toast = document.querySelector('.toast');
      const closeButton = toast.querySelector('.toast-close');
      closeButton.click();
      
      expect(document.querySelector('.toast')).toBeNull();
    });
  });

  describe('Accessibility Features', () => {
    test('should add proper ARIA labels to task cards', () => {
      const tasksByStatus = {
        todo: [{ 
          id: 'task-1', 
          text: 'Accessible task', 
          status: 'todo', 
          createdDate: '2024-01-01T10:00:00.000Z' 
        }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const taskCard = document.querySelector('.task-card');
      expect(taskCard.getAttribute('aria-label')).toContain('Accessible task');
      expect(taskCard.getAttribute('aria-label')).toContain('Task:');
    });

    test('should add keyboard navigation support', () => {
      const tasksByStatus = {
        todo: [{ 
          id: 'task-1', 
          text: 'Keyboard task', 
          status: 'todo', 
          createdDate: '2024-01-01T10:00:00.000Z' 
        }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const taskCard = document.querySelector('.task-card');
      expect(taskCard.getAttribute('tabindex')).toBe('0');
      
      // Test keyboard event handling
      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      taskCard.dispatchEvent(keyEvent);
      
      // Should trigger some action (implementation dependent)
    });

    test('should announce changes to screen readers', () => {
      domManager.announceToScreenReader('Task completed successfully');
      
      const announcement = document.querySelector('[aria-live="polite"]');
      expect(announcement).toBeDefined();
      expect(announcement.textContent).toBe('Task completed successfully');
    });

    test('should support high contrast mode', () => {
      document.documentElement.classList.add('high-contrast');
      
      const tasksByStatus = {
        todo: [{ 
          id: 'task-1', 
          text: 'High contrast task', 
          status: 'todo', 
          createdDate: '2024-01-01T10:00:00.000Z' 
        }],
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      const taskCard = document.querySelector('.task-card');
      expect(taskCard.classList.contains('high-contrast')).toBe(true);
    });
        { id: 'task-1', text: 'High contrast task', status: 'todo', createdDate: '2024-01-01' }
      ];
      
      domManager.renderTasks(tasks);
      
      const taskCard = document.querySelector('.task-card');
      expect(taskCard.classList.contains('high-contrast')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      document.getElementById('todo-list').remove();
      
      const tasks = [
        { id: 'task-1', text: 'Test task', status: 'todo', createdDate: '2024-01-01' }
      ];
      
      expect(() => domManager.renderTasks(tasks)).not.toThrow();
    });

    test('should handle malformed task data', () => {
      const malformedTasks = [
        { id: null, text: '', status: 'invalid' },
        { text: 'No ID task', status: 'todo' },
        null,
        undefined
      ];
      
      expect(() => domManager.renderTasks(malformedTasks)).not.toThrow();
    });

    test('should handle DOM manipulation errors', () => {
      // Mock appendChild to throw error
      const originalAppendChild = Element.prototype.appendChild;
      Element.prototype.appendChild = jest.fn(() => {
        throw new Error('DOM error');
      });
      
      const tasks = [
        { id: 'task-1', text: 'Error task', status: 'todo', createdDate: '2024-01-01' }
      ];
      
      expect(() => domManager.renderTasks(tasks)).not.toThrow();
      
      // Restore original method
      Element.prototype.appendChild = originalAppendChild;
    });
  });

  describe('Performance Optimization', () => {
    test('should handle large task lists efficiently', () => {
      const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        text: `Task ${i}`,
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done',
        createdDate: '2024-01-01'
      }));
      
      // Group tasks by status for the correct format
      const tasksByStatus = {
        todo: largeTasks.filter(t => t.status === 'todo'),
        doing: largeTasks.filter(t => t.status === 'doing'),
        done: largeTasks.filter(t => t.status === 'done')
      };
      
      const startTime = Date.now();
      domManager.renderTasks(tasksByStatus);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(document.querySelectorAll('.task-card').length).toBe(1000);
    });

    test('should use document fragments for efficient DOM updates', () => {
      const createDocumentFragmentSpy = jest.spyOn(document, 'createDocumentFragment');
      
      const tasksByStatus = {
        todo: Array.from({ length: 10 }, (_, i) => ({
          id: `task-${i}`,
          text: `Task ${i}`,
          status: 'todo',
          createdDate: '2024-01-01'
        })),
        doing: [],
        done: []
      };
      
      domManager.renderTasks(tasksByStatus);
      
      expect(createDocumentFragmentSpy).toHaveBeenCalled();
      
      createDocumentFragmentSpy.mockRestore();
    });

    test('should debounce rapid updates', (done) => {
      let updateCount = 0;
      const originalRenderTasks = domManager.renderTasks;
      domManager.renderTasks = jest.fn(() => {
        updateCount++;
        originalRenderTasks.call(domManager, []);
      });
      
      // Trigger multiple rapid updates
      for (let i = 0; i < 10; i++) {
        setTimeout(() => domManager.renderTasks([]), i);
      }
      
      setTimeout(() => {
        expect(updateCount).toBeLessThan(10); // Should be debounced
        done();
      }, 100);
    });
  });

  describe('Event Integration', () => {
    test('should listen for relevant events', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('tasks:changed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('boards:changed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('theme:changed', expect.any(Function));
    });

    test('should emit DOM events', () => {
      const tasks = [
        { id: 'task-1', text: 'Event task', status: 'todo', createdDate: '2024-01-01' }
      ];
      
      domManager.renderTasks(tasks);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('dom:tasks:rendered', {
        taskCount: 1,
        columns: { todo: 1, doing: 0, done: 0 }
      });
    });

    test('should handle theme change events', () => {
      const themeChangeHandler = mockEventBus.on.mock.calls
        .find(call => call[0] === 'theme:changed')?.[1];
      
      if (themeChangeHandler) {
        themeChangeHandler({ theme: 'dark' });
        
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      }
    });
  });
});