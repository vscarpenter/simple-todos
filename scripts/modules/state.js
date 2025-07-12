import eventBus from './eventBus.js';

/**
 * Centralized application state with reactive updates
 */
class AppState {
    constructor() {
        this.state = {
            tasks: [],
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
     * Reset state to initial values
     */
    reset() {
        this.state = {
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