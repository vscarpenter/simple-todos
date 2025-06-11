// This file manages interactions with the browser's local storage for the to-do application.

class StorageManager {
    static saveTodos(todos) {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    static getTodos() {
        const todos = localStorage.getItem('todos');
        return todos ? JSON.parse(todos) : [];
    }

    static deleteTodo(id) {
        const todos = StorageManager.getTodos();
        const updatedTodos = todos.filter(todo => todo.id !== id);
        StorageManager.saveTodos(updatedTodos);
    }

    static updateTodo(updatedTodo) {
        const todos = StorageManager.getTodos();
        const updatedTodos = todos.map(todo => 
            todo.id === updatedTodo.id ? updatedTodo : todo
        );
        StorageManager.saveTodos(updatedTodos);
    }
}