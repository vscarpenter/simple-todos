import eventBus from './eventBus.js';

/**
 * Accessibility module for ARIA support and keyboard navigation
 */
class AccessibilityManager {
    constructor() {
        this.announcer = null;
        this.focusManagement = {
            previousFocus: null,
            focusableElements: [],
            currentIndex: -1
        };
        this.keyboardNavigation = {
            enabled: true,
            dragKeyboard: false,
            selectedTaskId: null
        };
        
        this.init();
    }

    /**
     * Initialize accessibility features
     */
    init() {
        this.createScreenReaderAnnouncer();
        this.enhanceHTML();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupEventListeners();
        
        eventBus.emit('accessibility:initialized');
    }

    /**
     * Create live region for screen reader announcements
     */
    createScreenReaderAnnouncer() {
        this.announcer = document.createElement('div');
        this.announcer.id = 'screen-reader-announcements';
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.className = 'sr-only';
        this.announcer.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
            white-space: nowrap;
            border: 0;
        `;
        
        document.body.appendChild(this.announcer);
    }

    /**
     * Enhance existing HTML with accessibility attributes
     */
    enhanceHTML() {
        // Enhance main navigation
        const header = document.querySelector('header');
        if (header) {
            header.setAttribute('role', 'banner');
        }

        const main = document.querySelector('main');
        if (main) {
            main.setAttribute('role', 'main');
        }

        const footer = document.querySelector('footer');
        if (footer) {
            footer.setAttribute('role', 'contentinfo');
        }

        // Enhance task form
        const todoForm = document.getElementById('todo-form');
        if (todoForm) {
            todoForm.setAttribute('role', 'form');
            todoForm.setAttribute('aria-label', 'Add new task');
        }

        const todoInput = document.getElementById('todo-input');
        if (todoInput) {
            todoInput.setAttribute('aria-describedby', 'task-input-help');
            todoInput.setAttribute('aria-required', 'true');
            
            // Add hidden help text
            const helpText = document.createElement('div');
            helpText.id = 'task-input-help';
            helpText.className = 'sr-only';
            helpText.textContent = 'Enter your task description. Maximum 200 characters. Press Enter or click Add Task to create.';
            todoForm.appendChild(helpText);
        }

        // Enhance task board
        const board = document.querySelector('.backlog-board');
        if (board) {
            board.setAttribute('role', 'application');
            board.setAttribute('aria-label', 'Task management board');
            board.setAttribute('aria-describedby', 'board-help');
            
            // Add board instructions
            const boardHelp = document.createElement('div');
            boardHelp.id = 'board-help';
            boardHelp.className = 'sr-only';
            boardHelp.textContent = 'Use arrow keys to navigate between tasks. Press Enter to edit, Delete to remove, or Space to move between columns. Drag and drop is also supported.';
            board.appendChild(boardHelp);
        }

        // Enhance columns
        this.enhanceColumns();

        // Enhance buttons
        this.enhanceButtons();

        // Enhance modal
        this.enhanceModal();
    }

    /**
     * Enhance column accessibility
     */
    enhanceColumns() {
        const columns = document.querySelectorAll('.board-column');
        columns.forEach((column, index) => {
            const columnId = column.id;
            const status = column.querySelector('.column-content')?.dataset.status;
            const header = column.querySelector('.column-header h3');
            const content = column.querySelector('.column-content');
            const count = column.querySelector('.task-count');

            if (header) {
                header.id = `${columnId}-heading`;
            }

            if (content) {
                content.setAttribute('role', 'listbox');
                content.setAttribute('aria-labelledby', `${columnId}-heading`);
                content.setAttribute('aria-describedby', `${columnId}-description`);
                content.setAttribute('tabindex', '0');
                content.setAttribute('data-column-index', index);
                
                // Make columns focusable for keyboard navigation
                content.addEventListener('focus', () => {
                    this.handleColumnFocus(content);
                });

                // Add description
                const description = document.createElement('div');
                description.id = `${columnId}-description`;
                description.className = 'sr-only';
                description.textContent = `${header?.textContent || 'Task column'} with ${count?.textContent || '0'} tasks. Use arrow keys to navigate tasks.`;
                column.appendChild(description);
            }

            // Enhance drop zones
            if (content) {
                content.setAttribute('aria-dropeffect', 'move');
                content.addEventListener('dragover', () => {
                    content.setAttribute('aria-dropeffect', 'move');
                });
                content.addEventListener('dragleave', () => {
                    content.setAttribute('aria-dropeffect', 'none');
                });
            }
        });
    }

    /**
     * Enhance button accessibility
     */
    enhanceButtons() {
        // Import button
        const importBtn = document.getElementById('import-button');
        if (importBtn) {
            importBtn.setAttribute('aria-describedby', 'import-help');
            const importHelp = document.createElement('div');
            importHelp.id = 'import-help';
            importHelp.className = 'sr-only';
            importHelp.textContent = 'Import tasks from a JSON file';
            importBtn.parentNode.appendChild(importHelp);
        }

        // Export button
        const exportBtn = document.getElementById('export-button');
        if (exportBtn) {
            exportBtn.setAttribute('aria-describedby', 'export-help');
            const exportHelp = document.createElement('div');
            exportHelp.id = 'export-help';
            exportHelp.className = 'sr-only';
            exportHelp.textContent = 'Export all tasks to a JSON file';
            exportBtn.parentNode.appendChild(exportHelp);
        }

        // Archive button
        const archiveBtn = document.getElementById('archive-button');
        if (archiveBtn) {
            archiveBtn.setAttribute('aria-describedby', 'archive-help');
            const archiveHelp = document.createElement('div');
            archiveHelp.id = 'archive-help';
            archiveHelp.className = 'sr-only';
            archiveHelp.textContent = 'Archive all completed tasks';
            archiveBtn.parentNode.appendChild(archiveHelp);
        }
    }

    /**
     * Enhance modal accessibility
     */
    enhanceModal() {
        const modal = document.getElementById('custom-modal');
        if (modal) {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'modal-title');
            modal.setAttribute('aria-describedby', 'modal-message');
            
            // Add close button for screen readers
            const modalBox = modal.querySelector('.modal-box');
            if (modalBox) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'modal-close-sr sr-only';
                closeBtn.textContent = 'Close modal';
                closeBtn.setAttribute('aria-label', 'Close modal');
                closeBtn.addEventListener('click', () => {
                    eventBus.emit('modal:close');
                });
                modalBox.appendChild(closeBtn);
            }
        }
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            // Skip if typing in input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // Handle different keyboard contexts
            if (this.isInTaskBoard(event.target)) {
                this.handleTaskBoardKeyboard(event);
            } else if (this.isInModal(event.target)) {
                this.handleModalKeyboard(event);
            }
        });
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Track focus for modal management
        document.addEventListener('focusin', (event) => {
            if (!this.isInModal(event.target)) {
                this.focusManagement.previousFocus = event.target;
            }
        });

        // Handle tab trapping in modals
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && this.isInModal(event.target)) {
                this.handleTabTrapping(event);
            }
        });
    }

    /**
     * Setup event listeners for accessibility feedback
     */
    setupEventListeners() {
        // Task events
        eventBus.on('task:created', (data) => {
            this.announce(`Task created: ${data.task.text}`);
            this.updateColumnDescriptions();
        });

        eventBus.on('task:deleted', (data) => {
            this.announce('Task deleted');
            this.updateColumnDescriptions();
        });

        eventBus.on('task:drop', (data) => {
            const statusNames = { todo: 'To Do', doing: 'In Progress', done: 'Done' };
            this.announce(`Task moved to ${statusNames[data.targetStatus]}`);
            this.updateColumnDescriptions();
        });

        eventBus.on('task:edited', (data) => {
            this.announce(`Task updated: ${data.task.text}`);
        });

        // App events
        eventBus.on('app:undo', () => {
            this.announce('Action undone');
        });

        eventBus.on('app:redo', () => {
            this.announce('Action redone');
        });

        eventBus.on('tasks:imported', (data) => {
            this.announce(`${data.count} tasks imported successfully`);
        });

        eventBus.on('tasks:exported', (data) => {
            this.announce(`${data.count} tasks exported successfully`);
        });

        // Modal events
        eventBus.on('modal:show', () => {
            this.trapFocusInModal();
        });

        eventBus.on('modal:close', () => {
            this.restoreFocus();
        });
    }

    /**
     * Handle task board keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleTaskBoardKeyboard(event) {
        const column = event.target.closest('.column-content');
        if (!column) return;

        const tasks = Array.from(column.querySelectorAll('.task-card'));
        const currentTask = event.target.closest('.task-card');
        
        switch (event.key) {
            case 'ArrowUp':
                event.preventDefault();
                this.navigateToTask(tasks, currentTask, -1);
                break;
                
            case 'ArrowDown':
                event.preventDefault();
                this.navigateToTask(tasks, currentTask, 1);
                break;
                
            case 'ArrowLeft':
                event.preventDefault();
                this.navigateToColumn(-1);
                break;
                
            case 'ArrowRight':
                event.preventDefault();
                this.navigateToColumn(1);
                break;
                
            case 'Enter':
                if (currentTask) {
                    event.preventDefault();
                    const taskId = currentTask.dataset.taskId;
                    eventBus.emit('task:edit:requested', { taskId });
                }
                break;
                
            case 'Delete':
            case 'Backspace':
                if (currentTask) {
                    event.preventDefault();
                    const taskId = currentTask.dataset.taskId;
                    eventBus.emit('task:delete:requested', { taskId });
                }
                break;
                
            case ' ':
                if (currentTask) {
                    event.preventDefault();
                    this.startKeyboardDragDrop(currentTask);
                }
                break;
                
            case 'Escape':
                if (this.keyboardNavigation.dragKeyboard) {
                    event.preventDefault();
                    this.cancelKeyboardDragDrop();
                }
                break;
        }
    }

    /**
     * Handle modal keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleModalKeyboard(event) {
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                eventBus.emit('modal:close');
                break;
        }
    }

    /**
     * Navigate to task in same column
     * @param {HTMLElement[]} tasks - Array of task elements
     * @param {HTMLElement} currentTask - Currently focused task
     * @param {number} direction - Direction (-1 up, 1 down)
     */
    navigateToTask(tasks, currentTask, direction) {
        if (tasks.length === 0) return;

        let targetIndex = 0;
        if (currentTask) {
            const currentIndex = tasks.indexOf(currentTask);
            targetIndex = currentIndex + direction;
        }

        // Wrap around
        if (targetIndex < 0) targetIndex = tasks.length - 1;
        if (targetIndex >= tasks.length) targetIndex = 0;

        const targetTask = tasks[targetIndex];
        if (targetTask) {
            targetTask.focus();
            targetTask.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            this.announce(`Task ${targetIndex + 1} of ${tasks.length}: ${this.getTaskText(targetTask)}`);
        }
    }

    /**
     * Navigate to adjacent column
     * @param {number} direction - Direction (-1 left, 1 right)
     */
    navigateToColumn(direction) {
        const columns = Array.from(document.querySelectorAll('.column-content'));
        const currentColumn = document.activeElement?.closest('.column-content');
        
        if (!currentColumn) {
            // Focus first column if none focused
            if (columns[0]) {
                this.focusColumn(columns[0]);
            }
            return;
        }

        const currentIndex = columns.indexOf(currentColumn);
        let targetIndex = currentIndex + direction;

        // Wrap around
        if (targetIndex < 0) targetIndex = columns.length - 1;
        if (targetIndex >= columns.length) targetIndex = 0;

        const targetColumn = columns[targetIndex];
        if (targetColumn) {
            this.focusColumn(targetColumn);
        }
    }

    /**
     * Focus a column and its first task
     * @param {HTMLElement} column - Column to focus
     */
    focusColumn(column) {
        const tasks = column.querySelectorAll('.task-card');
        if (tasks.length > 0) {
            tasks[0].focus();
            const columnName = column.closest('.board-column')?.querySelector('h3')?.textContent || 'column';
            this.announce(`Moved to ${columnName} column with ${tasks.length} tasks`);
        } else {
            column.focus();
            const columnName = column.closest('.board-column')?.querySelector('h3')?.textContent || 'column';
            this.announce(`Moved to empty ${columnName} column`);
        }
    }

    /**
     * Start keyboard drag and drop
     * @param {HTMLElement} taskElement - Task element to drag
     */
    startKeyboardDragDrop(taskElement) {
        this.keyboardNavigation.dragKeyboard = true;
        this.keyboardNavigation.selectedTaskId = taskElement.dataset.taskId;
        
        taskElement.classList.add('keyboard-dragging');
        taskElement.setAttribute('aria-grabbed', 'true');
        
        // Update all drop zones
        const columns = document.querySelectorAll('.column-content');
        columns.forEach(column => {
            column.setAttribute('aria-dropeffect', 'move');
        });
        
        const taskText = this.getTaskText(taskElement);
        this.announce(`Started moving task: ${taskText}. Use arrow keys to select destination column, Space to drop, Escape to cancel.`);
        
        // Override navigation for drop mode
        document.addEventListener('keydown', this.handleDragDropKeyboard.bind(this), { once: false });
    }

    /**
     * Handle keyboard navigation during drag and drop
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleDragDropKeyboard(event) {
        if (!this.keyboardNavigation.dragKeyboard) return;

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowRight':
                event.preventDefault();
                this.navigateToColumn(event.key === 'ArrowRight' ? 1 : -1);
                break;
                
            case ' ':
                event.preventDefault();
                this.completeDragDrop();
                break;
                
            case 'Escape':
                event.preventDefault();
                this.cancelKeyboardDragDrop();
                break;
        }
    }

    /**
     * Complete keyboard drag and drop
     */
    completeDragDrop() {
        const currentColumn = document.activeElement?.closest('.column-content');
        if (!currentColumn || !this.keyboardNavigation.selectedTaskId) {
            this.cancelKeyboardDragDrop();
            return;
        }

        const targetStatus = currentColumn.dataset.status;
        const taskId = this.keyboardNavigation.selectedTaskId;
        
        eventBus.emit('task:drop', { taskId, targetStatus });
        
        this.cleanupDragDrop();
        
        const columnName = currentColumn.closest('.board-column')?.querySelector('h3')?.textContent || 'column';
        this.announce(`Task moved to ${columnName} column`);
    }

    /**
     * Cancel keyboard drag and drop
     */
    cancelKeyboardDragDrop() {
        this.cleanupDragDrop();
        this.announce('Move cancelled');
    }

    /**
     * Cleanup drag and drop state
     */
    cleanupDragDrop() {
        // Clean up visual state
        const draggingTask = document.querySelector('.keyboard-dragging');
        if (draggingTask) {
            draggingTask.classList.remove('keyboard-dragging');
            draggingTask.setAttribute('aria-grabbed', 'false');
        }

        // Clean up drop zones
        const columns = document.querySelectorAll('.column-content');
        columns.forEach(column => {
            column.setAttribute('aria-dropeffect', 'none');
        });

        // Reset navigation state
        this.keyboardNavigation.dragKeyboard = false;
        this.keyboardNavigation.selectedTaskId = null;
        
        // Remove event listener
        document.removeEventListener('keydown', this.handleDragDropKeyboard);
    }

    /**
     * Handle tab trapping in modals
     * @param {KeyboardEvent} event - Tab key event
     */
    handleTabTrapping(event) {
        const modal = document.getElementById('custom-modal');
        if (!modal || modal.style.display === 'none') return;

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement?.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement?.focus();
            }
        }
    }

    /**
     * Trap focus in modal
     */
    trapFocusInModal() {
        const modal = document.getElementById('custom-modal');
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    /**
     * Restore focus after modal closes
     */
    restoreFocus() {
        if (this.focusManagement.previousFocus) {
            this.focusManagement.previousFocus.focus();
        }
    }

    /**
     * Handle column focus
     * @param {HTMLElement} column - Column element
     */
    handleColumnFocus(column) {
        const tasks = column.querySelectorAll('.task-card');
        const columnName = column.closest('.board-column')?.querySelector('h3')?.textContent || 'column';
        
        if (tasks.length > 0) {
            this.announce(`${columnName} column with ${tasks.length} tasks. Use arrow keys to navigate.`);
        } else {
            this.announce(`Empty ${columnName} column.`);
        }
    }

    /**
     * Update column descriptions with current task counts
     */
    updateColumnDescriptions() {
        const columns = document.querySelectorAll('.board-column');
        columns.forEach(column => {
            const description = column.querySelector('[id$="-description"]');
            const header = column.querySelector('.column-header h3');
            const count = column.querySelector('.task-count');
            
            if (description && header && count) {
                description.textContent = `${header.textContent} with ${count.textContent} tasks. Use arrow keys to navigate tasks.`;
            }
        });
    }

    /**
     * Get task text for announcements
     * @param {HTMLElement} taskElement - Task element
     * @returns {string} Task text
     */
    getTaskText(taskElement) {
        const textElement = taskElement.querySelector('.task-text');
        return textElement ? textElement.textContent : 'Task';
    }

    /**
     * Check if element is in task board
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if in task board
     */
    isInTaskBoard(element) {
        return element.closest('.backlog-board') !== null;
    }

    /**
     * Check if element is in modal
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if in modal
     */
    isInModal(element) {
        const modal = document.getElementById('custom-modal');
        return modal && modal.contains(element) && modal.style.display !== 'none';
    }

    /**
     * Announce text to screen readers
     * @param {string} text - Text to announce
     * @param {string} priority - Priority level ('polite' or 'assertive')
     */
    announce(text, priority = 'polite') {
        if (!this.announcer) return;

        // Clear previous announcement
        this.announcer.textContent = '';
        this.announcer.setAttribute('aria-live', priority);
        
        // Add new announcement after a brief delay
        setTimeout(() => {
            this.announcer.textContent = text;
        }, 100);
    }

    /**
     * Enhance dynamically created task elements
     * @param {HTMLElement} taskElement - Task element to enhance
     */
    enhanceTaskElement(taskElement) {
        const taskId = taskElement.dataset.taskId;
        const taskText = this.getTaskText(taskElement);
        
        // Add ARIA attributes
        taskElement.setAttribute('role', 'option');
        taskElement.setAttribute('tabindex', '0');
        taskElement.setAttribute('aria-selected', 'false');
        taskElement.setAttribute('aria-grabbed', 'false');
        taskElement.setAttribute('aria-label', `Task: ${taskText}`);
        taskElement.setAttribute('aria-describedby', `task-${taskId}-actions`);
        
        // Enhance action buttons
        const actions = taskElement.querySelector('.task-actions');
        if (actions) {
            actions.id = `task-${taskId}-actions`;
            
            const buttons = actions.querySelectorAll('button');
            buttons.forEach(button => {
                const action = button.dataset.action;
                if (action && !button.getAttribute('aria-label')) {
                    const labels = {
                        edit: 'Edit task',
                        delete: 'Delete task',
                        move: 'Move task',
                        archive: 'Archive task'
                    };
                    button.setAttribute('aria-label', `${labels[action] || action} ${taskText}`);
                }
            });
        }

        // Add keyboard event listeners
        taskElement.addEventListener('keydown', (event) => {
            if (event.target === taskElement) {
                this.handleTaskBoardKeyboard(event);
            }
        });

        // Add focus event listener
        taskElement.addEventListener('focus', () => {
            // Update aria-selected for screen readers
            const allTasks = document.querySelectorAll('.task-card');
            allTasks.forEach(task => task.setAttribute('aria-selected', 'false'));
            taskElement.setAttribute('aria-selected', 'true');
        });
    }

    /**
     * Update accessibility state when tasks change
     * @param {HTMLElement[]} taskElements - Array of task elements
     */
    updateTasksAccessibility(taskElements) {
        taskElements.forEach(taskElement => {
            this.enhanceTaskElement(taskElement);
        });
        
        this.updateColumnDescriptions();
    }
}

// Export singleton instance
export default new AccessibilityManager();