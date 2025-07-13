import CascadeApp from './modules/main.js';
import { Task, Board, createTask, createBoard } from './modules/models.js';
import './modules/dropdown.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Expose models globally for cross-module access
        window.cascadeModels = { Task, Board, createTask, createBoard };
        
        // Create and initialize the app
        window.cascadeApp = new CascadeApp();
        
        // Make some functions globally available for backward compatibility
        // This allows any existing onclick handlers in HTML to continue working
        window.showArchivedTasks = () => {
            // For now, just show a placeholder since we haven't implemented
            // archived tasks storage yet in this refactor
            window.cascadeApp.dom.showModal(
                'Archived Tasks', 
                'Archived tasks feature will be implemented in the next phase.',
                { showCancel: false }
            );
        };
        
        // Expose some useful methods globally for debugging and console access
        window.cascadeDebug = {
            getState: () => window.cascadeApp.getState(),
            getTasks: () => window.cascadeApp.getTasks(),
            createTask: (text) => window.cascadeApp.createTask(text),
            focusInput: () => window.cascadeApp.focusInput()
        };
        
        console.log('✅ Cascade app initialized successfully');
        console.log('🔧 Debug methods available at window.cascadeDebug');
        
    } catch (error) {
        console.error('❌ Failed to initialize Cascade app:', error);
        
        // Show error to user
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