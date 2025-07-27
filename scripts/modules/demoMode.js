import eventBus from './eventBus.js';
import { debugLog } from './settings.js';
import { ErrorHandler, ErrorBoundary } from './errorHandler.js';

/**
 * Demo Mode Manager
 * Handles loading sample data and managing demo mode state
 */
class DemoModeManager {
    constructor() {
        this.isDemoMode = false;
        this.demoData = null;
        this.originalData = null;
        this.tourSteps = [];
        this.currentStep = 0;
        this.demoIndicator = null;
        this.eventListeners = [];
        
        this.init();
    }

    /**
     * Initialize demo mode manager
     */
    init() {
        this.setupEventListeners();
        this.checkDemoState();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const listeners = [
            { event: 'demo:enter', handler: () => this.enterDemoMode() },
            { event: 'demo:exit', handler: () => this.exitDemoMode() },
            { event: 'demo:tour:start', handler: () => this.startGuidedTour() },
            { event: 'demo:tour:next', handler: () => this.nextTourStep() },
            { event: 'demo:tour:skip', handler: () => this.skipTour() }
        ];
        
        listeners.forEach(({ event, handler }) => {
            eventBus.on(event, handler);
            this.eventListeners.push({ event, handler });
        });
    }

    /**
     * Cleanup event listeners
     */
    cleanupEventListeners() {
        this.eventListeners.forEach(({ event, handler }) => {
            eventBus.off(event, handler);
        });
        this.eventListeners = [];
    }

    /**
     * Check if we're currently in demo mode
     */
    checkDemoState() {
        const demoFlag = localStorage.getItem('cascade_demo_mode');
        if (demoFlag === 'true') {
            this.isDemoMode = true;
            this.showDemoIndicator();
        }
    }

    /**
     * Load demo data from example export file
     */
    async loadDemoData() {
        try {
            debugLog.log('Loading demo data...');
            
            // Load demo data from example-export.json
            const response = await fetch('./example-export.json');
            if (!response.ok) {
                throw new Error(`Failed to load demo data: ${response.status}`);
            }
            
            const demoExport = await response.json();
            
            // Transform export data to current app format
            this.demoData = this.transformDemoData(demoExport);
            
            debugLog.log('Demo data loaded successfully', this.demoData);
            return true;
            
        } catch (error) {
            ErrorHandler.handleError(error, 'Demo Data Loading', {
                showToUser: true,
                severity: 'error'
            });
            return false;
        }
    }

    /**
     * Transform export data to current app format
     */
    transformDemoData(exportData) {
        return {
            version: exportData.version || '3.0',
            boards: exportData.data.boards || [],
            currentBoardId: exportData.data.currentBoardId || 'board-main',
            settings: exportData.settings || {},
            lastSaved: new Date().toISOString()
        };
    }

    /**
     * Backup current user data before entering demo mode
     */
    backupUserData() {
        try {
            console.log('🎯 [DEMO] Starting data backup...');
            
            // Get the current data from the main storage key
            const mainStorageData = localStorage.getItem('cascade-app');
            const settingsData = localStorage.getItem('cascade-settings');
            const archivedTasksData = localStorage.getItem('cascade-archived-tasks');
            
            console.log('🎯 [DEMO] Current data to backup:', {
                hasMainStorage: !!mainStorageData,
                hasSettings: !!settingsData,
                hasArchivedTasks: !!archivedTasksData
            });
            
            if (mainStorageData) {
                const parsed = JSON.parse(mainStorageData);
                console.log('🎯 [DEMO] Main storage contains:', {
                    version: parsed.version,
                    boardCount: parsed.data?.boards?.length || 0,
                    currentBoardId: parsed.data?.currentBoardId
                });
            }
            
            const backupData = {
                mainStorage: mainStorageData,
                settings: settingsData,
                archivedTasks: archivedTasksData
            };
            
            // Store backup
            localStorage.setItem('cascade_demo_backup', JSON.stringify(backupData));
            this.originalData = backupData;
            
            console.log('🎯 [DEMO] Data backup complete!');
            debugLog.log('User data backed up successfully');
            return true;
            
        } catch (error) {
            console.error('🎯 [DEMO] Data backup failed:', error);
            ErrorHandler.handleError(error, 'Data Backup', {
                showToUser: true,
                severity: 'error'
            });
            return false;
        }
    }

    /**
     * Restore original user data
     */
    restoreUserData() {
        try {
            console.log('🔄 [DEMO EXIT] Starting data restoration...');
            
            const backupData = localStorage.getItem('cascade_demo_backup');
            if (!backupData) {
                console.log('🔄 [DEMO EXIT] No backup data found, starting fresh');
                debugLog.log('No backup data found, starting fresh');
                this.clearDemoData();
                return true;
            }
            
            const originalData = JSON.parse(backupData);
            console.log('🔄 [DEMO EXIT] Backup data found:', {
                hasMainStorage: !!originalData.mainStorage,
                hasSettings: !!originalData.settings,
                hasArchivedTasks: !!originalData.archivedTasks
            });
            
            // Restore original data using proper storage keys
            if (originalData.mainStorage) {
                localStorage.setItem('cascade-app', originalData.mainStorage);
                console.log('🔄 [DEMO EXIT] Restored main storage data');
            } else {
                localStorage.removeItem('cascade-app');
                console.log('🔄 [DEMO EXIT] Removed main storage (was empty)');
            }
            
            if (originalData.settings) {
                localStorage.setItem('cascade-settings', originalData.settings);
                console.log('🔄 [DEMO EXIT] Restored settings data');
            } else {
                localStorage.removeItem('cascade-settings');
                console.log('🔄 [DEMO EXIT] Removed settings (was empty)');
            }
            
            if (originalData.archivedTasks) {
                localStorage.setItem('cascade-archived-tasks', originalData.archivedTasks);
                console.log('🔄 [DEMO EXIT] Restored archived tasks data');
            } else {
                localStorage.removeItem('cascade-archived-tasks');
                console.log('🔄 [DEMO EXIT] Removed archived tasks (was empty)');
            }
            
            // Clean up backup
            localStorage.removeItem('cascade_demo_backup');
            console.log('🔄 [DEMO EXIT] Cleaned up backup data');
            
            // Verify restoration
            const restoredData = localStorage.getItem('cascade-app');
            if (restoredData) {
                const parsed = JSON.parse(restoredData);
                console.log('🔄 [DEMO EXIT] Verification - restored data has:', {
                    version: parsed.version,
                    boardCount: parsed.data?.boards?.length || 0,
                    currentBoardId: parsed.data?.currentBoardId
                });
            } else {
                console.log('🔄 [DEMO EXIT] Verification - no main storage data (fresh start)');
            }
            
            debugLog.log('User data restored successfully');
            console.log('🔄 [DEMO EXIT] Data restoration complete!');
            return true;
            
        } catch (error) {
            console.error('🔄 [DEMO EXIT] Data restoration failed:', error);
            ErrorHandler.handleError(error, 'Data Restoration', {
                showToUser: true,
                severity: 'error'
            });
            return false;
        }
    }

    /**
     * Clear demo data from storage
     */
    clearDemoData() {
        localStorage.removeItem('cascade-app');
        localStorage.removeItem('cascade_demo_mode');
        localStorage.removeItem('cascade_demo_backup');
    }

    /**
     * Enter demo mode
     */
    async enterDemoMode() {
        try {
            console.log('🎯 [DEMO] Starting demo mode activation...');
            debugLog.log('Entering demo mode...');
            
            // Load demo data first
            console.log('🎯 [DEMO] Loading demo data...');
            const loaded = await this.loadDemoData();
            if (!loaded) {
                throw new Error('Failed to load demo data');
            }
            console.log('🎯 [DEMO] Demo data loaded:', this.demoData);
            
            // Backup current data
            console.log('🎯 [DEMO] Backing up user data...');
            const backed = this.backupUserData();
            if (!backed) {
                throw new Error('Failed to backup user data');
            }
            console.log('🎯 [DEMO] User data backed up');
            
            // Load demo data into storage using proper format
            console.log('🎯 [DEMO] Setting demo data in localStorage...');
            
            // Use the storage system's expected format
            const storagePayload = {
                version: '2.0',
                timestamp: Date.now(),
                data: {
                    boards: this.demoData.boards,
                    currentBoardId: this.demoData.currentBoardId,
                    filter: 'all'
                }
            };
            
            // Store using the same key the storage system uses
            localStorage.setItem('cascade-app', JSON.stringify(storagePayload));
            localStorage.setItem('cascade_demo_mode', 'true');
            
            // Verify data was set
            const storedData = localStorage.getItem('cascade-app');
            if (storedData) {
                const parsed = JSON.parse(storedData);
                console.log('🎯 [DEMO] Stored data:', parsed.data.boards.length + ' boards');
                console.log('🎯 [DEMO] Stored current board:', parsed.data.currentBoardId);
            } else {
                console.log('🎯 [DEMO] No data stored!');
            }
            
            // Update state
            this.isDemoMode = true;
            
            // Show demo UI elements
            console.log('🎯 [DEMO] Showing demo UI elements...');
            this.showDemoIndicator();
            this.showWelcomeModal();
            
            // Emit event to reload app
            console.log('🎯 [DEMO] Emitting app:reload event...');
            eventBus.emit('app:reload');
            
            debugLog.log('Demo mode activated successfully');
            console.log('🎯 [DEMO] Demo mode activation complete!');
            
        } catch (error) {
            console.error('🎯 [DEMO] Demo mode activation failed:', error);
            ErrorHandler.handleError(error, 'Demo Mode Activation', {
                showToUser: true,
                severity: 'error'
            });
        }
    }

    /**
     * Exit demo mode
     */
    async exitDemoMode() {
        try {
            debugLog.log('Exiting demo mode...');
            
            // Show confirmation
            const confirmed = await this.showExitConfirmation();
            if (!confirmed) {
                return;
            }
            
            // Restore original data
            const restored = this.restoreUserData();
            if (!restored) {
                throw new Error('Failed to restore user data');
            }
            
            // Clean up demo state
            this.isDemoMode = false;
            this.demoData = null;
            this.originalData = null;
            this.currentStep = 0;
            this.tourSteps = [];
            
            // Remove demo mode flag BEFORE reloading
            localStorage.removeItem('cascade_demo_mode');
            
            // Hide demo UI elements
            this.hideDemoIndicator();
            
            // Clean up any remaining demo modals or toasts
            const demoModals = document.querySelectorAll('.demo-modal-overlay, .demo-toast');
            demoModals.forEach(modal => modal.remove());
            
            // Emit event to reload app
            eventBus.emit('app:reload');
            
            debugLog.log('Demo mode exited successfully');
            
        } catch (error) {
            ErrorHandler.handleError(error, 'Demo Mode Exit', {
                showToUser: true,
                severity: 'error'
            });
        }
    }

    /**
     * Show demo mode indicator
     */
    showDemoIndicator() {
        if (this.demoIndicator) {
            return; // Already showing
        }
        
        this.demoIndicator = document.createElement('div');
        this.demoIndicator.id = 'demo-mode-indicator';
        this.demoIndicator.className = 'demo-mode-badge';
        this.demoIndicator.innerHTML = `
            <span class="demo-icon">🎯</span>
            <span class="demo-text">Demo Mode</span>
            <button class="demo-exit-btn" title="Exit Demo Mode" aria-label="Exit Demo Mode">✕</button>
        `;
        
        // Add event listener for exit button
        const exitBtn = this.demoIndicator.querySelector('.demo-exit-btn');
        exitBtn.addEventListener('click', () => {
            eventBus.emit('demo:exit');
        });
        
        document.body.appendChild(this.demoIndicator);
    }

    /**
     * Hide demo mode indicator
     */
    hideDemoIndicator() {
        const indicator = document.querySelector('.demo-mode-badge');
        if (indicator) {
            indicator.remove();
        }
        // Clear reference
        this.demoIndicator = null;
    }

    /**
     * Show welcome modal
     */
    showWelcomeModal() {
        const modal = document.createElement('div');
        modal.id = 'demo-welcome-modal';
        modal.className = 'demo-modal-overlay';
        modal.innerHTML = `
            <div class="demo-modal">
                <div class="demo-modal-content">
                    <h2>Welcome to Cascade Demo! 🎯</h2>
                    <p>Explore how Cascade helps you organize tasks across multiple boards with our interactive demo.</p>
                    
                    <div class="demo-features">
                        <div class="demo-feature">
                            <span class="demo-feature-icon">📋</span>
                            <div class="demo-feature-content">
                                <strong>3 Sample Boards</strong>
                                <small>Main, Personal, and Workout boards with real tasks</small>
                            </div>
                        </div>
                        <div class="demo-feature">
                            <span class="demo-feature-icon">✨</span>
                            <div class="demo-feature-content">
                                <strong>Interactive Tasks</strong>
                                <small>Create, edit, and move tasks between columns</small>
                            </div>
                        </div>
                        <div class="demo-feature">
                            <span class="demo-feature-icon">🎨</span>
                            <div class="demo-feature-content">
                                <strong>Drag & Drop</strong>
                                <small>Smooth drag-and-drop with visual feedback</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="demo-actions">
                        <button class="btn btn-primary" id="start-demo-tour">
                            🚀 Start Guided Tour
                        </button>
                        <button class="btn btn-secondary" id="explore-freely">
                            🔍 Explore Freely
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        const startTourBtn = modal.querySelector('#start-demo-tour');
        const exploreBtn = modal.querySelector('#explore-freely');
        
        startTourBtn.addEventListener('click', () => {
            modal.remove();
            eventBus.emit('demo:tour:start');
        });
        
        exploreBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        document.body.appendChild(modal);
    }

    /**
     * Show exit confirmation
     */
    showExitConfirmation() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'demo-modal-overlay';
            modal.innerHTML = `
                <div class="demo-modal">
                    <div class="demo-modal-content">
                        <h3>Exit Demo Mode?</h3>
                        <p>This will restore your original data and exit the demo.</p>
                        <div class="demo-actions">
                            <button class="btn btn-primary" id="confirm-exit">
                                Yes, Exit Demo
                            </button>
                            <button class="btn btn-secondary" id="cancel-exit">
                                Stay in Demo
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const confirmBtn = modal.querySelector('#confirm-exit');
            const cancelBtn = modal.querySelector('#cancel-exit');
            
            confirmBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            document.body.appendChild(modal);
        });
    }

    /**
     * Start guided tour
     */
    startGuidedTour() {
        // TODO: Implement guided tour functionality
        debugLog.log('Starting guided tour...');
        
        // For now, just show a simple message
        const toast = document.createElement('div');
        toast.className = 'demo-toast';
        toast.innerHTML = `
            <div class="demo-toast-content">
                <span class="demo-toast-icon">🎯</span>
                <span>Guided tour coming soon! For now, explore the three boards using the board selector.</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Next tour step
     */
    nextTourStep() {
        // TODO: Implement tour step navigation
        debugLog.log('Next tour step...');
    }

    /**
     * Skip tour
     */
    skipTour() {
        // TODO: Implement tour skip functionality
        debugLog.log('Skipping tour...');
    }

    /**
     * Get demo mode state
     */
    getDemoState() {
        return {
            isDemoMode: this.isDemoMode,
            hasOriginalData: !!this.originalData,
            demoDataLoaded: !!this.demoData
        };
    }
}

// Create singleton instance
const demoModeManager = new DemoModeManager();

export default demoModeManager;
