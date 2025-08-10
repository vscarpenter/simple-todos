/**
 * TaskService - Focused service for task CRUD operations
 * Extracted from CascadeApp god class for better maintainability
 */

import eventBus from '../eventBus.js';
import { Task, createTask } from '../models.js';
import { generateUniqueId } from '../utils.js';

export class TaskService {
    constructor(state, storage) {
        this.state = state;
        this.storage = storage;
    }

    /**
     * Create a new task
     * @param {string} text - Task text
     * @param {string} boardId - Board ID to add task to
     * @returns {Promise<Task>} Created task
     */
    async createTask(text, boardId) {
        try {
            // Validate input
            if (!text || typeof text !== 'string') {
                throw new Error('Task text is required');
            }

            if (text.length > 200) {
                throw new Error('Task text cannot exceed 200 characters');
            }

            const trimmedText = text.trim();
            if (trimmedText.length === 0) {
                throw new Error('Task text cannot be empty');
            }

            const boards = this.state.getState().boards;
            const currentBoard = boards.find(b => b.id === boardId);
            
            if (!currentBoard) {
                throw new Error('Board not found');
            }

            // Check for duplicate tasks (only if text is not empty and longer than 3 chars)
            const existingTasks = currentBoard.tasks || [];
            console.log('🔍 Checking for duplicates. Existing tasks:', existingTasks.map(t => t.text));
            console.log('🔍 New task text:', trimmedText);
            
            // Only check for duplicates if the text is substantial
            if (trimmedText.length > 3) {
                const duplicateTask = existingTasks.find(t => t.text.trim().toLowerCase() === trimmedText.toLowerCase());
                
                if (duplicateTask) {
                    console.log('🔍 Duplicate found:', duplicateTask);
                    throw new Error('A task with this text already exists');
                }
            }

            // Create new task
            const newTask = createTask({
                text: trimmedText,
                status: 'todo',
                createdDate: new Date().toISOString(),
                lastModified: new Date().toISOString()
            });

            // Add task to board
            currentBoard.tasks = [...existingTasks, newTask.toJSON()];

            // Update state
            this.state.setState({
                boards: boards,
                tasks: currentBoard.tasks.map(t => new Task(t))
            });

            // Save to storage
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('task:created', { task: newTask, boardId });
            eventBus.emit('data:changed');

            console.log('✅ Task created successfully:', newTask.text, 'Board tasks now:', currentBoard.tasks.length);
            
            return newTask;

        } catch (error) {
            console.error('Failed to create task:', error);
            eventBus.emit('task:error', { operation: 'create', error: error.message });
            throw error;
        }
    }

    /**
     * Update an existing task
     * @param {string} taskId - Task ID
     * @param {Object} updates - Properties to update
     * @returns {Promise<Task>} Updated task
     */
    async updateTask(taskId, updates) {
        try {
            if (!taskId || !updates) {
                throw new Error('Task ID and updates are required');
            }

            const boards = this.state.getState().boards;
            let targetBoard = null;
            let taskIndex = -1;

            // Find the task across all boards
            for (const board of boards) {
                if (board.tasks) {
                    taskIndex = board.tasks.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1) {
                        targetBoard = board;
                        break;
                    }
                }
            }

            if (!targetBoard || taskIndex === -1) {
                throw new Error('Task not found');
            }

            const currentTask = targetBoard.tasks[taskIndex];
            
            // Validate text update if provided
            if (updates.text !== undefined) {
                if (typeof updates.text !== 'string' || updates.text.length > 200) {
                    throw new Error('Invalid task text');
                }

                const trimmedText = updates.text.trim();
                if (trimmedText.length === 0) {
                    throw new Error('Task text cannot be empty');
                }

                // Check for duplicates (excluding current task)
                const duplicateTask = targetBoard.tasks.find(t => 
                    t.id !== taskId && t.text.trim() === trimmedText
                );
                
                if (duplicateTask) {
                    throw new Error('A task with this text already exists');
                }
            }

            // Create updated task
            const updatedTaskData = {
                ...currentTask,
                ...updates,
                lastModified: new Date().toISOString()
            };

            // Handle status changes
            if (updates.status === 'done' && currentTask.status !== 'done') {
                updatedTaskData.completedDate = new Date().toISOString();
            } else if (updates.status !== 'done' && currentTask.status === 'done') {
                updatedTaskData.completedDate = null;
            }

            const updatedTask = new Task(updatedTaskData);
            
            // Update in board
            targetBoard.tasks[taskIndex] = updatedTask.toJSON();

            // Update state with current board tasks
            const currentBoardId = this.state.getState().currentBoardId;
            let updatedTasks = [];
            if (currentBoardId) {
                const currentBoard = boards.find(b => b.id === currentBoardId);
                if (currentBoard && currentBoard.tasks) {
                    updatedTasks = currentBoard.tasks.map(t => new Task(t));
                }
            }
            this.state.setState({
                boards: boards,
                tasks: updatedTasks
            });

            // Save to storage
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('task:updated', { 
                task: updatedTask, 
                boardId: targetBoard.id,
                changes: updates 
            });
            eventBus.emit('data:changed');

            return updatedTask;

        } catch (error) {
            console.error('Failed to update task:', error);
            eventBus.emit('task:error', { operation: 'update', error: error.message });
            throw error;
        }
    }

    /**
     * Delete a task
     * @param {string} taskId - Task ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteTask(taskId) {
        try {
            if (!taskId) {
                throw new Error('Task ID is required');
            }

            const boards = this.state.getState().boards;
            let targetBoard = null;
            let taskIndex = -1;
            let deletedTask = null;

            // Find the task across all boards
            for (const board of boards) {
                if (board.tasks) {
                    taskIndex = board.tasks.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1) {
                        targetBoard = board;
                        deletedTask = board.tasks[taskIndex];
                        break;
                    }
                }
            }

            if (!targetBoard || taskIndex === -1) {
                throw new Error('Task not found');
            }

            // Remove task from board
            targetBoard.tasks.splice(taskIndex, 1);

            // Update state with current board tasks
            const currentBoardId = this.state.getState().currentBoardId;
            let updatedTasks = [];
            if (currentBoardId) {
                const currentBoard = boards.find(b => b.id === currentBoardId);
                if (currentBoard && currentBoard.tasks) {
                    updatedTasks = currentBoard.tasks.map(t => new Task(t));
                }
            }
            this.state.setState({
                boards: boards,
                tasks: updatedTasks
            });

            // Save to storage
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('task:deleted', { 
                task: deletedTask, 
                boardId: targetBoard.id 
            });
            eventBus.emit('data:changed');

            return true;

        } catch (error) {
            console.error('Failed to delete task:', error);
            eventBus.emit('task:error', { operation: 'delete', error: error.message });
            throw error;
        }
    }

    /**
     * Move task to different status
     * @param {string} taskId - Task ID
     * @param {string} newStatus - New status ('todo', 'doing', 'done')
     * @returns {Promise<Task>} Updated task
     */
    async moveTaskToStatus(taskId, newStatus) {
        const validStatuses = ['todo', 'doing', 'done'];
        
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }

        return this.updateTask(taskId, { status: newStatus });
    }

    /**
     * Archive a task
     * @param {string} taskId - Task ID to archive
     * @returns {Promise<boolean>} Success status
     */
    async archiveTask(taskId) {
        try {
            if (!taskId) {
                throw new Error('Task ID is required');
            }

            const boards = this.state.getState().boards;
            let sourceBoard = null;
            let taskIndex = -1;
            let taskToArchive = null;

            // Find the task
            for (const board of boards) {
                if (board.tasks) {
                    taskIndex = board.tasks.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1) {
                        sourceBoard = board;
                        taskToArchive = board.tasks[taskIndex];
                        break;
                    }
                }
            }

            if (!sourceBoard || taskIndex === -1) {
                throw new Error('Task not found');
            }

            // Initialize archived tasks array if needed
            if (!sourceBoard.archivedTasks) {
                sourceBoard.archivedTasks = [];
            }

            // Move task to archived
            const archivedTask = {
                ...taskToArchive,
                archivedDate: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            sourceBoard.archivedTasks.push(archivedTask);
            sourceBoard.tasks.splice(taskIndex, 1);

            // Update state with current board tasks
            const currentBoardId = this.state.getState().currentBoardId;
            let updatedTasks = [];
            if (currentBoardId) {
                const currentBoard = boards.find(b => b.id === currentBoardId);
                if (currentBoard && currentBoard.tasks) {
                    updatedTasks = currentBoard.tasks.map(t => new Task(t));
                }
            }
            this.state.setState({
                boards: boards,
                tasks: updatedTasks
            });

            // Save to storage
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('task:archived', { 
                task: archivedTask, 
                boardId: sourceBoard.id 
            });
            eventBus.emit('data:changed');

            return true;

        } catch (error) {
            console.error('Failed to archive task:', error);
            eventBus.emit('task:error', { operation: 'archive', error: error.message });
            throw error;
        }
    }

    /**
     * Restore an archived task
     * @param {string} taskId - Archived task ID to restore
     * @param {string} boardId - Board ID containing the archived task
     * @returns {Promise<boolean>} Success status
     */
    async restoreTask(taskId, boardId) {
        try {
            if (!taskId || !boardId) {
                throw new Error('Task ID and Board ID are required');
            }

            const boards = this.state.getState().boards;
            const targetBoard = boards.find(b => b.id === boardId);

            if (!targetBoard || !targetBoard.archivedTasks) {
                throw new Error('Board or archived tasks not found');
            }

            const archivedIndex = targetBoard.archivedTasks.findIndex(t => t.id === taskId);
            if (archivedIndex === -1) {
                throw new Error('Archived task not found');
            }

            const taskToRestore = targetBoard.archivedTasks[archivedIndex];

            // Remove from archived and add back to active
            const restoredTask = {
                ...taskToRestore,
                lastModified: new Date().toISOString()
            };

            delete restoredTask.archivedDate; // Remove archive timestamp
            
            if (!targetBoard.tasks) {
                targetBoard.tasks = [];
            }
            
            targetBoard.tasks.push(restoredTask);
            targetBoard.archivedTasks.splice(archivedIndex, 1);

            // Update state with current board tasks
            const currentBoardId = this.state.getState().currentBoardId;
            let updatedTasks = [];
            if (currentBoardId) {
                const currentBoard = boards.find(b => b.id === currentBoardId);
                if (currentBoard && currentBoard.tasks) {
                    updatedTasks = currentBoard.tasks.map(t => new Task(t));
                }
            }
            this.state.setState({
                boards: boards,
                tasks: updatedTasks
            });

            // Save to storage
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('task:restored', { 
                task: restoredTask, 
                boardId: boardId 
            });
            eventBus.emit('data:changed');

            return true;

        } catch (error) {
            console.error('Failed to restore task:', error);
            eventBus.emit('task:error', { operation: 'restore', error: error.message });
            throw error;
        }
    }

    /**
     * Get tasks by status
     * @param {string} status - Status to filter by
     * @param {string} boardId - Optional board ID (defaults to current board)
     * @returns {Array<Task>} Filtered tasks
     */
    getTasksByStatus(status, boardId = null) {
        try {
            const currentBoardId = boardId || this.state.getState().currentBoardId;
            const boards = this.state.getState().boards;
            const board = boards.find(b => b.id === currentBoardId);
            
            if (!board || !board.tasks) {
                return [];
            }

            return board.tasks
                .filter(t => t.status === status)
                .map(t => new Task(t));
        } catch (error) {
            console.error('Failed to get tasks by status:', error);
            return [];
        }
    }

    /**
     * Search tasks by text
     * @param {string} searchTerm - Search term
     * @param {string} boardId - Optional board ID (defaults to current board)
     * @returns {Array<Task>} Matching tasks
     */
    searchTasks(searchTerm, boardId = null) {
        try {
            if (!searchTerm || typeof searchTerm !== 'string') {
                return [];
            }

            const currentBoardId = boardId || this.state.getState().currentBoardId;
            const boards = this.state.getState().boards;
            const board = boards.find(b => b.id === currentBoardId);
            
            if (!board || !board.tasks) {
                return [];
            }

            const lowerSearchTerm = searchTerm.toLowerCase();
            
            return board.tasks
                .filter(t => t.text.toLowerCase().includes(lowerSearchTerm))
                .map(t => new Task(t));
        } catch (error) {
            console.error('Failed to search tasks:', error);
            return [];
        }
    }
}

