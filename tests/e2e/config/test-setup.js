/**
 * Test setup utilities for Playwright E2E tests
 * Provides common setup and teardown functionality for individual tests
 */

import { expect } from '@playwright/test';

/**
 * Custom test setup for Cascade Task Management E2E tests
 */
export class TestSetup {
  constructor(page) {
    this.page = page;
  }
  
  /**
   * Initialize a fresh application state for testing
   */
  async initializeApp() {
    // Clear localStorage to start with clean state
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Navigate to the application
    await this.page.goto('/', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    // Wait for the application to fully load
    await this.page.waitForSelector('#app', { timeout: 10000 });
    await this.page.waitForSelector('.task-board', { timeout: 10000 });
    
    // Verify the application is in a ready state
    await expect(this.page.locator('#app')).toBeVisible();
    await expect(this.page.locator('.task-board')).toBeVisible();
  }
  
  /**
   * Seed the application with test data
   */
  async seedTestData(data) {
    await this.page.evaluate((testData) => {
      localStorage.setItem('cascade_data', JSON.stringify(testData));
    }, data);
    
    // Reload to apply the seeded data
    await this.page.reload({ waitUntil: 'networkidle' });
    await this.page.waitForSelector('.task-board', { timeout: 10000 });
  }
  
  /**
   * Take a screenshot for debugging
   */
  async takeDebugScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/debug-screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }
  
  /**
   * Wait for application to be idle (no pending operations)
   */
  async waitForAppIdle() {
    // Wait for any animations or transitions to complete
    await this.page.waitForTimeout(100);
    
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
    
    // Wait for any pending JavaScript operations
    await this.page.evaluate(() => {
      return new Promise(resolve => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(resolve);
        } else {
          setTimeout(resolve, 50);
        }
      });
    });
  }
  
  /**
   * Get current application state from localStorage
   */
  async getAppState() {
    return await this.page.evaluate(() => {
      const data = localStorage.getItem('cascade_data');
      return data ? JSON.parse(data) : null;
    });
  }
  
  /**
   * Verify accessibility basics are in place
   */
  async verifyAccessibilityBasics() {
    // Check for basic accessibility attributes
    await expect(this.page.locator('html')).toHaveAttribute('lang');
    await expect(this.page.locator('title')).toHaveCount(1);
    
    // Verify skip links are present
    const skipLinks = this.page.locator('a[href^="#"]').first();
    if (await skipLinks.count() > 0) {
      await expect(skipLinks).toHaveAttribute('href');
    }
  }
  
  /**
   * Clean up after test
   */
  async cleanup() {
    // Clear any test data
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}

/**
 * Test data fixtures for consistent testing
 */
export const testData = {
  sampleBoard: {
    id: 'test-board-1',
    name: 'Test Project',
    tasks: [
      { id: 'task-1', text: 'Sample task', status: 'todo', createdAt: Date.now() },
      { id: 'task-2', text: 'In progress task', status: 'doing', createdAt: Date.now() },
      { id: 'task-3', text: 'Completed task', status: 'done', createdAt: Date.now() }
    ]
  },
  
  multipleBoards: {
    boards: [
      {
        id: 'board-1',
        name: 'Project Alpha',
        tasks: [
          { id: 'task-1', text: 'Alpha task 1', status: 'todo', createdAt: Date.now() }
        ]
      },
      {
        id: 'board-2', 
        name: 'Project Beta',
        tasks: [
          { id: 'task-2', text: 'Beta task 1', status: 'doing', createdAt: Date.now() }
        ]
      }
    ],
    currentBoardId: 'board-1'
  },
  
  largeDataset: {
    // Generate 100 tasks for performance testing
    boards: [{
      id: 'large-board',
      name: 'Large Dataset Test',
      tasks: Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i + 1}`,
        text: `Task ${i + 1} - Performance test task with some description`,
        status: ['todo', 'doing', 'done'][i % 3],
        createdAt: Date.now() - (i * 1000)
      }))
    }],
    currentBoardId: 'large-board'
  }
};