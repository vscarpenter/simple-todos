import eventBus from './eventBus.js';
import appState from './state.js';
import storage from './storage.js';
import domManager from './dom.js';
import { Task, createTask } from './models.js';

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
            
            if (data && data.tasks) {
                // Convert plain objects to Task instances
                const tasks = data.tasks.map(taskData => new Task(taskData));
                
                // Set initial state
                this.state.setState({
                    tasks,
                    filter: data.filter || 'all'
                }, { addToHistory: false });
                
                eventBus.emit('data:loaded', { taskCount: tasks.length });
            } else {
                // No data found, start with empty state
                this.state.setState({
                    tasks: [],
                    filter: 'all'
                }, { addToHistory: false });
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            this.handleError('Failed to load saved data', error);
        }
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

        // Storage events
        eventBus.on('storage:error', this.handleStorageError.bind(this));
    }

    /**
     * Save current state to storage
     */
    saveData() {
        try {
            const tasks = this.state.get('tasks');
            const filter = this.state.get('filter');
            
            const data = {
                tasks: tasks.map(task => task.toJSON()),
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
            
            // Add to state
            this.state.setState({
                tasks: [...currentTasks, newTask]
            });
            
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
                
                this.state.setState({ tasks: updatedTasks });
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
                
                this.state.setState({ tasks: updatedTasks });
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
            
            this.state.setState({ tasks: updatedTasks });
            
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
            
            const text = await this.readFile(file);
            const importData = JSON.parse(text);
            
            // Validate and process import data
            const tasksToImport = this.validateImportData(importData);
            
            if (tasksToImport.length === 0) {
                this.dom.showModal('Error', 'No valid tasks found in the import file');
                return;
            }
            
            const confirmed = await this.dom.showModal(
                'Import Tasks',
                `Import ${tasksToImport.length} tasks? This will add them to your existing tasks.`
            );
            
            if (confirmed) {
                const currentTasks = this.state.get('tasks');
                const newTasks = tasksToImport.map(taskData => createTask(taskData));
                
                this.state.setState({
                    tasks: [...currentTasks, ...newTasks]
                });
                
                this.dom.showModal('Success', 
                    `Successfully imported ${newTasks.length} tasks!`,
                    { showCancel: false }
                );
                
                eventBus.emit('tasks:imported', { count: newTasks.length });
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            this.dom.showModal('Error', 'Failed to import tasks. Please check the file format.');
        }
    }

    /**
     * Handle export tasks
     */
    handleExportTasks() {
        try {
            const tasks = this.state.get('tasks');
            
            if (tasks.length === 0) {
                this.dom.showModal('Info', 'No tasks to export');
                return;
            }
            
            const exportData = this.storage.exportData();
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cascade-tasks-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            eventBus.emit('tasks:exported', { count: tasks.length });
            
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
                
                this.state.setState({ tasks: remainingTasks });
                
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

    // Utility Methods

    /**
     * Validate import data
     * @param {*} data - Data to validate
     * @returns {Array} Valid task data
     */
    validateImportData(data) {
        let tasksArray = [];
        
        if (Array.isArray(data)) {
            tasksArray = data;
        } else if (data.data && Array.isArray(data.data)) {
            tasksArray = data.data;
        } else if (data.tasks && Array.isArray(data.tasks)) {
            tasksArray = data.tasks;
        } else {
            throw new Error('Invalid data format');
        }
        
        return tasksArray.filter(item => {
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
        console.error(message, error);
        
        if (this.dom && this.dom.showModal) {
            this.dom.showModal('Error', message, { showCancel: false });
        } else {
            alert(`${message}: ${error.message}`);
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