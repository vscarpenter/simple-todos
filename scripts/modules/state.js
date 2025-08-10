import eventBus from './eventBus.js';
import { Task, Board, createTask } from './models.js';

/**
 * Centralized application state with reactive updates
 */
export class AppState {
    constructor() {
        this.state = {
            boards: [],
            currentBoardId: null,
            tasks: [], // tasks for current board (computed)
            filter: 'all' // all, todo, doing, done
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
     * @param {Object} options - Options: { silent: boolean }
     */
    setState(updates, options = {}) {
        const { silent = false } = options;
        
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
            try {
                return createTask(taskData);
            } catch (e) {
                console.warn('Failed to create Task instance, using raw data:', e);
                return taskData;
            }
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
                try {
                    return new Board({ ...board.toJSON(), ...updates });
                } catch (e) {
                    console.warn('Failed to create Board instance, using plain object:', e);
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
                const tasks = (updatedBoard.tasks || []).map(taskData => {
                    if (typeof taskData === 'object' && taskData.id) {
                        try {
                            return new Task(taskData);
                        } catch (e) {
                            console.warn('Failed to create Task instance:', e);
                            return taskData;
                        }
                    }
                    return taskData;
                });
                
                stateUpdates.tasks = tasks;
            } else {
                console.warn('⚠️ State: Updated board not found, setting empty tasks');
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
     * Reset state to initial values
     */
    reset() {
        this.state = {
            boards: [],
            currentBoardId: null,
            tasks: [],
            filter: 'all'
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