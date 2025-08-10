/**
 * Test fixtures verification
 * Basic tests to ensure Page Object Model classes and helpers work correctly
 */

import { test, expect } from '@playwright/test';
import { 
  BasePage, 
  StorageHelper, 
  DragDropHelper, 
  AccessibilityHelper,
  testData,
  selectors 
} from './index.js';

test.describe('Page Object Model and Helpers', () => {
  let page;
  let basePage;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    basePage = new BasePage(page);
  });

  test('BasePage - should navigate to app and wait for load', async () => {
    await basePage.navigateToApp();
    
    // Verify app loaded
    await expect(page.locator(selectors.app)).toBeVisible();
    await expect(page.locator(selectors.taskBoard)).toBeVisible();
    
    // Verify URL is correct
    const url = await basePage.getCurrentURL();
    expect(url).toContain('localhost:8000');
  });

  test('BasePage - should handle localStorage operations', async () => {
    await basePage.navigateToApp();
    
    // Test setting and getting localStorage data
    const testData = { test: 'value', number: 123 };
    await basePage.setLocalStorageData('test-key', testData);
    
    const retrievedData = await basePage.getLocalStorageData('test-key');
    expect(retrievedData).toEqual(testData);
    
    // Test getting all localStorage data
    const allData = await basePage.getLocalStorageData();
    expect(allData).toHaveProperty('test-key');
    
    // Test clearing localStorage
    await basePage.clearLocalStorage();
    const clearedData = await basePage.getLocalStorageData('test-key');
    expect(clearedData).toBeNull();
  });

  test('StorageHelper - should seed and retrieve test data', async () => {
    await basePage.navigateToApp();
    
    // Seed minimal test data
    await StorageHelper.seedTestData(page, testData.minimal);
    
    // Verify data was seeded correctly
    const storageContents = await StorageHelper.getStorageContents(page);
    expect(storageContents).toHaveProperty('cascade-data');
    
    const cascadeData = storageContents['cascade-data'];
    expect(cascadeData.boards).toHaveLength(1);
    expect(cascadeData.boards[0].name).toBe('Test Project');
    expect(cascadeData.boards[0].tasks).toHaveLength(3);
  });

  test('StorageHelper - should create large test dataset', async () => {
    const largeDataset = StorageHelper.createLargeTestDataset(3, 10);
    
    expect(largeDataset.boards).toHaveLength(3);
    expect(largeDataset.boards[0].tasks).toHaveLength(10);
    expect(largeDataset.archive).toHaveLength(50);
    
    // Verify data structure
    largeDataset.boards.forEach(board => {
      expect(board).toHaveProperty('id');
      expect(board).toHaveProperty('name');
      expect(board).toHaveProperty('tasks');
      expect(Array.isArray(board.tasks)).toBe(true);
    });
  });

  test('StorageHelper - should handle storage corruption simulation', async () => {
    await basePage.navigateToApp();
    
    // Seed normal data first
    await StorageHelper.seedTestData(page, testData.minimal);
    
    // Corrupt the data
    await StorageHelper.corruptStorageData(page);
    
    // Verify data is corrupted
    const integrity = await StorageHelper.verifyStorageIntegrity(page);
    expect(integrity.valid).toBe(false);
    expect(integrity.error).toContain('JSON parse error');
  });

  test('DragDropHelper - should detect drag and drop capabilities', async () => {
    await basePage.navigateToApp();
    
    const capabilities = await DragDropHelper.getDragDropCapabilities(page);
    
    expect(capabilities).toHaveProperty('dragAndDropAPI');
    expect(capabilities).toHaveProperty('touchEvents');
    expect(capabilities).toHaveProperty('pointerEvents');
    expect(capabilities).toHaveProperty('mouseEvents');
    expect(capabilities).toHaveProperty('browserName');
    expect(capabilities).toHaveProperty('dragEventsSupported');
  });

  test('AccessibilityHelper - should inject axe-core and run basic audit', async () => {
    await basePage.navigateToApp();
    
    // Run basic accessibility audit
    const results = await AccessibilityHelper.runAxeAudit(page, {
      tags: ['wcag2a']
    });
    
    expect(results).toHaveProperty('success');
    expect(results).toHaveProperty('violations');
    expect(results).toHaveProperty('passes');
    expect(results).toHaveProperty('summary');
    
    // Results should be an object with expected structure
    expect(Array.isArray(results.violations)).toBe(true);
    expect(typeof results.passes).toBe('number');
    expect(typeof results.summary.total).toBe('number');
  });

  test('AccessibilityHelper - should test keyboard navigation', async () => {
    await basePage.navigateToApp();
    
    const navigationResults = await AccessibilityHelper.testKeyboardNavigation(page);
    
    expect(navigationResults).toHaveProperty('success');
    expect(navigationResults).toHaveProperty('focusableElements');
    expect(navigationResults).toHaveProperty('tabOrder');
    expect(navigationResults).toHaveProperty('issues');
    
    expect(Array.isArray(navigationResults.focusableElements)).toBe(true);
    expect(Array.isArray(navigationResults.tabOrder)).toBe(true);
    expect(Array.isArray(navigationResults.issues)).toBe(true);
  });

  test('AccessibilityHelper - should test screen reader announcements', async () => {
    await basePage.navigateToApp();
    
    const screenReaderResults = await AccessibilityHelper.testScreenReaderAnnouncements(page);
    
    expect(screenReaderResults).toHaveProperty('success');
    expect(screenReaderResults).toHaveProperty('ariaLabels');
    expect(screenReaderResults).toHaveProperty('liveRegions');
    expect(screenReaderResults).toHaveProperty('headingStructure');
    expect(screenReaderResults).toHaveProperty('issues');
    
    expect(Array.isArray(screenReaderResults.ariaLabels)).toBe(true);
    expect(Array.isArray(screenReaderResults.liveRegions)).toBe(true);
    expect(Array.isArray(screenReaderResults.headingStructure)).toBe(true);
  });

  test('AccessibilityHelper - should generate comprehensive report', async () => {
    await basePage.navigateToApp();
    
    const report = await AccessibilityHelper.generateAccessibilityReport(page);
    
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('url');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('tests');
    
    expect(report.summary).toHaveProperty('passed');
    expect(report.summary).toHaveProperty('totalIssues');
    expect(report.summary).toHaveProperty('criticalIssues');
    expect(report.summary).toHaveProperty('warnings');
    
    expect(report.tests).toHaveProperty('axeAudit');
    expect(report.tests).toHaveProperty('keyboardNavigation');
    expect(report.tests).toHaveProperty('screenReader');
    expect(report.tests).toHaveProperty('colorContrast');
    expect(report.tests).toHaveProperty('highContrast');
  });

  test('Test data fixtures - should provide valid test data structures', () => {
    // Test minimal data structure
    expect(testData.minimal).toHaveProperty('boards');
    expect(testData.minimal).toHaveProperty('currentBoardId');
    expect(testData.minimal).toHaveProperty('settings');
    expect(testData.minimal).toHaveProperty('archive');
    
    // Test multi-board data structure
    expect(testData.multiBoard.boards).toHaveLength(2);
    expect(testData.multiBoard.boards[0]).toHaveProperty('id');
    expect(testData.multiBoard.boards[0]).toHaveProperty('name');
    expect(testData.multiBoard.boards[0]).toHaveProperty('tasks');
    
    // Test empty data structure
    expect(testData.empty.boards).toHaveLength(0);
    expect(testData.empty.currentBoardId).toBeNull();
    
    // Test archived data structure
    expect(testData.withArchive.archive).toHaveLength(2);
    expect(testData.withArchive.archive[0]).toHaveProperty('archivedAt');
  });

  test('Selectors - should be properly defined', () => {
    // Test that all required selectors are defined
    expect(selectors.app).toBeDefined();
    expect(selectors.taskBoard).toBeDefined();
    expect(selectors.taskItem).toBeDefined();
    expect(selectors.todoColumn).toBeDefined();
    expect(selectors.doingColumn).toBeDefined();
    expect(selectors.doneColumn).toBeDefined();
    expect(selectors.boardSelector).toBeDefined();
    expect(selectors.menuButton).toBeDefined();
    
    // Test that selectors are strings
    Object.values(selectors).forEach(selector => {
      expect(typeof selector).toBe('string');
      expect(selector.length).toBeGreaterThan(0);
    });
  });
});