/**
 * Jest Configuration for Cascade Task Management
 * Supports ES6 modules and DOM testing
 */

export default {
  // Test environment
  testEnvironment: 'jsdom',
  
  // ES module support
  
  // Transform configuration for ES modules
  transform: {},
  
  // Experimental ESM support
  preset: undefined,
  
  // Module name mapping for imports  
  moduleNameMapper: {
    // Map only our app-specific imports, avoid interfering with node_modules
    '^scripts/(.*)$': '<rootDir>/scripts/$1'
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/app.js', // Legacy file - removed in cleanup
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Coverage thresholds - realistic levels for a simple todo app
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 45,
      lines: 50,
      statements: 50
    },
    // Per-file thresholds for critical modules
    'scripts/modules/models.js': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    'scripts/modules/eventBus.js': {
      branches: 70,
      functions: 60,
      lines: 75,
      statements: 75
    },
    'scripts/modules/security.js': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true
};