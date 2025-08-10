/**
 * UIService - Focused service for rendering and DOM operations
 * Extracted from CascadeApp god class for better maintainability
 */

import eventBus from '../eventBus.js';
import { Task } from '../models.js';
import performanceOptimizer from '../performance.js';

export class UIService {
    constructor(state, domManager) {
        this.state = state;
        this.dom = domManager;
        this._showingEmptyState = false;
    }

    /**
     * Initialize UI components
     */
    init() {
        this.setupEventListeners();
        this.render();
    }

    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Listen to state changes
        eventBus.on('task:created', () => this.render());
        eventBus.on('task:updated', () => this.render());
        eventBus.on('task:deleted', () => this.render());
        eventBus.on('task:archived', () => this.render());
        eventBus.on('task:restored', () => this.render());
        
        eventBus.on('board:created', () => this.renderBoardSelector());
        eventBus.on('board:updated', () => this.renderBoardSelector());
        eventBus.on('board:deleted', () => this.renderBoardSelector());
        eventBus.on('board:switched', () => {
            this.render();
            this.renderBoardSelector();
        });

        // Filter change events
        eventBus.on('filter:changed', () => this.render());
    }

    /**
     * Main render method - renders the entire task view
     */
    render() {
        try {
            const state = this.state.getState();
            const { tasks, filter, currentBoardId } = state;
            
            console.log('🎨 Rendering UI. Tasks:', tasks ? tasks.length : 0, 'Filter:', filter);
            console.log('🎨 Full state:', state);
            console.log('🎨 Boards:', state.boards.map(b => ({id: b.id, name: b.name, taskCount: b.tasks ? b.tasks.length : 0})));
            
            // Get current board tasks if not available in state
            let currentTasks = tasks;
            if ((!currentTasks || currentTasks.length === 0) && currentBoardId) {
                const currentBoard = state.boards.find(b => b.id === currentBoardId);
                if (currentBoard && currentBoard.tasks) {
                    currentTasks = currentBoard.tasks.map(t => typeof t.toJSON === 'function' ? t : new Task(t));
                    console.log('🎨 Retrieved tasks from board data:', currentTasks.length);
                }
            }
            
            if (!currentTasks || currentTasks.length === 0) {
                console.log('🎨 Showing empty state');
                this.showEmptyState();
                return;
            }

            this.hideEmptyState();

            // Performance optimization for large task lists
            if (currentTasks.length > 1000) {
                return this.renderLargeTaskList(currentTasks, filter);
            }

            this.renderTaskColumns(currentTasks, filter);
            this.updateTaskCounters();
            this.updateBoardTitle(filter);

        } catch (error) {
            console.error('Failed to render UI:', error);
            eventBus.emit('ui:error', { operation: 'render', error: error.message });
        }
    }

    /**
     * Render task columns (todo, doing, done)
     * @param {Array<Task>} tasks - Tasks to render
     * @param {string} filter - Current filter
     */
    renderTaskColumns(tasks, filter) {
        const columns = ['todo', 'doing', 'done'];
        
        columns.forEach(status => {
            const columnElement = document.getElementById(`${status}-list`);
            if (!columnElement) {
                console.warn(`⚠️ UI Service: Column element not found: ${status}-list`);
                return;
            }

            const filteredTasks = this.optimizedFilter(tasks, filter, status);
            
            // Performance optimization for columns with many tasks
            if (filteredTasks.length > 100) {
                this.renderColumnVirtualized(columnElement, filteredTasks, status);
            } else {
                this.renderColumnStandard(columnElement, filteredTasks, status);
            }
        });
    }

    /**
     * Standard column rendering for smaller lists
     * @param {HTMLElement} columnElement - Column container
     * @param {Array<Task>} tasks - Tasks to render
     * @param {string} status - Column status
     */
    renderColumnStandard(columnElement, tasks, status) {
        const taskHTML = tasks.map(task => this.generateTaskHTML(task)).join('');
        columnElement.innerHTML = taskHTML || this.getEmptyColumnMessage(status);
        
        // Update counter
        this.updateColumnCounter(status, tasks.length);
    }

    /**
     * Virtualized column rendering for large lists
     * @param {HTMLElement} columnElement - Column container
     * @param {Array<Task>} tasks - Tasks to render
     * @param {string} status - Column status
     */
    renderColumnVirtualized(columnElement, tasks, status) {
        
        // Render only first 50 tasks initially
        const visibleTasks = tasks.slice(0, 50);
        const taskHTML = visibleTasks.map(task => this.generateTaskHTML(task)).join('');
        
        columnElement.innerHTML = taskHTML;
        
        // Add "show more" button if needed
        if (tasks.length > 50) {
            const showMoreBtn = this.createShowMoreButton(tasks.length - 50, () => {
                this.renderColumnStandard(columnElement, tasks, status);
            });
            columnElement.appendChild(showMoreBtn);
        }
        
        this.updateColumnCounter(status, tasks.length);
    }

    /**
     * Generate task HTML string directly (matching original DOM structure exactly)
     * @param {Task} task - Task to render
     * @returns {string} HTML string
     */
    generateTaskHTML(task) {
        // Validate task has required properties
        if (!task.id || !task.text) {
            console.error('❌ Invalid task data:', task);
            return '';
        }

        // Escape HTML to prevent XSS
        const escapeHtml = (str) => str.replace(/[&<>"']/g, (match) => {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });

        const taskText = escapeHtml(task.text);
        const taskId = escapeHtml(task.id);
        
        // Format date using same logic as original
        const formatDate = (dateString) => {
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
        };

        const formattedDate = task.createdDate ? formatDate(task.createdDate) : '';
        const taskIdShort = task.id.slice(-6);
        
        // Generate status buttons (matching original getStatusButtons logic)
        const getStatusButtons = (currentStatus, taskId, taskText) => {
            const buttons = [];
            
            if (currentStatus !== 'todo') {
                buttons.push(`
                    <button class="task-move-btn" data-action="move" data-task-id="${taskId}" data-target-status="todo" title="Move to To-Do" aria-label="Move '${taskText}' to To-Do">
                        📋
                    </button>
                `);
            }
            
            if (currentStatus !== 'doing') {
                buttons.push(`
                    <button class="task-move-btn" data-action="move" data-task-id="${taskId}" data-target-status="doing" title="Move to In Progress" aria-label="Move '${taskText}' to In Progress">
                        🔄
                    </button>
                `);
            }
            
            if (currentStatus !== 'done') {
                buttons.push(`
                    <button class="task-move-btn" data-action="move" data-task-id="${taskId}" data-target-status="done" title="Mark as Done" aria-label="Mark '${taskText}' as Done">
                        ✅
                    </button>
                `);
            }
            
            return buttons.join('');
        };

        const textClass = task.status === 'done' ? 'task-card__text task-card__text--completed' : 'task-card__text';
        const statusButtons = getStatusButtons(task.status, taskId, taskText);
        
        return `
            <div class="task-card task-card--${task.status}" 
                 draggable="true" 
                 data-task-id="${taskId}" 
                 id="task-${taskId}"
                 data-task-text="${taskText}"
                 aria-label="Task: ${taskText}"
                 role="article"
                 tabindex="0">
                
                <div class="task-card__content">
                    <div class="${textClass}">${taskText}</div>
                    
                    <div class="task-card__meta">
                        <span class="task-card__date">Created: ${formattedDate}</span>
                        <span class="task-card__id">#${taskIdShort}</span>
                    </div>
                </div>
                
                <div class="task-card__actions">
                    <div class="task-card__actions-primary">
                        <button class="task-edit-btn" 
                                data-action="edit" 
                                data-task-id="${taskId}" 
                                title="Edit task"
                                aria-label="Edit task: ${taskText}">
                            ✏️
                        </button>
                        <button class="task-delete-btn" 
                                data-action="delete" 
                                data-task-id="${taskId}" 
                                title="Delete task"
                                aria-label="Delete task: ${taskText}">
                            🗑️
                        </button>
                    </div>
                    <div class="task-card__actions-secondary">
                        ${statusButtons}
                    </div>
                </div>
            </div>
        `.trim();
    }

    /**
     * Render board selector dropdown
     */
    renderBoardSelector() {
        try {
            const { boards, currentBoardId } = this.state.getState();
            const currentBoard = boards.find(b => b.id === currentBoardId);
            
            // Use domManager's renderBoardSelector method which handles the proper styling
            this.dom.renderBoardSelector(boards, currentBoard);

        } catch (error) {
            console.error('Failed to render board selector:', error);
            eventBus.emit('ui:error', { operation: 'renderBoardSelector', error: error.message });
        }
    }

    /**
     * Show empty state when no tasks exist
     */
    showEmptyState() {
        this._showingEmptyState = true;
        
        const containers = ['todo-list', 'doing-list', 'done-list'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <div class="empty-message">No tasks yet</div>
                    </div>
                `;
            }
        });

        // Show create first task button
        const createFirstTaskBtn = document.getElementById('create-first-task');
        if (createFirstTaskBtn) {
            createFirstTaskBtn.style.display = 'block';
        }

        this.updateTaskCounters(0, 0, 0);
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        if (!this._showingEmptyState) return;
        
        this._showingEmptyState = false;
        
        const createFirstTaskBtn = document.getElementById('create-first-task');
        if (createFirstTaskBtn) {
            createFirstTaskBtn.style.display = 'none';
        }
    }

    /**
     * Update task counters in UI
     * @param {number} todoCount - Todo task count (optional)
     * @param {number} doingCount - Doing task count (optional)
     * @param {number} doneCount - Done task count (optional)
     */
    updateTaskCounters(todoCount = null, doingCount = null, doneCount = null) {
        if (todoCount === null) {
            const tasks = this.state.getState().tasks || [];
            todoCount = tasks.filter(t => t.status === 'todo').length;
            doingCount = tasks.filter(t => t.status === 'doing').length;
            doneCount = tasks.filter(t => t.status === 'done').length;
        }

        this.updateColumnCounter('todo', todoCount);
        this.updateColumnCounter('doing', doingCount);
        this.updateColumnCounter('done', doneCount);
    }

    /**
     * Update counter for a specific column
     * @param {string} status - Column status
     * @param {number} count - Task count
     */
    updateColumnCounter(status, count) {
        const counter = document.getElementById(`${status}-count`);
        if (counter) {
            counter.textContent = count;
        } else {
            console.warn(`⚠️ UI Service: Counter element not found: ${status}-count`);
        }
    }

    /**
     * Update board title based on current filter
     * @param {string} filter - Current filter
     */
    updateBoardTitle(filter) {
        const currentBoardNameEl = document.getElementById('current-board-name');
        if (currentBoardNameEl) {
            const currentBoard = this.state.getCurrentBoard();
            if (currentBoard) {
                let displayName = currentBoard.name;
                if (filter && filter !== 'all') {
                    displayName += ` (${filter})`;
                }
                currentBoardNameEl.textContent = displayName;
            }
        }
    }

    /**
     * Optimized filtering for large task lists
     * @param {Array<Task>} tasks - All tasks
     * @param {string} filter - Filter to apply
     * @param {string} status - Optional status filter
     * @returns {Array<Task>} Filtered tasks
     */
    optimizedFilter(tasks, filter, status = null) {
        if (!tasks || tasks.length === 0) return [];
        
        let filteredTasks = tasks;
        
        // Apply status filter first (most selective)
        if (status) {
            filteredTasks = filteredTasks.filter(task => task.status === status);
        }
        
        // Apply general filter
        if (filter && filter !== 'all') {
            switch (filter) {
                case 'todo':
                case 'doing':
                case 'done':
                    if (!status) { // Only apply if status filter not already applied
                        filteredTasks = filteredTasks.filter(task => task.status === filter);
                    }
                    break;
                case 'completed':
                    filteredTasks = filteredTasks.filter(task => task.status === 'done');
                    break;
                case 'active':
                    filteredTasks = filteredTasks.filter(task => task.status !== 'done');
                    break;
            }
        }
        
        return filteredTasks;
    }

    /**
     * Create "show more" button for virtualized rendering
     * @param {number} remainingCount - Number of remaining tasks
     * @param {Function} onClick - Click handler
     * @returns {HTMLElement} Button element
     */
    createShowMoreButton(remainingCount, onClick) {
        const button = document.createElement('button');
        button.className = 'show-more-btn';
        button.textContent = `Show ${remainingCount} more tasks...`;
        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * Get empty column message
     * @param {string} status - Column status
     * @returns {string} Empty message HTML
     */
    getEmptyColumnMessage(status) {
        const messages = {
            todo: '📋 Drop tasks here to plan',
            doing: '⚡ Drop tasks here to work on',
            done: '✅ Drop completed tasks here'
        };
        
        return `
            <div class="empty-column">
                <div class="empty-message">${messages[status] || 'No tasks'}</div>
            </div>
        `;
    }

    /**
     * Render large task list with performance optimizations
     * @param {Array<Task>} tasks - Tasks to render
     * @param {string} filter - Current filter
     */
    renderLargeTaskList(tasks, filter) {
        
        // Use performance optimizer for large lists
        const startTime = performance.now();
        
        this.renderTaskColumns(tasks, filter);
        
        const endTime = performance.now();
        
        // Update performance stats
        performanceOptimizer.recordRenderTime(endTime - startTime);
    }

    /**
     * Focus the task input field
     */
    focusTaskInput() {
        const taskInput = document.getElementById('todo-input');
        if (taskInput) {
            taskInput.focus();
        } else {
            console.warn('⚠️ UI Service: Task input element not found: todo-input');
        }
    }

    /**
     * Clear the task input field
     */
    clearTaskInput() {
        const taskInput = document.getElementById('todo-input');
        if (taskInput) {
            taskInput.value = '';
        } else {
            console.warn('⚠️ UI Service: Task input element not found: todo-input');
        }
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        const loadingEl = document.getElementById('loading-overlay');
        if (loadingEl) {
            loadingEl.querySelector('.loading-message').textContent = message;
            loadingEl.classList.add('active');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingEl = document.getElementById('loading-overlay');
        if (loadingEl) {
            loadingEl.classList.remove('active');
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {string} type - Error type (error, warning, info)
     */
    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast message-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get current UI state
     * @returns {Object} UI state
     */
    getUIState() {
        return {
            showingEmptyState: this._showingEmptyState,
            currentFilter: this.state.getState().filter,
            taskCount: (this.state.getState().tasks || []).length
        };
    }
}

