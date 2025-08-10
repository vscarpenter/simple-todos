/**
 * CascadeApp - Simplified application controller using extracted services
 * Refactored from 3,606-line god class to focused orchestrator
 */

import eventBus from '../eventBus.js';
import { AppState } from '../state.js';
import storage from '../storage.js';
import { settingsManager } from '../settings.js';
import domManager from '../dom.js';
import accessibility from '../accessibility.js';
import { Task } from '../models.js';

import { TaskService } from './taskService.js';
import { BoardService } from './boardService.js';
import { UIService } from './uiService.js';

export class CascadeApp {
    constructor() {
        this.state = new AppState();
        this.storage = storage;
        this.dom = domManager;
        this.eventBus = eventBus;
        
        // Services
        this.taskService = new TaskService(this.state, this.storage);
        this.boardService = new BoardService(this.state, this.storage);
        this.uiService = new UIService(this.state, this.dom);
        
        this.initPromise = this.init();
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
            
            // Initialize settings
            await settingsManager.loadSettings();
            
            // Initialize auto-archive (with safety checks)
            this.initAutoArchive();
            
            // Initialize UI and render
            this.uiService.init();
            this.uiService.render();
            this.uiService.renderBoardSelector();
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
            console.log('📂 [LOAD] Loading data from storage...');
            const data = await this.storage.load();
            console.log('📂 [LOAD] Raw storage data:', data);
            
            if (data && data.boards && data.boards.length > 0) {
                console.log('📂 [LOAD] Processing multi-board format...');
                
                // Process boards and tasks
                this.state.setState({
                    boards: data.boards,
                    currentBoardId: data.currentBoardId,
                    tasks: this.state.getTasksForBoard(data.currentBoardId),
                    filter: data.filter || 'all'
                });
                
                console.log('📂 [LOAD] Data loaded successfully');
            } else {
                console.log('📂 [LOAD] No existing data, creating default board');
                await this.boardService.createDefaultBoard();
            }
            
        } catch (error) {
            console.error('Failed to load data:', error);
            // Create default board on error
            await this.boardService.createDefaultBoard();
        }
    }

    /**
     * Setup event listeners for application events
     */
    setupEventListeners() {
        // Task operations
        eventBus.on('task:create', (data) => this.handleCreateTask(data));
        eventBus.on('task:edit', (data) => this.handleEditTask(data));
        eventBus.on('task:edit:requested', (data) => this.handleTaskEditRequested(data));
        eventBus.on('task:delete', (data) => this.handleDeleteTask(data));
        eventBus.on('task:delete:requested', (data) => this.handleTaskDeleteRequested(data));
        eventBus.on('task:move', (data) => this.handleMoveTask(data));
        eventBus.on('task:drop', (data) => this.handleMoveTask(data)); // Handle drag and drop as move
        eventBus.on('task:archive', (data) => this.handleArchiveTask(data));
        eventBus.on('task:restore', (data) => this.handleRestoreTask(data));
        eventBus.on('tasks:archiveCompleted', () => this.handleArchiveCompleted());

        // Board operations
        eventBus.on('board:create', (data) => this.handleCreateBoard(data));
        eventBus.on('board:switch', (data) => this.handleSwitchBoard(data));
        eventBus.on('board:edit', (data) => this.handleEditBoard(data));
        eventBus.on('board:delete', (data) => this.handleDeleteBoard(data));
        eventBus.on('board:duplicate', (data) => this.handleDuplicateBoard(data));
        eventBus.on('boards:manage', () => this.handleManageBoards());

        // Data operations
        eventBus.on('tasks:import', (data) => this.handleImportTasks(data));
        eventBus.on('data:import', (data) => this.handleImportData(data));
        eventBus.on('data:export', () => this.handleExportData());
        eventBus.on('data:reset', () => this.handleResetApp());
        eventBus.on('app:reset', () => this.handleResetApp());

        // UI operations
        eventBus.on('filter:change', (data) => this.handleFilterChange(data));
        eventBus.on('settings:show', () => this.handleShowSettings());
        eventBus.on('archive:browse', () => this.handleBrowseArchive());
        eventBus.on('archive:clearAll', () => this.handleClearAllArchived());

        // Error handling
        eventBus.on('task:error', (data) => this.handleServiceError(data));
        eventBus.on('board:error', (data) => this.handleServiceError(data));
        eventBus.on('ui:error', (data) => this.handleServiceError(data));

        // Auto-save on data changes
        eventBus.on('data:changed', () => this.autoSave());
    }

    /**
     * Handle create task event with error boundary
     */
    async handleCreateTask(data) {
        try {
            const { text } = data;
            const currentBoardId = this.state.getState().currentBoardId;
            
            if (!currentBoardId) {
                this.uiService.showMessage('No active board selected', 'error');
                return;
            }
            
            // Create task using service
            await this.taskService.createTask(text, currentBoardId);
            
            // Clear input and auto-save
            this.dom.clearTaskInput();
            await this.autoSave();
        } catch (error) {
            console.error('❌ Error in handleCreateTask:', error);
            this.handleError('Failed to create task', error, 'Task Creation');
        }
    }

    /**
     * Handle edit task event with error boundary
     */
    async handleEditTask(data) {
        try {
            const { taskId, newText } = data;
            await this.taskService.updateTask(taskId, { text: newText });
            await this.autoSave();
        } catch (error) {
            console.error('❌ Error in handleEditTask:', error);
            this.handleError('Failed to edit task', error, 'Task Edit');
        }
    }

    /**
     * Handle delete task event with error boundary
     */
    async handleDeleteTask(data) {
        try {
            const { taskId } = data;
            await this.taskService.deleteTask(taskId);
            await this.autoSave();
        } catch (error) {
            console.error('❌ Error in handleDeleteTask:', error);
            this.handleError('Failed to delete task', error, 'Task Delete');
        }
    }

    /**
     * Handle move task event
     */
    async handleMoveTask(data) {
        try {
            const { taskId, newStatus, targetStatus } = data;
            const status = newStatus || targetStatus; // Handle both parameter names
            await this.taskService.moveTaskToStatus(taskId, status);
            
        } catch (error) {
            this.handleError('Failed to move task', error);
        }
    }

    /**
     * Handle archive task event
     */
    async handleArchiveTask(data) {
        try {
            const { taskId } = data;
            await this.taskService.archiveTask(taskId);
            
        } catch (error) {
            this.handleError('Failed to archive task', error);
        }
    }

    /**
     * Handle restore task event
     */
    async handleRestoreTask(data) {
        try {
            const { taskId, boardId } = data;
            await this.taskService.restoreTask(taskId, boardId);
            
        } catch (error) {
            this.handleError('Failed to restore task', error);
        }
    }

    /**
     * Handle task edit request (shows edit modal)
     */
    async handleTaskEditRequested(data) {
        try {
            const { taskId, currentText } = data;
            
            // Show edit modal with current text
            const newText = await this.dom.showModal('Edit Task', 'Enter new task text:', {
                showInput: true,
                inputValue: currentText || '',
                confirmText: 'Save Changes',
                cancelText: 'Cancel'
            });
            
            if (newText && newText.trim() && newText.trim() !== currentText) {
                await this.handleEditTask({ taskId, newText: newText.trim() });
                this.uiService.showMessage('Task updated successfully', 'success');
            }
        } catch (error) {
            this.handleError('Failed to edit task', error);
        }
    }

    /**
     * Handle task delete request (shows confirmation modal)
     */
    async handleTaskDeleteRequested(data) {
        try {
            const { taskId } = data;
            
            // Show confirmation modal
            const confirmed = await this.dom.showModal('Delete Task', 'Are you sure you want to delete this task? This action cannot be undone.', {
                showInput: false,
                confirmText: 'Delete',
                cancelText: 'Cancel'
            });
            
            if (confirmed) {
                await this.handleDeleteTask({ taskId });
                this.uiService.showMessage('Task deleted successfully', 'success');
            }
        } catch (error) {
            this.handleError('Failed to delete task', error);
        }
    }

    /**
     * Handle archive completed tasks event
     */
    async handleArchiveCompleted() {
        try {
            const state = this.state.getState();
            const currentBoard = state.boards.find(b => b.id === state.currentBoardId);
            
            if (!currentBoard) {
                this.uiService.showMessage('No active board selected', 'error');
                return;
            }
            
            // Find all completed tasks
            const completedTasks = currentBoard.tasks.filter(task => task.status === 'done');
            
            if (completedTasks.length === 0) {
                this.uiService.showMessage('No completed tasks to archive', 'info');
                return;
            }
            
            // Archive each completed task
            for (const task of completedTasks) {
                await this.taskService.archiveTask(task.id);
            }
            
            this.uiService.showMessage(`Archived ${completedTasks.length} completed task${completedTasks.length === 1 ? '' : 's'}`, 'success');
            
        } catch (error) {
            this.handleError('Failed to archive completed tasks', error);
        }
    }

    /**
     * Handle create board event
     */
    async handleCreateBoard(data) {
        try {
            const { name, description, color } = data;
            await this.boardService.createBoard({ name, description, color });
            
        } catch (error) {
            this.handleError('Failed to create board', error);
        }
    }

    /**
     * Handle switch board event
     */
    async handleSwitchBoard(data) {
        try {
            const { boardId } = data;
            await this.boardService.switchToBoard(boardId);
            
        } catch (error) {
            this.handleError('Failed to switch board', error);
        }
    }

    /**
     * Handle edit board event
     */
    async handleEditBoard(data) {
        try {
            const { boardId, updates } = data;
            await this.boardService.updateBoard(boardId, updates);
            
        } catch (error) {
            this.handleError('Failed to edit board', error);
        }
    }

    /**
     * Handle delete board event
     */
    async handleDeleteBoard(data) {
        try {
            const { boardId } = data;
            await this.boardService.deleteBoard(boardId);
            
        } catch (error) {
            this.handleError('Failed to delete board', error);
        }
    }

    /**
     * Handle duplicate board event
     */
    async handleDuplicateBoard(data) {
        try {
            const { boardId, newName } = data;
            await this.boardService.duplicateBoard(boardId, newName);
            
        } catch (error) {
            this.handleError('Failed to duplicate board', error);
        }
    }

    /**
     * Handle manage boards event - show board management modal
     */
    async handleManageBoards() {
        try {
            const state = this.state.getState();
            const { boards, currentBoardId } = state;
            const currentBoard = boards.find(board => board.id === currentBoardId);
            
            // Show the board management modal via DOM manager
            this.dom.showBoardManagementModal(boards, currentBoard);
            
        } catch (error) {
            this.handleError('Failed to show board management', error);
        }
    }

    /**
     * Handle filter change event
     */
    handleFilterChange(data) {
        try {
            const { filter } = data;
            this.state.setState({ filter });
            eventBus.emit('filter:changed', { filter });
            
        } catch (error) {
            this.handleError('Failed to change filter', error);
        }
    }

    /**
     * Handle show settings event
     */
    handleShowSettings() {
        try {
            // Create settings form HTML content
            const settingsContent = `
                <div class="settings-form">
                    <div class="settings-section">
                        <h6 class="settings-section-title">Application Preferences</h6>
                        <div class="form-group">
                            <label for="theme-select">Theme:</label>
                            <select id="theme-select" class="form-control">
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="auto">Auto (System)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="auto-save-toggle">
                                <input type="checkbox" id="auto-save-toggle" checked> 
                                Auto-save changes
                            </label>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h6 class="settings-section-title">Accessibility</h6>
                        <div class="form-group">
                            <label for="high-contrast-toggle">
                                <input type="checkbox" id="high-contrast-toggle"> 
                                High contrast mode
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="reduced-motion-toggle">
                                <input type="checkbox" id="reduced-motion-toggle"> 
                                Reduce animations
                            </label>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h6 class="settings-section-title">Data Management</h6>
                        <div class="form-group">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="this.closest('.modal-overlay').dispatchEvent(new CustomEvent('export-data'))">
                                📤 Export Data
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('.modal-overlay').dispatchEvent(new CustomEvent('import-data'))">
                                📥 Import Data
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Show the settings modal using the existing modal system
            this.dom.showModal('⚙️ Preferences', settingsContent, {
                showInput: false,
                showCancel: true,
                confirmText: 'Save Settings',
                cancelText: 'Cancel',
                allowHTML: true
            }).then((result) => {
                if (result) {
                    // Save settings when user clicks "Save Settings"
                    this.saveSettingsFromModal();
                }
            });

            // Load current settings into the modal after it's shown
            setTimeout(() => this.loadSettingsIntoModal(), 100);

        } catch (error) {
            this.handleError('Failed to show settings', error);
        }
    }

    /**
     * Load current settings into the settings modal
     */
    loadSettingsIntoModal() {
        try {
            // Load settings from settings module (placeholder - would be implemented)
            const themeSelect = document.getElementById('theme-select');
            const autoSaveToggle = document.getElementById('auto-save-toggle');
            const highContrastToggle = document.getElementById('high-contrast-toggle');
            const reducedMotionToggle = document.getElementById('reduced-motion-toggle');

            // Set current values (placeholder values for now)
            if (themeSelect) {
                themeSelect.value = localStorage.getItem('cascade-theme') || 'light';
            }
            if (autoSaveToggle) {
                autoSaveToggle.checked = localStorage.getItem('cascade-auto-save') !== 'false';
            }
            if (highContrastToggle) {
                highContrastToggle.checked = localStorage.getItem('cascade-high-contrast') === 'true';
            }
            if (reducedMotionToggle) {
                reducedMotionToggle.checked = localStorage.getItem('cascade-reduced-motion') === 'true';
            }
        } catch (error) {
            console.error('Failed to load settings into modal:', error);
        }
    }

    /**
     * Save settings from the modal form
     */
    saveSettingsFromModal() {
        try {
            const themeSelect = document.getElementById('theme-select');
            const autoSaveToggle = document.getElementById('auto-save-toggle');
            const highContrastToggle = document.getElementById('high-contrast-toggle');
            const reducedMotionToggle = document.getElementById('reduced-motion-toggle');

            // Save settings (placeholder - would integrate with settings module)
            if (themeSelect) {
                localStorage.setItem('cascade-theme', themeSelect.value);
                // Apply theme change immediately
                document.documentElement.setAttribute('data-theme', themeSelect.value);
            }
            if (autoSaveToggle) {
                localStorage.setItem('cascade-auto-save', autoSaveToggle.checked.toString());
            }
            if (highContrastToggle) {
                localStorage.setItem('cascade-high-contrast', highContrastToggle.checked.toString());
                document.documentElement.toggleAttribute('data-high-contrast', highContrastToggle.checked);
            }
            if (reducedMotionToggle) {
                localStorage.setItem('cascade-reduced-motion', reducedMotionToggle.checked.toString());
                document.documentElement.toggleAttribute('data-reduced-motion', reducedMotionToggle.checked);
            }

            this.uiService.showMessage('Settings saved successfully', 'success');
        } catch (error) {
            this.handleError('Failed to save settings', error);
        }
    }

    /**
     * Handle browse archive event
     */
    handleBrowseArchive() {
        try {
            const state = this.state.getState();
            const currentBoard = state.boards.find(b => b.id === state.currentBoardId);
            
            if (!currentBoard) {
                this.uiService.showMessage('No active board selected', 'error');
                return;
            }
            
            const archivedTasks = currentBoard.archivedTasks || [];
            this.dom.showArchiveBrowser(archivedTasks, currentBoard.name);
            
        } catch (error) {
            this.handleError('Failed to show archive browser', error);
        }
    }

    /**
     * Handle clear all archived tasks event
     */
    async handleClearAllArchived() {
        try {
            const state = this.state.getState();
            const currentBoard = state.boards.find(b => b.id === state.currentBoardId);
            
            if (!currentBoard) {
                this.uiService.showMessage('No active board selected', 'error');
                return;
            }
            
            const archivedTasks = currentBoard.archivedTasks || [];
            
            if (archivedTasks.length === 0) {
                this.uiService.showMessage('No archived tasks to clear', 'info');
                return;
            }
            
            // Clear all archived tasks
            currentBoard.archivedTasks = [];
            
            // Update state
            this.state.setState({
                boards: state.boards
            });
            
            // Save to storage
            await this.storage.save(this.state.getState());
            
            // Emit data change event
            eventBus.emit('data:changed');
            
            // Close the archive modal
            const archiveModal = document.getElementById('archive-modal');
            if (archiveModal) {
                document.body.removeChild(archiveModal);
            }
            
            this.uiService.showMessage(`Cleared ${archivedTasks.length} archived task${archivedTasks.length === 1 ? '' : 's'}`, 'success');
            
        } catch (error) {
            this.handleError('Failed to clear archived tasks', error);
        }
    }

    /**
     * Handle task import event from DOM
     */
    async handleImportTasks(data) {
        try {
            const { file } = data;
            console.log('📥 Starting task import from file:', file.name);
            
            // Read file content
            const text = await this.readFile(file);
            const importData = JSON.parse(text);
            
            console.log('📥 Parsed import data:', importData);
            
            // Handle different import formats
            if (importData.boards) {
                // Multi-board format
                await this.importMultiBoardData(importData.boards);
            } else if (Array.isArray(importData)) {
                // Legacy array of tasks
                await this.importTaskArray(importData);
            } else if (importData.data && importData.data.boards) {
                // Wrapped format
                await this.importMultiBoardData(importData.data.boards);
            } else {
                throw new Error('Unrecognized import format');
            }
            
            // Refresh UI
            this.uiService.render();
            this.uiService.renderBoardSelector();
            this.uiService.showMessage('Tasks imported successfully', 'success');
            
        } catch (error) {
            console.error('Import failed:', error);
            this.uiService.showMessage(`Import failed: ${error.message}`, 'error');
        }
    }

    /**
     * Import multi-board data
     */
    async importMultiBoardData(boardsData) {
        try {
            console.log(`📥 Importing ${boardsData.length} boards with full structure`);
            
            // Check for existing boards with same names
            const existingBoards = this.state.getState().boards;
            const conflicts = boardsData.filter(importBoard => 
                existingBoards.find(existing => 
                    existing.name.trim().toLowerCase() === importBoard.name?.trim().toLowerCase()
                )
            );
            
            // Ask user what to do with conflicts
            let overwriteMode = 'ask'; // 'ask', 'overwrite', 'skip', 'rename'
            
            if (conflicts.length > 0) {
                const conflictNames = conflicts.map(b => b.name).join(', ');
                const overwriteChoice = await this.dom.showModal(
                    'Import Conflicts Detected', 
                    `The following boards already exist: ${conflictNames}\n\nHow would you like to handle this?`, 
                    {
                        showInput: false,
                        confirmText: 'Overwrite Existing',
                        cancelText: 'Cancel Import',
                        showCancel: true
                    }
                );
                
                if (!overwriteChoice) {
                    this.uiService.showMessage('Import cancelled by user', 'info');
                    return;
                }
                
                overwriteMode = 'overwrite';
            }
            
            // Import each board individually
            let totalTasksImported = 0;
            let boardsImported = 0;
            let boardsSkipped = 0;
            let firstImportedBoard = null;
            
            for (const boardData of boardsData) {
                try {
                    let targetBoard = null;
                    const boardName = boardData.name || `Imported Board ${boardsImported + 1}`;
                    
                    // Check if board already exists
                    const existingBoard = existingBoards.find(b => 
                        b.name.trim().toLowerCase() === boardName.trim().toLowerCase()
                    );
                    
                    if (existingBoard && overwriteMode === 'overwrite') {
                        // Clear existing board's tasks and update it
                        await this.boardService.updateBoard(existingBoard.id, {
                            description: boardData.description || existingBoard.description,
                            color: boardData.color || existingBoard.color,
                            tasks: [], // Clear existing tasks
                            archivedTasks: []
                        });
                        targetBoard = existingBoard;
                        console.log(`📥 Overwriting existing board: ${boardName}`);
                        
                        // Clear tasks from the existing board
                        const currentState = this.state.getState();
                        const boardToUpdate = currentState.boards.find(b => b.id === existingBoard.id);
                        if (boardToUpdate) {
                            boardToUpdate.tasks = [];
                            boardToUpdate.archivedTasks = [];
                            this.state.setState({ boards: currentState.boards });
                        }
                        
                    } else if (!existingBoard) {
                        // Create new board
                        targetBoard = await this.boardService.createBoard({
                            name: boardName,
                            description: boardData.description || '',
                            color: boardData.color || '#6750a4'
                        });
                        console.log(`📥 Created new board: ${boardName}`);
                    } else {
                        // Skip this board
                        console.log(`📥 Skipping existing board: ${boardName}`);
                        boardsSkipped++;
                        continue;
                    }
                    
                    // Remember the first imported board
                    if (boardsImported === 0) {
                        firstImportedBoard = targetBoard;
                    }
                    
                    // Import tasks to this specific board
                    if (boardData.tasks && Array.isArray(boardData.tasks)) {
                        for (const taskData of boardData.tasks) {
                            try {
                                const taskText = taskData.text || 'Imported Task';
                                await this.taskService.createTask(taskText, targetBoard.id);
                                totalTasksImported++;
                            } catch (taskError) {
                                console.warn('Failed to import task:', taskData, taskError);
                            }
                        }
                        console.log(`📥 Imported ${boardData.tasks.length} tasks to ${boardName}`);
                    }
                    
                    boardsImported++;
                    
                } catch (boardError) {
                    console.warn('Failed to import board:', boardData, boardError);
                }
            }
            
            const summary = [];
            if (boardsImported > 0) summary.push(`${boardsImported} boards imported`);
            if (boardsSkipped > 0) summary.push(`${boardsSkipped} boards skipped`);
            if (totalTasksImported > 0) summary.push(`${totalTasksImported} tasks imported`);
            
            console.log(`📥 Import complete: ${summary.join(', ')}`);
            
            // Switch to the first imported board and sync its tasks
            if (firstImportedBoard) {
                await this.boardService.switchToBoard(firstImportedBoard.id);
                console.log(`📥 Switched to first imported board: ${firstImportedBoard.name}`);
            }
            
        } catch (error) {
            console.error('Multi-board import failed:', error);
            throw error;
        }
    }

    /**
     * Import array of tasks to current board
     */
    async importTaskArray(tasksData) {
        try {
            const currentBoardId = this.state.getState().currentBoardId;
            if (!currentBoardId) {
                throw new Error('No active board to import tasks to');
            }
            
            let importCount = 0;
            
            for (const taskData of tasksData) {
                try {
                    // Create task with unique text to avoid duplicates
                    const baseText = taskData.text || 'Imported Task';
                    let uniqueText = baseText;
                    let counter = 1;
                    
                    // Ensure unique text
                    const boards = this.state.getState().boards;
                    const currentBoard = boards.find(b => b.id === currentBoardId);
                    
                    while (currentBoard.tasks && currentBoard.tasks.some(t => t.text === uniqueText)) {
                        uniqueText = `${baseText} (${counter})`;
                        counter++;
                    }
                    
                    await this.taskService.createTask(uniqueText, currentBoardId);
                    importCount++;
                    
                } catch (taskError) {
                    console.warn('Failed to import task:', taskData, taskError);
                }
            }
            
            console.log(`📥 Successfully imported ${importCount} tasks`);
            return importCount;
            
        } catch (error) {
            console.error('Task array import failed:', error);
            throw error;
        }
    }

    /**
     * Read file content as text
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    /**
     * Handle data import event
     */
    async handleImportData(data) {
        try {
            // Basic validation - delegate detailed import to services
            const { fileData, importType } = data;
            
            if (importType === 'tasks') {
                // Import tasks to current board
                const currentBoardId = this.state.getState().currentBoardId;
                // Implementation would delegate to task service
                this.uiService.showMessage('Import functionality delegated to services', 'info');
            } else if (importType === 'boards') {
                // Import entire board structure
                // Implementation would delegate to board service
                this.uiService.showMessage('Board import functionality delegated to services', 'info');
            }
            
        } catch (error) {
            this.handleError('Failed to import data', error);
        }
    }

    /**
     * Handle data export event
     */
    async handleExportData() {
        try {
            const { boards } = this.state.getState();
            
            if (!boards || boards.length === 0) {
                this.uiService.showMessage('No data to export', 'warning');
                return;
            }

            const exportData = {
                version: '2.0.0',
                exportDate: new Date().toISOString(),
                boards: boards
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cascade-tasks-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.uiService.showMessage('Data exported successfully', 'success');
            
        } catch (error) {
            this.handleError('Failed to export data', error);
        }
    }

    /**
     * Handle reset app event
     */
    async handleResetApp() {
        try {
            const confirmed = confirm('This will permanently delete all your tasks and boards. Continue?');
            if (!confirmed) return;

            console.log('🧹 Starting app reset...');

            // Clear storage first
            await this.storage.clear();
            console.log('🧹 Storage cleared');

            // Clear application state
            this.state.setState({
                boards: [],
                currentBoardId: null,
                tasks: [],
                filter: 'all',
                history: [],
                historyIndex: -1
            });
            console.log('🧹 State cleared');

            // Create fresh default board
            await this.boardService.createDefaultBoard();
            console.log('🧹 Default board created');
            
            // Re-render UI completely
            this.uiService.render();
            this.uiService.renderBoardSelector();
            
            this.uiService.showMessage('Application reset successfully - all data cleared', 'info');
            console.log('🧹 App reset complete');
            
        } catch (error) {
            console.error('Reset failed:', error);
            this.handleError('Failed to reset application', error);
        }
    }


    /**
     * Handle service errors
     */
    handleServiceError(data) {
        const { operation, error } = data;
        console.error(`Service error in ${operation}:`, error);
        this.uiService.showMessage(`Operation failed: ${error}`, 'error');
    }

    /**
     * Auto-save data to storage with enhanced error handling
     */
    async autoSave() {
        try {
            await this.storage.save(this.state.getState());
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            this.handleError('Failed to save data', error, 'Auto Save');
        }
    }

    /**
     * Initialize auto-archive functionality
     */
    initAutoArchive() {
        const settings = settingsManager.get();
        if (settings.enableAutoArchive) {
            // Set up auto-archive interval
        }
    }

    /**
     * Generic error handler
     */
    handleError(message, error, context = 'default') {
        console.error(`[${context}] ${message}:`, error);
        
        // Show user-friendly error message
        const userMessage = error.message || message;
        this.uiService.showMessage(userMessage, 'error');
        
        // Emit error event for other handlers
        eventBus.emit('app:error', { message, error, context });
    }

    /**
     * Get current application state (for debugging)
     */
    getState() {
        return this.state.getState();
    }

    /**
     * Get current tasks (for debugging)
     */
    getTasks() {
        const state = this.state.getState();
        const currentBoardId = state.currentBoardId;
        
        // Return tasks from state or get from current board
        if (state.tasks && state.tasks.length > 0) {
            return state.tasks;
        }
        
        if (currentBoardId) {
            const currentBoard = state.boards.find(b => b.id === currentBoardId);
            if (currentBoard && currentBoard.tasks) {
                return currentBoard.tasks.map(t => new Task(t));
            }
        }
        
        return [];
    }

    /**
     * Create task (simplified interface)
     */
    async createTask(text) {
        const currentBoardId = this.state.getState().currentBoardId;
        if (!currentBoardId) {
            throw new Error('No active board');
        }
        return await this.taskService.createTask(text, currentBoardId);
    }

    /**
     * Focus input (for keyboard shortcuts)
     */
    focusInput() {
        this.uiService.focusTaskInput();
    }
}

