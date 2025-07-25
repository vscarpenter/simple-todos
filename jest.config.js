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
    '!scripts/app.js', // Exclude legacy monolithic version
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Coverage thresholds - improved for comprehensive testing
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70
    },
    // Per-file thresholds for critical modules
    'scripts/modules/models.js': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    'scripts/modules/eventBus.js': {
      branches: 85,
      functions: 90,
      lines: 95,
      statements: 95
    },
    'scripts/modules/security.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
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