/**
 * StorageHelper - Utilities for localStorage manipulation and test data seeding
 * Provides methods for managing test data and storage operations
 */
class StorageHelper {
  /**
   * Clear all storage data (IndexedDB and localStorage)
   * @param {Page} page - Playwright page object
   */
  static async clearStorage(page) {
    await page.evaluate(async () => {
      // Clear IndexedDB
      if (window.indexedDB) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              return new Promise((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            })
          );
        } catch (error) {
          console.warn('Failed to clear IndexedDB:', error);
        }
      }
      
      // Clear localStorage if available
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
      
      // Clear sessionStorage if available
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }
    });
  }

  /**
   * Seed test data into localStorage
   * @param {Page} page - Playwright page object
   * @param {Object} data - Test data to seed
   */
  static async seedTestData(page, data) {
    await page.evaluate((testData) => {
      // Clear existing data first
      localStorage.clear();
      
      // Set up the basic storage structure
      const storageData = {
        version: '1.0.0',
        boards: testData.boards || [],
        currentBoardId: testData.currentBoardId || (testData.boards?.[0]?.id || null),
        settings: testData.settings || {
          theme: 'light',
          autoArchive: false,
          archiveAfterDays: 30
        },
        archive: testData.archive || []
      };
      
      // Store the main data
      localStorage.setItem('cascade-data', JSON.stringify(storageData));
      
      // Store any additional custom data
      if (testData.customStorage) {
        Object.entries(testData.customStorage).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
      }
    }, data);
  }

  /**
   * Get all localStorage contents
   * @param {Page} page - Playwright page object
   * @returns {Object} All localStorage data
   */
  static async getStorageContents(page) {
    return await page.evaluate(() => {
      const allData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        try {
          allData[key] = JSON.parse(value);
        } catch (e) {
          allData[key] = value;
        }
      }
      return allData;
    });
  }

  /**
   * Get specific storage item
   * @param {Page} page - Playwright page object
   * @param {string} key - Storage key
   * @returns {*} Parsed storage value
   */
  static async getStorageItem(page, key) {
    return await page.evaluate((storageKey) => {
      const value = localStorage.getItem(storageKey);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }, key);
  }

  /**
   * Set specific storage item
   * @param {Page} page - Playwright page object
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  static async setStorageItem(page, key, value) {
    await page.evaluate(({ storageKey, storageValue }) => {
      localStorage.setItem(storageKey, JSON.stringify(storageValue));
    }, { storageKey: key, storageValue: value });
  }

  /**
   * Simulate storage quota exceeded error
   * @param {Page} page - Playwright page object
   */
  static async simulateStorageQuotaExceeded(page) {
    await page.evaluate(() => {
      // Override localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      };
      
      // Store original method for restoration
      window._originalSetItem = originalSetItem;
    });
  }

  /**
   * Restore normal storage functionality after quota simulation
   * @param {Page} page - Playwright page object
   */
  static async restoreStorageFunctionality(page) {
    await page.evaluate(() => {
      if (window._originalSetItem) {
        localStorage.setItem = window._originalSetItem;
        delete window._originalSetItem;
      }
    });
  }

  /**
   * Corrupt storage data to test error handling
   * @param {Page} page - Playwright page object
   * @param {string} key - Storage key to corrupt (defaults to main data)
   */
  static async corruptStorageData(page, key = 'cascade-data') {
    await page.evaluate((storageKey) => {
      // Set invalid JSON data
      localStorage.setItem(storageKey, '{"invalid": json data}');
    }, key);
  }

  /**
   * Create test data with specified number of boards and tasks
   * @param {number} boardCount - Number of boards to create
   * @param {number} tasksPerBoard - Number of tasks per board
   * @returns {Object} Generated test data
   */
  static createLargeTestDataset(boardCount = 5, tasksPerBoard = 200) {
    const boards = [];
    
    for (let i = 1; i <= boardCount; i++) {
      const tasks = [];
      
      for (let j = 1; j <= tasksPerBoard; j++) {
        const statuses = ['todo', 'doing', 'done'];
        const status = statuses[j % 3];
        
        tasks.push({
          id: `task-${i}-${j}`,
          text: `Task ${j} for Board ${i} - ${this.generateRandomText()}`,
          status: status,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          tags: this.generateRandomTags(),
          priority: Math.floor(Math.random() * 3) + 1
        });
      }
      
      boards.push({
        id: `board-${i}`,
        name: `Test Board ${i}`,
        color: this.getRandomColor(),
        tasks: tasks,
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        settings: {
          autoArchive: i % 2 === 0,
          archiveAfterDays: 30 + (i * 10)
        }
      });
    }
    
    return {
      boards: boards,
      currentBoardId: boards[0]?.id || null,
      settings: {
        theme: 'light',
        autoArchive: true,
        archiveAfterDays: 30
      },
      archive: this.generateArchivedTasks(50)
    };
  }

  /**
   * Generate random text for task content
   * @returns {string} Random text
   */
  static generateRandomText() {
    const words = [
      'implement', 'feature', 'bug', 'fix', 'update', 'refactor', 'test',
      'documentation', 'review', 'optimize', 'deploy', 'configure', 'setup',
      'analyze', 'design', 'prototype', 'validate', 'integrate', 'monitor'
    ];
    
    const length = Math.floor(Math.random() * 5) + 2;
    const selectedWords = [];
    
    for (let i = 0; i < length; i++) {
      selectedWords.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    return selectedWords.join(' ');
  }

  /**
   * Generate random tags for tasks
   * @returns {Array} Array of random tags
   */
  static generateRandomTags() {
    const allTags = ['urgent', 'bug', 'feature', 'enhancement', 'documentation', 'testing'];
    const tagCount = Math.floor(Math.random() * 3);
    const tags = [];
    
    for (let i = 0; i < tagCount; i++) {
      const tag = allTags[Math.floor(Math.random() * allTags.length)];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * Get random color for boards
   * @returns {string} Random color
   */
  static getRandomColor() {
    const colors = ['blue', 'green', 'red', 'purple', 'orange', 'teal'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Generate archived tasks for testing
   * @param {number} count - Number of archived tasks
   * @returns {Array} Array of archived tasks
   */
  static generateArchivedTasks(count = 50) {
    const archivedTasks = [];
    
    for (let i = 1; i <= count; i++) {
      archivedTasks.push({
        id: `archived-task-${i}`,
        text: `Archived Task ${i} - ${this.generateRandomText()}`,
        status: 'done',
        boardId: `board-${Math.floor(Math.random() * 3) + 1}`,
        archivedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - Math.random() * 100 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return archivedTasks;
  }

  /**
   * Create minimal test data for basic tests
   * @returns {Object} Minimal test data
   */
  static createMinimalTestData() {
    return {
      boards: [
        {
          id: 'test-board-1',
          name: 'Test Project',
          color: 'blue',
          tasks: [
            {
              id: 'task-1',
              text: 'Sample todo task',
              status: 'todo',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'task-2',
              text: 'Sample in progress task',
              status: 'doing',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'task-3',
              text: 'Sample completed task',
              status: 'done',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString()
        }
      ],
      currentBoardId: 'test-board-1',
      settings: {
        theme: 'light',
        autoArchive: false,
        archiveAfterDays: 30
      },
      archive: []
    };
  }

  /**
   * Wait for storage operations to complete
   * @param {Page} page - Playwright page object
   * @param {number} timeout - Timeout in milliseconds
   */
  static async waitForStorageSync(page, timeout = 1000) {
    await page.waitForTimeout(timeout);
    
    // Wait for any pending storage operations
    await page.waitForFunction(() => {
      return !window.cascadeApp?.storage?.isPending;
    }, { timeout });
  }

  /**
   * Verify storage data integrity
   * @param {Page} page - Playwright page object
   * @returns {Object} Validation results
   */
  static async verifyStorageIntegrity(page) {
    return await page.evaluate(() => {
      const data = localStorage.getItem('cascade-data');
      if (!data) {
        return { valid: false, error: 'No data found' };
      }
      
      try {
        const parsed = JSON.parse(data);
        
        // Check required fields
        const requiredFields = ['version', 'boards', 'currentBoardId', 'settings'];
        const missingFields = requiredFields.filter(field => !(field in parsed));
        
        if (missingFields.length > 0) {
          return { 
            valid: false, 
            error: `Missing required fields: ${missingFields.join(', ')}` 
          };
        }
        
        // Validate boards structure
        if (!Array.isArray(parsed.boards)) {
          return { valid: false, error: 'Boards must be an array' };
        }
        
        // Validate each board
        for (const board of parsed.boards) {
          if (!board.id || !board.name || !Array.isArray(board.tasks)) {
            return { 
              valid: false, 
              error: `Invalid board structure: ${board.id || 'unknown'}` 
            };
          }
        }
        
        return { valid: true, data: parsed };
      } catch (e) {
        return { valid: false, error: `JSON parse error: ${e.message}` };
      }
    });
  }
}

export { StorageHelper };