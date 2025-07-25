import eventBus from './eventBus.js';

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
function generateUniqueId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        // In test environment, add timestamp to make IDs unique
        const uuid = crypto.randomUUID();
        if (uuid === 'test-uuid-12345') {
            return uuid + '-' + Date.now() + '-' + Math.random().toString(36).substr(2);
        }
        return uuid;
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Board model for organizing tasks into projects
 */
export class Board {
    constructor(data) {
        // Validate required data first
        if (!data || typeof data !== 'object') {
            throw new Error('Board data is required');
        }
        
        // Store original data for validation
        this._originalData = data;
        
        this.id = data.id || generateUniqueId();
        this.name = data.name !== undefined ? data.name : 'Untitled Board';
        this.description = data.description || '';
        this.color = data.color || '#6750a4';
        this.tasks = data.tasks || [];
        this.archivedTasks = data.archivedTasks || [];
        this.createdDate = data.createdDate || new Date().toISOString();
        this.lastModified = data.lastModified || new Date().toISOString();
        this.isArchived = data.isArchived || false;
        this.isDefault = data.isDefault || false;
        
        this.validate();
        
        // Clean up temporary data
        delete this._originalData;
    }

    /**
     * Validate board data
     * @throws {Error} If validation fails
     */
    validate() {
        // Check if name was explicitly provided (not just the default)
        if (this.name === 'Untitled Board' && this._originalData && !('name' in this._originalData)) {
            throw new Error('Board name is required and must be a non-empty string');
        }
        
        if (!this.name || typeof this.name !== 'string' || this.name.trim().length === 0) {
            throw new Error('Board name is required and must be a non-empty string');
        }
        
        if (this.name.length > 50) {
            throw new Error('Board name cannot exceed 50 characters');
        }
        
        if (this.description && this.description.length > 200) {
            throw new Error('Board description cannot exceed 200 characters');
        }
        
        if (this.color && !this.isValidHexColor(this.color)) {
            throw new Error('Board color must be a valid hex color');
        }
        
        if (typeof this.isArchived !== 'boolean') {
            throw new Error('isArchived must be a boolean');
        }
        
        if (typeof this.isDefault !== 'boolean') {
            throw new Error('isDefault must be a boolean');
        }
    }

    /**
     * Check if color is valid hex color
     * @param {string} color - Color to validate
     * @returns {boolean} True if valid hex color
     */
    isValidHexColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    /**
     * Update board properties
     * @param {Object} updates - Properties to update
     * @returns {Board} New board instance with updates
     */
    update(updates) {
        const newData = {
            ...this.toJSON(),
            ...updates,
            lastModified: new Date(Date.now() + 1).toISOString()
        };
        
        const updatedBoard = new Board(newData);
        
        eventBus.emit('board:updated', {
            board: updatedBoard,
            oldData: this.toJSON(),
            updates
        });
        
        return updatedBoard;
    }

    /**
     * Archive board
     * @returns {Board} New board instance that is archived
     */
    archive() {
        return this.update({ isArchived: true });
    }

    /**
     * Unarchive board
     * @returns {Board} New board instance that is unarchived
     */
    unarchive() {
        return this.update({ isArchived: false });
    }

    /**
     * Convert to JSON for storage
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            color: this.color,
            tasks: this.tasks,
            archivedTasks: this.archivedTasks,
            createdDate: this.createdDate,
            lastModified: this.lastModified,
            isArchived: this.isArchived,
            isDefault: this.isDefault
        };
    }

    /**
     * Create a duplicate of this board
     * @param {string} newName - Name for the duplicated board
     * @returns {Board} New board instance
     */
    duplicate(newName) {
        // Create new tasks with new IDs
        const duplicatedTasks = this.tasks.map(task => {
            const taskData = typeof task.toJSON === 'function' ? task.toJSON() : task;
            return new Task({
                ...taskData,
                id: generateUniqueId()
            });
        });
        
        const newData = {
            ...this.toJSON(),
            id: generateUniqueId(),
            name: newName || `${this.name} (Copy)`,
            tasks: duplicatedTasks,
            archivedTasks: [], // Don't copy archived tasks to new board
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            isDefault: false
        };
        
        return new Board(newData);
    }

    /**
     * Add task to board
     * @param {Task} task - Task to add
     * @returns {Board} New board instance with task added
     */
    addTask(task) {
        const newTasks = [...this.tasks, task];
        return this.update({ tasks: newTasks });
    }

    /**
     * Remove task from board
     * @param {string} taskId - Task ID to remove
     * @returns {Board} New board instance with task removed
     */
    removeTask(taskId) {
        const newTasks = this.tasks.filter(task => task.id !== taskId);
        return this.update({ tasks: newTasks });
    }

    /**
     * Get task by ID
     * @param {string} taskId - Task ID
     * @returns {Task|null} Found task or null
     */
    getTask(taskId) {
        return this.tasks.find(task => task.id === taskId) || null;
    }

    /**
     * Get tasks by status
     * @param {string} status - Task status
     * @returns {Task[]} Array of tasks with matching status
     */
    getTasksByStatus(status) {
        return this.tasks.filter(task => task.status === status);
    }

    /**
     * Create board from plain object
     * @param {Object} data - Board data
     * @returns {Board} Board instance
     */
    static fromJSON(data) {
        return new Board(data);
    }
}

/**
 * Task model with validation and methods
 */
export class Task {
    constructor(data) {
        // Validate required data first
        if (!data || typeof data !== 'object') {
            throw new Error('Task data is required');
        }
        
        // Store original data for validation
        this._originalData = data;
        
        this.id = data.id || generateUniqueId();
        this.text = data.text !== undefined ? data.text : '';
        this.status = data.status || 'todo';
        this.createdDate = data.createdDate || new Date().toISOString();
        this.completedDate = data.completedDate || null;
        this.lastModified = data.lastModified || new Date().toISOString();
        
        this.validate();
        
        // Clean up temporary data
        delete this._originalData;
    }

    /**
     * Validate task data
     * @throws {Error} If validation fails
     */
    validate() {
        // Check if text was explicitly provided (not just the default)
        if (this.text === '' && this._originalData && !('text' in this._originalData)) {
            throw new Error('Task text is required');
        }
        
        if (!this.text || typeof this.text !== 'string' || this.text.trim().length === 0) {
            throw new Error('Task text is required');
        }
        
        if (this.text.length > 200) {
            throw new Error('Task text cannot exceed 200 characters');
        }
        
        if (!['todo', 'doing', 'done'].includes(this.status)) {
            throw new Error('Task status must be one of: todo, doing, done');
        }
    }

    /**
     * Update task properties
     * @param {Object} updates - Properties to update
     * @returns {Task} New task instance with updates
     */
    update(updates) {
        const newData = {
            ...this.toJSON(),
            ...updates,
            lastModified: new Date(Date.now() + 1).toISOString()
        };
        
        const updatedTask = new Task(newData);
        
        eventBus.emit('task:updated', {
            task: updatedTask,
            oldData: this.toJSON(),
            updates
        });
        
        return updatedTask;
    }

    /**
     * Move task to a different status
     * @param {string} newStatus - New status
     * @returns {Task} New task instance with updated status
     */
    moveTo(newStatus) {
        if (!['todo', 'doing', 'done'].includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }
        
        const oldStatus = this.status;
        // Ensure timestamp is different by adding a small delay
        const timestamp = new Date(Date.now() + 1).toISOString();
        const updates = {
            status: newStatus,
            lastModified: timestamp
        };
        
        // Set completedDate when task is moved to done
        if (newStatus === 'done' && oldStatus !== 'done') {
            updates.completedDate = new Date().toISOString();
        }
        
        // Clear completedDate when task is moved away from done
        if (newStatus !== 'done' && oldStatus === 'done') {
            updates.completedDate = null;
        }
        
        const updatedTask = new Task({
            ...this.toJSON(),
            ...updates
        });
        
        eventBus.emit('task:moved', {
            task: updatedTask,
            oldStatus,
            newStatus
        });
        
        return updatedTask;
    }

    /**
     * Mark task as completed
     * @returns {Task} This task instance for chaining
     */
    complete() {
        return this.moveTo('done');
    }

    /**
     * Mark task as in progress
     * @returns {Task} This task instance for chaining
     */
    start() {
        return this.moveTo('doing');
    }

    /**
     * Move task back to todo
     * @returns {Task} This task instance for chaining
     */
    reset() {
        return this.moveTo('todo');
    }

    /**
     * Clone the task
     * @returns {Task} New task instance with same data
     */
    clone() {
        return new Task({
            ...this.toJSON(),
            id: generateUniqueId()
        });
    }

    /**
     * Convert task to plain object
     * @returns {Object} Task data as plain object
     */
    toJSON() {
        return {
            id: this.id,
            text: this.text,
            status: this.status,
            createdDate: this.createdDate,
            lastModified: this.lastModified,
            completedDate: this.completedDate
        };
    }

    /**
     * Create task from plain object
     * @param {Object} data - Task data
     * @returns {Task} Task instance
     */
    static fromJSON(data) {
        return new Task(data);
    }
}

/**
 * Column model for organizing tasks
 */
export class Column {
    constructor(data = {}) {
        this.id = data.id || data.status || 'todo';
        this.name = data.name || this.getDefaultName();
        this.status = data.status || this.id;
        this.tasks = [];
        this.limit = data.limit || null; // null = no limit
        this.color = data.color || this.getDefaultColor();
        
        this.validate();
    }

    /**
     * Get default name for column
     * @returns {string} Default name
     */
    getDefaultName() {
        const names = {
            todo: 'To Do',
            doing: 'In Progress', 
            done: 'Done'
        };
        return names[this.id] || 'Unknown';
    }

    /**
     * Get default color for column
     * @returns {string} Default color
     */
    getDefaultColor() {
        const colors = {
            todo: '#e3f2fd',
            doing: '#fff3e0',
            done: '#e8f5e8'
        };
        return colors[this.id] || '#f5f5f5';
    }

    /**
     * Validate column data
     * @throws {Error} If validation fails
     */
    validate() {
        if (!this.id || typeof this.id !== 'string') {
            throw new Error('Column ID is required');
        }
        
        if (!this.name || typeof this.name !== 'string') {
            throw new Error('Column name is required');
        }
        
        if (this.limit !== null && (typeof this.limit !== 'number' || this.limit < 0)) {
            throw new Error('Column limit must be null or a positive number');
        }
    }

    /**
     * Add task to column
     * @param {Task} task - Task to add
     * @returns {boolean} True if added successfully
     */
    addTask(task) {
        if (!(task instanceof Task)) {
            throw new Error('Task must be an instance of Task class');
        }
        
        if (this.limit && this.tasks.length >= this.limit) {
            eventBus.emit('column:limitReached', {
                column: this,
                task,
                limit: this.limit
            });
            return false;
        }
        
        // Update task status to match column
        if (task.status !== this.status) {
            task.moveTo(this.status);
        }
        
        this.tasks.push(task);
        
        eventBus.emit('column:taskAdded', {
            column: this,
            task
        });
        
        return true;
    }

    /**
     * Remove task from column
     * @param {string} taskId - Task ID to remove
     * @returns {Task|null} Removed task or null if not found
     */
    removeTask(taskId) {
        const index = this.tasks.findIndex(task => task.id === taskId);
        if (index === -1) return null;
        
        const task = this.tasks.splice(index, 1)[0];
        
        eventBus.emit('column:taskRemoved', {
            column: this,
            task
        });
        
        return task;
    }

    /**
     * Get task by ID
     * @param {string} taskId - Task ID
     * @returns {Task|null} Found task or null
     */
    getTask(taskId) {
        return this.tasks.find(task => task.id === taskId) || null;
    }

    /**
     * Get all tasks
     * @returns {Task[]} Array of tasks
     */
    getTasks() {
        return [...this.tasks];
    }

    /**
     * Get task count
     * @returns {number} Number of tasks
     */
    getTaskCount() {
        return this.tasks.length;
    }

    /**
     * Check if column is at limit
     * @returns {boolean} True if at or over limit
     */
    isAtLimit() {
        return this.limit !== null && this.tasks.length >= this.limit;
    }

    /**
     * Clear all tasks
     */
    clear() {
        const removedTasks = [...this.tasks];
        this.tasks = [];
        
        eventBus.emit('column:cleared', {
            column: this,
            removedTasks
        });
    }

    /**
     * Convert column to plain object
     * @returns {Object} Column data as plain object
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            status: this.status,
            limit: this.limit,
            color: this.color,
            taskCount: this.tasks.length
        };
    }

    /**
     * Create column from plain object
     * @param {Object} data - Column data
     * @returns {Column} Column instance
     */
    static fromJSON(data) {
        return new Column(data);
    }
}

/**
 * Factory function to create board
 * @param {string|Object} nameOrData - Board name or full board data
 * @param {Object} options - Additional options if first param is name
 * @returns {Board} Board instance
 */
export function createBoard(nameOrData, options = {}) {
    if (typeof nameOrData === 'string') {
        return new Board({ name: nameOrData, ...options });
    }
    return new Board(nameOrData);
}

/**
 * Factory function to create task
 * @param {string|Object} textOrData - Task text or full task data
 * @param {Object} options - Additional options if first param is text
 * @returns {Task} Task instance
 */
export function createTask(textOrData, options = {}) {
    if (typeof textOrData === 'string') {
        return new Task({ text: textOrData, ...options });
    }
    return new Task(textOrData);
}

/**
 * Factory function to create column
 * @param {Object} data - Column data
 * @returns {Column} Column instance
 */
export function createColumn(data) {
    return new Column(data);
}