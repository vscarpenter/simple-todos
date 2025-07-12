# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vanilla JavaScript web application for managing to-do items. It's a client-side only application that uses browser localStorage for data persistence. The app features task management (CRUD operations), drag & drop, import/export functionality, and has been refactored with a modern modular architecture.

## Development Workflow

### Running the Application
- Open `index.html` directly in a web browser (no build process required)
- For development with a local server: `python -m http.server 8000` or any static file server
- **Current working branch**: `refactor-modular-architecture`
- **Main branch**: Contains the original working version (app.js)

### Docker Development
- Build: `docker build -t simple-todos .`
- Run: `docker run -p 8080:80 simple-todos`
- Access at `http://localhost:8080`

### Testing
- Manual testing in modern browsers (Chrome, Firefox, Safari, Edge)
- Validate HTML/CSS using online validators
- Test import/export functionality with JSON files
- Verify localStorage persistence across browser sessions
- **Module testing**: All modules pass `node -c` syntax checks

## Current Architecture (Refactored - Dec 2024)

### Branch Status
- **main**: Original working version using `scripts/app.js` (monolithic)
- **refactor-modular-architecture**: New modular architecture (current)

### Modular Structure
The application has been refactored into a modular ES6 architecture:

#### Core Modules (`scripts/modules/`)
- **eventBus.js**: Pub/sub pattern for reactive UI updates
  - Simple event system with on/off/emit/once methods
  - Error handling for event listeners
  - Singleton instance exported

- **state.js**: Centralized application state management
  - Reactive state updates with history tracking
  - Undo/redo functionality (50 state limit)
  - Event emission on state changes
  - Subscribe to specific state keys or all changes

- **storage.js**: Versioned localStorage API
  - Version 1.0 with migration support
  - Automatic legacy data migration (todos → cascade-tasks format)
  - Import/export functionality with validation
  - Error handling and storage info methods

- **models.js**: Task and Column data models
  - **Task class**: Validation, status management, method chaining
  - **Column class**: Task organization with limits and colors
  - Factory functions: `createTask()`, `createColumn()`
  - Full validation and event emission

- **dom.js**: DOM manipulation and event delegation
  - Centralized element caching
  - Event delegation for performance
  - Modal system with Promise-based API
  - Drag & drop zone setup
  - XSS protection via sanitization

- **main.js**: Main application controller
  - Orchestrates all modules
  - Event handling and business logic
  - Error handling and user feedback
  - Public API methods

#### Entry Point
- **scripts/app-modular.js**: Application initialization
  - Module loading and error handling
  - Global compatibility functions
  - Debug utilities at `window.cascadeDebug`

### Data Structure (Updated)
```javascript
{
  id: string,           // Unique identifier (UUID or timestamp-based)
  text: string,         // Task description (max 200 chars)
  status: string,       // 'todo', 'doing', or 'done'
  createdDate: string,  // ISO date string (YYYY-MM-DD)
  lastModified: string  // ISO timestamp
}
```

### Key Features

#### Reactive State Management
- Centralized state in `appState` singleton
- Automatic UI updates via pub/sub pattern
- History tracking for undo/redo functionality
- Event-driven architecture

#### Event System
- **Task Events**: create, edit, delete, move, archive, complete, start, reset
- **App Events**: undo, redo, ready, error
- **Storage Events**: saved, loaded, migrated, error
- **UI Events**: render, modal interactions

#### Keyboard Shortcuts
- **Ctrl/Cmd + N**: Focus task input (new task)
- **Ctrl/Cmd + Z**: Undo last action
- **Ctrl/Cmd + Shift + Z**: Redo last action
- **Escape**: Close modal

#### Performance Optimizations
- Event delegation instead of individual listeners
- Efficient DOM element caching
- Modular loading with ES6 imports
- Minimal DOM manipulations

### File Structure
```
scripts/
├── app.js                 # Original monolithic version (main branch)
├── app-modular.js        # New modular entry point
└── modules/
    ├── eventBus.js       # Pub/sub event system
    ├── state.js          # State management with undo/redo
    ├── storage.js        # Versioned localStorage API
    ├── models.js         # Task and Column classes
    ├── dom.js            # DOM manipulation and events
    └── main.js           # Main application controller
```

### Security Features
- XSS prevention via `textContent` usage and input sanitization
- JSON validation for imported files
- Input length limits and trimming
- Error boundaries and graceful degradation

### Migration & Compatibility
- Automatic migration from legacy formats:
  - Old `todos` localStorage key → `cascade-tasks`
  - Boolean `completed` field → `status` enum
- Backward compatibility maintained for HTML structure
- Global functions preserved for existing onclick handlers

### Styling
- Bootstrap 5.3.0 CDN for base styles
- Custom CSS in `styles/components.css`
- Responsive design with Kanban board layout
- Material Design 3 color palette and typography
- Modal overlay system for user interactions

## Implementation Status

### ✅ Completed (High Priority)
1. **Modular Architecture**: All core modules created and tested
2. **Pub/Sub Pattern**: EventBus with reactive UI updates
3. **State Management**: Centralized state with undo/redo support
4. **Event Delegation**: Performance-optimized event handling
5. **Versioned Storage**: Migration-ready localStorage API
6. **Task/Column Models**: Classes with validation and methods

### 🔄 Remaining Tasks
- **Accessibility**: ARIA roles, keyboard navigation for drag/drop
- **CSS Refactoring**: BEM methodology, CSS variables for theming
- **Unit Testing**: Jest/Vitest setup with pure function extraction
- **Multi-board Support**: Board management and task organization
- **Due Dates & Labels**: Enhanced task metadata and filtering

### 🧪 Testing
- All modules pass syntax validation (`node -c`)
- Manual testing required for full functionality verification
- Import/export compatibility with existing data formats
- Cross-browser testing for ES6 module support

## Development Notes

### Branch Management
- Always work on feature branches off `refactor-modular-architecture`
- Main branch contains stable monolithic version
- Regular commits with descriptive messages
- Test before merging back to main

### Performance Considerations
- ES6 modules require modern browser (or bundler for legacy support)
- Event delegation reduces memory footprint
- State history limited to 50 entries to prevent memory leaks
- DOM element caching minimizes querySelector calls

### Error Handling
- Comprehensive try/catch blocks in all async operations
- User-friendly error messages via modal system
- Console logging for debugging
- Graceful degradation when modules fail to load

### Future Enhancements
- Service Worker for offline functionality
- IndexedDB for larger data storage
- Real-time collaboration features
- Advanced filtering and search
- Task scheduling and reminders