import CascadeApp from './modules/main.js';
import { Task, Board, createTask, createBoard } from './modules/models.js';
import { ErrorHandler, ErrorBoundary } from './modules/errorHandler.js';
import { KeyboardNavigator } from './modules/keyboardNav.js';
import { settingsManager } from './modules/settings.js';
import './modules/dropdown.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize error handling first
        ErrorHandler.init();
        
        // Expose models globally for cross-module access
        window.cascadeModels = { Task, Board, createTask, createBoard };
        
        // Create and initialize the app with error boundary
        const initApp = ErrorBoundary.wrap(() => {
            window.cascadeApp = new CascadeApp();
            
            // Initialize keyboard navigation
            window.cascadeKeyboard = new KeyboardNavigator(window.cascadeApp);
            
            return window.cascadeApp;
        }, 'App Initialization');
        
        const app = initApp();
        
        if (!app) {
            throw new Error('Failed to initialize application');
        }
        
        // Make some functions globally available for backward compatibility
        // This allows any existing onclick handlers in HTML to continue working
        window.showArchivedTasks = ErrorBoundary.wrap(() => {
            window.cascadeApp.showArchivedTasksModal();
        }, 'Show Archived Tasks');
        
        // Expose some useful methods globally for debugging and console access
        window.cascadeDebug = {
            getState: () => window.cascadeApp.getState(),
            getTasks: () => window.cascadeApp.getTasks(),
            createTask: (text) => window.cascadeApp.createTask(text),
            focusInput: () => window.cascadeApp.focusInput(),
            showShortcuts: () => window.cascadeKeyboard.showShortcutHelp(),
            selectTask: (id) => window.cascadeKeyboard.selectTask(id),
            clearErrors: () => ErrorHandler.clearErrors()
        };
        
        console.log('✅ Cascade app initialized successfully');
        console.log('🔧 Debug methods available at window.cascadeDebug');
        console.log('⌨️  Press ? or Ctrl+/ to see keyboard shortcuts');
        
        // Show loading state briefly to demonstrate the loading system
        const loadingDemo = document.createElement('div');
        loadingDemo.className = 'loading-overlay';
        loadingDemo.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--color-on-surface);">
                <div class="loading-spinner loading-spinner--lg"></div>
                <p>Loading your tasks...</p>
            </div>
        `;
        document.body.appendChild(loadingDemo);
        
        setTimeout(() => {
            if (loadingDemo.parentNode) {
                loadingDemo.parentNode.removeChild(loadingDemo);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Failed to initialize Cascade app:', error);
        
        // Show error to user using our new error system
        ErrorHandler.handleError(error, 'App Initialization', {
            showToUser: true,
            severity: 'error',
            autoHide: false
        });
        
        // Fallback error display for critical failures
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger m-3';
        errorDiv.innerHTML = `
            <h4>⚠️ Application Error</h4>
            <p>Failed to initialize the application. Please refresh the page.</p>
            <details>
                <summary>Technical Details</summary>
                <pre>${error.message}</pre>
            </details>
        `;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});