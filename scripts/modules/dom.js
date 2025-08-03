import eventBus from './eventBus.js';
import accessibility from './accessibility.js';
import { debugLog } from './settings.js';
import performanceOptimizer from './performance.js';

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
            forceRefreshBtn: document.getElementById('force-refresh-btn'),
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
                    const currentText = element.closest('.task-card').querySelector('.task-text')?.textContent;
                    eventBus.emit('task:edit:requested', { taskId, currentText });
                    break;
                case 'delete':
                    eventBus.emit('task:delete:requested', { taskId });
                    break;
                case 'move':
                    eventBus.emit('task:drop', { taskId, targetStatus });
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

        // Setup drop zone event listeners for columns
        this.setupDropZones();
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
        
        // Setup event bus listeners for DOM updates
        eventBus.on('tasks:changed', (data) => {
            if (data && data.tasksByStatus) {
                this.renderTasks(data.tasksByStatus);
            }
        });
        
        eventBus.on('boards:changed', (data) => {
            if (data && data.boards && data.currentBoardId) {
                this.renderBoardSelector(data.boards, data.currentBoardId);
            }
        });
        
        eventBus.on('theme:changed', (data) => {
            if (data && data.theme) {
                document.body.className = `theme-${data.theme}`;
            }
        });
        
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
            
            const action = element.dataset.boardAction;
            const boardId = element.dataset.boardId;
            
            switch (action) {
                case 'switch':
                    eventBus.emit('board:switch', { boardId });
                    // Close dropdown after switching
                    this.closeBoardSelectorDropdown();
                    break;
                case 'create':
                    eventBus.emit('board:create:request');
                    // Close dropdown after action
                    this.closeBoardSelectorDropdown();
                    break;
                case 'manage':
                    eventBus.emit('boards:manage');
                    // Close dropdown after action
                    this.closeBoardSelectorDropdown();
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
     * Close the board selector dropdown
     */
    closeBoardSelectorDropdown() {
        const dropdown = this.elements.boardSelectorMenu;
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
            
            // Update aria-expanded on trigger button
            const trigger = this.elements.boardSelectorBtn;
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
        }
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
        if (this.elements.forceRefreshBtn) {
            this.elements.forceRefreshBtn.addEventListener('click', () => {
                eventBus.emit('app:forceRefresh');
                this.hideMenuPanel();
            });
        }

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
        const columns = document.querySelectorAll('.board-column__content');
        
        columns.forEach(column => {
            
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
                
                debugLog.log('🎯 Task dropped:', { taskId, targetStatus });
                
                if (taskId && targetStatus) {
                    eventBus.emit('task:drop', { taskId, targetStatus });
                }
            });
        });
    }

    /**
     * Delegate event handler
     * @param {string} eventType - Event type to delegate
     * @param {string} selector - CSS selector for target elements
     * @param {Function} handler - Event handler function
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
        card.setAttribute('role', 'article'); // Add role attribute for tests
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
        cardText.className = 'task-text'; // Use class name that tests expect
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
        editBtn.className = 'task-edit-btn'; // Use class name that tests expect
        editBtn.setAttribute('data-action', 'edit');
        editBtn.setAttribute('data-task-id', task.id);
        editBtn.setAttribute('title', 'Edit task');
        editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
        editBtn.textContent = '✏️';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-delete-btn'; // Use class name that tests expect
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
                <button class="task-move-btn" data-action="move" data-task-id="${taskId}" data-target-status="todo" title="Move to To-Do" aria-label="Move '${sanitizedText}' to To-Do">
                    📋
                </button>
            `);
        }
        
        if (currentStatus !== 'doing') {
            buttons.push(`
                <button class="task-move-btn" data-action="move" data-task-id="${taskId}" data-target-status="doing" title="Move to In Progress" aria-label="Move '${sanitizedText}' to In Progress">
                    ⚡
                </button>
            `);
        }
        
        if (currentStatus !== 'done') {
            buttons.push(`
                <button class="task-move-btn" data-action="move" data-task-id="${taskId}" data-target-status="done" title="Move to Done" aria-label="Move '${sanitizedText}' to Done">
                    ✅
                </button>
            `);
        }
        
        // Add archive button for completed tasks
        if (currentStatus === 'done') {
            buttons.push(`
                <button class="task-archive-btn" data-action="archive" data-task-id="${taskId}" title="Archive task" aria-label="Archive '${sanitizedText}'">
                    📦
                </button>
            `);
        }
        
        return buttons.join('');
    }

    /**
     * Render tasks in columns with performance optimization
     * @param {Object} tasksByStatus - Tasks grouped by status
     */
    renderTasks(tasksByStatus) {
        const startTime = performance.now();
        
        // Check if we should use virtual scrolling for large datasets
        const totalTasks = Object.values(tasksByStatus).flat().length;
        const useVirtualScrolling = totalTasks > 1000;
        
        if (useVirtualScrolling) {
            debugLog.log('📊 Using virtual scrolling for large dataset:', { totalTasks });
            this.renderTasksVirtual(tasksByStatus);
            return;
        }
        // Debug logging to help identify grouping issues
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
        
        // Emit DOM event for integration
        const taskCounts = {
            todo: tasksByStatus.todo?.length || 0,
            doing: tasksByStatus.doing?.length || 0,
            done: tasksByStatus.done?.length || 0
        };
        
        eventBus.emit('dom:tasks:rendered', {
            taskCount: allTaskElements.length,
            columns: taskCounts
        });
        
        const endTime = performance.now();
        debugLog.log('✅ Task rendering completed successfully', {
            totalTasks: allTaskElements.length,
            renderTime: `${(endTime - startTime).toFixed(2)}ms`,
            useVirtualScrolling: false
        });
    }

    /**
     * Render tasks using virtual scrolling for large datasets
     * @param {Object} tasksByStatus - Tasks grouped by status
     */
    renderTasksVirtual(tasksByStatus) {
        const startTime = performance.now();
        
        debugLog.log('🔄 Rendering tasks with virtual scrolling...');
        
        // Render each column with virtual scrolling
        Object.entries(tasksByStatus).forEach(([status, tasks]) => {
            const columnElement = this.elements[`${status}List`];
            if (!columnElement) {
                console.warn(`⚠️ Column element not found for status: ${status}`);
                return;
            }

            if (tasks.length === 0) {
                this.addEmptyState(columnElement, this.getEmptyMessage(status));
                return;
            }

            // Create virtual scroller for this column if tasks > 100
            if (tasks.length > 100) {
                const scroller = performanceOptimizer.createVirtualScroller(
                    columnElement,
                    tasks,
                    (task, index) => this.createTaskCard(task)
                );
                
                debugLog.log(`📋 Virtual scroller created for ${status} column:`, {
                    taskCount: tasks.length,
                    scrollerId: scroller.constructor.name
                });
            } else {
                // Use optimized rendering for smaller lists
                performanceOptimizer.optimizedRender(
                    columnElement,
                    tasks,
                    (task) => this.createTaskCard(task)
                );
            }
        });

        // Update counters
        this.updateTaskCounts(tasksByStatus);

        const endTime = performance.now();
        debugLog.log('✅ Virtual scrolling render completed', {
            renderTime: `${(endTime - startTime).toFixed(2)}ms`
        });
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
                // Only allow HTML if explicitly requested and content is trusted (like settings form)
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
                modal.style.display = 'none';
                
                // Reset z-index
                modal.style.zIndex = '';
                
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
                // Check if archive modal or board management modal is open and adjust z-index to appear above it
                const archiveModal = document.getElementById('archive-modal');
                const boardManagementModal = document.getElementById('board-management-modal');
                if (archiveModal || boardManagementModal) {
                    modal.style.zIndex = 'calc(var(--z-modal) + 10)';
                }
                modal.classList.add('modal-overlay--visible');
                modal.style.display = 'flex';
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
            this.elements.customModal.style.display = 'none';
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
     * Show board management modal
     * @param {Array} boards - All boards (active and archived)
     * @param {Object} currentBoard - Currently selected board
     */
    showBoardManagementModal(boards, currentBoard) {
        const modal = this.createBoardManagementModal(boards, currentBoard);
        document.body.appendChild(modal);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add('modal-overlay--visible');
        });
        
        // Focus first interactive element
        const firstButton = modal.querySelector('button, input, select');
        if (firstButton) {
            setTimeout(() => firstButton.focus(), 100);
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Setup modal event listeners
        this.setupBoardManagementModalEvents(modal);
    }

    /**
     * Create board management modal element
     * @param {Array} boards - All boards
     * @param {Object} currentBoard - Currently selected board
     * @returns {HTMLElement} Modal element
     */
    createBoardManagementModal(boards, currentBoard) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay board-management-modal';
        modal.id = 'board-management-modal';
        
        const modalBox = document.createElement('div');
        modalBox.className = 'modal-box';
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'modal-header d-flex justify-content-between align-items-center mb-3';
        
        const title = document.createElement('h5');
        title.className = 'modal-title mb-0';
        title.textContent = '📋 Manage Boards';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-sm btn-outline-secondary';
        closeBtn.setAttribute('data-action', 'close');
        closeBtn.setAttribute('aria-label', 'Close board management');
        closeBtn.textContent = '✕';
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Modal content
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        // Create new board section
        const createSection = this.createNewBoardSection();
        content.appendChild(createSection);
        
        // Boards list section
        const boardsSection = this.createBoardsListSection(boards, currentBoard);
        content.appendChild(boardsSection);
        
        modalBox.appendChild(header);
        modalBox.appendChild(content);
        modal.appendChild(modalBox);
        
        return modal;
    }

    /**
     * Create new board section
     * @returns {HTMLElement} New board section
     */
    createNewBoardSection() {
        const section = document.createElement('div');
        section.className = 'new-board-section mb-4 p-3 border rounded';
        
        const sectionTitle = document.createElement('h6');
        sectionTitle.className = 'mb-3';
        sectionTitle.textContent = '➕ Create New Board';
        
        const form = document.createElement('form');
        form.className = 'new-board-form';
        form.setAttribute('data-action', 'create-board');
        
        // Board name input
        const nameGroup = document.createElement('div');
        nameGroup.className = 'mb-3';
        
        const nameLabel = document.createElement('label');
        nameLabel.className = 'form-label';
        nameLabel.textContent = 'Board Name';
        nameLabel.setAttribute('for', 'new-board-name');
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-control';
        nameInput.id = 'new-board-name';
        nameInput.placeholder = 'Enter board name (1-50 characters)';
        nameInput.maxLength = 50;
        nameInput.required = true;
        
        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);
        
        // Board description input
        const descGroup = document.createElement('div');
        descGroup.className = 'mb-3';
        
        const descLabel = document.createElement('label');
        descLabel.className = 'form-label';
        descLabel.textContent = 'Description (Optional)';
        descLabel.setAttribute('for', 'new-board-description');
        
        const descInput = document.createElement('textarea');
        descInput.className = 'form-control';
        descInput.id = 'new-board-description';
        descInput.placeholder = 'Enter board description (max 200 characters)';
        descInput.maxLength = 200;
        descInput.rows = 2;
        
        descGroup.appendChild(descLabel);
        descGroup.appendChild(descInput);
        
        // Board color picker
        const colorGroup = document.createElement('div');
        colorGroup.className = 'mb-3';
        
        const colorLabel = document.createElement('label');
        colorLabel.className = 'form-label';
        colorLabel.textContent = 'Board Color';
        
        const colorPicker = this.createColorPicker();
        
        colorGroup.appendChild(colorLabel);
        colorGroup.appendChild(colorPicker);
        
        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Create Board';
        
        form.appendChild(nameGroup);
        form.appendChild(descGroup);
        form.appendChild(colorGroup);
        form.appendChild(submitBtn);
        
        section.appendChild(sectionTitle);
        section.appendChild(form);
        
        return section;
    }

    /**
     * Create color picker for board colors
     * @returns {HTMLElement} Color picker element
     */
    createColorPicker() {
        const colorPicker = document.createElement('div');
        colorPicker.className = 'color-picker d-flex flex-wrap gap-2';
        
        // Material Design 3 color palette
        const colors = [
            '#6750a4', '#7c4dff', '#3f51b5', '#2196f3', '#03a9f4',
            '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
            '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#f44336',
            '#e91e63', '#9c27b0', '#673ab7', '#607d8b', '#795548'
        ];
        
        colors.forEach((color, index) => {
            const colorOption = document.createElement('button');
            colorOption.type = 'button';
            colorOption.className = 'color-option';
            colorOption.style.cssText = `
                width: 32px;
                height: 32px;
                background-color: ${color};
                border: 2px solid transparent;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            colorOption.setAttribute('data-color', color);
            colorOption.setAttribute('title', `Color ${index + 1}`);
            colorOption.setAttribute('aria-label', `Select color ${color}`);
            
            // Set first color as default
            if (index === 0) {
                colorOption.style.borderColor = '#000';
                colorOption.classList.add('selected');
            }
            
            colorPicker.appendChild(colorOption);
        });
        
        return colorPicker;
    }

    /**
     * Create boards list section
     * @param {Array} boards - All boards
     * @param {Object} currentBoard - Currently selected board
     * @returns {HTMLElement} Boards list section
     */
    createBoardsListSection(boards, currentBoard) {
        const section = document.createElement('div');
        section.className = 'boards-list-section';
        
        const sectionTitle = document.createElement('h6');
        sectionTitle.className = 'mb-3';
        sectionTitle.textContent = '📋 All Boards';
        
        const boardsList = document.createElement('div');
        boardsList.className = 'boards-list';
        boardsList.id = 'boards-management-list';
        
        if (boards.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state text-center text-muted py-4';
            emptyState.textContent = 'No boards available';
            boardsList.appendChild(emptyState);
        } else {
            // Separate active and archived boards
            const activeBoards = boards.filter(board => !board.isArchived);
            const archivedBoards = boards.filter(board => board.isArchived);
            
            // Active boards
            if (activeBoards.length > 0) {
                const activeHeader = document.createElement('div');
                activeHeader.className = 'boards-section-header mb-2';
                activeHeader.textContent = 'Active Boards';
                boardsList.appendChild(activeHeader);
                
                activeBoards.forEach(board => {
                    const boardItem = this.createBoardManagementItem(board, currentBoard);
                    boardsList.appendChild(boardItem);
                });
            }
            
            // Archived boards
            if (archivedBoards.length > 0) {
                const archivedHeader = document.createElement('div');
                archivedHeader.className = 'boards-section-header mb-2 mt-4';
                archivedHeader.textContent = 'Archived Boards';
                boardsList.appendChild(archivedHeader);
                
                archivedBoards.forEach(board => {
                    const boardItem = this.createBoardManagementItem(board, currentBoard);
                    boardsList.appendChild(boardItem);
                });
            }
        }
        
        section.appendChild(sectionTitle);
        section.appendChild(boardsList);
        
        return section;
    }

    /**
     * Create individual board management item
     * @param {Object} board - Board data
     * @param {Object} currentBoard - Currently selected board
     * @returns {HTMLElement} Board item element
     */
    createBoardManagementItem(board, currentBoard) {
        const item = document.createElement('div');
        item.className = `board-management-item ${board.isArchived ? 'archived' : ''} ${currentBoard && board.id === currentBoard.id ? 'current' : ''}`;
        item.setAttribute('data-board-id', board.id);
        
        const itemContent = document.createElement('div');
        itemContent.className = 'board-item-content d-flex align-items-center gap-3 p-3 border rounded mb-2';
        
        // Board color indicator
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'board-color-indicator';
        colorIndicator.style.cssText = `
            width: 16px;
            height: 16px;
            background-color: ${board.color};
            border-radius: 50%;
            flex-shrink: 0;
        `;
        
        // Board info
        const boardInfo = document.createElement('div');
        boardInfo.className = 'board-info flex-grow-1';
        
        const boardName = document.createElement('div');
        boardName.className = 'board-name fw-semibold';
        boardName.textContent = board.name;
        
        const boardMeta = document.createElement('div');
        boardMeta.className = 'board-meta text-muted small';
        
        const taskCount = (board.tasks || []).length;
        const statusText = board.isArchived ? 'Archived' : 'Active';
        const defaultText = board.isDefault ? ' • Default' : '';
        const currentText = currentBoard && board.id === currentBoard.id ? ' • Current' : '';
        
        boardMeta.textContent = `${taskCount} tasks • ${statusText}${defaultText}${currentText}`;
        
        if (board.description) {
            const boardDesc = document.createElement('div');
            boardDesc.className = 'board-description text-muted small mt-1';
            boardDesc.textContent = board.description;
            boardInfo.appendChild(boardName);
            boardInfo.appendChild(boardDesc);
            boardInfo.appendChild(boardMeta);
        } else {
            boardInfo.appendChild(boardName);
            boardInfo.appendChild(boardMeta);
        }
        
        // Board actions
        const boardActions = document.createElement('div');
        boardActions.className = 'board-actions d-flex gap-2';
        
        // Switch button (only for active boards)
        if (!board.isArchived && (!currentBoard || board.id !== currentBoard.id)) {
            const switchBtn = document.createElement('button');
            switchBtn.className = 'btn btn-sm btn-outline-primary';
            switchBtn.setAttribute('data-action', 'switch');
            switchBtn.setAttribute('data-board-id', board.id);
            switchBtn.setAttribute('title', 'Switch to this board');
            switchBtn.textContent = '🔄';
            boardActions.appendChild(switchBtn);
        }
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-outline-secondary';
        editBtn.setAttribute('data-action', 'edit');
        editBtn.setAttribute('data-board-id', board.id);
        editBtn.setAttribute('title', 'Edit board');
        editBtn.textContent = '✏️';
        boardActions.appendChild(editBtn);
        
        // Duplicate button
        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'btn btn-sm btn-outline-info';
        duplicateBtn.setAttribute('data-action', 'duplicate');
        duplicateBtn.setAttribute('data-board-id', board.id);
        duplicateBtn.setAttribute('title', 'Duplicate board');
        duplicateBtn.textContent = '📋';
        boardActions.appendChild(duplicateBtn);
        
        // Archive/Unarchive button
        const archiveBtn = document.createElement('button');
        archiveBtn.className = `btn btn-sm ${board.isArchived ? 'btn-outline-success' : 'btn-outline-warning'}`;
        archiveBtn.setAttribute('data-action', board.isArchived ? 'unarchive' : 'archive');
        archiveBtn.setAttribute('data-board-id', board.id);
        archiveBtn.setAttribute('title', board.isArchived ? 'Unarchive board' : 'Archive board');
        archiveBtn.textContent = board.isArchived ? '📤' : '📦';
        boardActions.appendChild(archiveBtn);
        
        // Delete button (not for default boards)
        if (!board.isDefault) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger';
            deleteBtn.setAttribute('data-action', 'delete');
            deleteBtn.setAttribute('data-board-id', board.id);
            deleteBtn.setAttribute('title', 'Delete board');
            deleteBtn.textContent = '🗑️';
            boardActions.appendChild(deleteBtn);
        }
        
        itemContent.appendChild(colorIndicator);
        itemContent.appendChild(boardInfo);
        itemContent.appendChild(boardActions);
        
        item.appendChild(itemContent);
        
        return item;
    }

    /**
     * Setup board management modal event listeners
     * @param {HTMLElement} modal - Modal element
     */
    setupBoardManagementModalEvents(modal) {
        // Close modal events
        const closeModal = () => {
            modal.classList.remove('modal-overlay--visible');
            document.body.style.overflow = '';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        };
        
        // Close button
        modal.addEventListener('click', (event) => {
            if (event.target.getAttribute('data-action') === 'close') {
                closeModal();
            }
        });
        
        // Click outside to close
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
        
        // Escape key to close
        const escapeHandler = (event) => {
            if (event.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Color picker events
        modal.addEventListener('click', (event) => {
            if (event.target.classList.contains('color-option')) {
                // Remove previous selection
                modal.querySelectorAll('.color-option').forEach(option => {
                    option.classList.remove('selected');
                    option.style.borderColor = 'transparent';
                });
                
                // Select new color
                event.target.classList.add('selected');
                event.target.style.borderColor = '#000';
            }
        });
        
        // New board form submission
        modal.addEventListener('submit', (event) => {
            if (event.target.getAttribute('data-action') === 'create-board') {
                event.preventDefault();
                this.handleNewBoardSubmission(event.target, closeModal);
            }
        });
        
        // Board action buttons
        modal.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-action');
            const boardId = event.target.getAttribute('data-board-id');
            
            if (action && boardId) {
                event.preventDefault();
                
                switch (action) {
                    case 'switch':
                        eventBus.emit('board:switch', { boardId });
                        closeModal();
                        break;
                    case 'edit':
                        this.handleBoardEditInModal(boardId, event.target);
                        break;
                    case 'duplicate':
                        eventBus.emit('board:duplicate', { boardId });
                        break;
                    case 'archive':
                        eventBus.emit('board:archive', { boardId });
                        break;
                    case 'unarchive':
                        eventBus.emit('board:unarchive', { boardId });
                        break;
                    case 'delete':
                        eventBus.emit('board:delete', { boardId });
                        break;
                }
            }
        });
    }

    /**
     * Handle new board form submission
     * @param {HTMLFormElement} form - Form element
     * @param {Function} closeModal - Function to close modal
     */
    handleNewBoardSubmission(form, closeModal) {
        const nameInput = form.querySelector('#new-board-name');
        const descInput = form.querySelector('#new-board-description');
        const selectedColor = form.querySelector('.color-option.selected');
        
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const color = selectedColor ? selectedColor.getAttribute('data-color') : '#6750a4';
        
        if (!name) {
            nameInput.focus();
            this.showToast('Board name is required', 'error');
            return;
        }
        
        if (name.length > 50) {
            nameInput.focus();
            this.showToast('Board name must be 50 characters or less', 'error');
            return;
        }
        
        if (description.length > 200) {
            descInput.focus();
            this.showToast('Board description must be 200 characters or less', 'error');
            return;
        }
        
        // Emit board creation event
        eventBus.emit('board:create', {
            name,
            description,
            color
        });
        
        // Reset form
        form.reset();
        
        // Reset color selection to first color
        form.querySelectorAll('.color-option').forEach((option, index) => {
            option.classList.remove('selected');
            option.style.borderColor = 'transparent';
            if (index === 0) {
                option.classList.add('selected');
                option.style.borderColor = '#000';
            }
        });
        
        closeModal();
    }

    /**
     * Handle board editing within the modal
     * @param {string} boardId - Board ID to edit
     * @param {HTMLElement} editButton - Edit button element
     */
    handleBoardEditInModal(boardId, editButton) {
        // Find the board item
        const boardItem = editButton.closest('.board-management-item');
        const boardInfo = boardItem.querySelector('.board-info');
        const boardName = boardInfo.querySelector('.board-name');
        const boardDesc = boardInfo.querySelector('.board-description');
        
        // Create inline edit form
        const editForm = document.createElement('form');
        editForm.className = 'inline-edit-form';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-control form-control-sm mb-2';
        nameInput.value = boardName.textContent;
        nameInput.maxLength = 50;
        nameInput.required = true;
        
        const descInput = document.createElement('textarea');
        descInput.className = 'form-control form-control-sm mb-2';
        descInput.value = boardDesc ? boardDesc.textContent : '';
        descInput.maxLength = 200;
        descInput.rows = 2;
        descInput.placeholder = 'Board description (optional)';
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'd-flex gap-2';
        
        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'btn btn-sm btn-primary';
        saveBtn.textContent = 'Save';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-sm btn-secondary';
        cancelBtn.textContent = 'Cancel';
        
        buttonGroup.appendChild(saveBtn);
        buttonGroup.appendChild(cancelBtn);
        
        editForm.appendChild(nameInput);
        editForm.appendChild(descInput);
        editForm.appendChild(buttonGroup);
        
        // Replace board info with edit form
        boardInfo.style.display = 'none';
        boardItem.appendChild(editForm);
        
        // Focus name input
        nameInput.focus();
        nameInput.select();
        
        // Handle form submission
        editForm.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const newName = nameInput.value.trim();
            const newDescription = descInput.value.trim();
            
            if (!newName) {
                nameInput.focus();
                return;
            }
            
            // Emit board edit event
            eventBus.emit('board:edit', {
                boardId,
                name: newName,
                description: newDescription
            });
            
            // Restore original display
            boardInfo.style.display = '';
            editForm.remove();
        });
        
        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            boardInfo.style.display = '';
            editForm.remove();
        });
        
        // Handle escape key
        const escapeHandler = (event) => {
            if (event.key === 'Escape') {
                boardInfo.style.display = '';
                editForm.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
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
            
            // Add boards section header
            const boardsHeader = document.createElement('li');
            boardsHeader.innerHTML = '<h6 class="dropdown-header">Switch Board</h6>';
            this.elements.activeBoardsList.appendChild(boardsHeader);
            
            if (boards.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.innerHTML = '<span class="dropdown-item text-muted">No boards available</span>';
                this.elements.activeBoardsList.appendChild(emptyItem);
            } else {
                // Render each board with enhanced information
                boards.forEach(board => {
                    const listItem = this.createBoardSelectorItem(board, currentBoard);
                    this.elements.activeBoardsList.appendChild(listItem);
                });
            }
            
            // Add divider
            const divider = document.createElement('li');
            divider.innerHTML = '<hr class="dropdown-divider">';
            this.elements.activeBoardsList.appendChild(divider);
            
            // Add "Create New Board" option
            const createBoardItem = document.createElement('li');
            const createBoardLink = document.createElement('a');
            createBoardLink.className = 'dropdown-item';
            createBoardLink.href = '#';
            createBoardLink.setAttribute('data-board-action', 'create');
            
            const createContainer = document.createElement('div');
            createContainer.className = 'd-flex align-items-center gap-2';
            
            const createIcon = document.createElement('span');
            createIcon.textContent = '➕';
            createIcon.style.cssText = 'width: 16px; text-align: center;';
            
            const createText = document.createElement('span');
            createText.textContent = 'Create New Board';
            createText.className = 'fw-medium';
            
            createContainer.appendChild(createIcon);
            createContainer.appendChild(createText);
            createBoardLink.appendChild(createContainer);
            createBoardItem.appendChild(createBoardLink);
            this.elements.activeBoardsList.appendChild(createBoardItem);
            
            // Add "Manage Boards" option
            const manageBoardsItem = document.createElement('li');
            const manageBoardsLink = document.createElement('a');
            manageBoardsLink.className = 'dropdown-item';
            manageBoardsLink.href = '#';
            manageBoardsLink.setAttribute('data-board-action', 'manage');
            
            const manageContainer = document.createElement('div');
            manageContainer.className = 'd-flex align-items-center gap-2';
            
            const manageIcon = document.createElement('span');
            manageIcon.textContent = '⚙️';
            manageIcon.style.cssText = 'width: 16px; text-align: center;';
            
            const manageText = document.createElement('span');
            manageText.textContent = 'Manage Boards';
            manageText.className = 'fw-medium';
            
            manageContainer.appendChild(manageIcon);
            manageContainer.appendChild(manageText);
            manageBoardsLink.appendChild(manageContainer);
            manageBoardsItem.appendChild(manageBoardsLink);
            this.elements.activeBoardsList.appendChild(manageBoardsItem);
        }
    }

    /**
     * Create individual board selector item with statistics and visual indicators
     * @param {Object} board - Board data
     * @param {Object} currentBoard - Currently selected board
     * @returns {HTMLElement} Board selector item
     */
    createBoardSelectorItem(board, currentBoard) {
        const listItem = document.createElement('li');
        const isActive = currentBoard && board.id === currentBoard.id;
        
        // Create board list item
        const link = document.createElement('a');
        link.className = `dropdown-item board-selector-item ${isActive ? 'active' : ''}`;
        link.href = '#';
        link.setAttribute('data-board-action', 'switch');
        link.setAttribute('data-board-id', board.id);
        link.setAttribute('title', `Switch to ${board.name}`);
        
        const container = document.createElement('div');
        container.className = 'd-flex align-items-center gap-3 py-1';
        
        // Board color indicator with enhanced visual
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'board-color-indicator';
        colorIndicator.style.cssText = `
            width: 16px; 
            height: 16px; 
            background-color: ${board.color}; 
            border-radius: 3px;
            border: 1px solid rgba(0,0,0,0.1);
            flex-shrink: 0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        `;
        
        // Board content with name and description
        const contentDiv = document.createElement('div');
        contentDiv.className = 'board-content flex-grow-1';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'board-name fw-medium';
        nameDiv.textContent = board.name;
        
        // Add description if available
        if (board.description && board.description.trim()) {
            const descDiv = document.createElement('div');
            descDiv.className = 'board-description text-muted small';
            descDiv.textContent = board.description;
            descDiv.style.cssText = 'font-size: 0.75rem; line-height: 1.2;';
            contentDiv.appendChild(nameDiv);
            contentDiv.appendChild(descDiv);
        } else {
            contentDiv.appendChild(nameDiv);
        }
        
        // Board statistics with task counts by status
        const statsDiv = document.createElement('div');
        statsDiv.className = 'board-stats';
        
        const tasks = board.tasks || [];
        const todoCount = tasks.filter(task => task.status === 'todo').length;
        const doingCount = tasks.filter(task => task.status === 'doing').length;
        const doneCount = tasks.filter(task => task.status === 'done').length;
        const totalCount = tasks.length;
        
        // Create compact statistics display
        const statsContainer = document.createElement('div');
        statsContainer.className = 'stats-container d-flex flex-column align-items-end';
        
        // Total tasks count
        const totalStats = document.createElement('div');
        totalStats.className = 'total-stats text-muted small fw-medium';
        totalStats.textContent = `${totalCount} task${totalCount === 1 ? '' : 's'}`;
        
        // Status breakdown (only show if there are tasks)
        if (totalCount > 0) {
            const statusStats = document.createElement('div');
            statusStats.className = 'status-stats d-flex gap-2 small';
            statusStats.style.cssText = 'font-size: 0.7rem;';
            
            if (todoCount > 0) {
                const todoStat = document.createElement('span');
                todoStat.className = 'status-stat status-stat--todo';
                todoStat.textContent = `📋${todoCount}`;
                todoStat.setAttribute('title', `${todoCount} To-Do tasks`);
                statusStats.appendChild(todoStat);
            }
            
            if (doingCount > 0) {
                const doingStat = document.createElement('span');
                doingStat.className = 'status-stat status-stat--doing';
                doingStat.textContent = `⚡${doingCount}`;
                doingStat.setAttribute('title', `${doingCount} In Progress tasks`);
                statusStats.appendChild(doingStat);
            }
            
            if (doneCount > 0) {
                const doneStat = document.createElement('span');
                doneStat.className = 'status-stat status-stat--done';
                doneStat.textContent = `✅${doneCount}`;
                doneStat.setAttribute('title', `${doneCount} Done tasks`);
                statusStats.appendChild(doneStat);
            }
            
            statsContainer.appendChild(totalStats);
            statsContainer.appendChild(statusStats);
        } else {
            statsContainer.appendChild(totalStats);
        }
        
        // Active board indicator
        if (isActive) {
            const activeIndicator = document.createElement('div');
            activeIndicator.className = 'active-indicator text-primary ms-2';
            activeIndicator.textContent = '✓';
            activeIndicator.setAttribute('title', 'Currently active board');
            statsContainer.appendChild(activeIndicator);
        }
        
        container.appendChild(colorIndicator);
        container.appendChild(contentDiv);
        container.appendChild(statsContainer);
        
        link.appendChild(container);
        listItem.appendChild(link);
        
        return listItem;
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
        console.log('[DEBUG] showArchiveBrowser called with:', archivedTasks.length, 'tasks, board:', boardName);
        
        // Create archive modal HTML
        const archiveModal = document.createElement('div');
        archiveModal.className = 'modal-overlay archive-modal';
        archiveModal.id = 'archive-modal';
        console.log('[DEBUG] Archive modal element created:', archiveModal);
        
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
        tasksListDiv.className = 'archive-tasks-list';
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
        console.log('[DEBUG] Archive modal added to DOM. Modal element:', archiveModal);
        
        // Make modal visible by adding the --visible class
        archiveModal.classList.add('modal-overlay--visible');
        console.log('[DEBUG] Modal visibility class added. Modal should now be visible.');
        
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
            console.log('[DEBUG] Restore clicked for task:', taskId);
            eventBus.emit('archive:restore', { taskId });
        };
        
        window.deleteArchivedTask = (taskId) => {
            console.log('[DEBUG] Delete clicked for task:', taskId);
            eventBus.emit('archive:delete', { taskId });
        };
        
        window.clearAllArchived = () => {
            console.log('[DEBUG] Clear All Archived clicked');
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
     * Show empty state for new users
     */
    showEmptyState() {
        const mainContent = document.querySelector('#todo-app');
        if (!mainContent) return;
        
        mainContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Welcome to Cascade!</h3>
                <p>Get started by creating your first task to begin organizing your work with Cascade.</p>
                <div class="empty-state-actions">
                    <button class="btn btn-primary" id="create-first-task-btn">
                        ✨ Create First Task
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners for empty state buttons
        const createTaskBtn = document.getElementById('create-first-task-btn');
        
        if (createTaskBtn) {
            createTaskBtn.addEventListener('click', () => {
                // Create default board and focus input
                eventBus.emit('board:create:default');
                setTimeout(() => {
                    this.focusTaskInput();
                }, 100);
            });
        }
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

    /**
     * Show loading indicator on specific element
     * @param {string} elementId - ID of element to show loading on
     */
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.classList.add('loading');
        
        // Add spinner if not already present
        if (!element.querySelector('.loading-spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.innerHTML = '<div class="spinner"></div>';
            element.appendChild(spinner);
        }
    }

    /**
     * Hide loading indicator on specific element
     * @param {string} elementId - ID of element to hide loading on
     */
    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.classList.remove('loading');
        
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    /**
     * Show global loading overlay
     * @param {string} message - Loading message to display
     */
    showGlobalLoading(message = 'Loading...') {
        // Remove existing overlay if present
        this.hideGlobalLoading();
        
        const overlay = document.createElement('div');
        overlay.className = 'global-loading-overlay';
        overlay.innerHTML = `
            <div class="global-loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        document.body.appendChild(overlay);
    }

    /**
     * Hide global loading overlay
     */
    hideGlobalLoading() {
        const overlay = document.querySelector('.global-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, info, warning)
     * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide)
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`; // Use simple class names that tests expect
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast__content">
                <span class="toast__icon">${icons[type] || icons.info}</span>
                <span class="toast__message">${message}</span>
            </div>
            <button class="toast-close" aria-label="Close notification">×</button>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1050;
            max-width: 300px;
        `;
        
        // Add type-specific styling
        if (type === 'success') {
            toast.style.borderLeftColor = '#28a745';
            toast.style.borderLeftWidth = '4px';
        } else if (type === 'error') {
            toast.style.borderLeftColor = '#dc3545';
            toast.style.borderLeftWidth = '4px';
        }
        
        document.body.appendChild(toast);
        
        // Close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
        
        // Auto-hide if duration is set
        if (duration > 0) {
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.remove();
                }
            }, duration);
        }
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - Announcement priority (polite, assertive)
     */
    announceToScreenReader(message, priority = 'polite') {
        let announcer = document.querySelector(`[aria-live="${priority}"]`);
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.setAttribute('aria-live', priority);
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(announcer);
        }
        
        // Clear and set message
        announcer.textContent = '';
        setTimeout(() => {
            announcer.textContent = message;
        }, 100);
    }

    /**
     * Get the complete HTML structure for the main application
     * This method returns the HTML template that should be restored after empty state
     * @returns {string} HTML string for the app structure
     */
    getAppStructureHTML() {
        return `
            <form
                id="todo-form"
                class="d-flex gap-3 mb-4 p-3 shadow-sm rounded bg-white justify-content-center"
            >
                <input
                    type="text"
                    id="todo-input"
                    placeholder="Add a new task"
                    aria-label="New task"
                    class="form-control rounded-pill"
                    maxlength="200"
                    style="max-width: 400px"
                />
                <button
                    type="submit"
                    class="btn btn-primary rounded-pill px-4"
                >
                    Add Task
                </button>
            </form>

            <!-- Task Board -->
            <div class="task-board">
                <div class="board-column board-column--todo" id="todo-column">
                    <div class="board-column__header">
                        <h3 class="board-column__title">To Do</h3>
                        <span class="board-column__count" id="todo-count">0</span>
                    </div>
                    <div
                        class="board-column__content"
                        id="todo-list"
                        data-status="todo"
                    >
                        <!-- Tasks will be dynamically added here -->
                    </div>
                </div>

                <div class="board-column board-column--doing" id="doing-column">
                    <div class="board-column__header">
                        <h3 class="board-column__title">In Progress</h3>
                        <span class="board-column__count" id="doing-count">0</span>
                    </div>
                    <div
                        class="board-column__content"
                        id="doing-list"
                        data-status="doing"
                    >
                        <!-- Tasks will be dynamically added here -->
                    </div>
                </div>

                <div class="board-column board-column--done" id="done-column">
                    <div class="board-column__header">
                        <h3 class="board-column__title">Done</h3>
                        <div class="board-column__actions d-flex align-items-center gap-2">
                            <span class="board-column__count" id="done-count">0</span>
                            <button 
                                id="archive-button"
                                class="btn btn-sm btn-outline-primary"
                                title="Archive all completed tasks in the Done column"
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                            >
                                📦
                            </button>
                            <button 
                                class="btn btn-sm btn-outline-secondary"
                                id="view-archived-tasks-btn"
                                title="View history of all archived tasks"
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                            >
                                📋
                            </button>
                        </div>
                    </div>
                    <div
                        class="board-column__content"
                        id="done-list"
                        data-status="done"
                    >
                        <!-- Tasks will be dynamically added here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Restore the complete application structure after empty state
     * This method rebuilds the form, task board, and all necessary elements
     * then re-initializes event listeners and DOM references
     */
    restoreAppStructure() {
        try {
            console.log('🔄 [DOM_RESTORE] Starting application structure restoration');
            
            const mainContent = document.querySelector('#todo-app');
            if (!mainContent) {
                throw new Error('Main app container (#todo-app) not found');
            }
            
            // Store the current HTML for debugging
            const previousHTML = mainContent.innerHTML;
            console.log('🔄 [DOM_RESTORE] Previous content length:', previousHTML.length);
            
            // Restore the complete HTML structure
            mainContent.innerHTML = this.getAppStructureHTML();
            console.log('🔄 [DOM_RESTORE] HTML structure restored');
            
            // Re-cache DOM elements to update internal references
            this.cacheElements();
            console.log('🔄 [DOM_RESTORE] DOM elements re-cached');
            
            // Verify critical elements exist after restoration
            const criticalElements = ['todoForm', 'todoInput', 'todoList', 'doingList', 'doneList'];
            const missingElements = criticalElements.filter(key => !this.elements[key]);
            
            if (missingElements.length > 0) {
                throw new Error(`Critical elements missing after restoration: ${missingElements.join(', ')}`);
            }
            
            // Re-initialize form event listeners
            this.setupFormEventListeners();
            console.log('🔄 [DOM_RESTORE] Form event listeners reinitialized');
            
            // Re-initialize drag and drop functionality
            this.setupDropZones();
            console.log('🔄 [DOM_RESTORE] Drag and drop zones reinitialized');
            
            // Re-initialize tooltips for new elements
            this.initializeTooltips();
            console.log('🔄 [DOM_RESTORE] Tooltips reinitialized');
            
            // Re-initialize accessibility features
            accessibility.init();
            console.log('🔄 [DOM_RESTORE] Accessibility features reinitialized');
            
            console.log('✅ [DOM_RESTORE] Application structure restoration completed successfully');
            
            // Emit event to notify other modules
            eventBus.emit('dom:restored');
            
        } catch (error) {
            console.error('❌ [DOM_RESTORE] Failed to restore app structure:', error);
            
            // Attempt graceful fallback
            this.handleRestorationError(error);
            
            // Re-throw to allow calling code to handle
            throw error;
        }
    }

    /**
     * Setup form event listeners after restoration
     * This is a separate method to ensure form functionality works after DOM restoration
     */
    setupFormEventListeners() {
        // Remove any existing form listeners to prevent duplicates
        if (this.elements.todoForm) {
            // Clone the form element to remove all event listeners
            const oldForm = this.elements.todoForm;
            const newForm = oldForm.cloneNode(true);
            oldForm.parentNode.replaceChild(newForm, oldForm);
            
            // Update cached reference
            this.elements.todoForm = newForm;
            this.elements.todoInput = newForm.querySelector('#todo-input');
        }
        
        // Add form submission listener
        if (this.elements.todoForm) {
            this.elements.todoForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const text = this.elements.todoInput?.value?.trim();
                if (text) {
                    eventBus.emit('task:create', { text });
                }
            });
        }
        
        // Re-add archive button listener
        const archiveButton = document.getElementById('archive-button');
        if (archiveButton) {
            archiveButton.addEventListener('click', () => {
                eventBus.emit('tasks:archiveCompleted');
            });
        }
        
        // Re-add view archived tasks button listener
        const viewArchivedBtn = document.getElementById('view-archived-tasks-btn');
        if (viewArchivedBtn) {
            viewArchivedBtn.addEventListener('click', () => {
                eventBus.emit('archive:browse');
            });
        }
    }

    /**
     * Handle restoration errors with graceful fallback
     * @param {Error} error - The restoration error
     */
    handleRestorationError(error) {
        console.error('🚨 [DOM_RESTORE] Attempting graceful fallback after restoration failure');
        
        try {
            // Show user-friendly error message
            this.showModal('Application Error', 
                'Failed to initialize the application interface. Please refresh the page to continue.', {
                showCancel: false,
                confirmText: 'Refresh Page'
            }).then((result) => {
                if (result) {
                    window.location.reload();
                }
            });
            
        } catch (fallbackError) {
            console.error('🚨 [DOM_RESTORE] Fallback also failed:', fallbackError);
            
            // Last resort: show basic error message
            const mainContent = document.querySelector('#todo-app');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="alert alert-danger text-center">
                        <h4>Application Error</h4>
                        <p>Failed to initialize the application. Please refresh the page.</p>
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            Refresh Page
                        </button>
                    </div>
                `;
            }
        }
    }
}

// Export singleton instance
export default new DOMManager();