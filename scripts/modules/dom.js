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
            modalCancel: document.getElementById('modal-cancel'),
            
            // Board selector elements
            boardSelectorBtn: document.getElementById('board-selector-btn'),
            currentBoardName: document.getElementById('current-board-name'),
            boardSelectorMenu: document.getElementById('board-selector-menu'),
            activeBoardsList: document.getElementById('active-boards-list'),
            newBoardBtn: document.getElementById('new-board-btn'),
            manageBoardsBtn: document.getElementById('manage-boards-btn')
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
            console.log('🎯 Drag started:', {
                taskId,
                elementId: element.id,
                taskText: element.querySelector('.task-card__text')?.textContent?.trim()
            });
            
            event.dataTransfer.setData('text/plain', taskId);
            element.classList.add('dragging');
            eventBus.emit('drag:start', { taskId, element });
        });

        this.delegate('dragend', '.task-card', (event, element) => {
            const taskId = element.dataset.taskId;
            console.log('🎯 Drag ended:', { taskId });
            
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
        
        // Setup board selector events
        this.setupBoardSelectorEvents();
    }

    /**
     * Setup board selector events
     */
    setupBoardSelectorEvents() {
        // New board button
        if (this.elements.newBoardBtn) {
            this.elements.newBoardBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleNewBoard();
            });
        }

        // Manage boards button
        if (this.elements.manageBoardsBtn) {
            this.elements.manageBoardsBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleManageBoards();
            });
        }

        // Delegate board selection clicks
        this.delegate('click', '[data-board-action]', (event, element) => {
            event.preventDefault();
            event.stopPropagation(); // Prevent dropdown from closing
            
            const action = element.dataset.boardAction;
            const boardId = element.dataset.boardId;
            
            switch (action) {
                case 'switch':
                    eventBus.emit('board:switch', { boardId });
                    break;
                case 'edit':
                    eventBus.emit('board:edit', { boardId });
                    break;
                case 'delete':
                    eventBus.emit('board:delete', { boardId });
                    break;
                case 'duplicate':
                    eventBus.emit('board:duplicate', { boardId });
                    break;
            }
        });
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
                
                console.log('📦 Drop event:', {
                    taskId,
                    targetStatus,
                    columnId: column.id,
                    dataTransferData: event.dataTransfer.getData('text/plain')
                });
                
                if (taskId && targetStatus) {
                    console.log('✅ Emitting task:drop event:', { taskId, targetStatus });
                    eventBus.emit('task:drop', { taskId, targetStatus });
                } else {
                    console.error('❌ Missing taskId or targetStatus:', { taskId, targetStatus });
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
        // Validate task has required properties
        if (!task.id || !task.text) {
            console.error('❌ Invalid task data:', task);
            return null;
        }
        
        // Check for existing element with same ID (cleanup stale elements)
        const existingElement = document.getElementById(`task-${task.id}`);
        if (existingElement) {
            console.warn('⚠️ Removing existing task element with same ID:', task.id);
            existingElement.remove();
        }
        
        const card = document.createElement('div');
        card.className = `task-card task-card--${task.status}`;
        card.draggable = true;
        card.dataset.taskId = task.id;
        card.id = `task-${task.id}`; // Ensure unique DOM ID
        card.setAttribute('data-task-text', task.text); // For debugging
        card.setAttribute('aria-label', `Task: ${task.text}`);
        card.tabIndex = 0; // Make focusable for keyboard navigation
        
        // Validate uniqueness
        const allTaskCards = document.querySelectorAll(`[data-task-id="${task.id}"]`);
        if (allTaskCards.length > 1) {
            console.error('🚨 Multiple task cards found with same ID:', task.id);
        }
        
        card.innerHTML = `
            <div class="task-card__content">
                <div class="task-card__text">${this.sanitizeHTML(task.text)}</div>
                <div class="task-card__meta">
                    <span class="task-card__date">Created: ${this.formatDate(task.createdDate)}</span>
                    <span class="task-card__id">#${task.id.slice(-6)}</span>
                </div>
            </div>
            <div class="task-card__actions">
                <div class="task-card__actions-primary">
                    <button class="btn-task-action" data-action="edit" data-task-id="${task.id}" title="Edit task" aria-label="Edit task: ${this.sanitizeHTML(task.text)}">
                        ✏️
                    </button>
                    <button class="btn-task-action" data-action="delete" data-task-id="${task.id}" title="Delete task" aria-label="Delete task: ${this.sanitizeHTML(task.text)}">
                        🗑️
                    </button>
                </div>
                <div class="task-card__actions-secondary">
                    ${this.getStatusButtons(task.status, task.id, task.text)}
                </div>
            </div>
        `;
        
        console.log('✅ Created task card:', {
            id: task.id,
            domId: card.id,
            text: task.text.substring(0, 30) + (task.text.length > 30 ? '...' : ''),
            status: task.status
        });
        
        return card;
    }

    /**
     * Get status change buttons
     * @param {string} currentStatus - Current task status
     * @param {string} taskId - Task ID
     * @param {string} taskText - Task text for accessibility
     * @returns {string} HTML for status buttons
     */
    getStatusButtons(currentStatus, taskId, taskText = '') {
        const buttons = [];
        const sanitizedText = this.sanitizeHTML(taskText);
        
        if (currentStatus !== 'todo') {
            buttons.push(`
                <button class="btn-task-action" data-action="move" data-task-id="${taskId}" data-target-status="todo" title="Move to To-Do" aria-label="Move '${sanitizedText}' to To-Do">
                    📋
                </button>
            `);
        }
        
        if (currentStatus !== 'doing') {
            buttons.push(`
                <button class="btn-task-action" data-action="move" data-task-id="${taskId}" data-target-status="doing" title="Move to In Progress" aria-label="Move '${sanitizedText}' to In Progress">
                    ⚡
                </button>
            `);
        }
        
        if (currentStatus !== 'done') {
            buttons.push(`
                <button class="btn-task-action" data-action="move" data-task-id="${taskId}" data-target-status="done" title="Move to Done" aria-label="Move '${sanitizedText}' to Done">
                    ✅
                </button>
            `);
        }
        
        // Add archive button for completed tasks
        if (currentStatus === 'done') {
            buttons.push(`
                <button class="btn-task-action" data-action="archive" data-task-id="${taskId}" title="Archive task" aria-label="Archive '${sanitizedText}'">
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
        // Debug logging to help identify grouping issues
        const totalTasks = Object.values(tasksByStatus).flat().length;
        const taskIds = Object.values(tasksByStatus).flat().map(t => t.id);
        const taskTexts = Object.values(tasksByStatus).flat().map(t => t.text);
        const uniqueIds = [...new Set(taskIds)];
        const uniqueTexts = [...new Set(taskTexts)];
        
        console.log('🔍 Rendering tasks:', {
            total: totalTasks,
            byStatus: {
                todo: tasksByStatus.todo?.length || 0,
                doing: tasksByStatus.doing?.length || 0,
                done: tasksByStatus.done?.length || 0
            },
            uniqueIds: uniqueIds.length,
            uniqueTexts: uniqueTexts.length,
            hasDuplicateIds: taskIds.length !== uniqueIds.length,
            hasDuplicateTexts: taskTexts.length !== uniqueTexts.length
        });
        
        // Comprehensive DOM cleanup to prevent stale references
        console.log('🧹 Cleaning up existing task cards...');
        
        // Remove all existing task cards first
        const existingTaskCards = document.querySelectorAll('.task-card');
        existingTaskCards.forEach((card, index) => {
            console.log(`  Removing existing card ${index + 1}:`, card.dataset.taskId);
            card.remove();
        });
        
        // Clear column containers
        Object.values(this.elements).forEach(element => {
            if (element && element.classList && 
                (element.classList.contains('column-content') || 
                 element.classList.contains('board-column__content'))) {
                element.innerHTML = '';
            }
        });

        // Render tasks in each column
        const allTaskElements = [];
        Object.entries(tasksByStatus).forEach(([status, tasks]) => {
            const columnElement = this.elements[`${status}List`];
            if (!columnElement) {
                console.warn(`⚠️ Column element not found for status: ${status}`);
                return;
            }

            console.log(`📋 Rendering ${tasks.length} tasks in ${status} column`);

            if (tasks.length === 0) {
                this.addEmptyState(columnElement, this.getEmptyMessage(status));
            } else {
                tasks.forEach((task, index) => {
                    console.log(`  📝 Creating task card ${index + 1}:`, {
                        id: task.id,
                        text: task.text.substring(0, 30) + (task.text.length > 30 ? '...' : ''),
                        status: task.status
                    });
                    
                    const taskCard = this.createTaskCard(task);
                    
                    // Validate the card was created successfully
                    if (!taskCard) {
                        console.error('❌ Failed to create task card for:', task);
                        return;
                    }
                    
                    // Verify the card has unique identifiers
                    if (!taskCard.id || !taskCard.dataset.taskId) {
                        console.error('❌ Task card missing unique identifiers:', task);
                        return;
                    }
                    
                    // Double-check for DOM conflicts before adding
                    const existingCardWithSameId = document.getElementById(taskCard.id);
                    if (existingCardWithSameId && existingCardWithSameId !== taskCard) {
                        console.error('🚨 DOM conflict: Element with same ID already exists:', taskCard.id);
                        existingCardWithSameId.remove();
                    }
                    
                    columnElement.appendChild(taskCard);
                    allTaskElements.push(taskCard);
                });
            }
        });
        
        // Final validation: Check for duplicate DOM IDs
        const allTaskIds = allTaskElements.map(el => el.dataset.taskId);
        const uniqueDOMIds = [...new Set(allTaskIds)];
        if (allTaskIds.length !== uniqueDOMIds.length) {
            console.error('🚨 Duplicate task IDs found in DOM:', {
                total: allTaskIds.length,
                unique: uniqueDOMIds.length,
                duplicates: allTaskIds.filter((id, index) => allTaskIds.indexOf(id) !== index)
            });
        }
        
        // Update counters
        this.updateTaskCounts(tasksByStatus);
        
        // Update accessibility features for new task elements
        accessibility.updateTasksAccessibility(allTaskElements);
        
        console.log('✅ Task rendering complete. DOM elements created:', allTaskElements.length);
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
            cancelText = 'Cancel',
            allowHTML = false
        } = options;

        return new Promise((resolve) => {
            if (!this.elements.customModal) {
                console.error('Modal element not found!');
                resolve(null);
                return;
            }

            const modal = this.elements.customModal;
            const modalTitle = this.elements.modalTitle;
            const modalMessage = this.elements.modalMessage;
            const modalInput = this.elements.modalInput;
            const modalConfirm = this.elements.modalConfirm;
            const modalCancel = this.elements.modalCancel;

            // Clear any existing event handlers first to prevent conflicts
            modalConfirm.removeEventListener('click', modalConfirm._currentHandler);
            modalCancel.removeEventListener('click', modalCancel._currentHandler);
            modal.removeEventListener('click', modal._currentHandler);

            // Set content
            modalTitle.textContent = title;
            if (allowHTML) {
                modalMessage.innerHTML = message;
            } else {
                modalMessage.textContent = message;
            }
            modalInput.style.display = showInput ? 'block' : 'none';
            modalInput.value = inputValue;
            modalCancel.style.display = showCancel ? 'block' : 'none';
            modalConfirm.textContent = confirmText;
            modalCancel.textContent = cancelText;

            const cleanup = () => {
                modal.classList.remove('modal-overlay--visible');
                
                // Remove event listeners
                modalConfirm.removeEventListener('click', confirmHandler);
                modalCancel.removeEventListener('click', cancelHandler);
                modal.removeEventListener('click', overlayHandler);
                modalInput.removeEventListener('keypress', keyHandler);
                
                // Clean up visibility observer
                if (modal._visibilityObserver) {
                    modal._visibilityObserver.disconnect();
                    delete modal._visibilityObserver;
                }
            };

            const confirmHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const result = showInput ? modalInput.value.trim() : true;
                cleanup();
                resolve(result);
            };

            const cancelHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                cleanup();
                resolve(null);
            };

            const overlayHandler = (e) => {
                // Only close if clicking the overlay background, not modal content
                // Check if the click target is outside the modal content box
                const modalContent = modal.querySelector('.modal-box');
                if (modalContent && !modalContent.contains(e.target)) {
                    cleanup();
                    resolve(null);
                }
            };

            const keyHandler = (e) => {
                if (e.key === 'Enter') {
                    const result = modalInput.value.trim();
                    cleanup();
                    resolve(result);
                }
            };

            // Add event listeners BEFORE making visible to prevent timing issues
            modalConfirm.addEventListener('click', confirmHandler);
            modalCancel.addEventListener('click', cancelHandler);
            modal.addEventListener('click', overlayHandler);
            modalInput.addEventListener('keypress', keyHandler);
            
            // Add delay before making visible to ensure handlers are ready
            setTimeout(() => {
                modal.classList.add('modal-overlay--visible');
            }, 10);

            // Store references for cleanup
            modalConfirm._currentHandler = confirmHandler;
            modalCancel._currentHandler = cancelHandler;
            modal._currentHandler = overlayHandler;

            // Focus input if shown
            if (showInput) {
                setTimeout(() => modalInput.focus(), 100);
            }
        });
    }

    /**
     * Hide modal
     */
    hideModal() {
        if (this.elements.customModal) {
            this.elements.customModal.classList.remove('modal-overlay--visible');
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, info)
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        const icon = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        }[type] || 'ℹ️';
        
        toast.innerHTML = `
            <div class="toast__content">
                <span class="toast__icon">${icon}</span>
                <span class="toast__message">${this.sanitizeHTML(message)}</span>
            </div>
            <button class="toast__close" aria-label="Close notification">×</button>
        `;

        // Add to container
        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('toast--visible');
        }, 10);

        // Auto remove
        const removeToast = () => {
            toast.classList.remove('toast--visible');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        };

        // Close button
        const closeBtn = toast.querySelector('.toast__close');
        closeBtn.addEventListener('click', removeToast);

        // Auto-hide
        if (duration > 0) {
            setTimeout(removeToast, duration);
        }

        return toast;
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
     * Handle new board creation
     */
    async handleNewBoard() {
        try {
            const boardName = await this.showModal('New Board', 'Enter board name:', {
                showInput: true,
                inputValue: '',
                confirmText: 'Create Board'
            });
            
            if (boardName && boardName.trim().length > 0) {
                eventBus.emit('board:create', { 
                    name: boardName.trim(),
                    description: '',
                    color: '#6750a4'
                });
            }
        } catch (error) {
            console.error('Failed to create new board:', error);
        }
    }

    /**
     * Handle manage boards
     */
    async handleManageBoards() {
        eventBus.emit('boards:manage');
    }

    /**
     * Render board selector
     * @param {Array} boards - Available boards
     * @param {Object} currentBoard - Currently selected board
     */
    renderBoardSelector(boards, currentBoard) {
        // Update current board name
        if (this.elements.currentBoardName && currentBoard) {
            this.elements.currentBoardName.textContent = currentBoard.name;
        }

        // Update boards list
        if (this.elements.activeBoardsList) {
            this.elements.activeBoardsList.innerHTML = '';
            
            if (boards.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.innerHTML = '<span class="dropdown-item text-muted">No boards available</span>';
                this.elements.activeBoardsList.appendChild(emptyItem);
                return;
            }
            
            boards.forEach(board => {
                const listItem = document.createElement('li');
                const isActive = currentBoard && board.id === currentBoard.id;
                
                listItem.innerHTML = `
                    <a class="dropdown-item ${isActive ? 'active' : ''}" 
                       href="#" 
                       data-board-action="switch" 
                       data-board-id="${board.id}">
                        <div class="d-flex align-items-center gap-2">
                            <div class="board-color" style="width: 12px; height: 12px; background-color: ${board.color}; border-radius: 2px;"></div>
                            <div class="flex-grow-1">
                                <div class="board-name">${this.sanitizeHTML(board.name)}</div>
                                <small class="text-muted">${(board.tasks || []).length} tasks</small>
                            </div>
                            <div class="board-actions">
                                <button class="btn btn-sm btn-outline-secondary me-1" data-board-action="edit" data-board-id="${board.id}" title="Rename board">
                                    ✏️
                                </button>
                                ${!board.isDefault ? `
                                    <button class="btn btn-sm btn-outline-danger" data-board-action="delete" data-board-id="${board.id}" title="Delete board">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                            ${isActive ? '<span class="text-primary ms-2">✓</span>' : ''}
                        </div>
                    </a>
                `;
                
                this.elements.activeBoardsList.appendChild(listItem);
            });
        }
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
}

// Export singleton instance
export default new DOMManager();