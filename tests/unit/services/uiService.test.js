/**
 * Unit Tests for UIService
 * Tests the DOM rendering and UI logic.
 */

import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock dependencies
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
};

// Mock the eventBus module
jest.mock('scripts/modules/eventBus.js', () => mockEventBus);

// Mock the domManager to avoid its complexities and focus on UIService logic
const mockDomManager = {
    init: jest.fn(),
    renderBoardSelector: jest.fn(),
    createTaskCard: jest.fn((task) => {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.textContent = task.text;
        div.dataset.taskId = task.id;
        return div;
    }),
};

// Import the service to be tested
const { UIService } = await import('../../scripts/modules/services/uiService.js');
const { createTask } = await import('../../../scripts/modules/models.js');

const setupDOM = () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="todo-list"></div>
        <div id="doing-list"></div>
        <div id="done-list"></div>
        <div id="todo-count">0</div>
        <div id="doing-count">0</div>
        <div id="done-count">0</div>
        <div id="current-board-name"></div>
        <div id="create-first-task" style="display: none;"></div>
      </body>
    </html>
  `);
  global.document = dom.window.document;
  global.window = dom.window;
};

describe('UIService', () => {
  let uiService;
  let mockState; // Declare mockState here

  beforeEach(() => {
    setupDOM();
    jest.clearAllMocks();

    // Create a fresh mockState for each test
    mockState = {
        getState: jest.fn(),
        setState: jest.fn(),
        getCurrentBoard: jest.fn(),
    };

    // Instantiate UIService with mockState and mockDomManager
    uiService = new UIService(mockState, mockDomManager);
  });

  describe('render', () => {
    test('should render tasks in their correct columns', () => {
      // Arrange
      const tasks = [
        createTask({ text: 'Task 1', status: 'todo' }),
        createTask({ text: 'Task 2', status: 'doing' }),
        createTask({ text: 'Task 3', status: 'done' }),
      ];
      mockState.getState.mockReturnValue({ tasks: tasks, boards: [{id: 'b1', tasks: tasks}], currentBoardId: 'b1' });

      // Act
      uiService.render();

      // Assert
      expect(document.getElementById('todo-list').children).toHaveLength(1);
      expect(document.getElementById('doing-list').children).toHaveLength(1);
      expect(document.getElementById('done-list').children).toHaveLength(1);
      expect(document.getElementById('todo-list').children[0].textContent).toBe('Task 1');
    });

    test('should update task counters correctly', () => {
        const tasks = [
            createTask({ text: 'Task 1', status: 'todo' }),
            createTask({ text: 'Task 2', status: 'todo' }),
            createTask({ text: 'Task 3', status: 'done' }),
        ];
        mockState.getState.mockReturnValue({ tasks: tasks, boards: [{id: 'b1', tasks: tasks}], currentBoardId: 'b1' });

        uiService.render();

        expect(document.getElementById('todo-count').textContent).toBe('2');
        expect(document.getElementById('doing-count').textContent).toBe('0');
        expect(document.getElementById('done-count').textContent).toBe('1');
    });

    test('should show empty state when there are no tasks', () => {
        mockState.getState.mockReturnValue({ tasks: [], boards: [{id: 'b1', tasks: []}], currentBoardId: 'b1' });
        const emptyStateSpy = jest.spyOn(uiService, 'showEmptyState');

        uiService.render();

        expect(emptyStateSpy).toHaveBeenCalled();
    });

    test('should update the board title', () => {
        const board = { id: 'board-1', name: 'My Awesome Board', tasks: [] };
        mockState.getState.mockReturnValue({ boards: [board], currentBoardId: 'board-1' });
        mockState.getCurrentBoard.mockReturnValue(board); // Mock getCurrentBoard

        uiService.render();

        expect(document.getElementById('current-board-name').textContent).toBe('My Awesome Board');
    });
  });

  describe('renderBoardSelector', () => {
    test('should call domManager to render the board selector', () => {
        const boards = [{ id: 'b1', name: 'Board 1' }];
        const currentBoard = boards[0];
        mockState.getState.mockReturnValue({ boards: boards, currentBoardId: 'b1' });
        mockState.getCurrentBoard.mockReturnValue(currentBoard); // Mock getCurrentBoard

        uiService.renderBoardSelector();

        expect(mockDomManager.renderBoardSelector).toHaveBeenCalledWith(boards, currentBoard);
    });
  });

  describe('Empty State', () => {
    test('should correctly display the empty state UI', () => {
        uiService.showEmptyState();

        const todoList = document.getElementById('todo-list');
        expect(todoList.querySelector('.empty-state')).not.toBeNull();
        expect(todoList.querySelector('.empty-message').textContent).toBe('No tasks yet');
        expect(uiService._showingEmptyState).toBe(true);
    });

    test('should hide the empty state UI', () => {
        uiService.showEmptyState(); // First show it
        uiService.hideEmptyState(); // Then hide it

        expect(uiService._showingEmptyState).toBe(false);
    });
  });

  describe('Event Listeners', () => {
    test('should set up event listeners on init', () => {
        uiService.init();
        expect(mockEventBus.on).toHaveBeenCalledWith('task:created', expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith('board:switched', expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith('filter:changed', expect.any(Function));
    });
  });
});