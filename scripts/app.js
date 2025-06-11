// Select DOM elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const importButton = document.getElementById('import-button');
const importFileInput = document.getElementById('import-file');
const exportButton = document.getElementById('export-button');

// Retrieve todos from local storage
function getTodos() {
    return JSON.parse(localStorage.getItem('todos')) || [];
}

// Save todos to local storage
function saveTodos(todos) {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Render todos in the list
function renderTodos() {
    const todos = getTodos();
    todoList.innerHTML = ''; // Clear existing items

    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = todo.text;

        // Create a container for buttons
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'btn-group';

        // Add buttons for actions
        const completeButton = document.createElement('button');
        completeButton.textContent = 'Complete';
        completeButton.className = 'btn btn-success rounded-pill me-2'; // Green button with margin-end
        completeButton.addEventListener('click', () => toggleComplete(index));

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'btn btn-danger rounded-pill me-2'; // Red button with margin-end
        deleteButton.addEventListener('click', () => deleteTodo(index));

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'btn btn-warning rounded-pill me-2'; // Yellow button with margin-end
        editButton.addEventListener('click', () => editTodo(index));

        // Append buttons to the button group
        buttonGroup.appendChild(editButton);
        buttonGroup.appendChild(completeButton);
        buttonGroup.appendChild(deleteButton);

        // Append the button group to the list item
        li.appendChild(buttonGroup);

        // Append the list item to the todo list
        todoList.appendChild(li);
    });
}

// Add a new todo
function addTodo(event) {
    event.preventDefault();
    const text = todoInput.value.trim();
    if (text) {
        const todos = getTodos();
        todos.push({ text, completed: false });
        saveTodos(todos);
        renderTodos();
        todoInput.value = ''; // Clear input
    }
}

// Toggle completion status
function toggleComplete(index) {
    const todos = getTodos();
    todos[index].completed = !todos[index].completed;
    saveTodos(todos);
    renderTodos();
}

// Delete a todo
function deleteTodo(index) {
    const todos = getTodos();
    todos.splice(index, 1);
    saveTodos(todos);
    renderTodos();
}

// Edit a todo
function editTodo(index) {
    const todos = getTodos();
    const newText = prompt('Edit your task:', todos[index].text);
    if (newText !== null && newText.trim() !== '') {
        todos[index].text = newText.trim();
        saveTodos(todos);
        renderTodos();
    }
}

// Import todos from a JSON file
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

// Export todos to a JSON file
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

// Trigger file input when import button is clicked
importButton.addEventListener('click', () => {
    importFileInput.click();
});

// Handle file input change event
importFileInput.addEventListener('change', importTodos);

// Add event listener to the export button
exportButton.addEventListener('click', exportTodos);

// Event listener for form submission
todoForm.addEventListener('submit', addTodo);

// Initial render
renderTodos();