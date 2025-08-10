/**
 * Mock EventBus for Jest tests
 * This mock will be used automatically by Jest when eventBus is imported
 */

import { jest } from '@jest/globals';

const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn((event, callback) => {
    // Return a mock unsubscribe function
    return () => mockEventBus.off(event, callback);
  }),
  off: jest.fn(),
  events: {},
  
  // Helper methods for testing
  clearMocks: () => {
    mockEventBus.emit.mockClear();
    mockEventBus.on.mockClear();
    mockEventBus.off.mockClear();
  },
  
  // Reset all state
  reset: () => {
    mockEventBus.events = {};
    mockEventBus.clearMocks();
  }
};

export default mockEventBus;
