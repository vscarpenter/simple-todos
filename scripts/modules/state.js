import eventBus from './eventBus.js';
import { debugLog } from './settings.js';

/**
 * Centralized application state with reactive updates
 */
class AppState {
    constructor() {
        this.state = {
            boards: [],
            currentBoardId: null,
            tasks: [], // tasks for current board (computed)
            filter: 'all', // all, todo, doing, done
            history: [],
            historyIndex: -1,
            maxHistorySize: 50
        };
        
        this.listeners = new Map();
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get specific part of state
     * @param {string} key - State key
     * @returns {*} State value
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Update state and emit change events
     * @param {Object} updates - State updates
     * @param {Object} options - Options: { silent: boolean, addToHistory: boolean }
     */
    setState(updates, options = {}) {
        const { silent = false, addToHistory = true } = options;
        
        // Save current state to history if needed
        if (addToHistory && this.historyIndex === this.state.history.length - 1) {
            this.addToHistory();
        }
        
        const previousState = { ...this.state };
        
        // Apply updates
        this.state = { ...this.state, ...updates };
        
        if (!silent) {
            // Emit specific change events
            Object.keys(updates).forEach(key => {
                eventBus.emit(`state:${key}Changed`, {
                    key,
                    value: this.state[key],
                    previousValue: previousState[key]
                });
            });
            
            // Emit general state change
            eventBus.emit('state:changed', {
                previousState,
                currentState: this.getState(),
                updates
            });
        }
    }

    /**
     * Add current state to history
     */
    addToHistory() {
        // Remove any history after current index (for redo)
        this.state.history = this.state.history.slice(0, this.historyIndex + 1);
        
        // Add current state (excluding history itself)
        const stateSnapshot = { ...this.state };
        delete stateSnapshot.history;
        delete stateSnapshot.historyIndex;
        
        this.state.history.push(stateSnapshot);
        
        // Limit history size
        if (this.state.history.length > this.maxHistorySize) {
            this.state.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    /**
     * Undo last state change
     * @returns {boolean} True if undo was successful
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const previousState = this.state.history[this.historyIndex];
            
            this.state = {
                ...previousState,
                history: this.state.history,
                historyIndex: this.historyIndex
            };
            
            eventBus.emit('state:undo', this.getState());
            eventBus.emit('state:changed', {
                previousState: this.state.history[this.historyIndex + 1] || {},
                currentState: this.getState(),
                isUndo: true
            });
            return true;
        }
        return false;
    }

    /**
     * Redo last undone state change
     * @returns {boolean} True if redo was successful
     */
    redo() {
        if (this.historyIndex < this.state.history.length - 1) {
            this.historyIndex++;
            const nextState = this.state.history[this.historyIndex];
            
            this.state = {
                ...nextState,
                history: this.state.history,
                historyIndex: this.historyIndex
            };
            
            eventBus.emit('state:redo', this.getState());
            eventBus.emit('state:changed', {
                previousState: this.state.history[this.historyIndex - 1] || {},
                currentState: this.getState(),
                isRedo: true
            });
            return true;
        }
        return false;
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.historyIndex > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo() {
        return this.historyIndex < this.state.history.length - 1;
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch (optional)
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (typeof key === 'function') {
            // Subscribe to all changes
            callback = key;
            return eventBus.on('state:changed', callback);
        } else {
            // Subscribe to specific key changes
            return eventBus.on(`state:${key}Changed`, callback);
        }
    }

    /**
     * Get current board
     * @returns {Object|null} Current board or null
     */
    getCurrentBoard() {
        if (!this.state.currentBoardId) return null;
        return this.state.boards.find(board => board.id === this.state.currentBoardId) || null;
    }

    /**
     * Set current board
     * @param {string} boardId - Board ID to set as current
     */
    setCurrentBoard(boardId) {
        const board = this.state.boards ? this.state.boards.find(b => b.id === boardId) : null;
        if (!board) {
            throw new Error(`Board with ID ${boardId} not found`);
        }
        
        // Convert board tasks to Task instances for the state
        const tasks = board.tasks ? board.tasks.map(taskData => {
            // Import Task class dynamically since we can't import at top due to circular deps
            const { Task } = window.cascadeModels || {};
            if (Task && typeof taskData === 'object' && taskData.id) {
                try {
                    return new Task(taskData);
                } catch (e) {
                    debugLog.warn('Failed to create Task instance:', e);
                    return taskData;
                }
            }
            return taskData;
        }) : [];
        
        this.setState({
            currentBoardId: boardId,
            tasks: tasks
        });
    }

    /**
     * Get tasks for a specific board
     * @param {string} boardId - Board ID
     * @returns {Array} Tasks for the board
     */
    getTasksForBoard(boardId) {
        // In the new structure, tasks are stored per board
        // For backward compatibility, we'll check if tasks exist at root level
        if (this.state.tasks && !this.state.currentBoardId) {
            return this.state.tasks; // Legacy single board mode
        }
        
        const board = this.state.boards ? this.state.boards.find(b => b.id === boardId) : null;
        return board ? (board.tasks || []) : [];
    }

    /**
     * Add board to state
     * @param {Object} board - Board data
     */
    addBoard(board) {
        const boards = [...this.state.boards, board];
        const updates = { boards };
        
        // If this is the first board or no current board is set, make it current
        if (!this.state.currentBoardId || this.state.boards.length === 0) {
            updates.currentBoardId = board.id;
            updates.tasks = board.tasks || [];
        }
        
        this.setState(updates);
    }

    /**
     * Update board in state
     * @param {string} boardId - Board ID
     * @param {Object} updates - Board updates
     */
    updateBoard(boardId, updates) {
        const boards = this.state.boards.map(board => {
            if (board.id === boardId) {
                // Create new Board instance to ensure proper validation
                const { Board } = window.cascadeModels || {};
                if (Board) {
                    try {
                        return new Board({ ...board.toJSON(), ...updates });
                    } catch (e) {
                        debugLog.warn('Failed to create Board instance, using plain object:', e);
                        return { ...board, ...updates };
                    }
                } else {
                    return { ...board, ...updates };
                }
            }
            return board;
        });
        
        const stateUpdates = { boards };
        
        // If updating current board, update tasks too and ensure synchronization
        if (boardId === this.state.currentBoardId) {
            const updatedBoard = boards.find(b => b.id === boardId);
            if (updatedBoard) {
                // Convert board tasks to Task instances for consistency
                const { Task } = window.cascadeModels || {};
                const tasks = (updatedBoard.tasks || []).map(taskData => {
                    if (Task && typeof taskData === 'object' && taskData.id) {
                        try {
                            return new Task(taskData);
                        } catch (e) {
                            debugLog.warn('Failed to create Task instance:', e);
                            return taskData;
                        }
                    }
                    return taskData;
                });
                stateUpdates.tasks = tasks;
            } else {
                stateUpdates.tasks = [];
            }
        }
        
        this.setState(stateUpdates);
    }

    /**
     * Remove board from state
     * @param {string} boardId - Board ID to remove
     */
    removeBoard(boardId) {
        const boards = this.state.boards.filter(board => board.id !== boardId);
        const updates = { boards };
        
        // If removing current board, switch to another board or create default
        if (boardId === this.state.currentBoardId) {
            if (boards.length > 0) {
                const newCurrentBoard = boards.find(b => !b.isArchived) || boards[0];
                updates.currentBoardId = newCurrentBoard.id;
                updates.tasks = newCurrentBoard.tasks || [];
            } else {
                updates.currentBoardId = null;
                updates.tasks = [];
            }
        }
        
        this.setState(updates);
    }

    /**
     * Update tasks for current board
     * @param {Array} tasks - Updated tasks array
     */
    updateCurrentBoardTasks(tasks) {
        if (!this.state.currentBoardId) {
            // Legacy mode - just update tasks
            this.setState({ tasks });
            return;
        }
        
        // Update tasks in the current board
        this.updateBoard(this.state.currentBoardId, { tasks });
    }

    /**
     * Get all non-archived boards
     * @returns {Array} Non-archived boards
     */
    getActiveBoards() {
        return this.state.boards.filter(board => !board.isArchived);
    }

    /**
     * Get all archived boards
     * @returns {Array} Archived boards
     */
    getArchivedBoards() {
        return this.state.boards.filter(board => board.isArchived);
    }

    /**
     * Save current state to history
     */
    saveState() {
        this.addToHistory();
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.state = {
            boards: [],
            currentBoardId: null,
            tasks: [],
            filter: 'all',
            history: [],
            historyIndex: -1,
            maxHistorySize: 50
        };
        
        eventBus.emit('state:reset');
        eventBus.emit('state:changed', {
            previousState: {},
            currentState: this.getState(),
            isReset: true
        });
    }
}

// Export singleton instance
export default new AppState();