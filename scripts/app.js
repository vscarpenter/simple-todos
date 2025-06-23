// Select DOM elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const sortTasksHeading = document.getElementById('sort-tasks');
const sortDateHeading = document.getElementById('sort-date');

let sortBy = 'date'; // Default sorting criteria

// Select DOM elements for import/export
const importButton = document.getElementById('import-button');
const importFileInput = document.getElementById('import-file');
const exportButton = document.getElementById('export-button');

/**
 * Retrieve todos from local storage
 * @returns {Array} List of todos
 */
function getTodos() {
    return JSON.parse(localStorage.getItem('todos')) || [];
}

/**
 * Save todos to local storage
 * @param {Array} todos - List of todos to save
 */
function saveTodos(todos) {
    localStorage.setItem('todos', JSON.stringify(todos));
}

/**
 * Format a date to a human-friendly format
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    // Use a fallback date if dateString is undefined or null
    const fallbackDate = '2025-05-17';
    const [year, month, day] = (dateString || fallbackDate).split('-');
    const date = new Date(year, month - 1, day); // Month is 0-indexed in JavaScript Date
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

/**
 * Render todos in the list
 */
function renderTodos() {
    const todos = getTodos();

    // Sort todos based on the selected criteria
    todos.sort((a, b) => {
        if (sortBy === 'date') {
            return new Date(a.createdDate) - new Date(b.createdDate);
        } else if (sortBy === 'text') {
            return a.text.localeCompare(b.text);
        }
    });

    todoList.innerHTML = ''; // Clear existing items

    todos.forEach((todo, index) => {
        const tr = document.createElement('tr');

        // Task column
        const taskTd = document.createElement('td');
        taskTd.textContent = todo.text;
        taskTd.className = todo.completed ? 'completed todo-text' : 'todo-text';

        // Date column
        const dateTd = document.createElement('td');
        dateTd.textContent = formatDate(todo.createdDate); // Format the date
        dateTd.className = 'todo-date';

        // Action column
        const actionTd = document.createElement('td');
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'btn-group';

        const completeButton = createButton('Complete', 'btn btn-success rounded-pill me-2', () => toggleComplete(index));
        const deleteButton = createButton('Delete', 'btn btn-danger rounded-pill me-2', () => deleteTodo(index));
        const editButton = createButton('Edit', 'btn btn-warning rounded-pill me-2', () => editTodo(index));

        buttonGroup.appendChild(editButton);
        buttonGroup.appendChild(completeButton);
        buttonGroup.appendChild(deleteButton);
        actionTd.appendChild(buttonGroup);

        // Append columns to the row
        tr.appendChild(taskTd);
        tr.appendChild(dateTd);
        tr.appendChild(actionTd);

        // Append the row to the table body
        todoList.appendChild(tr);
    });
}

/**
 * Create a button element
 * @param {string} text - Button text
 * @param {string} className - Button CSS classes
 * @param {Function} onClick - Click event handler
 * @returns {HTMLButtonElement} The created button
 */
function createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = className;
    button.addEventListener('click', onClick);
    return button;
}

/**
 * Add a new todo
 * @param {Event} event - Form submission event
 */
function addTodo(event) {
    event.preventDefault();
    const text = todoInput.value.trim();
    if (text) {
        const todos = getTodos();
        const createdDate = new Date().toISOString().split('T')[0]; // Default to today's date
        todos.push({ text, completed: false, createdDate: createdDate || '2025-05-17' });
        saveTodos(todos);
        renderTodos();
        todoInput.value = ''; // Clear input
    }
}

/**
 * Toggle completion status of a todo
 * @param {number} index - Index of the todo to toggle
 */
function toggleComplete(index) {
    const todos = getTodos();
    todos[index].completed = !todos[index].completed; // Toggle the completed status
    saveTodos(todos); // Save updated todos to local storage
    renderTodos(); // Re-render the todo list
}

/**
 * Delete a todo
 * @param {number} index - Index of the todo to delete
 */
function deleteTodo(index) {
    const todos = getTodos();
    todos.splice(index, 1);
    saveTodos(todos);
    renderTodos();
}

/**
 * Edit a todo
 * @param {number} index - Index of the todo to edit
 */
function editTodo(index) {
    const todos = getTodos();
    const newText = prompt('Edit your task:', todos[index].text);
    if (newText !== null && newText.trim() !== '') {
        todos[index].text = newText.trim();
        saveTodos(todos);
        renderTodos();
    }
}

/**
 * Import todos from a JSON file
 * @param {Event} event - File input change event
 */
function importTodos(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedTodos = JSON.parse(e.target.result);
                if (Array.isArray(importedTodos)) {
                    const existingTodos = getTodos();
                    const mergedTodos = [...existingTodos, ...importedTodos];
                    saveTodos(mergedTodos);
                    renderTodos();
                    alert('Todos imported successfully!');
                } else {
                    alert('Invalid file format. Please upload a valid JSON file.');
                }
            } catch (error) {
                alert('Error reading file. Please upload a valid JSON file.');
            }
        };
        reader.readAsText(file);
    }
}

/**
 * Export todos to a JSON file
 */
function exportTodos() {
    const todos = getTodos();
    const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'todos.json';
    a.click();

    URL.revokeObjectURL(url); // Clean up the URL object
}

// Event listeners for sorting
sortTasksHeading.addEventListener('click', () => {
    sortBy = 'text';
    renderTodos();
});

sortDateHeading.addEventListener('click', () => {
    sortBy = 'date';
    renderTodos();
});

// Event listeners for form submission
todoForm.addEventListener('submit', addTodo);

// Event listeners for import/export
importButton.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importTodos);
exportButton.addEventListener('click', exportTodos);

// Initial render
renderTodos();