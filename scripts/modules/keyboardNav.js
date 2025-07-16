/**
 * Keyboard Navigation Utilities
 * Provides comprehensive keyboard shortcuts and navigation
 */

export class KeyboardNavigator {
  constructor(app) {
    this.app = app;
    this.selectedTaskId = null;
    this.shortcuts = new Map();
    this.init();
  }

  /**
   * Initialize keyboard navigation
   */
  init() {
    this.setupShortcuts();
    this.bindEvents();
    this.createShortcutHelp();
  }

  /**
   * Setup keyboard shortcuts
   */
  setupShortcuts() {
    // Task management shortcuts
    this.shortcuts.set('n', {
      description: 'Create new task',
      action: () => this.focusNewTaskInput(),
      category: 'Task Management'
    });

    this.shortcuts.set('Escape', {
      description: 'Clear selection / Close modals',
      action: () => this.handleEscape(),
      category: 'Navigation'
    });

    this.shortcuts.set('ArrowUp', {
      description: 'Select previous task',
      action: (e) => {
        e.preventDefault();
        this.selectPreviousTask();
      },
      category: 'Navigation'
    });

    this.shortcuts.set('ArrowDown', {
      description: 'Select next task',
      action: (e) => {
        e.preventDefault();
        this.selectNextTask();
      },
      category: 'Navigation'
    });

    this.shortcuts.set('Enter', {
      description: 'Edit selected task',
      action: () => this.editSelectedTask(),
      category: 'Task Management'
    });

    this.shortcuts.set('Delete', {
      description: 'Delete selected task',
      action: () => this.deleteSelectedTask(),
      category: 'Task Management'
    });

    this.shortcuts.set('Backspace', {
      description: 'Delete selected task',
      action: () => this.deleteSelectedTask(),
      category: 'Task Management'
    });

    // Status change shortcuts
    this.shortcuts.set('1', {
      description: 'Move selected task to To-Do',
      action: () => this.moveSelectedTask('todo'),
      category: 'Task Status'
    });

    this.shortcuts.set('2', {
      description: 'Move selected task to In Progress',
      action: () => this.moveSelectedTask('doing'),
      category: 'Task Status'
    });

    this.shortcuts.set('3', {
      description: 'Move selected task to Done',
      action: () => this.moveSelectedTask('done'),
      category: 'Task Status'
    });

    // Application shortcuts
    this.shortcuts.set('ctrl+s', {
      description: 'Export tasks',
      action: (e) => {
        e.preventDefault();
        this.app.exportTasks();
      },
      category: 'Application'
    });

    this.shortcuts.set('ctrl+o', {
      description: 'Import tasks',
      action: (e) => {
        e.preventDefault();
        document.getElementById('import-file')?.click();
      },
      category: 'Application'
    });

    this.shortcuts.set('?', {
      description: 'Show keyboard shortcuts',
      action: () => this.showShortcutHelp(),
      category: 'Help'
    });

    this.shortcuts.set('ctrl+/', {
      description: 'Show keyboard shortcuts',
      action: (e) => {
        e.preventDefault();
        this.showShortcutHelp();
      },
      category: 'Help'
    });
  }

  /**
   * Bind keyboard events
   */
  bindEvents() {
    document.addEventListener('keydown', (e) => {
      // Don't handle shortcuts when typing in inputs
      if (this.isTyping(e.target)) {
        return;
      }

      const key = this.getKeyString(e);
      const shortcut = this.shortcuts.get(key);

      if (shortcut) {
        shortcut.action(e);
      }
    });

    // Handle task card focus
    document.addEventListener('click', (e) => {
      const taskCard = e.target.closest('.task-card');
      const modalOpen = e.target.closest('.modal-overlay--visible');
      
      if (taskCard) {
        this.selectTask(taskCard.dataset.taskId);
      } else if (!modalOpen) {
        // Only clear selection if not clicking inside an open modal
        this.clearSelection();
      }
    });
  }

  /**
   * Check if user is typing in an input field
   */
  isTyping(element) {
    const typingElements = ['INPUT', 'TEXTAREA', 'SELECT'];
    return typingElements.includes(element.tagName) || 
           element.contentEditable === 'true';
  }

  /**
   * Get key string from keyboard event
   */
  getKeyString(e) {
    const parts = [];
    
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey && e.key.length > 1) parts.push('shift');
    
    parts.push(e.key);
    
    return parts.join('+');
  }

  /**
   * Focus on new task input
   */
  focusNewTaskInput() {
    const input = document.getElementById('todo-input');
    if (input) {
      input.focus();
      input.select();
    }
  }

  /**
   * Handle Escape key press
   */
  handleEscape() {
    // First check if there's an open modal and close it
    const modal = document.getElementById('custom-modal');
    if (modal && modal.classList.contains('modal-overlay--visible')) {
      modal.classList.remove('modal-overlay--visible');
      return;
    }

    // If no modal is open, clear task selection
    this.clearSelection();
  }

  /**
   * Clear current selection
   */
  clearSelection() {
    if (this.selectedTaskId) {
      const selectedCard = document.querySelector(`[data-task-id="${this.selectedTaskId}"]`);
      if (selectedCard) {
        selectedCard.classList.remove('task-card--selected');
      }
      this.selectedTaskId = null;
    }

    // Only close modals when explicitly requested (e.g., via Escape key)
    // Don't close modals automatically when clearing selection from clicks
  }

  /**
   * Select a task by ID
   */
  selectTask(taskId) {
    this.clearSelection();
    
    if (taskId) {
      this.selectedTaskId = taskId;
      const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
      if (taskCard) {
        taskCard.classList.add('task-card--selected');
        taskCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  /**
   * Select previous task
   */
  selectPreviousTask() {
    const tasks = this.getAllVisibleTasks();
    if (tasks.length === 0) return;

    if (!this.selectedTaskId) {
      this.selectTask(tasks[tasks.length - 1].dataset.taskId);
      return;
    }

    const currentIndex = tasks.findIndex(task => 
      task.dataset.taskId === this.selectedTaskId
    );

    if (currentIndex > 0) {
      this.selectTask(tasks[currentIndex - 1].dataset.taskId);
    } else {
      this.selectTask(tasks[tasks.length - 1].dataset.taskId);
    }
  }

  /**
   * Select next task
   */
  selectNextTask() {
    const tasks = this.getAllVisibleTasks();
    if (tasks.length === 0) return;

    if (!this.selectedTaskId) {
      this.selectTask(tasks[0].dataset.taskId);
      return;
    }

    const currentIndex = tasks.findIndex(task => 
      task.dataset.taskId === this.selectedTaskId
    );

    if (currentIndex < tasks.length - 1) {
      this.selectTask(tasks[currentIndex + 1].dataset.taskId);
    } else {
      this.selectTask(tasks[0].dataset.taskId);
    }
  }

  /**
   * Get all visible task cards
   */
  getAllVisibleTasks() {
    return Array.from(document.querySelectorAll('.task-card'))
      .filter(card => card.offsetParent !== null);
  }

  /**
   * Edit selected task
   */
  editSelectedTask() {
    if (!this.selectedTaskId) return;

    const taskCard = document.querySelector(`[data-task-id="${this.selectedTaskId}"]`);
    const editButton = taskCard?.querySelector('[data-action="edit"]');
    
    if (editButton) {
      editButton.click();
    }
  }

  /**
   * Delete selected task
   */
  deleteSelectedTask() {
    if (!this.selectedTaskId) return;

    const taskCard = document.querySelector(`[data-task-id="${this.selectedTaskId}"]`);
    const deleteButton = taskCard?.querySelector('[data-action="delete"]');
    
    if (deleteButton) {
      deleteButton.click();
    }
  }

  /**
   * Move selected task to status
   */
  moveSelectedTask(status) {
    if (!this.selectedTaskId) return;

    const taskCard = document.querySelector(`[data-task-id="${this.selectedTaskId}"]`);
    const moveButton = taskCard?.querySelector(`[data-action="move-${status}"]`);
    
    if (moveButton) {
      moveButton.click();
    }
  }

  /**
   * Create shortcut help modal content
   */
  createShortcutHelp() {
    const categories = {};
    
    // Group shortcuts by category
    this.shortcuts.forEach((shortcut, key) => {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = [];
      }
      categories[shortcut.category].push({
        key: this.formatKeyForDisplay(key),
        description: shortcut.description
      });
    });

    this.shortcutHelpContent = this.generateShortcutHelpHTML(categories);
  }

  /**
   * Format key for display
   */
  formatKeyForDisplay(key) {
    return key
      .replace('ctrl+', 'Ctrl + ')
      .replace('alt+', 'Alt + ')
      .replace('shift+', 'Shift + ')
      .replace('ArrowUp', '↑')
      .replace('ArrowDown', '↓')
      .replace('ArrowLeft', '←')
      .replace('ArrowRight', '→')
      .replace('Enter', '⏎')
      .replace('Escape', 'Esc')
      .replace('Delete', 'Del')
      .replace('Backspace', '⌫');
  }

  /**
   * Generate shortcut help HTML
   */
  generateShortcutHelpHTML(categories) {
    let html = '<div class="shortcut-help">';
    
    Object.entries(categories).forEach(([category, shortcuts]) => {
      html += `
        <div class="shortcut-category">
          <h4 class="shortcut-category__title">${category}</h4>
          <div class="shortcut-list">
      `;
      
      shortcuts.forEach(({ key, description }) => {
        html += `
          <div class="shortcut-item">
            <kbd class="shortcut-key">${key}</kbd>
            <span class="shortcut-description">${description}</span>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  /**
   * Show shortcut help modal
   */
  showShortcutHelp() {
    if (this.app.dom) {
      this.app.dom.showModal(
        'Keyboard Shortcuts',
        this.shortcutHelpContent,
        { 
          showCancel: false,
          confirmText: 'Got it!',
          customClass: 'shortcut-help-modal',
          allowHTML: true
        }
      );
    }
  }

  /**
   * Get selected task ID
   */
  getSelectedTaskId() {
    return this.selectedTaskId;
  }

  /**
   * Check if a task is selected
   */
  hasSelection() {
    return this.selectedTaskId !== null;
  }
}
