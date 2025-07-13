import eventBus from './eventBus.js';
import appState from './state.js';
import storage from './storage.js';
import domManager from './dom.js';
import accessibility from './accessibility.js';
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
                        name: 'Personal Tasks',
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
            name: 'Personal Tasks',
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
            
            // Create new task
            const newTask = createTask({ text });
            const currentTasks = this.state.get('tasks');
            
            // Add to current board
            const currentBoardId = this.state.get('currentBoardId');
            if (currentBoardId) {
                const boards = this.state.get('boards');
                const updatedBoards = boards.map(board => {
                    if (board.id === currentBoardId) {
                        const updatedTasks = [...(board.tasks || []), newTask.toJSON()];
                        return new Board({ ...board.toJSON(), tasks: updatedTasks });
                    }
                    return board;
                });
                
                this.state.setState({
                    boards: updatedBoards,
                    tasks: [...currentTasks, newTask]
                });
            } else {
                // Fallback for legacy mode
                this.state.setState({
                    tasks: [...currentTasks, newTask]
                });
            }
            
            // Clear input
            this.dom.clearTaskInput();
            
            eventBus.emit('task:created', { task: newTask });
            
        } catch (error) {
            console.error('Failed to create task:', error);
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
            
            if (!['todo', 'doing', 'done'].includes(targetStatus)) {
                console.error('Invalid target status:', targetStatus);
                return;
            }
            
            const tasks = this.state.get('tasks');
            const updatedTasks = tasks.map(task => {
                if (task.id === taskId) {
                    return task.moveTo(targetStatus);
                }
                return task;
            });
            
            this.updateCurrentBoardTasks(updatedTasks);
            
            eventBus.emit('task:moved', { 
                taskId, 
                targetStatus,
                task: updatedTasks.find(t => t.id === taskId)
            });
            
        } catch (error) {
            console.error('Failed to move task:', error);
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
        this.dom.showModal('Settings', 'Settings functionality coming soon!', {
            showCancel: false
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
     * Handle edit board
     * @param {Object} data - Event data
     */
    async handleEditBoard(data) {
        try {
            const { boardId } = data;
            const board = this.state.get('boards').find(b => b.id === boardId);
            
            if (!board) {
                this.dom.showModal('Error', 'Board not found');
                return;
            }
            
            const newName = await this.dom.showModal('Edit Board', 'Enter new board name:', {
                showInput: true,
                inputValue: board.name
            });
            
            if (newName && newName !== board.name) {
                if (newName.length > 50) {
                    this.dom.showModal('Error', 'Board name cannot exceed 50 characters');
                    return;
                }
                
                this.state.updateBoard(boardId, { name: newName });
                this.saveData();
                eventBus.emit('board:edited', { boardId, name: newName });
            }
        } catch (error) {
            console.error('Failed to edit board:', error);
            this.handleError('Failed to edit board', error);
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
     * Handle manage boards - show board management interface
     */
    async handleManageBoards() {
        try {
            const boards = this.state.get('boards') || [];
            const currentBoardId = this.state.get('currentBoardId');
            
            if (boards.length === 0) {
                this.dom.showModal('No Boards', 'No boards found.', { showCancel: false });
                return;
            }
            
            // Test custom modal system with simple choice
            const action = await this.dom.showModal(
                'Manage Boards',
                'Choose an action:',
                {
                    confirmText: 'Rename a Board',
                    cancelText: 'Delete a Board'
                }
            );
            
            
            if (action) {
                // Show rename interface
                await this.showBoardRenameInterface(boards);
            } else if (action === null) {
                // Show delete interface
                await this.showBoardDeleteInterface(boards);
            }
            
        } catch (error) {
            console.error('Failed to manage boards:', error);
            this.handleError('Failed to manage boards', error);
        }
    }

    /**
     * Custom modal board rename interface
     */
    async showBoardRenameInterface(boards) {
        if (boards.length === 1) {
            await this.renameSingleBoard(boards[0]);
        } else {
            await this.showBoardSelectionForRename(boards);
        }
    }

    /**
     * Custom modal board delete interface  
     */
    async showBoardDeleteInterface(boards) {
        const deletableBoards = boards.filter(board => !board.isDefault);
        
        if (deletableBoards.length === 0) {
            await this.dom.showModal('Cannot Delete', 
                'No boards can be deleted. The default board cannot be removed.',
                { showCancel: false }
            );
            return;
        }
        
        if (boards.length <= 1) {
            await this.dom.showModal('Cannot Delete', 
                'You must have at least one board.',
                { showCancel: false }
            );
            return;
        }
        
        if (deletableBoards.length === 1) {
            const board = deletableBoards[0];
            const taskCount = board.tasks ? board.tasks.length : 0;
            const confirmed = await this.dom.showModal(
                'Confirm Delete',
                `Delete "${board.name}"? This will remove ${taskCount} tasks and cannot be undone.`
            );
            
            if (confirmed) {
                eventBus.emit('board:delete', { boardId: board.id });
            }
        } else {
            await this.showBoardSelectionForDelete(deletableBoards);
        }
    }


    /**
     * Show board rename interface
     */
    async showBoardRenameInterface(boards) {
        // If only one board, rename it directly
        if (boards.length === 1) {
            await this.renameSingleBoard(boards[0]);
            return;
        }
        
        // Multiple boards - let user choose which one to rename
        const currentBoardId = this.state.get('currentBoardId');
        const currentBoard = boards.find(b => b.id === currentBoardId);
        
        // Offer to rename current board or show selection
        const renameCurrentBoard = await this.dom.showModal(
            'Rename Board',
            `Rename current board "${currentBoard?.name || 'Unknown'}"?`,
            {
                confirmText: 'Yes, Rename Current',
                cancelText: 'Choose Different Board'
            }
        );
        
        if (renameCurrentBoard) {
            await this.renameSingleBoard(currentBoard);
        } else {
            // Show selection of all boards
            await this.showBoardSelectionForRename(boards);
        }
    }

    /**
     * Show board delete interface
     */
    async showBoardDeleteInterface(boards) {
        // Filter out boards that cannot be deleted
        const deletableBoards = boards.filter(board => !board.isDefault);
        
        if (deletableBoards.length === 0) {
            this.dom.showModal('Cannot Delete', 
                'No boards can be deleted. The default board cannot be removed.',
                { showCancel: false }
            );
            return;
        }
        
        if (boards.length <= 1) {
            this.dom.showModal('Cannot Delete', 
                'You must have at least one board.',
                { showCancel: false }
            );
            return;
        }
        
        // If only one deletable board, delete it directly
        if (deletableBoards.length === 1) {
            const taskCount = deletableBoards[0].tasks ? deletableBoards[0].tasks.length : 0;
            const confirmed = await this.dom.showModal(
                'Delete Board',
                `Delete "${deletableBoards[0].name}"? This will remove ${taskCount} tasks and cannot be undone.`
            );
            
            if (confirmed) {
                eventBus.emit('board:delete', { boardId: deletableBoards[0].id });
            }
            return;
        }
        
        // Multiple deletable boards - show selection
        await this.showBoardSelectionForDelete(deletableBoards);
    }

    /**
     * Rename a single board
     */
    async renameSingleBoard(board) {
        const newName = await this.dom.showModal(
            'Rename Board',
            `Enter new name for "${board.name}":`,
            {
                showInput: true,
                inputValue: board.name,
                confirmText: 'Rename'
            }
        );
        
        if (newName && newName.trim() !== board.name) {
            if (newName.trim().length > 50) {
                this.dom.showModal('Error', 'Board name cannot exceed 50 characters', { showCancel: false });
                return;
            }
            
            this.state.updateBoard(board.id, { name: newName.trim() });
            this.saveData();
            this.dom.showModal('Success', 
                `Board renamed to "${newName.trim()}" successfully!`, 
                { showCancel: false }
            );
            eventBus.emit('board:edited', { boardId: board.id, name: newName.trim() });
        }
    }

    /**
     * Show board selection for rename
     */
    async showBoardSelectionForRename(boards) {
        for (let i = 0; i < boards.length; i++) {
            const board = boards[i];
            const taskCount = board.tasks ? board.tasks.length : 0;
            const isDefault = board.isDefault ? ' (Default)' : '';
            
            const shouldRename = await this.dom.showModal(
                'Select Board to Rename',
                `Rename "${board.name}${isDefault}"? (${taskCount} tasks)`,
                {
                    confirmText: 'Rename This Board',
                    cancelText: i < boards.length - 1 ? 'Next Board' : 'Cancel'
                }
            );
            
            if (shouldRename) {
                await this.renameSingleBoard(board);
                return;
            }
        }
    }

    /**
     * Show board selection for delete
     */
    async showBoardSelectionForDelete(deletableBoards) {
        for (let i = 0; i < deletableBoards.length; i++) {
            const board = deletableBoards[i];
            const taskCount = board.tasks ? board.tasks.length : 0;
            
            const shouldDelete = await this.dom.showModal(
                'Select Board to Delete',
                `Delete "${board.name}"? This will remove ${taskCount} tasks and cannot be undone.`,
                {
                    confirmText: 'Delete This Board',
                    cancelText: i < deletableBoards.length - 1 ? 'Next Board' : 'Cancel'
                }
            );
            
            if (shouldDelete) {
                eventBus.emit('board:delete', { boardId: board.id });
                return;
            }
        }
    }

    // Utility Methods

    /**
     * Validate import data
     * @param {*} data - Data to validate
     * @returns {Object} Validation result with type and data
     */
    validateImportData(data) {
        try {
            // Check for new multi-board format
            if (data.data && data.data.boards && Array.isArray(data.data.boards)) {
                const boards = data.data.boards.filter(board => {
                    return board.id && board.name && typeof board.name === 'string';
                });
                
                if (boards.length > 0) {
                    return {
                        isValid: true,
                        type: 'multi-board',
                        boards: boards,
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
            } else {
                return {
                    isValid: false,
                    error: 'Invalid data format - no recognizable structure found'
                };
            }
            
            const validTasks = tasksArray.map(item => {
                try {
                    // Handle legacy format
                    if (typeof item.completed === 'boolean') {
                        return {
                            text: item.text,
                            status: item.completed ? 'done' : 'todo',
                            createdDate: item.createdDate || new Date().toISOString().split('T')[0]
                        };
                    }
                    
                    // Handle current format
                    if (item.text && ['todo', 'doing', 'done'].includes(item.status)) {
                        return {
                            text: item.text,
                            status: item.status,
                            createdDate: item.createdDate || new Date().toISOString().split('T')[0]
                        };
                    }
                    
                    return null;
                } catch {
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
            let importedBoards = []; // Declare at function scope
            
            if (mergeMode) {
                // Merge with existing boards
                const existingBoards = this.state.get('boards') || [];
                const existingBoardMap = new Map(existingBoards.map(b => [b.id, b]));
                
                // Process imported boards, handling duplicates intelligently
                const updatedExistingBoards = [...existingBoards];
                
                for (const boardData of boardsToImport) {
                    totalTaskCount += boardData.tasks ? boardData.tasks.length : 0;
                    
                    // Check for existing board by ID first, then by name (for default boards)
                    let existingBoard = existingBoardMap.get(boardData.id);
                    let duplicateByName = false;
                    
                    // If no ID match, check for default board names that should be merged
                    if (!existingBoard) {
                        const defaultBoardNames = ['Personal Tasks', 'Main Board'];
                        if (defaultBoardNames.includes(boardData.name)) {
                            existingBoard = updatedExistingBoards.find(b => 
                                defaultBoardNames.includes(b.name) && 
                                (b.isDefault || defaultBoardNames.includes(b.name))
                            );
                            duplicateByName = true;
                        }
                    }
                    
                    if (existingBoard) {
                        // Check if boards are actually the same (same name or default boards)
                        const isSameBoard = existingBoard.name === boardData.name || 
                                          (duplicateByName && ['Personal Tasks', 'Main Board'].includes(boardData.name));
                        
                        if (isSameBoard) {
                            // For default boards, automatically merge tasks without asking
                            if (['Personal Tasks', 'Main Board'].includes(boardData.name) && 
                                ['Personal Tasks', 'Main Board'].includes(existingBoard.name)) {
                                
                                // Merge tasks into existing default board
                                const existingTasks = existingBoard.tasks || [];
                                const newTasks = boardData.tasks || [];
                                const mergedTasks = [...existingTasks, ...newTasks];
                                
                                // Update the existing board in the array
                                const boardIndex = updatedExistingBoards.findIndex(b => 
                                    b.id === existingBoard.id || 
                                    (b.isDefault && ['Personal Tasks', 'Main Board'].includes(b.name))
                                );
                                if (boardIndex !== -1) {
                                    updatedExistingBoards[boardIndex] = new Board({
                                        ...existingBoard.toJSON(),
                                        tasks: mergedTasks,
                                        lastModified: new Date().toISOString()
                                    });
                                }
                            } else {
                                // Ask user what to do with duplicate board
                                const action = await this.dom.showModal(
                                    'Duplicate Board Found',
                                    `Board "${boardData.name}" already exists. What would you like to do?`,
                                    {
                                        confirmText: 'Merge Tasks',
                                        cancelText: 'Skip Board'
                                    }
                                );
                                
                                if (action) {
                                    // Merge tasks into existing board
                                    const existingTasks = existingBoard.tasks || [];
                                    const newTasks = boardData.tasks || [];
                                    const mergedTasks = [...existingTasks, ...newTasks];
                                    
                                    // Update the existing board in the array
                                    const boardIndex = updatedExistingBoards.findIndex(b => b.id === existingBoard.id);
                                    if (boardIndex !== -1) {
                                        updatedExistingBoards[boardIndex] = new Board({
                                            ...existingBoard.toJSON(),
                                            tasks: mergedTasks,
                                            lastModified: new Date().toISOString()
                                        });
                                    }
                                }
                                // If action is false (Skip Board), we don't add anything
                            }
                        } else {
                            // Different board with same ID - create new board with unique ID
                            const newBoardData = {
                                ...boardData,
                                id: generateUniqueId(),
                                name: `${boardData.name} (Imported)`
                            };
                            importedBoards.push(new Board(newBoardData));
                        }
                    } else {
                        // No conflict - add the board as-is
                        importedBoards.push(new Board(boardData));
                    }
                }
                
                finalBoards = [...updatedExistingBoards, ...importedBoards];
            } else {
                // Replace all data
                const confirmed = await this.dom.showModal(
                    'Confirm Replace',
                    'This will replace ALL your existing boards and tasks. This cannot be undone. Are you sure?'
                );
                
                if (!confirmed) return;
                
                finalBoards = boardsToImport.map(boardData => {
                    totalTaskCount += boardData.tasks ? boardData.tasks.length : 0;
                    return new Board(boardData);
                });
            }
            
            // Update state
            this.state.setState({
                boards: finalBoards,
                currentBoardId: finalBoards.length > 0 ? finalBoards[0].id : null,
                tasks: finalBoards.length > 0 ? (finalBoards[0].tasks || []).map(t => new Task(t)) : []
            });
            
            // Save data to persist changes
            this.saveData();
            
            // Re-render UI to reflect changes
            this.render();
            this.renderBoardSelector();
            
            // Count actual boards added/updated  
            const newBoardsAdded = mergeMode ? importedBoards.length : finalBoards.length;
            
            const successMessage = mergeMode ?
                `Successfully merged data! Added ${newBoardsAdded} new boards and updated existing ones. Total tasks: ${totalTaskCount}` :
                `Successfully imported ${boardsToImport.length} boards with ${totalTaskCount} tasks!`;
            
            this.dom.showModal('Success', successMessage, { showCancel: false });
            
            eventBus.emit('boards:imported', { 
                count: boardsToImport.length, 
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
}

// Export the main app class
export default CascadeApp;