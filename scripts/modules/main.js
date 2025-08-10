/**
 * REFACTORED: This file now imports the simplified CascadeApp
 * Original 3,606-line god class has been broken down into focused services:
 * - TaskService: Task CRUD operations  
 * - BoardService: Board management
 * - UIService: Rendering and DOM operations
 * 
 * The new CascadeApp is a simple orchestrator that delegates to services
 * instead of containing all the business logic itself.
 */

import { CascadeApp } from './services/cascadeApp.js';

// Re-export for backward compatibility
export { CascadeApp };
export default CascadeApp;