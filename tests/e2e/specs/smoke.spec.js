/**
 * Smoke tests for Cascade Task Management
 * Basic tests to verify the application loads and core functionality works
 */

import { test, expect } from '@playwright/test';
import { TestSetup } from '../config/test-setup.js';

test.describe('Application Smoke Tests', () => {
  let testSetup;
  
  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);
    await testSetup.initializeApp();
  });
  
  test.afterEach(async () => {
    await testSetup.cleanup();
  });
  
  test('should load the application successfully', async ({ page }) => {
    // Verify the page title
    await expect(page).toHaveTitle(/Cascade/);
    
    // Verify main application elements are present
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('.task-board')).toBeVisible();
    
    // Verify the three columns are present
    await expect(page.locator('.column[data-status="todo"]')).toBeVisible();
    await expect(page.locator('.column[data-status="doing"]')).toBeVisible();
    await expect(page.locator('.column[data-status="done"]')).toBeVisible();
  });
  
  test('should have proper accessibility basics', async ({ page }) => {
    await testSetup.verifyAccessibilityBasics();
    
    // Verify main landmarks
    await expect(page.locator('main, [role="main"]')).toBeVisible();
    
    // Verify heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toBeVisible();
  });
  
  test('should be responsive on different viewport sizes', async ({ page }) => {
    // Test desktop viewport (default)
    await expect(page.locator('.task-board')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.task-board')).toBeVisible();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.task-board')).toBeVisible();
  });
  
  test('should handle basic keyboard navigation', async ({ page }) => {
    // Focus should be manageable with keyboard
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
  
  test('should persist data in localStorage', async ({ page }) => {
    // Check that localStorage is accessible
    const storageData = await page.evaluate(() => {
      return localStorage.getItem('cascade_data');
    });
    
    // Should either be null (fresh install) or valid JSON
    if (storageData) {
      expect(() => JSON.parse(storageData)).not.toThrow();
    }
  });
});