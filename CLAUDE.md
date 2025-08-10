# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cascade Task Management** (v2.1.0) is a privacy-first, client-side task management application implementing a Material Design 3 Kanban-style workflow with comprehensive multi-board support. Built with modern vanilla JavaScript ES6 modules using a clean service-oriented architecture, it provides enterprise-grade task organization that runs entirely in the user's browser without requiring server infrastructure or user accounts.

**Key Characteristics:**
- Clean service-oriented architecture with focused, single-responsibility modules
- Modern ES6 modules with direct imports (no dependency injection complexity)
- Material Design 3 design system implementation with CSS custom properties
- Multi-board task management with advanced board switching and visual selector
- Complete accessibility compliance (WCAG 2.1 AA) with keyboard navigation
- Comprehensive testing infrastructure with Jest (30.0.4) and JSDOM
- Privacy-first approach with client-side only operation
- Performance optimization with simplified state management and efficient storage
- Simplified IndexedDB storage without over-abstraction
- Security-focused implementation with XSS protection and sanitization
- Maintainable codebase after comprehensive refactoring (1,149 lines removed)

## Development Workflow

### Running
- **Direct**: Open `index.html` directly (no build process required)
- **Python**: `npm start` or `python3 -m http.server 8000`
- **Node.js**: `npm run start:node` (uses npx http-server on port 8000)
- **Docker**: `npm run docker:build && npm run docker:run`
- **Deploy**: `npm run deploy` (uses deploy.sh script)

### Testing
- **Unit & Integration Tests**: `npm test` (Jest 30.0.4 with ES6 module support via NODE_OPTIONS)
- **Test Coverage**: `npm run test:coverage` (HTML and LCOV reports)
- **Watch Mode**: `npm run test:watch`
- **Specific Test Suites**: `npm run test:unit` or `npm run test:integration`
- **Individual Test Files**: `npm run test:accessibility`, `npm run test:performance`, `npm run test:scalability`
- **End-to-End Tests**: `npm run test:e2e` (Playwright with multi-browser support)
- **E2E Test Modes**: `npm run test:e2e:headed`, `npm run test:e2e:debug`, `npm run test:e2e:ui`
- **Browser-Specific E2E**: `npm run test:e2e:chromium`, `npm run test:e2e:firefox`, `npm run test:e2e:webkit`
- **Mobile E2E Testing**: `npm run test:e2e:mobile`
- **Accessibility E2E**: `npm run test:e2e:accessibility`
- **Performance E2E**: `npm run test:e2e:performance`
- **Test Reports**: `npm run test:e2e:report` (HTML report with screenshots)
- **Coverage Thresholds**: Global (40-50%), Critical modules (70-80%)
- **Environment**: Jest with JSDOM, Playwright with multi-browser matrix, ES6 modules, comprehensive mocks

## Deployment Notes

- Standard deployment uses `npm run deploy` script
- Script is configured to handle:
  * Building production assets
  * Optimizing performance
  * Preparing for static hosting
  * Potential CDN configuration
  * Security header implementation

## Architecture

### Clean Service-Oriented Structure

#### Core Services (`scripts/modules/services/`)
- **cascadeApp.js** (697 lines): Main application orchestrator handling events and coordination
- **taskService.js** (500 lines): Task CRUD operations, validation, and lifecycle management  
- **boardService.js** (526 lines): Board management, creation, switching, and archival
- **uiService.js** (462 lines): UI rendering, DOM updates, and user interaction handling

#### Core Modules (`scripts/modules/`)
- **main.js** (16 lines): Simple service export wrapper
- **eventBus.js**: Pub/sub system with comprehensive error handling and event delegation
- **state.js** (277 lines): Simplified reactive state management (no undo/redo complexity)
- **storage.js** (207 lines): Simple IndexedDB storage with essential operations (save, load, clear)
- **models.js**: Task and Board classes with comprehensive validation and JSON serialization
- **dom.js**: DOM manipulation utilities, event delegation, XSS protection
- **utils.js**: Utility functions including UUID generation, deep cloning, model factory

#### Feature Modules
- **accessibility.js**: WCAG 2.1 AA compliance, screen reader support, keyboard navigation
- **security.js**: File validation, content sanitization, import security, XSS prevention
- **settings.js**: User preferences, theme management with IndexedDB storage
- **errorHandler.js**: Centralized error handling with user-friendly notifications and error boundaries
- **keyboardNav.js**: Keyboard shortcuts and navigation with visual indicators
- **dropdown.js**: Custom dropdown implementation with Material Design styling
- **performance.js**: Performance optimization utilities and monitoring

### Entry Point
- **app-modular.js**: Module loading, initialization, error boundary setup, and comprehensive debug utilities (version 3.0.0)
- **index.html**: Main HTML file with Material Design structure, accessibility features, and comprehensive navigation

### Data Structures

#### Task Model
```javascript
{
  id: string,           // Unique identifier (crypto.randomUUID() or fallback)
  text: string,         // Task description (validated, not empty)
  status: string,       // 'todo', 'doing', or 'done'
  createdDate: string,  // ISO timestamp (full datetime)
  completedDate: string|null, // ISO timestamp when completed, null otherwise
  lastModified: string  // ISO timestamp (updated on any change)
}
```

#### Board Model
```javascript
{
  id: string,           // Unique identifier
  name: string,         // Board name (default: 'Untitled Board')
  description: string,  // Board description (optional)
  color: string,        // Hex color code (default: '#6750a4')
  tasks: Array<Task>,   // Array of task objects
  archivedTasks: Array<Task>, // Array of archived tasks
  createdDate: string,  // ISO timestamp
  lastModified: string, // ISO timestamp
  isArchived: boolean,  // Board archive status
  isDefault: boolean    // Whether this is the default board
}
```

#### Application State
```javascript
{
  boards: Array<Board>,        // All boards
  currentBoardId: string|null, // Active board ID
  tasks: Array<Task>,          // Tasks for current board (computed)
  filter: string              // 'all', 'todo', 'doing', 'done'
}
```

### Current File Structure

#### Root Files
- **index.html**: Main application entry point with Material Design structure
- **package.json**: Project configuration (v2.1.0, MIT license)
- **jest.config.js**: Jest testing configuration with ES6 module support
- **playwright.config.js**: Playwright E2E testing configuration with multi-browser support
- **Dockerfile**: Container configuration for deployment
- **deploy.sh**: Deployment script for production builds
- **nginx.conf**: Nginx configuration for hosting
- **security-headers.conf**: Security header configuration
- **bearer.ignore**: Security scanning exclusions

#### Documentation Files
- **README.md**: Project documentation and setup instructions
- **SECURITY.md**: Security policy and vulnerability reporting
- **PRD.md**: Product Requirements Document
- **DESIGN-IMPROVEMENTS.md**: Design enhancement proposals
- **REFACTOR_PLAN.md**: Technical refactoring documentation
- **docs/TESTING.md**: Testing guidelines and procedures
- **tests/e2e/README.md**: Comprehensive E2E testing guide
- **security-audit-report.md**: Latest security audit findings

#### Application Structure
- **scripts/**: JavaScript modules and application logic
  - **app-modular.js**: Main application bootstrapper (v3.0.0)
  - **modules/**: Core ES6 modules (13 modules)
  - **modules/services/**: Service layer (4 focused services)
- **styles/**: CSS architecture with Material Design 3
  - **main.css, layout.css, components.css, typography.css**: Core styles
  - **modules/**: Modular CSS components (12 style modules)
- **assets/**: Icons, images, and static resources
- **tests/**: Comprehensive test suite
  - **unit/**: Unit tests (10 test files) including services subdirectory
  - **integration/**: Integration tests (2 test files) 
  - **e2e/**: End-to-End tests with Playwright (config, fixtures, page objects, specs)
  - **fixtures/**: Test data and mocks for unit/integration tests
  - **mocks/**: Mock implementations for testing

#### Additional Pages
- **user-guide.html**: User documentation and help
- **privacy.html**: Privacy policy
- **terms.html**: Terms of service
- **prd.html**: Product requirements (HTML version)

### Testing Infrastructure

#### Configuration
- **Jest 30.0.4** with JSDOM environment for unit and integration tests
- **Playwright 1.54.2** with comprehensive multi-browser E2E testing
- ES6 module support via NODE_OPTIONS for Jest
- Coverage reporting (HTML, LCOV, text formats)
- Coverage thresholds: Global (40-50%), Critical modules (70-80%)

#### Test Categories
- **Unit Tests**: Individual module testing with service-specific tests
- **Integration Tests**: Cross-module functionality testing
- **End-to-End Tests**: Full application workflow testing across browsers
- **Accessibility Tests**: WCAG 2.1 AA compliance (both Jest and Playwright)
- **Performance Tests**: Load testing and Web Vitals monitoring
- **Security Tests**: XSS protection and validation

#### Jest Test Commands
- `npm test`: Run full Jest test suite (unit + integration)
- `npm run test:watch`: Jest watch mode for development
- `npm run test:coverage`: Generate Jest coverage reports
- `npm run test:unit`: Unit tests only
- `npm run test:integration`: Integration tests only
- `npm run test:accessibility`: Accessibility compliance tests
- `npm run test:performance`: Performance benchmarks
- `npm run test:scalability`: Scalability stress tests

#### Playwright E2E Test Commands
- `npm run test:e2e`: Run all E2E tests
- `npm run test:e2e:headed`: E2E tests with visible browser
- `npm run test:e2e:debug`: E2E tests with debugging tools
- `npm run test:e2e:ui`: E2E tests with Playwright UI mode
- `npm run test:e2e:chromium/firefox/webkit`: Browser-specific testing
- `npm run test:e2e:mobile`: Mobile device simulation
- `npm run test:e2e:accessibility`: E2E accessibility testing
- `npm run test:e2e:performance`: E2E performance testing
- `npm run test:e2e:report`: View HTML test report with artifacts

#### E2E Test Structure
- **Configuration**: Multi-browser matrix (Chrome, Firefox, Safari, Mobile)
- **Projects**: Desktop, mobile, accessibility, performance testing projects  
- **Page Objects**: Structured page interaction models
- **Fixtures**: Reusable test data and helper utilities
- **Artifacts**: Screenshots, traces, videos on test failures
- **Reporting**: HTML reports with detailed failure analysis

### Security Features

#### Implementation
- XSS protection with DOM sanitization
- Content Security Policy enforcement
- File validation for imports/exports
- Input sanitization and validation
- Secure random UUID generation
- Privacy-first data handling (no external APIs)

#### Recent Security Fixes
- Fixed 3 high-severity XSS vulnerabilities in DOM module
- Enhanced input sanitization
- Improved content validation
- Strengthened CSP headers

### Performance Optimizations

#### Current Features
- Event delegation for efficient DOM handling
- Smart caching with performance monitoring
- Lazy loading of non-critical components
- Optimized rendering with virtual DOM patterns
- Pure IndexedDB storage without localStorage dependencies
- Performance profiling utilities

### Browser Support
- **Production**: Chrome >= 63, Firefox >= 60, Safari >= 11.1, Edge >= 79
- **E2E Testing**: Full multi-browser matrix with mobile device simulation
- **Development**: Node.js >= 16.0.0, Playwright browsers auto-installed

### Repository Information
- **GitHub**: vscarpenter/cascade-task-management
- **Author**: Vinny Carpenter <vinny@vinny.dev>
- **License**: MIT
- **Keywords**: task-management, kanban, productivity, privacy-first, accessibility, material-design, es6-modules, offline-first, multi-board, progressive-web-app

### Recent Updates
- Upgraded to version 2.1.0 with comprehensive refactoring
- Eliminated 3,606-line god class into focused service architecture
- Removed over-engineered dependency injection system (172 lines eliminated)
- Simplified IndexedDB storage from 406 to 207 lines (49% reduction)
- Removed complex undo/redo system from state management (106 lines eliminated)
- Total code reduction: 1,149 lines while maintaining all functionality
- Added comprehensive Playwright E2E testing infrastructure with multi-browser support
- Implemented cross-browser testing matrix (Chrome, Firefox, Safari, mobile)
- Enhanced Jest test organization with dedicated service test directory
- Added advanced E2E test features: page objects, fixtures, accessibility testing
- Configured comprehensive test reporting with HTML reports and artifacts
- Enhanced security with XSS protection fixes
- Improved accessibility features with E2E accessibility testing
- Expanded test coverage and documentation with detailed E2E testing guide
- Clean, maintainable architecture with direct ES6 imports and comprehensive testing