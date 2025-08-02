# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cascade** is a privacy-first, client-side task management application implementing a Material Design 3 Kanban-style workflow with comprehensive multi-board support. Built with modern vanilla JavaScript ES6 modules, it provides enterprise-grade task organization that runs entirely in the user's browser without requiring server infrastructure or user accounts.

**Key Characteristics:**
- Modern ES6 modular architecture with comprehensive error handling
- Material Design 3 design system implementation with CSS custom properties
- Multi-board task management with advanced board switching and visual selector
- Complete accessibility compliance (WCAG 2.1 AA) with keyboard navigation
- Comprehensive testing infrastructure with Jest (30.0.4) and JSDOM
- Privacy-first approach with client-side only operation
- Performance optimization with event delegation and smart caching
- Advanced utility system with dependency injection and model factory

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
- **Coverage Thresholds**: Global (40-50%), Critical modules (70-80%)
- **Environment**: Jest with JSDOM, ES6 modules, custom matchers, comprehensive mocks

## Deployment Notes

- Standard deployment uses `npm run deploy` script
- Script is configured to handle:
  * Building production assets
  * Optimizing performance
  * Preparing for static hosting
  * Potential CDN configuration
  * Security header implementation

## Architecture

### ES6 Modular Structure (`scripts/modules/`)

#### Core Modules
- **main.js**: Application controller and business logic (CascadeApp class)
- **eventBus.js**: Pub/sub system with comprehensive error handling and event delegation
- **state.js**: Centralized reactive state management with undo/redo (50 state limit)
- **storage.js**: Versioned localStorage API with automatic migration and data validation
- **models.js**: Task and Board classes with comprehensive validation and JSON serialization
- **dom.js**: DOM manipulation utilities, event delegation, XSS protection
- **utils.js**: Utility functions including UUID generation, deep cloning, model factory with dependency injection

#### Feature Modules
- **accessibility.js**: WCAG 2.1 AA compliance, screen reader support, keyboard navigation
- **security.js**: File validation, content sanitization, import security, XSS prevention
- **settings.js**: User preferences, theme management, debug mode with persistent storage
- **errorHandler.js**: Centralized error handling with user-friendly notifications and error boundaries
- **keyboardNav.js**: Comprehensive keyboard shortcuts and navigation with visual indicators
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
  filter: string,              // 'all', 'todo', 'doing', 'done'
  history: Array<Object>,      // State history for undo/redo
  historyIndex: number,        // Current position in history
  maxHistorySize: number       // Maximum history entries (50)
}
```

[Rest of the content remains the same...]