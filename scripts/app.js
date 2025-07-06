// Select DOM elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const doingList = document.getElementById('doing-list');
const doneList = document.getElementById('done-list');

// Select DOM elements for import/export
const importButton = document.getElementById('import-button');
const importFileInput = document.getElementById('import-file');
const exportButton = document.getElementById('export-button');

// Task counters
const todoCount = document.getElementById('todo-count');
const doingCount = document.getElementById('doing-count');
const doneCount = document.getElementById('done-count');

/**
 * Generate a unique ID for tasks
 * @returns {string} Unique identifier
 */
function generateUniqueId() {
    // Use crypto.randomUUID() if available, otherwise fallback to timestamp + random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Retrieve tasks from local storage
 * @returns {Array} List of tasks
 */
function getTasks() {
    try {
        const tasks = JSON.parse(localStorage.getItem('trello-tasks')) || [];
        // Migrate old todos to new format if they exist
        const oldTodos = JSON.parse(localStorage.getItem('todos')) || [];
        if (oldTodos.length > 0 && tasks.length === 0) {
            const migratedTasks = oldTodos.map(todo => ({
                id: generateUniqueId(),
                text: todo.text,
                status: todo.completed ? 'done' : 'todo',
                createdDate: todo.createdDate || new Date().toISOString().split('T')[0]
            }));
            saveTasks(migratedTasks);
            localStorage.removeItem('todos'); // Clean up old data
            return migratedTasks;
        }
        return tasks;
    } catch (error) {
        console.error('Failed to retrieve tasks from localStorage:', error);
        return [];
    }
}

/**
 * Save tasks to local storage
 * @param {Array} tasks - List of tasks to save
 */
function saveTasks(tasks) {
    try {
        localStorage.setItem('trello-tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Failed to save tasks to localStorage:', error);
        showModal('Error', 'Failed to save tasks. Your browser storage might be full.');
    }
}

/**
 * Format a date to a human-friendly format
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const fallbackDate = new Date().toISOString().split('T')[0];
    const [year, month, day] = (dateString || fallbackDate).split('-');
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

/**
 * Create a task card element
 * @param {Object} task - Task object
 * @returns {HTMLElement} Task card element
 */
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card ${task.status} new-task`;
    card.draggable = true;
    card.dataset.taskId = task.id;
    
    card.innerHTML = `
        <div class="task-content">
            <div class="task-text">${sanitizeOutput(task.text)}</div>
            <div class="task-date">Created: ${formatDate(task.createdDate)}</div>
        </div>
        <div class="task-actions">
            <button class="btn-edit" onclick="editTask('${task.id}')">Edit</button>
            <button class="btn-delete" onclick="deleteTask('${task.id}')">Delete</button>
            ${getStatusButtons(task.status, task.id)}
        </div>
    `;
    
    // Add drag event listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    // Remove animation class after animation completes
    setTimeout(() => card.classList.remove('new-task'), 300);
    
    return card;
}

/**
 * Get status change buttons based on current status
 * @param {string} currentStatus - Current task status
 * @param {string} taskId - Task ID
 * @returns {string} HTML for status buttons
 */
function getStatusButtons(currentStatus, taskId) {
    const buttons = [];
    
    if (currentStatus !== 'todo') {
        buttons.push(`<button class="btn-move" onclick="moveTask('${taskId}', 'todo')">→ To-Do</button>`);
    }
    if (currentStatus !== 'doing') {
        buttons.push(`<button class="btn-move" onclick="moveTask('${taskId}', 'doing')">→ Doing</button>`);
    }
    if (currentStatus !== 'done') {
        buttons.push(`<button class="btn-move" onclick="moveTask('${taskId}', 'done')">→ Done</button>`);
    }
    
    return buttons.join('');
}

/**
 * Render all tasks in their respective columns
 */
function renderTasks() {
    const tasks = getTasks();
    
    // Clear all columns
    todoList.innerHTML = '';
    doingList.innerHTML = '';
    doneList.innerHTML = '';
    
    // Sort tasks by creation date (newest first)
    tasks.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    
    // Group tasks by status
    const tasksByStatus = {
        todo: tasks.filter(task => task.status === 'todo'),
        doing: tasks.filter(task => task.status === 'doing'),
        done: tasks.filter(task => task.status === 'done')
    };
    
    // Render tasks in each column
    tasksByStatus.todo.forEach(task => {
        todoList.appendChild(createTaskCard(task));
    });
    
    tasksByStatus.doing.forEach(task => {
        doingList.appendChild(createTaskCard(task));
    });
    
    tasksByStatus.done.forEach(task => {
        doneList.appendChild(createTaskCard(task));
    });
    
    // Add empty state messages
    addEmptyStateIfNeeded(todoList, 'No tasks to do');
    addEmptyStateIfNeeded(doingList, 'No tasks in progress');
    addEmptyStateIfNeeded(doneList, 'No completed tasks');
    
    // Update counters
    updateTaskCounts(tasksByStatus);
}

/**
 * Add empty state message if column is empty
 * @param {HTMLElement} column - Column element
 * @param {string} message - Empty state message
 */
function addEmptyStateIfNeeded(column, message) {
    if (column.children.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = message;
        column.appendChild(emptyState);
    }
}

/**
 * Update task counters
 * @param {Object} tasksByStatus - Tasks grouped by status
 */
function updateTaskCounts(tasksByStatus) {
    todoCount.textContent = tasksByStatus.todo.length;
    doingCount.textContent = tasksByStatus.doing.length;
    doneCount.textContent = tasksByStatus.done.length;
}

/**
 * Add a new task
 * @param {Event} event - Form submission event
 */
function addTask(event) {
    event.preventDefault();
    const text = todoInput.value.trim();

    // Input validation
    if (!text) {
        showModal('Error', 'Task cannot be empty!');
        return;
    }
    if (text.length > 200) {
        showModal('Error', 'Task cannot exceed 200 characters!');
        return;
    }

    const tasks = getTasks();
    const newTask = {
        id: generateUniqueId(),
        text: sanitizeInput(text),
        status: 'todo',
        createdDate: new Date().toISOString().split('T')[0]
    };
    
    tasks.push(newTask);
    saveTasks(tasks);
    renderTasks();
    todoInput.value = '';
}

/**
 * Move task to different status
 * @param {string} taskId - Task ID
 * @param {string} newStatus - New status
 */
function moveTask(taskId, newStatus) {
    const tasks = getTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].status = newStatus;
        saveTasks(tasks);
        renderTasks();
    }
}

/**
 * Edit a task
 * @param {string} taskId - Task ID
 */
function editTask(taskId) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        showModal('Edit Task', 'Edit your task:', true, task.text).then((newText) => {
            if (newText !== null && newText.trim() !== '') {
                if (newText.length > 200) {
                    showModal('Error', 'Task cannot exceed 200 characters!');
                    return;
                }
                task.text = sanitizeInput(newText.trim());
                saveTasks(tasks);
                renderTasks();
            }
        });
    }
}

/**
 * Delete a task
 * @param {string} taskId - Task ID
 */
function deleteTask(taskId) {
    showModal('Confirm Delete', 'Are you sure you want to delete this task?').then((confirmed) => {
        if (confirmed) {
            const tasks = getTasks();
            const filteredTasks = tasks.filter(task => task.id !== taskId);
            saveTasks(filteredTasks);
            renderTasks();
        }
    });
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Sanitize output for display
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeOutput(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || div.innerText || '';
}

/**
 * Handle drag start event
 * @param {Event} e - Drag event
 */
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.target.classList.add('dragging');
}

/**
 * Handle drag end event
 * @param {Event} e - Drag event
 */
function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

/**
 * Handle drag over event
 * @param {Event} e - Drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

/**
 * Handle drag leave event
 * @param {Event} e - Drag event
 */
function handleDragLeave(e) {
    // Only remove drag-over class if we're actually leaving the drop zone
    // and not just moving to a child element
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

/**
 * Handle drop event
 * @param {Event} e - Drop event
 */
function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.currentTarget.dataset.status;
    
    if (taskId && newStatus) {
        moveTask(taskId, newStatus);
    }
}

/**
 * Validate task data structure
 * @param {Object} task - Task object to validate
 * @param {number} index - Task index for error reporting
 * @returns {boolean} True if valid
 */
function validateTask(task, index = 0) {
    const errors = [];
    
    if (!task.text || typeof task.text !== 'string' || task.text.trim().length === 0) {
        errors.push(`Task ${index + 1}: Missing or empty text`);
    }
    
    if (task.text && task.text.length > 200) {
        errors.push(`Task ${index + 1}: Text exceeds 200 characters`);
    }
    
    if (!task.status || !['todo', 'doing', 'done'].includes(task.status)) {
        errors.push(`Task ${index + 1}: Invalid status "${task.status}". Must be "todo", "doing", or "done"`);
    }
    
    if (task.createdDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.createdDate)) {
        errors.push(`Task ${index + 1}: Invalid date format "${task.createdDate}". Expected YYYY-MM-DD`);
    }
    
    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }
    
    return true;
}

/**
 * Import tasks from a JSON file
 * @param {Event} event - File input change event
 */
function importTasks(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedData = JSON.parse(e.target.result);
                let importedTasks = [];
                let importMetadata = null;

                // Handle different import formats
                if (importedData.tasks && Array.isArray(importedData.tasks)) {
                    // New format with metadata
                    importedTasks = importedData.tasks;
                    importMetadata = {
                        version: importedData.version || "1.0",
                        exportDate: importedData.exportDate,
                        totalTasks: importedData.totalTasks,
                        statusCounts: importedData.statusCounts
                    };
                } else if (Array.isArray(importedData)) {
                    // Legacy formats (both old todo format and simple task array)
                    importedTasks = importedData.map(item => {
                        if (item.status && ['todo', 'doing', 'done'].includes(item.status)) {
                            // New format without metadata wrapper
                            return {
                                id: generateUniqueId(),
                                text: item.text,
                                status: item.status,
                                createdDate: item.createdDate || new Date().toISOString().split('T')[0]
                            };
                        } else if (typeof item.completed === 'boolean') {
                            // Old todo format
                            return {
                                id: generateUniqueId(),
                                text: item.text,
                                status: item.completed ? 'done' : 'todo',
                                createdDate: item.createdDate || new Date().toISOString().split('T')[0]
                            };
                        } else {
                            throw new Error('Unrecognized task format.');
                        }
                    });
                } else {
                    throw new Error('Invalid file format. Expected task data.');
                }

                // Validate imported tasks
                importedTasks.forEach((task, index) => {
                    // Ensure required fields exist
                    if (!task.text || typeof task.text !== 'string') {
                        throw new Error(`Task ${index + 1}: Missing or invalid text.`);
                    }
                    if (!task.status || !['todo', 'doing', 'done'].includes(task.status)) {
                        throw new Error(`Task ${index + 1}: Invalid status "${task.status}". Must be "todo", "doing", or "done".`);
                    }
                    
                    // Set defaults for missing fields
                    if (!task.createdDate) {
                        task.createdDate = new Date().toISOString().split('T')[0];
                    }
                    if (!task.id) {
                        task.id = generateUniqueId();
                    }
                    
                    // Validate using the validation function
                    validateTask(task, index);
                });

                // Count imported tasks by status
                const importedStatusCounts = importedTasks.reduce((acc, task) => {
                    acc[task.status] = (acc[task.status] || 0) + 1;
                    return acc;
                }, { todo: 0, doing: 0, done: 0 });

                // Merge with existing tasks
                const existingTasks = getTasks();
                const mergedTasks = [...existingTasks, ...importedTasks];
                saveTasks(mergedTasks);
                renderTasks();

                // Show detailed import confirmation
                let successMessage = `${importedTasks.length} tasks imported successfully!\n\nImported breakdown:\n`;
                successMessage += `Todo: ${importedStatusCounts.todo}, Doing: ${importedStatusCounts.doing}, Done: ${importedStatusCounts.done}`;
                
                if (importMetadata && importMetadata.exportDate) {
                    successMessage += `\n\nOriginal export: ${new Date(importMetadata.exportDate).toLocaleDateString()}`;
                }

                showModal('Import Successful', successMessage);
            } catch (error) {
                console.error('Import error:', error);
                showModal('Import Failed', `Error: ${error.message}\n\nPlease check that your file contains valid task data with proper status values (todo, doing, done).`);
            }
        };
        reader.readAsText(file);
    } else {
        showModal('Invalid File', 'Please upload a valid JSON file.');
    }
    
    // Reset file input
    event.target.value = '';
}

/**
 * Show export preview with current status distribution
 */
function showExportPreview() {
    const tasks = getTasks();
    
    if (tasks.length === 0) {
        showModal('No Tasks', 'You have no tasks to export. Add some tasks first!');
        return;
    }
    
    const statusCounts = {
        todo: tasks.filter(t => t.status === 'todo').length,
        doing: tasks.filter(t => t.status === 'doing').length,
        done: tasks.filter(t => t.status === 'done').length
    };
    
    const previewMessage = `Ready to export ${tasks.length} tasks:\n\n` +
                          `📋 To-Do: ${statusCounts.todo} tasks\n` +
                          `⚡ Doing: ${statusCounts.doing} tasks\n` +
                          `✅ Done: ${statusCounts.done} tasks\n\n` +
                          `All task statuses will be preserved in the export file.`;
    
    showModal('Export Preview', previewMessage).then((confirmed) => {
        if (confirmed) {
            performExport();
        }
    });
}

/**
 * Perform the actual export (separated from preview)
 */
function performExport() {
    const tasks = getTasks();
    
    // Create export data with metadata
    const exportData = {
        exportDate: new Date().toISOString(),
        version: "2.0",
        totalTasks: tasks.length,
        statusCounts: {
            todo: tasks.filter(t => t.status === 'todo').length,
            doing: tasks.filter(t => t.status === 'doing').length,
            done: tasks.filter(t => t.status === 'done').length
        },
        tasks: tasks
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `trello-tasks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    
    // Show detailed export confirmation
    const statusSummary = `📋 Todo: ${exportData.statusCounts.todo}, ⚡ Doing: ${exportData.statusCounts.doing}, ✅ Done: ${exportData.statusCounts.done}`;
    showModal('Export Complete', `${exportData.totalTasks} tasks exported successfully!\n\n${statusSummary}\n\nFile saved with all task statuses preserved.`);
}

/**
 * Export tasks to a JSON file (updated to use preview)
 */
function exportTasks() {
    showExportPreview();
}

/**
 * Show a custom modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {boolean} showInput - Whether to show an input field
 * @param {string} defaultValue - Default input value
 * @returns {Promise<string|boolean|null>} Resolves with input value, true, or null if canceled
 */
function showModal(title, message, showInput = false, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalInput = document.getElementById('modal-input');
        const modalConfirm = document.getElementById('modal-confirm');
        const modalCancel = document.getElementById('modal-cancel');

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalInput.style.display = showInput ? 'block' : 'none';
        modalInput.value = defaultValue;
        modal.style.display = 'flex';

        // Focus input if shown
        if (showInput) {
            setTimeout(() => modalInput.focus(), 100);
        }

        const closeModal = (result) => {
            modal.style.display = 'none';
            modalConfirm.onclick = null;
            modalCancel.onclick = null;
            resolve(result);
        };

        modalConfirm.onclick = () => {
            closeModal(showInput ? modalInput.value.trim() : true);
        };

        modalCancel.onclick = () => {
            closeModal(null);
        };

        // Handle Enter key in input
        if (showInput) {
            modalInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    closeModal(modalInput.value.trim());
                }
            };
        }
    });
}

// Set up drag and drop event listeners for columns
[todoList, doingList, doneList].forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
});

// Event listeners
todoForm.addEventListener('submit', addTask);
importButton.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importTasks);
exportButton.addEventListener('click', exportTasks);

// Make functions globally available for onclick handlers
window.moveTask = moveTask;
window.editTask = editTask;
window.deleteTask = deleteTask;

// Initial render
renderTasks();