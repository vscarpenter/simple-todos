import eventBus from './eventBus.js';
import accessibility from './accessibility.js';

/**
 * DOM manipulation and event delegation module
 */
class DOMManager {
    constructor() {
        this.elements = {};
        this.delegateHandlers = new Map();
        this.initialized = false;
    }

    /**
     * Initialize DOM manager
     */
    init() {
        if (this.initialized) return;
        
        this.cacheElements();
        this.setupEventDelegation();
        this.setupGlobalEventListeners();
        
        this.initialized = true;
        eventBus.emit('dom:initialized');
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            // Form elements
            todoForm: document.getElementById('todo-form'),
            todoInput: document.getElementById('todo-input'),
            
            // Column elements
            todoList: document.getElementById('todo-list'),
            doingList: document.getElementById('doing-list'),
            doneList: document.getElementById('done-list'),
            
            // Counter elements
            todoCount: document.getElementById('todo-count'),
            doingCount: document.getElementById('doing-count'),
            doneCount: document.getElementById('done-count'),
            
            // Action buttons
            importButton: document.getElementById('import-button'),
            importFileInput: document.getElementById('import-file'),
            exportButton: document.getElementById('export-button'),
            archiveButton: document.getElementById('archive-button'),
            settingsButton: document.getElementById('settings-button'),
            newTaskBtn: document.getElementById('new-task-btn'),
            
            // Modal elements
            customModal: document.getElementById('custom-modal'),
            modalTitle: document.getElementById('modal-title'),
            modalMessage: document.getElementById('modal-message'),
            modalInput: document.getElementById('modal-input'),
            modalConfirm: document.getElementById('modal-confirm'),
            modalCancel: document.getElementById('modal-cancel')
        };
        
        // Remove null elements
        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key]) {
                delete this.elements[key];
            }
        });
    }

    /**
     * Setup event delegation for better performance
     */
    setupEventDelegation() {
        // Delegate task actions (edit, delete, move, archive)
        this.delegate('click', '[data-action]', (event, element) => {
            const action = element.dataset.action;
            const taskId = element.dataset.taskId;
            const targetStatus = element.dataset.targetStatus;
            
            event.preventDefault();
            
            switch (action) {
                case 'edit':
                    eventBus.emit('task:edit', { taskId });
                    break;
                case 'delete':
                    eventBus.emit('task:delete', { taskId });
                    break;
                case 'move':
                    eventBus.emit('task:move', { taskId, targetStatus });
                    break;
                case 'archive':
                    eventBus.emit('task:archive', { taskId });
                    break;
                case 'complete':
                    eventBus.emit('task:complete', { taskId });
                    break;
                case 'start':
                    eventBus.emit('task:start', { taskId });
                    break;
                case 'reset':
                    eventBus.emit('task:reset', { taskId });
                    break;
            }
        });

        // Delegate drag and drop events
        this.delegate('dragstart', '.task-card', (event, element) => {
            const taskId = element.dataset.taskId;
            event.dataTransfer.setData('text/plain', taskId);
            element.classList.add('dragging');
            eventBus.emit('drag:start', { taskId, element });
        });

        this.delegate('dragend', '.task-card', (event, element) => {
            element.classList.remove('dragging');
            eventBus.emit('drag:end', { element });
        });
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Form submission
        if (this.elements.todoForm) {
            this.elements.todoForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const text = this.elements.todoInput?.value?.trim();
                if (text) {
                    eventBus.emit('task:create', { text });
                }
            });
        }

        // Import/Export buttons
        if (this.elements.importButton) {
            this.elements.importButton.addEventListener('click', () => {
                this.elements.importFileInput?.click();
            });
        }

        if (this.elements.importFileInput) {
            this.elements.importFileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    eventBus.emit('tasks:import', { file });
                    event.target.value = ''; // Reset file input
                }
            });
        }

        if (this.elements.exportButton) {
            this.elements.exportButton.addEventListener('click', () => {
                eventBus.emit('tasks:export');
            });
        }

        // Archive and settings buttons
        if (this.elements.archiveButton) {
            this.elements.archiveButton.addEventListener('click', () => {
                eventBus.emit('tasks:archiveCompleted');
            });
        }

        if (this.elements.settingsButton) {
            this.elements.settingsButton.addEventListener('click', () => {
                eventBus.emit('settings:show');
            });
        }

        // New task button
        if (this.elements.newTaskBtn) {
            this.elements.newTaskBtn.addEventListener('click', () => {
                this.focusTaskInput();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + Z: Undo
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                eventBus.emit('app:undo');
            }
            
            // Ctrl/Cmd + Shift + Z: Redo
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
                event.preventDefault();
                eventBus.emit('app:redo');
            }
            
            // Ctrl/Cmd + N: New task (focus input)
            if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
                event.preventDefault();
                this.focusTaskInput();
            }
            
            // Escape: Close modal
            if (event.key === 'Escape') {
                this.hideModal();
            }
        });

        // Setup drag and drop zones
        this.setupDropZones();
    }

    /**
     * Setup drop zones for columns
     */
    setupDropZones() {
        const columns = [this.elements.todoList, this.elements.doingList, this.elements.doneList];
        
        columns.forEach(column => {
            if (!column) return;
            
            column.addEventListener('dragover', (event) => {
                event.preventDefault();
                column.classList.add('drag-over');
            });
            
            column.addEventListener('dragleave', (event) => {
                // Only remove if actually leaving the column
                if (!column.contains(event.relatedTarget)) {
                    column.classList.remove('drag-over');
                }
            });
            
            column.addEventListener('drop', (event) => {
                event.preventDefault();
                column.classList.remove('drag-over');
                
                const taskId = event.dataTransfer.getData('text/plain');
                const targetStatus = column.dataset.status;
                
                if (taskId && targetStatus) {
                    eventBus.emit('task:drop', { taskId, targetStatus });
                }
            });
        });
    }

    /**
     * Event delegation helper
     * @param {string} eventType - Event type
     * @param {string} selector - CSS selector
     * @param {Function} handler - Event handler
     */
    delegate(eventType, selector, handler) {
        const delegateHandler = (event) => {
            const element = event.target.closest(selector);
            if (element) {
                handler(event, element);
            }
        };
        
        document.addEventListener(eventType, delegateHandler);
        
        // Store for cleanup if needed
        this.delegateHandlers.set(`${eventType}:${selector}`, delegateHandler);
    }

    /**
     * Create task card element
     * @param {Object} task - Task data
     * @returns {HTMLElement} Task card element
     */
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.status}`;
        card.draggable = true;
        card.dataset.taskId = task.id;
        
        card.innerHTML = `
            <div class="task-content">
                <div class="task-text">${this.sanitizeHTML(task.text)}</div>
                <div class="task-date">Created: ${this.formatDate(task.createdDate)}</div>
            </div>
            <div class="task-actions">
                <button class="btn-edit" data-action="edit" data-task-id="${task.id}" title="Edit task">
                    ✏️
                </button>
                <button class="btn-delete" data-action="delete" data-task-id="${task.id}" title="Delete task">
                    🗑️
                </button>
                ${this.getStatusButtons(task.status, task.id)}
            </div>
        `;
        
        return card;
    }

    /**
     * Get status change buttons
     * @param {string} currentStatus - Current task status
     * @param {string} taskId - Task ID
     * @returns {string} HTML for status buttons
     */
    getStatusButtons(currentStatus, taskId) {
        const buttons = [];
        
        if (currentStatus !== 'todo') {
            buttons.push(`
                <button class="btn-move" data-action="move" data-task-id="${taskId}" data-target-status="todo" title="Move to To-Do">
                    📋
                </button>
            `);
        }
        
        if (currentStatus !== 'doing') {
            buttons.push(`
                <button class="btn-move" data-action="move" data-task-id="${taskId}" data-target-status="doing" title="Move to In Progress">
                    ⚡
                </button>
            `);
        }
        
        if (currentStatus !== 'done') {
            buttons.push(`
                <button class="btn-move" data-action="move" data-task-id="${taskId}" data-target-status="done" title="Move to Done">
                    ✅
                </button>
            `);
        }
        
        // Add archive button for completed tasks
        if (currentStatus === 'done') {
            buttons.push(`
                <button class="btn-archive" data-action="archive" data-task-id="${taskId}" title="Archive task">
                    📦
                </button>
            `);
        }
        
        return buttons.join('');
    }

    /**
     * Render tasks in columns
     * @param {Object} tasksByStatus - Tasks grouped by status
     */
    renderTasks(tasksByStatus) {
        // Clear columns
        Object.values(this.elements).forEach(element => {
            if (element && element.classList && element.classList.contains('column-content')) {
                element.innerHTML = '';
            }
        });

        // Render tasks in each column
        const allTaskElements = [];
        Object.entries(tasksByStatus).forEach(([status, tasks]) => {
            const columnElement = this.elements[`${status}List`];
            if (!columnElement) return;

            if (tasks.length === 0) {
                this.addEmptyState(columnElement, this.getEmptyMessage(status));
            } else {
                tasks.forEach(task => {
                    const taskCard = this.createTaskCard(task);
                    columnElement.appendChild(taskCard);
                    allTaskElements.push(taskCard);
                });
            }
        });
        
        // Update counters
        this.updateTaskCounts(tasksByStatus);
        
        // Update accessibility features for new task elements
        accessibility.updateTasksAccessibility(allTaskElements);
    }

    /**
     * Add empty state message
     * @param {HTMLElement} column - Column element
     * @param {string} message - Empty state message
     */
    addEmptyState(column, message) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = message;
        column.appendChild(emptyState);
    }

    /**
     * Get empty state message for column
     * @param {string} status - Column status
     * @returns {string} Empty message
     */
    getEmptyMessage(status) {
        const messages = {
            todo: 'No tasks to do',
            doing: 'No tasks in progress',
            done: 'No completed tasks'
        };
        return messages[status] || 'No tasks';
    }

    /**
     * Update task counters
     * @param {Object} tasksByStatus - Tasks grouped by status
     */
    updateTaskCounts(tasksByStatus) {
        Object.entries(tasksByStatus).forEach(([status, tasks]) => {
            const counterElement = this.elements[`${status}Count`];
            if (counterElement) {
                counterElement.textContent = tasks.length;
            }
        });
    }

    /**
     * Focus task input
     */
    focusTaskInput() {
        if (this.elements.todoInput) {
            this.elements.todoInput.focus();
            this.elements.todoInput.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Clear task input
     */
    clearTaskInput() {
        if (this.elements.todoInput) {
            this.elements.todoInput.value = '';
        }
    }

    /**
     * Show modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {Object} options - Modal options
     * @returns {Promise} Promise that resolves with user input
     */
    showModal(title, message, options = {}) {
        const {
            showInput = false,
            inputValue = '',
            showCancel = true,
            confirmText = 'Confirm',
            cancelText = 'Cancel'
        } = options;

        return new Promise((resolve) => {
            if (!this.elements.customModal) {
                resolve(null);
                return;
            }

            const modal = this.elements.customModal;
            const modalTitle = this.elements.modalTitle;
            const modalMessage = this.elements.modalMessage;
            const modalInput = this.elements.modalInput;
            const modalConfirm = this.elements.modalConfirm;
            const modalCancel = this.elements.modalCancel;

            // Set content
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modalInput.style.display = showInput ? 'block' : 'none';
            modalInput.value = inputValue;
            modalCancel.style.display = showCancel ? 'block' : 'none';
            modalConfirm.textContent = confirmText;
            modalCancel.textContent = cancelText;

            // Show modal
            modal.style.display = 'flex';

            // Focus input if shown
            if (showInput) {
                setTimeout(() => modalInput.focus(), 100);
            }

            const cleanup = () => {
                modal.style.display = 'none';
                modalConfirm.onclick = null;
                modalCancel.onclick = null;
                modalInput.onkeypress = null;
            };

            modalConfirm.onclick = () => {
                const result = showInput ? modalInput.value.trim() : true;
                cleanup();
                resolve(result);
            };

            modalCancel.onclick = () => {
                cleanup();
                resolve(null);
            };

            // Handle Enter key in input
            modalInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    const result = modalInput.value.trim();
                    cleanup();
                    resolve(result);
                }
            };
        });
    }

    /**
     * Hide modal
     */
    hideModal() {
        if (this.elements.customModal) {
            this.elements.customModal.style.display = 'none';
        }
    }

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} html - HTML string
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Format date to human-friendly format
     * @param {string} dateString - Date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }).format(date);
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Cleanup event listeners
     */
    cleanup() {
        this.delegateHandlers.forEach((handler, key) => {
            const [eventType] = key.split(':');
            document.removeEventListener(eventType, handler);
        });
        this.delegateHandlers.clear();
    }
}

// Export singleton instance
export default new DOMManager();