/**
 * DragDropHelper - Cross-browser drag and drop operations
 * Provides methods for handling drag and drop interactions across different browsers
 */
class DragDropHelper {
  /**
   * Perform drag and drop operation
   * @param {Page} page - Playwright page object
   * @param {string} sourceSelector - CSS selector for source element
   * @param {string} targetSelector - CSS selector for target element
   * @param {Object} options - Drag options
   */
  static async dragAndDrop(page, sourceSelector, targetSelector, options = {}) {
    const {
      delay = 100,
      smooth = true,
      force = false,
      timeout = 5000
    } = options;

    // Wait for both elements to be available
    await page.waitForSelector(sourceSelector, { timeout });
    await page.waitForSelector(targetSelector, { timeout });

    // Get browser name for browser-specific handling
    const browserName = page.context().browser().browserType().name();
    
    if (browserName === 'webkit') {
      // Use touch-based drag for WebKit/Safari
      await this.performTouchDrag(page, sourceSelector, targetSelector, options);
    } else {
      // Use mouse-based drag for Chrome/Firefox
      await this.performMouseDrag(page, sourceSelector, targetSelector, options);
    }

    // Wait for any animations or state updates to complete
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }
  }

  /**
   * Perform mouse-based drag and drop
   * @param {Page} page - Playwright page object
   * @param {string} sourceSelector - CSS selector for source element
   * @param {string} targetSelector - CSS selector for target element
   * @param {Object} options - Drag options
   */
  static async performMouseDrag(page, sourceSelector, targetSelector, options = {}) {
    const { smooth = true, force = false } = options;

    // Get element positions
    const sourceElement = page.locator(sourceSelector);
    const targetElement = page.locator(targetSelector);

    const sourceBounds = await sourceElement.boundingBox();
    const targetBounds = await targetElement.boundingBox();

    if (!sourceBounds || !targetBounds) {
      throw new Error('Could not get bounding boxes for drag and drop elements');
    }

    // Calculate center points
    const sourceCenter = {
      x: sourceBounds.x + sourceBounds.width / 2,
      y: sourceBounds.y + sourceBounds.height / 2
    };

    const targetCenter = {
      x: targetBounds.x + targetBounds.width / 2,
      y: targetBounds.y + targetBounds.height / 2
    };

    // Perform the drag operation
    await page.mouse.move(sourceCenter.x, sourceCenter.y);
    await page.mouse.down();

    if (smooth) {
      // Smooth drag with intermediate steps
      const steps = 10;
      const deltaX = (targetCenter.x - sourceCenter.x) / steps;
      const deltaY = (targetCenter.y - sourceCenter.y) / steps;

      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(
          sourceCenter.x + deltaX * i,
          sourceCenter.y + deltaY * i
        );
        await page.waitForTimeout(10);
      }
    } else {
      // Direct drag
      await page.mouse.move(targetCenter.x, targetCenter.y);
    }

    await page.mouse.up();
  }

  /**
   * Perform touch-based drag and drop for WebKit/Safari
   * @param {Page} page - Playwright page object
   * @param {string} sourceSelector - CSS selector for source element
   * @param {string} targetSelector - CSS selector for target element
   * @param {Object} options - Drag options
   */
  static async performTouchDrag(page, sourceSelector, targetSelector, options = {}) {
    const { smooth = true } = options;

    // Use JavaScript to simulate touch events for better WebKit compatibility
    await page.evaluate(({ source, target, smoothDrag }) => {
      const sourceEl = document.querySelector(source);
      const targetEl = document.querySelector(target);

      if (!sourceEl || !targetEl) {
        throw new Error('Source or target element not found');
      }

      const sourceBounds = sourceEl.getBoundingClientRect();
      const targetBounds = targetEl.getBoundingClientRect();

      const sourceCenter = {
        x: sourceBounds.left + sourceBounds.width / 2,
        y: sourceBounds.top + sourceBounds.height / 2
      };

      const targetCenter = {
        x: targetBounds.left + targetBounds.width / 2,
        y: targetBounds.top + targetBounds.height / 2
      };

      // Create touch events
      const createTouchEvent = (type, x, y) => {
        const touch = new Touch({
          identifier: 1,
          target: type === 'touchstart' ? sourceEl : targetEl,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          screenX: x,
          screenY: y
        });

        return new TouchEvent(type, {
          touches: type === 'touchend' ? [] : [touch],
          targetTouches: type === 'touchend' ? [] : [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true
        });
      };

      // Start touch
      sourceEl.dispatchEvent(createTouchEvent('touchstart', sourceCenter.x, sourceCenter.y));

      // Move touch
      if (smoothDrag) {
        const steps = 10;
        const deltaX = (targetCenter.x - sourceCenter.x) / steps;
        const deltaY = (targetCenter.y - sourceCenter.y) / steps;

        for (let i = 1; i <= steps; i++) {
          const currentX = sourceCenter.x + deltaX * i;
          const currentY = sourceCenter.y + deltaY * i;
          
          setTimeout(() => {
            document.dispatchEvent(createTouchEvent('touchmove', currentX, currentY));
          }, i * 10);
        }
      } else {
        document.dispatchEvent(createTouchEvent('touchmove', targetCenter.x, targetCenter.y));
      }

      // End touch
      setTimeout(() => {
        targetEl.dispatchEvent(createTouchEvent('touchend', targetCenter.x, targetCenter.y));
      }, smoothDrag ? 150 : 50);

    }, { 
      source: sourceSelector, 
      target: targetSelector, 
      smoothDrag: smooth 
    });

    // Wait for touch events to complete
    await page.waitForTimeout(200);
  }

  /**
   * Drag task between columns in the task board
   * @param {Page} page - Playwright page object
   * @param {string} taskId - Task ID to drag
   * @param {string} targetColumn - Target column ('todo', 'doing', 'done')
   * @param {Object} options - Drag options
   */
  static async dragTaskBetweenColumns(page, taskId, targetColumn, options = {}) {
    const sourceSelector = `[data-task-id="${taskId}"]`;
    const targetSelector = `[data-column="${targetColumn}"] .task-list`;

    // Verify task exists before dragging
    await page.waitForSelector(sourceSelector);
    
    // Get initial task status for verification
    const initialStatus = await page.getAttribute(sourceSelector, 'data-status');
    
    // Perform the drag operation
    await this.dragAndDrop(page, sourceSelector, targetSelector, options);
    
    // Wait for status update
    await page.waitForFunction(
      ({ taskId, expectedStatus }) => {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        return taskElement && taskElement.getAttribute('data-status') === expectedStatus;
      },
      { taskId, expectedStatus: targetColumn },
      { timeout: 5000 }
    );

    return {
      taskId,
      initialStatus,
      finalStatus: targetColumn,
      success: true
    };
  }

  /**
   * Simulate touch drag for mobile testing
   * @param {Page} page - Playwright page object
   * @param {string} sourceSelector - CSS selector for source element
   * @param {string} targetSelector - CSS selector for target element
   * @param {Object} options - Touch options
   */
  static async simulateTouchDrag(page, sourceSelector, targetSelector, options = {}) {
    const { duration = 1000, steps = 10 } = options;

    // Enable touch events
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: false,
        value: 5
      });
    });

    await this.performTouchDrag(page, sourceSelector, targetSelector, {
      smooth: true,
      ...options
    });
  }

  /**
   * Verify drag feedback is shown during drag operation
   * @param {Page} page - Playwright page object
   * @param {string} sourceSelector - CSS selector for source element
   */
  static async verifyDragFeedback(page, sourceSelector) {
    // Start drag operation
    const sourceElement = page.locator(sourceSelector);
    const bounds = await sourceElement.boundingBox();
    
    if (!bounds) {
      throw new Error('Could not get source element bounds');
    }

    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    await page.mouse.move(center.x, center.y);
    await page.mouse.down();

    // Move slightly to trigger drag feedback
    await page.mouse.move(center.x + 10, center.y + 10);

    // Check for drag feedback elements
    const feedbackVisible = await page.evaluate(() => {
      // Look for common drag feedback indicators
      const dragGhost = document.querySelector('.drag-ghost');
      const dragPreview = document.querySelector('.drag-preview');
      const draggingClass = document.querySelector('.dragging');
      
      return !!(dragGhost || dragPreview || draggingClass);
    });

    // Clean up
    await page.mouse.up();

    return feedbackVisible;
  }

  /**
   * Test drag and drop with keyboard accessibility
   * @param {Page} page - Playwright page object
   * @param {string} sourceSelector - CSS selector for source element
   * @param {string} targetSelector - CSS selector for target element
   */
  static async performKeyboardDrag(page, sourceSelector, targetSelector) {
    // Focus on source element
    await page.focus(sourceSelector);
    
    // Activate drag mode (usually Space or Enter)
    await page.keyboard.press('Space');
    
    // Navigate to target (usually Arrow keys)
    // This is application-specific and would need to be implemented
    // based on the actual keyboard navigation patterns
    
    // For now, we'll simulate the basic pattern
    await page.keyboard.press('ArrowRight'); // Move to next column
    await page.keyboard.press('Space'); // Drop
    
    return true;
  }

  /**
   * Verify drag and drop operation completed successfully
   * @param {Page} page - Playwright page object
   * @param {string} taskId - Task ID that was dragged
   * @param {string} expectedColumn - Expected target column
   * @param {number} timeout - Timeout for verification
   */
  static async verifyDragSuccess(page, taskId, expectedColumn, timeout = 5000) {
    try {
      // Wait for task to appear in target column
      await page.waitForSelector(
        `[data-column="${expectedColumn}"] [data-task-id="${taskId}"]`,
        { timeout }
      );

      // Verify task status was updated
      const taskStatus = await page.getAttribute(
        `[data-task-id="${taskId}"]`,
        'data-status'
      );

      // Verify localStorage was updated
      const storageData = await page.evaluate(() => {
        const data = localStorage.getItem('cascade-data');
        return data ? JSON.parse(data) : null;
      });

      if (!storageData) {
        return { success: false, error: 'No storage data found' };
      }

      // Find the task in storage
      let taskFound = false;
      for (const board of storageData.boards) {
        const task = board.tasks.find(t => t.id === taskId);
        if (task && task.status === expectedColumn) {
          taskFound = true;
          break;
        }
      }

      return {
        success: taskStatus === expectedColumn && taskFound,
        taskStatus,
        storageUpdated: taskFound,
        error: null
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get drag and drop capabilities for current browser
   * @param {Page} page - Playwright page object
   */
  static async getDragDropCapabilities(page) {
    return await page.evaluate(() => {
      const capabilities = {
        dragAndDropAPI: 'draggable' in document.createElement('div'),
        touchEvents: 'ontouchstart' in window,
        pointerEvents: 'onpointerdown' in window,
        mouseEvents: 'onmousedown' in window,
        browserName: navigator.userAgent
      };

      // Test for specific drag and drop features
      const testElement = document.createElement('div');
      testElement.draggable = true;
      
      capabilities.dragEventsSupported = [
        'dragstart', 'drag', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend'
      ].every(eventType => `on${eventType}` in testElement);

      return capabilities;
    });
  }
}

export { DragDropHelper };