import eventBus from './eventBus.js';
import accessibility from './accessibility.js';
import { debugLog } from './settings.js';

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
        this.initializeTooltips();
        
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
            
            // Menu panel elements
            hamburgerMenuBtn: document.getElementById('hamburger-menu-btn'),
            menuOverlay: document.getElementById('menu-overlay'),
            menuPanel: document.getElementById('menu-panel'),
            menuCloseBtn: document.getElementById('menu-close-btn'),
            
            // Menu action buttons
            exportMenuBtn: document.getElementById('export-menu-btn'),
            importMenuBtn: document.getElementById('import-menu-btn'),
            newBoardMenuBtn: document.getElementById('new-board-menu-btn'),
            manageBoardsMenuBtn: document.getElementById('manage-boards-menu-btn'),
            preferencesBtn: document.getElementById('preferences-btn'),
            browseArchiveBtn: document.getElementById('browse-archive-btn'),
            
            // Developer menu buttons
            resetAppMenuBtn: document.getElementById('reset-app-menu-btn'),
            toggleDebugBtn: document.getElementById('toggle-debug-btn')
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
            const priority = element.dataset.priority;
            
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
            debugLog.log('🎯 Drag started:', {
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

        // Setup menu panel events
        this.setupMenuPanelEvents();
        
        // Setup drag and drop zones
        this.setupDropZones();
        
        // Setup board selector events
        this.setupBoardSelectorEvents();
    }

    /**
     * Setup board selector events
     */
    setupBoardSelectorEvents() {
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
     * Setup menu panel events
     */
    setupMenuPanelEvents() {
        // Hamburger menu button
        if (this.elements.hamburgerMenuBtn) {
            this.elements.hamburgerMenuBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.showMenuPanel();
            });
        }

        // Menu close button
        if (this.elements.menuCloseBtn) {
            this.elements.menuCloseBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.hideMenuPanel();
            });
        }

        // Menu overlay (click to close)
        if (this.elements.menuOverlay) {
            this.elements.menuOverlay.addEventListener('click', (event) => {
                if (event.target === this.elements.menuOverlay) {
                    this.hideMenuPanel();
                }
            });
        }

        // Menu action buttons
        if (this.elements.exportMenuBtn) {
            this.elements.exportMenuBtn.addEventListener('click', () => {
                eventBus.emit('tasks:export');
                this.hideMenuPanel();
            });
        }

        if (this.elements.importMenuBtn) {
            this.elements.importMenuBtn.addEventListener('click', () => {
                this.elements.importFileInput?.click();
                this.hideMenuPanel();
            });
        }

        if (this.elements.newBoardMenuBtn) {
            this.elements.newBoardMenuBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleNewBoard();
                this.hideMenuPanel();
            });
        }

        if (this.elements.manageBoardsMenuBtn) {
            this.elements.manageBoardsMenuBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleManageBoards();
                this.hideMenuPanel();
            });
        }

        if (this.elements.preferencesBtn) {
            this.elements.preferencesBtn.addEventListener('click', () => {
                eventBus.emit('settings:show');
                this.hideMenuPanel();
            });
        }

        if (this.elements.browseArchiveBtn) {
            this.elements.browseArchiveBtn.addEventListener('click', () => {
                eventBus.emit('archive:browse');
                this.hideMenuPanel();
            });
        }

        // Developer menu items
        if (this.elements.resetAppMenuBtn) {
            this.elements.resetAppMenuBtn.addEventListener('click', () => {
                eventBus.emit('app:reset');
                this.hideMenuPanel();
            });
        }

        if (this.elements.toggleDebugBtn) {
            this.elements.toggleDebugBtn.addEventListener('click', () => {
                eventBus.emit('debug:toggle');
                this.hideMenuPanel();
            });
            
            // Update button text based on current debug mode
            this.updateDebugButtonText();
        }

        // Escape key to close menu
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isMenuPanelVisible()) {
                this.hideMenuPanel();
            }
        });
    }

    /**
     * Show the menu panel
     */
    showMenuPanel() {
        if (this.elements.menuOverlay) {
            this.elements.menuOverlay.classList.add('menu-overlay--visible');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            
            // Focus the first menu item for accessibility
            const firstMenuItem = this.elements.menuPanel?.querySelector('.menu-item');
            if (firstMenuItem) {
                setTimeout(() => firstMenuItem.focus(), 100);
            }
        }
    }

    /**
     * Hide the menu panel
     */
    hideMenuPanel() {
        if (this.elements.menuOverlay) {
            this.elements.menuOverlay.classList.remove('menu-overlay--visible');
            document.body.style.overflow = ''; // Restore scrolling
            
            // Return focus to hamburger button
            if (this.elements.hamburgerMenuBtn) {
                this.elements.hamburgerMenuBtn.focus();
            }
        }
    }

    /**
     * Check if menu panel is visible
     */
    isMenuPanelVisible() {
        return this.elements.menuOverlay?.classList.contains('menu-overlay--visible');
    }

    /**
     * Update debug button text based on current debug mode
     */
    updateDebugButtonText() {
        if (!this.elements.toggleDebugBtn) return;
        
        try {
            // Import settingsManager dynamically to avoid circular dependencies
            import('./settings.js').then(({ settingsManager }) => {
                const isDebugMode = settingsManager.get('debugMode');
                this.elements.toggleDebugBtn.textContent = isDebugMode ? 'Turn off Debug' : 'Turn on Debug';
            }).catch(() => {
                // Fallback if import fails
                this.elements.toggleDebugBtn.textContent = 'Toggle Debug';
            });
        } catch (error) {
            // Fallback text if anything fails
            this.elements.toggleDebugBtn.textContent = 'Toggle Debug';
        }
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
        
        // Create elements safely without innerHTML
        const cardContent = document.createElement('div');
        cardContent.className = 'task-card__content';
        
        const cardText = document.createElement('div');
        cardText.className = 'task-card__text';
        cardText.textContent = task.text; // Use textContent for safety
        
        const cardMeta = document.createElement('div');
        cardMeta.className = 'task-card__meta';
        
        const cardDate = document.createElement('span');
        cardDate.className = 'task-card__date';
        cardDate.textContent = `Created: ${this.formatDate(task.createdDate)}`;
        
        const cardId = document.createElement('span');
        cardId.className = 'task-card__id';
        cardId.textContent = `#${task.id.slice(-6)}`;
        
        cardMeta.appendChild(cardDate);
        cardMeta.appendChild(cardId);
        cardContent.appendChild(cardText);
        cardContent.appendChild(cardMeta);
        
        const cardActions = document.createElement('div');
        cardActions.className = 'task-card__actions';
        
        const primaryActions = document.createElement('div');
        primaryActions.className = 'task-card__actions-primary';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-task-action';
        editBtn.setAttribute('data-action', 'edit');
        editBtn.setAttribute('data-task-id', task.id);
        editBtn.setAttribute('title', 'Edit task');
        editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
        editBtn.textContent = '✏️';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-task-action';
        deleteBtn.setAttribute('data-action', 'delete');
        deleteBtn.setAttribute('data-task-id', task.id);
        deleteBtn.setAttribute('title', 'Delete task');
        deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
        deleteBtn.textContent = '🗑️';
        
        primaryActions.appendChild(editBtn);
        primaryActions.appendChild(deleteBtn);
        
        const secondaryActions = document.createElement('div');
        secondaryActions.className = 'task-card__actions-secondary';
        // Create status buttons safely using DOM methods
        const statusButtonsHTML = this.getStatusButtons(task.status, task.id, task.text);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = statusButtonsHTML; // getStatusButtons returns sanitized HTML
        while (tempDiv.firstChild) {
            secondaryActions.appendChild(tempDiv.firstChild);
        }
        
        cardActions.appendChild(primaryActions);
        cardActions.appendChild(secondaryActions);
        
        card.appendChild(cardContent);
        card.appendChild(cardActions);
        
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
                // Only allow HTML if explicitly requested - use textContent for safety
                // In practice, we should avoid innerHTML entirely for user content
                modalMessage.textContent = message; // Always use textContent for safety
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
        
        // Create toast elements safely
        const toastContent = document.createElement('div');
        toastContent.className = 'toast__content';
        
        const toastIcon = document.createElement('span');
        toastIcon.className = 'toast__icon';
        toastIcon.textContent = icon;
        
        const toastMessage = document.createElement('span');
        toastMessage.className = 'toast__message';
        toastMessage.textContent = message; // Use textContent for safety
        
        const toastClose = document.createElement('button');
        toastClose.className = 'toast__close';
        toastClose.setAttribute('aria-label', 'Close notification');
        toastClose.textContent = '×';
        
        toastContent.appendChild(toastIcon);
        toastContent.appendChild(toastMessage);
        toast.appendChild(toastContent);
        toast.appendChild(toastClose);

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
        if (typeof html !== 'string') {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = html; // This escapes HTML entities
        return div.innerHTML; // Returns the escaped content
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
                
                // Create board list item safely
                const link = document.createElement('a');
                link.className = `dropdown-item ${isActive ? 'active' : ''}`;
                link.href = '#';
                link.setAttribute('data-board-action', 'switch');
                link.setAttribute('data-board-id', board.id);
                
                const container = document.createElement('div');
                container.className = 'd-flex align-items-center gap-2';
                
                const colorDiv = document.createElement('div');
                colorDiv.className = 'board-color';
                colorDiv.style.cssText = `width: 12px; height: 12px; background-color: ${board.color}; border-radius: 2px;`;
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'flex-grow-1';
                
                const nameDiv = document.createElement('div');
                nameDiv.className = 'board-name';
                nameDiv.textContent = board.name; // Use textContent for safety
                
                const taskCount = document.createElement('small');
                taskCount.className = 'text-muted';
                taskCount.textContent = `${(board.tasks || []).length} tasks`;
                
                contentDiv.appendChild(nameDiv);
                contentDiv.appendChild(taskCount);
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'board-actions';
                
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-sm btn-outline-secondary me-1';
                editBtn.setAttribute('data-board-action', 'edit');
                editBtn.setAttribute('data-board-id', board.id);
                editBtn.setAttribute('title', 'Rename board');
                editBtn.textContent = '✏️';
                
                actionsDiv.appendChild(editBtn);
                
                if (!board.isDefault) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-sm btn-outline-danger';
                    deleteBtn.setAttribute('data-board-action', 'delete');
                    deleteBtn.setAttribute('data-board-id', board.id);
                    deleteBtn.setAttribute('title', 'Delete board');
                    deleteBtn.textContent = '🗑️';
                    actionsDiv.appendChild(deleteBtn);
                }
                
                container.appendChild(colorDiv);
                container.appendChild(contentDiv);
                container.appendChild(actionsDiv);
                
                if (isActive) {
                    const checkmark = document.createElement('span');
                    checkmark.className = 'text-primary ms-2';
                    checkmark.textContent = '✓';
                    container.appendChild(checkmark);
                }
                
                link.appendChild(container);
                listItem.appendChild(link);
                
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

    /**
     * Show archive browser modal with archived tasks
     * @param {Array} archivedTasks - Array of archived tasks
     * @param {string} boardName - Name of the board
     */
    showArchiveBrowser(archivedTasks, boardName) {
        // Create archive modal HTML
        const archiveModal = document.createElement('div');
        archiveModal.className = 'modal-overlay archive-modal';
        archiveModal.id = 'archive-modal';
        
        // Sort archived tasks by archived date (newest first)
        const sortedTasks = [...archivedTasks].sort((a, b) => 
            new Date(b.archivedTimestamp || b.archivedDate) - new Date(a.archivedTimestamp || a.archivedDate)
        );
        
        const tasksList = sortedTasks.map(task => `
            <div class="archive-task-item" data-task-id="${task.id}">
                <div class="archive-task-content">
                    <div class="archive-task-text">${this.sanitizeHTML(task.text)}</div>
                    <div class="archive-task-meta">
                        <span class="archive-task-status">Status: ${task.status}</span>
                        <span class="archive-task-date">Archived: ${this.formatDate(task.archivedDate)}</span>
                        <span class="archive-task-id">#${task.id.slice(-6)}</span>
                    </div>
                </div>
                <div class="archive-task-actions">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="restoreArchivedTask('${task.id}')"
                            title="Restore task">
                        ↩️ Restore
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="deleteArchivedTask('${task.id}')"
                            title="Permanently delete task">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        // Create archive modal safely
        const modalBox = document.createElement('div');
        modalBox.className = 'modal-box archive-modal-box';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'archive-modal-header';
        
        const modalTitle = document.createElement('h3');
        modalTitle.textContent = `Archive Browser - ${boardName}`; // Use textContent for safety
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'archive-modal-close';
        closeBtn.setAttribute('aria-label', 'Close archive');
        closeBtn.textContent = '✕';
        closeBtn.onclick = () => window.closeArchiveModal();
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);
        
        const modalContent = document.createElement('div');
        modalContent.className = 'archive-modal-content';
        
        const archiveStats = document.createElement('div');
        archiveStats.className = 'archive-stats';
        
        const statsText = document.createElement('p');
        statsText.textContent = `${archivedTasks.length} archived task${archivedTasks.length === 1 ? '' : 's'}`;
        archiveStats.appendChild(statsText);
        
        const tasksListDiv = document.createElement('div');
        tasksList.className = 'archive-tasks-list';
        // Create tasks list safely - tasksList contains pre-sanitized HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = tasksList; // tasksList is already sanitized above
        while (tempDiv.firstChild) {
            tasksListDiv.appendChild(tempDiv.firstChild);
        }
        
        modalContent.appendChild(archiveStats);
        modalContent.appendChild(tasksListDiv);
        
        const modalFooter = document.createElement('div');
        modalFooter.className = 'archive-modal-footer';
        
        const closeFooterBtn = document.createElement('button');
        closeFooterBtn.className = 'btn btn-secondary';
        closeFooterBtn.textContent = 'Close';
        closeFooterBtn.onclick = () => window.closeArchiveModal();
        
        const clearAllBtn = document.createElement('button');
        clearAllBtn.className = 'btn btn-outline-warning';
        clearAllBtn.textContent = 'Clear All Archived';
        clearAllBtn.onclick = () => window.clearAllArchived();
        
        modalFooter.appendChild(closeFooterBtn);
        modalFooter.appendChild(clearAllBtn);
        
        modalBox.appendChild(modalHeader);
        modalBox.appendChild(modalContent);
        modalBox.appendChild(modalFooter);
        
        archiveModal.appendChild(modalBox);
        
        // Add to DOM
        document.body.appendChild(archiveModal);
        
        // Add global functions for archive actions
        window.closeArchiveModal = () => {
            const modal = document.getElementById('archive-modal');
            if (modal) {
                document.body.removeChild(modal);
            }
            // Clean up global functions
            delete window.closeArchiveModal;
            delete window.restoreArchivedTask;
            delete window.deleteArchivedTask;
            delete window.clearAllArchived;
        };
        
        window.restoreArchivedTask = (taskId) => {
            eventBus.emit('archive:restore', { taskId });
        };
        
        window.deleteArchivedTask = (taskId) => {
            eventBus.emit('archive:delete', { taskId });
        };
        
        window.clearAllArchived = () => {
            eventBus.emit('archive:clearAll');
        };
        
        // Focus the close button for accessibility
        setTimeout(() => {
            const closeBtn = archiveModal.querySelector('.archive-modal-close');
            if (closeBtn) closeBtn.focus();
        }, 100);
        
        // Close on escape key
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                window.closeArchiveModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Initialize simple tooltips for elements with data-bs-toggle="tooltip"
     */
    initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const title = e.target.getAttribute('title');
                if (title) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'simple-tooltip';
                    tooltip.textContent = title;
                    tooltip.style.cssText = `
                        position: absolute;
                        background: rgba(0, 0, 0, 0.8);
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        white-space: nowrap;
                        z-index: 1070;
                        pointer-events: none;
                    `;
                    
                    document.body.appendChild(tooltip);
                    
                    const rect = e.target.getBoundingClientRect();
                    const tooltipRect = tooltip.getBoundingClientRect();
                    
                    tooltip.style.left = (rect.left + rect.width / 2 - tooltipRect.width / 2) + 'px';
                    tooltip.style.top = (rect.top - tooltipRect.height - 5) + 'px';
                    
                    e.target._tooltip = tooltip;
                }
            });
            
            element.addEventListener('mouseleave', (e) => {
                if (e.target._tooltip) {
                    document.body.removeChild(e.target._tooltip);
                    e.target._tooltip = null;
                }
            });
        });
    }
}

// Export singleton instance
export default new DOMManager();