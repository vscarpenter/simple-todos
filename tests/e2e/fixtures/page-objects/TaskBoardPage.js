/**
 * TaskBoardPage - Page Object Model for task board interactions
 * Handles task creation, editing, deletion, and status changes
 */
import { BasePage } from './BasePage.js';
import { DragDropHelper } from '../helpers/drag-drop-helper.js';

class TaskBoardPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Task board selectors
    this.selectors = {
      taskBoard: '.task-board',
      columns: {
        todo: '#todo-list',
        doing: '#doing-list', 
        done: '#done-list'
      },
      taskInput: '#todo-input',
      addTaskButton: 'button[type="submit"]',
      tasks: '.task-card',
      taskText: '.task-card__text',
      editButton: '.task-edit-btn',
      deleteButton: '.task-delete-btn',
      confirmDialog: '#custom-modal',
      confirmYes: '#modal-confirm',
      confirmNo: '#modal-cancel',
      taskCount: '.board-column__count',
      archiveButton: '#archive-button'
    };
  }

  /**
   * Create a new task with the specified text
   * @param {string} text - Task text content
   * @returns {string} - Task ID of the created task
   */
  async createTask(text) {
    // Wait for task input to be available
    await this.waitForElement(this.selectors.taskInput);
    
    // Clear any existing text and type new task
    await this.page.fill(this.selectors.taskInput, text);
    
    // Click add task button
    await this.clickElement(this.selectors.addTaskButton);
    
    // Wait for task to appear in the todo column
    await this.page.waitForFunction((taskText) => {
      const tasks = document.querySelectorAll('#todo-list .task-card .task-card__text');
      return Array.from(tasks).some(task => task.textContent.trim() === taskText);
    }, text);
    
    // Get the task ID of the newly created task
    const taskId = await this.page.evaluate((taskText) => {
      const tasks = document.querySelectorAll('#todo-list .task-card');
      for (const task of tasks) {
        const textElement = task.querySelector('.task-card__text');
        if (textElement && textElement.textContent.trim() === taskText) {
          return task.dataset.taskId;
        }
      }
      return null;
    }, text);
    
    return taskId;
  }

  /**
   * Drag a task to a different column
   * @param {string} taskId - Task ID to move
   * @param {string} targetColumn - Target column ('todo', 'doing', 'done')
   */
  async dragTaskToColumn(taskId, targetColumn) {
    const sourceSelector = `[data-task-id="${taskId}"]`;
    const targetSelector = this.selectors.columns[targetColumn];
    
    // Ensure both source and target exist
    await this.waitForElement(sourceSelector);
    await this.waitForElement(targetSelector);
    
    // Use drag and drop helper
    await DragDropHelper.dragAndDrop(this.page, sourceSelector, targetSelector);
    
    // Wait for task to appear in target column
    await this.page.waitForFunction((taskId, column) => {
      const columnElement = document.getElementById(`${column}-list`);
      const task = columnElement ? columnElement.querySelector(`[data-task-id="${taskId}"]`) : null;
      return task !== null;
    }, taskId, targetColumn);
    
    // Verify persistence by checking application state
    await this.page.waitForFunction((taskId, expectedStatus) => {
      // Check if the application state has been updated
      if (window.cascadeApp && window.cascadeApp.state) {
        const state = window.cascadeApp.state.getState();
        const currentBoard = state.boards.find(b => b.id === state.currentBoardId);
        if (currentBoard && currentBoard.tasks) {
          const task = currentBoard.tasks.find(t => t.id === taskId);
          return task && task.status === expectedStatus;
        }
      }
      return false;
    }, taskId, targetColumn === 'todo' ? 'todo' : targetColumn === 'doing' ? 'doing' : 'done');
  }

  /**
   * Edit a task's text content
   * @param {string} taskId - Task ID to edit
   * @param {string} newText - New text content
   */
  async editTask(taskId, newText) {
    const taskSelector = `[data-task-id="${taskId}"]`;
    const editButtonSelector = `${taskSelector} ${this.selectors.editButton}`;
    const taskTextSelector = `${taskSelector} ${this.selectors.taskText}`;
    
    // Click edit button
    await this.clickElement(editButtonSelector);
    
    // Wait for inline editing to be active
    await this.page.waitForFunction((taskId) => {
      const task = document.querySelector(`[data-task-id="${taskId}"]`);
      return task && task.classList.contains('editing');
    }, taskId);
    
    // Find the input field and update text
    const inputSelector = `${taskSelector} input, ${taskSelector} textarea`;
    await this.waitForElement(inputSelector);
    await this.page.fill(inputSelector, newText);
    
    // Save by pressing Enter or clicking save button
    await this.page.keyboard.press('Enter');
    
    // Wait for editing mode to end and text to update
    await this.page.waitForFunction((taskId, expectedText) => {
      const task = document.querySelector(`[data-task-id="${taskId}"]`);
      if (!task || task.classList.contains('editing')) return false;
      
      const textElement = task.querySelector('.task-text');
      return textElement && textElement.textContent.trim() === expectedText;
    }, taskId, newText);
    
    // Verify persistence
    await this.page.waitForFunction((taskId, expectedText) => {
      if (window.cascadeApp && window.cascadeApp.state) {
        const state = window.cascadeApp.state.getState();
        const currentBoard = state.boards.find(b => b.id === state.currentBoardId);
        if (currentBoard && currentBoard.tasks) {
          const task = currentBoard.tasks.find(t => t.id === taskId);
          return task && task.text === expectedText;
        }
      }
      return false;
    }, taskId, newText);
  }

  /**
   * Delete a task with confirmation
   * @param {string} taskId - Task ID to delete
   * @param {boolean} confirm - Whether to confirm deletion (default: true)
   */
  async deleteTask(taskId, confirm = true) {
    const taskSelector = `[data-task-id="${taskId}"]`;
    const deleteButtonSelector = `${taskSelector} ${this.selectors.deleteButton}`;
    
    // Get initial task count for verification
    const initialCount = await this.getTaskCount();
    
    // Click delete button
    await this.clickElement(deleteButtonSelector);
    
    // Wait for confirmation dialog
    await this.waitForElement(this.selectors.confirmDialog);
    
    if (confirm) {
      // Click confirm yes
      await this.clickElement(this.selectors.confirmYes);
      
      // Wait for task to be removed from DOM
      await this.page.waitForFunction((taskId) => {
        return !document.querySelector(`[data-task-id="${taskId}"]`);
      }, taskId);
      
      // Verify task count decreased
      await this.page.waitForFunction((expectedCount) => {
        const countElements = document.querySelectorAll('.board-column__count');
        const totalCount = Array.from(countElements).reduce((sum, el) => {
          return sum + parseInt(el.textContent || '0');
        }, 0);
        return totalCount === expectedCount;
      }, initialCount - 1);
      
      // Verify persistence
      await this.page.waitForFunction((taskId) => {
        if (window.cascadeApp && window.cascadeApp.state) {
          const state = window.cascadeApp.state.getState();
          const currentBoard = state.boards.find(b => b.id === state.currentBoardId);
          if (currentBoard && currentBoard.tasks) {
            return !currentBoard.tasks.find(t => t.id === taskId);
          }
        }
        return true;
      }, taskId);
    } else {
      // Click cancel
      await this.clickElement(this.selectors.confirmNo);
      
      // Wait for dialog to close
      await this.waitForElementHidden(this.selectors.confirmDialog);
      
      // Verify task still exists
      await this.waitForElement(taskSelector);
    }
  }

  /**
   * Get task count for a specific column or all columns
   * @param {string} column - Column name ('todo', 'doing', 'done') or null for total
   * @returns {number} - Task count
   */
  async getTaskCount(column = null) {
    if (column) {
      const countSelector = `#${column}-count`;
      const countText = await this.getElementText(countSelector);
      return parseInt(countText) || 0;
    } else {
      // Get total count across all columns
      return await this.page.evaluate(() => {
        const countElements = document.querySelectorAll('.board-column__count');
        return Array.from(countElements).reduce((sum, el) => {
          return sum + parseInt(el.textContent || '0');
        }, 0);
      });
    }
  }

  /**
   * Get all tasks in a specific column
   * @param {string} column - Column name ('todo', 'doing', 'done')
   * @returns {Array} - Array of task objects with id and text
   */
  async getTasksInColumn(column) {
    const columnSelector = this.selectors.columns[column];
    
    return await this.page.evaluate((selector) => {
      const columnElement = document.querySelector(selector);
      if (!columnElement) return [];
      
      const tasks = columnElement.querySelectorAll('.task-card');
      return Array.from(tasks).map(task => ({
        id: task.dataset.taskId,
        text: task.querySelector('.task-card__text')?.textContent?.trim() || ''
      }));
    }, columnSelector);
  }

  /**
   * Get a specific task by ID
   * @param {string} taskId - Task ID
   * @returns {Object|null} - Task object or null if not found
   */
  async getTask(taskId) {
    return await this.page.evaluate((id) => {
      const taskElement = document.querySelector(`[data-task-id="${id}"]`);
      if (!taskElement) return null;
      
      const textElement = taskElement.querySelector('.task-card__text');
      
      // Determine status based on which column contains the task
      let status = 'unknown';
      if (document.getElementById('todo-list').contains(taskElement)) {
        status = 'todo';
      } else if (document.getElementById('doing-list').contains(taskElement)) {
        status = 'doing';
      } else if (document.getElementById('done-list').contains(taskElement)) {
        status = 'done';
      }
      
      return {
        id: id,
        text: textElement?.textContent?.trim() || '',
        status: status
      };
    }, taskId);
  }

  /**
   * Archive completed tasks
   * @returns {number} - Number of tasks archived
   */
  async archiveTasks() {
    // Get initial count of done tasks
    const doneTasksBefore = await this.getTasksInColumn('done');
    const initialDoneCount = doneTasksBefore.length;
    
    if (initialDoneCount === 0) {
      return 0;
    }
    
    // Click archive button
    await this.clickElement(this.selectors.archiveButton);
    
    // Wait for done column to be empty
    await this.page.waitForFunction(() => {
      const doneTasks = document.querySelectorAll('#done-list .task-card');
      return doneTasks.length === 0;
    });
    
    // Verify tasks were moved to archive in application state
    await this.page.waitForFunction((expectedCount) => {
      if (window.cascadeApp && window.cascadeApp.state) {
        const state = window.cascadeApp.state.getState();
        const currentBoard = state.boards.find(b => b.id === state.currentBoardId);
        if (currentBoard && currentBoard.archive) {
          return currentBoard.archive.length >= expectedCount;
        }
      }
      return false;
    }, initialDoneCount);
    
    return initialDoneCount;
  }

  /**
   * Verify task input validation
   * @param {string} invalidText - Invalid text to test
   * @returns {boolean} - Whether validation prevented task creation
   */
  async verifyTaskInputValidation(invalidText) {
    const initialCount = await this.getTaskCount();
    
    // Try to create task with invalid text
    await this.page.fill(this.selectors.taskInput, invalidText);
    await this.clickElement(this.selectors.addTaskButton);
    
    // Wait a moment for any potential task creation
    await this.page.waitForTimeout(500);
    
    // Check if task count remained the same
    const finalCount = await this.getTaskCount();
    return finalCount === initialCount;
  }

  /**
   * Wait for task board to be fully loaded and interactive
   */
  async waitForTaskBoardReady() {
    await this.waitForElement(this.selectors.taskBoard);
    await this.waitForElement(this.selectors.taskInput);
    await this.waitForElement(this.selectors.addTaskButton);
    
    // Ensure all columns are present
    for (const column of Object.values(this.selectors.columns)) {
      await this.waitForElement(column);
    }
    
    // Wait for any initial data loading
    await this.page.waitForFunction(() => {
      // Check if the form is interactive
      const form = document.getElementById('todo-form');
      const input = document.getElementById('todo-input');
      return form && input && !input.disabled;
    });
  }

  /**
   * Clear all tasks from the board
   */
  async clearAllTasks() {
    await this.page.evaluate(() => {
      // Clear tasks through the application's state management
      if (window.cascadeApp && window.cascadeApp.state) {
        const state = window.cascadeApp.state.getState();
        const currentBoard = state.boards.find(b => b.id === state.currentBoardId);
        if (currentBoard) {
          currentBoard.tasks = [];
          currentBoard.archive = [];
          
          // Trigger state update
          if (window.cascadeApp.state.setState) {
            window.cascadeApp.state.setState(state);
          }
        }
      }
    });
    
    // Wait for UI to update
    await this.page.waitForFunction(() => {
      const tasks = document.querySelectorAll('.task-card');
      return tasks.length === 0;
    });
  }
}

export { TaskBoardPage };