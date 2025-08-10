import CascadeApp from './modules/main.js?v=3.0.0';
import { ErrorHandler, ErrorBoundary } from './modules/errorHandler.js?v=3.0.0';
import { KeyboardNavigator } from './modules/keyboardNav.js?v=3.0.0';
import './modules/dropdown.js?v=3.0.0';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize error handling first
        ErrorHandler.init();
        
        // Create and initialize the app with error boundary
        const initApp = ErrorBoundary.wrap(async () => {
            const app = new CascadeApp();
            
            // Wait for app initialization to complete
            await app.initPromise;
            
            // Initialize keyboard navigation
            const keyboardNav = new KeyboardNavigator(app);
            
            return app;
        }, 'App Initialization');
        
        const app = await initApp();
        
        if (!app) {
            throw new Error('Failed to initialize application');
        }
        
        // Expose app globally for testing
        window.cascadeApp = app;
        
        console.log('✅ Cascade app initialized successfully');
        
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

