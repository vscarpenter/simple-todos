/**
 * Global setup for Playwright E2E tests
 * Handles test environment initialization and cleanup
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting Playwright E2E test setup...');
  
  // Verify test server is accessible
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Wait for the application to be available
    await page.goto('http://localhost:8000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Verify core application elements are present
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForSelector('#todo-app', { timeout: 10000 });
    
    console.log('✅ Application server is ready');
    
    await browser.close();
  } catch (error) {
    console.error('❌ Failed to connect to test server:', error.message);
    throw new Error('Test server is not accessible. Please ensure the application is running on port 8000.');
  }
  
  // Set up test environment variables
  process.env.PLAYWRIGHT_TEST_MODE = 'true';
  
  console.log('✅ Global setup completed successfully');
}

export default globalSetup;