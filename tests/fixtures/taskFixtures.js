/**
 * Task Test Fixtures
 * Sample task data for consistent testing
 */

export const SAMPLE_TASKS = {
  // Basic task in todo status
  todoTask: {
    id: 'task-todo-1',
    text: 'Complete project documentation',
    status: 'todo',
    createdDate: '2025-01-01',
    lastModified: '2025-01-01T10:00:00.000Z'
  },

  // Task in doing status
  doingTask: {
    id: 'task-doing-1', 
    text: 'Review code changes',
    status: 'doing',
    createdDate: '2025-01-01',
    lastModified: '2025-01-01T11:00:00.000Z'
  },

  // Completed task
  doneTask: {
    id: 'task-done-1',
    text: 'Set up development environment',
    status: 'done',
    createdDate: '2025-01-01',
    lastModified: '2025-01-01T12:00:00.000Z',
    completedDate: '2025-01-01'
  },

  // Task with long text (edge case)
  longTextTask: {
    id: 'task-long-1',
    text: 'This is a very long task description that tests the character limit validation and ensures that the application properly handles tasks with extensive text content that might approach the 200 character limit for task descriptions',
    status: 'todo',
    createdDate: '2025-01-01',
    lastModified: '2025-01-01T13:00:00.000Z'
  },

  // Task with minimal text
  shortTextTask: {
    id: 'task-short-1',
    text: 'Fix bug',
    status: 'todo',
    createdDate: '2025-01-01', 
    lastModified: '2025-01-01T14:00:00.000Z'
  },

  // Archived task
  archivedTask: {
    id: 'task-archived-1',
    text: 'Old completed task',
    status: 'done',
    createdDate: '2024-12-01',
    lastModified: '2024-12-01T10:00:00.000Z',
    completedDate: '2024-12-01',
    archived: true,
    archivedDate: '2024-12-15'
  },

  // Task with special characters
  specialCharsTask: {
    id: 'task-special-1',
    text: 'Handle special chars: <>&"\'',
    status: 'todo',
    createdDate: '2025-01-01',
    lastModified: '2025-01-01T15:00:00.000Z'
  },

};

export const TASK_COLLECTIONS = {
  // Empty task list
  empty: [],

  // Single task
  single: [SAMPLE_TASKS.todoTask],

  // Basic workflow progression
  workflow: [
    SAMPLE_TASKS.todoTask,
    SAMPLE_TASKS.doingTask,
    SAMPLE_TASKS.doneTask
  ],

  // Multiple tasks in each status
  multipleByStatus: [
    { ...SAMPLE_TASKS.todoTask, id: 'task-todo-1', text: 'Todo task 1' },
    { ...SAMPLE_TASKS.todoTask, id: 'task-todo-2', text: 'Todo task 2' },
    { ...SAMPLE_TASKS.doingTask, id: 'task-doing-1', text: 'Doing task 1' },
    { ...SAMPLE_TASKS.doingTask, id: 'task-doing-2', text: 'Doing task 2' },
    { ...SAMPLE_TASKS.doneTask, id: 'task-done-1', text: 'Done task 1' },
    { ...SAMPLE_TASKS.doneTask, id: 'task-done-2', text: 'Done task 2' }
  ],

  // Edge cases collection
  edgeCases: [
    SAMPLE_TASKS.longTextTask,
    SAMPLE_TASKS.shortTextTask,
    SAMPLE_TASKS.specialCharsTask
  ],

  // Mixed collection for comprehensive testing
  mixed: [
    SAMPLE_TASKS.todoTask,
    SAMPLE_TASKS.doingTask,
    SAMPLE_TASKS.doneTask,
    SAMPLE_TASKS.longTextTask,
    SAMPLE_TASKS.shortTextTask,
    SAMPLE_TASKS.archivedTask,
    SAMPLE_TASKS.specialCharsTask,
  ]
};

// Task creation helpers
export function createTestTask(overrides = {}) {
  return {
    id: `test-task-${Date.now()}`,
    text: 'Test task',
    status: 'todo',
    createdDate: new Date().toISOString().split('T')[0],
    lastModified: new Date().toISOString(),
    ...overrides
  };
}

export function createTaskCollection(count = 5, status = 'todo') {
  return Array.from({ length: count }, (_, index) => 
    createTestTask({
      id: `test-task-${status}-${index + 1}`,
      text: `${status.charAt(0).toUpperCase() + status.slice(1)} task ${index + 1}`,
      status
    })
  );
}

// Invalid task data for validation testing
export const INVALID_TASKS = {
  missingId: {
    text: 'Task without ID',
    status: 'todo',
    createdDate: '2025-01-01'
  },

  missingText: {
    id: 'task-no-text',
    status: 'todo',
    createdDate: '2025-01-01'
  },

  emptyText: {
    id: 'task-empty-text',
    text: '',
    status: 'todo',
    createdDate: '2025-01-01'
  },

  invalidStatus: {
    id: 'task-invalid-status',
    text: 'Task with invalid status',
    status: 'invalid',
    createdDate: '2025-01-01'
  },

  missingStatus: {
    id: 'task-no-status',
    text: 'Task without status',
    createdDate: '2025-01-01'
  },

  textTooLong: {
    id: 'task-too-long',
    text: 'x'.repeat(201), // Exceeds 200 character limit
    status: 'todo',
    createdDate: '2025-01-01'
  },

  invalidDate: {
    id: 'task-invalid-date',
    text: 'Task with invalid date',
    status: 'todo',
    createdDate: 'invalid-date'
  }
};

// Legacy task formats for migration testing
export const LEGACY_TASKS = {
  oldFormat: [
    {
      text: 'Old format task 1',
      completed: false,
      createdDate: '2024-12-01'
    },
    {
      text: 'Old format task 2',
      completed: true,
      createdDate: '2024-12-02'
    }
  ],

  mixedFormat: [
    // New format
    {
      id: 'task-new-1',
      text: 'New format task',
      status: 'todo',
      createdDate: '2025-01-01',
      lastModified: '2025-01-01T10:00:00.000Z'
    },
    // Old format
    {
      text: 'Old format task',
      completed: false,
      createdDate: '2024-12-01'
    }
  ]
};

// Export shorthand for common collections
export const {
  todoTask,
  doingTask, 
  doneTask,
  archivedTask
} = SAMPLE_TASKS;