# E2E Testing with Playwright

This directory contains End-to-End tests for the Cascade Task Management application using Playwright.

## Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Playwright browsers (installed automatically)

### Installation
```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:e2e:install
```

## Running Tests

### Local Development
```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run tests with debugging
npm run test:e2e:debug

# Run tests with UI mode
npm run test:e2e:ui
```

### Browser-Specific Tests
```bash
# Run tests on specific browsers
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile
```

### Specialized Test Suites
```bash
# Run accessibility tests
npm run test:e2e:accessibility

# Run performance tests
npm run test:e2e:performance
```

### View Test Reports
```bash
# Open HTML test report
npm run test:e2e:report
```

## Test Structure

```
tests/e2e/
├── config/                    # Test configuration
│   ├── global-setup.js       # Global test setup
│   ├── global-teardown.js    # Global test cleanup
│   ├── test-setup.js         # Test utilities and fixtures
│   └── browsers.config.js    # Browser-specific configurations
├── fixtures/                 # Test data and utilities
│   ├── page-objects/         # Page Object Model classes
│   └── helpers/              # Test helper utilities
└── specs/                    # Test specifications
    ├── smoke.spec.js         # Basic smoke tests
    ├── task-management.spec.js    # Task operations
    ├── board-management.spec.js   # Board management
    ├── accessibility.spec.js      # Accessibility tests
    └── performance.spec.js        # Performance tests
```

## Configuration

The main configuration is in `playwright.config.js` at the project root. Key features:

### Multi-Browser Support
- **Chromium**: Latest Chrome features and performance
- **Firefox**: Cross-browser compatibility
- **WebKit**: Safari compatibility (including iOS Safari behaviors)

### Test Projects
- **Desktop browsers**: Chrome, Firefox, Safari
- **Mobile browsers**: Mobile Chrome, Mobile Safari
- **Tablet**: iPad Pro simulation
- **Accessibility**: High contrast, dark mode, reduced motion
- **Performance**: Network throttling and performance monitoring

### Reporting
- **HTML Report**: Interactive test results with screenshots
- **JSON Report**: Machine-readable results for CI/CD
- **JUnit Report**: Integration with CI/CD systems
- **GitHub Actions**: Automated reporting in PRs

## Writing Tests

### Basic Test Structure
```javascript
import { test, expect } from '@playwright/test';
import { TestSetup } from '../config/test-setup.js';

test.describe('Feature Tests', () => {
  let testSetup;
  
  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);
    await testSetup.initializeApp();
  });
  
  test.afterEach(async () => {
    await testSetup.cleanup();
  });
  
  test('should perform action', async ({ page }) => {
    // Test implementation
  });
});
```

### Using Page Objects
```javascript
import { TaskBoardPage } from '../fixtures/page-objects/TaskBoardPage.js';

test('should create task', async ({ page }) => {
  const taskBoard = new TaskBoardPage(page);
  await taskBoard.createTask('New task');
  await expect(taskBoard.getTask('New task')).toBeVisible();
});
```

### Test Data
Use the provided test data fixtures:
```javascript
import { testData } from '../config/test-setup.js';

test.beforeEach(async ({ page }) => {
  await testSetup.seedTestData(testData.sampleBoard);
});
```

## Best Practices

### Test Isolation
- Each test starts with a clean application state
- Use `TestSetup.initializeApp()` to reset localStorage
- Clean up after tests with `TestSetup.cleanup()`

### Waiting Strategies
- Use `waitForSelector()` for element visibility
- Use `waitForLoadState('networkidle')` for page loads
- Use `TestSetup.waitForAppIdle()` for application readiness

### Error Handling
- Tests automatically capture screenshots on failure
- Use `TestSetup.takeDebugScreenshot()` for debugging
- Check browser console for JavaScript errors

### Accessibility Testing
- Use the accessibility test project for WCAG compliance
- Test keyboard navigation in all interactive tests
- Verify ARIA labels and semantic structure

### Performance Testing
- Monitor Web Vitals (LCP, FID, CLS)
- Test with large datasets using `testData.largeDataset`
- Verify response times for user interactions

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

### Artifacts
- Test results and screenshots
- HTML reports
- Performance metrics
- Accessibility audit results

### Browser Matrix
Tests run on all supported browsers in parallel for comprehensive coverage.

## Debugging

### Local Debugging
```bash
# Run with visible browser
npm run test:e2e:headed

# Run with Playwright Inspector
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/specs/smoke.spec.js --headed
```

### CI Debugging
- Check GitHub Actions logs
- Download test artifacts from failed runs
- Review screenshots and videos in test results

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout in `playwright.config.js`
- Check if application server is running
- Verify network connectivity

**Drag & drop not working**
- Use browser-specific drag helpers
- Check WebKit/Safari specific configurations
- Verify touch event handling on mobile

**Flaky tests**
- Use proper waiting strategies
- Avoid hard-coded timeouts
- Check for race conditions in application code

**Accessibility violations**
- Review axe-core reports in test results
- Check ARIA labels and semantic HTML
- Verify keyboard navigation paths

For more information, see the [Playwright documentation](https://playwright.dev/docs/intro).