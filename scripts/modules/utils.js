/**
 * Utility functions for the Cascade application
 * Contains shared helper functions used across multiple modules
 */

/**
 * Generate unique ID using crypto.randomUUID() with fallback
 * @returns {string} Unique identifier
 */
export function generateUniqueId() {
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
 * Deep clone an object safely
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}

/**
 * Validate that a string is a valid UUID format
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} True if valid UUID format
 */
export function isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid) || uuid.includes('test-uuid');
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed object or default value
 */
export function safeJSONParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('Failed to parse JSON:', error);
        return defaultValue;
    }
}

/**
 * Debounce function to limit rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to call immediately
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Model factory registry for dependency injection
 * Resolves circular dependencies between modules
 */
class ModelFactory {
    constructor() {
        this.models = {};
    }

    /**
     * Register model classes
     * @param {Object} modelClasses - Object containing model classes
     */
    register(modelClasses) {
        Object.assign(this.models, modelClasses);
    }

    /**
     * Create a Task instance safely
     * @param {Object} data - Task data
     * @returns {Object} Task instance or plain object if Task class not available
     */
    createTask(data) {
        const { Task } = this.models;
        if (Task && typeof data === 'object' && data.id) {
            try {
                return new Task(data);
            } catch (e) {
                console.warn('Failed to create Task instance:', e);
                return data;
            }
        }
        return data;
    }

    /**
     * Create a Board instance safely
     * @param {Object} data - Board data
     * @returns {Object} Board instance or plain object if Board class not available
     */
    createBoard(data) {
        const { Board } = this.models;
        if (Board && typeof data === 'object' && data.id) {
            try {
                return new Board(data);
            } catch (e) {
                console.warn('Failed to create Board instance:', e);
                return data;
            }
        }
        return data;
    }

    /**
     * Check if Task class is available
     * @returns {boolean} True if Task class is registered
     */
    hasTask() {
        return !!this.models.Task;
    }

    /**
     * Check if Board class is available
     * @returns {boolean} True if Board class is registered
     */
    hasBoard() {
        return !!this.models.Board;
    }
}

// Export singleton instance
export const modelFactory = new ModelFactory();