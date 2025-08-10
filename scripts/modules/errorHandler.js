/**
 * Error Handling Utilities
 * Provides consistent error handling and user feedback
 */


export class ErrorBoundary {
  /**
   * Wraps a function with error handling
   * @param {Function} fn - Function to wrap
   * @param {string} context - Context for error reporting
   * @returns {Function} Wrapped function
   */
  static wrap(fn, context = 'Unknown') {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        console.error(`Error in ${context}:`, error);
        ErrorHandler.handleError(error, context);
        return null;
      }
    };
  }

  /**
   * Wraps an async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Context for error reporting
   * @returns {Function} Wrapped async function
   */
  static wrapAsync(fn, context = 'Unknown') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error(`Async error in ${context}:`, error);
        ErrorHandler.handleError(error, context);
        return null;
      }
    };
  }
}

export class ErrorHandler {
  static errorContainer = null;

  /**
   * Initialize error handler
   */
  static init() {
    // Create error container if it doesn't exist
    if (!this.errorContainer) {
      this.errorContainer = document.createElement('div');
      this.errorContainer.id = 'error-container';
      this.errorContainer.className = 'error-container';
      document.body.appendChild(this.errorContainer);
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason, 'Unhandled Promise');
      event.preventDefault();
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleError(event.error, 'Global Error');
    });
  }

  /**
   * Handle and display errors to users
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @param {Object} options - Display options
   */
  static handleError(error, context = 'Unknown', options = {}) {
    const {
      showToUser = true,
      severity = 'error',
      autoHide = true,
      duration = 5000
    } = options;

    // Log error for debugging
    console.error(`[${severity.toUpperCase()}] ${context}:`, error);

    if (showToUser) {
      this.showErrorToUser(error, context, { severity, autoHide, duration });
    }

    // Report to analytics/monitoring service if available
    this.reportError(error, context, severity);
  }

  /**
   * Show error message to user
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @param {Object} options - Display options
   */
  static showErrorToUser(error, context, options = {}) {
    const { severity = 'error', autoHide = true, duration = 5000 } = options;
    
    const message = this.getUserFriendlyMessage(error, context);
    const errorElement = this.createErrorElement(message, severity);
    
    if (this.errorContainer) {
      this.errorContainer.appendChild(errorElement);
      
      if (autoHide) {
        setTimeout(() => {
          this.hideError(errorElement);
        }, duration);
      }
    }
  }

  /**
   * Show success message to user
   * @param {string} message - Success message
   * @param {Object} options - Display options
   */
  static showSuccess(message, options = {}) {
    const { autoHide = true, duration = 3000 } = options;
    
    const successElement = this.createErrorElement(message, 'success');
    
    if (this.errorContainer) {
      this.errorContainer.appendChild(successElement);
      
      if (autoHide) {
        setTimeout(() => {
          this.hideError(successElement);
        }, duration);
      }
    }
  }

  /**
   * Show info message to user
   * @param {string} message - Info message
   * @param {Object} options - Display options
   */
  static showInfo(message, options = {}) {
    const { autoHide = true, duration = 4000 } = options;
    
    const infoElement = this.createErrorElement(message, 'info');
    
    if (this.errorContainer) {
      this.errorContainer.appendChild(infoElement);
      
      if (autoHide) {
        setTimeout(() => {
          this.hideError(infoElement);
        }, duration);
      }
    }
  }

  /**
   * Show warning message to user
   * @param {string} message - Warning message
   * @param {Object} options - Display options
   */
  static showWarning(message, options = {}) {
    const { autoHide = true, duration = 5000 } = options;
    
    const warningElement = this.createErrorElement(message, 'warning');
    
    if (this.errorContainer) {
      this.errorContainer.appendChild(warningElement);
      
      if (autoHide) {
        setTimeout(() => {
          this.hideError(warningElement);
        }, duration);
      }
    }
  }

  /**
   * Create error element
   * @param {string} message - Error message
   * @param {string} severity - Error severity
   * @returns {HTMLElement} Error element
   */
  static createErrorElement(message, severity) {
    const errorDiv = document.createElement('div');
    errorDiv.className = `error-toast error-toast--${severity}`;
    // Create error elements safely
    const errorContent = document.createElement('div');
    errorContent.className = 'error-toast__content';
    
    const errorIcon = document.createElement('div');
    errorIcon.className = 'error-toast__icon';
    errorIcon.textContent = this.getErrorIcon(severity);
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-toast__message';
    errorMessage.textContent = message; // Use textContent for safety
    
    const errorClose = document.createElement('button');
    errorClose.className = 'error-toast__close';
    errorClose.setAttribute('aria-label', 'Close error message');
    errorClose.textContent = '×';
    
    errorContent.appendChild(errorIcon);
    errorContent.appendChild(errorMessage);
    errorContent.appendChild(errorClose);
    errorDiv.appendChild(errorContent);

    // Add close functionality
    const closeBtn = errorDiv.querySelector('.error-toast__close');
    closeBtn.addEventListener('click', () => this.hideError(errorDiv));

    return errorDiv;
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {string} User-friendly message
   */
  static getUserFriendlyMessage(error, context) {
    const errorMessages = {
      'Network Error': 'Unable to connect to the server. Please check your internet connection.',
      'Storage Error': 'Unable to save your data. Please try again.',
      'Validation Error': 'Please check your input and try again.',
      'Import Error': 'Unable to import the file. Please check the file format.',
      'Export Error': 'Unable to export your data. Please try again.',
      'Task Creation': 'Unable to create the task. Please try again.',
      'Task Update': 'Unable to update the task. Please try again.',
      'Task Deletion': 'Unable to delete the task. Please try again.',
      'Drag and Drop': 'Unable to move the task. Please try again.',
      'Unknown': 'Something went wrong. Please try again.'
    };

    return errorMessages[context] || errorMessages['Unknown'];
  }

  /**
   * Get error icon based on severity
   * @param {string} severity - Error severity
   * @returns {string} Icon HTML
   */
  static getErrorIcon(severity) {
    const icons = {
      error: '⚠️',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };

    return icons[severity] || icons.error;
  }

  /**
   * Hide error element
   * @param {HTMLElement} errorElement - Error element to hide
   */
  static hideError(errorElement) {
    errorElement.classList.add('error-toast--hiding');
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.parentNode.removeChild(errorElement);
      }
    }, 300);
  }

  /**
   * Report error to monitoring service
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @param {string} severity - Error severity
   */
  static reportError(error, context, severity) {
    // This would integrate with your error reporting service
    // For now, we'll just log it
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      severity,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In a real app, you'd send this to your error reporting service
  }

  /**
   * Clear all error messages
   */
  static clearErrors() {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = '';
    }
  }
}

// Validation utilities
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NetworkError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
  }
}

export class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
}

// Initialize error handler when module loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ErrorHandler.init();
  });
}
