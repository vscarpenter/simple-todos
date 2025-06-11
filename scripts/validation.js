function validateTodoInput(input) {
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
        return { isValid: false, message: "Todo item cannot be empty." };
    }
    if (trimmedInput.length > 100) {
        return { isValid: false, message: "Todo item cannot exceed 100 characters." };
    }
    return { isValid: true, message: "" };
}

function validateEditInput(input) {
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
        return { isValid: false, message: "Edited todo item cannot be empty." };
    }
    if (trimmedInput.length > 100) {
        return { isValid: false, message: "Edited todo item cannot exceed 100 characters." };
    }
    return { isValid: true, message: "" };
}

function displayError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}