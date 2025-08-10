/**
 * BasePage - Base class for all Page Object Model classes
 * Provides common navigation, screenshot, and accessibility methods
 */
class BasePage {
  constructor(page) {
    this.page = page;
    this.baseURL = 'http://localhost:8000';
  }

  /**
   * Navigate to the main application
   */
  async navigateToApp() {
    await this.page.goto(this.baseURL);
    await this.waitForAppLoad();
  }

  /**
   * Wait for the application to fully load
   */
  async waitForAppLoad() {
    // Wait for the main app container to be visible
    await this.page.waitForSelector('#todo-app', { state: 'visible' });
    
    // Wait for the task board to be initialized
    await this.page.waitForSelector('.task-board', { state: 'visible' });
    
    // Wait for any loading states to complete
    await this.page.waitForFunction(() => {
      return !document.querySelector('.loading');
    });

    // Ensure JavaScript modules are loaded and DOM is ready
    await this.page.waitForFunction(() => {
      return document.readyState === 'complete' && 
             document.querySelector('#todo-input') !== null &&
             document.querySelector('#todo-list') !== null;
    });
  }

  /**
   * Take a screenshot with optional name
   * @param {string} name - Screenshot name (optional)
   */
  async takeScreenshot(name = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotName = name ? `${name}-${timestamp}` : `screenshot-${timestamp}`;
    
    await this.page.screenshot({
      path: `test-results/screenshots/${screenshotName}.png`,
      fullPage: true
    });
    
    return screenshotName;
  }

  /**
   * Check accessibility using axe-core
   * @param {Object} options - Axe configuration options
   */
  async checkAccessibility(options = {}) {
    const { AccessibilityHelper } = await import('../helpers/accessibility-helper.js');
    return await AccessibilityHelper.runAxeAudit(this.page, options);
  }

  /**
   * Get localStorage data
   * @param {string} key - Storage key (optional, returns all if not specified)
   */
  async getLocalStorageData(key = null) {
    return await this.page.evaluate((storageKey) => {
      if (storageKey) {
        const data = localStorage.getItem(storageKey);
        return data ? JSON.parse(data) : null;
      }
      
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
    }, key);
  }

  /**
   * Set localStorage data
   * @param {string} key - Storage key
   * @param {*} data - Data to store
   */
  async setLocalStorageData(key, data) {
    await this.page.evaluate(({ storageKey, storageData }) => {
      localStorage.setItem(storageKey, JSON.stringify(storageData));
    }, { storageKey: key, storageData: data });
  }

  /**
   * Clear all localStorage data
   */
  async clearLocalStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
  }

  /**
   * Wait for element to be visible
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForElement(selector, timeout = 5000) {
    await this.page.waitForSelector(selector, { 
      state: 'visible', 
      timeout 
    });
  }

  /**
   * Wait for element to be hidden
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForElementHidden(selector, timeout = 5000) {
    await this.page.waitForSelector(selector, { 
      state: 'hidden', 
      timeout 
    });
  }

  /**
   * Click element with retry logic
   * @param {string} selector - CSS selector
   * @param {Object} options - Click options
   */
  async clickElement(selector, options = {}) {
    await this.waitForElement(selector);
    await this.page.click(selector, options);
  }

  /**
   * Type text with proper focus management
   * @param {string} selector - CSS selector
   * @param {string} text - Text to type
   * @param {Object} options - Type options
   */
  async typeText(selector, text, options = {}) {
    await this.waitForElement(selector);
    await this.page.fill(selector, text, options);
  }

  /**
   * Get element text content
   * @param {string} selector - CSS selector
   */
  async getElementText(selector) {
    await this.waitForElement(selector);
    return await this.page.textContent(selector);
  }

  /**
   * Get element count
   * @param {string} selector - CSS selector
   */
  async getElementCount(selector) {
    return await this.page.locator(selector).count();
  }

  /**
   * Check if element exists
   * @param {string} selector - CSS selector
   */
  async elementExists(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Scroll element into view
   * @param {string} selector - CSS selector
   */
  async scrollToElement(selector) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for network to be idle
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForNetworkIdle(timeout = 5000) {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Reload the page and wait for app to load
   */
  async reloadPage() {
    await this.page.reload();
    await this.waitForAppLoad();
  }

  /**
   * Get current URL
   */
  async getCurrentURL() {
    return this.page.url();
  }

  /**
   * Execute JavaScript in the page context
   * @param {Function|string} script - JavaScript to execute
   * @param {...*} args - Arguments to pass to the script
   */
  async executeScript(script, ...args) {
    return await this.page.evaluate(script, ...args);
  }
}

export { BasePage };