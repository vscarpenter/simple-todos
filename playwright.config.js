import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Cascade Task Management E2E tests
 * Supports multi-browser testing, CI/CD integration, and comprehensive reporting
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory structure
  testDir: './tests/e2e',
  
  // Global test settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Timeout configuration
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 5 * 1000, // 5 seconds for assertions
  },
  
  // Reporter configuration for multiple output formats
  reporter: [
    ['html', { 
      outputFolder: 'test-results/playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { 
      outputFile: 'test-results/playwright-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/playwright-junit.xml' 
    }],
    ['line'], // Console output
    ...(process.env.CI ? [['github']] : []) // GitHub Actions integration
  ],
  
  // Global test configuration
  use: {
    // Base URL for all tests
    baseURL: process.env.BASE_URL || 'http://localhost:8000',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Artifact collection
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    // Accessibility testing
    colorScheme: 'light',
    
    // Performance and reliability
    actionTimeout: 10 * 1000, // 10 seconds for actions
    navigationTimeout: 15 * 1000, // 15 seconds for navigation
  },
  
  // Browser projects for cross-browser testing
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable additional Chrome features for testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ]
        }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific configuration
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'dom.push.enabled': false
          }
        }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // WebKit/Safari specific settings for drag & drop compatibility
        hasTouch: false
      },
    },
    
    // Mobile browsers for responsive testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        hasTouch: true
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true
      },
    },
    
    // Tablet testing
    {
      name: 'tablet',
      use: { 
        ...devices['iPad Pro'],
        hasTouch: true
      },
    },
    
    // Accessibility-focused testing project
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'dark', // Test dark mode
        reducedMotion: 'reduce', // Test reduced motion
        forcedColors: 'active' // Test high contrast mode
      },
      testMatch: '**/accessibility.spec.js'
    },
    
    // Performance testing project
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Simulate slower network for performance testing
        launchOptions: {
          args: ['--disable-backgrounding-occluded-windows']
        }
      },
      testMatch: '**/performance.spec.js'
    }
  ],
  
  // Web server configuration for local development and CI
  webServer: [
    {
      command: process.env.CI ? 'npm run start' : 'python3 -m http.server 8000',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes startup timeout
      env: {
        NODE_ENV: 'test'
      }
    }
  ],
  
  // Output directories
  outputDir: 'test-results/playwright-artifacts',
  
  // Global setup and teardown
  globalSetup: './tests/e2e/config/global-setup.js',
  globalTeardown: './tests/e2e/config/global-teardown.js',
  
  // Test metadata
  metadata: {
    'test-type': 'e2e',
    'application': 'cascade-task-management',
    'version': process.env.npm_package_version || '2.1.0'
  }
});