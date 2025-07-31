import eventBus from './eventBus.js';
import appState from './state.js';
import storage from './storage.js';
import domManager from './dom.js';
import accessibility from './accessibility.js';
import { settingsManager, debugLog } from './settings.js';
import { Board, Task, createBoard, createTask } from './models.js';
import securityManager from './security.js';
import performanceOptimizer from './performance.js';

// Generate unique ID function (duplicated from models.js to avoid circular imports)
function generateUniqueId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Main application controller
 */
class CascadeApp {
    constructor() {
        this.state = appState;
        this.storage = storage;
        this.dom = domManager;
        this.eventBus = eventBus;
        
        this.initPromise = this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            debugLog.log('Starting Cascade app initialization...');
            
            // Initialize DOM first
            this.dom.init();
            debugLog.log('DOM initialized');
            
            // Load data from storage
            await this.loadData();
            debugLog.log('Data loaded');
            
            // Setup event listeners
            this.setupEventListeners();
            debugLog.log('Event listeners setup');
            
            // Initialize settings and apply theme
            settingsManager.loadSettings();
            settingsManager.applyTheme();
            debugLog.log('Settings initialized');
            
            // Initialize auto-archive (with safety checks)
            this.initAutoArchive();
            debugLog.log('Auto-archive initialized');
            
            // Initial render
            this.render();
            this.renderBoardSelector();
            debugLog.log('Initial render complete');
            
            debugLog.log('Cascade app initialized successfully');
            eventBus.emit('app:ready');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleError('Initialization failed', error, 'default');
        }
    }

    /**
     * Load data from storage
     */
    async loadData() {
        try {
            console.log('📂 [LOAD] Loading data from storage...');
            const data = this.storage.load();
            console.log('📂 [LOAD] Raw storage data:', data);
            
            if (data) {
                if (data.boards) {
                    console.log('📂 [LOAD] Processing multi-board format...');
                    // New multi-board format
                    const boards = data.boards.map(boardData => {
                        const tasks = boardData.tasks ? boardData.tasks.map(taskData => new Task(taskData)) : [];
                        return new Board({ ...boardData, tasks: tasks.map(t => t.toJSON()) });
                    });
                    console.log('📂 [LOAD] Processed boards:', boards.length);
                    
                    // Get tasks for current board
                    const currentBoard = boards.find(b => b.id === data.currentBoardId);
                    const currentTasks = currentBoard ? currentBoard.tasks.map(taskData => new Task(taskData)) : [];
                    console.log('📂 [LOAD] Current board:', currentBoard ? currentBoard.name : 'none');
                    console.log('📂 [LOAD] Current tasks:', currentTasks.length);
                    
                    this.state.setState({
                        boards,
                        currentBoardId: data.currentBoardId,
                        tasks: currentTasks,
                        filter: data.filter || 'all'
                    }, { addToHistory: false });
                    
                    eventBus.emit('data:loaded', { boards: boards.length, currentBoard: data.currentBoardId });
                } else if (data.tasks) {
                    // Legacy single board format - create default board
                    const tasks = data.tasks.map(taskData => new Task(taskData));
                    const defaultBoard = createBoard({
                        name: 'Main Board',
                        description: 'Your default task board',
                        tasks: tasks.map(t => t.toJSON()),
                        isDefault: true
                    });
                    
                    this.state.setState({
                        boards: [defaultBoard],
                        currentBoardId: defaultBoard.id,
                        tasks: tasks,
                        filter: data.filter || 'all'
                    }, { addToHistory: false });
                    
                    eventBus.emit('data:loaded', { taskCount: tasks.length, migrated: true });
                } else {
                    // No data found, determine if we should show empty state or create default board
                    this.createDefaultBoard(true); // true = no existing data
                }
            } else {
                // No data found, determine if we should show empty state or create default board  
                this.createDefaultBoard(true); // true = no existing data
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            this.handleError('Failed to load saved data', error, 'storage');
            // Fallback to default board - assume no existing data in error case
            this.createDefaultBoard(true);
        }
    }

    /**
     * Create default board when no data exists
     * @param {boolean} noExistingData - Whether there is no existing data (determines empty state)
     */
    createDefaultBoard(noExistingData = false) {
        // Check if we're in a test environment or should always create default board
        const isTestEnvironment = typeof global !== 'undefined' && global.jest;
        const isInDemoMode = localStorage.getItem('cascade_demo_mode') === 'true';
        
        // Show empty state only for new users (no existing data) and not in demo mode
        const shouldShowEmptyState = !isTestEnvironment && 
                                   !isInDemoMode && 
                                   noExistingData;
        
        if (shouldShowEmptyState) {
            // Show empty state with demo mode option
            this.showEmptyState();
            return;
        }
        
        const defaultBoard = createBoard({
            name: 'Main Board',
            description: 'Your default task board',
            isDefault: true
        });
        
        this.state.setState({
            boards: [defaultBoard],
            currentBoardId: defaultBoard.id,
            tasks: [],
            filter: 'all'
        }, { addToHistory: false });
        
        eventBus.emit('data:loaded', { boards: 1, created: true });
    }

    /**
     * Show empty state with demo mode option
     */
    showEmptyState() {
        // Set minimal state
        this.state.setState({
            boards: [],
            currentBoardId: null,
            tasks: [],
            filter: 'all'
        }, { addToHistory: false });
        
        // Render empty state in the main content area
        this.dom.showEmptyState();
        
        eventBus.emit('empty:state:shown');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // State change listeners
        this.state.subscribe('tasks', (data) => {
            this.saveData();
            this.render();
            eventBus.emit('tasks:changed', data);
        });

        this.state.subscribe('boards', (data) => {
            this.saveData();
            this.renderBoardSelector();
            eventBus.emit('boards:changed', data);
        });

        this.state.subscribe('currentBoardId', (data) => {
            this.saveData();
            this.render();
            this.renderBoardSelector();
            eventBus.emit('board:switched', data);
        });

        // Task management events
        eventBus.on('task:create', this.handleCreateTask.bind(this));
        eventBus.on('task:edit', this.handleEditTask.bind(this));
        eventBus.on('task:delete', this.handleDeleteTask.bind(this));
        eventBus.on('task:move', this.handleMoveTask.bind(this));
        eventBus.on('task:drop', this.handleDropTask.bind(this));
        eventBus.on('task:moved', this.handleTaskMoved.bind(this));
        eventBus.on('task:archive', this.handleArchiveTask.bind(this));
        eventBus.on('task:complete', this.handleCompleteTask.bind(this));
        eventBus.on('task:start', this.handleStartTask.bind(this));
        eventBus.on('task:reset', this.handleResetTask.bind(this));

        // Import/Export events
        eventBus.on('tasks:import', this.handleImportTasks.bind(this));
        eventBus.on('tasks:export', this.handleExportTasks.bind(this));

        // Archive events
        eventBus.on('tasks:archiveCompleted', this.handleArchiveCompleted.bind(this));
        eventBus.on('archive:browse', this.handleBrowseArchive.bind(this));
        eventBus.on('archive:restore', this.handleRestoreTask.bind(this));
        eventBus.on('archive:delete', this.handleDeleteArchivedTask.bind(this));
        eventBus.on('archive:clearAll', this.handleClearAllArchived.bind(this));

        // Undo/Redo events
        eventBus.on('app:undo', this.handleUndo.bind(this));
        eventBus.on('app:redo', this.handleRedo.bind(this));

        // Settings events
        eventBus.on('settings:show', this.handleShowSettings.bind(this));
        eventBus.on('app:reset', this.handleResetApp.bind(this));
        eventBus.on('app:reload', this.handleAppReload.bind(this));
        eventBus.on('debug:toggle', this.handleToggleDebug.bind(this));

        // Board management events
        eventBus.on('board:create', this.handleCreateBoard.bind(this));
        eventBus.on('board:create:request', this.handleCreateBoardRequest.bind(this));
        eventBus.on('board:create:default', this.handleCreateDefaultBoard.bind(this));
        eventBus.on('board:switch', this.handleSwitchBoard.bind(this));
        eventBus.on('board:edit', this.handleEditBoard.bind(this));
        eventBus.on('board:delete', this.handleDeleteBoard.bind(this));
        eventBus.on('board:duplicate', this.handleDuplicateBoard.bind(this));
        eventBus.on('board:archive', this.handleArchiveBoard.bind(this));
        eventBus.on('board:unarchive', this.handleUnarchiveBoard.bind(this));
        eventBus.on('boards:manage', this.handleManageBoards.bind(this));
        
        // Board organization events
        eventBus.on('task:moveToBoard', this.handleMoveTaskToBoard.bind(this));
        eventBus.on('task:copyToBoard', this.handleCopyTaskToBoard.bind(this));
        eventBus.on('boards:reorder', this.handleReorderBoards.bind(this));
        eventBus.on('boards:sort', this.handleSortBoards.bind(this));
        eventBus.on('boards:search', this.handleSearchBoards.bind(this));
        eventBus.on('boards:filter', this.handleFilterBoards.bind(this));
        eventBus.on('boards:clearFilters', this.handleClearBoardFilters.bind(this));
        eventBus.on('boards:getStatistics', this.getBoardStatistics.bind(this));
        eventBus.on('boards:getTrends', this.getBoardTrends.bind(this));

        // Performance and search events
        eventBus.on('tasks:search', this.handleSearchTasks.bind(this));
        eventBus.on('performance:stats', this.handleGetPerformanceStats.bind(this));

        // Storage events
        eventBus.on('storage:error', this.handleStorageError.bind(this));
        eventBus.on('storage:imported', this.handleStorageImported.bind(this));
        eventBus.on('storage:migrated', this.handleStorageMigrated.bind(this));

        // DOM event listeners (security: replace inline onclick handlers)
        this.setupDOMEventListeners();
    }

    /**
     * Setup DOM event listeners (replaces inline onclick handlers for security)
     */
    setupDOMEventListeners() {
        // View archived tasks button
        const viewArchivedBtn = document.getElementById('view-archived-tasks-btn');
        if (viewArchivedBtn) {
            viewArchivedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showArchivedTasksModal();
            });
        }
    }

    /**
     * Save current state to storage
     */
    saveData() {
        try {
            const boards = this.state.get('boards');
            const currentBoardId = this.state.get('currentBoardId');
            const filter = this.state.get('filter');
            
            const data = {
                boards: boards.map(board => board.toJSON ? board.toJSON() : board),
                currentBoardId,
                filter,
                lastSaved: new Date().toISOString()
            };
            
            this.storage.save(data);
        } catch (error) {
            console.error('Failed to save data:', error);
            this.handleError('Failed to save data', error, 'storage');
        }
    }

    /**
     * Render the current state with performance optimization
     */
    render() {
        const startTime = performance.now();
        let tasks = this.state.get('tasks');
        const filter = this.state.get('filter') || 'all';
        
        // Use optimized filtering for large datasets
        if (tasks.length > 1000) {
            tasks = this.optimizedFilter(tasks, filter);
        }
        
        // Group tasks by status
        const tasksByStatus = {
            todo: tasks.filter(task => task.status === 'todo'),
            doing: tasks.filter(task => task.status === 'doing'),
            done: tasks.filter(task => task.status === 'done')
        };
        
        // Sort tasks by creation date (newest first) - optimized for large datasets
        Object.values(tasksByStatus).forEach(statusTasks => {
            if (statusTasks.length > 100) {
                // Use more efficient sorting for large arrays
                statusTasks.sort((a, b) => {
                    const dateA = new Date(a.createdDate).getTime();
                    const dateB = new Date(b.createdDate).getTime();
                    return dateB - dateA;
                });
            } else {
                statusTasks.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
            }
        });
        
        this.dom.renderTasks(tasksByStatus);
        
        // Update board title to indicate filter
        this.updateBoardTitle(filter);
        
        const endTime = performance.now();
        debugLog.log('🎨 Render completed', {
            taskCount: tasks.length,
            renderTime: `${(endTime - startTime).toFixed(2)}ms`
        });
    }

    /**
     * Optimized filtering for large datasets
     * @param {Array} tasks - Tasks to filter
     * @param {string} filter - Filter criteria
     * @returns {Array} Filtered tasks
     */
    optimizedFilter(tasks, filter) {
        if (filter === 'all') return tasks;
        
        // Use performance optimizer for complex filtering
        return performanceOptimizer.searchTasks(tasks, { status: filter });
    }

    /**
     * Update board title to show filter status
     */
    updateBoardTitle(filter) {
        const currentBoardNameEl = document.getElementById('current-board-name');
        if (currentBoardNameEl) {
            const currentBoard = this.state.getCurrentBoard();
            const baseName = currentBoard ? currentBoard.name : 'Main Board';
            
            currentBoardNameEl.textContent = baseName;
        }
    }

    /**
     * Render board selector
     */
    renderBoardSelector() {
        const boards = this.state.getActiveBoards();
        const currentBoardId = this.state.get('currentBoardId');
        const currentBoard = this.state.getCurrentBoard();
        
        this.dom.renderBoardSelector(boards, currentBoard);
    }

    /**
     * Update tasks for current board
     * @param {Array} updatedTasks - Updated tasks array
     */
    updateCurrentBoardTasks(updatedTasks) {
        const currentBoardId = this.state.get('currentBoardId');
        if (currentBoardId) {
            const boards = this.state.get('boards');
            const updatedBoards = boards.map(board => {
                if (board.id === currentBoardId) {
                    // Handle both Board instances and plain objects
                    const boardData = board.toJSON ? board.toJSON() : board;
                    const taskData = updatedTasks.map(t => t.toJSON ? t.toJSON() : t);
                    
                    console.log('🔄 Updating board tasks:', {
                        boardId: currentBoardId,
                        taskCount: taskData.length
                    });
                    
                    return new Board({ 
                        ...boardData, 
                        tasks: taskData,
                        lastModified: new Date().toISOString()
                    });
                }
                return board;
            });
            
            // Update state
            console.log('📊 State update - Current tasks:', updatedTasks.length);
            this.state.setState({
                boards: updatedBoards,
                tasks: updatedTasks
            });
        } else {
            // Fallback for legacy mode
            this.state.setState({ tasks: updatedTasks });
        }
    }

    // Event Handlers

    /**
     * Handle create task
     * @param {Object} data - Event data
     */
    async handleCreateTask(data) {
        try {
            const { text } = data;
            
            // Validate input
            if (!text || text.length > 200) {
                this.dom.showModal('Error', 
                    text ? 'Task cannot exceed 200 characters' : 'Task cannot be empty'
                );
                return;
            }
            
            // Create new task with guaranteed unique ID
            const newTask = createTask({ 
                text: text.trim(),
                // Force unique ID generation (models.js already does this, but being explicit)
                id: generateUniqueId()
            });
            
            debugLog.log('🆕 Creating new task:', {
                id: newTask.id,
                text: newTask.text,
                status: newTask.status,
                createdDate: newTask.createdDate
            });
            
            const currentTasks = this.state.get('tasks');
            
            // Debug: Check for potential duplicates
            const existingTasksWithSameText = currentTasks.filter(t => t.text === newTask.text);
            if (existingTasksWithSameText.length > 0) {
                debugLog.log('⚠️ Creating task with duplicate text. Existing tasks:', 
                    existingTasksWithSameText.map(t => ({ id: t.id, text: t.text }))
                );
            }
            
            // Add to current board
            const currentBoardId = this.state.get('currentBoardId');
            if (currentBoardId) {
                const boards = this.state.get('boards');
                const updatedBoards = boards.map(board => {
                    if (board.id === currentBoardId) {
                        const updatedTasks = [...(board.tasks || []), newTask.toJSON()];
                        console.log('📋 Adding task to board:', {
                            boardId: board.id,
                            boardName: board.name,
                            taskCount: updatedTasks.length
                        });
                        // Handle both Board instances and plain objects
                        const boardData = board.toJSON ? board.toJSON() : board;
                        return new Board({ ...boardData, tasks: updatedTasks });
                    }
                    return board;
                });
                
                const newTaskList = [...currentTasks, newTask];
                console.log('📝 Updated task list:', {
                    totalTasks: newTaskList.length,
                    taskIds: newTaskList.map(t => t.id),
                    lastTaskId: newTask.id
                });
                
                this.state.setState({
                    boards: updatedBoards,
                    tasks: newTaskList
                });
            } else {
                // Fallback for legacy mode
                const newTaskList = [...currentTasks, newTask];
                console.log('📝 Legacy mode - Updated task list:', {
                    totalTasks: newTaskList.length,
                    taskIds: newTaskList.map(t => t.id)
                });
                
                this.state.setState({
                    tasks: newTaskList
                });
            }
            
            // Clear input
            this.dom.clearTaskInput();
            
            eventBus.emit('task:created', { task: newTask });
            console.log('✅ Task creation complete');
            
        } catch (error) {
            console.error('❌ Failed to create task:', error);
            this.handleError('Failed to create task', error, 'validation');
        }
    }

    /**
     * Handle edit task
     * @param {Object} data - Event data
     */
    async handleEditTask(data) {
        try {
            const { taskId } = data;
            const tasks = this.state.get('tasks');
            const task = tasks.find(t => t.id === taskId);
            
            if (!task) return;
            
            const newText = await this.dom.showModal('Edit Task', 'Enter new task text:', {
                showInput: true,
                inputValue: task.text
            });
            
            if (newText && newText !== task.text) {
                if (newText.length > 200) {
                    this.dom.showModal('Error', 'Task cannot exceed 200 characters');
                    return;
                }
                
                const updatedTasks = tasks.map(t => {
                    if (t.id === taskId) {
                        // Handle both Task instances and plain objects
                        if (t.update) {
                            return t.update({ text: newText });
                        } else {
                            // Create Task instance if it's a plain object
                            const taskInstance = new Task(t);
                            return taskInstance.update({ text: newText });
                        }
                    }
                    return t;
                });
                
                this.updateCurrentBoardTasks(updatedTasks);
                eventBus.emit('task:edited', { task: updatedTasks.find(t => t.id === taskId) });
            }
        } catch (error) {
            console.error('Failed to edit task:', error);
            this.handleError('Failed to edit task', error, 'validation');
        }
    }

    /**
     * Handle delete task
     * @param {Object} data - Event data
     */
    async handleDeleteTask(data) {
        try {
            const { taskId } = data;
            
            const confirmed = await this.dom.showModal(
                'Confirm Delete',
                'Are you sure you want to delete this task?'
            );
            
            if (confirmed) {
                const tasks = this.state.get('tasks');
                const updatedTasks = tasks.filter(task => task.id !== taskId);
                
                this.updateCurrentBoardTasks(updatedTasks);
                eventBus.emit('task:deleted', { taskId });
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
            this.handleError('Failed to delete task', error, 'default');
        }
    }

    /**
     * Handle move task
     * @param {Object} data - Event data
     */
    handleMoveTask(data) {
        this.handleDropTask(data);
    }

    /**
     * Handle task moved (from DOM drag/drop)
     * @param {Object} data - Event data with { taskId, targetStatus }
     */
    handleTaskMoved(data) {
        console.log('🔄 handleTaskMoved called:', data);
        
        // This is the proper handler for DOM drag/drop events
        if (data && data.taskId && data.targetStatus) {
            this.handleDropTask(data);
        } else {
            console.warn('⚠️ handleTaskMoved called with invalid data:', data);
        }
    }

    /**
     * Handle drop task (drag and drop or move)
     * @param {Object} data - Event data
     */
    handleDropTask(data) {
        try {
            // Guard against invalid data to prevent infinite loops
            if (!data || typeof data !== 'object') {
                console.error('❌ handleDropTask called with invalid data:', data);
                return;
            }
            
            const { taskId, targetStatus } = data;
            
            console.log('🔄 handleDropTask called:', { taskId, targetStatus });
            
            // Strict validation of inputs with immediate return to prevent loops
            if (!taskId || typeof taskId !== 'string') {
                console.error('❌ Invalid taskId:', taskId, 'Data:', data);
                return;
            }
            
            if (!['todo', 'doing', 'done'].includes(targetStatus)) {
                console.error('❌ Invalid target status:', targetStatus, 'Data:', data);
                return;
            }
            
            const tasks = this.state.get('tasks');
            console.log('📋 Current tasks before move:', {
                totalTasks: tasks.length,
                taskIds: tasks.map(t => t.id),
                targetTaskId: taskId
            });
            
            // Find the specific task using strict ID matching
            const taskIndex = tasks.findIndex(task => task.id === taskId);
            if (taskIndex === -1) {
                console.error('❌ Task not found with ID:', taskId);
                return;
            }
            
            const taskToMove = tasks[taskIndex];
            console.log('🎯 Found task to move:', {
                index: taskIndex,
                id: taskToMove.id,
                text: taskToMove.text,
                currentStatus: taskToMove.status,
                targetStatus: targetStatus
            });
            
            // Check for other tasks with same text (for debugging)
            const tasksWithSameText = tasks.filter(t => t.text === taskToMove.text);
            if (tasksWithSameText.length > 1) {
                console.warn('⚠️ Multiple tasks found with same text:', {
                    text: taskToMove.text,
                    count: tasksWithSameText.length,
                    ids: tasksWithSameText.map(t => t.id),
                    movingTaskId: taskId
                });
            }
            
            // Create new array with ONLY the specific task modified
            // Using index-based approach to ensure we only modify one task
            const updatedTasks = tasks.map((task, index) => {
                if (index === taskIndex) {
                    console.log('✅ Moving task at index', index, ':', {
                        id: task.id,
                        text: task.text,
                        from: task.status,
                        to: targetStatus
                    });
                    // Handle both Task instances and plain objects
                    if (task.moveTo) {
                        return task.moveTo(targetStatus);
                    } else {
                        // Create Task instance if it's a plain object
                        const taskInstance = new Task(task);
                        return taskInstance.moveTo(targetStatus);
                    }
                } else {
                    // Verify we're not accidentally modifying other tasks
                    if (task.text === taskToMove.text && task.id !== taskId) {
                        console.log('🔍 Keeping unchanged task with same text:', {
                            id: task.id,
                            text: task.text,
                            status: task.status
                        });
                    }
                    return task; // Return unchanged reference
                }
            });
            
            // Validation: Ensure only one task changed status
            const originalByStatus = {
                todo: tasks.filter(t => t.status === 'todo').length,
                doing: tasks.filter(t => t.status === 'doing').length,
                done: tasks.filter(t => t.status === 'done').length
            };
            
            const updatedByStatus = {
                todo: updatedTasks.filter(t => t.status === 'todo').length,
                doing: updatedTasks.filter(t => t.status === 'doing').length,
                done: updatedTasks.filter(t => t.status === 'done').length
            };
            
            console.log('📊 Status count comparison:', {
                original: originalByStatus,
                updated: updatedByStatus
            });
            
            // Verify task status change
            const totalChanges = Math.abs(originalByStatus.todo - updatedByStatus.todo) +
                               Math.abs(originalByStatus.doing - updatedByStatus.doing) +
                               Math.abs(originalByStatus.done - updatedByStatus.done);
            
            // Check if task actually moved (totalChanges should be either 0 or 2)
            if (totalChanges === 0) {
                console.log('ℹ️ Task was already in target status - no movement needed');
            } else if (totalChanges === 2) {
                console.log('✅ Task successfully moved between statuses');
            } else {
                console.error('🚨 UNEXPECTED: Invalid task status change!', {
                    totalChanges,
                    originalByStatus,
                    updatedByStatus,
                    expectedChanges: 'Should be 0 (no change) or 2 (moved between statuses)'
                });
            }
            
            console.log('📋 Tasks after move operation:', {
                totalTasks: updatedTasks.length,
                byStatus: updatedByStatus
            });
            
            this.updateCurrentBoardTasks(updatedTasks);
            
            const movedTask = updatedTasks[taskIndex];
            eventBus.emit('task:moved', { 
                taskId, 
                targetStatus,
                task: movedTask
            });
            
            console.log('✅ Task move completed successfully');
            
        } catch (error) {
            console.error('❌ Failed to move task:', error);
            this.handleError('Failed to move task', error, 'default');
        }
    }

    /**
     * Handle archive task with confirmation dialog
     * @param {Object} data - Event data
     */
    async handleArchiveTask(data) {
        try {
            const { taskId } = data;
            const tasks = this.state.get('tasks');
            const task = tasks.find(t => t.id === taskId);
            
            if (!task) {
                console.warn('Task not found for archiving:', taskId);
                this.dom.showModal('Error', 'Task not found for archiving');
                return;
            }
            
            // Show confirmation dialog for individual task archiving
            const confirmed = await this.dom.showModal(
                'Archive Task',
                `Archive task "${task.text}"?\n\nArchived tasks can be viewed and restored from the archive browser.`,
                {
                    confirmText: 'Archive',
                    cancelText: 'Cancel'
                }
            );
            
            if (confirmed) {
                // Archive the task with proper metadata
                this.archiveTask(taskId);
                
                // Show success feedback
                this.dom.showToast(`Task "${task.text}" has been archived`, 'success');
                
                eventBus.emit('task:archived', { taskId, task });
            }
            
        } catch (error) {
            console.error('Failed to archive task:', error);
            this.handleError('Failed to archive task', error, 'default');
        }
    }

    /**
     * Handle complete task
     * @param {Object} data - Event data
     */
    handleCompleteTask(data) {
        this.handleDropTask({ ...data, targetStatus: 'done' });
    }

    /**
     * Handle start task
     * @param {Object} data - Event data
     */
    handleStartTask(data) {
        this.handleDropTask({ ...data, targetStatus: 'doing' });
    }

    /**
     * Handle reset task
     * @param {Object} data - Event data
     */
    handleResetTask(data) {
        this.handleDropTask({ ...data, targetStatus: 'todo' });
    }

    /**
     * Handle import tasks
     * @param {Object} data - Event data
     */
    async handleImportTasks(data) {
        try {
            const { file } = data;
            
            // Enhanced file validation using security manager
            const fileValidation = securityManager.validateFile(file);
            if (!fileValidation.isValid) {
                const errorMessage = fileValidation.errors.join('. ');
                this.dom.showModal('Error', errorMessage);
                return;
            }
            
            // Show warnings if any
            if (fileValidation.warnings.length > 0) {
                debugLog.log('File validation warnings:', fileValidation.warnings);
            }
            
            // Read file content safely
            const text = await this.readFile(file);
            
            // Check file size against current settings before parsing
            const maxImportSize = settingsManager.getValue('maxImportFileSize') || 50000;
            debugLog.log('Import size check:', {
                fileSize: text.length,
                maxAllowed: maxImportSize,
                willPass: text.length <= maxImportSize
            });
            
            if (text.length > maxImportSize) {
                const actualSize = this.formatBytes(text.length);
                const maxSize = this.formatBytes(maxImportSize);
                this.dom.showModal('Error', 
                    `Import file too large (${actualSize}). Maximum allowed size is ${maxSize}. You can increase this limit in Settings > Import/Export.`
                );
                return;
            }
            
            // Parse JSON with security checks
            const parseResult = securityManager.safeJsonParse(text);
            if (!parseResult.success) {
                this.dom.showModal('Error', securityManager.sanitizeErrorMessage(parseResult.error, 'import'));
                return;
            }
            
            // Validate and sanitize import content
            const contentValidation = securityManager.validateImportContent(parseResult.data);
            if (!contentValidation.isValid) {
                const errorMessage = contentValidation.errors.join('. ');
                this.dom.showModal('Error', securityManager.sanitizeErrorMessage(errorMessage, 'import'));
                return;
            }
            
            // Use sanitized data for further processing
            const importData = contentValidation.sanitizedData;
            
            // Validate and process import data
            const validationResult = this.validateImportData(importData);
            
            if (!validationResult.isValid) {
                this.dom.showModal('Error', securityManager.sanitizeErrorMessage(validationResult.error, 'validation'));
                return;
            }
            
            const { boards: boardsToImport, tasks: tasksToImport, type } = validationResult;
            
            // Show import options
            let importMessage = '';
            let importOptions = {};
            
            if (type === 'multi-board') {
                const totalTasks = boardsToImport.reduce((sum, board) => sum + (board.tasks ? board.tasks.length : 0), 0);
                importMessage = `Import ${boardsToImport.length} boards with ${totalTasks} total tasks?\n\nChoose import mode:`;
                importOptions = {
                    confirmText: 'Merge with Existing',
                    cancelText: 'Replace All Data'
                };
            } else {
                // Legacy single board or tasks-only format
                importMessage = `Import ${tasksToImport.length} tasks?\n\nChoose import mode:`;
                importOptions = {
                    confirmText: 'Add to Current Board',
                    cancelText: 'Create New Board'
                };
            }
            
            const mergeMode = await this.dom.showModal('Import Data', importMessage, importOptions);
            
            if (type === 'multi-board') {
                await this.importMultiBoardData(boardsToImport, mergeMode);
            } else {
                await this.importLegacyData(tasksToImport, mergeMode);
            }
            
        } catch (error) {
            debugLog.error('Import failed:', error);
            this.dom.showModal('Error', securityManager.sanitizeErrorMessage(error, 'import'));
        }
    }

    /**
     * Handle export tasks
     */
    async handleExportTasks() {
        try {
            const boards = this.state.get('boards');
            const currentBoardId = this.state.get('currentBoardId');
            
            if (!boards || boards.length === 0) {
                this.dom.showModal('Info', 'No boards to export');
                return;
            }
            
            // Count total tasks across all boards
            const totalTasks = boards.reduce((sum, board) => sum + (board.tasks ? board.tasks.length : 0), 0);
            
            if (totalTasks === 0) {
                this.dom.showModal('Info', 'No tasks to export');
                return;
            }
            
            // Ask user what to export
            const exportOption = await this.dom.showModal(
                'Export Data', 
                `Export options:\n\n• Current board only (${this.state.getCurrentBoard()?.name || 'Unknown'})\n• All boards (${boards.length} boards, ${totalTasks} tasks)\n\nWhich would you like to export?`,
                {
                    confirmText: 'Current Board',
                    cancelText: 'All Boards'
                }
            );
            
            let exportData;
            let filename;
            
            if (exportOption) {
                // Export current board only
                const currentBoard = this.state.getCurrentBoard();
                if (!currentBoard) {
                    this.dom.showModal('Error', 'No current board selected');
                    return;
                }
                
                exportData = this.storage.exportData();
                // Override with single board data
                exportData.data = {
                    boards: [currentBoard.toJSON()],
                    currentBoardId: currentBoard.id,
                    filter: this.state.get('filter') || 'all'
                };
                filename = `cascade-board-${currentBoard.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
            } else {
                // Export all boards
                exportData = this.storage.exportData();
                filename = `cascade-all-boards-${new Date().toISOString().split('T')[0]}.json`;
            }
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            
            URL.revokeObjectURL(url);
            
            const exportedTaskCount = exportOption 
                ? (this.state.getCurrentBoard()?.tasks?.length || 0)
                : totalTasks;
            
            eventBus.emit('tasks:exported', { 
                count: exportedTaskCount,
                boards: exportOption ? 1 : boards.length,
                type: exportOption ? 'current' : 'all'
            });
            
        } catch (error) {
            console.error('Export failed:', error);
            this.handleError('Failed to export tasks', error, 'export');
        }
    }

    /**
     * Handle archive completed tasks with enhanced confirmation and feedback
     */
    async handleArchiveCompleted() {
        try {
            const tasks = this.state.get('tasks');
            const completedTasks = tasks.filter(task => task.status === 'done');
            
            if (completedTasks.length === 0) {
                this.dom.showModal('Info', 'No completed tasks to archive');
                return;
            }
            
            // Enhanced confirmation dialog with task details
            const taskList = completedTasks.slice(0, 5).map(task => `• ${task.text}`).join('\n');
            const moreTasksText = completedTasks.length > 5 ? `\n... and ${completedTasks.length - 5} more tasks` : '';
            
            const confirmed = await this.dom.showModal(
                'Archive Completed Tasks',
                `Archive ${completedTasks.length} completed task${completedTasks.length === 1 ? '' : 's'}?\n\n${taskList}${moreTasksText}\n\nArchived tasks can be viewed and restored from the archive browser.`,
                {
                    confirmText: 'Archive All',
                    cancelText: 'Cancel'
                }
            );
            
            if (confirmed) {
                let archivedCount = 0;
                
                // Archive each completed task individually to ensure proper handling
                for (const task of completedTasks) {
                    try {
                        this.archiveTask(task.id);
                        archivedCount++;
                    } catch (error) {
                        console.error('Failed to archive task:', task.id, error);
                        // Continue with other tasks even if one fails
                    }
                }
                
                // Show success feedback with count
                if (archivedCount > 0) {
                    this.dom.showToast(
                        `Successfully archived ${archivedCount} task${archivedCount === 1 ? '' : 's'}!`,
                        'success'
                    );
                    
                    eventBus.emit('tasks:archived', { 
                        count: archivedCount,
                        type: 'bulk',
                        tasks: completedTasks.slice(0, archivedCount)
                    });
                } else {
                    this.dom.showModal('Error', 'Failed to archive tasks. Please try again.');
                }
            }
            
        } catch (error) {
            console.error('Failed to archive completed tasks:', error);
            this.handleError('Failed to archive tasks', error, 'default');
        }
    }

    /**
     * Handle browse archive - show archived tasks modal
     */
    async handleBrowseArchive() {
        try {
            console.log('[DEBUG] Browse Archive clicked');
            const currentBoard = this.state.getCurrentBoard();
            console.log('[DEBUG] Current board:', currentBoard);
            
            if (!currentBoard) {
                this.dom.showModal('Error', 'No board selected');
                return;
            }

            const archivedTasks = currentBoard.archivedTasks || [];
            console.log('[DEBUG] Archived tasks found:', archivedTasks.length, archivedTasks);
            
            if (archivedTasks.length === 0) {
                this.dom.showModal('Archive', 'No archived tasks found in this board.');
                return;
            }

            // Show archive browser modal
            console.log('[DEBUG] Calling showArchiveBrowser with:', archivedTasks.length, 'tasks');
            this.dom.showArchiveBrowser(archivedTasks, currentBoard.name);
            
        } catch (error) {
            console.error('Failed to browse archive:', error);
            this.handleError('Failed to browse archive', error, 'default');
        }
    }

    /**
     * Handle restore archived task
     * @param {Object} data - Event data
     */
    async handleRestoreTask(data) {
        try {
            console.log('[DEBUG] handleRestoreTask called with:', data);
            const { taskId } = data;
            const currentBoard = this.state.getCurrentBoard();
            
            if (!currentBoard || !currentBoard.archivedTasks) {
                this.dom.showModal('Error', 'No archived tasks found');
                return;
            }

            const archivedTask = currentBoard.archivedTasks.find(t => t.id === taskId);
            if (!archivedTask) {
                this.dom.showModal('Error', 'Archived task not found');
                return;
            }

            const confirmed = await this.dom.showModal(
                'Restore Task',
                `Restore task "${archivedTask.text}" to active tasks?`,
                {
                    confirmText: 'Restore',
                    cancelText: 'Cancel'
                }
            );

            if (confirmed) {
                // Remove from archived tasks
                const updatedArchivedTasks = currentBoard.archivedTasks.filter(t => t.id !== taskId);
                
                // Create restored task (remove archive metadata)
                const restoredTask = new Task({
                    id: archivedTask.id,
                    text: archivedTask.text,
                    status: archivedTask.status,
                    createdDate: archivedTask.createdDate,
                    lastModified: new Date().toISOString()
                });

                // Update board with removed archived task
                const boards = this.state.get('boards');
                const updatedBoards = boards.map(board => {
                    if (board.id === currentBoard.id) {
                        return new Board({
                            ...board.toJSON(),
                            archivedTasks: updatedArchivedTasks,
                            lastModified: new Date().toISOString()
                        });
                    }
                    return board;
                });

                // Add restored task to active tasks
                const currentTasks = this.state.get('tasks');
                const updatedTasks = [...currentTasks, restoredTask];

                this.state.setState({
                    boards: updatedBoards,
                    tasks: updatedTasks
                });

                this.dom.showToast(`Task "${archivedTask.text}" has been restored`, 'success');
                
                // Close archive modal and refresh it
                if (window.closeArchiveModal) {
                    window.closeArchiveModal();
                }
                
                eventBus.emit('task:restored', { taskId, task: restoredTask });
            }

        } catch (error) {
            console.error('Failed to restore task:', error);
            this.handleError('Failed to restore task', error, 'default');
        }
    }

    /**
     * Handle delete archived task permanently
     * @param {Object} data - Event data
     */
    async handleDeleteArchivedTask(data) {
        try {
            console.log('[DEBUG] handleDeleteArchivedTask called with:', data);
            const { taskId } = data;
            const currentBoard = this.state.getCurrentBoard();
            
            if (!currentBoard || !currentBoard.archivedTasks) {
                this.dom.showModal('Error', 'No archived tasks found');
                return;
            }

            const archivedTask = currentBoard.archivedTasks.find(t => t.id === taskId);
            if (!archivedTask) {
                this.dom.showModal('Error', 'Archived task not found');
                return;
            }

            const confirmed = await this.dom.showModal(
                'Delete Permanently',
                `Permanently delete task "${archivedTask.text}"?\n\nThis action cannot be undone.`,
                {
                    confirmText: 'Delete Forever',
                    cancelText: 'Cancel'
                }
            );

            if (confirmed) {
                // Remove from archived tasks
                const updatedArchivedTasks = currentBoard.archivedTasks.filter(t => t.id !== taskId);
                
                // Update board
                const boards = this.state.get('boards');
                const updatedBoards = boards.map(board => {
                    if (board.id === currentBoard.id) {
                        return new Board({
                            ...board.toJSON(),
                            archivedTasks: updatedArchivedTasks,
                            lastModified: new Date().toISOString()
                        });
                    }
                    return board;
                });

                this.state.setState({ boards: updatedBoards });

                this.dom.showToast(`Task "${archivedTask.text}" has been permanently deleted`, 'info');
                
                // Close archive modal and refresh it
                if (window.closeArchiveModal) {
                    window.closeArchiveModal();
                }
                
                eventBus.emit('task:deletedPermanently', { taskId, task: archivedTask });
            }

        } catch (error) {
            console.error('Failed to delete archived task:', error);
            this.handleError('Failed to delete archived task', error, 'default');
        }
    }

    /**
     * Handle clear all archived tasks
     */
    async handleClearAllArchived() {
        try {
            console.log('[DEBUG] handleClearAllArchived called');
            const currentBoard = this.state.getCurrentBoard();
            
            if (!currentBoard || !currentBoard.archivedTasks || currentBoard.archivedTasks.length === 0) {
                this.dom.showModal('Info', 'No archived tasks to clear');
                return;
            }

            const confirmed = await this.dom.showModal(
                'Clear All Archived',
                `Permanently delete all ${currentBoard.archivedTasks.length} archived tasks?\n\nThis action cannot be undone.`,
                {
                    confirmText: 'Clear All',
                    cancelText: 'Cancel'
                }
            );

            if (confirmed) {
                const clearedCount = currentBoard.archivedTasks.length;
                
                // Update board with empty archived tasks
                const boards = this.state.get('boards');
                const updatedBoards = boards.map(board => {
                    if (board.id === currentBoard.id) {
                        return new Board({
                            ...board.toJSON(),
                            archivedTasks: [],
                            lastModified: new Date().toISOString()
                        });
                    }
                    return board;
                });

                this.state.setState({ boards: updatedBoards });

                this.dom.showToast(`Cleared ${clearedCount} archived tasks`, 'info');
                
                // Close archive modal
                if (window.closeArchiveModal) {
                    window.closeArchiveModal();
                }
                
                eventBus.emit('archive:cleared', { count: clearedCount });
            }

        } catch (error) {
            console.error('Failed to clear archived tasks:', error);
            this.handleError('Failed to clear archived tasks', error, 'default');
        }
    }

    /**
     * Handle undo
     */
    handleUndo() {
        const success = this.state.undo();
        if (success) {
            eventBus.emit('app:undid');
        }
    }

    /**
     * Handle redo
     */
    handleRedo() {
        const success = this.state.redo();
        if (success) {
            eventBus.emit('app:redid');
        }
    }

    /**
     * Handle show settings
     */
    handleShowSettings() {
        const settingsHTML = settingsManager.generateSettingsHTML();
        
        this.dom.showModal('Settings', settingsHTML, {
            confirmText: 'Save Settings',
            allowHTML: true,
            customClass: 'settings-modal'
        }).then((result) => {
            if (result) {
                this.handleSaveSettings();
            }
        });

        // Setup additional event handlers for settings form
        setTimeout(() => {
            this.setupSettingsFormHandlers();
        }, 100);
    }

    /**
     * Setup settings form event handlers
     */
    setupSettingsFormHandlers() {
        // Prevent modal from closing when clicking inside the settings form
        const settingsForm = document.querySelector('.settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        const resetBtn = document.getElementById('reset-settings-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleResetSettings();
            });
        }

        // Add live preview for theme changes
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                const newTheme = themeSelect.value;
                settingsManager.setValue('theme', newTheme);
                settingsManager.applyTheme();
            });
        }

        // Prevent all form elements from closing the modal
        if (settingsForm) {
            const formElements = settingsForm.querySelectorAll('input, select, button, label');
            formElements.forEach(element => {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                // Also prevent on change events for form inputs
                if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {
                    element.addEventListener('change', (e) => {
                        e.stopPropagation();
                    });
                }
            });
        }
    }

    /**
     * Handle save settings
     */
    handleSaveSettings() {
        try {
            const settingsForm = document.querySelector('.settings-form');
            if (!settingsForm) {
                throw new Error('Settings form not found');
            }

            const newSettings = settingsManager.parseSettingsFromForm(settingsForm);
            
            // Validate settings
            if (newSettings.autoArchiveDays < 1 || newSettings.autoArchiveDays > 365) {
                this.dom.showModal('Invalid Input', 'Please enter a number between 1 and 365 days for auto-archive.');
                return;
            }

            // Check if debug mode changed
            const oldDebugMode = settingsManager.get('debugMode');
            const newDebugMode = newSettings.debugMode;
            
            settingsManager.saveSettings(newSettings);
            settingsManager.applyTheme();
            
            // Handle debug mode toggle if it changed
            if (oldDebugMode !== newDebugMode) {
                settingsManager.setDebugMode(newDebugMode);
            }
            
            this.dom.showModal('Settings Saved', 'Your settings have been updated successfully!', {
                showCancel: false,
                confirmText: 'OK'
            });

            // Trigger auto-archive if enabled and settings changed
            if (newSettings.enableAutoArchive) {
                this.performAutoArchive();
            }

        } catch (error) {
            console.error('Failed to save settings:', error);
            const errorMessage = error.message || 'Failed to save settings. Please try again.';
            this.dom.showModal('Error', `Settings save failed: ${errorMessage}`);
        }
    }

    /**
     * Handle reset settings
     */
    handleResetSettings() {
        this.dom.showModal('Reset Settings', 'Are you sure you want to reset all settings to their defaults?', {
            confirmText: 'Reset',
            cancelText: 'Cancel'
        }).then((confirmed) => {
            if (confirmed) {
                settingsManager.resetSettings();
                settingsManager.applyTheme();
                
                // Close current settings modal and reopen with reset values
                const modal = document.getElementById('custom-modal');
                if (modal) {
                    modal.classList.remove('modal-overlay--visible');
                }
                
                setTimeout(() => {
                    this.handleShowSettings();
                }, 300);
            }
        });
    }

    /**
     * Handle storage error
     * @param {Object} data - Error data
     */
    handleStorageError(data) {
        console.error('Storage error:', data);
        this.handleError('Storage operation failed', data.error, 'storage');
    }

    /**
     * Handle storage imported - reload data after import
     */
    async handleStorageImported(data) {
        try {
            console.log('Storage imported, reloading data:', data);
            await this.loadData();
            this.render();
            this.renderBoardSelector();
        } catch (error) {
            console.error('Failed to reload data after import:', error);
            this.handleError('Failed to apply imported data', error, 'import');
        }
    }

    /**
     * Handle storage migrated - reload data after migration
     */
    async handleStorageMigrated(data) {
        try {
            console.log('Storage migrated, reloading data:', data);
            await this.loadData();
            this.render();
            this.renderBoardSelector();
        } catch (error) {
            console.error('Failed to reload data after migration:', error);
            this.handleError('Failed to apply migrated data', error, 'storage');
        }
    }

    /**
     * Handle reset app - clear all data and start fresh
     */
    async handleResetApp() {
        try {
            const confirmed = await this.dom.showModal(
                'Reset App', 
                'This will permanently delete ALL boards, tasks, and data. You will start with a fresh, empty app. This action cannot be undone.\n\nAre you sure you want to continue?',
                {
                    confirmText: 'Reset Everything',
                    cancelText: 'Cancel'
                }
            );

            if (!confirmed) {
                return;
            }

            // Second confirmation for such a destructive action
            const finalConfirmed = await this.dom.showModal(
                'Final Confirmation', 
                'This is your FINAL WARNING!\n\nThis will permanently delete ALL your boards, tasks, and data. There is NO way to recover this data once deleted.\n\nAre you absolutely certain you want to continue?',
                {
                    confirmText: 'YES, DELETE EVERYTHING',
                    cancelText: 'Cancel'
                }
            );

            if (!finalConfirmed) {
                return;
            }

            // Clear all localStorage data
            this.storage.clearAll();
            
            // Reset settings to defaults
            settingsManager.resetSettings();
            
            // Create a fresh default board
            const defaultBoard = createBoard({
                name: 'Main Board',
                description: 'Your main task board',
                isDefault: true
            });

            // Reset state to initial condition
            this.state.setState({
                boards: [defaultBoard],
                currentBoardId: defaultBoard.id,
                tasks: [],
                filter: 'all'
            }, { addToHistory: false });

            // Save the fresh state
            this.saveData();
            
            // Apply default theme
            settingsManager.applyTheme();
            
            // Re-render everything
            this.render();
            this.renderBoardSelector();
            
            // Show success message
            await this.dom.showModal('App Reset Complete', 
                'The app has been reset successfully. You now have a fresh "Main Board" to start with.',
                { 
                    showCancel: false,
                    confirmText: 'OK'
                }
            );
            
        } catch (error) {
            console.error('Failed to reset app:', error);
            this.handleError('Reset failed', error);
        }
    }

    /**
     * Handle app reload - reload data from storage and re-render
     */
    async handleAppReload() {
        try {
            console.log('🔄 [RELOAD] Starting app reload...');
            debugLog.log('Reloading app...');
            
            // Reload data from storage
            console.log('🔄 [RELOAD] Loading data from storage...');
            await this.loadData();
            
            // Check what data was loaded
            const boards = this.state.get('boards');
            const currentBoardId = this.state.get('currentBoardId');
            console.log('🔄 [RELOAD] Loaded boards:', boards ? boards.length + ' boards' : 'null');
            console.log('🔄 [RELOAD] Current board ID:', currentBoardId);
            
            // Re-render everything
            console.log('🔄 [RELOAD] Re-rendering UI...');
            this.render();
            this.renderBoardSelector();
            
            debugLog.log('App reloaded successfully');
            console.log('🔄 [RELOAD] App reload complete!');
            
        } catch (error) {
            console.error('🔄 [RELOAD] Failed to reload app:', error);
            this.handleError('Failed to reload app', error);
        }
    }

    /**
     * Handle toggle debug mode
     */
    async handleToggleDebug() {
        try {
            const currentDebugMode = settingsManager.get('debugMode');
            const newDebugMode = !currentDebugMode;
            
            // Toggle debug mode
            settingsManager.setDebugMode(newDebugMode);
            
            // Update debug button text in menu
            this.dom.updateDebugButtonText();
            
            // Show confirmation message
            const status = newDebugMode ? 'enabled' : 'disabled';
            const icon = newDebugMode ? '🔧' : '🔇';
            
            await this.dom.showModal(
                `Debug Mode ${status.charAt(0).toUpperCase() + status.slice(1)}`, 
                `${icon} Debug mode has been ${status}.\n\n${newDebugMode ? 'You will now see detailed console output for troubleshooting.' : 'Console logging has been turned off.'}`,
                { 
                    showCancel: false,
                    confirmText: 'OK'
                }
            );
            
        } catch (error) {
            console.error('Failed to toggle debug mode:', error);
            this.handleError('Debug toggle failed', error);
        }
    }

    // Board Management Handlers

    /**
     * Handle create board
     * @param {Object} data - Event data
     */
    async handleCreateBoard(data) {
        try {
            const { name, description, color } = data;
            
            if (!name || name.trim().length === 0) {
                this.dom.showModal('Error', 'Board name is required');
                return;
            }
            
            const newBoard = createBoard({
                name: name.trim(),
                description: description?.trim() || '',
                color: color || '#6750a4'
            });
            
            this.state.addBoard(newBoard);
            this.state.setCurrentBoard(newBoard.id);
            this.saveData();
            
            eventBus.emit('board:created', { board: newBoard });
            
        } catch (error) {
            console.error('Failed to create board:', error);
            this.handleError('Failed to create board', error, 'validation');
        }
    }

    /**
     * Handle create board request - Show modal to get board details
     */
    async handleCreateBoardRequest() {
        try {
            const boardName = await this.dom.showModal('New Board', 'Enter board name:', {
                showInput: true,
                inputValue: '',
                confirmText: 'Create Board'
            });
            
            if (boardName && boardName.trim().length > 0) {
                // Emit the actual board creation event with the data
                eventBus.emit('board:create', { 
                    name: boardName.trim(),
                    description: '',
                    color: '#6750a4'
                });
            }
        } catch (error) {
            console.error('Failed to handle board creation request:', error);
            this.handleError('Failed to create board', error, 'ui');
        }
    }

    /**
     * Handle create default board - Creates the default "Main Board"
     */
    handleCreateDefaultBoard() {
        try {
            const defaultBoard = createBoard({
                name: 'Main Board',
                description: 'Your default task board',
                isDefault: true
            });
            
            this.state.setState({
                boards: [defaultBoard],
                currentBoardId: defaultBoard.id,
                tasks: [],
                filter: 'all'
            }, { addToHistory: false });
            
            // Save the data to ensure persistence
            this.saveData();
            
            // Re-render the app with the new board
            this.render();
            this.renderBoardSelector();
            
            eventBus.emit('data:loaded', { boards: 1, created: true });
            
        } catch (error) {
            console.error('Failed to create default board:', error);
            this.handleError('Failed to create default board', error);
        }
    }

    /**
     * Handle switch board
     * @param {Object} data - Event data
     */
    handleSwitchBoard(data) {
        try {
            const { boardId } = data;
            this.state.setCurrentBoard(boardId);
            eventBus.emit('board:switched', { boardId });
        } catch (error) {
            console.error('Failed to switch board:', error);
            this.handleError('Failed to switch board', error);
        }
    }

    /**
     * Handle edit board - Simple modal-based editing
     * @param {Object} data - Event data
     */
    async handleEditBoard(data) {
        try {
            const { boardId } = data;
            const boards = this.state.get('boards');
            const board = boards.find(b => b.id === boardId);
            
            if (!board) {
                this.dom.showToast('Board not found', 'error');
                return;
            }
            
            const newName = await this.dom.showModal('Rename Board', 'Enter new board name:', {
                showInput: true,
                inputValue: board.name
            });
            
            if (newName && newName.trim() !== board.name) {
                const trimmedName = newName.trim();
                
                // Validate name length
                if (trimmedName.length === 0) {
                    this.dom.showToast('Board name cannot be empty', 'error');
                    return;
                }
                
                if (trimmedName.length > 50) {
                    this.dom.showToast('Board name cannot exceed 50 characters', 'error');
                    return;
                }
                
                // Check for duplicate names
                const existingBoard = boards.find(b => b.id !== boardId && b.name === trimmedName);
                if (existingBoard) {
                    this.dom.showToast(`A board named "${trimmedName}" already exists`, 'error');
                    return;
                }
                
                // Update board with proper state synchronization
                this.state.updateBoard(boardId, { 
                    name: trimmedName,
                    lastModified: new Date().toISOString()
                });
                
                this.saveData();
                this.renderBoardSelector();
                
                this.dom.showToast(`Board renamed to "${trimmedName}"`, 'success');
                eventBus.emit('board:edited', { boardId, name: trimmedName });
            }
        } catch (error) {
            console.error('Failed to edit board:', error);
            this.dom.showToast('Failed to rename board', 'error');
        }
    }

    /**
     * Handle delete board
     * @param {Object} data - Event data
     */
    async handleDeleteBoard(data) {
        try {
            const { boardId } = data;
            const board = this.state.get('boards').find(b => b.id === boardId);
            
            if (!board) {
                this.dom.showModal('Error', 'Board not found');
                return;
            }
            
            // Protect default board from deletion
            if (board.isDefault) {
                this.dom.showModal('Cannot Delete', 
                    `"${board.name}" is your default board and cannot be deleted. You can rename it if needed.`,
                    { showCancel: false }
                );
                return;
            }
            
            // Prevent deletion if it's the only board
            const boards = this.state.get('boards');
            if (boards.length <= 1) {
                this.dom.showModal('Cannot Delete', 
                    'You must have at least one board. Create another board before deleting this one.',
                    { showCancel: false }
                );
                return;
            }
            
            const taskCount = board.tasks ? board.tasks.length : 0;
            const message = taskCount > 0 
                ? `Delete "${board.name}" and its ${taskCount} tasks? This cannot be undone.`
                : `Delete "${board.name}"? This cannot be undone.`;
            
            const confirmed = await this.dom.showModal('Confirm Delete', message);
            
            if (confirmed) {
                this.state.removeBoard(boardId);
                this.saveData();
                eventBus.emit('board:deleted', { boardId });
            }
        } catch (error) {
            console.error('Failed to delete board:', error);
            this.handleError('Failed to delete board', error);
        }
    }

    /**
     * Handle duplicate board
     * @param {Object} data - Event data
     */
    async handleDuplicateBoard(data) {
        try {
            const { boardId } = data;
            const board = this.state.get('boards').find(b => b.id === boardId);
            
            if (!board) {
                this.dom.showModal('Error', 'Board not found');
                return;
            }
            
            const newName = await this.dom.showModal('Duplicate Board', 'Enter name for the duplicate:', {
                showInput: true,
                inputValue: `${board.name} (Copy)`
            });
            
            if (newName && newName.trim().length > 0) {
                const duplicatedBoard = new Board(board.toJSON()).duplicate(newName.trim());
                this.state.addBoard(duplicatedBoard);
                this.saveData();
                eventBus.emit('board:duplicated', { 
                    originalBoardId: boardId, 
                    newBoard: duplicatedBoard 
                });
            }
        } catch (error) {
            console.error('Failed to duplicate board:', error);
            this.handleError('Failed to duplicate board', error);
        }
    }

    /**
     * Handle manage boards - Show comprehensive board management modal
     */
    handleManageBoards() {
        try {
            const allBoards = [...this.state.getActiveBoards(), ...this.state.getArchivedBoards()];
            const currentBoard = this.state.getCurrentBoard();
            
            this.dom.showBoardManagementModal(allBoards, currentBoard);
            
            debugLog.log('📋 Board management modal opened', {
                totalBoards: allBoards.length,
                activeBoards: this.state.getActiveBoards().length,
                archivedBoards: this.state.getArchivedBoards().length,
                currentBoard: currentBoard?.name
            });
        } catch (error) {
            console.error('❌ Error opening board management modal:', error);
            this.errorHandler.handleError(error, 'Failed to open board management');
        }
    }

    /**
     * Handle board archiving
     * @param {Object} data - Event data containing boardId
     */
    async handleArchiveBoard(data) {
        try {
            const { boardId } = data;
            
            if (!boardId) {
                throw new Error('Board ID is required for archiving');
            }
            
            const board = this.state.get('boards').find(b => b.id === boardId);
            if (!board) {
                throw new Error('Board not found');
            }
            
            // Prevent archiving default board
            if (board.isDefault) {
                this.dom.showToast('Cannot archive the default board', 'error');
                return;
            }
            
            // Prevent archiving current board
            const currentBoard = this.state.getCurrentBoard();
            if (currentBoard && board.id === currentBoard.id) {
                this.dom.showToast('Cannot archive the currently active board. Switch to another board first.', 'error');
                return;
            }
            
            // Show confirmation dialog
            const confirmed = await this.dom.showModal(
                'Archive Board',
                `Are you sure you want to archive "${board.name}"? The board and all its tasks will be moved to the archive.`,
                {
                    showInput: false,
                    showCancel: true,
                    confirmText: 'Archive',
                    cancelText: 'Cancel'
                }
            );
            
            if (confirmed) {
                // Update board to archived status
                const updatedBoard = { ...board, isArchived: true, lastModified: new Date().toISOString() };
                this.state.updateBoard(boardId, updatedBoard);
                this.saveData();
                
                // Update UI
                this.updateBoardSelector();
                
                // Refresh board management modal if open
                const modal = document.getElementById('board-management-modal');
                if (modal) {
                    const allBoards = [...this.state.getActiveBoards(), ...this.state.getArchivedBoards()];
                    const currentBoard = this.state.getCurrentBoard();
                    
                    // Update the boards list in the modal
                    const boardsList = modal.querySelector('#boards-management-list');
                    if (boardsList) {
                        // Clear and repopulate the boards list
                        boardsList.innerHTML = '';
                        
                        // Separate active and archived boards
                        const activeBoards = allBoards.filter(board => !board.isArchived);
                        const archivedBoards = allBoards.filter(board => board.isArchived);
                        
                        // Active boards
                        if (activeBoards.length > 0) {
                            const activeHeader = document.createElement('div');
                            activeHeader.className = 'boards-section-header mb-2';
                            activeHeader.textContent = 'Active Boards';
                            boardsList.appendChild(activeHeader);
                            
                            activeBoards.forEach(board => {
                                const boardItem = this.dom.createBoardManagementItem(board, currentBoard);
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
                                const boardItem = this.dom.createBoardManagementItem(board, currentBoard);
                                boardsList.appendChild(boardItem);
                            });
                        }
                    }
                }
                
                this.dom.showToast(`Board "${board.name}" archived successfully`, 'success');
                eventBus.emit('board:archived', { boardId, board: updatedBoard });
                
                debugLog.log('📦 Board archived:', {
                    boardId,
                    boardName: board.name,
                    taskCount: (board.tasks || []).length
                });
            }
        } catch (error) {
            console.error('❌ Failed to archive board:', error);
            this.errorHandler.handleError(error, 'Failed to archive board');
        }
    }

    /**
     * Handle board unarchiving
     * @param {Object} data - Event data containing boardId
     */
    async handleUnarchiveBoard(data) {
        try {
            const { boardId } = data;
            
            if (!boardId) {
                throw new Error('Board ID is required for unarchiving');
            }
            
            const board = this.state.get('boards').find(b => b.id === boardId);
            if (!board) {
                throw new Error('Board not found');
            }
            
            if (!board.isArchived) {
                this.dom.showToast('Board is not archived', 'error');
                return;
            }
            
            // Show confirmation dialog
            const confirmed = await this.dom.showModal(
                'Unarchive Board',
                `Are you sure you want to unarchive "${board.name}"? The board will be restored to active status.`,
                {
                    showInput: false,
                    showCancel: true,
                    confirmText: 'Unarchive',
                    cancelText: 'Cancel'
                }
            );
            
            if (confirmed) {
                // Update board to active status
                const updatedBoard = { ...board, isArchived: false, lastModified: new Date().toISOString() };
                this.state.updateBoard(boardId, updatedBoard);
                this.saveData();
                
                // Update UI
                this.updateBoardSelector();
                
                // Refresh board management modal if open
                const modal = document.getElementById('board-management-modal');
                if (modal) {
                    const allBoards = [...this.state.getActiveBoards(), ...this.state.getArchivedBoards()];
                    const currentBoard = this.state.getCurrentBoard();
                    
                    // Update the boards list in the modal
                    const boardsList = modal.querySelector('#boards-management-list');
                    if (boardsList) {
                        // Clear and repopulate the boards list
                        boardsList.innerHTML = '';
                        
                        // Separate active and archived boards
                        const activeBoards = allBoards.filter(board => !board.isArchived);
                        const archivedBoards = allBoards.filter(board => board.isArchived);
                        
                        // Active boards
                        if (activeBoards.length > 0) {
                            const activeHeader = document.createElement('div');
                            activeHeader.className = 'boards-section-header mb-2';
                            activeHeader.textContent = 'Active Boards';
                            boardsList.appendChild(activeHeader);
                            
                            activeBoards.forEach(board => {
                                const boardItem = this.dom.createBoardManagementItem(board, currentBoard);
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
                                const boardItem = this.dom.createBoardManagementItem(board, currentBoard);
                                boardsList.appendChild(boardItem);
                            });
                        }
                    }
                }
                
                this.dom.showToast(`Board "${board.name}" unarchived successfully`, 'success');
                eventBus.emit('board:unarchived', { boardId, board: updatedBoard });
                
                debugLog.log('📤 Board unarchived:', {
                    boardId,
                    boardName: board.name,
                    taskCount: (board.tasks || []).length
                });
            }
        } catch (error) {
            console.error('❌ Failed to unarchive board:', error);
            this.errorHandler.handleError(error, 'Failed to unarchive board');
        }
    }



    /**
     * Validate board data integrity
     * @param {Object} board - Board to validate
     * @returns {Object} Validation result
     */
    validateBoardData(board) {
        const errors = [];
        
        if (!board || typeof board !== 'object') {
            return { isValid: false, errors: ['Board data is not an object'] };
        }
        
        if (!board.id || typeof board.id !== 'string') {
            errors.push('Board ID is missing or invalid');
        }
        
        if (!board.name || typeof board.name !== 'string' || board.name.trim().length === 0) {
            errors.push('Board name is missing or empty');
        }
        
        if (board.name && board.name.length > 50) {
            errors.push('Board name exceeds 50 characters');
        }
        
        if (board.tasks && !Array.isArray(board.tasks)) {
            errors.push('Board tasks must be an array');
        }
        
        if (board.tasks) {
            board.tasks.forEach((task, index) => {
                if (!task || typeof task !== 'object') {
                    errors.push(`Task at index ${index} is not an object`);
                } else {
                    if (!task.id || typeof task.id !== 'string') {
                        errors.push(`Task at index ${index} has missing or invalid ID`);
                    }
                    if (!task.text || typeof task.text !== 'string') {
                        errors.push(`Task at index ${index} has missing or invalid text`);
                    }
                    if (!['todo', 'doing', 'done'].includes(task.status)) {
                        errors.push(`Task at index ${index} has invalid status: ${task.status}`);
                    }
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }



    // Utility Methods

    /**
     * Validate import data
     * @param {*} data - Data to validate
     * @returns {Object} Validation result with type and data
     */
    validateImportData(data) {
        try {
            if (!data || typeof data !== 'object') {
                return {
                    isValid: false,
                    error: 'Invalid data format - not a valid object'
                };
            }

            // Check for new multi-board format
            if (data.data && data.data.boards && Array.isArray(data.data.boards)) {
                const validatedBoards = [];
                
                for (const board of data.data.boards) {
                    const validation = this.validateBoardData(board);
                    if (validation.isValid) {
                        validatedBoards.push(board);
                    } else {
                        console.warn(`Skipping invalid board: ${validation.errors.join(', ')}`);
                    }
                }
                
                if (validatedBoards.length > 0) {
                    return {
                        isValid: true,
                        type: 'multi-board',
                        boards: validatedBoards,
                        tasks: []
                    };
                }
            }
            
            // Check for legacy formats
            let tasksArray = [];
            
            if (Array.isArray(data)) {
                tasksArray = data;
            } else if (data.data && Array.isArray(data.data)) {
                tasksArray = data.data;
            } else if (data.tasks && Array.isArray(data.tasks)) {
                tasksArray = data.tasks;
            } else if (data.data && data.data.tasks && Array.isArray(data.data.tasks)) {
                tasksArray = data.data.tasks;
            } else {
                return {
                    isValid: false,
                    error: 'Invalid data format - no recognizable structure found'
                };
            }
            
            const validTasks = tasksArray.map(item => {
                try {
                    if (!item || typeof item !== 'object') return null;
                    
                    // Handle legacy format with 'completed' boolean
                    if (typeof item.completed === 'boolean') {
                        if (!item.text || typeof item.text !== 'string' || item.text.trim().length === 0) {
                            return null;
                        }
                        return {
                            id: generateUniqueId(),
                            text: item.text.trim(),
                            status: item.completed ? 'done' : 'todo',
                            createdDate: item.createdDate || new Date().toISOString().split('T')[0]
                        };
                    }
                    
                    // Handle current format with status
                    if (item.text && typeof item.text === 'string' && 
                        ['todo', 'doing', 'done'].includes(item.status)) {
                        if (item.text.trim().length === 0 || item.text.length > 200) {
                            return null;
                        }
                        return {
                            id: item.id || generateUniqueId(),
                            text: item.text.trim(),
                            status: item.status,
                            createdDate: item.createdDate || new Date().toISOString().split('T')[0]
                        };
                    }
                    
                    return null;
                } catch (e) {
                    console.warn('Failed to process task item:', e);
                    return null;
                }
            }).filter(Boolean);
            
            if (validTasks.length === 0) {
                return {
                    isValid: false,
                    error: 'No valid tasks found in the import data'
                };
            }
            
            return {
                isValid: true,
                type: 'legacy',
                boards: [],
                tasks: validTasks
            };
            
        } catch (error) {
            return {
                isValid: false,
                error: `Data validation failed: ${error.message}`
            };
        }
    }

    /**
     * Import multi-board data
     * @param {Array} boardsToImport - Boards to import
     * @param {boolean} mergeMode - True to merge, false to replace
     */
    async importMultiBoardData(boardsToImport, mergeMode) {
        try {
            let finalBoards;
            let totalTaskCount = 0;
            let importedBoards = [];
            
            // Validate imported boards first
            const validatedBoards = boardsToImport.filter(boardData => {
                if (!boardData || typeof boardData !== 'object') return false;
                if (!boardData.name || typeof boardData.name !== 'string') return false;
                if (boardData.name.trim().length === 0 || boardData.name.length > 50) return false;
                return true;
            });
            
            if (validatedBoards.length === 0) {
                this.dom.showModal('Error', 'No valid boards found in import data');
                return;
            }
            
            if (mergeMode) {
                // Merge with existing boards
                const existingBoards = this.state.get('boards') || [];
                const updatedExistingBoards = [...existingBoards];
                
                for (const boardData of validatedBoards) {
                    totalTaskCount += boardData.tasks ? boardData.tasks.length : 0;
                    
                    // Always generate new ID to prevent conflicts
                    const uniqueId = generateUniqueId();
                    
                    // Check for name conflicts only
                    const existingBoardWithSameName = updatedExistingBoards.find(b => b.name === boardData.name);
                    
                    if (existingBoardWithSameName) {
                        // Ask user what to do with duplicate name
                        const action = await this.dom.showModal(
                            'Duplicate Board Name',
                            `A board named "${boardData.name}" already exists. What would you like to do?`,
                            {
                                confirmText: 'Merge Tasks',
                                cancelText: 'Import with New Name'
                            }
                        );
                        
                        if (action) {
                            // Merge tasks into existing board
                            const existingTasks = existingBoardWithSameName.tasks || [];
                            const newTasks = boardData.tasks || [];
                            
                            // Validate and convert tasks
                            const validatedNewTasks = newTasks.filter(task => {
                                return task && task.text && typeof task.text === 'string' && 
                                       ['todo', 'doing', 'done'].includes(task.status);
                            }).map(task => ({
                                ...task,
                                id: generateUniqueId(), // Ensure unique task IDs
                                createdDate: task.createdDate || new Date().toISOString().split('T')[0]
                            }));
                            
                            const mergedTasks = [...existingTasks, ...validatedNewTasks];
                            
                            // Update the existing board
                            const boardIndex = updatedExistingBoards.findIndex(b => b.id === existingBoardWithSameName.id);
                            if (boardIndex !== -1) {
                                updatedExistingBoards[boardIndex] = new Board({
                                    ...existingBoardWithSameName.toJSON(),
                                    tasks: mergedTasks,
                                    lastModified: new Date().toISOString()
                                });
                            }
                        } else {
                            // Import as new board with unique name
                            const uniqueName = this.generateUniqueBoardName(boardData.name, updatedExistingBoards);
                            const newBoardData = {
                                ...boardData,
                                id: uniqueId,
                                name: uniqueName,
                                isDefault: false,
                                createdDate: new Date().toISOString().split('T')[0],
                                lastModified: new Date().toISOString(),
                                tasks: (boardData.tasks || []).map(task => ({
                                    ...task,
                                    id: generateUniqueId()
                                }))
                            };
                            
                            const newBoard = new Board(newBoardData);
                            updatedExistingBoards.push(newBoard);
                            importedBoards.push(newBoard);
                        }
                    } else {
                        // No name conflict - add as new board
                        const newBoardData = {
                            ...boardData,
                            id: uniqueId,
                            isDefault: false,
                            createdDate: new Date().toISOString().split('T')[0],
                            lastModified: new Date().toISOString(),
                            tasks: (boardData.tasks || []).map(task => ({
                                ...task,
                                id: generateUniqueId()
                            }))
                        };
                        
                        const newBoard = new Board(newBoardData);
                        updatedExistingBoards.push(newBoard);
                        importedBoards.push(newBoard);
                    }
                }
                
                finalBoards = updatedExistingBoards;
            } else {
                // Replace all data
                const confirmed = await this.dom.showModal(
                    'Confirm Replace',
                    'This will replace ALL your existing boards and tasks. This cannot be undone. Are you sure?'
                );
                
                if (!confirmed) return;
                
                finalBoards = validatedBoards.map((boardData, index) => {
                    totalTaskCount += boardData.tasks ? boardData.tasks.length : 0;
                    
                    const newBoardData = {
                        ...boardData,
                        id: generateUniqueId(),
                        isDefault: index === 0, // First board becomes default
                        createdDate: new Date().toISOString().split('T')[0],
                        lastModified: new Date().toISOString(),
                        tasks: (boardData.tasks || []).map(task => ({
                            ...task,
                            id: generateUniqueId()
                        }))
                    };
                    
                    return new Board(newBoardData);
                });
            }
            
            // Ensure we have at least one board
            if (finalBoards.length === 0) {
                this.createDefaultBoard(false); // false = not a new user, don't show empty state
                return;
            }
            
            // Determine current board - prefer existing current board if it still exists
            const currentBoardId = this.state.get('currentBoardId');
            let newCurrentBoardId = finalBoards.find(b => b.id === currentBoardId)?.id || finalBoards[0].id;
            
            // Get tasks for the current board
            const currentBoard = finalBoards.find(b => b.id === newCurrentBoardId);
            const currentTasks = currentBoard ? (currentBoard.tasks || []).map(taskData => {
                try {
                    return new Task(taskData);
                } catch (e) {
                    console.warn('Failed to create Task instance:', e);
                    return taskData;
                }
            }) : [];
            
            // Update state with proper synchronization
            this.state.setState({
                boards: finalBoards,
                currentBoardId: newCurrentBoardId,
                tasks: currentTasks
            });
            
            // Save and refresh UI
            this.saveData();
            this.render();
            this.renderBoardSelector();
            
            // Show success message
            const newBoardsAdded = mergeMode ? importedBoards.length : finalBoards.length;
            const successMessage = mergeMode ?
                `Successfully merged data! Added ${newBoardsAdded} new boards and updated existing ones. Total tasks: ${totalTaskCount}` :
                `Successfully imported ${validatedBoards.length} boards with ${totalTaskCount} tasks!`;
            
            this.dom.showModal('Success', successMessage, { showCancel: false });
            
            eventBus.emit('boards:imported', { 
                count: validatedBoards.length, 
                tasks: totalTaskCount,
                mode: mergeMode ? 'merge' : 'replace'
            });
            
        } catch (error) {
            console.error('Failed to import multi-board data:', error);
            this.handleError('Failed to import boards', error, 'import');
        }
    }

    /**
     * Import legacy task data
     * @param {Array} tasksToImport - Tasks to import
     * @param {boolean} addToCurrentBoard - True to add to current board, false to create new board
     */
    async importLegacyData(tasksToImport, addToCurrentBoard) {
        try {
            if (addToCurrentBoard) {
                // Add to current board
                const currentTasks = this.state.get('tasks');
                const newTasks = tasksToImport.map(taskData => createTask(taskData));
                
                this.updateCurrentBoardTasks([...currentTasks, ...newTasks]);
                
                this.dom.showModal('Success', 
                    `Successfully imported ${newTasks.length} tasks to the current board!`,
                    { showCancel: false }
                );
            } else {
                // Create new board
                const boardName = await this.dom.showModal('New Board Name', 'Enter name for the imported board:', {
                    showInput: true,
                    inputValue: `Imported Tasks ${new Date().toLocaleDateString()}`,
                    confirmText: 'Create Board'
                });
                
                if (!boardName || boardName.trim().length === 0) return;
                
                const newBoard = createBoard({
                    name: boardName.trim(),
                    description: 'Board created from imported tasks',
                    tasks: tasksToImport
                });
                
                this.state.addBoard(newBoard);
                this.state.setCurrentBoard(newBoard.id);
                this.saveData();
                
                this.dom.showModal('Success', 
                    `Successfully created "${boardName}" with ${tasksToImport.length} imported tasks!`,
                    { showCancel: false }
                );
            }
            
            eventBus.emit('tasks:imported', { 
                count: tasksToImport.length,
                mode: addToCurrentBoard ? 'current-board' : 'new-board'
            });
            
        } catch (error) {
            console.error('Failed to import legacy data:', error);
            this.handleError('Failed to import tasks', error, 'import');
        }
    }

    /**
     * Read file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} File content
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    /**
     * Handle application errors
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @param {string} context - Error context for sanitization
     */
    handleError(message, error, context = 'default') {
        // Log detailed error for debugging (only in development)
        debugLog.error(message, error);
        
        // Sanitize error message for user display
        const sanitizedMessage = securityManager.sanitizeErrorMessage(error || message, context);
        
        // Try to show modal if DOM is available and initialized
        if (this.dom && this.dom.showModal && document.getElementById('custom-modal')) {
            try {
                this.dom.showModal('Error', sanitizedMessage, { showCancel: false });
            } catch (modalError) {
                console.warn('Could not show error modal:', modalError);
                // Fallback to console error for critical initialization errors
                console.error('Application Error:', sanitizedMessage);
            }
        } else {
            // Fallback when modal is not available (during initialization)
            console.error('Application Error:', sanitizedMessage);
        }
        
        // Emit sanitized error for event handlers
        eventBus.emit('app:error', { 
            message: sanitizedMessage, 
            originalMessage: message,
            context 
        });
    }

    // Public API

    /**
     * Get current state
     * @returns {Object} Current application state
     */
    getState() {
        return this.state.getState();
    }

    /**
     * Get tasks
     * @returns {Array} Current tasks
     */
    getTasks() {
        return this.state.get('tasks');
    }

    /**
     * Create a new task
     * @param {string} text - Task text
     * @returns {Task} Created task
     */
    createTask(text) {
        eventBus.emit('task:create', { text });
    }

    /**
     * Focus task input
     */
    focusInput() {
        this.dom.focusTaskInput();
    }

    /**
     * Perform automatic archiving of old completed tasks
     */
    performAutoArchive() {
        const config = settingsManager.getAutoArchiveConfig();
        if (!config.enabled) return;

        const currentBoard = appState.getCurrentBoard();
        
        // Check if we have a current board and it has tasks
        if (!currentBoard || !currentBoard.tasks) {
            debugLog.log('No current board or tasks found, skipping auto-archive');
            return;
        }
        
        const tasks = currentBoard.tasks;
        const today = new Date();
        const archiveThreshold = config.days;

        const tasksToArchive = tasks.filter(task => {
            if (task.status !== 'done' || !task.completedDate) return false;

            const completedDate = new Date(task.completedDate);
            const daysSinceCompletion = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));

            return daysSinceCompletion >= archiveThreshold;
        });

        if (tasksToArchive.length > 0) {
            // Mark tasks as archived
            const currentDate = new Date().toISOString().split('T')[0];
            tasksToArchive.forEach(task => {
                task.archived = true;
                task.archivedDate = currentDate;
                eventBus.emit('task:archived', { task });
            });

            // Remove from active tasks
            const remainingTasks = tasks.filter(task => !tasksToArchive.includes(task));
            currentBoard.tasks = remainingTasks;

            // Update state and storage
            appState.saveState();
            
            console.log(`Auto-archived ${tasksToArchive.length} tasks`);
            
            // Show notification if enabled
            if (tasksToArchive.length > 0) {
                eventBus.emit('notification:show', {
                    message: `Auto-archived ${tasksToArchive.length} completed tasks`,
                    type: 'info'
                });
            }

            // Re-render UI
            this.renderTasks();
        }
    }

    /**
     * Manually archive a specific task
     * @param {string} taskId - Task ID to archive
     */
    archiveTask(taskId) {
        const tasks = this.state.get('tasks');
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) {
            console.warn('Task not found for archiving:', taskId);
            return;
        }

        // Create archived task with metadata
        const archivedTask = {
            ...task.toJSON ? task.toJSON() : task,
            archived: true,
            archivedDate: new Date().toISOString().split('T')[0],
            archivedTimestamp: new Date().toISOString(),
            originalBoardId: this.state.get('currentBoardId')
        };

        // Store archived task in board's archived tasks
        const currentBoardId = this.state.get('currentBoardId');
        const boards = this.state.get('boards');
        const updatedBoards = boards.map(board => {
            if (board.id === currentBoardId) {
                const boardData = board.toJSON ? board.toJSON() : board;
                const archivedTasks = boardData.archivedTasks || [];
                
                return new Board({
                    ...boardData,
                    archivedTasks: [...archivedTasks, archivedTask],
                    lastModified: new Date().toISOString()
                });
            }
            return board;
        });

        // Remove task from active tasks
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        
        // Update state with both active tasks and updated boards
        this.state.setState({
            boards: updatedBoards,
            tasks: updatedTasks
        });
        
        debugLog.log('Task archived successfully:', {
            taskId,
            taskText: task.text,
            boardId: currentBoardId,
            archivedDate: archivedTask.archivedDate
        });
        
        eventBus.emit('task:archived', { 
            taskId, 
            task: archivedTask,
            boardId: currentBoardId
        });
    }

    /**
     * Initialize auto-archive timer
     */
    initAutoArchive() {
        // Only run auto-archive if we have boards loaded
        const boards = this.state.get('boards');
        if (boards && boards.length > 0) {
            // Run auto-archive on app start
            this.performAutoArchive();
        }

        // Set up periodic auto-archive (every 6 hours)
        setInterval(() => {
            const currentBoards = this.state.get('boards');
            if (currentBoards && currentBoards.length > 0) {
                this.performAutoArchive();
            }
        }, 6 * 60 * 60 * 1000);
    }

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate a unique board name
     * @param {string} baseName - Base name to make unique
     * @param {Array} existingBoards - Array of existing boards
     * @returns {string} Unique board name
     */
    generateUniqueBoardName(baseName, existingBoards) {
        let uniqueName = baseName;
        let counter = 1;
        
        while (existingBoards.some(board => board.name === uniqueName)) {
            uniqueName = `${baseName} (${counter})`;
            counter++;
        }
        
        return uniqueName;
    }

    /**
     * Show archived tasks modal
     */
    showArchivedTasksModal() {
        try {
            const allBoards = appState.get('boards') || [];
            let archivedTasks = [];

            // Collect archived tasks from all boards
            allBoards.forEach(board => {
                if (board.tasks) {
                    const boardArchivedTasks = board.tasks.filter(task => task.archived === true);
                    archivedTasks = archivedTasks.concat(boardArchivedTasks);
                }
            });

            // Sort by archived date (most recent first)
            archivedTasks.sort((a, b) => {
                const dateA = new Date(a.archivedDate || a.lastModified);
                const dateB = new Date(b.archivedDate || b.lastModified);
                return dateB - dateA;
            });

            if (archivedTasks.length === 0) {
                this.dom.showModal('Archived Tasks', 'No archived tasks found.', {
                    showCancel: false,
                    confirmText: 'OK'
                });
                return;
            }

            // Generate HTML for archived tasks
            const archivedTasksHTML = this.generateArchivedTasksHTML(archivedTasks);

            this.dom.showModal('Archived Tasks', archivedTasksHTML, {
                showCancel: false,
                confirmText: 'Close',
                allowHTML: true,
                customClass: 'archived-tasks-modal'
            });

        } catch (error) {
            console.error('Error showing archived tasks:', error);
            this.dom.showModal('Error', 'Failed to load archived tasks.');
        }
    }

    /**
     * Generate HTML for archived tasks list
     * @param {Array} archivedTasks - Array of archived tasks
     * @returns {string} HTML string
     */
    generateArchivedTasksHTML(archivedTasks) {
        const tasksHTML = archivedTasks.map(task => {
            const archivedDate = task.archivedDate ? 
                new Date(task.archivedDate).toLocaleDateString() : 
                'Unknown date';
                
            const completedDate = task.completedDate ? 
                new Date(task.completedDate).toLocaleDateString() : 
                'Unknown date';

            return `
                <div class="archived-task-item">
                    <div class="archived-task-content">
                        <div class="archived-task-text">${this.dom.sanitizeHTML(task.text)}</div>
                        <div class="archived-task-dates">
                            <small class="text-muted">
                                Completed: ${completedDate} | Archived: ${archivedDate}
                            </small>
                        </div>
                    </div>
                    <div class="archived-task-actions">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.cascadeApp.restoreArchivedTask('${task.id}')">
                            Restore
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="window.cascadeApp.deleteArchivedTask('${task.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="archived-tasks-container">
                <p class="archived-tasks-summary">
                    Found ${archivedTasks.length} archived task${archivedTasks.length !== 1 ? 's' : ''}.
                </p>
                <div class="archived-tasks-list">
                    ${tasksHTML}
                </div>
            </div>
        `;
    }

    /**
     * Restore an archived task
     * @param {string} taskId - Task ID to restore
     */
    restoreArchivedTask(taskId) {
        try {
            const allBoards = appState.get('boards') || [];
            let taskFound = false;

            // Find and restore the task in any board
            allBoards.forEach(board => {
                if (board.tasks) {
                    const taskIndex = board.tasks.findIndex(task => task.id === taskId && task.archived === true);
                    if (taskIndex !== -1) {
                        const task = board.tasks[taskIndex];
                        task.archived = false;
                        task.archivedDate = null;
                        task.status = 'done'; // Keep as completed but active
                        task.lastModified = new Date().toISOString();
                        taskFound = true;
                    }
                }
            });

            if (taskFound) {
                appState.saveState();
                this.renderTasks();
                
                // Close the archived tasks modal and show success
                const modal = document.getElementById('custom-modal');
                if (modal) {
                    modal.classList.remove('modal-overlay--visible');
                }
                
                setTimeout(() => {
                    this.dom.showModal('Task Restored', 'The task has been restored to your active tasks.', {
                        showCancel: false,
                        confirmText: 'OK'
                    });
                }, 300);
            } else {
                this.dom.showModal('Error', 'Task not found or already restored.');
            }

        } catch (error) {
            console.error('Error restoring archived task:', error);
            this.dom.showModal('Error', 'Failed to restore task.');
        }
    }

    /**
     * Permanently delete an archived task
     * @param {string} taskId - Task ID to delete
     */
    deleteArchivedTask(taskId) {
        this.dom.showModal('Delete Archived Task', 'Are you sure you want to permanently delete this task? This action cannot be undone.', {
            confirmText: 'Delete',
            cancelText: 'Cancel'
        }).then((confirmed) => {
            if (confirmed) {
                try {
                    const allBoards = appState.get('boards') || [];
                    let taskFound = false;

                    // Find and remove the task from any board
                    allBoards.forEach(board => {
                        if (board.tasks) {
                            const originalLength = board.tasks.length;
                            board.tasks = board.tasks.filter(task => !(task.id === taskId && task.archived === true));
                            if (board.tasks.length < originalLength) {
                                taskFound = true;
                            }
                        }
                    });

                    if (taskFound) {
                        appState.saveState();
                        
                        // Close modal and show success
                        const modal = document.getElementById('custom-modal');
                        if (modal) {
                            modal.classList.remove('modal-overlay--visible');
                        }
                        
                        setTimeout(() => {
                            this.dom.showModal('Task Deleted', 'The archived task has been permanently deleted.', {
                                showCancel: false,
                                confirmText: 'OK'
                            });
                        }, 300);
                    } else {
                        this.dom.showModal('Error', 'Task not found.');
                    }

                } catch (error) {
                    console.error('Error deleting archived task:', error);
                    this.dom.showModal('Error', 'Failed to delete task.');
                }
            }
        });
    }

    /**
     * Handle moving task between boards
     * @param {Object} data - Event data
     */
    async handleMoveTaskToBoard(data) {
        try {
            const { taskId } = data;
            const boards = this.state.get('boards') || [];
            const currentBoard = this.state.get('currentBoardId');
            
            // Find the task in current board
            const task = this.state.get('tasks').find(t => t.id === taskId);
            if (!task) {
                console.error('❌ Task not found:', taskId);
                return;
            }

            // Show board selection modal
            const targetBoardId = await this.dom.showModal(
                'Move Task',
                'Select destination board:',
                {
                    showBoardSelector: true,
                    boards: boards.filter(b => b.id !== currentBoard),
                    currentBoardId: currentBoard
                }
            );

            if (targetBoardId && targetBoardId !== currentBoard) {
                // Remove from current board
                const updatedTasks = this.state.get('tasks').filter(t => t.id !== taskId);
                this.updateCurrentBoardTasks(updatedTasks);

                // Add to target board
                const targetBoard = boards.find(b => b.id === targetBoardId);
                if (targetBoard) {
                    targetBoard.tasks.push(task);
                    this.state.setState({ boards });
                    eventBus.emit('task:moved-between-boards', { taskId, fromBoard: currentBoard, toBoard: targetBoardId });
                }
            }
        } catch (error) {
            console.error('❌ Failed to move task between boards:', error);
            this.handleError('Failed to move task', error);
        }
    }

    /**
     * Handle copying task to another board
     * @param {Object} data - Event data
     */
    async handleCopyTaskToBoard(data) {
        try {
            const { taskId } = data;
            const boards = this.state.get('boards') || [];
            const currentBoard = this.state.get('currentBoardId');
            
            // Find the task in current board
            const task = this.state.get('tasks').find(t => t.id === taskId);
            if (!task) {
                console.error('❌ Task not found:', taskId);
                return;
            }

            // Show board selection modal
            const targetBoardId = await this.dom.showModal(
                'Copy Task',
                'Select destination board:',
                {
                    showBoardSelector: true,
                    boards: boards.filter(b => b.id !== currentBoard),
                    currentBoardId: currentBoard
                }
            );

            if (targetBoardId && targetBoardId !== currentBoard) {
                // Create a copy of the task
                const taskData = task.toJSON ? task.toJSON() : task;
                const taskCopy = new Task({
                    ...taskData,
                    id: generateUniqueId(),
                    createdDate: new Date().toISOString().split('T')[0],
                    lastModified: new Date().toISOString()
                });

                // Add to target board
                const targetBoard = boards.find(b => b.id === targetBoardId);
                if (targetBoard) {
                    targetBoard.tasks.push(taskCopy);
                    this.state.setState({ boards });
                    eventBus.emit('task:copied-between-boards', { 
                        originalTaskId: taskId, 
                        newTaskId: taskCopy.id, 
                        fromBoard: currentBoard, 
                        toBoard: targetBoardId 
                    });
                }
            }
        } catch (error) {
            console.error('❌ Failed to copy task between boards:', error);
            this.handleError('Failed to copy task', error);
        }
    }

    /**
     * Handle reordering boards
     * @param {Object} data - Event data
     */
    async handleReorderBoards(data) {
        try {
            const { newOrder } = data;
            const boards = this.state.get('boards') || [];
            
            // Reorder boards based on new order
            const reorderedBoards = newOrder.map(boardId => 
                boards.find(b => b.id === boardId)
            ).filter(Boolean);

            this.state.setState({ boards: reorderedBoards });
            eventBus.emit('boards:reordered', { newOrder });
        } catch (error) {
            console.error('❌ Failed to reorder boards:', error);
            this.handleError('Failed to reorder boards', error);
        }
    }

    /**
     * Handle sorting boards
     * @param {Object} data - Event data
     */
    async handleSortBoards(data) {
        try {
            const { sortBy } = data;
            const boards = this.state.get('boards') || [];
            
            let sortedBoards = [...boards];
            
            switch (sortBy) {
                case 'name':
                    sortedBoards.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'date':
                    sortedBoards.sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));
                    break;
                case 'tasks':
                    sortedBoards.sort((a, b) => (b.tasks?.length || 0) - (a.tasks?.length || 0));
                    break;
                default:
                    console.warn('❌ Invalid sort criteria:', sortBy);
                    return;
            }

            this.state.setState({ boards: sortedBoards });
            eventBus.emit('boards:sorted', { sortBy });
        } catch (error) {
            console.error('❌ Failed to sort boards:', error);
            this.handleError('Failed to sort boards', error);
        }
    }

    /**
     * Handle searching boards
     * @param {Object} data - Event data
     */
    async handleSearchBoards(data) {
        try {
            const { query } = data;
            const boards = this.state.get('boards') || [];
            
            if (!query || query.trim() === '') {
                // Show all boards when query is empty
                this.dom.renderBoardSelector({ boards, searchQuery: '' });
                return;
            }

            const filteredBoards = boards.filter(board => 
                board.name.toLowerCase().includes(query.toLowerCase()) ||
                board.description?.toLowerCase().includes(query.toLowerCase())
            );

            this.dom.renderBoardSelector({ boards: filteredBoards, searchQuery: query });
            eventBus.emit('boards:searched', { query, results: filteredBoards.length });
        } catch (error) {
            console.error('❌ Failed to search boards:', error);
            this.handleError('Failed to search boards', error);
        }
    }

    /**
     * Handle filtering boards
     * @param {Object} data - Event data
     */
    async handleFilterBoards(data) {
        try {
            const { color, status } = data;
            const boards = this.state.get('boards') || [];
            
            let filteredBoards = [...boards];
            
            if (color) {
                filteredBoards = filteredBoards.filter(board => board.color === color);
            }
            
            if (status) {
                filteredBoards = filteredBoards.filter(board => {
                    if (status === 'archived') return board.isArchived;
                    if (status === 'active') return !board.isArchived;
                    return true;
                });
            }

            this.dom.renderBoardSelector({ boards: filteredBoards, filter: { color, status } });
            eventBus.emit('boards:filtered', { filter: { color, status }, results: filteredBoards.length });
        } catch (error) {
            console.error('❌ Failed to filter boards:', error);
            this.handleError('Failed to filter boards', error);
        }
    }

    /**
     * Handle clearing board filters
     */
    async handleClearBoardFilters() {
        try {
            const boards = this.state.get('boards') || [];
            this.dom.renderBoardSelector({ boards, searchQuery: '', filter: null });
            eventBus.emit('boards:filter-cleared');
        } catch (error) {
            console.error('❌ Failed to clear board filters:', error);
            this.handleError('Failed to clear filters', error);
        }
    }

    /**
     * Get board statistics
     * @param {Object} data - Event data
     */
    async getBoardStatistics(data) {
        try {
            const { boardId } = data;
            const boards = this.state.get('boards') || [];
            const board = boards.find(b => b.id === boardId);
            
            if (!board) {
                throw new Error('Board not found');
            }

            const tasks = board.tasks || [];
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(t => t.status === 'done').length;
            const activeTasks = tasks.filter(t => t.status !== 'done').length;
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            return {
                boardId,
                boardName: board.name,
                totalTasks,
                completedTasks,
                activeTasks,
                completionRate: Math.round(completionRate * 100) / 100,
                averageCompletionTime: this.calculateAverageCompletionTime(tasks),
                lastActivity: this.getLastActivityDate(tasks)
            };
        } catch (error) {
            console.error('❌ Failed to get board statistics:', error);
            throw error;
        }
    }

    /**
     * Get board trends
     * @param {Object} data - Event data
     */
    async getBoardTrends(data) {
        try {
            const { boardId, days = 7 } = data;
            const boards = this.state.get('boards') || [];
            const board = boards.find(b => b.id === boardId);
            
            if (!board) {
                throw new Error('Board not found');
            }

            const tasks = board.tasks || [];
            const now = new Date();
            const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

            const recentTasks = tasks.filter(task => {
                const taskDate = new Date(task.lastModified);
                return taskDate >= cutoffDate;
            });

            const dailyStats = {};
            for (let i = 0; i < days; i++) {
                const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
                const dateStr = date.toISOString().split('T')[0];
                dailyStats[dateStr] = {
                    created: 0,
                    completed: 0,
                    moved: 0
                };
            }

            recentTasks.forEach(task => {
                const createdDate = task.createdDate;
                const completedDate = task.completedDate;
                const lastModified = task.lastModified.split('T')[0];

                if (dailyStats[createdDate]) {
                    dailyStats[createdDate].created++;
                }
                if (completedDate && dailyStats[completedDate]) {
                    dailyStats[completedDate].completed++;
                }
                if (dailyStats[lastModified]) {
                    dailyStats[lastModified].moved++;
                }
            });

            return {
                boardId,
                boardName: board.name,
                period: days,
                dailyStats,
                totalCreated: recentTasks.length,
                totalCompleted: recentTasks.filter(t => t.status === 'done').length,
                trend: this.calculateTrend(dailyStats)
            };
        } catch (error) {
            console.error('❌ Failed to get board trends:', error);
            throw error;
        }
    }

    /**
     * Calculate average completion time for tasks
     * @param {Array} tasks - Array of tasks
     * @returns {number} Average completion time in days
     */
    calculateAverageCompletionTime(tasks) {
        const completedTasks = tasks.filter(t => t.status === 'done' && t.completedDate);
        if (completedTasks.length === 0) return 0;

        const totalDays = completedTasks.reduce((sum, task) => {
            const created = new Date(task.createdDate);
            const completed = new Date(task.completedDate);
            return sum + Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
        }, 0);

        return Math.round((totalDays / completedTasks.length) * 10) / 10;
    }

    /**
     * Get last activity date for tasks
     * @param {Array} tasks - Array of tasks
     * @returns {string|null} Last activity date or null
     */
    getLastActivityDate(tasks) {
        if (tasks.length === 0) return null;
        
        const lastModified = tasks.reduce((latest, task) => {
            const taskDate = new Date(task.lastModified);
            return taskDate > latest ? taskDate : latest;
        }, new Date(0));

        return lastModified.getTime() > 0 ? lastModified.toISOString().split('T')[0] : null;
    }

    /**
     * Calculate trend from daily stats
     * @param {Object} dailyStats - Daily statistics
     * @returns {string} Trend direction
     */
    calculateTrend(dailyStats) {
        const dates = Object.keys(dailyStats).sort();
        if (dates.length < 2) return 'stable';

        const recent = dates.slice(-3);
        const earlier = dates.slice(-6, -3);

        const recentAvg = recent.reduce((sum, date) => 
            sum + dailyStats[date].completed, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, date) => 
            sum + dailyStats[date].completed, 0) / earlier.length;

        if (recentAvg > earlierAvg * 1.1) return 'increasing';
        if (recentAvg < earlierAvg * 0.9) return 'decreasing';
        return 'stable';
    }
    /**
     * Handle search tasks event
     * @param {Object} data - Search criteria
     */
    handleSearchTasks(data) {
        try {
            const { criteria } = data;
            const tasks = this.state.get('tasks');
            
            debugLog.log('🔍 Searching tasks:', criteria);
            
            // Use performance optimizer for search
            const results = performanceOptimizer.searchTasks(tasks, criteria);
            
            // Update state with filtered results
            this.state.setState({
                tasks: results,
                filter: 'search'
            });
            
            eventBus.emit('tasks:search:completed', {
                criteria,
                resultCount: results.length,
                totalTasks: tasks.length
            });
            
        } catch (error) {
            console.error('❌ Failed to search tasks:', error);
            this.handleError('Failed to search tasks', error, 'search');
        }
    }

    /**
     * Handle get performance stats event
     */
    handleGetPerformanceStats() {
        try {
            const stats = performanceOptimizer.getPerformanceStats();
            
            debugLog.log('📊 Performance stats:', stats);
            
            eventBus.emit('performance:stats:retrieved', stats);
            
            return stats;
        } catch (error) {
            console.error('❌ Failed to get performance stats:', error);
            return null;
        }
    }
}

// Export the main app class
export default CascadeApp;