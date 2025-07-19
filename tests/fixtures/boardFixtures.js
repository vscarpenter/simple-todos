/**
 * Board Test Fixtures  
 * Sample board data for consistent testing
 */

import { TASK_COLLECTIONS, SAMPLE_TASKS } from './taskFixtures.js';

export const SAMPLE_BOARDS = {
  // Default empty board
  defaultBoard: {
    id: 'board-default',
    name: 'Main Board',
    description: 'Your default task board',
    color: '#6750a4',
    isDefault: true,
    createdDate: '2025-01-01',
    lastModified: '2025-01-01T10:00:00.000Z',
    tasks: []
  },

  // Work board with tasks
  workBoard: {
    id: 'board-work',
    name: 'Work Projects',
    description: 'Professional tasks and projects',
    color: '#1976d2',
    isDefault: false,
    createdDate: '2025-01-01',
    lastModified: '2025-01-01T11:00:00.000Z',
    tasks: [
      { ...SAMPLE_TASKS.todoTask, id: 'work-task-1', text: 'Complete quarterly report' },
      { ...SAMPLE_TASKS.doingTask, id: 'work-task-2', text: 'Review team PRs' },
      { ...SAMPLE_TASKS.doneTask, id: 'work-task-3', text: 'Setup CI/CD pipeline' }
    ]
  },

  // Personal board
  personalBoard: {
    id: 'board-personal',
    name: 'Personal Tasks',
    description: 'Personal todos and life management',
    color: '#dc2626',
    isDefault: false,
    createdDate: '2025-01-02',
    lastModified: '2025-01-02T10:00:00.000Z',
    tasks: [
      { ...SAMPLE_TASKS.todoTask, id: 'personal-task-1', text: 'Schedule dentist appointment' },
      { ...SAMPLE_TASKS.doneTask, id: 'personal-task-2', text: 'Buy groceries' }
    ]
  },

  // Project board with many tasks
  projectBoard: {
    id: 'board-project', 
    name: 'Project Alpha',
    description: 'Large project with multiple tasks',
    color: '#059669',
    isDefault: false,
    createdDate: '2025-01-03',
    lastModified: '2025-01-03T10:00:00.000Z',
    tasks: TASK_COLLECTIONS.multipleByStatus
  },

  // Board with archived tasks
  archivedBoard: {
    id: 'board-archived',
    name: 'Historical Board',
    description: 'Board with archived tasks',
    color: '#7c3aed',
    isDefault: false,
    createdDate: '2024-12-01',
    lastModified: '2024-12-01T10:00:00.000Z',
    tasks: [
      { ...SAMPLE_TASKS.doneTask, id: 'archived-task-1', text: 'Old completed task', archived: true, archivedDate: '2024-12-15' },
      { ...SAMPLE_TASKS.todoTask, id: 'active-task-1', text: 'Active task' }
    ]
  }
};

export const BOARD_COLLECTIONS = {
  // Empty board collection
  empty: [],

  // Single default board
  singleDefault: [SAMPLE_BOARDS.defaultBoard],

  // Multiple boards scenario
  multiple: [
    SAMPLE_BOARDS.defaultBoard,
    SAMPLE_BOARDS.workBoard,
    SAMPLE_BOARDS.personalBoard
  ],

  // Comprehensive set with all board types
  comprehensive: [
    SAMPLE_BOARDS.defaultBoard,
    SAMPLE_BOARDS.workBoard, 
    SAMPLE_BOARDS.personalBoard,
    SAMPLE_BOARDS.projectBoard,
    SAMPLE_BOARDS.archivedBoard
  ]
};

// Board creation helpers
export function createTestBoard(overrides = {}) {
  return {
    id: `test-board-${Date.now()}`,
    name: 'Test Board',
    description: 'Test board description',
    color: '#6750a4',
    isDefault: false,
    createdDate: new Date().toISOString().split('T')[0],
    lastModified: new Date().toISOString(),
    tasks: [],
    ...overrides
  };
}

export function createBoardWithTasks(taskCount = 3, boardOverrides = {}) {
  const tasks = Array.from({ length: taskCount }, (_, index) => ({
    id: `task-${index + 1}`,
    text: `Task ${index + 1}`,
    status: ['todo', 'doing', 'done'][index % 3],
    createdDate: new Date().toISOString().split('T')[0],
    lastModified: new Date().toISOString()
  }));

  return createTestBoard({
    tasks,
    ...boardOverrides
  });
}

// Application state fixtures
export const APP_STATE_FIXTURES = {
  // Fresh installation state
  fresh: {
    boards: [SAMPLE_BOARDS.defaultBoard],
    currentBoardId: 'board-default',
    tasks: [],
    filter: 'all'
  },

  // Single board with tasks
  singleBoardWithTasks: {
    boards: [{ ...SAMPLE_BOARDS.workBoard }],
    currentBoardId: 'board-work',
    tasks: SAMPLE_BOARDS.workBoard.tasks,
    filter: 'all'
  },

  // Multiple boards scenario
  multipleBoards: {
    boards: BOARD_COLLECTIONS.multiple,
    currentBoardId: 'board-work',
    tasks: SAMPLE_BOARDS.workBoard.tasks,
    filter: 'all'
  },


  // Board with mixed task statuses
  mixedStatuses: {
    boards: [SAMPLE_BOARDS.projectBoard],
    currentBoardId: 'board-project',
    tasks: SAMPLE_BOARDS.projectBoard.tasks,
    filter: 'all'
  }
};

// Invalid board data for validation testing
export const INVALID_BOARDS = {
  missingId: {
    name: 'Board without ID',
    description: 'Missing ID field',
    color: '#6750a4',
    tasks: []
  },

  missingName: {
    id: 'board-no-name',
    description: 'Missing name field',
    color: '#6750a4',
    tasks: []
  },

  emptyName: {
    id: 'board-empty-name',
    name: '',
    description: 'Empty name',
    color: '#6750a4', 
    tasks: []
  },

  nameTooLong: {
    id: 'board-long-name',
    name: 'x'.repeat(51), // Exceeds 50 character limit
    description: 'Name too long',
    color: '#6750a4',
    tasks: []
  },

  invalidTasks: {
    id: 'board-invalid-tasks',
    name: 'Board with invalid tasks',
    description: 'Contains invalid task data',
    color: '#6750a4',
    tasks: 'not-an-array'
  },

  invalidColor: {
    id: 'board-invalid-color',
    name: 'Board with invalid color',
    description: 'Invalid hex color',
    color: 'not-a-color',
    tasks: []
  }
};

// Import/Export test data
export const IMPORT_EXPORT_DATA = {
  // Valid export format
  validExport: {
    version: '1.0',
    exportedAt: '2025-01-01T10:00:00.000Z',
    data: {
      boards: BOARD_COLLECTIONS.multiple,
      currentBoardId: 'board-work',
      filter: 'all',
      lastSaved: '2025-01-01T10:00:00.000Z'
    }
  },

  // Legacy export format
  legacyExport: {
    version: '0.9',
    data: {
      tasks: [
        { text: 'Legacy task 1', completed: false, createdDate: '2024-12-01' },
        { text: 'Legacy task 2', completed: true, createdDate: '2024-12-02' }
      ]
    }
  },

  // Invalid export data
  invalidExport: {
    invalidData: 'not-an-object'
  },

  // Empty export
  emptyExport: {
    version: '1.0',
    data: {
      boards: [],
      currentBoardId: null,
      filter: 'all'
    }
  }
};

// Export shorthand references
export const {
  defaultBoard,
  workBoard,
  personalBoard,
  projectBoard
} = SAMPLE_BOARDS;