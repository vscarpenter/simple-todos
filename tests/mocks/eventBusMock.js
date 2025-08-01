/**
 * EventBus Mock for testing
 * Provides event system mocking with tracking capabilities
 */

import { jest } from '@jest/globals';

export class MockEventBus {
  constructor() {
    this.events = {};
    this.emittedEvents = [];
    this.subscriptions = [];
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    this.subscriptions.push({ event, callback });

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    
    const index = this.events[event].indexOf(callback);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
    
    // Remove from subscriptions tracking
    const subIndex = this.subscriptions.findIndex(
      sub => sub.event === event && sub.callback === callback
    );
    if (subIndex > -1) {
      this.subscriptions.splice(subIndex, 1);
    }
  }

  emit(event, data) {
    // Track emitted events for testing
    this.emittedEvents.push({ event, data, timestamp: Date.now() });
    
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    });
  }

  once(event, callback) {
    const unsubscribe = this.on(event, (data) => {
      callback(data);
      unsubscribe();
    });
    return unsubscribe;
  }

  // Test utilities
  clear() {
    this.events = {};
    this.emittedEvents = [];
    this.subscriptions = [];
  }

  getEmittedEvents(eventName = null) {
    if (eventName) {
      return this.emittedEvents.filter(e => e.event === eventName);
    }
    return [...this.emittedEvents];
  }

  getLastEmittedEvent(eventName = null) {
    const events = this.getEmittedEvents(eventName);
    return events[events.length - 1] || null;
  }

  hasEventBeenEmitted(eventName, data = null) {
    const events = this.getEmittedEvents(eventName);
    if (data === null) {
      return events.length > 0;
    }
    return events.some(e => JSON.stringify(e.data) === JSON.stringify(data));
  }

  getEventCount(eventName = null) {
    return this.getEmittedEvents(eventName).length;
  }

  getSubscriptionCount(eventName = null) {
    if (eventName) {
      return this.subscriptions.filter(sub => sub.event === eventName).length;
    }
    return this.subscriptions.length;
  }

  getAllSubscriptions() {
    return [...this.subscriptions];
  }

  clearEmittedEvents() {
    this.emittedEvents = [];
  }
}

export function createEventBusMock() {
  const mockEventBus = new MockEventBus();
  
  // Convert methods to Jest spies to work with Jest assertions
  mockEventBus.on = jest.fn(mockEventBus.on.bind(mockEventBus));
  mockEventBus.off = jest.fn(mockEventBus.off.bind(mockEventBus));
  mockEventBus.emit = jest.fn(mockEventBus.emit.bind(mockEventBus));
  mockEventBus.once = jest.fn(mockEventBus.once.bind(mockEventBus));
  
  return mockEventBus;
}

// Common event assertions for tests
export const eventAssertions = {
  expectEventEmitted: (mockEventBus, eventName, data = null) => {
    expect(mockEventBus.hasEventBeenEmitted(eventName, data)).toBe(true);
  },
  
  expectEventNotEmitted: (mockEventBus, eventName) => {
    expect(mockEventBus.getEventCount(eventName)).toBe(0);
  },
  
  expectEventCount: (mockEventBus, eventName, count) => {
    expect(mockEventBus.getEventCount(eventName)).toBe(count);
  },
  
  expectLastEventData: (mockEventBus, eventName, expectedData) => {
    const lastEvent = mockEventBus.getLastEmittedEvent(eventName);
    expect(lastEvent).toBeTruthy();
    expect(lastEvent.data).toEqual(expectedData);
  }
};

// Pre-defined event sequences for common workflows
export const TEST_EVENT_SEQUENCES = {
  taskCreation: [
    { event: 'task:create', data: { text: 'New task' } },
    { event: 'tasks:changed', data: { count: 1 } },
    { event: 'storage:saved', data: {} }
  ],
  
  taskCompletion: [
    { event: 'task:complete', data: { taskId: 'task-1' } },
    { event: 'task:drop', data: { taskId: 'task-1', targetStatus: 'done' } },
    { event: 'tasks:changed', data: {} },
    { event: 'storage:saved', data: {} }
  ],
  
  boardSwitch: [
    { event: 'board:switch', data: { boardId: 'board-2' } },
    { event: 'board:switched', data: { boardId: 'board-2' } },
    { event: 'tasks:changed', data: {} }
  ]
};

// Utility to simulate event sequences
export function simulateEventSequence(mockEventBus, sequenceName) {
  const sequence = TEST_EVENT_SEQUENCES[sequenceName];
  if (!sequence) {
    throw new Error(`Unknown event sequence: ${sequenceName}`);
  }
  
  sequence.forEach(({ event, data }) => {
    mockEventBus.emit(event, data);
  });
}