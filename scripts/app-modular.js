import CascadeApp from './modules/main.js?v=3.0.0';
import { Task, Board, createTask, createBoard } from './modules/models.js?v=3.0.0';
import { ErrorHandler, ErrorBoundary } from './modules/errorHandler.js?v=3.0.0';
import { KeyboardNavigator } from './modules/keyboardNav.js?v=3.0.0';
import { settingsManager } from './modules/settings.js?v=3.0.0';
import performanceOptimizer from './modules/performance.js?v=3.0.0';
import { modelFactory } from './modules/utils.js?v=3.0.0';
import './modules/dropdown.js?v=3.0.0';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize error handling first
        ErrorHandler.init();
        
        // Force debug mode to false on application start unless explicitly enabled
        settingsManager.setDebugMode(false);
        
        
        // Register models with the model factory for dependency injection
        modelFactory.register({ Task, Board, createTask, createBoard });
        
        // Maintain backward compatibility by also exposing via window (deprecated)
        window.cascadeModels = { Task, Board, createTask, createBoard };
        
        // Create and initialize the app with error boundary
        const initApp = ErrorBoundary.wrap(async () => {
            window.cascadeApp = new CascadeApp();
            
            // Wait for app initialization to complete
            await window.cascadeApp.initPromise;
            
            // Initialize keyboard navigation
            window.cascadeKeyboard = new KeyboardNavigator(window.cascadeApp);
            
            return window.cascadeApp;
        }, 'App Initialization');
        
        const app = await initApp();
        
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
            clearErrors: () => ErrorHandler.clearErrors(),
            showEmptyState: () => {
                window.cascadeApp.showEmptyState();
                console.log('🎯 Empty state shown! The "Create First Task" button should now be visible.');
            },
            resetToEmptyState: () => {
                localStorage.clear();
                location.reload();
                console.log('🔄 App reset to empty state. Page will reload...');
            },
            performance: {
                getStats: () => performanceOptimizer.getPerformanceStats(),
                searchTasks: (tasks, criteria) => performanceOptimizer.searchTasks(tasks, criteria),
                createStressTest: (taskCount = 10000) => {
                    const tasks = Array.from({ length: taskCount }, (_, i) => ({
                        id: `stress-task-${i}`,
                        text: `Stress Test Task ${i}`,
                        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'doing' : 'done',
                        createdDate: new Date().toISOString()
                    }));
                    console.log(`Created ${taskCount} tasks for stress testing`);
                    return tasks;
                }
            }
        };
        
        console.log('✅ Cascade app initialized successfully');
        console.log('🔧 Debug methods available at window.cascadeDebug');
        console.log('⌨️  Press ? or Ctrl+/ to see keyboard shortcuts');
        
        // Show loading state briefly to demonstrate the loading system
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--color-on-surface);">
                <div class="loading-spinner loading-spinner--lg"></div>
                <p>Loading your tasks...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
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
        
        // Create elements safely without innerHTML
        const title = document.createElement('h4');
        title.textContent = '⚠️ Application Error';
        
        const message = document.createElement('p');
        message.textContent = 'Failed to initialize the application. Please refresh the page.';
        
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Technical Details';
        
        const pre = document.createElement('pre');
        pre.textContent = error.message;
        
        details.appendChild(summary);
        details.appendChild(pre);
        
        errorDiv.appendChild(title);
        errorDiv.appendChild(message);
        errorDiv.appendChild(details);
        
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});

// Global debug utilities (available in browser console)
if (typeof window !== 'undefined') {
    window.cascadeDebug = {
        enableDebug() {
            settingsManager.setDebugMode(true);
            console.log('🔧 Debug mode enabled! Use cascadeDebug.disableDebug() to turn off.');
        },
        disableDebug() {
            settingsManager.setDebugMode(false);
            console.log('🔇 Debug mode disabled.');
        },
        getSettings() {
            return settingsManager.get();
        },
        version: '3.0.0',
        help() {
            console.log(`
🎯 Cascade Debug Utilities

Available commands:
• cascadeDebug.enableDebug() - Turn on verbose logging
• cascadeDebug.disableDebug() - Turn off verbose logging  
• cascadeDebug.getSettings() - View current settings
• cascadeDebug.version - Show app version
• cascadeDebug.help() - Show this help

Debug mode is currently: ${settingsManager.get('debugMode') ? 'ON' : 'OFF'}
            `);
        }
    };
    
    // // Show available debug commands on first load (only in debug mode)
     setTimeout(() => {
         // Ensure debug mode is explicitly disabled on fresh start
         const currentDebugMode = settingsManager.get('debugMode');
         if (currentDebugMode) {
             console.log('🔧 Debug mode is active! Type cascadeDebug.help() for available commands.');
         }
     }, 500);
}