# Testing Documentation

## Overview

This document describes the comprehensive testing strategy for the Cascade Task Management application. The testing framework is built with Jest and provides thorough coverage of all application components.

## Test Structure

### Directory Organization

```
tests/
├── setup.js                    # Global test configuration
├── [basic.test.js removed]    # Basic Jest validation tests (deleted in cleanup)
├── fixtures/                   # Test data and utilities
│   ├── index.js                # Central exports
│   ├── taskFixtures.js         # Task test data
│   └── boardFixtures.js        # Board test data
├── mocks/                      # Mock implementations
│   ├── domMock.js              # DOM element mocking
│   ├── storageIndexedDBMock.js # IndexedDB storage mocking
│   ├── containerMock.js        # Dependency injection mocking
│   └── eventBusMock.js         # EventBus mocking
├── integration/                # Integration tests
│   ├── taskLifecycle.test.js   # Task CRUD workflows
│   ├── boardManagement.test.js # Board operations
│   └── dataPersistence.test.js # Data storage/import/export
└── unit/                       # Unit tests
    └── cascadeApp.test.js      # Core app methods
```

## Test Categories

### 1. Integration Tests

#### Task Lifecycle Tests (`taskLifecycle.test.js`)
- **Task Creation Workflow**: Validates task creation with input validation
- **Task Status Movement**: Tests task movement between todo/doing/done states
- **Task Editing Workflow**: Tests task text editing with validation
- **Task Deletion Workflow**: Tests task deletion with confirmation
- **Task Archiving Workflow**: Tests individual and bulk task archiving
- **Complex Workflows**: Tests rapid operations and data consistency
- **Error Handling**: Tests graceful error handling and edge cases

#### Board Management Tests (`boardManagement.test.js`)
- **Board Creation Workflow**: Tests board creation with validation
- **Board Switching Workflow**: Tests switching between boards
- **Board Editing Workflow**: Tests board property updates
- **Board Deletion Workflow**: Tests board deletion with constraints
- **Multi-Board Task Management**: Tests moving tasks between boards
- **Board Organization**: Tests board reordering and sorting
- **Board Search and Filtering**: Tests board discovery features
- **Board Statistics**: Tests board analytics and metrics

#### Data Persistence Tests (`dataPersistence.test.js`)
- **Data Loading**: Tests app initialization and data loading
- **Data Migration**: Tests legacy format migration
- **Auto-Save Operations**: Tests automatic data persistence
- **Export Workflows**: Tests data export in various formats
- **Import Workflows**: Tests data import with validation
- **Backup and Recovery**: Tests backup creation and restoration
- **Storage Management**: Tests quota monitoring and cleanup
- **Data Synchronization**: Tests conflict detection and resolution
- **Performance**: Tests large dataset handling

### 2. Unit Tests

#### Core App Methods (`cascadeApp.test.js`)
- **Initialization**: Tests app startup and module loading
- **Task Management Methods**: Tests individual task operations
- **Board Management Methods**: Tests board manipulation functions
- **Event Handling**: Tests event listener setup and handling
- **Utility Methods**: Tests helper functions and utilities
- **State Management**: Tests state updates and history
- **Error Handling**: Tests error logging and user feedback
- **Performance Monitoring**: Tests performance measurement
- **Cleanup**: Tests resource cleanup and disposal

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleNameMapper: {
    '^scripts/(.*)$': '<rootDir>/scripts/$1'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/app.js', // Legacy file - removed in cleanup
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true
};
```

### Global Setup (`tests/setup.js`)

The setup file provides:
- Mock implementations for browser APIs (IndexedDB, crypto)
- Custom Jest matchers for domain-specific assertions
- Global test utilities and helpers
- Environment configuration for consistent testing

## Mock Strategy

### 1. DOM Mocking (`mocks/domMock.js`)

Provides comprehensive DOM element mocking with:
- Element creation and manipulation
- Event handling simulation
- querySelector functionality
- Attribute management

### 2. Storage Mocking (`mocks/storageMock.js`)

Provides IndexedDB storage mocking with:
- Predefined test scenarios (single board, multiple boards, legacy data)
- Automatic data setup for different test cases
- Storage quota simulation
- Migration testing support

### 3. EventBus Mocking (`mocks/eventBusMock.js`)

Provides event system mocking with:
- Event emission tracking
- Subscription management
- Event sequence validation
- Assertion utilities

## Test Data Management

### Fixtures System

The fixtures system provides:
- **Task Fixtures**: Sample tasks covering all statuses and edge cases
- **Board Fixtures**: Sample boards with various configurations
- **Settings Fixtures**: Different configuration scenarios
- **User Scenarios**: Complete user journey simulations
- **Error Scenarios**: Edge cases and error conditions

### Factory Functions

Helper functions for creating test data:
- `createTestTask(overrides)`: Creates task with defaults + overrides
- `createTestBoard(overrides)`: Creates board with defaults + overrides
- `createTaskCollection(count, status)`: Creates multiple tasks
- `createBoardWithTasks(taskCount, boardOverrides)`: Creates populated board

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file (example)
npx jest tests/unit/models.test.js

# Run tests matching pattern
npx jest --testPathPattern=integration

# Run tests with verbose output
npx jest --verbose
```

### Environment Variables

```bash
# Enable debug mode
DEBUG=true npm test

# Set test timeout
JEST_TIMEOUT=30000 npm test

# Disable coverage collection
NO_COVERAGE=true npm test
```

## Coverage Goals

### Target Coverage Thresholds
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **LCOV**: For CI/CD integration
- **HTML**: Interactive browser-based reports in `coverage/` directory

## Testing Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names that explain the expected behavior
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests independent and isolated

### 2. Mocking Strategy
- Mock external dependencies at module boundaries
- Use dependency injection where possible
- Prefer integration tests over excessive mocking
- Mock only what you need to control

### 3. Test Data
- Use fixtures for consistent test data
- Create data close to where it's used
- Avoid shared mutable state between tests
- Use factory functions for test data creation

### 4. Assertions
- Use specific assertions (`toBe` vs `toEqual`)
- Test both happy path and error conditions
- Verify side effects (events, storage, DOM changes)
- Use custom matchers for domain-specific assertions

### 5. Async Testing
- Use async/await for cleaner async tests
- Properly handle Promise rejections
- Test timeout scenarios where relevant
- Avoid unnecessary waits

## Debugging Tests

### Common Issues

1. **Import/Export Problems**
   - Ensure proper ES6 module configuration
   - Check module path resolution
   - Verify Jest configuration for ES modules

2. **Mock Issues**
   - Clear mocks between tests
   - Verify mock setup timing
   - Check mock return values

3. **Async Test Problems**
   - Ensure Promises are properly awaited
   - Check for unhandled Promise rejections
   - Verify async operation timing

### Debug Tools

```bash
# Run tests with Node debugging
node --inspect-brk node_modules/.bin/jest tests/unit/models.test.js

# Run single test with debug output
npx jest tests/basic.test.js --verbose --no-cache

# Enable Jest debug logging
DEBUG=jest:* npm test
```

## Continuous Integration

### GitHub Actions Integration

Example workflow for automated testing:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Future Enhancements

### Planned Improvements
1. **End-to-End Tests**: Browser automation with Playwright
2. **Visual Regression Tests**: Screenshot comparison testing
3. **Performance Tests**: Load testing and benchmarking
4. **Accessibility Tests**: Automated a11y validation
5. **Cross-Browser Testing**: Multi-browser compatibility

### Test Infrastructure
1. **Parallel Test Execution**: Speed up test runs
2. **Test Report Aggregation**: Better reporting tools
3. **Test Data Management**: Database seeding for integration tests
4. **Mock Service Integration**: API mocking for external services

## Troubleshooting

### Common Test Failures

1. **Module Resolution Errors**
   ```
   Solution: Check jest.config.js moduleNameMapper settings
   ```

2. **Import/Export Syntax Errors**
   ```
   Solution: Ensure ES6 module support is configured correctly
   ```

3. **Mock Function Errors**
   ```
   Solution: Import jest from '@jest/globals' in ES6 modules
   ```

4. **Coverage Threshold Failures**
   ```
   Solution: Either increase test coverage or adjust thresholds
   ```

### Getting Help

1. Check Jest documentation: https://jestjs.io/docs/
2. Review ES6 modules guide: https://jestjs.io/docs/ecmascript-modules
3. Examine test files for working examples
4. Run tests with `--verbose` flag for detailed output

---

This testing framework provides a solid foundation for maintaining code quality and preventing regressions as the application evolves. The comprehensive test suite ensures reliability across all major user workflows and edge cases.