/**
 * Performance optimization module for large dataset handling
 * Provides virtual scrolling, task indexing, and memory management
 */

import eventBus from './eventBus.js';
import { debugLog, settingsManager } from './settings.js';

/**
 * Task indexing system for fast filtering and searching
 */
class TaskIndex {
    constructor() {
        this.textIndex = new Map(); // text -> Set of task IDs
        this.statusIndex = new Map(); // status -> Set of task IDs
        this.dateIndex = new Map(); // date -> Set of task IDs
        this.boardIndex = new Map(); // boardId -> Set of task IDs
        this.fullTextIndex = new Map(); // word -> Set of task IDs
        this.initialized = false;
    }

    /**
     * Initialize or rebuild the index from tasks
     * @param {Array} tasks - Array of tasks to index
     * @param {string} boardId - Board ID for board-specific indexing
     */
    buildIndex(tasks, boardId = null) {
        debugLog.log('🔍 Building task index...', { taskCount: tasks.length, boardId });
        
        // Clear existing indexes
        this.textIndex.clear();
        this.statusIndex.clear();
        this.dateIndex.clear();
        this.fullTextIndex.clear();
        
        if (boardId) {
            if (!this.boardIndex.has(boardId)) {
                this.boardIndex.set(boardId, new Set());
            }
            this.boardIndex.get(boardId).clear();
        }

        tasks.forEach(task => {
            this.addTaskToIndex(task, boardId);
        });

        this.initialized = true;
        debugLog.log('✅ Task index built successfully');
    }

    /**
     * Add a single task to the index
     * @param {Object} task - Task to add
     * @param {string} boardId - Board ID
     */
    addTaskToIndex(task, boardId = null) {
        if (!task || !task.id) return;

        // Text index (exact match)
        if (!this.textIndex.has(task.text)) {
            this.textIndex.set(task.text, new Set());
        }
        this.textIndex.get(task.text).add(task.id);

        // Status index
        if (!this.statusIndex.has(task.status)) {
            this.statusIndex.set(task.status, new Set());
        }
        this.statusIndex.get(task.status).add(task.id);

        // Date index (by creation date)
        const dateKey = task.createdDate ? task.createdDate.split('T')[0] : 'unknown';
        if (!this.dateIndex.has(dateKey)) {
            this.dateIndex.set(dateKey, new Set());
        }
        this.dateIndex.get(dateKey).add(task.id);

        // Full-text index (word-based search)
        const words = task.text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        words.forEach(word => {
            if (!this.fullTextIndex.has(word)) {
                this.fullTextIndex.set(word, new Set());
            }
            this.fullTextIndex.get(word).add(task.id);
        });

        // Board index
        if (boardId) {
            if (!this.boardIndex.has(boardId)) {
                this.boardIndex.set(boardId, new Set());
            }
            this.boardIndex.get(boardId).add(task.id);
        }
    }

    /**
     * Remove a task from the index
     * @param {Object} task - Task to remove
     * @param {string} boardId - Board ID
     */
    removeTaskFromIndex(task, boardId = null) {
        if (!task || !task.id) return;

        // Remove from text index
        if (this.textIndex.has(task.text)) {
            this.textIndex.get(task.text).delete(task.id);
            if (this.textIndex.get(task.text).size === 0) {
                this.textIndex.delete(task.text);
            }
        }

        // Remove from status index
        if (this.statusIndex.has(task.status)) {
            this.statusIndex.get(task.status).delete(task.id);
        }

        // Remove from date index
        const dateKey = task.createdDate ? task.createdDate.split('T')[0] : 'unknown';
        if (this.dateIndex.has(dateKey)) {
            this.dateIndex.get(dateKey).delete(task.id);
        }

        // Remove from full-text index
        const words = task.text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        words.forEach(word => {
            if (this.fullTextIndex.has(word)) {
                this.fullTextIndex.get(word).delete(task.id);
                if (this.fullTextIndex.get(word).size === 0) {
                    this.fullTextIndex.delete(word);
                }
            }
        });

        // Remove from board index
        if (boardId && this.boardIndex.has(boardId)) {
            this.boardIndex.get(boardId).delete(task.id);
        }
    }

    /**
     * Fast search using indexes
     * @param {Object} criteria - Search criteria
     * @returns {Set} Set of matching task IDs
     */
    search(criteria) {
        if (!this.initialized) {
            debugLog.warn('Task index not initialized, falling back to linear search');
            return new Set();
        }

        let results = null;

        // Status filter
        if (criteria.status) {
            const statusResults = this.statusIndex.get(criteria.status) || new Set();
            results = results ? this.intersect(results, statusResults) : new Set(statusResults);
        }

        // Text search (full-text)
        if (criteria.text) {
            const words = criteria.text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
            let textResults = null;

            words.forEach(word => {
                const wordResults = this.fullTextIndex.get(word) || new Set();
                textResults = textResults ? this.intersect(textResults, wordResults) : new Set(wordResults);
            });

            results = results ? this.intersect(results, textResults || new Set()) : textResults || new Set();
        }

        // Date filter
        if (criteria.date) {
            const dateResults = this.dateIndex.get(criteria.date) || new Set();
            results = results ? this.intersect(results, dateResults) : new Set(dateResults);
        }

        // Board filter
        if (criteria.boardId) {
            const boardResults = this.boardIndex.get(criteria.boardId) || new Set();
            results = results ? this.intersect(results, boardResults) : new Set(boardResults);
        }

        return results || new Set();
    }

    /**
     * Get intersection of two sets
     * @param {Set} set1 - First set
     * @param {Set} set2 - Second set
     * @returns {Set} Intersection
     */
    intersect(set1, set2) {
        const result = new Set();
        for (const item of set1) {
            if (set2.has(item)) {
                result.add(item);
            }
        }
        return result;
    }

    /**
     * Get index statistics
     * @returns {Object} Index statistics
     */
    getStats() {
        return {
            textEntries: this.textIndex.size,
            statusEntries: this.statusIndex.size,
            dateEntries: this.dateIndex.size,
            fullTextEntries: this.fullTextIndex.size,
            boardEntries: this.boardIndex.size,
            initialized: this.initialized
        };
    }
}

/**
 * Virtual scrolling implementation for large task lists
 */
class VirtualScroller {
    constructor(container, options = {}) {
        this.container = container;
        this.itemHeight = options.itemHeight || 80;
        this.bufferSize = options.bufferSize || 10;
        this.items = [];
        this.visibleItems = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.startIndex = 0;
        this.endIndex = 0;
        
        this.init();
    }

    /**
     * Initialize virtual scroller
     */
    init() {
        if (!this.container) return;

        // Create virtual container structure
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroll-viewport';
        this.viewport.style.cssText = `
            height: 100%;
            overflow-y: auto;
            position: relative;
        `;

        this.content = document.createElement('div');
        this.content.className = 'virtual-scroll-content';
        this.content.style.cssText = `
            position: relative;
            width: 100%;
        `;

        this.spacer = document.createElement('div');
        this.spacer.className = 'virtual-scroll-spacer';

        this.viewport.appendChild(this.content);
        this.content.appendChild(this.spacer);
        
        // Replace container content
        this.container.innerHTML = '';
        this.container.appendChild(this.viewport);

        // Set up event listeners
        this.viewport.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));

        this.updateContainerHeight();
    }

    /**
     * Set items to be virtually scrolled
     * @param {Array} items - Items to display
     */
    setItems(items) {
        this.items = items;
        this.totalHeight = items.length * this.itemHeight;
        this.spacer.style.height = `${this.totalHeight}px`;
        this.updateVisibleItems();
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        this.scrollTop = this.viewport.scrollTop;
        this.updateVisibleItems();
    }

    /**
     * Handle resize events
     */
    handleResize() {
        this.updateContainerHeight();
        this.updateVisibleItems();
    }

    /**
     * Update container height
     */
    updateContainerHeight() {
        this.containerHeight = this.viewport.clientHeight;
    }

    /**
     * Update visible items based on scroll position
     */
    updateVisibleItems() {
        if (!this.items.length) return;

        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        this.startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize);
        this.endIndex = Math.min(this.items.length, this.startIndex + visibleCount + this.bufferSize * 2);

        this.visibleItems = this.items.slice(this.startIndex, this.endIndex);
        this.renderVisibleItems();
    }

    /**
     * Render visible items
     */
    renderVisibleItems() {
        // Clear existing items (except spacer)
        const existingItems = this.content.querySelectorAll('.virtual-item');
        existingItems.forEach(item => item.remove());

        // Render visible items
        this.visibleItems.forEach((item, index) => {
            const actualIndex = this.startIndex + index;
            const element = this.createItemElement(item, actualIndex);
            element.style.position = 'absolute';
            element.style.top = `${actualIndex * this.itemHeight}px`;
            element.style.width = '100%';
            element.style.height = `${this.itemHeight}px`;
            element.className += ' virtual-item';
            
            this.content.appendChild(element);
        });

        debugLog.log('🔄 Virtual scroll updated', {
            startIndex: this.startIndex,
            endIndex: this.endIndex,
            visibleCount: this.visibleItems.length,
            totalItems: this.items.length
        });
    }

    /**
     * Create item element (to be overridden)
     * @param {Object} item - Item data
     * @param {number} index - Item index
     * @returns {HTMLElement} Item element
     */
    createItemElement(item, index) {
        const element = document.createElement('div');
        element.textContent = `Item ${index}: ${JSON.stringify(item)}`;
        return element;
    }

    /**
     * Scroll to specific item
     * @param {number} index - Item index
     */
    scrollToItem(index) {
        const targetScrollTop = index * this.itemHeight;
        this.viewport.scrollTop = targetScrollTop;
    }

    /**
     * Get current scroll info
     * @returns {Object} Scroll information
     */
    getScrollInfo() {
        return {
            scrollTop: this.scrollTop,
            containerHeight: this.containerHeight,
            totalHeight: this.totalHeight,
            startIndex: this.startIndex,
            endIndex: this.endIndex,
            visibleCount: this.visibleItems.length,
            totalItems: this.items.length
        };
    }
}

/**
 * Memory management utilities
 */
class MemoryManager {
    constructor() {
        this.observers = [];
        this.cleanupTasks = [];
        this.memoryThreshold = 50 * 1024 * 1024; // 50MB
        this.checkInterval = 30000; // 30 seconds
        this.isMonitoring = false;
    }

    /**
     * Start memory monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, this.checkInterval);

        debugLog.log('🧠 Memory monitoring started');
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        debugLog.log('🧠 Memory monitoring stopped');
    }

    /**
     * Check current memory usage
     */
    checkMemoryUsage() {
        if (!performance.memory) return;

        const memInfo = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
        };

        debugLog.log('🧠 Memory usage:', {
            used: this.formatBytes(memInfo.used),
            total: this.formatBytes(memInfo.total),
            limit: this.formatBytes(memInfo.limit),
            percentage: Math.round((memInfo.used / memInfo.limit) * 100)
        });

        // Trigger cleanup if memory usage is high
        if (memInfo.used > this.memoryThreshold) {
            this.performCleanup();
        }

        eventBus.emit('memory:usage', memInfo);
    }

    /**
     * Perform memory cleanup
     */
    performCleanup() {
        debugLog.log('🧹 Performing memory cleanup...');

        // Run registered cleanup tasks
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                debugLog.warn('Cleanup task failed:', error);
            }
        });

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }

        eventBus.emit('memory:cleanup:performed');
    }

    /**
     * Register cleanup task
     * @param {Function} task - Cleanup function
     */
    registerCleanupTask(task) {
        if (typeof task === 'function') {
            this.cleanupTasks.push(task);
        }
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get memory statistics
     * @returns {Object} Memory statistics
     */
    getMemoryStats() {
        if (!performance.memory) {
            return { available: false };
        }

        return {
            available: true,
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            usedFormatted: this.formatBytes(performance.memory.usedJSHeapSize),
            totalFormatted: this.formatBytes(performance.memory.totalJSHeapSize),
            limitFormatted: this.formatBytes(performance.memory.jsHeapSizeLimit),
            percentage: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
        };
    }
}

/**
 * Performance optimization manager
 */
class PerformanceOptimizer {
    constructor() {
        this.taskIndex = new TaskIndex();
        this.memoryManager = new MemoryManager();
        this.virtualScrollers = new Map();
        this.performanceMetrics = {
            renderTimes: [],
            searchTimes: [],
            memoryUsage: []
        };
        
        this.init();
    }

    /**
     * Initialize performance optimizer
     */
    init() {
        // Start memory monitoring in debug mode
        try {
            if (settingsManager.get('debugMode')) {
                this.memoryManager.startMonitoring();
            }
        } catch (e) {
            // Silently fail if settings not available - debug mode off by default
        }

        // Register cleanup tasks
        this.memoryManager.registerCleanupTask(() => {
            this.cleanupVirtualScrollers();
        });

        // Set up event listeners
        eventBus.on('tasks:changed', this.handleTasksChanged.bind(this));
        eventBus.on('board:switched', this.handleBoardSwitched.bind(this));
        
        debugLog.log('⚡ Performance optimizer initialized');
    }

    /**
     * Handle tasks changed event
     * @param {Object} data - Event data
     */
    handleTasksChanged(data) {
        if (data && data.tasksByStatus) {
            const allTasks = Object.values(data.tasksByStatus).flat();
            this.taskIndex.buildIndex(allTasks, data.boardId);
        }
    }

    /**
     * Handle board switched event
     * @param {Object} data - Event data
     */
    handleBoardSwitched(data) {
        // Clear virtual scrollers for previous board
        this.cleanupVirtualScrollers();
    }

    /**
     * Create virtual scroller for large task lists
     * @param {HTMLElement} container - Container element
     * @param {Array} tasks - Tasks to display
     * @param {Function} itemRenderer - Function to render individual items
     * @returns {VirtualScroller} Virtual scroller instance
     */
    createVirtualScroller(container, tasks, itemRenderer) {
        const scroller = new VirtualScroller(container, {
            itemHeight: 80,
            bufferSize: 10
        });

        // Override item creation
        scroller.createItemElement = itemRenderer;
        scroller.setItems(tasks);

        // Store reference for cleanup
        const scrollerId = `scroller-${Date.now()}-${Math.random()}`;
        this.virtualScrollers.set(scrollerId, scroller);

        return scroller;
    }

    /**
     * Perform optimized task search
     * @param {Array} tasks - Tasks to search
     * @param {Object} criteria - Search criteria
     * @returns {Array} Filtered tasks
     */
    searchTasks(tasks, criteria) {
        const startTime = performance.now();

        let results;

        // Use index if available and criteria is suitable
        if (this.taskIndex.initialized && this.shouldUseIndex(criteria)) {
            const matchingIds = this.taskIndex.search(criteria);
            results = tasks.filter(task => matchingIds.has(task.id));
        } else {
            // Fall back to linear search
            results = this.linearSearch(tasks, criteria);
        }

        const endTime = performance.now();
        const searchTime = endTime - startTime;
        
        this.performanceMetrics.searchTimes.push(searchTime);
        
        debugLog.log('🔍 Search completed', {
            criteria,
            resultCount: results.length,
            totalTasks: tasks.length,
            searchTime: `${searchTime.toFixed(2)}ms`,
            usedIndex: this.taskIndex.initialized && this.shouldUseIndex(criteria)
        });

        return results;
    }

    /**
     * Check if index should be used for search criteria
     * @param {Object} criteria - Search criteria
     * @returns {boolean} Whether to use index
     */
    shouldUseIndex(criteria) {
        // Use index for status, text, or date searches
        return criteria.status || criteria.text || criteria.date || criteria.boardId;
    }

    /**
     * Linear search fallback
     * @param {Array} tasks - Tasks to search
     * @param {Object} criteria - Search criteria
     * @returns {Array} Filtered tasks
     */
    linearSearch(tasks, criteria) {
        return tasks.filter(task => {
            if (criteria.status && task.status !== criteria.status) {
                return false;
            }
            
            if (criteria.text && !task.text.toLowerCase().includes(criteria.text.toLowerCase())) {
                return false;
            }
            
            if (criteria.date) {
                const taskDate = task.createdDate ? task.createdDate.split('T')[0] : null;
                if (taskDate !== criteria.date) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Optimize DOM rendering for large datasets
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Items to render
     * @param {Function} renderer - Render function
     */
    optimizedRender(container, items, renderer) {
        const startTime = performance.now();

        // Use document fragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        
        // Batch DOM updates
        requestAnimationFrame(() => {
            items.forEach(item => {
                const element = renderer(item);
                if (element) {
                    fragment.appendChild(element);
                }
            });

            // Single DOM update
            container.innerHTML = '';
            container.appendChild(fragment);

            const endTime = performance.now();
            const renderTime = endTime - startTime;
            
            this.performanceMetrics.renderTimes.push(renderTime);
            
            debugLog.log('🎨 Optimized render completed', {
                itemCount: items.length,
                renderTime: `${renderTime.toFixed(2)}ms`
            });
        });
    }

    /**
     * Clean up virtual scrollers
     */
    cleanupVirtualScrollers() {
        this.virtualScrollers.forEach((scroller, id) => {
            if (scroller.viewport && scroller.viewport.parentNode) {
                scroller.viewport.removeEventListener('scroll', scroller.handleScroll);
            }
        });
        this.virtualScrollers.clear();
    }

    /**
     * Get performance statistics
     * @returns {Object} Performance statistics
     */
    getPerformanceStats() {
        const avgRenderTime = this.performanceMetrics.renderTimes.length > 0 
            ? this.performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.renderTimes.length 
            : 0;

        const avgSearchTime = this.performanceMetrics.searchTimes.length > 0
            ? this.performanceMetrics.searchTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.searchTimes.length
            : 0;

        return {
            taskIndex: this.taskIndex.getStats(),
            memory: this.memoryManager.getMemoryStats(),
            virtualScrollers: this.virtualScrollers.size,
            averageRenderTime: avgRenderTime,
            averageSearchTime: avgSearchTime,
            totalRenders: this.performanceMetrics.renderTimes.length,
            totalSearches: this.performanceMetrics.searchTimes.length
        };
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.memoryManager.stopMonitoring();
        this.cleanupVirtualScrollers();
        this.taskIndex = null;
        this.performanceMetrics = null;
    }
}

// Export singleton instance
export default new PerformanceOptimizer();