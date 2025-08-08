/**
 * Debug utilities module
 * Replaces window.cascadeDebug with modular debug system
 */

import { appContext } from './container.js';
import { settingsManager } from './settings.js';
import { ErrorHandler } from './errorHandler.js';

export class DebugAPI {
    constructor() {
        this.version = '3.0.0';
    }

    /**
     * Get current application state
     * @returns {Object} Application state
     */
    getState() {
        return appContext.getApp().getState();
    }

    /**
     * Get current tasks
     * @returns {Array} Current tasks
     */
    getTasks() {
        return appContext.getApp().getTasks();
    }

    /**
     * Create a new task
     * @param {string} text - Task text
     * @returns {Object} Created task
     */
    createTask(text) {
        return appContext.getApp().createTask(text);
    }

    /**
     * Focus the task input
     */
    focusInput() {
        return appContext.getApp().focusInput();
    }

    /**
     * Show keyboard shortcuts
     */
    showShortcuts() {
        const keyboardNav = appContext.getKeyboardNav();
        if (keyboardNav) {
            return keyboardNav.showShortcutHelp();
        }
    }

    /**
     * Select a task by ID
     * @param {string} id - Task ID
     */
    selectTask(id) {
        const keyboardNav = appContext.getKeyboardNav();
        if (keyboardNav) {
            return keyboardNav.selectTask(id);
        }
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        return ErrorHandler.clearErrors();
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        appContext.getApp().showEmptyState();
        console.log('🎯 Empty state shown! The "Create First Task" button should now be visible.');
    }

    /**
     * Reset to empty state
     */
    async resetToEmptyState() {
        try {
            // Clear all storage (IndexedDB)
            const storage = appContext.get('storage');
            await storage.clear();
            
            // Clear settings
            const settingsManager = appContext.get('settingsManager');
            await settingsManager.resetSettings();
            
            console.log('🔄 App reset to empty state. Page will reload...');
            location.reload();
        } catch (error) {
            console.error('Failed to reset app state:', error);
            // Fallback: just reload the page
            location.reload();
        }
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        settingsManager.setDebugMode(true);
        console.log('🔧 Debug mode enabled! Use cascadeDebug.disableDebug() to turn off.');
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        settingsManager.setDebugMode(false);
        console.log('🔇 Debug mode disabled.');
    }

    /**
     * Get current settings
     * @returns {Object} Settings
     */
    getSettings() {
        return settingsManager.get();
    }

    /**
     * Show help information
     */
    help() {
        console.log(`
🎯 Cascade Debug Utilities (v${this.version})

Available commands:
• cascadeDebug.enableDebug() - Turn on verbose logging
• cascadeDebug.disableDebug() - Turn off verbose logging  
• cascadeDebug.getSettings() - View current settings
• cascadeDebug.getState() - Get application state
• cascadeDebug.getTasks() - Get current tasks
• cascadeDebug.createTask(text) - Create new task
• cascadeDebug.focusInput() - Focus task input
• cascadeDebug.showShortcuts() - Show keyboard shortcuts
• cascadeDebug.selectTask(id) - Select task by ID
• cascadeDebug.clearErrors() - Clear error messages
• cascadeDebug.showEmptyState() - Show empty state
• cascadeDebug.resetToEmptyState() - Reset app state
• cascadeDebug.performance - Performance utilities
• cascadeDebug.version - Show version
• cascadeDebug.help() - Show this help

Debug mode is currently: ${settingsManager.get('debugMode') ? 'ON' : 'OFF'}
        `);
    }
}

/**
 * Performance debug utilities
 */
export class PerformanceDebugAPI {
    /**
     * Get performance statistics
     * @returns {Object} Performance stats
     */
    getStats() {
        return appContext.get('performanceOptimizer').getPerformanceStats();
    }

    /**
     * Search tasks with performance monitoring
     * @param {Array} tasks - Tasks to search
     * @param {Object} criteria - Search criteria
     * @returns {Array} Search results
     */
    searchTasks(tasks, criteria) {
        return appContext.get('performanceOptimizer').searchTasks(tasks, criteria);
    }

    /**
     * Create stress test data
     * @param {number} taskCount - Number of tasks to create
     * @returns {Array} Test tasks
     */
    createStressTest(taskCount = 10000) {
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

// Create debug API instances
export const debugAPI = new DebugAPI();
export const performanceDebugAPI = new PerformanceDebugAPI();

// Add performance utilities to main debug API
debugAPI.performance = performanceDebugAPI;