/**
 * Core Task Management E2E Tests
 * Tests task creation, editing, deletion, and status changes
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
 */
import { test, expect } from '@playwright/test';
import { TaskBoardPage } from '../fixtures/page-objects/TaskBoardPage.js';
import { StorageHelper } from '../fixtures/helpers/storage-helper.js';

test.describe('Core Task Management', () => {
  let taskBoardPage;

  test.beforeEach(async ({ page }) => {
    taskBoardPage = new TaskBoardPage(page);
    
    // Clear storage and navigate to app
    await StorageHelper.clearStorage(page);
    await taskBoardPage.navigateToApp();
    await taskBoardPage.waitForTaskBoardReady();
  });

  test.describe('Task Creation Workflow', () => {
    test('should create a new task with valid text', async () => {
      // Requirement 1.1: WHEN I create a new task THEN the system SHALL display the task in the To Do column
      const taskText = 'Test task for E2E testing';
      
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Verify task appears in todo column
      expect(taskId).toBeTruthy();
      
      const task = await taskBoardPage.getTask(taskId);
      expect(task).toBeTruthy();
      expect(task.text).toBe(taskText);
      expect(task.status).toBe('todo');
      
      // Verify task count updated
      const todoCount = await taskBoardPage.getTaskCount('todo');
      expect(todoCount).toBe(1);
      
      // Verify persistence in application state
      const storageData = await taskBoardPage.page.evaluate(() => {
        if (window.cascadeApp && window.cascadeApp.state) {
          return window.cascadeApp.state.getState();
        }
        return null;
      });
      expect(storageData).toBeTruthy();
      
      const currentBoard = storageData.boards.find(b => b.id === storageData.currentBoardId);
      expect(currentBoard).toBeTruthy();
      expect(currentBoard.tasks).toHaveLength(1);
      expect(currentBoard.tasks[0].text).toBe(taskText);
      expect(currentBoard.tasks[0].status).toBe('todo');
    });

    test('should validate task input and prevent empty tasks', async () => {
      // Test empty string
      const preventedEmpty = await taskBoardPage.verifyTaskInputValidation('');
      expect(preventedEmpty).toBe(true);
      
      // Test whitespace only
      const preventedWhitespace = await taskBoardPage.verifyTaskInputValidation('   ');
      expect(preventedWhitespace).toBe(true);
      
      // Verify no tasks were created
      const totalCount = await taskBoardPage.getTaskCount();
      expect(totalCount).toBe(0);
    });

    test('should validate task input length limits', async () => {
      // Test very long text (assuming 500 character limit)
      const longText = 'a'.repeat(501);
      const preventedLong = await taskBoardPage.verifyTaskInputValidation(longText);
      expect(preventedLong).toBe(true);
      
      // Test acceptable length
      const acceptableText = 'a'.repeat(100);
      const taskId = await taskBoardPage.createTask(acceptableText);
      expect(taskId).toBeTruthy();
      
      const task = await taskBoardPage.getTask(taskId);
      expect(task.text).toBe(acceptableText);
    });

    test('should clear input field after successful task creation', async ({ page }) => {
      const taskText = 'Task to test input clearing';
      
      await taskBoardPage.createTask(taskText);
      
      // Check that input field is cleared
      const inputValue = await page.inputValue('#todo-input');
      expect(inputValue).toBe('');
    });

    test('should update UI immediately after task creation', async () => {
      const taskText = 'Immediate UI update test';
      
      // Create task and verify immediate UI update
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Verify task appears immediately without page refresh
      const tasksInTodo = await taskBoardPage.getTasksInColumn('todo');
      expect(tasksInTodo).toHaveLength(1);
      expect(tasksInTodo[0].text).toBe(taskText);
      expect(tasksInTodo[0].id).toBe(taskId);
    });
  });

  test.describe('Drag and Drop Task Movement', () => {
    test('should move task from todo to doing column', async () => {
      // Requirement 1.2: WHEN I drag a task between columns THEN the system SHALL update the task status
      const taskText = 'Task to move to doing';
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Move task to doing column
      await taskBoardPage.dragTaskToColumn(taskId, 'doing');
      
      // Verify task moved to doing column
      const task = await taskBoardPage.getTask(taskId);
      expect(task.status).toBe('doing');
      
      // Verify task counts updated
      const todoCount = await taskBoardPage.getTaskCount('todo');
      const doingCount = await taskBoardPage.getTaskCount('doing');
      expect(todoCount).toBe(0);
      expect(doingCount).toBe(1);
      
      // Verify persistence
      const storageData = await taskBoardPage.page.evaluate(() => {
        if (window.cascadeApp && window.cascadeApp.state) {
          return window.cascadeApp.state.getState();
        }
        return null;
      });
      const currentBoard = storageData.boards.find(b => b.id === storageData.currentBoardId);
      const storedTask = currentBoard.tasks.find(t => t.id === taskId);
      expect(storedTask.status).toBe('doing');
    });

    test('should move task from doing to done column', async () => {
      const taskText = 'Task to complete';
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Move through workflow: todo -> doing -> done
      await taskBoardPage.dragTaskToColumn(taskId, 'doing');
      await taskBoardPage.dragTaskToColumn(taskId, 'done');
      
      // Verify final state
      const task = await taskBoardPage.getTask(taskId);
      expect(task.status).toBe('done');
      
      // Verify task counts
      const todoCount = await taskBoardPage.getTaskCount('todo');
      const doingCount = await taskBoardPage.getTaskCount('doing');
      const doneCount = await taskBoardPage.getTaskCount('done');
      expect(todoCount).toBe(0);
      expect(doingCount).toBe(0);
      expect(doneCount).toBe(1);
    });

    test('should move task backwards in workflow', async () => {
      const taskText = 'Task to move backwards';
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Move forward then backward: todo -> done -> doing
      await taskBoardPage.dragTaskToColumn(taskId, 'done');
      await taskBoardPage.dragTaskToColumn(taskId, 'doing');
      
      // Verify task is in doing column
      const task = await taskBoardPage.getTask(taskId);
      expect(task.status).toBe('doing');
      
      // Verify persistence
      const storageData = await taskBoardPage.page.evaluate(() => {
        if (window.cascadeApp && window.cascadeApp.state) {
          return window.cascadeApp.state.getState();
        }
        return null;
      });
      const currentBoard = storageData.boards.find(b => b.id === storageData.currentBoardId);
      const storedTask = currentBoard.tasks.find(t => t.id === taskId);
      expect(storedTask.status).toBe('doing');
    });

    test('should persist task status after page refresh', async () => {
      // Requirement 1.6: WHEN I refresh the page THEN the system SHALL restore all tasks from localStorage
      const taskText = 'Task for persistence test';
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Move task to doing
      await taskBoardPage.dragTaskToColumn(taskId, 'doing');
      
      // Refresh page
      await taskBoardPage.reloadPage();
      await taskBoardPage.waitForTaskBoardReady();
      
      // Verify task is still in doing column
      const task = await taskBoardPage.getTask(taskId);
      expect(task).toBeTruthy();
      expect(task.text).toBe(taskText);
      expect(task.status).toBe('doing');
      
      // Verify task counts
      const doingCount = await taskBoardPage.getTaskCount('doing');
      expect(doingCount).toBe(1);
    });

    test('should handle multiple tasks drag and drop', async () => {
      // Create multiple tasks
      const tasks = [
        { text: 'First task', id: null },
        { text: 'Second task', id: null },
        { text: 'Third task', id: null }
      ];
      
      for (const task of tasks) {
        task.id = await taskBoardPage.createTask(task.text);
      }
      
      // Move tasks to different columns
      await taskBoardPage.dragTaskToColumn(tasks[0].id, 'doing');
      await taskBoardPage.dragTaskToColumn(tasks[1].id, 'done');
      // Keep third task in todo
      
      // Verify final distribution
      const todoTasks = await taskBoardPage.getTasksInColumn('todo');
      const doingTasks = await taskBoardPage.getTasksInColumn('doing');
      const doneTasks = await taskBoardPage.getTasksInColumn('done');
      
      expect(todoTasks).toHaveLength(1);
      expect(doingTasks).toHaveLength(1);
      expect(doneTasks).toHaveLength(1);
      
      expect(todoTasks[0].text).toBe('Third task');
      expect(doingTasks[0].text).toBe('First task');
      expect(doneTasks[0].text).toBe('Second task');
    });
  });

  test.describe('Task Editing', () => {
    test('should edit task text with inline editing', async () => {
      // Requirement 1.3: WHEN I edit a task THEN the system SHALL save the changes
      const originalText = 'Original task text';
      const newText = 'Updated task text';
      
      const taskId = await taskBoardPage.createTask(originalText);
      
      // Edit the task
      await taskBoardPage.editTask(taskId, newText);
      
      // Verify text updated
      const task = await taskBoardPage.getTask(taskId);
      expect(task.text).toBe(newText);
      
      // Verify persistence
      const storageData = await taskBoardPage.page.evaluate(() => {
        if (window.cascadeApp && window.cascadeApp.state) {
          return window.cascadeApp.state.getState();
        }
        return null;
      });
      const currentBoard = storageData.boards.find(b => b.id === storageData.currentBoardId);
      const storedTask = currentBoard.tasks.find(t => t.id === taskId);
      expect(storedTask.text).toBe(newText);
    });

    test('should preserve task status when editing', async () => {
      const originalText = 'Task to edit in doing';
      const newText = 'Edited task in doing';
      
      const taskId = await taskBoardPage.createTask(originalText);
      
      // Move to doing column
      await taskBoardPage.dragTaskToColumn(taskId, 'doing');
      
      // Edit the task
      await taskBoardPage.editTask(taskId, newText);
      
      // Verify text updated but status preserved
      const task = await taskBoardPage.getTask(taskId);
      expect(task.text).toBe(newText);
      expect(task.status).toBe('doing');
    });

    test('should validate edited task text', async ({ page }) => {
      const originalText = 'Task to edit with validation';
      const taskId = await taskBoardPage.createTask(originalText);
      
      // Try to edit with empty text
      const editButtonSelector = `[data-task-id="${taskId}"] .edit-task-btn`;
      await taskBoardPage.clickElement(editButtonSelector);
      
      // Wait for inline editing
      await page.waitForFunction((id) => {
        const task = document.querySelector(`[data-task-id="${id}"]`);
        return task && task.classList.contains('editing');
      }, taskId);
      
      // Try to save empty text
      const inputSelector = `[data-task-id="${taskId}"] input, [data-task-id="${taskId}"] textarea`;
      await page.fill(inputSelector, '');
      await page.keyboard.press('Enter');
      
      // Verify original text is preserved
      const task = await taskBoardPage.getTask(taskId);
      expect(task.text).toBe(originalText);
    });

    test('should persist edited text after page refresh', async () => {
      const originalText = 'Task to edit and refresh';
      const newText = 'Edited text after refresh';
      
      const taskId = await taskBoardPage.createTask(originalText);
      await taskBoardPage.editTask(taskId, newText);
      
      // Refresh page
      await taskBoardPage.reloadPage();
      await taskBoardPage.waitForTaskBoardReady();
      
      // Verify edited text persisted
      const task = await taskBoardPage.getTask(taskId);
      expect(task.text).toBe(newText);
    });
  });

  test.describe('Task Deletion', () => {
    test('should delete task with confirmation', async () => {
      // Requirement 1.4: WHEN I delete a task THEN the system SHALL remove the task from the board
      const taskText = 'Task to delete';
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Delete the task (with confirmation)
      await taskBoardPage.deleteTask(taskId, true);
      
      // Verify task is removed
      const task = await taskBoardPage.getTask(taskId);
      expect(task).toBeNull();
      
      // Verify task count updated
      const totalCount = await taskBoardPage.getTaskCount();
      expect(totalCount).toBe(0);
      
      // Verify persistence
      const storageData = await taskBoardPage.page.evaluate(() => {
        if (window.cascadeApp && window.cascadeApp.state) {
          return window.cascadeApp.state.getState();
        }
        return null;
      });
      const currentBoard = storageData.boards.find(b => b.id === storageData.currentBoardId);
      const storedTask = currentBoard.tasks?.find(t => t.id === taskId);
      expect(storedTask).toBeUndefined();
    });

    test('should cancel task deletion', async () => {
      const taskText = 'Task not to delete';
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Try to delete but cancel
      await taskBoardPage.deleteTask(taskId, false);
      
      // Verify task still exists
      const task = await taskBoardPage.getTask(taskId);
      expect(task).toBeTruthy();
      expect(task.text).toBe(taskText);
      
      // Verify task count unchanged
      const totalCount = await taskBoardPage.getTaskCount();
      expect(totalCount).toBe(1);
    });

    test('should update task counts after deletion', async () => {
      // Create tasks in different columns
      const todoTaskId = await taskBoardPage.createTask('Todo task');
      const doingTaskId = await taskBoardPage.createTask('Doing task');
      const doneTaskId = await taskBoardPage.createTask('Done task');
      
      await taskBoardPage.dragTaskToColumn(doingTaskId, 'doing');
      await taskBoardPage.dragTaskToColumn(doneTaskId, 'done');
      
      // Verify initial counts
      expect(await taskBoardPage.getTaskCount('todo')).toBe(1);
      expect(await taskBoardPage.getTaskCount('doing')).toBe(1);
      expect(await taskBoardPage.getTaskCount('done')).toBe(1);
      
      // Delete task from doing column
      await taskBoardPage.deleteTask(doingTaskId, true);
      
      // Verify counts updated
      expect(await taskBoardPage.getTaskCount('todo')).toBe(1);
      expect(await taskBoardPage.getTaskCount('doing')).toBe(0);
      expect(await taskBoardPage.getTaskCount('done')).toBe(1);
    });

    test('should persist deletion after page refresh', async () => {
      const taskText = 'Task to delete and refresh';
      const taskId = await taskBoardPage.createTask(taskText);
      
      // Delete task
      await taskBoardPage.deleteTask(taskId, true);
      
      // Refresh page
      await taskBoardPage.reloadPage();
      await taskBoardPage.waitForTaskBoardReady();
      
      // Verify task is still deleted
      const task = await taskBoardPage.getTask(taskId);
      expect(task).toBeNull();
      
      const totalCount = await taskBoardPage.getTaskCount();
      expect(totalCount).toBe(0);
    });
  });

  test.describe('Task Archiving', () => {
    test('should archive completed tasks', async () => {
      // Requirement 1.5: WHEN I archive completed tasks THEN the system SHALL move tasks from Done column to archive
      const completedTasks = [
        'Completed task 1',
        'Completed task 2',
        'Completed task 3'
      ];
      
      // Create and complete tasks
      const taskIds = [];
      for (const taskText of completedTasks) {
        const taskId = await taskBoardPage.createTask(taskText);
        await taskBoardPage.dragTaskToColumn(taskId, 'done');
        taskIds.push(taskId);
      }
      
      // Verify tasks are in done column
      const doneTasksBefore = await taskBoardPage.getTasksInColumn('done');
      expect(doneTasksBefore).toHaveLength(3);
      
      // Archive tasks
      const archivedCount = await taskBoardPage.archiveTasks();
      expect(archivedCount).toBe(3);
      
      // Verify done column is empty
      const doneTasksAfter = await taskBoardPage.getTasksInColumn('done');
      expect(doneTasksAfter).toHaveLength(0);
      
      // Verify tasks moved to archive in storage
      const storageData = await taskBoardPage.page.evaluate(() => {
        if (window.cascadeApp && window.cascadeApp.state) {
          return window.cascadeApp.state.getState();
        }
        return null;
      });
      const currentBoard = storageData.boards.find(b => b.id === storageData.currentBoardId);
      expect(currentBoard.archive).toHaveLength(3);
      
      // Verify archived tasks have correct data
      const archivedTexts = currentBoard.archive.map(task => task.text);
      expect(archivedTexts).toEqual(expect.arrayContaining(completedTasks));
    });

    test('should not archive if no completed tasks', async () => {
      // Create tasks but don't complete them
      await taskBoardPage.createTask('Todo task');
      const doingTaskId = await taskBoardPage.createTask('Doing task');
      await taskBoardPage.dragTaskToColumn(doingTaskId, 'doing');
      
      // Try to archive
      const archivedCount = await taskBoardPage.archiveTasks();
      expect(archivedCount).toBe(0);
      
      // Verify tasks remain in their columns
      expect(await taskBoardPage.getTaskCount('todo')).toBe(1);
      expect(await taskBoardPage.getTaskCount('doing')).toBe(1);
      expect(await taskBoardPage.getTaskCount('done')).toBe(0);
    });

    test('should update UI after archiving', async () => {
      const taskId = await taskBoardPage.createTask('Task to archive');
      await taskBoardPage.dragTaskToColumn(taskId, 'done');
      
      // Archive tasks
      await taskBoardPage.archiveTasks();
      
      // Verify UI updated immediately
      const doneCount = await taskBoardPage.getTaskCount('done');
      expect(doneCount).toBe(0);
      
      const totalCount = await taskBoardPage.getTaskCount();
      expect(totalCount).toBe(0);
    });
  });

  test.describe('Data Persistence and Recovery', () => {
    test('should restore all tasks after page refresh', async () => {
      // Requirement 1.6: WHEN I refresh the page THEN the system SHALL restore all tasks from localStorage
      const tasks = [
        { text: 'Todo task', status: 'todo' },
        { text: 'Doing task', status: 'doing' },
        { text: 'Done task', status: 'done' }
      ];
      
      const taskIds = [];
      for (const taskData of tasks) {
        const taskId = await taskBoardPage.createTask(taskData.text);
        if (taskData.status !== 'todo') {
          await taskBoardPage.dragTaskToColumn(taskId, taskData.status);
        }
        taskIds.push(taskId);
      }
      
      // Refresh page
      await taskBoardPage.reloadPage();
      await taskBoardPage.waitForTaskBoardReady();
      
      // Verify all tasks restored
      for (let i = 0; i < tasks.length; i++) {
        const task = await taskBoardPage.getTask(taskIds[i]);
        expect(task).toBeTruthy();
        expect(task.text).toBe(tasks[i].text);
        expect(task.status).toBe(tasks[i].status);
      }
      
      // Verify task counts
      expect(await taskBoardPage.getTaskCount('todo')).toBe(1);
      expect(await taskBoardPage.getTaskCount('doing')).toBe(1);
      expect(await taskBoardPage.getTaskCount('done')).toBe(1);
    });

    test('should handle corrupted localStorage gracefully', async ({ page }) => {
      // Create a task first
      const taskId = await taskBoardPage.createTask('Test task');
      
      // Corrupt application state
      await page.evaluate(() => {
        // Simulate corrupted state by breaking the application state
        if (window.cascadeApp && window.cascadeApp.state) {
          window.cascadeApp.state._state = null;
        }
      });
      
      // Refresh page
      await taskBoardPage.reloadPage();
      await taskBoardPage.waitForTaskBoardReady();
      
      // App should still load (with empty state)
      const totalCount = await taskBoardPage.getTaskCount();
      expect(totalCount).toBe(0);
      
      // Should be able to create new tasks
      const newTaskId = await taskBoardPage.createTask('New task after corruption');
      expect(newTaskId).toBeTruthy();
      
      const newTask = await taskBoardPage.getTask(newTaskId);
      expect(newTask.text).toBe('New task after corruption');
    });

    test('should maintain task order after refresh', async () => {
      const taskTexts = ['First task', 'Second task', 'Third task'];
      const taskIds = [];
      
      // Create tasks in order
      for (const text of taskTexts) {
        const taskId = await taskBoardPage.createTask(text);
        taskIds.push(taskId);
      }
      
      // Refresh page
      await taskBoardPage.reloadPage();
      await taskBoardPage.waitForTaskBoardReady();
      
      // Verify task order preserved
      const todoTasks = await taskBoardPage.getTasksInColumn('todo');
      expect(todoTasks).toHaveLength(3);
      
      for (let i = 0; i < taskTexts.length; i++) {
        expect(todoTasks[i].text).toBe(taskTexts[i]);
        expect(todoTasks[i].id).toBe(taskIds[i]);
      }
    });
  });
});