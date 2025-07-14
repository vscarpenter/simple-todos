import eventBus from './eventBus.js';

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
function generateUniqueId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Board model for organizing tasks into projects
 */
export class Board {
    constructor(data = {}) {
        this.id = data.id || generateUniqueId();
        this.name = data.name || 'Untitled Board';
        this.description = data.description || '';
        this.color = data.color || '#6750a4';
        this.tasks = data.tasks || [];
        this.createdDate = data.createdDate || new Date().toISOString();
        this.lastModified = data.lastModified || new Date().toISOString();
        this.isArchived = data.isArchived || false;
        this.isDefault = data.isDefault || false;
        
        this.validate();
    }

    /**
     * Validate board data
     * @throws {Error} If validation fails
     */
    validate() {
        if (!this.name || typeof this.name !== 'string' || this.name.trim().length === 0) {
            throw new Error('Board name is required and must be a non-empty string');
        }
        
        if (this.name.length > 50) {
            throw new Error('Board name cannot exceed 50 characters');
        }
        
        if (this.description && this.description.length > 200) {
            throw new Error('Board description cannot exceed 200 characters');
        }
        
        if (typeof this.isArchived !== 'boolean') {
            throw new Error('isArchived must be a boolean');
        }
        
        if (typeof this.isDefault !== 'boolean') {
            throw new Error('isDefault must be a boolean');
        }
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
            lastModified: new Date().toISOString()
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
        const newData = {
            ...this.toJSON(),
            id: generateUniqueId(),
            name: newName || `${this.name} (Copy)`,
            tasks: [...this.tasks], // Create a copy of tasks array
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            isDefault: false
        };
        
        return new Board(newData);
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
    constructor(data = {}) {
        this.id = data.id || generateUniqueId();
        this.text = data.text || '';
        this.status = data.status || 'todo';
        this.createdDate = data.createdDate || new Date().toISOString().split('T')[0];
        this.lastModified = data.lastModified || new Date().toISOString();
        
        this.validate();
    }

    /**
     * Validate task data
     * @throws {Error} If validation fails
     */
    validate() {
        const errors = [];
        
        if (!this.text || typeof this.text !== 'string' || this.text.trim().length === 0) {
            errors.push('Task text is required and must be a non-empty string');
        }
        
        if (this.text && this.text.length > 200) {
            errors.push('Task text cannot exceed 200 characters');
        }
        
        if (!['todo', 'doing', 'done'].includes(this.status)) {
            errors.push(`Invalid status: ${this.status}. Must be 'todo', 'doing', or 'done'`);
        }
        
        if (this.createdDate && !/^\d{4}-\d{2}-\d{2}$/.test(this.createdDate)) {
            errors.push(`Invalid date format: ${this.createdDate}. Expected YYYY-MM-DD`);
        }
        
        if (errors.length > 0) {
            throw new Error(`Task validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Update task properties
     * @param {Object} updates - Properties to update
     * @returns {Task} This task instance for chaining
     */
    update(updates) {
        const oldData = this.toJSON();
        
        Object.assign(this, updates);
        this.lastModified = new Date().toISOString();
        
        try {
            this.validate();
        } catch (error) {
            // Revert changes if validation fails
            Object.assign(this, oldData);
            throw error;
        }
        
        eventBus.emit('task:updated', {
            task: this,
            oldData,
            updates
        });
        
        return this;
    }

    /**
     * Move task to a different status
     * @param {string} newStatus - New status
     * @returns {Task} This task instance for chaining
     */
    moveTo(newStatus) {
        if (!['todo', 'doing', 'done'].includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }
        
        const oldStatus = this.status;
        this.status = newStatus;
        this.lastModified = new Date().toISOString();
        
        // Set completedDate when task is moved to done
        if (newStatus === 'done' && oldStatus !== 'done') {
            this.completedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        }
        
        // Clear completedDate when task is moved away from done
        if (newStatus !== 'done' && oldStatus === 'done') {
            this.completedDate = null;
        }
        
        eventBus.emit('task:moved', {
            task: this,
            oldStatus,
            newStatus
        });
        
        return this;
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
            lastModified: this.lastModified
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
 * @param {Object} data - Board data
 * @returns {Board} Board instance
 */
export function createBoard(data) {
    return new Board(data);
}

/**
 * Factory function to create task
 * @param {Object} data - Task data
 * @returns {Task} Task instance
 */
export function createTask(data) {
    return new Task(data);
}

/**
 * Factory function to create column
 * @param {Object} data - Column data
 * @returns {Column} Column instance
 */
export function createColumn(data) {
    return new Column(data);
}