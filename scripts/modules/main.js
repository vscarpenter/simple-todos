import eventBus from './eventBus.js';
import appState from './state.js';
import storage from './storage.js';
import domManager from './dom.js';
import accessibility from './accessibility.js';
import { settingsManager } from './settings.js';
import { Board, Task, createBoard, createTask } from './models.js';

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
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize DOM first
            this.dom.init();
            
            // Load data from storage
            await this.loadData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize settings and apply theme
            settingsManager.loadSettings();
            settingsManager.applyTheme();
            
            // Initialize auto-archive
            this.initAutoArchive();
            
            // Initial render
            this.render();
            this.renderBoardSelector();
            
            console.log('Cascade app initialized successfully');
            eventBus.emit('app:ready');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleError('Initialization failed', error);
        }
    }

    /**
     * Load data from storage
     */
    async loadData() {
        try {
            const data = this.storage.load();
            
            if (data) {
                if (data.boards) {
                    // New multi-board format
                    const boards = data.boards.map(boardData => {
                        const tasks = boardData.tasks ? boardData.tasks.map(taskData => new Task(taskData)) : [];
                        return new Board({ ...boardData, tasks: tasks.map(t => t.toJSON()) });
                    });
                    
                    // Get tasks for current board
                    const currentBoard = boards.find(b => b.id === data.currentBoardId);
                    const currentTasks = currentBoard ? currentBoard.tasks.map(taskData => new Task(taskData)) : [];
                    
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
                    // No data found, create default empty board
                    this.createDefaultBoard();
                }
            } else {
                // No data found, create default empty board
                this.createDefaultBoard();
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            this.handleError('Failed to load saved data', error);
            // Fallback to default board
            this.createDefaultBoard();
        }
    }

    /**
     * Create default board when no data exists
     */
    createDefaultBoard() {
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
        eventBus.on('task:archive', this.handleArchiveTask.bind(this));
        eventBus.on('task:complete', this.handleCompleteTask.bind(this));
        eventBus.on('task:start', this.handleStartTask.bind(this));
        eventBus.on('task:reset', this.handleResetTask.bind(this));

        // Import/Export events
        eventBus.on('tasks:import', this.handleImportTasks.bind(this));
        eventBus.on('tasks:export', this.handleExportTasks.bind(this));

        // Archive events
        eventBus.on('tasks:archiveCompleted', this.handleArchiveCompleted.bind(this));

        // Undo/Redo events
        eventBus.on('app:undo', this.handleUndo.bind(this));
        eventBus.on('app:redo', this.handleRedo.bind(this));

        // Settings events
        eventBus.on('settings:show', this.handleShowSettings.bind(this));
        eventBus.on('app:reset', this.handleResetApp.bind(this));

        // Board management events
        eventBus.on('board:create', this.handleCreateBoard.bind(this));
        eventBus.on('board:switch', this.handleSwitchBoard.bind(this));
        eventBus.on('board:edit', this.handleEditBoard.bind(this));

        eventBus.on('board:delete', this.handleDeleteBoard.bind(this));
        eventBus.on('board:duplicate', this.handleDuplicateBoard.bind(this));
        eventBus.on('boards:manage', this.handleManageBoards.bind(this));

        // Storage events
        eventBus.on('storage:error', this.handleStorageError.bind(this));
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
                boards: boards.map(board => board.toJSON()),
                currentBoardId,
                filter,
                lastSaved: new Date().toISOString()
            };
            
            this.storage.save(data);
        } catch (error) {
            console.error('Failed to save data:', error);
            this.handleError('Failed to save data', error);
        }
    }

    /**
     * Render the current state
     */
    render() {
        const tasks = this.state.get('tasks');
        
        // Group tasks by status
        const tasksByStatus = {
            todo: tasks.filter(task => task.status === 'todo'),
            doing: tasks.filter(task => task.status === 'doing'),
            done: tasks.filter(task => task.status === 'done')
        };
        
        // Sort tasks by creation date (newest first)
        Object.values(tasksByStatus).forEach(statusTasks => {
            statusTasks.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        });
        
        this.dom.renderTasks(tasksByStatus);
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
                    return new Board({ 
                        ...board.toJSON(), 
                        tasks: updatedTasks.map(t => t.toJSON ? t.toJSON() : t)
                    });
                }
                return board;
            });
            
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
    handleCreateTask(data) {
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
            
            console.log('🆕 Creating new task:', {
                id: newTask.id,
                text: newTask.text,
                status: newTask.status,
                createdDate: newTask.createdDate
            });
            
            const currentTasks = this.state.get('tasks');
            
            // Debug: Check for potential duplicates
            const existingTasksWithSameText = currentTasks.filter(t => t.text === newTask.text);
            if (existingTasksWithSameText.length > 0) {
                console.log('⚠️ Creating task with duplicate text. Existing tasks:', 
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
                        return new Board({ ...board.toJSON(), tasks: updatedTasks });
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
            this.handleError('Failed to create task', error);
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
                
                const updatedTasks = tasks.map(t => 
                    t.id === taskId ? t.update({ text: newText }) : t
                );
                
                this.updateCurrentBoardTasks(updatedTasks);
                eventBus.emit('task:edited', { task: updatedTasks.find(t => t.id === taskId) });
            }
        } catch (error) {
            console.error('Failed to edit task:', error);
            this.handleError('Failed to edit task', error);
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
            this.handleError('Failed to delete task', error);
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
     * Handle drop task (drag and drop or move)
     * @param {Object} data - Event data
     */
    handleDropTask(data) {
        try {
            const { taskId, targetStatus } = data;
            
            console.log('🔄 handleDropTask called:', { taskId, targetStatus });
            
            // Strict validation of inputs
            if (!taskId || typeof taskId !== 'string') {
                console.error('❌ Invalid taskId:', taskId);
                return;
            }
            
            if (!['todo', 'doing', 'done'].includes(targetStatus)) {
                console.error('❌ Invalid target status:', targetStatus);
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
                    return task.moveTo(targetStatus);
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
            
            // Verify exactly one task moved
            const totalChanges = Math.abs(originalByStatus.todo - updatedByStatus.todo) +
                               Math.abs(originalByStatus.doing - updatedByStatus.doing) +
                               Math.abs(originalByStatus.done - updatedByStatus.done);
            
            if (totalChanges !== 2) { // Should be exactly 2 (one task leaves, one task enters)
                console.error('🚨 UNEXPECTED: More than one task changed status!', {
                    totalChanges,
                    originalByStatus,
                    updatedByStatus
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
            this.handleError('Failed to move task', error);
        }
    }

    /**
     * Handle archive task
     * @param {Object} data - Event data
     */
    handleArchiveTask(data) {
        try {
            const { taskId } = data;
            const tasks = this.state.get('tasks');
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            
            this.state.setState({ tasks: updatedTasks });
            
            // Note: In a full implementation, archived tasks would be stored separately
            eventBus.emit('task:archived', { taskId });
            
        } catch (error) {
            console.error('Failed to archive task:', error);
            this.handleError('Failed to archive task', error);
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
            
            if (!file || file.type !== 'application/json') {
                this.dom.showModal('Error', 'Please select a valid JSON file');
                return;
            }
            
            // Check file size limit (5MB)
            const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxFileSize) {
                this.dom.showModal('Error', 'File is too large. Maximum file size is 5MB.');
                return;
            }
            
            const text = await this.readFile(file);
            const importData = JSON.parse(text);
            
            // Validate and process import data
            const validationResult = this.validateImportData(importData);
            
            if (!validationResult.isValid) {
                this.dom.showModal('Error', validationResult.error || 'No valid data found in the import file');
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
            console.error('Import failed:', error);
            this.dom.showModal('Error', 'Failed to import data. Please check the file format.');
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
            this.handleError('Failed to export tasks', error);
        }
    }

    /**
     * Handle archive completed tasks
     */
    async handleArchiveCompleted() {
        try {
            const tasks = this.state.get('tasks');
            const completedTasks = tasks.filter(task => task.status === 'done');
            
            if (completedTasks.length === 0) {
                this.dom.showModal('Info', 'No completed tasks to archive');
                return;
            }
            
            const confirmed = await this.dom.showModal(
                'Archive Completed',
                `Archive ${completedTasks.length} completed tasks?`
            );
            
            if (confirmed) {
                const remainingTasks = tasks.filter(task => task.status !== 'done');
                
                this.updateCurrentBoardTasks(remainingTasks);
                
                this.dom.showModal('Success',
                    `Successfully archived ${completedTasks.length} tasks!`,
                    { showCancel: false }
                );
                
                eventBus.emit('tasks:archived', { count: completedTasks.length });
            }
            
        } catch (error) {
            console.error('Failed to archive completed tasks:', error);
            this.handleError('Failed to archive tasks', error);
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

        const resetAppBtn = document.getElementById('reset-app-btn');
        if (resetAppBtn) {
            resetAppBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleResetApp();
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

            settingsManager.saveSettings(newSettings);
            settingsManager.applyTheme();
            
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
        this.handleError('Storage operation failed', data.error);
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
            this.handleError('Failed to create board', error);
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
     * Handle manage boards - Modern simplified approach
     */
    handleManageBoards() {
        // With the new inline editing system, board management is handled
        // directly in the board selector dropdown. No separate modal needed.
        this.dom.showToast('Use the edit (✏️) and delete (🗑️) buttons in the board selector to manage your boards', 'info', 5000);
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
                this.createDefaultBoard();
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
            this.handleError('Failed to import boards', error);
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
            this.handleError('Failed to import tasks', error);
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
     */
    handleError(message, error) {
        // Log error for debugging (only in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.error(message, error);
        }
        
        if (this.dom && this.dom.showModal) {
            this.dom.showModal('Error', message, { showCancel: false });
        }
        
        eventBus.emit('app:error', { message, error });
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
        const currentBoard = appState.getCurrentBoard();
        const task = currentBoard.tasks.find(t => t.id === taskId);
        
        if (!task) return;

        // Mark as archived
        task.archived = true;
        task.archivedDate = new Date().toISOString().split('T')[0];

        // Remove from active tasks
        currentBoard.tasks = currentBoard.tasks.filter(t => t.id !== taskId);

        // Update state and storage
        appState.saveState();
        
        eventBus.emit('task:archived', { task });
        
        // Re-render UI
        this.renderTasks();
    }

    /**
     * Initialize auto-archive timer
     */
    initAutoArchive() {
        // Run auto-archive on app start
        this.performAutoArchive();

        // Set up periodic auto-archive (every 6 hours)
        setInterval(() => {
            this.performAutoArchive();
        }, 6 * 60 * 60 * 1000);
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
}

// Export the main app class
export default CascadeApp;