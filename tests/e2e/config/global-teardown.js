/**
 * Global teardown for Playwright E2E tests
 * Handles cleanup after all tests complete
 */

async function globalTeardown() {
  console.log('🧹 Starting Playwright E2E test teardown...');
  
  // Clean up any global test artifacts
  try {
    // Clear any test environment variables
    delete process.env.PLAYWRIGHT_TEST_MODE;
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Error during global teardown:', error.message);
  }
}

export default globalTeardown;