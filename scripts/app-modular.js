import CascadeApp from './modules/main.js?v=3.0.0';
import { Task, Board, createTask, createBoard } from './modules/models.js?v=3.0.0';
import { ErrorHandler, ErrorBoundary } from './modules/errorHandler.js?v=3.0.0';
import { KeyboardNavigator } from './modules/keyboardNav.js?v=3.0.0';
import { settingsManager } from './modules/settings.js?v=3.0.0';
import performanceOptimizer from './modules/performance.js?v=3.0.0';
import { container, appContext } from './modules/container.js?v=3.0.0';
import { debugAPI } from './modules/debug.js?v=3.0.0';
import storage from './modules/storageIndexedDBOnly.js?v=3.0.0';
import './modules/dropdown.js?v=3.0.0';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize error handling first
        ErrorHandler.init();
        
        // Force debug mode to false on application start unless explicitly enabled
        settingsManager.setDebugMode(false);
        
        
        // Register services in dependency injection container
        container.registerServices({
            'Task': Task,
            'Board': Board,
            'createTask': createTask,
            'createBoard': createBoard,
            'ErrorHandler': ErrorHandler,
            'settingsManager': { factory: settingsManager, options: { singleton: true } },
            'performanceOptimizer': { factory: performanceOptimizer, options: { singleton: true } },
            'storage': { factory: storage, options: { singleton: true } }
        });
        
        // Create and initialize the app with error boundary
        const initApp = ErrorBoundary.wrap(async () => {
            const app = new CascadeApp();
            appContext.setApp(app);
            
            // Wait for app initialization to complete
            await app.initPromise;
            
            // Initialize keyboard navigation
            const keyboardNav = new KeyboardNavigator(app);
            appContext.setKeyboardNav(keyboardNav);
            
            return app;
        }, 'App Initialization');
        
        const app = await initApp();
        
        if (!app) {
            throw new Error('Failed to initialize application');
        }
        
        // All functions now use proper event delegation - no global exposure needed
        
        // Expose debug API globally for console access
        window.cascadeDebug = debugAPI;
        
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

// Initialize debug system and show commands if debug mode is active
if (typeof window !== 'undefined') {
    setTimeout(() => {
        // Ensure debug mode is explicitly disabled on fresh start
        const currentDebugMode = settingsManager.get('debugMode');
        if (currentDebugMode) {
            console.log('🔧 Debug mode is active! Type cascadeDebug.help() for available commands.');
        }
    }, 500);
}