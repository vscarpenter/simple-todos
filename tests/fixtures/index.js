/**
 * Test Fixtures Index
 * Central export for all test fixtures and utilities
 */

// Task fixtures
export {
  SAMPLE_TASKS,
  TASK_COLLECTIONS,
  createTestTask,
  createTaskCollection,
  INVALID_TASKS,
  LEGACY_TASKS,
  todoTask,
  doingTask,
  doneTask,
  archivedTask
} from './taskFixtures.js';

// Board fixtures
export {
  SAMPLE_BOARDS,
  BOARD_COLLECTIONS,
  createTestBoard,
  createBoardWithTasks,
  APP_STATE_FIXTURES,
  INVALID_BOARDS,
  IMPORT_EXPORT_DATA,
  defaultBoard,
  workBoard,
  personalBoard,
  projectBoard
} from './boardFixtures.js';

// Settings fixtures
export const SETTINGS_FIXTURES = {
  default: {
    theme: 'light',
    autoArchive: false,
    autoArchiveDays: 30,
    debugMode: false
  },

  darkMode: {
    theme: 'dark',
    autoArchive: true,
    autoArchiveDays: 7,
    debugMode: true
  },

  customSettings: {
    theme: 'system',
    autoArchive: true,
    autoArchiveDays: 60,
    debugMode: false
  }
};


// User interaction scenarios for testing
export function getUserScenarios(APP_STATE_FIXTURES) {
  return {
    // New user journey
    newUser: {
      description: 'First-time user setting up the app',
      initialState: APP_STATE_FIXTURES.fresh,
      expectedActions: [
        'app:ready',
        'data:loaded',
        'dom:initialized'
      ]
    },

    // Power user with multiple boards
    powerUser: {
      description: 'Experienced user with complex board setup',
      initialState: APP_STATE_FIXTURES.multipleBoards,
      expectedActions: [
        'app:ready',
        'data:loaded',
        'boards:changed',
        'tasks:changed'
      ]
    },

    // User performing task management
    taskManager: {
      description: 'User actively managing tasks',
      initialState: APP_STATE_FIXTURES.singleBoardWithTasks,
      workflow: [
        { action: 'create_task', params: { text: 'New task' } },
        { action: 'move_task', params: { taskId: 'task-1', status: 'doing' } },
        { action: 'complete_task', params: { taskId: 'task-1' } }
      ]
    },

    // Data migration scenario
    // Legacy migration removed - app uses IndexedDB only
    indexedDBUser: {
      description: 'User with existing IndexedDB data',
      existingData: {
        boards: [
          {
            name: 'Main Board',
            tasks: [
              { text: 'Existing task 1', status: 'todo' },
              { text: 'Existing task 2', status: 'done' }
            ]
          }
        ]
      }
    }
  };
}

export const USER_SCENARIOS = getUserScenarios({
  fresh: { boards: [], tasks: [] },
  multipleBoards: { boards: [], tasks: [] },
  singleBoardWithTasks: { boards: [], tasks: [] }
});

// Error scenarios for testing error handling
export const ERROR_SCENARIOS = {
  storageFailure: {
    description: 'IndexedDB fails to save/load',
    mockBehavior: () => {
      throw new Error('IndexedDB operation failed');
    }
  },

  corruptedData: {
    description: 'Corrupted data in IndexedDB',
    corruptedPayload: { invalid: 'data structure' }
  },

  networkError: {
    description: 'Network failure during import',
    mockResponse: {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    }
  },

  validationError: {
    description: 'Invalid data validation',
    invalidTask: {
      id: 'invalid-task',
      text: '', // Empty text should fail validation
      status: 'invalid-status'
    }
  }
};

// Performance test scenarios
export const PERFORMANCE_SCENARIOS = {
  largeBoardSet: {
    description: 'Many boards with many tasks each',
    boardCount: 50,
    tasksPerBoard: 100,
    generator: (boardCount, tasksPerBoard) => {
      return Array.from({ length: boardCount }, (_, boardIndex) => 
        createBoardWithTasks(tasksPerBoard, {
          id: `perf-board-${boardIndex}`,
          name: `Performance Board ${boardIndex + 1}`
        })
      );
    }
  },

  rapidTaskCreation: {
    description: 'Creating many tasks in quick succession',
    taskCount: 1000,
    generator: (count) => {
      return Array.from({ length: count }, (_, index) => 
        createTestTask({
          id: `rapid-task-${index}`,
          text: `Rapid task ${index + 1}`
        })
      );
    }
  }
};

// Test data combinations for comprehensive testing
export function getTestCombinations() {
  return {
    // All valid combinations
    valid: {
      boards: BOARD_COLLECTIONS.comprehensive,
      tasks: TASK_COLLECTIONS.mixed,
      settings: SETTINGS_FIXTURES.default,
    },

    // Edge case combinations
    edgeCases: {
      boards: [SAMPLE_BOARDS.defaultBoard], // Minimal
      tasks: TASK_COLLECTIONS.edgeCases,
      settings: SETTINGS_FIXTURES.customSettings,
    },

    // Invalid combinations for error testing
    invalid: {
      boards: [INVALID_BOARDS.missingId],
      tasks: [INVALID_TASKS.invalidStatus],
      settings: { theme: 'invalid-theme' },
    }
  };
}

// Export the function directly instead of pre-computed object to avoid circular dependencies
export { getTestCombinations as TEST_COMBINATIONS };