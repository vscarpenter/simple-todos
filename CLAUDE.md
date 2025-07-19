# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vanilla JavaScript todo/task management app with ES6 modular architecture. Client-side only with localStorage persistence. Features CRUD operations, drag & drop, and import/export.

## Development Workflow

### Running
- Open `index.html` directly (no build process)
- Local server: `python -m http.server 8000`
- Docker: `docker build -t simple-todos . && docker run -p 8080:80 simple-todos`

### Testing
- Manual testing in modern browsers
- Module syntax: `node -c scripts/modules/*.js`

## Architecture

### ES6 Modular Structure (`scripts/modules/`)
- **eventBus.js**: Pub/sub system with error handling
- **state.js**: Centralized state with undo/redo (50 state limit)
- **storage.js**: Versioned localStorage API with migration
- **models.js**: Task/Column classes with validation
- **dom.js**: DOM manipulation, event delegation, XSS protection
- **main.js**: Application controller and business logic

### Entry Point
- **app-modular.js**: Module loading and initialization

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
- **Reactive State**: Event-driven architecture with undo/redo
- **Multi-board Support**: Create and manage multiple task boards
- **Keyboard Shortcuts**: Ctrl/Cmd+N (new task), Ctrl/Cmd+Z (undo), Escape (close modal)
- **Performance**: Event delegation, DOM caching, ES6 modules

### Security & Compatibility
- XSS prevention via input sanitization and `textContent`
- JSON validation for imports, automatic data migration
- Material Design 3 styling with glassmorphism effects

## Implementation Status

### ✅ Completed
- Modular ES6 architecture with pub/sub pattern
- Multi-board support with advanced management
- Complete accessibility compliance (WCAG 2.1 AA)
- Material Design 3 UI with glassmorphism effects
- Drag & drop task management
- Import/export functionality

### 🔄 Future Enhancements
- Service Worker for offline functionality
- IndexedDB for larger data storage
- Advanced filtering and search capabilities

## Development Notes

### Performance
- ES6 modules require modern browsers
- Event delegation reduces memory footprint  
- State history limited to 50 entries
- DOM element caching minimizes queries

### Error Handling
- Comprehensive try/catch blocks with user-friendly modals
- Console logging for debugging
- Graceful degradation on module load failures