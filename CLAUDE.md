# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cascade** is a privacy-first, client-side task management application implementing a Material Design 3 Kanban-style workflow with comprehensive multi-board support. Built with modern vanilla JavaScript ES6 modules, it provides enterprise-grade task organization that runs entirely in the user's browser without requiring server infrastructure or user accounts.

**Key Characteristics:**
- Modern ES6 modular architecture with comprehensive error handling
- Material Design 3 design system implementation
- Multi-board task management with advanced board switching
- Complete accessibility compliance (WCAG 2.1 AA)
- Comprehensive testing infrastructure with Jest
- Privacy-first approach with client-side only operation

## Development Workflow

### Running
- Open `index.html` directly (no build process required)
- Local server: `python -m http.server 8000` or `python3 -m http.server 8000`
- Docker: `docker build -t simple-todos . && docker run -p 8080:80 simple-todos`

### Testing
- **Unit & Integration Tests**: `npm test` (Jest with ES6 module support)
- **Test Coverage**: `npm run test:coverage`
- **Watch Mode**: `npm run test:watch`
- **Specific Test Suites**: `npm run test:unit` or `npm run test:integration`
- **Module Syntax Validation**: `node -c scripts/modules/*.js`

## Architecture

### ES6 Modular Structure (`scripts/modules/`)

#### Core Modules
- **main.js**: Application controller and business logic (CascadeApp class)
- **eventBus.js**: Pub/sub system with comprehensive error handling
- **state.js**: Centralized reactive state with undo/redo (50 state limit)
- **storage.js**: Versioned localStorage API with automatic migration
- **models.js**: Task and Board classes with validation and JSON serialization
- **dom.js**: DOM manipulation, event delegation, XSS protection

#### Feature Modules
- **accessibility.js**: WCAG 2.1 AA compliance, screen reader support, keyboard navigation
- **security.js**: File validation, content sanitization, import security
- **settings.js**: User preferences, theme management, debug mode
- **errorHandler.js**: Centralized error handling with user-friendly notifications
- **keyboardNav.js**: Comprehensive keyboard shortcuts and navigation
- **dropdown.js**: Custom dropdown implementation replacing Bootstrap dependencies

### Entry Point
- **app-modular.js**: Module loading, initialization, and global debug utilities

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

### Key Features

#### Core Functionality
- **Reactive State Management**: Event-driven architecture with undo/redo (50 states)
- **Multi-board Support**: Create, manage, and switch between multiple task boards
- **Advanced Board Selector**: Dropdown with board previews, statistics, and quick actions
- **Drag & Drop**: Smooth task movement with Material Design 3 animations
- **Smart Archive System**: Automatic and manual archiving with customizable retention

#### User Experience
- **Comprehensive Keyboard Navigation**: Full keyboard shortcuts and accessibility
- **Material Design 3 UI**: Modern design system with proper color tokens and typography
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Real-time Updates**: Live task counters and instant UI feedback
- **Error Handling**: User-friendly error notifications with recovery options

#### Developer Experience
- **Comprehensive Testing**: Jest-based unit and integration test suite
- **Debug Utilities**: Built-in debugging tools and console utilities
- **Modular Architecture**: Clean separation of concerns with ES6 modules
- **Performance Optimized**: Event delegation, DOM caching, efficient rendering

### Security & Compatibility
- **XSS Prevention**: Input sanitization and secure DOM manipulation via `textContent`
- **File Validation**: Comprehensive security checks for imports (file size, type, content)
- **Content Security**: JSON validation, automatic data migration, schema validation
- **Browser Compatibility**: Modern browsers with ES6 module support
- **Privacy-First**: No external dependencies, no data collection, no user accounts

## Testing Infrastructure

### Test Structure
```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── accessibility.test.js
│   ├── dom.test.js
│   ├── errorHandler.test.js
│   ├── eventBus.test.js
│   ├── models.test.js
│   ├── security.test.js
│   ├── settings.test.js
│   ├── state.test.js
│   └── storage.test.js
├── integration/             # Integration tests for workflows
│   ├── archiveManagement.test.js
│   ├── boardManagement.test.js
│   ├── dataPersistence.test.js
│   ├── fileValidation.test.js
│   ├── moduleIntegration.test.js
│   ├── performance.test.js
│   └── taskLifecycle.test.js
├── mocks/                   # Test mocks and utilities
│   ├── domMock.js
│   ├── eventBusMock.js
│   └── storageMock.js
├── fixtures/                # Test data fixtures
│   ├── boardFixtures.js
│   ├── taskFixtures.js
│   └── index.js
└── setup.js                 # Jest configuration and setup
```

### Test Coverage
- **Unit Tests**: All core modules have comprehensive unit test coverage
- **Integration Tests**: End-to-end workflows and cross-module interactions
- **Mock Objects**: Isolated testing with DOM, storage, and event bus mocks
- **Fixtures**: Standardized test data for consistent testing scenarios

## CSS Architecture

### Modular CSS Structure (`styles/modules/`)
```
styles/
├── main.css                 # Entry point importing all modules
├── components.css           # Legacy component styles (deprecated)
├── layout.css              # Legacy layout styles (deprecated)  
├── typography.css          # Typography utilities
└── modules/                # Modular CSS architecture
    ├── _variables.css      # CSS custom properties and design tokens
    ├── _base.css           # Base styles and resets
    ├── _layout.css         # Layout utilities and grid systems
    ├── _forms.css          # Form controls and inputs
    ├── _buttons.css        # Button variants and states
    ├── _modal.css          # Modal dialogs and overlays
    ├── _header.css         # Header and navigation styles
    ├── _menu-panel.css     # Slide-out menu panel
    ├── _task-board.css     # Kanban board and task cards
    ├── _board-selector.css # Board dropdown and selector
    ├── _loading.css        # Loading states and animations
    ├── _error-toast.css    # Error notification styles
    ├── _toast.css          # General toast notification system
    ├── _keyboard-nav.css   # Keyboard navigation indicators
    ├── _settings.css       # Settings modal and controls
    └── _utilities.css      # Utility classes
```

### Design System
- **Material Design 3**: Full implementation with proper color tokens
- **CSS Custom Properties**: Centralized design tokens in `_variables.css`
- **Modular Import System**: Clean dependency chain via `main.css`
- **Component-Based**: Each UI component has its own CSS module
- **Responsive Design**: Mobile-first approach with proper breakpoints

## Implementation Status

### ✅ Completed Core Features
- **Modular ES6 Architecture**: Complete pub/sub pattern with error boundaries
- **Multi-board Management**: Full board creation, switching, and management
- **Advanced Board Selector**: Dropdown with statistics, previews, and quick actions
- **Comprehensive Accessibility**: WCAG 2.1 AA compliance with screen reader support
- **Material Design 3 UI**: Complete design system implementation
- **Drag & Drop System**: Smooth task movement with proper animations
- **Import/Export System**: JSON-based data exchange with validation
- **Smart Archive System**: Automatic and manual archiving with retention policies
- **Keyboard Navigation**: Comprehensive shortcuts and keyboard-only operation
- **Error Handling**: User-friendly error notifications with recovery options
- **Security Features**: File validation, content sanitization, XSS prevention
- **Testing Infrastructure**: Comprehensive unit and integration test coverage
- **Settings Management**: User preferences with theme support
- **Debug Utilities**: Built-in debugging tools and console access

### 🔄 Future Enhancement Opportunities
- **Service Worker**: Offline functionality and caching
- **IndexedDB Integration**: Larger data storage capabilities
- **Advanced Search**: Full-text search across tasks and boards
- **Task Templates**: Reusable task templates and quick actions
- **Data Sync**: Optional cloud synchronization (while maintaining privacy)
- **Advanced Analytics**: Task completion metrics and productivity insights
- **Custom Themes**: User-defined color schemes and themes
- **Task Dependencies**: Task relationships and dependencies
- **Time Tracking**: Built-in time tracking and estimation features

## Development Notes

### Performance Considerations
- **ES6 Module Loading**: Requires modern browsers with module support
- **Event Delegation**: Minimizes memory footprint with centralized event handling
- **State History**: Limited to 50 entries to prevent memory leaks
- **DOM Caching**: Strategic element caching reduces query overhead
- **Lazy Loading**: Components and features load on demand
- **Debounced Operations**: Input handling and state updates are optimized

### Error Handling Strategy
- **ErrorBoundary Pattern**: Wraps functions with automatic error recovery
- **Centralized Error Handler**: Consistent error processing and user notification
- **Graceful Degradation**: Application continues functioning despite module failures
- **User-Friendly Messages**: Technical errors translated to actionable user guidance
- **Recovery Options**: Error states provide clear paths to resolution
- **Debug Mode**: Enhanced logging and debugging capabilities for development

### Browser Compatibility
- **Modern Browser Requirement**: ES6 modules, CSS custom properties, modern APIs
- **Progressive Enhancement**: Core functionality works without advanced features
- **Fallback Systems**: UUID generation, crypto APIs have fallbacks
- **Responsive Design**: Works across desktop, tablet, and mobile devices
- **Accessibility**: Screen readers, keyboard navigation, high contrast support