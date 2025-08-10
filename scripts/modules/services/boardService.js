/**
 * BoardService - Focused service for board management operations
 * Extracted from CascadeApp god class for better maintainability
 */

import eventBus from '../eventBus.js';
import { Board, Task, createBoard } from '../models.js';
import { generateUniqueId } from '../utils.js';

export class BoardService {
    constructor(state, storage) {
        this.state = state;
        this.storage = storage;
    }

    /**
     * Create a new board
     * @param {Object} boardData - Board data {name, description, color}
     * @returns {Promise<Board>} Created board
     */
    async createBoard(boardData) {
        try {
            const { name, description = '', color = '#6750a4' } = boardData;

            // Validate input
            if (!name || typeof name !== 'string') {
                throw new Error('Board name is required');
            }

            const trimmedName = name.trim();
            if (trimmedName.length === 0) {
                throw new Error('Board name cannot be empty');
            }

            if (trimmedName.length > 50) {
                throw new Error('Board name cannot exceed 50 characters');
            }

            const boards = this.state.getState().boards;

            // Check for duplicate names
            const existingBoard = boards.find(b => 
                b.name.trim().toLowerCase() === trimmedName.toLowerCase()
            );

            if (existingBoard) {
                throw new Error('A board with this name already exists');
            }

            // Create new board
            const newBoard = createBoard({
                name: trimmedName,
                description: description.trim(),
                color: color,
                tasks: [],
                archivedTasks: [],
                isDefault: boards.length === 0, // First board is default
                isArchived: false,
                createdDate: new Date().toISOString(),
                lastModified: new Date().toISOString()
            });

            // Add to state
            const updatedBoards = [...boards, newBoard];
            
            this.state.setState({
                boards: updatedBoards,
                currentBoardId: newBoard.id,
                tasks: []
            });

            // Save to storage
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('board:created', { board: newBoard });
            eventBus.emit('board:switched', { boardId: newBoard.id });
            eventBus.emit('data:changed');

            return newBoard;

        } catch (error) {
            console.error('Failed to create board:', error);
            eventBus.emit('board:error', { operation: 'create', error: error.message });
            throw error;
        }
    }

    /**
     * Update an existing board
     * @param {string} boardId - Board ID to update
     * @param {Object} updates - Properties to update
     * @returns {Promise<Board>} Updated board
     */
    async updateBoard(boardId, updates) {
        try {
            if (!boardId || !updates) {
                throw new Error('Board ID and updates are required');
            }

            const boards = this.state.getState().boards;
            const boardIndex = boards.findIndex(b => b.id === boardId);

            if (boardIndex === -1) {
                throw new Error('Board not found');
            }

            const currentBoard = boards[boardIndex];

            // Validate name update if provided
            if (updates.name !== undefined) {
                if (typeof updates.name !== 'string' || updates.name.length > 50) {
                    throw new Error('Invalid board name');
                }

                const trimmedName = updates.name.trim();
                if (trimmedName.length === 0) {
                    throw new Error('Board name cannot be empty');
                }

                // Check for duplicate names (excluding current board)
                const duplicateBoard = boards.find(b => 
                    b.id !== boardId && 
                    b.name.trim().toLowerCase() === trimmedName.toLowerCase()
                );

                if (duplicateBoard) {
                    throw new Error('A board with this name already exists');
                }
            }

            // Create updated board
            const updatedBoard = createBoard({
                ...currentBoard,
                ...updates,
                lastModified: new Date().toISOString()
            });

            // Update in state
            boards[boardIndex] = updatedBoard;

            this.state.setState({
                boards: boards,
                tasks: this.state.getTasksForBoard(this.state.getState().currentBoardId)
            });

            // Save to storage
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('board:updated', { 
                board: updatedBoard, 
                changes: updates 
            });
            eventBus.emit('data:changed');

            return updatedBoard;

        } catch (error) {
            console.error('Failed to update board:', error);
            eventBus.emit('board:error', { operation: 'update', error: error.message });
            throw error;
        }
    }

    /**
     * Delete a board
     * @param {string} boardId - Board ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteBoard(boardId) {
        try {
            if (!boardId) {
                throw new Error('Board ID is required');
            }

            const boards = this.state.getState().boards;
            const boardIndex = boards.findIndex(b => b.id === boardId);

            if (boardIndex === -1) {
                throw new Error('Board not found');
            }

            const boardToDelete = boards[boardIndex];

            // Prevent deletion of default board
            if (boardToDelete.isDefault) {
                throw new Error('Cannot delete the default board');
            }

            // Prevent deletion if it's the only board
            if (boards.length <= 1) {
                throw new Error('Cannot delete the only board');
            }

            // Remove board from state
            const updatedBoards = boards.filter(b => b.id !== boardId);
            
            // If deleting current board, switch to first available
            let newCurrentBoardId = this.state.getState().currentBoardId;
            if (newCurrentBoardId === boardId) {
                newCurrentBoardId = updatedBoards[0]?.id || null;
            }

            this.state.setState({
                boards: updatedBoards,
                currentBoardId: newCurrentBoardId,
                tasks: this.state.getTasksForBoard(this.state.getState().currentBoardId)
            });

            // Save to storage
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('board:deleted', { 
                board: boardToDelete 
            });
            
            if (newCurrentBoardId !== this.state.getState().currentBoardId) {
                eventBus.emit('board:switched', { boardId: newCurrentBoardId });
            }
            
            eventBus.emit('data:changed');

            return true;

        } catch (error) {
            console.error('Failed to delete board:', error);
            eventBus.emit('board:error', { operation: 'delete', error: error.message });
            throw error;
        }
    }

    /**
     * Switch to a different board
     * @param {string} boardId - Board ID to switch to
     * @returns {Promise<Board>} Switched board
     */
    async switchToBoard(boardId) {
        try {
            if (!boardId) {
                throw new Error('Board ID is required');
            }

            const boards = this.state.getState().boards;
            const targetBoard = boards.find(b => b.id === boardId);

            if (!targetBoard) {
                throw new Error('Board not found');
            }

            // Don't switch if already on this board
            if (this.state.getState().currentBoardId === boardId) {
                return targetBoard;
            }

            // Update state
            this.state.setState({
                currentBoardId: boardId,
                tasks: targetBoard.tasks ? targetBoard.tasks.map(t => new Task(t)) : []
            });

            // Save current board selection
            await this.storage.save(this.state.getState());

            // Emit events
            eventBus.emit('board:switched', { boardId: boardId });
            eventBus.emit('data:changed');

            return targetBoard;

        } catch (error) {
            console.error('Failed to switch board:', error);
            eventBus.emit('board:error', { operation: 'switch', error: error.message });
            throw error;
        }
    }

    /**
     * Duplicate a board
     * @param {string} boardId - Board ID to duplicate
     * @param {string} newName - Name for the duplicated board
     * @returns {Promise<Board>} Duplicated board
     */
    async duplicateBoard(boardId, newName = null) {
        try {
            if (!boardId) {
                throw new Error('Board ID is required');
            }

            const boards = this.state.getState().boards;
            const sourceBoard = boards.find(b => b.id === boardId);

            if (!sourceBoard) {
                throw new Error('Board not found');
            }

            // Generate unique name if not provided
            const duplicatedName = newName || this.generateUniqueBoardName(
                `${sourceBoard.name} (Copy)`, 
                boards
            );

            // Create duplicate board data
            const duplicateBoardData = {
                name: duplicatedName,
                description: sourceBoard.description,
                color: sourceBoard.color,
                tasks: sourceBoard.tasks ? sourceBoard.tasks.map(task => ({
                    ...task,
                    id: generateUniqueId(), // Generate new IDs for tasks
                    createdDate: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                })) : [],
                archivedTasks: [],
                isDefault: false,
                isArchived: false
            };

            return await this.createBoard(duplicateBoardData);

        } catch (error) {
            console.error('Failed to duplicate board:', error);
            eventBus.emit('board:error', { operation: 'duplicate', error: error.message });
            throw error;
        }
    }

    /**
     * Archive a board
     * @param {string} boardId - Board ID to archive
     * @returns {Promise<boolean>} Success status
     */
    async archiveBoard(boardId) {
        try {
            if (!boardId) {
                throw new Error('Board ID is required');
            }

            const boards = this.state.getState().boards;
            const board = boards.find(b => b.id === boardId);

            if (!board) {
                throw new Error('Board not found');
            }

            if (board.isDefault) {
                throw new Error('Cannot archive the default board');
            }

            // Archive the board
            await this.updateBoard(boardId, { 
                isArchived: true,
                archivedDate: new Date().toISOString()
            });

            // Switch to different board if this was current
            const currentBoardId = this.state.getState().currentBoardId;
            if (currentBoardId === boardId) {
                const activeBoards = boards.filter(b => !b.isArchived && b.id !== boardId);
                if (activeBoards.length > 0) {
                    await this.switchToBoard(activeBoards[0].id);
                }
            }

            eventBus.emit('board:archived', { boardId });
            return true;

        } catch (error) {
            console.error('Failed to archive board:', error);
            eventBus.emit('board:error', { operation: 'archive', error: error.message });
            throw error;
        }
    }

    /**
     * Unarchive a board
     * @param {string} boardId - Board ID to unarchive
     * @returns {Promise<boolean>} Success status
     */
    async unarchiveBoard(boardId) {
        try {
            if (!boardId) {
                throw new Error('Board ID is required');
            }

            const updatedBoard = await this.updateBoard(boardId, { 
                isArchived: false 
            });

            // Remove archivedDate if it exists
            if (updatedBoard.archivedDate) {
                delete updatedBoard.archivedDate;
                await this.updateBoard(boardId, updatedBoard);
            }

            eventBus.emit('board:unarchived', { boardId });
            return true;

        } catch (error) {
            console.error('Failed to unarchive board:', error);
            eventBus.emit('board:error', { operation: 'unarchive', error: error.message });
            throw error;
        }
    }

    /**
     * Get all boards (active and archived)
     * @returns {Array<Board>} All boards
     */
    getAllBoards() {
        return this.state.getState().boards;
    }

    /**
     * Get active boards only
     * @returns {Array<Board>} Active boards
     */
    getActiveBoards() {
        return this.state.getState().boards.filter(b => !b.isArchived);
    }

    /**
     * Get archived boards only
     * @returns {Array<Board>} Archived boards
     */
    getArchivedBoards() {
        return this.state.getState().boards.filter(b => b.isArchived);
    }

    /**
     * Get current board
     * @returns {Board|null} Current board or null
     */
    getCurrentBoard() {
        const currentBoardId = this.state.getState().currentBoardId;
        if (!currentBoardId) return null;
        
        return this.state.getState().boards.find(b => b.id === currentBoardId) || null;
    }

    /**
     * Get board statistics
     * @param {string} boardId - Board ID
     * @returns {Object} Board statistics
     */
    getBoardStatistics(boardId) {
        try {
            const board = this.state.getState().boards.find(b => b.id === boardId);
            
            if (!board) {
                throw new Error('Board not found');
            }

            const tasks = board.tasks || [];
            const archivedTasks = board.archivedTasks || [];

            const stats = {
                boardId: boardId,
                boardName: board.name,
                totalTasks: tasks.length,
                todoTasks: tasks.filter(t => t.status === 'todo').length,
                doingTasks: tasks.filter(t => t.status === 'doing').length,
                doneTasks: tasks.filter(t => t.status === 'done').length,
                archivedTasks: archivedTasks.length,
                createdDate: board.createdDate,
                lastModified: board.lastModified,
                completionRate: tasks.length > 0 ? 
                    Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0
            };

            return stats;

        } catch (error) {
            console.error('Failed to get board statistics:', error);
            return null;
        }
    }

    /**
     * Generate a unique board name by appending numbers
     * @param {string} baseName - Base name to make unique
     * @param {Array<Board>} existingBoards - Existing boards to check against
     * @returns {string} Unique board name
     */
    generateUniqueBoardName(baseName, existingBoards) {
        let counter = 1;
        let testName = baseName;

        while (existingBoards.some(b => b.name.toLowerCase() === testName.toLowerCase())) {
            counter++;
            testName = `${baseName} ${counter}`;
        }

        return testName;
    }

    /**
     * Create default board if none exists
     * @returns {Promise<Board>} Default board
     */
    async createDefaultBoard() {
        try {
            const boards = this.state.getState().boards;
            
            if (boards.length > 0) {
                return boards.find(b => b.isDefault) || boards[0];
            }

            return await this.createBoard({
                name: 'My Tasks',
                description: 'Default task board',
                color: '#6750a4'
            });

        } catch (error) {
            console.error('Failed to create default board:', error);
            throw error;
        }
    }
}

